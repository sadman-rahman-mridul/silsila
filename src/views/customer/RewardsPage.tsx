import { useState, useEffect } from "react"
import { api, type Voucher } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"
import { GiftIcon, ClockIcon, SparklesIcon } from "../../components/Icons"

export default function RewardsPage() {
  const { user, profile } = useAuth()
  const { isBn } = useLanguage()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    loadVouchers()

    // Real-time Firestore card subscription: auto-detect if customer unlocked any new voucher
    const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (firestoreCards) => {
      if (firestoreCards && firestoreCards.length > 0) {
        loadVouchers()
      }
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [customerId])

  async function loadVouchers() {
    if (!customerId) {
      setVouchers([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      // 1. Fetch real Firestore vouchers
      const fbVouchers = await firebaseService.getCustomerVouchers(customerId).catch(() => [])
      if (fbVouchers && fbVouchers.length > 0) {
        setVouchers(fbVouchers)
        return
      }

      // 2. Fallback to API if any
      const apiData = await api.getVouchers({ customerId }).catch(() => [])
      setVouchers(apiData || [])
    } catch (err) {
      console.error("Failed to load vouchers:", err)
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }

  const activeVouchers = vouchers.filter((v) => v.status === "active")
  const redeemedVouchers = vouchers.filter((v) => v.status === "redeemed")

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 pt-8 pb-4">
        <h1 className="font-display text-2xl font-black text-white mb-1 drop-shadow-sm">
          {isBn ? "পুরস্কার" : "Rewards"}
        </h1>
        <p className="text-[#34D399] text-xs font-semibold">
          {isBn ? "আপনার অর্জিত সব উপহার ও ভাউচার" : "All your earned gifts and vouchers"}
        </p>
        <div className="mt-4 flex gap-2.5">
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-white text-2xl leading-none">{vouchers.length}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">{isBn ? "মোট অর্জিত" : "Total Earned"}</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-[#F59E0B] text-2xl leading-none">{activeVouchers.length}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">{isBn ? "দাবিযোগ্য" : "Claimable"}</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3.5 text-center shadow-lg">
            <p className="font-display font-black text-[#34D399] text-2xl leading-none">{redeemedVouchers.length}</p>
            <p className="text-white/60 text-xs mt-1 font-medium">{isBn ? "ব্যবহৃত" : "Redeemed"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        {loading ? (
          <div className="py-16 text-center text-white/70 text-sm">
            <span className="inline-block animate-spin text-3xl mb-3">⏳</span>
            <p className="font-bold text-white">{isBn ? "পুরস্কার লোড হচ্ছে..." : "Loading rewards..."}</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="py-14 text-center bg-[#0E281C]/80 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/20 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7]/20 border border-[#FEF3C7]/30 text-[#F59E0B] flex items-center justify-center mx-auto mb-3 shadow-lg">
              <GiftIcon size={32} />
            </div>
            <h2 className="font-display font-black text-white text-lg mb-1">
              {isBn ? "এখনো কোনো পুরস্কার অর্জিত হয়নি" : "No rewards earned yet"}
            </h2>
            <p className="text-white/60 text-xs max-w-xs mx-auto leading-relaxed mb-4">
              {isBn
                ? "দোকানে সিল সম্পন্ন করে বিনামূল্যে উপহার ও ভাউচার আনলক করুন!"
                : "Complete loyalty stamps at partner stores to unlock free vouchers!"}
            </p>
            <div className="inline-flex items-center gap-1.5 bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] text-xs px-3.5 py-1.5 rounded-full font-bold">
              <SparklesIcon size={14} />
              <span>{isBn ? "কার্ড সম্পন্ন করলেই ভাউচার কোড মিলবে" : "Complete cards to receive voucher codes"}</span>
            </div>
          </div>
        ) : (
          <>
            {activeVouchers.length > 0 && (
              <div className="mb-6">
                <h2 className="font-display font-bold text-white text-base mb-3 flex items-center gap-1.5 drop-shadow-xs">
                  <GiftIcon size={16} className="text-[#F59E0B]" />
                  <span>{isBn ? `দাবি করার অপেক্ষায় (${activeVouchers.length})` : `Ready to Claim (${activeVouchers.length})`}</span>
                </h2>
                <div className="space-y-3.5">
                  {activeVouchers.map((voucher) => (
                    <div key={voucher.id} className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/25">
                      <div className="bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] px-4 py-2 flex items-center justify-between text-[#0A2318] shadow-sm">
                        <div className="flex items-center gap-2">
                          <GiftIcon size={13} className="text-[#0A2318]" />
                          <span className="text-xs font-black">{isBn ? "পুরস্কার প্রস্তুত!" : "Reward Ready!"}</span>
                        </div>
                        <span className="text-[10px] bg-[#0A2318] text-[#F59E0B] px-2.5 py-0.5 rounded-full font-black">
                          {isBn ? "কাউন্টারে দেখান" : "Show at Counter"}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <p className="text-white font-display font-bold text-base">
                            {voucher.merchantName || (isBn ? "লয়্যালটি পুরস্কার" : "Loyalty Reward")}
                          </p>
                          <p className="text-[#34D399] text-xs font-bold mt-0.5">{voucher.rewardText}</p>
                        </div>
                        <div className="bg-[#071D13] border border-[#34D399]/30 rounded-2xl p-3.5 mb-3 flex items-center justify-between shadow-inner">
                          <div>
                            <p className="text-white/50 text-[10px] mb-0.5 font-medium">{isBn ? "ভাউচার কোড" : "Voucher Code"}</p>
                            <p className="font-display font-black text-[#F59E0B] text-xl tracking-widest">{voucher.code}</p>
                          </div>
                          <button
                            onClick={() => copyCode(voucher.code)}
                            className="bg-[#34D399] text-[#0A2318] text-xs px-3.5 py-1.5 rounded-xl font-black shadow-sm active:scale-95 cursor-pointer"
                          >
                            {copiedCode === voucher.code ? (isBn ? "কপি হয়েছে ✓" : "Copied ✓") : isBn ? "কপি" : "Copy"}
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-white/50 text-xs">
                          <div className="flex items-center gap-1">
                            <ClockIcon size={11} className="text-[#F59E0B]" />
                            <span>{isBn ? "মেয়াদ: ৩০ দিন" : "Validity: 30 days"}</span>
                          </div>
                          <span className="text-[10px]">{isBn ? "কাউন্টারে স্টাফ পিন দিয়ে রিডিম হবে" : "Redeemable with staff PIN"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-display font-bold text-white text-base mb-3 drop-shadow-xs">
                {isBn ? "ইতিহাস (রিডিমকৃত)" : "Redemption History"}
              </h2>
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
                        <p className="text-white/40 text-[11px] mt-0.5">
                          {isBn ? "রিডিম: " : "Redeemed: "}
                          {item.redeemedAt ? new Date(item.redeemedAt).toLocaleDateString(isBn ? "bn-BD" : "en-US") : (isBn ? "সম্পন্ন" : "Completed")}
                        </p>
                      </div>
                      <span className="text-xs text-[#34D399] bg-[#34D399]/15 border border-[#34D399]/20 px-2.5 py-1 rounded-full font-bold">
                        {isBn ? "ব্যবহৃত" : "Redeemed"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/50 py-3 text-center bg-[#0E281C]/60 rounded-2xl border border-white/5">
                    {isBn ? "কোনো অতীত রিডিম রেকর্ড নেই" : "No past redemption records"}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
