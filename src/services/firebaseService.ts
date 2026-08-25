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
        return { id: directDoc.id, ...(directDoc.data() as any) }
      }

      const usersCol = collection(firestore, USERS)
      for (const value of possibleValues) {
        const snap = await getDocs(query(usersCol, where("phone", "==", value)))
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
    try {
      const data: Record<string, unknown> = { ...updates, updatedAt: new Date().toISOString() }
      Object.keys(data).forEach((key) => {
        if (data[key] === undefined) delete data[key]
      })
      await setDoc(doc(firestore, MERCHANTS, merchantId), data, { merge: true })
    } catch (err) {
      console.warn("Failed to update merchant in Firestore:", err)
    }
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
      const matched = merchants.find((m) => {
        if (m.id.toLowerCase() === clean) return true
        const enSlug = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
        const enClean = (m.nameEn || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        const bnClean = (m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
        return (
          enSlug === clean ||
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
      await setDoc(
        doc(firestore, "rewardPrograms", program.id),
        {
          ...program,
          active: program.active ?? true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    } catch (err) {
      console.warn("Failed to save reward program to Firestore:", err)
    }
  },

  async getRewardPrograms(merchantId: string): Promise<any[]> {
    if (!merchantId) return []
    try {
      const q = query(collection(firestore, "rewardPrograms"), where("merchantId", "==", merchantId))
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
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
   *
   * Deliberately filtered by `ownerPhone` — the console must never receive the
   * full merchant directory.
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

  /** Live updates for a single merchant document. */
  subscribeMerchant(merchantId: string, callback: (merchant: Merchant | null) => void) {
    if (!merchantId) return () => {}
    try {
      return onSnapshot(
        doc(firestore, MERCHANTS, merchantId),
        (snap) => callback(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Merchant) : null),
        (err) => console.warn("Merchant Firestore listener warning:", err)
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
    try {
      const q = query(
        collection(firestore, "pendingApprovals"),
        where("merchantId", "==", merchantId),
        where("resolution", "==", "pending")
      )
      return onSnapshot(
        q,
        (snapshot) => {
          callback(
            snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PendingApproval[]
          )
        },
        (err) => console.warn("Approvals Firestore listener warning:", err)
      )
    } catch (err) {
      console.error("Failed to subscribe to approvals:", err)
      return () => {}
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
      await updateDoc(doc(firestore, "pendingApprovals", approvalId), {
        resolution,
        resolvedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.warn("Failed to resolve approval in Firestore:", err)
    }
  },
}
