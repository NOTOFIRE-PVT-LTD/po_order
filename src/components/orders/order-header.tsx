'use client'

import { useState } from 'react'
import Link from 'next/link'
import { POStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OrderHeader({ order, profile }: { order: Record<string, unknown>; profile: Record<string, unknown> | null }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  function copyLink() {
    const link = `${window.location.origin}/portal/${order.secure_token as string}`
    navigator.clipboard.writeText(link)
    toast({ title: 'Portal link copied', variant: 'success' })
  }

  async function handleDelete() {
    if (!confirm(`Delete PO ${order.po_number as string}? This cannot be undone.`)) return
    setDeleting(true)
    const res = await fetch(`/api/purchase-orders/${order.id as string}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'PO deleted', variant: 'success' })
      router.push('/dashboard/orders')
    } else {
      const d = await res.json()
      toast({ title: 'Error', description: d.error, variant: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/orders" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-300 text-sm">Purchase Orders</span>
        <span className="text-gray-600">/</span>
        <span className="text-white text-sm font-medium">{order.po_number as string}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{order.po_number as string}</h1>
            <POStatusBadge status={order.status as 'draft'} />
          </div>
          <p className="text-gray-400 mt-1">{order.customer_name as string} • {formatCurrency(order.po_value as number)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </Button>
          <Link href={`/portal/${order.secure_token as string}`} target="_blank">
            <Button size="sm" variant="outline">
              <ExternalLink className="w-3.5 h-3.5" />
              Portal
            </Button>
          </Link>
          {(profile as { role: string })?.role === 'admin' && (
            <Button size="sm" variant="destructive" onClick={handleDelete} loading={deleting}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
