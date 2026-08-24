/**
 * The five business categories Silsila supports.
 *
 * `value` is what gets stored in the database and used for filtering; `label`
 * is what the Bengali UI renders. Keep them in sync across merchant onboarding,
 * merchant settings and the customer Explore filters.
 */
export interface BusinessCategory {
  value: string
  label: string
  labelEn: string
  emoji: string
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { value: "cafe", label: "ক্যাফে", labelEn: "Cafe", emoji: "☕" },
  { value: "salon", label: "সেলুন", labelEn: "Salon", emoji: "💇" },
  { value: "restaurant", label: "রেস্তোরাঁ", labelEn: "Restaurant", emoji: "🍽️" },
  { value: "spa", label: "স্পা", labelEn: "Spa", emoji: "🧖" },
  { value: "others", label: "অন্যান্য", labelEn: "Others", emoji: "🏪" },
]

export function categoryLabel(value?: string): string {
  if (!value) return ""
  const found = BUSINESS_CATEGORIES.find((c) => c.value === value)
  return found ? found.label : value
}

export function categoryEmoji(value?: string): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.emoji || "🏪"
}
