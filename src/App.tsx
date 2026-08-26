import React, { Component, type ErrorInfo, type ReactNode } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom"
import Landing from "./views/Landing"
import CustomerApp from "./views/customer/CustomerApp"
import CardDetail from "./views/customer/CardDetail"
import MerchantApp from "./views/merchant/MerchantApp"
import OnboardingWizard from "./views/merchant/OnboardingWizard"
import OpsConsole from "./views/ops/OpsConsole"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { LanguageProvider } from "./context/LanguageContext"

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

// Wrapper for Dynamic Merchant Slugs (e.g. /cafeb, /crimson-cup)
function DynamicMerchantSlugRoute() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const reserved = [
    "api",
    "ops",
    "landing",
    "login",
    "register",
    "admin",
    "home",
    "explore",
    "scan",
    "rewards",
    "profile",
    "merchant",
    "favicon.ico",
  ]

  if (!slug || reserved.includes(slug.toLowerCase())) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0] max-w-md mx-auto relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          <CardDetail
            merchantId={slug}
            onBack={() => {
              if (profile?.role === "customer") {
                navigate("/home")
              } else {
                navigate("/")
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

function LandingRoute() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  if (profile) {
    if (profile.role === "customer") {
      return <Navigate to="/home" replace />
    }
    if (profile.role === "merchant") {
      return (
        <Navigate
          to={profile.onboarded ? "/merchant/dashboard" : "/merchant/onboarding"}
          replace
        />
      )
    }
    if (profile.role === "ops") {
      return <Navigate to="/ops" replace />
    }
  }

  return (
    <Landing
      onEnter={(role, opts) => {
        if (role === "customer") navigate("/home")
        else if (role === "merchant")
          navigate(opts?.needsOnboarding ? "/merchant/onboarding" : "/merchant/dashboard")
        else if (role === "ops") navigate("/ops")
      }}
    />
  )
}

function OnboardingRoute() {
  const { updateSessionProfile, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <OnboardingWizard
      onBack={async () => {
        await logout()
        navigate("/")
      }}
      onComplete={(merchantId) => {
        updateSessionProfile({ merchantId, onboarded: true })
        navigate("/merchant/dashboard")
      }}
    />
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root Landing */}
      <Route path="/" element={<LandingRoute />} />

      {/* Customer Routes */}
      <Route path="/home" element={<CustomerApp initialTab="home" />} />
      <Route path="/explore" element={<CustomerApp initialTab="explore" />} />
      <Route path="/scan" element={<CustomerApp initialTab="scan" />} />
      <Route path="/rewards" element={<CustomerApp initialTab="rewards" />} />
      <Route path="/profile" element={<CustomerApp initialTab="profile" />} />

      {/* Merchant Routes */}
      <Route path="/merchant/onboarding" element={<OnboardingRoute />} />
      <Route path="/merchant" element={<Navigate to="/merchant/dashboard" replace />} />
      <Route path="/merchant/dashboard" element={<MerchantApp initialTab="home" />} />
      <Route path="/merchant/customers" element={<MerchantApp initialTab="customers" />} />
      <Route path="/merchant/rewards" element={<MerchantApp initialTab="rewards" />} />
      <Route path="/merchant/marketing" element={<MerchantApp initialTab="marketing" />} />
      <Route path="/merchant/settings" element={<MerchantApp initialTab="settings" />} />
      <Route path="/merchant/analytics" element={<MerchantApp initialTab="analytics" />} />
      <Route path="/merchant/staff" element={<MerchantApp initialTab="staff" />} />

      {/* Ops Route */}
      <Route
        path="/ops"
        element={
          <OpsConsole
            onBack={() => {
              window.location.href = "/"
            }}
          />
        }
      />

      {/* Dynamic Merchant Slugs (e.g. /cafeb, /north-end, etc.) */}
      <Route path="/:slug" element={<DynamicMerchantSlugRoute />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}
