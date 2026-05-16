import React from 'react'
import { cn } from './utils'
import { Input, type InputProps } from './Input'

export interface FormFieldProps extends InputProps {
  label: string
  hint?: string
  errorMessage?: string
  required?: boolean
}

export function FormField({
  label,
  hint,
  errorMessage,
  required,
  id,
  className,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const hasError = Boolean(errorMessage)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={fieldId}
        className="font-display text-sm font-semibold text-gray-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        )}
      </label>

      <Input
        id={fieldId}
        error={hasError}
        aria-describedby={
          hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        }
        {...inputProps}
      />

      {hint && !hasError && (
        <p id={`${fieldId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}

      {hasError && (
        <p id={`${fieldId}-error`} className="flex items-center gap-1 text-xs text-red-600" role="alert">
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3A.75.75 0 018 5zm0 6.5a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
