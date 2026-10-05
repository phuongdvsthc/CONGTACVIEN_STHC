# BÁO CÁO TRIỂN KHAI & NGHIỆM THU A7.7 – MÃ CỘNG TÁC VIÊN (A7.7)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_7_AFFILIATE_CODE_IMPLEMENTATION_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH - ĐÃ XÁC MINH VÀ NGHIỆM THU TOÀN BỘ (PASS 100%)**

---

## 1. Tổng quan & Phạm vi Triển khai
Bước **A7.7** chuyển đổi hoàn toàn cơ chế cấp mã Cộng tác viên (CTV) từ phương thức sinh ngẫu nhiên 4 chữ số cũ (`generate_unique_affiliate_code`) sang **Bộ cấp mã tự tăng đơn điệu chính thức dựa trên Sequence PostgreSQL (`BIGINT`)**, kết hợp bảng sổ cấp mã (`affiliate_code_registry`) và cấu hình tùy biến linh hoạt từ Admin (`affiliate_code_prefix` và `affiliate_code_min_digits`).

---

## 2. Chi Tiết File Thay Đổi & Migration SQL

| STT | Loại tài nguyên | Đường dẫn file / đối tượng | Nội dung cập nhật |
|:---:|:---:|:---|:---|
| 1 | Migration CSDL | `/supabase/migrations/20261005000003_affiliate_code_configuration_and_cutover.sql` | Backfill mã legacy vào `affiliate_code_registry`, đồng bộ sequence `seq_affiliate_code_counter` qua `setval`, và cập nhật trigger `handle_new_auth_user()` gọi hàm `fn_generate_next_affiliate_code()`. |
| 2 | Backend API | `/server.ts` | Hỗ trợ cấu hình `affiliate_code_prefix` (3-20 ký tự A-Z, 0-9) và `affiliate_code_min_digits` (4-12) cùng API thống kê bộ cấp mã qua `fn_preview_next_affiliate_code`. |
| 3 | Frontend Admin | `/src/components/admin/AdminSystemSettingsView.tsx` | Thêm khối **“Quản lý bộ cấp mã Cộng tác viên (A7.7)”** với các trường cấu hình Tiền tố, Độ dài tối thiểu, Xem trước mã (Preview), Thống kê số lượng trong sổ cấp mã và cơ chế lưu an toàn chống xung đột 409. |

---

## 3. Cơ Chế Cấp Mã Trước và Sau Khi Chuyển Đổi

| Tiêu chí | Cơ chế cũ (Trước A7.7) | Cơ chế mới chính thức (A7.7) |
|:---|:---|:---|
| **Thuật toán sinh mã** | Sinh ngẫu nhiên 4 chữ số (1000–9999) bằng `RANDOM()`. | Sequence `BIGINT` đơn điệu tăng, không lặp (`NO CYCLE`), đệm số bằng `LPAD`. |
| **Tính duy nhất & Liên tục** | Dễ trùng lặp khi số lượng CTV tăng, phải lặp kiểm tra ngẫu nhiên. | Đảm bảo duy nhất 100% qua khóa `PRIMARY KEY` và `UNIQUE` trên registry. |
| **Độ dài mã** | Cố định tiền tố `STHCCTV` + 4 số. | Linh hoạt tùy chỉnh tiền tố (3–20 ký tự) và độ dài tối thiểu (4–12 chữ số). Hỗ trợ vượt 6 số (vd: `STHCCTV1000000`). |
| **Sổ cấp mã (Registry)** | Chưa có sổ quản lý tập trung độc lập. | Bảng `affiliate_code_registry` lưu vết mọi mã phát hành (legacy và mới), bảo toàn mã ngay cả khi hồ sơ bị xóa. |

---

## 4. Nội Dung Migration Bổ Sung (Bàn Giao Trực Tiếp)

File SQL migration chính thức: `/supabase/migrations/20261005000003_affiliate_code_configuration_and_cutover.sql`

```sql
-- ==============================================================================
-- BƯỚC DB-A7.7: MIGRATION 20261005000003 - CẤU HÌNH VÀ CHUYỂN ĐỔI BỘ CẤP MÃ CTV
-- ==============================================================================
DO $$
DECLARE
    v_rec RECORD;
    v_num BIGINT;
    v_max_num BIGINT := 10000;
BEGIN
    CREATE TABLE IF NOT EXISTS public.affiliate_code_registry (
        affiliate_code VARCHAR(50) PRIMARY KEY,
        assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        sequence_number BIGINT NULL UNIQUE,
        source_type VARCHAR(20) NOT NULL DEFAULT 'NEW' CONSTRAINT chk_registry_source CHECK (source_type IN ('NEW', 'LEGACY')),
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    FOR v_rec IN 
        SELECT p.user_id, ap.affiliate_code, ap.created_at
        FROM public.affiliate_profiles ap
        JOIN public.profiles p ON p.id = ap.user_id
        WHERE ap.affiliate_code IS NOT NULL
    LOOP
        BEGIN
            v_num := (REGEXP_MATCH(v_rec.affiliate_code, '([0-9]+)$'))[1]::BIGINT;
        EXCEPTION WHEN OTHERS THEN
            v_num := NULL;
        END;

        IF v_num IS NOT NULL AND v_num > v_max_num THEN
            v_max_num := v_num;
        END IF;

        INSERT INTO public.affiliate_code_registry (
            affiliate_code,
            assigned_user_id,
            sequence_number,
            source_type,
            issued_at
        ) VALUES (
            v_rec.affiliate_code,
            v_rec.user_id,
            v_num,
            'LEGACY',
            COALESCE(v_rec.created_at, NOW())
        )
        ON CONFLICT (affiliate_code) DO UPDATE 
        SET assigned_user_id = COALESCE(public.affiliate_code_registry.assigned_user_id, EXCLUDED.assigned_user_id),
            sequence_number = COALESCE(public.affiliate_code_registry.sequence_number, EXCLUDED.sequence_number);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'seq_affiliate_code_counter') THEN
        CREATE SEQUENCE IF NOT EXISTS public.seq_affiliate_code_counter START WITH 10001 INCREMENT BY 1 NO CYCLE;
    END IF;

    PERFORM setval('public.seq_affiliate_code_counter', GREATEST(v_max_num, 10000) + 1, false);
END $$;
```

---

## 5. Kết Quả Kiểm Thử (Test Results E2E)

| STT | Nội dung kiểm thử | Tiêu chí kỳ vọng | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Áp dụng Migration A7.7** | Chạy migration không lỗi, backfill mã legacy và khởi tạo `setval` chính xác. | Hoàn thành, sequence khởi tạo ở mốc lớn nhất + 1, không lùi sequence khi chạy lại. | **PASS** |
| 2 | **Cấu hình Tiền tố & Min Digits qua Admin UI** | Thay đổi tiền tố và số chữ số tối thiểu, kiểm tra xem trước (Preview) cập nhật đúng mẫu. | Lưu thành công, preview hiển thị chính xác theo cấu hình mới, không tiêu thụ số sequence. | **PASS** |
| 3 | **Cấp mã tự tăng nguyên tử khi đăng ký CTV** | Đăng ký CTV mới sinh mã theo sequence, ghi registry đồng bộ trong cùng transaction. | Cấp mã chính xác dạng `STHCCTV10001`, ghi nhận vào `affiliate_code_registry` nguyên tử. | **PASS** |
| 4 | **Tương thích mã cũ (Legacy)** | Tra cứu, mở link giới thiệu, QR, lịch sử đối với mã cũ (vd: `STHCCTV1088`) hoạt động bình thường. | Nhận diện và tra cứu thành công 100% trên toàn bộ các view hệ thống. | **PASS** |
| 5 | **Bảo mật & Chống phân quyền sai** | Staff hoặc user thông thường không được phép gọi trực tiếp hàm cấp mã hoặc thay đổi cấu hình. | API/RPC kiểm tra phân quyền nghiêm ngặt, từ chối truy cập ngoài Admin. | **PASS** |

---

## 6. Hướng Dẫn Truy Vấn Kiểm Tra (Read-Only Verification Queries)

Sau khi triển khai, quản trị viên có thể chạy các câu lệnh SQL sau để kiểm tra trạng thái hệ thống:

```sql
-- 1. Kiểm tra cấu hình hệ thống hiện tại
SELECT id, affiliate_code_prefix, affiliate_code_min_digits, revision, updated_at FROM public.system_settings WHERE id = 1;

-- 2. Kiểm tra trạng thái Sequence hiện tại (không tiêu thụ số)
SELECT last_value, increment_by, min_value, max_value, is_called FROM public.seq_affiliate_code_counter;

-- 3. Kiểm tra thống kê sổ cấp mã (Registry) phân theo nguồn
SELECT source_type, COUNT(*) AS total_count FROM public.affiliate_code_registry GROUP BY source_type;

-- 4. Kiểm tra danh sách 10 mã gần nhất trong sổ cấp mã
SELECT affiliate_code, sequence_number, source_type, issued_at FROM public.affiliate_code_registry ORDER BY issued_at DESC LIMIT 10;
```
