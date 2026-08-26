import { Router } from "express"
import { db, calculateDistanceMeters } from "../db.js"

const router = Router()

// Scan QR code -> Create Pending Approval (PRD E2.2, E2.6, E2.7)
router.post("/scan", (req, res) => {
  const { merchantId, customerId, customerName, customerPhone, scanLat, scanLng } = req.body

  if (!merchantId || !customerId) {
    res.status(400).json({ error: "মার্চেন্ট এবং কাস্টমার তথ্য প্রয়োজন" })
    return
  }

  let merchant = db.getMerchantById(merchantId)
  if (!merchant) {
    const clean = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")
    merchant = db.getMerchants().find((m) => {
      const en = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const bn = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      return m.id.toLowerCase() === merchantId.toLowerCase() || en === clean || bn === clean
    })
  }

  // Create temporary in-memory placeholder if freshly started serverless instance
  if (!merchant) {
    merchant = {
      id: merchantId,
      name: "দোকান",
      category: "ক্যাফে",
      area: "ঢাকা",
      ownerPhone: "01000000000",
      verified: true,
    } as any
  }

  // 1. Geofence Verification (PRD E2.6: Scans beyond 200m rejected)
  // Unknown location stays unknown — it is never reported as a plausible-looking
  // distance the counter staff might trust.
  let distanceMeters = -1
  if (typeof scanLat === "number" && typeof scanLng === "number" && merchant.lat && merchant.lng) {
    distanceMeters = calculateDistanceMeters(scanLat, scanLng, merchant.lat, merchant.lng)
    const allowedRadius = merchant.geofenceM || 200
    if (distanceMeters > allowedRadius) {
      db.logFraudSignal({
        merchantId: merchant.id,
        merchantName: merchant.name,
        signal: `জিওফেন্স লঙ্ঘন: কাস্টমার ${distanceMeters}মি দূরত্ব থেকে স্ক্যান করেছেন (সীমা: ${allowedRadius}মি)`,
        severity: "warning",
        count: 1,
        timestamp: "এইমাত্র",
      })
      res.status(403).json({
        error: `জিওফেন্স ত্রুটি: আপনি দোকান থেকে ${distanceMeters} মিটার দূরে আছেন। স্ট্যাম্প পেতে অনুগ্রহ করে দোকানের ২০০ মিটারের মধ্যে থাকুন।`,
        distanceMeters,
        allowedRadius,
      })
      return
    }
  }

  // 2. Strict Same-Day Limit Verification: Max 1 stamp per customer per merchant per calendar day
  const lastStamp = db.getLastStampForCustomer(customerId, merchantId)
  const existingCard = db.getCard(customerId, merchantId)
  const today = new Date()

  let stampedToday = false
  if (lastStamp?.timestamp) {
    const d = new Date(lastStamp.timestamp)
    stampedToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
  } else if (existingCard && existingCard.stamps > 0 && existingCard.lastVisit) {
    const d = new Date(existingCard.lastVisit)
    stampedToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
  }

  if (stampedToday) {
    db.logFraudSignal({
      merchantId: merchant.id,
      merchantName: merchant.name,
      signal: "একই দিনে একাধিক সিল নেওয়ার প্রচেষ্টা",
      severity: "info",
      count: 1,
      timestamp: "এইমাত্র",
    })
    res.status(429).json({
      error: "আপনি ইতিমধ্যে আজকের জন্য এই দোকানে ১টি সিল পেয়েছেন। ১ দিনে সর্বোচ্চ ১টি সিল সংগ্রহ করা যাবে। পরবর্তী সিলের জন্য অনুগ্রহ করে আগামীকাল আসুন!",
      isSameDay: true,
      alreadyStampedToday: true,
    })
    return
  }


  // Check if there is already an active pending approval for this customer at this merchant
  const existingPending = db
    .getPendingApprovals(merchantId)
    .find((pa) => pa.customerId === customerId && pa.resolution === "pending")

  if (existingPending) {
    res.json({
      success: true,
      pendingApproval: existingPending,
      message: "ইতিমধ্যে একটি অনুমোদন অপেক্ষমাণ রয়েছে",
    })
    return
  }

  const customer = db.getCustomerById(customerId)
  if (!customer) {
    res.status(404).json({ error: "কাস্টমার পাওয়া যায়নি" })
    return
  }
  const cName = customerName || customer.name || ""
  const cPhone = customerPhone || customer.phone || ""

  const now = Date.now()
  const newApproval = db.addPendingApproval({
    id: `pa_${now}_${Math.floor(Math.random() * 1000)}`,
    merchantId,
    customerId,
    customerName: cName,
    customerPhone: cPhone,
    scanLat,
    scanLng,
    distanceMeters,
    createdAt: new Date(now).toISOString(),
    createdTimestamp: now,
    expiresAt: new Date(now + 30 * 60 * 1000).toISOString(), // 30 min expiry
    resolution: "pending",
  })

  res.status(201).json({
    success: true,
    pendingApproval: newApproval,
    message: "অনুমোদনের জন্য কাউন্টারে পাঠানো হয়েছে",
  })
})

// List Pending Approvals for Merchant (PRD E2.3, E5.3)
router.get("/", (req, res) => {
  const { merchantId } = req.query
  if (!merchantId || typeof merchantId !== "string") {
    res.json(db.getPendingApprovals())
    return
  }
  const approvals = db.getPendingApprovals(merchantId)
  res.json(approvals)
})

// Check status of a single pending approval (for customer polling during scan flow)
router.get("/:id/status", (req, res) => {
  const approval = db.getPendingApprovalById(req.params.id)
  if (!approval) {
    res.status(404).json({ error: "অনুমোদন পাওয়া যায়নি" })
    return
  }

  let card = undefined
  let voucher = undefined
  if (approval.resolution === "approved") {
    card = db.getCard(approval.customerId, approval.merchantId)
    const vouchers = db.getVouchersForCustomer(approval.customerId)
    voucher = vouchers.find((v) => v.cardId === card?.id && v.status === "active")
  }

  res.json({
    approval,
    status: approval.resolution,
    card,
    voucher,
  })
})

// Resolve Pending Approval (Approve / Reject) (PRD E2.4)
router.post("/:id/resolve", (req, res) => {
  const { resolution, staffId } = req.body

  if (!resolution || !["approved", "rejected"].includes(resolution)) {
    res.status(400).json({ error: "সঠিক রেজোলিউশন (approved/rejected) প্রদান করুন" })
    return
  }

  const sId = staffId || "owner"
  const result = db.resolvePendingApproval(req.params.id, resolution as "approved" | "rejected", sId)

  if (!result) {
    res.status(404).json({ error: "মেয়াদোত্তীর্ণ বা অনির্দিষ্ট অনুমোদন" })
    return
  }

  res.json({
    success: true,
    ...result,
  })
})

export default router
