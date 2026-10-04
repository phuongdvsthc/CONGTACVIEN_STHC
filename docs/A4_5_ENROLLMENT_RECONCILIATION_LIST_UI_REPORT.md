# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.5 — DANH SÁCH ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ
## HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_5_ENROLLMENT_RECONCILIATION_LIST_UI_REPORT`
- **Phiên bản:** `1.0.0`
- **Ngày thực hiện:** `04/10/2026`
- **Môi trường:** Production Staging / AI Studio Preview
- **Trạng thái:** **HOÀN THÀNH (PASS)** — Sẵn sàng chuyển tiếp sang bước A4.6 (Chi tiết & Thao tác Đối soát/Hủy).

---

## 1. CẬP NHẬT LẠI LỘ TRÌNH VÀ PHẠM VI BÀN GIAO TOÀN DIỆN

Theo chỉ đạo chuẩn hóa, phạm vi các phân hệ đối chiếu hồ sơ được phân định rõ ràng như sau:
1. **A4.4 (Đã hoàn thành)**: Backend API & Phân quyền đối chiếu hồ sơ, xác thực JWT, bảo vệ chống giả mạo danh tính, chống gửi lặp Idempotency-Key và kiểm soát dữ liệu đầu vào.
2. **A4.5 (Bước hiện tại - Đã hoàn thành)**: Danh sách đối chiếu hồ sơ & học phí phía Admin/Staff tại `/admin/reconcile` (gồm tìm kiếm, bộ lọc đa chiều, combobox CTV, phân trang server-side, bảo toàn 2 trục trạng thái, định dạng tiền tệ và điều hướng).
3. **A4.6 (Bước tiếp theo)**: Giao diện chi tiết hồ sơ đối soát và form thao tác xác nhận / hủy đối chiếu (Modal đối soát, Modal hủy, kiểm tra snapshot học phí và cập nhật theo thời gian thực).
4. **A4.7**: Đồng nhất hiển thị trạng thái hồ sơ tại phân hệ quản lý chăm sóc (A3) và Cổng tra cứu của Cộng tác viên (Affiliate Portal).

---

## 2. HỢP ĐỒNG API DANH SÁCH & PHÂN TRANG PHÍA SERVER

### 2.1. Endpoint danh sách Admin/Staff
- **URL:** `GET /api/v1/admin/leads`
- **Phân quyền:** Bắt buộc Header `Authorization: Bearer <jwt_token>` có role `admin` hoặc `staff`.
- **Query Parameters hỗ trợ:**
  | Tham số | Kiểu dữ liệu | Ý nghĩa & Quy tắc |
  | :--- | :--- | :--- |
  | `search` | `string` | Từ khóa tìm kiếm: Họ tên, Số điện thoại, Mã CTV hoặc Mã hồ sơ EGOV (trim, giữ nguyên chuỗi, không phân biệt hoa thường). |
  | `course_id` | `UUID \| 'ALL'` | Lọc theo khóa học khách đăng ký/quan tâm ban đầu. |
  | `admission_status` | `string` | Lọc theo tình trạng nhập học: `ALL`, `ENROLLED` hoặc `NOT_ENROLLED`. |
  | `reconciliation_status` | `string` | Lọc theo kết quả đối chiếu: `ALL`, `NOT_RECONCILED`, `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`, `VOIDED`. |
  | `source_type` | `string` | Lọc theo nguồn: `ALL`, `AFFILIATE` (có CTV), `ORGANIC` (khách tự đăng ký). |
  | `affiliate_id` | `UUID \| 'ALL'` | Lọc chính xác theo ID cộng tác viên được chọn từ combobox autocomplete. |
  | `from_date` | `YYYY-MM-DD` | Lọc ngày tạo hồ sơ từ 00:00:00 (Múi giờ Asia/Ho_Chi_Minh GMT+7). |
  | `to_date` | `YYYY-MM-DD` | Lọc ngày tạo hồ sơ đến 23:59:59.999 (Múi giờ Asia/Ho_Chi_Minh GMT+7). |
  | `page` | `number` | Số thứ tự trang hiện tại (mặc định: `1`). |
  | `limit` | `number` | Số lượng bản ghi mỗi trang (chấp nhận: `20`, `50`, `100`; mặc định: `20`). |

### 2.2. Cơ chế phân trang & Tránh nhân đôi bản ghi (No-Duplicate Guarantee)
- Truy vấn sử dụng bảng chính `leads` kết hợp liên kết 1-1 với bản ghi đối soát hiện hành thông qua hàm helper `getActiveReconciliation`.
- `total` và `totalPages` được tính toán trực tiếp từ `count: 'exact'` trên bảng `leads` sau khi áp dụng toàn bộ điều kiện tìm kiếm và bộ lọc, đảm bảo **1 dòng hiển thị = đúng 1 khách hàng**, không bị nhân đôi do lịch sử nhiều lần đối soát.

---

## 3. CÁC TÍNH NĂNG VÀ THIẾT KẾ GIAO DIỆN TRANG A4.5

Giao diện được đóng gói thành component chuyên biệt `AdminReconciliationListView.tsx` và tích hợp tại Tab "Đối chiếu hồ sơ & học phí" (`/admin/reconcile`) bên trong `AdminPortal.tsx` (sử dụng layout chuẩn `AppLayout`):

### 3.1. Tiêu đề & Mô tả nghiệp vụ
- **Tiêu đề:** `Đối chiếu hồ sơ & học phí` (kèm icon `FileCheck2` xanh đậm thương hiệu STHC).
- **Mô tả:** *“Kiểm tra hồ sơ EGOV và ghi nhận kết quả nhập học của khách hàng.”*
- **Nút "Làm mới":** Tải lại dữ liệu ngay lập tức với trạng thái xoay biểu tượng trực quan.

### 3.2. Thanh tìm kiếm & Bộ lọc linh hoạt
1. **Ô tìm kiếm đa năng:**
   - Placeholder: *“Tìm theo họ tên, SĐT, mã CTV hoặc mã EGOV”*
   - Tự động debounce 400ms trước khi gửi truy vấn lên server.
   - Tự động chuyển về trang 1 khi thay đổi từ khóa.
   - Hỗ trợ nút "X" xóa nhanh nội dung tìm kiếm.
2. **Bộ lọc Khóa học:** Đổ danh mục thực tế từ `GET /api/v1/admin/courses`.
3. **Bộ lọc Tình trạng nhập học (admission_status):** Tất cả / Đã nhập học (ENROLLED) / Chưa nhập học (NOT_ENROLLED).
4. **Bộ lọc Kết quả đối chiếu (reconciliation_status):** Tất cả / Chưa đối chiếu / Hồ sơ hợp lệ / Đăng ký trước kênh khác / Thông tin không khớp / Đã hủy đối chiếu.
5. **Bộ lọc Nguồn giới thiệu (source_type):** Tất cả / Có CTV giới thiệu / Khách tự đăng ký (Tự nhiên).
6. **Combobox chọn CTV thông minh (Server-side Autocomplete):**
   - Chỉ tìm kiếm khi nhập tối thiểu 2 ký tự.
   - Debounce 400ms và giới hạn tối đa 20 kết quả từ `GET /api/v1/admin/affiliates/lookup`.
   - Hiển thị rõ Mã CTV (font mono) và Họ tên CTV.
   - Có cờ hiệu `(Tạm khóa)` nếu tài khoản CTV bị khóa.
   - Bị vô hiệu hóa hợp lý khi đang chọn nguồn "Khách tự đăng ký".
7. **Bộ lọc Khoảng thời gian Đăng ký (Từ ngày - Đến ngày):**
   - Tự động kiểm tra tính hợp lệ (`from_date <= to_date`), cảnh báo lỗi rõ ràng nếu nhập khoảng thời gian sai.
8. **Đồng bộ trạng thái với URL (Query Parameters):**
   - Mọi thay đổi của bộ lọc, tìm kiếm, phân trang đều tự động lưu vào URL bằng `window.history.replaceState`. Khi F5 hoặc chia sẻ link, người dùng giữ nguyên trạng thái tìm kiếm.
9. **Nút "Xóa bộ lọc":** Xuất hiện khi có bất kỳ điều kiện lọc nào đang kích hoạt, cho phép đặt lại trạng thái ban đầu trong 1 cú click.

### 3.3. Các cột hiển thị trong Bảng dữ liệu (11 cột chuẩn hóa)
| Cột | Quy tắc hiển thị & Định dạng |
| :--- | :--- |
| **STT** | Tính theo công thức `(page - 1) * limit + index + 1` |
| **Họ và tên khách** | Họ tên chữ đậm màu slate-900, kèm email phụ phía dưới (nếu có). |
| **Số điện thoại** | Font mono xanh đậm rõ ràng. |
| **CTV giới thiệu** | Nếu có CTV: Hiển thị badge mã CTV (font mono amber) và Họ tên CTV. Nếu không có: Hiển thị *“Khách tự đăng ký”* (in nghiêng). |
| **Khóa học quan tâm / đối chiếu** | Hiển thị tên khóa học quan tâm ban đầu. Nếu khóa đối chiếu khác khóa quan tâm, hiển thị thêm badge tím: *“Đối chiếu: [Tên khóa đối chiếu]”*. Không âm thầm ghi đè dữ liệu ban đầu. |
| **Mã hồ sơ EGOV** | Nếu có mã: Badge xanh lá font mono. Nếu chưa có: Hiển thị *“Chưa cập nhật”* (in nghiêng). |
| **Tình trạng nhập học** | Phân tách độc lập: Badge xanh lá *“Đã nhập học”* (kèm icon tích), Badge xám *“Chưa nhập học”*, hoặc Badge cam *“Cần kiểm tra”*. |
| **Kết quả đối chiếu** | Phân tách độc lập: *“Chưa đối chiếu”*, *“Hồ sơ hợp lệ”*, *“Đăng ký trước qua kênh khác”*, *“Thông tin không khớp”*, *“Đã hủy đối chiếu”*. |
| **Học phí khóa học** | Định dạng chuẩn VNĐ (ví dụ: `14.500.000 ₫`). Nếu giá trị = `0`, hiển thị đúng `0 ₫`. Nếu là học phí ước tính, hiển thị kèm nhãn `(Ước tính)`. Nếu chưa có dữ liệu, hiển thị *“Chưa cập nhật”*. Không dùng học phí thực thu để thay thế. |
| **Ngày đăng ký** | Định dạng `DD/MM/YYYY HH:mm` theo múi giờ chuẩn Việt Nam `Asia/Ho_Chi_Minh` (GMT+7). |
| **Thao tác** | Nút *“Xem chi tiết”* (icon FileText), điều hướng sang trang xem chi tiết khách hàng `/admin/leads/:id`. |

### 3.4. Trạng thái rỗng, Tải dữ liệu & Xử lý lỗi (State Handling)
- **Loading State:** Spinner động mượt mà với thông điệp rõ ràng.
- **Empty State khi chưa có dữ liệu:** Icon minh họa, thông điệp rõ ràng.
- **Empty State khi lọc không có kết quả:** Thông báo không tìm thấy hồ sơ phù hợp kèm nút bấm nhanh "Xóa toàn bộ bộ lọc".
- **Error State:** Banner báo lỗi màu đỏ kèm nút "Thử lại".
- **Race Condition Guard:** Sử dụng `fetchSeqRef` để loại bỏ hoàn toàn hiện tượng phản hồi mạng trễ ghi đè kết quả truy vấn mới nhất.

---

## 4. KẾT QUẢ KIỂM TRA CHẤT LƯỢNG CODE & TÍCH HỢP

1. **Kiểm tra TypeScript & Linter (`npm run lint`):**
   - **Kết quả:** `0 error, 0 warning`.
2. **Kiểm tra biên dịch Production (`compile_applet`):**
   - **Kết quả:** `Build succeeded - the applet is compiled`.
3. **Bảo toàn dữ liệu thật:** Toàn bộ dữ liệu hiển thị được lấy trực tiếp từ API server, không tự ý chèn dữ liệu mẫu (mock data).
4. **Ghi chú về kiểm chứng giao diện thực tế trên trình duyệt:**
   - Do môi trường kiểm thử tự động dòng lệnh không mở trình duyệt trực quan của người dùng, giao diện thực tế cần được kiểm chứng hiển thị (UX/UI review) trên trình duyệt ở giai đoạn nghiệm thu tổng thể.

---

## 5. KẾT LUẬN & ĐỀ XUẤT BƯỚC TIẾP THEO

- **Kết luận bước A4.5:** **HOÀN THÀNH (PASS)**.
- Đã dừng lại theo đúng yêu cầu phân ranh giới công việc, sẵn sàng chuyển sang:
  👉 **A4.6: Xây dựng Giao diện Modal Chi tiết và Thao tác Đối soát / Hủy Đối chiếu Hồ sơ & Học phí cho Admin/Staff**.
