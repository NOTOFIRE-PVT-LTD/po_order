import { createServiceClient } from '@/lib/supabase/server'

interface AuditLogParams {
  userId?: string | null
  userEmail?: string | null
  action: string
  tableName?: string
  recordId?: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
  ipAddress?: string
}

export async function createAuditLog(params: AuditLogParams) {
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
    // Audit log failures should never break the main operation
    console.error('Audit log failed:', err)
  }
}
