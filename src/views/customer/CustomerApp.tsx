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
import CustomerBottomNav, { type CustomerTab } from "../../components/CustomerBottomNav"

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
    <div className="flex flex-col h-full min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] w-full relative overflow-hidden transition-colors">
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

      {/* Unified Bottom Navigation across all pages */}
      <CustomerBottomNav
        activeTab={showCard ? null : tab}
        onTabChange={handleTabChange}
        readyRewardsCount={readyRewardsCount}
      />
    </div>
  )
}
