import React from 'react'
import { cn } from './utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, startIcon, endIcon, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {startIcon && (
          <span className="absolute left-3 flex items-center text-gray-400 pointer-events-none">
            {startIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-white font-body text-base text-gray-900',
            'placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-300'
              : 'border-gray-300 focus:border-bus-navy focus:ring-bus-navy/20',
            startIcon ? 'pl-10' : 'pl-3',
            endIcon   ? 'pr-10' : 'pr-3',
            'py-2.5',
            className,
          )}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {endIcon && (
          <span className="absolute right-3 flex items-center text-gray-400 pointer-events-none">
            {endIcon}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
