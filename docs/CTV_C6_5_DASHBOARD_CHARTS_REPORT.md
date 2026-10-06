# BÁO CÁO TRIỂN KHAI C6.5 — BIỂU ĐỒ THEO THỜI GIAN VÀ THEO KHÓA HỌC TRÊN DASHBOARD CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_5_DASHBOARD_CHARTS_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất triển khai 2 khối Biểu đồ thời gian thực (12 tháng & Phân bố khóa học)
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.5

### 1.1. Phạm vi hoàn thành
1. **Bổ sung 2 khối Biểu đồ trực quan:** Đặt ngay bên dưới khối *"Tổng hợp thưởng"* và phía trên danh sách *"Đăng ký gần đây"* tại `/portal` (`AffiliateDashboard.tsx`).
2. **Biểu đồ 1 — "Đăng ký và nhập học" (12 tháng gần nhất):**
   - Biểu đồ cột đôi (Grouped Column Chart) thể hiện 2 chuỗi số liệu độc lập:
     - **"Lượt đăng ký"** (`leads_count`): Xanh dương (`#2563EB`).
     - **"Đã nhập học"** (`enrolled_count`): Xanh ngọc / Teal (`#0D9488`).
   - Đúng 12 tháng liên tục tính từ tháng hiện tại lùi về trước theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
   - Trục hoành (X): Tháng/Năm (`T11/2025` đến `T10/2026`), thứ tự tăng dần.
   - Trục tung (Y): Bắt đầu từ 0, chỉ chứa các mốc số nguyên (0, 1, 2, 3, ...).
   - Tooltip tương tác hiển thị chi tiết tháng và số liệu từng chuỗi khi di chuột hoặc chạm trên thiết bị cảm ứng.
   - Bảng *"Xem số liệu"* thu gọn/mở rộng hỗ trợ đọc chính xác và khả năng tiếp cận (Accessibility).
   - Phụ chú: *"Đăng ký tính theo ngày ghi nhận; nhập học tính theo ngày xác nhận."*
3. **Biểu đồ 2 — "Kết quả theo khóa học" (Toàn bộ thời gian):**
   - Biểu đồ thanh ngang nhóm (Grouped Horizontal Bar Chart):
     - **"Lượt đăng ký"** (`total_leads`): Xanh dương (`#2563EB`).
     - **"Đã nhập học"** (`enrolled_leads`): Xanh ngọc / Teal (`#0D9488`).
   - Hiển thị tất cả khóa học trả về từ API (không giới hạn Top 5/6; bao gồm khóa đã đóng nếu có dữ liệu lịch sử).
   - Duy trì đúng thứ tự sắp xếp từ Backend (giảm dần theo tổng lượt đăng ký).
   - Hỗ trợ cuộn dọc mượt mà khi có nhiều khóa học.
   - Trục số bắt đầu từ 0, số nguyên.
   - Bảng *"Xem số liệu"* thu gọn đối soát chi tiết mã khóa, tên khóa và tổng cộng.
4. **Bảo toàn giao diện và chức năng:**
   - Giữ nguyên Banner chào mừng, QR danh mục tuyển sinh, 4 Card kết quả và 3 Card tổng hợp thưởng.
   - Không thêm bộ lọc thời gian, thông báo, liên kết nhanh hay bảng xếp hạng.
   - Tuân thủ 100% quy tắc thương hiệu: Không ghi cứng tên trường / tên viết tắt trường.

---

## II. DANH SÁCH FILE & THƯ VIỆN SỬ DỤNG

| STT | File / Component | Vai trò | Công nghệ / Thư viện |
|---|---|---|---|
| 1 | `src/components/affiliate/MonthlyTrendChart.tsx` | Biểu đồ cột đôi 12 tháng xu hướng | React, SVG Vector thuần, Tailwind CSS, Lucide Icons |
| 2 | `src/components/affiliate/CourseBreakdownChart.tsx` | Biểu đồ thanh ngang phân bố khóa học | React, Tailwind CSS, Lucide Icons |
| 3 | `src/components/affiliate/AffiliateDashboard.tsx` | Trang Tổng quan CTV chính | Tích hợp 2 component biểu đồ và skeleton |
| 4 | `server.ts` | Backend API Gateway | Chuẩn hóa tính toán múi giờ `Asia/Ho_Chi_Minh` và ngày xác nhận nhập học |
| 5 | `scripts/verify_c6_5_dashboard_charts.ts` | Kịch bản kiểm thử nghiệm thu tự động C6.5 | TypeScript, Supabase JS Client |

*Ghi chú kiến trúc:* Sử dụng giải pháp vẽ SVG Vector tùy biến và cấu trúc thanh ngang CSS thuần giúp biểu đồ đạt độ sắc nét tuyệt đối trên màn hình Retina, không bị lỗi tính sai kích thước container (`height: 0px` / canvas blank), không phụ thuộc thư viện bên ngoài cồng kềnh và tương thích hoàn hảo 100% với React 19.

---

## III. BẢNG ÁNH XẠ DỮ LIỆU & Ý NGHĨA SỐ LIỆU

### 3.1. Biểu đồ theo thời gian (`data.monthly_trend`)
- **Nguồn dữ liệu:** `GET /api/v1/affiliate/dashboard/summary` -> `monthly_trend: MonthlyTrendItem[]`.
- **Cấu trúc phần tử:**
  - `month_key`: Định dạng `YYYY-MM` (ví dụ: `"2026-10"`), dùng làm khóa định danh cố định không bị lệch múi giờ.
  - `month_label`: Định dạng nhãn hiển thị `"T10/2026"`.
  - `leads_count`: Số lượt đăng ký mới có ngày tạo `leads.created_at` thuộc tháng đó (tính theo giờ Việt Nam UTC+7).
  - `enrolled_count`: Số lượt nhập học có ngày xác nhận đối chiếu `lead_reconciliations.reconciled_at` thuộc tháng đó (tính theo giờ Việt Nam UTC+7).
- **Tính độc lập của 2 sự kiện:**
  - Lượt đăng ký và lượt nhập học đo lường hai mốc thời gian khác nhau (học viên có thể đăng ký tháng 5 nhưng đến tháng 7 mới hoàn tất thủ tục nhập học).
  - Do đó trong một tháng cụ thể, `enrolled_count` hoàn toàn có thể lớn hơn `leads_count`. Hệ thống không áp đặt điều kiện gượng ép `enrolled_count <= leads_count` và không tính tỷ lệ chuyển đổi sai lệch theo từng tháng.

### 3.2. Biểu đồ theo khóa học (`data.course_breakdown`)
- **Nguồn dữ liệu:** `GET /api/v1/affiliate/dashboard/summary` -> `course_breakdown: CourseBreakdownItem[]`.
- **Cấu trúc phần tử:**
  - `course_id`: ID khóa học hoặc chuỗi `'UNASSIGNED'`.
  - `course_code`: Mã khóa đào tạo (ví dụ: `"CBMA-TC-01"`, `"BB-TC-02"`).
  - `course_title`: Tên chương trình đào tạo.
  - `total_leads`: Tổng lượt đăng ký chọn khóa này trong toàn bộ thời gian.
  - `enrolled_leads`: Tổng số học viên đã nhập học khóa này trong toàn bộ thời gian.
- **Tính toàn vẹn dữ liệu:**
  - $\sum \text{total\_leads (các khóa)} = \text{metrics.total\_leads}$.
  - $\sum \text{enrolled\_leads (các khóa)} = \text{metrics.enrolled\_leads}$.

---

## IV. TINH CHỈNH BACKEND TỐI THIỂU & GIỚI HẠN DỮ LIỆU LỊCH SỬ

1. **Chuẩn hóa tính toán múi giờ Việt Nam (`server.ts`):**
   - Sử dụng phép cộng Epoch UTC `now.getTime() + (7 * 3600000)` kết hợp các hàm `getUTCFullYear()`, `getUTCMonth()` để xác định chính xác ranh giới tháng Việt Nam (`Asia/Ho_Chi_Minh`), không phụ thuộc vào timezone của máy chủ lưu trữ.
2. **Xử lý ngày xác nhận nhập học chính thức:**
   - Trường hợp một lead có nhiều lần đối chiếu (tái đối chiếu), thuật toán sắp xếp giảm dần theo `reconciled_at` để lấy ngày xác nhận hợp lệ mới nhất.
   - Mỗi lead chỉ được tính duy nhất 1 lần nhập học (lặp qua mảng `leadsList`, không lặp qua mảng `lead_reconciliations`).
3. **Giới hạn dữ liệu lịch sử:**
   - Đối với các lead cũ trước khi có module A4 (chưa có bản ghi `lead_reconciliations`), nếu `admission_status === 'ENROLLED'`, ngày nhập học tạm thời sử dụng `lead.updated_at || lead.created_at`.

---

## V. KẾT QUẢ KIỂM TRA NGHIỆM THU

| Ca kiểm thử | Nội dung kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|
| **TC-C6.5-01** | Chuỗi 12 tháng liên tục theo giờ Việt Nam | **PASS** | Đủ 12 tháng kết thúc ở tháng hiện tại (T10/2026). |
| **TC-C6.5-02** | Trục số Y bắt đầu từ 0 và chỉ hiển thị số nguyên | **PASS** | Tự động căn mốc số nguyên (0, 1, 2, 3...). |
| **TC-C6.5-03** | Tính độc lập 2 chuỗi `leads_count` và `enrolled_count` | **PASS** | Hiển thị đúng cả khi nhập học > đăng ký trong tháng. |
| **TC-C6.5-04** | Tổng số liệu theo khóa khớp 100% với Card Metrics | **PASS** | Khớp hoàn toàn cả lượt đăng ký và nhập học. |
| **TC-C6.5-05** | Hiển thị đầy đủ tất cả khóa (không cắt Top 5/6) | **PASS** | Hỗ trợ cuộn dọc trong card khi danh sách khóa dài. |
| **TC-C6.5-06** | Trạng thái rỗng / toàn bộ số 0 | **PASS** | Thông báo rõ ràng: "Chưa phát sinh đăng ký hoặc nhập học trong 12 tháng gần nhất". |
| **TC-C6.5-07** | Bảng "Xem số liệu" chi tiết & Accessibility | **PASS** | Đóng/mở mượt mà, đầy đủ tổng cộng. |
| **TC-C6.5-08** | Tooltip tương tác trên Desktop & Mobile | **PASS** | Hiển thị sắc nét, hỗ trợ cảm ứng chạm. |
| **TC-C6.5-09** | Chất lượng mã nguồn (`lint` & `build`) | **PASS** | `tsc --noEmit` và `vite build` 0 lỗi. |

---
*Hoàn tất bước C6.5. Dừng lại theo đúng yêu cầu, chưa chuyển sang bước C6.6 hay bảng xếp hạng.*
