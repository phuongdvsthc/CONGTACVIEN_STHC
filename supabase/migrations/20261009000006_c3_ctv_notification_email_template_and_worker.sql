-- ==============================================================================
-- MIGRATION: 20261009000006_c3_ctv_notification_email_template_and_worker.sql
-- MÔ TẢ: 
-- 1. Seed mẫu email thông báo CTV (CTV_NOTIFICATION_EMAIL) vào bảng email_templates và email_template_versions.
-- 2. Cập nhật hàm RPC fn_claim_email_jobs để claim cả hai loại tác vụ:
--    - 'LEAD_REGISTRATION_CONFIRMATION'
--    - 'CTV_NOTIFICATION_EMAIL'
-- PHÂN HỆ: Hàng đợi Email & Worker (C3 / C3.13A)
-- ==============================================================================

-- 1. Seed mẫu email CTV_NOTIFICATION_EMAIL
INSERT INTO public.email_templates (template_code, name, description, is_active)
VALUES (
    'CTV_NOTIFICATION_EMAIL',
    'Thông báo hoạt động tuyển sinh dành cho Cộng tác viên (CTV)',
    'Mẫu email gửi tự động cho CTV khi có sự kiện hệ thống (khách đăng ký, nhập học, thù lao được duyệt)',
    TRUE
)
ON CONFLICT (template_code) DO NOTHING;

-- Seed phiên bản mặc định 'v1' (PUBLISHED) cho CTV_NOTIFICATION_EMAIL
DO $$
DECLARE
    v_template_id UUID;
BEGIN
    SELECT id INTO v_template_id FROM public.email_templates WHERE template_code = 'CTV_NOTIFICATION_EMAIL';
    
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
            '[STHC CTV] {{notification_title}}',
            '<div style="font-family:sans-serif;padding:20px;color:#1f2937;"><h2 style="color:#1e3a8a;">Xin chào {{affiliate_name}} (Mã: {{affiliate_code}}),</h2><p>Hệ thống tuyển sinh STHC ghi nhận thông báo mới dành cho bạn:</p><div style="background-color:#f8fafc;border-left:4px solid #1e3a8a;padding:16px;margin:20px 0;border-radius:4px;"><h3 style="margin-top:0;color:#1e3a8a;">{{notification_title}}</h3><p>{{notification_summary}}</p></div>{{#if action_url}}<div style="text-align:center;margin:30px 0;"><a href="{{action_url}}" style="background-color:#1e3a8a;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">{{button_label}}</a></div>{{/if}}<p>Thời gian ghi nhận: {{published_at}}</p><p>Nếu bạn cần hỗ trợ, vui lòng liên hệ email: {{support_email}}.</p><hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;"/><p style="font-size:12px;color:#6b7280;">{{brand_name}} • Trân trọng kính chào.</p></div>',
            'Xin chào {{affiliate_name}} (Mã: {{affiliate_code}}),\n\nHệ thống tuyển sinh STHC ghi nhận thông báo mới:\n- Tiêu đề: {{notification_title}}\n- Nội dung: {{notification_summary}}\n- Thời gian: {{published_at}}\n\nTruy cập cổng CTV tại: {{action_url}}\n\n{{brand_name}} • Hỗ trợ: {{support_email}}',
            'Truy cập Cổng CTV',
            'Trường Cao đẳng STHC • Cổng Đại sứ & Cộng tác viên',
            1,
            NOW(),
            'Phiên bản mặc định thông báo CTV (C3.13A)'
        )
        ON CONFLICT (template_id, version_code) DO NOTHING;
    END IF;
END $$;

-- 2. Cập nhật hàm RPC fn_claim_email_jobs để claim cả LEAD_REGISTRATION_CONFIRMATION và CTV_NOTIFICATION_EMAIL
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
    max_attempts INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_locked_until TIMESTAMPTZ := v_now + (p_lock_duration_seconds || ' seconds')::INTERVAL;
BEGIN
    -- 1. Thu hồi các tác vụ PROCESSING đã hết hạn khóa (stale locks)
    UPDATE public.email_jobs
    SET status = CASE WHEN attempt_count >= max_attempts THEN 'DEAD_LETTER' ELSE 'RETRY_WAIT' END,
        locked_by = NULL,
        locked_at = NULL,
        locked_until = NULL,
        lock_token = NULL,
        last_error_code = 'LOCK_TIMEOUT',
        last_error_message = 'Worker giữ khóa quá thời hạn mà không hoàn tất',
        updated_at = v_now
    WHERE status = 'PROCESSING'
      AND locked_until < v_now;

    -- 2. Claim các tác vụ PENDING hoặc RETRY_WAIT thuộc cả hai loại email hợp lệ
    RETURN QUERY
    WITH candidate_jobs AS (
        SELECT id
        FROM public.email_jobs
        WHERE email_type IN ('LEAD_REGISTRATION_CONFIRMATION', 'CTV_NOTIFICATION_EMAIL')
          AND status IN ('PENDING', 'RETRY_WAIT')
          AND next_attempt_at <= v_now
          AND attempt_count < max_attempts
        ORDER BY priority DESC, next_attempt_at ASC
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
                  j.template_code, j.template_version, j.payload, j.attempt_count, j.max_attempts
    )
    SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_email_jobs FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_jobs TO service_role;
