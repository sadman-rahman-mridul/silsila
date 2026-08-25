import { useState, useEffect, useRef, useCallback } from "react"
import jsQR from "jsqr"
import confetti from "canvas-confetti"
import { api, type Merchant, type PendingApproval } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import StampGrid from "../../components/StampGrid"
import {
  CameraIcon,
  FlipCameraIcon,
  FlashIcon,
  CheckIcon,
  MapPinIcon,
  RefreshIcon,
  ChevronRightIcon,
} from "../../components/Icons"

type ScanStep = "scan" | "pending" | "confirmed" | "rejected" | "error"

interface ScanFlowProps {
  onNavigateToCard?: (merchantId: string) => void
  onNavigateHome?: () => void
}

export default function ScanFlow({ onNavigateToCard, onNavigateHome }: ScanFlowProps) {
  const { user, profile } = useAuth()
  const [step, setStep] = useState<ScanStep>("scan")
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("")
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [dots, setDots] = useState(1)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stampsData, setStampsData] = useState<{ stamps: number; target: number; cardId?: string } | null>(null)

  // Real-time camera states
  const [cameraActive, setCameraActive] = useState<boolean>(true)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const customerId = profile?.id || user?.uid || null
  const customerName = profile?.name || user?.displayName || ""
  const customerPhone = profile?.phone || user?.phoneNumber || ""

  // Merchant directory, used to resolve a scanned QR payload to a merchant id.
  useEffect(() => {
    api.getMerchants().then(setMerchants).catch(console.warn)
  }, [])

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    stopCamera()

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("এই ব্রাউজারে ক্যামেরা সাপোর্ট পাওয়া যায়নি")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        await videoRef.current.play()
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0]
      const capabilities = (track.getCapabilities?.() as any) || {}
      setTorchSupported(!!capabilities.torch)

      setCameraActive(true)
      requestAnimationFrame(scanVideoFrame)
    } catch (err: any) {
      console.warn("Camera initialization warning:", err)
      let msg = "ক্যামেরা চালু করা সম্ভব হয়নি।"
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "ক্যামেরা পারমিশন ডিনাই করা হয়েছে। ব্রাউজার সেটিংসে গিয়ে ক্যামেরা ব্যবহারের অনুমতি দিন।"
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "কোনো উপযুক্ত ক্যামেরা ডিভাইস পাওয়া যায়নি।"
      }
      setCameraError(msg)
      setCameraActive(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  // Manage Camera on step changes
  useEffect(() => {
    if (step === "scan") {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [step, startCamera, stopCamera])

  // Extract merchant ID from raw decoded QR string (supporting silsila.ai.studio/[company name])
  const parseMerchantFromQr = useCallback(
    (data: string): string => {
      try {
        const raw = data.trim()

        // 1. JSON format: { "merchantId": "m1" }
        if (raw.startsWith("{") && raw.endsWith("}")) {
          const parsed = JSON.parse(raw)
          if (parsed.merchantId) return parsed.merchantId
          if (parsed.m) return parsed.m
        }

        // 2. Query param ?m= or ?merchantId=
        if (raw.includes("?")) {
          const urlObj = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
          const mParam = urlObj.searchParams.get("m") || urlObj.searchParams.get("merchantId")
          if (mParam) return mParam
        }

        // 3. Any dynamic host or custom domain path: [host]/[company-slug] or /s/[id]
        if (raw.includes("/") || raw.startsWith("http")) {
          try {
            const urlObj = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
            const pathParts = urlObj.pathname.split("/").filter(Boolean)
            const slug = pathParts[pathParts.length - 1]

            if (slug) {
              const decoded = decodeURIComponent(slug).toLowerCase().trim()
              // Direct ID match
              const byId = merchants.find((m) => m.id.toLowerCase() === decoded)
              if (byId) return byId.id

              // Name or NameEn slug match
              const byName = merchants.find((m) => {
                const enSlug = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
                const bnSlug = (m.name || "").toLowerCase().replace(/\s+/g, "-")
                return (
                  enSlug === decoded ||
                  bnSlug === decoded ||
                  (m.nameEn && m.nameEn.toLowerCase().includes(decoded)) ||
                  (m.name && m.name.toLowerCase().includes(decoded))
                )
              })
              if (byName) return byName.id
            }
          } catch {
            // ignore URL parse errors
          }
        }

        // 4. Direct merchant ID match or fallback
        const matched = merchants.find((m) => m.id === raw)
        if (matched) return matched.id

        // Unrecognised payload: hand back the raw value so the caller can
        // surface a real "unknown QR" error rather than stamping some other shop.
        return raw
      } catch {
        return ""
      }
    },
    [merchants]
  )

  // Real-time Frame Scanning Loop with jsQR
  const scanVideoFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame)
      return
    }

    const video = videoRef.current
    let canvas = canvasRef.current
    if (!canvas) {
      canvas = document.createElement("canvas")
      canvasRef.current = canvas
    }

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanVideoFrame)
      return
    }

    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code && code.data) {
      const qrData = code.data.trim()
      setLastScannedRaw(qrData)

      // Haptic feedback
      try {
        navigator.vibrate?.(120)
      } catch {}

      const detectedId = parseMerchantFromQr(qrData)
      setSelectedMerchantId(detectedId)

      // Stop camera and initiate scan process
      stopCamera()
      processMerchantScan(detectedId)
      return
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoFrame)
  }

  // Toggle Torch
  async function toggleTorch() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    try {
      const nextTorch = !torchOn
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      })
      setTorchOn(nextTorch)
    } catch (err) {
      console.warn("Torch not toggleable:", err)
    }
  }

  // Flip Camera Front/Back
  function handleFlipCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
  }

  /** Read the device's real position; the geofence check depends on it. */
  function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }

  // Process Merchant Scan & Request Approval
  async function processMerchantScan(mId: string) {
    if (!customerId) {
      setErrorMsg("সিল নিতে অনুগ্রহ করে লগইন করুন।")
      setStep("error")
      return
    }

    setErrorMsg(null)
    setSecondsLeft(60)
    setSelectedMerchantId(mId)

    // The customer's actual coordinates — never a value derived from the
    // merchant's own position, which would make the geofence meaningless.
    const position = await getCurrentPosition()

    try {
      const res = await api.scanMerchant({
        merchantId: mId,
        customerId,
        customerName,
        customerPhone,
        scanLat: position?.lat,
        scanLng: position?.lng,
      })

      setPendingApproval(res.pendingApproval)
      if (res.pendingApproval) {
        firebaseService.syncPendingApproval(res.pendingApproval)
      }
      setStep("pending")
    } catch (err: any) {
      setErrorMsg(err.message || "স্ক্যান যাচাইকরণে সমস্যা হয়েছে")
      setStep("error")
    }
  }

  // Handle Photo / QR Upload from file
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code && code.data) {
          const detectedId = parseMerchantFromQr(code.data)
          setSelectedMerchantId(detectedId)
          stopCamera()
          processMerchantScan(detectedId)
        } else {
          setErrorMsg("ছবিতে কোনো বৈধ সিলসিলা QR কোড শনাক্ত করা যায়নি। পরিষ্কার ছবি দিন।")
          setStep("error")
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Timer & Real-time onSnapshot subscription for Pending Approval status
  useEffect(() => {
    if (step !== "pending" || !pendingApproval) return

    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStep("error")
          setErrorMsg("অনুমোদনের সময় পার হয়ে গেছে (Timeout)। আবার স্ক্যান করুন।")
          return 0
        }
        return s - 1
      })
      setDots((d) => (d % 3) + 1)
    }, 1000)

    // Live listener for the approval outcome. On approval the authoritative
    // stamp counts come from the polling call below, not from guessed numbers.
    const unsubscribe = firebaseService.subscribeApprovalStatus(pendingApproval.id, (firestoreApproval) => {
      if (!firestoreApproval) return
      if (firestoreApproval.resolution === "rejected") {
        setStep("rejected")
      }
    })

    const poll = setInterval(async () => {
      try {
        const res = await api.checkApprovalStatus(pendingApproval.id)
        if (res.status === "approved") {
          setStampsData({
            stamps: res.card?.stamps ?? 0,
            target: res.card?.target ?? 0,
            cardId: res.card?.id,
          })
          if (res.card) {
            firebaseService.syncCardToFirestore(res.card)
          }
          setStep("confirmed")
          try {
            confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } })
          } catch {}
          clearInterval(poll)
        } else if (res.status === "rejected") {
          setStep("rejected")
          clearInterval(poll)
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 1500)

    return () => {
      clearInterval(timer)
      clearInterval(poll)
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [step, pendingApproval, selectedMerchantId])

  const selectedMerchant = merchants.find((m) => m.id === selectedMerchantId) || null

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-[#1B4332] px-5 pt-12 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">রিয়েল-টাইম QR স্ক্যানার</h1>
            <p className="text-[#52B788] text-xs mt-0.5">দোকানের কাউন্টার কিউআর কোডে ক্যামেরা তাক করুন</p>
          </div>
          {step === "scan" && (
            <div className="flex items-center gap-2">
              {torchSupported && (
                <button
                  onClick={toggleTorch}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    torchOn ? "bg-[#F59E0B] text-[#1B4332]" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  title="টর্চ অন/অফ"
                >
                  <FlashIcon size={16} />
                </button>
              )}
              <button
                onClick={handleFlipCamera}
                className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                title="ক্যামেরা পরিবর্তন"
              >
                <FlipCameraIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 overflow-y-auto">
        {step === "scan" && (
          <div className="w-full max-w-sm animate-fade-in text-center py-2">
            {/* Real-time Camera Viewfinder Container */}
            <div className="relative mx-auto w-64 h-64 sm:w-72 sm:h-72 mb-4 rounded-3xl overflow-hidden card-shadow-lg border-2 border-white/60 bg-black">
              {/* Video Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />

              {/* Camera Fallback / Inactive Screen */}
              {!cameraActive && (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#1A1916] text-white">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3 text-[#F59E0B]">
                    <CameraIcon size={28} />
                  </div>
                  <p className="text-xs font-semibold text-white/90 mb-1">ক্যামেরা অ্যাক্টিভ নয়</p>
                  <p className="text-[11px] text-white/60 leading-relaxed mb-4">
                    {cameraError || "ক্যামেরা চালু করতে নিচে বোতামে চাপ দিন"}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#143427]"
                  >
                    <RefreshIcon size={14} /> ক্যামেরা চালু করুন
                  </button>
                </div>
              )}

              {/* Viewfinder Target Frame Overlay */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Subtle Dark Vignette */}
                  <div className="absolute inset-0 bg-black/20" />

                  {/* Laser Scan Animation Line */}
                  <div className="absolute left-4 right-4 h-0.5 bg-[#52B788] shadow-[0_0_12px_#52B788] animate-pulse top-1/2 -translate-y-1/2" />

                  {/* Corner Reticles */}
                  <div className="absolute inset-6 pointer-events-none">
                    <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#F59E0B] rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#F59E0B] rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#F59E0B] rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#F59E0B] rounded-br-xl" />
                  </div>

                  <div className="absolute bottom-3 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] text-white font-medium">
                    ⚡ লাইভ QR স্ক্যান চলছে...
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Bar (Photo upload & direct test) */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white border border-[#E9E5DC] text-[#1B4332] text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#F7F5F0]">
                <span>🖼️ ছবি থেকে QR স্ক্যান</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

            </div>
          </div>
        )}

        {/* Pending Staff Approval Screen */}
        {step === "pending" && (
          <div className="w-full max-w-sm animate-fade-in text-center py-4">
            <div className="relative mx-auto w-24 h-24 mb-5">
              <div className="absolute inset-0 rounded-full bg-[#D8EDDF] animate-ping opacity-70" />
              <div className="relative w-24 h-24 rounded-full bg-[#D8EDDF] flex items-center justify-center">
                <span className="text-4xl animate-bounce">⏳</span>
              </div>
            </div>

            <h2 className="font-display font-bold text-[#1A1916] text-2xl mb-1">
              অনুমোদনের অপেক্ষায়{".".repeat(dots)}
            </h2>
            <p className="text-[#6B6158] text-xs mb-5 leading-relaxed">
              কাউন্টার স্টাফ আপনার স্ক্যান ও বিল যাচাই করছে।<br />অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন।
            </p>

            {selectedMerchant && (
              <div className="bg-white rounded-2xl p-4 card-shadow mb-4 text-left border border-[#E9E5DC]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm"
                    style={{ background: selectedMerchant.logoBg, color: selectedMerchant.logoColor }}
                  >
                    {selectedMerchant.logoInitials}
                  </div>
                  <div>
                    <p className="font-display font-bold text-[#1A1916]">{selectedMerchant.name}</p>
                    <p className="text-[#6B6158] text-xs">{selectedMerchant.area}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-full h-2 bg-[#E9E5DC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F59E0B] rounded-full transition-all duration-1000"
                  style={{ width: `${(secondsLeft / 60) * 100}%` }}
                />
              </div>
              <span className="text-[#6B6158] text-xs font-mono min-w-[2.5rem] text-right">{secondsLeft}s</span>
            </div>

          </div>
        )}

        {/* Confirmed / Stamped Success Screen */}
        {step === "confirmed" && (
          <div className="w-full max-w-sm text-center animate-slide-up py-4">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className="absolute inset-0 rounded-full bg-[#D8EDDF] scale-110" />
              <div className="relative w-24 h-24 rounded-full bg-[#1B4332] flex items-center justify-center shadow-lg text-white text-4xl">
                ✓
              </div>
            </div>

            <h2 className="font-display font-black text-[#1A1916] text-3xl mb-1">সিল পেয়েছেন!</h2>
            <p className="text-[#6B6158] text-xs mb-5">
              {selectedMerchant?.name || "দোকান"} থেকে ১টি নতুন সিল আপনার লয়্যালটি কার্ডে যুক্ত হয়েছে
            </p>

            <div className="bg-white rounded-3xl p-5 card-shadow mb-5 text-left border border-[#E9E5DC]">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-sm"
                  style={{ background: selectedMerchant.logoBg, color: selectedMerchant.logoColor }}
                >
                  {selectedMerchant.logoInitials}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-[#1A1916]">{selectedMerchant.name}</p>
                  <p className="text-[#52B788] text-xs font-bold">
                    {stampsData ? `${stampsData.stamps} / ${stampsData.target} সিল সম্পন্ন` : "সিল সফল"}
                  </p>
                </div>
              </div>

              <StampGrid filled={stampsData?.stamps ?? 0} total={stampsData?.target ?? 0} size="sm" />

              <div className="mt-4 pt-3 border-t border-[#E9E5DC] flex items-center justify-between text-xs">
                <span className="text-[#6B6158]">আজকের স্ট্যাম্প প্রাপ্তি</span>
                <span className="font-bold text-[#1B4332] bg-[#D8EDDF] px-2 py-0.5 rounded-full">
                  ✓ ভেরিফায়েড
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  if (onNavigateToCard && selectedMerchantId) {
                    onNavigateToCard(selectedMerchantId)
                  } else if (onNavigateHome) {
                    onNavigateHome()
                  } else {
                    setStep("scan")
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-[#1B4332] text-white font-display font-bold text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
              >
                <span>কার্ড দেখুন ও পয়েন্ট চেক করুন</span>
                <ChevronRightIcon size={16} />
              </button>

              <button
                onClick={() => setStep("scan")}
                className="w-full py-3 rounded-2xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs hover:bg-white active:scale-[0.98]"
              >
                আরেকটি কিউআর স্ক্যান করুন
              </button>
            </div>
          </div>
        )}

        {/* Rejected Screen */}
        {step === "rejected" && (
          <div className="w-full max-w-sm text-center animate-fade-in py-4">
            <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-4xl mx-auto mb-4">
              ✕
            </div>
            <h2 className="font-display font-bold text-[#1A1916] text-2xl mb-1">অনুমোদন প্রত্যাখ্যাত</h2>
            <p className="text-[#6B6158] text-xs mb-6 leading-relaxed">
              কাউন্টার স্টাফ এই মুহূর্তে স্ক্যানটি অনুমোদন করেননি। বিল বা অর্ডার সম্পর্কিত তথ্যের জন্য ক্যাশিয়ারের সাথে যোগাযোগ করুন।
            </p>
            <button
              onClick={() => setStep("scan")}
              className="w-full py-3.5 rounded-2xl bg-[#1B4332] text-white font-bold text-sm"
            >
              আবার স্ক্যান করুন
            </button>
          </div>
        )}

        {/* Error / Geofence Fault Screen */}
        {step === "error" && (
          <div className="w-full max-w-sm text-center animate-fade-in py-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="font-display font-bold text-[#1A1916] text-xl mb-2">স্ক্যান সম্পন্ন হয়নি</h2>
            <p className="text-red-700 bg-red-50 p-3.5 rounded-2xl text-xs mb-6 leading-relaxed border border-red-200 text-left">
              {errorMsg || "স্ক্যান যাচাই ব্যর্থ হয়েছে"}
            </p>
            <button
              onClick={() => {
                setErrorMsg(null)
                setStep("scan")
              }}
              className="w-full py-3.5 rounded-2xl bg-[#1B4332] text-white font-bold text-sm shadow-sm"
            >
              পুনরায় চেষ্টা করুন
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
