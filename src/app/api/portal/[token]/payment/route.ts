import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const formData = await req.formData()
  const paymentId = formData.get('payment_id') as string
  const utrNumber = formData.get('utr_number') as string
  const screenshotFile = formData.get('screenshot') as File | null

  if (!paymentId || !utrNumber?.trim()) {
    return NextResponse.json({ error: 'Payment ID and UTR number required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Verify token is valid before uploading
  const { data: po } = await supabase
    .from('purchase_orders')
    .select('id')
    .eq('secure_token', token)
    .single()

  if (!po) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  let screenshotPath: string | null = null

  if (screenshotFile) {
    const buffer = await screenshotFile.arrayBuffer()
    const ext = screenshotFile.name.split('.').pop()
    const filePath = `${po.id}/${paymentId}/proof-${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, buffer, { contentType: screenshotFile.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
    screenshotPath = uploadData.path
  }

  const { data, error } = await supabase.rpc('submit_payment_proof', {
    p_token: token,
    p_payment_id: paymentId,
    p_utr_number: utrNumber.trim(),
    p_screenshot_path: screenshotPath,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: data })
}
