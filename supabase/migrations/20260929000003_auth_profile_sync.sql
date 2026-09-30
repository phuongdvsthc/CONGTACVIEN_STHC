-- ==============================================================================
-- BƯỚC DB-C: MIGRATION 003 - ĐỒNG BỘ SUPABASE AUTH VÀ TỰ ĐỘNG KHỞI TẠO HỒ SƠ CTV
-- Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
-- Mã file: /supabase/migrations/20260929000003_auth_profile_sync.sql
-- ==============================================================================
-- Mục đích chính:
--   1. Tự động khởi tạo đồng bộ 1 dòng public.profiles và 1 dòng public.affiliate_profiles
--      ngay khi có tài khoản mới đăng ký tại auth.users.
--   2. Cố định vai trò mặc định: role = 'affiliate', is_active = TRUE.
--   3. Trạng thái xét duyệt hồ sơ ban đầu luôn là: status = 'PENDING_REVIEW'.
--   4. Mã CTV được sinh ngẫu nhiên duy nhất chuẩn format: STHCCTVXXXX (viết liền không dấu).
--      Mã này CHỈ có hiệu lực khi quản trị viên/cán bộ tuyển sinh duyệt sang 'ACTIVE'.
--   5. TUYỆT ĐỐI KHÔNG nhận role, status, hoặc affiliate_code từ client metadata (chống giả mạo).
--   6. Đồng bộ tự động email khi tài khoản đổi email tại auth.users sang public.profiles.
--   7. Cơ chế Transaction Atomicity: Nếu trigger lỗi, lập tức ROLLBACK toàn bộ phiên đăng ký,
--      không để lại auth.users mồ côi hoặc dữ liệu nửa chừng.
--   8. Cung cấp thủ tục đối chiếu & bổ sung hồ sơ thiếu cho auth.users cũ (idempotent 100%).
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM SINH MÃ CTV DUY NHẤT (Format: STHCCTVXXXX - Viết liền, 4 chữ số ngẫu nhiên)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_unique_affiliate_code()
RETURNS VARCHAR(50) AS $$
DECLARE
    new_code VARCHAR(50);
    code_exists BOOLEAN;
    random_num INTEGER;
    loop_count INTEGER := 0;
BEGIN
    LOOP
        loop_count := loop_count + 1;
        -- Sinh số ngẫu nhiên 4 chữ số từ 1000 đến 9999
        random_num := FLOOR(1000 + (RANDOM() * 9000))::INTEGER;
        new_code := 'STHCCTV' || random_num::TEXT;

        SELECT EXISTS(
            SELECT 1 FROM public.affiliate_profiles WHERE affiliate_code = new_code
        ) INTO code_exists;

        IF NOT code_exists THEN
            RETURN new_code;
        END IF;

        IF loop_count > 1000 THEN
            -- Dự phòng không gian số mở rộng nếu đã dùng nhiều mã
            new_code := 'STHCCTV' || (FLOOR(10000 + (RANDOM() * 90000))::INTEGER)::TEXT;
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.generate_unique_affiliate_code() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.generate_unique_affiliate_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_unique_affiliate_code() TO authenticated, service_role;

-- ==============================================================================
-- 2. TRIGGER FUNCTION: TỰ ĐỘNG KHỞI TẠO PROFILES & AFFILIATE_PROFILES KHI ĐĂNG KÝ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    gen_code VARCHAR(50);
    extracted_name VARCHAR(150);
    extracted_phone VARCHAR(20);
    extracted_id_card VARCHAR(30);
    extracted_occupation VARCHAR(150);
    extracted_address TEXT;
BEGIN
    -- Trích xuất họ tên an toàn: ưu tiên full_name -> name -> tiền tố email -> 'Cộng tác viên'
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

    -- 1. Tạo bản ghi public.profiles
    -- QUY TẮC BẢO MẬT: Bỏ qua hoàn toàn metadata role/is_active từ client.
    -- Mọi tài khoản mới đăng ký luôn mặc định là: role = 'affiliate', is_active = TRUE.
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
    -- QUY TẮC BẢO MẬT: status LUÔN là 'PENDING_REVIEW', affiliate_code do hệ thống tự sinh.
    -- Bỏ qua mọi giá trị giả mạo do người dùng gửi qua metadata.
    gen_code := public.generate_unique_affiliate_code();

    INSERT INTO public.affiliate_profiles (
        user_id,
        affiliate_code,
        status,
        id_card_number,
        occupation,
        address,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        gen_code,
        'PENDING_REVIEW',
        extracted_id_card,
        extracted_occupation,
        extracted_address,
        NOW(),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- NGUYÊN TẮC TOÀN VẸN (ATOMICITY):
        -- Báo lỗi rõ ràng và làm ROLLBACK toàn bộ transaction.
        -- Tuyệt đối không nuốt lỗi (catch-and-ignore) làm phát sinh auth.users mồ côi không có profile.
        RAISE EXCEPTION 'Khởi tạo hồ sơ người dùng [public.profiles / affiliate_profiles] thất bại cho Auth User ID %: % (Mã lỗi: %)',
            NEW.id, SQLERRM, SQLSTATE
            USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
-- Cấp quyền thực thi cho role quản trị auth của Supabase và service_role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

-- Gắn trigger tự động tạo hồ sơ sau khi INSERT vào auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 3. TRIGGER FUNCTION: TỰ ĐỘNG ĐỒNG BỘ EMAIL KHI USER ĐỔI EMAIL TẠI SUPABASE AUTH
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Đồng bộ email thất bại cho User ID %: %', NEW.id, SQLERRM
            USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_auth_user_email_updated() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.handle_auth_user_email_updated() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        GRANT EXECUTE ON FUNCTION public.handle_auth_user_email_updated() TO supabase_auth_admin;
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.handle_auth_user_email_updated() TO service_role;

-- Gắn trigger đồng bộ email khi UPDATE auth.users
DROP TRIGGER IF EXISTS trg_on_auth_user_updated ON auth.users;
CREATE TRIGGER trg_on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_updated();

-- ==============================================================================
-- 4. BẢO VỆ CHỐNG LEO THANG ĐẶC QUYỀN (ANTI-PRIVILEGE ESCALATION)
-- ==============================================================================

-- 4.1 Chặn tự sửa role và is_active trên profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(30);
BEGIN
    -- Cho phép backend nội bộ (service_role) thực hiện
    IF current_user = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Tra cứu vai trò qua hàm get_auth_role() không đệ quy
    caller_role := public.get_auth_role();

    -- Nếu không phải admin thì TUYỆT ĐỐI KHÔNG được sửa role hoặc is_active
    IF caller_role <> 'admin' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Bị từ chối: Người dùng không được phép tự thay đổi quyền hạn/vai trò (role).'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Bị từ chối: Người dùng không được phép tự thay đổi trạng thái kích hoạt (is_active).'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_profile_privilege_escalation() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 4.2 Chặn CTV tự sửa trạng thái duyệt (status), mã CTV, và thông tin phê duyệt trên affiliate_profiles
CREATE OR REPLACE FUNCTION public.prevent_affiliate_privilege_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role VARCHAR(30);
BEGIN
    IF current_user = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    caller_role := public.get_auth_role();

    IF caller_role NOT IN ('staff', 'admin') THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Bị từ chối: Cộng tác viên không được phép tự duyệt hoặc đổi trạng thái hồ sơ (status).'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code THEN
            RAISE EXCEPTION 'Bị từ chối: Không được phép thay đổi mã CTV (affiliate_code) đã cấp.'
                USING ERRCODE = '42501';
        END IF;

        IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by 
           OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at 
           OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
            RAISE EXCEPTION 'Bị từ chối: Bạn không có quyền can thiệp vào các trường phê duyệt hồ sơ.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.prevent_affiliate_privilege_escalation() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.prevent_affiliate_privilege_escalation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_affiliate_privilege_escalation() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_prevent_affiliate_escalation ON public.affiliate_profiles;
CREATE TRIGGER trg_prevent_affiliate_escalation
BEFORE UPDATE ON public.affiliate_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_affiliate_privilege_escalation();

-- ==============================================================================
-- 5. THỦ TỤC ĐỐI CHIẾU & BỔ SUNG HỒ SƠ CÒN THIẾU (BACKFILL IDEMPOTENT)
-- Chạy lại nhiều lần mà không tạo bản ghi trùng lặp (Safe & Idempotent).
-- Dành cho trường hợp đã có tài khoản Auth tạo trước khi gắn trigger.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_missing_auth_profiles()
RETURNS JSONB AS $$
DECLARE
    missing_profiles_count INTEGER := 0;
    missing_affiliates_count INTEGER := 0;
    rec RECORD;
    gen_code VARCHAR(50);
BEGIN
    -- 1. Bổ sung public.profiles cho các auth.users chưa có hồ sơ
    FOR rec IN 
        SELECT 
            u.id,
            u.email,
            COALESCE(
                NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
                NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
                NULLIF(TRIM(split_part(COALESCE(u.email, ''), '@', 1)), ''),
                'Cộng tác viên'
            ) AS full_name,
            NULLIF(TRIM(u.raw_user_meta_data->>'phone'), '') AS phone,
            u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE p.id IS NULL
    LOOP
        INSERT INTO public.profiles (
            id, email, full_name, phone, role, is_active, created_at, updated_at
        ) VALUES (
            rec.id, rec.email, rec.full_name, rec.phone, 'affiliate', TRUE, rec.created_at, NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        missing_profiles_count := missing_profiles_count + 1;
    END LOOP;

    -- 2. Bổ sung public.affiliate_profiles cho các profiles vai trò 'affiliate' chưa có hồ sơ CTV
    FOR rec IN 
        SELECT 
            p.id,
            p.created_at
        FROM public.profiles p
        LEFT JOIN public.affiliate_profiles ap ON ap.user_id = p.id
        WHERE ap.user_id IS NULL AND p.role = 'affiliate'
    LOOP
        gen_code := public.generate_unique_affiliate_code();

        INSERT INTO public.affiliate_profiles (
            user_id, affiliate_code, status, created_at, updated_at
        ) VALUES (
            rec.id, gen_code, 'PENDING_REVIEW', rec.created_at, NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        missing_affiliates_count := missing_affiliates_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'missing_profiles_synced', missing_profiles_count,
        'missing_affiliates_synced', missing_affiliates_count,
        'executed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION public.sync_missing_auth_profiles() OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.sync_missing_auth_profiles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_missing_auth_profiles() TO service_role;
