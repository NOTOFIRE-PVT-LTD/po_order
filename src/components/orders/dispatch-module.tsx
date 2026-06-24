'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { Truck, Plus } from 'lucide-react'
import type { Dispatch } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: Dispatch | null
}

export default function DispatchModule({ order, profile, initialData }: Props) {
  const [dispatch, setDispatch] = useState<Dispatch | null>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ vehicle_number: '', transporter: '', dispatch_date: '', notes: '' })
  const [docs, setDocs] = useState<{ type: string; label: string; file: File | null }[]>([
    { type: 'invoice', label: 'Invoice', file: null },
    { type: 'lr_copy', label: 'LR Copy', file: null },
    { type: 'eway_bill', label: 'E-Way Bill', file: null },
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
          fd.append('path', `dispatch/${order.id as string}/${doc.type}-${Date.now()}.${doc.file.name.split('.').pop()}`)
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

      const res = await fetch(`/api/purchase-orders/${order.id as string}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDispatch(data.data)
      setShowForm(false)
      toast({ title: 'Dispatch saved & customer notified', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Dispatch</h2>
        {isStaffOrAdmin && !showForm && !dispatch && (
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Dispatch</Button>
        )}
      </div>

      {dispatch && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-gray-900">Dispatch Details</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-gray-500">Vehicle:</span> <span className="text-gray-700 font-mono">{dispatch.vehicle_number}</span></div>
              <div><span className="text-gray-500">Transporter:</span> <span className="text-gray-700">{dispatch.transporter}</span></div>
              <div><span className="text-gray-500">Date:</span> <span className="text-gray-700">{formatDate(dispatch.dispatch_date)}</span></div>
            </div>
            {dispatch.notes && <p className="text-sm text-gray-400 mt-3">{dispatch.notes}</p>}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Dispatch Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Vehicle Number *</Label>
                  <Input value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="MH12AB1234" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Transporter *</Label>
                  <Input value={form.transporter} onChange={e => setForm(f => ({ ...f, transporter: e.target.value }))} placeholder="Transporter name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Dispatch Date *</Label>
                  <Input type="date" value={form.dispatch_date} onChange={e => setForm(f => ({ ...f, dispatch_date: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional info..." />
              </div>
              <div>
                <Label className="mb-3 block">Dispatch Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {docs.map((doc, i) => (
                    <div key={doc.type} className="space-y-1.5">
                      <p className="text-xs text-gray-400">{doc.label}</p>
                      <Dropzone
                        onFileSelect={file => {
                          const next = [...docs]; next[i] = { ...next[i], file }; setDocs(next)
                        }}
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
                <Button type="submit" loading={loading}>Save Dispatch</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!dispatch && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-400">No dispatch information yet</p></CardContent></Card>
      )}
    </div>
  )
}
