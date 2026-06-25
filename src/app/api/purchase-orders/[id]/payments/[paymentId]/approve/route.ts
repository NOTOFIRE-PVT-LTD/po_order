import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { sendPaymentApprovedWhatsApp } from '@/lib/notifications/whatsapp'
import { getPortalLink } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { action, rejection_reason, outstanding_balance } = await req.json()
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data: payment } = await supabase.from('payments').select('*').eq('id', paymentId).eq('po_id', id).single()
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single()
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }
  if (action === 'reject') updateData.rejection_reason = rejection_reason
  if (action === 'approve' && outstanding_balance !== undefined) {
    updateData.outstanding_balance = parseFloat(outstanding_balance)
  }

  const { data: updated, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === 'approve') {
    const portalLink = getPortalLink(po.secure_token)
    try {
      await sendPaymentApprovedWhatsApp({
        mobile: po.customer_mobile,
        customerName: po.customer_name,
        poNumber: po.po_number,
        amountRequested: payment.amount_requested,
        outstandingBalance: outstanding_balance ?? null,
        portalLink,
      })
    } catch (err) { console.error('WhatsApp failed:', err) }
  }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: action === 'approve' ? 'APPROVE_PAYMENT' : 'REJECT_PAYMENT',
    tableName: 'payments',
    recordId: paymentId,
    oldData: payment,
    newData: updated,
  })

  return NextResponse.json({ data: updated })
}
