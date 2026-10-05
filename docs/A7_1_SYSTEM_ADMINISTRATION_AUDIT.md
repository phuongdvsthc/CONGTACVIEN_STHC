# BÁO CÁO KIỂM KÊ MODULE QUẢN TRỊ HỆ THỐNG (A7.1)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_1_SYSTEM_ADMINISTRATION_AUDIT.md`  
**Ngày kiểm kê**: Tháng 10/2026  
**Phạm vi thực hiện**: Kiểm kê toàn diện mã nguồn, CSDL, Storage, API, cấu hình nhận diện, quy chế, mã CTV và điều kiện sao lưu/phục hồi để chuẩn bị triển khai Module A7.2. **(Chỉ đọc và viết tài liệu báo cáo, không thay đổi mã nguồn hay CSDL).**

---

## 1. Tóm Tắt Hiện Trạng

Module **Quản trị hệ thống** (dự kiến định tuyến tại `/admin/system-settings`) là trung tâm cấu hình toàn cục của hệ thống STHC_CTV. Qua quá trình kiểm kê tĩnh mã nguồn frontend, backend server, các file migration Supabase và cơ sở dữ liệu hiện hữu:
- **Nhận diện & Cấu hình cơ bản**: Đã có cấu hình lưu trữ tại bảng `public.homepage_config` (phục vụ A6), nhưng chưa tách bạch hoàn toàn giữa nhận diện giao diện công khai (Landing Page) và Nhận diện Quản trị Backend (Admin/Staff/Portal Layout).
- **Quy chế & Đăng ký CTV**: Đã tích hợp link quy chế và checkbox đồng ý dạng văn bản tĩnh / placeholder tại `AffiliateRegisterModal.tsx` và `AffiliatePolicy.tsx`, tuy nhiên **chưa** có hệ thống quản lý phiên bản PDF quy chế, ngày hiệu lực, hay cơ chế lưu vết thời điểm và phiên bản quy chế mà từng CTV đã đồng ý. Chưa có công tắc bật/tắt tiếp nhận đăng ký CTV toàn hệ thống.
- **Mã CTV (`affiliate_code`)**: Hệ thống đang cấp mã theo định dạng `STHCCTVXXXX` (hoặc hậu tố tùy chỉnh/ngẫu nhiên). Các bảng và trigger đã đảm bảo tính duy nhất (`UNIQUE`), tuy nhiên chưa chuẩn hóa bộ đếm nguyên tử theo cấu hình tiền tố mặc định `STHCCTV` và độ dài tối thiểu 6 chữ số theo yêu cầu nâng cấp của A7.
- **Lịch sử cấu hình & Sao lưu**: Đã có bảng `public.homepage_config_history` cho cấu hình trang chủ (A6.4), nhưng các thiết lập hệ thống tổng quát chưa có bảng lịch sử phiên bản riêng. Về sao lưu/phục hồi dữ liệu, toàn bộ schema, RLS, functions và storage được quản lý qua các file migration chuẩn, nhưng tính sẵn sàng của hạ tầng backup phụ thuộc vào cấu hình dịch vụ Supabase Cloud (chưa xác minh chi tiết quyền quản trị hạ tầng vật lý ngoài ứng dụng).

---

## 2. Phạm Vi Kiểm Kê Và Nguồn Bằng Chứng

| Hạng mục kiểm kê | Nguồn bằng chứng (File / Bảng / API) | Mức xác minh |
| :--- | :--- | :--- |
| **Nhận diện & Giao diện chung** | `/src/components/common/Header.tsx`, `/src/components/common/AppLayout.tsx`, `/src/config/defaultLandingConfig.ts` | Đã xác minh qua mã nguồn |
| **Cấu hình Trang chủ & Banner** | Bảng `public.homepage_config`, bảng `public.homepage_config_history`, `/src/components/admin/AdminHomepageConfigView.tsx` | Đã xác minh qua DDL & Component |
| **Quy chế & Đăng ký CTV** | `/src/components/affiliate/AffiliateRegisterModal.tsx`, `/src/components/public/AffiliatePolicy.tsx` | Đã xác minh qua mã nguồn |
| **Cơ chế cấp mã CTV** | `/supabase/migrations/20260929000001_initial_schema.sql`, `server.ts` | Đã xác minh qua CSDL & API |
| **Phân quyền Admin/Staff/CTV** | `/supabase/migrations/20260929000002_permissions_and_rls.sql`, `server.ts` | Đã xác minh qua RLS & Middleware |
| **Storage & Upload Logo/Avatar** | Bảng buckets trong Supabase, `/supabase/migrations/20260930000006_create_storage_bucket.sql` | Đã xác minh qua DDL |
| **Sao lưu & Phục hồi hạ tầng** | Các file migration tại `/supabase/migrations/`, cấu hình `render.yaml`, `server.ts` | Kiểm kê điều kiện ứng dụng (Hạ tầng: Chưa xác minh) |

---

## 3. Bảng Kiểm Kê Theo Từng Nhóm Chức Năng A7

| Nhóm chức năng A7 | Hiện trạng thực tế | Bằng chứng mã nguồn / CSDL | Mức xác minh | Khoảng thiếu (Gaps) | Hướng xử lý (A7.2) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Nhận diện Backend & Hệ thống** | Logo, tên hệ thống, tên đơn vị, favicon được dùng chung qua `homepage_config` hoặc hardcode ở Header/Footer. | `AppLayout.tsx`, `Header.tsx`, `homepage_config` | Đã có nhưng thiếu tách bạch | Thiếu màn hình quản lý tập trung logo admin, tên viết tắt, favicon riêng cho Admin/Staff/CTV portal. | Xây dựng form Quản lý Nhận diện Backend tại `/admin/system-settings`. |
| **2. Thông tin vận hành** | URL công khai, email hỗ trợ, SĐT hỗ trợ, múi giờ (`Asia/Ho_Chi_Minh`) đang nằm rải rác ở `defaultLandingConfig.ts` và code cứng. | `defaultLandingConfig.ts`, `server.ts` | Đã có một phần | Chưa lưu trong bảng cấu hình hệ thống tổng quát; chưa có giao diện chỉnh sửa động. | Gom nhóm vào bảng `system_settings` hoặc mở rộng `homepage_config`. |
| **3. Quy chế & Đăng ký CTV** | Có link và checkbox quy chế tĩnh tại modal đăng ký. Chưa lưu phiên bản quy chế và chưa có công tắc tắt mở đăng ký. | `AffiliateRegisterModal.tsx`, `AffiliatePolicy.tsx` | Đã có nhưng thiếu | Thiếu bảng quản lý phiên bản PDF quy chế, ngày hiệu lực, ghi nhận đồng ý theo version, và công tắc bật/tắt đăng ký. | Bổ sung bảng quản lý quy chế phiên bản và flag `allow_affiliate_registration`. |
| **4. Mã CTV (`affiliate_code`)** | Cấp mã tự động (`STHCCTVXXXX`), duy nhất qua RLS/Unique constraint. Chưa chuẩn hóa tiền tố mặc định `STHCCTV` và độ dài tối thiểu 6 số. | `initial_schema.sql`, `server.ts` | Đã có hoạt động | Chưa có hàm sinh mã nguyên tử cấu hình được tiền tố và bộ đếm tối thiểu 6 chữ số (`STHCCTV000001`). | Xây dựng hàm PL/pgSQL cấp mã nguyên tử an toàn, không tái sử dụng, không lùi bộ đếm. |
| **5. Lịch sử cấu hình** | Có lịch sử phiên bản cho trang chủ (`homepage_config_history`), nhưng chưa có lịch sử cho cấu hình hệ thống chung. | `20261003000001_add_homepage_config_draft_publish_and_history.sql` | Đã có cho trang chủ | Thiếu bảng log lịch sử cấu hình hệ thống và cơ chế khôi phục phiên bản trước. | Mở rộng pattern lịch sử phiên bản cho cấu hình hệ thống. |
| **6. Sao lưu & Phục hồi dữ liệu** | Toàn bộ schema, RLS, functions, triggers và storage được định nghĩa rõ trong migration. Chưa có UI sao lưu/phục hồi. | `/supabase/migrations/` | Kiểm kê ứng dụng (Hạ tầng: Chưa xác minh) | Thiếu cơ chế test backup/restore tự động và chế độ khóa ghi bảo trì (Maintenance Mode). | Chỉ ghi nhận điều kiện hiện có; chưa phát triển tính năng backup thủ công trên giao diện. |

---

## 4. Bảng API, Dữ Liệu, Storage và Quyền Liên Quan

| Phân hệ / Tài nguyên | Tên bảng / Bucket / API Endpoint | Phương thức / Quyền hạn (RLS & Middleware) | Trạng thái hiện tại |
| :--- | :--- | :--- | :--- |
| **Cấu hình Trang chủ** | `public.homepage_config` | `SELECT` (Public), `ALL` (`requireAdmin` / `service_role`) | Đã hoạt động (A6) |
| **Lịch sử Cấu hình** | `public.homepage_config_history` | `SELECT` (Public), `ALL` (Admin/Service Role) | Đã hoạt động (A6.4) |
| **Hồ sơ Người dùng** | `public.profiles` | RLS theo `auth.uid()`, Middleware `requireStaffOrAdmin` | Đã hoạt động |
| **Hồ sơ CTV** | `public.affiliate_profiles` | RLS bảo vệ, API Admin (`/api/v1/admin/affiliates/*`) | Đã hoạt động (A1-A1.4) |
| **Storage (Logo / Assets)** | Bucket `homepage-assets`, `avatars` | Public read, Authenticated/Admin upload | Đã hoạt động |

---

## 5. Danh Sách Các Chuỗi Hardcode Cần Đưa Vào Cấu Hình Động

Trong quá trình kiểm kê mã nguồn, phát hiện các chuỗi và hằng số sau đang được hardcode tại nhiều component và cần được quy về cấu hình quản trị hệ thống (A7):
1. **Tên đơn vị & Hệ thống**: `"TRƯỜNG TRUNG CẤP DU LỊCH & KHÁCH SẠN SAIGONTOURIST"`, `"STHC"`, `"Cổng Đại sứ & Cộng tác viên Tuyển sinh"`.
2. **Thông tin liên hệ hỗ trợ**: Hotline tuyển sinh (`090...`), Email hỗ trợ (`tuyensinh@sthc.edu.vn`), Địa chỉ cơ sở đào tạo.
3. **Đường dẫn quy chế**: Link dẫn tới file quy chế (`/policy` hoặc static modal) chưa liên kết với hệ thống quản lý văn bản quy chế phiên bản.
4. **Tiền tố mã CTV**: Mặc định tiền tố `STHCCTV` đang được gán cứng trong logic sinh mã; cần cấu hình linh hoạt tiền tố và độ dài bộ đếm tối thiểu.

---

## 6. Kết Quả Kiểm Kê Quy Chế Và Đăng Ký CTV

- **Hiện trạng liên kết**: Tại `AffiliateRegisterModal.tsx`, checkbox đồng ý quy chế gắn với liên kết mở trang chính sách (`AffiliatePolicy.tsx`). Đây là văn bản tĩnh, chưa lưu thông tin phiên bản tài liệu (`regulation_version`), ngày hiệu lực (`effective_date`), và thời điểm khách đồng ý (`consent_timestamp`).
- **Khoảng thiếu**: 
  - Chưa có bảng lưu trữ danh mục tài liệu quy chế (cho phép Admin upload PDF phiên bản mới, cấu hình ngày áp dụng, kích hoạt văn bản đang hiệu lực).
  - Chưa lưu dấu vết (audit trail) cụ thể tài liệu phiên bản nào đã được CTV tích chọn đồng ý khi đăng ký.
  - Chưa có công tắc toàn cục (`allow_affiliate_registration BOOLEAN`) để Admin bật/tắt tạm thời việc tiếp nhận hồ sơ đăng ký mới của CTV khi cần bảo trì hoặc thay đổi chính sách.

---

## 7. Kết Quả Kiểm Kê Mã CTV Và Tác Động Chuyển Đổi

- **Hiện trạng cấp mã**: Hệ thống hiện tại cấp mã dựa trên định dạng `STHCCTVXXXX` (kết hợp chuỗi ngẫu nhiên hoặc sequence đơn giản).
- **Rủi ro khi tăng trưởng**: Nếu dùng phương pháp đếm số lượng bản ghi hiện tại + 1 (`COUNT(*) + 1`), khi có xóa hoặc lỗi đồng thời có thể gây trùng mã hoặc khuyết số không kiểm soát.
- **Yêu cầu kỹ thuật chuyển đổi sang định dạng chuẩn (`STHCCTV` + tối thiểu 6 chữ số, ví dụ `STHCCTV000001`)**:
  1. **Bảo toàn tuyệt đối mã cũ**: Các mã CTV đã phát hành (`STHCCTV1088`, v.v.) và các link giới thiệu / QR cũ không được thay đổi, giữ nguyên hiệu lực 100%.
  2. **Cấp mã nguyên tử**: Sử dụng Sequence trong PostgreSQL hoặc hàm PL/pgSQL với khóa độc quyền (`FOR UPDATE`) để sinh mã tiếp theo, tránh tuyệt đối tình trạng cấp trùng khi đăng ký đồng thời.
  3. **Không tái sử dụng mã**: Khi một CTV bị từ chối hoặc xóa, mã đã cấp không được cấp lại cho người khác.
  4. **Cho phép số thứ tự bị khuyết**: Đảm bảo tính liên tục của chuỗi số tăng dần mà không phụ thuộc vào số lượng bản ghi thực tế trong bảng.
  5. **Giới hạn độ dài**: Định dạng tối thiểu 6 chữ số (với padding số 0 bên trái, ví dụ `STHCCTV000045`), tiếp tục tăng khi vượt qua 6 chữ số mà không quay vòng.
  6. **Không cho phép Admin tùy ý lùi bộ đếm**: Đảm bảo không làm suy giảm hoặc trùng lặp mã đã phát hành.

---

## 8. Điều Kiện Sao Lưu Và Phục Hồi Dữ Liệu (Hiện Trạng)

- **CSDL & Schema**: Toàn bộ định nghĩa bảng, quan hệ khóa ngoại (`ON DELETE RESTRICT`), hàm PL/pgSQL, trigger, RLS policies và indexes được lưu trữ đầy đủ tại thư mục `/supabase/migrations/`.
- **Storage & Liên kết**: Các file ảnh, logo, tài liệu lưu trên Supabase Storage buckets, liên kết đường dẫn (`URL`) được lưu trong các bảng `profiles`, `courses`, `homepage_config`.
- **Supabase Auth**: Quản lý định danh người dùng tại schema `auth.users`, đồng bộ dữ liệu hồ sơ qua bảng `public.profiles`.
- **Đánh giá hạ tầng**: 
  - Tính năng sao lưu tự động và phục hồi điểm thời gian (PITR) thuộc hạ tầng quản lý của nhà cung cấp dịch vụ CSDL (Supabase Cloud).
  - *Chưa xác minh*: Cấu hình chi tiết lịch trình backup tự động và môi trường phục hồi độc lập do không có quyền truy cập trực tiếp vào control plane hạ tầng ngoài ứng dụng.
  - *Chính sách ứng dụng*: A7.1 ghi nhận điều kiện hiện có, **không** triển khai nút sao lưu/phục hồi giả mạo trên giao diện ứng dụng để tránh rủi ro bảo mật.

---

## 9. Ranh Giới Module A7 Với Các Module Khác

Để tránh chồng chéo chức năng, ranh giới phân định module A7 với các module hiện hữu được xác định rõ:
- **Với Module A6 (Quản lý Trang chủ)**: A6 quản lý nội dung hiển thị trên trang chủ công khai của cổng CTV (banner, giới thiệu, khối block). A7 quản lý cấu hình hệ thống chung (nhận diện backend, thông tin vận hành, quy chế, cấu hình mã CTV). Không sửa cùng một cấu hình ở cả hai nơi.
- **Với Module Quản lý Khóa học (A2)**: Danh mục khóa học thuộc quản lý của A2, không đưa vào cài đặt hệ thống của A7.
- **Với Quản lý Nhân viên (A0.3)**: Quản lý phân quyền tài khoản Admin/Staff thuộc về A0.3, A7 chỉ đọc và áp dụng phân quyền chứ không quản lý danh sách nhân sự.
- **Với Đối chiếu & Thù lao (A4, A5)**: Giữ nguyên vẹn logic nghiệp vụ tuyển sinh, không bị ảnh hưởng bởi thay đổi cấu hình hệ thống A7.

---

## 10. Khoảng Thiếu, Rủi Ro Thực Tế Và Điểm Chưa Xác Minh

1. **Khoảng thiếu chính**:
   - Thiếu bảng cơ sở dữ liệu `system_settings` lưu trữ tập trung các tham số vận hành, nhận diện backend và công tắc bật/tắt đăng ký.
   - Thiếu bảng quản lý phiên bản quy chế tuyển sinh (`system_regulations`).
   - Thiếu hàm sinh mã CTV nguyên tử chuẩn 6 chữ số (`STHCCTVXXXXXX`).
2. **Rủi ro thực tế**:
   - Nếu thay đổi tiền tố mã CTV mà không tương thích với các link giới thiệu cũ, hệ thống link cũ của hàng nghìn CTV sẽ bị hỏng. Do đó bắt buộc phải duy trì bộ định tuyến tương thích ngược với mọi định dạng mã cũ.
3. **Điểm chưa xác minh**:
   - Khả năng khôi phục Point-in-Time Recovery (PITR) thực tế trên môi trường production của hạ tầng Supabase ngoài tầm kiểm soát trực tiếp của ứng dụng (ghi nhận: *Chưa xác minh từ cấp hạ tầng*).

---

## 11. Đề Xuất Đầu Vào Cần Chốt Ở A7.2

Trước khi tiến hành hiện thực hóa mã nguồn ở A7.2, cần thống nhất các điểm sau:
1. **Schema CSDL cần bổ sung**:
   - Tạo bảng `public.system_settings` (hoặc mở rộng `homepage_config`) để lưu: `system_name`, `system_short_name`, `unit_name`, `logo_url`, `favicon_url`, `public_url`, `support_email`, `support_phone`, `timezone`, `allow_affiliate_registration`, `affiliate_code_prefix`, `affiliate_code_min_digits`.
   - Tạo bảng `public.system_regulations` quản lý các phiên bản quy chế (id, version_number, title, pdf_url, effective_date, is_active, created_at).
   - Bổ sung cột ghi nhận version quy chế đã đồng ý vào bảng `affiliate_profiles`.
2. **Hàm sinh mã CTV nguyên tử**:
   - Thống nhất cơ chế sequence hoặc hàm PL/pgSQL cấp mã `STHCCTV` + chuỗi số tối thiểu 6 chữ số không trùng lặp, không tái sử dụng.
3. **Phân quyền truy cập**:
   - Thống nhất route `/admin/system-settings` chỉ cho phép `role = 'admin'` truy cập và chỉnh sửa (Staff chỉ có quyền xem hoặc bị giới hạn một số cấu hình vận hành).
