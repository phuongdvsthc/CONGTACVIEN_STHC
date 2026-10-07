# PQ.1–PQ.3 – Báo cáo Kiểm kê, Chốt quyền và Xây dựng Nền tảng Phân quyền A5 (STHC_CTV)

- **Mã định danh bước:** PQ.1–PQ.3
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm thực hiện:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT TRIỂN KHAI NỀN TẢNG PHÂN QUYỀN

---

## 1. Kết quả Kiểm kê (PQ.1)

### 1.1. Bảng rà soát các điểm truy cập và kiểm quyền A5

| Điểm truy cập / API / RPC | Quyền hiện tại trước PQ | Quyền cần áp dụng (PQ.2) | Tệp / Hàm triển khai | Trạng thái bảo vệ sau PQ.3 |
| :--- | :--- | :--- | :--- | :--- |
| **Giao diện tab `/admin/rewards`** | Kiểm tra role `staff` hoặc `admin` (`requireStaffOrAdmin`) | `rewards.view` | `AdminPortal.tsx`, `server.ts` | **Đã bảo vệ** (Kiểm tra quyền `rewards.view`) |
| **`GET /api/v1/admin/rewards`** | `requireStaffOrAdmin` | `rewards.view` | `server.ts` (dòng 8383) | **Đã bảo vệ** (Kiểm tra quyền `rewards.view`) |
| **`POST /api/v1/admin/rewards/:id/approve`** | `requireAdminOnly` | `rewards.approve` | `server.ts` (dòng 8426) | **Đã bảo vệ** (Kiểm tra quyền `rewards.approve`) |
| **`POST /api/v1/admin/rewards/:id/reject`** | `requireAdminOnly` | `rewards.reject` | `server.ts` (dòng 8462) | **Đã bảo vệ** (Kiểm tra quyền `rewards.reject`) |
| **`GET /api/v1/admin/reports/rewards-export`** | `requireAdminOnly` | `rewards.export` | `server.ts` (dòng 8559) | **Đã bảo vệ** (Kiểm tra quyền `rewards.export`) |
| **RPC `fn_approve_reward`** | Gọi qua service_role | Thực thi qua RPC bảo mật | `20260929000004_atomic_operations.sql` | **Đã bảo vệ** (Được gọi sau khi backend kiểm tra quyền `rewards.approve`) |
| **RPC `fn_reject_reward`** | Gọi qua service_role | Thực thi qua RPC bảo mật | `20260929000004_atomic_operations.sql` | **Đã bảo vệ** (Được gọi sau khi backend kiểm tra quyền `rewards.reject`) |
| **Chi tiết lead (`GET /api/v1/admin/leads/:id`)** | `requireStaffOrAdmin` | Lọc dữ liệu `rewards` theo `rewards.view_detail` | `server.ts` (dòng 7199) | **Đã bảo vệ** (Ẩn thông tin thù lao nếu thiếu `rewards.view_detail`) |

### 1.2. Xác minh các điểm quan trọng
- **Tách biệt client:** Backend sử dụng `supabase` (service_role key) để thực hiện các thao tác quản trị nhưng **luôn kiểm tra danh tính xác thực** từ Bearer token và **kiểm tra quyền hệ thống** (`fn_get_user_permissions`) trước khi cho phép thực thi.
- **Danh tính người thao tác:** Lấy từ bảng `profiles` thông qua xác thực token hợp lệ, tuyệt đối không tin danh tính hoặc quyền do phía client gửi lên.
- **Loại bỏ fallback không an toàn:** Đã loại bỏ các đoạn code fallback tự động cập nhật trực tiếp bảng `rewards` khi RPC thất bại trong các route duyệt/từ chối, đảm bảo tuân thủ nguyên tắc nguyên tử và kiểm quyền nghiêm ngặt của cơ sở dữ liệu.

---

## 2. Danh mục, Ma trận và Phụ thuộc Quyền (PQ.2)

### 2.1. Danh mục 7 quyền A5
1. `rewards.view`: Xem danh sách thù lao.
2. `rewards.view_detail`: Xem chi tiết và căn cứ khoản thù lao.
3. `rewards.approve`: Duyệt khoản thù lao (`APPROVED`).
4. `rewards.reject`: Từ chối khoản thù lao (`REJECTED`).
5. `rewards.void`: Hủy trực tiếp khoản thù lao tại A5.
6. `rewards.summary`: Xem tổng hợp thù lao.
7. `rewards.export`: Xuất báo cáo thù lao cho kế toán.

### 2.2. Ma trận Nhóm quyền (Permission Groups)
- **Nhóm “Phụ trách thù lao CTV” (`reward_manager`):** Gồm toàn bộ 7 quyền (phạm vi toàn hệ thống cho staff được giao phụ trách).
- **Nhóm “Xem thù lao CTV” (`reward_viewer`):** Gồm `rewards.view` và `rewards.view_detail`.
- **Admin:** Mặc định có toàn bộ 7 quyền hệ thống A5 mà không cần gán nhóm.
- **CTV / Public:** Không có bất kỳ quyền A5 nào.

### 2.3. Quy tắc Phụ thuộc Quyền
- `rewards.view_detail`, `rewards.summary`, `rewards.export` yêu cầu phải có `rewards.view`.
- `rewards.approve`, `rewards.reject`, `rewards.void` yêu cầu phải có `rewards.view` và `rewards.view_detail`.
- **Cơ chế Hủy đối chiếu A4:** Việc hủy đối chiếu tại A4 tiếp tục sử dụng quyền A4 hiện hành của Admin/Staff. Khi hủy đối chiếu hợp lệ, khoản thù lao liên quan sẽ tự động chuyển sang `VOIDED` trong cùng một transaction nguyên tử, **ngay cả khi staff đó không có quyền `rewards.void` ở A5**. Điều này bảo đảm tính đồng bộ nghiệp vụ đối chiếu mà không làm rò rỉ quyền quản lý thù lao.

---

## 3. Nền tảng Dữ liệu Phân quyền & Cơ chế Kiểm quyền (PQ.3)

### 3.1. Cấu trúc Schema (Migration `20261006000001_a5_permissions_foundation.sql`)
- Tạo bảng `public.permissions`, `public.permission_groups`, `public.permission_group_items`, `public.staff_permission_groups`.
- Tạo các hàm RPC trợ giúp:
  - `public.fn_get_user_permissions(p_user_id UUID)`: Trả về danh sách quyền hiệu lực của user (Admin có tất cả, Staff lấy từ các nhóm đang active).
  - `public.fn_has_permission(p_user_id UUID, p_perm TEXT)`: Kiểm tra user có sở hữu quyền cụ thể hay không.
- Bật RLS và cấu hình quyền truy cập an toàn.

### 3.2. Middleware Kiểm quyền Backend (`requirePermission`)
Trong `server.ts`, middleware `requirePermission(permissionCode)` được bổ sung để:
1. Xác thực danh tính qua Bearer token (401 nếu chưa đăng nhập hoặc token hết hạn).
2. Kiểm tra trạng thái tài khoản active (`is_active = true`).
3. Truy vấn cơ sở dữ liệu (`fn_has_permission`) để kiểm tra quyền hiệu lực. Trả về HTTP 403 (`PERMISSION_DENIED`) nếu thiếu quyền.
4. Gắn danh sách quyền hiệu lực vào `req.user.permissions` để frontend dễ dàng sử dụng.

---

## 4. Hướng dẫn Gán nhóm Quyền cho Staff (Dành cho Admin)
Trong khi chưa có giao diện quản lý phân quyền (PQ.4–PQ.5), Admin có thể gán nhóm quyền cho nhân viên trực tiếp bằng câu lệnh SQL thông qua Supabase SQL Editor:

```sql
-- Gán nhóm "Phụ trách thù lao CTV" (toàn quyền) cho một nhân viên Staff
INSERT INTO public.staff_permission_groups (staff_id, group_code, is_active, assigned_by)
VALUES ('<ID_CUA_STAFF>', 'reward_manager', TRUE, '<ID_CUA_ADMIN>')
ON CONFLICT (staff_id, group_code) 
DO UPDATE SET is_active = TRUE;

-- Gán nhóm "Xem thù lao CTV" cho staff xem báo cáo
INSERT INTO public.staff_permission_groups (staff_id, group_code, is_active, assigned_by)
VALUES ('<ID_CUA_STAFF>', 'reward_viewer', TRUE, '<ID_CUA_ADMIN>')
ON CONFLICT (staff_id, group_code) 
DO UPDATE SET is_active = TRUE;

-- Thu hồi nhóm quyền (vô hiệu hóa)
UPDATE public.staff_permission_groups
SET is_active = FALSE
WHERE staff_id = '<ID_CUA_STAFF>' AND group_code = 'reward_manager';
```

---

## 5. Kết quả Kiểm thử Ca (Test Cases Summary)
1. **Chưa đăng nhập → 401:** Đã xác thực thành công qua middleware.
2. **Admin → Toàn quyền A5:** Admin tự động sở hữu 7 quyền.
3. **Staff chưa gán nhóm → Bị chặn A5:** Trả về 403 `PERMISSION_DENIED`.
4. **Staff nhóm `reward_viewer` → Xem được nhưng không duyệt/từ chối:** Thành công xem danh sách, bị chặn 403 khi gọi API duyệt/từ chối.
5. **Staff nhóm `reward_manager` → Toàn quyền A5:** Thực hiện thành công xem, duyệt, từ chối, xuất báo cáo.
6. **Nhiều nhóm → Hợp quyền chính xác:** Không phát sinh quyền ngoài nhóm.
7. **Thu hồi nhóm → Chặn ở request tiếp theo:** Hiệu lực ngay lập tức không cần đăng nhập lại.
8. **Giả mạo actor ID / Role → Bị chặn:** Danh tính được xác thực từ DB profiles, client không thể thao túng.
9. **RPC thiếu quyền / Lỗi → Không chạy fallback ghi bảng:** Đã loại bỏ fallback không an toàn.
10. **CTV → Bị chặn API quản trị A5:** Chỉ truy cập được dữ liệu CTV của chính mình.
11. **Hủy đối chiếu A4 → Đồng bộ nguyên tử:** Staff hủy đối chiếu được phép cập nhật thù lao sang `VOIDED` theo quy tắc A4.
12. **Dashboard CTV và các module A3/A4 khác:** Hoạt động ổn định, không bị ảnh hưởng.
