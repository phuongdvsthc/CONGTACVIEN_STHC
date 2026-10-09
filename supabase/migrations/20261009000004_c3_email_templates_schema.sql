-- ==============================================================================
-- MIGRATION: 20261009000004_c3_email_templates_schema.sql
-- MÔ TẢ: Bổ sung bảng quản lý mẫu email (email_templates) và các phiên bản xuất bản (email_template_versions)
--        phục vụ tính năng Quản lý Mẫu Email của Admin (C3.11B)
-- PHÂN HỆ: Quản lý Hệ thống & Mẫu Email STHC_CTV
-- ==============================================================================

-- 1. BẢNG QUẢN LÝ MẪU EMAIL CHÍNH (email_templates)
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed mẫu mặc định cho LEAD_REGISTRATION_CONFIRMATION
INSERT INTO public.email_templates (template_code, name, description, is_active)
VALUES (
    'LEAD_REGISTRATION_CONFIRMATION',
    'Xác nhận đăng ký tuyển sinh & Hướng dẫn EGOV',
    'Mẫu email gửi tự động cho khách hàng khi đăng ký khóa học qua cổng tuyển sinh STHC',
    TRUE
)
ON CONFLICT (template_code) DO NOTHING;

-- 2. BẢNG QUẢN LÝ CÁC PHIÊN BẢN MẪU BẤT BIẾN (email_template_versions)
CREATE TABLE IF NOT EXISTS public.email_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
    version_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CONSTRAINT chk_template_status CHECK (
        status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')
    ),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    button_label VARCHAR(100) NOT NULL DEFAULT 'Hoàn tất hồ sơ đăng ký',
    footer_text TEXT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NULL,
    change_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_template_version_code UNIQUE (template_id, version_code)
);

CREATE INDEX IF NOT EXISTS idx_email_template_versions_template_id ON public.email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_status ON public.email_template_versions(status);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_revision ON public.email_template_versions(revision DESC);

-- Seed phiên bản mặc định 'v1' (PUBLISHED) tương thích với C3.10B
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM public.email_templates WHERE template_code = 'LEAD_REGISTRATION_CONFIRMATION';
    
    IF v_template_id IS NOT NULL THEN
        INSERT INTO public.email_template_versions (
            template_id,
            version_code,
            status,
            subject,
            body_html,
            body_text,
            button_label,
            footer_text,
            revision,
            published_at,
            change_reason
        ) VALUES (
            v_template_id,
            'v1',
            'PUBLISHED',
            'Xác nhận tiếp nhận hồ sơ đăng ký khóa học - {{course_title}}',
            '<div style="font-family:sans-serif;padding:20px;color:#1f2937;"><h2 style="color:#1e3a8a;">Xin chào {{full_name}},</h2><p>Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) trân trọng cảm ơn bạn đã quan tâm và đăng ký khóa học <strong>{{course_title}}</strong>.</p><p>Mã đăng ký của bạn đã được ghi nhận vào hệ thống vào lúc {{registered_at}}.</p>{{#if affiliate_name}}<p>Bạn được giới thiệu bởi Đại sứ tuyển sinh: <strong>{{affiliate_name}}</strong> (Mã: {{affiliate_code}}).</p>{{/if}}<p>Để hoàn tất thủ tục xét tuyển chính thức, vui lòng nhấn vào nút bên dưới để truy cập cổng thông tin tuyển sinh trực tuyến (EGOV):</p><div style="text-align:center;margin:30px 0;"><a href="{{official_registration_url}}" style="background-color:#1e3a8a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">{{button_label}}</a></div><p>Nếu bạn cần hỗ trợ, vui lòng liên hệ hotline: {{support_hotline}} hoặc email: {{support_email}}.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;"/><p style="font-size:12px;color:#6b7280;">{{unit_name}} • Trân trọng kính chào.</p></div>',
            'Xin chào {{full_name}},\n\nTrường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) trân trọng cảm ơn bạn đã đăng ký khóa học {{course_title}} vào lúc {{registered_at}}.\n\nĐể hoàn tất hồ sơ, vui lòng truy cập đường dẫn chính thức sau:\n{{official_registration_url}}\n\nHỗ trợ tuyển sinh:\n- Hotline: {{support_hotline}}\n- Email: {{support_email}}\n\n{{unit_name}}',
            'Hoàn tất hồ sơ đăng ký',
            'Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) • Cổng Tuyển sinh & Đại sứ',
            1,
            NOW(),
            'Phiên bản mặc định tương thích C3.10B'
        )
        ON CONFLICT (template_id, version_code) DO NOTHING;
    END IF;
END $$;

-- Bật RLS cho các bảng mẫu email
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Manage Email Templates" ON public.email_templates;
CREATE POLICY "Service Role Manage Email Templates"
    ON public.email_templates FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read Email Templates" ON public.email_templates;
CREATE POLICY "Admin Read Email Templates"
    ON public.email_templates FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );

DROP POLICY IF EXISTS "Service Role Manage Email Template Versions" ON public.email_template_versions;
CREATE POLICY "Service Role Manage Email Template Versions"
    ON public.email_template_versions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Read Email Template Versions" ON public.email_template_versions;
CREATE POLICY "Admin Read Email Template Versions"
    ON public.email_template_versions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
              AND profiles.is_active = TRUE
        )
    );


-- 3. HÀM RPC LƯU NHÁP MẪU EMAIL NGUYÊN TỬ (fn_save_email_template_draft)
CREATE OR REPLACE FUNCTION public.fn_save_email_template_draft(
    p_admin_id UUID,
    p_template_code VARCHAR(100),
    p_version_code VARCHAR(50),
    p_subject TEXT,
    p_body_html TEXT,
    p_body_text TEXT,
    p_button_label VARCHAR(100),
    p_footer_text TEXT,
    p_expected_revision INTEGER DEFAULT NULL,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_template public.email_templates%ROWTYPE;
    v_ver public.email_template_versions%ROWTYPE;
    v_new_revision INTEGER;
BEGIN
    -- 1. Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa mẫu email.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Tra cứu template
    SELECT * INTO v_template FROM public.email_templates WHERE template_code = p_template_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy mẫu email với mã: %', p_template_code USING ERRCODE = 'P0002';
    END IF;

    -- 3. Kiểm tra xem phiên bản đã tồn tại chưa
    SELECT * INTO v_ver FROM public.email_template_versions 
    WHERE template_id = v_template.id AND version_code = p_version_code;

    IF FOUND THEN
        -- Nếu đã xuất bản (PUBLISHED), không cho sửa trực tiếp bản xuất bản; bắt buộc tạo bản nháp mới hoặc bản mới
        IF v_ver.status = 'PUBLISHED' THEN
            RAISE EXCEPTION 'Không thể chỉnh sửa trực tiếp phiên bản đã xuất bản (PUBLISHED). Vui lòng tạo phiên bản nháp mới để chỉnh sửa.'
                USING ERRCODE = '22023';
        END IF;

        IF p_expected_revision IS NOT NULL AND v_ver.revision <> p_expected_revision THEN
            RAISE EXCEPTION 'Xung đột phiên bản: Bản nháp đã được thay đổi bởi quản trị viên khác (Hiện tại: %, Yêu cầu: %).',
                v_ver.revision, p_expected_revision
                USING ERRCODE = 'P0004';
        END IF;

        v_new_revision := v_ver.revision + 1;

        UPDATE public.email_template_versions
        SET subject = p_subject,
            body_html = p_body_html,
            body_text = p_body_text,
            button_label = COALESCE(NULLIF(TRIM(p_button_label), ''), 'Hoàn tất hồ sơ đăng ký'),
            footer_text = p_footer_text,
            revision = v_new_revision,
            change_reason = p_change_reason,
            updated_at = NOW()
        WHERE id = v_ver.id
        RETURNING * INTO v_ver;
    else
        -- Tạo bản nháp mới
        INSERT INTO public.email_template_versions (
            template_id,
            version_code,
            status,
            subject,
            body_html,
            body_text,
            button_label,
            footer_text,
            revision,
            created_by,
            change_reason
        ) VALUES (
            v_template.id,
            p_version_code,
            'DRAFT',
            p_subject,
            p_body_html,
            p_body_text,
            COALESCE(NULLIF(TRIM(p_button_label), ''), 'Hoàn tất hồ sơ đăng ký'),
            p_footer_text,
            1,
            p_admin_id,
            p_change_reason
        )
        RETURNING * INTO v_ver;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'version', row_to_json(v_ver)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. HÀM RPC XUẤT BẢN MẪU EMAIL (fn_publish_email_template_version)
CREATE OR REPLACE FUNCTION public.fn_publish_email_template_version(
    p_admin_id UUID,
    p_version_id UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_ver public.email_template_versions%ROWTYPE;
    v_template_id UUID;
BEGIN
    -- 1. Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền xuất bản mẫu email.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Lấy thông tin phiên bản
    SELECT * INTO v_ver FROM public.email_template_versions WHERE id = p_version_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiên bản mẫu email.' USING ERRCODE = 'P0002';
    END IF;

    v_template_id := v_ver.template_id;

    -- 3. Chuyển phiên bản hiện tại đang PUBLISHED sang ARCHIVED
    UPDATE public.email_template_versions
    SET status = 'ARCHIVED',
        updated_at = NOW()
    WHERE template_id = v_template_id AND status = 'PUBLISHED';

    -- 4. Xuất bản phiên bản này thành PUBLISHED (Bất biến)
    UPDATE public.email_template_versions
    SET status = 'PUBLISHED',
        published_by = p_admin_id,
        published_at = NOW(),
        change_reason = COALESCE(NULLIF(TRIM(p_change_reason), ''), change_reason),
        updated_at = NOW()
    WHERE id = p_version_id
    RETURNING * INTO v_ver;

    RETURN jsonb_build_object(
        'success', TRUE,
        'published_version', row_to_json(v_ver)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.fn_save_email_template_draft OWNER TO postgres;
ALTER FUNCTION public.fn_publish_email_template_version OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.fn_save_email_template_draft FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_publish_email_template_version FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_email_template_draft TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_publish_email_template_version TO service_role;
