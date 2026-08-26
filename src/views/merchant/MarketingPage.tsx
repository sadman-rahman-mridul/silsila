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
      const m = await firebaseService.getMerchantByIdOrSlug(id).catch(() => null)
      if (m) {
        setInstagram(m.instagram || "")
        setFacebook(m.facebook || "")
        setWhatsapp(m.whatsapp || "")
        setReviewLink(m.reviewLink || "")
        return
      }

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

      await firebaseService.updateMerchantInFirestore(merchantId, updateData)
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
      <div className="bg-[#1B4332] px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white mb-1">মার্কেটিং ও রিভিউ</h1>
            <p className="text-[#52B788] text-xs">কাস্টমারদের সাথে যোগাযোগের লিঙ্ক ও চ্যানেল</p>
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

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2.5 rounded-2xl text-xs font-medium backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}
        {savedSuccess && (
          <div className="mb-4 bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] px-4 py-2.5 rounded-2xl text-xs font-bold animate-fade-in backdrop-blur-md shadow-md">
            ✓ সোশ্যাল লিঙ্ক ও রিভিউ সেটিংস সফলভাবে আপডেট হয়েছে!
          </div>
        )}

        {/* Social Media Links */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <h2 className="font-display font-bold text-white mb-1">সোশ্যাল মিডিয়া হ্যান্ডেল</h2>
          <p className="text-white/60 text-xs mb-4 leading-relaxed">
            এই লিঙ্কগুলো কাস্টমারদের ডিজিটাল কার্ড পেজে সরাসরি প্রদর্শিত হবে
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#071D13] rounded-2xl border border-white/10">
              <InstagramIcon size={20} className="text-[#E1306C] flex-shrink-0" />
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram username"
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-white/30"
              />
              <span className="text-[#34D399] text-xs font-bold">✓</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#071D13] rounded-2xl border border-white/10">
              <FacebookIcon size={20} className="text-[#1877F2] flex-shrink-0" />
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="Facebook page name"
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-white/30"
              />
              <span className="text-[#34D399] text-xs font-bold">✓</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#071D13] rounded-2xl border border-white/10">
              <span className="text-xl flex-shrink-0">📱</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp নম্বর"
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-white/30"
              />
            </div>
          </div>
        </div>

        {/* Google Review Link */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-white">Google রিভিউ লিংক</h2>
          </div>
          <div className="p-3 bg-[#071D13] rounded-2xl flex items-center gap-3 mb-3 border border-white/10">
            <span className="text-xl">⭐</span>
            <input
              type="text"
              value={reviewLink}
              onChange={(e) => setReviewLink(e.target.value)}
              placeholder="https://g.page/r/your-shop"
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-white/30"
            />
            <ExternalLinkIcon size={14} className="text-white/40" />
          </div>
          <div className="bg-[#FEF3C7]/15 border border-[#F59E0B]/30 rounded-2xl p-3 flex items-start gap-2">
            <span className="text-sm">⚠️</span>
            <p className="text-amber-200 text-xs leading-relaxed">
              Google-এর সততা নীতি অনুসারে কাস্টমারকে কেবল অফিসিয়াল রিভিউ লিংক দেখানো হয় — কোনো স্ক্রিপ্ট করা বা কৃত্রিম রিভিউ টেক্সট প্রদান করা হয় না।
            </p>
          </div>
        </div>

        {/* SMS Campaigns (Opt-in only) */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-white">SMS রিমাইন্ডার (Opt-in)</h2>
            <span className="bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 text-xs px-2.5 py-0.5 rounded-full font-bold">আসছে</span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed mb-3">
            নির্দিষ্ট গ্রাহক সেগমেন্টে বিশেষ অফার বা রিমাইন্ডার পাঠানোর সুবিধা।
          </p>
          <div className="space-y-2 opacity-75">
            {[
              { segment: "৩০ দিনে আসেননি (Win-back)", count: "২৩ জন" },
              { segment: "কার্ড প্রায় পূর্ণ (১টি সিল বাকি)", count: "১৮ জন" },
              { segment: "সব সক্রিয় কাস্টমার", count: "১৪৭ জন" },
            ].map((s) => (
              <div key={s.segment} className="flex items-center justify-between p-3 rounded-2xl bg-[#071D13] border border-white/10 text-xs">
                <span className="font-medium text-white/80">{s.segment}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#34D399] bg-[#34D399]/15 px-2.5 py-0.5 rounded-full">{s.count}</span>
                  <button
                    onClick={() => alert(`কাস্টমার সেগমেন্ট "${s.segment}"-এ ড্রাফট ক্যাম্পেইন প্রস্তুত করা হয়েছে।`)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    ড্রাফট
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shareable Posters */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20 text-white">
          <h2 className="font-display font-bold text-white mb-2">প্রিন্ট ও সোশ্যাল পোস্টার</h2>
          <p className="text-white/60 text-xs mb-4 leading-relaxed">আপনার দোকানে টানানোর জন্য এবং সোশ্যাল মিডিয়ায় প্রচারের জন্য</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "কাউন্টার QR টেন্ট", icon: "📋", desc: "A4 সাইজ, স্ট্যান্ড টেন্ট" },
              { title: "স্টোরি ব্যানার", icon: "📱", desc: "Instagram & FB Story 9:16" },
            ].map((p) => (
              <div key={p.title} className="bg-[#071D13] rounded-2xl p-3.5 text-center border border-white/10">
                <span className="text-3xl block mb-2">{p.icon}</span>
                <p className="font-bold text-white text-xs">{p.title}</p>
                <p className="text-white/50 text-[10px] mt-0.5">{p.desc}</p>
                <button
                  onClick={() => alert(`পোস্টার "${p.title}" ডাউনলোড শুরু হয়েছে`)}
                  className="mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] text-xs font-black w-full shadow-md glow-emerald cursor-pointer active:scale-95 transition-all"
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
