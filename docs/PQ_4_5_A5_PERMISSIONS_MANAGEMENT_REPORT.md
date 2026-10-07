# PQ.4–PQ.5 – Báo cáo Triển khai Giao diện Quản lý Nhóm quyền và Gán quyền cho Staff (STHC_CTV)

- **Mã định danh bước:** PQ.4–PQ.5
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm thực hiện:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT TRIỂN KHAI HOÀN CHỈNH

---

## 1. Tổng quan phạm vi thực hiện (PQ.4 & PQ.5)

Theo lộ trình bảo mật và phân quyền A5, các bước **PQ.4–PQ.5** tập trung xây dựng hệ thống giao diện và API quản trị dành riêng cho Quản trị viên (`admin`) nhằm:
1. **PQ.4 (Quản lý Nhóm quyền & Danh mục Quyền):** Xây dựng màn hình trực quan tại `/admin/permissions` cho phép Quản trị viên theo dõi toàn bộ danh mục 7 quyền A5 cũng như các nhóm quyền (`reward_manager`, `reward_viewer`) và danh sách quyền thành viên bên trong mỗi nhóm.
2. **PQ.5 (Giao diện Gán quyền cho Staff):** Xây dựng bảng quản lý danh sách nhân viên (`staff`), hiển thị nhóm quyền đang gán, cho phép Quản trị viên thực hiện thao tác **Gán** hoặc **Thu hồi** nhóm quyền (`reward_manager`, `reward_viewer`) ngay trên giao diện kèm theo hiển thị danh sách quyền hiệu lực (`fn_get_user_permissions`).

---

## 2. Chi tiết các API Backend đã bổ sung (`server.ts`)

- `GET /api/v1/admin/permissions/catalog`: Trả về toàn bộ danh mục quyền từ bảng `permissions`.
- `GET /api/v1/admin/permission-groups`: Trả về danh sách nhóm quyền kèm danh sách quyền thành viên chi tiết qua bảng `permission_group_items`.
- `GET /api/v1/admin/staff-permissions`: Trả về danh sách tài khoản nhân viên (`role = 'staff'`), nhóm quyền đang được gán (`staff_permission_groups`) và danh sách quyền hiệu lực thực tế được tính toán thông qua hàm RPC `fn_get_user_permissions`.
- `POST /api/v1/admin/staff-permissions/assign`: Thực hiện gán nhóm quyền (`reward_manager` hoặc `reward_viewer`) cho nhân viên với `is_active = true` (yêu cầu quyền Admin qua middleware `requireAdminOnly`).
- `POST /api/v1/admin/staff-permissions/revoke`: Vô hiệu hóa nhóm quyền (`is_active = false`) của nhân viên (yêu cầu quyền Admin qua middleware `requireAdminOnly`).

---

## 3. Chi tiết Giao diện Frontend (`AdminPermissionsView.tsx`)

- **Đường dẫn truy cập:** `/admin/permissions` (Đã tích hợp vào `ADMIN_NAV_ITEMS` với biểu tượng `Shield` và chỉ hiển thị/cho phép truy cập bởi tài khoản `admin`).
- **Tab 1 (PQ.4 — Nhóm quyền & Danh mục):**
  - Hiển thị thẻ card cho từng nhóm quyền (`reward_manager`, `reward_viewer`) với mã định danh, tên, mô tả nghiệp vụ và danh sách quyền con (vd: `rewards.view`, `rewards.approve`, v.v.).
  - Hiển thị danh mục 7 quyền A5 chuẩn mực.
- **Tab 2 (PQ.5 — Gán quyền cho Staff):**
  - Bảng danh sách cán bộ tuyển sinh (`Staff`) kèm thông tin email, ID và trạng thái tài khoản.
  - Cột nhóm quyền hiện tại hiển thị rõ nhãn trực quan (vd: `reward_manager — Toàn quyền`, `reward_viewer — Chỉ xem`).
  - Cột quyền hiệu lực hiển thị danh sách các badge quyền thực tế mà nhân viên đó sở hữu.
  - Các nút thao tác **Gán Quản lý**, **Thu hồi Quản lý**, **Gán Xem**, **Thu hồi Xem** hoạt động trực tiếp qua API REST với thông báo phản hồi `success`/`error` rõ ràng.

---

## 4. Kiểm tra Nguyên tắc Vận hành & Bảo mật
- **Giữ nguyên role thực tế:** Không tạo role `subadmin`. Hệ thống tiếp tục sử dụng 3 role gốc: `admin`, `staff`, `CTV`.
- **Phân quyền nghiêm ngặt:** Chỉ Quản trị viên (`admin`) mới được phép truy cập trang quản lý phân quyền và thực hiện gán/thu hồi nhóm quyền. Cán bộ `staff` (kể cả staff có toàn quyền A5) không được phép truy cập trang này.
- **Tính nguyên tử và đồng bộ:** Mọi thay đổi gán/thu hồi nhóm quyền được lưu vết và phản ánh tức thì vào kết quả trả về của `fn_get_user_permissions` cho các request API kiểm quyền tiếp theo.
