import { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 24) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const })

export function HomeIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

export function CompassIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
}

export function ScanIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
}

export function GiftIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
}

export function UserIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

export function ChartIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}

export function UsersIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}

export function StarIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}

export function MegaphoneIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
}

export function SettingsIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}

export function CheckIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="20 6 9 17 4 12"/></svg>
}

export function XIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

export function ChevronRightIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="9 18 15 12 9 6"/></svg>
}

export function ChevronLeftIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="15 18 9 12 15 6"/></svg>
}

export function BellIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
}

export function QRIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="6" y="6" width="1" height="1" fill="currentColor"/><rect x="17" y="6" width="1" height="1" fill="currentColor"/><rect x="6" y="17" width="1" height="1" fill="currentColor"/><path d="M14 14h3v3h-3z"/><path d="M17 17h3v3h-3z"/><path d="M14 17h0"/><path d="M17 14h3v0"/></svg>
}

export function DownloadIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
}

export function ShareIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
}

export function MapPinIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
}

export function ClockIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}

export function TrendingUpIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}

export function RefreshIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
}

export function InstagramIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
}

export function FacebookIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
}

export function ExternalLinkIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
}

export function ShieldCheckIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
}

export function SearchIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

export function FireIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>
}

export function CopyIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
}

export function LogOutIcon({ size = 24, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}

export function CameraIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function FlipCameraIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.126.83 4.057 2.188 5.5L4 18h6v-6l-2.22 2.22A5.96 5.96 0 016 10c0-3.314 2.686-6 6-6s6 2.686 6 6c0 1.62-.64 3.09-1.68 4.17l1.42 1.42A7.95 7.95 0 0020 10z" />
      <path d="M12 7v6l4-3-4-3z" />
    </svg>
  )
}

export function FlashIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function PrinterIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

export function SparklesIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 3l1.912 5.885L20 10.8l-5.088 3.915L16.824 21 12 17.2 7.176 21l1.912-6.285L4 10.8l6.088-1.915L12 3z" />
    </svg>
  )
}

export function TrophyIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M4 5h16v6a7 7 0 0 1-14 0V5z" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
    </svg>
  )
}

export function MedalIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="14" r="6" />
      <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12" />
      <path d="M12 2v6" />
      <path d="M7 3h10" />
    </svg>
  )
}

export function LockIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function KeyIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 3-9.5 9.5" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  )
}

export function SmartphoneIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

export function FileTextIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

export function GlobeIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function ImageIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function AlertTriangleIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function ShieldIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

export function CoffeeIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  )
}

export function BarChartIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  )
}

export function AnalyticsIcon({ size = 24, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
