# BÁO CÁO KIỂM KÊ HIỆN TRẠNG & ĐẶC TẢ DASHBOARD “TỔNG QUAN” CỦA CTV (C6.1)
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGONTOURIST (STHC_CTV)

- **Mã tài liệu:** `CTV_C6_1_DASHBOARD_AUDIT_AND_SPEC`
- **Phiên bản:** `v1.0`
- **Ngày lập:** 06/10/2026
- **Trạng thái:** Hoàn tất kiểm kê & Chốt đặc tả kỹ thuật (Chưa can thiệp mã nguồn / CSDL)
- **Tác giả:** Kỹ sư Trưởng Hệ thống STHC_CTV

---

## I. TỔNG QUAN VÀ PHẠM VI BƯỚC C6.1

### 1.1. Mục tiêu bước C6.1
Thực hiện rà soát, kiểm kê toàn diện hiện trạng mã nguồn, API, CSDL và luồng dữ liệu của màn hình **Dashboard "Tổng quan" Cổng Cộng tác viên (CTV)** tại route `/portal`. Xác định rõ các thành phần đã có dữ liệu thật, các phần còn dùng dữ liệu mẫu (mock/hardcode), và thiết lập đặc tả kỹ thuật chính xác cho toàn bộ các chỉ số, biểu đồ, danh sách và hợp đồng API phục vụ các bước triển khai C6.2 – C6.7 tiếp theo.

### 1.2. Giới hạn và cam kết thực hiện
1. **Chỉ đọc và phân tích:** Không sửa đổi mã nguồn chức năng, không chạy migration CSDL, không seed/tạo dữ liệu giả lập.
2. **Không suy đoán dữ liệu:** Tất cả tên bảng, tên cột, trạng thái và ràng buộc được đối chiếu trực tiếp từ các migration thực tế tại `/supabase/migrations/` và mã nguồn backend tại `/server.ts`.
3. **Bảo mật PII & Bí mật:** Không hiển thị token, secret key, hay số điện thoại đầy đủ của khách hàng trong tài liệu.

---

## II. DANH MỤC TÀI LIỆU ĐÃ ĐỌC VÀ ĐỐI CHIẾU

| STT | Mã tài liệu / Đường dẫn | Nội dung đối chiếu | Ghi chú khác biệt giữa Tài liệu & Mã nguồn thực tế |
|---|---|---|---|
| 1 | `docs/PROJECT_NOTE.md` | Nhật ký toàn bộ các mốc phát triển từ A0.1 đến A4.8, A4-F1 đến A4-F5, A7.1 đến A7.8, C1.1 đến C1.4. | Đồng bộ 100%. Xác nhận đã hoàn tất kiểm thử E2E đối soát A4 và liên kết EGOV A4-F. |
| 2 | `docs/THIET_KE_HE_THONG_CTV_SAIGONTOURIST.md` | Kiến trúc tổng thể hệ thống, phân quyền, quy tắc ghi nhận nguồn, quy trình đối soát thủ công và nguyên tắc thưởng. | Mục 1.1 quy định Phase 1 chi trả ngoại tuyến qua Kế toán, không có ví điện tử/payout online; CSDL `rewards` chưa có trạng thái `PAID`. |
| 3 | `docs/A3_1` → `A3_7_2` (Phân hệ A3) | Luồng quản lý khách hàng được giới thiệu, bảo vệ SĐT, chống trùng lặp, quyền CTV chỉ xem lead của chính mình. | Mã nguồn thực tế đã bổ sung cột `admission_status` và liên kết EGOV độc lập. |
| 4 | `docs/A4_1` → `A4_8` (Phân hệ A4) | Luồng đối soát học thuật nhập học (`admission_status`) và xét tính hợp lệ nguồn CTV (`reconciliation_status`). | Chuẩn hóa `tuition_fee_collected` nullable; phân tách rõ hai trục Nhập học vs Tính hợp lệ giới thiệu. |
| 5 | `docs/A4_F1` → `A4_F5`, `A4_F_FIX` | Luồng liên kết mã hồ sơ EGOV độc lập trước khi nhập học, lưu vết lịch sử `lead_egov_links`. | Mã EGOV lấy từ `lead_egov_links` (trạng thái `ACTIVE`), không phụ thuộc vào việc đã nhập học hay chưa. |
| 6 | `docs/A7_1` → `A7_8` (Quản trị hệ thống) | Cấu hình vận hành `system_settings`, thương hiệu `system_regulations`, hotline, email hỗ trợ, mã CTV. | `AffiliateDashboard` đọc hotline, email hỗ trợ từ `SystemBrandingContext`. |
| 7 | `docs/CTV_C1_1` → `CTV_C1_4` | Danh sách khóa học CTV, chi tiết khóa học, liên kết tiếp thị tuyển sinh, sinh mã QR. | Khóa học có `career_group` chuẩn A2, tính năng tạm ngưng CTV `SUSPENDED` khóa nút lấy link/QR. |

---

## III. KẾT QUẢ KIỂM KÊ HIỆN TRẠNG DASHBOARD CTV TẠI `/portal`

### 3.1. Phân tích Route & Component
- **Route:** `/portal`, `/portal/dashboard`, `/portal/overview` (định tuyến trong `src/App.tsx`).
- **Component:** `src/components/affiliate/AffiliateDashboard.tsx`.
- **Layout:** Bọc bên ngoài bởi `AppLayout` (A0.4) cung cấp Header, Sidebar điều hướng chung và Context.

### 3.2. Kiểm kê chi tiết từng phần trên giao diện hiện có

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. BANNER CHÀO MỪNG:                                                             │
│    - Trạng thái CTV: [Đang hoạt động] / [Tạm ngưng hoạt động]      (DỮ LIỆU THẬT)│
│    - Tên CTV: "Xin chào, [Họ và tên]!"                             (DỮ LIỆU THẬT)│
│    - Mã CTV: [Mã CTV] + Nút Sao chép mã                            (DỮ LIỆU THẬT)│
│    - Thao tác nhanh: [Xem khóa học], [Xem khách hàng]           (HOẠT ĐỘNG THẬT)│
├──────────────────────────────────────────────────────────────────────────────────┤
│ 2. CẢNH BÁO TẠM NGƯNG (Khi SUSPENDED):                                           │
│    - Lý do tạm ngưng + Email + Hotline hỗ trợ                      (DỮ LIỆU THẬT)│
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3. 4 CARD CHỈ SỐ HIỆN TẠI:                                                       │
│    - Lượt đăng ký được ghi nhận: (leads.length + 3)              [CÓ MOCK/HARDCODE]│
│    - Hồ sơ nhập học hợp lệ: (MATCHED_VALID + 2)                  [CÓ MOCK/HARDCODE]│
│    - Thù lao chờ duyệt: (PENDING_APPROVAL count + 1, * 500k)     [CÓ MOCK/HARDCODE]│
│    - Thù lao đã duyệt: (APPROVED count + 1, * 500k)              [CÓ MOCK/HARDCODE]│
├──────────────────────────────────────────────────────────────────────────────────┤
│ 4. BIỂU ĐỒ (CHARTS):                                                             │
│    - CHƯA TRIỂN KHAI TRÊN GIAO DIỆN HIỆN TẠI.                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 5. DANH SÁCH 5 ĐĂNG KÝ GẦN ĐÂY:                                                 │
│    - Gọi API GET /api/v1/affiliate/leads rồi slice(0, 5)           (DỮ LIỆU THẬT)│
│    - Bảng hiển thị: Họ tên, SĐT che 4 số cuối, Khóa học,          (HOẠT ĐỘNG THẬT)│
│      Ngày đăng ký, Trạng thái tư vấn, Đối chiếu hồ sơ                            │
│    - Nút [Xem tất cả] -> điều hướng đến /portal/leads                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3. Đánh giá Endpoint Backend hiện tại (`GET /api/v1/affiliate/dashboard`)
Trong file `server.ts` (dòng 2229–2289):
- **Phần thật:** Đã xác thực định danh CTV qua `requireActiveAffiliate` và `resolveAffiliateSession`, truy vấn đúng bảng `leads` và `rewards` theo `affiliate_id`.
- **Phần giả lập (Mock/Hardcode):**
  - Dòng 2257: `totalReferred = (leads?.length || 0) + 3; // + mock seed`
  - Dòng 2258: `enrolledValid = (leads?.filter(l => l.reconciliation_status === 'MATCHED_VALID').length || 0) + 2;`
  - Dòng 2259: `pendingRewardsCount = (leads?.filter(l => l.reward_status === 'PENDING_APPROVAL').length || 0) + 1;`
  - Dòng 2260: `approvedRewardsCount = (leads?.filter(l => l.reward_status === 'APPROVED').length || 0) + 1;`
  - Dòng 2264 & 2268: Tự động nhân `* 500000` khi không có bản ghi `rewards`.
  - Chưa hỗ trợ dữ liệu chuỗi thời gian 12 tháng và phân bố khóa học cho biểu đồ.

---

## IV. BẢNG ÁNH XẠ NGUỒN DỮ LIỆU THỰC TẾ (DATA SOURCE MAPPING)

Dưới đây là bảng kiểm kê chi tiết từng trường dữ liệu, đối chiếu trực tiếp với CSDL Supabase PostgreSQL:

| Khối giao diện | Nhãn hiển thị | Bảng & Cột CSDL thực tế | Quan hệ & Điều kiện lọc | Đơn vị đếm | Xử lý NULL | Mốc thời gian | Tình trạng xác minh trên CSDL | Phần còn thiếu / Phụ thuộc |
|---|---|---|---|---|---|---|---|---|
| **Banner** | Trạng thái tài khoản | `public.affiliate_profiles.status` | `id = current_affiliate_id` | Chuỗi enum | Mặc định 'PENDING_REVIEW' | Thời điểm hiện tại | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Đã có đầy đủ |
| **Banner** | Họ và tên CTV | `public.affiliate_profiles.full_name` (fallback `public.profiles.full_name`) | `user_id = auth.uid()` | Chuỗi văn bản | Không NULL | Thời điểm hiện tại | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Đã có đầy đủ |
| **Banner** | Mã định danh CTV | `public.affiliate_profiles.affiliate_code` | `id = current_affiliate_id` | Chuỗi mã | Không NULL (Unique) | Thời điểm hiện tại | **ĐÃ XÁC MINH** (Migration `20261005000003`) | Đã có đầy đủ |
| **Banner** | Lý do tạm ngưng | `public.affiliate_profiles.suspension_reason` | `status = 'SUSPENDED'` | Văn bản | Hiển thị thông báo chung nếu NULL | Thời điểm bị khóa | **ĐÃ XÁC MINH** (Migration `20260930000003`) | Đã có đầy đủ |
| **Card Kết quả** | Tổng khách được giới thiệu | `public.leads.id` | `affiliate_id = current_affiliate_id` | Lượt đăng ký (`COUNT(id)`) | Trả về 0 nếu không có | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Đang bị cộng +3 mock ở backend |
| **Card Kết quả** | Khách chưa nhập học | `public.leads.admission_status` | `affiliate_id = current_affiliate_id AND admission_status = 'NOT_ENROLLED'` | Lượt đăng ký (`COUNT(id)`) | Coi NULL hoặc chưa đối soát là 'NOT_ENROLLED' | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20261004000004`) | Cần loại bỏ mock và tính chuẩn |
| **Card Kết quả** | Khách đã nhập học | `public.leads.admission_status` | `affiliate_id = current_affiliate_id AND admission_status = 'ENROLLED'` | Lượt đăng ký (`COUNT(id)`) | Trả về 0 nếu không có | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20261004000004`) | Cần loại bỏ mock và tính chuẩn |
| **Card Kết quả** | Hồ sơ hợp lệ đủ điều kiện xét thưởng | `public.leads.reconciliation_status` | `affiliate_id = current_affiliate_id AND reconciliation_status = 'MATCHED_VALID'` | Lượt đăng ký (`COUNT(id)`) | Trả về 0 nếu không có | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Cần loại bỏ mock +2 ở backend |
| **Card Thưởng** | Thù lao chờ duyệt | `public.rewards.amount`, `public.rewards.id` | `affiliate_id = current_affiliate_id AND status = 'PENDING_APPROVAL'` | Số tiền (`SUM(amount)`) và số khoản (`COUNT(id)`) | 0 đ nếu không có bản ghi | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Cần loại bỏ mock +1 và tự nhân 500k |
| **Card Thưởng** | Thù lao đã duyệt chưa thanh toán | `public.rewards.amount`, `public.rewards.id` | `affiliate_id = current_affiliate_id AND status = 'APPROVED'` | Số tiền (`SUM(amount)`) và số khoản (`COUNT(id)`) | 0 đ nếu không có bản ghi | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Cần loại bỏ mock +1 và tự nhân 500k |
| **Card Thưởng** | Thù lao đã thanh toán | `CHƯA CÓ BẢNG PAYOUTS TRONG CSDL` | `Phase 1 Kế toán chi trả ngoại tuyến, rewards chưa có status 'PAID'` | Số tiền (`SUM`) | Hiển thị 0 đ (hoặc badge Chưa khả dụng) | Toàn bộ thời gian | **CHƯA CÓ BẢNG CSDL** (Theo thiết kế V1.1) | Phụ thuộc module Tài chính / Payouts (A5 / C6.4) |
| **Biểu đồ 1** | Đăng ký mới theo 12 tháng | `public.leads.created_at` | `affiliate_id = current_affiliate_id AND created_at >= NOW() - INTERVAL '12 months'` | Số lượt / tháng | Tháng trống điền 0 | Múi giờ `Asia/Ho_Chi_Minh` | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Chưa có aggregate query trong API |
| **Biểu đồ 1** | Nhập học theo 12 tháng | `public.lead_reconciliations.reconciled_at` | `leads.affiliate_id = current_affiliate_id AND lead_reconciliations.admission_status = 'ENROLLED' AND lead_reconciliations.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM')` | Số lượt / tháng | Tháng trống điền 0 | Múi giờ `Asia/Ho_Chi_Minh` | **ĐÃ XÁC MINH** (Migration `20261004000005`) | Chưa có aggregate query trong API |
| **Biểu đồ 2** | Đăng ký & Nhập học theo khóa học | `public.leads.course_id`, `public.courses.title`, `public.courses.code` | `leads.affiliate_id = current_affiliate_id` LEFT JOIN `courses` | Số lượt theo từng khóa học | Khóa không có nhập học = 0 | Toàn bộ thời gian | **ĐÃ XÁC MINH** (Migration `20260929000001`) | Chưa có aggregate query trong API |
| **Bảng 5 khách** | Khách đăng ký gần đây | `public.leads` JOIN `public.courses` | `leads.affiliate_id = current_affiliate_id ORDER BY leads.created_at DESC LIMIT 5` | Danh sách 5 bản ghi | Rỗng nếu CTV chưa có lead | Mới nhất trước | **ĐÃ XÁC MINH** | Cần API trả trực tiếp trong summary |

---

## V. ĐẶC TẢ CHI TIẾT CÔNG THỨC & QUY TẮC TÍNH TOÁN CÁC CHỈ SỐ

### 5.1. Chuỗi quan hệ định danh bảo mật (Strict Identity Chain)
Mọi phép tính và truy vấn thống kê đều bắt buộc tuân thủ chuỗi quan hệ được xác thực server-authoritative:

```
[Token / Cookie Phiên] ──► auth.users.id
                                │
                                ▼
                       public.profiles.id
                                │
                                ▼
                   public.affiliate_profiles.id (current_affiliate_id)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   public.leads          public.rewards        public.lead_egov_links
 (affiliate_id)          (affiliate_id)             (lead_id)
         │                      │
         ▼                      ▼
public.lead_reconciliations ──► Phê duyệt thưởng
(kết quả nhập học A4)           (APPROVED)
```

**Quy tắc bất biến:** Tuyệt đối không chấp nhận `affiliate_id` do client truyền lên qua query params hay payload. Chỉ chấp nhận `affiliate_id` được giải mã từ phiên đăng nhập hợp lệ.

---

### 5.2. Khối 1: Banner chào mừng
1. **Trạng thái tài khoản:**
   - `ACTIVE`: Badge xanh lá *"Đang hoạt động"*, kèm thông điệp hướng dẫn chia sẻ link/mã QR.
   - `SUSPENDED`: Badge màu hổ phách *"Tạm ngưng hoạt động"*, hiển thị khối cảnh báo nêu rõ lý do tạm ngưng từ CSDL (`suspension_reason`), số hotline và email hỗ trợ tuyển sinh. Khóa các nút lấy link/QR nhưng vẫn cho phép CTV theo dõi toàn bộ dữ liệu lịch sử.
2. **Họ tên & Mã CTV:** Lấy từ `affiliate_profiles`. Nút *"Sao chép mã"* sao chép chính xác mã vào clipboard kèm toast thông báo 2s.
3. **Nút điều hướng nhanh:**
   - Nút 1: **"Xem khóa học"** (nhãn đúng hiện tại) điều hướng đến `/portal/courses`.
   - Nút 2: **"Xem khách hàng"** điều hướng đến `/portal/leads`.

---

### 5.3. Khối 2: 4 Card kết quả (Metrics Cards)

#### 1. Thẻ 1: Tổng khách được giới thiệu (Lượt đăng ký được ghi nhận)
- **Đơn vị thực tế:** **Lượt đăng ký** (Mỗi lần ứng viên gửi form thành công cho một khóa học qua link/QR của CTV được ghi nhận là 1 bản ghi `leads`).
- **Nhãn hiển thị:** **"Lượt đăng ký được ghi nhận"** (hoặc *"Tổng khách được giới thiệu"*).
- **Công thức:**
  $$\text{Total Leads} = \text{COUNT}(\text{leads.id}) \quad \text{với } \text{affiliate\_id} = \text{current\_affiliate\_id}$$
- **Quy tắc chống đếm trùng:**
  - Nếu cùng 1 SĐT gửi lại cùng 1 khóa trong thời gian bảo hộ (90 ngày): Hệ thống A3 đã chống tạo lead trùng, chỉ ghi nhận 1 bản ghi duy nhất.
  - Nếu cùng 1 người đăng ký 2 khóa khác nhau: Tính là 2 lượt đăng ký độc lập (đúng thực tế tư vấn và đối soát của 2 ngành đào tạo).
- **Đồng bộ:** Dùng cùng định nghĩa và tập dữ liệu với danh sách khách hàng tại phân hệ A3 (`/portal/leads`).

#### 2. Thẻ 2: Khách chưa nhập học
- **Nguồn dữ liệu:** Cột `leads.admission_status` kết hợp kết quả đối soát A4.
- **Công thức:**
  $$\text{Not Enrolled} = \text{COUNT}(\text{leads.id}) \quad \text{với } \text{affiliate\_id} = \text{current\_affiliate\_id} \text{ AND } (\text{admission\_status} = \text{'NOT\_ENROLLED'} \text{ OR } \text{admission\_status IS NULL})$$
- **Bản chất nghiệp vụ:** Bao gồm các ứng viên đang trong quá trình tư vấn (`counseling_status` in `NEW`, `CONTACTED`, `CONSULTING`), chưa đối soát nhập học, hoặc đã đối soát nhưng xác nhận không nhập học (`MISMATCH_INVALID`).

#### 3. Thẻ 3: Khách đã nhập học
- **Nguồn dữ liệu:** Cột `leads.admission_status` do Cán bộ Tuyển sinh xác nhận chính thức tại phân hệ A4 (`lead_reconciliations.admission_status = 'ENROLLED'`).
- **Công thức:**
  $$\text{Enrolled} = \text{COUNT}(\text{leads.id}) \quad \text{với } \text{affiliate\_id} = \text{current\_affiliate\_id} \text{ AND } \text{admission\_status} = \text{'ENROLLED'}$$
- **Lưu ý nghiệp vụ cốt lõi:**
  - Tuyệt đối không suy đoán nhập học từ việc điền form, có mã EGOV hay có link đăng ký.
  - Bao gồm cả trường hợp hợp lệ (`MATCHED_VALID`) và trường hợp học viên đã tự đăng ký tại trường trước ngày CTV giới thiệu (`EXISTING_IN_SCHOOL_SYSTEM`).
  - **Quan hệ tổng:** $\text{Chưa nhập học} + \text{Đã nhập học} + \text{Rút hồ sơ (nếu có)} = \text{Tổng lượt đăng ký}$.

#### 4. Thẻ 4: Hồ sơ hợp lệ đủ điều kiện xét thưởng
- **Nguồn dữ liệu:** Cột `leads.reconciliation_status = 'MATCHED_VALID'`.
- **Công thức:**
  $$\text{Matched Valid} = \text{COUNT}(\text{leads.id}) \quad \text{với } \text{affiliate\_id} = \text{current\_affiliate\_id} \text{ AND } \text{reconciliation\_status} = \text{'MATCHED\_VALID'}$$
- **Phân biệt rạch ròi:**
  - `Khách đã nhập học` $\ge$ `Hồ sơ hợp lệ đủ điều kiện xét thưởng`.
  - Một học viên có thể *Đã nhập học* nhưng *Không đủ điều kiện xét thưởng* (nếu thuộc diện `EXISTING_IN_SCHOOL_SYSTEM` - đã có hồ sơ tại trường trước khi CTV gửi link).
  - Trạng thái `MATCHED_VALID` là điều kiện kích hoạt bản ghi thưởng `rewards` sang `PENDING_APPROVAL`.

---

### 5.4. Khối 3: 3 Card thù lao (Reward Cards)

| Thẻ | Nhãn hiển thị | Công thức tính tiền (VNĐ) | Công thức tính số khoản | Ghi chú nghiệp vụ |
|---|---|---|---|---|
| **Thẻ 1** | **Thù lao chờ duyệt** | $\sum \text{rewards.amount}$ <br>với `status = 'PENDING_APPROVAL'` | $\text{COUNT}(\text{rewards.id})$ <br>với `status = 'PENDING_APPROVAL'` | Khoản thưởng phát sinh sau khi A4 đối soát `MATCHED_VALID`, đang chờ Ban Giám hiệu / Admin phê duyệt. |
| **Thẻ 2** | **Thù lao đã duyệt** | $\sum \text{rewards.amount}$ <br>với `status = 'APPROVED'` | $\text{COUNT}(\text{rewards.id})$ <br>với `status = 'APPROVED'` | Đã được Admin phê duyệt chính thức, đủ điều kiện xuất bảng kê chi trả. |
| **Thẻ 3** | **Thù lao đã thanh toán** | $0\text{ VNĐ}$ <br>(Hiện trạng CSDL chưa có bảng Payouts) | $0\text{ đợt}$ | Giai đoạn 1 Kế toán chi trả ngoại tuyến. Hệ thống ghi rõ phụ thuộc cho C6.4 / A5 khi triển khai module Payouts. |

**Nguyên tắc tài chính bất biến:**
- Tuyệt đối không lấy `Số khách * 500.000 đ` để tự tính tiền giả.
- Các khoản bị từ chối (`REJECTED`) hoặc bị hủy do sửa ghép nhầm (`VOIDED`) **hoàn toàn không được cộng** vào Chờ duyệt hay Đã duyệt.
- Số tiền và số khoản hiển thị trên mỗi card phải được tính trên cùng một điều kiện lọc chính xác.

---

### 5.5. Khối 4: 2 Biểu đồ thống kê trực quan (Visual Analytics)

#### 1. Biểu đồ 1: Đăng ký mới & Nhập học theo tháng (12 tháng gần nhất)
- **Mục đích:** Thể hiện xu hướng tiếp thị và hiệu quả chuyển đổi học viên của CTV qua từng tháng.
- **Phạm vi thời gian:** Đúng 12 tháng liên tục, tính từ **(Tháng hiện tại - 11 tháng)** đến **Tháng hiện tại**.
- **Múi giờ chuẩn:** `Asia/Ho_Chi_Minh` (UTC+7).
- **Trục hoành (X):** 12 mốc tháng theo định dạng `MM/YYYY` (ví dụ: `11/2025`, `12/2025`, `01/2026`, ..., `10/2026`).
- **2 Chuỗi dữ liệu (Series):**
  - **Chuỗi 1: Đăng ký mới (Bar / Line xanh dương):** Gom nhóm theo `date_trunc('month', leads.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`.
  - **Chuỗi 2: Đã nhập học (Bar / Line xanh lá):** Gom nhóm theo ngày xác nhận nhập học chính thức từ `lead_reconciliations.reconciled_at` (với `lead_reconciliations.admission_status = 'ENROLLED'` và `reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM')`).
- **Quy tắc lấp đầy (Zero-fill):** Các tháng không phát sinh dữ liệu bắt buộc hiển thị giá trị `0`, không được bỏ qua tháng.

#### 2. Biểu đồ 2: Số khách đăng ký & Đã nhập học theo từng khóa học
- **Mục đích:** Giúp CTV nhận biết ngành nghề đào tạo nào đang được học viên quan tâm nhiều nhất và ngành nào có tỷ lệ nhập học cao nhất.
- **Phạm vi thời gian:** Toàn bộ thời gian hoạt động của CTV.
- **Phạm vi khóa học:** Toàn bộ các khóa học mà CTV từng phát sinh ít nhất 1 lượt đăng ký (bao gồm cả các khóa học hiện tại đã tạm ẩn hoặc ngừng tuyển sinh công khai để bảo toàn kết quả lịch sử).
- **2 Cột số liệu cho mỗi khóa:**
  - **Lượt đăng ký:** `COUNT(leads.id)` theo `course_id`.
  - **Lượt nhập học:** `COUNT(CASE WHEN leads.admission_status = 'ENROLLED' THEN 1 END)` theo `course_id`.
- **Bố cục đề xuất:** Biểu đồ cột ngang (Horizontal Bar Chart) hoặc biểu đồ cột nhóm, sắp xếp giảm dần theo tổng số lượt đăng ký. Khi danh sách khóa học nhiều hơn 6 khóa, hỗ trợ thanh cuộn dọc mượt mà để tránh tràn vỡ giao diện.

---

### 5.6. Khối 5: Danh sách 5 khách đăng ký gần đây (Recent Leads Table)
- **Truy vấn:** Lấy 5 bản ghi mới nhất từ `leads` của CTV (`ORDER BY created_at DESC LIMIT 5`).
- **Các trường hiển thị trên bảng:**
  1. **Khách hàng:** Họ và tên (`leads.full_name`).
  2. **Số điện thoại:** Đã che 4 số cuối bảo vệ quyền riêng tư (`phone_masked`, ví dụ: `0901 234 ***`).
  3. **Khóa học quan tâm:** Tên khóa học (`courses.title`).
  4. **Ngày đăng ký:** Định dạng ngày Việt Nam `DD/MM/YYYY` từ `leads.created_at`.
  5. **Tình trạng nhập học:** Badge `Đã nhập học` (Xanh lá) hoặc `Chưa nhập học` (Xám/Vàng nhạt).
  6. **Đối chiếu hồ sơ:** Badge `Hợp lệ` (Xanh lục), `Không hợp lệ` (Đỏ), `Đã có tại trường` (Tím), hoặc `Chưa đối chiếu` (Vàng).
- **Thao tác:**
  - Bấm vào từng hàng để mở chi tiết khách hàng tại `/portal/leads/:id`.
  - Nút **"Xem tất cả"** ở góc phải tiêu đề khối điều hướng thẳng đến `/portal/leads`.
- **Trạng thái rỗng (Empty State):** Nếu CTV chưa có lượt đăng ký nào, hiển thị thông điệp thân thiện kèm nút điều hướng đến `/portal/courses` để lấy link/mã QR.

---

## VI. PHÂN QUYỀN, BẢO MẬT & TRẠNG THÁI GIAO DIỆN

### 6.1. Phân quyền và Bảo mật (Authorization & Security)
1. **Kiểm soát phiên đăng nhập:**
   - Middleware `requireActiveAffiliate` và hàm `resolveAffiliateSession` xác thực danh tính CTV từ Supabase Auth JWT / Session.
   - CTV chỉ được phép truy xuất dữ liệu có `affiliate_id` thuộc về chính mình. Tuyệt đối không trả về thông tin khách hàng, số liệu tài chính hay mã hồ sơ của CTV khác.
2. **Ẩn hoàn toàn thông tin nội bộ trường:**
   - CTV không được xem: Tên cán bộ tuyển sinh đối soát, mã phiếu thu nội bộ, ngày thu tiền thực tế, ghi chú nghiệp vụ nội bộ, lý do từ chối nội bộ.
   - Số điện thoại khách hàng luôn được mask 4 số cuối ở tầng API Gateway trước khi gửi về client.

### 6.2. Quản lý trạng thái giao diện (UI State Handling)
- **Đang tải (Loading State):** Hiển thị Skeleton Loader chuẩn cho từng khối:
  - Skeleton Banner chào mừng (180px).
  - Skeleton 4 Card kết quả + 3 Card thù lao.
  - Skeleton 2 Biểu đồ (280px).
  - Skeleton Bảng 5 khách hàng gần đây (5 dòng).
- **Lỗi tải dữ liệu (Error State):**
  - Hiển thị hộp thông báo lỗi rõ ràng kèm nút **"Thử lại"** (`loadDashboard()`).
  - **Phân biệt dứt khoát:** Giá trị `0` biểu thị đã truy vấn CSDL thành công nhưng không có bản ghi phát sinh; không được dùng `0` làm giá trị fallback khi API gặp lỗi mạng hoặc lỗi server 500.
- **Tài khoản tạm ngưng (Suspended State):**
  - Giữ nguyên toàn bộ số liệu thống kê lịch sử.
  - Banner chuyển sang giao diện cảnh báo (nền Slate/Amber, badge *Tạm ngưng hoạt động*, hiển thị lý do tạm ngưng và hotline hỗ trợ).
  - Khóa tính năng tạo link/QR mới.

---

## VII. HỢP ĐỒNG API ĐỀ XUẤT CHO BƯỚC C6.2

Đề xuất nâng cấp endpoint `GET /api/v1/affiliate/dashboard/summary` (hoặc chuẩn hóa `GET /api/v1/affiliate/dashboard`) với schema JSON chuẩn:

```typescript
// Response Schema cho GET /api/v1/affiliate/dashboard/summary
interface AffiliateDashboardSummaryResponse {
  success: boolean;
  data: {
    // 1. Thông tin định danh CTV
    affiliate: {
      id: string;
      full_name: string;
      affiliate_code: string;
      status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_REVIEW';
      suspension_reason?: string;
    };

    // 2. Thẻ kết quả (4 Metrics)
    metrics: {
      total_leads: number;             // Tổng lượt đăng ký ghi nhận
      not_enrolled_leads: number;      // Chưa nhập học
      enrolled_leads: number;          // Đã nhập học (gồm cả MATCHED_VALID và EXISTING_IN_SCHOOL_SYSTEM)
      matched_valid_leads: number;     // Hồ sơ hợp lệ đủ điều kiện xét thưởng
    };

    // 3. Thẻ thù lao (3 Reward Cards)
    rewards: {
      pending: {
        amount: number;                // Tổng tiền thù lao chờ duyệt (VNĐ)
        count: number;                 // Số khoản chờ duyệt
      };
      approved: {
        amount: number;                // Tổng tiền thù lao đã duyệt (VNĐ)
        count: number;                 // Số khoản đã duyệt
      };
      paid: {
        amount: number;                // 0 (Chờ Phase 2 / Module Payouts)
        count: number;                 // 0
        available: boolean;            // false
      };
    };

    // 4. Biểu đồ 12 tháng gần nhất (Múi giờ Asia/Ho_Chi_Minh)
    monthly_trend: Array<{
      month_key: string;              // "YYYY-MM" (ví dụ: "2026-03")
      month_label: string;            // "T03/2026"
      leads_count: number;            // Số đăng ký mới trong tháng
      enrolled_count: number;         // Số nhập học được xác nhận trong tháng
    }>;

    // 5. Biểu đồ phân bố theo khóa học
    course_breakdown: Array<{
      course_id: string;
      course_code: string;
      course_title: string;
      total_leads: number;            // Tổng lượt đăng ký khóa này
      enrolled_leads: number;         // Lượt đã nhập học khóa này
    }>;

    // 6. Danh sách 5 đăng ký gần đây
    recent_leads: Array<{
      id: string;
      full_name: string;
      phone_masked: string;
      course_id: string;
      course_title: string;
      created_at: string;
      counseling_status: string;
      admission_status: 'ENROLLED' | 'NOT_ENROLLED';
      reconciliation_status: 'MATCHED_VALID' | 'EXISTING_IN_SCHOOL_SYSTEM' | 'MISMATCH_INVALID' | 'NOT_RECONCILED' | 'VOIDED';
      has_egov_link: boolean;
      external_admission_code?: string | null;
    }>;

    // 7. Thời điểm tổng hợp dữ liệu
    generated_at: string;
  };
  error?: string;
}
```

---

## VIII. BỐ CỤC GIAO DIỆN DASHBOARD HOÀN CHỈNH (WIRE-FRAME FLOW)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [APP HEADER DÙNG CHUNG: Cổng Cộng tác viên - TRƯỜNG SAIGONTOURIST | Avatar CTV]│
├────────────────────────────────────────────────────────────────────────────────┤
│ [SIDEBAR] │                                                                    │
│           │ 1. BANNER CHÀO MỪNG (Welcome Banner)                               │
│           │    - Badge trạng thái: [Đang hoạt động]                            │
│           │    - "Xin chào, [Họ và tên CTV]!"                                  │
│           │    - Mã CTV: [STHCCTV1088] + [Sao chép mã]                         │
│           │    - Hướng dẫn tiếp thị tuyển sinh                                 │
│           │    - Nút thao tác nhanh: [Xem khóa học] [Xem khách hàng]           │
│           │                                                                    │
│           │ 2. CẢNH BÁO TẠM NGƯNG (Chỉ hiển thị khi status = SUSPENDED)        │
│           │                                                                    │
│           │ 3. KHỐI 4 CARD KẾT QUẢ TUYỂN SINH (Grid 4 cột)                     │
│           │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐│
│           │    │ Lượt đăng ký │ │Chưa nhập học │ │ Đã nhập học  │ │Hồ sơ h.lệ ││
│           │    │    [ 12 ]    │ │    [ 7 ]     │ │    [ 5 ]     │ │   [ 4 ]   ││
│           │    └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘│
│           │                                                                    │
│           │ 4. KHỐI 3 CARD THÙ LAO (Grid 3 cột)                                │
│           │    ┌──────────────────┐ ┌──────────────────┐ ┌───────────────────┐│
│           │    │  Thù lao chờ duyệt│ │ Thù lao đã duyệt │ │Thù lao đã t.toán││
│           │    │   1.500.000 đ    │ │   1.000.000 đ    │ │       0 đ       ││
│           │    │ (3 khoản chờ BGH)│ │ (2 khoản đã duyệt│ │(Ngoại tuyến)    ││
│           │    └──────────────────┘ └──────────────────┘ └───────────────────┘│
│           │                                                                    │
│           │ 5. KHỐI 2 BIỂU ĐỒ THỐNG KÊ (Grid 2 cột)                            │
│           │    ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│           │    │ Biểu đồ 12 tháng gần nhất   │ │ Phân bố theo khóa học       ││
│           │    │ (Đăng ký vs Nhập học/tháng) │ │ (Đăng ký vs Nhập học/khóa)  ││
│           │    └─────────────────────────────┘ └─────────────────────────────┘│
│           │                                                                    │
│           │ 6. DANH SÁCH 5 KHÁCH ĐĂNG KÝ GẦN ĐÂY                               │
│           │    [Khách hàng | SĐT | Khóa học | Ngày ĐK | Nhập học | Đối soát]   │
│           │    [Dòng 1: Nguyễn Văn A | 0901*** | Hướng dẫn du lịch | ...]     │
│           │    ...                                                             │
│           │    [Xem tất cả -> /portal/leads]                                   │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## IX. ĐIỂM CHƯA XÁC MINH, DỮ LIỆU CÒN THIẾU VÀ PHỤ THUỘC

1. **Module Thanh toán Thù lao (Payouts / A5):**
   - **Hiện trạng:** CSDL Supabase hiện tại chưa có bảng `payouts` hay trạng thái `PAID` trong bảng `rewards` (đúng theo thiết kế V1.1 Phase 1 là Kế toán chi trả ngoài hệ thống).
   - **Xử lý:** Card *"Thù lao đã thanh toán"* sẽ hiển thị `0 đ` kèm phụ chú nghiệp vụ rõ ràng, không sinh số liệu giả. Khi bước C6.4 hoặc phân hệ A5 triển khai sẽ kết nối nguồn dữ liệu này.
2. **Thời điểm nhập học lịch sử:**
   - Trường `lead_reconciliations.reconciled_at` lưu trữ chính xác thời điểm cán bộ tuyển sinh xác nhận nhập học. Phép gom nhóm theo tháng của chỉ số Nhập học sẽ sử dụng `reconciled_at` (hoặc `tuition_paid_at` nếu có biên lai).
3. **Thống kê CTV cấp dưới (Giới thiệu CTV):**
   - Hệ thống chưa hỗ trợ mô hình CTV đa cấp tại Phase 1. Mục này được bảo lưu cho bước C6.8, hoàn toàn không hiển thị số liệu giả ở C6.1.

---

## X. DANH SÁCH KIỂM TRA NGHIỆM THU CHO CÁC BƯỚC TIẾP THEO (C6.2 – C6.7)

- [ ] **C6.2:** Xây dựng API `GET /api/v1/affiliate/dashboard/summary` chuẩn hóa: loại bỏ hoàn toàn mock data `+3`, `+2`, `+1`, `* 500000`, trả đầy đủ chuỗi 12 tháng và phân bố khóa học.
- [ ] **C6.3:** Cập nhật UI Banner và 4 Card kết quả tuyển sinh theo đúng công thức đã chốt.
- [ ] **C6.4:** Cập nhật UI 3 Card thù lao với số tiền và số khoản thật từ bảng `rewards`.
- [ ] **C6.5:** Tích hợp 2 component Biểu đồ thống kê (Chart.js / Recharts / SVG thuần tối ưu nhẹ).
- [ ] **C6.6:** Hoàn thiện Bảng 5 khách hàng gần đây kết nối chi tiết lead và xử lý Empty State.
- [ ] **C6.7:** Kiểm thử E2E toàn diện Dashboard CTV trên nhiều tài khoản (Active, Suspended, CTV mới 0 lead, CTV có nhiều lead và nhiều khoản thưởng).

---
*Tài liệu C6.1 đã hoàn tất kiểm kê và đặc tả chi tiết. Sẵn sàng cho bước triển khai API C6.2.*
