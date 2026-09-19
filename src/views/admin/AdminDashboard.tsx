import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"
import { firebaseService } from "../../services/firebaseService"
import {
  CheckIcon,
  XIcon,
  SearchIcon,
  LogOutIcon,
  GlobeIcon,
  SunIcon,
  MoonIcon,
  LockIcon,
  UsersIcon,
  StoreIcon,
  ClockIcon,
  PhoneIcon,
  SparklesIcon,
} from "../../components/Icons"
import { categoryLabel } from "../../constants/categories"

type AdminTab = "approvals" | "merchants" | "users"

export default function AdminDashboard() {
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // PIN security gate
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)

  // Admin Data State
  const [tab, setTab] = useState<AdminTab>("approvals")
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([])
  const [allMerchants, setAllMerchants] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all")

  // Action status message
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 4000)
  }

  // Admin PIN verification via backend authentication
  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPinError(null)
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("silsila_admin_token", data.token)
        localStorage.setItem("silsila_admin_token", data.token)
        localStorage.setItem("silsila_token", data.token)
        setIsAuthenticated(true)
        setPinError(null)
      } else {
        setPinError(data.error || (isBn ? "ভুল অ্যাডমিন পিন! আবার চেষ্টা করুন।" : "Invalid Admin PIN! Please try again."))
      }
    } catch {
      // Fallback for demo environments if server offline
      if (pinInput === "742043" || pinInput === "123456") {
        setIsAuthenticated(true)
        setPinError(null)
      } else {
        setPinError(isBn ? "ভুল অ্যাডমিন পিন! আবার চেষ্টা করুন।" : "Invalid Admin PIN! Please try again.")
      }
    }
  }

  // Load all data
  useEffect(() => {
    if (!isAuthenticated) return

    setLoading(true)

    // 1. Live subscribe to pending merchant approvals
    const unsubscribePending = firebaseService.subscribePendingMerchants((pending) => {
      setPendingMerchants(pending)
      setLoading(false)
    })

    // 2. Fetch all merchants & users
    loadAllRecords()

    return () => {
      if (typeof unsubscribePending === "function") unsubscribePending()
    }
  }, [isAuthenticated])

  async function loadAllRecords() {
    try {
      const [merchants, users] = await Promise.all([
        firebaseService.fetchAllMerchants(),
        firebaseService.fetchAllUsers(),
      ])
      setAllMerchants(merchants)
      setAllUsers(users)
    } catch (err) {
      console.error("Failed to load admin records:", err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Merchant Approval
  async function handleApprove(merchant: any) {
    if (processingId) return
    setProcessingId(merchant.id)

    try {
      // 1. Update Firestore status to approved
      await firebaseService.updateMerchantApproval(merchant.id, "approved")

      // 2. Send SMS to merchant's registered phone
      const phone = merchant.ownerPhone || merchant.phone
      if (phone) {
        const smsRes = await firebaseService.sendApprovalSms(phone, merchant.slug)
        if (smsRes?.success) {
          showToast(
            isBn
              ? `মার্চেন্ট '${merchant.name}' অনুমোদিত হয়েছে এবং SMS পাঠানো হয়েছে!`
              : `Merchant '${merchant.name}' approved & SMS sent successfully!`
          )
        } else {
          showToast(
            isBn
              ? `মার্চেন্ট অনুমোদিত হয়েছে (SMS ত্রুটি: ${smsRes?.error || "ব্যর্থ"})`
              : `Merchant approved (SMS notice: ${smsRes?.error || "failed"})`,
            "error"
          )
        }
      } else {
        showToast(
          isBn
            ? `মার্চেন্ট '${merchant.name}' অনুমোদিত হয়েছে!`
            : `Merchant '${merchant.name}' approved successfully!`
        )
      }

      await loadAllRecords()
    } catch (err: any) {
      showToast(err.message || "অনুমোদন ব্যর্থ হয়েছে", "error")
    } finally {
      setProcessingId(null)
    }
  }

  // Handle Merchant Rejection
  async function handleReject(merchant: any) {
    if (processingId) return
    if (!window.confirm(isBn ? `আপনি কি নিশ্চিতভাবে '${merchant.name}' বাতিল করতে চান?` : `Are you sure you want to reject '${merchant.name}'?`)) {
      return
    }

    setProcessingId(merchant.id)
    try {
      await firebaseService.updateMerchantApproval(merchant.id, "rejected")
      showToast(isBn ? `মার্চেন্ট '${merchant.name}' বাতিল করা হয়েছে` : `Merchant '${merchant.name}' rejected`)
      await loadAllRecords()
    } catch (err: any) {
      showToast(err.message || "বাতিল করা যায়নি", "error")
    } finally {
      setProcessingId(null)
    }
  }

  // Filtered lists
  const filteredMerchants = allMerchants.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.ownerPhone?.includes(search) ||
      m.senderBkashNumber?.includes(search) ||
      m.trxId?.toLowerCase().includes(search.toLowerCase()) ||
      m.area?.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === "approved") return m.approvalStatus === "approved" || m.status === "active"
    if (statusFilter === "pending") return m.approvalStatus === "pending_approval" || m.status === "pending"
    if (statusFilter === "rejected") return m.approvalStatus === "rejected" || m.status === "rejected"
    return true
  })

  const filteredUsers = allUsers.filter((u) => {
    return (
      search === "" ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)
    )
  })

  // PIN Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white p-4">
        <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center animate-scale-up">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-[#059669] dark:text-[#34D399] flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <LockIcon size={26} />
          </div>

          <h2 className="font-display font-black text-xl text-[#0F172A] dark:text-white mb-1">
            {isBn ? "অ্যাডমিন ড্যাশবোর্ড" : "Admin Dashboard"}
          </h2>
          <p className="text-slate-500 dark:text-white/60 text-xs mb-6">
            {isBn ? "প্রবেশ করতে ৬ সংখ্যার অ্যাডমিন পিন দিন" : "Enter the Admin Security PIN to continue"}
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/15 rounded-2xl py-3 text-[#0F172A] dark:text-white outline-none focus:border-[#059669] dark:focus:border-[#34D399]"
                autoFocus
              />
            </div>

            {pinError && (
              <p className="text-red-500 text-xs font-bold animate-fade-in">
                ⚠️ {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318] font-display font-bold text-sm shadow-lg glow-emerald cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "আনলক করুন →" : "Unlock Console →"}
            </button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            ← {isBn ? "হোমে ফিরে যান" : "Back to Home"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F6F9F7] dark:bg-[#071D13] text-[#0F172A] dark:text-white transition-colors">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 backdrop-blur-xl ${
              toastMsg.type === "success"
                ? "bg-emerald-900/90 text-white border-emerald-500/40"
                : "bg-red-900/90 text-white border-red-500/40"
            }`}
          >
            <span>{toastMsg.type === "success" ? "✓" : "⚠️"}</span>
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white/90 dark:bg-[#092015]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 p-1.5 flex items-center justify-center border border-emerald-500/30 shadow-md">
            <img src="/sealsela-logo-light.svg" alt="Sealsela" className="w-full h-full object-contain block dark:hidden" />
            <img src="/sealsela-logo-dark.svg" alt="Sealsela" className="w-full h-full object-contain hidden dark:block" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-lg text-[#0F172A] dark:text-white leading-tight">
                Sealsela
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#059669] text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-white/50">Merchant Approvals & System Console</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-[#0F172A] dark:text-[#34D399] border border-slate-200 dark:border-white/15 cursor-pointer transition-all"
            title="Toggle Theme"
          >
            {isDark ? <SunIcon size={14} className="text-[#F59E0B]" /> : <MoonIcon size={14} className="text-[#064E3B]" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1 border border-slate-200 dark:border-white/15 cursor-pointer transition-all"
          >
            <GlobeIcon size={13} />
            <span>{isBn ? "EN" : "বাংলা"}</span>
          </button>

          <button
            onClick={() => {
              setIsAuthenticated(false)
              setPinInput("")
              navigate("/")
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1 border border-red-500/20 cursor-pointer transition-all ml-1"
          >
            <LogOutIcon size={13} />
            <span>{isBn ? "লগআউট" : "Exit"}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("approvals")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                tab === "approvals"
                  ? "bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318] shadow-md glow-emerald"
                  : "bg-white dark:bg-[#0E281C] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <ClockIcon size={14} />
              <span>{isBn ? "মার্চেন্ট অনুমোদন" : "Pending Approvals"}</span>
              {pendingMerchants.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F59E0B] text-[#0A2318] animate-pulse">
                  {pendingMerchants.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("merchants")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                tab === "merchants"
                  ? "bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318] shadow-md glow-emerald"
                  : "bg-white dark:bg-[#0E281C] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <StoreIcon size={14} />
              <span>{isBn ? "সব মার্চেন্ট" : "All Merchants"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white">
                {allMerchants.length}
              </span>
            </button>

            <button
              onClick={() => setTab("users")}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                tab === "users"
                  ? "bg-gradient-to-r from-[#064E3B] to-[#047857] dark:from-[#10B981] dark:to-[#059669] text-white dark:text-[#0A2318] shadow-md glow-emerald"
                  : "bg-white dark:bg-[#0E281C] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <UsersIcon size={14} />
              <span>{isBn ? "সব গ্রাহক (Users)" : "All Customers"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white">
                {allUsers.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? "নাম, ফোন বা TrxID খুঁজুন..." : "Search name, phone, TrxID..."}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-[#0F172A] dark:text-white outline-none focus:border-[#059669] dark:focus:border-[#34D399]"
            />
          </div>
        </div>

        {/* TAB 1: PENDING APPROVALS */}
        {tab === "approvals" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-[#0F172A] dark:text-white">
                {isBn ? "অপেক্ষমান মার্চেন্ট পেমেন্ট যাচাই" : "Pending Merchant Payment Verification"}
              </h2>
              <span className="text-xs text-slate-500 dark:text-white/60">
                {pendingMerchants.length} {isBn ? "টি রিকুয়েস্ট" : "requests pending"}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">
                <div className="w-8 h-8 border-2 border-[#059669] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">{isBn ? "তথ্য লোড হচ্ছে..." : "Loading requests..."}</p>
              </div>
            ) : pendingMerchants.length === 0 ? (
              <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-[#059669] dark:text-[#34D399] flex items-center justify-center text-3xl mx-auto mb-3">
                  ✓
                </div>
                <h3 className="font-display font-bold text-base text-[#0F172A] dark:text-white mb-1">
                  {isBn ? "কোনো অপেক্ষমান রিকুয়েস্ট নেই" : "No Pending Approvals"}
                </h3>
                <p className="text-slate-500 dark:text-white/60 text-xs max-w-sm mx-auto">
                  {isBn
                    ? "সব মার্চেন্ট পেমেন্ট যাচাই সম্পন্ন হয়েছে। নতুন কেউ সাইন-আপ করলে এখানে দেখা যাবে।"
                    : "All merchant payment verifications are clear. New signups will appear here instantly."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingMerchants.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-[#0E281C] border-2 border-amber-500/40 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 bg-[#F59E0B] text-[#0A2318] text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      PENDING VERIFICATION
                    </div>

                    <div>
                      {/* Business & Owner Info */}
                      <div className="mb-3.5 pr-20">
                        <h3 className="font-display font-black text-lg text-[#0F172A] dark:text-white leading-tight">
                          {m.name}
                        </h3>
                        <p className="text-xs text-[#059669] dark:text-[#34D399] font-bold mt-0.5">
                          {categoryLabel(m.category, isBn) || (isBn ? "ব্যবসা" : "Business")} • {m.area || (isBn ? "ঢাকা" : "Dhaka")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/60 mt-1">
                          👤 {m.ownerName || "Owner"} ({m.ownerPhone || m.phone})
                        </p>
                      </div>

                      {/* Package & Payment Details */}
                      <div className="bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 space-y-2 mb-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-white/60 font-medium">
                            {isBn ? "নির্বাচিত প্যাকেজ:" : "Package:"}
                          </span>
                          <span className="font-bold text-[#059669] dark:text-[#34D399] bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {m.paymentPackage === "6_months" ? "6 Months (৳5,000)" : m.paymentPackage === "12_months" ? "12 Months (৳8,000)" : "Standard Plan"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 dark:text-white/60 font-medium">
                            {isBn ? "যে নম্বর থেকে টাকা এসেছে:" : "Money Sent From:"}
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {m.senderBkashNumber || "Not Provided"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-white/10">
                          <span className="text-slate-500 dark:text-white/60 font-medium">
                            {isBn ? "ট্রানজ্যাকশন আইডি (TrxID):" : "Transaction ID:"}
                          </span>
                          <span className="font-mono font-black text-sm text-[#F59E0B] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                            {m.trxId || "—"}
                          </span>
                        </div>

                        {m.paymentSubmittedAt && (
                          <p className="text-[10px] text-slate-400 dark:text-white/40 pt-1">
                            {isBn ? "জমা দেওয়া হয়েছে: " : "Submitted: "}
                            {new Date(m.paymentSubmittedAt).toLocaleString("bn-BD")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Approve & Reject */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleReject(m)}
                        disabled={processingId === m.id}
                        className="px-3.5 py-2.5 rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <XIcon size={14} />
                        <span>{isBn ? "বাতিল" : "Reject"}</span>
                      </button>

                      <button
                        onClick={() => handleApprove(m)}
                        disabled={processingId === m.id}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-110 text-white font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-md glow-emerald transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <CheckIcon size={15} />
                        <span>{processingId === m.id ? (isBn ? "অনুমোদন হচ্ছে..." : "Approving...") : (isBn ? "অনুমোদন করুন ও SMS পাঠান" : "Approve & Send SMS")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ALL MERCHANTS */}
        {tab === "merchants" && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-white/60 font-medium mr-1">Filter:</span>
              {(["all", "approved", "pending", "rejected"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === filter
                      ? "bg-[#059669] text-white shadow-sm"
                      : "bg-white dark:bg-[#0E281C] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10"
                  }`}
                >
                  {filter === "all" ? "All" : filter.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Table / List */}
            <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 font-bold">
                    <tr>
                      <th className="py-3 px-4">Business Name</th>
                      <th className="py-3 px-4">Owner & Phone</th>
                      <th className="py-3 px-4">Package</th>
                      <th className="py-3 px-4">Sender bKash & TrxID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {filteredMerchants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No merchants match the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMerchants.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{m.name}</span>
                              {m.slug && (
                                <a
                                  href={`/${m.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-[#059669] dark:text-[#34D399] font-mono hover:underline"
                                >
                                  /{m.slug}
                                </a>
                              )}
                            </div>
                            <span className="text-[10px] font-normal text-slate-500 dark:text-white/50">
                              {categoryLabel(m.category, isBn)} • {m.area || (isBn ? "ঢাকা" : "Dhaka")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-white/80">
                            <div>{m.ownerName || "—"}</div>
                            <div className="font-mono text-slate-500 dark:text-white/50 text-[11px]">
                              {m.ownerPhone || m.phone || "—"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {m.paymentPackage === "6_months" ? "6 Mo (5K)" : m.paymentPackage === "12_months" ? "12 Mo (8K)" : "Standard"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div>{m.senderBkashNumber || "—"}</div>
                            <div className="text-[#F59E0B] font-bold">{m.trxId || "—"}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                m.approvalStatus === "approved" || m.status === "active"
                                  ? "bg-emerald-500/15 text-[#059669] dark:text-[#34D399] border border-emerald-500/30"
                                  : m.approvalStatus === "pending_approval" || m.status === "pending"
                                  ? "bg-amber-500/15 text-[#F59E0B] border border-amber-500/30"
                                  : "bg-red-500/15 text-red-500 border border-red-500/30"
                              }`}
                            >
                              {m.approvalStatus === "approved" || m.status === "active"
                                ? "Approved"
                                : m.approvalStatus === "pending_approval" || m.status === "pending"
                                ? "Pending"
                                : "Rejected"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {m.approvalStatus !== "approved" && m.status !== "active" ? (
                              <button
                                onClick={() => handleApprove(m)}
                                disabled={processingId === m.id}
                                className="px-2.5 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReject(m)}
                                disabled={processingId === m.id}
                                className="px-2.5 py-1 rounded-lg border border-red-500/40 text-red-500 hover:bg-red-50 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ALL USERS / CUSTOMERS */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-[#0F172A] dark:text-white">
                {isBn ? "নিবন্ধিত গ্রাহক তালিকা" : "Registered Customer Accounts"}
              </h2>
              <span className="text-xs text-slate-500 dark:text-white/60">
                {filteredUsers.length} {isBn ? "জন গ্রাহক" : "customers"}
              </span>
            </div>

            <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 font-bold">
                    <tr>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Account ID</th>
                      <th className="py-3 px-4">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs">
                                {u.name ? u.name.slice(0, 1) : "U"}
                              </div>
                              <span>{u.name || "Sealsela User"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-white/80">
                            {u.phone || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                              Customer
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                            {u.id}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-white/50 text-[11px]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

