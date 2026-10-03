-- ==============================================================================
-- MIGRATION: Tạo bảng homepage_config và storage bucket homepage-assets
-- Mã file: /supabase/migrations/20261002000003_create_homepage_config.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.homepage_config (
    id SERIAL PRIMARY KEY,
    logo_url TEXT NULL,
    logo_alt TEXT NULL,
    hotline TEXT NULL,
    footer_text TEXT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID NULL
);

-- Seed default empty record if none exists
INSERT INTO public.homepage_config (id, logo_url, logo_alt, hotline, footer_text)
VALUES (1, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for homepage assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'homepage-assets',
    'homepage-assets',
    TRUE,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = TRUE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage policy: Public read access
DROP POLICY IF EXISTS "Public Access Homepage Assets" ON storage.objects;
CREATE POLICY "Public Access Homepage Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'homepage-assets');

-- Storage policy: Authenticated insert / update / delete access
DROP POLICY IF EXISTS "Authenticated Insert Homepage Assets" ON storage.objects;
CREATE POLICY "Authenticated Insert Homepage Assets"
ON storage.objects FOR INSERT
TO service_role, authenticated
WITH CHECK (bucket_id = 'homepage-assets');

DROP POLICY IF EXISTS "Authenticated Update Homepage Assets" ON storage.objects;
CREATE POLICY "Authenticated Update Homepage Assets"
ON storage.objects FOR UPDATE
TO service_role, authenticated
USING (bucket_id = 'homepage-assets');

DROP POLICY IF EXISTS "Authenticated Delete Homepage Assets" ON storage.objects;
CREATE POLICY "Authenticated Delete Homepage Assets"
ON storage.objects FOR DELETE
TO service_role, authenticated
USING (bucket_id = 'homepage-assets');
