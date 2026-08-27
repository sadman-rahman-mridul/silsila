import { useState, useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import { api, type CustomerCard, type Merchant, type RewardProgram } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import StampGrid from "../../components/StampGrid"
import {
  ChevronLeftIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  FireIcon,
  ExternalLinkIcon,
  InstagramIcon,
  FacebookIcon,
  GiftIcon,
  CheckIcon,
  AlertTriangleIcon,
} from "../../components/Icons"

interface CardDetailProps {
  merchantId: string
  onBack: () => void
}

export default function CardDetail({ merchantId, onBack }: CardDetailProps) {
  const { user, profile } = useAuth()
  const { isBn } = useLanguage()
  const [data, setData] = useState<{
    card: CustomerCard
    merchant: Merchant
    program: RewardProgram
    programs: RewardProgram[]
    stampsHistory: Array<{ id: string; timestamp: number; formattedDate: string; staffId: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real-time Seal Approval states
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [requestingSeal, setRequestingSeal] = useState(false)
  const [approvalId, setApprovalId] = useState<string | null>(null)
  const [approvalStatus, setApprovalStatus] = useState<"idle" | "waiting" | "approved" | "rejected">("idle")
  const [minimizedWaiting, setMinimizedWaiting] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState<string>("")
  const pollingTimerRef = useRef<any>(null)
  const swipeHandlers = useSwipeBack(onBack)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (!merchantId) return
    loadCardDetail()

    if (customerId) {
      // Live updates for this customer's card at this merchant.
      const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (firestoreCards) => {
        const cleanM = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")
        const matchingCard = firestoreCards.find((c) => {
          const cId = (c.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return c.merchantId === merchantId || cId === cleanM
        })
        if (!matchingCard) return
        setData((prev) => (prev ? { ...prev, card: { ...prev.card, ...matchingCard } } : prev))
      })

      return () => {
        if (typeof unsubscribe === "function") unsubscribe()
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
      }
    }
  }, [merchantId, customerId])

  async function loadCardDetail() {
    if (!merchantId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      let resolvedMerchantId = merchantId
      const fbMerchant = await firebaseService.getMerchantByIdOrSlug(merchantId).catch(() => null)
      if (fbMerchant?.id) {
        resolvedMerchantId = fbMerchant.id
      }

      // 1. Try local API and Firestore Card
      const [apiRes, fbCard, fbPrograms] = await Promise.all([
        customerId ? api.getCardDetail(customerId, resolvedMerchantId).catch(() => null) : Promise.resolve(null),
        customerId ? firebaseService.getCustomerCard(customerId, resolvedMerchantId).catch(() => null) : Promise.resolve(null),
        firebaseService.getRewardPrograms(resolvedMerchantId).catch(() => []),
      ])

      const merchant = fbMerchant || apiRes?.merchant || {
        id: resolvedMerchantId,
        name: resolvedMerchantId,
        area: "ঢাকা",
        category: "ক্যাফে",
      }

      const activeProgramsList = fbPrograms.length > 0
        ? fbPrograms
        : (Array.isArray(merchant.programs) && merchant.programs.length > 0
            ? merchant.programs.filter((p: any) => p && p.rewardText)
            : (merchant.rewardText ? [{
                id: `rp_${resolvedMerchantId}`,
                merchantId: resolvedMerchantId,
                target: merchant.rewardTarget || 5,
                rewardText: merchant.rewardText,
                active: true,
              }] : []))

      const defaultTarget = activeProgramsList[0]?.target || merchant.rewardTarget || 5
      const defaultReward = activeProgramsList[0]?.rewardText || merchant.rewardText || "পুরস্কার"

      const card = {
        id: fbCard?.id || apiRes?.card?.id || (customerId ? `card_${customerId}_${resolvedMerchantId}` : `preview_${resolvedMerchantId}`),
        customerId: customerId || "guest",
        merchantId: resolvedMerchantId,
        programId: fbCard?.programId || activeProgramsList[0]?.id || `prog_${resolvedMerchantId}`,
        stamps: fbCard?.stamps ?? apiRes?.card?.stamps ?? 0,
        cycleNo: fbCard?.cycleNo ?? apiRes?.card?.cycleNo ?? 1,
        streakCount: fbCard?.streakCount ?? apiRes?.card?.streakCount ?? 0,
        lastVisit: fbCard?.lastVisit || apiRes?.card?.lastVisit || new Date().toISOString(),
        target: fbCard?.target || defaultTarget,
        rewardText: fbCard?.rewardText || defaultReward,
        voucherReady: fbCard?.voucherReady ?? apiRes?.card?.voucherReady ?? false,
        merchant,
      }

      setData({
        card,
        merchant,
        program: activeProgramsList[0] || { id: "p1", merchantId: resolvedMerchantId, target: defaultTarget, rewardText: defaultReward, active: true },
        programs: activeProgramsList,
        stampsHistory: apiRes?.stampsHistory || [],
      })

      if (card.voucherReady) {
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } })
        } catch {}
      }
    } catch (err: any) {
      console.error("CardDetail load error:", err)
      setError(err?.message || "কার্ড লোড করতে সমস্যা হয়েছে")
    } finally {
      setLoading(false)
    }
  }

  // Same-day stamp check: customer cannot receive more than 1 stamp per day
  const hasStampToday = (() => {
    if (!data?.card) return false
    const now = new Date()

    // 1. Check card lastVisit / lastStampAt if customer has stamps
    if (Number(data.card.stamps) > 0 && data.card.lastVisit) {
      const lv = new Date(data.card.lastVisit)
      if (
        !isNaN(lv.getTime()) &&
        lv.getFullYear() === now.getFullYear() &&
        lv.getMonth() === now.getMonth() &&
        lv.getDate() === now.getDate()
      ) {
        return true
      }
    }

    // 2. Check stampsHistory array
    if (Array.isArray(data.stampsHistory) && data.stampsHistory.length > 0) {
      return data.stampsHistory.some((s) => {
        if (!s?.timestamp) return false
        const stampDate = new Date(s.timestamp)
        return (
          stampDate.getFullYear() === now.getFullYear() &&
          stampDate.getMonth() === now.getMonth() &&
          stampDate.getDate() === now.getDate()
        )
      })
    }

    return false
  })()

  // Handle "I'm here! Seal My Card"
  async function handleRequestSeal() {
    if (!customerId) return
    if (hasStampToday) {
      setError("আপনি ইতিমধ্যে আজকের জন্য এই দোকানে ১টি সিল পেয়েছেন। ১ দিনে সর্বোচ্চ ১টি সিল সংগ্রহ করা যাবে। পরবর্তী সিলের জন্য অনুগ্রহ করে আগামীকাল আসুন!")
      return
    }
    setRequestingSeal(true)
    setError(null)
    setApprovalMessage("")

    // 1. Get coords if available
    let scanLat: number | undefined
    let scanLng: number | undefined
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => resolve(p),
            () => resolve(null),
            { timeout: 3000 }
          )
        })
        if (pos) {
          scanLat = pos.coords.latitude
          scanLng = pos.coords.longitude
        }
      }
    } catch {
      // ignore
    }

    try {
      const targetId = data?.merchant?.id || merchantId
      const customerName = profile?.name || user?.displayName || "সম্মানিত গ্রাহক"
      const customerPhone = profile?.phone || user?.phoneNumber || ""

      const pendingId = `appr_${Date.now()}`
      const fallbackApproval: any = {
        id: pendingId,
        merchantId: targetId,
        merchantName: data?.merchant?.name || "দোকান",
        customerId,
        customerName,
        customerPhone,
        programId: activeProg?.id || `prog_${targetId}`,
        rewardText: activeProg?.rewardText || card.rewardText || "১টি বিশেষ উপহার",
        timestamp: new Date().toISOString(),
        status: "waiting",
        resolution: "pending",
      }

      // 1. Sync directly to Cloud Firestore (guarantees instant counter popup)
      await firebaseService.syncPendingApproval(fallbackApproval)

      // 2. Call backend API
      const res = await api.requestStamp({
        merchantId: targetId,
        customerId,
        customerName,
        customerPhone,
        scanLat,
        scanLng,
      }).catch(() => ({ pendingApproval: fallbackApproval }))

      const newApprovalId = res?.pendingApproval?.id || pendingId
      setApprovalId(newApprovalId)
      setApprovalStatus("waiting")
      setRequestingSeal(false)

      if (res?.pendingApproval) {
        firebaseService.syncPendingApproval(res.pendingApproval)
      }

      // 3. Listen to approval resolution
      listenForApprovalResolution(newApprovalId)
    } catch (err: any) {
      console.error("Seal request failed:", err)
      setRequestingSeal(false)
      setError(err.message || "সিল অনুরোধ পাঠানো যায়নি। পুনরায় চেষ্টা করুন।")
    }
  }

  function listenForApprovalResolution(id: string) {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)

    // Firestore listener
    const unsub = firebaseService.subscribeApprovalStatus(id, (approval) => {
      if (!approval) return
      if (approval.resolution === "approved") {
        handleApprovalSuccess()
        if (typeof unsub === "function") unsub()
      } else if (approval.resolution === "rejected") {
        setApprovalStatus("rejected")
        setApprovalMessage("দোকানের কাউন্টার থেকে অনুরোধটি প্রত্যাখ্যাত হয়েছে।")
        if (typeof unsub === "function") unsub()
      }
    })

    // Fallback polling every 1.5s
    pollingTimerRef.current = setInterval(async () => {
      try {
        const check = await api.checkApprovalStatus(id)
        if (check.status === "approved") {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
          handleApprovalSuccess()
        } else if (check.status === "rejected") {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
          setApprovalStatus("rejected")
          setApprovalMessage("দোকানের কাউন্টার থেকে অনুরোধটি প্রত্যাখ্যাত হয়েছে।")
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
  }

  function handleApprovalSuccess() {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
    setApprovalStatus("approved")
    setApprovalMessage("অভিনন্দন! আপনার সিল সফলভাবে অনুমোদিত হয়েছে!")

    // Confetti celebration 🎉
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      })
    } catch {
      // ignore
    }

    // Refresh card details so new stamp is visible immediately
    loadCardDetail()
  }

  function handleCopyCode(code: string) {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#071D13] text-white">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl animate-spin mb-3 shadow-xl backdrop-blur-md">
          ⏳
        </div>
        <p className="text-white font-display font-bold text-sm">
          {isBn ? "কার্ডের তথ্য লোড হচ্ছে..." : "Loading card details..."}
        </p>
        <p className="text-white/60 text-xs mt-1">
          {isBn ? "অনুগ্রহ করে একটু অপেক্ষা করুন" : "Please wait a moment"}
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#071D13] p-6 text-center text-white">
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center text-3xl mb-4 shadow-xl">
          ⚠️
        </div>
        <h2 className="font-display font-bold text-white text-lg mb-1">
          {error || (isBn ? "দোকানের তথ্য পাওয়া যায়নি" : "Store information not found")}
        </h2>
        <p className="text-white/60 text-xs mb-6 max-w-xs leading-relaxed">
          {isBn
            ? "দোকানটির কিউআর কোড সঠিক নাও হতে পারে অথবা নেটওয়ার্ক সমস্যা হতে পারে।"
            : "The QR code may be invalid or there is a network issue."}
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border border-white/15"
          >
            {isBn ? "← ফিরে যান" : "← Go Back"}
          </button>
          <button
            onClick={loadCardDetail}
            className="flex-1 py-3 bg-[#F59E0B] text-[#0A2318] font-bold text-xs rounded-xl hover:brightness-105 transition-all cursor-pointer shadow-lg glow-amber"
          >
            {isBn ? "🔄 পুনরায় চেষ্টা" : "🔄 Retry"}
          </button>
        </div>
      </div>
    )
  }

  const { card, merchant, program, programs, stampsHistory } = data
  const activeProg = (programs || []).find((p: any) => p.id === selectedProgramId) || program || programs?.[0]
  const target = activeProg?.target || card.target || 5
  const remaining = Math.max(0, target - card.stamps)
  const pct = Math.min(100, (card.stamps / target) * 100)
  const currentRewardText = activeProg?.rewardText || card.rewardText || (isBn ? "১টি বিশেষ উপহার" : "1 Special Reward")

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto" {...swipeHandlers}>
      {/* UNIFIED SCROLLING CONTAINER */}
      <div>
        {/* Top Header with Merchant Cover Photo */}
        <div className="relative overflow-hidden min-h-[190px]">
          {/* Cover Photo Background or Stylized Fallback */}
          {merchant.coverUrl ? (
            <div className="absolute inset-0 z-0">
              <img
                src={merchant.coverUrl}
                alt={merchant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#071D13]/50 via-[#071D13]/80 to-[#071D13]" />
            </div>
          ) : (
            <div
              className="absolute inset-0 z-0"
              style={{ background: `linear-gradient(145deg, #155E3E 0%, #071D13 100%)` }}
            >
              <div className="absolute inset-0 opacity-10">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-white text-4xl opacity-20 select-none pointer-events-none"
                    style={{ top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, transform: "rotate(-15deg)" }}
                  >
                    {isBn ? "সিল" : "Stamp"}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative z-10 px-3.5 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/20 active:scale-95 shadow-md"
              >
                <ChevronLeftIcon size={16} />
                <span>{isBn ? "হোম" : "Home"}</span>
              </button>

              <button
                onClick={onBack}
                className="flex items-center gap-1.5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity active:scale-95 bg-white/10 px-3 py-1 rounded-xl backdrop-blur-md border border-white/15"
                title={isBn ? "হোমে ফিরুন" : "Back to Home"}
              >
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center p-0.5 border border-emerald-500/30">
                  <img src="/sealsela-logo-dark.svg" alt="Sealsela" className="w-full h-full object-contain" />
                </div>
                <span className="font-display font-black text-white text-xs">
                  {isBn ? "সিলসিলা" : "Sealsela"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-2xl border-2 border-white/30 overflow-hidden flex-shrink-0 bg-[#0A2318] glow-emerald"
                style={{ background: merchant.logoBg || "#0D3824", color: merchant.logoColor || "#34D399" }}
              >
                {merchant.logoUrl ? (
                  <img src={merchant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  merchant.logoInitials || (isBn ? "সিল" : "S")
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-black text-white text-xl truncate drop-shadow-md">
                    {(!isBn && merchant.nameEn) ? merchant.nameEn : merchant.name}
                  </h1>
                  {merchant.verified && (
                    <ShieldCheckIcon size={18} className="text-[#34D399] flex-shrink-0" />
                  )}
                </div>
                <p className="text-white/80 text-xs mt-0.5 drop-shadow-xs font-medium">
                  {merchant.category} · {merchant.area || (isBn ? "ঢাকা" : "Dhaka")}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="px-2 py-0.5 rounded-md bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center gap-1">
                    <FireIcon size={12} className="text-[#F59E0B]" />
                    <span className="text-[#F59E0B] text-[11px] font-bold">
                      {isBn ? `${card.streakCount || 1} সপ্তাহের সিলসিলা` : `${card.streakCount || 1} week streak`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reward Programs Switcher */}
            {programs && programs.length > 1 && (
              <div className="mb-4">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
                  {isBn ? "পুরস্কার কার্ডসমূহ (ট্যাপ করে সিলেক্ট করুন):" : "Reward Programs (tap to select):"}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {programs.map((p: any) => {
                    const isSelected = activeProg?.id === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProgramId(p.id)}
                        className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                          isSelected
                            ? "bg-[#F59E0B] text-[#0A2318] border-[#F59E0B] shadow-lg scale-[1.02] glow-amber"
                            : "bg-[#0E281C]/80 text-white hover:bg-[#123827] border-white/15 backdrop-blur-md"
                        }`}
                      >
                        <span className="text-base">🎁</span>
                        <div className="text-left">
                          <p className="leading-tight font-black">{p.rewardText || (isBn ? "পুরস্কার" : "Reward")}</p>
                          <p className={`text-[10px] font-normal ${isSelected ? "text-[#0A2318]/80" : "text-white/70"}`}>
                            {isBn ? `${p.target}টি সিল প্রয়োজন` : `${p.target} stamps needed`}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stamp Card Component */}
            <div className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-4 border border-emerald-500/25 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider mb-1">
                    {isBn ? "স্ট্যাম্প অগ্রগতি" : "Stamp Progress"}
                  </p>
                  <p className="text-white font-display font-black text-3xl leading-none drop-shadow-sm">
                    {card.stamps}
                    <span className="text-white/40 text-lg font-medium">/{target}</span>
                  </p>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">
                    {card.voucherReady ? (
                      <span className="text-[#F59E0B] font-bold">
                        {isBn ? "✓ উপহার প্রস্তুত! এখনই রিডিম করুন" : "✓ Reward ready! Redeem now"}
                      </span>
                    ) : (
                      <>
                        {isBn ? (
                          <>আর <strong className="text-[#34D399] font-bold">{remaining}টি</strong> সিল বাকি</>
                        ) : (
                          <><strong className="text-[#34D399] font-bold">{remaining}</strong> stamps remaining</>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs font-medium">{isBn ? "চক্র" : "Cycle"}</p>
                  <p className="text-[#34D399] font-display font-bold text-xl">#{card.cycleNo || 1}</p>
                </div>
              </div>

              <div className="bg-[#071D13] p-3.5 rounded-2xl border border-emerald-500/20 mb-3">
                <StampGrid filled={card.stamps} total={target} size="md" variant="coffee" />
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#F59E0B] transition-all duration-700 shadow-sm"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* ACTION BUTTON: "I'm here! Seal My Card" or SAME-DAY LOCK BANNER */}
              {hasStampToday ? (
                <div className="mt-4 p-3.5 bg-[#071D13] border border-emerald-500/20 rounded-2xl text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 text-[#34D399] font-bold text-xs">
                    <CheckIcon size={16} className="text-[#34D399]" />
                    <span>{isBn ? "আজকের সিল সংগ্রহ সম্পন্ন (১টি সিল/দিন)" : "Daily stamp collected (1 stamp/day)"}</span>
                  </div>
                  <p className="text-white/60 text-[11px] mt-1">
                    {isBn ? "পরবর্তী সিল সংগ্রহ করতে অনুগ্রহ করে আগামীকাল আসুন!" : "Please visit tomorrow for your next stamp!"}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestSeal}
                  disabled={requestingSeal || approvalStatus === "waiting"}
                  className="mt-4 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 text-[#0A2318] font-display font-black text-sm shadow-xl glow-amber flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <MapPinIcon size={18} />
                  <span>
                    {requestingSeal
                      ? isBn
                        ? "অনুরোধ পাঠানো হচ্ছে..."
                        : "Sending request..."
                      : isBn
                      ? "আমি এখানে আছি! সিল দাবি করুন"
                      : "I'm here! Seal My Card"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-4 py-3 rounded-2xl animate-fade-in flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-red-300 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white text-xs ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* Card Info & Rules */}
        <div className="px-3.5 py-3 space-y-3 pb-24">
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-emerald-500/20">
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider mb-3">
              {isBn ? "পরবর্তী পুরস্কার" : "Upcoming Reward"}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#0A2318] flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                <GiftIcon size={24} className="text-[#0A2318]" />
              </div>
              <div>
                <p className="font-display font-bold text-white text-base">
                  {card.rewardText || program?.rewardText || (isBn ? "১টি বিশেষ উপহার" : "1 Special Reward")}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {isBn
                    ? `${target}টি সিল সম্পূর্ণ হলে বিনামূল্যে উপহার প্রদান করা হবে`
                    : `Collect ${target} stamps to redeem your reward`}
                </p>
              </div>
            </div>
            {card.voucherReady && card.voucherCode && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-white/70 text-xs mb-1.5 font-medium">
                  {isBn ? "আপনার একক ভাউচার কোড" : "Your Unique Voucher Code"}
                </p>
                <div className="flex items-center justify-between gap-2 bg-[#0A2318] border border-[#34D399]/30 rounded-2xl p-3">
                  <p className="font-display font-black text-[#34D399] text-lg tracking-widest">
                    {card.voucherCode}
                  </p>
                  <button
                    onClick={() => handleCopyCode(card.voucherCode!)}
                    className="text-xs bg-[#34D399] text-[#0A2318] px-3.5 py-1.5 rounded-xl font-black cursor-pointer shadow-sm active:scale-95"
                  >
                    {copied ? (isBn ? "কপি হয়েছে ✓" : "Copied ✓") : isBn ? "কপি" : "Copy"}
                  </button>
                </div>
                <p className="text-white/50 text-[11px] mt-2">
                  {isBn
                    ? "কাউন্টারে এই কোডটি দেখান, স্টাফ পিন দিয়ে রিডিম নিশ্চিত করবেন।"
                    : "Show this code at counter. Staff will verify with their PIN."}
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20">
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider mb-3">
              {isBn ? "সিল অর্জনের ইতিহাস" : "Stamp History"}
            </p>
            <div className="space-y-3">
              {stampsHistory && stampsHistory.length > 0 ? (
                stampsHistory.map((visit, i) => (
                  <div key={visit.id || i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 font-bold text-xs">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {isBn ? `সিল #${stampsHistory.length - i}` : `Stamp #${stampsHistory.length - i}`}
                      </p>
                      <p className="text-white/40 text-xs">{visit.formattedDate}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/50 py-2">
                  {isBn ? "কোনো অতীত ভিজিট রেকর্ড নেই" : "No past visit records"}
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20">
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider mb-3">
              {isBn ? "দোকানের অবস্থান ও সময়সূচি" : "Location & Hours"}
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPinIcon size={16} className="text-[#34D399] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm leading-relaxed">
                    {merchant.address || (isBn ? "ঢাকা, বাংলাদেশ" : "Dhaka, Bangladesh")}
                  </p>
                  {merchant.lat && merchant.lng && (
                    <a
                      href={`https://maps.google.com/?q=${merchant.lat},${merchant.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#34D399] text-xs font-bold mt-1.5 inline-flex items-center gap-1 hover:underline"
                    >
                      {isBn ? "গুগল ম্যাপে দেখুন" : "View on Google Maps"} <ExternalLinkIcon size={11} />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon size={16} className="text-[#34D399] flex-shrink-0" />
                <p className="text-white text-sm">
                  {merchant.hours || (isBn ? "সকাল ৯:০০ - রাত ১০:০০ (প্রতিদিন)" : "9:00 AM – 10:00 PM (Daily)")}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20">
            <p className="text-[#34D399] text-xs font-bold uppercase tracking-wider mb-3">
              {isBn ? "সোশ্যাল মিডিয়া ও রিভিউ" : "Social Media & Reviews"}
            </p>
            <div className="flex flex-wrap gap-2">
              {merchant.instagram && (
                <a
                  href={`https://instagram.com/${merchant.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors border border-white/10"
                >
                  <InstagramIcon size={14} />
                  Instagram
                </a>
              )}
              {merchant.facebook && (
                <a
                  href={`https://facebook.com/${merchant.facebook}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors border border-white/10"
                >
                  <FacebookIcon size={14} />
                  Facebook
                </a>
              )}
              {merchant.reviewLink && (
                <a
                  href={merchant.reviewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0A2318] text-xs font-black shadow-md glow-amber"
                >
                  {isBn ? "⭐ Google রিভিউ দিন" : "⭐ Leave Google Review"}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {card.voucherReady && (
        <div className="fixed bottom-6 left-4 right-4 z-10 max-w-md mx-auto">
          <button
            onClick={() => setShowVoucherModal(true)}
            className="w-full py-4 rounded-2xl bg-[#F59E0B] text-[#1B4332] font-display font-black text-lg shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-bounce cursor-pointer"
          >
            <GiftIcon size={20} /> {isBn ? "পুরস্কার ভাউচার দেখুন" : "View Reward Voucher"}
          </button>
        </div>
      )}

      {/* Floating Status Pill */}
      {approvalStatus === "waiting" && minimizedWaiting && (
        <div className="fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
          <div
            onClick={() => setMinimizedWaiting(false)}
            className="bg-[#1B4332] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between cursor-pointer hover:bg-[#143427] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] animate-ping flex-shrink-0" />
              <div>
                <p className="font-bold text-xs">
                  {isBn ? "সিল অনুমোদনের অপেক্ষায়..." : "Waiting for seal approval..."}
                </p>
                <p className="text-[11px] text-[#52B788]">
                  {isBn ? "মার্চেন্ট অনুমোদনের অপেক্ষায়" : "Awaiting merchant approval"}
                </p>
              </div>
            </div>
            <span className="text-xs bg-[#F59E0B] text-[#1B4332] font-black px-3 py-1 rounded-xl shadow-xs">
              {isBn ? "স্ট্যাটাস দেখুন →" : "View Status →"}
            </span>
          </div>
        </div>
      )}

      {/* Real-Time Approval Modal */}
      {approvalStatus !== "idle" && (!minimizedWaiting || approvalStatus !== "waiting") && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-white">
          <div className="bg-[#0A2318] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center relative">
            {approvalStatus === "waiting" && (
              <button
                onClick={() => setMinimizedWaiting(true)}
                title={isBn ? "মিনিমাইজ করুন" : "Minimize"}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            )}

            {/* STATE 1: WAITING */}
            {approvalStatus === "waiting" && (
              <div>
                <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#F59E0B]/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] border-2 border-white/20 flex items-center justify-center text-[#0A2318] shadow-lg glow-amber">
                    <MapPinIcon size={28} />
                  </div>
                </div>

                <h3 className="font-display font-black text-2xl text-white mb-1.5 drop-shadow-sm">
                  {isBn ? "অনুমোদনের অপেক্ষা..." : "Waiting for Approval..."}
                </h3>
                <p className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider mb-3">
                  {isBn ? "মার্চেন্ট অনুমোদনের অপেক্ষায়" : "Awaiting merchant approval"}
                </p>

                <p className="text-xs text-white/70 leading-relaxed mb-5 bg-[#071D13] p-3.5 rounded-2xl border border-emerald-500/20">
                  {isBn
                    ? "কাউন্টারে আপনার সিল অনুরোধ পাঠানো হয়েছে। মার্চেন্ট অনুমোদন করলেই আপনার কার্ডে নতুন সিল যুক্ত হবে।"
                    : "Stamp request sent to counter. Your stamp will appear as soon as staff approves."}
                </p>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#34D399] mb-5">
                  <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
                  <span>{isBn ? "কাউন্টার কানেক্টেড..." : "Connected to counter..."}</span>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setMinimizedWaiting(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-xs shadow-lg glow-emerald transition-all cursor-pointer active:scale-95"
                  >
                    {isBn ? "লুকান ও ব্রাউজ চালিয়ে যান" : "Minimize & Continue"}
                  </button>

                  <button
                    onClick={async () => {
                      const idToCancel = approvalId
                      setApprovalStatus("idle")
                      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current)
                      if (idToCancel) {
                        await firebaseService.resolveApprovalInFirestore(idToCancel, "rejected")
                      }
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/15 text-white/60 hover:bg-white/10 font-medium text-xs transition-colors cursor-pointer"
                  >
                    {isBn ? "অনুরোধ বাতিল করুন" : "Cancel Request"}
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: APPROVED */}
            {approvalStatus === "approved" && (
              <div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#10B981] to-[#047857] border-2 border-white/30 flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl text-white animate-bounce glow-emerald">
                  ✓
                </div>

                <h3 className="font-display font-black text-2xl text-white mb-1 drop-shadow-sm">
                  {isBn ? "সিল অনুমোদিত!" : "Seal Approved!"}
                </h3>
                <p className="text-sm font-bold text-[#34D399] mb-3">
                  {isBn ? "সিল সফলভাবে যোগ হয়েছে ✓" : "Stamp added successfully ✓"}
                </p>

                <p className="text-xs text-white/70 mb-6 bg-[#071D13] p-3.5 rounded-2xl border border-emerald-500/25">
                  {approvalMessage || (isBn ? "+১টি নতুন সিল আপনার কার্ডে সফলভাবে যুক্ত হয়েছে!" : "+1 new stamp has been added to your card!")}
                </p>

                <button
                  onClick={() => setApprovalStatus("idle")}
                  className="w-full py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#0A2318] font-display font-black text-sm rounded-xl shadow-xl glow-amber transition-all active:scale-[0.98] cursor-pointer"
                >
                  {isBn ? "চমৎকার! কার্ড দেখুন ✓" : "Awesome! View Card ✓"}
                </button>
              </div>
            )}

            {/* STATE 3: REJECTED */}
            {approvalStatus === "rejected" && (
              <div>
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-400/40 flex items-center justify-center text-2xl text-red-300 mx-auto mb-4 shadow-md">
                  ✕
                </div>

                <h3 className="font-display font-black text-xl text-white mb-1">
                  {isBn ? "অনুরোধ প্রত্যাখ্যাত" : "Request Rejected"}
                </h3>
                <p className="text-xs text-white/60 mb-6 bg-[#071D13] p-3 rounded-2xl border border-red-500/20">
                  {approvalMessage || (isBn ? "কাউন্টার থেকে অনুরোধটি অনুমোদন করা যায়নি।" : "The request could not be approved by staff.")}
                </p>

                <button
                  onClick={() => setApprovalStatus("idle")}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  {isBn ? "বন্ধ করুন" : "Close"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voucher Display Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in text-white">
          <div className="bg-[#0A2318] border border-amber-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center mx-auto mb-3 text-3xl shadow-lg glow-amber text-[#0A2318]">
              🎁
            </div>
            <h3 className="font-display font-black text-2xl text-white mb-1 drop-shadow-sm">
              {isBn ? "অভিনন্দন!" : "Congratulations!"}
            </h3>
            <p className="text-xs text-white/70 mb-4">
              {isBn
                ? `আপনি ${merchant.name}-এ `
                : `You've completed `}
              <strong className="text-[#34D399]">{target} {isBn ? "টি সিল" : "stamps"}</strong> {isBn ? "সম্পন্ন করেছেন" : `at ${merchant.name}`}
            </p>

            <div className="bg-[#071D13] border border-emerald-500/25 text-white p-5 rounded-2xl mb-4 shadow-inner">
              <p className="text-xs text-[#34D399] uppercase tracking-widest font-bold mb-1">
                {isBn ? "ভাউচার কোড" : "Voucher Code"}
              </p>
              <p className="font-mono font-black text-2xl tracking-widest text-[#F59E0B]">
                {card.voucherCode || "SL-M1-5X9K"}
              </p>
              <p className="text-xs text-white/80 mt-2 font-medium">
                {isBn ? "পুরস্কার: " : "Reward: "}{card.rewardText || program?.rewardText}
              </p>
            </div>

            <p className="text-xs text-white/60 mb-6">
              {isBn
                ? "দোকানের কাউন্টারে এই কোডটি দেখান। স্টাফ তাদের পিন দিয়ে এটি রিডিম করবেন।"
                : "Show this code at counter. Staff will redeem using their PIN."}
            </p>

            <button
              onClick={() => setShowVoucherModal(false)}
              className="w-full py-3.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0A2318] font-display font-black rounded-xl text-sm shadow-xl glow-amber cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
