import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { sendPaymentRequestEmail } from '@/lib/notifications/email'
import { sendPaymentRequestWhatsApp } from '@/lib/notifications/whatsapp'
import { getPortalLink } from '@/lib/utils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('payments')
    .select('*, approved_by_profile:profiles!payments_approved_by_fkey(full_name)')
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

  const { data: po } = await supabase.from('purchase_orders').select('*').eq('id', id).single()
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

  const body = await req.json()
  const { amount_requested, payment_type, due_date, upi_link, upi_qr_path, outstanding_balance, notes, send_notifications = true } = body

  if (!amount_requested || !payment_type || !due_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      po_id: id,
      amount_requested: parseFloat(amount_requested),
      payment_type,
      due_date,
      upi_link: upi_link ?? null,
      upi_qr_path: upi_qr_path ?? null,
      outstanding_balance: outstanding_balance ? parseFloat(outstanding_balance) : null,
      notes: notes ?? null,
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update PO status
  await supabase.from('purchase_orders').update({ status: 'payment_pending', updated_by: user.id }).eq('id', id)

  const portalLink = getPortalLink(po.secure_token)

  if (send_notifications) {
    try {
      await sendPaymentRequestEmail({
        customerName: po.customer_name,
        customerEmail: po.customer_email,
        poNumber: po.po_number,
        amountRequested: parseFloat(amount_requested),
        paymentType: payment_type,
        dueDate: due_date,
        upiLink: upi_link ?? null,
        portalLink,
      })
    } catch (err) { console.error('Email failed:', err) }

    try {
      await sendPaymentRequestWhatsApp({
        mobile: po.customer_mobile,
        customerName: po.customer_name,
        poNumber: po.po_number,
        amountRequested: parseFloat(amount_requested),
        paymentType: payment_type,
        dueDate: due_date,
        upiLink: upi_link ?? null,
        portalLink,
      })
    } catch (err) { console.error('WhatsApp failed:', err) }
  }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_PAYMENT_REQUEST',
    tableName: 'payments',
    recordId: payment.id,
    newData: payment,
  })

  return NextResponse.json({ data: payment }, { status: 201 })
}
