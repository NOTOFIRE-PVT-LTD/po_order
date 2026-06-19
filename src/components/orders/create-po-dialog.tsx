'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/ui/dropzone'
import { toast } from '@/components/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreatePODialog({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [poFile, setPoFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    po_number: '',
    customer_name: '',
    customer_mobile: '',
    customer_email: '',
    consignee_name: '',
    consignee_address: '',
    po_value: '',
    notes: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let poPdfPath: string | undefined

      // Upload PO PDF if provided
      if (poFile) {
        const fd = new FormData()
        fd.append('file', poFile)
        fd.append('bucket', 'po-documents')
        fd.append('path', `po/${form.po_number}/po-${Date.now()}.${poFile.name.split('.').pop()}`)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!uploadRes.ok) throw new Error('File upload failed')
        const uploadData = await uploadRes.json()
        poPdfPath = uploadData.path
      }

      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, po_value: parseFloat(form.po_value), po_pdf_path: poPdfPath }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({ title: 'PO Created', description: `${form.po_number} created successfully`, variant: 'success' })
      onCreated()
      onClose()
      setForm({ po_number: '', customer_name: '', customer_mobile: '', customer_email: '', consignee_name: '', consignee_address: '', po_value: '', notes: '' })
      setPoFile(null)
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to create PO', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>PO Number *</Label>
              <Input name="po_number" value={form.po_number} onChange={handleChange} placeholder="PO-2024-001" required />
            </div>
            <div className="space-y-1.5">
              <Label>PO Value (₹) *</Label>
              <Input name="po_value" type="number" step="0.01" value={form.po_value} onChange={handleChange} placeholder="1000000" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer Name *</Label>
              <Input name="customer_name" value={form.customer_name} onChange={handleChange} placeholder="ABC Corporation" required />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number *</Label>
              <Input name="customer_mobile" type="tel" value={form.customer_mobile} onChange={handleChange} placeholder="+91 98765 43210" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email Address *</Label>
            <Input name="customer_email" type="email" value={form.customer_email} onChange={handleChange} placeholder="customer@company.com" required />
          </div>

          <div className="space-y-1.5">
            <Label>Consignee Name *</Label>
            <Input name="consignee_name" value={form.consignee_name} onChange={handleChange} placeholder="Consignee / Site Name" required />
          </div>

          <div className="space-y-1.5">
            <Label>Consignee Address *</Label>
            <textarea
              name="consignee_address"
              value={form.consignee_address}
              onChange={handleChange}
              placeholder="Full delivery address..."
              required
              rows={2}
              className="flex w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional notes..."
              rows={2}
              className="flex w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>PO Document (PDF)</Label>
            <Dropzone
              onFileSelect={setPoFile}
              accept={{ 'application/pdf': ['.pdf'] }}
              label="Upload PO PDF"
              currentFile={poFile}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Create PO</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
