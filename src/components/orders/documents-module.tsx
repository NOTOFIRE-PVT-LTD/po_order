'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'
import { formatDateTime } from '@/lib/utils'
import { DOCUMENT_TYPE_LABELS } from '@/types'
import { Download, FileText, Plus, Trash2 } from 'lucide-react'
import type { Document, DocumentType } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: (Document & { uploaded_by_profile?: { full_name: string } })[]
}

export default function DocumentsModule({ order, profile, initialData }: Props) {
  const [docs, setDocs] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [docType, setDocType] = useState<DocumentType>('other')
  const [file, setFile] = useState<File | null>(null)

  const isAdmin = (profile as { role: string })?.role === 'admin'
  const isStaffOrAdmin = ['admin', 'staff'].includes((profile as { role: string })?.role ?? '')

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'po-documents')
      fd.append('path', `${docType}/${order.id as string}/${docType}-${Date.now()}.${file.name.split('.').pop()}`)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const uploadData = await uploadRes.json()

      const docRes = await fetch(`/api/purchase-orders/${order.id as string}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: docType, file_name: file.name, file_path: uploadData.path, file_size: file.size, mime_type: file.type }),
      })
      const docData = await docRes.json()
      if (!docRes.ok) throw new Error(docData.error)

      setDocs(prev => [docData.data, ...prev])
      setShowForm(false)
      setFile(null)
      toast({ title: 'Document uploaded', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Upload failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(doc: Document) {
    setDownloading(doc.id)
    try {
      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'po-documents', path: doc.file_path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const a = document.createElement('a')
      a.href = data.url
      a.download = doc.file_name
      a.target = '_blank'
      a.click()
    } catch (err) {
      toast({ title: 'Download failed', description: err instanceof Error ? err.message : 'Error', variant: 'error' })
    } finally {
      setDownloading(null)
    }
  }

  // Group docs by type
  const grouped = docs.reduce((acc, doc) => {
    const key = doc.document_type
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {} as Record<string, typeof docs>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Documents ({docs.length})</h2>
        {isStaffOrAdmin && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Upload</Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Document Type *</Label>
                <Select value={docType} onValueChange={v => setDocType(v as DocumentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dropzone onFileSelect={setFile} label="Drop document here" currentFile={file} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" loading={loading} disabled={!file}>Upload</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {docs.length === 0 && !showForm && (
        <Card><CardContent className="py-12 text-center"><p className="text-gray-400">No documents uploaded yet</p></CardContent></Card>
      )}

      {Object.entries(grouped).map(([type, typeDocs]) => (
        <div key={type}>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {DOCUMENT_TYPE_LABELS[type as DocumentType] ?? type}
          </h3>
          <div className="space-y-2">
            {typeDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(doc.created_at)}
                      {(doc as { uploaded_by_profile?: { full_name: string } }).uploaded_by_profile && ` · ${(doc as { uploaded_by_profile?: { full_name: string } }).uploaded_by_profile?.full_name}`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(doc)}
                  loading={downloading === doc.id}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
