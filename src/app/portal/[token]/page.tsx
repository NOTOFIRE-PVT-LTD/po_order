import { Suspense } from 'react'
import CustomerPortalClient from './customer-portal-client'

export default async function CustomerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <CustomerPortalClient token={token} />
    </Suspense>
  )
}

function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="skeleton h-40 w-full rounded-xl" />
        <div className="skeleton h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}
