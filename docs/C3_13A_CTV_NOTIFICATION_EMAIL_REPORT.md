# BÁO CÁO BÀN GIAO C3.13A — EMAIL THÔNG BÁO CHO CỘNG TÁC VIÊN (CTV)

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_13A_CTV_NOTIFICATION_EMAIL_REPORT.md`  
**Trạng thái**: HOÀN THÀNH (Đã biên dịch, kiểm tra TypeCheck thành công tuyệt đối 100%)

---

## 1. MỤC TIÊU VÀ PHẠM VI TRIỂN KHAI

Bước **C3.13A** bổ sung và hoàn thiện hệ thống gửi email thông báo định danh dành riêng cho Cộng tác viên (`CTV_NOTIFICATION_EMAIL`), tích hợp chặt chẽ với cơ chế thông báo theo sự kiện (C3.6A / C3.6B) và hàng đợi email nguyên tử (C3.10A / C3.12A):
1. **Liên kết Sự kiện Nghiệp vụ**:
   - Khi hệ thống ghi nhận các sự kiện quan trọng (như khách đăng ký qua link CTV `LEAD_SUBMITTED`, học viên nhập học `ENROLLMENT_MATCHED`, thù lao được duyệt `REWARD_APPROVED`,... ), bộ tiêu thụ thông báo (`NotificationEventConsumer`) tạo bản ghi trong `notifications` và `notification_recipients`.
   - Đồng thời, hệ thống tự động kiểm tra xem CTV có địa chỉ email hợp lệ (chuẩn RFC 5322) và tiến hành enqueue tác vụ email loại `CTV_NOTIFICATION_EMAIL` vào bảng `email_jobs` với khóa chống trùng `ctv-notification:{notification_recipient_id}`.
2. **Dùng chung Cơ sở Hạ tầng**:
   - Tái sử dụng hoàn toàn hàng đợi `email_jobs`, cấu hình SMTP (`/admin/system-settings`), renderer (`emailTemplateRenderer.ts`), cơ chế khóa độc quyền (`fn_claim_email_jobs`), và hệ thống retry của các bước trước (C3.10 - C3.12).
   - Không xây dựng hệ thống gửi email độc lập thứ hai.
3. **Mẫu Email Bất biến & Quản lý Admin**:
   - Seed mẫu email `CTV_NOTIFICATION_EMAIL` và phiên bản mặc định `v1` (trạng thái `PUBLISHED`) vào bảng quản lý mẫu email (`email_templates` & `email_template_versions`).
   - Cho phép Quản trị viên (Admin) quản lý, soạn thảo, xem trước và xuất bản các phiên bản mẫu email này trong phân hệ `/admin/email-templates`.

---

## 2. CHI TIẾT TRIỂN KHAI KỸ THUẬT

### 2.1. Migration SQL & Cập nhật Worker Claim
- **File migration**: `/supabase/migrations/20261009000006_c3_ctv_notification_email_template_and_worker.sql`
- **Nội dung**:
  1. Chèn mẫu email mặc định `CTV_NOTIFICATION_EMAIL` vào bảng `email_templates` kèm tiêu đề, nội dung HTML/Text hỗ trợ các biến động (`{{affiliate_name}}`, `{{affiliate_code}}`, `{{notification_title}}`, `{{notification_summary}}`, `{{action_url}}`, `{{published_at}}`, `{{brand_name}}`, `{{support_email}}`).
  2. Cập nhật hàm RPC `fn_claim_email_jobs` để phân tranh và claim đồng thời cả hai loại tác vụ: `'LEAD_REGISTRATION_CONFIRMATION'` và `'CTV_NOTIFICATION_EMAIL'`.

### 2.2. Tích hợp Outbox Consumer (`NotificationEventConsumer.ts`)
- **File**: `/src/services/notificationEventConsumer.ts`.
- **Cơ chế**:
  - Sau khi phân phối thành công thông báo vào `notification_recipients`, worker truy vấn bảng `profiles` để lấy thông tin `email`, `full_name`, và `affiliate_code` của CTV.
  - Kiểm tra tính hợp lệ của email qua `isValidEmailFormat`.
  - Gọi hàm RPC `fn_enqueue_email_job` tạo tác vụ nguyên tử `CTV_NOTIFICATION_EMAIL` gắn liền với `notification_id` và `notification_recipient_id`.

### 2.3. Kết xuất Mẫu (`EmailTemplateRenderer.ts`)
- **File**: `/src/services/emailTemplateRenderer.ts`.
- **Cơ chế**: Bổ sung ánh xạ biến dữ liệu thông báo (`notification_title`, `notification_summary`, `action_url`, `published_at`) vào trình kết xuất biến an toàn, ngăn chặn mã độc XSS, script và iframe.

---

## 3. HƯỚNG DẪN KIỂM TRA & VẬN HÀNH

1. **Chạy Migration**:
   - Chạy file migration `/supabase/migrations/20261009000006_c3_ctv_notification_email_template_and_worker.sql` qua Supabase SQL Editor nếu chưa áp dụng.
2. **Cấu hình & Vận hành**:
   - Bật cấu hình `email_business_enabled = true` tại `/admin/system-settings` và cấu hình SMTP hợp lệ.
   - Bật biến môi trường `EMAIL_WORKER_ENABLED=true` trên server backend khi muốn kích hoạt worker tự động gửi email cho cả khách hàng và CTV.
3. **Kiểm tra Biên dịch**:
   - Kiểm tra kiểu dữ liệu TypeScript (`npx tsc --noEmit`) và biên dịch Vite (`npm run build`) thành công 100% không lỗi.
