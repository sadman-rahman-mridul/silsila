import { Router } from "express"
import { db } from "../db.js"

const router = Router()

router.get("/merchants", (req, res) => {
  const all = db.getMerchants()
  const pending = all.filter((m) => m.status === "pending")
  const active = all.filter((m) => m.status === "active" || m.status === "suspended")

  const allStamps = db.getData().stamps
  const sevenDaysAgo = Date.now() - 7 * 86400000

  const enrichedActive = active.map((m) => {
    const mStamps = allStamps.filter((s) => s.merchantId === m.id)
    const weekStamps = mStamps.filter((s) => s.timestamp >= sevenDaysAgo).length
    const uniqueCusts = new Set(mStamps.map((s) => s.customerId)).size

    const lastStampAt = mStamps.length > 0 ? Math.max(...mStamps.map((s) => s.timestamp)) : null

    const visitsByCustomer: Record<string, number> = {}
    mStamps.forEach((s) => {
      visitsByCustomer[s.customerId] = (visitsByCustomer[s.customerId] || 0) + 1
    })
    const repeatRate =
      uniqueCusts > 0
        ? Math.round(
            (Object.values(visitsByCustomer).filter((n) => n >= 2).length / uniqueCusts) * 100
          )
        : 0

    let statusType: "active" | "at_risk" | "inactive" = "active"
    if (m.status === "suspended") statusType = "inactive"
    else if (mStamps.length === 0) statusType = "inactive"
    else if (weekStamps < 10) statusType = "at_risk"

    return {
      id: m.id,
      name: m.name,
      area: m.area,
      category: m.category,
      stampsWeek: weekStamps,
      customers: uniqueCusts,
      status: m.status === "suspended" ? "suspended" : statusType,
      lastStamp: lastStampAt ? new Date(lastStampAt).toISOString() : null,
      repeatRate,
    }
  })

  res.json({
    pending: pending.map((m) => ({
      id: m.id,
      name: m.name,
      owner: m.ownerName,
      phone: m.phone,
      area: m.area,
      category: m.category,
      submittedAt: m.createdAt,
    })),
    active: enrichedActive,
  })
})

router.post("/merchants/:id/action", (req, res) => {
  const { action } = req.body // "approve" | "suspend" | "activate"
  const merchant = db.getMerchantById(req.params.id)
  if (!merchant) {
    res.status(404).json({ error: "মার্চেন্ট পাওয়া যায়নি" })
    return
  }

  if (action === "approve" || action === "activate") {
    merchant.status = "active"
  } else if (action === "suspend") {
    merchant.status = "suspended"
  }

  db.save()
  res.json({ success: true, merchant })
})

router.get("/fraud-signals", (req, res) => {
  res.json(db.getFraudSignals())
})

router.get("/cluster-stats", (req, res) => {
  const merchants = db.getMerchants().filter((m) => m.onboarded)
  const stamps = db.getData().stamps.filter((s) => !s.reversedAt)
  const sevenDaysAgo = Date.now() - 7 * 86400000
  const thirtyDaysAgo = Date.now() - 30 * 86400000

  const weekStamps = stamps.filter((s) => s.timestamp >= sevenDaysAgo)
  const merchantsWithWeeklyActivity = new Set(weekStamps.map((s) => s.merchantId))

  const visitsByCustomer: Record<string, number> = {}
  stamps
    .filter((s) => s.timestamp >= thirtyDaysAgo)
    .forEach((s) => {
      visitsByCustomer[s.customerId] = (visitsByCustomer[s.customerId] || 0) + 1
    })
  const customers30d = Object.keys(visitsByCustomer).length
  const avgRepeatRate =
    customers30d > 0
      ? Math.round(
          (Object.values(visitsByCustomer).filter((n) => n >= 2).length / customers30d) * 100
        )
      : 0

  res.json({
    total: merchants.length,
    active: merchants.filter((m) => m.status === "active" && merchantsWithWeeklyActivity.has(m.id))
      .length,
    atRisk: merchants.filter(
      (m) => m.status === "active" && !merchantsWithWeeklyActivity.has(m.id)
    ).length,
    inactive: merchants.filter((m) => m.status === "suspended").length,
    totalStampsWeek: weekStamps.length,
    uniqueCustomersCluster: new Set(stamps.map((s) => s.customerId)).size,
    avgRepeatRate,
  })
})

export default router
