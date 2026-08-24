import { useState, useEffect } from "react"
import { api, type MerchantStats, type MerchantCustomer } from "../../services/api"
import { TrendingUpIcon, UsersIcon, GiftIcon } from "../../components/Icons"

interface ReportPageProps {
  merchantId: string
}

const HOUR_LABELS = [
  "৮টা", "৯টা", "১০টা", "১১টা", "দুপুর", "১টা", "২টা", "৩টা",
  "৪টা", "৫টা", "৬টা", "৭টা", "৮টা", "৯টা", "১০টা", "১১টা",
]

function funnelLabel(visit: number) {
  if (visit === 0) return "কার্ড সম্পন্ন (পুরস্কার)"
  if (visit === 1) return "১ম ভিজিট (অনবোর্ড)"
  if (visit === 2) return "২য় ভিজিট (রিটার্ন)"
  return `${visit}য় ভিজিট`
}

/**
 * Merchant Report.
 *
 * Every figure comes from this merchant's own stamp and voucher records. A new
 * account legitimately shows zeros until its first scan is approved.
 */
export default function ReportPage({ merchantId }: ReportPageProps) {
  const [stats, setStats] = useState<MerchantStats | null>(null)
  const [topCustomers, setTopCustomers] = useState<MerchantCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [merchantId])

  async function loadReport() {
    setLoading(true)
    setError(null)
    try {
      const [statsData, customers] = await Promise.all([
        api.getMerchantStats(merchantId),
        api.getCrmCustomers(merchantId, "all").catch(() => [] as MerchantCustomer[]),
      ])
      setStats(statsData)
      setTopCustomers(
        [...customers].sort((a, b) => (b.totalVisits || 0) - (a.totalVisits || 0)).slice(0, 5)
      )
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const maxStamps = Math.max(...(stats?.dailyTrends.map((d) => d.stamps) || [0]), 1)
  const maxHourly = Math.max(...(stats?.hourlyDistribution.map((h) => h.stamps) || [0]), 1)
  const hasActivity = !!stats?.hasActivity

  return (
    <div className="min-h-full bg-[#F7F5F0] pb-24">
      <div className="bg-[#1B4332] px-5 pt-6 pb-6 rounded-b-3xl">
        <h1 className="font-display text-2xl font-bold text-white mb-1">রিপোর্ট</h1>
        <p className="text-[#52B788] text-sm">আপনার দোকানের লাইভ মেট্রিক্স ও পারফরম্যান্স</p>

        {/* The four headline tiles previously pinned to the home screen. */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            {
              label: "আজকের স্ক্যান",
              value: stats?.scansToday ?? 0,
              icon: <TrendingUpIcon size={14} />,
              sub:
                stats && stats.weeklyChange !== 0
                  ? `${stats.weeklyChange > 0 ? "+" : ""}${stats.weeklyChange} এই সপ্তাহে`
                  : "আজকের সিল",
            },
            {
              label: "ইউনিক কাস্টমার",
              value: stats?.uniqueCustomers ?? 0,
              icon: <UsersIcon size={14} />,
              sub: stats?.newThisWeek ? `+${stats.newThisWeek} এই সপ্তাহে` : "মোট গ্রাহক",
            },
            {
              label: "পুরস্কার রিডিম",
              value: stats?.rewardsRedeemed ?? 0,
              icon: <GiftIcon size={14} />,
              sub: "রিওয়ার্ড সম্পন্ন",
            },
            {
              label: "রিপিট রেট",
              value: `${stats?.repeatRate ?? 0}%`,
              icon: <TrendingUpIcon size={14} />,
              sub: "৩০ দিনে পুনরাবৃত্তি",
              accent: true,
            },
          ].map((tile) => (
            <div key={tile.label} className="bg-white/10 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-white/60 mb-2">
                {tile.icon}
                <span className="text-xs">{tile.label}</span>
              </div>
              <p
                className={`font-display font-black text-2xl leading-none ${
                  tile.accent ? "text-[#F59E0B]" : "text-white"
                }`}
              >
                {tile.value}
              </p>
              <p className="text-white/40 text-[11px] mt-1">{tile.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading && (
          <div className="py-4 text-center text-xs text-[#6B6158]">
            <span className="inline-block animate-spin mr-1">⏳</span> মেট্রিক্স লোড হচ্ছে...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl">
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && !hasActivity && (
          <div className="bg-white rounded-2xl card-shadow p-8 text-center border border-[#E9E5DC]">
            <span className="text-3xl mb-2 block">📈</span>
            <p className="font-display font-bold text-[#1A1916]">এখনো কোনো ডেটা নেই</p>
            <p className="text-[#6B6158] text-xs mt-1 leading-relaxed">
              প্রথম কাস্টমার কাউন্টার QR স্ক্যান করে সিল নিলেই এখানে রিপোর্ট তৈরি হতে শুরু করবে।
            </p>
          </div>
        )}

        {hasActivity && stats && (
          <>
            {/* Weekly stamp trend */}
            <div className="bg-white rounded-2xl card-shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-[#1A1916]">সাপ্তাহিক সিল ট্রেন্ড</h2>
                <span className="text-[#B0A99E] text-xs">গত ৭ দিন</span>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {stats.dailyTrends.map((d, i) => (
                  <div key={`${d.day}-${i}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <div
                        className="w-full rounded-t-lg bg-[#1B4332] transition-all duration-500"
                        style={{ height: `${(d.stamps / maxStamps) * 96}px`, minHeight: "3px" }}
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
                  গড়: <strong className="text-[#1A1916]">{(stats.stampsThisWeek / 7).toFixed(1)}</strong>/দিন
                </span>
              </div>
            </div>

            {/* Retention funnel */}
            {stats.retentionFunnel.length > 0 && (
              <div className="bg-white rounded-2xl card-shadow p-4">
                <h2 className="font-display font-bold text-[#1A1916] mb-1">কাস্টমার রিটেনশন ফানেল</h2>
                <p className="text-[#6B6158] text-xs mb-4">কত শতাংশ কাস্টমার পরবর্তী ভিজিটে ফিরে আসছেন</p>
                <div className="space-y-3">
                  {stats.retentionFunnel.map((d, i) => (
                    <div key={`${d.visit}-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[#1A1916] text-sm font-medium">{funnelLabel(d.visit)}</p>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-[#1B4332]">{d.customers} জন</span>
                          <span className="text-[#B0A99E] text-xs">({d.pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#F0EDE6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${d.pct}%`,
                            background: d.visit === 0 ? "#F59E0B" : ["#1B4332", "#2D6A4F", "#52B788", "#86EFAC"][i] || "#52B788",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak hours */}
            <div className="bg-white rounded-2xl card-shadow p-4">
              <h2 className="font-display font-bold text-[#1A1916] mb-1">ব্যস্ততম সময় (Peak Hours)</h2>
              <p className="text-[#6B6158] text-xs mb-4">দিনের কোন সময়ে সবচেয়ে বেশি কাউন্টার স্ক্যান হয়</p>
              <div className="flex items-end gap-0.5 h-20">
                {stats.hourlyDistribution.map((h, i) => (
                  <div
                    key={h.hour}
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${(h.stamps / maxHourly) * 80}px`,
                      minHeight: "3px",
                      background: h.stamps === maxHourly && h.stamps > 0 ? "#F59E0B" : "#D8EDDF",
                    }}
                    title={`${HOUR_LABELS[i]}: ${h.stamps} স্ক্যান`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[#B0A99E] text-[10px]">সকাল ৮টা</span>
                <span className="text-[#B0A99E] text-[10px]">রাত ১১টা</span>
              </div>
            </div>

            {/* Top customers */}
            <div className="bg-white rounded-2xl card-shadow p-4">
              <h2 className="font-display font-bold text-[#1A1916] mb-3">শীর্ষ বিশ্বস্ত কাস্টমার</h2>
              {topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {topCustomers.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xl w-7 text-center">
                        {["🥇", "🥈", "🥉"][i] || `${i + 1}`}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#F0F7F2] flex items-center justify-center font-bold text-xs text-[#1B4332]">
                        {c.name?.slice(0, 1) || "ক"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A1916] truncate">
                          {c.name || "নাম নেই"}
                        </p>
                        <p className="text-xs text-[#6B6158]">{c.totalVisits} বার মোট ভিজিট</p>
                      </div>
                      <span className="text-xs bg-[#D8EDDF] text-[#1B4332] px-2 py-1 rounded-full font-bold flex-shrink-0">
                        {c.stamps} সিল
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#B0A99E] py-2 text-center">এখনো কোনো কাস্টমার নেই</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
