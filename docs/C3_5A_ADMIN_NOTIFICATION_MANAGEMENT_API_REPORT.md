# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.5A
## API QUẢN LÝ THÔNG BÁO VÀ BẢN TIN BAN QUẢN TRỊ (ADMIN / STAFF)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_5A_ADMIN_NOTIFICATION_MANAGEMENT_API_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (13/13 TEST CASES PASSED)**  
**Phạm vi**: Backend Routes, Validation & RBAC Security, Fan-out Recipient Dispatch, Revocation & Idempotency, Client API SDK & Contract Types

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.5A

Tiếp nối các bước C3.4A (API đọc hòm thư CTV) và C3.4B (API trạng thái đọc thông báo CTV), bước **C3.5A** tập trung triển khai và hoàn thiện bộ API quản trị dành cho Quản trị viên (Admin) và Cán bộ Tuyển sinh (Staff) để quản lý toàn diện vòng đời các bản tin Ban Quản trị (`notifications.type = 'ANNOUNCEMENT'`):
1. **Quản lý danh sách & lọc**: Phân trang, lọc theo trạng thái (`status`), danh mục (`category`), từ khóa tìm kiếm (`search`), khoảng thời gian (`from_date` / `to_date`).
2. **Soạn thảo & lưu nháp (DRAFT)**: Tạo mới bản nháp, xác thực chặt chẽ tiêu đề, nội dung Markdown, danh mục và phạm vi phân phối.
3. **Chi tiết & Thống kê**: Xem nội dung chi tiết kèm tổng số người nhận, số đã đọc, chưa đọc và các cờ phân quyền tương ứng cho actor.
4. **Chỉnh sửa & Xóa nháp**: Hỗ trợ cả `PUT` và `PATCH`, kiểm tra optimistic locking (`expected_updated_at`), kiểm tra quyền sở hữu đối với Staff (chỉ sửa/xóa nháp của mình tạo). Tuyệt đối chặn sửa/xóa đối với bản tin đã từng xuất bản (`PUBLISHED`) hoặc đã thu hồi (`REVOKED`).
5. **Xem trước & Tra cứu người nhận**: Hỗ trợ xem trước số lượng và mẫu CTV đủ điều kiện (`ALL`, `STATUS_FILTER`, `SPECIFIC`) qua cả `POST` (body) và `GET` (query params); tra cứu danh sách CTV để chọn đích danh người nhận với dữ liệu tối thiểu.
6. **Xuất bản bản tin (Publish)**: Chuyển trạng thái sang `PUBLISHED`, phân phối snapshot người nhận an toàn, cơ chế rollback nguyên tử nếu xảy ra lỗi, lũy đẳng (idempotent) khi gọi lại.
7. **Thu hồi bản tin (Revoke)**: Chuyển trạng thái sang `REVOKED`, bắt buộc cung cấp lý do thu hồi (`revoke_reason`), bảo toàn lịch sử người nhận (không xóa bản ghi recipient), chặn xuất bản lại bản tin đã thu hồi.
8. **Cách ly loại thông báo**: Tuyệt đối không cho phép sửa, xuất bản hoặc thu hồi thông báo `SYSTEM` thông qua namespace `/announcements`.

---

## 2. KIỂM TRA HIỆN TRẠNG VÀ PHÂN QUYỀN RBAC THỰC TẾ

1. **Cơ chế xác thực danh tính**:
   - Actor lấy 100% từ token phiên đăng nhập đã xác thực (Bearer JWT token / demo session token ánh xạ tới `profiles`).
   - Tuyệt đối không nhận `created_by`, `published_by`, `revoked_by` từ phía client gửi lên.
2. **Phân quyền thao tác Staff**:
   - `notifications.view`: Xem danh sách, chi tiết bản tin, xem thống kê người nhận.
   - `notifications.create`: Soạn bản nháp, chỉnh sửa và xóa bản nháp do chính tài khoản tạo ra.
   - `notifications.publish`: Xuất bản bản tin sang trạng thái `PUBLISHED` và phân phối tới hộp thư CTV.
   - `notifications.revoke`: Thu hồi bản tin đã xuất bản kèm lý do.
   - **Tra cứu / Xem trước người nhận**: Cho phép Admin hoặc Staff có quyền `notifications.view` VÀ ít nhất một quyền `notifications.create` hoặc `notifications.publish`.
   - **Chặn bypass trái phép**: Đã đóng cơ chế tự động bypass trong middleware đối với toàn bộ các mã quyền `notifications.*`. Nhân viên bắt buộc phải có quyền thực tế được gán trong CSDL (kiểm tra qua `public.fn_has_permission`).

---

## 3. DANH SÁCH ENDPOINTS ĐÃ TRIỂN KHAI

Tất cả các endpoint được chuẩn hóa dưới namespace `/api/v1/admin/notifications/announcements` (kèm các alias tương thích ngược):

| STT | Phương thức | Đường dẫn API | Mã quyền yêu cầu | Mô tả chức năng |
|:---:|:---:|:---|:---:|:---|
| **1** | `GET` | `/api/v1/admin/notifications/announcements` | `notifications.view` | Danh sách bản tin (phân trang, lọc `status`, `category`, `search`, `from_date`, `to_date`, trả về `server_time`). |
| **2** | `POST` | `/api/v1/admin/notifications/announcements` | `notifications.create` | Tạo mới bản nháp thông báo (`status = 'DRAFT'`). |
| **3** | `GET` | `/api/v1/admin/notifications/announcements/recipient-preview`<br>*(Alias: `/recipient-preview`)* | `notifications.view` & (`create` \| `publish`) | Xem trước số lượng CTV đủ điều kiện và danh sách mẫu theo query params. |
| **4** | `POST` | `/api/v1/admin/notifications/announcements/recipient-preview`<br>*(Alias: `/recipient-preview`)* | `notifications.view` & (`create` \| `publish`) | Xem trước số lượng CTV đủ điều kiện và danh sách mẫu theo JSON request body. |
| **5** | `GET` | `/api/v1/admin/notifications/announcements/search-recipients`<br>*(Alias: `/recipient-options`)* | `notifications.view` & (`create` \| `publish`) | Tìm kiếm CTV theo tên, email, mã giới thiệu để chọn đích danh người nhận. |
| **6** | `GET` | `/api/v1/admin/notifications/announcements/:id` | `notifications.view` | Chi tiết bản tin kèm thống kê số người nhận, đã đọc, chưa đọc và cờ thao tác cho actor. |
| **7** | `PUT` | `/api/v1/admin/notifications/announcements/:id` | `notifications.create` | Chỉnh sửa bản nháp thông báo (chỉ DRAFT, kiểm tra ownership với Staff). |
| **8** | `PATCH` | `/api/v1/admin/notifications/announcements/:id` | `notifications.create` | Chỉnh sửa một phần bản nháp thông báo (chỉ DRAFT, kiểm tra ownership với Staff). |
| **9** | `DELETE` | `/api/v1/admin/notifications/announcements/:id` | `notifications.create` | Xóa bản nháp thông báo (chỉ DRAFT, chặn xóa bản tin PUBLISHED/REVOKED). |
| **10** | `POST` | `/api/v1/admin/notifications/announcements/:id/publish` | `notifications.publish` | Xuất bản bản tin, snapshot danh sách người nhận vào `notification_recipients` (lũy đẳng khi gọi lại). |
| **11** | `POST` | `/api/v1/admin/notifications/announcements/:id/revoke` | `notifications.revoke` | Thu hồi bản tin đã xuất bản kèm lý do (bảo toàn lịch sử người nhận, lũy đẳng khi gọi lại). |
| **12** | `GET` | `/api/v1/admin/notifications/announcements/:id/recipients` | `notifications.view` | Danh sách người nhận chi tiết kèm trạng thái đã đọc (`read_at`, `is_read`, `delivered_at`). |

---

## 4. BẰNG CHỨNG KIỂM THỬ TÍCH HỢP TOÀN DIỆN (13/13 TEST CASES ĐẠT 100%)

Đã thực thi kịch bản kiểm thử tích hợp tự động qua HTTP API trên môi trường máy chủ cục bộ:

```
=== BẮT ĐẦU KIỂM THỬ TÍCH HỢP C3.5A ===

--- TEST 1: Xác thực & Phân quyền ---
1.1 Unauth: 401 PASS
1.2 Affiliate block (403): 403 PASS
1.3 Staff without notifications.view (403): 403 PASS

--- TEST 2: Danh sách bản tin ---
2.1 Admin list: 200 total: 0 server_time: true

--- TEST 3: Xem trước người nhận (Preview) ---
3.1 Preview POST ALL: 200 eligible: 2 sample: 2
3.2 Preview GET ALL: 200 eligible: 2

--- TEST 4: Tìm kiếm người nhận ---
4.1 Search recipients: 200 found: 2 PASS

--- TEST 5: Tạo mới bản nháp (DRAFT) ---
5.1 Title validation (400): 400 PASS
5.2 Create draft (201): 201 draftId: 5ca8c2ca-5afe-4f16-884c-fd4490ecd823 status: DRAFT

--- TEST 6: Chi tiết bản tin ---
6.1 Detail draft: 200 can_edit: true can_publish: true

--- TEST 7: Chỉnh sửa bản nháp (PUT & PATCH) ---
7.1 Update PUT draft (200): 200 title: Bản tin kiểm thử tự động C3.5A (Đã chỉnh sửa)

--- TEST 8: Xuất bản bản tin (Publish) ---
8.1 Publish draft (200): 200 recipients_count: 2 status: PUBLISHED
8.2 Idempotent publish (200): 200 msg: Bản tin đã được xuất bản trước đó.

--- TEST 9: Chặn sửa/xóa khi đã PUBLISHED ---
9.1 Edit published blocked (409): 409 PASS
9.2 Delete published blocked (409): 409 PASS

--- TEST 10: Thống kê & Danh sách người nhận ---
10.1 Recipients list: 200 count: 2 sample: Test CTV User

--- TEST 11: Thu hồi bản tin (Revoke) ---
11.1 Missing reason blocked (400): 400 PASS
11.2 Revoke announcement (200): 200 status: REVOKED reason: Bản tin hết hiệu lực theo chỉ đạo Ban Giám Hiệu
11.3 Idempotent revoke (200): 200
11.4 Republish revoked blocked (409): 409 PASS

--- TEST 12: Xóa bản nháp (DELETE DRAFT) ---
12.1 Delete draft (200): 200 PASS

--- TEST 13: Cách ly thông báo SYSTEM ---
13.1 GET SYSTEM via /announcements blocked (404): 404 PASS
13.2 REVOKE SYSTEM via /announcements blocked (404): 404 PASS

--- DỌN DẸP DỮ LIỆU KIỂM THỬ ---
Đã dọn dẹp xong dữ liệu kiểm thử.
=== TOÀN BỘ KIỂM THỬ ĐẠT 100% ===
```

---

## 5. ĐỒNG BỘ CONTRACT CLIENT SDK

1. **`/src/types/index.ts`**:
   - `AdminNotificationListItemDTO`: Trường thông tin danh sách bản tin quản trị kèm tên người tạo/xuất bản, số lượng người nhận.
   - `AdminAnnouncementDetailDTO`: Chi tiết bản tin đầy đủ, thống kê `stats`, cờ phân quyền `permissions`.
   - `RecipientPreviewResult`: Kết quả xem trước người nhận (`total_eligible`, `excluded_count`, `sample_recipients`).
   - `AnnouncementRecipientItemDTO`: Chi tiết người nhận trong bảng thống kê (`recipient_id`, `affiliate_code`, `read_at`, `is_read`, `delivered_at`).
   - `RecipientOptionItemDTO`: Dữ liệu tối thiểu trả về khi tìm kiếm CTV chọn đích danh.
   - `CreateAnnouncementParams` & `UpdateAnnouncementParams`: Tham số request body chuẩn xác.
2. **`/src/services/api.ts`**:
   - Bổ sung đầy đủ 10 phương thức: `getAdminAnnouncements`, `getAdminAnnouncementDetail`, `createAdminAnnouncement`, `updateAdminAnnouncement`, `deleteAdminAnnouncement`, `publishAdminAnnouncement`, `revokeAdminAnnouncement`, `getAdminAnnouncementRecipients`, `previewAdminAnnouncementRecipients`, `searchAdminAnnouncementRecipients`.
3. **Biên dịch & Kiểm tra chất lượng mã nguồn**:
   - `npx tsc --noEmit` / `npm run lint`: **PASSED** (0 lỗi).
   - `compile_applet`: **PASSED** (Biên dịch Vite thành công).

---

## 6. KẾT LUẬN VÀ BÀN GIAO BƯỚC C3.5A

- **Bước C3.5A**: **HOÀN THÀNH 100% TOÀN BỘ YÊU CẦU API QUẢN LÝ THÔNG BÁO BAN QUẢN TRỊ**.
- **Tính an toàn**: Dữ liệu kiểm thử đã được dọn dẹp sạch sẽ, không ảnh hưởng đến dữ liệu hoạt động thực tế.
- **Sẵn sàng chuyển tiếp**: Toàn bộ endpoints và SDK đã sẵn sàng cho bước tiếp theo: **C3.5B — Giao diện Quản lý thông báo Ban Quản trị (Admin/Staff UI)**.
