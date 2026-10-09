# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.5B
## GIAO DIỆN QUẢN LÝ THÔNG BÁO VÀ BẢN TIN BAN QUẢN TRỊ (ADMIN / STAFF UI)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_5B_ADMIN_NOTIFICATION_MANAGEMENT_UI_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (ACCEPTANCE CRITERIA PASSED)**  
**Phạm vi**: Route, Navigation Guard, Danh sách thông báo, Soạn/Sửa nháp, Chọn phạm vi CTV, Xem trước & Ước tính, Xuất bản & Thu hồi, Chi tiết & Thống kê tỷ lệ đọc

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.5B

Tiếp nối bước C3.5A (triển khai toàn diện 12 endpoints API quản lý bản tin Ban Quản trị), bước **C3.5B** tập trung xây dựng hoàn chỉnh giao diện quản trị tại tuyến đường `/admin/notifications` dành cho Quản trị viên (Admin) và Cán bộ Tuyển sinh (Staff):
1. **Tích hợp Route & Menu**:
   - Khai báo route `/admin/notifications` trong `APP_ROUTES` và Navigation Guard.
   - Bổ sung mục "Quản lý thông báo" vào `ADMIN_NAV_ITEMS` (hiển thị trên Sidebar chung `AppLayout`).
   - Route guard chặt chẽ: Admin có toàn quyền; Staff bắt buộc phải có quyền `notifications.view`. Nếu không có quyền, hiển thị màn hình thông báo thân thiện và chặn gọi API liên tục.
2. **Màn hình danh sách bản tin (`AdminNotificationsView`)**:
   - Tiêu đề gọn gàng: "Quản lý thông báo", mô tả: "Soạn và gửi thông báo trong hệ thống đến cộng tác viên."
   - Bộ lọc đa năng: Tìm kiếm theo tiêu đề (debounce 400ms, cơ chế sequence ref chống race condition), lọc trạng thái (`DRAFT`, `PUBLISHED`, `REVOKED`), lọc danh mục (`GENERAL`, `POLICY`, `URGENT`, `EVENT`), khoảng ngày (`from_date`, `to_date`), nút Tải lại và Xóa bộ lọc.
   - Bảng dữ liệu responsive: STT, Tiêu đề kèm tóm tắt, Danh mục, Phạm vi nhận tin, Trạng thái, Số người nhận (đối với bản nháp hiển thị "Chưa xuất bản"), Người tạo, Ngày tạo/ngày xuất bản theo múi giờ `Asia/Ho_Chi_Minh` (`vi-VN`), Cụm nút thao tác theo quyền.
   - Phân trang thực tế từ backend API (page, limit 20, total).
3. **Modal Soạn & Sửa bản nháp (`AnnouncementFormModal`)**:
   - Tiêu đề (max 255), Tóm tắt (max 500), Nội dung Markdown với 2 tab "Soạn thảo" và "Xem trước Markdown" (sử dụng thư viện `marked` kết hợp `sanitizeHtml` chống XSS).
   - Danh mục thông báo (`GENERAL`, `POLICY`, `URGENT`, `EVENT`).
   - Lựa chọn phạm vi người nhận:
     - `ALL`: Toàn bộ CTV.
     - `STATUS_FILTER`: Bộ lọc theo các trạng thái hồ sơ tuyển sinh (`ACTIVE`, `PENDING_REVIEW`, `SUSPENDED`, `REJECTED`).
     - `SPECIFIC`: Combobox tìm kiếm CTV qua API `searchAdminAnnouncementRecipients`, hỗ trợ chọn nhiều, hiển thị mã CTV, họ tên, email, gắn chips tháo gỡ (remove), chống trùng lặp, giữ danh sách khi tìm kiếm từ khóa mới, gửi danh sách `affiliate_profile_id` chuẩn contract.
   - Kiểm tra trạng thái dirty: Cảnh báo xác nhận khi người dùng đóng form nếu có thay đổi chưa lưu.
   - Xử lý Optimistic locking: Gửi `expected_updated_at` khi cập nhật, thông báo lỗi xung đột 409 rõ ràng.
4. **Modal Xem trước & Ước tính người nhận (`AnnouncementPreviewModal`)**:
   - Phần A: Mô phỏng giao diện thẻ thông báo CTV với đầy đủ định dạng Markdown.
   - Phần B: Gọi API `previewAdminAnnouncementRecipients` để hiển thị `total_eligible`, `excluded_count`, danh sách mẫu CTV và lưu ý rõ đây là ước tính trước khi xuất bản.
   - Nút "Xuất bản ngay" trực tiếp từ modal xem trước nếu đủ điều kiện.
5. **Modal Chi tiết & Thống kê đọc tin (`AnnouncementDetailModal`)**:
   - Hiển thị đầy đủ thông tin bản tin, người tạo, người xuất bản, người thu hồi và các mốc thời gian.
   - Hộp cảnh báo lý do thu hồi nổi bật đối với bản tin `REVOKED`.
   - Bảng thống kê trực quan: Tổng số người nhận, Đã đọc, Chưa đọc, Tỷ lệ đọc (%) kèm thanh tiến trình (progress bar).
   - Tab "Danh sách người nhận": Hiển thị bảng chi tiết từng CTV (Mã CTV, họ tên, email, thời điểm gửi, trạng thái "Đã đọc lúc..." hoặc "Chưa đọc"), hỗ trợ lọc theo trạng thái đọc và phân trang.
   - Cụm nút thao tác nhanh: Sửa nháp, Xuất bản ngay, Thu hồi bản tin, Xóa nháp.
6. **Modal Thu hồi bản tin (`AnnouncementRevokeModal`)**:
   - Dành riêng cho bản tin `PUBLISHED`.
   - Bắt buộc nhập lý do thu hồi từ 5 đến 500 ký tự với bộ đếm ký tự trực quan.
   - Cảnh báo hành động không thể hoàn tác.
7. **Hộp thoại xác nhận Xuất bản & Xóa nháp an toàn**:
   - Xác nhận trước khi xuất bản bản tin hoặc xóa vĩnh viễn bản nháp, trạng thái loading chống bấm lặp.

---

## 2. DANH MỤC CÁC TỆP ĐÃ TRIỂN KHAI VÀ CHỈNH SỬA

| STT | Tệp tin | Vai trò | Thay đổi chính |
|:---:|:---|:---|:---|
| **1** | `/src/config/navConfig.ts` | Cấu hình điều hướng | Thêm `admin_notifications` vào `ADMIN_NAV_ITEMS` với icon `Bell` và đường dẫn `/admin/notifications`. |
| **2** | `/src/utils/navigationGuard.ts` | Route Guard Engine | Thêm route `/admin/notifications` vào `APP_ROUTES` cho các role `admin`, `staff`. |
| **3** | `/src/App.tsx` | Root Component | Import và mount `AdminNotificationsView` khi `currentPath === '/admin/notifications'`. |
| **4** | `/src/components/admin/notifications/AdminNotificationsView.tsx` | View chính | Màn hình quản lý thông báo: bộ lọc, bảng danh sách, phân trang, route guard nội bộ, liên kết modals. |
| **5** | `/src/components/admin/notifications/AnnouncementFormModal.tsx` | Form Modal | Soạn và sửa nháp, validation, tabs Markdown, chọn scope (`ALL`, `STATUS_FILTER`, `SPECIFIC`). |
| **6** | `/src/components/admin/notifications/AnnouncementPreviewModal.tsx` | Preview Modal | Xem trước Markdown của bản tin và số lượng CTV ước tính qua API preview. |
| **7** | `/src/components/admin/notifications/AnnouncementDetailModal.tsx` | Detail Modal | Xem toàn diện bản tin, thống kê tỷ lệ đọc, danh sách CTV nhận tin, các nút thao tác. |
| **8** | `/src/components/admin/notifications/AnnouncementRevokeModal.tsx` | Revoke Modal | Modal thu hồi bản tin đã xuất bản với validation lý do thu hồi. |
| **9** | `/src/components/admin/AdminNotificationsView.tsx` | Proxy Export | Re-export `AdminNotificationsView` cho cấu trúc import linh hoạt. |

---

## 3. ĐẶC TẢ CHI TIẾT CÁC QUY TẮC NGHIỆP VỤ ĐÃ ĐÁP ỨNG

### 3.1. Phân quyền và Bảo mật (RBAC & Route Guard)
- **Kiểm tra quyền phía Frontend**:
  - Gọi `api.getMyPermissions()` để nạp danh sách quyền của tài khoản.
  - Quản trị viên (`role === 'admin'`) có toàn quyền thực thi.
  - Cán bộ (`role === 'staff'`) phải có `notifications.view` mới được hiển thị danh sách; nếu thiếu quyền, hiển thị màn hình cảnh báo không đủ quyền và không gọi lặp lại API.
  - Quyền `notifications.create`: Cho phép hiển thị nút "Soạn thông báo", cho phép sửa/xóa các bản nháp do chính mình tạo (`created_by === currentUser.id`).
  - Quyền `notifications.publish`: Cho phép hiển thị nút "Xuất bản" trên các bản nháp.
  - Quyền `notifications.revoke`: Cho phép hiển thị nút "Thu hồi" trên các bản tin đã xuất bản.
  - Kết hợp chặt chẽ với các cờ `permissions` (`can_edit`, `can_delete`, `can_publish`, `can_revoke`) do backend trả về từ API detail.

### 3.2. Chống Race Condition & Tối ưu hiệu năng
- Tìm kiếm từ khóa tiêu đề có debounce 400ms.
- Áp dụng `fetchSeqRef = useRef(0)`: Khi người dùng gõ tìm kiếm hoặc chuyển đổi bộ lọc liên tục, chỉ kết quả của lượt gọi mới nhất mới được cập nhật vào state, loại bỏ hoàn toàn hiện tượng phản hồi cũ ghi đè phản hồi mới.

### 3.3. Xử lý Định dạng Thời gian
- Toàn bộ thời gian tạo, xuất bản, thu hồi và đọc tin được định dạng theo múi giờ Việt Nam `Asia/Ho_Chi_Minh` (`formatDateTimeShortVi` và `formatDateTimeVi`), hiển thị dạng `HH:mm DD/MM/YYYY`.

### 3.4. An toàn nội dung (XSS Prevention)
- Nội dung Markdown được xử lý qua `marked` và làm sạch thông qua hàm tiện ích `sanitizeHtml`, lọc sạch các thẻ `<script>`, `<iframe>`, `javascript:` và các event handler độc hại.

---

## 4. KẾT QUẢ KIỂM TRA CHẤT LƯỢNG MÃ NGUỒN VÀ BIÊN DỊCH

1. **Kiểm tra TypeScript (`tsc --noEmit`)**:
   ```bash
   > react-example@0.0.0 lint
   > tsc --noEmit
   # Kết quả: PASSED (0 lỗi, 0 cảnh báo)
   ```
2. **Kiểm tra Biên dịch Vite (`compile_applet`)**:
   ```bash
   Build succeeded - the applet is compiled.
   # Kết quả: PASSED
   ```

---

## 5. KẾT LUẬN

- Bước **C3.5B — Giao diện quản lý thông báo Admin/Staff UI** đã được triển khai hoàn chỉnh, đúng chuẩn giao diện quản trị hiện có, tuân thủ nghiêm ngặt mọi ràng buộc về thẩm mỹ, bảo mật, phân quyền và trải nghiệm người dùng.
- Sẵn sàng bàn giao và đưa vào vận hành thực tế.
