-- ==============================================================================
-- MIGRATION: C3.3A - CƠ SỞ DỮ LIỆU THÔNG BÁO VÀ PHÂN QUYỀN CTV
-- Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
-- Mã file: /supabase/migrations/20261008000001_c3_notification_schema_and_permissions.sql
-- Ngày: 08/10/2026
-- 
-- Mục đích:
--   1. Tạo bảng public.notifications: Lưu nội dung thông báo (Bản tin Ban quản trị & Biến động hệ thống).
--   2. Tạo bảng public.notification_recipients: Lưu danh sách người nhận và thời điểm đọc (read_at).
--      Tách biệt nội dung và trạng thái đọc, không sao chép trùng lặp nội dung.
--   3. Xác định trạng thái đã đọc duy nhất qua read_at (read_at IS NOT NULL), không lưu is_read song song.
--   4. Ràng buộc chống trùng sự kiện qua idempotency_key gắn với từng lần chuyển trạng thái nghiệp vụ.
--   5. Bổ sung 4 quyền quản lý thông báo cho Staff vào public.permissions & nhóm notification_manager.
--   6. Thiết lập chỉ mục hiệu năng phục vụ đếm chưa đọc, phân trang hộp thư và kiểm toán.
--   7. Cấu hình Row Level Security (RLS) bảo vệ đa tầng theo vai trò (Admin, Staff, CTV).
-- ==============================================================================

-- ==============================================================================
-- 1. BẢNG PUBLIC.NOTIFICATIONS (NỘI DUNG THÔNG BÁO)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phân loại chính: ANNOUNCEMENT (Ban quản trị) hoặc SYSTEM (Hệ thống tự động)
    type VARCHAR(30) NOT NULL,
    
    -- Phân loại nghiệp vụ chi tiết
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    
    -- Tiêu đề, tóm tắt và nội dung toàn văn
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    
    -- Đường dẫn điều hướng nghiệp vụ khi bấm xem chi tiết
    action_url VARCHAR(255),
    
    -- Phạm vi phân phối đối với bản tin BQT
    recipient_scope VARCHAR(30) NOT NULL DEFAULT 'ALL',
    recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Vòng đời thông báo: DRAFT -> PUBLISHED -> REVOKED
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    
    -- Mốc thời gian và tài khoản xuất bản / thu hồi
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    -- Nguồn gốc sự kiện hệ thống (áp dụng khi type = 'SYSTEM')
    event_type VARCHAR(50),
    source_entity_type VARCHAR(50),
    source_entity_id UUID,
    
    -- Khóa chống trùng lặp nghiệp vụ cho từng lần chuyển trạng thái
    idempotency_key VARCHAR(255),
    
    -- Siêu dữ liệu mở rộng
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Người tạo và thời gian tạo / cập nhật
    created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ràng buộc giá trị hợp lệ
    CONSTRAINT chk_notification_type CHECK (type IN ('ANNOUNCEMENT', 'SYSTEM')),
    CONSTRAINT chk_notification_category CHECK (
        category IN ('GENERAL', 'POLICY', 'URGENT', 'EVENT', 'LEAD', 'RECONCILIATION', 'REWARD', 'ACCOUNT')
    ),
    CONSTRAINT chk_notification_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT chk_notification_scope CHECK (recipient_scope IN ('ALL', 'STATUS_FILTER', 'SPECIFIC'))
);

-- Trigger cập nhật updated_at tự động
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 2. BẢNG PUBLIC.NOTIFICATION_RECIPIENTS (NGƯỜI NHẬN & TRẠNG THÁI ĐỌC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Khóa ngoại liên kết tới nội dung thông báo
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    
    -- Khóa ngoại liên kết tới tài khoản CTV nhận thông báo
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Nguồn duy nhất xác định đã đọc: NULL = chưa đọc, NOT NULL = thời điểm đã đọc
    read_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Thời điểm thông báo được chuyển vào hộp thư người nhận
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Mỗi người nhận chỉ có duy nhất 1 bản ghi cho 1 thông báo
    CONSTRAINT uq_notification_recipient UNIQUE (notification_id, user_id)
);

-- ==============================================================================
-- 3. CHỈ MỤC HIỆU NĂNG (INDEXES)
-- ==============================================================================

-- 3.1. Chống trùng lặp sự kiện tự động theo khóa nghiệp vụ (Idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key 
ON public.notifications(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 3.2. Chỉ mục hỗ trợ quản trị lọc theo loại, trạng thái và thời gian tạo
CREATE INDEX IF NOT EXISTS idx_notifications_admin_filter 
ON public.notifications(type, status, created_at DESC);

-- 3.3. Chỉ mục truy vấn nguồn gốc sự kiện hệ thống
CREATE INDEX IF NOT EXISTS idx_notifications_event_source 
ON public.notifications(source_entity_type, source_entity_id) 
WHERE source_entity_id IS NOT NULL;

-- 3.4. Chỉ mục truy vấn liên kết sự kiện theo event_type
CREATE INDEX IF NOT EXISTS idx_notifications_event_type 
ON public.notifications(event_type) 
WHERE event_type IS NOT NULL;

-- 3.5. Chỉ mục người nhận: đếm chưa đọc (read_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread 
ON public.notification_recipients(user_id, read_at) 
WHERE read_at IS NULL;

-- 3.6. Chỉ mục người nhận: phân trang hộp thư cá nhân theo thời gian nhận
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_inbox 
ON public.notification_recipients(user_id, created_at DESC);

-- 3.7. Chỉ mục khóa ngoại liên kết notification_id
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id 
ON public.notification_recipients(notification_id);

-- ==============================================================================
-- 4. BỔ SUNG 4 MÃ QUYỀN QUẢN TRỊ THÔNG BÁO CHO STAFF (RBAC)
-- ==============================================================================
INSERT INTO public.permissions (code, name, description) VALUES
('notifications.view', 'Xem danh sách thông báo', 'Cho phép xem danh sách các bản tin và thông báo do Ban quản trị soạn thảo'),
('notifications.create', 'Soạn thảo thông báo', 'Cho phép tạo mới bản nháp (Draft) và chỉnh sửa thông báo chưa xuất bản'),
('notifications.publish', 'Xuất bản thông báo', 'Cho phép phát hành thông báo ra toàn mạng lưới CTV hoặc nhóm chỉ định'),
('notifications.revoke', 'Thu hồi thông báo', 'Cho phép thu hồi bản tin đã xuất bản khi có sai sót hoặc hết hiệu lực')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Tạo nhóm quyền quản lý thông báo mẫu (notification_manager)
INSERT INTO public.permission_groups (code, name, description) VALUES
('notification_manager', 'Phụ trách thông báo & Bản tin CTV', 'Nhóm toàn quyền quản lý thông báo CTV (Xem, soạn thảo, xuất bản, thu hồi)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Gán 4 quyền vào nhóm notification_manager
INSERT INTO public.permission_group_items (group_code, permission_code) VALUES
('notification_manager', 'notifications.view'),
('notification_manager', 'notifications.create'),
('notification_manager', 'notifications.publish'),
('notification_manager', 'notifications.revoke')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 5. THIẾT LẬP QUYỀN TRUY CẬP VÀ ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 5.1. Thu hồi toàn bộ quyền mặc định trên 2 bảng mới
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.notification_recipients FROM anon, authenticated, public;

-- 5.2. Cấp toàn quyền cho backend service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_recipients TO service_role;

-- 5.3. Cấp quyền truy cập tối thiểu cho người dùng đã đăng nhập (authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_recipients TO authenticated;

-- 5.4. Kích hoạt RLS trên cả 2 bảng
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- CHÍNH SÁCH RLS CHO BẢNG PUBLIC.NOTIFICATIONS
-- ------------------------------------------------------------------------------

-- SELECT Policy:
-- - Admin xem toàn bộ thông báo.
-- - Staff xem nếu có quyền 'notifications.view'.
-- - CTV / Authenticated chỉ xem thông báo nếu thông báo có trạng thái PUBLISHED 
--   VÀ người dùng là người nhận trong public.notification_recipients.
CREATE POLICY "Notifications select policy"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND public.fn_has_permission(auth.uid(), 'notifications.view')
    )
    OR (
        status = 'PUBLISHED'
        AND EXISTS (
            SELECT 1 FROM public.notification_recipients nr
            WHERE nr.notification_id = public.notifications.id
              AND nr.user_id = auth.uid()
        )
    )
);

-- INSERT Policy:
-- - Admin toàn quyền tạo thông báo.
-- - Staff có quyền 'notifications.create' được phép tạo bản nháp mới.
CREATE POLICY "Notifications insert policy"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND public.fn_has_permission(auth.uid(), 'notifications.create')
    )
);

-- UPDATE Policy:
-- - Admin toàn quyền cập nhật.
-- - Staff:
--   * Được sửa bản nháp (DRAFT) nếu có 'notifications.create'.
--   * Được xuất bản (PUBLISHED) nếu có 'notifications.publish'.
--   * Được thu hồi (REVOKED) nếu có 'notifications.revoke'.
CREATE POLICY "Notifications update policy"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND (
            (status = 'DRAFT' AND public.fn_has_permission(auth.uid(), 'notifications.create'))
            OR public.fn_has_permission(auth.uid(), 'notifications.publish')
            OR public.fn_has_permission(auth.uid(), 'notifications.revoke')
        )
    )
)
WITH CHECK (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND (
            (status = 'DRAFT' AND public.fn_has_permission(auth.uid(), 'notifications.create'))
            OR public.fn_has_permission(auth.uid(), 'notifications.publish')
            OR public.fn_has_permission(auth.uid(), 'notifications.revoke')
        )
    )
);

-- DELETE Policy:
-- - Chỉ Admin hoặc Staff có quyền 'notifications.create' xóa bản nháp (DRAFT).
-- - Tuyệt đối không xóa bản tin đã xuất bản (PUBLISHED) hoặc đã thu hồi (REVOKED).
CREATE POLICY "Notifications delete policy"
ON public.notifications
FOR DELETE
TO authenticated
USING (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND status = 'DRAFT'
        AND public.fn_has_permission(auth.uid(), 'notifications.create')
    )
);

-- ------------------------------------------------------------------------------
-- CHÍNH SÁCH RLS CHO BẢNG PUBLIC.NOTIFICATION_RECIPIENTS
-- ------------------------------------------------------------------------------

-- SELECT Policy:
-- - Người nhận (user_id = auth.uid()) xem thông báo được gửi cho chính mình.
-- - Admin xem toàn bộ danh sách phân phối.
-- - Staff có quyền 'notifications.view' xem danh sách phân phối để thống kê tỷ lệ đọc.
CREATE POLICY "Notification recipients select policy"
ON public.notification_recipients
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND public.fn_has_permission(auth.uid(), 'notifications.view')
    )
);

-- UPDATE Policy (Đánh dấu đã đọc):
-- - Người nhận (user_id = auth.uid()) chỉ được cập nhật thời điểm đọc của chính mình.
-- - Admin có quyền quản trị.
CREATE POLICY "Notification recipients update policy"
ON public.notification_recipients
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR public.get_auth_role() = 'admin'
)
WITH CHECK (
    user_id = auth.uid()
    OR public.get_auth_role() = 'admin'
);

-- INSERT Policy:
-- - Admin toàn quyền thêm người nhận.
-- - Staff có quyền 'notifications.publish' được phân phối người nhận khi xuất bản bản tin.
CREATE POLICY "Notification recipients insert policy"
ON public.notification_recipients
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_auth_role() = 'admin'
    OR (
        public.get_auth_role() = 'staff'
        AND public.fn_has_permission(auth.uid(), 'notifications.publish')
    )
);

-- DELETE Policy:
-- - Chỉ Admin có quyền thu dọn dữ liệu nếu cần, thông thường dữ liệu được lưu vết lịch sử vĩnh viễn.
CREATE POLICY "Notification recipients delete policy"
ON public.notification_recipients
FOR DELETE
TO authenticated
USING (
    public.get_auth_role() = 'admin'
);
