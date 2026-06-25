import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { sendDispatchWhatsApp } from '@/lib/notifications/whatsapp'
import { getPortalLink } from '@/lib/utils'
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

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single()
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

  const body = await req.json()
  const { vehicle_number, transporter, dispatch_date, notes } = body

  if (!vehicle_number || !transporter || !dispatch_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('dispatches')
    .insert({ po_id: id, vehicle_number, transporter, dispatch_date, notes: notes ?? null, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('purchase_orders').update({ status: 'dispatched', updated_by: user.id }).eq('id', id)

  const portalLink = getPortalLink(po.secure_token)

  try {
    await sendDispatchWhatsApp({
      mobile: po.customer_mobile,
      customerName: po.customer_name,
      poNumber: po.po_number,
      vehicleNumber: vehicle_number,
      transporter,
      dispatchDate: dispatch_date,
      portalLink,
    })
  } catch (err) { console.error('WhatsApp failed:', err) }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_DISPATCH',
    tableName: 'dispatches',
    recordId: data.id,
    newData: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}
