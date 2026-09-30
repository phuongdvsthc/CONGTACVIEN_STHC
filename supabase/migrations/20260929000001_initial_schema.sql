-- ==============================================================================
-- BƯỚC DB-A1: MIGRATION 001 (BẢN RÀ SOÁT HOÀN CHỈNH CUỐI CÙNG)
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260929000001_initial_schema.sql
-- Mục đích: Khởi tạo cấu trúc bảng cốt lõi với chính sách bảo toàn dữ liệu nghiêm ngặt:
--   1. CHỐNG XÓA DÂY CHUYỀN NGOÀI Ý MUỐN:
--      - affiliate_profiles.user_id ON DELETE RESTRICT: Ngăn xóa auth.users/profiles làm mất hồ sơ CTV.
--      - leads.affiliate_id ON DELETE RESTRICT: Ngăn xóa CTV làm mất dấu vết nguồn gốc lead.
--      - lead_reconciliations.lead_id & rewards.lead_id ON DELETE RESTRICT: Ngăn xóa lead khi đã có lịch sử.
--      - staff_id, approved_by, voided_by ON DELETE RESTRICT: Ngăn xóa cán bộ làm mất vết kiểm toán.
--   2. KHÓA NGOẠI KẾT HỢP (reconciliation_id, lead_id):
--      - Đảm bảo rewards.lead_id luôn khớp 100% với lead_reconciliations.lead_id.
--      - reconciliation_id UNIQUE đảm bảo 1 lần đối soát chỉ sinh tối đa 1 khoản thưởng.
--   3. CHỈ MỤC DUY NHẤT CÓ ĐIỀU KIỆN (Partial Unique Indexes):
--      - uq_valid_external_admission_code: 1 mã hồ sơ chỉ được gắn 1 đối soát MATCHED_VALID.
--      - uq_valid_recon_per_lead: 1 lead chỉ có tối đa 1 đối soát MATCHED_VALID.
--      - uq_active_reward_per_lead: 1 lead chỉ có tối đa 1 khoản thưởng đang hoạt động.
-- ==============================================================================

-- 1. KÍCH HOẠT EXTENSION CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HÀM TỰ ĐỘNG CẬP NHẬT THỜI GIAN UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. BẢNG PROFILES (Mở rộng từ auth.users của Supabase)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(30) NOT NULL DEFAULT 'affiliate',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_profiles_role CHECK (role IN ('affiliate', 'staff', 'admin'))
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 4. BẢNG AFFILIATE_PROFILES (Hồ sơ Cộng tác viên tuyển sinh & Trạng thái duyệt)
-- RÀNG BUỘC CHỐNG XÓA DÂY CHUYỀN:
--   - user_id ON DELETE RESTRICT: Ngăn xóa profiles / auth.users nếu hồ sơ CTV tồn tại.
--   - reviewed_by ON DELETE RESTRICT: Ngăn xóa tài khoản người duyệt.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
    affiliate_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    id_card_number VARCHAR(30),
    occupation VARCHAR(150),
    address TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_affiliate_status CHECK (status IN ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED'))
);

CREATE TRIGGER trg_affiliate_profiles_updated_at
BEFORE UPDATE ON public.affiliate_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_affiliate_code ON public.affiliate_profiles(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_user_id ON public.affiliate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_status ON public.affiliate_profiles(status);

-- ==============================================================================
-- 5. BẢNG COURSES (Danh mục Ngành & Khóa học Tuyển sinh)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100) NOT NULL,
    degree_level VARCHAR(50) NOT NULL,
    duration_text VARCHAR(100) NOT NULL,
    tuition_fee_estimate NUMERIC(14, 2),
    summary TEXT,
    description_html TEXT,
    thumbnail_url TEXT,
    brochure_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON public.courses(is_active);

-- ==============================================================================
-- 6. BẢNG LEADS (Thông tin Ứng viên do người học tự đăng ký)
-- RÀNG BUỘC CHỐNG XÓA DÂY CHUYỀN:
--   - course_id ON DELETE RESTRICT: Ngăn xóa khóa học nếu đang có lead gắn kèm.
--   - affiliate_id ON DELETE RESTRICT: Ngăn xóa hồ sơ CTV nếu đã phát sinh lead giới thiệu.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    province VARCHAR(100),
    course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT,
    affiliate_id UUID REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
    affiliate_code_captured VARCHAR(50),
    counseling_status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'NOT_RECONCILED',
    reward_status VARCHAR(50) NOT NULL DEFAULT 'NONE',
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_reason VARCHAR(255),
    consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_contact_time VARCHAR(50),
    customer_note TEXT,
    counselor_note TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leads_counseling_status CHECK (
        counseling_status IN ('NEW', 'CONTACTED', 'CONSULTING', 'UNREACHABLE', 'LOST')
    ),
    CONSTRAINT chk_leads_reconciliation_status CHECK (
        reconciliation_status IN ('NOT_RECONCILED', 'MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID', 'VOIDED')
    ),
    CONSTRAINT chk_leads_reward_status CHECK (
        reward_status IN ('NONE', 'PENDING_APPROVAL', 'APPROVED', 'VOIDED', 'REJECTED')
    )
);

CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_affiliate_id ON public.leads(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_counseling_status ON public.leads(counseling_status);
CREATE INDEX IF NOT EXISTS idx_leads_reconciliation_status ON public.leads(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_leads_reward_status ON public.leads(reward_status);

-- ==============================================================================
-- 7. BẢNG LEAD_RECONCILIATIONS (Đối soát thủ công & Lưu vết lịch sử)
-- RÀNG BUỘC TOÀN VẸN:
--   - lead_id ON DELETE RESTRICT: Ngăn xóa lead khi đã có lịch sử đối soát.
--   - staff_id & voided_by ON DELETE RESTRICT: Ngăn xóa cán bộ đã tham gia đối soát/hủy.
--   - CONSTRAINT uq_recon_id_lead_id UNIQUE (id, lead_id): Phục vụ khóa ngoại kết hợp.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lead_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    external_admission_code VARCHAR(100) NOT NULL,
    external_student_code VARCHAR(100),
    tuition_fee_collected NUMERIC(14, 2) NOT NULL,
    receipt_number VARCHAR(100),
    tuition_paid_at TIMESTAMPTZ NOT NULL,
    reconciliation_status VARCHAR(50) NOT NULL DEFAULT 'MATCHED_VALID',
    staff_note TEXT,
    void_reason TEXT,
    voided_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    voided_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_reconciliation_status CHECK (
        reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID', 'VOIDED')
    ),
    -- Khóa duy nhất kết hợp để liên kết chặt chẽ với bảng rewards:
    CONSTRAINT uq_recon_id_lead_id UNIQUE (id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_recon_lead_id ON public.lead_reconciliations(lead_id);
CREATE INDEX IF NOT EXISTS idx_recon_external_code ON public.lead_reconciliations(external_admission_code);
CREATE INDEX IF NOT EXISTS idx_recon_status ON public.lead_reconciliations(reconciliation_status);

-- CHỈ MỤC DUY NHẤT CÓ ĐIỀU KIỆN:
CREATE UNIQUE INDEX IF NOT EXISTS uq_valid_external_admission_code 
ON public.lead_reconciliations (external_admission_code) 
WHERE reconciliation_status = 'MATCHED_VALID';

CREATE UNIQUE INDEX IF NOT EXISTS uq_valid_recon_per_lead 
ON public.lead_reconciliations (lead_id) 
WHERE reconciliation_status = 'MATCHED_VALID';

-- ==============================================================================
-- 8. BẢNG REWARDS (Bản ghi Thưởng & Lưu vết lịch sử)
-- RÀNG BUỘC TOÀN VẸN QUAN TRỌNG:
--   - reconciliation_id UUID NOT NULL UNIQUE: 1 lần đối soát CHỈ SINH TỐI ĐA 01 BẢN THƯỞNG.
--   - CONSTRAINT fk_rewards_recon_lead FOREIGN KEY (reconciliation_id, lead_id)
--       REFERENCES public.lead_reconciliations(id, lead_id) ON DELETE RESTRICT:
--       ĐẢM BẢO REWARDS.LEAD_ID LUÔN KHỚP 100% VỚI LEAD_RECONCILIATIONS.LEAD_ID.
--   - lead_id, affiliate_id, approved_by, voided_by ON DELETE RESTRICT: Bảo toàn kiểm toán.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    reconciliation_id UUID NOT NULL UNIQUE,
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 500000.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    void_reason TEXT,
    voided_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rewards_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_rewards_status CHECK (
        status IN ('PENDING_APPROVAL', 'APPROVED', 'VOIDED', 'REJECTED')
    ),
    CONSTRAINT fk_rewards_recon_lead FOREIGN KEY (reconciliation_id, lead_id)
        REFERENCES public.lead_reconciliations(id, lead_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_rewards_updated_at
BEFORE UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE INDEX IF NOT EXISTS idx_rewards_lead_id ON public.rewards(lead_id);
CREATE INDEX IF NOT EXISTS idx_rewards_affiliate_id ON public.rewards(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_rewards_status ON public.rewards(status);
CREATE INDEX IF NOT EXISTS idx_rewards_reconciliation_id ON public.rewards(reconciliation_id);

-- CHỈ MỤC DUY NHẤT CÓ ĐIỀU KIỆN:
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_reward_per_lead 
ON public.rewards (lead_id) 
WHERE status IN ('PENDING_APPROVAL', 'APPROVED');

-- ==============================================================================
-- 9. BẢNG AUDIT_LOGS (Nhật ký kiểm toán tranh chấp & Thao tác nghiệp vụ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
