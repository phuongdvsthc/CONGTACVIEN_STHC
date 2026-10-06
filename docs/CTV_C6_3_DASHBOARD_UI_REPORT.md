# BÁO CÁO TRIỂN KHAI C6.3 — BANNER, BỐ CỤC VÀ CARD KẾT QUẢ DASHBOARD CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_3_DASHBOARD_UI_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất triển khai Banner, QR danh mục và 4 Card kết quả thời gian thực
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.3

### 1.1. Phạm vi hoàn thành
1. **Kết nối API thật:** Chuyển đổi màn hình Dashboard tại `/portal` (`src/components/affiliate/AffiliateDashboard.tsx`) sang sử dụng độc quyền endpoint chuẩn `GET /api/v1/affiliate/dashboard/summary`.
2. **Banner chào mừng tích hợp QR danh mục tuyển sinh:**
   - Nền chuyển sắc xanh đậm cao cấp (`bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900`), bo góc lớn `rounded-3xl`.
   - Badge trạng thái tài khoản: `Đang hoạt động` (xanh lá) hoặc `Tạm ngưng hoạt động` (hổ phách).
   - Lời chào cá nhân hóa: *"Xin chào, [Họ và tên CTV]!"* lấy từ dữ liệu `affiliate.full_name`.
   - Mã CTV và nút *"Sao chép mã"* hoạt động chính xác với clipboard navigator.
   - Dòng hướng dẫn tiếp thị tuyển sinh thích ứng theo trạng thái `ACTIVE` / `SUSPENDED`.
   - Khối QR tiếp thị toàn bộ danh mục khóa học (`/catalog?ref=[Mã_CTV]`), hỗ trợ xem phóng to (`QRModal`) và tải file PNG trực tiếp.
   - 2 nút điều hướng: *"Xem khóa học"* (`/portal/courses`) và *"Xem khách hàng"* (`/portal/leads`).
3. **4 Card kết quả tuyển sinh toàn bộ thời gian:**
   - Thẻ 1: **"Lượt đăng ký được ghi nhận"** (`metrics.total_leads`) — Chú thích: *"Tổng lượt đăng ký thuộc bạn"*.
   - Thẻ 2: **"Chưa nhập học"** (`metrics.not_enrolled_leads`) — Chú thích: *"Lượt đăng ký chưa được xác nhận nhập học"*.
   - Thẻ 3: **"Đã nhập học"** (`metrics.enrolled_leads`) — Chú thích: *"Được xác nhận qua đối chiếu hồ sơ"*.
   - Thẻ 4: **"Hồ sơ đối chiếu hợp lệ"** (`metrics.matched_valid_leads`) — Chú thích: *"Nguồn giới thiệu được xác nhận hợp lệ"*.
4. **Xử lý trạng thái giao diện:**
   - Đang tải (Loading): Skeleton loader toàn diện cho Banner, 4 Card kết quả, Thù lao và Bảng khách hàng.
   - Lỗi kết nối (Error): Thông báo chi tiết kèm nút *"Thử lại"*.
   - Chưa có đăng ký (Empty state): Gợi ý thân thiện vào danh mục khóa học để lấy link/mã QR.
   - Bố cục responsive: 4 cột trên Desktop, 2 cột trên Tablet, 1 cột trên Mobile.
5. **Quy tắc thương hiệu không ghi cứng:**
   - Sử dụng `system_short_name` từ `SystemBrandingContext` cho dòng phụ: *"Cổng cộng tác viên tuyển sinh [system_short_name]"*.
   - Không chứa bất kỳ chuỗi thương hiệu hardcode ("STHC", "Saigontourist") nào trong các phần mới.

---

## II. CHI TIẾT ÁNH XẠ DỮ LIỆU & NGUỒN TẠO QR

### 2.1. Ánh xạ 4 Card kết quả
| Thẻ kết quả | Thuộc tính API (`data.metrics`) | Icon & Màu sắc | Chú thích hiển thị |
|---|---|---|---|
| **Lượt đăng ký được ghi nhận** | `total_leads` | `Users` (Xanh dương) | *Tổng lượt đăng ký thuộc bạn* |
| **Chưa nhập học** | `not_enrolled_leads` | `Clock` (Vàng hổ phách) | *Lượt đăng ký chưa được xác nhận nhập học* |
| **Đã nhập học** | `enrolled_leads` | `Award` (Xanh ngọc lục bảo) | *Được xác nhận qua đối chiếu hồ sơ* |
| **Hồ sơ đối chiếu hợp lệ** | `matched_valid_leads` | `CheckCircle2` (Tím lam / Indigo) | *Nguồn giới thiệu được xác nhận hợp lệ* |

### 2.2. Nguồn URL và Chức năng QR trong Banner
- **Cơ chế phân giải URL:** Sử dụng `buildCatalogUrl(currentAffiliateCode)` từ `SystemBrandingContext` (kết nối trực tiếp cấu hình `public_base_url` của Admin).
- **Cấu trúc URL:** `[public_base_url]/catalog?ref=[affiliate_code]`.
- **Hiển thị Mini Canvas:** Vẽ trực tiếp trên thẻ `<canvas>` bằng thư viện `qrcode` (size 72x72px, màu `#0F2C59`, nền trắng).
- **Xem QR phóng to:** Tái sử dụng component `QRModal.tsx` đã hoàn thiện ở phân hệ C1.
- **Tải ảnh PNG:** Tên file tự động định dạng `QR-CATALOG-[Mã_CTV].png`.
- **Kiểm soát khi SUSPENDED:** Khối QR và nút tải ảnh bị ẩn hoàn toàn khi tài khoản ở trạng thái `SUSPENDED`.

---

## III. GHI NHẬN ĐỀ XUẤT C6.6A — TOP 5 CTV NỔI BẬT

- **Đề xuất C6.6A:** Hiển thị khối Bảng xếp hạng Top 5 CTV có thành tích tuyển sinh xuất sắc trong tháng.
- **Trạng thái:** **Ghi nhận đặc tả cho giai đoạn sau**, chưa triển khai trong bước C6.3 để tập trung hoàn thiện luồng dữ liệu cá nhân cốt lõi của CTV.

---

## IV. KẾT QUẢ KIỂM TRA NGHIỆM THU

1. **Hiển thị và dữ liệu thật:**
   - 4 Card kết quả hiển thị khớp 100% với response `GET /api/v1/affiliate/dashboard/summary`.
   - CTV chưa có lead hiển thị đúng số 0 (không bị nháy số mẫu).
   - CTV có lead hiển thị chính xác lượt đăng ký, chưa nhập học, đã nhập học và hồ sơ đối chiếu hợp lệ.
2. **Khả năng quét và Tải QR:**
   - Quét QR trên banner hoặc mở modal QR dẫn đúng đến URL `/catalog?ref=[Mã_CTV]`.
   - Tải file PNG hoạt động mượt mà, ảnh sắc nét và quét được ngay.
3. **Phân quyền và Trạng thái tài khoản:**
   - Tài khoản `ACTIVE`: Hiển thị đầy đủ QR, các nút thao tác nhanh và 4 card kết quả.
   - Tài khoản `SUSPENDED`: Ẩn khối QR và nút tải QR, hiển thị khung cảnh báo lý do tạm ngưng cùng hotline/email hỗ trợ.
4. **Chất lượng mã nguồn:**
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.

---
*Hoàn tất bước C6.3. Sẵn sàng cho bước C6.4 (Card Thù lao CTV).*
