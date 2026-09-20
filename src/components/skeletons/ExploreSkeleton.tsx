import React from "react"

export default function ExploreSkeleton() {
  return (
    <div className="space-y-4 w-full animate-fade-in">
      {/* Search Bar Skeleton */}
      <div className="h-12 rounded-2xl bg-slate-200/80 dark:bg-white/10 w-full animate-pulse shimmer" />

      {/* Category Horizontal Filter Pills Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-white/10 shrink-0 animate-pulse"
          />
        ))}
      </div>

      {/* Merchant Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C]/90 p-4 shadow-sm shimmer"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-full mb-3 animate-pulse" />
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/3 animate-pulse" />
              <div className="h-7 bg-slate-200 dark:bg-white/10 rounded-xl w-20 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

