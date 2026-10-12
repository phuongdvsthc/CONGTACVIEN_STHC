-- ==============================================================================
-- MIGRATION: 20261012000004 - Admin/Staff Notification Bell & Multi-Recipient Fix
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- ==============================================================================

-- 1. Bổ sung các mã quyền phân hệ quản trị Admin/Staff nếu chưa có
INSERT INTO public.permissions (code, name, description) VALUES
('affiliates.review', 'Xét duyệt hồ sơ CTV', 'Cho phép xem và phê duyệt/từ chối/tạm ngưng hồ sơ cộng tác viên'),
('affiliates.view', 'Xem danh sách CTV', 'Cho phép xem danh sách và chi tiết hồ sơ cộng tác viên'),
('leads.view', 'Tiếp nhận và quản lý Lead', 'Cho phép xem danh sách và chăm sóc ứng viên tư vấn tuyển sinh'),
('reconciliation.process', 'Xử lý đối soát nhập học', 'Cho phép thực hiện đối soát hồ sơ và học phí EGOV'),
('reconciliation.view', 'Xem đối soát nhập học', 'Cho phép xem kết quả đối soát nhập học'),
('email_service.view', 'Giám sát dịch vụ email', 'Cho phép xem nhật ký và trạng thái hàng đợi tác vụ email')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Hàm RPC đếm thông báo chưa đọc dùng chung cho Admin, Staff và CTV
DROP FUNCTION IF EXISTS public.fn_get_unread_notification_counts(UUID);
DROP FUNCTION IF EXISTS public.fn_get_unread_notification_counts();

CREATE OR REPLACE FUNCTION public.fn_get_unread_notification_counts(
    p_user_id UUID
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
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(nr.id)::BIGINT AS total_unread,
        COUNT(CASE WHEN n.type = 'ANNOUNCEMENT' THEN 1 END)::BIGINT AS announcement_unread,
        COUNT(CASE WHEN n.type = 'SYSTEM' THEN 1 END)::BIGINT AS system_unread
    FROM public.notification_recipients nr
    JOIN public.notifications n ON n.id = nr.notification_id
    WHERE nr.user_id = p_user_id
      AND nr.read_at IS NULL
      AND n.status = 'PUBLISHED';
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_unread_notification_counts(UUID) TO authenticated, service_role;

-- 3. Hàm RPC phân phối thông báo đến Admin & Staff đủ quyền
DROP FUNCTION IF EXISTS public.fn_dispatch_admin_staff_notification(
    VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB
);

CREATE OR REPLACE FUNCTION public.fn_dispatch_admin_staff_notification(
    p_event_type VARCHAR(50),
    p_category VARCHAR(50),
    p_title VARCHAR(255),
    p_summary TEXT,
    p_content TEXT,
    p_action_url VARCHAR(255),
    p_idempotency_key VARCHAR(255),
    p_required_permission VARCHAR(100) DEFAULT NULL,
    p_source_entity_type VARCHAR(50) DEFAULT NULL,
    p_source_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_notification_id UUID;
    v_recipient_id UUID;
BEGIN
    -- 1. Tránh tạo trùng thông báo với idempotency_key đã có
    SELECT id INTO v_notification_id
    FROM public.notifications
    WHERE idempotency_key = p_idempotency_key;

    IF v_notification_id IS NULL THEN
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
            p_category,
            p_title,
            p_summary,
            p_content,
            p_action_url,
            'SPECIFIC',
            'PUBLISHED',
            NOW(),
            p_event_type,
            p_source_entity_type,
            p_source_entity_id,
            p_idempotency_key,
            p_metadata
        )
        RETURNING id INTO v_notification_id;
    END IF;

    -- 2. Phân phối cho tất cả Admin tài khoản đang hoạt động (is_active = TRUE)
    FOR v_recipient_id IN
        SELECT id FROM public.profiles 
        WHERE role = 'admin' AND is_active = TRUE
    LOOP
        INSERT INTO public.notification_recipients (notification_id, user_id)
        VALUES (v_notification_id, v_recipient_id)
        ON CONFLICT (notification_id, user_id) DO NOTHING;
    END LOOP;

    -- 3. Phân phối cho Staff đang hoạt động có quyền p_required_permission (nếu được yêu cầu)
    IF p_required_permission IS NOT NULL AND p_required_permission <> '' THEN
        FOR v_recipient_id IN
            SELECT p.id
            FROM public.profiles p
            WHERE p.role = 'staff' 
              AND p.is_active = TRUE
              AND public.fn_has_permission(p.id, p_required_permission) = TRUE
        LOOP
            INSERT INTO public.notification_recipients (notification_id, user_id)
            VALUES (v_notification_id, v_recipient_id)
            ON CONFLICT (notification_id, user_id) DO NOTHING;
        END LOOP;
    END IF;

    RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_dispatch_admin_staff_notification(
    VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB
) TO service_role;

-- 4. Hàm RPC backfill thông báo chống trùng lặp cho các hồ sơ CTV đang chờ duyệt
DROP FUNCTION IF EXISTS public.fn_backfill_pending_affiliate_notifications();

CREATE OR REPLACE FUNCTION public.fn_backfill_pending_affiliate_notifications()
RETURNS TABLE (
    processed_count INT,
    created_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_aff RECORD;
    v_processed INT := 0;
    v_created INT := 0;
    v_idem_key TEXT;
    v_notif_id UUID;
    v_prof_name TEXT;
    v_prof_email TEXT;
BEGIN
    FOR v_aff IN
        SELECT ap.id, ap.user_id, ap.affiliate_code, ap.created_at, p.full_name, p.email
        FROM public.affiliate_profiles ap
        JOIN public.profiles p ON p.id = ap.user_id
        WHERE ap.status = 'PENDING_REVIEW'
    LOOP
        v_processed := v_processed + 1;
        v_idem_key := 'evt:admin:backfill:AFFILIATE_REGISTERED:' || v_aff.id::text;
        v_prof_name := COALESCE(v_aff.full_name, 'Cộng tác viên');
        v_prof_email := COALESCE(v_aff.email, '');

        -- Kiểm tra xem đã tạo thông báo chưa
        SELECT id INTO v_notif_id
        FROM public.notifications
        WHERE idempotency_key = v_idem_key;

        IF v_notif_id IS NULL THEN
            v_created := v_created + 1;
            PERFORM public.fn_dispatch_admin_staff_notification(
                'AFFILIATE_REGISTERED',
                'ACCOUNT',
                'Hồ sơ CTV mới chờ duyệt',
                format('Hồ sơ CTV %s (%s) đang chờ phê duyệt.', v_prof_name, COALESCE(v_aff.affiliate_code, v_prof_email)),
                format('Cộng tác viên %s (%s) vừa đăng ký tài khoản thành công và đang chờ Ban Tuyển sinh phê duyệt hồ sơ.', v_prof_name, COALESCE(v_aff.affiliate_code, v_prof_email)),
                '/admin/affiliates/' || v_aff.id::text,
                v_idem_key,
                'affiliates.review',
                'affiliate_profiles',
                v_aff.id,
                jsonb_build_object('affiliate_id', v_aff.id, 'full_name', v_prof_name, 'email', v_prof_email)
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_backfill_pending_affiliate_notifications() TO service_role;
