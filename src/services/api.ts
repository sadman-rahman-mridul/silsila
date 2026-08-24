export interface Merchant {
  id: string
  name: string
  nameEn: string
  category: string
  area: string
  clusterId?: string
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
  instagram?: string
  facebook?: string
  whatsapp?: string
  reviewLink?: string
  lat: number
  lng: number
  geofenceM?: number
  planTier?: "free" | "growth" | "premium"
  ownerName?: string
  ownerPhone?: string
  onboarded?: boolean
  status?: "active" | "pending" | "suspended"
  distanceMeters?: number
}

export function generateMerchantSlug(merchant: { name: string; nameEn?: string; id: string }): string {
  if (merchant.nameEn && merchant.nameEn.trim()) {
    const slug = merchant.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    if (slug) return slug
  }
  const clean = merchant.name.toLowerCase().trim().replace(/\s+/g, "-")
  return clean || merchant.id
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
}

export interface CustomerCard {
  id: string
  customerId: string
  merchantId: string
  programId: string
  stamps: number
  cycleNo: number
  streakCount: number
  lastVisit: string
  lastVisitDaysAgo?: number
  voucherReady: boolean
  voucherCode?: string
  voucherExpiry?: string
  target?: number
  rewardText?: string
  merchant?: Partial<Merchant>
}

export interface PendingApproval {
  id: string
  merchantId: string
  customerId: string
  customerName: string
  customerPhone: string
  scannedAt?: string
  distanceMeters?: number
  distance?: number
  secondsAgo?: number
  createdAt?: string
  resolution?: string
}

export interface MerchantCustomer {
  id: string
  name: string
  phone: string
  rawPhone?: string
  stamps: number
  totalVisits: number
  lastVisit: string
  lastVisitDaysAgo: number
  status: "active" | "at_risk" | "new" | "completed"
  history?: Array<{ stampNo: number; date: string; time: string; staffId: string }>
}

export interface MerchantStats {
  scansToday: number
  uniqueCustomers: number
  rewardsRedeemed: number
  repeatRate: number
  stampsThisWeek: number
  newThisWeek: number
  weeklyChange: number
  activeCards: number
  totalStamps: number
  hasActivity: boolean
  dailyTrends: Array<{ day: string; date: string; stamps: number }>
  /** visit === 0 marks the "card completed" row. */
  retentionFunnel: Array<{ visit: number; customers: number; pct: number }>
  hourlyDistribution: Array<{ hour: number; stamps: number }>
}

/** A zeroed stats object for a merchant that has no activity yet. */
export const emptyMerchantStats: MerchantStats = {
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
  dailyTrends: [],
  retentionFunnel: [],
  hourlyDistribution: [],
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
  status: "active" | "redeemed" | "expired"
  merchantName?: string
  customerName?: string
  customerPhone?: string
}

export interface OpsMetrics {
  merchants: Array<{
    id: string
    name: string
    area: string
    category: string
    stampsWeek: number
    customers: number
    status: "active" | "at_risk" | "inactive" | "suspended"
    lastStamp: string | null
    repeatRate: number
  }>
  pending: Array<{
    id: string
    name: string
    owner: string
    phone: string
    area: string
    category: string
    submittedAt: string
  }>
  clusterStats: {
    total: number
    active: number
    atRisk: number
    inactive: number
    totalStampsWeek: number
    uniqueCustomersCluster: number
    avgRepeatRate: number
  }
}

const API_BASE = "/api"
const TOKEN_KEY = "silsila_token"

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/**
 * Fetch JSON and throw on failure.
 *
 * Errors surface to the caller instead of being swallowed into a
 * plausible-looking object, so the UI can show a real error state rather than
 * rendering invented numbers.
 */
async function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { ...options, headers: authHeaders(options?.headers as Record<string, string>) })
  } catch (err: any) {
    throw new ApiError(err?.message || "নেটওয়ার্ক সংযোগ বিচ্ছিন্ন। দয়া করে পুনরায় চেষ্টা করুন।", 0)
  }

  const contentType = res.headers.get("content-type") || ""
  const body = contentType.includes("application/json") ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(body?.error || `সার্ভার ত্রুটি (${res.status})`, res.status)
  }
  return body as T
}

const JSON_HEADERS = { "Content-Type": "application/json" }

export const api = {
  async lookupPhone(phone: string, role: "customer" | "merchant") {
    return fetchJson<{
      exists: boolean
      isExistingUser: boolean
      hasPassword?: boolean
      name?: string | null
    }>(`${API_BASE}/auth/lookup`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ phone, role }),
    })
  },

  async sendOtp(phone: string, role: "customer" | "merchant") {
    return fetchJson<{
      success: boolean
      isExistingUser: boolean
      existingName: string | null
      message: string
      expiresIn: number
      smsSkipped?: boolean
    }>(`${API_BASE}/auth/otp/send`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ phone, role }),
    })
  },

  async loginWithPassword(phone: string, password: string, role: "customer" | "merchant") {
    return fetchJson<{
      success: boolean
      isNewUser?: boolean
      noPasswordSet?: boolean
      message?: string
      role?: "customer" | "merchant"
      customer?: any
      merchant?: Merchant & { onboarded: boolean }
      merchants?: Merchant[]
      token?: string
    }>(`${API_BASE}/auth/login-password`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ phone, password, role }),
    })
  },

  async verifyOtp(
    phone: string,
    otp: string,
    role: "customer" | "merchant",
    name?: string,
    consentGiven?: boolean,
    password?: string
  ) {
    return fetchJson<{
      success: boolean
      role: "customer" | "merchant"
      isNewUser: boolean
      customer?: any
      merchant?: Merchant & { onboarded: boolean }
      merchants?: Merchant[]
      token: string
    }>(`${API_BASE}/auth/otp/verify`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ phone, otp, role, name, consentGiven, password }),
    })
  },

  async getMe() {
    return fetchJson<{
      role: "customer" | "merchant"
      customer?: any
      merchant?: Merchant
      merchants?: Merchant[]
    }>(`${API_BASE}/auth/me`)
  },

  async updateProfile(id: string, name: string, role?: "customer" | "merchant") {
    return fetchJson(`${API_BASE}/auth/profile/update`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ id, name, role }),
    })
  },

  // ----- Merchants -----

  /** Public directory, for the customer Explore tab. */
  async getMerchants(params?: { category?: string; search?: string; lat?: number; lng?: number }) {
    const query = new URLSearchParams()
    if (params?.category && params.category !== "all") query.set("category", params.category)
    if (params?.search) query.set("search", params.search)
    if (params?.lat !== undefined) query.set("lat", String(params.lat))
    if (params?.lng !== undefined) query.set("lng", String(params.lng))
    return fetchJson<Merchant[]>(`${API_BASE}/merchants?${query.toString()}`)
  },

  /** Only the brands owned by the signed-in merchant. */
  async getMyMerchants() {
    return fetchJson<Merchant[]>(`${API_BASE}/merchants/mine`)
  },

  async getMerchant(id: string) {
    return fetchJson<{ merchant: Merchant; programs: RewardProgram[] }>(`${API_BASE}/merchants/${id}`)
  },

  async createMerchant(data: Partial<Merchant> & { staffPin?: string }) {
    return fetchJson<{ merchant: Merchant }>(`${API_BASE}/merchants`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    })
  },

  async updateMerchant(id: string, data: Partial<Merchant>) {
    return fetchJson<Merchant>(`${API_BASE}/merchants/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    })
  },

  async getMerchantQr(id: string) {
    return fetchJson<{
      merchantId: string
      merchantName: string
      companySlug: string
      formattedQrLink: string
      scanUrl: string
      qrDataUrl: string
    }>(`${API_BASE}/merchants/${id}/qr`)
  },

  // ----- Reward programs -----
  async getRewardPrograms(merchantId: string) {
    return fetchJson<RewardProgram[]>(`${API_BASE}/reward-programs?merchantId=${merchantId}`)
  },

  async createRewardProgram(data: Partial<RewardProgram>) {
    return fetchJson<RewardProgram>(`${API_BASE}/reward-programs`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    })
  },

  async updateRewardProgram(id: string, data: Partial<RewardProgram>) {
    return fetchJson<RewardProgram>(`${API_BASE}/reward-programs/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    })
  },

  // ----- Cards & wallet -----
  async getCustomerCards(customerId: string) {
    return fetchJson<CustomerCard[]>(`${API_BASE}/cards?customerId=${customerId}`)
  },

  async getCardDetail(customerId: string, merchantId: string) {
    return fetchJson<{
      card: CustomerCard
      merchant: Merchant
      program: RewardProgram
      programs: RewardProgram[]
      stampsHistory: Array<{ id: string; timestamp: number; formattedDate: string; staffId: string }>
    }>(`${API_BASE}/cards/detail?customerId=${customerId}&merchantId=${merchantId}`)
  },

  // ----- Approvals & stamping -----
  async scanMerchant(data: {
    merchantId: string
    customerId: string
    customerName?: string
    customerPhone?: string
    scanLat?: number
    scanLng?: number
  }) {
    return fetchJson<{ success: boolean; pendingApproval: PendingApproval; message: string }>(
      `${API_BASE}/approvals/scan`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(data) }
    )
  },

  async requestStamp(data: {
    merchantId: string
    customerId: string
    customerName?: string
    customerPhone?: string
    scanLat?: number
    scanLng?: number
  }) {
    return this.scanMerchant(data)
  },

  async getPendingApprovals(merchantId: string) {
    return fetchJson<PendingApproval[]>(`${API_BASE}/approvals?merchantId=${merchantId}`)
  },

  async checkApprovalStatus(approvalId: string) {
    return fetchJson<{ approval: PendingApproval; status: string; card?: CustomerCard; voucher?: Voucher }>(
      `${API_BASE}/approvals/${approvalId}/status`
    )
  },

  async resolveApproval(approvalId: string, resolution: "approved" | "rejected", staffId?: string) {
    return fetchJson(`${API_BASE}/approvals/${approvalId}/resolve`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ resolution, staffId }),
    })
  },

  // ----- Vouchers -----
  async getVouchers(params: { customerId?: string; merchantId?: string }) {
    const query = new URLSearchParams()
    if (params.customerId) query.set("customerId", params.customerId)
    if (params.merchantId) query.set("merchantId", params.merchantId)
    return fetchJson<Voucher[]>(`${API_BASE}/vouchers?${query.toString()}`)
  },

  async redeemVoucher(code: string, merchantId: string, staffPin: string) {
    return fetchJson(`${API_BASE}/vouchers/redeem`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ code, merchantId, staffPin }),
    })
  },

  // ----- Staff & staff-mode PIN -----
  async getStaff(merchantId: string) {
    return fetchJson<Array<{ id: string; name: string; role: string; createdAt: string }>>(
      `${API_BASE}/staff?merchantId=${merchantId}`
    )
  },

  async createStaff(merchantId: string, name: string, pin: string, role?: string) {
    return fetchJson(`${API_BASE}/staff`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ merchantId, name, pin, role }),
    })
  },

  async verifyStaffPin(merchantId: string, pin: string) {
    return fetchJson<{ success: boolean; valid: boolean; staff: { id: string; name: string; role: string } }>(
      `${API_BASE}/staff/verify-pin`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ merchantId, pin }) }
    )
  },

  /** Whether a staff PIN exists for this merchant (never returns the PIN). */
  async getStaffPinStatus(merchantId: string) {
    return fetchJson<{ hasPin: boolean; updatedAt: string | null; ownerPhoneMasked: string | null }>(
      `${API_BASE}/staff/pin/status?merchantId=${merchantId}`
    )
  },

  /** Step 1 of a PIN change: send an OTP to the registered owner phone. */
  async requestStaffPinOtp(merchantId: string) {
    return fetchJson<{ success: boolean; message: string; expiresIn: number; smsSkipped?: boolean }>(
      `${API_BASE}/staff/pin/request-otp`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ merchantId }) }
    )
  },

  /** Step 2 of a PIN change: verify the OTP and store the new PIN. */
  async setStaffPin(merchantId: string, pin: string, otp: string) {
    return fetchJson<{ success: boolean; message: string; updatedAt: string }>(
      `${API_BASE}/staff/pin/set`,
      { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ merchantId, pin, otp }) }
    )
  },

  // ----- CRM & export -----
  async getCrmCustomers(merchantId: string, status?: string, search?: string) {
    const query = new URLSearchParams({ merchantId })
    if (status && status !== "all") query.set("status", status)
    if (search) query.set("search", search)
    return fetchJson<MerchantCustomer[]>(`${API_BASE}/crm/customers?${query.toString()}`)
  },

  async exportCrmCsv(merchantId: string, consentAcknowledged: boolean) {
    const res = await fetch(`${API_BASE}/crm/export-csv`, {
      method: "POST",
      headers: authHeaders(JSON_HEADERS),
      body: JSON.stringify({ merchantId, consentAcknowledged }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "CSV এক্সপোর্ট ব্যর্থ" }))
      throw new ApiError(err.error || "CSV এক্সপোর্ট ব্যর্থ", res.status)
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `silsila_customers_${merchantId}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  // ----- Report metrics -----
  async getMerchantStats(merchantId: string): Promise<MerchantStats> {
    try {
      const res = await fetchJson<MerchantStats>(`${API_BASE}/analytics/merchant?merchantId=${merchantId}`)
      if (res && typeof res.scansToday === "number") return res
    } catch {
      // new account or no analytics yet — fall through to zeros
    }
    return { ...emptyMerchantStats }
  },

  // ----- Ops & fraud -----
  async performOpsAction(merchantId: string, action: "approve" | "suspend" | "activate") {
    return fetchJson(`${API_BASE}/ops/merchants/${merchantId}/action`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ action }),
    })
  },

  async getOpsFraudSignals() {
    return fetchJson<any[]>(`${API_BASE}/ops/fraud-signals`)
  },

  async getOpsMetrics(): Promise<OpsMetrics> {
    const [merchantsData, clusterStats] = await Promise.all([
      fetchJson<{ pending: OpsMetrics["pending"]; active: OpsMetrics["merchants"] }>(
        `${API_BASE}/ops/merchants`
      ),
      fetchJson<OpsMetrics["clusterStats"]>(`${API_BASE}/ops/cluster-stats`),
    ])
    return {
      merchants: merchantsData.active || [],
      pending: merchantsData.pending || [],
      clusterStats,
    }
  },

  // ----- Privacy & PDPA -----
  async deleteCustomerData(customerId: string) {
    return fetchJson(`${API_BASE}/privacy/delete-my-data`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ customerId, confirmation: "DELETE" }),
    })
  },
}
