import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: orders } = await supabase.from('purchase_orders').select('status')

  const stats = {
    total_orders: orders?.length ?? 0,
    pending_payments: orders?.filter(o => o.status === 'payment_pending').length ?? 0,
    in_production: orders?.filter(o => o.status === 'in_production').length ?? 0,
    in_inspection: orders?.filter(o => ['in_inspection', 'ready_for_inspection'].includes(o.status)).length ?? 0,
    dispatched: orders?.filter(o => o.status === 'dispatched').length ?? 0,
    delivered: orders?.filter(o => o.status === 'delivered').length ?? 0,
    draft: orders?.filter(o => o.status === 'draft').length ?? 0,
    pi_sent: orders?.filter(o => o.status === 'pi_sent').length ?? 0,
  }

  return NextResponse.json({ data: stats })
}
