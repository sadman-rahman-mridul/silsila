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
import { api, generateMerchantSlug } from "../../services/api"

type CustomerTab = "home" | "explore" | "scan" | "rewards" | "profile"

interface CustomerAppProps {
  onBack: () => void
  initialMerchantId?: string | null
  initialSubpage?: string | null
}

export default function CustomerApp({ onBack, initialMerchantId, initialSubpage }: CustomerAppProps) {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<CustomerTab>(() => {
    if (initialSubpage && ["explore", "scan", "rewards", "profile"].includes(initialSubpage)) {
      return initialSubpage as CustomerTab
    }
    return "home"
  })
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(() => {
    if (initialMerchantId && (!initialSubpage || initialSubpage === "card")) {
      return initialMerchantId
    }
    return null
  })
  const [readyRewardsCount, setReadyRewardsCount] = useState<number>(0)
  const [allMerchants, setAllMerchants] = useState<any[]>([])

  useEffect(() => {
    api.getMerchants().then((m) => setAllMerchants(m || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (initialMerchantId && (!initialSubpage || initialSubpage === "card")) {
      setSelectedMerchantId(initialMerchantId)
    } else if (initialSubpage && ["explore", "scan", "rewards", "profile"].includes(initialSubpage)) {
      setTab(initialSubpage as CustomerTab)
      setSelectedMerchantId(null)
    }
  }, [initialMerchantId, initialSubpage])

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

  // User phone number last 7 digits prefix for personalized customer routing (domain/last7digits/page)
  const userPhoneTag = profile?.phone ? profile.phone.replace(/\D/g, "").slice(-7) : null

  function buildUserUrl(path: string) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`
    if (userPhoneTag) {
      return `/${userPhoneTag}${cleanPath === "/" ? "" : cleanPath}`
    }
    return cleanPath
  }

  // Sync browser URL dynamically with user navigation
  function handleSelectCard(id: string) {
    setSelectedMerchantId(id)
    const m = allMerchants.find((x) => x.id === id)
    const slug = m ? generateMerchantSlug(m) : id
    window.history.replaceState(null, "", buildUserUrl(`/${slug}`))
  }

  function handleBackFromCard() {
    setSelectedMerchantId(null)
    window.history.replaceState(null, "", buildUserUrl(tab === "home" ? "" : `/${tab}`))
  }

  function handleSwitchTab(nextTab: CustomerTab) {
    setTab(nextTab)
    setSelectedMerchantId(null)
    window.history.replaceState(null, "", buildUserUrl(nextTab === "home" ? "" : `/${nextTab}`))
  }

  const showCard = !!selectedMerchantId

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0] max-w-md mx-auto relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {showCard ? (
          <div className="absolute inset-0 overflow-y-auto">
            <CardDetail merchantId={selectedMerchantId} onBack={handleBackFromCard} />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto">
            {tab === "home" && (
              <WalletHome
                onSelectCard={handleSelectCard}
                onExploreClick={() => handleSwitchTab("explore")}
                onLogout={onBack}
              />
            )}
            {tab === "explore" && (
              <ExplorePage
                onSelectMerchant={(id) => {
                  handleSelectCard(id)
                }}
              />
            )}
            {tab === "scan" && (
              <ScanFlow
                onNavigateToCard={(merchantId) => {
                  handleSelectCard(merchantId)
                }}
                onNavigateHome={() => handleSwitchTab("home")}
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
            <NavBtn icon={<HomeIcon size={22} />} label="হোম" active={tab === "home"} onClick={() => handleSwitchTab("home")} />
            <NavBtn icon={<CompassIcon size={22} />} label="খুঁজুন" active={tab === "explore"} onClick={() => handleSwitchTab("explore")} />

            <button
              onClick={() => handleSwitchTab("scan")}
              className="flex flex-col items-center -mt-5 relative"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${tab === "scan" ? "bg-[#F59E0B]" : "bg-[#1B4332]"}`}>
                <ScanIcon size={24} className="text-white" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${tab === "scan" ? "text-[#F59E0B]" : "text-[#6B6158]"}`}>স্ক্যান</span>
            </button>

            <NavBtn icon={<GiftIcon size={22} />} label="পুরস্কার" active={tab === "rewards"} onClick={() => handleSwitchTab("rewards")} badge={readyRewardsCount > 0 ? readyRewardsCount : undefined} />
            <NavBtn icon={<UserIcon size={22} />} label="প্রোফাইল" active={tab === "profile"} onClick={() => handleSwitchTab("profile")} />
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
