interface StampGridProps {
  filled: number
  total: number
  size?: "sm" | "md" | "lg"
  showNumbers?: boolean
  variant?: "coffee" | "stamp"
}

export default function StampGrid({
  filled,
  total,
  size = "md",
  showNumbers = false,
  variant = "coffee",
}: StampGridProps) {
  const stamps = Array.from({ length: total }, (_, i) => i)
  const isLast = (i: number) => i === total - 1

  const dim =
    size === "sm"
      ? "w-8 h-8 text-xs rounded-xl"
      : size === "lg"
      ? "w-14 h-14 text-xl rounded-2xl"
      : "w-11 h-11 text-base rounded-2xl"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stamps.map((i) => {
        const isFilled = i < filled
        const isReward = isLast(i)

        return (
          <div
            key={i}
            className={[
              dim,
              "flex items-center justify-center relative transition-all duration-300 shadow-md",
              isFilled
                ? isReward
                  ? "bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-[#0A2318] glow-amber scale-105 border border-[#FDE68A]"
                  : "bg-gradient-to-br from-[#10B981] to-[#047857] text-white glow-emerald border border-[#34D399]/40"
                : isReward
                ? "border-2 border-dashed border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border border-white/15 bg-[#071D13] text-white/40",
            ].join(" ")}
            title={`সিল ${i + 1} (${isFilled ? "সংগৃহীত" : "বাকি"})`}
          >
            {isReward ? (
              <span className={isFilled ? "text-xl drop-shadow-sm animate-bounce" : "text-base opacity-70"}>
                🎁
              </span>
            ) : isFilled ? (
              variant === "coffee" ? (
                <span className="text-sm drop-shadow-sm animate-fade-in">☕</span>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5"}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )
            ) : variant === "coffee" ? (
              <span className="text-sm opacity-25 grayscale select-none">☕</span>
            ) : showNumbers ? (
              <span className="text-white/40 font-display font-bold text-xs">{i + 1}</span>
            ) : null}

            {isFilled && (
              <span className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
            )}
          </div>
        )
      })}
    </div>
  )
}
