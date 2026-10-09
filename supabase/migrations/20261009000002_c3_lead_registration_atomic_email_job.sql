-- ==============================================================================
-- BƯỚC C3.10B: MIGRATION 20261009000002 — TẠO TÁC VỤ EMAIL NGUYÊN TỬ KHI ĐĂNG KÝ LEAD
-- Dự án: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)
-- File: /supabase/migrations/20261009000002_c3_lead_registration_atomic_email_job.sql
--
-- Mục tiêu:
--   1. RPC public.fn_submit_lead_with_confirmation_email:
--      - Tiếp nhận đăng ký từ form công khai (Người học tự gửi form tư vấn).
--      - Kiểm tra tính hợp lệ nghiệp vụ: bắt buộc Họ tên, SĐT, Email hợp lệ (RFC 5322), Chấp thuận chính sách (Nghị định 13/2023/NĐ-CP).
--      - Khóa học: kiểm tra tồn tại và is_active = TRUE; lấy official_registration_url từ CSDL.
--      - CTV: tra cứu mã ref_code, kiểm tra status = 'ACTIVE' (từ chối SUSPENDED hoặc PENDING_REVIEW).
--      - Chống trùng lặp nghiệp vụ hiện hành (Attribution Window):
--        + Kiểm tra SĐT + Khóa học trong vòng 90 ngày.
--        + Nếu trùng trong 90 ngày: is_duplicate = true, giữ nguyên lead ban đầu, KHÔNG tạo lead mới, KHÔNG tạo tác vụ email xác nhận mới.
--        + Nếu là lần đăng ký mới hợp lệ: INSERT bản ghi vào public.leads (is_duplicate = false, counseling_status = 'NEW').
--      - Tạo tác vụ email LEAD_REGISTRATION_CONFIRMATION trong CÙNG TRANSACTION:
--        + Gọi trực tiếp hàm nội bộ public.fn_enqueue_email_job.
--        + Khóa chống trùng: lead-registration:{lead_id}.
--        + Snapshot payload: customer_name, phone_masked (che 3 số giữa), course_code, course_title, affiliate_code, affiliate_name,
--          official_registration_url, brand_name, support_email, support_hotline.
--        + Nếu khóa học có official_registration_url hợp lệ: status = 'PENDING'.
--        + Nếu khóa học chưa có official_registration_url: status = 'BLOCKED', blocked_reason ghi rõ lý do.
--      - Nguyên tắc nguyên tử (Atomicity): Nếu fn_enqueue_email_job gặp lỗi ngoài trường hợp BLOCKED hợp lệ (hoặc IDEMPOTENCY_CONFLICT),
--        toàn bộ transaction bao gồm việc INSERT lead sẽ tự động ROLLBACK.
--      - Xử lý tương tranh (Concurrency): Sử dụng khoá cố vấn (Advisory Lock) hoặc khóa dòng kiểm tra chống trùng đồng thời
--        theo cặp số điện thoại và khóa học để tránh 2 request gửi cùng lúc tạo 2 lead khác nhau.
--      - Bảo mật phân quyền:
--        + REVOKE ALL FROM anon, authenticated, public.
--        + GRANT EXECUTE TO service_role (chỉ backend Node.js được phép gọi).
--        + Không mở quyền enqueue hoặc submit trực tiếp cho client công khai.
-- ==============================================================================

-- 1. HÀM RPC ĐĂNG KÝ LEAD KÈM TẠO TÁC VỤ EMAIL NGUYÊN TỬ (TRANSACTION DUY NHẤT)
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
    
    -- Khóa Advisory Lock xử lý race-condition đồng thời theo SĐT + Khóa học
    v_lock_key BIGINT;
    
    -- Bản ghi Lead và Email Job
    v_new_lead RECORD;
    v_idempotency_key VARCHAR;
    v_email_payload JSONB;
    v_enqueue_res JSONB;
    v_enqueue_success BOOLEAN;
    v_enqueue_code VARCHAR;
    v_job_id UUID;
BEGIN
    -- --------------------------------------------------------------------------
    -- BƯỚC 1: KIỂM TRA THAM SỐ ĐẦU VÀO & CHUẨN HÓA DỮ LIỆU
    -- --------------------------------------------------------------------------
    IF p_consent_accepted IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CONSENT_REQUIRED',
            'error', 'Bạn phải đồng ý với Chính sách bảo vệ dữ liệu cá nhân của Trường Saigontourist để gửi yêu cầu.'
        );
    END IF;

    v_clean_name := trim(p_full_name);
    IF v_clean_name IS NULL OR length(v_clean_name) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NAME_REQUIRED',
            'error', 'Vui lòng điền đầy đủ Họ và tên liên hệ.'
        );
    END IF;

    v_clean_phone := regexp_replace(trim(p_phone), '[\s\.\-]', '', 'g');
    IF v_clean_phone IS NULL OR length(v_clean_phone) < 8 OR length(v_clean_phone) > 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_PHONE',
            'error', 'Số điện thoại liên hệ không hợp lệ. Vui lòng kiểm tra lại.'
        );
    END IF;

    v_clean_email := lower(trim(p_email));
    IF v_clean_email IS NULL OR length(v_clean_email) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EMAIL_REQUIRED',
            'error', 'Vui lòng điền Địa chỉ Email nhận thông tin xác nhận.'
        );
    END IF;

    -- Kiểm tra định dạng Email theo RFC cơ bản (^[^@\s]+@[^@\s]+\.[^@\s]+$)
    IF v_clean_email !~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_EMAIL_FORMAT',
            'error', 'Định dạng email không hợp lệ. Vui lòng kiểm tra lại.'
        );
    END IF;

    IF p_course_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COURSE_REQUIRED',
            'error', 'Vui lòng chọn khóa học cần đăng ký tư vấn.'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- BƯỚC 2: TRA CỨU & KIỂM TRA ĐIỀU KIỆN KHÓA HỌC
    -- --------------------------------------------------------------------------
    SELECT id, code, title, is_active, official_registration_url
    INTO v_course
    FROM public.courses
    WHERE id = p_course_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COURSE_NOT_FOUND',
            'error', 'Khóa học được chọn không tồn tại trong hệ thống.'
        );
    END IF;

    IF v_course.is_active IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'COURSE_NOT_PUBLISHED',
            'error', 'Khóa học này hiện chưa được công khai. Không thể tiếp nhận đăng ký tuyển sinh.'
        );
    END IF;

    -- Kiểm tra tính hợp lệ của official_registration_url
    IF v_course.official_registration_url IS NOT NULL 
       AND (v_course.official_registration_url ILIKE 'http://%' OR v_course.official_registration_url ILIKE 'https://%') 
       AND length(trim(v_course.official_registration_url)) > 10 
    THEN
        v_has_valid_url := TRUE;
        v_initial_status := 'PENDING';
        v_blocked_reason := NULL;
    ELSE
        v_has_valid_url := FALSE;
        v_initial_status := 'BLOCKED';
        v_blocked_reason := 'MISSING_OFFICIAL_REGISTRATION_URL: Khóa học chưa được cấu hình đường dẫn đăng ký chính thức trên cổng tuyển sinh EGOV.';
    END IF;

    -- --------------------------------------------------------------------------
    -- BƯỚC 3: TRA CỨU & XÁC THỰC MÃ GIỚI THIỆU CTV
    -- --------------------------------------------------------------------------
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
                    'error', 'Mã giới thiệu của Cộng tác viên hiện đang tạm ngưng tiếp nhận đăng ký tư vấn mới. Vui lòng liên hệ trực tiếp Ban Tuyển sinh Trường Saigontourist để được hỗ trợ.'
                );
            ELSIF v_aff.status <> 'ACTIVE' THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'code', 'AFFILIATE_NOT_ACTIVE',
                    'error', 'Mã giới thiệu của Cộng tác viên chưa được kích hoạt quyền giới thiệu. Vui lòng liên hệ Ban Tuyển sinh STHC.'
                );
            ELSE
                v_affiliate_id := v_aff.id;
                v_affiliate_name := v_aff.full_name;
            END IF;
        ELSE
            -- Mã CTV không tồn tại trong hệ thống: Ghi nhận mã nhưng không gán affiliate_id
            v_affiliate_id := NULL;
            v_affiliate_name := NULL;
        END IF;
    END IF;

    -- --------------------------------------------------------------------------
    -- BƯỚC 4: XỬ LÝ ĐỒNG THỜI & CHỐNG TRÙNG NGHIỆP VỤ (ATTRIBUTION WINDOW 90 NGÀY)
    -- Sử dụng Transaction-scoped Advisory Xact Lock theo cặp (SĐT, Khóa học)
    -- để ngăn chặn 2 request bấm cùng thời điểm tạo 2 lead khác nhau.
    -- --------------------------------------------------------------------------
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

    -- NẾU ĐÃ TỒN TẠI LEAD TRÙNG TRONG 90 NGÀY:
    -- Quy tắc nghiệp vụ C3.10: KHÔNG TẠO LEAD MỚI, KHÔNG TẠO TÁC VỤ EMAIL MỚI
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'lead_id', v_existing_lead.id,
            'email_job_id', NULL,
            'email_job_status', NULL,
            'message', 'Đăng ký tư vấn thành công! Ban Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist sẽ liên hệ tư vấn trong thời gian sớm nhất.',
            'course_title', v_course.title,
            'official_registration_url', v_course.official_registration_url,
            'affiliate_code', v_affiliate_code_captured,
            'affiliate_name', v_affiliate_name,
            'received_at', v_existing_lead.created_at
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- BƯỚC 5: TẠO BẢN GHI LEAD MỚI TRONG TRANSACTION
    -- --------------------------------------------------------------------------
    v_clean_province := nullif(trim(p_province), '');

    INSERT INTO public.leads (
        full_name,
        phone,
        email,
        province,
        course_id,
        affiliate_id,
        affiliate_code_captured,
        counseling_status,
        reconciliation_status,
        reward_status,
        admission_status,
        is_duplicate,
        duplicate_reason,
        consent_accepted,
        preferred_contact_time,
        customer_note,
        utm_source,
        utm_medium,
        utm_campaign
    ) VALUES (
        v_clean_name,
        v_clean_phone,
        v_clean_email,
        v_clean_province,
        p_course_id,
        v_affiliate_id,
        v_affiliate_code_captured,
        'NEW',
        'NOT_RECONCILED',
        'NONE',
        'NOT_ENROLLED',
        false,
        NULL,
        true,
        coalesce(p_preferred_contact_time, 'Giờ hành chính (08h - 17h)'),
        nullif(trim(p_customer_note), ''),
        coalesce(nullif(trim(p_utm_source), ''), 'direct'),
        coalesce(nullif(trim(p_utm_medium), ''), CASE WHEN v_affiliate_code_captured IS NOT NULL THEN 'affiliate_link' ELSE 'organic' END),
        coalesce(nullif(trim(p_utm_campaign), ''), 'tuyensinh_2026')
    )
    RETURNING id, created_at INTO v_new_lead;

    -- --------------------------------------------------------------------------
    -- BƯỚC 6: TẠO TÁC VỤ EMAIL XÁC NHẬN NGUYÊN TỬ QUA fn_enqueue_email_job
    -- Cùng Transaction CSDL: Nếu enqueue lỗi -> Rollback lead!
    -- --------------------------------------------------------------------------
    v_idempotency_key := 'lead-registration:' || v_new_lead.id::text;

    -- Mặt nạ SĐT bảo vệ PII (che 3 số giữa)
    IF length(v_clean_phone) >= 8 THEN
        v_masked_phone := substr(v_clean_phone, 1, 3) || '***' || substr(v_clean_phone, length(v_clean_phone) - 2);
    ELSE
        v_masked_phone := '***';
    END IF;

    -- Xây dựng Snapshot Payload
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

    -- Gọi RPC nội bộ fn_enqueue_email_job
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
        p_template_version := 'v1',
        p_priority := 100,
        p_initial_status := v_initial_status,
        p_blocked_reason := v_blocked_reason
    );

    v_enqueue_success := (v_enqueue_res->>'success')::boolean;
    v_enqueue_code := v_enqueue_res->>'code';

    -- NẾU ENQUEUE THẤT BẠI:
    -- Kích hoạt ROLLBACK toàn bộ transaction bằng RAISE EXCEPTION
    IF v_enqueue_success IS NOT TRUE THEN
        RAISE EXCEPTION 'EMAIL_QUEUE_ENQUEUE_FAILED: Không thể tạo tác vụ email xác nhận lead. Lỗi: %, Mã: %',
            (v_enqueue_res->>'error'), v_enqueue_code
            USING ERRCODE = 'P0001';
    END IF;

    v_job_id := (v_enqueue_res->>'job_id')::uuid;

    -- --------------------------------------------------------------------------
    -- BƯỚC 7: TRẢ VỀ KẾT QUẢ ĐĂNG KÝ THÀNH CÔNG NGUYÊN TỬ
    -- --------------------------------------------------------------------------
    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'lead_id', v_new_lead.id,
        'email_job_id', v_job_id,
        'email_job_status', v_initial_status,
        'message', 'Đăng ký tư vấn thành công! Ban Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist sẽ liên hệ tư vấn trong thời gian sớm nhất.',
        'course_title', v_course.title,
        'official_registration_url', v_course.official_registration_url,
        'affiliate_code', v_affiliate_code_captured,
        'affiliate_name', v_affiliate_name,
        'received_at', v_new_lead.created_at
    );
END;
$$;

-- 2. PHÂN QUYỀN HÀM RPC: CHỈ SERVICE_ROLE ĐƯỢC PHÉP THỰC THI
REVOKE ALL ON FUNCTION public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_submit_lead_with_confirmation_email(
    VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR
) TO service_role;

COMMENT ON FUNCTION public.fn_submit_lead_with_confirmation_email IS 
'RPC nguyên tử tiếp nhận đăng ký lead công khai và tạo tác vụ email xác nhận LEAD_REGISTRATION_CONFIRMATION trong cùng transaction.';
