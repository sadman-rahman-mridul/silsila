import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import MerchantDashboard from "./MerchantDashboard"
import CustomersPage from "./CustomersPage"
import RewardsManager from "./RewardsManager"
import MarketingPage from "./MarketingPage"
import MerchantSettings from "./MerchantSettings"
import AnalyticsPage from "./AnalyticsPage"
import StaffMode from "./StaffMode"
import { ChartIcon, UsersIcon, StarIcon, MegaphoneIcon, SettingsIcon, LogOutIcon, BarChartIcon, AnalyticsIcon, LockIcon, ChevronLeftIcon, GlobeIcon, SunIcon, MoonIcon } from "../../components/Icons"
import { type Merchant } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"

type MerchantTab = "home" | "customers" | "rewards" | "marketing" | "settings"

interface MerchantAppProps {
  onBack?: () => void
  initialTab?: "home" | "customers" | "rewards" | "marketing" | "settings" | "analytics" | "staff"
}

export default function MerchantApp({ onBack, initialTab }: MerchantAppProps) {
  const { profile, logout } = useAuth()
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function getTabStateFromPath() {
    const path = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase()
    if (path === "merchant/staff") return { tab: "home" as MerchantTab, staff: true, analytics: false }
    if (path === "merchant/analytics") return { tab: "home" as MerchantTab, staff: false, analytics: true }
    if (path === "merchant/customers") return { tab: "customers" as MerchantTab, staff: false, analytics: false }
    if (path === "merchant/rewards") return { tab: "rewards" as MerchantTab, staff: false, analytics: false }
    if (path === "merchant/marketing") return { tab: "marketing" as MerchantTab, staff: false, analytics: false }
    if (path === "merchant/settings") return { tab: "settings" as MerchantTab, staff: false, analytics: false }
    return { tab: "home" as MerchantTab, staff: false, analytics: false }
  }

  const [tab, setTab] = useState<MerchantTab>(() => initialTab && initialTab !== "staff" && initialTab !== "analytics" ? initialTab : getTabStateFromPath().tab)
  const [showAnalytics, setShowAnalytics] = useState(() => initialTab === "analytics" || getTabStateFromPath().analytics)
  const [showStaffMode, setShowStaffMode] = useState(() => initialTab === "staff" || getTabStateFromPath().staff)

  // Use profile to determine merchantId
  const [merchantId, setMerchantId] = useState<string>(
    () => profile?.merchantId || profile?.id || ""
  )
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0)
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null)

  useEffect(() => {
    const state = getTabStateFromPath()
    setTab(state.tab)
    setShowStaffMode(state.staff)
    setShowAnalytics(state.analytics)
  }, [location.pathname])

  useEffect(() => {
    if (!merchantId) return

    // Real-time Firestore onSnapshot for approvals badge
    const unsubscribeApprovals = firebaseService.subscribePendingApprovals(merchantId, (approvals) => {
      if (approvals) setPendingApprovalsCount(approvals.length)
    })

    // Live merchant document for header display
    const unsubscribeMerchant = firebaseService.subscribeMerchant(merchantId, (m) => {
      if (m) {
        setActiveMerchant(m)
      }
    })

    return () => {
      if (typeof unsubscribeApprovals === "function") unsubscribeApprovals()
      if (typeof unsubscribeMerchant === "function") unsubscribeMerchant()
    }
  }, [merchantId])

  // Keep merchantId in sync if profile updates
  useEffect(() => {
    const id = profile?.merchantId || profile?.id || ""
    if (id && id !== merchantId) setMerchantId(id)
  }, [profile?.merchantId, profile?.id])

  function handleTabChange(nextTab: MerchantTab) {
    setTab(nextTab)
    setShowAnalytics(false)
    setShowStaffMode(false)
    navigate(`/merchant/${nextTab === "home" ? "dashboard" : nextTab}`)
  }

  function handleOpenStaff() {
    setShowStaffMode(true)
    setShowAnalytics(false)
    navigate("/merchant/staff")
  }

  function handleOpenAnalytics() {
    setShowAnalytics(true)
    setShowStaffMode(false)
    navigate("/merchant/analytics")
  }

  function handleExitSpecialMode() {
    setShowStaffMode(false)
    setShowAnalytics(false)
    navigate("/merchant/dashboard")
  }

  async function handleLogout() {
    if (onBack) {
      onBack()
    } else {
      await logout()
      navigate("/")
    }
  }

  if (showStaffMode) {
    return <StaffMode onExit={handleExitSpecialMode} activeMerchantId={merchantId} />
  }

  // Merchant Approval Gate: Block dashboard if pending or rejected
  if (activeMerchant && (activeMerchant.approvalStatus === "pending_approval" || (activeMerchant.status === "pending" && activeMerchant.approvalStatus !== "approved"))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white p-6 text-center">
        <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scale-up">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
            ⏳
          </div>

          <h2 className="font-display font-black text-[#0F172A] dark:text-white text-2xl mb-2">
            {isBn ? "পেমেন্ট ভেরিফিকেশন চলছে" : "Payment Verification Pending"}
          </h2>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 mb-4 text-left">
            <p className="text-[#B45309] dark:text-amber-300 font-bold text-sm leading-relaxed mb-1.5">
              ⚠️ {isBn ? "Payment Verification er por apni shob feature use korte parben!" : "You can use all features after payment verification is completed!"}
            </p>
            <p className="text-slate-600 dark:text-white/70 text-xs leading-relaxed">
              {isBn
                ? "অনুগ্রহ করে সর্বোচ্চ ৬ ঘণ্টা অপেক্ষা করুন। অ্যাডমিন থেকে ভেরিফিকেশন সম্পন্ন হলে আপনার মোবাইলে কনফার্মেশন এসএমএস পাঠানো হবে।"
                : "Please wait up to 6 hours. You will receive an SMS confirmation once our Admin approves your account."}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-black/30 rounded-2xl p-4 text-left space-y-2 mb-6 text-xs text-slate-600 dark:text-white/60">
            <div className="flex justify-between">
              <span>{isBn ? "দোকানের নাম:" : "Business:"}</span>
              <span className="font-bold text-slate-900 dark:text-white">{activeMerchant.name}</span>
            </div>
            <div className="flex justify-between">
              <span>{isBn ? "প্যাকেজ:" : "Package:"}</span>
              <span className="font-bold text-[#059669] dark:text-[#34D399]">
                {activeMerchant.paymentPackage === "6_months" ? "6 Months (৳5,000)" : activeMerchant.paymentPackage === "12_months" ? "12 Months (৳8,000)" : "Standard Plan"}
              </span>
            </div>
            {activeMerchant.senderBkashNumber && (
              <div className="flex justify-between">
                <span>{isBn ? "প্রেরক bKash:" : "Sender bKash:"}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{activeMerchant.senderBkashNumber}</span>
              </div>
            )}
            {activeMerchant.trxId && (
              <div className="flex justify-between">
                <span>{isBn ? "Trans ID:" : "Trans ID:"}</span>
                <span className="font-mono font-bold text-[#F59E0B]">{activeMerchant.trxId}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-[#0F172A] dark:text-white font-bold text-sm transition-all cursor-pointer"
          >
            {isBn ? "লগআউট / হোমে ফিরে যান" : "Log Out & Exit"}
          </button>
        </div>
      </div>
    )
  }

  if (activeMerchant && activeMerchant.approvalStatus === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white p-6 text-center">
        <div className="bg-white dark:bg-[#0E281C] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center justify-center text-3xl mx-auto mb-4">
            ✕
          </div>
          <h2 className="font-display font-black text-[#0F172A] dark:text-white text-2xl mb-2">
            {isBn ? "অনুরোধটি বাতিল হয়েছে" : "Verification Rejected"}
          </h2>
          <p className="text-slate-600 dark:text-white/70 text-xs mb-6">
            {isBn
              ? "আপনার প্রদত্ত পেমেন্ট তথ্যে অসঙ্গতি থাকায় ভেরিফিকেশন সম্পন্ন করা যায়নি। সাহায্যের জন্য আমাদের সাপোর্টে যোগাযোগ করুন।"
              : "Your payment verification request could not be approved. Please contact support."}
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#0A2318] font-bold text-sm cursor-pointer"
          >
            {isBn ? "লগআউট" : "Log Out"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-transparent text-[#0F172A] dark:text-white w-full max-w-7xl mx-auto relative overflow-hidden transition-colors">
      {/* Responsive Header */}
      <div
        className="flex-shrink-0 bg-white/90 dark:bg-[#092015]/90 backdrop-blur-2xl px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200 dark:border-emerald-500/20 shadow-sm dark:shadow-2xl z-20 transition-colors"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
      >
        {/* Brand Left */}
        <button
          onClick={() => handleTabChange("home")}
          className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity active:scale-95 text-left"
          title={isBn ? "হোম ড্যাশবোর্ড" : "Home Dashboard"}
        >
          {activeMerchant?.logoUrl ? (
            <img src={activeMerchant.logoUrl} alt="Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-white/20 shadow-md" />
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-white/15 p-1 bg-emerald-50 dark:bg-[#092015]">
              <img src="/sealsela-logo-light.svg" alt="Sealsela" className="w-full h-full object-contain block dark:hidden" />
              <img src="/sealsela-logo-dark.svg" alt="Sealsela" className="w-full h-full object-contain hidden dark:block" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[#0F172A] dark:text-white font-display font-black text-sm sm:text-base group-hover:text-[#059669] dark:group-hover:text-[#34D399] transition-colors truncate max-w-[130px] sm:max-w-[200px] drop-shadow-xs">
              {(!isBn && activeMerchant?.nameEn) ? activeMerchant.nameEn : (activeMerchant?.name || "Sealsela")}
            </span>
            <span className="text-[10px] text-[#059669] dark:text-[#34D399] font-mono font-bold hidden sm:block">
              Merchant Console
            </span>
          </div>
        </button>

        {/* Desktop Navigation Tabs (Visible on tablet & desktop) */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-[#071D13]/80 p-1 rounded-2xl border border-slate-200 dark:border-white/10 transition-colors">
          <button
            onClick={() => handleTabChange("home")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !showAnalytics && tab === "home"
                ? "bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#071D13] shadow-md font-black"
                : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <ChartIcon size={16} />
            <span>{isBn ? "হোম" : "Home"}</span>
            {pendingApprovalsCount > 0 && (
              <span className="bg-[#F59E0B] text-[#0A2318] text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange("customers")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !showAnalytics && tab === "customers"
                ? "bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#071D13] shadow-md font-black"
                : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <UsersIcon size={16} />
            <span>{isBn ? "কাস্টমার" : "Customers"}</span>
          </button>

          <button
            onClick={() => handleTabChange("rewards")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !showAnalytics && tab === "rewards"
                ? "bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#071D13] shadow-md font-black"
                : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <StarIcon size={16} />
            <span>{isBn ? "রিওয়ার্ড" : "Rewards"}</span>
          </button>

          <button
            onClick={() => handleTabChange("marketing")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !showAnalytics && tab === "marketing"
                ? "bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#071D13] shadow-md font-black"
                : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <MegaphoneIcon size={16} />
            <span>{isBn ? "মার্কেটিং" : "Marketing"}</span>
          </button>

          <button
            onClick={() => handleTabChange("settings")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !showAnalytics && tab === "settings"
                ? "bg-[#059669] dark:bg-[#10B981] text-white dark:text-[#071D13] shadow-md font-black"
                : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
            }`}
          >
            <SettingsIcon size={16} />
            <span>{isBn ? "সেটিংস" : "Settings"}</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-[#0F172A] dark:text-[#34D399] hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer border border-slate-200 dark:border-white/15 active:scale-95 shadow-sm"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <SunIcon size={14} className="text-[#F59E0B]" /> : <MoonIcon size={14} className="text-[#064E3B]" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-[#0F172A] dark:text-white text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer border border-slate-200 dark:border-white/15 flex items-center gap-1 active:scale-95 shadow-sm"
            title={isBn ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <GlobeIcon size={13} className="text-[#059669] dark:text-[#34D399]" />
            <span className="font-mono text-[10px] font-black uppercase text-[#059669] dark:text-[#34D399]">{isBn ? "EN" : "বাং"}</span>
          </button>
          
          <button
            onClick={() => {
              if (showAnalytics) {
                handleTabChange("home")
              } else {
                handleOpenAnalytics()
              }
            }}
            title={isBn ? "অ্যানালিটিক্স রিপোর্ট" : "Analytics Report"}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs font-bold shadow-sm border ${
              showAnalytics
                ? "bg-[#059669] dark:bg-[#34D399] text-white dark:text-[#0A2318] border-[#059669] dark:border-[#34D399] shadow-lg glow-emerald"
                : "bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-[#0F172A] dark:text-white border-slate-200 dark:border-white/15"
            }`}
          >
            <AnalyticsIcon size={13} className={showAnalytics ? "text-white dark:text-[#0A2318]" : "text-[#059669] dark:text-[#34D399]"} />
            <span className="text-[11px] font-bold hidden sm:inline">{isBn ? "অ্যানালিটিক্স" : "Analytics"}</span>
          </button>

          <button
            onClick={() => setShowStaffMode(true)}
            title={isBn ? "স্টাফ মোড চালু করুন" : "Enter Staff Mode"}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 hover:bg-amber-500/25 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs font-bold shadow-sm"
          >
            <LockIcon size={13} className="text-[#D97706] dark:text-[#F59E0B]" />
            <span className="text-[11px]">{isBn ? "স্টাফ মোড" : "Staff"}</span>
          </button>

          <button
            onClick={handleLogout}
            title={isBn ? "লগ আউট করুন" : "Log Out"}
            className="p-2 rounded-xl bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-white border border-red-500/30 transition-all cursor-pointer text-xs shadow-sm ml-1"
          >
            <LogOutIcon size={14} />
          </button>
        </div>
      </div>

      {/* Main Central Scrollable Body */}
      <div className="flex-1 overflow-hidden relative w-full">
        <div className="absolute inset-0 overflow-y-auto px-2 sm:px-4 lg:px-6 py-3">
          {showAnalytics ? (
            <AnalyticsPage activeMerchantId={merchantId} />
          ) : (
            <>
              {tab === "home" && (
                <MerchantDashboard
                  merchantId={merchantId}
                  onMerchantChange={(id) => {
                    setMerchantId(id)
                  }}
                  onViewCustomers={() => handleTabChange("customers")}
                  onOpenSettings={() => handleTabChange("settings")}
                  onLogout={onBack}
                />
              )}
              {tab === "customers" && <CustomersPage merchantId={merchantId} />}
              {tab === "rewards" && (
                <RewardsManager
                  merchantId={merchantId}
                  merchantName={activeMerchant?.name || ""}
                />
              )}
              {tab === "marketing" && <MarketingPage merchantId={merchantId} />}
              {tab === "settings" && (
                <MerchantSettings
                  onBack={onBack}
                  onLogout={handleLogout}
                  activeMerchantId={merchantId}
                  onMerchantUpdated={(updated) => {
                    setActiveMerchant(updated)
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile-only Bottom Navigation Bar */}
      <nav
        className="md:hidden flex-shrink-0 bg-white/95 dark:bg-[#092015]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl z-20 pb-safe w-full transition-colors"
      >
        <div className="flex items-center justify-around py-1">
          <MerchantNavBtn
            icon={<ChartIcon size={22} />}
            label={isBn ? "হোম" : "Home"}
            active={!showAnalytics && tab === "home"}
            badge={pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined}
            onClick={() => handleTabChange("home")}
          />
          <MerchantNavBtn
            icon={<UsersIcon size={22} />}
            label={isBn ? "কাস্টমার" : "Customers"}
            active={!showAnalytics && tab === "customers"}
            onClick={() => handleTabChange("customers")}
          />
          <MerchantNavBtn
            icon={<StarIcon size={22} />}
            label={isBn ? "রিওয়ার্ড" : "Rewards"}
            active={!showAnalytics && tab === "rewards"}
            onClick={() => handleTabChange("rewards")}
          />
          <MerchantNavBtn
            icon={<MegaphoneIcon size={22} />}
            label={isBn ? "মার্কেটিং" : "Marketing"}
            active={!showAnalytics && tab === "marketing"}
            onClick={() => handleTabChange("marketing")}
          />
          <MerchantNavBtn
            icon={<SettingsIcon size={22} />}
            label={isBn ? "সেটিংস" : "Settings"}
            active={!showAnalytics && tab === "settings"}
            onClick={() => handleTabChange("settings")}
          />
        </div>
      </nav>
    </div>
  )
}

function MerchantNavBtn({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center pt-2.5 pb-1 px-2 relative min-w-[3.5rem] cursor-pointer group active:scale-95 transition-all"
    >
      <div className="relative">
        <span className={`transition-colors ${active ? "text-[#059669] dark:text-[#34D399] drop-shadow-sm" : "text-slate-400 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/70"}`}>{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-[#F59E0B] text-[#0A2318] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-1 font-semibold transition-colors ${active ? "text-[#059669] dark:text-[#34D399]" : "text-slate-400 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/70"}`}>
        {label}
      </span>
    </button>
  )
}
