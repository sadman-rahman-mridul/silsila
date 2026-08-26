import { useState, useEffect } from "react"
import { api, type Merchant } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { BUSINESS_CATEGORIES, categoryLabel } from "../../constants/categories"
import { MapPinIcon, SearchIcon, ShieldCheckIcon, RefreshIcon } from "../../components/Icons"

interface ExplorePageProps {
  onSelectMerchant?: (merchantId: string) => void
}

export default function ExplorePage({ onSelectMerchant }: ExplorePageProps) {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The customer's real position, used for distance. Never a hardcoded city point.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const categories = [{ value: "all", label: "সব", emoji: "" }, ...BUSINESS_CATEGORIES]

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null)
    )
  }, [])

  useEffect(() => {
    loadMerchants()
  }, [search, selectedCategory, coords])

  async function loadMerchants() {
    try {
      setLoading(true)
      setError(null)
      const [apiList, fbList] = await Promise.all([
        api.getMerchants({
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          search: search || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        }).catch(() => []),
        firebaseService.getMerchants().catch(() => []),
      ])

      const map = new Map<string, any>()
      apiList.forEach((m: any) => map.set(m.id, m))
      fbList.forEach((m: any) => {
        if (selectedCategory !== "all" && m.category !== selectedCategory) return
        if (search) {
          const s = search.toLowerCase()
          const name = (m.name || "").toLowerCase()
          const nameEn = (m.nameEn || "").toLowerCase()
          const area = (m.area || "").toLowerCase()
          if (!name.includes(s) && !nameEn.includes(s) && !area.includes(s)) return
        }
        map.set(m.id, { ...map.get(m.id), ...m })
      })

      setMerchants(Array.from(map.values()))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 pt-8 pb-4">
        <h1 className="font-display text-2xl font-black text-white mb-3 drop-shadow-sm">আশেপাশের দোকান</h1>
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="দোকান বা এলাকা খুঁজুন..."
            className="w-full bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-[#34D399] transition-colors shadow-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/60 text-xs hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-1">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.value
                  ? "bg-[#34D399] text-[#0A2318] shadow-md glow-emerald"
                  : "bg-[#0E281C]/70 backdrop-blur-md text-white/70 border border-white/10 hover:text-white"
              }`}
            >
              {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/60 text-xs font-medium">
            {loading ? "খোঁজা হচ্ছে..." : `${merchants.length}টি দোকান পাওয়া গেছে`}
          </p>
          {coords && (
            <p className="text-[#34D399] text-xs flex items-center gap-1 font-bold">
              <MapPinIcon size={12} className="text-[#34D399]" /> আপনার আশেপাশে
            </p>
          )}
        </div>

        {error && (
          <div className="mb-3 bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-4 py-3 rounded-2xl backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-white/70 text-sm">
            <RefreshIcon size={24} className="animate-spin text-[#34D399] mx-auto mb-2" />
            <p>দোকানের তালিকা লোড হচ্ছে...</p>
          </div>
        ) : merchants.length === 0 ? (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center border border-emerald-500/20">
            <SearchIcon size={32} className="text-[#34D399] mx-auto mb-2" />
            <p className="font-bold text-white">কোনো দোকান খুঁজে পাওয়া যায়নি</p>
            <p className="text-xs text-white/60 mt-1">অন্য কোনো নাম বা ক্যাটাগরি দিয়ে অনুসন্ধান করুন</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {merchants.map((merchant) => (
              <div
                key={merchant.id}
                onClick={() => onSelectMerchant && onSelectMerchant(merchant.id)}
                className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl cursor-pointer transition-all active:scale-[0.99] hover:border-emerald-400/40 border border-white/10 group"
              >
                <div className="h-32 relative bg-[#071D13] overflow-hidden">
                  {merchant.coverUrl ? (
                    <img
                      src={merchant.coverUrl}
                      alt={merchant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div
                      className="w-full h-full relative"
                      style={{ background: `linear-gradient(135deg, ${merchant.logoBg || "#0D3824"} 0%, #061910 100%)` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="font-display font-black text-6xl opacity-20"
                          style={{ color: merchant.logoColor || "#34D399" }}
                        >
                          {merchant.logoInitials || (merchant.name ? merchant.name.slice(0, 2) : "সি")}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E281C] via-transparent to-transparent" />

                  <div className="absolute top-3 left-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-display font-bold text-sm shadow-md overflow-hidden bg-[#0A2318] border border-white/20"
                    >
                      {merchant.logoUrl ? (
                        <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ color: merchant.logoColor || "#34D399" }}>
                          {merchant.logoInitials || (merchant.name ? merchant.name.slice(0, 2) : "সি")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {merchant.verified && (
                      <span className="bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 backdrop-blur-md shadow-xs">
                        <ShieldCheckIcon size={10} /> যাচাইকৃত
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold backdrop-blur-md shadow-xs ${
                        merchant.isOpen !== false ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30" : "bg-white/10 text-white/50 border border-white/10"
                      }`}
                    >
                      {merchant.isOpen !== false ? "খোলা" : "বন্ধ"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-white text-lg leading-tight group-hover:text-[#34D399] transition-colors">
                        {merchant.name}
                      </h3>
                      <p className="text-white/60 text-xs mt-0.5">{categoryLabel(merchant.category)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#34D399] font-bold text-xs flex items-center justify-end gap-1">
                        <MapPinIcon size={12} /> {merchant.distance || "১৫০মি"}
                      </p>
                      <p className="text-white/40 text-[11px] mt-0.5">{merchant.area}</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/60 mb-3.5 leading-relaxed">{merchant.address}</p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onSelectMerchant) onSelectMerchant(merchant.id)
                      }}
                      className="flex-1 bg-gradient-to-r from-[#10B981]/20 to-[#047857]/30 hover:from-[#10B981]/30 hover:to-[#047857]/40 border border-[#10B981]/30 rounded-2xl px-4 py-2.5 flex items-center justify-between transition-all cursor-pointer text-left active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-[#34D399] text-xs font-black">লয়্যালটি কার্ড দেখুন</p>
                        <p className="text-white/60 text-[10px] mt-0.5">স্ট্যাম্প সংগ্রহ করতে ক্লিক করুন</p>
                      </div>
                      <span className="text-[#34D399] font-black text-sm group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                    <a
                      href={`https://maps.google.com/?q=${merchant.lat},${merchant.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-bold transition-all cursor-pointer backdrop-blur-md"
                    >
                      ম্যাপ
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
