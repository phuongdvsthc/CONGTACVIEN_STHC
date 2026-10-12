-- ==============================================================================
-- MIGRATION: 20261012000001_fix_fn_claim_email_jobs_ambiguous_column.sql
-- MÔ TẢ: Khắc phục lỗi PostgreSQL 42702 (column reference "attempt_count" is ambiguous)
--        trong hàm RPC public.fn_claim_email_jobs bằng chỉ thị #variable_conflict use_column
--        và định danh bảng tường minh (explicit table qualification).
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
                  j.template_code, j.template_version, j.payload, j.attempt_count, j.max_attempts
    )
    SELECT * FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_email_jobs FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.fn_claim_email_jobs TO service_role;
