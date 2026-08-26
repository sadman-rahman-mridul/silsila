import { useState, useEffect } from "react"
import { api } from "../../services/api"
import { CheckIcon, RefreshIcon } from "../../components/Icons"
import { useLanguage } from "../../context/LanguageContext"

interface StaffPinCardProps {
  merchantId: string
}

type Stage = "idle" | "enter_pin" | "verify_otp"

export default function StaffPinCard({ merchantId }: StaffPinCardProps) {
  const { isBn } = useLanguage()
  const [stage, setStage] = useState<Stage>("idle")
  const [hasPin, setHasPin] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [ownerPhoneMasked, setOwnerPhoneMasked] = useState<string | null>(null)

  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [otp, setOtp] = useState("")

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [merchantId])

  async function loadStatus() {
    try {
      const status = await api.getStaffPinStatus(merchantId)
      setHasPin(status.hasPin)
      setUpdatedAt(status.updatedAt)
      setOwnerPhoneMasked(status.ownerPhoneMasked)
    } catch (err: any) {
      setError(err.message)
    }
  }

  function resetFlow() {
    setStage("idle")
    setPin("")
    setConfirmPin("")
    setOtp("")
    setError(null)
  }

  async function handleRequestOtp() {
    if (!/^\d{4}$/.test(pin)) {
      setError(isBn ? "পিন অবশ্যই ৪ সংখ্যার হতে হবে" : "PIN must be exactly 4 digits")
      return
    }
    if (pin !== confirmPin) {
      setError(isBn ? "দুইবার লেখা পিন মিলছে না" : "PINs do not match")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await api.requestStaffPinOtp(merchantId)
      setNotice(res.message)
      setStage("verify_otp")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (otp.length < 6) {
      setError(isBn ? "৬ ডিজিটের OTP কোড লিখুন" : "Enter 6-digit OTP code")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.setStaffPin(merchantId, pin, otp)
      setNotice(
        hasPin
          ? isBn
            ? "স্টাফ মোড পিন পরিবর্তন হয়েছে ✓"
            : "Staff PIN updated ✓"
          : isBn
          ? "স্টাফ মোড পিন তৈরি হয়েছে ✓"
          : "Staff PIN created ✓"
      )
      resetFlow()
      await loadStatus()
      setTimeout(() => setNotice(null), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
      <div className="flex items-start justify-between gap-3 mb-3 pb-2 border-b border-[#E9E5DC]">
        <div>
          <h2 className="font-display font-bold text-[#1A1916] text-base flex items-center gap-2">
            {isBn ? "স্টাফ মোড পিন" : "Staff Mode PIN"}
          </h2>
          <p className="text-xs text-[#6B6158] mt-0.5">
            {isBn
              ? "কাউন্টার স্টাফ এই ৪ সংখ্যার পিন দিয়ে অনুমোদন স্ক্রিন খুলবেন"
              : "Counter staff will use this 4-digit PIN to access approvals"}
          </p>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
            hasPin ? "text-[#1B4332] bg-[#D8EDDF]" : "text-[#B45309] bg-[#FEF3C7]"
          }`}
        >
          {hasPin ? (isBn ? "সেট করা আছে" : "Active") : (isBn ? "সেট করা হয়নি" : "Not Set")}
        </span>
      </div>

      {notice && (
        <div className="mb-3 bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-3.5 py-2.5 rounded-xl text-xs font-bold">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-xl text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      {stage === "idle" && (
        <div className="space-y-3">
          {hasPin ? (
            <p className="text-xs text-[#6B6158]">
              {isBn
                ? `পিন সক্রিয় আছে${updatedAt ? ` · সর্বশেষ পরিবর্তন ${new Date(updatedAt).toLocaleDateString("bn-BD")}` : ""}। নিরাপত্তার কারণে পিনটি কোথাও দেখানো হয় না।`
                : `PIN is active${updatedAt ? ` · Last updated ${new Date(updatedAt).toLocaleDateString()}` : ""}. For security, the PIN is never displayed.`}
            </p>
          ) : (
            <p className="text-xs text-[#6B6158]">
              {isBn
                ? "এখনো কোনো পিন সেট করা হয়নি। পিন সেট না করা পর্যন্ত স্টাফ মোড খোলা যাবে না।"
                : "No PIN has been set yet. Staff mode cannot be accessed until a PIN is created."}
            </p>
          )}

          <button
            onClick={() => setStage("enter_pin")}
            className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143427] text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            {hasPin ? (isBn ? "পিন পরিবর্তন করুন" : "Change PIN") : (isBn ? "নতুন পিন তৈরি করুন" : "Create New PIN")}
          </button>
        </div>
      )}

      {stage === "enter_pin" && (
        <div className="space-y-3">
          <div>
            <label className="text-[#6B6158] text-xs font-semibold block mb-1">
              {isBn ? "নতুন ৪ সংখ্যার পিন" : "New 4-digit PIN"}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-lg tracking-[0.4em] text-center font-bold text-[#1A1916] outline-none focus:border-[#1B4332]"
            />
          </div>

          <div>
            <label className="text-[#6B6158] text-xs font-semibold block mb-1">
              {isBn ? "পিন পুনরায় লিখুন" : "Re-enter PIN"}
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-lg tracking-[0.4em] text-center font-bold text-[#1A1916] outline-none focus:border-[#1B4332]"
            />
          </div>

          <p className="text-[11px] text-[#6B6158] bg-[#F0F7F2] border border-[#52B788]/30 rounded-xl px-3 py-2">
            {isBn
              ? `নিশ্চিত করতে মালিকের নম্বরে${ownerPhoneMasked ? ` (${ownerPhoneMasked})` : ""} একটি OTP পাঠানো হবে।`
              : `An OTP will be sent to the owner's phone${ownerPhoneMasked ? ` (${ownerPhoneMasked})` : ""} to confirm.`}
          </p>

          <div className="flex gap-2">
            <button
              onClick={resetFlow}
              className="flex-1 py-3 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs cursor-pointer"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </button>
            <button
              onClick={handleRequestOtp}
              disabled={busy}
              className="flex-[2] py-3 rounded-xl bg-[#F59E0B] text-[#1B4332] font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <RefreshIcon size={14} className="animate-spin" /> : null}
              {isBn ? "OTP পাঠান" : "Send OTP"}
            </button>
          </div>
        </div>
      )}

      {stage === "verify_otp" && (
        <div className="space-y-3">
          <div>
            <label className="text-[#6B6158] text-xs font-semibold block mb-1">
              {isBn ? "মালিকের নম্বরে পাঠানো ৬ সংখ্যার OTP" : "6-digit OTP sent to owner's phone"}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="------"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-lg tracking-[0.3em] text-center font-bold text-[#1A1916] outline-none focus:border-[#1B4332]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetFlow}
              className="flex-1 py-3 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs cursor-pointer"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex-[2] py-3 rounded-xl bg-[#1B4332] text-white font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <RefreshIcon size={14} className="animate-spin" /> : <CheckIcon size={14} />}
              {isBn ? "পিন নিশ্চিত করুন" : "Confirm PIN"}
            </button>
          </div>

          <button
            onClick={handleRequestOtp}
            disabled={busy}
            className="w-full py-2 text-[#6B6158] text-xs hover:text-[#1A1916] transition-colors cursor-pointer"
          >
            {isBn ? "আবার OTP পাঠান" : "Resend OTP"}
          </button>
        </div>
      )}
    </div>
  )
}
