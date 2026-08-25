import { useState, useEffect, useRef } from "react"
import confetti from "canvas-confetti"
import { api, type CustomerCard, type Merchant, type RewardProgram } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
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
} from "../../components/Icons"

interface CardDetailProps {
  merchantId: string
  onBack: () => void
}

export default function CardDetail({ merchantId, onBack }: CardDetailProps) {
  const { user, profile } = useAuth()
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

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (!customerId) return
    loadCardDetail()

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
  }, [merchantId, customerId])

  async function loadCardDetail() {
    if (!customerId || !merchantId) {
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
        api.getCardDetail(customerId, resolvedMerchantId).catch(() => null),
        firebaseService.getCustomerCard(customerId, resolvedMerchantId).catch(() => null),
        firebaseService.getRewardPrograms(resolvedMerchantId).catch(() => []),
      ])

      const merchant = fbMerchant || apiRes?.merchant || {
        id: resolvedMerchantId,
        name: "CafeDhaka",
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
        id: fbCard?.id || apiRes?.card?.id || `card_${customerId}_${resolvedMerchantId}`,
        customerId,
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
        program: activeProgramsList[0],
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
  const hasStampToday = Boolean(
    data?.stampsHistory &&
      data.stampsHistory.some((s) => {
        if (!s.timestamp) return false
        const stampDate = new Date(s.timestamp)
        const now = new Date()
        return (
          stampDate.getFullYear() === now.getFullYear() &&
          stampDate.getMonth() === now.getMonth() &&
          stampDate.getDate() === now.getDate()
        )
      })
  )

  // Handle "I'm here! Seal My Card"
  async function handleRequestSeal() {
    if (!customerId) return
    if (hasStampToday) {
      setError("আপনি ইতিমধ্যে আজ এই দোকানে ১টি সিল পেয়েছেন। একই দিনে একাধিক সিল নেওয়া যাবে না। পরবর্তী সিলের জন্য অনুগ্রহ করে আগামীকাল আসুন!")
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
      <div className="flex flex-col h-full items-center justify-center bg-[#F7F5F0]">
        <div className="w-12 h-12 rounded-2xl bg-[#1B4332]/10 flex items-center justify-center text-2xl animate-spin mb-3">
          ⏳
        </div>
        <p className="text-[#1B4332] font-display font-bold text-sm">কার্ডের তথ্য লোড হচ্ছে...</p>
        <p className="text-[#6B6158] text-xs mt-1">অনুগ্রহ করে একটু অপেক্ষা করুন</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#F7F5F0] p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center text-3xl mb-4 shadow-inner">
          ⚠️
        </div>
        <h2 className="font-display font-bold text-[#1A1916] text-lg mb-1">
          {error || "দোকানের তথ্য পাওয়া যায়নি"}
        </h2>
        <p className="text-[#6B6158] text-xs mb-6 max-w-xs leading-relaxed">
          দোকানটির কিউআর কোড সঠিক নাও হতে পারে অথবা নেটওয়ার্ক সমস্যা হতে পারে।
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={onBack}
            className="flex-1 py-3 bg-[#E9E5DC] text-[#1A1916] font-bold text-xs rounded-xl hover:bg-[#DCD7CD] transition-all cursor-pointer"
          >
            ← ফিরে যান
          </button>
          <button
            onClick={loadCardDetail}
            className="flex-1 py-3 bg-[#1B4332] text-white font-bold text-xs rounded-xl hover:bg-[#2D6A4F] transition-all cursor-pointer shadow-md"
          >
            🔄 পুনরায় চেষ্টা
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
  const currentRewardText = activeProg?.rewardText || card.rewardText || "১টি বিশেষ উপহার"

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0] overflow-y-auto">
      {/* UNIFIED SCROLLING CONTAINER */}
      <div>
        {/* Top Gradient Header (Scrolls naturally with content) */}
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(145deg, ${merchant.logoColor || "#1B4332"} 0%, #143427 100%)` }}
        >
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-white text-4xl opacity-20 select-none pointer-events-none"
                style={{ top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, transform: "rotate(-15deg)" }}
              >
                সিল
              </div>
            ))}
          </div>

          <div className="relative px-5 pt-12 pb-6">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold mb-5 backdrop-blur-md transition-colors cursor-pointer border border-white/10"
            >
              <ChevronLeftIcon size={16} />
              <span>ফিরে যান</span>
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-xl shadow-lg border-2 border-white/20 overflow-hidden flex-shrink-0"
                style={{ background: merchant.logoBg || "#D8EDDF", color: merchant.logoColor || "#1B4332" }}
              >
                {merchant.logoUrl ? (
                  <img src={merchant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  merchant.logoInitials || "সিল"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-black text-white text-2xl truncate">{merchant.name}</h1>
                  {merchant.verified && (
                    <ShieldCheckIcon size={18} className="text-[#52B788] flex-shrink-0" />
                  )}
                </div>
                <p className="text-white/70 text-xs mt-0.5">{merchant.category} · {merchant.area || "ঢাকা"}</p>
                <div className="flex items-center gap-1 mt-1">
                  <FireIcon size={13} className="text-[#F59E0B]" />
                  <span className="text-white/80 text-xs font-medium">{card.streakCount || 1} সপ্তাহের সিলসিলা</span>
                </div>
              </div>
            </div>

            {/* Reward Programs Switcher */}
            {programs && programs.length > 1 && (
              <div className="mb-4">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2">
                  পুরস্কার কার্ডসমূহ (ট্যাপ করে সিলেক্ট করুন):
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
                            ? "bg-[#F59E0B] text-[#1B4332] border-[#F59E0B] shadow-lg scale-[1.02]"
                            : "bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm"
                        }`}
                      >
                        <span className="text-base">🎁</span>
                        <div className="text-left">
                          <p className="leading-tight font-black">{p.rewardText || "পুরস্কার"}</p>
                          <p className={`text-[10px] font-normal ${isSelected ? "text-[#1B4332]/80" : "text-white/70"}`}>
                            {p.target}টি সিল প্রয়োজন
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stamp Card Component */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">স্ট্যাম্প অগ্রগতি</p>
                  <p className="text-white font-display font-black text-3xl leading-none">
                    {card.stamps}
                    <span className="text-white/40 text-lg font-medium">/{target}</span>
                  </p>
                  <p className="text-white/70 text-xs mt-1.5 font-medium">
                    {card.voucherReady ? (
                      <span className="text-[#F59E0B] font-bold">✓ উপহার প্রস্তুত! এখনই রিডিম করুন</span>
                    ) : (
                      <>আর <strong className="text-white font-bold">{remaining}টি</strong> সিল বাকি</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">চক্র</p>
                  <p className="text-white font-display font-bold text-xl">#{card.cycleNo || 1}</p>
                </div>
              </div>

              <StampGrid filled={card.stamps} total={target} size="md" />

              <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#F59E0B] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* ACTION BUTTON: "I'm here! Seal My Card" */}
              {hasStampToday ? (
                <div className="mt-4 p-3 bg-white/15 border border-white/25 rounded-2xl text-center">
                  <p className="text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckIcon size={16} className="text-[#52B788]" />
                    আজকের সিল সংগ্রহ করা হয়েছে (১টি/দিন)
                  </p>
                  <p className="text-white/70 text-[11px] mt-1">
                    পরবর্তী সিল সংগ্রহ করতে অনুগ্রহ করে আগামীকাল আসুন!
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestSeal}
                  disabled={requestingSeal || approvalStatus === "waiting"}
                  className="mt-4 w-full py-3.5 px-4 rounded-2xl bg-[#F59E0B] hover:bg-[#E58E00] text-[#1B4332] font-display font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="text-lg">📍</span>
                  <span>{requestingSeal ? "অনুরোধ পাঠানো হচ্ছে..." : "I'm here! Seal My Card"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl animate-fade-in flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 text-xs ml-2 cursor-pointer">✕</button>
          </div>
        )}

        {/* Card Info & Rules (Flows smoothly below) */}
        <div className="px-5 py-4 space-y-3 pb-28">
          <div className="bg-white rounded-2xl p-4 card-shadow">
            <p className="text-[#6B6158] text-xs font-medium uppercase tracking-wider mb-3">পরবর্তী পুরস্কার</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-2xl flex-shrink-0">
                🎁
              </div>
              <div>
                <p className="font-display font-bold text-[#1A1916] text-base">{card.rewardText || program?.rewardText || "১টি বিশেষ উপহার"}</p>
                <p className="text-[#6B6158] text-xs mt-0.5">{target}টি সিল সম্পূর্ণ হলে বিনামূল্যে উপহার প্রদান করা হবে</p>
              </div>
            </div>
            {card.voucherReady && card.voucherCode && (
              <div className="mt-3 pt-3 border-t border-[#E9E5DC]">
                <p className="text-[#6B6158] text-xs mb-1.5 font-medium">আপনার একক ভাউচার কোড</p>
                <div className="flex items-center justify-between gap-2 bg-[#F0F7F2] rounded-xl p-3">
                  <p className="font-display font-black text-[#1B4332] text-lg tracking-widest">
                    {card.voucherCode}
                  </p>
                  <button
                    onClick={() => handleCopyCode(card.voucherCode!)}
                    className="text-xs bg-[#1B4332] text-white px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                  >
                    {copied ? "কপি হয়েছে ✓" : "কপি"}
                  </button>
                </div>
                <p className="text-[#B0A99E] text-xs mt-2">কাউন্টারে এই কোডটি দেখান, স্টাফ পিন দিয়ে রিডিম নিশ্চিত করবেন।</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 card-shadow">
            <p className="text-[#6B6158] text-xs font-medium uppercase tracking-wider mb-3">সিল অর্জনের ইতিহাস</p>
            <div className="space-y-3">
              {stampsHistory && stampsHistory.length > 0 ? (
                stampsHistory.map((visit, i) => (
                  <div key={visit.id || i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#D8EDDF] text-[#1B4332] font-bold text-xs">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1A1916] text-sm font-medium">সিল #{stampsHistory.length - i}</p>
                      <p className="text-[#B0A99E] text-xs">{visit.formattedDate}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#B0A99E] py-2">কোনো অতীত ভিজিট রেকর্ড নেই</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 card-shadow">
            <p className="text-[#6B6158] text-xs font-medium uppercase tracking-wider mb-3">দোকানের অবস্থান ও সময়সূচি</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPinIcon size={16} className="text-[#6B6158] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[#1A1916] text-sm">{merchant.address || "ঢাকা, বাংলাদেশ"}</p>
                  {merchant.lat && merchant.lng && (
                    <a
                      href={`https://maps.google.com/?q=${merchant.lat},${merchant.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1B4332] text-xs font-medium mt-1 flex items-center gap-1 hover:underline"
                    >
                      গুগল ম্যাপে দেখুন <ExternalLinkIcon size={11} />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon size={16} className="text-[#6B6158] flex-shrink-0" />
                <p className="text-[#1A1916] text-sm">সকাল ৯:০০ - রাত ১০:০০ (প্রতিদিন)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 card-shadow">
            <p className="text-[#6B6158] text-xs font-medium uppercase tracking-wider mb-3">সোশ্যাল মিডিয়া ও রিভিউ</p>
            <div className="flex flex-wrap gap-2">
              {merchant.instagram && (
                <a
                  href={`https://instagram.com/${merchant.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F5F0] text-[#1A1916] text-xs font-medium hover:bg-[#E9E5DC] transition-colors"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F5F0] text-[#1A1916] text-xs font-medium hover:bg-[#E9E5DC] transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FEF3C7] text-[#B45309] text-xs font-bold hover:bg-[#FDE68A] transition-colors"
                >
                  ⭐ Google রিভিউ দিন
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
            <GiftIcon size={20} /> পুরস্কার ভাউচার দেখুন
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING STATUS PILL WHEN WAITING & MINIMIZED */}
      {/* ========================================================================= */}
      {approvalStatus === "waiting" && minimizedWaiting && (
        <div className="fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto animate-slide-up">
          <div
            onClick={() => setMinimizedWaiting(false)}
            className="bg-[#1B4332] text-white p-4 rounded-2xl shadow-2xl border border-white/20 flex items-center justify-between cursor-pointer hover:bg-[#143427] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] animate-ping flex-shrink-0" />
              <div>
                <p className="font-bold text-xs">সিল অনুমোদনের অপেক্ষায়...</p>
                <p className="text-[11px] text-[#52B788]">মার্চেন্ট অনুমোদনের অপেক্ষায় (৩০ মিনিট সক্রিয়)</p>
              </div>
            </div>
            <span className="text-xs bg-[#F59E0B] text-[#1B4332] font-black px-3 py-1 rounded-xl shadow-xs">
              স্ট্যাটাস দেখুন →
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL-TIME APPROVAL STATUS MODAL ("Waiting for Approval...") */}
      {/* ========================================================================= */}
      {approvalStatus !== "idle" && (!minimizedWaiting || approvalStatus !== "waiting") && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full card-shadow-md animate-slide-up text-center border border-[#E9E5DC] relative">
            
            {/* Top-right close/minimize button */}
            {approvalStatus === "waiting" && (
              <button
                onClick={() => setMinimizedWaiting(true)}
                title="মিনিমাইজ করুন"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F7F5F0] hover:bg-[#E9E5DC] text-[#6B6158] flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            )}

            {/* STATE 1: WAITING FOR APPROVAL */}
            {approvalStatus === "waiting" && (
              <div>
                <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[#F59E0B]/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-[#FEF3C7] border-2 border-[#F59E0B] flex items-center justify-center text-3xl shadow-inner">
                    📍
                  </div>
                </div>

                <h3 className="font-display font-black text-2xl text-[#1A1916] mb-1.5">
                  Waiting for Approval...
                </h3>
                <p className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider mb-3">
                  মার্চেন্ট অনুমোদনের অপেক্ষায় (৩০ মিনিট সক্রিয়)
                </p>

                <p className="text-xs text-[#6B6158] leading-relaxed mb-5 bg-[#F7F5F0] p-3.5 rounded-2xl border border-[#E9E5DC]">
                  কাউন্টারে আপনার সিল অনুরোধ পাঠানো হয়েছে। মার্চেন্ট অনুমোদন করলেই আপনার কার্ডে নতুন সিল যুক্ত হবে।
                </p>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#1B4332] mb-5">
                  <span className="w-2 h-2 rounded-full bg-[#52B788] animate-ping" />
                  <span>কাউন্টার কানেক্টেড...</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setMinimizedWaiting(true)}
                    className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143427] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    লুকান ও ব্রাউজ চালিয়ে যান
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
                    className="w-full py-2.5 rounded-xl border border-[#E9E5DC] text-[#6B6158] hover:bg-[#F7F5F0] font-medium text-xs transition-colors cursor-pointer"
                  >
                    অনুরোধ বাতিল করুন
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: SEAL APPROVED! */}
            {approvalStatus === "approved" && (
              <div>
                <div className="w-20 h-20 rounded-full bg-[#D8EDDF] border-2 border-[#52B788] flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg text-[#1B4332] animate-bounce">
                  ✓
                </div>

                <h3 className="font-display font-black text-2xl text-[#1B4332] mb-1">
                  Seal Approved!
                </h3>
                <p className="text-sm font-bold text-[#52B788] mb-3">
                  সিল অনুমোদিত হয়েছে! ✓
                </p>

                <p className="text-xs text-[#6B6158] mb-6 bg-[#F0F7F2] p-3.5 rounded-2xl border border-[#52B788]/30">
                  {approvalMessage || "+১টি নতুন সিল আপনার কার্ডে সফলভাবে যুক্ত হয়েছে!"}
                </p>

                <button
                  onClick={() => setApprovalStatus("idle")}
                  className="w-full py-3.5 bg-[#1B4332] hover:bg-[#143427] text-white font-display font-black text-sm rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  চমৎকার! কার্ড দেখুন ✓
                </button>
              </div>
            )}

            {/* STATE 3: REJECTED */}
            {approvalStatus === "rejected" && (
              <div>
                <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-300 flex items-center justify-center text-2xl text-red-500 mx-auto mb-4">
                  ✕
                </div>

                <h3 className="font-display font-black text-xl text-[#1A1916] mb-1">
                  অনুরোধ প্রত্যাখ্যাত
                </h3>
                <p className="text-xs text-[#6B6158] mb-6">
                  {approvalMessage || "কাউন্টার থেকে অনুরোধটি অনুমোদন করা যায়নি।"}
                </p>

                <button
                  onClick={() => setApprovalStatus("idle")}
                  className="w-full py-3 bg-[#6B6158] text-white font-bold text-xs rounded-xl"
                >
                  বন্ধ করুন
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voucher Display Modal */}
      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full card-shadow-md animate-slide-up text-center">
            <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center mx-auto mb-3 text-3xl">
              🎁
            </div>
            <h3 className="font-display font-black text-2xl text-[#1A1916] mb-1">অভিনন্দন!</h3>
            <p className="text-sm text-[#6B6158] mb-4">
              আপনি {merchant.name}-এ <strong>{target}টি সিল</strong> সম্পন্ন করেছেন
            </p>

            <div className="bg-[#1B4332] text-white p-5 rounded-2xl mb-4">
              <p className="text-xs text-[#52B788] uppercase tracking-widest font-bold mb-1">ভাউচার কোড</p>
              <p className="font-mono font-black text-2xl tracking-widest text-[#F59E0B]">
                {card.voucherCode || "SL-M1-5X9K"}
              </p>
              <p className="text-xs text-white/70 mt-2">
                পুরস্কার: {card.rewardText || program?.rewardText}
              </p>
            </div>

            <p className="text-xs text-[#6B6158] mb-6">
              দোকানের কাউন্টারে এই কোডটি দেখান। স্টাফ তাদের পিন দিয়ে এটি রিডিম করবেন।
            </p>

            <button
              onClick={() => setShowVoucherModal(false)}
              className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl text-sm cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
