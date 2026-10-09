# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.4A
## TRIỂN KHAI API ĐỌC THÔNG BÁO VÀ HÒM THƯ DÀNH CHO CỘNG TÁC VIÊN (CTV)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_4A_CTV_NOTIFICATION_READ_API_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (PASSED)**  
**Phạm vi**: Backend Express Routes, Authentication & Authorization, RPC Integration, DTO Mapping, Integration Testing  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.4A

Tiếp nối nền tảng dữ liệu C3.3A và hệ thống hàng đợi Outbox / Stored Procedures C3.3B, bước **C3.4A** tập trung triển khai nhóm API đọc thông báo dành riêng cho người dùng Cộng tác viên (CTV) tuyển sinh, bao gồm:
1. **API Danh sách thông báo hòm thư CTV** (`GET /api/v1/portal/notifications`):
   - Phân trang chuẩn (`page`, `limit`, `total_items`, `total_pages`, `has_next`, `has_prev`).
   - Bộ lọc theo 2 tab chuẩn: `ANNOUNCEMENT` (Thông báo từ Ban quản trị) và `SYSTEM` (Thông báo từ hệ thống).
   - Bộ lọc theo trạng thái đọc `is_read` (`true`, `false`, `all`), theo danh mục (`category`), và tìm kiếm từ khóa theo tiêu đề (`search`).
2. **API Số đếm chưa đọc tổng hợp và theo 2 tab** (`GET /api/v1/portal/notifications/unread-count`):
   - Tối ưu hóa cực cao nhờ gọi RPC `public.fn_get_unread_notification_counts(p_user_id)` tận dụng Partial Index `idx_notification_recipients_unread`.
   - Cung cấp chính xác 3 chỉ số: `total_unread`, `announcement_unread`, `system_unread`.
3. **API Danh sách rút gọn 5 thông báo mới nhất cho Bell Header** (`GET /api/v1/portal/notifications/bell-recent`):
   - Trả về danh sách rút gọn các thông báo mới nhất gửi đến CTV kèm số đếm chưa đọc.
4. **API Xem chi tiết thông báo** (`GET /api/v1/portal/notifications/:id`):
   - Tuân thủ nguyên tắc bảo mật và HTTP chuẩn mực: **Chỉ đọc dữ liệu, TUYỆT ĐỐI KHÔNG tự ý đánh dấu đã đọc khi xem chi tiết**.
5. **API Đánh dấu đã đọc một thông báo** (`POST /api/v1/portal/notifications/:id/read`):
   - Gọi RPC `public.fn_mark_notification_as_read(p_notification_id, p_user_id)`.
   - Kiểm tra nghiêm ngặt quyền sở hữu: CTV chỉ được đánh dấu thông báo trong hộp thư của chính mình.
6. **API Đánh dấu đã đọc toàn bộ** (`POST /api/v1/portal/notifications/read-all`):
   - Gọi RPC `public.fn_mark_all_notifications_as_read(p_user_id, p_type)`.
   - Hỗ trợ đánh dấu toàn bộ hoặc đánh dấu riêng theo từng tab (`ANNOUNCEMENT` hoặc `SYSTEM`).

---

## 2. KIỂM TRA HIỆN TRẠNG CSDL VÀ PHÂN QUYỀN TRƯỚC KHI TRIỂN KHAI

### 2.1. Xác minh bảng dữ liệu và hàm RPC trên máy chủ
Đã thực thi kiểm tra trực tiếp qua PostgreSQL / Supabase client:
- Bảng `public.notifications`: Tồn tại, cấu trúc chuẩn với `type`, `category`, `status`, `recipient_scope`, `metadata`, ràng buộc độ dài tiêu đề/nội dung.
- Bảng `public.notification_recipients`: Tồn tại, liên kết ngoại tới `notifications` và `profiles`, trường `read_at IS NOT NULL` là nguồn xác định duy nhất trạng thái đã đọc.
- Bảng `public.notification_events`: Tồn tại, phục vụ cơ chế Outbox Pattern bền vững.
- RPC `fn_get_unread_notification_counts`: Tồn tại và hoạt động ổn định trên CSDL live.
- RPC `fn_mark_notification_as_read`: Tồn tại, bảo vệ quyền sở hữu (`ERRCODE 42501` nếu can thiệp vào bản ghi của người khác).
- RPC `fn_mark_all_notifications_as_read`: Tồn tại, hỗ trợ tham số `p_type`.

### 2.2. Kiểm tra an toàn bảo mật quyền gọi RPC
- Quyền gọi các hàm nội bộ (`fn_create_notification_event`, `fn_dispatch_notification`, `fn_process_notification_event`) đã được đóng đối với `PUBLIC`, chỉ cho phép `service_role` và `authenticated` thực thi trong ngữ cảnh nghiệp vụ đã kiểm tra quyền.
- CTV thông thường không được xem nội dung hàng đợi `notification_events` của người khác hoặc bảng nháp `notifications` (`status = 'DRAFT'`).
- Mọi truy vấn danh sách hòm thư CTV chỉ lấy các thông báo có `status = 'PUBLISHED'`.

---

## 3. CHI TIẾT CONTRACT & SPEC CÁC ENDPOINT C3.4A

### 3.1. GET `/api/v1/portal/notifications`
- **Mục đích**: Lấy danh sách thông báo hòm thư cá nhân của CTV.
- **Yêu cầu xác thực**: Header `Authorization: Bearer <token>` hoặc phiên làm việc CTV.
- **Tham số Query**:
  | Tham số | Kiểu | Mô tả |
  |---|---|---|
  | `tab` / `type` | string | `ANNOUNCEMENT` (Ban quản trị) hoặc `SYSTEM` (Hệ thống) |
  | `is_read` | string / boolean | `true` (đã đọc), `false` (chưa đọc), `all` (tất cả) |
  | `category` | string | `GENERAL`, `POLICY`, `URGENT`, `EVENT`, `LEAD`, `RECONCILIATION`, `REWARD`, `ACCOUNT` |
  | `search` | string | Tìm kiếm từ khóa không phân biệt hoa thường theo tiêu đề |
  | `page` | number | Trang cần lấy (mặc định: `1`) |
  | `limit` | number | Số lượng bản ghi mỗi trang (mặc định: `20`, tối đa `100`) |
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid-recipient",
        "notification_id": "uuid-notification",
        "type": "ANNOUNCEMENT",
        "category": "POLICY",
        "title": "Chính sách thưởng tuyển sinh quý 4/2026",
        "summary": "Ban Giám hiệu công bố chính sách thưởng mới cho CTV",
        "content": "<p>Chi tiết chính sách thưởng tuyển sinh...</p>",
        "action_url": "/portal/rewards",
        "read_at": null,
        "is_read": false,
        "event_type": null,
        "created_at": "2026-10-08T07:16:43.000Z",
        "published_at": "2026-10-08T07:16:43.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 1,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    },
    "filters": {
      "tab": "ANNOUNCEMENT",
      "type": "ANNOUNCEMENT",
      "is_read": null,
      "category": null,
      "search": null
    }
  }
}
```

### 3.2. GET `/api/v1/portal/notifications/unread-count`
- **Mục đích**: Cung cấp số lượng thông báo chưa đọc cho Bell Header và Badge đếm trên 2 Tab.
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "total_unread": 2,
    "announcement_unread": 1,
    "system_unread": 1
  }
}
```

### 3.3. GET `/api/v1/portal/notifications/bell-recent`
- **Mục đích**: Cung cấp 5 thông báo mới nhất cho Popover chuông thông báo (Bell header).
- **Tham số Query**: `limit` (mặc định: `5`, tối đa `10`).
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "items": [ /* Danh sách tối đa 5 thông báo mới nhất */ ],
    "unread_counts": {
      "total_unread": 2,
      "announcement_unread": 1,
      "system_unread": 1
    }
  }
}
```

### 3.4. GET `/api/v1/portal/notifications/:id`
- **Mục đích**: Xem chi tiết một thông báo cụ thể. Hỗ trợ truyền theo cả ID bản ghi `notification_recipients` hoặc `notifications.id`.
- **Nguyên tắc**: **Không tự ý chuyển trạng thái đã đọc**.
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-recipient",
    "notification_id": "uuid-notification",
    "type": "ANNOUNCEMENT",
    "category": "POLICY",
    "title": "Chính sách thưởng tuyển sinh quý 4/2026",
    "summary": "Ban Giám hiệu công bố chính sách thưởng mới cho CTV",
    "content": "<p>Chi tiết chính sách thưởng tuyển sinh...</p>",
    "action_url": "/portal/rewards",
    "read_at": null,
    "is_read": false,
    "event_type": null,
    "created_at": "2026-10-08T07:16:43.000Z",
    "published_at": "2026-10-08T07:16:43.000Z"
  }
}
```

### 3.5. POST `/api/v1/portal/notifications/:id/read`
- **Mục đích**: Đánh dấu đã đọc một thông báo cụ thể.
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "user_id": "uuid-ctv",
    "marked_as_read": true,
    "notification_id": "uuid-notification"
  }
}
```

### 3.6. POST `/api/v1/portal/notifications/read-all`
- **Mục đích**: Đánh dấu đã đọc toàn bộ hoặc theo tab chỉ định.
- **Body**: `{ "tab": "ANNOUNCEMENT" }` hoặc `{ "tab": "SYSTEM" }` hoặc `{}` (tất cả).
- **Cấu trúc phản hồi**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "user_id": "uuid-ctv",
    "type_filtered": "ANNOUNCEMENT",
    "updated_count": 1
  }
}
```

---

## 4. KẾT QUẢ KIỂM THỬ TÍCH HỢP (INTEGRATION TESTS)

Đã thực hiện kịch bản kiểm thử tích hợp tự động toàn diện qua Node.js:
1. **Kiểm tra từ chối truy cập trái phép (Unauthenticated)**:
   - `GET /api/v1/portal/notifications` không có token -> Trả về mã HTTP `401 Unauthorized`.
   - Kết quả: **PASS**.
2. **Kiểm tra tính chính xác của số đếm chưa đọc (Unread counts)**:
   - Tạo 1 thông báo `ANNOUNCEMENT` và 1 thông báo `SYSTEM` cho CTV kiểm thử.
   - Gọi `GET /unread-count` -> Trả về `total_unread = 2`, `announcement_unread = 1`, `system_unread = 1`.
   - Kết quả: **PASS**.
3. **Kiểm tra danh sách Bell header**:
   - Gọi `GET /bell-recent?limit=5` -> Trả về chính xác 2 items kèm `unread_counts`.
   - Kết quả: **PASS**.
4. **Kiểm tra lọc theo tab**:
   - Gọi `GET /portal/notifications?tab=ANNOUNCEMENT` -> Chỉ trả về 1 thông báo BQT.
   - Kết quả: **PASS**.
5. **Kiểm tra tính bất biến của trạng thái đọc khi gọi GET detail**:
   - Gọi `GET /portal/notifications/:id` -> `read_at` vẫn là `null`, `is_read` là `false`.
   - Kết quả: **PASS** (Không có hành vi đánh dấu đã đọc ngầm).
6. **Kiểm tra đánh dấu đã đọc một thông báo**:
   - Gọi `POST /portal/notifications/:id/read` -> Đánh dấu thành công.
   - Gọi lại `GET /unread-count` -> `total_unread = 1`, `announcement_unread = 0`, `system_unread = 1`.
   - Kết quả: **PASS**.
7. **Kiểm tra đánh dấu đã đọc toàn bộ theo tab**:
   - Gọi `POST /portal/notifications/read-all` với `{"tab": "SYSTEM"}` -> `updated_count = 1`.
   - Gọi lại `GET /unread-count` -> `total_unread = 0`, `announcement_unread = 0`, `system_unread = 0`.
   - Kết quả: **PASS**.
8. **Kiểm tra dọn dẹp dữ liệu**:
   - Dọn dẹp hoàn toàn dữ liệu kiểm thử, không để lại bản ghi rác trên cơ sở dữ liệu.
   - Kết quả: **PASS**.

---

## 5. ĐỒNG BỘ CLIENT SDK (`src/services/api.ts`)

Đã bổ sung 6 hàm client trong `api` object:
- `getPortalNotifications(params)`: Gọi API danh sách thông báo phân trang và bộ lọc.
- `getPortalUnreadNotificationCounts()`: Lấy số lượng thông báo chưa đọc.
- `getPortalBellRecentNotifications(limit)`: Lấy thông báo chuông header.
- `getPortalNotificationDetail(id)`: Lấy chi tiết thông báo.
- `markPortalNotificationAsRead(id)`: Đánh dấu đã đọc một thông báo.
- `markAllPortalNotificationsAsRead(tab)`: Đánh dấu đã đọc toàn bộ.

Toàn bộ mã nguồn đã vượt qua kiểm tra tĩnh (`npm run lint` / `tsc --noEmit`) và biên dịch ứng dụng (`npm run build`).

---

## 6. PHẠM VI DỪNG VÀ BÀN GIAO TIẾP THEO

- **Tuân thủ đúng phạm vi yêu cầu**:
  - Đã hoàn thành 100% mục tiêu của bước **C3.4A — API đọc thông báo dành cho CTV**.
  - Không triển khai giao diện màn hình CTV (`C3.7`) hay Bell Icon UI (`C3.8`) trong bước này.
  - Không can thiệp vào API soạn thảo BQT Admin (`C3.4B`) hay tích hợp sự kiện nghiệp vụ (`C3.6A/B`).
  - Dừng lại sau bước C3.4A theo chỉ đạo.
