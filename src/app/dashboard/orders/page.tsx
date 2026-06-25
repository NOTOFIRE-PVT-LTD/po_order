'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { POStatusBadge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PurchaseOrder } from '@/types'
import { Plus, Search, RefreshCw, ExternalLink, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import CreatePODialog from '@/components/orders/create-po-dialog'

export default function OrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const limit = 20

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/purchase-orders?${params}`)
    const json = await res.json()
    setOrders(json.data ?? [])
    setTotal(json.count ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 300)
    return () => clearTimeout(timer)
  }, [fetchOrders])

  function copyPortalLink(token: string) {
    const link = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(link)
    toast({ title: 'Link copied', description: 'Customer portal link copied to clipboard', variant: 'success' })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 text-sm mt-1">{total} orders total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New PO
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by PO number, customer..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No orders found</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4" variant="outline">
                Create your first PO
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Customer</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Value</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Created</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-100/50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/orders/${order.id}`} className="font-semibold text-blue-600 hover:text-blue-300">
                          {order.po_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div>
                          <p className="text-gray-700 font-medium">{order.customer_name}</p>
                          <p className="text-gray-500 text-xs">{order.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell text-gray-600 font-medium">
                        {formatCurrency(order.po_value)}
                      </td>
                      <td className="px-6 py-4">
                        <POStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 hidden xl:table-cell text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyPortalLink(order.secure_token)}
                            title="Copy portal link"
                            className="p-1.5 text-gray-500 hover:text-gray-600 transition-colors rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/portal/${order.secure_token}`}
                            target="_blank"
                            title="Open customer portal"
                            className="p-1.5 text-gray-500 hover:text-gray-600 transition-colors rounded"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button size="sm" variant="ghost">View</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CreatePODialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchOrders} />
    </div>
  )
}
