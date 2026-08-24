import { useState, useEffect } from "react"
import { api, type Merchant } from "../../services/api"
import { BUSINESS_CATEGORIES, categoryLabel } from "../../constants/categories"
import { MapPinIcon, SearchIcon, ShieldCheckIcon } from "../../components/Icons"

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
      setMerchants(
        await api.getMerchants({
          category: selectedCategory !== "all" ? selectedCategory : undefined,
          search: search || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        })
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-12 pb-5">
        <h1 className="font-display text-2xl font-bold text-white mb-3">আশেপাশের দোকান</h1>
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0A99E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="দোকান বা এলাকা খুঁজুন..."
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-[#52B788] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-xs hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                selectedCategory === cat.value
                  ? "bg-[#1B4332] text-white shadow-sm"
                  : "bg-white text-[#6B6158] border border-[#E9E5DC]"
              }`}
            >
              {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#6B6158] text-sm">
            {loading ? "খোঁজা হচ্ছে..." : `${merchants.length}টি দোকান পাওয়া গেছে`}
          </p>
          {coords && (
            <p className="text-[#6B6158] text-xs flex items-center gap-1 font-medium">
              <MapPinIcon size={12} className="text-[#1B4332]" /> আপনার আশেপাশে
            </p>
          )}
        </div>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[#6B6158] text-sm">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p>দোকানের তালিকা লোড হচ্ছে...</p>
          </div>
        ) : merchants.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 card-shadow text-center">
            <span className="text-3xl mb-2 block">🔍</span>
            <p className="font-bold text-[#1A1916]">কোনো দোকান খুঁজে পাওয়া যায়নি</p>
            <p className="text-xs text-[#6B6158] mt-1">অন্য কোনো নাম বা ক্যাটাগরি দিয়ে অনুসন্ধান করুন</p>
          </div>
        ) : (
          <div className="space-y-3">
            {merchants.map((merchant) => (
              <div
                key={merchant.id}
                onClick={() => onSelectMerchant && onSelectMerchant(merchant.id)}
                className="bg-white rounded-2xl overflow-hidden card-shadow cursor-pointer transition-all active:scale-[0.99] hover:shadow-md group"
              >
                <div
                  className="h-28 relative"
                  style={{ background: `linear-gradient(135deg, ${merchant.logoBg || "#D8EDDF"} 0%, ${merchant.logoBg || "#D8EDDF"}88 100%)` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="font-display font-black text-6xl opacity-20"
                      style={{ color: merchant.logoColor || "#1B4332" }}
                    >
                      {merchant.logoInitials}
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm shadow-md"
                      style={{ background: merchant.logoBg || "#D8EDDF", color: merchant.logoColor || "#1B4332", border: `2px solid ${merchant.logoColor || "#1B4332"}22` }}
                    >
                      {merchant.logoInitials}
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    {merchant.verified && (
                      <span className="bg-[#D8EDDF] text-[#1B4332] text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <ShieldCheckIcon size={10} /> যাচাইকৃত
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        merchant.isOpen ? "bg-[#D8EDDF] text-[#1B4332]" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {merchant.isOpen ? "খোলা" : "বন্ধ"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-display font-bold text-[#1A1916] text-lg leading-tight group-hover:text-[#1B4332] transition-colors">
                        {merchant.name}
                      </h3>
                      <p className="text-[#6B6158] text-sm">{categoryLabel(merchant.category)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#1B4332] font-semibold text-sm flex items-center justify-end gap-1">
                        <MapPinIcon size={12} /> {merchant.distance || "১৫০মি"}
                      </p>
                      <p className="text-[#B0A99E] text-xs mt-0.5">{merchant.area}</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#6B6158] mb-3">{merchant.address}</p>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#F0F7F2] rounded-xl px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-[#1B4332] text-xs font-bold">লয়্যালটি কার্ড দেখুন</p>
                        <p className="text-[#6B6158] text-[11px] mt-0.5">স্ট্যাম্প সংগ্রহ করতে ক্লিক করুন</p>
                      </div>
                      <span className="text-[#1B4332] font-bold text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${merchant.lat},${merchant.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3.5 py-2.5 rounded-xl border border-[#E9E5DC] text-[#6B6158] hover:bg-[#F7F5F0] text-xs font-bold transition-all"
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
