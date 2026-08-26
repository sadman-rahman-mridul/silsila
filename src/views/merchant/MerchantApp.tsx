import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import MerchantDashboard from "./MerchantDashboard"
import CustomersPage from "./CustomersPage"
import RewardsManager from "./RewardsManager"
import MarketingPage from "./MarketingPage"
import MerchantSettings from "./MerchantSettings"
import AnalyticsPage from "./AnalyticsPage"
import StaffMode from "./StaffMode"
import { ChartIcon, UsersIcon, StarIcon, MegaphoneIcon, SettingsIcon, LogOutIcon, BarChartIcon, AnalyticsIcon, LockIcon, ChevronLeftIcon, GlobeIcon } from "../../components/Icons"
import { type Merchant } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"

type MerchantTab = "home" | "customers" | "rewards" | "marketing" | "settings"

interface MerchantAppProps {
  onBack?: () => void
  initialTab?: "home" | "customers" | "rewards" | "marketing" | "settings" | "analytics" | "staff"
}

export default function MerchantApp({ onBack, initialTab }: MerchantAppProps) {
  const { profile, logout } = useAuth()
  const { isBn, toggleLanguage } = useLanguage()
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

  return (
    <div className="flex flex-col h-full min-h-[100dvh] bg-transparent w-full max-w-md mx-auto relative overflow-hidden">
      {/* Luxury Glassmorphic Static Top Header */}
      <div
        className="flex-shrink-0 bg-[#092015]/80 backdrop-blur-2xl px-3.5 pb-2.5 flex items-center justify-between border-b border-emerald-500/20 shadow-2xl z-20"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top, 10px))" }}
      >
        <button
          onClick={() => handleTabChange("home")}
          className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-opacity active:scale-95 text-left"
          title={isBn ? "হোম ড্যাশবোর্ড" : "Home Dashboard"}
        >
          {activeMerchant?.logoUrl ? (
            <img src={activeMerchant.logoUrl} alt="Logo" className="w-7 h-7 rounded-xl object-cover border border-white/20 shadow-md" />
          ) : (
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-md border border-white/15"
              style={{
                backgroundColor: activeMerchant?.logoBg || "#0D3824",
                color: activeMerchant?.logoColor || "#34D399",
              }}
            >
              {activeMerchant?.logoInitials || (isBn ? "সি" : "S")}
            </div>
          )}
          <span className="text-white font-bold text-sm group-hover:text-[#34D399] transition-colors truncate max-w-[110px] sm:max-w-[130px] drop-shadow-xs">
            {(!isBn && activeMerchant?.nameEn) ? activeMerchant.nameEn : (activeMerchant?.name || (isBn ? "সিলসিলা" : "Sealsela"))}
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md border border-white/15 flex items-center gap-1 active:scale-95 shadow-sm"
            title={isBn ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
          >
            <GlobeIcon size={12} className="text-[#34D399]" />
            <span className="font-mono text-[10px] font-black uppercase text-[#34D399]">{isBn ? "EN" : "বাং"}</span>
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
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95 text-xs font-bold backdrop-blur-md shadow-sm border ${
              showAnalytics
                ? "bg-[#34D399] text-[#0A2318] border-[#34D399] shadow-lg glow-emerald"
                : "bg-white/10 hover:bg-white/20 text-white border-white/15"
            }`}
          >
            <AnalyticsIcon size={12} className={showAnalytics ? "text-[#0A2318]" : "text-[#34D399]"} />
            <span className="text-[10px] font-bold">{isBn ? "অ্যানালিটিক্স" : "Analytics"}</span>
          </button>

          <button
            onClick={() => setShowStaffMode(true)}
            title={isBn ? "স্টাফ মোড চালু করুন" : "Enter Staff Mode"}
            className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95 text-xs font-bold backdrop-blur-md shadow-sm"
          >
            <LockIcon size={12} className="text-[#F59E0B]" />
            <span className="text-[10px]">{isBn ? "স্টাফ" : "Staff"}</span>
          </button>

          <button
            onClick={handleLogout}
            title={isBn ? "লগ আউট করুন" : "Log Out"}
            className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 transition-all cursor-pointer text-xs backdrop-blur-md shadow-sm"
          >
            <LogOutIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Central Scrollable Body */}
      <div className="flex-1 overflow-hidden relative w-full">
        <div className="absolute inset-0 overflow-y-auto">
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

      <nav
        className="flex-shrink-0 bg-[#092015]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl z-20 pb-safe w-full"
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
        <span className={`transition-colors ${active ? "text-[#34D399] drop-shadow-sm" : "text-white/40 group-hover:text-white/70"}`}>{icon}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-[#F59E0B] text-[#0A2318] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-1 font-semibold transition-colors ${active ? "text-[#34D399]" : "text-white/40 group-hover:text-white/70"}`}>
        {label}
      </span>
    </button>
  )
}
