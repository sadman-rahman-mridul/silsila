import { Router } from "express"
import { db } from "../db.js"
import { getAuthenticatedUser } from "../middleware/auth.js"

const router = Router()

// Rate limiting for staff PIN redemption attempts (prevents brute-force)
const pinAttempts = new Map<string, { count: number; lockUntil: number }>()

function checkPinRateLimit(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): { allowed: boolean; remainingSec: number } {
  const now = Date.now()
  const entry = pinAttempts.get(key)
  if (!entry) return { allowed: true, remainingSec: 0 }

  if (entry.lockUntil > now) {
    return { allowed: false, remainingSec: Math.ceil((entry.lockUntil - now) / 1000) }
  }

  if (entry.lockUntil <= now && entry.count >= maxAttempts) {
    pinAttempts.delete(key)
    return { allowed: true, remainingSec: 0 }
  }

  return { allowed: true, remainingSec: 0 }
}

function recordFailedPinAttempt(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
  const now = Date.now()
  const entry = pinAttempts.get(key) || { count: 0, lockUntil: 0 }
  entry.count += 1
  if (entry.count >= maxAttempts) {
    entry.lockUntil = now + lockDurationMs
  }
  pinAttempts.set(key, entry)
}

function resetPinAttempts(key: string) {
  pinAttempts.delete(key)
}

// List vouchers (Scoped strictly to authenticated user)
router.get("/", (req, res) => {
  const user = getAuthenticatedUser(req)
  const { customerId: queryCustomerId, merchantId: queryMerchantId } = req.query

  let targetCustomerId = queryCustomerId as string | undefined
  let targetMerchantId = queryMerchantId as string | undefined

  if (user) {
    if (user.role === "customer") {
      targetCustomerId = user.sub
      targetMerchantId = undefined // Customer can only see their own vouchers
    } else if (user.role === "merchant") {
      targetMerchantId = user.merchantId || user.sub
    }
  }

  let vouchers = db.getData().vouchers

  if (targetCustomerId) {
    vouchers = vouchers.filter((v) => v.customerId === targetCustomerId)
  }
  if (targetMerchantId) {
    vouchers = vouchers.filter((v) => v.merchantId === targetMerchantId)
  }

  const enriched = vouchers.map((v) => {
    const merchant = db.getMerchantById(v.merchantId)
    const customer = db.getCustomerById(v.customerId)
    return {
      ...v,
      merchantName: merchant?.name || "",
      customerName: customer?.name || "গ্রাহক",
      customerPhone: customer?.phone ? customer.phone.replace(/(\d{4})\d{3}(\d{4})/, "$1-***-$2") : "",
    }
  })

  res.json(enriched)
})

// Staff PIN Redemption (PRD E3.5, E3.6) with rate limiting
router.post("/redeem", (req, res) => {
  const { code, merchantId, staffPin } = req.body

  if (!code || !merchantId) {
    res.status(400).json({ error: "ভাউচার কোড এবং মার্চেন্ট আইডি প্রদান করুন" })
    return
  }

  if (!staffPin) {
    res.status(400).json({ error: "রিডিম করতে স্টাফ পিন প্রদান করুন" })
    return
  }

  const rateCheck = checkPinRateLimit(`redeem_${merchantId}`, 6, 10 * 60 * 1000)
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `অতিরিক্ত ভুল পিন দেওয়ার কারণে রিডেম্পশন সাময়িক লক। ${rateCheck.remainingSec} সেকেন্ড পর চেষ্টা করুন।`,
    })
    return
  }

  const staff = db.verifyStaffPin(merchantId, String(staffPin))
  if (!staff) {
    recordFailedPinAttempt(`redeem_${merchantId}`, 6, 10 * 60 * 1000)
    res.status(401).json({ error: "ভুল স্টাফ পিন (Staff PIN)। রিডিম ব্যর্থ হয়েছে।" })
    return
  }

  resetPinAttempts(`redeem_${merchantId}`)
  const authorizedStaffId = staff.id

  const result = db.redeemVoucher(code, merchantId, authorizedStaffId)

  if (!result.success) {
    res.status(400).json({ error: result.message })
    return
  }

  res.json(result)
})

export default router
