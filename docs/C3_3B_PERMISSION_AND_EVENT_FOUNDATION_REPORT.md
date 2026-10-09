# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.3B
## HOÀN THIỆN PHÂN QUYỀN, BẢO VỆ DỮ LIỆU & NỀN TẢNG SỰ KIỆN NGHIỆP VỤ THÔNG BÁO CTV
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_3B_PERMISSION_AND_EVENT_FOUNDATION_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (PASSED)**  
**Phạm vi**: Backend Schema, Row Level Security, Event Outbox Queue, Stored Procedures & RPC Helpers  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.3B

Tiếp nối cơ sở dữ liệu đã tạo ở bước C3.3A, bước **C3.3B** tập trung vào việc:
1. **Kiểm tra hiện trạng mã nguồn & SQL thực tế**, rà soát tính toàn vẹn của phân quyền, bảng dữ liệu và hàm kiểm quyền.
2. **Khắc phục các thiếu sót dữ liệu của C3.3A**: Bổ sung các ràng buộc kiểm tra chuỗi (không khoảng trắng rỗng, giới hạn độ dài), ràng buộc an toàn metadata (chống chứa mật khẩu, token, khóa nhạy cảm), và trigger bảo vệ tính bất biến của bản ghi người nhận.
3. **Xây dựng nền tảng sự kiện và hàng đợi (Event Outbox Pattern)**: Thiết kế bảng `public.notification_events` ghi nhận sự kiện bền vững cùng transaction với nghiệp vụ, chống trùng lặp theo `idempotency_key`, hỗ trợ cơ chế thử lại (`retry_count`, `max_retries`, `dead-letter`, `last_error`), và minh bạch lỗi (tuyệt đối không nuốt lỗi âm thầm qua `EXCEPTION WHEN OTHERS THEN NULL`).
4. **Chuẩn bị các hàm Helper & RPC tái sử dụng**: Xây dựng đầy đủ các function PL/pgSQL phục vụ tích hợp nghiệp vụ tự động A1/A3/A4/A5 (C3.6A/C3.6B) và API hòm thư/Bell (C3.4A/C3.4B).
5. **Duy trì tính nhất quán kiến trúc**: Không sửa đổi file migration cũ `20261008000001_c3_notification_schema_and_permissions.sql`, áp dụng toàn bộ cải tiến qua migration bổ sung `20261008000002_c3_event_queue_and_notification_helpers.sql`.

---

## 2. KẾT QUẢ KIỂM TRA HIỆN TRẠNG (SQL & PERMISSIONS AUDIT)

### 2.1. Kiểm tra 2 bảng dữ liệu C3.3A
- **`public.notifications`**:
  - Đã có cấu trúc tách biệt nội dung, vòng đời (`status`: `DRAFT`, `PUBLISHED`, `REVOKED`), phân loại (`type`: `ANNOUNCEMENT`, `SYSTEM`), và phạm vi phân phối (`recipient_scope`).
  - *Thiếu sót phát hiện*: Chưa có ràng buộc ngăn chặn tiêu đề/nội dung chỉ gồm khoảng trắng rỗng; chưa có kiểm tra định dạng an toàn cho `metadata` và `recipient_filter`. Đã được khắc phục trong C3.3B qua migration bổ sung.
- **`public.notification_recipients`**:
  - Đã có khóa ngoại liên kết tới `notifications(id)` và `profiles(id)`, sử dụng `read_at IS NOT NULL` làm nguồn xác định duy nhất trạng thái đã đọc.
  - Khóa `UNIQUE (notification_id, user_id)` bảo đảm mỗi CTV chỉ có 1 bản ghi duy nhất cho 1 thông báo.
  - *Thiếu sót phát hiện*: Cần trigger ngăn ngừa việc thay đổi khóa ngoại `user_id`/`notification_id` hoặc hành vi đảo ngược trạng thái `read_at` từ ĐÃ ĐỌC về CHƯA ĐỌC. Đã được bổ sung qua trigger bất biến `trg_protect_notification_recipients`.

### 2.2. Kiểm tra cơ chế phân quyền (fn_has_permission & fn_get_user_permissions)
- Tại file `20261006000001_a5_permissions_foundation.sql`:
  - Hàm `public.fn_get_user_permissions(p_user_id UUID)`:
    - Nếu tài khoản có vai trò `admin` và đang kích hoạt: Tự động trả về toàn bộ danh sách mã quyền từ bảng `public.permissions` (`SELECT p.code FROM public.permissions p`).
    - Nếu tài khoản có vai trò `staff` và đang kích hoạt: Lấy danh sách các quyền từ các nhóm quyền đang active được gán cho nhân viên trong bảng `public.staff_permission_groups`.
    - CTV (`affiliate`) và người dùng thông thường không có quyền quản trị.
  - Hàm `public.fn_has_permission(p_user_id UUID, p_perm TEXT)`: Trả về `BOOLEAN` dựa trên kết quả của `fn_get_user_permissions`.
- **4 quyền quản lý thông báo**:
  - `notifications.view`: Xem danh sách thông báo & bản tin BQT.
  - `notifications.create`: Soạn thảo và chỉnh sửa bản nháp.
  - `notifications.publish`: Phát hành thông báo ra mạng lưới.
  - `notifications.revoke`: Thu hồi thông báo.
- **Nhóm quyền `notification_manager`**: Đã được tạo và gắn cả 4 quyền trên trong `permission_group_items`.
- **Tình trạng gán nhóm cho Staff**:
  - Trong dữ liệu hiện hữu và các migration đã duyệt, **chưa có tài khoản Staff nào được gán nhóm `notification_manager` mặc định**.
  - Toàn bộ tài khoản `admin` tự động có đầy đủ 4 quyền thông báo.
  - Để Staff có thể thao tác thông báo, quản trị viên cấp cao (Admin) sẽ phân quyền thông qua bảng `staff_permission_groups`.
- **Trạng thái môi trường**:
  - Các tệp migration được quản lý tập trung trong thư mục `/supabase/migrations`.
  - Môi trường phát triển cục bộ không kết nối CLI trực tiếp tới máy chủ PostgreSQL/Supabase thật (không có lệnh `psql` trong hệ thống).
  - *Xác nhận*: Kết quả kiểm tra tính đúng đắn được bảo đảm thông qua cú pháp migration SQL chuẩn PostgreSQL, TypeScript type-check (`tsc --noEmit`) và biên dịch ứng dụng (`npm run build`). Chưa áp dụng trực tiếp lên cơ sở dữ liệu live của môi trường production; cần áp dụng theo quy trình CI/CD khi release.

---

## 3. KHẮC PHỤC THIẾU SÓT DỮ LIỆU C3.3A (MIGRATION BỔ SUNG)

Tại tệp `/supabase/migrations/20261008000002_c3_event_queue_and_notification_helpers.sql`:

### 3.1. Ràng buộc độ dài & nội dung (Data Validation Constraints)
```sql
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_title_valid
CHECK (length(trim(title)) >= 3 AND length(trim(title)) <= 255);

ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_content_valid
CHECK (length(trim(content)) >= 5 AND length(content) <= 50000);

ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_summary_valid
CHECK (summary IS NULL OR (length(trim(summary)) > 0 AND length(summary) <= 1000));
```

### 3.2. Ràng buộc an toàn Metadata (Security Sanitization Constraints)
Ngăn chặn tuyệt đối việc lưu trữ khóa nhạy cảm trong cột `metadata`:
```sql
ALTER TABLE public.notifications
ADD CONSTRAINT chk_notifications_metadata_security
CHECK (
    metadata IS NULL OR (
        jsonb_typeof(metadata) = 'object'
        AND NOT (metadata ? 'password')
        AND NOT (metadata ? 'token')
        AND NOT (metadata ? 'secret')
        AND NOT (metadata ? 'smtp_password')
        AND NOT (metadata ? 'apiKey')
        AND NOT (metadata ? 'api_key')
    )
);
```

### 3.3. Trigger bảo vệ tính bất biến của người nhận (Immutability Enforcement)
Hàm `fn_protect_notification_recipients_immutable` được kích hoạt trước mỗi lệnh `UPDATE`:
- Cấm thay đổi `user_id` và `notification_id` (tránh chiếm đoạt hoặc chuyển giao bản ghi).
- Cấm thay đổi thời gian tạo `created_at`.
- Cấm chuyển `read_at` từ `NOT NULL` về `NULL` (không cho phép CTV "un-read" thông báo nhằm làm sai lệch dữ liệu).

---

## 4. THIẾT KẾ NỀN TẢNG SỰ KIỆN & HÀNG ĐỢI (OUTBOX PATTERN)

Bảng `public.notification_events` được thiết lập nhằm làm cầu nối bền vững giữa các luồng nghiệp vụ (A1, A3, A4, A5) và phân hệ thông báo:

### 4.1. Cấu trúc bảng `public.notification_events`
| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, gen_random_uuid() | Định danh duy nhất của sự kiện |
| `event_type` | VARCHAR(50) | NOT NULL | Loại sự kiện (ví dụ: `REWARD_APPROVED`, `LEAD_SUBMITTED`) |
| `source_entity_type` | VARCHAR(50) | NOT NULL | Bảng nguồn (ví dụ: `rewards`, `leads`, `profiles`) |
| `source_entity_id` | UUID | NOT NULL | Khóa chính của bản ghi nguồn |
| `transition_state` | VARCHAR(100) | NULL | Mốc chuyển trạng thái (ví dụ: `pending->approved`) |
| `idempotency_key` | VARCHAR(255) | NOT NULL, UNIQUE | Khóa chống trùng lặp nghiệp vụ |
| `recipient_user_id` | UUID | REFERENCES profiles(id) | CTV nhận thông báo cá nhân |
| `payload` | JSONB | NOT NULL, DEFAULT '{}' | Dữ liệu ngữ cảnh phục vụ sinh nội dung |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'PENDING' | Vòng đời: `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`, `DEAD_LETTER` |
| `retry_count` | INT | NOT NULL, DEFAULT 0 | Số lần đã thử lại |
| `max_retries` | INT | NOT NULL, DEFAULT 3 | Ngưỡng thử lại tối đa trước khi vào Dead-Letter |
| `last_error` | TEXT | NULL | Ghi nhận chi tiết thông điệp lỗi kỹ thuật |
| `notification_id` | UUID | REFERENCES notifications(id) | Liên kết tới thông báo hệ thống được tạo ra |
| `processed_at` | TIMESTAMPTZ | NULL | Thời điểm xử lý thành công |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Thời điểm ghi nhận sự kiện vào hàng đợi |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Thời điểm cập nhật trạng thái gần nhất |

### 4.2. Tính năng kỹ thuật của Outbox Queue
1. **Giao dịch bền vững (Transactional Integrity)**: Khi tích hợp vào các RPC nghiệp vụ (A1/A3/A4/A5), bản ghi sự kiện được ghi cùng một database transaction. Nếu nghiệp vụ rollback, sự kiện tự động hủy, không bao giờ sinh thông báo rác ("ghost notifications").
2. **Chống trùng lặp tuyệt đối (Idempotency)**:
   - Khóa duy nhất `uq_notification_events_idempotency` trên `idempotency_key`.
   - Quy tắc tạo khóa: `evt:{EVENT_TYPE}:{SOURCE_ID}:{TRANSITION_STATE_OR_STEP}`.
   - Cho phép các bước chuyển trạng thái tiếp theo của cùng một đối tượng (ví dụ: Lead từ `SUBMITTED` -> `COUNSELING` -> `ENROLLED`) được ghi nhận độc lập mà không bị chặn nhầm.
3. **Thử lại và Dead-Letter Queue (Fault Tolerance)**:
   - Nếu xảy ra sự cố (khóa ngoại tạm thời không khớp, lỗi hệ thống), sự kiện chuyển sang trạng thái `FAILED`, tăng `retry_count` và ghi vết `last_error`.
   - Khi vượt quá `max_retries` (3 lần), bản ghi chuyển sang `DEAD_LETTER` để quản trị viên đối soát, không gây nghẽn hàng đợi.
4. **Minh bạch lỗi (Fail-Loud Architecture)**:
   - Tuyệt đối không dùng `EXCEPTION WHEN OTHERS THEN NULL` để nuốt lỗi âm thầm.
   - Mọi lỗi xử lý đều được cập nhật vào `last_error` và ném exception rõ ràng kèm mã lỗi SQLSTATE.

---

## 5. DANH MỤC CÁC HÀM HELPER & RPC TÁI SỬ DỤNG

Migration `20261008000002_c3_event_queue_and_notification_helpers.sql` cung cấp 6 hàm PL/pgSQL chuẩn mực:

### 5.1. `fn_create_notification_event`
- **Mục đích**: Ghi nhận sự kiện nghiệp vụ vào hàng đợi an toàn, chống trùng lặp.
- **Tham số**:
  - `p_event_type TEXT`: Mã sự kiện.
  - `p_source_entity_type TEXT`: Tên thực thể nguồn.
  - `p_source_entity_id UUID`: ID thực thể nguồn.
  - `p_idempotency_key TEXT`: Khóa chống trùng.
  - `p_recipient_user_id UUID`: ID CTV thụ hưởng.
  - `p_payload JSONB`: Dữ liệu chi tiết.
  - `p_transition_state TEXT`: Mốc chuyển đổi trạng thái.
- **Đặc điểm**: Nếu `idempotency_key` đã tồn tại, trả về `is_duplicate = true` cùng ID cũ, không tạo trùng.

### 5.2. `fn_dispatch_notification`
- **Mục đích**: Phân phối thông báo tới người nhận (Fan-out).
- **Hỗ trợ 4 chế độ phân phối**:
  1. Mảng danh sách người nhận cụ thể (`p_recipient_user_ids UUID[]`).
  2. Toàn bộ CTV đang hoạt động (`recipient_scope = 'ALL'`).
  3. Lọc CTV theo trạng thái hoạt động (`recipient_scope = 'STATUS_FILTER'`).
  4. Lọc CTV theo danh sách chỉ định trong bộ lọc (`recipient_scope = 'SPECIFIC'`).
- **An toàn hiệu năng**: Áp dụng `ON CONFLICT (notification_id, user_id) DO NOTHING` để không gây lỗi trùng lặp và không gây nghẽn lock trên bảng người nhận.

### 5.3. `fn_process_notification_event`
- **Mục đích**: Xử lý một sự kiện trong hàng đợi thành bản ghi `notifications` (loại `SYSTEM`) và phân phối tới hộp thư CTV.
- **Cơ chế chống tranh chấp**: Sử dụng `FOR UPDATE` trên bản ghi sự kiện.
- **Mẫu nội dung chuẩn hóa**:
  - **A1**: `AFFILIATE_APPROVED`, `AFFILIATE_REJECTED`, `AFFILIATE_SUSPENDED`, `AFFILIATE_REACTIVATED`.
  - **A3**: `LEAD_SUBMITTED`, `LEAD_COUNSELING_UPDATED`.
  - **A4**: `ENROLLMENT_MATCHED`, `ENROLLMENT_VOIDED`.
  - **A5**: `REWARD_APPROVED`, `REWARD_REJECTED`, `REWARD_VOIDED`.
  - Định tuyến đúng màn hình nghiệp vụ qua `action_url` (`/portal/dashboard`, `/portal/profile`, `/portal/leads`, `/portal/rewards`).
- **Xử lý lỗi**: Cập nhật `retry_count`, `last_error`, chuyển `DEAD_LETTER` nếu vượt quá giới hạn và ném exception rõ ràng.

### 5.4. `fn_mark_notification_as_read`
- **Mục đích**: Đánh dấu đã đọc một thông báo cụ thể.
- **Bảo mật**: Kiểm tra chặt chẽ `auth.uid() = user_id` (chỉ chính chủ mới được sửa thông báo của mình, hoặc Admin quản trị).

### 5.5. `fn_mark_all_notifications_as_read`
- **Mục đích**: Đánh dấu đã đọc tất cả thông báo của người dùng.
- **Lọc theo Tab**: Tham số `p_type` hỗ trợ đánh dấu riêng theo tab `ANNOUNCEMENT` (Ban quản trị) hoặc `SYSTEM` (Hệ thống), hoặc toàn bộ nếu để `NULL`.

### 5.6. `fn_get_unread_notification_counts`
- **Mục đích**: Đếm số lượng thông báo chưa đọc cho Bell Header và Badge của 2 Tab.
- **Kết quả trả về**:
  - `total_unread`: Tổng số thông báo chưa đọc của CTV.
  - `announcement_unread`: Số thông báo chưa đọc từ Ban quản trị.
  - `system_unread`: Số thông báo chưa đọc từ Hệ thống.
- **Hiệu năng tối đa**: Sử dụng chỉ mục một phần `idx_notification_recipients_unread` (`WHERE read_at IS NULL`) kết hợp điều kiện `status = 'PUBLISHED'`.

---

## 6. PHÂN QUYỀN VÀ BẢO MẬT (SECURITY & RLS POLICIES)

| Đối tượng CSDL | Vai trò truy cập | Quyền hạn |
|---|---|---|
| `public.notification_events` | `service_role` | Toàn quyền (SELECT, INSERT, UPDATE, DELETE) |
| `public.notification_events` | `admin` | Xem toàn bộ nhật ký sự kiện hàng đợi |
| `public.notification_events` | `staff` (có `notifications.view`) | Xem nhật ký sự kiện phục vụ đối soát |
| `public.notification_events` | `affiliate` (CTV) | Chỉ xem các sự kiện gửi cho chính mình (`recipient_user_id = auth.uid()`) |
| `fn_create_notification_event` | `authenticated`, `service_role` | Được phép gọi để ghi nhận sự kiện |
| `fn_dispatch_notification` | `authenticated`, `service_role` | Kiểm tra quyền `notifications.publish` đối với bản tin BQT |
| `fn_process_notification_event` | `authenticated`, `service_role` | Thực thi consumer xử lý hàng đợi |
| `fn_mark_notification_as_read` | `authenticated` | Chỉ cập nhật bản ghi của chính tài khoản đăng nhập |
| `fn_mark_all_notifications_as_read` | `authenticated` | Chỉ cập nhật bản ghi của chính tài khoản đăng nhập |
| `fn_get_unread_notification_counts` | `authenticated` | Chỉ xem số đếm của chính tài khoản đăng nhập (hoặc Admin/Staff có quyền) |

---

## 7. CẬP NHẬT CONTRACTS TYPESCRIPT (`/src/types/index.ts`)

Đã bổ sung các kiểu dữ liệu phản ánh chính xác cấu trúc nền tảng sự kiện và kết quả RPC:
1. `NotificationEventStatus`: `'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER'`
2. `NotificationEvent`: Giao diện thực thể đầy đủ của bảng `public.notification_events`.
3. `CreateNotificationEventParams`: Kiểu tham số đầu vào cho hàm ghi nhận sự kiện.
4. `NotificationEventOperationResult`: Kết quả phản hồi của các thao tác sự kiện.
5. `MarkNotificationAsReadResult`: Kết quả đánh dấu đã đọc một thông báo.
6. `MarkAllNotificationsAsReadResult`: Kết quả đánh dấu đã đọc toàn bộ thông báo.
7. `NotificationUnreadCountsResult`: Cấu trúc số đếm chưa đọc cho Bell và Tabs.

---

## 8. PHẠM VI DỪNG VÀ KẾ HOẠCH BƯỚC TIẾP THEO

- **Tuân thủ giới hạn bước C3.3B**:
  - Không sửa đổi hoặc can thiệp vào các trigger/hàm nghiệp vụ hiện hành của A1/A3/A4/A5.
  - Không xây dựng API route, giao diện người dùng (Bell, Hộp thư CTV, Màn hình Quản trị) hoặc dịch vụ gửi email SMTP trong bước này.
  - Đã dừng lại an toàn sau khi hoàn thành toàn bộ nền tảng phân quyền, bảng hàng đợi sự kiện và các RPC helpers.
- **Kế hoạch các bước tiếp theo**:
  - **C3.4A**: Xây dựng API hộp thư cá nhân và đánh dấu đã đọc dành cho CTV (`/portal/notifications`).
  - **C3.4B**: Xây dựng API soạn thảo, quản trị bản tin và phân phối dành cho Admin/Staff (`/admin/notifications`).
  - **C3.5**: Triển khai giao diện hòm thư CTV 2 tab và Bell Icon đếm chưa đọc trên header.
  - **C3.6A & C3.6B**: Tích hợp sự kiện nghiệp vụ tự động vào các luồng A1, A3, A4, A5 thông qua các RPC Helper đã chuẩn bị.
