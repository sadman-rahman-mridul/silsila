import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { BLOG_POSTS, type BlogPost } from "../../data/blogPosts"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"
import {
  SearchIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  GlobeIcon,
  SparklesIcon,
  FireIcon,
  ArrowRightIcon,
  ClockIcon,
} from "../../components/Icons"

export default function BlogHub() {
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = [
    { value: "all", label: isBn ? "সব পোস্ট" : "All Posts" },
    { value: "Restaurant Growth", label: isBn ? "রেস্টুরেন্ট গ্রোথ" : "Restaurant Growth" },
    { value: "Customer Retention", label: isBn ? "কাস্টমার রিটেনশন" : "Customer Retention" },
    { value: "Loyalty Strategy", label: isBn ? "লয়্যালটি স্ট্র্যাটেজি" : "Loyalty Strategy" },
    { value: "Product Guide", label: isBn ? "প্রোডাক্ট গাইড" : "Product Guide" },
  ]

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchesCat = selectedCategory === "all" || post.category === selectedCategory
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((t) => t.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [search, selectedCategory])

  const featuredPost = BLOG_POSTS[0]

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071D13] text-[#0F172A] dark:text-white font-sans antialiased flex flex-col justify-between transition-colors duration-200">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#071D13]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-white/10 p-1.5 flex items-center justify-center border border-emerald-200 dark:border-white/15 shadow-xs">
              <img src="/sealsela-logo-light.svg" alt="Sealsela Logo" className="w-full h-full object-contain block dark:hidden" />
              <img src="/sealsela-logo-dark.svg" alt="Sealsela Logo" className="w-full h-full object-contain hidden dark:block" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-2xl text-[#0F172A] dark:text-white tracking-tight leading-none group-hover:text-[#059669] dark:group-hover:text-[#34D399] transition-colors">
                Sealsela
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#059669] dark:text-[#34D399] font-bold mt-0.5">
                Blog & Insights
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="hidden sm:inline-flex px-3 py-2 text-xs font-bold text-slate-600 dark:text-white/80 hover:text-[#059669] dark:hover:text-[#34D399] transition-colors"
            >
              {isBn ? "মূল পাতা" : "Home"}
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#0F172A] dark:text-[#34D399] border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <SunIcon size={15} className="text-[#F59E0B]" /> : <MoonIcon size={15} className="text-[#064E3B]" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
            >
              <GlobeIcon size={14} />
              <span>{isBn ? "EN" : "বাংলা"}</span>
            </button>

            <button
              onClick={() => navigate("/login")}
              className="flex px-4 sm:px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-xs sm:text-sm shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all items-center gap-1.5"
            >
              <span>{isBn ? "শুরু করুন" : "Get Started"}</span>
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-[#34D399] border border-emerald-500/20 text-xs font-bold">
            <SparklesIcon size={14} />
            <span>{isBn ? "রিটেনশন ও বিজনেস গ্রোথ গাইড" : "Retention & Growth Knowledge Hub"}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-[#0F172A] dark:text-white [text-wrap:balance]">
            {isBn ? "ব্যবসা বাড়ানো ও কাস্টমার ধরে রাখার কৌশল" : "Practical Guides on Customer Loyalty & Business Profit"}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-white/70 max-w-xl mx-auto leading-relaxed">
            {isBn
              ? "রেস্টুরেন্ট, ক্যাফে, স্যালুন ও রিটেইল শপের প্রফিট বাড়ানো, রিপিট ভিজিট বৃদ্ধি এবং লয়্যালটি সিস্টেমের আধুনিক স্ট্র্যাটেজি।"
              : "Actionable playbooks, CAC vs LTV economics, and retention mechanics for modern business owners."}
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="relative w-full sm:w-80">
            <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isBn ? "ব্লগ আর্টিকেল খুঁজুন..." : "Search articles..."}
              className="w-full bg-white dark:bg-[#0E281C]/90 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 dark:focus:border-emerald-500/60 shadow-xs"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? "bg-[#10B981] text-white shadow-md shadow-emerald-500/20"
                    : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:text-[#0F172A] dark:hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Post Banner */}
        {featuredPost && !search && selectedCategory === "all" && (
          <Link
            to={`/blog/${featuredPost.slug}`}
            className="block rounded-[32px] overflow-hidden border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E281C] shadow-md hover:shadow-xl transition-all duration-300 group"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 h-64 lg:h-full relative overflow-hidden bg-slate-100 dark:bg-black/20">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=1200&auto=format&fit=crop&q=80"
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 bg-[#10B981] text-white text-xs font-black uppercase px-3 py-1 rounded-lg shadow-md">
                  ★ {isBn ? "ফিচার্ড আর্টিকেল" : "Featured Guide"}
                </div>
              </div>

              <div className="lg:col-span-6 p-6 sm:p-10 space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/60">
                  <span className="font-bold text-emerald-600 dark:text-[#34D399] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    {featuredPost.categoryBn}
                  </span>
                  <span>•</span>
                  <span>{featuredPost.readTime}</span>
                  <span>•</span>
                  <span>{featuredPost.publishedAt}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0F172A] dark:text-white leading-snug group-hover:text-[#059669] dark:group-hover:text-[#34D399] transition-colors">
                  {featuredPost.title}
                </h2>

                <p className="text-sm text-slate-600 dark:text-white/70 leading-relaxed line-clamp-3">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2 flex items-center gap-2 text-emerald-600 dark:text-[#34D399] font-display font-bold text-sm">
                  <span>{isBn ? "সম্পূর্ণ পড়ুন" : "Read Full Guide"}</span>
                  <ArrowRightIcon size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E281C] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="h-48 w-full overflow-hidden relative bg-slate-100 dark:bg-white/5">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?w=1200&auto=format&fit=crop&q=80"
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute bottom-3 left-3 bg-white/90 dark:bg-[#071D13]/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-700 dark:text-white/90 border border-slate-200/60 dark:border-white/10">
                    {post.categoryBn}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-white/50">
                    <ClockIcon size={12} />
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{post.publishedAt}</span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#0F172A] dark:text-white leading-snug group-hover:text-[#059669] dark:group-hover:text-[#34D399] transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 dark:border-white/5 mt-4 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-[#34D399]">
                <span>{isBn ? "পড়ুন" : "Read Article"}</span>
                <ArrowRightIcon size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA Card */}
        <section className="mt-16 rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-[#064E3B] to-[#0A2318] text-white border border-emerald-500/30 text-center space-y-5 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
              {isBn ? "আপনার দোকানের কাস্টমার রিটেনশন আজই বাড়ান" : "Start Retaining Your Repeat Customers Today"}
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              {isBn
                ? "কোনো অ্যাপ ডাউনলোড ছাড়া মাত্র ৩ মিনিটে ডিজিটাল স্ট্যাম্প কার্ড সেটআপ করুন। বিনামূল্যে ট্রায়াল শুরু করুন।"
                : "Set up digital stamp cards in 3 minutes with zero app download required for customers. Try Sealsela free."}
            </p>
            <div className="pt-2 flex justify-center">
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-black text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <span>{isBn ? "মার্চেন্ট অ্যাকাউন্ট খুলুন" : "Create Merchant Account"}</span>
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-8 text-center text-xs text-slate-500 dark:text-white/60">
        <p>© {new Date().getFullYear()} Sealsela. All rights reserved.</p>
      </footer>
    </div>
  )
}

