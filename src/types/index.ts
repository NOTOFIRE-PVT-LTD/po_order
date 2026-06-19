export type UserRole = 'admin' | 'staff' | 'customer'

export type POStatus =
  | 'draft'
  | 'pi_sent'
  | 'payment_pending'
  | 'in_production'
  | 'ready_for_inspection'
  | 'in_inspection'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

export type PaymentType = 'advance' | 'partial' | 'balance' | 'final'
export type PaymentStatus = 'pending' | 'uploaded' | 'approved' | 'rejected'
export type ProductionStatus =
  | 'not_started'
  | 'production_started'
  | 'material_ready'
  | 'production_complete'
  | 'ready_for_inspection'

export type DocumentType =
  | 'po'
  | 'pi'
  | 'payment_proof'
  | 'inspection_certificate'
  | 'test_report'
  | 'rdso_ic'
  | 'approval_document'
  | 'invoice'
  | 'lr_copy'
  | 'eway_bill'
  | 'pod'
  | 'material_receipt'
  | 'freight_slip'
  | 'other'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  mobile: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  customer_name: string
  customer_mobile: string
  customer_email: string
  consignee_name: string
  consignee_address: string
  po_value: number
  status: POStatus
  secure_token: string
  po_pdf_path: string | null
  notes: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ProformaInvoice {
  id: string
  po_id: string
  pi_number: string
  pi_date: string
  pi_amount: number
  pi_pdf_path: string | null
  notified_whatsapp: boolean
  notified_email: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  po_id: string
  amount_requested: number
  payment_type: PaymentType
  due_date: string
  upi_link: string | null
  upi_qr_path: string | null
  status: PaymentStatus
  outstanding_balance: number | null
  utr_number: string | null
  payment_screenshot_path: string | null
  payment_date: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProductionUpdate {
  id: string
  po_id: string
  status: ProductionStatus
  notes: string | null
  created_by: string
  created_at: string
}

export interface Inspection {
  id: string
  po_id: string
  inspection_date: string | null
  inspector_name: string | null
  result: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Dispatch {
  id: string
  po_id: string
  vehicle_number: string
  transporter: string
  dispatch_date: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Delivery {
  id: string
  po_id: string
  delivery_date: string | null
  received_by: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  po_id: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  reference_id: string | null
  uploaded_by: string
  created_at: string
}

export interface Comment {
  id: string
  po_id: string
  content: string
  author_id: string | null
  author_name: string
  author_role: string
  is_internal: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface CustomerPortalData {
  po: PurchaseOrder
  pi: ProformaInvoice[] | null
  payments: Payment[] | null
  production: ProductionUpdate[] | null
  inspection: Inspection | null
  dispatch: Dispatch | null
  delivery: Delivery | null
  documents: Document[] | null
  comments: Comment[] | null
}

export interface DashboardStats {
  total_orders: number
  pending_payments: number
  in_production: number
  in_inspection: number
  dispatched: number
  delivered: number
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  pi_sent: 'PI Sent',
  payment_pending: 'Payment Pending',
  in_production: 'In Production',
  ready_for_inspection: 'Ready for Inspection',
  in_inspection: 'In Inspection',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  advance: 'Advance',
  partial: 'Partial',
  balance: 'Balance',
  final: 'Final',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  uploaded: 'Proof Uploaded',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  not_started: 'Not Started',
  production_started: 'Production Started',
  material_ready: 'Material Ready',
  production_complete: 'Production Complete',
  ready_for_inspection: 'Ready for Inspection',
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  po: 'Purchase Order',
  pi: 'Proforma Invoice',
  payment_proof: 'Payment Proof',
  inspection_certificate: 'Inspection Certificate',
  test_report: 'Test Report',
  rdso_ic: 'RDSO IC Copy',
  approval_document: 'Approval Document',
  invoice: 'Invoice',
  lr_copy: 'LR Copy',
  eway_bill: 'E-Way Bill',
  pod: 'Proof of Delivery',
  material_receipt: 'Material Receipt',
  freight_slip: 'Freight Slip',
  other: 'Other',
}
