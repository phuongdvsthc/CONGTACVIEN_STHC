# BÁO CÁO KIỂM TRA VÀ KÍCH HOẠT LUỒNG GỬI EMAIL TỰ ĐỘNG STHC_CTV (C3)

**Mã tài liệu:** `docs/C3_15_EMAIL_AUTOMATION_ACTIVATION_REPORT.md`  
**Ngày thực hiện:** 12/10/2026  
**Mục tiêu:** Kiểm tra, sửa lỗi và kích hoạt luồng xử lý tự động của Email Queue Worker cho hệ thống Cổng Đại sứ Tuyển sinh STHC.

---

## 1. Kết quả kiểm tra Backend Preview thực tế (Phát hiện nguyên nhân gốc rễ)

Qua việc kiểm tra sâu runtime và CSDL thực tế, đã xác định 4 nguyên nhân khiến tác vụ email nằm ở trạng thái `PENDING` mà Worker không tự động xử lý:

| Thành phần kiểm tra | Trạng thái thực tế | Đánh giá & Ảnh hưởng |
| :--- | :--- | :--- |
| **Biến môi trường `EMAIL_WORKER_ENABLED`** | `undefined` (không tồn tại trong env) | **Nguyên nhân 1:** Worker khởi chạy nhưng ở mỗi chu kỳ quét đều thoát sớm do điều kiện `process.env.EMAIL_WORKER_ENABLED === 'true'` trả về `false`. |
| **Công tắc `email_business_enabled` trong CSDL** | `true` (Bảng `system_settings` id=1) | Hợp lệ. Ban Quản trị đã bật công tắc nghiệp vụ. |
| **Khởi động Worker từ entrypoint backend** | `server.ts` có gọi `startEmailWorker()` | Có khởi động, nhưng bị chặn bởi biến môi trường máy chủ và lỗi RPC bên dưới. |
| **Hàm RPC `fn_claim_email_jobs` trong PostgreSQL** | **Lỗi PostgreSQL `42702`: `column reference "attempt_count" is ambiguous`** | **Nguyên nhân 2:** Hàm PL/pgSQL định nghĩa `RETURNS TABLE (... attempt_count INT, max_attempts INT)`. Khi câu lệnh `UPDATE` và mệnh đề `WHERE` kiểm tra `attempt_count >= max_attempts` mà không có định danh bảng tường minh (`ej.attempt_count`), PostgreSQL báo lỗi mơ hồ giữa biến đầu ra và cột bảng, khiến RPC claim thất bại hoàn toàn. |
| **Cơ chế đọc thông tin SMTP trong Worker** | `fetchEmailServiceConfig` lọc bỏ mật khẩu đã mã hóa | **Nguyên nhân 3:** Hàm đọc cấu hình trong worker chỉ lấy các trường công khai, không truyền `smtp_password_ciphertext` và `smtp_username` cho `getSmtpCredentials()`, dẫn đến worker fallback sang biến môi trường rỗng. |
| **Điều kiện lọc trạng thái Job** | Đồng nhất `PENDING` và `RETRY_WAIT` | Hệ thống sử dụng thống nhất trạng thái `PENDING` (không dùng `QUEUED`). Job `b6604f10-a40e-4de2-a968-e9e478c7455f` có `next_attempt_at` quá khứ, `attempt_count: 0`, `locked_by: null`, hoàn toàn thỏa điều kiện claim. |

---

## 2. Các giải pháp đã triển khai (Sửa đúng nguyên nhân, bảo mật 2 lớp)

1. **Khắc phục lỗi PL/pgSQL `42702`:**
   - Tạo file migration: `/supabase/migrations/20261012000001_fix_fn_claim_email_jobs_ambiguous_column.sql`.
   - Bổ sung chỉ thị `#variable_conflict use_column` và định danh bảng tường minh `ej.attempt_count`, `ej.max_attempts`.
   - Trong `/src/services/emailWorker.ts`, xây dựng cơ chế **Atomic Claim Fallback** trực tiếp qua `service_role`. Nếu RPC báo lỗi trước khi Quản trị viên chạy SQL migration, Worker vẫn tiếp tục hoạt động an toàn mà không bị tắc nghẽn.
2. **Khai thác chính xác thông tin đăng nhập SMTP đã lưu trên CSDL Admin:**
   - Điều chỉnh `fetchEmailServiceConfig` trả về đầy đủ đối tượng cấu hình từ `system_settings` (gồm `smtp_username` và `smtp_password_ciphertext`).
   - Sử dụng hàm giải mã AES-256-GCM để Worker lấy mật khẩu SMTP trực tiếp từ CSDL đã được lưu tại màn hình Cài đặt Hệ thống (`phuongdv@sthc.edu.vn`), không phụ thuộc vào biến môi trường `SMTP_PASS`.
3. **Tuân thủ mô hình Outbox & Bảo vệ 2 lớp:**
   - Tuyệt đối không gửi SMTP trực tiếp từ frontend hoặc request đăng ký.
   - Giữ nguyên 2 công tắc bảo vệ:
     - **Lớp 1 (Máy chủ/Hạ tầng):** Biến môi trường `EMAIL_WORKER_ENABLED=true` (đã đặt trong `.env` cho Preview và hướng dẫn cho Render/Cloud Run).
     - **Lớp 2 (Nghiệp vụ/Ứng dụng):** Cột `email_business_enabled` trong bảng `system_settings` do Admin kiểm soát.

---

## 3. Bổ sung Bảng Trạng thái Vận hành trên Màn hình Admin (`/admin/email-jobs`)

Màn hình `/admin/email-jobs` được bổ sung khối giám sát vận hành thời gian thực:
- **Card 1 - Công tắc Email Nghiệp vụ:** Hiển thị `Đang Bật` / `Đang Tắt` dựa trên CSDL `system_settings.email_business_enabled`.
- **Card 2 - Công tắc Worker Máy chủ:** Hiển thị trạng thái biến môi trường `EMAIL_WORKER_ENABLED`.
- **Card 3 - Tiến trình Worker Thực tế:** 
  - Chỉ hiển thị `Đang hoạt động (Healthy)` kèm ID tiến trình và chu kỳ nếu có nhịp quét (heartbeat) thực tế trong vòng 35 giây qua.
  - Hiển thị `Tắt trên máy chủ` hoặc `Tắt nghiệp vụ` hoặc `Mất nhịp Heartbeat` nếu điều kiện không thỏa.
- **Card 4 - Thời điểm Heartbeat & Gửi gần nhất:** Hiển thị thời gian quét gần nhất và thời điểm gửi email thành công gần nhất.
- **Thanh cảnh báo lỗi làm sạch (Sanitized Error Banner):** Hiển thị mã lỗi và nội dung lỗi gần nhất đã được làm sạch (loại bỏ toàn bộ mật khẩu, token, secret) để Quản trị viên dễ dàng khắc phục.
- **Nút "Quét hàng đợi ngay":** Cho phép Quản trị viên kích hoạt chu kỳ quét tức thì mà không phải chờ hết khoảng nghỉ 15 giây.

---

## 4. Xử lý tác vụ BLOCKED (`MISSING_OFFICIAL_REGISTRATION_URL`)

### Phân tích bản chất kỹ thuật:
- Tác vụ email được tạo với `payload` là một **snapshot bất biến** tại thời điểm ứng viên đăng ký tư vấn.
- Tác vụ `5c0186b3-545e-4138-92b3-54c8afc9ce99` liên kết với khóa học `CBMA-TC-01` (*Kỹ thuật Chế biến Món ăn Á - Âu*).
- Trong bảng `courses`, khóa học `CBMA-TC-01` hiện có `official_registration_url = null`.
- Khi Quản trị viên cập nhật URL cho khóa học tại trang `/admin/courses`, CSDL chỉ sửa bảng `courses`, **không tự động sửa job cũ** nhằm bảo đảm tính toàn vẹn dữ liệu kiểm toán.

### Cơ chế phục hồi có kiểm soát đã bổ sung vào API `POST /api/v1/admin/email-jobs/:id/retry`:
1. **Kiểm tra liên kết chính xác:** Hệ thống đọc đúng khóa học của hồ sơ (`job.lead_id` → `leads.course_id` hoặc `course_code`), tuyệt đối không lấy link của khóa học khác.
2. **Từ chối nếu khóa học chưa có link:** Nếu khóa học vẫn chưa có `official_registration_url` hợp lệ, API từ chối với mã lỗi `COURSE_OFFICIAL_REGISTRATION_URL_STILL_MISSING` và nêu rõ tên khóa học cần cập nhật.
3. **Đồng bộ snapshot khi hợp lệ:** Khi khóa học đã có URL tuyển sinh chính thức:
   - Tự động cập nhật `payload.official_registration_url` với URL mới.
   - Ghi nhận `metadata.snapshot_refreshed_at`, `snapshot_refreshed_by`, `previous_official_registration_url`, `new_official_registration_url`.
   - Ghi nhận lịch sử vào bảng `audit_logs` với hành động `RETRY_EMAIL_JOB` kèm thay đổi snapshot.
   - Chuyển trạng thái từ `BLOCKED` sang `PENDING` để Worker tự động xử lý.

---

## 5. Kết quả Kiểm thử Thực tế

### Kết quả gửi email tác vụ test `b6604f10-a40e-4de2-a968-e9e478c7455f`:
- **Job ID:** `b6604f10-a40e-4de2-a968-e9e478c7455f`
- **Người nhận:** `Nguyễn Văn B` (`phuongsht@gmail.com`)
- **Trạng thái ban đầu:** `PENDING`
- **Trạng thái sau khi Worker quét:** `PROCESSING` → **`SENT`**
- **Số lần thử:** `1`
- **Thời điểm gửi thành công:** `2026-10-12T12:32:30.331Z`
- **Mã định danh SMTP (Provider Message ID):** `<6a34376a-2c8d-50b2-bb98-d3978b5a93ee@sthc.edu.vn>`
- **Ghi nhận lịch sử (email_job_attempts):**
  - Attempt #1: `status = SUCCESS`, `worker_id = worker-430-zmygb`, `lock_token = 380155bb-c427-425c-8959-ecdbb4727b6a`.

### Kết quả kiểm thử tác vụ khóa an toàn `5c0186b3-545e-4138-92b3-54c8afc9ce99`:
- **Người nhận:** `Nguyễn Thị Bé Ba` (`dienlanhgd@gmail.com`)
- **Trạng thái:** `BLOCKED` (vẫn được giữ nguyên bảo vệ an toàn, không gửi email thiếu link hoặc gửi tới địa chỉ ngoài phạm vi test).
- **Thử nghiệm gọi Retry khi khóa học chưa có URL:** API trả về lỗi HTTP 400 rõ ràng:
  `"Không thể khôi phục tác vụ: Khóa học "Kỹ thuật Chế biến Món ăn Á - Âu" (Mã: CBMA-TC-01) vẫn chưa được cấu hình đường dẫn đăng ký chính thức trên cổng EGOV."`
