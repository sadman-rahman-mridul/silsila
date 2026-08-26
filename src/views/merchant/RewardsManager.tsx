import { useState, useEffect } from "react"
import { api, type RewardProgram, type MerchantStats } from "../../services/api"
import { CheckIcon, GiftIcon } from "../../components/Icons"
import StampGrid from "../../components/StampGrid"
import { useAuth } from "../../context/AuthContext"
import { useLanguage } from "../../context/LanguageContext"
import { firebaseService } from "../../services/firebaseService"

interface RewardsManagerProps {
  merchantId?: string
  merchantName?: string
}

export default function RewardsManager({ merchantId: propId, merchantName: propName }: RewardsManagerProps) {
  const { profile } = useAuth()
  const { isBn } = useLanguage()
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

      const [fbPrograms, fbStats, apiPrograms] = await Promise.all([
        firebaseService.getRewardPrograms(targetId).catch(() => []),
        firebaseService.getMerchantStats(targetId).catch(() => null),
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
      setStats(fbStats)
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
    <div className="flex flex-col h-full bg-transparent w-full">
      <div className="px-3.5 pt-4 pb-3 w-full">
        <h1 className="font-display text-xl font-black text-white mb-0.5 drop-shadow-xs">
          {isBn ? "লয়্যালটি ও পুরস্কার" : "Loyalty & Rewards"}
        </h1>
        <p className="text-[#34D399] text-xs font-semibold">
          {isBn ? "ডিজিটাল স্ট্যাম্প ও রিওয়ার্ড নিয়মাবলি" : "Digital stamp cards & reward rules"}
        </p>

        <div className="mt-3.5 flex gap-2">
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3 text-center shadow-lg">
            <p className="font-display font-black text-[#F59E0B] text-xl leading-none">{stats?.rewardsRedeemed || 0}</p>
            <p className="text-white/50 text-[10px] mt-1 font-medium">{isBn ? "রিডিম হয়েছে" : "Redeemed"}</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3 text-center shadow-lg">
            <p className="font-display font-black text-[#34D399] text-xl leading-none">{stats?.repeatRate ?? 0}%</p>
            <p className="text-white/50 text-[10px] mt-1 font-medium">{isBn ? "রিপিট রেট" : "Repeat Rate"}</p>
          </div>
          <div className="flex-1 bg-[#0E281C]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-3 text-center shadow-lg">
            <p className="font-display font-black text-white text-xl leading-none">{programs.length}</p>
            <p className="text-white/50 text-[10px] mt-1 font-medium">{isBn ? "সক্রিয় প্রোগ্রাম" : "Active Programs"}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 pb-20 pt-2 w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-white text-base drop-shadow-xs">
            {isBn ? "সক্রিয় প্রোগ্রামসমূহ" : "Active Programs"}
          </h2>
          <button
            onClick={() => {
              setEditingProgram(null)
              setShowCreate(!showCreate)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] hover:brightness-105 text-[#0A2318] text-xs font-black transition-all active:scale-[0.98] shadow-lg glow-emerald cursor-pointer"
          >
            {isBn ? "+ নতুন প্রোগ্রাম" : "+ New Program"}
          </button>
        </div>

        {error && (
          <div className="mb-3 bg-red-500/20 border border-red-400/40 text-red-200 text-xs px-4 py-3 rounded-2xl backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {programs.length === 0 && !showCreate && (
          <div className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center border border-emerald-500/20">
            <GiftIcon size={36} className="text-[#F59E0B] mx-auto mb-2" />
            <p className="font-display font-bold text-white">{isBn ? "কোনো প্রোগ্রাম নেই" : "No Programs Found"}</p>
            <p className="text-white/60 text-xs mt-1">
              {isBn
                ? '"নতুন প্রোগ্রাম" চেপে আপনার প্রথম স্ট্যাম্প কার্ড চালু করুন।'
                : 'Tap "New Program" to launch your first loyalty card.'}
            </p>
          </div>
        )}

        <div className="space-y-3.5">
          {programs.map((program) => (
            <div key={program.id} className="bg-[#0E281C]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-4 border border-emerald-500/20">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] text-[#0A2318] flex items-center justify-center text-2xl shadow-sm">
                    🎁
                  </div>
                  <div>
                    <p className="font-display font-bold text-white text-sm">{program.rewardText}</p>
                    <p className="text-[#34D399] text-xs font-semibold mt-0.5">
                      {isBn
                        ? `${program.target}টি সিলে · ${program.expiryDays} দিনের মেয়াদ`
                        : `${program.target} stamps · ${program.expiryDays} days validity`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowCreate(false)
                      setEditingProgram(program)
                    }}
                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors text-xs font-bold cursor-pointer flex items-center gap-1 border border-white/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(program.id)}
                    className="px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors text-xs font-bold cursor-pointer flex items-center gap-1 border border-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Delete confirmation inline */}
              {deleteConfirmId === program.id && (
                <div className="mb-3 p-3.5 bg-red-500/20 rounded-2xl border border-red-400/40 animate-slide-up backdrop-blur-md">
                  <p className="text-xs font-bold text-red-200 mb-2.5">
                    {isBn ? "আপনি কি নিশ্চিতভাবে এই প্রোগ্রামটি মুছে ফেলতে চান?" : "Are you sure you want to delete this program?"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3.5 py-1.5 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold hover:bg-white/20 cursor-pointer"
                    >
                      {isBn ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id)}
                      disabled={deleting}
                      className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {deleting ? (isBn ? "মুছে ফেলা হচ্ছে..." : "Deleting...") : (isBn ? "হ্যাঁ, মুছুন" : "Yes, Delete")}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
                <div>
                  <p className="font-display font-black text-white text-base">{stats?.activeCards ?? 0}</p>
                  <p className="text-white/40 text-[10px] font-medium">{isBn ? "চলমান কার্ড" : "Active Cards"}</p>
                </div>
                <div>
                  <p className="font-display font-black text-[#34D399] text-base">
                    {stats?.rewardsRedeemed ?? 0}
                  </p>
                  <p className="text-white/40 text-[10px] font-medium">{isBn ? "সম্পন্ন রিডিম" : "Redeemed"}</p>
                </div>
                <div>
                  <p className="font-display font-black text-[#F59E0B] text-base">
                    {stats?.stampsThisWeek ?? 0}
                  </p>
                  <p className="text-white/40 text-[10px] font-medium">{isBn ? "এই সপ্তাহের সিল" : "Stamps This Week"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-white">
          <div className="bg-[#0E281C] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F59E0B] text-[#0A2318] flex items-center justify-center font-bold text-sm">
                  🎁
                </div>
                <h3 className="font-display font-black text-white text-base">
                  {isBn ? "রিওয়ার্ড প্রোগ্রাম সম্পাদনা" : "Edit Reward Program"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-xs cursor-pointer active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-2">
                {isBn ? "প্রয়োজনীয় সিল সংখ্যা (Target)" : "Required Stamps (Target)"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEditingProgram({ ...editingProgram, target: n })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      editingProgram.target === n
                        ? "bg-[#34D399] text-[#0A2318] shadow-md glow-emerald"
                        : "bg-[#071D13] text-white/70 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-1.5">
                {isBn ? "পুরস্কারের বিবরণ" : "Reward Description"}
              </label>
              <input
                type="text"
                value={editingProgram.rewardText}
                onChange={(e) => setEditingProgram({ ...editingProgram, rewardText: e.target.value })}
                placeholder={isBn ? "যেমন: ১টি স্পেশাল হট কফি ফ্রি" : "e.g. 1 Free Specialty Coffee"}
                className="w-full bg-[#071D13] border border-emerald-500/20 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-[#34D399] font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-1.5">
                {isBn ? "মেয়াদ (দিন)" : "Validity (Days)"}
              </label>
              <input
                type="number"
                value={editingProgram.expiryDays}
                onChange={(e) => setEditingProgram({ ...editingProgram, expiryDays: Number(e.target.value) })}
                className="w-full bg-[#071D13] border border-emerald-500/20 rounded-2xl px-4 py-2.5 text-white text-sm outline-none font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-2">
                {isBn ? "লাইভ কার্ড প্রিভিউ" : "Live Card Preview"}
              </label>
              <div className="bg-[#071D13] rounded-2xl p-3.5 border border-emerald-500/20">
                <div className="bg-[#0E281C] rounded-xl p-3.5 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#34D399]/20 text-[#34D399] flex items-center justify-center font-display font-bold text-xs border border-[#34D399]/30">
                      {merchantName.slice(0, 2) || "—"}
                    </div>
                    <div>
                      <p className="font-display font-bold text-white text-xs">
                        {merchantName || (isBn ? "আপনার দোকান" : "Your Store")}
                      </p>
                      <p className="text-white/50 text-[10px]">
                        0/{editingProgram.target} {isBn ? "সিল" : "Stamps"}
                      </p>
                    </div>
                  </div>
                  <StampGrid filled={0} total={editingProgram.target} size="sm" variant="coffee" />
                  <p className="text-[#34D399] font-bold text-xs mt-2">
                    {editingProgram.rewardText || (isBn ? "পুরস্কারের বিবরণ লিখুন" : "Enter reward description")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="flex-1 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleUpdateProgram}
                disabled={savingEdit || !editingProgram.rewardText.trim()}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer transition-all active:scale-95 glow-emerald"
              >
                <CheckIcon size={15} />
                {savingEdit ? (isBn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : (isBn ? "আপডেট সংরক্ষণ করুন" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Program Modal */}
      {showCreate && !editingProgram && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-white">
          <div className="bg-[#0E281C] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#10B981] text-[#0A2318] flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <h3 className="font-display font-black text-white text-base">
                  {isBn ? "নতুন রিওয়ার্ড প্রোগ্রাম তৈরি" : "Create New Reward Program"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white text-xs cursor-pointer active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-2">
                {isBn ? "প্রয়োজনীয় সিল সংখ্যা (Target)" : "Required Stamps (Target)"}
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 8, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPreviewStamps(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                      previewStamps === n
                        ? "bg-[#34D399] text-[#0A2318] shadow-md glow-emerald"
                        : "bg-[#071D13] text-white/70 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-1.5">
                {isBn ? "পুরস্কারের বিবরণ" : "Reward Description"}
              </label>
              <input
                type="text"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
                placeholder={isBn ? "যেমন: ১টি স্পেশাল হট কফি ফ্রি" : "e.g. 1 Free Specialty Coffee"}
                className="w-full bg-[#071D13] border border-emerald-500/20 rounded-2xl px-4 py-3 text-white text-sm outline-none focus:border-[#34D399] font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-1.5">
                {isBn ? "মেয়াদ (দিন)" : "Validity (Days)"}
              </label>
              <input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className="w-full bg-[#071D13] border border-emerald-500/20 rounded-2xl px-4 py-2.5 text-white text-sm outline-none font-medium"
              />
            </div>

            <div className="mb-4">
              <label className="text-white/70 text-xs font-semibold block mb-2">
                {isBn ? "লাইভ কাস্টমার প্রিভিউ" : "Live Customer Preview"}
              </label>
              <div className="bg-[#071D13] rounded-2xl p-3.5 border border-emerald-500/20">
                <div className="bg-[#0E281C] rounded-xl p-3.5 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#34D399]/20 text-[#34D399] flex items-center justify-center font-display font-bold text-xs border border-[#34D399]/30">
                      {merchantName.slice(0, 2) || "—"}
                    </div>
                    <div>
                      <p className="font-display font-bold text-white text-xs">
                        {merchantName || (isBn ? "আপনার দোকান" : "Your Store")}
                      </p>
                      <p className="text-white/50 text-[10px]">
                        0/{previewStamps} {isBn ? "সিল" : "Stamps"}
                      </p>
                    </div>
                  </div>
                  <StampGrid filled={0} total={previewStamps} size="sm" variant="coffee" />
                  <p className="text-[#34D399] font-bold text-xs mt-2">
                    {rewardText || (isBn ? "পুরস্কারের বিবরণ লিখুন" : "Enter reward description")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleCreateProgram}
                disabled={creating || !rewardText.trim()}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#047857] text-[#0A2318] font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40 cursor-pointer transition-all active:scale-95 glow-emerald"
              >
                <CheckIcon size={15} />
                {creating ? (isBn ? "চালু হচ্ছে..." : "Launching...") : (isBn ? "প্রোগ্রাম চালু করুন" : "Launch Program")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
