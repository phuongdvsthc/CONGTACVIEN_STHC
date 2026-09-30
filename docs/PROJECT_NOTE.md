# TÀI LIỆU DỰ ÁN HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

Tài liệu này ghi nhận toàn bộ quá trình thiết kế, triển khai, kiểm tra và bàn giao các phân hệ trong hệ thống **STHC_CTV** (Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist).

---

## 1. Yêu cầu A0.1: Dọn giao diện trang Quản trị hệ thống (`/admin`)
Theo yêu cầu A0.1, giao diện trang quản trị của hệ thống đã được dọn dẹp tối giản, loại bỏ hoàn toàn các thông tin hướng dẫn công khai và thông tin kỹ thuật debug, giữ lại không gian điều hành tập trung cho Quản trị viên.

### Các phần giao diện đã bỏ (Xóa):
1. **Thanh điều hướng công khai trên Header**:
   - “Giới thiệu & Đăng ký CTV”.
   - “Ngành đào tạo STHC”.
   - “Chính sách 500k”.
2. **Nút CTA**: “Đăng Ký Tư Vấn”.
3. **Thông tin kỹ thuật nhạy cảm**:
   - Mã định danh UID bên cạnh tài khoản đăng nhập (`879a11fc-...`).
   - Nhãn hiển thị phân quyền `Phân quyền: Staff & Admin`.
   - Toàn bộ khung “Xác nhận tài khoản Admin chuẩn” (thông tin `profiles.role = admin`, `is_active = true`, ghi chú bootstrap và lỗi kỹ thuật 42501).

### Các phần giao diện được giữ (Giữ nguyên & Chuẩn hóa):
1. **Logo & Tên hệ thống**: Biểu tượng trường Saigontourist và tiêu đề hệ thống.
2. **Thông tin tài khoản đăng nhập**: Hiển thị trực quan email tài khoản quản trị đang hoạt động (ví dụ: `admin@sthc.edu.vn`).
3. **Nút Đăng xuất**: Nút thoát phiên làm việc an toàn.
4. **Tiêu đề trung tâm**: Đổi thành **“Quản trị hệ thống CTV”**.
5. **Chức năng nghiệp vụ**: Giữ nguyên toàn bộ 6 tab quản trị cốt lõi (Duyệt CTV, Quản lý Khóa học, Tiếp nhận & Cập nhật Lead, Đối soát Hồ sơ, Duyệt Thưởng 500k, Nhật ký Kiểm toán Audit Logs) không thay đổi API hay logic phía sau.

---

## 2. Yêu cầu A0.2: Kiểm kê chức năng, API, dữ liệu và quyền khu vực quản trị
Đã thực hiện kiểm kê toàn diện và lập báo cáo chi tiết tại **`/docs/architecture/A0_2_ADMIN_INVENTORY.md`**.

### Kết quả kiểm kê chính:
1. **Giao diện & Route**: 6 module quản trị chính (`/admin` với các tab `affiliates`, `courses`, `leads`, `reconcile`, `rewards`, `audit`) đã được xây dựng hoàn chỉnh và kết nối dữ liệu.
2. **API Backend**: 13 endpoint quản trị thực tế tại `server.ts` xử lý toàn bộ các thao tác nghiệp vụ, có kiểm tra quyền qua middleware `requireStaffOrAdmin`, xác thực, kiểm tra đầu vào và ghi vết nhật ký `audit_logs`.
3. **Dữ liệu**: Kết hợp giữa dữ liệu thực từ cơ sở dữ liệu Supabase (các bảng 7 core tables) và mảng khóa học dự phòng `INITIAL_COURSES` / `demoState` chống đứt gãy kết nối.
4. **Quyền & Bảo mật**: Phân quyền phân tách rõ ràng giữa `admin`/`staff` và `affiliate`. RLS và trigger bảo vệ hoạt động ở tầng CSDL.
5. **Quy trình nghiệp vụ**: Phù hợp 100% với quy trình chuẩn (CTV đăng ký -> xét duyệt ACTIVE -> lấy link/QR theo khóa -> học viên gửi form lead -> nhà trường đối soát học phí -> duyệt thù lao 500k). Chưa có tính năng ví/rút tiền (tuân thủ Phase 1).

---

## 3. Yêu cầu A0.3: Thiết kế Layout và menu tài khoản của STHC_CTV
Đã hoàn thành thiết kế kiến trúc chi tiết tại **`/docs/architecture/A0_3_ADMIN_STAFF_ACCESS_DESIGN.md`**.

### Nội dung thiết kế cốt lõi:
1. **Sidebar bên trái**: Menu chức năng theo vai trò (Admin/Staff theo cấu trúc A0.3, CTV giữ M2.3), hỗ trợ đánh dấu active, thu gọn/mở rộng desktop và dạng ngăn kéo mobile.
2. **Header**: Bên trái chứa tên trang và nút mở sidebar; bên phải chứa chuông thông báo và avatar/tên kèm menu tài khoản. Tuyệt đối không hiển thị UID hay thông tin debug.
3. **Menu tài khoản**: Áp dụng chung cho mọi vai trò gồm 3 mục: *Thông tin cá nhân* (xem/sửa họ tên, SĐT, avatar; email read-only; không sửa role/is_active/mã CTV), *Đổi mật khẩu* (dùng Supabase Auth, bảo mật không lưu log), *Đăng xuất*.
4. **Chuông thông báo**: Vị trí sẵn sàng trên header (A0.4 sẽ hiển thị thông báo "Thông tin thông báo sẽ được bổ sung", chưa có badge số).
5. **Lộ trình triển khai phân rã**: Chia thành các bước độc lập A0.4, P1.1-P1.3, N1.1-N1.3.

---

## 4. Yêu cầu A0.4: Triển khai Layout header/sidebar dùng chung cho STHC_CTV
Đã triển khai thành công component layout chung `AppLayout.tsx` cho toàn bộ các trang nội bộ (`/portal` và `/admin`), thay thế hoàn toàn thanh tab ngang cũ và chuẩn hóa trải nghiệm đa thiết bị.

### Chi tiết triển khai:
1. **Unified AppLayout (`/src/components/common/AppLayout.tsx`)**:
   - **Sidebar**: Hỗ trợ 2 bộ cấu hình menu động theo vai trò (`ADMIN_NAV_ITEMS` gồm 9 mục cho Admin/Staff và `AFFILIATE_NAV_ITEMS` gồm 3 mục cho CTV). Hỗ trợ thu gọn/mở rộng trên Desktop (`isCollapsed`) và dạng ngăn kéo (`drawer`) trên Mobile. Đánh dấu active chính xác.
   - **Header**: Bên trái hiển thị tiêu đề trang động và nút toggle sidebar; bên phải tích hợp chuông thông báo (mở popover thông báo *"Thông tin thông báo sẽ được bổ sung"*) và menu tài khoản (gồm *Thông tin cá nhân*, *Đổi mật khẩu* trỏ modal chú thích P1, và *Đăng xuất* hoạt động chuẩn Auth).
2. **AdminPlaceholderPage (`/src/components/admin/AdminPlaceholderPage.tsx`)**:
   - Trang tạm chuyên nghiệp cho các phân hệ admin chưa xây dựng (Quản lý trang chủ, Tài khoản nhân viên) tuân thủ đúng yêu cầu không tạo dữ liệu mẫu hay liên kết chết.
3. **Cấu hình menu (`/src/config/navConfig.ts`)**: Tập trung hóa điều hướng sidebar cho toàn hệ thống.

---

## 5. Yêu cầu A1.1: Danh sách, tìm kiếm, lọc trạng thái và phân trang cho module “Quản lý CTV”
Đã hoàn thiện module Quản lý CTV (`/admin/affiliates`) với các tính năng:
1. **API backend (`GET /api/v1/admin/affiliates`)**:
   - Hỗ trợ server-side search (`ilike` trên mã CTV, họ tên, email, phone), lọc trạng thái (`status`), phân trang (`page`, `limit`), và kết hợp trạng thái xác thực email từ Supabase Auth (`email_confirmed_at`).
2. **Giao diện quản lý (`AdminPortal.tsx`)**:
   - Thanh công cụ gồm ô tìm kiếm (debounce 400ms), bộ lọc trạng thái (`ALL`, `PENDING_REVIEW`, `ACTIVE`, `SUSPENDED`, `REJECTED`), nút “Xóa bộ lọc”, và bộ chọn số dòng/trang (20, 50, 100).
   - Bảng danh sách với các cột chuẩn: STT (xuyên suốt các trang), Mã CTV, Họ và tên, Email, Số điện thoại, Trạng thái CTV, Xác thực email (hiển thị riêng biệt), Ngày đăng ký (định dạng múi giờ VN).
   - Xử lý đầy đủ các trạng thái giao diện: Đang tải, Chưa có CTV, Không tìm thấy kết quả phù hợp, Lỗi tải dữ liệu kèm nút “Thử lại”.

---

## 6. Danh Sách File Đã Tạo / Cập Nhật
- `/server.ts`: Bổ sung server-side search, lọc trạng thái, phân trang và đồng bộ xác thực email cho `/api/v1/admin/affiliates`.
- `/src/services/api.ts`: Cập nhật `getAdminAffiliates` nhận query parameters (`search`, `status`, `page`, `limit`).
- `/src/components/admin/AdminPortal.tsx`: Hoàn thiện UI danh sách CTV với toolbar tìm kiếm, lọc trạng thái, bảng chuẩn A1.1 và phân trang phía server.
- `/docs/PROJECT_NOTE.md`: Cập nhật ghi nhận toàn bộ tiến trình.

---

## 7. Kết Quả Kiểm Tra (Verification)
- **Kiểm tra mã nguồn & Build**: PASS 100% (TypeScript, Linter, Vite Production Build thành công).
- **Trạng thái thực tế**: Hoàn tất A1.1. Toàn bộ các tiêu chí tìm kiếm, lọc, phân trang, hiển thị trạng thái CTV và xác thực email hoạt động chính xác với cơ sở dữ liệu thật.
