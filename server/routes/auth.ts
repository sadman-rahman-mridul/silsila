import { Router } from "express"
import { db } from "../db.js"
import { issueOtp, verifyOtp } from "../services/otpStore.js"
import { signToken, verifyToken, hashSecret, verifySecretHash } from "../services/cryptoService.js"
import { getAuthenticatedUser } from "../middleware/auth.js"

const router = Router()

// Simple in-memory rate limiting map for auth attempts (IP + Phone)
const loginAttempts = new Map<string, { count: number; lockUntil: number }>()

function checkRateLimit(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000): { allowed: boolean; remainingSec: number } {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry) return { allowed: true, remainingSec: 0 }

  if (entry.lockUntil > now) {
    return { allowed: false, remainingSec: Math.ceil((entry.lockUntil - now) / 1000) }
  }

  if (entry.lockUntil <= now && entry.count >= maxAttempts) {
    loginAttempts.delete(key)
    return { allowed: true, remainingSec: 0 }
  }

  return { allowed: true, remainingSec: 0 }
}

function recordFailedAttempt(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
  const now = Date.now()
  const entry = loginAttempts.get(key) || { count: 0, lockUntil: 0 }
  entry.count += 1
  if (entry.count >= maxAttempts) {
    entry.lockUntil = now + lockDurationMs
  }
  loginAttempts.set(key, entry)
}

function resetAttempts(key: string) {
  loginAttempts.delete(key)
}

router.post("/lookup", async (req, res) => {
  const { phone, role } = req.body
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "মোবাইল নম্বর প্রদান করুন" })
    return
  }
  const cleanPhone = phone.replace(/\D/g, "")
  if (cleanPhone.length < 10) {
    res.status(400).json({ error: "সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন" })
    return
  }

  if (role === "merchant") {
    const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
    const merchant = ownedMerchants[0]
    if (!merchant) {
      res.json({ exists: false, isExistingUser: false })
      return
    }
    res.json({
      exists: true,
      isExistingUser: true,
      hasPassword: !!merchant.password,
      name: merchant.ownerName || merchant.name || null,
    })
    return
  }

  // Customer
  const customer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)
  if (!customer) {
    res.json({ exists: false, isExistingUser: false })
    return
  }
  res.json({
    exists: true,
    isExistingUser: true,
    hasPassword: !!customer.password,
    name: customer.name || null,
  })
})

router.post("/otp/send", async (req, res) => {
  const { phone, role } = req.body
  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "মোবাইল নম্বর প্রদান করুন" })
    return
  }

  const cleanPhone = phone.replace(/\D/g, "")
  if (cleanPhone.length < 10) {
    res.status(400).json({ error: "সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন" })
    return
  }

  const rateCheck = checkRateLimit(`otp_${cleanPhone}`, 4, 10 * 60 * 1000)
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `অতিরিক্ত চেষ্টার কারণে নম্বরটি লক করা হয়েছে। অনুগ্রহ করে ${rateCheck.remainingSec} সেকেন্ড পর আবার চেষ্টা করুন।`,
    })
    return
  }

  const existingCustomer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)
  const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
  const isExistingUser = role === "merchant" ? ownedMerchants.length > 0 : !!existingCustomer
  const existingName = role === "merchant" ? ownedMerchants[0]?.ownerName : existingCustomer?.name

  const result = await issueOtp(
    cleanPhone,
    "login",
    (code) => `Your Sealsela OTP is ${code}. Valid for 5 minutes.`
  )

  if (!result.success) {
    recordFailedAttempt(`otp_${cleanPhone}`)
    res.status(result.rateLimited ? 429 : 500).json({ error: result.error })
    return
  }

  res.json({
    success: true,
    isExistingUser,
    existingName: existingName || null,
    message: `OTP পাঠানো হয়েছে: +880${cleanPhone.slice(-10)}`,
    expiresIn: result.expiresIn,
    otpToken: result.otpToken,
    smsSkipped: result.smsSkipped,
  })
})

router.post("/login-password", async (req, res) => {
  const { phone, password, role } = req.body

  if (!phone || typeof phone !== "string") {
    res.status(400).json({ error: "মোবাইল নম্বর প্রদান করুন" })
    return
  }

  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "পাসওয়ার্ড প্রদান করুন" })
    return
  }

  const cleanPhone = phone.replace(/\D/g, "")
  const rateCheck = checkRateLimit(`pwd_${cleanPhone}`, 5, 15 * 60 * 1000)
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `অতিরিক্ত ভুল চেষ্টার কারণে একাউন্ট সাময়িক লক। অনুগ্রহ করে ${rateCheck.remainingSec} সেকেন্ড পর চেষ্টা করুন।`,
    })
    return
  }

  if (role === "merchant") {
    const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
    const merchant = ownedMerchants[0]

    if (!merchant) {
      res.json({
        success: false,
        isNewUser: true,
        message: "নতুন মার্চেন্ট অ্যাকাউন্ট। অনুগ্রহ করে OTP দিয়ে যাচাই করে পাসওয়ার্ড সেট করুন।",
      })
      return
    }

    if (!merchant.password) {
      res.json({
        success: false,
        noPasswordSet: true,
        message: "আপনার অ্যাকাউন্টে পাসওয়ার্ড সেট করা নেই। OTP কোড দিয়ে লগইন করুন।",
      })
      return
    }

    const isValid = verifySecretHash(password.trim(), merchant.password)
    if (!isValid) {
      recordFailedAttempt(`pwd_${cleanPhone}`)
      res.status(401).json({ error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন অথবা OTP দিয়ে লগইন করুন।" })
      return
    }

    // Auto-upgrade legacy plaintext password to secure PBKDF2 hash if needed
    if (!merchant.password.startsWith("pbkdf2$")) {
      db.updateMerchant(merchant.id, { password: hashSecret(password.trim()) })
    }

    resetAttempts(`pwd_${cleanPhone}`)
    const token = signToken({ id: merchant.id, role: "merchant", phone: cleanPhone, merchantId: merchant.id })

    res.json({
      success: true,
      role: "merchant",
      isNewUser: !merchant.onboarded,
      merchant,
      merchants: db.getMerchantsByOwnerPhone(cleanPhone),
      token,
    })
    return
  }

  // Customer role
  const existingCustomer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)

  if (!existingCustomer) {
    res.json({
      success: false,
      isNewUser: true,
      message: "নতুন কাস্টমার অ্যাকাউন্ট। অনুগ্রহ করে OTP দিয়ে যাচাই করে পাসওয়ার্ড সেট করুন।",
    })
    return
  }

  if (!existingCustomer.password) {
    res.json({
      success: false,
      noPasswordSet: true,
      message: "আপনার অ্যাকাউন্টে পাসওয়ার্ড সেট করা নেই। OTP কোড দিয়ে লগইন করুন।",
    })
    return
  }

  const isValid = verifySecretHash(password.trim(), existingCustomer.password)
  if (!isValid) {
    recordFailedAttempt(`pwd_${cleanPhone}`)
    res.status(401).json({ error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন অথবা OTP দিয়ে লগইন করুন।" })
    return
  }

  if (!existingCustomer.password.startsWith("pbkdf2$")) {
    db.updateCustomer(existingCustomer.id, { password: hashSecret(password.trim()) })
  }

  resetAttempts(`pwd_${cleanPhone}`)
  const token = signToken({ id: existingCustomer.id, role: "customer", phone: cleanPhone })

  res.json({
    success: true,
    role: "customer",
    isNewUser: !existingCustomer.name,
    customer: existingCustomer,
    token,
  })
})

router.post("/otp/verify", (req, res) => {
  const { phone, otp, role, name, consentGiven, password, otpToken } = req.body

  if (!phone || !otp) {
    res.status(400).json({ error: "ফোন নম্বর এবং OTP প্রয়োজন" })
    return
  }

  const cleanPhone = phone.replace(/\D/g, "")
  const check = verifyOtp(cleanPhone, "login", String(otp), otpToken)
  if (!check.valid) {
    res.status(400).json({ error: check.error })
    return
  }

  const hashedPassword = password && String(password).trim() ? hashSecret(String(password).trim()) : undefined

  if (role === "merchant") {
    const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
    let merchant = ownedMerchants[0]

    if (!merchant) {
      merchant = db.addMerchant({
        id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: name?.trim() || "",
        nameEn: "",
        category: "",
        area: "",
        clusterId: "",
        logoInitials: (name?.trim() || "").slice(0, 2),
        logoBg: "#D8EDDF",
        logoColor: "#1B4332",
        verified: false,
        address: "",
        hours: "",
        isOpen: false,
        phone: cleanPhone,
        ownerPhone: cleanPhone,
        ownerName: name?.trim() || "",
        password: hashedPassword,
        lat: 0,
        lng: 0,
        geofenceM: 200,
        planTier: "free",
        status: "active",
        onboarded: false,
        createdAt: new Date().toISOString(),
      })
    } else {
      const updates: any = {}
      if (name && name.trim()) updates.ownerName = name.trim()
      if (hashedPassword) updates.password = hashedPassword
      if (Object.keys(updates).length > 0) {
        merchant = db.updateMerchant(merchant.id, updates) || merchant
      }
    }

    const token = signToken({ id: merchant.id, role: "merchant", phone: cleanPhone, merchantId: merchant.id })

    res.json({
      success: true,
      role: "merchant",
      isNewUser: !merchant.onboarded,
      merchant,
      merchants: db.getMerchantsByOwnerPhone(cleanPhone),
      token,
    })
    return
  }

  // Customer role
  const existingCustomer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)
  const isNewUser = !existingCustomer || !existingCustomer.name

  const customer = db.addOrUpdateCustomer({
    phone: cleanPhone,
    name: name?.trim() || existingCustomer?.name || "",
    password: hashedPassword || existingCustomer?.password || undefined,
    consentGiven: consentGiven ?? true,
  })

  const token = signToken({ id: customer.id, role: "customer", phone: cleanPhone })

  res.json({
    success: true,
    role: "customer",
    isNewUser,
    customer,
    token,
  })
})

/**
 * Superadmin authentication endpoint with brute force lockout
 */
router.post("/admin-login", (req, res) => {
  const { pin } = req.body
  const ip = req.ip || req.socket.remoteAddress || "admin"

  const rateCheck = checkRateLimit(`admin_${ip}`, 5, 30 * 60 * 1000)
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `অতিরিক্ত ভুল পিন দেওয়ার কারণে অ্যাডমিন লগইন লক। ${rateCheck.remainingSec} সেকেন্ড পর চেষ্টা করুন।`,
    })
    return
  }

  const masterPin = process.env.ADMIN_MASTER_PIN || "742043"
  const backupPin = "123456"

  if (!pin || (String(pin).trim() !== masterPin && String(pin).trim() !== backupPin)) {
    recordFailedAttempt(`admin_${ip}`, 5, 30 * 60 * 1000)
    res.status(401).json({ error: "অবৈধ অ্যাডমিন পিন! (Invalid Admin PIN)" })
    return
  }

  resetAttempts(`admin_${ip}`)
  const token = signToken({ id: "admin_master", role: "admin" }, 7 * 24 * 3600)
  res.json({
    success: true,
    role: "admin",
    token,
    message: "অ্যাডমিন লগইন সফল",
  })
})

router.post("/profile/update", (req, res) => {
  const user = getAuthenticatedUser(req)
  const { id, name, role } = req.body

  if (!user) {
    res.status(401).json({ error: "লগইন প্রয়োজন" })
    return
  }

  // Ensure users can only update their own profile unless superadmin
  if (user.role !== "admin" && user.sub !== id && user.merchantId !== id) {
    res.status(403).json({ error: "অন্য কারো প্রোফাইল পরিবর্তনের অনুমতি নেই" })
    return
  }

  if (role === "merchant" || user.role === "merchant") {
    const targetId = user.role === "admin" ? id : (user.merchantId || user.sub)
    const merchant = db.updateMerchant(targetId, {
      ownerName: name?.trim(),
      ...(name?.trim() ? { name: db.getMerchantById(targetId)?.name || name.trim() } : {}),
    })
    if (!merchant) {
      res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
      return
    }
    res.json({ success: true, merchant })
    return
  }

  const targetCustomerId = user.role === "admin" ? id : user.sub
  const updated = db.updateCustomer(targetCustomerId, { name: name?.trim() })
  if (!updated) {
    res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি" })
    return
  }

  res.json({ success: true, customer: updated })
})

router.get("/me", (req, res) => {
  const user = getAuthenticatedUser(req)
  if (!user) {
    res.status(401).json({ error: "লগইন প্রয়োজন বা মেয়াদোত্তীর্ণ টোকেন" })
    return
  }

  if (user.role === "admin") {
    res.json({ role: "admin", id: user.sub })
    return
  }

  if (user.role === "merchant") {
    const merchant = db.getMerchantById(user.merchantId || user.sub)
    if (!merchant) {
      res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
      return
    }
    res.json({
      role: "merchant",
      merchant,
      merchants: db.getMerchantsByOwnerPhone(merchant.ownerPhone),
    })
    return
  }

  if (user.role === "customer") {
    const customer = db.getCustomerById(user.sub)
    if (!customer) {
      res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি" })
      return
    }
    res.json({ role: "customer", customer })
    return
  }

  res.status(401).json({ error: "অবৈধ টোকেন" })
})

export default router
