# ĐẶC TẢ CHUNG PHÂN HỆ THÔNG BÁO VÀ BẢN TIN CTV (C3.2)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_2_NOTIFICATION_MODULE_SPEC.md`  
**Ngày phê duyệt**: 08/10/2026  
**Trạng thái**: **CHÍNH THỨC — ĐÃ PHÊ DUYỆT ĐẶC TẢ (OFFICIAL SPECIFICATION)**  
**Phạm vi**: Đặc tả toàn diện phân hệ C3 (Giao diện CTV 2 tab, Header Bell, Phân quyền & Quản lý Admin/Staff, Ma trận sự kiện A1/A3/A4/A5, Kiến trúc CSDL & API, Thiết kế Email & Outbox Queue).  
**Giới hạn thực hiện**: Chỉ lập tài liệu đặc tả, chưa chạy migration, chưa sửa đổi code chức năng, chưa gửi email.

---

## MỤC LỤC
1. [Tổng Quan & Phạm Vi Triển Khai Module C3](#1-tổng-quan--phạm-vi-triển-khai-module-c3)
2. [Đặc Tả Trải Nghiệm Người Dùng & Điều Hướng (UX & Navigation)](#2-đặc-tả-trải-nghiệm-người-dùng--điều-hướng-ux--navigation)
3. [Ma Trận Sự Kiện Tự Động A1 / A3 / A4 / A5 (System Events)](#3-ma-trận-sự-kiện-tự-động-a1--a3--a4--a5-system-events)
4. [Đặc Tả Bản Tin Ban Quản Trị & Quản Lý Admin / Staff](#4-đặc-tả-bản-tin-ban-quản-trị--quản-lý-admin--staff)
5. [Đặc Tả Phân Quyền Nhân Viên (RBAC & Permissions)](#5-đặc-tả-phân-quyền-nhân-viên-rbac--permissions)
6. [Đặc Tả Cơ Sở Dữ Liệu & Chỉ Mục Hiệu Năng (Database Schema)](#6-đặc-tả-cơ-sở-dữ-liệu--chỉ-mục-hiệu-năng-database-schema)
7. [Đặc Tả Giao Diện Lập Trình Ứng Dụng (API Contracts & RPC Helpers)](#7-đặc-tả-giao-diện-lập-trình-ứng-dụng-api-contracts--rpc-helpers)
8. [Đặc Tả Mở Rộng Email & SMTP (Transactional Outbox Pattern)](#8-đặc-tả-mở-rộng-email--smtp-transactional-outbox-pattern)
9. [Kế Hoạch Phân Kỳ Triển Khai (Roadmap C3.3 - C3.6)](#9-kế-hoạch-phân-kỳ-triển-khai-roadmap-c33---c36)

---

## 1. TỔNG QUAN & PHẠM VI TRIỂN KHAI MODULE C3

### 1.1. Mục Tiêu Nghiệp Vụ
Module C3 xây dựng kênh tương tác và phản hồi thông tin hai chiều giữa Nhà trường và đội ngũ Cộng tác viên Tuyển sinh (CTV):
1. **Thông tin minh bạch, tức thời**: CTV nắm bắt biến động hồ sơ khách hàng, kết quả đối soát nhập học và thù lao 500.000 VNĐ ngay khi có phát sinh nghiệp vụ.
2. **Kênh truyền thông nội bộ chính thống**: Ban tuyển sinh phát đi thông báo chính sách, cẩm nang, tài liệu thưởng và thông tin khẩn cấp đến toàn mạng lưới CTV hoặc từng nhóm đối tượng cụ thể.
3. **Phân tách trải nghiệm người dùng**: Giao diện nhận thông tin của CTV tách bạch rõ ràng giữa *Chỉ đạo/Chính sách từ Ban quản trị* và *Biến động nghiệp vụ từ hệ thống*, tránh gây nhiễu thông tin.
4. **Bảo mật và toàn vẹn**: Phân quyền chặt chẽ quy trình duyệt/xuất bản thông báo đối với cán bộ tuyển sinh (Staff), chống trùng lặp sự kiện và cô lập hoàn toàn tài nguyên theo vai trò.

### 1.2. Phân Định Ranh Giới (Boundary Definition)
- **Trong phạm vi C3**:
  - Toàn bộ trải nghiệm thông báo của CTV: Bell trên header, badge đếm số lượng chưa đọc, popover xem nhanh, màn hình `/portal/notifications` với đúng 2 tab.
  - Sidebar CTV bổ sung mục "Thông báo".
  - Phân hệ quản lý thông báo dành cho Admin/Staff tại `/admin/notifications`: Soạn nháp, xem trước, chọn phạm vi đối tượng, xuất bản, thu hồi.
  - Bổ sung 4 quyền RBAC mới cho Staff trong bảng `permissions`.
  - Tự động sinh thông báo từ 11 điểm sự kiện cốt lõi của A1, A3, A4, A5.
  - Cơ chế đồng bộ số đếm chưa đọc O(1), đánh dấu đã đọc một mục / đánh dấu tất cả đã đọc theo tab.
  - Thiết kế kiến trúc Outbox Queue và mẫu dữ liệu phục vụ gửi Email/SMTP (triển khai mã nguồn ở giai đoạn tiếp theo).
- **Ngoài phạm vi C3 (Chưa thực hiện ở giai đoạn này)**:
  - Chưa triển khai hòm thư/chuông thông báo nội bộ riêng cho Admin/Staff (Admin/Staff chỉ có chuông xem nhanh hiện tại, không gọi API hộp thư CTV).
  - Chưa cấu hình gửi email thực tế ra bên ngoài mạng hay kết nối máy chủ SMTP.
  - Chưa tích hợp dịch vụ Push Notification trên di động hoặc Web Push Service Worker.

---

## 2. ĐẶC TẢ TRẢI NGHIỆM NGƯỜI DÙNG & ĐIỀU HƯỚNG (UX & NAVIGATION)

### 2.1. Nút Chuông Header (Notification Bell)
Áp dụng trên `AppLayout.tsx`:
- **Độ hiển thị theo vai trò**:
  - Khi người dùng đăng nhập là **CTV (`affiliate_active` / `affiliate_pending`)**: Bell kích hoạt đầy đủ tính năng: gọi API lấy số đếm chưa đọc của chính CTV, hiển thị badge màu đỏ/cam, mở popover 5 thông báo mới nhất kèm liên kết tới `/portal/notifications`.
  - Khi người dùng đăng nhập là **Admin / Staff**: Bell hiển thị trạng thái trung tính, không gọi API hộp thư CTV, không hiển thị số liệu của CTV. Popover của Admin/Staff hiển thị thông tin hỗ trợ nội bộ hoặc liên kết tắt tới `/admin/notifications`.
- **Badge số lượng chưa đọc**:
  - Không hiển thị badge khi số lượng chưa đọc bằng 0.
  - Hiển thị chấm số lượng khi $1 \le \text{unread} \le 99$.
  - Hiển thị `99+` khi số lượng chưa đọc vượt quá 99.
  - Màu sắc: Nền đỏ cam `bg-rose-600 text-white font-bold text-[10px] rounded-full px-1.5 py-0.2 shadow-sm`.
- **Popover xem nhanh (Dropdown)**:
  - Header popover: Tiêu đề "Thông báo", nút đánh dấu tất cả đã đọc (nếu có thông báo chưa đọc), nút đóng.
  - Thân popover: Danh sách 5 thông báo mới nhất (kết hợp cả 2 nguồn, sắp xếp theo thời gian tạo giảm dần). Mỗi mục hiển thị icon theo loại sự kiện, tiêu đề, thời gian tương đối (VD: *5 phút trước*, *hôm qua*), trạng thái chưa đọc (chấm xanh).
  - Chân popover: Nút bấm toàn chiều rộng *"Xem tất cả thông báo"* dẫn trực tiếp tới `/portal/notifications`.
  - Thao tác nhấp vào mục: Tự động đánh dấu mục đó đã đọc, đóng popover và điều hướng ngay tới deep-link của thông báo.

### 2.2. Màn Hình CTV `/portal/notifications`
Bố cục toàn màn hình bao gồm Header trang, bộ đếm tổng quan, thanh chuyển Tab và danh sách thông báo:
- **Đúng 2 Tab độc lập**:
  1. **Tab 1: "Thông báo từ Ban quản trị" (`category = 'ADMIN'`)**:
     - Hiển thị các chính sách, quy chế, thư ngỏ, thông tin tuyển sinh do Ban tuyển sinh / Quản trị viên chủ động biên soạn và phát hành.
     - Badge trên tab: Hiển thị số lượng chưa đọc riêng của Tab 1 (ví dụ: `Ban quản trị (2)`).
  2. **Tab 2: "Thông báo từ hệ thống" (`category = 'SYSTEM'`)**:
     - Hiển thị các biến động tự động sinh ra từ quá trình giới thiệu học viên (hồ sơ mới, cập nhật chăm sóc, kết quả nhập học, duyệt chi thù lao).
     - Badge trên tab: Hiển thị số lượng chưa đọc riêng của Tab 2 (ví dụ: `Hệ thống (5)`).
- **Thanh công cụ trang thông báo**:
  - Bộ lọc trạng thái: *Tất cả* | *Chưa đọc* | *Đã đọc*.
  - Nút hành động nhanh: *"Đánh dấu tất cả đã đọc"* (chỉ áp dụng cho tab hiện tại đang mở).
- **Thẻ hiển thị thông báo (Notification Card)**:
  - Biểu tượng nhận diện (Icon + màu sắc riêng cho từng loại sự kiện: Xanh lá cho duyệt thù lao/nhập học, Vàng cam cho chờ duyệt/đăng ký mới, Đỏ cho từ chối/hủy, Xanh dương cho thông báo BQT).
  - Tiêu đề thông báo đậm, rõ ràng.
  - Nội dung mô tả ngắn gọn (hỗ trợ hiển thị Markdown rút gọn cho Tab 1).
  - Thời gian tạo theo định dạng chuẩn Việt Nam: `HH:mm - DD/MM/YYYY`.
  - Nhãn phân loại (Tag/Badge): Ví dụ `Chính sách`, `Khẩn cấp`, `Thù lao`, `Tuyển sinh`.
  - Trạng thái chưa đọc: Dải màu nền nổi bật nhẹ (`bg-blue-50/50` hoặc `border-l-4 border-blue-900`) và chấm tròn nhận diện.
  - Nút bấm hành động: Nút dẫn tới deep-link nghiệp vụ (xem chi tiết lead, xem tổng quan).
- **Trạng thái rỗng (Empty State)**:
  - Khi không có thông báo nào trong tab: Hiển thị minh họa trang nhã kèm thông điệp:
    - Tab 1: *"Hiện chưa có thông báo mới từ Ban quản trị trường."*
    - Tab 2: *"Bạn chưa có thông báo biến động hệ thống nào."*

### 2.3. Điều Hướng Sidebar CTV (`src/config/navConfig.ts`)
Bổ sung mục menu thứ tư vào danh sách `AFFILIATE_NAV_ITEMS`:
```typescript
{
  id: 'notifications',
  title: 'Thông báo',
  path: '/portal/notifications',
  icon: Bell,
  isActiveMatch: (currentPath: string) => {
    const clean = currentPath.split('?')[0].split('#')[0];
    return clean === '/portal/notifications';
  },
}
```

### 2.4. Quy Tắc Deep-Link Duy Nhất Cho Từng Sự Kiện
Mọi thông báo bắt buộc phải chứa một đường dẫn đích (`action_url`) hợp lệ, tồn tại thực tế trong hệ thống và tuyệt đối **không dẫn CTV vào các route nội bộ của Admin**:

| Nhóm nghiệp vụ | Điểm đến duy nhất (Target Deep-link) | Giao diện hiển thị thực tế | Giới hạn & Xử lý fallback |
|:---|:---|:---|:---|
| **Hồ sơ CTV được duyệt** | `/portal` | `AffiliateDashboard` | Mở trực tiếp Dashboard chính của CTV với mã giới thiệu và link chia sẻ. |
| **Hồ sơ CTV bị từ chối / treo** | `/pending` | `AffiliatePendingScreen` | Hiển thị màn hình chờ duyệt / trạng thái từ chối kèm lý do thẩm định. |
| **Khách hàng mới / Tiến độ tư vấn** | `/portal/leads/:id` | `AffiliateLeadDetailView` | Mở màn hình chi tiết tương tác khách hàng. Fallback về `/portal/leads` nếu ID không tồn tại. |
| **Nhập học thành công / Hủy nhập học** | `/portal/leads/:id` | `AffiliateLeadDetailView` | Mở chi tiết khách hàng để xem mã nhập học `external_admission_code` và biên lai. |
| **Thù lao được duyệt (A5)** | `/portal` | `AffiliateDashboard` | CTV xem biến động tăng thù lao lũy kế tại Khối thù lao trên Dashboard. *(Ghi chú: CTV chưa có trang chi tiết thù lao riêng, điều hướng về `/portal` là phương án chuẩn xác nhất hiện nay)*. |
| **Thù lao bị từ chối / hủy (A5)** | `/portal/leads/:id` | `AffiliateLeadDetailView` | Dẫn về lead gốc để xem lý do từ chối chi trả hoặc lý do thu hồi. |
| **Bản tin Ban quản trị (Tab 1)** | `/portal/notifications?tab=admin&id=:id` | Modal hoặc chi tiết trong tab | Mở xem toàn văn nội dung Markdown bản tin. |

---

## 3. MA TRẬN SỰ KIỆN TỰ ĐỘNG A1 / A3 / A4 / A5 (SYSTEM EVENTS)

Tất cả các sự kiện này được tạo tự động phía máy chủ, lưu vào bảng `user_notifications` với `category = 'SYSTEM'`, gán trực tiếp cho `user_id` của CTV thụ hưởng.

### Bảng Ma Trận Chi Tiết 11 Điểm Sự Kiện Nghiệp Vụ

| STT | Mã Sự Kiện (`event_type`) | Module Gốc | Điểm Kích Hoạt (Trigger Point) | Đối Tượng Nhận (`user_id`) | Tiêu Đề Mặc Định | Nội Dung Mẫu (Template) | Deep-Link (`action_url`) | Khóa Chống Trùng Lặp (`uq_idempotency`) |
|:---:|:---|:---:|:---|:---|:---|:---|:---|:---|
| **1** | `AFFILIATE_REGISTERED` | **A1** | `server.ts`<br>`POST /api/v1/auth/register` | CTV đăng ký | Chào mừng bạn gia nhập STHC! | Hồ sơ đăng ký cộng tác viên tuyển sinh của bạn đã được ghi nhận và đang chờ Ban tuyển sinh xét duyệt. | `/pending` | `(user_id, 'AFFILIATE_REGISTERED', profile_id)` |
| **2** | `AFFILIATE_APPROVED` | **A1** | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/review` (APPROVE) | CTV được duyệt | Hồ sơ CTV đã được phê duyệt! | Chúc mừng bạn! Tài khoản CTV đã được kích hoạt thành công với mã giới thiệu chính thức: **{affiliate_code}**. Bắt đầu chia sẻ khóa học ngay hôm nay! | `/portal` | `(user_id, 'AFFILIATE_APPROVED', profile_id)` |
| **3** | `AFFILIATE_REJECTED` | **A1** | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/review` (REJECT) | CTV bị từ chối | Hồ sơ CTV chưa được duyệt | Ban tuyển sinh rất tiếc chưa thể phê duyệt hồ sơ CTV của bạn vào lúc này. Lý do: *{review_note}*. Vui lòng liên hệ ban hỗ trợ nếu cần giải đáp. | `/pending` | `(user_id, 'AFFILIATE_REJECTED', profile_id)` |
| **4** | `AFFILIATE_SUSPENDED` | **A1** | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/suspend` | CTV bị tạm ngưng | Tài khoản CTV tạm ngưng hoạt động | Tài khoản cộng tác viên của bạn đã bị tạm ngưng. Lý do: *{reason}*. Các liên kết chia sẻ tạm thời không ghi nhận kết quả. | `/pending` | `(user_id, 'AFFILIATE_SUSPENDED', profile_id)` |
| **5** | `AFFILIATE_REACTIVATED` | **A1** | `server.ts`<br>`POST /api/v1/admin/affiliates/:id/reactivate` | CTV được mở lại | Tài khoản CTV đã được kích hoạt lại | Tài khoản CTV của bạn đã hoạt động bình thường trở lại. Bạn có thể tiếp tục chia sẻ khóa học và nhận thù lao tuyển sinh. | `/portal` | `(user_id, 'AFFILIATE_REACTIVATED', profile_id)` |
| **6** | `LEAD_SUBMITTED` | **A3** | `server.ts`<br>`POST /api/v1/public/leads` | CTV giới thiệu lead | Khách hàng mới đăng ký tư vấn! | Khách hàng **{lead_name}** vừa đăng ký tư vấn khóa học **{course_title}** thông qua liên kết giới thiệu của bạn. | `/portal/leads/:id` | `(user_id, 'LEAD_SUBMITTED', lead_id)` |
| **7** | `LEAD_COUNSELING_UPDATED` | **A3** | `server.ts`<br>`POST /api/v1/admin/leads/:id/care-history` | CTV giới thiệu lead | Cập nhật tiến độ chăm sóc khách hàng | Trạng thái tư vấn hồ sơ **{lead_name}** đã được cập nhật thành: **{counseling_status_label}**. Ghi chú: *{staff_note}*. | `/portal/leads/:id` | `(user_id, 'LEAD_COUNSELING_UPDATED', care_history_id)` |
| **8** | `ENROLLMENT_MATCHED` | **A4** | PostgreSQL RPC<br>`fn_reconcile_lead_enrollment` | CTV giới thiệu lead | Học viên đã nhập học thành công! | Khách hàng **{lead_name}** đã hoàn tất thủ tục nhập học và nộp học phí khóa **{course_title}** (Mã hồ sơ: **{admission_code}**). Khoản thù lao 500.000 VNĐ đang chờ phê duyệt. | `/portal/leads/:id` | `(user_id, 'ENROLLMENT_MATCHED', reconciliation_id)` |
| **9** | `ENROLLMENT_VOIDED` | **A4** | PostgreSQL RPC<br>`fn_void_lead_reconciliation` | CTV giới thiệu lead | Điều chỉnh kết quả đối soát nhập học | Kết quả đối soát của khách hàng **{lead_name}** đã được điều chỉnh hủy. Lý do: *{void_reason}*. | `/portal/leads/:id` | `(user_id, 'ENROLLMENT_VOIDED', reconciliation_id)` |
| **10** | `REWARD_APPROVED` | **A5** | PostgreSQL RPC<br>`fn_approve_reward_v2` | CTV thụ hưởng | Thù lao 500.000 VNĐ đã được phê duyệt! | Khoản thù lao tuyển sinh 500.000 VNĐ cho học viên **{lead_name}** đã được duyệt chi. Khoản tiền sẽ được chuyển về tài khoản ngân hàng của bạn theo kỳ thanh toán. | `/portal` | `(user_id, 'REWARD_APPROVED', reward_id)` |
| **11** | `REWARD_VOIDED` | **A5** | PostgreSQL RPC<br>`fn_reject_reward_v2` / `fn_void_reward_v2` | CTV thụ hưởng | Thông báo điều chỉnh khoản thù lao | Khoản thù lao tuyển sinh cho học viên **{lead_name}** đã bị từ chối hoặc thu hồi. Lý do: *{reason}*. | `/portal/leads/:id` | `(user_id, 'REWARD_VOIDED', reward_id)` |

---

## 4. ĐẶC TẢ BẢN TIN BAN QUẢN TRỊ & QUẢN LÝ ADMIN / STAFF

Đối với **Tab 1: Thông báo từ Ban quản trị**, hệ thống xây dựng mô hình phát hành bản tin chủ động (Broadcast / Targeted Announcements):

### 4.1. Vòng Đời Bản Tin (Announcement State Machine)
```
       [ Soạn thảo mới ]
               |
               v
          +---------+
          |  DRAFT  | <----+ (Chỉnh sửa nội dung / phạm vi)
          +---------+      |
               |           |
        [ Xuất bản ]       |
               |           |
               v           |
        +-------------+    |
        |  PUBLISHED  |----+ (Không thể sửa nội dung sau khi xuất bản)
        +-------------+
               |
          [ Thu hồi ]
               |
               v
         +-----------+
         |  REVOKED  |
         +-----------+
```
1. **DRAFT (Bản nháp)**:
   - Admin/Staff có quyền tạo bản ghi trong bảng `admin_announcements`.
   - Có thể cập nhật tiêu đề, tóm tắt, nội dung Markdown, danh mục (`GENERAL`, `POLICY`, `URGENT`, `EVENT`), phạm vi đối tượng (`ALL`, `STATUS_FILTER`, `SPECIFIC`).
   - Chưa phát sinh bất kỳ bản ghi nào trong hòm thư cá nhân của CTV.
   - Có thể xóa bỏ bản nháp nếu không còn nhu cầu.
2. **PUBLISHED (Đã xuất bản)**:
   - Khi thực hiện hành động xuất bản (`action = 'PUBLISH'`), hệ thống ghi nhận `published_at = NOW()`, `published_by = auth.uid()`.
   - Trạng thái chuyển sang `PUBLISHED`. Khóa sửa đổi toàn bộ nội dung bản tin.
   - **Cơ chế phân phối (Fan-out Distribution)**: Hệ thống tự động tạo các bản ghi tương ứng trong bảng `user_notifications` cho toàn bộ danh sách CTV thỏa mãn phạm vi đối tượng được chọn (`category = 'ADMIN'`, `announcement_id = announcement.id`).
   - CTV đăng nhập thấy ngay thông báo trên Tab 1 và số đếm Bell tăng lên.
3. **REVOKED (Đã thu hồi)**:
   - Áp dụng khi bản tin có thông tin sai sót hoặc hết hiệu lực khẩn cấp.
   - Ghi nhận `revoked_at = NOW()`, `revoked_by = auth.uid()`.
   - Hệ thống tự động đánh dấu thu hồi hoặc xóa bỏ các thông báo tương ứng trong `user_notifications` của CTV, đồng thời cập nhật lại số đếm chưa đọc trên Bell của các CTV bị ảnh hưởng.

### 4.2. Phân Nhóm Đối Tượng Nhận (Recipient Scopes)
1. **Toàn bộ CTV (`recipient_scope = 'ALL'`)**:
   - Gửi tới tất cả người dùng có hồ sơ trong bảng `affiliate_profiles`.
2. **Theo trạng thái hồ sơ (`recipient_scope = 'STATUS_FILTER'`)**:
   - `recipient_filter = {"status": ["ACTIVE"]}`: Chỉ gửi cho các CTV đang hoạt động.
   - `recipient_filter = {"status": ["PENDING_REVIEW"]}`: Gửi thông báo nhắc nhở nộp/bổ sung giấy tờ cho nhóm CTV chờ xét duyệt.
   - `recipient_filter = {"status": ["SUSPENDED"]}`: Gửi thông báo cho nhóm đang bị tạm ngưng.
3. **Chỉ định CTV cụ thể (`recipient_scope = 'SPECIFIC'`)**:
   - `recipient_filter = {"affiliate_ids": ["uuid-1", "uuid-2"]}`: Gửi đích danh theo danh sách ID hoặc mã CTV (dành cho khen thưởng Top CTV, cảnh báo vi phạm cá nhân).

### 4.3. Giao Diện Quản Lý Admin/Staff (`/admin/notifications`)
Được tích hợp vào hệ thống Quản trị:
- **Bảng danh sách bản tin**:
  - Cột: Tiêu đề, Danh mục, Phạm vi nhận, Trạng thái (Draft/Published/Revoked), Ngày tạo, Người tạo, Ngày xuất bản.
  - Bộ lọc: Theo trạng thái, theo danh mục, tìm kiếm theo từ khóa tiêu đề.
- **Form soạn thảo / Chỉnh sửa**:
  - Tiêu đề (bắt buộc, tối đa 255 ký tự).
  - Tóm tắt ngắn (hiển thị trên popover và danh sách).
  - Trình soạn thảo nội dung Markdown (hỗ trợ in đậm, gạch đầu dòng, liên kết, bảng biểu).
  - Chọn danh mục: `GENERAL` (Thông thường), `POLICY` (Chính sách/Quy chế), `URGENT` (Khẩn cấp), `EVENT` (Sự kiện/Đua top).
  - Chọn đối tượng nhận (Radio: Tất cả CTV, Theo trạng thái, Chọn cụ thể).
  - Nút: *"Lưu nháp"*, *"Xem trước (Preview)"*, *"Xuất bản ngay"*.
- **Hành động trên danh sách**:
  - Đối với DRAFT: Sửa, Xóa, Xuất bản.
  - Đối với PUBLISHED: Xem chi tiết thống kê đã đọc/chưa đọc, Thu hồi.
  - Đối với REVOKED: Xem chi tiết lịch sử thu hồi.

---

## 5. ĐẶC TẢ PHÂN QUYỀN NHÂN VIÊN (RBAC & PERMISSIONS)

Tích hợp trực tiếp vào kiến trúc bảng `public.permissions` hiện có (theo migration `20261006000001_a5_permissions_foundation.sql`).

### 5.1. Bổ Sung 4 Mã Quyền Quản Trị Thông Báo Mới
```sql
INSERT INTO public.permissions (code, name, description) VALUES
('notifications.view', 'Xem danh sách thông báo', 'Cho phép xem danh sách các bản tin và thông báo do Ban quản trị soạn thảo'),
('notifications.create', 'Soạn thảo thông báo', 'Cho phép tạo mới bản nháp (Draft) và chỉnh sửa thông báo chưa xuất bản'),
('notifications.publish', 'Xuất bản thông báo', 'Cho phép phát hành thông báo ra toàn mạng lưới CTV hoặc nhóm chỉ định'),
('notifications.revoke', 'Thu hồi thông báo', 'Cho phép thu hồi bản tin đã xuất bản khi có sai sót hoặc hết hiệu lực')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
```

### 5.2. Nguyên Tắc Thẩm Quyền Phân Định
1. **Quản trị viên (`admin`)**: Tự động sở hữu toàn bộ các quyền thông báo thông qua logic hàm `fn_get_user_permissions`.
2. **Cán bộ tuyển sinh (`staff`)**:
   - Chỉ được thực hiện các thao tác khi nhóm quyền được gán có chứa quyền tương ứng và `is_active = TRUE`.
   - Có quyền `notifications.view`: Chỉ được xem danh sách và nội dung thông báo.
   - Có quyền `notifications.create`: Được phép soạn nháp, sửa nháp do chính mình tạo (hoặc của đơn vị).
   - Có quyền `notifications.publish`: Được duyệt xuất bản đưa vào hòm thư CTV.
   - Có quyền `notifications.revoke`: Được quyền thu hồi thông báo đã xuất bản.
3. **Cộng tác viên (`affiliate`)**:
   - Tuyệt đối **không có quyền** truy cập các bảng hay API quản trị thông báo (`notifications.*`).
   - CTV chỉ được phép đọc các bản ghi trong `user_notifications` thuộc về chính `user_id` của mình thông qua RLS policies và hàm API xác thực.

---

## 6. ĐẶC TẢ CƠ SỞ DỮ LIỆU & CHỈ MỤC HIỆU NĂNG (DATABASE SCHEMA)

Dưới đây là đặc tả chuẩn DDL 2 bảng dữ liệu cốt lõi, cùng các ràng buộc tính toàn vẹn và chỉ mục hiệu năng O(1):

### 6.1. Bảng `public.admin_announcements` (Bản tin Ban quản trị)
Lưu trữ thông tin gốc của các thông cáo, chỉ đạo từ Ban tuyển sinh.
```sql
CREATE TABLE IF NOT EXISTS public.admin_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content_markdown TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    recipient_scope VARCHAR(30) NOT NULL DEFAULT 'ALL',
    recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_announcement_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT chk_announcement_category CHECK (category IN ('GENERAL', 'POLICY', 'URGENT', 'EVENT')),
    CONSTRAINT chk_announcement_scope CHECK (recipient_scope IN ('ALL', 'STATUS_FILTER', 'SPECIFIC'))
);

-- Chỉ mục lọc trạng thái và thời gian tạo
CREATE INDEX IF NOT EXISTS idx_admin_announcements_status 
ON public.admin_announcements(status);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_created_at 
ON public.admin_announcements(created_at DESC);
```

### 6.2. Bảng `public.user_notifications` (Hộp thư thông báo CTV)
Phục vụ toàn bộ dữ liệu hiển thị cho CTV (cả Tab 1 BQT và Tab 2 Hệ thống), chuông Header đếm số lượng chưa đọc, đánh dấu đã đọc.
```sql
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
    announcement_id UUID REFERENCES public.admin_announcements(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    action_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    source_entity_type VARCHAR(50),
    source_entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_notification_category CHECK (category IN ('ADMIN', 'SYSTEM'))
);

-- 1. Chỉ mục siêu tốc cho Bell Header đếm số chưa đọc (O(1) Partial Index):
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread_count 
ON public.user_notifications(user_id, category) 
WHERE is_read = FALSE;

-- 2. Chỉ mục phân trang theo Tab cho CTV:
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_tab 
ON public.user_notifications(user_id, category, created_at DESC);

-- 3. Chỉ mục kiểm tra chống trùng lặp sự kiện tự động (Idempotency):
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_idempotency 
ON public.user_notifications(user_id, event_type, source_entity_id) 
WHERE source_entity_id IS NOT NULL;

-- 4. Chỉ mục liên kết thu hồi theo bản tin Ban quản trị:
CREATE INDEX IF NOT EXISTS idx_user_notifications_announcement_id 
ON public.user_notifications(announcement_id) 
WHERE announcement_id IS NOT NULL;
```

### 6.3. Chính Sách Bảo Mật Cấp Hàng (Row Level Security - RLS)
- **Bảng `admin_announcements`**:
  - `authenticated` có quyền `SELECT` nếu `status = 'PUBLISHED'` hoặc nếu là Staff có quyền `notifications.view` / Admin.
  - Chỉ Admin hoặc Staff có quyền `notifications.create`/`publish`/`revoke` mới được `INSERT`/`UPDATE`.
  - Khóa xóa cứng: Không cho phép `DELETE` bản tin đã từng xuất bản (`status != 'DRAFT'`).
- **Bảng `user_notifications`**:
  - `SELECT`: CTV chỉ được đọc bản ghi có `user_id = auth.uid()`.
  - `UPDATE`: CTV chỉ được sửa cột `is_read` và `read_at` của chính mình.
  - `INSERT`/`DELETE`: Chỉ thực hiện qua hàm RPC nội bộ có cờ `SECURITY DEFINER` hoặc tài khoản `service_role`.

---

## 7. ĐẶC TẢ GIAO DIỆN LẬP TRÌNH ỨNG DỤNG (API CONTRACTS & RPC HELPERS)

### 7.1. Nhóm API Dành Cho Cộng Tác Viên (Affiliate Portal)

#### 1. Lấy số lượng thông báo chưa đọc (Header Bell Polling / Mount)
- **Giao thức**: `GET /api/v1/portal/notifications/unread-count`
- **Quyền**: CTV đăng nhập hợp lệ.
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "total_unread": 7,
      "admin_unread": 2,
      "system_unread": 5
    }
  }
  ```

#### 2. Lấy danh sách thông báo phân trang theo Tab
- **Giao thức**: `GET /api/v1/portal/notifications?category=ADMIN|SYSTEM&is_read=true|false&page=1&limit=20`
- **Quyền**: CTV đăng nhập hợp lệ.
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "e0b0e513-8b77-4b68-9a48-43fb1b1062b1",
          "category": "SYSTEM",
          "event_type": "REWARD_APPROVED",
          "title": "Thù lao 500.000 VNĐ đã được phê duyệt!",
          "content": "Khoản thù lao tuyển sinh cho học viên Nguyễn Văn A đã được duyệt chi...",
          "action_url": "/portal",
          "is_read": false,
          "read_at": null,
          "source_entity_type": "rewards",
          "source_entity_id": "838e1fe7-87eb-44c1-84e1-ebf727ce61b5",
          "created_at": "2026-10-08T08:30:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total_items": 42,
        "total_pages": 3,
        "has_more": true
      }
    }
  }
  ```

#### 3. Đánh dấu đã đọc một hoặc nhiều thông báo
- **Giao thức**: `POST /api/v1/portal/notifications/mark-read`
- **Body**:
  ```json
  {
    "notification_ids": ["e0b0e513-8b77-4b68-9a48-43fb1b1062b1"]
  }
  ```
- **Response**: `{"success": true, "updated_count": 1}`

#### 4. Đánh dấu tất cả đã đọc theo Tab
- **Giao thức**: `POST /api/v1/portal/notifications/mark-all-read`
- **Body**:
  ```json
  {
    "category": "ADMIN" // hoặc "SYSTEM"
  }
  ```
- **Response**: `{"success": true, "updated_count": 5}`

---

### 7.2. Nhóm API Quản Trị Thông Báo (Admin / Staff Portal)

#### 1. Danh sách bản tin Ban quản trị
- **Giao thức**: `GET /api/v1/admin/notifications/announcements?status=...&category=...&page=1&limit=20`
- **Quyền**: Admin hoặc Staff có quyền `notifications.view`.

#### 2. Tạo bản nháp mới
- **Giao thức**: `POST /api/v1/admin/notifications/announcements`
- **Quyền**: Admin hoặc Staff có quyền `notifications.create`.
- **Body**:
  ```json
  {
    "title": "Thông báo quy chế thù lao tuyển sinh đợt 2",
    "summary": "Áp dụng chính sách thưởng bổ sung cho đợt tuyển sinh tháng 10/2026",
    "content_markdown": "### Kính gửi các anh/chị CTV...\n\nNhà trường xin thông báo...",
    "category": "POLICY",
    "recipient_scope": "STATUS_FILTER",
    "recipient_filter": { "status": ["ACTIVE"] }
  }
  ```

#### 3. Chỉnh sửa bản nháp
- **Giao thức**: `PUT /api/v1/admin/notifications/announcements/:id`
- **Quyền**: Admin hoặc Staff có quyền `notifications.create` (chỉ cho phép sửa khi `status = 'DRAFT'`).

#### 4. Xuất bản bản tin
- **Giao thức**: `POST /api/v1/admin/notifications/announcements/:id/publish`
- **Quyền**: Admin hoặc Staff có quyền `notifications.publish`.

#### 5. Thu hồi bản tin
- **Giao thức**: `POST /api/v1/admin/notifications/announcements/:id/revoke`
- **Quyền**: Admin hoặc Staff có quyền `notifications.revoke`.

---

### 7.3. Thiết Kế Các Hàm Database RPC Helpers

1. **`fn_get_unread_notification_count(p_user_id UUID)`**:
   - Trả về JSON: `{"total_unread": int, "admin_unread": int, "system_unread": int}`.
   - Truy vấn cực nhanh qua Partial Index `idx_user_notifications_unread_count`.
2. **`fn_mark_notifications_read(p_user_id UUID, p_ids UUID[], p_category TEXT)`**:
   - Cập nhật an toàn `is_read = TRUE, read_at = NOW()` với điều kiện `user_id = p_user_id`.
3. **`fn_publish_announcement(p_announcement_id UUID, p_publisher_id UUID)`**:
   - Kiểm tra trạng thái hiện tại phải là `DRAFT`.
   - Cập nhật trạng thái sang `PUBLISHED`, ghi nhận người xuất bản và thời gian.
   - Truy vấn danh sách `user_id` thỏa mãn `recipient_scope` và `recipient_filter` từ `affiliate_profiles`.
   - Thực hiện `INSERT INTO public.user_notifications` hàng loạt (Bulk Fan-out) với `category = 'ADMIN'`.
4. **`fn_create_system_notification(...)`**:
   - Hàm nội bộ `SECURITY DEFINER` phục vụ các RPC nghiệp vụ (`fn_reconcile_lead_enrollment`, `fn_approve_reward_v2`):
   ```sql
   CREATE OR REPLACE FUNCTION public.fn_create_system_notification(
       p_user_id UUID,
       p_event_type TEXT,
       p_title TEXT,
       p_content TEXT,
       p_action_url TEXT,
       p_source_entity_type TEXT,
       p_source_entity_id UUID,
       p_metadata JSONB DEFAULT '{}'::jsonb
   ) RETURNS UUID
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public
   AS $$
   DECLARE
       v_notif_id UUID;
   BEGIN
       INSERT INTO public.user_notifications (
           user_id, category, event_type, title, content, action_url,
           source_entity_type, source_entity_id, metadata
       ) VALUES (
           p_user_id, 'SYSTEM', p_event_type, p_title, p_content, p_action_url,
           p_source_entity_type, p_source_entity_id, p_metadata
       )
       ON CONFLICT (user_id, event_type, source_entity_id) DO NOTHING
       RETURNING id INTO v_notif_id;
       
       RETURN v_notif_id;
   EXCEPTION WHEN OTHERS THEN
       -- Bảo vệ nghiệp vụ chính: Nếu có lỗi thông báo, ghi log và không rollback giao dịch gốc
       RAISE WARNING 'fn_create_system_notification failed: %', SQLERRM;
       RETURN NULL;
   END;
   $$;
   ```

---

## 8. ĐẶC TẢ MỞ RỘNG EMAIL & SMTP (TRANSACTIONAL OUTBOX PATTERN)

Phần thiết kế này chuẩn bị kiến trúc sẵn sàng để tích hợp gửi Email mà **không làm chậm hoặc rollback các giao dịch nghiệp vụ cốt lõi**.

### 8.1. Nguyên Lý Thiết Kế: Transactional Outbox Pattern
```
[ Nghiệp Vụ Phát Sinh (VD: Duyệt thù lao) ]
                    |
     (Cùng một Database Transaction)
     +--------------+---------------+
     |                              |
     v                              v
[ user_notifications ]     [ email_outbox_queue ]
  (Hiển thị App ngay)        (Trạng thái: PENDING)
                                    |
                            [ Background Worker ] (Chạy định kỳ 30s)
                                    |
                           [ Gửi qua SMTP Server ]
                                    |
                           +--------+--------+
                           |                 |
                        (Thành công)      (Thất bại)
                           |                 |
                           v                 v
                        [ SENT ]     [ RETRY / FAILED ]
```

### 8.2. Thiết Kế Bảng Hàng Đợi Email (`email_outbox_queue`)
```sql
CREATE TABLE IF NOT EXISTS public.email_outbox_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'SENT', 'FAILED'
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_email_status CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending 
ON public.email_outbox_queue(created_at ASC) 
WHERE status = 'PENDING';
```

### 8.3. Thiết Kế Quản Lý Cấu Hình SMTP Trong Quản Trị Hệ Thống (Dành Cho Giai Đoạn Sau)
1. Bổ sung nhóm cấu hình chuyên biệt `SMTP_SETTINGS` trong bảng `system_settings`:
   - `smtp_host`: Địa chỉ máy chủ (VD: `smtp.gmail.com` hoặc `smtp.sendgrid.net`).
   - `smtp_port`: Cổng kết nối (`465` SSL hoặc `587` TLS).
   - `smtp_secure`: Cờ mã hóa SSL/TLS.
   - `smtp_user`: Tài khoản xác thực gửi mail.
   - `smtp_pass_encrypted`: Mật khẩu ứng dụng được mã hóa an toàn (AES-256).
   - `smtp_from_email`: Địa chỉ người gửi hiển thị (VD: `tuyensinh@sthc.edu.vn`).
   - `smtp_from_name`: Tên người gửi hiển thị (VD: `Trường Cao Đẳng STHC - Ban Tuyển Sinh`).
2. Yêu cầu bảo mật:
   - Chỉ duy nhất tài khoản Quản trị viên tối cao (`admin`) mới có quyền cấu hình hoặc sửa đổi.
   - Giao diện Admin cung cấp nút *"Gửi thử nghiệm (Send Test Email)"* trước khi lưu cấu hình chính thức.

---

## 9. KẾ HOẠCH PHÂN KỲ TRIỂN KHAI (ROADMAP C3.3 - C3.6)

Tuân thủ nghiêm ngặt nguyên tắc chia nhỏ nhiệm vụ, kiểm chứng từng bước và không làm ảnh hưởng đến hoạt động hiện tại:

- **Bước C3.2 (Hiện tại)**: **HOÀN THÀNH CHỐT ĐẶC TẢ CHUNG**. Lập tài liệu `/docs/C3_2_NOTIFICATION_MODULE_SPEC.md` và cập nhật nhật ký dự án `/docs/PROJECT_NOTE.md`. **Dừng lại tại đây.**
- **Bước C3.3A — Dữ liệu thông báo & Phân quyền**: Tạo migration cho 2 bảng `admin_announcements`, `user_notifications`, 4 quyền RBAC, các RPC helpers và RLS policies.
- **Bước C3.3B — API Thông báo CTV & Admin**: Xây dựng endpoints tại `server.ts` cho số đếm chưa đọc, danh sách phân trang, đánh dấu đã đọc, tạo nháp và xuất bản bản tin.
- **Bước C3.4 — Tích hợp sự kiện tự động (A1, A3, A4, A5)**: Gắn triggers/hooks vào các luồng nghiệp vụ duyệt CTV, nhận lead mới, đối soát nhập học và phê duyệt thù lao.
- **Bước C3.5 — Giao diện CTV (Bell & 2 Tab Notifications)**: Nâng cấp Header Bell (badge, popover thực tế) và xây dựng màn hình `/portal/notifications` với đầy đủ Tab 1 & Tab 2.
- **Bước C3.6 — Giao diện Quản lý Admin & Nghiệm thu**: Xây dựng màn hình `/admin/notifications` cho Ban tuyển sinh và kiểm thử E2E toàn phân hệ.

---
**Tài liệu này là căn cứ kỹ thuật và nghiệp vụ chính thức cho toàn bộ công tác triển khai mã nguồn và cơ sở dữ liệu của Phân hệ C3.**
