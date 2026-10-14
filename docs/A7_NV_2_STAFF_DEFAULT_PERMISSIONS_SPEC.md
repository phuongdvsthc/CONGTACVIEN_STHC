# ĐẶC TẢ CHÍNH SÁCH PHÂN QUYỀN MẶC ĐỊNH VÀ VÒNG ĐỜI QUYỀN NHÂN VIÊN STAFF (A7-NV.2)

- **Mã tài liệu:** `A7-NV.2`
- **Tên tài liệu:** Đặc tả chính sách cấp quyền nền cho Staff, cấp quyền chuyên biệt qua nhóm quyền, và xử lý vô hiệu hóa nhóm quyền khi thu hồi vai trò Staff
- **Phân hệ đối ứng:** Quản trị Phân quyền & Tài khoản nhân viên (`/admin/staff-accounts`, `/admin/permissions`)
- **Tài liệu căn cứ:** `docs/A7_NV_0_STAFF_ACCOUNTS_AUDIT_REPORT.md`, `docs/A7_NV_1_STAFF_ACCOUNTS_SCOPE_SPEC.md`
- **Thời điểm lập:** 14/10/2026
- **Trạng thái:** **CHỐT CHÍNH SÁCH VÀ ĐẶC TẢ KỸ THUẬT (SPECIFICATION ONLY)**. Chưa sửa đổi mã nguồn hoặc database.

---

## 1. Mục Tiêu Và Phạm Vi

### 1.1. Mục tiêu
1. Chuẩn hóa và chốt chính sách kỹ thuật về **cách Cán bộ Tuyển sinh (`Staff`) nhận quyền nền mặc định** khi được nâng vai trò từ tài khoản Cộng tác viên (`CTV`).
2. Xác định cơ chế phân định giữa **quyền nền tảng theo vai trò** (`profiles.role = 'staff'`) và **quyền chuyên biệt theo nhóm quyền** (`staff_permission_groups`).
3. Quy định chính sách an toàn thông tin khi **thu hồi vai trò Staff**: tự động vô hiệu hóa toàn bộ liên kết nhóm quyền đang hoạt động của nhân viên để ngăn chặn hiện tượng tái kích hoạt quyền chuyên biệt ngoài ý muốn khi nâng quyền trở lại.
4. Bảo đảm bảo toàn toàn vẹn lịch sử kiểm toán, hồ sơ CTV gốc, dữ liệu khách hàng (leads), đối soát và thù lao khi chuyển đổi qua lại giữa các vai trò.

### 1.2. Phạm vi áp dụng
- Áp dụng trên toàn bộ các phân hệ quản trị thuộc cổng `/admin`:
  - **A1:** Quản lý Cộng tác viên (`/admin/affiliates`)
  - **A2:** Quản lý Khóa học tuyển sinh (`/admin/courses`)
  - **A3:** Quản lý Khách hàng được giới thiệu & Nhật ký chăm sóc (`/admin/leads`)
  - **A4:** Đối chiếu hồ sơ nhập học & học phí (`/admin/reconcile`)
  - **A5:** Quản lý & Phê duyệt Thù lao CTV 500k (`/admin/rewards`)
  - **A7:** Quản trị hệ thống, Mẫu Email, Hàng đợi Email & Tài khoản nhân viên (`/admin/system-settings`, `/admin/staff-accounts`)
  - **A9:** Báo cáo & Dashboard Tổng quan Tuyển sinh (`/admin`)
  - **C3:** Quản trị Bản tin & Thông báo Ban quản trị (`/admin/notifications`)

---

## 2. Phân Biệt Quyền Nền Staff, Quyền Chuyên Biệt Và Quyền Admin

Hệ thống phân quyền STHC_CTV được cấu trúc theo 3 tầng độc lập, có ranh giới bảo mật và cơ chế kiểm soát tách biệt:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: QUYỀN NỀN THEO VAI TRÒ STAFF (BASELINE STAFF PERMISSIONS)                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Nguồn gốc: profiles.role = 'staff' (đồng thời profiles.is_active = TRUE)                              │
│ • Cơ chế kiểm tra: Middleware requireStaffOrAdmin trên Backend và Route Guard trên Frontend             │
│ • Bản ghi phụ thuộc: KHÔNG CẦN bất kỳ dòng nào trong bảng staff_permission_groups                      │
│ • Thời điểm nhận: Có hiệu lực NGAY LẬP TỨC khi Admin bấm "Cấp quyền Cán bộ Tuyển sinh"                 │
│ • Thẩm quyền thực tế:                                                                                   │
│   - Đăng nhập Cổng Quản trị tại /admin.                                                                 │
│   - Tiếp nhận, theo dõi và ghi nhật ký chăm sóc khách hàng tuyển sinh của toàn trường (/admin/leads).  │
│   - Quản lý danh mục ngành nghề, khóa học tuyển sinh của STHC (/admin/courses).                         │
│   - Xem danh sách và thực hiện xét duyệt hồ sơ CTV (/admin/affiliates).                                 │
│   - Thực hiện thao tác đối soát hồ sơ nhập học & xác nhận học phí thực thu (/admin/reconcile).          │
│   - Xem các chỉ số và biểu đồ tổng quan tuyển sinh trên Dashboard (/admin).                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                     ▲
                                                     │ Độc lập & Tách bạch
                                                     ▼

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 2: QUYỀN CHUYÊN BIỆT THEO NHÓM (GRANULAR RBAC PERMISSIONS)                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Nguồn gốc: Cặp liên kết (staff_id, group_code) trong bảng public.staff_permission_groups              │
│ • Điều kiện hiệu lực: profiles.role = 'staff' VÀ staff_permission_groups.is_active = TRUE               │
│ • Cơ chế kiểm tra: Middleware requirePermission('...') và hàm RPC fn_has_permission                     │
│ • Thời điểm nhận: CHỈ CÓ sau khi Admin vào /admin/permissions để gán nhóm thủ công                      │
│ • Các nhóm quyền hiện có:                                                                               │
│   1. Nhóm reward_manager (Phụ trách thù lao CTV): 7 quyền A5 (Xem, chi tiết, duyệt, từ chối, hủy,       │
│      tổng hợp, xuất báo cáo thù lao 500k).                                                              │
│   2. Nhóm reward_viewer (Xem thù lao CTV): 2 quyền A5 (Xem danh sách, xem chi tiết thù lao).          │
│   3. Nhóm notification_manager (Phụ trách thông báo & Bản tin): 4 quyền C3 (Xem, soạn thảo, xuất bản,  │
│      thu hồi bản tin Ban quản trị).                                                                     │
│ • Nguyên tắc an toàn: Staff KHÔNG CÓ nhóm quyền thì KHÔNG THỂ truy cập phân hệ Thù lao hoặc Thông báo, │
│   nhưng VẪN SỬ DỤNG ĐẦY ĐỦ các quyền nền ở Tầng 1.                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                                     ▲
                                                     │ Độc lập & Tách bạch
                                                     ▼

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG 3: QUYỀN QUẢN TRỊ VIÊN CẤP CAO (ADMINISTRATOR PRIVILEGES)                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Nguồn gốc: profiles.role = 'admin' (đồng thời profiles.is_active = TRUE)                              │
│ • Cơ chế kiểm tra: Middleware requireAdminOnly, cờ adminOnly trên menu, và logic fn_get_user_permissions│
│ • Thẩm quyền:                                                                                           │
│   - Tự động sở hữu toàn bộ quyền nền Staff (Tầng 1).                                                    │
│   - Tự động sở hữu toàn bộ 17 quyền trong bảng permissions (Tầng 2) mà không cần gán nhóm quyền.       │
│   - Độc quyền thực hiện các phân hệ tối cao: Quản trị hệ thống A7 (/admin/system-settings),             │
│     Mẫu Email (/admin/email-templates), Giám sát Email (/admin/email-jobs), Phân quyền A5               │
│     (/admin/permissions), Tài khoản nhân viên (/admin/staff-accounts), Nâng/Hạ Staff, và Xem Audit Logs │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Ma Trận Quyền Chi Tiết Theo Vai Trò / Module / Thao Tác

### 3.1. Ma trận phân quyền tổng quát theo vai trò và nhóm quyền

| Vai trò / Nhóm quyền | Cách thức nhận quyền | Phạm vi quyền hạn thực tế | Trạng thái khi thu hồi vai trò Staff |
| :--- | :--- | :--- | :--- |
| **`admin`** | Mặc định từ `profiles.role = 'admin'` | Toàn quyền toàn hệ thống (Cấu hình, Phân quyền, Thù lao, Thông báo, Duyệt Staff, Nhật ký) | Không thuộc phạm vi thu hồi Staff |
| **`staff` (Quyền nền)** | Tự động có từ `profiles.role = 'staff'` | Khóa học, Leads, Đối soát hồ sơ, Duyệt CTV, Dashboard tuyển sinh | **Mất hiệu lực tức thì** ngay khi `profiles.role` chuyển khỏi `staff` |
| **`reward_viewer`** | Admin gán thủ công tại `/admin/permissions` | `rewards.view`, `rewards.view_detail` (Xem danh sách và chi tiết thù lao 500k) | **Vô hiệu hóa bản ghi gán** (`is_active = false`) trong `staff_permission_groups` |
| **`reward_manager`** | Admin gán thủ công tại `/admin/permissions` | Cả 7 quyền `rewards.*` (Xem, duyệt, từ chối, hủy, tổng hợp, xuất báo cáo thù lao 500k) | **Vô hiệu hóa bản ghi gán** (`is_active = false`) trong `staff_permission_groups` |
| **`notification_manager`** | Admin gán thủ công tại `/admin/permissions` | Cả 4 quyền `notifications.*` (Xem, soạn thảo nháp, xuất bản, thu hồi thông báo BQT) | **Vô hiệu hóa bản ghi gán** (`is_active = false`) trong `staff_permission_groups` |
| **`affiliate`** | Vai trò CTV (`profiles.role = 'affiliate'`) | Chỉ truy cập Cổng CTV `/portal` theo trạng thái hồ sơ CTV (`status`) | Không nhận bất kỳ quyền nào của Staff |

### 3.2. Bảng đối chiếu quyền chi tiết theo từng module và thao tác

| Module | Thao tác nghiệp vụ cụ thể | Endpoint / File xử lý | Middleware bảo vệ | Staff có quyền nền? | Yêu cầu nhóm quyền chuyên biệt? | Giới hạn & Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **A1 — Quản lý CTV** | Xem danh sách CTV | `GET /api/v1/admin/affiliates` | `requireStaffOrAdmin` | **Có** | Không | Xem toàn bộ hồ sơ CTV trường |
| | Xem chi tiết hồ sơ CTV | `GET /api/v1/admin/affiliates/:id` | `requireStaffOrAdmin` | **Có** | Không | Không xem được hồ sơ của Admin |
| | Duyệt hồ sơ CTV (`ACTIVE`) | `POST .../:id/approve` | `requireStaffOrAdmin` | **Có** | Không | Staff có thể duyệt CTV |
| | Từ chối hồ sơ CTV (`REJECTED`) | `POST .../:id/reject` | `requireStaffOrAdmin` | **Có** | Không | Bắt buộc nhập lý do |
| | Tạm ngưng CTV (`SUSPENDED`) | `POST .../:id/suspend` | `requireStaffOrAdmin` | **Có** | Không | Bắt buộc nhập lý do |
| | Kích hoạt lại CTV | `POST .../:id/reactivate` | `requireStaffOrAdmin` | **Có** | Không | Phục hồi quyền tiếp thị |
| | **Nâng CTV lên Staff / Thu hồi Staff** | `PATCH .../:id/system-role` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |
| **A2 — Khóa học** | Xem danh mục khóa học | `GET /api/v1/admin/courses` | `requireStaffOrAdmin` | **Có** | Không | Xem toàn bộ khóa học |
| | Xem chi tiết khóa học | `GET /api/v1/admin/courses/:id` | `requireStaffOrAdmin` | **Có** | Không | |
| | Tạo mới / Sửa khóa học | `POST / PATCH .../courses` | `requireStaffOrAdmin` | **Có** | Không | Sửa học phí dự kiến, mô tả |
| | Bật / Tắt trạng thái tuyển sinh | `POST .../:id/status` | `requireStaffOrAdmin` | **Có** | Không | Chuyển ACTIVE / STOPPED |
| **A3 — Leads & Chăm sóc** | Xem danh sách Leads | `GET /api/v1/admin/leads` | `requireStaffOrAdmin` | **Có** | Không | Xem leads của tất cả CTV |
| | Cập nhật tiến độ tư vấn | `PATCH .../:id/counseling-status` | `requireStaffOrAdmin` | **Có** | Không | CONTACTED, CONSULTING, ... |
| | Thêm nhật ký chăm sóc (Care Notes)| `POST .../:id/care-history` | `requireStaffOrAdmin` | **Có** | Không | Ghi nhận ghi chú tư vấn |
| | Ghép / Hủy liên kết mã eGov | `POST .../:id/egov/link` | `requireStaffOrAdmin` | **Có** | Không | Tra cứu mã liên kết hồ sơ |
| **A4 — Đối soát tuyển sinh** | Xem danh sách đối soát | `GET /api/v1/admin/reconcile` | `requireStaffOrAdmin` | **Có** | Không | Xem các lead đủ điều kiện |
| | Thực hiện đối soát nhập học | `POST .../:id/reconcile` | `requireStaffOrAdmin` | **Có** | Không | Nhập mã hồ sơ, học phí thực |
| | Hủy ghép đối soát | `POST .../:id/void-reconciliation` | `requireStaffOrAdmin` | **Có** | Không | Bắt buộc nhập lý do hủy ghép |
| **A5 — Thù lao CTV** | Xem danh sách thù lao 500k | `GET /api/v1/admin/rewards` | `requirePermission('rewards.view')` | **KHÔNG** | Cần `reward_viewer` hoặc `reward_manager` | Trả 403 nếu chưa gán nhóm |
| | Xem chi tiết khoản thù lao | `GET /api/v1/admin/rewards/:id` | `requirePermission('rewards.view_detail')` | **KHÔNG** | Cần `reward_viewer` hoặc `reward_manager` | Trả 403 nếu chưa gán nhóm |
| | Phê duyệt thù lao 500k | `POST .../:id/approve` | `requirePermission('rewards.approve')` | **KHÔNG** | Cần `reward_manager` | Trả 403 nếu chỉ có `reward_viewer` |
| | Từ chối thù lao kèm lý do | `POST .../:id/reject` | `requirePermission('rewards.reject')` | **KHÔNG** | Cần `reward_manager` | Trả 403 nếu chỉ có `reward_viewer` |
| | Hủy trực tiếp khoản thù lao | `POST .../:id/void` | `requirePermission('rewards.void')` | **KHÔNG** | Cần `reward_manager` | Trả 403 nếu chỉ có `reward_viewer` |
| | Xem số liệu tổng hợp thù lao | `GET /api/v1/admin/rewards/summary`| `requirePermission('rewards.summary')` | **KHÔNG** | Cần `reward_manager` | Trả 403 nếu chỉ có `reward_viewer` |
| | Xuất báo cáo kế toán (CSV) | `GET /api/v1/admin/rewards/export` | `requirePermission('rewards.export')` | **KHÔNG** | Cần `reward_manager` | Trả 403 nếu chỉ có `reward_viewer` |
| **A9 — Dashboard Quản trị** | Xem số liệu tổng quan tuyển sinh | `GET /api/v1/admin/dashboard/summary` | `requireStaffOrAdmin` | **Có** | Không | Backlog nhập học, leads mới |
| | Xem biểu đồ tuyển sinh | `GET /api/v1/admin/dashboard/charts` | `requireStaffOrAdmin` | **Có** | Không | Xu hướng tháng, cơ cấu khóa học |
| | Xem danh sách leads gần đây | `GET .../dashboard/recent-leads` | `requireStaffOrAdmin` | **Có** | Không | Leads mới gửi form |
| | Xem bảng xếp hạng CTV | `GET .../dashboard/leaderboard` | `requireStaffOrAdmin` | **Có** | Không | Top CTV có hồ sơ nhập học |
| **C3 — Thông báo BQT** | Xem danh sách thông báo BQT | `GET /api/v1/admin/notifications` | `requirePermission('notifications.view')` | **KHÔNG** | Cần `notification_manager` | Trả 403 nếu chưa gán nhóm |
| | Soạn thảo thông báo nháp | `POST /api/v1/admin/notifications` | `requirePermission('notifications.create')` | **KHÔNG** | Cần `notification_manager` | Trả 403 nếu chưa gán nhóm |
| | Xuất bản thông báo ra mạng lưới | `POST .../:id/publish` | `requirePermission('notifications.publish')` | **KHÔNG** | Cần `notification_manager` | Trả 403 nếu chưa gán nhóm |
| | Thu hồi thông báo đã phát hành | `POST .../:id/revoke` | `requirePermission('notifications.revoke')` | **KHÔNG** | Cần `notification_manager` | Trả 403 nếu chưa gán nhóm |
| **A7 — Quản trị hệ thống** | Cấu hình thương hiệu & Vận hành | `/api/v1/admin/system-settings/...` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |
| | Quản lý Mẫu Email & Hàng đợi | `/api/v1/admin/email-...` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |
| | Quản trị phân quyền A5 | `/api/v1/admin/permissions/...` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |
| | Quản lý Tài khoản nhân viên | `/api/v1/admin/staff-accounts/...` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |
| | Xem nhật ký kiểm toán hệ thống | `GET /api/v1/admin/audit-logs` | `requireAdminOnly` | **KHÔNG** | — | **Chỉ dành riêng cho Admin** |

---

## 4. Luồng Nâng CTV Lên Staff Và Quyền Nhận Được

### 4.1. Điều kiện tiên quyết để được nâng lên Staff
Tài khoản CTV được Admin chọn để nâng lên Staff bắt buộc phải thỏa mãn 4 tiêu chí kiểm tra nghiêm ngặt:
1. Đã đăng ký tài khoản tại Cổng CTV và có bản ghi tương ứng trong `public.profiles`.
2. Trạng thái tài khoản người dùng đang hoạt động: `profiles.is_active = TRUE`.
3. Email tài khoản đã được xác thực hoàn tất: `auth.users.email_confirmed_at IS NOT NULL`.
4. Không phải là tài khoản Quản trị viên (`role <> 'admin'`) và không tự nâng quyền cho chính mình (`target_user_id <> admin_id`).

### 4.2. Quy trình nâng quyền tại `/admin/affiliates/:id`
```
[Admin duyệt hồ sơ CTV]
        │
        ▼
Bấm nút "Cấp quyền cán bộ tuyển sinh" (handleOpenRoleModal('staff'))
        │
        ▼
Nhập lý do bắt buộc (reason)
        │
        ▼
Gửi PATCH /api/v1/admin/affiliates/:id/system-role
        │
        ▼
Middleware requireAdminOnly xác thực phiên Admin
        │
        ▼
Thực thi RPC fn_update_user_system_role(p_affiliate_id, p_admin_id, 'staff', p_reason)
        ├── 1. Khóa bản ghi (FOR UPDATE) trên profiles
        ├── 2. Cập nhật profiles.role = 'staff', updated_at = NOW()
        ├── 3. Ghi audit_logs: SYSTEM_ROLE_ASSIGNED trên profiles
        ├── 4. Ghi audit_logs: SYSTEM_ROLE_ASSIGNED trên affiliate_profiles
        │
        ▼
[KẾT QUẢ QUYỀN NHẬN ĐƯỢC NGAY LẬP TỨC]:
   - TỰ ĐỘNG CÓ: Toàn bộ Quyền nền Staff (A1, A2, A3, A4, A9).
   - KHÔNG CÓ: Các quyền chuyên biệt Thù lao A5 (rewards.*) và Thông báo C3 (notifications.*).
   - BẢNG staff_permission_groups: Không sinh thêm dòng nào (0 nhóm quyền chuyên biệt).
```

### 4.3. Bảo toàn tuyệt đối dữ liệu CTV gốc
- `public.affiliate_profiles`:
  - Mã định danh CTV (`affiliate_code`), trạng thái duyệt CTV (`status` — dù đang là `ACTIVE`, `PENDING_REVIEW` hay `SUSPENDED`), ngày đăng ký, ngày duyệt, thông tin CCCD, số tài khoản ngân hàng được **giữ nguyên 100%**.
- `public.leads`: Toàn bộ các khách hàng do CTV này giới thiệu trước đây vẫn gắn chặt với `affiliate_id` của họ, không bị mất dấu vết.
- `public.lead_reconciliations` & `public.rewards`: Dữ liệu đối soát và các khoản thù lao 500k tích lũy vẫn giữ nguyên vẹn.

---

## 5. Luồng Gán Nhóm Quyền Chuyên Biệt

Để Staff có quyền thực hiện các nghiệp vụ nhạy cảm về tài chính (phê duyệt thù lao A5) hoặc truyền thông (phát hành thông báo BQT C3), Quản trị viên phải thực hiện gán nhóm quyền chuyên biệt thông qua màn hình **Quản lý phân quyền**:

```
[Màn hình Tài khoản nhân viên (/admin/staff-accounts)]
        │
        ▼
Admin bấm nút "Phân quyền" trên dòng của nhân viên
        │
        ▼
Điều hướng sang /admin/permissions (Tab 2: Gán quyền Staff)
        │
        ▼
Admin chọn nhóm quyền cần cấp:
   • Nhóm reward_viewer (Xem thù lao CTV)
   • Nhóm reward_manager (Phụ trách thù lao CTV)
   • Nhóm notification_manager (Phụ trách thông báo & Bản tin BQT)
        │
        ▼
Gửi POST /api/v1/admin/staff-permissions/assign { staff_id, group_code }
        │
        ▼
Middleware requireAdminOnly kiểm tra quyền Admin
        │
        ▼
UPSERT vào public.staff_permission_groups:
   - staff_id = staff_id
   - group_code = group_code
   - is_active = TRUE
   - assigned_by = admin_id
   - assigned_at = NOW()
        │
        ▼
RPC fn_get_user_permissions(staff_id) lập tức trả về các quyền thuộc nhóm mới gán.
Nhân viên bắt đầu truy cập được phân hệ tương ứng.
```

---

## 6. Luồng Thu Hồi Staff, Vô Hiệu Hóa Nhóm Quyền Và Nâng Lại Sau Này

### 6.1. Phát hiện về khoảng thiếu an toàn tại A7-NV.0
- Trong mã nguồn hiện tại (`supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql`):
  - Khi Admin thu hồi vai trò Staff (`target_role = 'affiliate'`), hàm `fn_update_user_system_role` chỉ cập nhật `profiles.role = 'affiliate'`.
  - Các dòng liên kết nhóm quyền trong `staff_permission_groups` **vẫn giữ nguyên trạng thái `is_active = TRUE`**.
  - **Hệ quả rủi ro:** Mặc dù khi người dùng ở vai trò `affiliate`, hàm `fn_get_user_permissions` trả về rỗng. Tuy nhiên, nếu sau này người dùng này **được Admin nâng lại thành Staff**, do các dòng trong `staff_permission_groups` vẫn đang là `is_active = TRUE`, tài khoản sẽ **tự động được kích hoạt lại toàn bộ các nhóm quyền chuyên biệt cũ** mà Admin không hề hay biết.

### 6.2. Chính sách bảo mật mới được chốt (Safety Revocation Policy)
Để loại bỏ triệt để rủi ro trên, đặc tả chốt quy tắc xử lý vòng đời nhóm quyền như sau:

1. **Khi thu hồi vai trò Staff (`staff` → `affiliate`):**
   - Cập nhật `profiles.role = 'affiliate'`.
   - **Tự động vô hiệu hóa toàn bộ nhóm quyền:** Chuyển `is_active = FALSE` cho tất cả các bản ghi của nhân viên này trong bảng `public.staff_permission_groups`.
   - **Bảo toàn lịch sử:** Tuyệt đối **không xóa cứng (DELETE)** các dòng trong `staff_permission_groups`. Giữ nguyên để tra cứu lịch sử ai đã từng gán nhóm nào, vào thời điểm nào.
   - Ghi nhận nhật ký kiểm toán `SYSTEM_ROLE_REVOKED`.
2. **Khi nâng vai trò trở lại thành Staff (`affiliate` → `staff`):**
   - Cập nhật `profiles.role = 'staff'`.
   - **Chỉ cấp quyền nền:** Tài khoản **chỉ tự động nhận quyền nền Staff** (Tầng 1).
   - **Không tự động khôi phục nhóm quyền cũ:** Các dòng trong `staff_permission_groups` vẫn duy trì `is_active = FALSE`.
   - Nếu Admin muốn cấp lại quyền chuyên biệt (Thù lao hoặc Thông báo), Admin bắt buộc phải vào màn hình `/admin/permissions` để chủ động gán lại nhóm quyền.
3. **Phạm vi áp dụng:**
   - Đây là quy tắc kỹ thuật nâng cao so với hiện trạng source code. Việc sửa đổi hàm RPC `fn_update_user_system_role` sẽ được thực hiện ở bước triển khai tiếp theo (A7-NV.3 / Backend migration), **không sửa code ở bước A7-NV.2**.

---

## 7. Tác Động Đến Nhân Viên Staff Hiện Tại

Dựa trên dữ liệu thực tế đã kiểm kê từ cơ sở dữ liệu ở bước A7-NV.0, chính sách phân quyền này tác động cụ thể tới 2 tài khoản nhân viên đang tồn tại như sau:

### 7.1. Trường hợp 1: Nhân viên chưa gán nhóm quyền
- **Tài khoản:** `tuyensinh_canbo@sthc.edu.vn` (Võ Minh Quân — Cán bộ Tuyển sinh)
  - `id`: `28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`
  - `role`: `'staff'`, `is_active`: `true`
  - Hồ sơ CTV liên kết: `STHCCTV3129` (`status = 'PENDING_REVIEW'`)
  - Bảng `staff_permission_groups`: **0 bản ghi**.
- **Quyền hạn thực tế theo chính sách:**
  - Có đầy đủ quyền nền Staff: Đăng nhập Cổng Quản trị `/admin`, xem và quản lý Khóa học, tiếp nhận và chăm sóc Leads, thực hiện đối soát nhập học & học phí.
  - Không có quyền xem hay duyệt thù lao A5 (`rewards.*`); không có quyền quản lý thông báo BQT C3 (`notifications.*`).
  - Trên màn hình `/admin/staff-accounts`, cột nhóm quyền hiển thị nhãn: `Chưa gán nhóm quyền` (màu xám trung tính, có chú thích giải thích đây là nhân viên nắm giữ quyền nền tuyển sinh).

### 7.2. Trường hợp 2: Nhân viên đã được gán nhóm quyền chuyên biệt
- **Tài khoản:** `phuongsht@gmail.com` (Đào Văn Phương)
  - `id`: `75fda675-bde6-4159-af2e-81716fb3b2fd`
  - `role`: `'staff'`, `is_active`: `true`
  - Hồ sơ CTV liên kết: `STHCCTV9759` (`status = 'ACTIVE'`)
  - Bảng `staff_permission_groups`: Đã được gán 2 nhóm `reward_viewer` và `reward_manager` (`is_active = true`).
- **Quyền hạn thực tế theo chính sách:**
  - Có đầy đủ quyền nền Staff (A1, A2, A3, A4, A9).
  - Có toàn bộ 7 quyền quản lý thù lao A5 (xem, chi tiết, duyệt, từ chối, hủy, tổng hợp, xuất báo cáo).
  - Không có quyền quản lý thông báo BQT C3 (do chưa được gán `notification_manager`).
  - Trên màn hình `/admin/staff-accounts`, cột nhóm quyền hiển thị badge: `Phụ trách thù lao CTV`.
  - **Kịch bản khi thu hồi vai trò Staff:** Nếu tài khoản này bị chuyển về CTV, vai trò chuyển thành `affiliate`, đồng thời 2 bản ghi `reward_viewer` và `reward_manager` trong `staff_permission_groups` được chuyển sang `is_active = false`. Nếu sau này nâng lại Staff, tài khoản chỉ có quyền nền, không tự động nhận lại nhóm thù lao trừ khi Admin gán lại.

---

## 8. Yêu Cầu Nhật Ký Và Bảo Toàn Lịch Sử (Audit Logging & History Preservation)

Mọi biến động liên quan đến vai trò hệ thống và nhóm quyền chuyên biệt bắt buộc phải ghi nhận vào bảng `public.audit_logs`:

| Hành động nghiệp vụ | Tên action kiểm toán | Bảng thực thể | Giá trị ghi nhận (`old_values` / `new_values`) | Lý do thao tác (`reason`) |
| :--- | :--- | :--- | :--- | :--- |
| **Nâng CTV lên Staff** | `SYSTEM_ROLE_ASSIGNED` | `profiles` & `affiliate_profiles` | `old_values: { role: 'affiliate' }`<br>`new_values: { role: 'staff' }` | Bắt buộc nhập khi mở modal tại `/admin/affiliates/:id` |
| **Thu hồi vai trò Staff** | `SYSTEM_ROLE_REVOKED` | `profiles` & `affiliate_profiles` | `old_values: { role: 'staff' }`<br>`new_values: { role: 'affiliate' }` | Bắt buộc nhập khi mở modal tại `/admin/affiliates/:id` |
| **Vô hiệu hóa nhóm quyền khi thu hồi** | `STAFF_GROUPS_DEACTIVATED_ON_REVOKE` | `staff_permission_groups` | `old_values: { active_groups: ['reward_manager'] }`<br>`new_values: { active_groups: [] }` | Tự động ghi nhận theo lý do thu hồi vai trò |
| **Gán nhóm quyền chuyên biệt** | `STAFF_PERMISSION_GROUP_ASSIGNED` | `staff_permission_groups` | `new_values: { staff_id, group_code, is_active: true }` | Ghi nhận tài khoản Admin thực hiện gán tại `/admin/permissions` |
| **Thu hồi nhóm quyền chuyên biệt** | `STAFF_PERMISSION_GROUP_REVOKED` | `staff_permission_groups` | `old_values: { is_active: true }`<br>`new_values: { is_active: false }` | Ghi nhận tài khoản Admin thực hiện thu hồi tại `/admin/permissions` |
| **Khóa / Mở khóa tài khoản Staff** | `STAFF_ACCOUNT_LOCKED` / `STAFF_ACCOUNT_UNLOCKED` | `profiles` | `old_values: { is_active: true }`<br>`new_values: { is_active: false }` | Bắt buộc nhập lý do khóa/mở khóa tại `/admin/staff-accounts` |

**Quy tắc bảo mật:**
- Cột `actor_id` luôn được phân giải từ Token xác thực của Admin (`(req as any).user.id`), không bao giờ tin cậy hay nhận `actor_id` từ body của client gửi lên.
- Ghi nhận đầy đủ địa chỉ IP (`client_ip`) và User-Agent để phục vụ công tác giám sát an toàn thông tin.

---

## 9. Bảng Đối Chiếu Chính Sách Đã Chốt Với Hành Vi Source Hiện Tại

| Tiêu chí chính sách | Chính sách nghiệp vụ đã chốt (A7-NV.2) | Hành vi mã nguồn và DB hiện tại (A7-NV.0) | Mức độ đáp ứng | Đánh giá & Hướng xử lý |
| :--- | :--- | :--- | :---: | :--- |
| **Cấp quyền nền khi nâng Staff** | Staff tự động nhận quyền nền tuyển sinh qua vai trò `profiles.role = 'staff'` mà không cần nhóm quyền. | Middleware `requireStaffOrAdmin` kiểm tra `role === 'staff'` và cho phép thao tác Khóa học, Leads, Đối soát. | **Đã khớp 100%** | Giữ nguyên cơ chế middleware hiện hành. |
| **Không tự cấp quyền A5/C3 khi nâng Staff** | Không tự gán `reward_manager` hay `notification_manager` khi nâng vai trò. | `fn_update_user_system_role` chỉ update `profiles.role`, không insert vào `staff_permission_groups`. | **Đã khớp 100%** | Giữ nguyên, không tạo trigger tự gán. |
| **Bảo toàn hồ sơ và mã CTV gốc** | Hồ sơ CTV, mã CTV, leads và thù lao được giữ nguyên vẹn khi nâng Staff. | Khóa ngoại `ON DELETE RESTRICT`, `affiliate_profiles` không bị sửa đổi khi nâng role. | **Đã khớp 100%** | Đã xác minh trên 2 Staff thực tế trong DB. |
| **Vô hiệu hóa nhóm quyền khi thu hồi Staff** | Khi chuyển về `affiliate`, tự động cập nhật `is_active = false` cho các nhóm trong `staff_permission_groups`. | RPC `fn_update_user_system_role` hiện tại chỉ đổi `role`, giữ nguyên `staff_permission_groups.is_active = true`. | **Chưa khớp (GAP)** | Cần bổ sung câu lệnh UPDATE `staff_permission_groups` vào RPC ở bước triển khai sau. |
| **Nâng lại Staff chỉ nhận quyền nền** | Khi nâng lại Staff, nhóm quyền cũ không tự sống lại, chỉ có quyền nền. | Do hiện tại chưa vô hiệu hóa nhóm, nếu nâng lại thì nhóm cũ tự động có hiệu lực trở lại. | **Chưa khớp (GAP)** | Sẽ được giải quyết đồng bộ khi xử lý vô hiệu hóa nhóm ở mục trên. |
| **Quyền truy cập trang `/admin/staff-accounts`** | Chỉ dành riêng cho Admin (`adminOnly: true`). | `navConfig.ts` thiếu `adminOnly: true`, `navigationGuard.ts` cho phép cả Staff truy cập placeholder. | **Chưa khớp (GAP)** | Cần cập nhật Route Guard và Sidebar config ở bước triển khai tiếp theo. |
| **Không tạo nhóm `staff_default`** | Không tạo thêm nhóm quyền mặc định dư thừa; quyền nền đã được đảm bảo qua role. | Bảng `permission_groups` chỉ có 3 nhóm chuyên biệt (`reward_manager`, `reward_viewer`, `notification_manager`). | **Đã khớp 100%** | Thống nhất không tạo nhóm `staff_default`. |

---

## 10. Khoảng Thiếu Cần Xử Lý Ở Bước Triển Khai Tiếp Theo

Dựa trên bảng đối chiếu, các khoảng thiếu kỹ thuật cần được quy hoạch thực hiện ở các bước tiếp theo bao gồm:

1. **Nâng cấp RPC `fn_update_user_system_role` (Backend Migration):**
   - Bổ sung khối lệnh trong nhánh `p_target_role = 'affiliate'`:
     ```sql
     -- Vô hiệu hóa toàn bộ nhóm quyền đang hoạt động của nhân viên khi thu hồi vai trò Staff
     UPDATE public.staff_permission_groups
     SET is_active = FALSE
     WHERE staff_id = v_target_user.id
       AND is_active = TRUE;
     ```
   - Ghi nhận thêm log kiểm toán `STAFF_GROUPS_DEACTIVATED_ON_REVOKE`.
2. **Khóa bảo vệ Route Guard và Sidebar (Frontend Config):**
   - Bổ sung `adminOnly: true` cho mục `admin_staff` trong `src/config/navConfig.ts`.
   - Cập nhật `checkRouteAccess` trong `src/utils/navigationGuard.ts` để chặn triệt để người dùng có `role !== 'admin'` truy cập `/admin/staff-accounts`.
3. **Xây dựng API `GET /api/v1/admin/staff-accounts` (Backend Service):**
   - Truy vấn danh sách `profiles` có `role = 'staff'`.
   - Kết hợp `auth.users.last_sign_in_at` qua `supabase.auth.admin.listUsers()`.
   - Ghép danh sách nhóm quyền đang hoạt động từ `staff_permission_groups` JOIN `permission_groups`.
   - Ghép mã CTV từ `affiliate_profiles` theo `user_id`.
   - Hỗ trợ phân trang, tìm kiếm và lọc trạng thái.

---

## 11. Các Ca Kiểm Thử Nghiệm Thu Đề Xuất (Acceptance Test Cases)

### TC-01: Kiểm tra tự động nhận quyền nền khi nâng CTV lên Staff
- **Mục đích:** Xác minh tài khoản được nâng lên Staff nhận ngay quyền nền mà không cần gán nhóm quyền.
- **Tiền điều kiện:** Tài khoản CTV đã xác thực email, `role = 'affiliate'`, `is_active = true`.
- **Thao tác:**
  1. Admin truy cập `/admin/affiliates/:id`, bấm "Cấp quyền Cán bộ Tuyển sinh", nhập lý do và xác nhận.
  2. Đăng nhập bằng tài khoản vừa được nâng quyền.
  3. Truy cập các phân hệ: `/admin/leads`, `/admin/courses`, `/admin/reconcile`.
- **Kỳ vọng:**
  - `profiles.role` chuyển thành `'staff'`.
  - Tài khoản truy cập thành công các trang Khóa học, Leads, Đối soát.
  - Gọi API `POST /api/v1/admin/leads/:id/care-history` thành công.
  - Bảng `staff_permission_groups` không có bản ghi nào.

### TC-02: Kiểm tra chặn quyền chuyên biệt khi chưa gán nhóm quyền
- **Mục đích:** Xác minh Staff không có nhóm quyền thì không thể truy cập phân hệ Thù lao hoặc Thông báo BQT.
- **Tiền điều kiện:** Tài khoản Staff mới nâng từ TC-01 (chưa gán nhóm quyền).
- **Thao tác:**
  1. Staff gửi request `GET /api/v1/admin/rewards`.
  2. Staff gửi request `GET /api/v1/admin/notifications`.
  3. Staff cố gắng truy cập `/admin/permissions` hoặc `/admin/system-settings`.
- **Kỳ vọng:**
  - API trả về HTTP 403 `PERMISSION_DENIED` với mã lỗi `rewards.view` hoặc `notifications.view`.
  - Truy cập các trang Admin-only bị chặn HTTP 403 `ADMIN_ONLY` hoặc Route Guard điều hướng về `/admin`.

### TC-03: Kiểm tra nhận quyền chuyên biệt sau khi Admin gán nhóm
- **Mục đích:** Xác minh quyền chuyên biệt có hiệu lực tức thì sau khi Admin gán nhóm tại `/admin/permissions`.
- **Tiền điều kiện:** Tài khoản Staff từ TC-02.
- **Thao tác:**
  1. Admin truy cập `/admin/permissions`, gán nhóm `reward_manager` cho tài khoản này.
  2. Staff thực hiện lại request `GET /api/v1/admin/rewards` và `POST /api/v1/admin/rewards/:id/approve`.
- **Kỳ vọng:**
  - Thao tác thành công, không còn bị chặn 403.
  - Trên màn hình `/admin/staff-accounts`, cột nhóm quyền hiển thị badge `Phụ trách thù lao CTV`.

### TC-04: Kiểm tra thu hồi vai trò Staff và tự động vô hiệu hóa nhóm quyền
- **Mục đích:** Xác minh khi thu hồi Staff, tài khoản mất quyền nền và các nhóm quyền bị vô hiệu hóa an toàn.
- **Tiền điều kiện:** Tài khoản Staff từ TC-03 (đang có nhóm `reward_manager`).
- **Thao tác:**
  1. Admin truy cập `/admin/affiliates/:id`, bấm "Thu hồi quyền Cán bộ Tuyển sinh", nhập lý do và xác nhận.
  2. Kiểm tra bản ghi trong bảng `profiles` và `staff_permission_groups`.
  3. Tài khoản đăng nhập lại và truy cập `/admin`.
- **Kỳ vọng:**
  - `profiles.role` chuyển về `'affiliate'`.
  - Bản ghi nhóm quyền trong `staff_permission_groups` chuyển sang `is_active = false` (không bị xóa).
  - Hồ sơ CTV (`affiliate_profiles`), mã giới thiệu, leads và thù lao được giữ nguyên 100%.
  - Tài khoản không thể truy cập bất kỳ trang nào thuộc `/admin/*`, tự động chuyển hướng về `/portal`.

### TC-05: Kiểm tra nâng lại vai trò Staff trong tương lai
- **Mục đích:** Xác minh tài khoản được nâng lại thành Staff chỉ nhận quyền nền, không tự động hồi phục nhóm quyền cũ.
- **Tiền điều kiện:** Tài khoản đã bị thu hồi Staff từ TC-04.
- **Thao tác:**
  1. Admin vào lại `/admin/affiliates/:id`, bấm "Cấp quyền Cán bộ Tuyển sinh" lần 2.
  2. Tài khoản đăng nhập Cổng Quản trị `/admin`.
  3. Tài khoản thử truy cập lại phân hệ Thù lao (`GET /api/v1/admin/rewards`).
- **Kỳ vọng:**
  - `profiles.role` chuyển thành `'staff'`.
  - Tài khoản truy cập được các phân hệ quyền nền (Khóa học, Leads, Đối soát).
  - Bản ghi trong `staff_permission_groups` vẫn là `is_active = false`.
  - Truy cập Thù lao bị chặn HTTP 403 vì chưa được Admin chủ động gán lại nhóm quyền.
  - Trên màn hình `/admin/staff-accounts`, tài khoản hiển thị nhãn `Chưa gán nhóm quyền`.

---

## 12. Kết Luận

Tài liệu đặc tả **A7-NV.2** đã chính thức chốt toàn bộ chính sách phân quyền cho Cán bộ Tuyển sinh (`Staff`) trong hệ thống STHC_CTV:
1. **Quyền nền Staff** phát sinh trực tiếp từ vai trò hệ thống (`profiles.role = 'staff'`), bao gồm đầy đủ quyền tuyển sinh cốt lõi (Khóa học, Leads, Đối soát, Duyệt CTV, Dashboard) mà không phụ thuộc vào bất kỳ nhóm quyền nào.
2. **Quyền chuyên biệt** (Thù lao A5 và Thông báo C3) duy trì cơ chế quản lý độc lập qua nhóm quyền tại `/admin/permissions` và chỉ có hiệu lực khi được Admin gán chủ động.
3. **Quy tắc an toàn khi thu hồi vai trò Staff:** Bắt buộc vô hiệu hóa (`is_active = false`) toàn bộ liên kết nhóm quyền trong `staff_permission_groups` để bảo đảm tính an toàn khi tài khoản được tái bổ nhiệm vai trò Staff trong tương lai.

Tài liệu này là căn cứ kỹ thuật chuẩn mực để chuyển sang các bước triển khai tiếp theo (A7-NV.3). Quá trình lập tài liệu tuân thủ tuyệt đối quy tắc chỉ đọc, không thay đổi mã nguồn chức năng hay dữ liệu hệ thống.
