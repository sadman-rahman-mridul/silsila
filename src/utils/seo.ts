export interface SeoMetaProps {
  title: string
  description: string
  image?: string
  url?: string
  type?: "website" | "article"
  author?: string
  publishedTime?: string
  tags?: string[]
}

export function updatePageSeo({
  title,
  description,
  image = "https://sealsela.com/retention-hero.png",
  url = "https://sealsela.com",
  type = "website",
  author,
  publishedTime,
  tags,
}: SeoMetaProps) {
  if (typeof document === "undefined") return

  // 1. Update Document Title
  document.title = title.includes("Sealsela") ? title : `${title} | Sealsela`

  // 2. Helper to set or create meta tag
  const setMeta = (attr: string, key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement
    if (!el) {
      el = document.createElement("meta")
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.setAttribute("content", content)
  }

  // 3. Helper for link tags (like canonical)
  const setLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement
    if (!el) {
      el = document.createElement("link")
      el.setAttribute("rel", rel)
      document.head.appendChild(el)
    }
    el.setAttribute("href", href)
  }

  const absoluteImageUrl = image.startsWith("http")
    ? image
    : `https://sealsela.com${image.startsWith("/") ? "" : "/"}${image}`

  const absolutePageUrl = url.startsWith("http")
    ? url
    : `https://sealsela.com${url.startsWith("/") ? "" : "/"}${url}`

  // Standard Meta Tags
  setMeta("name", "description", description)
  setMeta("name", "title", document.title)
  setLink("canonical", absolutePageUrl)

  // OpenGraph Meta Tags
  setMeta("property", "og:type", type)
  setMeta("property", "og:title", document.title)
  setMeta("property", "og:description", description)
  setMeta("property", "og:image", absoluteImageUrl)
  setMeta("property", "og:url", absolutePageUrl)
  setMeta("property", "og:site_name", "Sealsela")

  // Twitter Card Meta Tags
  setMeta("name", "twitter:card", "summary_large_image")
  setMeta("name", "twitter:title", document.title)
  setMeta("name", "twitter:description", description)
  setMeta("name", "twitter:image", absoluteImageUrl)
  setMeta("name", "twitter:url", absolutePageUrl)

  // Article Specific
  if (author) setMeta("property", "article:author", author)
  if (publishedTime) setMeta("property", "article:published_time", publishedTime)
  if (tags && tags.length > 0) {
    setMeta("property", "article:tag", tags.join(", "))
  }
}
