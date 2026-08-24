import { sendBulkSmsBd } from "./smsService.js"

/**
 * Shared, in-memory OTP issuing + verification.
 *
 * Used by both login (`/api/auth/otp/*`) and sensitive merchant actions such as
 * changing the Staff Mode PIN. Each `purpose` keeps its own counter so a PIN
 * change never eats into a user's login quota.
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

const store: Record<string, OtpRecord> = {}

function keyFor(phone: string, purpose: Purpose) {
  return `${purpose}:${phone.replace(/\D/g, "").slice(-10)}`
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

export interface IssueResult {
  success: boolean
  error?: string
  rateLimited?: boolean
  expiresIn?: number
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
  record.code = code
  record.expiresAt = now + OTP_TTL_MS
  record.hourlyCount++
  record.dailyCount++
  store[key] = record

  const credentialsConfigured = !!(process.env.BULKSMS_BD_API_KEY && process.env.BULKSMS_BD_SENDER_ID)

  if (!credentialsConfigured) {
    // No SMS gateway configured (local development). Print the code to the
    // server log so the flow stays testable instead of silently dead-ending.
    console.warn(`[Silsila OTP] SMS gateway not configured. ${purpose} OTP for ${clean}: ${code}`)
    return { success: true, expiresIn: OTP_TTL_MS / 1000, smsSkipped: true }
  }

  const smsResult = await sendBulkSmsBd({ phone: clean, message: messageTemplate(code) })
  if (!smsResult.success) {
    return { success: false, error: smsResult.error || "OTP পাঠানো সম্ভব হয়নি।" }
  }

  return { success: true, expiresIn: OTP_TTL_MS / 1000 }
}

export interface VerifyResult {
  valid: boolean
  error?: string
}

/** Verify and consume a previously issued OTP. Codes are single-use. */
export function verifyOtp(phone: string, purpose: Purpose, code: string): VerifyResult {
  const key = keyFor(phone, purpose)
  const record = store[key]

  if (!record || !record.code) {
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
