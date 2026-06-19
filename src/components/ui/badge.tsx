import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
  className?: string
}

const variants = {
  default: 'bg-gray-700 text-gray-200',
  success: 'bg-green-900 text-green-300 border border-green-700',
  warning: 'bg-amber-900 text-amber-300 border border-amber-700',
  error: 'bg-red-900 text-red-300 border border-red-700',
  info: 'bg-blue-900 text-blue-300 border border-blue-700',
  secondary: 'bg-purple-900 text-purple-300 border border-purple-700',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

import type { POStatus, PaymentStatus, PaymentType } from '@/types'

export function POStatusBadge({ status }: { status: POStatus }) {
  const config: Record<POStatus, { label: string; variant: BadgeProps['variant'] }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    pi_sent: { label: 'PI Sent', variant: 'info' },
    payment_pending: { label: 'Payment Pending', variant: 'warning' },
    in_production: { label: 'In Production', variant: 'info' },
    ready_for_inspection: { label: 'Ready for Inspection', variant: 'warning' },
    in_inspection: { label: 'In Inspection', variant: 'warning' },
    dispatched: { label: 'Dispatched', variant: 'success' },
    delivered: { label: 'Delivered', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'error' },
  }
  const c = config[status]
  return <Badge variant={c.variant}>{c.label}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending', variant: 'warning' },
    uploaded: { label: 'Proof Uploaded', variant: 'info' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'error' },
  }
  const c = config[status]
  return <Badge variant={c.variant}>{c.label}</Badge>
}
