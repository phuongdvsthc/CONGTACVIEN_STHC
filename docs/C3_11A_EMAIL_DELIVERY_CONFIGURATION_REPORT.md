# BÁO CÁO BÀN GIAO C3.11A — CẤU HÌNH DỊCH VỤ GỬI EMAIL NGHIỆP VỤ

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_11A_EMAIL_DELIVERY_CONFIGURATION_REPORT.md`  
**Ngày hoàn thành**: 09/10/2026  
**Phân hệ**: Hàng đợi Email & Dịch vụ Gửi thư (C3 / C3.11A)  
**Trạng thái thực thi**: **HOÀN THÀNH — CSDL: PENDING_DEPLOYMENT**

---

## 1. TỔNG QUAN & BỐI CẢNH TRIỂN KHAI C3.11A

Bước **C3.11A** xây dựng và hoàn thiện hạ tầng dịch vụ gửi email phía backend phục vụ cho các tác vụ nghiệp vụ quan trọng trong hệ thống STHC_CTV:
- `LEAD_REGISTRATION_CONFIRMATION` (Email xác nhận đăng ký tuyển sinh của khách).
- `CTV_NOTIFICATION_EMAIL` (Email thông báo hoa hồng và hoạt động của Cộng tác viên).

### Các mục tiêu cốt lõi đã đạt được:
1. **Phân tách hoàn toàn Supabase Auth & Email Nghiệp vụ**:
   - Supabase Auth tiếp tục đảm nhận việc gửi email xác thực tài khoản và khôi phục mật khẩu.
   - Backend STHC_CTV quản lý độc lập hàng đợi `email_jobs` và dịch vụ SMTP nghiệp vụ (`emailService.ts`).
2. **Quản lý Secrets Bảo mật (Server-side Only)**:
   - `SMTP_USER` / `SMTP_PASS` được lưu giữ hoàn toàn qua biến môi trường phía máy chủ (`server.ts` / `process.env`).
   - Tuyệt đối không lưu mật khẩu dạng rõ (`plain text`) trong bảng `system_settings` hay cơ sở dữ liệu.
   - Giao diện Admin chỉ hiển thị trạng thái đã cấu hình hay chưa (`✓ Đã cấu hình / ✗ Chưa cấu hình`), không bao giờ trả về secret qua API hay frontend.
3. **Giao thức SMTP Chuẩn & Bảo mật Chặt chẽ**:
   - Hỗ trợ các chế độ bảo mật `STARTTLS`, `TLS_WRAPPED`, và `NONE`.
   - Bắt buộc kiểm tra chứng chỉ số nghiêm ngặt (`rejectUnauthorized: true`), không bao giờ fallback âm thầm sang kết nối không mã hóa khi TLS lỗi.
   - Chống Header Injection (`\r`, `\n`) trong mọi trường tiêu đề, địa chỉ người gửi (`From`), người nhận (`To`), và phản hồi (`Reply-To`).
4. **Công cụ Kiểm tra Kết nối & Gửi thử Chủ động (Test Tools)**:
   - Cung cấp nút **“Kiểm tra kết nối SMTP”** đo lường thời gian phản hồi (`round_trip_ms`) mà không thực hiện gửi email thật.
   - Cung cấp tính năng **“Gửi email thử nghiệm”** cho phép Quản trị viên chủ động nhập một địa chỉ nhận định rõ để kiểm chứng hoàn tất luồng gửi với mẫu HTML và plain-text chuẩn hóa.
   - Có giới hạn rate-limit và khóa nút khi đang thực thi trên giao diện.

---

## 2. KIẾN TRÚC KỸ THUẬT & MÃ NGUỒN THAY ĐỔI

### 2.1. Cơ sở dữ liệu & Migration Mới
- **Tên tệp migration**: `/supabase/migrations/20261009000003_c3_email_service_settings_schema.sql`
- **Nội dung SQL**:
  1. Bổ sung các cột cấu hình không bí mật vào bảng `system_settings` (Singleton `id = 1`):
     - `email_business_enabled` (BOOLEAN, mặc định `FALSE`)
     - `smtp_host` (VARCHAR)
     - `smtp_port` (INTEGER, mặc định `587`, check `BETWEEN 1 AND 65535`)
     - `smtp_secure_mode` (VARCHAR, mặc định `'STARTTLS'`, check `IN ('STARTTLS', 'TLS_WRAPPED', 'NONE')`)
     - `smtp_sender_name` (VARCHAR)
     - `smtp_sender_email` (VARCHAR)
     - `smtp_reply_to` (VARCHAR)
     - `smtp_timeout_ms` (INTEGER, mặc định `10000`, check `BETWEEN 2000 AND 60000`)
  2. Mở rộng ràng buộc `chk_setting_group` trên bảng `system_settings_history` để chấp nhận nhóm `'EMAIL_SERVICE'`.
  3. Cập nhật hàm RPC nguyên tử `public.fn_save_system_settings_group` hỗ trợ nhánh `EMAIL_SERVICE` với kiểm tra phân quyền Admin (`role = 'admin'`, `is_active = TRUE`), kiểm soát xung đột ghi đè bằng `revision`, và ghi nhật ký lịch sử tự động.
  4. Tạo bảng `public.email_service_test_logs` lưu trữ lịch sử kiểm tra kết nối và gửi thử an toàn (che thông tin người nhận, không lưu mật khẩu).
- **Trạng thái áp dụng CSDL**: **PENDING_DEPLOYMENT** (Chờ người dùng chạy qua Supabase SQL Editor).

### 2.2. Thư viện & Module Backend
- **Thư viện mới**: Cài đặt `nodemailer` (^6.x) và `@types/nodemailer`.
- **Dịch vụ chính**: `/src/services/emailService.ts`
  - Cung cấp các hàm kiểm tra định dạng email chuẩn RFC 5322, kiểm tra host SMTP, che email PII (`maskEmailAddress`), ánh xạ lỗi chuẩn hóa (`mapSmtpError`), tạo transport bảo mật (`createSmtpTransporter`), xác minh kết nối (`verifySmtpConnection`), và gửi thử nghiệm (`sendSmtpTestEmail`).
  - Hiện thực giao diện trừu tượng `EmailSenderInterface` chuẩn bị sẵn sàng cho worker C3.12A.

### 2.3. Endpoint API Quản trị Quản lý (Admin Only)
- `GET /api/v1/admin/system-settings`: Trả về toàn bộ cấu hình hệ thống (gồm nhóm `email_service`) kèm trạng thái credentials từ biến môi trường (`email_credentials_status`).
- `PUT /api/v1/admin/system-settings/email_service`: Lưu cấu hình không bí mật, kiểm tra allowlist và validate nghiêm ngặt, hỗ trợ fallback an toàn lưu file local khi migration CSDL chưa chạy trên remote.
- `POST /api/v1/admin/email-service/verify-connection`: Kiểm tra kết nối SMTP thực tế, trả về kết quả `round_trip_ms` và mã lỗi chuẩn hóa.
- `POST /api/v1/admin/email-service/send-test-email`: Gửi email thử nghiệm tới một người nhận duy nhất do Admin chỉ định.

---

## 3. GIAO DIỆN QUẢN TRỊ (ADMIN SYSTEM SETTINGS VIEW)

Trong màn hình `/admin/system-settings` (`AdminSystemSettingsView.tsx`), đã tích hợp hoàn chỉnh nhóm **“Cấu hình Dịch vụ Email Nghiệp vụ (C3.11A)”**:
- Công tắc bật/tắt gửi email nghiệp vụ với ghi chú rõ ràng về trạng thái hàng đợi.
- Các trường cấu hình không bí mật: SMTP Host, Port, Chế độ bảo mật TLS, Timeout, Tên người gửi, Email người gửi, và Reply-To.
- Khối hiển thị trạng thái bảo mật thông tin xác thực server (`SMTP_USER` và `SMTP_PASS` đã/chưa cấu hình).
- Nút **“Lưu cấu hình Email Nghiệp vụ”**.
- Khối công cụ kiểm thử:
  1. Nút **“Kiểm tra kết nối SMTP”** với trạng thái loading, hiển thị thời gian phản hồi hoặc mã lỗi.
  2. Ô nhập email nhận thử và nút **“Gửi thử”** kèm thông báo kết quả chi tiết.

---

## 4. HƯỚNG DẪN TRIỂN KHAI & CÂU LỆNH SQL CHO NGƯỜI DÙNG

### 4.1. Cấu hình Biến Môi Trường (Server Environment)
Trên môi trường deploy (Render / VPS / Local `.env`), bổ sung:
```env
SMTP_USER="tuyensinh@sthc.edu.vn"
SMTP_PASS="your-secure-app-password"
```

### 4.2. Truy Vấn SQL Cần Chạy Trên Supabase SQL Editor
Người dùng sao chép và chạy tệp migration sau tại Supabase SQL Editor:
`/supabase/migrations/20261009000003_c3_email_service_settings_schema.sql`

Truy vấn kiểm tra sau khi chạy:
```sql
-- 1. Kiểm tra cột system_settings đã có cấu hình email
SELECT id, email_business_enabled, smtp_host, smtp_port, smtp_secure_mode, smtp_sender_email, revision 
FROM public.system_settings WHERE id = 1;

-- 2. Kiểm tra bảng test logs
SELECT * FROM public.email_service_test_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 5. KẾT QUẢ KIỂM THỬ & CHƯA KIỂM CHỨNG
- **Kiểm thử Source & Build**: Đã chạy `npx tsc --noEmit`, `npm run lint` và `compile_applet` thành công tuyệt đối, không có lỗi TypeScript hay cú pháp.
- **Xác thực API & Validation**: Các endpoint kiểm tra quyền Admin, validation host/port/TLS/From/Reply-To, và chống Header Injection hoạt động chính xác.
- **Trạng thái Remote DB**: Đã ghi nhận **PENDING_DEPLOYMENT** đối với cơ sở dữ liệu Supabase từ xa cho đến khi người dùng chủ động thực thi script SQL qua Supabase SQL Editor.

*Dừng bước C3.11A theo đúng yêu cầu. Bước tiếp theo (C3.12B / C3.11B) sẽ tiếp tục triển khai các mẫu email nghiệp vụ chi tiết.*
