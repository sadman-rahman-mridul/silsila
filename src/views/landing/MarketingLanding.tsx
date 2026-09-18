import React from "react"
import { useNavigate } from "react-router-dom"
import {
  SparklesIcon,
  CheckIcon,
  ChevronRightIcon,
  ScanIcon,
  ShieldCheckIcon,
  GiftIcon,
  GlobeIcon,
  PhoneIcon,
  UsersIcon,
  BarChartIcon,
  DownloadIcon,
  TrendingDownIcon,
  ClockIcon,
  ArrowRightIcon,
  SearchIcon,
  StoreIcon,
} from "../../components/Icons"

export default function MarketingLanding() {
  const navigate = useNavigate()

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
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
    <div className="min-h-screen bg-[#FDFEFC] text-[#0F172A] font-sans antialiased selection:bg-[#1B4332] selection:text-white">
      
      {/* ==================================================
          3. STICKY HEADER
          ================================================== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* LEFT: Official Sealsela Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 p-1.5 flex items-center justify-center border border-emerald-200/60 shadow-xs">
              <img src="/sealsela-logo-light.svg" alt="Sealsela" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-black text-xl sm:text-2xl text-[#1B4332] tracking-tight">
              Sealsela
            </span>
          </div>

          {/* RIGHT: Navigation Links & CTA */}
          <div className="flex items-center gap-4 sm:gap-8">
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
              <button
                onClick={() => scrollTo("how-it-works")}
                className="hover:text-[#1B4332] transition-colors cursor-pointer"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollTo("features")}
                className="hover:text-[#1B4332] transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="hover:text-[#1B4332] transition-colors cursor-pointer"
              >
                Pricing
              </button>
            </nav>

            <button
              onClick={() => goToAuth("merchant")}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-display font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Sealsela</span>
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================
          4. HERO SECTION
          ================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COPY */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-700 leading-tight">
                Getting customers is hard.
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-700 leading-tight">
                But turning them into regular visitors is
              </p>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black text-[#1B4332] tracking-tight leading-none pt-1">
                HARDER!
              </h1>
            </div>

            {/* Small industry line */}
            <div className="pt-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Built for:
              </p>
              <p className="text-sm sm:text-base font-bold text-[#1B4332] mt-1">
                Restaurants • Cafes • Salons • Spas • And More
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                onClick={() => goToAuth("merchant")}
                className="px-7 py-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-display font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <span>Get Sealsela for Your Brand</span>
                <ChevronRightIcon size={18} />
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all cursor-pointer"
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* RIGHT VISUAL: Modern Urban Cafe / Restaurant Setting */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
              <div className="relative h-72 sm:h-96 w-full">
                <img
                  src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80"
                  alt="Modern Customer-facing Cafe Setting"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Floating Stamp Interaction Card Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-xl border border-white/50 text-[#0F172A]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1B4332] text-white flex items-center justify-center font-black text-sm shadow-md">
                      ☕
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-black text-sm text-[#0F172A] truncate">
                        Cafe & Lifestyle Brand
                      </p>
                      <p className="text-[11px] text-[#059669] font-bold">
                        4 / 5 Stamps Collected · 1 Stamp Left!
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center text-sm font-bold">
                      🎁
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          5. THE PROBLEM SECTION
          ================================================== */}
      <section className="w-full bg-[#F4F9F6] py-16 sm:py-24 border-y border-emerald-900/5">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[#1B4332] max-w-2xl mx-auto">
            What happens when a customer doesn’t come back?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
            
            {/* CARD 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md border border-slate-200/80 transition-all flex flex-col justify-between">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#1B4332] flex items-center justify-center text-2xl font-black mb-6">
                <span className="text-[#059669]">৳</span>
                <TrendingDownIcon size={18} className="text-red-500 -ml-1 -mb-1" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">You make</p>
                <p className="text-xl sm:text-2xl font-display font-black text-[#0F172A]">
                  LESS REVENUE
                </p>
              </div>
            </div>

            {/* CARD 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md border border-slate-200/80 transition-all flex flex-col justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center text-2xl mb-6">
                <UsersIcon size={26} className="text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">You lose</p>
                <p className="text-xl sm:text-2xl font-display font-black text-[#0F172A]">
                  FUTURE SALES
                </p>
                <p className="text-xs text-slate-500 font-medium">from repeat visits</p>
              </div>
            </div>

            {/* CARD 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md border border-slate-200/80 transition-all flex flex-col justify-between">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200/60 text-red-600 flex items-center justify-center text-2xl mb-6">
                <StoreIcon size={26} className="text-red-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your competitor</p>
                <p className="text-xl sm:text-2xl font-display font-black text-[#0F172A]">
                  GAINS THAT CUSTOMER
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================
          6. INTRODUCING SEALSELA
          ================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COPY */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold text-[#059669] uppercase tracking-widest font-mono">
                Introducing Sealsela
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-[#1B4332] leading-tight">
                Give your customer <br />
                a reason to return!
              </h2>
            </div>

            <p className="text-lg font-bold text-slate-800">
              A digital loyalty card platform.
            </p>

            <p className="text-base text-slate-600 leading-relaxed max-w-xl">
              Sealsela turns every purchase into an opportunity for the next visit.
            </p>

            {/* Horizontal Journey Pill */}
            <div className="inline-flex flex-wrap items-center gap-2 p-3 sm:p-4 rounded-2xl bg-[#E8F5EE] border border-emerald-200 text-xs sm:text-sm font-black text-[#1B4332]">
              <span>SCAN</span>
              <span className="text-[#059669]">→</span>
              <span>EARN</span>
              <span className="text-[#059669]">→</span>
              <span>RETURN</span>
              <span className="text-[#059669]">→</span>
              <span className="text-[#059669]">REWARD</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              One loyalty system for Restaurants, Cafes, Salons, Spas and more.
            </p>
          </div>

          {/* RIGHT VISUAL: Customer Scanning Sealsela QR */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 text-center space-y-5">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#1B4332] flex items-center justify-center mx-auto shadow-sm">
                <ScanIcon size={38} className="text-[#1B4332]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-black text-lg text-[#0F172A]">
                  Counter QR Code
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Customers scan with their standard phone camera. No mobile app download required.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-inner border border-slate-200 flex items-center justify-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://sealsela.com"
                    alt="Sealsela Counter QR"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          7. CUSTOMER JOURNEY
          ================================================== */}
      <section id="how-it-works" className="w-full bg-[#F4F9F6] py-16 sm:py-24 border-y border-emerald-900/5">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-black text-[#1B4332]">
              The Customer Journey:
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              A frictionless 5-step loop that turns first-time visitors into repeat regulars.
            </p>
          </div>

          {/* 5-Step Storyboard (Horizontal on Desktop, Stacked on Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-5">
            
            {/* STEP 1 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h3 className="font-display font-black text-base text-[#1B4332]">
                  SCAN
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scan the brand QR
                </p>
              </div>
              <div className="h-28 bg-[#E8F5EE] rounded-2xl flex items-center justify-center border border-emerald-100 p-2">
                <div className="text-center">
                  <ScanIcon size={28} className="text-[#1B4332] mx-auto mb-1" />
                  <span className="text-[10px] font-bold text-[#1B4332]">Counter QR</span>
                </div>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="font-display font-black text-base text-[#1B4332]">
                  SEAL VISIT
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tap “I’m here! Seal My Card”
                </p>
              </div>
              <div className="h-28 bg-[#E8F5EE] rounded-2xl flex items-center justify-center border border-emerald-100 p-2">
                <div className="px-3 py-1.5 rounded-xl bg-[#059669] text-white text-[10px] font-black shadow-xs">
                  Seal My Card
                </div>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="font-display font-black text-base text-[#1B4332]">
                  COLLECT STAMPS
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  For each visit, customer adds a stamp
                </p>
              </div>
              <div className="h-28 bg-[#E8F5EE] rounded-2xl flex items-center justify-center border border-emerald-100 p-2">
                <div className="flex gap-1">
                  <span className="text-sm">☕</span>
                  <span className="text-sm">☕</span>
                  <span className="text-sm">☕</span>
                  <span className="text-sm opacity-40">☕</span>
                  <span className="text-sm opacity-40">🎁</span>
                </div>
              </div>
            </div>

            {/* STEP 4 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">
                  4
                </span>
                <h3 className="font-display font-black text-base text-[#1B4332]">
                  UNLOCK REWARD
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The first visitor becomes a loyal customer
                </p>
              </div>
              <div className="h-28 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200 p-2">
                <div className="text-center">
                  <GiftIcon size={24} className="text-amber-600 mx-auto mb-1" />
                  <span className="text-[10px] font-black text-amber-800">Reward Ready!</span>
                </div>
              </div>
            </div>

            {/* STEP 5 */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="w-7 h-7 rounded-full bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">
                  5
                </span>
                <h3 className="font-display font-black text-base text-[#1B4332]">
                  KEEP COMING BACK
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rewards keep them coming back
                </p>
              </div>
              <div className="h-28 bg-[#E8F5EE] rounded-2xl flex items-center justify-center border border-emerald-100 p-2">
                <div className="text-center text-[#1B4332]">
                  <span className="text-xs font-black">🔥 7 Week Streak</span>
                  <p className="text-[10px] text-[#059669] font-bold mt-0.5">Cycle #2</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================
          8. BUSINESS DASHBOARD
          ================================================== */}
      <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332]">
            Your Dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Everything your staff and management need to run customer loyalty seamlessly.
          </p>
        </div>

        {/* Prominent Dashboard Interface Box */}
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
          
          {/* Dashboard Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B4332] text-white flex items-center justify-center font-black">
                S
              </div>
              <div>
                <p className="font-display font-black text-base text-[#0F172A]">Store Manager Dashboard</p>
                <p className="text-xs text-slate-500">Live Merchant Mode</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-[#059669] text-xs font-bold border border-emerald-200">
                Staff Mode Active
              </span>
            </div>
          </div>

          {/* 7 Clean Callout Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
            
            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">1. Search Customer</span>
              <p className="text-sm font-bold text-[#0F172A]">Search Customer</p>
              <p className="text-xs text-slate-500">Find customers by name or phone number.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">2. Approvals Needed</span>
              <p className="text-sm font-bold text-[#0F172A]">Approvals Needed</p>
              <p className="text-xs text-slate-500">See pending stamp requests.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">3. Customer Info</span>
              <p className="text-sm font-bold text-[#0F172A]">Customer Info</p>
              <p className="text-xs text-slate-500">See customer details and visit status.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">4. Approve Stamp</span>
              <p className="text-sm font-bold text-[#0F172A]">Approve Stamp</p>
              <p className="text-xs text-slate-500">Approve a customer visit instantly.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">5. Redeem Voucher</span>
              <p className="text-sm font-bold text-[#0F172A]">Redeem Voucher</p>
              <p className="text-xs text-slate-500">Redeem customer rewards.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">6. Your Brand QR</span>
              <p className="text-sm font-bold text-[#0F172A]">Your Brand QR</p>
              <p className="text-xs text-slate-500">Show your QR for customers to scan.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-slate-200/70 space-y-1.5">
              <span className="text-xs font-black text-[#059669] uppercase tracking-wider">7. Staff Access</span>
              <p className="text-sm font-bold text-[#0F172A]">Staff Access</p>
              <p className="text-xs text-slate-500">Give staff simple operational access.</p>
            </div>

          </div>

          {/* Bottom Navigation Indicators */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-bold text-slate-600">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-[#1B4332]">Home</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Customers</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Rewards</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Marketing</span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600">Settings</span>
          </div>

        </div>

      </section>

      {/* ==================================================
          9. TEXT TRANSITION 1
          ================================================== */}
      <section className="w-full bg-[#F4F9F6] py-20 sm:py-28 text-center border-y border-emerald-900/5">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <p className="text-base sm:text-lg font-bold text-slate-500">
            Just digital stamp?
          </p>
          <p className="text-3xl sm:text-4xl font-display font-black text-slate-700">
            No...
          </p>
          <p className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-[#1B4332] pt-2">
            Here’s more
          </p>
        </div>
      </section>

      {/* ==================================================
          10. ANALYTICS SECTION
          ================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT: Analytics & Reports Interface Mockup */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <p className="font-display font-black text-sm text-[#0F172A]">Reports & Analytics</p>
              <span className="text-xs text-slate-400 font-mono">Real-time Data</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F7FAF8] rounded-2xl border border-slate-200/60 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Active Days</p>
                <p className="text-lg font-display font-black text-[#1B4332] mt-1">7 Days/Wk</p>
              </div>
              <div className="p-3 bg-[#F7FAF8] rounded-2xl border border-slate-200/60 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Repeat Rate</p>
                <p className="text-lg font-display font-black text-[#059669] mt-1">74%</p>
              </div>
              <div className="p-3 bg-[#F7FAF8] rounded-2xl border border-slate-200/60 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Top Loyalty</p>
                <p className="text-lg font-display font-black text-amber-600 mt-1">Cycle #4</p>
              </div>
            </div>

            <div className="h-32 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-end justify-between p-4 gap-2">
              <div className="w-full bg-[#1B4332]/20 h-12 rounded-lg" />
              <div className="w-full bg-[#1B4332]/40 h-18 rounded-lg" />
              <div className="w-full bg-[#1B4332]/60 h-24 rounded-lg" />
              <div className="w-full bg-[#1B4332] h-28 rounded-lg" />
              <div className="w-full bg-[#059669] h-22 rounded-lg" />
            </div>
          </div>

          {/* RIGHT: Copy & 3 Points */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332] leading-tight">
              Get in detailed <br />
              Analytics to understand
            </h2>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1B4332] flex items-center justify-center">
                  <ClockIcon size={20} />
                </div>
                <span className="font-display font-black text-base text-[#0F172A]">
                  Active Days
                </span>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1B4332] flex items-center justify-center">
                  <UsersIcon size={20} />
                </div>
                <span className="font-display font-black text-base text-[#0F172A]">
                  Repeat Customers
                </span>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1B4332] flex items-center justify-center">
                  <SparklesIcon size={20} />
                </div>
                <span className="font-display font-black text-base text-[#0F172A]">
                  Most Loyal Customer
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          11. CUSTOMER CRM + EXPORT
          ================================================== */}
      <section className="w-full bg-[#F4F9F6] py-16 sm:py-24 border-y border-emerald-900/5">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* TOP AREA: Customer CRM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332]">
                Get your <br />
                Customer CRM
              </h2>
              <p className="text-base text-slate-600 font-medium">
                Track your customers in one place.
              </p>
            </div>

            <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-500">Customer Directory (Live)</span>
                <span className="text-xs text-[#059669] font-bold">100% Verified Phone Numbers</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                  <span className="font-bold text-slate-800">Sadman Rahman</span>
                  <span className="text-slate-500 font-mono">017•••••89</span>
                  <span className="font-bold text-[#1B4332]">4 Stamps</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                  <span className="font-bold text-slate-800">Tariq Ahmed</span>
                  <span className="text-slate-500 font-mono">018•••••42</span>
                  <span className="font-bold text-[#1B4332]">5 Stamps (Reward Ready)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECOND AREA: Export Customer List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8 border-t border-slate-200">
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-display font-black text-base text-[#0F172A]">Customer Database (.CSV)</p>
                <p className="text-xs text-slate-500">Ready for Facebook Ads & SMS Marketing</p>
              </div>
              <button
                onClick={() => goToAuth("merchant")}
                className="px-4 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <DownloadIcon size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-display font-black text-[#1B4332]">
                Export your <br />
                Customer List
              </h2>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                  <span>Use it for better Ad Retargeting</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                  <span>Send them SMS alerts during offers</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          12. SMS REMINDERS
          ================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT: Interface with Coming Soon */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <p className="font-display font-black text-sm text-[#0F172A]">Automated SMS Marketing</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-300">
                Coming Soon
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                <span className="font-bold text-slate-700">1. Inactive for last 30 days</span>
                <span className="text-[#059669] font-bold">Auto Trigger</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                <span className="font-bold text-slate-700">2. 1 Stamp Left to get the reward</span>
                <span className="text-[#059669] font-bold">High Intent</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between">
                <span className="font-bold text-slate-700">3. All Customers</span>
                <span className="text-[#059669] font-bold">Broadcast</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Copy */}
          <div className="lg:col-span-6 space-y-5">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332] leading-tight">
              Send Instant SMS <br />
              to 3 types of users
            </h2>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7FAF8] border border-slate-200/70">
                <span className="w-7 h-7 rounded-xl bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">1</span>
                <span className="text-sm font-bold text-[#0F172A]">Inactive for last 30 days</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7FAF8] border border-slate-200/70">
                <span className="w-7 h-7 rounded-xl bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">2</span>
                <span className="text-sm font-bold text-[#0F172A]">1 Stamp Left to get the reward</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7FAF8] border border-slate-200/70">
                <span className="w-7 h-7 rounded-xl bg-[#1B4332] text-white text-xs font-black flex items-center justify-center">3</span>
                <span className="text-sm font-bold text-[#0F172A]">All Customers</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          13. RETENTION STATEMENT
          ================================================== */}
      <section className="w-full bg-[#F4F9F6] py-20 sm:py-28 text-center border-y border-emerald-900/5">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <p className="text-base sm:text-lg font-bold text-slate-500">
            Yes!
          </p>
          <p className="text-3xl sm:text-4xl font-display font-black text-slate-700">
            Sealsela makes
          </p>
          <p className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-[#1B4332]">
            Customer Retention
          </p>
          <p className="text-3xl sm:text-4xl font-display font-black text-slate-700">
            this easy
          </p>
        </div>
      </section>

      {/* ==================================================
          14. BUSINESS OUTCOME SECTION
          ================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332]">
            What happens after Sealsela?
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Predictable repeat visits and sustainable growth for your brand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* CARD 1 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1B4332] text-sm font-black flex items-center justify-center">
              1
            </span>
            <h3 className="font-display font-black text-base text-[#0F172A]">
              Customers start coming back
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Repeat visits become a habit.
            </p>
          </div>

          {/* CARD 2 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1B4332] text-sm font-black flex items-center justify-center">
              2
            </span>
            <h3 className="font-display font-black text-base text-[#0F172A]">
              You build a customer list
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Know who visits and who returns.
            </p>
          </div>

          {/* CARD 3 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1B4332] text-sm font-black flex items-center justify-center">
              3
            </span>
            <h3 className="font-display font-black text-base text-[#0F172A]">
              Send offers by SMS
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Reach customers directly on their phones.
            </p>
          </div>

          {/* CARD 4 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-3">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1B4332] text-sm font-black flex items-center justify-center">
              4
            </span>
            <h3 className="font-display font-black text-base text-[#0F172A]">
              Revenue grows over time
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              More repeat visits lead to more sales.
            </p>
          </div>

        </div>
      </section>

      {/* ==================================================
          15. PRICING
          ================================================== */}
      <section id="pricing" className="w-full bg-[#F4F9F6] py-16 sm:py-24 border-y border-emerald-900/5">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 space-y-12 text-center">
          
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332]">
              Pricing
            </h2>
            <p className="text-base text-slate-600 font-medium">
              Simple plans for your brand
            </p>
          </div>

          {/* Two Pricing Cards Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            
            {/* PLAN 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-5 flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Plan</p>
                <h3 className="text-2xl font-display font-black text-[#0F172A]">
                  6 Months
                </h3>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-4xl font-display font-black text-[#1B4332]">
                  5000 BDT
                </p>
              </div>
              <button
                onClick={() => goToAuth("merchant")}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-sm transition-all cursor-pointer"
              >
                Choose 6 Months
              </button>
            </div>

            {/* PLAN 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-md border-2 border-[#1B4332] space-y-5 relative flex flex-col justify-between">
              <span className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-[#1B4332] text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                Best Value
              </span>
              <div className="space-y-2">
                <p className="text-sm font-bold text-[#059669] uppercase tracking-wider">Recommended</p>
                <h3 className="text-2xl font-display font-black text-[#0F172A]">
                  12 Months
                </h3>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-4xl font-display font-black text-[#1B4332]">
                  8000 BDT
                </p>
              </div>
              <button
                onClick={() => goToAuth("merchant")}
                className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143326] text-white font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Choose 12 Months
              </button>
            </div>

          </div>

          {/* Shared Feature Box */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-left space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black text-[#1B4332]">
                Full Access to the System
              </h3>
              <p className="text-xs text-slate-500">
                Both plans include the same features.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Digital Loyalty Card</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Counter QR Code</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Staff Mode</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Customer CRM</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Rewards & Voucher Redemption</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#059669] flex items-center justify-center text-xs">✓</span>
                <span>Repeat Visit Insights</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================
          16. FINAL CTA SECTION
          ================================================== */}
      <section id="contact" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="bg-[#E8F5EE] rounded-3xl p-8 sm:p-12 border border-emerald-200/80 shadow-sm relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* LEFT: Mobile Dashboard Preview Mockup */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-xs bg-white rounded-3xl p-4 shadow-xl border-4 border-white space-y-3 text-[#0F172A]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-display font-black text-xs text-[#1B4332]">Merchant Live Portal</span>
                  <span className="text-[10px] font-bold text-[#059669]">Active</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Today's Visits</p>
                  <p className="text-xl font-display font-black text-[#1B4332]">28 Seals Approved</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white text-center font-bold text-xs">
                  Instant Customer Retention
                </div>
              </div>
            </div>

            {/* RIGHT: Top-Right Logo & Contact Card */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Top-Right Small Official Sealsela Logo */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 p-1 flex items-center justify-center border border-emerald-300">
                  <img src="/sealsela-logo-light.svg" alt="Sealsela" className="w-full h-full object-contain" />
                </div>
                <span className="font-display font-black text-base text-[#1B4332]">Sealsela</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-display font-black text-[#1B4332] leading-tight">
                Get a digital <br />
                loyalty card system <br />
                for your brand today!
              </h2>

              {/* Clean Contact Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3 max-w-sm">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-800">
                  <GlobeIcon size={18} className="text-[#059669]" />
                  <span>Visit: sealsela.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-800">
                  <PhoneIcon size={18} className="text-[#059669]" />
                  <a href="tel:01681742043" className="hover:underline text-[#1B4332]">
                    Call: 01681742043
                  </a>
                </div>
              </div>

              <div>
                <button
                  onClick={() => goToAuth("merchant")}
                  className="px-8 py-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#143326] text-white font-display font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  Start Now
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ==================================================
          17. MINIMAL FOOTER
          ================================================== */}
      <footer className="w-full border-t border-slate-200 bg-white py-8">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 p-1 flex items-center justify-center border border-emerald-200">
              <img src="/sealsela-logo-light.svg" alt="Sealsela" className="w-full h-full object-contain" />
            </div>
            <span className="font-display font-black text-sm text-[#1B4332]">Sealsela</span>
          </div>

          <div className="flex items-center gap-6">
            <span>sealsela.com</span>
            <a href="tel:01681742043" className="hover:underline text-slate-700">
              01681742043
            </a>
          </div>

        </div>
      </footer>

    </div>
  )
}
