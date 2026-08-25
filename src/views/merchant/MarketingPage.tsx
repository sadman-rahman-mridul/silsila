import { useState, useEffect } from "react"
import { api } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import { InstagramIcon, FacebookIcon, ExternalLinkIcon, CheckIcon, RefreshIcon } from "../../components/Icons"
import { useAuth } from "../../context/AuthContext"

interface MarketingPageProps {
  merchantId?: string
  onBack?: () => void
}

export default function MarketingPage({ merchantId: propId, onBack }: MarketingPageProps) {
  const { profile } = useAuth()
  const merchantId = propId || profile?.merchantId || profile?.id || ""
  const [instagram, setInstagram] = useState("")
  const [facebook, setFacebook] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [reviewLink, setReviewLink] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const swipeHandlers = useSwipeBack(onBack)

  useEffect(() => {
    if (!merchantId) return
    loadMarketingData(merchantId)
  }, [merchantId])

  async function loadMarketingData(id: string) {
    try {
      setError(null)
      // 1. Check Cloud Firestore directly
      const m = await firebaseService.getMerchantByIdOrSlug(id).catch(() => null)
      if (m) {
        setInstagram(m.instagram || "")
        setFacebook(m.facebook || "")
        setWhatsapp(m.whatsapp || "")
        setReviewLink(m.reviewLink || "")
        return
      }

      // 2. Fallback to API
      const res = await api.getMerchant(id).catch(() => null)
      if (res?.merchant) {
        setInstagram(res.merchant.instagram || "")
        setFacebook(res.merchant.facebook || "")
        setWhatsapp(res.merchant.whatsapp || "")
        setReviewLink(res.merchant.reviewLink || "")
      }
    } catch (err: any) {
      console.warn("Marketing load error:", err)
    }
  }

  async function handleSaveMarketing() {
    setSaving(true)
    setError(null)
    try {
      const updateData = {
        instagram: instagram.trim() || "",
        facebook: facebook.trim() || "",
        whatsapp: whatsapp.trim() || "",
        reviewLink: reviewLink.trim() || "",
      }

      // 1. Save directly to Cloud Firestore
      await firebaseService.updateMerchantInFirestore(merchantId, updateData)

      // 2. Non-blocking API sync
      api.updateMerchant(merchantId, updateData).catch(() => {})

      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.message || "সংরক্ষণ ব্যর্থ হয়েছে")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]" {...swipeHandlers}>
      <div className="bg-[#1B4332] px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-1">মার্কেটিং ও রিভিউ</h1>
            <p className="text-[#52B788] text-sm">কাস্টমারদের সাথে যোগাযোগের লিঙ্ক ও চ্যানেল</p>
          </div>
          <button
            onClick={handleSaveMarketing}
            disabled={saving}
            className="px-4 py-2 bg-[#F59E0B] text-[#1B4332] font-black text-xs rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            {saving ? (
              <>
                <RefreshIcon size={12} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckIcon size={12} />
                <span>Saved ✓</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}
        {savedSuccess && (
          <div className="mb-4 bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-4 py-2.5 rounded-xl text-xs font-bold animate-fade-in">
            ✓ সোশ্যাল লিঙ্ক ও রিভিউ সেটিংস সফলভাবে আপডেট হয়েছে!
          </div>
        )}

        {/* Social Media Links */}
        <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
          <h2 className="font-display font-bold text-[#1A1916] mb-1">সোশ্যাল মিডিয়া হ্যান্ডেল</h2>
          <p className="text-[#6B6158] text-xs mb-4 leading-relaxed">
            এই লিঙ্কগুলো কাস্টমারদের ডিজিটাল কার্ড পেজে সরাসরি প্রদর্শিত হবে
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#F7F5F0] rounded-xl border border-[#E9E5DC]">
              <InstagramIcon size={20} className="text-[#E1306C] flex-shrink-0" />
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram username"
                className="flex-1 bg-transparent text-[#1A1916] text-sm font-medium outline-none"
              />
              <span className="text-[#52B788] text-xs font-bold">✓</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F7F5F0] rounded-xl border border-[#E9E5DC]">
              <FacebookIcon size={20} className="text-[#1877F2] flex-shrink-0" />
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="Facebook page name"
                className="flex-1 bg-transparent text-[#1A1916] text-sm font-medium outline-none"
              />
              <span className="text-[#52B788] text-xs font-bold">✓</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#F7F5F0] rounded-xl border border-[#E9E5DC]">
              <span className="text-xl flex-shrink-0">📱</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp নম্বর"
                className="flex-1 bg-transparent text-[#1A1916] text-sm font-medium outline-none"
              />
            </div>
          </div>
        </div>

        {/* Google Review Link (PRD E7.2, §12.2: strictly without scripted review text) */}
        <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-[#1A1916]">Google রিভিউ লিংক</h2>
          </div>
          <div className="p-3 bg-[#F7F5F0] rounded-xl flex items-center gap-3 mb-3 border border-[#E9E5DC]">
            <span className="text-xl">⭐</span>
            <input
              type="text"
              value={reviewLink}
              onChange={(e) => setReviewLink(e.target.value)}
              placeholder="https://g.page/r/your-shop"
              className="flex-1 bg-transparent text-[#1A1916] text-sm font-medium outline-none"
            />
            <ExternalLinkIcon size={14} className="text-[#B0A99E]" />
          </div>
          <div className="bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-xl p-3 flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <p className="text-[#B45309] text-xs leading-relaxed">
              Google-এর সততা নীতি অনুসারে কাস্টমারকে কেবল অফিসিয়াল রিভিউ লিংক দেখানো হয় — কোনো স্ক্রিপ্ট করা বা কৃত্রিম রিভিউ টেক্সট প্রদান করা হয় না।
            </p>
          </div>
        </div>

        {/* SMS Campaigns (Opt-in only) */}
        <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-[#1A1916]">SMS রিমাইন্ডার (Opt-in)</h2>
            <span className="bg-[#F0EDE6] text-[#B0A99E] text-xs px-2.5 py-1 rounded-full font-bold">আসছে</span>
          </div>
          <p className="text-[#6B6158] text-xs leading-relaxed mb-3">
            নির্দিষ্ট গ্রাহক সেগমেন্টে বিশেষ অফার বা রিমাইন্ডার পাঠানোর সুবিধা।
          </p>
          <div className="space-y-2 opacity-75">
            {[
              { segment: "৩০ দিনে আসেননি (Win-back)", count: "২৩ জন" },
              { segment: "কার্ড প্রায় পূর্ণ (১টি সিল বাকি)", count: "১৮ জন" },
              { segment: "সব সক্রিয় কাস্টমার", count: "১৪৭ জন" },
            ].map((s) => (
              <div key={s.segment} className="flex items-center justify-between p-3 bg-[#F7F5F0] rounded-xl border border-[#E9E5DC]">
                <p className="text-[#1A1916] text-xs font-semibold">{s.segment}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B6158] text-xs font-mono">{s.count}</span>
                  <button
                    onClick={() => alert(`কাস্টমার সেগমেন্ট "${s.segment}"-এ ড্রাফট ক্যাম্পেইন প্রস্তুত করা হয়েছে।`)}
                    className="px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143427]"
                  >
                    ড্রাফট
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shareable Posters */}
        <div className="bg-white rounded-2xl card-shadow p-4">
          <h2 className="font-display font-bold text-[#1A1916] mb-2">প্রিন্ট ও সোশ্যাল পোস্টার</h2>
          <p className="text-[#6B6158] text-xs mb-4">আপনার দোকানে টানানোর জন্য এবং সোশ্যাল মিডিয়ায় প্রচারের জন্য</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "কাউন্টার QR টেন্ট", icon: "📋", desc: "A4 সাইজ, স্ট্যান্ড টেন্ট" },
              { title: "স্টোরি ব্যানার", icon: "📱", desc: "Instagram & FB Story 9:16" },
            ].map((p) => (
              <div key={p.title} className="bg-[#F0F7F2] rounded-xl p-3 text-center border border-[#52B788]/20">
                <span className="text-3xl block mb-2">{p.icon}</span>
                <p className="font-bold text-[#1A1916] text-xs">{p.title}</p>
                <p className="text-[#6B6158] text-[10px] mt-0.5">{p.desc}</p>
                <button
                  onClick={() => alert(`পোস্টার "${p.title}" ডাউনলোড শুরু হয়েছে`)}
                  className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-xs font-semibold w-full"
                >
                  ডাউনলোড
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
