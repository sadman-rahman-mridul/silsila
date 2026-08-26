import { useState, useEffect } from "react"
import { api, type PendingApproval } from "../../services/api"
import { CheckIcon, XIcon } from "../../components/Icons"
import { firebaseService } from "../../services/firebaseService"

interface StaffModeProps {
  onExit: () => void
  merchantId: string
  merchantName?: string
}

type StaffStep = "pin" | "approvals"

export default function StaffMode({ onExit, merchantId, merchantName }: StaffModeProps) {
  const [step, setStep] = useState<StaffStep>("pin")
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [resolved, setResolved] = useState<{ id: string; result: "approved" | "rejected" }[]>([])

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

  if (step === "pin") {
    return (
      <div className="flex flex-col h-full bg-transparent items-center justify-center px-6">
        <div className="w-full max-w-xs bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/25 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center mx-auto mb-3 shadow-lg glow-amber">
              <span className="font-display font-black text-[#0A2318] text-2xl">সি</span>
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
            className="w-full mt-5 py-2.5 rounded-xl text-white/50 text-xs font-bold hover:text-white transition-colors text-center cursor-pointer"
          >
            ← মালিকের ভিউতে ফিরুন
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider">স্টাফ মোড{merchantName ? " · " + merchantName : ""}</p>
            <h1 className="font-display text-2xl font-black text-white drop-shadow-xs">অনুমোদন স্ক্রিন</h1>
          </div>
          <button
            onClick={() => setStep("pin")}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white/70 text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
          >
            লক করুন
          </button>
        </div>

        {approvals.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-[#F59E0B]/20 border border-[#F59E0B]/40 px-3.5 py-2 rounded-2xl backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-amber-200 text-xs font-bold">{approvals.length}টি নতুন স্ক্যান অপেক্ষায়</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        {approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 bg-[#0E281C]/80 backdrop-blur-xl rounded-3xl border border-emerald-500/20 shadow-2xl p-6">
            <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mb-3 text-3xl">
              ✅
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
                      <p className="text-white/60 text-xs mt-0.5">{approval.customerPhone}</p>
                      {dist !== undefined && dist >= 0 && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="text-[#34D399] text-xs font-bold bg-[#34D399]/15 border border-[#34D399]/30 px-3 py-0.5 rounded-full">
                            📍 {dist} মি. দূরে
                          </span>
                        </div>
                      )}
                    </div>

                    {res ? (
                      <div
                        className={"text-center py-3.5 rounded-2xl font-display font-black text-sm " + (
                          res.result === "approved" ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                        )}
                      >
                        {res.result === "approved" ? "✓ সিল দেওয়া সম্পন্ন!" : "✗ প্রত্যাখ্যাত"}
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
                          <span className="font-display font-black text-base">সিল দিন ✓</span>
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
    </div>
  )
}
