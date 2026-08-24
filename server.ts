import express from "express"
import cors from "cors"
import path from "node:path"
import { createServer as createViteServer } from "vite"

import authRoutes from "./server/routes/auth.js"
import merchantRoutes from "./server/routes/merchants.js"
import rewardProgramRoutes from "./server/routes/rewardPrograms.js"
import approvalRoutes from "./server/routes/approvals.js"
import cardRoutes from "./server/routes/cards.js"
import voucherRoutes from "./server/routes/vouchers.js"
import staffRoutes from "./server/routes/staff.js"
import crmRoutes from "./server/routes/crm.js"
import analyticsRoutes from "./server/routes/analytics.js"
import opsRoutes from "./server/routes/ops.js"
import privacyRoutes from "./server/routes/privacy.js"

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(cors())
  app.use(express.json())

  // API Routes
  app.use("/api/auth", authRoutes)
  app.use("/api/merchants", merchantRoutes)
  app.use("/api/reward-programs", rewardProgramRoutes)
  app.use("/api/approvals", approvalRoutes)
  app.use("/api/cards", cardRoutes)
  app.use("/api/vouchers", voucherRoutes)
  app.use("/api/staff", staffRoutes)
  app.use("/api/crm", crmRoutes)
  app.use("/api/analytics", analyticsRoutes)
  app.use("/api/ops", opsRoutes)
  app.use("/api/privacy", privacyRoutes)

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "Silsila Loyalty Backend Engine",
      timestamp: new Date().toISOString(),
    })
  })

  // Vite Dev Server middleware or Production static files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), "dist")
    app.use(express.static(distPath))
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Silsila Server] running at http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error("Failed to start Silsila server:", err)
})
