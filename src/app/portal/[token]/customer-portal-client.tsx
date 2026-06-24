'use client'

import { useState, useEffect, useRef } from 'react'
import { Dropzone } from '@/components/ui/dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import {
  PO_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  PRODUCTION_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/types'
import type { CustomerPortalData, Payment, Comment, Document, POStatus, ProductionStatus, DocumentType } from '@/types'
import {
  Flame,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Send,
  Upload,
  Truck,
  PackageCheck,
  FileText,
  CreditCard,
  MessageSquare,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'

const PORTAL_STEPS: { key: POStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pi_sent', label: 'PI Issued', icon: FileText },
  { key: 'payment_pending', label: 'Payment', icon: CreditCard },
  { key: 'in_production', label: 'Production', icon: Flame },
  { key: 'in_inspection', label: 'Inspection', icon: CheckCircle2 },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
]

const STATUS_ORDER: POStatus[] = ['draft', 'pi_sent', 'payment_pending', 'in_production', 'ready_for_inspection', 'in_inspection', 'dispatched', 'delivered']

function getStepIndex(status: POStatus) {
  return STATUS_ORDER.indexOf(status)
}

function Section({ title, icon: Icon, defaultOpen = true, children }: {
  title: string
  icon: React.ElementType
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-red-400" />
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function CustomerPortalClient({ token }: { token: string }) {
  const [data, setData] = useState<CustomerPortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Payment state
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [utrNumber, setUtrNumber] = useState('')
  const [paymentFile, setPaymentFile] = useState<File | null>(null)

  // Comment state
  const [comment, setComment] = useState('')
  const [authorName, setAuthorName] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('portal_author_name') ?? '' : '')
  const [sendingComment, setSendingComment] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const commentEndRef = useRef<HTMLDivElement>(null)

  // Document download
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { setData(d.data); setComments(d.data.comments ?? []) }
        setLoading(false)
      })
      .catch(() => { setError('Failed to load order data'); setLoading(false) })
  }, [token])

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPayment || !utrNumber.trim()) return
    setPaymentSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('payment_id', selectedPayment.id)
      fd.append('utr_number', utrNumber.trim())
      if (paymentFile) fd.append('screenshot', paymentFile)

      const res = await fetch(`/api/portal/${token}/payment`, { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)

      toast({ title: 'Payment submitted!', description: 'Our team will verify and confirm shortly.', variant: 'success' })
      setSelectedPayment(null)
      setUtrNumber('')
      setPaymentFile(null)

      // Refresh data
      const refresh = await fetch(`/api/portal/${token}`)
      const refreshData = await refresh.json()
      if (refreshData.data) { setData(refreshData.data); setComments(refreshData.data.comments ?? []) }
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Submission failed', variant: 'error' })
    } finally {
      setPaymentSubmitting(false)
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim() || !authorName.trim()) return
    setSendingComment(true)
    if (typeof window !== 'undefined') localStorage.setItem('portal_author_name', authorName)
    try {
      const res = await fetch(`/api/portal/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.trim(), author_name: authorName.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)

      // Refresh comments
      const refresh = await fetch(`/api/portal/${token}`)
      const refreshData = await refresh.json()
      if (refreshData.data) setComments(refreshData.data.comments ?? [])
      setComment('')
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setSendingComment(false)
    }
  }

  async function handleDocumentDownload(doc: Document) {
    setDownloading(doc.id)
    try {
      const res = await fetch(`/api/portal/${token}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      const a = document.createElement('a')
      a.href = d.url
      a.download = d.filename
      a.target = '_blank'
      a.click()
    } catch (err) {
      toast({ title: 'Download failed', variant: 'error' })
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <PortalLoading />
  if (error) return <PortalError error={error} />
  if (!data) return null

  const { po, pi, payments, production, inspection, dispatch, delivery, documents } = data
  const currentStepIdx = getStepIndex(po.status)
  const pendingPayment = payments?.find(p => p.status === 'pending')
  const totalApproved = payments?.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount_requested, 0) ?? 0
  const outstanding = po.po_value - totalApproved

  return (
    <div className="min-h-screen bg-[#0d0405]">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-950 to-[#0d0405] border-b border-red-950 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
              <Flame className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Notofire</p>
              <p className="text-xs text-gray-400">Customer Portal</p>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900">PO: {po.po_number}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{po.customer_name}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <StatusPill status={po.status} />
            <span className="text-sm text-gray-400">Value: <span className="text-gray-900 font-semibold">{formatCurrency(po.po_value)}</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress Tracker */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">ORDER PROGRESS</h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-800 z-0" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-red-500 z-0 transition-all duration-700"
              style={{ width: `${Math.max(0, Math.min(100, ((currentStepIdx - 1) / (PORTAL_STEPS.length - 1)) * 100))}%` }}
            />
            {PORTAL_STEPS.map((step, i) => {
              const stepStatus = STATUS_ORDER.indexOf(step.key)
              const done = currentStepIdx >= stepStatus
              const current = STATUS_ORDER.indexOf(po.status) === stepStatus
              return (
                <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-red-600 border-red-500 shadow-lg shadow-red-500/30' : 'bg-[#150a0a] border-red-900/50'} ${current ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-[#0d0405]' : ''}`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-gray-900" /> : <Circle className="w-4 h-4 text-gray-600" />}
                  </div>
                  <p className={`text-xs mt-2 text-center font-medium ${done ? 'text-red-300' : 'text-gray-600'}`}>{step.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Alert */}
        {pendingPayment && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-300">Payment Required</p>
                <p className="text-sm text-amber-200/70 mt-1">
                  {PAYMENT_TYPE_LABELS[pendingPayment.payment_type]} payment of{' '}
                  <strong>{formatCurrency(pendingPayment.amount_requested)}</strong> due by{' '}
                  {formatDate(pendingPayment.due_date)}
                </p>
                {pendingPayment.upi_link && (
                  <a
                    href={pendingPayment.upi_link}
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-green-400 bg-green-900/30 border border-green-700/50 px-3 py-1.5 rounded-lg hover:bg-green-900/50 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" /> Pay via UPI
                  </a>
                )}
                <button
                  onClick={() => setSelectedPayment(pendingPayment)}
                  className="mt-3 ml-3 text-sm font-medium text-red-400 hover:text-red-300 underline"
                >
                  Upload payment proof →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Upload Form */}
        {selectedPayment && (
          <Section title="Upload Payment Proof" icon={Upload}>
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>UTR / Transaction Number *</Label>
                <Input
                  value={utrNumber}
                  onChange={e => setUtrNumber(e.target.value)}
                  placeholder="Enter UTR or transaction reference"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Screenshot (optional)</Label>
                <Dropzone
                  onFileSelect={setPaymentFile}
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }}
                  maxSize={5 * 1024 * 1024}
                  label="Upload screenshot"
                  currentFile={paymentFile}
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setSelectedPayment(null)}>Cancel</Button>
                <Button type="submit" loading={paymentSubmitting} disabled={!utrNumber.trim()}>Submit Payment Proof</Button>
              </div>
            </form>
          </Section>
        )}

        {/* PI Section */}
        {pi && pi.length > 0 && (
          <Section title="Proforma Invoice" icon={FileText}>
            {pi.map(invoice => (
              <div key={invoice.id} className="bg-gray-800/50 rounded-lg p-4 mt-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.pi_number}</p>
                    <p className="text-sm text-gray-400">{formatDate(invoice.pi_date)}</p>
                  </div>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(invoice.pi_amount)}</p>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <Section title="Payment History" icon={CreditCard}>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm p-3 rounded-lg bg-gray-800/50">
                <div>
                  <p className="text-gray-500">Total PO Value</p>
                  <p className="font-bold text-gray-900">{formatCurrency(po.po_value)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount Paid</p>
                  <p className="font-bold text-green-400">{formatCurrency(totalApproved)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500">Outstanding Balance</p>
                  <p className={`font-bold ${outstanding > 0 ? 'text-amber-400' : 'text-green-400'}`}>{formatCurrency(outstanding)}</p>
                </div>
              </div>
              {payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-800">
                  <div>
                    <p className="font-medium text-gray-900">{formatCurrency(payment.amount_requested)}</p>
                    <p className="text-xs text-gray-500 capitalize">{payment.payment_type} · Due {formatDate(payment.due_date)}</p>
                    {payment.utr_number && <p className="text-xs font-mono text-red-400">UTR: {payment.utr_number}</p>}
                  </div>
                  <PaymentStatusChip status={payment.status} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Production Timeline */}
        {production && production.length > 0 && (
          <Section title="Production Updates" icon={Flame}>
            <div className="space-y-3 mt-2">
              {production.map((update, i) => (
                <div key={update.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-red-900/50 border border-red-700 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    {i < production.length - 1 && <div className="w-0.5 bg-gray-700 flex-1 mt-1 mb-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="font-medium text-gray-900 text-sm">{PRODUCTION_STATUS_LABELS[update.status as ProductionStatus] ?? update.status}</p>
                    {update.notes && <p className="text-xs text-gray-400">{update.notes}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(update.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Inspection */}
        {inspection && (
          <Section title="Inspection" icon={CheckCircle2} defaultOpen={false}>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date:</span> <span className="text-gray-200">{formatDate(inspection.inspection_date)}</span></div>
              <div><span className="text-gray-500">Inspector:</span> <span className="text-gray-200">{inspection.inspector_name ?? '—'}</span></div>
              <div><span className="text-gray-500">Result:</span> <span className={`font-medium ${inspection.result === 'passed' ? 'text-green-400' : inspection.result === 'failed' ? 'text-red-400' : 'text-gray-200'}`}>{inspection.result ?? '—'}</span></div>
            </div>
          </Section>
        )}

        {/* Dispatch */}
        {dispatch && (
          <Section title="Dispatch Information" icon={Truck} defaultOpen={false}>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Transporter:</span> <span className="text-gray-200">{dispatch.transporter}</span></div>
              <div><span className="text-gray-500">Vehicle:</span> <span className="text-gray-200 font-mono">{dispatch.vehicle_number}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="text-gray-200">{formatDate(dispatch.dispatch_date)}</span></div>
            </div>
          </Section>
        )}

        {/* Delivery */}
        {delivery && (
          <Section title="Delivery" icon={PackageCheck}>
            <div className="mt-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-800/50">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="font-medium text-green-300">Order Delivered</p>
                  {delivery.delivery_date && <p className="text-sm text-gray-400">on {formatDate(delivery.delivery_date)}</p>}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Documents */}
        {documents && documents.length > 0 && (
          <Section title={`Documents (${documents.length})`} icon={FolderOpen} defaultOpen={false}>
            <div className="space-y-2 mt-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-200 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] ?? doc.document_type}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDocumentDownload(doc)}
                    loading={downloading === doc.id}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Discussion */}
        <Section title="Discussion" icon={MessageSquare}>
          <div className="mt-3 space-y-4">
            {/* Messages */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {comments.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">No messages yet</p>
              )}
              {comments.map(c => {
                const isCustomer = c.author_role === 'customer'
                return (
                  <div key={c.id} className={`flex gap-2.5 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1 ${isCustomer ? 'bg-green-700' : 'bg-red-700'}`}>
                      {getInitials(c.author_name)}
                    </div>
                    <div className={`flex-1 max-w-[75%] ${isCustomer ? 'items-end' : ''} flex flex-col gap-1`}>
                      <span className={`text-xs text-gray-500 ${isCustomer ? 'text-right' : ''}`}>{c.author_name}</span>
                      <div className={`rounded-2xl px-3.5 py-2 text-sm ${isCustomer ? 'bg-red-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                        {c.content}
                      </div>
                      <span className={`text-xs text-gray-600 ${isCustomer ? 'text-right' : ''}`}>{formatDateTime(c.created_at)}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={commentEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Your Name *</Label>
                <Input
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div className="flex gap-2">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="flex-1 rounded-lg border border-red-900/50 bg-[#150a0a] px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
                <Button type="submit" loading={sendingComment} disabled={!comment.trim() || !authorName.trim()} size="icon" className="h-full min-h-[72px] px-3">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
              <Flame className="w-3 h-3 text-gray-900" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Notofire</span>
          </div>
          <p className="text-xs text-gray-600">This portal is unique to your order. Do not share this link.</p>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: POStatus }) {
  const labels = PO_STATUS_LABELS
  const colors: Partial<Record<POStatus, string>> = {
    draft: 'bg-gray-700 text-gray-200',
    pi_sent: 'bg-red-900/60 text-red-300 border border-red-700',
    payment_pending: 'bg-amber-900/60 text-amber-300 border border-amber-700',
    in_production: 'bg-purple-900/60 text-purple-300 border border-purple-700',
    ready_for_inspection: 'bg-cyan-900/60 text-cyan-300 border border-cyan-700',
    in_inspection: 'bg-cyan-900/60 text-cyan-300 border border-cyan-700',
    dispatched: 'bg-orange-900/60 text-orange-300 border border-orange-700',
    delivered: 'bg-green-900/60 text-green-300 border border-green-700',
    cancelled: 'bg-red-900/60 text-red-300 border border-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-700 text-gray-200'}`}>
      {labels[status]}
    </span>
  )
}

function PaymentStatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pending', class: 'text-amber-400 bg-amber-900/30' },
    uploaded: { label: 'Verifying', class: 'text-red-400 bg-red-900/30' },
    approved: { label: 'Approved', class: 'text-green-400 bg-green-900/30' },
    rejected: { label: 'Rejected', class: 'text-red-400 bg-red-900/30' },
  }
  const s = map[status] ?? { label: status, class: 'text-gray-400 bg-gray-800' }
  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.class}`}>{s.label}</span>
}

function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Flame className="w-6 h-6 text-gray-900" />
        </div>
        <p className="text-gray-400">Loading your order...</p>
      </div>
    </div>
  )
}

function PortalError({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-900/30 border border-red-800 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
        <p className="text-gray-400 text-sm">{error}</p>
        <p className="text-gray-600 text-xs mt-4">If you believe this is an error, please contact your supplier.</p>
      </div>
    </div>
  )
}
