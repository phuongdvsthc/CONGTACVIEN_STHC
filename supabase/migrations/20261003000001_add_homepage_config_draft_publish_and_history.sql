-- ==============================================================================
-- MIGRATION: Bổ sung các cột Draft/Publish cho homepage_config và tạo bảng homepage_config_history
-- Mã file: /supabase/migrations/20261003000001_add_homepage_config_draft_publish_and_history.sql
-- Phân hệ: A6.4 - Quản lý trang chủ CTV (Xuất bản & Lịch sử phiên bản)
-- ==============================================================================

-- 1. Bổ sung các cột cho bảng homepage_config (A6.2, A6.3, A6.4)
ALTER TABLE public.homepage_config
    ADD COLUMN IF NOT EXISTS hero_background_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS hero_background_alt TEXT NULL,
    ADD COLUMN IF NOT EXISTS hero_illustration_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS hero_illustration_alt TEXT NULL,
    ADD COLUMN IF NOT EXISTS layout_blocks JSONB NULL,
    ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS published_by TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_logo_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_logo_alt TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_hotline TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_footer_text TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_hero_background_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_hero_background_alt TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_hero_illustration_url TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_hero_illustration_alt TEXT NULL,
    ADD COLUMN IF NOT EXISTS draft_layout_blocks JSONB NULL,
    ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS draft_updated_by TEXT NULL;

-- Cập nhật thời gian xuất bản ban đầu cho bản ghi hiện hữu (bảo toàn lịch sử từ updated_at, không dùng NOW())
UPDATE public.homepage_config
SET published_at = updated_at,
    published_by = COALESCE(published_by, 'Ban Tuyển sinh STHC')
WHERE id = 1 AND published_at IS NULL;

-- 2. Tạo bảng lưu lịch sử các phiên bản xuất bản (A6.4)
CREATE TABLE IF NOT EXISTS public.homepage_config_history (
    id SERIAL PRIMARY KEY,
    version_number INTEGER NOT NULL,
    logo_url TEXT NULL,
    logo_alt TEXT NULL,
    hero_background_url TEXT NULL,
    hero_background_alt TEXT NULL,
    hero_illustration_url TEXT NULL,
    hero_illustration_alt TEXT NULL,
    hotline TEXT NULL,
    footer_text TEXT NULL,
    layout_blocks JSONB NULL,
    action_type VARCHAR(50) DEFAULT 'PUBLISH',
    source_version_number INTEGER NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tra cứu lịch sử theo version_number
CREATE INDEX IF NOT EXISTS idx_homepage_config_history_version 
    ON public.homepage_config_history (version_number DESC);

-- Bật RLS và cấp quyền bảo mật
ALTER TABLE public.homepage_config_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Homepage Config History" ON public.homepage_config_history;
CREATE POLICY "Public Read Homepage Config History"
    ON public.homepage_config_history FOR SELECT
    TO public, service_role, authenticated
    USING (true);

DROP POLICY IF EXISTS "Service Role Manage Homepage Config History" ON public.homepage_config_history;
CREATE POLICY "Service Role Manage Homepage Config History"
    ON public.homepage_config_history FOR ALL
    TO service_role, authenticated
    USING (true)
    WITH CHECK (true);

-- Khởi tạo bản chụp lịch sử v1 ban đầu từ cấu hình hiện hành nếu chưa có
INSERT INTO public.homepage_config_history (
    version_number,
    logo_url,
    logo_alt,
    hero_background_url,
    hero_background_alt,
    hero_illustration_url,
    hero_illustration_alt,
    hotline,
    footer_text,
    layout_blocks,
    action_type,
    created_by,
    created_at
)
SELECT 
    1,
    logo_url,
    logo_alt,
    hero_background_url,
    hero_background_alt,
    hero_illustration_url,
    hero_illustration_alt,
    hotline,
    footer_text,
    layout_blocks,
    'PUBLISH',
    COALESCE(published_by, 'Ban Tuyển sinh STHC'),
    COALESCE(published_at, updated_at, NOW())
FROM public.homepage_config
WHERE id = 1
  AND NOT EXISTS (
      SELECT 1 FROM public.homepage_config_history WHERE version_number = 1
  );

-- 3. Tải lại schema cache của PostgREST
NOTIFY pgrst, 'reload schema';
