# ĐẶC TẢ QUY TẮC BẢO MẬT, KIỂM SOÁT TRUY CẬP VÀ NHẬT KÝ KIỂM TOÁN TÀI KHOẢN NHÂN VIÊN (A7-NV.4)

- **Mã tài liệu:** `A7-NV.4`
- **Tên tài liệu:** Đặc tả quy tắc bảo mật, kiểm soát truy cập phân tầng và nhật ký kiểm toán (Audit Logs) cho phân hệ Quản lý Tài khoản nhân viên (`/admin/staff-accounts`)
- **Phân hệ đối ứng:** Quản lý Tài khoản nhân viên & Bảo mật hệ thống (`/admin/staff-accounts`, `/admin/affiliates`, `/admin/permissions`)
- **Tài liệu căn cứ:** 
  - `docs/A7_NV_0_STAFF_ACCOUNTS_AUDIT_REPORT.md` (Báo cáo kiểm kê source code & CSDL)
  - `docs/A7_NV_1_STAFF_ACCOUNTS_SCOPE_SPEC.md` (Đặc tả phạm vi màn hình)
  - `docs/A7_NV_2_STAFF_DEFAULT_PERMISSIONS_SPEC.md` (Chính sách phân quyền mặc định và vòng đời Staff)
  - `docs/A7_NV_3_STAFF_PERMISSION_DISPLAY_SPEC.md` (Quy tắc hiển thị phân quyền trên giao diện)
- **Thời điểm lập:** 14/10/2026
- **Trạng thái:** **CHỐT ĐẶC TẢ BẢO MẬT VÀ NHẬT KÝ (SPECIFICATION ONLY)**. Chưa sửa đổi mã nguồn hoặc database.

---

## 1. Phạm Vi Và Các Tài Liệu / Source Code Được Đối Chiếu

### 1.1. Phạm vi áp dụng
Đặc tả này thiết lập toàn bộ các quy tắc bảo mật kỹ thuật, cơ chế xác thực phiên, kiểm soát truy cập đa tầng và lưu vết kiểm toán bắt buộc đối với 4 nhóm thao tác:
1. **Xem danh sách và chi tiết tài khoản Staff:** Tại tuyến đường `/admin/staff-accounts`.
2. **Khóa và mở khóa tài khoản nhân viên (`profiles.is_active`):** Thao tác kiểm soát trạng thái đăng nhập của Staff.
3. **Nâng CTV lên Staff và thu hồi vai trò Staff:** Thao tác chuyển đổi vai trò hệ thống tại `/admin/affiliates/:id`.
4. **Gán và thu hồi nhóm quyền chuyên biệt:** Thao tác phân bổ quyền hạn Thù lao A5 và Thông báo C3 tại `/admin/permissions`.

### 1.2. Danh mục tài liệu và file mã nguồn được đối chiếu trực tiếp
- **Mã nguồn Backend & Middleware:**
  - `server.ts`: Middleware `requireStaffOrAdmin` (dòng 4321), `requireAdminOnly` (dòng 4445), `requirePermission` (dòng 4400).
  - `server.ts`: Endpoint đổi vai trò `PATCH /api/v1/admin/affiliates/:id/system-role` (dòng 6320).
  - `server.ts`: Endpoint phân quyền `GET/POST /api/v1/admin/staff-permissions/*` (dòng 12947).
  - `server.ts`: Endpoint nhật ký kiểm toán `GET /api/v1/admin/audit-logs` (dòng 10311).
- **Lược đồ CSDL, Trigger & Migration Supabase:**
  - `supabase/migrations/20260929000001_initial_schema.sql`: Lược đồ bảng `profiles`, `affiliate_profiles`, `audit_logs`.
  - `supabase/migrations/20260929000002_permissions_and_rls.sql`: RLS policies thu hồi quyền ghi từ `authenticated`, chỉ cho phép `service_role` và `get_auth_role() = 'admin'`.
  - `supabase/migrations/20260929000003_auth_profile_sync.sql`: Trigger chống leo thang quyền `prevent_profile_privilege_escalation()` và `trg_prevent_profile_escalation`.
  - `supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql`: Hàm RPC nguyên tử `fn_update_user_system_role`.
  - `supabase/migrations/20261006000001_a5_permissions_foundation.sql`: Bảng `permissions`, `permission_groups`, `staff_permission_groups`, hàm `fn_get_user_permissions` và `fn_has_permission`.
  - `supabase/migrations/20261008000001_c3_notification_schema_and_permissions.sql`: Nhóm quyền `notification_manager` và 4 quyền C3.
- **Frontend Route Guard & Navigation:**
  - `src/App.tsx`: Định tuyến và mount component giữ chỗ dòng 598.
  - `src/config/navConfig.ts`: Cấu hình danh mục menu `ADMIN_NAV_ITEMS` (dòng 168).
  - `src/utils/navigationGuard.ts`: Khai báo `APP_ROUTES` và logic đánh giá `checkRouteAccess`.

---

## 2. Ma Trận Quyền Truy Cập (Access Control Matrix)

### 2.1. Ma trận phân quyền theo từng thao tác cụ thể

| Thao tác nghiệp vụ | Quản trị viên (`admin`) đang hoạt động | Cán bộ Tuyển sinh (`staff`) đang hoạt động | Cộng tác viên (`affiliate`) | Khách vãng lai (`public` / chưa login) |
| :--- | :---: | :---: | :---: | :---: |
| **Xem danh sách tài khoản Staff** (`GET /api/v1/admin/staff-accounts`) | **CHO PHÉP** | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |
| **Xem chi tiết tài khoản Staff** (`GET /api/v1/admin/staff-accounts/:id`) | **CHO PHÉP** | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |
| **Khóa / Mở khóa tài khoản Staff** (`PATCH .../active-status`) | **CHO PHÉP** | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |
| **Nâng CTV lên Staff / Thu hồi Staff** (`PATCH .../system-role`) | **CHO PHÉP** (tại Quản lý CTV) | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |
| **Gán / Thu hồi nhóm quyền** (`POST .../staff-permissions/*`) | **CHO PHÉP** (tại Phân quyền) | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |
| **Xem Audit Logs của các thao tác này** (`GET .../audit-logs`) | **CHO PHÉP** (tại Nhật ký) | **CHẶN** (HTTP 403 `ADMIN_ONLY`) | **CHẶN** (HTTP 403 `ROLE_FORBIDDEN`) | **CHẶN** (HTTP 401 `UNAUTHENTICATED`) |

### 2.2. Nguyên tắc bảo vệ đa tầng (Defense in Depth)
1. **Tầng Giao diện (Presentation Layer):**
   - Không chỉ ẩn nút bấm hoặc ẩn mục menu trên thanh điều hướng bên (Sidebar).
   - Menu `admin_staff` trong `src/config/navConfig.ts` bắt buộc có thuộc tính `adminOnly: true` để tài khoản Staff không nhìn thấy mục này.
2. **Tầng Điều hướng (Route Guard Layer):**
   - Tuyến đường `/admin/staff-accounts` bắt buộc phải được khai báo với `allowedRoles: ['admin']` trong `src/utils/navigationGuard.ts`.
   - Hàm `checkRouteAccess(path, auth)` bắt buộc phải từ chối ngay lập tức nếu người dùng không có vai trò `admin`, tự động chuyển hướng về `/admin` kèm thông báo không đủ quyền.
3. **Tầng API & Middleware (Backend Layer):**
   - Toàn bộ các endpoint liên quan đến danh sách, chi tiết, khóa/mở khóa tài khoản nhân viên bắt buộc phải sử dụng middleware `requireAdminOnly`.
   - **Tuyệt đối không tin cậy các trường dữ liệu do client gửi lên**, bao gồm `actor_id`, `role`, hay `is_active`.
   - Backend giải mã JWT token thực tế từ Header `Authorization: Bearer <token>`, tra cứu lại bảng `public.profiles` để xác nhận danh tính và vai trò `role === 'admin'` của người thao tác trước khi thực thi nghiệp vụ.
4. **Tầng Cơ sở dữ liệu (Database Security Layer):**
   - Row Level Security (RLS) trên các bảng `profiles`, `staff_permission_groups`, `audit_logs` thu hồi toàn bộ quyền ghi (`INSERT`, `UPDATE`, `DELETE`) từ vai trò `authenticated`.
   - Trigger `trg_prevent_profile_escalation` chặn đứng mọi hành vi cập nhật cột `role` hoặc `is_active` nếu không phải là `admin` hoặc `service_role`.

---

## 3. Quy Tắc Khóa Và Mở Khóa Tài Khoản Nhân Viên (`is_active`)

### 3.1. Ranh giới nghiệp vụ của thao tác khóa/mở khóa
- **Bản chất kỹ thuật:** Thao tác khóa/mở khóa là việc thay đổi giá trị cờ boolean `public.profiles.is_active` giữa `TRUE` và `FALSE`.
- **Phân định rạch ròi với các khái niệm khác:**
  - `profiles.is_active = FALSE` **KHÔNG PHẢI** là việc thu hồi vai trò Staff (`profiles.role` vẫn là `'staff'`).
  - `profiles.is_active = FALSE` **KHÔNG PHẢI** là việc tạm ngưng CTV (`affiliate_profiles.status` vẫn giữ nguyên là `ACTIVE`, `PENDING_REVIEW` hay `SUSPENDED`).
  - `profiles.is_active = FALSE` **KHÔNG XÓA** và **KHÔNG VÔ HIỆU HÓA** các nhóm quyền đang được gán trong `staff_permission_groups`. Nhóm quyền vẫn được giữ nguyên bản ghi, nhưng nhân viên không thể sử dụng do bị chặn đăng nhập.
  - `profiles.is_active = FALSE` **KHÔNG XÓA** hồ sơ CTV, mã giới thiệu, danh sách leads đã giới thiệu, lịch sử đối soát hay các khoản thù lao tích lũy của người đó.

### 3.2. Điều kiện kiểm tra an toàn bắt buộc trước khi thực hiện
1. **Kiểm tra quyền người thực hiện:** Phải là Quản trị viên (`role = 'admin'`) và tài khoản Admin đó phải đang hoạt động (`is_active = TRUE`).
2. **Chặn tự khóa chính mình:** Admin không được phép tự khóa tài khoản của chính mình (`target_user_id <> admin_user_id`).
3. **Kiểm tra đối tượng đích:** Tài khoản đích bắt buộc phải có vai trò `profiles.role = 'staff'`. Không dùng API này để khóa tài khoản `admin` hoặc tài khoản `affiliate` thuần túy.
4. **Kiểm tra trạng thái hiện tại (Chống thao tác thừa & Tranh chấp):**
   - Nếu yêu cầu khóa (`is_active = false`) nhưng tài khoản đích đã ở trạng thái `is_active = false`: Trả lỗi HTTP 400 kèm thông báo *"Tài khoản nhân viên này hiện đã ở trạng thái vô hiệu hóa."*
   - Nếu yêu cầu mở khóa (`is_active = true`) nhưng tài khoản đích đã ở trạng thái `is_active = true`: Trả lỗi HTTP 400 kèm thông báo *"Tài khoản nhân viên này hiện đang hoạt động bình thường."*
5. **Bắt buộc nhập lý do:** Tham số `reason` là bắt buộc, phải là chuỗi ký tự có ý nghĩa sau khi cắt khoảng trắng thừa (`trim().length >= 5`). Không chấp nhận chuỗi rỗng hoặc ký tự vô nghĩa.

### 3.3. Hiệu lực tức thì của việc khóa tài khoản
Ngay khi bản ghi `profiles.is_active` được cập nhật thành `FALSE`:
- Mọi request tiếp theo của tài khoản Staff này gửi lên bất kỳ endpoint nội bộ nào (`requireStaffOrAdmin`, `requirePermission`, `requireAdminOnly`) đều bị backend chặn đứng ngay tại tầng middleware với mã lỗi HTTP 403:
  ```json
  {
    "success": false,
    "error": "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Ban Quản trị.",
    "code": "ACCOUNT_DISABLED"
  }
  ```
- Trên giao diện Frontend, hàm `checkRouteAccess` nhận biết `user.is_active === false` và điều hướng người dùng ngay lập tức sang màn hình `AccessNoticeScreen` loại `DISABLED`, không cho phép truy cập bất kỳ tính năng nào.

---

## 4. Quy Tắc Nâng / Thu Hồi Vai Trò Staff Và Xử Lý Nhóm Quyền

### 4.1. Quy tắc nâng vai trò CTV lên Staff (`affiliate` → `staff`)
- **Điểm thực hiện duy nhất:** Chỉ thực hiện tại màn hình Chi tiết CTV (`/admin/affiliates/:id`) qua endpoint `PATCH /api/v1/admin/affiliates/:id/system-role` và RPC `fn_update_user_system_role`.
- **Điều kiện an toàn:**
  - Email tài khoản phải đã được xác thực: `auth.users.email_confirmed_at IS NOT NULL`.
  - Tài khoản phải đang hoạt động: `profiles.is_active = TRUE`.
  - Bắt buộc nhập lý do nâng vai trò.
- **Quyền hạn nhận được:**
  - Nhận ngay **quyền nền Staff** thông qua vai trò hệ thống (`profiles.role = 'staff'`).
  - **Không tự động gán bất kỳ nhóm quyền chuyên biệt nào** trong `staff_permission_groups`.
- **Ghi nhật ký kiểm toán:** Bắt buộc ghi 2 bản ghi `audit_logs` với action `SYSTEM_ROLE_ASSIGNED` (một cho `profiles` và một cho `affiliate_profiles`).
- **Bảo toàn dữ liệu:** Giữ nguyên 100% hồ sơ CTV (`affiliate_profiles`), mã CTV, leads, đối soát và thù lao.

### 4.2. Quy tắc thu hồi vai trò Staff về CTV (`staff` → `affiliate`)
- **Điểm thực hiện duy nhất:** Màn hình Chi tiết CTV (`/admin/affiliates/:id`).
- **Nguyên tắc giao dịch nguyên tử (All-or-Nothing Atomicity):**
  Trong cùng một transaction duy nhất trên cơ sở dữ liệu:
  1. Cập nhật `profiles.role = 'affiliate'` và `updated_at = NOW()`.
  2. **Tự động vô hiệu hóa toàn bộ nhóm quyền đang hoạt động:**
     ```sql
     UPDATE public.staff_permission_groups
     SET is_active = FALSE
     WHERE staff_id = v_target_user.id
       AND is_active = TRUE;
     ```
  3. Ghi nhận 2 bản ghi `audit_logs` với action `SYSTEM_ROLE_REVOKED` (cho `profiles` và `affiliate_profiles`).
  4. Ghi nhận bản ghi `audit_logs` với action `STAFF_GROUPS_DEACTIVATED_ON_REVOKE` trên thực thể `staff_permission_groups`.
- **Quy tắc bảo toàn lịch sử:** Tuyệt đối **không xóa cứng (DELETE)** các bản ghi trong `staff_permission_groups`. Việc giữ lại với `is_active = false` bảo toàn trọn vẹn dấu vết kiểm toán về việc nhân viên đã từng được gán những nhóm quyền nào trong quá khứ.
- **Nếu bất kỳ thao tác nào thất bại:** Toàn bộ giao dịch bị Rollback lập tức, vai trò Staff và các nhóm quyền được giữ nguyên vẹn, không xảy ra tình trạng dữ liệu dở dang.

### 4.3. Quy tắc khi tái bổ nhiệm vai trò Staff trong tương lai
- Nếu một CTV từng bị thu hồi Staff trước đây nay được Admin nâng lại thành Staff:
  - Tài khoản **chỉ tự động nhận quyền nền Staff**.
  - Các bản ghi nhóm quyền cũ trong `staff_permission_groups` **vẫn duy trì trạng thái `is_active = FALSE`**.
  - Hệ thống **tuyệt đối không tự động khôi phục các nhóm quyền cũ**.
  - Nếu Admin muốn cấp lại quyền Thù lao hoặc Thông báo, Admin bắt buộc phải vào màn hình `/admin/permissions` để chủ động gán lại.

---

## 5. Danh Mục Sự Kiện Audit Logs Chuẩn Hóa

Toàn bộ các biến động về tài khoản nhân viên, vai trò hệ thống và nhóm quyền bắt buộc phải ghi nhận vào bảng `public.audit_logs`.

### 5.1. Bảng đặc tả các sự kiện kiểm toán

| Tên sự kiện (`action`) | Thực thể liên quan (`entity_name`) | `entity_id` | Cấu trúc dữ liệu cũ (`old_values`) | Cấu trúc dữ liệu mới (`new_values`) | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`STAFF_ACCOUNT_LOCKED`** | `profiles` | `profiles.id` | `{"is_active": true}` | `{"is_active": false}` | Admin khóa tài khoản nhân viên, chặn truy cập ngay lập tức. |
| **`STAFF_ACCOUNT_UNLOCKED`** | `profiles` | `profiles.id` | `{"is_active": false}` | `{"is_active": true}` | Admin mở khóa tài khoản nhân viên, khôi phục quyền truy cập. |
| **`SYSTEM_ROLE_ASSIGNED`** | `profiles`<br>`affiliate_profiles` | `profiles.id`<br>`affiliate_profiles.id` | `{"role": "affiliate"}` | `{"role": "staff"}` | Admin nâng vai trò CTV lên Cán bộ Tuyển sinh (Staff). |
| **`SYSTEM_ROLE_REVOKED`** | `profiles`<br>`affiliate_profiles` | `profiles.id`<br>`affiliate_profiles.id` | `{"role": "staff"}` | `{"role": "affiliate"}` | Admin thu hồi vai trò Staff, đưa tài khoản trở về vai trò CTV. |
| **`STAFF_GROUPS_DEACTIVATED_ON_REVOKE`** | `staff_permission_groups`| `profiles.id` | `{"deactivated_groups": ["reward_manager"]}` | `{"active_groups_count": 0}` | Tự động vô hiệu hóa các nhóm quyền chuyên biệt khi thu hồi Staff. |
| **`STAFF_PERMISSION_GROUP_ASSIGNED`** | `staff_permission_groups`| `profiles.id` | `{"group_code": "reward_manager", "is_active": false}` | `{"group_code": "reward_manager", "is_active": true}` | Admin gán nhóm quyền chuyên biệt cho nhân viên tại `/admin/permissions`. |
| **`STAFF_PERMISSION_GROUP_REVOKED`** | `staff_permission_groups`| `profiles.id` | `{"group_code": "reward_manager", "is_active": true}` | `{"group_code": "reward_manager", "is_active": false}` | Admin thu hồi nhóm quyền chuyên biệt của nhân viên tại `/admin/permissions`. |

### 5.2. Các trường dữ liệu kiểm toán bắt buộc
Mỗi dòng nhật ký kiểm toán trong `public.audit_logs` bắt buộc phải có đầy đủ:
- `id`: Định danh duy nhất (UUID gen_random_uuid).
- `actor_id`: UUID tài khoản Admin thực hiện thao tác (lấy từ phiên đăng nhập an toàn `(req as any).user.id`).
- `action`: Chuỗi định danh sự kiện theo danh mục chuẩn ở mục 5.1.
- `entity_name`: Tên bảng dữ liệu chịu tác động (`profiles`, `affiliate_profiles`, `staff_permission_groups`).
- `entity_id`: UUID của bản ghi thực thể chịu tác động.
- `old_values` & `new_values`: Dữ liệu dạng JSONB ghi nhận chính xác trạng thái trước và sau khi biến động.
- `reason`: Lý do thao tác do Admin nhập vào (bắt buộc, không được để trống).
- `ip_address`: Địa chỉ IP của client gọi API (`req.ip` hoặc header `X-Forwarded-For`).
- `user_agent`: Thông tin trình duyệt/ứng dụng thực hiện gọi API.
- `created_at`: Mốc thời gian máy chủ tại thời điểm ghi nhận (`TIMESTAMPTZ DEFAULT NOW()`).

### 5.3. Yêu cầu bảo mật và tính toàn vẹn của Nhật ký kiểm toán
1. **Không ghi dữ liệu nhạy cảm vào log:** Tuyệt đối không ghi mật khẩu, mã hash, token phiên, khóa bí mật, số CCCD, hoặc số tài khoản ngân hàng vào cột `reason`, `old_values`, hay `new_values`.
2. **Quyền bất biến (Append-Only):** Bảng `public.audit_logs` là bảng chỉ ghi thêm. RLS policy chặn hoàn toàn mọi lệnh `UPDATE` và `DELETE` đối với mọi người dùng.
3. **Không phát sinh thông báo chuông tự động từ Audit Logs:** Các hành động khóa/mở khóa hay phân quyền nội bộ của Admin **không phát sinh notification bell** tự động ra hòm thư CTV, trừ khi có chính sách thông báo riêng được phê duyệt.

---

## 6. Bảo Vệ Dữ Liệu, API Và Supabase Auth

### 6.1. Nguyên tắc tối thiểu hóa dữ liệu trả về (Data Minimization)
- API `GET /api/v1/admin/staff-accounts` và `GET .../staff-accounts/:id` chỉ trả lời các trường dữ liệu thực sự cần thiết cho giao diện:
  - `id`, `full_name`, `email`, `phone`, `avatar_url`, `role`, `is_active`, `created_at`.
  - Thông tin CTV liên kết: `affiliate_code`, `status`.
  - Thông tin nhóm quyền: danh sách nhóm có `is_active = true`.
  - Mốc thời gian đăng nhập gần nhất: `last_sign_in_at` (từ Auth).
- **Tuyệt đối không trả về:** `encrypted_password`, `raw_app_meta_data`, `refresh_token`, mã số CCCD, ngày cấp CCCD, địa chỉ cư trú, hay số tài khoản ngân hàng của nhân viên qua endpoint này.

### 6.2. An toàn dữ liệu Supabase Auth
- Trường `last_sign_in_at` và `email_confirmed_at` được trích xuất trên Backend thông qua Supabase Auth Admin API (`supabase.auth.admin.listUsers()` hoặc `getUserById()`) sử dụng biến môi trường bảo mật `SUPABASE_SERVICE_ROLE_KEY`.
- **Tuyệt đối không cấp quyền cho client gọi trực tiếp schema `auth`** hoặc để lộ Service Role Key xuống trình duyệt người dùng.

### 6.3. Ranh giới rõ ràng giữa 3 tầng Middleware Backend
- `requireAdminOnly`: Chỉ chấp nhận phiên đăng nhập có `profiles.role === 'admin'` và `is_active === true`.
- `requireStaffOrAdmin`: Chấp nhận phiên có `role IN ('staff', 'admin')` và `is_active === true` để truy cập các nghiệp vụ quyền nền tuyển sinh (Leads, Khóa học, Đối soát, Duyệt CTV).
- `requirePermission(permCode)`: Kiểm tra xem Admin hoặc Staff có quyền chuyên biệt đó hay không (qua RPC `fn_has_permission`).

---

## 7. Tính Nguyên Tử, Chống Gửi Lặp Và Xử Lý Tranh Chấp Đồng Thời

### 7.1. Đảm bảo tính nguyên tử tuyệt đối (Database Transactions)
- Mọi thao tác làm thay đổi trạng thái tài khoản hoặc phân quyền bắt buộc phải thực thi bên trong một transaction cơ sở dữ liệu duy nhất:
  - *Thao tác khóa/mở khóa:* Câu lệnh cập nhật `profiles.is_active` và câu lệnh ghi `audit_logs` phải cùng thành công hoặc cùng thất bại. Nếu ghi log thất bại, trạng thái `is_active` không được lưu.
  - *Thao tác thu hồi vai trò Staff:* Cập nhật `profiles.role = 'affiliate'`, cập nhật `staff_permission_groups.is_active = false`, và ghi 3 bản ghi `audit_logs` bắt buộc phải nằm trong 1 transaction của PostgreSQL RPC `fn_update_user_system_role`.

### 7.2. Xử lý tranh chấp đồng thời (Concurrency Control & Locking)
- Sử dụng cơ chế khóa bi quan (`SELECT ... FOR UPDATE`) trong PostgreSQL RPC khi thực hiện thay đổi trạng thái tài khoản Staff hoặc vai trò hệ thống.
- Nếu hai Admin cùng mở trang quản trị và cùng bấm thao tác trên một tài khoản Staff:
  - Admin thứ nhất gửi request thành công, trạng thái tài khoản đổi sang `is_active = false`.
  - Request của Admin thứ hai khi thực thi sẽ kiểm tra trạng thái hiện tại. Nếu nhận thấy trạng thái đã là `false`, hệ thống lập tức từ chối và trả về mã lỗi HTTP 409 Conflict:
    ```json
    {
      "success": false,
      "error": "Xung đột dữ liệu: Trạng thái của tài khoản nhân viên này đã bị thay đổi bởi một Quản trị viên khác trước đó. Vui lòng tải lại trang.",
      "code": "STATE_CONFLICT"
    }
    ```

### 7.3. Chống gửi lặp do bấm nút liên tục (Debouncing & Button Disabling)
- Trên giao diện Frontend: Khi Admin bấm nút xác nhận khóa/mở khóa hoặc đổi vai trò, nút bấm lập tức chuyển sang trạng thái `disabled` và hiển thị icon xoay tròn (`isProcessing = true`).
- Toàn bộ form và backdrop bị khóa cho đến khi nhận được phản hồi chính thức từ máy chủ.

### 7.4. Phân loại mã lỗi API chuẩn hóa (Standard Error Responses)
Hệ thống không trả về lỗi chung chung hoặc để lộ stack trace kỹ thuật mà phân định rõ ràng các mã lỗi HTTP chuẩn:
- **HTTP 401 `UNAUTHENTICATED`:** Chưa đăng nhập hoặc token hết hạn.
- **HTTP 403 `ADMIN_ONLY`:** Người dùng không phải là Quản trị viên (`admin`).
- **HTTP 403 `ACCOUNT_DISABLED`:** Tài khoản người thực hiện đang bị vô hiệu hóa.
- **HTTP 404 `STAFF_NOT_FOUND`:** Không tìm thấy tài khoản nhân viên với ID cung cấp.
- **HTTP 400 `INVALID_INPUT` / `REASON_REQUIRED`:** Dữ liệu gửi lên không hợp lệ hoặc thiếu lý do.
- **HTTP 409 `STATE_CONFLICT`:** Trạng thái tài khoản đã bị thay đổi bởi phiên làm việc khác.
- **HTTP 500 `INTERNAL_ERROR`:** Lỗi hệ thống máy chủ (thông báo thân thiện, không lộ stack trace).

---

## 8. Bảng Đối Chiếu: Hiện Trạng Source vs Chính Sách Mới vs Khoảng Thiếu

| Hạng mục kiểm soát | Trạng thái trong Source Code hiện tại | Chính sách đã chốt (A7-NV.4) | Phân loại | Hành động kỹ thuật cần thực hiện ở bước sau |
| :--- | :--- | :--- | :---: | :--- |
| **Bảo vệ Route `/admin/staff-accounts`** | Chưa có `allowedRoles: ['admin']` trong `navigationGuard.ts`. | Chỉ Admin được truy cập; Staff và CTV bị chặn. | **Khoảng thiếu (GAP)** | Cập nhật `navigationGuard.ts` để chặn triệt để Staff và CTV. |
| **Ẩn mục Sidebar với Staff** | Menu `admin_staff` chưa có cờ `adminOnly: true`. | Chỉ hiển thị menu cho Quản trị viên (`admin`). | **Khoảng thiếu (GAP)** | Bổ sung `adminOnly: true` vào `ADMIN_NAV_ITEMS` (`navConfig.ts`). |
| **API Khóa / Mở khóa Staff** | Chưa có endpoint hay RPC nào cho thao tác này. | Có API `PATCH .../active-status`, bắt buộc nhập lý do và ghi `audit_logs`. | **Khoảng thiếu (GAP)** | Xây dựng API và RPC cập nhật `is_active` nguyên tử kèm audit log. |
| **Vô hiệu hóa nhóm khi thu hồi Staff** | RPC `fn_update_user_system_role` chỉ đổi role, không sửa `staff_permission_groups`. | Bắt buộc vô hiệu hóa (`is_active = false`) toàn bộ nhóm quyền đang gán trong cùng transaction. | **Khoảng thiếu (GAP)** | Bổ sung câu lệnh UPDATE `staff_permission_groups` vào RPC `fn_update_user_system_role`. |
| **Lọc nhóm quyền đang hoạt động** | `GET /api/v1/admin/staff-permissions` query `.select('*')` không lọc `is_active = true`. | Bắt buộc chỉ lấy các bản ghi có `is_active = true` khi hiển thị quyền hiệu lực. | **Khoảng thiếu (GAP)** | Endpoint mới `GET /api/v1/admin/staff-accounts` bổ sung `.eq('is_active', true)`. |
| **Ghi Audit Log cho Nâng/Hạ Staff** | Đã có trong RPC `fn_update_user_system_role` (2 bản ghi cho `profiles` và `affiliate_profiles`). | Duy trì và bổ sung thêm log vô hiệu hóa nhóm quyền `STAFF_GROUPS_DEACTIVATED_ON_REVOKE`. | **Đã có một phần** | Mở rộng RPC để ghi thêm sự kiện vô hiệu hóa nhóm quyền. |
| **Ghi Audit Log cho Gán/Thu hồi nhóm A5**| API `POST .../staff-permissions/assign` và `revoke` chưa ghi `audit_logs`. | Bắt buộc ghi nhận `STAFF_PERMISSION_GROUP_ASSIGNED` và `STAFF_PERMISSION_GROUP_REVOKED`. | **Khoảng thiếu (GAP)** | Bổ sung câu lệnh INSERT vào `audit_logs` trong endpoint phân quyền. |
| **Bảo vệ RLS trên bảng `audit_logs`** | Policy `"Admin only select audit_logs"` chặn hoàn toàn CTV và Staff đọc log. | Duy trì chính sách chỉ Admin được đọc log, thu hồi toàn bộ quyền ghi từ client. | **Đã có chuẩn xác** | Giữ nguyên chính sách RLS hiện hành của Migration 002. |
| **Bảo vệ an toàn Supabase Auth** | Backend sử dụng Service Role để đọc `auth.users`, không để lộ key xuống client. | Duy trì cơ chế trích xuất `last_sign_in_at` trên backend, không cho client query trực tiếp schema auth. | **Đã có chuẩn xác** | Giữ nguyên kiến trúc Service Role của backend. |

---

## 9. Các Điểm Cần Xử Lý Trong Giai Đoạn Triển Khai Sau

Giai đoạn triển khai code (bước kế tiếp) sẽ tập trung xử lý dứt điểm các hạng mục kỹ thuật sau:

1. **Nâng cấp RPC `fn_update_user_system_role` (Migration SQL):**
   - Bổ sung logic tự động chuyển `staff_permission_groups.is_active = false` khi thu hồi Staff.
   - Bổ sung lệnh ghi log `STAFF_GROUPS_DEACTIVATED_ON_REVOKE` vào bảng `audit_logs`.
2. **Xây dựng RPC hoặc Endpoint Khóa / Mở khóa Staff:**
   - Xây dựng RPC PostgreSQL `fn_toggle_staff_active_status(p_staff_id, p_admin_id, p_is_active, p_reason, p_client_ip, p_user_agent)` để đảm bảo tính nguyên tử tuyệt đối giữa việc sửa `profiles.is_active` và ghi `audit_logs`.
   - Mount endpoint `PATCH /api/v1/admin/staff-accounts/:id/active-status` với middleware `requireAdminOnly`.
3. **Xây dựng API `GET /api/v1/admin/staff-accounts`:**
   - Kết nối dữ liệu từ `profiles`, `affiliate_profiles`, `staff_permission_groups` (`is_active = true`), và `auth.users(last_sign_in_at)`.
   - Bảo vệ bằng `requireAdminOnly`.
4. **Cập nhật Frontend Route Guard & Menu:**
   - Thêm `adminOnly: true` cho menu `admin_staff` trong `src/config/navConfig.ts`.
   - Cập nhật rule `allowedRoles: ['admin']` cho `/admin/staff-accounts` trong `src/utils/navigationGuard.ts`.

---

## 10. Các Ca Kiểm Thử Nghiệm Thu Bảo Mật Và Nhật Ký (Security Test Cases)

### TC-SEC-01: Kiểm tra chặn Staff truy cập API và Route Tài khoản nhân viên
- **Mục đích:** Xác minh Cán bộ Tuyển sinh không thể xem danh sách nhân viên.
- **Tiền điều kiện:** Tài khoản Staff đang hoạt động (`tuyensinh_canbo@sthc.edu.vn`).
- **Thao tác:**
  1. Đăng nhập bằng tài khoản Staff, kiểm tra thanh Sidebar.
  2. Gõ trực tiếp URL `/admin/staff-accounts` trên thanh địa chỉ trình duyệt.
  3. Gửi request HTTP `GET /api/v1/admin/staff-accounts` kèm Bearer Token của Staff.
- **Kỳ vọng:**
  - Không có mục “Tài khoản nhân viên” trên Sidebar.
  - Route Guard chuyển hướng người dùng về `/admin` kèm thông báo bị từ chối.
  - API trả về HTTP 403 `ADMIN_ONLY`.

### TC-SEC-02: Kiểm tra thao tác Khóa tài khoản Staff và ghi Audit Log
- **Mục đích:** Xác minh Admin khóa tài khoản nhân viên thành công và log được ghi nhận chuẩn xác.
- **Tiền điều kiện:** Tài khoản Admin đang đăng nhập; tài khoản Staff đang `is_active = true`.
- **Thao tác:**
  1. Admin gửi request `PATCH /api/v1/admin/staff-accounts/:id/active-status` với `{ "is_active": false, "reason": "Tạm nghỉ công tác chờ chuyển giao" }`.
  2. Kiểm tra dữ liệu trong bảng `profiles` và `audit_logs`.
- **Kỳ vọng:**
  - `profiles.is_active` chuyển thành `false`.
  - Có 1 bản ghi trong `audit_logs` với `action = 'STAFF_ACCOUNT_LOCKED'`, `old_values = {"is_active": true}`, `new_values = {"is_active": false}`, `reason = 'Tạm nghỉ công tác chờ chuyển giao'`, `actor_id` khớp ID của Admin.

### TC-SEC-03: Kiểm tra hiệu lực tức thì khi Staff bị khóa
- **Mục đích:** Xác minh tài khoản Staff bị khóa không thể thực hiện bất kỳ thao tác nào.
- **Tiền điều kiện:** Tài khoản Staff vừa bị khóa ở TC-SEC-02.
- **Thao tác:**
  1. Tài khoản Staff này gửi request `GET /api/v1/admin/leads` hoặc `GET /api/v1/admin/courses`.
  2. Tài khoản Staff tải lại trang trình duyệt.
- **Kỳ vọng:**
  - Mọi request API trả về HTTP 403 `ACCOUNT_DISABLED`.
  - Trình duyệt tự động chuyển sang màn hình thông báo tài khoản bị vô hiệu hóa `AccessNoticeScreen`.

### TC-SEC-04: Kiểm tra chống tự khóa tài khoản Admin
- **Mục đích:** Ngăn chặn Admin vô tình tự khóa tài khoản của chính mình gây mất quyền quản trị.
- **Tiền điều kiện:** Tài khoản Admin đang đăng nhập (`admin@sthc.edu.vn`).
- **Thao tác:** Admin gửi request khóa tài khoản với `target_id = admin_id`.
- **Kỳ vọng:** Hệ thống từ chối với HTTP 403/400 kèm thông báo: *"Quản trị viên không thể tự thay đổi trạng thái kích hoạt của chính mình."*

### TC-SEC-05: Kiểm tra tính nguyên tử khi thu hồi Staff và vô hiệu hóa nhóm quyền
- **Mục đích:** Xác minh khi thu hồi vai trò Staff, nhóm quyền chuyên biệt bị vô hiệu hóa an toàn trong cùng giao dịch.
- **Tiền điều kiện:** Staff đang có nhóm `reward_manager` (`phuongsht@gmail.com`).
- **Thao tác:**
  1. Admin vào `/admin/affiliates/:id`, bấm "Thu hồi quyền Cán bộ Tuyển sinh", nhập lý do.
  2. Kiểm tra `profiles.role` và bảng `staff_permission_groups`.
  3. Kiểm tra các bản ghi trong `audit_logs`.
- **Kỳ vọng:**
  - `profiles.role` trở thành `'affiliate'`.
  - Bản ghi nhóm `reward_manager` trong `staff_permission_groups` có `is_active = false`.
  - Có đầy đủ 3 bản ghi audit: `SYSTEM_ROLE_REVOKED` (trên `profiles`), `SYSTEM_ROLE_REVOKED` (trên `affiliate_profiles`), và `STAFF_GROUPS_DEACTIVATED_ON_REVOKE` (trên `staff_permission_groups`).

### TC-SEC-06: Kiểm tra xử lý tranh chấp đồng thời (Concurrency Conflict)
- **Mục đích:** Xác minh chống ghi đè khi hai Admin cùng thao tác trên một tài khoản Staff.
- **Thao tác:** Hai phiên Admin cùng gửi request khóa cùng một tài khoản Staff với độ trễ vài mili-giây.
- **Kỳ vọng:** Phiên thứ nhất xử lý thành công; phiên thứ hai nhận phản hồi HTTP 409 `STATE_CONFLICT` hoặc HTTP 400 thông báo tài khoản đã ở trạng thái đích, không phát sinh log trùng lặp.

---

## 11. Kết Luận

Tài liệu **A7-NV.4** đã hoàn tất việc thiết lập toàn bộ quy tắc bảo mật, kiểm soát phân quyền đa tầng và chuẩn hóa danh mục nhật ký kiểm toán cho phân hệ Quản lý Tài khoản nhân viên:
1. **Kiểm soát chặt chẽ:** Khóa cứng quyền truy cập route, menu và API chỉ dành riêng cho Quản trị viên (`role = 'admin'`), không để lộ thông tin Supabase Auth nhạy cảm.
2. **Quy tắc khóa/mở khóa minh bạch:** Bắt buộc nhập lý do, phân định rõ giữa khóa tài khoản (`profiles.is_active`) và trạng thái hồ sơ CTV, chặn tự khóa tài khoản Admin.
3. **An toàn vòng đời phân quyền:** Đảm bảo nguyên tử hóa việc thu hồi vai trò Staff và tự động vô hiệu hóa nhóm quyền chuyên biệt, lưu giữ trọn vẹn lịch sử kiểm toán trong `public.audit_logs`.

Tài liệu này hoàn thiện chuỗi 5 văn kiện nền tảng (**A7-NV.0** → **A7-NV.1** → **A7-NV.2** → **A7-NV.3** → **A7-NV.4**). Toàn bộ bài toán kỹ thuật, bảo mật và nghiệp vụ cho phân hệ Quản lý Tài khoản nhân viên tại `/admin/staff-accounts` đã được đặc tả hoàn chỉnh và sẵn sàng để chuyển sang giai đoạn lập trình chức năng.
