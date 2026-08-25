import React, { Component, useState, useEffect, type ErrorInfo, type ReactNode } from "react"
import Landing from "./views/Landing"
import CustomerApp from "./views/customer/CustomerApp"
import MerchantApp from "./views/merchant/MerchantApp"
import OnboardingWizard from "./views/merchant/OnboardingWizard"
import OpsConsole from "./views/ops/OpsConsole"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { LanguageProvider } from "./context/LanguageContext"

type AppView = "landing" | "customer" | "merchant" | "merchant-onboarding" | "ops"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-full items-center justify-center bg-[#F7F5F0] p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center text-3xl mb-4 shadow-inner">
            ⚠️
          </div>
          <h2 className="font-display font-bold text-[#1A1916] text-lg mb-1">
            কিছু সমস্যা হয়েছে (An error occurred)
          </h2>
          <p className="text-[#6B6158] text-xs mb-6 max-w-xs leading-relaxed">
            {this.state.error?.message || "পেজটি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"}
          </p>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => {
                window.location.href = "/"
              }}
              className="flex-1 py-3 bg-[#1B4332] text-white font-bold text-xs rounded-xl hover:bg-[#2D6A4F] transition-all cursor-pointer shadow-md"
            >
              হোমে ফিরে যান
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 bg-[#E9E5DC] text-[#1A1916] font-bold text-xs rounded-xl hover:bg-[#DCD7CD] transition-all cursor-pointer"
            >
              🔄 রিলোড
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function getScannedMerchant() {
  if (typeof window === "undefined") return null
  const params = new URLSearchParams(window.location.search)
  const mParam = params.get("m") || params.get("merchantId")
  if (mParam) return mParam.trim()

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "").trim()
  if (!path) return null
  const firstSegment = path.split("/")[0].toLowerCase().trim()
  const reserved = ["api", "ops", "landing", "login", "register", "admin", "null", "undefined", "favicon.ico"]
  if (!reserved.includes(firstSegment)) {
    return firstSegment
  }
  return null
}

function MainContent() {
  const { profile, updateSessionProfile, logout } = useAuth()
  const [scannedMerchant, setScannedMerchant] = useState<string | null>(getScannedMerchant)

  useEffect(() => {
    function handlePop() {
      setScannedMerchant(getScannedMerchant())
    }
    window.addEventListener("popstate", handlePop)
    return () => window.removeEventListener("popstate", handlePop)
  }, [])

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
    if (!profile) {
      if (view !== "ops") setView("landing")
    } else {
      if (profile.role === "customer") {
        setView("customer")
      } else if (profile.role === "merchant") {
        setView(profile.onboarded ? "merchant" : "merchant-onboarding")
      }
    }
  }, [profile])

  const handleLogoutAndReturn = async () => {
    await logout()
    setView("landing")
  }

  if (view === "customer") {
    return <CustomerApp onBack={handleLogoutAndReturn} initialMerchantId={scannedMerchant} />
  }

  if (view === "merchant-onboarding") {
    return (
      <OnboardingWizard
        onBack={handleLogoutAndReturn}
        onComplete={(merchantId) => {
          updateSessionProfile({ merchantId, onboarded: true })
          setView("merchant")
        }}
      />
    )
  }

  if (view === "merchant") {
    return <MerchantApp onBack={handleLogoutAndReturn} />
  }

  if (view === "ops") {
    return <OpsConsole onBack={handleLogoutAndReturn} />
  }

  return (
    <Landing
      initialMerchantSlug={scannedMerchant}
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
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <MainContent />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}
