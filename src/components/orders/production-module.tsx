'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { PRODUCTION_STATUS_LABELS } from '@/types'
import { Plus, CheckCircle2, Circle } from 'lucide-react'
import type { ProductionUpdate } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: ProductionUpdate[] | null
}

const STATUSES = ['production_started', 'material_ready', 'production_complete', 'ready_for_inspection'] as const

export default function ProductionModule({ order, profile, initialData }: Props) {
  const [updates, setUpdates] = useState<ProductionUpdate[]>(initialData ?? [])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ status: 'production_started', notes: '', notify_customer: true })

  const isStaffOrAdmin = ['admin', 'staff'].includes((profile as { role: string })?.role ?? '')

  const latestStatuses = new Set(updates.map(u => u.status))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${order.id as string}/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUpdates(prev => [...prev, data.data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
      setShowForm(false)
      toast({ title: 'Production update posted', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Production Timeline</h2>
        {isStaffOrAdmin && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add Update
          </Button>
        )}
      </div>

      {/* Status tracker */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map(status => {
          const done = latestStatuses.has(status)
          return (
            <div key={status} className={`p-3 rounded-lg border text-center transition-colors ${done ? 'border-green-700 bg-green-900/20' : 'border-gray-200 bg-white/30'}`}>
              {done ? <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" /> : <Circle className="w-5 h-5 text-gray-600 mx-auto mb-1" />}
              <p className="text-xs text-gray-600 font-medium">{PRODUCTION_STATUS_LABELS[status]}</p>
            </div>
          )
        })}
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{PRODUCTION_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes for the customer..."
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notify_customer} onChange={e => setForm(f => ({ ...f, notify_customer: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-600">Notify customer</span>
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading}>Post Update</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {updates.length === 0 && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-500">No production updates yet</p></CardContent></Card>
      )}

      <div className="space-y-3">
        {updates.map((update, i) => (
          <div key={update.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              {i < updates.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-2" />}
            </div>
            <div className="pb-4 flex-1">
              <p className="font-medium text-gray-900">{PRODUCTION_STATUS_LABELS[update.status as keyof typeof PRODUCTION_STATUS_LABELS] ?? update.status}</p>
              {update.notes && <p className="text-sm text-gray-500 mt-0.5">{update.notes}</p>}
              <p className="text-xs text-gray-600 mt-1">{formatDateTime(update.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
