-- ==============================================================================
-- BƯỚC DB-A7: MIGRATION 20261005000001 - CSDL VÀ API QUẢN TRỊ HỆ THỐNG (A7.3)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20261005000001_create_system_administration_schema_and_rpc.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Tách biệt hoàn toàn Module A7 khỏi homepage_config và homepage_config_history.
--   2. Tạo bảng đơn dòng (Singleton) public.system_settings với cơ chế kiểm soát revision.
--   3. Tạo bảng public.system_settings_history lưu nhật ký thay đổi và hỗ trợ rollback theo nhóm.
--   4. Tạo bảng public.system_regulations quản lý phiên bản quy chế tuyển sinh PDF (duy nhất 1 ACTIVE).
--   5. Tạo bảng public.affiliate_regulation_consents lưu vết đồng ý quy chế nguyên tử.
--   6. Tạo bảng public.affiliate_code_registry và Sequence public.seq_affiliate_code_counter
--      cấp mã CTV tự tăng đơn điệu nguyên tử, không cắt cụt số khi vượt 6 số, bảo toàn mã cũ.
--   7. Tạo các hàm PL/pgSQL RPC nguyên tử:
--      - fn_save_system_settings_group
--      - fn_rollback_system_settings_group
--      - fn_apply_system_regulation
--      - fn_generate_next_affiliate_code
--      - fn_preview_next_affiliate_code
--   8. Tạo Storage bucket 'system-assets' (private) và cấu hình RLS bảo vệ nghiêm ngặt.
-- ==============================================================================

-- 1. BẢNG CẤU HÌNH HỆ THỐNG HIỆN HÀNH (SINGLETON)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CONSTRAINT chk_system_settings_single_row CHECK (id = 1),
    
    -- Nhóm 1: Nhận diện Backend
    system_name VARCHAR(150) NOT NULL DEFAULT 'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC',
    system_short_name VARCHAR(50) NOT NULL DEFAULT 'STHC_CTV',
    unit_name VARCHAR(255) NOT NULL DEFAULT 'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
    logo_backend_url TEXT NULL,
    favicon_url TEXT NULL,
    
    -- Nhóm 2: Thông tin vận hành
    public_base_url VARCHAR(255) NOT NULL DEFAULT 'https://ctv.sthc.edu.vn',
    support_email VARCHAR(255) NOT NULL DEFAULT 'tuyensinh@sthc.edu.vn',
    support_phone VARCHAR(20) NOT NULL DEFAULT '0283844648',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    
    -- Nhóm 3: Tiếp nhận đăng ký CTV (Mặc định FALSE khi chưa có quy chế ACTIVE)
    allow_affiliate_registration BOOLEAN NOT NULL DEFAULT FALSE,
    registration_closed_message TEXT NULL DEFAULT 'Hệ thống hiện đang tạm ngưng tiếp nhận hồ sơ cộng tác viên mới.',
    
    -- Nhóm 4: Cấu hình mã CTV
    affiliate_code_prefix VARCHAR(20) NOT NULL DEFAULT 'STHCCTV',
    affiliate_code_min_digits INTEGER NOT NULL DEFAULT 6 CONSTRAINT chk_min_digits CHECK (affiliate_code_min_digits BETWEEN 4 AND 12),
    
    -- Phiên bản và kiểm toán
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Bật RLS cho system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage System Settings" ON public.system_settings;
CREATE POLICY "Service Role Manage System Settings"
    ON public.system_settings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read System Settings" ON public.system_settings;
CREATE POLICY "Admin Read System Settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

-- 2. BẢNG NHẬT KÝ LỊCH SỬ CẤU HÌNH (AUDIT & ROLLBACK)
CREATE TABLE IF NOT EXISTS public.system_settings_history (
    id BIGSERIAL PRIMARY KEY,
    setting_group VARCHAR(50) NOT NULL CONSTRAINT chk_setting_group CHECK (
        setting_group IN ('BRANDING', 'OPERATION', 'REGISTRATION', 'AFFILIATE_CODE', 'ROLLBACK')
    ),
    action_type VARCHAR(50) NOT NULL DEFAULT 'UPDATE' CONSTRAINT chk_action_type CHECK (
        action_type IN ('UPDATE', 'ROLLBACK', 'APPLY_REGULATION')
    ),
    revision INTEGER NOT NULL,
    previous_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT NULL,
    source_revision INTEGER NULL
);

CREATE INDEX IF NOT EXISTS idx_settings_history_group ON public.system_settings_history(setting_group);
CREATE INDEX IF NOT EXISTS idx_settings_history_revision ON public.system_settings_history(revision DESC);
CREATE INDEX IF NOT EXISTS idx_settings_history_changed_at ON public.system_settings_history(changed_at DESC);

ALTER TABLE public.system_settings_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Settings History" ON public.system_settings_history;
CREATE POLICY "Service Role Manage Settings History"
    ON public.system_settings_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read Settings History" ON public.system_settings_history;
CREATE POLICY "Admin Read Settings History"
    ON public.system_settings_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

-- 3. BẢNG QUẢN LÝ PHIÊN BẢN QUY CHẾ TUYỂN SINH (PDF)
CREATE TABLE IF NOT EXISTS public.system_regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    pdf_storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CONSTRAINT chk_regulation_status CHECK (
        status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED')
    ),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NULL
);

-- Bảo đảm duy nhất 1 phiên bản ACTIVE tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_regulation_single_active 
    ON public.system_regulations (status) 
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_regulations_status ON public.system_regulations(status);
CREATE INDEX IF NOT EXISTS idx_regulations_created_at ON public.system_regulations(created_at DESC);

ALTER TABLE public.system_regulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Regulations" ON public.system_regulations;
CREATE POLICY "Service Role Manage Regulations"
    ON public.system_regulations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read All Regulations" ON public.system_regulations;
CREATE POLICY "Admin Read All Regulations"
    ON public.system_regulations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

-- 4. BẢNG GHI NHẬN ĐỒNG Ý QUY CHẾ (AFFILIATE CONSENTS)
CREATE TABLE IF NOT EXISTS public.affiliate_regulation_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_profile_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
    regulation_id UUID NOT NULL REFERENCES public.system_regulations(id) ON DELETE RESTRICT,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip VARCHAR(64) NULL,
    user_agent TEXT NULL,
    CONSTRAINT uq_affiliate_regulation_consent UNIQUE (affiliate_profile_id, regulation_id)
);

CREATE INDEX IF NOT EXISTS idx_consents_affiliate ON public.affiliate_regulation_consents(affiliate_profile_id);
CREATE INDEX IF NOT EXISTS idx_consents_regulation ON public.affiliate_regulation_consents(regulation_id);

ALTER TABLE public.affiliate_regulation_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Consents" ON public.affiliate_regulation_consents;
CREATE POLICY "Service Role Manage Consents"
    ON public.affiliate_regulation_consents FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read All Consents" ON public.affiliate_regulation_consents;
CREATE POLICY "Admin Read All Consents"
    ON public.affiliate_regulation_consents FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

-- 5. BỘ CẤP MÃ VÀ SỔ LƯU VẾT MÃ CTV (REGISTRY & SEQUENCE)
CREATE SEQUENCE IF NOT EXISTS public.seq_affiliate_code_counter
    START WITH 10001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    NO CYCLE;

CREATE TABLE IF NOT EXISTS public.affiliate_code_registry (
    affiliate_code VARCHAR(50) PRIMARY KEY,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sequence_number BIGINT NULL,
    source_type VARCHAR(30) NOT NULL DEFAULT 'NEW' CONSTRAINT chk_code_source CHECK (
        source_type IN ('LEGACY', 'NEW')
    ),
    issued_at TIMESTAMPTZ NULL
);

-- Partial unique index trên sequence_number của các mã mới
CREATE UNIQUE INDEX IF NOT EXISTS uq_registry_sequence_number 
    ON public.affiliate_code_registry (sequence_number) 
    WHERE sequence_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_registry_user_id ON public.affiliate_code_registry(assigned_user_id);

ALTER TABLE public.affiliate_code_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Code Registry" ON public.affiliate_code_registry;
CREATE POLICY "Service Role Manage Code Registry"
    ON public.affiliate_code_registry FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read Code Registry" ON public.affiliate_code_registry;
CREATE POLICY "Admin Read Code Registry"
    ON public.affiliate_code_registry FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

-- 6. KHỞI TẠO BẢN GHI SEED VÀ SEQUENCE
INSERT INTO public.system_settings (
    id,
    system_name,
    system_short_name,
    unit_name,
    public_base_url,
    support_email,
    support_phone,
    timezone,
    allow_affiliate_registration,
    registration_closed_message,
    affiliate_code_prefix,
    affiliate_code_min_digits,
    revision,
    updated_at
)
VALUES (
    1,
    'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC',
    'STHC_CTV',
    'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
    'https://ctv.sthc.edu.vn',
    'tuyensinh@sthc.edu.vn',
    '0283844648',
    'Asia/Ho_Chi_Minh',
    FALSE, -- Mặc định đóng khi chưa có quy chế áp dụng
    'Hệ thống hiện đang tạm ngưng tiếp nhận hồ sơ cộng tác viên mới.',
    'STHCCTV',
    6,
    1,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Đồng bộ các mã CTV hiện hữu vào Registry an toàn (Đánh dấu LEGACY, sequence_number NULL)
INSERT INTO public.affiliate_code_registry (
    affiliate_code,
    assigned_user_id,
    sequence_number,
    source_type,
    issued_at
)
SELECT 
    ap.affiliate_code,
    ap.user_id,
    NULL,
    'LEGACY',
    ap.created_at
FROM public.affiliate_profiles ap
WHERE ap.affiliate_code IS NOT NULL
ON CONFLICT (affiliate_code) DO NOTHING;

-- Phân tích hậu tố số lớn nhất của mã cũ và khởi tạo Sequence chính xác
DO $$
DECLARE
    v_max_suffix BIGINT := 0;
    v_rec RECORD;
    v_match TEXT[];
    v_num_val BIGINT;
    v_start_val BIGINT;
BEGIN
    FOR v_rec IN SELECT affiliate_code FROM public.affiliate_profiles WHERE affiliate_code IS NOT NULL LOOP
        v_match := regexp_matches(v_rec.affiliate_code, '([0-9]+)$');
        IF v_match IS NOT NULL AND array_length(v_match, 1) >= 1 THEN
            IF LENGTH(v_match[1]) <= 18 THEN
                v_num_val := v_match[1]::BIGINT;
                IF v_num_val > v_max_suffix THEN
                    v_max_suffix := v_num_val;
                END IF;
            END IF;
        END IF;
    END LOOP;

    v_start_val := GREATEST(10001, v_max_suffix + 1);

    -- Dùng semantics setval(..., is_called = false) để lệnh nextval đầu tiên trả về đúng v_start_val
    PERFORM setval('public.seq_affiliate_code_counter', v_start_val, false);
END $$;

-- 7. STORAGE BUCKET 'system-assets' (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'system-assets',
    'system-assets',
    FALSE,
    10485760, -- 10 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon', 'application/pdf'];

DROP POLICY IF EXISTS "Service Role Manage System Assets" ON storage.objects;
CREATE POLICY "Service Role Manage System Assets"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'system-assets')
    WITH CHECK (bucket_id = 'system-assets');

-- 8. HÀM RPC LƯU CẤU HÌNH THEO NHÓM NGUYÊN TỬ (fn_save_system_settings_group)
CREATE OR REPLACE FUNCTION public.fn_save_system_settings_group(
    p_admin_id UUID,
    p_group VARCHAR(50),
    p_expected_revision INTEGER,
    p_data JSONB,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_curr public.system_settings%ROWTYPE;
    v_prev_json JSONB;
    v_new_json JSONB;
    v_new_revision INTEGER;
    v_active_reg_count INTEGER;
    v_clean_group VARCHAR(50);
BEGIN
    v_clean_group := UPPER(TRIM(p_group));

    -- 1. Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền lưu cấu hình hệ thống.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Khóa dòng cấu hình duy nhất (Optimistic Concurrency Control)
    SELECT * INTO v_curr FROM public.system_settings WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy bản ghi cấu hình hệ thống.' USING ERRCODE = 'P0002';
    END IF;

    IF v_curr.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'Xung đột phiên bản: Cấu hình đã được thay đổi bởi quản trị viên khác (Hiện tại: %, Yêu cầu: %). Vui lòng tải lại trang.',
            v_curr.revision, p_expected_revision
            USING ERRCODE = 'P0004';
    END IF;

    v_new_revision := v_curr.revision + 1;

    -- 3. Cập nhật theo từng nhóm cho phép (Allowlist validation)
    IF v_clean_group = 'BRANDING' THEN
        v_prev_json := jsonb_build_object(
            'system_name', v_curr.system_name,
            'system_short_name', v_curr.system_short_name,
            'unit_name', v_curr.unit_name,
            'logo_backend_url', v_curr.logo_backend_url,
            'favicon_url', v_curr.favicon_url
        );

        UPDATE public.system_settings
        SET system_name = COALESCE(NULLIF(TRIM(p_data->>'system_name'), ''), system_name),
            system_short_name = COALESCE(NULLIF(TRIM(p_data->>'system_short_name'), ''), system_short_name),
            unit_name = COALESCE(NULLIF(TRIM(p_data->>'unit_name'), ''), unit_name),
            logo_backend_url = CASE WHEN p_data ? 'logo_backend_url' THEN NULLIF(TRIM(p_data->>'logo_backend_url'), '') ELSE logo_backend_url END,
            favicon_url = CASE WHEN p_data ? 'favicon_url' THEN NULLIF(TRIM(p_data->>'favicon_url'), '') ELSE favicon_url END,
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'system_name', v_curr.system_name,
            'system_short_name', v_curr.system_short_name,
            'unit_name', v_curr.unit_name,
            'logo_backend_url', v_curr.logo_backend_url,
            'favicon_url', v_curr.favicon_url
        );

    ELSIF v_clean_group = 'OPERATION' THEN
        v_prev_json := jsonb_build_object(
            'public_base_url', v_curr.public_base_url,
            'support_email', v_curr.support_email,
            'support_phone', v_curr.support_phone,
            'timezone', v_curr.timezone
        );

        UPDATE public.system_settings
        SET public_base_url = COALESCE(NULLIF(TRIM(p_data->>'public_base_url'), ''), public_base_url),
            support_email = COALESCE(NULLIF(TRIM(p_data->>'support_email'), ''), support_email),
            support_phone = COALESCE(NULLIF(TRIM(p_data->>'support_phone'), ''), support_phone),
            timezone = COALESCE(NULLIF(TRIM(p_data->>'timezone'), ''), timezone),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'public_base_url', v_curr.public_base_url,
            'support_email', v_curr.support_email,
            'support_phone', v_curr.support_phone,
            'timezone', v_curr.timezone
        );

    ELSIF v_clean_group = 'REGISTRATION' THEN
        -- Kiểm tra điều kiện bật đăng ký: Bắt buộc phải có ít nhất 1 quy chế ACTIVE
        IF (p_data->>'allow_affiliate_registration')::BOOLEAN IS TRUE THEN
            SELECT COUNT(*) INTO v_active_reg_count 
            FROM public.system_regulations 
            WHERE status = 'ACTIVE';

            IF v_active_reg_count = 0 THEN
                RAISE EXCEPTION 'Bị từ chối: Không thể mở tiếp nhận đăng ký CTV khi chưa có phiên bản quy chế nào đang áp dụng (ACTIVE).'
                    USING ERRCODE = '22023';
            END IF;
        END IF;

        v_prev_json := jsonb_build_object(
            'allow_affiliate_registration', v_curr.allow_affiliate_registration,
            'registration_closed_message', v_curr.registration_closed_message
        );

        UPDATE public.system_settings
        SET allow_affiliate_registration = COALESCE((p_data->>'allow_affiliate_registration')::BOOLEAN, allow_affiliate_registration),
            registration_closed_message = CASE WHEN p_data ? 'registration_closed_message' THEN NULLIF(TRIM(p_data->>'registration_closed_message'), '') ELSE registration_closed_message END,
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'allow_affiliate_registration', v_curr.allow_affiliate_registration,
            'registration_closed_message', v_curr.registration_closed_message
        );

    ELSIF v_clean_group = 'AFFILIATE_CODE' THEN
        v_prev_json := jsonb_build_object(
            'affiliate_code_prefix', v_curr.affiliate_code_prefix,
            'affiliate_code_min_digits', v_curr.affiliate_code_min_digits
        );

        UPDATE public.system_settings
        SET affiliate_code_prefix = COALESCE(NULLIF(UPPER(TRIM(p_data->>'affiliate_code_prefix')), ''), affiliate_code_prefix),
            affiliate_code_min_digits = COALESCE((p_data->>'affiliate_code_min_digits')::INTEGER, affiliate_code_min_digits),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

        v_new_json := jsonb_build_object(
            'affiliate_code_prefix', v_curr.affiliate_code_prefix,
            'affiliate_code_min_digits', v_curr.affiliate_code_min_digits
        );
    ELSE
        RAISE EXCEPTION 'Nhóm cấu hình không hợp lệ: % (Chỉ chấp nhận BRANDING, OPERATION, REGISTRATION, AFFILIATE_CODE).', p_group
            USING ERRCODE = '22023';
    END IF;

    -- 4. Ghi nhật ký lịch sử cấu hình trong cùng transaction
    INSERT INTO public.system_settings_history (
        setting_group,
        action_type,
        revision,
        previous_data,
        new_data,
        changed_by,
        changed_at,
        change_reason
    ) VALUES (
        v_clean_group,
        'UPDATE',
        v_new_revision,
        v_prev_json,
        v_new_json,
        p_admin_id,
        NOW(),
        NULLIF(TRIM(p_reason), '')
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'group', v_clean_group,
        'revision', v_new_revision,
        'settings', row_to_json(v_curr)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_save_system_settings_group OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_save_system_settings_group FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_system_settings_group TO service_role;

-- 9. HÀM RPC KHÔI PHỤC CẤU HÌNH THEO NHÓM (fn_rollback_system_settings_group)
CREATE OR REPLACE FUNCTION public.fn_rollback_system_settings_group(
    p_admin_id UUID,
    p_group VARCHAR(50),
    p_source_revision INTEGER,
    p_expected_revision INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_curr public.system_settings%ROWTYPE;
    v_hist public.system_settings_history%ROWTYPE;
    v_target_data JSONB;
    v_prev_json JSONB;
    v_new_json JSONB;
    v_new_revision INTEGER;
    v_clean_group VARCHAR(50);
BEGIN
    v_clean_group := UPPER(TRIM(p_group));

    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền khôi phục cấu hình hệ thống.'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_curr FROM public.system_settings WHERE id = 1 FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy bản ghi cấu hình hệ thống.' USING ERRCODE = 'P0002';
    END IF;

    IF v_curr.revision <> p_expected_revision THEN
        RAISE EXCEPTION 'Xung đột phiên bản: Cấu hình hiện tại đã thay đổi. Vui lòng tải lại trang trước khi khôi phục.'
            USING ERRCODE = 'P0004';
    END IF;

    -- Tìm bản ghi lịch sử nguồn
    SELECT * INTO v_hist 
    FROM public.system_settings_history
    WHERE revision = p_source_revision AND setting_group = v_clean_group
    ORDER BY id DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy lịch sử phiên bản % cho nhóm %.', p_source_revision, v_clean_group
            USING ERRCODE = 'P0002';
    END IF;

    v_target_data := v_hist.new_data;
    v_new_revision := v_curr.revision + 1;

    IF v_clean_group = 'BRANDING' THEN
        v_prev_json := jsonb_build_object(
            'system_name', v_curr.system_name,
            'system_short_name', v_curr.system_short_name,
            'unit_name', v_curr.unit_name,
            'logo_backend_url', v_curr.logo_backend_url,
            'favicon_url', v_curr.favicon_url
        );

        UPDATE public.system_settings
        SET system_name = COALESCE(NULLIF(TRIM(v_target_data->>'system_name'), ''), system_name),
            system_short_name = COALESCE(NULLIF(TRIM(v_target_data->>'system_short_name'), ''), system_short_name),
            unit_name = COALESCE(NULLIF(TRIM(v_target_data->>'unit_name'), ''), unit_name),
            logo_backend_url = NULLIF(TRIM(v_target_data->>'logo_backend_url'), ''),
            favicon_url = NULLIF(TRIM(v_target_data->>'favicon_url'), ''),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

    ELSIF v_clean_group = 'OPERATION' THEN
        v_prev_json := jsonb_build_object(
            'public_base_url', v_curr.public_base_url,
            'support_email', v_curr.support_email,
            'support_phone', v_curr.support_phone,
            'timezone', v_curr.timezone
        );

        UPDATE public.system_settings
        SET public_base_url = COALESCE(NULLIF(TRIM(v_target_data->>'public_base_url'), ''), public_base_url),
            support_email = COALESCE(NULLIF(TRIM(v_target_data->>'support_email'), ''), support_email),
            support_phone = COALESCE(NULLIF(TRIM(v_target_data->>'support_phone'), ''), support_phone),
            timezone = COALESCE(NULLIF(TRIM(v_target_data->>'timezone'), ''), timezone),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

    ELSIF v_clean_group = 'AFFILIATE_CODE' THEN
        -- Khôi phục tiền tố và độ dài, TUYỆT ĐỐI KHÔNG LÙI SEQUENCE
        v_prev_json := jsonb_build_object(
            'affiliate_code_prefix', v_curr.affiliate_code_prefix,
            'affiliate_code_min_digits', v_curr.affiliate_code_min_digits
        );

        UPDATE public.system_settings
        SET affiliate_code_prefix = COALESCE(NULLIF(UPPER(TRIM(v_target_data->>'affiliate_code_prefix')), ''), affiliate_code_prefix),
            affiliate_code_min_digits = COALESCE((v_target_data->>'affiliate_code_min_digits')::INTEGER, affiliate_code_min_digits),
            revision = v_new_revision,
            updated_at = NOW(),
            updated_by = p_admin_id
        WHERE id = 1
        RETURNING * INTO v_curr;

    ELSE
        RAISE EXCEPTION 'Nhóm % không hỗ trợ rollback trực tiếp.', v_clean_group USING ERRCODE = '22023';
    END IF;

    v_new_json := v_target_data;

    -- Ghi log rollback tạo revision mới
    INSERT INTO public.system_settings_history (
        setting_group,
        action_type,
        revision,
        previous_data,
        new_data,
        changed_by,
        changed_at,
        change_reason,
        source_revision
    ) VALUES (
        v_clean_group,
        'ROLLBACK',
        v_new_revision,
        v_prev_json,
        v_new_json,
        p_admin_id,
        NOW(),
        COALESCE(NULLIF(TRIM(p_reason), ''), 'Khôi phục về phiên bản ' || p_source_revision::TEXT),
        p_source_revision
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'group', v_clean_group,
        'revision', v_new_revision,
        'source_revision', p_source_revision,
        'settings', row_to_json(v_curr)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_rollback_system_settings_group OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_rollback_system_settings_group FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rollback_system_settings_group TO service_role;

-- 10. HÀM RPC KÍCH HOẠT ÁP DỤNG QUY CHẾ (fn_apply_system_regulation)
CREATE OR REPLACE FUNCTION public.fn_apply_system_regulation(
    p_admin_id UUID,
    p_regulation_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_target_reg public.system_regulations%ROWTYPE;
    v_prev_active_id UUID := NULL;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền áp dụng quy chế.'
            USING ERRCODE = '42501';
    END IF;

    -- Khóa bảng system_regulations để tránh hai request áp dụng đồng thời
    SELECT * INTO v_target_reg 
    FROM public.system_regulations 
    WHERE id = p_regulation_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiên bản quy chế với ID cung cấp.' USING ERRCODE = 'P0002';
    END IF;

    -- Kiểm tra ngày hiệu lực không được ở tương lai
    IF v_target_reg.effective_date > v_now THEN
        RAISE EXCEPTION 'Bị từ chối: Ngày hiệu lực của quy chế (%) chưa đến. Không thể áp dụng trước thời hạn.',
            v_target_reg.effective_date
            USING ERRCODE = '22023';
    END IF;

    -- Lấy ID bản ghi ACTIVE hiện tại nếu có
    SELECT id INTO v_prev_active_id 
    FROM public.system_regulations 
    WHERE status = 'ACTIVE' 
    LIMIT 1;

    -- Chuyển bản cũ sang SUPERSEDED
    IF v_prev_active_id IS NOT NULL AND v_prev_active_id <> p_regulation_id THEN
        UPDATE public.system_regulations
        SET status = 'SUPERSEDED'
        WHERE id = v_prev_active_id;
    END IF;

    -- Kích hoạt bản ghi mới sang ACTIVE
    UPDATE public.system_regulations
    SET status = 'ACTIVE',
        published_by = p_admin_id,
        published_at = v_now
    WHERE id = p_regulation_id
    RETURNING * INTO v_target_reg;

    -- Ghi nhật ký vào system_settings_history
    INSERT INTO public.system_settings_history (
        setting_group,
        action_type,
        revision,
        previous_data,
        new_data,
        changed_by,
        changed_at,
        change_reason
    ) VALUES (
        'REGISTRATION',
        'APPLY_REGULATION',
        (SELECT revision FROM public.system_settings WHERE id = 1),
        jsonb_build_object('superseded_regulation_id', v_prev_active_id),
        jsonb_build_object('active_regulation_id', v_target_reg.id, 'version_code', v_target_reg.version_code, 'title', v_target_reg.title),
        p_admin_id,
        v_now,
        COALESCE(NULLIF(TRIM(p_reason), ''), 'Kích hoạt áp dụng quy chế ' || v_target_reg.version_code)
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'applied_regulation', row_to_json(v_target_reg),
        'superseded_regulation_id', v_prev_active_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_apply_system_regulation OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_apply_system_regulation FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_apply_system_regulation TO service_role;

-- 11. HÀM RPC CẤP MÃ CTV TỰ TĂNG NGUYÊN TỬ (fn_generate_next_affiliate_code)
CREATE OR REPLACE FUNCTION public.fn_generate_next_affiliate_code(
    p_assigned_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_min_digits INTEGER;
    v_seq BIGINT;
    v_code VARCHAR(50);
    v_digits TEXT;
BEGIN
    -- Đọc cấu hình tiền tố và độ dài tối thiểu từ system_settings
    SELECT 
        COALESCE(NULLIF(TRIM(affiliate_code_prefix), ''), 'STHCCTV'),
        COALESCE(affiliate_code_min_digits, 6)
    INTO v_prefix, v_min_digits
    FROM public.system_settings
    WHERE id = 1;

    -- Lấy số tự tăng từ sequence nguyên tử
    v_seq := nextval('public.seq_affiliate_code_counter');

    -- Đệm số không cắt cụt (dùng GREATEST giữa min_digits và độ dài thực tế)
    v_digits := LPAD(v_seq::TEXT, GREATEST(v_min_digits, LENGTH(v_seq::TEXT)), '0');
    v_code := v_prefix || v_digits;

    -- Ghi nhận vào Registry bảo toàn mã
    INSERT INTO public.affiliate_code_registry (
        affiliate_code,
        assigned_user_id,
        sequence_number,
        source_type,
        issued_at
    ) VALUES (
        v_code,
        p_assigned_user_id,
        v_seq,
        'NEW',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'affiliate_code', v_code,
        'sequence_number', v_seq,
        'prefix', v_prefix,
        'digits', v_digits
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_generate_next_affiliate_code OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_generate_next_affiliate_code FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_generate_next_affiliate_code TO service_role;

-- 12. HÀM RPC XEM TRƯỚC MÃ TIẾP THEO (KHÔNG TIÊU THỤ SEQUENCE)
CREATE OR REPLACE FUNCTION public.fn_preview_next_affiliate_code()
RETURNS JSONB AS $$
DECLARE
    v_prefix VARCHAR(20);
    v_min_digits INTEGER;
    v_last_val BIGINT;
    v_is_called BOOLEAN;
    v_next_val BIGINT;
    v_code VARCHAR(50);
    v_digits TEXT;
    v_total_issued BIGINT;
BEGIN
    SELECT 
        COALESCE(NULLIF(TRIM(affiliate_code_prefix), ''), 'STHCCTV'),
        COALESCE(affiliate_code_min_digits, 6)
    INTO v_prefix, v_min_digits
    FROM public.system_settings
    WHERE id = 1;

    -- Tra cứu trạng thái sequence an toàn
    SELECT last_value, is_called 
    INTO v_last_val, v_is_called 
    FROM public.seq_affiliate_code_counter;

    IF v_is_called THEN
        v_next_val := v_last_val + 1;
    ELSE
        v_next_val := v_last_val;
    END IF;

    v_digits := LPAD(v_next_val::TEXT, GREATEST(v_min_digits, LENGTH(v_next_val::TEXT)), '0');
    v_code := v_prefix || v_digits;

    SELECT COUNT(*) INTO v_total_issued FROM public.affiliate_code_registry;

    RETURN jsonb_build_object(
        'preview_code', v_code,
        'expected_sequence_number', v_next_val,
        'prefix', v_prefix,
        'min_digits', v_min_digits,
        'total_issued_in_registry', v_total_issued,
        'sequence_active', TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_preview_next_affiliate_code OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_preview_next_affiliate_code FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_preview_next_affiliate_code TO authenticated, service_role;

-- 13. TẢI LẠI SCHEMA CACHE CỦA POSTGREST
NOTIFY pgrst, 'reload schema';
