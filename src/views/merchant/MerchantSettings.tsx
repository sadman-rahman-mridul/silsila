import { useState, useEffect, useRef } from "react"
import { api, type Merchant, generateMerchantSlug } from "../../services/api"
import { firebaseService } from "../../services/firebaseService"
import { useAuth } from "../../context/AuthContext"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import {
  MapPinIcon,
  ClockIcon,
  LogOutIcon,
  CheckIcon,
  SparklesIcon,
  RefreshIcon,
  QRIcon,
  ChevronLeftIcon,
} from "../../components/Icons"
import StampGrid from "../../components/StampGrid"

interface MerchantSettingsProps {
  onBack: () => void
  activeMerchantId?: string
  onMerchantUpdated?: (updated: Merchant) => void
}

// Updated category list as requested
const categories = ["ক্যাফে", "সেলুন", "রেস্তোরাঁ", "স্পা", "অন্যান্য"]

// PIN setup step type
type PinStep = "idle" | "sending_otp" | "enter_otp_and_pin" | "saving" | "done"

export default function MerchantSettings({
  onBack,
  activeMerchantId,
  onMerchantUpdated,
}: MerchantSettingsProps) {
  const { profile } = useAuth()
  // Never fall back to "m1" — only use the authenticated merchant's id
  const merchantId = activeMerchantId || profile?.merchantId || profile?.id || ""

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile Fields — start empty; populated from the fetched merchant only
  const [businessName, setBusinessName] = useState("")
  const [businessNameEn, setBusinessNameEn] = useState("")
  const [category, setCategory] = useState("ক্যাফে")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [hours, setHours] = useState("")
  const [isOpen, setIsOpen] = useState(true)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [geofenceM, setGeofenceM] = useState(200)

  // Social & Review Links
  const [instagram, setInstagram] = useState("")
  const [facebook, setFacebook] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [reviewLink, setReviewLink] = useState("")

  // Logo Customizer — only initials field; no bg/color/presets
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [logoInitials, setLogoInitials] = useState<string>("")

  // Cover Photo & In-browser Cropper (< 1 MB)
  const [coverUrl, setCoverUrl] = useState<string>("")
  const [rawCoverImage, setRawCoverImage] = useState<string | null>(null)
  const [coverScale, setCoverScale] = useState(1)
  const [coverOffsetY, setCoverOffsetY] = useState(0)

  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Staff PIN flow
  const [pinStep, setPinStep] = useState<PinStep>("idle")
  const [pinStatus, setPinStatus] = useState<{ hasPin: boolean; updatedAt: string | null; ownerPhoneMasked: string | null } | null>(null)
  const [newPin, setNewPin] = useState("")
  const [pinOtp, setPinOtp] = useState("")
  const [pinError, setPinError] = useState("")
  const [pinSuccess, setPinSuccess] = useState("")

  // Language preference
  const [currentLang, setCurrentLang] = useState<"বাংলা" | "English">(() => {
    return (localStorage.getItem("silsila_lang") as any) || "বাংলা"
  })

  function handleSetLanguage(l: "বাংলা" | "English") {
    setCurrentLang(l)
    localStorage.setItem("silsila_lang", l)
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (merchantId) {
      loadMerchantDetails(merchantId)
      loadPinStatus()
    }
  }, [merchantId])

  async function loadMerchantDetails(id: string) {
    setLoading(true)
    try {
      // 1. Try Firestore first (single source of truth)
      let m: any = await firebaseService.getMerchantByIdOrSlug(id).catch(() => null)

      // 2. Fallback to API if not in Firestore
      if (!m) {
        const res = await api.getMerchant(id).catch(() => null)
        if (res?.merchant) m = res.merchant
      }

      if (m) {
        setMerchant(m)
        setBusinessName(m.name || "")
        setBusinessNameEn(m.nameEn || "")
        setCategory(m.category || "ক্যাফে")
        setAddress(m.address || "")
        setPhone(m.phone || m.ownerPhone || "")
        setHours(m.hours || "")
        setIsOpen(m.isOpen ?? true)
        setLat(m.lat || null)
        setLng(m.lng || null)
        setGeofenceM(m.geofenceM || 200)
        setLogoUrl(m.logoUrl || "")
        setLogoInitials(m.logoInitials || (m.name ? m.name.slice(0, 2) : ""))
        setCoverUrl(m.coverUrl || "")
        setInstagram(m.instagram || "")
        setFacebook(m.facebook || "")
        setWhatsapp(m.whatsapp || "")
        setReviewLink(m.reviewLink || "")
      }
    } catch (err) {
      console.warn("Failed to load merchant:", err)
    } finally {
      setLoading(false)
    }
  }

  async function loadPinStatus() {
    try {
      const token = localStorage.getItem("silsila_token") || ""
      const res = await fetch("/api/staff/pin/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setPinStatus(data)
      }
    } catch (err) {
      console.warn("Failed to load PIN status:", err)
    }
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("অনুগ্রহ করে একটি ছবি (PNG, JPG, WebP) নির্বাচন করুন")
      return
    }
    if (file.size > 500 * 1024) {
      alert("লোগোর ফাইলের আকার অবশ্যই ৫০০ KB এর নিচে হতে হবে (Logo should be under 500 KB)")
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveLogoImage() {
    setLogoUrl("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const coverInputRef = useRef<HTMLInputElement | null>(null)

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("অনুগ্রহ করে একটি ছবি (PNG, JPG, WebP) নির্বাচন করুন")
      return
    }
    if (file.size > 1024 * 1024) {
      alert("কভার ছবির ফাইলের আকার অবশ্যই ১ MB এর নিচে হতে হবে (Cover photo must be under 1 MB)")
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      setRawCoverImage(event.target?.result as string)
      setCoverScale(1)
      setCoverOffsetY(0)
    }
    reader.readAsDataURL(file)
  }

  function handleApplyCrop() {
    if (!rawCoverImage) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const targetWidth = 1200
      const targetHeight = 500
      canvas.width = targetWidth
      canvas.height = targetHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.fillStyle = "#1B4332"
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      const scaledW = targetWidth * coverScale
      const scaledH = (img.height / img.width) * scaledW
      const posX = (targetWidth - scaledW) / 2
      const posY = (targetHeight - scaledH) / 2 + coverOffsetY

      ctx.drawImage(img, posX, posY, scaledW, scaledH)

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88)
      setCoverUrl(croppedDataUrl)
      setRawCoverImage(null)
    }
    img.src = rawCoverImage
  }

  function handleRemoveCoverImage() {
    setCoverUrl("")
    if (coverInputRef.current) coverInputRef.current.value = ""
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updateData = {
        name: businessName.trim() || "",
        nameEn: businessNameEn.trim() || businessName.trim(),
        category,
        address: address.trim(),
        phone: phone.trim(),
        hours: hours.trim(),
        isOpen,
        ...(lat !== null ? { lat } : {}),
        ...(lng !== null ? { lng } : {}),
        geofenceM,
        logoUrl: logoUrl || "",
        logoInitials: logoInitials.trim() || (businessName ? businessName.slice(0, 2) : "সি"),
        coverUrl: coverUrl || "",
        instagram: instagram.trim() || "",
        facebook: facebook.trim() || "",
        whatsapp: whatsapp.trim() || "",
        reviewLink: reviewLink.trim() || "",
      }

      // 1. Direct Cloud Firestore save (guaranteed source of truth)
      await firebaseService.updateMerchantInFirestore(merchantId, updateData)

      // 2. Non-blocking API sync
      api.updateMerchant(merchantId, updateData).catch(() => {})

      const updatedObj: any = {
        ...(merchant || {}),
        ...updateData,
        id: merchantId,
      }
      setMerchant(updatedObj)
      if (onMerchantUpdated) onMerchantUpdated(updatedObj)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error("Save settings error:", err)
      alert("সংরক্ষণ ব্যর্থ হয়েছে, পুনরায় চেষ্টা করুন।")
    } finally {
      setSaving(false)
    }
  }

  function handleUseCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(5)))
          setLng(Number(pos.coords.longitude.toFixed(5)))
        },
        () => {
          alert("লোকেশন অনুমতি দেওয়া হয়নি।")
        }
      )
    }
  }

  // ── PIN Flow ──
  async function handleRequestPinOtp() {
    setPinStep("sending_otp")
    setPinError("")
    try {
      const token = localStorage.getItem("silsila_token") || ""
      const res = await fetch("/api/staff/pin/request-otp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error || "OTP পাঠাতে ব্যর্থ হয়েছে")
        setPinStep("idle")
        return
      }
      setPinStep("enter_otp_and_pin")
    } catch {
      setPinError("নেটওয়ার্ক সমস্যা, পুনরায় চেষ্টা করুন")
      setPinStep("idle")
    }
  }

  async function handleSetPin() {
    if (!/^\d{4}$/.test(newPin)) {
      setPinError("পিন অবশ্যই ৪ সংখ্যার হতে হবে")
      return
    }
    if (!pinOtp.trim()) {
      setPinError("OTP কোড লিখুন")
      return
    }
    setPinStep("saving")
    setPinError("")
    try {
      const token = localStorage.getItem("silsila_token") || ""
      const res = await fetch("/api/staff/pin/set", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPin, otp: pinOtp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPinError(data.error || "পিন সেট করতে ব্যর্থ হয়েছে")
        setPinStep("enter_otp_and_pin")
        return
      }
      setPinSuccess("স্টাফ মোড পিন সফলভাবে আপডেট হয়েছে ✓")
      setPinStep("done")
      setNewPin("")
      setPinOtp("")
      loadPinStatus()
      setTimeout(() => {
        setPinStep("idle")
        setPinSuccess("")
      }, 4000)
    } catch {
      setPinError("নেটওয়ার্ক সমস্যা, পুনরায় চেষ্টা করুন")
      setPinStep("enter_otp_and_pin")
    }
  }

  const slug =
    (merchant as any)?.slug ||
    generateMerchantSlug({
      name: businessName || merchant?.name || "",
      nameEn: businessNameEn || merchant?.nameEn || "",
      id: merchantId,
    })
  const host = typeof window !== "undefined" ? window.location.host : "silsilaqr.vercel.app"
  const formattedQrLink = slug ? `${host}/${slug}` : ""

  const swipeHandlers = useSwipeBack(onBack)

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]" {...swipeHandlers}>
      {/* Header */}
      <div className="bg-[#1B4332] px-5 pt-10 pb-6">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
            title="হোমে ফিরুন"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center font-display font-black text-[#1B4332] text-xs shadow-sm">
              স
            </div>
            <span className="font-display font-black text-white text-base tracking-wide group-hover:text-[#F59E0B] transition-colors">
              সিলসিলা
            </span>
          </button>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
          >
            <ChevronLeftIcon size={14} />
            <span>হোমে ফিরুন</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">সেটিংস</h1>
            <p className="text-[#52B788] text-xs mt-1">লোগো, ব্র্যান্ডিং ও দোকান কনফিগারেশন</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 bg-[#F59E0B] hover:bg-[#E58E00] text-[#1B4332] font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshIcon size={14} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <CheckIcon size={14} />
                <span>Saved ✓</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>

        {formattedQrLink && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1 text-white/80 text-xs font-mono">
            <span>🔗 {formattedQrLink}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-4">
        {saved && (
          <div className="bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckIcon size={16} className="text-[#1B4332]" />
            <span>সেটিংস ডাটাবেজে সফলভাবে আপডেট হয়েছে!</span>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-[#6B6158] text-sm">
            <span className="inline-block animate-spin mr-1">⏳</span> লোড হচ্ছে...
          </div>
        )}

        {/* 1. Logo Customizer */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E9E5DC]">
            <div className="w-8 h-8 rounded-xl bg-[#D8EDDF] flex items-center justify-center text-[#1B4332]">
              <SparklesIcon size={16} />
            </div>
            <div>
              <h2 className="font-display font-bold text-[#1A1916] text-base">লোগো কাস্টমাইজার</h2>
              <p className="text-xs text-[#6B6158]">লোগো পরিবর্তন করুন ও লাইভ প্রিভিউ দেখুন</p>
            </div>
          </div>

          {/* Logo Preview & Upload */}
          <div className="p-4 bg-[#F7F5F0] rounded-2xl border border-[#E9E5DC] mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-2xl shadow-md border-2 overflow-hidden transition-all"
                  style={{
                    backgroundColor: merchant?.logoBg || "#D8EDDF",
                    color: merchant?.logoColor || "#1B4332",
                    borderColor: merchant?.logoColor || "#1B4332",
                  }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Merchant Logo" className="w-full h-full object-cover" />
                  ) : (
                    logoInitials || "সি"
                  )}
                </div>
                {logoUrl && (
                  <button
                    onClick={handleRemoveLogoImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="font-bold text-[#1A1916] text-sm">দোকানের লোগো নির্বাচন করুন</p>
                <p className="text-xs text-[#6B6158]">
                  ব্র্যান্ড লোগো ফাইল আপলোড করুন অথবা সংক্ষেপ অক্ষর ব্যবহার করুন।
                </p>
                <div className="p-2.5 bg-[#FEF3C7]/60 border border-[#F59E0B]/30 rounded-xl text-[11px] text-[#92400E] font-medium">
                  📌 নোট: লোগো ফাইলের আকার ৫০০ KB এর নিচে হতে হবে (PNG, JPG, WebP)
                </div>
                <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    id="logo-file-input"
                  />
                  <label
                    htmlFor="logo-file-input"
                    className="px-4 py-2 bg-[#1B4332] hover:bg-[#143427] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    📁 নতুন লোগো আপলোড
                  </label>
                  {logoUrl && (
                    <button
                      onClick={handleRemoveLogoImage}
                      className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      ছবি বাদ দিন
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Initials only */}
          <div className="mb-4">
            <label className="text-[#6B6158] text-xs font-semibold block mb-1">
              লোগো অক্ষর (১-৩ অক্ষর)
            </label>
            <input
              type="text"
              maxLength={4}
              value={logoInitials}
              onChange={(e) => setLogoInitials(e.target.value)}
              placeholder="যেমন: কহ"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#1A1916] outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>

        {/* 2. Cover Photo / Banner (< 1 MB with Cropper) */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E9E5DC]">
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#92400E]">
              🖼️
            </div>
            <div>
              <h2 className="font-display font-bold text-[#1A1916] text-base">কভার ফটো ও ব্যানার</h2>
              <p className="text-xs text-[#6B6158]">খুঁজুন পেজ ও স্টোর পেজে প্রদর্শিত ব্যানার ছবি</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Banner Preview */}
            <div className="h-36 rounded-2xl overflow-hidden relative bg-[#1B4332] border-2 border-[#E9E5DC] shadow-inner flex items-center justify-center">
              {coverUrl ? (
                <img src={coverUrl} alt="Store Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-3xl mb-1 opacity-50">🏞️</p>
                  <p className="text-white/80 text-xs font-semibold">কোনো কভার ছবি আপলোড করা হয়নি</p>
                  <p className="text-white/50 text-[11px]">খুঁজুন পেজে আপনার দোকানের কভার ছবি দেখাবে</p>
                </div>
              )}

              {coverUrl && (
                <button
                  onClick={handleRemoveCoverImage}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-3 bg-[#F0F7F2] rounded-xl border border-[#52B788]/30 flex items-start gap-2">
              <span className="text-sm">📌</span>
              <p className="text-xs text-[#1B4332]">
                <strong>নিয়মাবলী:</strong> কভার ছবির সাইজ অবশ্যই ১ MB এর নিচে হতে হবে। আপলোডের আগে ক্রপ ও পজিশন ঠিক করে নিন।
              </p>
            </div>

            <div className="flex gap-2">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleCoverFileChange}
                className="hidden"
                id="cover-file-input"
              />
              <label
                htmlFor="cover-file-input"
                className="flex-1 py-3 bg-[#1B4332] hover:bg-[#143427] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center"
              >
                📸 নতুন কভার ফটো নির্বাচন ও ক্রপ
              </label>

              {coverUrl && (
                <button
                  onClick={handleRemoveCoverImage}
                  className="px-4 py-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  ছবি মুছুন
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Business Details */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <h2 className="font-display font-bold text-[#1A1916] text-base mb-3">ব্যবসার বিবরণ</h2>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                  ব্যবসার নাম (বাংলা) *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="আপনার দোকানের নাম"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-sm text-[#1A1916] font-bold outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                  English Name (QR Slug URL) *
                </label>
                <input
                  type="text"
                  value={businessNameEn}
                  onChange={(e) => setBusinessNameEn(e.target.value)}
                  placeholder="e.g. My Coffee Shop"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-sm text-[#1A1916] font-medium outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>

            {/* Category — updated list */}
            <div>
              <label className="text-[#6B6158] text-xs font-semibold block mb-1.5">ক্যাটাগরি</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      category === cat
                        ? "bg-[#1B4332] text-white shadow-xs"
                        : "bg-[#F7F5F0] text-[#6B6158] border border-[#E9E5DC]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Open/Closed toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-[#1A1916] text-sm font-semibold">এখন খোলা আছে?</p>
                <p className="text-[#6B6158] text-xs">কাস্টমাররা লাইভ স্ট্যাটাস দেখতে পাবেন</p>
              </div>
              <button
                onClick={() => setIsOpen((v) => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isOpen ? "bg-[#1B4332]" : "bg-[#E9E5DC]"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    isOpen ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                  যোগাযোগ ফোন নম্বর
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] font-medium outline-none focus:border-[#1B4332]"
                />
              </div>

              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                  <ClockIcon size={12} className="inline mr-1" />
                  খোলার সময়সূচি
                </label>
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="যেমন: সকাল ৯টা – রাত ১০টা"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] font-medium outline-none focus:border-[#1B4332]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Address & Geofence */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <h2 className="font-display font-bold text-[#1A1916] text-base mb-3 flex items-center gap-2">
            <MapPinIcon size={16} className="text-[#1B4332]" />
            ঠিকানা ও জিওফেন্স সুরক্ষা
          </h2>

          <div className="p-3.5 bg-[#F7F5F0] rounded-2xl mb-3 border border-[#E9E5DC]">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="বাড়ি নম্বর, রোড, এলাকা, শহর"
              className="w-full bg-transparent text-[#1A1916] text-xs font-medium outline-none mb-1.5"
            />
            {lat !== null && lng !== null && (
              <p className="text-[#B0A99E] text-[11px] font-mono">
                অক্ষাংশ: {lat}°, দ্রাঘিমাংশ: {lng}°
              </p>
            )}
          </div>

          <button
            onClick={handleUseCurrentLocation}
            className="w-full py-2.5 rounded-xl border border-[#1B4332] text-[#1B4332] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#F0F7F2] transition-colors cursor-pointer"
          >
            <MapPinIcon size={14} />
            বর্তমান GPS অবস্থান সিঙ্ক করুন
          </button>

          <div className="mt-3 p-3 bg-[#F0F7F2] rounded-xl border border-[#52B788]/30">
            <p className="text-[#1B4332] text-xs font-semibold">
              🛡️ জিওফেন্স ব্যাসার্ধ: {geofenceM} মিটার
            </p>
            <p className="text-[#6B6158] text-[11px] mt-0.5">
              দোকানের {geofenceM} মিটারের বাইরের স্ক্যান স্বয়ংক্রিয়ভাবে চিহ্নিত হবে।
            </p>
          </div>
        </div>

        {/* 4. Social & Review Links */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <h2 className="font-display font-bold text-[#1A1916] text-base mb-3">
            সোশ্যাল মিডিয়া ও রিভিউ লিংক
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                WhatsApp নম্বর / লিংক
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+8801XXXXXXXXX"
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] outline-none focus:border-[#1B4332]"
              />
            </div>
            <div>
              <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                Instagram Username
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourbrand"
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] outline-none focus:border-[#1B4332]"
              />
            </div>
            <div>
              <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                Google Maps / Review Link
              </label>
              <input
                type="text"
                value={reviewLink}
                onChange={(e) => setReviewLink(e.target.value)}
                placeholder="https://g.page/r/..."
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>
        </div>

        {/* 5. Language Preference */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D8EDDF] flex items-center justify-center text-xl">
                🌐
              </div>
              <div>
                <h2 className="font-display font-bold text-[#1A1916] text-base">ভাষা / Language</h2>
                <p className="text-xs text-[#6B6158]">অ্যাপের ভাষা নির্বাচন করুন</p>
              </div>
            </div>
            <div className="flex bg-[#F7F5F0] p-1 rounded-xl border border-[#E9E5DC]">
              <button
                type="button"
                onClick={() => handleSetLanguage("বাংলা")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentLang === "বাংলা"
                    ? "bg-[#1B4332] text-white shadow-xs"
                    : "text-[#6B6158] hover:text-[#1A1916]"
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => handleSetLanguage("English")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentLang === "English"
                    ? "bg-[#1B4332] text-white shadow-xs"
                    : "text-[#6B6158] hover:text-[#1A1916]"
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* 6. Staff Mode PIN Setup */}
        <div className="bg-white rounded-3xl card-shadow p-5 border border-[#E9E5DC]">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E9E5DC]">
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
              <span className="text-base">🔐</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-[#1A1916] text-base">স্টাফ মোড পিন</h2>
              <p className="text-xs text-[#6B6158]">
                {pinStatus?.hasPin
                  ? `পিন সেট আছে · ${pinStatus.ownerPhoneMasked || "মালিকের নম্বরে OTP যাবে"}`
                  : "এখনো পিন সেট করা হয়নি"}
              </p>
            </div>
          </div>

          {pinSuccess && (
            <div className="mb-3 bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-3 py-2.5 rounded-xl text-xs font-bold">
              {pinSuccess}
            </div>
          )}

          {pinError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-600 px-3 py-2.5 rounded-xl text-xs font-bold">
              {pinError}
            </div>
          )}

          {pinStep === "idle" && (
            <button
              onClick={handleRequestPinOtp}
              className="w-full py-3 rounded-xl bg-[#1B4332] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#143427] transition-all cursor-pointer"
            >
              🔑 {pinStatus?.hasPin ? "পিন পরিবর্তন করুন" : "পিন সেট করুন"}
            </button>
          )}

          {pinStep === "sending_otp" && (
            <div className="text-center py-3 text-[#6B6158] text-sm">
              <span className="inline-block animate-spin mr-1">⏳</span> OTP পাঠানো হচ্ছে...
            </div>
          )}

          {pinStep === "enter_otp_and_pin" && (
            <div className="space-y-3">
              <div className="bg-[#FEF3C7]/50 border border-[#F59E0B]/30 rounded-xl px-3 py-2.5 text-xs text-[#B45309]">
                📱 মালিকের ফোনে ({pinStatus?.ownerPhoneMasked || "নিবন্ধিত নম্বরে"}) OTP পাঠানো হয়েছে
              </div>
              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">OTP কোড</label>
                <input
                  type="text"
                  value={pinOtp}
                  onChange={(e) => setPinOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-সংখ্যার OTP"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#1A1916] outline-none focus:border-[#1B4332] tracking-widest"
                />
              </div>
              <div>
                <label className="text-[#6B6158] text-xs font-semibold block mb-1">
                  নতুন ৪-সংখ্যার পিন
                </label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-2xl font-mono text-[#1A1916] outline-none focus:border-[#1B4332] tracking-[0.5em]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPinStep("idle"); setPinError(""); setNewPin(""); setPinOtp("") }}
                  className="flex-1 py-2.5 rounded-xl border border-[#E9E5DC] text-[#6B6158] text-sm font-semibold hover:bg-[#F7F5F0] transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleSetPin}
                  className="flex-[2] py-2.5 rounded-xl bg-[#1B4332] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#143427] transition-all cursor-pointer"
                >
                  <CheckIcon size={16} />
                  Save PIN
                </button>
              </div>
            </div>
          )}

          {pinStep === "saving" && (
            <div className="text-center py-3 text-[#6B6158] text-sm">
              <span className="inline-block animate-spin mr-1">⏳</span> Saving PIN...
            </div>
          )}
        </div>

        {/* Bottom Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-[#1B4332] hover:bg-[#143427] text-white font-display font-black text-base shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshIcon size={18} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckIcon size={18} />
              <span>Save Changes</span>
            </>
          )}
        </button>

        {/* Log Out */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl border border-[#E9E5DC] text-[#6B6158] hover:text-[#1A1916] font-bold text-xs flex items-center justify-center gap-2 hover:bg-white transition-colors cursor-pointer"
        >
          <LogOutIcon size={14} />
          লগ আউট
        </button>
      </div>

      {/* Interactive Cover Photo Cropper Modal */}
      {rawCoverImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full card-shadow-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-black text-lg text-[#1A1916]">কভার ছবি ক্রপ করুন</h3>
                <p className="text-xs text-[#6B6158]">ব্যানার ফ্রেমের সাথে ছবি মিলিয়ে নিন</p>
              </div>
              <button
                onClick={() => setRawCoverImage(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Viewport Frame */}
            <div className="relative w-full h-48 bg-black rounded-2xl overflow-hidden mb-4 flex items-center justify-center border-2 border-[#52B788]">
              <img
                src={rawCoverImage}
                alt="Crop preview"
                className="max-w-none transition-transform select-none pointer-events-none"
                style={{
                  transform: `scale(${coverScale}) translateY(${coverOffsetY}px)`,
                  width: "100%",
                  height: "auto",
                }}
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/60 rounded-2xl" />
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2 mb-4 bg-[#F7F5F0] p-3 rounded-2xl border border-[#E9E5DC]">
              <div className="flex items-center justify-between text-xs text-[#1A1916] font-bold">
                <span>🔍 জুম (Zoom): {coverScale.toFixed(1)}x</span>
                <button
                  type="button"
                  onClick={() => { setCoverScale(1); setCoverOffsetY(0) }}
                  className="text-[#1B4332] text-[11px] underline"
                >
                  রিসেট
                </button>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={coverScale}
                onChange={(e) => setCoverScale(parseFloat(e.target.value))}
                className="w-full accent-[#1B4332] cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs text-[#1A1916] font-bold pt-2 border-t border-[#E9E5DC]">
                <span>↕️ উচ্চতা পজিশন:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCoverOffsetY((y) => y - 15)}
                    className="px-2.5 py-1 bg-white border border-[#E9E5DC] rounded-lg text-xs font-bold text-[#1B4332]"
                  >
                    ▲ উপরে
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverOffsetY((y) => y + 15)}
                    className="px-2.5 py-1 bg-white border border-[#E9E5DC] rounded-lg text-xs font-bold text-[#1B4332]"
                  >
                    ▼ নিচে
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRawCoverImage(null)}
                className="flex-1 py-3 bg-[#F0EDE6] text-[#6B6158] rounded-xl text-xs font-bold hover:bg-[#E5E0D6] cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleApplyCrop}
                className="flex-[2] py-3 bg-[#1B4332] text-white rounded-xl text-xs font-bold hover:bg-[#143427] cursor-pointer shadow-sm"
              >
                ✓ ক্রপ ও ব্যানার নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
