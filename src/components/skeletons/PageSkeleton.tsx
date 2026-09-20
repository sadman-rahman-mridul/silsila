import React from "react"

export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#071D13] flex flex-col justify-between w-full">
      {/* Top Header Placeholder */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#071D13]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md w-24 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            <div className="w-16 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="space-y-3 max-w-xl">
          <div className="h-8 sm:h-10 bg-slate-200 dark:bg-white/10 rounded-xl w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-white/5 rounded-md w-full animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-white/5 rounded-md w-2/3 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C]/90 p-5 space-y-3 shimmer"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
              <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md w-3/4 animate-pulse" />
              <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

