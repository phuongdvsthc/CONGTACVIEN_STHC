# BÁO CÁO KIỂM KÊ VÀ XỬ LÝ LỖI BELL THÔNG BÁO ADMIN/STAFF

**Dự án:** Cổng Đại sứ Tuyển sinh STHC (`STHC_CTV`)  
**Mã tác vụ:** C3_ADMIN_STAFF_BELL_FIX  
**Ngày thực hiện:** 12/10/2026  

---

## 1. Kiểm kê và xác định nguyên nhân gốc (Root Cause Audit)

Đã đối chiếu toàn bộ luồng từ khi CTV đăng ký thành công đến khi thông báo xuất hiện trên thanh chuông header của Admin/Staff. Các nguyên nhân trực tiếp làm xảy ra lỗi:

1. **Chặn quyền tại Backend `resolvePortalNotificationUserId`**:
   - Trước khi sửa, hàm `resolvePortalNotificationUserId` trong `server.ts` kiểm tra `if (prof.role !== 'affiliate')` và trả về `401 UNAUTHORIZED` ("*Tài khoản Quản trị/Cán bộ không sử dụng hộp thư CTV*"). Do đó, mọi API lấy số lượng chưa đọc (`/unread-count`) và danh sách chuông (`/bell-recent`) của Admin/Staff đều bị từ chối với lỗi 401.

2. **Truyền `userId` rỗng tại Frontend `App.tsx`**:
   - `PortalNotificationProvider` được gọi với `userId={authSession.role === 'affiliate_active' ? authSession.user?.id : null}`. Khi tài khoản là Admin hoặc Staff, provider nhận `userId = null` nên không bao giờ gọi API cập nhật số thông báo chưa đọc.

3. **Ẩn nút "Xem tất cả thông báo" trên `AppLayout.tsx`**:
   - Giao diện popover của Bell có điều kiện `{!isAdminOrStaff && (...)}` ẩn hoàn toàn nút xem tất cả và không mở danh sách thông báo cho tài khoản quản trị.

4. **Thiếu cơ chế phân phối sự kiện đa người nhận (Multi-Recipient Notification Dispatch)**:
   - Các sự kiện hệ thống trước đây chỉ ghi bản ghi `notification_recipients` cho duy nhất `recipient_user_id` là CTV tạo ra sự kiện, hoàn toàn không phân phối cho Admin hoặc Staff có quyền quản lý module tương ứng.

5. **Thiếu bản ghi thông báo cho các CTV đang chờ duyệt hiện có**:
   - Các hồ sơ CTV chờ duyệt tạo trước đó chưa có bản ghi thông báo tương ứng trong `notification_recipients` dành cho Admin/Staff.

---

## 2. Giải pháp kỹ thuật và Cơ sở dữ liệu

### A. Migration 20261012000004_admin_staff_notification_bell_fix.sql
Đã tạo và áp dụng migration mới bổ sung:
- Bổ sung 6 mã quyền quản trị: `affiliates.review`, `affiliates.view`, `leads.view`, `reconciliation.process`, `reconciliation.view`, `email_service.view`.
- RPC `fn_get_unread_notification_counts(p_user_id)` đếm chính xác số lượng thông báo chưa đọc theo vai trò người dùng hiện tại.
- RPC `fn_dispatch_admin_staff_notification(...)`:
  - Phân phối thông báo đến tất cả Admin đang hoạt động (`is_active = TRUE`).
  - Phân phối đến tất cả Staff đang hoạt động (`is_active = TRUE`) sở hữu quyền `p_required_permission` thông qua `fn_has_permission`.
  - Có khóa chống trùng `idempotency_key` tránh tạo lặp lại.
- RPC `fn_backfill_pending_affiliate_notifications()`: Quét toàn bộ hồ sơ CTV có trạng thái `PENDING_REVIEW` và tạo thông báo chống trùng cho Admin/Staff có quyền `affiliates.review`.

### B. Ma trận phân phối sự kiện nghiệp vụ (5 Nhóm sự kiện)

| Nhóm sự kiện | Quyền yêu cầu (Staff) | Đường dẫn điều hướng |
|---|---|---|
| **CTV mới đăng ký thành công** (`AFFILIATE_REGISTERED`) | `affiliates.review` | `/admin/affiliates/{id}` |
| **Lead mới đăng ký thành công** (`LEAD_SUBMITTED`) | `leads.view` | `/admin/leads/{id}` |
| **Hồ sơ cần đối chiếu nhập học** (`ENROLLMENT_NEEDS_RECONCILIATION`) | `reconciliation.process` | `/admin/reconciliation/{id}` |
| **Thù lao phát sinh chờ duyệt** (`REWARD_PENDING`) | `rewards.approve` | `/admin/rewards/{id}` |
| **Email nghiệp vụ thất bại cuối cùng** (`EMAIL_FAILED_FINAL`) | `email_service.view` | `/admin/email-jobs` |

---

## 3. Hoàn thiện API Backend và Giao diện Header Bell

### Backend (`server.ts`)
- Cập nhật `resolvePortalNotificationUserId`: Cho phép tài khoản `admin` và `staff` hoạt động (`is_active === true`) truy cập toàn bộ các endpoint thông báo cá nhân (`/notifications`, `/unread-count`, `/bell-recent`, `/:id/read`, `/read-all`).
- Cập nhật `POST /api/v1/portal/notifications/read-all`: Hỗ trợ tham số `tab: 'ALL'` để đánh dấu tất cả thông báo cá nhân là đã đọc.
- Tự động gọi backfill RPC khi máy chủ khởi động (`startServer`).

### Frontend (`AppLayout.tsx` & `PortalNotificationContext.tsx`)
- **Badge số chưa đọc**: Hiển thị trên góc chuông header, hiển thị `99+` khi số thông báo chưa đọc vượt quá 99.
- **Polling định kỳ**: Bổ sung polling 30 giây khi tab trình duyệt đang mở, làm mới khi quay lại tab và sau khi thực hiện thao tác đọc.
- **Bell Popover**:
  - Tiêu đề & nút "Đánh dấu tất cả đã đọc" (khi có unread).
  - Danh sách 6 thông báo mới nhất với tiêu đề, tóm tắt, thời gian ngắn gọn (`formatDateTimeShortVi`) và dấu chấm xanh chưa đọc.
  - Bấm vào một thông báo: Tự động đánh dấu đã đọc, cập nhật số chưa đọc và chuyển hướng đến đúng đường dẫn quản trị (`/admin/affiliates/...`, `/admin/leads/...`, v.v.).
  - Nút "Xem tất cả thông báo": Chuyển hướng đến màn hình thông báo tương ứng cho Admin/Staff (`/admin/notifications`) hoặc CTV (`/portal/notifications`).

---

## 4. Kiểm thử và Xác nhận (Verification)

1. **Linter & Build**:
   - `npm run lint` (`tsc --noEmit`): **0 lỗi**
   - `compile_applet` (`vite build`): **Thành công**

2. **Thực thi script kiểm thử `scripts/verify_admin_staff_bell.ts`**:
   - Đã kiểm tra phát sinh đủ 5 loại sự kiện.
   - RPC `fn_dispatch_admin_staff_notification` phân phối chính xác cho Admin và Staff có quyền.
   - Trạng thái đọc của Admin không ảnh hưởng đến trạng thái đọc của Staff.

---
**Kết luận:** Hệ thống thông báo Bell header cho Admin/Staff đã được khắc phục hoàn toàn, chạy ổn định và đạt 100% tiêu chí chấp nhận.
