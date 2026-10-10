# Báo cáo Cấu hình SMTP & Quản lý Thông tin Xác thực qua Admin — STHC_CTV
**Ngày báo cáo:** 10/10/2026  
**Phạm vi:** Triển khai tính năng cấu hình tài khoản (`smtp_username`) và mật khẩu (`smtp_password`) trực tiếp tại màn hình Quản trị hệ thống (`/admin/system-settings`), mã hóa an toàn bằng AES-256-GCM trên backend, và áp dụng chung nguồn cấu hình cho EmailService, Worker, Kiểm tra kết nối và Gửi thử.

---

## 1. Mục tiêu và Yêu cầu Nghiệp vụ
- **Giao diện Admin (`/admin/system-settings`):** Bổ sung trường nhập "Tài khoản đăng nhập SMTP" (`smtp_username`) và "Mật khẩu SMTP / Mật khẩu ứng dụng" (`smtp_password`) kèm nút hiện/ẩn mật khẩu (show/hide).
- **Trạng thái hiển thị:** Hiển thị rõ trạng thái "Đã lưu mật khẩu" hoặc "Chưa cấu hình mật khẩu" mà không lộ ciphertext hay mật khẩu thô ra frontend.
- **Lưu mật khẩu an toàn:** Mật khẩu gửi lên được mã hóa phía backend bằng cơ chế **AES-256-GCM** sử dụng khóa bảo mật riêng biệt (`EMAIL_CREDENTIALS_ENCRYPTION_KEY`). Không lưu mật khẩu dạng rõ (plaintext) hoặc base64 đơn thuần.
- **Quy tắc cập nhật:** Ô mật khẩu để trống nghĩa là giữ nguyên mật khẩu đã lưu cũ; nhập mật khẩu mới nghĩa là thay thế.
- **Thống nhất nguồn cấu hình:** EmailService, Worker, Kiểm tra kết nối (`verify-connection`) và Gửi thử (`send-test-email`) đều sử dụng chung hàm `getSmtpCredentials(dbSettings)` với ưu tiên cấu hình lưu trong cơ sở dữ liệu và biến môi trường dự phòng (`SMTP_USER`, `SMTP_PASS`) làm fallback.

---

## 2. Các File Đã Thay Đổi
1. **Migration:**
   - `/supabase/migrations/20261009000007_c3_smtp_credentials_secure_storage.sql`: Thêm cột `smtp_username` và `smtp_password_ciphertext` vào bảng `system_settings`, cập nhật RPC `fn_save_system_settings_group`.
2. **Backend Services:**
   - `/src/services/emailService.ts`: Bổ sung các hàm mã hóa/giải mã AES-256-GCM (`encryptSmtpPassword`, `decryptSmtpPassword`) và cập nhật `getSmtpCredentials(dbSettings)` ưu tiên đọc từ CSDL.
   - `/server.ts`: Cập nhật endpoint cập nhật nhóm `email_service` để mã hóa mật khẩu và cập nhật các route kiểm tra kết nối, gửi thử sử dụng credentials đã giải mã an toàn.
   - `/src/services/emailWorker.ts`: Cập nhật background worker gọi `getSmtpCredentials(config)` để xử lý hàng đợi email bằng thông tin xác thực lưu trong CSDL.
3. **Frontend Component:**
   - `/src/components/admin/AdminSystemSettingsView.tsx`: Bổ sung form nhập tài khoản và mật khẩu SMTP, nút ẩn/hiện mật khẩu và hiển thị trạng thái cấu hình.

---

## 3. Hướng dẫn Triển khai & Vận hành

### 3.1. Chạy Migration CSDL
Chạy lệnh migration mới qua Supabase SQL Editor:
- Tên tệp: `20261009000007_c3_smtp_credentials_secure_storage.sql`
- Truy vấn kiểm tra:
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'system_settings' 
    AND column_name IN ('smtp_username', 'smtp_password_ciphertext');
  ```

### 3.2. Cấu hình Khóa Mã Hóa trên Backend
Thiết lập biến môi trường trên server backend (Render / Vercel / `.env`):
```env
EMAIL_CREDENTIALS_ENCRYPTION_KEY=your-secure-32-byte-hex-or-string-secret-key-here
```
*Lưu ý: Mất khóa này sẽ không giải mã được mật khẩu SMTP đã lưu.*

### 3.3. Cấu hình trên Giao diện Admin
1. Đăng nhập vào trang Quản trị hệ thống tại `/admin/system-settings`.
2. Cuộn xuống phần **Cấu hình Dịch vụ Email Nghiệp vụ**.
3. Nhập **Tài khoản đăng nhập SMTP** và **Mật khẩu SMTP**.
4. Bấm **Lưu cấu hình Email Nghiệp vụ**.
5. Sử dụng công cụ **Kiểm tra kết nối SMTP** và **Gửi email thử nghiệm** để xác thực hoạt động.

---

## 4. Kết quả Kiểm thử
1. **Lưu credentials mới & tải lại:** Username hiển thị đúng, ô mật khẩu trống, trạng thái hiển thị "✓ Đã lưu mật khẩu".
2. **Lưu ô password trống:** Giữ nguyên mật khẩu đã lưu cũ trong CSDL.
3. **Đổi mật khẩu:** Các lần gửi tiếp theo sử dụng mật khẩu mới chính xác.
4. **Thiếu/sai khóa mã hóa:** Trả lỗi rõ ràng, không fallback âm thầm.
5. **Fallback môi trường:** Hoạt động chính xác khi chưa cấu hình CSDL.
6. **Bảo mật PII & Secret:** Không log hoặc trả ciphertext/mật khẩu về API frontend hay log hệ thống.

---
*Báo cáo kết thúc.*
