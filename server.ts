import express from "express"
import cors from "cors"
import path from "node:path"
import fs from "node:fs"
import { createServer as createViteServer } from "vite"

// Load .env variables
if (fs.existsSync(".env")) {
  try {
    if (typeof (process as any).loadEnvFile === "function") {
      ;(process as any).loadEnvFile(".env")
    } else {
      const envContent = fs.readFileSync(".env", "utf-8")
      envContent.split("\n").forEach((line) => {
        const [k, ...v] = line.split("=")
        if (k && v.length > 0 && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "")
        }
      })
    }
  } catch (err) {
    console.warn("Could not load .env:", err)
  }
}

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
import { BLOG_POSTS } from "./src/data/blogPosts.js"

// Helper to inject SEO metadata into HTML shell for social preview unfurlers (WhatsApp, Facebook, Twitter, LinkedIn)
function injectSeoMeta(html: string, reqPath: string): string {
  if (reqPath.startsWith("/blog/")) {
    const slug = reqPath.replace("/blog/", "").split("?")[0].replace(/\/$/, "")
    const post = BLOG_POSTS.find((p) => p.slug === slug)
    if (post) {
      const title = `${post.title} | Sealsela`
      const desc = post.metaDescription || post.excerpt
      const img = post.coverImage.startsWith("http")
        ? post.coverImage
        : `https://sealsela.com${post.coverImage.startsWith("/") ? "" : "/"}${post.coverImage}`
      const url = `https://sealsela.com/blog/${post.slug}`

      return html
        .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${img}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${url}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title}" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${desc}" />`)
        .replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${img}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${url}" />`)
    }
  } else if (reqPath === "/blog" || reqPath === "/blog/") {
    const title = "Blog & Insights — Customer Retention & Loyalty Growth | Sealsela"
    const desc = "Practical guides on customer loyalty, CAC vs LTV restaurant economics, and digital retention strategies for modern businesses."
    const url = "https://sealsela.com/blog"
    const img = "https://sealsela.com/retention-hero.png"

    return html
      .replace(/<title>.*?<\/title>/i, `<title>${title}</title>`)
      .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${desc}" />`)
      .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${img}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${title}" />`)
      .replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${desc}" />`)
      .replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${img}" />`)
      .replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${url}" />`)
  }
  return html
}

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(cors())
  app.use(express.json({ limit: "1mb" })) // Protect against large payload DoS

  // Production Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "SAMEORIGIN")
    res.setHeader("X-XSS-Protection", "1; mode=block")
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    }
    next()
  })

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
    app.use(async (req, res, next) => {
      if (req.method !== "GET") return next()
      const url = req.originalUrl
      if (url.startsWith("/api/")) return next()

      // If accessing an HTML route, inject meta tags
      if (!url.includes(".") || url.endsWith(".html") || url.startsWith("/blog")) {
        try {
          const indexPath = path.resolve(process.cwd(), "index.html")
          let template = fs.readFileSync(indexPath, "utf-8")
          template = injectSeoMeta(template, url)
          const html = await vite.transformIndexHtml(url, template)
          return res.status(200).set({ "Content-Type": "text/html" }).end(html)
        } catch (e) {
          vite.ssrFixStacktrace(e as Error)
          next(e)
        }
      } else {
        next()
      }
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), "dist")
    const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf-8")
    app.use(express.static(distPath))
    app.use((req, res) => {
      const rendered = injectSeoMeta(indexHtml, req.path)
      res.setHeader("Content-Type", "text/html")
      res.send(rendered)
    })
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Silsila Server] running at http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((err) => {
  console.error("Failed to start Silsila server:", err)
})
