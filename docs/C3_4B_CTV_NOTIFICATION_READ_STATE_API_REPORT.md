# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.4B
## HOÀN THIỆN API TRẠNG THÁI ĐỌC THÔNG BÁO DÀNH CHO CỘNG TÁC VIÊN (CTV)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_4B_CTV_NOTIFICATION_READ_STATE_API_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (PASSED 16/16 TEST CASES)**  
**Phạm vi**: Backend Routes, Validation & Security Rules, Cutoff-based Batch Marking, RPC Hardening, Integration Testing  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.4B

Tiếp nối bước C3.4A (API đọc danh sách, chi tiết và số lượng chưa đọc), bước **C3.4B** tập trung hoàn thiện và củng cố toàn diện 2 API thay đổi trạng thái đọc của CTV:
1. `POST /api/v1/portal/notifications/:id/read`: Đánh dấu đã đọc một thông báo cụ thể.
2. `POST /api/v1/portal/notifications/read-all`: Đánh dấu đã đọc toàn bộ thông báo trong một tab cụ thể theo mốc `cutoff_at`.

### Các nguyên tắc cốt lõi đã được giải quyết:
- **Thống nhất ID**: `:id` trên URL là `notification_id` (`notifications.id`). Đồng thời bổ sung trường `recipient_id` rõ ràng vào DTO trả về, duy trì trường `id` để bảo toàn tương thích ngược cho client.
- **Quy tắc danh tính chặt chẽ**: Danh tính CTV (`user_id`) lấy 100% từ phiên đã xác thực (Bearer token/JWT); tuyệt đối không cho phép client truyền `user_id` để đánh dấu đọc thay người khác. Admin/Staff không được đọc thay CTV qua portal API.
- **Tính lũy đẳng (Idempotency)**: Đọc lại giữ nguyên `read_at` đầu tiên, trả về `updated_count: 0`.
- **Mốc `cutoff_at`**: Bắt buộc đối với `read-all`, chỉ chấp nhận mốc thời gian ISO UTC không ở tương lai so với server time; API đọc cung cấp trường `server_time` để client sử dụng.
- **Bảo mật và an toàn dữ liệu**: Chặn thông báo `DRAFT`/`REVOKED`; trả về lỗi `404 Not Found` đồng nhất không làm lộ quyền sở hữu bản ghi.

---

## 2. KẾT QUẢ KIỂM TRA HIỆN TRẠNG MÃ NGUỒN VÀ RPC THỰC TẾ

1. **Xác minh phiên và vai trò**:
   - Hàm `resolvePortalNotificationUserId(req)` trong `server.ts` giải quyết phiên đăng nhập thực tế qua Supabase Auth JWT Bearer token và mapping role trong `profiles`.
   - Các tài khoản không hợp lệ hoặc thiếu token bị từ chối ngay lập tức với mã `401 Unauthorized`.
2. **Cơ chế gọi RPC và Security Definer**:
   - Backend sử dụng danh tính `user_id` đã được xác thực truyền vào RPC.
   - Hàm RPC `fn_mark_notification_as_read` và `fn_mark_all_notifications_as_read` được khai báo `SECURITY DEFINER`, thiết lập `SET search_path = public, pg_temp`.
   - Rút toàn bộ quyền thực thi khỏi `PUBLIC` và `anon`; chỉ cấp quyền cho `authenticated` và `service_role`.
   - Thêm cơ chế kiểm tra chéo: nếu gọi trong ngữ cảnh authenticated user, bắt buộc `auth.uid() = p_user_id`.
3. **Trigger bảo vệ tính bất biến**:
   - Trigger `trg_protect_notification_recipients` trên `notification_recipients` ngăn ngừa việc sửa `user_id`, `notification_id`, `created_at` hoặc un-read từ `read_at NOT NULL` về `NULL`.

---

## 3. THỐNG NHẤT CONTRACT VÀ CONTRACT SPEC CUỐI CÙNG

### 3.1. API Đọc Một Thông Báo: `POST /api/v1/portal/notifications/:id/read`
- **Route**: `POST /api/v1/portal/notifications/:id/read`
- **Tham số URL**: `:id` (UUID hợp lệ của thông báo gốc `notifications.id`).
- **Validation**:
  - Kiểm tra UUID bằng regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`. Nếu sai định dạng -> `400 Bad Request` (`INVALID_ID`).
  - Không chấp nhận `user_id` hoặc `read_at` do client tự cung cấp trong request body/query.
- **Điều kiện nghiệp vụ**:
  - Recipient thuộc về CTV đăng nhập.
  - Thông báo có `status = 'PUBLISHED'`.
  - Chỉ cập nhật `read_at` khi đang `NULL`.
- **Envelope phản hồi**:
```json
{
  "success": true,
  "data": {
    "notification_id": "52980a1f-acd7-4f91-bbaf-fb180473be0f",
    "recipient_id": "900f5707-f347-4d26-b50c-45b777919266",
    "is_read": true,
    "read_at": "2026-10-08T07:31:20.093Z",
    "updated_count": 1
  }
}
```
- **Hành vi khi gọi lại (Re-read / Retry)**:
  - Trả về mã HTTP `200 OK`.
  - `updated_count: 0`.
  - `read_at`: Giữ nguyên chính xác mốc thời gian của lần đọc đầu tiên từ DB.
- **Hành vi khi không tìm thấy / thuộc CTV khác / đã bị thu hồi**:
  - Trả về mã HTTP `404 Not Found` (`code: "NOT_FOUND"`), thông báo: *"Không tìm thấy thông báo hoặc thông báo không khả dụng cho tài khoản của bạn."*

---

### 3.2. API Đọc Tất Cả Trong Một Tab: `POST /api/v1/portal/notifications/read-all`
- **Route**: `POST /api/v1/portal/notifications/read-all`
- **Request Body bắt buộc**:
```json
{
  "tab": "ANNOUNCEMENT",
  "cutoff_at": "2026-10-08T07:31:21.623Z"
}
```
*(Hoặc `"tab": "SYSTEM"`)*
- **Quy tắc kiểm tra**:
  - `tab`: Bắt buộc, chỉ nhận chuỗi `"ANNOUNCEMENT"` hoặc `"SYSTEM"`. Thiếu, rỗng, `null` hoặc truyền `"ALL"` -> Trả về `400 Bad Request` (`MISSING_TAB` hoặc `INVALID_TAB`).
  - `cutoff_at`: Bắt buộc, chuỗi định dạng ISO UTC hợp lệ, không được ở tương lai so với thời gian máy chủ (cho phép dung sai clock 5 giây). Thiếu hoặc sai định dạng/tương lai -> Trả về `400 Bad Request` (`MISSING_CUTOFF`, `INVALID_CUTOFF_FORMAT`, `FUTURE_CUTOFF`).
- **Phạm vi cập nhật**:
  - Recipient thuộc `user_id` đã đăng nhập.
  - Recipient có `read_at IS NULL`.
  - `recipient.created_at <= cutoff_at`.
  - Thuộc tab chỉ định và thông báo gốc có `status = 'PUBLISHED'`.
- **Envelope phản hồi**:
```json
{
  "success": true,
  "data": {
    "tab": "ANNOUNCEMENT",
    "cutoff_at": "2026-10-08T07:31:21.623Z",
    "updated_count": 3,
    "marked_at": "2026-10-08T07:31:21.904Z"
  }
}
```
- **Hành vi khi không có bản ghi nào cần cập nhật / gọi lại cùng mốc cutoff**:
  - Trả về mã HTTP `200 OK`.
  - `updated_count: 0`.

---

## 4. BỔ SUNG MIGRATION KỸ THUẬT (`20261008000003_c3_read_state_rpc_hardening.sql`)

Tại tệp `/supabase/migrations/20261008000003_c3_read_state_rpc_hardening.sql`:
1. Thu hồi toàn bộ quyền gọi các hàm cũ từ `PUBLIC`, `anon`.
2. Tạo hàm `public.fn_mark_notification_as_read(UUID, UUID)` nhận `(p_notification_id, p_user_id)`:
   - Dùng lệnh `SELECT ... FOR SHARE` trên `public.notifications` để đồng bộ khóa với thao tác thu hồi thông báo.
   - Dùng lệnh `SELECT ... FOR UPDATE` trên `public.notification_recipients` để khóa bản ghi người nhận.
   - Cập nhật an toàn và trả về JSON object chuẩn.
3. Tạo hàm `public.fn_mark_all_notifications_as_read(UUID, VARCHAR, TIMESTAMPTZ)` nhận `(p_user_id, p_type, p_cutoff_at)`:
   - Ràng buộc nghiêm ngặt `p_type IN ('ANNOUNCEMENT', 'SYSTEM')`.
   - Kiểm tra `p_cutoff_at` không ở tương lai so với `CLOCK_TIMESTAMP()`.
   - Cập nhật hàng loạt theo điều kiện `created_at <= p_cutoff_at` và `status = 'PUBLISHED'`.
4. Thiết lập `GRANT EXECUTE TO authenticated, service_role`.

---

## 5. BẰNG CHỨNG KIỂM THỬ THỰC TẾ (16/16 TEST CASES ĐẠT 100%)

Đã thực hiện kịch bản kiểm thử tích hợp tự động qua API và DB với 2 tài khoản CTV (User A và User B) với kết quả chi tiết:

| # | Tên Test Case | Mục đích & Điều kiện | Kỳ vọng | Kết quả thực tế | Đánh giá |
|---|---|---|---|---|---|
| **1** | Validate UUID format | Gửi ID dạng chuỗi bất kỳ (`invalid-uuid`) | 400 Bad Request, mã `INVALID_ID` | 400 Bad Request | **PASS** |
| **2** | Non-existent or other user notif | Gửi UUID không tồn tại hoặc của user khác | 404 Not Found, không lộ chủ sở hữu | 404 Not Found | **PASS** |
| **3** | Mark single notification | Đánh dấu 1 thông báo hợp lệ của User A | 200 OK, `updated_count: 1`, có `recipient_id`, `read_at` | 200 OK, `updated_count: 1` | **PASS** |
| **4** | Idempotent re-read | Gọi lại chính thông báo vừa đọc | 200 OK, `updated_count: 0`, giữ nguyên `read_at` | 200 OK, `updated_count: 0`, `read_at` khớp 100% | **PASS** |
| **5** | Data isolation between CTVs | User A đọc không ảnh hưởng User B | User B vẫn có `read_at = null` | DB kiểm tra User B `read_at = null` | **PASS** |
| **6** | Unread count accuracy | Kiểm tra số đếm unread sau khi đọc 1 bản tin | Giảm 1 ở ANNOUNCEMENT, SYSTEM giữ nguyên | `announcement: 0`, `system: 1` | **PASS** |
| **7** | Block read on DRAFT notif | Cố tình đánh dấu đọc thông báo đang là bản nháp | 404 Not Found | 404 Not Found | **PASS** |
| **8** | Read-all missing tab | Gửi body `{}` | 400 Bad Request, mã `MISSING_TAB` | 400 Bad Request | **PASS** |
| **9** | Read-all invalid tab | Gửi `{ tab: "ALL", cutoff_at: ... }` | 400 Bad Request, mã `INVALID_TAB` | 400 Bad Request | **PASS** |
| **10** | Read-all missing cutoff_at | Gửi `{ tab: "SYSTEM" }` thiếu mốc thời gian | 400 Bad Request, mã `MISSING_CUTOFF` | 400 Bad Request | **PASS** |
| **11** | Read-all future cutoff_at | Gửi `cutoff_at` ở ngày mai | 400 Bad Request, mã `FUTURE_CUTOFF` | 400 Bad Request | **PASS** |
| **12** | Read-all valid tab & cutoff | Đọc tất cả tab SYSTEM với cutoff hợp lệ | 200 OK, `updated_count: 1`, `marked_at` | 200 OK, `updated_count: 1` | **PASS** |
| **13** | Idempotent read-all re-call | Gọi lại read-all SYSTEM cùng mốc cutoff | 200 OK, `updated_count: 0` | 200 OK, `updated_count: 0` | **PASS** |
| **14** | Unread count after read-all | Kiểm tra tổng số unread của User A | `total_unread = 0`, `announcement = 0`, `system = 0` | Tất cả bằng 0 | **PASS** |
| **15** | Read detail side-effect check | Gọi `GET /portal/notifications/:id` | `read_at` vẫn là `null`, `is_read = false` | `read_at = null`, `is_read = false` | **PASS** |
| **16** | Spoofed user_id blocked | Truyền query/body `user_id` của CTV B | Bị bỏ qua, không thể sửa thay cho CTV B | CTV B vẫn giữ nguyên chưa đọc | **PASS** |

---

## 6. ĐỒNG BỘ CLIENT SDK VÀ CONTRACT TYPESCRIPT

1. **`src/types/index.ts`**:
   - `NotificationItemDTO`: Thêm `recipient_id: string`, giữ `id` tương thích, thêm `published_at?: string`.
   - `MarkNotificationAsReadResult`: `{ notification_id, recipient_id, is_read, read_at, updated_count }`.
   - `MarkAllNotificationsAsReadResult`: `{ tab, cutoff_at, updated_count, marked_at }`.
2. **`src/services/api.ts`**:
   - `markPortalNotificationAsRead(notificationId: string)`: Nhận `notification_id`.
   - `markAllPortalNotificationsAsRead(tab: 'ANNOUNCEMENT' | 'SYSTEM', cutoffAt?: string)`: Gửi bắt buộc `tab` và `cutoff_at`.
3. **Chất lượng mã nguồn**:
   - `npm run lint` (`tsc --noEmit`): **PASSED** (100% không lỗi).
   - `compile_applet` (`npm run build`): **PASSED** (Biên dịch Vite thành công).

---

## 7. ĐIỀU CHỈNH LỘ TRÌNH DỰ ÁN (ROADMAP ALIGNMENT)

Nhật ký tiến độ dự án (`/docs/PROJECT_NOTE.md`) đã được cập nhật để khắc phục các ghi chú roadmap sai trước đó:
- **C3.4A**: API đọc thông báo dành cho CTV (*Đã hoàn thành*).
- **C3.4B**: API trạng thái đọc thông báo CTV (*Bước hiện tại - Đã hoàn thành 100%*).
- **Tiếp theo -> C3.5A**: API Quản lý thông báo dành cho Admin/Staff (Soạn nháp, chỉnh sửa, chọn người nhận, xuất bản và thu hồi).
- **C3.5B**: Giao diện Quản lý thông báo Admin/Staff.
- **C3.6A & C3.6B**: Tích hợp sự kiện nghiệp vụ tự động A1/A3/A4/A5.
- **C3.7**: Màn hình Hòm thư CTV (2 Tab: Ban quản trị & Hệ thống).
- **C3.8**: Bell Header Icon & Popover thông báo CTV.
- **Email/SMTP**: Thiết kế và triển khai sau.

*(Đã dừng lại sau bước C3.4B theo đúng yêu cầu).*
