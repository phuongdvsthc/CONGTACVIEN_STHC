-- ==============================================================================
-- MIGRATION: C3.10A - DỮ LIỆU HÀNG ĐỢI EMAIL (EMAIL QUEUE & ATTEMPTS FOUNDATION)
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- Mã file: /supabase/migrations/20261009000001_c3_email_queue_schema_and_integrity.sql
-- Ngày: 09/10/2026
--
-- Mục đích:
--   1. Tạo bảng public.email_jobs: Quản lý vòng đời tác vụ email dùng chung cho 2 luồng:
--      - LEAD_REGISTRATION_CONFIRMATION: Xác nhận đăng ký lead & hướng dẫn hoàn tất EGOV
--      - CTV_NOTIFICATION_EMAIL: Thông báo gửi cho CTV đủ điều kiện
--   2. Tạo bảng public.email_job_attempts: Lưu vết lịch sử từng lần thử/gửi độc lập
--   3. Thiết lập ràng buộc toàn vẹn:
--      - Khóa chống trùng bắt buộc và duy nhất (idempotency_key)
--      - Ràng buộc phân tách mục đích (Lead vs CTV, không trộn lẫn)
--      - Ràng buộc bảo mật payload & metadata (ngăn ngừa chứa mật khẩu, token, secret)
--      - Ràng buộc FK delete policy bảo toàn lịch sử kiểm toán (ON DELETE RESTRICT)
--      - Ràng buộc toàn vẹn đối chiếu người nhận CTV (notification_id, recipient_id, user_id)
--   4. Thiết lập chỉ mục hiệu năng cho Worker claim (O(1)), quét lock quá hạn, tra cứu lead/CTV
--   5. Cấu hình Row Level Security (RLS): Thu hồi quyền từ anon/authenticated, chỉ cho phép service_role
--   6. Cung cấp các hàm RPC nội bộ chuẩn bị cho C3.10B & C3.12A:
--      - fn_enqueue_email_job: Enqueue an toàn, chống trùng và phát hiện xung đột dữ liệu
--      - fn_claim_email_jobs: Claim nguyên tử với FOR UPDATE SKIP LOCKED & thu hồi lock quá hạn
--      - fn_complete_email_job: Ghi nhận kết quả (SENT, RETRY, DEAD_LETTER, UNKNOWN) kèm lock token
-- ==============================================================================

-- ==============================================================================
-- 1. BỔ SUNG RÀNG BUỘC TOÀN VẸN TRÊN PUBLIC.NOTIFICATION_RECIPIENTS
-- Phục vụ ràng buộc khóa ngoại phức hợp (Composite FK) ngăn ngừa ghép nhầm ID
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_notification_recipients_composite' 
          AND conrelid = 'public.notification_recipients'::regclass
    ) THEN
        ALTER TABLE public.notification_recipients
        ADD CONSTRAINT uq_notification_recipients_composite
        UNIQUE (id, notification_id, user_id);
    END IF;
END $$;

-- ==============================================================================
-- 2. BẢNG PUBLIC.EMAIL_JOBS (TÁC VỤ HÀNG ĐỢI EMAIL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.email_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- A. Định danh và mục đích
    email_type VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    
    -- B. Người nhận
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- C. Liên kết nghiệp vụ
    lead_id UUID REFERENCES public.leads(id) ON DELETE RESTRICT,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE RESTRICT,
    notification_recipient_id UUID REFERENCES public.notification_recipients(id) ON DELETE RESTRICT,
    original_job_id UUID REFERENCES public.email_jobs(id) ON DELETE RESTRICT,
    
    -- D. Nội dung & Mẫu dựng email
    template_code VARCHAR(100) NOT NULL,
    template_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- E. Trạng thái và lịch gửi
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    priority INT NOT NULL DEFAULT 100,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    blocked_reason VARCHAR(255),
    
    -- F. Khóa worker
    locked_by VARCHAR(100),
    locked_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    lock_token UUID,
    
    -- G. Kết quả và kiểm toán
    sent_at TIMESTAMPTZ,
    provider_message_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- RÀNG BUỘC GIÁ TRỊ (CHECK CONSTRAINTS)
    CONSTRAINT chk_email_jobs_type CHECK (
        email_type IN ('LEAD_REGISTRATION_CONFIRMATION', 'CTV_NOTIFICATION_EMAIL')
    ),
    CONSTRAINT chk_email_jobs_status CHECK (
        status IN ('PENDING', 'PROCESSING', 'RETRY_WAIT', 'BLOCKED', 'SENT', 'DEAD_LETTER', 'CANCELLED')
    ),
    CONSTRAINT chk_email_jobs_attempts CHECK (
        attempt_count >= 0 AND max_attempts > 0 AND attempt_count <= max_attempts + 1
    ),
    CONSTRAINT chk_email_jobs_recipient_email CHECK (
        length(trim(recipient_email)) >= 5 AND recipient_email LIKE '%@%.%'
    ),
    CONSTRAINT chk_email_jobs_idempotency_key_not_empty CHECK (
        length(trim(idempotency_key)) > 0
    ),
    
    -- Phân tách mục đích nghiệp vụ: Xác nhận lead vs Thông báo CTV (Không trộn lẫn)
    CONSTRAINT chk_email_jobs_purpose_isolation CHECK (
        (
            email_type = 'LEAD_REGISTRATION_CONFIRMATION' 
            AND lead_id IS NOT NULL 
            AND notification_id IS NULL 
            AND notification_recipient_id IS NULL
        )
        OR
        (
            email_type = 'CTV_NOTIFICATION_EMAIL' 
            AND notification_id IS NOT NULL 
            AND notification_recipient_id IS NOT NULL 
            AND recipient_user_id IS NOT NULL 
            AND lead_id IS NULL
        )
    ),
    
    -- Bảo mật: Payload phải là JSON Object và không chứa khóa bí mật
    CONSTRAINT chk_email_jobs_payload_security CHECK (
        jsonb_typeof(payload) = 'object'
        AND NOT (payload ? 'password')
        AND NOT (payload ? 'token')
        AND NOT (payload ? 'secret')
        AND NOT (payload ? 'smtp_password')
        AND NOT (payload ? 'apiKey')
        AND NOT (payload ? 'api_key')
        AND NOT (payload ? 'service_role_key')
        AND NOT (payload ? 'authorization')
    ),
    
    -- Bảo mật: Metadata phải là JSON Object và không chứa khóa bí mật
    CONSTRAINT chk_email_jobs_metadata_security CHECK (
        jsonb_typeof(metadata) = 'object'
        AND NOT (metadata ? 'password')
        AND NOT (metadata ? 'token')
        AND NOT (metadata ? 'secret')
        AND NOT (metadata ? 'smtp_password')
        AND NOT (metadata ? 'apiKey')
        AND NOT (metadata ? 'api_key')
        AND NOT (metadata ? 'service_role_key')
        AND NOT (metadata ? 'authorization')
    ),
    
    -- Khóa ngoại phức hợp đảm bảo tính nhất quán giữa notification_id, recipient_id và user_id
    CONSTRAINT fk_email_jobs_notification_recipient_triplet
    FOREIGN KEY (notification_recipient_id, notification_id, recipient_user_id)
    REFERENCES public.notification_recipients(id, notification_id, user_id)
    ON DELETE RESTRICT
);

-- Trigger cập nhật updated_at tự động cho email_jobs
DROP TRIGGER IF EXISTS trg_email_jobs_updated_at ON public.email_jobs;
CREATE TRIGGER trg_email_jobs_updated_at
BEFORE UPDATE ON public.email_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 3. BẢNG PUBLIC.EMAIL_JOB_ATTEMPTS (LỊCH SỬ TỪNG LẦN THỬ GỬI)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.email_job_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_job_id UUID NOT NULL REFERENCES public.email_jobs(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    worker_id VARCHAR(100),
    lock_token UUID,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    error_code VARCHAR(100),
    error_message TEXT,
    provider_message_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_email_job_attempts_number CHECK (attempt_number >= 1),
    CONSTRAINT chk_email_job_attempts_status CHECK (
        status IN ('PROCESSING', 'SUCCESS', 'FAILED', 'UNKNOWN')
    ),
    -- Chống trùng số lần thử trong cùng một tác vụ
    CONSTRAINT uq_email_job_attempts_job_number UNIQUE (email_job_id, attempt_number),
    CONSTRAINT chk_email_job_attempts_metadata_security CHECK (
        jsonb_typeof(metadata) = 'object'
        AND NOT (metadata ? 'password')
        AND NOT (metadata ? 'token')
        AND NOT (metadata ? 'secret')
        AND NOT (metadata ? 'smtp_password')
        AND NOT (metadata ? 'apiKey')
        AND NOT (metadata ? 'api_key')
        AND NOT (metadata ? 'service_role_key')
        AND NOT (metadata ? 'authorization')
    )
);

-- ==============================================================================
-- 4. CHỈ MỤC HIỆU NĂNG (INDEXES)
-- ==============================================================================

-- 4.1. Khóa chống trùng duy nhất (Unique Idempotency Key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_jobs_idempotency_key 
ON public.email_jobs(idempotency_key);

-- 4.2. Chỉ mục hàng đợi tác vụ sẵn sàng xử lý (Worker Claim Queue)
CREATE INDEX IF NOT EXISTS idx_email_jobs_ready_queue 
ON public.email_jobs(next_attempt_at, priority DESC) 
WHERE status IN ('PENDING', 'RETRY_WAIT');

-- 4.3. Chỉ mục quét khóa quá hạn (Stale Locks Recovery)
CREATE INDEX IF NOT EXISTS idx_email_jobs_stale_locks 
ON public.email_jobs(locked_until) 
WHERE status = 'PROCESSING';

-- 4.4. Chỉ mục tra cứu theo đối tượng Lead
CREATE INDEX IF NOT EXISTS idx_email_jobs_lead_id 
ON public.email_jobs(lead_id) 
WHERE lead_id IS NOT NULL;

-- 4.5. Chỉ mục tra cứu theo đối tượng Notification Recipient
CREATE INDEX IF NOT EXISTS idx_email_jobs_notif_recipient 
ON public.email_jobs(notification_recipient_id) 
WHERE notification_recipient_id IS NOT NULL;

-- 4.6. Chỉ mục phân trang & giám sát trạng thái chung
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_created 
ON public.email_jobs(status, created_at DESC);

-- 4.7. Chỉ mục lịch sử attempts theo tác vụ
CREATE INDEX IF NOT EXISTS idx_email_job_attempts_job_id 
ON public.email_job_attempts(email_job_id, attempt_number DESC);

-- ==============================================================================
-- 5. CẤU HÌNH ROW LEVEL SECURITY & BẢO VỆ PHÂN QUYỀN
-- Thu hồi toàn bộ quyền đọc/ghi trực tiếp từ client (anon, authenticated)
-- Chỉ cấp quyền đầy đủ cho service_role dùng nội bộ phía backend.
-- ==============================================================================
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_job_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_jobs FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_jobs TO service_role;

REVOKE ALL ON TABLE public.email_job_attempts FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.email_job_attempts TO service_role;

-- ==============================================================================
-- 6. HÀM RPC NỘI BỘ HỖ TRỢ ENQUEUE NGUYÊN TỬ (OUTBOX ENQUEUE HELPER)
-- Dành cho C3.10B tích hợp cùng transaction đăng ký lead
-- ==============================================================================
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
    p_template_version VARCHAR DEFAULT 'v1',
    p_priority INT DEFAULT 100,
    p_initial_status VARCHAR DEFAULT 'PENDING',
    p_blocked_reason VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing RECORD;
    v_new_id UUID;
    v_clean_email VARCHAR;
BEGIN
    -- Làm sạch email
    v_clean_email := lower(trim(p_recipient_email));

    -- Kiểm tra bản ghi đã tồn tại theo idempotency_key
    SELECT id, email_type, recipient_email, lead_id, notification_recipient_id, status
    INTO v_existing
    FROM public.email_jobs
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        -- Kiểm tra xung đột dữ liệu nghiệp vụ: Cùng key nhưng khác email hoặc thực thể liên kết
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

        -- Đã tồn tại an toàn (Idempotent replay)
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'job_id', v_existing.id,
            'status', v_existing.status,
            'message', 'Tác vụ email đã tồn tại trước đó cho thực thể này.'
        );
    END IF;

    -- Tạo mới tác vụ
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
        p_template_version,
        p_payload,
        p_initial_status,
        p_priority,
        NOW(),
        p_blocked_reason
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'job_id', v_new_id,
        'status', p_initial_status
    );
END;
$$;

-- Phân quyền hàm fn_enqueue_email_job: Chỉ service_role
REVOKE ALL ON FUNCTION public.fn_enqueue_email_job FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_enqueue_email_job TO service_role;

-- ==============================================================================
-- 7. HÀM RPC NỘI BỘ HỖ TRỢ CLAIM TÁC VỤ CHO WORKER (DÀNH CHO C3.12A)
-- Sử dụng FOR UPDATE SKIP LOCKED nguyên tử, thu hồi stale locks
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_claim_email_jobs(
    p_worker_id VARCHAR,
    p_batch_size INT DEFAULT 10,
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
    -- 1. Thu hồi các tác vụ PROCESSING đã hết hạn khóa (stale locks do worker die/timeout)
    UPDATE public.email_jobs
    SET status = CASE WHEN attempt_count >= max_attempts THEN 'DEAD_LETTER' ELSE 'RETRY_WAIT' END,
        locked_by = NULL,
        locked_at = NULL,
        locked_until = NULL,
        lock_token = NULL,
        last_error_code = 'LOCK_TIMEOUT',
        last_error_message = 'Worker giữ khóa quá thời hạn mà không hoàn tất (Crashed or Network Timeout)',
        updated_at = v_now
    WHERE status = 'PROCESSING'
      AND locked_until < v_now;

    -- 2. Claim các tác vụ PENDING hoặc RETRY_WAIT đã đến hạn bằng FOR UPDATE SKIP LOCKED
    RETURN QUERY
    WITH candidate_jobs AS (
        SELECT id
        FROM public.email_jobs
        WHERE status IN ('PENDING', 'RETRY_WAIT')
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

-- Phân quyền hàm fn_claim_email_jobs: Chỉ service_role
REVOKE ALL ON FUNCTION public.fn_claim_email_jobs FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_jobs TO service_role;

-- ==============================================================================
-- 8. HÀM RPC NỘI BỘ HỖ TRỢ HOÀN TẤT TÁC VỤ (COMPLETE / RETRY / DEAD-LETTER)
-- Kiểm tra nghiêm ngặt lock_token và ghi nhận lịch sử vào email_job_attempts
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_complete_email_job(
    p_job_id UUID,
    p_lock_token UUID,
    p_status VARCHAR, -- 'SENT', 'RETRY_WAIT', 'DEAD_LETTER'
    p_provider_message_id VARCHAR DEFAULT NULL,
    p_error_code VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL,
    p_retry_delay_seconds INT DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_job RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_attempt_status VARCHAR;
BEGIN
    SELECT * INTO v_job
    FROM public.email_jobs
    WHERE id = p_job_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'JOB_NOT_FOUND');
    END IF;

    -- Kiểm tra tính hợp lệ của lock_token
    IF v_job.status <> 'PROCESSING' OR v_job.lock_token IS DISTINCT FROM p_lock_token THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'STALE_LOCK_OR_INVALID_TOKEN',
            'message', 'Khóa tác vụ đã hết hiệu lực hoặc bị worker khác thu hồi'
        );
    END IF;

    IF p_status = 'SENT' THEN
        UPDATE public.email_jobs
        SET status = 'SENT',
            sent_at = v_now,
            provider_message_id = p_provider_message_id,
            locked_by = NULL,
            locked_at = NULL,
            locked_until = NULL,
            lock_token = NULL,
            last_error_code = NULL,
            last_error_message = NULL,
            updated_at = v_now
        WHERE id = p_job_id;
        v_attempt_status := 'SUCCESS';
    ELSIF p_status = 'RETRY_WAIT' THEN
        UPDATE public.email_jobs
        SET status = CASE WHEN attempt_count >= max_attempts THEN 'DEAD_LETTER' ELSE 'RETRY_WAIT' END,
            next_attempt_at = v_now + (p_retry_delay_seconds || ' seconds')::INTERVAL,
            locked_by = NULL,
            locked_at = NULL,
            locked_until = NULL,
            lock_token = NULL,
            last_error_code = p_error_code,
            last_error_message = p_error_message,
            updated_at = v_now
        WHERE id = p_job_id;
        v_attempt_status := CASE
            WHEN p_error_code IN ('TIMEOUT', 'NETWORK_TIMEOUT', 'UNKNOWN_RESULT') THEN 'UNKNOWN'
            ELSE 'FAILED'
        END;
    ELSE
        UPDATE public.email_jobs
        SET status = p_status,
            locked_by = NULL,
            locked_at = NULL,
            locked_until = NULL,
            lock_token = NULL,
            last_error_code = p_error_code,
            last_error_message = p_error_message,
            updated_at = v_now
        WHERE id = p_job_id;
        v_attempt_status := 'FAILED';
    END IF;

    -- Ghi nhận lịch sử nỗ lực gửi vào email_job_attempts
    INSERT INTO public.email_job_attempts (
        email_job_id,
        attempt_number,
        worker_id,
        lock_token,
        finished_at,
        status,
        error_code,
        error_message,
        provider_message_id
    ) VALUES (
        p_job_id,
        v_job.attempt_count,
        v_job.locked_by,
        p_lock_token,
        v_now,
        v_attempt_status,
        p_error_code,
        p_error_message,
        p_provider_message_id
    );

    RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

-- Phân quyền hàm fn_complete_email_job: Chỉ service_role
REVOKE ALL ON FUNCTION public.fn_complete_email_job FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_complete_email_job TO service_role;
