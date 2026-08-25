import { useState, useEffect } from "react"
import MerchantDashboard from "./MerchantDashboard"
import CustomersPage from "./CustomersPage"
import RewardsManager from "./RewardsManager"
import MarketingPage from "./MarketingPage"
import MerchantSettings from "./MerchantSettings"
import AnalyticsPage from "./AnalyticsPage"
import StaffMode from "./StaffMode"
import { ChartIcon, UsersIcon, StarIcon, MegaphoneIcon, SettingsIcon } from "../../components/Icons"
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

  // Never fall back to "m1" — use the authenticated profile's merchant id
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
      if (m) setActiveMerchant(m)
    })

    return () => {
      if (typeof unsubscribeApprovals === "function") unsubscribeApprovals()
      if (typeof unsubscribeMerchant === "function") unsubscribeMerchant()
    }
  }, [merchantId])

  // Keep merchantId in sync if profile updates (e.g. after onboarding)
  useEffect(() => {
    const id = profile?.merchantId || profile?.id || ""
    if (id && id !== merchantId) setMerchantId(id)
  }, [profile?.merchantId, profile?.id])

  if (showStaffMode) {
    return <StaffMode onExit={() => setShowStaffMode(false)} activeMerchantId={merchantId} />
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
            onClick={() => setShowAnalytics(false)}
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
      <div className="flex-shrink-0 bg-[#1B4332] px-4 pt-2 pb-1.5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          {activeMerchant?.logoUrl ? (
            <img src={activeMerchant.logoUrl} alt="Logo" className="w-5 h-5 rounded-md object-cover" />
          ) : (
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]"
              style={{
                backgroundColor: activeMerchant?.logoBg || "#D8EDDF",
                color: activeMerchant?.logoColor || "#1B4332",
              }}
            >
              {activeMerchant?.logoInitials || "সি"}
            </div>
          )}
          <p className="text-white/60 text-xs font-semibold">
            {activeMerchant?.name || "মার্চেন্ট কনসোল"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-white/20 transition-all cursor-pointer"
          >
            📊 রিপোর্ট
          </button>
          <button
            onClick={() => setShowStaffMode(true)}
            className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-xs font-medium hover:bg-[#F59E0B]/30 transition-all cursor-pointer"
          >
            👷 স্টাফ মোড
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          {tab === "home" && (
            <MerchantDashboard
              merchantId={merchantId}
              onMerchantChange={setMerchantId}
              onViewCustomers={() => setTab("customers")}
              onOpenSettings={() => setTab("settings")}
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
              onMerchantUpdated={(updated) => setActiveMerchant(updated)}
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
            onClick={() => setTab("home")}
          />
          <MerchantNavBtn
            icon={<UsersIcon size={22} />}
            label="কাস্টমার"
            active={tab === "customers"}
            onClick={() => setTab("customers")}
          />
          <MerchantNavBtn
            icon={<StarIcon size={22} />}
            label="পুরস্কার"
            active={tab === "rewards"}
            onClick={() => setTab("rewards")}
          />
          <MerchantNavBtn
            icon={<MegaphoneIcon size={22} />}
            label="মার্কেটিং"
            active={tab === "marketing"}
            onClick={() => setTab("marketing")}
          />
          <MerchantNavBtn
            icon={<SettingsIcon size={22} />}
            label="সেটিংস"
            active={tab === "settings"}
            onClick={() => setTab("settings")}
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
