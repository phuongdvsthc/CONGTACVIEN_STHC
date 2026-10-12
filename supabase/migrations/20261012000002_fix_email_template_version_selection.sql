-- ==============================================================================
-- MIGRATION: 20261012000002_fix_email_template_version_selection.sql
-- MÔ TẢ: Khắc phục triệt để lỗi chọn sai phiên bản mẫu email (LEAD_REGISTRATION_CONFIRMATION)
--        và sửa lỗi PostgreSQL 42725 (function name "public.fn_enqueue_email_job" is not unique)
--
-- NGUYÊN NHÂN LỖI 42725:
-- 1. Hàm fn_enqueue_email_job ở migration cũ nhận 14 tham số. Khi bổ sung tham số thứ 15
--    (p_template_version_id), CREATE OR REPLACE FUNCTION tạo ra hàm quá tải (overload) mới
--    thay vì thay thế hàm cũ.
-- 2. Lệnh REVOKE ALL ON FUNCTION public.fn_enqueue_email_job không chỉ định danh sách kiểu tham số,
--    khiến PostgreSQL không thể xác định hàm nào cần thu hồi quyền -> Báo lỗi 42725.
-- 3. Hàm fn_claim_email_jobs bổ sung cột trả về (template_version_id) nhưng chưa DROP chữ ký cũ,
--    gây lỗi 42P13 trong PostgreSQL.
-- 4. Hàm fn_submit_lead_with_confirmation_email từng thiếu tham số p_consent_accepted BOOLEAN.
--
-- GIẢI PHÁP ĐÃ ÁP DỤNG:
-- 1. Bổ sung DROP FUNCTION IF EXISTS với danh sách kiểu tham số tường minh trước khi CREATE.
-- 2. Chỉ định tường minh kiểu tham số trong mọi lệnh REVOKE và GRANT.
-- 3. Đồng bộ hoàn toàn danh sách 15 tham số của fn_submit_lead_with_confirmation_email với server.ts.
-- 4. Phân giải nguyên tử phiên bản PUBLISHED (v1.2) ngay khi enqueue tác vụ email.
-- ==============================================================================

-- 1. Bổ sung cột current_version_id vào bảng public.email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES public.email_template_versions(id) ON DELETE SET NULL;

-- 2. Bổ sung cột template_version_id vào bảng public.email_jobs
ALTER TABLE public.email_jobs 
ADD COLUMN IF NOT EXISTS template_version_id UUID REFERENCES public.email_template_versions(id) ON DELETE RESTRICT;

-- 3. Backfill current_version_id cho các mẫu email dựa trên phiên bản đang PUBLISHED
UPDATE public.email_templates et
SET current_version_id = etv.id,
    updated_at = NOW()
FROM public.email_template_versions etv
WHERE etv.template_id = et.id
  AND etv.status = 'PUBLISHED';

-- 4. Backfill template_version_id cho các job hiện có dựa trên template_code và template_version
UPDATE public.email_jobs ej
SET template_version_id = etv.id
FROM public.email_templates et
JOIN public.email_template_versions etv ON etv.template_id = et.id
WHERE ej.template_code = et.template_code
  AND ej.template_version = etv.version_code
  AND ej.template_version_id IS NULL;

-- 5. Chỉ mục ràng buộc duy nhất: Mỗi mẫu email chỉ có đúng 1 bản ghi PUBLISHED
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_template_versions_single_published 
ON public.email_template_versions(template_id) 
WHERE status = 'PUBLISHED';

-- ------------------------------------------------------------------------------
-- 6. HỦY BỎ (DROP) CÁC ĐỊNH NGHĨA HÀM CŨ ĐỂ TRÁNH LỖI QUÁ TẢI (OVERLOAD 42725 / 42P13)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_publish_email_template_version(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_publish_email_template_version(UUID, UUID, TEXT);

DROP FUNCTION IF EXISTS public.fn_enqueue_email_job(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, UUID, VARCHAR, INT, VARCHAR, VARCHAR
);
DROP FUNCTION IF EXISTS public.fn_enqueue_email_job(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, UUID, VARCHAR, INT, VARCHAR, VARCHAR, UUID
);

DROP FUNCTION IF EXISTS public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
);
DROP FUNCTION IF EXISTS public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
);

DROP FUNCTION IF EXISTS public.fn_claim_email_jobs(VARCHAR, INT, INT);

-- ------------------------------------------------------------------------------
-- 7. CẬP NHẬT HÀM fn_publish_email_template_version
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_publish_email_template_version(
    p_admin_id UUID,
    p_version_id UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_admin public.profiles%ROWTYPE;
    v_ver public.email_template_versions%ROWTYPE;
    v_template_id UUID;
BEGIN
    -- Kiểm tra quyền Admin
    SELECT * INTO v_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT FOUND OR v_admin.is_active = FALSE OR v_admin.role <> 'admin' THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Quản trị viên (Admin) mới có quyền xuất bản mẫu email.'
            USING ERRCODE = '42501';
    END IF;

    -- Lấy thông tin phiên bản
    SELECT * INTO v_ver FROM public.email_template_versions WHERE id = p_version_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy phiên bản mẫu email.' USING ERRCODE = 'P0002';
    END IF;

    v_template_id := v_ver.template_id;

    -- Chuyển toàn bộ phiên bản đang PUBLISHED của mẫu này sang ARCHIVED trong cùng transaction
    UPDATE public.email_template_versions
    SET status = 'ARCHIVED',
        updated_at = NOW()
    WHERE template_id = v_template_id 
      AND status = 'PUBLISHED'
      AND id <> p_version_id;

    -- Xuất bản phiên bản này thành PUBLISHED
    UPDATE public.email_template_versions
    SET status = 'PUBLISHED',
        published_by = p_admin_id,
        published_at = NOW(),
        change_reason = COALESCE(NULLIF(TRIM(p_change_reason), ''), change_reason),
        updated_at = NOW()
    WHERE id = p_version_id
    RETURNING * INTO v_ver;

    -- Cập nhật con trỏ current_version_id trên bảng email_templates
    UPDATE public.email_templates
    SET current_version_id = p_version_id,
        updated_at = NOW()
    WHERE id = v_template_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'template_id', v_template_id,
        'current_version_id', p_version_id,
        'published_version', row_to_json(v_ver)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_publish_email_template_version(UUID, UUID, TEXT) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_publish_email_template_version(UUID, UUID, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 8. CẬP NHẬT HÀM fn_enqueue_email_job
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enqueue_email_job(
    p_email_type VARCHAR,
    p_idempotency_key VARCHAR,
    p_recipient_email VARCHAR,
    p_recipient_name VARCHAR,
    p_template_code VARCHAR,
    p_payload JSONB,
    p_lead_id UUID DEFAULT NULL,
    p_notification_id UUID DEFAULT NULL,
    p_notification_recipient_id UUID DEFAULT NULL,
    p_recipient_user_id UUID DEFAULT NULL,
    p_template_version VARCHAR DEFAULT NULL,
    p_priority INT DEFAULT 100,
    p_initial_status VARCHAR DEFAULT 'PENDING',
    p_blocked_reason VARCHAR DEFAULT NULL,
    p_template_version_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_existing RECORD;
    v_new_id UUID;
    v_clean_email VARCHAR;
    v_template_id UUID;
    v_resolved_version_id UUID := p_template_version_id;
    v_resolved_version_code VARCHAR := nullif(trim(p_template_version), '');
    v_actual_status VARCHAR := p_initial_status;
    v_actual_blocked_reason VARCHAR := p_blocked_reason;
BEGIN
    v_clean_email := lower(trim(p_recipient_email));

    -- Kiểm tra bản ghi đã tồn tại theo idempotency_key
    SELECT id, email_type, recipient_email, lead_id, notification_recipient_id, status
    INTO v_existing
    FROM public.email_jobs
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing.email_type <> p_email_type
           OR lower(v_existing.recipient_email) <> v_clean_email
           OR (p_lead_id IS NOT NULL AND v_existing.lead_id IS DISTINCT FROM p_lead_id)
           OR (p_notification_recipient_id IS NOT NULL AND v_existing.notification_recipient_id IS DISTINCT FROM p_notification_recipient_id)
        THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'IDEMPOTENCY_CONFLICT',
                'error', 'Khóa chống trùng (idempotency_key) đã tồn tại nhưng dữ liệu người nhận hoặc thực thể liên kết không khớp.'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'job_id', v_existing.id,
            'status', v_existing.status,
            'message', 'Tác vụ email đã tồn tại trước đó cho thực thể này.'
        );
    END IF;

    -- Tự động tìm phiên bản PUBLISHED hiện hành của đúng template_code nếu chưa có đủ ID hoặc Code
    IF v_resolved_version_code IS NULL OR v_resolved_version_id IS NULL THEN
        SELECT et.id, etv.id, etv.version_code
        INTO v_template_id, v_resolved_version_id, v_resolved_version_code
        FROM public.email_templates et
        JOIN public.email_template_versions etv 
          ON (etv.id = et.current_version_id OR (et.current_version_id IS NULL AND etv.template_id = et.id AND etv.status = 'PUBLISHED'))
        WHERE et.template_code = p_template_code
          AND et.is_active = TRUE
          AND etv.status = 'PUBLISHED'
        ORDER BY etv.published_at DESC NULLS LAST, etv.created_at DESC
        LIMIT 1;

        IF v_resolved_version_code IS NULL THEN
            -- Không có phiên bản xuất bản (PUBLISHED) -> Khóa tác vụ an toàn theo chính sách
            v_actual_status := 'BLOCKED';
            v_actual_blocked_reason := 'NO_PUBLISHED_TEMPLATE_VERSION: Mẫu email ' || p_template_code || ' chưa có phiên bản xuất bản (PUBLISHED) đang hoạt động.';
            v_resolved_version_code := COALESCE(p_template_version, 'NONE');
        END IF;
    END IF;

    -- Tạo mới tác vụ email
    INSERT INTO public.email_jobs (
        email_type,
        idempotency_key,
        recipient_email,
        recipient_name,
        recipient_user_id,
        lead_id,
        notification_id,
        notification_recipient_id,
        template_code,
        template_version,
        template_version_id,
        payload,
        status,
        priority,
        next_attempt_at,
        blocked_reason
    ) VALUES (
        p_email_type,
        trim(p_idempotency_key),
        v_clean_email,
        trim(p_recipient_name),
        p_recipient_user_id,
        p_lead_id,
        p_notification_id,
        p_notification_recipient_id,
        trim(p_template_code),
        v_resolved_version_code,
        v_resolved_version_id,
        p_payload,
        v_actual_status,
        p_priority,
        NOW(),
        v_actual_blocked_reason
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'job_id', v_new_id,
        'status', v_actual_status,
        'template_version', v_resolved_version_code,
        'template_version_id', v_resolved_version_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_enqueue_email_job(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, UUID, VARCHAR, INT, VARCHAR, VARCHAR, UUID
) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_email_job(
    VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, UUID, VARCHAR, INT, VARCHAR, VARCHAR, UUID
) TO service_role;

-- ------------------------------------------------------------------------------
-- 9. CẬP NHẬT HÀM fn_submit_lead_with_confirmation_email (NGUYÊN TỬ)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_submit_lead_with_confirmation_email(
    p_full_name VARCHAR,
    p_phone VARCHAR,
    p_email VARCHAR,
    p_course_id UUID,
    p_consent_accepted BOOLEAN,
    p_affiliate_code VARCHAR DEFAULT NULL,
    p_province VARCHAR DEFAULT NULL,
    p_preferred_contact_time VARCHAR DEFAULT 'Giờ hành chính (08h - 17h)',
    p_customer_note TEXT DEFAULT NULL,
    p_utm_source VARCHAR DEFAULT 'direct',
    p_utm_medium VARCHAR DEFAULT 'organic',
    p_utm_campaign VARCHAR DEFAULT 'tuyensinh_2026',
    p_brand_name VARCHAR DEFAULT 'Trường Saigontourist',
    p_support_email VARCHAR DEFAULT 'tuyensinh@sthc.edu.vn',
    p_support_hotline VARCHAR DEFAULT '02838442238'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    -- Dữ liệu chuẩn hóa
    v_clean_name VARCHAR;
    v_clean_phone VARCHAR;
    v_clean_email VARCHAR;
    v_clean_province VARCHAR;
    v_clean_ref VARCHAR;
    v_masked_phone VARCHAR;
    
    -- Dữ liệu khóa học
    v_course RECORD;
    v_has_valid_url BOOLEAN := FALSE;
    v_initial_status VARCHAR := 'PENDING';
    v_blocked_reason VARCHAR := NULL;
    
    -- Dữ liệu CTV
    v_aff RECORD;
    v_affiliate_id UUID := NULL;
    v_affiliate_code_captured VARCHAR := NULL;
    v_affiliate_name VARCHAR := NULL;
    
    -- Dữ liệu chống trùng lặp
    v_ninety_days_ago TIMESTAMPTZ := NOW() - INTERVAL '90 days';
    v_existing_lead RECORD;
    v_lock_key BIGINT;
    
    -- Bản ghi Lead và Email Job
    v_new_lead RECORD;
    v_idempotency_key VARCHAR;
    v_email_payload JSONB;
    v_enqueue_res JSONB;
    v_enqueue_success BOOLEAN;
    v_enqueue_code VARCHAR;
    v_job_id UUID;

    -- Con trỏ phiên bản mẫu email
    v_template_version_id UUID := NULL;
    v_template_version_code VARCHAR := NULL;
BEGIN
    -- 1. Xác thực đồng ý chính sách bảo vệ dữ liệu cá nhân
    IF p_consent_accepted IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CONSENT_REQUIRED',
            'error', 'Bạn phải đồng ý với Chính sách bảo vệ dữ liệu cá nhân của Trường Saigontourist để gửi yêu cầu.'
        );
    END IF;

    -- 2. Chuẩn hóa Họ và tên
    v_clean_name := trim(p_full_name);
    IF v_clean_name IS NULL OR length(v_clean_name) < 2 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NAME_REQUIRED',
            'error', 'Vui lòng điền đầy đủ Họ và tên liên hệ.'
        );
    END IF;

    -- 3. Chuẩn hóa Số điện thoại
    v_clean_phone := regexp_replace(trim(p_phone), '[\s\.\-]', '', 'g');
    IF v_clean_phone IS NULL OR length(v_clean_phone) < 8 OR length(v_clean_phone) > 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_PHONE',
            'error', 'Số điện thoại liên hệ không hợp lệ. Vui lòng kiểm tra lại.'
        );
    END IF;

    -- 4. Chuẩn hóa Email
    IF p_email IS NOT NULL AND length(trim(p_email)) > 0 THEN
        v_clean_email := lower(trim(p_email));
        IF v_clean_email NOT LIKE '%@%.%' OR length(v_clean_email) < 5 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'INVALID_EMAIL_FORMAT',
                'error', 'Địa chỉ email không đúng định dạng.'
            );
        END IF;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EMAIL_REQUIRED',
            'error', 'Địa chỉ email là bắt buộc để nhận hướng dẫn tuyển sinh.'
        );
    END IF;

    -- 5. Kiểm tra thông tin khóa học
    SELECT id, code, title, is_active, status, accepts_referrals, official_registration_url
    INTO v_course
    FROM public.courses
    WHERE id = p_course_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COURSE_NOT_FOUND',
            'error', 'Khóa học được chọn không tồn tại trên hệ thống.'
        );
    END IF;

    IF v_course.is_active = FALSE OR v_course.status = 'DRAFT' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COURSE_NOT_PUBLISHED',
            'error', 'Khóa học hiện chưa được công bố tuyển sinh.'
        );
    END IF;

    -- Kiểm tra tính hợp lệ của đường dẫn tuyển sinh chính thức
    IF v_course.official_registration_url IS NOT NULL 
       AND length(trim(v_course.official_registration_url)) > 0
       AND (trim(v_course.official_registration_url) LIKE 'http://%' OR trim(v_course.official_registration_url) LIKE 'https://%')
    THEN
        v_has_valid_url := TRUE;
    ELSE
        v_initial_status := 'BLOCKED';
        v_blocked_reason := 'MISSING_OFFICIAL_REGISTRATION_URL: Khóa học chưa được cấu hình đường dẫn đăng ký chính thức trên cổng tuyển sinh EGOV.';
    END IF;

    -- 6. Kiểm tra thông tin Đại sứ (CTV) nếu có mã giới thiệu
    IF p_affiliate_code IS NOT NULL AND length(trim(p_affiliate_code)) > 0 THEN
        v_clean_ref := upper(trim(p_affiliate_code));
        v_affiliate_code_captured := v_clean_ref;

        SELECT ap.id, ap.user_id, ap.affiliate_code, ap.status, p.full_name
        INTO v_aff
        FROM public.affiliate_profiles ap
        JOIN public.profiles p ON p.id = ap.user_id
        WHERE upper(ap.affiliate_code) = v_clean_ref;

        IF FOUND THEN
            IF v_aff.status = 'SUSPENDED' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'AFFILIATE_SUSPENDED',
                    'error', 'Mã giới thiệu của Đại sứ tuyển sinh hiện đang tạm ngưng hoạt động.'
                );
            ELSIF v_aff.status <> 'ACTIVE' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'AFFILIATE_NOT_ACTIVE',
                    'error', 'Mã giới thiệu của Đại sứ tuyển sinh chưa được kích hoạt.'
                );
            ELSE
                v_affiliate_id := v_aff.id;
                v_affiliate_name := v_aff.full_name;
            END IF;
        ELSE
            v_affiliate_id := NULL;
            v_affiliate_name := NULL;
        END IF;
    END IF;

    -- 7. Advisory Lock chống race-condition & trùng lặp 90 ngày
    v_lock_key := ('x' || substr(md5(v_clean_phone || ':' || p_course_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT id, created_at, affiliate_id, course_id
    INTO v_existing_lead
    FROM public.leads
    WHERE phone = v_clean_phone
      AND course_id = p_course_id
      AND created_at >= v_ninety_days_ago
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'lead_id', v_existing_lead.id,
            'email_job_id', NULL,
            'email_job_status', NULL,
            'message', 'Đăng ký tư vấn thành công! Ban Tuyển sinh sẽ liên hệ tư vấn trong thời gian sớm nhất.',
            'course_title', v_course.title,
            'official_registration_url', v_course.official_registration_url,
            'affiliate_code', v_affiliate_code_captured,
            'affiliate_name', v_affiliate_name,
            'received_at', v_existing_lead.created_at
        );
    END IF;

    -- 8. Ghi nhận Lead mới trong transaction
    v_clean_province := nullif(trim(p_province), '');

    INSERT INTO public.leads (
        full_name, phone, email, province, course_id, affiliate_id,
        affiliate_code_captured, counseling_status, reconciliation_status,
        reward_status, admission_status, is_duplicate, duplicate_reason,
        consent_accepted, preferred_contact_time, customer_note,
        utm_source, utm_medium, utm_campaign
    ) VALUES (
        v_clean_name, v_clean_phone, v_clean_email, v_clean_province, p_course_id, v_affiliate_id,
        v_affiliate_code_captured, 'NEW', 'NOT_RECONCILED',
        'NONE', 'NOT_ENROLLED', false, NULL,
        p_consent_accepted, coalesce(p_preferred_contact_time, 'Giờ hành chính (08h - 17h)'),
        nullif(trim(p_customer_note), ''),
        coalesce(nullif(trim(p_utm_source), ''), 'direct'),
        coalesce(nullif(trim(p_utm_medium), ''), CASE WHEN v_affiliate_code_captured IS NOT NULL THEN 'affiliate_link' ELSE 'organic' END),
        coalesce(nullif(trim(p_utm_campaign), ''), 'tuyensinh_2026')
    )
    RETURNING id, created_at INTO v_new_lead;

    -- 9. PHÂN GIẢI PHIÊN BẢN PUBLISHED HIỆN HÀNH CỦA MẪU LEAD_REGISTRATION_CONFIRMATION (NGUYÊN TỬ)
    SELECT etv.id, etv.version_code
    INTO v_template_version_id, v_template_version_code
    FROM public.email_templates et
    JOIN public.email_template_versions etv 
      ON (etv.id = et.current_version_id OR (et.current_version_id IS NULL AND etv.template_id = et.id AND etv.status = 'PUBLISHED'))
    WHERE et.template_code = 'LEAD_REGISTRATION_CONFIRMATION'
      AND et.is_active = TRUE
      AND etv.status = 'PUBLISHED'
    ORDER BY etv.published_at DESC NULLS LAST, etv.created_at DESC
    LIMIT 1;

    IF v_template_version_code IS NULL THEN
        -- Không có bản PUBLISHED -> BLOCKED theo thiết kế an toàn, tuyệt đối không fallback hardcode v1
        v_initial_status := 'BLOCKED';
        v_blocked_reason := 'NO_PUBLISHED_TEMPLATE_VERSION: Mẫu email LEAD_REGISTRATION_CONFIRMATION chưa có phiên bản xuất bản (PUBLISHED).';
    END IF;

    -- 10. Tạo Snapshot Payload
    v_idempotency_key := 'lead-registration:' || v_new_lead.id::text;

    IF length(v_clean_phone) >= 8 THEN
        v_masked_phone := substr(v_clean_phone, 1, 3) || '***' || substr(v_clean_phone, length(v_clean_phone) - 2);
    ELSE
        v_masked_phone := '***';
    END IF;

    v_email_payload := jsonb_build_object(
        'customer_name', v_clean_name,
        'phone_masked', v_masked_phone,
        'course_code', v_course.code,
        'course_title', v_course.title,
        'affiliate_code', v_affiliate_code_captured,
        'affiliate_name', v_affiliate_name,
        'official_registration_url', CASE WHEN v_has_valid_url THEN trim(v_course.official_registration_url) ELSE NULL END,
        'registered_at', to_char(v_new_lead.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'brand_name', coalesce(nullif(trim(p_brand_name), ''), 'Trường Saigontourist'),
        'support_email', coalesce(nullif(trim(p_support_email), ''), 'tuyensinh@sthc.edu.vn'),
        'support_hotline', coalesce(nullif(trim(p_support_hotline), ''), '02838442238')
    );

    -- 11. Gọi fn_enqueue_email_job với phiên bản PUBLISHED thực tế
    v_enqueue_res := public.fn_enqueue_email_job(
        p_email_type := 'LEAD_REGISTRATION_CONFIRMATION',
        p_idempotency_key := v_idempotency_key,
        p_recipient_email := v_clean_email,
        p_recipient_name := v_clean_name,
        p_template_code := 'LEAD_REGISTRATION_CONFIRMATION',
        p_payload := v_email_payload,
        p_lead_id := v_new_lead.id,
        p_notification_id := NULL,
        p_notification_recipient_id := NULL,
        p_recipient_user_id := NULL,
        p_template_version := v_template_version_code,
        p_priority := 100,
        p_initial_status := v_initial_status,
        p_blocked_reason := v_blocked_reason,
        p_template_version_id := v_template_version_id
    );

    v_enqueue_success := (v_enqueue_res->>'success')::boolean;
    v_enqueue_code := v_enqueue_res->>'code';

    IF v_enqueue_success IS NOT TRUE THEN
        RAISE EXCEPTION 'EMAIL_QUEUE_ENQUEUE_FAILED: Không thể tạo tác vụ email xác nhận lead. Lỗi: %, Mã: %',
            (v_enqueue_res->>'error'), v_enqueue_code
            USING ERRCODE = 'P0001';
    END IF;

    v_job_id := (v_enqueue_res->>'job_id')::uuid;

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'lead_id', v_new_lead.id,
        'email_job_id', v_job_id,
        'email_job_status', v_enqueue_res->>'status',
        'template_version', v_enqueue_res->>'template_version',
        'template_version_id', v_enqueue_res->>'template_version_id',
        'message', 'Đăng ký tư vấn thành công! Ban Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist sẽ liên hệ tư vấn trong thời gian sớm nhất.',
        'course_title', v_course.title,
        'official_registration_url', v_course.official_registration_url,
        'affiliate_code', v_affiliate_code_captured,
        'affiliate_name', v_affiliate_name,
        'received_at', v_new_lead.created_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) TO service_role;

-- ------------------------------------------------------------------------------
-- 10. CẬP NHẬT HÀM fn_claim_email_jobs TRẢ VỀ template_version_id CHO WORKER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_claim_email_jobs(
    p_worker_id VARCHAR,
    p_batch_size INT DEFAULT 5,
    p_lock_duration_seconds INT DEFAULT 300
)
RETURNS TABLE (
    job_id UUID,
    lock_token UUID,
    email_type VARCHAR,
    recipient_email VARCHAR,
    recipient_name VARCHAR,
    template_code VARCHAR,
    template_version VARCHAR,
    payload JSONB,
    attempt_count INT,
    max_attempts INT,
    template_version_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_locked_until TIMESTAMPTZ := v_now + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    -- 1. Thu hồi các tác vụ PROCESSING đã hết hạn khóa (stale locks)
    UPDATE public.email_jobs ej
    SET status = CASE WHEN ej.attempt_count >= ej.max_attempts THEN 'DEAD_LETTER' ELSE 'RETRY_WAIT' END,
        locked_by = NULL,
        locked_at = NULL,
        locked_until = NULL,
        lock_token = NULL,
        last_error_code = 'LOCK_TIMEOUT',
        last_error_message = 'Worker giữ khóa quá thời hạn mà không hoàn tất',
        updated_at = v_now
    WHERE ej.status = 'PROCESSING'
      AND ej.locked_until < v_now;

    -- 2. Claim các tác vụ PENDING hoặc RETRY_WAIT thuộc cả hai loại email hợp lệ
    RETURN QUERY
    WITH candidate_jobs AS (
        SELECT ej_candidate.id
        FROM public.email_jobs ej_candidate
        WHERE ej_candidate.email_type IN ('LEAD_REGISTRATION_CONFIRMATION', 'CTV_NOTIFICATION_EMAIL')
          AND ej_candidate.status IN ('PENDING', 'RETRY_WAIT')
          AND ej_candidate.next_attempt_at <= v_now
          AND ej_candidate.attempt_count < ej_candidate.max_attempts
        ORDER BY ej_candidate.priority DESC, ej_candidate.next_attempt_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.email_jobs j
        SET status = 'PROCESSING',
            locked_by = p_worker_id,
            locked_at = v_now,
            locked_until = v_locked_until,
            lock_token = gen_random_uuid(),
            attempt_count = j.attempt_count + 1,
            updated_at = v_now
        FROM candidate_jobs c
        WHERE j.id = c.id
        RETURNING j.id, j.lock_token, j.email_type, j.recipient_email, j.recipient_name,
                  j.template_code, j.template_version, j.payload, j.attempt_count, j.max_attempts,
                  j.template_version_id
    )
    SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_email_jobs(VARCHAR, INT, INT) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_jobs(VARCHAR, INT, INT) TO service_role;
