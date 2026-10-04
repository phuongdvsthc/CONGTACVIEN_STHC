# BÁO CÁO KIỂM KÊ VÀ ĐẶC TẢ CHI TIẾT MODULE "KHÁCH HÀNG ĐƯỢC GIỚI THIỆU" (A3.1)
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. QUY TẮC NGHIỆP VỤ BẮT BUỘC

1. **Phạm vi quyền dữ liệu (Data Access Scope)**:
   - **Admin và Cán bộ tuyển sinh (Staff)**: Được phép xem, tìm kiếm, lọc và thống kê toàn bộ khách hàng được giới thiệu của tất cả các Cộng tác viên (CTV) trong hệ thống.
   - **Cộng tác viên (CTV)**: Chỉ được phép xem danh sách và chi tiết khách hàng do chính mình giới thiệu (ràng buộc `affiliate_id` gắn với tài khoản đăng nhập).
   - **Bảo mật Backend**: Việc phân quyền và lọc dữ liệu bắt buộc được thực thi tại tầng Backend (câu lệnh SQL và kiểm tra session), không được chỉ lọc hoặc ẩn trên giao diện Frontend.
2. **Nguồn ghi nhận chuẩn**:
   - Khách đăng ký tư vấn qua link giới thiệu (`/?ref=...&course=...`) hoặc quét mã QR là nguồn ghi nhận chính thức và chuẩn mực duy nhất. Chưa bổ sung tính năng tạo khách thủ công bởi CTV hoặc Admin/Staff trong giai đoạn này.
3. **Ranh giới trạng thái đăng ký**:
   - Yêu cầu đăng ký tư vấn không đồng nghĩa với nhập học thành công hoặc đủ điều kiện nhận thù lao giới thiệu.
4. **Quyền hạn của CTV**:
   - CTV tuyệt đối không được phép chỉnh sửa nguồn giới thiệu, thay đổi mã hồ sơ EGOV hoặc cập nhật tình trạng nhập học của học viên.

---

## 2. KIỂM KÊ THỰC TẾ HỆ THỐNG

### 2.1. Cấu trúc CSDL (Database Schema & Relations)
- **Bảng `leads`**:
  - Lưu trữ toàn bộ thông tin khách đăng ký tư vấn qua landing page.
  - Các cột chính: `id` (UUID), `full_name`, `phone`, `email`, `province`, `course_id` (FK tới `courses`), `affiliate_id` (FK tới `affiliate_profiles`), `affiliate_code_captured`, `counseling_status` (Trạng thái chăm sóc: `NEW`, `CONTACTED`, `CONSULTING`, `UNREACHABLE`, `LOST`), `reconciliation_status` (`NOT_RECONCILED`, `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`, `VOIDED`), `reward_status` (`NONE`, `PENDING_APPROVAL`, `APPROVED`, `VOIDED`, `REJECTED`), `consent_accepted`, `customer_note`, `counselor_note`, `created_at`, `updated_at`.
- **Bảng `lead_reconciliations`**:
  - Lưu lịch sử đối soát học phí & hồ sơ thực tế tại văn phòng tuyển sinh.
  - Các cột chính: `id`, `lead_id` (FK tới `leads`), `staff_id` (FK tới `profiles`), `external_admission_code` (Mã hồ sơ EGOV), `external_student_code`, `tuition_fee_collected`, `receipt_number`, `tuition_paid_at`, `reconciliation_status`, `staff_note`, `void_reason`, `reconciled_at`.
- **Bảng `affiliate_profiles` & `courses` & `rewards`**:
  - Liên kết chặt chẽ qua các khóa ngoại (`ON DELETE RESTRICT` để chống xóa dây chuyền gây mất dữ liệu nguồn).

### 2.2. API Đang Có
- `POST /api/v1/public/leads`: Tiếp nhận form đăng ký tư vấn từ khách (xác thực mã `ref`, kiểm tra khóa học, chống trùng SĐT trong 90 ngày).
- `GET /api/v1/public/affiliate-referrer`: Tra cứu thông tin công khai an toàn của CTV qua mã `ref`.
- `GET /api/v1/admin/leads`: Lấy danh sách toàn bộ leads (dành cho Admin/Staff).
- `GET /api/v1/affiliate/leads`: Lấy danh sách leads thuộc CTV (với tính năng che 4 số cuối số điện thoại để bảo mật PII).
- `POST /api/v1/admin/leads/:id/reconcile`: Thực hiện đối soát học phí, ghi nhận mã EGOV và kích hoạt tiến trình thưởng.

### 2.3. Định tuyến & Giao diện Hiện tại
- **Màn hình `/portal/leads`**: Hiện tại đang là component placeholder (`AdminPlaceholderPage` hoặc `AffiliatePlaceholderPage`). Bước A3.1 này thực hiện phân tích và đặc tả trước khi bắt đầu triển khai từ bước A3.2.

---

## 3. TRUY VẾT LUỒNG GHI NHẬN KHÁCH (LEAD CAPTURE FLOW)

1. **Xác định CTV và Khóa học**:
   - Khi khách truy cập link `https://sthc.edu.vn/?ref=STHCCTV1088&course=ky-thuat-che-bien-mon-an-a-au`, Frontend lưu mã `ref` và `course` vào `localStorage` / Session.
   - Khi submit form, payload gửi lên `POST /api/v1/public/leads`.
2. **Kiểm tra trạng thái tại Backend**:
   - Backend gọi hàm `checkAffiliateReferralEligibility()` để kiểm tra xem CTV có đang ở trạng thái `ACTIVE` hay không. Nếu `SUSPENDED` hoặc `PENDING_REVIEW`, từ chối ghi nhận hoặc chặn đăng ký theo quy tắc A1.4.
   - Backend kiểm tra khóa học qua `is_active` và `accepts_referrals`.
3. **Chống gửi lặp và Trùng lặp (Idempotency & Duplicate Policy)**:
   - Hệ thống kiểm tra số điện thoại trong bảng `leads`. Nếu số điện thoại đã gửi thông tin trong vòng 90 ngày, đánh dấu `is_duplicate = true` nhưng **vẫn giữ nguyên nguồn giới thiệu (`affiliate_id`) của CTV đầu tiên** (First-touch attribution).
4. **Lưu trữ và Đọc dữ liệu**:
   - Dữ liệu ghi vào bảng `leads`. Admin/Staff đọc toàn bộ, CTV chỉ đọc leads có `affiliate_id` khớp với hồ sơ của mình.

---

## 4. CHỐT MÔ HÌNH DỮ LIỆU VÀ QUY TẮC TRÙNG

- **Phân biệt Liên hệ và Lượt đăng ký**: Mỗi lần khách điền form ứng với một lượt đăng ký (lead) gắn với một khóa học cụ thể tại thời điểm đó.
- **Đăng ký nhiều khóa**: Một khách hàng có thể quan tâm và đăng ký nhiều khóa học khác nhau. Mỗi lần đăng ký là một bản ghi riêng trong bảng `leads`.
- **Tranh chấp nguồn giới thiệu**: Nếu cùng một số điện thoại đăng ký lại qua CTV thứ hai trong thời hạn 90 ngày, hệ thống **ưu tiên giữ nguyên nguồn CTV ban đầu** (`first-touch attribution`) để bảo đảm quyền lợi công bằng cho CTV giới thiệu đầu tiên. Không tự động chuyển nguồn sang CTV mới.

---

## 5. BỔ SUNG DỮ LIỆU TỪ MODULE ĐỐI SOÁT

1. **Tình trạng nhập học**:
   - Có 2 trạng thái hiển thị: **“Chưa nhập học”** và **“Đã nhập học”**.
   - Được cập nhật độc quyền bởi Admin hoặc cán bộ tuyển sinh tại module **“Đối chiếu hồ sơ & học phí”** (`lead_reconciliations` với trạng thái `MATCHED_VALID`).
   - Tuyệt đối không tự chuyển sang “Đã nhập học” chỉ vì gửi form thành công hay có mã EGOV tạm.
2. **Mã hồ sơ EGOV**:
   - Là mã hồ sơ đăng ký trên hệ thống tuyển sinh chính thức của trường.
   - Do Admin/Staff nhập tại module đối chiếu. Hiển thị dạng chuỗi (giữ nguyên số 0 ở đầu). Nếu chưa có, hiển thị **“Chưa cập nhật”**.
3. **Quy tắc liên kết**:
   - Module "Khách hàng được giới thiệu" chỉ có quyền **đọc** 2 trường này, không chỉnh sửa trực tiếp. CTV không được phép cập nhật qua giao diện hay API.

---

## 6. CHỐT BẢNG QUYỀN (ACCESS CONTROL MATRIX)

| Chức năng / Thao tác | Chưa đăng nhập (Public) | Cộng tác viên (Affiliate) | Cán bộ Tuyển sinh (Staff) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| Xem danh sách khách được giới thiệu | Không | Chỉ khách của mình (`affiliate_id`) | Toàn bộ khách | Toàn bộ khách |
| Tìm kiếm, lọc và phân trang | Không | Trong phạm vi khách của mình | Toàn bộ | Toàn bộ |
| Xem chi tiết & Lịch sử chăm sóc | Không | Khách của mình (che 4 số cuối SĐT) | Toàn bộ | Toàn bộ |
| Cập nhật trạng thái chăm sóc & Ghi chú | Không | Không | Được phép | Được phép |
| Đọc tình trạng nhập học & Mã EGOV | Không | Được phép đọc (khách của mình) | Được phép đọc | Được phép đọc |
| Sửa kết quả đối chiếu / Duyệt nhập học | Không | Không | Chỉ tại module đối chiếu | Chỉ tại module đối chiếu |

---

## 7. CHỐT DANH SÁCH VÀ CHI TIẾT

### 7.1. Bảng danh sách đề xuất
1. STT
2. Mã lượt đăng ký (`id` hoặc mã rút gọn `STHC-TS-...`)
3. Họ và tên khách
4. Số điện thoại (Admin/Staff hiển thị đầy đủ; CTV hiển thị dạng che 4 số cuối `090812****`)
5. Khóa học quan tâm
6. Mã hồ sơ EGOV (`Chưa cập nhật` hoặc mã thực tế)
7. Tình trạng nhập học (`Chưa nhập học` / `Đã nhập học`)
8. Trạng thái xử lý / chăm sóc (`NEW`, `CONTACTED`, `CONSULTING`, `UNREACHABLE`, `LOST`)
9. Ngày đăng ký (`created_at`)
10. Ngày cập nhật gần nhất (`updated_at`)
11. Nút “Xem chi tiết”

### 7.2. Tìm kiếm và Bộ lọc
- **Tìm kiếm**: Theo Họ tên, Số điện thoại, Mã lượt đăng ký, Mã hồ sơ EGOV.
- **Bộ lọc**:
  - Khóa học quan tâm.
  - Trạng thái chăm sóc.
  - Tình trạng nhập học (`Chưa nhập học` / `Đã nhập học`).
  - Khoảng thời gian đăng ký (Từ ngày - Đến ngày).
  - CTV giới thiệu (Chỉ dành cho Admin/Staff).
- Sắp xếp mặc định: Mới nhất lên đầu (`created_at DESC`), kèm tiêu chí phụ ổn định theo `id ASC`.

---

## 8. KẾ HOẠCH TRIỂN KHAI TIẾP THEO (A3.2 – A3.7)

- **A3.2**: Hoàn thiện ghi nhận khách từ link/QR và kiểm tra chống trùng.
- **A3.3**: Xây dựng API đọc và phân quyền dữ liệu (`/api/v1/leads/...`) theo đúng vai trò.
- **A3.4**: Phát triển giao diện Danh sách, Tìm kiếm, Bộ lọc và Phân trang cho Admin/Staff và CTV.
- **A3.5**: Phát triển màn hình Chi tiết khách và Lịch sử tương tác.
- **A3.6**: Tích hợp cập nhật trạng thái chăm sóc, ghi chú nội bộ.
- **A3.7**: Kiểm thử toàn luồng tích hợp với dữ liệu đối chiếu hồ sơ và học phí.

---
*Tài liệu kiểm kê A3.1 đã hoàn tất tại `/docs/A3_1_REFERRED_CUSTOMERS_AUDIT.md`. Dừng lại để ghi nhận chốt đặc tả trước khi tiến hành bước A3.2.*
