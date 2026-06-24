import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OrderHeader from '@/components/orders/order-header'
import PIModule from '@/components/orders/pi-module'
import PaymentsModule from '@/components/orders/payments-module'
import ProductionModule from '@/components/orders/production-module'
import InspectionModule from '@/components/orders/inspection-module'
import DispatchModule from '@/components/orders/dispatch-module'
import DeliveryModule from '@/components/orders/delivery-module'
import DocumentsModule from '@/components/orders/documents-module'
import CommentsModule from '@/components/orders/comments-module'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      proforma_invoices(*),
      payments(*),
      production_updates(*, created_by_profile:profiles!production_updates_created_by_fkey(full_name)),
      inspections(*),
      dispatches(*),
      deliveries(*),
      documents(*, uploaded_by_profile:profiles!documents_uploaded_by_fkey(full_name)),
      comments(*)
    `)
    .eq('id', id)
    .single()

  if (error || !order) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="space-y-6 animate-fade-in">
      <OrderHeader order={order} profile={profile} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-50 border border-gray-200 flex flex-wrap h-auto gap-1 p-1">
          {[
            { value: 'overview', label: 'Overview' },
            { value: 'pi', label: 'PI' },
            { value: 'payments', label: 'Payments' },
            { value: 'production', label: 'Production' },
            { value: 'inspection', label: 'Inspection' },
            { value: 'dispatch', label: 'Dispatch' },
            { value: 'delivery', label: 'Delivery' },
            { value: 'documents', label: 'Documents' },
            { value: 'comments', label: 'Discussion' },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-gray-900 text-gray-400 hover:text-gray-900 rounded-md px-3 py-1.5 text-sm transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoCard title="Customer Details">
                <InfoRow label="Name" value={order.customer_name} />
                <InfoRow label="Email" value={order.customer_email} />
                <InfoRow label="Mobile" value={order.customer_mobile} />
              </InfoCard>
              <InfoCard title="Consignee Details">
                <InfoRow label="Name" value={order.consignee_name} />
                <InfoRow label="Address" value={order.consignee_address} />
              </InfoCard>
            </div>
            <div className="space-y-4">
              <InfoCard title="Order Details">
                <InfoRow label="PO Number" value={order.po_number} />
                <InfoRow label="PO Value" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.po_value)} />
                <InfoRow label="Status" value={order.status.replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())} />
              </InfoCard>
              {order.notes && (
                <InfoCard title="Notes">
                  <p className="text-sm text-gray-300">{order.notes}</p>
                </InfoCard>
              )}
              <InfoCard title="Portal Link">
                <p className="text-xs text-gray-400 break-all font-mono bg-gray-800 p-2 rounded">
                  {`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/portal/${order.secure_token}`}
                </p>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pi" className="mt-4">
          <PIModule order={order} profile={profile} initialData={order.proforma_invoices} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsModule order={order} profile={profile} initialData={order.payments} />
        </TabsContent>

        <TabsContent value="production" className="mt-4">
          <ProductionModule order={order} profile={profile} initialData={order.production_updates} />
        </TabsContent>

        <TabsContent value="inspection" className="mt-4">
          <InspectionModule order={order} profile={profile} initialData={order.inspections?.[0] ?? null} />
        </TabsContent>

        <TabsContent value="dispatch" className="mt-4">
          <DispatchModule order={order} profile={profile} initialData={order.dispatches?.[0] ?? null} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-4">
          <DeliveryModule order={order} profile={profile} initialData={order.deliveries?.[0] ?? null} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsModule order={order} profile={profile} initialData={order.documents ?? []} />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <CommentsModule order={order} profile={profile} initialData={order.comments ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-200 text-right">{value}</span>
    </div>
  )
}
