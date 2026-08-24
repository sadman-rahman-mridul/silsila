import { useState, useEffect } from "react"
import { api, type RewardProgram, type MerchantStats } from "../../services/api"
import { CheckIcon } from "../../components/Icons"
import StampGrid from "../../components/StampGrid"
import { useAuth } from "../../context/AuthContext"

interface RewardsManagerProps {
  merchantId?: string
  merchantName?: string
}

export default function RewardsManager({ merchantId: propId, merchantName: propName }: RewardsManagerProps) {
  const { profile } = useAuth()
  const merchantId = propId || profile?.merchantId || profile?.id || ""
  const merchantName = propName || profile?.name || ""
  const [programs, setPrograms] = useState<RewardProgram[]>([])
  const [stats, setStats] = useState<MerchantStats | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [previewStamps, setPreviewStamps] = useState(5)
  const [rewardText, setRewardText] = useState("")
  const [expiryDays, setExpiryDays] = useState(30)
  const [creating, setCreating] = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrograms()
  }, [merchantId])

  async function loadPrograms() {
    try {
      setError(null)
      const [programsData, statsData] = await Promise.all([
        api.getRewardPrograms(merchantId),
        api.getMerchantStats(merchantId).catch(() => null),
      ])
      setPrograms(programsData)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleCreateProgram() {
    if (!rewardText.trim()) return
    setCreating(true)
    try {
      await api.createRewardProgram({
        merchantId,
        target: previewStamps,
        rewardText: rewardText.trim(),
        expiryDays,
      })
      await loadPrograms()
      setShowCreate(false)
      setRewardText("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F5F0]">
      <div className="bg-[#1B4332] px-5 pt-12 pb-6">
        <h1 className="font-display text-2xl font-bold text-white mb-1">লয়্যালটি ও পুরস্কার</h1>
        <p className="text-[#52B788] text-sm">ডিজিটাল স্ট্যাম্প ও রিওয়ার্ড নিয়মাবলি</p>

        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-[#F59E0B] text-2xl">{stats?.rewardsRedeemed || 0}</p>
            <p className="text-white/60 text-xs mt-0.5">রিডিম হয়েছে</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-white text-2xl">{stats?.repeatRate ?? 0}%</p>
            <p className="text-white/60 text-xs mt-0.5">রিপিট রেট</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="font-display font-black text-white text-2xl">{programs.length}</p>
            <p className="text-white/60 text-xs mt-0.5">সক্রিয় প্রোগ্রাম</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-[#1A1916] text-base">সক্রিয় প্রোগ্রামসমূহ</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold transition-all active:scale-[0.98] shadow-sm"
          >
            + নতুন প্রোগ্রাম
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4 animate-slide-up border border-[#52B788]/40">
            <h3 className="font-display font-bold text-[#1A1916] mb-3">নতুন রিওয়ার্ড প্রোগ্রাম তৈরি করুন</h3>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">প্রয়োজনীয় সিল সংখ্যা (Target)</label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPreviewStamps(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      previewStamps === n
                        ? "bg-[#1B4332] text-white shadow-sm"
                        : "bg-[#F7F5F0] text-[#6B6158] border border-[#E9E5DC]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">পুরস্কারের বিবরণ</label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder="যেমন: ১টি স্পেশাল হট কফি ফ্রি"
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">মেয়াদ (দিন)</label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-4 py-2.5 text-[#1A1916] text-sm outline-none font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">লাইভ কাস্টমার প্রিভিউ</label>
              <div className="bg-[#F0F7F2] rounded-xl p-3.5 border border-[#52B788]/20">
                <div className="bg-white rounded-xl p-3.5 card-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#D8EDDF] flex items-center justify-center font-display font-bold text-xs text-[#1B4332]">
                      {merchantName.slice(0, 2) || "—"}
                    </div>
                    <div>
                      <p className="font-display font-bold text-[#1A1916] text-xs">
                        {merchantName || "আপনার দোকান"}
                      </p>
                      <p className="text-[#6B6158] text-[10px]">০/{previewStamps} সিল</p>
                    </div>
                  </div>
                  <StampGrid filled={0} total={previewStamps} size="sm" />
                  <p className="text-[#1B4332] font-bold text-xs mt-2">
                    🎁 {rewardText || "পুরস্কারের বিবরণ লিখুন"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs"
              >
                বাতিল
              </button>
              <button
                onClick={handleCreateProgram}
                disabled={creating || !rewardText.trim()}
                className="flex-[2] py-2.5 rounded-xl bg-[#1B4332] text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <CheckIcon size={15} />
                {creating ? "চালু হচ্ছে..." : "প্রোগ্রাম চালু করুন"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-2xl">
            ⚠️ {error}
          </div>
        )}

        {programs.length === 0 && !showCreate && (
          <div className="bg-white rounded-2xl p-8 card-shadow text-center border border-[#E9E5DC]">
            <span className="text-3xl mb-2 block">🎁</span>
            <p className="font-display font-bold text-[#1A1916]">কোনো প্রোগ্রাম নেই</p>
            <p className="text-[#6B6158] text-xs mt-1">
              "নতুন প্রোগ্রাম" চেপে আপনার প্রথম স্ট্যাম্প কার্ড চালু করুন।
            </p>
          </div>
        )}

        <div className="space-y-3">
          {programs.map((program) => (
            <div key={program.id} className="bg-white rounded-2xl card-shadow p-4 border border-[#E9E5DC]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-2xl">
                    🎁
                  </div>
                  <div>
                    <p className="font-display font-bold text-[#1A1916] text-sm">{program.rewardText}</p>
                    <p className="text-[#6B6158] text-xs mt-0.5">
                      {program.target}টি সিলে · {program.expiryDays} দিনের মেয়াদ
                    </p>
                  </div>
                </div>
                <span className="bg-[#D8EDDF] text-[#1B4332] text-[11px] px-2.5 py-1 rounded-full font-bold">
                  সক্রিয়
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E9E5DC] text-center">
                <div>
                  <p className="font-display font-black text-[#1A1916] text-base">{stats?.activeCards ?? 0}</p>
                  <p className="text-[#6B6158] text-[10px]">চলমান কার্ড</p>
                </div>
                <div>
                  <p className="font-display font-black text-[#52B788] text-base">
                    {stats?.rewardsRedeemed ?? 0}
                  </p>
                  <p className="text-[#6B6158] text-[10px]">সম্পন্ন রিডিম</p>
                </div>
                <div>
                  <p className="font-display font-black text-[#F59E0B] text-base">
                    {stats?.stampsThisWeek ?? 0}
                  </p>
                  <p className="text-[#6B6158] text-[10px]">এই সপ্তাহের সিল</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
