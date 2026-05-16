import React from 'react'
import { cn } from './utils'

type LogoVariant = 'full' | 'icon'
type LogoSize = 'sm' | 'md' | 'lg'

const SIZE_ICON: Record<LogoSize, string> = {
  sm: 'h-7',
  md: 'h-10',
  lg: 'h-14',
}

const SIZE_FULL: Record<LogoSize, string> = {
  sm: 'h-7',
  md: 'h-10',
  lg: 'h-14',
}

interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
}

/* Icon-only bus SVG */
function BusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 56"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="4"  y="10" width="100" height="30" rx="6"   fill="#F5B800"/>
      <rect x="92" y="10" width="12"  height="30" rx="5"   fill="#E5A800"/>
      <rect x="93" y="14" width="10"  height="14" rx="2.5" fill="#93C5FD"/>
      <rect x="10" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="28" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="46" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="64" y="16" width="14"  height="13" rx="2.5" fill="#1B4F8A"/>
      <rect x="4"  y="32" width="100" height="3"  rx="1"   fill="#C8980A"/>
      <rect x="105" y="24" width="9"  height="9"  rx="2"   fill="#FEF08A"/>
      <rect x="5"  y="18" width="3"   height="14" rx="1.5" fill="#C8980A"/>
      <rect x="16" y="40" width="72"  height="2"  rx="1"   fill="#C8980A"/>
      <circle cx="22" cy="46" r="8"   fill="#1F2937"/>
      <circle cx="22" cy="46" r="3.5" fill="#F5B800"/>
      <circle cx="86" cy="46" r="8"   fill="#1F2937"/>
      <circle cx="86" cy="46" r="3.5" fill="#F5B800"/>
    </svg>
  )
}

export function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  if (variant === 'icon') {
    return (
      <span className={cn('inline-flex items-center', className)} aria-label="Žuti Autobus">
        <BusIcon className={SIZE_ICON[size]} />
      </span>
    )
  }

  return (
    <span
      className={cn('inline-flex items-center gap-3', className)}
      aria-label="Žuti Autobus Split"
    >
      <BusIcon className={SIZE_FULL[size]} />
      <span className="flex flex-col leading-none">
        <span className="font-display font-extrabold tracking-tight text-bus-navy">
          <span className="text-bus-yellow-dark">Žuti</span>
          {' '}autobus
        </span>
        <span className="font-display text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase">
          Split
        </span>
      </span>
    </span>
  )
}
