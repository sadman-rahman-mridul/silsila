import assert from "node:assert"
import {
  signToken,
  verifyToken,
  hashSecret,
  verifySecretHash,
  generateSecureVoucherCode,
  generateSecureId,
  sanitizeCsvValue,
} from "../server/services/cryptoService.js"

async function runSecurityTests() {
  console.log("🔒 Starting Sealsela Security Hardening Test Suite...\n")
  let passed = 0
  let total = 0

  function test(name: string, fn: () => void | Promise<void>) {
    total++
    return (async () => {
      try {
        await fn()
        console.log(`  ✅ [PASS] ${name}`)
        passed++
      } catch (err: any) {
        console.error(`  ❌ [FAIL] ${name}`)
        console.error(`     Error: ${err.message}\n`)
      }
    })()
  }

  // 1. Cryptographic HMAC Token Verification
  await test("HMAC Token Sign & Verify with valid payload", () => {
    const payload = { id: "user_123", phone: "01700000000", role: "merchant" as const, merchantId: "m_123" }
    const token = signToken(payload, 3600)
    assert(typeof token === "string", "Token must be a string")
    assert(token.includes("."), "Token must contain payload and signature segments")

    const verified = verifyToken(token)
    assert(verified !== null, "Verified token should not be null")
    assert.strictEqual(verified?.sub, "user_123")
    assert.strictEqual(verified?.role, "merchant")
    assert.strictEqual(verified?.merchantId, "m_123")
  })

  await test("HMAC Token Rejection on tampering and forgery", () => {
    const payload = { id: "user_123", phone: "01700000000", role: "customer" as const }
    const token = signToken(payload, 3600)
    const [bodyB64, sigB64] = token.split(".")

    // Tamper with payload to escalate privilege
    const tamperedBody = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(bodyB64, "base64url").toString()), role: "admin" })
    ).toString("base64url")
    const forgedToken = `${tamperedBody}.${sigB64}`

    const result = verifyToken(forgedToken)
    assert.strictEqual(result, null, "Forged token MUST fail verification")
  })

  await test("HMAC Token Expiration enforcement", async () => {
    const payload = { id: "exp_user", phone: "01711111111", role: "customer" as const }
    // Token with 0 second TTL
    const token = signToken(payload, -1)
    const result = verifyToken(token)
    assert.strictEqual(result, null, "Expired token MUST return null")
  })

  // 2. Salted PBKDF2 Password and PIN Hashing
  await test("Salted PBKDF2 Hashing and Verification", async () => {
    const secret = "SecurePin@1234"
    const hash = hashSecret(secret)
    assert(hash.startsWith("pbkdf2$"), "Hash must follow pbkdf2 algorithm format")

    const isValid = verifySecretHash(secret, hash)
    assert.strictEqual(isValid, true, "Valid secret should verify true")

    const isInvalid = verifySecretHash("WrongSecret", hash)
    assert.strictEqual(isInvalid, false, "Invalid secret must verify false")
  })

  // 3. CSPRNG Entropy and Voucher Generation
  await test("CSPRNG Secure Voucher Code generation (non-predictable charset)", () => {
    const code1 = generateSecureVoucherCode("M1")
    const code2 = generateSecureVoucherCode("M1")
    assert(code1.startsWith("SL-M1-"), "Voucher must have standard prefix")
    assert.notStrictEqual(code1, code2, "Subsequent vouchers must not collide")
    assert(/^[2-9A-HJ-KM-NP-Z]{4}$/.test(code1.split("-")[2]), "Voucher suffix must use unambiguous charset")
  })

  await test("CSPRNG Random ID generation", () => {
    const id1 = generateSecureId("req", 8)
    const id2 = generateSecureId("req", 8)
    assert(id1.startsWith("req_"), "ID must have prefix")
    assert.notStrictEqual(id1, id2, "Generated IDs must be globally unique")
  })

  // 4. CSV Formula Injection Defense
  await test("CSV Formula Injection Neutralization", () => {
    assert.strictEqual(sanitizeCsvValue("=cmd|' /C calc'!A0"), "\"'=cmd|' /C calc'!A0\"")
    assert.strictEqual(sanitizeCsvValue("+123456789"), "\"'+123456789\"")
    assert.strictEqual(sanitizeCsvValue("-20+5"), "\"'-20+5\"")
    assert.strictEqual(sanitizeCsvValue("@SUM(A1:A10)"), "\"'@SUM(A1:A10)\"")
    assert.strictEqual(sanitizeCsvValue("Normal Customer Name"), "\"Normal Customer Name\"")
  })

  // 5. Auth Middleware and Role Validation
  await test("Auth Middleware rejection without valid token", async () => {
    const { getAuthenticatedUser } = await import("../server/middleware/auth.js")
    const fakeReq = {
      headers: {},
    } as any
    const user = getAuthenticatedUser(fakeReq)
    assert.strictEqual(user, null, "Unauthenticated request must yield null user")
  })

  console.log(`\n========================================`)
  console.log(`Summary: ${passed}/${total} Security Tests Passed (${Math.round((passed / total) * 100)}%)`)
  console.log(`========================================\n`)

  if (passed !== total) {
    process.exit(1)
  }
}

runSecurityTests().catch((err) => {
  console.error("Fatal test execution error:", err)
  process.exit(1)
})
