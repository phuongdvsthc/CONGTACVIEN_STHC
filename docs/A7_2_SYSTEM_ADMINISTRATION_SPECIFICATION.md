# ĐẶC TẢ CHI TIẾT MODULE QUẢN TRỊ HỆ THỐNG (A7.2)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_2_SYSTEM_ADMINISTRATION_SPECIFICATION.md`  
**Ngày chốt đặc tả**: Tháng 10/2026  
**Trạng thái**: Đã chốt đặc tả kỹ thuật (Chỉ thiết kế và tài liệu hóa, chưa triển khai mã nguồn hay thay đổi CSDL).

---

## 1. Phạm Vi Và Phần Ngoài Phạm Vi

### 1.1. Phạm vi của Module Quản trị hệ thống (A7)
Module “Quản trị hệ thống” là phân hệ trung tâm dành riêng cho Quản trị viên cấp cao (**Admin**), được định tuyến chính thức tại:
- **Đường dẫn (Route)**: `/admin/system-settings`
- **Vị trí điều hướng**:
  - Menu **“Quản trị hệ thống”** nằm ở vị trí cuối cùng trong danh sách thanh điều hướng bên trái (Sidebar) của cổng Admin.
  - Lối tắt truy cập nhanh trong menu thả xuống của tài khoản (Account Dropdown Menu), đặt ngay giữa mục **“Đổi mật khẩu”** và mục **“Đăng xuất”**.
  - Cả hai vị trí điều hướng trên **chỉ hiển thị duy nhất** khi người dùng có vai trò `profiles.role === 'admin'`. Tuyệt đối không kiểm tra bằng danh sách email hardcode.

Phân hệ A7 bao gồm 6 nhóm tính năng quản trị độc lập:
1. **Nhận diện backend**: Cấu hình tên hệ thống, tên viết tắt, tên đơn vị đào tạo, Logo backend, Favicon backend dùng chung cho layout Admin, Staff và Cổng CTV.
2. **Thông tin vận hành**: URL công khai chính thức của cổng, email hỗ trợ, số điện thoại hotline tiếp nhận hỗ trợ, múi giờ hệ thống (`Asia/Ho_Chi_Minh`).
3. **Quy chế và đăng ký CTV**: Quản lý kho tài liệu văn bản Quy chế tuyển sinh & bảo vệ dữ liệu (PDF đa phiên bản), ngày hiệu lực, kích hoạt tài liệu đang áp dụng, ghi nhận lịch sử đồng ý của CTV, công tắc bật/tắt tiếp nhận đăng ký CTV toàn hệ thống kèm thông báo khi đóng.
4. **Mã cộng tác viên**: Cấu hình tiền tố mã mặc định (`STHCCTV`), độ dài tối thiểu hậu tố số (mặc định 6 chữ số), bộ cấp mã tự động tăng nguyên tử chống xung đột, màn hình xem trước định dạng mã tiếp theo và thống kê số liệu chỉ đọc.
5. **Lịch sử cấu hình và khôi phục**: Ghi nhận vết kiểm toán chi tiết theo từng nhóm cấu hình (người sửa, thời điểm, giá trị trước/sau), cơ chế khôi phục (Rollback) an toàn.
6. **Sao lưu và phục hồi dữ liệu**: Trong phạm vi A7, mục này được thiết kế ở chế độ **“Chưa triển khai”** (hiển thị thông tin định hướng và lộ trình, không tạo thao tác chạy hoặc nút bấm giả mạo).

### 1.2. Phần ngoài phạm vi (Out of Scope)
- **Cấu hình trang chủ công khai (A6)**: Giao diện Landing page dành cho ứng viên/khách vãng lai, banner hero, khẩu hiệu tuyển sinh, các khối nội dung tiếp tục được quản lý độc lập tại Module A6 (`/admin/homepage`). A7 không can thiệp hoặc ghi đè bảng `homepage_config`.
- **Quản lý danh mục khóa học (A2)**: Các thông số ngành nghề, hệ đào tạo, học phí, học liệu tuyển sinh thuộc quyền quản trị của Module A2 (`/admin/courses`).
- **Quản lý tài khoản nhân viên (A0.3)**: Việc phân công, thu hồi quyền `staff`/`admin` và cấp tài khoản nhân sự được duy trì tại route `/admin/staff-accounts` (A0.3). A7 chỉ kiểm tra quyền `role === 'admin'` của phiên đăng nhập hiện tại, không thay thế màn hình quản lý nhân sự.
- **Nghiệp vụ đối chiếu (A4) và Thù lao (A5)**: Toàn bộ quy tắc tính thưởng 500k, ghép mã hồ sơ nhập học, hủy đối soát, chi trả thù lao không thuộc phạm vi xử lý của A7.
- **Thực thi sao lưu/phục hồi hạ tầng**: Quản trị backup máy chủ vật lý, snapshot CSDL cấp Cloud provider thuộc phạm vi nghiên cứu tương lai (A7.9–A7.13).

---

## 2. Đính Chính Và Điểm Chưa Xác Minh Từ Báo Cáo A7.1

Qua rà soát chi tiết mã nguồn, trigger và cơ sở dữ liệu ở bước A7.2, các phát hiện trong tài liệu A7.1 được đính chính và làm rõ như sau:

| STT | Nội dung tại A7.1 | Đính chính kỹ thuật chính xác tại A7.2 | Nguồn bằng chứng mã nguồn |
| :--- | :--- | :--- | :--- |
| **1** | Mô tả cơ chế cấp mã là *"ngẫu nhiên hoặc sequence đơn giản"*. | **Thực tế:** Hệ thống hiện tại **hoàn toàn không dùng Sequence**, mà sử dụng hàm PL/pgSQL `public.generate_unique_affiliate_code()` chạy vòng lặp ngẫu nhiên 4 chữ số (`1000 + RANDOM() * 9000`), kiểm tra `SELECT EXISTS(...)`. Hàm này được gọi tự động bởi trigger `trg_on_auth_user_created` (gọi hàm `public.handle_new_auth_user()`) khi `auth.users` được tạo từ API `POST /api/v1/auth/register`. | `/supabase/migrations/20260929000003_auth_profile_sync.sql` (dòng 23-52, 110) và `server.ts` (dòng 816, 874). |
| **2** | Nhắc đến *"RLS/Unique constraint đảm bảo tính duy nhất"*. | **Đính chính:** RLS (Row Level Security) chỉ có nhiệm vụ **phân quyền đọc/ghi**, tuyệt đối **không** có chức năng đảm bảo tính duy nhất. Tính duy nhất của mã CTV được bảo đảm 100% bởi ràng buộc toàn vẹn CSDL **Unique Constraint** (`affiliate_code VARCHAR(50) NOT NULL UNIQUE`). | `/supabase/migrations/20260929000001_initial_schema.sql` (dòng 65). |
| **3** | Đánh giá điều kiện sao lưu từ việc đọc migration. | **Đính chính:** Việc tồn tại các file migration trong kho mã nguồn chỉ thể hiện thiết kế cấu trúc CSDL; **chưa xác minh** được trạng thái snapshot thực tế, chính sách lưu giữ WAL, và khả năng phục hồi Point-In-Time (PITR) trên hạ tầng production của Supabase Cloud. | Đánh dấu: **Chưa xác minh từ hạ tầng**. |
| **4** | Phân quyền truy cập cấu hình hệ thống. | **Làm rõ:** Cán bộ tuyển sinh (**Staff**) **bị chặn hoàn toàn** việc truy cập màn hình `/admin/system-settings` và các API quản trị A7. Staff/CTV chỉ được cấp quyền đọc một tập con an toàn (Allowlist) các trường nhận diện và vận hành phục vụ hiển thị giao diện. | Đặc tả quyền truy cập tại Mục 7. |
| **5** | Đánh dấu mức độ xác minh. | Toàn bộ các kết luận dựa trên script SQL trong thư mục `/supabase/migrations/` được chuẩn hóa thành **“Xác minh từ migration”**, phân biệt rạch ròi với dữ liệu thực tế trên môi trường production. | Quy chuẩn tài liệu A7.2. |
| **6** | Nhầm lẫn ranh giới tài khoản nhân viên. | Phân hệ Tài khoản nhân viên có định tuyến hiện hữu là `/admin/staff-accounts` thuộc thiết kế A0.3, giữ nguyên ranh giới độc lập với A7. | `src/config/navConfig.ts` (dòng 132-140). |

---

## 3. Bố Cục Màn Hình Quản Trị Hệ Thống (`/admin/system-settings`)

Màn hình được xây dựng trên bố cục chuẩn của Cổng quản trị STHC (`AppLayout.tsx`), chia thành 6 khối giao diện thẻ (Cards) độc lập. Mỗi thẻ có tiêu đề, mô tả, nút **“Lưu thay đổi”** và **“Hủy / Đặt lại”** riêng biệt cho từng nhóm nhằm ngăn chặn việc gửi dữ liệu chéo.

```
+---------------------------------------------------------------------------------------------------+
| BREADCRUMB: Quản trị hệ thống / Cài đặt hệ thống                                                  |
| TIÊU ĐỀ: Cài Đặt & Cấu Hình Hệ Thống                                                             |
| MÔ TẢ: Quản lý nhận diện cổng quản trị, thông tin vận hành, quy chế tuyển sinh và quy tắc cấp mã    |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 1: NHẬN DIỆN BACKEND ] -----------------------------------------------------------------------+
| Tên hệ thống: [ Cổng Đại sứ & Cộng tác viên Tuyển sinh                                          ] |
| Tên viết tắt: [ STHC_CTV             ]   Tên đơn vị: [ Trường Trung cấp Du lịch & Khách sạn...  ] |
| Logo Backend: [ Khung upload / Xem trước ảnh ] (PNG/JPG/WebP, tối đa 2MB)                         |
| Favicon:      [ Khung upload / Xem trước icon ] (PNG/ICO, tối đa 512KB)                           |
| KHUNG XEM TRƯỚC BỘ NHẬN DIỆN (LIVE PREVIEW):                                                      |
|   +---------------------------------------+   +-----------------------------------------------+   |
|   | [Logo] STHC - CỔNG QUẢN TRỊ (Mở rộng) |   | [Logo] (Thu gọn)                              |   |
|   +---------------------------------------+   +-----------------------------------------------+   |
|                                                          [ Hủy thay đổi ]  [ Lưu nhóm Nhận diện ] |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 2: THÔNG TIN VẬN HÀNH ] ----------------------------------------------------------------------+
| URL công khai chính thức: [ https://ctv.sthc.edu.vn                                             ] |
| Email hỗ trợ tuyển sinh:   [ tuyensinh@sthc.edu.vn                                               ] |
| Số điện thoại hotline:    [ 0901 234 567                                                        ] |
| Múi giờ hệ thống:         [ Asia/Ho_Chi_Minh (UTC+07:00) - Mặc định                             ] |
|                                                          [ Hủy thay đổi ]  [ Lưu nhóm Vận hành ]  |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 3: QUY CHẾ & TIẾP NHẬN ĐĂNG KÝ CTV ] --------------------------------------------------------+
| Tiếp nhận đăng ký CTV: [ (x) Bật / ( ) Tắt ]                                                      |
| Thông báo khi đóng:    [ Hệ thống tạm ngưng tiếp nhận đăng ký CTV mới...                        ] |
|                                                                                                   |
| DANH SÁCH CÁC PHIÊN BẢN QUY CHẾ (PDF):                     [ + Tải lên văn bản quy chế mới (PDF) ]|
| +------------+---------------------------+----------------+---------------+---------------------+ |
| | Mã PB      | Tên văn bản               | Ngày hiệu lực  | Trạng thái    | Thao tác            | |
| +------------+---------------------------+----------------+---------------+---------------------+ |
| | QC-2026-01 | Quy chế CTV & Bảo vệ DLCN | 01/01/2026     | ĐANG ÁP DỤNG  | [Xem PDF] [Chi tiết]| |
| | QC-2025-02 | Quy chế CTV cũ (Hết hạn)  | 01/06/2025     | ĐÃ THAY THẾ   | [Xem PDF]           | |
| +------------+---------------------------+----------------+---------------+---------------------+ |
|                                                          [ Hủy thay đổi ]  [ Lưu nhóm Quy chế ]   |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 4: CẤU HÌNH BỘ CẤP MÃ CỘNG TÁC VIÊN ] -------------------------------------------------------+
| Tiền tố mã CTV:      [ STHCCTV             ] (Chỉ chữ in hoa A-Z và số 0-9)                      |
| Độ dài tối thiểu:    [ 6 số                ] (Mặc định 6 chữ số: 000001 -> 999999)               |
|                                                                                                   |
| XEM TRƯỚC ĐỊNH DẠNG MÃ (LIVE PREVIEW): [ STHCCTV000045 ]                                          |
|                                                                                                   |
| THỐNG KÊ BỘ CẤP MÃ (CHỈ ĐỌC):                                                                     |
| • Số thứ tự tiếp theo dự kiến: 45                                                                 |
| • Tổng số mã CTV đã phát hành theo sổ: 44                                                        |
| • Trạng thái Sequence CSDL: Đang hoạt động bình thường                                            |
|                                                          [ Hủy thay đổi ]  [ Lưu nhóm Mã CTV ]    |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 5: LỊCH SỬ CẤU HÌNH & KHÔI PHỤC ] -----------------------------------------------------------+
| Bảng nhật ký thay đổi cấu hình hệ thống:                                                          |
| +---------------------+--------------+----------------------+--------------------+--------------+ |
| | Thời điểm           | Nhóm cấu hình| Người thực hiện      | Thao tác           | Khôi phục    | |
| +---------------------+--------------+----------------------+--------------------+--------------+ |
| | 05/10/2026 10:15:00 | Vận hành     | admin@sthc.edu.vn    | Cập nhật hotline   | [Khôi phục]  | |
| | 01/10/2026 08:30:20 | Quy chế      | admin@sthc.edu.vn    | Áp dụng QC-2026-01 | [Khôi phục]  | |
| +---------------------+--------------+----------------------+--------------------+--------------+ |
+---------------------------------------------------------------------------------------------------+

[ KHỐI 6: SAO LƯU VÀ PHỤC HỒI DỮ LIỆU (ĐỊNH HƯỚNG TƯƠNG LAI) ] -------------------------------------+
| [Badge: CHƯA TRIỂN KHAI TRÊN GIAO DIỆN]                                                           |
| Tính năng sao lưu và phục hồi dữ liệu tự động được lên lịch phát triển tại phân kỳ A7.9-A7.13.    |
| Hiện tại, toàn bộ dữ liệu CSDL và Storage được bảo vệ theo cơ chế Snapshot hạ tầng của Supabase.  |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Đặc Tả Trường Dữ Liệu Và Quy Tắc Xác Thực (Validation)

### 4.1. Nhóm 1: Nhận diện Backend
- `system_name`: Chuỗi ký tự, độ dài 3 – 150 ký tự, bắt buộc nhập. Không chứa mã HTML/Script độc hại.
- `system_short_name`: Chuỗi ký tự, độ dài 2 – 50 ký tự, bắt buộc nhập. Thường dùng hiển thị ở header thu gọn (ví dụ: `STHC_CTV`).
- `unit_name`: Chuỗi ký tự, độ dài 5 – 255 ký tự, bắt buộc nhập (ví dụ: `TRƯỜNG TRUNG CẤP DU LỊCH & KHÁCH SẠN SAIGONTOURIST`).
- **Logo Backend**:
  - Định dạng cho phép: `.png`, `.jpg`, `.jpeg`, `.webp`.
  - Dung lượng tối đa: 2 MB.
  - Kiểm tra an toàn: Backend kiểm tra Header Magic Bytes (`89 50 4E 47` cho PNG, `FF D8 FF` cho JPG, `52 49 46 46` cho WebP); từ chối file nếu chỉ đổi đuôi tệp.
  - Hiển thị: Chiều cao chuẩn 40px – 48px trên header/sidebar, giữ nguyên tỷ lệ gốc (`object-contain`).
  - Fallback: Nếu không có ảnh hoặc lỗi tải ảnh, hiển thị khung icon mặc định với biểu tượng `GraduationCap` nền xanh navy.
- **Favicon Backend**:
  - Định dạng cho phép: `.png`, `.ico`.
  - Dung lượng tối đa: 512 KB.
  - Quy tắc đồng bộ: Khi người dùng chuyển qua lại giữa các route công khai (`/`, `/courses`, `/login`) và portal nội bộ (`/admin/*`, `/portal/*`), hook frontend cập nhật thẻ `<link rel="icon">` và `<title>` của trình duyệt để đảm bảo hiển thị đúng nhận diện tương ứng, không bị giữ nhầm icon cũ.
- **Phạm vi hiệu lực**: Chỉ áp dụng cho layout Admin, Staff, Cổng CTV và tiêu đề trang tương ứng. Tuyệt đối **không tự động thay đổi** cấu hình nhận diện của trang chủ A6.

### 4.2. Nhóm 2: Thông tin vận hành
- `public_base_url`:
  - Định dạng: Bắt buộc là URL gốc HTTPS hợp lệ (ví dụ: `https://ctv.sthc.edu.vn`).
  - Quy tắc làm sạch: Tự động loại bỏ dấu gạch chéo cuối cùng (`/`), loại bỏ khoảng trắng thừa.
  - Ràng buộc: Không chứa đường dẫn con (`/path`), query string (`?ref=...`), fragment (`#...`) hoặc thông tin đăng nhập (`user:pass@`).
  - Mục đích sử dụng: Làm tiền tố chuẩn để tạo đường dẫn giới thiệu tuyển sinh và mã QR cho khóa học mới. Không sửa đường dẫn của các mã CTV hay link đã phát hành trước đó.
  - **Lưu ý hạ tầng**: Đổi trường này chỉ cập nhật chuỗi sinh link trên ứng dụng, không tự động cấu hình DNS, chứng chỉ SSL, hay biến môi trường Supabase Auth Site URL. Đặc tả ghi rõ các dịch vụ hạ tầng cần cấu hình đồng bộ khi đổi tên miền:
    1. Cấu hình bản ghi DNS (CNAME / A Record) trỏ về Render / Cloud Run.
    2. Cấu hình Custom Domain trên dịch vụ lưu trữ backend/frontend.
    3. Cập nhật `Site URL` và `Additional Redirect URLs` trong bảng điều khiển Supabase Auth.
- `support_email`: Định dạng Email chuẩn RFC 5322 (ví dụ: `tuyensinh@sthc.edu.vn`). Bắt buộc nhập.
- `support_phone`: Số điện thoại liên hệ, định dạng 10 chữ số chuẩn Việt Nam (bắt đầu bằng `0` hoặc `84`), tự động chuẩn hóa dấu cách hiển thị (ví dụ: `0901 234 567`). Bắt buộc nhập.
- `timezone`: Mặc định cố định là `Asia/Ho_Chi_Minh` (UTC+07:00). Toàn bộ dữ liệu thời gian trong CSDL tiếp tục lưu trữ theo chuẩn `TIMESTAMPTZ` (UTC); múi giờ này được dùng làm căn cứ diễn giải và định dạng ngày giờ hiển thị trên giao diện người dùng.

### 4.3. Nhóm 3: Quy chế tuyển sinh & Đăng ký CTV
- `allow_affiliate_registration`: Kiểu BOOLEAN, mặc định `TRUE`.
  - **Điều kiện bật**: Chỉ cho phép chuyển sang `TRUE` khi hệ thống có **ít nhất một phiên bản quy chế đang ở trạng thái `ACTIVE`** kèm tệp PDF hợp lệ tồn tại trên Storage.
  - **Khi tắt (`FALSE`)**: Cổng đăng ký CTV bị khóa trên cả frontend và backend. Mọi nỗ lực gọi API `POST /api/v1/auth/register` sẽ bị từ chối với HTTP 403. Các tài khoản CTV đã đăng ký trước đó vẫn được phép đăng nhập, xác thực email và hoạt động bình thường.
- `registration_closed_message`: Chuỗi văn bản hiển thị trên trang đăng ký khi `allow_affiliate_registration === false` (ví dụ: *"Cổng tiếp nhận đăng ký Cộng tác viên hiện đang tạm đóng. Quý thầy cô và anh chị vui lòng quay lại sau."*).
- **Văn bản quy chế (PDF)**:
  - `version_code`: Chuỗi ký tự duy nhất, định dạng chuẩn `QC-YYYY-XX` (ví dụ: `QC-2026-01`), không được chứa ký tự đặc biệt.
  - `title`: Tên tài liệu đầy đủ (ví dụ: `Quy chế hoạt động Cộng tác viên Tuyển sinh & Bảo vệ dữ liệu cá nhân năm 2026`).
  - Tệp PDF đính kèm: Dung lượng tối đa 10 MB, mime-type `application/pdf`, kiểm tra chữ ký file `%PDF-`.
  - `effective_date`: Ngày bắt đầu có hiệu lực (kiểu `TIMESTAMPTZ`). Khi Admin áp dụng thủ công, thời điểm hiệu lực không được nằm trong tương lai so với thời điểm máy chủ.
  - Trạng thái phiên bản: `DRAFT` (Bản nháp), `ACTIVE` (Đang áp dụng), `SUPERSEDED` (Đã bị thay thế).
  - **Quy tắc bất biến (Immutability)**: Một khi phiên bản quy chế đã được chuyển sang `ACTIVE` hoặc đã có ít nhất một CTV nhấn đồng ý, nội dung và tệp PDF của phiên bản đó **tuyệt đối không được sửa đổi hoặc xóa**. Mọi sự điều chỉnh chính sách phải được tạo dưới dạng phiên bản quy chế mới (`DRAFT` -> `ACTIVE`).

### 4.4. Nhóm 4: Cấu hình Mã Cộng tác viên
- `affiliate_code_prefix`: Chuỗi ký tự tiền tố, mặc định là `STHCCTV`.
  - Quy tắc xác thực: Bắt buộc chỉ bao gồm chữ in hoa `A-Z` và số `0-9`, độ dài từ 3 đến 20 ký tự. Hệ thống tự động chuyển đổi chữ thường thành chữ in hoa (`toUpperCase()`).
- `affiliate_code_min_digits`: Số nguyên dương, mặc định là `6` (tương ứng với dải số từ `000001` đến `999999`). Khoảng giá trị cho phép Admin thiết lập: từ `4` đến `12`.
- **Quy tắc đệm số (Zero-padding)**:
  - Sử dụng hàm đệm số không làm cắt cụt giá trị: `LPAD(counter::TEXT, GREATEST(min_digits, LENGTH(counter::TEXT)), '0')`.
  - Khi bộ đếm vượt qua ngưỡng 6 chữ số (ví dụ từ `999999` tăng lên `1000000`), chuỗi mã sinh ra sẽ là `STHCCTV1000000`, **tuyệt đối không bị cắt cụt** về 6 ký tự.
- **Quy tắc bất biến của bộ đếm**:
  - Admin không được phép chỉnh sửa hoặc hạ thấp số thứ tự bộ đếm từ giao diện người dùng.
  - Việc thay đổi tiền tố hoặc độ dài tối thiểu chỉ áp dụng cho các CTV đăng ký mới sau thời điểm lưu cấu hình. Toàn bộ mã CTV cũ đã phát hành được giữ nguyên vẹn 100%.

---

## 5. Quy Trình Nghiệp Vụ, Xử Lý Lỗi Và Xung Đột Đồng Thời

### 5.1. Luồng lưu cấu hình và kiểm soát xung đột (Optimistic Concurrency Control)
Để ngăn chặn tình trạng hai Quản trị viên sửa cấu hình cùng một lúc ghi đè dữ liệu của nhau:
1. Khi mở màn hình A7, frontend tải dữ liệu kèm theo số phiên bản sửa đổi hiện tại (`revision`, ví dụ: `revision = 5`).
2. Khi Admin nhấn nút "Lưu thay đổi" của một nhóm, payload gửi lên backend gồm có dữ liệu mới và `expected_revision = 5`.
3. Backend mở một Transaction CSDL:
   - Thực hiện truy vấn kiểm tra: `SELECT revision FROM public.system_settings WHERE id = 1 FOR UPDATE`.
   - Nếu `current_revision !== expected_revision`, backend lập tức ROLLBACK transaction và trả về lỗi HTTP 409 Conflict:
     `{ success: false, error: 'Dữ liệu cấu hình đã được cập nhật bởi một quản trị viên khác. Vui lòng tải lại trang để xem thông tin mới nhất.', code: 'CONFIG_VERSION_CONFLICT' }`.
   - Nếu `current_revision === expected_revision`, backend cập nhật dữ liệu của nhóm, tăng `revision = revision + 1`, ghi log vào bảng `system_settings_history`, và COMMIT transaction.

### 5.2. Luồng đăng ký CTV và ghi nhận đồng ý quy chế nguyên tử
1. **Khách mở form đăng ký**:
   - Giao diện lấy thông tin quy chế đang áp dụng từ API công khai `GET /api/v1/public/active-regulation` (trả về `id`, `version_code`, `title`, `effective_date`, `pdf_url`).
   - Người dùng bấm vào link để đọc file PDF, sau đó tích chọn checkbox: *"Tôi đã đọc và đồng ý với [Tên quy chế]"*.
2. **Khách bấm "Gửi đăng ký"**:
   - Client gửi payload lên `POST /api/v1/auth/register` bao gồm thông tin cá nhân và `regulation_id`.
3. **Backend xác thực nghiệp vụ trước khi gọi Supabase Auth**:
   - Kiểm tra `allow_affiliate_registration === true`. Nếu `false`, trả về HTTP 403 (`REGISTRATION_CLOSED`).
   - Kiểm tra `regulation_id` gửi lên có khớp chính xác với phiên bản quy chế đang `ACTIVE` trong CSDL hay không. Nếu không khớp (do Admin vừa đổi quy chế trong lúc khách đang xem), trả về HTTP 400 (`REGULATION_OUTDATED`) kèm thông báo yêu cầu tải lại và xác nhận quy chế mới.
4. **Thực thi tạo tài khoản và sinh mã CTV nguyên tử**:
   - Gọi `supabaseAuth.auth.signUp()`.
   - Trigger CSDL kích hoạt hàm cấp mã nguyên tử từ Sequence PostgreSQL: `new_code := prefix || LPAD(nextval('seq_affiliate_code_counter')::TEXT, min_digits, '0')`.
   - Tạo đồng thời bản ghi trong `public.affiliate_regulation_consents` ghi nhận: `affiliate_profile_id`, `regulation_id`, `consented_at = NOW()`, `client_ip`, `user_agent`.
   - Toàn bộ thao tác trên được gói trong một Transaction duy nhất. Nếu bất kỳ bước nào thất bại, hệ thống tự động ROLLBACK hoàn toàn, không tạo tài khoản mồ côi.

---

## 6. Thiết Kế Cơ Sở Dữ Liệu Và Lưu Trữ (Storage)

> **Nguyên tắc cốt lõi**: Tách biệt hoàn toàn Module A7 khỏi bảng `public.homepage_config` và `public.homepage_config_history` của A6. A7 sở hữu các bảng chuyên biệt sau:

### 6.1. Bảng `public.system_settings` (Cấu hình hệ thống hiện hành)
Bảng đơn dòng (Single-row table), chỉ chứa duy nhất bản ghi có `id = 1`.

```sql
CREATE TABLE IF NOT EXISTS public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CONSTRAINT chk_single_row CHECK (id = 1),
    
    -- Nhóm 1: Nhận diện Backend
    system_name VARCHAR(150) NOT NULL DEFAULT 'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC',
    system_short_name VARCHAR(50) NOT NULL DEFAULT 'STHC_CTV',
    unit_name VARCHAR(255) NOT NULL DEFAULT 'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
    logo_backend_url TEXT NULL,
    favicon_url TEXT NULL,
    
    -- Nhóm 2: Thông tin vận hành
    public_base_url VARCHAR(255) NOT NULL DEFAULT 'https://ctv.sthc.edu.vn',
    support_email VARCHAR(255) NOT NULL DEFAULT 'tuyensinh@sthc.edu.vn',
    support_phone VARCHAR(20) NOT NULL DEFAULT '0901234567',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    
    -- Nhóm 3: Tiếp nhận đăng ký CTV
    allow_affiliate_registration BOOLEAN NOT NULL DEFAULT TRUE,
    registration_closed_message TEXT NULL DEFAULT 'Hệ thống hiện đang tạm ngưng tiếp nhận hồ sơ cộng tác viên mới.',
    
    -- Nhóm 4: Cấu hình mã CTV
    affiliate_code_prefix VARCHAR(20) NOT NULL DEFAULT 'STHCCTV',
    affiliate_code_min_digits INTEGER NOT NULL DEFAULT 6 CONSTRAINT chk_min_digits CHECK (affiliate_code_min_digits BETWEEN 4 AND 12),
    
    -- Phiên bản và kiểm toán
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);
```

### 6.2. Bảng `public.system_settings_history` (Nhật ký lịch sử cấu hình)
Lưu vết chi tiết từng lần thay đổi theo nhóm chức năng, hỗ trợ đối soát và khôi phục.

```sql
CREATE TABLE IF NOT EXISTS public.system_settings_history (
    id BIGSERIAL PRIMARY KEY,
    setting_group VARCHAR(50) NOT NULL CONSTRAINT chk_group CHECK (setting_group IN ('BRANDING', 'OPERATION', 'REGISTRATION', 'AFFILIATE_CODE', 'ROLLBACK')),
    revision INTEGER NOT NULL,
    previous_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_settings_history_group ON public.system_settings_history(setting_group);
CREATE INDEX IF NOT EXISTS idx_settings_history_changed_at ON public.system_settings_history(changed_at DESC);
```

### 6.3. Bảng `public.system_regulations` (Danh mục phiên bản văn bản quy chế)
```sql
CREATE TABLE IF NOT EXISTS public.system_regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    pdf_storage_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CONSTRAINT chk_reg_status CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ NULL
);

-- Đảm bảo chỉ có tối đa 1 bản ghi ở trạng thái ACTIVE tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_active_regulation 
    ON public.system_regulations (status) 
    WHERE status = 'ACTIVE';
```

### 6.4. Bảng `public.affiliate_regulation_consents` (Sổ ghi nhận đồng ý quy chế)
Lưu trữ liên kết độc lập giữa hồ sơ CTV và phiên bản quy chế mà CTV đã đồng ý tại thời điểm đăng ký.

```sql
CREATE TABLE IF NOT EXISTS public.affiliate_regulation_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_profile_id UUID NOT NULL REFERENCES public.affiliate_profiles(id) ON DELETE RESTRICT,
    regulation_id UUID NOT NULL REFERENCES public.system_regulations(id) ON DELETE RESTRICT,
    consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip VARCHAR(64) NULL,
    user_agent TEXT NULL,
    CONSTRAINT uq_affiliate_regulation_consent UNIQUE (affiliate_profile_id, regulation_id)
);

CREATE INDEX IF NOT EXISTS idx_consents_affiliate_id ON public.affiliate_regulation_consents(affiliate_profile_id);
CREATE INDEX IF NOT EXISTS idx_consents_regulation_id ON public.affiliate_regulation_consents(regulation_id);
```

### 6.5. Sequence & Bảng `public.affiliate_code_registry` (Bộ cấp mã và sổ mã CTV)
```sql
-- Sequence số thứ tự tự tăng đơn điệu
CREATE SEQUENCE IF NOT EXISTS public.seq_affiliate_code_counter
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Sổ lưu vết mã đã phát hành (bảo toàn ngay cả khi xóa hồ sơ CTV)
CREATE TABLE IF NOT EXISTS public.affiliate_code_registry (
    affiliate_code VARCHAR(50) PRIMARY KEY,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sequence_number BIGINT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.6. Cấu trúc Storage Bucket
- **Tên Bucket**: `system-assets` (Chế độ Private Bucket, có phân quyền truy cập).
- **Cấu trúc thư mục**:
  - `/branding/`: Chứa file `backend_logo_*` và `favicon_*`. Cấp URL đọc có cache lâu dài (Public CDN read).
  - `/regulations/`: Chứa các file PDF quy chế (`regulation_QC-2026-01_*.pdf`).
- **Quyền đọc tệp**:
  - Tệp quy chế đang ở trạng thái `ACTIVE`: Cho phép tải/đọc công khai qua proxy backend hoặc token tạm thời.
  - Tệp quy chế `DRAFT` hoặc `SUPERSEDED`: Chỉ cho phép Quản trị viên (`role = 'admin'`) hoặc CTV đã có bản ghi đồng ý tại `affiliate_regulation_consents` truy cập thông qua Signed URL có thời hạn (15 phút).
- **Quy tắc dọn rác (Orphan Cleanup)**: Định kỳ quét các tệp tải lên trong bucket `system-assets` sau 24 giờ mà không được liên kết với bất kỳ bản ghi hợp lệ nào trong `system_settings` hoặc `system_regulations` để giải phóng dung lượng.

---

## 7. Hợp Đồng API (API Contracts) Và Ma Trận Phân Quyền (RBAC)

### 7.1. Danh sách Endpoints

| Phương thức | Đường dẫn API | Mô tả chức năng | Quyền hạn yêu cầu | Mã phản hồi HTTP |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/system-settings` | Lấy toàn bộ cấu hình hệ thống và thống kê bộ cấp mã | Chỉ Quản trị viên (`admin`) | 200, 401, 403 |
| `PUT` | `/api/v1/admin/system-settings/:group` | Cập nhật cấu hình của 1 nhóm (`branding`, `operation`, `registration`, `affiliate_code`) kèm kiểm tra `expected_revision` | Chỉ Quản trị viên (`admin`) | 200, 400, 401, 403, 409 |
| `POST` | `/api/v1/admin/system-settings/upload-asset` | Tải lên Logo, Favicon hoặc File PDF quy chế | Chỉ Quản trị viên (`admin`) | 200, 400, 401, 403, 413 |
| `GET` | `/api/v1/admin/system-regulations` | Danh sách toàn bộ các phiên bản quy chế (nháp, active, đã thay thế) | Chỉ Quản trị viên (`admin`) | 200, 401, 403 |
| `POST` | `/api/v1/admin/system-regulations` | Tạo mới phiên bản quy chế nháp (`DRAFT`) | Chỉ Quản trị viên (`admin`) | 201, 400, 401, 403 |
| `POST` | `/api/v1/admin/system-regulations/:id/apply` | Kích hoạt phiên bản quy chế thành `ACTIVE` (chuyển bản cũ sang `SUPERSEDED`) | Chỉ Quản trị viên (`admin`) | 200, 400, 401, 403, 404 |
| `GET` | `/api/v1/admin/system-settings/history` | Lấy danh sách nhật ký thay đổi cấu hình | Chỉ Quản trị viên (`admin`) | 200, 401, 403 |
| `POST` | `/api/v1/admin/system-settings/rollback` | Khôi phục cấu hình một nhóm về một revision lịch sử | Chỉ Quản trị viên (`admin`) | 200, 400, 401, 403, 409 |
| `GET` | `/api/v1/public/system-info` | Lấy tập thông tin nhận diện & hotline cho phép hiển thị trên UI | Công khai (`public`, `staff`, `affiliate`) | 200 |
| `GET` | `/api/v1/public/active-regulation` | Lấy thông tin metadata và URL tải file PDF quy chế đang áp dụng | Công khai (`public`, `staff`, `affiliate`) | 200, 404 |

### 7.2. Chi tiết Request & Response cho các Endpoints trọng yếu

#### 1. `PUT /api/v1/admin/system-settings/:group`
- **Request Body**:
  ```json
  {
    "expected_revision": 4,
    "data": {
      "support_email": "tuyensinh_hotline@sthc.edu.vn",
      "support_phone": "0908889999"
    },
    "reason": "Cập nhật số hotline tuyển sinh đợt mới"
  }
  ```
- **Response Success (200)**:
  ```json
  {
    "success": true,
    "message": "Cập nhật nhóm thông tin vận hành thành công.",
    "new_revision": 5,
    "data": { ... }
  }
  ```
- **Response Conflict (409)**:
  ```json
  {
    "success": false,
    "error": "Cấu hình đã được sửa đổi bởi một quản trị viên khác. Vui lòng tải lại trang để nhận dữ liệu mới nhất.",
    "code": "CONFIG_VERSION_CONFLICT",
    "current_revision": 5
  }
  ```

#### 2. `GET /api/v1/public/system-info` (Allowlist cho giao diện)
- **Response Success (200)**:
  ```json
  {
    "success": true,
    "data": {
      "system_name": "Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC",
      "system_short_name": "STHC_CTV",
      "unit_name": "Trường Trung cấp Du lịch & Khách sạn Saigontourist",
      "logo_backend_url": "https://.../logo.png",
      "favicon_url": "https://.../favicon.ico",
      "public_base_url": "https://ctv.sthc.edu.vn",
      "support_email": "tuyensinh@sthc.edu.vn",
      "support_phone": "0901234567",
      "allow_affiliate_registration": true,
      "registration_closed_message": null
    }
  }
  ```
  *(Tuyệt đối không để lộ các thông tin: `revision`, `affiliate_code_prefix`, `affiliate_code_min_digits`, danh sách bản nháp quy chế, hay thông tin người cập nhật).*

### 7.3. Ma Trận Phân Quyền (RBAC Matrix)

| Vai trò người dùng | Truy cập route `/admin/system-settings` | Đọc toàn bộ cấu hình & Lịch sử | Lưu cấu hình & Upload asset | Xem PDF quy chế ACTIVE | Xem PDF quy chế DRAFT/Cũ | Đọc Allowlist `/public/system-info` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Quản trị viên (`admin`)** | **CHO PHÉP** | **CHO PHÉP** | **CHO PHÉP** | **CHO PHÉP** | **CHO PHÉP** | **CHO PHÉP** |
| **Cán bộ tuyển sinh (`staff`)** | **CHẶN (403)** | **CHẶN (403)** | **CHẶN (403)** | **CHO PHÉP** | **CHẶN (403)** | **CHO PHÉP** |
| **Cộng tác viên (`affiliate`)** | **CHẶN (403)** | **CHẶN (403)** | **CHẶN (403)** | **CHO PHÉP** | **CHẶN (Trừ bản đã đồng ý)** | **CHO PHÉP** |
| **Khách vãng lai (`public`)** | **CHẶN (401)** | **CHẶN (401)** | **CHẶN (401)** | **CHO PHÉP** | **CHẶN (401)** | **CHO PHÉP** |

> **Bảo mật Service-Role**: Mọi API backend sử dụng Supabase Service-Role Key để ghi dữ liệu bắt buộc phải chạy qua middleware kiểm tra xác thực người gọi (`requireAdmin`). Vì Service-Role bỏ qua mọi chính sách RLS, việc thiếu kiểm tra tầng API sẽ tạo lỗ hổng bảo mật nghiêm trọng.

---

## 8. Cơ Chế Lịch Sử, Cache Và Khôi Phục Cấu Hình (Rollback)

### 8.1. Cơ chế lưu vết kiểm toán (Audit Trail)
- Mỗi lần lưu thành công một nhóm cấu hình, hệ thống tự động ghi 1 bản ghi vào bảng `public.system_settings_history` trong **cùng transaction** với lệnh cập nhật `system_settings`.
- Dữ liệu lưu vết gồm: `changed_by` (ID của Admin trích xuất từ phiên đăng nhập), `changed_at` (thời điểm máy chủ `NOW()`), `previous_data` (ảnh chụp JSONB dữ liệu trước khi sửa), `new_data` (ảnh chụp JSONB dữ liệu sau khi sửa), và lý do thay đổi nếu có.
- Giao diện người dùng **không cung cấp bất kỳ nút nào để sửa hoặc xóa** các dòng trong bảng lịch sử.

### 8.2. Cơ chế Khôi phục cấu hình (Rollback)
- Thao tác khôi phục được thực hiện theo từng nhóm cấu hình:
  - Admin chọn một phiên bản lịch sử mong muốn và bấm "Khôi phục nhóm này".
  - Backend lấy `previous_data` từ bản ghi lịch sử tương ứng, xác thực lại tính hợp lệ của dữ liệu trước khi áp dụng.
  - Thao tác khôi phục **tạo ra một revision mới** (ví dụ từ revision 6 khôi phục về giá trị revision 3 sẽ tạo thành revision 7), hoàn toàn không xóa hay can thiệp vào các dòng lịch sử trước đó.
- **Danh sách cho phép khôi phục (Allowlist fields)**:
  - *Nhóm Nhận diện & Vận hành*: Khôi phục toàn bộ các trường text và URL ảnh sau khi kiểm tra tệp ảnh vẫn còn tồn tại trên Storage.
  - *Nhóm Tiếp nhận đăng ký*: Chỉ cho phép khôi phục trạng thái `allow_affiliate_registration = TRUE` nếu tại thời điểm khôi phục đang có ít nhất một văn bản quy chế `ACTIVE` hợp lệ.
  - *Nhóm Mã CTV*: Chỉ khôi phục tiền tố và độ dài tối thiểu; **tuyệt đối không khôi phục hoặc lùi số thứ tự bộ đếm Sequence**.
  - *Nhóm Quy chế*: Không dùng nút rollback trực tiếp để đổi quy chế; Admin phải thực hiện thao tác kích hoạt lại (`apply`) phiên bản quy chế mong muốn để sinh log kiểm toán rõ ràng.

### 8.3. Chiến lược Cache và Vô hiệu hóa Cache (Cache Invalidation)
- Backend duy trì in-memory cache cho endpoint `GET /api/v1/public/system-info` với thời gian sống TTL = 5 phút để giảm tải truy vấn cho CSDL.
- Khi có bất kỳ thao tác cập nhật hoặc khôi phục cấu hình thành công, cache này **lập tức bị xóa (evict/invalidate)** để đảm bảo lần gọi tiếp theo sẽ đọc dữ liệu mới nhất từ CSDL.
- Phía Client: Khi chuyển đổi giữa các màn hình hoặc tải lại trang, client gọi API lấy cấu hình cập nhật. Hệ thống không sử dụng WebSocket realtime phức tạp cho cấu hình tĩnh để tránh lãng phí tài nguyên.

---

## 9. Kế Hoạch Chuyển Đổi Dữ Liệu Cũ (Legacy Migration Plan)

### 9.1. Bảo toàn 100% mã CTV cũ và liên kết đã phát hành
- Toàn bộ các mã CTV đã phát hành trước đây (ví dụ: `STHCCTV1088`, `STHCCTV9001`, `STHCCTV9005`, v.v.) và các đường dẫn tiếp thị / mã QR liên kết với mã này **được giữ nguyên vẹn 100%**.
- Các bảng liên quan (`affiliate_profiles`, `leads`, `lead_reconciliations`, `rewards`) tiếp tục tra cứu và đối soát dựa trên chuỗi `affiliate_code` thực tế đã lưu trong CSDL, không phụ thuộc vào tiền tố hay độ dài đang cấu hình trong A7.

### 9.2. Khởi tạo Sequence bộ cấp mã an toàn
Để tránh việc cấp lại các mã đã tồn tại hoặc mã có cùng hậu số nhưng khác số 0 đệm:
1. Chạy truy vấn phân tích số hậu tố lớn nhất hiện có:
   ```sql
   SELECT MAX(
       NULLIF(regexp_replace(affiliate_code, '^[A-Za-z]+', ''), '')::BIGINT
   ) AS max_existing_suffix
   FROM public.affiliate_profiles;
   ```
2. Giả sử số hậu tố lớn nhất tìm được là `9005`. Vì chuẩn mới quy định độ dài tối thiểu 6 chữ số (từ `000001` đến `999999`), để tuyệt đối không trùng lặp và không gây nhầm lẫn:
   - Khởi tạo giá trị bắt đầu của Sequence `seq_affiliate_code_counter` tại mốc an toàn: `START WITH 10001` (hoặc mốc `100001` nếu muốn bắt đầu ngay từ dải 6 chữ số).
   - Thiết lập giá trị khởi tạo: `SELECT setval('public.seq_affiliate_code_counter', GREATEST(10000, COALESCE(max_existing_suffix, 0) + 1));`.
3. Đồng bộ toàn bộ các mã CTV hiện hữu vào bảng sổ lưu vết `public.affiliate_code_registry` để bảo toàn lịch sử tra cứu vĩnh viễn.

### 9.3. Xử lý hồ sơ CTV cũ chưa có bản ghi đồng ý quy chế
- Các hồ sơ CTV đăng ký trước thời điểm triển khai A7.2 chưa có liên kết với phiên bản quy chế PDF cụ thể.
- **Nguyên tắc minh bạch**: Hệ thống ghi nhận trạng thái đồng ý của các hồ sơ này là **“Chưa ghi nhận”**, tuyệt đối **không tự ý tạo bản ghi đồng ý giả mạo** hoặc tự điền phiên bản quy chế mới vào hồ sơ cũ.
- Trong các đợt cập nhật chính sách tiếp theo, hệ thống có thể hiển thị một biểu ngữ hoặc cửa sổ thông báo yêu cầu CTV xem và ký xác nhận phiên bản quy chế mới khi họ đăng nhập vào Cổng CTV.

---

## 10. Ma Trận Tình Huống Kiểm Thử Nghiệm Thu (Acceptance Test Matrix)

| Mã ca test | Tình huống kiểm thử | Dữ liệu đầu vào / Thao tác thực hiện | Kết quả mong đợi |
| :---: | :--- | :--- | :--- |
| **TC-01** | Kiểm tra phân quyền truy cập URL A7 | Người dùng vai trò `staff` hoặc `affiliate` truy cập trực tiếp URL `/admin/system-settings`. | Bị chặn ngay lập tức, chuyển hướng về trang thông báo từ chối truy cập (HTTP 403 Forbidden). Không hiển thị giao diện hay dữ liệu cấu hình. |
| **TC-02** | Kiểm tra phân quyền API đọc cấu hình | Gửi request `GET /api/v1/admin/system-settings` với token của `staff`. | Backend trả về mã lỗi HTTP 403 Forbidden: `Quyền truy cập bị từ chối. Chỉ Quản trị viên mới có quyền thực hiện thao tác này.`. |
| **TC-03** | Cách ly nhận diện A7 với A6 | Admin cập nhật Logo Backend và tên hệ thống trong A7. | Logo Backend tại Sidebar/Header của Admin/Staff/CTV đổi mới; Logo và Banner trên trang chủ công khai (A6) giữ nguyên không bị ảnh hưởng. |
| **TC-04** | Kiểm tra upload sai định dạng tệp | Tải lên file ảnh `.exe` hoặc `.pdf` đổi đuôi thành `.png` vào ô Logo Backend. | Backend phát hiện sai Header Magic Bytes, từ chối lưu và trả về HTTP 400: `Tệp tải lên không phải là định dạng hình ảnh hợp lệ (PNG, JPG, WebP).`. |
| **TC-05** | Kiểm tra upload vượt quá dung lượng | Tải lên file PDF quy chế có dung lượng 12 MB (> 10 MB). | Backend từ chối với HTTP 413 Payload Too Large kèm thông báo lỗi rõ ràng bằng tiếng Việt. |
| **TC-06** | Xử lý xung đột ghi đồng thời (409) | Hai Admin mở cùng lúc revision 3. Admin A lưu trước (thành rev 4). Admin B bấm lưu với expected_revision = 3. | Yêu cầu của Admin B bị từ chối với HTTP 409 Conflict. Hiển thị thông báo yêu cầu Admin B tải lại trang; dữ liệu của Admin A được bảo toàn. |
| **TC-07** | Khóa đăng ký khi tắt tiếp nhận | Admin chuyển `allow_affiliate_registration = false`. Khách vãng lai bấm nút đăng ký trên Landing page. | Form đăng ký hiển thị thông báo tạm đóng. API `POST /api/v1/auth/register` trả về HTTP 403. Tài khoản cũ đăng nhập bình thường. |
| **TC-08** | Chặn bật đăng ký khi thiếu quy chế | Hệ thống chưa có văn bản quy chế nào ở trạng thái `ACTIVE`. Admin cố gắng bật `allow_affiliate_registration = true`. | Hệ thống từ chối lưu và hiển thị cảnh báo: `Không thể mở tiếp nhận đăng ký khi chưa có văn bản quy chế nào đang áp dụng.`. |
| **TC-09** | Xử lý đổi quy chế khi đang điền form | Khách mở form lúc đang áp dụng QC-01. Admin kích hoạt QC-02. Khách bấm gửi form với ID của QC-01. | Backend từ chối tạo tài khoản với HTTP 400 `REGULATION_OUTDATED`, yêu cầu khách hàng xem và xác nhận lại văn bản quy chế mới vừa ban hành. |
| **TC-10** | Cấp mã nguyên tử khi đăng ký đồng thời | Mô phỏng 50 yêu cầu đăng ký tài khoản CTV gửi đồng thời trong cùng 1 giây. | Toàn bộ 50 tài khoản được tạo thành công với 50 mã CTV tăng dần liên tục, **không có bất kỳ mã nào bị trùng lặp**. |
| **TC-11** | Cấp mã vượt ngưỡng 6 chữ số | Bộ đếm Sequence đạt giá trị `1000000`. Hệ thống thực hiện cấp mã mới. | Mã sinh ra là `STHCCTV1000000` (đầy đủ 7 chữ số), tuyệt đối không bị cắt cụt về 6 ký tự. |
| **TC-12** | Đổi tiền tố mã CTV | Admin đổi tiền tố từ `STHCCTV` sang `STHCEDU`. | Các CTV cũ giữ nguyên mã `STHCCTV...`. CTV đăng ký mới nhận mã `STHCEDU...`. Các link giới thiệu cũ vẫn hoạt động và ghi nhận lead chuẩn xác. |
| **TC-13** | Rollback cấu hình không lùi bộ đếm | Admin thực hiện khôi phục cấu hình nhóm Mã CTV về phiên bản cũ. | Tiền tố và độ dài tối thiểu được khôi phục; giá trị bộ đếm Sequence tiếp tục tăng đơn điệu, không bị lùi về số cũ. |
| **TC-14** | Thất bại ở bước Auth không sinh tài khoản | Mô phỏng lỗi kết nối Supabase Auth khi đăng ký. | Toàn bộ transaction bị rollback; không có bản ghi mồ côi nào được tạo trong `profiles` hay `affiliate_regulation_consents`. |
| **TC-15** | Trạng thái nhóm Sao lưu & Phục hồi | Admin kiểm tra thẻ "Sao lưu & Phục hồi" trên giao diện A7. | Thẻ hiển thị rõ nhãn "Chưa triển khai", trình bày lộ trình A7.9-A7.13; không có nút bấm "Sao lưu ngay" hay báo cáo an toàn giả lập. |

---

## 11. Kế Hoạch Phân Kỳ Triển Khai

Quá trình hiện thực hóa module Quản trị hệ thống được phân kỳ chặt chẽ qua 6 bước tiếp theo:

### 11.1. Phân kỳ trực tiếp (A7.3 – A7.8)
- **A7.3 – CSDL, Sequence, Storage & RLS**:
  - Tạo file migration thiết lập các bảng `system_settings`, `system_settings_history`, `system_regulations`, `affiliate_regulation_consents`, `affiliate_code_registry`.
  - Khởi tạo Sequence `seq_affiliate_code_counter` và hàm PL/pgSQL cấp mã tự động an toàn.
  - Tạo bucket `system-assets` và thiết lập các chính sách bảo mật RLS tương ứng.
- **A7.4 – Backend API & Kiểm soát phân quyền**:
  - Xây dựng các router Express phục vụ đọc/ghi cấu hình, quản lý quy chế, upload tệp tin, kiểm soát revision và endpoint allowlist công khai.
  - Tích hợp middleware kiểm tra quyền Admin nghiêm ngặt.
- **A7.5 – Giao diện Quản trị hệ thống (`/admin/system-settings`)**:
  - Xây dựng view giao diện với 6 khối thẻ chức năng, form validation, preview live sidebar mở/thu gọn.
  - Bổ sung menu sidebar và lối tắt account dropdown cho Admin.
- **A7.6 – Đồng bộ luồng Đăng ký CTV & Ghi nhận quy chế**:
  - Nâng cấp modal đăng ký trên Landing page để tải động quy chế `ACTIVE`, kiểm tra trạng thái bật/tắt đăng ký, và ghi nhận đồng ý nguyên tử.
- **A7.7 – Lịch sử cấu hình & Chức năng khôi phục (Rollback)**:
  - Hoàn thiện giao diện xem nhật ký thay đổi và luồng khôi phục dữ liệu theo nhóm an toàn.
- **A7.8 – Kiểm thử tích hợp E2E & Nghiệm thu Module A7**:
  - Chạy toàn bộ 15 ca kiểm thử trong ma trận nghiệm thu, lập báo cáo nghiệm thu hoàn thành A7.

### 11.2. Định hướng phân kỳ tương lai (A7.9 – A7.13: Sao lưu & Phục hồi nâng cao)
- **A7.9**: Kiểm kê hạ tầng thực tế Supabase Cloud, đánh giá các chỉ số RPO (Recovery Point Objective) và RTO (Recovery Time Objective).
- **A7.10**: Thiết kế kiến trúc sao lưu độc lập (Cold storage sang Google Cloud Storage / AWS S3 có mã hóa AES-256).
- **A7.11**: Cơ chế chế độ bảo trì hệ thống (Maintenance Mode) và kịch bản khóa ghi dữ liệu để xuất bản snapshot CSDL nhất quán.
- **A7.12**: Thiết lập môi trường và quy trình diễn tập phục hồi thử nghiệm (Staging Disaster Recovery drill).
- **A7.13**: Ban hành Sổ tay Vận hành và Ứng phó sự cố khẩn cấp (Disaster Recovery Runbook) cho Ban Quản trị STHC.
