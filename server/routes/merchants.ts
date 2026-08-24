import { Router } from "express"
import QRCode from "qrcode"
import { db, calculateDistanceMeters } from "../db.js"
import { currentMerchantId, requireMerchantOwner } from "../middleware/auth.js"

const router = Router()

/**
 * Brands owned by the signed-in merchant.
 *
 * The merchant console uses this instead of the public directory so an owner
 * only ever sees — and can only ever switch between — their own shops.
 */
router.get("/mine", (req, res) => {
  const signedInId = currentMerchantId(req)
  if (!signedInId) {
    res.status(401).json({ error: "মার্চেন্ট লগইন প্রয়োজন" })
    return
  }
  const signedIn = db.getMerchantById(signedInId)
  if (!signedIn) {
    res.status(404).json({ error: "মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি" })
    return
  }
  res.json(db.getMerchantsByOwnerPhone(signedIn.ownerPhone))
})

router.get("/", (req, res) => {
  const { clusterId, category, search, lat, lng } = req.query
  // The customer-facing directory only lists shops that finished onboarding.
  let merchants = db.getMerchants().filter((m) => m.status === "active" && m.onboarded)

  if (clusterId && typeof clusterId === "string") {
    merchants = merchants.filter((m) => m.clusterId === clusterId)
  }
  if (category && typeof category === "string" && category !== "all") {
    merchants = merchants.filter((m) => m.category.toLowerCase().includes(category.toLowerCase()))
  }
  if (search && typeof search === "string") {
    const q = search.toLowerCase()
    merchants = merchants.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        m.area.toLowerCase().includes(q)
    )
  }

  // Calculate dynamic distance if coordinates provided
  const userLat = lat !== undefined ? parseFloat(lat as string) : undefined
  const userLng = lng !== undefined ? parseFloat(lng as string) : undefined

  const results = merchants.map((m) => {
    // Distance is only reported when we actually know where the customer is.
    if (userLat === undefined || userLng === undefined || !m.lat || !m.lng) {
      return { ...m, distance: undefined, distanceMeters: undefined }
    }
    const distanceM = calculateDistanceMeters(userLat, userLng, m.lat, m.lng)
    const distanceStr =
      distanceM < 1000 ? `${distanceM} মি.` : `${(distanceM / 1000).toFixed(1)} কি.মি.`
    return { ...m, distance: distanceStr, distanceMeters: distanceM }
  })

  res.json(results)
})

router.get("/:id", (req, res) => {
  const merchant = db.getMerchantById(req.params.id)
  if (!merchant) {
    res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
    return
  }
  const programs = db.getProgramsByMerchant(merchant.id)
  res.json({ merchant, programs })
})

// Helper to format company name slug for silsila.ai.studio/[company name]
function getCompanySlug(merchant: { name: string; nameEn?: string; id: string }): string {
  if (merchant.nameEn && merchant.nameEn.trim()) {
    const slug = merchant.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    if (slug) return slug
  }
  const clean = merchant.name.toLowerCase().trim().replace(/\s+/g, "-")
  return clean || merchant.id
}

router.post("/", (req, res) => {
  const {
    name,
    nameEn,
    category,
    area,
    address,
    hours,
    phone,
    ownerName,
    ownerPhone,
    lat,
    lng,
    logoUrl,
    logoInitials,
    staffPin,
  } = req.body

  if (!name || !category || !phone) {
    res.status(400).json({ error: "নাম, ক্যাটাগরি এবং ফোন নম্বর আবশ্যক" })
    return
  }

  // If this owner already has a shell account from OTP login, finish that one
  // instead of creating a duplicate merchant record.
  const owner = (ownerPhone || phone) as string
  const existingShell = db.getMerchantsByOwnerPhone(owner).find((m) => !m.onboarded)

  const details = {
    name,
    nameEn: nameEn || "",
    category,
    area: area || "",
    address: address || "",
    hours: hours || "",
    isOpen: true,
    phone,
    ownerPhone: owner,
    ownerName: ownerName || "",
    logoUrl: logoUrl || undefined,
    logoInitials: logoInitials || name.slice(0, 2),
    lat: typeof lat === "number" ? lat : 0,
    lng: typeof lng === "number" ? lng : 0,
    geofenceM: 200,
    verified: false,
    onboarded: true,
    ...(staffPin ? { staffPin: String(staffPin), staffPinUpdatedAt: new Date().toISOString() } : {}),
  }

  const merchant = existingShell
    ? db.updateMerchant(existingShell.id, details)!
    : db.addMerchant({
        id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        clusterId: "",
        logoBg: "#D8EDDF",
        logoColor: "#1B4332",
        planTier: "free",
        status: "active",
        createdAt: new Date().toISOString(),
        ...details,
      })

  res.status(201).json({ merchant })
})

router.put("/:id", requireMerchantOwner("id"), (req, res) => {
  // Ownership-controlled fields can never be reassigned through a profile save.
  const { id, ownerPhone, status, planTier, staffPin, onboarded, ...safeUpdates } = req.body
  const updated = db.updateMerchant(req.params.id, safeUpdates)
  if (!updated) {
    res.status(404).json({ error: "মার্চেন্ট খুঁজে পাওয়া যায়নি" })
    return
  }
  res.json(updated)
})

// QR Code Generation for counter table-tents and scans (PRD E2.1, E5.4)
// QR Link format: silsila.ai.studio/[company name]
router.get("/:id/qr", async (req, res) => {
  const merchant = db.getMerchantById(req.params.id)
  if (!merchant) {
    res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
    return
  }

  const companySlug = getCompanySlug(merchant)
  const formattedQrLink = `silsila.ai.studio/${companySlug}`
  const fullScanUrl = `https://silsila.ai.studio/${companySlug}?m=${merchant.id}`

  try {
    const qrDataUrl = await QRCode.toDataURL(fullScanUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: merchant.logoColor || "#1B4332",
        light: "#FFFFFF",
      },
    })

    res.json({
      merchantId: merchant.id,
      merchantName: merchant.name,
      companySlug,
      formattedQrLink,
      scanUrl: fullScanUrl,
      qrDataUrl,
    })
  } catch (err) {
    console.error("QR Generation Error:", err)
    res.status(500).json({ error: "QR কোড তৈরিতে সমস্যা হয়েছে" })
  }
})

export default router
