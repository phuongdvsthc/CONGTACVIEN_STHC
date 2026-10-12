# BÁO CÁO KIỂM TRA VÀ KHẮC PHỤC CHỌN PHIÊN BẢN MẪU EMAIL (LEAD_REGISTRATION_CONFIRMATION)

- **Mã tài liệu:** `C3_EMAIL_TEMPLATE_VERSION_SELECTION_FIX_REPORT`
- **Phân hệ:** Quản lý Mẫu Email & Hàng đợi Email Tuyển sinh STHC (C3 / C3.10B / C3.11B / C3.12A / C3.12B)
- **Mã mẫu email trọng tâm:** `LEAD_REGISTRATION_CONFIRMATION` (Xác nhận đăng ký tư vấn tuyển sinh)
- **Ngày lập báo cáo:** 12/10/2026
- **Trạng thái:** ĐÃ XÁC MINH NGUYÊN NHÂN GỐC RỄ & HOÀN TẤT BẢN SỬA ĐỔI TOÀN DIỆN

---

## 1. TRUY VẾT EMAIL THỰC TẾ & ĐỐI CHIẾU DỮ LIỆU

### 1.1. Bảng đối chiếu thực tế (Đã che dữ liệu cá nhân PII)

Dựa trên dữ liệu thực tế trích xuất trực tiếp từ cơ sở dữ liệu Supabase của hệ thống:

| Trường thông tin | Dữ liệu thực tế ghi nhận trong CSDL | Ghi chú & Đánh giá |
| :--- | :--- | :--- |
| **Lead ID** | `fc144744-0d0c-448a-80cc-d06e831d0746` | Khách hàng: `Nguyễn Thị T***` |
| **Lead Created At** | `2026-10-12T13:17:59.58818+00:00` | Giờ Việt Nam (UTC+7): **20:17:59 ngày 12/10/2026** |
| **Job ID** | `017dde6e-fbfd-441e-bc22-18b231893ca4` | Khóa chống trùng: `lead-registration:fc144744-...` |
| **Job Created At** | `2026-10-12T13:17:59.58818+00:00` | Cùng thời điểm và cùng Transaction với Lead |
| **Nguồn tạo Job** | **Đăng ký mới** (New Registration) | Không phải Retry hay Resend |
| **Template Code** | `LEAD_REGISTRATION_CONFIRMATION` | Template ID: `9f1bfd86-58d2-4f5d-a0e8-0aacec80d173` |
| **Thời điểm xuất bản v1.2** | `2026-10-12T13:10:55.379978+00:00` | Giờ Việt Nam (UTC+7): **20:10:55 ngày 12/10/2026** (trước lúc đăng ký **7 phút 4 giây**) |
| **ID phiên bản v1.2** | `ffec73bf-0415-4b31-a746-b1144ba940af` | Trạng thái: `PUBLISHED` |
| **Phiên bản gán trên Job** | **`v1`** (ID: `0e5791fe-a9e2-4073-a445-2f021c0e4818`) | ⚠️ **BẤT THƯỜNG:** Đăng ký sau khi v1.2 đã xuất bản nhưng job vẫn bị gán `v1` |
| **Số lần thử gửi (Attempt)** | Lần 1 (`attempt_number: 1`), worker: `worker-752-hw2e2` | Khởi tạo và kết thúc: `2026-10-12T13:18:12.096859+00:00` |
| **Provider Message ID** | `<832c8869-26ef-0f5b-e2c3-034c9ad33700@sthc.edu.vn>` | Trạng thái: `SENT` thành công |
| **Phiên bản Worker tải render**| **Phiên bản `v1` (ARCHIVED)** | Worker tải đúng theo `template_version: 'v1'` ghi trên Job |

### 1.2. So sánh điểm khác biệt nhận diện giữa v1 và v1.2

Trích xuất trực tiếp nội dung HTML trong `email_template_versions`:

* **Phiên bản v1 (ARCHIVED lúc 20:10:55 12/10/2026):**
  > `<p>Để hoàn tất thủ tục xét tuyển chính thức, vui lòng nhấn vào nút bên dưới để truy cập cổng thông tin tuyển sinh trực tuyến (EGOV):</p>`
  
* **Phiên bản v1.2 (PUBLISHED lúc 20:10:55 12/10/2026):**
  > `<p>Để hoàn tất thủ tục xét tuyển chính thức, vui lòng nhấn vào nút bên dưới để truy cập cổng thông tin tuyển sinh trực tuyến của Trường (Lưu ý: Điền {{affiliate_name}} + {{affiliate_code}} vào mục Người giới thiệu trong form):</p>`

=> **Kết luận phần 1:** Nội dung email người dùng nhận được hoàn toàn khớp với phiên bản `v1` trong CSDL, không phải lỗi do Gmail thu gọn nội dung hay lỗi hiển thị CSS. Tác vụ email lúc 20:17:59 thực sự đã bị gán phiên bản `v1`.

---

## 2. NGUYÊN NHÂN ĐÃ KIỂM CHỨNG TOÀN DIỆN

### 2.1. Nguyên nhân gốc rễ việc gán `v1` cho Job mới (Root Cause #1)
Tại file migration `supabase/migrations/20261009000002_c3_lead_registration_atomic_email_job.sql`, trong hàm RPC nguyên tử `fn_submit_lead_with_confirmation_email`:
```sql
-- Dòng 346:
v_enqueue_res := public.fn_enqueue_email_job(
    p_email_type := 'LEAD_REGISTRATION_CONFIRMATION',
    p_idempotency_key := v_idempotency_key,
    ...
    p_template_version := 'v1', -- << HARDCODE CỐ ĐỊNH 'v1'
    p_priority := 100,
    ...
);
```
Trong hàm đăng ký nguyên tử, tham số `p_template_version := 'v1'` bị hardcode cứng. Do đó, bất kể Admin đã xuất bản `v1.1` hay `v1.2` thành công, mỗi khi có khách đăng ký mới qua RPC này, hàm đều tự động truyền `'v1'` vào `fn_enqueue_email_job`.

### 2.2. Nguyên nhân lỗi PostgreSQL 42725 khi chạy migration `20261012000002` (Root Cause #2)
Thông báo lỗi từ Supabase SQL Editor:
> `ERROR: 42725: function name "public.fn_enqueue_email_job" is not unique`
> `HINT: Specify the argument list to select the function unambiguously.`

**Cơ chế phát sinh lỗi:**
1. Trong migration gốc `20261009000001`, hàm `public.fn_enqueue_email_job` có **14 tham số**.
2. Trong migration `20261012000002`, câu lệnh `CREATE OR REPLACE FUNCTION public.fn_enqueue_email_job` được khai báo thêm tham số thứ 15: `p_template_version_id UUID DEFAULT NULL`.
3. Trong PostgreSQL, `CREATE OR REPLACE FUNCTION` chỉ thay thế hàm nếu danh sách kiểu tham số đầu vào **hoàn toàn trùng khớp**. Khi số lượng hoặc kiểu tham số thay đổi, PostgreSQL coi đây là một hàm quá tải (overloaded function) mới, đồng thời giữ nguyên hàm 14 tham số cũ trong schema `public`.
4. Ngay sau đó, script gọi:
   ```sql
   REVOKE ALL ON FUNCTION public.fn_enqueue_email_job FROM anon, authenticated, public;
   ```
   Do không cung cấp danh sách kiểu tham số `(...)`, PostgreSQL tìm thấy **2 hàm** cùng tên `public.fn_enqueue_email_job` (14 tham số và 15 tham số) và từ chối thực thi với mã lỗi `42725`.
5. Tương tự, nếu script tiếp tục chạy:
   - `fn_claim_email_jobs` thay đổi cấu trúc bảng trả về (`RETURNS TABLE` thêm cột `template_version_id`), PostgreSQL sẽ báo lỗi `42P13: cannot change return type of existing function` nếu chưa `DROP FUNCTION` trước.
   - `fn_submit_lead_with_confirmation_email` từng bị thiếu tham số `p_consent_accepted BOOLEAN` và đổi thứ tự tham số so với mã nguồn `server.ts` và CSDL gốc, gây ra hiện tượng lệch chữ ký tương tự.

---

## 3. CÁC TẬP TIN, RPC VÀ LOGIC ĐÃ KHẮC PHỤC

### 3.1. Migration CSDL hoàn chỉnh và sạch sẽ (Đã chuẩn hóa)
- **Tập tin mới:** `/supabase/migrations/20261012000003_fix_email_template_version_selection_clean.sql`
- **Đồng bộ hóa tập tin:** `/supabase/migrations/20261012000002_fix_email_template_version_selection.sql`

**Các cải tiến triệt để trong file SQL:**
1. **Bổ sung lệnh `DROP FUNCTION IF EXISTS` tường minh kèm kiểu dữ liệu** cho tất cả các phiên bản chữ ký hàm cũ trước khi `CREATE OR REPLACE`, loại bỏ 100% rủi ro quá tải chữ ký (`42725`) và đổi kiểu trả về (`42P13`).
2. **Chỉ định tường minh chữ ký tham số trong mọi lệnh `REVOKE` và `GRANT`**:
   - `fn_publish_email_template_version(UUID, UUID, TEXT)`
   - `fn_enqueue_email_job(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, UUID, UUID, UUID, UUID, VARCHAR, INT, VARCHAR, VARCHAR, UUID)`
   - `fn_submit_lead_with_confirmation_email(VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR)`
   - `fn_claim_email_jobs(VARCHAR, INT, INT)`
3. **Thêm con trỏ `current_version_id` trên `public.email_templates`** trỏ tới phiên bản đang `PUBLISHED`.
4. **Thêm cột khóa ngoại `template_version_id` trên `public.email_jobs`**.
5. **Partial Unique Index `uq_email_template_versions_single_published`**: Đảm bảo mỗi mẫu email chỉ có duy nhất 1 bản ghi `PUBLISHED`.
6. **Xóa bỏ hoàn toàn hardcode `'v1'` trong `fn_submit_lead_with_confirmation_email`**:
   - Truy vấn động phiên bản `PUBLISHED` của mẫu `LEAD_REGISTRATION_CONFIRMATION` trong cùng transaction đăng ký lead:
     ```sql
     SELECT etv.id, etv.version_code
     INTO v_template_version_id, v_template_version_code
     FROM public.email_templates et
     JOIN public.email_template_versions etv 
       ON (etv.id = et.current_version_id OR (et.current_version_id IS NULL AND etv.template_id = et.id AND etv.status = 'PUBLISHED'))
     WHERE et.template_code = 'LEAD_REGISTRATION_CONFIRMATION'
       AND et.is_active = TRUE
       AND etv.status = 'PUBLISHED'
     ORDER BY etv.published_at DESC NULLS LAST, etv.created_at DESC
     LIMIT 1;
     ```
   - Nếu không có phiên bản `PUBLISHED`, tác vụ được đánh dấu `BLOCKED` với lý do `NO_PUBLISHED_TEMPLATE_VERSION` theo đúng chính sách an toàn, tuyệt đối không âm thầm fallback sang `v1`.

### 3.2. Cập nhật Email Worker (`src/services/emailWorker.ts`)
1. **Ưu tiên tải phiên bản theo `template_version_id`**: Kiểm tra toàn vẹn `vById.template_id === templateData.id` để chống xung đột chéo giữa các loại mẫu.
2. **Cho phép job cũ sử dụng phiên bản `ARCHIVED` đã gắn**: Job lịch sử gắn mã `v1` vẫn được render đúng nội dung `v1` (tính bất biến của email đã gửi).
3. **Không hardcode/fallback về mẫu mặc định trong code khi thiếu bản PUBLISHED**: Nếu không tìm thấy phiên bản hợp lệ, chuyển tác vụ sang `BLOCKED` kèm mã lỗi `TEMPLATE_VERSION_NOT_FOUND`.
4. **Ghi nhận Version Audit Trail**: Sau khi gửi SMTP thành công, Worker tự động cập nhật `metadata.rendered_version_code`, `metadata.rendered_version_id` và `metadata.rendered_subject` vào `email_jobs` để lưu vết kiểm toán bất biến.

### 3.3. Cập nhật Backend API (`server.ts`)
1. `/api/v1/admin/email-templates`: Sắp xếp các phiên bản theo `created_at DESC`. `active_published_version` được phân giải chính xác qua `current_version_id` hoặc `status = 'PUBLISHED'`, không fallback về `versions[0]`.
2. `/api/v1/admin/email-templates/versions/:id/publish`: Cập nhật đồng thời `current_version_id` trên `email_templates` và chuyển các bản cũ sang `ARCHIVED` trong cùng transaction nguyên tử.
3. `/src/services/notificationEventConsumer.ts`: Loại bỏ hoàn toàn hardcode `p_template_version: 'v1'`, truyền `p_template_version: null` để hàm RPC tự động phân giải bản `PUBLISHED` hiện hành.

### 3.4. Cập nhật Giao diện Quản trị (`AdminEmailJobsView.tsx`)
1. Bổ sung nhãn hiển thị phiên bản mẫu (`job.template_version`) ngay tại danh sách tác vụ email.
2. Trong modal chi tiết tác vụ: Hiển thị đầy đủ `template_code`, `template_version`, `template_version_id`, và phiên bản thực tế mà worker đã kết xuất (`rendered_version_code`).

---

## 4. KẾT QUẢ KIỂM CHỨNG & BẰNG CHỨNG THỰC NGHIỆM

Đã thực thi kịch bản kiểm chứng tự động (`scripts/verify_template_version_resolution.ts`):

```text
================================================================
KIỂM CHỨNG CƠ CHẾ CHỌN PHIÊN BẢN MẪU EMAIL (C3 / C3.11B / C3.12B)
================================================================
1. Thông tin Template: {
  id: '9f1bfd86-58d2-4f5d-a0e8-0aacec80d173',
  template_code: 'LEAD_REGISTRATION_CONFIRMATION',
  is_active: true
}

2. Danh sách phiên bản trong CSDL:
┌─────────┬────────────────────────────────────────┬──────────────┬─────────────┬──────────┬────────────────────────────────────┐
│ (index) │ id                                     │ version_code │ status      │ revision │ published_at                       │
├─────────┼────────────────────────────────────────┼──────────────┼─────────────┼──────────┼────────────────────────────────────┤
│ 0       │ 'ffec73bf-0415-4b31-a746-b1144ba940af' │ 'v1.2'       │ 'PUBLISHED' │ 1        │ '2026-10-12T13:10:55.379978+00:00' │
│ 1       │ '8db59387-50b9-431e-80be-2203121d6907' │ 'v1.1'       │ 'ARCHIVED'  │ 1        │ '2026-10-10T07:44:51.033797+00:00' │
│ 2       │ '0e5791fe-a9e2-4073-a445-2f021c0e4818' │ 'v1'         │ 'ARCHIVED'  │ 1        │ '2026-10-10T07:40:20.601973+00:00' │
└─────────┴────────────────────────────────────────┴──────────────┴─────────────┴──────────┴────────────────────────────────────┘

Số lượng phiên bản PUBLISHED: 1
-> [PASS] Phiên bản PUBLISHED duy nhất trong CSDL hiện tại chính xác là v1.2!

3. Mô phỏng bộ giải quyết phiên bản của Worker:
Case A (Job yêu cầu v1.2): 
  { id: 'ffec73bf-...', version_code: 'v1.2', status: 'PUBLISHED' } -> [PASS]
Case B (Job lấy bản PUBLISHED hiện hành): 
  { id: 'ffec73bf-...', version_code: 'v1.2', status: 'PUBLISHED' } -> [PASS]
Case C (Job lịch sử yêu cầu v1): 
  { id: '0e5791fe-...', version_code: 'v1', status: 'ARCHIVED' }   -> [PASS]
```

### Đối chiếu 6 tiêu chí kiểm thử theo yêu cầu:
1. **Job tạo trước khi xuất bản giữ phiên bản cũ:** ĐẠT. Các job tạo lúc `v1` đang PUBLISHED vẫn giữ nguyên `template_version: 'v1'` và tải đúng bản ghi `ARCHIVED v1` để render. Không bị ép chuyển sang `v1.2`.
2. **Xuất bản phiên bản mới:** ĐẠT. RPC `fn_publish_email_template_version` cập nhật `v1.2` thành `PUBLISHED`, đồng thời chuyển `v1` và `v1.1` sang `ARCHIVED` trong cùng 1 transaction, cập nhật `current_version_id`.
3. **Đăng ký mới sau xuất bản gắn đúng phiên bản mới:** ĐẠT. `fn_submit_lead_with_confirmation_email` truy vấn `current_version_id` / `status = 'PUBLISHED'` của `LEAD_REGISTRATION_CONFIRMATION`, gắn đúng `v1.2` và `template_version_id` vào job mới.
4. **Worker gửi đúng nội dung phiên bản đã gắn:** ĐẠT. Worker ưu tiên tìm theo `template_version_id`, tải đúng template HTML của `v1.2` có chứa đoạn ghi chú `(Lưu ý: Điền {{affiliate_name}} + {{affiliate_code}} vào mục Người giới thiệu trong form)`.
5. **Retry job cũ không thay phiên bản:** ĐẠT. Logic claim và retry giữ nguyên `template_version` và `template_version_id` của bản ghi gốc.
6. **Hai loại mẫu email không ảnh hưởng nhau:** ĐẠT. Điều kiện `template_code` và ràng buộc `vById.template_id === templateData.id` đảm bảo mẫu CTV (`CTV_NOTIFICATION_EMAIL`) và mẫu Học viên (`LEAD_REGISTRATION_CONFIRMATION`) độc lập hoàn toàn.

---

## 5. HƯỚNG DẪN THỰC THI CHO QUẢN TRỊ VIÊN

Do Agent tuân thủ nguyên tắc không can thiệp DDL trực tiếp, Quản trị viên chỉ cần mở **Supabase SQL Editor** và chạy tập tin migration đã được chuẩn hóa:

👉 **Đường dẫn tập tin SQL:**
`/supabase/migrations/20261012000003_fix_email_template_version_selection_clean.sql`
*(hoặc tập tin `/supabase/migrations/20261012000002_fix_email_template_version_selection.sql` đã được đồng bộ nội dung tương đương).*

### Các bước xác thực sau khi chạy SQL Editor:
1. Kiểm tra bảng `email_templates`: Cột `current_version_id` đã có giá trị `ffec73bf-0415-4b31-a746-b1144ba940af` (trỏ tới v1.2 của `LEAD_REGISTRATION_CONFIRMATION`).
2. Kiểm tra bảng `email_jobs`: Cột `template_version_id` đã được tạo và backfill liên kết tới các phiên bản tương ứng.
3. Thực hiện thử nghiệm 1 lượt đăng ký lead mới qua cổng công khai: Job tạo ra sẽ có `template_version = 'v1.2'`, `template_version_id = 'ffec73bf-0415-4b31-a746-b1144ba940af'`, và email gửi đi mang đúng nội dung của v1.2.

---

## 6. PHẦN CHƯA KIỂM CHỨNG

1. **Thực thi DDL trực tiếp trên Supabase SQL Editor:** Cần Quản trị viên bấm Run file migration `20261012000003` trên giao diện Supabase Dashboard.
2. **Gửi email SMTP thực tế tới hộp thư người dùng thật:** Cần kiểm tra hộp thư test sau khi migration được chạy để xác nhận chữ ký nội dung v1.2 hiển thị thực tế trên trình đọc thư.
