export interface Sponsor {
  id: string
  name: string
  type: string
  createdAt: string
}

export interface Merchant {
  id: string
  name: string
  nameEn: string
  category: string
  area: string
  clusterId: string
  logoUrl?: string
  logoInitials: string
  logoBg: string
  logoColor: string
  verified: boolean
  distance?: string
  address: string
  hours: string
  isOpen: boolean
  phone: string
  ownerPhone: string
  ownerName: string
  instagram?: string
  facebook?: string
  whatsapp?: string
  reviewLink?: string
  lat: number
  lng: number
  geofenceM: number
  planTier: "free" | "growth" | "premium"
  status: "active" | "pending" | "suspended"
  /** Shared 4-digit PIN that unlocks counter Staff Mode. Set by the owner, changed only after OTP. */
  staffPin?: string
  staffPinUpdatedAt?: string
  password?: string
  /** False until the owner finishes the setup wizard (name, location, first reward). */
  onboarded: boolean
  createdAt: string
}

export interface Staff {
  id: string
  merchantId: string
  name: string
  pin: string
  role: "owner" | "counter_staff" | "manager"
  active: boolean
  createdAt: string
}

export interface Customer {
  id: string
  phone: string
  name: string
  password?: string
  locale: "bn" | "en"
  consentGiven: boolean
  consentTimestamp: string
  createdAt: string
  totalStamps: number
  totalVisits: number
  cardsCompleted: number
}

export interface RewardProgram {
  id: string
  merchantId: string
  sponsorId?: string | null
  target: number
  rewardText: string
  rewardImage?: string
  expiryDays: number
  active: boolean
  createdAt: string
}

export interface CustomerCard {
  id: string
  customerId: string
  merchantId: string
  programId: string
  stamps: number
  cycleNo: number
  completedAt?: string | null
  streakCount: number
  streakPeriodStart?: string
  graceUsed: boolean
  lastVisit: string
  lastVisitTimestamp: number
  voucherReady: boolean
  voucherCode?: string
  voucherExpiry?: string
  createdAt: string
}

export interface PendingApproval {
  id: string
  merchantId: string
  customerId: string
  customerName: string
  customerPhone: string
  scanLat?: number
  scanLng?: number
  distanceMeters: number
  createdAt: string
  createdTimestamp: number
  expiresAt: string
  resolvedBy?: string
  resolution: "pending" | "approved" | "rejected" | "expired"
  resolvedAt?: string
}

export interface Stamp {
  id: string
  cardId: string
  merchantId: string
  customerId: string
  staffId: string
  approvalId?: string
  lat?: number
  lng?: number
  createdAt: string
  timestamp: number
  reversedAt?: string
}

export interface Voucher {
  id: string
  cardId: string
  merchantId: string
  customerId: string
  code: string
  rewardText: string
  issuedAt: string
  expiresAt: string
  redeemedAt?: string
  redeemedBy?: string
  status: "active" | "redeemed" | "expired"
}

export interface FraudSignal {
  id: string
  merchantId?: string
  merchantName: string
  signal: string
  severity: "critical" | "warning" | "info"
  count: number
  timestamp: string
}

export interface DatabaseSchema {
  /** Bumped whenever the on-disk shape changes; older files are discarded on load. */
  version?: number
  sponsors: Sponsor[]
  merchants: Merchant[]
  staff: Staff[]
  customers: Customer[]
  rewardPrograms: RewardProgram[]
  cards: CustomerCard[]
  pendingApprovals: PendingApproval[]
  stamps: Stamp[]
  vouchers: Voucher[]
  fraudSignals: FraudSignal[]
}
