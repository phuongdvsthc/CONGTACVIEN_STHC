-- ==============================================================================
-- MIGRATION: PQ.1–PQ.3 - Nền tảng Phân quyền A5 (Permissions & Permission Groups)
-- ==============================================================================

-- 1. Bảng danh mục quyền (permissions)
CREATE TABLE IF NOT EXISTS public.permissions (
    code VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bảng nhóm quyền (permission_groups)
CREATE TABLE IF NOT EXISTS public.permission_groups (
    code VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng liên kết nhóm - quyền (permission_group_items)
CREATE TABLE IF NOT EXISTS public.permission_group_items (
    group_code VARCHAR(100) NOT NULL REFERENCES public.permission_groups(code) ON DELETE CASCADE,
    permission_code VARCHAR(100) NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
    PRIMARY KEY (group_code, permission_code)
);

-- 4. Bảng gán nhóm quyền cho nhân viên (staff_permission_groups)
CREATE TABLE IF NOT EXISTS public.staff_permission_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_code VARCHAR(100) NOT NULL REFERENCES public.permission_groups(code) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_staff_permission_groups_staff_id ON public.staff_permission_groups(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_permission_groups_group_code ON public.staff_permission_groups(group_code);

-- 5. Seed dữ liệu 7 quyền A5
INSERT INTO public.permissions (code, name, description) VALUES
('rewards.view', 'Xem danh sách thù lao', 'Cho phép xem danh sách các khoản thù lao tuyển sinh'),
('rewards.view_detail', 'Xem chi tiết thù lao', 'Cho phép xem chi tiết khoản thù lao và căn cứ liên kết lead'),
('rewards.approve', 'Duyệt khoản thù lao', 'Cho phép phê duyệt khoản thù lao (APPROVED)'),
('rewards.reject', 'Từ chối khoản thù lao', 'Cho phép từ chối khoản thù lao (REJECTED) kèm lý do'),
('rewards.void', 'Hủy trực tiếp thù lao', 'Cho phép hủy/vô hiệu hóa trực tiếp khoản thù lao tại A5'),
('rewards.summary', 'Xem tổng hợp thù lao', 'Cho phép xem các số liệu tổng hợp và thống kê thù lao'),
('rewards.export', 'Xuất báo cáo thù lao', 'Cho phép xuất bảng kê thù lao cho kế toán (CSV/Excel)')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 6. Seed dữ liệu 2 nhóm quyền mẫu
INSERT INTO public.permission_groups (code, name, description) VALUES
('reward_manager', 'Phụ trách thù lao CTV', 'Nhóm quản lý toàn quyền A5 (Xem, chi tiết, duyệt, từ chối, hủy, tổng hợp, xuất báo cáo)'),
('reward_viewer', 'Xem thù lao CTV', 'Nhóm chỉ có quyền xem danh sách và chi tiết thù lao')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 7. Seed liên kết nhóm - quyền
-- Nhóm reward_manager: có cả 7 quyền
INSERT INTO public.permission_group_items (group_code, permission_code) VALUES
('reward_manager', 'rewards.view'),
('reward_manager', 'rewards.view_detail'),
('reward_manager', 'rewards.approve'),
('reward_manager', 'rewards.reject'),
('reward_manager', 'rewards.void'),
('reward_manager', 'rewards.summary'),
('reward_manager', 'rewards.export')
ON CONFLICT DO NOTHING;

-- Nhóm reward_viewer: có rewards.view và rewards.view_detail
INSERT INTO public.permission_group_items (group_code, permission_code) VALUES
('reward_viewer', 'rewards.view'),
('reward_viewer', 'rewards.view_detail')
ON CONFLICT DO NOTHING;

-- 8. Hàm RPC: fn_get_user_permissions(p_user_id UUID)
CREATE OR REPLACE FUNCTION public.fn_get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_is_active BOOLEAN;
BEGIN
    -- Kiểm tra profile và role của user
    SELECT role, is_active INTO v_role, v_is_active
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND OR NOT v_is_active THEN
        RETURN;
    END IF;

    -- Nếu user là admin, cấp toàn bộ 7 quyền A5
    IF v_role = 'admin' THEN
        RETURN QUERY SELECT p.code::TEXT FROM public.permissions p;
        RETURN;
    END IF;

    -- Nếu user là staff, lấy các quyền từ các nhóm đang active được gán
    IF v_role = 'staff' THEN
        RETURN QUERY
        SELECT DISTINCT pgi.permission_code::TEXT
        FROM public.staff_permission_groups spg
        JOIN public.permission_group_items pgi ON spg.group_code = pgi.group_code
        WHERE spg.staff_id = p_user_id
          AND spg.is_active = TRUE;
        RETURN;
    END IF;

    -- CTV hoặc public không có quyền quản trị A5
    RETURN;
END;
$$;

-- 9. Hàm RPC: fn_has_permission(p_user_id UUID, p_perm TEXT)
CREATE OR REPLACE FUNCTION public.fn_has_permission(p_user_id UUID, p_perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.fn_get_user_permissions(p_user_id) WHERE permission_code = p_perm
    );
END;
$$;

-- 10. Enable RLS và cấp quyền truy cập bảng phân quyền
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permission_groups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.permissions FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.permission_groups FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.permission_group_items FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.staff_permission_groups FROM anon, authenticated, public;

GRANT SELECT ON TABLE public.permissions TO authenticated;
GRANT SELECT ON TABLE public.permission_groups TO authenticated;
GRANT SELECT ON TABLE public.permission_group_items TO authenticated;
GRANT SELECT ON TABLE public.staff_permission_groups TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.permission_groups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.permission_group_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_permission_groups TO service_role;
