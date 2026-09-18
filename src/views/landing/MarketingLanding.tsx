import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
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

  const handleStamp = () => {
    if (isStamping) return
    setIsStamping(true)
    setTimeout(() => {
      setDemoStamps((prev) => {
        if (prev >= 5) {
          setJustRewarded(false)
          return 1
        }
        const next = prev + 1
        if (next === 5) {
          setJustRewarded(true)
        }
        return next
      })
      setIsStamping(false)
    }, 300)
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-[#10B981]/15 border border-emerald-500/20 dark:border-[#10B981]/30 text-[#059669] dark:text-[#34D399] text-xs font-mono font-bold tracking-wide">
              <SparklesIcon size={13} className="text-[#F59E0B]" />
              <span>{isBn ? "নো-অ্যাপ ডিজিটাল লয়্যালটি কার্ড" : "No-App QR Loyalty Cards"}</span>
            </div>

            {/* Main H1 */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight leading-[1.08] text-[#0F172A] dark:text-white">
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
            <p className="text-base sm:text-lg text-slate-600 dark:text-white/75 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {isBn
                ? "কাউন্টার QR স্ক্যান করে সরাসরি মোবাইলের ব্রাউজারেই সিল সংগ্রহ ও রিওয়ার্ড রিডিম। কোনো অ্যাপ ডাউনলোড করার ঝামেলা নেই।"
                : "QR-powered digital stamp cards for repeat-visit businesses. No app download required — customers scan, collect stamps, and unlock rewards directly in their mobile browser."}
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
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
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-slate-600 dark:text-white/55 font-medium">
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">☕ {isBn ? "ক্যাফে" : "Cafés"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🍽️ {isBn ? "রেস্টুরেন্ট" : "Restaurants"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🥐 {isBn ? "বেকারি" : "Bakeries"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">💇 {isBn ? "স্যালুন" : "Salons"}</span>
              <span className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg shadow-sm">🛍️ {isBn ? "রিটেইল" : "Retail"}</span>
            </div>
          </div>

          {/* Right Column: Live Interactive 1-Tap Card Demo */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-xs sm:max-w-sm bg-gradient-to-br from-[#064E3B] to-[#0D3824] dark:bg-none dark:bg-[#0E281C] border-2 border-emerald-500/35 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl text-white">
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
          <div className="bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
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

          <div className="bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
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

          <div className="bg-white dark:bg-[#0E281C]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
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
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-white/40">
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
