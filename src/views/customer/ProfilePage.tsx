import { useState, useEffect } from "react"
import { api, type CustomerCard } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"
import { useSwipeBack } from "../../hooks/useSwipeBack"
import { LogOutIcon, ChevronRightIcon, ShieldCheckIcon, ChevronLeftIcon } from "../../components/Icons"

interface ProfilePageProps {
  onBack: () => void
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, profile, logout } = useAuth()
  const swipeHandlers = useSwipeBack(onBack)
  const [lang, setLang] = useState<"বাংলা" | "English">(() => {
    return (localStorage.getItem("silsila_lang") as any) || "বাংলা"
  })

  function handleToggleLang() {
    const next = lang === "বাংলা" ? "English" : "বাংলা"
    setLang(next)
    localStorage.setItem("silsila_lang", next)
  }
  const [notifications, setNotifications] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<CustomerCard[]>([])

  const customerId = profile?.id || user?.uid || null

  useEffect(() => {
    if (!customerId) return
    api.getCustomerCards(customerId).then(setCards).catch(console.warn)

    const unsubscribe = firebaseService.subscribeCustomerCards(customerId, (firestoreCards) => {
      if (firestoreCards.length > 0) setCards(firestoreCards)
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [customerId])

  const totalStamps = cards.reduce((acc, c) => acc + (c.stamps || 0), 0)
  const completedCount = cards.filter((c) => c.voucherReady || (c.cycleNo && c.cycleNo > 1)).length
  // Completed cycles are counted with each card's own target, not a fixed 5.
  const totalVisits = cards.reduce(
    (acc, c) => acc + (c.stamps || 0) + ((c.cycleNo || 1) - 1) * (c.target || 0),
    0
  )

  const customer = {
    name: profile?.name || user?.displayName || "সম্মানিত গ্রাহক",
    phone: profile?.phone || user?.phoneNumber || "",
    joinedDate: profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString("bn-BD", { year: "numeric", month: "long" })
      : "",
    totalStamps,
    totalVisits,
    cardsCompleted: completedCount,
  }

  const initialLetter = customer.name.trim().slice(0, 1) || "গ্র"

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
    <div className="flex flex-col h-full bg-[#F7F5F0]" {...swipeHandlers}>
      <div className="bg-[#1B4332] px-5 pt-10 pb-8">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
            title="হোমে ফিরুন"
          >
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center font-display font-black text-[#1B4332] text-xs shadow-sm">
              স
            </div>
            <span className="font-display font-black text-white text-base tracking-wide group-hover:text-[#F59E0B] transition-colors">
              সিলসিলা
            </span>
          </button>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
          >
            <ChevronLeftIcon size={14} />
            <span>হোমে ফিরুন</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
            <span className="font-display font-black text-white text-2xl">{initialLetter}</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-xl">{customer.name}</h1>
            <p className="text-[#52B788] text-sm">{customer.phone}</p>
            <p className="text-white/50 text-xs mt-0.5">সদস্য হয়েছেন {customer.joinedDate} থেকে</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "মোট সিল", value: customer.totalStamps, unit: "টি" },
            { label: "মোট ভিজিট", value: customer.totalVisits, unit: "বার" },
            { label: "কার্ড সম্পন্ন", value: customer.cardsCompleted, unit: "টি" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="font-display font-black text-white text-xl leading-none">
                {stat.value}
                <span className="text-sm font-medium text-white/60">{stat.unit}</span>
              </p>
              <p className="text-white/50 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {/* PDPA 2026 Compliance Badge */}
        <div className="bg-[#F0F7F2] border border-[#52B788]/30 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm">
          <ShieldCheckIcon size={22} className="text-[#1B4332] flex-shrink-0" />
          <div>
            <p className="text-[#1B4332] font-bold text-sm">বাংলাদেশ PDPA ২০২৬ সুরক্ষিত</p>
            <p className="text-[#6B6158] text-xs mt-0.5 leading-relaxed">
              আপনার ডেটা সম্পূর্ণ এনক্রিপ্ট করা ও আইনানুযায়ী যেকোনো সময় সম্পূর্ণ মুছে ফেলার অধিকার সংরক্ষিত।
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl card-shadow overflow-hidden mb-4">
          <button
            onClick={handleToggleLang}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-[#E9E5DC] hover:bg-[#F7F5F0] transition-colors cursor-pointer"
          >
            <span className="text-xl w-8 flex-shrink-0">🌐</span>
            <p className="flex-1 text-left font-medium text-sm text-[#1A1916]">ভাষা (Language)</p>
            <span className="text-xs bg-[#F0EDE6] px-2.5 py-1 rounded-full font-bold text-[#1B4332]">{lang}</span>
            <ChevronRightIcon size={16} className="text-[#B0A99E]" />
          </button>

          <button
            onClick={() => setNotifications((n) => !n)}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-[#E9E5DC] hover:bg-[#F7F5F0] transition-colors"
          >
            <span className="text-xl w-8 flex-shrink-0">🔔</span>
            <p className="flex-1 text-left font-medium text-sm text-[#1A1916]">নোটিফিকেশন ও অ্যালার্ট</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${notifications ? "bg-[#D8EDDF] text-[#1B4332]" : "bg-gray-100 text-gray-500"}`}>
              {notifications ? "চালু" : "বন্ধ"}
            </span>
            <ChevronRightIcon size={16} className="text-[#B0A99E]" />
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors text-red-600"
          >
            <span className="text-xl w-8 flex-shrink-0">🗑️</span>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">আমার ডেটা ও সিল মুছে ফেলুন</p>
              <p className="text-[11px] text-red-500/80">Right to erasure (PDPA ২০২৬ ধারা ৬৩)</p>
            </div>
            <ChevronRightIcon size={16} className="text-red-300" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-[#E9E5DC] text-[#6B6158] font-bold text-sm hover:border-[#B0A99E] transition-colors"
        >
          <LogOutIcon size={16} />
          লগ আউট
        </button>

        <p className="text-center text-[#B0A99E] text-xs mt-6">সিলসিলা v1.0.0</p>
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
    </div>
  )
}
