import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { animate, stagger } from "animejs"
import confetti from "canvas-confetti"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"
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
} from "../../components/Icons"

export default function MarketingLanding() {
  const navigate = useNavigate()
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()

  // Interactive 1-tap live demo state
  const [demoStamps, setDemoStamps] = useState(3)
  const [isStamping, setIsStamping] = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)

  // Animation refs
  const demoCardRef = useRef<HTMLDivElement>(null)
  const stampSlotRefs = useRef<(HTMLDivElement | null)[]>([])
  const orb1Ref = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  // Initialize Anime.js on Mount
  useEffect(() => {
    // 1. Hero Left Elements Stagger
    animate(".anime-hero-item", {
      translateY: [24, 0],
      opacity: [0, 1],
      delay: stagger(80, { start: 100 }),
      duration: 800,
      ease: "outCubic",
    })

    // 2. Demo Card Entrance
    if (demoCardRef.current) {
      animate(demoCardRef.current, {
        translateY: [35, 0],
        scale: [0.92, 1],
        opacity: [0, 1],
        duration: 900,
        delay: 250,
        ease: "outElastic(1, .8)",
      })
    }

    // 3. Feature Pillars Stagger
    animate(".anime-pillar-card", {
      translateY: [25, 0],
      opacity: [0, 1],
      delay: stagger(100, { start: 400 }),
      duration: 750,
      ease: "outQuad",
    })

    // 4. Video & Steps Stagger
    animate(".anime-walkthrough-video", {
      scale: [0.95, 1],
      opacity: [0, 1],
      duration: 850,
      delay: 500,
      ease: "outCubic",
    })

    animate(".anime-step-item", {
      translateX: [30, 0],
      opacity: [0, 1],
      delay: stagger(90, { start: 550 }),
      duration: 700,
      ease: "outCubic",
    })

    // 5. Pricing Cards
    animate(".anime-pricing-card", {
      translateY: [30, 0],
      opacity: [0, 1],
      delay: stagger(120, { start: 600 }),
      duration: 800,
      ease: "outCubic",
    })

    // 6. Ambient CTA Orbs Floating Loop
    if (orb1Ref.current) {
      animate(orb1Ref.current, {
        translateX: [-25, 25],
        translateY: [-15, 20],
        scale: [1, 1.2],
        direction: "alternate",
        loop: true,
        duration: 4800,
        ease: "inOutSine",
      })
    }

    if (orb2Ref.current) {
      animate(orb2Ref.current, {
        translateX: [20, -20],
        translateY: [15, -15],
        scale: [1.15, 0.9],
        direction: "alternate",
        loop: true,
        duration: 5600,
        ease: "inOutSine",
      })
    }
  }, [])

  const handleStamp = () => {
    if (isStamping) return
    setIsStamping(true)

    // Trigger elastic stamp bounce with anime.js
    if (demoCardRef.current) {
      animate(demoCardRef.current, {
        scale: [1, 1.025, 1],
        duration: 350,
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
          // Fire celebration confetti!
          try {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.65 },
              colors: ["#10B981", "#34D399", "#F59E0B", "#FCD34D", "#FFFFFF"],
            })
          } catch (e) {
            // ignore if confetti blocked
          }
        }

        // Animate the newly active slot
        const targetSlot = stampSlotRefs.current[next - 1]
        if (targetSlot) {
          animate(targetSlot, {
            scale: [0.6, 1.2, 1],
            rotate: [-15, 10, 0],
            duration: 500,
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
    <div className="min-h-screen bg-transparent text-[#0F172A] dark:text-white font-sans antialiased selection:bg-[#10B981] selection:text-[#071D13] flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-white/10 p-1.5 flex items-center justify-center border border-emerald-200/60 dark:border-white/20 shadow-md">
            <img src="/sealsela-logo-light.svg" alt="Sealsela Logo" className="w-full h-full object-contain block dark:hidden" />
            <img src="/sealsela-logo-dark.svg" alt="Sealsela Logo" className="w-full h-full object-contain hidden dark:block" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl text-[#0F172A] dark:text-white tracking-tight leading-none">
              Sealsela
            </span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#059669] dark:text-[#34D399] font-bold mt-0.5">
              Digital Loyalty Card
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-[#0F172A] dark:text-[#34D399] border border-slate-200 dark:border-white/15 cursor-pointer shadow-sm transition-all active:scale-95"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {isDark ? <SunIcon size={14} className="text-[#F59E0B]" /> : <MoonIcon size={14} className="text-[#064E3B]" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1 border border-slate-200 dark:border-white/15 cursor-pointer shadow-sm transition-all active:scale-95"
            title="Toggle Language"
          >
            <GlobeIcon size={13} />
            <span>{isBn ? "EN" : "বাংলা"}</span>
          </button>

          <button
            onClick={() => goToAuth()}
            className="px-3 sm:px-4 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white border border-slate-200 dark:border-white/15 cursor-pointer shadow-sm transition-all"
          >
            {isBn ? "লগইন" : "Sign In"}
          </button>

          <button
            onClick={() => goToAuth()}
            className="hidden sm:flex px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-110 text-white font-display font-bold text-xs sm:text-sm shadow-lg glow-emerald cursor-pointer active:scale-95 transition-all items-center gap-1"
          >
            <span>{isBn ? "শুরু করুন" : "Get Started"}</span>
            <ChevronRightIcon size={15} />
          </button>
        </div>
      </header>

      {/* Main 10-Second High Impact Body */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: 5-Second Punchy Pitch */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-5">
            {/* Pill */}
            <div className="anime-hero-item inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#10B981]/15 border border-emerald-500/20 dark:border-[#10B981]/30 text-[#059669] dark:text-[#34D399] text-xs font-mono font-bold tracking-wide">
              <SparklesIcon size={13} className="text-[#F59E0B]" />
              <span>{isBn ? "নো-অ্যাপ ডিজিটাল লয়্যালটি কার্ড" : "No-App QR Loyalty Cards"}</span>
            </div>

            {/* Main H1 */}
            <h1 className="anime-hero-item text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.08] text-[#0F172A] dark:text-white">
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

            {/* Value Statement */}
            <p className="anime-hero-item text-base sm:text-lg text-slate-600 dark:text-white/75 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {isBn
                ? "কাউন্টার QR স্ক্যান করে সরাসরি মোবাইলের ব্রাউজারেই সিল সংগ্রহ ও রিওয়ার্ড রিডিম। কোনো অ্যাপ ডাউনলোড করার ঝামেলা নেই।"
                : "QR-powered digital stamp cards for repeat-visit businesses. No app download required — customers scan, collect stamps, and unlock rewards directly in their mobile browser."}
            </p>

            {/* CTAs */}
            <div className="anime-hero-item pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => goToAuth()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-110 text-white font-display font-black text-sm sm:text-base shadow-xl glow-emerald flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <span>{isBn ? "মার্চেন্ট কার্ড শুরু করুন" : "Start with Sealsela"}</span>
                <ChevronRightIcon size={18} />
              </button>

              <button
                onClick={() => goToAuth("customer")}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-[#0F172A] dark:text-white font-bold text-sm border border-slate-200 dark:border-white/15 shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <span>{isBn ? "কাস্টমার ওয়ালেট" : "Customer Wallet"}</span>
              </button>
            </div>

            {/* Supported Categories Bar */}
            <div className="anime-hero-item pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-slate-600 dark:text-white/55 font-medium">
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">☕ {isBn ? "ক্যাফে" : "Cafés"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🍽️ {isBn ? "রেস্টুরেন্ট" : "Restaurants"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🥐 {isBn ? "বেকারি" : "Bakeries"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">💇 {isBn ? "স্যালুন" : "Salons"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🛍️ {isBn ? "রিটেইল" : "Retail"}</span>
            </div>
          </div>

          {/* Right Column: Live Interactive 1-Tap Card Demo */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              ref={demoCardRef}
              className="w-full max-w-xs sm:max-w-sm bg-gradient-to-br from-[#064E3B] to-[#0D3824] dark:bg-none dark:bg-[#0E281C] border-2 border-emerald-500/35 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#071D13] flex items-center justify-center text-xl font-bold shadow-md">
                    ☕
                  </div>
                  <div>
                    <h3 className="font-display font-black text-white text-sm sm:text-base">North End Coffee</h3>
                    <p className="text-[11px] text-[#34D399] font-medium">Sealsela Digital Card</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#F59E0B] bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                  {demoStamps} / 5
                </span>
              </div>

              {/* 5 Stamp Slots */}
              <div className="bg-[#071D13]/70 dark:bg-[#071D13] border border-white/10 rounded-2xl p-4 text-center mb-4">
                <p className="text-[11px] text-white/60 mb-2.5 font-mono">
                  {demoStamps >= 5
                    ? "🎉 REWARD UNLOCKED: FREE COFFEE!"
                    : isBn
                    ? `আর মাত্র ${5 - demoStamps}টি সিল বাকি`
                    : `${5 - demoStamps} visit${5 - demoStamps === 1 ? "" : "s"} away from reward`}
                </p>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const isFilled = i < demoStamps
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          stampSlotRefs.current[i] = el
                        }}
                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-base transition-all duration-300 ${
                          isFilled
                            ? "bg-gradient-to-br from-[#10B981] to-[#047857] border-[#34D399] text-white shadow-md glow-emerald scale-105"
                            : "bg-white/5 border-white/15 text-white/20"
                        }`}
                      >
                        {isFilled ? "☕" : "○"}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Reward Description */}
              <div className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 mb-4">
                <GiftIcon size={16} className="text-[#F59E0B]" />
                <span className="text-xs font-bold text-white">
                  {isBn ? "৫টি সিলের পর ১টি স্পেশাল কফি ফ্রি" : "Buy 5 coffees, get 1 free"}
                </span>
              </div>

              {/* Interactive Stamp Button */}
              <button
                onClick={handleStamp}
                disabled={isStamping}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:brightness-110 text-[#071D13] font-display font-black text-xs sm:text-sm shadow-lg glow-amber cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ScanIcon size={16} />
                <span>{isStamping ? "Stamping..." : demoStamps >= 5 ? "Reset Demo Card" : "Tap to Stamp (+1)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Core Pillars - Readable in 3 seconds */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 pt-6 border-t border-slate-200 dark:border-white/10">
          <div className="anime-pillar-card bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
              <ZapIcon size={18} />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#0F172A] dark:text-white text-sm">
                {isBn ? "১. কোনো অ্যাপ লাগবে না" : "1. Zero App Download"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5 leading-relaxed">
                {isBn
                  ? "কাস্টমার সাধারণ ক্যামেরা দিয়ে QR স্ক্যান করলেই কার্ড ওপেন।"
                  : "Customers scan your counter QR code directly from their mobile camera."}
              </p>
            </div>
          </div>

          <div className="anime-pillar-card bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
              <ShieldCheckIcon size={18} />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#0F172A] dark:text-white text-sm">
                {isBn ? "২. দ্রুত কাউন্টার অনুমোদন" : "2. 1-Tap Counter Staff Mode"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5 leading-relaxed">
                {isBn
                  ? "কর্মীরা পিন দিয়ে সুরক্ষিত স্টাফ মোডে ১-ট্যাপে সিল অনুমোদন করেন।"
                  : "Staff confirm visits with 1 tap in a secure, PIN-protected interface."}
              </p>
            </div>
          </div>

          <div className="anime-pillar-card bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:-translate-y-1 transition-transform duration-300">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
              <UserCheckIcon size={18} />
            </div>
            <div>
              <h4 className="font-display font-bold text-[#0F172A] dark:text-white text-sm">
                {isBn ? "৩. কাস্টমার CRM ও রিটেনশন" : "3. Customer CRM & History"}
              </h4>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-0.5 leading-relaxed">
                {isBn
                  ? "নিয়মিত কাস্টমারদের চেনা এবং ট্র্যাক করার সহজ ড্যাশবোর্ড।"
                  : "Track returning customers, visit frequencies, and loyalty retention easily."}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: WALKTHROUGH VIDEO: HOW TO USE SEALSELA */}
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

            {/* Right Column: Walkthrough Video & How to use Sealsela */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-5 text-center lg:text-left">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#10B981]/15 border border-emerald-500/20 dark:border-[#10B981]/30 text-[#059669] dark:text-[#34D399] text-xs font-mono font-bold tracking-wide mb-2.5">
                  <SparklesIcon size={13} className="text-[#F59E0B]" />
                  <span>{isBn ? "ভিডিও ওয়াকথ্রু" : "Walkthrough Video"}</span>
                </div>
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
              <div className="space-y-2.5 text-left">
                <div className="anime-step-item flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs text-[#0F172A] dark:text-white">
                      {isBn ? "কাউন্টার QR স্ক্যান" : "Scan Counter QR"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-white/60">
                      {isBn ? "কাস্টমার ফোনের ক্যামেরা দিয়ে স্ক্যান করেন।" : "Customer scans with their mobile camera."}
                    </p>
                  </div>
                </div>

                <div className="anime-step-item flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs text-[#0F172A] dark:text-white">
                      {isBn ? "১-ট্যাপ স্টাফ অনুমোদন" : "1-Tap Staff Approval"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-white/60">
                      {isBn ? "কর্মীরা পিন সুরক্ষিত স্টাফ মোডে সিল নিশ্চিত করেন।" : "Staff verify visit in secure counter mode."}
                    </p>
                  </div>
                </div>

                <div className="anime-step-item flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-[#0E281C]/80 border border-slate-200 dark:border-white/10 shadow-xs hover:border-emerald-500/40 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xs text-[#0F172A] dark:text-white">
                      {isBn ? "স্বয়ংক্রিয় রিওয়ার্ড আনলক" : "Instant Reward Unlock"}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-white/60">
                      {isBn ? "টার্গেট পূর্ণ হলে ডিজিটাল ভাউচার কোড তৈরি হয়।" : "Digital voucher generated upon target completion."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => goToAuth("merchant")}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-110 text-white font-display font-bold text-xs sm:text-sm shadow-md glow-emerald flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "মার্চেন্ট কার্ড শুরু করুন" : "Start with Sealsela"}</span>
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: PRICING PLANS */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 pt-8 border-t border-slate-200 dark:border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-[#F59E0B]/15 border border-amber-500/20 dark:border-[#F59E0B]/30 text-amber-700 dark:text-[#F59E0B] text-xs font-mono font-bold tracking-wide">
              <span>{isBn ? "স্বচ্ছ ও সাশ্রয়ী মূল্য" : "Simple, Transparent Pricing"}</span>
            </div>
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
            <div className="anime-pricing-card rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#0E281C]/90 border border-slate-200 dark:border-white/15 shadow-xl flex flex-col justify-between relative backdrop-blur-xl hover:shadow-2xl transition-all duration-300">
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
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                    {isBn ? "৬ মাসের পূর্ণ সেবা (মাত্র ~৮৩৩ টাকা/মাস)" : "Full access for 6 months (~833 BDT/mo)"}
                  </p>
                </div>

                {/* Feature List */}
                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-slate-600 dark:text-white/80">
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
                className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#0F172A] dark:text-white font-display font-bold text-sm transition-all cursor-pointer active:scale-95 shadow-sm border border-slate-200 dark:border-white/15"
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
                  <p className="text-xs text-[#34D399] mt-1 font-medium">
                    {isBn ? "১২ মাসের পূর্ণ সেবা (মাত্র ~৬৬৬ টাকা/মাস)" : "Full access for 12 months (~666 BDT/mo)"}
                  </p>
                </div>

                {/* Feature List */}
                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-white/90">
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
        {/* SECTION 3: FINAL CALL TO ACTION (ASK THEM TO JOIN SEALSELA) */}
        {/* ========================================================================= */}
        <section className="mt-16 sm:mt-24 mb-6">
          <div className="relative rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-[#064E3B] via-[#0E3824] to-[#042416] border-2 border-emerald-500/40 shadow-2xl text-center overflow-hidden glow-emerald">
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[#34D399] text-xs font-mono font-bold tracking-wide">
                <SparklesIcon size={13} className="text-[#F59E0B]" />
                <span>{isBn ? "আজই যুক্ত হোন" : "Join Sealsela Today"}</span>
              </div>

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
                  ? "শীর্ষস্থানীয় ক্যাফে, রেস্টুরেন্ট, বেকারি ও রিটেইল ব্র্যান্ডগুলোর সাথে যুক্ত হয়ে কাস্টমারদের রিটেনশন বাড়িয়ে নিন।"
                  : "Join top cafes, restaurants, bakeries, and customer-facing brands growing their repeat sales with Sealsela."}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  onClick={() => goToAuth("merchant")}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-white font-display font-black text-sm sm:text-base shadow-2xl glow-emerald flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "মার্চেন্ট হিসেবে যুক্ত হোন" : "Join Sealsela as Merchant"}</span>
                  <ChevronRightIcon size={18} />
                </button>

                <button
                  onClick={() => goToAuth("customer")}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>{isBn ? "কাস্টমার ওয়ালেট দেখুন" : "Explore Customer Wallet"}</span>
                </button>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60 font-medium">
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

      {/* Clean Minimalist Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-white/40">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0F172A] dark:text-white/70">Sealsela</span>
          <span>•</span>
          <span>Turn your visitors into loyal customer!</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => goToAuth("merchant")} className="hover:text-[#059669] dark:hover:text-white transition-colors cursor-pointer">
            Merchant Sign In
          </button>
          <span>•</span>
          <button onClick={() => goToAuth("customer")} className="hover:text-[#059669] dark:hover:text-white transition-colors cursor-pointer">
            Customer Wallet
          </button>
        </div>
      </footer>
    </div>
  )
}
