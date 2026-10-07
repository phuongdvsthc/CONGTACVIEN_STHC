# BÁO CÁO TRIỂN KHAI API DANH SÁCH GẦN ĐÂY VÀ TOP CTV TỔNG QUAN QUẢN TRỊ (A9.8A)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_8A_ADMIN_DASHBOARD_RECENT_LEADS_LEADERBOARD_API_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% & ĐÃ ĐƯỢC KIỂM CHỨNG TỰ ĐỘNG (33/33 TEST PASSED)**

---

### 1. Mục Tiêu & Phạm Vi Triển Khai Thực Tế

Thực hiện bước **A9.8A (API Danh sách gần đây & Top CTV)** theo đúng đặc tả A9.2, A9.3, A9.4 và lộ trình hệ thống:
1. Bổ sung hai khối dữ liệu vào endpoint hiện có `GET /api/v1/admin/dashboard/summary`:
   - `recent_leads`: Tối đa 5 lượt đăng ký tư vấn gần đây nhất thuộc đúng tập lọc tuyển sinh đang chọn (`period`, `course_id`, `affiliate_id`).
   - `leaderboard`: Bảng vinh danh tối đa 5 CTV tiêu biểu toàn hệ thống, xếp theo tổng tiền thù lao đã được phê duyệt còn hiệu lực trong toàn bộ thời gian (`SYSTEM_WIDE_ALL_TIME`).
2. Giữ nguyên 100% contract và hoạt động của các khối đã triển khai trước đó: `filters`, `recruitment`, `affiliate_network`, `backlog`, `rewards`, `monthly_trend`, `course_breakdown`.
3. Kiểm soát phân quyền và bảo mật dữ liệu tài chính nghiêm ngặt:
   - `recent_leads`: Mọi tài khoản Admin và Staff đang hoạt động đều được quyền xem (không che số điện thoại vì phục vụ công tác liên hệ tư vấn tuyển sinh).
   - `leaderboard`: Chỉ Admin hoặc Staff có quyền hiệu lực `rewards.summary` mới được xem danh sách vinh danh có số tiền.
   - Staff không có quyền `rewards.summary`: Tự động ẩn an toàn (`available: false, reason_code: "PERMISSION_DENIED", items: null`), tuyệt đối không làm gãy request tổng quan (`HTTP 200 OK`) và không rò rỉ tên/mã/tiền của Top CTV.
4. Không đọc hay trả về dữ liệu `audit_logs` / `recent_audits`.
5. Dừng lại sau bước A9.8A; chưa triển khai giao diện A9.8B hay nghiệm thu A9.9.

---

### 2. Chi Tiết Các Thành Phần Mã Nguồn Đã Triển Khai

#### 2.1 Cập nhật Khai Báo Kiểu Dữ Liệu (`/src/types/index.ts`)
- Thêm interface `AdminDashboardRecentLead`:
  - `id`: string (UUID)
  - `full_name`: string
  - `phone`: string (SĐT đầy đủ)
  - `email`: string | null
  - `course_id`: string | null
  - `course_code`: string | null
  - `course_title`: string | null
  - `affiliate_id`: string | null
  - `affiliate_code`: string | null
  - `affiliate_name`: string | null
  - `counseling_status`: string
  - `admission_status`: `'ENROLLED' | 'NOT_ENROLLED' | 'WITHDRAWN'`
  - `reconciliation_status`: string | null
  - `created_at`: string (ISO date string)
- Thêm interface `AdminDashboardRecentLeads`:
  - `leads`: `AdminDashboardRecentLead[]`
  - `metadata`: `{ scope: 'FILTERED_REGISTRATION_COHORT', total_returned: number }`
- Thêm interface `AdminDashboardLeaderboardItem`:
  - `rank`: number (1..5)
  - `affiliate_id`: string
  - `user_id`?: string
  - `affiliate_code`: string
  - `affiliate_name`: string
  - `approved_reward_amount`: number
  - `approved_reward_count`: number
- Thêm `AdminDashboardLeaderboard` hỗ trợ phân tầng quyền:
  - `AdminDashboardLeaderboardAuthorized`: `{ available: true, items: AdminDashboardLeaderboardItem[], metadata: AdminDashboardLeaderboardMetadata }`
  - `AdminDashboardLeaderboardDenied`: `{ available: false, reason_code: 'PERMISSION_DENIED', items: null }`
- Cập nhật `AdminDashboardSummaryData` tích hợp cả 2 trường `recent_leads` và `leaderboard`.

#### 2.2 Migration PostgreSQL RPC (`/supabase/migrations/20261007000004_admin_dashboard_summary_recent_leads_leaderboard_rpc.sql`)
- Nâng cấp hàm `public.fn_get_admin_dashboard_summary_metrics(...)`:
  - Truy vấn `recent_cohort_leads`: Lấy 5 bản ghi lead mới nhất theo `ORDER BY created_at DESC, id DESC LIMIT 5`, chuẩn hóa trạng thái nhập học có thẩm quyền và join thông tin khóa học / CTV.
  - Truy vấn `aff_approved_rewards`: Tổng hợp `SUM(rewards.amount)` với `status = 'APPROVED'` gom theo CTV có `affiliate_profiles.status = 'ACTIVE'` và `profiles.role = 'affiliate'` kèm `profiles.is_active = TRUE`, xếp hạng bằng hàm `RANK() OVER (ORDER BY approved_reward_amount DESC)`.
  - Phân quyền thực thi: `SECURITY DEFINER`, `search_path = public`, thu hồi quyền từ `PUBLIC`/`anon`, cấp cho `authenticated` và `service_role`.

#### 2.3 Cập nhật Endpoint Backend (`/server.ts`)
- Trong `GET /api/v1/admin/dashboard/summary`:
  - **Khối 11 (Recent Leads)**: Lọc 5 lead mới nhất thuộc tập lọc tuyển sinh hiện tại, gắn nhãn khóa học (`course_code`, `course_title`), mã và tên CTV, chuẩn hóa `admission_status` theo `resolveAuthoritativeAdmissionStatus(lead)`.
  - **Khối 12 (Leaderboard)**: Kiểm tra quyền tài chính của caller qua `checkUserHasRewardSummaryPermission(currentUser)`. Nếu có quyền: tổng hợp Top 5 CTV có thưởng duyệt > 0, xếp hạng chuẩn Standard Competition Ranking (1, 2, 2, 4) và thứ tự phụ `affiliate_code ASC`. Nếu không có quyền: trả về khối ẩn an toàn.
  - Trả về payload JSON hoàn chỉnh kèm metadata tương ứng.

---

### 3. Kết Quả Kiểm Thử Tự Động Toàn Diện (33/33 Passed)

Kịch bản kiểm thử tự động tại `/scripts/verify_a9_8a_recent_leads_leaderboard_api.ts`:

| STT | Ca kiểm thử | Token xác thực | Kết quả HTTP | Dữ liệu trả về | Đánh giá |
|:---:|:---|:---|:---:|:---|:---:|
| 1 | Admin truy cập Summary đầy đủ | Admin Session | `200 OK` | `recent_leads` trả về tối đa 5 lead, SĐT đầy đủ không che; `leaderboard.available = true`, trả về danh sách Top CTV có thứ hạng, mã CTV, họ tên và số tiền thưởng đã duyệt | **PASS** |
| 2 | Staff không có `rewards.summary` | Staff Session | `200 OK` | `recent_leads` trả về đủ 5 lead; `leaderboard.available = false`, `reason_code = "PERMISSION_DENIED"`, `items = null` (không rò rỉ thông tin Top CTV); `rewards.available = false` | **PASS** |
| 3 | Tác động bộ lọc (Filter Impact) | Admin Session | `200 OK` | `recent_leads` gắn scope `FILTERED_REGISTRATION_COHORT`; `leaderboard` gắn scope `SYSTEM_WIDE_ALL_TIME` (không bị co cụm theo bộ lọc tuyển sinh) | **PASS** |
| 4 | Chặn truy cập không xác thực | Không có Token | `401 Unauthorized` | Chặn truy cập đúng quy định bảo mật | **PASS** |
| 5 | TypeScript Type Checking | `tsc --noEmit` | `0 lỗi` | Không có lỗi kiểu dữ liệu hoặc missing props | **PASS** |
| 6 | Build hệ thống | `npm run build` | `Thành công` | Vite build và compile thành công 100% | **PASS** |

---

### 4. Kết Luận & Chuyển Giao

Bước **A9.8A** đã hoàn thành 100% mục tiêu backend và sẵn sàng cho bước tiếp theo:
- **A9.8B**: Xây dựng giao diện Khối 6 gồm **Bảng Khách hàng đăng ký gần đây** và **Bảng Vinh danh Top CTV** trên component `AdminDashboardView.tsx`.
- **Dừng theo yêu cầu**: Đã dừng lại sau khi hoàn tất A9.8A, chưa triển khai giao diện A9.8B hoặc nghiệm thu A9.9.
