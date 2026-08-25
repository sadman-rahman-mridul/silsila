import { useState, useEffect } from "react"
import { api, type MerchantCustomer, type RewardProgram } from "../../services/api"
import { SearchIcon, ChevronRightIcon, DownloadIcon } from "../../components/Icons"
import { useAuth } from "../../context/AuthContext"
import { firebaseService } from "../../services/firebaseService"

type FilterTab = "all" | "active" | "completed" | "at_risk"

interface CustomersPageProps {
  merchantId?: string
}

export default function CustomersPage({ merchantId: propId }: CustomersPageProps) {
  const { profile } = useAuth()
  const merchantId = propId || profile?.merchantId || profile?.id || ""
  const [customers, setCustomers] = useState<MerchantCustomer[]>([])
  const [filter, setFilter] = useState<FilterTab>("all")
  const [search, setSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<MerchantCustomer | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [consentAcknowledged, setConsentAcknowledged] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The stamp target comes from this merchant's own reward program.
  const [target, setTarget] = useState<number | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [filter, search, merchantId])

  useEffect(() => {
    api
      .getRewardPrograms(merchantId)
      .then((programs: RewardProgram[]) => {
        const active = programs.find((p) => p.active) || programs[0]
        setTarget(active?.target ?? null)
      })
      .catch(() => setTarget(null))
  }, [merchantId])

  async function loadCustomers() {
    try {
      setLoading(true)
      setError(null)
      const [apiList, fbList] = await Promise.all([
        api.getCrmCustomers(merchantId, filter, search).catch(() => []),
        firebaseService.getMerchantCustomers(merchantId, filter, search).catch(() => []),
      ])

      const map = new Map<string, any>()
      apiList.forEach((c: any) => map.set(c.id, c))
      fbList.forEach((c: any) => map.set(c.id, { ...map.get(c.id), ...c }))
      setCustomers(Array.from(map.values()))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportCsv() {
    if (!consentAcknowledged) return
    setExporting(true)
    try {
      await api.exportCrmCsv(merchantId, true)
      setShowExportModal(false)
    } catch (err: any) {
      setError(err.message || "CSV এক্সপোর্ট ব্যর্থ")
    } finally {
      setExporting(false)
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "সব" },
    { key: "active", label: "সক্রিয়" },
    { key: "completed", label: "সম্পন্ন" },
    { key: "at_risk", label: "ঝুঁকিতে" },
  ]

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-[#D8EDDF]", text: "text-[#1B4332]", label: "সক্রিয়" },
    new: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", label: "নতুন" },
    completed: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", label: "সম্পন্ন" },
    at_risk: { bg: "bg-red-50", text: "text-red-500", label: "ঝুঁকিতে" },
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-12 pb-5">
        <h1 className="font-display text-2xl font-bold text-white mb-3">কাস্টমার সিআরএম</h1>
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
            className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-[#52B788] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border-b border-[#E9E5DC] px-4 py-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === t.key ? "bg-[#1B4332] text-white shadow-sm" : "text-[#6B6158] hover:bg-[#F7F5F0]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-1">
          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl">
              ⚠️ {error}
            </div>
          )}
          <p className="text-[#B0A99E] text-xs py-3">
            {loading ? "লোড হচ্ছে..." : `${customers.length} জন কাস্টমার পাওয়া গেছে`}
          </p>

          {loading ? (
            <div className="py-12 text-center text-[#6B6158] text-sm">
              <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
              <p>কাস্টমার তালিকা প্রস্তুত হচ্ছে...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 card-shadow text-center">
              <p className="text-sm font-bold text-[#1A1916]">কোনো কাস্টমার পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customers.map((customer) => {
                const badge = statusBadge[customer.status] || statusBadge.active
                const pct = target ? Math.min(100, (customer.stamps / target) * 100) : 0

                return (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="bg-white rounded-2xl card-shadow p-4 cursor-pointer hover:border-[#1B4332]/30 border border-transparent transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F0F7F2] flex items-center justify-center font-display font-black text-[#1B4332] text-lg flex-shrink-0">
                        {customer.name?.slice(0, 1) || "ক"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-display font-bold text-[#1A1916] truncate">{customer.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[#B0A99E] text-xs font-mono">{customer.phone}</p>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="text-center">
                            <p className="font-display font-bold text-[#1B4332] text-base leading-none">
                              {customer.stamps}{target ? `/${target}` : ""}
                            </p>
                            <p className="text-[#B0A99E] text-[10px] mt-0.5">বর্তমান সিল</p>
                          </div>
                          <div className="text-center">
                            <p className="font-display font-bold text-[#1A1916] text-base leading-none">
                              {customer.totalVisits}
                            </p>
                            <p className="text-[#B0A99E] text-[10px] mt-0.5">মোট ভিজিট</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#B0A99E] text-[10px]">অগ্রগতি</span>
                              <span className="text-[#B0A99E] text-[10px]">{customer.lastVisit}</span>
                            </div>
                            <div className="h-1.5 bg-[#F0EDE6] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1B4332] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRightIcon size={16} className="text-[#B0A99E] flex-shrink-0 mt-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PDPA Compliant CSV Export Box (PRD E6.2) */}
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-[#F0F7F2] border border-[#52B788]/30 flex items-center justify-between shadow-sm">
          <div>
            <p className="font-bold text-[#1B4332] text-sm flex items-center gap-1.5">
              <DownloadIcon size={15} /> PDPA সম্মত CSV এক্সপোর্ট
            </p>
            <p className="text-[#6B6158] text-xs mt-0.5">কাস্টমার তালিকা সরাসরি স্প্রেডশিটে ডাউনলোড করুন</p>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-bold hover:bg-[#143427] transition-all"
          >
            এক্সপোর্ট
          </button>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F0F7F2] flex items-center justify-center font-display font-black text-[#1B4332] text-xl">
                  {selectedCustomer.name?.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#1A1916]">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#6B6158] font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#F7F5F0] p-3 rounded-2xl mb-4 text-center">
              <div>
                <p className="font-display font-black text-[#1B4332] text-xl">
                  {selectedCustomer.stamps}{target ? `/${target}` : ""}
                </p>
                <p className="text-[10px] text-[#6B6158]">বর্তমান সিল</p>
              </div>
              <div>
                <p className="font-display font-black text-[#1A1916] text-xl">{selectedCustomer.totalVisits}</p>
                <p className="text-[10px] text-[#6B6158]">মোট ভিজিট</p>
              </div>
              <div>
                <p className="font-display font-black text-[#B45309] text-xl">
                  {selectedCustomer.status === "completed" ? "১" : "০"}
                </p>
                <p className="text-[10px] text-[#6B6158]">প্রস্তুত পুরস্কার</p>
              </div>
            </div>

            <h4 className="font-bold text-[#1A1916] text-sm mb-2">সিল অর্জনের অডিট ট্রেইল:</h4>
            <div className="space-y-2 mb-6">
              {selectedCustomer.history && selectedCustomer.history.length > 0 ? (
                selectedCustomer.history.map((h, idx) => (
                  <div key={idx} className="bg-[#F7F5F0] p-3 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#1B4332]">সিল #{h.stampNo}</p>
                      <p className="text-[#6B6158] text-[10px]">{h.date} · {h.time}</p>
                    </div>
                    <span className="bg-white px-2 py-1 rounded text-[10px] font-mono text-gray-600">
                      স্টাফ: {h.staffId}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#B0A99E] py-2">কোনো বিস্তারিত হিস্টোরি সংরক্ষিত নেই</p>
              )}
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full py-3 bg-[#1B4332] text-white font-bold rounded-xl text-sm"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* PDPA Export Confirmation Modal (PRD E6.2, §12.1) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full card-shadow-md animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center mx-auto mb-3 text-2xl">
              📋
            </div>
            <h3 className="font-display font-black text-xl text-[#1A1916] text-center mb-1">
              কাস্টমার ডেটা এক্সপোর্ট
            </h3>
            <p className="text-xs text-[#6B6158] text-center mb-4 leading-relaxed">
              বাংলাদেশ ব্যক্তিগত তথ্য সুরক্ষা আইন ২০২৬ (PDPA) ও সিলসিলা পলিসি অনুযায়ী কাস্টমারদের ফোন নম্বর ও ইতিহাস শুধুমাত্র আপনার নিজস্ব দোকানের যোগাযোগের কাজে ব্যবহারযোগ্য।
            </p>

            <label className="flex items-start gap-2 mb-6 cursor-pointer text-xs text-[#1A1916] bg-[#F7F5F0] p-3 rounded-xl border border-[#E9E5DC]">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-[#1B4332] focus:ring-0"
              />
              <span className="font-medium">
                আমি স্বীকার করছি যে এই গ্রাহক ডেটা তৃতীয় পক্ষের কাছে বিক্রয় বা অননুমোদিত শেয়ার করা হবে না।
              </span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 bg-[#F0EDE6] text-[#6B6158] rounded-xl text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={handleExportCsv}
                disabled={!consentAcknowledged || exporting}
                className="flex-1 py-3 bg-[#1B4332] text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                {exporting ? "ডাউনলোড হচ্ছে..." : "CSV ডাউনলোড"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
