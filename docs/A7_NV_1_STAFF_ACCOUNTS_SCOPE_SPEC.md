# ĐẶC TẢ PHẠM VI VÀ THIẾT KẾ NGHIỆP VỤ MÀN HÌNH TÀI KHOẢN NHÂN VIÊN (A7-NV.1)

- **Mã tài liệu:** `A7-NV.1`
- **Tên tài liệu:** Đặc tả phạm vi và thiết kế nghiệp vụ màn hình Quản lý Tài khoản nhân viên (`/admin/staff-accounts`)
- **Phân hệ đối ứng:** Khu vực Quản trị Hệ thống & Cán bộ Tuyển sinh (`/admin`)
- **Tài liệu căn cứ:** `docs/A7_NV_0_STAFF_ACCOUNTS_AUDIT_REPORT.md`
- **Thời điểm lập:** 14/10/2026
- **Trạng thái:** **CHỐT ĐẶC TẢ (SPECIFICATION ONLY)**. Chưa triển khai code chức năng, chưa sửa đổi database.

---

## 1. Mục Tiêu Và Ranh Giới Phạm Vi

### 1.1. Mục tiêu
Thiết lập bộ đặc tả chuẩn mực, toàn diện và thống nhất cho màn hình **Tài khoản nhân viên** tại đường dẫn `/admin/staff-accounts`, phục vụ nhu cầu của Quản trị viên Nhà trường (`admin`) trong việc:
1. Nắm bắt danh sách toàn bộ cán bộ, nhân viên tuyển sinh đang có vai trò `staff` trong hệ thống STHC_CTV.
2. Tra cứu nhanh thông tin định danh, trạng thái hoạt động tài khoản, nhóm quyền chuyên biệt đang được gán và thời điểm đăng nhập gần nhất.
3. Cung cấp luồng điều hướng liền mạch, chuẩn xác sang các phân hệ nghiệp vụ liên quan (**Quản trị phân quyền A5** tại `/admin/permissions` và **Quản lý hồ sơ CTV** tại `/admin/affiliates/:id`) mà không tạo luồng thao tác dư thừa hay trùng lặp.

### 1.2. Ranh giới phạm vi (Scope Boundaries)
Phân hệ **Tài khoản nhân viên** được định vị là **màn hình tổng hợp và quản lý danh mục tài khoản nhân sự** của trường, hoàn toàn độc lập với:
- **Phân hệ Quản trị hệ thống (`/admin/system-settings`):** Chuyên trách cấu hình thương hiệu, tham số vận hành, quy chế tuyển sinh và quy tắc sinh mã CTV. Không can thiệp hoặc nhầm lẫn vào cài đặt hệ thống A7.
- **Phân hệ Quản trị phân quyền A5 (`/admin/permissions`):** Chuyên trách định nghĩa danh mục quyền chi tiết (`permissions`), cấu hình nhóm quyền (`permission_groups`), và thực hiện gán/thu hồi nhóm quyền trực tiếp cho nhân viên (`staff_permission_groups`).
- **Phân hệ Quản lý CTV (`/admin/affiliates`):** Chuyên trách tiếp nhận, xem xét duyệt hồ sơ, tạm ngưng hoạt động tiếp thị, và nâng/hạ vai trò hệ thống giữa CTV và Staff.

---

## 2. Các Nghiệp Vụ Thuộc Và Không Thuộc Trang

### 2.1. Các nghiệp vụ THUỘC phạm vi trang (`/admin/staff-accounts`)
1. **Xem danh sách tài khoản nhân viên:**
   - Hiển thị danh sách toàn bộ người dùng có `profiles.role = 'staff'`.
   - Loại trừ hoàn toàn tài khoản Quản trị viên (`role = 'admin'`) và Cộng tác viên thuần túy (`role = 'affiliate'`).
2. **Tìm kiếm và lọc đa tiêu chí:**
   - Tìm kiếm thời gian thực/phía máy chủ theo Họ tên, Email, Số điện thoại và Mã CTV (nếu tài khoản có hồ sơ CTV liên kết).
   - Lọc theo trạng thái tài khoản: Đang hoạt động (`is_active = true`) hoặc Đã vô hiệu hóa (`is_active = false`).
   - Lọc theo nhóm quyền chuyên biệt (ví dụ: `reward_manager`, `reward_viewer`, `notification_manager`, hoặc "Chưa gán nhóm quyền").
3. **Hiển thị thông tin tổng hợp của nhân viên:**
   - Họ và tên, Email, Số điện thoại.
   - Mã định danh CTV gốc (nếu có hồ sơ CTV).
   - Nhóm quyền hiện đang gán (kèm tên hiển thị trực quan).
   - Thời điểm đăng nhập gần nhất (`last_sign_in_at` từ Supabase Auth).
   - Trạng thái tài khoản người dùng (`is_active`).
   - Ngày cấp/kích hoạt tài khoản (`created_at`).
4. **Xem chi tiết tài khoản nhân viên:**
   - Mở modal hoặc panel trượt xem đầy đủ hồ sơ nhân viên, mã định danh hệ thống, danh sách nhóm quyền, danh sách quyền hiệu lực chi tiết (`effective_permissions` giải quyết qua RPC `fn_get_user_permissions`), và lịch sử các lần đổi vai trò từ `audit_logs`.
5. **Cung cấp liên kết nghiệp vụ trực tiếp:**
   - Nút liên kết chuyển nhanh tới `/admin/permissions` (tab Gán quyền Staff) để Admin điều chỉnh nhóm quyền.
   - Nút liên kết mở hồ sơ CTV gốc tại `/admin/affiliates/:id` (nếu tài khoản được nâng từ CTV) để xem thông tin ngân hàng, CCCD, lịch sử giới thiệu lead, hoặc thu hồi vai trò Staff.
6. **Thao tác Khóa / Mở khóa tài khoản nhân viên (`is_active`):**
   - Cho phép Admin tạm khóa hoặc mở khóa quyền truy cập hệ thống của Staff trực tiếp trên danh sách hoặc trang chi tiết, có hộp thoại xác nhận bắt buộc nhập lý do và ghi nhận kiểm toán an toàn.

### 2.2. Các nghiệp vụ KHÔNG THUỘC phạm vi trang
1. **Không tạo mới tài khoản nhân viên trực tiếp:**
   - Tuyệt đối không có nút *"Tạo nhân viên"* hay *"Thêm tài khoản Staff"*.
   - Toàn bộ nhân sự đều bắt đầu bằng việc đăng ký tài khoản tại Cổng CTV (`/login` hoặc form đăng ký), hoàn tất xác thực email, sau đó được Admin tuyển chọn và nâng vai trò.
2. **Không thực hiện nâng CTV lên Staff hoặc thu hồi vai trò Staff tại trang này:**
   - Không đặt nút *"Nâng quyền"* hay *"Hạ quyền CTV"* tại bảng này.
   - Thao tác thay đổi vai trò hệ thống giữa `affiliate` và `staff` tiếp tục duy trì duy nhất tại màn hình Chi tiết CTV (`/admin/affiliates/:id`) thông qua API `PATCH /api/v1/admin/affiliates/:id/system-role` và RPC `fn_update_user_system_role`.
3. **Không tạo, sửa hoặc cấu hình nhóm quyền tại trang này:**
   - Không có form tạo nhóm quyền mới hay sửa danh mục mã quyền. Thao tác này thuộc thẩm quyền của `/admin/permissions`.
4. **Không gán hoặc thu hồi nhóm quyền trực tiếp trong bảng danh sách:**
   - Việc gán/thu hồi nhóm quyền đã có phân hệ chuyên trách A5 (`/admin/permissions`). Trang này chỉ hiển thị nhóm quyền phục vụ mục đích thông tin và cung cấp nút điều hướng sang `/admin/permissions`.
5. **Không chỉnh sửa hồ sơ CTV, khách hàng (Leads), đối soát hoặc thù lao:**
   - Nghiệp vụ khách hàng, học phí và thù lao 500k của CTV không được phép sửa đổi tại phân hệ tài khoản nhân sự.
6. **Không tự động gán các nhóm quyền chuyên biệt:**
   - Không tự động cấp các nhóm quyền `reward_manager`, `reward_viewer`, hay `notification_manager` cho tài khoản nhân viên khi mới tạo hoặc khi truy cập trang.

---

## 3. Vai Trò Và Quyền Truy Cập (Access Control & Roles)

### 3.1. Đối tượng và ma trận quyền
- **Chỉ dành riêng cho Quản trị viên (`role === 'admin'`):**
  - Quản trị viên đang hoạt động (`is_active === true`) là đối tượng **duy nhất** có quyền xem và thao tác trên phân hệ `/admin/staff-accounts`.
- **Cán bộ Tuyển sinh (`role === 'staff'`):**
  - Bị **chặn hoàn toàn**:
    1. Không hiển thị mục “Tài khoản nhân viên” trên thanh Sidebar.
    2. Bị Route Guard chặn khi gõ trực tiếp URL `/admin/staff-accounts` (chuyển hướng về `/admin` kèm thông báo không đủ thẩm quyền).
    3. Bị Backend chặn khi gọi API quản lý tài khoản nhân viên với mã lỗi HTTP 403 `ADMIN_ONLY`.
- **Cộng tác viên Tuyển sinh (`role === 'affiliate'`):**
  - Không thể truy cập khu vực `/admin`, Route Guard tự động chuyển hướng về `/portal` hoặc `/pending`.
- **Người dùng chưa đăng nhập (`public`):**
  - Chuyển hướng về `/login?redirect_to=%2Fadmin%2Fstaff-accounts`.

### 3.2. Yêu cầu vá lỗ hổng Route Guard và Sidebar đã phát hiện ở A7-NV.0
- **Tại `src/config/navConfig.ts`:**
  - Bổ sung thuộc tính `adminOnly: true` cho mục menu `admin_staff`:
    ```ts
    {
      id: 'admin_staff',
      title: 'Tài khoản nhân viên',
      path: '/admin/staff-accounts',
      icon: UserCheck,
      adminOnly: true, // Bắt buộc: chỉ hiển thị cho Admin
      isActiveMatch: (currentPath: string) => {
        const clean = currentPath.split('?')[0].split('#')[0];
        return clean === '/admin/staff-accounts';
      },
    }
    ```
- **Tại `src/utils/navigationGuard.ts`:**
  - Bổ sung khai báo trong `APP_ROUTES`:
    ```ts
    '/admin/staff-accounts': {
      path: '/admin/staff-accounts',
      name: 'Quản lý Tài khoản nhân viên',
      isPublic: false,
      allowedRoles: ['admin'], // Bắt buộc: chỉ admin
    }
    ```
  - Trong hàm `checkRouteAccess(path, auth)`: Bổ sung `/admin/staff-accounts` vào khối kiểm tra các tuyến đường độc quyền của Admin (cùng nhóm với `/admin/system-settings`, `/admin/permissions`, `/admin/email-templates`, `/admin/email-jobs`).
- **Tại Backend `server.ts`:**
  - Toàn bộ các API liên quan đến danh sách tài khoản nhân viên bắt buộc phải sử dụng middleware `requireAdminOnly`.

---

## 4. Danh Sách Cột, Tìm Kiếm, Bộ Lọc Và Phân Trang

### 4.1. Cấu trúc bảng danh sách nhân viên

| Cột | Tiêu đề cột | Độ rộng đề xuất | Dữ liệu hiển thị & Quy tắc |
| :---: | :--- | :---: | :--- |
| **1** | **STT** | `60px` | Số thứ tự tăng dần theo trang: `(page - 1) * limit + index + 1`. |
| **2** | **Họ và tên & Email** | `260px` | - Dòng 1: Họ và tên (`full_name`), in đậm, có avatar thumbnail hoặc ký tự viết tắt.<br>- Dòng 2: Email tài khoản (`email`), định dạng chữ nhỏ, font mono. |
| **3** | **Số điện thoại** | `130px` | Số điện thoại liên hệ (`phone`). Nếu không có, hiển thị: `Chưa cập nhật` (màu nhạt). |
| **4** | **Mã CTV liên kết** | `140px` | - Nếu tài khoản có hồ sơ CTV: Hiển thị badge mã CTV (vd: `STHCCTV9759`, nền xanh nhạt, font mono đậm).<br>- Nếu không có: Hiển thị `—`. |
| **5** | **Trạng thái tài khoản** | `150px` | - `is_active === true`: Badge xanh lá `Đang hoạt động`.<br>- `is_active === false`: Badge đỏ `Đã vô hiệu hóa`. |
| **6** | **Nhóm quyền gán** | `220px` | - Hiển thị badge danh sách nhóm quyền đang có (vd: `Phụ trách thù lao CTV`, `Quản lý thông báo`).<br>- Nếu có trên 2 nhóm: Hiển thị 2 nhóm đầu kèm badge `+N` (hover tooltip xem đầy đủ).<br>- Nếu chưa có nhóm nào: Hiển thị `Chưa gán nhóm quyền` (màu xám nhạt). |
| **7** | **Đăng nhập gần nhất** | `160px` | - Định dạng theo múi giờ Việt Nam (`HH:mm, DD/MM/YYYY`) qua helper `formatDateTimeShortVi`.<br>- Nếu chưa từng đăng nhập (`last_sign_in_at` rỗng/null): Hiển thị `Chưa đăng nhập`. |
| **8** | **Ngày tạo** | `130px` | Ngày tạo tài khoản (`created_at`), định dạng `DD/MM/YYYY`. |
| **9** | **Thao tác** | `140px` | Cụm nút hành động nhanh:<br>1. **Xem chi tiết** (Icon con mắt `Eye`): Mở modal/drawer chi tiết nhân viên.<br>2. **Mở hồ sơ CTV** (Icon `ExternalLink`): Mở chi tiết CTV tại `/admin/affiliates/:id` (chỉ hiển thị khi có mã CTV).<br>3. **Quản lý phân quyền** (Icon `Shield`): Điều hướng sang `/admin/permissions` có sẵn bộ lọc theo nhân viên này.<br>4. **Khóa / Mở khóa** (Icon `Lock` / `Unlock`): Thao tác cập nhật `is_active`. |

### 4.2. Tìm kiếm (Search)
- **Ô tìm kiếm:** Đặt ở góc trên bên trái bảng danh sách, có icon kính lúp và nút xóa nhanh (x).
- **Phạm vi tìm kiếm:**
  - Họ và tên (`full_name`) - tìm kiếm không phân biệt hoa thường (`ilike`).
  - Địa chỉ Email (`email`) - tìm kiếm theo chuỗi con.
  - Số điện thoại (`phone`) - tìm kiếm theo chuỗi số.
  - Mã CTV (`affiliate_code`) - tìm kiếm theo mã định danh CTV liên kết.
- **Cơ chế:** Debounce 400ms trên frontend trước khi gọi API backend. Khi bấm Enter, kích hoạt tìm kiếm ngay.

### 4.3. Bộ lọc (Filters)
- **Bộ lọc Trạng thái tài khoản:**
  - `Tất cả trạng thái` (mặc định).
  - `Đang hoạt động` (`is_active = true`).
  - `Đã vô hiệu hóa` (`is_active = false`).
- **Bộ lọc Nhóm quyền:**
  - `Tất cả nhóm quyền` (mặc định).
  - Danh sách nhóm quyền lấy động từ bảng `permission_groups` (`reward_manager`, `reward_viewer`, `notification_manager`, ...).
  - Tùy chọn đặc biệt: `Chưa gán nhóm quyền` (dành cho nhân viên mới nâng vai trò nhưng chưa được cấp quyền chi tiết).

### 4.4. Phân trang phía máy chủ (Server-side Pagination)
- **Số bản ghi mỗi trang (`limit`):** Mặc định 10 bản ghi/trang. Cho phép lựa chọn: 10, 20, 50 bản ghi.
- **Thanh phân trang:**
  - Hiển thị dòng tổng hợp: *"Hiển thị X - Y trên tổng số Z nhân viên"*.
  - Các nút điều hướng: *Trang trước*, *Trang sau*, danh sách số trang.
- **Bảo lưu trạng thái (State Preservation):** Khi người dùng xem chi tiết hoặc điều hướng sang trang khác rồi quay lại bằng nút Back của trình duyệt, giữ nguyên từ khóa tìm kiếm, bộ lọc trạng thái, nhóm quyền và trang hiện tại (lưu trên URL query params hoặc component state).

---

## 5. Ánh Xạ Dữ Liệu Và Nguồn `last_sign_in_at`

### 5.1. Mô hình ánh xạ dữ liệu tổng thể (Data Mapping Model)

```
       Supabase Auth (auth.users)
      ┌───────────────────────────┐
      │ id                        │
      │ email                     │
      │ last_sign_in_at  ─────────┼──────────┐ (Ghép qua Backend Service Role)
      │ email_confirmed_at        │          │
      └─────────────┬─────────────┘          │
                    │ 1:1                    │
                    ▼                        ▼
       public.profiles (PostgreSQL)   ┌────────────────────────────────┐
      ┌───────────────────────────┐   │ Cột danh sách Staff hiển thị   │
      │ id (PK)                   ├───┼──> Họ tên, Email, SĐT, Avatar  │
      │ role = 'staff'            │   │                                │
      │ is_active                 ├───┼──> Trạng thái tài khoản        │
      │ full_name, phone, avatar  │   │                                │
      │ created_at, updated_at    ├───┼──> Ngày tạo tài khoản          │
      └─────────────┬─────────────┘   │                                │
                    │ 1:1 (Tùy chọn)  │                                │
                    ▼                 │                                │
       public.affiliate_profiles      │                                │
      ┌───────────────────────────┐   │                                │
      │ user_id = profiles.id     ├───┼──> Mã CTV (affiliate_code)     │
      │ affiliate_code            │   │    Trạng thái duyệt CTV        │
      │ status (ACTIVE, ...)      │   └────────────────────────────────┘
      └───────────────────────────┘                  ▲
                                                     │
       public.staff_permission_groups               │
      ┌───────────────────────────┐                  │
      │ staff_id = profiles.id    │                  │
      │ is_active = true          │                  │
      │ group_code ───────────────┼──────────────────┘
      └─────────────┬─────────────┘ (JOIN permission_groups lấy Tên hiển thị)
                    │
                    ▼
       public.permission_groups
      ┌───────────────────────────┐
      │ code (PK)                 │
      │ name ('Phụ trách thù lao')│
      └───────────────────────────┘
```

### 5.2. Giải pháp kiến trúc truy xuất `last_sign_in_at`
- **Thực trạng đã xác minh ở A7-NV.0:**
  - `public.profiles` không lưu thời điểm đăng nhập gần nhất.
  - Supabase Auth tự động cập nhật `auth.users.last_sign_in_at` mỗi khi người dùng đăng nhập thành công.
  - Bảng `auth.users` nằm trong schema hệ thống của Supabase, không thể truy vấn trực tiếp bằng client thông thường thông qua PostgREST REST API.
- **Giải pháp chuẩn hóa:**
  - **Tầng Backend Express (`server.ts`):** Sử dụng `SUPABASE_SERVICE_ROLE_KEY` thông qua `supabase.auth.admin.listUsers()`.
  - Backend truy vấn danh sách `profiles` của Staff, sau đó lấy danh sách người dùng từ `supabase.auth.admin` và ánh xạ `last_sign_in_at` theo `id`.
  - Giải pháp này đã được vận hành ổn định trong source code hiện tại (dòng `6019` file `server.ts`) cho danh sách CTV và đảm bảo tính an toàn tuyệt đối, không để lộ token hay secret key xuống client.

### 5.3. Quy tắc ghép hồ sơ CTV liên quan
- Sử dụng điều kiện kết nối duy nhất: `public.affiliate_profiles.user_id = public.profiles.id`.
- **Tuyệt đối không ghép nối qua email** vì email có thể thay đổi hoặc không đại diện cho ràng buộc toàn vẹn khóa ngoại trong cơ sở dữ liệu.
- Nếu nhân viên không có bản ghi nào trong `affiliate_profiles`, trường `affiliate_code` trả về `null` và hiển thị ký tự gạch ngang `—` trên bảng.

---

## 6. Phân Biệt Quyền Nền Staff Với Nhóm Quyền Chuyên Biệt

Để tránh hiểu nhầm trong quá trình triển khai, đặc tả làm rõ sự khác biệt giữa hai cơ chế phân quyền đang tồn tại song song:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. QUYỀN NỀN TẢNG (BASELINE STAFF ROLE)                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Căn cứ: Cột public.profiles.role = 'staff'                                                │
│ • Kiểm tra tại: Middleware requireStaffOrAdmin và Route Guard                              │
│ • Cơ chế cấp: Được kích hoạt tự động ngay khi Admin nâng vai trò tại /admin/affiliates/:id  │
│ • Danh mục quyền sở hữu:                                                                    │
│   - Đăng nhập Cổng Quản trị /admin.                                                         │
│   - Xem và xét duyệt danh sách Cộng tác viên (/admin/affiliates).                           │
│   - Xem và quản lý danh mục Khóa học của trường (/admin/courses).                           │
│   - Tiếp nhận, xem và chăm sóc thông tin Leads toàn hệ thống (/admin/leads).                │
│   - Thực hiện thao tác đối soát hồ sơ nhập học & học phí (/admin/reconcile).                │
│   - Xem số liệu tổng quan trên Dashboard quản trị (/admin).                                 │
│ • Đặc điểm: KHÔNG CẦN bất kỳ bản ghi nào trong staff_permission_groups.                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                                             ▲
                                             │ Độc lập nhưng bổ trợ
                                             ▼

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. QUYỀN CHUYÊN BIỆT (GRANULAR RBAC PERMISSIONS)                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Căn cứ: Bản ghi trong public.staff_permission_groups với is_active = true                 │
│ • Kiểm tra tại: Middleware requirePermission('...') và hàm RPC fn_has_permission            │
│ • Cơ chế cấp: Phải do Admin gán thủ công theo từng nhóm quyền tại /admin/permissions       │
│ • Danh mục quyền sở hữu:                                                                    │
│   - Nhóm Phụ trách thù lao (reward_manager): Toàn quyền duyệt/từ chối/hủy thù lao 500k A5. │
│   - Nhóm Xem thù lao (reward_viewer): Chỉ xem danh sách và chi tiết thù lao A5.             │
│   - Nhóm Thông báo BQT (notification_manager): Soạn thảo, xuất bản và thu hồi bản tin C3.  │
│ • Đặc điểm: Nhân viên KHÔNG CÓ nhóm quyền thì vẫn dùng được quyền nền, nhưng KHÔNG ĐƯỢC     │
│   thao tác trên các phân hệ Thù lao hoặc Quản lý Thông báo.                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc hiển thị trên giao diện Tài khoản nhân viên:**
- Cột *“Nhóm quyền đang gán”* chỉ nhằm mục đích **cung cấp thông tin trực quan** để Admin biết nhân viên này đang nắm giữ những trọng trách chuyên biệt nào.
- Việc hiển thị này không can thiệp hay thay đổi logic phân quyền hiện có của hệ thống RBAC.

---

## 7. Sơ Đồ Điều Hướng Nghiệp Vụ

Sơ đồ điều hướng liên kết chặt chẽ giữa 3 màn hình cốt lõi của khu vực Quản trị:

```
                      ┌──────────────────────────────────────────┐
                      │ MÀN HÌNH QUẢN LÝ CTV                     │
                      │ (/admin/affiliates)                      │
                      └────────────────────┬─────────────────────┘
                                           │
                        Bấm xem chi tiết CTV
                                           │
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ CHI TIẾT HỒ SƠ CTV                       │
                      │ (/admin/affiliates/:id)                  │
                      ├──────────────────────────────────────────┤
                      │ • Nút "Cấp quyền cán bộ tuyển sinh"      │
                      │ • Nút "Thu hồi quyền cán bộ tuyển sinh"  │
                      └─────────────┬────────────────────▲───────┘
                                    │                    │
                  Admin nâng vai trò│                    │ Bấm nút "Mở hồ sơ CTV"
                  thành Staff       │                    │ (chỉ khi có mã CTV)
                                    ▼                    │
┌────────────────────────────────────────────────────────┴───────────────────────────────────┐
│ MÀN HÌNH TÀI KHOẢN NHÂN VIÊN (/admin/staff-accounts)                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ • Xem danh sách toàn bộ cán bộ tuyển sinh (Staff)                                          │
│ • Xem nhóm quyền, lần đăng nhập gần nhất, trạng thái hoạt động                             │
│ • Tìm kiếm, lọc theo trạng thái / nhóm quyền                                               │
│ • Thao tác:                                                                                │
│     ├──> [Xem chi tiết]  ───> Mở Panel chi tiết tài khoản nhân viên                        │
│     ├──> [Khóa/Mở khóa]  ───> Cập nhật profiles.is_active có xác nhận                      │
│     ├──> [Mở hồ sơ CTV]  ───> Chuyển hướng sang /admin/affiliates/:id                      │
│     └──> [Phân quyền]    ───> Chuyển hướng sang /admin/permissions (kèm staff_id)          │
└──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                           │
                         Bấm nút "Phân quyền"
                                           │
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │ QUẢN LÝ PHÂN QUYỀN A5                    │
                      │ (/admin/permissions)                     │
                      ├──────────────────────────────────────────┤
                      │ • Tab 1: Danh mục & Cấu hình Nhóm quyền  │
                      │ • Tab 2: Bảng Gán / Thu hồi Nhóm quyền   │
                      │   (reward_manager, notification_manager) │
                      └──────────────────────────────────────────┘
```

---

## 8. Hợp Đồng API Dự Kiến (API Contract Specification)

*Lưu ý: Phần này định nghĩa hợp đồng giao tiếp dữ liệu chuẩn mực, không viết code endpoint ở bước A7-NV.1.*

### 8.1. API Lấy danh sách tài khoản nhân viên (List Staff Accounts)
- **Phương thức & Tuyến đường:** `GET /api/v1/admin/staff-accounts`
- **Bảo mật & Quyền:** `requireAdminOnly` (Bearer Token của Quản trị viên).
- **Tham số truy vấn (Query Parameters):**
  - `page` (number, tùy chọn, mặc định: 1): Trang hiện tại.
  - `limit` (number, tùy chọn, mặc định: 10): Số bản ghi trên một trang.
  - `search` (string, tùy chọn): Từ khóa tìm kiếm (họ tên, email, SĐT, mã CTV).
  - `status` (string, tùy chọn): Lọc theo trạng thái tài khoản (`all`, `active`, `disabled`).
  - `group` (string, tùy chọn): Lọc theo nhóm quyền (`all`, `none`, hoặc `group_code` cụ thể).
- **Cấu trúc phản hồi thành công (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f",
        "email": "tuyensinh_canbo@sthc.edu.vn",
        "full_name": "Võ Minh Quân (Cán bộ Tuyển sinh)",
        "phone": "0901234567",
        "avatar_url": null,
        "role": "staff",
        "is_active": true,
        "created_at": "2026-10-03T21:55:09.277Z",
        "last_sign_in_at": "2026-10-03T22:20:23.238Z",
        "email_confirmed_at": "2026-10-03T22:19:53.433Z",
        "affiliate": {
          "id": "8550453e-4a97-4e83-9e3f-df758bf849a4",
          "affiliate_code": "STHCCTV3129",
          "status": "PENDING_REVIEW"
        },
        "permission_groups": []
      },
      {
        "id": "75fda675-bde6-4159-af2e-81716fb3b2fd",
        "email": "phuongsht@gmail.com",
        "full_name": "Đào Văn Phương",
        "phone": "0987654321",
        "avatar_url": "https://.../avatar.jpg",
        "role": "staff",
        "is_active": true,
        "created_at": "2026-09-29T23:05:51.861Z",
        "last_sign_in_at": "2026-10-06T01:13:42.955Z",
        "email_confirmed_at": "2026-09-30T06:15:04.033Z",
        "affiliate": {
          "id": "507d30b1-5ed5-4870-bbd0-eac8113c564b",
          "affiliate_code": "STHCCTV9759",
          "status": "ACTIVE"
        },
        "permission_groups": [
          {
            "code": "reward_manager",
            "name": "Phụ trách thù lao CTV",
            "assigned_at": "2026-10-07T15:01:40.718Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
  ```

### 8.2. API Lấy chi tiết tài khoản nhân viên (Staff Detail)
- **Phương thức & Tuyến đường:** `GET /api/v1/admin/staff-accounts/:id`
- **Bảo mật & Quyền:** `requireAdminOnly`.
- **Cấu trúc phản hồi thành công (HTTP 200 OK):**
  Bao gồm toàn bộ dữ liệu cơ bản như trong danh sách, bổ sung:
  - `effective_permissions`: Mảng các mã quyền hiệu lực được tính toán qua `fn_get_user_permissions(id)`.
  - `role_history`: Danh sách các bản ghi `audit_logs` liên quan đến việc nâng/thu hồi vai trò hoặc khóa tài khoản của người này.

### 8.3. API Cập nhật trạng thái kích hoạt tài khoản (Lock / Unlock Staff Account)
- **Phương thức & Tuyến đường:** `PATCH /api/v1/admin/staff-accounts/:id/active-status`
- **Bảo mật & Quyền:** `requireAdminOnly`.
- **Dữ liệu gửi lên (Request Body):**
  ```json
  {
    "is_active": false,
    "reason": "Nhân viên tạm thời nghỉ thai sản theo quyết định số 12/QĐ-STHC"
  }
  ```
- **Ràng buộc kiểm tra nghiêm ngặt:**
  1. Người thực hiện bắt buộc phải là Admin đang hoạt động.
  2. Bắt buộc nhập lý do (`reason` không được rỗng).
  3. Không được tự vô hiệu hóa tài khoản của chính Quản trị viên đang đăng nhập.
  4. Tài khoản đích bắt buộc phải có `role = 'staff'`.
  5. Ghi nhật ký kiểm toán vào `public.audit_logs` với action `STAFF_ACCOUNT_LOCKED` hoặc `STAFF_ACCOUNT_UNLOCKED`.

---

## 9. Thiết Kế Trạng Thái Giao Diện Và Xử Lý Lỗi

### 9.1. Các trạng thái giao diện (UI States)
1. **Trạng thái Đang tải dữ liệu (Loading State):**
   - Hiển thị Skeleton loading trên các hàng của bảng danh sách (hiệu ứng shimmer) để duy trì bố cục, tránh giật lag layout.
   - Nút *Làm mới* hiển thị icon xoay tròn.
2. **Trạng thái Trống (Empty State - Không có nhân viên):**
   - Khi hệ thống chưa có tài khoản nào được nâng lên Staff:
     - Icon: `Users` (màu slate xám nhẹ).
     - Tiêu đề: *"Chưa có tài khoản nhân viên nào"*.
     - Mô tả: *"Hệ thống chưa ghi nhận tài khoản Cán bộ Tuyển sinh (Staff). Quản trị viên có thể vào màn hình Quản lý CTV để nâng quyền cho các tài khoản đủ điều kiện."*
     - Nút hành động: *"Đi đến Quản lý CTV"* (`/admin/affiliates`).
3. **Trạng thái Không tìm thấy kết quả lọc (Search Not Found):**
   - Khi từ khóa tìm kiếm hoặc bộ lọc không khớp bản ghi nào:
     - Icon: `SearchX`.
     - Tiêu đề: *"Không tìm thấy tài khoản nhân viên phù hợp"*.
     - Mô tả: *"Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc xóa các bộ lọc hiện tại."*
     - Nút hành động: *"Xóa bộ lọc và làm mới"*.
4. **Trạng thái Lỗi kết nối / Máy chủ (Error State):**
   - Hộp thông báo màu đỏ nhạt (`bg-rose-50 border-rose-200`):
     - Icon: `AlertCircle`.
     - Thông báo lỗi chi tiết do API trả về (hoặc *"Lỗi kết nối máy chủ"*).
     - Nút: *"Thử lại"* gọi lại hàm tải dữ liệu.

### 9.2. Bố cục Responsive & Trải nghiệm đa màn hình
- **Trên màn hình lớn (Desktop / Laptop >= 1024px):**
  - Hiển thị bảng dữ liệu đầy đủ 9 cột.
  - Các cột STT, Mã CTV, Trạng thái, Lần đăng nhập được gán độ rộng cố định; cột Họ tên & Email tự co giãn linh hoạt.
- **Trên màn hình vừa và nhỏ (Tablet / Mobile < 1024px):**
  - Bảng được bao bọc trong khối cuộn ngang mượt mà (`overflow-x-auto min-w-[900px]`).
  - Thanh cuộn được tạo kiểu thanh mảnh (thin scrollbar).
  - Vùng tìm kiếm và các bộ lọc chuyển từ hàng ngang thành dạng xếp chồng (stacked layout) để tối ưu diện tích bấm chạm.

---

## 10. Các Rủi Ro, Điểm Cần Xác Minh Và Ca Nghiệm Thu Đề Xuất

### 10.1. Rủi ro tiềm ẩn và giải pháp phòng ngừa

| STT | Rủi ro tiềm ẩn | Mức độ | Giải pháp phòng ngừa trong đặc tả |
| :---: | :--- | :---: | :--- |
| **1** | **Nhầm lẫn giữa `is_active` và trạng thái CTV `status`** | Cao | Phân định rạch ròi: `profiles.is_active` là quyền đăng nhập hệ thống; `affiliate_profiles.status` là trạng thái xét duyệt CTV. Khóa `is_active` không làm đổi trạng thái duyệt CTV từ `ACTIVE` thành `SUSPENDED`. |
| **2** | **Staff tự truy cập vào trang quản lý tài khoản nhân viên** | Cao | Bổ sung `adminOnly: true` cho menu, chặn tại Route Guard `navigationGuard.ts` và bảo vệ API bằng middleware `requireAdminOnly`. |
| **3** | **Lộ thông tin nhạy cảm của Supabase Auth** | Trung bình | Backend API chỉ trích xuất duy nhất trường `last_sign_in_at` và `email_confirmed_at`, tuyệt đối không trả về `encrypted_password`, `raw_app_meta_data` hay token. |
| **4** | **Lệch múi giờ hiển thị ngày đăng nhập gần nhất** | Thấp | Bắt buộc sử dụng helper chuẩn hóa `formatDateTimeShortVi` với múi giờ cố định `Asia/Ho_Chi_Minh` (UTC+07:00). |
| **5** | **Staff không có quyền A5/C3 bị hiểu nhầm là lỗi hệ thống** | Trung bình | Giao diện hiển thị rõ nhãn badge *"Chưa gán nhóm quyền"* kèm chú thích giải thích rằng nhân viên vẫn có đầy đủ quyền nền tuyển sinh của trường. |

### 10.2. Các ca kiểm thử nghiệm thu đề xuất (Acceptance Test Cases)

1. **TC-A7NV-01: Kiểm tra phân quyền truy cập menu và route**
   - *Bước thực hiện:* Đăng nhập bằng tài khoản Staff (`tuyensinh_canbo@sthc.edu.vn`).
   - *Kỳ vọng:* Không nhìn thấy mục “Tài khoản nhân viên” trên Sidebar; khi gõ URL `/admin/staff-accounts` bị Route Guard chuyển hướng về `/admin` kèm thông báo từ chối.
2. **TC-A7NV-02: Kiểm tra truy cập hợp lệ của Quản trị viên**
   - *Bước thực hiện:* Đăng nhập bằng tài khoản Admin (`admin@sthc.edu.vn`), truy cập `/admin/staff-accounts`.
   - *Kỳ vọng:* Mục menu hiển thị trạng thái active, danh sách hiển thị đúng 2 tài khoản Staff hiện có (`tuyensinh_canbo@sthc.edu.vn` và `phuongsht@gmail.com`), không lẫn tài khoản Admin.
3. **TC-A7NV-03: Kiểm tra hiển thị nhóm quyền và lần đăng nhập gần nhất**
   - *Bước thực hiện:* Kiểm tra thông tin hiển thị trên bảng.
   - *Kỳ vọng:*
     - Tài khoản `phuongsht@gmail.com` hiển thị nhóm quyền `reward_manager` và ngày đăng nhập gần nhất chuẩn giờ VN.
     - Tài khoản `tuyensinh_canbo@sthc.edu.vn` hiển thị nhãn `Chưa gán nhóm quyền` và ngày đăng nhập gần nhất chuẩn giờ VN.
4. **TC-A7NV-04: Kiểm tra tìm kiếm và bộ lọc**
   - *Bước thực hiện:* Nhập từ khóa "Võ Minh Quân" hoặc mã CTV "STHCCTV3129".
   - *Kỳ vọng:* Bảng lọc tức thì chỉ hiển thị đúng 1 dòng của nhân viên Võ Minh Quân.
5. **TC-A7NV-05: Kiểm tra liên kết nghiệp vụ sang Quản lý CTV và Phân quyền**
   - *Bước thực hiện:* Bấm nút *Mở hồ sơ CTV* trên dòng của nhân viên.
   - *Kỳ vọng:* Điều hướng chính xác tới `/admin/affiliates/:id`. Bấm nút *Phân quyền* điều hướng chính xác tới `/admin/permissions`.
6. **TC-A7NV-06: Kiểm tra thao tác Khóa / Mở khóa tài khoản nhân viên**
   - *Bước thực hiện:* Admin chọn khóa tài khoản của 1 Staff, nhập lý do xác nhận.
   - *Kỳ vọng:* `profiles.is_active` chuyển thành `false`, ghi nhận 1 log kiểm toán trong `audit_logs`. Tài khoản Staff này khi thao tác API tiếp theo lập tức bị chặn với lỗi `ACCOUNT_DISABLED`.

---

## 11. Kết Luận Và Đề Xuất Chuyển Bước

- **Mức độ hoàn tất bước A7-NV.1:**
  - Nhóm kỹ thuật đã hoàn thành việc xây dựng đặc tả phạm vi, ma trận phân quyền, hợp đồng API và thiết kế giao diện chi tiết cho màn hình **Tài khoản nhân viên** (`/admin/staff-accounts`).
  - Toàn bộ các phát hiện và khoảng thiếu từ báo cáo kiểm kê A7-NV.0 đã được xử lý triệt để trong tài liệu đặc tả này mà không phá vỡ cấu trúc cơ sở dữ liệu hay phân hệ hiện hữu.
- **Tuân thủ quy tắc giới hạn:**
  - Không sửa mã nguồn tính năng, không can thiệp CSDL, không tạo tài khoản thử nghiệm.
- **Đề xuất bước kế tiếp:**
  - Trình duyệt tài liệu `docs/A7_NV_1_STAFF_ACCOUNTS_SCOPE_SPEC.md`.
  - Sẵn sàng chuyển sang bước tiếp theo **A7-NV.2** (Triển khai API backend `GET /api/v1/admin/staff-accounts` và cập nhật Route Guard / Sidebar menu `adminOnly: true`).
