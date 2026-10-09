-- ==============================================================================
-- MIGRATION: 20261009000005_c3_email_worker_claim_filter.sql
-- MÔ TẢ: Cập nhật hàm RPC fn_claim_email_jobs để CHỈ claim các tác vụ email loại
--        'LEAD_REGISTRATION_CONFIRMATION' (Phục vụ C3.12A - Worker Email Lead).
--        Loại bỏ CTV_NOTIFICATION_EMAIL (dành riêng cho C3.13A).
-- PHÂN HỆ: Hàng đợi Email & Worker (C3 / C3.12A)
-- ==============================================================================

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

    -- 2. Claim các tác vụ PENDING hoặc RETRY_WAIT đã đến hạn VÀ CHỈ LÀ LEAD_REGISTRATION_CONFIRMATION
    RETURN QUERY
    WITH candidate_jobs AS (
        SELECT id
        FROM public.email_jobs
        WHERE email_type = 'LEAD_REGISTRATION_CONFIRMATION'
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

-- Phân quyền hàm fn_claim_email_jobs: Chỉ service_role
REVOKE ALL ON FUNCTION public.fn_claim_email_jobs FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_jobs TO service_role;
