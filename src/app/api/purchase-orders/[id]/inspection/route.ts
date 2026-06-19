import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

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
  const { inspection_date, inspector_name, result, notes } = body

  const { data, error } = await supabase
    .from('inspections')
    .insert({ po_id: id, inspection_date: inspection_date ?? null, inspector_name: inspector_name ?? null, result: result ?? null, notes: notes ?? null, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('purchase_orders').update({ status: 'in_inspection', updated_by: user.id }).eq('id', id)

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_INSPECTION',
    tableName: 'inspections',
    recordId: data.id,
    newData: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}
