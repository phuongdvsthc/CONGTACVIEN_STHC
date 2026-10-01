-- ==============================================================================
-- Migration: Add tax_code column to profiles and affiliate_profiles (P2)
-- Description: Bổ sung trường Mã số thuế (tax_code) kiểu TEXT để giữ số 0 ở đầu,
--              cho phép NULL khi chưa cập nhật, không tự động điền dữ liệu giả.
-- ==============================================================================

-- 1. Bổ sung tax_code vào bảng public.profiles (Áp dụng cho tất cả tài khoản: Admin, Staff, CTV)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tax_code TEXT DEFAULT NULL;

-- 2. Bổ sung tax_code vào bảng public.affiliate_profiles (Đồng bộ cho nghiệp vụ đối soát CTV)
ALTER TABLE public.affiliate_profiles
ADD COLUMN IF NOT EXISTS tax_code TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.tax_code IS 'Mã số thuế cá nhân (kiểu TEXT giữ số 0 ở đầu, NULL nếu chưa cập nhật)';
COMMENT ON COLUMN public.affiliate_profiles.tax_code IS 'Mã số thuế phục vụ đối soát chi trả thù lao CTV (NULL nếu chưa cập nhật)';
