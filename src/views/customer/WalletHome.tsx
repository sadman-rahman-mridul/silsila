import { useState, useEffect } from "react"
import { api, type CustomerCard } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import StampGrid from "../../components/StampGrid"
import { FireIcon, GiftIcon, LogOutIcon } from "../../components/Icons"

interface WalletHomeProps {
  onSelectCard: (merchantId: string) => void
  onExploreClick?: () => void
  onLogout?: () => void
}

function formatVisitDate(iso?: string) {
  if (!iso) return ""
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "এইমাত্র"
    if (diffHours < 24 && d.getDate() === now.getDate()) return "আজকে"
    if (diffDays === 1 || (diffHours < 48 && d.getDate() === now.getDate() - 1)) return "গতকাল"
    if (diffDays < 30) return `${diffDays} দিন আগে`
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" })
  } catch {
    return ""
  }
}

export default function WalletHome({ onSelectCard, onExploreClick, onLogout }: WalletHomeProps) {
  const { user, profile } = useAuth()
  const [cards, setCards] = useState<CustomerCard[]>([])
  const [availableMerchants, setAvailableMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "active" | "claim">("all")

  const [error, setError] = useState<string | null>(null)

  const customerId = profile?.id || user?.uid || null
  const displayName = profile?.name || user?.displayName || "সম্মানিত গ্রাহক"

  useEffect(() => {
    loadAvailableMerchants()

    if (!customerId) {
      setCards([])
      setLoading(false)
      return
    }

    // Single source of truth: Listen to Firestore cards collection directly
    const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (firestoreCards) => {
      setCards(firestoreCards || [])
      setLoading(false)
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [customerId])

  async function loadAvailableMerchants() {
    try {
      const [apiList, fbList] = await Promise.all([
        api.getMerchants().catch(() => []),
        firebaseService.getMerchants().catch(() => []),
      ])
      const map = new Map<string, any>()
      apiList.forEach((m: any) => map.set(m.id, m))
      fbList.forEach((m: any) => map.set(m.id, { ...map.get(m.id), ...m }))
      setAvailableMerchants(Array.from(map.values()))
    } catch {
      // ignore
    }
  }

  async function loadCards() {
    if (!customerId) {
      setCards([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const q = query(collection(firestore, "cards"), where("customerId", "==", customerId))
      const snap = await getDocs(q)
      const fbCards = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setCards(fbCards)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalStamps = cards.reduce((acc, c) => acc + (c.stamps || 0), 0)
  const completedCardsCount = cards.filter((c) => c.voucherReady || (c.cycleNo && c.cycleNo > 1)).length
  const maxStreak = Math.max(0, ...cards.map((c) => c.streakCount || 0))

  const filteredCards = cards.filter((card) => {
    if (filter === "claim") return card.voucherReady
    if (filter === "active") return !card.voucherReady
    return true
  })

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-10 pb-6">
        {/* Top Bar: Logo on Left, Logout on Right */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
            title="হোম"
          >
            <div className="w-8 h-8 rounded-xl bg-[#F59E0B] flex items-center justify-center font-display font-black text-[#1B4332] text-sm shadow-md">
              স
            </div>
            <span className="font-display font-black text-white text-lg tracking-wide group-hover:text-[#F59E0B] transition-colors">
              সিলসিলা
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={loadCards}
                title="রিফ্রেশ করুন"
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all cursor-pointer active:scale-95 text-xs"
              >
                <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
              </button>
              {cards.some((c) => c.voucherReady) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F59E0B] rounded-full text-[10px] font-bold text-[#1B4332] flex items-center justify-center animate-pulse">
                  {cards.filter((c) => c.voucherReady).length}
                </span>
              )}
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="লগআউট করুন"
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white flex items-center gap-1.5 border border-red-500/30 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-sm"
              >
                <LogOutIcon size={14} />
                <span>লগ আউট</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <p className="text-[#52B788] text-xs font-semibold uppercase tracking-wider">স্বাগতম</p>
            <h1 className="font-display text-2xl font-bold text-white truncate leading-tight mt-0.5">{displayName}</h1>
          </div>
        </div>

        <div className="mt-4 bg-white/10 rounded-2xl p-4 flex items-center justify-around text-center">
          <div>
            <p className="font-display font-black text-white text-2xl leading-none">{totalStamps}</p>
            <p className="text-white/60 text-xs mt-1">মোট সিল</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="font-display font-black text-white text-2xl leading-none">{completedCardsCount}</p>
            <p className="text-white/60 text-xs mt-1">কার্ড সম্পন্ন</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="font-display font-black text-[#F59E0B] text-2xl leading-none flex items-center justify-center gap-0.5">
              <FireIcon size={20} className="text-[#F59E0B]" />
              {maxStreak}
            </p>
            <p className="text-white/60 text-xs mt-1">সপ্তাহের সিলসিলা</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {/* Filter Tabs (PRD E4a.10) */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-[#1A1916] text-lg">আমার কার্ডগুলো</h2>
          <div className="flex gap-1 bg-[#EAE7E0] p-1 rounded-xl">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === "all" ? "bg-white text-[#1B4332] shadow-sm" : "text-[#6B6158]"
              }`}
            >
              সব ({cards.length})
            </button>
            <button
              onClick={() => setFilter("claim")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === "claim" ? "bg-[#F59E0B] text-[#1B4332] shadow-sm" : "text-[#6B6158]"
              }`}
            >
              দাবিযোগ্য ({cards.filter((c) => c.voucherReady).length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#6B6158] text-sm">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p>কার্ড লোড হচ্ছে...</p>
          </div>
        ) : filteredCards.length > 0 ? (
          <div className="space-y-3">
            {filteredCards.map((card) => {
              const cleanMId = (card.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
              const found = availableMerchants.find((m) => {
                if (m.id === card.merchantId) return true
                if (m.slug && m.slug === card.merchantId) return true
                const mClean = (m.id || "").toLowerCase().replace(/[^a-z0-9]/g, "")
                const enClean = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
                const bnClean = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
                const slugClean = (m.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "")
                return mClean === cleanMId || enClean === cleanMId || bnClean === cleanMId || slugClean === cleanMId
              })
              const merchant = card.merchant?.name
                ? card.merchant
                : (found || {
                    name: "দোকান",
                    category: "লয়্যালটি",
                    area: "",
                    logoInitials: "সি",
                    logoBg: "#D8EDDF",
                    logoColor: "#1B4332",
                    verified: false,
                  })
              const target = card.target || 5
              const remaining = Math.max(0, target - card.stamps)
              const isNearComplete = remaining === 1
              const pct = Math.min(100, (card.stamps / target) * 100)

              return (
                <button
                  key={card.id}
                  onClick={() => onSelectCard(card.merchantId)}
                  className={[
                    "w-full text-left rounded-2xl overflow-hidden card-shadow transition-all active:scale-[0.99] cursor-pointer hover:shadow-md",
                    card.voucherReady ? "bg-[#1B4332]" : "bg-white",
                  ].join(" ")}
                >
                  {card.voucherReady && (
                    <div className="bg-[#F59E0B] px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GiftIcon size={14} className="text-[#1B4332]" />
                        <span className="text-[#1B4332] text-xs font-bold">পুরস্কার প্রস্তুত! এখনই দাবি করুন</span>
                      </div>
                      <span className="text-[10px] font-black bg-[#1B4332] text-[#F59E0B] px-2 py-0.5 rounded-full">
                        কোড দেখুন
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-sm flex-shrink-0 shadow-xs"
                        style={{ background: merchant.logoBg || "#D8EDDF", color: merchant.logoColor || "#1B4332" }}
                      >
                        {merchant.logoInitials || (merchant.name ? merchant.name.slice(0, 2) : "সি")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-display font-bold text-base truncate ${card.voucherReady ? "text-white" : "text-[#1A1916]"}`}>
                            {merchant.name}
                          </p>
                          {merchant.verified && (
                            <span className="text-[#52B788] flex-shrink-0">✓</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${card.voucherReady ? "text-white/60" : "text-[#6B6158]"}`}>
                          {merchant.category} {merchant.area ? `· ${merchant.area}` : ""}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-display font-black text-lg leading-none ${card.voucherReady ? "text-[#F59E0B]" : "text-[#1B4332]"}`}>
                          {card.stamps}<span className={`text-sm font-medium ${card.voucherReady ? "text-white/50" : "text-[#B0A99E]"}`}>/{target}</span>
                        </p>
                        <p className={`text-xs mt-0.5 ${card.voucherReady ? "text-white/60" : "text-[#B0A99E]"}`}>সিল</p>
                      </div>
                    </div>

                    <StampGrid filled={card.stamps} total={target} size="sm" />

                    <div
                      className="mt-3 pt-3 border-t border-dashed flex items-center justify-between"
                      style={{ borderColor: card.voucherReady ? "rgba(255,255,255,0.15)" : "#E9E5DC" }}
                    >
                      <p className={`text-xs ${card.voucherReady ? "text-white/70" : "text-[#6B6158]"}`}>
                        {card.voucherReady ? (
                          <span className="font-medium">{card.rewardText || "পুরস্কার প্রস্তুত"}</span>
                        ) : isNearComplete ? (
                          <span className="text-[#F59E0B] font-semibold flex items-center gap-1">
                            <FireIcon size={12} className="inline" />
                            আর মাত্র ১টি সিল বাকি!
                          </span>
                        ) : (
                          <>আর <span className="font-bold text-[#1B4332]">{remaining}টি</span> সিলে: {card.rewardText || "পুরস্কার"}</>
                        )}
                      </p>
                      <p className={`text-xs font-medium ${card.voucherReady ? "text-white/60" : "text-[#8A8175]"}`}>
                        {formatVisitDate(card.lastVisit || card.updatedAt)}
                      </p>
                    </div>

                    {!card.voucherReady && (
                      <div className="mt-2 h-1 rounded-full bg-[#F0EDE6] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1B4332] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          /* When 0 cards scanned yet, show available restaurants & cafes */
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 card-shadow text-center border border-[#E9E5DC]">
              <span className="text-4xl mb-2 block">🔖</span>
              <p className="font-display font-bold text-[#1A1916] text-lg">উপলব্ধ ক্যাফে ও রেস্তোরাঁ</p>
              <p className="text-[#6B6158] text-xs leading-relaxed mt-1">
                নিচের যেকোনো দোকানে ক্লিক করে স্ট্যাম্প কার্ড দেখুন ও সিল সংগ্রহ করুন
              </p>
            </div>

            {availableMerchants.length > 0 && (
              <div className="space-y-3">
                {availableMerchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => onSelectCard(merchant.id)}
                    className="w-full text-left bg-white rounded-2xl overflow-hidden card-shadow p-4 transition-all active:scale-[0.99] hover:shadow-md border border-[#E9E5DC] cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-black text-base flex-shrink-0 shadow-xs"
                        style={{
                          background: merchant.logoBg || "#D8EDDF",
                          color: merchant.logoColor || "#1B4332",
                        }}
                      >
                        {merchant.logoInitials || merchant.name?.slice(0, 2) || "দোকান"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-display font-bold text-base text-[#1A1916] group-hover:text-[#1B4332] transition-colors truncate">
                            {merchant.name}
                          </p>
                          {merchant.verified && (
                            <span className="text-[#52B788] text-xs font-bold">✓</span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6158] mt-0.5">
                          {merchant.category} · {merchant.area || "ঢাকা"}
                        </p>
                      </div>
                      <span className="text-[#1B4332] font-black text-xs bg-[#D8EDDF] px-2.5 py-1 rounded-full flex-shrink-0">
                        কার্ড খুলুন →
                      </span>
                    </div>

                    <StampGrid filled={0} total={5} size="sm" />

                    <div className="mt-3 pt-2.5 border-t border-dashed border-[#E9E5DC] flex items-center justify-between text-xs text-[#6B6158]">
                      <span>🎁 অর্ডারে ফ্রি উপহার রিওয়ার্ড পান</span>
                      <span className="text-[#1B4332] font-bold">স্ট্যাম্প কার্ড দেখুন</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-[#E9E5DC] flex items-center gap-3 text-[#B0A99E]">
          <span className="text-2xl">🏪</span>
          <div>
            <p className="text-sm font-medium text-[#6B6158]">একটি অ্যাকাউন্ট, সব দোকান</p>
            <p className="text-xs mt-0.5">যেকোনো সিলসিলা দোকানে একই অ্যাকাউন্টেই সিল জমবে</p>
          </div>
        </div>
      </div>
    </div>
  )
}
