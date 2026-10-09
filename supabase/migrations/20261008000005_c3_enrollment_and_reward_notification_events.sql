-- ==============================================================================
-- MIGRATION: C3.6B - Sự kiện nhập học (A4) và thù lao (A5)
-- Tích hợp vào hệ thống notification_events và notifications
-- ==============================================================================

-- 1. Cập nhật hàm fn_claim_notification_events để hỗ trợ toàn bộ 5 sự kiện C3.6B
CREATE OR REPLACE FUNCTION public.fn_claim_notification_events(
    p_batch_size INT DEFAULT 10,
    p_worker_id VARCHAR(100) DEFAULT 'worker-default'
)
RETURNS TABLE (
    event_id UUID,
    event_type VARCHAR(50),
    idempotency_key VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Phục hồi các task bị treo trước khi nhận batch mới
    PERFORM public.fn_recover_stale_notification_events(5);

    RETURN QUERY
    WITH claimable AS (
        SELECT ne.id
        FROM public.notification_events ne
        WHERE ne.status IN ('PENDING', 'FAILED')
          AND (ne.next_attempt_at IS NULL OR ne.next_attempt_at <= NOW())
          AND ne.retry_count < ne.max_retries
          AND ne.event_type IN (
              'AFFILIATE_APPROVED',
              'AFFILIATE_REJECTED',
              'AFFILIATE_SUSPENDED',
              'AFFILIATE_REACTIVATED',
              'LEAD_SUBMITTED',
              'ENROLLMENT_MATCHED',
              'ENROLLMENT_VOIDED',
              'REWARD_APPROVED',
              'REWARD_REJECTED',
              'REWARD_VOIDED'
          )
        ORDER BY ne.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.notification_events e
    SET status = 'PROCESSING',
        locked_at = NOW(),
        locked_by = p_worker_id,
        updated_at = NOW()
    FROM claimable
    WHERE e.id = claimable.id
    RETURNING e.id, e.event_type, e.idempotency_key;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_notification_events(INT, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_notification_events(INT, VARCHAR) TO service_role;
