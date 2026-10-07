# A5.1A–A5.1B – Báo cáo Triển khai API và Giao diện Danh sách Thù lao CTV (STHC_CTV)

- **Mã định danh bước:** A5.1A–A5.1B
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm thực hiện:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT TRIỂN KHAI VÀ KIỂM TRA

---

## 1. Phạm vi đã triển khai
- **A5.1A (API danh sách thù lao):** Nâng cấp endpoint `GET /api/v1/admin/rewards` sử dụng cơ sở dữ liệu thật, hỗ trợ tìm kiếm, lọc theo trạng thái, khóa học, CTV, khoảng thời gian (theo múi giờ `Asia/Ho_Chi_Minh`), sắp xếp và phân trang phía server. Loại bỏ hoàn toàn `mockAdminRewards`. Tích hợp kiểm quyền `rewards.view`.
- **A5.1B (Giao diện `/admin/rewards`):** Xây dựng giao diện quản lý danh sách thù lao CTV tại `AdminPortal.tsx` (Tab Thù lao CTV) với bộ lọc, tìm kiếm debounce, bảng dữ liệu chi tiết, hiển thị mã EGOV lịch sử, phân trang, và kiểm tra quyền thao tác (`rewards.approve`, `rewards.reject`). Vô hiệu hóa nút xuất CSV demo cũ ("Xuất bảng kê — Chưa triển khai").

---

## 2. API Contract và Quy tắc Lọc / Sắp xếp (A5.1A)

### Endpoint: `GET /api/v1/admin/rewards`
- **Xác thực & Phân quyền:** Yêu cầu Header `Authorization: Bearer <token>` và quyền `rewards.view` (`requirePermission('rewards.view')`).
- **Query Parameters:**
  - `page`: Trang hiện tại (mặc định: `1`).
  - `page_size` (hoặc `limit`): Số lượng bản ghi mỗi trang (`20`, `50`, `100`; mặc định: `20`).
  - `q`: Từ khóa tìm kiếm (tìm theo mã CTV, họ tên CTV, họ tên thí sinh, số điện thoại, mã hồ sơ EGOV).
  - `status`: Trạng thái thù lao (`ACTIVE` [gồm PENDING_APPROVAL, APPROVED], `ALL`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `VOIDED`; mặc định: `ACTIVE`).
  - `affiliate_id`: Lọc theo ID của CTV.
  - `course_id`: Lọc theo ID của khóa học.
  - `created_from`, `created_to`: Lọc theo khoảng ngày phát sinh (định dạng `YYYY-MM-DD`, theo múi giờ `Asia/Ho_Chi_Minh`).
  - `sort_by`: Trường sắp xếp (`created_at`, `amount`, `status`; mặc định: `created_at`).
  - `sort_order`: Chiều sắp xếp (`asc` hoặc `desc`; mặc định: `desc`).

### Nguồn Dữ liệu & Mã EGOV Lịch sử
- Bảng chính: `public.rewards`.
- Liên kết (JOIN):
  - `leads` (lấy họ tên thí sinh, số điện thoại).
  - `affiliate_profiles` (lấy mã CTV, họ tên CTV).
  - `lead_reconciliations` (lấy `external_admission_code` thuộc lần đối chiếu làm căn cứ phát sinh khoản thù lao, đảm bảo bảo toàn lịch sử ngay cả khi lead thay đổi mã EGOV ở các lần sau).
  - `courses` (lấy tên và mã khóa học).

---

## 3. Giao diện Danh sách Thù lao CTV (A5.1B)

- **Tiêu đề & Mô tả:** “Thù lao CTV” — “Theo dõi các khoản thù lao phát sinh từ hồ sơ giới thiệu đủ điều kiện.”
- **Bộ lọc & Tìm kiếm:** Ô tìm kiếm từ khóa (debounce 400ms), bộ lọc trạng thái (Còn hiệu lực, Tất cả, Chờ duyệt, Đã duyệt, Từ chối, Đã hủy), bộ lọc khóa học, nút Làm mới và Xóa bộ lọc.
- **Bảng dữ liệu:**
  1. STT (tính theo trang).
  2. Khách hàng (Họ tên & số điện thoại).
  3. Mã hồ sơ EGOV (hiển thị dạng font-mono, bảo toàn số 0 đầu).
  4. Cộng tác viên (Họ tên & Mã CTV).
  5. Khóa học.
  6. Thù lao (định dạng VNĐ).
  7. Trạng thái (Chờ duyệt, Đã duyệt, Từ chối, Đã hủy).
  8. Ngày phát sinh.
  9. Thao tác (Nút Duyệt / Từ chối hiển thị có điều kiện theo quyền `rewards.approve` và `rewards.reject` đối với các khoản ở trạng thái `PENDING_APPROVAL`).
- **Phân trang:** Hiển thị thông tin trang hiện tại, tổng số bản ghi và nút chuyển trang qua lại.

---

## 4. Các Mock / Fallback đã Loại bỏ
- Đã loại bỏ hoàn toàn mảng `mockAdminRewards` khỏi API và giao diện danh sách. Khi cơ sở dữ liệu trống, hệ thống hiển thị danh sách rỗng đúng thực tế không che đậy lỗi.
- Đã vô hiệu hóa nút xuất CSV demo cũ, thay thế bằng nút "Xuất bảng kê (Chưa triển khai)" để chờ triển khai thực tế ở A5.4.

---

## 5. Kết quả Kiểm thử & Xác minh
- **Kiểm tra biên dịch (`compile_applet`):** Thành công.
- **Kiểm tra linter (`lint_applet`):** Thành công (`tsc --noEmit` báo 0 lỗi).
- **Ca kiểm tra phân quyền:**
  - Admin & Staff có quyền `rewards.view`: Truy cập thành công danh sách.
  - Staff thiếu quyền / CTV / Chưa đăng nhập: Bị chặn HTTP 401/403 đúng hợp đồng.

---

## 6. Giới hạn còn lại cho các bước tiếp theo
- **A5.2:** Chi tiết khoản thù lao và lịch sử gắn với lead.
- **A5.3:** Hoàn thiện nâng cấp quy trình duyệt/từ chối/hủy.
- **A5.4:** Thống kê tổng hợp theo CTV và xuất báo cáo thật cho kế toán.
