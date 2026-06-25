import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { sendPIWhatsApp } from '@/lib/notifications/whatsapp'
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
  const { pi_number, pi_date, pi_amount, pi_pdf_path, send_notifications = true } = body

  if (!pi_number || !pi_date || !pi_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: pi, error } = await supabase
    .from('proforma_invoices')
    .insert({
      po_id: id,
      pi_number,
      pi_date,
      pi_amount: parseFloat(pi_amount),
      pi_pdf_path: pi_pdf_path ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('purchase_orders').update({ status: 'pi_sent', updated_by: user.id }).eq('id', id)

  const portalLink = getPortalLink(po.secure_token)
  let waSent = false

  if (send_notifications) {
    try {
      let piPdfUrl: string | null = null
      if (pi_pdf_path) {
        // Generate a signed URL (1 hour) so AiSensy can download the file
        const adminClient = await createServiceClient()
        const { data: signedData } = await adminClient.storage
          .from('po-documents')
          .createSignedUrl(pi_pdf_path, 3600)
        piPdfUrl = signedData?.signedUrl ?? null
      }

      await sendPIWhatsApp({
        mobile: po.customer_mobile,
        customerName: po.customer_name,
        poNumber: po.po_number,
        piNumber: pi_number,
        piAmount: parseFloat(pi_amount),
        portalLink,
        piPdfUrl,
      })
      waSent = true
      await supabase.from('proforma_invoices').update({ notified_whatsapp: true }).eq('id', pi.id)
    } catch (err) {
      console.error('WhatsApp notification failed:', err)
    }
  }

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'CREATE_PI',
    tableName: 'proforma_invoices',
    recordId: pi.id,
    newData: pi,
  })

  return NextResponse.json({ data: pi, notifications: { whatsapp: waSent } }, { status: 201 })
}
