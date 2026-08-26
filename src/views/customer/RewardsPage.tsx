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
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 pt-8 pb-4">
        <h1 className="font-display text-2xl font-black text-white mb-1 drop-shadow-sm">পুরস্কার</h1>
        <p className="text-[#34D399] text-xs font-semibold">আপনার অর্জিত সব উপহার ও ভাউচার</p>
        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-white text-2xl leading-none">{vouchers.length}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">মোট অর্জিত</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-[#F59E0B] text-2xl leading-none">{activeVouchers.length}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">দাবিযোগ্য</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-[#34D399] text-2xl leading-none">৳{totalSavedApprox}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">সাশ্রয় করেছেন</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        {loading ? (
          <div className="py-12 text-center text-white/70 text-sm">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p>পুরস্কার লোড হচ্ছে...</p>
          </div>
        ) : (
          <>
            {activeVouchers.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display font-bold text-white text-base mb-3 flex items-center gap-1.5 drop-shadow-xs">
                  <GiftIcon size={16} className="text-[#F59E0B]" />
                  দাবি করার অপেক্ষায় ({activeVouchers.length})
                </h2>
                <div className="space-y-3.5">
                  {activeVouchers.map((voucher) => (
                    <div key={voucher.id} className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/25">
                      <div className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-4 py-2 flex items-center justify-between text-[#0A2318] shadow-sm">
                        <div className="flex items-center gap-2">
                          <GiftIcon size={13} className="text-[#0A2318]" />
                          <span className="text-xs font-black">পুরস্কার প্রস্তুত!</span>
                        </div>
                        <span className="text-[10px] bg-[#0A2318] text-[#F59E0B] px-2.5 py-0.5 rounded-full font-black">
                          কাউন্টারে দেখান
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <p className="text-white font-display font-bold text-base">{voucher.merchantName || "লয়্যালটি পুরস্কার"}</p>
                          <p className="text-[#34D399] text-xs font-bold mt-0.5">{voucher.rewardText}</p>
                        </div>
                        <div className="bg-[#071D13] border border-[#34D399]/30 rounded-2xl p-3.5 mb-3 flex items-center justify-between shadow-inner">
                          <div>
                            <p className="text-white/50 text-[10px] mb-0.5 font-medium">ভাউচার কোড</p>
                            <p className="font-display font-black text-[#34D399] text-xl tracking-widest">{voucher.code}</p>
                          </div>
                          <button
                            onClick={() => copyCode(voucher.code)}
                            className="bg-[#34D399] text-[#0A2318] text-xs px-3.5 py-1.5 rounded-xl font-black shadow-sm active:scale-95 cursor-pointer"
                          >
                            {copiedCode === voucher.code ? "কপি হয়েছে ✓" : "কপি"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-white/50 text-xs">
                          <div className="flex items-center gap-1">
                            <ClockIcon size={11} className="text-[#F59E0B]" />
                            <span>মেয়াদ: {voucher.expiresAt}</span>
                          </div>
                          <span className="text-[10px]">কাউন্টারে স্টাফ পিন দিয়ে ভেরিফাই হবে</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-display font-bold text-white text-base mb-3 drop-shadow-xs">ইতিহাস (রিডিমকৃত)</h2>
              <div className="space-y-2.5">
                {redeemedVouchers.length > 0 ? (
                  redeemedVouchers.map((item) => (
                    <div key={item.id} className="bg-[#0E281C]/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-white/10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 flex items-center justify-center flex-shrink-0 font-bold">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-white text-sm">{item.merchantName}</p>
                        <p className="text-[#34D399] text-xs font-medium">{item.rewardText}</p>
                        <p className="text-white/40 text-[11px] mt-0.5">রিডিম: {item.redeemedAt}</p>
                      </div>
                      <span className="text-xs text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/20 px-2.5 py-1 rounded-full font-bold">
                        ব্যবহৃত
                      </span>
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
