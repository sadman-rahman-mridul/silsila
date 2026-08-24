import fs from "node:fs"
import path from "node:path"
import type {
  DatabaseSchema,
  Merchant,
  RewardProgram,
  CustomerCard,
  Customer,
  Staff,
  PendingApproval,
  Stamp,
  Voucher,
  FraudSignal,
  Sponsor
} from "./types.js"

const DATA_DIR = path.join(process.cwd(), "data")
const DB_FILE = path.join(DATA_DIR, "silsila_db.json")

// Helper function to calculate Haversine distance in meters
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

const SCHEMA_VERSION = 2

function getInitialData(): DatabaseSchema {
  // Silsila ships with an EMPTY database. Every merchant, customer, card, stamp
  // and voucher below is created at runtime from real user activity only.
  // Never seed demo/sample records here — merchants must see their own data.
  return {
    version: SCHEMA_VERSION,
    sponsors: [],
    merchants: [],
    staff: [],
    customers: [],
    rewardPrograms: [],
    cards: [],
    pendingApprovals: [],
    stamps: [],
    vouchers: [],
    fraudSignals: [],
  }
}

class Database {
  private data: DatabaseSchema

  constructor() {
    this.ensureDirectory()
    this.data = this.load()
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8")
        const parsed = JSON.parse(raw) as DatabaseSchema
        // Older database files were shipped pre-populated with demo merchants,
        // customers and stamps. Any file below the current schema version is
        // discarded so no console ever renders seeded data.
        if (parsed.version === SCHEMA_VERSION) {
          return parsed
        }
        console.warn(
          `[Silsila DB] Discarding legacy database (version ${parsed.version ?? "none"}) that contained seed data.`
        )
      }
    } catch (err) {
      console.error("Error reading database file, starting from an empty database:", err)
    }
    const initial = getInitialData()
    this.saveDirect(initial)
    return initial
  }

  private saveDirect(data: DatabaseSchema) {
    try {
      this.ensureDirectory()
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8")
    } catch (err) {
      console.error("Error saving database file:", err)
    }
  }

  public save() {
    this.saveDirect(this.data)
  }

  public getData(): DatabaseSchema {
    return this.data
  }

  // --- MERCHANTS ---
  public getMerchants(): Merchant[] {
    return this.data.merchants
  }

  public getMerchantById(id: string): Merchant | undefined {
    return this.data.merchants.find((m) => m.id === id)
  }

  /** Every merchant (brand) owned by one phone number. A merchant only ever sees these. */
  public getMerchantsByOwnerPhone(phone: string): Merchant[] {
    const clean = phone.replace(/\D/g, "").slice(-10)
    if (!clean) return []
    return this.data.merchants.filter((m) => m.ownerPhone?.replace(/\D/g, "").slice(-10) === clean)
  }

  public isMerchantOwnedBy(merchantId: string, ownerPhone: string): boolean {
    const merchant = this.getMerchantById(merchantId)
    if (!merchant) return false
    const clean = ownerPhone.replace(/\D/g, "").slice(-10)
    return !!clean && merchant.ownerPhone?.replace(/\D/g, "").slice(-10) === clean
  }

  public addMerchant(merchant: Merchant): Merchant {
    this.data.merchants.push(merchant)
    this.save()
    return merchant
  }

  public updateMerchant(id: string, updates: Partial<Merchant>): Merchant | null {
    const idx = this.data.merchants.findIndex((m) => m.id === id)
    if (idx === -1) return null
    this.data.merchants[idx] = { ...this.data.merchants[idx], ...updates }
    this.save()
    return this.data.merchants[idx]
  }

  // --- REWARD PROGRAMS ---
  public getProgramsByMerchant(merchantId: string): RewardProgram[] {
    return this.data.rewardPrograms.filter((p) => p.merchantId === merchantId)
  }

  public getProgramById(id: string): RewardProgram | undefined {
    return this.data.rewardPrograms.find((p) => p.id === id)
  }

  public addRewardProgram(program: RewardProgram): RewardProgram {
    this.data.rewardPrograms.push(program)
    this.save()
    return program
  }

  public updateRewardProgram(id: string, updates: Partial<RewardProgram>): RewardProgram | null {
    const idx = this.data.rewardPrograms.findIndex((p) => p.id === id)
    if (idx === -1) return null
    this.data.rewardPrograms[idx] = { ...this.data.rewardPrograms[idx], ...updates }
    this.save()
    return this.data.rewardPrograms[idx]
  }

  // --- CUSTOMERS ---
  public getCustomers(): Customer[] {
    return this.data.customers
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id)
  }

  public getCustomerByPhone(phone: string): Customer | undefined {
    const clean = phone.replace(/\D/g, "")
    return this.data.customers.find((c) => c.phone.replace(/\D/g, "") === clean)
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const idx = this.data.customers.findIndex((c) => c.id === id)
    if (idx === -1) return null
    this.data.customers[idx] = { ...this.data.customers[idx], ...updates }
    this.save()
    return this.data.customers[idx]
  }

  public addOrUpdateCustomer(cust: Partial<Customer> & { phone: string }): Customer {
    const existing = this.getCustomerByPhone(cust.phone)
    if (existing) {
      Object.assign(existing, cust)
      this.save()
      return existing
    }
    const newCustomer: Customer = {
      id: `c_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      phone: cust.phone,
      name: cust.name || "",
      locale: cust.locale || "bn",
      consentGiven: cust.consentGiven ?? true,
      consentTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      totalStamps: cust.totalStamps || 0,
      totalVisits: cust.totalVisits || 0,
      cardsCompleted: cust.cardsCompleted || 0,
    }
    this.data.customers.push(newCustomer)
    this.save()
    return newCustomer
  }

  public deleteCustomerData(customerId: string): boolean {
    this.data.customers = this.data.customers.filter((c) => c.id !== customerId)
    this.data.cards = this.data.cards.filter((card) => card.customerId !== customerId)
    this.data.stamps = this.data.stamps.filter((s) => s.customerId !== customerId)
    this.data.vouchers = this.data.vouchers.filter((v) => v.customerId !== customerId)
    this.data.pendingApprovals = this.data.pendingApprovals.filter((pa) => pa.customerId !== customerId)
    this.save()
    return true
  }

  // --- CARDS ---
  public getCardsByCustomer(customerId: string): CustomerCard[] {
    return this.data.cards.filter((c) => c.customerId === customerId)
  }

  public getCard(customerId: string, merchantId: string): CustomerCard | undefined {
    return this.data.cards.find((c) => c.customerId === customerId && c.merchantId === merchantId)
  }

  public getCardById(id: string): CustomerCard | undefined {
    return this.data.cards.find((c) => c.id === id)
  }

  public getOrCreateCard(customerId: string, merchantId: string): CustomerCard {
    let card = this.getCard(customerId, merchantId)
    if (!card) {
      const programs = this.getProgramsByMerchant(merchantId)
      const prog = programs.find((p) => p.active) || programs[0]
      const programId = prog ? prog.id : `rp_${merchantId}`
      card = {
        id: `cc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        customerId,
        merchantId,
        programId,
        stamps: 0,
        cycleNo: 1,
        streakCount: 0,
        graceUsed: false,
        lastVisit: "প্রথম আগমন",
        lastVisitTimestamp: 0,
        voucherReady: false,
        createdAt: new Date().toISOString(),
      }
      this.data.cards.push(card)
      this.save()
    }
    return card
  }

  public updateCard(id: string, updates: Partial<CustomerCard>): CustomerCard | null {
    const idx = this.data.cards.findIndex((c) => c.id === id)
    if (idx === -1) return null
    this.data.cards[idx] = { ...this.data.cards[idx], ...updates }
    this.save()
    return this.data.cards[idx]
  }

  // --- PENDING APPROVALS ---
  public getPendingApprovals(merchantId?: string): PendingApproval[] {
    const now = Date.now()
    // Auto-expire approvals older than 10 minutes
    this.data.pendingApprovals.forEach((pa) => {
      if (pa.resolution === "pending" && new Date(pa.expiresAt).getTime() < now) {
        pa.resolution = "expired"
      }
    })
    return this.data.pendingApprovals.filter((pa) => {
      const isPending = pa.resolution === "pending"
      return merchantId ? pa.merchantId === merchantId && isPending : isPending
    })
  }

  public addPendingApproval(pa: PendingApproval): PendingApproval {
    this.data.pendingApprovals.push(pa)
    this.save()
    return pa
  }

  public getPendingApprovalById(id: string): PendingApproval | undefined {
    return this.data.pendingApprovals.find((pa) => pa.id === id)
  }

  public resolvePendingApproval(
    id: string,
    resolution: "approved" | "rejected",
    staffId: string
  ): { approval: PendingApproval; stamp?: Stamp; card?: CustomerCard; voucher?: Voucher } | null {
    const approval = this.getPendingApprovalById(id)
    if (!approval || approval.resolution !== "pending") return null

    approval.resolution = resolution
    approval.resolvedBy = staffId
    approval.resolvedAt = new Date().toISOString()

    if (resolution === "rejected") {
      this.save()
      return { approval }
    }

    // Process stamp approval
    const card = this.getOrCreateCard(approval.customerId, approval.merchantId)
    const program = this.getProgramById(card.programId) || this.getProgramsByMerchant(approval.merchantId)[0]
    const target = program?.target || 5

    // Add stamp record
    const stamp: Stamp = {
      id: `st_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      cardId: card.id,
      merchantId: approval.merchantId,
      customerId: approval.customerId,
      staffId,
      approvalId: approval.id,
      lat: approval.scanLat,
      lng: approval.scanLng,
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    }
    this.data.stamps.push(stamp)

    // Update customer stats
    const customer = this.getCustomerById(approval.customerId)
    if (customer) {
      customer.totalStamps = (customer.totalStamps || 0) + 1
      customer.totalVisits = (customer.totalVisits || 0) + 1
    }

    // Calculate streak (E4c)
    const now = Date.now()
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    if (card.lastVisitTimestamp && now - card.lastVisitTimestamp < oneWeekMs * 2) {
      card.streakCount = (card.streakCount || 0) + 1
    } else if (!card.graceUsed && card.streakCount > 0) {
      // 1 missed week forgiven per cycle (grace period)
      card.graceUsed = true
      card.streakCount = (card.streakCount || 0) + 1
    } else {
      card.streakCount = 1
    }

    card.lastVisit = "এইমাত্র"
    card.lastVisitTimestamp = now
    card.stamps = (card.stamps || 0) + 1

    let voucher: Voucher | undefined = undefined

    // Check if card completed
    if (card.stamps >= target) {
      card.completedAt = new Date().toISOString()
      card.voucherReady = true
      const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
      const merchantInitial = approval.merchantId.toUpperCase()
      card.voucherCode = `SL-${merchantInitial}-${target}X${codeSuffix}`
      const expiryDays = program?.expiryDays || 30
      const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      card.voucherExpiry = `${expiryDate.getDate()} ${expiryDate.toLocaleDateString("bn-BD", { month: "long" })} ${expiryDate.getFullYear()}`

      if (customer) {
        customer.cardsCompleted = (customer.cardsCompleted || 0) + 1
      }

      // Create voucher record
      voucher = {
        id: `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        cardId: card.id,
        merchantId: approval.merchantId,
        customerId: approval.customerId,
        code: card.voucherCode,
        rewardText: program?.rewardText || "বিনামূল্যে বিশেষ উপহার",
        issuedAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        status: "active",
      }
      this.data.vouchers.push(voucher)
    }

    this.save()
    return { approval, stamp, card, voucher }
  }

  // --- STAMPS & COOLDOWN ---
  public getLastStampForCustomer(customerId: string, merchantId: string): Stamp | undefined {
    return this.data.stamps
      .filter((s) => s.customerId === customerId && s.merchantId === merchantId && !s.reversedAt)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
  }

  public getStampsForCard(cardId: string): Stamp[] {
    return this.data.stamps
      .filter((s) => s.cardId === cardId && !s.reversedAt)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  public getAllStampsForMerchant(merchantId: string): Stamp[] {
    return this.data.stamps.filter((s) => s.merchantId === merchantId && !s.reversedAt)
  }

  // --- VOUCHERS & REDEMPTION ---
  public getVouchersForCustomer(customerId: string): Voucher[] {
    return this.data.vouchers.filter((v) => v.customerId === customerId)
  }

  public redeemVoucher(
    code: string,
    merchantId: string,
    staffId: string
  ): { success: boolean; message: string; voucher?: Voucher; card?: CustomerCard } {
    const voucher = this.data.vouchers.find(
      (v) => v.code === code && v.merchantId === merchantId && v.status === "active"
    )
    if (!voucher) {
      return { success: false, message: "অবৈধ অথবা ইতিমধ্যে ব্যবহৃত ভাউচার কোড" }
    }

    voucher.status = "redeemed"
    voucher.redeemedAt = new Date().toISOString()
    voucher.redeemedBy = staffId

    // Reset card to 0 stamps for new cycle (PRD E3.6)
    const card = this.getCardById(voucher.cardId)
    if (card) {
      card.stamps = 0
      card.cycleNo = (card.cycleNo || 1) + 1
      card.voucherReady = false
      card.voucherCode = undefined
      card.voucherExpiry = undefined
      card.completedAt = null
    }

    this.save()
    return { success: true, message: "ভাউচার সফলভাবে রিডিম করা হয়েছে!", voucher, card }
  }

  // --- STAFF ---
  public getStaffByMerchant(merchantId: string): Staff[] {
    return this.data.staff.filter((s) => s.merchantId === merchantId && s.active)
  }

  public addStaff(staff: Staff): Staff {
    this.data.staff.push(staff)
    this.save()
    return staff
  }

  public verifyStaffPin(merchantId: string, pin: string): Staff | null {
    const found = this.data.staff.find((s) => s.merchantId === merchantId && s.pin === pin && s.active)
    if (found) return found

    // A merchant may run staff mode with a single shared PIN instead of per-staff accounts.
    const merchant = this.getMerchantById(merchantId)
    if (merchant?.staffPin && merchant.staffPin === pin) {
      return {
        id: `${merchant.id}_staff_pin`,
        merchantId: merchant.id,
        name: merchant.ownerName || merchant.name,
        pin: merchant.staffPin,
        role: "owner",
        active: true,
        createdAt: merchant.staffPinUpdatedAt || merchant.createdAt,
      }
    }
    return null
  }

  /** Set (or replace) the shared staff-mode PIN for one merchant. */
  public setStaffPin(merchantId: string, pin: string): Merchant | null {
    return this.updateMerchant(merchantId, {
      staffPin: pin,
      staffPinUpdatedAt: new Date().toISOString(),
    })
  }

  // --- FRAUD & OPS ---
  public logFraudSignal(signal: Omit<FraudSignal, "id">) {
    const newSignal: FraudSignal = {
      id: `fs_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...signal,
    }
    this.data.fraudSignals.unshift(newSignal)
    this.save()
    return newSignal
  }

  public getFraudSignals(): FraudSignal[] {
    return this.data.fraudSignals
  }
}

export const db = new Database()
