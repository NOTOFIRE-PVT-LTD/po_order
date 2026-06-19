import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Customer downloads a document via signed URL
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { document_id } = await req.json()

  if (!document_id) return NextResponse.json({ error: 'Document ID required' }, { status: 400 })

  const supabase = await createServiceClient()

  // Verify token
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('secure_token', token)
    .single()

  if (!po) return NextResponse.json({ error: 'Invalid token' }, { status: 403 })

  // Get document belonging to this PO
  const { data: doc } = await supabase
    .from('documents')
    .select('file_path, file_name')
    .eq('id', document_id)
    .eq('po_id', po.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('po-documents')
    .createSignedUrl(doc.file_path, 300) // 5 min URL

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl, filename: doc.file_name })
}
