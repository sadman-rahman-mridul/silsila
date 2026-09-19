/**
 * The five business categories Silsila supports:
 * Cafes, Restaurants, Salons, Spas, Retail Store
 */
export interface BusinessCategory {
  value: string
  label: string
  labelEn: string
  emoji: string
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { value: "cafe", label: "ক্যাফে", labelEn: "Cafes", emoji: "☕" },
  { value: "restaurant", label: "রেস্টুরেন্ট", labelEn: "Restaurants", emoji: "🍽️" },
  { value: "salon", label: "স্যালুন", labelEn: "Salons", emoji: "💈" },
  { value: "spa", label: "স্পা", labelEn: "Spas", emoji: "🪷" },
  { value: "retail", label: "রিটেইল স্টোর", labelEn: "Retail Store", emoji: "🛍️" },
]

export function categoryLabel(value?: string, isBn: boolean = true): string {
  if (!value) return ""
  const val = value.toLowerCase().trim()
  const found = BUSINESS_CATEGORIES.find(
    (c) =>
      c.value.toLowerCase() === val ||
      c.label === value ||
      c.labelEn.toLowerCase() === val ||
      (value === "রেস্তোরাঁ" && c.value === "restaurant") ||
      (value === "সেলুন" && c.value === "salon") ||
      (value === "অন্যান্য" && c.value === "retail") ||
      (val === "others" && c.value === "retail")
  )
  if (found) {
    return isBn ? found.label : found.labelEn
  }
  return value
}

export function categoryEmoji(value?: string): string {
  if (!value) return "🛍️"
  const val = value.toLowerCase().trim()
  const found = BUSINESS_CATEGORIES.find(
    (c) =>
      c.value.toLowerCase() === val ||
      c.label === value ||
      c.labelEn.toLowerCase() === val ||
      (value === "রেস্তোরাঁ" && c.value === "restaurant") ||
      (value === "সেলুন" && c.value === "salon") ||
      (value === "অন্যান্য" && c.value === "retail") ||
      (val === "others" && c.value === "retail")
  )
  return found?.emoji || "🛍️"
}
