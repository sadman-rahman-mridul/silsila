import { useState, useEffect } from "react"
import { api, type Voucher } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import { GiftIcon, ClockIcon } from "../../components/Icons"

export default function RewardsPage() {
  const { user, profile } = useAuth()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    loadVouchers()

    // Real-time Firestore card subscription: auto-detect if customer unlocked any new voucher
    const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (firestoreCards) => {
      if (firestoreCards && firestoreCards.length > 0) {
        const readyCards = firestoreCards.filter((c) => c.voucherReady)
        if (readyCards.length > 0) {
          // Re-sync vouchers
          api.getVouchers(customerId).then(setVouchers).catch(console.warn)
        }
      }
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [customerId])

  async function loadVouchers() {
    try {
      setLoading(true)
      const data = await api.getVouchers(customerId)
      setVouchers(data)
    } catch (err) {
      console.error("Failed to load vouchers:", err)
    } finally {
      setLoading(false)
    }
  }

  const activeVouchers = vouchers.filter((v) => v.status === "active")
  const redeemedVouchers = vouchers.filter((v) => v.status === "redeemed")
  const totalSavedApprox = redeemedVouchers.length * 120

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-10 pb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-1">পুরস্কার</h1>
        <p className="text-[#52B788] text-sm">আপনার অর্জিত সব উপহার ও ভাউচার</p>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-white text-2xl">{vouchers.length}</p>
            <p className="text-white/60 text-xs mt-0.5">মোট অর্জিত</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-[#F59E0B] text-2xl">{activeVouchers.length}</p>
            <p className="text-white/60 text-xs mt-0.5">দাবিযোগ্য</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-white text-2xl">৳{totalSavedApprox}</p>
            <p className="text-white/60 text-xs mt-0.5">সাশ্রয় করেছেন</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {loading ? (
          <div className="py-12 text-center text-[#6B6158] text-sm">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p>পুরস্কার লোড হচ্ছে...</p>
          </div>
        ) : (
          <>
            {activeVouchers.length > 0 && (
              <div className="mb-5">
                <h2 className="font-display font-semibold text-[#1A1916] text-base mb-3 flex items-center gap-1.5">
                  <GiftIcon size={16} className="text-[#F59E0B]" />
                  দাবি করার অপেক্ষায় ({activeVouchers.length})
                </h2>
                <div className="space-y-3">
                  {activeVouchers.map((voucher) => (
                    <div key={voucher.id} className="bg-[#1B4332] rounded-2xl overflow-hidden shadow-md">
                      <div className="bg-[#F59E0B] px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GiftIcon size={13} className="text-[#1B4332]" />
                          <span className="text-[#1B4332] text-xs font-bold">পুরস্কার প্রস্তুত!</span>
                        </div>
                        <span className="text-[10px] bg-[#1B4332] text-[#F59E0B] px-2 py-0.5 rounded-full font-bold">
                          কাউন্টারে দেখান
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <p className="text-white font-display font-bold text-base">{voucher.merchantName || "লয়্যালটি পুরস্কার"}</p>
                          <p className="text-[#52B788] text-sm font-medium">{voucher.rewardText}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 mb-3 flex items-center justify-between">
                          <div>
                            <p className="text-white/50 text-[10px] mb-0.5">ভাউচার কোড</p>
                            <p className="font-display font-black text-[#F59E0B] text-xl tracking-widest">{voucher.code}</p>
                          </div>
                          <button
                            onClick={() => copyCode(voucher.code)}
                            className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/30 font-medium"
                          >
                            {copiedCode === voucher.code ? "কপি হয়েছে ✓" : "কপি"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-white/60 text-xs">
                          <div className="flex items-center gap-1">
                            <ClockIcon size={11} className="text-[#F59E0B]" />
                            <span>মেয়াদ: {voucher.expiresAt}</span>
                          </div>
                          <span className="text-[11px]">কাউন্টারে স্টাফ পিন দিয়ে ভেরিফাই হবে</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-display font-semibold text-[#1A1916] text-base mb-3">ইতিহাস (রিডিমকৃত)</h2>
              <div className="space-y-2">
                {redeemedVouchers.length > 0 ? (
                  redeemedVouchers.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-4 card-shadow flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D8EDDF] flex items-center justify-center flex-shrink-0 text-[#1B4332] font-bold">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-[#1A1916] font-medium text-sm">{item.merchantName || "স্টোর রিওয়ার্ড"}</p>
                        <p className="text-[#6B6158] text-xs">{item.rewardText}</p>
                        <p className="text-[#B0A99E] text-xs mt-0.5">রিডিম তারিখ: {item.redeemedAt || "সম্প্রতি"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#B0A99E] font-mono">{item.code}</span>
                        <p className="text-xs text-[#52B788] font-medium mt-0.5">গৃহীত ✓</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#B0A99E] py-3 text-center">কোনো অতীত রিডিম রেকর্ড নেই</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
