import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
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
  onBack?: () => void
  initialMerchantId?: string | null
  initialTab?: CustomerTab
}

export default function CustomerApp({ onBack, initialMerchantId, initialTab }: CustomerAppProps) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function getTabFromPath(): CustomerTab {
    const path = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase()
    if (path === "explore") return "explore"
    if (path === "scan") return "scan"
    if (path === "rewards") return "rewards"
    if (path === "profile") return "profile"
    return "home"
  }

  const [tab, setTab] = useState<CustomerTab>(() => initialTab || getTabFromPath())
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(() => initialMerchantId || null)
  const [readyRewardsCount, setReadyRewardsCount] = useState<number>(0)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (initialMerchantId) {
      setSelectedMerchantId(initialMerchantId)
    }
  }, [initialMerchantId])

  useEffect(() => {
    const currentTab = getTabFromPath()
    setTab(currentTab)
  }, [location.pathname])

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

  async function handleOpenMerchant(idOrSlug: string) {
    if (!idOrSlug) return
    try {
      let slug = idOrSlug.toLowerCase().trim()
      if (slug.startsWith("m_")) {
        const m = await firebaseService.getMerchantByIdOrSlug(idOrSlug).catch(() => null)
        if (m) {
          slug = m.slug || (m.nameEn ? m.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "") || (m.name ? m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : idOrSlug)
        }
      }
      navigate(`/${slug}`)
    } catch {
      navigate(`/${idOrSlug}`)
    }
  }

  function handleTabChange(nextTab: CustomerTab) {
    setTab(nextTab)
    setSelectedMerchantId(null)
    navigate(`/${nextTab}`)
  }

  async function handleLogout() {
    if (onBack) {
      onBack()
    } else {
      await logout()
      navigate("/")
    }
  }

  const showCard = !!selectedMerchantId

  return (
    <div className="flex flex-col h-full bg-transparent max-w-md mx-auto relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {showCard ? (
          <div className="absolute inset-0 overflow-y-auto">
            <CardDetail merchantId={selectedMerchantId} onBack={() => navigate("/home")} />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto">
            {tab === "home" && (
              <WalletHome
                onSelectCard={(id) => handleOpenMerchant(id)}
                onExploreClick={() => handleTabChange("explore")}
                onLogout={handleLogout}
              />
            )}
            {tab === "explore" && <ExplorePage onSelectMerchant={(id) => handleOpenMerchant(id)} />}
            {tab === "scan" && (
              <ScanFlow
                onNavigateToCard={(merchantId) => handleOpenMerchant(merchantId)}
                onNavigateHome={() => handleTabChange("home")}
              />
            )}
            {tab === "rewards" && <RewardsPage />}
            {tab === "profile" && <ProfilePage onBack={handleLogout} />}
          </div>
        )}
      </div>

      {!showCard && (
        <nav className="flex-shrink-0 bg-[#092015]/90 backdrop-blur-xl border-t border-white/10 px-2 pb-safe safe-area-inset-bottom shadow-2xl z-20" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="flex items-center justify-around">
            <NavBtn icon={<HomeIcon size={22} />} label="হোম" active={tab === "home"} onClick={() => handleTabChange("home")} />
            <NavBtn icon={<CompassIcon size={22} />} label="খুঁজুন" active={tab === "explore"} onClick={() => handleTabChange("explore")} />

            <button
              onClick={() => handleTabChange("scan")}
              className="flex flex-col items-center -mt-5 relative cursor-pointer active:scale-95 transition-transform group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all ${tab === "scan" ? "bg-[#F59E0B] glow-amber" : "bg-gradient-to-br from-[#10B981] to-[#047857] glow-emerald border border-white/20"}`}>
                <ScanIcon size={24} className="text-[#071D13]" />
              </div>
              <span className={`text-[10px] mt-1 font-bold ${tab === "scan" ? "text-[#F59E0B]" : "text-[#52B788]"}`}>স্ক্যান</span>
            </button>

            <NavBtn icon={<GiftIcon size={22} />} label="পুরস্কার" active={tab === "rewards"} onClick={() => handleTabChange("rewards")} badge={readyRewardsCount > 0 ? readyRewardsCount : undefined} />
            <NavBtn icon={<UserIcon size={22} />} label="প্রোফাইল" active={tab === "profile"} onClick={() => handleTabChange("profile")} />
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
      className="flex flex-col items-center pt-2.5 pb-1 px-3 relative cursor-pointer group active:scale-95 transition-all"
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
