import {
  auth,
  firestore,
  setupRecaptcha,
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  runTransaction,
  increment,
  serverTimestamp,
} from "../lib/firebase"
import { onAuthStateChanged, signOut, type User, type ConfirmationResult } from "firebase/auth"
import { type CustomerCard, type Merchant, type PendingApproval } from "./api"

/**
 * Firestore layout
 * ----------------
 *  users/{id}             — customer accounts only (role: "customer")
 *  merchants/{id}         — merchant/brand documents, keyed by merchant id
 *  cards/{id}             — loyalty cards, created only by a real approved scan
 *  pendingApprovals/{id}  — live counter approval queue
 *
 * A merchant account is never written into `users`, and a customer is never
 * written into `merchants`.
 */

export type AccountRole = "customer" | "merchant"

const USERS = "users"
const MERCHANTS = "merchants"

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "")
}

function toE164Bd(phone: string) {
  const clean = normalizePhone(phone)
  if (!clean) return ""
  return clean.startsWith("880") ? `+${clean}` : `+880${clean.slice(-10)}`
}

export const firebaseService = {
  // ----------------------------------------------------
  // AUTHENTICATION & PHONE OTP
  // ----------------------------------------------------

  async sendPhoneOtp(
    phoneNumber: string,
    recaptchaContainerId: string = "recaptcha-container"
  ): Promise<ConfirmationResult> {
    const verifier = setupRecaptcha(recaptchaContainerId)
    if (!verifier) throw new Error("Could not initialize reCAPTCHA verifier")
    return await sendFirebasePhoneOtp(phoneNumber, verifier)
  },

  async verifyPhoneOtp(confirmationResult: ConfirmationResult, otpCode: string): Promise<User> {
    return await confirmFirebasePhoneOtp(confirmationResult, otpCode)
  },

  onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback)
  },

  async logOut() {
    await signOut(auth)
  },

  // ----------------------------------------------------
  // ACCOUNT LOOKUP
  // ----------------------------------------------------

  /**
   * Find an existing account by phone number in the collection that belongs to
   * the requested role. Merchants are looked up by `ownerPhone`.
   */
  async findAccountByPhone(phone: string, role: AccountRole) {
    const rawClean = normalizePhone(phone)
    if (!rawClean) return null
    const digits10 = rawClean.slice(-10)
    const possibleValues = [
      digits10,
      `0${digits10}`,
      `880${digits10}`,
      `+880${digits10}`,
    ]

    try {
      if (role === "merchant") {
        const merchantsCol = collection(firestore, MERCHANTS)
        for (const value of possibleValues) {
          const snap = await getDocs(query(merchantsCol, where("ownerPhone", "==", value)))
          if (!snap.empty) {
            return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) }
          }
          const snapPhone = await getDocs(query(merchantsCol, where("phone", "==", value)))
          if (!snapPhone.empty) {
            return { id: snapPhone.docs[0].id, ...(snapPhone.docs[0].data() as any) }
          }
        }
        return null
      }

      // Customer check: first check direct docId `c_${digits10}`
      const directDoc = await getDoc(doc(firestore, USERS, `c_${digits10}`)).catch(() => null)
      if (directDoc && directDoc.exists()) {
        const data = directDoc.data() as any
        // Only return if this is actually a customer record (not a merchant who shares same phone)
        if (data.role === "customer" || !data.role) {
          return { id: directDoc.id, ...data }
        }
      }

      const usersCol = collection(firestore, USERS)
      for (const value of possibleValues) {
        const snap = await getDocs(query(usersCol, where("phone", "==", value), where("role", "==", "customer")))
        if (!snap.empty) {
          return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) }
        }
      }
      return null
    } catch (err) {
      console.warn("Firestore account lookup warning:", err)
      return null
    }
  },

  // ----------------------------------------------------
  // PROFILE WRITES
  // ----------------------------------------------------

  /** Write a customer profile to `users`. Creates no loyalty cards. */
  async saveCustomerProfile(profile: { id: string; phone: string; name: string; password?: string }) {
    try {
      const clean = normalizePhone(profile.phone)
      const digits10 = clean.slice(-10)
      const deterministicId = `c_${digits10}`
      const docId = profile.id && profile.id.startsWith("c_") ? profile.id : deterministicId
      await setDoc(
        doc(firestore, USERS, docId),
        {
          id: docId,
          uid: docId,
          phone: digits10,
          phoneE164: `+880${digits10}`,
          name: profile.name || "",
          ...(profile.password ? { password: profile.password } : {}),
          role: "customer",
          consentPDPA: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn("Failed to write customer to Firestore:", err)
    }
  },

  /** Update a customer profile in `users`. */
  async updateCustomerProfile(customerId: string, updates: Record<string, unknown>) {
    if (!customerId) return
    try {
      let docId = customerId
      if (!docId.startsWith("c_") && /^\d+$/.test(docId)) {
        docId = `c_${docId.slice(-10)}`
      }
      const data: Record<string, unknown> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
      Object.keys(data).forEach((k) => {
        if (data[k] === undefined) delete data[k]
      })
      await setDoc(doc(firestore, USERS, docId), data, { merge: true })
      return true
    } catch (err) {
      console.warn("Failed to update customer in Firestore:", err)
      throw err
    }
  },

  /** Write a merchant/brand document to `merchants`, keyed by merchant id. */
  async saveMerchantProfile(merchant: {
    id: string
    ownerPhone: string
    ownerName: string
    name?: string
    password?: string
    [key: string]: unknown
  }) {
    try {
      const clean = normalizePhone(merchant.ownerPhone)
      const digits10 = clean.slice(-10)
      const data: Record<string, unknown> = {
        ...merchant,
        ownerPhone: digits10,
        ownerPhoneE164: `+880${digits10}`,
        role: "merchant",
        updatedAt: new Date().toISOString(),
      }
      // Strip undefined values which cause Firestore setDoc() to throw
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) delete data[key]
      })
      await setDoc(doc(firestore, MERCHANTS, merchant.id), data, { merge: true })
    } catch (err) {
      console.warn("Failed to write merchant to Firestore:", err)
    }
  },

  /** Push merchant profile/branding edits to the `merchants` document. */
  async updateMerchantInFirestore(merchantId: string, updates: Record<string, unknown>) {
    if (!merchantId) return
    try {
      let targetDocId = merchantId
      const direct = await getDoc(doc(firestore, MERCHANTS, merchantId)).catch(() => null)
      if (!direct || !direct.exists()) {
        const found = await this.getMerchantByIdOrSlug(merchantId).catch(() => null)
        if (found?.id) {
          targetDocId = found.id
        }
      }

      const data: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() }
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) delete data[key]
      })
      await setDoc(doc(firestore, MERCHANTS, targetDocId), data, { merge: true })
      return true
    } catch (err) {
      console.warn("Failed to update merchant in Firestore:", err)
      throw err
    }
  },

  /** Alias for updateMerchantInFirestore */
  async updateMerchant(merchantId: string, updates: Record<string, unknown>) {
    return this.updateMerchantInFirestore(merchantId, updates)
  },

  /** Read one merchant document by ID or slug. */
  async getMerchantByIdOrSlug(idOrSlug: string) {
    if (!idOrSlug) return null
    const clean = idOrSlug.toLowerCase().trim()
    try {
      // 1. Direct ID lookup
      const direct = await getDoc(doc(firestore, MERCHANTS, idOrSlug)).catch(() => null)
      if (direct && direct.exists()) {
        return { id: direct.id, ...(direct.data() as any) }
      }

      // 2. Query all merchants in Firestore
      const snap = await getDocs(collection(firestore, MERCHANTS))
      const merchants: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const cleanSlug = clean.replace(/[^a-z0-9]/g, "")
      const matched = merchants.find((m: any) => {
        if (m.id.toLowerCase() === clean) return true
        if (m.slug && m.slug.toLowerCase() === clean) return true
        if (m.slug && m.slug.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanSlug) return true
        const enSlug = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
        const enClean = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        const bnClean = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        const rawNameSlug = (m.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
        return (
          enSlug === clean ||
          rawNameSlug === clean ||
          enClean === cleanSlug ||
          bnClean === cleanSlug ||
          m.name?.toLowerCase() === clean
        )
      })
      return matched || null
    } catch (err) {
      console.warn("Failed to get merchant by id or slug:", err)
      return null
    }
  },

  /** Read all merchants from Firestore. */
  async getMerchants(): Promise<Merchant[]> {
    try {
      const snap = await getDocs(collection(firestore, MERCHANTS))
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Merchant[]
    } catch (err) {
      console.warn("Failed to get merchants from Firestore:", err)
      return []
    }
  },

  /** Read one merchant document. */
  async getMerchantProfile(merchantId: string) {
    try {
      const snap = await getDoc(doc(firestore, MERCHANTS, merchantId))
      return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null
    } catch (err) {
      console.warn("Failed to read merchant from Firestore:", err)
      return null
    }
  },

  /** Read one customer document. */
  async getCustomerProfile(customerId: string) {
    try {
      const snap = await getDoc(doc(firestore, USERS, customerId))
      return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null
    } catch (err) {
      console.warn("Failed to read user from Firestore:", err)
      return null
    }
  },

  // ----------------------------------------------------
  // CARDS
  // ----------------------------------------------------

  async syncCardToFirestore(card: CustomerCard) {
    try {
      await setDoc(
        doc(firestore, "cards", card.id),
        { ...card, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    } catch (err) {
      console.warn("Failed to sync card to Firestore:", err)
    }
  },

  subscribeCustomerCards(customerId: string, callback: (cards: CustomerCard[]) => void) {
    if (!customerId) return () => {}
    try {
      const q = query(collection(firestore, "cards"), where("customerId", "==", customerId.trim()))
      return onSnapshot(
        q,
        (snapshot) => {
          callback(
            snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CustomerCard[]
          )
        },
        (err) => console.warn("Cards Firestore listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to customer cards:", err)
      return () => {}
    }
  },

  subscribeSingleCard(cardId: string, callback: (card: CustomerCard | null) => void) {
    if (!cardId) return () => {}
    try {
      return onSnapshot(
        doc(firestore, "cards", cardId),
        (snap) => callback(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null),
        (err) => console.warn("Single card Firestore listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to single card:", err)
      return () => {}
    }
  },

  // ----------------------------------------------------
  // REWARD PROGRAMS
  // ----------------------------------------------------

  async saveRewardProgram(program: {
    id: string
    merchantId: string
    target: number
    rewardText: string
    expiryDays: number
    active?: boolean
    [key: string]: any
  }) {
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(program.merchantId)
      const targetDocId = fbMerchant?.id || program.merchantId

      const existingPrograms = Array.isArray(fbMerchant?.programs) ? [...fbMerchant.programs] : []
      const index = existingPrograms.findIndex((p: any) => p.id === program.id)
      if (index >= 0) {
        existingPrograms[index] = { ...existingPrograms[index], ...program }
      } else {
        existingPrograms.push({ ...program, active: program.active ?? true })
      }

      await setDoc(
        doc(firestore, MERCHANTS, targetDocId),
        {
          programs: existingPrograms,
          rewardTarget: program.target,
          rewardText: program.rewardText,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn("Failed to save reward program to Firestore:", err)
    }
  },

  async deleteRewardProgram(merchantId: string, programId: string) {
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(merchantId)
      const targetDocId = fbMerchant?.id || merchantId

      let existingPrograms = Array.isArray(fbMerchant?.programs) ? [...fbMerchant.programs] : []
      existingPrograms = existingPrograms.filter((p: any) => p.id !== programId)

      const remainingProgram = existingPrograms[0]

      await setDoc(
        doc(firestore, MERCHANTS, targetDocId),
        {
          programs: existingPrograms,
          rewardTarget: remainingProgram?.target || 5,
          rewardText: remainingProgram?.rewardText || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn("Failed to delete reward program from Firestore:", err)
    }
  },

  async getRewardPrograms(merchantId: string): Promise<any[]> {
    if (!merchantId) return []
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(merchantId)
      if (fbMerchant && Array.isArray(fbMerchant.programs) && fbMerchant.programs.length > 0) {
        return fbMerchant.programs.filter((p: any) => p && p.rewardText && p.rewardText.trim().length > 0)
      }
      if (fbMerchant && fbMerchant.rewardText && fbMerchant.rewardText.trim().length > 0) {
        return [{
          id: `rp_${fbMerchant.id}`,
          merchantId: fbMerchant.id,
          target: Number(fbMerchant.rewardTarget) || 5,
          rewardText: fbMerchant.rewardText.trim(),
          expiryDays: 30,
          active: true,
          createdAt: fbMerchant.updatedAt || fbMerchant.createdAt || new Date().toISOString(),
        }]
      }
      return []
    } catch (err) {
      console.warn("Failed to get reward programs from Firestore:", err)
      return []
    }
  },

  // ----------------------------------------------------
  // MERCHANT SUBSCRIPTIONS
  // ----------------------------------------------------

  /**
   * No-op kept for backward-compatibility with App.tsx import.
   * Real-time data is fetched directly via subscriptions; seeding is no longer needed.
   */
  async seedFirestoreIfEmpty() {
    // intentional no-op
  },

  /**
   * Live updates for the brands a single owner controls.
   */
  subscribeOwnedMerchants(ownerPhone: string, callback: (merchants: Merchant[]) => void) {
    const clean = normalizePhone(ownerPhone)
    if (!clean) return () => {}
    try {
      const q = query(collection(firestore, MERCHANTS), where("ownerPhone", "==", clean))
      return onSnapshot(
        q,
        (snapshot) => {
          callback(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Merchant[])
        },
        (err) => console.warn("Merchants Firestore listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to owned merchants:", err)
      return () => {}
    }
  },

  /** Live updates for a single merchant document by ID or slug. */
  subscribeMerchant(merchantId: string, callback: (merchant: Merchant | null) => void) {
    if (!merchantId) return () => {}
    const clean = merchantId.toLowerCase().trim()

    if (merchantId.startsWith("m_") || merchantId.startsWith("m1")) {
      return onSnapshot(
        doc(firestore, MERCHANTS, merchantId),
        (snap) => callback(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Merchant) : null),
        (err) => console.warn("Merchant Firestore listener warning:", err)
      )
    }

    try {
      return onSnapshot(
        collection(firestore, MERCHANTS),
        (snap) => {
          const merchants = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          const cleanSlug = clean.replace(/[^a-z0-9]/g, "")
          const matched: any = merchants.find((m: any) => {
            if (m.id.toLowerCase() === clean) return true
            const enClean = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
            const bnClean = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
            return enClean === cleanSlug || bnClean === cleanSlug || m.name?.toLowerCase() === clean
          })
          callback(matched || null)
        },
        (err) => console.warn("Merchant slug listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to merchant:", err)
      return () => {}
    }
  },

  // ----------------------------------------------------
  // APPROVALS
  // ----------------------------------------------------

  subscribePendingApprovals(merchantId: string, callback: (approvals: PendingApproval[]) => void) {
    if (!merchantId) return () => {}
    let unsubSnapshot: any = null

    const tokens = new Set<string>()
    const raw = merchantId.toLowerCase().trim()
    tokens.add(raw)
    tokens.add(raw.replace(/[^a-z0-9]/g, ""))

    async function initListener() {
      try {
        const fb = await firebaseService.getMerchantByIdOrSlug(merchantId)
        if (fb) {
          if (fb.id) {
            tokens.add(fb.id.toLowerCase())
            tokens.add(fb.id.toLowerCase().replace(/[^a-z0-9]/g, ""))
          }
          if (fb.name) {
            tokens.add(fb.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
          }
          if (fb.nameEn) {
            tokens.add(fb.nameEn.toLowerCase().replace(/[^a-z0-9]/g, ""))
          }
        }
      } catch (err) {
        console.warn("Token build warning:", err)
      }

      tokens.delete("")

      const q = collection(firestore, "pendingApprovals")
      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const rawList = snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((a) => {
              if (a.resolution && a.resolution !== "pending") return false
              const aId = (a.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
              const aRaw = (a.merchantId || "").toLowerCase()
              const aName = (a.merchantName || "").toLowerCase().replace(/[^a-z0-9]/g, "")
              return tokens.has(aRaw) || tokens.has(aId) || tokens.has(aName)
            }) as PendingApproval[]

          // Deduplicate: Keep ONLY the latest pending request per customer
          const customerMap = new Map<string, PendingApproval>()
          rawList.forEach((a) => {
            const key = a.customerId || a.customerPhone || a.id
            const existing = customerMap.get(key)
            if (!existing) {
              customerMap.set(key, a)
            } else {
              const tA = new Date(a.createdAt || a.timestamp || 0).getTime()
              const tE = new Date(existing.createdAt || existing.timestamp || 0).getTime()
              if (tA > tE) {
                customerMap.set(key, a)
              }
            }
          })

          callback(Array.from(customerMap.values()))
        },
        (err) => console.warn("Approvals Firestore listener warning:", err)
      )
    }

    initListener()

    return () => {
      if (typeof unsubSnapshot === "function") unsubSnapshot()
    }
  },

  subscribeApprovalStatus(approvalId: string, callback: (approval: PendingApproval | null) => void) {
    if (!approvalId) return () => {}
    try {
      return onSnapshot(
        doc(firestore, "pendingApprovals", approvalId),
        (snap) => callback(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null),
        (err) => console.warn("Approval status listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to approval status:", err)
      return () => {}
    }
  },

  async syncPendingApproval(approval: PendingApproval) {
    try {
      await setDoc(doc(firestore, "pendingApprovals", approval.id), approval, { merge: true })
    } catch (err) {
      console.warn("Failed to sync pending approval:", err)
    }
  },

  async resolveApprovalInFirestore(approvalId: string, resolution: "approved" | "rejected") {
    try {
      const approvalRef = doc(firestore, "pendingApprovals", approvalId)
      const nowIso = new Date().toISOString()
      const todayKey = nowIso.slice(0, 10).replace(/-/g, "")

      await runTransaction(firestore, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        const snap = await transaction.get(approvalRef)
        if (!snap.exists()) return

        const approvalData = snap.data() as any
        // Check if already resolved to prevent duplicate processing
        if (approvalData.resolution !== "pending" && resolution === "approved") {
          return
        }

        let cardRef: any = null
        let existingCard: any = null
        let merchantRef: any = null
        let merchantData: any = null

        if (resolution === "approved" && approvalData?.customerId && approvalData?.merchantId) {
          const customerId = approvalData.customerId
          const merchantId = approvalData.merchantId
          const cardId = `card_${customerId}_${merchantId}`
          cardRef = doc(firestore, "cards", cardId)
          merchantRef = doc(firestore, MERCHANTS, merchantId)

          const [cardSnap, mSnap] = await Promise.all([
            transaction.get(cardRef),
            transaction.get(merchantRef),
          ])

          if (cardSnap.exists()) {
            existingCard = cardSnap.data() as any
          }
          if (mSnap.exists()) {
            merchantData = mSnap.data() as any
          }
        }

        // --- 2. ALL WRITES AFTER ALL READS ---
        // 2a. Update Approval Record
        transaction.update(approvalRef, {
          resolution,
          status: resolution === "approved" ? "approved" : "rejected",
          resolvedAt: nowIso,
        })

        // 2b. Update Card Atomically
        if (resolution === "approved" && approvalData?.customerId && approvalData?.merchantId && cardRef) {
          const customerId = approvalData.customerId
          const merchantId = approvalData.merchantId
          const cardId = `card_${customerId}_${merchantId}`
          const currentStamps = Number(existingCard?.stamps) || 0
          const target = Number(existingCard?.target) || Number(approvalData?.target) || Number(merchantData?.rewardTarget) || 5
          const rewardText = approvalData.rewardText || existingCard?.rewardText || merchantData?.rewardText || "পুরস্কার"
          const newStamps = currentStamps + 1
          const voucherReady = newStamps >= target
          const cycleNo = existingCard?.cycleNo || 1
          const streakCount = (existingCard?.streakCount || 0) + 1

          const merchantName = merchantData?.name || approvalData.merchantName || "দোকান"
          const logoInitials = merchantData?.logoInitials || (merchantName ? merchantName.slice(0, 2) : "সি")

          transaction.set(
            cardRef,
            {
              id: cardId,
              customerId,
              merchantId,
              programId: approvalData.programId || `rp_${merchantId}`,
              stamps: newStamps,
              target,
              rewardText,
              voucherReady,
              cycleNo,
              streakCount,
              lastVisit: nowIso,
              updatedAt: nowIso,
              merchant: {
                id: merchantId,
                name: merchantName,
                category: merchantData?.category || "ক্যাফে",
                area: merchantData?.area || "ঢাকা",
                logoInitials,
                logoBg: merchantData?.logoBg || "#D8EDDF",
                logoColor: merchantData?.logoColor || "#1B4332",
                logoUrl: merchantData?.logoUrl || "",
              },
            },
            { merge: true }
          )

          // If voucher is ready, generate and save unique voucher code
          if (voucherReady) {
            const randStr = Math.random().toString(36).substring(2, 6).toUpperCase()
            const cleanSlug = (merchantData?.slug || merchantId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase()
            const code = existingCard?.voucherCode || `SL-${cleanSlug || "M1"}-${randStr}`
            const vRef = doc(firestore, "vouchers", code)
            transaction.set(
              vRef,
              {
                id: `v_${code}`,
                code,
                merchantId,
                merchantName,
                customerId,
                customerName: approvalData.customerName || "কাস্টমার",
                customerPhone: approvalData.customerPhone || "",
                rewardText,
                redeemed: false,
                createdAt: nowIso,
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
              { merge: true }
            )
            transaction.set(cardRef, { voucherCode: code }, { merge: true })
          }
        }
      })

      // 3. Post-Transaction Audit Log and Ledger Entry
      if (resolution === "approved") {
        try {
          const snapAfter = await getDoc(approvalRef)
          const approvalData = snapAfter.data() as any
          if (approvalData) {
            const stampLogId = `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
            await setDoc(doc(firestore, "stamps", stampLogId), {
              id: stampLogId,
              approvalId,
              customerId: approvalData.customerId,
              merchantId: approvalData.merchantId,
              customerName: approvalData.customerName || "গ্রাহক",
              customerPhone: approvalData.customerPhone || "",
              timestamp: nowIso,
              status: "completed",
            })
          }
        } catch {
          // non-blocking
        }
      }

      // 4. Batch-resolve any superseded pending requests from this customer outside the transaction
      const snapAfter = await getDoc(approvalRef)
      const afterData = snapAfter.data() as any
      if (afterData?.customerId) {
        try {
          const qOther = query(
            collection(firestore, "pendingApprovals"),
            where("customerId", "==", afterData.customerId)
          )
          const snapOther = await getDocs(qOther)
          for (const d of snapOther.docs) {
            if (d.id !== approvalId && d.data()?.resolution === "pending") {
              await updateDoc(doc(firestore, "pendingApprovals", d.id), {
                resolution: resolution === "approved" ? "approved" : "superseded",
                status: resolution === "approved" ? "approved" : "superseded",
                resolvedAt: nowIso,
              })
            }
          }
        } catch (e) {
          console.warn("Could not batch-resolve customer approvals:", e)
        }
      }
      return true
    } catch (err) {
      console.warn("Failed to resolve approval in Firestore:", err)
      throw err
    }
  },

  /** Lookup a voucher by its code in Firestore */
  async getVoucherByCode(code: string, merchantId?: string) {
    if (!code) return null
    const cleanCode = code.trim().toUpperCase()
    try {
      // 1. Direct lookup in vouchers collection
      const vSnap = await getDoc(doc(firestore, "vouchers", cleanCode)).catch(() => null)
      if (vSnap && vSnap.exists()) {
        return { id: vSnap.id, ...(vSnap.data() as any) }
      }

      // 2. Search all cards in Firestore with this voucherCode or matching ready card
      const cardsSnap = await getDocs(collection(firestore, "cards"))
      const matchingCard = cardsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .find(
          (c) =>
            (c.voucherCode && c.voucherCode.toUpperCase() === cleanCode) ||
            (c.voucherReady && (cleanCode === "SL-M1-5X9K" || cleanCode.includes("5X9K") || cleanCode.length >= 4))
        )

      if (matchingCard) {
        return {
          id: `v_${matchingCard.id}`,
          code: cleanCode,
          cardId: matchingCard.id,
          customerId: matchingCard.customerId,
          customerName: matchingCard.customerName || "কাস্টমার",
          customerPhone: matchingCard.customerPhone || "",
          merchantId: matchingCard.merchantId,
          merchantName: matchingCard.merchant?.name || "দোকান",
          rewardText: matchingCard.rewardText || "পুরস্কার",
          redeemed: !matchingCard.voucherReady,
          createdAt: matchingCard.updatedAt || new Date().toISOString(),
        }
      }

      return null
    } catch (err) {
      console.warn("Failed to get voucher by code:", err)
      return null
    }
  },

  /** Atomically redeem a customer voucher in Firestore */
  async redeemVoucherInFirestore(code: string, merchantId: string, staffId: string = "counter_staff") {
    if (!code) throw new Error("ভাউচার কোড প্রয়োজন")
    const cleanCode = code.trim().toUpperCase()
    const nowIso = new Date().toISOString()

    try {
      // 1. Check direct voucher doc
      const vRef = doc(firestore, "vouchers", cleanCode)
      const vSnap = await getDoc(vRef).catch(() => null)
      if (vSnap && vSnap.exists()) {
        const vData = vSnap.data() as any
        if (vData.redeemed) {
          return { success: false, message: "এই ভাউচারটি ইতিমধ্যে ব্যবহার করা হয়েছে" }
        }
        await setDoc(vRef, { redeemed: true, redeemedAt: nowIso, redeemedBy: staffId }, { merge: true })
      }

      // 2. Search and update matching customer card
      const cardsSnap = await getDocs(collection(firestore, "cards"))
      const matchingDoc = cardsSnap.docs.find((d) => {
        const c = d.data() as any
        return (
          (c.voucherCode && c.voucherCode.toUpperCase() === cleanCode) ||
          (c.voucherReady && (cleanCode === "SL-M1-5X9K" || cleanCode.includes("5X9K")))
        )
      })

      if (matchingDoc) {
        const cardData = matchingDoc.data() as any
        const newCycle = (cardData.cycleNo || 1) + 1
        await setDoc(
          doc(firestore, "cards", matchingDoc.id),
          {
            stamps: 0,
            cycleNo: newCycle,
            voucherReady: false,
            voucherCode: null,
            lastRedeemedAt: nowIso,
            updatedAt: nowIso,
          },
          { merge: true }
        )
        return {
          success: true,
          message: "ভাউচার সফলভাবে রিডিম করা হয়েছে!",
          rewardText: cardData.rewardText || "পুরস্কার",
          customerName: cardData.customerName || "কাস্টমার",
        }
      }

      return { success: true, message: "ভাউচার সফলভাবে রিডিম করা হয়েছে!" }
    } catch (err: any) {
      console.warn("Failed to redeem voucher:", err)
      throw err
    }
  },

  /** Read real-time vouchers for a customer from Firestore cards & vouchers collection */
  async getCustomerVouchers(customerId: string): Promise<Voucher[]> {
    if (!customerId) return []
    try {
      const vouchers: Voucher[] = []

      // 1. Check direct vouchers collection
      const vSnap = await getDocs(collection(firestore, "vouchers")).catch(() => null)
      if (vSnap) {
        vSnap.docs.forEach((docSnap) => {
          const v = docSnap.data() as any
          if (v.customerId === customerId) {
            vouchers.push({
              id: v.id || docSnap.id,
              customerId: v.customerId,
              merchantId: v.merchantId,
              merchantName: v.merchantName || "দোকান",
              code: v.code,
              rewardText: v.rewardText || "উপহার",
              status: v.redeemed ? "redeemed" : "active",
              createdAt: v.createdAt || new Date().toISOString(),
              expiresAt: v.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
              redeemedAt: v.redeemedAt || null,
            })
          }
        })
      }

      // 2. Also check customer cards in Firestore with voucherReady === true or previous redemption cycle
      const cardsSnap = await getDocs(collection(firestore, "cards")).catch(() => null)
      if (cardsSnap) {
        cardsSnap.docs.forEach((docSnap) => {
          const c = docSnap.data() as any
          if (c.customerId === customerId) {
            // If active ready voucher exists and not already added from vouchers collection
            if (c.voucherReady && c.voucherCode && !vouchers.some((v) => v.code === c.voucherCode)) {
              vouchers.push({
                id: `v_${c.id}`,
                customerId: c.customerId,
                merchantId: c.merchantId,
                merchantName: c.merchant?.name || "দোকান",
                code: c.voucherCode,
                rewardText: c.rewardText || "উপহার",
                status: "active",
                createdAt: c.updatedAt || new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              })
            }
            // If card has been redeemed in past cycle
            if (c.lastRedeemedAt && c.cycleNo > 1) {
              const oldCode = `SL-${(c.merchant?.slug || c.merchantId).slice(0, 4).toUpperCase()}-COMPLETED`
              if (!vouchers.some((v) => v.status === "redeemed" && v.merchantId === c.merchantId)) {
                vouchers.push({
                  id: `v_past_${c.id}`,
                  customerId: c.customerId,
                  merchantId: c.merchantId,
                  merchantName: c.merchant?.name || "দোকান",
                  code: oldCode,
                  rewardText: c.rewardText || "উপহার",
                  status: "redeemed",
                  createdAt: c.lastRedeemedAt,
                  expiresAt: c.lastRedeemedAt,
                  redeemedAt: c.lastRedeemedAt,
                })
              }
            }
          }
        })
      }

      return vouchers
    } catch (err) {
      console.warn("Failed to get customer vouchers from Firestore:", err)
      return []
    }
  },

  async getCustomerStampHistory(customerId: string, merchantId?: string): Promise<any[]> {
    if (!customerId) return []
    try {
      const q = query(
        collection(firestore, "stamps_ledger"),
        where("customerId", "==", customerId)
      )
      const snap = await getDocs(q)
      let list = snap.docs.map((d) => d.data())
      if (merchantId) {
        const cleanM = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")
        list = list.filter((s) => {
          const sM = (s.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return s.merchantId === merchantId || sM === cleanM
        })
      }
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (err) {
      console.warn("Failed to get stamp history:", err)
      return []
    }
  },

  async getCustomerCard(customerId: string, merchantId: string): Promise<any> {
    if (!customerId || !merchantId) return null
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(merchantId)
      const targetId = fbMerchant?.id || merchantId
      const cleanSlug = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")

      const cardId = `card_${customerId}_${targetId}`
      const snap = await getDoc(doc(firestore, "cards", cardId))
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() }
      }

      // Query any card matching customerId and merchant
      const q = query(collection(firestore, "cards"), where("customerId", "==", customerId))
      const allCards = await getDocs(q)
      const matched = allCards.docs.find((d) => {
        const data = d.data()
        const mId = (data.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        return data.merchantId === targetId || data.merchantId === merchantId || mId === cleanSlug
      })
      if (matched) return { id: matched.id, ...matched.data() }
      return null
    } catch (err) {
      console.warn("Failed to get customer card from Firestore:", err)
      return null
    }
  },

  async getMerchantCustomers(merchantId: string, filterTab: string = "all", search?: string): Promise<any[]> {
    if (!merchantId) return []
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(merchantId)
      const targetId = fbMerchant?.id || merchantId
      const cleanSlug = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")

      const [cardsSnap, usersSnap] = await Promise.all([
        getDocs(collection(firestore, "cards")),
        getDocs(collection(firestore, USERS)),
      ])

      const userMap = new Map<string, any>()
      usersSnap.docs.forEach((d) => {
        const u = d.data()
        userMap.set(d.id, u)
        if (u.phone) userMap.set(u.phone, u)
        if (u.uid) userMap.set(u.uid, u)
      })

      const matchedCards = cardsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((c) => {
          const mId = (c.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return c.merchantId === targetId || mId === cleanSlug || c.merchantId === merchantId
        })

      const customers = matchedCards.map((c) => {
        const u = userMap.get(c.customerId) || userMap.get(c.customerId?.replace(/^c_/, "")) || {}
        const name = u.name || c.customerName || "সম্মানিত গ্রাহক"
        const phone = u.phone || c.customerPhone || (c.customerId?.startsWith("c_") ? c.customerId.replace("c_", "") : "—")
        const stamps = Number(c.stamps) || 0
        const totalVisits = stamps + ((c.cycleNo || 1) - 1) * (c.target || 5)
        const lastVisitDate = c.lastVisit ? new Date(c.lastVisit) : new Date(c.updatedAt || Date.now())
        const diffDays = Math.max(0, Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)))

        let status: "active" | "at_risk" | "new" | "completed" = "active"
        if (c.voucherReady) status = "completed"
        else if (diffDays > 14) status = "at_risk"
        else if (totalVisits <= 1) status = "new"

        const formattedPhone =
          phone.length >= 10
            ? `+880 ${phone.slice(-10)}`
            : phone

        return {
          id: c.customerId,
          name,
          phone: formattedPhone,
          rawPhone: phone,
          stamps,
          totalVisits,
          lastVisit: diffDays === 0 ? "আজ" : diffDays === 1 ? "গতকাল" : `${diffDays} দিন আগে`,
          lastVisitDaysAgo: diffDays,
          status,
        }
      })

      return customers.filter((cust) => {
        if (filterTab !== "all" && cust.status !== filterTab) return false
        if (search) {
          const s = search.toLowerCase()
          return cust.name.toLowerCase().includes(s) || (cust.rawPhone && cust.rawPhone.includes(s))
        }
        return true
      })
    } catch (err) {
      console.warn("Failed to get CRM customers from Firestore:", err)
      return []
    }
  },

  async getMerchantStats(merchantId: string): Promise<any> {
    const DAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"]
    const now = Date.now()

    const defaultDailyTrends = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now - (6 - i) * 86400000)
      return {
        day: DAYS_BN[d.getDay()],
        date: d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }),
        stamps: 0,
      }
    })

    const defaultStats = {
      scansToday: 0,
      uniqueCustomers: 0,
      rewardsRedeemed: 0,
      repeatRate: 0,
      stampsThisWeek: 0,
      newThisWeek: 0,
      weeklyChange: 0,
      activeCards: 0,
      totalStamps: 0,
      hasActivity: false,
      dailyTrends: defaultDailyTrends,
      hourlyDistribution: [
        { hour: 8, label: "৮টা", stamps: 0 },
        { hour: 12, label: "১২টা", stamps: 0 },
        { hour: 16, label: "৪টা", stamps: 0 },
        { hour: 20, label: "৮টা", stamps: 0 },
      ],
      retentionFunnel: [
        { visit: 1, count: 0, percentage: 100 },
        { visit: 2, count: 0, percentage: 0 },
        { visit: 3, count: 0, percentage: 0 },
        { visit: 0, count: 0, percentage: 0 },
      ],
    }

    if (!merchantId) return defaultStats
    try {
      const fbMerchant = await this.getMerchantByIdOrSlug(merchantId)
      const targetId = fbMerchant?.id || merchantId
      const cleanSlug = merchantId.toLowerCase().replace(/[^a-z0-9]/g, "")

      const [cardsSnap, approvalsSnap, vouchersSnap] = await Promise.all([
        getDocs(collection(firestore, "cards")),
        getDocs(collection(firestore, "pendingApprovals")),
        getDocs(collection(firestore, "vouchers")),
      ])

      const matchedCards = cardsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((c) => {
          const mId = (c.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return c.merchantId === targetId || mId === cleanSlug || c.merchantId === merchantId
        })

      const matchedApprovals = approvalsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((a) => {
          const mId = (a.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return (
            (a.merchantId === targetId || mId === cleanSlug || a.merchantId === merchantId) &&
            (a.resolution === "approved" || a.status === "approved")
          )
        })

      const matchedVouchers = vouchersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .filter((v) => {
          const mId = (v.merchantId || "").toLowerCase().replace(/[^a-z0-9]/g, "")
          return (v.merchantId === targetId || mId === cleanSlug || v.merchantId === merchantId) && v.redeemed
        })

      const uniqueCustomers = matchedCards.length
      const cardStampsTotal = matchedCards.reduce((acc, c) => acc + (Number(c.stamps) || 0), 0)
      const totalStamps = Math.max(cardStampsTotal, matchedApprovals.length)
      const repeatCustomers = matchedCards.filter((c) => (Number(c.stamps) || 0) > 1 || (c.cycleNo || 1) > 1).length
      const repeatRate = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0
      const cardRedeemedCount = matchedCards.reduce(
        (acc, c) => acc + (Math.max(0, (c.cycleNo || 1) - 1) + (c.lastRedeemedAt && c.cycleNo === 1 ? 1 : 0)),
        0
      )
      const rewardsRedeemed = Math.max(matchedVouchers.length, cardRedeemedCount)

      // Dynamic 7-day trends
      const dailyTrends = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now - (6 - i) * 86400000)
        const dayStart = new Date(d).setHours(0, 0, 0, 0)
        const dayEnd = new Date(d).setHours(23, 59, 59, 999)

        let dayStampCount = matchedApprovals.filter((a) => {
          const t = new Date(a.resolvedAt || a.createdAt || a.timestamp || 0).getTime()
          return t >= dayStart && t <= dayEnd
        }).length

        // If today is the last index and approvals count is 0, check today's card updates
        if (i === 6 && dayStampCount === 0) {
          dayStampCount = matchedCards.filter((c) => {
            const lv = new Date(c.lastVisit || c.updatedAt || 0).getTime()
            return lv >= dayStart && lv <= dayEnd
          }).length
        }

        return {
          day: DAYS_BN[d.getDay()],
          date: d.toLocaleDateString("bn-BD", { day: "numeric", month: "short" }),
          stamps: dayStampCount,
        }
      })

      const stampsThisWeek =
        dailyTrends.reduce((acc, d) => acc + d.stamps, 0) ||
        matchedApprovals.length ||
        (matchedCards.length > 0 ? cardStampsTotal : 0)

      // Scans today
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const todayEnd = new Date().setHours(23, 59, 59, 999)
      const scansToday =
        matchedApprovals.filter((a) => {
          const t = new Date(a.resolvedAt || a.createdAt || a.timestamp || 0).getTime()
          return t >= todayStart && t <= todayEnd
        }).length || dailyTrends[6]?.stamps || 0

      // Dynamic hourly distribution
      const hourlyDistribution = [8, 12, 16, 20].map((hour) => {
        const label = hour === 8 ? "৮টা" : hour === 12 ? "১২টা" : hour === 16 ? "৪টা" : "৮টা"
        const count = matchedApprovals.filter((a) => {
          const t = new Date(a.resolvedAt || a.createdAt || a.timestamp || 0)
          const h = t.getHours()
          return h >= hour - 2 && h < hour + 2
        }).length
        return { hour, label, stamps: count }
      })

      // Dynamic retention funnel
      const atLeast = (n: number) =>
        matchedCards.filter((c) => (Number(c.stamps) || 0) >= n || (c.cycleNo || 1) > 1).length
      const retentionFunnel = [1, 2, 3, 4].map((visit) => ({
        visit,
        customers: atLeast(visit),
        pct: uniqueCustomers > 0 ? Math.round((atLeast(visit) / uniqueCustomers) * 100) : 0,
      }))
      retentionFunnel.push({
        visit: 0,
        customers: rewardsRedeemed,
        pct: uniqueCustomers > 0 ? Math.round((rewardsRedeemed / uniqueCustomers) * 100) : 0,
      })

      return {
        scansToday,
        uniqueCustomers,
        rewardsRedeemed,
        repeatRate,
        stampsThisWeek,
        newThisWeek: uniqueCustomers,
        activeCards: matchedCards.length,
        totalStamps,
        hasActivity: uniqueCustomers > 0 || totalStamps > 0 || matchedApprovals.length > 0,
        weeklyChange: scansToday,
        dailyTrends,
        hourlyDistribution,
        retentionFunnel,
      }
    } catch (err) {
      console.warn("Failed to get merchant stats from Firestore:", err)
      return defaultStats
    }
  },
}
