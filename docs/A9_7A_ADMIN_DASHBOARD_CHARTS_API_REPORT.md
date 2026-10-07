# BÁO CÁO TRIỂN KHAI API BIỂU ĐỒ TỔNG QUAN QUẢN TRỊ ADMIN / STAFF (A9.7A)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_7A_ADMIN_DASHBOARD_CHARTS_API_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% & ĐÃ ĐƯỢC KIỂM CHỨNG TỰ ĐỘNG**

---

### 1. Mục Tiêu & Phạm Vi Triển Khai Thực Tế

Thực hiện bước **A9.7A (API Biểu đồ Tuyển sinh)** thuộc lộ trình xây dựng module Tổng quan quản trị Admin / Staff:
- Bổ sung 2 nhóm dữ liệu biểu đồ vào endpoint hiện có: `GET /api/v1/admin/dashboard/summary`.
  1. `monthly_trend`: Xu hướng đăng ký và nhập học trong 12 tháng liên tục tính đến tháng hiện tại theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` UTC+07:00).
  2. `course_breakdown`: Phân bố kết quả tuyển sinh (đăng ký, nhập học, tỷ lệ chuyển đổi) theo từng khóa học trong kỳ chọn.
- Bảo toàn nguyên vẹn contract và hành vi các khối dữ liệu đã có: `filters`, `recruitment`, `affiliate_network`, `backlog`, `rewards`.
- Tuân thủ nghiêm ngặt ma trận phân quyền: Cả Admin và Staff đang hoạt động đều được quyền xem 2 biểu đồ tuyển sinh (không yêu cầu quyền tài chính `rewards.summary`). Staff không có quyền `rewards.summary` vẫn nhận đầy đủ 2 biểu đồ, khối `rewards` bị lược bỏ an toàn với `reason_code: "PERMISSION_DENIED"`.
- Chưa tích hợp biểu đồ vào giao diện `AdminDashboardView` (dành riêng cho bước A9.7B).
- Chưa triển khai Top CTV hoặc Khách gần đây (dành riêng cho bước A9.8).
- Không đọc, không trả `audit_logs` hay `recent_audits`.

---

### 2. Các Thành Phần Mã Nguồn & CSDL Đã Triển Khai

#### 2.1 Cập nhật Type Definitions (`/src/types/index.ts`)
- Thêm `AdminDashboardMonthlyTrendPoint`:
  - `month_key`: chuỗi định dạng `"YYYY-MM"` (ví dụ: `"2025-11"`, `"2026-10"`).
  - `month_label`: chuỗi định dạng `"TMM/YYYY"` (ví dụ: `"T11/2025"`, `"T10/2026"`).
  - `leads_count`: số lượt đăng ký ghi nhận trong tháng theo giờ Việt Nam.
  - `enrolled_count`: số học viên được xác nhận nhập học chính thức có mốc `reconciled_at` trong tháng.
- Thêm `AdminDashboardMonthlyTrend`:
  - `points`: mảng đúng 12 phần tử liên tục theo thứ tự thời gian tăng dần.
  - `metadata`: `{ scope: 'ROLLING_12_MONTHS', timezone: 'Asia/Ho_Chi_Minh', enrolled_missing_date_count: number }`.
- Thêm `AdminDashboardCourseStat`:
  - `course_id`: UUID của khóa học (hoặc `null` cho nhóm chưa chọn khóa).
  - `course_code`: mã khóa học (hoặc `'UNASSIGNED'`, `'UNKNOWN'`).
  - `course_title`: tên khóa học.
  - `total_leads`: tổng số lead đăng ký khóa đó trong kỳ chọn.
  - `enrolled_leads`: số lead nhập học có thẩm quyền (`ENROLLED`).
  - `enrollment_rate`: tỷ lệ chuyển đổi nhập học (%, làm tròn 1 chữ số thập phân) hoặc `null` nếu mẫu số = 0.
- Thêm `AdminDashboardCourseBreakdown`:
  - `courses`: mảng thống kê các khóa học sắp xếp giảm dần theo `total_leads`, sau đó `enrolled_leads`.
  - `metadata`: `{ scope: 'FILTERED_REGISTRATION_COHORT', total_courses: number }`.
- Cập nhật `AdminDashboardSummaryData` tích hợp đầy đủ cả 2 trường `monthly_trend` và `course_breakdown`.

#### 2.2 Migration PostgreSQL RPC (`/supabase/migrations/20261007000003_admin_dashboard_summary_charts_rpc.sql`)
- Nâng cấp hàm `public.fn_get_admin_dashboard_summary_metrics(p_start_utc, p_end_utc, p_course_id, p_affiliate_id, p_is_unassigned, p_include_rewards)`:
  - Sinh chuỗi 12 tháng liên tục bằng `generate_series(11, 0, -1)` theo giờ Việt Nam (`Asia/Ho_Chi_Minh`).
  - Gom nhóm `leads_count` theo `TO_CHAR(l.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')`.
  - Gom nhóm `enrolled_count` theo `TO_CHAR(lr.reconciled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM')` với trạng thái có thẩm quyền `ENROLLED`.
  - Thống kê `course_breakdown` theo danh mục khóa học kết hợp nhóm `UNASSIGNED` (lead không gắn `course_id`).
  - Thiết lập `SECURITY DEFINER`, `search_path = public`, phân quyền `REVOKE` từ `anon`/`PUBLIC`, `GRANT EXECUTE` cho `authenticated` và `service_role`.

#### 2.3 Cập nhật Backend Endpoint (`/server.ts`)
- Trong `GET /api/v1/admin/dashboard/summary`:
  - Tính toán `monthly_trend`: Khởi tạo mảng 12 tháng cố định từ `getVietnamMonthList(12)`, truy vấn các lead theo bộ lọc `course_id` và `affiliate_id`, tính `leads_count`, `enrolled_count` và đếm `enrolled_missing_date_count`.
  - Tính toán `course_breakdown`: Truy vấn danh mục khóa học, gom nhóm lead trong kỳ chọn (`rawCohortList`), tính `total_leads`, `enrolled_leads`, `enrollment_rate`, bổ sung nhóm `UNASSIGNED` và sắp xếp chuẩn.
  - Bổ sung `monthly_trend` và `course_breakdown` vào payload trả về cùng metadata tương ứng.

---

### 3. Kết Quả Kiểm Thử Backend Tự Động (Automated Test Verification)

| STT | Kịch bản kiểm thử | Token xác thực | Kết quả HTTP | Dữ liệu trả về thực tế | Trạng thái |
|:---:|:---|:---|:---:|:---|:---:|
| 1 | Admin truy cập Summary tháng này | Admin Session | `200 OK` | `monthly_trend.points` đủ 12 tháng (11/2025 -> 10/2026), `course_breakdown` đủ 8 khóa học, `rewards.available = true` | **ĐẠT** |
| 2 | Staff không có `rewards.summary` | Staff Session | `200 OK` | `monthly_trend` đủ 12 tháng, `course_breakdown` đủ 8 khóa, `rewards.available = false` (`reason_code: PERMISSION_DENIED`) | **ĐẠT** |
| 3 | Lọc theo 1 khóa học cụ thể | Admin Session | `200 OK` | `course_breakdown` chỉ trả 1 khóa học được chọn, `monthly_trend` vẫn đủ 12 tháng với số liệu lọc theo khóa đó | **ĐẠT** |
| 4 | Lọc kỳ tùy chỉnh `CUSTOM` | Admin Session | `200 OK` | `filters` ghi nhận `from_date`, `to_date`, `start_utc`, `end_utc_exclusive`, `course_breakdown` gom nhóm theo kỳ chọn | **ĐẠT** |
| 5 | Truy cập không có token | Không có header | `401 Unauthorized` | Chặn truy cập đúng quy định an toàn | **ĐẠT** |
| 6 | TypeScript Build & Lint | `tsc --noEmit` | `0 lỗi` | Không có lỗi biên dịch hoặc kiểu dữ liệu | **ĐẠT** |

---

### 4. Kết Luận & Chuyển Giao

Bước **A9.7A** đã hoàn thành 100% mục tiêu backend và sẵn sàng cho bước tiếp theo:
- **A9.7B**: Triển khai giao diện 2 biểu đồ (Biểu đồ cột đôi 12 tháng & Biểu đồ thanh ngang phân bố khóa học) trên component `AdminDashboardView.tsx`.
- **Dừng theo yêu cầu**: Chưa triển khai giao diện biểu đồ A9.7B hay danh sách A9.8.
