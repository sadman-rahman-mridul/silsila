import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { api, type PendingApproval, type RewardProgram, type Merchant, generateMerchantSlug } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"
import {
  CheckIcon,
  XIcon,
  MapPinIcon,
  RefreshIcon,
  UsersIcon,
  SettingsIcon,
  DownloadIcon,
  CopyIcon,
  QRIcon,
  LogOutIcon,
  ShieldCheckIcon,
  GiftIcon,
  SearchIcon,
  SparklesIcon,
} from "../../components/Icons"

interface MerchantDashboardProps {
  merchantId: string
  onMerchantChange: (id: string) => void
  onViewCustomers: () => void
  onOpenSettings?: () => void
  onLogout?: () => void
}

export default function MerchantDashboard({
  merchantId,
  onMerchantChange,
  onViewCustomers,
  onOpenSettings,
  onLogout,
}: MerchantDashboardProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()

  const [ownedMerchants, setOwnedMerchants] = useState<Merchant[]>([])
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [program, setProgram] = useState<RewardProgram | null>(null)
  const [approved, setApproved] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Voucher Quick Redeem Modal States
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [voucherCodeInput, setVoucherCodeInput] = useState("")
  const [lookingUpVoucher, setLookingUpVoucher] = useState(false)
  const [voucherResult, setVoucherResult] = useState<any>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)

  // Subscribe to only this owner's brands — never the full merchant collection
  useEffect(() => {
    const ownerPhone = profile?.phone || ""
    if (!ownerPhone) return

    const unsub = firebaseService.subscribeOwnedMerchants(ownerPhone, (merchants) => {
      setOwnedMerchants(merchants)
      const active = merchants.find((m) => m.id === merchantId) || merchants[0] || null
      setActiveMerchant(active)
    })
    return () => { if (typeof unsub === "function") unsub() }
  }, [profile?.phone])

  // Subscribe to the live merchant document
  useEffect(() => {
    if (!merchantId) return
    const unsub = firebaseService.subscribeMerchant(merchantId, (m) => {
      if (m) setActiveMerchant(m)
    })
    return () => { if (typeof unsub === "function") unsub() }
  }, [merchantId])

  // Subscribe & listen for pending approvals in real-time
  useEffect(() => {
    if (!merchantId) return
    let unsubscribe: any = null

    async function initApprovalsSubscription() {
      let targetId = merchantId
      if (!targetId.startsWith("m_") && !targetId.startsWith("m1")) {
        const fb = await firebaseService.getMerchantByIdOrSlug(merchantId)
        if (fb?.id) targetId = fb.id
      }

      unsubscribe = firebaseService.subscribePendingApprovals(targetId, (data) => {
        setApprovals(data || [])
      })
    }

    initApprovalsSubscription()

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [merchantId])

  // Load reward program
  useEffect(() => {
    if (!merchantId) return
    loadPrograms()
  }, [merchantId])

  async function loadPrograms() {
    setLoading(true)
    try {
      const data = await api.getRewardPrograms(merchantId)
      setProgram(data && data.length > 0 ? data[0] : null)
    } catch (err) {
      console.warn("Failed to load programs:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setApproved((p) => [...p, id])
    setApprovals((prev) => prev.filter((x) => x.id !== id))
    try {
      await firebaseService.resolveApprovalInFirestore(id, "approved")
      await api.resolveApproval(id, "approved", "staff_owner").catch(console.warn)
    } catch (err) {
      console.error("Approve failed:", err)
    }
  }

  async function handleReject(id: string) {
    setRejected((p) => [...p, id])
    setApprovals((prev) => prev.filter((x) => x.id !== id))
    try {
      await firebaseService.resolveApprovalInFirestore(id, "rejected")
      await api.resolveApproval(id, "rejected", "staff_owner").catch(console.warn)
    } catch (err) {
      console.error("Reject failed:", err)
    }
  }

  const [downloadingQr, setDownloadingQr] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [qrDownloadedToast, setQrDownloadedToast] = useState(false)
  const [dashboardQrDataUrl, setDashboardQrDataUrl] = useState<string>("")
  const [showFullscreenQr, setShowFullscreenQr] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : "https://silsilaqr.netlify.app"
  const host = typeof window !== "undefined" ? window.location.host : "silsilaqr.netlify.app"

  const merchantName = activeMerchant?.name || ""
  const merchantInitials = activeMerchant?.logoInitials || (merchantName ? merchantName.slice(0, 2) : "")
  const companySlug = activeMerchant ? generateMerchantSlug(activeMerchant) : ""
  const qrDisplayLink = companySlug ? `${host}/${companySlug}` : ""

  // Generate QR Data URL whenever activeMerchant changes
  useEffect(() => {
    if (!merchantId) return
    const slug = companySlug || merchantId
    const fullUrl = `${origin}/${slug}?m=${merchantId}`
    QRCode.toDataURL(fullUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: activeMerchant?.logoColor || "#1B4332",
        light: "#FFFFFF",
      },
    })
      .then((url) => setDashboardQrDataUrl(url))
      .catch((err) => console.warn("Failed to generate dashboard QR:", err))
  }, [merchantId, companySlug, activeMerchant?.logoColor, origin])

  async function handleDownloadCounterQr() {
    if (!merchantId) return
    setDownloadingQr(true)
    try {
      const slug = companySlug || merchantId
      const fullUrl = `${origin}/${slug}?m=${merchantId}`
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 1200, // Ultra HD quality
        margin: 3,
        errorCorrectionLevel: "H",
        color: {
          dark: activeMerchant?.logoColor || "#1B4332",
          light: "#FFFFFF",
        },
      })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `silsila_qr_${slug}.png`
      a.target = "_blank"
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
      }, 200)

      setQrDownloadedToast(true)
      setTimeout(() => setQrDownloadedToast(false), 3000)
    } catch (err) {
      console.error("Failed to download QR code:", err)
    } finally {
      setDownloadingQr(false)
    }
  }

  function handleCopyStoreLink() {
    if (!companySlug) return
    const fullUrl = `${origin}/${companySlug}?m=${merchantId}`
    navigator.clipboard?.writeText(fullUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
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
      // 1. Try Firestore
      const v = await firebaseService.getVoucherByCode(code, merchantId).catch(() => null)
      if (v) {
        setVoucherResult(v)
        setLookingUpVoucher(false)
        return
      }

      // 2. Try API fallback
      const apiVouchers = await api.getVouchers({ merchantId }).catch(() => [])
      const matched = apiVouchers.find((x) => x.code.toLowerCase() === code.toLowerCase())
      if (matched) {
        setVoucherResult(matched)
      } else {
        setVoucherError(`"${code}" কোডের কোনো ভাউচার পাওয়া যায়নি।`)
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
      await firebaseService.redeemVoucherInFirestore(voucherResult.code, merchantId, "owner").catch(console.warn)
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

  const filteredApprovals = approvals.filter((a) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const nameMatch = (a.customerName || "").toLowerCase().includes(q)
    const phoneMatch =
      (a.customerPhone || "").replace(/\D/g, "").includes(q.replace(/\D/g, "")) ||
      (a.customerPhone || "").includes(q)
    return nameMatch || phoneMatch
  })

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3.5 pt-3 pb-20 space-y-3 w-full">
        {/* Real-time Netflix-style Search Bar + Quick Voucher Redeem */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#0E281C]/90 backdrop-blur-xl rounded-2xl p-2.5 border border-emerald-500/25 shadow-xl flex items-center gap-2.5">
            <SearchIcon size={18} className="text-[#34D399] flex-shrink-0 ml-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? "কাস্টমারের নাম বা ফোন নম্বর দিয়ে খুঁজুন..." : "Search by customer name or phone..."}
              className="flex-1 bg-transparent text-white text-xs font-medium placeholder-white/40 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center text-xs transition-all cursor-pointer mr-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setShowRedeemModal(true)
              setVoucherError(null)
              setVoucherResult(null)
              setRedeemSuccess(null)
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#0A2318] font-black text-xs flex items-center gap-1.5 shadow-lg glow-amber cursor-pointer hover:brightness-105 active:scale-95 transition-all whitespace-nowrap"
          >
            <GiftIcon size={16} />
            <span>{isBn ? "ভাউচার রিডিম" : "Redeem Voucher"}</span>
          </button>
        </div>

        {/* Pending Approvals */}
        {approvals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-display font-bold text-white text-base flex items-center gap-2 drop-shadow-xs">
                <span>{isBn ? "অনুমোদন প্রয়োজন" : "Approvals Needed"}</span>
                <span className="bg-[#F59E0B] text-[#0A2318] text-xs font-black px-2 py-0.5 rounded-full flex items-center justify-center shadow-md">
                  {filteredApprovals.length}{searchQuery ? ` / ${approvals.length}` : ""}
                </span>
              </h2>
              <span className="text-white/60 text-xs font-medium">
                {isBn ? "মেয়াদ: ৩০ মিনিট" : "Valid: 30 mins"}
              </span>
            </div>

            {filteredApprovals.length === 0 ? (
              <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-6 shadow-2xl text-center border border-emerald-500/20">
                <SearchIcon size={28} className="text-white/40 mx-auto mb-2" />
                <p className="font-display font-bold text-white text-sm">
                  {isBn ? `"${searchQuery}" দিয়ে কোনো অনুরোধ পাওয়া যায়নি` : `No requests found for "${searchQuery}"`}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {isBn ? "নাম বা সঠিক ফোন নম্বর দিয়ে আবার চেষ্টা করুন" : "Try searching with name or exact phone number"}
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer"
                >
                  {isBn ? "ফিল্টার মুছুন" : "Clear Filter"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApprovals.map((approval) => {
                  const isApproved = approved.includes(approval.id)
                  const isRejected = rejected.includes(approval.id)
                  const dist = approval.distanceMeters ?? approval.distance ?? 12
                  return (
                    <div
                      key={approval.id}
                      className={`bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 border ${
                        isApproved
                          ? "border-[#34D399] bg-[#10B981]/15"
                          : isRejected
                          ? "border-red-400/40 opacity-50"
                          : "border-emerald-500/30"
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center font-display font-black text-lg text-[#34D399] flex-shrink-0">
                            {approval.customerName?.slice(0, 1) || (isBn ? "ক" : "C")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-white text-lg leading-tight truncate">
                              {approval.customerName}
                            </p>
                            <p className="text-white/60 text-xs font-mono">{approval.customerPhone}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-white/40 text-[11px]">
                                {approval.scannedAt || (isBn ? "এইমাত্র" : "Just now")}
                              </span>
                              <span className="text-[#34D399] text-xs font-bold bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <MapPinIcon size={11} />
                                <span>{isBn ? `${dist}মি. দূরত্বে` : `${dist}m away`}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {isApproved ? (
                          <div className="flex items-center justify-center gap-2 py-3 bg-[#10B981]/20 border border-[#10B981]/40 rounded-2xl text-[#34D399] font-bold">
                            {isBn ? "✓ সিল দেওয়া সম্পন্ন!" : "✓ Stamp Granted!"}
                          </div>
                        ) : isRejected ? (
                          <div className="flex items-center justify-center gap-2 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 font-medium">
                            {isBn ? "প্রত্যাখ্যান করা হয়েছে" : "Rejected"}
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleReject(approval.id)}
                              className="flex-1 py-3.5 rounded-2xl border border-white/20 bg-white/5 flex items-center justify-center gap-1.5 text-white/70 font-bold transition-all active:scale-[0.97] hover:border-red-400 hover:text-red-300 cursor-pointer text-xs"
                            >
                              <XIcon size={16} />
                              <span>{isBn ? "বাতিল" : "Reject"}</span>
                            </button>
                            <button
                              onClick={() => handleApprove(approval.id)}
                              className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] flex items-center justify-center gap-2 text-[#0A2318] font-black transition-all active:scale-[0.97] shadow-xl glow-emerald cursor-pointer"
                            >
                              <CheckIcon size={18} />
                              <span className="font-display text-base">{isBn ? "সিল দিন ✓" : "Grant Stamp ✓"}</span>
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

        {approvals.length === 0 && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-6 shadow-2xl text-center border border-emerald-500/20">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-3 text-[#34D399]">
              <ShieldCheckIcon size={30} />
            </div>
            <p className="font-display font-bold text-white text-base">
              {isBn ? "সব অনুমোদন সম্পন্ন" : "All Caught Up"}
            </p>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">
              {isBn
                ? "কাউন্টার থেকে কোনো কাস্টমার স্ক্যান করলে সরাসরি এখানে ভেসে উঠবে"
                : "Customer scans at counter will appear here in real time"}
            </p>
          </div>
        )}

        {/* Active Loyalty Program */}
        {program && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-sm">
                {isBn ? "সক্রিয় লয়্যালটি প্রোগ্রাম" : "Active Loyalty Program"}
              </h2>
              <span className="bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {isBn ? "সক্রিয়" : "Active"}
              </span>
            </div>
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#0A2318] flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                <GiftIcon size={24} className="text-[#0A2318]" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{program.rewardText}</p>
                <p className="text-white/60 text-xs mt-0.5">
                  {isBn
                    ? `${program.target}টি সিলে সম্পূর্ণ — ${program.expiryDays} দিনের মেয়াদ`
                    : `Complete at ${program.target} stamps — ${program.expiryDays} days validity`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Counter QR Code & Download */}
        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 flex items-center justify-center">
                <QRIcon size={16} />
              </div>
              <h2 className="font-display font-bold text-white text-sm">
                {isBn ? "কাউন্টার QR কোড" : "Counter QR Code"}
              </h2>
            </div>
            {qrDisplayLink && (
              <span className="text-[#34D399] text-[11px] font-mono font-bold">
                {qrDisplayLink}
              </span>
            )}
          </div>

          <div className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code Canvas/Image - Click to Enlarge */}
              <div
                onClick={() => dashboardQrDataUrl && setShowFullscreenQr(true)}
                className="w-32 h-32 bg-white rounded-2xl p-2 shadow-2xl flex flex-col items-center justify-center flex-shrink-0 cursor-pointer group hover:scale-105 active:scale-95 transition-all relative border-2 border-emerald-500/30 glow-emerald"
                title={isBn ? "কাস্টমারকে দেখাতে QR কোড বড় করুন" : "Click to enlarge QR code"}
              >
                {dashboardQrDataUrl ? (
                  <>
                    <img
                      src={dashboardQrDataUrl}
                      alt="Counter QR Code"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity">
                      <span className="text-[10px] font-black bg-[#0A2318]/90 text-[#34D399] px-2 py-0.5 rounded-full shadow-md backdrop-blur-xs">
                        🔍 {isBn ? "বড় করুন" : "Enlarge"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-xs font-mono">
                    {isBn ? "তৈরি হচ্ছে..." : "Generating..."}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="font-bold text-white text-sm">
                  {merchantName || (isBn ? "আপনার দোকান" : "Your Store")} {isBn ? "QR কোড" : "QR Code"}
                </p>

                {/* Toast notification */}
                {qrDownloadedToast && (
                  <div className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start animate-fade-in backdrop-blur-md">
                    <CheckIcon size={14} />
                    <span>{isBn ? "QR কোড সফলভাবে ডাউনলোড হয়েছে!" : "QR Code downloaded successfully!"}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    onClick={handleDownloadCounterQr}
                    disabled={downloadingQr || !dashboardQrDataUrl}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-105 text-[#0A2318] text-xs font-black rounded-xl shadow-lg glow-emerald flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <DownloadIcon size={14} />
                    <span>
                      {downloadingQr
                        ? isBn
                          ? "ডাউনলোড হচ্ছে..."
                          : "Downloading..."
                        : isBn
                        ? "QR ডাউনলোড (HD PNG)"
                        : "Download QR (HD PNG)"}
                    </span>
                  </button>

                  <button
                    onClick={handleCopyStoreLink}
                    className="px-3.5 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 backdrop-blur-md"
                  >
                    {copiedLink ? <CheckIcon size={14} className="text-[#34D399]" /> : <CopyIcon size={14} />}
                    <span>
                      {copiedLink
                        ? isBn
                          ? "লিংক কপি হয়েছে!"
                          : "Link Copied!"
                        : isBn
                        ? "লিংক কপি"
                        : "Copy Link"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Big QR Presenter Modal */}
      {showFullscreenQr && (
        <div className="fixed inset-0 z-50 bg-[#071D13]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in text-white">
          {/* Top Bar with Merchant Info and Close Button */}
          <div className="w-full max-w-sm flex items-center justify-between pt-safe">
            <div className="flex items-center gap-2.5">
              {activeMerchant?.logoUrl ? (
                <img src={activeMerchant.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-white/20 shadow-md" />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-md border border-white/15"
                  style={{
                    backgroundColor: activeMerchant?.logoBg || "#0D3824",
                    color: activeMerchant?.logoColor || "#34D399",
                  }}
                >
                  {merchantInitials || (isBn ? "সি" : "S")}
                </div>
              )}
              <div>
                <h2 className="font-display font-black text-white text-base leading-tight">
                  {merchantName || (isBn ? "সিলসিলা স্টোর" : "Sealsela Store")}
                </h2>
                <p className="text-[#34D399] text-[11px] font-mono font-bold">
                  {qrDisplayLink || origin}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowFullscreenQr(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-base cursor-pointer active:scale-95 transition-all shadow-md"
              title={isBn ? "বন্ধ করুন" : "Close"}
            >
              ✕
            </button>
          </div>

          {/* Center Giant High-Contrast QR Code Card */}
          <div className="my-auto flex flex-col items-center max-w-sm w-full py-4">
            <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border-4 border-emerald-500/40 glow-emerald flex flex-col items-center w-full max-w-[330px]">
              <div className="w-60 h-60 sm:w-68 sm:h-68 flex items-center justify-center">
                <img
                  src={dashboardQrDataUrl}
                  alt={merchantName}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-200 w-full text-center">
                <p className="font-display font-black text-[#0A2318] text-base">
                  {merchantName}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="w-full max-w-sm flex gap-2 pb-safe">
            <button
              onClick={handleDownloadCounterQr}
              className="flex-1 py-3 bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-xs rounded-xl shadow-lg glow-emerald flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <DownloadIcon size={14} />
              <span>{isBn ? "HD ডাউনলোড" : "Download HD"}</span>
            </button>
            <button
              onClick={handleCopyStoreLink}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all backdrop-blur-md"
            >
              {copiedLink ? <CheckIcon size={14} className="text-[#34D399]" /> : <CopyIcon size={14} />}
              <span>{copiedLink ? (isBn ? "কপি হয়েছে!" : "Copied!") : (isBn ? "লিংক কপি" : "Copy Link")}</span>
            </button>
            <button
              onClick={() => setShowFullscreenQr(false)}
              className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 font-bold text-xs rounded-xl cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "বন্ধ" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Quick Voucher Redeem Modal for Store Owner */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#0A2318] flex items-center justify-center shadow-md glow-amber">
                  <GiftIcon size={20} />
                </div>
                <div>
                  <h2 className="font-display font-black text-white text-lg">
                    {isBn ? "ভাউচার রিডিম করুন" : "Redeem Voucher"}
                  </h2>
                  <p className="text-xs text-white/60">
                    {isBn ? "গ্রাহকের ভাউচার কোড যাচাই ও রিডিম" : "Verify and redeem customer vouchers"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRedeemModal(false)
                  setVoucherResult(null)
                  setVoucherError(null)
                  setRedeemSuccess(null)
                  setVoucherCodeInput("")
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-white/70 font-semibold block mb-1.5">
                  {isBn ? "ভাউচার কোড (যেমন: SL-M1-5X9K)" : "Voucher Code (e.g. SL-M1-5X9K)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                    placeholder="SL-M1-5X9K"
                    className="w-full bg-[#071D13] border border-emerald-500/30 rounded-2xl px-4 py-3.5 font-mono font-black text-lg text-[#F59E0B] tracking-widest uppercase outline-none focus:border-[#34D399] shadow-inner text-center"
                  />
                  {voucherCodeInput && (
                    <button
                      onClick={() => {
                        setVoucherCodeInput("")
                        setVoucherResult(null)
                        setVoucherError(null)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 text-white/60 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleLookupVoucher()}
                disabled={lookingUpVoucher || !voucherCodeInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-sm shadow-lg glow-emerald active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {lookingUpVoucher ? (
                  <>
                    <RefreshIcon size={16} className="animate-spin" />
                    <span>{isBn ? "যাচাই করা হচ্ছে..." : "Verifying..."}</span>
                  </>
                ) : (
                  <>
                    <SearchIcon size={16} />
                    <span>{isBn ? "ভাউচার কোড যাচাই করুন" : "Verify Voucher Code"}</span>
                  </>
                )}
              </button>

              {voucherError && (
                <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-3.5 py-3 rounded-2xl animate-fade-in flex items-center gap-2">
                  <XIcon size={16} className="text-red-300 flex-shrink-0" />
                  <span>{voucherError}</span>
                </div>
              )}

              {redeemSuccess && (
                <div className="bg-[#10B981]/25 border border-[#10B981]/50 text-[#34D399] text-xs px-4 py-3.5 rounded-2xl animate-fade-in flex items-center gap-2.5 shadow-lg">
                  <CheckIcon size={18} className="text-[#34D399] flex-shrink-0" />
                  <span className="font-bold">{redeemSuccess}</span>
                </div>
              )}

              {voucherResult && (
                <div className="bg-[#071D13] border border-[#34D399]/40 rounded-2xl p-4 animate-slide-up space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-xs text-white/50">{isBn ? "স্ট্যাটাস" : "Status"}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        voucherResult.redeemed
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                      }`}
                    >
                      {voucherResult.redeemed
                        ? (isBn ? "ইতিমধ্যে ব্যবহৃত" : "Already Redeemed")
                        : (isBn ? "সক্রিয় ও বৈধ ✓" : "Active & Valid ✓")}
                    </span>
                  </div>

                  <div className="text-center py-1">
                    <p className="text-[11px] text-white/50 uppercase font-semibold">
                      {isBn ? "পুরস্কার" : "Reward"}
                    </p>
                    <p className="font-display font-black text-xl text-[#F59E0B] mt-0.5">
                      {voucherResult.rewardText || (isBn ? "১টি বিশেষ উপহার" : "1 Special Reward")}
                    </p>
                    <p className="text-xs text-white/70 mt-1">
                      {isBn ? "কাস্টমার: " : "Customer: "}
                      <strong className="text-white">{voucherResult.customerName || (isBn ? "কাস্টমার" : "Customer")}</strong>
                      {voucherResult.customerPhone ? ` (${voucherResult.customerPhone})` : ""}
                    </p>
                  </div>

                  {voucherResult.redeemed ? (
                    <div className="py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-center text-red-300 text-xs font-bold">
                      {isBn ? "⚠️ এই ভাউচারটি পূর্বে ব্যবহার করা হয়েছে!" : "⚠️ This voucher was already redeemed!"}
                    </div>
                  ) : (
                    <button
                      onClick={handleRedeemVoucher}
                      disabled={redeeming}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:brightness-105 text-[#0A2318] font-display font-black text-sm shadow-xl glow-amber flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {redeeming ? (
                        <>
                          <RefreshIcon size={16} className="animate-spin" />
                          <span>{isBn ? "রিডিম নিশ্চিত করা হচ্ছে..." : "Confirming redemption..."}</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon size={18} />
                          <span>{isBn ? "উপহার প্রদান ও রিডিম সম্পন্ন করুন ✓" : "Give Reward & Complete Redeem ✓"}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
