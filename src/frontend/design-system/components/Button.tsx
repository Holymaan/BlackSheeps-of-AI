import React from 'react'
import { cn } from './utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-bus-yellow text-bus-navy-dark font-semibold hover:bg-bus-yellow-dark ' +
    'focus-visible:ring-bus-yellow shadow-sm active:scale-[0.98]',
  secondary:
    'bg-bus-navy text-white font-semibold hover:bg-bus-navy-dark ' +
    'focus-visible:ring-bus-navy shadow-sm active:scale-[0.98]',
  outline:
    'border-2 border-bus-navy text-bus-navy bg-transparent font-semibold ' +
    'hover:bg-bus-navy-light focus-visible:ring-bus-navy',
  ghost:
    'text-bus-navy bg-transparent font-semibold ' +
    'hover:bg-bus-navy-light focus-visible:ring-bus-navy',
  danger:
    'bg-red-600 text-white font-semibold hover:bg-red-700 ' +
    'focus-visible:ring-red-600 shadow-sm active:scale-[0.98]',
}

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
  md: 'h-10 px-4 text-base rounded-lg gap-2',
  lg: 'h-12 px-6 text-lg rounded-lg gap-2',
  xl: 'h-14 px-8 text-xl rounded-xl gap-2.5',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-display',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
