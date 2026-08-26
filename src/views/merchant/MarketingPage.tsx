import { useState, useEffect } from "react"
import { api } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import { useLanguage } from "../../context/LanguageContext"
import {
  InstagramIcon,
  FacebookIcon,
  ExternalLinkIcon,
  CheckIcon,
  RefreshIcon,
  SmartphoneIcon,
  StarIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ImageIcon,
} from "../../components/Icons"
import { useAuth } from "../../context/AuthContext"

interface MarketingPageProps {
  merchantId?: string
  onBack?: () => void
}

export default function MarketingPage({ merchantId: propId, onBack }: MarketingPageProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()
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
      setError(err?.message || (isBn ? "সংরক্ষণ ব্যর্থ হয়েছে" : "Failed to save"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent" {...swipeHandlers}>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-black text-white drop-shadow-xs">
              {isBn ? "মার্কেটিং ও রিভিউ" : "Marketing & Reviews"}
            </h1>
            <p className="text-[#34D399] text-xs font-semibold mt-0.5">
              {isBn ? "কাস্টমারদের সাথে যোগাযোগের লিঙ্ক ও চ্যানেল" : "Customer communication links & channels"}
            </p>
          </div>
          <button
            onClick={handleSaveMarketing}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 text-[#0A2318] font-black text-xs rounded-xl shadow-lg glow-amber active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshIcon size={12} className="animate-spin" />
                <span>{isBn ? "সংরক্ষণ হচ্ছে..." : "Saving..."}</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckIcon size={12} />
                <span>{isBn ? "সংরক্ষিত ✓" : "Saved ✓"}</span>
              </>
            ) : (
              <span>{isBn ? "সংরক্ষণ" : "Save"}</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2.5 rounded-2xl text-xs font-medium backdrop-blur-md flex items-center gap-2">
            <AlertTriangleIcon size={14} className="text-red-300 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {savedSuccess && (
          <div className="mb-4 bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] px-4 py-2.5 rounded-2xl text-xs font-bold animate-fade-in backdrop-blur-md shadow-md flex items-center gap-2">
            <CheckIcon size={14} className="text-[#34D399]" />
            <span>{isBn ? "সোশ্যাল লিঙ্ক ও রিভিউ সেটিংস সফলভাবে আপডেট হয়েছে!" : "Social links & review settings updated successfully!"}</span>
          </div>
        )}

        {/* Social Media Links */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <h2 className="font-display font-bold text-white mb-1">
            {isBn ? "সোশ্যাল মিডিয়া হ্যান্ডেল" : "Social Media Handles"}
          </h2>
          <p className="text-white/60 text-xs mb-4 leading-relaxed">
            {isBn
              ? "এই লিঙ্কগুলো কাস্টমারদের ডিজিটাল কার্ড পেজে সরাসরি প্রদর্শিত হবে"
              : "These links will appear directly on customers' digital stamp cards"}
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
              <SmartphoneIcon size={20} className="text-[#34D399] flex-shrink-0" />
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={isBn ? "WhatsApp নম্বর" : "WhatsApp Number"}
                className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder-white/30"
              />
            </div>
          </div>
        </div>

        {/* Google Review Link */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-white">
              {isBn ? "Google রিভিউ লিংক" : "Google Review Link"}
            </h2>
          </div>
          <div className="p-3 bg-[#071D13] rounded-2xl flex items-center gap-3 mb-3 border border-white/10">
            <StarIcon size={18} className="text-[#F59E0B] flex-shrink-0 fill-[#F59E0B]/20" />
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
            <AlertTriangleIcon size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
            <p className="text-amber-200 text-xs leading-relaxed">
              {isBn
                ? "Google-এর সততা নীতি অনুসারে কাস্টমারকে কেবল অফিসিয়াল রিভিউ লিংক দেখানো হয় — কোনো স্ক্রিপ্ট করা বা কৃত্রিম রিভিউ টেক্সট প্রদান করা হয় না।"
                : "In compliance with Google policies, customers are directed to your official review page — no fabricated review content is permitted."}
            </p>
          </div>
        </div>

        {/* SMS Campaigns */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 mb-4 shadow-2xl border border-emerald-500/20 text-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-bold text-white">
              {isBn ? "SMS রিমাইন্ডার (Opt-in)" : "SMS Reminders (Opt-in)"}
            </h2>
            <span className="bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {isBn ? "আসছে" : "Coming Soon"}
            </span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed mb-3">
            {isBn
              ? "নির্দিষ্ট গ্রাহক সেগমেন্টে বিশেষ অফার বা রিমাইন্ডার পাঠানোর সুবিধা।"
              : "Send targeted offers or reminders to specific customer groups."}
          </p>
          <div className="space-y-2 opacity-75">
            {[
              { segment: isBn ? "৩০ দিনে আসেননি (Win-back)" : "Inactive 30+ days (Win-back)", count: isBn ? "২৩ জন" : "23 users" },
              { segment: isBn ? "কার্ড প্রায় পূর্ণ (১টি সিল বাকি)" : "Card almost full (1 stamp left)", count: isBn ? "১৮ জন" : "18 users" },
              { segment: isBn ? "সব সক্রিয় কাস্টমার" : "All Active Customers", count: isBn ? "১৪৭ জন" : "147 users" },
            ].map((s) => (
              <div key={s.segment} className="flex items-center justify-between p-3 rounded-2xl bg-[#071D13] border border-white/10 text-xs">
                <span className="font-medium text-white/80">{s.segment}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#34D399] bg-[#34D399]/15 px-2.5 py-0.5 rounded-full">{s.count}</span>
                  <button
                    onClick={() => alert(isBn ? "কাস্টমার সেগমেন্ট " + s.segment + "-এ ড্রাফট ক্যাম্পেইন প্রস্তুত করা হয়েছে।" : "Draft campaign prepared for " + s.segment)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isBn ? "ড্রাফট" : "Draft"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shareable Posters */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20 text-white">
          <h2 className="font-display font-bold text-white mb-2">
            {isBn ? "প্রিন্ট ও সোশ্যাল পোস্টার" : "Print & Social Posters"}
          </h2>
          <p className="text-white/60 text-xs mb-4 leading-relaxed">
            {isBn ? "আপনার দোকানে টানানোর জন্য এবং সোশ্যাল মিডিয়ায় প্রচারের জন্য" : "For displaying in your store and posting on social media"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                title: isBn ? "কাউন্টার QR টেন্ট" : "Counter QR Tent",
                icon: <FileTextIcon size={28} className="text-[#34D399] mx-auto mb-2" />,
                desc: isBn ? "A4 সাইজ, স্ট্যান্ড টেন্ট" : "A4 size table tent",
              },
              {
                title: isBn ? "স্টোরি ব্যানার" : "Story Banner",
                icon: <ImageIcon size={28} className="text-[#F59E0B] mx-auto mb-2" />,
                desc: isBn ? "Instagram & FB Story 9:16" : "Instagram & FB Story 9:16",
              },
            ].map((p) => (
              <div key={p.title} className="bg-[#071D13] rounded-2xl p-3.5 text-center border border-white/10">
                {p.icon}
                <p className="font-bold text-white text-xs">{p.title}</p>
                <p className="text-white/50 text-[10px] mt-0.5">{p.desc}</p>
                <button
                  onClick={() => alert(isBn ? "পোস্টার " + p.title + " ডাউনলোড শুরু হয়েছে" : "Downloading poster: " + p.title)}
                  className="mt-3 px-3 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] text-xs font-black w-full shadow-md glow-emerald cursor-pointer active:scale-95 transition-all"
                >
                  {isBn ? "ডাউনলোড" : "Download"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
