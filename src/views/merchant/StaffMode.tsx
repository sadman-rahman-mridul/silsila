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
      <div className="flex flex-col h-full bg-[#0F2D22] items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#F59E0B] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="font-display font-black text-[#1B4332] text-2xl">সি</span>
            </div>
            <h1 className="font-display font-bold text-white text-2xl">কাউন্টার স্টাফ মোড</h1>
            <p className="text-white/60 text-sm mt-1">৪ সংখ্যার স্টাফ PIN দিন</p>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                  pinError
                    ? "border-red-400 bg-red-400/10"
                    : pin.length > i
                    ? "border-[#52B788] bg-[#52B788]/20"
                    : "border-white/20 bg-white/5"
                }`}
              >
                {pin.length > i && (
                  <div className={`w-4 h-4 rounded-full ${pinError ? "bg-red-400" : "bg-[#52B788]"}`} />
                )}
              </div>
            ))}
          </div>

          {pinError && (
            <p className="text-red-400 text-center text-sm mb-4 animate-slide-up">{pinError}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
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
                className={`h-16 rounded-2xl flex items-center justify-center font-display font-bold text-2xl transition-all active:scale-90 ${
                  d === ""
                    ? "pointer-events-none"
                    : d === "⌫"
                    ? "bg-white/10 text-white/60"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={onExit}
            className="w-full mt-6 py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            ← মালিকের ভিউতে ফিরুন
          </button>

        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0F2D22]">
      <div className="px-5 pt-12 pb-5 bg-[#0F2D22]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#52B788] text-sm font-medium">স্টাফ মোড{merchantName ? ` · ${merchantName}` : ""}</p>
            <h1 className="font-display text-2xl font-bold text-white">অনুমোদন স্ক্রিন</h1>
          </div>
          <button
            onClick={() => setStep("pin")}
            className="px-3 py-2 rounded-xl bg-white/10 text-white/60 text-xs font-medium hover:bg-white/15 transition-all"
          >
            লক করুন
          </button>
        </div>

        {approvals.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[#F59E0B] text-sm font-medium">{approvals.length}টি নতুন স্ক্যান অপেক্ষায়</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
        {approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4 text-4xl">
              ✅
            </div>
            <p className="font-display font-bold text-white text-xl mb-1">সব অনুমোদন সম্পন্ন</p>
            <p className="text-white/40 text-sm">কাউন্টারে কোনো কাস্টমার স্ক্যান করলে এখানে দৃশ্যমান হবে</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => {
              const res = resolved.find((r) => r.id === approval.id)
              const dist = approval.distanceMeters
              return (
                <div
                  key={approval.id}
                  className={`rounded-3xl overflow-hidden transition-all duration-300 ${
                    res?.result === "approved"
                      ? "border-2 border-[#52B788] bg-white"
                      : res?.result === "rejected"
                      ? "border-2 border-red-400/50 bg-white opacity-60"
                      : "bg-white"
                  }`}
                >
                  <div className="p-5">
                    <div className="text-center mb-5">
                      <div className="w-20 h-20 rounded-full bg-[#D8EDDF] flex items-center justify-center mx-auto mb-3">
                        <span className="font-display font-black text-[#1B4332] text-3xl">
                          {approval.customerName?.slice(0, 1) || "ক"}
                        </span>
                      </div>
                      <p className="font-display font-black text-[#1A1916] text-2xl">
                        {approval.customerName || "নাম নেই"}
                      </p>
                      <p className="text-[#6B6158] text-base mt-0.5">{approval.customerPhone}</p>
                      {dist !== undefined && dist >= 0 && (
                        <div className="flex items-center justify-center gap-3 mt-2">
                          <span className="text-[#1B4332] text-sm font-medium bg-[#D8EDDF] px-3 py-1 rounded-full">
                            📍 {dist} মি. দূরে
                          </span>
                        </div>
                      )}
                    </div>

                    {res ? (
                      <div
                        className={`text-center py-4 rounded-2xl font-display font-bold text-lg ${
                          res.result === "approved" ? "bg-[#D8EDDF] text-[#1B4332]" : "bg-red-50 text-red-500"
                        }`}
                      >
                        {res.result === "approved" ? "✓ সিল দেওয়া সম্পন্ন!" : "✗ প্রত্যাখ্যাত"}
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="w-20 h-20 rounded-2xl border-2 border-[#E9E5DC] flex flex-col items-center justify-center gap-1 text-[#B0A99E] transition-all active:scale-90 hover:border-red-300 hover:text-red-400"
                        >
                          <XIcon size={28} />
                          <span className="text-xs font-medium">না</span>
                        </button>
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="flex-1 h-20 rounded-2xl bg-[#1B4332] flex flex-col items-center justify-center gap-1 text-white transition-all active:scale-[0.97] shadow-lg hover:bg-[#143427]"
                        >
                          <CheckIcon size={32} />
                          <span className="font-display font-bold text-xl">সিল দিন ✓</span>
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
