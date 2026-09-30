# THIẾT KẾ KIẾN TRÚC & LAYOUT: A0.3 – LAYOUT, HEADER, SIDEBAR VÀ MENU TÀI KHOẢN STHC_CTV

- **Mã dự án:** `STHC-CTV-A0.3`
- **Phạm vi thiết kế:** Toàn hệ thống (Cổng Quản trị Admin/Staff và Cổng Cộng tác viên Affiliate)
- **Trạng thái:** Thiết kế kiến trúc và quy hoạch triển khai (Design-only document)
- **Ngày thiết kế:** 30/09/2026

---

## 1. Tổng Quan Kiến Trúc Layout Dùng Chung

Hệ thống **STHC_CTV** chuẩn hóa mô hình Layout bao gồm 3 thành phần chính: **Sidebar (trái)**, **Header (trên)**, và **Workspace (vùng làm việc chính)**, loại bỏ hoàn toàn các thanh tab ngang truyền thống khi chuyển sang kiến trúc Sidebar điều hướng chuyên nghiệp.

### 1.1. Sidebar Bên Trái
- **Cấu trúc menu theo vai trò**:
  - **Nhóm Quản trị / Cán bộ tuyển sinh (`Admin / Staff`)**:
    1. Tổng quan / Dashboard (`/admin`)
    2. Quản lý CTV (`/admin/affiliates` hoặc tab nội bộ)
    3. Quản lý Khóa học (`/admin/courses`)
    4. Khách hàng & Leads (`/admin/leads`)
    5. Đối soát hồ sơ (`/admin/reconcile`)
    6. Thù lao & Báo cáo (`/admin/rewards`)
    7. Nhật ký hệ thống (`/admin/audit`)
  - **Nhóm Cộng tác viên (`Affiliate`)**: Giữ nguyên các mục theo chuẩn M2.3 (`/portal`, `/portal/courses`, `/portal/leads`, v.v.).
- **Tương tác**:
  - Đánh dấu active (chọn) chính xác mục hiện tại, bao gồm cả khi đang ở trang chi tiết (`/portal/courses/*` hay `/admin/*`).
  - **Desktop**: Cho phép thu gọn (collapse) thành dạng icon hoặc mở rộng (expand) đầy đủ nhãn.
  - **Mobile**: Hiển thị dạng ngăn kéo (`drawer`), tự động đóng lại khi người dùng chọn một mục menu hoặc bấm ra bên ngoài vùng ngăn kéo.

### 1.2. Header
- **Bên trái**: Tên trang hiện tại (Breadcrumb / Page Title) và nút toggle (mở/thu gọn) Sidebar.
- **Bên phải**:
  - **Biểu tượng chuông thông báo** (có vị trí sẵn sàng theo thiết kế A0.4).
  - **Avatar & Họ tên / Email tài khoản** đi kèm **Menu tài khoản** (Dropdown).
- **Quy tắc bảo mật**: Tuyệt đối không hiển thị mã định danh UID hay các thông số chẩn đoán kỹ thuật trên giao diện người dùng.

---

## 2. Thiết Kế Menu Tài Khoản & Quản Lý Cá Nhân

Menu tài khoản áp dụng thống nhất cho mọi vai trò (`Admin`, `Staff`, `Affiliate`) khi bấm vào avatar/tên ở góc phải Header, bao gồm 3 mục:
1. **“Thông tin cá nhân”** (`/profile` hoặc `/portal/profile` / `/admin/profile`)
2. **“Đổi mật khẩu”** (`/profile/security` hoặc modal tương ứng)
3. **“Đăng xuất”** (Xóa phiên, chuyển hướng về `/login`)

### 2.1. Chi tiết phân hệ "Thông tin cá nhân" (P1.1 & P1.2)
- **Quyền hạn**: Người dùng chỉ được phép xem và cập nhật thông tin của chính mình (`id = auth.uid()`).
- **Trường dữ liệu**:
  - **Họ và tên**: Cho phép chỉnh sửa.
  - **Số điện thoại**: Cho phép chỉnh sửa (có kiểm tra định dạng 10 số VN).
  - **Avatar**: Cho phép cập nhật URL ảnh hoặc tải lên.
  - **Email**: Hiển thị **chỉ đọc (Read-only)** trong giai đoạn này.
  - **Thông tin hệ thống (Chỉ đọc)**: Vai trò (`role`), trạng thái hoạt động (`is_active`), mã CTV (`affiliate_code`), trạng thái duyệt hồ sơ (`status`). Người dùng **không được tự sửa** các trường này.

### 2.2. Chi tiết phân hệ "Đổi mật khẩu" (P1.3)
- **Cơ chế**: Sử dụng trực tiếp Supabase Auth API hiện có (`supabase.auth.updateUser({ password })`).
- **Giao diện**: Nhập mật khẩu mới, nhập lại mật khẩu xác nhận, có nút ẩn/hiện ký tự mật khẩu.
- **Bảo mật**: Thực hiện yêu cầu xác thực lại (re-authentication) nếu Supabase Auth yêu cầu. Tuyệt đối không lưu mật khẩu vào bảng `profiles` hay ghi vào tệp log hệ thống.

---

## 3. Thiết Kế Hệ Thống Thông Báo & Chuông Thông Báo (N1.1 - N1.3)

### 3.1. Vị trí và Trạng thái tại A0.4
- Vị trí chuông thông báo được đặt cố định bên cạnh menu tài khoản trên Header.
- **Tại bước A0.4**: Chưa hiển thị badge số lượng chưa đọc. Khi bấm vào chuông, hiển thị popover thông báo dòng chữ: *"Thông tin thông báo sẽ được bổ sung"*.

### 3.2. Quy tắc thiết kế chuẩn (N1.x)
- **Nguồn thông báo**: Chỉ hiển thị thông báo mà tài khoản hiện tại có quyền xem (phân loại theo vai trò và user_id).
- **Tương tác**: Bấm mở danh sách ngắn, có nút "Đánh dấu đã đọc" và "Xem tất cả".
- **Bảo mật**: Các liên kết (link) đính kèm trong thông báo bắt buộc phải đi qua Route Guard kiểm tra quyền hợp lệ trước khi điều hướng. Không tạo số lượng hoặc thông báo giả (no mock notifications).

---

## 4. Quy Hoạch Lộ Trình Triển Khai Chi Tiết (Phân Tách Prompt)

Mỗi bước dưới đây được quy định là một bước/prompt độc lập:

| Mã bước | Tên phân hệ / Nhiệm vụ | Mô tả ngắn gọn |
| :--- | :--- | :--- |
| **A0.4** | Layout Header / Sidebar, Vị trí Chuông & Menu Tài khoản | Xây dựng khung layout chuẩn, menu sidebar theo vai trò, vị trí chuông thông báo (hiển thị thông báo chờ) và dropdown menu tài khoản. |
| **P1.1** | Trang xem thông tin cá nhân | Xây dựng trang profile hiển thị thông tin user (họ tên, email read-only, số điện thoại, role). |
| **P1.2** | Cập nhật hồ sơ cá nhân | Cho phép cập nhật họ tên, số điện thoại, avatar của chính mình, bảo vệ các trường hệ thống không bị sửa. |
| **P1.3** | Đổi mật khẩu bảo mật | Tích hợp Supabase Auth đổi mật khẩu với giao diện ẩn/hiện và xử lý lỗi chuẩn. |
| **N1.1** | Thiết kế nghiệp vụ Thông báo | Chốt loại thông báo, đối tượng nhận và ma trận phân quyền xem thông báo. |
| **N1.2** | Backend Lưu trữ & API Thông báo | Xây dựng bảng `notifications`, API GET/PATCH trạng thái đã đọc trên backend. |
| **N1.3** | Tích hợp Chuông & Danh sách Thông báo | Hoàn thiện chuông thông báo thật, badge đếm số lượng, danh sách tương tác và liên kết route guard. |

*Lưu ý: Bước A0.4 tuyệt đối không triển khai toàn bộ P1/N1 hoặc hiển thị các nút dẫn tới trang/chức năng chưa hoạt động.*

---

## 5. Route Dự Kiến Cho Hồ Sơ & Bảo Mật
- Hồ sơ cá nhân chung: `/profile` (hoặc `/portal/profile`, `/admin/profile` tùy vai trò, tái sử dụng component layout chung).
- Đổi mật khẩu: Tích hợp chung trong tab Bảo mật của trang `/profile`.
