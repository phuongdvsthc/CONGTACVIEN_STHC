# KẾ HOẠCH VÀ BỘ CA NGHIỆM THU PHÂN HỆ TÀI KHOẢN NHÂN VIÊN (A7-NV.5)

- **Mã tài liệu:** `A7-NV.5`
- **Tên tài liệu:** Kế hoạch kiểm thử và Ma trận ca nghiệm thu chi tiết cho phân hệ Quản lý Tài khoản nhân viên (`/admin/staff-accounts`)
- **Phân hệ đối ứng:** Cổng Quản trị Nhà trường (`/admin/staff-accounts`, `/admin/affiliates`, `/admin/permissions`)
- **Tài liệu căn cứ:** 
  - `docs/A7_NV_0_STAFF_ACCOUNTS_AUDIT_REPORT.md` (Báo cáo kiểm kê source code & CSDL)
  - `docs/A7_NV_1_STAFF_ACCOUNTS_SCOPE_SPEC.md` (Đặc tả phạm vi màn hình)
  - `docs/A7_NV_2_STAFF_DEFAULT_PERMISSIONS_SPEC.md` (Chính sách phân quyền mặc định và vòng đời Staff)
  - `docs/A7_NV_3_STAFF_PERMISSION_DISPLAY_SPEC.md` (Quy tắc hiển thị phân quyền trên giao diện)
  - `docs/A7_NV_4_STAFF_ACCOUNT_SECURITY_AUDIT_SPEC.md` (Đặc tả quy tắc bảo mật và nhật ký kiểm toán)
- **Thời điểm lập:** 14/10/2026
- **Trạng thái:** **CHỐT KẾ HOẠCH KIỂM THỬ (TEST PLAN ONLY)**. Không thực hiện thay đổi mã nguồn, không chạy lệnh ghi trên database.

---

## 1. Phạm Vi Nghiệm Thu Và Điều Kiện Môi Trường

### 1.1. Phạm vi nghiệm thu (Scope of Acceptance)
Bộ ca nghiệm thu này bao quát toàn diện các khía cạnh nghiệp vụ, bảo mật, giao diện và cơ sở dữ liệu của phân hệ **Tài khoản nhân viên**:
1. **Kiểm soát truy cập & Phân quyền (Access Control & RBAC):** Đảm bảo ranh giới cô lập giữa Admin, Staff, CTV và khách vãng lai.
2. **Truy vấn danh sách & Hiển thị dữ liệu (Data Query & Presentation):** Phân trang, tìm kiếm, lọc theo trạng thái/nhóm, định dạng thời gian và ghép nối Supabase Auth.
3. **Phần chi tiết & Diễn giải quyền (Permission Interpretation):** Tách bạch quyền nền tuyển sinh (`profiles.role = 'staff'`) và nhóm quyền chuyên biệt (`staff_permission_groups`).
4. **Vòng đời trạng thái tài khoản Staff (Lock / Unlock):** Thao tác cập nhật `profiles.is_active` kèm lý do và chặn truy cập tức thì.
5. **Vòng đời vai trò hệ thống (Role Transition):** Nâng CTV lên Staff và thu hồi vai trò Staff tại `/admin/affiliates/:id`, đảm bảo tự động vô hiệu hóa nhóm quyền khi thu hồi.
6. **Quản lý nhóm quyền chuyên biệt (Group Assignment):** Gán/thu hồi nhóm quyền tại `/admin/permissions` và tác động tới quyền hiệu lực.
7. **Nhật ký kiểm toán (Audit Logs Integrity):** Tính chính xác, bất biến, ghi nhận đầy đủ IP/UA và không chứa thông tin nhạy cảm.
8. **Tính nguyên tử & Tranh chấp đồng thời (Atomicity & Concurrency):** Rollback giao dịch khi lỗi và cơ chế chống xung đột trạng thái.

### 1.2. Điều kiện môi trường kiểm thử (Testing Environment)
- **Môi trường:** Chạy trên môi trường Staging / Test độc lập (Local/Preview Branch).
- **Quy tắc bất biến:** Tuyệt đối **không thao tác ghi dữ liệu, khóa/mở khóa hay đổi vai trò trên các tài khoản thật** của cơ sở dữ liệu production (như `tuyensinh_canbo@sthc.edu.vn`, `phuongsht@gmail.com`, `admin@sthc.edu.vn`). Các tài khoản này chỉ được dùng làm đối tượng tham chiếu chỉ đọc để đối chiếu hiện trạng.
- **Dữ liệu kiểm thử:** Bắt buộc sử dụng các fixture test giả lập được tạo riêng với tiền tố nhận diện và có quy trình dọn dẹp tự động (Teardown).

---

## 2. Định Nghĩa Dữ Liệu Fixture Test Và Quy Tắc Dọn Dẹp

### 2.1. Danh mục Fixture Test chuẩn mực

| Mã Fixture | Vai trò (`role`) | Email giả lập | Trạng thái (`is_active`) | Hồ sơ CTV liên kết | Nhóm quyền gán (`staff_permission_groups`) | Mục đích sử dụng trong Test |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **`FIX_ADMIN_ACTIVE`** | `admin` | `test_admin_active@test.sthc.edu.vn` | `true` | Không | Không | Phiên Admin chuẩn thực hiện các thao tác quản trị. |
| **`FIX_ADMIN_DISABLED`** | `admin` | `test_admin_disabled@test.sthc.edu.vn`| `false` | Không | Không | Kiểm tra Admin bị khóa không thể gọi API. |
| **`FIX_STAFF_NO_GROUPS`** | `staff` | `test_staff_nogroups@test.sthc.edu.vn`| `true` | `STHCTEST001` (`PENDING_REVIEW`) | `0` nhóm | Kiểm tra Staff chỉ có quyền nền, hiển thị *"Chưa gán nhóm quyền"*. |
| **`FIX_STAFF_WITH_REWARD`**| `staff` | `test_staff_reward@test.sthc.edu.vn` | `true` | `STHCTEST002` (`ACTIVE`) | `reward_manager` (`is_active: true`) | Kiểm tra Staff có quyền chuyên biệt Thù lao A5. |
| **`FIX_STAFF_MULTI_GROUPS`**| `staff` | `test_staff_multi@test.sthc.edu.vn` | `true` | `STHCTEST003` (`ACTIVE`) | `reward_viewer`, `reward_manager` (`is_active: true`) | Kiểm tra hiển thị nhiều nhóm quyền trùng/bao hàm. |
| **`FIX_STAFF_DISABLED`** | `staff` | `test_staff_disabled@test.sthc.edu.vn`| `false` | `STHCTEST004` (`ACTIVE`) | `reward_manager` (`is_active: true`) | Kiểm tra tài khoản bị khóa nhưng còn nhóm quyền trong DB. |
| **`FIX_CTV_VERIFIED`** | `affiliate` | `test_ctv_verified@test.sthc.edu.vn` | `true` | `STHCTEST005` (`ACTIVE`), email confirmed | Không | Thử nghiệm nâng CTV lên Staff hợp lệ. |
| **`FIX_CTV_UNVERIFIED`** | `affiliate` | `test_ctv_unverified@test.sthc.edu.vn` | `true` | `STHCTEST006` (`PENDING_REVIEW`), email unconfirmed | Không | Thử nghiệm chặn nâng Staff khi email chưa xác thực. |

### 2.2. Quy tắc dọn dẹp sau kiểm thử (Teardown Rules)
- Mọi kịch bản test có tạo hoặc thay đổi dữ liệu fixture bắt buộc phải bọc trong khối `afterAll` hoặc khối dọn dẹp:
  1. Xóa các bản ghi liên quan trong `public.staff_permission_groups` theo `staff_id` có tiền tố `@test.sthc.edu.vn`.
  2. Xóa bản ghi trong `public.affiliate_profiles` có mã bắt đầu bằng `STHCTEST`.
  3. Xóa các bản ghi trong `public.audit_logs` phát sinh từ các actor có email `@test.sthc.edu.vn`.
  4. Xóa bản ghi trong `public.profiles` và xóa tài khoản trong Supabase Auth (`supabase.auth.admin.deleteUser(userId)`).
- Không để lại rác dữ liệu làm sai lệch kết quả phân trang hoặc đếm tổng số bản ghi của hệ thống.

---

## 3. Ma Trận Phân Quyền Theo Vai Trò (Access Matrix)

| Khu vực / Thao tác kỹ thuật | Admin đang hoạt động | Staff đang hoạt động | CTV (`affiliate`) | Khách (`public`) | Tài khoản bị khóa (`is_active = false`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Menu Sidebar `/admin/staff-accounts`** | Hiển thị (Active) | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn | Ẩn hoàn toàn |
| **Truy cập Route `/admin/staff-accounts`** | Cho phép | Chặn (Về `/admin`) | Chặn (Về `/portal`) | Chặn (Về `/login`) | Chặn (Về `/pending` hoặc AccessNotice) |
| **`GET /api/v1/admin/staff-accounts`** | HTTP 200 OK | HTTP 403 `ADMIN_ONLY` | HTTP 403 `ROLE_FORBIDDEN` | HTTP 401 `UNAUTHENTICATED` | HTTP 403 `ACCOUNT_DISABLED` |
| **`PATCH .../staff-accounts/:id/active-status`**| HTTP 200 OK | HTTP 403 `ADMIN_ONLY` | HTTP 403 `ROLE_FORBIDDEN` | HTTP 401 `UNAUTHENTICATED` | HTTP 403 `ACCOUNT_DISABLED` |
| **`PATCH .../affiliates/:id/system-role`** | HTTP 200 OK | HTTP 403 `ADMIN_ONLY` | HTTP 403 `ROLE_FORBIDDEN` | HTTP 401 `UNAUTHENTICATED` | HTTP 403 `ACCOUNT_DISABLED` |
| **`POST .../staff-permissions/assign`** | HTTP 200 OK | HTTP 403 `ADMIN_ONLY` | HTTP 403 `ROLE_FORBIDDEN` | HTTP 401 `UNAUTHENTICATED` | HTTP 403 `ACCOUNT_DISABLED` |
| **`GET /api/v1/admin/audit-logs`** | HTTP 200 OK | HTTP 403 `ADMIN_ONLY` | HTTP 403 `ROLE_FORBIDDEN` | HTTP 401 `UNAUTHENTICATED` | HTTP 403 `ACCOUNT_DISABLED` |

---

## 4. Danh Sách Ca Kiểm Thử Chi Tiết Theo Các Nhóm A – H

### Nhóm A: Truy cập và phân quyền (Access Control & Security)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-AUTH-01** | A | Admin truy cập hợp lệ danh sách nhân viên | Đăng nhập bằng `FIX_ADMIN_ACTIVE` | 1. Bấm mục “Tài khoản nhân viên” trên Sidebar.<br>2. Gửi request `GET /api/v1/admin/staff-accounts`. | - Sidebar chuyển active.<br>- Màn hình tải danh sách thành công.<br>- API trả về HTTP 200 OK kèm danh sách Staff. | - Screenshot UI.<br>- Response JSON HTTP 200. | Thủ công / Tích hợp | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-AUTH-02** | A | Ẩn menu Sidebar và chặn Staff truy cập route | Đăng nhập bằng `FIX_STAFF_NO_GROUPS` | 1. Quan sát thanh Sidebar.<br>2. Gõ trực tiếp URL `/admin/staff-accounts` trên trình duyệt. | - Không có mục “Tài khoản nhân viên” trên Sidebar.<br>- Route Guard chặn truy cập, chuyển hướng về `/admin` kèm notice cấm quyền. | - Screenshot Sidebar không có menu.<br>- URL bị redirect về `/admin`. | Kiểm thử UI | Chờ UI & Route Guard fix |
| **TC-A7NV5-AUTH-03** | A | Chặn Staff gọi trực tiếp API danh sách Staff | Đăng nhập bằng `FIX_STAFF_NO_GROUPS` | Gửi HTTP `GET /api/v1/admin/staff-accounts` kèm Bearer Token của Staff. | API từ chối với HTTP 403, body: `{"success": false, "code": "ADMIN_ONLY"}`. | HTTP Status 403, Response JSON. | Bảo mật âm tính | Chờ API/RPC |
| **TC-A7NV5-AUTH-04** | A | Chặn CTV truy cập route và gọi API Staff | Đăng nhập bằng `FIX_CTV_VERIFIED` | 1. Gõ URL `/admin/staff-accounts`.<br>2. Gửi HTTP `GET /api/v1/admin/staff-accounts` kèm Token CTV. | - Route Guard chuyển hướng về `/portal`.<br>- API trả về HTTP 403 `ROLE_FORBIDDEN` hoặc `ADMIN_ONLY`. | URL redirect `/portal`, HTTP Status 403. | Bảo mật âm tính | Chờ API/RPC |
| **TC-A7NV5-AUTH-05** | A | Chặn người dùng chưa đăng nhập (Public) | Chưa có phiên đăng nhập | 1. Gõ URL `/admin/staff-accounts`.<br>2. Gửi HTTP `GET /api/v1/admin/staff-accounts` không có Authorization header. | - Route Guard chuyển hướng về `/login?redirect_to=%2Fadmin%2Fstaff-accounts`.<br>- API trả về HTTP 401 `UNAUTHENTICATED`. | URL redirect `/login`, HTTP Status 401. | Bảo mật âm tính | Chờ API/RPC |
| **TC-A7NV5-AUTH-06** | A | Chặn Admin bị khóa gọi API quản trị | Đăng nhập bằng `FIX_ADMIN_DISABLED` | Gửi HTTP `GET /api/v1/admin/staff-accounts` kèm Token của Admin bị khóa. | API từ chối ngay tại middleware với HTTP 403 `ACCOUNT_DISABLED`. | HTTP Status 403, error code `ACCOUNT_DISABLED`. | Bảo mật âm tính | Chờ API/RPC |
| **TC-A7NV5-AUTH-07** | A | Chống giả mạo trường `actor_id` và `role` từ Client | Đăng nhập bằng `FIX_ADMIN_ACTIVE` | Gửi request `PATCH .../active-status` kèm body: `{"actor_id": "00000000-0000-0000-0000-000000000000", "role": "admin"}`. | - Backend bỏ qua hoàn toàn `actor_id` và `role` trong body.<br>- `actor_id` trong Audit Log ghi nhận đúng ID của `FIX_ADMIN_ACTIVE`. | Bản ghi trong `audit_logs` có `actor_id = FIX_ADMIN_ACTIVE.id`. | Bảo mật âm tính | Chờ API/RPC |
| **TC-A7NV5-AUTH-08** | A | Kiểm tra RLS chặn Client thường sửa `profiles.role` | Đăng nhập client PostgREST bằng `FIX_STAFF_NO_GROUPS` | Thực thi lệnh update trực tiếp: `supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)`. | PostgreSQL kích hoạt trigger `trg_prevent_profile_escalation`, trả về lỗi mã `42501` (Quyền bị từ chối). | Mã lỗi PostgreSQL `42501`. | Kiểm thử tự động DB | Có thể chạy hiện tại |

---

### Nhóm B: Danh sách và dữ liệu hiển thị (List & Data Formatting)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-LIST-01** | B | Danh sách chỉ chứa tài khoản có role Staff | Database có cả Admin, Staff, CTV | Gọi `GET /api/v1/admin/staff-accounts` | - 100% bản ghi trong mảng `data` có `role === 'staff'`.<br>- Không lẫn tài khoản Admin hay CTV thuần túy. | Mảng JSON trả về kiểm tra thuộc tính `role`. | Tích hợp DB | Chờ API/RPC |
| **TC-A7NV5-LIST-02** | B | Ghép đúng hồ sơ CTV qua `user_id` (Không ghép qua email) | Fixture Staff có hồ sơ CTV và Staff không có hồ sơ CTV | Gọi `GET /api/v1/admin/staff-accounts` | - `FIX_STAFF_NO_GROUPS` có `affiliate.affiliate_code = 'STHCTEST001'`.<br>- Staff không có hồ sơ CTV trả về `affiliate = null` (UI hiển thị `—`). | Khớp nối chính xác `affiliate_profiles.user_id = profiles.id`. | Tích hợp DB | Chờ API/RPC |
| **TC-A7NV5-LIST-03** | B | Tìm kiếm theo họ tên, email, SĐT, mã CTV | Bảng danh sách có từ 5 Staff trở lên | Nhập lần lượt vào ô tìm kiếm: Họ tên, Email, SĐT, Mã CTV của `FIX_STAFF_NO_GROUPS`. | Bảng dữ liệu lọc tức thì và chỉ hiển thị đúng dòng của nhân viên tương ứng. | Số lượng dòng hiển thị = 1, khớp thông tin. | Giao diện UI | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-LIST-04** | B | Lọc theo trạng thái tài khoản (`active` / `disabled`) | Database có Staff hoạt động và Staff bị khóa | Chọn bộ lọc: `Đang hoạt động`, sau đó chọn `Đã vô hiệu hóa`. | - Khi chọn `Đang hoạt động`: chỉ hiển thị Staff có `is_active = true`.<br>- Khi chọn `Đã vô hiệu hóa`: chỉ hiển thị Staff có `is_active = false`. | Trạng thái badge trên bảng khớp với bộ lọc. | Giao diện UI | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-LIST-05** | B | Lọc theo nhóm quyền chuyên biệt | Database có Staff không nhóm và Staff có nhóm A5 | Chọn bộ lọc: `Chưa gán nhóm quyền`, sau đó chọn `Phụ trách thù lao CTV`. | - Lọc `Chưa gán nhóm quyền`: chỉ ra các Staff không có nhóm active.<br>- Lọc `Phụ trách thù lao CTV`: chỉ ra Staff có nhóm `reward_manager`. | Danh sách nhân viên hiển thị đúng nhóm gán. | Giao diện UI | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-LIST-06** | B | Phân trang phía máy chủ và bảo lưu bộ lọc | Tổng số Staff > 10 bản ghi | Chuyển sang Trang 2, mở xem chi tiết một nhân viên, sau đó bấm nút Back của trình duyệt. | - Bảng hiển thị đúng bản ghi trang 2.<br>- Khi Back quay lại, vẫn giữ nguyên Trang 2 và các từ khóa tìm kiếm trước đó. | URL query parameters hoặc state giữ nguyên. | Giao diện UI | Chờ UI |
| **TC-A7NV5-LIST-07** | B | Nhóm quyền đã thu hồi không hiển thị ở cột nhóm active | Nhân viên có nhóm với `is_active = false` | Xem cột Nhóm quyền của nhân viên này trên bảng danh sách. | Nhóm đã thu hồi KHÔNG xuất hiện trong cột nhóm quyền. Hiển thị `Chưa gán nhóm quyền` (nếu không còn nhóm nào khác). | Badge nhóm không xuất hiện trên UI. | Giao diện UI | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-LIST-08** | B | Định dạng đăng nhập gần nhất chuẩn giờ Việt Nam | Supabase Auth có mốc `last_sign_in_at` | Quan sát cột Đăng nhập gần nhất trên bảng. | - Định dạng chuẩn `HH:mm, DD/MM/YYYY` (Asia/Ho_Chi_Minh).<br>- Nếu null, hiển thị đúng chữ nghiêng `Chưa đăng nhập`. | Khớp giờ múi giờ VN (UTC+7). | Giao diện UI | Chờ API/RPC & Chờ UI |
| **TC-A7NV5-LIST-09** | B | Bảo vệ an toàn dữ liệu nhạy cảm của Supabase Auth | Gọi API `GET /api/v1/admin/staff-accounts` | Kiểm tra toàn bộ payload JSON trả về từ backend. | TUYỆT ĐỐI KHÔNG chứa: `encrypted_password`, `raw_app_meta_data`, `tokens`, CCCD, STK ngân hàng. | Snapshot response JSON sạch sẽ. | Bảo mật | Chờ API/RPC |

---

### Nhóm C: Chi tiết và diễn giải quyền (Permission Interpretation)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-DISP-01** | C | Tách bạch rõ Khối quyền nền và Khối nhóm quyền | Mở modal/panel chi tiết của `FIX_STAFF_NO_GROUPS` | Quan sát bố cục panel chi tiết nhân viên. | - Panel chia thành 2 khối tách biệt: Khối A (Quyền nền Staff) và Khối B (Nhóm quyền chuyên biệt).<br>- Không dùng chung 1 nhãn gộp. | Bố cục Panel trực quan, 2 card riêng. | Giao diện UI | Chờ UI |
| **TC-A7NV5-DISP-02** | C | Xác minh Staff không nhóm vẫn hiển thị đủ quyền nền | Mở chi tiết `FIX_STAFF_NO_GROUPS` (`fn_get_user_permissions` trả về 0 dòng) | Kiểm tra Khối A và Khối B. | - Khối A: Hiển thị đầy đủ 5 phân hệ tuyển sinh (A1, A2, A3, A4, A9).<br>- Khối B: Hiển thị thông báo *"Chưa gán nhóm quyền chuyên biệt"*. | Không có cảnh báo lỗi "Không có quyền". | Giao diện UI | Chờ UI |
| **TC-A7NV5-DISP-03** | C | Hiển thị trung thực nhiều nhóm quyền chồng lấn | Mở chi tiết `FIX_STAFF_MULTI_GROUPS` (có cả `reward_viewer` và `reward_manager`) | Quan sát Khối B. | Hiển thị đầy đủ cả 2 nhóm quyền độc lập, không tự ý ẩn nhóm `reward_viewer`. | Hiển thị 2 card nhóm quyền riêng biệt. | Giao diện UI | Chờ UI |
| **TC-A7NV5-DISP-04** | C | Diễn giải tài khoản bị khóa nhưng còn nhóm quyền | Mở chi tiết `FIX_STAFF_DISABLED` (`is_active = false`, có `reward_manager`) | Quan sát trạng thái quyền trên giao diện. | - Cả Quyền nền và Nhóm quyền đều chuyển sang trạng thái mờ (dimmed/opacity 50%).<br>- Chú thích rõ: *"Quyền tạm thời không có hiệu lực do tài khoản đã bị khóa"*. | Chú thích cảnh báo rõ ràng trên UI. | Giao diện UI | Chờ UI |
| **TC-A7NV5-DISP-05** | C | Điều hướng chuẩn sang Quản lý phân quyền và hồ sơ CTV | Mở chi tiết Staff có hồ sơ CTV | 1. Bấm nút "Mở hồ sơ CTV".<br>2. Bấm nút "Phân quyền". | - Nút 1: Chuyển hướng chính xác tới `/admin/affiliates/:id`.<br>- Nút 2: Chuyển hướng tới `/admin/permissions` (Tab Gán quyền). | URL điều hướng đúng đích. | Giao diện UI | Chờ UI |

---

### Nhóm D: Khóa và mở khóa tài khoản Staff (Lock & Unlock)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-LOCK-01** | D | Khóa tài khoản Staff đang hoạt động thành công | `FIX_STAFF_NO_GROUPS` đang `is_active = true` | Admin gửi `PATCH .../:id/active-status` với `{"is_active": false, "reason": "Tạm nghỉ công tác 3 tháng"}`. | - API trả về HTTP 200 OK.<br>- `profiles.is_active` đổi thành `false`.<br>- Ghi 1 bản ghi `audit_logs` action `STAFF_ACCOUNT_LOCKED`. | HTTP 200, DB `is_active = false`, dòng audit log. | Tích hợp DB | Chờ API/RPC |
| **TC-A7NV5-LOCK-02** | D | Mở khóa tài khoản Staff bị khóa thành công | `FIX_STAFF_NO_GROUPS` đang `is_active = false` | Admin gửi `PATCH .../:id/active-status` với `{"is_active": true, "reason": "Nhân viên đã đi làm trở lại"}`. | - API trả về HTTP 200 OK.<br>- `profiles.is_active` đổi thành `true`.<br>- Ghi 1 bản ghi `audit_logs` action `STAFF_ACCOUNT_UNLOCKED`. | HTTP 200, DB `is_active = true`, dòng audit log. | Tích hợp DB | Chờ API/RPC |
| **TC-A7NV5-LOCK-03** | D | Từ chối lý do khóa rỗng hoặc quá ngắn | `FIX_STAFF_NO_GROUPS` đang `is_active = true` | Admin gửi request khóa với `reason: "   "` hoặc `reason: "abc"`. | API từ chối với HTTP 400 `REASON_REQUIRED` / `INVALID_INPUT` (*"Lý do phải có ít nhất 5 ký tự"*). | HTTP Status 400, không thay đổi DB. | Nghiệp vụ âm tính | Chờ API/RPC |
| **TC-A7NV5-LOCK-04** | D | Từ chối thao tác trên target không phải Staff | Target là tài khoản Admin hoặc CTV | Admin gửi request khóa tài khoản có `role = 'admin'` hoặc `role = 'affiliate'`. | API từ chối với HTTP 400 `TARGET_NOT_STAFF` (*"Chức năng này chỉ áp dụng cho tài khoản Cán bộ Tuyển sinh (Staff)"*). | HTTP Status 400, không thay đổi DB. | Nghiệp vụ âm tính | Chờ API/RPC |
| **TC-A7NV5-LOCK-05** | D | Xử lý yêu cầu trùng trạng thái (Thao tác thừa) | Staff đã ở trạng thái `is_active = false` | Admin gửi lại request khóa tài khoản đó (`is_active: false`). | API từ chối với HTTP 400 `ALREADY_IN_TARGET_STATE` (*"Tài khoản nhân viên này hiện đã ở trạng thái vô hiệu hóa"*). Không sinh log trùng. | HTTP Status 400, không sinh log thừa. | Nghiệp vụ âm tính | Chờ API/RPC |
| **TC-A7NV5-LOCK-06** | D | Hiệu lực chặn tức thì của Staff bị khóa | Vừa thực hiện khóa Staff ở TC-01 | Dùng token của Staff vừa bị khóa gửi request `GET /api/v1/admin/leads`. | Backend chặn ngay tại middleware với HTTP 403 `ACCOUNT_DISABLED`. | HTTP Status 403, error code `ACCOUNT_DISABLED`. | Bảo mật | Có thể chạy hiện tại |
| **TC-A7NV5-LOCK-07** | D | Khóa tài khoản bảo toàn 100% dữ liệu CTV và nhóm quyền | Staff có hồ sơ CTV và nhóm A5 | Kiểm tra lại database sau khi khóa Staff. | - `profiles.role` vẫn là `'staff'`.<br>- `affiliate_profiles.status` không đổi.<br>- `staff_permission_groups` giữ nguyên các dòng gán. | Query DB xác nhận dữ liệu vẹn nguyên. | Toàn vẹn dữ liệu | Chờ API/RPC |
| **TC-A7NV5-LOCK-08** | D | Vô hiệu hóa nút bấm và chống click đúp trên UI | Mở modal xác nhận Khóa tài khoản trên UI | Bấm nút xác nhận liên tục nhiều lần. | - Nút chuyển `disabled` ngay lần click đầu tiên.<br>- Chỉ có duy nhất 1 request mạng được gửi lên server. | Network Tab DevTools chỉ có 1 request. | Giao diện UI | Chờ UI |

---

### Nhóm E: Nâng và thu hồi vai trò Staff (Role Elevation & Revocation)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-ROLE-01** | E | Nâng CTV đủ điều kiện lên Staff thành công | CTV `FIX_CTV_VERIFIED` (email confirmed) | Admin gọi `PATCH /api/v1/admin/affiliates/:id/system-role` với `{ "role": "staff", "reason": "Bổ nhiệm cán bộ tuyển sinh" }`. | - `profiles.role` chuyển thành `'staff'`.<br>- Hồ sơ CTV giữ nguyên `status`.<br>- Không tự gán nhóm quyền chuyên biệt.<br>- Ghi 2 audit logs `SYSTEM_ROLE_ASSIGNED`. | HTTP 200, DB `role = 'staff'`, 2 audit logs. | Tích hợp DB | Có thể chạy hiện tại |
| **TC-A7NV5-ROLE-02** | E | Từ chối nâng CTV chưa xác thực email | CTV `FIX_CTV_UNVERIFIED` (email unconfirmed) | Admin gọi `PATCH .../system-role` với `role: 'staff'`. | API từ chối với HTTP 400 `EMAIL_NOT_VERIFIED` (*"Email tài khoản chưa được xác thực"*). Không đổi vai trò. | HTTP Status 400, role không đổi. | Nghiệp vụ âm tính | Có thể chạy hiện tại |
| **TC-A7NV5-ROLE-03** | E | Thu hồi Staff tự động vô hiệu hóa nhóm quyền | Staff `FIX_STAFF_WITH_REWARD` (đang có nhóm `reward_manager`) | Admin gọi `PATCH .../system-role` với `{ "role": "affiliate", "reason": "Chuyển công tác về CTV" }`. | - `profiles.role` chuyển thành `'affiliate'`.<br>- Bản ghi `staff_permission_groups` cập nhật `is_active = false` (không bị xóa).<br>- Ghi nhận audit `STAFF_GROUPS_DEACTIVATED_ON_REVOKE`. | DB `role = 'affiliate'`, nhóm `is_active = false`. | Tích hợp DB | Chờ nâng cấp RPC |
| **TC-A7NV5-ROLE-04** | E | Tái bổ nhiệm Staff chỉ nhận quyền nền, không hồi phục nhóm cũ | CTV vừa bị thu hồi Staff ở TC-03 | Admin thực hiện nâng lại vai trò thành Staff (`role: 'staff'`). | - `profiles.role` chuyển thành `'staff'`.<br>- Bản ghi trong `staff_permission_groups` VẪN LÀ `is_active = false`.<br>- Nhân viên chỉ có quyền nền, gọi API Thù lao bị 403. | DB `role = 'staff'`, `is_active = false` trong nhóm. | Bảo mật & Phân quyền | Chờ nâng cấp RPC |
| **TC-A7NV5-ROLE-05** | E | Từ chối đổi vai trò khi tài khoản đang bị khóa | Tài khoản Staff đang có `profiles.is_active = false` | Admin cố gắng gọi nâng/thu hồi vai trò trên tài khoản này. | RPC từ chối với lỗi `42501` hoặc HTTP 400 (*"Không thể thay đổi vai trò: Tài khoản đích hiện đang bị vô hiệu hóa"*). | HTTP Status 400 / 403. | Nghiệp vụ âm tính | Có thể chạy hiện tại |

---

### Nhóm F: Gán và thu hồi nhóm quyền (Group Permissions Management)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-GROUP-01** | F | Admin gán nhóm quyền chuyên biệt thành công | `FIX_STAFF_NO_GROUPS` đang là Staff | Admin gửi `POST /api/v1/admin/staff-permissions/assign` với `{ "staff_id": id, "group_code": "reward_manager" }`. | - Bản ghi trong `staff_permission_groups` được tạo với `is_active = true`.<br>- Staff bắt đầu truy cập được `GET /api/v1/admin/rewards`. | HTTP 200, DB có bản ghi active, Staff gọi API rewards thành công. | Tích hợp DB | Có thể chạy hiện tại |
| **TC-A7NV5-GROUP-02** | F | Admin thu hồi nhóm quyền chuyên biệt thành công | Staff vừa được gán nhóm ở TC-01 | Admin gửi `POST /api/v1/admin/staff-permissions/revoke` với `{ "staff_id": id, "group_code": "reward_manager" }`. | - Bản ghi cập nhật `is_active = false` (không bị xóa).<br>- Staff lập tức bị chặn khi gọi `GET /api/v1/admin/rewards` (HTTP 403).<br>- Quyền nền tuyển sinh (Leads, Courses) vẫn hoạt động bình thường. | DB `is_active = false`, API rewards trả 403, API leads trả 200. | Tích hợp DB | Có thể chạy hiện tại |
| **TC-A7NV5-GROUP-03** | F | Chặn gán nhóm quyền cho tài khoản không phải Staff | Target là tài khoản CTV hoặc Admin | Admin gửi request gán nhóm quyền với target là CTV thuần túy. | Hệ thống từ chối hoặc RPC `fn_get_user_permissions` không trả về quyền cho non-staff. | Không kích hoạt quyền cho non-staff. | Bảo mật | Có thể chạy hiện tại |
| **TC-A7NV5-GROUP-04** | F | Chặn Staff hoặc CTV tự gọi API gán nhóm quyền | Đăng nhập bằng `FIX_STAFF_NO_GROUPS` | Staff gửi request gán nhóm quyền cho chính mình. | API chặn ngay tại `requireAdminOnly` với HTTP 403 `ADMIN_ONLY`. | HTTP Status 403. | Bảo mật âm tính | Có thể chạy hiện tại |

---

### Nhóm G: Nhật ký kiểm toán (Audit Logs Verification)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-AUDIT-01** | G | Xác minh tính đầy đủ của bản ghi Audit Log Khóa tài khoản | Thực hiện khóa Staff thành công | Truy vấn bảng `audit_logs` theo `entity_id = staff.id` | - `action = 'STAFF_ACCOUNT_LOCKED'`.<br>- `actor_id = FIX_ADMIN_ACTIVE.id`.<br>- `old_values = {"is_active": true}`.<br>- `new_values = {"is_active": false}`.<br>- Có đầy đủ `reason`, `ip_address`, `created_at`. | Query SQL bảng `audit_logs`. | Tích hợp DB | Chờ API/RPC |
| **TC-A7NV5-AUDIT-02** | G | Xác minh `actor_id` lấy từ Token, không lấy từ Body | Thực hiện thao tác khóa Staff | Body gửi `actor_id: "fake-uuid"`, Token thuộc về `FIX_ADMIN_ACTIVE`. | `actor_id` trong bản ghi `audit_logs` bắt buộc phải là ID của `FIX_ADMIN_ACTIVE`. | Query SQL `actor_id` khớp token header. | Bảo mật | Chờ API/RPC |
| **TC-A7NV5-AUDIT-03** | G | Chặn hoàn toàn quyền sửa/xóa Audit Log từ Client | Đăng nhập bất kỳ người dùng authenticated nào | Thực thi lệnh xóa log: `supabase.from('audit_logs').delete().neq('id', '0')`. | RLS chặn hoàn toàn, trả về lỗi hoặc không có bản ghi nào bị xóa (`0 rows affected`). | Query DB xác nhận số lượng log nguyên vẹn. | Bảo mật DB | Có thể chạy hiện tại |
| **TC-A7NV5-AUDIT-04** | G | Kiểm tra không ghi dữ liệu PII/Mật khẩu vào Audit Log | Thực hiện thao tác thay đổi vai trò | Đọc toàn bộ nội dung cột `old_values`, `new_values`, `reason`. | Tuyệt đối không chứa: mật khẩu, refresh token, CCCD, số tài khoản ngân hàng. | Dữ liệu JSON sạch, đúng đặc tả. | Bảo mật | Có thể chạy hiện tại |
| **TC-A7NV5-AUDIT-05** | G | Thao tác tài khoản nhân viên không phát sinh chuông thông báo BQT | Thực hiện khóa/mở khóa Staff | Kiểm tra bảng `notifications` và `notification_recipients`. | Không có bất kỳ thông báo bell nào được tạo ra cho sự kiện này. | `notifications` count không tăng. | Nghiệp vụ | Chờ API/RPC |

---

### Nhóm H: Tính nguyên tử và tranh chấp đồng thời (Atomicity & Concurrency)

| Mã test | Nhóm | Mục tiêu kiểm thử | Tiền điều kiện | Thao tác thực hiện | Kết quả mong đợi | Bằng chứng cần lưu | Loại test | Tình trạng triển khai phụ thuộc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-A7NV5-CONCUR-01**| H | Tranh chấp đồng thời khi 2 Admin cùng khóa 1 Staff | Staff đang `is_active = true` | Hai phiên Admin cùng gửi request khóa Staff đó với độ lệch 5ms. | - Phiên 1: Xử lý thành công (HTTP 200 OK).<br>- Phiên 2: Bị từ chối với HTTP 409 `STATE_CONFLICT` hoặc HTTP 400 `ALREADY_IN_TARGET_STATE`.<br>- Chỉ có DUY NHẤT 1 bản ghi `audit_logs` được tạo. | 1 request HTTP 200, 1 request HTTP 409/400; count audit = 1. | Tranh chấp đồng thời | Chờ API/RPC |
| **TC-A7NV5-CONCUR-02**| H | Nguyên tử hóa thao tác Thu hồi Staff và Vô hiệu hóa nhóm | Staff đang có 2 nhóm quyền active | Kích hoạt kịch bản lỗi giả lập (Fault Injection) khi ghi Audit Log hoặc cập nhật nhóm quyền. | - Toàn bộ giao dịch bị ROLLBACK.<br>- `profiles.role` vẫn là `'staff'`.<br>- Các nhóm quyền trong `staff_permission_groups` vẫn là `is_active = true`. | DB giữ nguyên trạng thái cũ 100%. | Tính nguyên tử (Rollback) | Chờ nâng cấp RPC & Chờ test env |
| **TC-A7NV5-CONCUR-03**| H | Nguyên tử hóa thao tác Khóa tài khoản và Ghi log | Staff đang `is_active = true` | Kịch bản lỗi giả lập khiến lệnh INSERT `audit_logs` bị fail. | - Toàn bộ transaction bị Rollback.<br>- `profiles.is_active` vẫn giữ nguyên là `true`. | DB giữ nguyên `is_active = true`. | Tính nguyên tử (Rollback) | Chờ API/RPC & Chờ test env |

---

## 5. Bảng Đối Chiếu Khác Biệt Giữa Chính Sách Đã Chốt Và Hiện Trạng Mã Nguồn

| Tiêu chí | Chính sách đã chốt (A7-NV.1 – A7-NV.4) | Hiện trạng mã nguồn thực tế (A7-NV.0) | Mức độ chênh lệch | Đánh giá & Khả năng chạy Test |
| :--- | :--- | :--- | :---: | :--- |
| **Bảo vệ Route `/admin/staff-accounts`** | Chỉ Admin được vào; Staff và CTV bị chặn hoàn toàn. | Route guard chưa chặn Staff; Sidebar chưa có `adminOnly: true`. | **Chưa khớp** | Nhóm TC-AUTH-02 hiện tại nếu chạy sẽ FAIL; chỉ PASS sau khi fix route guard. |
| **API Khóa / Mở khóa Staff** | API `PATCH .../:id/active-status` bắt buộc lý do và ghi Audit Log. | Chưa có API hay RPC nào cho việc khóa tài khoản Staff. | **Chưa có** | Nhóm ca TC-LOCK-* chưa thể chạy được cho đến khi triển khai backend API. |
| **Vô hiệu hóa nhóm khi thu hồi Staff** | Thu hồi Staff tự động đổi `is_active = false` các nhóm quyền trong `staff_permission_groups`. | RPC `fn_update_user_system_role` hiện tại không sửa `staff_permission_groups`. | **Chưa khớp** | TC-ROLE-03 và TC-ROLE-04 sẽ FAIL nếu chạy trên RPC hiện tại; cần nâng cấp migration RPC. |
| **Lọc nhóm quyền đang active** | API danh sách Staff bắt buộc lọc `.eq('is_active', true)`. | API mẫu `GET .../staff-permissions` hiện tại không lọc `is_active = true`. | **Chưa khớp** | Cần đảm bảo API mới viết đúng câu truy vấn `.eq('is_active', true)`. |
| **Ghi Audit Log cho phân quyền A5** | Gán/thu hồi nhóm quyền A5 bắt buộc ghi `audit_logs`. | Endpoints `POST .../staff-permissions/assign` và `revoke` hiện chưa ghi log. | **Chưa có** | Cần bổ sung câu lệnh insert audit log vào 2 endpoint này. |

---

## 6. Điều Kiện Đạt / Không Đạt (PASS / FAIL) Và Tiêu Chí Nghiệm Thu Hoàn Tất

### 6.1. Tiêu chí ĐẠT (PASS Criteria)
Một ca kiểm thử được công nhận là **PASS** khi thỏa mãn đồng thời:
1. **Mã phản hồi HTTP chính xác:** Khớp 100% với kỳ vọng (HTTP 200 cho thành công; HTTP 400, 401, 403, 409 cho các trường hợp kiểm thử âm tính).
2. **Dữ liệu Database biến động chuẩn:** Cột `is_active`, `role` hoặc `staff_permission_groups` thay đổi đúng giá trị kỳ vọng.
3. **Nhật ký kiểm toán toàn vẹn:** Có đúng 1 bản ghi `audit_logs` tương ứng với mỗi thao tác mutation thành công, ghi nhận đúng `actor_id` từ phiên Admin.
4. **Không phát sinh lỗi phụ (Zero Side-effects):** Thao tác trên Staff không làm thay đổi hồ sơ CTV, leads, đối soát, thù lao hay các tài khoản khác.

### 6.2. Tiêu chí KHÔNG ĐẠT (FAIL Criteria)
Ca kiểm thử bị đánh giá là **FAIL** nếu xảy ra bất kỳ hiện tượng nào sau đây:
- Staff hoặc CTV truy cập được route `/admin/staff-accounts` hoặc gọi được API trả về HTTP 200.
- Khóa tài khoản thành công nhưng không ghi được Audit Log (hoặc ngược lại).
- Thu hồi vai trò Staff nhưng các nhóm quyền trong `staff_permission_groups` vẫn giữ nguyên `is_active = true`.
- Hai Admin cùng thao tác dẫn đến sinh 2 dòng audit log trùng lặp cho cùng một trạng thái.
- Payload trả về làm lộ mật khẩu, token hoặc thông tin nhạy cảm của Supabase Auth.

### 6.3. Tiêu chí hoàn tất nghiệm thu phân hệ A7-NV (Exit Criteria)
Phân hệ Quản lý Tài khoản nhân viên được coi là hoàn tất giai đoạn kiểm thử nghiệm thu khi:
- **100% các ca kiểm thử trong Nhóm A đến Nhóm H đều đạt trạng thái PASS**.
- Toàn bộ dữ liệu fixture test được dọn sạch hoàn toàn, cơ sở dữ liệu trở về trạng thái nguyên bản.

---

## 7. Danh Sách Các Ca Chưa Thể Chạy Được Do Chờ Triển Khai

| Mã ca kiểm thử | Tên ca kiểm thử | Lý do chưa thể chạy ngay lúc này | Thành phần kỹ thuật cần triển khai trước |
| :--- | :--- | :--- | :--- |
| **TC-A7NV5-AUTH-01** | Admin truy cập danh sách nhân viên | Giao diện hiện là Placeholder, chưa có API danh sách | API `GET .../staff-accounts` & Component UI |
| **TC-A7NV5-AUTH-02** | Ẩn menu Sidebar và chặn Staff truy cập route | Chưa thêm `adminOnly: true` và chưa sửa Route Guard | `navConfig.ts` & `navigationGuard.ts` |
| **TC-A7NV5-AUTH-03** | Chặn Staff gọi trực tiếp API danh sách Staff | Endpoint API chưa được tạo | Endpoint `GET .../staff-accounts` |
| **TC-A7NV5-AUTH-04** | Chặn CTV gọi API danh sách Staff | Endpoint API chưa được tạo | Endpoint `GET .../staff-accounts` |
| **TC-A7NV5-AUTH-05** | Chặn Public gọi API danh sách Staff | Endpoint API chưa được tạo | Endpoint `GET .../staff-accounts` |
| **TC-A7NV5-AUTH-06** | Chặn Admin bị khóa gọi API danh sách Staff | Endpoint API chưa được tạo | Endpoint `GET .../staff-accounts` |
| **TC-A7NV5-AUTH-07** | Chống giả mạo `actor_id` từ client | Endpoint cập nhật `active-status` chưa được tạo | Endpoint `PATCH .../active-status` |
| **TC-A7NV5-LIST-01 → 09**| Toàn bộ 9 ca kiểm thử Danh sách & Format | Endpoint danh sách chưa được tạo | Endpoint `GET .../staff-accounts` & Component UI |
| **TC-A7NV5-DISP-01 → 05**| Toàn bộ 5 ca kiểm thử Chi tiết & Diễn giải | Panel chi tiết chưa được xây dựng | Component UI Panel Chi tiết |
| **TC-A7NV5-LOCK-01 → 08**| Toàn bộ 8 ca kiểm thử Khóa & Mở khóa Staff | Endpoint & RPC cập nhật `is_active` chưa được tạo | RPC & API `PATCH .../active-status` |
| **TC-A7NV5-ROLE-03** | Thu hồi Staff tự động vô hiệu hóa nhóm quyền | RPC `fn_update_user_system_role` chưa nâng cấp | Migration nâng cấp RPC |
| **TC-A7NV5-ROLE-04** | Tái bổ nhiệm Staff chỉ nhận quyền nền | RPC `fn_update_user_system_role` chưa nâng cấp | Migration nâng cấp RPC |
| **TC-A7NV5-AUDIT-01, 02** | Kiểm tra Audit Log của thao tác khóa/mở khóa | Chức năng khóa chưa được triển khai | Endpoint `PATCH .../active-status` |
| **TC-A7NV5-CONCUR-01 → 03**| Toàn bộ ca kiểm thử Tranh chấp & Rollback | Chức năng khóa và nâng cấp RPC chưa triển khai | API khóa, Migration RPC & Test Harness |

---

## 8. Kết Luận

Tài liệu **A7-NV.5** đã hoàn tất việc xây dựng toàn bộ kế hoạch kiểm thử và ma trận ca nghiệm thu với **37 ca kiểm thử chuẩn hóa** trải dài trên 8 nhóm trọng yếu (A đến H):
1. **Rõ ràng và khả thi:** Từng ca kiểm thử đều xác định rõ mã test, mục tiêu, tiền điều kiện, thao tác, kết quả mong đợi định lượng và tình trạng phụ thuộc.
2. **Bảo toàn dữ liệu thật:** Quy định nghiêm ngặt việc sử dụng các fixture test giả lập (`@test.sthc.edu.vn`), không đụng chạm dữ liệu nhân sự và quản trị thật trong cơ sở dữ liệu.
3. **Phân định minh bạch:** Xác định chính xác 11 ca có thể chạy ngay dựa trên source hiện có và 26 ca chờ triển khai mã nguồn ở các bước tiếp theo.

Tài liệu này chính thức khép lại toàn bộ chuỗi **6 văn bản quy hoạch và đặc tả nền tảng của giai đoạn A7-NV** (`A7-NV.0` đến `A7-NV.5`). Hệ thống đã sẵn sàng 100% về mặt yêu cầu, kiến trúc, giao diện, bảo mật và tiêu chuẩn nghiệm thu để bước vào giai đoạn lập trình chức năng thực tế.
