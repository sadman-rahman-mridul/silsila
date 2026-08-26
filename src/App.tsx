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
import { LanguageProvider, useLanguage } from "./context/LanguageContext"
import {
  HomeIcon,
  CompassIcon,
  ScanIcon,
  GiftIcon,
  UserIcon,
} from "./components/Icons"

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#071D13] text-white p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-3xl mb-4 shadow-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">কিছু সমস্যা হয়েছে (An error occurred)</h2>
          <p className="text-white/60 text-sm max-w-sm mb-6">
            {this.state.error?.message || "অ্যাপটি লোড করার সময় একটি অপ্রত্যাশিত ত্রুটি হয়েছে।"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = "/"
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-white font-bold text-sm shadow-lg glow-emerald cursor-pointer active:scale-95 transition-all"
          >
            হোমে ফিরে যান (Reload Home)
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PublicMerchantRoute() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isBn } = useLanguage()

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
    <div className="flex flex-col h-full min-h-[100dvh] bg-[#071D13] bg-[radial-gradient(120%_80%_at_50%_0%,#165B3B_0%,#0D3824_45%,#061910_100%)] text-white max-w-md mx-auto relative overflow-hidden">
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

      {/* Static Bottom Navigation (Facebook style) */}
      {profile?.role === "customer" ? (
        <nav
          className="flex-shrink-0 bg-[#092015]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe shadow-2xl z-20"
          style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))" }}
        >
          <div className="flex items-center justify-around">
            <button
              onClick={() => navigate("/home")}
              className="flex flex-col items-center py-2 px-3 text-[#52B788] hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <HomeIcon size={22} />
              <span className="text-[10px] mt-1 font-medium">{isBn ? "হোম" : "Home"}</span>
            </button>

            <button
              onClick={() => navigate("/explore")}
              className="flex flex-col items-center py-2 px-3 text-[#52B788] hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <CompassIcon size={22} />
              <span className="text-[10px] mt-1 font-medium">{isBn ? "খুঁজুন" : "Explore"}</span>
            </button>

            <button
              onClick={() => navigate("/scan")}
              className="flex flex-col items-center -mt-5 relative cursor-pointer active:scale-95 transition-transform group"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all bg-gradient-to-br from-[#10B981] to-[#047857] glow-emerald border border-white/20">
                <ScanIcon size={24} className="text-[#071D13]" />
              </div>
              <span className="text-[10px] mt-1 font-bold text-[#52B788]">{isBn ? "স্ক্যান" : "Scan"}</span>
            </button>

            <button
              onClick={() => navigate("/rewards")}
              className="flex flex-col items-center py-2 px-3 text-[#52B788] hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <GiftIcon size={22} />
              <span className="text-[10px] mt-1 font-medium">{isBn ? "পুরস্কার" : "Rewards"}</span>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="flex flex-col items-center py-2 px-3 text-[#52B788] hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              {profile?.avatarUrl || profile?.photoURL ? (
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/40">
                  <img
                    src={profile?.avatarUrl || profile?.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <UserIcon size={22} />
              )}
              <span className="text-[10px] mt-1 font-medium">{isBn ? "প্রোফাইল" : "Profile"}</span>
            </button>
          </div>
        </nav>
      ) : (
        <div
          className="flex-shrink-0 bg-[#092015]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-safe shadow-2xl z-20 flex items-center justify-between gap-3"
          style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom, 10px))" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B] flex items-center justify-center font-black text-xs text-[#0A2318]">
              🔖
            </div>
            <p className="text-white text-xs font-bold leading-tight">
              {isBn ? "সিল সংগ্রহ করতে লগইন করুন" : "Sign in to earn stamps"}
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl bg-[#F59E0B] text-[#0A2318] font-display font-black text-xs shadow-lg glow-amber cursor-pointer active:scale-95 transition-all"
          >
            {isBn ? "লগইন / যুক্ত হন" : "Sign In / Join"}
          </button>
        </div>
      )}
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
      <Route path="/:slug" element={<PublicMerchantRoute />} />

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
