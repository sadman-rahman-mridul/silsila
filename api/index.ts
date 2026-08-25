import express from "express"
import cors from "cors"

import authRoutes from "../server/routes/auth.js"
import merchantRoutes from "../server/routes/merchants.js"
import rewardProgramRoutes from "../server/routes/rewardPrograms.js"
import approvalRoutes from "../server/routes/approvals.js"
import cardRoutes from "../server/routes/cards.js"
import voucherRoutes from "../server/routes/vouchers.js"
import staffRoutes from "../server/routes/staff.js"
import crmRoutes from "../server/routes/crm.js"
import analyticsRoutes from "../server/routes/analytics.js"
import opsRoutes from "../server/routes/ops.js"
import privacyRoutes from "../server/routes/privacy.js"

const app = express()

app.use(cors())
app.use(express.json())

const router = express.Router()

router.use("/auth", authRoutes)
router.use("/merchants", merchantRoutes)
router.use("/reward-programs", rewardProgramRoutes)
router.use("/approvals", approvalRoutes)
router.use("/cards", cardRoutes)
router.use("/vouchers", voucherRoutes)
router.use("/staff", staffRoutes)
router.use("/crm", crmRoutes)
router.use("/analytics", analyticsRoutes)
router.use("/ops", opsRoutes)
router.use("/privacy", privacyRoutes)

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Silsila Vercel Serverless API",
    timestamp: new Date().toISOString(),
  })
})

// Support both /api/* and direct router matching
app.use("/api", router)
app.use("/", router)

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("[Vercel API Error]:", err)
  res.status(err.status || 500).json({ error: err.message || "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।" })
})

export default app
