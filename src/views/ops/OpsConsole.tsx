import { useState, useEffect } from "react"
import { api, type OpsMetrics } from "../../services/api"
import { categoryLabel } from "../../constants/categories"
import { CheckIcon, XIcon, SearchIcon, LogOutIcon, GlobeIcon } from "../../components/Icons"
import { useLanguage } from "../../context/LanguageContext"

type OpsTab = "merchants" | "fraud" | "cluster"

interface OpsConsoleProps {
  onBack: () => void
}

export default function OpsConsole({ onBack }: OpsConsoleProps) {
  const { isBn, toggleLanguage } = useLanguage()
  const [tab, setTab] = useState<OpsTab>("merchants")
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null)
  const [fraudSignals, setFraudSignals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [approvedMerchants, setApprovedMerchants] = useState<string[]>([])
  const [suspendedMerchants, setSuspendedMerchants] = useState<string[]>([])

  useEffect(() => {
    loadOpsData()
  }, [])

  async function loadOpsData() {
    try {
      setLoading(true)
      setError(null)
      const [data, signals] = await Promise.all([
        api.getOpsMetrics(),
        api.getOpsFraudSignals().catch(() => []),
      ])
      setMetrics(data)
      setFraudSignals(signals)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setApprovedMerchants((p) => [...p, id])
    try {
      await api.performOpsAction(id, "approve")
      await loadOpsData()
    } catch (err: any) {
      setApprovedMerchants((p) => p.filter((x) => x !== id))
      setError(err.message)
    }
  }

  async function handleSuspend(id: string) {
    setSuspendedMerchants((p) => [...p, id])
    try {
      await api.performOpsAction(id, "suspend")
      await loadOpsData()
    } catch (err: any) {
      setSuspendedMerchants((p) => p.filter((x) => x !== id))
      setError(err.message)
    }
  }

  const activeMerchants = (metrics?.merchants || []).filter(
    (m) =>
      !suspendedMerchants.includes(m.id) &&
      (search === "" || m.name.toLowerCase().includes(search.toLowerCase()) || m.area?.toLowerCase().includes(search.toLowerCase()))
  )

  const pendingMerchants = (metrics?.pending || []).filter((m) => !approvedMerchants.includes(m.id))

  const severityStyle: Record<string, { bg: string; text: string; dot: string }> = {
    critical: { bg: "bg-red-500/20", text: "text-red-400", dot: "bg-red-500" },
    warning: { bg: "bg-[#FEF3C7]/20", text: "text-[#F59E0B]", dot: "bg-[#F59E0B]" },
    info: { bg: "bg-[#EDE9FE]/20", text: "text-[#A78BFA]", dot: "bg-[#8B5CF6]" },
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-white">
      <div className="px-5 pt-12 pb-4 bg-[#0F1117] border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md">
              <span className="text-[#1B4332] font-black text-sm">{isBn ? "সি" : "S"}</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-none">
                {isBn ? "অপারেশনস কনসোল (Ops)" : "Operations Console (Ops)"}
              </h1>
              <p className="text-white/40 text-[11px] mt-0.5">Sealsela Network Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all cursor-pointer border border-white/15 flex items-center gap-1"
            >
              <GlobeIcon size={12} className="text-[#34D399]" />
              <span className="font-mono text-[10px] uppercase text-[#34D399]">{isBn ? "EN" : "বাং"}</span>
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/60 hover:text-white text-xs bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOutIcon size={13} /> {isBn ? "বের হন" : "Exit"}
            </button>
          </div>
        </div>

        {/* Network-wide KPI cards, computed from live merchant activity */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            {
              label: isBn ? "মোট মার্চেন্ট" : "Total Merchants",
              value: metrics?.clusterStats.total ?? 0,
              sub: isBn ? "অনবোর্ডেড" : "Onboarded",
            },
            {
              label: isBn ? "সাপ্তাহিক সিল" : "Weekly Stamps",
              value: metrics?.clusterStats.totalStampsWeek ?? 0,
              sub: isBn ? "গত ৭ দিন" : "Past 7 days",
            },
            {
              label: isBn ? "ইউনিক কাস্টমার" : "Unique Users",
              value: metrics?.clusterStats.uniqueCustomersCluster ?? 0,
              sub: isBn ? "সর্বমোট" : "Total",
            },
            {
              label: isBn ? "গড় রিপিট রেট" : "Avg Repeat Rate",
              value: `${metrics?.clusterStats.avgRepeatRate ?? 0}%`,
              sub: isBn ? "৩০ দিনে" : "30 days",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
              <p className="font-display font-black text-[#F59E0B] text-xl leading-none">{s.value}</p>
              <p className="text-white/60 text-[10px] mt-1 font-medium">{s.label}</p>
              <p className="text-white/30 text-[9px]">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-1">
          {(["merchants", "fraud", "cluster"] as OpsTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === t ? "bg-[#F59E0B] text-[#1B4332] shadow-sm" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {t === "merchants"
                ? isBn ? "মার্চেন্ট নেটওয়ার্ক" : "Merchant Network"
                : t === "fraud"
                ? isBn ? "ফ্রড ও রিস্ক সিগনাল" : "Fraud & Risk Signals"
                : isBn ? "ক্লাস্টার এনালাইসিস" : "Cluster Analysis"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {error && (
          <div className="mx-4 mt-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-2xl">
            ⚠️ {error}
          </div>
        )}
        {loading && (
          <div className="p-6 text-center text-xs text-white/50">
            <span className="inline-block animate-spin mr-1">⏳</span>{" "}
            {isBn ? "মেট্রিক্স রিফ্রেশ হচ্ছে..." : "Refreshing metrics..."}
          </div>
        )}

        {tab === "merchants" && (
          <div className="px-4 pt-4 space-y-4">
            {pendingMerchants.length > 0 && (
              <div>
                <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  {isBn ? `অনুমোদনের অপেক্ষায় (${pendingMerchants.length})` : `Pending Approvals (${pendingMerchants.length})`}
                </h2>
                <div className="space-y-2">
                  {pendingMerchants.map((m) => (
                    <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-display font-bold text-white text-base">{m.name}</p>
                          <p className="text-white/60 text-xs mt-0.5">{m.owner} · {m.phone}</p>
                          <p className="text-white/40 text-[11px] mt-0.5">
                            {[categoryLabel(m.category), m.area].filter(Boolean).join(" · ")}
                            {m.submittedAt ? ` · ${new Date(m.submittedAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSuspend(m.id)}
                          className="flex-1 py-2 rounded-xl border border-white/10 text-white/60 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                        >
                          <XIcon size={14} /> {isBn ? "প্রত্যাখ্যান" : "Reject"}
                        </button>
                        <button
                          onClick={() => handleApprove(m.id)}
                          className="flex-[2] py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#2D6A4F] cursor-pointer"
                        >
                          <CheckIcon size={14} /> {isBn ? "অনুমোদন দিন" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider flex-1">
                  {isBn ? "সক্রিয় মার্চেন্ট তালিকা" : "Active Merchant List"}
                </h2>
                <div className="relative">
                  <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isBn ? "খুঁজুন..." : "Search..."}
                    className="bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-white text-xs outline-none w-32 focus:border-white/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {activeMerchants.map((m) => {
                  const statusColor = m.status === "active" ? "text-[#52B788]" : m.status === "at_risk" ? "text-[#F59E0B]" : "text-red-400"
                  return (
                    <div key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-3.5 hover:border-white/20 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-white text-sm">{m.name}</p>
                            <span className={`text-[11px] font-semibold ${statusColor}`}>
                              {m.status === "active"
                                ? isBn ? "● সক্রিয়" : "● Active"
                                : m.status === "at_risk"
                                ? isBn ? "● ঝুঁকিতে" : "● At Risk"
                                : isBn ? "● নিষ্ক্রিয়" : "● Inactive"}
                            </span>
                          </div>
                          <p className="text-white/40 text-xs">
                            {m.area || "—"} · {isBn ? "শেষ সিল: " : "Last stamp: "}
                            {m.lastStamp ? new Date(m.lastStamp).toLocaleDateString() : (isBn ? "কখনো নয়" : "Never")}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <span className="font-display font-black text-[#F59E0B] text-sm">{m.stampsWeek}</span>
                              <span className="text-white/40 text-xs">{isBn ? " সিল/সপ্তাহ" : " stamps/wk"}</span>
                            </div>
                            <div>
                              <span className="font-display font-black text-white text-sm">{m.customers}</span>
                              <span className="text-white/40 text-xs">{isBn ? " কাস্টমার" : " customers"}</span>
                            </div>
                            <div>
                              <span className={`font-display font-black text-sm ${m.repeatRate >= 50 ? "text-[#52B788]" : "text-[#F59E0B]"}`}>
                                {m.repeatRate}%
                              </span>
                              <span className="text-white/40 text-xs">{isBn ? " রিপিট" : " repeat"}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSuspend(m.id)}
                          className="px-2.5 py-1 rounded-lg border border-white/10 text-white/40 text-xs hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                        >
                          {isBn ? "স্থগিত" : "Suspend"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "fraud" && (
          <div className="px-4 pt-4">
            <p className="text-white/40 text-xs mb-3">স্বয়ংক্রিয় অ্যান্টি-ফ্রড অ্যালগরিদম সিগনাল</p>
            {fraudSignals.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <p className="text-white/60 text-sm font-bold">কোনো ফ্রড সিগনাল নেই</p>
                <p className="text-white/30 text-xs mt-1">সন্দেহজনক স্ক্যান শনাক্ত হলে এখানে দেখা যাবে</p>
              </div>
            )}
            <div className="space-y-3">
              {fraudSignals.map((signal, i) => {
                const s = severityStyle[signal.severity] || severityStyle.info
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-4 border ${signal.severity === "critical" ? "border-red-500/20" : signal.severity === "warning" ? "border-[#F59E0B]/20" : "border-purple-500/20"} bg-white/5`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">{signal.merchantName}</p>
                        <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{signal.signal}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.bg} ${s.text} font-bold`}>
                            {signal.severity === "critical" ? "গুরুতর" : signal.severity === "warning" ? "সতর্কতা" : "তথ্য"}
                          </span>
                          <span className="text-white/30 text-[10px]">{signal.timestamp}</span>
                          <span className="text-white/30 text-[10px]">রেকর্ড: {signal.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === "cluster" && (
          <div className="px-4 pt-4 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-bold text-white text-sm mb-1">নেটওয়ার্ক সারাংশ</h3>
              <p className="text-white/50 text-xs mb-4">
                সিলসিলায় নিবন্ধিত সব মার্চেন্টের বর্তমান অবস্থা
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "সক্রিয়", value: metrics?.clusterStats.active ?? 0, color: "text-[#52B788]" },
                  { label: "ঝুঁকিতে", value: metrics?.clusterStats.atRisk ?? 0, color: "text-[#F59E0B]" },
                  { label: "নিষ্ক্রিয় / স্থগিত", value: metrics?.clusterStats.inactive ?? 0, color: "text-red-400" },
                  { label: "মোট অনবোর্ডেড", value: metrics?.clusterStats.total ?? 0, color: "text-white" },
                ].map((row) => (
                  <div key={row.label} className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/50 text-xs">{row.label}</p>
                    <p className={`font-display font-black text-2xl mt-0.5 ${row.color}`}>{row.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
