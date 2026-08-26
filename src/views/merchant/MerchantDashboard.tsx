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
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">
        {/* Pending Approvals */}
        {approvals.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-[#1A1916] text-lg flex items-center gap-2">
                অনুমোদন প্রয়োজন
                <span className="bg-[#F59E0B] text-[#1B4332] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
                  {approvals.length}
                </span>
              </h2>
              <span className="text-[#6B6158] text-xs">মেয়াদ: ৩০ মিনিট</span>
            </div>

            <div className="space-y-3">
              {approvals.map((approval) => {
                const isApproved = approved.includes(approval.id)
                const isRejected = rejected.includes(approval.id)
                const dist = approval.distanceMeters ?? approval.distance ?? 12
                return (
                  <div
                    key={approval.id}
                    className={`bg-white rounded-2xl card-shadow overflow-hidden transition-all duration-300 ${
                      isApproved
                        ? "border-2 border-[#52B788] bg-green-50/50"
                        : isRejected
                        ? "border-2 border-red-300 opacity-50"
                        : ""
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#F0F7F2] flex items-center justify-center font-display font-black text-lg text-[#1B4332] flex-shrink-0">
                          {approval.customerName?.slice(0, 1) || "ক"}
                        </div>
                        <div className="flex-1">
                          <p className="font-display font-bold text-[#1A1916] text-lg leading-tight">
                            {approval.customerName}
                          </p>
                          <p className="text-[#6B6158] text-sm">{approval.customerPhone}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#B0A99E] text-xs">{approval.scannedAt || "এইমাত্র"}</span>
                            <span className="text-[#1B4332] text-xs font-medium bg-[#D8EDDF] px-2 py-0.5 rounded-full">
                              📍 {dist}মি. দূরত্বে
                            </span>
                          </div>
                        </div>
                      </div>

                      {isApproved ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-[#D8EDDF] rounded-xl text-[#1B4332] font-bold">
                          ✓ সিল দেওয়া সম্পন্ন!
                        </div>
                      ) : isRejected ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-red-50 rounded-xl text-red-500 font-medium">
                          প্রত্যাখ্যান করা হয়েছে
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReject(approval.id)}
                            className="flex-1 py-3.5 rounded-xl border-2 border-[#E9E5DC] flex items-center justify-center gap-2 text-[#6B6158] font-semibold transition-all active:scale-[0.97] hover:border-red-300 hover:text-red-500 cursor-pointer"
                          >
                            <XIcon size={18} />
                            <span>বাতিল</span>
                          </button>
                          <button
                            onClick={() => handleApprove(approval.id)}
                            className="flex-[2] py-3.5 rounded-xl bg-[#1B4332] flex items-center justify-center gap-2 text-white font-bold transition-all active:scale-[0.97] shadow-md hover:bg-[#143427] cursor-pointer"
                          >
                            <CheckIcon size={20} />
                            <span className="font-display text-lg">সিল দিন ✓</span>
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
          <div className="mx-4 mt-4 bg-white rounded-2xl p-6 card-shadow text-center border border-[#E9E5DC]">
            <span className="text-3xl mb-2 block">✅</span>
            <p className="font-display font-bold text-[#1A1916]">সব অনুমোদন সম্পন্ন</p>
            <p className="text-[#6B6158] text-xs mt-1">
              কাউন্টার থেকে কোনো কাস্টমার স্ক্যান করলে সরাসরি এখানে ভেসে উঠবে
            </p>
          </div>
        )}

        {/* Active Loyalty Program */}
        {program && (
          <div className="px-4 mt-4">
            <div className="bg-white rounded-2xl card-shadow overflow-hidden border border-[#E9E5DC]">
              <div className="px-4 py-3 border-b border-[#E9E5DC] flex items-center justify-between">
                <h2 className="font-display font-bold text-[#1A1916]">সক্রিয় লয়্যালটি প্রোগ্রাম</h2>
                <span className="bg-[#D8EDDF] text-[#1B4332] text-xs px-2.5 py-1 rounded-full font-bold">সক্রিয়</span>
              </div>
              <div className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-2xl flex-shrink-0">
                  🎁
                </div>
                <div className="flex-1">
                  <p className="text-[#1A1916] font-bold text-sm">{program.rewardText}</p>
                  <p className="text-[#6B6158] text-xs mt-0.5">
                    {program.target}টি সিলে সম্পূর্ণ — {program.expiryDays} দিনের মেয়াদ
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Counter QR Code & Download */}
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl card-shadow overflow-hidden border border-[#E9E5DC]">
            <div className="px-4 py-3 border-b border-[#E9E5DC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#D8EDDF] text-[#1B4332] flex items-center justify-center">
                  <QRIcon size={16} />
                </div>
                <h2 className="font-display font-bold text-[#1A1916] text-sm">কাউন্টার QR কোড</h2>
              </div>
              {qrDisplayLink && (
                <span className="text-[#52B788] text-[11px] font-mono font-bold">
                  {qrDisplayLink}
                </span>
              )}
            </div>

            <div className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* QR Code Canvas/Image */}
                <div className="w-32 h-32 bg-white rounded-2xl p-2 border border-gray-200 shadow-inner flex items-center justify-center flex-shrink-0">
                  {dashboardQrDataUrl ? (
                    <img
                      src={dashboardQrDataUrl}
                      alt="Counter QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-[#B0A99E] text-xs font-mono">তৈরি হচ্ছে...</div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="font-bold text-[#1A1916] text-sm">
                    {merchantName || "আপনার দোকান"} QR কোড
                  </p>
                  <p className="text-xs text-[#6B6158] leading-relaxed">
                    কাস্টমারদের স্ক্যান করতে এটি ক্যাশ কাউন্টারে প্রিন্ট করে রাখুন।
                  </p>

                  {/* Toast notification */}
                  {qrDownloadedToast && (
                    <div className="bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start animate-fade-in">
                      <CheckIcon size={14} />
                      <span>QR কোড সফলভাবে ডাউনলোড হয়েছে!</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    <button
                      onClick={handleDownloadCounterQr}
                      disabled={downloadingQr || !dashboardQrDataUrl}
                      className="px-4 py-2.5 bg-[#1B4332] hover:bg-[#143427] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <DownloadIcon size={14} />
                      <span>{downloadingQr ? "ডাউনলোড হচ্ছে..." : "QR ডাউনলোড (HD PNG)"}</span>
                    </button>

                    <button
                      onClick={handleCopyStoreLink}
                      className="px-3.5 py-2.5 border border-[#E9E5DC] bg-[#F7F5F0] hover:bg-white text-[#1A1916] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedLink ? <CheckIcon size={14} className="text-[#52B788]" /> : <CopyIcon size={14} />}
                      <span>{copiedLink ? "লিংক কপি হয়েছে!" : "লিংক কপি"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Customers */}
        <div className="px-4 mt-4">
          <button
            onClick={onViewCustomers}
            className="w-full bg-white rounded-2xl card-shadow p-4 flex items-center gap-3 transition-all active:scale-[0.99] hover:bg-[#FAFAF8] border border-[#E9E5DC] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-[#F0F7F2] flex items-center justify-center">
              <UsersIcon size={20} className="text-[#1B4332]" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display font-bold text-[#1A1916]">কাস্টমার সিআরএম (CRM)</p>
              <p className="text-[#6B6158] text-xs mt-0.5">গ্রাহকের তালিকা ও ডেটা এক্সপোর্ট</p>
            </div>
            <span className="text-[#B0A99E] font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
