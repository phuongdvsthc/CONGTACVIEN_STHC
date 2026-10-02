# BÁO CÁO KIỂM KÊ VÀ CHỐT ĐẶC TẢ MODULE KHÓA HỌC TRONG CỔNG CTV (C1.1)

- **Mã dự án:** `STHC-CTV-C1.1`
- **Phân hệ:** Cổng Cộng tác viên (Collaborator Portal) — Module Khóa học (`/portal/courses`)
- **Trạng thái:** Hoàn tất kiểm kê tĩnh, đối chiếu tài liệu và chốt đặc tả kỹ thuật / giao diện (Không sửa code, không chạy migration trong bước này).
- **Ngày lập báo cáo:** 01/10/2026

---

## 1. Danh Sách Tài Liệu Đã Đọc & Đối Chiếu

| STT | Tên Tài Liệu | Đường Dẫn | Phiên Bản | Nội Dung Trọng Tâm |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Tài liệu Thiết kế Kiến trúc Hệ thống CTV | `/docs/THIET_KE_HE_THONG_CTV_SAIGONTOURIST.md` | v1.1 | Quy tắc ghi nhận nguồn, chính sách thù lao 500k, phân quyền API gateway, chống tranh chấp lead. |
| 2 | Tài Liệu Dự Án (Project Note) | `/docs/PROJECT_NOTE.md` | Cập nhật liên tục | Tổng hợp các yêu cầu từ A0.1 đến A2.4, bảng ánh xạ trường hồ sơ CTV, quy tắc vòng đời khóa học. |
| 3 | Báo Cáo Kiểm Kê Khu Vực Quản Trị (A0.2) | `/docs/architecture/A0_2_ADMIN_INVENTORY.md` | STHC-CTV-A0.2 | Kiểm kê toàn bộ API, bảng CSDL, và giao diện quản trị Admin/Staff (A2 - Quản lý khóa học). |
| 4 | Thiết Kế Phân Quyền Staff/Admin (A0.3) | `/docs/architecture/A0_3_ADMIN_STAFF_ACCESS_DESIGN.md` | STHC-CTV-A0.3 | Cơ chế bảo vệ route, middleware xác thực, phân quyền role. |
| 5 | Kế Hoạch Migration CSDL | `/docs/DB_MIGRATION_PLAN.md` | v1.0 | Sơ đồ các bảng cốt lõi (`courses`, `leads`, `affiliate_profiles`, `rewards`). |
| 6 | Tài liệu Đồng bộ Auth & Profile & Admin Bootstrap | `/docs/DB_C_AUTH_PROFILE_SYNC_AND_ADMIN_BOOTSTRAP.md` | v1.0 | Quy trình đồng bộ tài khoản auth và profile, trigger xử lý metadata. |

### Phân biệt yêu cầu, chức năng, dữ liệu và đề xuất:
- **Yêu cầu trong tài liệu:** Cung cấp danh mục khóa học cho CTV đã được duyệt (`ACTIVE`) kèm liên kết tiếp thị (`referral_url`) và mã QR định danh riêng theo từng ngành đào tạo.
- **Chức năng đang chạy (Admin A2):** Admin và Staff đã có đầy đủ giao diện quản lý khóa học (`CourseListView`), chỉnh sửa thông tin, đặt section quyền lợi sinh viên tùy biến (`benefits_title`, `benefits_content`), quản lý vòng đời khóa học (`ACTIVE`, `STOPPED`, `DRAFT`), và chức năng "Xem khóa học" (A2.4).
- **Chức năng hiện tại ở Cổng CTV:** Route `/portal/courses` hiện tại hiển thị trang mẫu (Placeholder Page - "Đang phát triển"), chưa render danh sách khóa học thực tế của CTV.
- **Dữ liệu mẫu / Seed data:** 8 khóa học chuẩn của trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) đã được định nghĩa trong `/supabase/seed/seed_courses.sql` và backend `server.ts` (`INITIAL_COURSES`).

---

## 2. Kiểm Kê Mã Nguồn, API & Cơ Sở Dữ Liệu Khóa Học

### 2.1. Route, Page, Component & API
- **Route Frontend:** `/portal/courses` (được bảo vệ bởi `AffiliateLayout` và điều kiện tài khoản CTV `ACTIVE`).
- **Component hiện tại:** `AffiliatePlaceholderPage.tsx` (tạm thời hiển thị thông báo đang xây dựng).
- **API Backend hiện có:**
  - `GET /api/v1/affiliate/courses`: Lấy danh sách khóa học dành cho CTV đang đăng nhập. Yêu cầu middleware `requireActiveAffiliate` (kiểm tra `affiliate_profiles.status === 'ACTIVE'`). Tự động sinh `referral_url` dạng `${baseUrl}/?ref=${affiliate_code}&course=${slug}`.
  - `GET /api/v1/public/courses`: Lấy danh sách khóa học công khai cho khách vãng lai và form đăng ký tư vấn.

### 2.2. Bảng CSDL và Trường Dữ Liệu (`public.courses`)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc / Mặc Định | Ý Nghĩa Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Khóa chính định danh khóa học |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Mã khóa học (VD: `BEP-A-AU-TC`) |
| `title` | VARCHAR(255) | NOT NULL | Tên khóa học đầy đủ |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL | Chuỗi định danh URL thân thiện |
| `department` | VARCHAR(100) | NOT NULL | Khoa đào tạo (Khoa Bếp, Khoa Khách sạn, v.v.) |
| `degree_level` | VARCHAR(100) | NOT NULL | Hệ đào tạo / Văn bằng (Trung cấp, Sơ cấp, v.v.) |
| `duration_text` | VARCHAR(100) | NOT NULL | Thời lượng đào tạo (VD: 2 năm) |
| `tuition_fee_estimate` | NUMERIC(12,2) | NULL / DEFAULT 0 | Học phí dự kiến / niêm yết |
| `summary` | TEXT | NULL | Mô tả ngắn tóm tắt khóa học |
| `description_html` | TEXT | NULL | Nội dung chi tiết chương trình (HTML) |
| `benefits_title` | VARCHAR(255) | NULL | Tiêu đề section quyền lợi sinh viên tùy biến |
| `benefits_content` | TEXT | NULL | Nội dung chi tiết quyền lợi sinh viên |
| `is_active` | BOOLEAN | DEFAULT TRUE | Trạng thái công khai (true: Hiển thị, false: Nháp) |
| `accepts_referrals` | BOOLEAN | DEFAULT TRUE | Trạng thái tiếp nhận giới thiệu (true: Đang nhận, false: Ngừng nhận) |
| `sort_order` | INT | DEFAULT 0 | Thứ tự hiển thị danh sách |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo bản ghi |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật gần nhất |

---

## 3. Kiểm Kê Link Giới Thiệu & Mã QR

1. **Mã CTV & Cấu trúc Link:**
   - Mỗi CTV được cấp một `affiliate_code` duy nhất (VD: `STHCCTV1088`).
   - Link giới thiệu theo khóa học: `{Domain_Origin}/?ref={affiliate_code}&course={course_slug}`.
   - Không gán cứng tên miền (`baseUrl` được lấy động từ `req.headers.origin` hoặc `process.env.APP_URL`).
2. **Kiểm tra quyền ACTIVE ở Backend:**
   - Middleware `requireActiveAffiliate` chặn mọi yêu cầu API của CTV nếu `status !== 'ACTIVE'`.
   - Nếu CTV bị tạm dừng (`SUSPENDED`), API `GET /api/v1/affiliate/courses` trả về HTTP 403, không cho phép lấy link tiếp thị mới.
3. **Chính sách Link Cũ khi CTV bị tạm dừng:**
   - Link cũ của CTV bị tạm dừng vẫn mở được trang giới thiệu khóa học để ứng viên xem thông tin, nhưng nút "Đăng ký" bị vô hiệu hóa và API `POST /api/v1/public/leads` từ chối ghi nhận lead mới với mã lỗi `AFFILIATE_SUSPENDED`.
   - Bảo toàn 100% dữ liệu khách hàng cũ, lịch sử đối soát và thù lao đã ghi nhận.
4. **Cơ chế ghi nhận nguồn & Chống trùng (Attribution Policy):**
   - Khách bấm vào link gắn `?ref=...`, hệ thống lưu mã CTV vào `localStorage['sthc_affiliate_ref']` và cookie (thời hạn 30 ngày).
   - Khi khách gửi form tư vấn, hệ thống ghi nhận đúng `affiliate_id` tương ứng với mã CTV. Chống trùng trong 90 ngày theo tài liệu thiết kế hệ thống.

---

## 4. Chốt Đặc Tả Giao Diện Module Khóa Học Trong Cổng CTV (Cho các bước C1.2 — C1.6)

### 4.1. Màn Hình Danh Sách Khóa Học CTV (`/portal/courses`)
- **Tiêu đề & Tổng số:** Hiển thị tiêu đề "Khóa học tuyển sinh" và tổng số khóa học đang mở nhận giới thiệu.
- **Công cụ tìm kiếm & Lọc:**
  - Ô tìm kiếm theo tên khóa học hoặc mã khóa học.
  - Bộ lọc theo Khoa / Hệ đào tạo (`degree_level`).
  - Nút Tải lại (Refresh).
- **Danh sách dạng Thẻ (Card Grid):** Mỗi thẻ khóa học gồm:
  - Hình ảnh minh họa hoặc khung đại diện chuyên nghiệp.
  - Nhãn hệ đào tạo / Khoa.
  - Tên khóa học đầy đủ, nổi bật.
  - Thời gian đào tạo & Văn bằng nhận được.
  - Học phí niêm yết (khi có dữ liệu thật từ Admin A2).
  - Chính sách thưởng: **500.000 VNĐ / hồ sơ nhập học hợp lệ** (hiển thị rõ ràng theo quy chế hiện hành).
  - Khối thao tác nhanh:
    - Hiển thị Link giới thiệu cá nhân hóa.
    - Nút **"Sao chép link"** (có thông báo Toast thành công).
    - Nút **"Xem QR"** (mở modal hiển thị mã QR tiếp thị riêng cho khóa học đó kèm nút tải ảnh QR).
    - Nút **"Chi tiết"** (mở modal xem toàn bộ nội dung khóa học và tài liệu tuyển sinh).

### 4.2. Màn Hình / Modal Chi Tiết Khóa Học
- **Thông tin chi tiết:** Tên khóa học, mã, khoa, hệ đào tạo, thời lượng, học phí, mô tả chi tiết, và section quyền lợi sinh viên tùy biến (nếu có).
- **Khối "Link giới thiệu của bạn":** Hiển thị link đầy đủ, nút sao chép nhanh, và hình ảnh mã QR định danh kèm nút tải xuống.
- **Tài liệu tuyển sinh:** Các tài liệu giới thiệu hoặc thông tin hướng dẫn tuyển sinh đính kèm (nếu có cấu hình).
- **Nguyên tắc tuân thủ:**
  - Sử dụng dữ liệu thật đồng bộ từ cơ sở dữ liệu chung với Admin A2.
  - CTV chỉ xem các khóa học có `is_active = true` và `accepts_referrals = true`.
  - Không tự ý tạo khách hàng thay cho ứng viên.
  - Tuyệt đối không sao chép phần trăm hoa hồng, điểm thưởng hay cấp bậc từ các ảnh mẫu bên ngoài; tuân thủ chính sách cố định 500.000 VNĐ/hồ sơ nhập học hợp lệ.

---

## 5. Phạm Vi Các Bước Tiếp Theo (C1.2 đến C1.6) & Sự Phụ Thuộc

| Bước | Tên Bước | Nội Dung Triển Khai | Sự Phụ Thuộc / Điều Kiện Tiên Quyết |
| :---: | :--- | :--- | :--- |
| **C1.2** | Xây dựng danh sách khóa học dạng thẻ | Thay thế `AffiliatePlaceholderPage` bằng component danh sách thẻ khóa học thật gọi API `GET /api/v1/affiliate/courses`. | Đã hoàn thành kiểm kê C1.1 |
| **C1.3** | Tích hợp Link giới thiệu & QR theo khóa | Xây dựng tính năng sinh link động, sao chép và hiển thị Modal QR tiếp thị cho từng khóa. | Phụ thuộc C1.2 |
| **C1.4** | Tích hợp Modal xem chi tiết khóa học | Xây dựng modal chi tiết khóa học, hiển thị thông tin đầy đủ và section quyền lợi sinh viên. | Phụ thuộc C1.2 |
| **C1.5** | Xử lý trạng thái khóa học ngừng / tạm dừng | Xử lý giao diện khi khóa học `STOPPED` hoặc CTV `SUSPENDED` (cảnh báo, vô hiệu hóa link/đăng ký). | Phụ thuộc C1.3, C1.4 |
| **C1.6** | Kiểm thử toàn diện & Nghiệm thu C1 | Kiểm thử toàn bộ luồng từ C1.2 đến C1.5, kiểm tra TypeScript, linter, build production, cập nhật PROJECT_NOTE. | Phụ thuộc hoàn tất C1.2 - C1.5 |

*Lưu ý trong C1.1:* Không sửa code chức năng, không chạy migration, seed hoặc thay đổi dữ liệu. Báo cáo kiểm kê được lưu tại file này.
