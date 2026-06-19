-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'staff', 'customer');
CREATE TYPE po_status AS ENUM ('draft', 'pi_sent', 'payment_pending', 'in_production', 'ready_for_inspection', 'in_inspection', 'dispatched', 'delivered', 'cancelled');
CREATE TYPE payment_type AS ENUM ('advance', 'partial', 'balance', 'final');
CREATE TYPE payment_status AS ENUM ('pending', 'uploaded', 'approved', 'rejected');
CREATE TYPE production_status AS ENUM ('not_started', 'production_started', 'material_ready', 'production_complete', 'ready_for_inspection');
CREATE TYPE document_type AS ENUM ('po', 'pi', 'payment_proof', 'inspection_certificate', 'test_report', 'rdso_ic', 'approval_document', 'invoice', 'lr_copy', 'eway_bill', 'pod', 'material_receipt', 'freight_slip', 'other');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  mobile TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  consignee_name TEXT NOT NULL,
  consignee_address TEXT NOT NULL,
  po_value NUMERIC(15,2) NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  secure_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  po_pdf_path TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFORMA INVOICES
-- ============================================================

CREATE TABLE proforma_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  pi_number TEXT NOT NULL,
  pi_date DATE NOT NULL,
  pi_amount NUMERIC(15,2) NOT NULL,
  pi_pdf_path TEXT,
  notified_whatsapp BOOLEAN NOT NULL DEFAULT false,
  notified_email BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amount_requested NUMERIC(15,2) NOT NULL,
  payment_type payment_type NOT NULL,
  due_date DATE NOT NULL,
  upi_link TEXT,
  upi_qr_path TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  outstanding_balance NUMERIC(15,2),
  utr_number TEXT,
  payment_screenshot_path TEXT,
  payment_date DATE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTION UPDATES
-- ============================================================

CREATE TABLE production_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  status production_status NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INSPECTION
-- ============================================================

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inspection_date DATE,
  inspector_name TEXT,
  result TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISPATCH
-- ============================================================

CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  transporter TEXT NOT NULL,
  dispatch_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DELIVERY
-- ============================================================

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  delivery_date DATE,
  received_by TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  reference_id UUID,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMENTS / DISCUSSION FEED
-- ============================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'customer',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id),
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  message_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_po BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_pi BEFORE UPDATE ON proforma_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_inspection BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_dispatch BEFORE UPDATE ON dispatches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_delivery BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_po_secure_token ON purchase_orders(secure_token);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_customer_email ON purchase_orders(customer_email);
CREATE INDEX idx_payments_po_id ON payments(po_id);
CREATE INDEX idx_documents_po_id ON documents(po_id);
CREATE INDEX idx_comments_po_id ON comments(po_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_production_updates_po_id ON production_updates(po_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin or staff
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR is_staff_or_admin());
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (is_admin());

-- PURCHASE ORDERS policies
CREATE POLICY "po_select_staff_admin" ON purchase_orders FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "po_insert_staff_admin" ON purchase_orders FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "po_update_staff_admin" ON purchase_orders FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "po_delete_admin" ON purchase_orders FOR DELETE USING (is_admin());

-- PROFORMA INVOICES policies
CREATE POLICY "pi_select_staff_admin" ON proforma_invoices FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "pi_insert_staff_admin" ON proforma_invoices FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "pi_update_staff_admin" ON proforma_invoices FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "pi_delete_admin" ON proforma_invoices FOR DELETE USING (is_admin());

-- PAYMENTS policies
CREATE POLICY "payments_select_staff_admin" ON payments FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "payments_insert_staff_admin" ON payments FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "payments_update_staff_admin" ON payments FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "payments_delete_admin" ON payments FOR DELETE USING (is_admin());

-- PRODUCTION UPDATES policies
CREATE POLICY "prod_select_staff_admin" ON production_updates FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "prod_insert_staff_admin" ON production_updates FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "prod_delete_admin" ON production_updates FOR DELETE USING (is_admin());

-- INSPECTIONS policies
CREATE POLICY "insp_select_staff_admin" ON inspections FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "insp_insert_staff_admin" ON inspections FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "insp_update_staff_admin" ON inspections FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "insp_delete_admin" ON inspections FOR DELETE USING (is_admin());

-- DISPATCHES policies
CREATE POLICY "dispatch_select_staff_admin" ON dispatches FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "dispatch_insert_staff_admin" ON dispatches FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "dispatch_update_staff_admin" ON dispatches FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "dispatch_delete_admin" ON dispatches FOR DELETE USING (is_admin());

-- DELIVERIES policies
CREATE POLICY "delivery_select_staff_admin" ON deliveries FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "delivery_insert_staff_admin" ON deliveries FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "delivery_update_staff_admin" ON deliveries FOR UPDATE USING (is_staff_or_admin());
CREATE POLICY "delivery_delete_admin" ON deliveries FOR DELETE USING (is_admin());

-- DOCUMENTS policies
CREATE POLICY "docs_select_staff_admin" ON documents FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "docs_insert_staff_admin" ON documents FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "docs_delete_admin" ON documents FOR DELETE USING (is_admin());

-- COMMENTS policies
CREATE POLICY "comments_select_staff_admin" ON comments FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "comments_insert_staff_admin" ON comments FOR INSERT WITH CHECK (is_staff_or_admin());
CREATE POLICY "comments_update_own" ON comments FOR UPDATE USING (author_id = auth.uid() OR is_admin());
CREATE POLICY "comments_delete_admin" ON comments FOR DELETE USING (is_admin());

-- AUDIT LOGS policies
CREATE POLICY "audit_select_admin" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "audit_insert_all" ON audit_logs FOR INSERT WITH CHECK (true);

-- NOTIFICATION LOGS policies
CREATE POLICY "notif_select_admin" ON notification_logs FOR SELECT USING (is_admin());
CREATE POLICY "notif_insert_all" ON notification_logs FOR INSERT WITH CHECK (is_staff_or_admin());

-- ============================================================
-- PUBLIC CUSTOMER PORTAL FUNCTION (token-based, no auth)
-- ============================================================

CREATE OR REPLACE FUNCTION get_po_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_po purchase_orders%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE secure_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'po', row_to_json(v_po),
    'pi', (SELECT jsonb_agg(row_to_json(pi)) FROM proforma_invoices pi WHERE pi.po_id = v_po.id),
    'payments', (SELECT jsonb_agg(row_to_json(p) ORDER BY p.created_at DESC) FROM payments p WHERE p.po_id = v_po.id),
    'production', (SELECT jsonb_agg(row_to_json(pu) ORDER BY pu.created_at ASC) FROM production_updates pu WHERE pu.po_id = v_po.id),
    'inspection', (SELECT row_to_json(i) FROM inspections i WHERE i.po_id = v_po.id LIMIT 1),
    'dispatch', (SELECT row_to_json(d) FROM dispatches d WHERE d.po_id = v_po.id LIMIT 1),
    'delivery', (SELECT row_to_json(dl) FROM deliveries dl WHERE dl.po_id = v_po.id LIMIT 1),
    'documents', (SELECT jsonb_agg(row_to_json(doc) ORDER BY doc.created_at DESC) FROM documents doc WHERE doc.po_id = v_po.id),
    'comments', (SELECT jsonb_agg(row_to_json(c) ORDER BY c.created_at ASC) FROM comments c WHERE c.po_id = v_po.id AND c.is_internal = false)
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous access to this function
GRANT EXECUTE ON FUNCTION get_po_by_token(TEXT) TO anon, authenticated;

-- ============================================================
-- FUNCTION: Add customer comment via token (no auth)
-- ============================================================

CREATE OR REPLACE FUNCTION add_customer_comment(p_token TEXT, p_content TEXT, p_author_name TEXT)
RETURNS UUID AS $$
DECLARE
  v_po_id UUID;
  v_comment_id UUID;
BEGIN
  SELECT id INTO v_po_id FROM purchase_orders WHERE secure_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  INSERT INTO comments (po_id, content, author_name, author_role, is_internal)
  VALUES (v_po_id, p_content, p_author_name, 'customer', false)
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_customer_comment(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- FUNCTION: Upload payment proof via token
-- ============================================================

CREATE OR REPLACE FUNCTION submit_payment_proof(
  p_token TEXT,
  p_payment_id UUID,
  p_utr_number TEXT,
  p_screenshot_path TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_po_id UUID;
BEGIN
  SELECT id INTO v_po_id FROM purchase_orders WHERE secure_token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  UPDATE payments
  SET
    utr_number = p_utr_number,
    payment_screenshot_path = p_screenshot_path,
    status = 'uploaded',
    payment_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_payment_id AND po_id = v_po_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or already processed';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_payment_proof(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
