import { useState, useEffect } from "react"
import { api, type MerchantCustomer, type RewardProgram } from "../../services/api"
import { SearchIcon, ChevronRightIcon, DownloadIcon } from "../../components/Icons"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"

type FilterTab = "all" | "active" | "completed" | "at_risk"

interface CustomersPageProps {
  merchantId?: string
}

export default function CustomersPage({ merchantId: propId }: CustomersPageProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()
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

  function handleExportCsv() {
    if (customers.length === 0) {
      alert(isBn ? "এক্সপোর্ট করার জন্য কোনো কাস্টমার নেই।" : "No customers to export.")
      return
    }
    setExporting(true)
    try {
      const headers = ["Customer Name", "Phone Number", "Current Stamps", "Total Visits", "Status", "Last Visit"]
      const rows = customers.map((c) => [
        `"${(c.name || "Customer").replace(/"/g, '""')}"`,
        `"${c.rawPhone || c.phone || ""}"`,
        c.stamps ?? 0,
        c.totalVisits ?? 1,
        `"${c.status || "active"}"`,
        `"${c.lastVisit || ""}"`,
      ])

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `silsila_customers_${merchantId || "export"}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setShowExportModal(false)
    } catch (err: any) {
      console.error("Export error:", err)
      setError(err?.message || (isBn ? "CSV এক্সপোর্ট ব্যর্থ হয়েছে" : "CSV export failed"))
    } finally {
      setExporting(false)
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: isBn ? "সব" : "All" },
    { key: "active", label: isBn ? "সক্রিয়" : "Active" },
    { key: "completed", label: isBn ? "সম্পন্ন" : "Completed" },
    { key: "at_risk", label: isBn ? "ঝুঁকিতে" : "At Risk" },
  ]

  const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "bg-[#D8EDDF]", text: "text-[#1B4332]", label: isBn ? "সক্রিয়" : "Active" },
    new: { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]", label: isBn ? "নতুন" : "New" },
    completed: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", label: isBn ? "সম্পন্ন" : "Completed" },
    at_risk: { bg: "bg-red-500/20", text: "text-red-300", label: isBn ? "ঝুঁকিতে" : "At Risk" },
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-5 pt-4 pb-3">
        <h1 className="font-display text-xl font-black text-white mb-2.5 drop-shadow-xs">
          {isBn ? "কাস্টমার সিআরএম" : "Customer CRM"}
        </h1>
        <div className="relative">
          <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? "নাম বা মোবাইল নম্বর খুঁজুন..." : "Search name or phone number..."}
            className="w-full bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder-white/40 text-sm outline-none focus:border-[#34D399] transition-colors shadow-lg"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/60 text-xs hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filter === t.key
                  ? "bg-[#34D399] text-[#0A2318] shadow-md glow-emerald"
                  : "bg-[#0E281C]/70 backdrop-blur-md text-white/70 border border-white/10 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-2">
        <div>
          {error && (
            <div className="mb-3 bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-4 py-3 rounded-2xl backdrop-blur-md">
              ⚠️ {error}
            </div>
          )}
          <p className="text-white/50 text-xs py-2 font-medium">
            {loading
              ? isBn
                ? "লোড হচ্ছে..."
                : "Loading..."
              : isBn
              ? `${customers.length} জন কাস্টমার পাওয়া গেছে`
              : `${customers.length} customers found`}
          </p>

          {loading ? (
            <div className="py-12 text-center text-white/70 text-sm">
              <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
              <p>{isBn ? "কাস্টমার তালিকা প্রস্তুত হচ্ছে..." : "Preparing customer list..."}</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center border border-emerald-500/20">
              <p className="text-sm font-bold text-white">{isBn ? "কোনো কাস্টমার পাওয়া যায়নি" : "No customers found"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => {
                const badge = statusBadge[customer.status] || statusBadge.active
                const totalCups = target || 5

                return (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-4 shadow-2xl cursor-pointer hover:border-emerald-400/40 border border-white/10 transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 flex items-center justify-center font-display font-black text-lg flex-shrink-0 shadow-sm">
                        {customer.name?.slice(0, 1) || (isBn ? "ক" : "C")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-display font-bold text-white truncate">{customer.name}</p>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 border border-white/10 ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-white/50 text-xs font-mono">{customer.phone}</p>

                        <div className="flex items-center gap-4 mt-2.5">
                          <div className="text-center">
                            <p className="font-display font-bold text-[#34D399] text-base leading-none">
                              {customer.stamps}{target ? `/${target}` : ""}
                            </p>
                            <p className="text-white/40 text-[10px] mt-0.5 font-medium">{isBn ? "সিল" : "Stamps"}</p>
                          </div>
                          <div className="text-center">
                            <p className="font-display font-bold text-white text-base leading-none">
                              {customer.totalVisits}
                            </p>
                            <p className="text-white/40 text-[10px] mt-0.5 font-medium">{isBn ? "ভিজিট" : "Visits"}</p>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#34D399] font-bold text-[10px]">{isBn ? "অগ্রগতি" : "Progress"}</span>
                              <span className="text-white/40 text-[10px]">{customer.lastVisit}</span>
                            </div>
                            {/* Coffee Cup Progress Animation */}
                            <div className="flex items-center gap-1 bg-[#071D13] px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                              {Array.from({ length: totalCups }).map((_, i) => {
                                const isFilled = i < customer.stamps
                                return (
                                  <span
                                    key={i}
                                    className={`text-sm transition-all duration-300 ${
                                      isFilled
                                        ? "opacity-100 scale-110 drop-shadow-xs"
                                        : "opacity-25 grayscale"
                                    }`}
                                    title={`Cup ${i + 1}`}
                                  >
                                    ☕
                                  </span>
                                )
                              })}
                              <span className="text-[10px] font-black text-[#34D399] ml-auto font-mono">
                                {customer.stamps}/{totalCups}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRightIcon size={16} className="text-white/30 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PDPA Compliant CSV Export Box */}
        <div className="mt-4 p-4 rounded-3xl bg-[#0E281C]/85 backdrop-blur-xl border border-emerald-500/20 flex items-center justify-between shadow-2xl">
          <div>
            <p className="font-bold text-white text-sm flex items-center gap-1.5">
              <DownloadIcon size={15} className="text-[#34D399]" /> {isBn ? "PDPA সম্মত CSV এক্সপোর্ট" : "PDPA Compliant CSV Export"}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              {isBn ? "কাস্টমার তালিকা সরাসরি স্প্রেডশিটে ডাউনলোড করুন" : "Download your customer list directly as a spreadsheet"}
            </p>
          </div>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-105 text-[#0A2318] text-xs font-black shadow-md glow-emerald cursor-pointer transition-all active:scale-95"
          >
            {isBn ? "এক্সপোর্ট" : "Export"}
          </button>
        </div>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0E281C] border border-emerald-500/30 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center font-display font-black text-[#34D399] text-xl shadow-md">
                  {selectedCustomer.name?.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-white">{selectedCustomer.name}</h3>
                  <p className="text-xs text-white/50 font-mono">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 font-bold hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#071D13] p-3.5 rounded-2xl mb-3 text-center border border-white/10">
              <div>
                <p className="font-display font-black text-[#34D399] text-xl">
                  {selectedCustomer.stamps}{target ? `/${target}` : ""}
                </p>
                <p className="text-[10px] text-white/50">{isBn ? "বর্তমান সিল" : "Current Stamps"}</p>
              </div>
              <div>
                <p className="font-display font-black text-white text-xl">{selectedCustomer.totalVisits}</p>
                <p className="text-[10px] text-white/50">{isBn ? "মোট ভিজিট" : "Total Visits"}</p>
              </div>
              <div>
                <p className="font-display font-black text-[#F59E0B] text-xl">
                  {selectedCustomer.status === "completed" ? "১" : "০"}
                </p>
                <p className="text-[10px] text-white/50">{isBn ? "প্রস্তুত পুরস্কার" : "Ready Rewards"}</p>
              </div>
            </div>

            {/* Coffee Cups Progress in Modal */}
            <div className="bg-[#071D13] border border-emerald-500/20 rounded-2xl p-3.5 mb-4 text-center">
              <p className="text-xs font-bold text-[#34D399] mb-2">
                {isBn
                  ? `কফি কাপ অগ্রগতি (${selectedCustomer.stamps}/${target || 5} কাপ সম্পন্ন)`
                  : `Coffee Cup Progress (${selectedCustomer.stamps}/${target || 5} cups completed)`}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {Array.from({ length: target || 5 }).map((_, i) => {
                  const isFilled = i < selectedCustomer.stamps
                  return (
                    <div
                      key={i}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-300 ${
                        isFilled
                          ? "bg-[#10B981]/30 border border-[#34D399] shadow-sm scale-105"
                          : "bg-white/5 border border-white/10 opacity-30 grayscale"
                      }`}
                    >
                      ☕
                    </div>
                  )
                })}
              </div>
            </div>

            <h4 className="font-bold text-white text-sm mb-2">
              {isBn ? "সিল অর্জনের অডিট ট্রেইল:" : "Stamp Audit Trail:"}
            </h4>
            <div className="space-y-2 mb-6">
              {selectedCustomer.history && selectedCustomer.history.length > 0 ? (
                selectedCustomer.history.map((h, idx) => (
                  <div key={idx} className="bg-[#071D13] border border-white/10 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#34D399]">
                        {isBn ? `সিল #${h.stampNo}` : `Stamp #${h.stampNo}`}
                      </p>
                      <p className="text-white/50 text-[10px]">{h.date} · {h.time}</p>
                    </div>
                    <span className="bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-mono text-white/70">
                      {isBn ? "স্টাফ: " : "Staff: "}{h.staffId}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-white/40 py-2">
                  {isBn ? "কোনো বিস্তারিত হিস্টোরি সংরক্ষিত নেই" : "No detailed history recorded"}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full py-3 bg-[#34D399] text-[#0A2318] font-black rounded-2xl text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* PDPA Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0E281C] border border-emerald-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-slide-up text-white">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#0A2318] flex items-center justify-center mx-auto mb-3 text-2xl shadow-md">
              📋
            </div>
            <h3 className="font-display font-black text-xl text-white text-center mb-1">
              {isBn ? "কাস্টমার ডেটা এক্সপোর্ট" : "Export Customer Data"}
            </h3>
            <p className="text-xs text-white/60 text-center mb-4 leading-relaxed">
              {isBn
                ? "বাংলাদেশ ব্যক্তিগত তথ্য সুরক্ষা আইন ২০২৬ (PDPA) ও সিলসিলা পলিসি অনুযায়ী কাস্টমারদের ফোন নম্বর ও ইতিহাস শুধুমাত্র আপনার নিজস্ব দোকানের যোগাযোগের কাজে ব্যবহারযোগ্য।"
                : "Under Data Privacy regulations and Silsila policy, customer information may only be used for your store's direct business communications."}
            </p>

            <label className="flex items-start gap-2 mb-6 cursor-pointer text-xs text-white/80 bg-[#071D13] p-3 rounded-2xl border border-white/10">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-[#34D399] focus:ring-0"
              />
              <span className="font-medium">
                {isBn
                  ? "আমি স্বীকার করছি যে এই গ্রাহক ডেটা তৃতীয় পক্ষের কাছে বিক্রয় বা অননুমোদিত শেয়ার করা হবে না।"
                  : "I acknowledge that this customer data will not be sold or shared with unauthorized third parties."}
              </span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-bold cursor-pointer"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                onClick={handleExportCsv}
                disabled={!consentAcknowledged || exporting}
                className="flex-1 py-3 bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] rounded-2xl text-xs font-black disabled:opacity-40 shadow-md glow-emerald cursor-pointer"
              >
                {exporting ? (isBn ? "ডাউনলোড হচ্ছে..." : "Downloading...") : (isBn ? "CSV ডাউনলোড" : "Download CSV")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
