import { Router } from "express"
import { db } from "../db.js"

const router = Router()

// Customer Data Deletion
router.post("/delete-my-data", (req, res) => {
  const { customerId, confirmation } = req.body

  if (!customerId) {
    res.status(400).json({ error: "কাস্টমার আইডি প্রদান করুন" })
    return
  }

  if (confirmation !== "DELETE") {
    res.status(400).json({ error: "মুছে ফেলার নিশ্চিতকরণ কোড প্রদান করুন" })
    return
  }

  const success = db.deleteCustomerData(customerId)
  res.json({
    success,
    message: "আপনার সমস্ত স্ট্যাম্প ও অ্যাকাউন্ট তথ্য সফলভাবে মুছে ফেলা হয়েছে।",
  })
})

export default router
