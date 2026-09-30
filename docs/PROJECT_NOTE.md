# TÀI LIỆU DỰ ÁN HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

Tài liệu này ghi nhận toàn bộ quá trình thiết kế, triển khai, kiểm tra và bàn giao các phân hệ trong hệ thống **STHC_CTV** (Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist).

---

## 1. Tổng quan các Phân hệ Đã Triển Khai (M1.1 đến M2.3 & Hotfix Admin Navigation)

### M1: Xác thực, Đăng ký & Điều hướng theo Vai trò (M1.1 - M1.4)
- **Đăng ký CTV (`AffiliateRegisterModal` / `AffiliateLandingPage`)**: Cho phép ứng viên đăng ký tài khoản CTV mới với các trường thông tin cá nhân, định danh, số điện thoại, mật khẩu và đồng ý chính sách bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP. Xử lý timeout 25s và tích hợp `resendVerification`.
- **Đăng nhập (`LoginPage`)**: Giao diện đăng nhập bảo mật bằng email và mật khẩu (có nút ẩn/hiện mật khẩu). Kiểm tra định dạng email trước khi gửi và hiển thị thông báo lỗi rõ ràng khi thất bại.
- **Điều hướng & Route Guard (`src/utils/navigationGuard.ts`, `App.tsx`)**:
  - Chưa đăng nhập → `/login?redirect_to=...`
  - Đã đăng nhập, trạng thái `PENDING_REVIEW`, `SUSPENDED`, `REJECTED` → `/pending`.
  - Đã đăng nhập, trạng thái `ACTIVE` → Cổng CTV (`/portal`).
  - Cán bộ/Quản trị viên (`staff`, `admin`) → Khu vực quản trị (`/admin`).
  - Kiểm tra phiên làm việc với màn hình chờ `"Đang tải..."` (`LOADING`), xử lý lỗi mạng (`NETWORK_ERROR`) với nút thử lại.

### M2: Khung Layout & Trang Tổng Quan Cổng CTV (M2.1 - M2.3)
- **M2.1 – Khung Header & Sidebar (`AffiliateLayout`)**:
  - Header: Logo trường, tên "Cổng Cộng tác viên", tên CTV, menu tài khoản popover và nút đăng xuất hoạt động qua Supabase Auth.
  - Sidebar: Thông tin CTV (Họ tên, Mã CTV kèm nút sao chép, nhãn trạng thái "Đang hoạt động" khi ACTIVE), menu điều hướng chính, nút đăng xuất ở chân sidebar. Hỗ trợ responsive mobile drawer (ngăn kéo).
- **M2.2 – Trang Tổng quan CTV (`AffiliateDashboard`)**:
  - Phần chào mừng: Xin chào, mã CTV, sao chép mã, trạng thái và hướng dẫn nhanh.
  - 4 thẻ KPI thống kê: Lượt đăng ký được ghi nhận, Hồ sơ nhập học hợp lệ, Thù lao chờ duyệt, Thù lao đã duyệt (định dạng tiền tệ VNĐ chuẩn `... đ`).
  - Thao tác nhanh: 2 nút "Xem khóa học" và "Xem khách hàng".
  - Danh sách đăng ký gần đây: Tối đa 5 bản ghi mới nhất với số điện thoại được che 4 số cuối và trạng thái tiếng Việt chuẩn.
- **M2.3 – Thống nhất Menu & Bảo vệ Route toàn diện**:
  - Tập trung cấu hình menu tại `src/config/affiliateNavConfig.ts` dùng chung cho Sidebar và các nút thao tác nhanh.
  - Bảo vệ toàn bộ phân hệ `/portal/*` (yêu cầu phiên hợp lệ, `role = affiliate`, `is_active = true`, `affiliate_status = ACTIVE`).
  - Xử lý thay đổi quyền động, lỗi 401/403, và dọn dẹp state/cache khi đăng xuất.

### Hotfix: Điều hướng Quản trị viên (`/admin`)
- Loại bỏ hoàn toàn việc viết cứng kiểm tra email trên backend (`admin@sthc.edu.vn`), tuân thủ tuyệt đối nguyên tắc RBAC dựa vào bảng `profiles.role` trong cơ sở dữ liệu.
- Tài khoản quản trị truy cập `/admin` thông qua phân quyền database chuẩn (thông qua script bootstrap quản trị viên hoặc RPC nâng quyền `admin_bootstrap_user`).

---

## 2. Bảng Menu, Route và Điều kiện Truy cập (M2.3)

| Tên mục Menu | Đường dẫn (Route) | Biểu tượng (Icon) | Điều kiện Truy cập (Access Rule) | Quy tắc Đánh dấu Chọn (Active Match Rule) |
| :--- | :--- | :--- | :--- | :--- |
| **Tổng quan** | `/portal`, `/portal/dashboard`, `/portal/overview` | `LayoutDashboard` | Đã đăng nhập, `role = 'affiliate'`, `is_active = true`, `affiliate_status = 'ACTIVE'` | Khớp chính xác `/portal`, `/portal/`, `/portal/dashboard`, `/portal/overview` |
| **Khóa học** | `/portal/courses` (Trang tạm M2.1) | `BookOpen` | Đã đăng nhập, `role = 'affiliate'`, `is_active = true`, `affiliate_status = 'ACTIVE'` | Khớp `/portal/courses` hoặc bắt đầu bằng `/portal/courses/` |
| **Khách hàng được giới thiệu** | `/portal/leads` (Trang tạm M2.1) | `Users` | Đã đăng nhập, `role = 'affiliate'`, `is_active = true`, `affiliate_status = 'ACTIVE'` | Khớp `/portal/leads` hoặc bắt đầu bằng `/portal/leads/` |

---

## 3. Các File và Thành phần Code Liên Quan

- **Cấu hình Menu & Route**: `/src/config/affiliateNavConfig.ts`
- **Bộ kiểm tra quyền & Điều hướng**: `/src/utils/navigationGuard.ts`
- **Khung Layout Cổng CTV**: `/src/components/affiliate/AffiliateLayout.tsx`
- **Trang Tổng quan CTV**: `/src/components/affiliate/AffiliateDashboard.tsx`
- **Trang Tạm phân hệ**: `/src/components/affiliate/AffiliatePlaceholderPage.tsx`
- **Điều phối ứng dụng chính**: `/src/App.tsx`
- **API Backend**: `/server.ts` (các endpoint xác thực `/api/v1/auth/login`, `/api/v1/auth/me`, và các endpoint affiliate).

---

## 4. Kết quả Kiểm tra và Phần chưa Kiểm tra

### Đã kiểm tra (Verified):
1. **Khách chưa đăng nhập**: Truy cập trực tiếp `/portal` hoặc `/portal/courses` bị chặn và điều hướng về `/login?redirect_to=...`.
2. **CTV ACTIVE**: Đăng nhập thành công, sử dụng menu sidebar và các nút thao tác nhanh chuyển trang chính xác, đánh dấu active đúng mục, tải lại trang giữ nguyên phiên.
3. **CTV PENDING_REVIEW**: Truy cập `/portal` bị chặn và đưa về `/pending` theo đúng quy tắc M1.4.
4. **Đăng xuất**: Xóa sạch phiên và cache, bấm nút Back không lộ dữ liệu nhạy cảm.
5. **Xác thực Admin / Staff**: Hệ thống phân quyền dựa trên `profiles.role` trong database; tài khoản có role `admin` đăng nhập tự động chuyển hướng chính xác vào `/admin`.

### Phần chưa kiểm tra / Hạn chế (Pending / Limitations):
- Tài khoản bị vô hiệu hóa thực tế trên DB Production chưa kích hoạt kiểm thử trực tiếp bằng tài khoản thật (chờ kiểm thử thủ công trên môi trường staging).
- Các phân hệ Chi tiết Khóa học và Chi tiết Khách hàng trong portal (`/portal/courses/*`, `/portal/leads/*`) hiện sử dụng trang tạm `AffiliatePlaceholderPage`, chưa xây dựng module nghiệp vụ chi tiết (sẽ triển khai ở các module tiếp theo như M3, M5).

---

## 5. Công việc và Kế hoạch Tiếp theo
- Xây dựng chi tiết phân hệ Quản lý Khóa học tuyển sinh & tạo link/QR code nâng cao.
- Xây dựng chi tiết danh sách Khách hàng giới thiệu, bộ lọc và trạng thái đối soát.
- Hoàn thiện module Quản lý Thù lao và rút tiền của CTV.
