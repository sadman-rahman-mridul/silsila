import { useState } from "react"
import { api } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { BUSINESS_CATEGORIES } from "../../constants/categories"
import { CheckIcon, MapPinIcon, DownloadIcon, ShareIcon } from "../../components/Icons"
import StampGrid from "../../components/StampGrid"

interface OnboardingWizardProps {
  onComplete: (merchantId: string) => void
}

const steps = [
  { num: 1, label: "ব্যবসার তথ্য" },
  { num: 2, label: "লোকেশন" },
  { num: 3, label: "পুরস্কার প্রোগ্রাম" },
  { num: 4, label: "QR কোড" },
]

/**
 * First-run setup for a merchant account.
 *
 * Nothing here is pre-filled with sample data — the shop name, category,
 * location and reward all come from the owner, and the merchant record stays
 * un-onboarded until this wizard completes.
 */
export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState(1)
  const [bizName, setBizName] = useState("")
  const [category, setCategory] = useState("")
  const [area, setArea] = useState("")
  const [address, setAddress] = useState("")
  const [lat, setLat] = useState<number>(0)
  const [lng, setLng] = useState<number>(0)
  const [locationSet, setLocationSet] = useState(false)
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
    if (step === 2) return locationSet || address.trim().length >= 4
    if (step === 3) return rewardText.trim().length >= 3
    return true
  }

  function handleUseGPS() {
    if (!navigator.geolocation) {
      setError("এই ব্রাউজারে জিপিএস সাপোর্ট নেই — ঠিকানা লিখুন")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(5)))
        setLng(Number(pos.coords.longitude.toFixed(5)))
        setLocationSet(true)
        setError(null)
      },
      () => setError("লোকেশন অনুমতি দেওয়া হয়নি — অনুগ্রহ করে ঠিকানা লিখুন")
    )
  }

  async function handleCompleteStep3() {
    setSaving(true)
    setError(null)
    try {
      const res = await api.createMerchant({
        name: bizName.trim(),
        nameEn: "",
        category,
        area: area.trim(),
        address: address.trim(),
        lat,
        lng,
        phone: profile?.phone || "",
        ownerPhone: profile?.phone || "",
        ownerName: profile?.name || "",
        logoInitials: bizName.trim().slice(0, 2),
      })

      const newId = res.merchant.id
      setCreatedMerchantId(newId)

      await api.createRewardProgram({
        merchantId: newId,
        target: rewardTarget,
        rewardText: rewardText.trim(),
        expiryDays,
      })

      // Sync onboarding completion to Cloud Firestore
      await firebaseService.saveMerchantProfile({
        id: newId,
        name: bizName.trim(),
        category,
        area,
        address,
        lat,
        lng,
        ownerPhone: profile?.phone || "",
        ownerName: profile?.name || "",
        onboarded: true,
      })

      const qrRes = await api.getMerchantQr(newId)
      setQrDataUrl(qrRes.qrDataUrl)
      setQrLink(qrRes.formattedQrLink)

      setStep(4)
    } catch (err: any) {
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
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md">
            <span className="text-[#1B4332] font-black text-sm">সি</span>
          </div>
          <div>
            <p className="text-white font-display font-bold">সিলসিলায় স্বাগতম!</p>
            <p className="text-[#52B788] text-xs">৩ মিনিটে আপনার ডিজিটাল লয়্যালটি স্ট্যাম্প সেট আপ করুন</p>
          </div>
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
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">আপনার ব্যবসার তথ্য দিন</h2>
            <p className="text-[#6B6158] text-xs mb-6">এই তথ্য কাস্টমারদের স্মার্টফোন কার্ডে প্রদর্শিত হবে</p>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">ব্র্যান্ড আইকন প্রিভিউ</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#D8EDDF] flex items-center justify-center font-display font-black text-[#1B4332] text-2xl">
                  {bizName ? bizName.slice(0, 2) : "দোকান"}
                </div>
                <p className="text-xs text-[#6B6158]">নাম লিখলে স্বয়ংক্রিয়ভাবে তৈরি হবে</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">দোকান / ব্যবসার নাম *</label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="যেমন: উত্তরার মিষ্টি মুখ"
                className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3.5 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-semibold"
              />
            </div>

            <div>
              <label className="text-[#6B6158] text-xs font-medium block mb-2">ক্যাটাগরি *</label>
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
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">দোকানের অবস্থান ও জিওফেন্স</h2>
            <p className="text-[#6B6158] text-xs mb-6">
              অবস্থান নির্ধারণ করলে কাস্টমারের স্ক্যান যাচাই হবে এবং জালিয়াতি রোধ হবে (২০০ মিটার জিওফেন্স)
            </p>

            <button
              onClick={handleUseGPS}
              className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 mb-4 transition-all font-bold text-sm ${
                locationSet
                  ? "bg-[#D8EDDF] text-[#1B4332] border-2 border-[#52B788]"
                  : "bg-[#1B4332] text-white"
              }`}
            >
              <MapPinIcon size={18} />
              {locationSet ? "✓ জিপিএস অবস্থান সিঙ্ক হয়েছে" : "বর্তমান GPS অবস্থান ব্যবহার করুন"}
            </button>

            {locationSet && (
              <div className="bg-white rounded-xl p-4 card-shadow mb-4 border border-[#D8EDDF]">
                <p className="text-[#6B6158] text-xs mb-1 font-medium">নির্ধারিত জিও-কোঅর্ডিনেট</p>
                <p className="font-bold text-[#1A1916] text-sm">{address || area || "ঠিকানা লিখুন"}</p>
                <p className="text-[#B0A99E] font-mono text-[11px] mt-0.5">{lat}°N, {lng}°E</p>
                <div className="mt-2 p-2 bg-[#F0F7F2] rounded-lg text-xs text-[#1B4332] font-semibold">
                  🛡️ ২০০ মিটার জিওফেন্স এনফোর্সড
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[#6B6158] text-xs font-medium block mb-1.5">এলাকা / লোকেশন</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="যেমন: উত্তরা সেক্টর ৭"
                  className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332]"
                />
              </div>
              <div>
                <label className="text-[#6B6158] text-xs font-medium block mb-1.5">পূর্ণ ঠিকানা</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="বাড়ি নম্বর, রোড, এলাকা, শহর"
                  className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-1">প্রথম লয়্যালটি প্রোগ্রাম</h2>
            <p className="text-[#6B6158] text-xs mb-6">কাস্টমার কতটি সিল সংগ্রহ করলে কী উপহার বা ডিসকাউন্ট পাবে?</p>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">প্রয়োজনীয় সিল সংখ্যা (Target)</label>
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
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">পুরস্কারের বিবরণ *</label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder="যেমন: ১টি ডেজার্ট ফ্রি অথবা ২০০ টাকার ভাউচার"
                className="w-full bg-white border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-semibold"
              />
            </div>

            <div className="mb-5">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">ভাউচারের মেয়াদ: {expiryDays} দিন</label>
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
              <label className="text-[#6B6158] text-xs font-medium block mb-2">লাইভ কার্ড প্রিভিউ</label>
              <div className="bg-white rounded-2xl p-4 card-shadow border border-[#E9E5DC]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D8EDDF] flex items-center justify-center font-bold text-[#1B4332] text-sm">
                    {bizName ? bizName.slice(0, 2) : "—"}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1916] text-sm">{bizName || "আপনার দোকান"}</p>
                    <p className="text-[#52B788] text-xs font-medium">০/{rewardTarget} সিল</p>
                  </div>
                </div>
                <StampGrid filled={0} total={rewardTarget} size="sm" />
                <p className="text-[#6B6158] text-xs mt-3">
                  🎁 উপহার: <span className="font-bold text-[#1A1916]">{rewardText || "..."}</span>
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
            <h2 className="font-display font-black text-[#1A1916] text-2xl mb-1">দোকান প্রস্তুত!</h2>
            <p className="text-[#6B6158] text-xs mb-5">
              আপনার কাউন্টার QR কোড তৈরি হয়েছে। এটি প্রিন্ট করে ক্যাশ কাউন্টারে রাখুন।
            </p>

            <div className="bg-white rounded-2xl card-shadow p-5 mb-5 mx-auto max-w-xs border border-[#E9E5DC]">
              <div className="w-44 h-44 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center p-2 border border-gray-100 shadow-inner">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="New Merchant QR" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-[#1A1916] rounded flex items-center justify-center text-white text-xs">
                    QR কোড
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
                <DownloadIcon size={16} /> QR ডাউনলোড
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://${qrLink}`)}
                className="flex-1 py-3 rounded-xl border border-[#1B4332] text-[#1B4332] font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ShareIcon size={16} /> শেয়ার লিংক
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
              ← পেছনে
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
              ? "ডাটাবেজে সংরক্ষণ হচ্ছে..."
              : step === 4
              ? "মার্চেন্ট ড্যাশবোর্ডে যান →"
              : step === 3
              ? "প্রোগ্রাম চালু করুন ও QR তৈরি করুন"
              : "পরবর্তী ধাপ →"}
          </button>
        </div>
        <p className="text-center text-[#B0A99E] text-[10px] mt-2 font-medium">ধাপ {step} / {steps.length}</p>
      </div>
    </div>
  )
}
