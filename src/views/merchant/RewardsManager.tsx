import { useState, useEffect } from "react"
import { api, type RewardProgram, type MerchantStats } from "../../services/api"
import { CheckIcon } from "../../components/Icons"
import StampGrid from "../../components/StampGrid"
import { useAuth } from "../../context/AuthContext"

import { firebaseService } from "../../services/firebaseService"

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

  async function resolveId() {
    if (!merchantId) return ""
    if (merchantId.startsWith("m_") || merchantId.startsWith("m1")) return merchantId
    const fb = await firebaseService.getMerchantByIdOrSlug(merchantId)
    return fb?.id || merchantId
  }

  useEffect(() => {
    loadPrograms()
  }, [merchantId])

  async function loadPrograms() {
    try {
      setError(null)
      const targetId = await resolveId()
      if (!targetId) return

      const [fbPrograms, statsData, apiPrograms] = await Promise.all([
        firebaseService.getRewardPrograms(targetId).catch(() => []),
        api.getMerchantStats(targetId).catch(() => null),
        api.getRewardPrograms(targetId).catch(() => []),
      ])

      // Firestore is the single source of truth; fallback to API only if empty
      const rawPrograms = fbPrograms && fbPrograms.length > 0 ? fbPrograms : (apiPrograms || [])

      // Deduplicate by target + rewardText to prevent any duplicate cards
      const seen = new Set<string>()
      const uniquePrograms: RewardProgram[] = []
      for (const p of rawPrograms) {
        const key = `${p.target}_${(p.rewardText || "").trim().toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          uniquePrograms.push(p)
        }
      }

      setPrograms(uniquePrograms)
      setStats(statsData)
    } catch (err: any) {
      setError(err?.message || "প্রোগ্রাম লোড করতে সমস্যা হয়েছে")
    }
  }

  async function handleCreateProgram() {
    if (!rewardText.trim()) return
    setCreating(true)
    setError(null)
    try {
      const targetId = await resolveId()
      const newProg = {
        id: `rp_${Date.now()}`,
        merchantId: targetId,
        target: previewStamps,
        rewardText: rewardText.trim(),
        expiryDays,
        active: true,
        createdAt: new Date().toISOString(),
      }

      // 1. Direct Cloud Firestore save
      await firebaseService.saveRewardProgram(newProg)
      await firebaseService.updateMerchantInFirestore(targetId, {
        rewardTarget: previewStamps,
        rewardText: rewardText.trim(),
      })

      // 2. Local memory / API save
      await api.createRewardProgram({
        merchantId: targetId,
        target: previewStamps,
        rewardText: rewardText.trim(),
        expiryDays,
      }).catch(console.warn)

      await loadPrograms()
      setShowCreate(false)
      setRewardText("")
    } catch (err: any) {
      console.error("Failed to create reward program:", err)
      setError(err?.message || "প্রোগ্রাম তৈরি করা যায়নি")
    } finally {
      setCreating(false)
    }
  }

  const [editingProgram, setEditingProgram] = useState<RewardProgram | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleUpdateProgram() {
    if (!editingProgram || !editingProgram.rewardText.trim()) return
    setSavingEdit(true)
    setError(null)
    try {
      const targetId = await resolveId()
      await firebaseService.saveRewardProgram({
        ...editingProgram,
        merchantId: targetId,
      })
      await firebaseService.updateMerchantInFirestore(targetId, {
        rewardTarget: editingProgram.target,
        rewardText: editingProgram.rewardText.trim(),
      })
      await loadPrograms()
      setEditingProgram(null)
    } catch (err: any) {
      console.error("Failed to update program:", err)
      setError(err?.message || "প্রোগ্রাম আপডেট করা যায়নি")
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteProgram(progId: string) {
    setDeleting(true)
    setError(null)
    try {
      const targetId = await resolveId()
      await firebaseService.deleteRewardProgram(targetId, progId)
      await loadPrograms()
      setDeleteConfirmId(null)
    } catch (err: any) {
      console.error("Failed to delete program:", err)
      setError(err?.message || "প্রোগ্রাম মুছে ফেলা যায়নি")
    } finally {
      setDeleting(false)
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
            onClick={() => {
              setEditingProgram(null)
              setShowCreate(!showCreate)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            + নতুন প্রোগ্রাম
          </button>
        </div>

        {/* Edit Modal */}
        {editingProgram && (
          <div className="bg-white rounded-2xl card-shadow p-4 mb-4 animate-slide-up border-2 border-[#1B4332]">
            <h3 className="font-display font-bold text-[#1A1916] mb-3">রিওয়ার্ড প্রোগ্রাম সম্পাদনা করুন</h3>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-2">প্রয়োজনীয় সিল সংখ্যা (Target)</label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEditingProgram({ ...editingProgram, target: n })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      editingProgram.target === n
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
                value={editingProgram.rewardText}
                onChange={(e) => setEditingProgram({ ...editingProgram, rewardText: e.target.value })}
                placeholder="যেমন: ১টি স্পেশাল হট কফি ফ্রি"
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-4 py-3 text-[#1A1916] text-sm outline-none focus:border-[#1B4332] font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-[#6B6158] text-xs font-medium block mb-1.5">মেয়াদ (দিন)</label>
              <input
                type="number"
                value={editingProgram.expiryDays}
                onChange={(e) => setEditingProgram({ ...editingProgram, expiryDays: Number(e.target.value) })}
                className="w-full bg-[#F7F5F0] border border-[#E9E5DC] rounded-xl px-4 py-2.5 text-[#1A1916] text-sm outline-none font-medium"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingProgram(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E9E5DC] text-[#6B6158] font-bold text-xs"
              >
                বাতিল
              </button>
              <button
                onClick={handleUpdateProgram}
                disabled={savingEdit || !editingProgram.rewardText.trim()}
                className="flex-[2] py-2.5 rounded-xl bg-[#1B4332] text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <CheckIcon size={15} />
                {savingEdit ? "সংরক্ষণ হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
              </button>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreate && !editingProgram && (
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowCreate(false)
                      setEditingProgram(program)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#F0EDE6] hover:bg-[#E2DDD2] text-[#1B4332] transition-colors text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(program.id)}
                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Delete confirmation inline */}
              {deleteConfirmId === program.id && (
                <div className="mb-3 p-3.5 bg-red-50 rounded-xl border border-red-200 animate-slide-up">
                  <p className="text-xs font-bold text-red-700 mb-2.5">Are you sure you want to delete this program?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3.5 py-1.5 bg-white border border-[#E9E5DC] text-[#6B6158] rounded-lg text-xs font-bold hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      disabled={deleting}
                      className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}

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
