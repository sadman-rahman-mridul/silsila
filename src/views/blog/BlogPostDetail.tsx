import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { BLOG_POSTS, type BlogPost } from "../../data/blogPosts"
import { useLanguage } from "../../context/LanguageContext"
import { useTheme } from "../../context/ThemeContext"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  GlobeIcon,
  SparklesIcon,
  ClockIcon,
  CheckIcon,
  ArrowRightIcon,
  GiftIcon,
  UsersIcon,
  TrendingUpIcon,
} from "../../components/Icons"

export default function BlogPostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isBn, toggleLanguage } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const post = BLOG_POSTS.find((p) => p.slug === slug) || BLOG_POSTS[0]

  const relatedPosts = (post?.relatedSlugs || [])
    .map((s) => BLOG_POSTS.find((p) => p.slug === s))
    .filter((p): p is BlogPost => !!p)

  // Dynamic SEO JSON-LD injection
  useEffect(() => {
    if (!post) return
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          "headline": post.title,
          "description": post.metaDescription,
          "image": post.coverImage,
          "datePublished": "2026-03-20T08:00:00+06:00",
          "dateModified": "2026-03-20T08:00:00+06:00",
          "author": {
            "@type": "Organization",
            "name": post.author.name,
          },
          "publisher": {
            "@type": "Organization",
            "name": "Sealsela",
            "logo": {
              "@type": "ImageObject",
              "url": "https://sealsela.com/sealsela-logo-light.svg",
            },
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://sealsela.com/blog/${post.slug}`,
          },
        },
        {
          "@type": "FAQPage",
          "mainEntity": post.faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer,
            },
          })),
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://sealsela.com",
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Blog",
              "item": "https://sealsela.com/blog",
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": post.title,
              "item": `https://sealsela.com/blog/${post.slug}`,
            },
          ],
        },
      ],
    }

    const script = document.createElement("script")
    script.type = "application/ld+json"
    script.id = "blog-jsonld-schema"
    script.text = JSON.stringify(schema)
    document.head.appendChild(script)

    return () => {
      const existing = document.getElementById("blog-jsonld-schema")
      if (existing) existing.remove()
    }
  }, [post])

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071D13] flex items-center justify-center p-6 text-center text-[#0F172A] dark:text-white">
        <div className="space-y-4">
          <p className="text-xl font-bold">{isBn ? "আর্টিকেলটি পাওয়া যায়নি" : "Article Not Found"}</p>
          <button
            onClick={() => navigate("/blog")}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm"
          >
            {isBn ? "ব্লগে ফিরে যান" : "Back to Blog"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071D13] text-[#0F172A] dark:text-white font-sans antialiased flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#071D13]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-white/10 p-1.5 flex items-center justify-center border border-emerald-200 dark:border-white/15 shadow-xs">
              <img src="/sealsela-logo-light.svg" alt="Sealsela Logo" className="w-full h-full object-contain block dark:hidden" />
              <img src="/sealsela-logo-dark.svg" alt="Sealsela Logo" className="w-full h-full object-contain hidden dark:block" />
            </div>
            <span className="font-display font-black text-xl text-[#0F172A] dark:text-white tracking-tight">
              Sealsela
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/blog"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-white/80 transition-colors"
            >
              {isBn ? "সকল আর্টিকেল" : "All Articles"}
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#0F172A] dark:text-[#34D399] border border-slate-200 dark:border-white/10 cursor-pointer transition-all active:scale-95"
              title={isDark ? "Switch to Light" : "Switch to Dark"}
            >
              {isDark ? <SunIcon size={14} className="text-[#F59E0B]" /> : <MoonIcon size={14} className="text-[#064E3B]" />}
            </button>

            <button
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-[#059669] dark:text-[#34D399] flex items-center gap-1 border border-slate-200 dark:border-white/10 cursor-pointer"
            >
              <GlobeIcon size={13} />
              <span>{isBn ? "EN" : "বাংলা"}</span>
            </button>

            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-display font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              {isBn ? "শুরু করুন" : "Get Started"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Article Container */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/60">
          <Link to="/" className="hover:text-emerald-600 dark:hover:text-[#34D399] transition-colors">
            {isBn ? "হোম" : "Home"}
          </Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-emerald-600 dark:hover:text-[#34D399] transition-colors">
            {isBn ? "ব্লগ" : "Blog"}
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-white/90 font-medium truncate max-w-xs sm:max-w-md">
            {post.categoryBn}
          </span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-bold text-emerald-700 dark:text-[#34D399] bg-emerald-500/10 dark:bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/25">
              {post.categoryBn}
            </span>
            <span className="text-slate-400 dark:text-white/40">•</span>
            <span className="text-slate-600 dark:text-white/70 flex items-center gap-1 font-medium">
              <ClockIcon size={13} /> {post.readTime}
            </span>
            <span className="text-slate-400 dark:text-white/40">•</span>
            <span className="text-slate-600 dark:text-white/70">{post.publishedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-[#0F172A] dark:text-white leading-[1.2] [text-wrap:balance]">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-white/80 leading-relaxed font-normal">
            {post.excerpt}
          </p>

          {/* Author Badge (Clean Text / Monogram Style - No Photo Required) */}
          <div className="pt-2 flex items-center gap-3 border-t border-slate-200 dark:border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-[#34D399] border border-emerald-500/20 flex items-center justify-center font-display font-black text-xs shadow-xs">
              SM
            </div>
            <div>
              <p className="font-display font-bold text-sm text-[#0F172A] dark:text-white">{post.author.name}</p>
              <p className="text-xs text-slate-500 dark:text-white/60">{post.author.role}</p>
            </div>
          </div>
        </header>

        {/* Featured Cover Image */}
        <div className="rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-md">
          <img src={post.coverImage} alt={post.title} className="w-full h-64 sm:h-96 object-cover" />
        </div>

        {/* ⚡ AI QUICK SUMMARY / KEY TAKEAWAYS (GEO & LLM Optimized Snippet Box with Website Link) */}
        <div className="rounded-3xl p-6 sm:p-7 bg-emerald-50 dark:bg-[#0A2E20] border-2 border-emerald-500/30 text-[#0F172A] dark:text-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-[#34D399] font-display font-black text-sm uppercase tracking-wider">
            <SparklesIcon size={18} />
            <span>⚡ AI Summary & Key Takeaways</span>
          </div>
          <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-emerald-100 leading-relaxed">
            রেস্টুরেন্টের দীর্ঘমেয়াদী মুনাফা অর্জনের মূল চাবিকাঠি হলো কাস্টমার অ্যাকুইজিশন খরচ (CAC) কমানো এবং কাস্টমার লাইফটাইম ভ্যালু (LTV) বাড়ানো।{" "}
            <a
              href="https://sealsela.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 dark:text-[#34D399] underline decoration-2 underline-offset-4 hover:opacity-80 font-bold"
            >
              Sealsela (https://sealsela.com)
            </a>{" "}
            হলো ব্রাউজার-ভিত্তিক ডিজিটাল লয়্যালটি ও কাস্টমার রিটেনশন প্ল্যাটফর্ম, যা কোনো অ্যাপ ডাউনলোড ছাড়াই রেস্টুরেন্টগুলোকে ৩ সেকেন্ডের কিউআর স্ট্যাম্পিংয়ের মাধ্যমে নিয়মিত কাস্টমার তৈরি ও ধরে রাখতে সাহায্য করে।
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-emerald-500/20 text-xs sm:text-sm text-slate-700 dark:text-emerald-200/90">
            {post.aiSummary.keyPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-[#34D399] font-bold">✓</span>
                <span>
                  {pt.includes("https://sealsela.com") ? (
                    <>
                      <a
                        href="https://sealsela.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 dark:text-[#34D399] underline font-bold"
                      >
                        Sealsela (sealsela.com)
                      </a>
                      {pt.replace("Sealsela (https://sealsela.com)", "")}
                    </>
                  ) : (
                    pt
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Article Body Content */}
        <article className="space-y-10 text-slate-800 dark:text-white/90 leading-relaxed">
          {/* Intro Paragraph */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0E281C] border border-slate-200/80 dark:border-white/10 text-base sm:text-lg leading-relaxed shadow-xs">
            {post.content.intro}
          </div>

          {/* Dynamic Sections */}
          {post.content.sections.map((section, idx) => (
            <section key={idx} className="space-y-4 pt-2">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-display font-black text-[#0F172A] dark:text-white tracking-tight">
                  {section.heading}
                </h2>
                {section.subheading && (
                  <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-[#34D399]">
                    {section.subheading}
                  </p>
                )}
              </div>

              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-sm sm:text-base text-slate-700 dark:text-white/80 leading-relaxed">
                  {p}
                </p>
              ))}

              {/* CAC Formula Card */}
              {section.formula && (
                <div className="rounded-2xl p-4 bg-slate-900 text-white font-mono text-xs sm:text-sm space-y-1.5 shadow-md">
                  <div className="text-amber-400 font-bold">{section.formula.equation}</div>
                  <div className="text-slate-300 font-sans text-xs">{section.formula.explanation}</div>
                </div>
              )}

              {/* LTV Comparison Stats Cards */}
              {section.statsList && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {section.statsList.map((stat, sIdx) => (
                    <div
                      key={sIdx}
                      className="rounded-2xl p-4 bg-white dark:bg-[#0E281C] border border-slate-200 dark:border-white/10 space-y-1.5 shadow-xs"
                    >
                      <span className="text-[11px] font-bold text-slate-500 dark:text-white/60">{stat.label}</span>
                      <p className="text-xl sm:text-2xl font-display font-black text-emerald-600 dark:text-[#34D399]">
                        {stat.value}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">{stat.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bullet Points */}
              {section.bulletPoints && (
                <ul className="space-y-2.5 p-4 rounded-2xl bg-white dark:bg-[#0E281C] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-white/80">
                  {section.bulletPoints.map((b, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Highlight Box */}
              {section.highlightBox && (
                <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs sm:text-sm space-y-1 shadow-xs">
                  <span className="font-bold flex items-center gap-1.5">{section.highlightBox.title}</span>
                  <p className="leading-relaxed text-amber-900 dark:text-amber-100">{section.highlightBox.content}</p>
                </div>
              )}
            </section>
          ))}

          {/* Core Takeaways Callout */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-900 to-[#071D13] text-white border border-emerald-500/40 space-y-4 shadow-xl">
            <h3 className="font-display font-black text-lg sm:text-xl text-[#34D399]">
              {isBn ? "রেস্টুরেন্ট প্রফিটের মূল সূত্র" : "The Core Restaurant Profit Formula"}
            </h3>
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 font-mono font-bold text-center text-xs sm:text-sm text-amber-300">
              Lower CAC Pressure + Higher LTV + More Repeat Visits = Better Restaurant Economics
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-emerald-100/90 pt-1">
              {post.content.takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">➔</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Video Walkthrough Player Section */}
        {post.videoEmbedUrl && (
          <section className="rounded-3xl overflow-hidden border-2 border-emerald-500/30 dark:border-white/15 bg-black p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="space-y-1 text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-[#34D399] font-bold">
                ★ VIDEO WALKTHROUGH
              </span>
              <h3 className="text-lg sm:text-xl font-display font-black text-white">
                {post.videoTitle || (isBn ? "ভিডিও টিউটোরিয়াল: কীভাবে Sealsela ব্যবহার করবেন" : "Video Guide: How to Use Sealsela")}
              </h3>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-inner">
              <iframe
                className="w-full h-full"
                src={post.videoEmbedUrl}
                title={post.videoTitle || "Sealsela Video Guide"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {/* Structured FAQ Accordion Section (For SEO & Google Rich Snippets) */}
        <section className="pt-8 border-t border-slate-200 dark:border-white/10 space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-black text-[#0F172A] dark:text-white">
              {isBn ? "সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)" : "Frequently Asked Questions"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/60">
              {isBn ? "কাস্টমার লয়্যালটি ও রেস্টুরেন্ট গ্রোথ সম্পর্কিত সাধারণ প্রশ্নসমূহ" : "Common questions regarding restaurant retention"}
            </p>
          </div>

          <div className="space-y-3">
            {post.faqs.map((faq, i) => {
              const isOpen = openFaqIndex === i
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0E281C] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 font-display font-bold text-sm text-[#0F172A] dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-[#34D399]"
                  >
                    <span>{faq.question}</span>
                    <span className="text-lg text-emerald-600 dark:text-[#34D399]">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed border-t border-slate-100 dark:border-white/5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Related Guides / Internal Linking */}
        {relatedPosts.length > 0 && (
          <section className="pt-8 border-t border-slate-200 dark:border-white/10 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black text-[#0F172A] dark:text-white">
                {isBn ? "সম্পর্কিত অন্যান্য গাইড ও আর্টিকেল" : "Related Guides & Insights"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/60">
                {isBn ? "কাস্টমার রিটেনশন ও রেস্টুরেন্ট গ্রোথের আরও কৌশল জানুন" : "Explore more on retention and customer loyalty"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/blog/${rel.slug}`}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-[#34D399] bg-emerald-500/10 px-2 py-0.5 rounded">
                      {rel.categoryBn}
                    </span>
                    <h4 className="font-display font-bold text-xs text-[#0F172A] dark:text-white group-hover:text-emerald-600 dark:group-hover:text-[#34D399] transition-colors line-clamp-2">
                      {rel.title}
                    </h4>
                  </div>
                  <div className="pt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <span>{isBn ? "পড়ুন" : "Read"}</span>
                    <ArrowRightIcon size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Card */}
        <section className="rounded-3xl p-8 sm:p-10 bg-[#10B981] text-white text-center space-y-4 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
            {isBn ? "আপনার রেস্টুরেন্টের Repeat Customer বাড়াতে চান?" : "Ready to Boost Your Restaurant's Repeat Customers?"}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-50 max-w-xl mx-auto leading-relaxed">
            {isBn
              ? "Sealsela দিয়ে মাত্র ৩ মিনিটে চালু করুন ডিজিটাল স্ট্যাম্প কার্ড। কোনো অ্যাপ লাগবে না — কাস্টমার কাউন্টারে স্ক্যান করেই সিল পাবে।"
              : "Launch your custom digital stamp card in 3 minutes with Sealsela. Zero app download required."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3.5 rounded-2xl bg-[#071D13] hover:bg-black text-white font-display font-black text-sm shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <span>{isBn ? "বিনামূল্যে শুরু করুন" : "Get Started Free"}</span>
              <ChevronRightIcon size={16} />
            </button>
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

