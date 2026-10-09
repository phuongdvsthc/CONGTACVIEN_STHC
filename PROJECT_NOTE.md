# Project Note

- C3.6B: Đã triển khai xong 5 sự kiện thông báo hệ thống.
  - Tình trạng: PARTIAL.
  - Vấn đề: Sự kiện được phát sinh trong transaction riêng biệt (Node.js) sau RPC commit, chưa đạt yêu cầu nguyên tử tuyệt đối trong SQL.
  - Kế hoạch: Sẽ refactor vào các phase tiếp theo hoặc khi có yêu cầu fix atomicity bắt buộc.

- C3.10A: Triển khai nền tảng dữ liệu hàng đợi email (Email Queue Data Foundation).
  - Tình trạng: HOÀN THÀNH (13/13 test cases PASS).
  - Kết quả đạt được:
    + Tạo tệp migration `20261009000001_c3_email_queue_schema_and_integrity.sql` với 2 bảng `email_jobs` và `email_job_attempts`.
    + Định nghĩa đầy đủ 11 CHECK constraints (phân tách mục đích Lead vs CTV, kiểm tra email, loại trừ secret keys).
    + Khóa ngoại bảo toàn kiểm toán `ON DELETE RESTRICT` và khóa ngoại phức hợp người nhận CTV (`notification_recipient_id, notification_id, recipient_user_id`).
    + 7 chỉ mục hiệu năng O(1) cho worker claim queue (`FOR UPDATE SKIP LOCKED`), stale locks và tra cứu nghiệp vụ.
    + Cấu hình RLS an toàn (cấm anon/authenticated, chỉ cấp quyền cho service_role).
    + 3 hàm RPC nội bộ: `fn_enqueue_email_job`, `fn_claim_email_jobs`, `fn_complete_email_job`.
    + Bộ sinh Idempotency Key: `lead-registration:{lead_id}` và `ctv-notification:{notification_recipient_id}`.
    + Xử lý trạng thái `BLOCKED` khi thiếu `official_registration_url` từ khóa học.
    + Bộ lọc làm sạch PII và loại bỏ hoàn toàn khóa nhạy cảm (`sanitizeEmailPayload`).
    + Báo cáo chi tiết bàn giao tại `docs/C3_10A_EMAIL_QUEUE_DATA_REPORT.md`.
  - Trạng thái DB: Tệp migration sẵn sàng trong repository; Remote Supabase DB ở trạng thái PENDING_DEPLOYMENT (chờ chạy qua SQL Editor).
  - Tiếp theo: Bước C3.10B tích hợp lưu lead và enqueue email trong cùng transaction.

- C3.10B: Tạo tác vụ email nguyên tử khi đăng ký lead (Atomic Lead Registration & Email Queue Enqueue).
  - Tình trạng: HOÀN THÀNH (12/12 test cases PASS).
  - Kết quả đạt được:
    + Tạo tệp migration `20261009000002_c3_lead_registration_atomic_email_job.sql` chứa hàm RPC `fn_submit_lead_with_confirmation_email`.
    + Đảm bảo tính nguyên tử tuyệt đối: INSERT lead và `fn_enqueue_email_job` được thực hiện trong cùng một transaction CSDL; rollback toàn bộ lead nếu enqueue thất bại.
    + Cơ chế chống race-condition đồng thời bằng Transaction-scoped Advisory Lock (`pg_advisory_xact_lock`) theo cặp `(phone, course_id)`.
    + Bảo toàn quy tắc chống trùng lặp Attribution Window 90 ngày: Trùng SĐT + Khóa học trong 90 ngày trả về `is_duplicate: true`, giữ nguyên lead ban đầu, không tạo lead mới và không tạo email mới.
    + Phân định trạng thái tác vụ email: `PENDING` nếu khóa học có `official_registration_url` hợp lệ, `BLOCKED` nếu thiếu URL EGOV kèm lý do cụ thể.
    + Bảo mật phân quyền: `SECURITY DEFINER`, `search_path = public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE TO service_role`.
    + Nâng cấp `server.ts` endpoint `POST /api/v1/public/leads` gọi trực tiếp RPC nguyên tử, xóa bỏ hoàn toàn việc insert lead lẻ tẻ bằng Node.js và không fallback âm thầm.
    + Bảo vệ PII: Phản hồi công khai không echo ngược lại Họ tên, SĐT hay Email của người học.
    + Báo cáo chi tiết bàn giao tại `docs/C3_10B_LEAD_REGISTRATION_ATOMIC_EMAIL_JOB_REPORT.md`.
  - Trạng thái DB: Tệp migration sẵn sàng trong repository; Remote Supabase DB ở trạng thái PENDING_DEPLOYMENT (chờ chạy qua SQL Editor).

- C3.11A: Cấu hình dịch vụ gửi email nghiệp vụ (Email Service Configuration & SMTP Delivery Foundation).
  - Tình trạng: HOÀN THÀNH.
  - Kết quả đạt được:
    + Cài đặt thư viện `nodemailer` và `@types/nodemailer`.
    + Tạo tệp migration `20261009000003_c3_email_service_settings_schema.sql` bổ sung các trường cấu hình SMTP không bí mật vào bảng `system_settings`, mở rộng bảng lịch sử cấu hình hỗ trợ nhóm `'EMAIL_SERVICE'`, nâng cấp RPC `fn_save_system_settings_group`, và khởi tạo bảng `email_service_test_logs`.
    + Xây dựng module dịch vụ bảo mật phía backend `/src/services/emailService.ts`: Đọc cấu hình, kiểm tra validation nghiêm ngặt (Host, Port, STARTTLS/TLS_WRAPPED/NONE, Timeout), chống Header Injection (`\r`, `\n`), mã hóa/che PII địa chỉ email, tạo transport với quy chuẩn bảo mật chặt chẽ (`rejectUnauthorized: true`, không fallback không mã hóa), kiểm tra kết nối (`verifyConnection`), và gửi email thử nghiệm (`sendTestEmail`).
    + Triển khai các API endpoint quản trị an toàn (`GET /api/v1/admin/system-settings`, `PUT /api/v1/admin/system-settings/email_service`, `POST /api/v1/admin/admin/email-service/verify-connection`, `POST /api/v1/admin/email-service/send-test-email`).
    + Tích hợp giao diện quản trị đầy đủ nhóm “Cấu hình Dịch vụ Email Nghiệp vụ (C3.11A)” vào `/admin/system-settings` (`AdminSystemSettingsView.tsx`), gồm công tắc bật/tắt gửi nghiệp vụ, các trường cấu hình, trạng thái credentials máy chủ, nút kiểm tra kết nối và nút gửi email thử nghiệm có trạng thái loading và phản hồi trực quan.
    + Bổ sung biến môi trường mẫu vào `.env.example` (`SMTP_USER`, `SMTP_PASS`).
    + Tạo báo cáo chi tiết bàn giao tại `docs/C3_11A_EMAIL_DELIVERY_CONFIGURATION_REPORT.md`.
  - Trạng thái DB: Tệp migration sẵn sàng; Remote Supabase DB ở trạng thái PENDING_DEPLOYMENT.

- C3.11B: Mẫu email xác nhận lead và màn hình Admin thiết kế nội dung email (Lead Confirmation Email Template & Admin Content Editor).
  - Tình trạng: HOÀN THÀNH.
  - Kết quả đạt được:
    + Tạo tệp migration `20261009000004_c3_email_templates_schema.sql` khởi tạo bảng `email_templates` và `email_template_versions` (hỗ trợ lưu nháp, phiên bản xuất bản bất biến, revision, change reason, RLS và các hàm RPC `fn_save_email_template_draft`, `fn_publish_email_template_version`).
    + Xây dựng module renderer phía backend `/src/services/emailTemplateRenderer.ts`: Kết xuất `subject`, `html`, `text` từ phiên bản mẫu xuất bản kết hợp snapshot payload, thay thế biến chuẩn (`{{customer_name}}`, `{{course_title}}`, `{{affiliate_name}}`, `{{registered_at}}`, `{{support_hotline}}`, `{{official_registration_url}}`, v.v.), xử lý khối điều kiện `{{#if affiliate_name}}` sạch sẽ, làm sạch HTML chống XSS/script/iframe, kiểm tra URL EGOV hợp lệ.
    + Triển khai các API endpoint quản trị cho Admin (`GET /api/v1/admin/email-templates`, `POST /api/v1/admin/email-templates/:code/versions`, `POST /api/v1/admin/email-templates/versions/:id/publish`).
    + Xây dựng giao diện Quản lý Mẫu Email chuyên nghiệp tại `/admin/email-templates` (`AdminEmailTemplatesView.tsx`), hỗ trợ chỉnh sửa nháp, xem trước Desktop/Mobile (kèm/không kèm CTV), danh sách biến hỗ trợ tiếng Việt, kiểm tra xung đột revision và lịch sử phiên bản.
    + Tạo báo cáo chi tiết bàn giao tại `docs/C3_11B_LEAD_CONFIRMATION_EMAIL_TEMPLATE_REPORT.md`.
  - Trạng thái DB: Tệp migration sẵn sàng trong repository; Remote Supabase DB ở trạng thái PENDING_DEPLOYMENT (chờ chạy qua SQL Editor).

- C3.12A: Worker xử lý hàng đợi và gửi email (Email Queue Worker & SMTP Sender - Lead Registration Confirmation).
  - Tình trạng: HOÀN THÀNH.
  - Kết quả đạt được:
    + Tạo tệp migration `/supabase/migrations/20261009000005_c3_email_worker_claim_filter.sql` cập nhật hàm RPC `fn_claim_email_jobs` để CHỈ claim các tác vụ `LEAD_REGISTRATION_CONFIRMATION` (cách ly hoàn toàn với email CTV C3.13A).
    + Xây dựng module worker backend `/src/services/emailWorker.ts`: Khởi động một lần trên server process, kiểm tra công tắc `EMAIL_WORKER_ENABLED=true` và `email_business_enabled = true`, định kỳ poll hàng đợi với batch size hữu hạn.
    + Cơ chế claim nguyên tử an toàn (`FOR UPDATE SKIP LOCKED`), tạo attempt, cấp phát `lock_token`, thu hồi stale locks khi worker timeout/crash.
    + Đọc phiên bản mẫu `PUBLISHED` hoặc `ARCHIVED` tương thích, kết xuất nội dung qua `emailTemplateRenderer.ts`, gửi qua SMTP transporter bảo mật (`SmtpEmailSender`), ghi nhận kết quả thành công (`SENT`), lỗi tạm thời (`RETRY_WAIT`) với backoff, hoặc lỗi vĩnh viễn/thiếu mẫu (`DEAD_LETTER` / `BLOCKED`).
    + Tích hợp khởi động worker trong `server.ts` và cơ chế dừng an toàn (`SIGTERM`, `SIGINT`).
    + Tạo báo cáo chi tiết bàn giao tại `docs/C3_12A_EMAIL_QUEUE_WORKER_REPORT.md`.
  - Trạng thái DB: Tệp migration sẵn sàng trong repository; Remote Supabase DB ở trạng thái PENDING_DEPLOYMENT (chờ chạy qua SQL Editor).
  - Tiếp theo: Bước C3.12B — Hoàn thiện và kiểm tra luồng đăng ký công khai.




