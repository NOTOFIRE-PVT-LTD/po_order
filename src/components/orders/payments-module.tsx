'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaymentStatusBadge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import type { Payment } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: Payment[] | null
}

export default function PaymentsModule({ order, profile, initialData }: Props) {
  const [payments, setPayments] = useState<Payment[]>(initialData ?? [])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState<string | null>(null)
  const [form, setForm] = useState({
    amount_requested: '',
    payment_type: 'advance',
    due_date: '',
    upi_link: '',
    outstanding_balance: '',
    notes: '',
    send_notifications: true,
  })

  const isAdmin = (profile as { role: string })?.role === 'admin'
  const isStaffOrAdmin = ['admin', 'staff'].includes((profile as { role: string })?.role ?? '')

  const totalApproved = payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount_requested, 0)
  const outstanding = (order.po_value as number) - totalApproved

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${order.id as string}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, outstanding_balance: outstanding.toFixed(2) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayments(prev => [data.data, ...prev])
      setShowForm(false)
      setForm({ amount_requested: '', payment_type: 'advance', due_date: '', upi_link: '', outstanding_balance: '', notes: '', send_notifications: true })
      toast({ title: 'Payment request created', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(paymentId: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? prompt('Rejection reason:') : undefined
    if (action === 'reject' && !reason) return
    setApproving(paymentId)
    try {
      const approvedSoFar = payments.filter(p => p.status === 'approved' && p.id !== paymentId).reduce((s, p) => s + p.amount_requested, 0)
      const currentPayment = payments.find(p => p.id === paymentId)
      const newBalance = action === 'approve' && currentPayment ? (order.po_value as number) - approvedSoFar - currentPayment.amount_requested : undefined

      const res = await fetch(`/api/purchase-orders/${order.id as string}/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason, outstanding_balance: newBalance }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayments(prev => prev.map(p => p.id === paymentId ? data.data : p))
      toast({ title: action === 'approve' ? 'Payment approved' : 'Payment rejected', variant: action === 'approve' ? 'success' : 'warning' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
          <div className="flex gap-4 mt-1 text-sm">
            <span className="text-gray-500">PO Value: <span className="text-gray-900 font-medium">{formatCurrency(order.po_value as number)}</span></span>
            <span className="text-gray-500">Collected: <span className="text-green-600 font-medium">{formatCurrency(totalApproved)}</span></span>
            <span className="text-gray-500">Outstanding: <span className="text-amber-600 font-medium">{formatCurrency(outstanding)}</span></span>
          </div>
        </div>
        {isStaffOrAdmin && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Request Payment
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Payment Request</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" step="0.01" value={form.amount_requested} onChange={e => setForm(f => ({ ...f, amount_requested: e.target.value }))} placeholder="500000" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Type *</Label>
                  <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date *</Label>
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>UPI Payment Link</Label>
                  <Input value={form.upi_link} onChange={e => setForm(f => ({ ...f, upi_link: e.target.value }))} placeholder="upi://pay?..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment instructions..." />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.send_notifications} onChange={e => setForm(f => ({ ...f, send_notifications: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-600">Send notifications to customer</span>
              </label>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading}>Create Request</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {payments.length === 0 && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-500">No payment requests yet</p></CardContent></Card>
      )}

      {payments.map(payment => (
        <Card key={payment.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(payment.amount_requested)}</span>
                  <PaymentStatusBadge status={payment.status} />
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize">{payment.payment_type}</span>
                </div>
                <p className="text-sm text-gray-500">Due: {formatDate(payment.due_date)}</p>
                {payment.utr_number && <p className="text-sm text-gray-600">UTR: <span className="font-mono text-blue-600">{payment.utr_number}</span></p>}
                {payment.outstanding_balance !== null && payment.outstanding_balance !== undefined && (
                  <p className="text-sm text-gray-500">Outstanding after: {formatCurrency(payment.outstanding_balance)}</p>
                )}
                {payment.rejection_reason && (
                  <p className="text-sm text-red-600">Rejected: {payment.rejection_reason}</p>
                )}
              </div>

              {payment.status === 'uploaded' && isStaffOrAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => handleApprove(payment.id, 'approve')} loading={approving === payment.id}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleApprove(payment.id, 'reject')} loading={approving === payment.id}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
              {payment.status === 'pending' && (
                <span className="flex items-center gap-1 text-xs text-amber-600"><Clock className="w-3.5 h-3.5" />Awaiting customer payment</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
