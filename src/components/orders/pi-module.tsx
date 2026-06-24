'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Bell } from 'lucide-react'
import type { ProformaInvoice } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: ProformaInvoice[] | null
}

export default function PIModule({ order, profile, initialData }: Props) {
  const [pis, setPIs] = useState<ProformaInvoice[]>(initialData ?? [])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [piFile, setPiFile] = useState<File | null>(null)
  const [form, setForm] = useState({ pi_number: '', pi_date: '', pi_amount: '', send_notifications: true })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let piPdfPath: string | undefined
      if (piFile) {
        const fd = new FormData()
        fd.append('file', piFile)
        fd.append('bucket', 'po-documents')
        fd.append('path', `pi/${order.id as string}/${form.pi_number}-${Date.now()}.pdf`)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('Upload failed')
        const uploadData = await uploadRes.json()
        piPdfPath = uploadData.path

        // Also save to documents
        await fetch(`/api/purchase-orders/${order.id as string}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_type: 'pi', file_name: piFile.name, file_path: piPdfPath, file_size: piFile.size, mime_type: piFile.type }),
        })
      }

      const res = await fetch(`/api/purchase-orders/${order.id as string}/pi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pi_pdf_path: piPdfPath }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setPIs(prev => [...prev, data.data])
      setShowForm(false)
      setPiFile(null)
      setForm({ pi_number: '', pi_date: '', pi_amount: '', send_notifications: true })

      const notifStatus = `Email: ${data.notifications?.email ? '✓' : '✗'}, WhatsApp: ${data.notifications?.whatsapp ? '✓' : '✗'}`
      toast({ title: 'PI Created', description: form.send_notifications ? `Notifications: ${notifStatus}` : 'PI saved without notifications', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Proforma Invoices</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add PI
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Proforma Invoice</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>PI Number *</Label>
                  <Input value={form.pi_number} onChange={e => setForm(f => ({ ...f, pi_number: e.target.value }))} placeholder="PI-2024-001" required />
                </div>
                <div className="space-y-1.5">
                  <Label>PI Date *</Label>
                  <Input type="date" value={form.pi_date} onChange={e => setForm(f => ({ ...f, pi_date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>PI Amount (₹) *</Label>
                  <Input type="number" step="0.01" value={form.pi_amount} onChange={e => setForm(f => ({ ...f, pi_amount: e.target.value }))} placeholder="500000" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>PI Document (PDF)</Label>
                <Dropzone onFileSelect={setPiFile} accept={{ 'application/pdf': ['.pdf'] }} label="Upload PI PDF" currentFile={piFile} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.send_notifications} onChange={e => setForm(f => ({ ...f, send_notifications: e.target.checked }))} className="w-4 h-4 rounded border-gray-600 text-blue-600" />
                <span className="text-sm text-gray-600 flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" />Send WhatsApp & Email notifications to customer</span>
              </label>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading}>Save PI</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {pis.length === 0 && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-400">No Proforma Invoices yet</p></CardContent></Card>
      )}

      {pis.map(pi => (
        <Card key={pi.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{pi.pi_number}</p>
                <p className="text-sm text-gray-400">{formatDate(pi.pi_date)}</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(pi.pi_amount)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {pi.notified_email && <span className="text-green-400">✉ Email sent</span>}
                {pi.notified_whatsapp && <span className="text-green-400">📱 WA sent</span>}
                {pi.pi_pdf_path && <FileText className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
