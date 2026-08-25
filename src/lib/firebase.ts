import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth"
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  runTransaction,
  increment,
  serverTimestamp,
} from "firebase/firestore"
import firebaseConfigData from "../../firebase-applet-config.json"

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
}

// Initialize Firebase App
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize Auth
export const auth = getAuth(firebaseApp)

// Initialize Firestore with Database ID if custom
export const firestore = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== "(default)"
  ? getFirestore(firebaseApp, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(firebaseApp)

/**
 * Setup reCAPTCHA for Phone Authentication
 */
export function setupRecaptcha(containerId: string = "recaptcha-container") {
  if (typeof window === "undefined") return null

  // Ensure DOM container exists
  let container = document.getElementById(containerId)
  if (!container) {
    container = document.createElement("div")
    container.id = containerId
    document.body.appendChild(container)
  }

  // Clear any existing verifier instance
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear()
    } catch {}
    (window as any).recaptchaVerifier = null
  }

  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA solved for Phone SMS")
      },
      "expired-callback": () => {
        console.warn("reCAPTCHA expired")
      },
    })
    ;(window as any).recaptchaVerifier = verifier
    return verifier
  } catch (err) {
    console.error("Error creating RecaptchaVerifier:", err)
    throw err
  }
}

/**
 * Send Phone Auth SMS Verification Code
 * Supports Bangladeshi format (+8801...) and international numbers
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  let formattedPhone = phoneNumber.trim().replace(/\s+/g, "")
  if (!formattedPhone.startsWith("+")) {
    if (formattedPhone.startsWith("880")) {
      formattedPhone = `+${formattedPhone}`
    } else if (formattedPhone.startsWith("0")) {
      formattedPhone = `+88${formattedPhone}`
    } else {
      formattedPhone = `+880${formattedPhone}`
    }
  }

  return await signInWithPhoneNumber(auth, formattedPhone, appVerifier)
}

/**
 * Confirm OTP entered by customer
 */
export async function confirmFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<User> {
  const userCredential = await confirmationResult.confirm(otpCode)
  return userCredential.user
}

export {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  runTransaction,
  increment,
  serverTimestamp,
}
