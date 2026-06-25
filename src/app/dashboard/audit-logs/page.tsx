'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  useEffect(() => {
    setLoading(true)
    fetch(`/api/audit-logs?page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => { setLogs(d.data ?? []); setTotal(d.count ?? 0); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page])

  const actionColors: Record<string, string> = {
    CREATE_PO: 'text-green-600',
    UPDATE_PO: 'text-blue-600',
    DELETE_PO: 'text-red-600',
    CREATE_PI: 'text-cyan-700',
    CREATE_PAYMENT_REQUEST: 'text-amber-600',
    APPROVE_PAYMENT: 'text-green-600',
    REJECT_PAYMENT: 'text-red-600',
    PRODUCTION_UPDATE: 'text-purple-600',
    UPLOAD_DOCUMENT: 'text-blue-600',
    CREATE_DISPATCH: 'text-orange-600',
    CREATE_DELIVERY: 'text-green-600',
    CREATE_USER: 'text-cyan-700',
    DELETE_COMMENT: 'text-red-600',
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total log entries</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Table</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Record ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {logs.map((log) => (
                    <tr key={log.id as string} className="hover:bg-gray-100/20 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at as string)}</td>
                      <td className="px-6 py-3">
                        <p className="text-gray-700">{log.user_email as string ?? 'System'}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`font-medium ${actionColors[log.action as string] ?? 'text-gray-600'}`}>
                          {(log.action as string).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-gray-500">{log.table_name as string ?? '—'}</td>
                      <td className="px-6 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono text-gray-600">{log.record_id ? (log.record_id as string).slice(0, 8) + '...' : '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-500">No audit logs yet</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
