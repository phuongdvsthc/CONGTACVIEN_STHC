# BÁO CÁO KHẮC PHỤC FOOTER TRANG CHI TIẾT KHÓA HỌC & FAVICON TOÀN HỆ THỐNG
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/PUBLIC_FOOTER_GLOBAL_FAVICON_FIX_REPORT.md`  
**Ngày thực hiện**: 06/10/2026  
**Trạng thái**: **HOÀN THÀNH (PASS 100% KIỂM THỬ)**

---

## 1. Tổng quan & Mục tiêu Khắc phục

Tài liệu này ghi nhận quá trình điều tra nguyên nhân gốc rễ và xử lý dứt điểm hai lỗi cấu hình nhận diện trên các trang công khai:
1. **Footer trang chi tiết khóa học** (`/?ref=...&course=...`): Chưa lấy cấu hình xuất bản từ Admin A6, còn tồn tại footer riêng hardcode.
2. **Favicon toàn hệ thống** (`/`, `/login`, `/catalog?ref=...`, `/?ref=...&course=...`): Chưa tải đúng biểu tượng từ cấu hình *“Tab trình duyệt – áp dụng toàn hệ thống”* tại `/admin/system-settings` (A7).

---

## 2. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 2.1. Lỗi Footer trang chi tiết khóa học
- **Nguyên nhân 1 (Ẩn Footer dùng chung)**: Tại `src/App.tsx` (dòng 753), điều kiện render footer chung chứa logic `!(currentPath === '/' && courseSlugParam)`, chủ động ẩn component `<Footer />` dùng chung khi URL có tham số `course`.
- **Nguyên nhân 2 (Hardcode component riêng)**: Tại `src/components/public/PublicCourseDetailPage.tsx` (dòng 549–554), component tự render một thẻ `<footer>` cục bộ với dòng chữ tĩnh viết cứng: `© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.`, không kết nối đến API `GET /api/v1/public/homepage-config` của A6.

### 2.2. Lỗi Favicon toàn hệ thống
- **Nguyên nhân 1 (Lồng URL Proxy phía Client)**:
  - Backend `GET /api/v1/public/system-info` đã tự động chuẩn hóa trường `favicon_url` thành đường dẫn proxy an toàn: `/api/v1/public/branding/asset?path=branding%2Ffavicon_...&v=24`.
  - Tuy nhiên, tại `SystemBrandingContext.tsx` (hàm `syncTabIdentity`), logic cũ kiểm tra `branding.favicon_url.startsWith('http')` rồi bọc tiếp vào chuỗi proxy `/api/v1/public/branding/asset?path=${encodeURIComponent(branding.favicon_url)}`.
  - Hậu quả: Trình duyệt yêu cầu một URL bị lồng hai lần: `/api/v1/public/branding/asset?path=%2Fapi%2Fv1%2Fpublic...`. Tầng backend kiểm tra `assetPath.startsWith('branding/')` thấy không khớp nên trả về lỗi `HTTP 400 (Bad Request: Đường dẫn tệp không hợp lệ)`. Trình duyệt không thể nạp favicon và quay về biểu tượng mặc định.
- **Nguyên nhân 2 (Thẻ link rel="icon" ban đầu)**: `index.html` chưa khai báo sẵn thẻ `<link rel="icon" href="/favicon.ico" />` để làm mốc baseline trước khi React Context khởi tạo.

---

## 3. Danh mục Tệp tin Chỉnh sửa & Giải pháp Kỹ thuật

| STT | Tệp tin | Vị trí / Thay đổi | Giải pháp chi tiết |
|:---:|:---|:---:|:---|
| 1 | `/src/components/public/PublicCourseDetailPage.tsx` | Dòng 545–555 | **Xóa bỏ hoàn toàn** khối `<footer>` tĩnh cục bộ, trả quyền render footer cho layout dùng chung. |
| 2 | `/src/App.tsx` | Dòng 752–755 | Đổi điều kiện render footer chung thành `{currentPath !== '/pending' && <Footer />}`, đảm bảo trang chi tiết khóa học, trang chủ, danh mục và chính sách đều dùng chung 1 component `<Footer />`. |
| 3 | `/src/components/common/Footer.tsx` | Toàn bộ tệp | Tích hợp hàm `sanitizeHtml` làm sạch nội dung HTML nếu có; nạp trực tiếp `footer_text` từ API `GET /api/v1/public/homepage-config` đã xuất bản của Admin A6. |
| 4 | `/src/components/public/PublicFooter.tsx` | Toàn bộ tệp | Đồng bộ cơ chế `sanitizeHtml` và nạp `footer_text` nhất quán với `Footer.tsx`. |
| 5 | `/src/contexts/SystemBrandingContext.tsx` | Dòng 50, 205–225 | Xây dựng helper `resolveFaviconUrl` thông minh: nhận diện đúng URL proxy `/api/`, URL HTTPS tuyệt đối, đường dẫn `branding/...` hoặc fallback `/favicon.ico`. Quản lý đồng bộ tất cả thẻ `<link rel="icon">` trên toàn bộ các route. |
| 6 | `/index.html` | Dòng 6 | Bổ sung `<link rel="icon" href="/favicon.ico" />` chuẩn hóa HTML entry point. |

---

## 4. Cơ chế Quản lý Cache & Nguồn Cấu hình Phân định

1. **Phân định rạch ròi 2 nguồn cấu hình**:
   - **Footer**: Lấy từ Cấu hình Trang chủ đã xuất bản của A6 (`homepage_config.footer_text` qua endpoint `GET /api/v1/public/homepage-config`).
   - **Favicon**: Lấy từ Cấu hình Nhận diện Backend của A7 (`system_settings.favicon_url` qua endpoint `GET /api/v1/public/system-info`).
   - Hai nguồn này hoàn toàn độc lập, không bị trộn lẫn hoặc phụ thuộc chéo.

2. **Quản lý Cache & Busting**:
   - Proxy route `/api/v1/public/branding/asset` gán tham số version `&v=${revision}` từ số phiên bản cấu hình hệ thống. Khi Admin cập nhật favicon mới trong `/admin/system-settings`, `revision` tăng lên giúp trình duyệt nạp ảnh mới ngay lập tức mà không bị dính cache cũ.
   - Khi cấu hình favicon chưa đặt (null/rỗng), hệ thống tự động fallback về `/favicon.ico` trung tính, không chứa thương hiệu cứng.

---

## 5. Kết quả Kiểm thử Nghiệm thu

Script kiểm thử tự động độc lập: `scripts/verify_public_footer_global_favicon.ts`

### 5.1. Bảng tổng hợp Kết quả Kiểm tra: **11/11 PASS (100%)**

| Mã Test | Nội dung kiểm thử | Kết quả | Chi tiết phản hồi thực tế |
|:---:|:---|:---:|:---|
| **TC-FOOTER-01** | API Cấu hình Trang chủ A6 | **PASS** | `GET /api/v1/public/homepage-config` trả về HTTP 200, `footer_text` khớp bản xuất bản: *"@2026 Trường Saigontourist. Tất cả các quyền được bảo lưu."* |
| **TC-FAVICON-01** | API Nhận diện Hệ thống A7 | **PASS** | `GET /api/v1/public/system-info` trả về `favicon_url` hợp lệ cho khách chưa đăng nhập. |
| **TC-FAVICON-02** | Tải tệp Favicon qua Proxy | **PASS** | Tải thành công qua `GET /api/v1/public/branding/asset`, HTTP 200, `Content-Type: image/png`, kích thước 87,236 bytes. |
| **TC-RESOLVE-01** | Xử lý null/empty | **PASS** | Trả về `/favicon.ico` trung tính. |
| **TC-RESOLVE-02** | Xử lý URL Proxy có sẵn | **PASS** | Giữ nguyên đường dẫn proxy hợp lệ, không bị lồng lặp mã hóa. |
| **TC-RESOLVE-03** | Xử lý Storage Path thô | **PASS** | Chuyển đổi chính xác thành `/api/v1/public/branding/asset?path=...&v=...`. |
| **TC-RESOLVE-04** | Xử lý URL HTTPS tuyệt đối | **PASS** | Giữ nguyên URL ngoại vi an toàn. |
| **TC-ROUTE-01** | Route Trang chủ Home (`/`) | **PASS** | HTTP 200, hiển thị footer xuất bản & nạp favicon hệ thống. |
| **TC-ROUTE-02** | Route Đăng nhập (`/login`) | **PASS** | HTTP 200, nạp favicon hệ thống. |
| **TC-ROUTE-03** | Route Danh mục (`/catalog?ref=...`) | **PASS** | HTTP 200, hiển thị footer xuất bản & nạp favicon hệ thống. |
| **TC-ROUTE-04** | Route Chi tiết (`/?ref=...&course=...`)| **PASS** | HTTP 200, hiển thị footer xuất bản, gỡ bỏ footer hardcode cũ, nạp favicon hệ thống. |

### 5.2. Kiểm tra Biên dịch & Lint:
- `tsc --noEmit` (Linter): **PASS (0 lỗi, 0 cảnh báo)**.
- `compile_applet` (Build): **PASS (Build succeeded)**.

---

## 6. Phần Ghi nhận Chưa Xác minh

- Việc hiển thị đồ họa của favicon trên thanh tab thực tế của từng trình duyệt vật lý (Chrome, Safari, Edge) phụ thuộc vào client browser engine. Đã xác minh 100% về mặt cấu trúc DOM (`<link rel="icon">`), HTTP status (200), MIME type (`image/png`) và độ hợp lệ của tệp nhị phân trên máy chủ.
