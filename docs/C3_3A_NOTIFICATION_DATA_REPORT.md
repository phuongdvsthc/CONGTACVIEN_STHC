# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.3A
## THIẾT KẾ VÀ TRIỂN KHAI CƠ SỞ DỮ LIỆU THÔNG BÁO & PHÂN QUYỀN CTV
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_3A_NOTIFICATION_DATA_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (DATABASE SCHEMA & RBAC FOUNDATION READY)**  
**Phạm vi**: Schema DDL, RLS Policies, Indexes, RBAC Permissions, TypeScript Contracts.  
**Tập tin thay đổi chính**:
- `/supabase/migrations/20261008000001_c3_notification_schema_and_permissions.sql` (Tạo mới)
- `/src/types/index.ts` (Cập nhật DTO & Entity types)
- `/docs/PROJECT_NOTE.md` (Cập nhật tiến độ dự án mục 66)

---

## 1. PHỤ LỤC ĐIỀU CHỈNH VÀ ĐÍNH CHÍNH CÁC ĐIỂM CHƯA CHUẨN XÁC TRONG C3.2

Dựa trên kết quả rà soát kiến trúc thực tế của hệ thống, phụ lục này chính thức đính chính 12 điểm trong tài liệu đặc tả C3.2 để làm kim chỉ nam triển khai xuyên suốt:

| STT | Điểm trong C3.2 cũ | Đính chính chuẩn xác tại C3.3A | Cơ sở kiến trúc & Lý do kỹ thuật |
|:---:|:---|:---|:---|
| **1** | Bảng `user_notifications` sao chép toàn bộ nội dung (`title`, `content`, `action_url`) cho từng người nhận. | **Tách biệt 2 bảng**: `public.notifications` (lưu nội dung duy nhất) và `public.notification_recipients` (lưu liên kết người nhận và trạng thái đọc). | Triệt tiêu dư thừa dữ liệu (Data Redundancy) khi phát hành bản tin diện rộng (Fan-out) tới hàng ngàn CTV. Giúp việc chỉnh sửa bản nháp hoặc kiểm toán nội dung độc lập với người nhận. |
| **2** | Lưu song song hai cột `is_read BOOLEAN` và `read_at TIMESTAMPTZ`. | **`read_at` là nguồn xác định trạng thái đọc duy nhất** (`read_at IS NOT NULL` = Đã đọc; `read_at IS NULL` = Chưa đọc). Cột `is_read` được suy ra (derived) ở tầng DTO/API. | Loại bỏ rủi ro bất đồng bộ trạng thái (State Inconsistency) khi một thao tác chỉ cập nhật `is_read` mà bỏ sót `read_at` hoặc ngược lại. |
| **3** | Ràng buộc duy nhất chống trùng: `UNIQUE(user_id, event_type, source_entity_id)`. | **Loại bỏ ràng buộc cứng trên**; thay bằng `idempotency_key VARCHAR(255)` duy nhất có điều kiện gắn với **từng lần chuyển trạng thái nghiệp vụ cụ thể**. | Khóa cũ chặn đứng các lần chuyển trạng thái hợp lệ về sau nếu cùng thực thể phát sinh sự kiện mới (VD: CTV bị tạm ngưng rồi được mở lại nhiều lần; đối soát bị hủy rồi đối soát lại). |
| **4** | Ý định dùng `EXCEPTION WHEN OTHERS THEN NULL` trong trigger/RPC để không lỗi giao dịch chính. | **Tuyệt đối không nuốt lỗi âm thầm (No Silent Error Suppression)**. Ghi nhận lỗi có kiểm soát hoặc áp dụng kiểm tra điều kiện tồn tại trước khi ghi. | Việc nuốt lỗi bằng `EXCEPTION` làm mất mát sự kiện nghiệp vụ mà quản trị viên không thể phát hiện hay điều tra nguồn gốc. |
| **5** | Đề xuất RLS cho phép mọi `authenticated` đọc thông báo khi `status = 'PUBLISHED'`. | **CTV chỉ được SELECT thông báo khi có bản ghi tương ứng trong `notification_recipients`** gán đích danh cho `auth.uid()`. | Bảo mật thông tin: CTV không được tự ý đọc các thông báo chỉ định cho nhóm đối tượng khác hoặc cá nhân khác dù bản tin đã được PUBLISHED. |
| **6** | Thu hồi bản tin BQT bằng cách xóa bản ghi thông báo và người nhận. | **Bảo toàn dữ liệu lịch sử vĩnh viễn**: Cập nhật `status = 'REVOKED'`, `revoked_at`, `revoked_by`. Không thực hiện `DELETE` cứng. | Đảm bảo tính toàn vẹn kiểm toán (Audit Trail) phục vụ đối soát và báo cáo thanh tra hệ thống. |
| **7** | Khẳng định partial index giúp đếm thông báo chưa đọc đạt độ phức tạp $O(1)$. | **Đính chính**: Partial index B-Tree (`WHERE read_at IS NULL`) giúp giảm tối đa dung lượng bộ nhớ và số trang đĩa quét (Index Only Scan), nhưng về bản chất vẫn là độ phức tạp phụ thuộc số lượng bản ghi chưa đọc $O(\log N + K)$, không phải $O(1)$ như bộ đếm counter. | Đảm bảo tính chính xác và trung thực về mặt khoa học máy tính và tối ưu hóa CSDL. |
| **8** | Mẫu thông báo hardcode cố định số tiền `500.000 VNĐ` và cam kết thời điểm chuyển tiền về tài khoản ngân hàng. | **Lấy số tiền động từ trường `amount` của bản ghi thù lao**; nội dung chỉ xác nhận thù lao đã được phê duyệt, thanh toán thực hiện theo kế hoạch chi trả của Nhà trường. | Chính sách thù lao có thể điều chỉnh linh hoạt theo từng giai đoạn; không đưa ra cam kết thanh toán tức thì khi chưa có lệnh ủy nhiệm chi thực tế. |
| **9** | Đề xuất tạo mặc định thông báo chào mừng (`AFFILIATE_REGISTERED`) và cập nhật tư vấn (`LEAD_COUNSELING_UPDATED`). | **Không kích hoạt mặc định 2 sự kiện trên**: CTV đăng ký chưa được duyệt thì chưa thể truy cập Portal để đọc hòm thư; còn cập nhật ghi chú tư vấn phát sinh liên tục sẽ gây rác hòm thư và có nguy cơ lộ ghi chú nội bộ. | Giữ trải nghiệm CTV tinh gọn, tập trung vào các sự kiện có giá trị then chốt: duyệt hồ sơ, nhập học, thù lao. |
| **10** | Gộp chung từ chối và hủy thù lao vào một mã `REWARD_VOIDED`. | **Phân tách rõ ràng**: `REWARD_REJECTED` (từ chối phê duyệt khoản thù lao đang chờ) và `REWARD_VOIDED` (thu hồi/hủy khoản thù lao đã từng được duyệt chi). | Rõ ràng về mặt pháp lý và ngữ cảnh nghiệp vụ, giúp CTV hiểu đúng lý do khoản thù lao bị từ chối hay bị hủy. |
| **11** | Đề xuất gửi email tức thì cho CTV khi có khách hàng mới đăng ký (`LEAD_SUBMITTED`). | **Mặc định TẮT gửi email cho sự kiện `LEAD_SUBMITTED`**, chỉ ghi nhận thông báo in-app. | Tiết kiệm hạn ngạch máy chủ gửi thư (SMTP quota) và tránh làm phiền hòm thư điện tử cá nhân của CTV khi số lượng lead tăng cao. |
| **12** | Nhấp vào thông báo trên Bell / Popover tự động nhảy chuyển trang ngay tới màn hình nghiệp vụ đích. | **Hành vi chuẩn**: Mở xem nội dung chi tiết thông báo (đánh dấu đã đọc), hiển thị rõ nội dung/lý do, kèm nút bấm điều hướng (CTA) để CTV chủ động chuyển tiếp. | Tránh làm CTV mất ngữ cảnh hoặc không kịp đọc lý do thẩm định/hướng dẫn trước khi bị điều hướng đột ngột. |

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU ĐÃ TRIỂN KHAI

File migration chính thức: `/supabase/migrations/20261008000001_c3_notification_schema_and_permissions.sql`.

### 2.1. Bảng `public.notifications` (Nội dung thông báo & Bản tin)
Lưu trữ toàn bộ thông tin gốc của các thông báo BQT (ANNOUNCEMENT) và biến động hệ thống (SYSTEM):

```sql
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    action_url VARCHAR(255),
    recipient_scope VARCHAR(30) NOT NULL DEFAULT 'ALL',
    recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_type VARCHAR(50),
    source_entity_type VARCHAR(50),
    source_entity_id UUID,
    idempotency_key VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_type CHECK (type IN ('ANNOUNCEMENT', 'SYSTEM')),
    CONSTRAINT chk_notification_category CHECK (
        category IN ('GENERAL', 'POLICY', 'URGENT', 'EVENT', 'LEAD', 'RECONCILIATION', 'REWARD', 'ACCOUNT')
    ),
    CONSTRAINT chk_notification_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'REVOKED')),
    CONSTRAINT chk_notification_scope CHECK (recipient_scope IN ('ALL', 'STATUS_FILTER', 'SPECIFIC'))
);
```

- **Trigger tự động**: `trg_notifications_updated_at` gọi hàm `public.set_current_timestamp_updated_at()` để duy trì phiên bản cập nhật.

### 2.2. Bảng `public.notification_recipients` (Người nhận & Trạng thái đọc)
Phục vụ toàn bộ hiển thị hòm thư của CTV:

```sql
CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_recipient UNIQUE (notification_id, user_id)
);
```

### 2.3. Hệ Thống Chỉ Mục Hiệu Năng (Indexes)
1. **`uq_notifications_idempotency_key`**:
   `CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idempotency_key ON public.notifications(idempotency_key) WHERE idempotency_key IS NOT NULL;`
   - Đảm bảo tính bất biến (idempotent): Một lần chuyển trạng thái nghiệp vụ chỉ sinh duy nhất một thông báo hệ thống.
2. **`idx_notifications_admin_filter`**:
   `ON public.notifications(type, status, created_at DESC);`
   - Tối ưu bộ lọc quản trị bản tin dành cho Admin / Staff tại `/admin/notifications`.
3. **`idx_notifications_event_source`** & **`idx_notifications_event_type`**:
   - Tối ưu tra cứu nguồn gốc sự kiện theo thực thể gốc (`source_entity_type`, `source_entity_id`) và mã sự kiện (`event_type`).
4. **`idx_notification_recipients_unread`**:
   `ON public.notification_recipients(user_id, read_at) WHERE read_at IS NULL;`
   - Partial index phục vụ tính năng đếm số lượng chưa đọc trên Bell Header và Tab Badge với chi phí quét đĩa tối thiểu.
5. **`idx_notification_recipients_user_inbox`**:
   `ON public.notification_recipients(user_id, created_at DESC);`
   - Tối ưu truy vấn phân trang hòm thư CTV.
6. **`idx_notification_recipients_notification_id`**:
   - Tối ưu các phép JOIN giữa bảng người nhận và bảng nội dung thông báo.

---

## 3. PHÂN QUYỀN NHÂN VIÊN (RBAC) VÀ BẢO MẬT ROW LEVEL SECURITY (RLS)

### 3.1. Bổ Sung 4 Quyền Mới Cho Staff
Đã seed vào bảng `public.permissions` hiện có:
- `notifications.view`: "Xem danh sách thông báo" (Xem danh sách và nội dung các bản tin BQT).
- `notifications.create`: "Soạn thảo thông báo" (Tạo bản nháp DRAFT, sửa bản nháp).
- `notifications.publish`: "Xuất bản thông báo" (Chuyển trạng thái sang PUBLISHED và phân phối tới CTV).
- `notifications.revoke`: "Thu hồi thông báo" (Chuyển trạng thái sang REVOKED khi có sai sót).

Đã thiết lập nhóm quyền mẫu `notification_manager` ("Phụ trách thông báo & Bản tin CTV") chứa toàn bộ 4 quyền trên trong `public.permission_groups` và `public.permission_group_items`.

**Cơ chế kế thừa tự động**:
Hàm `fn_get_user_permissions(auth.uid())` đã có sẵn cơ chế: với vai trò `admin`, tự động truy vấn toàn bộ mã quyền có trong bảng `permissions`. Do đó, tài khoản Admin ngay lập tức sở hữu đầy đủ 4 quyền quản trị thông báo mới mà không cần sửa đổi mã nguồn RPC.

### 3.2. Chính Sách Row Level Security (RLS)
Kích hoạt RLS trên cả 2 bảng mới:

#### Bảng `public.notifications`:
- **SELECT**:
  - `admin`: Xem toàn bộ thông báo.
  - `staff`: Xem nếu có quyền `notifications.view` (thông qua `fn_has_permission`).
  - `CTV / Authenticated`: Chỉ được SELECT khi thông báo có trạng thái `PUBLISHED` **VÀ** tồn tại bản ghi trong `public.notification_recipients` gán cho `auth.uid()`.
- **INSERT**:
  - `admin`: Toàn quyền.
  - `staff`: Chỉ được tạo khi có quyền `notifications.create`.
- **UPDATE**:
  - `admin`: Toàn quyền.
  - `staff`: Chỉ được cập nhật bản nháp (`DRAFT`) khi có `notifications.create`, hoặc chuyển xuất bản khi có `notifications.publish`, hoặc thu hồi khi có `notifications.revoke`.
- **DELETE**:
  - `admin` hoặc `staff` có `notifications.create` chỉ được phép xóa bản nháp (`status = 'DRAFT'`). Bản tin đã xuất bản hoặc đã thu hồi tuyệt đối không thể xóa.

#### Bảng `public.notification_recipients`:
- **SELECT**:
  - `CTV`: Chỉ xem các bản ghi có `user_id = auth.uid()`.
  - `admin` / `staff` (có quyền `notifications.view`): Xem danh sách người nhận để theo dõi tỷ lệ tiếp cận.
- **UPDATE**:
  - `CTV`: Chỉ được phép cập nhật thời điểm đọc (`read_at`) của chính mình (`user_id = auth.uid()`).
- **INSERT**:
  - `admin` hoặc `staff` có quyền `notifications.publish` khi thực hiện phân phối bản tin.
- **DELETE**:
  - Chỉ `admin` có quyền dọn dẹp khi cần thiết.

---

## 4. TÍNH NHẤT QUÁN TYPESCRIPT (CONTRACTS TRONG `src/types/index.ts`)

Đã bổ sung đầy đủ các định nghĩa kiểu dữ liệu chuẩn vào `/src/types/index.ts`:
1. `NotificationType = 'ANNOUNCEMENT' | 'SYSTEM'`
2. `NotificationCategory = 'GENERAL' | 'POLICY' | 'URGENT' | 'EVENT' | 'LEAD' | 'RECONCILIATION' | 'REWARD' | 'ACCOUNT'`
3. `NotificationStatus = 'DRAFT' | 'PUBLISHED' | 'REVOKED'`
4. `NotificationRecipientScope = 'ALL' | 'STATUS_FILTER' | 'SPECIFIC'`
5. `NotificationEventType`: Chuẩn hóa 12 mã sự kiện (bao gồm phân tách `REWARD_APPROVED`, `REWARD_REJECTED`, `REWARD_VOIDED`).
6. `NotificationPermissionCode`: 4 mã quyền RBAC.
7. `Notification`: Giao diện thực thể CSDL bảng `notifications`.
8. `NotificationRecipient`: Giao diện thực thể CSDL bảng `notification_recipients`.
9. `NotificationItemDTO`: Giao diện đối tượng hiển thị hòm thư CTV (có `is_read: boolean` được suy ra từ `read_at`).
10. `NotificationUnreadCountDTO`: Cấu trúc đếm số lượng chưa đọc (`total`, `announcement_count`, `system_count`).
11. `AdminNotificationListItemDTO`: Dữ liệu bảng danh sách quản trị bản tin dành cho Admin / Staff.

**Kết quả kiểm tra chất lượng mã nguồn**:
- `npm run lint` (`tsc --noEmit`): **Thành công 100%, không phát sinh bất kỳ lỗi cú pháp hoặc sai lệch kiểu nào**.
- `npm run build` (`compile_applet`): **Build thành công xuất sắc**.

---

## 5. BÀN GIAO & CÁC NỘI DUNG CHƯA THỰC HIỆN Ở BƯỚC NÀY

Tuân thủ nghiêm ngặt ranh giới bước C3.3A (chỉ xây dựng nền tảng dữ liệu, schema, RBAC và types):
1. **Chưa sửa trigger/RPC A1, A3, A4, A5**: Chưa gắn code tự động phát sinh thông báo vào các RPC đối soát và duyệt thưởng. Sẽ thực hiện tại **C3.3B**.
2. **Chưa triển khai Backend API**: Chưa tạo các route Express `/api/v1/portal/notifications` và `/api/v1/admin/notifications`. Sẽ thực hiện tại **C3.4**.
3. **Chưa triển khai giao diện người dùng**:
   - Chưa gắn Bell và Popover trên Header `AppLayout.tsx`.
   - Chưa tạo trang CTV `/portal/notifications` (2 tab).
   - Chưa tạo trang Quản trị `/admin/notifications`.
   - Sẽ thực hiện tại **C3.5**.
4. **Chưa gửi email / worker outbox**: Thuộc giai đoạn **C3.6**.

---
*Dừng lại sau bước C3.3A theo đúng yêu cầu đề bài; hệ thống sẵn sàng bàn giao cho bước C3.3B.*
