import React, { createContext, useContext, useEffect, useState } from "react"
import { auth } from "../lib/firebase"
import { onAuthStateChanged, signOut, type User, type ConfirmationResult } from "firebase/auth"
import { firebaseService } from "../services/firebaseService"

export type UserRole = "customer" | "merchant" | "ops"

export interface UserProfile {
  id: string
  phone: string
  name: string
  role: UserRole
  /** Set for merchants only: the brand this console session is managing. */
  merchantId?: string
  /** Every brand owned by this merchant. A merchant can switch only between these. */
  ownedMerchantIds?: string[]
  /** False until the merchant finishes the setup wizard. */
  onboarded?: boolean
  createdAt?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  token: string | null
  loading: boolean
  confirmationResult: ConfirmationResult | null
  setConfirmationResult: (res: ConfirmationResult | null) => void
  setSessionProfile: (profile: UserProfile, token?: string) => void
  updateSessionProfile: (patch: Partial<UserProfile>) => void
  logout: () => Promise<void>
}

const PROFILE_KEY = "silsila_profile"
const TOKEN_KEY = "silsila_token"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function readStoredProfile(): UserProfile | null {
  try {
    const saved = localStorage.getItem(PROFILE_KEY)
    return saved ? (JSON.parse(saved) as UserProfile) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(readStoredProfile)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(true)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  useEffect(() => {
    // Firebase phone auth is optional here — sessions are established by the
    // Silsila backend OTP flow — so this only mirrors the Firebase user object.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  function persist(next: UserProfile | null, nextToken?: string | null) {
    setProfile(next)
    try {
      if (next) localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
      else localStorage.removeItem(PROFILE_KEY)

      if (nextToken !== undefined) {
        setToken(nextToken)
        if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken)
        else localStorage.removeItem(TOKEN_KEY)
      }
    } catch (e) {
      console.warn("Failed to cache session:", e)
    }
  }

  function setSessionProfile(newProfile: UserProfile, newToken?: string) {
    persist(newProfile, newToken ?? null)
  }

  function updateSessionProfile(patch: Partial<UserProfile>) {
    setProfile((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  async function logout() {
    try {
      await signOut(auth)
    } catch {
      // Firebase session may not exist; the local session is what matters.
    }
    setUser(null)
    setConfirmationResult(null)
    persist(null, null)
    localStorage.removeItem("silsila_role")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        confirmationResult,
        setConfirmationResult,
        setSessionProfile,
        updateSessionProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

/**
 * The merchant id for the current console session.
 *
 * Returns null when the signed-in user is not a merchant — callers must handle
 * that rather than falling back to some other merchant's id.
 */
export function useMerchantId(): string | null {
  const { profile } = useAuth()
  if (profile?.role !== "merchant") return null
  return profile.merchantId || null
}
