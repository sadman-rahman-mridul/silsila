import { useState } from "react"
import { api, ApiError } from "../services/api"
import { useAuth, type UserProfile } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { firebaseService } from "../services/firebaseService"
import { GlobeIcon } from "../components/Icons"

type LandingStep = "choose" | "phone" | "login_password" | "register_password" | "otp"
type Role = "customer" | "merchant"

interface LandingProps {
  onEnter: (role: "customer" | "merchant" | "ops", opts?: { needsOnboarding?: boolean }) => void
  initialMerchantSlug?: string | null
}

export default function Landing({ onEnter, initialMerchantSlug }: LandingProps) {
  const { setSessionProfile } = useAuth()
  const { isBn, toggleLanguage } = useLanguage()
  const [step, setStep] = useState<LandingStep>(() => (initialMerchantSlug ? "phone" : "choose"))
  const [role, setRole] = useState<Role>("customer")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [consentGiven, setConsentGiven] = useState(true)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  // Account lookup info
  const [isExistingAccount, setIsExistingAccount] = useState(false)
  const [existingUserName, setExistingUserName] = useState<string | null>(null)

  // Name prompt for new accounts with no name stored yet
  const [showNameModal, setShowNameModal] = useState(false)
  const [modalName, setModalName] = useState("")
  const [pendingAuthResult, setPendingAuthResult] = useState<any>(null)

  function handleRoleSelect(r: Role) {
    setRole(r)
    setError(null)
    setInfoMsg(null)
    setPhone("")
    setPassword("")
    setIsExistingAccount(false)
    setExistingUserName(null)
    setCachedAccount(null)
    setOtp(["", "", "", "", "", ""])
    setShowNameModal(false)
    setStep("phone")
  }

  const [cachedAccount, setCachedAccount] = useState<any>(null)

  // STEP 2 -> STEP 3: Verify if phone exists
  async function handlePhoneNext() {
    const clean = phone.replace(/\D/g, "")
    if (clean.length < 10) {
      setError(isBn ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন" : "Please provide a valid 11-digit mobile number")
      return
    }
    if (!consentGiven) {
      setError(isBn ? "এগিয়ে যেতে ডেটা সুরক্ষা সম্মতিতে টিক দিন" : "Please accept the data privacy policy to proceed")
      return
    }

    setLoading(true)
    setError(null)
    setInfoMsg(null)

    try {
      // Check Cloud Firestore directly (single source of truth)
      const fbAccount = await firebaseService.findAccountByPhone(clean, role).catch(() => null)
      setCachedAccount(fbAccount)

      const exists = !!fbAccount
      const name = (role === "merchant" ? fbAccount?.ownerName || fbAccount?.name : fbAccount?.name) || null

      setIsExistingAccount(exists)
      setExistingUserName(name)

      if (exists) {
        // Phone matches an existing user in Firestore -> ask for Password (with OTP option below)
        setStep("login_password")
        if (name) {
          setInfoMsg(
            isBn
              ? `স্বাগতম ${name}! আপনার অ্যাকাউন্টের পাসওয়ার্ড লিখুন।`
              : `Welcome back, ${name}! Please enter your password.`
          )
        }
      } else {
        // Phone doesn't match any Firestore account -> ask to start Registration by writing password
        setStep("register_password")
        setInfoMsg(
          isBn
            ? "এই নম্বরে কোনো অ্যাকাউন্ট নেই। অনুগ্রহ করে রেজিস্ট্রেশন করতে একটি পাসওয়ার্ড তৈরি করুন।"
            : "No account found for this number. Please set a password to register."
        )
      }
    } catch (err: any) {
      console.error("Lookup error:", err)
      setStep("register_password")
    } finally {
      setLoading(false)
    }
  }

  // STEP 3A: Existing User Login with Password
  async function handleExistingPasswordLogin() {
    if (!password.trim()) {
      setError(isBn ? "অনুগ্রহ করে আপনার পাসওয়ার্ড লিখুন" : "Please enter your password")
      return
    }

    setLoading(true)
    setError(null)
    setInfoMsg(null)

    try {
      // Firestore-only authentication (single source of truth, role-aware)
      if (cachedAccount) {
        if (cachedAccount.password && cachedAccount.password === password.trim()) {
          const storedName =
            role === "merchant" ? cachedAccount.ownerName || cachedAccount.name : cachedAccount.name
          const resObj = {
            success: true,
            role,
            token: `token_${role}_${cachedAccount.id}`,
            customer: role === "customer" ? cachedAccount : undefined,
            merchant: role === "merchant" ? cachedAccount : undefined,
            merchants: role === "merchant" ? [cachedAccount] : undefined,
          }
          await finalizeLogin(resObj, storedName || (isBn ? "ব্যবহারকারী" : "User"))
          return
        } else if (cachedAccount.password && cachedAccount.password !== password.trim()) {
          setError(
            isBn
              ? "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
              : "Incorrect password! Please try again or log in with OTP below."
          )
          return
        }
      }

      setError(
        isBn
          ? "পাসওয়ার্ড ভুল হয়েছে। সঠিক পাসওয়ার্ড লিখুন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
          : "Incorrect password. Please try again or log in with OTP below."
      )
    } catch (err: any) {
      console.error("Password login error:", err)
      setError(
        isBn
          ? "পাসওয়ার্ড ভুল হয়েছে। সঠিক পাসওয়ার্ড লিখুন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
          : "Incorrect password. Please try again or log in with OTP below."
      )
    } finally {
      setLoading(false)
    }
  }

  // STEP 3B: New User Registration -> Send OTP verification first
  async function handleNewUserRegisterSubmit() {
    if (password.trim().length < 4) {
      setError(isBn ? "পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে" : "Password must be at least 4 characters")
      return
    }

    setError(null)
    setInfoMsg(null)
    await handleSendOtp(
      isBn
        ? "নিবন্ধন যাচাই করতে আপনার ফোনে ৬-সংখ্যার OTP কোড পাঠানো হয়েছে।"
        : "A 6-digit OTP code has been sent to verify your registration."
    )
  }

  // Send OTP
  async function handleSendOtp(customSuccessMsg?: string) {
    const clean = phone.replace(/\D/g, "")
    if (clean.length < 10) {
      setError(isBn ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন" : "Please enter a valid 11-digit mobile number")
      return
    }
    setLoading(true)
    setError(null)
    setInfoMsg(null)
    setOtp(["", "", "", "", "", ""])

    try {
      await api.sendOtp(clean, role)
      setInfoMsg(
        customSuccessMsg ||
          (isBn
            ? `আপনার মোবাইল নম্বরে ৬ সংখ্যার OTP কোড পাঠানো হয়েছে (+৮৮০ ${clean})।`
            : `A 6-digit OTP code has been sent to (+880 ${clean}).`)
      )
      setStep("otp")
      setTimeout(() => document.getElementById("otp-0")?.focus(), 150)
    } catch (err: any) {
      console.error("OTP send error:", err)
      setError(
        err instanceof ApiError
          ? err.message
          : isBn
          ? "মোবাইল নম্বরে OTP পাঠানো যায়নি। দয়া করে নেটওয়ার্ক চেক করে পুনরায় চেষ্টা করুন।"
          : "Failed to send OTP. Please check your network and try again."
      )
    } finally {
      setLoading(false)
    }
  }

  function handlePasteOtp(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted.length === 0) return

    const digits = pasted.split("")
    while (digits.length < 6) digits.push("")
    setOtp(digits)

    if (pasted.length === 6) {
      handleVerifyOtp(pasted)
    } else {
      document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus()
    }
  }

  async function handleVerifyOtp(overrideOtp?: string) {
    const fullOtp = overrideOtp || otp.join("")
    if (fullOtp.length < 6) {
      setError(isBn ? "৬ ডিজিটের OTP কোড লিখুন" : "Please enter the 6-digit OTP code")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await api.verifyOtp(
        phone,
        fullOtp,
        role,
        undefined,
        consentGiven,
        password.trim() || undefined
      )

      const storedName =
        role === "merchant" ? res.merchant?.ownerName : res.customer?.name

      if (!storedName) {
        // Brand-new account with no name on file yet
        setPendingAuthResult(res)
        setShowNameModal(true)
      } else {
        await finalizeLogin(res, storedName)
      }
    } catch (err: any) {
      console.error("Verification error:", err)
      setError(
        err instanceof ApiError
          ? err.message
          : isBn
          ? "যাচাইকরণে ত্রুটি হয়েছে। সঠিক OTP প্রদান করুন।"
          : "Verification error. Please enter the correct OTP."
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveNewUserName() {
    if (!modalName.trim()) {
      setError(isBn ? "অনুগ্রহ করে আপনার নামটি লিখুন" : "Please enter your name")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const finalName = modalName.trim()
      const cleanPhone = phone.replace(/\D/g, "")
      const digits10 = cleanPhone.slice(-10)

      if (role === "customer") {
        const accountId = `c_${digits10}`
        // Save to Firestore
        await firebaseService.saveCustomerProfile({
          id: accountId,
          name: finalName,
          phone: cleanPhone,
          password: password.trim(),
        })
        // Set session and navigate
        const profile: UserProfile = {
          id: accountId,
          phone: cleanPhone,
          name: finalName,
          role: "customer",
          createdAt: new Date().toISOString(),
        }
        setSessionProfile(profile, `token_customer_${accountId}`)
        setShowNameModal(false)
        onEnter("customer")
      } else {
        // Merchant
        const accountId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        await firebaseService.saveMerchantProfile({
          id: accountId,
          ownerPhone: cleanPhone,
          ownerName: finalName,
          name: "",
          password: password.trim(),
          onboarded: false,
        })
        const profile: UserProfile = {
          id: accountId,
          phone: cleanPhone,
          name: finalName,
          role: "merchant",
          merchantId: accountId,
          ownedMerchantIds: [accountId],
          onboarded: false,
          createdAt: new Date().toISOString(),
        }
        setSessionProfile(profile, `token_merchant_${accountId}`)
        setShowNameModal(false)
        onEnter("merchant", { needsOnboarding: true })
      }

      // Non-blocking backend sync
      api.registerWithPassword(cleanPhone, password.trim(), finalName, role).catch(() => {})
    } catch (err: any) {
      console.error("Failed to save new profile:", err)
      setError(
        err?.message ||
          (isBn ? "প্রোফাইল সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Failed to save profile. Please try again.")
      )
    } finally {
      setLoading(false)
    }
  }

  async function finalizeLogin(res: any, finalName: string) {
    if (role === "merchant") {
      const merchant = res.merchant
      if (!merchant?.id) {
        setError(isBn ? "মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি। আবার চেষ্টা করুন।" : "Merchant account not found. Please try again.")
        return
      }

      // A merchant is only considered onboarded if the flag is explicitly true
      const hasCompletedOnboarding = Boolean(merchant.onboarded) === true

      const profile: UserProfile = {
        id: merchant.id,
        phone,
        name: finalName,
        role: "merchant",
        merchantId: merchant.id,
        ownedMerchantIds: (res.merchants || [merchant]).map((m: any) => m.id),
        onboarded: hasCompletedOnboarding,
        createdAt: merchant.createdAt,
      }

      await firebaseService.saveMerchantProfile({
        id: merchant.id,
        ownerPhone: phone,
        ownerName: finalName,
        name: merchant.name || "",
        password: password.trim() || merchant.password || undefined,
        onboarded: hasCompletedOnboarding,
        createdAt: merchant.createdAt,
      })

      setSessionProfile(profile, res.token)
      onEnter("merchant", { needsOnboarding: !hasCompletedOnboarding })
      return
    }

    const customer = res.customer
    const digits10 = phone.replace(/\D/g, "").slice(-10)
    const custId = customer?.id || `c_${digits10}`
    const profile: UserProfile = {
      id: custId,
      phone,
      name: finalName,
      role: "customer",
      createdAt: customer?.createdAt || new Date().toISOString(),
    }

    await firebaseService.saveCustomerProfile({
      id: profile.id,
      phone,
      name: finalName,
      password: password.trim() || customer?.password || undefined,
    })

    setSessionProfile(profile, res.token)
    onEnter("customer")
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`)
      el?.focus()
    }
    if (next.every((d) => d !== "") && index === 5) {
      handleVerifyOtp(next.join(""))
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const el = document.getElementById(`otp-${index - 1}`)
      el?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_0%,#165B3B_0%,#0D3824_45%,#061910_100%)] flex flex-col relative overflow-hidden">
      {/* Top Bar Quick Language Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md border border-white/15 flex items-center gap-1.5 active:scale-95 shadow-md"
        >
          <GlobeIcon size={14} className="text-[#34D399]" />
          <span className="font-mono text-xs font-black uppercase text-[#34D399]">
            {isBn ? "English" : "বাংলা"}
          </span>
        </button>
      </div>

      {/* Ambient background glow orb */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#52B788]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative z-10">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 mb-5 backdrop-blur-md border border-white/20 shadow-2xl glow-emerald">
            <span className="text-4xl">🔖</span>
          </div>
          <h1 className="font-display text-5xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-md">
            {isBn ? "সিলসিলা" : "Silsila"}
          </h1>
          <p className="text-[#34D399] text-base font-semibold tracking-wide mt-1 drop-shadow-sm">
            {isBn ? "আপনার ব্র্যান্ডের ডিজিটাল Loyalty Card!" : "Your Brand's Digital Loyalty Card!"}
          </p>
        </div>

        {error && (
          <div className="w-full max-w-sm mb-4 bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-3 rounded-2xl text-sm animate-fade-in backdrop-blur-md shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {infoMsg && (
          <div className="w-full max-w-sm mb-4 bg-[#52B788]/20 border border-[#52B788]/40 text-[#D8EDDF] px-4 py-3 rounded-2xl text-xs font-medium animate-fade-in backdrop-blur-md shadow-lg">
            ✓ {infoMsg}
          </div>
        )}

        {/* STEP 1: ROLE SELECTION (Customer and Merchant with icon above) */}
        {step === "choose" && (
          <div className="w-full max-w-sm animate-slide-up grid grid-cols-2 gap-3.5">
            {/* Customer Button */}
            <button
              onClick={() => handleRoleSelect("customer")}
              className="bg-white/95 rounded-3xl p-6 flex flex-col items-center justify-center gap-3.5 transition-all active:scale-[0.96] hover:bg-white text-center cursor-pointer shadow-2xl border border-white/40 group backdrop-blur-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#D8EDDF] text-[#1B4332] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <span className="text-[#1B4332] font-display font-black text-lg tracking-tight">
                {isBn ? "কাস্টমার" : "Customer"}
              </span>
            </button>

            {/* Merchant Button */}
            <button
              onClick={() => handleRoleSelect("merchant")}
              className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center justify-center gap-3.5 transition-all active:scale-[0.96] hover:bg-[#123324] text-center cursor-pointer shadow-2xl border border-emerald-500/20 hover:border-emerald-500/40 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#1B4332] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l1.5-6h15L21 9" />
                  <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
                  <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
              </div>
              <span className="text-white font-display font-black text-lg tracking-tight">
                {isBn ? "মার্চেন্ট" : "Merchant"}
              </span>
            </button>
          </div>
        )}

        {/* STEP 2: PHONE NUMBER ONLY */}
        {step === "phone" && (
          <div className="w-full max-w-sm animate-slide-up">
            <button
              onClick={() => setStep("choose")}
              className="text-white/70 text-sm mb-4 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← ফিরে যান" : "← Back"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-display font-bold text-2xl">
                  {role === "customer"
                    ? isBn ? "কাস্টমার" : "Customer"
                    : isBn ? "মার্চেন্ট" : "Merchant"}
                </h2>
                <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-semibold text-white/80">
                  {role === "customer"
                    ? isBn ? "কাস্টমার" : "Customer"
                    : isBn ? "মার্চেন্ট" : "Merchant"}
                </span>
              </div>

              <p className="text-white/80 text-xs mb-4 leading-relaxed">
                {isBn ? "আপনার ১১ ডিজিটের মোবাইল নম্বর দিন" : "Enter your 11-digit mobile number"}
              </p>

              {/* Phone Number Field */}
              <div className="mb-5">
                <label className="block text-white/80 text-xs font-semibold mb-1.5">
                  {isBn ? "মোবাইল নম্বর (+৮৮০)" : "Mobile Number (+880)"}
                </label>
                <div className="flex gap-2">
                  <div className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 text-white font-medium text-sm flex items-center">
                    +880
                  </div>
                  <input
                    type="tel"
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && phone.length >= 10 && consentGiven && !loading) {
                        handlePhoneNext()
                      }
                    }}
                    placeholder="01711234567"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] transition-colors text-base"
                  />
                </div>
              </div>

              {/* PDPA Consent Checkbox */}
              <label className="flex items-start gap-2 mb-6 cursor-pointer text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded text-[#1B4332] focus:ring-0 cursor-pointer"
                />
                <span>
                  {isBn
                    ? "বাংলাদেশ ব্যক্তিগত ডেটা সুরক্ষা আইন ২০২৬ অনুযায়ী আমার লয়্যালটি স্ট্যাম্প সংরক্ষণে সম্মতি প্রদান করছি।"
                    : "I consent to the collection and storage of my loyalty stamp information under Bangladesh Data Privacy Regulations (PDPA 2026)."}
                </span>
              </label>

              {/* Button: Continue / Next */}
              <button
                onClick={handlePhoneNext}
                disabled={loading || phone.length < 10 || !consentGiven}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg cursor-pointer"
                style={{
                  background: phone.length >= 10 && consentGiven ? "#F59E0B" : "rgba(255,255,255,0.15)",
                  color: phone.length >= 10 && consentGiven ? "#1B4332" : "white",
                }}
              >
                {loading
                  ? isBn ? "যাচাই করা হচ্ছে..." : "Verifying..."
                  : isBn ? "এগিয়ে যান →" : "Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3A: EXISTING USER -> ENTER PASSWORD (WITH OTP OPTION BELOW) */}
        {step === "login_password" && (
          <div className="w-full max-w-sm animate-slide-up">
            <button
              onClick={() => { setStep("phone"); setError(null); }}
              className="text-white/70 text-sm mb-4 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← নম্বর পরিবর্তন করুন" : "← Change Number"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-display font-bold text-2xl">
                  {existingUserName
                    ? (isBn ? `স্বাগতম, ${existingUserName}!` : `Welcome, ${existingUserName}!`)
                    : (isBn ? "লগইন করুন" : "Log In")}
                </h2>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold">
                  {isBn ? "বিদ্যমান অ্যাকাউন্ট" : "Existing Account"}
                </span>
              </div>

              <p className="text-white/70 text-xs mb-4">
                📱 +880 {phone}
              </p>

              {/* Password Field */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-white/80 text-xs font-semibold">
                    {isBn ? "আপনার পাসওয়ার্ড" : "Your Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#52B788] hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (isBn ? "লুকান" : "Hide") : (isBn ? "দেখুন" : "Show")}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password.trim() && !loading) {
                      handleExistingPasswordLogin()
                    }
                  }}
                  placeholder={isBn ? "পাসওয়ার্ড লিখুন" : "Enter password"}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] transition-colors text-base"
                />
              </div>

              {/* Primary Button: Login */}
              <button
                onClick={handleExistingPasswordLogin}
                disabled={loading || !password.trim()}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg cursor-pointer hover:brightness-105"
              >
                {loading
                  ? isBn ? "লগইন হচ্ছে..." : "Logging In..."
                  : isBn ? "লগইন করুন ✓" : "Log In ✓"}
              </button>

              {/* Secondary Option: Request OTP */}
              <div className="mt-4 pt-4 border-t border-white/15 text-center">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="text-xs font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {isBn ? "📲 অথবা OTP কোড দিয়ে লগইন করুন" : "📲 Or log in with OTP code"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3B: NEW USER -> ENTER PASSWORD TO REGISTER */}
        {step === "register_password" && (
          <div className="w-full max-w-sm animate-slide-up">
            <button
              onClick={() => { setStep("phone"); setError(null); }}
              className="text-white/70 text-sm mb-4 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← নম্বর পরিবর্তন করুন" : "← Change Number"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-white font-display font-bold text-2xl">
                  {isBn ? "নতুন রেজিস্ট্রেশন" : "New Registration"}
                </h2>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-bold">
                  {isBn ? "নতুন অ্যাকাউন্ট" : "New Account"}
                </span>
              </div>

              <p className="text-white/70 text-xs mb-4">
                📱 +880 {phone}
              </p>

              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl mb-4 text-xs text-white/80 leading-relaxed">
                {isBn
                  ? "এই নম্বরে কোনো অ্যাকাউন্ট নেই। নতুন অ্যাকাউন্ট তৈরি করতে আপনার পছন্দের একটি পাসওয়ার্ড সেট করুন।"
                  : "No account found with this number. Please choose a password to create your account."}
              </div>

              {/* Password Field */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-white/80 text-xs font-semibold">
                    {isBn ? "নতুন পাসওয়ার্ড তৈরি করুন" : "Create New Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#52B788] hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (isBn ? "লুকান" : "Hide") : (isBn ? "দেখুন" : "Show")}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password.trim().length >= 4 && !loading) {
                      handleNewUserRegisterSubmit()
                    }
                  }}
                  placeholder={isBn ? "পাসওয়ার্ড লিখুন (কমপক্ষে ৪ অক্ষর)" : "Enter password (at least 4 chars)"}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] transition-colors text-base"
                />
              </div>

              {/* Button: Set Password & Send OTP */}
              <button
                onClick={handleNewUserRegisterSubmit}
                disabled={loading || password.trim().length < 4}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg cursor-pointer hover:brightness-105"
              >
                {loading
                  ? isBn ? "OTP পাঠানো হচ্ছে..." : "Sending OTP..."
                  : isBn ? "OTP পাঠান ও এগিয়ে যান →" : "Send OTP & Proceed →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OTP VERIFICATION */}
        {step === "otp" && (
          <div className="w-full max-w-sm animate-slide-up">
            <button
              onClick={() => setStep(isExistingAccount ? "login_password" : "register_password")}
              className="text-white/70 text-sm mb-4 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← ফিরে যান" : "← Back"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-2xl" onPaste={handlePasteOtp}>
              <h2 className="text-white font-display font-bold text-2xl mb-1">
                {isBn ? "OTP কোড দিন" : "Enter OTP Code"}
              </h2>
              <p className="text-white/70 text-sm mb-6">
                {isBn
                  ? `+৮৮০ ${phone}-তে পাঠানো ৬ সংখ্যার কোড লিখুন`
                  : `Enter the 6-digit code sent to +880 ${phone}`}
              </p>

              <div className="flex gap-2 mb-6 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="tel"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleVerifyOtp()
                      } else {
                        handleOtpKeyDown(i, e)
                      }
                    }}
                    onPaste={handlePasteOtp}
                    className="w-11 h-13 text-center bg-white/10 border-2 rounded-xl text-white text-xl font-bold outline-none transition-all focus:border-[#F59E0B] focus:bg-white/20"
                    style={{ borderColor: digit ? "#52B788" : "rgba(255,255,255,0.2)" }}
                  />
                ))}
              </div>

              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg"
              >
                {loading
                  ? isBn ? "যাচাই করা হচ্ছে..." : "Verifying..."
                  : isBn ? "যাচাই করে প্রবেশ করুন ✓" : "Verify & Sign In ✓"}
              </button>

              <button
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="w-full mt-3 py-2 text-white/60 text-xs hover:text-white transition-colors cursor-pointer"
              >
                {isBn ? "পুনরায় OTP পাঠান" : "Resend OTP"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* NEW USER NAME MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1B4332] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-[#52B788]/20 border border-[#52B788]/30 flex items-center justify-center mx-auto mb-4 text-3xl">
              ✨
            </div>
            
            <h3 className="font-display font-black text-2xl text-white mb-2">
              {isBn ? "সিলসিলায় স্বাগতম!" : "Welcome to Silsila!"}
            </h3>
            
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              {isBn
                ? "নতুন অ্যাকাউন্ট তৈরি করতে অনুগ্রহ করে আপনার নাম দিন।"
                : "Please enter your name to complete registration."}
            </p>

            <div className="mb-5 text-left">
              <label className="block text-white/80 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                {isBn ? "আপনার নাম" : "Your Name"}
              </label>
              <input
                type="text"
                autoFocus
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && modalName.trim() && !loading) {
                    handleSaveNewUserName()
                  }
                }}
                placeholder={isBn ? "যেমন: Sadman / সাদমান" : "e.g. Sadman"}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] focus:bg-white/15 transition-all text-base"
              />
            </div>

            <button
              onClick={handleSaveNewUserName}
              disabled={loading || !modalName.trim()}
              className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg hover:brightness-105 cursor-pointer"
            >
              {loading
                ? isBn ? "অ্যাকাউন্ট তৈরি হচ্ছে..." : "Creating Account..."
                : isBn ? "অ্যাকাউন্ট চালু করুন ✓" : "Launch Account ✓"}
            </button>
          </div>
        </div>
      )}

      <div className="pb-8 px-6 text-center">
        <p className="text-white/30 text-xs leading-relaxed">
          {isBn ? (
            <>
              সিলসিলা প্ল্যাটফর্মে প্রবেশের মাধ্যমে আপনি আমাদের{" "}
              <span className="underline text-white/50">গোপনীয়তা নীতি (PDPA 2026)</span> মেনে নিচ্ছেন।
            </>
          ) : (
            <>
              By accessing the Silsila platform, you agree to our{" "}
              <span className="underline text-white/50">Privacy Policy (PDPA 2026)</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
