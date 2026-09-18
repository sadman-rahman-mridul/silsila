import crypto from "node:crypto"

const AUTH_SECRET =
  process.env.AUTH_SECRET_KEY ||
  process.env.SEALSELA_AUTH_SECRET ||
  "sealsela_sec_hmac_2026_default_secret_key_change_in_prod"

export interface TokenPayload {
  sub: string // User ID or Merchant ID
  role: "customer" | "merchant" | "staff" | "admin" | "ops"
  phone?: string
  merchantId?: string
  iat: number
  exp: number
}

/**
 * Signs a payload into a tamper-proof HMAC-SHA256 token.
 * Format: <base64url(payload)>.<base64url(hmac)>
 */
export function signToken(
  data: { id: string; role: "customer" | "merchant" | "staff" | "admin" | "ops"; phone?: string; merchantId?: string },
  expiresInSeconds = 30 * 24 * 3600 // 30 days
): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    sub: data.id,
    role: data.role,
    phone: data.phone,
    merchantId: data.merchantId || data.id,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const hmac = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url")
  return `${payloadB64}.${hmac}`
}

/**
 * Verifies and decodes an HMAC-SHA256 token.
 */
export function verifyToken(token: string): TokenPayload | null {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, hmacSig] = parts
  const expectedHmac = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url")

  // Constant-time comparison to prevent timing attacks
  if (hmacSig.length !== expectedHmac.length) return null
  try {
    const a = Buffer.from(hmacSig)
    const b = Buffer.from(expectedHmac)
    if (!crypto.timingSafeEqual(a, b)) return null

    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}

/**
 * Salted PBKDF2/SHA256 hashing for passwords and PINs
 */
export function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(secret, salt, 10000, 32, "sha256").toString("hex")
  return `pbkdf2$${salt}$${hash}`
}

export function verifySecretHash(secret: string, storedHash: string): boolean {
  if (!storedHash || !secret) return false

  // Backward compatibility check for legacy plaintext records
  if (!storedHash.startsWith("pbkdf2$")) {
    return storedHash.trim() === secret.trim()
  }

  const parts = storedHash.split("$")
  if (parts.length !== 3) return false

  const [, salt, hash] = parts
  const computed = crypto.pbkdf2Sync(secret, salt, 10000, 32, "sha256").toString("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  } catch {
    return false
  }
}

/**
 * Cryptographically secure random ID generator (CSPRNG)
 */
export function generateSecureId(prefix = "id"): string {
  const bytes = crypto.randomBytes(8).toString("hex")
  return `${prefix}_${Date.now()}_${bytes}`
}

/**
 * Cryptographically secure voucher code generator (CSPRNG)
 * Format: SL-<SLUG>-<4 RANDOM ALPHANUMERIC>
 */
export function generateSecureVoucherCode(merchantSlug = "M1"): string {
  const cleanSlug = merchantSlug.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() || "SL"
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // unambiguous charset
  const bytes = crypto.randomBytes(4)
  let codeSuffix = ""
  for (let i = 0; i < 4; i++) {
    codeSuffix += chars[bytes[i] % chars.length]
  }
  return `SL-${cleanSlug}-${codeSuffix}`
}

/**
 * Prevents CSV Formula Injection (Neutralizes =, +, -, @, \t, \r)
 */
export function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""'
  let str = String(val).trim()
  if (str.startsWith("=") || str.startsWith("+") || str.startsWith("-") || str.startsWith("@") || str.startsWith("\t") || str.startsWith("\r")) {
    str = `'${str}` // Quote-prefix formula neutralization
  }
  return `"${str.replace(/"/g, '""')}"`
}

