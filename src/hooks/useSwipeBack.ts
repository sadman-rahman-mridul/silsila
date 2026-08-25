import { useRef } from "react"

/**
 * Hook to handle mobile swipe-right gesture to navigate back.
 * Triggers when a user swipes from left to right on phone screen.
 */
export function useSwipeBack(onBack?: () => void, minDistance = 50) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || !onBack) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)

    // Swiped right by at least minDistance with limited vertical deviation
    if (deltaX > minDistance && deltaY < 100) {
      onBack()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return { onTouchStart, onTouchEnd }
}
