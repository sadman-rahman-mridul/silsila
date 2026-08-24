import { Router } from "express"
import { db } from "../db.js"
import { requireMerchantOwner } from "../middleware/auth.js"

const router = Router()

// Merchant CRM customer list (PRD E6.1, E6.2)
router.get("/customers", requireMerchantOwner("merchantId"), (req, res) => {
  const { status, search } = req.query
  const merchantId = req.merchantId!

  const allStamps = db.getAllStampsForMerchant(merchantId)
  const cards = db.getData().cards.filter((c) => c.merchantId === merchantId)
  const customers = db.getData().customers

  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000

  const customerList = customers
    .map((cust) => {
      const card = cards.find((c) => c.customerId === cust.id)
      const stampsForCust = allStamps.filter((s) => s.customerId === cust.id)
      if (!card && stampsForCust.length === 0) return null

      const totalVisits = stampsForCust.length
      const currentStamps = card?.stamps || 0
      const lastStamp = stampsForCust.sort((a, b) => b.timestamp - a.timestamp)[0]

      const lastVisitTime = lastStamp?.timestamp || card?.lastVisitTimestamp || 0
      const daysAgo = lastVisitTime ? Math.floor((now - lastVisitTime) / oneDayMs) : null

      let custStatus: "active" | "at_risk" | "new" | "completed" = "active"
      if (card?.voucherReady || card?.completedAt) {
        custStatus = "completed"
      } else if (totalVisits <= 1 && daysAgo !== null && daysAgo < 7) {
        custStatus = "new"
      } else if (daysAgo !== null && daysAgo > 30) {
        custStatus = "at_risk"
      }

      let lastVisitStr = "এখনো ভিজিট করেননি"
      if (daysAgo === 0) lastVisitStr = "আজকে"
      else if (daysAgo === 1) lastVisitStr = "গতকাল"
      else if (daysAgo !== null && daysAgo > 1) lastVisitStr = `${daysAgo} দিন আগে`

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone.replace(/(\d{4})\d{3}(\d{4})/, "$1-***-$2"),
        rawPhone: cust.phone,
        stamps: currentStamps,
        totalVisits,
        lastVisit: lastVisitStr,
        lastVisitDaysAgo: daysAgo,
        status: custStatus,
        history: stampsForCust.map((s, idx) => ({
          stampNo: idx + 1,
          date: new Date(s.createdAt).toLocaleDateString("bn-BD", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          time: new Date(s.createdAt).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" }),
          staffId: s.staffId,
        })),
      }
    })
    .filter(Boolean)

  let filtered = customerList as any[]

  if (status && typeof status === "string" && status !== "all") {
    filtered = filtered.filter((c) => c.status === status)
  }

  if (search && typeof search === "string") {
    const q = search.toLowerCase()
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.rawPhone.includes(q))
  }

  res.json(filtered)
})

// PDPA 2026 Compliant CSV Export (PRD E6.4 & §12.1)
router.post("/export-csv", requireMerchantOwner("merchantId"), (req, res) => {
  const { consentAcknowledged } = req.body
  const merchantId = req.merchantId!

  // Gated behind explicit PDPA purpose acknowledgement (PRD §12.1)
  if (!consentAcknowledged) {
    res.status(403).json({
      error: "বাংলাদেশ ডেটা সুরক্ষা আইন ২০২৬ (PDPA) অনুযায়ী ডেটা কন্ট্রোলার সম্মতি বাধ্যতামূলক।",
      requiresAcknowledgement: true,
    })
    return
  }

  const allStamps = db.getAllStampsForMerchant(merchantId)
  const cards = db.getData().cards.filter((c) => c.merchantId === merchantId)
  const customers = db.getData().customers

  const rows = [
    ["Customer ID", "Customer Name", "Phone", "Current Stamps", "Total Visits", "Status", "Consent Date"].join(","),
  ]

  customers.forEach((cust) => {
    const card = cards.find((c) => c.customerId === cust.id)
    const stampsForCust = allStamps.filter((s) => s.customerId === cust.id)
    if (!card && stampsForCust.length === 0) return

    const totalVisits = stampsForCust.length
    const currentStamps = card?.stamps || 0
    const status = card?.voucherReady ? "completed" : totalVisits > 1 ? "active" : "new"

    rows.push(
      [
        `"${cust.id}"`,
        `"${cust.name}"`,
        `"${cust.phone}"`,
        currentStamps,
        totalVisits,
        `"${status}"`,
        `"${cust.consentTimestamp || new Date().toISOString()}"`,
      ].join(",")
    )
  })

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="silsila_customers_${merchantId}.csv"`)
  res.send("\uFEFF" + rows.join("\n"))
})

export default router
