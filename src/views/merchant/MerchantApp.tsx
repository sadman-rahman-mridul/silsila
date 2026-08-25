import { useState, useEffect } from "react"
import MerchantDashboard from "./MerchantDashboard"
import CustomersPage from "./CustomersPage"
import RewardsManager from "./RewardsManager"
import MarketingPage from "./MarketingPage"
import MerchantSettings from "./MerchantSettings"
import AnalyticsPage from "./AnalyticsPage"
import StaffMode from "./StaffMode"
import { ChartIcon, UsersIcon, StarIcon, MegaphoneIcon, SettingsIcon, LogOutIcon } from "../../components/Icons"
import { type Merchant } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useAuth } from "../../context/AuthContext"

type MerchantTab = "home" | "customers" | "rewards" | "marketing" | "settings"

interface MerchantAppProps {
  onBack: () => void
}

export default function MerchantApp({ onBack }: MerchantAppProps) {
  const { profile } = useAuth()
  const [tab, setTab] = useState<MerchantTab>("home")
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showStaffMode, setShowStaffMode] = useState(false)

  // Use profile to determine merchantId
  const [merchantId, setMerchantId] = useState<string>(
    () => profile?.merchantId || profile?.id || ""
  )
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0)
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null)

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
  }

  function handleOpenStaff() {
    setShowStaffMode(true)
    setShowAnalytics(false)
  }

  function handleOpenAnalytics() {
    setShowAnalytics(true)
    setShowStaffMode(false)
  }

  function handleExitSpecialMode() {
    setShowStaffMode(false)
    setShowAnalytics(false)
  }

  if (showStaffMode) {
    return <StaffMode onExit={handleExitSpecialMode} activeMerchantId={merchantId} />
  }

  if (showAnalytics) {
    return (
      <div className="flex flex-col h-full max-w-md mx-auto">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-y-auto">
            <AnalyticsPage activeMerchantId={merchantId} />
          </div>
        </div>
        <div className="bg-white border-t border-[#E9E5DC] px-4 py-3">
          <button
            onClick={handleExitSpecialMode}
            className="w-full py-3 rounded-2xl border border-[#E9E5DC] text-[#6B6158] font-medium text-sm hover:bg-[#F7F5F0] transition-colors cursor-pointer"
          >
            ← ড্যাশবোর্ডে ফিরুন
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0] max-w-md mx-auto relative overflow-hidden">
      <div className="flex-shrink-0 bg-[#1B4332] px-4 pt-2.5 pb-2 flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => handleTabChange("home")}
          className="flex items-center gap-2 cursor-pointer group hover:opacity-90 transition-opacity active:scale-95 text-left"
          title="হোম ড্যাশবোর্ড"
        >
          {activeMerchant?.logoUrl ? (
            <img src={activeMerchant.logoUrl} alt="Logo" className="w-6 h-6 rounded-lg object-cover border border-white/20 shadow-sm" />
          ) : (
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-sm"
              style={{
                backgroundColor: activeMerchant?.logoBg || "#D8EDDF",
                color: activeMerchant?.logoColor || "#1B4332",
              }}
            >
              {activeMerchant?.logoInitials || "সি"}
            </div>
          )}
          <span className="text-white font-bold text-xs group-hover:text-[#F59E0B] transition-colors truncate max-w-[110px]">
            {activeMerchant?.name || "সিলসিলা"}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenAnalytics}
            className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-all cursor-pointer"
          >
            📊 রিপোর্ট
          </button>
          <button
            onClick={handleOpenStaff}
            className="px-2 py-1 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-medium hover:bg-[#F59E0B]/30 transition-all cursor-pointer"
          >
            👷 স্টাফ
          </button>
          <button
            onClick={onBack}
            title="লগ আউট করুন"
            className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white border border-red-500/30 transition-all cursor-pointer text-xs"
          >
            <LogOutIcon size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
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
              activeMerchantId={merchantId}
              onMerchantUpdated={(updated) => {
                setActiveMerchant(updated)
              }}
            />
          )}
        </div>
      </div>

      <nav className="flex-shrink-0 bg-white border-t border-[#E9E5DC]">
        <div className="flex items-center justify-around py-1">
          <MerchantNavBtn
            icon={<ChartIcon size={22} />}
            label="হোম"
            active={tab === "home"}
            badge={pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined}
            onClick={() => handleTabChange("home")}
          />
          <MerchantNavBtn
            icon={<UsersIcon size={22} />}
            label="কাস্টমার"
            active={tab === "customers"}
            onClick={() => handleTabChange("customers")}
          />
          <MerchantNavBtn
            icon={<StarIcon size={22} />}
            label="রিওয়ার্ড"
            active={tab === "rewards"}
            onClick={() => handleTabChange("rewards")}
          />
          <MerchantNavBtn
            icon={<MegaphoneIcon size={22} />}
            label="মার্কেটিং"
            active={tab === "marketing"}
            onClick={() => handleTabChange("marketing")}
          />
          <MerchantNavBtn
            icon={<SettingsIcon size={22} />}
            label="সেটিংস"
            active={tab === "settings"}
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
      className="flex flex-col items-center pt-2 pb-1 px-2 relative min-w-[3.5rem] cursor-pointer"
    >
      <div className="relative">
        <span className={active ? "text-[#1B4332]" : "text-[#B0A99E]"}>{icon}</span>
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-[#F59E0B] rounded-full text-[9px] font-black text-[#1B4332] flex items-center justify-center animate-pulse">
            {badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] mt-0.5 font-medium ${active ? "text-[#1B4332] font-bold" : "text-[#B0A99E]"}`}>
        {label}
      </span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1B4332]" />
      )}
    </button>
  )
}
