import { Router } from "express"
import { db } from "../db.js"
import { requireMerchantOwner } from "../middleware/auth.js"

const router = Router()

const DAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"]

/**
 * Merchant report metrics.
 *
 * Everything below is derived from stamp/voucher records for this merchant.
 * When a merchant has no activity yet the numbers are genuinely zero — there
 * are no placeholder values anywhere in this response.
 */
router.get("/merchant", requireMerchantOwner("merchantId"), (req, res) => {
  const merchantId = req.merchantId!

  const allStamps = db.getAllStampsForMerchant(merchantId)
  const vouchers = db.getData().vouchers.filter((v) => v.merchantId === merchantId)
  const redeemedVouchers = vouchers.filter((v) => v.status === "redeemed")
  const cards = db.getData().cards.filter((c) => c.merchantId === merchantId)

  const now = Date.now()
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  const scansToday = allStamps.filter((s) => s.timestamp >= todayStart).length
  const stampsThisWeek = allStamps.filter((s) => s.timestamp >= sevenDaysAgo).length
  const stampsPrevWeek = allStamps.filter(
    (s) => s.timestamp >= fourteenDaysAgo && s.timestamp < sevenDaysAgo
  ).length
  const weeklyChange = stampsThisWeek - stampsPrevWeek

  // Repeat rate: share of the last 30 days' customers who came back at least twice.
  const visitsByCustomer: Record<string, number> = {}
  allStamps
    .filter((s) => s.timestamp >= thirtyDaysAgo)
    .forEach((s) => {
      visitsByCustomer[s.customerId] = (visitsByCustomer[s.customerId] || 0) + 1
    })
  const customers30d = Object.keys(visitsByCustomer).length
  const repeatCustomers30d = Object.values(visitsByCustomer).filter((n) => n >= 2).length
  const repeatRate = customers30d > 0 ? Math.round((repeatCustomers30d / customers30d) * 100) : 0

  const uniqueCustomers = new Set(allStamps.map((s) => s.customerId)).size
  const newThisWeek = new Set(
    allStamps.filter((s) => s.timestamp >= sevenDaysAgo).map((s) => s.customerId)
  ).size

  const dailyTrends = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now - (6 - i) * 86400000)
    const dayStart = new Date(d).setHours(0, 0, 0, 0)
    const dayEnd = new Date(d).setHours(23, 59, 59, 999)
    return {
      day: DAYS_BN[d.getDay()],
      date: d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }),
      stamps: allStamps.filter((s) => s.timestamp >= dayStart && s.timestamp <= dayEnd).length,
    }
  })

  // Visit-count funnel across every card this merchant has issued.
  const stampCountsPerCustomer = Object.values(
    allStamps.reduce<Record<string, number>>((acc, s) => {
      acc[s.customerId] = (acc[s.customerId] || 0) + 1
      return acc
    }, {})
  )
  const atLeast = (n: number) => stampCountsPerCustomer.filter((c) => c >= n).length
  const retentionFunnel = [1, 2, 3, 4].map((visit) => ({
    visit,
    customers: atLeast(visit),
    pct: uniqueCustomers > 0 ? Math.round((atLeast(visit) / uniqueCustomers) * 100) : 0,
  }))
  retentionFunnel.push({
    visit: 0, // 0 marks the "card completed" row
    customers: cards.filter((c) => c.completedAt || c.voucherReady).length,
    pct:
      uniqueCustomers > 0
        ? Math.round(
            (cards.filter((c) => c.completedAt || c.voucherReady).length / uniqueCustomers) * 100
          )
        : 0,
  })

  // Stamps per hour of day (8am–11pm), for the peak-hours histogram.
  const hourlyDistribution = Array.from({ length: 16 }).map((_, i) => {
    const hour = i + 8
    return {
      hour,
      stamps: allStamps.filter((s) => new Date(s.timestamp).getHours() === hour).length,
    }
  })

  res.json({
    scansToday,
    uniqueCustomers,
    rewardsRedeemed: redeemedVouchers.length,
    repeatRate,
    stampsThisWeek,
    newThisWeek,
    weeklyChange,
    activeCards: cards.filter((c) => !c.completedAt).length,
    totalStamps: allStamps.length,
    dailyTrends,
    retentionFunnel,
    hourlyDistribution,
    hasActivity: allStamps.length > 0,
  })
})

export default router
