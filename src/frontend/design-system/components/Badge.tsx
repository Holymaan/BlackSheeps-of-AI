import React from 'react'
import { cn } from './utils'

type BadgeVariant =
  | 'critical'
  | 'strained'
  | 'underused'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'

const VARIANT: Record<BadgeVariant, string> = {
  critical:  'bg-red-100 text-red-700 ring-1 ring-red-200',
  strained:  'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  underused: 'bg-bus-navy-light text-bus-navy ring-1 ring-bus-navy-muted',
  success:   'bg-green-100 text-green-700 ring-1 ring-green-200',
  warning:   'bg-bus-yellow-light text-bus-yellow-darker ring-1 ring-bus-yellow/40',
  info:      'bg-bus-navy-light text-bus-navy ring-1 ring-bus-navy-muted',
  neutral:   'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
}

const DOT: Record<BadgeVariant, string> = {
  critical:  'bg-red-500',
  strained:  'bg-orange-500',
  underused: 'bg-bus-navy',
  success:   'bg-green-500',
  warning:   'bg-bus-yellow-dark',
  info:      'bg-bus-navy',
  neutral:   'bg-gray-400',
}

export interface BadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'neutral', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-semibold font-display',
        VARIANT[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
