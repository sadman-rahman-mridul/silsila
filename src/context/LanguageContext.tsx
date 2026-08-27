import React, { createContext, useContext, useState, useEffect } from "react"

export type Language = "bn" | "en"

interface LanguageContextType {
  language: Language
  isBn: boolean
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
  t: (key: string, defaultText?: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  bn: {
    home: "হোম",
    explore: "খুঁজুন",
    scan: "স্ক্যান",
    rewards: "পুরস্কার",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    customers: "কাস্টমার",
    marketing: "মার্কেটিং",
    reports: "রিপোর্ট",
    staff_mode: "স্টাফ মোড",
    logout: "লগ আউট",
    save: "সংরক্ষণ",
    saved: "সংরক্ষিত ✓",
    saving: "সংরক্ষণ করা হচ্ছে...",
    view_card: "লয়্যালটি কার্ড দেখুন",
    open: "খোলা",
    closed: "বন্ধ",
    stamps: "মোট সিল",
    visits: "মোট ভিজিট",
    cards_completed: "কার্ড সম্পন্ন",
    streak: "সপ্তাহের ধারা",
    verify: "যাচাইকৃত",
    collect_stamps: "স্ট্যাম্প সংগ্রহ করতে ক্লিক করুন",
  },
  en: {
    home: "Home",
    explore: "Explore",
    scan: "Scan",
    rewards: "Rewards",
    profile: "Profile",
    settings: "Settings",
    customers: "Customers",
    marketing: "Marketing",
    reports: "Reports",
    staff_mode: "Staff Mode",
    logout: "Log Out",
    save: "Save",
    saved: "Saved ✓",
    saving: "Saving...",
    view_card: "View Loyalty Card",
    open: "Open",
    closed: "Closed",
    stamps: "Total Stamps",
    visits: "Total Visits",
    cards_completed: "Completed Cards",
    streak: "Week Streak",
    verify: "Verified",
    collect_stamps: "Click to collect stamps",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("silsila_lang") : null
    return saved === "en" || saved === "English" ? "en" : "bn"
  })

  function setLanguage(l: Language) {
    setLangState(l)
    try {
      localStorage.setItem("silsila_lang", l === "en" ? "English" : "বাংলা")
      window.dispatchEvent(new Event("languagechange"))
    } catch {}
  }

  function toggleLanguage() {
    setLanguage(language === "bn" ? "en" : "bn")
  }

  useEffect(() => {
    function handleStorage() {
      const saved = localStorage.getItem("silsila_lang")
      if (saved === "en" || saved === "English") setLangState("en")
      else setLangState("bn")
    }
    window.addEventListener("languagechange", handleStorage)
    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("languagechange", handleStorage)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  function t(key: string, defaultText?: string): string {
    return translations[language]?.[key] || defaultText || key
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        isBn: language === "bn",
        toggleLanguage,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    return {
      language: "bn" as Language,
      isBn: true,
      toggleLanguage: () => {},
      setLanguage: () => {},
      t: (k: string, d?: string) => d || k,
    }
  }
  return context
}
