# BÁO CÁO TRIỂN KHAI C3.7: MÀN HÌNH THÔNG BÁO CỘNG TÁC VIÊN (/portal/notifications)

**Dự án:** Cổng thông tin Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Thời gian thực hiện:** 09/10/2026  
**Trạng thái kiểm thử:** **10/10 PASS (100%)**  
**Đường dẫn màn hình:** `/portal/notifications`  
**Script kiểm thử tự động:** `npm run test:c3-7` (`scripts/verify_c3_7_affiliate_notification_screen.ts`)

---

## 1. MỤC TIÊU VÀ PHẠM VI TRIỂN KHAI

Bước C3.7 tập trung hoàn thiện giao diện và luồng tương tác hộp thư thông báo dành riêng cho Cộng tác viên (CTV) tại đường dẫn `/portal/notifications`:
- **Đúng 2 tab độc lập:**
  1. **"Thông báo từ Ban quản trị"** (`type: 'ANNOUNCEMENT'`): Tiếp nhận văn bản, chỉ đạo tuyển sinh, chính sách khen thưởng và sự kiện từ Ban Quản trị Nhà trường.
  2. **"Thông báo từ hệ thống"** (`type: 'SYSTEM'`): Tiếp nhận thông báo tự động về tiến độ hồ sơ học viên (`LEAD_SUBMITTED`, `ENROLLMENT_MATCHED`, `ENROLLMENT_VOIDED`), phê duyệt thù lao (`REWARD_APPROVED`, `REWARD_REJECTED`, `REWARD_VOIDED`) và trạng thái tài khoản CTV.
- **Số chưa đọc độc lập:** Hiển thị số đếm riêng biệt cho từng tab trực tiếp từ API `GET /api/v1/portal/notifications/unread-count`, không phụ thuộc vào trang hiện tại hay bộ lọc danh sách. Không hiển thị `0` giả khi gặp lỗi máy chủ.
- **Thanh công cụ lọc & tìm kiếm:** Lọc trạng thái (`Tất cả`, `Chưa đọc`, `Đã đọc`), tìm kiếm tiêu đề thời gian thực (debounced 350ms), và nút làm mới dữ liệu đồng bộ.
- **Phân trang thực tế từ backend:** Quản lý `page`, `limit`, `total_items`, `total_pages` chính xác từ CSDL; tự động trở về trang 1 khi đổi tab hoặc bộ lọc.
- **Đọc thông báo & Xem chi tiết:**
  - Mở modal xem nội dung đầy đủ: Hỗ trợ Markdown, làm sạch HTML an toàn (`sanitizeHtml`).
  - Tự động gọi API `POST /api/v1/portal/notifications/:id/read` khi mở chi tiết thông báo chưa đọc.
  - Cung cấp nút thao tác nhanh "Đánh dấu đã đọc" trực tiếp trên danh sách thẻ.
- **Đánh dấu tất cả đã đọc (Read-All):** Áp dụng độc lập cho tab đang chọn (`ANNOUNCEMENT` hoặc `SYSTEM`), đóng băng mốc thời gian máy chủ `cutoff_at` (không cho phép gửi thời gian tương lai).
- **Mở đối tượng liên quan:** Tích hợp nút hành động mở hồ sơ học viên (`/portal/leads/:id`), danh sách học viên (`/portal/leads`), thông tin ngành học (`/portal/courses`), hoặc tổng quan portal (`/portal`). Chặn tuyệt đối mọi liên kết trỏ sang khu vực Admin.
- **Bảo mật & Phân quyền chặt chẽ:** Chỉ tài khoản CTV có trạng thái `ACTIVE` mới được truy cập; tài khoản chờ duyệt hoặc bị tạm ngưng chuyển hướng về `/pending`; tài khoản Admin/Staff bị chặn 401 khi gọi API hộp thư CTV.
- **Tuân thủ quy chuẩn Universal Frontend Design:** Thiết kế chuẩn SaaS trang nhã, kỷ luật Zero-Pill (không bọc metadata vào chip hay pill capsule dày đặc), bỏ hoàn toàn đường viền đậm một phía (`border-l-4`), áp dụng chữ số bảng (`tabular-nums`) cho mọi chỉ số đếm và mốc thời gian.

---

## 2. KIẾN TRÚC VÀ FILE NGUỒN ĐÃ TRIỂN KHAI

| Thành phần | File nguồn | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Routing & Shell** | `src/App.tsx` | Đăng ký route `/portal/notifications` dùng chung `AppLayout`, bọc `PortalNotificationProvider` kèm `userId` theo phiên CTV `affiliate_active`. |
| **Sidebar Menu** | `src/config/navConfig.ts` | Khai báo mục navigation `notifications` với icon Bell, tiêu đề "Thông báo", URL `/portal/notifications`. |
| **Route Guard** | `src/utils/navigationGuard.ts` | Quy định bảo vệ route `/portal/notifications`: bắt buộc đăng nhập, chỉ cho phép vai trò `affiliate` và trạng thái `ACTIVE`. |
| **Giao diện Hộp thư** | `src/components/affiliate/AffiliateNotificationsView.tsx` | Component hiển thị 2 tab, toolbar, thẻ thông báo Zero-Pill, phân trang backend, tích hợp đọc nhanh và read-all. |
| **Modal Chi tiết** | `src/components/affiliate/AffiliateNotificationDetailModal.tsx` | Modal xem chi tiết an toàn với markdown renderer, tự động đánh dấu đã đọc, nút CTA mở đối tượng liên quan. |
| **Notification Context** | `src/contexts/PortalNotificationContext.tsx` | Quản lý state số đếm chưa đọc toàn cục, cập nhật optimistic và re-fetch khi tab trình duyệt focus. |
| **Backend Endpoints** | `server.ts` | Cung cấp và bảo vệ các API: `GET /notifications`, `GET /unread-count`, `GET /:id`, `POST /:id/read`, `POST /read-all`. |
| **Dịch vụ Sự kiện** | `src/services/notificationEventService.ts` | Bổ sung các phương thức phát sinh sự kiện C3.6B: `emitEnrollmentMatchedEvent`, `emitEnrollmentVoidedEvent`, `emitRewardApprovedEvent`, v.v. |
| **Kiểm thử tự động** | `scripts/verify_c3_7_affiliate_notification_screen.ts` | Bộ kiểm thử tự động 10 ca kiểm tra đầy đủ chức năng và bảo mật. |

---

## 3. ĐỐI CHIẾU CONTRACT VÀ API BACKEND

Màn hình `/portal/notifications` sử dụng 100% các API hộp thư CTV chuẩn đã xây dựng tại C3.4A & C3.4B, tuyệt đối không gọi trực tiếp bảng dữ liệu CSDL từ client:

1. **`GET /api/v1/portal/notifications`**:
   - Tham số: `tab` (`ANNOUNCEMENT` | `SYSTEM`), `is_read` (`true` | `false` | `all`), `search`, `page`, `limit`.
   - Kết quả: `items` (danh sách `NotificationItemDTO`), `server_time`, `pagination` (`page`, `limit`, `total_items`, `total_pages`).
2. **`GET /api/v1/portal/notifications/unread-count`**:
   - Kết quả: `{ total_unread, announcement_unread, system_unread }`.
3. **`GET /api/v1/portal/notifications/:id`**:
   - Trả về chi tiết thông báo thuộc về chính CTV đó; trả về `404 NOT_FOUND` nếu người dùng khác xem trộm.
4. **`POST /api/v1/portal/notifications/:id/read`**:
   - Đánh dấu đã đọc idempotent, trả về `read_at` và `updated_count`.
5. **`POST /api/v1/portal/notifications/read-all`**:
   - Body: `{ tab: 'ANNOUNCEMENT' | 'SYSTEM', cutoff_at: string }`.
   - Cập nhật đồng loạt các thông báo chưa đọc trước mốc `cutoff_at` trong tab chỉ định.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (10/10 PASS)

Lệnh chạy kiểm thử:
```bash
npm run test:c3-7
```

**Bảng kết quả chi tiết từng ca kiểm thử:**

| Mã ca kiểm thử | Tên ca kiểm thử | Thời gian | Kết quả | Chi tiết kiểm chứng |
| :--- | :--- | :---: | :---: | :--- |
| **TC-3.7-01** | Route Guard & Phân quyền truy cập `/portal/notifications` | 0ms | **PASS** | Active CTV được phép; Unauthenticated chuyển hướng `/login`; Suspended/Pending CTV chuyển hướng `/pending`; Admin/Staff bị từ chối `FORBIDDEN`. |
| **TC-3.7-02** | Cấu hình Menu & Sidebar CTV | 0ms | **PASS** | Đã cấu hình mục "Thông báo" (`path: /portal/notifications`) trong `AFFILIATE_NAV_ITEMS`, `isActiveMatch` hoạt động chính xác với URL và query params. |
| **TC-3.7-03** | API Số đếm chưa đọc riêng biệt cho 2 Tab | 354ms | **PASS** | Backend trả về `announcement_unread` và `system_unread` riêng biệt; tổng chưa đọc khớp chính xác tổng 2 tab. |
| **TC-3.7-04** | Bảo vệ Endpoint hộp thư CTV khỏi Admin/Staff | 103ms | **PASS** | Token Admin gọi API hộp thư CTV bị từ chối ngay với mã `401 UNAUTHORIZED`. |
| **TC-3.7-05** | Lọc danh sách theo Tab độc lập | 889ms | **PASS** | Tab ANNOUNCEMENT chỉ trả về các mục `type === 'ANNOUNCEMENT'`; Tab SYSTEM chỉ trả về các mục `type === 'SYSTEM'`. |
| **TC-3.7-06** | Lọc trạng thái đọc và tìm kiếm theo tiêu đề | 651ms | **PASS** | Bộ lọc `is_read=false` loại bỏ 100% thông báo đã đọc; tìm kiếm theo tiêu đề khớp từ khóa chính xác qua backend. |
| **TC-3.7-07** | Phân trang thực tế từ backend | 310ms | **PASS** | Trả về cấu trúc `pagination` chuẩn: `page`, `limit`, `total_items`, `total_pages`. Offset hoạt động chuẩn xác trên CSDL. |
| **TC-3.7-08** | Xem chi tiết và đánh dấu đã đọc một thông báo | 1785ms | **PASS** | Đánh dấu lần 1 cập nhật `is_read: true`, `updated_count: 1`; lần 2 đảm bảo tính idempotent (`updated_count: 0`). CTV B không thể xem trộm thông báo của CTV A (nhận 404). |
| **TC-3.7-09** | Đánh dấu tất cả đã đọc (Read-All) theo tab | 1177ms | **PASS** | Gửi mốc thời gian tương lai bị từ chối 400; gửi `cutoff_at` chuẩn từ server cập nhật thành công và trừ số đếm chưa đọc tức thì cho riêng tab được chọn. |
| **TC-3.7-10** | Điều hướng đối tượng liên quan an toàn | 427ms | **PASS** | 100% `action_url` trỏ về các trang nội bộ hợp lệ của portal (`/portal/leads/...`, `/portal/courses/...`, `/portal`); không có đường dẫn trỏ sang Admin hay domain lạ. |

---

## 5. LƯU Ý TRẠNG THÁI VÀ BÀN GIAO

- **Trạng thái C3.6B:** Giữ nguyên trạng thái ghi nhận **PARTIAL** đối với tính nguyên tử trong SQL (hiện tại Node.js ghi event sau khi RPC commit). Tồn đọng này sẽ được giải quyết triệt để trước bước C3.9A theo kế hoạch.
- **Hoàn thành C3.7:** Màn hình `/portal/notifications` đã hoàn thiện đầy đủ giao diện, logic 2 tab, lọc, phân trang, đọc tin, mở đối tượng liên quan và kiểm thử tự động đạt 100% PASS. Sẵn sàng cho bước **C3.8 (Header Bell & Popover)** tiếp theo.
