-- ==============================================================================
-- Migration: Add course referral status and lifecycle management (A2.4)
-- Module: Quản lý khóa học & Giới thiệu tuyển sinh
-- Description: Bổ sung các trường kiểm soát vòng đời khóa học (DRAFT, ACTIVE, STOPPED),
--              phân biệt giữa hiển thị công khai và quyền tiếp nhận giới thiệu/đăng ký.
-- ==============================================================================

-- 1. Thêm cột accepts_referrals: kiểm soát nhận giới thiệu tuyển sinh
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS accepts_referrals BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Thêm cột status: lưu trạng thái vòng đời chuẩn (DRAFT, ACTIVE, STOPPED)
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- 3. Thêm cột stop_reason: lưu lý do ngừng tiếp nhận giới thiệu
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS stop_reason TEXT DEFAULT NULL;

-- 4. Thêm cột status_note: lưu ghi chú khi công khai hoặc mở lại
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT NULL;

-- 5. Thêm cột status_updated_at & status_updated_by: lưu người và thời điểm chuyển trạng thái
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Đặt bình luận làm rõ ý nghĩa các trường
COMMENT ON COLUMN public.courses.is_active IS 'Trạng thái hiển thị công khai (TRUE = Đã công khai, FALSE = Bản nháp/Chưa công khai)';
COMMENT ON COLUMN public.courses.accepts_referrals IS 'Quyền tiếp nhận đăng ký/giới thiệu (TRUE = Đang nhận, FALSE = Ngừng giới thiệu)';
COMMENT ON COLUMN public.courses.status IS 'Trạng thái chuẩn hóa của khóa học: DRAFT, ACTIVE, STOPPED';
COMMENT ON COLUMN public.courses.stop_reason IS 'Lý do bắt buộc khi chuyển sang trạng thái ngừng giới thiệu (STOPPED)';
COMMENT ON COLUMN public.courses.status_note IS 'Ghi chú tùy chọn khi công khai hoặc mở lại giới thiệu';
