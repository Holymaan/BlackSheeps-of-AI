import React from 'react'
import { cn } from './utils'

/* ── Card root ──────────────────────────────────────────── */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  highlight?: 'yellow' | 'navy' | 'none'
}

export function Card({ elevated = false, highlight = 'none', className, children, ...props }: CardProps) {
  const highlightClass = {
    yellow: 'border-t-4 border-t-bus-yellow',
    navy:   'border-t-4 border-t-bus-navy',
    none:   '',
  }[highlight]

  return (
    <div
      className={cn(
        'rounded-xl bg-white border border-gray-200',
        elevated ? 'shadow-md' : 'shadow-sm',
        highlightClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/* ── Card.Header ─────────────────────────────────────────── */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: React.ReactNode
}

export function CardHeader({ title, description, action, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 px-6 pt-5 pb-4', className)}
      {...props}
    >
      <div>
        <h3 className="font-display text-lg font-bold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ── Card.Body ──────────────────────────────────────────── */
export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

/* ── Card.Footer ─────────────────────────────────────────── */
export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100', className)}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Body   = CardBody
Card.Footer = CardFooter
