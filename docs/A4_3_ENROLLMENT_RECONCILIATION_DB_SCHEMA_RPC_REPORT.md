# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.3 — CHUẨN HÓA CSDL, CONSTRAINT VÀ RPC ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ
## HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

- **Mã tài liệu:** `A4_3_ENROLLMENT_RECONCILIATION_DB_SCHEMA_RPC_REPORT`
- **Giai đoạn:** A4.3 – Triển khai CSDL, Constraint & RPC nguyên tử
- **Ngày thực hiện:** 04/10/2026
- **Tài liệu căn cứ:** 
  - Báo cáo kiểm kê [`docs/A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT.md`](./A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT.md)
  - Đặc tả nghiệp vụ [`docs/A4_2_ENROLLMENT_RECONCILIATION_BUSINESS_RULES.md`](./A4_2_ENROLLMENT_RECONCILIATION_BUSINESS_RULES.md)
- **Tệp Migration mới ban hành:** [`supabase/migrations/20261004000004_standardize_reconciliation_schema_and_rpc.sql`](../supabase/migrations/20261004000004_standardize_reconciliation_schema_and_rpc.sql)
- **Script kiểm thử tự động:** [`scripts/verify_a4_reconciliation_db.ts`](../scripts/verify_a4_reconciliation_db.ts) (`npm run test:reconciliation-db`)

---

## 1. TỔNG HỢP KẾT QUẢ ĐẠT ĐƯỢC TẠI A4.3

Trong bước A4.3, toàn bộ 4 quyết định nghiệp vụ của Nhà trường đã được thể chế hóa vào cấu trúc CSDL PostgreSQL, các ràng buộc toàn vẹn (Constraints), chỉ mục duy nhất có điều kiện (Partial Unique Indexes) và các hàm thủ tục nguyên tử (RPC Functions) trên môi trường Supabase:

1. **Chuẩn hóa cấu trúc & Ràng buộc học phí**:
   - Chuyển `tuition_fee_collected` và `tuition_paid_at` trên `lead_reconciliations` thành `NULLABLE` (vì học phí thực thu và biên lai là thông tin bổ trợ, **không phải điều kiện bắt buộc** để xác nhận nhập học nếu EGOV đã tick "Đã nhập học").
   - Bổ sung `course_id`, `course_tuition_fee` (NUMERIC), `course_tuition_fee_type` vào `lead_reconciliations` để lưu giữ mức học phí của khóa học tại thời điểm đối soát phục vụ thống kê doanh thu CTV giới thiệu cho trường sau này.
   - Thêm ràng buộc không âm: `CHECK (tuition_fee_collected IS NULL OR tuition_fee_collected >= 0)` và `CHECK (course_tuition_fee IS NULL OR course_tuition_fee >= 0)`.
   - Phân biệt rõ: `NULL` = Chưa có thông tin, `0` = Đã xác nhận mức thu là 0 (ví dụ miễn phí), `> 0` = Số tiền thực thu.

2. **Quy chuẩn Mã hồ sơ EGOV 7 số (`^[0-9]{7}$`)**:
   - Validate nghiêm ngặt Regex `^[0-9]{7}$` sau khi trim khoảng trắng.
   - Lưu trữ dạng chuỗi ký tự (`VARCHAR`) để giữ nguyên các số 0 ở đầu.
   - Duy trì Partial Unique Index `uq_valid_external_admission_code` chống trùng lặp mã EGOV giữa các hồ sơ đang `MATCHED_VALID`.

3. **Tách biệt hai trục độc lập: Tình trạng nhập học vs Tính hợp lệ giới thiệu**:
   - Trục **Tình trạng nhập học** (`admission_status`): `NOT_ENROLLED`, `ENROLLED`, `WITHDRAWN`.
   - Trục **Tính hợp lệ hồ sơ CTV** (`reconciliation_status`): `NOT_RECONCILED`, `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`, `VOIDED`.
   - Đối với trường hợp `EXISTING_IN_SCHOOL_SYSTEM` (khách đăng ký trước qua kênh khác):
     - `admission_status = 'ENROLLED'` (Người học thực tế đã nhập học tại trường).
     - `reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM'` (Hồ sơ CTV không hợp lệ do đã có trước).
     - `reward_status = 'NONE'` (Không sinh thưởng 500k cho CTV).

4. **Hàm RPC Hủy ghép đối soát (`fn_void_reconciliation_and_reward`)**:
   - Cho phép cả `staff` và `admin` thực hiện hủy khi phát hiện nhập nhầm mã EGOV hoặc ghép nhầm hồ sơ.
   - Chuyển `lead_reconciliations` và `rewards` liên kết sang `VOIDED` trong cùng 1 Database Transaction nguyên tử.
   - Đưa `leads` về `NOT_RECONCILED` / `NOT_ENROLLED` / `NONE`.
   - Tự động giải phóng mã EGOV để cho phép đối soát lại chính xác cho cùng lead hoặc lead khác.

5. **Kiểm soát xung đột phiên bản & Chống tấn công đồng thời**:
   - Kiểm tra `p_expected_updated_at` (Optimistic Concurrency Control) với mã lỗi `40001`.
   - Sử dụng khóa bi quan `SELECT ... FOR UPDATE` trên bảng `leads`.
   - Ghi nhận nhật ký kiểm toán đầy đủ vào `audit_logs`.

---

## 2. CHI TIẾT CÁC THAY ĐỔI SCHEMA & RPC

### 2.1. Thay đổi cấu trúc bảng

```sql
-- 1. Bổ sung admission_status trên bảng leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS admission_status VARCHAR(50) NOT NULL DEFAULT 'NOT_ENROLLED';

ALTER TABLE public.leads 
ADD CONSTRAINT chk_leads_admission_status 
CHECK (admission_status IN ('NOT_ENROLLED', 'ENROLLED', 'WITHDRAWN'));

-- 2. Chuyển học phí và biên lai sang NULLABLE trên lead_reconciliations
ALTER TABLE public.lead_reconciliations 
ALTER COLUMN tuition_fee_collected DROP NOT NULL;

ALTER TABLE public.lead_reconciliations 
ALTER COLUMN tuition_paid_at DROP NOT NULL;

ALTER TABLE public.lead_reconciliations 
ALTER COLUMN external_admission_code DROP NOT NULL;

-- 3. Bổ sung snapshot khóa học và học phí tham chiếu
ALTER TABLE public.lead_reconciliations 
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE RESTRICT;

ALTER TABLE public.lead_reconciliations 
ADD COLUMN IF NOT EXISTS course_tuition_fee NUMERIC(14, 2);

ALTER TABLE public.lead_reconciliations 
ADD COLUMN IF NOT EXISTS course_tuition_fee_type VARCHAR(50) DEFAULT 'ESTIMATE';

-- 4. Ràng buộc không âm
ALTER TABLE public.lead_reconciliations 
ADD CONSTRAINT chk_recon_tuition_fee_collected_nonneg 
CHECK (tuition_fee_collected IS NULL OR tuition_fee_collected >= 0);

ALTER TABLE public.lead_reconciliations 
ADD CONSTRAINT chk_recon_course_tuition_fee_nonneg 
CHECK (course_tuition_fee IS NULL OR course_tuition_fee >= 0);
```

### 2.2. Danh sách các hàm RPC mới

1. `public.fn_reconcile_lead_and_create_reward`:
   - Tham số: `p_lead_id`, `p_staff_id`, `p_reconciliation_status`, `p_external_admission_code`, `p_external_student_code`, `p_course_id`, `p_tuition_fee_collected`, `p_receipt_number`, `p_tuition_paid_at`, `p_staff_note`, `p_expected_updated_at`, `p_idempotency_key`.
   - Quyền: `GRANT EXECUTE TO authenticated, service_role`.
2. `public.fn_void_reconciliation_and_reward`:
   - Tham số: `p_lead_id`, `p_staff_id`, `p_void_reason`, `p_expected_updated_at`.
   - Quyền: `GRANT EXECUTE TO authenticated, service_role`.
3. `public.fn_get_lead_reconciliation_history`:
   - Tham số: `p_lead_id`, `p_caller_id`.
   - Quyền: `GRANT EXECUTE TO authenticated, service_role` (Tự động kiểm tra quyền sở hữu đối với role CTV).

---

## 3. BẢNG TỔNG HỢP NGHIỆM THU KIỂM THỬ TỰ ĐỘNG (10/10 PASS)

Chạy lệnh kiểm thử: `npm run test:reconciliation-db` (File: `scripts/verify_a4_reconciliation_db.ts`)

| Mã ca kiểm thử | Mô tả kịch bản kiểm thử | Kết quả kỳ vọng | Kết quả thực tế | Đánh giá |
| :--- | :--- | :--- | :--- | :---: |
| **TC-A4.3-01** | Quy chuẩn định dạng Regex mã EGOV 7 số (`^[0-9]{7}$`) | Chấp nhận đúng 7 chữ số; từ chối thiếu/thừa số, chứa chữ/khoảng trắng | Mã `0044404` hợp lệ; các mã sai bị từ chối 100% | **PASS** |
| **TC-A4.3-02** | Khởi tạo Lead test ban đầu | `reconciliation_status = NOT_RECONCILED`, `admission_status = NOT_ENROLLED`, `reward_status = NONE` | `reconciliation_status = NOT_RECONCILED`, `admission_status = NOT_ENROLLED`, `reward_status = NONE` | **PASS** |
| **TC-A4.3-03** | Xác nhận nhập học `MATCHED_VALID` và sinh thưởng 500k | `admission_status = ENROLLED`, `reconciliation_status = MATCHED_VALID`, sinh thưởng 500.000 VNĐ `PENDING_APPROVAL` | `admission = ENROLLED`, `recon = MATCHED_VALID`, `reward = PENDING_APPROVAL (500000 VNĐ)` | **PASS** |
| **TC-A4.3-04** | Chống trùng mã EGOV đang `MATCHED_VALID` (Partial Unique Index) | Từ chối gán mã EGOV trùng đang có hiệu lực (Error 23505 Unique Violation) | Bị chặn thành công: `[23505] duplicate key value violates unique constraint "uq_valid_external_admission_code"` | **PASS** |
| **TC-A4.3-05** | Hủy ghép đối soát `VOIDED` và bảo toàn lịch sử | `lead(NOT_RECONCILED, NOT_ENROLLED, NONE)`, `recon(VOIDED)`, `reward(VOIDED)` | `lead = (NOT_RECONCILED, NOT_ENROLLED, NONE)`, `recon = VOIDED`, `reward = VOIDED` | **PASS** |
| **TC-A4.3-06** | Giải phóng mã EGOV sau khi hủy và cho phép đối soát lại (Re-reconciliation) | Thao tác đối soát mới với cùng mã EGOV thành công sau khi bản cũ `VOIDED` | Insert thành công cùng mã EGOV với ID mới | **PASS** |
| **TC-A4.3-07** | Xác nhận `EXISTING_IN_SCHOOL_SYSTEM` (khách đăng ký trước) | `admission_status = ENROLLED`, `reconciliation_status = EXISTING_IN_SCHOOL_SYSTEM`, `reward_status = NONE`, không sinh thưởng | `admission = ENROLLED`, `recon = EXISTING_IN_SCHOOL_SYSTEM`, `reward = NONE`, `reward_count = 0` | **PASS** |
| **TC-A4.3-08** | Xác nhận `MISMATCH_INVALID` (không tìm thấy hồ sơ) | `admission_status = NOT_ENROLLED`, `reconciliation_status = MISMATCH_INVALID`, `reward_status = NONE` | `admission = NOT_ENROLLED`, `recon = MISMATCH_INVALID`, `reward = NONE` | **PASS** |
| **TC-A4.3-09** | Phân biệt học phí khóa học và học phí thực thu | `tuition_fee_estimate > 0`, kiểu số numeric, không bị ghi đè bởi học phí thực thu | Khóa học lưu trữ `tuition_fee_estimate = 14500000 VNĐ` độc lập | **PASS** |
| **TC-A4.3-10** | Ghi nhận nhật ký kiểm toán (`audit_logs`) đầy đủ cho thao tác hủy đối soát | `audit_logs` có action `VOID_RECONCILIATION`, lưu vết old/new values kèm lý do | Tìm thấy bản ghi audit log hợp lệ với reason và actor | **PASS** |

---

## 4. KẾT LUẬN & SẴN SÀNG CHO A4.4

- **Kết luận:** **PASS 100% (10/10 CA KIỂM THỬ ĐẠT YÊU CẦU)**.
- Toàn bộ ràng buộc CSDL, quy chuẩn mã EGOV 7 số, phân tách 2 trục trạng thái, và các hàm nguyên tử đã được chuẩn hóa hoàn tất.
- Không xóa, không reset dữ liệu thực tế và không để lại rác thử nghiệm trong CSDL.
- Hệ thống đã sẵn sàng để chuyển sang bước **A4.4: Chuẩn hóa Backend API & Phân quyền thực tế**.
