import { useState, useEffect } from "react"
import QRCode from "qrcode"
import { api, type PendingApproval, type RewardProgram, type Merchant, generateMerchantSlug } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import {
  CheckIcon,
  XIcon,
  RefreshIcon,
  UsersIcon,
  SettingsIcon,
  DownloadIcon,
  CopyIcon,
  QRIcon,
  LogOutIcon,
  ShieldCheckIcon,
  GiftIcon,
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

  const [ownedMerchants, setOwnedMerchants] = useState<Merchant[]>([])
  const [activeMerchant, setActiveMerchant] = useState<Merchant | null>(null)
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [program, setProgram] = useState<RewardProgram | null>(null)
  const [approved, setApproved] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">
        {/* Pending Approvals */}
        {approvals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-white text-lg flex items-center gap-2 drop-shadow-xs">
                অনুমোদন প্রয়োজন
                <span className="bg-[#F59E0B] text-[#0A2318] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center animate-pulse shadow-md">
                  {approvals.length}
                </span>
              </h2>
              <span className="text-white/60 text-xs font-medium">মেয়াদ: ৩০ মিনিট</span>
            </div>

            <div className="space-y-3">
              {approvals.map((approval) => {
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
                          {approval.customerName?.slice(0, 1) || "ক"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-white text-lg leading-tight truncate">
                            {approval.customerName}
                          </p>
                          <p className="text-white/60 text-xs font-mono">{approval.customerPhone}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/40 text-[11px]">{approval.scannedAt || "এইমাত্র"}</span>
                            <span className="text-[#34D399] text-xs font-bold bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <MapPinIcon size={11} />
                              <span>{dist}মি. দূরত্বে</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {isApproved ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-[#10B981]/20 border border-[#10B981]/40 rounded-2xl text-[#34D399] font-bold">
                          ✓ সিল দেওয়া সম্পন্ন!
                        </div>
                      ) : isRejected ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-300 font-medium">
                          প্রত্যাখ্যান করা হয়েছে
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="flex-1 py-3.5 rounded-2xl border border-white/20 bg-white/5 flex items-center justify-center gap-1.5 text-white/70 font-bold transition-all active:scale-[0.97] hover:border-red-400 hover:text-red-300 cursor-pointer text-xs"
                          >
                            <XIcon size={16} />
                            <span>বাতিল</span>
                          </button>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] flex items-center justify-center gap-2 text-[#0A2318] font-black transition-all active:scale-[0.97] shadow-xl glow-emerald cursor-pointer"
                          >
                            <CheckIcon size={18} />
                            <span className="font-display text-base">সিল দিন ✓</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {approvals.length === 0 && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-6 shadow-2xl text-center border border-emerald-500/20">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-3 text-[#34D399]">
              <ShieldCheckIcon size={30} />
            </div>
            <p className="font-display font-bold text-white text-base">সব অনুমোদন সম্পন্ন</p>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">
              কাউন্টার থেকে কোনো কাস্টমার স্ক্যান করলে সরাসরি এখানে ভেসে উঠবে
            </p>
          </div>
        )}

        {/* Active Loyalty Program */}
        {program && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-sm">সক্রিয় লয়্যালটি প্রোগ্রাম</h2>
              <span className="bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 text-xs px-2.5 py-0.5 rounded-full font-bold">সক্রিয়</span>
            </div>
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#0A2318] flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                <GiftIcon size={24} className="text-[#0A2318]" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{program.rewardText}</p>
                <p className="text-white/60 text-xs mt-0.5">
                  {program.target}টি সিলে সম্পূর্ণ — {program.expiryDays} দিনের মেয়াদ
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
              <h2 className="font-display font-bold text-white text-sm">কাউন্টার QR কোড</h2>
            </div>
            {qrDisplayLink && (
              <span className="text-[#34D399] text-[11px] font-mono font-bold">
                {qrDisplayLink}
              </span>
            )}
          </div>

          <div className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code Canvas/Image */}
              <div className="w-32 h-32 bg-white rounded-2xl p-2 shadow-2xl flex items-center justify-center flex-shrink-0">
                {dashboardQrDataUrl ? (
                  <img
                    src={dashboardQrDataUrl}
                    alt="Counter QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-xs font-mono">তৈরি হচ্ছে...</div>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="font-bold text-white text-sm">
                  {merchantName || "আপনার দোকান"} QR কোড
                </p>
                <p className="text-xs text-white/60 leading-relaxed">
                  কাস্টমারদের স্ক্যান করতে এটি ক্যাশ কাউন্টারে প্রিন্ট করে রাখুন।
                </p>

                {/* Toast notification */}
                {qrDownloadedToast && (
                  <div className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start animate-fade-in backdrop-blur-md">
                    <CheckIcon size={14} />
                    <span>QR কোড সফলভাবে ডাউনলোড হয়েছে!</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <button
                    onClick={handleDownloadCounterQr}
                    disabled={downloadingQr || !dashboardQrDataUrl}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-105 text-[#0A2318] text-xs font-black rounded-xl shadow-lg glow-emerald flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <DownloadIcon size={14} />
                    <span>{downloadingQr ? "ডাউনলোড হচ্ছে..." : "QR ডাউনলোড (HD PNG)"}</span>
                  </button>

                  <button
                    onClick={handleCopyStoreLink}
                    className="px-3.5 py-2.5 border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 backdrop-blur-md"
                  >
                    {copiedLink ? <CheckIcon size={14} className="text-[#34D399]" /> : <CopyIcon size={14} />}
                    <span>{copiedLink ? "লিংক কপি হয়েছে!" : "লিংক কপি"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Customers */}
        <button
          onClick={onViewCustomers}
          className="w-full bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.99] hover:border-emerald-400/40 border border-white/10 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 flex items-center justify-center shadow-md">
            <UsersIcon size={20} className="text-[#34D399]" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-display font-bold text-white group-hover:text-[#34D399] transition-colors">কাস্টমার সিআরএম (CRM)</p>
            <p className="text-white/60 text-xs mt-0.5">গ্রাহকের তালিকা ও ডেটা এক্সপোর্ট</p>
          </div>
          <span className="text-[#34D399] font-bold text-lg group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </div>
    </div>
  )
}
