import React from "react"
import { HomeIcon, CompassIcon, ScanIcon, GiftIcon, UserIcon } from "./Icons"
import { useAuth } from "../context/AuthContext"
import { useLanguage } from "../context/LanguageContext"

export type CustomerTab = "home" | "explore" | "scan" | "rewards" | "profile"

interface CustomerBottomNavProps {
  activeTab?: CustomerTab | null
  onTabChange: (tab: CustomerTab) => void
  readyRewardsCount?: number
}

export default function CustomerBottomNav({
  activeTab,
  onTabChange,
  readyRewardsCount = 0,
}: CustomerBottomNavProps) {
  const { profile, user } = useAuth()
  const { isBn } = useLanguage()

  const avatarUrl = profile?.avatarUrl || profile?.photoURL || user?.photoURL

  return (
    <nav className="flex-shrink-0 bg-white/95 dark:bg-[#092015]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-1 pb-safe shadow-lg dark:shadow-2xl z-20 w-full transition-colors">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-0.5">
        <NavBtn
          icon={<HomeIcon size={21} />}
          label={isBn ? "হোম" : "Home"}
          active={activeTab === "home"}
          onClick={() => onTabChange("home")}
        />
        <NavBtn
          icon={<CompassIcon size={21} />}
          label={isBn ? "খুঁজুন" : "Explore"}
          active={activeTab === "explore"}
          onClick={() => onTabChange("explore")}
        />

        <button
          onClick={() => onTabChange("scan")}
          className="flex flex-col items-center -mt-4 relative cursor-pointer active:scale-95 transition-transform group"
          title={isBn ? "স্ক্যান" : "Scan"}
        >
          <div
            className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl transition-all ${
              activeTab === "scan"
                ? "bg-[#F59E0B] glow-amber"
                : "bg-gradient-to-br from-[#10B981] to-[#047857] glow-emerald border border-white/20"
            }`}
          >
            <ScanIcon size={22} className="text-[#071D13]" />
          </div>
          <span
            className={`text-[10px] mt-0.5 font-bold ${
              activeTab === "scan" ? "text-[#F59E0B]" : "text-[#059669] dark:text-[#52B788]"
            }`}
          >
            {isBn ? "স্ক্যান" : "Scan"}
          </span>
        </button>

        <NavBtn
          icon={<GiftIcon size={21} />}
          label={isBn ? "পুরস্কার" : "Rewards"}
          active={activeTab === "rewards"}
          onClick={() => onTabChange("rewards")}
          badge={readyRewardsCount > 0 ? readyRewardsCount : undefined}
        />

        <NavBtn
          icon={
            avatarUrl ? (
              <div
                className={`w-6 h-6 rounded-full overflow-hidden border transition-all ${
                  activeTab === "profile"
                    ? "border-[#059669] dark:border-[#34D399] ring-2 ring-[#059669]/40 dark:ring-[#34D399]/40 shadow-sm"
                    : "border-slate-300 dark:border-white/40 opacity-70 group-hover:opacity-100"
                }`}
              >
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <UserIcon size={21} />
            )
          }
          label={isBn ? "প্রোফাইল" : "Profile"}
          active={activeTab === "profile"}
          onClick={() => onTabChange("profile")}
        />
      </div>
    </nav>
  )
}

function NavBtn({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center pt-2.5 pb-1 px-3 relative cursor-pointer group active:scale-95 transition-all"
    >
      <div className="relative">
        <span
          className={`transition-colors ${
            active
              ? "text-[#059669] dark:text-[#34D399] drop-shadow-sm"
              : "text-slate-400 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/70"
          }`}
        >
          {icon}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-[#F59E0B] text-[#0A2318] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {badge}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] mt-1 font-semibold transition-colors ${
          active
            ? "text-[#059669] dark:text-[#34D399]"
            : "text-slate-400 dark:text-white/40 group-hover:text-slate-700 dark:group-hover:text-white/70"
        }`}
      >
        {label}
      </span>
    </button>
  )
}
