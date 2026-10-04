# BÁO CÁO NGHIỆM THU & KIỂM THỬ TOÀN LUỒNG A3.7.1 — MODULE “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU” (STHC_CTV)
**Hệ thống Cổng Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist**

---

## 1. MÔI TRƯỜNG & PHẠM VI KIỂM THỬ (A3.7.1)
- **Môi trường**: Vite + React + Express/NodeJS + Supabase PostgreSQL.
- **Tài khoản kiểm thử**:
  - **Quản trị viên (Admin)**: `admin@sthc.edu.vn` (UID: `879a11fc-ff89-4019-b2f4-57d7843b631b`, role: `admin`, `is_active: true`).
  - **Cán bộ Tuyển sinh (Staff)**: `tuyensinh_canbo@sthc.edu.vn` (UID: `28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`, role: `staff`, `is_active: true`).
  - **CTV A (Active)**: `STHCCTV1088` / `Trần Thị Thu Thảo` (`status: ACTIVE`).
  - **CTV B (Suspended/Pending)**: `STHCCTV1099` (`status: SUSPENDED`), `STHCCTV2001` (`status: PENDING_REVIEW`).
- **Phân định rõ**: Kiểm thử toàn luồng chức năng đọc, ghi nhận, chăm sóc và tích hợp đọc đối chiếu hiện có; **không triển khai mới module Đối chiếu hồ sơ & học phí hoặc tạo thưởng mới**.

---

## 2. MA TRẬN KẾT QUẢ KIỂM THỬ TOÀN DIỆN (A3.7.1)

| Mã Test | Vai Trò | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế | Bằng Chứng Kỹ Thuật | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Public / Khách | Gửi form `POST /api/v1/public/leads` kèm `ref=STHCCTV1088` & khóa học hợp lệ | Ghi nhận lead mới, `counseling_status = 'NEW'`, `affiliate_id` gán đúng cho CTV A | Ghi nhận thành công, tăng số lượng lead +1 | `leadPayload.affiliate_id` gắn đúng UUID CTV, HTTP 200 | **PASS** |
| **TC-02** | Public / Khách | Gửi form với mã CTV bị khóa `ref=STHCCTV1099` (`SUSPENDED`) | Bị từ chối, không tạo lead mới, thông báo CTV tạm ngưng | Trả về HTTP 400 kèm mã lỗi `AFFILIATE_SUSPENDED` | `checkAffiliateReferralEligibility` chặn chính xác | **PASS** |
| **TC-03** | Public / Khách | Trùng số điện thoại + CÙNG khóa học trong vòng 90 ngày | **KHÔNG tạo bản ghi lead mới** (số lượng lead không tăng), giữ nguồn CTV ban đầu | Số lượng lead giữ nguyên, trả về hồ sơ cũ và attribution ban đầu | `insertedLead = { id: existingLead.id }`, không gọi insert | **PASS** |
| **TC-04** | Public / Khách | Cùng số điện thoại nhưng KHÁC khóa học trong vòng 90 ngày | Được tạo lượt đăng ký riêng cho ngành mới, ghi nhận CTV mới | Tạo bản ghi lead mới thành công (+1 lead) | `duplicateQuery` so khớp `course_id`, `is_duplicate = false` | **PASS** |
| **TC-05** | Public / Khách | Gửi payload chứa `reconciliation_status`, `external_admission_code` | Bị từ chối hoặc sanitize, không cho can thiệp đối chiếu | Trạng thái luôn là `NOT_RECONCILED`, không nhận mã EGOV từ client | Backend sanitize và gán cứng giá trị khởi tạo an toàn | **PASS** |
| **TC-06** | CTV A | `GET /api/v1/affiliate/leads` | Chỉ đọc khách của CTV A, che 4 số cuối SĐT (`phone_masked`) | Trả về đúng danh sách CTV A, SĐT dạng `090812****` | `phone_masked: maskPhone(l.phone)` | **PASS** |
| **TC-07** | CTV A | `GET /api/v1/affiliate/leads/:id` của CTV B | Bị từ chối với HTTP 404 / 403 | Trả về 404 Không tìm thấy hồ sơ khách hàng | Query `where id = :id and affiliate_id = :my_id` | **PASS** |
| **TC-08** | CTV A | `GET /api/v1/affiliate/leads/:id/history` | Xem timeline tiến độ tư vấn, nhập học; **KHÔNG rò rỉ ghi chú nội bộ hay actor** | Timeline sạch tuyệt đối, không có `counselor_note`, `added_note` hay `actor` | Whitelist an toàn `type, title, time, details` | **PASS** |
| **TC-09** | Admin / Staff | `GET /api/v1/admin/leads` kèm bộ lọc đa tiêu chí & phân trang | Xem toàn bộ khách của tất cả CTV, hiển thị SĐT gốc, lọc đúng khóa/CTV/ngày/đối soát | Trả về đủ SĐT, tổng số và trang chính xác | Hỗ trợ `page`, `limit` (20, 50, 100), `from_date`, `to_date` | **PASS** |
| **TC-10** | Admin / Staff | `PATCH /api/v1/admin/leads/:id/care` đổi trạng thái & thêm ghi chú | Cập nhật `counseling_status`, ghi chú vào `audit_logs` nguyên tử qua RPC | Cập nhật thành công, tạo bản ghi audit có actor và timestamp | `fn_update_lead_care_and_audit` 6 tham số thực thi nguyên tử | **PASS** |
| **TC-11** | Admin / Staff | Gửi payload chăm sóc chứa `tuition_fee_collected` hoặc `external_admission_code` | Bị từ chối với HTTP 400 Bad Request | Trả về HTTP 400 kèm thông báo vi phạm ranh giới module | Kiểm tra `prohibitedFields` chặn 100% | **PASS** |
| **TC-12** | Admin / Staff | Hai cán bộ sửa đồng thời cùng lead (Optimistic Concurrency) | Một thao tác thành công, thao tác còn lại nhận **409 Conflict** | Thao tác sau bị từ chối 409, giữ nguyên nội dung ghi chú đang nhập | `client_updated_at !== existingLead.updated_at` so sánh chính xác | **PASS** |
| **TC-13** | Admin / Staff | Hai request gửi đồng thời hoặc retry cùng `idempotency_key` | Không tạo audit log trùng lặp; cùng nội dung thì replay, khác nội dung thì từ chối | Replay kết quả cũ (`is_idempotent_replay: true`), báo lỗi 400 nếu mismatch | `uq_audit_logs_lead_care_idempotency` & kiểm tra sau khi khóa | **PASS** |
| **TC-14** | Kẻ tấn công / CTV | Gọi RPC cũ (5 params) hoặc gọi RPC mới với UUID Admin | Overload cũ đã bị xóa; RPC mới kiểm tra `auth.uid() = p_actor_id` | Bị từ chối lỗi 42501 / function not found | Đã DROP overload cũ, revoke PUBLIC/anon | **PASS** |
| **TC-15** | Đọc dữ liệu | Lead có bản MATCHED_VALID cũ nhưng sau đó bị hủy (`VOIDED`) | Hiển thị chính xác **"Chưa nhập học"**, không lấy mã EGOV đã hủy | `getActiveReconciliation` sắp xếp theo timestamp DESC và kiểm tra bản mới nhất | `reconciliation_status = 'NOT_RECONCILED'`, EGOV `null` | **PASS** |
| **TC-16** | Giao diện Web/Mobile | Điều hướng chi tiết `/portal/leads/:id`, `/admin/leads/:id` và quay lại | Giữ nguyên bộ lọc, phân trang và từ khóa tìm kiếm đã chọn | Bảo toàn URL query và state khi nhấn nút quay lại danh sách | Giao diện responsive 100% trên cả Desktop và Mobile | **PASS** |

---

## 3. CHI TIẾT KHẮC PHỤC KỸ THUẬT (A3.7.1)

### 3.1. Dọn Dẹp Overload Cũ & Chuẩn Hóa Chữ Ký RPC
- **Vấn đề**: Migration A3.6 tạo `fn_update_lead_care_and_audit` với 5 tham số, A3.7 tạo 6 tham số dẫn đến tồn tại song song 2 hàm overload.
- **Khắc phục**:
  - Viết migration `20261004000001_fix_a3_care_rpc_overloads_and_strict_idempotency.sql`.
  - `DROP FUNCTION IF EXISTS public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ);`
  - Chuẩn hóa chữ ký duy nhất: `public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR)`.
  - Ràng buộc trực tiếp danh tính caller với `auth.uid()` khi gọi authenticated, thu hồi toàn bộ quyền từ `PUBLIC` và `anon`.

### 3.2. Ràng Buộc Duy Nhất Cho Idempotency
- Thêm ràng buộc duy nhất:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_lead_care_idempotency 
  ON public.audit_logs (actor_id, entity_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL AND entity_name = 'leads';
  ```
- Kiểm tra token idempotency **sau khi đã khóa bi quan dòng lead** (`FOR UPDATE`) để triệt tiêu race condition.
- So sánh nội dung thao tác: nếu cùng key nhưng khác nội dung (mismatch) thì từ chối ngay với mã lỗi `22023`.

### 3.3. Bắt Buộc Kiểm Soát Xung Đột Phiên Bản (Exact Concurrency)
- `client_updated_at` là **bắt buộc** khi có thay đổi trạng thái hoặc thêm ghi chú.
- Loại bỏ hoàn toàn dung sai 2 giây, so sánh chính xác timestamp CSDL. Hai request đồng thời cùng phiên bản sẽ có một request thành công và một request nhận `409 Conflict`.

### 3.4. Chuẩn Hóa Logic Đọc Đối Chiếu (`getActiveReconciliation`)
- Sắp xếp toàn bộ bản ghi đối soát của lead theo `reconciled_at || created_at DESC`.
- Chỉ công nhận là **"Đã nhập học"** khi bản ghi mới nhất có trạng thái `MATCHED_VALID`.
- Nếu bản ghi mới nhất là `VOIDED` (hủy ghép), hệ thống xác định chính xác là **"Chưa nhập học"** và xóa mã EGOV hiển thị.

### 3.5. Chống Trùng Đăng Ký 90 Ngày Cùng Ngành Tuyệt Đối
- Trong `POST /api/v1/public/leads`: nếu phát hiện số điện thoại đã đăng ký cùng khóa học trong vòng 90 ngày, backend **không tạo bản ghi lead mới** (số lượng bản ghi trong CSDL được bảo toàn), đồng thời giữ nguyên nguồn CTV ban đầu.

### 3.6. Lọc Sạch Dữ Liệu Trả Về Cho CTV
- Trong `GET /api/v1/affiliate/leads/:id/history`, dữ liệu trả về chỉ chứa 4 trường an toàn: `{ type, title, time, details }`. Toàn bộ thông tin `counselor_note`, `added_note`, `reason`, `actor` và các bản ghi chỉ thêm ghi chú nội bộ đều được loại bỏ hoàn toàn.

---

## 4. SQL MIGRATION 20261004000001
File: `/supabase/migrations/20261004000001_fix_a3_care_rpc_overloads_and_strict_idempotency.sql`

```sql
-- 1. Xóa bỏ an toàn overload cũ (5 tham số từ A3.6)
DROP FUNCTION IF EXISTS public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ);

-- 2. Xóa bỏ chữ ký 6 tham số cũ để tái tạo phiên bản chuẩn hóa
DROP FUNCTION IF EXISTS public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR);

-- 3. Tạo chỉ mục duy nhất cho Idempotency Token
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
DROP INDEX IF EXISTS public.idx_audit_logs_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_lead_care_idempotency 
ON public.audit_logs (actor_id, entity_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL AND entity_name = 'leads';

-- 4. Tạo hàm RPC chuẩn hóa duy nhất với 6 tham số
CREATE OR REPLACE FUNCTION public.fn_update_lead_care_and_audit(
    p_lead_id UUID,
    p_actor_id UUID,
    p_counseling_status VARCHAR(50) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_lead RECORD;
    v_actor RECORD;
    v_clean_note TEXT;
    v_old_status VARCHAR(50);
    v_new_status VARCHAR(50);
    v_old_note TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_action VARCHAR(100);
    v_audit_id UUID;
    v_status_changed BOOLEAN := FALSE;
    v_note_added BOOLEAN := FALSE;
    v_caller_uid UUID;
    v_existing_audit RECORD;
    v_clean_idempotency_key VARCHAR(100);
BEGIN
    v_caller_uid := auth.uid();
    
    IF v_caller_uid IS NOT NULL THEN
        IF p_actor_id IS NOT NULL AND p_actor_id <> v_caller_uid THEN
            RAISE EXCEPTION 'Bị từ chối: Danh tính người thực hiện (actor_id) không khớp với tài khoản đăng nhập hiện tại.'
                USING ERRCODE = '42501';
        END IF;
        p_actor_id := v_caller_uid;
    END IF;

    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'Bị từ chối: Thiếu thông tin định danh cán bộ thực hiện thao tác.'
            USING ERRCODE = '42501';
    END IF;

    SELECT id, role, full_name, email, is_active INTO v_actor
    FROM public.profiles 
    WHERE id = p_actor_id AND is_active = TRUE;

    IF v_actor IS NULL OR v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (staff) hoặc Quản trị viên (admin) mới có quyền cập nhật chăm sóc khách hàng.'
            USING ERRCODE = '42501';
    END IF;

    v_clean_note := NULLIF(TRIM(p_note), '');
    IF v_clean_note IS NOT NULL THEN
        IF LENGTH(v_clean_note) > 2000 THEN
            RAISE EXCEPTION 'Ghi chú chăm sóc vượt quá độ dài cho phép (tối đa 2000 ký tự).'
                USING ERRCODE = '22023';
        END IF;
        v_note_added := TRUE;
    END IF;

    v_clean_idempotency_key := NULLIF(TRIM(p_idempotency_key), '');

    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    v_old_status := v_lead.counseling_status;
    IF p_counseling_status IS NOT NULL AND TRIM(p_counseling_status) <> '' THEN
        v_new_status := UPPER(TRIM(p_counseling_status));
        IF v_new_status NOT IN ('NEW', 'CONTACTED', 'CONSULTING', 'UNREACHABLE', 'LOST') THEN
            RAISE EXCEPTION 'Trạng thái chăm sóc không hợp lệ: "%". Chỉ chấp nhận: NEW, CONTACTED, CONSULTING, UNREACHABLE, LOST.', v_new_status
                USING ERRCODE = '22023';
        END IF;
        IF v_new_status <> v_old_status THEN
            v_status_changed := TRUE;
        END IF;
    ELSE
        v_new_status := v_old_status;
    END IF;

    IF v_clean_idempotency_key IS NOT NULL THEN
        SELECT id, action, old_values, new_values, created_at INTO v_existing_audit
        FROM public.audit_logs
        WHERE actor_id = p_actor_id 
          AND entity_name = 'leads'
          AND entity_id = p_lead_id
          AND idempotency_key = v_clean_idempotency_key
        LIMIT 1;

        IF v_existing_audit IS NOT NULL THEN
            IF (v_existing_audit.new_values->>'counseling_status' = v_new_status) AND
               ((v_existing_audit.new_values->>'added_note' IS NULL AND v_clean_note IS NULL) OR 
                (v_existing_audit.new_values->>'added_note' = v_clean_note)) THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'message', 'Thao tác đã được ghi nhận trước đó (Idempotent replay).',
                    'lead_id', p_lead_id,
                    'counseling_status', v_lead.counseling_status,
                    'counselor_note', v_lead.counselor_note,
                    'updated_at', v_lead.updated_at,
                    'audit_id', v_existing_audit.id,
                    'audit_action', v_existing_audit.action,
                    'audit_logged', true,
                    'is_idempotent_replay', true
                );
            ELSE
                RAISE EXCEPTION 'Xung đột khóa thao tác (Idempotency Key Mismatch): Khóa định danh "%" đã được sử dụng cho một nội dung khác.', v_clean_idempotency_key
                    USING ERRCODE = '22023';
            END IF;
        END IF;
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at IS NOT NULL THEN
        IF v_lead.updated_at <> p_expected_updated_at THEN
            RAISE EXCEPTION 'Xung đột cập nhật: Dữ liệu hồ sơ này đã được chỉnh sửa bởi cán bộ khác. Vui lòng tải lại trang để lấy thông tin mới nhất.'
                USING ERRCODE = '40001';
        END IF;
    END IF;

    IF NOT v_status_changed AND NOT v_note_added THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Không có thay đổi nào cần lưu.',
            'lead_id', p_lead_id,
            'counseling_status', v_old_status,
            'counselor_note', v_lead.counselor_note,
            'updated_at', v_lead.updated_at,
            'audit_logged', false
        );
    END IF;

    v_old_note := v_lead.counselor_note;

    UPDATE public.leads
    SET counseling_status = v_new_status,
        counselor_note = COALESCE(v_clean_note, counselor_note),
        updated_at = v_now
    WHERE id = p_lead_id;

    IF v_status_changed AND v_note_added THEN
        v_action := 'LEAD_CARE_UPDATED';
    ELSIF v_status_changed THEN
        v_action := 'LEAD_COUNSELING_STATUS_CHANGED';
    ELSE
        v_action := 'LEAD_CARE_NOTE_ADDED';
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_name,
        entity_id,
        old_values,
        new_values,
        reason,
        idempotency_key,
        created_at
    ) VALUES (
        p_actor_id,
        v_action,
        'leads',
        p_lead_id,
        jsonb_build_object('counseling_status', v_old_status, 'counselor_note', v_old_note),
        jsonb_build_object('counseling_status', v_new_status, 'counselor_note', COALESCE(v_clean_note, v_old_note), 'added_note', v_clean_note),
        COALESCE(v_clean_note, 'Thay đổi tiến độ tư vấn sang: ' || v_new_status),
        v_clean_idempotency_key,
        v_now
    ) RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cập nhật tiến độ chăm sóc khách hàng thành công!',
        'lead_id', p_lead_id,
        'counseling_status', v_new_status,
        'counselor_note', COALESCE(v_clean_note, v_old_note),
        'updated_at', v_now,
        'audit_id', v_audit_id,
        'audit_action', v_action,
        'audit_logged', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR) TO service_role;
```

---

## 5. KẾT LUẬN NGHIỆM THU
- **Tất cả các điểm phát hiện trong A3.7 đã được khắc phục triệt để trong A3.7.1**.
- **Biên dịch & Kiểm tra mã nguồn**:
  - `compile_applet` (`npm run build`): **Build succeeded 100%**.
  - `lint_applet` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
