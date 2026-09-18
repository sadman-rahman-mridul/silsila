import React, { Component, type ErrorInfo, type ReactNode } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import Landing from "./views/Landing"
import MarketingLanding from "./views/landing/MarketingLanding"
import CustomerApp from "./views/customer/CustomerApp"
import CardDetail from "./views/customer/CardDetail"
import MerchantApp from "./views/merchant/MerchantApp"
import OnboardingWizard from "./views/merchant/OnboardingWizard"
import OpsConsole from "./views/ops/OpsConsole"
import AdminDashboard from "./views/admin/AdminDashboard"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { LanguageProvider, useLanguage } from "./context/LanguageContext"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import CustomerBottomNav from "./components/CustomerBottomNav"

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
    "customer",
    "favicon.ico",
  ]

  if (!slug || reserved.includes(slug.toLowerCase())) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white w-full relative overflow-hidden transition-colors">
      <div className="flex-1 overflow-hidden relative w-full">
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
            onRequireAuth={() => {
              navigate(`/login?redirect=/${encodeURIComponent(slug)}&role=customer`)
            }}
          />
        </div>
      </div>

      {/* Unified Bottom Navigation across all pages */}
      {profile?.role === "customer" ? (
        <CustomerBottomNav
          activeTab={null}
          onTabChange={(tab) => navigate(`/${tab}`)}
        />
      ) : (
        <nav className="flex-shrink-0 bg-white/95 dark:bg-[#092015]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-3 pb-safe shadow-lg dark:shadow-2xl z-20 w-full transition-colors">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F59E0B] flex items-center justify-center font-black text-sm text-[#0A2318] shadow-sm">
                🔖
              </div>
              <p className="text-[#0F172A] dark:text-white text-xs sm:text-sm font-bold leading-tight">
                {isBn ? "সিল সংগ্রহ ও ডিসকাউন্ট পেতে লগইন করুন" : "Sign in to earn stamps & redeem rewards"}
              </p>
            </div>
            <button
              onClick={() => navigate(`/login?redirect=/${encodeURIComponent(slug)}&role=customer`)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#F59E0B] text-[#0A2318] font-display font-black text-xs sm:text-sm shadow-lg glow-amber cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "লগইন / যুক্ত হন" : "Sign In / Join"}
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

function LandingRoute({ forcedRole }: { forcedRole?: "customer" | "merchant" | "ops" }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get("redirect")
  const roleParam = searchParams.get("role") as "customer" | "merchant" | "ops" | null
  const initialRole = forcedRole || roleParam || (redirect ? "customer" : undefined)

  // Only auto-redirect if current profile matches the requested role
  const targetRole = forcedRole || roleParam
  if (profile && (!targetRole || profile.role === targetRole)) {
    if (redirect && redirect.startsWith("/")) {
      return <Navigate to={redirect} replace />
    }
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
      key={`${initialRole || "choose"}_${redirect || ""}`}
      initialRole={initialRole}
      redirectPath={redirect || undefined}
      onRoleSelect={(selectedRole) => {
        if (selectedRole === "customer") {
          navigate(redirect ? `/customer?redirect=${encodeURIComponent(redirect)}` : "/customer")
        } else if (selectedRole === "merchant") {
          navigate("/merchant")
        } else if (selectedRole === "ops") {
          navigate("/ops")
        }
      }}
      onBackToChoose={() => {
        navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login")
      }}
      onBackToHome={() => {
        navigate("/")
      }}
      onEnter={(role, opts) => {
        if (redirect && redirect.startsWith("/")) {
          navigate(redirect)
          return
        }
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
        navigate("/login")
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
      {/* Root Marketing Landing Page */}
      <Route path="/" element={<MarketingLanding />} />

      {/* Auth / Login Route (Choose User Type) */}
      <Route path="/login" element={<LandingRoute />} />

      {/* Customer Login / Landing Route */}
      <Route path="/customer" element={<LandingRoute forcedRole="customer" />} />

      {/* Customer Routes */}
      <Route path="/home" element={<CustomerApp initialTab="home" />} />
      <Route path="/explore" element={<CustomerApp initialTab="explore" />} />
      <Route path="/scan" element={<CustomerApp initialTab="scan" />} />
      <Route path="/rewards" element={<CustomerApp initialTab="rewards" />} />
      <Route path="/profile" element={<CustomerApp initialTab="profile" />} />

      {/* Merchant Login / Landing Route */}
      <Route path="/merchant" element={<LandingRoute forcedRole="merchant" />} />

      {/* Merchant Routes */}
      <Route path="/merchant/onboarding" element={<OnboardingRoute />} />
      <Route path="/merchant/dashboard" element={<MerchantApp initialTab="home" />} />
      <Route path="/merchant/customers" element={<MerchantApp initialTab="customers" />} />
      <Route path="/merchant/rewards" element={<MerchantApp initialTab="rewards" />} />
      <Route path="/merchant/marketing" element={<MerchantApp initialTab="marketing" />} />
      <Route path="/merchant/settings" element={<MerchantApp initialTab="settings" />} />
      <Route path="/merchant/analytics" element={<MerchantApp initialTab="analytics" />} />
      <Route path="/merchant/staff" element={<MerchantApp initialTab="staff" />} />

      {/* Admin Dashboard (Hidden Route) */}
      <Route path="/admin" element={<AdminDashboard />} />

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
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
