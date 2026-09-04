ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS logo_path text;

DROP POLICY IF EXISTS "merchant_logos_owner_read" ON storage.objects;
CREATE POLICY "merchant_logos_owner_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'merchant-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "merchant_logos_owner_insert" ON storage.objects;
CREATE POLICY "merchant_logos_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'merchant-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "merchant_logos_owner_update" ON storage.objects;
CREATE POLICY "merchant_logos_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'merchant-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'merchant-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "merchant_logos_owner_delete" ON storage.objects;
CREATE POLICY "merchant_logos_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'merchant-logos' AND (storage.foldername(name))[1] = auth.uid()::text);