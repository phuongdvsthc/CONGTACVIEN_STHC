# TÀI LIỆU BÀN GIAO DB-C: ĐỒNG BỘ SUPABASE AUTH & BOOTSTRAP ADMIN ĐẦU TIÊN
**Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)**  
**Mã dự án nội bộ:** `STHC-CTV-DB-C`  
**Ngày thực hiện:** 29/09/2026  
**Môi trường thực hiện:** Supabase PostgreSQL độc lập dành riêng cho Hệ thống CTV (Tuyệt đối không dùng chung hoặc ảnh hưởng CSDL Work + KPI)

---

## I. ĐỐI CHIẾU SCHEMA VÀ PHÂN QUYỀN VỚI MIGRATION 001–002 ĐÃ ÁP DỤNG

### 1. Hiện trạng các bảng và chính sách bảo toàn dữ liệu (Migration 001)
- **7 bảng nghiệp vụ cốt lõi:** `profiles`, `affiliate_profiles`, `courses`, `leads`, `lead_reconciliations`, `rewards`, `audit_logs`.
- **Ràng buộc toàn vẹn & Chống xóa dây chuyền (Cascading Delete Prevention):**
  - `affiliate_profiles.user_id REFERENCES profiles(id) ON DELETE RESTRICT`: Ngăn xóa người dùng khi đã có hồ sơ CTV.
  - `leads.affiliate_id REFERENCES affiliate_profiles(id) ON DELETE RESTRICT`: Ngăn xóa CTV khi đã có dữ liệu ứng viên tuyển sinh.
  - `lead_reconciliations.lead_id` và `rewards.lead_id ON DELETE RESTRICT`: Ngăn xóa lead khi đã phát sinh lịch sử đối soát và thưởng.
  - Khóa ngoại kết hợp `(reconciliation_id, lead_id)` đảm bảo thưởng luôn khớp 100% với lần đối soát của chính lead đó.
  - Các Partial Unique Indexes (`uq_valid_external_admission_code`, `uq_valid_recon_per_lead`, `uq_active_reward_per_lead`) bảo đảm tính duy nhất tuyệt đối theo trạng thái nghiệp vụ.

### 2. Hiện trạng phân quyền và Row Level Security (Migration 002)
- **Hàm `get_auth_role()`:** Thuộc quyền sở hữu `postgres` (`OWNER TO postgres`), `SECURITY DEFINER`, `SET search_path = public, pg_temp`. Đã thu hồi quyền gọi từ `PUBLIC` và `anon`; chỉ cấp quyền cho `authenticated` và `service_role`. Đọc bảng `profiles` trực tiếp ở mức heap mà không kích hoạt đệ quy RLS.
- **Nguyên tắc quyền tối thiểu:**
  - Thu hồi toàn bộ quyền ghi (`INSERT, UPDATE, DELETE`) từ role `authenticated` trên tất cả 7 bảng. Mọi thao tác ghi dữ liệu nghiệp vụ bắt buộc đi qua Backend API server (`service_role`).
  - Khách vãng lai (`anon`) chỉ được `SELECT` các khóa học đang mở (`courses.is_active = TRUE`).
  - CTV (`authenticated`) chỉ được `SELECT` hồ sơ cá nhân của mình tại `profiles` và `affiliate_profiles`. Truy vấn trực tiếp các bảng nghiệp vụ (`leads`, `lead_reconciliations`, `rewards`, `audit_logs`) đều bị RLS chặn hoặc trả về 0 dòng.
  - Nhật ký kiểm toán `audit_logs` chỉ duy nhất tài khoản có vai trò `admin` mới được đọc.

---

## II. CHI TIẾT THIẾT KẾ C1: MIGRATION 003_AUTH_PROFILE_SYNC.SQL

Mã file áp dụng: `/supabase/migrations/20260929000003_auth_profile_sync.sql`

### 1. Chuẩn hóa Mã Cộng tác viên (Affiliate Code)
- **Cấu trúc:** `STHCCTVXXXX` (viết liền, không có dấu `-`, gồm tiền tố cố định `STHCCTV` và 4 chữ số ngẫu nhiên từ 1000 đến 9999).
- **Hàm sinh mã:** `public.generate_unique_affiliate_code()` kiểm tra vòng lặp chống trùng lặp mã trong bảng `affiliate_profiles`.
- **Hiệu lực của mã:** Mã chỉ có hiệu lực sử dụng khi hồ sơ CTV được cán bộ duyệt chuyển sang trạng thái `ACTIVE`. Khi mới khởi tạo, hồ sơ luôn ở trạng thái `PENDING_REVIEW`.

### 2. Trigger tự động tạo hồ sơ khi người dùng đăng ký (`handle_new_auth_user`)
- Gắn trigger `trg_on_auth_user_created` kiểu `AFTER INSERT ON auth.users`.
- **Chống leo thang đặc quyền từ Metadata (Anti-Forged Metadata):**
  - Bỏ qua hoàn toàn các thuộc tính `role`, `status`, `affiliate_code`, `is_active` mà client gửi lên trong `raw_user_meta_data`.
  - Cố định cứng trong SQL: `profiles.role = 'affiliate'`, `profiles.is_active = TRUE`.
  - Cố định cứng trong SQL: `affiliate_profiles.status = 'PENDING_REVIEW'`.
  - Mã CTV được sinh bằng hàm hệ thống, không lấy từ client.
- **Xử lý trích xuất thông tin an toàn:**
  - Họ tên: Ưu tiên `full_name` -> `name` -> phần tiền tố trước ký tự `@` của email -> mặc định `'Cộng tác viên'`. Thao tác đăng ký không bao giờ bị gián đoạn do thiếu họ tên.
  - Số điện thoại, CCCD, nghề nghiệp, địa chỉ: Trích xuất nếu có, nếu không thì lưu `NULL`.
- **Đảm bảo tính toàn vẹn (Transaction Atomicity):**
  - Hàm sử dụng khối `EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION ...`.
  - Nếu quá trình ghi vào `profiles` hoặc `affiliate_profiles` gặp bất kỳ lỗi nào, transaction của lệnh `INSERT` vào `auth.users` sẽ lập tức bị **ROLLBACK** hoàn toàn. Không bao giờ xảy ra tình trạng Auth user được tạo mà không có hồ sơ (trạng thái nửa chừng / orphaned user).
- **Phân quyền và bảo mật hàm:**
  - `SECURITY DEFINER SET search_path = public, pg_temp`.
  - `OWNER TO postgres`.
  - Thu hồi quyền thực thi từ `PUBLIC, anon, authenticated`.
  - Chỉ cấp quyền thực thi cho `supabase_auth_admin` và `service_role`. Ngăn chặn hoàn toàn việc gọi trực tiếp hàm này qua PostgREST Data API.

### 3. Đồng bộ khi thay đổi Email (`handle_auth_user_email_updated`)
- Gắn trigger `trg_on_auth_user_updated` kiểu `AFTER UPDATE ON auth.users`.
- Khi người dùng đổi email và xác thực thành công tại Supabase Auth (`NEW.email IS DISTINCT FROM OLD.email`), trigger tự động cập nhật trường `email` và `updated_at` trong `public.profiles` để bảo đảm tính nhất quán dữ liệu giữa Auth và Profile.

### 4. Bộ trigger bảo vệ chống leo thang đặc quyền (Anti-Privilege Escalation)
- `trg_prevent_profile_escalation` trên `public.profiles`: Chặn bất kỳ ai không phải `admin` (hoặc `service_role`) tự sửa trường `role` hoặc `is_active`.
- `trg_prevent_affiliate_escalation` trên `public.affiliate_profiles`: Chặn CTV tự sửa trạng thái xét duyệt `status`, `affiliate_code`, hoặc các trường thông tin duyệt (`reviewed_by`, `reviewed_at`, `review_note`).

### 5. Thủ tục đối chiếu và bổ sung hồ sơ cũ (`sync_missing_auth_profiles`)
- Cung cấp thủ tục idempotent: Duyệt qua toàn bộ `auth.users` chưa có `profiles`, tự động bù `profiles` và `affiliate_profiles`.
- Sử dụng mệnh đề `ON CONFLICT (id) DO NOTHING` và `ON CONFLICT (user_id) DO NOTHING`.
- Chạy lại nhiều lần an toàn tuyệt đối mà không gây lỗi hoặc tạo bản ghi trùng lặp.

---

## III. CHI TIẾT THIẾT KẾ C2: BOOTSTRAP ADMIN ĐẦU TIÊN

Mã file script: `/scripts/bootstrap_admin.ts`

### 1. Nguyên tắc thiết kế Zero-Secret
- Tuyệt đối không ghi cứng URL, Service Key, email hay mật khẩu vào mã nguồn, log hoặc tài liệu.
- Script đọc cấu hình từ biến môi trường `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOTSTRAP_ADMIN_EMAIL` hoặc cho phép nhập từ giao diện dòng lệnh lúc thực thi.
- Cảnh báo và chặn đứng nếu phát hiện email mặc định `admin@sthc.edu.vn` (tài khoản thuộc hệ thống Work + KPI).

### 2. Quy trình thực thi kiểm soát chặt chẽ
1. **Kiểm tra môi trường:** Trích xuất và in mã định danh dự án (`Project Ref / Project ID`) từ URL.
2. **Liệt kê danh sách Admin hiện hữu:** Tra cứu trong `public.profiles` xem đã có tài khoản Admin nào chưa.
3. **Kiểm tra Idempotency:** Nếu tài khoản chỉ định đã mang vai trò `admin`, script thông báo đạt và kết thúc ngay mà không can thiệp thêm.
4. **Tra cứu/Khởi tạo tại Auth:**
   - Nếu tài khoản chưa có trong `auth.users`: Tạo mới qua Supabase Auth Admin API (`supabase.auth.admin.createUser`) với email đã xác nhận (`email_confirm: true`). Trigger database sẽ tự động sinh `profiles` và `affiliate_profiles`.
   - Nếu tài khoản đã có trong `auth.users`: Lấy đúng User ID hiện hữu, không tạo tài khoản thứ hai.
5. **Nâng quyền đích danh theo User ID:**
   - Cập nhật đúng `id = target_user_id` sang `role = 'admin'`, `is_active = TRUE`.
   - Cập nhật hồ sơ CTV tương ứng sang `status = 'ACTIVE'`.
   - Ghi lại nhật ký kiểm toán vào bảng `public.audit_logs`.
6. **Xác minh hậu kiểm (Post-Verification):** Truy vấn lại bản ghi `profiles` để cam kết `role === 'admin'` và `is_active === true`.

---

## IV. BẢNG TỔNG HỢP KẾT QUẢ NGHIỆM THU (ACCEPTANCE TEST REPORT)

| Mã ca kiểm thử | Mô tả kịch bản kiểm thử | Kết quả kỳ vọng | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- | :---: |
| **TC-C1.1** | Đăng ký CTV kèm metadata giả `role=admin` | Hệ thống bỏ qua role giả mạo, gán cứng `role = 'affiliate'`, `is_active = true` | `role = affiliate, is_active = true` | **PASS** |
| **TC-C1.2** | Đăng ký CTV kèm metadata giả `status=ACTIVE` | Hệ thống bỏ qua status giả mạo, gán cứng `status = 'PENDING_REVIEW'` | `status = PENDING_REVIEW` | **PASS** |
| **TC-C1.3** | Đăng ký CTV kèm metadata giả `affiliate_code` | Hệ thống bỏ qua mã giả, tự sinh mã định dạng `STHCCTVXXXX` | Mã sinh dạng `STHCCTV5821`, khác mã giả gửi lên | **PASS** |
| **TC-C2.1** | CTV đăng nhập JWT và tự gọi API sửa `profiles.role` | Trigger `trg_prevent_profile_escalation` chặn với mã lỗi `42501` | Lỗi 42501: Người dùng không được phép tự thay đổi role | **PASS** |
| **TC-C2.2** | CTV tự gọi API sửa `affiliate_profiles.status` | Trigger `trg_prevent_affiliate_escalation` chặn với mã lỗi `42501` | Lỗi 42501: CTV không được phép tự duyệt status | **PASS** |
| **TC-C3.1** | Chạy script bootstrap Admin thử nghiệm bằng User ID | Nâng quyền đúng đích danh tài khoản thành `role = 'admin'` | `role = admin, is_active = true`, có vết `audit_logs` | **PASS** |
| **TC-C4.1** | Chạy lại script bootstrap lần 2 (Idempotency) | Phát hiện tài khoản đã là Admin, không tạo trùng lặp | Báo IDEMPOTENT PASS, số lượng tài khoản giữ nguyên 1 | **PASS** |
| **TC-C5.1** | CTV cố gắng đọc bảng `audit_logs` qua PostgREST | RLS chặn hoàn toàn hoặc trả về rỗng | RLS chặn truy vấn, không lộ lịch sử kiểm toán | **PASS** |
| **TC-C5.2** | Đổi email trên Auth user đồng bộ sang Profiles | `profiles.email` tự động cập nhật theo `auth.users.email` | `profiles.email` cập nhật thành công qua trigger | **PASS** |

---

## V. HƯỚNG DẪN THỰC THI TRÊN DỰ ÁN SUPABASE THỬ NGHIỆM

### Bước 1: Áp dụng Migration 003 vào Database
Mở **Supabase Dashboard** -> chọn đúng **Project thử nghiệm CTV** -> mở **SQL Editor**:
- Mở file `/supabase/migrations/20260929000003_auth_profile_sync.sql`.
- Copy toàn bộ nội dung dán vào SQL Editor và nhấn **RUN**.
- Nếu dự án đã có sẵn các user đăng ký trước đó, chạy thủ tục đối chiếu bù hồ sơ:
  ```sql
  SELECT public.sync_missing_auth_profiles();
  ```

### Bước 2: Chạy kiểm thử tự động trong SQL Editor (Tùy chọn xác nhận nhanh)
- Mở file `/supabase/tests/003_auth_sync_and_bootstrap_test.sql`.
- Dán vào SQL Editor và nhấn **RUN**. Script sẽ chạy toàn bộ các ca kiểm tra trong một `BEGIN ... ROLLBACK` transaction an toàn và in thông báo `PASS 100%`.

### Bước 3: Chạy Script Bootstrap Admin từ Server
Trên máy chủ quản trị hoặc môi trường terminal an toàn:
1. Thiết lập biến môi trường kết nối:
   ```bash
   export SUPABASE_URL="https://<project-id-ctv>.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="<service-role-secret-key-cua-ctv>"
   ```
2. Thực thi script nâng quyền tài khoản Admin thử nghiệm:
   ```bash
   # Cách 1: Truyền tham số trực tiếp qua lệnh
   npx tsx scripts/bootstrap_admin.ts --email=admin-ctv-test@domain.edu.vn --name="Quản trị viên Thử nghiệm"

   # Cách 2: Chạy tương tác (Script sẽ hỏi email nếu chưa cung cấp)
   npm run bootstrap:admin
   ```
3. Chạy lại lệnh trên một lần nữa để xác nhận tính năng chống tạo trùng:
   ```bash
   npm run bootstrap:admin -- --email=admin-ctv-test@domain.edu.vn
   # Kết quả: [KẾT QUẢ: IDEMPOTENT PASS]
   ```

### Bước 4: Chạy bộ kiểm thử tự động toàn diện qua Node.js Client
```bash
npm run test:auth-bootstrap
```
Bộ kiểm thử sẽ tự động tạo CTV với metadata giả mạo, xác nhận bị vô hiệu hóa, thử nghiệm leo thang đặc quyền, kiểm tra nâng quyền Admin và tự động dọn dẹp dữ liệu thử nghiệm.

---

## VI. XỬ LÝ LỖI 42501 KHI NÂNG QUYỀN ADMIN TRONG SQL EDITOR & MIGRATION 005

### 1. Phân tích nguyên nhân gốc rễ (Root Cause Analysis từ ảnh chụp)
Khi thực hiện lệnh sau trong Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin', is_active = true
WHERE id = '879a11fc-ff89-4019-b2f4-57d7843b631b'::uuid
RETURNING id, email, full_name, role, is_active;
```
Bị báo lỗi:
`ERROR: 42501: Bị từ chối: Người dùng không được phép tự thay đổi quyền hạn/vai trò (role).`
`CONTEXT: PL/pgSQL function prevent_profile_privilege_escalation() line 16 at RAISE`

**Lý do:**
1. Trong Supabase SQL Editor, phiên làm việc chạy dưới quyền người dùng CSDL `postgres` (hoặc `supabase_admin`).
2. Trigger `prevent_profile_privilege_escalation()` trước đó chỉ cho phép:
   `IF current_user = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN RETURN NEW; END IF;`
3. Vì `current_user` là `'postgres'`, điều kiện trên không khớp.
4. Hàm tiếp tục gọi `public.get_auth_role()`, hàm này dùng `auth.uid()`. Trong SQL Editor không có phiên Supabase Auth JWT nên `auth.uid()` trả về `NULL`.
5. `get_auth_role()` trả về `'none'`. So sánh `'none' <> 'admin'` là `TRUE`, kích hoạt lệnh `RAISE EXCEPTION` chặn cập nhật role (lỗi 42501).

### 2. Giải pháp Migration 005 (`20260929000005_controlled_admin_bootstrap.sql`)
1. **Không tắt trigger, không nới lỏng RLS cho CTV:** Khi CTV kết nối qua Data API / JWT, role luôn là `'authenticated'`, cờ session rỗng nên 100% vẫn bị chặn nếu cố tình sửa role/is_active.
2. **Cập nhật trigger hỗ trợ phiên DBA/postgres:** Thêm `current_user IN ('postgres', 'supabase_admin', 'service_role')` và cờ phiên `app.is_admin_bootstrap = 'on'`.
3. **Cung cấp RPC quản trị an toàn:** `public.admin_bootstrap_user(target_user_id, expected_email, reason)`. Hàm xác minh UID khớp với email dự kiến, ghi `audit_logs`, idempotent và trả về `(id, email, role, is_active)`.

### 3. Hướng dẫn nâng quyền cho UID `879a11fc-ff89-4019-b2f4-57d7843b631b`
- **Cách 1: Chạy trực tiếp trong Supabase SQL Editor:**
  1. Chạy file `/supabase/migrations/20260929000005_controlled_admin_bootstrap.sql`.
  2. Chạy kịch bản `/supabase/tests/004_bootstrap_target_admin_editor.sql`.
- **Cách 2: Chạy từ terminal qua Node.js Script:**
  ```bash
  npm run bootstrap:target -- --uid=879a11fc-ff89-4019-b2f4-57d7843b631b
  ```
  Script sẽ:
  - Báo rõ UID và email gắn với UID trước khi thực hiện.
  - Nâng quyền và ghi vết vào `audit_logs`.
  - Trả về bảng 4 trường: `id`, `email`, `role`, `is_active`.
  - Chạy lại an toàn không tạo trùng.

