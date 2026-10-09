-- ==============================================================================
-- MIGRATION: C3.4B - NÂNG CẤP VÀ HOÀN THIỆN RPC TRẠNG THÁI ĐỌC THÔNG BÁO CTV
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- Mã file: /supabase/migrations/20261008000003_c3_read_state_rpc_hardening.sql
-- Ngày: 08/10/2026
--
-- Mục đích:
--   1. Thu hồi quyền PUBLIC/anon và đóng các hàm overload cũ không an toàn:
--      - Ngăn chặn triệt để việc gọi tự do với p_type NULL hoặc user_id bất kỳ.
--   2. Nâng cấp fn_mark_notification_as_read:
--      - Nhận notification_id (UUID), chỉ chấp nhận bản ghi có status = 'PUBLISHED'.
--      - Nhận p_user_id do backend xác thực truyền vào (hoặc auth.uid()).
--      - Chỉ cập nhật khi read_at IS NULL, giữ nguyên read_at ban đầu nếu gọi lại.
--      - Trả về envelope chuẩn: notification_id, recipient_id, is_read, read_at, updated_count.
--      - Khóa dòng notification (FOR SHARE) để tránh race-condition với tác vụ thu hồi (REVOKE).
--   3. Nâng cấp fn_mark_all_notifications_as_read:
--      - Bắt buộc tham số p_type IN ('ANNOUNCEMENT', 'SYSTEM') (Tuyệt đối không nhận NULL/ALL).
--      - Bắt buộc tham số p_cutoff_at TIMESTAMPTZ (không ở tương lai so với NOW()).
--      - Chỉ cập nhật recipient có created_at <= p_cutoff_at, read_at IS NULL, notification PUBLISHED.
--      - Giữ nguyên mốc read_at đầu tiên của các bản ghi đã đọc.
--      - Trả về: tab, cutoff_at, updated_count, marked_at.
--   4. Thiết lập an toàn bảo mật:
--      - SECURITY DEFINER, search_path = public, pg_temp.
--      - REVOKE ALL FROM PUBLIC, anon.
--      - GRANT EXECUTE TO authenticated, service_role.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. THU HỒI VÀ XÓA CÁC SIGNATURE VÀ OVERLOAD CŨ ĐỂ TRÁNH LỖI 42P13
-- Khi xóa giá trị DEFAULT của tham số (ví dụ p_user_id DEFAULT auth.uid()),
-- PostgreSQL yêu cầu phải DROP FUNCTION trước, không thể dùng CREATE OR REPLACE.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_mark_notification_as_read(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_mark_all_notifications_as_read(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.fn_mark_all_notifications_as_read(UUID, VARCHAR, TIMESTAMPTZ) CASCADE;

-- ------------------------------------------------------------------------------
-- 2. HÀM RPC ĐÁNH DẤU ĐÃ ĐỌC MỘT THÔNG BÁO (fn_mark_notification_as_read)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_notification_as_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec_id UUID;
    v_read_at TIMESTAMPTZ;
    v_is_already_read BOOLEAN := FALSE;
    v_updated_count INT := 0;
    v_notif_status VARCHAR(30);
    v_now TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
    -- 1. Kiểm tra tham số đầu vào
    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_notification_id không được để trống.'
            USING ERRCODE = '22023';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Danh tính người dùng không hợp lệ.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra nếu caller là authenticated user thông thường thì bắt buộc p_user_id phải khớp auth.uid()
    -- (Trừ trường hợp service_role gọi với role postgres/service_role)
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Không được phép thao tác trên thông báo của người khác.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Khóa và kiểm tra thông báo gốc trong notifications (FOR SHARE tránh xung đột với REVOKE UPDATE)
    SELECT status INTO v_notif_status
    FROM public.notifications
    WHERE id = p_notification_id
    FOR SHARE;

    IF v_notif_status IS NULL OR v_notif_status <> 'PUBLISHED' THEN
        -- Thông báo không tồn tại hoặc chưa PUBLISHED/đã REVOKED -> Báo NOT_FOUND chung
        RAISE EXCEPTION 'NOT_FOUND: Thông báo không khả dụng hoặc đã bị thu hồi.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Tìm bản ghi người nhận của CTV (FOR UPDATE)
    SELECT id, read_at INTO v_rec_id, v_read_at
    FROM public.notification_recipients
    WHERE notification_id = p_notification_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF v_rec_id IS NULL THEN
        -- CTV không nằm trong danh sách người nhận
        RAISE EXCEPTION 'NOT_FOUND: Không tìm thấy thông báo trong hộp thư của người dùng.'
            USING ERRCODE = 'P0002';
    END IF;

    -- 5. Thực hiện cập nhật read_at nếu chưa đọc
    IF v_read_at IS NULL THEN
        UPDATE public.notification_recipients
        SET read_at = v_now
        WHERE id = v_rec_id;

        v_updated_count := 1;
        v_read_at := v_now;
    ELSE
        -- Đã đọc trước đó: Giữ nguyên v_read_at ban đầu, updated_count = 0
        v_updated_count := 0;
    END IF;

    -- 6. Trả về kết quả envelope chuẩn
    RETURN jsonb_build_object(
        'notification_id', p_notification_id,
        'recipient_id', v_rec_id,
        'is_read', true,
        'read_at', to_char(v_read_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updated_count', v_updated_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. HÀM RPC ĐÁNH DẤU ĐÃ ĐỌC TẤT CẢ TRONG MỘT TAB (fn_mark_all_notifications_as_read)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mark_all_notifications_as_read(
    p_user_id UUID,
    p_type VARCHAR(30),
    p_cutoff_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_count INT := 0;
    v_now TIMESTAMPTZ := CLOCK_TIMESTAMP();
BEGIN
    -- 1. Kiểm tra xác thực
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Danh tính người dùng không hợp lệ.'
            USING ERRCODE = '42501';
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Không được phép thao tác trên thông báo của người khác.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Kiểm tra tham số tab (Bắt buộc ANNOUNCEMENT hoặc SYSTEM)
    IF p_type IS NULL OR p_type NOT IN ('ANNOUNCEMENT', 'SYSTEM') THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_type bắt buộc phải là ANNOUNCEMENT hoặc SYSTEM.'
            USING ERRCODE = '22023';
    END IF;

    -- 3. Kiểm tra mốc cutoff_at (Bắt buộc và không ở tương lai so với server time)
    IF p_cutoff_at IS NULL THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_cutoff_at là tham số bắt buộc.'
            USING ERRCODE = '22023';
    END IF;

    -- Cho phép dung sai 5 giây đối với lệch xung nhịp clock giữa server node và DB
    IF p_cutoff_at > (v_now + INTERVAL '5 seconds') THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_cutoff_at không thể ở tương lai so với thời gian máy chủ CSDL.'
            USING ERRCODE = '22023';
    END IF;

    -- 4. Thực hiện cập nhật hàng loạt:
    --    - Thuộc chính CTV (user_id = p_user_id)
    --    - Chưa đọc (read_at IS NULL)
    --    - Được đưa vào hộp thư trước hoặc đúng mốc cutoff (created_at <= p_cutoff_at)
    --    - Thuộc loại tab chỉ định (n.type = p_type)
    --    - Thông báo đang PUBLISHED (n.status = 'PUBLISHED')
    UPDATE public.notification_recipients nr
    SET read_at = v_now
    FROM public.notifications n
    WHERE nr.notification_id = n.id
      AND nr.user_id = p_user_id
      AND nr.read_at IS NULL
      AND nr.created_at <= p_cutoff_at
      AND n.status = 'PUBLISHED'
      AND n.type = p_type;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- 5. Trả về envelope kết quả
    RETURN jsonb_build_object(
        'tab', p_type,
        'cutoff_at', to_char(p_cutoff_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updated_count', v_updated_count,
        'marked_at', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. PHÂN QUYỀN THỰC THI (GRANTS)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.fn_mark_notification_as_read(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mark_notification_as_read(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.fn_mark_all_notifications_as_read(UUID, VARCHAR, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_mark_all_notifications_as_read(UUID, VARCHAR, TIMESTAMPTZ) TO authenticated, service_role;
