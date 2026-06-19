import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('purchase_orders')
    .select('*, created_by_profile:profiles!purchase_orders_created_by_fkey(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (search) query = query.or(`po_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { po_number, customer_name, customer_mobile, customer_email, consignee_name, consignee_address, po_value, notes } = body

  if (!po_number || !customer_name || !customer_mobile || !customer_email || !consignee_name || !consignee_address || !po_value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      po_number,
      customer_name,
      customer_mobile,
      customer_email,
      consignee_name,
      consignee_address,
      po_value: parseFloat(po_value),
      notes,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'PO number already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_PO',
    tableName: 'purchase_orders',
    recordId: data.id,
    newData: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}
