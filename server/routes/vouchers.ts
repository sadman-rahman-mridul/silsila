import { Router } from "express"
import { db } from "../db.js"

const router = Router()

// List vouchers for a customer or merchant
router.get("/", (req, res) => {
  const { customerId, merchantId } = req.query
  let vouchers = db.getData().vouchers

  if (customerId && typeof customerId === "string") {
    vouchers = vouchers.filter((v) => v.customerId === customerId)
  }
  if (merchantId && typeof merchantId === "string") {
    vouchers = vouchers.filter((v) => v.merchantId === merchantId)
  }

  const enriched = vouchers.map((v) => {
    const merchant = db.getMerchantById(v.merchantId)
    const customer = db.getCustomerById(v.customerId)
    return {
      ...v,
      merchantName: merchant?.name || "",
      customerName: customer?.name || "",
      customerPhone: customer?.phone || "",
    }
  })

  res.json(enriched)
})

// Staff PIN Redemption (PRD E3.5, E3.6)
router.post("/redeem", (req, res) => {
  const { code, merchantId, staffPin } = req.body

  if (!code || !merchantId) {
    res.status(400).json({ error: "ভাউচার কোড এবং মার্চেন্ট আইডি প্রদান করুন" })
    return
  }

  // Redemption always requires the counter staff PIN — it is the only thing
  // standing between a printed voucher code and a free item.
  if (!staffPin) {
    res.status(400).json({ error: "রিডিম করতে স্টাফ পিন প্রদান করুন" })
    return
  }
  const staff = db.verifyStaffPin(merchantId, String(staffPin))
  if (!staff) {
    res.status(401).json({ error: "ভুল স্টাফ পিন (Staff PIN)। রিডিম ব্যর্থ হয়েছে।" })
    return
  }
  const authorizedStaffId = staff.id

  const result = db.redeemVoucher(code, merchantId, authorizedStaffId)

  if (!result.success) {
    res.status(400).json({ error: result.message })
    return
  }

  res.json(result)
})

export default router
