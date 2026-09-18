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
    { num: 3, label: isBn ? "পুরস্কার" : "Rewards" },
    { num: 4, label: isBn ? "প্যাকেজ ও পেমেন্ট" : "Payment" },
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

  // Step 4: Package & bKash Payment State
  const [selectedPackage, setSelectedPackage] = useState<"6_months" | "12_months">("6_months")
  const [senderBkashNumber, setSenderBkashNumber] = useState("")
  const [trxId, setTrxId] = useState("")
  const [copiedBkash, setCopiedBkash] = useState(false)
  const [showPendingModal, setShowPendingModal] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function canAdvance() {
    if (step === 1) return bizName.trim().length >= 2 && category !== ""
    if (step === 2) return area.trim().length >= 2 || address.trim().length >= 4
    if (step === 3) return rewardText.trim().length >= 3
    if (step === 4) return senderBkashNumber.trim().length >= 10 && trxId.trim().length >= 4
    return true
  }

  const packagePrice = selectedPackage === "6_months" ? 5000 : 8000
  const bkashNumber = "01681742043"

  function copyBkashNumber() {
    navigator.clipboard?.writeText(bkashNumber)
    setCopiedBkash(true)
    setTimeout(() => setCopiedBkash(false), 2000)
  }

  async function handleCompletePaymentAndSubmit() {
    if (!canAdvance()) {
      setError(isBn ? "প্রেরকের bKash নম্বর ও ট্রানজ্যাকশন আইডি প্রদান করুন" : "Please provide Sender bKash Number and Transaction ID")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const csprngBytes = new Uint8Array(3)
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(csprngBytes)
      } else {
        for (let i = 0; i < 3; i++) csprngBytes[i] = Math.floor(Math.random() * 256)
      }
      const csprngHex = Array.from(csprngBytes).map((b) => b.toString(16).padStart(2, "0")).join("")
      const newId = profile?.merchantId || profile?.id || `m_${Date.now()}_${csprngHex}`
      setCreatedMerchantId(newId)

      const slug = bizName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || newId

      // 1. Direct Cloud Firestore save with pending_approval status
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
        status: "pending",
        approvalStatus: "pending_approval",
        paymentPackage: selectedPackage,
        paymentAmount: packagePrice,
        senderBkashNumber: senderBkashNumber.trim(),
        trxId: trxId.trim(),
        paymentSubmittedAt: new Date().toISOString(),
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
        status: "pending",
        approvalStatus: "pending_approval",
        paymentPackage: selectedPackage,
        paymentAmount: packagePrice,
        senderBkashNumber: senderBkashNumber.trim(),
        trxId: trxId.trim(),
      }).catch(console.warn)

      await api.createRewardProgram({
        merchantId: newId,
        target: rewardTarget,
        rewardText: rewardText.trim(),
        expiryDays,
      }).catch(console.warn)

      setShowPendingModal(true)
    } catch (err: any) {
      console.error("Onboarding failed:", err)
      setError(err.message || "সেটআপ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white">
      <div className="bg-gradient-to-r from-[#064E3B] to-[#0D3824] dark:from-[#0E281C] dark:to-[#0A2318] px-5 pt-12 pb-6 border-b border-emerald-800/30 dark:border-white/10">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shadow-md p-1 border border-emerald-500/30">
              <img src="/sealsela-logo-dark.svg" alt="Sealsela" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-display font-bold">
                {isBn ? "Sealsela-তে স্বাগতম!" : "Welcome to Sealsela!"}
              </p>
              <p className="text-[#34D399] text-xs">
                {isBn ? "আজই আপনার ডিজিটাল লয়্যালটি কার্ড নিন!" : "Get your Digital Loyalty Card Today!"}
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
                      ? "bg-[#10B981] text-[#0A2318]"
                      : s.num === step
                      ? "bg-[#F59E0B] text-[#0A2318]"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {s.num < step ? <CheckIcon size={12} /> : s.num}
                </div>
                <p className={`text-[9px] mt-1 text-center leading-tight w-12 ${s.num === step ? "text-white font-bold" : "text-white/40"}`}>
                  {s.label}
                </p>
              </div>
              {s.num < 4 && (
                <div className={`flex-1 h-0.5 mb-3 ${s.num < step ? "bg-[#10B981]" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-400/40 text-red-600 dark:text-red-300 px-4 py-3 rounded-2xl text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#0F172A] dark:text-white text-xl mb-1">
              {isBn ? "আপনার ব্যবসার তথ্য দিন" : "Enter Business Information"}
            </h2>
            <p className="text-slate-500 dark:text-white/60 text-xs mb-6">
              {isBn ? "এই তথ্য কাস্টমারদের স্মার্টফোন কার্ডে প্রদর্শিত হবে" : "This information will appear on customers' smartphone cards"}
            </p>

            <div className="mb-4">
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-2">
                {isBn ? "ব্র্যান্ড আইকন প্রিভিউ" : "Brand Icon Preview"}
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-[#10B981]/20 border border-emerald-200 dark:border-[#10B981]/30 flex items-center justify-center font-display font-black text-[#064E3B] dark:text-[#34D399] text-2xl">
                  {bizName ? bizName.slice(0, 2) : (isBn ? "দোকান" : "Store")}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/60">
                  {isBn ? "নাম লিখলে স্বয়ংক্রিয়ভাবে তৈরি হবে" : "Generated automatically from business name"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-1.5">
                {isBn ? "দোকান / ব্যবসার নাম *" : "Store / Business Name *"}
              </label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder={isBn ? "যেমন: উত্তরার মিষ্টি মুখ" : "e.g. Uttara Coffee House"}
                className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399] font-semibold"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-2">
                {isBn ? "ক্যাটাগরি *" : "Category *"}
              </label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      category === cat.value
                        ? "bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#0A2318] shadow-sm font-bold"
                        : "bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
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
            <h2 className="font-display font-bold text-[#0F172A] dark:text-white text-xl mb-1">
              {isBn ? "দোকানের অবস্থান" : "Store Location"}
            </h2>
            <p className="text-slate-500 dark:text-white/60 text-xs mb-6">
              {isBn ? "কাস্টমাররা কোথায় আপনার দোকান খুঁজে পাবে?" : "Where can customers find your store?"}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-1.5">
                  {isBn ? "এলাকা / লোকেশন" : "Area / Location"}
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={isBn ? "যেমন: উত্তরা সেক্টর ৭" : "e.g. Banani, Block C"}
                  className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399]"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-1.5">
                  {isBn ? "পূর্ণ ঠিকানা" : "Full Address"}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isBn ? "বাড়ি নম্বর, রোড, এলাকা, শহর" : "House, Road, Area, City"}
                  className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#0F172A] dark:text-white text-xl mb-1">
              {isBn ? "প্রথম লয়্যালটি প্রোগ্রাম" : "First Loyalty Program"}
            </h2>
            <p className="text-slate-500 dark:text-white/60 text-xs mb-6">
              {isBn
                ? "কাস্টমার কতটি সিল সংগ্রহ করলে কী উপহার বা ডিসকাউন্ট পাবে?"
                : "What reward will customers get upon collecting enough stamps?"}
            </p>

            <div className="mb-4">
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-2">
                {isBn ? "প্রয়োজনীয় সিল সংখ্যা (Target)" : "Required Stamps (Target)"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRewardTarget(n)}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      rewardTarget === n
                        ? "bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#0A2318] shadow-sm"
                        : "bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-1.5">
                {isBn ? "পুরস্কারের বিবরণ *" : "Reward Description *"}
              </label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder={isBn ? "যেমন: ১টি ডেজার্ট ফ্রি অথবা ২০০ টাকার ভাউচার" : "e.g. 1 Free Dessert or $5 Off"}
                className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399] font-semibold"
              />
            </div>

            <div className="mb-5">
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-1.5">
                {isBn ? `ভাউচারের মেয়াদ: ${expiryDays} দিন` : `Voucher Validity: ${expiryDays} days`}
              </label>
              <input
                type="range"
                min={7}
                max={60}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full accent-[#059669] dark:accent-[#34D399]"
              />
            </div>

            <div>
              <label className="text-slate-600 dark:text-white/60 text-xs font-medium block mb-2">
                {isBn ? "লাইভ কার্ড প্রিভিউ" : "Live Card Preview"}
              </label>
              <div className="bg-white dark:bg-[#0E281C] rounded-2xl p-4 card-shadow border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-[#10B981]/20 border border-emerald-200 dark:border-[#10B981]/30 flex items-center justify-center font-bold text-[#064E3B] dark:text-[#34D399] text-sm">
                    {bizName ? bizName.slice(0, 2) : "—"}
                  </div>
                  <div>
                    <p className="font-bold text-[#0F172A] dark:text-white text-sm">
                      {bizName || (isBn ? "আপনার দোকান" : "Your Store")}
                    </p>
                    <p className="text-[#059669] dark:text-[#34D399] text-xs font-bold">
                      0/{rewardTarget} {isBn ? "সিল" : "Stamps"}
                    </p>
                  </div>
                </div>
                <StampGrid filled={0} total={rewardTarget} size="sm" />
                <p className="text-slate-500 dark:text-white/60 text-xs mt-3">
                  🎁 {isBn ? "উপহার: " : "Reward: "}
                  <span className="font-bold text-[#0F172A] dark:text-white">{rewardText || "..."}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-slide-up">
            <h2 className="font-display font-bold text-[#0F172A] dark:text-white text-xl mb-1">
              {isBn ? "প্যাকেজ নির্বাচন ও পেমেন্ট" : "Select Package & Payment"}
            </h2>
            <p className="text-slate-500 dark:text-white/60 text-xs mb-5">
              {isBn
                ? "আপনার উপযুক্ত প্যাকেজ নির্বাচন করে bKash-এ সেন্ড মানি করুন।"
                : "Choose a plan and Send Money via bKash to activate your account."}
            </p>

            {/* 1. Package Selector */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Option 1: 6 Months */}
              <div
                onClick={() => setSelectedPackage("6_months")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPackage === "6_months"
                    ? "border-[#059669] dark:border-[#34D399] bg-emerald-50/50 dark:bg-[#10B981]/15 shadow-md"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E281C] hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-white/80">
                    {isBn ? "৬ মাস" : "6 Months"}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPackage === "6_months" ? "border-[#059669] bg-[#059669]" : "border-slate-300"}`}>
                    {selectedPackage === "6_months" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-2xl font-black font-display text-[#064E3B] dark:text-[#34D399]">
                  ৳৫,০০০
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">
                  (5K / 6 Months)
                </p>
              </div>

              {/* Option 2: 12 Months */}
              <div
                onClick={() => setSelectedPackage("12_months")}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                  selectedPackage === "12_months"
                    ? "border-[#F59E0B] bg-amber-50/50 dark:bg-[#F59E0B]/15 shadow-md"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E281C] hover:border-slate-300"
                }`}
              >
                <div className="absolute top-0 right-0 bg-[#F59E0B] text-[#0A2318] text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                  BEST VALUE
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-white/80">
                    {isBn ? "১২ মাস (১ বছর)" : "12 Months (1 Year)"}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPackage === "12_months" ? "border-[#F59E0B] bg-[#F59E0B]" : "border-slate-300"}`}>
                    {selectedPackage === "12_months" && <div className="w-1.5 h-1.5 rounded-full bg-[#0A2318]" />}
                  </div>
                </div>
                <p className="text-2xl font-black font-display text-[#F59E0B]">
                  ৳৮,০০০
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">
                  (8K / 12 Months)
                </p>
              </div>
            </div>

            {/* 2. bKash Instructions Box */}
            <div className="bg-[#E2136E]/10 border border-[#E2136E]/30 rounded-2xl p-4 mb-5 text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-[#E2136E] text-white text-[10px] font-black rounded-md">
                  bKash Send Money
                </span>
                <span className="text-xs font-bold text-[#E2136E] dark:text-pink-300">
                  {isBn ? "সেন্ড মানি করুন" : "Send Exact Amount"}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-white/80 mb-2">
                {isBn
                  ? `নিচের bKash নম্বরে ৳${packagePrice.toLocaleString("bn-BD")} টাকা Send Money করুন:`
                  : `Please Send Money ৳${packagePrice} to the bKash number below:`}
              </p>
              <div className="flex items-center justify-between bg-white dark:bg-[#071D13] p-2.5 rounded-xl border border-[#E2136E]/40">
                <span className="font-mono font-black text-base text-[#E2136E] dark:text-pink-400">
                  {bkashNumber}
                </span>
                <button
                  type="button"
                  onClick={copyBkashNumber}
                  className="px-3 py-1 bg-[#E2136E] hover:bg-[#c20f5c] text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  {copiedBkash ? (isBn ? "✓ কপি হয়েছে" : "✓ Copied") : (isBn ? "কপি করুন" : "Copy")}
                </button>
              </div>
            </div>

            {/* 3. Inputs for Verification */}
            <div className="space-y-3.5 mb-5 text-left">
              <div>
                <label className="text-slate-600 dark:text-white/70 text-xs font-bold block mb-1">
                  {isBn ? "কোন নম্বর থেকে Send Money করেছেন? *" : "Phone Number Money Sent From *"}
                </label>
                <input
                  type="tel"
                  value={senderBkashNumber}
                  onChange={(e) => setSenderBkashNumber(e.target.value)}
                  placeholder={isBn ? "যেমন: 017XXXXXXXX" : "e.g. 017XXXXXXXX"}
                  className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399] font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-white/70 text-xs font-bold block mb-1">
                  {isBn ? "ট্রানজ্যাকশন আইডি (Trans ID) *" : "Transaction ID (Trans ID) *"}
                </label>
                <input
                  type="text"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  placeholder={isBn ? "যেমন: 9K8X7L2M" : "e.g. 9K8X7L2M"}
                  className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-[#0F172A] dark:text-white text-sm outline-none focus:border-[#059669] dark:focus:border-[#34D399] font-mono font-bold uppercase tracking-wider"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 pt-4 bg-white dark:bg-[#0E281C] border-t border-slate-200 dark:border-white/10">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 font-bold text-xs hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
            >
              {isBn ? "← পেছনে" : "← Back"}
            </button>
          )}
          <button
            onClick={() => {
              if (step === 4) {
                handleCompletePaymentAndSubmit()
              } else {
                setStep((s) => s + 1)
              }
            }}
            disabled={!canAdvance() || saving}
            className={`flex-1 py-3.5 rounded-xl font-display font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 shadow-md cursor-pointer ${
              step === 4
                ? "bg-gradient-to-r from-[#10B981] to-[#047857] text-white shadow-emerald-500/20"
                : "bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318]"
            }`}
          >
            {saving
              ? isBn
                ? "পেমেন্ট তথ্য যাচাই হচ্ছে..."
                : "Submitting details..."
              : step === 4
              ? isBn
                ? "পেমেন্ট জমা দিন ও ভেরিফাই করুন ✓"
                : "Submit Payment for Verification ✓"
              : isBn
              ? "পরবর্তী ধাপ →"
              : "Next Step →"}
          </button>
        </div>
        <p className="text-center text-slate-400 dark:text-white/40 text-[10px] mt-2 font-medium">
          {isBn ? `ধাপ ${step} / ${steps.length}` : `Step ${step} of ${steps.length}`}
        </p>
      </div>

      {/* Pending Verification Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
              ⏳
            </div>

            <h3 className="font-display font-black text-[#0F172A] dark:text-white text-xl mb-2">
              {isBn ? "পেমেন্ট ভেরিফিকেশন চলছে" : "Payment Verification Pending"}
            </h3>

            <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 mb-4 text-left">
              <p className="text-[#B45309] dark:text-amber-300 font-bold text-xs leading-relaxed mb-2">
                ⚠️ {isBn ? "Payment Verification er por apni shob feature use korte parben!" : "You can use all features after payment verification is completed!"}
              </p>
              <p className="text-slate-600 dark:text-white/70 text-xs leading-relaxed">
                {isBn
                  ? "অনুগ্রহ করে সর্বোচ্চ ৬ ঘণ্টা অপেক্ষা করুন। অ্যাডমিন থেকে আপনার পেমেন্ট ভেরিফিকেশন সম্পন্ন হলে আপনার নম্বরে একটি কনফার্মেশন এসএমএস পাঠানো হবে।"
                  : "Please wait up to 6 hours. You will receive an SMS confirmation once our Admin verifies your payment details."}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-3 text-left space-y-1.5 mb-5 text-xs text-slate-600 dark:text-white/60">
              <div className="flex justify-between">
                <span>{isBn ? "ব্যবসার নাম:" : "Business:"}</span>
                <span className="font-bold text-slate-900 dark:text-white">{bizName}</span>
              </div>
              <div className="flex justify-between">
                <span>{isBn ? "প্যাকেজ:" : "Package:"}</span>
                <span className="font-bold text-[#059669] dark:text-[#34D399]">
                  {selectedPackage === "6_months" ? "6 Months (৳5,000)" : "12 Months (৳8,000)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{isBn ? "প্রেরক bKash:" : "Sender bKash:"}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{senderBkashNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{isBn ? "Trans ID:" : "Trans ID:"}</span>
                <span className="font-mono font-bold text-[#F59E0B]">{trxId}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (onBack) onBack()
                else window.location.href = "/"
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318] font-bold text-sm shadow-md cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "ঠিক আছে, অপেক্ষা করছি" : "Got it, I will wait"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
