import { Router } from "express"
import { db } from "../db.js"
import { issueOtp, verifyOtp } from "../services/otpStore.js"

const router = Router()

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

  // Look the account up in the collection that matches the selected role:
  // merchants live in `merchants`, everyone else in `customers` (users).
  const existingCustomer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)
  const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
  const isExistingUser = role === "merchant" ? ownedMerchants.length > 0 : !!existingCustomer
  const existingName = role === "merchant" ? ownedMerchants[0]?.ownerName : existingCustomer?.name

  const result = await issueOtp(
    cleanPhone,
    "login",
    (code) => `Your Silsila OTP is ${code}. Valid for 5 minutes.`
  )

  if (!result.success) {
    res.status(result.rateLimited ? 429 : 500).json({ error: result.error })
    return
  }

  res.json({
    success: true,
    isExistingUser,
    existingName: existingName || null,
    message: `OTP পাঠানো হয়েছে: +880${cleanPhone.slice(-10)}`,
    expiresIn: result.expiresIn,
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

    if (merchant.password !== password.trim()) {
      res.status(401).json({ error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন অথবা OTP দিয়ে লগইন করুন।" })
      return
    }

    res.json({
      success: true,
      role: "merchant",
      isNewUser: !merchant.onboarded,
      merchant,
      merchants: db.getMerchantsByOwnerPhone(cleanPhone),
      token: `token_merchant_${merchant.id}`,
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

  if (existingCustomer.password !== password.trim()) {
    res.status(401).json({ error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন অথবা OTP দিয়ে লগইন করুন।" })
    return
  }

  res.json({
    success: true,
    role: "customer",
    isNewUser: !existingCustomer.name,
    customer: existingCustomer,
    token: `token_customer_${existingCustomer.id}`,
  })
})

router.post("/otp/verify", (req, res) => {
  const { phone, otp, role, name, consentGiven, password } = req.body

  if (!phone || !otp) {
    res.status(400).json({ error: "ফোন নম্বর এবং OTP প্রয়োজন" })
    return
  }

  const cleanPhone = phone.replace(/\D/g, "")
  const check = verifyOtp(cleanPhone, "login", String(otp))
  if (!check.valid) {
    res.status(400).json({ error: check.error })
    return
  }

  if (role === "merchant") {
    const ownedMerchants = db.getMerchantsByOwnerPhone(cleanPhone)
    let merchant = ownedMerchants[0]

    if (!merchant) {
      // A brand-new merchant account. Create an empty shell only
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
        password: password ? String(password).trim() : undefined,
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
      if (password && String(password).trim()) updates.password = String(password).trim()
      if (Object.keys(updates).length > 0) {
        merchant = db.updateMerchant(merchant.id, updates) || merchant
      }
    }

    res.json({
      success: true,
      role: "merchant",
      isNewUser: !merchant.onboarded,
      merchant,
      merchants: db.getMerchantsByOwnerPhone(cleanPhone),
      token: `token_merchant_${merchant.id}`,
    })
    return
  }

  // Customer role -> users collection
  const existingCustomer = db.getCustomers().find((c) => c.phone?.replace(/\D/g, "") === cleanPhone)
  const isNewUser = !existingCustomer || !existingCustomer.name

  const customer = db.addOrUpdateCustomer({
    phone: cleanPhone,
    name: name?.trim() || existingCustomer?.name || "",
    password: password ? String(password).trim() : existingCustomer?.password || undefined,
    consentGiven: consentGiven ?? true,
  })

  res.json({
    success: true,
    role: "customer",
    isNewUser,
    customer,
    token: `token_customer_${customer.id}`,
  })
})

router.post("/profile/update", (req, res) => {
  const { id, name, role } = req.body
  if (!id) {
    res.status(400).json({ error: "ইউজার আইডি প্রয়োজন" })
    return
  }

  if (role === "merchant") {
    const merchant = db.updateMerchant(id, {
      ownerName: name?.trim(),
      ...(name?.trim() ? { name: db.getMerchantById(id)?.name || name.trim() } : {}),
    })
    if (!merchant) {
      res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
      return
    }
    res.json({ success: true, merchant })
    return
  }

  const updated = db.updateCustomer(id, { name: name?.trim() })
  if (!updated) {
    res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি" })
    return
  }

  res.json({ success: true, customer: updated })
})

router.get("/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) {
    res.status(401).json({ error: "লগইন প্রয়োজন" })
    return
  }

  if (token.startsWith("token_merchant_")) {
    const merchantId = token.replace("token_merchant_", "")
    const merchant = db.getMerchantById(merchantId)
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

  if (token.startsWith("token_customer_")) {
    const customerId = token.replace("token_customer_", "")
    const customer = db.getCustomerById(customerId)
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
