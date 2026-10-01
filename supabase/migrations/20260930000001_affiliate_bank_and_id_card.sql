-- ==============================================================================
-- BỔ SUNG CỘNG TÁC VIÊN: NGÀY CẤP CCCD & THÔNG TIN TÀI KHOẢN NGÂN HÀNG (YÊU CẦU A1.2)
-- Migration: 20260930000001_affiliate_bank_and_id_card.sql
-- ==============================================================================

-- 1. Bổ sung các cột vào bảng public.affiliate_profiles (cho phép NULL cho hồ sơ cũ)
ALTER TABLE public.affiliate_profiles
ADD COLUMN IF NOT EXISTS id_card_issued_date DATE,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- 2. Ràng buộc kiểm tra ngày cấp CCCD không lớn hơn ngày hiện tại nếu được cung cấp
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_id_card_issued_date'
    ) THEN
        ALTER TABLE public.affiliate_profiles
        ADD CONSTRAINT chk_id_card_issued_date 
        CHECK (id_card_issued_date IS NULL OR id_card_issued_date <= CURRENT_DATE);
    END IF;
END $$;

-- 3. Cập nhật hàm trigger public.handle_new_auth_user() để tiếp nhận 3 trường mới khi CTV đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_code VARCHAR(50);
    extracted_name VARCHAR(150);
    extracted_phone VARCHAR(20);
    extracted_id_card VARCHAR(30);
    extracted_occupation VARCHAR(150);
    extracted_address TEXT;
    extracted_id_card_issued_date DATE;
    extracted_bank_account TEXT;
    extracted_bank_name TEXT;
    raw_date_str TEXT;
BEGIN
    -- Trích xuất họ tên an toàn
    extracted_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        NULLIF(TRIM(split_part(COALESCE(NEW.email, ''), '@', 1)), ''),
        'Cộng tác viên'
    );

    extracted_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
    extracted_id_card := NULLIF(TRIM(NEW.raw_user_meta_data->>'id_card_number'), '');
    extracted_occupation := NULLIF(TRIM(NEW.raw_user_meta_data->>'occupation'), '');
    extracted_address := NULLIF(TRIM(NEW.raw_user_meta_data->>'address'), '');
    
    -- Trích xuất ngày cấp CCCD an toàn
    raw_date_str := NULLIF(TRIM(NEW.raw_user_meta_data->>'id_card_issued_date'), '');
    IF raw_date_str IS NOT NULL THEN
        BEGIN
            extracted_id_card_issued_date := raw_date_str::DATE;
            IF extracted_id_card_issued_date > CURRENT_DATE THEN
                extracted_id_card_issued_date := NULL;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            extracted_id_card_issued_date := NULL;
        END;
    ELSE
        extracted_id_card_issued_date := NULL;
    END IF;

    extracted_bank_account := NULLIF(TRIM(NEW.raw_user_meta_data->>'bank_account_number'), '');
    extracted_bank_name := NULLIF(TRIM(NEW.raw_user_meta_data->>'bank_name'), '');

    -- 1. Tạo bản ghi public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        extracted_name,
        extracted_phone,
        'affiliate',
        TRUE,
        NOW(),
        NOW()
    );

    -- 2. Sinh mã CTV duy nhất và tạo bản ghi public.affiliate_profiles
    gen_code := public.generate_unique_affiliate_code();

    INSERT INTO public.affiliate_profiles (
        user_id,
        affiliate_code,
        status,
        id_card_number,
        id_card_issued_date,
        occupation,
        address,
        bank_account_number,
        bank_name,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_code,
        'PENDING_REVIEW',
        extracted_id_card,
        extracted_id_card_issued_date,
        extracted_occupation,
        extracted_address,
        extracted_bank_account,
        extracted_bank_name,
        NOW(),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Khởi tạo hồ sơ người dùng [public.profiles / affiliate_profiles] thất bại cho Auth User ID %: % (Mã lỗi: %)',
            NEW.id, SQLERRM, SQLSTATE
            USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
