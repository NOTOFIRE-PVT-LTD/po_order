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
  const { delivery_date, received_by, notes } = body

  const { data, error } = await supabase
    .from('deliveries')
    .insert({ po_id: id, delivery_date: delivery_date ?? null, received_by: received_by ?? null, notes: notes ?? null, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('purchase_orders').update({ status: 'delivered', updated_by: user.id }).eq('id', id)

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_DELIVERY',
    tableName: 'deliveries',
    recordId: data.id,
    newData: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}
