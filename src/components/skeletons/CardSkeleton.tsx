import React from "react"

interface CardSkeletonProps {
  count?: number
}

export default function CardSkeleton({ count = 2 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0E281C]/90 shadow-sm relative shimmer"
        >
          {/* Cover image placeholder */}
          <div className="h-28 sm:h-32 w-full bg-slate-200 dark:bg-white/5 animate-pulse" />

          <div className="p-4 pt-3">
            {/* Header with Avatar and Names */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-md w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded-md w-1/2 animate-pulse" />
              </div>
            </div>

            {/* Stamp progress bar placeholder */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/4 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/6 animate-pulse" />
              </div>
              <div className="h-2 bg-slate-200 dark:bg-white/10 rounded-full w-full animate-pulse" />
            </div>

            {/* Stamp Slots matrix placeholder */}
            <div className="flex gap-2 justify-between py-2 border-t border-slate-100 dark:border-white/5">
              {Array.from({ length: 5 }).map((_, slotIdx) => (
                <div
                  key={slotIdx}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 animate-pulse"
                />
              ))}
            </div>

            {/* Footer action placeholder */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
              <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/3 animate-pulse" />
              <div className="h-6 bg-slate-200 dark:bg-white/10 rounded-lg w-20 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

