import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { animate, stagger } from "animejs"
import confetti from "canvas-confetti"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"
import { playTactileStampSound, playCelebrationChime } from "../../utils/audioFx"
import {
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
  ScanIcon,
  ShieldCheckIcon,
  ZapIcon,
  UserCheckIcon,
  GlobeIcon,
  GiftIcon,
  SunIcon,
  MoonIcon,
  FireIcon,
  UtensilsIcon,
  ScissorsIcon,
  ShoppingBagIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowRightIcon,
} from "../../components/Icons"

export default function MarketingLanding() {
  const navigate = useNavigate()
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()

  // Interactive 1-tap live demo state
  const [demoStamps, setDemoStamps] = useState(3)
  const [isStamping, setIsStamping] = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)

  // 3D Phone Tilt State
  const phoneContainerRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 })

  // Animation refs
  const stampSlotRefs = useRef<(HTMLDivElement | null)[]>([])
  const inkStampRef = useRef<HTMLDivElement>(null)
  const orb1Ref = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  // Mouse tilt handler for 3D Phone Mockup
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!phoneContainerRef.current) return
    const rect = phoneContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -12
    const rotateY = ((x - centerX) / centerX) * 12
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    setTilt({ x: rotateX, y: rotateY, glareX, glareY })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 })
  }

  // Initialize Anime.js on Mount
  useEffect(() => {
    // 1. Hero Left Elements Stagger
    animate(".anime-hero-item", {
      translateY: [20, 0],
      opacity: [0, 1],
      delay: stagger(70, { start: 80 }),
      duration: 750,
      ease: "outCubic",
    })

    // 2. Feature Pillars Stagger
    animate(".anime-pillar-card", {
      translateY: [25, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 300 }),
      duration: 700,
      ease: "outQuad",
    })

    // 3. Industry Target Cards Entrance
    animate(".anime-industry-card", {
      translateY: [25, 0],
      opacity: [0, 1],
      delay: stagger(90, { start: 400 }),
      duration: 700,
      ease: "outCubic",
    })

    // 5. Video & Pricing
    animate(".anime-walkthrough-video", {
      scale: [0.96, 1],
      opacity: [0, 1],
      duration: 800,
      delay: 450,
      ease: "outCubic",
    })

    animate(".anime-step-item", {
      translateX: [25, 0],
      opacity: [0, 1],
      delay: stagger(80, { start: 500 }),
      duration: 650,
      ease: "outCubic",
    })

    animate(".anime-pricing-card", {
      translateY: [30, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 550 }),
      duration: 750,
      ease: "outCubic",
    })

    // 6. Ambient CTA Orbs Floating Loop
    if (orb1Ref.current) {
      animate(orb1Ref.current, {
        translateX: [-20, 20],
        translateY: [-12, 16],
        scale: [1, 1.15],
        direction: "alternate",
        loop: true,
        duration: 4800,
        ease: "inOutSine",
      })
    }

    if (orb2Ref.current) {
      animate(orb2Ref.current, {
        translateX: [18, -18],
        translateY: [14, -14],
        scale: [1.12, 0.94],
        direction: "alternate",
        loop: true,
        duration: 5400,
        ease: "inOutSine",
      })
    }
  }, [])

  const handleStamp = () => {
    if (isStamping) return
    setIsStamping(true)

    // Play tactile sound FX naturally
    playTactileStampSound()

    // SVG Ink Stamp Physical Press Animation
    if (inkStampRef.current) {
      animate(inkStampRef.current, {
        scale: [0.3, 1.35, 1],
        opacity: [0, 0.95, 0],
        rotate: [-18, 6, 0],
        duration: 520,
        ease: "outElastic(1, .6)",
      })
    }

    // Slight tactile compression on the entire phone body
    if (phoneContainerRef.current) {
      animate(phoneContainerRef.current, {
        scale: [1, 0.985, 1],
        duration: 280,
        ease: "outQuad",
      })
    }

    setTimeout(() => {
      setDemoStamps((prev) => {
        if (prev >= 5) {
          setJustRewarded(false)
          return 1
        }
        const next = prev + 1
        if (next === 5) {
          setJustRewarded(true)
          playCelebrationChime()
          // Fire celebration confetti!
          try {
            confetti({
              particleCount: 75,
              spread: 60,
              origin: { y: 0.62 },
              colors: ["#10B981", "#34D399", "#F59E0B", "#FCD34D", "#FFFFFF"],
            })
          } catch {
            // ignore
          }
        }

        // Animate the newly active slot with elastic pop
        const targetSlot = stampSlotRefs.current[next - 1]
        if (targetSlot) {
          animate(targetSlot, {
            scale: [0.5, 1.25, 1],
            rotate: [-20, 10, 0],
            duration: 480,
            ease: "outElastic(1, .6)",
          })
        }

        return next
      })
      setIsStamping(false)
    }, 280)
  }

  const goToAuth = (role?: "customer" | "merchant") => {
    if (role === "customer") {
      navigate("/customer")
    } else if (role === "merchant") {
      navigate("/merchant")
    } else {
      navigate("/login")
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071D13] text-[#0F172A] dark:text-white font-sans antialiased selection:bg-[#10B981] selection:text-white flex flex-col justify-between transition-colors duration-200">
      
      {/* 10 Minute School Style Sticky Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#071D13]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-white/10 p-1.5 flex items-center justify-center border border-emerald-200 dark:border-white/15 shadow-xs">
              <img src="/sealsela-logo-light.svg" alt="Sealsela Logo" className="w-full h-full object-contain block dark:hidden" />
              <img src="/sealsela-logo-dark.svg" alt="Sealsela Logo" className="w-full h-full object-contain hidden dark:block" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl text-[#0F172A] dark:text-white tracking-tight leading-none">
                Sealsela
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#059669] dark:text-[#34D399] font-bold mt-0.5">
                Digital Loyalty Platform
              </span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#0F172A] dark:text-[#34D399] border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? <SunIcon size={15} className="text-[#F59E0B]" /> : <MoonIcon size={15} className="text-[#064E3B]" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
              title="Toggle Language"
            >
              <GlobeIcon size={14} />
              <span>{isBn ? "EN" : "বাংলা"}</span>
            </button>

            <button
              onClick={() => goToAuth()}
              className="flex px-4 sm:px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-xs sm:text-sm shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all items-center gap-1.5"
            >
              <span>{isBn ? "শুরু করুন" : "Get Started"}</span>
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        
        {/* ========================================================================= */}
        {/* HERO SECTION: High-Impact Pitch */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Punchy Value Proposition */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            {/* Main H1 Headline */}
            <h1 className="anime-hero-item text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.12] text-[#0F172A] dark:text-white">
              {isBn ? (
                <>
                  ভিজিটরদের বানান <br />
                  <span className="text-[#059669] dark:text-[#34D399]">লয়্যাল কাস্টমার!</span>
                </>
              ) : (
                <>
                  Turn your visitors <br />
                  into <span className="text-[#059669] dark:text-[#34D399]">loyal customer!</span>
                </>
              )}
            </h1>

            {/* Subtitle Value Statement */}
            <p className="anime-hero-item text-base sm:text-lg text-slate-600 dark:text-white/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {isBn
                ? "কাউন্টার QR স্ক্যান করে সরাসরি মোবাইলের ব্রাউজারেই সিল সংগ্রহ ও রিওয়ার্ড রিডিম। কোনো অ্যাপ ডাউনলোড করার ঝামেলা নেই।"
                : "QR-powered digital stamp cards for repeat-visit businesses. No app download required: customers scan, collect stamps, and unlock rewards directly in their mobile browser."}
            </p>

            {/* Action Buttons */}
            <div className="anime-hero-item pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <button
                onClick={() => goToAuth()}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-sm sm:text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <span>{isBn ? "মার্চেন্ট হিসেবে শুরু করুন" : "Start with Sealsela"}</span>
                <ChevronRightIcon size={18} />
              </button>
            </div>

            {/* Category Chips Bar with 3D Emojis */}
            <div className="anime-hero-item pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-slate-700 dark:text-white/80">
              <span className="bg-white dark:bg-[#0E1F18] border border-slate-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hot%20beverage/3D/hot_beverage_3d.png" alt="Cafe" className="w-5 h-5 object-contain" />
                <span>{isBn ? "ক্যাফে" : "Cafés"}</span>
              </span>
              <span className="bg-white dark:bg-[#0E1F18] border border-slate-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fork%20and%20knife%20with%20plate/3D/fork_and_knife_with_plate_3d.png" alt="Restaurant" className="w-5 h-5 object-contain" />
                <span>{isBn ? "রেস্টুরেন্ট" : "Restaurants"}</span>
              </span>
              <span className="bg-white dark:bg-[#0E1F18] border border-slate-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Barber%20pole/3D/barber_pole_3d.png" alt="Salon" className="w-5 h-5 object-contain" />
                <span>{isBn ? "স্যালুন ও পার্লার" : "Salons & Barbershops"}</span>
              </span>
              <span className="bg-white dark:bg-[#0E1F18] border border-slate-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Lotus/3D/lotus_3d.png" alt="Spa" className="w-5 h-5 object-contain" />
                <span>{isBn ? "স্পা ও ওয়েলনেস" : "Spas & Wellness"}</span>
              </span>
              <span className="bg-white dark:bg-[#0E1F18] border border-slate-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shopping%20bags/3D/shopping_bags_3d.png" alt="Retail" className="w-5 h-5 object-contain" />
                <span>{isBn ? "রিটেইল স্টোর" : "Retail Stores"}</span>
              </span>
            </div>
          </div>

          {/* Right Column: 3D Interactive Phone Preview */}
          <div className="lg:col-span-5 flex justify-center" style={{ perspective: "1000px" }}>
            <div
              ref={phoneContainerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: isStamping ? "none" : "transform 0.15s ease-out",
              }}
              className="w-full max-w-[310px] sm:max-w-[340px] bg-white dark:bg-[#071D13] border-4 border-slate-200 dark:border-white/20 rounded-[44px] p-3 shadow-2xl relative overflow-hidden text-white select-none cursor-pointer"
            >
              {/* Phone Dynamic Island */}
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 dark:bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-700 mr-2" />
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              </div>

              {/* Dynamic Mouse Glare Sheen */}
              <div
                className="absolute inset-0 pointer-events-none z-20 rounded-[40px] opacity-20"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.6) 0%, transparent 60%)`,
                }}
              />

              {/* SVG Physical Ink Stamp Seal */}
              <div
                ref={inkStampRef}
                className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center opacity-0 scale-50"
              >
                <div className="w-36 h-36 rounded-full border-4 border-dashed border-[#F59E0B] bg-amber-500/25 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center text-[#F59E0B] shadow-2xl rotate-[-12deg]">
                  <span className="text-[9px] font-mono uppercase tracking-widest font-black">★ SEALSELA VERIFIED ★</span>
                  <span className="text-2xl font-black my-0.5">STAMPED</span>
                  <span className="text-[8px] font-mono font-bold">1-TAP COUNTER APPROVAL</span>
                </div>
              </div>

              {/* Phone Screen Card Container */}
              <div className="bg-gradient-to-br from-[#064E3B] to-[#0D3824] border border-emerald-500/40 rounded-[34px] p-4 pt-7 shadow-inner relative overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-md">
                      <FireIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-white text-xs sm:text-sm leading-tight">Sealsela Rewards Pass</h3>
                      <p className="text-[10px] text-[#34D399] font-medium">Digital Stamp Wallet</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#F59E0B] bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/40">
                    {demoStamps} / 5
                  </span>
                </div>

                {/* 5 Stamp Slots */}
                <div className="bg-[#071D13]/80 border border-white/10 rounded-2xl p-3.5 text-center mb-3">
                  <p className="text-[10px] text-white/70 mb-2 font-mono font-bold">
                    {demoStamps >= 5
                      ? (isBn ? "★ রিওয়ার্ড আনলক: ১টি বিশেষ উপহার!" : "★ REWARD UNLOCKED: 1 SPECIAL GIFT!")
                      : isBn
                      ? `আর মাত্র ${5 - demoStamps}টি সিল বাকি`
                      : `${5 - demoStamps} visit${5 - demoStamps === 1 ? "" : "s"} away from reward`}
                  </p>

                  <div className="flex justify-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const isFilled = i < demoStamps
                      return (
                        <div
                          key={i}
                          ref={(el) => {
                            stampSlotRefs.current[i] = el
                          }}
                          className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-xs transition-all duration-300 ${
                            isFilled
                              ? "bg-gradient-to-br from-[#10B981] to-[#047857] border-[#34D399] text-white shadow-md glow-emerald scale-105"
                              : "bg-white/5 border-white/15 text-white/20"
                          }`}
                        >
                          {isFilled ? <FireIcon size={14} className="text-amber-300" /> : "○"}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Reward Milestone Banner */}
                <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 mb-3">
                  <GiftIcon size={16} className="text-[#F59E0B] flex-shrink-0" />
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {isBn ? "৫টি সিলের পর ১টি আকর্ষণীয় উপহার ফ্রি" : "Collect 5 stamps ➔ 1 Free Reward"}
                  </span>
                </div>

                {/* Interactive Stamp Button */}
                <button
                  onClick={handleStamp}
                  disabled={isStamping}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#071D13] font-display font-black text-xs shadow-lg glow-amber cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <ScanIcon size={15} />
                  <span>{isStamping ? "Stamping..." : demoStamps >= 5 ? "Reset Demo Card" : "Tap to Stamp (+1)"}</span>
                </button>

                <p className="text-[9px] text-white/60 text-center mt-2 font-mono">
                  ✦ Live 3D Touch Simulator: Tap to test ✦
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3 CORE PILLARS: BENTO STYLED WITH 3D EMOJIS (NO NUMBERING) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {/* Card 1: Digital Loyalty Card */}
          <div className="anime-pillar-card bg-white dark:bg-[#0E281C] border-2 border-slate-200 dark:border-emerald-500/20 rounded-[28px] p-6 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex items-start gap-4 group">
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 dark:bg-white/5 border border-emerald-500/20 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform">
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Credit%20card/3D/credit_card_3d.png" alt="Digital Card" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h4 className="font-display font-black text-[#0F172A] dark:text-white text-base">
                {isBn ? "ডিজিটাল লয়্যালটি কার্ড" : "Digital Loyalty Card"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed">
                {isBn
                  ? "কোনো অ্যাপ ডাউনলোড ছাড়াই সরাসরি ক্যামেরা দিয়ে কিউআর স্ক্যানে ডিজিটাল সিল সংগ্রহ।"
                  : "Customers scan your counter QR code directly from their mobile camera with zero app download."}
              </p>
            </div>
          </div>

          {/* Card 2: Send Instant SMS to Retain */}
          <div className="anime-pillar-card bg-white dark:bg-[#0E281C] border-2 border-slate-200 dark:border-emerald-500/20 rounded-[28px] p-6 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex items-start gap-4 group">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform">
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Speech%20balloon/3D/speech_balloon_3d.png" alt="SMS Campaign" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h4 className="font-display font-black text-[#0F172A] dark:text-white text-base">
                {isBn ? "ইনস্ট্যান্ট এসএমএস রিটেনশন" : "Send Instant SMS to Retain"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed">
                {isBn
                  ? "অনুপস্থিত কাস্টমারদের আকর্ষণীয় অফার ও রিওয়ার্ড এসএমএস পাঠিয়ে বারবার ফিরিয়ে আনুন।"
                  : "Send targeted SMS campaigns, reward alerts, and special offers to bring customers back."}
              </p>
            </div>
          </div>

          {/* Card 3: Customer CRM & History */}
          <div className="anime-pillar-card bg-white dark:bg-[#0E281C] border-2 border-slate-200 dark:border-emerald-500/20 rounded-[28px] p-6 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex items-start gap-4 group">
            <div className="w-13 h-13 rounded-2xl bg-blue-500/10 dark:bg-white/5 border border-blue-500/20 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform">
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20chart/3D/bar_chart_3d.png" alt="CRM" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h4 className="font-display font-black text-[#0F172A] dark:text-white text-base">
                {isBn ? "কাস্টমার CRM ও ডাটা" : "Customer CRM & History"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-1 leading-relaxed">
                {isBn
                  ? "নিয়মিত কাস্টমারদের চেনা এবং ট্র্যাক করার সহজ রিয়েল-টাইম ড্যাশবোর্ড।"
                  : "Track returning customers, visit frequencies, and loyalty retention easily."}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BUSINESS SOLUTIONS: CLEAN & PRACTICAL BENTO SHOWCASE */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 pt-8 border-t border-slate-200 dark:border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[#0F172A] dark:text-white">
              {isBn ? "আপনার ব্যবসার জন্য উপযুক্ত সমাধান" : "Built for Your Business Type"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/70">
              {isBn
                ? "ক্যাফে, রেস্টুরেন্ট, স্যালুন, স্পা বা রিটেইল শপ: কাউন্টার কিউআর কোডে তৈরি করুন নিয়মিত কাস্টমার।"
                : "Whether you run a coffee bar, a dining restaurant, a salon, or a retail store: launch custom loyalty cards in minutes."}
            </p>
          </div>

          {/* 5 Practical Industry Bento Cards with 3D Emojis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {/* 1. Cafe */}
            <div className="anime-industry-card rounded-[28px] p-6 bg-white dark:bg-[#0E1F18] border-2 border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-13 h-13 rounded-2xl bg-amber-500/10 dark:bg-white/5 border border-amber-500/20 dark:border-white/10 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hot%20beverage/3D/hot_beverage_3d.png" alt="Cafe" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white mb-1.5">
                  {isBn ? "ক্যাফে ও কফি শপ" : "Cafe & Coffee Shops"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">
                  {isBn
                    ? "দৈনিক কফি লাভারদের জন্য ডিজিটাল স্ট্যাম্প। কাউন্টারে ৩ সেকেন্ডে স্ক্যান করে সিল সংগ্রহ।"
                    : "Give regular commuters and coffee lovers an effortless way to collect stamps at the counter."}
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5">
                <span className="inline-block px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
                  {isBn ? "৫টি কফি ➔ ১টি কফি ফ্রি" : "Buy 5 Coffees ➔ 1 Free Drink"}
                </span>
              </div>
            </div>

            {/* 2. Restaurant */}
            <div className="anime-industry-card rounded-[28px] p-6 bg-white dark:bg-[#0E1F18] border-2 border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-13 h-13 rounded-2xl bg-rose-500/10 dark:bg-white/5 border border-rose-500/20 dark:border-white/10 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fork%20and%20knife%20with%20plate/3D/fork_and_knife_with_plate_3d.png" alt="Restaurant" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white mb-1.5">
                  {isBn ? "রেস্টুরেন্ট ও ফুড পয়েন্ট" : "Restaurants & Diners"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">
                  {isBn
                    ? "ডেলিভারি অ্যাপের অতিরিক্ত কমিশন ছাড়াই সরাসরি ডাইন-ইন ভিজিটরদের নিয়মিত কাস্টমার বানান।"
                    : "Encourage repeat dine-in visits directly without giving up high commission margins to delivery apps."}
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5">
                <span className="inline-block px-3 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-bold">
                  {isBn ? "৪ বার ডাইন-ইন ➔ ২০% ছাড়" : "4 Dine-in Visits ➔ 20% Off"}
                </span>
              </div>
            </div>

            {/* 3. Salon */}
            <div className="anime-industry-card rounded-[28px] p-6 bg-white dark:bg-[#0E1F18] border-2 border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-13 h-13 rounded-2xl bg-purple-500/10 dark:bg-white/5 border border-purple-500/20 dark:border-white/10 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Barber%20pole/3D/barber_pole_3d.png" alt="Salon" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white mb-1.5">
                  {isBn ? "স্যালুন ও পার্লার" : "Salons & Barbershops"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">
                  {isBn
                    ? "হেয়ারকাট, বিয়ার্ড ট্রিম ও গ্রুমিং কাস্টমারদের প্রতি মাসে বারবার ফিরিয়ে আনার সহজ কার্ড।"
                    : "Incentivize monthly haircuts, grooming, and styling appointments with progressive milestones."}
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5">
                <span className="inline-block px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-mono font-bold">
                  {isBn ? "৩ বার হেয়ারকাট ➔ ১টি গ্রুমিং ফ্রি" : "3 Haircuts ➔ Free Styling"}
                </span>
              </div>
            </div>

            {/* 4. Spa */}
            <div className="anime-industry-card rounded-[28px] p-6 bg-white dark:bg-[#0E1F18] border-2 border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-13 h-13 rounded-2xl bg-teal-500/10 dark:bg-white/5 border border-teal-500/20 dark:border-white/10 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Lotus/3D/lotus_3d.png" alt="Spa" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white mb-1.5">
                  {isBn ? "স্পা ও ওয়েলনেস সেন্টার" : "Spas & Wellness"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">
                  {isBn
                    ? "বডি ম্যাসেজ, ফেসিয়াল ও থেরাপির মতো প্রিমিয়াম সার্ভিসের জন্য রিপিট বুকিং বৃদ্ধি করুন।"
                    : "Build high-value repeat booking habits for therapeutic sessions, facials, and premium care."}
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5">
                <span className="inline-block px-3 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-mono font-bold">
                  {isBn ? "৫টি সেশন ➔ ১টি থেরাপি ফ্রি" : "5 Sessions ➔ 1 Free Therapy"}
                </span>
              </div>
            </div>

            {/* 5. Retail */}
            <div className="anime-industry-card sm:col-span-2 lg:col-span-2 rounded-[28px] p-6 bg-white dark:bg-[#0E1F18] border-2 border-slate-200 dark:border-emerald-500/20 shadow-xs hover:border-[#10B981] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 dark:bg-white/5 border border-emerald-500/20 dark:border-white/10 flex items-center justify-center mb-4 shadow-xs group-hover:scale-110 transition-transform">
                  <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shopping%20bags/3D/shopping_bags_3d.png" alt="Retail" className="w-8 h-8 object-contain" />
                </div>
                <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white mb-1.5">
                  {isBn ? "কনজিউমার রিটেইল স্টোর" : "Consumer Retail Stores"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/70 leading-relaxed">
                  {isBn
                    ? "ক্লথিং বুটিক, জুয়েলারি, বুকস্টোর ও কসমেটিক্স শপ: ক্যাশ কাউন্টারে ৩ সেকেন্ডের স্ক্যানে রিটেনশন নিশ্চিত করুন।"
                    : "Boutiques, apparel, cosmetics, bookstores, and specialty retail shops driving repeat basket checkouts in 3 seconds."}
                </p>
              </div>
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="inline-block px-3 py-1 rounded-xl bg-emerald-500/10 text-[#059669] dark:text-[#34D399] border border-emerald-500/20 text-xs font-mono font-bold">
                  {isBn ? "৫টি কেনাকাটা ➔ ৩০০ টাকার ভাউচার" : "5 Purchases ➔ ৳300 Gift Voucher"}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-white/60">
                  {isBn ? "ইনস্ট্যান্ট কাউন্টার স্ক্যান" : "Instant Counter Scan"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DYNAMIC CUSTOMER LOSS VS 3X RETENTION (No PaperCards wording) */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 space-y-2.5">
            <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[#0F172A] dark:text-white">
              {isBn ? "সিলসিলা ছাড়া বনাম সিলসিলার সাথে ৩ গুণ রিটেনশন" : "Without Loyalty System vs Sealsela 3x Retention"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/70">
              {isBn
                ? "পুরনো পদ্ধতিতে ৬৮% গ্রাহক হারিয়ে যায়। সিলসিলা নিশ্চিত করে ৩ গুণ বেশি রিটার্ন ভিজিট।"
                : "Without a frictionless digital card, 68% of first-time visitors vanish. Here is the direct comparison."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* BAD: Without Sealsela */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-red-950/15 border-2 border-red-200 dark:border-red-500/30 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-black text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircleIcon size={20} className="text-red-500" />
                    <span>{isBn ? "সিলসিলা ছাড়া (রেকর্ডহীন)" : "Without Digital Loyalty"}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-mono text-xs font-bold">
                    {isBn ? "৬৮% হারায়" : "68% Lost"}
                  </span>
                </div>

                <div className="mb-6 p-4 rounded-2xl bg-red-50/70 dark:bg-black/30 border border-red-100 dark:border-red-500/20">
                  <div className="text-3xl font-display font-black text-red-600 dark:text-red-400">
                    68%
                  </div>
                  <p className="text-xs text-slate-600 dark:text-white/70 mt-0.5 font-medium">
                    {isBn ? "প্রথমবারের ভিজিটররা আর কখনো ফিরে আসেন না" : "of first-time visitors never return again"}
                  </p>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-white/75 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>{isBn ? "কাস্টমারের কোনো ফোন নম্বর বা ডাটাবেইজ তৈরি হয় না" : "Zero customer phone numbers or retention CRM collected"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>{isBn ? "স্টাফের ভুয়া সিল দেওয়া বা কাউন্টারে গরমিলের ঝুঁকি" : "Vulnerable to staff fraud & untracked visits"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>{isBn ? "ফুডপান্ডায় ১৫-২৫% কমিশন দিয়ে ডিসকাউন্ট দিতে হয়" : "Forced to give 15-25% commissions on food aggregators"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>{isBn ? "কোনো রিটেনশন ক্যাম্পেইন বা অফার পাঠানোর সুযোগ নেই" : "No ability to run targeted retention SMS or promos"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* GOOD: With Sealsela 3x */}
            <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#064E3B] to-[#0D3824] dark:bg-none dark:bg-[#0E281C] border-2 border-emerald-400 shadow-xl flex flex-col justify-between text-white glow-emerald">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-black text-lg text-[#34D399] flex items-center gap-2">
                    <CheckCircle2Icon size={20} className="text-[#34D399]" />
                    <span>{isBn ? "সিলসিলার সাথে (৩ গুণ রিটেনশন)" : "With Sealsela (3x Retention)"}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#34D399] border border-emerald-400/30 font-mono text-xs font-bold">
                    {isBn ? "৩ গুণ লাভ" : "3x Regulars"}
                  </span>
                </div>

                <div className="mb-6 p-4 rounded-2xl bg-[#071D13]/80 border border-emerald-500/30">
                  <div className="text-3xl font-display font-black text-[#34D399]">
                    3x
                  </div>
                  <p className="text-xs text-white/80 mt-0.5 font-medium">
                    {isBn ? "৩০ দিনের মধ্যে ৩ গুণ বেশি নিয়মিত ভিজিট" : "higher repeat visits within 30 days guaranteed"}
                  </p>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-white/90 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34D399] font-bold">✓</span>
                    <span>{isBn ? "১০০% মোবাইলের ব্রাউজারে সংরক্ষিত: ইনস্ট্যান্ট স্ক্যান" : "100% saved in phone browser: instant 3s scan"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34D399] font-bold">✓</span>
                    <span>{isBn ? "স্বয়ংক্রিয় ফোন নম্বর ও নিয়মিত ভিজিটের ডাটাবেইজ" : "Automatic customer database & visit history CRM"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34D399] font-bold">✓</span>
                    <span>{isBn ? "পিন কোড সুরক্ষিত স্টাফ মোডে ১-ট্যাপে ভেরিফিকেশন" : "PIN-protected counter staff approval in 1 second"}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#34D399] font-bold">✓</span>
                    <span>{isBn ? "জিরো কমিশন: মাত্র ৫,০০০ টাকায় ৬ মাসের পূর্ণ সেবা" : "Zero commission fees: pure profit retention"}</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => goToAuth("merchant")}
                  className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "আপনার মার্চেন্ট কার্ড চালু করুন" : "Launch Your 3x Card"}</span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* WALKTHROUGH VIDEO: HOW TO USE SEALSELA */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 pt-8 border-t border-slate-200 dark:border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Embedded Responsive YouTube Video */}
            <div className="lg:col-span-7 anime-walkthrough-video">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/30 dark:border-white/15 bg-black aspect-video glow-emerald">
                <iframe
                  className="w-full h-full object-cover"
                  src="https://www.youtube.com/embed/aAMlIs611vo?rel=0&modestbranding=1"
                  title="How to use Sealsela"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Right Column: Walkthrough Video Steps */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-5 text-center lg:text-left">
              <div>
                <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[#0F172A] dark:text-white leading-tight">
                  {isBn ? "সিলসিলা কীভাবে ব্যবহার করবেন" : "How to use Sealsela"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-white/70 mt-2 leading-relaxed">
                  {isBn
                    ? "কাউন্টার QR স্ক্যান থেকে শুরু করে স্ট্যাম্প সংগ্রহ ও রিওয়ার্ড রিডিম পর্যন্ত সহজ ৪টি ধাপ।"
                    : "A complete step-by-step walkthrough of customer stamping, staff approval, and reward unlock."}
                </p>
              </div>

              {/* 3 Steps */}
              <div className="space-y-3 text-left">
                <div className="anime-step-item flex items-start gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-2xs hover:border-emerald-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white">
                      {isBn ? "কাউন্টার QR স্ক্যান" : "Scan Counter QR"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                      {isBn ? "কাস্টমার ফোনের ক্যামেরা দিয়ে স্ক্যান করেন।" : "Customer scans with their mobile camera."}
                    </p>
                  </div>
                </div>

                <div className="anime-step-item flex items-start gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-2xs hover:border-emerald-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white">
                      {isBn ? "১-ট্যাপ স্টাফ অনুমোদন" : "1-Tap Staff Approval"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                      {isBn ? "কর্মীরা পিন সুরক্ষিত স্টাফ মোডে সিল নিশ্চিত করেন।" : "Staff verify visit in secure counter mode."}
                    </p>
                  </div>
                </div>

                <div className="anime-step-item flex items-start gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-2xs hover:border-emerald-400/40 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs sm:text-sm text-[#0F172A] dark:text-white">
                      {isBn ? "স্বয়ংক্রিয় রিওয়ার্ড আনলক" : "Instant Reward Unlock"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                      {isBn ? "টার্গেট পূর্ণ হলে ডিজিটাল ভাউচার কোড তৈরি হয়।" : "Digital voucher generated upon target completion."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => goToAuth("merchant")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "মার্চেন্ট হিসেবে শুরু করুন" : "Start with Sealsela"}</span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRICING PLANS */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 pt-8 border-t border-slate-200 dark:border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[#0F172A] dark:text-white">
              {isBn ? "আপনার ব্যবসার জন্য সেরা প্ল্যান বেছে নিন" : "Pick the Perfect Plan for Your Brand"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-white/70">
              {isBn
                ? "কোনো গোপন ফি বা কমিশন নেই। সম্পূর্ণ এক্সেস, আনলিমিটেড কাস্টমার এবং রিয়েল-টাইম স্টাফ মোড।"
                : "No hidden fees. Unlimited customers, unlimited digital stamps, and instant counter verification."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* PLAN 1: 6 MONTHS */}
            <div className="anime-pricing-card rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0E281C]/90 border-2 border-slate-200 dark:border-white/15 shadow-sm flex flex-col justify-between relative backdrop-blur-xl hover:shadow-xl transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-xl text-[#0F172A] dark:text-white">
                    {isBn ? "৬ মাসের প্যাকেজ" : "6 Months Plan"}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 font-mono text-xs font-bold">
                    {isBn ? "স্টার্টার" : "Starter"}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-display font-black text-[#0F172A] dark:text-white">
                      5,000
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-[#059669] dark:text-[#34D399]">
                      BDT
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-1 font-medium">
                    {isBn ? "৬ মাসের পূর্ণ সেবা (মাত্র ~৮৩৩ টাকা/মাস)" : "Full access for 6 months (~833 BDT/mo)"}
                  </p>
                </div>

                {/* Feature List */}
                <ul className="space-y-3.5 mb-8 text-xs sm:text-sm text-slate-600 dark:text-white/80 font-medium">
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "আনলিমিটেড কাস্টমার ও ডিজিটাল কার্ড" : "Unlimited Customers & Digital Cards"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "স্টাফ পিন মোড ও কাউন্টার কিউআর স্ক্যানার" : "PIN-Protected Counter Staff Mode"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "কাস্টম রিওয়ার্ড ও লয়্যালটি টার্গেট সেটআপ" : "Custom Reward Milestones & Rules"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "কাস্টমার হিস্ট্রি ও অ্যানালিটিক্স ড্যাশবোর্ড" : "Customer Retention History & Analytics"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "স্ট্যান্ডার্ড মার্চেন্ট সাপোর্ট" : "Standard Merchant Support"}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => goToAuth("merchant")}
                className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#0F172A] dark:text-white font-display font-black text-sm transition-all cursor-pointer active:scale-95 shadow-xs border border-slate-200 dark:border-white/15"
              >
                {isBn ? "৬ মাসের প্ল্যান শুরু করুন" : "Get 6 Months Plan"}
              </button>
            </div>

            {/* PLAN 2: 12 MONTHS (BEST VALUE) */}
            <div className="anime-pricing-card rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#064E3B] to-[#0D3824] dark:bg-none dark:bg-[#092217] border-2 border-[#F59E0B] shadow-2xl flex flex-col justify-between relative backdrop-blur-xl text-white glow-amber hover:scale-[1.01] transition-transform duration-300">
              {/* Popular Badge */}
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-[#071D13] font-display font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg">
                {isBn ? "সেরা অফার • ২০০০ টাকা সাশ্রয়" : "BEST VALUE • SAVE 2,000 BDT"}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-xl text-white">
                    {isBn ? "১২ মাসের প্যাকেজ" : "12 Months Plan"}
                  </h3>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 font-mono text-xs font-bold">
                    {isBn ? "১ বছর" : "1 Year"}
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-display font-black text-white">
                      8,000
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-[#34D399]">
                      BDT
                    </span>
                  </div>
                  <p className="text-xs text-[#34D399] mt-1 font-semibold">
                    {isBn ? "১২ মাসের পূর্ণ সেবা (মাত্র ~৬৬৬ টাকা/মাস)" : "Full access for 12 months (~666 BDT/mo)"}
                  </p>
                </div>

                {/* Feature List */}
                <ul className="space-y-3.5 mb-8 text-xs sm:text-sm text-white/90 font-medium">
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "৬ মাসের প্ল্যানের সকল সুবিধা অন্তর্ভুক্ত" : "Everything in 6 Months Plan included"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "প্রিন্ট-রেডি স্ট্যান্ডি ও কিউআর কিট" : "Print-Ready Counter Standee & QR Assets"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "অ্যাডভান্সড রিটেনশন অ্যানালিটিক্স ও ড্রপ-অফ চার্ট" : "Advanced Retention Analytics & Insights"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "অগ্রাধিকার ভিত্তিক অনবোর্ডিং সাপোর্ট" : "Priority Onboarding & Dedicated Support"}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-[#34D399] flex items-center justify-center flex-shrink-0">
                      <CheckIcon size={12} />
                    </div>
                    <span>{isBn ? "বিকাশ ও কার্ডে তাৎক্ষণিক অ্যাক্টিভেশন" : "Instant bKash & Card Activation"}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => goToAuth("merchant")}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#071D13] font-display font-black text-sm transition-all cursor-pointer active:scale-95 shadow-xl glow-amber flex items-center justify-center gap-2"
              >
                <span>{isBn ? "১২ মাসের অফার নিন (সেরা সাশ্রয়)" : "Get 12 Months Plan (Best Value)"}</span>
                <ChevronRightIcon size={16} />
              </button>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* FINAL CALL TO ACTION (ASK THEM TO JOIN SEALSELA) */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 mb-6">
          <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-[#064E3B] via-[#0E3824] to-[#042416] border-2 border-emerald-500/40 shadow-2xl text-center overflow-hidden glow-emerald">
            {/* Ambient Background Glow with anime.js floating orbs */}
            <div
              ref={orb1Ref}
              className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"
            />
            <div
              ref={orb2Ref}
              className="absolute bottom-0 left-1/4 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white leading-tight">
                {isBn ? (
                  <>
                    একবারের ভিজিটরদের বানান <br />
                    <span className="text-[#34D399]">আজীবন বিশ্বস্ত গ্রাহক!</span>
                  </>
                ) : (
                  <>
                    Turn one-time visitors <br />
                    into <span className="text-[#34D399]">lifelong regulars!</span>
                  </>
                )}
              </h2>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-lg mx-auto">
                {isBn
                  ? "শীর্ষস্থানীয় ক্যাফে, রেস্টুরেন্ট, স্যালুন, স্পা ও রিটেইল ব্র্যান্ডগুলোর সাথে যুক্ত হয়ে কাস্টমারদের রিটেনশন বাড়িয়ে নিন।"
                  : "Join top cafes, restaurants, salons, spas, and retail stores growing their repeat sales with Sealsela."}
              </p>

              <div className="pt-4 flex items-center justify-center">
                <button
                  onClick={() => goToAuth("merchant")}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-sm sm:text-base shadow-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "মার্চেন্ট হিসেবে যুক্ত হোন" : "Join Sealsela as Merchant"}</span>
                  <ChevronRightIcon size={18} />
                </button>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/70 font-medium">
                <span className="flex items-center gap-1.5">✓ {isBn ? "কোনো অ্যাপ ডাউনলোড নেই" : "Zero app downloads"}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5">✓ {isBn ? "বিকাশে ইনস্ট্যান্ট পেমেন্ট" : "Instant bKash activation"}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5">✓ {isBn ? "রিয়েল-টাইম ক্লাউড সিঙ্ক" : "Real-time sync"}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 10 Minute School Style Clean Minimalist Footer */}
      <footer className="w-full bg-white dark:bg-[#071D13] border-t border-slate-200 dark:border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-white/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F172A] dark:text-white">Sealsela</span>
            <span>•</span>
            <span>Turn your visitors into loyal customer!</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => goToAuth("merchant")} className="hover:text-[#059669] dark:hover:text-white transition-colors cursor-pointer font-bold">
              Merchant Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
