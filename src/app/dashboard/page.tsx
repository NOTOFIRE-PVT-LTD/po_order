import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { POStatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import {
  ShoppingBag,
  CreditCard,
  Factory,
  FlaskConical,
  Truck,
  PackageCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('status')

  const { data: recentOrders } = await supabase
    .from('purchase_orders')
    .select('id, po_number, customer_name, status, po_value, created_at')
    .order('created_at', { ascending: false })
    .limit(8)

  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id, amount_requested, status, po_id, purchase_orders(po_number, customer_name)')
    .eq('status', 'uploaded')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = {
    total: orders?.length ?? 0,
    payment_pending: orders?.filter(o => o.status === 'payment_pending').length ?? 0,
    in_production: orders?.filter(o => o.status === 'in_production').length ?? 0,
    in_inspection: orders?.filter(o => ['in_inspection', 'ready_for_inspection'].includes(o.status)).length ?? 0,
    dispatched: orders?.filter(o => o.status === 'dispatched').length ?? 0,
    delivered: orders?.filter(o => o.status === 'delivered').length ?? 0,
  }

  const statCards = [
    { label: 'Total Orders', value: stats.total, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-800/50' },
    { label: 'Pending Payments', value: stats.payment_pending, icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-800/50' },
    { label: 'In Production', value: stats.in_production, icon: Factory, color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-800/50' },
    { label: 'In Inspection', value: stats.in_inspection, icon: FlaskConical, color: 'text-cyan-400', bg: 'bg-cyan-900/30 border-cyan-800/50' },
    { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-800/50' },
    { label: 'Delivered', value: stats.delivered, icon: PackageCheck, color: 'text-green-400', bg: 'bg-green-900/30 border-green-800/50' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Overview of all purchase orders</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Link href="/dashboard/orders" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-800">
                {recentOrders?.map(order => (
                  <Link
                    key={order.id}
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-100/50 -mx-2 px-2 rounded-lg transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-400 transition-colors">{order.po_number}</p>
                      <p className="text-xs text-gray-500 truncate">{order.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-600 hidden sm:block">{formatCurrency(order.po_value)}</span>
                      <POStatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
                {!recentOrders?.length && (
                  <p className="text-sm text-gray-500 py-4 text-center">No orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Approvals */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingPayments?.map((payment) => {
                  const po = payment.purchase_orders as unknown as { po_number: string; customer_name: string } | null
                  return (
                    <Link
                      key={payment.id}
                      href={`/dashboard/orders/${payment.po_id}`}
                      className="block p-3 rounded-lg bg-amber-900/20 border border-amber-800/40 hover:border-amber-700/60 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{po?.po_number}</p>
                      <p className="text-xs text-gray-400">{po?.customer_name}</p>
                      <p className="text-sm text-amber-400 font-semibold mt-1">{formatCurrency(payment.amount_requested)}</p>
                    </Link>
                  )
                })}
                {!pendingPayments?.length && (
                  <p className="text-sm text-gray-500 text-center py-4">No pending approvals</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
