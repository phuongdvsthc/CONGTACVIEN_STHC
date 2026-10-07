# BÁO CÁO TRIỂN KHAI API THÙ LAO TỔNG QUAN QUẢN TRỊ ADMIN / STAFF (A9.5B)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_5B_ADMIN_DASHBOARD_REWARDS_API_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026 (Giờ Việt Nam: UTC+7)  
**Trạng thái**: **ĐÃ HOÀN THÀNH 100% VÀ KIỂM THỬ THÀNH CÔNG**

---

## 1. Tổng Quan & Phạm Vi Triển Khai Bước A9.5B

Bước A9.5B mở rộng endpoint hiện có `GET /api/v1/admin/dashboard/summary` để bổ sung khối dữ liệu **Thù lao (`rewards`)** với cơ chế phân quyền kiểm tra chặt chẽ theo quyền hiệu lực `rewards.summary`.

### 1.1 Các Hạng Mục Đã Hoàn Thành Trong A9.5B
1. **Kiểm soát phân quyền tài chính thời gian thực (`rewards.summary`)**:
   - Quản trị viên (`admin`): Toàn quyền xem số liệu thù lao.
   - Cán bộ Tuyển sinh (`staff`): Chỉ xem được số liệu thù lao nếu có quyền hiệu lực `rewards.summary` (thông qua hàm RPC `fn_has_permission` hoặc nhóm quyền `reward_manager`).
   - Staff không có quyền `rewards.summary` (kể cả khi có `rewards.view` hoặc `rewards.view_detail`): Nhận phản hồi HTTP 200 an toàn, khối `rewards` bị che giấu dữ liệu (`available: false`, `reason_code: "PERMISSION_DENIED"`, toàn bộ số tiền và số khoản là `null`).
2. **Công thức và phạm vi tính toán thù lao**:
   - `pending_all`: Tổng tiền và số khoản thưởng `PENDING_APPROVAL` trên toàn hệ thống (All-Time).
   - `approved_period`: Tổng tiền và số khoản thưởng `APPROVED` được phê duyệt trong kỳ chọn (`approved_at` thuộc kỳ lọc chuẩn hóa của A9.5A).
   - `approved_all`: Tổng tiền và số khoản thưởng `APPROVED` trên toàn hệ thống (All-Time).
   - `paid`: `available: false`, `reason_code: "PAYMENT_TRACKING_NOT_AVAILABLE"` (do giai đoạn 1 chưa có module quản lý chi trả ngoại tuyến).
   - `approved_missing_date_count`: Đếm các khoản `APPROVED` thiếu `approved_at` để đảm bảo tính minh bạch dữ liệu.
3. **Bảo mật và cô lập Token Demo**:
   - Khóa cơ chế chấp nhận `demo-session-token-` khi ứng dụng chạy ở môi trường `NODE_ENV === 'production'`.
4. **Điều chỉnh lộ trình nghiệp vụ**:
   - **Bảng Top 5 CTV xuất sắc (Leaderboard)** được thống nhất chuyển sang triển khai tại bước **A9.8A** cùng với danh sách khách hàng gần đây, không triển khai trong bước API thù lao A9.5B.

---

## 2. Danh Sách Tệp Đã Tạo & Cập Nhật

| STT | Đường dẫn tệp | Loại thay đổi | Nội dung chi tiết |
| :---: | :--- | :---: | :--- |
| **1** | `/supabase/migrations/20261007000002_admin_dashboard_summary_with_rewards_rpc.sql` | **Tạo mới** | Migration nâng cấp hàm RPC `fn_get_admin_dashboard_summary_metrics` hỗ trợ tính toán thù lao, kiểm tra quyền caller và redaction an toàn. |
| **2** | `/src/types/index.ts` | **Cập nhật** | Định nghĩa các TypeScript interfaces: `AdminDashboardRewardAmountCount`, `AdminDashboardPaidRewardStatus`, `AdminDashboardRewardsAuthorizedMetadata`, `AdminDashboardRewardsAuthorized`, `AdminDashboardRewardsDenied`, `AdminDashboardRewardsMetrics`. |
| **3** | `/server.ts` | **Cập nhật** | Xây dựng helper `checkUserHasRewardSummaryPermission`, tích hợp logic tổng hợp thù lao, xử lý ranh giới ngày `approved_at`, chặn token demo trên production và hoàn thiện endpoint `GET /api/v1/admin/dashboard/summary`. |
| **4** | `/docs/PROJECT_NOTE.md` | **Cập nhật** | Bổ sung mục 58 ghi nhận hoàn thành A9.5B và điều chỉnh Top CTV sang A9.8A. |
| **5** | `/docs/A9_5B_ADMIN_DASHBOARD_REWARDS_API_REPORT.md` | **Tạo mới** | Báo cáo chi tiết nghiệm thu A9.5B. |

---

## 3. Đặc Tả Hợp Đồng Dữ Liệu Hoàn Chỉnh (Master API Contract)

### 3.1 Endpoint & Headers
- **Phương thức**: `GET`
- **Đường dẫn**: `/api/v1/admin/dashboard/summary`
- **Headers**:
  - `Authorization: Bearer <token>` (Bắt buộc)
- **Response Headers**:
  - `Cache-Control: private, no-store`
  - `Content-Type: application/json; charset=utf-8`

### 3.2 Cấu Trúc Phản Hồi Khi Có Quyền `rewards.summary` (Admin hoặc Staff có quyền)
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
    "rewards": {
      "available": true,
      "pending_all": {
        "amount": 0,
        "count": 0
      },
      "approved_period": {
        "amount": 500000,
        "count": 1
      },
      "approved_all": {
        "amount": 500000,
        "count": 1
      },
      "paid": {
        "available": false,
        "amount": null,
        "count": null,
        "reason_code": "PAYMENT_TRACKING_NOT_AVAILABLE"
      },
      "metadata": {
        "currency": "VND",
        "pending_scope": "SYSTEM_WIDE_ALL_TIME",
        "approved_period_scope": "SYSTEM_WIDE_SELECTED_APPROVAL_PERIOD",
        "approved_all_scope": "SYSTEM_WIDE_ALL_TIME",
        "approved_missing_date_count": 0
      }
    },
    "metadata": {
      "timezone": "Asia/Ho_Chi_Minh",
      "generated_at": "2026-10-07T14:03:45.120Z",
      "data_scope": "SYSTEM_WIDE",
      "recruitment_scope": "FILTERED_REGISTRATION_COHORT",
      "network_scope": "CURRENT_ALL_TIME",
      "backlog_scope": "CURRENT_ALL_TIME"
    }
  }
}
```

### 3.3 Cấu Trúc Phản Hồi Khi Không Có Quyền `rewards.summary` (Staff thông thường)
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
    "rewards": {
      "available": false,
      "reason_code": "PERMISSION_DENIED",
      "pending_all": null,
      "approved_period": null,
      "approved_all": null,
      "paid": null
    },
    "metadata": {
      "timezone": "Asia/Ho_Chi_Minh",
      "generated_at": "2026-10-07T14:03:45.120Z",
      "data_scope": "SYSTEM_WIDE",
      "recruitment_scope": "FILTERED_REGISTRATION_COHORT",
      "network_scope": "CURRENT_ALL_TIME",
      "backlog_scope": "CURRENT_ALL_TIME"
    }
  }
}
```

---

## 4. Cơ Chế Phân Quyền & Kiểm Soát Token An Toàn

### 4.1 Cơ chế kiểm quyền phân tầng Backend
1. **Kiểm tra vai trò**:
   - Nếu `user.role === 'admin'`: Cấp quyền truy cập khối thù lao (`hasRewardSummaryPerm = true`).
2. **Kiểm tra quyền Staff qua RPC & CSDL**:
   - Gọi hàm RPC `fn_has_permission(p_user_id, 'rewards.summary')`.
   - Tra cứu quan hệ nhóm quyền `staff_permission_groups` $\rightarrow$ `permission_group_items`.
   - Quyền `rewards.view` hoặc `rewards.view_detail` **không** được tự động nâng cấp thành `rewards.summary`.
3. **Redaction tuyệt đối**:
   - Khi không có quyền, backend không thực hiện câu truy vấn `rewards` và trả về `null` cho các trường tài chính.

### 4.2 Bảo vệ Môi Trường Production
- Đã thêm điều kiện kiểm tra môi trường: Khi `process.env.NODE_ENV === 'production'`, token dạng `demo-session-token-*` sẽ bị từ chối ngay lập tức với mã lỗi HTTP 401 `UNAUTHORIZED_DEMO_TOKEN`. Môi trường production bắt buộc phải sử dụng JWT token hợp lệ do Supabase Auth phát hành.

---

## 5. Bằng Chứng Kiểm Thử Nghiệm Thu (Verification Evidence)

Đã thực hiện kiểm thử tự động toàn diện trên hệ thống thực tế:

| STT | Kịch bản kiểm thử | Mô tả & Dữ liệu kiểm tra | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | Admin truy cập Summary | Token Admin | `rewards.available = true`, trả số tiền/số khoản `pending_all`, `approved_period`, `approved_all` | `available: true`, `approved_all: 500.000đ, count: 1` | **PASS** |
| **2** | Staff không có quyền | Token Staff (chưa cấp `rewards.summary`) | HTTP 200, `rewards.available = false`, `reason_code = 'PERMISSION_DENIED'`, các trường số tiền là `null` | `available: false`, `pending_all: null`, `approved_period: null` | **PASS** |
| **3** | Staff được gán `reward_manager` | Gán nhóm `reward_manager` cho Staff | `rewards.available = true`, xem được số tiền đầy đủ | `available: true`, `approved_all: 500.000đ` | **PASS** |
| **4** | Staff bị đổi sang `reward_viewer` | Cập nhật nhóm quyền sang `reward_viewer` | `rewards.available = false`, `reason_code = 'PERMISSION_DENIED'` | `available: false`, che giấu toàn bộ tiền | **PASS** |
| **5** | Lọc kỳ `LAST_MONTH` | Tháng 09/2026 (không có duyệt thưởng) | `approved_period: { amount: 0, count: 0 }`, `approved_all: { amount: 500.000, count: 1 }` | `approved_period.count = 0`, `approved_all.count = 1` | **PASS** |
| **6** | Lọc kỳ `ALL_TIME` | Không giới hạn ngày | `approved_period` khớp 100% với `approved_all` | `approved_period.amount === approved_all.amount (500.000đ)` | **PASS** |
| **7** | Lọc theo khóa học `course_id` | Thay đổi `course_id` | Chỉ số tuyển sinh thay đổi, số tiền thù lao giữ nguyên phạm vi toàn trường | Thù lao không bị ảnh hưởng bởi bộ lọc khóa | **PASS** |
| **8** | Kiểm tra hồi quy A9.5A | Chưa đăng nhập (401), CTV (403), Vô hiệu hóa (403), Sai kỳ (400), Sai ngày (400) | Giữ nguyên 100% mã lỗi và hành vi A9.5A | Tất cả các ca hồi quy đạt chuẩn | **PASS** |

- **Typecheck & Lint (`tsc --noEmit`)**: **PASS (0 lỗi, 0 cảnh báo)**.
- **Build Applet (`compile_applet`)**: **PASS (Build succeeded)**.

---

## 6. Hướng Dẫn Gọi API Kiểm Tra An Toàn (Placeholders Only)

```bash
# 1. Gọi với tài khoản Quản trị viên (Admin)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=THIS_MONTH" \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>"

# 2. Gọi với tài khoản Cán bộ có quyền rewards.summary (Phụ trách thù lao)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=THIS_MONTH" \
  -H "Authorization: Bearer <REWARD_MANAGER_STAFF_TOKEN>"

# 3. Gọi với tài khoản Cán bộ thông thường (Không có quyền thù lao)
curl -X GET "http://localhost:3000/api/v1/admin/dashboard/summary?period=THIS_MONTH" \
  -H "Authorization: Bearer <REGULAR_STAFF_TOKEN>"
```

---

## 7. Kết Luận & Kế Hoạch Bước Tiếp Theo

- **Bước A9.5B**: **HOÀN THÀNH 100% VÀ ĐÃ ĐƯỢC KIỂM CHỨNG TOÀN DIỆN**.
- **Bước tiếp theo (A9.6)**: Triển khai Giao diện Tổng quan Quản trị (`AdminDashboardView.tsx`), Header Bộ lọc, Khối KPI Tuyển sinh, Khối KPI Vận hành và Khối Thẻ Thù lao (kèm xử lý ẩn/hiện theo quyền).
- **Lưu ý**: Bảng xếp hạng Top 5 CTV xuất sắc và Danh sách 5 lượt đăng ký mới nhất sẽ được triển khai chi tiết tại các bước **A9.8A** và **A9.8B**.
