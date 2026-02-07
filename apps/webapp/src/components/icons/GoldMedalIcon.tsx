import { type SVGProps } from "react"

interface GoldMedalIconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

export function GoldMedalIcon({
  size = 64,
  className,
  ...props
}: GoldMedalIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FF8C00" />
        </linearGradient>
        <linearGradient
          id="goldDarkGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#DAA520" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
        <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#DC143C" />
          <stop offset="50%" stopColor="#FF4500" />
          <stop offset="100%" stopColor="#DC143C" />
        </linearGradient>
      </defs>

      <path d="M22 8L18 2L26 2L30 8Z" fill="url(#ribbonGradient)" />
      <path d="M42 8L38 2L46 2L42 8Z" fill="url(#ribbonGradient)" />
      <rect x="26" y="2" width="12" height="8" fill="url(#ribbonGradient)" />

      <circle
        cx="32"
        cy="36"
        r="22"
        fill="url(#goldDarkGradient)"
        stroke="url(#goldGradient)"
        strokeWidth="2"
      />

      <circle cx="32" cy="36" r="18" fill="url(#goldGradient)" />

      <path
        d="M32 22L35.5 30.5H44L37.5 36L40 45L32 40L24 45L26.5 36L20 30.5H28.5L32 22Z"
        fill="url(#goldDarkGradient)"
        stroke="#FFD700"
        strokeWidth="0.5"
      />

      <ellipse
        cx="26"
        cy="30"
        rx="3"
        ry="5"
        fill="white"
        fillOpacity="0.3"
        transform="rotate(-30 26 30)"
      />
    </svg>
  )
}

