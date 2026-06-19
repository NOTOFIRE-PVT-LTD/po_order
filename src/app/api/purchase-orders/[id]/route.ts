import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      proforma_invoices(*),
      payments(*),
      production_updates(*, created_by_profile:profiles!production_updates_created_by_fkey(full_name)),
      inspections(*),
      dispatches(*),
      deliveries(*),
      documents(*, uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name)),
      comments(*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const { data: existing } = await supabase.from('purchase_orders').select('*').eq('id', id).single()

  const { data, error } = await supabase
    .from('purchase_orders')
    .update({ ...body, updated_by: user.id })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'UPDATE_PO',
    tableName: 'purchase_orders',
    recordId: id,
    oldData: existing ?? undefined,
    newData: data,
  })

  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 })

  const { data: existing } = await supabase.from('purchase_orders').select('*').eq('id', id).single()

  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'DELETE_PO',
    tableName: 'purchase_orders',
    recordId: id,
    oldData: existing ?? undefined,
  })

  return NextResponse.json({ success: true })
}
