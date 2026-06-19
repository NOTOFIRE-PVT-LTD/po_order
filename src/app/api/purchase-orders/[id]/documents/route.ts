import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('documents')
    .select('*, uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name)')
    .eq('po_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { document_type, file_name, file_path, file_size, mime_type, reference_id } = body

  if (!document_type || !file_name || !file_path) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      po_id: id,
      document_type,
      file_name,
      file_path,
      file_size: file_size ?? null,
      mime_type: mime_type ?? null,
      reference_id: reference_id ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'UPLOAD_DOCUMENT',
    tableName: 'documents',
    recordId: data.id,
    newData: { document_type, file_name, po_id: id },
  })

  return NextResponse.json({ data }, { status: 201 })
}
