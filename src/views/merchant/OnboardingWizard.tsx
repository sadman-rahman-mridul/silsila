import { useState } from "react"
import QRCode from "qrcode"
import { api } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"
import { BUSINESS_CATEGORIES } from "../../constants/categories"
import { CheckIcon, DownloadIcon, ShareIcon, LogOutIcon } from "../../components/Icons"
import StampGrid from "../../components/StampGrid"

interface OnboardingWizardProps {
  onComplete: (merchantId: string) => void
  onBack?: () => void
}

export default function OnboardingWizard({ onComplete, onBack }: OnboardingWizardProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()

  const steps = [
    { num: 1, label: isBn ? "ব্যবসার তথ্য" : "Business Info" },
    { num: 2, label: isBn ? "লোকেশন" : "Location" },
    { num: 3, label: isBn ? "পুরস্কার প্রোগ্রাম" : "Rewards" },
    { num: 4, label: isBn ? "QR কোড" : "QR Code" },
  ]

  const [step, setStep] = useState(1)
  const [bizName, setBizName] = useState("")
  const [category, setCategory] = useState("")
  const [area, setArea] = useState("")
  const [address, setAddress] = useState("")
  const [rewardTarget, setRewardTarget] = useState(5)
  const [rewardText, setRewardText] = useState("")
  const [expiryDays, setExpiryDays] = useState(30)
  const [createdMerchantId, setCreatedMerchantId] = useState("")
  const [qrLink, setQrLink] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function canAdvance() {
    if (step === 1) return bizName.trim().length >= 2 && category !== ""
    if (step === 2) return area.trim().length >= 2 || address.trim().length >= 4
    if (step === 3) return rewardText.trim().length >= 3
    return true
  }

  async function handleCompleteStep3() {
    setSaving(true)
    setError(null)
    try {
      const newId = profile?.merchantId || profile?.id || `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      setCreatedMerchantId(newId)

      const slug = bizName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || newId

      // 1. Direct Cloud Firestore save
      await firebaseService.saveMerchantProfile({
        id: newId,
        slug,
        name: bizName.trim(),
        nameEn: "",
        category,
        area: area.trim(),
        address: address.trim(),
        ownerPhone: profile?.phone || "",
        ownerName: profile?.name || "",
        rewardTarget,
        rewardText: rewardText.trim(),
        programs: [
          {
            id: `rp_${newId}`,
            merchantId: newId,
            target: rewardTarget,
            rewardText: rewardText.trim(),
            expiryDays,
            active: true,
          },
        ],
        onboarded: true,
      })

      await firebaseService.saveRewardProgram({
        id: `rp_${newId}`,
        merchantId: newId,
        target: rewardTarget,
        rewardText: rewardText.trim(),
        expiryDays,
        active: true,
      })

      // 2. Call backend API with safe fallback
      await api.createMerchant({
        id: newId,
        name: bizName.trim(),
        nameEn: "",
        category,
        area: area.trim(),
        address: address.trim(),
        phone: profile?.phone || "",
        ownerPhone: profile?.phone || "",
        ownerName: profile?.name || "",
        logoInitials: bizName.trim().slice(0, 2),
      }).catch(console.warn)

      await api.createRewardProgram({
        merchantId: newId,
        target: rewardTarget,
        rewardText: rewardText.trim(),
        expiryDays,
      }).catch(console.warn)

      // 3. Generate QR code on client
      const origin = typeof window !== "undefined" ? window.location.origin : "https://silsilaqr.vercel.app"
      const scanUrl = `${origin}/${slug}`
      const qrData = await QRCode.toDataURL(scanUrl, {
        width: 800,
        margin: 2,
        color: { dark: "#1B4332", light: "#FFFFFF" },
      })

      setQrDataUrl(qrData)
      setQrLink(scanUrl)
      setStep(4)
    } catch (err: any) {
      console.error("Onboarding failed:", err)
      setError(err.message || "সেটআপ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।")
    } finally {
      setSaving(false)
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `silsila_qr_${createdMerchantId || "merchant"}.png`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
    }, 200)
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-12 pb-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md">
              <span className="text-[#1B4332] font-black text-sm">{isBn ? "সি" : "S"}</span>
            </div>
            <div>
              <p className="text-white font-display font-bold">
                {isBn ? "সিলসিলায় স্বাগতম!" : "Welcome to Silsila!"}
              </p>
              <p className="text-[#52B788] text-xs">
                {isBn ? "আপনার ব্র্যান্ডের ডিজিটাল Loyalty Card!" : "Your brand's digital loyalty card!"}
              </p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              title={isBn ? "লগআউট / শুরুতে ফিরুন" : "Log out / Exit"}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer active:scale-95 flex-shrink-0"
            >
              <LogOutIcon size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {steps.map((s) => (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s.num < step
                      ? "bg-[#52B788] text-white"
                      : s.num === step
                      ? "bg-[#F59E0B] text-[#1B4332]"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {s.num < step ? <CheckIcon size={12} /> : s.num}
                </div>
                <p className={`text-[9px] mt-1 text-center leading-tight w-12 ${s.num === step ? "text-white/80" : "text-white/30"}`}>
                  {s.label}
                </p>
              </div>
              {s.num < 4 && (
                <div className={`flex-1 h-0.5 mb-3 ${s.num < step ? "bg-[#52B788]" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">
              {isBn ? "আপনার ব্যবসার তথ্য দিন" : "Enter Business Information"}
            </h2>
            <p className="text-[#6B6158] text-xs mb-6">
              {isBn ? "এই তথ্য কাস্টমারদের স্মার্টফোন কার্ডে প্রদর্শিত হবে" : "This information will appear on customers' smartphone cards"}
            </p>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">
                {isBn ? "ব্র্যান্ড আইকন প্রিভিউ" : "Brand Icon Preview"}
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#D8EDDF] flex items-center justify-center font-display font-black text-[#1B4332] text-2xl">
                  {bizName ? bizName.slice(0, 2) : (isBn ? "দোকান" : "Store")}
                </div>
                <p className="text-xs text-[#6B6158]">
                  {isBn ? "নাম লিখলে স্বয়ংক্রিয়ভাবে তৈরি হবে" : "Generated automatically from business name"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">
                {isBn ? "দোকান / ব্যবসার নাম *" : "Store / Business Name *"}
              </label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder={isBn ? "যেমন: উত্তরার মিষ্টি মুখ" : "e.g. Uttara Coffee House"}
                className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3.5 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-semibold"
              />
            </div>

            <div>
              <label className="text-[#6B6158] text-xs font-medium block mb-2">
                {isBn ? "ক্যাটাগরি *" : "Category *"}
              </label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      category === cat.value
                        ? "bg-[#1B4332] text-white shadow-sm"
                        : "bg-white border border-[#E9E5DC] text-[#6B6158]"
                    }`}
                  >
                    {cat.emoji} {isBn ? cat.label : (cat.labelEn || cat.label)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">
              {isBn ? "দোকানের অবস্থান" : "Store Location"}
            </h2>
            <p className="text-[#6B6158] text-xs mb-6">
              {isBn ? "কাস্টমাররা কোথায় আপনার দোকান খুঁজে পাবে?" : "Where can customers find your store?"}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[#6B6158] text-xs font-medium block mb-1.5">
                  {isBn ? "এলাকা / লোকেশন" : "Area / Location"}
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={isBn ? "যেমন: উত্তরা সেক্টর ৭" : "e.g. Banani, Block C"}
                  className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="text-[#6B6158] text-xs font-medium block mb-1.5">
                  {isBn ? "পূর্ণ ঠিকানা" : "Full Address"}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isBn ? "বাড়ি নম্বর, রোড, এলাকা, শহর" : "House, Road, Area, City"}
                  className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">
              {isBn ? "প্রথম লয়্যালটি প্রোগ্রাম" : "First Loyalty Program"}
            </h2>
            <p className="text-[#6B6158] text-xs mb-6">
              {isBn
                ? "কাস্টমার কতটি সিল সংগ্রহ করলে কী উপহার বা ডিসকাউন্ট পাবে?"
                : "What reward will customers get upon collecting enough stamps?"}
            </p>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">
                {isBn ? "প্রয়োজনীয় সিল সংখ্যা (Target)" : "Required Stamps (Target)"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRewardTarget(n)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      rewardTarget === n
                        ? "bg-[#1B4332] text-white shadow-sm"
                        : "bg-white border border-[#E9E5DC] text-[#6B6158]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">
                {isBn ? "পুরস্কারের বিবরণ *" : "Reward Description *"}
              </label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder={isBn ? "যেমন: ১টি ডেজার্ট ফ্রি অথবা ২০০ টাকার ভাউচার" : "e.g. 1 Free Dessert or $5 Off"}
                className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-semibold"
              />
            </div>

            <div className="mb-5">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">
                {isBn ? `ভাউচারের মেয়াদ: ${expiryDays} দিন` : `Voucher Validity: ${expiryDays} days`}
              </label>
              <input
                type="range"
                min={7}
                max={60}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full accent-[#1B4332]"
              />
            </div>

            <div>
              <label className="text-[#6B6158] text-xs font-medium block mb-2">
                {isBn ? "লাইভ কার্ড প্রিভিউ" : "Live Card Preview"}
              </label>
              <div className="bg-white rounded-2xl p-4 card-shadow border border-[#E9E5DC]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D8EDDF] flex items-center justify-center font-bold text-[#1B4332] text-sm">
                    {bizName ? bizName.slice(0, 2) : "—"}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1916] text-sm">
                      {bizName || (isBn ? "আপনার দোকান" : "Your Store")}
                    </p>
                    <p className="text-[#52B788] text-xs font-medium">
                      0/{rewardTarget} {isBn ? "সিল" : "Stamps"}
                    </p>
                  </div>
                </div>
                <StampGrid filled={0} total={rewardTarget} size="sm" />
                <p className="text-[#6B6158] text-xs mt-3">
                  🎁 {isBn ? "উপহার: " : "Reward: "}
                  <span className="font-bold text-[#1A1916]">{rewardText || "..."}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up text-center">
            <div className="w-16 h-16 rounded-full bg-[#D8EDDF] flex items-center justify-center mx-auto mb-3 text-3xl">
              🎉
            </div>
            <h2 className="font-display font-black text-[#1A1916] text-2xl mb-1">
              {isBn ? "দোকান প্রস্তুত!" : "Store Ready!"}
            </h2>
            <p className="text-[#6B6158] text-xs mb-5">
              {isBn
                ? "আপনার কাউন্টার QR কোড তৈরি হয়েছে। এটি প্রিন্ট করে ক্যাশ কাউন্টারে রাখুন।"
                : "Your counter QR code is generated. Print and place it at your counter."}
            </p>

            <div className="bg-white rounded-2xl card-shadow p-5 mb-5 mx-auto max-w-xs border border-[#E9E5DC]">
              <div className="w-44 h-44 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center p-2 border border-gray-100 shadow-inner">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="New Merchant QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-[#1A1916] rounded flex items-center justify-center text-white text-xs">
                    QR Code
                  </div>
                )}
              </div>
              <p className="font-bold text-[#1A1916] text-base">{bizName}</p>
              <p className="text-[#B0A99E] font-mono text-[11px] mt-1">{qrLink}</p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleDownloadQr}
                className="flex-1 py-3 rounded-xl bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <DownloadIcon size={16} /> {isBn ? "QR ডাউনলোড" : "Download QR"}
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://${qrLink}`)}
                className="flex-1 py-3 rounded-xl border border-[#1B4332] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ShareIcon size={16} /> {isBn ? "শেয়ার লিংক" : "Share Link"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 bg-white border-t border-[#E9E5DC]">
        <div className="flex gap-3">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs"
            >
              {isBn ? "← পেছনে" : "← Back"}
            </button>
          )}
          <button
            onClick={() => {
              if (step === 3) {
                handleCompleteStep3()
              } else if (step < 4) {
                setStep((s) => s + 1)
              } else {
                onComplete(createdMerchantId)
              }
            }}
            disabled={!canAdvance() || saving}
            className={`flex-1 py-3.5 rounded-xl font-display font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm ${
              step === 4
                ? "bg-[#F59E0B] text-[#1B4332]"
                : "bg-[#1B4332] text-white"
            }`}
          >
            {saving
              ? isBn
                ? "ডাটাবেজে সংরক্ষণ হচ্ছে..."
                : "Saving to database..."
              : step === 4
              ? isBn
                ? "মার্চেন্ট ড্যাশবোর্ডে যান →"
                : "Go to Dashboard →"
              : step === 3
              ? isBn
                ? "প্রোগ্রাম চালু করুন ও QR তৈরি করুন"
                : "Launch Program & Generate QR"
              : isBn
              ? "পরবর্তী ধাপ →"
              : "Next Step →"}
          </button>
        </div>
        <p className="text-center text-[#B0A99E] text-[10px] mt-2 font-medium">
          {isBn ? `ধাপ ${step} / ${steps.length}` : `Step ${step} of ${steps.length}`}
        </p>
      </div>
    </div>
  )
}
