-- Storage buckets for PO Portal
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('po-documents', 'po-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('payment-proofs', 'payment-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('qr-codes', 'qr-codes', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- po-documents: staff/admin can do anything; customers read via signed URL only (handled by API)
CREATE POLICY "po_docs_select_staff_admin" ON storage.objects FOR SELECT USING (
  bucket_id = 'po-documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
);

CREATE POLICY "po_docs_insert_staff_admin" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'po-documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
);

CREATE POLICY "po_docs_update_staff_admin" ON storage.objects FOR UPDATE USING (
  bucket_id = 'po-documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
);

CREATE POLICY "po_docs_delete_admin" ON storage.objects FOR DELETE USING (
  bucket_id = 'po-documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- payment-proofs: anyone can insert (customer upload), staff/admin can read
CREATE POLICY "payment_proofs_insert_all" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'payment-proofs'
);

CREATE POLICY "payment_proofs_select_staff_admin" ON storage.objects FOR SELECT USING (
  bucket_id = 'payment-proofs' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
);

CREATE POLICY "payment_proofs_delete_admin" ON storage.objects FOR DELETE USING (
  bucket_id = 'payment-proofs' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- qr-codes: staff/admin manage, anyone can read for payment page
CREATE POLICY "qr_codes_insert_staff_admin" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'qr-codes' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
);

CREATE POLICY "qr_codes_select_all" ON storage.objects FOR SELECT USING (
  bucket_id = 'qr-codes'
);
