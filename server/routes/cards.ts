import { Router } from "express"
import { db } from "../db.js"
import { getAuthenticatedUser } from "../middleware/auth.js"

const router = Router()

// Customer Wallet Home - list cards (PRD E4a)
router.get("/", (req, res) => {
  const user = getAuthenticatedUser(req)
  const { customerId: queryCustomerId } = req.query

  const customerId = user && user.role === "customer" ? user.sub : (queryCustomerId as string | undefined)

  if (!customerId || typeof customerId !== "string") {
    res.status(400).json({ error: "কাস্টমার আইডি প্রদান করুন" })
    return
  }

  const rawCards = db.getCardsByCustomer(customerId)
  const vouchers = db.getVouchersForCustomer(customerId)

  const walletCards = rawCards.map((c) => {
    const merchant = db.getMerchantById(c.merchantId)
    const program = db.getProgramById(c.programId) || db.getProgramsByMerchant(c.merchantId)[0]
    const target = program?.target || 5
    const voucher = vouchers.find((v) => v.cardId === c.id && v.status === "active")

    const stampsRemaining = Math.max(0, target - c.stamps)
    const isCompleted = c.stamps >= target || !!voucher

    return {
      ...c,
      target,
      rewardText: program?.rewardText || "বিশেষ উপহার",
      stampsRemaining,
      voucherReady: isCompleted,
      voucherCode: voucher?.code || c.voucherCode,
      voucherExpiry: voucher?.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString("bn-BD") : c.voucherExpiry,
      merchant: merchant
        ? {
            id: merchant.id,
            name: merchant.name,
            nameEn: merchant.nameEn,
            category: merchant.category,
            area: merchant.area,
            logoInitials: merchant.logoInitials,
            logoBg: merchant.logoBg,
            logoColor: merchant.logoColor,
            verified: merchant.verified,
            address: merchant.address,
            hours: merchant.hours,
            isOpen: merchant.isOpen,
            distance: merchant.distance || "০.৪ কি.মি.",
          }
        : null,
    }
  })

  // Sort logic: 1. Unredeemed voucher ready -> 2. Closest to completion -> 3. Recent visit
  walletCards.sort((a, b) => {
    if (a.voucherReady && !b.voucherReady) return -1
    if (!a.voucherReady && b.voucherReady) return 1
    if (a.stampsRemaining !== b.stampsRemaining) return a.stampsRemaining - b.stampsRemaining
    return b.lastVisitTimestamp - a.lastVisitTimestamp
  })

  res.json(walletCards)
})

// Canonical Card Detail Page for a customer at a merchant (PRD E4b)
router.get("/detail", (req, res) => {
  const user = getAuthenticatedUser(req)
  const { customerId: queryCustomerId, merchantId } = req.query

  const customerId = user && user.role === "customer" ? user.sub : (queryCustomerId as string | undefined)

  if (!customerId || !merchantId || typeof customerId !== "string" || typeof merchantId !== "string") {
    res.status(400).json({ error: "কাস্টমার ও মার্চেন্ট আইডি প্রয়োজন" })
    return
  }

  let merchant = db.getMerchantById(merchantId)
  if (!merchant) {
    const cleanSlug = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")
    merchant = db.getMerchants().find((m) => {
      const en = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const bn = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      return m.id.toLowerCase() === merchantId.toLowerCase() || en === cleanSlug || bn === cleanSlug
    })
  }

  if (!merchant) {
    res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
    return
  }

  const effectiveMerchantId = merchant.id
  const card = db.getOrCreateCard(customerId, effectiveMerchantId)
  const programs = db.getProgramsByMerchant(effectiveMerchantId)
  const program = db.getProgramById(card.programId) || programs[0]
  const stamps = db.getStampsForCard(card.id)
  const vouchers = db.getVouchersForCustomer(customerId)
  const activeVoucher = vouchers.find((v) => v.cardId === card.id && v.status === "active")

  res.json({
    card: {
      ...card,
      target: program?.target || 5,
      rewardText: program?.rewardText || "বিশেষ উপহার",
      voucherReady: card.stamps >= (program?.target || 5) || !!activeVoucher,
      voucherCode: activeVoucher?.code || card.voucherCode,
      voucherExpiry: activeVoucher?.expiresAt ? new Date(activeVoucher.expiresAt).toLocaleDateString("bn-BD") : card.voucherExpiry,
    },
    merchant: {
      id: merchant.id,
      name: merchant.name,
      nameEn: merchant.nameEn,
      category: merchant.category,
      area: merchant.area,
      address: merchant.address,
      hours: merchant.hours,
      isOpen: merchant.isOpen,
      logoInitials: merchant.logoInitials,
      logoBg: merchant.logoBg,
      logoColor: merchant.logoColor,
      verified: merchant.verified,
      distance: merchant.distance || "০.৪ কি.মি.",
      phone: merchant.phone,
    },
    program,
    stamps: stamps.map((s) => ({
      ...s,
      dateFormatted: new Date(s.createdAt).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      timeFormatted: new Date(s.createdAt).toLocaleTimeString("bn-BD", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  })
})

export default router
