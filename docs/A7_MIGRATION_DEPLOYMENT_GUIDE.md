# HƯỚNG DẪN TRIỂN KHAI VÀ QUẢN LÝ MIGRATION MODULE QUẢN TRỊ HỆ THỐNG (A7)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_MIGRATION_DEPLOYMENT_GUIDE.md`  
**Ngày phát hành**: 05/10/2026  
**Trạng thái**: **SẴN SÀNG TRIỂN KHAI (READY FOR DEPLOYMENT)**

---

## 1. Tổng quan Thứ Tự Migration
Toàn bộ các bước migration của module Quản trị hệ thống (A7) phải được thực thi theo đúng thứ tự thời gian tuyến tính sau đây tại môi trường cơ sở dữ liệu Supabase đích:

| STT | Tên file Migration | Mô tả chi tiết nghiệp vụ | Trạng thái phụ thuộc (Dependency) |
|:---:|:---|:---|:---|
| 1 | `20261005000001_create_system_administration_schema_and_rpc.sql` | Khởi tạo bảng `system_settings` (singleton), `system_settings_history`, `system_regulations`, `affiliate_code_registry`, sequence `seq_affiliate_code_counter`, các hàm RPC quản trị và cấu hình Storage bucket `system-assets`. | Nền tảng cơ bản (A7.3) |
| 2 | `20261005000002_affiliate_registration_intent_and_consent.sql` | Tạo bảng `affiliate_registration_intents`, hàm RPC `fn_create_registration_intent`, và cập nhật trigger nguyên tử `handle_new_auth_user()` ghi nhận đồng ý quy chế (`affiliate_regulation_consents`) trong cùng transaction đăng ký. | Phụ thuộc vào A7.3 |
| 3 | `20261005000003_affiliate_code_configuration_and_cutover.sql` | Backfill mã legacy vào `affiliate_code_registry`, khởi tạo/đồng bộ sequence `seq_affiliate_code_counter` qua `setval`, và cập nhật trigger `handle_new_auth_user()` sử dụng hàm cấp mã tự tăng nguyên tử chuẩn `fn_generate_next_affiliate_code()`. | Phụ thuộc vào A7.3 & A7.6 |

---

## 2. Quy Trình Preflight & Kiểm Tra Trước Khi Chạy (Read-Only)
Trước khi thực thi bất kỳ migration nào trên môi trường CSDL mới, quản trị viên bắt buộc phải kiểm tra trạng thái hiện tại qua các câu lệnh read-only sau:

```sql
-- 1. Kiểm tra sự tồn tại của các bảng cốt lõi hệ thống
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('system_settings', 'system_settings_history', 'system_regulations', 'affiliate_code_registry', 'affiliate_registration_intents', 'affiliate_regulation_consents');

-- 2. Kiểm tra trạng thái Sequence bộ cấp mã CTV
SELECT sequence_name, last_value, increment_by, min_value, max_value, is_called 
FROM information_schema.sequences 
WHERE sequence_schema = 'public' AND sequence_name = 'seq_affiliate_code_counter';

-- 3. Kiểm tra cấu hình system_settings hiện tại
SELECT id, affiliate_code_prefix, affiliate_code_min_digits, allow_affiliate_registration, revision 
FROM public.system_settings 
WHERE id = 1;
```

---

## 3. Hướng Dẫn Triển Khai (Deployment Instructions)
1. **Truy cập Supabase Dashboard**: Mở dự án Supabase tương ứng (Development hoặc Staging riêng biệt, **tuyệt đối không chạy trực tiếp trên Production** khi chưa thử nghiệm sandbox).
2. **SQL Editor**: Vào mục **SQL Editor** trong Supabase Dashboard.
3. **Thực thi lần lượt từng file migration**:
   - Dán nội dung file `20261005000001_create_system_administration_schema_and_rpc.sql` và bấm **Run**.
   - Dán nội dung file `20261005000002_affiliate_registration_intent_and_consent.sql` và bấm **Run**.
   - Dán nội dung file `20261005000003_affiliate_code_configuration_and_cutover.sql` và bấm **Run**.
4. **Xác thực sau khi chạy (Postflight Verification)**: Chạy các truy vấn kiểm tra ở mục 4.

---

## 4. Truy Vấn Kiểm Tra Sau Chạy (Postflight Verification Queries)

```sql
-- 1. Kiểm tra trigger handle_new_auth_user đã được gán đúng vào auth.users
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';

-- 2. Kiểm tra số lượng bản ghi đã backfill trong affiliate_code_registry
SELECT source_type, COUNT(*) AS count 
FROM public.affiliate_code_registry 
GROUP BY source_type;

-- 3. Kiểm tra quy chế ACTIVE hiện hành
SELECT id, version_code, title, status, effective_date 
FROM public.system_regulations 
WHERE status = 'ACTIVE';

-- 4. Kiểm tra quyền thực thi RPC functions (SECURITY DEFINER)
SELECT proname, prosecdef, provolatile 
FROM pg_proc 
WHERE proname IN ('fn_generate_next_affiliate_code', 'fn_apply_system_regulation', 'fn_create_registration_intent', 'handle_new_auth_user');
```

---

## 5. Xử Lý Sự Cố & Lưu Ý Vận Hành (Troubleshooting)
- **Xử lý lỗi Trùng lặp Mã Legacy (Duplicate Key)**: Trường hợp dữ liệu cũ có mã trùng lặp, migration A7.7 đã sử dụng `ON CONFLICT (affiliate_code) DO UPDATE` để xử lý idempotent an toàn mà không làm gián đoạn transaction.
- **Sequence và Rollback**: Sequence PostgreSQL (`BIGINT`) không tự lùi lại khi transaction bị rollback hoặc khi khôi phục cấu hình (Rollback). Đây là đặc tính chuẩn của cơ sở dữ liệu quan hệ nhằm đảm bảo tính đơn điệu và hiệu năng cao cho hệ thống phân tán.
- **Bảo mật RPC**: Tất cả các hàm RPC quản trị và sinh mã đều được thiết lập `SECURITY DEFINER` với `search_path = public, pg_temp` và bị thu hồi quyền thực thi từ `PUBLIC`, `anon`, `authenticated` (chỉ cấp cho `service_role` và `supabase_auth_admin` ở trigger auth).
