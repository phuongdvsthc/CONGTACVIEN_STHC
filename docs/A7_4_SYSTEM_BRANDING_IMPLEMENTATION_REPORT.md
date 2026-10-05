# BÁO CÁO TRIỂN KHAI NHẬN DIỆN BACKEND (A7.4)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_4_SYSTEM_BRANDING_IMPLEMENTATION_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH (PASS 100% KIỂM THỬ TỰ ĐỘNG)**

---

## 1. Mục tiêu & Phạm vi Triển khai A7.4

Bước **A7.4** triển khai toàn diện phân hệ **Nhận diện backend** thuộc Module Quản trị hệ thống (System Administration), kết nối chặt chẽ giữa CSDL/API nền tảng (A7.3) và trải nghiệm giao diện người dùng theo đặc tả A7.2.

### 1.1. Phạm vi ĐÃ Hoàn thành:
- **Tuyến đường quản trị**: Thiết lập và bảo vệ route `/admin/system-settings`, chỉ dành riêng cho tài khoản có vai trò `profiles.role === 'admin'`.
- **Menu điều hướng**:
  - Sidebar Admin: Mục **Quản trị hệ thống** được đặt ở cuối danh sách (sau Nhật ký hệ thống), hiển thị biểu tượng bánh răng (`Settings`), tự động ẩn đối với Cán bộ Tuyển sinh (`staff`) và Cộng tác viên (`affiliate`).
  - Account Menu (Dropdown hồ sơ): Bổ sung lối tắt **Quản trị hệ thống** nằm chính giữa mục *Đổi mật khẩu* và *Đăng xuất*, chỉ hiển thị khi `profiles.role === 'admin'`.
- **Form Nhận diện backend** (`AdminSystemSettingsView.tsx`):
  - Nhập liệu và kiểm tra hợp lệ: Tên hệ thống (`system_name`), Tên viết tắt (`system_short_name`), Tên đơn vị chủ quản (`unit_name`).
  - Tải lên ảnh Logo backend (định dạng PNG, JPG, WebP; tối đa 2 MB).
  - Tải lên biểu tượng Favicon tab trình duyệt (định dạng ICO, PNG; tối đa 512 KB).
  - Tùy chọn xóa logo/favicon tùy chỉnh để quay về mặc định của Nhà trường.
  - Xem trước tức thời (Live Preview) cho 3 tình huống hiển thị: Sidebar Mở rộng, Sidebar Thu gọn (Icon only), và Tab Trình duyệt (Favicon & Tiêu đề).
  - Kiểm soát xung đột phiên bản (Optimistic Concurrency Control) với cảnh báo Banner và nút nạp lại dữ liệu máy chủ khi có Admin khác cập nhật cùng lúc.
  - Phân tách rõ ràng trạng thái: Đang tải, Lỗi tải, Đang tải tệp, Đang lưu, Lưu thành công, Hủy thay đổi (quay về baseline).
- **Đồng bộ nhận diện toàn hệ thống**:
  - Tạo `SystemBrandingContext` và `SystemBrandingProvider` bao bọc toàn bộ ứng dụng.
  - Admin, Staff, CTV Portal dùng chung nguồn nhận diện cập nhật từ hệ thống.
  - Nhãn vai trò `ADMIN`, `STAFF`, `CTV` tại sidebar lấy trực tiếp từ vai trò tài khoản (`profiles.role`), tuyệt đối không đưa vào cấu hình nhận diện.
  - Phân tách nhận diện công khai (A6) và nội bộ: Khi người dùng chuyển sang các trang công khai (`/`, `/catalog`, `/policy`, `/login`), tiêu đề tab và favicon được tự động khôi phục về nhận diện trường học mặc định, không bị giữ nhầm cấu hình backend.

### 1.2. Giới hạn phạm vi (CHƯA triển khai tại A7.4 theo đúng phân kỳ):
- Nhóm thông tin vận hành (`operation`) -> Phân kỳ A7.5.
- Quản lý quy chế và đăng ký CTV (`registration`) -> Phân kỳ A7.6.
- Cấu hình và bộ cấp mã CTV (`affiliate_code`) -> Phân kỳ A7.7.
- Giao diện lịch sử cấu hình & khôi phục (UI Rollback) -> Phân kỳ A7.8.
- Chức năng sao lưu & phục hồi CSDL (ghi rõ "Chưa triển khai" trong tài liệu).

---

## 2. Kiến trúc & Giải pháp Kỹ thuật

### 2.1. Phân quyền và Bảo vệ Route Guard (`src/utils/navigationGuard.ts`)
- Kiểm tra quyền nghiêm ngặt theo vai trò người dùng trong cơ sở dữ liệu (`profiles.role`):
  ```typescript
  if (cleanPath === '/admin/system-settings') {
    if (role === 'admin') {
      return { allowed: true };
    }
    const defaultRoute = role === 'staff' ? '/admin' : (affiliateStatus === 'ACTIVE' ? '/portal' : '/pending');
    return {
      allowed: false,
      reason: 'FORBIDDEN',
      defaultRoute,
      message: 'Chỉ Quản trị viên (Admin) mới có quyền truy cập module Quản trị hệ thống.',
    };
  }
  ```
- **Chống chớp giao diện**: Trạng thái tải phiên (`isCheckingAuth`) hiển thị màn hình chờ `AccessNoticeScreen type="LOADING"`, không hiển thị trước bất kỳ phần tử nội bộ nào khi chưa xác định quyền.
- **Bảo vệ nhiều lớp**: Cả Route Guard phía client và middleware `requireAdminOnly` phía backend API đều kiểm tra vai trò `admin`, ngăn chặn hoàn toàn việc Staff hay CTV can thiệp hoặc tải dữ liệu quản trị.

### 2.2. Cơ chế Lưu trữ và Phục vụ Tài nguyên Nhận diện
- **Lưu trữ**: Ảnh logo và favicon được tải lên bucket riêng tư (Private Storage) `system-assets` dưới thư mục `branding/` với tên tệp ngẫu nhiên do máy chủ kiểm soát (`branding/backend_logo_{timestamp}_{random}.png`).
- **Phục vụ ảnh an toàn**:
  - Không công khai trực tiếp URL CDN của bucket.
  - Cung cấp qua proxy route an toàn: `GET /api/v1/public/branding/asset?path=...`.
  - Bộ kiểm tra bảo mật chặt chẽ: Chặn đứng tấn công duyệt thư mục (Path Traversal `..`), chỉ cho phép đọc tệp nằm trong `branding/` và đang được chỉ định là `logo_backend_url` hoặc `favicon_url` có trong cấu hình hiện hành.
  - Phục hồi dự phòng: Hỗ trợ nạp tệp từ hệ thống lưu trữ dự phòng của máy chủ nếu dịch vụ đối tác gián đoạn.

### 2.3. Quản lý Trạng thái & Đồng bộ Nhận diện (`src/contexts/SystemBrandingContext.tsx`)
- Sử dụng hook `useSystemBranding()` để cung cấp dữ liệu nhận diện cho `AppLayout`, `Header` và các màn hình portal.
- Hàm `syncTabIdentity(pageTitle, path)`:
  - Nếu là trang công khai (`/`, `/catalog`, `/policy`, `/login`): Phục hồi Favicon gốc `/favicon.ico` và tiêu đề tab công khai (vd: `Danh mục ngành đào tạo | STHC`).
  - Nếu là trang nội bộ (`/admin`, `/portal`, `/pending`): Đổi Favicon thành `branding.favicon_url` và tiêu đề dạng `${pageTitle} | ${branding.system_short_name}`.
  - Sau khi Admin lưu thành công form Nhận diện backend, gọi `updateBrandingImmediately()` để toàn bộ thanh sidebar và tiêu đề tab cập nhật tức thì mà không cần tải lại toàn bộ trang.

---

## 3. Danh mục Tệp tin Chỉnh sửa & Bổ sung

| Đường dẫn tệp tin | Loại thay đổi | Mô tả chi tiết |
|:---|:---:|:---|
| `/src/components/admin/AdminSystemSettingsView.tsx` | Khởi tạo mới | Màn hình giao diện Quản trị hệ thống với form Nhận diện backend, live preview, xử lý tải tệp và xung đột phiên bản. |
| `/src/contexts/SystemBrandingContext.tsx` | Khởi tạo mới | Context quản lý nhận diện toàn hệ thống, tự động đồng bộ Favicon và Title tab trình duyệt giữa công khai và nội bộ. |
| `/src/components/common/AppLayout.tsx` | Cập nhật | Bổ sung lối tắt Quản trị hệ thống trong Account menu giữa Đổi mật khẩu và Đăng xuất (chỉ Admin). Đồng bộ logo và nhãn thương hiệu từ `SystemBrandingContext`. |
| `/src/App.tsx` | Cập nhật | Tích hợp `<SystemBrandingProvider>`, cấu hình điều hướng cho `/admin/system-settings` bên trong `AppLayout`. |
| `/src/config/navConfig.ts` | Xác minh | Xác nhận mục `admin_system_settings` nằm ở cuối `ADMIN_NAV_ITEMS` với cờ `adminOnly: true`. |
| `/server.ts` | Cập nhật | Đảm bảo endpoint công khai `/api/v1/public/system-info` chỉ trả về thông tin cho phép (loại bỏ trường nhạy cảm `revision`). Phục vụ ảnh proxy an toàn tại `/api/v1/public/branding/asset`. |
| `/scripts/verify_a7_4_system_branding.ts` | Khởi tạo mới | Bộ kiểm thử tự động 9 ca cho phân hệ Nhận diện backend, phân quyền và điều hướng A7.4. |

---

## 4. Kết Quả Kiểm Thử Tự Động (Test Results)

Hệ thống đã chạy thành công bộ kiểm thử tự động độc lập `scripts/verify_a7_4_system_branding.ts` và kiểm thử hồi quy `scripts/verify_a7_3_system_administration.ts`.

### 4.1. Kết quả Kiểm thử A7.4 (`scripts/verify_a7_4_system_branding.ts`): **9/9 PASS (100%)**

| Mã Test | Tên ca kiểm thử | Kết quả | Chi tiết kết quả thực tế |
|:---:|:---|:---:|:---|
| **TC-A7.4-01** | Route Guard bảo vệ tuyến đường `/admin/system-settings` | **PASS** | Chưa đăng nhập -> Chuyển hướng `/login?redirect_to=...`. CTV & Staff -> Bị chặn với mã `FORBIDDEN` (HTTP 403). Admin -> Được phép truy cập (`ALLOWED`). |
| **TC-A7.4-02** | Vị trí mục Quản trị hệ thống trong Sidebar Admin | **PASS** | Nằm ở vị trí cuối cùng trong danh sách sidebar Admin (`id: admin_system_settings`, `adminOnly: true`). Tự động lọc bỏ hoàn toàn trong menu Staff. |
| **TC-A7.4-03** | API Public Allowlist `/api/v1/public/system-info` an toàn | **PASS** | Cung cấp đầy đủ nhận diện: `system_name`, `system_short_name`, `unit_name`. Không rò rỉ bất kỳ trường bí mật nào (`revision`, `service_role`, `updated_by`). |
| **TC-A7.4-04** | Bảo vệ endpoint `GET /api/v1/admin/system-settings` | **PASS** | Chặn không có token với HTTP 401; Chặn tài khoản Staff với HTTP 403 `ADMIN_ONLY`; Cho phép Admin với HTTP 200. |
| **TC-A7.4-05** | Cập nhật nhóm nhận diện backend (PUT branding) | **PASS** | Cập nhật thành công các trường nhận diện, hệ thống tăng số phiên bản `revision` chính xác theo Optimistic Locking. |
| **TC-A7.4-06** | Kiểm soát xung đột ghi đè (Optimistic Concurrency Control) | **PASS** | Khi gửi `expected_revision` cũ/sai lệch, hệ thống từ chối ghi đè và trả về mã lỗi HTTP 409 `CONFIG_VERSION_CONFLICT`. |
| **TC-A7.4-07** | Validation dữ liệu form nhận diện backend | **PASS** | Từ chối tên hệ thống quá ngắn (< 3 ký tự) với HTTP 400. Chặn đứng các trường nằm ngoài danh sách cho phép (Allowlist). |
| **TC-A7.4-08** | Upload Logo & Favicon an toàn qua API Backend | **PASS** | Kiểm tra nhị phân Magic Bytes xác định đúng PNG/ICO, lưu vào `branding/backend_logo_...`, từ chối 100% tệp giả mạo định dạng. |
| **TC-A7.4-09** | Proxy phục vụ ảnh nhận diện an toàn chống Path Traversal | **PASS** | Chặn đứng mọi nỗ lực khai thác duyệt thư mục `..` hoặc truy cập tệp ngoài phạm vi `branding/` với HTTP 400. |

### 4.2. Kết quả Kiểm thử Hồi quy Nền tảng A7.3 (`scripts/verify_a7_3_system_administration.ts`): **12/12 PASS (100%)**
- Toàn bộ 12 ca kiểm thử CSDL, RLS, Trigger, Sequence, RPC áp dụng quy chế và Rollback cấu hình đều đạt chuẩn tuyệt đối 100%.

---

## 5. Kết Luận & Sẵn Sàng Chuyển Giai Đoạn

Giai đoạn **A7.4 – Nhận diện backend** đã hoàn thành đầy đủ các tiêu chí kỹ thuật:
1. Giao diện quản trị sạch đẹp, chuẩn nhận diện Nhà trường, hỗ trợ live preview đầy đủ các trạng thái sidebar và browser tab.
2. Bảo mật đa tầng: phân quyền Admin chặt chẽ cả trên Route Guard và API backend, bảo vệ dữ liệu nhạy cảm.
3. Đồng bộ mượt mà giữa các phân hệ Admin, Staff, CTV Portal và tự động trả lại nhận diện trang công khai chuẩn mực.

Hệ thống đã sẵn sàng cho bước tiếp theo: **A7.5 – Thông tin vận hành**.
