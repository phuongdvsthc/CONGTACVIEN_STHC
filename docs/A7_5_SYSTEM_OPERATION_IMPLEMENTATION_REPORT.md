# BÁO CÁO TRIỂN KHAI THÔNG TIN VẬN HÀNH (A7.5)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_5_SYSTEM_OPERATION_IMPLEMENTATION_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH (PASS 100% KIỂM THỬ TỰ ĐỘNG)**

---

## 1. Tổng Quan & Phạm Vi Triển Khai A7.5

Bước **A7.5** hiện thực hóa phân hệ **Thông tin vận hành** thuộc Module Quản trị hệ thống (System Administration), kết nối chặt chẽ giữa CSDL Supabase, API nghiệp vụ nền tảng (A7.3), giao diện Quản trị viên (A7.4) và toàn bộ các chức năng tiếp thị tuyển sinh, sinh link định danh, mã QR và kênh liên hệ hỗ trợ trên Cổng CTV.

### 1.1. Phạm vi ĐÃ Hoàn Thành:
- **Giao diện Quản trị**: Bổ sung khối **“Thông tin vận hành”** độc lập nằm ngay bên dưới khối “Nhận diện backend” tại màn hình `/admin/system-settings`.
- **4 trường thông tin vận hành cốt lõi**:
  1. `public_base_url`: URL công khai chính thức của hệ thống (bắt buộc HTTPS, chỉ nhận URL gốc, chuẩn hóa loại bỏ trailing slash).
  2. `support_email`: Hộp thư điện tử liên hệ hỗ trợ tuyển sinh (chuẩn RFC 5322, liên kết `mailto:`).
  3. `support_phone`: Số điện thoại hotline tiếp nhận hỗ trợ (chuẩn hóa số di động và cố định Việt Nam, liên kết `tel:`).
  4. `timezone`: Múi giờ hệ thống (mặc định cố định `Asia/Ho_Chi_Minh` - UTC+07:00).
- **Kiểm soát phiên bản & Xung đột**:
  - Sử dụng cơ chế khóa lạc quan (Optimistic Concurrency Control) thông qua `expected_revision` chung của Singleton `system_settings`.
  - Hai form Nhận diện và Vận hành quản lý baseline và dirty state độc lập.
  - Khi lưu thành công một nhóm, số phiên bản `revision` mới được cập nhật cho toàn bộ màn hình, bảo toàn nguyên vẹn bản nháp đang nhập dở của nhóm còn lại.
  - Chặn đứng thao tác lưu đồng thời từ cùng màn hình.
  - Khi xảy ra xung đột phiên bản (HTTP 409 `CONFIG_VERSION_CONFLICT`), giữ nguyên dữ liệu đang nhập, cảnh báo banner và yêu cầu xác nhận trước khi nạp lại dữ liệu máy chủ.
- **Tính trung thực của dữ liệu & CSDL Supabase**:
  - Đọc và ghi trực tiếp vào cơ sở dữ liệu Supabase qua RPC nguyên tử `fn_save_system_settings_group`.
  - Chấm dứt tuyệt đối việc sử dụng JSON hay bộ nhớ tạm làm nguồn thay thế để báo thành công khi CSDL gặp lỗi.
  - Không tự ý seed email hoặc số điện thoại minh họa thành dữ liệu thật; hiển thị trạng thái chưa cấu hình và yêu cầu Admin thiết lập nếu dữ liệu trống.
- **Đồng bộ hóa Link tiếp thị & Mã QR**:
  - Tạo công cụ chuẩn `src/utils/referralLinkHelper.ts` sử dụng `public_base_url` đã xác nhận.
  - Đồng bộ 100% cấu trúc link khóa học: `/?ref=[mã CTV]&course=[mã khóa học]` và danh mục CTV: `/catalog?ref=[mã CTV]`.
  - Cùng một URL duy nhất được áp dụng cho: văn bản hiển thị, chức năng sao chép clipboard, xem trước QR canvas, tải ảnh QR về máy, và các kênh chia sẻ mạng xã hội (Zalo, Facebook, Email).
  - Bảo toàn tuyệt đối đường dẫn đăng ký chính thức của khóa học `official_registration_url` (thuộc A2 EGOV).
  - Khi chưa cấu hình URL công khai hợp lệ: chặn hoàn toàn việc tạo link/sao chép/tải QR và cung cấp nút thử lại, tuyệt đối không âm thầm fallback sang `window.location.origin` hay localhost.
- **Chuẩn hóa Định dạng Ngày giờ & Múi giờ**:
  - Timestamp giao dịch/hệ thống được diễn giải theo múi giờ `Asia/Ho_Chi_Minh` (UTC+07:00).
  - Ngày thuần (ngày sinh, ngày cấp CCCD) giữ nguyên định dạng lịch, không chuyển đổi múi giờ gây lệch ngày.

### 1.2. Giới hạn phạm vi (CHƯA triển khai theo đúng phân kỳ):
- Quản lý quy chế và tiếp nhận đăng ký CTV (`registration`) -> Phân kỳ A7.6.
- Cấu hình và bộ cấp mã CTV (`affiliate_code`) -> Phân kỳ A7.7.
- Giao diện lịch sử cấu hình & khôi phục (UI Rollback) -> Phân kỳ A7.8.
- Chức năng sao lưu & phục hồi dữ liệu (duy trì trạng thái định hướng trong tài liệu).

---

## 2. Thiết Kế Giao Diện & Trải Nghiệm Form Vận Hành

### 2.1. Vị trí & Bố cục Form
Form **Thông tin vận hành** được bố trí ở vị trí Card số 2, ngay dưới khối Nhận diện backend tại `/admin/system-settings`, tuân thủ thiết kế thẻ (Card) chuẩn của hệ thống:

```
+---------------------------------------------------------------------------------------------------+
| [ KHỐI 2: THÔNG TIN VẬN HÀNH ] ------------------------------------------------------------------+
| Tiêu đề: Thông tin vận hành                                                                      |
| Mô tả: URL công khai chính thức, thông tin liên hệ hỗ trợ và múi giờ hệ thống                    |
|                                                                                                   |
| [1] URL công khai chính thức (*):                                                                 |
|     [ https://ctv.sthc.edu.vn                                             ] [✓ HTTPS hợp lệ]     |
|     Ghi chú: URL này dùng để tạo link giới thiệu và QR. Khi đổi tên miền, cần cập nhật           |
|              cấu hình tên miền và xác thực email tương ứng.                                       |
|                                                                                                   |
| [2] Email hỗ trợ (*):                     | [3] Số điện thoại hỗ trợ (*):                        |
|     [ tuyensinh@sthc.edu.vn             ] |     [ 028 3844 6480                                ] |
|     Ghi chú: Địa chỉ liên hệ hỗ trợ       |     Ghi chú: Hotline tuyển sinh (hỗ trợ cố định/     |
|     tuyển sinh (mở qua mailto:).          |              di động VN, mở qua tel:).                |
|                                                                                                   |
| [4] Múi giờ hệ thống:                                                                             |
|     [ Việt Nam (UTC+07:00) (Asia/Ho_Chi_Minh)                 ] [🔒 Mặc định cố định]             |
|     Ghi chú: Múi giờ căn cứ định dạng ngày giờ hiển thị toàn hệ thống. Dữ liệu trong CSDL       |
|              tiếp tục lưu trữ theo chuẩn TIMESTAMPTZ (UTC).                                       |
|                                                                                                   |
| Chân form: [Trạng thái kiểm tra / Dirty state]              [ Hủy thay đổi ]  [ Lưu nhóm Vận hành ]|
+---------------------------------------------------------------------------------------------------+
```

### 2.2. Xử lý Trạng thái Độc lập & Concurrency
- `isBrandingDirty` và `isOperationDirty` được tách rời hoàn toàn:
  - Khi Admin sửa URL công khai, chỉ có nút "Lưu nhóm Vận hành" sáng lên, nút "Lưu nhóm Nhận diện" giữ nguyên trạng thái không đổi.
  - Khi nhấn "Hủy thay đổi" ở nhóm Vận hành, chỉ các trường vận hành được hoàn nguyên về baseline `serverSettings`, các trường nhận diện đang sửa dở được giữ nguyên vẹn.
- Khi một nhóm lưu thành công:
  - Máy chủ trả về cấu hình mới kèm `revision` tăng lên (ví dụ từ #12 lên #13).
  - Cả hai form cùng cập nhật tham chiếu `expected_revision = 13`.
  - Nhóm vừa lưu được cập nhật baseline mới (trở về clean state), nhóm còn lại vẫn giữ nguyên các giá trị đang chỉnh sửa (dirty state) và sẵn sàng lưu tiếp mà không bị xung đột revision.
- Ngăn chặn lưu đồng thời: Trong khi đang lưu nhóm Vận hành (`savingOperation = true`), nút lưu của nhóm Nhận diện tự động bị vô hiệu hóa (`disabled`) để tránh gửi đồng thời 2 request gây tranh chấp phiên bản CSDL.

---

## 3. Quy Chuẩn Validation & Chuẩn Hóa Dữ Liệu

Tất cả các trường dữ liệu đều được kiểm tra nghiêm ngặt 2 lớp (Client-side bằng `src/utils/operationValidation.ts` và Server-side bằng các hàm xử lý tại `server.ts`):

| Trường | Quy tắc xác thực | Quy tắc chuẩn hóa | Xử lý lỗi & Bảo mật |
|:---|:---|:---|:---|
| `public_base_url` | • Bắt buộc giao thức `https:`<br>• Phải là URL gốc (root domain)<br>• Cấm subpath (`/catalog`)<br>• Cấm query string (`?ref=...`)<br>• Cấm hash/fragment (`#sec`)<br>• Cấm credentials (`user:pass@`) | • Trim khoảng trắng<br>• Chuẩn hóa bỏ dấu `/` cuối<br>• Dùng `new URL()` parser chuẩn | • Từ chối HTTP 400 kèm thông báo rõ ràng<br>• **Chống SSRF**: Tuyệt đối không gửi request kiểm tra tới URL do người dùng nhập |
| `support_email` | • Bắt buộc nhập<br>• Định dạng email RFC 5322 chuẩn<br>• Tối đa 255 ký tự | • Trim khoảng trắng<br>• Chuyển chữ thường (lowercase) | • Là email liên hệ hiển thị, không phải tài khoản SMTP<br>• Không thêm trường mật khẩu/SMTP vào giao diện |
| `support_phone` | • Chấp nhận đầu số nội địa `0...`, quốc tế `+84...` hoặc `84...`<br>• Cho phép di động 10 số (`03`, `05`, `07`, `08`, `09`)<br>• Cho phép cố định 10-11 số (`02x`) | • Loại bỏ khoảng trắng, dấu chấm, dấu gạch ngang, ngoặc đơn<br>• Thay `+84`/`84` thành `0`<br>• Lưu chuỗi để bảo toàn số `0` đầu | • Chặn chuỗi chứa nhiều số máy hoặc số máy lẻ<br>• Hiển thị dạng nhóm thân thiện: `028 3844 6480`, `0901 234 567`<br>• Mở cuộc gọi chuẩn `tel:02838446480` |
| `timezone` | • Cố định `Asia/Ho_Chi_Minh` | • Giữ nguyên giá trị chuỗi IANA chuẩn | • Backend kiểm tra giá trị, từ chối mọi múi giờ lạ với HTTP 400<br>• CSDL lưu `TIMESTAMPTZ`, không cộng thủ công 7 giờ |

---

## 4. Đồng Bộ Hóa Link Tiếp Thị & Mã QR Tuyển Sinh

### 4.1. Cấu trúc Đường dẫn Chuẩn
- **Link giới thiệu Khóa học**:
  ```
  https://ctv.sthc.edu.vn/?ref=[MÃ_CTV]&course=[MÃ_HOẶC_SLUG_KHÓA]
  ```
  *Ví dụ*: `https://ctv.sthc.edu.vn/?ref=STHCCTV010088&course=CBMA-TC-01`
- **Link giới thiệu Toàn bộ Danh mục**:
  ```
  https://ctv.sthc.edu.vn/catalog?ref=[MÃ_CTV]
  ```
  *Ví dụ*: `https://ctv.sthc.edu.vn/catalog?ref=STHCCTV010088`

### 4.2. Nguyên tắc Đồng bộ Duy nhất (Single Source of Truth)
Cùng một chuỗi liên kết hoàn chỉnh được truyền vào và sử dụng đồng nhất tại 5 vị trí:
1. **Văn bản hiển thị**: Hộp văn bản font monospace `select-all` trên giao diện.
2. **Sao chép liên kết**: Nút "Chép link" ghi trực tiếp vào Clipboard với thông báo trực quan.
3. **Mã QR xem trước**: `QRCode.toCanvas` vẽ trực tiếp mã QR từ liên kết này.
4. **Tải ảnh QR**: Tạo tệp ảnh PNG với tên tệp chuẩn hóa `QR-[MÃ_KHÓA]-[MÃ_CTV].png`.
5. **Chia sẻ mạng xã hội**:
   - Zalo: `https://sp.zalo.me/plugins/share?dev=null&color=blue&oaid=&href=[ENCODED_URL]`
   - Facebook: `https://www.facebook.com/sharer/sharer.php?u=[ENCODED_URL]`
   - Email: `mailto:?subject=...&body=...[URL]...`

### 4.3. Bảo toàn Tuyệt đối `official_registration_url`
Khóa học trong hệ thống có trường `official_registration_url` dùng cho việc chuyển hướng đăng ký chính thức trên cổng EGOV của Nhà trường (theo đặc tả A2). Việc thay đổi `public_base_url` tại module Vận hành chỉ điều khiển việc sinh link tiếp thị của CTV, **hoàn toàn không sửa đổi hoặc ghi đè** `official_registration_url` của khóa học.

### 4.4. Xử lý An toàn Khi Chưa Cấu Hình Domain
Nếu hệ thống chưa cấu hình `public_base_url` hoặc cấu hình không hợp lệ:
- Các nút "Chép link", "QR", "Chia sẻ" tự động chuyển sang trạng thái vô hiệu hóa (`disabled`) kèm chú thích rõ ràng.
- Giao diện chi tiết khóa học hiển thị khối cảnh báo thân thiện và nút **“Thử lại”** (Refresh).
- Tuyệt đối không âm thầm tự sinh link bằng `window.location.origin`, `localhost` hoặc tên miền Render hardcode.

---

## 5. Danh Mục Tệp Tin Triển Khai & Chỉnh Sửa

| STT | Đường dẫn tệp tin | Thao tác | Mô tả chi tiết |
|:---:|:---|:---:|:---|
| 1 | `/src/utils/operationValidation.ts` | **Tạo mới** | Bộ hàm kiểm tra & chuẩn hóa dữ liệu vận hành: URL HTTPS gốc, email RFC 5322, số điện thoại cố định/di động VN, định dạng số hiển thị. |
| 2 | `/src/utils/referralLinkHelper.ts` | **Cập nhật** | Chuẩn hóa logic sinh link tiếp thị khóa học và danh mục CTV, bắt buộc HTTPS, chống subpath/query/hash. |
| 3 | `/src/contexts/SystemBrandingContext.tsx` | **Cập nhật** | Mở rộng context cung cấp `operation`, các helper sinh link `buildCourseUrl`, `buildCatalogUrl`, formatters, và alias `useSystemConfig`. |
| 4 | `/src/components/admin/AdminSystemSettingsView.tsx` | **Cập nhật** | Bổ sung Card 2 "Thông tin vận hành", quản lý dirty state độc lập, xử lý optimistic locking, đồng bộ revision toàn cục, và các card roadmap. |
| 5 | `/src/components/affiliate/AffiliateCourseListView.tsx` | **Cập nhật** | Bổ sung Banner link danh mục CTV (`/catalog?ref=...`), loại bỏ hoàn toàn `alert()`, hỗ trợ trạng thái disabled an toàn khi thiếu domain. |
| 6 | `/src/components/affiliate/AffiliateCourseDetailView.tsx` | **Cập nhật** | Loại bỏ thông báo chứa biến môi trường kỹ thuật nội bộ (`APP_BASE_URL`), bổ sung nút "Thử lại", chuẩn hóa chia sẻ và tải QR. |
| 7 | `/src/components/affiliate/AffiliateDashboard.tsx` | **Cập nhật** | Áp dụng `support_email` và `support_phone` động từ cấu hình hệ thống vào khối liên hệ hỗ trợ khi tài khoản bị tạm ngưng (`mailto:` và `tel:`). |
| 8 | `/server.ts` | **Cập nhật** | Chuẩn hóa số điện thoại mặc định, loại bỏ cơ chế companion JSON fallback báo thành công khi CSDL lỗi, đảm bảo 100% ghi vào Supabase. |
| 9 | `/scripts/verify_a7_5_system_operation.ts` | **Tạo mới** | Bộ kiểm thử tự động 13 ca kiểm thử độc lập cho phân hệ Thông tin vận hành A7.5. |
| 10 | `/docs/A7_5_SYSTEM_OPERATION_IMPLEMENTATION_REPORT.md` | **Tạo mới** | Tài liệu báo cáo nghiệm thu kỹ thuật phân hệ A7.5. |

---

## 6. Kết Quả Kiểm Thử Nghiệm Thu Tự Động (100% PASS)

Hệ thống đã thực thi toàn diện 3 bộ kiểm thử tự động độc lập trên môi trường máy chủ nội bộ:

### 6.1. Kết quả Kiểm thử A7.5 (`scripts/verify_a7_5_system_operation.ts`): **13/13 PASS (100%)**

```bash
==============================================================================
KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG A7.5: THÔNG TIN VẬN HÀNH (SYSTEM OPERATION)
API Base: http://127.0.0.1:3000
Supabase URL: https://jowfyhlzwhalwaohlldm.supabase.co
==============================================================================
[PASS] TC-A7.5-01: Admin đọc thành công cấu hình hệ thống hiện tại từ Supabase
       -> Revision hiện tại: #12, public_base_url: https://ctv.sthc.edu.vn
[PASS] TC-A7.5-02: Lưu thông tin vận hành thành công: chuẩn hóa URL (bỏ /) và số ĐT (+84 -> 028...)
       -> Revision mới: #13, Base URL: https://ctv.sthc.edu.vn, Phone: 02838446480
[PASS] TC-A7.5-03: Dữ liệu đã được ghi trực tiếp vào cơ sở dữ liệu Supabase (bền vững 100%)
       -> Database revision: #13, DB Phone: 02838446480
[PASS] TC-A7.5-04: Chặn truy cập trái phép: Staff bị chặn 403 ADMIN_ONLY, Anonymous bị chặn 401
       -> Staff status: 403, Anonymous status: 401
[PASS] TC-A7.5-05: Xác thực URL công khai: Chặn HTTP, chặn subpath, chặn query, fragment, credentials; chuẩn hóa bỏ /
       -> Từ chối HTTP: "URL công khai bắt buộc phải sử dụng giao thức bảo mật HTTPS (ví dụ: https://ctv.sthc.edu.vn).", Từ chối Subpath: "URL công khai phải là URL gốc (root domain), không được chứa đường dẫn con (ví dụ: không dùng /catalog)."
[PASS] TC-A7.5-06: Backend từ chối URL có subpath (/invalid-subpath) với mã lỗi HTTP 400
       -> Thông báo lỗi: "URL công khai phải là URL gốc (root domain), không được chứa đường dẫn con (ví dụ không dùng /catalog)."
[PASS] TC-A7.5-07: Xác thực Email & Số điện thoại: Chuẩn hóa di động 10 số, cố định 11 số, chặn đa số/ký tự lạ
       -> Cố định: 02838446480, Di động: 0901234567
[PASS] TC-A7.5-08: Backend chặn múi giờ ngoài Asia/Ho_Chi_Minh với mã lỗi HTTP 400
       -> Thông báo lỗi: "Múi giờ hệ thống hiện tại chỉ hỗ trợ Asia/Ho_Chi_Minh (Việt Nam UTC+07:00)."
[PASS] TC-A7.5-09: Bảo toàn nhóm nhận diện: Lưu operation hoàn toàn không làm thay đổi branding
       -> System name: "Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (Official)", Short: "STHC_CTV"
[PASS] TC-A7.5-10: Kiểm soát xung đột phiên bản (HTTP 409 CONFIG_VERSION_CONFLICT) khi expected_revision không khớp
       -> Lỗi trả về: "Xung đột phiên bản: Cấu hình đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại trang."
[PASS] TC-A7.5-11: Tạo Link giới thiệu khóa học và Danh mục CTV chuẩn hóa theo cấu hình public_base_url
       -> Khóa học: https://ctv.sthc.edu.vn/?ref=STHCCTV010088&course=CBMA-TC-01 | Danh mục: https://ctv.sthc.edu.vn/catalog?ref=STHCCTV010088
[PASS] TC-A7.5-12: API Public System Info cung cấp Allowlist đầy đủ, bảo vệ 100% bí mật (revision, updated_by)
       -> Allowlist: Base URL: https://ctv.sthc.edu.vn, Phone: 02838446480, Timezone: Asia/Ho_Chi_Minh
[PASS] TC-A7.5-13: Định dạng thời gian: Timestamp chuyển đúng UTC+7 (10:30), Ngày thuần giữ nguyên không lệch (15/05/2000)
       -> Timestamp formatted: "10:30:00 05/10/2026", Birthdate formatted: "15/05/2000"

==============================================================================
TỔNG KẾT KẾT QUẢ KIỂM THỬ A7.5:
- Tổng số ca kiểm thử: 13
- Thành công: 13
- Thất bại: 0
- Tỷ lệ đạt: 100%
==============================================================================
```

### 6.2. Kết quả Kiểm thử Hồi quy Phân hệ A7.4 (`scripts/verify_a7_4_system_branding.ts`): **9/9 PASS (100%)**
- Toàn bộ 9 ca kiểm thử về Route Guard, Sidebar Admin, API Public Allowlist, upload Logo/Favicon an toàn, và bảo vệ proxy ảnh đều duy trì trạng thái ĐẠT 100%.

### 6.3. Kết quả Kiểm thử Hồi quy Nền tảng A7.3 (`scripts/verify_a7_3_system_administration.ts`): **12/12 PASS (100%)**
- Toàn bộ 12 ca kiểm thử nền tảng CSDL, RPC lưu trữ, Sequence cấp mã tự tăng, upload quy chế và Rollback cấu hình đều đạt chuẩn tuyệt đối 100%.

---

## 7. Kết Luận

Phân hệ **A7.5 – Thông tin vận hành** đã được triển khai hoàn chỉnh, đạt chất lượng cao:
1. **Toàn vẹn CSDL**: Cấu hình ghi thẳng vào Supabase thông qua cơ chế khóa lạc quan an toàn, không dùng mock hay file tạm để báo lưu ảo.
2. **Chuẩn hóa thông minh**: Tự động làm sạch URL, loại bỏ trailing slash, chuẩn hóa số điện thoại cố định/di động Việt Nam về dạng liên hệ quốc gia thống nhất.
3. **Đồng bộ tiếp thị**: Tạo liên kết giới thiệu khóa học, liên kết danh mục và mã QR đồng nhất 100% từ cấu hình tên miền chính thức, bảo vệ trải nghiệm người dùng CTV.
4. **An toàn bảo mật**: Chặn hoàn toàn việc rò rỉ cấu hình nội bộ, phân quyền Admin nghiêm ngặt và xử lý xung đột phiên bản đa người dùng mượt mà.

Hệ thống đã sẵn sàng cho giai đoạn tiếp theo: **A7.6 – Quy chế tuyển sinh & Tiếp nhận đăng ký CTV**.
