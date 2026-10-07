# ĐẶC TẢ PHÂN QUYỀN ADMIN / STAFF TRONG TỔNG QUAN QUẢN TRỊ (A9.3)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_3_ADMIN_STAFF_ACCESS_SPEC.md`  
**Thời điểm lập**: 2026-10-07  
**Căn cứ kỹ thuật**: 
- `/docs/A9_1_ADMIN_DASHBOARD_AUDIT_REPORT.md` (Kiểm kê hiện trạng A9.1).
- `/docs/A9_2_ADMIN_DASHBOARD_METRICS_SPEC.md` (Đặc tả chỉ số & công thức A9.2).
- `/docs/PQ_1_3_A5_PERMISSIONS_FOUNDATION_REPORT.md` & `/docs/PQ_4_5_A5_PERMISSIONS_MANAGEMENT_REPORT.md`.
- Mã nguồn `server.ts`, migration SQL `20261006000001_a5_permissions_foundation.sql`, `20261006000002_a5_rewards_rpc_upgrade.sql`.
**Mục tiêu**: Chốt toàn diện ma trận phân quyền, quy tắc trả dữ liệu có thẩm quyền (Permission-Aware Redaction), cơ chế thu hồi quyền thời gian thực, phòng chống rò rỉ dữ liệu tài chính/PII và thiết lập ma trận kiểm thử quyền hạn cho Module A9. Tuyệt đối **không** tạo API A9, chưa sửa giao diện, chưa thay đổi CSDL hoặc gán/thu hồi quyền trên dữ liệu thật trong bước A9.3.

---

## MỤC LỤC
1. [Xác Minh Cơ Chế Phân Quyền Hiện Hành & Giới Hạn Kiểm Tra](#1-xác-minh-cơ-chế-phân-quyền-hiện-hành--giới-hạn-kiểm-tra)
2. [Quy Tắc Truy Cập Module Tổng Quan (A9 Route Guard)](#2-quy-tắc-truy-cập-module-tổng-quan-a9-route-guard)
3. [Ma Trận Phân Quyền Theo Khối Giao Diện & Chỉ Số Dashboard A9](#3-ma-trận-phân-quyền-theo-khối-giao-diện--chỉ-số-dashboard-a9)
4. [Phân Định Độc Lập Giữa Quyền Tổng Hợp, Danh Sách, Chi Tiết & Thao Tác](#4-phân-định-độc-lập-giữa-quyền-tổng-hợp-danh-sách-chi-tiết--thao-tác)
5. [Quy Tắc Trả Dữ Liệu Backend & Mã Lý Do (Data Redaction Engine)](#5-quy-tắc-trả-dữ-liệu-backend--mã-lý-do-data-redaction-engine)
6. [Quy Tắc Hiển Thị Giao Diện, Điều Hướng & Bảo Vệ PII](#6-quy-tắc-hiển-thị-giao-diện-điều-hướng--bảo-vệ-pii)
7. [Cơ Chế Thu Hồi Quyền, Đổi Vai Trò & Quản Lý Cache Phiên](#7-cơ-chế-thu-hồi-quyền-đổi-vai-trò--quản-lý-cache-phiên)
8. [Rà Soát & Ngăn Chặn Các Đường Rò Rỉ Dữ Liệu (Data Leak Prevention)](#8-rà-soát--ngăn-chặn-các-đường-rò-rỉ-dữ-liệu-data-leak-prevention)
9. [Ma Trận Kiểm Thử Phân Quyền Chi Tiết (17 Kịch Bản)](#9-ma-trận-kiểm-thử-phân-quyền-chi-tiết-17-kịch-bản)
10. [Tổng Hợp Bàn Giao & Kế Hoạch Chuyển Tiếp Sang A9.4–A9.9](#10-tổng-hợp-bàn-giao--kế-hoạch-chuyển-tiếp-sang-a94a99)

---

## 1. Xác Minh Cơ Chế Phân Quyền Hiện Hành & Giới Hạn Kiểm Tra

### 1.1 Cơ chế xác thực và nhận diện quyền trong mã nguồn
1. **Xác thực phiên làm việc (`server.ts`)**:
   - Backend trích xuất JWT token từ `Authorization: Bearer <token>` hoặc demo session token.
   - Xác thực qua Supabase Auth Admin API (`supabaseAuth.auth.getUser(token)`).
   - Đọc trực tiếp dòng người dùng từ bảng `public.profiles` để lấy `role` (`'admin' | 'staff' | 'affiliate'`) và `is_active` (`BOOLEAN`).
   - Tuyệt đối **không** tin tưởng role do client tự gửi lên trong request body hoặc query parameters.
2. **Cơ chế phân quyền RBAC (`20261006000001_a5_permissions_foundation.sql`)**:
   - **Bảng danh mục quyền**: `public.permissions` gồm 7 quyền A5 chuẩn hóa: `rewards.view`, `rewards.view_detail`, `rewards.approve`, `rewards.reject`, `rewards.void`, `rewards.summary`, `rewards.export`.
   - **Bảng nhóm quyền**: `public.permission_groups` (`reward_manager` có cả 7 quyền; `reward_viewer` có `rewards.view` và `rewards.view_detail`).
   - **Bảng gán quyền nhân viên**: `public.staff_permission_groups` với trường `is_active` (cho phép bật/tắt quyền gán).
   - **Hàm RPC kiểm quyền trên CSDL**:
     - `public.fn_get_user_permissions(p_user_id UUID)`: Nếu `role = 'admin'` $\rightarrow$ trả về toàn bộ 7 quyền; nếu `role = 'staff'` $\rightarrow$ trả về các `permission_code` từ các nhóm có `spg.is_active = TRUE`; CTV hoặc tài khoản vô hiệu hóa trả về rỗng.
     - `public.fn_has_permission(p_user_id UUID, p_perm TEXT)`: Kiểm tra user có sở hữu quyền `p_perm` hay không.
3. **Các Middleware bảo vệ API Backend (`server.ts`)**:
   - `requireStaffOrAdmin`: Chấp nhận Admin hoặc Staff đang hoạt động (`is_active = true`). Chặn 401 nếu chưa đăng nhập, chặn 403 `ACCOUNT_DISABLED` nếu bị khóa, chặn 403 `ROLE_FORBIDDEN` nếu là CTV.
   - `requireAdminOnly`: Chỉ chấp nhận Admin (`role = 'admin'`). Chặn 403 `ADMIN_ONLY` đối với Staff và CTV.
   - `requirePermission(code)`: Chấp nhận Admin, hoặc Staff sở hữu quyền hiệu lực `code` qua `fn_has_permission`. Chặn 403 `PERMISSION_DENIED` nếu thiếu quyền.

### 1.2 Giới hạn kiểm tra thực tế
- **Đã xác minh**: Code middleware, hàm RPC PostgreSQL, ràng buộc RLS, cơ chế kiểm tra `is_active`, các endpoint A1–A7 và PQ.
- **Giới hạn**: Không gán/thu hồi quyền thật trên CSDL production trong bước A9.3; việc đánh giá dựa trên logic kiểm soát tĩnh và luồng thực thi thực tế đã nghiệm thu từ các bước PQ.1–PQ.5.

---

## 2. Quy Tắc Truy Cập Module Tổng Quan (A9 Route Guard)

### 2.1 Quyền truy cập vào Dashboard Tổng quan `/admin`
Hệ thống giữ nguyên cơ chế Route Guard hiện hành, không thêm mã quyền mới (`dashboard.view` chưa cần thiết ở giai đoạn này):
- **Quản trị viên (`role = 'admin'`)**: Được phép truy cập toàn bộ Dashboard A9.
- **Cán bộ tuyển sinh (`role = 'staff'`)**: Được phép truy cập Dashboard A9 (xem các chỉ số tuyển sinh, khóa học, CTV, lead mới; các khối tài chính được kiểm quyền riêng).
- **Cộng tác viên (`role = 'affiliate'`)**: Bị chặn truy cập toàn bộ `/admin` (HTTP 403 `ROLE_FORBIDDEN`).
- **Chưa đăng nhập (Unauthenticated)**: Bị chuyển hướng về `/login?redirect_to=/admin` (HTTP 401 `UNAUTHENTICATED`).
- **Tài khoản bị vô hiệu hóa (`is_active = false`)**: Bị chặn truy cập (HTTP 403 `ACCOUNT_DISABLED`).

### 2.2 Phạm vi dữ liệu hiển thị (Data Scope)
- Đối với cả Admin và Staff, dữ liệu tuyển sinh, khóa học và CTV trên Dashboard A9 là **toàn hệ thống STHC_CTV**.
- **Tuyệt đối không** tự động giới hạn Staff chỉ xem hồ sơ lead do mình phụ trách (vì hệ thống phân công tuyển sinh giai đoạn này là dùng chung toàn trường).

---

## 3. Ma Trận Phân Quyền Theo Khối Giao Diện & Chỉ Số Dashboard A9

Dashboard Tổng quan Quản trị A9 được chia thành 3 khối thẩm quyền độc lập:

```
┌────────────────────────────────────────────────────────────────────────┐
│ KHỐI A: TUYỂN SINH, KHÓA HỌC, MẠNG LƯỚI CTV & VẬN HÀNH                  │
│ Quyền yêu cầu: Admin HOẶC Staff (Đang hoạt động)                       │
│ ├─ TS_TOTAL_LEADS, TS_NOT_ENROLLED, TS_ENROLLED, TS_WITHDRAWN, Tỷ lệ  │
│ ├─ TS_EGOV_ACTIVE, TS_MATCHED_VALID                                    │
│ ├─ CTV_TOTAL, CTV_ACTIVE, CTV_PENDING, CTV_SUSPENDED                  │
│ ├─ OP_NEW_LEADS, OP_PENDING_RECON                                      │
│ ├─ Biểu đồ 12 tháng Đăng ký & Nhập học                                │
│ ├─ Biểu đồ Phân bố Tuyển sinh theo Khóa học                           │
│ └─ Danh sách 5 Khách hàng đăng ký gần đây                              │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ KHỐI B: THÙ LAO & TÀI CHÍNH VINH DANH                                 │
│ Quyền yêu cầu: Admin HOẶC Staff có quyền `rewards.summary`             │
│ ├─ REW_PENDING_ALL (Số khoản & Tổng tiền thù lao chờ duyệt)            │
│ ├─ REW_APPROVED_PERIOD (Số khoản & Tổng tiền thù lao đã duyệt kỳ này)  │
│ ├─ REW_APPROVED_ALL (Tổng thù lao đã duyệt còn hiệu lực toàn bộ TG)    │
│ ├─ REW_PAID (Thẻ theo dõi chi trả - available: false)                  │
│ └─ Bảng xếp hạng Top 5 CTV xuất sắc (Leaderboard theo tiền duyệt)      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴────────────────────────────────────┐
│ KHỐI C: NHẬT KÝ KIỂM TOÁN & CÔNG CỤ QUẢN TRỊ HỆ THỐNG                  │
│ Quyền yêu cầu: CHỈ DÀNH CHO ADMIN (`role = 'admin'`)                   │
│ ├─ Nhật ký 5 hoạt động kiểm toán gần đây (`audit_logs`)                │
│ └─ Nút điều hướng sang Quản trị hệ thống & Quản lý phân quyền          │
└────────────────────────────────────────────────────────────────────────┘
```

### Bảng Ma Trận Chi Tiết:

| Khối giao diện / Chỉ số | Mã chỉ số | Admin (`role = 'admin'`) | Staff có `reward_manager` (Đủ 7 quyền) | Staff có `reward_viewer` (Chỉ view/detail) | Staff thông thường (Chưa gán quyền A5) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Tổng lượt đăng ký trong kỳ** | `TS_TOTAL_LEADS` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Chưa nhập học / Đã nhập học / Đã rút học** | `TS_NOT_ENROLLED`, `TS_ENROLLED`, `TS_WITHDRAWN` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Tỷ lệ nhập học (%)** | `TS_ENROLL_RATE` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Hồ sơ có mã EGOV hiệu lực** | `TS_EGOV_ACTIVE` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Hồ sơ có nguồn CTV hợp lệ** | `TS_MATCHED_VALID` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Mạng lưới CTV (Active, Pending, Suspended)**| `CTV_TOTAL`, `CTV_ACTIVE`, `CTV_PENDING` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Khách mới cần liên hệ ngay** | `OP_NEW_LEADS` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Hồ sơ chờ đối chiếu** | `OP_PENDING_RECON` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Biểu đồ cột 12 tháng ĐK & Nhập học** | `CHART_MONTHLY_TREND` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Biểu đồ thanh phân bố Khóa học** | `CHART_COURSE_BREAKDOWN`| Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Danh sách 5 khách hàng gần đây** | `LIST_RECENT_LEADS` | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ | Xem đầy đủ |
| **Thù lao chờ duyệt (Số khoản & Số tiền)** | `REW_PENDING_ALL` | Xem đầy đủ | Xem đầy đủ | **BỊ ẨN** | **BỊ ẨN** |
| **Thù lao đã duyệt trong kỳ (Khoản & Tiền)** | `REW_APPROVED_PERIOD` | Xem đầy đủ | Xem đầy đủ | **BỊ ẨN** | **BỊ ẨN** |
| **Tổng thù lao đã duyệt (Toàn bộ thời gian)** | `REW_APPROVED_ALL` | Xem đầy đủ | Xem đầy đủ | **BỊ ẨN** | **BỊ ẨN** |
| **Thẻ thù lao đã thanh toán** | `REW_PAID` | `"Chưa có dữ liệu"` | `"Chưa có dữ liệu"` | **BỊ ẨN** | **BỊ ẨN** |
| **Top 5 CTV xuất sắc (Leaderboard)** | `LIST_TOP_AFFILIATES` | Xem đầy đủ | Xem đầy đủ | **BỊ ẨN** | **BỊ ẨN** |
| **Nhật ký 5 sự kiện kiểm toán gần nhất** | `LIST_RECENT_AUDITS` | Xem đầy đủ | **BỊ ẨN** | **BỊ ẨN** | **BỊ ẨN** |

> **Quy tắc bảo mật quan trọng về số lượng khoản thưởng**: Số lượng khoản thưởng (`count`) cũng là thông tin tài chính nhạy cảm. Do đó, khi Staff thiếu quyền `rewards.summary`, hệ thống **ẩn cả số tiền (`amount`) lẫn số lượng khoản (`count`)**, không được để lộ số khoản.

---

## 4. Phân Định Độc Lập Giữa Quyền Tổng Hợp, Danh Sách, Chi Tiết & Thao Tác

Hệ thống phân quyền STHC_CTV tuân thủ nguyên tắc **Phân lập đặc quyền (Principle of Least Privilege)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BẢN ĐỒ ĐỘC LẬP GIỮA CÁC QUYỀN A5                     │
│                                                                        │
│   [rewards.summary] ──────(ĐỘC LẬP)──────> [rewards.view]              │
│    (Xem số liệu A9)                         (Xem danh sách /admin/rewards)
│           │                                        │                   │
│       (ĐỘC LẬP)                                (ĐỘC LẬP)               │
│           ▼                                        ▼                   │
│   [rewards.approve/reject/void] ─(ĐỘC LẬP)─> [rewards.view_detail]     │
│    (Duyệt/Từ chối/Hủy thù lao)              (Xem chi tiết căn cứ lead) │
└────────────────────────────────────────────────────────────────────────┘
```

### Chi tiết hành vi theo từng quyền:
1. **`rewards.summary`**:
   - Cấp quyền xem các Card tổng hợp tài chính (`REW_PENDING_ALL`, `REW_APPROVED_PERIOD`, `REW_APPROVED_ALL`) và bảng xếp hạng Top 5 CTV trên Dashboard A9.
   - **Không tự động cấp quyền `rewards.view`**: Nếu Staff chỉ có `rewards.summary` mà không có `rewards.view`, nút điều hướng sang `/admin/rewards` sẽ bị ẩn hoặc vô hiệu hóa, và nếu gõ trực tiếp URL `/admin/rewards` sẽ bị chặn HTTP 403.
   - **Không tự động cấp quyền thao tác (`approve`/`reject`/`void`)**.
2. **`rewards.view`**:
   - Cấp quyền xem danh sách thù lao tại tab `/admin/rewards` (`GET /api/v1/admin/rewards`).
   - **Không tự động cấp quyền `rewards.summary`**: Staff thuộc nhóm `reward_viewer` (chỉ có `rewards.view` và `rewards.view_detail`) khi vào Dashboard Tổng quan A9 sẽ **không** thấy các Card tổng hợp tài chính và Top 5 CTV.
3. **`rewards.view_detail`**:
   - Cấp quyền xem popup chi tiết căn cứ đối chiếu của từng khoản thù lao (`GET /api/v1/admin/rewards/:id`).
4. **`rewards.approve` / `rewards.reject` / `rewards.void`**:
   - Cấp quyền thực hiện các thao tác phê duyệt, từ chối, hủy thù lao tại backend RPC nguyên tử.

---

## 5. Quy Tắc Trả Dữ Liệu Backend & Mã Lý Do (Data Redaction Engine)

Khi frontend gọi endpoint `GET /api/v1/admin/dashboard/summary`, backend `server.ts` thực hiện xử lý dữ liệu theo các quy tắc nghiêm ngặt sau:

### 5.1 Không trả mã lỗi HTTP 403 cho toàn bộ Dashboard
- Nếu người gọi là Staff hợp lệ (`requireStaffOrAdmin` thành công), backend **không bao giờ trả về HTTP 403** cho toàn bộ endpoint summary chỉ vì thiếu quyền thù lao.
- Backend trả về mã HTTP 200 kèm cấu trúc dữ liệu đã được **che giấu / lược bỏ an toàn ở tầng máy chủ (Server-side Redaction)** trước khi gửi về client.
- Tuyệt đối **không** tính toán số liệu tài chính rồi gửi về cho client tự dùng CSS/JS để ẩn.

### 5.2 Phân biệt 3 trạng thái của đối tượng `rewards` trong phản hồi API:

#### Trạng thái 1: Có quyền xem, truy vấn thành công (Kể cả khi CSDL có 0 khoản thưởng)
```json
{
  "rewards": {
    "available": true,
    "pending": { "amount": 0, "count": 0 },
    "approved": { "amount": 0, "count": 0 },
    "paid": {
      "available": false,
      "amount": null,
      "count": null,
      "reason_code": "PAYMENT_TRACKING_NOT_AVAILABLE"
    }
  }
}
```

#### Trạng thái 2: Không có quyền xem tổng hợp thù lao (`rewards.summary`)
```json
{
  "rewards": {
    "available": false,
    "amount": null,
    "count": null,
    "reason_code": "PERMISSION_DENIED",
    "message": "Tài khoản của bạn không có quyền xem tổng hợp tài chính thù lao."
  },
  "leaderboard": {
    "available": false,
    "items": [],
    "reason_code": "PERMISSION_DENIED",
    "message": "Tài khoản của bạn không có quyền xem bảng xếp hạng thù lao cộng tác viên."
  }
}
```

#### Trạng thái 3: Đối với khối Nhật ký kiểm toán (`audit_logs`)
- Nếu người gọi là `admin`: Trả về mảng 5 bản ghi `recent_audits: [ ... ]`.
- Nếu người gọi là `staff`: Trường `recent_audits` được gán `null` hoặc bỏ khỏi payload response (`recent_audits: null`).

### 5.3 Xử lý lỗi CSDL và lỗi hệ thống (Server Errors)
- Nếu xảy ra lỗi truy vấn cơ sở dữ liệu (ví dụ kết nối Supabase bị ngắt), backend trả về mã HTTP 500 kèm thông báo lỗi rõ ràng.
- **Tuyệt đối không** nuốt lỗi (catch-and-swallow) để biến lỗi hệ thống thành số `0` hoặc `PERMISSION_DENIED`.

---

## 6. Quy Tắc Hiển Thị Giao Diện, Điều Hướng & Bảo Vệ PII

### 6.1 Bố cục giao diện thích ứng theo quyền (Adaptive UI Rendering)
1. **Khối Thù lao & Top 5 CTV**:
   - Khi `rewards.available === false` do `PERMISSION_DENIED`: Frontend **ẩn hoàn toàn** 3 thẻ Card thù lao và khối Top 5 CTV.
   - Bố cục Dashboard tự động co giãn mạch lạc (3 thẻ kết quả tuyển sinh co giãn vừa vặn chiều ngang 3 cột), không để lại khoảng trống màu trắng hoặc các khung báo lỗi to chiếm diện tích.
2. **Khối Nhật ký kiểm toán**:
   - Chỉ render khi `currentUser.role === 'admin'` và `data.recent_audits` có dữ liệu. Ẩn hoàn toàn đối với Staff.
3. **Trạng thái Đang tải (Loading State)**:
   - Trong khi đang gọi API, hiển thị Skeleton Loader trung tính cho các thẻ tuyển sinh. Tuyệt đối không hiển thị các thẻ tài chính tạm trước khi xác định được quyền.

### 6.2 Điều hướng an toàn từ Dashboard sang các trang chi tiết
- **Nút "Khách hàng cần liên hệ"** $\rightarrow$ Điều hướng sang `/admin/leads?status=NEW` (Được phép cho cả Admin và Staff).
- **Nút "Hồ sơ chờ đối chiếu"** $\rightarrow$ Điều hướng sang `/admin/reconcile` (Được phép cho cả Admin và Staff).
- **Nút "Thù lao chờ duyệt"** $\rightarrow$ Chỉ hiển thị nút bấm này khi người dùng có quyền `rewards.view`. Nếu Staff chỉ có `rewards.summary` (xem số liệu) mà không có `rewards.view` (xem danh sách), thẻ số liệu vẫn hiển thị nhưng không có nút bấm điều hướng.
- **Thao tác nghiệp vụ**: Màn hình Tổng quan A9 là màn hình **chỉ đọc (Read-Only Overview)**, không tích hợp nút bấm duyệt/từ chối/hủy trực tiếp trên Dashboard. Mọi thao tác phải chuyển sang trang chuyên biệt tương ứng.

### 6.3 Bảo mật thông tin định danh khách hàng (PII Protection)
- **Số điện thoại khách hàng**: Trong khối "Khách hàng đăng ký gần đây" trên Dashboard Admin/Staff, số điện thoại được hiển thị đầy đủ (ví dụ `0901234567`) để phục vụ công tác liên hệ tư vấn tuyển sinh của cán bộ.
- **Dữ liệu nhạy cảm được loại bỏ khỏi Summary API**:
  - Không trả số CCCD, ngày cấp, số tài khoản ngân hàng của CTV trong API summary.
  - Không trả ghi chú nội bộ (`counselor_note`), thông tin biên lai học phí hoặc số tiền chi tiết của lead trong bảng khách gần đây.

---

## 7. Cơ Chế Thu Hồi Quyền, Đổi Vai Trò & Quản Lý Cache Phiên

### 7.1 Cơ chế kiểm tra quyền thời gian thực (Real-time Evaluation)
- Backend **không lưu cache quyền trong biến nhớ toàn cục (In-memory Global Cache)** mà gọi hàm `fn_has_permission` / `fn_get_user_permissions` trên CSDL PostgreSQL cho mỗi request xác thực.
- Do đó, ngay khi Admin thực hiện thu hồi nhóm quyền của Staff (`spg.is_active = FALSE`) hoặc chuyển vai trò người dùng, **request tiếp theo của Staff sẽ lập tức bị áp dụng chính sách quyền mới**.

### 7.2 Quản lý phiên và bộ nhớ tạm phía Client
1. **Làm mới dữ liệu (Refresh/Reload)**:
   - Khi người dùng bấm nút "Làm mới" (RotateCcw) trên Header hoặc tải lại trang, client gọi lại `api.getMe()` và `api.getAdminDashboardSummary()`, giao diện lập tức cập nhật lại các khối theo quyền mới.
2. **Xóa sạch dữ liệu khi Đăng xuất / Đổi tài khoản**:
   - Khi người dùng bấm "Đăng xuất" (`handleLogout`), ứng dụng xóa sạch toàn bộ state trong React, xóa token trong `localStorage`, phát tín hiệu `sthc_auth_event` đồng bộ đa tab và chuyển hướng về `/`.
   - Tuyệt đối **không lưu trữ số liệu tổng hợp thù lao, danh sách lead hoặc danh sách CTV vào `localStorage`** để tránh rò rỉ dữ liệu khi nhiều người dùng chung một máy tính.

---

## 8. Rà Soát & Ngăn Chặn Các Đường Rò Rỉ Dữ Liệu (Data Leak Prevention)

Bảng rà soát 6 nguy cơ rò rỉ thông tin tài chính và PII đối với tài khoản Staff không có quyền `rewards.summary`:

| Điểm kiểm tra rò rỉ | Nguy cơ tiềm ẩn | Biện pháp bảo vệ bắt buộc (A9.3) | Trạng thái bảo vệ |
| :--- | :--- | :--- | :---: |
| **1. Summary API Payload** | Trường `rewards` trả về `amount: 500000` rồi client dùng CSS để `hidden` | Backend chủ động gán `amount: null, count: null` và `reason_code: "PERMISSION_DENIED"` trước khi gửi response. | **ĐÃ KHÓA** |
| **2. Bảng xếp hạng Top CTV** | Trả danh sách Top CTV có chứa `approved_reward_amount` | Backend chủ động gán `leaderboard: { available: false, items: [] }` khi thiếu quyền `rewards.summary`. | **ĐÃ KHÓA** |
| **3. Bảng Khách gần đây** | Bảng khách gần đây trả về kèm trường `reward_amount` hoặc `rewards` object | Loại bỏ hoàn toàn các trường liên quan đến thù lao khỏi object của từng dòng lead trong `recent_leads`. | **ĐÃ KHÓA** |
| **4. Metadata & Tooltip** | Tooltip hoặc biểu đồ chứa dữ liệu tài chính ẩn | Biểu đồ A9 chỉ hiển thị số lượng Đăng ký & Nhập học (người), không chứa trục tiền hoặc doanh thu. | **ĐÃ KHÓA** |
| **5. Nhật ký Audit Logs** | Staff xem được các dòng log duyệt thưởng có chứa số tiền trong `old_values/new_values` | Toàn bộ endpoint `GET /api/v1/admin/audit-logs` và trường `recent_audits` chỉ dành riêng cho Admin (`requireAdminOnly`). | **ĐÃ KHÓA** |
| **6. Gọi trực tiếp API CTV C6** | Staff cố tình gọi `GET /api/v1/affiliate/leaderboard` | Middleware `requireAffiliateDashboardAccess` chỉ cho phép tài khoản có `role = 'affiliate'`, Staff gọi sẽ bị chặn HTTP 403. | **ĐÃ KHÓA** |

---

## 9. Ma Trận Kiểm Thử Phân Quyền Chi Tiết (17 Kịch Bản)

| STT | Loại tài khoản / Phiên làm việc | Quyền hiệu lực thực tế | Khối Tuyển sinh (Khối A) | Khối Thù lao & Top CTV (Khối B) | Khối Nhật ký (Khối C) | Nút sang `/admin/rewards` | Mã HTTP kỳ vọng | Trạng thái kiểm tra |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | **Admin hợp lệ** | Toàn quyền hệ thống | Hiển thị đầy đủ | Hiển thị đầy đủ | Hiển thị đầy đủ | Có nút điều hướng | HTTP 200 | Đã xác minh theo thiết kế |
| **2** | **Staff chưa gán quyền A5** | Không có quyền A5 nào | Hiển thị đầy đủ | **Ẩn hoàn toàn** (`PERMISSION_DENIED`) | **Ẩn hoàn toàn** | Không hiển thị | HTTP 200 | Đã xác minh theo thiết kế |
| **3** | **Staff chỉ có `rewards.view`** | `rewards.view` (Xem DS) | Hiển thị đầy đủ | **Ẩn hoàn toàn** (`PERMISSION_DENIED`) | **Ẩn hoàn toàn** | Có nút điều hướng | HTTP 200 | Đã xác minh theo thiết kế |
| **4** | **Staff chỉ có `rewards.summary`** | `rewards.summary` (Xem tổng hợp) | Hiển thị đầy đủ | Hiển thị đầy đủ | **Ẩn hoàn toàn** | Không hiển thị (Thiếu view) | HTTP 200 | Đã xác minh theo thiết kế |
| **5** | **Staff có view + summary (thiếu view_detail)** | `rewards.view`, `rewards.summary` | Hiển thị đầy đủ | Hiển thị đầy đủ | **Ẩn hoàn toàn** | Có nút điều hướng | HTTP 200 | Đã xác minh theo thiết kế |
| **6** | **Staff có view + summary (thiếu approve/void)** | `rewards.view`, `rewards.summary`, `rewards.view_detail` | Hiển thị đầy đủ | Hiển thị đầy đủ | **Ẩn hoàn toàn** | Có nút điều hướng | HTTP 200 | Đã xác minh theo thiết kế |
| **7** | **Staff nhóm `reward_manager`** | Đầy đủ 7 quyền A5 | Hiển thị đầy đủ | Hiển thị đầy đủ | **Ẩn hoàn toàn** (Chỉ Admin) | Có nút điều hướng | HTTP 200 | Đã xác minh theo thiết kế |
| **8** | **CTV (Affiliate) truy cập `/admin`** | Không có quyền quản trị | **BỊ CHẶN** | **BỊ CHẶN** | **BỊ CHẶN** | N/A | HTTP 403 `ROLE_FORBIDDEN` | Đã xác minh qua middleware |
| **9** | **Chưa đăng nhập (Public)** | Chưa xác thực | **BỊ CHẶN** | **BỊ CHẶN** | **BỊ CHẶN** | N/A | HTTP 401 `UNAUTHENTICATED` | Đã xác minh qua middleware |
| **10** | **Tài khoản bị vô hiệu hóa** | `is_active = false` | **BỊ CHẶN** | **BỊ CHẶN** | **BỊ CHẶN** | N/A | HTTP 403 `ACCOUNT_DISABLED` | Đã xác minh qua middleware |
| **11** | **Thu hồi `rewards.summary` khi đang mở A9** | Quyền bị xóa trong DB | Giữ hiển thị | Khi reload $\rightarrow$ **Ẩn ngay** | **BỊ ẨN** | Tự động ẩn | HTTP 200 (Payload redacted) | Đã xác minh logic RPC |
| **12** | **Đổi vai trò Staff sang CTV** | `profiles.role` đổi sang `affiliate` | Khi reload $\rightarrow$ **Chặn 403** | **BỊ CHẶN** | **BỊ CHẶN** | N/A | HTTP 403 `ROLE_FORBIDDEN` | Đã xác minh qua middleware |
| **13** | **Giả mạo Role/Permissions từ Client** | Client tự gửi `{ role: 'admin' }` | Backend đọc DB thật | Backend đọc DB thật | Backend đọc DB thật | N/A | HTTP 200 (Theo DB thật) | Đã xác minh qua middleware |
| **14** | **Có quyền nhưng CSDL có 0 khoản thưởng** | Có `rewards.summary` | Hiển thị | Hiển thị `amount: 0, count: 0` | Theo role | Có nút điều hướng | HTTP 200 (`available: true`) | Đã xác minh theo thiết kế |
| **15** | **Thẻ thù lao đã thanh toán (Giai đoạn 1)** | Có `rewards.summary` | Hiển thị | Hiển thị `"Chưa có dữ liệu"` | Theo role | N/A | HTTP 200 (`available: false`) | Đã xác minh theo thiết kế |
| **16** | **Lỗi kết nối cơ sở dữ liệu** | Mất kết nối Supabase | Báo lỗi hệ thống | Báo lỗi hệ thống | Báo lỗi hệ thống | N/A | HTTP 500 | Đã xác minh theo thiết kế |
| **17** | **Staff gọi trực tiếp API `audit-logs`** | Staff bất kỳ | N/A | N/A | **BỊ CHẶN** | N/A | HTTP 403 `ADMIN_ONLY` | Đã xác minh `requireAdminOnly` |

---

## 10. Tổng Hợp Bàn Giao & Kế Hoạch Chuyển Tiếp Sang A9.4–A9.9

### 10.1 Các kết luận phân quyền đã chốt 100% trong A9.3
1. **Truy cập Tổng quan**: Admin và Staff đang hoạt động được phép truy cập Dashboard A9 toàn trường.
2. **Phân tầng dữ liệu (Redaction)**: Staff không có quyền `rewards.summary` vẫn xem được toàn bộ chỉ số tuyển sinh, khóa học, CTV, lead mới; các trường tài chính và Top 5 CTV tự động được che giấu ở máy chủ và trả về `reason_code: "PERMISSION_DENIED"`.
3. **Phân lập quyền độc lập**: `rewards.summary` (xem số liệu) và `rewards.view` (xem danh sách) là hai quyền độc lập, không tự động kế thừa lẫn nhau.
4. **Nhật ký kiểm toán**: Chỉ dành riêng cho Quản trị viên (`role = 'admin'`).
5. **Bảo vệ PII**: Hiển thị đầy đủ số điện thoại khách hàng cho cán bộ tư vấn, loại bỏ các trường tài chính cá nhân (CCCD, ngân hàng, học phí) khỏi API summary.

### 10.2 Kế hoạch triển khai các bước tiếp theo
- **A9.4**: Thiết kế chi tiết Bố cục giao diện, Wireframe, UI Components và Trạng thái tương tác cho `AdminDashboardView.tsx`.
- **A9.5**: Xây dựng Backend API `GET /api/v1/admin/dashboard/summary` áp dụng đầy đủ logic tính toán A9.2 và phân tầng quyền A9.3.
- **A9.6**: Xây dựng Frontend Component `AdminDashboardView.tsx` và gắn vào route `/admin`.
- **A9.7**: Kiểm thử tự động (Unit Test & E2E Verification).
- **A9.8**: Tối ưu hiệu năng, responsive mobile và đóng gói nghiệm thu.
