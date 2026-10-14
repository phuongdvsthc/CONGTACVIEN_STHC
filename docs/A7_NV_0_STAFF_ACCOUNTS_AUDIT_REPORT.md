# BÁO CÁO KIỂM KÊ SOURCE CODE VÀ DATABASE MÀN HÌNH TÀI KHOẢN NHÂN VIÊN (A7-NV.0)

- **Mã tài liệu:** `A7-NV.0`
- **Tên báo cáo:** Kiểm kê hiện trạng source code và cơ sở dữ liệu màn hình Tài khoản nhân viên (`/admin/staff-accounts`)
- **Phân hệ đối ứng:** Khu vực Quản trị & Cán bộ Tuyển sinh (`/admin`)
- **Chế độ kiểm tra:** **Chỉ đọc (Read-only Architecture & Database Inventory)**. Không thay đổi dữ liệu, không chạy migration ghi/sửa, không triển khai code tính năng mới.
- **Thời điểm thực hiện:** 14/10/2026
- **Trạng thái:** HOÀN TẤT KIỂM KÊ

---

## 1. Phạm Vi Và Giới Hạn Kiểm Tra

### 1.1. Phạm vi kiểm tra
- **Mã nguồn Frontend:**
  - Khai báo route, định nghĩa bảo vệ route guard tại `src/App.tsx` và `src/utils/navigationGuard.ts`.
  - Cấu hình thanh điều hướng bên (Sidebar) tại `src/config/navConfig.ts` và component hiển thị `src/components/common/AppLayout.tsx`.
  - Component hiện đang mount tại route `/admin/staff-accounts`: `src/components/admin/AdminPlaceholderPage.tsx`.
  - Luồng nâng/thu hồi vai trò Staff tại màn hình chi tiết CTV: `src/components/admin/AffiliateDetailView.tsx`.
  - Các hàm API client tại `src/services/api.ts` và kiểu dữ liệu tại `src/types/index.ts`.
  - Màn hình quản lý phân quyền A5 hiện có tại `src/components/admin/AdminPermissionsView.tsx`.
- **Mã nguồn Backend:**
  - Máy chủ Express `server.ts`: các middleware kiểm tra quyền (`requireStaffOrAdmin`, `requireAdminOnly`, `requirePermission`), các endpoint xử lý đổi vai trò (`PATCH /api/v1/admin/affiliates/:id/system-role`), và endpoint lấy danh sách quyền nhân viên (`GET /api/v1/admin/staff-permissions`).
- **Cơ sở dữ liệu & Migration:**
  - Các migration liên quan đến bảng `public.profiles`, `public.affiliate_profiles`, `public.audit_logs`, `public.permissions`, `public.permission_groups`, `public.permission_group_items`, `public.staff_permission_groups`.
  - Hàm RPC lưu trữ: `fn_update_user_system_role`, `fn_get_user_permissions`, `fn_has_permission`.
  - Cơ chế lưu trữ thông tin đăng nhập và xác thực của Supabase Auth (`auth.users.last_sign_in_at`, `auth.users.email_confirmed_at`).
- **Kiểm thử & Báo cáo trước:** Các script kiểm thử trong thư mục `scripts/`, `supabase/tests/`, và tài liệu `docs/`.

### 1.2. Giới hạn kiểm tra
- Toàn bộ thao tác kết nối cơ sở dữ liệu đều là **chỉ đọc (Read-only SELECT / RPC query)**. Tuyệt đối không thực thi các lệnh ghi (`INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `CREATE`, `MIGRATE`).
- Không can thiệp sửa đổi Supabase Auth users, không đổi vai trò của tài khoản thực tế, không reset mật khẩu hay can thiệp vào biến môi trường.
- Tách bạch tuyệt đối giữa phân hệ **Tài khoản nhân viên** (`/admin/staff-accounts`) và phân hệ **Quản trị hệ thống** (`/admin/system-settings`).

---

## 2. Route, Menu Và Giao Diện Hiện Tại

### 2.1. Khai báo route và điều hướng tại `src/App.tsx`
- **Vị trí định tuyến:** Tại dòng `598 - 603` file `src/App.tsx`:
  ```tsx
  {currentPath === '/admin/staff-accounts' && (
    <AdminPlaceholderPage
      title="Tài khoản nhân viên"
      onNavigateToOverview={() => navigate('/admin')}
    />
  )}
  ```
- **Component render:** Hiện đang mount `<AdminPlaceholderPage />` (`src/components/admin/AdminPlaceholderPage.tsx`).
- **Giao diện thực tế của `AdminPlaceholderPage`:**
  - Icon biểu tượng thi công: `Construction` (màu vàng hổ phách).
  - Tiêu đề: `"Tài khoản nhân viên"`.
  - Mô tả: *"Phân hệ quản trị này đang được quy hoạch phát triển và hoàn thiện ở các giai đoạn tiếp theo của hệ thống STHC_CTV."*
  - Nút bấm: *"Quay lại Tổng quan"* (`onNavigateToOverview`) điều hướng về `/admin`.
  - **Kết luận:** Đây hoàn toàn là **trang giữ chỗ (Placeholder)**, chưa có bảng dữ liệu, form tìm kiếm, bộ lọc hay tương tác nghiệp vụ nào.

### 2.2. Kiểm tra Route Guard (`src/utils/navigationGuard.ts`)
- **Tại bảng danh mục `APP_ROUTES`:** Tuyến đường `/admin/staff-accounts` **chưa được khai báo tường minh** trong đối tượng `APP_ROUTES`.
- **Tại hàm `checkRouteAccess(path, auth)`:**
  - Tại dòng 341 - 352: Kiểm tra các tuyến đường chỉ dành riêng cho Admin (`/admin/system-settings`, `/admin/email-templates`, `/admin/email-jobs`). Tuyến `/admin/staff-accounts` **không nằm trong danh sách này**.
  - Tại dòng 355 - 367: Rule chung cho các route bắt đầu bằng `/admin`:
    ```ts
    if (cleanPath === '/admin' || cleanPath.startsWith('/admin/') || cleanPath === '/staff' || cleanPath.startsWith('/staff/')) {
      if (role === 'admin' || role === 'staff') {
        return { allowed: true };
      }
      ...
    }
    ```
- **Hệ quả bảo mật hiện tại:** Do route `/admin/staff-accounts` rơi vào tiền tố `/admin/`, cả hai vai trò `admin` và `staff` đều được `checkRouteAccess` cấp phép truy cập (`allowed: true`). Nếu là Staff đăng nhập, Staff vẫn vào được URL này và nhìn thấy trang giữ chỗ. Theo yêu cầu nghiệp vụ quản lý tài khoản nhân viên, phân hệ này chỉ dành riêng cho Quản trị viên (`admin`).

### 2.3. Cấu hình Menu Sidebar (`src/config/navConfig.ts` & `src/components/common/AppLayout.tsx`)
- **Khai báo menu:** Dòng `168 - 177` trong `ADMIN_NAV_ITEMS`:
  ```ts
  {
    id: 'admin_staff',
    title: 'Tài khoản nhân viên',
    path: '/admin/staff-accounts',
    icon: UserCheck,
    isActiveMatch: (currentPath: string) => {
      const clean = currentPath.split('?')[0].split('#')[0];
      return clean === '/admin/staff-accounts';
    },
  }
  ```
- **Điều kiện hiển thị:** Thuộc tính `adminOnly` **chưa được đặt** (`adminOnly: undefined`).
- **Component render (`AppLayout.tsx` lines 177 - 182):**
  ```ts
  const navItems: NavItem[] = (isAdminOrStaff ? ADMIN_NAV_ITEMS : AFFILIATE_NAV_ITEMS).filter((item) => {
    if (item.adminOnly) {
      return user?.role === 'admin' || role === 'admin';
    }
    return true;
  });
  ```
  Do không có `adminOnly: true`, mục “Tài khoản nhân viên” hiện đang hiển thị trên thanh Sidebar của cả Quản trị viên (`Admin`) lẫn Cán bộ Tuyển sinh (`Staff`).
- **Trạng thái Active:** Hàm `isActiveMatch` hoạt động chuẩn xác: khi người dùng điều hướng tới `/admin/staff-accounts`, mục menu này chuyển sang trạng thái active (nền xanh thẫm, icon màu vàng hổ phách, chấm chỉ báo amber).
- **Khả năng điều hướng, reload và bookmark:** Tải lại trang trực tiếp tại `https://.../admin/staff-accounts` được trình duyệt và Route Guard tiếp nhận hợp lệ, render chính xác layout cùng `AdminPlaceholderPage`.

### 2.4. Các component, API client hoặc kiểu dữ liệu liên quan
- **Chưa có component chuyên biệt:** Không có file nào dạng `StaffAccountsView.tsx` hay `AdminStaffAccountsView.tsx`.
- **API Client:** `src/services/api.ts` chưa có hàm nào cho danh sách tài khoản nhân viên (chỉ có `getStaffPermissionsList` phục vụ ma trận phân quyền A5).
- **Kiểu dữ liệu:** Trong `src/types/index.ts` chỉ có interface `Profile` cơ bản, chưa có kiểu dữ liệu đầy đủ cho bản ghi danh sách nhân viên kết hợp quyền và đăng nhập gần nhất.

---

## 3. Sơ Đồ Luồng Tài Khoản: Đăng Ký CTV → Nâng Lên Staff → Nhận Quyền → Thu Hồi

```
[1. Đăng ký Cổng CTV]
        │ Form CTV (/register hoặc AffiliateRegisterModal)
        ▼
   auth.users (Supabase Auth)
        │ Trigger trg_on_auth_user_created
        ▼
   public.profiles (role = 'affiliate', is_active = true)
   public.affiliate_profiles (affiliate_code = 'STHCCTVxxxx', status = 'PENDING_REVIEW')
        │
        │ [2. Xác thực Email & Đạt điều kiện]
        ▼
   auth.users.email_confirmed_at IS NOT NULL
   public.profiles.is_active = true
        │
        │ [3. Thao tác tại /admin/affiliates/:id]
        ▼
   Admin bấm "Cấp quyền cán bộ tuyển sinh" (handleOpenRoleModal('staff'))
   Nhập lý do bắt buộc (reason)
        │
        │ Gửi PATCH /api/v1/admin/affiliates/:id/system-role
        │ Middleware: requireAdminOnly (chặn Staff, chặn tự nâng/hạ chính mình)
        ▼
   RPC fn_update_user_system_role(p_affiliate_id, p_admin_id, 'staff', p_reason)
   Khóa bi quan: FOR UPDATE trên profiles
        ├──> UPDATE public.profiles SET role = 'staff', updated_at = NOW()
        ├──> INSERT public.audit_logs (action = 'SYSTEM_ROLE_ASSIGNED', entity_name = 'profiles')
        └──> INSERT public.audit_logs (action = 'SYSTEM_ROLE_ASSIGNED', entity_name = 'affiliate_profiles')
        │
        ├──> BẢO TOÀN NGUYÊN VẸN:
        │    - public.affiliate_profiles (status, affiliate_code KHÔNG ĐỔI)
        │    - public.leads (khách hàng do CTV giới thiệu giữ nguyên)
        │    - public.lead_reconciliations & public.rewards (đối soát, thù lao giữ nguyên)
        │
        │ [4. Nhận quyền]
        ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ HIỆN TRẠNG QUYỀN NHẬN ĐƯỢC:                                            │
   │ 1. Quyền nền Staff (qua middleware requireStaffOrAdmin):               │
   │    - Đăng nhập Cổng Quản trị (/admin)                                  │
   │    - Xem/chăm sóc Leads toàn trường (/admin/leads)                     │
   │    - Xem danh mục Khóa học (/admin/courses)                            │
   │    - Xem/xét duyệt CTV (/admin/affiliates)                             │
   │    - Thực hiện đối soát nhập học (/admin/reconcile)                    │
   │    - Xem báo cáo tổng quan Dashboard (/admin)                          │
   │                                                                        │
   │ 2. Quyền chuyên biệt chi tiết (RBAC qua fn_get_user_permissions):      │
   │    - Hiện tại: KHÔNG CÓ (EMPTY).                                       │
   │    - Không có trigger hay RPC nào tự gán nhóm quyền vào bảng           │
   │      staff_permission_groups.                                          │
   └────────────────────────────────────────────────────────────────────────┘
        │
        │ [5. Thu hồi vai trò Staff]
        ▼
   Admin bấm "Thu hồi quyền cán bộ tuyển sinh"
   Gửi PATCH /api/v1/admin/affiliates/:id/system-role với targetRole = 'affiliate'
        │
        ▼
   RPC fn_update_user_system_role(p_affiliate_id, p_admin_id, 'affiliate', p_reason)
        ├──> UPDATE public.profiles SET role = 'affiliate', updated_at = NOW()
        ├──> INSERT public.audit_logs (action = 'SYSTEM_ROLE_REVOKED')
        └──> Tài khoản quay về vai trò CTV, truy cập /portal bình thường.
             Toàn bộ hồ sơ CTV, mã giới thiệu, lead và thù lao vẫn vẹn nguyên.
```

---

## 4. Bảng Nguồn Dữ Liệu

| Bảng / Lược đồ | Cột dữ liệu chính | Kiểu dữ liệu | Mục đích nghiệp vụ | Nơi đọc trong Source | Nơi ghi / cập nhật | Ghi chú kiểm tra thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public.profiles` | `id` | `UUID PK` | Khóa chính, tham chiếu 1:1 tới `auth.users(id)` | Khắp hệ thống (Header, AppLayout, middlewares, AdminPortal) | Trigger auth sync khi đăng ký | Đã xác minh trong DB: Có 2 tài khoản role `staff`. |
| `public.profiles` | `email` | `VARCHAR(255)` | Email tài khoản duy nhất | Hiển thị danh tính, đăng nhập | Trigger auth sync | Có ràng buộc `UNIQUE`. |
| `public.profiles` | `full_name` | `VARCHAR(150)` | Họ tên nhân viên / CTV | Hiển thị đại diện, danh sách | `ProfileDetailView`, form đăng ký | Không được để trống. |
| `public.profiles` | `phone` | `VARCHAR(20)` | Số điện thoại liên hệ | `AffiliateDetailView`, `ProfileDetailView` | Cập nhật hồ sơ cá nhân | Tùy chọn. |
| `public.profiles` | `avatar_url` | `TEXT` | Đường dẫn ảnh đại diện | Header, avatar thumbnail | `ProfileDetailView` upload | Tùy chọn. |
| `public.profiles` | `role` | `VARCHAR(30)` | Vai trò hệ thống (`affiliate`, `staff`, `admin`) | Navigation guard, middlewares, giao diện | Duy nhất qua `fn_update_user_system_role` và trigger bootstrap | CHECK constraint: `role IN ('affiliate', 'staff', 'admin')`. |
| `public.profiles` | `is_active` | `BOOLEAN` | Trạng thái kích hoạt tài khoản người dùng | Kiểm tra tại mọi middleware đăng nhập | Quản trị viên vô hiệu hóa | Mặc định `TRUE`. Nếu `FALSE`, bị chặn ngay tại tầng middleware. |
| `public.profiles` | `created_at` | `TIMESTAMPTZ` | Thời điểm tạo tài khoản | `AffiliateDetailView` | Tự động `NOW()` khi tạo | Đã xác minh có giá trị chuẩn. |
| `public.profiles` | `updated_at` | `TIMESTAMPTZ` | Thời điểm cập nhật hồ sơ gần nhất | Quản lý thay đổi | Trigger `trg_profiles_updated_at` | Tự động cập nhật. |
| `auth.users` (Supabase Auth) | `last_sign_in_at` | `TIMESTAMPTZ` | **Thời điểm đăng nhập gần nhất** | `server.ts` (chưa dùng cho staff list) | Supabase Auth engine tự động ghi khi login | **Không nằm trong `public.profiles`**. Có trong `auth.users`. Đã xác minh đọc được qua `supabase.auth.admin.listUsers()`. |
| `auth.users` (Supabase Auth) | `email_confirmed_at` | `TIMESTAMPTZ` | Mốc thời gian email được xác thực | `server.ts` (dòng 6019, 6265) | Supabase Auth khi xác nhận OTP/Link | Điều kiện tiên quyết để được nâng Staff. |
| `public.affiliate_profiles` | `id`, `user_id`, `affiliate_code`, `status` | `UUID`, `VARCHAR`, `VARCHAR` | Hồ sơ Cộng tác viên gắn với tài khoản | `AffiliateDetailView`, `api.getAffiliateDetail` | `handleReviewAffiliate`, `AffiliateRegisterModal` | Khóa ngoại `user_id ON DELETE RESTRICT`. Không bị xóa hay đổi khi nâng/hạ Staff. |
| `public.permissions` | `code`, `name`, `description` | `VARCHAR`, `VARCHAR`, `TEXT` | Danh mục mã quyền hệ thống | `server.ts` line 12920, `AdminPermissionsView` | Migration seed (17 quyền) | Đã xác minh trong DB: Có 17 mã quyền. |
| `public.permission_groups` | `code`, `name`, `description` | `VARCHAR`, `VARCHAR`, `TEXT` | Danh mục nhóm quyền | `server.ts` line 12921, `AdminPermissionsView` | Migration seed (3 nhóm) | Đã xác minh trong DB: Có 3 nhóm quyền (`reward_manager`, `reward_viewer`, `notification_manager`). |
| `public.permission_group_items` | `group_code`, `permission_code` | `VARCHAR`, `VARCHAR` | Ánh xạ nhóm quyền và các mã quyền chi tiết | `server.ts` line 12925, `fn_get_user_permissions` | Migration seed | Ràng buộc khóa ngoại `CASCADE`. |
| `public.staff_permission_groups` | `id`, `staff_id`, `group_code`, `is_active`, `assigned_by`, `assigned_at` | `UUID`, `UUID`, `VARCHAR`, `BOOLEAN`, `UUID`, `TIMESTAMPTZ` | Gán nhóm quyền cho nhân viên cụ thể | `server.ts` line 12957, `fn_get_user_permissions` | `POST /api/v1/admin/staff-permissions/assign` | Đã xác minh trong DB: Hiện có 2 bản ghi cho 1 nhân viên; nhân viên còn lại chưa có bản ghi nào. |
| `public.audit_logs` | `actor_id`, `action`, `entity_name`, `entity_id`, `old_values`, `new_values`, `reason`, `created_at` | Đa dạng | Nhật ký kiểm toán hành động nâng/hạ vai trò | `AffiliateDetailView` line 6277, `api.getAdminAuditLogs` | `fn_update_user_system_role` | Đã xác minh trong DB: Có 2 log `SYSTEM_ROLE_ASSIGNED` từ ngày 04/10/2026. |

---

## 5. Bảng API, RPC Và Middleware Liên Quan

| Tên Endpoint / Hàm / Middleware | Loại hình | Quyền truy cập | Chức năng nghiệp vụ | Vị trí file mã nguồn |
| :--- | :--- | :--- | :--- | :--- |
| `requireStaffOrAdmin` | Express Middleware | Bearer token (`staff` hoặc `admin`), `is_active = true` | Xác thực người dùng nội bộ, nạp `(req as any).user` | `server.ts` (dòng 4321 – 4398) |
| `requireAdminOnly` | Express Middleware | Bearer token (`admin`), `is_active = true` | Chặn triệt để Staff và CTV, chỉ cho phép Admin | `server.ts` (dòng 4445 – 4519) |
| `requirePermission(permCode)` | Express Middleware | Bearer token (`admin` mặc định qua; `staff` phải có quyền qua `fn_has_permission`) | Kiểm tra quyền chi tiết RBAC cho từng thao tác | `server.ts` (dòng 4400 – 4443) |
| `PATCH /api/v1/admin/affiliates/:id/system-role` | API REST Endpoint | `requireAdminOnly` | Cấp hoặc thu hồi vai trò Staff cho tài khoản CTV | `server.ts` (dòng 6320 – 6454) |
| `fn_update_user_system_role` | PostgreSQL RPC (`SECURITY DEFINER`) | `authenticated`, `service_role` (kiểm tra caller `role = 'admin'` trong thân hàm) | Cập nhật `profiles.role`, ghi 2 bản ghi `audit_logs` trong transaction duy nhất | `supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql` |
| `GET /api/v1/admin/staff-permissions` | API REST Endpoint | `requireAdminOnly` | Lấy danh sách nhân viên (`role = 'staff'`), nhóm quyền và quyền hiệu lực | `server.ts` (dòng 12947 – 12988) |
| `POST /api/v1/admin/staff-permissions/assign` | API REST Endpoint | `requireAdminOnly` | Gán một nhóm quyền cho nhân viên (`staff_permission_groups`) | `server.ts` (dòng 12990 – 13015) |
| `POST /api/v1/admin/staff-permissions/revoke` | API REST Endpoint | `requireAdminOnly` | Thu hồi nhóm quyền của nhân viên (`is_active = false`) | `server.ts` (dòng 13017 – 13036) |
| `fn_get_user_permissions(UUID)` | PostgreSQL RPC (`SECURITY DEFINER`) | `public` / `authenticated` | Trả về danh sách quyền hiệu lực của người dùng | `supabase/migrations/20261006000001_a5_permissions_foundation.sql` |
| `fn_has_permission(UUID, TEXT)` | PostgreSQL RPC (`SECURITY DEFINER`) | `public` / `authenticated` | Kiểm tra boolean người dùng có sở hữu mã quyền cụ thể | `supabase/migrations/20261006000001_a5_permissions_foundation.sql` |
| `GET /api/v1/admin/staff-accounts` | API REST Endpoint | **CHƯA CÓ** | Lấy danh sách nhân viên phục vụ màn hình `/admin/staff-accounts` (phân trang, search, đăng nhập gần nhất, nhóm quyền) | **Chưa triển khai (GAP)** |

---

## 6. Hiện Trạng RBAC: Quyền Nền Staff, Nhóm Quyền Và Cơ Chế Gán Khi Nâng Vai Trò

### 6.1. Ba tầng quyền trong hệ thống hiện tại
Hệ thống hiện phân tách 3 cấp độ phân quyền độc lập:

1. **Quyền nền phát sinh từ vai trò `staff` (`profiles.role = 'staff'`):**
   - Được kiểm tra thông qua middleware `requireStaffOrAdmin` và Route Guard.
   - Khi có vai trò `staff`, người dùng mặc nhiên có quyền:
     - Đăng nhập Cổng Quản trị tại `/admin`.
     - Xem và xét duyệt danh sách Cộng tác viên (`/admin/affiliates`, duyệt, từ chối, tạm ngưng, kích hoạt lại).
     - Xem và quản lý danh mục Khóa học của trường (`/admin/courses`).
     - Tiếp nhận, xem và chăm sóc khách hàng (Leads) của tất cả CTV (`/admin/leads`, ghi nhật ký chăm sóc).
     - Xem danh sách và thực hiện đối soát nhập học & học phí (`/admin/reconcile`).
     - Xem các biểu đồ và chỉ số tổng quan tuyển sinh trên Dashboard (`/admin`).
2. **Quyền chuyên biệt được cấp qua Nhóm quyền (Granular RBAC):**
   - Được kiểm tra thông qua middleware `requirePermission(...)` và hàm RPC `fn_has_permission`.
   - Được cấp theo từng nhóm (`permission_groups`), người dùng Staff chỉ có quyền này nếu được gán bản ghi đang hoạt động (`is_active = TRUE`) trong bảng `staff_permission_groups`.
   - Bao gồm:
     - Phân hệ Thù lao A5: `rewards.view`, `rewards.view_detail`, `rewards.approve`, `rewards.reject`, `rewards.void`, `rewards.summary`, `rewards.export` (đóng gói trong nhóm `reward_manager` hoặc `reward_viewer`).
     - Phân hệ Thông báo C3: `notifications.view`, `notifications.create`, `notifications.publish`, `notifications.revoke` (đóng gói trong nhóm `notification_manager`).
3. **Quyền mặc định của Quản trị viên (`admin`):**
   - Có sẵn toàn bộ quyền nền của Staff.
   - Có toàn bộ 17 quyền trong danh mục quyền (`fn_get_user_permissions` tự động trả về toàn bộ permissions mà không cần gán nhóm nào).
   - Độc quyền thực hiện các chức năng nhạy cảm qua `requireAdminOnly`: Quản trị hệ thống, Quản lý mẫu Email, Giám sát hàng đợi Email, Nâng/thu hồi vai trò Staff, và Quản lý phân quyền A5.

### 6.2. Cơ chế gán quyền khi Admin nâng CTV lên Staff
- **Kết quả kiểm tra trực tiếp mã nguồn:**
  - File `supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql`: Hàm `fn_update_user_system_role` chỉ thực thi:
    ```sql
    UPDATE public.profiles
    SET role = p_target_role, updated_at = v_now
    WHERE id = v_target_user.id;
    ```
    Hàm này **hoàn toàn không chứa bất kỳ câu lệnh `INSERT` nào vào bảng `staff_permission_groups`**.
  - File `server.ts` (lines 6423 – 6449): Endpoint `PATCH /api/v1/admin/affiliates/:id/system-role` chỉ gọi duy nhất RPC `fn_update_user_system_role`.
- **Kết quả kiểm tra cơ sở dữ liệu thật:**
  - Tra cứu tài khoản nhân viên `Võ Minh Quân (Cán bộ Tuyển sinh)` (`id = 28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`, `role = 'staff'`):
    - Số lượng bản ghi trong `staff_permission_groups`: **0 bản ghi**.
    - Kết quả chạy `fn_get_user_permissions('28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f')`: **Rỗng (0 quyền)**.
  - Danh mục nhóm quyền hiện có trong CSDL: Chỉ có 3 nhóm (`reward_manager`, `reward_viewer`, `notification_manager`). **Không tồn tại nhóm quyền mặc định nào tên là `staff_default` hay `staff_general`**.
- **KẾT LUẬN QUAN TRỌNG:**
  - **Hệ thống hiện tại CHƯA CÓ cơ chế tự động gán nhóm quyền mặc định khi nâng vai trò CTV lên Staff.**
  - Sau khi được nâng lên Staff, tài khoản chỉ nhận được quyền nền Staff (truy cập `/admin`, Leads, Khóa học, Đối soát), nhưng **hoàn toàn không có quyền chuyên biệt nào thuộc phân hệ Thù lao A5 hay Thông báo BQT** cho đến khi Quản trị viên vào màn hình `/admin/permissions` để gán nhóm thủ công.

### 6.3. Hành vi khi thu hồi vai trò Staff
- Khi Admin thu hồi quyền Staff (`targetRole = 'affiliate'`), hàm `fn_update_user_system_role` chuyển `profiles.role = 'affiliate'`.
- Khi người dùng này truy cập API yêu cầu quyền, `fn_get_user_permissions` kiểm tra `v_role` thấy không phải `'staff'` hay `'admin'` nên lập tức trả về danh sách quyền rỗng.
- **Điểm lưu ý:** Bảng `staff_permission_groups` không tự động bị xóa hay cập nhật `is_active = false` khi thu hồi Staff. Nếu tài khoản này được nâng lại lên Staff trong tương lai, các nhóm quyền cũ sẽ tự động có hiệu lực trở lại.

---

## 7. Hiện Trạng Nhóm Quyền Và Lần Đăng Nhập Gần Nhất Cho Danh Sách Nhân Viên

### 7.1. Hiện trạng hiển thị nhóm quyền của Staff
- **Bảng `staff_permission_groups`:**
  - Đã có cấu trúc chuẩn liên kết `staff_id` (trỏ về `profiles.id`) và `group_code` (trỏ về `permission_groups.code`).
  - Có cờ `is_active` và mốc thời gian `assigned_at`, người gán `assigned_by`.
- **Dữ liệu thực tế:**
  - Trong DB hiện có 2 tài khoản Staff:
    1. `phuongsht@gmail.com` (`Đào Văn Phương`): Được gán 2 nhóm `reward_viewer` và `reward_manager`.
    2. `tuyensinh_canbo@sthc.edu.vn` (`Võ Minh Quân`): Chưa được gán bất kỳ nhóm quyền nào.
- **Khả năng truy vấn:** Đã có câu truy vấn mẫu trong `server.ts` (endpoint `GET /api/v1/admin/staff-permissions` line 12956) thực hiện `supabase.from('staff_permission_groups').select('*')` và ánh xạ nhóm theo `staff_id`. Có thể mở rộng để hiển thị cột nhóm quyền trên danh sách nhân viên.

### 7.2. Hiện trạng lần đăng nhập gần nhất (`last_sign_in_at`)
- **Nguồn lưu trữ:**
  - `public.profiles` **không có cột `last_sign_in_at`**.
  - Supabase Auth lưu trữ `last_sign_in_at` trong bảng nội bộ `auth.users`.
- **Dữ liệu thực tế đã kiểm tra trên hệ thống:**
  - `tuyensinh_canbo@sthc.edu.vn`: `last_sign_in_at = '2026-10-03T22:20:23.238386Z'`
  - `phuongsht@gmail.com`: `last_sign_in_at = '2026-10-06T01:13:42.955105Z'`
  - `admin@sthc.edu.vn`: `last_sign_in_at = '2026-10-14T03:25:07.183155Z'`
- **Cách thức truy xuất từ Backend:**
  - Máy chủ Backend chạy với `SUPABASE_SERVICE_ROLE_KEY` có toàn quyền gọi `supabase.auth.admin.listUsers()` hoặc `supabase.auth.admin.getUserById(userId)`.
  - Cơ chế này hiện đã được sử dụng thành công tại `server.ts` dòng 6019 (`supabase.auth.admin.listUsers()`) để lấy trạng thái xác thực email cho danh sách CTV.
  - Tuy nhiên, hiện tại **chưa có endpoint nào kết hợp `public.profiles` của Staff với `auth.users.last_sign_in_at`** để trả về cho màn hình `/admin/staff-accounts`.

---

## 8. Nhật Ký, RLS Và Các Kiểm Soát Bảo Mật

### 8.1. Bảng `audit_logs` và lưu vết thao tác
- **Cấu trúc bảng:** `id`, `actor_id`, `action`, `entity_name`, `entity_id`, `old_values`, `new_values`, `reason`, `ip_address`, `user_agent`, `created_at`.
- **Ghi nhật ký khi nâng/hạ vai trò:**
  - Hàm RPC `fn_update_user_system_role` ghi đồng thời 2 bản ghi kiểm toán trong cùng một transaction:
    1. Một bản ghi cho thực thể `profiles` (ghi nhận thay đổi `role` từ cũ sang mới kèm lý do).
    2. Một bản ghi cho thực thể `affiliate_profiles` (ghi nhận sự kiện đổi vai trò hệ thống gắn với hồ sơ CTV).
  - Dữ liệu thực tế: Trong CSDL thật đã ghi nhận 2 bản ghi `SYSTEM_ROLE_ASSIGNED` vào ngày 04/10/2026 với lý do: *"Phân công nhân viên tuyển sinh"*, actor là tài khoản Admin `admin@sthc.edu.vn`.

### 8.2. Bảo vệ chống leo thang đặc quyền (Privilege Escalation Prevention)
- **Tầng Database:**
  - Bảng `public.profiles` có RLS thu hồi quyền ghi từ `authenticated` và `anon`.
  - Có trigger chống sửa đổi trái phép cột `role` và `is_active` (`trg_prevent_profile_escalation`).
  - Hàm RPC `fn_update_user_system_role` có kiểm tra nghiêm ngặt:
    - Bắt buộc caller phải có `role = 'admin'` và `is_active = TRUE`.
    - Chặn thay đổi tài khoản Admin (`v_old_role = 'admin'`).
    - Chặn tự thay đổi quyền của chính mình (`v_target_user.id = p_admin_id`).
    - Bắt buộc tài khoản đích phải `is_active = TRUE` và đã xác thực email (`email_confirmed_at IS NOT NULL`).
    - Bắt buộc nhập lý do thay đổi (`p_reason` không được rỗng).
- **Tầng Backend Middleware:**
  - Endpoint `PATCH /api/v1/admin/affiliates/:id/system-role` được bảo vệ bằng middleware `requireAdminOnly`. Middleware này giải mã JWT token qua `supabaseAuth.auth.getUser(token)`, truy vấn lại bảng `profiles` thật để xác nhận `role === 'admin'`. CTV hoặc Staff gọi endpoint này đều bị trả về HTTP 403 `ADMIN_ONLY`.

### 8.3. Hiệu lực tức thì khi khóa tài khoản hoặc thu hồi vai trò
- Khi tài khoản bị vô hiệu hóa (`is_active = FALSE`):
  - Mọi request của tài khoản đó gửi lên Backend đều bị chặn tại `requireStaffOrAdmin` và `requireAdminOnly` với mã lỗi HTTP 403 `ACCOUNT_DISABLED`.
  - Trên Frontend, Route Guard `navigationGuard.ts` kiểm tra `user.is_active === false` và điều hướng ngay lập tức sang màn hình `AccessNoticeScreen` loại `DISABLED`.
- Khi vai trò bị thu hồi về `affiliate`:
  - Request tiếp theo của người dùng gửi lên các endpoint quản trị `/admin/*` sẽ bị chặn với mã lỗi HTTP 403 `ROLE_FORBIDDEN`.
  - Trên Frontend, Route Guard tự động chuyển hướng về `/portal`.

---

## 9. Các Test Đã Có Và Kết Quả Xác Minh

| File kiểm thử / Script | Mục đích kiểm thử | Kết quả xác minh mã nguồn & DB |
| :--- | :--- | :--- |
| `scripts/verify_auth_bootstrap.ts` | Kiểm tra đồng bộ Auth, chống leo thang quyền khi đăng ký CTV, kiểm tra trigger RLS chặn CTV tự sửa `role`, và kiểm tra nâng quyền Admin an toàn. | **Tồn tại và hoạt động**. Đã xác nhận cơ chế bảo vệ `profiles.role` chống can thiệp trực tiếp từ client. |
| `supabase/tests/001_verification_test_suite.sql` | Bộ test SQL kiểm tra tính toàn vẹn schema, foreign keys `ON DELETE RESTRICT` và partial unique indexes. | **Tồn tại**. Xác nhận cấu trúc schema 001. |
| `supabase/tests/002_jwt_auth_role_cases_test.sql` | Kiểm tra phân quyền truy cập theo từng vai trò JWT (anon, authenticated CTV, staff, admin). | **Tồn tại**. Kiểm tra RLS và quyền truy cập bảng. |
| `scripts/verify_admin_staff_bell.ts` | Kiểm tra chuông thông báo cho Admin/Staff, tra cứu tài khoản Staff và phát sinh sự kiện thông báo. | **Tồn tại và đã chạy**. Xác nhận trong DB có tài khoản Staff hoạt động. |
| Test cho luồng nâng CTV lên Staff (`fn_update_user_system_role`) | Kiểm thử Admin nâng CTV lên Staff, thu hồi Staff, bảo toàn hồ sơ CTV, chặn tự nâng quyền. | **Đã có bằng chứng thực tế trong DB**: Dữ liệu thật chứa 2 audit log `SYSTEM_ROLE_ASSIGNED` từ 04/10/2026. Chưa có file unit test độc lập dạng `.spec.ts` riêng cho RPC này. |
| Test cho màn hình `/admin/staff-accounts` | Kiểm tra danh sách nhân viên, phân trang, hiển thị nhóm quyền và lần đăng nhập gần nhất. | **CHƯA CÓ**. Màn hình chưa được triển khai nên chưa có bộ test tương ứng. |

---

## 10. Bảng Phân Loại Từng Nội Dung Kiểm Kê

| Hạng mục kiểm kê | Hiện trạng trong Source | Hiện trạng trong Database | Phân loại | Bằng chứng cụ thể |
| :--- | :--- | :--- | :--- | :--- |
| **Route `/admin/staff-accounts`** | Có trong `App.tsx` (dòng 598) | Không áp dụng (Route client) | **Đã có và xác minh trong source** | Render `AdminPlaceholderPage` |
| **Giao diện trang giữ chỗ** | Có trong `AdminPlaceholderPage.tsx` | Không áp dụng | **Đã có và xác minh trong source** | Khung giao diện Construction |
| **Mục Sidebar "Tài khoản nhân viên"** | Có trong `navConfig.ts` (dòng 169) | Không áp dụng | **Đã có và xác minh trong source** | Hiển thị icon `UserCheck`, thiếu cờ `adminOnly: true` |
| **Route Guard cho staff-accounts** | Trong `navigationGuard.ts` | Không áp dụng | **Đã có và xác minh trong source** | Chưa chặn role `staff` vào route này |
| **Bảng `public.profiles`** | Migration `20260929000001` | Đã chạy trên DB thật | **Đã có và xác minh trong DB** | Có 2 tài khoản role `staff` |
| **Bảng `public.affiliate_profiles`** | Migration `20260929000001` | Đã chạy trên DB thật | **Đã có và xác minh trong DB** | Cả 2 Staff đều có hồ sơ CTV tương ứng được bảo toàn |
| **Luồng nâng/thu hồi vai trò Staff** | `AffiliateDetailView.tsx` + `server.ts` | RPC `fn_update_user_system_role` | **Đã có và xác minh trong DB** | 2 bản ghi `SYSTEM_ROLE_ASSIGNED` trong `audit_logs` |
| **Bảo toàn hồ sơ CTV khi nâng Staff** | `fn_update_user_system_role` không sửa `affiliate_profiles` | DB giữ nguyên mã và status CTV | **Đã có và xác minh trong DB** | 1 CTV `ACTIVE`, 1 CTV `PENDING_REVIEW` giữ nguyên |
| **Bảng danh mục quyền `permissions`** | Migration `20261006000001` & `20261008000001` | Đã chạy trên DB thật | **Đã có và xác minh trong DB** | 17 mã quyền trong CSDL thật |
| **Bảng nhóm quyền `permission_groups`** | Migration `20261006000001` & `20261008000001` | Đã chạy trên DB thật | **Đã có và xác minh trong DB** | 3 nhóm: `reward_manager`, `reward_viewer`, `notification_manager` |
| **Bảng gán nhóm `staff_permission_groups`**| Migration `20261006000001` | Đã chạy trên DB thật | **Đã có và xác minh trong DB** | Đã có dữ liệu gán cho 1 nhân viên |
| **Tự gán nhóm quyền khi nâng Staff** | Không có trong code hay migration | Không có trigger trong DB | **Chưa có (Khoảng thiếu - GAP)** | `fn_update_user_system_role` không gán nhóm quyền |
| **Nhóm quyền mặc định cho Staff** | Không có trong code hay migration | Không có trong `permission_groups` | **Chưa có (Khoảng thiếu - GAP)** | Chỉ có 3 nhóm chuyên biệt (thù lao & thông báo) |
| **Lần đăng nhập gần nhất `last_sign_in_at`**| Chưa có trong `public.profiles` | Có trong Supabase `auth.users` | **Có trong DB (Auth) nhưng chưa có API cho Staff** | Xác minh đọc được qua `supabase.auth.admin.listUsers()` |
| **API lấy danh sách tài khoản nhân viên** | Chưa có endpoint chuyên biệt cho màn hình này | Bảng `profiles` có đủ dữ liệu | **Chưa có (Khoảng thiếu - GAP)** | Chỉ có `GET /api/v1/admin/staff-permissions` (phục vụ tab A5) |
| **Giao diện danh sách nhân viên thật** | Chưa có | Không áp dụng | **Chưa có (Khoảng thiếu - GAP)** | Đang là `AdminPlaceholderPage` |

---

## 11. Khoảng Thiếu (Gaps) Và Các Điểm Cần Chốt Trước Khi Thiết Kế A7-NV.1

Qua quá trình kiểm kê chi tiết, nhóm kỹ thuật xác định các khoảng thiếu và các điểm cần làm rõ trước khi bước vào thiết kế chi tiết A7-NV.1:

### 11.1. Các khoảng thiếu kỹ thuật (Technical Gaps)
1. **Thiếu cơ chế tự gán nhóm quyền mặc định khi nâng vai trò:**
   - Khi Admin nâng một CTV lên Staff tại `/admin/affiliates/:id`, RPC `fn_update_user_system_role` chỉ cập nhật `profiles.role = 'staff'`.
   - Nhân viên mới nâng hoàn toàn không có nhóm quyền nào trong `staff_permission_groups`.
   - Cần quyết định: Có tạo thêm một nhóm quyền mặc định (ví dụ: `staff_default` hoặc `admissions_officer`) hay không, và việc gán nhóm mặc định này sẽ thực hiện tự động trong RPC hay để Admin gán thủ công tại màn hình Tài khoản nhân viên?
2. **Thiếu API chuyên biệt phục vụ màn hình Tài khoản nhân viên:**
   - Endpoint hiện tại `GET /api/v1/admin/staff-permissions` được thiết kế riêng cho ma trận phân quyền A5, không có phân trang, không có tìm kiếm theo tên/email/số điện thoại, và không trả về `last_sign_in_at`.
   - Cần xây dựng API mới: `GET /api/v1/admin/staff-accounts` hỗ trợ:
     - Phân trang (`page`, `limit`, `total`, `totalPages`).
     - Tìm kiếm theo từ khóa (`full_name`, `email`, `phone`, `affiliate_code`).
     - Bộ lọc theo trạng thái (`is_active`, nhóm quyền).
     - Kết hợp dữ liệu `last_sign_in_at` từ Supabase Auth (`auth.users`).
     - Trả về danh sách các nhóm quyền đang được gán.
3. **Lỗ hổng phân quyền truy cập menu và route `/admin/staff-accounts`:**
   - Trong `src/config/navConfig.ts`: Mục `admin_staff` chưa có cờ `adminOnly: true`, khiến tài khoản Staff hiện tại nhìn thấy mục này trên thanh Sidebar.
   - Trong `src/utils/navigationGuard.ts`: `checkRouteAccess` chưa đưa `/admin/staff-accounts` vào danh sách route chỉ dành riêng cho Admin, khiến Staff có thể gõ trực tiếp URL để truy cập.
   - Cần bổ sung `adminOnly: true` và cập nhật Route Guard để chỉ tài khoản có `role === 'admin'` mới được phép truy cập.
4. **Truy xuất thời điểm đăng nhập gần nhất (`last_sign_in_at`):**
   - Do `last_sign_in_at` nằm trong lược đồ `auth.users`, client thông thường không thể truy vấn trực tiếp bằng PostgREST.
   - Cần thống nhất giải pháp kiến trúc:
     - *Phương án 1 (Khuyến nghị):* Backend API sử dụng `supabase.auth.admin.listUsers()` hoặc `getUserById()` để ghép mốc thời gian đăng nhập vào response trả về (tương tự như cách đã làm cho `email_verified` tại `server.ts`).
     - *Phương án 2:* Tạo một Database View hoặc PostgreSQL RPC có `SECURITY DEFINER` để JOIN `public.profiles` với `auth.users(last_sign_in_at)`.
5. **Cơ chế thu hồi vai trò Staff và dọn dẹp nhóm quyền:**
   - Hiện tại khi thu hồi vai trò Staff, các bản ghi trong `staff_permission_groups` vẫn được giữ nguyên với `is_active = true`.
   - Cần chốt quy tắc nghiệp vụ: Khi thu hồi quyền Staff, hệ thống có tự động cập nhật `is_active = false` cho toàn bộ nhóm quyền của nhân viên đó hay không.

### 11.2. Các điểm nghiệp vụ cần chốt trước khi triển khai A7-NV.1
1. **Phạm vi thao tác trên màn hình `/admin/staff-accounts`:**
   - Màn hình này là màn hình **Quản lý danh sách nhân viên**: chỉ xem, tìm kiếm, lọc, xem chi tiết, và gán/thu hồi nhóm quyền; hay có nút điều hướng nhanh tới màn hình hồ sơ CTV để nâng/thu hồi vai trò Staff?
   - Có cho phép Admin kích hoạt / vô hiệu hóa tài khoản nhân viên (`is_active: true/false`) trực tiếp từ màn hình này hay không?
2. **Quy định về nhóm quyền mặc định của Staff:**
   - Có cần bổ sung các nhóm quyền nghiệp vụ khác ngoài 3 nhóm hiện có (`reward_manager`, `reward_viewer`, `notification_manager`) hay không (ví dụ: nhóm phụ trách tuyển sinh, nhóm đối soát)?
   - Tên và danh mục quyền của nhóm quyền Staff mặc định sẽ bao gồm những quyền gì?

---

## 12. Kết Luận Và Đề Xuất Bước Kế Tiếp

- **Mức độ hoàn tất bước A7-NV.0:**
  - Nhóm kỹ thuật đã hoàn thành kiểm kê 100% các hạng mục theo đúng yêu cầu: Route, menu, component giữ chỗ, luồng cấp/thu hồi vai trò Staff, hiện trạng RBAC, cơ sở dữ liệu thực tế và các lỗ hổng bảo vệ route.
  - Quá trình kiểm kê tuân thủ tuyệt đối quy tắc **chỉ đọc**: không ghi dữ liệu, không can thiệp schema, không sửa mã nguồn chức năng.
- **Giới hạn xác minh đã vượt qua:**
  - Đã kết nối và xác minh trực tiếp cấu trúc dữ liệu trên cơ sở dữ liệu thật của dự án thông qua client chỉ đọc (Supabase Service Client), xác nhận có 2 tài khoản Staff, 17 mã quyền, 3 nhóm quyền, 2 bản ghi gán nhóm quyền, và 2 bản ghi audit log thực tế.
- **Đề xuất bước kế tiếp:**
  - Kết thúc bước A7-NV.0.
  - Chuyển sang bước tiếp theo **A7-NV.1 (Đặc tả chi tiết và thiết kế kỹ thuật màn hình Tài khoản nhân viên)** để chốt danh mục nhóm quyền mặc định, thiết kế schema API `GET /api/v1/admin/staff-accounts`, và giao diện danh sách theo chuẩn thiết kế STHC_CTV.
