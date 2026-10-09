-- ==============================================================================
-- MIGRATION: C3.6A - SỰ KIỆN HỒ SƠ CTV VÀ KHÁCH ĐĂNG KÝ MỚI (OUTBOX CONSUMER & TRIGGERS)
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- Mã file: /supabase/migrations/20261008000004_c3_profile_and_lead_notification_events.sql
-- Ngày: 08/10/2026
-- 
-- Mục đích:
--   1. Hoàn thiện bảng notification_events:
--      - Bổ sung cột next_attempt_at, locked_at, locked_by phục vụ lịch retry và worker claim.
--      - Chỉ mục idx_notification_events_queue_v2 tối ưu hàng đợi có lịch hẹn thử lại.
--   2. Tạo trigger nguyên tử ghi nhận sự kiện cùng transaction với nghiệp vụ:
--      - trg_audit_logs_notification_event: Tự động ghi sự kiện A1 (AFFILIATE_APPROVED,
--        AFFILIATE_REJECTED, AFFILIATE_SUSPENDED, AFFILIATE_REACTIVATED) dựa trên audit_logs.id.
--        Chống trùng lặp tuyệt đối, mỗi lần đổi trạng thái có audit_id riêng, không bị trùng key
--        khi một CTV bị tạm ngưng rồi kích hoạt lại rồi tạm ngưng lần nữa.
--      - trg_leads_notification_event: Tự động ghi sự kiện A3 (LEAD_SUBMITTED) khi lead mới
--        thực sự được chèn vào CSDL có mã CTV giới thiệu hợp lệ.
--   3. Nâng cấp fn_process_notification_event:
--      - Khắc phục lỗi rollback last_error: Exception handler ghi nhận lỗi vào notification_events
--        với trạng thái FAILED/DEAD_LETTER và next_attempt_at có backoff mà KHÔNG raise unhandled exception.
--      - Chuẩn hóa tiêu đề và đích đến nghiệp vụ thực tế:
--        * AFFILIATE_APPROVED -> "Hồ sơ CTV đã được duyệt" -> /portal
--        * AFFILIATE_REJECTED -> "Hồ sơ CTV chưa được duyệt" -> /pending
--        * AFFILIATE_SUSPENDED -> "Tài khoản CTV đã bị tạm ngưng" -> /pending
--        * AFFILIATE_REACTIVATED -> "Tài khoản CTV đã được kích hoạt lại" -> /portal
--        * LEAD_SUBMITTED -> "Khách mới đăng ký khóa học" -> /portal/leads
--      - Kiểm tra idempotency trên notifications: nếu thông báo đã tồn tại, hoàn thiện recipient
--        và đánh dấu PROCESSED, không tạo thông báo trùng lặp.
--   4. Cung cấp các RPC hỗ trợ Consumer:
--      - fn_claim_notification_events: Khóa và nhận batch sự kiện bằng FOR UPDATE SKIP LOCKED.
--      - fn_recover_stale_notification_events: Phục hồi các sự kiện bị kẹt PROCESSING quá hạn.
--   5. Thắt chặt phân quyền (Security Hardening):
--      - Thu hồi quyền EXECUTE của anon, authenticated đối với các helper sự kiện nội bộ.
--      - Chỉ cho phép service_role thực thi.
-- ==============================================================================

-- ==============================================================================
-- 1. BỔ SUNG CỘT VÀ CHỈ MỤC CHO PUBLIC.NOTIFICATION_EVENTS
-- ==============================================================================

ALTER TABLE public.notification_events
ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by VARCHAR(100);

-- Chỉ mục hàng đợi có điều kiện và lịch hẹn thử lại
DROP INDEX IF EXISTS idx_notification_events_queue_v2;
CREATE INDEX idx_notification_events_queue_v2
ON public.notification_events (status, next_attempt_at, created_at)
WHERE status IN ('PENDING', 'FAILED');

-- ==============================================================================
-- 2. TRIGGER NGUYÊN TỬ TẠO SỰ KIỆN A1 TỪ AUDIT_LOGS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_trg_audit_logs_notification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aff RECORD;
    v_idempotency_key TEXT;
    v_clean_reason TEXT;
BEGIN
    -- Chỉ xử lý các hành vi chuyển trạng thái CTV của phân hệ A1
    IF NEW.entity_name = 'affiliate_profiles' AND NEW.action IN (
        'AFFILIATE_APPROVED',
        'AFFILIATE_REJECTED',
        'AFFILIATE_SUSPENDED',
        'AFFILIATE_REACTIVATED'
    ) THEN
        -- Tra cứu thông tin hồ sơ CTV tương ứng
        SELECT id, user_id, affiliate_code, status
        INTO v_aff
        FROM public.affiliate_profiles
        WHERE id = NEW.entity_id;

        -- Người nhận bắt buộc phải là user_id của chính CTV đó
        IF v_aff.user_id IS NOT NULL THEN
            -- Tạo khóa chống trùng lặp theo ID của nhật ký kiểm toán (Mỗi lần chuyển trạng thái có 1 audit_id riêng)
            v_idempotency_key := 'evt:' || NEW.action || ':' || NEW.id::text;
            v_clean_reason := COALESCE(NEW.reason, NEW.new_values->>'review_note', NEW.new_values->>'suspension_reason', NEW.new_values->>'reactivation_note');

            INSERT INTO public.notification_events (
                event_type,
                source_entity_type,
                source_entity_id,
                transition_state,
                idempotency_key,
                recipient_user_id,
                payload,
                status,
                retry_count,
                next_attempt_at
            ) VALUES (
                NEW.action,
                'affiliate_profiles',
                NEW.entity_id,
                COALESCE(NEW.new_values->>'status', NEW.action),
                v_idempotency_key,
                v_aff.user_id,
                jsonb_build_object(
                    'audit_log_id', NEW.id,
                    'affiliate_id', NEW.entity_id,
                    'affiliate_code', v_aff.affiliate_code,
                    'status', COALESCE(NEW.new_values->>'status', v_aff.status),
                    'reason', v_clean_reason,
                    'actor_id', NEW.actor_id,
                    'created_at', NEW.created_at
                ),
                'PENDING',
                0,
                NOW()
            )
            ON CONFLICT (idempotency_key) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_notification_event ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_notification_event
AFTER INSERT ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_audit_logs_notification_event();

-- ==============================================================================
-- 3. TRIGGER NGUYÊN TỬ TẠO SỰ KIỆN A3 TỪ LEADS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_trg_leads_notification_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aff RECORD;
    v_course_title TEXT;
    v_idempotency_key TEXT;
BEGIN
    -- Chỉ phát sinh sự kiện khi lead mới được tạo và có mã người giới thiệu CTV
    IF NEW.affiliate_id IS NOT NULL THEN
        -- Tra cứu CTV sở hữu mã giới thiệu
        SELECT ap.id, ap.user_id, ap.affiliate_code, ap.status
        INTO v_aff
        FROM public.affiliate_profiles ap
        JOIN public.profiles p ON p.id = ap.user_id
        WHERE ap.id = NEW.affiliate_id AND p.is_active = TRUE;

        IF v_aff.user_id IS NOT NULL THEN
            -- Lấy tên khóa học hiển thị (nếu có)
            IF NEW.course_id IS NOT NULL THEN
                SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
            END IF;

            v_idempotency_key := 'evt:LEAD_SUBMITTED:' || NEW.id::text;

            INSERT INTO public.notification_events (
                event_type,
                source_entity_type,
                source_entity_id,
                transition_state,
                idempotency_key,
                recipient_user_id,
                payload,
                status,
                retry_count,
                next_attempt_at
            ) VALUES (
                'LEAD_SUBMITTED',
                'leads',
                NEW.id,
                'NEW',
                v_idempotency_key,
                v_aff.user_id,
                jsonb_build_object(
                    'lead_id', NEW.id,
                    'lead_name', NEW.full_name,
                    'course_id', NEW.course_id,
                    'course_name', COALESCE(v_course_title, 'Khóa học STHC'),
                    'affiliate_code', v_aff.affiliate_code,
                    'created_at', NEW.created_at
                ),
                'PENDING',
                0,
                NOW()
            )
            ON CONFLICT (idempotency_key) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_notification_event ON public.leads;
CREATE TRIGGER trg_leads_notification_event
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_leads_notification_event();

-- ==============================================================================
-- 4. NÂNG CẤP HÀM XỬ LÝ SỰ KIỆN HÀNG ĐỢI (FN_PROCESS_NOTIFICATION_EVENT)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_process_notification_event(
    p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_title VARCHAR(255);
    v_summary TEXT;
    v_content TEXT;
    v_action_url VARCHAR(255);
    v_category VARCHAR(50);
    v_notification_id UUID;
    v_existing_notif_id UUID;
    v_dispatch_res JSONB;
    v_error_msg TEXT;
    v_next_retry TIMESTAMPTZ;
BEGIN
    -- 1. Khóa và đọc bản ghi sự kiện
    SELECT * INTO v_event
    FROM public.notification_events
    WHERE id = p_event_id
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'event_id', p_event_id,
            'error', 'NOT_FOUND: Không tìm thấy sự kiện với ID chỉ định.'
        );
    END IF;

    -- Nếu sự kiện đã hoàn tất, không xử lý lại
    IF v_event.status = 'PROCESSED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'event_id', p_event_id,
            'status', 'PROCESSED',
            'notification_id', v_event.notification_id,
            'message', 'Sự kiện đã được xử lý thành công trước đó (idempotent).'
        );
    END IF;

    -- Đánh dấu đang xử lý
    UPDATE public.notification_events
    SET status = 'PROCESSING',
        locked_at = NOW(),
        updated_at = NOW()
    WHERE id = p_event_id;

    -- 2. Thực thi tạo thông báo bên trong khối bảo vệ lỗi (Safe Savepoint)
    BEGIN
        -- 2.1 Sinh nội dung chuẩn nghiệp vụ (C3.6A)
        CASE v_event.event_type
            WHEN 'AFFILIATE_APPROVED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Hồ sơ CTV đã được duyệt';
                v_summary := format('Chúc mừng! Hồ sơ CTV %s của bạn đã được phê duyệt.', COALESCE(v_event.payload->>'affiliate_code', ''));
                v_content := format('Chúc mừng bạn! Hồ sơ cộng tác viên tuyển sinh %s đã được Ban Quản trị phê duyệt chính thức. Bạn có thể bắt đầu sử dụng mã giới thiệu và đường dẫn tuyển sinh để tiếp cận học viên và nhận thù lao tuyển sinh.', COALESCE(v_event.payload->>'affiliate_code', ''));
                v_action_url := '/portal';

            WHEN 'AFFILIATE_REJECTED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Hồ sơ CTV chưa được duyệt';
                v_summary := format('Hồ sơ đăng ký cộng tác viên tuyển sinh chưa được phê duyệt. Lý do: %s', COALESCE(v_event.payload->>'reason', 'Thông tin hồ sơ chưa đáp ứng yêu cầu'));
                v_content := format('Hồ sơ đăng ký cộng tác viên của bạn chưa được duyệt. Lý do: %s. Vui lòng kiểm tra lại thông tin hồ sơ và bổ sung theo hướng dẫn.', COALESCE(v_event.payload->>'reason', 'Thông tin hồ sơ chưa đáp ứng yêu cầu'));
                v_action_url := '/pending';

            WHEN 'AFFILIATE_SUSPENDED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Tài khoản CTV đã bị tạm ngưng';
                v_summary := format('Tài khoản cộng tác viên của bạn đã bị tạm dừng hoạt động. Lý do: %s. Vui lòng liên hệ hỗ trợ.', COALESCE(v_event.payload->>'reason', 'Theo quy định vận hành tuyển sinh'));
                v_content := format('Tài khoản cộng tác viên tuyển sinh của bạn đã bị tạm dừng hoạt động. Lý do: %s. Mọi thắc mắc hoặc yêu cầu hỗ trợ vui lòng liên hệ Ban Quản trị để được giải đáp.', COALESCE(v_event.payload->>'reason', 'Theo quy định vận hành tuyển sinh'));
                v_action_url := '/pending';

            WHEN 'AFFILIATE_REACTIVATED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Tài khoản CTV đã được kích hoạt lại';
                v_summary := 'Tài khoản cộng tác viên của bạn đã được kích hoạt lại và có thể tiếp tục hoạt động.';
                v_content := 'Tài khoản cộng tác viên tuyển sinh của bạn đã được mở khóa và kích hoạt lại thành công. Bạn có thể tiếp tục các hoạt động giới thiệu tuyển sinh bình thường.';
                v_action_url := '/portal';

            WHEN 'LEAD_SUBMITTED' THEN
                v_category := 'LEAD';
                v_title := 'Có khách hàng mới đăng ký qua link giới thiệu';
                v_summary := format('Khách hàng %s đã đăng ký khóa học %s qua mã giới thiệu của bạn.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'course_name', 'STHC'));
                v_content := format('Chúc mừng bạn! Khách hàng %s đã đăng ký tham gia khóa học %s qua đường dẫn giới thiệu của bạn. Đội ngũ tư vấn tuyển sinh STHC sẽ sớm liên hệ hỗ trợ người học.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'course_name', 'STHC'));
                v_action_url := '/portal/leads';

            ELSE
                v_category := 'GENERAL';
                v_title := COALESCE(v_event.payload->>'title', 'Thông báo biến động hệ thống');
                v_summary := v_event.payload->>'summary';
                v_content := COALESCE(v_event.payload->>'message', 'Hệ thống STHC vừa ghi nhận biến động mới liên quan đến hoạt động của bạn.');
                v_action_url := COALESCE(v_event.payload->>'action_url', '/portal');
        END CASE;

        -- 2.2 Kiểm tra nếu thông báo với idempotency_key này đã được tạo trước đó
        SELECT id INTO v_existing_notif_id
        FROM public.notifications
        WHERE idempotency_key = v_event.idempotency_key;

        IF v_existing_notif_id IS NOT NULL THEN
            v_notification_id := v_existing_notif_id;
        ELSE
            -- 2.3 Tạo bản ghi trong public.notifications
            INSERT INTO public.notifications (
                type,
                category,
                title,
                summary,
                content,
                action_url,
                recipient_scope,
                status,
                published_at,
                event_type,
                source_entity_type,
                source_entity_id,
                idempotency_key,
                metadata
            ) VALUES (
                'SYSTEM',
                v_category,
                v_title,
                v_summary,
                v_content,
                v_action_url,
                'SPECIFIC',
                'PUBLISHED',
                NOW(),
                v_event.event_type,
                v_event.source_entity_type,
                v_event.source_entity_id,
                v_event.idempotency_key,
                v_event.payload
            )
            RETURNING id INTO v_notification_id;
        END IF;

        -- 2.4 Phân phối tới hộp thư cá nhân của CTV (Đảm bảo người nhận tồn tại)
        IF v_event.recipient_user_id IS NOT NULL THEN
            INSERT INTO public.notification_recipients (notification_id, user_id)
            VALUES (v_notification_id, v_event.recipient_user_id)
            ON CONFLICT (notification_id, user_id) DO NOTHING;
        END IF;

        -- 2.5 Đánh dấu sự kiện hoàn tất (PROCESSED)
        UPDATE public.notification_events
        SET status = 'PROCESSED',
            notification_id = v_notification_id,
            processed_at = NOW(),
            last_error = NULL,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = p_event_id;

        RETURN jsonb_build_object(
            'success', true,
            'event_id', p_event_id,
            'status', 'PROCESSED',
            'notification_id', v_notification_id,
            'message', 'Đã xử lý sự kiện và tạo thông báo thành công.'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Minh bạch lỗi, tính toán thời điểm retry có exponential backoff
        v_error_msg := SQLERRM;
        v_next_retry := NOW() + (POWER(2, LEAST(v_event.retry_count + 1, 8)) * INTERVAL '15 seconds');

        UPDATE public.notification_events
        SET retry_count = retry_count + 1,
            last_error = v_error_msg,
            status = CASE WHEN retry_count + 1 >= max_retries THEN 'DEAD_LETTER' ELSE 'FAILED' END,
            next_attempt_at = v_next_retry,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
        WHERE id = p_event_id;

        -- Trả về phản hồi lỗi có cấu trúc mà KHÔNG làm rollback bản ghi lỗi vừa ghi
        RETURN jsonb_build_object(
            'success', false,
            'event_id', p_event_id,
            'error', v_error_msg,
            'retry_count', v_event.retry_count + 1,
            'status', CASE WHEN v_event.retry_count + 1 >= v_event.max_retries THEN 'DEAD_LETTER' ELSE 'FAILED' END,
            'next_attempt_at', v_next_retry
        );
    END;
END;
$$;

-- ==============================================================================
-- 5. CÁC HÀM HỖ TRỢ CONSUMER (CLAIM BATCH & RECOVER STALE LOCKS)
-- ==============================================================================

-- 5.1 Hàm phục hồi các sự kiện bị kẹt PROCESSING quá hạn (Crash recovery)
CREATE OR REPLACE FUNCTION public.fn_recover_stale_notification_events(
    p_stale_minutes INT DEFAULT 5
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recovered_count INT := 0;
BEGIN
    UPDATE public.notification_events
    SET status = 'PENDING',
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
    WHERE status = 'PROCESSING'
      AND (locked_at IS NULL OR locked_at < NOW() - (p_stale_minutes || ' minutes')::INTERVAL);

    GET DIAGNOSTICS v_recovered_count = ROW_COUNT;
    RETURN v_recovered_count;
END;
$$;

-- 5.2 Hàm nhận batch sự kiện cần xử lý với FOR UPDATE SKIP LOCKED
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
        SELECT id
        FROM public.notification_events
        WHERE status IN ('PENDING', 'FAILED')
          AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
          AND retry_count < max_retries
          AND event_type IN (
              'AFFILIATE_APPROVED',
              'AFFILIATE_REJECTED',
              'AFFILIATE_SUSPENDED',
              'AFFILIATE_REACTIVATED',
              'LEAD_SUBMITTED'
          )
        ORDER BY created_at ASC
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

-- ==============================================================================
-- 6. BẢO MẬT VÀ PHÂN QUYỀN (SECURITY HARDENING)
-- ==============================================================================

-- Thu hồi quyền gọi trực tiếp của anon và authenticated đối với các hàm xử lý nội bộ
REVOKE ALL ON FUNCTION public.fn_create_notification_event(TEXT, TEXT, UUID, TEXT, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_notification_event(TEXT, TEXT, UUID, TEXT, UUID, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.fn_process_notification_event(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_process_notification_event(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.fn_claim_notification_events(INT, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_notification_events(INT, VARCHAR) TO service_role;

REVOKE ALL ON FUNCTION public.fn_recover_stale_notification_events(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_recover_stale_notification_events(INT) TO service_role;
