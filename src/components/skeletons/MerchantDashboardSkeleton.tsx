import React from "react"

export default function MerchantDashboardSkeleton() {
  return (
    <div className="space-y-6 w-full animate-fade-in p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Banner & Profile Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shimmer">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0 animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 bg-slate-200 dark:bg-white/10 rounded-lg w-48 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] p-5 shadow-sm space-y-3 shimmer"
          >
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-slate-200 dark:bg-white/5 rounded w-20 animate-pulse" />
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="h-7 bg-slate-200 dark:bg-white/10 rounded-md w-24 animate-pulse" />
            <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-16 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Live Stamp Scanner / Action Terminal + Recent Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] p-6 space-y-4 shadow-sm shimmer">
          <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md w-36 animate-pulse" />
          <div className="aspect-square rounded-2xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center animate-pulse">
            <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-white/10 animate-pulse" />
          </div>
          <div className="h-11 rounded-xl bg-slate-200 dark:bg-white/10 w-full animate-pulse" />
        </div>

        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C] p-6 space-y-4 shadow-sm shimmer">
          <div className="flex justify-between items-center">
            <div className="h-5 bg-slate-200 dark:bg-white/10 rounded-md w-40 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-20 animate-pulse" />
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-28" />
                    <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-16" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-white/10 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

