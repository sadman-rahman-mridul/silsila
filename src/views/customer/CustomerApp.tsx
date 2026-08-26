import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import WalletHome from "./WalletHome"
import CardDetail from "./CardDetail"
import ScanFlow from "./ScanFlow"
import ExplorePage from "./ExplorePage"
import RewardsPage from "./RewardsPage"
import ProfilePage from "./ProfilePage"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
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
  const { isBn } = useLanguage()
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
    <div className="flex flex-col h-full min-h-[100dvh] bg-transparent w-full max-w-md mx-auto relative overflow-hidden">
      <div className="flex-1 overflow-hidden relative w-full">
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

      {/* Static Bottom Navigation (Facebook style) */}
      <nav
        className="flex-shrink-0 bg-[#092015]/95 backdrop-blur-xl border-t border-white/10 px-1 pb-safe shadow-2xl z-20 w-full"
      >
        <div className="flex items-center justify-around py-0.5">
          <NavBtn icon={<HomeIcon size={21} />} label={isBn ? "হোম" : "Home"} active={!showCard && tab === "home"} onClick={() => handleTabChange("home")} />
          <NavBtn icon={<CompassIcon size={21} />} label={isBn ? "খুঁজুন" : "Explore"} active={!showCard && tab === "explore"} onClick={() => handleTabChange("explore")} />

          <button
            onClick={() => handleTabChange("scan")}
            className="flex flex-col items-center -mt-4 relative cursor-pointer active:scale-95 transition-transform group"
          >
            <div className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl transition-all ${!showCard && tab === "scan" ? "bg-[#F59E0B] glow-amber" : "bg-gradient-to-br from-[#10B981] to-[#047857] glow-emerald border border-white/20"}`}>
              <ScanIcon size={22} className="text-[#071D13]" />
            </div>
            <span className={`text-[10px] mt-0.5 font-bold ${!showCard && tab === "scan" ? "text-[#F59E0B]" : "text-[#52B788]"}`}>{isBn ? "স্ক্যান" : "Scan"}</span>
          </button>

          <NavBtn
            icon={<GiftIcon size={21} />}
            label={isBn ? "পুরস্কার" : "Rewards"}
            active={!showCard && tab === "rewards"}
            onClick={() => handleTabChange("rewards")}
            badge={readyRewardsCount > 0 ? readyRewardsCount : undefined}
          />

          <NavBtn
            icon={
              (profile?.avatarUrl || profile?.photoURL) ? (
                <div
                  className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                    !showCard && tab === "profile" ? "border-[#34D399] ring-2 ring-[#34D399]/40 shadow-sm" : "border-white/40 opacity-70 group-hover:opacity-100"
                  }`}
                >
                  <img
                    src={profile?.avatarUrl || profile?.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <UserIcon size={21} />
              )
            }
            label={isBn ? "প্রোফাইল" : "Profile"}
            active={!showCard && tab === "profile"}
            onClick={() => handleTabChange("profile")}
          />
        </div>
      </nav>
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
