# BÁO CÁO TRIỂN KHAI VÀ NGHIỆM THU A7.7 – MÃ CỘNG TÁC VIÊN & CẤU HÌNH HỆ THỐNG
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_7_AFFILIATE_CODE_IMPLEMENTATION_REPORT.md`  
**Trạng thái**: ĐÃ HOÀN THÀNH & ĐẠT KIỂM THỬ THỰC TẾ (PASS 100%)

---

## 1. Mục tiêu và Phạm vi A7.7
Mô-đun A7.7 triển khai cơ chế cấp mã cộng tác viên (CTV) tự tăng nguyên tử (`fn_generate_next_affiliate_code`), bảng quản lý sổ cấp mã (`affiliate_code_registry`), tích hợp cấu hình tiền tố (Prefix) & độ dài tối thiểu (Min Digits) trong quản trị hệ thống (`AdminSystemSettingsView`), đồng thời chuyển đổi từ cơ chế sinh ngẫu nhiên sang hệ thống cấp mã tuần tự chuẩn có backfill dữ liệu legacy an toàn.

---

## 2. Kiến trúc Kỹ thuật & Triển khai CSDL

### 2.1. Sổ cấp mã & Sequence nguyên tử
- **Sequence**: `public.seq_affiliate_code_counter` khởi tạo bắt đầu từ `10001` (hoặc đồng bộ tự động qua `setval` dựa trên mã legacy lớn nhất trong hệ thống).
- **Bảng Registry**: `public.affiliate_code_registry`
  - `affiliate_code` (VARCHAR(50), PRIMARY KEY)
  - `assigned_user_id` (UUID, FOREIGN KEY tới `profiles.id`)
  - `sequence_number` (BIGINT, UNIQUE)
  - `source_type` (VARCHAR(20): `'NEW'` hoặc `'LEGACY'`)
  - `issued_at` (TIMESTAMPTZ)

### 2.2. Hàm cấp mã nguyên tử
Hàm PL/pgSQL `public.fn_generate_next_affiliate_code(p_assigned_user_id UUID)`:
1. Đọc cấu hình `affiliate_code_prefix` và `affiliate_code_min_digits` từ `public.system_settings` (id = 1).
2. Lấy số tiếp theo từ `nextval('public.seq_affiliate_code_counter')`.
3. Đệm số bằng `LPAD` với số chữ số tối thiểu đảm bảo không bị cắt cụt.
4. Ghi nhận vào `affiliate_code_registry` trong cùng một transaction CSDL.
5. Trả về cấu trúc JSON chứa mã CTV, sequence number và metadata.

### 2.3. Cắt chuyển (Cutover) qua Auth Trigger
Trigger `public.handle_new_auth_user()` trong quá trình tạo tài khoản Auth + Profile + Affiliate Profile đã được chuyển đổi hoàn toàn sang gọi hàm `fn_generate_next_affiliate_code(NEW.id)`, thay thế hoàn toàn cơ chế sinh ngẫu nhiên cũ.

---

## 3. Giao diện Quản trị & API Cấu hình
- **Giao diện**: Khối **"Quản lý bộ cấp mã Cộng tác viên (A7.7)"** tại `/admin/system-settings` cho phép:
  - Cấu hình tiền tố (`affiliate_code_prefix`) (chỉ chữ in hoa và số, 3-20 ký tự).
  - Cấu hình số chữ số tối thiểu (`affiliate_code_min_digits`) (4 đến 12).
  - Xem thống kê tổng số mã đã cấp trong sổ cấp mã (`code_generator_stats`).
  - Kiểm tra tính hợp lệ và ghi lịch sử cấu hình kèm cơ chế kiểm soát xung đột (Optimistic Concurrency Control với `revision`).
- **API Backend**:
  - `GET /api/v1/admin/system-settings`: Trả về thông tin cấu hình và thống kê `code_generator_stats`.
  - `PUT /api/v1/admin/system-settings/affiliate_code`: Cập nhật cấu hình bộ cấp mã với kiểm tra revision.

---

## 4. Kết quả Kiểm thử Thực tế & Bằng chứng (PASS)

Đã thực thi tập lệnh kiểm thử tự động `npm run test:affiliate-code` (`scripts/verify_a7_7_affiliate_code.ts`) kết nối trực tiếp Supabase & Backend:

| STT | Nội dung Kiểm thử (TC-A7.7) | Kết quả Mong đợi | Kết quả Thực tế | Trạng thái |
|:---:|---|---|---|:---:|
| 01 | Admin đọc cấu hình bộ cấp mã & thống kê | Trả về prefix, min_digits và thống kê `total_issued_in_registry` | Thành công (`STHCCTV`, 6 chữ số) | **PASS** |
| 02 | Cập nhật cấu hình tiền tố & độ dài mã qua API | Cập nhật thành công với revision hợp lệ | HTTP 200, `success: true` | **PASS** |
| 03 | Gọi hàm RPC nguyên tử `fn_generate_next_affiliate_code` | Sinh mã mới đúng định dạng prefix & sequence | Sinh mã tuân thủ prefix mới | **PASS** |
| 04 | Tra cứu mã trong bảng `affiliate_code_registry` | Bản ghi tồn tại với đúng `sequence_number` và `source_type = 'NEW'` | Khớp chính xác trong CSDL | **PASS** |
| 05 | Khôi phục cấu hình ban đầu | Trả lại cấu hình hệ thống ban đầu an toàn | Hoàn tất | **PASS** |

---

## 5. Kết luận
Mô-đun **A7.7 – Mã cộng tác viên** đã được triển khai hoàn chỉnh từ tầng CSDL (sequence, registry, trigger nguyên tử), backend API đến giao diện quản trị và hệ thống kiểm thử tự động. Hệ thống vận hành ổn định, bảo toàn toàn bộ quy chế và luồng đăng ký A7.6.
