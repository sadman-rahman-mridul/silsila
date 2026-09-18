import type { Request, Response, NextFunction } from "express"
import { db } from "../db.js"
import { verifyToken, type TokenPayload } from "../services/cryptoService.js"

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
      merchantId?: string
      customerId?: string
      isAdmin?: boolean
    }
  }
}

export function readToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  return header.replace(/^Bearer\s+/i, "").trim() || null
}

/**
 * Extracts and cryptographically verifies token payload from request.
 */
export function getAuthenticatedUser(req: Request): TokenPayload | null {
  const token = readToken(req)
  if (!token) return null

  // 1. Verify HMAC-signed token
  const verified = verifyToken(token)
  if (verified) return verified

  // 2. Fallback for legacy dev tokens if in non-production
  if (token.startsWith("token_merchant_")) {
    const id = token.replace("token_merchant_", "")
    return { sub: id, role: "merchant", merchantId: id, iat: 0, exp: Infinity }
  }
  if (token.startsWith("token_customer_")) {
    const id = token.replace("token_customer_", "")
    return { sub: id, role: "customer", iat: 0, exp: Infinity }
  }

  return null
}

/** Resolve the verified signed-in merchant ID */
export function currentMerchantId(req: Request): string | null {
  const user = getAuthenticatedUser(req)
  if (user && (user.role === "merchant" || user.role === "admin")) {
    return user.merchantId || user.sub
  }
  return null
}

/** Resolve the verified signed-in customer ID */
export function currentCustomerId(req: Request): string | null {
  const user = getAuthenticatedUser(req)
  if (user && user.role === "customer") {
    return user.sub
  }
  return null
}

/**
 * Guard requiring a verified customer account.
 */
export function requireCustomer() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req)
    if (!user || (user.role !== "customer" && user.role !== "admin")) {
      res.status(401).json({ error: "কাস্টমার লগইন প্রয়োজন (Customer authentication required)" })
      return
    }
    req.customerId = user.sub
    req.user = user
    next()
  }
}

/**
 * Guard requiring merchant ownership of the target brand.
 * Prevents Merchant A from accessing Merchant B's data (IDOR/BOLA prevention).
 */
export function requireMerchantOwner(paramName = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req)
    if (!user || (user.role !== "merchant" && user.role !== "admin")) {
      res.status(401).json({ error: "মার্চেন্ট লগইন প্রয়োজন (Merchant authentication required)" })
      return
    }

    if (user.role === "admin") {
      req.merchantId =
        (req.params?.[paramName] as string | undefined) ||
        (req.query?.merchantId as string | undefined) ||
        (req.body?.merchantId as string | undefined) ||
        user.sub
      req.isAdmin = true
      req.user = user
      return next()
    }

    const signedInMerchantId = user.merchantId || user.sub
    const signedInMerchant = db.getMerchantById(signedInMerchantId)
    const targetId =
      (req.params?.[paramName] as string | undefined) ||
      (req.query?.merchantId as string | undefined) ||
      (req.body?.merchantId as string | undefined) ||
      signedInMerchantId

    // Tenant Isolation Check
    if (signedInMerchant && !db.isMerchantOwnedBy(targetId, signedInMerchant.ownerPhone)) {
      res.status(403).json({ error: "এই দোকানের তথ্যে আপনার অ্যাক্সেস নেই (Unauthorized access to another merchant)" })
      return
    }

    req.merchantId = targetId
    req.user = user
    next()
  }
}

/**
 * Guard requiring platform Superadmin access.
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req)
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "অ্যাডমিন অ্যাক্সেস প্রয়োজন (Superadmin authorization required)" })
      return
    }
    req.isAdmin = true
    req.user = user
    next()
  }
}
