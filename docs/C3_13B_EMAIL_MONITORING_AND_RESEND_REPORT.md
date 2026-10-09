# BÁO CÁO BÀN GIAO C3.13B — THEO DÕI VÀ GỬI LẠI EMAIL TRONG ADMIN

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_13B_EMAIL_MONITORING_AND_RESEND_REPORT.md`  
**Trạng thái**: HOÀN THÀNH (Đã biên dịch và kiểm tra TypeCheck thành công tuyệt đối 100%)

---

## 1. MỤC TIÊU VÀ PHẠM VI TRIỂN KHAI

Bước **C3.13B** hoàn thiện phân hệ quản trị email dành riêng cho Quản trị viên (Admin) để giám sát, theo dõi, thử lại (`Retry`) và gửi lại (`Resend`) các tác vụ email trong hàng đợi:
1. **Theo dõi Toàn diện Hàng đợi Email**:
   - Quản lý đồng thời hai loại email: `LEAD_REGISTRATION_CONFIRMATION` và `CTV_NOTIFICATION_EMAIL`.
   - Danh sách phân trang kèm tìm kiếm nâng cao (theo email người nhận, idempotency key, tên người nhận) và bộ lọc theo loại email, trạng thái (`PENDING`, `PROCESSING`, `RETRY_WAIT`, `BLOCKED`, `SENT`, `DEAD_LETTER`).
2. **Chi tiết Tác vụ & Lịch sử Xử lý (`email_job_attempts`)**:
   - Modal hiển thị đầy đủ thông tin chi tiết tác vụ, payload, metadata, lý do khóa (`blocked_reason`), lỗi lần thử gần nhất, và bảng lịch sử chi tiết từng lần worker cố gắng gửi thư.
3. **Thử lại Tác vụ Lỗi / Bị khóa (`Retry`)**:
   - Cho phép Admin bấm thử lại các tác vụ đang ở trạng thái `BLOCKED`, `RETRY_WAIT`, hoặc `DEAD_LETTER`.
   - Hệ thống tự động chuyển trạng thái về `PENDING`, reset lịch hẹn sang `NOW()`, xóa lỗi cũ và mở rộng số lần thử tối đa để worker có thể xử lý thành công ngay khi nguyên nhân (như cấu hình SMTP hoặc thiếu EGOV URL) được khắc phục.
4. **Gửi lại Chủ đích Email đã hoàn thành (`Resend`)**:
   - Cho phép Quản trị viên chủ động gửi lại email đã `SENT` bằng một tác vụ mới (`original_job_id` liên kết với job gốc).
   - Đảm bảo **không** tạo lại lead, thông báo, notification recipient hay sự kiện nghiệp vụ.
5. **Kiểm toán Quản trị (Audit Logs)**:
   - Mọi thao tác quản trị (`RETRY_EMAIL_JOB`, `RESEND_EMAIL_JOB`) đều được ghi nhận vào bảng `audit_logs` gắn liền với tài khoản Admin thực hiện.

---

## 2. CHI TIẾT TRIỂN KHAI KỸ THUẬT

### 2.1. API Backend Quản trị (`server.ts`)
- `GET /api/v1/admin/email-jobs`: Truy vấn danh sách tác vụ email có phân trang, tìm kiếm ilike và bộ lọc type/status.
- `GET /api/v1/admin/email-jobs/:id`: Trợ giúp Admin xem chi tiết tác vụ cùng danh sách lịch sử attempts từ `email_job_attempts`.
- `POST /api/v1/admin/email-jobs/:id/retry`: Đưa tác vụ `BLOCKED`/`DEAD_LETTER`/`RETRY_WAIT` trở lại trạng thái `PENDING` và ghi log audit.
- `POST /api/v1/admin/email-jobs/:id/resend`: Tạo tác vụ gửi lại mới (`original_job_id = id`) với idempotency key riêng biệt (`manual-resend:...`), giữ nguyên payload/template và ghi log audit.

### 2.2. Giao diện Người dùng Quản trị (`AdminEmailJobsView.tsx`)
- Tích hợp vào menu quản trị chính tại đường dẫn `/admin/email-jobs` (Chỉ tài khoản Admin mới có quyền truy cập theo quy chế `navigationGuard.ts`).
- Giao diện trực quan, bảng dữ liệu hiện đại, huy hiệu trạng thái màu sắc rõ ràng, modal chi tiết trực quan và xác nhận thao tác an toàn.

---

## 3. HƯỚNG DẪN KIỂM TRA & VẬN HÀNH

1. **Truy cập Phân hệ**:
   - Đăng nhập tài khoản Quản trị viên (Admin), chọn mục **"Giám sát Hàng đợi Email"** trên menu bên trái.
2. **Kiểm tra Biên dịch**:
   - TypeCheck TypeScript (`npx tsc --noEmit`) và Build Vite (`npm run build`) thành công 100% không lỗi.
