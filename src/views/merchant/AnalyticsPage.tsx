import { useState, useEffect } from "react"
import { api, type MerchantStats, type MerchantCustomer, emptyMerchantStats } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import {
  TrendingUpIcon,
  UsersIcon,
  GiftIcon,
  BarChartIcon,
  RefreshIcon,
  TrophyIcon,
  MedalIcon,
  CheckIcon,
} from "../../components/Icons"
import { firebaseService } from "../../services/firebaseService"

interface AnalyticsPageProps {
  activeMerchantId?: string
}

export default function AnalyticsPage({ activeMerchantId }: AnalyticsPageProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()
  const merchantId =
    activeMerchantId || profile?.merchantId || (profile?.role === "merchant" ? profile?.id : "") || ""
  const [stats, setStats] = useState<MerchantStats>(emptyMerchantStats)
  const [topCustomers, setTopCustomers] = useState<MerchantCustomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (merchantId) loadAnalytics()
  }, [merchantId])

  async function loadAnalytics() {
    try {
      setLoading(true)
      const [apiStats, fbStats, apiCust, fbCust] = await Promise.all([
        api.getMerchantStats(merchantId).catch(() => null),
        firebaseService.getMerchantStats(merchantId).catch(() => null),
        api.getCrmCustomers(merchantId, "all").catch(() => []),
        firebaseService.getMerchantCustomers(merchantId, "all").catch(() => []),
      ])

      const mergedStats = fbStats || apiStats || emptyMerchantStats

      const map = new Map<string, MerchantCustomer>()
      apiCust.forEach((c: any) => map.set(c.id, c))
      fbCust.forEach((c: any) => map.set(c.id, { ...map.get(c.id), ...c }))
      const allCustomers = Array.from(map.values())

      setStats(mergedStats as any)
      if (allCustomers && allCustomers.length > 0) {
        const sorted = [...allCustomers]
          .sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0))
          .slice(0, 5)
        setTopCustomers(sorted)
      }
    } catch (err) {
      console.warn("Failed to load analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  const weeklyData = stats.dailyTrends || []
  const maxStamps = Math.max(...weeklyData.map((d) => d.stamps), 1)

  const retentionData =
    stats.retentionFunnel && stats.retentionFunnel.length > 0
      ? stats.retentionFunnel.map((row) => ({
          label:
            row.visit === 0
              ? isBn
                ? "কার্ড সম্পন্ন (পুরস্কার)"
                : "Card Completed (Reward)"
              : row.visit === 1
              ? isBn
                ? "১ম ভিজিট (অনবোর্ড)"
                : "1st Visit (Onboarded)"
              : isBn
              ? `${row.visit}য় ভিজিট`
              : `Visit #${row.visit}`,
          value: row.customers,
          pct: row.pct,
        }))
      : []

  const hourlyData = stats.hourlyDistribution || []
  const maxHourly = Math.max(...hourlyData.map((h) => h.stamps), 1)
  const hasNoData = !loading && stats.uniqueCustomers === 0 && stats.scansToday === 0

  return (
    <div className="flex flex-col h-full bg-transparent w-full">
      {/* Header */}
      <div className="px-3.5 pt-4 pb-3 w-full">
        <h1 className="font-display text-xl font-black text-white mb-0.5 drop-shadow-xs">
          {isBn ? "রিপোর্ট ও পরিসংখ্যান" : "Analytics & Reports"}
        </h1>
        <p className="text-[#34D399] text-xs font-semibold">
          {isBn ? "লাইভ মেট্রিক্স ও পারফরম্যান্স ডেটা" : "Live metrics & performance data"}
        </p>

        {/* 4-Stat tiles */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          {[
            {
              label: isBn ? "আজকের মোট স্ক্যান" : "Today's Scans",
              value: stats.scansToday,
              icon: <TrendingUpIcon size={14} />,
              change: stats.weeklyChange
                ? `+${stats.weeklyChange}% ${isBn ? "এই সপ্তাহে" : "this week"}`
                : isBn
                ? "আজকের কাউন্টার"
                : "Today at counter",
              up: stats.weeklyChange >= 0,
            },
            {
              label: isBn ? "ইউনিক কাস্টমার" : "Unique Customers",
              value: stats.uniqueCustomers,
              icon: <UsersIcon size={14} />,
              change: stats.newThisWeek
                ? `+${stats.newThisWeek} ${isBn ? "নতুন" : "new"}`
                : isBn
                ? "মোট নিবন্ধিত"
                : "Total registered",
              up: true,
            },
            {
              label: isBn ? "রিপিট রেট" : "Repeat Rate",
              value: stats.repeatRate + "%",
              icon: <TrendingUpIcon size={14} />,
              change: isBn ? "পুনরাবৃত্তি গ্রাহক" : "Returning customers",
              up: true,
            },
            {
              label: isBn ? "পুরস্কার রিডিম" : "Rewards Redeemed",
              value: stats.rewardsRedeemed,
              icon: <GiftIcon size={14} />,
              change: isBn ? "রিওয়ার্ড সম্পন্ন" : "Completed rewards",
              up: true,
            },
          ].map((s) => (
            <div key={s.label} className="bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3 shadow-lg">
              <div className="flex items-center gap-1.5 text-white/60 mb-1">
                {s.icon}
                <p className="text-white/60 text-[11px] font-medium">{s.label}</p>
              </div>
              <p className="font-display font-black text-white text-xl mt-0.5">{s.value}</p>
              <p className={"text-[11px] mt-0.5 font-bold " + (s.up ? "text-[#34D399]" : "text-red-400")}>
                {s.change}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-20 pt-2 space-y-3.5 w-full">
        {loading && (
          <div className="py-6 text-center text-xs text-white/70 flex items-center justify-center gap-2">
            <RefreshIcon size={16} className="animate-spin text-[#34D399]" />
            <span>{isBn ? "ডেটা লোড হচ্ছে..." : "Loading data..."}</span>
          </div>
        )}

        {!loading && hasNoData && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-8 text-center border border-emerald-500/20 shadow-2xl mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-3 text-[#34D399]">
              <BarChartIcon size={28} />
            </div>
            <p className="font-display font-bold text-white text-lg">
              {isBn ? "এখনো কোনো ডেটা নেই" : "No Data Yet"}
            </p>
            <p className="text-white/60 text-xs mt-2">
              {isBn
                ? "কাস্টমাররা আপনার QR কোড স্ক্যান করলে এখানে রিপোর্ট দেখা যাবে।"
                : "Reports will appear here once customers start scanning your QR code."}
            </p>
          </div>
        )}

        {/* Weekly Scan Trend */}
        {weeklyData.length > 0 && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChartIcon size={18} className="text-[#34D399]" />
                <h2 className="font-display font-bold text-white text-base">
                  {isBn ? "সাপ্তাহিক সিল ট্রেন্ড" : "Weekly Stamp Trend"}
                </h2>
              </div>
              <span className="text-white/40 text-xs">{isBn ? "গত ৭ দিন" : "Past 7 days"}</span>
            </div>
            <div className="flex items-end gap-1.5 h-32">
              {weeklyData.map((d, i) => (
                <div key={d.day || i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: "96px" }}>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#047857] to-[#34D399] transition-all duration-500 shadow-sm"
                      style={{ height: ((d.stamps / maxStamps) * 96) + "px", minHeight: "6px" }}
                    />
                  </div>
                  <p className="text-white/50 text-[10px]">{d.day}</p>
                  <p className="font-display font-black text-[#34D399] text-xs">{d.stamps}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/70">
              <span>
                {isBn ? "মোট: " : "Total: "}
                <strong className="text-[#34D399]">{stats.stampsThisWeek}</strong>{" "}
                {isBn ? "সিল এই সপ্তাহে" : "stamps this week"}
              </span>
              <span>
                {isBn ? "গড়: " : "Avg: "}
                <strong className="text-[#34D399]">
                  {weeklyData.length > 0
                    ? (weeklyData.reduce((s, d) => s + d.stamps, 0) / weeklyData.length).toFixed(1)
                    : 0}
                </strong>
                {isBn ? "/দিন" : "/day"}
              </span>
            </div>
          </div>
        )}

        {/* Retention Funnel */}
        {retentionData.length > 0 && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20 text-white">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUpIcon size={18} className="text-[#34D399]" />
              <h2 className="font-display font-bold text-white text-base">
                {isBn ? "কাস্টমার রিটেনশন ফানেল" : "Customer Retention Funnel"}
              </h2>
            </div>
            <p className="text-white/60 text-xs mb-4">
              {isBn
                ? "কত শতাংশ কাস্টমার পরবর্তী ভিজিটে ফিরে আসছেন"
                : "Percentage of customers returning on subsequent visits"}
            </p>
            <div className="space-y-3">
              {retentionData.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{d.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-[#34D399]">
                        {d.value} {isBn ? "জন" : "users"}
                      </span>
                      <span className="text-white/40 text-xs">({d.pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#071D13] rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: d.pct + "%",
                        background:
                          i === 0
                            ? "#10B981"
                            : i === 1
                            ? "#34D399"
                            : i === 2
                            ? "#52B788"
                            : i === 3
                            ? "#86EFAC"
                            : "#F59E0B",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-[#071D13] rounded-2xl border border-emerald-500/20 flex items-center gap-2">
              <CheckIcon size={14} className="text-[#34D399] flex-shrink-0" />
              <p className="text-[#34D399] text-xs font-bold">
                {isBn
                  ? `${stats.repeatRate}% কাস্টমার দ্বিতীয়বার আসছেন`
                  : `${stats.repeatRate}% customers return for a 2nd visit`}
              </p>
            </div>
          </div>
        )}

        {/* Top Loyal Customers */}
        {topCustomers.length > 0 && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-emerald-500/20 text-white">
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon size={18} className="text-[#F59E0B]" />
              <h2 className="font-display font-bold text-white text-base">
                {isBn ? "শীর্ষ বিশ্বস্ত কাস্টমার" : "Top Loyal Customers"}
              </h2>
            </div>
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                return (
                  <div key={c.id || i} className="flex items-center gap-3 p-2 rounded-2xl bg-[#071D13] border border-white/10">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 bg-white/10">
                      {i === 0 ? (
                        <TrophyIcon size={16} className="text-[#F59E0B]" />
                      ) : i === 1 ? (
                        <MedalIcon size={16} className="text-[#34D399]" />
                      ) : i === 2 ? (
                        <MedalIcon size={16} className="text-amber-400" />
                      ) : (
                        <span className="text-white/60 font-mono">{i + 1}</span>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center font-bold text-xs text-[#34D399]">
                      {c.name ? c.name.slice(0, 1) : (isBn ? "ক" : "C")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <p className="text-xs text-white/50">
                        {c.totalVisits || c.stamps} {isBn ? "বার মোট ভিজিট" : "total visits"}
                      </p>
                    </div>
                    <span className="text-xs bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30 px-2.5 py-1 rounded-full font-bold">
                      {c.stamps} {isBn ? "সিল" : "Stamps"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
