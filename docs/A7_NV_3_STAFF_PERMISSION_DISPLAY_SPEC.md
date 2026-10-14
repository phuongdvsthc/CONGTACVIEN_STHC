# ĐẶC TẢ QUY TẮC HIỂN THỊ PHÂN QUYỀN TRÊN MÀN HÌNH TÀI KHOẢN NHÂN VIÊN (A7-NV.3)

- **Mã tài liệu:** `A7-NV.3`
- **Tên tài liệu:** Quy tắc hiển thị phân quyền Staff (Quyền nền và Nhóm quyền chuyên biệt) trong bảng danh sách và chi tiết màn hình `/admin/staff-accounts`
- **Phân hệ đối ứng:** Quản lý Tài khoản nhân viên (`/admin/staff-accounts`)
- **Tài liệu căn cứ:** 
  - `docs/A7_NV_0_STAFF_ACCOUNTS_AUDIT_REPORT.md` (Kiểm kê source code và database)
  - `docs/A7_NV_1_STAFF_ACCOUNTS_SCOPE_SPEC.md` (Đặc tả phạm vi màn hình)
  - `docs/A7_NV_2_STAFF_DEFAULT_PERMISSIONS_SPEC.md` (Chính sách phân quyền mặc định và vòng đời Staff)
- **Thời điểm lập:** 14/10/2026
- **Trạng thái:** **CHỐT ĐẶC TẢ GIAO DIỆN VÀ DIỄN GIẢI DỮ LIỆU (SPECIFICATION ONLY)**. Chưa sửa đổi mã nguồn hoặc database.

---

## 1. Quy Tắc Hiển Thị Quyền Nền Và Nhóm Quyền Riêng Biệt

### 1.1. Nguyên tắc cốt lõi: Không gộp chung hai loại quyền
Hệ thống tuyệt đối **không gộp quyền nền tảng theo vai trò (`profiles.role = 'staff'`) và nhóm quyền chuyên biệt (`staff_permission_groups`) thành một nhãn duy nhất**.

- **Lý do kỹ thuật và nghiệp vụ:**
  - **Quyền nền Staff** phát sinh tự động từ vai trò hệ thống, cho phép cán bộ tuyển sinh thao tác trên 5 module cốt lõi (CTV, Khóa học, Leads, Đối soát, Dashboard). Quyền nền **không tồn tại dưới dạng bản ghi trong bảng `staff_permission_groups`**.
  - **Quyền chuyên biệt** là các đặc quyền tài chính (Thù lao 500k A5) và phát ngôn (Thông báo BQT C3), chỉ được cấp khi Admin gán nhóm quyền cụ thể.
  - Hàm RPC `fn_get_user_permissions(UUID)` **chỉ trả về các mã quyền chuyên biệt** được ánh xạ qua các nhóm đang hoạt động trong `staff_permission_groups`. Nếu một Staff chưa được gán nhóm nào, `fn_get_user_permissions` trả về tập hợp rỗng (`0` dòng). Do đó, **tuyệt đối không dùng kết quả của `fn_get_user_permissions` để đại diện cho toàn bộ quyền của Staff**, vì sẽ gây hiểu lầm nghiêm trọng rằng nhân viên đó "hoàn toàn không có quyền gì".

### 1.2. Phân định cột hiển thị trên bảng danh sách
Trên bảng danh sách `/admin/staff-accounts`, phân quyền được tổ chức thành 2 thông tin tách bạch rõ ràng:

1. **Cột Trạng thái & Quyền nền (hoặc gộp trong cột Trạng thái tài khoản):**
   - Thể hiện tài khoản có đang nắm giữ **Quyền nền Staff** hợp lệ hay không.
   - Nhãn hiển thị: Badge màu xanh lục `Quyền nền Staff` (khi `is_active = true`) hoặc Badge màu đỏ xám `Tài khoản đã khóa` (khi `is_active = false`).
2. **Cột Nhóm quyền chuyên biệt (`Nhóm quyền gán`):**
   - Thể hiện các nhóm quyền bổ sung mà nhân viên được Admin giao phó (như *"Phụ trách thù lao CTV"*, *"Quản lý thông báo"*).
   - Nếu chưa gán nhóm: Hiển thị nhãn trung tính `Chưa gán nhóm quyền` kèm tooltip giải thích *"Tài khoản vẫn có đầy đủ quyền nền Staff"*.

---

## 2. Bảng Ánh Xạ Dữ Liệu Hiển Thị Trong Danh Sách Và Chi Tiết

| Vị trí giao diện | Trường dữ liệu Backend | Nguồn dữ liệu | Điều kiện đánh giá | Nhãn hiển thị (UI Label) | Màu sắc & Kiểu dáng | Chú thích / Tooltip khi rê chuột |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Bảng danh sách** (Cột Trạng thái) | `profiles.is_active` | `public.profiles` | `is_active = TRUE` | `Đang hoạt động` | Badge xanh lá (`bg-emerald-50 text-emerald-700 border-emerald-200`) | Tài khoản đang có hiệu lực truy cập Cổng Quản trị. |
| | | | `is_active = FALSE` | `Đã vô hiệu hóa` | Badge đỏ (`bg-rose-50 text-rose-700 border-rose-200`) | Tài khoản bị khóa, toàn bộ quyền tạm thời ngưng hiệu lực. |
| **Bảng danh sách** (Cột Quyền nền) | `profiles.role` + `is_active` | `public.profiles` | `role = 'staff'` AND `is_active = TRUE` | `Quyền nền Staff` | Badge chàm xanh (`bg-indigo-50 text-indigo-700 border-indigo-200`) | Sở hữu quyền tuyển sinh cốt lõi (Khóa học, Leads, Đối soát, CTV, Dashboard). |
| | | | `role = 'staff'` AND `is_active = FALSE` | `Vô hiệu lực (Đã khóa)` | Text xám nhạt kèm icon gạch chéo | Quyền nền tạm ngưng do tài khoản bị vô hiệu hóa. |
| **Bảng danh sách** (Cột Nhóm quyền) | `permission_groups.name` | `staff_permission_groups` JOIN `permission_groups` | Có nhóm gán với `is_active = TRUE` | Tên tiếng Việt: *Phụ trách thù lao CTV*, *Xem thù lao CTV*, *Quản lý thông báo* | Badge tím nhạt (`bg-purple-50 text-purple-700 border-purple-200`) | Quyền chuyên biệt A5 / C3 do Admin cấp. |
| | | | Không có nhóm nào có `is_active = TRUE` | `Chưa gán nhóm quyền` | Text xám nhạt (`text-slate-400 italic font-normal`) | Nhân viên chỉ có quyền nền tuyển sinh, chưa được cấp quyền thù lao hoặc thông báo. |
| | | | Có từ 3 nhóm trở lên | `[Tên nhóm 1] [Tên nhóm 2] [+N]` | Badge tím nhạt + Badge tròn xám `+N` | Bấm hoặc rê chuột để xem toàn bộ danh sách nhóm gán. |
| **Bảng danh sách** (Cột Đăng nhập) | `last_sign_in_at` | Supabase Auth (`auth.users`) | Có giá trị TIMESTAMPTZ | `HH:mm, DD/MM/YYYY` | Font mono, text-slate-700 | Giờ Việt Nam (UTC+07:00), định dạng qua helper `formatDateTimeShortVi`. |
| | | | Giá trị `null` hoặc rỗng | `Chưa đăng nhập` | Text xám nhạt (`text-slate-400 italic`) | Tài khoản chưa từng đăng nhập hệ thống lần nào. |
| **Panel Chi tiết** (Khối A: Quyền nền) | `profiles.role` | `public.profiles` | `role = 'staff'` | Danh sách 5 khối quyền nền tuyển sinh (A1, A2, A3, A4, A9) | Thẻ card trắng viền xanh, icon trực quan từng phân hệ | Quyền mặc định phát sinh từ vai trò Staff. Không thể thu hồi riêng lẻ. |
| **Panel Chi tiết** (Khối B: Nhóm quyền) | `staff_permission_groups` | `staff_permission_groups` JOIN `permissions` | Liệt kê từng nhóm gán và danh sách mã quyền tương ứng | Card nhóm quyền kèm danh sách badge quyền chi tiết | Viền tím nhạt, hiển thị người gán và ngày gán | Quản lý và thay đổi tại phân hệ Quản trị phân quyền (/admin/permissions). |

---

## 3. Quy Tắc Cho Các Tình Trạng Tài Khoản Cụ Thể

### 3.1. Tài khoản Staff đang hoạt động (`is_active = true`)
- **Quyền nền:** Hiển thị biểu tượng khiên xanh `Quyền nền Staff`. Tài khoản có đầy đủ quyền thao tác trên 5 phân hệ tuyển sinh cốt lõi.
- **Nhóm quyền chuyên biệt:**
  - Hiển thị đầy đủ tên tiếng Việt của các nhóm có `staff_permission_groups.is_active = true`.
  - Nếu có 1 nhóm: Hiển thị 1 badge (vd: `Phụ trách thù lao CTV`).
  - Nếu có 2 nhóm: Hiển thị 2 badge (vd: `Xem thù lao CTV`, `Phụ trách thù lao CTV`).
  - Nếu có 3 nhóm trở lên: Hiển thị 2 badge đầu tiên kèm badge phụ `+N` (vd: `+1 nhóm`). Rê chuột vào badge `+N` sẽ mở tooltip danh sách đầy đủ.
  - Nếu không có nhóm: Hiển thị `Chưa gán nhóm quyền` (màu xám nhạt, font nghiêng).

### 3.2. Tài khoản Staff đã bị khóa (`is_active = false`)
- **Nguyên tắc phân định rạch ròi:** Khóa tài khoản là trạng thái ở cấp độ người dùng (`public.profiles.is_active = false`). Thao tác này **không xóa và không tự đổi trạng thái của bản ghi nhóm quyền trong `staff_permission_groups`**.
- **Cách hiển thị:**
  - Cột Trạng thái hiển thị badge đỏ: `Đã vô hiệu hóa`.
  - Cột Quyền nền hiển thị nhãn mờ: `Tạm ngưng (Tài khoản đã khóa)` kèm icon ổ khóa xám.
  - Cột Nhóm quyền: Nếu tài khoản vẫn còn nhóm quyền được gán trong DB, hiển thị badge nhóm ở trạng thái mờ (opacity 50%) kèm nhãn chú thích: *"Tạm ngưng do tài khoản đã bị khóa"*.
  - **Thông điệp truyền tải:** Giúp Admin nhận biết rõ ràng: nhân viên này trước đó đã được giao phụ trách những nhóm quyền gì, nhưng hiện tại không thể đăng nhập hoặc thực thi bất kỳ quyền nào do tài khoản đang bị khóa.

### 3.3. Xử lý trường hợp một tài khoản có nhiều nhóm quyền trùng hoặc bao hàm nhau
- **Tình huống thực tế:** Tài khoản `phuongsht@gmail.com` trong cơ sở dữ liệu hiện đang được gán đồng thời cả 2 nhóm: `reward_viewer` (Chỉ xem thù lao) và `reward_manager` (Toàn quyền thù lao).
- **Quy tắc hiển thị chuẩn:**
  - Hệ thống **tôn trọng 100% dữ liệu thực tế trong bảng `staff_permission_groups`**.
  - Hiển thị cả 2 badge: `[Xem thù lao CTV]` và `[Phụ trách thù lao CTV]`.
  - **Tuyệt đối không tự suy luận nghiệp vụ** để ẩn nhóm `reward_viewer` vì cho rằng nhóm `reward_manager` đã bao hàm nó.
  - Trong panel chi tiết, liệt kê rõ cả 2 nhóm cùng thời điểm gán và người gán tương ứng để Admin nắm đầy đủ lịch sử phân quyền.

### 3.4. Không hiển thị các bản ghi nhóm quyền đã bị vô hiệu hóa (`is_active = false`)
- Các bản ghi trong `staff_permission_groups` có `is_active = false` (do Admin thu hồi nhóm quyền hoặc do hệ thống tự vô hiệu hóa khi thu hồi vai trò Staff ở A7-NV.2) **tuyệt đối không được hiển thị như một quyền đang có hiệu lực**.
- Trong bảng danh sách: Hoàn toàn bỏ qua các bản ghi này khi đếm và hiển thị nhóm quyền.
- Trong panel chi tiết: Chỉ hiển thị các nhóm đã vô hiệu hóa ở phần *“Lịch sử nhóm quyền đã thu hồi”* (nếu có), không đặt chung vào khối nhóm quyền đang hoạt động.

---

## 4. Quy Tắc Lọc Danh Sách Theo Nhóm Quyền

### 4.1. Cơ chế lọc phản ánh "Nhóm quyền được gán"
Bộ lọc nhóm quyền trên thanh công cụ tìm kiếm được thiết kế nhằm mục đích tra cứu **các nhân viên đang được giao nhiệm vụ cụ thể**, không phải là bộ lọc quyền chi tiết.

### 4.2. Các tùy chọn trong Dropdown Bộ lọc Nhóm quyền:
1. **Tất cả nhóm quyền (`all`):** Không áp dụng điều kiện lọc nhóm (mặc định).
2. **Chưa gán nhóm quyền (`none`):**
   - Lọc ra các Staff mà bảng `staff_permission_groups` không có bất kỳ bản ghi nào có `is_active = true`.
   - Giúp Admin nhanh chóng lọc ra danh sách nhân sự mới nâng quyền cần được phân công nhiệm vụ chuyên biệt.
3. **Phụ trách thù lao CTV (`reward_manager`):**
   - Lọc ra các Staff đang được gán nhóm `reward_manager` với `is_active = true`.
4. **Xem thù lao CTV (`reward_viewer`):**
   - Lọc ra các Staff đang được gán nhóm `reward_viewer` với `is_active = true`.
5. **Quản lý thông báo & Bản tin (`notification_manager`):**
   - Lọc ra các Staff đang được gán nhóm `notification_manager` với `is_active = true`.

### 4.3. Tương tác giữa Bộ lọc Nhóm quyền và Trạng thái Tài khoản
- Nếu Admin lọc nhóm `reward_manager`, danh sách trả về **toàn bộ nhân viên được gán nhóm này**, bao gồm cả nhân viên đang hoạt động lẫn nhân viên đang bị khóa tài khoản (`is_active = false`).
- Đối với nhân viên đang bị khóa, dòng kết quả vẫn hiển thị rõ badge đỏ `Đã vô hiệu hóa` để Admin nhận biết ngay tình trạng khả dụng thực tế của nhân sự đó.

---

## 5. Câu Chữ, Nhãn Badge Và Thông Điệp Đề Xuất (Copywriting Guidelines)

Nhằm loại bỏ hoàn toàn nguy cơ hiểu lầm về mặt nghiệp vụ cho người quản trị, hệ thống quy định bộ câu chữ chuẩn mực sau:

| Đối tượng hiển thị | Nhãn chuẩn (Badge / Text) | Màu sắc Tailwind | Câu chú thích giải nghĩa (Tooltip / Helper Text) |
| :--- | :--- | :--- | :--- |
| **Quyền nền Staff** | `Quyền nền Staff` | `bg-indigo-50 text-indigo-700 border-indigo-200` | *"Tài khoản sở hữu quyền tuyển sinh cốt lõi: Khóa học, Khách hàng (Leads), Đối soát hồ sơ, Duyệt CTV và Báo cáo Dashboard."* |
| **Chưa gán nhóm** | `Chưa gán nhóm quyền` | `text-slate-400 italic` | *"Nhân viên nắm giữ đầy đủ quyền nền tuyển sinh của trường, chưa được phân công nhóm quyền chuyên biệt về Thù lao hay Thông báo."* |
| **Nhóm thù lao toàn quyền** | `Phụ trách thù lao CTV` | `bg-purple-50 text-purple-700 border-purple-200` | *"Được phép xem, thẩm tra, phê duyệt, từ chối, hủy và xuất bảng kê thù lao 500.000 VNĐ cho kế toán."* |
| **Nhóm thù lao chỉ xem** | `Xem thù lao CTV` | `bg-blue-50 text-blue-700 border-blue-200` | *"Chỉ có quyền tra cứu danh sách và xem chi tiết căn cứ đối soát của các khoản thù lao CTV."* |
| **Nhóm thông báo BQT** | `Quản lý thông báo` | `bg-amber-50 text-amber-700 border-amber-200` | *"Được phép soạn thảo bản nháp, xuất bản và thu hồi bản tin Ban quản trị gửi tới mạng lưới CTV."* |
| **Tài khoản đang hoạt động** | `Đang hoạt động` | `bg-emerald-50 text-emerald-700 border-emerald-200` | *"Tài khoản người dùng đang mở, quyền truy cập Cổng Quản trị có hiệu lực bình thường."* |
| **Tài khoản đã bị khóa** | `Đã vô hiệu hóa` | `bg-rose-50 text-rose-700 border-rose-200` | *"Tài khoản đã bị khóa bởi Quản trị viên. Toàn bộ quyền nền và nhóm quyền tạm thời không thể sử dụng."* |
| **Nhóm trên tài khoản khóa**| `[Tên nhóm] (Tạm ngưng)` | `bg-slate-100 text-slate-500 border-slate-300 opacity-60` | *"Nhóm quyền chuyên biệt đã được gán nhưng hiện tạm ngưng hiệu lực do tài khoản nhân viên đang bị khóa."* |
| **Chưa đăng nhập** | `Chưa đăng nhập` | `text-slate-400 italic` | *"Người dùng chưa từng thực hiện đăng nhập vào hệ thống kể từ khi tài khoản được kích hoạt."* |

---

## 6. Minh Họa Trên Dữ Liệu Thực Tế Đã Kiểm Kê Ở A7-NV.0

Bảng minh họa cách hiển thị trực quan dựa trên 2 tài khoản Cán bộ Tuyển sinh đang tồn tại thực tế trong cơ sở dữ liệu:

### 6.1. Hiển thị trên bảng danh sách (`/admin/staff-accounts`)

```
┌─────┬───────────────────────────────┬─────────────┬─────────────┬──────────────────┬─────────────────────────────┬──────────────────────┬────────────┬─────────────┐
│ STT │ Họ và tên & Email             │ Số ĐT       │ Mã CTV      │ Trạng thái       │ Nhóm quyền chuyên biệt      │ Đăng nhập gần nhất   │ Ngày tạo   │ Thao tác    │
├─────┼───────────────────────────────┼─────────────┼─────────────┼──────────────────┼─────────────────────────────┼──────────────────────┼────────────┼─────────────┤
│ 1   │ Võ Minh Quân (Cán bộ TS)      │ 0901234567  │ STHCCTV3129 │ [Đang hoạt động] │ Chưa gán nhóm quyền         │ 22:20, 03/10/2026    │ 03/10/2026 │ [Xem] [CTV] │
│     │ tuyensinh_canbo@sthc.edu.vn   │             │             │ [Quyền nền Staff]│ (Có quyền nền tuyển sinh)   │                      │            │ [Phân quyền]│
├─────┼───────────────────────────────┼─────────────┼─────────────┼──────────────────┼─────────────────────────────┼──────────────────────┼────────────┼─────────────┤
│ 2   │ Đào Văn Phương                │ 0987654321  │ STHCCTV9759 │ [Đang hoạt động] │ [Xem thù lao CTV]           │ 01:13, 06/10/2026    │ 29/09/2026 │ [Xem] [CTV] │
│     │ phuongsht@gmail.com           │             │             │ [Quyền nền Staff]│ [Phụ trách thù lao CTV]     │                      │            │ [Phân quyền]│
└─────┴───────────────────────────────┴─────────────┴─────────────┴──────────────────┴─────────────────────────────┴──────────────────────┴────────────┴─────────────┘
```

### 6.2. Hiển thị trong Panel Chi tiết nhân viên

#### Trường hợp 1: Tài khoản `tuyensinh_canbo@sthc.edu.vn` (Võ Minh Quân)
- **Thông tin chung:** Họ tên: *Võ Minh Quân (Cán bộ Tuyển sinh)* | Email: `tuyensinh_canbo@sthc.edu.vn` | Vai trò: `staff` | Trạng thái: `Đang hoạt động`.
- **Hồ sơ CTV liên kết:** Mã CTV `STHCCTV3129` (Trạng thái duyệt CTV: `PENDING_REVIEW`). Nút: *"Mở hồ sơ CTV tại /admin/affiliates/:id"*.
- **Khối A — Quyền nền theo vai trò Staff (`profiles.role = 'staff'`):**
  - Card 1: *Quản lý & Duyệt Cộng tác viên (A1)* — Xem danh sách, duyệt/từ chối/tạm ngưng hồ sơ CTV.
  - Card 2: *Quản lý Khóa học tuyển sinh (A2)* — Xem danh mục, cập nhật học phí dự kiến, đóng/mở lớp.
  - Card 3: *Khách hàng & Nhật ký chăm sóc (A3)* — Tiếp nhận leads, cập nhật tiến độ tư vấn, ghi chú tư vấn.
  - Card 4: *Đối soát hồ sơ & Học phí (A4)* — Đối chiếu học viên chính thức, khớp mã hồ sơ và học phí thực thu.
  - Card 5: *Báo cáo Dashboard Tuyển sinh (A9)* — Theo dõi backlog nhập học, biểu đồ và xếp hạng CTV.
  - *Ghi chú chân khối:* *"Quyền nền được cấp tự động theo vai trò Staff của Nhà trường. Không cần gán nhóm quyền."*
- **Khối B — Nhóm quyền chuyên biệt (`staff_permission_groups`):**
  - Hiển thị hộp thông báo màu xanh lam nhạt:
    - Icon: `Info`.
    - Tiêu đề: *"Nhân viên chưa được gán nhóm quyền chuyên biệt"*.
    - Nội dung: *"Tài khoản này hiện chỉ nắm giữ các quyền nền tuyển sinh cốt lõi. Để phân công nhân viên này duyệt thù lao CTV (A5) hoặc quản lý thông báo Ban quản trị (C3), vui lòng sử dụng phân hệ Quản trị phân quyền."*
    - Nút bấm hành động: *"Đi đến Quản trị phân quyền (/admin/permissions)"*.

#### Trường hợp 2: Tài khoản `phuongsht@gmail.com` (Đào Văn Phương)
- **Thông tin chung:** Họ tên: *Đào Văn Phương* | Email: `phuongsht@gmail.com` | Vai trò: `staff` | Trạng thái: `Đang hoạt động`.
- **Hồ sơ CTV liên kết:** Mã CTV `STHCCTV9759` (Trạng thái duyệt CTV: `ACTIVE`). Nút: *"Mở hồ sơ CTV tại /admin/affiliates/:id"*.
- **Khối A — Quyền nền theo vai trò Staff:** Hiển thị tương tự đầy đủ 5 card quyền nền như trường hợp 1.
- **Khối B — Nhóm quyền chuyên biệt:**
  - Card nhóm 1: **Phụ trách thù lao CTV (`reward_manager`)**
    - Trạng thái: Badge xanh lá `Đang hoạt động`.
    - Mô tả: *Nhóm quản lý toàn quyền A5 (Xem, chi tiết, duyệt, từ chối, hủy, tổng hợp, xuất báo cáo).*
    - Danh sách mã quyền chi tiết: `rewards.view`, `rewards.view_detail`, `rewards.approve`, `rewards.reject`, `rewards.void`, `rewards.summary`, `rewards.export`.
    - Thông tin kiểm toán: *Người gán: admin@sthc.edu.vn | Ngày gán: 15:01, 07/10/2026*.
  - Card nhóm 2: **Xem thù lao CTV (`reward_viewer`)**
    - Trạng thái: Badge xanh lá `Đang hoạt động`.
    - Mô tả: *Nhóm chỉ có quyền xem danh sách và chi tiết thù lao.*
    - Danh sách mã quyền chi tiết: `rewards.view`, `rewards.view_detail`.
    - Thông tin kiểm toán: *Người gán: admin@sthc.edu.vn | Ngày gán: 08:14, 07/10/2026*.
  - Nút bấm hành động: *"Điều chỉnh phân quyền tại /admin/permissions"*.

---

## 7. Các Ca Kiểm Thử Nghiệm Thu Giao Diện Và Dữ Liệu (Acceptance Test Cases)

### TC-DISP-01: Kiểm tra hiển thị tách bạch quyền nền và nhóm quyền
- **Mục đích:** Xác minh không có nhãn gộp chung gây hiểu lầm.
- **Thao tác:** Đăng nhập tài khoản Admin, truy cập `/admin/staff-accounts`.
- **Kỳ vọng:**
  - Cột trạng thái hiển thị rõ badge `Quyền nền Staff`.
  - Cột nhóm quyền hiển thị badge riêng biệt theo tên tiếng Việt của nhóm (`permission_groups.name`).

### TC-DISP-02: Kiểm tra hiển thị tài khoản chưa có nhóm quyền
- **Mục đích:** Xác minh thông điệp rõ ràng cho nhân viên chỉ có quyền nền.
- **Thao tác:** Quan sát dòng của nhân viên Võ Minh Quân (`tuyensinh_canbo@sthc.edu.vn`).
- **Kỳ vọng:**
  - Cột nhóm quyền hiển thị text `Chưa gán nhóm quyền`.
  - Rê chuột vào tooltip thấy dòng giải thích: *"Tài khoản vẫn có đầy đủ quyền nền Staff"*.
  - Không hiển thị badge lỗi hay cảnh báo đỏ.

### TC-DISP-03: Kiểm tra hiển thị tài khoản có nhiều nhóm quyền
- **Mục đích:** Xác minh hiển thị đầy đủ các nhóm theo dữ liệu thật, không tự ý ẩn nhóm con.
- **Thao tác:** Quan sát dòng của nhân viên Đào Văn Phương (`phuongsht@gmail.com`).
- **Kỳ vọng:**
  - Hiển thị cả 2 badge: `Xem thù lao CTV` và `Phụ trách thù lao CTV`.
  - Mở panel chi tiết thấy đầy đủ 2 card nhóm quyền độc lập.

### TC-DISP-04: Kiểm tra hiển thị khi tài khoản bị khóa (`is_active = false`)
- **Mục đích:** Xác minh trạng thái khóa tài khoản áp đảo quyền truy cập thực tế.
- **Tiền điều kiện:** Một tài khoản Staff có `profiles.is_active = false` nhưng trong `staff_permission_groups` vẫn có bản ghi `is_active = true`.
- **Kỳ vọng:**
  - Cột trạng thái hiển thị badge đỏ `Đã vô hiệu hóa`.
  - Badge quyền nền và badge nhóm quyền chuyển sang trạng thái mờ (dimmed/opacity 50%).
  - Tooltip ghi rõ: *"Quyền tạm thời không có hiệu lực do tài khoản đã bị khóa"*.

### TC-DISP-05: Kiểm tra bộ lọc theo nhóm quyền
- **Mục đích:** Xác minh lọc chính xác theo nhóm gán.
- **Thao tác:**
  1. Chọn bộ lọc `Chưa gán nhóm quyền`: Chỉ hiển thị nhân viên Võ Minh Quân.
  2. Chọn bộ lọc `Phụ trách thù lao CTV`: Chỉ hiển thị nhân viên Đào Văn Phương.
  3. Chọn bộ lọc `Quản lý thông báo`: Danh sách trả về trống kèm Empty State tìm kiếm.

---

## 8. Mục Ghi Nhận Mâu Thuẫn Và Giới Hạn Xác Minh

### 8.1. Mâu thuẫn giữa source code hiện tại và yêu cầu hiển thị
1. **API `GET /api/v1/admin/staff-permissions` hiện tại không lọc `is_active = true` của bảng gán nhóm:**
   - Trong `server.ts` dòng `12956`:
     ```ts
     const { data: staffGroups, error: sgErr } = await supabase
       .from('staff_permission_groups')
       .select('*');
     ```
   - Đoạn code này lấy toàn bộ các dòng mà không có `.eq('is_active', true)`.
   - **Cách xử lý đề xuất cho API mới `GET /api/v1/admin/staff-accounts`:** Bắt buộc phải bổ sung điều kiện `.eq('is_active', true)` khi truy vấn `staff_permission_groups` để tránh việc các nhóm đã bị Admin thu hồi trước đó vẫn hiển thị nhầm là nhóm đang hoạt động trên giao diện.

2. **Sự khác biệt giữa quyền nền trong code và quyền trong bảng `permissions`:**
   - Trong database, bảng `permissions` có các mã quyền như `leads.view`, `courses.view`, `reconciliation.view`.
   - Tuy nhiên, trong mã nguồn backend (`server.ts`), các route tương ứng (vd: `GET /api/v1/admin/leads`, `GET /api/v1/admin/courses`) **không kiểm tra qua `requirePermission`** mà sử dụng trực tiếp middleware `requireStaffOrAdmin`.
   - **Kết luận xác nhận:** Quyền nền Staff hoạt động theo **cơ chế vai trò (Role-based)** chứ không hoạt động theo cơ chế gán mã quyền RBAC chi tiết. Đặc tả A7-NV.3 đã phản ánh hoàn toàn chính xác hiện trạng này và không yêu cầu nhân viên phải được gán các mã quyền đó trong database.

### 8.2. Giới hạn xác minh
- Toàn bộ các quy tắc hiển thị trên đã được đối chiếu trực tiếp với 2 tài khoản Staff và 3 nhóm quyền thật trong cơ sở dữ liệu.
- Không có bất kỳ mâu thuẫn nào làm cản trở việc triển khai giao diện ở các bước sau.

---

## 9. Kết Luận

Tài liệu **A7-NV.3** đã thiết lập bộ khung quy tắc hiển thị giao diện và diễn giải dữ liệu chuẩn mực cho phân hệ Quản lý Tài khoản nhân viên:
1. **Tách bạch hoàn toàn:** Quyền nền Staff và Nhóm quyền chuyên biệt có nhãn, màu sắc và vị trí hiển thị riêng biệt.
2. **Minh bạch thông tin:** Giải thích rõ ràng để Admin không nhầm lẫn giữa việc "chưa gán nhóm quyền" với việc "tài khoản không có quyền".
3. **An toàn kiểm soát:** Tách biệt rõ giữa trạng thái kích hoạt tài khoản (`is_active`) và trạng thái gán nhóm quyền.

Tài liệu này hoàn tất chuỗi đặc tả nền tảng (A7-NV.0 → A7-NV.1 → A7-NV.2 → A7-NV.3). Hệ thống đã hội đủ mọi căn cứ nghiệp vụ và kỹ thuật để sẵn sàng bước vào giai đoạn triển khai code ở các bước tiếp theo.
