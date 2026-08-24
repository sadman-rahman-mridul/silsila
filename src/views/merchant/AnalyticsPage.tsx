import { useState, useEffect } from "react"
import { api, type MerchantStats, type MerchantCustomer, emptyMerchantStats } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { TrendingUpIcon, UsersIcon, GiftIcon } from "../../components/Icons"

interface AnalyticsPageProps {
  activeMerchantId?: string
}

export default function AnalyticsPage({ activeMerchantId }: AnalyticsPageProps) {
  const { profile } = useAuth()
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
      const [data, customers] = await Promise.all([
        api.getMerchantStats(merchantId),
        api.getCrmCustomers(merchantId, "all").catch(() => []),
      ])
      setStats(data || emptyMerchantStats)
      if (customers && customers.length > 0) {
        const sorted = [...customers]
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

  // Use real daily trends — no dummy data
  const weeklyData = stats.dailyTrends || []
  const maxStamps = Math.max(...weeklyData.map((d) => d.stamps), 1)

  // Retention funnel from real data
  const retentionData =
    stats.retentionFunnel && stats.retentionFunnel.length > 0
      ? stats.retentionFunnel.map((row) => ({
          label:
            row.visit === 0
              ? "কার্ড সম্পন্ন (পুরস্কার)"
              : row.visit === 1
              ? "১ম ভিজিট (অনবোর্ড)"
              : `${row.visit}${row.visit === 2 ? "য়" : row.visit === 3 ? "য়" : "র্থ"} ভিজিট`,
          value: row.customers,
          pct: row.pct,
        }))
      : []

  // Hourly distribution from real data
  const hourlyData = stats.hourlyDistribution || []
  const maxHourly = Math.max(...hourlyData.map((h) => h.stamps), 1)

  const hasNoData = !loading && stats.uniqueCustomers === 0 && stats.scansToday === 0

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      {/* Header */}
      <div className="bg-[#1B4332] px-5 pt-12 pb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-1">রিপোর্ট</h1>
        <p className="text-[#52B788] text-sm">লাইভ মেট্রিক্স ও পারফরম্যান্স ডেটা</p>

        {/* 4-Stat tiles (moved here from Dashboard header) */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            {
              label: "আজকের মোট স্ক্যান",
              value: stats.scansToday,
              icon: <TrendingUpIcon size={14} />,
              change: stats.weeklyChange ? `+${stats.weeklyChange}% এই সপ্তাহে` : "আজকের কাউন্টার",
              up: stats.weeklyChange >= 0,
            },
            {
              label: "ইউনিক কাস্টমার",
              value: stats.uniqueCustomers,
              icon: <UsersIcon size={14} />,
              change: stats.newThisWeek ? `+${stats.newThisWeek} নতুন` : "মোট নিবন্ধিত",
              up: true,
            },
            {
              label: "রিপিট রেট",
              value: `${stats.repeatRate}%`,
              icon: <TrendingUpIcon size={14} />,
              change: "পুনরাবৃত্তি গ্রাহক",
              up: true,
            },
            {
              label: "পুরস্কার রিডিম",
              value: stats.rewardsRedeemed,
              icon: <GiftIcon size={14} />,
              change: "রিওয়ার্ড সম্পন্ন",
              up: true,
            },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-white/60 mb-1">
                {s.icon}
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
              <p className="font-display font-black text-white text-2xl mt-0.5">{s.value}</p>
              <p className={`text-xs mt-0.5 ${s.up ? "text-[#52B788]" : "text-red-400"}`}>
                {s.change}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {loading && (
          <div className="py-4 text-center text-xs text-[#6B6158]">
            <span className="inline-block animate-spin mr-1">⏳</span> ডেটা লোড হচ্ছে...
          </div>
        )}

        {!loading && hasNoData && (
          <div className="bg-white rounded-2xl card-shadow p-8 text-center border border-[#E9E5DC] mb-4">
            <span className="text-4xl mb-3 block">📊</span>
            <p className="font-display font-bold text-[#1A1916] text-lg">এখনো কোনো ডেটা নেই</p>
            <p className="text-[#6B6158] text-sm mt-2">
              কাস্টমাররা আপনার QR কোড স্ক্যান করলে এখানে রিপোর্ট দেখা যাবে।
            </p>
          </div>
        )}

        {/* Weekly Scan Trend */}
        {weeklyData.length > 0 && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-[#1A1916]">সাপ্তাহিক সিল ট্রেন্ড</h2>
              <span className="text-[#B0A99E] text-xs">গত ৭ দিন</span>
            </div>
            <div className="flex items-end gap-1.5 h-32">
              {weeklyData.map((d, i) => (
                <div key={d.day || i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: "96px" }}>
                    <div
                      className="w-full rounded-t-lg bg-[#1B4332] transition-all duration-500"
                      style={{ height: `${(d.stamps / maxStamps) * 96}px`, minHeight: "6px" }}
                    />
                  </div>
                  <p className="text-[#B0A99E] text-[10px]">{d.day}</p>
                  <p className="font-display font-bold text-[#1B4332] text-xs">{d.stamps}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[#E9E5DC] flex items-center justify-between text-xs text-[#6B6158]">
              <span>
                মোট: <strong className="text-[#1A1916]">{stats.stampsThisWeek}</strong> সিল এই সপ্তাহে
              </span>
              <span>
                গড়:{" "}
                <strong className="text-[#1A1916]">
                  {weeklyData.length > 0
                    ? (weeklyData.reduce((s, d) => s + d.stamps, 0) / weeklyData.length).toFixed(1)
                    : 0}
                </strong>
                /দিন
              </span>
            </div>
          </div>
        )}

        {/* Retention Funnel */}
        {retentionData.length > 0 && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
            <h2 className="font-display font-bold text-[#1A1916] mb-1">কাস্টমার রিটেনশন ফানেল</h2>
            <p className="text-[#6B6158] text-xs mb-4">
              কত শতাংশ কাস্টমার পরবর্তী ভিজিটে ফিরে আসছেন
            </p>
            <div className="space-y-3">
              {retentionData.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[#1A1916] text-sm font-medium">{d.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-[#1B4332]">{d.value} জন</span>
                      <span className="text-[#B0A99E] text-xs">({d.pct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F0EDE6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${d.pct}%`,
                        background:
                          i === 0
                            ? "#1B4332"
                            : i === 1
                            ? "#2D6A4F"
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
            <div className="mt-4 p-3 bg-[#F0F7F2] rounded-xl border border-[#52B788]/20">
              <p className="text-[#1B4332] text-xs font-semibold">
                ✓ {stats.repeatRate}% কাস্টমার দ্বিতীয়বার আসছেন
              </p>
            </div>
          </div>
        )}

        {/* Peak Hours */}
        {hourlyData.length > 0 && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
            <h2 className="font-display font-bold text-[#1A1916] mb-1">ব্যস্ততম সময় (Peak Hours)</h2>
            <p className="text-[#6B6158] text-xs mb-4">
              দিনের কোন সময়ে সবচেয়ে বেশি কাউন্টার স্ক্যান হয়
            </p>
            <div className="flex items-end gap-0.5 h-20">
              {hourlyData.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${(h.stamps / maxHourly) * 80}px`,
                    minHeight: "4px",
                    background: h.stamps === maxHourly ? "#F59E0B" : "#D8EDDF",
                  }}
                  title={`${h.hour}:00 — ${h.stamps} স্ক্যান`}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[#B0A99E] text-[10px]">
                {hourlyData[0] ? `${hourlyData[0].hour}:00` : ""}
              </span>
              <span className="text-[#F59E0B] text-[10px] font-bold">
                পিক: {hourlyData.reduce((m, h) => (h.stamps > m.stamps ? h : m), hourlyData[0] || { hour: 0, stamps: 0 }).hour}:00
              </span>
              <span className="text-[#B0A99E] text-[10px]">
                {hourlyData[hourlyData.length - 1] ? `${hourlyData[hourlyData.length - 1].hour}:00` : ""}
              </span>
            </div>
          </div>
        )}

        {/* Top Loyal Customers */}
        {topCustomers.length > 0 && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4">
            <h2 className="font-display font-bold text-[#1A1916] mb-3">শীর্ষ বিশ্বস্ত কাস্টমার</h2>
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                const badges = ["🥇", "🥈", "🥉", "৪", "৫"]
                return (
                  <div key={c.id || i} className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center">{badges[i] || `${i + 1}`}</span>
                    <div className="w-8 h-8 rounded-full bg-[#F0F7F2] flex items-center justify-center font-bold text-xs text-[#1B4332]">
                      {c.name ? c.name.slice(0, 1) : "ক"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1A1916]">{c.name}</p>
                      <p className="text-xs text-[#6B6158]">{c.totalVisits || c.stamps} বার মোট ভিজিট</p>
                    </div>
                    <span className="text-xs bg-[#D8EDDF] text-[#1B4332] px-2 py-1 rounded-full font-bold">
                      {c.stamps} সিল
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

