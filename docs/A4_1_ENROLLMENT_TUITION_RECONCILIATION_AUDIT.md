# BÁO CÁO KIỂM KÊ HIỆN TRẠNG MODULE “ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ” (A4.1)
## HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

- **Mã tài liệu:** `A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT`
- **Giai đoạn:** A4.1 – Kiểm kê hiện trạng kỹ thuật & luồng dữ liệu thực tế
- **Ngày kiểm kê:** 04/10/2026
- **Môi trường:** Độc lập hoàn toàn, chế độ chỉ đọc (Read-Only), không sửa đổi dữ liệu thực tế.

---

## 1. PHẠM VI VÀ MÔI TRƯỜNG ĐÃ KIỂM TRA

### 1.1. Phạm vi kiểm tra
1. **Kiểm tra mã nguồn & giao diện (Frontend):**
   - Cấu hình điều hướng: `/src/config/navConfig.ts`, `/src/config/affiliateNavConfig.ts`.
   - Định tuyến trung tâm: `/src/App.tsx`.
   - Thành phần quản trị: `/src/components/admin/AdminPortal.tsx` (Tab `reconcile`, `rewards`, `audit`), `/src/components/admin/AdminLeadDetailView.tsx`.
   - Thành phần Cổng CTV: `/src/components/affiliate/AffiliateLeadsView.tsx`, `/src/components/affiliate/AffiliateLeadDetailView.tsx`.
   - Dịch vụ gọi API & Kiểu dữ liệu: `/src/services/api.ts`, `/src/types/index.ts`.
2. **Kiểm tra logic máy chủ & API (Backend):**
   - File xử lý chính: `/server.ts` (các endpoint `/api/v1/admin/leads/:id/reconcile`, `/api/v1/admin/leads/:id/void-reconciliation`, `/api/v1/admin/leads/:id/history`, `/api/v1/affiliate/leads/:id/history`, `/api/v1/admin/rewards`).
   - Phân quyền & Middleware: `requireStaffOrAdmin`, `requireAdminOnly`, `requireActiveAffiliate`.
3. **Kiểm tra cấu trúc CSDL & Phân quyền Supabase (Database):**
   - Các file migration:
     - `/supabase/migrations/20260929000001_initial_schema.sql` (Định nghĩa bảng `leads`, `lead_reconciliations`, `rewards`, `audit_logs`, các Partial Unique Indexes).
     - `/supabase/migrations/20260929000002_permissions_and_rls.sql` (Phân quyền bảo mật bảng và RLS).
     - `/supabase/migrations/20260929000004_atomic_operations.sql` (Hàm nguyên tử `fn_reconcile_lead_and_create_reward`, `fn_void_reconciliation_and_reward`, `fn_approve_reward`, `fn_reject_reward`).
     - `/supabase/migrations/20261003000002_add_lead_care_history_and_atomic_update.sql`, `/supabase/migrations/20261004000001_fix_a3_care_rpc_overloads_and_strict_idempotency.sql`, `/supabase/migrations/20261004000002_enforce_mandatory_concurrency_timestamp.sql`.
4. **Kiểm tra chất lượng dữ liệu thực tế (Database Live Read):**
   - Chạy script kiểm kê chỉ đọc qua Supabase Service Role client trên database thử nghiệm kết nối thực tế.

---

## 2. DANH MỤC GIAO DIỆN, API VÀ DỮ LIỆU HIỆN TẠI

### 2.1. Danh mục Giao diện (Frontend Components)

| Thành phần / Chức năng | Đường dẫn file & Component | API gọi | Nguồn dữ liệu | Trạng thái | Bằng chứng & Tồn tại |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Menu Điều hướng Quản trị** | `/src/config/navConfig.ts` (`ADMIN_NAV_ITEMS`) | Không | File config tĩnh | **ĐÃ CÓ** | Item `admin_reconcile` dẫn đến path `/admin/reconcile` với icon `FileCheck2`. |
| **Tab Đối Soát Hồ Sơ** | `/src/components/admin/AdminPortal.tsx` (dòng 1205–1288) | `api.getAdminLeads()` | CSDL Supabase | **CÓ NHƯNG SAI** | Hiển thị bảng lead, nút "Đối soát khớp hồ sơ", "Hủy ghép nhầm", "Lịch sử". Nhưng danh sách nạp từ API getAdminLeads chung, thiếu toolbar tìm kiếm, lọc và phân trang chuyên biệt. |
| **Modal Đối Soát Hồ Sơ** | `/src/components/admin/AdminPortal.tsx` (dòng 1443–1549) | `api.reconcileLead(id, payload)` | Form nhập + Mock state | **CÓ NHƯNG SAI** | Có đầy đủ các trường: Mã hồ sơ, Mã HV, Số biên lai, Học phí, Ngày đóng, Ghi chú. **Sai sót:** Khi mở modal tự random sinh mã `STHC-2026-TS-XXXX`, `BL-2026-09-XXXX` và gán mặc định học phí `14500000` (hardcode). |
| **Modal Hủy Ghép Đối Soát** | `/src/components/admin/AdminPortal.tsx` (dòng 1554–1600) | `api.voidReconciliation(id, reason)` | Form nhập | **ĐÃ CÓ** | Modal yêu cầu nhập lý do bắt buộc trước khi chuyển trạng thái sang `VOIDED`. |
| **Modal Xem Lịch Sử** | `/src/components/admin/AdminPortal.tsx` (dòng 1604–1672) | `api.getLeadHistory(id)` | CSDL Supabase | **ĐÃ CÓ** | Hiển thị danh sách `reconciliations` và `rewards` của lead. |
| **Khối Đối Chiếu trong Chi Tiết Lead (Admin)** | `/src/components/admin/AdminLeadDetailView.tsx` | `api.getAdminLeadDetail(id)` | CSDL Supabase | **CHƯA CÓ** | Trang chi tiết `/admin/leads/:id` hiện chỉ có form Chăm sóc khách hàng (A3.6), chưa tích hợp form thực hiện đối soát trực tiếp. |
| **Hiển thị EGOV & Nhập học tại Danh Sách Admin** | `/src/components/admin/AdminPortal.tsx` (Tab `leads`, dòng 1082–1160) | `api.getAdminLeads()` | CSDL Supabase | **ĐÃ CÓ** | Đã có cột "Mã hồ sơ (EGOV)" và cột "Đối soát / Nhập học" (`MATCHED_VALID` / `NOT_RECONCILED`). |
| **Hiển thị EGOV & Nhập học tại Cổng CTV** | `/src/components/affiliate/AffiliateLeadsView.tsx`, `/src/components/affiliate/AffiliateLeadDetailView.tsx` | `api.getAffiliateLeads()`, `api.getAffiliateLeadDetail()` | CSDL Supabase | **ĐÃ CÓ** | Đã hiển thị mã EGOV và tình trạng "Đã nhập học" / "Chưa nhập học" đồng bộ, che 4 số cuối SĐT, ẩn hoàn toàn thông tin học phí chi tiết. |

---

### 2.2. Danh mục API Backend

| Method | Endpoint | File & Dòng xử lý | Hàm / Bảng CSDL | Quyền yêu cầu | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/leads/:id/reconcile` | `/server.ts` (dòng 6629–6749) | `fn_reconcile_lead_and_create_reward` hoặc fallback insert `lead_reconciliations`, `rewards`, `audit_logs` | `requireStaffOrAdmin` | **CÓ NHƯNG SAI** (Hardcode `demoState.adminUser.id` và `demoState.activeAffiliate.id`) |
| `POST` | `/api/v1/admin/leads/:id/void-reconciliation` | `/server.ts` (dòng 6752–6817) | `fn_void_reconciliation_and_reward` hoặc fallback update `lead_reconciliations`, `rewards` | `requireStaffOrAdmin` | **CÓ NHƯNG SAI** (Hardcode `demoState.adminUser.id` làm `voided_by`) |
| `GET` | `/api/v1/admin/leads/:id/history` | `/server.ts` (dòng 6820–6892) | `leads`, `audit_logs`, `lead_reconciliations`, `rewards` | `requireStaffOrAdmin` | **ĐÃ CÓ** |
| `GET` | `/api/v1/affiliate/leads/:id/history` | `/server.ts` (dòng 2673–2721) | `audit_logs`, `lead_reconciliations` | `requireActiveAffiliate` | **ĐÃ CÓ** (Đã lọc bỏ PII & học phí chi tiết) |
| `GET` | `/api/v1/admin/rewards` | `/server.ts` (dòng 6895–6936) | `rewards`, `leads`, `affiliate_profiles` | `requireStaffOrAdmin` | **ĐÃ CÓ** |
| `POST` | `/api/v1/admin/rewards/:id/approve` | `/server.ts` (dòng 6938–6972) | `fn_approve_reward` hoặc fallback update `rewards` | `requireAdminOnly` | **ĐÃ CÓ** |
| `POST` | `/api/v1/admin/rewards/:id/reject` | `/server.ts` (dòng 6974–7018) | `fn_reject_reward` hoặc fallback update `rewards` | `requireAdminOnly` | **ĐÃ CÓ** |

---

## 3. BẢNG ÁNH XẠ NGUỒN DỮ LIỆU CƠ SỞ DỮ LIỆU

| Thực thể nghiệp vụ | Bảng CSDL thực tế | Các cột chính | Khóa ngoại & Quan hệ | Ràng buộc toàn vẹn |
| :--- | :--- | :--- | :--- | :--- |
| **Khách đăng ký** | `public.leads` | `id`, `full_name`, `phone`, `email`, `province`, `course_id`, `affiliate_id`, `affiliate_code_captured`, `counseling_status`, `reconciliation_status`, `reward_status`, `created_at`, `updated_at` | FK `courses(id)` ON DELETE RESTRICT, FK `affiliate_profiles(id)` ON DELETE RESTRICT | Check constraints cho 3 trục trạng thái. |
| **CTV giới thiệu** | `public.affiliate_profiles` | `id`, `user_id`, `affiliate_code`, `status`, `id_card_number`, `occupation`, `address` | FK `profiles(id)` ON DELETE RESTRICT | Unique `affiliate_code`, Unique `user_id`. |
| **Khóa học** | `public.courses` | `id`, `code`, `title`, `slug`, `department`, `degree_level`, `tuition_fee_estimate`, `is_active`, `accepts_referrals`, `status` | Tham chiếu bởi `leads(course_id)` | Unique `code`, Unique `slug`. |
| **Bản ghi Đối soát** | `public.lead_reconciliations` | `id`, `lead_id`, `staff_id`, `external_admission_code`, `external_student_code`, `tuition_fee_collected`, `receipt_number`, `tuition_paid_at`, `reconciliation_status`, `staff_note`, `void_reason`, `voided_by`, `voided_at`, `reconciled_at` | FK `leads(id)` ON DELETE RESTRICT, FK `profiles(id)` ON DELETE RESTRICT | **Partial Unique Index:** `uq_valid_external_admission_code` WHERE `reconciliation_status = 'MATCHED_VALID'`. Unique `(id, lead_id)`. |
| **Bản ghi Thù lao** | `public.rewards` | `id`, `lead_id`, `reconciliation_id`, `affiliate_id`, `amount`, `status`, `approved_by`, `approved_at`, `rejection_reason`, `void_reason`, `voided_by`, `voided_at`, `created_at`, `updated_at` | FK `leads(id)`, FK `lead_reconciliations(id, lead_id)`, FK `affiliate_profiles(id)`, FK `profiles(id)` | **Partial Unique Index:** `uq_active_reward_per_lead` WHERE `status IN ('PENDING_APPROVAL', 'APPROVED')`. Unique `reconciliation_id`. |
| **Nhật ký Kiểm toán** | `public.audit_logs` | `id`, `actor_id`, `action`, `entity_name`, `entity_id`, `old_values`, `new_values`, `reason`, `idempotency_key`, `ip_address`, `user_agent`, `created_at` | FK `profiles(id)` | Index `actor_id`, `entity_name`, `entity_id`. |

### Nguồn dữ liệu chính (Single Source of Truth)
- **Bảng `lead_reconciliations`** là nguồn chính lưu trữ chi tiết việc đối chiếu (mã EGOV, học phí thực thu, số biên lai, cán bộ thực hiện, thời gian).
- **Bảng `leads`** lưu trữ trạng thái tổng hợp đồng bộ (`reconciliation_status`, `reward_status`).
- Backend sử dụng hàm `getActiveReconciliation()` để lọc bản ghi có `reconciliation_status = 'MATCHED_VALID'` mới nhất, đảm bảo tính toàn vẹn khi hiển thị trạng thái "Đã nhập học" / "Chưa nhập học" và mã EGOV trên các danh sách.

---

## 4. ĐÁNH GIÁ PHÂN QUYỀN THỰC TẾ (AUTHORIZATION AUDIT)

### 4.1. Phân tích quyền Backend & API Gateway
- **Cơ chế xác thực:** Backend kiểm tra Bearer token qua Supabase Auth (`supabaseAuth.auth.getUser(jwt)`).
- **Quyền của Staff:** Cán bộ Tuyển sinh (`role = 'staff'`) được cấp quyền truy cập các endpoint quản trị qua middleware `requireStaffOrAdmin`, được phép thực hiện đối soát (`reconcile`) và hủy đối soát (`void-reconciliation`).
- **Quyền của Admin:** Quản trị viên (`role = 'admin'`) có toàn quyền bao gồm đối soát, hủy đối soát và phê duyệt/từ chối thưởng (`approveReward`, `rejectReward` qua middleware `requireAdminOnly`).
- **Quyền của CTV:**
  - Bị chặn tuyệt đối ở mọi endpoint ghi (`POST /api/v1/admin/*`) với HTTP 403 Forbidden.
  - API đọc của CTV (`GET /api/v1/affiliate/leads` và `GET /api/v1/affiliate/leads/:id`) ép lấy `affiliate_id` từ phiên đăng nhập thực tế của CTV; nếu CTV cố tình đổi ID lead của CTV khác sẽ nhận lỗi `403 Forbidden` hoặc `404 Not Found`.

### 4.2. Lỗi bảo mật & Bất cập phân quyền phát hiện trong mã nguồn
1. **Lỗi gán sai danh tính người xử lý (Identity Hardcoding Defect):**
   - Tại `server.ts` dòng 6653 và dòng 6693, 6730 (`POST /api/v1/admin/leads/:id/reconcile`), `staff_id` và `actor_id` bị gán cứng giá trị `demoState.adminUser.id` thay vì trích xuất từ phiên đăng nhập thật `(req as any).user?.id`.
   - Tại `server.ts` dòng 6766, 6787 (`POST /api/v1/admin/leads/:id/void-reconciliation`), `voided_by` cũng bị gán cứng `demoState.adminUser.id`.
2. **Lỗi gán sai người thụ hưởng thù lao trong Fallback:**
   - Tại `server.ts` dòng 6721, khi chèn bản ghi `rewards` trong trường hợp fallback, code gán cứng `affiliate_id: demoState.activeAffiliate.id` thay vì lấy từ `lead.affiliate_id`. Nếu lead là khách tự nhiên (`affiliate_id = null`), hệ thống lại sinh thưởng cho tài khoản demo.
3. **Thiếu kiểm soát xung đột đồng thời (Missing Concurrency Timestamp):**
   - Endpoint `reconcile` và `void-reconciliation` chưa yêu cầu tham số `client_updated_at` như module Chăm sóc khách hàng A3.6/A3.7, dẫn đến nguy cơ 2 cán bộ cùng mở form đối soát một lúc có thể ghi đè thao tác của nhau.

---

## 5. KẾT QUẢ THỐNG KÊ DỮ LIỆU THỰC TẾ & TRUY VẤN CHỈ ĐỌC

Đã thực hiện truy vấn chỉ đọc trực tiếp trên CSDL Supabase của dự án.

### 5.1. Truy vấn SQL chỉ đọc đã sử dụng
```sql
-- 1. Thống kê tổng số lead và phân bố trạng thái
SELECT 
    COUNT(*) AS total_leads,
    COUNT(CASE WHEN affiliate_id IS NOT NULL THEN 1 END) AS leads_with_affiliate,
    COUNT(CASE WHEN affiliate_id IS NULL THEN 1 END) AS organic_leads
FROM public.leads;

-- 2. Phân bố trạng thái đối soát và thưởng
SELECT 
    reconciliation_status, 
    reward_status, 
    counseling_status, 
    COUNT(*) AS count
FROM public.leads
GROUP BY reconciliation_status, reward_status, counseling_status;

-- 3. Kiểm tra số bản ghi đối soát thực tế
SELECT 
    reconciliation_status,
    COUNT(*) AS total_recons,
    COUNT(DISTINCT external_admission_code) AS unique_egov_codes
FROM public.lead_reconciliations
GROUP BY reconciliation_status;

-- 4. Kiểm tra trùng mã EGOV hợp lệ (MATCHED_VALID)
SELECT 
    UPPER(TRIM(external_admission_code)) AS clean_code, 
    COUNT(*) AS duplicate_count
FROM public.lead_reconciliations
WHERE reconciliation_status = 'MATCHED_VALID'
GROUP BY UPPER(TRIM(external_admission_code))
HAVING COUNT(*) > 1;
```

### 5.2. Kết quả thống kê tổng hợp thực tế
- **Tổng số khách đăng ký trong CSDL:** `8` khách hàng.
- **Số khách có mã EGOV (`MATCHED_VALID`):** `0` khách hàng.
- **Số khách chưa có mã EGOV:** `8` khách hàng (100%).
- **Phân bố trạng thái đối soát (`leads.reconciliation_status`):**
  - `NOT_RECONCILED`: `8` (100%).
  - `MATCHED_VALID`: `0`.
  - `VOIDED`: `0`.
  - `EXISTING_IN_SCHOOL_SYSTEM`: `0`.
  - `MISMATCH_INVALID`: `0`.
- **Phân bố trạng thái thưởng (`leads.reward_status`):**
  - `NONE`: `8` (100%).
  - `PENDING_APPROVAL`: `0`.
  - `APPROVED`: `0`.
  - `VOIDED`: `0`.
  - `REJECTED`: `0`.
- **Số khách có thông tin học phí:** `0`.
- **Tổng số bản ghi trong bảng `lead_reconciliations`:** `0` bản ghi.
- **Tổng số bản ghi trong bảng `rewards`:** `0` bản ghi.
- **Số mã EGOV trùng lặp:** `0`.
- **Khách đăng ký qua CTV:** `3` khách hàng (có mã CTV hợp lệ: `STHCCTV1088`, `STHCCTV6993`, `STHCCTV3042`).
- **Khách đăng ký tự nhiên:** `5` khách hàng (`affiliate_id IS NULL`).
- **Tính toàn vẹn liên kết:** 100% bản ghi lead đều liên kết chính xác với khóa học (`course_id` hợp lệ).

---

## 6. KẾT QUẢ TRUY VẾT MỘT HỒ SƠ HIỆN CÓ (READ-ONLY TRACE)

Đã chọn ngẫu nhiên một hồ sơ thực tế có liên kết CTV để truy vết:

- **Hồ sơ truy vết:** Lead ID `06add90d-...` (đã che bớt).
  - Khách hàng: `T***` (SĐT: `090955****`, Email: `th***@gmail.com`).
  - Khóa học quan tâm: `Kỹ thuật Chế biến Món ăn Á - Âu` (`CBMA-TC-01`).
  - Nguồn CTV: `STHCCTV1088` (Họ tên CTV: `Đào Văn Phương`, Trạng thái: `ACTIVE`).
- **Kết quả truy vết theo luồng nghiệp vụ:**
  1. *Khách đăng ký qua link/QR:* Ghi nhận thành công qua `POST /api/v1/public/leads`, lưu vào bảng `leads` với `counseling_status = 'NEW'`, `reconciliation_status = 'NOT_RECONCILED'`, `reward_status = 'NONE'`.
  2. *Danh sách quản trị & Cổng CTV:* Hồ sơ hiển thị chính xác tại `/admin/leads` và `/portal/leads` với nhãn "Chưa đối soát" và "Chưa nhập học".
  3. *Dữ liệu đối soát & Học phí:* Truy vấn bảng `lead_reconciliations` WHERE `lead_id = '06add90d-...'` trả về `0` bản ghi.
  4. *Tình trạng nhập học:* Hiển thị đúng `"Chưa nhập học"` (do `reconciliation_status = 'NOT_RECONCILED'`).
  5. *Dữ liệu thù lao:* Truy vấn bảng `rewards` WHERE `lead_id = '06add90d-...'` trả về `0` bản ghi (trạng thái `NONE`).
  6. *Điểm dừng:* Hồ sơ đang dừng ở trạng thái chờ cán bộ tuyển sinh liên hệ tư vấn và đối chiếu thực tế.

---

## 7. BẢNG TỔNG HỢP KIỂM KÊ: ĐÃ CÓ / CHƯA CÓ / CÓ NHƯNG SAI / CHƯA KIỂM CHỨNG

| Hạng mục kiểm tra | Đã có | Chưa có | Có nhưng sai | Chưa kiểm chứng | Ghi chú & Chi tiết |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Cấu trúc bảng CSDL `lead_reconciliations`, `rewards`** | ✅ | | | | Đã có trong migration `001` và `004` kèm đầy đủ Partial Unique Indexes. |
| **RPC Database `fn_reconcile_lead_and_create_reward`** | ✅ | | | | Hàm PL/pgSQL nguyên tử hỗ trợ khóa bi quan và chống trùng mã EGOV. |
| **RPC Database `fn_void_reconciliation_and_reward`** | ✅ | | | | Hàm PL/pgSQL hủy đối soát bảo toàn lịch sử kiểm toán. |
| **Đồng bộ hiển thị mã EGOV & Nhập học tại A3 và Cổng CTV** | ✅ | | | | Đã chuẩn hóa qua `getActiveReconciliation()`, che SĐT và PII an toàn. |
| **Bộ lọc & Phân trang chuyên biệt cho `/admin/reconcile`** | | ❌ | | | Chưa có bộ lọc theo khoảng ngày, trạng thái đối soát, tìm kiếm mã EGOV. |
| **Form đối chiếu trực tiếp trong trang chi tiết Lead** | | ❌ | | | Trang `/admin/leads/:id` chưa có khối thao tác đối soát. |
| **Kiểm soát xung đột phiên bản (`client_updated_at`) khi đối soát** | | ❌ | | | Chưa có cơ chế chống ghi đè khi 2 cán bộ cùng mở form đối soát. |
| **Xác định danh tính Cán bộ trong API Backend** | | | ❌ | | Hardcode `demoState.adminUser.id` thay vì lấy từ token session thật. |
| **Gán đúng CTV trong Fallback tạo Thưởng** | | | ❌ | | Hardcode `demoState.activeAffiliate.id` thay vì lấy từ `leads.affiliate_id`. |
| **Dữ liệu trên Reconcile Modal** | | | ❌ | | Tự động sinh mã EGOV/phiếu thu ngẫu nhiên và gán học phí 14.5tr. |
| **Các trạng thái đối soát ngoài `MATCHED_VALID` trên Modal** | | | ❌ | | Modal chỉ hỗ trợ gửi `MATCHED_VALID`, thiếu `EXISTING_IN_SCHOOL_SYSTEM` và `MISMATCH_INVALID`. |
| **Quy định điều kiện cụ thể "Đã nhập học"** | | ❌ | | | Chưa có văn bản quy định tỷ lệ học phí tối thiểu / điều kiện sinh viên chính thức. |
| **Quyền thực thi RPC trên Supabase Remote bằng Staff Token** | | | | ⚠️ | Cần kiểm chứng thực tế quyền thực thi khi chạy RPC qua JWT staff thật ở A4.2. |

---

## 8. DANH SÁCH THIẾU SÓT, MỨC ĐỘ ẢNH HƯỞNG VÀ BƯỚC A4 DỰ KIẾN XỬ LÝ

| STT | Thiếu sót / Lỗi phát hiện | Mức độ ảnh hưởng | Bước A4 dự kiến xử lý |
| :---: | :--- | :---: | :--- |
| **1** | Backend hardcode `staff_id = demoState.adminUser.id` và `voided_by = demoState.adminUser.id` trong API đối soát và hủy đối soát | **CAO** (Làm sai lệch người chịu trách nhiệm kiểm toán) | **A4.2 / A4.3** (Sửa endpoint lấy đúng `actorId` từ session token) |
| **2** | Backend fallback hardcode `affiliate_id = demoState.activeAffiliate.id` khi tạo thưởng | **CAO** (Nguy cơ sinh thưởng sai cho CTV demo khi khách đăng ký tự nhiên) | **A4.2 / A4.3** (Sửa fallback lấy đúng `lead.affiliate_id` hoặc không sinh thưởng nếu lead tự nhiên) |
| **3** | Frontend Modal tự động random mã EGOV/Phiếu thu và gán học phí mặc định `14500000` | **TRUNG BÌNH** (Gây hiểu nhầm là hệ thống tự điền dữ liệu thật) | **A4.4** (Xóa bỏ mock data, để trống input cho cán bộ nhập thật) |
| **4** | Tab `/admin/reconcile` thiếu thanh công cụ tìm kiếm, bộ lọc trạng thái và phân trang chuyên biệt | **TRUNG BÌNH** (Khó khăn khi số lượng hồ sơ lớn) | **A4.4** (Xây dựng Toolbar tìm kiếm, lọc EGOV/học phí, phân trang) |
| **5** | Chưa có form đối soát EGOV / Học phí trong trang chi tiết Lead (`/admin/leads/:id`) | **TRUNG BÌNH** (Cán bộ phải chuyển tab để thao tác) | **A4.4 / A4.5** (Tích hợp Card Đối soát trực tiếp vào `AdminLeadDetailView.tsx`) |
| **6** | Thiếu cơ chế kiểm soát xung đột đồng thời (`client_updated_at`) và `idempotency_key` trên API đối soát | **TRUNG BÌNH** (Nguy cơ race condition hoặc double-click) | **A4.3** (Bổ sung concurrency check và idempotency) |
| **7** | Modal đối soát chưa hỗ trợ ghi nhận `EXISTING_IN_SCHOOL_SYSTEM` và `MISMATCH_INVALID` | **THẤP** (Chưa xử lý được kịch bản học viên đã nộp hồ sơ trước tại trường) | **A4.4** (Bổ sung radio chọn kết quả đối soát) |

---

## 9. CÁC CÂU HỎI NGHIỆP VỤ CẦN CHỐT TẠI A4.2

1. **Điều kiện công nhận "Đã nhập học":**
   - Tiêu chí chuẩn để ghi nhận "Đã nhập học" là gì? Có bắt buộc nộp 100% học phí kỳ 1 hay chỉ cần nộp đợt 1 / mức cọc tối thiểu (ví dụ: tối thiểu 3.000.000 VNĐ hoặc theo phiếu thu chính thức)?
   - Có bắt buộc phải có đồng thời cả **Mã hồ sơ EGOV** và **Số biên lai học phí** không?
2. **Quy tắc định dạng & Phạm vi duy nhất của Mã hồ sơ EGOV:**
   - Mã hồ sơ tuyển sinh ngoại bộ (`external_admission_code`) là duy nhất trên toàn hệ thống hay theo từng năm học/đợt tuyển sinh?
   - Định dạng mã EGOV chuẩn của trường là gì (độ dài, ký tự, tiền tố) để áp dụng validate regex trên form?
3. **Quy trình xử lý hồ sơ thí sinh đã có tại trường trước đó (`EXISTING_IN_SCHOOL_SYSTEM`):**
   - Khi cán bộ chọn kết quả này, giao diện Cổng CTV sẽ hiển thị thông điệp giải thích như thế nào để minh bạch và tránh khiếu nại từ CTV?
4. **Phân quyền Hủy ghép đối soát (`VOIDED`):**
   - Cán bộ Tuyển sinh (Staff) có được tự ý hủy ghép đối soát khi phát hiện nhầm lẫn mã hồ sơ hay bắt buộc phải có phê duyệt từ Quản trị viên (Admin), đặc biệt là trong trường hợp khoản thưởng liên kết đã ở trạng thái `APPROVED`?

---

## 10. KẾT LUẬN NGHIỆM THU A4.1

- **Kết luận:** **PASS (ĐẠT YÊU CẦU KIỂM KÊ A4.1)**.
- **Lý do:**
  1. Toàn bộ mã nguồn giao diện, API backend, cơ sở dữ liệu Supabase, các hàm RPC nguyên tử và chỉ mục duy nhất đã được rà soát, kiểm kê đầy đủ với đường dẫn file và bằng chứng cụ thể.
  2. Đã xác định rõ nguồn dữ liệu chính (`lead_reconciliations`) và các điểm đồng bộ dữ liệu đối soát.
  3. Đã thực hiện kiểm tra cơ sở dữ liệu thực tế bằng các truy vấn chỉ đọc và xác định chính xác số lượng dữ liệu (8 lead, 0 đối soát, 0 thưởng).
  4. Đã lập danh sách chi tiết các phần đã có, phần chưa có, phần sai sót (đặc biệt là hardcode actor identity) và các câu hỏi nghiệp vụ cần chốt trước khi bước vào A4.2.
  5. Quá trình kiểm kê tuân thủ nghiêm ngặt nguyên tắc chỉ đọc, không sửa đổi chức năng hoặc dữ liệu của hệ thống.
