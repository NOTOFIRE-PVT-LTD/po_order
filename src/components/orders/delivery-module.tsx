'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { PackageCheck, Plus } from 'lucide-react'
import type { Delivery } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: Delivery | null
}

export default function DeliveryModule({ order, profile, initialData }: Props) {
  const [delivery, setDelivery] = useState<Delivery | null>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ delivery_date: '', received_by: '', notes: '' })
  const [docs, setDocs] = useState<{ type: string; label: string; file: File | null }[]>([
    { type: 'pod', label: 'POD (Proof of Delivery)', file: null },
    { type: 'material_receipt', label: 'Material Receiving Copy', file: null },
    { type: 'freight_slip', label: 'Final Freight Slip', file: null },
  ])

  const isStaffOrAdmin = ['admin', 'staff'].includes((profile as { role: string })?.role ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      for (const doc of docs) {
        if (doc.file) {
          const fd = new FormData()
          fd.append('file', doc.file)
          fd.append('bucket', 'po-documents')
          fd.append('path', `delivery/${order.id as string}/${doc.type}-${Date.now()}.${doc.file.name.split('.').pop()}`)
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
          if (!uploadRes.ok) throw new Error('Upload failed')
          const uploadData = await uploadRes.json()
          await fetch(`/api/purchase-orders/${order.id as string}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document_type: doc.type, file_name: doc.file.name, file_path: uploadData.path, file_size: doc.file.size, mime_type: doc.file.type }),
          })
        }
      }

      const res = await fetch(`/api/purchase-orders/${order.id as string}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDelivery(data.data)
      setShowForm(false)
      toast({ title: 'Delivery confirmed', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Delivery</h2>
        {isStaffOrAdmin && !showForm && !delivery && (
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Confirm Delivery</Button>
        )}
      </div>

      {delivery && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-gray-900">Delivery Confirmed</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Delivery Date:</span> <span className="text-gray-700">{formatDate(delivery.delivery_date)}</span></div>
              <div><span className="text-gray-500">Received By:</span> <span className="text-gray-700">{delivery.received_by ?? '—'}</span></div>
            </div>
            {delivery.notes && <p className="text-sm text-gray-400 mt-3">{delivery.notes}</p>}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Delivery Confirmation</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Delivery Date</Label>
                  <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Received By</Label>
                  <Input value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} placeholder="Name of recipient" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any delivery notes..." />
              </div>
              <div>
                <Label className="mb-3 block">Delivery Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {docs.map((doc, i) => (
                    <div key={doc.type} className="space-y-1.5">
                      <p className="text-xs text-gray-400">{doc.label}</p>
                      <Dropzone
                        onFileSelect={file => { const next = [...docs]; next[i] = { ...next[i], file }; setDocs(next) }}
                        accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
                        label={`Upload ${doc.label}`}
                        currentFile={doc.file}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading}>Confirm Delivery</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!delivery && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-400">No delivery information yet</p></CardContent></Card>
      )}
    </div>
  )
}
