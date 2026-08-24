interface StampGridProps {
  filled: number
  total: number
  size?: "sm" | "md" | "lg"
  showNumbers?: boolean
}

export default function StampGrid({ filled, total, size = "md", showNumbers = false }: StampGridProps) {
  const stamps = Array.from({ length: total }, (_, i) => i)
  const isLast = (i: number) => i === total - 1

  const dim = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-base" : "w-10 h-10 text-sm"

  return (
    <div className="flex flex-wrap gap-2">
      {stamps.map((i) => {
        const isFilled = i < filled
        const isReward = isLast(i)

        return (
          <div
            key={i}
            className={[
              dim,
              "rounded-full flex items-center justify-center relative transition-all duration-300",
              isFilled
                ? "bg-[#1B4332] shadow-sm"
                : isReward
                ? "border-2 border-dashed border-[#F59E0B] bg-[#FFFBEB]"
                : "border-2 border-dashed border-[#E9E5DC] bg-[#F7F5F0]",
            ].join(" ")}
          >
            {isFilled && isReward ? (
              <span className="text-[#F59E0B]">
                <GiftSvg size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
              </span>
            ) : isFilled ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5"}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : isReward ? (
              <GiftSvg size={size === "sm" ? 14 : size === "lg" ? 20 : 16} color="#F59E0B" />
            ) : showNumbers ? (
              <span className="text-[#B0A99E] font-display font-semibold">{i + 1}</span>
            ) : null}

            {isFilled && (
              <span className="absolute inset-0 rounded-full bg-[#52B788] opacity-0 hover:opacity-20 transition-opacity" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function GiftSvg({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  )
}
