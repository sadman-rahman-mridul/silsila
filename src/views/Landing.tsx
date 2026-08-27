import { useState } from "react"
import { api, ApiError } from "../services/api"
import { useAuth, type UserProfile } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"
import { firebaseService } from "../services/firebaseService"
import { GlobeIcon } from "../components/Icons"

type LandingStep = "choose" | "phone" | "login_pin" | "register_pin" | "otp"
type Role = "customer" | "merchant" | "ops"

interface LandingProps {
  onEnter: (role: "customer" | "merchant" | "ops", opts?: { needsOnboarding?: boolean }) => void
  initialMerchantSlug?: string | null
  initialRole?: "customer" | "merchant" | "ops"
  redirectPath?: string
}

export default function Landing({
  onEnter,
  initialMerchantSlug,
  initialRole,
  redirectPath,
}: LandingProps) {
  const { setSessionProfile } = useAuth()
  const { isBn, toggleLanguage } = useLanguage()
  const [step, setStep] = useState<LandingStep>(() =>
    initialMerchantSlug || initialRole || redirectPath ? "phone" : "choose"
  )
  const [role, setRole] = useState<Role>(() => initialRole || "customer")
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpToken, setOtpToken] = useState<string | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [consentGiven, setConsentGiven] = useState(true)
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
    setPin("")
    setIsExistingAccount(false)
    setExistingUserName(null)
    setCachedAccount(null)
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
        // Phone matches an existing user in Firestore -> ask for 6-Digit PIN
        setStep("login_pin")
        if (name) {
          setInfoMsg(
            isBn
              ? `স্বাগতম ${name}! আপনার ৬ সংখ্যার পিন লিখুন।`
              : `Welcome back, ${name}! Please enter your 6-digit PIN.`
          )
        }
      } else {
        // Phone doesn't match any Firestore account -> ask to set a 6-digit PIN
        setStep("register_pin")
        setInfoMsg(
          isBn
            ? "এই নম্বরে কোনো অ্যাকাউন্ট নেই। নিবন্ধন করতে আপনার ৬ সংখ্যার গোপন পিন সেট করুন।"
            : "No account found for this number. Please set a 6-digit secret PIN to register."
        )
      }
    } catch (err: any) {
      console.error("Lookup error:", err)
      setStep("register_pin")
    } finally {
      setLoading(false)
    }
  }

  // STEP 3A: Existing User Login with 6-Digit PIN
  async function handleExistingPinLogin(overridePin?: string) {
    const pinToVerify = (overridePin || pin).trim()
    if (pinToVerify.length !== 6 || !/^\d{6}$/.test(pinToVerify)) {
      setError(isBn ? "অনুগ্রহ করে ৬ সংখ্যার সঠিক পিন দিন" : "Please enter a valid 6-digit numeric PIN")
      return
    }

    setLoading(true)
    setError(null)
    setInfoMsg(null)

    try {
      // Fetch or use cached account from Cloud Firestore (single source of truth)
      let account = cachedAccount
      if (!account) {
        const clean = phone.replace(/\D/g, "")
        account = await firebaseService.findAccountByPhone(clean, role).catch(() => null)
        setCachedAccount(account)
      }

      if (account) {
        const storedPin = (account.password || account.pin || "").toString()
        const isMatch =
          (storedPin && storedPin === pinToVerify) ||
          (storedPin && storedPin.length < 6 && pinToVerify.startsWith(storedPin))

        if (isMatch) {
          // Auto-upgrade legacy password to new 6-digit PIN in Firestore
          if (storedPin !== pinToVerify) {
            if (role === "customer") {
              await firebaseService.updateCustomerProfile(account.id, {
                password: pinToVerify,
                pin: pinToVerify,
              }).catch(console.warn)
            } else {
              await firebaseService.updateMerchantInFirestore(account.id, {
                password: pinToVerify,
                pin: pinToVerify,
              }).catch(console.warn)
            }
          }

          const storedName =
            role === "merchant" ? account.ownerName || account.name : account.name
          const resObj = {
            success: true,
            role,
            token: `token_${role}_${account.id}`,
            customer: role === "customer" ? account : undefined,
            merchant: role === "merchant" ? account : undefined,
            merchants: role === "merchant" ? [account] : undefined,
          }
          await finalizeLogin(resObj, storedName || (isBn ? "ব্যবহারকারী" : "User"))
          return
        } else if (storedPin && storedPin !== pinToVerify) {
          setError(
            isBn
              ? "ভুল পিন! সঠিক ৬ সংখ্যার পিন দিন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
              : "Incorrect PIN! Please enter your 6-digit PIN or log in with OTP below."
          )
          return
        }
      }

      setError(
        isBn
          ? "পিন মেলেনি। সঠিক ৬ সংখ্যার পিন লিখুন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
          : "Incorrect PIN. Please enter your 6-digit PIN or log in with OTP below."
      )
    } catch (err: any) {
      console.error("PIN login error:", err)
      setError(
        isBn
          ? "পিন মেলেনি। সঠিক ৬ সংখ্যার পিন লিখুন অথবা নিচে 'OTP কোড দিয়ে লগইন করুন' চাপুন।"
          : "Incorrect PIN. Please enter your 6-digit PIN or log in with OTP below."
      )
    } finally {
      setLoading(false)
    }
  }

  // STEP 3B: New User Registration -> Send OTP verification first
  async function handleNewUserRegisterSubmit(overridePin?: string) {
    const pinToSet = (overridePin || pin).trim()
    if (pinToSet.length !== 6 || !/^\d{6}$/.test(pinToSet)) {
      setError(isBn ? "পিন অবশ্যই ৬ সংখ্যার হতে হবে" : "PIN must be exactly 6 numeric digits")
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
    setOtpCode("")

    try {
      const res = await api.sendOtp(clean, role)
      if (res.otpToken) {
        setOtpToken(res.otpToken)
      }
      setInfoMsg(
        customSuccessMsg ||
          (isBn
            ? `আপনার মোবাইল নম্বরে ৬ সংখ্যার OTP কোড পাঠানো হয়েছে (+৮৮০ ${clean})।`
            : `A 6-digit OTP code has been sent to (+880 ${clean}).`)
      )
      setStep("otp")
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

  async function handleVerifyOtp(overrideOtp?: string) {
    const fullOtp = (overrideOtp || otpCode).trim()
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
        pin.trim() || undefined,
        otpToken || undefined
      )

      // Authoritative Firestore lookup
      const cleanPhone = phone.replace(/\D/g, "")
      const firestoreAccount =
        cachedAccount || (await firebaseService.findAccountByPhone(cleanPhone, role).catch(() => null))

      const storedName =
        existingUserName ||
        (role === "merchant"
          ? firestoreAccount?.ownerName || firestoreAccount?.name || res.merchant?.ownerName
          : firestoreAccount?.name || res.customer?.name)

      if (!storedName) {
        // Only prompt if genuinely brand-new account with no name in Firestore or backend
        setPendingAuthResult(res)
        setShowNameModal(true)
      } else {
        const fullRes = {
          ...res,
          customer: firestoreAccount || res.customer,
          merchant: firestoreAccount || res.merchant,
          merchants: firestoreAccount ? [firestoreAccount] : res.merchants,
        }
        await finalizeLogin(fullRes, storedName)
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
          password: pin.trim(),
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
          password: pin.trim(),
          onboarded: false,
        })
        const profile: UserProfile = {
          id: accountId,
          phone: cleanPhone,
          name: finalName,
          role: "merchant",
          merchantId: accountId,
          ownedMerchantIds: [accountId],
          createdAt: new Date().toISOString(),
        }
        setSessionProfile(profile, `token_merchant_${accountId}`)
        setShowNameModal(false)
        onEnter("merchant", { needsOnboarding: true })
      }

      // Non-blocking backend sync
      api.registerWithPassword(cleanPhone, pin.trim(), finalName, role).catch(() => {})
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
        password: pin.trim() || merchant.password || undefined,
        onboarded: hasCompletedOnboarding,
        createdAt: merchant.createdAt,
      })

      setSessionProfile(profile, res.token)
      onEnter("merchant", { needsOnboarding: !hasCompletedOnboarding })
      return
    }

    const customer = res.customer || cachedAccount
    const digits10 = phone.replace(/\D/g, "").slice(-10)
    const custId = customer?.id || `c_${digits10}`
    const existingAvatar =
      customer?.avatarUrl || customer?.photoURL || cachedAccount?.avatarUrl || cachedAccount?.photoURL || ""

    const profile: UserProfile = {
      id: custId,
      phone,
      name: finalName,
      role: "customer",
      avatarUrl: existingAvatar || undefined,
      photoURL: existingAvatar || undefined,
      createdAt: customer?.createdAt || new Date().toISOString(),
    }

    await firebaseService.saveCustomerProfile({
      id: profile.id,
      phone,
      name: finalName,
      password: pin.trim() || customer?.password || undefined,
      avatarUrl: existingAvatar || undefined,
      photoURL: existingAvatar || undefined,
    })

    setSessionProfile(profile, res.token)
    onEnter("customer")
  }



  return (
    <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_0%,#165B3B_0%,#0D3824_45%,#061910_100%)] flex flex-col relative overflow-hidden">
      {/* Top Bar Quick Language Toggle */}
      <div className="absolute top-3 right-3 z-20">
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
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#52B788]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - Lifted to Upper Side */}
      <div className="flex-1 flex flex-col items-center justify-start pt-6 sm:pt-10 pb-6 px-4 relative z-10 w-full max-w-sm mx-auto">
        {/* Compact Hero Branding with Official Sealsela Vector Logo */}
        <div className="text-center mb-5 animate-slide-up flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 p-3 mb-2.5 backdrop-blur-xl border border-white/20 shadow-2xl glow-emerald flex items-center justify-center">
            <img src="/sealsela-logo-dark.svg" alt="Sealsela" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h1 className="font-display text-3xl font-black text-white tracking-tight leading-none drop-shadow-md">
            Sealsela
          </h1>
          <p className="text-[#34D399] text-xs font-semibold tracking-wide mt-1 drop-shadow-sm">
            {isBn ? "আজই আপনার ডিজিটাল লয়্যালটি কার্ড নিন!" : "Get your Digital Loyalty Card Today!"}
          </p>
        </div>

        {error && (
          <div className="w-full mb-3 bg-red-500/20 border border-red-400/40 text-red-200 px-3.5 py-2.5 rounded-2xl text-xs animate-fade-in backdrop-blur-md shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {infoMsg && (
          <div className="w-full mb-3 bg-[#52B788]/20 border border-[#52B788]/40 text-[#D8EDDF] px-3.5 py-2.5 rounded-2xl text-xs font-medium animate-fade-in backdrop-blur-md shadow-lg">
            ✓ {infoMsg}
          </div>
        )}

        {/* STEP 1: ROLE SELECTION (Customer and Merchant with icon above) */}
        {step === "choose" && (
          <div className="w-full animate-slide-up grid grid-cols-2 gap-3">
            {/* Customer Button */}
            <button
              onClick={() => handleRoleSelect("customer")}
              className="bg-white/95 rounded-3xl p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.96] hover:bg-white text-center cursor-pointer shadow-2xl border border-white/40 group backdrop-blur-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#D8EDDF] text-[#1B4332] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <span className="text-[#1B4332] font-display font-black text-base tracking-tight">
                {isBn ? "কাস্টমার" : "Customer"}
              </span>
            </button>

            {/* Merchant Button */}
            <button
              onClick={() => handleRoleSelect("merchant")}
              className="bg-[#0E281C]/90 backdrop-blur-xl rounded-3xl p-5 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.96] hover:bg-[#123324] text-center cursor-pointer shadow-2xl border border-emerald-500/20 hover:border-emerald-500/40 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#1B4332] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l1.5-6h15L21 9" />
                  <path d="M3 9a3 3 0 006 0 3 3 0 006 0" />
                  <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  <line x1="10" y1="16" x2="14" y2="16" />
                </svg>
              </div>
              <span className="text-white font-display font-black text-base tracking-tight">
                {isBn ? "মার্চেন্ট" : "Merchant"}
              </span>
            </button>
          </div>
        )}

        {/* STEP 2: PHONE NUMBER ONLY */}
        {step === "phone" && (
          <div className="w-full animate-slide-up">
            <button
              onClick={() => setStep("choose")}
              className="text-white/70 text-xs mb-3 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← ফিরে যান" : "← Back"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-display font-bold text-xl">
                  {role === "customer"
                    ? isBn ? "কাস্টমার লগইন" : "Customer Login"
                    : isBn ? "মার্চেন্ট লগইন" : "Merchant Login"}
                </h2>
                <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-[11px] font-semibold text-white/80">
                  {role === "customer"
                    ? isBn ? "গ্রাহক" : "Customer"
                    : isBn ? "দোকান/মালিক" : "Merchant"}
                </span>
              </div>

              <p className="text-white/80 text-xs mb-4 leading-relaxed">
                {redirectPath
                  ? isBn
                    ? "সিল দাবি ও সংগ্রহ করতে আপনার ১১ ডিজিটের মোবাইল নম্বর দিন"
                    : "Enter your 11-digit mobile number to claim your stamp"
                  : isBn
                  ? "আপনার ১১ ডিজিটের মোবাইল নম্বর দিন"
                  : "Enter your 11-digit mobile number"}
              </p>

              {/* Phone Number Field */}
              <div className="mb-4">
                <label className="block text-white/80 text-xs font-semibold mb-1.5">
                  {isBn ? "মোবাইল নম্বর (+৮৮০)" : "Mobile Number (+880)"}
                </label>
                <div className="flex gap-2">
                  <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white font-medium text-sm flex items-center">
                    +880
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && phone.length >= 10 && consentGiven && !loading) {
                        handlePhoneNext()
                      }
                    }}
                    placeholder="01711234567"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] transition-colors text-base font-mono"
                  />
                </div>
              </div>

              {/* PDPA Consent Checkbox */}
              <label className="flex items-start gap-2 mb-5 cursor-pointer text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 rounded text-[#1B4332] focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] leading-tight">
                  {isBn
                    ? "বাংলাদেশ ব্যক্তিগত ডেটা সুরক্ষা আইন ২০২৬ অনুযায়ী আমার লয়্যালটি স্ট্যাম্প সংরক্ষণে সম্মতি প্রদান করছি।"
                    : "I consent to the collection and storage of my loyalty stamps under PDPA 2026."}
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

        {/* STEP 3A: EXISTING USER -> ENTER 6-DIGIT PIN (bKash Style) */}
        {step === "login_pin" && (
          <div className="w-full animate-slide-up">
            <button
              onClick={() => { setStep("phone"); setError(null); setPin(""); }}
              className="text-white/70 text-xs mb-3 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← নম্বর পরিবর্তন করুন" : "← Change Number"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-white font-display font-bold text-xl">
                  {existingUserName
                    ? (isBn ? `স্বাগতম, ${existingUserName}!` : `Welcome, ${existingUserName}!`)
                    : (isBn ? "পিন দিন" : "Enter PIN")}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-bold">
                  {isBn ? "বিদ্যমান একাউন্ট" : "Existing User"}
                </span>
              </div>

              <p className="text-white/70 text-xs mb-4">
                📱 +880 {phone}
              </p>

              {/* 6-Digit PIN Field (bKash Style) */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/80 text-xs font-semibold">
                    {isBn ? "আপনার ৬ সংখ্যার পিন" : "Your 6-Digit PIN"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-[#52B788] hover:text-white transition-colors cursor-pointer font-bold"
                  >
                    {showPin ? (isBn ? "লুকান" : "Hide") : (isBn ? "দেখুন" : "Show")}
                  </button>
                </div>

                {/* 6 PIN Digit Box Slots */}
                <div className="relative">
                  <div className="flex justify-between gap-1.5 mb-2">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const digit = pin[idx]
                      const isFocused = pin.length === idx
                      return (
                        <div
                          key={idx}
                          className={`flex-1 h-13 rounded-2xl border-2 flex items-center justify-center font-display font-black text-xl transition-all ${
                            digit
                              ? "border-[#34D399] bg-[#34D399]/20 text-white shadow-md glow-emerald"
                              : isFocused
                              ? "border-[#F59E0B] bg-white/15 ring-2 ring-[#F59E0B]/30"
                              : "border-white/20 bg-white/5 text-white/30"
                          }`}
                        >
                          {digit ? (showPin ? digit : "●") : ""}
                        </div>
                      )
                    })}
                  </div>

                  {/* Native Hidden/Overlay Numeric Input */}
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setPin(val)
                      if (val.length === 6 && !loading) {
                        handleExistingPinLogin(val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pin.length === 6 && !loading) {
                        handleExistingPinLogin()
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-transparent bg-transparent"
                  />
                </div>

                <p className="text-[11px] text-white/50 text-center mt-1">
                  {isBn ? "শুধুমাত্র ৬টি সংখ্যা (0-9) লিখুন" : "Enter exactly 6 numeric digits"}
                </p>
              </div>

              {/* Primary Button: Login */}
              <button
                onClick={() => handleExistingPinLogin()}
                disabled={loading || pin.length !== 6}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg cursor-pointer hover:brightness-105"
              >
                {loading
                  ? isBn ? "যাচাই হচ্ছে..." : "Verifying..."
                  : isBn ? "লগইন করুন ✓" : "Log In ✓"}
              </button>

              {/* Secondary Option: Request OTP */}
              <div className="mt-3 pt-3 border-t border-white/15 text-center">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="text-xs font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {isBn ? "📲 পিন ভুলে গেছেন? OTP দিয়ে লগইন করুন" : "📲 Forgot PIN? Log in with OTP"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3B: NEW USER -> ENTER 6-DIGIT PIN TO REGISTER (bKash Style) */}
        {step === "register_pin" && (
          <div className="w-full animate-slide-up">
            <button
              onClick={() => { setStep("phone"); setError(null); setPin(""); }}
              className="text-white/70 text-xs mb-3 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← নম্বর পরিবর্তন করুন" : "← Change Number"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-white font-display font-bold text-xl">
                  {isBn ? "নতুন রেজিস্ট্রেশন" : "New Registration"}
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-bold">
                  {isBn ? "নতুন একাউন্ট" : "New User"}
                </span>
              </div>

              <p className="text-white/70 text-xs mb-3">
                📱 +880 {phone}
              </p>

              <div className="p-2.5 bg-white/5 border border-white/10 rounded-2xl mb-3 text-xs text-white/80 leading-relaxed">
                {isBn
                  ? "নতুন অ্যাকাউন্ট তৈরি করতে আপনার পছন্দের একটি ৬ সংখ্যার গোপন পিন সেট করুন।"
                  : "Please set a 6-digit secret numeric PIN for your new account."}
              </div>

              {/* 6-Digit PIN Field (bKash Style) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-white/80 text-xs font-semibold">
                    {isBn ? "৬ সংখ্যার পিন সেট করুন" : "Set 6-Digit Secret PIN"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-[#52B788] hover:text-white transition-colors cursor-pointer font-bold"
                  >
                    {showPin ? (isBn ? "লুকান" : "Hide") : (isBn ? "দেখুন" : "Show")}
                  </button>
                </div>

                {/* 6 PIN Digit Box Slots */}
                <div className="relative">
                  <div className="flex justify-between gap-1.5 mb-2">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const digit = pin[idx]
                      const isFocused = pin.length === idx
                      return (
                        <div
                          key={idx}
                          className={`flex-1 h-13 rounded-2xl border-2 flex items-center justify-center font-display font-black text-xl transition-all ${
                            digit
                              ? "border-[#F59E0B] bg-[#F59E0B]/20 text-[#F59E0B] shadow-md glow-amber"
                              : isFocused
                              ? "border-[#34D399] bg-white/15 ring-2 ring-[#34D399]/30"
                              : "border-white/20 bg-white/5 text-white/30"
                          }`}
                        >
                          {digit ? (showPin ? digit : "●") : ""}
                        </div>
                      )
                    })}
                  </div>

                  {/* Native Hidden/Overlay Numeric Input */}
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                      setPin(val)
                      if (val.length === 6 && !loading) {
                        handleNewUserRegisterSubmit(val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && pin.length === 6 && !loading) {
                        handleNewUserRegisterSubmit()
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-transparent bg-transparent"
                  />
                </div>

                <p className="text-[11px] text-white/50 text-center mt-1">
                  {isBn ? "শুধুমাত্র ৬টি সংখ্যা (0-9) লিখুন" : "Enter exactly 6 numeric digits"}
                </p>
              </div>

              {/* Button: Set PIN & Send OTP */}
              <button
                onClick={() => handleNewUserRegisterSubmit()}
                disabled={loading || pin.length !== 6}
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
          <div className="w-full animate-slide-up">
            <button
              onClick={() => { setStep("phone"); setError(null); setOtpCode(""); }}
              className="text-white/70 text-xs mb-3 flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              {isBn ? "← নম্বর পরিবর্তন করুন" : "← Change Number"}
            </button>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20 shadow-2xl">
              <h2 className="text-white font-display font-bold text-xl mb-1">
                {isBn ? "OTP কোড দিন" : "Enter OTP Code"}
              </h2>
              <p className="text-white/70 text-xs mb-4">
                {isBn
                  ? `+৮৮০ ${phone}-তে পাঠানো ৬ সংখ্যার কোড লিখুন`
                  : `Enter the 6-digit code sent to +880 ${phone}`}
              </p>

              {/* 6 OTP Digit Box Slots */}
              <div className="relative mb-5">
                <div className="flex justify-between gap-1.5 mb-2">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const digit = otpCode[idx]
                    const isFocused = otpCode.length === idx
                    return (
                      <div
                        key={idx}
                        className={`flex-1 h-13 rounded-2xl border-2 flex items-center justify-center font-display font-black text-xl transition-all ${
                          digit
                            ? "border-[#34D399] bg-[#34D399]/20 text-white shadow-md glow-emerald"
                            : isFocused
                            ? "border-[#F59E0B] bg-white/15 ring-2 ring-[#F59E0B]/30"
                            : "border-white/20 bg-white/5 text-white/30"
                        }`}
                      >
                        {digit || ""}
                      </div>
                    )
                  })}
                </div>

                {/* Native Hidden/Overlay Numeric Input for 100% reliable mobile autofill and paste */}
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6)
                    setOtpCode(val)
                    if (val.length === 6 && !loading) {
                      handleVerifyOtp(val)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpCode.length === 6 && !loading) {
                      handleVerifyOtp(otpCode)
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-transparent bg-transparent"
                />
              </div>

              <p className="text-[11px] text-white/50 text-center mb-4">
                {isBn ? "৬ সংখ্যার কোডটি লিখুন বা এসএমএস থেকে পেস্ট করুন" : "Type the 6 digits or paste from SMS"}
              </p>

              <button
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-lg hover:brightness-105"
              >
                {loading
                  ? isBn ? "যাচাই করা হচ্ছে..." : "Verifying..."
                  : isBn ? "যাচাই করে প্রবেশ করুন ✓" : "Verify & Sign In ✓"}
              </button>

              <button
                onClick={() => handleSendOtp()}
                disabled={loading}
                className="w-full mt-3 py-2 text-white/70 text-xs hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
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
          <div className="bg-[#1B4332] border border-white/20 rounded-3xl p-6 max-w-xs w-full shadow-2xl text-center animate-slide-up">
            <div className="w-14 h-14 rounded-2xl bg-[#52B788]/20 border border-[#52B788]/30 flex items-center justify-center mx-auto mb-3 text-2xl">
              ✨
            </div>
            <h3 className="font-display font-black text-xl text-white mb-1">
              {isBn ? "আপনার নাম দিন" : "What is your name?"}
            </h3>
            <p className="text-white/70 text-xs mb-4">
              {role === "merchant"
                ? isBn ? "আপনার স্টোর বা ব্র্যান্ডের নাম" : "Your Store or Brand name"
                : isBn ? "লয়্যালটি কার্ডে প্রদর্শনের জন্য" : "For your loyalty card"}
            </p>

            <input
              type="text"
              autoFocus
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && modalName.trim()) {
                  handleSaveNewUserName()
                }
              }}
              placeholder={role === "merchant" ? (isBn ? "স্টোরের নাম" : "Store Name") : (isBn ? "আপনার নাম" : "Your Name")}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 font-medium outline-none focus:border-[#52B788] mb-4 text-center text-base"
            />

            <button
              onClick={handleSaveNewUserName}
              disabled={loading || !modalName.trim()}
              className="w-full py-3.5 rounded-xl font-display font-bold text-base bg-[#F59E0B] text-[#1B4332] shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer hover:brightness-105"
            >
              {loading
                ? isBn ? "সম্পন্ন হচ্ছে..." : "Finishing..."
                : isBn ? "শুরু করুন ✓" : "Get Started ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Footer Legal & Version */}
      <div className="py-4 text-center relative z-10">
        <p className="text-[11px] text-white/40">
          {isBn ? (
            <>
              Sealsela প্ল্যাটফর্ম ব্যবহার করে আপনি আমাদের{" "}
              <span className="underline text-white/60">গোপনীয়তা নীতি (PDPA ২০২৬)</span> মেনে নিচ্ছেন।
            </>
          ) : (
            <>
              By accessing the Sealsela platform, you agree to our{" "}
              <span className="underline text-white/60">Privacy Policy (PDPA 2026)</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
