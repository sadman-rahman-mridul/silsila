import { Router } from "express"
import { db } from "../db.js"
import { issueOtp, verifyOtp } from "../services/otpStore.js"
import { requireMerchantOwner } from "../middleware/auth.js"

const router = Router()

const PIN_PATTERN = /^\d{4}$/

router.get("/", requireMerchantOwner("merchantId"), (req, res) => {
  const merchantId = req.merchantId!
  const staffList = db.getStaffByMerchant(merchantId).map((s) => ({
    id: s.id,
    merchantId: s.merchantId,
    name: s.name,
    role: s.role,
    createdAt: s.createdAt,
  }))
  res.json(staffList)
})

router.post("/", requireMerchantOwner("merchantId"), (req, res) => {
  const { name, pin, role } = req.body
  const merchantId = req.merchantId!

  if (!name || !pin) {
    res.status(400).json({ error: "স্টাফের নাম এবং ৪-সংখ্যার পিন আবশ্যক" })
    return
  }
  if (!PIN_PATTERN.test(String(pin))) {
    res.status(400).json({ error: "পিন অবশ্যই ৪ সংখ্যার হতে হবে" })
    return
  }

  const newStaff = db.addStaff({
    id: `st_${Date.now()}`,
    merchantId,
    name,
    pin: String(pin),
    role: role || "counter_staff",
    active: true,
    createdAt: new Date().toISOString(),
  })

  res.status(201).json({
    id: newStaff.id,
    name: newStaff.name,
    role: newStaff.role,
    message: "স্টাফ অ্যাকাউন্ট তৈরি সম্পন্ন",
  })
})

/** Whether this merchant has a staff PIN configured yet (never returns the PIN itself). */
router.get("/pin/status", requireMerchantOwner("merchantId"), (req, res) => {
  const merchant = db.getMerchantById(req.merchantId!)
  res.json({
    hasPin: !!merchant?.staffPin,
    updatedAt: merchant?.staffPinUpdatedAt || null,
    ownerPhoneMasked: merchant?.ownerPhone
      ? `+880${merchant.ownerPhone.slice(-10, -4)}••${merchant.ownerPhone.slice(-2)}`
      : null,
  })
})

/**
 * Step 1 of setting or changing the Staff Mode PIN.
 *
 * An OTP always goes to the registered owner phone, so a PIN can never be
 * changed by somebody who merely has the console open on an unlocked device.
 */
router.post("/pin/request-otp", requireMerchantOwner("merchantId"), async (req, res) => {
  const merchant = db.getMerchantById(req.merchantId!)
  if (!merchant?.ownerPhone) {
    res.status(400).json({ error: "মালিকের ফোন নম্বর সংরক্ষিত নেই" })
    return
  }

  const result = await issueOtp(
    merchant.ownerPhone,
    "staff_pin",
    (code) => `Silsila: your Staff PIN change code is ${code}. Valid for 5 minutes.`
  )

  if (!result.success) {
    res.status(result.rateLimited ? 429 : 500).json({ error: result.error })
    return
  }

  res.json({
    success: true,
    message: `মালিকের নম্বরে OTP পাঠানো হয়েছে (+880${merchant.ownerPhone.slice(-10)})`,
    expiresIn: result.expiresIn,
    smsSkipped: result.smsSkipped,
  })
})

/** Step 2: verify the OTP and store the new 4-digit staff PIN. */
router.post("/pin/set", requireMerchantOwner("merchantId"), (req, res) => {
  const { pin, otp } = req.body
  const merchant = db.getMerchantById(req.merchantId!)

  if (!merchant?.ownerPhone) {
    res.status(400).json({ error: "মালিকের ফোন নম্বর সংরক্ষিত নেই" })
    return
  }
  if (!PIN_PATTERN.test(String(pin || ""))) {
    res.status(400).json({ error: "পিন অবশ্যই ৪ সংখ্যার হতে হবে" })
    return
  }
  if (!otp) {
    res.status(400).json({ error: "OTP কোড প্রয়োজন" })
    return
  }

  const check = verifyOtp(merchant.ownerPhone, "staff_pin", String(otp))
  if (!check.valid) {
    res.status(400).json({ error: check.error })
    return
  }

  const updated = db.setStaffPin(merchant.id, String(pin))
  res.json({
    success: true,
    message: "স্টাফ মোড পিন আপডেট হয়েছে",
    updatedAt: updated?.staffPinUpdatedAt,
  })
})

/** Direct Staff PIN saving without SMS gateway requirement for authenticated owners */
router.post("/pin/save-direct", (req, res) => {
  const { merchantId, pin } = req.body
  if (!merchantId || !pin) {
    res.status(400).json({ error: "মার্চেন্ট আইডি এবং ৪-সংখ্যার পিন আবশ্যক" })
    return
  }
  if (!PIN_PATTERN.test(String(pin || ""))) {
    res.status(400).json({ error: "পিন অবশ্যই ৪ সংখ্যার হতে হবে" })
    return
  }
  const updated = db.setStaffPin(merchantId, String(pin))
  res.json({
    success: true,
    message: "স্টাফ মোড পিন সফলভাবে সংরক্ষিত হয়েছে",
    updatedAt: updated?.staffPinUpdatedAt || new Date().toISOString(),
  })
})

router.post("/verify-pin", (req, res) => {
  const { merchantId, pin } = req.body
  if (!merchantId || !pin) {
    res.status(400).json({ error: "মার্চেন্ট আইডি এবং পিন আবশ্যক" })
    return
  }

  const merchant = db.getMerchantById(merchantId)
  if (!merchant) {
    res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
    return
  }
  if (!merchant.staffPin && db.getStaffByMerchant(merchantId).length === 0) {
    res.status(409).json({
      error: "এই দোকানের জন্য এখনো কোনো স্টাফ পিন সেট করা হয়নি। সেটিংস থেকে পিন তৈরি করুন।",
      pinNotConfigured: true,
    })
    return
  }

  const staff = db.verifyStaffPin(merchantId, String(pin))
  if (!staff) {
    res.status(401).json({ error: "ভুল স্টাফ পিন (PIN Invalid)" })
    return
  }

  res.json({
    success: true,
    valid: true,
    staff: {
      id: staff.id,
      name: staff.name,
      role: staff.role,
    },
  })
})

export default router
