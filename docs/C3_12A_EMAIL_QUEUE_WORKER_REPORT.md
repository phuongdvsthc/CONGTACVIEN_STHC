# BÁO CÁO BÀN GIAO C3.12A — WORKER XỬ LÝ HÀNG ĐỢI VÀ GỬI EMAIL

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_12A_EMAIL_QUEUE_WORKER_REPORT.md`  
**Trạng thái**: HOÀN THÀNH (Đã biên dịch và kiểm tra TypeCheck thành công 100%)

---

## 1. MỤC TIÊU VÀ PHẠM VI TRIỂN KHAI

Bước **C3.12A** xây dựng và đưa vào vận hành backend email queue worker (`src/services/emailWorker.ts`) nhằm:
1. **Claim tác vụ an toàn**: Sử dụng RPC `fn_claim_email_jobs` để phân tranh khóa độc quyền giữa các worker instance (đảm bảo mỗi job chỉ được xử lý đúng 1 lần trong một khoảng thời gian khóa `p_lock_duration_seconds`). Hạn chế chỉ claim các tác vụ loại `LEAD_REGISTRATION_CONFIRMATION`.
2. **Kiểm tra điều kiện kích hoạt**: Chỉ thực thi khi `EMAIL_WORKER_ENABLED=true` (biến môi trường) và `email_business_enabled = true` (cấu hình trong bảng `system_settings`).
3. **Đọc phiên bản mẫu bất biến**: Tra cứu đúng phiên bản mẫu email (`PUBLISHED` hoặc `ARCHIVED`) từ bảng `email_template_versions` tương ứng với mã phiên bản mà job đã ghi nhận khi khởi tạo (atomic snapshot version).
4. **Kết xuất và Gửi SMTP**: Sử dụng `emailTemplateRenderer.ts` để render thông tin động, gửi qua SMTP bằng `SmtpEmailSender` (C3.11A).
5. **Ghi kết quả và Xử lý lỗi**: Cập nhật trạng thái `SENT`, `RETRY_WAIT`, `DEAD_LETTER` hoặc `BLOCKED` qua hàm RPC `fn_complete_email_job`.

---

## 2. CÁC TỆP ĐÃ TẠO VÀ CẬP NHẬT

1. **Migration SQL**: `/supabase/migrations/20261009000005_c3_email_worker_claim_filter.sql`
   - Cập nhật hàm RPC `fn_claim_email_jobs` để phân tách và lọc chính xác các tác vụ có `email_type = 'LEAD_REGISTRATION_CONFIRMATION'`.
2. **Worker Service**: `/src/services/emailWorker.ts`
   - Quản lý vòng lặp định kỳ (`setInterval`), đọc cấu hình CSDL, gọi hàm RPC claim/complete, render và gửi SMTP với xử lý ngoại lệ an toàn, không làm crash server.
3. **Server Integration**: `/server.ts`
   - Tích hợp `startEmailWorker()` khi server khởi động lắng nghe cổng và `stopEmailWorker()` trong xử lý `SIGTERM`/`SIGINT` graceful shutdown.
4. **Báo cáo**: `/docs/C3_12A_EMAIL_QUEUE_WORKER_REPORT.md`

---

## 3. HƯỚNG DẪN KIỂM TRA & VẬN HÀNH

- Chạy migration trên Supabase SQL Editor nếu chưa áp dụng.
- Cấu hình biến môi trường trên server:
  - `EMAIL_WORKER_ENABLED=true` (mặc định false trên môi trường staging/production cho đến khi sẵn sàng bật).
  - Cấu hình SMTP đầy đủ trong `/admin/system-settings` và bật `email_business_enabled = true`.
- Worker tự động polling định kỳ (mặc định 15 giây) để xử lý các job trong hàng đợi `email_jobs`.
