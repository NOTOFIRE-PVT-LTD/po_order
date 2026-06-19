import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { sendProductionUpdateWhatsApp } from '@/lib/notifications/whatsapp'
import { sendStatusUpdateEmail } from '@/lib/notifications/email'
import { getPortalLink } from '@/lib/utils'
import { PRODUCTION_STATUS_LABELS } from '@/types'
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
  const { status, notes, notify_customer = true } = body

  const { data, error } = await supabase
    .from('production_updates')
    .insert({ po_id: id, status, notes: notes ?? null, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Map production status to PO status
  const poStatusMap: Record<string, string> = {
    production_started: 'in_production',
    material_ready: 'in_production',
    production_complete: 'in_production',
    ready_for_inspection: 'ready_for_inspection',
  }
  if (poStatusMap[status]) {
    await supabase.from('purchase_orders').update({ status: poStatusMap[status], updated_by: user.id }).eq('id', id)
  }

  if (notify_customer) {
    const portalLink = getPortalLink(po.secure_token)
    const statusLabel = PRODUCTION_STATUS_LABELS[status as keyof typeof PRODUCTION_STATUS_LABELS] ?? status

    try {
      await sendProductionUpdateWhatsApp({
        mobile: po.customer_mobile,
        customerName: po.customer_name,
        poNumber: po.po_number,
        status: statusLabel,
        portalLink,
      })
    } catch (err) { console.error('WhatsApp failed:', err) }

    try {
      await sendStatusUpdateEmail({
        customerName: po.customer_name,
        customerEmail: po.customer_email,
        poNumber: po.po_number,
        status: statusLabel,
        message: `Your order production status has been updated to: ${statusLabel}${notes ? `\n\nNote: ${notes}` : ''}`,
        portalLink,
      })
    } catch (err) { console.error('Email failed:', err) }
  }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'PRODUCTION_UPDATE',
    tableName: 'production_updates',
    recordId: data.id,
    newData: data,
  })

  return NextResponse.json({ data }, { status: 201 })
}
