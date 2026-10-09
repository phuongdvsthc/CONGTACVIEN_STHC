# BÁO CÁO KIỂM KÊ NỀN TẢNG THÔNG BÁO, EMAIL VÀ CÁC ĐIỂM PHÁT SINH SỰ KIỆN (C3.1)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_1_NOTIFICATION_EMAIL_EVENT_AUDIT_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái kiểm kê**: **HOÀN THÀNH 100% (READ-ONLY AUDIT & BLUEPRINT DESIGN)**  
**Phạm vi tuân thủ**: Đọc mã nguồn, kiểm kê cấu hình, đối chiếu contract, thiết kế kiến trúc chuẩn bị cho C3.2. Không sửa dữ liệu nghiệp vụ, không chạy migration, không gửi email thử nghiệm, không làm lộ thông tin nhạy cảm.

---

## MỤC LỤC
1. [Giới Hạn Thao Tác & Mục Tiêu C3.1](#1-giới-hạn-thao-tác--mục-tiêu-c31)
2. [Bảng Ma Trận Đánh Giá Trạng Thái Hiện Tại (Status Matrix)](#2-bảng-ma-trận-đánh-giá-trạng-thái-hiện-tại-status-matrix)
3. [Kiểm Kê Giao Diện, Header, Bell & Điều Hướng Routing](#3-kiểm-kê-giao-diện-header-bell--điều-hướng-routing)
4. [Kiểm Kê Cơ Sở Dữ Liệu & Hạ Tầng Supabase Hiện Có](#4-kiểm-kê-cơ-sở-dữ-liệu--hạ-tầng-supabase-hiện-có)
5. [Kiểm Kê & Ánh Xạ Các Điểm Phát Sinh Sự Kiện Nghiệp Vụ (A1, A3, A4, A5)](#5-kiểm-kê--ánh-xạ-các-điểm-phát-sinh-sự-kiện-nghiệp-vụ-a1-a3-a4-a5)
6. [Kiểm Kê Khả Năng Quản Lý Thông Báo Dành Cho Admin / Staff](#6-kiểm-kê-khả-năng-quản-lý-thông-báo-dành-cho-admin--staff)
7. [Kiểm Kê Nền Tảng Email & Cấu Hình SMTP](#7-kiểm-kê-nền-tảng-email--cấu-hình-smtp)
8. [Đề Xuất Thiết Kế Kiến Trúc Cơ Sở Dữ Liệu & Helper RPC Cho C3.2](#8-đề-xuất-thiết-kế-kiến-trúc-cơ-sở-dữ-liệu--helper-rpc-cho-c32)
9. [Kế Hoạch & Cam Kết Bàn Giao C3.1](#9-kế-hoạch--cam-kết-bàn-giao-c31)

---

## 1. GIỚI HẠN THAO TÁC & MỤC TIÊU C3.1

### 1.1. Nguyên Tắc An Toàn Dữ Liệu
- **Tuyệt đối Read-only**: Toàn bộ quá trình kiểm kê chỉ sử dụng thao tác đọc mã nguồn (`src/`, `server.ts`, `supabase/migrations/`), đối chiếu schema SQL và kiểm tra cấu hình tĩnh.
- **Không thay đổi Schema/Data**: Không chạy bất kỳ lệnh `CREATE TABLE`, `ALTER TABLE`, `UPDATE`, `INSERT`, `DELETE` nào trên database.
- **Không gửi Email**: Không kích hoạt bất kỳ tác vụ gửi mail thực tế nào, không test SMTP ra ngoài mạng.
- **Không tiết lộ thông tin mật**: Không hiển thị Supabase service role key, SMTP password, token phiên làm việc hay dữ liệu định danh cá nhân của người dùng thật.
- **Nguyên tắc phân định**: Dừng ngay sau khi hoàn thành báo cáo C3.1; không tự ý triển khai mã nguồn chức năng C3.2 trước khi được yêu cầu.

### 1.2. Mục Tiêu Cụ Thể Của C3.1
1. Khảo sát hiện trạng chuông thông báo (Bell), popover, badge số lượng, routing `/portal/notifications`.
2. Kiểm tra schema PostgreSQL hiện tại đối với thông báo, email logs, bảng phân quyền.
3. Lập danh mục chi tiết các điểm phát sinh sự kiện từ các module đã hoàn thành (A1, A3, A4, A5) và ánh xạ chúng vào Tab 2 ("Thông báo từ hệ thống").
4. Xác định quy trình quản lý thông báo cho Admin/Staff (Soạn thảo, Nháp, Chọn đối tượng, Xuất bản, Thu hồi) cho Tab 1 ("Thông báo từ Ban quản trị").
5. Đánh giá hạ tầng email, cấu hình SMTP và đề xuất giải pháp gửi thư bất đồng bộ (Outbox pattern).
6. Xây dựng bản thiết kế mô hình thực thể CSDL (ERD/DDL) và RPC helpers sẵn sàng cho bước triển khai C3.2.

---

## 2. BẢNG MA TRẬN ĐÁNH GIÁ TRẠNG THÁI HIỆN TẠI (STATUS MATRIX)

| STT | Hạng mục kiểm kê | Trạng thái | Ghi chú & Bằng chứng thực tế trong mã nguồn |
|:---:|:---|:---:|:---|
| **1** | Icon Chuông (Bell) trên Header nội bộ | **Đã xác minh** *(Verified)* | Đã có nút chuông tại `src/components/common/AppLayout.tsx` (dòng 272–280). Dùng chung cho cả CTV và Admin/Staff. |
| **2** | Badge đếm số thông báo chưa đọc trên Bell | **Chưa có** *(Missing)* | Nút chuông chưa có thẻ badge hiển thị số lượng (chưa có `<span className="badge">` hay state unread count). |
| **3** | Popover dropdown khi nhấp vào Bell | **Một phần** *(Partial)* | Popover mở khi click nhưng nội dung là khung mẫu tĩnh cứng: *"Thông báo hệ thống — Thông tin thông báo sẽ được bổ sung."* Chưa có danh sách thật, chưa có phân trang, chưa có liên kết. |
| **4** | Route màn hình CTV `/portal/notifications` | **Chưa có** *(Missing)* | Chưa được khai báo trong `src/App.tsx`, chưa có component hiển thị 2 tab *"Ban quản trị"* và *"Hệ thống"*. |
| **5** | Menu Sidebar CTV cho Thông báo | **Chưa có** *(Missing)* | `AFFILIATE_NAV_ITEMS` trong `src/config/navConfig.ts` chỉ có: `overview`, `courses`, `leads`. Chưa có mục Thông báo. |
| **6** | Menu Quản trị Thông báo cho Admin/Staff | **Chưa có** *(Missing)* | `ADMIN_NAV_ITEMS` trong `src/config/navConfig.ts` chưa có mục quản lý thông báo/bản tin gửi CTV. |
| **7** | Bảng CSDL lưu thông báo (`notifications`) | **Chưa có** *(Missing)* | Trong `supabase/migrations/` hoàn toàn chưa có bảng lưu thông báo, bản tin hay người nhận. |
| **8** | Cơ chế Realtime / Polling thông báo | **Chưa có** *(Missing)* | Không có WebSocket Supabase Realtime channel hay polling `setInterval` nào cho thông báo trong toàn bộ `src/`. |
| **9** | Sự kiện phát sinh tự động Module A1 | **Đã xác minh** *(Verified)* | Các endpoint duyệt/từ chối/tạm ngưng/kích hoạt CTV đã chạy tại `server.ts` nhưng chưa có hook/trigger phát sinh thông báo. |
| **10** | Sự kiện phát sinh tự động Module A3 | **Đã xác minh** *(Verified)* | Form nộp lead công khai và cập nhật tiến độ tư vấn (`care-history`) đã chạy tại `server.ts` nhưng chưa đẩy thông báo cho CTV. |
| **11** | Sự kiện phát sinh tự động Module A4 | **Đã xác minh** *(Verified)* | Đối soát hồ sơ nhập học thành công (`fn_reconcile_lead_enrollment`) và hủy đối soát đã chạy tại PostgreSQL nhưng chưa sinh thông báo. |
| **12** | Sự kiện phát sinh tự động Module A5 | **Đã xác minh** *(Verified)* | Tạo thù lao 500k, duyệt (`fn_approve_reward_v2`), từ chối, hủy thù lao đã chạy nhưng chưa gửi thông báo cho CTV thụ hưởng. |
| **13** | Hạ tầng Thư viện gửi Email (Nodemailer/Resend) | **Chưa có** *(Missing)* | `package.json` chưa cài đặt `nodemailer`, `@sendgrid/mail` hay `resend`. Chưa có dịch vụ SMTP client trong backend. |
| **14** | Email xác thực & Reset mật khẩu Supabase | **Đã xác minh** *(Verified)* | `server.ts` đã sử dụng Supabase Auth built-in (`resetPasswordForEmail`, `resend({ type: 'signup' })`) qua mail server mặc định của Supabase. |
| **15** | Cấu hình SMTP trong Quản trị hệ thống A7 | **Chưa có** *(Missing)* | Bảng `system_settings` (A7) chỉ có `support_email` (email hiển thị liên hệ), tài liệu A7.5 khẳng định rõ chưa có cấu hình SMTP mật khẩu/cổng. |
| **16** | Nền tảng Phân quyền RBAC cho Nhân viên (Staff) | **Đã xác minh** *(Verified)* | Đã có sẵn cấu trúc bảng `permissions`, `permission_groups`, `staff_permission_groups` và RPC `fn_get_user_permissions` (A5.0). Sẵn sàng bổ sung quyền thông báo. |

---

## 3. KIỂM KÊ GIAO DIỆN, HEADER, BELL & ĐIỀU HƯỚNG ROUTING

### 3.1. Thành Phần Layout & Nút Chuông (Bell)
- **Vị trí file**: `/src/components/common/AppLayout.tsx` (dòng 272–300).
- **Phạm vi hiển thị**: Áp dụng chung cho tất cả người dùng đăng nhập thuộc phân hệ nội bộ: CTV hoạt động (`affiliate_active`), CTV chờ duyệt (`affiliate_pending`), Nhân viên (`staff`), Quản trị viên (`admin`).
- **Mã nguồn thực tế hiện tại**:
  ```tsx
  {/* Notification Bell */}
  <div className="relative" ref={notificationRef}>
    <button
      onClick={() => setNotificationOpen(!notificationOpen)}
      aria-label="Thông báo"
      className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
    >
      <Bell className="w-5 h-5" />
    </button>

    {/* Notification Popover */}
    {notificationOpen && (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 text-xs space-y-3 z-50 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="font-bold text-slate-900">Thông báo hệ thống</span>
          <button onClick={() => setNotificationOpen(false)} ...>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="py-4 text-center text-slate-600 space-y-1">
          <Info className="w-6 h-6 text-blue-900 mx-auto opacity-80" />
          <p className="font-medium">Thông tin thông báo sẽ được bổ sung.</p>
        </div>
      </div>
    )}
  </div>
  ```
- **Hạn chế phát hiện**:
  1. **Không có Badge**: Nút Bell không hiển thị chấm đỏ hoặc số lượng thông báo chưa đọc.
  2. **Nội dung Mock tĩnh**: Popover chỉ chứa đoạn text placeholder *"Thông tin thông báo sẽ được bổ sung."*
  3. **Không có đường dẫn xem tất cả**: Chưa có nút *"Xem tất cả thông báo"* dẫn tới `/portal/notifications`.
  4. **Không có thao tác người dùng**: Không có nút *"Đánh dấu đã đọc"*, không có phân biệt giữa thông báo đã đọc và chưa đọc.

### 3.2. Cấu Trúc Điều Hướng Sidebar (`src/config/navConfig.ts`)
1. **Dành cho Cộng tác viên (`AFFILIATE_NAV_ITEMS`)**:
   - `overview`: `/portal` (Tổng quan)
   - `courses`: `/portal/courses` (Khóa học)
   - `leads`: `/portal/leads` (Khách hàng được giới thiệu)
   - *Khoảng trống*: Chưa có liên kết `notifications` (`/portal/notifications`) trong sidebar CTV. Khi triển khai C3, CTV có thể điều hướng qua nút chuông Header hoặc thêm mục riêng trên sidebar.
2. **Dành cho Quản trị viên & Nhân viên (`ADMIN_NAV_ITEMS`)**:
   - Đang có: `admin_overview`, `admin_affiliates`, `admin_courses`, `admin_leads`, `admin_reconcile`, `admin_rewards`, `admin_homepage`, `admin_staff`, `admin_audit`, `admin_permissions`, `admin_system_settings`.
   - *Khoảng trống*: Chưa có mục quản lý thông báo/bản tin gửi CTV (ví dụ: `/admin/notifications` - Quản lý thông báo).

### 3.3. Các Tuyến Đường Deep-link Đang Hoạt Động Để Nhúng Vào Thông Báo
Khi thông báo hệ thống phát sinh, người dùng nhấp vào cần được chuyển hướng trực tiếp đến trang chi tiết tương ứng (Deep Link). Các route này đã được kiểm tra và đang hoạt động đầy đủ:
- **CTV xem chi tiết khách hàng**: `/portal/leads/:id` (Component `AffiliateLeadDetailView`).
- **CTV xem danh sách khách hàng**: `/portal/leads` (Component `AffiliateLeadsView`).
- **CTV xem chi tiết khóa học**: `/portal/courses/:slug` hoặc `/portal/courses/:id` (Component `AffiliateCourseDetailView`).
- **CTV xem trang tổng quan / thù lao**: `/portal` (Component `AffiliateDashboard`).
- **CTV xem trạng thái hồ sơ bị treo/chờ**: `/pending` (Component `AffiliatePendingScreen`).
- **CTV xem hồ sơ cá nhân / tài khoản ngân hàng**: `/portal/profile` hoặc mở Modal hồ sơ `ProfileDetailView`.
- **Admin/Staff xem chi tiết khách hàng**: `/admin/leads/:id` (Component `AdminLeadDetailView`).
- **Admin/Staff xem đối soát**: `/admin/reconcile` (Component `AdminPortal` tab reconcile).
- **Admin/Staff xem duyệt thù lao**: `/admin/rewards` (Component `AdminPortal` tab rewards).
- **Admin/Staff xem duyệt hồ sơ CTV**: `/admin/affiliates` (Component `AdminPortal` tab affiliates).

---

## 4. KIỂM KÊ CƠ SỞ DỮ LIỆU & HẠ TẦNG SUPABASE HIỆN CÓ

### 4.1. Khảo Sát Bảng Dữ Liệu
Kiểm tra toàn bộ thư mục `/supabase/migrations/` (36 files migration):
- **Bảng thông báo (`notifications`, `announcements`, `messages`)**: **0 bảng**.
- **Bảng người nhận thông báo (`notification_recipients`)**: **0 bảng**.
- **Bảng hàng đợi email (`email_queue`, `email_outbox`)**: **0 bảng**.
- **Bảng lịch sử email (`email_logs`)**: **0 bảng**.
- **Bảng cấu hình SMTP (`smtp_configs`, `mail_settings`)**: **0 bảng**.

### 4.2. Khảo Sát Phân Quyền Nhân Viên (`public.permissions`)
Hệ thống phân quyền RBAC đã được thiết lập chặt chẽ trong Migration `20261006000001_a5_permissions_foundation.sql`:
- Bảng `public.permissions` lưu mã quyền dạng chuỗi (hiện có 7 quyền `rewards.*`).
- Bảng `public.permission_groups` và `public.permission_group_items` nhóm các quyền.
- Bảng `public.staff_permission_groups` gán nhóm quyền cho từng cán bộ (`staff_id`).
- Hàm RPC `public.fn_get_user_permissions(p_user_id UUID)`: Quản trị viên (`admin`) tự động có toàn quyền; Nhân viên (`staff`) chỉ nhận các quyền đã được kích hoạt `is_active = TRUE`.
- **Khả năng tái sử dụng**: Có thể mở rộng cực kỳ dễ dàng bằng cách thêm các mã quyền mới:
  - `notifications.view`: Xem danh sách thông báo Ban quản trị đã soạn.
  - `notifications.create`: Soạn thảo thông báo mới (Draft).
  - `notifications.publish`: Xuất bản thông báo tới CTV.
  - `notifications.revoke`: Thu hồi thông báo đã xuất bản.

---

## 5. KIỂM KÊ & ÁNH XẠ CÁC ĐIỂM PHÁT SINH SỰ KIỆN NGHIỆP VỤ (A1, A3, A4, A5)

Tất cả các thông báo phát sinh tự động từ nghiệp vụ A1/A3/A4/A5 sẽ thuộc **Tab 2: Thông báo từ hệ thống** trên màn hình `/portal/notifications`. Dưới đây là bảng phân tích toàn diện:

### Bảng Danh Mục 11 Điểm Phát Sinh Sự Kiện Nghiệp Vụ

| Mã Sự Kiện | Nghiệp vụ gốc | Điểm kích hoạt trong Code / RPC | Đối tượng nhận | Tiêu đề & Nội dung tóm tắt dự kiến | Tab hiển thị | Deep-Link điều hướng | Mức độ ưu tiên Email (Tương lai) |
|:---|:---|:---|:---|:---|:---:|:---|:---:|
| **EVT_A1_01** | CTV Đăng ký tài khoản mới | `server.ts`<br>`POST /api/v1/auth/register` | CTV vừa đăng ký | **Chào mừng bạn gia nhập STHC!**<br>Hồ sơ của bạn đang ở trạng thái chờ xét duyệt. Vui lòng kiểm tra email để xác thực tài khoản. | Tab 2 (Hệ thống) | `/pending` | Đã có qua Supabase Auth SignUp |
| **EVT_A1_02** | Duyệt hồ sơ CTV thành công (APPROVE) | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/review` (action=APPROVE) | CTV được duyệt (`affiliate_profiles.user_id`) | **Hồ sơ CTV đã được phê duyệt!**<br>Chúc mừng bạn! Mã giới thiệu chính thức của bạn là **{affiliate_code}**. Bắt đầu chia sẻ khóa học để nhận thù lao 500.000 VNĐ. | Tab 2 (Hệ thống) | `/portal` | **Rất cao** *(Email chúc mừng & link chia sẻ)* |
| **EVT_A1_03** | Từ chối hồ sơ CTV (REJECT) | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/review` (action=REJECT) | CTV bị từ chối (`affiliate_profiles.user_id`) | **Hồ sơ CTV chưa được duyệt**<br>Ban tuyển sinh chưa thể phê duyệt hồ sơ của bạn. Lý do: *{review_note}*. Vui lòng liên hệ hỗ trợ. | Tab 2 (Hệ thống) | `/pending` | **Cao** *(Email thông báo lý do)* |
| **EVT_A1_04** | Tạm ngưng hoạt động CTV (SUSPEND) | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/suspend` | CTV bị tạm ngưng (`affiliate_profiles.user_id`) | **Tài khoản CTV tạm thời bị tạm ngưng**<br>Tài khoản CTV của bạn tạm ngưng hoạt động. Lý do: *{reason}*. Mọi liên kết giới thiệu tạm thời không ghi nhận. | Tab 2 (Hệ thống) | `/pending` | **Cao** *(Email cảnh báo)* |
| **EVT_A1_05** | Kích hoạt lại CTV (REACTIVATE) | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/reactivate` | CTV được mở lại (`affiliate_profiles.user_id`) | **Tài khoản CTV đã được kích hoạt lại**<br>Tài khoản của bạn đã hoạt động bình thường trở lại. Bạn có thể tiếp tục giới thiệu học viên. | Tab 2 (Hệ thống) | `/portal` | **Trung bình** *(Email thông báo mở lại)* |
| **EVT_A3_01** | Có ứng viên đăng ký mới qua link CTV | `server.ts`<br>`POST /api/v1/public/leads` | CTV sở hữu mã giới thiệu | **Khách hàng mới đăng ký tư vấn!**<br>Ứng viên **{full_name}** vừa đăng ký tư vấn khóa **{course_title}** qua mã giới thiệu của bạn. | Tab 2 (Hệ thống) | `/portal/leads/:id` | **Cao** *(Email báo lead mới)* |
| **EVT_A3_02** | Cán bộ cập nhật tiến độ tư vấn | `server.ts`<br>`POST /api/v1/admin/leads/:id/care-history`<br>RPC `fn_update_lead_care_history` | CTV sở hữu lead | **Tiến độ chăm sóc khách hàng**<br>Hồ sơ của **{full_name}** đã được cập nhật trạng thái: **{counseling_status_label}**. | Tab 2 (Hệ thống) | `/portal/leads/:id` | **Thấp** *(Không cần email ngay, tránh spam)* |
| **EVT_A4_01** | Đối soát thành công — Học viên nhập học | `server.ts`<br>`POST /api/v1/admin/reconcile`<br>RPC `fn_reconcile_lead_enrollment` | CTV sở hữu lead | **Học viên nhập học thành công!**<br>Ứng viên **{full_name}** đã hoàn tất thủ tục nhập học và nộp học phí khóa **{course_title}**. Khoản thù lao 500.000 VNĐ đang chờ duyệt. | Tab 2 (Hệ thống) | `/portal/leads/:id` | **Rất cao** *(Email báo thành tích)* |
| **EVT_A4_02** | Cán bộ hủy kết quả đối soát (VOID) | `server.ts`<br>`POST /api/v1/admin/reconcile/:id/void`<br>RPC `fn_void_lead_reconciliation` | CTV sở hữu lead | **Điều chỉnh kết quả nhập học**<br>Kết quả đối soát của ứng viên **{full_name}** đã bị điều chỉnh/hủy. Lý do: *{void_reason}*. | Tab 2 (Hệ thống) | `/portal/leads/:id` | **Cao** *(Email giải trình)* |
| **EVT_A5_01** | Thù lao được phê duyệt chính thức (APPROVE) | `server.ts`<br>`POST /api/v1/admin/rewards/:id/approve`<br>RPC `fn_approve_reward_v2` | CTV thụ hưởng (`rewards.affiliate_id`) | **Thù lao 500.000 VNĐ đã được phê duyệt!**<br>Khoản thù lao cho hồ sơ **{lead_name}** đã được duyệt chi. Tiền sẽ được thanh toán vào tài khoản ngân hàng của bạn. | Tab 2 (Hệ thống) | `/portal` | **Rất cao** *(Email duyệt thù lao)* |
| **EVT_A5_02** | Thù lao bị từ chối / thu hồi (REJECT / VOID) | `server.ts`<br>`POST /api/v1/admin/rewards/:id/reject` hoặc `/void`<br>RPC `fn_reject_reward_v2` / `fn_void_reward_v2` | CTV thụ hưởng (`rewards.affiliate_id`) | **Khoản thù lao bị từ chối / thu hồi**<br>Khoản thù lao cho hồ sơ **{lead_name}** không đủ điều kiện chi trả. Lý do: *{reason}*. | Tab 2 (Hệ thống) | `/portal/leads/:id` | **Cao** *(Email giải thích từ chối)* |

---

## 6. KIỂM KÊ KHẢ NĂNG QUẢN LÝ THÔNG BÁO DÀNH CHO ADMIN / STAFF

Đối với **Tab 1: Thông báo từ Ban quản trị**, hệ thống yêu cầu một quy trình quản lý thông báo chuyên biệt:

### 6.1. Vòng Đời Bản Tin (Notification Lifecycle)
1. **DRAFT (Bản nháp)**:
   - Admin/Staff soạn thảo tiêu đề, tóm tắt, nội dung chi tiết.
   - Chọn đối tượng nhận (Recipient Scope).
   - Có thể chỉnh sửa nội dung nhiều lần, chưa hiển thị cho CTV.
2. **PUBLISHED (Đã xuất bản)**:
   - Sau khi ấn "Xuất bản", hệ thống gắn mốc thời gian `published_at`, người xuất bản `published_by`.
   - Thông báo xuất hiện ngay lập tức trong hòm thư Tab 1 của tất cả các CTV thuộc phạm vi đối tượng được chọn.
   - Số đếm chưa đọc trên Bell của CTV tự động tăng lên.
3. **REVOKED (Đã thu hồi)**:
   - Nếu thông báo có sai sót hoặc hết hiệu lực khẩn cấp, Admin/Staff có thể ấn "Thu hồi".
   - Hệ thống gắn `revoked_at`, `revoked_by`.
   - Thông báo bị ẩn khỏi màn hình CTV (hoặc hiển thị cờ đã thu hồi), đồng thời trừ số lượng chưa đọc nếu CTV chưa từng mở xem.

### 6.2. Phân Nhóm Đối Tượng Nhận (Recipient Scopes)
- **Tất cả CTV (`ALL`)**: Gửi tới toàn bộ người dùng có tài khoản CTV trong hệ thống.
- **Theo trạng thái (`FILTER_STATUS`)**: Gửi riêng cho nhóm CTV đang hoạt động (`ACTIVE`), hoặc nhóm CTV đang chờ duyệt (`PENDING_REVIEW`) để nhắc bổ sung hồ sơ, hoặc nhóm tạm ngưng (`SUSPENDED`).
- **Chỉ định danh sách cụ thể (`SPECIFIC_AFFILIATES`)**: Chọn đích danh một số CTV theo mã CTV hoặc họ tên (ví dụ để khen thưởng Top CTV, gửi thông báo cá biệt).

### 6.3. Phân Quyền Thao Tác (RBAC Rules)
- **Admin**: Toàn quyền soạn nháp, sửa, xóa nháp, xuất bản và thu hồi mọi thông báo.
- **Staff**: 
  - Mặc định chỉ được xem danh sách thông báo.
  - Cần được gán quyền `notifications.create` để soạn nháp.
  - Cần quyền `notifications.publish` để xuất bản ra toàn hệ thống.
  - Cần quyền `notifications.revoke` để thu hồi thông báo.

---

## 7. KIỂM KÊ NỀN TẢNG EMAIL & CẤU HÌNH SMTP

### 7.1. Hiện Trạng Email Đang Hoạt Động
- **Cơ chế**: Supabase Auth built-in transactional email service.
- **Các luồng đang dùng**:
  1. `POST /api/v1/auth/forgot-password`: Gọi `supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo })`.
  2. `POST /api/v1/auth/resend-verification`: Gọi `supabaseAuth.auth.resend({ type: 'signup', email })`.
  3. Đăng ký CTV: Supabase Auth tự động gửi email kích hoạt tài khoản nếu dự án bật xác thực email.
- **Hạn chế**:
  - Không thể gửi email tùy chỉnh nghiệp vụ (không gửi được email chúc mừng duyệt hồ sơ, không gửi được email báo có lead mới, không gửi được thông báo thù lao).
  - Bị giới hạn tỷ lệ gửi nghiêm ngặt của Supabase mặc định (3–4 emails/giờ nếu không cấu hình Custom SMTP trong Supabase dashboard).

### 7.2. Tình Trạng Cấu Hình Vận Hành & Mật Khẩu SMTP
- Trong module A7 (Quản trị hệ thống), bảng `public.system_settings` đã có trường `support_email: 'tuyensinh@sthc.edu.vn'`.
- Tuy nhiên, báo cáo `/docs/A7_5_SYSTEM_OPERATION_IMPLEMENTATION_REPORT.md` đã khẳng định rõ ràng:
  > *"support_email là email liên hệ hiển thị cho người học/CTV (dùng cho liên kết mailto:), KHÔNG PHẢI tài khoản SMTP gửi mail. Tuyệt đối không thêm trường mật khẩu/SMTP vào giao diện quản trị vận hành."*
- Trong file `.env.example` và môi trường máy chủ: Hoàn toàn **chưa có biến môi trường cấu hình SMTP** nào (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, v.v.).

### 7.3. Đề Xuất Giải Pháp Gửi Email Cho Giai Đoạn Sau (Email Queue & Outbox Pattern)
Để đảm bảo an toàn tuyệt đối, hệ thống **không được gửi email đồng bộ (synchronous) trực tiếp trong các endpoint nghiệp vụ** (vì nếu SMTP timeout hoặc lỗi mạng sẽ làm rollback giao dịch duyệt thù lao hoặc đối soát lead của người dùng).
- **Mô hình Khuyến nghị**:
  1. **Transactional Outbox Pattern**: Khi nghiệp vụ phát sinh sự kiện (ví dụ duyệt thù lao A5), dữ liệu thông báo trong ứng dụng được lưu vào bảng `user_notifications`. Nếu có yêu cầu gửi mail, một bản ghi được insert vào bảng `email_outbox_queue`.
  2. **Background Worker / Cron**: Một tác vụ nền (Worker) định kỳ quét `email_outbox_queue`, gửi qua SMTP (hoặc Resend/SendGrid API), cập nhật trạng thái `SENT` hoặc `FAILED` (kèm số lần thử lại `retry_count`).
  3. **Cấu hình SMTP trong Quản trị hệ thống**: Bổ sung một tab riêng biệt hoặc nhóm cấu hình chuyên dụng trong Quản trị hệ thống (yêu cầu quyền Admin tối cao, mật khẩu SMTP được mã hóa an toàn).

---

## 8. ĐỀ XUẤT THIẾT KẾ KIẾN TRÚC CƠ SỞ DỮ LIỆU & HELPER RPC CHO C3.2

Dựa trên toàn bộ kết quả kiểm kê, để đáp ứng chính xác yêu cầu **Module C3** (màn hình CTV với 2 tab, chuông Header hiển thị tổng số chưa đọc, Admin quản lý bản tin, hệ thống tự động sinh thông báo):

### 8.1. Thiết Kế 2 Bảng CSDL Cốt Lõi

```sql
-- ==============================================================================
-- BẢNG 1: THÔNG BÁO TỪ BAN QUẢN TRỊ (ADMIN BROADCAST / TARGETED ANNOUNCEMENTS)
-- Phục vụ Tab 1 trên màn hình CTV: "Thông báo từ Ban quản trị"
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content_markdown TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- 'GENERAL', 'POLICY', 'URGENT', 'EVENT'
    recipient_scope VARCHAR(30) NOT NULL DEFAULT 'ALL', -- 'ALL', 'STATUS_FILTER', 'SPECIFIC'
    recipient_filter JSONB DEFAULT '{}'::jsonb, -- e.g. {"status": ["ACTIVE"]} or {"user_ids": ["..."]}
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'REVOKED'
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_announcement_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT chk_announcement_scope CHECK (recipient_scope IN ('ALL', 'STATUS_FILTER', 'SPECIFIC'))
);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_status ON public.admin_announcements(status);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_created_at ON public.admin_announcements(created_at DESC);

-- ==============================================================================
-- BẢNG 2: THÔNG BÁO NGƯỜI DÙNG (USER NOTIFICATIONS - CẢ TAB 1 VÀ TAB 2)
-- Phục vụ hộp thư cá nhân, đếm chưa đọc trên Bell, đánh dấu đã đọc
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL DEFAULT 'SYSTEM', -- 'ADMIN' (Tab 1) | 'SYSTEM' (Tab 2)
    announcement_id UUID REFERENCES public.admin_announcements(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- e.g. 'AFFILIATE_APPROVED', 'LEAD_NEW', 'ENROLLMENT_MATCHED', 'REWARD_APPROVED', 'ADMIN_BROADCAST'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    action_url VARCHAR(255), -- Deep link: e.g. '/portal/leads/uuid'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    source_entity_type VARCHAR(50), -- 'leads', 'rewards', 'affiliate_profiles', 'lead_reconciliations'
    source_entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_category CHECK (category IN ('ADMIN', 'SYSTEM'))
);

-- Chỉ mục tối ưu hóa cho chuông Header đếm số lượng chưa đọc (O(1)):
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
ON public.user_notifications(user_id, is_read) 
WHERE is_read = FALSE;

-- Chỉ mục phân trang theo Tab cho CTV:
CREATE INDEX IF NOT EXISTS idx_user_notifications_tab 
ON public.user_notifications(user_id, category, created_at DESC);

-- Chỉ mục chống trùng lặp (Idempotency) cho sự kiện hệ thống:
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_notification_event 
ON public.user_notifications(user_id, event_type, source_entity_id) 
WHERE source_entity_id IS NOT NULL;
```

### 8.2. Thiết Kế Các Hàm Helper RPC Cần Thiết
1. **`fn_get_unread_notification_count(p_user_id UUID)`**:
   - Trả về: `{ total_unread: number, admin_unread: number, system_unread: number }`.
   - Được Header Bell gọi để cập nhật số trên badge.
2. **`fn_mark_notifications_read(p_user_id UUID, p_notification_ids UUID[], p_category TEXT)`**:
   - Đánh dấu đã đọc cho 1 thông báo cụ thể hoặc toàn bộ thông báo trong tab.
3. **`fn_create_system_notification(...)`**:
   - Helper function chạy với `SECURITY DEFINER` để các RPC khác (như `fn_reconcile_lead_enrollment`, `fn_approve_reward_v2`) gọi nội bộ an toàn, tự động bắt lỗi `EXCEPTION` để không làm gián đoạn nghiệp vụ chính.

---

## 9. KẾ HOẠCH & CAM KẾT BÀN GIAO C3.1

### 9.1. Tóm Tắt Kết Quả Bàn Giao Bước C3.1
1. **Kiểm kê mã nguồn & giao diện**: Xác định chính xác vị trí của nút Bell trên `AppLayout.tsx`, các route deep-link có sẵn và khoảng trống route `/portal/notifications`.
2. **Kiểm kê dữ liệu & phân quyền**: Xác nhận chưa có bảng thông báo nào trong CSDL; hệ thống RBAC `public.permissions` sẵn sàng mở rộng.
3. **Kiểm kê 11 sự kiện nghiệp vụ**: Định danh rõ ràng 11 điểm phát sinh sự kiện từ A1, A3, A4, A5, ánh xạ đầy đủ người nhận, tiêu đề, deep-link và tab hệ thống.
4. **Kiểm kê nền tảng email**: Xác minh Supabase Auth mailer đang chạy; đề xuất lộ trình Custom SMTP và kiến trúc hàng đợi outbox an toàn.
5. **Bản thiết kế C3.2 hoàn chỉnh**: Đã phác thảo DDL 2 bảng, các chỉ mục hiệu năng cao và các hàm RPC cần triển khai.

### 9.2. Tuân Thủ Quy Trình & Dừng Lại Theo Yêu Cầu
- **Cam kết**: Quá trình kiểm kê C3.1 hoàn toàn là thao tác Read-only. Không có thay đổi nào được thực hiện đối với cơ sở dữ liệu, không có migration mới nào được áp dụng, không có email nào được gửi đi.
- **Điểm dừng**: Dừng lại hoàn toàn sau khi lập báo cáo này và cập nhật nhật ký tiến độ dự án. Sẵn sàng nhận yêu cầu tiếp theo để bắt đầu triển khai C3.2.
