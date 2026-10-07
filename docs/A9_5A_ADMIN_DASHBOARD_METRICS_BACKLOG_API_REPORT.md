# BÁO CÁO TRIỂN KHAI API CHỈ SỐ VÀ VIỆC CHỜ XỬ LÝ (A9.5A)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_5A_ADMIN_DASHBOARD_METRICS_BACKLOG_API_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026 (Giờ Việt Nam: UTC+7)  
**Trạng thái**: **ĐÃ HOÀN THÀNH 100% VÀ KIỂM THỬ THÀNH CÔNG**

---

## 1. Tổng Quan & Mục Tiêu Triển Khai Bước A9.5A

Triển khai backend service và endpoint chính thức cho module Tổng quan quản trị Admin/Staff:
```http
GET /api/v1/admin/dashboard/summary
```

### Phạm vi đã hoàn thành trong A9.5A:
1. **Chỉ số tuyển sinh theo kỳ (Recruitment Metrics)**: Tổng lượt đăng ký, Chưa nhập học, Đã nhập học, Đã rút hồ sơ, Tỷ lệ nhập học (%), Đã gắn mã EGOV hiệu lực, Nguồn giới thiệu hợp lệ.
2. **Mạng lưới CTV toàn hệ thống (Affiliate Network Metrics)**: Tổng số CTV, CTV đang hoạt động, CTV chờ duyệt, CTV tạm ngưng, CTV bị từ chối.
3. **Việc chờ xử lý toàn hệ thống (Operational Backlog)**: CTV chờ duyệt, Khách mới cần liên hệ, Hồ sơ chờ đối chiếu.
4. **Chuẩn hóa bộ lọc & Metadata**: Múi giờ chuẩn `Asia/Ho_Chi_Minh` (UTC+7), quy đổi ranh giới UTC `start_utc` (inclusive) và `end_utc_exclusive` (exclusive).

### Phạm vi hoãn lại theo đúng lộ trình:
- **A9.5B**: Tổng hợp thù lao, số khoản thưởng chờ/đã duyệt, bảng xếp hạng Top 5 CTV xuất sắc.
- **A9.6**: Giao diện nền, Header bộ lọc và các thẻ KPI tổng quan.
- **A9.7A/B**: API và component Biểu đồ xu hướng 12 tháng & Biểu đồ phân bổ khóa học.
- **A9.8A/B**: API và component 5 lượt đăng ký gần nhất & Bảng Top 5 CTV.
- **A9.9**: Nghiệm thu E2E toàn diện.

---

## 2. Danh Sách Tệp Đã Tạo & Cập Nhật

| STT | Đường dẫn tệp | Loại thay đổi | Nội dung chi tiết |
| :---: | :--- | :---: | :--- |
| **1** | `/supabase/migrations/20261007000001_admin_dashboard_summary_rpc.sql` | **Tạo mới** | Migration tạo hàm RPC `fn_get_admin_dashboard_summary_metrics` với `SECURITY DEFINER`, `SET search_path = public`, kiểm soát quyền gọi chỉ dành cho Admin/Staff. |
| **2** | `/src/types/index.ts` | **Cập nhật** | Bổ sung các kiểu dữ liệu TypeScript: `AdminDashboardPeriod`, `AdminDashboardSummaryFilters`, `AdminDashboardRecruitmentMetrics`, `AdminDashboardAffiliateNetworkMetrics`, `AdminDashboardBacklogMetrics`, `AdminDashboardMetadata`, `AdminDashboardSummaryData`, `AdminDashboardSummaryResponse`. |
| **3** | `/src/services/api.ts` | **Cập nhật** | Import `AdminDashboardSummaryResponse` và bổ sung hàm client `api.getAdminDashboardSummary(params)`. |
| **4** | `/server.ts` | **Cập nhật** | Triển khai validation ngày/UUID/period, thuật toán tính toán múi giờ Việt Nam, logic tổng hợp dữ liệu, middleware `requireStaffOrAdmin` và endpoint `GET /api/v1/admin/dashboard/summary`. |
| **5** | `/docs/PROJECT_NOTE.md` | **Cập nhật** | Bổ sung mục 57 ghi nhận kết quả hoàn thành A9.5A. |
| **6** | `/docs/A9_5A_ADMIN_DASHBOARD_METRICS_BACKLOG_API_REPORT.md` | **Tạo mới** | Báo cáo chi tiết nghiệm thu A9.5A. |

---

## 3. Đặc Tả Hợp Đồng API (API Contract)

### 3.1 Endpoint & Headers
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/v1/admin/dashboard/summary`
- **Request Headers**:
  - `Authorization: Bearer <token>` (Bắt buộc)
- **Response Headers**:
  - `Content-Type: application/json; charset=utf-8`
  - `Cache-Control: private, no-store`

### 3.2 Tham số Query (Query Parameters)
| Tham số | Kiểu | Mặc định | Mô tả & Quy tắc kiểm tra |
| :--- | :---: | :---: | :--- |
| `period` | string | `THIS_MONTH` | Giá trị hợp lệ: `THIS_MONTH`, `LAST_MONTH`, `THIS_YEAR`, `ALL_TIME`, `CUSTOM`. Nếu sai trả `400 INVALID_PERIOD`. |
| `from_date` | string | null | Định dạng `YYYY-MM-DD`. Bắt buộc khi `period = 'CUSTOM'`. Kiểm tra tính hợp lệ lịch thực tế. |
| `to_date` | string | null | Định dạng `YYYY-MM-DD`. Bắt buộc khi `period = 'CUSTOM'`. Phải thỏa `from_date <= to_date`. |
| `course_id` | string | `ALL` | `ALL` hoặc UUID khóa học hợp lệ. Kiểm tra UUID và kiểm tra tồn tại trong CSDL. Nếu sai trả `400`. |
| `affiliate_id` | string | `ALL` | `ALL`, `UNASSIGNED` (lead không qua CTV), hoặc UUID CTV hợp lệ. Kiểm tra UUID và tồn tại. |

### 3.3 Cấu trúc phản hồi thành công (HTTP 200 OK)
```json
{
  "success": true,
  "data": {
    "filters": {
      "period": "THIS_MONTH",
      "from_date": "2026-10-01",
      "to_date": "2026-10-31",
      "start_utc": "2026-09-30T17:00:00.000Z",
      "end_utc_exclusive": "2026-10-31T17:00:00.000Z",
      "course_id": "ALL",
      "affiliate_id": "ALL"
    },
    "recruitment": {
      "total_leads": 8,
      "not_enrolled_leads": 7,
      "enrolled_leads": 1,
      "withdrawn_leads": 0,
      "enrollment_rate": 12.5,
      "egov_active_leads": 1,
      "matched_valid_leads": 1
    },
    "affiliate_network": {
      "total_affiliates": 2,
      "active_affiliates": 1,
      "pending_affiliates": 1,
      "suspended_affiliates": 0,
      "rejected_affiliates": 0
    },
    "backlog": {
      "pending_affiliates": 1,
      "new_leads_to_contact": 7,
      "pending_reconciliation_leads": 7
    },
    "metadata": {
      "timezone": "Asia/Ho_Chi_Minh",
      "generated_at": "2026-10-07T13:54:21.814Z",
      "data_scope": "SYSTEM_WIDE",
      "recruitment_scope": "FILTERED_REGISTRATION_COHORT",
      "network_scope": "CURRENT_ALL_TIME",
      "backlog_scope": "CURRENT_ALL_TIME"
    }
  }
}
```

### 3.4 Bảng Mã Lỗi (Error Codes)
| HTTP Status | Mã lỗi (`code`) | Ý nghĩa & Tình huống kích hoạt |
| :---: | :--- | :--- |
| **401** | `UNAUTHENTICATED` / `TOKEN_EXPIRED` | Chưa gửi token, token rỗng hoặc phiên làm việc đã hết hạn. |
| **403** | `ROLE_FORBIDDEN` | Tài khoản xác thực nhưng không có vai trò `admin` hoặc `staff` (ví dụ: `affiliate`). |
| **403** | `ACCOUNT_DISABLED` | Tài khoản cán bộ hoặc admin bị khóa (`is_active = false`). |
| **400** | `INVALID_PERIOD` | Giá trị `period` không nằm trong danh sách cho phép. |
| **400** | `MISSING_CUSTOM_DATES` | Chọn `period = 'CUSTOM'` nhưng thiếu `from_date` hoặc `to_date`. |
| **400** | `INVALID_DATE_VALUE` | Ngày gửi lên không hợp lệ hoặc không tồn tại trên lịch (ví dụ: 2026-02-30, 2026-04-31). |
| **400** | `INVALID_DATE_RANGE` | Khoảng ngày đảo ngược (`from_date > to_date`). |
| **400** | `INVALID_COURSE_ID_FORMAT` | `course_id` không đúng định dạng chuẩn UUID v4. |
| **400** | `COURSE_NOT_FOUND` | `course_id` đúng định dạng UUID nhưng không tồn tại trong CSDL. |
| **400** | `INVALID_AFFILIATE_ID_FORMAT` | `affiliate_id` không đúng định dạng chuẩn UUID v4. |
| **400** | `AFFILIATE_NOT_FOUND` | `affiliate_id` đúng định dạng UUID nhưng không tồn tại trong CSDL. |
| **500** | `DATABASE_QUERY_ERROR` | Lỗi phát sinh trong quá trình truy vấn cơ sở dữ liệu. |

---

## 4. Công Thức Tính Toán & Các Điều Chỉnh Nghiệp Vụ So Với A9.2–A9.4

### 4.1 Điều chỉnh chỉ số Khách mới cần liên hệ (`new_leads_to_contact`)
- **Trước đây (A9.2)**: Ghi chú điều kiện `counseling_status = 'NEW'` và `admission_status <> 'ENROLLED'`.
- **Chuẩn hóa chính thức (A9.5A)**: Thống nhất áp dụng `counseling_status = 'NEW'` VÀ `resolveAuthoritativeAdmissionStatus(lead) = 'NOT_ENROLLED'`.  
  *Lý do*: Loại trừ hoàn toàn các hồ sơ đã rút (`WITHDRAWN`), vì hồ sơ đã rút không phải khách mới cần gọi tư vấn tuyển sinh ban đầu.

### 4.2 Chuẩn hóa chỉ số Hồ sơ chờ đối chiếu (`pending_reconciliation_leads`)
- **Điều kiện chốt**:
  $$\text{pending\_reconciliation\_leads} = \text{COUNT(leads.id)} \quad \text{với } \text{admission\_status} \neq \text{'WITHDRAWN'} \text{ và không có đối soát hiệu lực}$$
  (Nghĩa là chưa có bản ghi `lead_reconciliations` thuộc `['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID']`).

### 4.3 Đảm bảo Bất biến Tổng Tuyển Sinh (Invariant Equation)
Trong mọi trường hợp lọc, phương trình bảo toàn sau luôn được thỏa mãn 100%:
$$\text{total\_leads} = \text{not\_enrolled\_leads} + \text{enrolled\_leads} + \text{withdrawn\_leads}$$

---

## 5. Bằng Chứng Kiểm Thử Toàn Diện (Test Execution Evidence)

Đã chạy bộ kiểm thử tự động 14 ca test kịch bản API trực tiếp trên môi trường thực tế:

| STT | Kịch bản kiểm thử | Dữ liệu đầu vào | Mã mong đợi | Mã thực tế | Kết quả | Bằng chứng thực thi |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | Chưa đăng nhập (No Token) | Không gửi `Authorization` header | 401 | 401 | **PASS** | `code: UNAUTHENTICATED` |
| **2** | Người dùng CTV gọi API | Token CTV (`demo-session-token-u0000000-0000-0000-0000-000000000002`) | 403 | 403 | **PASS** | `code: ROLE_FORBIDDEN` |
| **3** | Tài khoản bị vô hiệu hóa | Token tài khoản khóa (`is_active = false`) | 403 | 403 | **PASS** | `code: ACCOUNT_DISABLED` |
| **4** | Admin gọi mặc định | Token Admin (`879a11fc-ff89-4019-b2f4-57d7843b631b`), `period=THIS_MONTH` | 200 | 200 | **PASS** | Trả đầy đủ 4 nhóm dữ liệu, `Cache-Control: private, no-store` |
| **5** | Staff (chưa có quyền A5) | Token Staff (`28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`) | 200 | 200 | **PASS** | Gọi thành công summary chỉ số tuyển sinh |
| **6** | Period không hợp lệ | `period=INVALID_PERIOD` | 400 | 400 | **PASS** | `code: INVALID_PERIOD` |
| **7** | Sai định dạng UUID khóa học | `course_id=not-a-uuid` | 400 | 400 | **PASS** | `code: INVALID_COURSE_ID_FORMAT` |
| **8** | Khóa học không tồn tại | `course_id=00000000-0000-0000-0000-000000000000` | 400 | 400 | **PASS** | `code: COURSE_NOT_FOUND` |
| **9** | CUSTOM thiếu ngày | `period=CUSTOM` (không truyền from_date/to_date) | 400 | 400 | **PASS** | `code: MISSING_CUSTOM_DATES` |
| **10** | CUSTOM ngày không có trên lịch | `period=CUSTOM&from_date=2026-02-30&to_date=2026-03-01` | 400 | 400 | **PASS** | `code: INVALID_DATE_VALUE` |
| **11** | CUSTOM khoảng ngày đảo ngược | `period=CUSTOM&from_date=2026-10-15&to_date=2026-10-01` | 400 | 400 | **PASS** | `code: INVALID_DATE_RANGE` |
| **12** | Bộ lọc ALL_TIME | `period=ALL_TIME` | 200 | 200 | **PASS** | `from_date: null`, `start_utc: null`, đếm toàn bộ 8 leads |
| **13** | Lọc CTV tự nhiên | `period=ALL_TIME&affiliate_id=UNASSIGNED` | 200 | 200 | **PASS** | Lọc chính xác 5 leads `affiliate_id IS NULL` |
| **14** | Kiểm tra phương trình bất biến | Toàn bộ 8 leads trong hệ thống | N/A | N/A | **PASS** | `8 === 7 + 1 + 0` (Thỏa mãn 100%) |

---

## 6. Hướng Dẫn Gọi API Kiểm Tra An Toàn

Để kiểm tra API trên môi trường phát triển (không chứa token bí mật):
```bash
# 1. Gọi với vai trò Quản trị viên (Admin)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=THIS_MONTH" \
  -H "Authorization: Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b"

# 2. Gọi với vai trò Cán bộ Tuyển sinh (Staff)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=ALL_TIME" \
  -H "Authorization: Bearer demo-session-token-28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f"

# 3. Gọi với bộ lọc tùy chỉnh (CUSTOM)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=CUSTOM&from_date=2026-10-01&to_date=2026-10-31" \
  -H "Authorization: Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b"
```

---

## 7. Kết Luận & Chuyển Tiếp

- **Bước A9.5A**: **HOÀN THÀNH 100% VÀ ĐÃ ĐƯỢC KIỂM CHỨNG TOÀN DIỆN**.
- **Bước tiếp theo (A9.5B)**: Bổ sung tính toán thù lao (`rewards.pending`, `rewards.approved`), Top 5 CTV xuất sắc và xử lý che giấu dữ liệu cho Staff thiếu quyền `rewards.summary`.
