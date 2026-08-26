import { useState, useEffect, useRef } from "react"
import { api, type CustomerCard } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import { useLanguage } from "../../context/LanguageContext"
import {
  LogOutIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  BellIcon,
  CameraIcon,
  CheckIcon,
  RefreshIcon,
  XIcon,
} from "../../components/Icons"

interface ProfilePageProps {
  onBack: () => void
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, profile, logout, updateSessionProfile } = useAuth()
  const { language, setLanguage, toggleLanguage, t } = useLanguage()
  const swipeHandlers = useSwipeBack(onBack)
  const lang = language === "en" ? "English" : "বাংলা"

  function handleToggleLang() {
    toggleLanguage()
  }
  const [notifications, setNotifications] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Profile Photo & In-Browser 1:1 Cropper states
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatarUrl || profile?.photoURL || "")
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [imageOffsetY, setImageOffsetY] = useState(0)
  const [imageOffsetX, setImageOffsetX] = useState(0)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [photoToast, setPhotoToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (profile?.avatarUrl || profile?.photoURL) {
      setAvatarUrl(profile.avatarUrl || profile.photoURL || "")
    }
  }, [profile?.avatarUrl, profile?.photoURL])

  const customer = {
    name: profile?.name || user?.displayName || "সম্মানিত গ্রাহক",
    phone: profile?.phone || user?.phoneNumber || "",
    joinedDate: profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("bn-BD", { year: "numeric", month: "long" })
      : "আগস্ট ২০২৬",
  }

  const initialLetter = customer.name.trim().slice(0, 1) || "গ্র"

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      alert("অনুগ্রহ করে একটি ছবি (PNG, JPG, WebP) নির্বাচন করুন")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setRawImage(reader.result as string)
      setImageScale(1)
      setImageOffsetY(0)
      setImageOffsetX(0)
    }
    reader.readAsDataURL(file)
  }

  async function handleApplyCropAndSave() {
    if (!rawImage || !customerId) return
    setSavingPhoto(true)
    try {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement("canvas")
        const targetSize = 256 // 256x256 resolution
        canvas.width = targetSize
        canvas.height = targetSize
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.fillStyle = "#071D13"
        ctx.fillRect(0, 0, targetSize, targetSize)

        const minDim = Math.min(img.width, img.height)
        const scaleFactor = (targetSize / minDim) * imageScale

        const scaledW = img.width * scaleFactor
        const scaledH = img.height * scaleFactor
        const posX = (targetSize - scaledW) / 2 + imageOffsetX
        const posY = (targetSize - scaledH) / 2 + imageOffsetY

        ctx.drawImage(img, posX, posY, scaledW, scaledH)

        // Compress to efficient JPEG (~15-25 KB)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8)

        // 1. Save to Firestore
        await firebaseService.updateCustomerProfile(customerId, {
          avatarUrl: compressedDataUrl,
          photoURL: compressedDataUrl,
        }).catch(console.warn)

        // 2. Update local session profile
        updateSessionProfile({
          avatarUrl: compressedDataUrl,
          photoURL: compressedDataUrl,
        })
        setAvatarUrl(compressedDataUrl)
        setRawImage(null)
        setSavingPhoto(false)
        setPhotoToast("Profile photo updated successfully ✓")
        setTimeout(() => setPhotoToast(null), 3000)
      }
      img.src = rawImage
    } catch (err) {
      console.error("Failed to save cropped photo:", err)
      setSavingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    if (!customerId) return
    setAvatarUrl("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    await firebaseService.updateCustomerProfile(customerId, {
      avatarUrl: "",
      photoURL: "",
    }).catch(console.warn)
    updateSessionProfile({ avatarUrl: "", photoURL: "" })
    setPhotoToast("Profile photo removed")
    setTimeout(() => setPhotoToast(null), 3000)
  }

  async function handleLogout() {
    await logout()
    onBack()
  }

  async function handleDeleteData() {
    if (deleteConfirmation !== "DELETE") return
    setLoading(true)
    try {
      if (user?.uid) {
        await api.deleteCustomerData(user.uid)
      }
      setDeleteSuccess(true)
      setTimeout(async () => {
        await logout()
        onBack()
      }, 2500)
    } catch (err) {
      console.error("Delete failed:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent" {...swipeHandlers}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="px-5 pt-8 pb-4">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
            title="হোমে ফিরুন"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center font-display font-black text-[#0A2318] text-xs shadow-sm">
              স
            </div>
            <span className="font-display font-black text-white text-base tracking-wide group-hover:text-[#34D399] transition-colors">
              সিলসিলা
            </span>
          </button>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer border border-white/10"
          >
            <ChevronLeftIcon size={14} />
            <span>হোমে ফিরুন</span>
          </button>
        </div>

        {/* Profile Card Header with 1:1 Avatar & Upload Button */}
        <div className="flex items-center gap-4 bg-[#0E281C]/90 backdrop-blur-xl border border-emerald-500/25 p-4 rounded-3xl shadow-xl">
          <div className="relative group flex-shrink-0">
            <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-emerald-500/40 bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center shadow-xl glow-emerald relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={customer.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-black text-white text-3xl">{initialLetter}</span>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F59E0B] text-[#0A2318] flex items-center justify-center shadow-lg border-2 border-[#0E281C] hover:scale-110 active:scale-95 transition-all cursor-pointer glow-amber"
            >
              <CameraIcon size={14} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-white text-xl truncate drop-shadow-sm">{customer.name}</h1>
            <p className="text-[#34D399] text-xs font-bold mt-0.5 font-mono">{customer.phone}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/50 text-[11px]">সদস্য হয়েছেন {customer.joinedDate} থেকে</span>
              {avatarUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="text-[10px] text-red-400/80 hover:text-red-300 underline cursor-pointer"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Toast notification */}
        {photoToast && (
          <div className="mt-3 bg-[#10B981]/20 border border-[#10B981]/40 text-[#34D399] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in backdrop-blur-md">
            <CheckIcon size={14} />
            <span>{photoToast}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-2">
        {/* PDPA 2026 Compliance Badge */}
        <div className="bg-[#0E281C]/80 border border-emerald-500/20 backdrop-blur-xl rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-xl">
          <ShieldCheckIcon size={22} className="text-[#34D399] flex-shrink-0" />
          <div>
            <p className="text-[#34D399] font-bold text-xs">বাংলাদেশ PDPA ২০২৬ সুরক্ষিত</p>
            <p className="text-white/60 text-[11px] mt-0.5 leading-relaxed">
              আপনার ডেটা সম্পূর্ণ এনক্রিপ্ট করা ও আইনানুযায়ী যেকোনো সময় সম্পূর্ণ মুছে ফেলার অধিকার সংরক্ষিত।
            </p>
          </div>
        </div>

        <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden mb-4">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-xl w-8 flex-shrink-0">🌐</span>
            <p className="flex-1 text-left font-semibold text-sm text-white">ভাষা (Language)</p>
            <span className="text-xs bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 px-3 py-1 rounded-full font-bold">{lang}</span>
            <ChevronRightIcon size={16} className="text-white/40" />
          </button>

          <button
            onClick={() => setNotifications((n) => !n)}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <BellIcon size={18} className="text-[#34D399] flex-shrink-0" />
            <p className="flex-1 text-left font-semibold text-sm text-white">নোটিফিকেশন ও অ্যালার্ট</p>
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${notifications ? "bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30" : "bg-white/10 text-white/50"}`}>
              {notifications ? "চালু" : "বন্ধ"}
            </span>
            <ChevronRightIcon size={16} className="text-white/40" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 transition-colors text-red-400 cursor-pointer"
          >
            <LogOutIcon size={18} className="text-red-400 flex-shrink-0" />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-red-300">আমার ডেটা ও সিল মুছে ফেলুন</p>
              <p className="text-[10px] text-red-400/70">Right to erasure (PDPA ২০২৬ ধারা ৬৩)</p>
            </div>
            <ChevronRightIcon size={16} className="text-red-400/50" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-sm transition-all cursor-pointer backdrop-blur-md active:scale-95"
        >
          <LogOutIcon size={16} />
          লগ আউট
        </button>

        <p className="text-center text-white/30 text-xs mt-6">সিলসিলা v1.0.0</p>
      </div>

      {/* PDPA Erasure Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full card-shadow-md animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-2xl">
              ⚠️
            </div>
            <h3 className="font-display font-black text-xl text-[#1A1916] text-center mb-1">
              সমস্ত ডেটা মুছে ফেলবেন?
            </h3>
            <p className="text-xs text-[#6B6158] text-center mb-4 leading-relaxed">
              বাংলাদেশ ব্যক্তিগত তথ্য সুরক্ষা আইন ২০২৬ অনুসারে আপনার সব স্ট্যাম্প, রিডিম ইতিহাস ও প্রোফাইল অবিলম্বে মুছে ফেলা হবে। এটি ফেরানো সম্ভব নয়।
            </p>

            {deleteSuccess ? (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-center text-xs font-bold mb-4">
                ✓ আপনার ডেটা সফলভাবে মুছে ফেলা হয়েছে। লগ আউট হচ্ছে...
              </div>
            ) : (
              <>
                <p className="text-xs text-[#1A1916] font-semibold mb-2">
                  নিশ্চিত করতে নিচে <span className="font-mono text-red-600">DELETE</span> লিখুন:
                </p>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="w-full border-2 border-red-200 rounded-xl px-3 py-2 text-center font-mono font-bold text-base outline-none focus:border-red-500 mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-3 bg-[#F0EDE6] text-[#6B6158] rounded-xl text-xs font-bold"
                  >
                    বাতিল
                  </button>
                  <button
                    onClick={handleDeleteData}
                    disabled={deleteConfirmation !== "DELETE" || loading}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                  >
                    {loading ? "মুছছে..." : "স্থায়ীভাবে মুছুন"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Interactive 1:1 Circular Profile Picture Cropper Modal with Coffee Themed Sliders */}
      {rawImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A2318] border border-emerald-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-scale-up text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">☕</span>
                <h3 className="font-display font-black text-lg text-white">Set Profile Photo</h3>
              </div>
              <button
                onClick={() => setRawImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            <p className="text-white/60 text-xs mb-4">
              Crop and adjust your photo to fit the frame
            </p>

            {/* 1:1 Viewport Container with Coffee Frame Ring */}
            <div className="relative w-52 h-52 mx-auto rounded-full overflow-hidden border-4 border-[#34D399] shadow-2xl bg-black/40 flex items-center justify-center mb-5 glow-emerald">
              <div
                className="w-full h-full relative"
                style={{
                  transform: `scale(${imageScale}) translate(${imageOffsetX}px, ${imageOffsetY}px)`,
                  transition: "transform 0.05s linear",
                }}
              >
                <img
                  src={rawImage}
                  alt="Cropper preview"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Coffee Themed Adjustment Sliders */}
            <div className="space-y-4 mb-5 px-1">
              {/* Zoom Slider */}
              <div className="bg-[#0E281C]/90 border border-emerald-500/20 p-3 rounded-2xl">
                <div className="flex justify-between items-center text-xs font-semibold text-white/80 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs">🔍</span>
                    <span>Zoom</span>
                  </span>
                  <span className="font-mono text-[#34D399] font-bold">{imageScale.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-white/40">1x</span>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="0.8"
                      max="3"
                      step="0.1"
                      value={imageScale}
                      onChange={(e) => setImageScale(parseFloat(e.target.value))}
                      className="w-full accent-[#34D399] cursor-pointer h-2 bg-[#071D13] rounded-lg"
                    />
                  </div>
                  <span className="text-sm text-[#F59E0B]" title="Coffee Zoom">☕</span>
                </div>
              </div>

              {/* Vertical Position Slider */}
              <div className="bg-[#0E281C]/90 border border-emerald-500/20 p-3 rounded-2xl">
                <div className="flex justify-between items-center text-xs font-semibold text-white/80 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs">↕️</span>
                    <span>Vertical Position</span>
                  </span>
                  <span className="font-mono text-[#34D399] font-bold">{imageOffsetY}px</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-white/40">-80</span>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="-80"
                      max="80"
                      step="2"
                      value={imageOffsetY}
                      onChange={(e) => setImageOffsetY(parseInt(e.target.value))}
                      className="w-full accent-[#34D399] cursor-pointer h-2 bg-[#071D13] rounded-lg"
                    />
                  </div>
                  <span className="text-sm text-[#F59E0B]" title="Coffee Position">☕</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setRawImage(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white/80 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCropAndSave}
                disabled={savingPhoto}
                className="flex-1 py-3 bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-110 text-[#0A2318] rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg glow-emerald disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {savingPhoto ? (
                  <>
                    <RefreshIcon size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Photo ✓</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
