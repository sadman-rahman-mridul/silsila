import type { Request, Response, NextFunction } from "express"
import { db } from "../db.js"

declare global {
  namespace Express {
    interface Request {
      merchantId?: string
      customerId?: string
    }
  }
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  return header.replace(/^Bearer\s+/i, "").trim() || null
}

/** Resolve the signed-in merchant from the request token, if there is one. */
export function currentMerchantId(req: Request): string | null {
  const token = readToken(req)
  if (!token || !token.startsWith("token_merchant_")) return null
  return token.replace("token_merchant_", "")
}

/** Resolve the signed-in customer from the request token, if there is one. */
export function currentCustomerId(req: Request): string | null {
  const token = readToken(req)
  if (!token || !token.startsWith("token_customer_")) return null
  return token.replace("token_customer_", "")
}

/**
 * Guard for merchant-scoped endpoints.
 *
 * A merchant may only read or mutate brands owned by their own phone number, so
 * one owner can never reach another owner's console data by guessing an id.
 */
export function requireMerchantOwner(paramName = "id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const signedInMerchantId = currentMerchantId(req)
    if (!signedInMerchantId) {
      res.status(401).json({ error: "মার্চেন্ট লগইন প্রয়োজন" })
      return
    }

    const signedInMerchant = db.getMerchantById(signedInMerchantId)
    if (!signedInMerchant) {
      res.status(401).json({ error: "মার্চেন্ট অ্যাকাউন্ট পাওয়া যায়নি" })
      return
    }

    const targetId =
      (req.params?.[paramName] as string | undefined) ||
      (req.query?.merchantId as string | undefined) ||
      (req.body?.merchantId as string | undefined) ||
      signedInMerchantId

    if (!db.isMerchantOwnedBy(targetId, signedInMerchant.ownerPhone)) {
      res.status(403).json({ error: "এই দোকানের তথ্যে আপনার অ্যাক্সেস নেই" })
      return
    }

    req.merchantId = targetId
    next()
  }
}
