import React from "react"

export default function RewardsSkeleton() {
  return (
    <div className="space-y-4 w-full animate-fade-in">
      {/* Rewards Summary Banner Skeleton */}
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-sm space-y-3 shimmer">
        <div className="h-4 bg-emerald-500/20 rounded w-1/3 animate-pulse" />
        <div className="h-8 bg-emerald-500/30 rounded-lg w-2/5 animate-pulse" />
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C]/90 p-4 space-y-3 shadow-sm shimmer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-28 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-16 animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-16 bg-amber-400/20 rounded-full animate-pulse" />
            </div>
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

