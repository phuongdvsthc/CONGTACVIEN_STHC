# KẾ HOẠCH TRIỂN KHAI VÀ QUẢN TRỊ MIGRATION CƠ SỞ DỮ LIỆU
## HỆ THỐNG CỘNG TÁC VIÊN TUYỂN SINH - TRƯỜNG SAIGONTOURIST (STHC)

- **Mã tài liệu:** `DB-MIGRATION-PLAN-V1.0`  
- **Mục tiêu:** Cung cấp quy trình thực thi di chuyển dữ liệu (Migration) có thứ tự, an toàn, có khả năng phục hồi lỗi và kiểm thử toàn diện trên Supabase PostgreSQL độc lập.  
- **Nguyên tắc bất biến:** Không can thiệp, không chia sẻ URL/Khóa hay kết nối tới hệ thống Supabase Work + KPI hoặc CSDL tuyển sinh hiện có của Trường Saigontourist. Không dựa vào việc xóa toàn bộ database (DROP DATABASE) để khắc phục sự cố.

---

## 1. DANH MỤC CÁC TỆP MIGRATION & THỨ TỰ THỰC THI

Bộ migration được chia thành 4 tệp cấu trúc tuần tự, 1 tệp dữ liệu mẫu ban đầu (Seed) và 1 tệp kiểm thử tự động:

```
/supabase/
  ├── migrations/
  │   ├── 20260929000001_initial_schema.sql
  │   ├── 20260929000002_permissions_and_rls.sql
  │   ├── 20260929000003_auth_trigger_and_bootstrap.sql
  │   └── 20260929000004_atomic_operations.sql
  ├── seed/
  │   └── seed_courses.sql
  └── tests/
      └── 001_verification_test_suite.sql
```

### Thứ tự thực thi chi tiết:

| Thứ tự | Tên tệp | Mục đích chính | Phụ thuộc |
|:---:|---|---|---|
| **01** | `20260929000001_initial_schema.sql` | Khởi tạo 7 bảng cốt lõi (`profiles`, `affiliate_profiles`, `courses`, `leads`, `lead_reconciliations`, `rewards`, `audit_logs`), các ràng buộc CHECK, khóa ngoại, trigger `updated_at` và 3 chỉ mục duy nhất có điều kiện (Partial Unique Indexes). | `auth.users` của Supabase |
| **02** | `20260929000002_permissions_and_rls.sql` | Thu hồi toàn bộ quyền thô trên các bảng nội bộ đối với `anon` và `authenticated`. Cấp quyền tối thiểu thực tế cho `service_role`. Bật Row Level Security (RLS) trên 100% bảng. | Migration 001 |
| **03** | `20260929000003_auth_trigger_and_bootstrap.sql` | Tạo trigger `handle_new_auth_user` tự động tạo profile và hồ sơ CTV khi đăng ký, trigger chặn người dùng tự sửa `role`/`is_active`/`status`, và hàm an toàn `bootstrap_initial_admin(admin_email)`. | Migration 001, 002 |
| **04** | `20260929000004_atomic_operations.sql` | Tạo 4 hàm PL/pgSQL thao tác nguyên tử: đối soát & sinh thưởng 500k, hủy ghép có bảo toàn lịch sử VOIDED, duyệt thưởng, và từ chối thưởng. | Migration 001, 002, 003 |
| **05** | `seed/seed_courses.sql` | Tách riêng: Nạp danh mục 8 khóa học chuẩn của Trường Saigontourist (Khoa Bếp, Khách sạn, Nhà hàng, Du lịch). **Không trộn vào migration cấu trúc**. | Migration 001 |
| **06** | `tests/001_verification_test_suite.sql` | Bộ kiểm thử tự động chạy trên transaction kiểm tra RLS, chống trùng, hủy ghép và rollback nguyên tử. | Migration 001 ➔ 004 |

---

## 2. RÀ SOÁT CÁC ĐIỂM CHƯA RÕ VÀ THIẾT KẾ RÀNG BUỘC DATABASE

Trước khi ban hành bộ SQL, đội ngũ kỹ thuật đã rà soát và chuyển hóa các điểm nghiệp vụ thành các ràng buộc toàn vẹn cơ sở dữ liệu chặt chẽ:

### 2.1. Phân tích quyền thực tế cần cấp cho `service_role` (Không sao chép máy móc)
* Trong tài liệu ban đầu xuất hiện câu lệnh mẫu `GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`.
* **Rủi ro:** `GRANT ALL` cấp cả quyền DDL như `DROP TABLE`, `TRUNCATE TABLE`, `ALTER TABLE` cho kết nối ứng dụng runtime, vi phạm nguyên tắc đặc quyền tối thiểu (Least Privilege).
* **Chuẩn hóa thực tế tại Migration 002:**
  ```sql
  GRANT USAGE ON SCHEMA public TO service_role;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;
  GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO service_role;
  ```
  Backend API chỉ được thực thi DML (truy vấn, thêm, sửa, xóa dữ liệu) và gọi hàm thủ tục, tuyệt đối không được cấp quyền thay đổi cấu trúc bảng trong lúc ứng dụng đang chạy.

### 2.2. Khóa và chỉ mục duy nhất có điều kiện (Partial Unique Indexes)
1. **Chống 2 lead nhận cùng 1 mã hồ sơ ngoại bộ đang hợp lệ:**
   - Cột: `external_admission_code` trong bảng `lead_reconciliations`.
   - Ràng buộc: `WHERE reconciliation_status = 'MATCHED_VALID'`.
   - Ý nghĩa: Nếu bản ghi đối soát cũ bị hủy (`VOIDED`), mã này lập tức được giải phóng để cán bộ có thể dùng lại cho lead đúng mà không bị lỗi Unique toàn cục.
2. **Ngăn 1 lead có 2 khoản thưởng đang hoạt động:**
   - Cột: `lead_id` trong bảng `rewards`.
   - Ràng buộc: `WHERE status IN ('PENDING_APPROVAL', 'APPROVED')`.
   - Ý nghĩa: Mỗi lead tại một thời điểm chỉ có tối đa 01 khoản thưởng đang được xem xét hoặc đã duyệt. Các khoản thưởng đã bị hủy (`VOIDED`) hoặc từ chối (`REJECTED`) được giữ nguyên trong bảng làm lịch sử.
3. **Ngăn 1 lần đối soát sinh 2 khoản thưởng:**
   - Cột: `reconciliation_id` trong bảng `rewards` được đặt ràng buộc `UNIQUE NOT NULL REFERENCES public.lead_reconciliations(id)`.
   - Ý nghĩa: Đảm bảo quan hệ 1:1 tuyệt đối giữa một lần thẩm định đối soát thành công và một bản ghi thưởng tương ứng.
4. **Ngăn 1 lead có 2 lần đối soát hợp lệ cùng lúc:**
   - Chỉ mục: `uq_valid_recon_per_lead` trên `lead_reconciliations(lead_id) WHERE reconciliation_status = 'MATCHED_VALID'`.

### 2.3. Chống leo thang quyền hạn (Anti-Privilege Escalation)
* Chặn hoàn toàn trường hợp người dùng thông qua Supabase Client SDK gọi lệnh `supabase.from('profiles').update({ role: 'admin' })`.
* Trigger `trg_prevent_profile_escalation` và `trg_prevent_affiliate_escalation` kiểm tra danh tính `auth.uid()`. Nếu người gọi không phải là Admin và không phải `service_role` nội bộ, PostgreSQL sẽ ngay lập tức ném lỗi ngoại lệ mã `42501 (Insufficient Privilege)` và hủy bỏ giao dịch.

### 2.4. Khởi tạo Admin an toàn (Zero-Secret Admin Bootstrap)
* Không ghi bất kỳ địa chỉ email, mật khẩu hay token quản trị nào vào mã nguồn migration.
* Quy trình:
  1. Quản trị viên chỉ định tự tạo tài khoản thông qua giao diện đăng nhập Supabase Auth chuẩn.
  2. Người quản trị cơ sở dữ liệu mở Supabase SQL Editor trong Console và chạy lệnh:
     ```sql
     SELECT public.bootstrap_initial_admin('email_admin_chi_dinh@saigontourist.edu.vn');
     ```
  3. Hàm tự động kiểm tra: nếu hệ thống đã có bất kỳ tài khoản Admin nào trước đó, hàm sẽ từ chối thực thi để ngăn chặn việc chiếm quyền trái phép.

---

## 3. CÁCH KIỂM TRA ĐÃ CHẠY THÀNH CÔNG TỪNG MIGRATION

Sau khi chạy tuần tự từng file migration qua Supabase CLI (`supabase db push` / `supabase migration up`) hoặc SQL Editor, thực hiện các câu truy vấn xác minh tương ứng:

### 3.1. Kiểm tra Migration 001 (Schema)
```sql
-- Kiểm tra đủ 7 bảng cốt lõi:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'affiliate_profiles', 'courses', 'leads', 'lead_reconciliations', 'rewards', 'audit_logs');
-- Kết quả kỳ vọng: 7 dòng

-- Kiểm tra 3 chỉ mục duy nhất có điều kiện:
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN ('uq_valid_external_admission_code', 'uq_valid_recon_per_lead', 'uq_active_reward_per_lead');
-- Kết quả kỳ vọng: 3 chỉ mục với mệnh đề WHERE chính xác
```

### 3.2. Kiểm tra Migration 002 (Permissions & RLS)
```sql
-- Kiểm tra RLS đã được bật trên tất cả các bảng:
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'affiliate_profiles', 'courses', 'leads', 'lead_reconciliations', 'rewards', 'audit_logs');
-- Kết quả kỳ vọng: Cột rowsecurity = true trên cả 7 bảng

-- Kiểm tra anon không có quyền SELECT trên leads:
SELECT has_table_privilege('anon', 'public.leads', 'SELECT');
-- Kết quả kỳ vọng: false
```

### 3.3. Kiểm tra Migration 003 (Triggers & Bootstrap)
```sql
-- Kiểm tra các trigger đã được gắn đúng:
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name IN ('trg_prevent_profile_escalation', 'trg_prevent_affiliate_escalation');
-- Kết quả kỳ vọng: 2 trigger BEFORE UPDATE
```

### 3.4. Kiểm tra Migration 004 (Atomic Operations)
```sql
-- Kiểm tra 4 hàm thủ tục nguyên tử:
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'fn_reconcile_lead_and_create_reward',
    'fn_void_reconciliation_and_reward',
    'fn_approve_reward',
    'fn_reject_reward'
  );
-- Kết quả kỳ vọng: 4 functions
```

---

## 4. QUY TRÌNH XỬ LÝ SỰ CỐ KHI MIGRATION GẶP LỖI (ERROR RECOVERY)

Nguyên tắc bắt buộc: **TUYỆT ĐỐI KHÔNG DROP DATABASE ĐỂ SỬA LỖI**. Mọi lỗi phát sinh phải được xử lý theo quy trình có kiểm soát:

1. **Khi chạy qua Supabase CLI:**
   - Supabase CLI bọc mỗi file migration trong một Transaction riêng biệt. Nếu có lỗi cú pháp hoặc ràng buộc vi phạm, toàn bộ các câu lệnh trong file đó sẽ tự động rollback về trạng thái trước đó.
2. **Quy trình gỡ lỗi từng bước:**
   - **Bước 1 - Xác định mã lỗi:** Đọc thông báo lỗi từ PostgreSQL (ví dụ: `42P01 table does not exist`, `42501 permission denied`, `23505 unique violation`).
   - **Bước 2 - Xác định tệp migration gây lỗi:** Tra cứu phiên bản migration đang dừng tại bảng `supabase_migrations.schema_migrations`.
   - **Bước 3 - Viết migration sửa chữa (Forward Migration):**
     - Nếu lỗi xảy ra trên môi trường Production/Staging đã có dữ liệu, không sửa trực tiếp vào file cũ đã apply. Tạo một file migration mới tiếp theo (ví dụ: `20260929000005_fix_constraint.sql`) để điều chỉnh ràng buộc.
     - Nếu đang trên môi trường Development cục bộ và file chưa commit: sửa trực tiếp file đó sau khi kiểm tra nguyên nhân gốc rễ.
3. **Kịch bản phục hồi đối với dữ liệu dở dang:**
   - Nhờ kiến trúc 4 hàm nguyên tử trong Migration 004, mọi thao tác đối soát/thưởng đều được bọc trong giao dịch `BEGIN ... EXCEPTION ... RAISE`. Nếu có lỗi giữa chừng, CSDL tự động trả về trạng thái nguyên vẹn ban đầu.

---

## 5. KẾ HOẠCH DÀNH CHO CÁC THAY ĐỔI CẦN MIGRATION TIẾP THEO (GIAI ĐOẠN SAU)

Khi Nhà trường phê duyệt các đề xuất trong mục `11.2 (Vấn đề còn cần Trường xem xét & quyết định)` của tài liệu thiết kế kiến trúc, các thay đổi sẽ được đóng gói thành các Migration tương lai:

| Mã đề xuất | Vấn đề chờ Trường quyết định | Kế hoạch Migration tương ứng |
|---|---|---|
| **P-01** | Giới hạn đối tượng CTV (Cựu sinh viên, CB-CNV) | Tạo bảng `affiliate_categories` và thêm cột `category_id` vào `affiliate_profiles`. |
| **P-02** | Chu kỳ chốt sổ và đợt chi trả kế toán | Tạo bảng `payout_cycles` và `payout_batches` (chỉ triển khai khi bước sang Giai đoạn 2). |
| **P-03** | Thời hạn hiệu lực của Lead (vd: 180 ngày) | Thêm trigger hoặc kiểm tra ngày `created_at` của Lead trong `fn_reconcile_lead_and_create_reward`. |
| **P-04** | Khấu trừ thuế TNCN 10% tại nguồn | Thêm các cột `tax_deduction_amount`, `net_amount` vào bảng `rewards`. |

---
*Tài liệu Kế hoạch Migration đã hoàn thành. Hệ thống đang ở trạng thái DỰ THẢO THIẾT KẾ, chưa áp dụng vào bất kỳ cơ sở dữ liệu thực tế nào.*
