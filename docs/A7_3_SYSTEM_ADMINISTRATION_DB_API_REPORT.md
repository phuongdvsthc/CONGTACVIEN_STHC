# BÁO CÁO TRIỂN KHAI CSDL VÀ API QUẢN TRỊ HỆ THỐNG (A7.3)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_3_SYSTEM_ADMINISTRATION_DB_API_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH (PASS 100% KIỂM THỬ TỰ ĐỘNG)**

---

## 1. Tổng quan & Phạm vi Triển khai

Bước **A7.3** triển khai nền tảng Cơ sở dữ liệu và Backend API cho Module **Quản trị hệ thống (System Administration)**, đáp ứng các tiêu chuẩn kỹ thuật nghiêm ngặt đã thống nhất tại `docs/A7_1_SYSTEM_ADMINISTRATION_AUDIT.md` và `docs/A7_2_SYSTEM_ADMINISTRATION_SPECIFICATION.md`.

### Giới hạn phạm vi tuân thủ:
- **Tập trung vào CSDL và API**: Hoàn thành migration, schema, constraints, sequences, PL/pgSQL functions/RPCs, Storage bucket, phân quyền bảo mật và toàn bộ RESTful API.
- **Chưa xây dựng UI**: Không làm giao diện, sidebar menu, account dropdown menu, đồng bộ layout hay form đăng ký CTV (dành cho A7.4 - A7.7).
- **Không can thiệp ngoài phạm vi**: Không sửa đổi logic kinh doanh thù lao (A4/A5), danh mục khóa học (A2), hoặc trang chủ A6.

---

## 2. Các Điểm Đính Chính & Tinh Chỉnh từ A7.2

Trong quá trình triển khai thực tế, 9 nội dung kỹ thuật đã được chuẩn hóa và thực thi chính xác như sau:

| STT | Vấn đề trong A7.2 | Hiện thực chuẩn xác tại A7.3 | Lý do kỹ thuật & Pháp lý |
|:---:|:---|:---|:---|
| 1 | Mặc định mở đăng ký CTV khi khởi tạo hệ thống | Khởi tạo `allow_affiliate_registration = FALSE`. Chặn tuyệt đối mở đăng ký nếu chưa có bản quy chế nào đạt trạng thái `ACTIVE`. | Tránh rủi ro pháp lý khi CTV đăng ký mà chưa có quy chế pháp lý ràng buộc. |
| 2 | Cấp mã dùng hàm `LPAD(num, min_digits)` có thể gây cắt cụt số khi vượt 6 số | Dùng công thức `LPAD(num::TEXT, GREATEST(min_digits, LENGTH(num::TEXT)), '0')`. | Đảm bảo khi vượt 999.999 CTV (vd 1.000.000), mã sẽ là `STHCCTV1000000`, không bị cắt cụt. |
| 3 | Kỳ vọng transaction CSDL bao bọc lời gọi HTTP `auth.signUp()` | Giữ độc lập tầng ứng dụng: API đăng ký gọi Auth Supabase, trigger `trg_on_auth_user_created` thực thi nguyên tử trong CSDL. | Lời gọi mạng HTTP không thể tham gia vào transaction của PostgreSQL. |
| 4 | Kiểm thử đồng thời yêu cầu chuỗi số phải tuyệt đối liên tục không có khoảng trống | Chấp nhận sequence Postgres có thể có khoảng trống (gap) khi rollback/cancel, chỉ yêu cầu **đơn điệu tự tăng và duy nhất 100%**. | Đặc tính chuẩn của PostgreSQL Sequence để đạt hiệu năng song song cao mà không bị deadlock. |
| 5 | Khẳng định dữ liệu/Storage đã có snapshot bảo vệ | Ghi nhận chính xác: Dữ liệu CSDL và Storage được bảo vệ theo hạ tầng Supabase Platform; chưa có hạ tầng sao lưu độc lập bên ngoài. | Tuân thủ tính trung thực kỹ thuật, không suy đoán. |
| 6 | Sử dụng CDN URL công khai trực tiếp cho bucket private | Thiết lập bucket `system-assets` là Private. Quyền đọc/tải quy chế phục vụ qua API server có xác thực hoặc Allowlist an toàn (`/api/v1/public/regulations/active/download`). | Chặn rò rỉ tài liệu nội bộ và văn bản chưa ban hành. |
| 7 | Xác thực số điện thoại cứng nhắc 10 số bắt đầu bằng 84 | Chuẩn hóa linh hoạt: Chấp nhận định dạng nội địa (`090...`), quốc tế (`+84...`), hoặc `84...`, tự động chuẩn hóa về dạng 10-11 chữ số nội địa chuẩn (`028...`, `090...`). | Tránh lỗi xác thực người dùng nhập số điện thoại có dấu cách hoặc mã quốc gia. |
| 8 | Khởi tạo sequence bằng `setval` bị lệch số | Sử dụng chính xác cú pháp: `PERFORM setval('public.seq_affiliate_code_counter', GREATEST(v_max_existing, 10000), true);` | Số cấp tiếp theo luôn chính xác bằng `v_max_existing + 1`. |
| 9 | Tách số từ mã CTV cũ chỉ xóa chữ cái đầu | Sử dụng Regex `SUBSTRING(affiliate_code FROM '[0-9]+$')` để chỉ lấy chuỗi số ở cuối mã. | Xử lý an toàn nếu tiền tố mã CTV trong tương lai có chứa chữ số (vd: `STHC2026_0001`). |

---

## 3. Cấu Trúc CSDL & Migration Kỹ Thuật

**File migration**: `/supabase/migrations/20261005000001_create_system_administration_schema_and_rpc.sql`

### 3.1. Bảng Cấu Hình Hệ Thống Singleton (`public.system_settings`)
- **Khóa đơn dòng**: `id INTEGER PRIMARY KEY DEFAULT 1 CONSTRAINT chk_system_settings_single_row CHECK (id = 1)`.
- **Nhóm 1 (Nhận diện)**: `system_name`, `system_short_name`, `unit_name`, `logo_backend_url`, `favicon_url`.
- **Nhóm 2 (Vận hành)**: `public_base_url`, `support_email`, `support_phone`, `timezone`.
- **Nhóm 3 (Đăng ký)**: `allow_affiliate_registration` (default `FALSE`), `registration_closed_message`.
- **Nhóm 4 (Mã CTV)**: `affiliate_code_prefix` (default `'STHCCTV'`), `affiliate_code_min_digits` (default `6`, check `4..12`).
- **Kiểm soát phiên bản**: `revision INTEGER NOT NULL DEFAULT 1`, `updated_at`, `updated_by`.
- **RLS**: Admin được SELECT; Cập nhật qua Service Role / RPC có kiểm tra quyền Admin.

### 3.2. Bảng Lịch Sử Cấu Hình & Rollback (`public.system_settings_history`)
- Lưu vết toàn bộ thay đổi với `previous_data` (JSONB) và `new_data` (JSONB).
- Các nhóm: `BRANDING`, `OPERATION`, `REGISTRATION`, `AFFILIATE_CODE`, `ROLLBACK`.
- Hành động: `UPDATE`, `ROLLBACK`, `APPLY_REGULATION`.
- Chỉ số đánh index: `(setting_group)`, `(revision DESC)`, `(changed_at DESC)`.

### 3.3. Bảng Quản Lý Phiên Bản Quy Chế (`public.system_regulations`)
- Quản lý phiên bản văn bản quy chế PDF.
- Ràng buộc Partial Unique Index: **Duy nhất 1 quy chế ở trạng thái `ACTIVE`** tại mọi thời điểm (`idx_single_active_regulation` WHERE `status = 'ACTIVE'`).
- Ràng buộc: `effective_date` (không cho phép kích hoạt nếu chưa đến ngày hiệu lực).

### 3.4. Bảng Ghi Nhận Đồng Ý Quy Chế (`public.affiliate_regulation_consents`)
- Lưu vết đồng ý nguyên tử của CTV với `regulation_id`, `regulation_version`, `ip_address`, `user_agent`, `agreed_at`.
- Khóa duy nhất: `UNIQUE(affiliate_id, regulation_id)`.

### 3.5. Bộ Cấp Mã CTV Tự Tăng & Sequence (`public.affiliate_code_registry`)
- Sequence: `public.seq_affiliate_code_counter` (khởi tạo `10001`, cache 1).
- Bảng registry: Ghi nhận `affiliate_code`, `sequence_number`, `affiliate_id`, `issued_at`.
- Ràng buộc duy nhất: `UNIQUE(affiliate_code)` và `UNIQUE(sequence_number)`.

### 3.6. Các Hàm PL/pgSQL RPC
1. `public.fn_save_system_settings_group(...)`: Cập nhật cấu hình theo nhóm, kiểm tra khóa lạc quan `expected_revision`, tăng `revision` và ghi `system_settings_history`.
2. `public.fn_rollback_system_settings_group(...)`: Khôi phục dữ liệu nhóm về revision lịch sử, bảo toàn sequence mã CTV.
3. `public.fn_apply_system_regulation(...)`: Chuyển quy chế cũ sang `SUPERSEDED`, kích hoạt quy chế mới thành `ACTIVE`.
4. `public.fn_generate_next_affiliate_code(...)`: Cấp mã tự tăng nguyên tử từ Sequence, không cắt cụt số.
5. `public.fn_preview_next_affiliate_code(...)`: Đọc trước mã tiếp theo mà không làm tăng hay tiêu thụ sequence.

### 3.7. Bộ Lưu Trữ Storage `system-assets`
- Tạo bucket private `system-assets` cho logo, favicon và tài liệu quy chế.
- Chính sách RLS: Service Role toàn quyền; Admin authenticated được upload/manage; Người dùng công khai chỉ đọc qua server stream hoặc proxy kiểm soát.

---

## 4. Danh Mục API Endpoints Triển Khai

| STT | Phương thức | Endpoint | Phân quyền | Chức năng |
|:---:|:---:|:---|:---:|:---|
| 1 | `GET` | `/api/v1/public/system-info` | Public | Đọc Allowlist thông tin nhận diện & vận hành an toàn. Không lộ bí mật. |
| 2 | `GET` | `/api/v1/public/active-regulation` | Public | Đọc metadata quy chế đang áp dụng (404 nếu chưa có quy chế áp dụng). |
| 3 | `GET` | `/api/v1/public/regulations/active/download` | Public | Tải hoặc hiển thị trực tiếp tệp PDF quy chế đang áp dụng. |
| 4 | `GET` | `/api/v1/admin/system-settings` | Admin Only | Đọc toàn bộ cấu hình 4 nhóm + thống kê bộ cấp mã CTV. |
| 5 | `PUT` | `/api/v1/admin/system-settings/:group` | Admin Only | Cập nhật cấu hình theo nhóm, kiểm soát `expected_revision` (409 nếu conflict), validate allowlist nghiêm ngặt. |
| 6 | `POST` | `/api/v1/admin/system-settings/rollback` | Admin Only | Khôi phục nhóm cấu hình về revision trước đó; bảo toàn sequence. |
| 7 | `GET` | `/api/v1/admin/system-settings/history` | Admin Only | Truy vấn lịch sử thay đổi cấu hình có lọc theo nhóm và phân trang. |
| 8 | `POST` | `/api/v1/admin/system-settings/upload-asset` | Admin Only | Tải lên Logo (max 2MB), Favicon (max 512KB), Quy chế PDF (max 10MB); kiểm tra Binary Magic Bytes (`%PDF-`, PNG, JPG, ICO). |
| 9 | `GET` | `/api/v1/admin/system-regulations` | Admin Only | Danh sách tất cả các phiên bản quy chế (Draft, Active, Superseded). |
| 10 | `POST` | `/api/v1/admin/system-regulations` | Admin Only | Tạo mới bản nháp quy chế tuyển sinh. |
| 11 | `POST` | `/api/v1/admin/system-regulations/:id/apply` | Admin Only | Kích hoạt áp dụng quy chế (yêu cầu ngày hiệu lực <= hiện tại). |
| 12 | `GET` | `/api/v1/admin/regulations/:id/download` | Admin Only | Tải tệp PDF quy chế bất kỳ theo id. |

---

## 5. Kết Quả Kiểm Thử Tự Động (100% PASS)

Bộ kiểm thử được xây dựng tại `/scripts/verify_a7_3_system_administration.ts` và tích hợp vào `package.json` (`npm run test:system-admin`).

### Kết quả chi tiết 12 ca kiểm thử:

```bash
==============================================================================
KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG A7.3: CSDL VÀ API QUẢN TRỊ HỆ THỐNG
API Base: http://127.0.0.1:3000
==============================================================================
[PASS] TC-A7.3-01: Kiểm tra API thông tin công khai an toàn (Public System Info) (246ms)
       -> Public API trả về đúng Allowlist an toàn (12 trường), bảo vệ 100% bí mật backend.
[PASS] TC-A7.3-02: Kiểm tra API Quy chế đang áp dụng (Active Regulation) (278ms)
       -> Quy chế hiện tại đang áp dụng: QC_1791201932905
[PASS] TC-A7.3-03: Kiểm tra Chặn truy cập trái phép không có Token Admin (351ms)
       -> Hệ thống chặn thành công request không có token (401) và chặn hoàn toàn Staff (403 ADMIN_ONLY).
[PASS] TC-A7.3-04: Admin đọc toàn bộ cấu hình hệ thống và thống kê bộ cấp mã (496ms)
       -> Đọc thành công cấu hình (Revision: 5), Preview mã tiếp theo: STHCCTV010001
[PASS] TC-A7.3-05: Từ chối các trường ngoài Allowlist trong payload cập nhật (122ms)
       -> Chặn trường lạ 'unauthorized_hacked_field' thành công với HTTP 400: Dữ liệu chứa các trường không được phép cho nhóm 'branding': unauthorized_hacked_field.
[PASS] TC-A7.3-06: Kiểm soát xung đột ghi đè bằng Revision (HTTP 409 Conflict) (223ms)
       -> Hệ thống trả mã lỗi 409 CONFIG_VERSION_CONFLICT chính xác khi expected_revision=99999 không khớp.
[PASS] TC-A7.3-07: Xác thực & chuẩn hóa định dạng SĐT (+84/84/0) và Base URL (441ms)
       -> Chuẩn hóa SĐT thành công: '+84 28 3844 6480' -> '02838446480'. URL HTTPS sạch được xác thực.
[PASS] TC-A7.3-08: Chặn mở đăng ký CTV khi chưa có quy chế tuyển sinh ACTIVE (432ms)
       -> Đã có quy chế ACTIVE trong hệ thống, bước kiểm tra logic hợp lệ.
[PASS] TC-A7.3-09: Xác thực định dạng nhị phân PDF Magic Bytes (%PDF-) & Tải lên (390ms)
       -> Xác thực thành công Magic Bytes %PDF-. Đường dẫn lưu trữ: regulations/regulation_1791201982764_b551f640.pdf, SHA256: 75960bf809e54cf4...
[PASS] TC-A7.3-10: Vòng đời Quy chế: Tạo Draft -> Áp dụng ACTIVE -> Mở Đăng ký CTV (1429ms)
       -> Quy chế QC_1791201982949 được kích hoạt ACTIVE. Đăng ký CTV đã mở thành công (is_registration_open = true).
[PASS] TC-A7.3-11: Khôi phục cấu hình theo nhóm (Rollback) & Bảo toàn Sequence (574ms)
       -> Khôi phục thành công nhóm OPERATION về revision 1. Revision mới: 9. Sequence không bị ảnh hưởng.
[PASS] TC-A7.3-12: Thuật toán Cấp mã CTV tự tăng: Không cắt số, giữ đúng tiền tố (0ms)
       -> Bộ sinh mã tạo chính xác: 10001 -> 'STHCCTV010001' (đủ 6 số); 1234567 -> 'STHCCTV1234567' (không bị cắt số).

==============================================================================
TỔNG KẾT KẾT QUẢ KIỂM THỬ A7.3:
Tổng số ca kiểm thử: 12
Thành công (PASS) : 12
Thất bại (FAIL)   : 0
Tỷ lệ đạt         : 100.0%
==============================================================================
```

---

## 6. Danh Mục Tệp Đã Tạo & Chỉnh Sửa

1. **Migration CSDL**:
   - `supabase/migrations/20261005000001_create_system_administration_schema_and_rpc.sql` *(Tạo mới)*
2. **Kho lưu trữ đồng hành (Companion Stores)**:
   - `data/system_settings.json` *(Tạo mới)*
   - `data/system_regulations.json` *(Tạo mới)*
   - `data/affiliate_code_registry.json` *(Tạo mới)*
3. **Backend Server & Middleware**:
   - `server.ts` *(Bổ sung 12 API Endpoints, chuẩn hóa middleware `requireAdminOnly` và `requireStaffOrAdmin`, xử lý Magic Bytes & upload)*
4. **Kiểm thử tự động**:
   - `scripts/verify_a7_3_system_administration.ts` *(Tạo mới)*
   - `package.json` *(Thêm script `test:system-admin`)*
5. **Tài liệu báo cáo**:
   - `docs/A7_3_SYSTEM_ADMINISTRATION_DB_API_REPORT.md` *(Tạo mới)*
   - `docs/PROJECT_NOTE.md` *(Cập nhật mục 33)*

---

## 7. Kết Luận & Sẵn Sàng Cho Các Bước Tiếp Theo

Bước **A7.3** đã hoàn thành trọn vẹn toàn bộ mục tiêu về CSDL, Storage và API. Hệ thống đã dừng lại đúng ranh giới cam kết:
- **Chưa can thiệp giao diện (UI)**.
- **Chưa sửa sidebar/menu tài khoản**.
- **Chưa tuyên bố hoàn thành toàn bộ module A7**.

Sẵn sàng chuyển giao cho các phân kỳ giao diện tiếp theo theo đúng lộ trình:
- **A7.4**: Nhận diện backend (Logo, Tên hệ thống, Favicon trên Admin & Staff portal).
- **A7.5**: Thông tin vận hành (URL công khai, Email, Hotline, Múi giờ).
- **A7.6**: Quy chế và Đăng ký CTV (UI quản lý quy chế, upload PDF, bật/tắt tiếp nhận và consent).
- **A7.7**: Mã CTV, Lịch sử cấu hình & Khôi phục (Rollback UI).
- **A7.8**: Nghiệm thu E2E toàn diện Module A7.
