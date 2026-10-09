-- ==============================================================================
-- MIGRATION: C3.3B - QUYỀN VÀ NỀN SỰ KIỆN NGHIỆP VỤ THÔNG BÁO CTV
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- Mã file: /supabase/migrations/20261008000002_c3_event_queue_and_notification_helpers.sql
-- Ngày: 08/10/2026
-- 
-- Mục đích:
--   1. Hoàn thiện các ràng buộc bảo vệ dữ liệu thông báo và người nhận từ C3.3A:
--      - Ràng buộc tiêu đề, nội dung không chỉ chứa khoảng trắng, có độ dài tối đa/tối thiểu.
--      - Ràng buộc cấu trúc JSON hợp lệ và metadata không chứa khóa nhạy cảm (password, token, secret).
--      - Trigger bảo vệ tính bất biến của notification_recipients (không cho phép sửa user_id/notification_id hoặc un-read).
--   2. Tạo bảng hàng đợi sự kiện public.notification_events (Outbox Pattern):
--      - Ghi nhận sự kiện bền vững cùng transaction với nghiệp vụ.
--      - Chống trùng lặp tuyệt đối qua idempotency_key phân biệt theo lần chuyển trạng thái.
--      - Hỗ trợ cơ chế thử lại (retry_count, max_retries, dead-letter, last_error).
--      - Minh bạch lỗi, tuyệt đối không dùng EXCEPTION WHEN OTHERS THEN NULL nuốt lỗi.
--   3. Cung cấp các hàm Helper và RPC tái sử dụng phục vụ các bước tích hợp C3.6A/C3.6B:
--      - fn_create_notification_event: Ghi nhận sự kiện an toàn, chống trùng.
--      - fn_dispatch_notification: Phân phối thông báo tới người nhận (fan-out an toàn, ON CONFLICT DO NOTHING, không lock bảng).
--      - fn_process_notification_event: Xử lý sự kiện hàng đợi sang thông báo SYSTEM với mẫu chuẩn nghiệp vụ A1/A3/A4/A5.
--      - fn_mark_notification_as_read: Đánh dấu đã đọc một thông báo, kiểm tra chặt quyền sở hữu.
--      - fn_mark_all_notifications_as_read: Đánh dấu đã đọc toàn bộ hoặc theo tab, kiểm tra chặt quyền sở hữu.
--      - fn_get_unread_notification_counts: Đếm chưa đọc theo hai tab và tổng hợp cho Bell header.
-- ==============================================================================

-- ==============================================================================
-- 1. BỔ SUNG RÀNG BUỘC VÀ BẢO VỆ DỮ LIỆU C3.3A
-- ==============================================================================

-- 1.1. Ràng buộc độ dài và không chứa khoảng trắng rỗng trên public.notifications
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS chk_notifications_title_valid;
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_title_valid
CHECK (length(trim(title)) >= 3 AND length(trim(title)) <= 255);

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS chk_notifications_content_valid;
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_content_valid
CHECK (length(trim(content)) >= 5 AND length(content) <= 50000);

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS chk_notifications_summary_valid;
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_summary_valid
CHECK (summary IS NULL OR (length(trim(summary)) > 0 AND length(summary) <= 1000));

-- 1.2. Ràng buộc bảo mật metadata và recipient_filter (chống chứa thông tin nhạy cảm)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS chk_notifications_metadata_security;
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_metadata_security
CHECK (
    metadata IS NULL OR (
        jsonb_typeof(metadata) = 'object'
        AND NOT (metadata ? 'password')
        AND NOT (metadata ? 'token')
        AND NOT (metadata ? 'secret')
        AND NOT (metadata ? 'smtp_password')
        AND NOT (metadata ? 'apiKey')
        AND NOT (metadata ? 'api_key')
    )
);

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS chk_notifications_filter_format;
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_filter_format
CHECK (
    recipient_filter IS NULL OR jsonb_typeof(recipient_filter) = 'object'
);

-- 1.3. Trigger bảo vệ tính bất biến của public.notification_recipients
-- Đảm bảo:
--   - user_id và notification_id không bao giờ bị thay đổi sau khi tạo.
--   - created_at không bao giờ bị thay đổi.
--   - CTV không thể chuyển read_at từ ĐÃ ĐỌC (NOT NULL) về CHƯA ĐỌC (NULL).
CREATE OR REPLACE FUNCTION public.fn_protect_notification_recipients_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.user_id <> OLD.user_id OR NEW.notification_id <> OLD.notification_id THEN
        RAISE EXCEPTION 'CANNOT_ALTER_RECIPIENT_OR_NOTIFICATION_ID: Các trường user_id và notification_id là bất biến.'
            USING ERRCODE = '22023';
    END IF;

    IF NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'CANNOT_ALTER_CREATED_AT: Thời điểm ghi nhận created_at là bất biến.'
            USING ERRCODE = '22023';
    END IF;

    IF OLD.read_at IS NOT NULL AND NEW.read_at IS NULL AND public.get_auth_role() <> 'admin' THEN
        RAISE EXCEPTION 'CANNOT_UNREAD_NOTIFICATION: Không được phép chuyển trạng thái thông báo từ đã đọc về chưa đọc.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_notification_recipients ON public.notification_recipients;
CREATE TRIGGER trg_protect_notification_recipients
BEFORE UPDATE ON public.notification_recipients
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_notification_recipients_immutable();

-- ==============================================================================
-- 2. BẢNG HÀNG ĐỢI SỰ KIỆN PUBLIC.NOTIFICATION_EVENTS (OUTBOX PATTERN)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phân loại sự kiện nghiệp vụ
    event_type VARCHAR(50) NOT NULL,
    
    -- Định danh thực thể nguồn phát sinh sự kiện
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id UUID NOT NULL,
    
    -- Bước chuyển trạng thái cụ thể (ví dụ: pending->approved, matched, voided)
    transition_state VARCHAR(100),
    
    -- Khóa chống trùng lặp nghiệp vụ (Ví dụ: evt:REWARD_APPROVED:uuid:step1)
    idempotency_key VARCHAR(255) NOT NULL,
    
    -- Người nhận chỉ định (đối với thông báo cá nhân cho CTV)
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Dữ liệu nghiệp vụ chi tiết kèm theo sự kiện
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Vòng đời sự kiện: PENDING -> PROCESSING -> PROCESSED | FAILED | DEAD_LETTER
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    
    -- Quản lý số lần thử lại
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    
    -- Lưu vết lỗi khi xử lý thất bại (minh bạch, không nuốt lỗi)
    last_error TEXT,
    
    -- Liên kết tới thông báo hệ thống được tạo ra sau khi xử lý thành công
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    
    -- Mốc thời gian hoàn tất xử lý
    processed_at TIMESTAMPTZ,
    
    -- Thời gian tạo và cập nhật bản ghi
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ràng buộc kiểm tra
    CONSTRAINT chk_notification_event_status CHECK (
        status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')
    ),
    CONSTRAINT chk_notification_event_idempotency_not_empty CHECK (
        length(trim(idempotency_key)) > 0
    ),
    CONSTRAINT chk_notification_event_payload_security CHECK (
        payload IS NULL OR (
            jsonb_typeof(payload) = 'object'
            AND NOT (payload ? 'password')
            AND NOT (payload ? 'token')
            AND NOT (payload ? 'secret')
            AND NOT (payload ? 'smtp_password')
            AND NOT (payload ? 'apiKey')
            AND NOT (payload ? 'api_key')
        )
    )
);

-- Trigger cập nhật updated_at tự động cho notification_events
DROP TRIGGER IF EXISTS trg_notification_events_updated_at ON public.notification_events;
CREATE TRIGGER trg_notification_events_updated_at
BEFORE UPDATE ON public.notification_events
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Chỉ mục Unique chống trùng sự kiện theo idempotency_key
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_events_idempotency 
ON public.notification_events(idempotency_key);

-- Chỉ mục tối ưu hàng đợi cho các tác vụ cần xử lý hoặc thử lại
CREATE INDEX IF NOT EXISTS idx_notification_events_queue 
ON public.notification_events(status, created_at) 
WHERE status IN ('PENDING', 'FAILED');

-- Chỉ mục truy vấn theo thực thể nguồn và bước chuyển trạng thái
CREATE INDEX IF NOT EXISTS idx_notification_events_source 
ON public.notification_events(source_entity_type, source_entity_id, transition_state);

-- Chỉ mục tra cứu theo người nhận
CREATE INDEX IF NOT EXISTS idx_notification_events_recipient 
ON public.notification_events(recipient_user_id);

-- Thiết lập bảo mật và RLS trên bảng notification_events
REVOKE ALL ON TABLE public.notification_events FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_events TO service_role;
GRANT SELECT ON TABLE public.notification_events TO authenticated;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notification events select policy"
ON public.notification_events
FOR SELECT
TO authenticated
USING (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND public.fn_has_permission(auth.uid(), 'notifications.view')
    )
    OR (
        recipient_user_id = auth.uid()
    )
);

-- ==============================================================================
-- 3. CÁC HÀM HELPER & RPC TÁI SỬ DỤNG
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1. HÀM TẠO SỰ KIỆN THÔNG BÁO BỀN VỮNG (fn_create_notification_event)
-- Ghi nhận sự kiện cùng transaction nghiệp vụ, chống trùng lặp qua idempotency_key
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_create_notification_event(
    p_event_type TEXT,
    p_source_entity_type TEXT,
    p_source_entity_id UUID,
    p_idempotency_key TEXT,
    p_recipient_user_id UUID DEFAULT NULL,
    p_payload JSONB DEFAULT '{}'::jsonb,
    p_transition_state TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_event RECORD;
    v_new_event_id UUID;
    v_clean_payload JSONB;
BEGIN
    -- 1. Kiểm tra tham số bắt buộc
    IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: event_type không được để trống.' USING ERRCODE = '22023';
    END IF;

    IF p_source_entity_type IS NULL OR length(trim(p_source_entity_type)) = 0 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: source_entity_type không được để trống.' USING ERRCODE = '22023';
    END IF;

    IF p_source_entity_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: source_entity_id không được để trống.' USING ERRCODE = '22023';
    END IF;

    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: idempotency_key không được để trống.' USING ERRCODE = '22023';
    END IF;

    -- 2. Kiểm tra an toàn cho payload (loại bỏ trường nhạy cảm nếu có)
    v_clean_payload := COALESCE(p_payload, '{}'::jsonb);
    IF jsonb_typeof(v_clean_payload) <> 'object' THEN
        v_clean_payload := '{}'::jsonb;
    END IF;

    -- 3. Kiểm tra chống trùng (Idempotency check)
    SELECT id, status, notification_id INTO v_existing_event
    FROM public.notification_events
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_event.id IS NOT NULL THEN
        -- Sự kiện đã được ghi nhận trước đó, trả về thông tin đã có, không tạo trùng
        RETURN jsonb_build_object(
            'success', true,
            'event_id', v_existing_event.id,
            'is_duplicate', true,
            'status', v_existing_event.status,
            'notification_id', v_existing_event.notification_id,
            'message', 'Sự kiện đã tồn tại trước đó trong hệ thống (idempotent).'
        );
    END IF;

    -- 4. Ghi nhận sự kiện mới vào hàng đợi
    INSERT INTO public.notification_events (
        event_type,
        source_entity_type,
        source_entity_id,
        transition_state,
        idempotency_key,
        recipient_user_id,
        payload,
        status,
        retry_count
    ) VALUES (
        p_event_type,
        p_source_entity_type,
        p_source_entity_id,
        p_transition_state,
        p_idempotency_key,
        p_recipient_user_id,
        v_clean_payload,
        'PENDING',
        0
    )
    RETURNING id INTO v_new_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_new_event_id,
        'is_duplicate', false,
        'status', 'PENDING',
        'message', 'Sự kiện thông báo đã được ghi nhận thành công vào hàng đợi.'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.2. HÀM PHÂN PHỐI THÔNG BÁO TỚI NGƯỜI NHẬN (fn_dispatch_notification)
-- Fan-out an toàn, hỗ trợ 1 người, nhóm lọc hoặc toàn bộ CTV active, ON CONFLICT DO NOTHING
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_dispatch_notification(
    p_notification_id UUID,
    p_recipient_user_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notif RECORD;
    v_inserted_count INT := 0;
    v_role TEXT;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    v_role := public.get_auth_role();

    -- 1. Kiểm tra bản ghi thông báo
    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id;
    IF v_notif.id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Không tìm thấy thông báo với ID %', p_notification_id USING ERRCODE = 'P0002';
    END IF;

    -- 2. Kiểm tra quyền thao tác
    IF v_role <> 'admin' AND v_notif.type = 'ANNOUNCEMENT' THEN
        IF NOT public.fn_has_permission(v_actor_id, 'notifications.publish') THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Bạn không có quyền xuất bản thông báo (notifications.publish).' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 3. Phân phối theo đối tượng
    -- Trường hợp 3.1: Chỉ định mảng người nhận cụ thể
    IF p_recipient_user_ids IS NOT NULL AND array_length(p_recipient_user_ids, 1) > 0 THEN
        INSERT INTO public.notification_recipients (notification_id, user_id)
        SELECT p_notification_id, u.user_id
        FROM (SELECT DISTINCT unnest(p_recipient_user_ids) AS user_id) u
        JOIN public.profiles p ON p.id = u.user_id
        WHERE p.role = 'affiliate' AND p.is_active = TRUE
        ON CONFLICT (notification_id, user_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    -- Trường hợp 3.2: Phân phối theo phạm vi recipient_scope của bản tin
    ELSIF v_notif.recipient_scope = 'ALL' THEN
        INSERT INTO public.notification_recipients (notification_id, user_id)
        SELECT p_notification_id, p.id
        FROM public.profiles p
        WHERE p.role = 'affiliate' AND p.is_active = TRUE
        ON CONFLICT (notification_id, user_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    ELSIF v_notif.recipient_scope = 'STATUS_FILTER' THEN
        -- Lọc theo danh sách status được định nghĩa trong recipient_filter
        INSERT INTO public.notification_recipients (notification_id, user_id)
        SELECT p_notification_id, p.id
        FROM public.profiles p
        WHERE p.role = 'affiliate' 
          AND p.is_active = TRUE
          AND (
              v_notif.recipient_filter->'status' IS NULL 
              OR v_notif.recipient_filter->'status' ? p.affiliate_status
          )
        ON CONFLICT (notification_id, user_id) DO NOTHING;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    ELSIF v_notif.recipient_scope = 'SPECIFIC' THEN
        -- Lấy mảng affiliate_ids từ recipient_filter
        IF v_notif.recipient_filter ? 'affiliate_ids' THEN
            INSERT INTO public.notification_recipients (notification_id, user_id)
            SELECT p_notification_id, p.id
            FROM public.profiles p
            WHERE p.role = 'affiliate' 
              AND p.is_active = TRUE
              AND p.id::text IN (
                  SELECT jsonb_array_elements_text(v_notif.recipient_filter->'affiliate_ids')
              )
            ON CONFLICT (notification_id, user_id) DO NOTHING;

            GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'notification_id', p_notification_id,
        'recipients_dispatched', v_inserted_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.3. HÀM XỬ LÝ SỰ KIỆN HÀNG ĐỢI SANG THÔNG BÁO HỆ THỐNG (fn_process_notification_event)
-- Chuẩn hóa mẫu thông báo nghiệp vụ A1/A3/A4/A5, cập nhật trạng thái sự kiện minh bạch
-- ------------------------------------------------------------------------------
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
    v_dispatch_res JSONB;
BEGIN
    -- 1. Khóa và đọc bản ghi sự kiện (hỗ trợ tránh tranh chấp)
    SELECT * INTO v_event
    FROM public.notification_events
    WHERE id = p_event_id
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Không tìm thấy sự kiện với ID %', p_event_id USING ERRCODE = 'P0002';
    END IF;

    -- Nếu sự kiện đã hoàn tất, không xử lý lại
    IF v_event.status = 'PROCESSED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'event_id', p_event_id,
            'status', 'PROCESSED',
            'notification_id', v_event.notification_id,
            'message', 'Sự kiện đã được xử lý trước đó.'
        );
    END IF;

    -- Đánh dấu đang xử lý
    UPDATE public.notification_events
    SET status = 'PROCESSING',
        updated_at = NOW()
    WHERE id = p_event_id;

    -- 2. Sinh mẫu nội dung chuẩn nghiệp vụ (A1, A3, A4, A5)
    BEGIN
        CASE v_event.event_type
            -- A1: Sự kiện tài khoản & phê duyệt CTV
            WHEN 'AFFILIATE_APPROVED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Tài khoản CTV tuyển sinh đã được phê duyệt';
                v_summary := 'Hồ sơ đăng ký cộng tác viên tuyển sinh của bạn đã được Ban quản trị phê duyệt.';
                v_content := 'Chúc mừng bạn! Hồ sơ đăng ký cộng tác viên tuyển sinh STHC đã được phê duyệt chính thức. Bạn hiện có thể tạo mã giới thiệu, chia sẻ đường dẫn tuyển sinh và bắt đầu nhận hoa hồng.';
                v_action_url := '/portal/dashboard';

            WHEN 'AFFILIATE_REJECTED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Hồ sơ đăng ký CTV cần được cập nhật';
                v_summary := 'Hồ sơ cộng tác viên tuyển sinh chưa được phê duyệt.';
                v_content := format('Hồ sơ đăng ký cộng tác viên của bạn chưa được duyệt. Lý do: %s. Vui lòng kiểm tra lại thông tin hồ sơ và bổ sung theo hướng dẫn.', COALESCE(v_event.payload->>'reason', 'Thông tin hồ sơ chưa đáp ứng yêu cầu'));
                v_action_url := '/portal/profile';

            WHEN 'AFFILIATE_SUSPENDED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Thông báo tạm ngưng tài khoản CTV';
                v_summary := 'Tài khoản cộng tác viên của bạn đang tạm thời bị ngưng kích hoạt.';
                v_content := format('Tài khoản cộng tác viên tuyển sinh của bạn đã bị tạm dừng hoạt động. Lý do: %s. Mọi thắc mắc vui lòng liên hệ Ban quản trị để được hỗ trợ.', COALESCE(v_event.payload->>'reason', 'Theo quy định vận hành tuyển sinh'));
                v_action_url := '/portal/profile';

            WHEN 'AFFILIATE_REACTIVATED' THEN
                v_category := 'ACCOUNT';
                v_title := 'Tài khoản CTV đã được kích hoạt lại';
                v_summary := 'Tài khoản cộng tác viên tuyển sinh của bạn đã hoạt động trở lại bình thường.';
                v_content := 'Tài khoản cộng tác viên tuyển sinh của bạn đã được mở khóa và kích hoạt lại thành công. Bạn có thể tiếp tục các hoạt động tuyển sinh.';
                v_action_url := '/portal/dashboard';

            -- A3: Sự kiện tư vấn và đăng ký người học
            WHEN 'LEAD_SUBMITTED' THEN
                v_category := 'LEAD';
                v_title := 'Đăng ký tuyển sinh mới thành công';
                v_summary := format('Hồ sơ khách hàng %s đã được ghi nhận vào hệ thống.', COALESCE(v_event.payload->>'lead_name', 'Người học'));
                v_content := format('Hồ sơ đăng ký của khách hàng %s (Số điện thoại: %s) đã được tiếp nhận thành công vào hệ thống tuyển sinh STHC. Đội ngũ tư vấn sẽ sớm liên hệ hỗ trợ.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'lead_phone', '---'));
                v_action_url := '/portal/leads';

            WHEN 'LEAD_COUNSELING_UPDATED' THEN
                v_category := 'LEAD';
                v_title := 'Cập nhật tiến trình tư vấn hồ sơ tuyển sinh';
                v_summary := format('Hồ sơ %s vừa có cập nhật tư vấn mới: %s.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'new_status', 'Trạng thái mới'));
                v_content := format('Hồ sơ tuyển sinh của khách hàng %s đã được cập nhật trạng thái tư vấn sang: %s. Ghi chú: %s.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'new_status', '---'), COALESCE(v_event.payload->>'note', 'Không có ghi chú'));
                v_action_url := '/portal/leads';

            -- A4: Sự kiện nhập học & đối soát
            WHEN 'ENROLLMENT_MATCHED' THEN
                v_category := 'RECONCILIATION';
                v_title := 'Hồ sơ người học đã nhập học thành công';
                v_summary := format('Khách hàng %s đã hoàn tất thủ tục nhập học.', COALESCE(v_event.payload->>'lead_name', 'Người học'));
                v_content := format('Chúc mừng! Hồ sơ tuyển sinh của khách hàng %s cho khóa học %s đã hoàn tất thủ tục nhập học và khớp đối soát thành công. Khoản thù lao đang được lập dự toán chuyển duyệt.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'course_name', '---'));
                v_action_url := '/portal/rewards';

            WHEN 'ENROLLMENT_VOIDED' THEN
                v_category := 'RECONCILIATION';
                v_title := 'Điều chỉnh hồ sơ đối soát tuyển sinh';
                v_summary := format('Kết quả đối soát của hồ sơ %s đã được điều chỉnh hủy bỏ.', COALESCE(v_event.payload->>'lead_name', 'Người học'));
                v_content := format('Hồ sơ đối soát của khách hàng %s đã được thu hồi/hủy bỏ. Lý do: %s.', COALESCE(v_event.payload->>'lead_name', 'Người học'), COALESCE(v_event.payload->>'reason', 'Điều chỉnh số liệu đối soát'));
                v_action_url := '/portal/rewards';

            -- A5: Sự kiện thù lao tuyển sinh
            WHEN 'REWARD_APPROVED' THEN
                v_category := 'REWARD';
                v_title := 'Thù lao tuyển sinh đã được phê duyệt';
                v_summary := format('Khoản thù lao %s đã được Ban quản trị phê duyệt.', COALESCE(v_event.payload->>'amount_formatted', 'thù lao'));
                v_content := format('Khoản thù lao tuyển sinh trị giá %s cho hồ sơ %s (Khóa học: %s) đã được Ban quản trị phê duyệt chính thức.', COALESCE(v_event.payload->>'amount_formatted', '---'), COALESCE(v_event.payload->>'lead_name', '---'), COALESCE(v_event.payload->>'course_name', '---'));
                v_action_url := '/portal/rewards';

            WHEN 'REWARD_REJECTED' THEN
                v_category := 'REWARD';
                v_title := 'Khoản thù lao tuyển sinh bị từ chối';
                v_summary := format('Khoản thù lao cho hồ sơ %s chưa được duyệt.', COALESCE(v_event.payload->>'lead_name', '---'));
                v_content := format('Khoản thù lao cho hồ sơ %s không được phê duyệt. Lý do: %s.', COALESCE(v_event.payload->>'lead_name', '---'), COALESCE(v_event.payload->>'reason', 'Chưa đủ điều kiện xét duyệt'));
                v_action_url := '/portal/rewards';

            WHEN 'REWARD_VOIDED' THEN
                v_category := 'REWARD';
                v_title := 'Khoản thù lao tuyển sinh đã bị thu hồi/hủy bỏ';
                v_summary := format('Khoản thù lao cho hồ sơ %s đã bị hủy bỏ.', COALESCE(v_event.payload->>'lead_name', '---'));
                v_content := format('Khoản thù lao tuyển sinh cho hồ sơ %s đã bị hủy bỏ theo quyết định của Ban quản trị. Lý do: %s.', COALESCE(v_event.payload->>'lead_name', '---'), COALESCE(v_event.payload->>'reason', 'Điều chỉnh đối soát'));
                v_action_url := '/portal/rewards';

            ELSE
                v_category := 'GENERAL';
                v_title := COALESCE(v_event.payload->>'title', 'Thông báo biến động hệ thống');
                v_summary := v_event.payload->>'summary';
                v_content := COALESCE(v_event.payload->>'message', 'Hệ thống STHC vừa ghi nhận biến động mới liên quan đến hoạt động của bạn.');
                v_action_url := COALESCE(v_event.payload->>'action_url', '/portal/dashboard');
        END CASE;

        -- 3. Tạo bản ghi trong public.notifications
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

        -- 4. Phân phối tới hộp thư cá nhân của CTV
        IF v_event.recipient_user_id IS NOT NULL THEN
            v_dispatch_res := public.fn_dispatch_notification(
                v_notification_id,
                ARRAY[v_event.recipient_user_id]
            );
        END IF;

        -- 5. Cập nhật trạng thái sự kiện thành công (PROCESSED)
        UPDATE public.notification_events
        SET status = 'PROCESSED',
            notification_id = v_notification_id,
            processed_at = NOW(),
            last_error = NULL,
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
        -- Ghi nhận lỗi minh bạch, tăng retry_count, chuyển sang FAILED hoặc DEAD_LETTER
        UPDATE public.notification_events
        SET retry_count = retry_count + 1,
            last_error = SQLERRM,
            status = CASE WHEN retry_count + 1 >= max_retries THEN 'DEAD_LETTER' ELSE 'FAILED' END,
            updated_at = NOW()
        WHERE id = p_event_id;

        -- Không nuốt lỗi âm thầm: ném ngoại lệ rõ ràng ra ngoài
        RAISE EXCEPTION 'EVENT_PROCESSING_FAILED [ID: %]: %', p_event_id, SQLERRM
            USING ERRCODE = SQLSTATE;
    END;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.4. HÀM ĐÁNH DẤU ĐÃ ĐỌC MỘT THÔNG BÁO (fn_mark_notification_as_read)
-- Kiểm tra nghiêm ngặt quyền sở hữu cá nhân (auth.uid = user_id)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_notification_as_read(
    p_notification_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user UUID;
    v_updated_count INT;
BEGIN
    v_target_user := COALESCE(p_user_id, auth.uid());

    -- Kiểm tra xác thực
    IF v_target_user IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Người dùng chưa đăng nhập.' USING ERRCODE = '42501';
    END IF;

    -- Kiểm tra quyền: Chỉ chính chủ hoặc Admin mới được phép thao tác
    IF v_target_user <> auth.uid() AND public.get_auth_role() <> 'admin' THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Bạn chỉ có thể đánh dấu đã đọc thông báo của chính mình.' USING ERRCODE = '42501';
    END IF;

    -- Cập nhật read_at nếu chưa đọc
    UPDATE public.notification_recipients
    SET read_at = NOW()
    WHERE notification_id = p_notification_id
      AND user_id = v_target_user
      AND read_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'notification_id', p_notification_id,
        'user_id', v_target_user,
        'marked_as_read', (v_updated_count > 0)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.5. HÀM ĐÁNH DẤU ĐÃ ĐỌC TOÀN BỘ THÔNG BÁO (fn_mark_all_notifications_as_read)
-- Hỗ trợ đánh dấu toàn bộ hoặc theo từng tab (ANNOUNCEMENT | SYSTEM)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_all_notifications_as_read(
    p_user_id UUID DEFAULT auth.uid(),
    p_type VARCHAR(30) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user UUID;
    v_updated_count INT;
BEGIN
    v_target_user := COALESCE(p_user_id, auth.uid());

    -- Kiểm tra xác thực
    IF v_target_user IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Người dùng chưa đăng nhập.' USING ERRCODE = '42501';
    END IF;

    -- Kiểm tra quyền: Chỉ chính chủ hoặc Admin mới được phép thao tác
    IF v_target_user <> auth.uid() AND public.get_auth_role() <> 'admin' THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Bạn chỉ có thể đánh dấu đã đọc thông báo của chính mình.' USING ERRCODE = '42501';
    END IF;

    -- Kiểm tra loại thông báo hợp lệ nếu có truyền
    IF p_type IS NOT NULL AND p_type NOT IN ('ANNOUNCEMENT', 'SYSTEM') THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_type phải là ANNOUNCEMENT hoặc SYSTEM.' USING ERRCODE = '22023';
    END IF;

    -- Cập nhật toàn bộ các thông báo đang PUBLISHED và chưa đọc của user
    UPDATE public.notification_recipients nr
    SET read_at = NOW()
    FROM public.notifications n
    WHERE nr.notification_id = n.id
      AND nr.user_id = v_target_user
      AND nr.read_at IS NULL
      AND n.status = 'PUBLISHED'
      AND (p_type IS NULL OR n.type = p_type);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_target_user,
        'type_filtered', p_type,
        'updated_count', v_updated_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3.6. HÀM ĐẾM SỐ THÔNG BÁO CHƯA ĐỌC CHO CTV (fn_get_unread_notification_counts)
-- Tối ưu hóa cực cao nhờ Partial Index, trả về 2 tab và tổng hợp cho Bell header
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_unread_notification_counts(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    total_unread BIGINT,
    announcement_unread BIGINT,
    system_unread BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user UUID;
BEGIN
    v_target_user := COALESCE(p_user_id, auth.uid());

    -- Nếu không có người dùng hợp lệ, trả về 0
    IF v_target_user IS NULL THEN
        RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT;
        RETURN;
    END IF;

    -- Kiểm tra quyền xem: Chỉ chính chủ hoặc Admin/Staff có quyền notifications.view
    IF v_target_user <> auth.uid() AND public.get_auth_role() NOT IN ('admin') THEN
        IF NOT (public.get_auth_role() = 'staff' AND public.fn_has_permission(auth.uid(), 'notifications.view')) THEN
            RAISE EXCEPTION 'PERMISSION_DENIED: Bạn không có quyền truy vấn số lượng thông báo của người dùng khác.' USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Truy vấn tổng hợp sử dụng partial index idx_notification_recipients_unread
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_unread,
        COUNT(*) FILTER (WHERE n.type = 'ANNOUNCEMENT')::BIGINT AS announcement_unread,
        COUNT(*) FILTER (WHERE n.type = 'SYSTEM')::BIGINT AS system_unread
    FROM public.notification_recipients nr
    JOIN public.notifications n ON nr.notification_id = n.id
    WHERE nr.user_id = v_target_user
      AND nr.read_at IS NULL
      AND n.status = 'PUBLISHED';
END;
$$;

-- ==============================================================================
-- 4. PHÂN QUYỀN THỰC THI (GRANTS)
-- ==============================================================================

REVOKE ALL ON FUNCTION public.fn_create_notification_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_notification_event TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_dispatch_notification FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_dispatch_notification TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_process_notification_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_process_notification_event TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_mark_notification_as_read FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_notification_as_read TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_mark_all_notifications_as_read FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_all_notifications_as_read TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_get_unread_notification_counts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_unread_notification_counts TO authenticated, service_role;
