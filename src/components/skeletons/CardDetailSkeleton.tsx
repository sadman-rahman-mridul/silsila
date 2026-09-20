import React from "react"

export default function CardDetailSkeleton() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-4 animate-fade-in w-full">
      {/* Top navigation bar skeleton */}
      <div className="flex items-center justify-between py-2">
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-28 animate-pulse" />
        <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
      </div>

      {/* Main Loyalty Card Container Skeleton */}
      <div className="rounded-[32px] overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] shadow-lg shimmer">
        {/* Cover image banner */}
        <div className="h-36 sm:h-44 w-full bg-slate-200 dark:bg-white/5 animate-pulse" />

        <div className="p-5 -mt-6 relative bg-white dark:bg-[#0E281C] rounded-t-[28px]">
          {/* Logo & Store Info */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-white/10 border-2 border-white dark:border-[#0E281C] shadow-md shrink-0 animate-pulse -mt-8" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md w-3/5 animate-pulse" />
              <div className="h-3 bg-slate-200 dark:bg-white/5 rounded-md w-2/5 animate-pulse" />
            </div>
          </div>

          {/* Stamp Matrix Board Skeleton */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#071D13] border border-slate-200/60 dark:border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-slate-200 dark:bg-white/10 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-md w-12 animate-pulse" />
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-slate-200/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse flex items-center justify-center"
                />
              ))}
            </div>

            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full w-full animate-pulse" />
          </div>

          {/* Reward Target Details */}
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
            <div className="h-4 bg-emerald-500/20 rounded w-2/3 animate-pulse" />
            <div className="h-3 bg-emerald-500/10 rounded w-4/5 animate-pulse" />
          </div>

          {/* Action Button Skeleton */}
          <div className="mt-5 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 w-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}

