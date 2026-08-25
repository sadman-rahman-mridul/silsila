import { useState, useEffect } from "react"
import WalletHome from "./WalletHome"
import CardDetail from "./CardDetail"
import ScanFlow from "./ScanFlow"
import ExplorePage from "./ExplorePage"
import RewardsPage from "./RewardsPage"
import ProfilePage from "./ProfilePage"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import { HomeIcon, CompassIcon, ScanIcon, GiftIcon, UserIcon } from "../../components/Icons"

type CustomerTab = "home" | "explore" | "scan" | "rewards" | "profile"

interface CustomerAppProps {
  onBack: () => void
}

export default function CustomerApp({ onBack }: CustomerAppProps) {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<CustomerTab>("home")
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null)
  const [readyRewardsCount, setReadyRewardsCount] = useState<number>(0)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (!customerId) return
    // Reward tab badge follows this customer's live cards.
    const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (cards) => {
      setReadyRewardsCount(cards.filter((c) => c.voucherReady).length)
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [customerId])

  const showCard = !!selectedMerchantId

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0] max-w-md mx-auto relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {showCard ? (
          <div className="absolute inset-0 overflow-y-auto">
            <CardDetail merchantId={selectedMerchantId} onBack={() => setSelectedMerchantId(null)} />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto">
            {tab === "home" && (
              <WalletHome
                onSelectCard={(id) => setSelectedMerchantId(id)}
                onExploreClick={() => setTab("explore")}
                onLogout={onBack}
              />
            )}
            {tab === "explore" && <ExplorePage onSelectMerchant={(id) => { setSelectedMerchantId(id); setTab("home") }} />}
            {tab === "scan" && (
              <ScanFlow
                onNavigateToCard={(merchantId) => {
                  setSelectedMerchantId(merchantId)
                  setTab("home")
                }}
                onNavigateHome={() => setTab("home")}
              />
            )}
            {tab === "rewards" && <RewardsPage />}
            {tab === "profile" && <ProfilePage onBack={onBack} />}
          </div>
        )}
      </div>

      {!showCard && (
        <nav className="flex-shrink-0 bg-white border-t border-[#E9E5DC] px-2 pb-safe safe-area-inset-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around">
            <NavBtn icon={<HomeIcon size={22} />} label="হোম" active={tab === "home"} onClick={() => setTab("home")} />
            <NavBtn icon={<CompassIcon size={22} />} label="খুঁজুন" active={tab === "explore"} onClick={() => setTab("explore")} />

            <button
              onClick={() => setTab("scan")}
              className="flex flex-col items-center -mt-5 relative"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${tab === "scan" ? "bg-[#F59E0B]" : "bg-[#1B4332]"}`}>
                <ScanIcon size={24} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${tab === "scan" ? "text-[#F59E0B]" : "text-[#6B6158]"}`}>স্ক্যান</span>
            </button>

            <NavBtn icon={<GiftIcon size={22} />} label="পুরস্কার" active={tab === "rewards"} onClick={() => setTab("rewards")} badge={readyRewardsCount > 0 ? readyRewardsCount : undefined} />
            <NavBtn icon={<UserIcon size={22} />} label="প্রোফাইল" active={tab === "profile"} onClick={() => setTab("profile")} />
          </div>
        </nav>
      )}
    </div>
  )
}

function NavBtn({
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
      className="flex flex-col items-center pt-2 pb-1 px-3 relative"
    >
      <div className="relative">
        <span className={active ? "text-[#1B4332]" : "text-[#B0A99E]"}>{icon}</span>
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F59E0B] rounded-full text-[9px] font-bold text-[#1B4332] flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] mt-0.5 font-medium ${active ? "text-[#1B4332]" : "text-[#B0A99E]"}`}>
        {label}
      </span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1B4332]" />
      )}
    </button>
  )
}
