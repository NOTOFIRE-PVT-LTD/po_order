'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { FlaskConical, Plus } from 'lucide-react'
import type { Inspection } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: Inspection | null
}

export default function InspectionModule({ order, profile, initialData }: Props) {
  const [inspection, setInspection] = useState<Inspection | null>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<{ type: string; file: File | null }[]>([
    { type: 'rdso_ic', file: null },
    { type: 'inspection_certificate', file: null },
    { type: 'test_report', file: null },
    { type: 'approval_document', file: null },
  ])
  const [form, setForm] = useState({ inspection_date: '', inspector_name: '', result: '', notes: '' })

  const isStaffOrAdmin = ['admin', 'staff'].includes((profile as { role: string })?.role ?? '')

  async function uploadDoc(file: File, docType: string) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bucket', 'po-documents')
    fd.append('path', `inspection/${order.id as string}/${docType}-${Date.now()}.${file.name.split('.').pop()}`)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()

    await fetch(`/api/purchase-orders/${order.id as string}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type: docType, file_name: file.name, file_path: data.path, file_size: file.size, mime_type: file.type }),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      for (const { type, file } of uploadFiles) {
        if (file) await uploadDoc(file, type)
      }

      const res = await fetch(`/api/purchase-orders/${order.id as string}/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInspection(data.data)
      setShowForm(false)
      toast({ title: 'Inspection saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const docLabels: Record<string, string> = {
    rdso_ic: 'RDSO IC Copy',
    inspection_certificate: 'Inspection Certificate',
    test_report: 'Test Report',
    approval_document: 'Approval Document',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Inspection</h2>
        {isStaffOrAdmin && !showForm && !inspection && (
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Inspection</Button>
        )}
      </div>

      {inspection && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-gray-900">Inspection Details</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date:</span> <span className="text-gray-700">{formatDate(inspection.inspection_date)}</span></div>
              <div><span className="text-gray-500">Inspector:</span> <span className="text-gray-700">{inspection.inspector_name ?? '—'}</span></div>
              <div><span className="text-gray-500">Result:</span> <span className={`font-medium ${inspection.result === 'passed' ? 'text-green-400' : inspection.result === 'failed' ? 'text-red-600' : 'text-gray-700'}`}>{inspection.result ?? '—'}</span></div>
            </div>
            {inspection.notes && <p className="text-sm text-gray-400 mt-3">{inspection.notes}</p>}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Inspection Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Inspection Date</Label>
                  <Input type="date" value={form.inspection_date} onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Inspector Name</Label>
                  <Input value={form.inspector_name} onChange={e => setForm(f => ({ ...f, inspector_name: e.target.value }))} placeholder="Inspector name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Result</Label>
                  <Input value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} placeholder="passed / failed / conditional" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <Label className="mb-3 block">Documents</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {uploadFiles.map((u, i) => (
                    <div key={u.type} className="space-y-1.5">
                      <p className="text-xs text-gray-400">{docLabels[u.type]}</p>
                      <Dropzone
                        onFileSelect={file => {
                          const next = [...uploadFiles]
                          next[i] = { ...next[i], file }
                          setUploadFiles(next)
                        }}
                        accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
                        label={`Upload ${docLabels[u.type]}`}
                        currentFile={u.file}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading}>Save Inspection</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!inspection && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-400">No inspection data yet</p></CardContent></Card>
      )}
    </div>
  )
}
