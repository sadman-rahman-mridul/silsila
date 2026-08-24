import { useState, useEffect, useRef } from "react"
import QRCode from "qrcode"
import {
  DownloadIcon,
  PrinterIcon,
  CheckIcon,
  CopyIcon,
  MapPinIcon,
  SparklesIcon,
} from "./Icons"
import { type Merchant, generateMerchantSlug } from "../services/api"

interface MerchantQrGeneratorProps {
  /** The merchant whose counter QR this is. Always the signed-in owner's brand. */
  merchant: Merchant
}

export default function MerchantQrGenerator({ merchant }: MerchantQrGeneratorProps) {
  const [branchName, setBranchName] = useState(merchant.area || "")
  const [counterLabel, setCounterLabel] = useState("কাউন্টার ০১")
  const [colorScheme, setColorScheme] = useState<"brand" | "emerald" | "dark" | "navy">("brand")
  const [includeLogo, setIncludeLogo] = useState(true)
  const [qrSize, setQrSize] = useState<number>(320)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingPoster, setDownloadingPoster] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const currentMerchant = merchant
  const selectedMerchantId = merchant.id

  // Link format: silsila.ai.studio/[company name]
  const companySlug = generateMerchantSlug(currentMerchant)
  const formattedQrDisplayLink = `silsila.ai.studio/${companySlug}`
  const fullScanUrl = `https://silsila.ai.studio/${companySlug}?m=${encodeURIComponent(
    selectedMerchantId
  )}&branch=${encodeURIComponent(branchName)}&counter=${encodeURIComponent(counterLabel)}`

  const colorMap = {
    brand: {
      dark: currentMerchant.logoColor || "#1B4332",
      light: "#FFFFFF",
      name: "ব্র্যান্ড কালার",
    },
    emerald: { dark: "#1B4332", light: "#FFFFFF", name: "সিলসিলা এমারেল্ড" },
    dark: { dark: "#1A1916", light: "#FFFFFF", name: "ক্লাসিক ব্ল্যাক" },
    navy: { dark: "#0F172A", light: "#FFFFFF", name: "রয়্যাল নেভি" },
  }

  useEffect(() => {
    generateDynamicQr()
  }, [selectedMerchantId, branchName, counterLabel, colorScheme, includeLogo, qrSize, currentMerchant.logoUrl, currentMerchant.logoColor, currentMerchant.logoBg])

  async function generateDynamicQr() {
    try {
      const selectedColor = colorMap[colorScheme] || colorMap.brand
      const dataUrl = await QRCode.toDataURL(fullScanUrl, {
        width: qrSize * 2, // 2x for retina quality
        margin: 2,
        errorCorrectionLevel: "H", // High error correction to support centered logo overlay
        color: {
          dark: selectedColor.dark,
          light: selectedColor.light,
        },
      })
      setQrDataUrl(dataUrl)
    } catch (err) {
      console.error("Failed to generate dynamic QR:", err)
    }
  }

  // Helper to load an image into an HTMLImageElement
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = src
    })
  }

  // 1. High-Resolution Standalone QR Code Download (Fixed across all browsers & iframes)
  async function handleDownloadPng() {
    setDownloading(true)
    setDownloadSuccess(null)
    try {
      const selectedColor = colorMap[colorScheme] || colorMap.brand
      const canvas = document.createElement("canvas")
      const size = 1200 // Ultra HD resolution
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas context unavailable")

      // 1. Render QR to canvas
      await QRCode.toCanvas(canvas, fullScanUrl, {
        width: size,
        margin: 3,
        errorCorrectionLevel: "H",
        color: {
          dark: selectedColor.dark,
          light: selectedColor.light,
        },
      })

      // 2. Draw centered brand logo overlay if enabled
      if (includeLogo) {
        const logoSize = size * 0.22
        const logoX = (size - logoSize) / 2
        const logoY = (size - logoSize) / 2
        const borderRadius = 24

        // Draw white background with shadow for logo
        ctx.save()
        ctx.fillStyle = "#FFFFFF"
        ctx.shadowColor = "rgba(0,0,0,0.15)"
        ctx.shadowBlur = 16
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 4

        // Rounded rect path
        ctx.beginPath()
        ctx.roundRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, borderRadius)
        ctx.fill()
        ctx.restore()

        // Border around logo
        ctx.strokeStyle = selectedColor.dark
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.roundRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, borderRadius)
        ctx.stroke()

        if (currentMerchant.logoUrl) {
          try {
            const logoImg = await loadImage(currentMerchant.logoUrl)
            ctx.save()
            ctx.beginPath()
            ctx.roundRect(logoX, logoY, logoSize, logoSize, 16)
            ctx.clip()
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            ctx.restore()
          } catch {
            drawFallbackInitials(ctx, logoX, logoY, logoSize)
          }
        } else {
          drawFallbackInitials(ctx, logoX, logoY, logoSize)
        }
      }

      // 3. Export to Blob and trigger safe download
      canvas.toBlob((blob) => {
        if (!blob) {
          fallbackDataUrlDownload(canvas.toDataURL("image/png"))
          return
        }
        const blobUrl = URL.createObjectURL(blob)
        const filename = `silsila_qr_${companySlug}_${counterLabel.replace(/\s+/g, "_")}.png`
        triggerFileDownload(blobUrl, filename)
      }, "image/png")

      setDownloadSuccess("QR কোড ডাউনলোড সম্পন্ন হয়েছে!")
      setTimeout(() => setDownloadSuccess(null), 3500)
    } catch (err) {
      console.error("QR Download failed:", err)
      // Fallback
      if (qrDataUrl) {
        fallbackDataUrlDownload(qrDataUrl)
      }
    } finally {
      setDownloading(false)
    }
  }

  // 2. High-Resolution Branded Counter Standee Sheet Poster Download
  async function handleDownloadStandeePoster() {
    setDownloadingPoster(true)
    setDownloadSuccess(null)
    try {
      const selectedColor = colorMap[colorScheme] || colorMap.brand
      const canvas = document.createElement("canvas")
      const width = 1200
      const height = 1700
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas context unavailable")

      // Background
      ctx.fillStyle = "#F7F5F0"
      ctx.fillRect(0, 0, width, height)

      // Decorative top banner
      ctx.fillStyle = "#1B4332"
      ctx.fillRect(0, 0, width, 180)

      // Brand Title
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 44px 'Plus Jakarta Sans', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("সিলসিলা · ডিজিটাল লয়্যালটি স্ট্যাম্প", width / 2, 85)

      ctx.fillStyle = "#52B788"
      ctx.font = "bold 26px 'Plus Jakarta Sans', sans-serif"
      ctx.fillText("স্ক্যান করুন এবং উপহার জিতুন", width / 2, 135)

      // Merchant Card Frame
      const cardX = 100
      const cardY = 240
      const cardW = width - 200
      const cardH = height - 340
      ctx.save()
      ctx.fillStyle = "#FFFFFF"
      ctx.shadowColor = "rgba(0,0,0,0.08)"
      ctx.shadowBlur = 30
      ctx.shadowOffsetY = 10
      ctx.beginPath()
      ctx.roundRect(cardX, cardY, cardW, cardH, 36)
      ctx.fill()
      ctx.restore()

      // Merchant Name & Branch
      ctx.fillStyle = "#1A1916"
      ctx.font = "900 56px 'Plus Jakarta Sans', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(currentMerchant.name, width / 2, cardY + 100)

      ctx.fillStyle = "#6B6158"
      ctx.font = "bold 30px 'Plus Jakarta Sans', sans-serif"
      ctx.fillText(`${branchName} (${counterLabel})`, width / 2, cardY + 155)

      // Short Link Badge
      ctx.fillStyle = "#F0F7F2"
      ctx.beginPath()
      ctx.roundRect(width / 2 - 250, cardY + 185, 500, 50, 25)
      ctx.fill()
      ctx.strokeStyle = "#52B788"
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = "#1B4332"
      ctx.font = "bold 24px monospace"
      ctx.fillText(formattedQrDisplayLink, width / 2, cardY + 218)

      // QR Code in center
      const qrCanvas = document.createElement("canvas")
      const qrPixelSize = 650
      await QRCode.toCanvas(qrCanvas, fullScanUrl, {
        width: qrPixelSize,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: selectedColor.dark,
          light: "#FFFFFF",
        },
      })

      const qrDestX = (width - qrPixelSize) / 2
      const qrDestY = cardY + 270
      ctx.drawImage(qrCanvas, qrDestX, qrDestY)

      // Centered Logo in QR
      if (includeLogo) {
        const logoSize = 140
        const logoX = (width - logoSize) / 2
        const logoY = qrDestY + (qrPixelSize - logoSize) / 2

        ctx.fillStyle = "#FFFFFF"
        ctx.beginPath()
        ctx.roundRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, 24)
        ctx.fill()
        ctx.strokeStyle = selectedColor.dark
        ctx.lineWidth = 5
        ctx.stroke()

        if (currentMerchant.logoUrl) {
          try {
            const logoImg = await loadImage(currentMerchant.logoUrl)
            ctx.save()
            ctx.beginPath()
            ctx.roundRect(logoX, logoY, logoSize, logoSize, 16)
            ctx.clip()
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize)
            ctx.restore()
          } catch {
            drawFallbackInitials(ctx, logoX, logoY, logoSize)
          }
        } else {
          drawFallbackInitials(ctx, logoX, logoY, logoSize)
        }
      }

      // Instructions Box at bottom of card
      const instrY = qrDestY + qrPixelSize + 40
      ctx.fillStyle = "#F7F5F0"
      ctx.beginPath()
      ctx.roundRect(cardX + 40, instrY, cardW - 80, 160, 24)
      ctx.fill()

      ctx.fillStyle = "#1B4332"
      ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif"
      ctx.fillText("📱 যেকোনো স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করুন", width / 2, instrY + 65)

      ctx.fillStyle = "#6B6158"
      ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif"
      ctx.fillText("অ্যাপ ডাউনলোড ছাড়াই সিল সংগ্রহ করুন ও ফ্রি রিওয়ার্ড উপভোগ করুন!", width / 2, instrY + 115)

      // Footer
      ctx.fillStyle = "#B0A99E"
      ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif"
      ctx.fillText("Powered by Silsila Loyalty Network · silsila.ai.studio", width / 2, height - 40)

      // Export Standee Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          fallbackDataUrlDownload(canvas.toDataURL("image/png"))
          return
        }
        const blobUrl = URL.createObjectURL(blob)
        const filename = `silsila_standee_${companySlug}_${counterLabel.replace(/\s+/g, "_")}.png`
        triggerFileDownload(blobUrl, filename)
      }, "image/png")

      setDownloadSuccess("স্ট্যান্ডি পোস্টার ডাউনলোড সম্পন্ন হয়েছে!")
      setTimeout(() => setDownloadSuccess(null), 3500)
    } catch (err) {
      console.error("Standee Download failed:", err)
    } finally {
      setDownloadingPoster(false)
    }
  }

  function drawFallbackInitials(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.fillStyle = currentMerchant.logoBg || "#D8EDDF"
    ctx.beginPath()
    ctx.roundRect(x, y, size, size, 16)
    ctx.fill()
    ctx.fillStyle = currentMerchant.logoColor || "#1B4332"
    ctx.font = `bold ${Math.round(size * 0.44)}px 'Plus Jakarta Sans', sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(currentMerchant.logoInitials || "সি", x + size / 2, y + size / 2)
  }

  function triggerFileDownload(url: string, filename: string) {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url)
      }
    }, 200)
  }

  function fallbackDataUrlDownload(dataUrl: string) {
    const filename = `silsila_qr_${companySlug}.png`
    triggerFileDownload(dataUrl, filename)
  }

  function handleCopyLink() {
    navigator.clipboard?.writeText(fullScanUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrintFlyer() {
    window.print()
  }

  return (
    <div className="bg-white rounded-3xl card-shadow border border-[#E9E5DC] overflow-hidden">
      {/* Header Banner */}
      <div className="bg-[#1B4332] p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-[#1B4332] flex items-center justify-center font-display font-black text-lg shadow-md">
              QR
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">ডায়নামিক মার্চেন্ট QR কোড</h2>
              <p className="text-[#52B788] text-xs mt-0.5">
                লিংক ফরম্যাট: <span className="font-mono text-white font-bold">{formattedQrDisplayLink}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-medium">
            <SparklesIcon size={12} className="text-[#F59E0B]" />
            <span>HD ভেক্টর</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Customization Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[#6B6158] text-xs font-semibold block mb-1.5">ব্রাঞ্চ / লোকেশন নাম</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="যেমন: মেইন ব্রাঞ্চ"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] font-medium outline-none focus:border-[#1B4332]"
            />
          </div>

          <div>
            <label className="text-[#6B6158] text-xs font-semibold block mb-1.5">কাউন্টার / টেবিল লেবেল</label>
            <input
              type="text"
              value={counterLabel}
              onChange={(e) => setCounterLabel(e.target.value)}
              placeholder="যেমন: কাউন্টার ০১ বা টেবিল ০৫"
              className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1A1916] font-medium outline-none focus:border-[#1B4332]"
            />
          </div>
        </div>

        {/* Quick Counter Chips */}
        <div>
          <span className="text-[#6B6158] text-[11px] font-medium block mb-1.5">কুইক কাউন্টার প্রিসেট:</span>
          <div className="flex flex-wrap gap-1.5">
            {["ক্যাশ কাউন্টার", "কাউন্টার ০১", "কাউন্টার ০২", "টেবিল ০১", "টেবিল ০৫", "টেকঅ্যাওয়ে"].map((label) => (
              <button
                key={label}
                onClick={() => setCounterLabel(label)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  counterLabel === label ? "bg-[#1B4332] text-white" : "bg-[#F0F7F2] text-[#1B4332] hover:bg-[#D8EDDF]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Color and Logo Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-[#F7F5F0] rounded-2xl border border-[#E9E5DC]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#1A1916]">রং থিম:</span>
            <div className="flex gap-1.5">
              {(["brand", "emerald", "dark", "navy"] as const).map((scheme) => (
                <button
                  key={scheme}
                  onClick={() => setColorScheme(scheme)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    colorScheme === scheme
                      ? "bg-[#1B4332] text-white shadow-xs"
                      : "bg-white text-[#6B6158] border border-[#E9E5DC]"
                  }`}
                >
                  {colorMap[scheme].name}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="w-4 h-4 rounded text-[#1B4332] accent-[#1B4332] cursor-pointer"
            />
            <span className="text-xs font-semibold text-[#1A1916]">মাঝখানে ব্র্যান্ড লোগো যুক্ত করুন</span>
          </label>
        </div>

        {/* Live Standee & QR Card Preview */}
        <div className="bg-[#F7F5F0] rounded-2xl p-5 border border-[#E9E5DC] flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex-1 space-y-2.5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-xs font-bold text-[#1B4332] border border-[#E9E5DC] shadow-xs">
              <MapPinIcon size={13} />
              <span>{branchName || currentMerchant.name}</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#1A1916]">
              {counterLabel || "মেইন কাউন্টার"} স্ট্যান্ডি
            </h3>
            <p className="text-xs text-[#6B6158] leading-relaxed max-w-sm">
              কাস্টমাররা স্মার্টফোন ক্যামেরা অথবা সিলসিলা ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি লয়্যালটি কার্ডে সিল পাবেন।
            </p>

            {/* Display the exact silsila.ai.studio/[company name] format */}
            <div className="pt-1">
              <span className="text-[10px] text-[#6B6158] font-bold block mb-1">সিলসিলা শর্ট লিঙ্ক:</span>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#52B788] text-[#1B4332] font-mono text-xs font-bold shadow-xs">
                <span>🔗 {formattedQrDisplayLink}</span>
              </div>
            </div>
          </div>

          {/* Standee Preview Frame */}
          <div className="w-56 bg-white rounded-2xl p-4 card-shadow-md border border-[#E9E5DC] text-center relative flex-shrink-0">
            <div className="bg-[#1B4332] text-white py-1 px-3 rounded-lg text-[10px] font-bold mb-2 inline-block">
              {currentMerchant.name}
            </div>

            <div className="relative w-44 h-44 mx-auto bg-white rounded-xl p-1.5 flex items-center justify-center border border-gray-100 shadow-inner">
              {qrDataUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={qrDataUrl}
                    alt="Dynamic Merchant QR Code"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  {includeLogo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className="w-9 h-9 rounded-xl bg-white border-2 flex items-center justify-center shadow-md overflow-hidden font-display font-black text-xs"
                        style={{
                          borderColor: currentMerchant.logoColor || "#1B4332",
                          backgroundColor: currentMerchant.logoBg || "#FFFFFF",
                          color: currentMerchant.logoColor || "#1B4332",
                        }}
                      >
                        {currentMerchant.logoUrl ? (
                          <img src={currentMerchant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          currentMerchant.logoInitials || "সি"
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-[#1A1916] rounded flex items-center justify-center text-white text-xs">
                  তৈরি হচ্ছে...
                </div>
              )}
            </div>

            <p className="font-display font-bold text-[#1A1916] text-xs mt-2">{counterLabel}</p>
            <p className="text-[#52B788] font-bold text-[10px]">সিলসিলা স্ট্যাম্প পয়েন্ট</p>
          </div>
        </div>

        {/* Download Feedback Message */}
        {downloadSuccess && (
          <div className="bg-[#D8EDDF] border border-[#52B788] text-[#1B4332] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckIcon size={16} className="text-[#1B4332]" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Action Controls with working Download buttons */}
        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#E9E5DC]">
          {/* 1. Working QR PNG Download Button */}
          <button
            onClick={handleDownloadPng}
            disabled={downloading || !qrDataUrl}
            className="flex-1 min-w-[140px] py-3.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#143427] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <DownloadIcon size={16} />
            <span>{downloading ? "প্রসেস হচ্ছে..." : "QR কোড HD PNG ডাউনলোড"}</span>
          </button>

          {/* 2. Working Branded Counter Standee Sheet Poster Download */}
          <button
            onClick={handleDownloadStandeePoster}
            disabled={downloadingPoster || !qrDataUrl}
            className="flex-1 min-w-[160px] py-3.5 rounded-xl bg-[#F59E0B] text-[#1B4332] text-xs font-black flex items-center justify-center gap-2 hover:bg-[#E58E00] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <DownloadIcon size={16} />
            <span>{downloadingPoster ? "পোস্টার তৈরি হচ্ছে..." : "কাউন্টার স্ট্যান্ডি কার্ড (HD PNG)"}</span>
          </button>

          {/* 3. Print Dialog */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="py-3.5 px-4 rounded-xl bg-[#F0F7F2] border border-[#52B788]/40 text-[#1B4332] text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#D8EDDF] active:scale-[0.98] transition-all cursor-pointer"
          >
            <PrinterIcon size={16} />
            <span>প্রিন্ট ফ্লায়ার</span>
          </button>

          {/* 4. Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="px-4 py-3.5 rounded-xl border border-[#E9E5DC] bg-white text-[#6B6158] hover:text-[#1A1916] text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            {copied ? <CheckIcon size={15} className="text-[#52B788]" /> : <CopyIcon size={15} />}
            <span>{copied ? "কপি হয়েছে!" : "লিংক কপি"}</span>
          </button>
        </div>
      </div>

      {/* Table-Tent Print Flyer Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 card-shadow-lg text-center animate-slide-up border border-[#E9E5DC]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E9E5DC]">
              <h3 className="font-display font-bold text-[#1A1916] text-lg">টেবিল স্ট্যান্ডি ও কাউন্টার ফ্লায়ার</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 rounded-full bg-[#F7F5F0] text-[#6B6158] flex items-center justify-center font-bold text-sm hover:bg-[#E9E5DC] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Printable Standee Sheet */}
            <div
              id="printable-standee"
              className="border-2 border-dashed border-[#52B788] p-5 rounded-2xl bg-[#F7F5F0] mb-4 text-center"
            >
              <div className="bg-[#1B4332] text-white py-2 px-4 rounded-xl mb-3 inline-block">
                <span className="font-display font-black tracking-wide text-sm">সিলসিলা · ডিজিটাল লয়্যালটি</span>
              </div>

              <h4 className="font-display font-black text-[#1A1916] text-xl mb-0.5">{currentMerchant.name}</h4>
              <p className="text-xs text-[#6B6158] font-medium mb-1">
                {branchName} ({counterLabel})
              </p>
              <p className="text-[11px] font-mono font-bold text-[#1B4332] mb-3">
                {formattedQrDisplayLink}
              </p>

              <div className="w-48 h-48 bg-white p-2 rounded-2xl mx-auto mb-3 shadow-md flex items-center justify-center border border-gray-200">
                {qrDataUrl && <img src={qrDataUrl} alt="Printable QR" className="w-full h-full object-contain" />}
              </div>

              <div className="bg-white p-3 rounded-xl card-shadow border border-[#E9E5DC]">
                <p className="font-display font-bold text-[#1B4332] text-xs">📱 যেকোনো ক্যামেরা দিয়ে স্ক্যান করুন</p>
                <p className="text-[11px] text-[#6B6158] mt-0.5">প্রতি অর্ডারে ১টি ডিজিটাল সিল পান এবং ফ্রি কফি/উপহার জিতুন!</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={handlePrintFlyer}
                className="flex-[2] py-3 rounded-xl bg-[#1B4332] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <PrinterIcon size={16} />
                প্রিন্ট করুন (Print Standee)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
