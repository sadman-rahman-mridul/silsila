import { useState, useEffect, useMemo } from "react"
import { api, type MerchantCustomer, type RewardProgram } from "../../services/api"
import { SearchIcon, ChevronRightIcon, DownloadIcon, CheckIcon } from "../../components/Icons"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"

type FilterTab = "all" | "active" | "completed" | "at_risk"

interface CustomersPageProps {
  merchantId?: string
}

export function formatMaskedPhone(phone?: string): string {
  if (!phone || phone === "—") return "—"
  const digits = phone.replace(/[^0-9]/g, "")
  if (digits.length < 6) return phone
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} •••• ${digits.slice(-4)}`
  }
  if (digits.length === 10) {
    return `0${digits.slice(0, 2)} •••• ${digits.slice(-4)}`
  }
  if (digits.length > 11) {
    return `${digits.slice(0, 4)} •••• ${digits.slice(-4)}`
  }
  return `${digits.slice(0, 3)} •••• ${digits.slice(-2)}`
}

export default function CustomersPage({ merchantId: propId }: CustomersPageProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()
  const merchantId = propId || profile?.merchantId || profile?.id || ""
  const [allCustomers, setAllCustomers] = useState<MerchantCustomer[]>([])
  const [filter, setFilter] = useState<FilterTab>("all")
  const [search, setSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<MerchantCustomer | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [consentAcknowledged, setConsentAcknowledged] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<number | null>(null)

  useEffect(() => {
    loadCustomers()
  }, [merchantId])

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
        api.getCrmCustomers(merchantId, "all").catch(() => []),
        firebaseService.getMerchantCustomers(merchantId, "all").catch(() => []),
      ])

      const map = new Map<string, any>()
      apiList.forEach((c: any) => map.set(c.id, c))
      fbList.forEach((c: any) => map.set(c.id, { ...map.get(c.id), ...c }))
      setAllCustomers(Array.from(map.values()))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter counts
  const counts = useMemo(() => {
    return {
      all: allCustomers.length,
      active: allCustomers.filter((c) => c.status === "active").length,
      completed: allCustomers.filter((c) => c.status === "completed").length,
      at_risk: allCustomers.filter((c) => c.status === "at_risk").length,
    }
  }, [allCustomers])

  // Instant real-time search & filter
  const customers = useMemo(() => {
    return allCustomers.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false

      if (search && search.trim()) {
        const query = search.toLowerCase().trim()
        const digits = query.replace(/[^0-9]/g, "")
        const matchesName = (c.name || "").toLowerCase().includes(query)
        const matchesRaw = c.rawPhone && c.rawPhone.includes(query)
        const matchesDigits = digits && c.rawPhone && c.rawPhone.includes(digits)
        const matchesPhone = (c.phone || "").toLowerCase().includes(query)
        return matchesName || matchesRaw || matchesDigits || matchesPhone
      }

      return true
    })
  }, [allCustomers, filter, search])

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

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: isBn ? "সব" : "All", count: counts.all },
    { key: "active", label: isBn ? "সক্রিয়" : "Active", count: counts.active },
    { key: "completed", label: isBn ? "সম্পন্ন" : "Completed", count: counts.completed },
    { key: "at_risk", label: isBn ? "ঝুঁকিতে" : "At Risk", count: counts.at_risk },
  ]

  const statusBadge: Record<string, { bg: string; dot: string; label: string }> = {
    active: {
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
      dot: "bg-emerald-500",
      label: isBn ? "সক্রিয়" : "Active",
    },
    new: {
      bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
      dot: "bg-blue-500",
      label: isBn ? "নতুন" : "New",
    },
    completed: {
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
      dot: "bg-amber-500",
      label: isBn ? "রিওয়ার্ড প্রস্তুত" : "Reward Ready",
    },
    at_risk: {
      bg: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
      dot: "bg-rose-500",
      label: isBn ? "ঝুঁকিতে" : "At Risk",
    },
  }

  const stampTarget = target || 5

  return (
    <div className="flex flex-col h-full bg-transparent w-full space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pt-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {isBn ? "কাস্টমার সিআরএম" : "Customer CRM"}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/70">
              {allCustomers.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
            {isBn ? "আপনার নিয়মিত ও নতুন গ্রাহকদের সংক্ষিপ্ত তালিকা" : "Manage customer loyalty and repeat visits"}
          </p>
        </div>

        <button
          onClick={() => setShowExportModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white/80 text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <DownloadIcon size={14} className="text-emerald-600 dark:text-[#34D399]" />
          <span>{isBn ? "CSV এক্সপোর্ট" : "Export CSV"}</span>
        </button>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isBn ? "নাম বা ফোন নম্বর দিয়ে খুঁজুন..." : "Search name or phone..."}
            className="w-full bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 text-xs outline-none focus:border-emerald-500 transition-colors shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 dark:bg-white/15 text-slate-600 dark:text-white/70 flex items-center justify-center text-[10px] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((t) => {
            const active = filter === t.key
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#064E3B] dark:bg-[#10B981] text-white dark:text-[#0A2318] shadow-xs font-semibold"
                    : "bg-white dark:bg-[#0E281C] text-slate-600 dark:text-white/70 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${active ? "bg-white/20 dark:bg-black/20" : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"}`}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs px-3.5 py-2.5 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* 3. CRM Data Table & Mobile List */}
      <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 bg-slate-200 dark:bg-white/10 rounded" />
                    <div className="w-20 h-2.5 bg-slate-100 dark:bg-white/5 rounded" />
                  </div>
                </div>
                <div className="w-16 h-3 bg-slate-200 dark:bg-white/10 rounded" />
                <div className="w-16 h-5 bg-slate-100 dark:bg-white/5 rounded-full" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 dark:text-white/40 text-xs">
              {isBn ? "কোনো কাস্টমার পাওয়া যায়নি" : "No customers found"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-black/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Stamps</th>
                    <th className="py-3 px-4">Visits</th>
                    <th className="py-3 px-4">Last Visit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {customers.map((c) => {
                    const badge = statusBadge[c.status] || statusBadge.active
                    const pct = Math.min(100, Math.round(((c.stamps || 0) / stampTarget) * 100))

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="hover:bg-slate-50/60 dark:hover:bg-white/5 cursor-pointer transition-colors group"
                      >
                        {/* Customer */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            {c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt={c.name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-white/10"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-[11px]">
                                {c.name?.slice(0, 1) || "C"}
                              </div>
                            )}
                            <span className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#34D399] transition-colors">
                              {c.name || "Customer"}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-white/70">
                          {formatMaskedPhone(c.rawPhone || c.phone)}
                        </td>

                        {/* Stamps / Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white font-mono">
                              {c.stamps}/{stampTarget}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Visits */}
                        <td className="py-3 px-4 text-slate-600 dark:text-white/70">
                          {c.totalVisits || 1} {isBn ? "বার" : "visits"}
                        </td>

                        {/* Last Visit */}
                        <td className="py-3 px-4 text-slate-500 dark:text-white/50 text-[11px]">
                          {c.lastVisit || "—"}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                          <ChevronRightIcon size={14} className="inline-block" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Clean List View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/5">
              {customers.map((c) => {
                const badge = statusBadge[c.status] || statusBadge.active
                const pct = Math.min(100, Math.round(((c.stamps || 0) / stampTarget) * 100))

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer active:bg-slate-100/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {c.avatarUrl ? (
                        <img
                          src={c.avatarUrl}
                          alt={c.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name?.slice(0, 1) || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {c.name || "Customer"}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 dark:text-white/50">
                          {formatMaskedPhone(c.rawPhone || c.phone)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-0.5">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {c.stamps}/{stampTarget}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${badge.bg}`}>
                            <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-white/40">
                          {c.lastVisit || `${c.totalVisits || 1} visits`}
                        </p>
                      </div>
                      <ChevronRightIcon size={14} className="text-slate-300 dark:text-white/30" />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Minimal Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/15 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl text-slate-900 dark:text-white space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                {selectedCustomer.avatarUrl ? (
                  <img
                    src={selectedCustomer.avatarUrl}
                    alt={selectedCustomer.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center font-bold text-sm">
                    {selectedCustomer.name?.slice(0, 1) || "C"}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-mono">
                    {formatMaskedPhone(selectedCustomer.rawPhone || selectedCustomer.phone)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/20 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-black/20 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
              <div>
                <p className="text-base font-bold text-emerald-600 dark:text-[#34D399]">
                  {selectedCustomer.stamps}/{stampTarget}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{isBn ? "স্ট্যাম্প" : "Stamps"}</p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-800 dark:text-white">
                  {selectedCustomer.totalVisits || 1}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{isBn ? "ভিজিট" : "Visits"}</p>
              </div>
              <div>
                <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                  {selectedCustomer.status === "completed" ? "1" : "0"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5">{isBn ? "ভাউচার" : "Vouchers"}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-white/70">{isBn ? "কার্ড অগ্রগতি" : "Card Progress"}</span>
                <span className="font-mono text-emerald-600 dark:text-[#34D399] font-bold">
                  {selectedCustomer.stamps} of {stampTarget}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((selectedCustomer.stamps || 0) / stampTarget) * 100)}%` }}
                />
              </div>
            </div>

            {/* Visit History Trail */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-white/80">
                {isBn ? "সাম্প্রতিক ইতিহাস" : "Recent History"}
              </h4>
              {selectedCustomer.history && selectedCustomer.history.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedCustomer.history.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-emerald-600 dark:text-[#34D399]">
                        Stamp #{h.stampNo}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-white/50 font-mono">
                        {h.date} {h.time && `· ${h.time}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-white/40 py-1">
                  {isBn ? "কোনো অতীত হিস্ট্রি রেকর্ড নেই" : "No recent activity recorded"}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* 5. Customer Data Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/15 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-900 dark:text-white space-y-4 animate-scale-up">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center mx-auto text-xl">
              <DownloadIcon size={20} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isBn ? "কাস্টমার ডেটা এক্সপোর্ট" : "Export Customer Data"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/60">
                {isBn
                  ? "আপনার নিজস্ব দোকানের গ্রাহক তালিকা CSV স্প্রেডশিট হিসেবে ডাউনলোড করুন।"
                  : "Download your store customer list as a CSV spreadsheet."}
              </p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span className="leading-snug">
                {isBn
                  ? "আমি নিশ্চিত করছি যে এই তথ্য শুধুমাত্র আমার ব্যবসার সরাসরি যোগাযোগের কাজে ব্যবহৃত হবে।"
                  : "I confirm this customer list will be used solely for my store's direct customer communications."}
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                onClick={handleExportCsv}
                disabled={!consentAcknowledged || exporting}
                className="flex-1 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold disabled:opacity-40 shadow-xs cursor-pointer transition-colors"
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

