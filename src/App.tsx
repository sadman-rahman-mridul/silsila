import { useState, useEffect } from "react"
import Landing from "./views/Landing"
import CustomerApp from "./views/customer/CustomerApp"
import MerchantApp from "./views/merchant/MerchantApp"
import OnboardingWizard from "./views/merchant/OnboardingWizard"
import OpsConsole from "./views/ops/OpsConsole"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { api, type Merchant, generateMerchantSlug } from "./services/api"
import { firebaseService } from "./services/firebaseService"

type AppView = "landing" | "customer" | "merchant" | "merchant-onboarding" | "ops"

function MainContent() {
  const { profile, updateSessionProfile, logout } = useAuth()
  const [targetMerchantId, setTargetMerchantId] = useState<string | null>(null)
  const [targetMerchantName, setTargetMerchantName] = useState<string | null>(null)
  const [targetSubpage, setTargetSubpage] = useState<string | null>(null)

  // 1. Resolve Target Merchant & Subpage from dynamic URL (e.g. /cafedhaka/settings, /cafedhaka/card, /explore, /profile)
  useEffect(() => {
    async function resolveDynamicRoute() {
      if (typeof window === "undefined") return

      const params = new URLSearchParams(window.location.search)
      const paramM = params.get("m") || params.get("merchantId")

      const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, "").trim()
      let segments = rawPath.split("/").filter(Boolean)

      if (rawPath.toLowerCase() === "ops" || params.get("view") === "ops") {
        setView("ops")
        return
      }

      // Check if first segment is a 7-digit user phone tag (e.g. /8174204/...) or /u_...
      if (segments.length > 0 && (/^\d{7}$/.test(segments[0]) || /^u_?\d+$/i.test(segments[0]))) {
        segments = segments.slice(1)
      }

      // Root paths or standard top-level customer tabs
      const topLevelTabs = ["home", "explore", "scan", "rewards", "profile"]
      if (segments.length === 1 && topLevelTabs.includes(segments[0].toLowerCase())) {
        setTargetSubpage(segments[0].toLowerCase())
        if (!paramM) return
      }

      // Ignore technical reserved paths
      const reservedPaths = ["", "api", "landing", "login", "register", "ops", "admin"]
      const candidate = paramM || (segments.length > 0 && !reservedPaths.includes(segments[0].toLowerCase()) ? segments[0] : null)

      // Subpage after company slug (e.g. /cafedhaka/settings -> subpage is "settings")
      if (segments.length > 1) {
        setTargetSubpage(segments[1].toLowerCase())
      } else if (segments.length === 1 && !topLevelTabs.includes(segments[0].toLowerCase())) {
        // e.g. /cafedhaka -> default to card page
        setTargetSubpage("card")
      }

      if (!candidate) return

      try {
        // Direct ID check
        if (candidate.startsWith("m_") || candidate.startsWith("m1")) {
          setTargetMerchantId(candidate)
          return
        }

        // Search in local merchants API
        const merchants = await api.getMerchants().catch(() => [])
        const cleanCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, "")

        const matched = merchants.find((m: Merchant) => {
          if (m.id === candidate) return true
          const slug = generateMerchantSlug(m).toLowerCase().replace(/[^a-z0-9]/g, "")
          if (slug === cleanCandidate) return true
          const en = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          if (en === cleanCandidate) return true
          const bn = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          if (bn === cleanCandidate) return true
          return false
        })

        if (matched) {
          setTargetMerchantId(matched.id)
          setTargetMerchantName(matched.name)
          return
        }

        // Fallback search in Cloud Firestore
        const fbMerchants = await firebaseService.getMerchants().catch(() => [])
        const fbMatched = fbMerchants.find((m: any) => {
          if (m.id === candidate) return true
          const slug = generateMerchantSlug(m).toLowerCase().replace(/[^a-z0-9]/g, "")
          if (slug === cleanCandidate) return true
          const en = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          if (en === cleanCandidate) return true
          const bn = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          if (bn === cleanCandidate) return true
          return false
        })

        if (fbMatched) {
          setTargetMerchantId(fbMatched.id)
          setTargetMerchantName(fbMatched.name)
        } else {
          setTargetMerchantId(candidate)
        }
      } catch (err) {
        console.warn("Could not resolve dynamic route:", err)
        setTargetMerchantId(candidate)
      }
    }

    resolveDynamicRoute()
  }, [])

  // 2. Authentication Gate:
  // - If user has logged in from this device, launch their app directly.
  // - If not logged in, ALWAYS show Landing (Login / Registration) first.
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("view") === "ops" || window.location.pathname.toLowerCase().includes("/ops")) {
        return "ops"
      }
    }
    const saved = typeof window !== "undefined" ? localStorage.getItem("silsila_profile") : null
    if (saved) {
      try {
        const p = JSON.parse(saved)
        if (p?.role === "merchant") return p.onboarded ? "merchant" : "merchant-onboarding"
        if (p?.role === "customer") return "customer"
      } catch {}
    }
    return "landing"
  })

  // Sync view when auth profile is modified
  useEffect(() => {
    if (!profile && view !== "ops") {
      setView("landing")
    }
  }, [profile])

  const handleLogoutAndReturn = async () => {
    await logout()
    setView("landing")
  }

  if (view === "customer") {
    return (
      <CustomerApp
        onBack={handleLogoutAndReturn}
        initialMerchantId={targetMerchantId}
        initialSubpage={targetSubpage}
      />
    )
  }

  if (view === "merchant-onboarding") {
    return (
      <OnboardingWizard
        onComplete={(merchantId) => {
          updateSessionProfile({ merchantId, onboarded: true })
          setView("merchant")
        }}
      />
    )
  }

  if (view === "merchant") {
    return (
      <MerchantApp
        onBack={handleLogoutAndReturn}
        initialMerchantId={targetMerchantId}
        initialSubpage={targetSubpage}
      />
    )
  }

  if (view === "ops") {
    return <OpsConsole onBack={handleLogoutAndReturn} />
  }

  return (
    <Landing
      targetMerchantName={targetMerchantName}
      onEnter={(role, opts) => {
        if (role === "customer") setView("customer")
        else if (role === "merchant") setView(opts?.needsOnboarding ? "merchant-onboarding" : "merchant")
        else if (role === "ops") setView("ops")
      }}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}
