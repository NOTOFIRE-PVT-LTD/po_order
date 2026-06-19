import { createServiceClient } from '@/lib/supabase/server'

interface AuditParams {
  userId?: string
  userEmail?: string
  action: string
  tableName?: string
  recordId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  ipAddress?: string
}

export async function createAuditLog(params: AuditParams) {
  try {
    const supabase = await createServiceClient()
    await supabase.from('audit_logs').insert({
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
      action: params.action,
      table_name: params.tableName ?? null,
      record_id: params.recordId ?? null,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      ip_address: params.ipAddress ?? null,
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}
