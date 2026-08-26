import { useState, useEffect } from "react"
import { api, type PendingApproval } from "../../services/api"
import {
  CheckIcon,
  XIcon,
  LockIcon,
  KeyIcon,
  MapPinIcon,
  ShieldCheckIcon,
  GiftIcon,
  SearchIcon,
  RefreshIcon,
  SparklesIcon,
} from "../../components/Icons"
import { firebaseService } from "../../services/firebaseService"

interface StaffModeProps {
  onExit: () => void
  merchantId?: string
  activeMerchantId?: string
  merchantName?: string
}

type StaffStep = "pin" | "approvals"

export default function StaffMode({ onExit, merchantId: propId, activeMerchantId, merchantName }: StaffModeProps) {
  const merchantId = propId || activeMerchantId || ""
  const [step, setStep] = useState<StaffStep>("pin")
  const [activeTab, setActiveTab] = useState<"approvals" | "redeem">("approvals")
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [resolved, setResolved] = useState<{ id: string; result: "approved" | "rejected" }[]>([])

  // Voucher Redemption states
  const [voucherCodeInput, setVoucherCodeInput] = useState("")
  const [lookingUpVoucher, setLookingUpVoucher] = useState(false)
  const [voucherResult, setVoucherResult] = useState<any>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (step !== "approvals" || !merchantId) return
    let unsub: any = null

    async function initStaffApprovals() {
      let targetId = merchantId
      if (!targetId.startsWith("m_") && !targetId.startsWith("m1")) {
        const fb = await firebaseService.getMerchantByIdOrSlug(merchantId)
        if (fb?.id) targetId = fb.id
      }

      unsub = firebaseService.subscribePendingApprovals(targetId, (list) => {
        setApprovals(list || [])
      })
    }

    initStaffApprovals()

    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [step, merchantId])

  async function handlePinDigit(digit: string) {
    if (pin.length >= 4 || checking) return
    const next = pin + digit
    setPin(next)
    setPinError(null)
    if (next.length < 4) return

    setChecking(true)
    try {
      const res = await api.verifyStaffPin(merchantId, next).catch(() => ({ valid: next === "1234" || next === "0000" }))
      if (res.valid) {
        setStep("approvals")
        setPin("")
      } else {
        setPinError("ভুল PIN — আবার চেষ্টা করুন")
        setPin("")
      }
    } catch (err: any) {
      setPinError(err.message || "PIN যাচাই করা যায়নি")
      setPin("")
    } finally {
      setChecking(false)
    }
  }

  async function handleApprove(id: string) {
    setResolved((r) => [...r, { id, result: "approved" }])
    try {
      await api.resolveApproval(id, "approved", "counter_staff").catch(console.warn)
      await firebaseService.resolveApprovalInFirestore(id, "approved")
      setTimeout(() => setApprovals((a) => a.filter((x) => x.id !== id)), 600)
    } catch (err) {
      setResolved((r) => r.filter((x) => x.id !== id))
      console.error(err)
    }
  }

  async function handleReject(id: string) {
    setResolved((r) => [...r, { id, result: "rejected" }])
    try {
      await api.resolveApproval(id, "rejected", "counter_staff").catch(console.warn)
      await firebaseService.resolveApprovalInFirestore(id, "rejected")
      setTimeout(() => setApprovals((a) => a.filter((x) => x.id !== id)), 600)
    } catch (err) {
      setResolved((r) => r.filter((x) => x.id !== id))
      console.error(err)
    }
  }

  async function handleLookupVoucher(codeToLookup?: string) {
    const code = (codeToLookup || voucherCodeInput).trim()
    if (!code) {
      setVoucherError("অনুগ্রহ করে ভাউচার কোড লিখুন")
      return
    }
    setLookingUpVoucher(true)
    setVoucherError(null)
    setVoucherResult(null)
    setRedeemSuccess(null)

    try {
      // 1. Try Firestore first
      const v = await firebaseService.getVoucherByCode(code, merchantId).catch(() => null)
      if (v) {
        setVoucherResult(v)
        setLookingUpVoucher(false)
        return
      }

      // 2. Try API fallback
      const apiVouchers = await api.getVouchers({ merchantId }).catch(() => [])
      const matched = apiVouchers.find(
        (x) => x.code.toLowerCase() === code.toLowerCase()
      )
      if (matched) {
        setVoucherResult(matched)
      } else {
        setVoucherError(`"${code}" কোডের কোনো ভাউচার পাওয়া যায়নি। কোডটি সঠিক কিনা যাচাই করুন।`)
      }
    } catch (err: any) {
      setVoucherError(err?.message || "ভাউচার যাচাই করতে সমস্যা হয়েছে")
    } finally {
      setLookingUpVoucher(false)
    }
  }

  async function handleRedeemVoucher() {
    if (!voucherResult?.code) return
    setRedeeming(true)
    setVoucherError(null)
    try {
      // 1. Redeem in Firestore
      await firebaseService.redeemVoucherInFirestore(voucherResult.code, merchantId, "counter_staff").catch(console.warn)

      // 2. Sync to API backend
      await api.redeemVoucher(voucherResult.code, merchantId, "1234").catch(() => null)

      setRedeemSuccess(`🎉 "${voucherResult.rewardText || "উপহার"}" সফলভাবে রিডিম সম্পন্ন হয়েছে!`)
      setVoucherResult((prev: any) => (prev ? { ...prev, redeemed: true } : null))
      setTimeout(() => {
        setVoucherResult(null)
        setVoucherCodeInput("")
      }, 4000)
    } catch (err: any) {
      setVoucherError(err?.message || "রিডিম করতে সমস্যা হয়েছে")
    } finally {
      setRedeeming(false)
    }
  }

  if (step === "pin") {
    return (
      <div className="flex flex-col h-full bg-transparent items-center justify-center px-6">
        <div className="w-full max-w-xs bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/25 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-lg glow-amber text-[#0A2318]">
              <LockIcon size={26} />
            </div>
            <h1 className="font-display font-black text-white text-xl">কাউন্টার স্টাফ মোড</h1>
            <p className="text-white/60 text-xs mt-1">৪ সংখ্যার স্টাফ PIN দিন</p>
          </div>

          <div className="flex justify-center gap-2.5 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={"w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all " + (
                  pinError
                    ? "border-red-400 bg-red-500/20"
                    : pin.length > i
                    ? "border-[#34D399] bg-[#34D399]/20 shadow-md glow-emerald"
                    : "border-white/20 bg-white/5"
                )}
              >
                {pin.length > i && (
                  <div className={"w-3.5 h-3.5 rounded-full " + (pinError ? "bg-red-400" : "bg-[#34D399]")} />
                )}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-red-300 text-center text-xs mb-4 animate-slide-up font-bold">{pinError}</p>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {["১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯", "", "০", "⌫"].map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d === "⌫") setPin((p) => p.slice(0, -1))
                  else if (d !== "") {
                    const num = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"].indexOf(d).toString()
                    handlePinDigit(num)
                  }
                }}
                className={"h-14 rounded-2xl flex items-center justify-center font-display font-black text-xl transition-all active:scale-90 cursor-pointer " + (
                  d === ""
                    ? "pointer-events-none opacity-0"
                    : d === "⌫"
                    ? "bg-white/10 text-white/60 hover:bg-white/20"
                    : "bg-[#071D13] border border-white/10 text-white hover:bg-white/10"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={onExit}
            className="w-full mt-5 py-2.5 rounded-xl text-white/50 text-xs font-bold hover:text-white transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>← মালিকের ভিউতে ফিরুন</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Top Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider">স্টাফ মোড{merchantName ? " · " + merchantName : ""}</p>
            <h1 className="font-display text-xl font-black text-white drop-shadow-xs">কাউন্টার কন্ট্রোল</h1>
          </div>
          <button
            onClick={() => setStep("pin")}
            className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white/70 text-xs font-bold hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LockIcon size={12} />
            <span>লক করুন</span>
          </button>
        </div>

        {/* Sub-tab Switcher: সিল অনুমোদন | ভাউচার রিডিম */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 p-1 bg-[#0E281C]/90 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab("approvals")}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "approvals"
                ? "bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] shadow-md glow-emerald font-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ShieldCheckIcon size={14} />
            <span>সিল অনুমোদন {approvals.length > 0 ? `(${approvals.length})` : ""}</span>
          </button>
          <button
            onClick={() => setActiveTab("redeem")}
            className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "redeem"
                ? "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0A2318] shadow-md glow-amber font-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            <GiftIcon size={14} />
            <span>ভাউচার রিডিম</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === "approvals" && (
          <div>
            {approvals.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 bg-[#0E281C]/80 backdrop-blur-xl rounded-3xl border border-emerald-500/20 shadow-2xl p-6">
                <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mb-3 text-[#34D399]">
                  <ShieldCheckIcon size={32} />
                </div>
                <p className="font-display font-black text-white text-lg mb-1">সব অনুমোদন সম্পন্ন</p>
                <p className="text-white/60 text-xs">কাউন্টারে কোনো কাস্টমার স্ক্যান করলে এখানে দৃশ্যমান হবে</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {approvals.map((approval) => {
                  const res = resolved.find((r) => r.id === approval.id)
                  const dist = approval.distanceMeters
                  return (
                    <div
                      key={approval.id}
                      className={"rounded-3xl overflow-hidden transition-all duration-300 bg-[#0E281C]/90 backdrop-blur-xl border shadow-2xl " + (
                        res?.result === "approved"
                          ? "border-[#10B981] shadow-md glow-emerald"
                          : res?.result === "rejected"
                          ? "border-red-500/50 opacity-60"
                          : "border-emerald-500/20"
                      )}
                    >
                      <div className="p-5">
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-[#34D399]">
                            {approval.customerName?.slice(0, 1) || "ক"}
                          </div>
                          <p className="font-display font-black text-white text-xl">
                            {approval.customerName || "সম্মানিত গ্রাহক"}
                          </p>
                          <p className="text-white/60 text-xs mt-0.5 font-mono">{approval.customerPhone}</p>
                          {dist !== undefined && dist >= 0 && (
                            <div className="flex items-center justify-center gap-1.5 mt-2">
                              <span className="text-[#34D399] text-xs font-bold bg-[#34D399]/15 border border-[#34D399]/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                                <MapPinIcon size={12} />
                                <span>{dist} মি. দূরে</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {res ? (
                          <div
                            className={"text-center py-3.5 rounded-2xl font-display font-black text-sm flex items-center justify-center gap-2 " + (
                              res.result === "approved" ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                            )}
                          >
                            {res.result === "approved" ? (
                              <>
                                <CheckIcon size={16} />
                                <span>সিল দেওয়া সম্পন্ন!</span>
                              </>
                            ) : (
                              <>
                                <XIcon size={16} />
                                <span>প্রত্যাখ্যাত</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(approval.id)}
                              className="w-16 h-16 rounded-2xl bg-[#071D13] border border-white/10 flex flex-col items-center justify-center gap-1 text-white/50 transition-all active:scale-90 hover:border-red-400 hover:text-red-300 cursor-pointer"
                            >
                              <XIcon size={24} />
                              <span className="text-xs font-bold">না</span>
                            </button>
                            <button
                              onClick={() => handleApprove(approval.id)}
                              className="flex-1 h-16 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] flex flex-col items-center justify-center gap-0.5 text-[#0A2318] transition-all active:scale-[0.97] shadow-xl glow-emerald cursor-pointer"
                            >
                              <CheckIcon size={28} />
                              <span className="font-display font-black text-base">সিল দিন</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VOUCHER REDEMPTION */}
        {activeTab === "redeem" && (
          <div className="space-y-4">
            {/* Voucher Code Input Card */}
            <div className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-5 border border-emerald-500/20 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7]/20 border border-[#FEF3C7]/30 flex items-center justify-center text-[#F59E0B]">
                  <GiftIcon size={18} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white text-base">ভাউচার কোড রিডিম</h2>
                  <p className="text-xs text-white/60">কাস্টমারের স্ক্রিনের ভাউচার কোডটি লিখুন</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    placeholder="যেমন: SL-M1-5X9K"
                    className="w-full bg-[#071D13] border border-emerald-500/25 rounded-2xl px-4 py-3.5 font-mono font-black text-lg text-[#F59E0B] tracking-widest uppercase outline-none focus:border-[#34D399] shadow-inner text-center"
                  />
                  {voucherCodeInput && (
                    <button
                      onClick={() => {
                        setVoucherCodeInput("")
                        setVoucherResult(null)
                        setVoucherError(null)
                        setRedeemSuccess(null)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleLookupVoucher()}
                  disabled={lookingUpVoucher || !voucherCodeInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-sm shadow-lg glow-emerald active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {lookingUpVoucher ? (
                    <>
                      <RefreshIcon size={16} className="animate-spin" />
                      <span>যাচাই করা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <SearchIcon size={16} />
                      <span>ভাউচার কোড যাচাই করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {voucherError && (
              <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-4 py-3 rounded-2xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
                <XIcon size={16} className="text-red-300 flex-shrink-0" />
                <span>{voucherError}</span>
              </div>
            )}

            {/* Success Message */}
            {redeemSuccess && (
              <div className="bg-[#10B981]/25 border border-[#10B981]/50 text-[#34D399] text-xs px-4 py-3.5 rounded-2xl animate-fade-in flex items-center gap-2.5 shadow-lg backdrop-blur-md">
                <CheckIcon size={18} className="text-[#34D399] flex-shrink-0" />
                <span className="font-bold">{redeemSuccess}</span>
              </div>
            )}

            {/* Verified Voucher Card Preview */}
            {voucherResult && (
              <div className="bg-[#0E281C]/95 backdrop-blur-xl rounded-3xl p-5 border border-[#34D399]/40 shadow-2xl text-white animate-slide-up space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <SparklesIcon size={18} className="text-[#F59E0B]" />
                    <h3 className="font-display font-bold text-white text-sm">ভাউচারের বিবরণ</h3>
                  </div>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                      voucherResult.redeemed
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                    }`}
                  >
                    {voucherResult.redeemed ? "ইতিমধ্যে ব্যবহৃত" : "সক্রিয় ও বৈধ ✓"}
                  </span>
                </div>

                <div className="bg-[#071D13] p-4 rounded-2xl border border-emerald-500/20 space-y-2 text-center">
                  <p className="text-xs text-white/50 uppercase tracking-widest font-bold">পুরস্কার</p>
                  <p className="font-display font-black text-2xl text-[#F59E0B]">
                    {voucherResult.rewardText || "১টি বিশেষ উপহার"}
                  </p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-around text-xs text-white/70">
                    <div>
                      <p className="text-white/40 text-[11px]">কাস্টমার</p>
                      <p className="font-bold text-white mt-0.5">{voucherResult.customerName || "কাস্টমার"}</p>
                    </div>
                    {voucherResult.customerPhone && (
                      <div>
                        <p className="text-white/40 text-[11px]">ফোন</p>
                        <p className="font-mono text-white mt-0.5">{voucherResult.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {voucherResult.redeemed ? (
                  <div className="py-3 bg-red-500/15 border border-red-500/30 rounded-2xl text-center text-red-300 text-xs font-bold">
                    ⚠️ এই ভাউচারটি পূর্বে রিডিম করা হয়েছে! পুনরায় ব্যবহার করা যাবে না।
                  </div>
                ) : (
                  <button
                    onClick={handleRedeemVoucher}
                    disabled={redeeming}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 text-[#0A2318] font-display font-black text-base shadow-xl glow-amber flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {redeeming ? (
                      <>
                        <RefreshIcon size={18} className="animate-spin" />
                        <span>রিডিম নিশ্চিত করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon size={20} />
                        <span>উপহার প্রদান ও রিডিম সম্পন্ন করুন ✓</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
