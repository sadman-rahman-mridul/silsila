import { useState, useEffect } from "react"
import Landing from "./views/Landing"
import CustomerApp from "./views/customer/CustomerApp"
import MerchantApp from "./views/merchant/MerchantApp"
import OnboardingWizard from "./views/merchant/OnboardingWizard"
import OpsConsole from "./views/ops/OpsConsole"
import { AuthProvider, useAuth } from "./context/AuthContext"

type AppView = "landing" | "customer" | "merchant" | "merchant-onboarding" | "ops"

function MainContent() {
  const { updateSessionProfile, logout } = useAuth()
  const [view, setView] = useState<AppView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      // A scanned counter QR always lands in the customer app.
      if (params.has("m") || params.has("merchantId")) return "customer"
      if (params.get("view") === "ops" || window.location.pathname.toLowerCase().includes("/ops")) {
        return "ops"
      }
    }
    return "landing"
  })

  const handleLogoutAndReturn = async () => {
    await logout()
    setView("landing")
  }

  if (view === "customer") {
    return <CustomerApp onBack={handleLogoutAndReturn} />
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
    return <MerchantApp onBack={handleLogoutAndReturn} />
  }

  if (view === "ops") {
    return <OpsConsole onBack={handleLogoutAndReturn} />
  }

  return (
    <Landing
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
