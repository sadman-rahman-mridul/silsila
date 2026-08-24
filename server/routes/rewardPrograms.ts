import { Router } from "express"
import { db } from "../db.js"
import { requireMerchantOwner } from "../middleware/auth.js"

const router = Router()

// Programs are always scoped to one merchant — there is no "list everything" mode.
router.get("/", (req, res) => {
  const { merchantId } = req.query
  if (!merchantId || typeof merchantId !== "string") {
    res.status(400).json({ error: "মার্চেন্ট আইডি প্রয়োজন" })
    return
  }
  res.json(db.getProgramsByMerchant(merchantId))
})

router.get("/:id", (req, res) => {
  const program = db.getProgramById(req.params.id)
  if (!program) {
    res.status(404).json({ error: "রিওয়ার্ড প্রোগ্রাম পাওয়া যায়নি" })
    return
  }
  res.json(program)
})

router.post("/", requireMerchantOwner("merchantId"), (req, res) => {
  const { merchantId, target, rewardText, expiryDays, active, sponsorId, rewardImage } = req.body

  if (!merchantId || !target || !rewardText) {
    res.status(400).json({ error: "মার্চেন্ট আইডি, লক্ষ্য ও পুরস্কার বিবরণ আবশ্যক" })
    return
  }

  const program = db.addRewardProgram({
    id: `rp_${Date.now()}`,
    merchantId,
    sponsorId: sponsorId || null,
    target: Number(target) || 5,
    rewardText,
    rewardImage: rewardImage || undefined,
    expiryDays: Number(expiryDays) || 30,
    active: active ?? true,
    createdAt: new Date().toISOString(),
  })

  res.status(201).json(program)
})

router.put("/:id", (req, res) => {
  const existing = db.getProgramById(req.params.id)
  if (!existing) {
    res.status(404).json({ error: "প্রোগ্রাম খুঁজে পাওয়া যায়নি" })
    return
  }
  const { merchantId, ...safeUpdates } = req.body
  const updated = db.updateRewardProgram(req.params.id, safeUpdates)
  if (!updated) {
    res.status(404).json({ error: "প্রোগ্রাম খুঁজে পাওয়া যায়নি" })
    return
  }
  res.json(updated)
})

export default router
