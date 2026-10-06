# BÁO CÁO TRIỂN KHAI C6.2 — API TỔNG HỢP DASHBOARD VÀ PHÂN QUYỀN TRUY CẬP CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_2_DASHBOARD_API_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Triển khai Backend API & Kiểm thử thành công 100%
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.2

### 1.1. Phạm vi triển khai
1. **Endpoint mới:** Xây dựng endpoint chuẩn hóa `GET /api/v1/affiliate/dashboard/summary` trả về toàn bộ dữ liệu tổng hợp cho Dashboard CTV.
2. **Đồng bộ hóa Endpoint cũ:** Cập nhật `GET /api/v1/affiliate/dashboard` dùng chung service dữ liệu, loại bỏ hoàn toàn các số liệu mẫu (`+ 3`, `+ 2`, `+ 1`) và fallback tự nhân `* 500.000 đ`.
3. **Phân quyền truy cập (Access Control):**
   - Áp dụng middleware chuyên biệt `requireAffiliateDashboardAccess`.
   - CTV `ACTIVE`: Được xem toàn bộ dashboard thời gian thực.
   - CTV `SUSPENDED`: Được xem toàn bộ số liệu lịch sử của chính mình (vẫn khóa tính năng tạo link/mã QR mới theo đúng chính sách bảo toàn dữ liệu).
   - CTV `PENDING_REVIEW` / `REJECTED`: Chặn truy cập với mã lỗi HTTP 403 và thông báo điều hướng phù hợp.
   - Chưa xác thực danh tính: Chặn với mã lỗi HTTP 401.
4. **Quy tắc thương hiệu không ghi cứng (Zero Hardcoded Brand):**
   - Không ghi cứng tên trường hoặc tên viết tắt trường trong các API, message hay component mới.
   - Tái sử dụng trường `system_short_name` từ cấu hình quản trị hệ thống (`system_settings` / `SystemBrandingContext`).

---

## II. DANH SÁCH FILE VÀ MODULE ĐÃ SỬA ĐỔI

| STT | File / Đường dẫn | Loại thay đổi | Nội dung chính |
|---|---|---|---|
| 1 | `/server.ts` | Backend Endpoint & Service | Thêm `requireAffiliateDashboardAccess`, `getAffiliateDashboardSummaryData`, `maskPhone`, `getVietnamMonthList`, `getVietnamMonthKey`. Triển khai `GET /api/v1/affiliate/dashboard/summary` và đồng bộ `GET /api/v1/affiliate/dashboard`. |
| 2 | `/src/types/index.ts` | TypeScript Definitions | Bổ sung các interface: `AffiliateDashboardSummaryData`, `MonthlyTrendItem`, `CourseBreakdownItem`, `RecentLeadItem`. |
| 3 | `/src/services/api.ts` | Client API Gateway | Bổ sung phương thức `getAffiliateDashboardSummary()` có kiểu trả về đầy đủ. |
| 4 | `/docs/CTV_C6_1_DASHBOARD_AUDIT_AND_SPEC.md` | Tài liệu đặc tả | Cập nhật và hiệu chỉnh các điểm xác minh CSDL thực tế (UUID validation, không tự kết luận 0đ khi chưa có nguồn thanh toán). |
| 5 | `/docs/PROJECT_NOTE.md` | Nhật ký dự án | Ghi nhận hoàn thành C6.2, quy tắc thương hiệu và bằng chứng kiểm thử thực tế. |

---

## III. HỢP ĐỒNG API VÀ SCHEMA RESPONSE (`GET /api/v1/affiliate/dashboard/summary`)

### 3.1. Thông số Endpoint
- **Phương thức:** `GET`
- **Đường dẫn:** `/api/v1/affiliate/dashboard/summary`
- **Xác thực:** Header `Authorization: Bearer <token>`
- **Phân quyền:** Bắt buộc tài khoản CTV có trạng thái `ACTIVE` hoặc `SUSPENDED`.

### 3.2. Response Schema chuẩn
```json
{
  "success": true,
  "data": {
    "affiliate": {
      "id": "79274b39-8476-4241-bdde-e4f61e79a615",
      "full_name": "Đào Văn Phương",
      "affiliate_code": "STHCCTV3042",
      "status": "ACTIVE",
      "suspension_reason": null
    },
    "metrics": {
      "total_leads": 1,
      "not_enrolled_leads": 1,
      "enrolled_leads": 0,
      "matched_valid_leads": 1
    },
    "rewards": {
      "pending": {
        "amount": 500000,
        "count": 1
      },
      "approved": {
        "amount": 0,
        "count": 0
      },
      "paid": {
        "available": false,
        "amount": null,
        "count": null,
        "reason_code": "PAYMENT_TRACKING_NOT_AVAILABLE"
      }
    },
    "monthly_trend": [
      { "month_key": "2025-11", "month_label": "T11/2025", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2025-12", "month_label": "T12/2025", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-01", "month_label": "T01/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-02", "month_label": "T02/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-03", "month_label": "T03/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-04", "month_label": "T04/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-05", "month_label": "T05/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-06", "month_label": "T06/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-07", "month_label": "T07/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-08", "month_label": "T08/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-09", "month_label": "T09/2026", "leads_count": 0, "enrolled_count": 0 },
      { "month_key": "2026-10", "month_label": "T10/2026", "leads_count": 1, "enrolled_count": 0 }
    ],
    "course_breakdown": [
      {
        "course_id": "13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1",
        "course_code": "BA",
        "course_title": "Bánh Âu",
        "total_leads": 1,
        "enrolled_leads": 0
      }
    ],
    "recent_leads": [
      {
        "id": "3f8f2715-0477-42a1-a475-86cdb91bef01",
        "full_name": "Lê Văn Test",
        "phone_masked": "09012****",
        "course_id": "13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1",
        "course_title": "Bánh Âu",
        "created_at": "2026-10-04T08:59:46.389492+00:00",
        "counseling_status": "CONSULTING",
        "admission_status": "NOT_ENROLLED",
        "reconciliation_status": "MATCHED_VALID",
        "has_egov_link": true,
        "external_admission_code": "1818002"
      }
    ],
    "metadata": {
      "timezone": "Asia/Ho_Chi_Minh",
      "generated_at": "2026-10-06T13:01:24.986Z",
      "data_scope": "AFFILIATE_OWNED_DATA",
      "payment_tracking_status": "PAYMENT_TRACKING_NOT_AVAILABLE"
    }
  }
}
```

---

## IV. NGUỒN DỮ LIỆU VÀ CÔNG THỨC TÍNH TOÁN THỰC TẾ

1. **Chuỗi định danh bảo mật:**
   - Server trích xuất `affiliate.id` và `affiliate.user_id` từ token phiên qua `resolveAffiliateSession(req)`.
   - Có cơ chế kiểm tra `isValidUuid` ngăn chặn lỗi cú pháp `22P02` đối với các token giả lập không đúng chuẩn UUID.
   - Tuyệt đối không nhận `affiliate_id` từ query params hay body của request.

2. **Chỉ số Khách / Hồ sơ (Metrics):**
   - `total_leads`: `COUNT(leads.id)` thuộc CTV (loại bỏ hoàn toàn +3 mock).
   - `enrolled_leads`: `COUNT(leads.id)` có `admission_status = 'ENROLLED'`.
   - `not_enrolled_leads`: `COUNT(leads.id)` có `admission_status != 'ENROLLED'`.
   - `matched_valid_leads`: `COUNT(leads.id)` có `reconciliation_status = 'MATCHED_VALID'`.

3. **Thù lao (Rewards):**
   - `pending`: `SUM(rewards.amount)` và `COUNT(rewards.id)` có `status = 'PENDING_APPROVAL'`.
   - `approved`: `SUM(rewards.amount)` và `COUNT(rewards.id)` có `status = 'APPROVED'`.
   - `paid`: Do Phase 1 chưa có module theo dõi thanh toán trực tuyến, trả về `available: false, amount: null, count: null, reason_code: 'PAYMENT_TRACKING_NOT_AVAILABLE'`. Không trả `0 đ` giả lập.
   - Các khoản `VOIDED` (đã hủy) và `REJECTED` (từ chối) được loại trừ triệt để.

4. **Biểu đồ 12 tháng (Monthly Trend):**
   - Tính toán đúng 12 tháng liên tục kết thúc tại tháng hiện tại theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
   - Đăng ký mới gom nhóm theo `getVietnamMonthKey(lead.created_at)`.
   - Nhập học gom nhóm theo ngày xác nhận nhập học chính thức từ `lead_reconciliations.reconciled_at` (với `admission_status = 'ENROLLED'`).
   - Tháng không phát sinh hiển thị giá trị `0`.

5. **Phân bố theo khóa học (Course Breakdown):**
   - Gom nhóm toàn bộ leads theo `course_id`.
   - Giữ nguyên các khóa học đã đóng hoặc ẩn tuyển sinh để bảo toàn số liệu lịch sử.
   - Sắp xếp giảm dần theo tổng số đăng ký (`total_leads`), tiêu chí phụ là `enrolled_leads`.

6. **Danh sách 5 khách gần đây (Recent Leads):**
   - Sắp xếp `created_at DESC`, `id DESC`, lấy tối đa 5 bản ghi.
   - Mask 4 số cuối điện thoại tại server: `09012****`.
   - Trả về mã EGOV từ `lead_egov_links` có `link_status = 'ACTIVE'`.
   - Ẩn hoàn toàn ghi chú nội bộ cán bộ và số phiếu thu nội bộ.

---

## V. KẾT QUẢ KIỂM THỬ THỰC TẾ (TEST RESULTS)

| STT | Kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|
| 1 | Không truyền Bearer token | HTTP 401 Unauthorized | Trả về `{"success":false,"error":"Yêu cầu đăng nhập tài khoản Cộng tác viên để xem dữ liệu.","affiliate_status":"UNAUTHORIZED"}` | **PASS** |
| 2 | Tài khoản CTV PENDING_REVIEW | HTTP 403 Forbidden | Trả về `{"success":false,"error":"Tài khoản Cộng tác viên của bạn đang ở trạng thái CHỜ DUYỆT...","affiliate_status":"PENDING_REVIEW"}` | **PASS** |
| 3 | CTV A truy cập dữ liệu | Chỉ thấy lead và thưởng của CTV A | Trả về đúng 1 lead của CTV A (`Lê Văn Test`) và 1 khoản thưởng `PENDING_APPROVAL` (500.000 đ), không thấy lead của CTV B | **PASS** |
| 4 | CTV B truy cập dữ liệu | Chỉ thấy lead của CTV B | Trả về đúng 2 lead của CTV B (`Trần Văn Tuyển Sinh C14 Real Test`), 0 khoản thưởng | **PASS** |
| 5 | Dữ liệu thù lao VOIDED | Không cộng vào Chờ duyệt/Đã duyệt | CTV A có 2 bản ghi thưởng (1 VOIDED, 1 PENDING_APPROVAL) -> API tính đúng 1 khoản Chờ duyệt = 500.000 đ | **PASS** |
| 6 | Thù lao thanh toán chưa hỗ trợ | Trả `available: false` và `null` | Trả về `available: false, amount: null, count: null, reason_code: "PAYMENT_TRACKING_NOT_AVAILABLE"` | **PASS** |
| 7 | Chuỗi 12 tháng theo múi giờ VN | Đủ 12 tháng từ T11/2025 đến T10/2026 | Mảng `monthly_trend` có đúng 12 phần tử liên tục, nhãn chuẩn tiếng Việt | **PASS** |
| 8 | Endpoint cũ `GET /api/v1/affiliate/dashboard` | Đồng bộ dữ liệu thật, bỏ mock seed | Trả về dữ liệu thật khớp 100% với endpoint summary, không còn +3, +2, +1 hay *500000 | **PASS** |
| 9 | Kiểm tra biên dịch & Linting | Không có lỗi TypeScript | `npm run lint` (**PASS 0 lỗi**) và `compile_applet` (**PASS Build succeeded**) | **PASS** |

---

## VI. KẾT LUẬN VÀ BÀN GIAO
- **Bước C6.2 đã hoàn thành 100% mục tiêu backend và API.**
- Toàn bộ dữ liệu mock/seed đã được loại bỏ triệt để.
- Quyền truy cập và bảo mật cách ly giữa các CTV được kiểm chứng thực tế trên CSDL.
- Sẵn sàng chuyển sang các bước xây dựng giao diện C6.3 – C6.6.
