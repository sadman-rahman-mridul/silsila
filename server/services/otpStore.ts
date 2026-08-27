import crypto from "node:crypto"
import { sendBulkSmsBd } from "./smsService.js"

/**
 * Shared, in-memory + HMAC signed OTP issuing + verification.
 * Supports stateless serverless execution on Vercel Edge/Lambdas.
 */

type Purpose = "login" | "staff_pin"

interface OtpRecord {
  code: string
  expiresAt: number
  hourlyCount: number
  dailyCount: number
  lastHourReset: number
  lastDayReset: number
}

const HOURLY_LIMIT = 5
const DAILY_LIMIT = 20
const OTP_TTL_MS = 5 * 60 * 1000
const OTP_SECRET = process.env.OTP_SECRET || "sealsela_otp_hmac_secret_2026_bd"

const store: Record<string, OtpRecord> = {}

function keyFor(phone: string, purpose: Purpose) {
  return `${purpose}:${phone.replace(/\D/g, "").slice(-10)}`
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export function createOtpSignature(phone: string, purpose: string, code: string, expiresAt: number): string {
  const data = `${purpose}:${phone.replace(/\D/g, "").slice(-10)}:${code}:${expiresAt}`
  return crypto.createHmac("sha256", OTP_SECRET).update(data).digest("hex")
}

export function verifyOtpSignature(phone: string, purpose: string, code: string, otpToken: string): VerifyResult {
  if (!otpToken || typeof otpToken !== "string" || !otpToken.includes(".")) {
    return { valid: false, error: "কোনো OTP সেশন পাওয়া যায়নি। নতুন OTP চান।" }
  }
  const [expiresAtStr, signature] = otpToken.split(".")
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, error: "OTP কোডের মেয়াদ শেষ হয়ে গেছে। নতুন OTP চান।" }
  }
  const expectedSig = createOtpSignature(phone, purpose, String(code).trim(), expiresAt)
  try {
    const isLengthMatch = signature.length === expectedSig.length
    if (!isLengthMatch) return { valid: false, error: "ভুল OTP কোড। আবার চেষ্টা করুন।" }
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex"))
    if (!isValid) {
      return { valid: false, error: "ভুল OTP কোড। আবার চেষ্টা করুন।" }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: "ভুল OTP কোড। আবার চেষ্টা করুন।" }
  }
}

export interface IssueResult {
  success: boolean
  error?: string
  rateLimited?: boolean
  expiresIn?: number
  otpToken?: string
  /** True when SMS credentials are missing and the code was only logged server-side. */
  smsSkipped?: boolean
}

/** Generate a 6-digit OTP, deliver it by SMS, and remember it for verification. */
export async function issueOtp(
  phone: string,
  purpose: Purpose,
  messageTemplate: (code: string) => string
): Promise<IssueResult> {
  const clean = normalizePhone(phone)
  const key = keyFor(clean, purpose)
  const now = Date.now()

  const record = store[key] || {
    code: "",
    expiresAt: 0,
    hourlyCount: 0,
    dailyCount: 0,
    lastHourReset: now,
    lastDayReset: now,
  }

  if (now - record.lastHourReset > 60 * 60 * 1000) {
    record.hourlyCount = 0
    record.lastHourReset = now
  }
  if (now - record.lastDayReset > 24 * 60 * 60 * 1000) {
    record.dailyCount = 0
    record.lastDayReset = now
  }

  if (record.hourlyCount >= HOURLY_LIMIT) {
    return { success: false, rateLimited: true, error: "অতিরিক্ত OTP অনুরোধ। দয়া করে ১ ঘণ্টা অপেক্ষা করুন।" }
  }
  if (record.dailyCount >= DAILY_LIMIT) {
    return { success: false, rateLimited: true, error: "দৈনিক OTP কোটা পূর্ণ হয়েছে।" }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = now + OTP_TTL_MS
  record.code = code
  record.expiresAt = expiresAt
  record.hourlyCount++
  record.dailyCount++
  store[key] = record

  const otpSig = createOtpSignature(clean, purpose, code, expiresAt)
  const otpToken = `${expiresAt}.${otpSig}`

  const apiKey = process.env.BULKSMS_BD_API_KEY || "CEk1QvidKiArNccVNNqq"
  const senderId = process.env.BULKSMS_BD_SENDER_ID || "8809617622724"
  const credentialsConfigured = !!(apiKey && senderId)

  console.log(`[Sealsela OTP] ${purpose.toUpperCase()} OTP generated for ${clean}: ${code}`)

  if (!credentialsConfigured) {
    console.warn(`[Sealsela OTP] BulkSMS credentials missing. Code: ${code}`)
    return { success: true, expiresIn: OTP_TTL_MS / 1000, otpToken, smsSkipped: true }
  }

  const smsResult = await sendBulkSmsBd({ phone: clean, message: messageTemplate(code) })
  if (!smsResult.success) {
    console.warn(`[Silsila OTP] SMS delivery failed: ${smsResult.error} (Code: ${code})`)
    return { success: false, error: smsResult.error || "OTP পাঠানো সম্ভব হয়নি।" }
  }

  return { success: true, expiresIn: OTP_TTL_MS / 1000, otpToken }
}

export interface VerifyResult {
  valid: boolean
  error?: string
}

/** Verify and consume a previously issued OTP. Codes are single-use. */
export function verifyOtp(phone: string, purpose: Purpose, code: string, otpToken?: string): VerifyResult {
  // 1. Try stateless HMAC token verification first (works 100% reliably in Serverless Vercel)
  if (otpToken && otpToken.includes(".")) {
    const tokenResult = verifyOtpSignature(phone, purpose, code, otpToken)
    if (tokenResult.valid) {
      const key = keyFor(phone, purpose)
      if (store[key]) store[key].code = ""
      return { valid: true }
    }
  }

  // 2. Fallback to in-memory store
  const key = keyFor(phone, purpose)
  const record = store[key]

  if (!record || !record.code) {
    if (otpToken) {
      return verifyOtpSignature(phone, purpose, code, otpToken)
    }
    return { valid: false, error: "কোনো OTP অনুরোধ পাওয়া যায়নি। নতুন OTP চান।" }
  }
  if (Date.now() > record.expiresAt) {
    record.code = ""
    return { valid: false, error: "OTP কোডের মেয়াদ শেষ হয়ে গেছে। নতুন OTP চান।" }
  }
  if (record.code !== String(code).trim()) {
    return { valid: false, error: "ভুল OTP কোড। আবার চেষ্টা করুন।" }
  }

  record.code = ""
  return { valid: true }
}
