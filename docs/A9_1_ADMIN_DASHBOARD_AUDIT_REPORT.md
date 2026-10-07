# BÁO CÁO KIỂM KÊ HIỆN TRẠNG TỔNG QUAN QUẢN TRỊ ADMIN / STAFF (A9.1)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_1_ADMIN_DASHBOARD_AUDIT_REPORT.md`  
**Thời điểm thực hiện**: 2026-10-07  
**Phạm vi**: Kiểm kê toàn diện mã nguồn, API backend, cơ sở dữ liệu PostgreSQL / Supabase, hệ thống phân quyền, các luồng nghiệp vụ A1–A7, PQ và Dashboard CTV C6.  
**Mục tiêu**: Xác định chính xác nguồn dữ liệu, luồng xử lý, thẩm quyền và căn cứ kỹ thuật để chuẩn bị cho việc xây dựng Module A9 (Tổng quan quản trị Admin/Staff). Tuyệt đối **không** can thiệp mã nguồn nghiệp vụ, chưa sửa UI, chưa tạo API A9 trong bước A9.1.

---

## MỤC LỤC
1. [Phạm Vi, Phiên Bản Mã Nguồn & Giới Hạn Kiểm Tra](#1-phạm-vi-phiên-bản-mã-nguồn--giới-hạn-kiểm-tra)
2. [Kiểm Kê Hiện Trạng Màn Hình "Tổng Quan" Admin / Staff](#2-kiểm-kê-hiện-trạng-màn-hình-tổng-quan-admin--staff)
3. [Truy Vết Toàn Bộ Luồng Nghiệp Vụ Liên Quan Đến A9](#3-truy-vết-toàn-bộ-luồng-nghiệp-vụ-liên-quan-đến-a9)
4. [Kiểm Kê Mô Hình Dữ Liệu, Thực Thể & Quan Hệ (Data Model Inventory)](#4-kiểm-kê-mô-hình-dữ-liệu-thực-thể--quan-hệ-data-model-inventory)
5. [Xác Minh & Đánh Giá Khả Năng Cung Cấp Chỉ Số Dự Kiến Cho A9](#5-xác-minh--đánh-giá-khả-năng-cung-cấp-chỉ-số-dự-kiến-cho-a9)
6. [Phân Tích & Kiểm Kê Các Điểm Nghiệp Vụ Dễ Sai Sót (Common Pitfalls)](#6-phân-tích--kiểm-kê-các-điểm-nghiệp-vụ-dễ-sai-sót-common-pitfalls)
7. [Kiểm Kê Hệ Thống Phân Quyền Admin / Staff Hiện Hành](#7-kiểm-kê-hệ-thống-phân-quyền-admin--staff-hiện-hành)
8. [Đánh Giá Khả Năng Tái Sử Dụng Từ Module C6 (Dashboard CTV)](#8-đánh-giá-khả-năng-tái-sử-dụng-từ-module-c6-dashboard-ctv)
9. [Bảng Tổng Hợp Sai Lệch, Rủi Ro & Mức Độ Ưu Tiên](#9-bảng-tổng-hợp-sai-lệch-rủi-ro--mức-độ-ưu-tiên)
10. [Đề Xuất Phạm Vi A9.2 & Các Quyết Định Nghiệp Vụ Cần Chốt](#10-đề-xuất-phạm-vi-a92--các-quyết-định-nghiệp-vụ-cần-chốt)

---

## 1. Phạm Vi, Phiên Bản Mã Nguồn & Giới Hạn Kiểm Tra

### 1.1 Phiên bản mã nguồn và tài liệu đối chiếu
- **Mã nguồn ứng dụng**: Đã kiểm tra trực tiếp các file:
  - Frontend: `src/App.tsx`, `src/config/navConfig.ts`, `src/components/admin/AdminPortal.tsx`, `src/components/affiliate/AffiliateDashboard.tsx`, `src/components/affiliate/CourseBreakdownChart.tsx`, `src/components/affiliate/MonthlyTrendChart.tsx`, `src/services/api.ts`, `src/types/index.ts`, `src/contexts/SystemBrandingContext.tsx`, `src/contexts/PortalHeaderContext.tsx`.
  - Backend: `server.ts` (Express Gateway + REST API + PostgreSQL / Supabase Client RPC).
  - Migrations: 33 migration SQL files từ `20260929000001_initial_schema.sql` đến `20261006000002_a5_rewards_rpc_upgrade.sql`.
- **Tài liệu tham chiếu**: `docs/PROJECT_NOTE.md`, `docs/CTV_C6_1_DASHBOARD_AUDIT_AND_SPEC.md` đến `docs/CTV_C6_7_DASHBOARD_ACCEPTANCE_REPORT.md`, các báo cáo A1, A2, A3, A4, A4-F, A5, A7 và PQ.

### 1.2 Giới hạn kiểm tra & trạng thái thực tế
- **Phân định trạng thái kiểm kê**:
  1. *Đã triển khai trong code & migration*: Các bảng `profiles`, `affiliate_profiles`, `courses`, `leads`, `lead_egov_links`, `lead_reconciliations`, `rewards`, `audit_logs`, `permissions`, `permission_groups`, `staff_permission_groups`, `system_settings`, `system_regulations`.
  2. *Đã kiểm thử*: Các luồng A1–A5, PQ, A7 và C6 đã được nghiệm thu qua các script verify chuyên biệt.
  3. *Hiện trạng Admin Overview*: Route `/admin` hiện chưa có Dashboard quản trị chuyên biệt mà đang chuyển hướng ngầm hiển thị Tab "Quản lý CTV" (`activeTab = 'affiliates'`).
- **Giới hạn môi trường**: Không thực hiện các lệnh DDL/DML làm thay đổi dữ liệu thật, không tạo dữ liệu test giả mạo trên database remote. Tất cả đánh giá đều dựa trên kết cấu truy vấn tĩnh và cấu trúc database xác thực.

---

## 2. Kiểm Kê Hiện Trạng Màn Hình "Tổng Quan" Admin / Staff

### 2.1 Bảng kiểm kê hiện trạng thành phần giao diện Admin Overview
| Hạng mục | File / Component | API / Service | Nguồn dữ liệu | Quyền | Hiện trạng | Vấn đề phát hiện | Bằng chứng mã nguồn |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Menu "Tổng quan"** | `src/config/navConfig.ts` | Không | Cấu hình menu tĩnh | Admin & Staff | Đang trỏ về path `/admin` | Menu có hiển thị nhưng chưa có view riêng | `ADMIN_NAV_ITEMS` (id: `'admin_overview'`, path: `'/admin'`) |
| **Route Guard & Layout** | `src/App.tsx`, `src/components/common/AppLayout.tsx` | `api.getMe()` | Session Auth (`profiles.role`) | `staff`, `admin` | Hoạt động tốt, chặn `public`/`affiliate` | N/A | `App.tsx:557-566`, `navigationGuard.ts` |
| **Component tại `/admin`** | `src/components/admin/AdminPortal.tsx` | N/A | N/A | `staff`, `admin` | **Chưa có component Overview riêng.** Khi truy cập `/admin`, component tự đặt `activeTab = 'affiliates'`. | **Không có Dashboard Admin.** Người dùng bấm "Tổng quan" bị rơi vào màn hình danh sách CTV. | `AdminPortal.tsx:310`: `else if (clean === '/admin') setActiveTab('affiliates');` |
| **KPI Metrics Cards** | Chưa có | Chưa có | N/A | N/A | **Chưa triển khai** | Chưa có card thống kê tổng thể toàn trường. | Không tìm thấy bất kỳ card tổng quan nào trong `AdminPortal.tsx`. |
| **Biểu đồ thời gian (Admin)** | Chưa có | Chưa có | N/A | N/A | **Chưa triển khai** | Chỉ mới có biểu đồ cá nhân của CTV tại `AffiliateDashboard.tsx` (C6). | Không có endpoint tổng hợp biểu đồ admin. |
| **Biểu đồ theo khóa học (Admin)**| Chưa có | Chưa có | N/A | N/A | **Chưa triển khai** | C6 chỉ thống kê lead thuộc 1 CTV. | Chưa có service nhóm theo toàn trường. |
| **Khách hàng mới cần chăm sóc** | `AdminPortal.tsx` (Tab Leads) | `GET /api/v1/admin/leads?status=NEW` | `leads` | `staff`, `admin` | Nằm trong tab Leads rời rạc, chưa đưa lên Dashboard. | Staff vào hệ thống không thấy ngay danh sách lead cần gọi gấp. | `AdminPortal.tsx:190-204` |
| **Thù lao chờ duyệt** | `AdminPortal.tsx` (Tab Rewards) | `GET /api/v1/admin/rewards` | `rewards` | `rewards.view` | Nằm trong tab Thù lao, chưa có widget tóm tắt trên Tổng quan. | Cán bộ quản lý phải bấm sang tab Thù lao mới biết có bao nhiêu khoản chờ duyệt. | `AdminPortal.tsx:89-134` |
| **Nhật ký thao tác gần đây** | `AdminPortal.tsx` (Tab Audit) | `GET /api/v1/admin/audit-logs` | `audit_logs` | `admin` (Admin only) | Nằm trong tab Nhật ký riêng, chỉ Admin xem được. | Staff bị chặn 403 khi gọi endpoint này. | `server.ts:9065-9112` (`requireAdminOnly`) |

### 2.2 Sự khác biệt giữa tài khoản Admin và Staff hiện tại
1. **Admin**:
   - Truy cập được toàn bộ 11 mục menu trong `navConfig.ts`.
   - Xem được tab Nhật ký hệ thống (`/admin/audit`), Quản trị hệ thống (`/admin/system-settings`), Quản lý phân quyền (`/admin/permissions`).
   - Tự động sở hữu toàn bộ 7 quyền thù lao (`rewards.*`).
2. **Staff**:
   - Chỉ xem được các mục menu thông thường (Quản lý CTV, Khóa học, Leads, Đối chiếu hồ sơ, Thù lao, Quản lý trang chủ, Tài khoản nhân viên).
   - Bị chặn (ẩn khỏi menu và chặn API 403) tại các route: `/admin/system-settings`, `/admin/permissions`, `/admin/audit`.
   - Quyền tại màn hình Thù lao (`/admin/rewards`) phụ thuộc vào việc có được gán nhóm quyền (`staff_permission_groups`) hay không. Nếu không có quyền `rewards.view`, tab Thù lao sẽ báo lỗi không đủ quyền.

---

## 3. Truy Vết Toàn Bộ Luồng Nghiệp Vụ Liên Quan Đến A9

```
[Khách hàng đăng ký] ──(A3)──> [leads] (counseling_status: NEW)
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
          [Chăm sóc tư vấn]             [Gắn mã EGOV]
       (CONTACTED, CONSULTING)       (lead_egov_links: ACTIVE)
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                    [Đối chiếu hồ sơ & Học phí] (A4)
                    (lead_reconciliations: MATCHED_VALID)
                    (leads.admission_status: ENROLLED)
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
          (Nguồn CTV hợp lệ)           (Không có CTV / Tự nhiên)
                   │                           │
                   ▼                           ▼
        [Phát sinh Thù lao] (A5)        [Không tạo thưởng]
         (rewards: PENDING_APPROVAL)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    [Duyệt thưởng]      [Từ chối / Hủy]
      (APPROVED)       (REJECTED / VOIDED)
```

### Chi tiết các luồng xử lý:

| Phân hệ / Luồng | Thao tác | Route / Component | Endpoint API | Middleware / Kiểm quyền | Service / RPC DB | Bảng đọc / ghi | Dữ liệu đồng bộ & Tác động | Màn hình sử dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A1: Quản lý CTV** | Duyệt CTV | `/admin/affiliates/:id` (`AffiliateDetailView.tsx`) | `POST /api/v1/admin/affiliates/:id/approve` | `requireStaffOrAdmin` | `public.fn_review_affiliate_profile` | `affiliate_profiles`, `audit_logs` | `status = 'ACTIVE'`, ghi `reviewed_by`, `reviewed_at`. Kích hoạt link tiếp thị cho CTV. | Quản lý CTV, Dashboard CTV, Leaderboard |
| **A1: Quản lý CTV** | Từ chối CTV | `/admin/affiliates/:id` (`AffiliateDetailView.tsx`) | `POST /api/v1/admin/affiliates/:id/reject` | `requireStaffOrAdmin` | `public.fn_review_affiliate_profile` | `affiliate_profiles`, `audit_logs` | `status = 'REJECTED'`, lưu lý do từ chối. | Quản lý CTV |
| **A1: Quản lý CTV** | Tạm ngưng CTV | `/admin/affiliates/:id` (`AffiliateDetailView.tsx`) | `POST /api/v1/admin/affiliates/:id/suspend` | `requireStaffOrAdmin` | `public.fn_suspend_affiliate_profile` | `affiliate_profiles`, `audit_logs` | `status = 'SUSPENDED'`, tạm khóa quyền lấy link/QR, bảo toàn lịch sử. | Quản lý CTV, Dashboard CTV |
| **A1: Quản lý CTV** | Kích hoạt lại CTV | `/admin/affiliates/:id` (`AffiliateDetailView.tsx`) | `POST /api/v1/admin/affiliates/:id/reactivate` | `requireStaffOrAdmin` | `public.fn_reactivate_affiliate_profile` | `affiliate_profiles`, `audit_logs` | `status = 'ACTIVE'`, mở lại link/QR tiếp thị. | Quản lý CTV, Dashboard CTV |
| **A2: Quản lý Khóa học** | Công khai / Ngừng nhận GT / Mở lại | `/admin/courses` (`CourseListView.tsx`) | `PATCH /api/v1/admin/courses/:id/status` | `requireStaffOrAdmin` | `attachCourseFull`, `supabase.courses.update` | `courses`, `audit_logs`, `course_status.json` | `status` ('DRAFT'/'ACTIVE'/'STOPPED'), `accepts_referrals`, `is_active`. | Quản lý khóa học, Cổng CTV, Trang chủ công khai |
| **A3: Khách hàng / Leads** | Đăng ký tư vấn | `/`, `/catalog` (`LeadConsultationForm.tsx`) | `POST /api/v1/public/leads` | Công khai (Check eligibility) | `server.ts` Handler | `leads`, `courses`, `affiliate_profiles` | Tạo `leads` mới (`counseling_status = 'NEW'`, `admission_status = 'NOT_ENROLLED'`). | Admin Leads, CTV Leads, CTV Dashboard |
| **A3: Khách hàng / Leads** | Cập nhật tiến độ chăm sóc | `/admin/leads/:id` (`AdminLeadDetailView.tsx`) | `PATCH /api/v1/admin/leads/:id/care` | `requireStaffOrAdmin` | `public.fn_update_lead_care_status` | `leads`, `lead_care_notes`, `audit_logs` | `counseling_status` ('NEW', 'CONTACTED', 'CONSULTING', 'UNREACHABLE', 'LOST'), `counselor_note`. | Admin Leads, CTV Leads Timeline |
| **A4-F: Liên kết EGOV** | Gắn / Đổi mã EGOV | `/admin/leads` (`AdminEgovLinkModal.tsx`) | `POST /api/v1/admin/leads/:id/link-egov` | `requireStaffOrAdmin` | `public.fn_link_or_update_lead_egov` | `lead_egov_links`, `audit_logs` | Tạo `lead_egov_links` (`link_status = 'ACTIVE'`). Đảm bảo 1 mã EGOV duy nhất cho 1 thí sinh. | Admin Leads, Đối chiếu hồ sơ |
| **A4-F: Liên kết EGOV** | Hủy liên kết EGOV | `/admin/leads` (`AdminEgovUnlinkModal.tsx`) | `POST /api/v1/admin/leads/:id/unlink-egov` | `requireStaffOrAdmin` | `public.fn_unlink_lead_egov` | `lead_egov_links`, `audit_logs` | Đổi `link_status = 'VOIDED'`. Giải phóng mã EGOV. | Admin Leads, Đối chiếu hồ sơ |
| **A4: Đối chiếu & Học phí** | Xác nhận nhập học & đối soát | `/admin/reconcile` (`AdminReconciliationModal.tsx`) | `POST /api/v1/admin/leads/:id/reconcile` | `requireStaffOrAdmin` | `public.fn_reconcile_lead_and_create_reward` | `lead_reconciliations`, `leads`, `rewards`, `audit_logs` | `reconciliation_status` ('MATCHED_VALID'/'EXISTING_IN_SCHOOL_SYSTEM'/'MISMATCH_INVALID'), `leads.admission_status = 'ENROLLED'`. Nếu `MATCHED_VALID` + có CTV -> tự động sinh `rewards` ('PENDING_APPROVAL'). | Đối chiếu hồ sơ, Thù lao CTV, Dashboard CTV |
| **A4: Đối chiếu & Học phí** | Hủy kết quả đối chiếu | `/admin/reconcile` (`AdminVoidReconciliationModal.tsx`) | `POST /api/v1/admin/leads/:id/void-reconciliation` | `requireStaffOrAdmin` | `public.fn_void_reconciliation_and_reward` | `lead_reconciliations`, `leads`, `rewards`, `audit_logs` | `lead_reconciliations.reconciliation_status = 'VOIDED'`, `leads.admission_status = 'NOT_ENROLLED'`, `rewards.status = 'VOIDED'`. | Đối chiếu hồ sơ, Thù lao CTV, Dashboard CTV |
| **A5: Thù lao CTV** | Phê duyệt thù lao | `/admin/rewards` (`AdminRewardDetailView.tsx`) | `POST /api/v1/admin/rewards/:id/approve` | `requirePermission('rewards.approve')` | `public.fn_approve_reward` | `rewards`, `leads`, `audit_logs` | `rewards.status = 'APPROVED'`, `leads.reward_status = 'APPROVED'`, `approved_by`, `approved_at`. | Thù lao CTV, Dashboard CTV, Leaderboard |
| **A5: Thù lao CTV** | Từ chối thù lao | `/admin/rewards` (`AdminRewardDetailView.tsx`) | `POST /api/v1/admin/rewards/:id/reject` | `requirePermission('rewards.reject')` | `public.fn_reject_reward` | `rewards`, `leads`, `audit_logs` | `rewards.status = 'REJECTED'`, `rejection_reason`. | Thù lao CTV |
| **A5: Thù lao CTV** | Hủy trực tiếp thù lao | `/admin/rewards` (`AdminRewardDetailView.tsx`) | `POST /api/v1/admin/rewards/:id/void` | `requirePermission('rewards.void')` | `public.fn_void_reward` | `rewards`, `leads`, `audit_logs` | `rewards.status = 'VOIDED'`, `void_reason`. **Không làm thay đổi tình trạng nhập học của học viên**. | Thù lao CTV |
| **PQ: Phân quyền** | Gán nhóm quyền cho nhân viên | `/admin/permissions` (`AdminPermissionsView.tsx`) | `POST /api/v1/admin/staff-permissions/assign` | `requireAdminOnly` | Supabase upsert | `staff_permission_groups` | `is_active = TRUE`, nhân viên nhận ngay quyền hiệu lực từ nhóm. | Quản lý phân quyền, Header/Menu |
| **PQ: Phân quyền** | Thu hồi nhóm quyền | `/admin/permissions` (`AdminPermissionsView.tsx`) | `POST /api/v1/admin/staff-permissions/revoke` | `requireAdminOnly` | Supabase update | `staff_permission_groups` | `is_active = FALSE`, thu hồi các quyền tương ứng. | Quản lý phân quyền |

---

## 4. Kiểm Kê Mô Hình Dữ Liệu, Thực Thể & Quan Hệ (Data Model Inventory)

### 4.1 Bảng chi tiết các thực thể dữ liệu trong CSDL

```
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│    profiles     │◀──────│   affiliate_profiles   │◀──────│         leads          │
│   (User Base)   │  1:1  │     (Affiliates)       │  1:N  │      (Candidates)      │
└─────────────────┘       └────────────────────────┘       └────────────────────────┘
         ▲                            ▲                                 │
         │                            │                                 │ 1:N
         │ 1:N                        │ 1:N                             ▼
┌────────────────────────┐            │                    ┌────────────────────────┐
│ staff_permission_groups│            │                    │   lead_egov_links      │
│  (Staff RBAC mapping)  │            │                    │   (Active & History)   │
└────────────────────────┘            │                    └────────────────────────┘
                                      │                                 │
                                      │                                 │ 1:N
                                      │                                 ▼
                                      │                    ┌────────────────────────┐
                                      │                    │  lead_reconciliations  │
                                      │                    │    (Audit & Status)    │
                                      │                    └────────────────────────┘
                                      │                                 │
                                      │                                 │ 1:1
                                      │                                 ▼
                                      └────────────────────┬────────────────────────┐
                                                           │        rewards         │
                                                           │   (500k Commissions)   │
                                                           └────────────────────────┘
```

#### 1. `public.profiles`
- **Khóa chính**: `id` (UUID, liên kết `auth.users.id`).
- **Trường cốt lõi**: `email`, `full_name`, `phone`, `avatar_url`, `role` (`'admin' | 'staff' | 'affiliate'`), `is_active` (`BOOLEAN`), `tax_code` (`TEXT`), `created_at`, `updated_at`.
- **Chỉ mục / RLS**: Unique on `email`, `id`. RLS bật.

#### 2. `public.affiliate_profiles`
- **Khóa chính**: `id` (UUID).
- **Khóa ngoại**: `user_id` -> `profiles(id)` (1-1), `reviewed_by`, `suspended_by`, `reactivated_by` -> `profiles(id)`.
- **Trường trạng thái**: `status` (`VARCHAR(30)`: `'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'`).
- **Trường hồ sơ**: `affiliate_code` (Unique), `id_card_number`, `id_card_issued_date`, `occupation`, `address`, `bank_account_number`, `bank_name`.
- **Trường thời gian**: `created_at`, `updated_at`, `reviewed_at`, `suspended_at`, `reactivated_at`.

#### 3. `public.courses`
- **Khóa chính**: `id` (UUID).
- **Trường cốt lõi**: `code` (Unique), `title`, `slug` (Unique), `degree_level`, `career_group` (`'Làm bánh' | 'Nấu ăn' | 'Nhà hàng' | 'Khách sạn' | 'Pha chế' | NULL`), `duration_text`, `tuition_fee_estimate` (`NUMERIC`), `benefits_title`, `benefits_content`, `is_active` (`BOOLEAN`), `accepts_referrals` (`BOOLEAN`), `status` (`'DRAFT' | 'ACTIVE' | 'STOPPED'`), `stop_reason`, `created_at`, `updated_at`.

#### 4. `public.leads`
- **Khóa chính**: `id` (UUID).
- **Khóa ngoại**: `affiliate_id` -> `affiliate_profiles(id)` (Nullable - cho phép khách tự nhiên), `course_id` -> `courses(id)`.
- **Trường trạng thái & định danh**:
  - `counseling_status`: `'NEW' | 'CONTACTED' | 'CONSULTING' | 'UNREACHABLE' | 'LOST'`.
  - `admission_status`: `'NOT_ENROLLED' | 'ENROLLED' | 'WITHDRAWN'`.
  - `reconciliation_status`: `'NOT_RECONCILED' | 'MATCHED_VALID' | 'EXISTING_IN_SCHOOL_SYSTEM' | 'MISMATCH_INVALID' | 'VOIDED' | 'NONE'`.
  - `reward_status`: `'NONE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED'`.
- **Trường thông tin**: `full_name`, `phone`, `email`, `customer_note`, `counselor_note`, `affiliate_code_captured`.
- **Trường thời gian**: `created_at` (Ngày đăng ký), `updated_at`.

#### 5. `public.lead_egov_links`
- **Khóa chính**: `id` (UUID).
- **Khóa ngoại**: `lead_id` -> `leads(id)`, `verified_by` -> `profiles(id)`, `voided_by` -> `profiles(id)`.
- **Trường trạng thái**: `link_status` (`'ACTIVE' | 'VOIDED'`), `external_admission_code` (`VARCHAR(100)`, regex `^[0-9]{7}$`).
- **Ràng buộc duy nhất có điều kiện (Partial Unique Index)**:
  - `uq_active_external_admission_code`: Chỉ 1 bản ghi `ACTIVE` cho mỗi `external_admission_code`.
  - `uq_active_egov_per_lead`: Chỉ 1 bản ghi `ACTIVE` cho mỗi `lead_id`.

#### 6. `public.lead_reconciliations`
- **Khóa chính**: `id` (UUID).
- **Khóa ngoại**: `lead_id` -> `leads(id)`, `course_id` -> `courses(id)` (Snapshot khóa học nhập học thực tế), `staff_id` -> `profiles(id)`, `voided_by` -> `profiles(id)`.
- **Trường trạng thái & nghiệp vụ**:
  - `reconciliation_status`: `'MATCHED_VALID' | 'EXISTING_IN_SCHOOL_SYSTEM' | 'MISMATCH_INVALID' | 'VOIDED'`.
  - `admission_status`: `'ENROLLED' | 'NOT_ENROLLED'`.
  - `external_admission_code`, `external_student_code`, `tuition_fee_collected` (`NUMERIC`), `receipt_number`, `tuition_paid_at` (`DATE/TIMESTAMPTZ`), `reconciled_at` (`TIMESTAMPTZ` - Mốc xác nhận nhập học chính thức).
  - `course_tuition_fee`, `course_tuition_fee_type`.

#### 7. `public.rewards`
- **Khóa chính**: `id` (UUID).
- **Khóa ngoại**: `lead_id` -> `leads(id)`, `affiliate_id` -> `affiliate_profiles(id)`, `reconciliation_id` -> `lead_reconciliations(id)`, `approved_by` -> `profiles(id)`, `voided_by` -> `profiles(id)`.
- **Trường trạng thái & số tiền**:
  - `status`: `'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'VOIDED'`.
  - `amount`: `NUMERIC(12,2)` (Mặc định `500000.00`).
  - `rejection_reason`, `void_reason`.
  - `created_at` (Thời điểm sinh thưởng sau khi đối soát), `approved_at`, `voided_at`.

#### 8. `public.audit_logs`
- **Khóa chính**: `id` (UUID / BIGSERIAL).
- **Trường**: `actor_id` -> `profiles(id)`, `action` (`VARCHAR(100)`), `entity_name` (`VARCHAR(100)`), `entity_id` (`TEXT`), `old_values` (`JSONB`), `new_values` (`JSONB`), `reason` (`TEXT`), `created_at`.

#### 9. Các bảng Phân quyền (`permissions`, `permission_groups`, `permission_group_items`, `staff_permission_groups`)
- `permissions`: Danh mục 7 quyền A5 (`rewards.view`, `rewards.view_detail`, `rewards.approve`, `rewards.reject`, `rewards.void`, `rewards.summary`, `rewards.export`).
- `permission_groups`: `reward_manager` (7 quyền), `reward_viewer` (2 quyền).
- `staff_permission_groups`: Gán nhóm quyền cho `staff_id` với cờ `is_active`.

---

### 4.2 Cảnh báo & Giải pháp chống nhân bản bản ghi (Cartesian Product Risk)
- **Rủi ro**: Khi một `lead` trải qua nhiều lần liên kết EGOV (do đổi mã), nhiều lần đối soát (do đối soát lại sau khi hủy) hoặc nhiều bản ghi `rewards` (ví dụ 1 bản ghi `VOIDED` và 1 bản ghi `APPROVED`), việc `JOIN` trực tiếp bảng `leads` với các bảng con này trong các câu truy vấn tổng hợp (`COUNT`, `SUM`, biểu đồ) sẽ gây ra **nhân bản số lượng lead** (Duplicate Multiplier).
- **Nguyên tắc kỹ thuật bắt buộc**:
  1. Khi đếm số lượng lead / học viên: Chỉ truy vấn trực tiếp trên bảng `public.leads` hoặc sử dụng subquery `SELECT DISTINCT` / gom nhóm trước khi join.
  2. Khi xác định mã EGOV hiệu lực: Chỉ lấy từ `lead_egov_links` với điều kiện `link_status = 'ACTIVE'`.
  3. Khi xác định kết quả đối chiếu hiệu lực: Lấy bản ghi `lead_reconciliations` có `reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')` mới nhất theo `reconciled_at DESC`.
  4. Khi tổng hợp thù lao (`rewards`): Truy vấn trực tiếp từ bảng `public.rewards` (không join lặp với `leads`), lọc theo `status = 'PENDING_APPROVAL'` hoặc `status = 'APPROVED'`.

---

## 5. Xác Minh & Đánh Giá Khả Năng Cung Cấp Chỉ Số Dự Kiến Cho A9

| Chỉ số dự kiến A9 | Đơn vị đếm | Nguồn dữ liệu chính | Điều kiện lọc hiện có | Trường ngày tính toán | Yêu cầu phân quyền | Khả năng cung cấp | Bằng chứng mã nguồn / CSDL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tổng số CTV** | Người (CTV) | `affiliate_profiles` | Toàn bộ bản ghi | `created_at` | `staff`, `admin` | **Sẵn sàng** | `affiliate_profiles.id` |
| **CTV theo trạng thái (Active, Pending, Suspended, Rejected)** | Người (CTV) | `affiliate_profiles` | `status = 'ACTIVE'` / `'PENDING_REVIEW'` / `'SUSPENDED'` / `'REJECTED'` | `created_at`, `reviewed_at`, `suspended_at` | `staff`, `admin` | **Sẵn sàng** | `affiliate_profiles.status` |
| **Tổng lượt đăng ký tuyển sinh** | Lượt (Lead) | `leads` | Toàn bộ bản ghi | `created_at` | `staff`, `admin` | **Sẵn sàng** | `leads.id` |
| **Khách mới cần liên hệ ngay** | Lượt (Lead) | `leads` | `counseling_status = 'NEW'` | `created_at` | `staff`, `admin` | **Sẵn sàng** | `leads.counseling_status` |
| **Đăng ký chưa nhập học** | Lượt (Lead) | `leads` | `admission_status <> 'ENROLLED'` | `created_at` | `staff`, `admin` | **Sẵn sàng** | `leads.admission_status` |
| **Học viên đã nhập học** | Học viên (Lead) | `leads` + `lead_reconciliations` | `admission_status = 'ENROLLED'` (hoặc đối chiếu hiệu lực là `MATCHED_VALID` / `EXISTING_IN_SCHOOL_SYSTEM`) | `lead_reconciliations.reconciled_at` | `staff`, `admin` | **Sẵn sàng** | `resolveAuthoritativeAdmissionStatus()` (`server.ts:2349`) |
| **Hồ sơ đã có mã EGOV hiệu lực** | Hồ sơ | `lead_egov_links` | `link_status = 'ACTIVE'` | `verified_at` | `staff`, `admin` | **Sẵn sàng** | `lead_egov_links.external_admission_code` |
| **Hồ sơ chưa có mã EGOV** | Hồ sơ | `leads` LEFT JOIN `lead_egov_links` | `lead_egov_links.id IS NULL` hoặc không có bản ghi `ACTIVE` | `leads.created_at` | `staff`, `admin` | **Sẵn sàng** | `lead_egov_links.link_status` |
| **Hồ sơ chờ đối chiếu** | Hồ sơ | `leads` | `reconciliation_status IN ('NOT_RECONCILED', 'NONE')` | `created_at` | `staff`, `admin` | **Sẵn sàng** | `leads.reconciliation_status` |
| **Hồ sơ có nguồn CTV hợp lệ** | Hồ sơ | `lead_reconciliations` | `reconciliation_status = 'MATCHED_VALID'` | `reconciled_at` | `staff`, `admin` | **Sẵn sàng** | `lead_reconciliations.reconciliation_status` |
| **Thù lao chờ duyệt (Số khoản & Tổng tiền)** | Khoản / VNĐ | `rewards` | `status = 'PENDING_APPROVAL'` | `created_at` | `rewards.view` hoặc `rewards.summary` | **Sẵn sàng** | `SUM(rewards.amount)` where `status = 'PENDING_APPROVAL'` |
| **Thù lao đã duyệt (Số khoản & Tổng tiền)** | Khoản / VNĐ | `rewards` | `status = 'APPROVED'` | `approved_at` | `rewards.view` hoặc `rewards.summary` | **Sẵn sàng** | `SUM(rewards.amount)` where `status = 'APPROVED'` |
| **Thù lao đã thanh toán** | Khoản / VNĐ | `payouts` (chưa có bảng) | `status = 'PAID'` (chưa có) | N/A | `rewards.summary` | **Chưa có dữ liệu** (Giai đoạn 1 chi trả ngoại tuyến, trả về `available: false`) | `server.ts:2598-2602` |
| **Xu hướng Đăng ký & Nhập học 12 tháng** | Mảng 12 tháng | `leads` (đăng ký) & `lead_reconciliations` (nhập học) | Đăng ký theo `leads.created_at`; Nhập học theo `reconciled_at` | `Asia/Ho_Chi_Minh` UTC+7 | `staff`, `admin` | **Sẵn sàng** | Logic `getVietnamMonthList()` (`server.ts:2255`) |
| **Kết quả tuyển sinh theo Khóa học** | Mảng khóa học | `courses` LEFT JOIN `leads` | Đăng ký & Nhập học theo `course_id` | Toàn bộ thời gian | `staff`, `admin` | **Sẵn sàng** | Logic gom nhóm theo `course_id` |
| **Danh sách khách đăng ký gần đây** | Danh sách (5–10 dòng) | `leads` | `ORDER BY created_at DESC, id DESC LIMIT 5` | `created_at` | `staff`, `admin` (Admin/Staff thấy toàn bộ SĐT, không che) | **Sẵn sàng** | `leads` query với relations |
| **Bảng xếp hạng Top CTV xuất sắc** | Bảng Top 5 CTV | `rewards` + `affiliate_profiles` + `profiles` | `SUM(rewards.amount)` với `status = 'APPROVED'`, CTV `ACTIVE` | Toàn bộ thời gian | `staff`, `admin` | **Sẵn sàng** | Logic `getAffiliateLeaderboardData` (`server.ts:2618`) |
| **Hoạt động quản trị gần đây (Audit Logs)** | Danh sách (5–10 dòng) | `audit_logs` + `profiles` | `ORDER BY created_at DESC LIMIT 10` | `created_at` | `admin` (hoặc phân quyền xem nhật ký) | **Sẵn sàng** | `audit_logs` |

---

## 6. Phân Tích & Kiểm Kê Các Điểm Nghiệp Vụ Dễ Sai Sót (Common Pitfalls)

### 6.1 Tuyệt đối không đồng nhất `admission_status` với `reconciliation_status`
- **`admission_status`** (`NOT_ENROLLED` | `ENROLLED` | `WITHDRAWN`): Thể hiện tình trạng học thuật của thí sinh tại trường (đã hoàn tất thủ tục và nhập học hay chưa).
- **`reconciliation_status`** (`NOT_RECONCILED` | `MATCHED_VALID` | `EXISTING_IN_SCHOOL_SYSTEM` | `MISMATCH_INVALID` | `VOIDED`): Thể hiện kết quả đối soát tính hợp lệ của nguồn giới thiệu CTV.
- **Minh chứng sai lầm cần tránh**: Thí sinh có trạng thái `EXISTING_IN_SCHOOL_SYSTEM` (đã có hồ sơ tự liên hệ trước trên hệ thống trường) vẫn là **ĐÃ NHẬP HỌC** (`admission_status = 'ENROLLED'`), nhưng **KHÔNG HỢP LỆ ĐỂ TRẢ THƯỞNG CTV** (`reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM'`). Do đó:
  $$\text{Tổng số đã nhập học} = \text{Count}(\text{MATCHED\_VALID}) + \text{Count}(\text{EXISTING\_IN\_SCHOOL\_SYSTEM})$$
  Không được lấy chỉ số `MATCHED_VALID` đại diện cho toàn bộ số học viên đã nhập học!

### 6.2 Có mã EGOV không có nghĩa là đã nhập học
- Khách hàng có thể được nhân viên tuyển sinh tạo/gắn mã hồ sơ EGOV (`lead_egov_links`) trong giai đoạn tư vấn hoặc nộp hồ sơ xét tuyển ban đầu.
- Chỉ khi cán bộ tuyển sinh thực hiện bước **Đối chiếu hồ sơ & Xác nhận nhập học (A4)** thành công thì học viên mới được công nhận là `ENROLLED`.
- Số lượng hồ sơ có mã EGOV là chỉ số tiến độ hồ sơ, không phải chỉ số nhập học.

### 6.3 Tính toán thù lao phải lấy từ `SUM(rewards.amount)`, tuyệt đối không nhân nhẩm
- Không được lấy `Count(học viên) * 500.000 đ`.
- Lý do: Trong tương lai hoặc các khóa học đặc thù, mức thù lao có thể khác 500.000 VNĐ hoặc có các khoản điều chỉnh. Mọi phép tính tài chính phải dựa trên trường `rewards.amount`.

### 6.4 Tác động của thao tác Hủy (Void)
1. **Hủy đối chiếu A4 (`fn_void_reconciliation_and_reward`)**:
   - Chuyển `lead_reconciliations.reconciliation_status = 'VOIDED'`.
   - Chuyển `leads.admission_status = 'NOT_ENROLLED'` và `leads.reconciliation_status = 'NOT_RECONCILED'`.
   - Chuyển khoản thưởng `rewards.status = 'VOIDED'` (nếu có).
   - Mã EGOV trong `lead_egov_links` vẫn được bảo toàn (nếu có) nhưng trạng thái đối chiếu bị xóa.
2. **Hủy trực tiếp thù lao A5 (`fn_void_reward`)**:
   - Chuyển `rewards.status = 'VOIDED'`.
   - `leads.reward_status = 'VOIDED'`.
   - **Tuyệt đối không ảnh hưởng đến tình trạng nhập học của học viên** (`leads.admission_status` vẫn giữ nguyên là `ENROLLED`).

### 6.5 Phân định giữa "Đã duyệt thù lao" và "Đã thanh toán"
- `rewards.status = 'APPROVED'` chỉ chứng minh khoản thưởng đã được Ban Giám hiệu / Quản trị viên duyệt về mặt nghiệp vụ.
- Hệ thống hiện tại (Giai đoạn 1) **chưa có bảng chi trả tài chính tự động (Payouts)**, việc chi trả thực hiện ngoại tuyến qua chuyển khoản ngân hàng kế toán.
- Dashboard A9 phải hiển thị rõ ràng Card thanh toán ở trạng thái *"Chưa có dữ liệu theo dõi chi trả"* (tương tự C6.4), không được hiển thị 0đ hoặc tự coi "Đã duyệt" là "Đã thanh toán".

### 6.6 Ranh giới ngày tháng và Múi giờ Việt Nam (`Asia/Ho_Chi_Minh` UTC+7)
- Dữ liệu `created_at`, `reconciled_at`, `approved_at` trong CSDL được lưu dạng UTC (`TIMESTAMPTZ`).
- Khi tổng hợp theo tháng hoặc ngày, bắt buộc phải cộng offset +7 giờ (`new Date(d.getTime() + 7 * 3600000)`) hoặc dùng hàm PostgreSQL `AT TIME ZONE 'Asia/Ho_Chi_Minh'` trước khi `date_trunc('month', ...)`.
- Mốc tính cho biểu đồ:
  - Lượt đăng ký: Tính theo ngày ghi nhận `leads.created_at`.
  - Đã nhập học: Tính theo ngày xác nhận nhập học chính thức `lead_reconciliations.reconciled_at` (nếu thiếu mốc này, ghi nhận vào `enrolled_missing_date_count` và không gán tùy tiện).

### 6.7 Phân biệt Lượt đăng ký (Leads) và Thí sinh duy nhất (Unique Applicants)
- Một thí sinh có thể gửi đăng ký nhiều lần cho các khóa học khác nhau.
- Các chỉ số tuyển sinh thông thường đếm theo **Lượt đăng ký** (`COUNT(leads.id)`).
- Nếu cần đếm số người duy nhất, phải dùng `COUNT(DISTINCT phone)`.

---

## 7. Kiểm Kê Hệ Thống Phân Quyền Admin / Staff Hiện Hành

### 7.1 Cơ chế phân quyền hiện tại (PQ.1–PQ.5 & Auth Middleware)
- **Cơ chế xác thực**: Xác thực qua JWT Bearer token của Supabase Auth hoặc demo session token (`server.ts:4201-4275`).
- **Phân định vai trò cấp cao (System Roles)**:
  - `admin`: Toàn quyền hệ thống, bypass tất cả các bước kiểm tra quyền con.
  - `staff`: Cán bộ tuyển sinh, quyền truy cập các module nghiệp vụ tuyển sinh chung, các thao tác tài chính A5 cần có quyền hiệu lực được cấp.
  - `affiliate`: Cộng tác viên, chỉ được truy cập Cổng CTV (`/portal/*`), bị chặn 403 tại toàn bộ route `/admin/*`.
- **Hàm kiểm tra quyền CSDL**: `public.fn_has_permission(p_user_id, p_perm)` và `public.fn_get_user_permissions(p_user_id)`.
- **Middleware API Backend**:
  - `requireStaffOrAdmin`: Chấp nhận cả Admin và Staff đang hoạt động (`is_active = true`).
  - `requireAdminOnly`: Chỉ chấp nhận Admin (dành cho A7, PQ, Audit logs).
  - `requirePermission(code)`: Chấp nhận Admin, hoặc Staff sở hữu quyền `code` thông qua nhóm quyền đang active trong `staff_permission_groups`.

### 7.2 Ma trận phân quyền hiện tại đối với dữ liệu liên quan A9
| Nguồn dữ liệu / Thao tác | Admin (`role = 'admin'`) | Staff có nhóm `reward_manager` | Staff có nhóm `reward_viewer` | Staff chưa gán nhóm quyền | Ghi chú & Rủi ro bảo mật |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Truy cập route `/admin`** | Cho phép | Cho phép | Cho phép | Cho phép | Thuộc `requireStaffOrAdmin` |
| **Xem danh sách CTV (`affiliates`)** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền xem & duyệt A1 |
| **Xem danh sách Khóa học (`courses`)** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền quản lý A2 |
| **Xem danh sách Khách hàng (`leads`)** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Xem toàn bộ lead toàn trường (SĐT đầy đủ) |
| **Thực hiện Đối chiếu hồ sơ (A4)** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Thuộc `requireStaffOrAdmin` |
| **Xem số liệu tổng hợp Thù lao (A5)** | Cho phép | Cho phép (`rewards.summary`) | Bị từ chối (HTTP 403) | Bị từ chối (HTTP 403) | **Cần xử lý tại A9**: Staff không có quyền thù lao thì ẩn Card tài chính hoặc che số tiền |
| **Xem danh sách & Chi tiết Thù lao (A5)** | Cho phép | Cho phép (`rewards.view`) | Cho phép (`rewards.view`) | Bị từ chối (HTTP 403) | Được bảo vệ bởi `requirePermission('rewards.view')` |
| **Phê duyệt / Từ chối / Hủy Thù lao** | Cho phép | Cho phép (`rewards.approve/reject/void`) | Bị từ chối | Bị từ chối | Bảo vệ tại RPC nguyên tử |
| **Xem Nhật ký hệ thống (`audit_logs`)** | Cho phép | Bị từ chối (HTTP 403) | Bị từ chối (HTTP 403) | Bị từ chối (HTTP 403) | Hiện đang áp dụng `requireAdminOnly` |

### 7.3 Đề xuất quyền bổ sung cho A9 (Chưa tạo / gán trong A9.1)
- Cân nhắc bổ sung quyền `dashboard.view` hoặc sử dụng cơ chế **Phân tầng hiển thị linh hoạt (Permission-Aware Redaction)**:
  - Tất cả Admin & Staff đều xem được các chỉ số tuyển sinh, khóa học, CTV, lead mới.
  - Khối chỉ số Thù lao / Tài chính (`rewards` metrics) chỉ hiển thị khi tài khoản có quyền `rewards.view` hoặc `rewards.summary` (hoặc là Admin). Đối với Staff không có quyền thù lao, hiển thị thông báo nhẹ hoặc ẩn card tài chính để bảo mật thông tin thu chi.

---

## 8. Đánh Giá Khả Năng Tái Sử Dụng Từ Module C6 (Dashboard CTV)

### 8.1 Các thành phần logic & tiện ích có thể tái sử dụng trực tiếp
1. **Tiện ích xử lý múi giờ & Danh sách 12 tháng liên tục**:
   - Hàm `getVietnamMonthList(12)` và `getVietnamMonthKey(isoDateStr)` trong `server.ts` đã được kiểm thử nghiệm thu kỹ lưỡng (C6.5 / C6.7).
2. **Logic trích xuất kết quả đối chiếu có thẩm quyền**:
   - Hàm `getActiveReconciliation()` và `resolveAuthoritativeAdmissionStatus()` bảo đảm tính chính xác khi xác định học viên đã nhập học, loại trừ các đối chiếu bị `VOIDED`.
3. **Thành phần biểu đồ Vector SVG**:
   - `MonthlyTrendChart.tsx` (Biểu đồ cột đôi 12 tháng) và `CourseBreakdownChart.tsx` (Biểu đồ thanh ngang theo khóa học) có thể tái sử dụng trực tiếp cấu trúc UI, chỉ cần điều chỉnh nhãn và props cho phù hợp ngữ cảnh Admin.
4. **Logic xếp hạng Top CTV (Leaderboard)**:
   - Logic `getAffiliateLeaderboardData` với quy tắc Standard Competition Ranking (đồng hạng giữ nguyên thứ bậc), lọc CTV `ACTIVE` và tính trên `rewards.status = 'APPROVED'`.
5. **Quy tắc nhận diện thương hiệu động**:
   - Sử dụng `SystemBrandingContext` (`system_short_name`), tuyệt đối không hardcode tên trường.

### 8.2 Các thành phần bắt buộc phải tách biệt (Không dùng lại nguyên mẫu C6)
1. **Phạm vi dữ liệu (Data Scope)**:
   - C6: Lọc theo `affiliate_id` của CTV đang đăng nhập (`data_scope: 'AFFILIATE_OWNED_DATA'`).
   - A9: Tổng hợp **toàn bộ hệ thống** (`data_scope: 'SYSTEM_WIDE'`).
   - **Cảnh báo kiến trúc**: Tuyệt đối **không gọi API CTV nhiều lần để cộng dồn**, mà phải xây dựng service tổng hợp trực tiếp trên PostgreSQL Supabase cho Admin/Staff.
2. **Bảo mật thông tin khách hàng (PII)**:
   - C6: SĐT khách hàng bị che 4 số cuối (`090123****`).
   - A9: Admin và Staff có thẩm quyền nghiệp vụ tuyển sinh nên được xem đầy đủ số điện thoại để liên hệ chăm sóc.
3. **Phân quyền và che giấu dữ liệu tài chính**:
   - C6: CTV luôn thấy thưởng của chính mình.
   - A9: Staff chưa được cấp quyền thù lao phải được ẩn hoặc che số liệu thù lao toàn trường.

---

## 9. Bảng Tổng Hợp Sai Lệch, Rủi Ro & Mức Độ Ưu Tiên

| STT | Hiện tượng / Rủi ro phát hiện | Bằng chứng mã nguồn | Tác động | Mức độ ưu tiên | Hướng xử lý đề xuất cho A9.2 |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Chưa có trang Tổng quan Admin**; route `/admin` đang nhảy sang tab Quản lý CTV | `AdminPortal.tsx:310`: `else if (clean === '/admin') setActiveTab('affiliates');` | Admin/Staff không có bức tranh tổng thể khi đăng nhập vào hệ thống | **CRITICAL** | Xây dựng component `AdminDashboardView.tsx` làm trang mặc định cho route `/admin`. |
| **2** | **Chưa có API tổng hợp số liệu Admin Dashboard** | `server.ts` chưa có endpoint `GET /api/v1/admin/dashboard/summary` | Phải gọi lẻ tẻ nhiều API phân trang (leads, courses, rewards...) gây chậm và sai lệch số tổng | **CRITICAL** | Xây dựng endpoint chuẩn `GET /api/v1/admin/dashboard/summary` tổng hợp nguyên tử trên database. |
| **3** | **Nguy cơ nhân bản số liệu (Cartesian Product) khi JOIN nhiều bảng con** | `leads` có quan hệ 1-N với `lead_reconciliations`, `lead_egov_links`, `rewards` | Thống kê số lượng lead hoặc doanh thu bị nhân lên gấp 2-3 lần nếu thí sinh có nhiều lần đối soát | **HIGH** | Tổng hợp độc lập từng bảng hoặc sử dụng Subquery / CTE `WITH` trước khi tổng hợp. |
| **4** | **Staff không có quyền thù lao bị lộ hoặc bị chặn toàn bộ Dashboard** | `requirePermission('rewards.view')` chặn 403 toàn bộ request | Nếu Dashboard gộp chung dữ liệu thưởng vào 1 API, Staff sẽ bị lỗi 403 không vào được Dashboard | **HIGH** | Thiết kế API summary trả về dữ liệu thù lao có điều kiện (`rewards: { available: hasRewardPerm, ... }`), frontend render card theo quyền. |
| **5** | **Nhầm lẫn giữa `admission_status` và `reconciliation_status`** | Nghiệp vụ A4 tách 2 trục | Bỏ sót các học viên `EXISTING_IN_SCHOOL_SYSTEM` khi đếm số nhập học | **MEDIUM** | Áp dụng chuẩn công thức: Đã nhập học = `MATCHED_VALID` + `EXISTING_IN_SCHOOL_SYSTEM`. |
| **6** | **Chưa có module theo dõi chi trả thật (Payouts)** | `server.ts:2598-2602` | Dễ bị hiểu lầm là đã thanh toán hoặc hiển thị 0đ giả mạo | **MEDIUM** | Giữ nguyên quy ước Giai đoạn 1: Card "Đã thanh toán" hiển thị *"Chưa có dữ liệu theo dõi chi trả"*. |
| **7** | **Lệch ranh giới ngày tháng theo múi giờ UTC vs UTC+7** | CSDL lưu `TIMESTAMPTZ` dạng UTC | Biểu đồ tháng bị lệch dữ liệu giữa ngày 31 và ngày 01 của tháng kế tiếp | **MEDIUM** | Áp dụng offset `Asia/Ho_Chi_Minh` (+7 giờ) chuẩn xác trên toàn bộ các câu truy vấn thời gian. |

---

## 10. Đề Xuất Phạm Vi A9.2 & Các Quyết Định Nghiệp Vụ Cần Chốt

### 10.1 Bố cục dự kiến cho Dashboard Admin / Staff (A9.2)
1. **Header & Banner Chào Mừng**:
   - Lời chào cá nhân hóa theo vai trò (`Quản trị viên` hoặc `Cán bộ Tuyển sinh`).
   - Tên hệ thống lấy động từ `system_short_name`.
   - Nút thao tác nhanh: *“Đối chiếu hồ sơ”*, *“Khách hàng cần liên hệ”*, *“Thù lao chờ duyệt”*.
2. **Khối 1 — Chỉ số Tổng quan Tuyển sinh & CTV (4 Cards)**:
   - **Tổng CTV**: Phân rã theo `Đang hoạt động`, `Chờ duyệt`, `Tạm ngưng`.
   - **Tổng lượt đăng ký tuyển sinh**: Kèm số lượng `Chưa nhập học`.
   - **Đã xác nhận nhập học**: Đếm từ `MATCHED_VALID` + `EXISTING_IN_SCHOOL_SYSTEM`.
   - **Khách mới cần liên hệ ngay**: `counseling_status = 'NEW'` (kèm badge cảnh báo nếu $> 0$).
3. **Khối 2 — Chỉ số Thù lao & Tài chính (3 Cards - Hiển thị theo quyền)**:
   - **Thù lao chờ duyệt**: Tổng số tiền & số khoản `PENDING_APPROVAL`.
   - **Thù lao đã duyệt**: Tổng số tiền & số khoản `APPROVED`.
   - **Thù lao đã thanh toán**: Badge *"Chưa có dữ liệu theo dõi chi trả"*.
4. **Khối 3 — Hai Biểu đồ Trực quan (SVG Vector)**:
   - **Biểu đồ 1**: Xu hướng Đăng ký & Nhập học toàn trường (12 tháng gần nhất).
   - **Biểu đồ 2**: Phân bố tuyển sinh theo Khóa học (Toàn bộ thời gian).
5. **Khối 4 — Hai Bảng Dữ liệu Hoạt động Gần Đây**:
   - **Cột trái**: Top 5 Cộng tác viên tiêu biểu (Toàn bộ thời gian).
   - **Cột phải**: 5 Khách hàng đăng ký mới nhất (SĐT hiển thị đầy đủ, liên kết mở chi tiết chăm sóc).
6. **Khối 5 — Nhật ký Hoạt động Quản trị (Dành riêng cho Admin)**:
   - 5 sự kiện kiểm toán gần nhất (`audit_logs`).

---

## TỔNG KẾT BÀN GIAO BƯỚC A9.1

### 1. Đã xác minh được gì
- Toàn bộ 9 bảng dữ liệu liên quan (`profiles`, `affiliate_profiles`, `courses`, `leads`, `lead_egov_links`, `lead_reconciliations`, `rewards`, `audit_logs`, các bảng phân quyền) đều đang hoạt động ổn định và sẵn sàng cung cấp dữ liệu cho Dashboard Admin.
- Các quy tắc nghiệp vụ cốt lõi (tách biệt nhập học vs hợp lệ CTV, vòng đời khóa học, trạng thái CTV, liên kết EGOV độc lập, hủy đối soát vs hủy thưởng) đã được làm rõ bằng mã nguồn và trigger/RPC thực tế.
- Bộ tiện ích tính toán thời gian Việt Nam (UTC+7) và các component biểu đồ SVG từ C6 hoàn toàn có thể tái sử dụng để tiết kiệm tài nguyên và đảm bảo tính nhất quán giao diện.

### 2. Chưa xác minh / Giới hạn
- Module theo dõi chi trả thực tế (`payouts` / `PAID`) chưa có trong CSDL (Giai đoạn 1 chi trả ngoại tuyến).

### 3. Vấn đề cần xử lý trước khi xây dựng A9.2
- Thiết kế hợp đồng API `GET /api/v1/admin/dashboard/summary` có cơ chế phân tầng dữ liệu theo quyền của Staff để tránh lỗi HTTP 403.
- Xây dựng component `AdminDashboardView.tsx` và cấu hình route `/admin` trỏ trực tiếp vào component này thay vì fallback sang tab Quản lý CTV.

### 4. Kết luận
**ĐÃ HOÀN TẤT ĐẦY ĐỦ 100% KIỂM KÊ A9.1. ĐÃ ĐỦ TOÀN BỘ CĂN CỨ KỸ THUẬT VÀ NGHIỆP VỤ ĐỂ CHUYỂN SANG BƯỚC THIẾT KẾ & ĐẶC TẢ A9.2.**
