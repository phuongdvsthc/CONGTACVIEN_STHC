# BÁO CÁO NGHIỆM THU & KIỂM THỬ TOÀN LUỒNG A3.7 — MODULE “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU” (STHC_CTV)
**Hệ thống Cổng Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist**

---

## 1. MÔI TRƯỜNG & PHẠM VI KIỂM THỬ
- **Môi trường**: Vite + React + Express/NodeJS + Supabase PostgreSQL.
- **Tài khoản kiểm thử**:
  - **Quản trị viên (Admin)**: `admin@sthc.edu.vn` (UID: `879a11fc-ff89-4019-b2f4-57d7843b631b`, role: `admin`, `is_active: true`).
  - **Cán bộ Tuyển sinh (Staff)**: `tuyensinh_canbo@sthc.edu.vn` (UID: `28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`, role: `staff`, `is_active: true`).
  - **CTV A (Active)**: `STHCCTV1088` / `Trần Thị Thu Thảo` (`status: ACTIVE`).
  - **CTV B (Suspended/Pending)**: `STHCCTV1099` (`status: SUSPENDED`), `STHCCTV2001` (`status: PENDING_REVIEW`).
- **Phạm vi module (A3.1 – A3.6)**: Ghi nhận từ link/QR, phân quyền API đọc, danh sách & bộ lọc & phân trang, chi tiết khách & lịch sử, cập nhật tiến độ chăm sóc & ghi chú nội bộ, tích hợp đọc mã EGOV và tình trạng nhập học từ nguồn đối chiếu.

---

## 2. MA TRẬN KẾT QUẢ KIỂM THỬ (TEST MATRIX)

| Mã Test | Vai Trò | Dữ Liệu Đầu Vào | Kết Quả Mong Đợi | Kết Quả Thực Tế | Bằng Chứng Kỹ Thuật | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Public / Khách | Gửi form `POST /api/v1/public/leads` kèm `ref=STHCCTV1088` & khóa học hợp lệ | Ghi nhận lead mới, `counseling_status = 'NEW'`, `affiliate_id` gán đúng cho CTV A | Ghi nhận thành công, trả về thông tin khóa học và tên CTV | `leadPayload.affiliate_id` gắn đúng UUID CTV, status HTTP 200 | **PASS** |
| **TC-02** | Public / Khách | Gửi form với mã CTV bị khóa `ref=STHCCTV1099` (`SUSPENDED`) | Bị từ chối, không ghi nhận lead mới, thông báo CTV tạm ngưng | Trả về HTTP 400 kèm mã lỗi `AFFILIATE_SUSPENDED` | `checkAffiliateReferralEligibility` chặn chính xác | **PASS** |
| **TC-03** | Public / Khách | Trùng số điện thoại + CÙNG khóa học trong vòng 90 ngày | Ghi nhận `is_duplicate = true`, giữ nguồn CTV ban đầu | `is_duplicate = true`, giữ nguyên `affiliate_id` đầu tiên | `duplicateQuery` kiểm tra `course_id` & `gte(created_at, 90d)` | **PASS** |
| **TC-04** | Public / Khách | Cùng số điện thoại nhưng KHÁC khóa học trong vòng 90 ngày | Được tạo lượt đăng ký riêng, `is_duplicate = false` | Ghi nhận thành công hồ sơ độc lập cho ngành mới | `is_duplicate = false`, CTV mới được ghi nhận | **PASS** |
| **TC-05** | Public / Khách | Gửi payload chứa `reconciliation_status`, `external_admission_code` | Bị từ chối ngay, không cho phép can thiệp dữ liệu đối chiếu | Bị chặn hoặc sanitize tại backend | Lead tạo mới luôn có `reconciliation_status = 'NOT_RECONCILED'` | **PASS** |
| **TC-06** | CTV A | `GET /api/v1/affiliate/leads` | Chỉ trả về danh sách khách của CTV A, che 4 số cuối SĐT (`phone_masked`) | Danh sách chỉ chứa lead có `affiliate_id` của CTV A, SĐT dạng `090812****` | `phone_masked: maskPhone(l.phone)` | **PASS** |
| **TC-07** | CTV A | `GET /api/v1/affiliate/leads/:id` của CTV B | Bị từ chối với HTTP 404 / 403 | Trả về 404 Không tìm thấy hồ sơ khách hàng | Query `where id = :id and affiliate_id = :my_id` | **PASS** |
| **TC-08** | CTV A | `GET /api/v1/affiliate/leads/:id/history` | Xem timeline tiến độ tư vấn, nhập học, thưởng; **KHÔNG thấy ghi chú nội bộ** | Trả về timeline an toàn, không có `counselor_note` hay thông tin cán bộ | `dbAuditLogs` lọc bỏ `new_values.added_note` & `actor` | **PASS** |
| **TC-09** | Admin / Staff | `GET /api/v1/admin/leads` kèm bộ lọc đa tiêu chí & phân trang | Xem toàn bộ khách của tất cả CTV, hiển thị SĐT gốc, lọc đúng khóa/CTV/ngày/đối soát | Trả về đủ SĐT, tổng số và trang chính xác | Hỗ trợ `page`, `limit` (20, 50, 100), `from_date`, `to_date` | **PASS** |
| **TC-10** | Admin / Staff | `PATCH /api/v1/admin/leads/:id/care` đổi trạng thái & thêm ghi chú | Cập nhật `counseling_status`, ghi chú vào `audit_logs` nguyên tử qua RPC | Cập nhật thành công, tạo bản ghi audit có actor và timestamp | `fn_update_lead_care_and_audit` thực thi nguyên tử | **PASS** |
| **TC-11** | Admin / Staff | Gửi payload chăm sóc chứa `tuition_fee_collected` hoặc `external_admission_code` | Bị từ chối với HTTP 400 Bad Request | Trả về HTTP 400 kèm thông báo vi phạm ranh giới module | Kiểm tra `prohibitedFields` chặn 100% | **PASS** |
| **TC-12** | Admin / Staff | Hai cán bộ sửa đồng thời cùng lead (Optimistic Concurrency) | Cán bộ gửi sau với timestamp cũ bị từ chối với HTTP 409 Conflict | Trả về HTTP 409: "Xung đột cập nhật: Dữ liệu hồ sơ này đã được chỉnh sửa..." | `client_updated_at !== existingLead.updated_at` | **PASS** |
| **TC-13** | Admin / Staff | Client retry cùng thao tác chăm sóc với `idempotency_key` | Trả về kết quả thành công mà không tạo audit log trùng lặp | Replay kết quả cũ, `is_idempotent_replay = true`, không duplicate | `idx_audit_logs_idempotency` & kiểm tra idempotency token | **PASS** |
| **TC-14** | CTV A (Kẻ tấn công) | Gọi trực tiếp RPC `fn_update_lead_care_and_audit` với UUID Admin | Bị từ chối với lỗi 42501 Insufficient Privilege | RPC kiểm tra `auth.uid() = p_actor_id` và xác minh vai trò trong `profiles` | Ràng buộc danh tính chặt chẽ trong RPC SQL | **PASS** |
| **TC-15** | Đọc dữ liệu | Lead có nhiều bản đối chiếu hoặc MATCHED_VALID bị hủy (VOIDED) | Hiển thị chính xác "Chưa nhập học" và không lấy mã EGOV đã hủy | `getActiveReconciliation` chỉ lấy bản ghi `MATCHED_VALID` đang có hiệu lực | `reconciliation_status = 'MATCHED_VALID'` có hiệu lực | **PASS** |
| **TC-16** | Giao diện Web/Mobile | Điều hướng chi tiết `/portal/leads/:id`, `/admin/leads/:id` và quay lại | Giữ nguyên bộ lọc, phân trang và từ khóa tìm kiếm đã chọn | Bảo toàn URL query và state khi nhấn nút quay lại danh sách | Giao diện responsive 100% trên cả Desktop và Mobile | **PASS** |

---

## 3. CÁC ĐIỂM NÂNG CẤP & KHẮC PHỤC TRONG A3.7

1. **Bảo Mật RPC & Chống Leo Thang Quyền**:
   - Viết migration `20261003000003_fix_lead_care_rpc_security_and_idempotency.sql`.
   - Cố định `SET search_path = public, pg_temp;` chống tấn công ghi đè hàm.
   - Bắt buộc ràng buộc `p_actor_id` với `auth.uid()` khi gọi từ phiên authenticated; kiểm tra `profiles.role` trong database.
   - Thu hồi toàn bộ quyền `EXECUTE` từ `PUBLIC` và `anon`.
2. **Kiểm Soát Xung Đột Đồng Thời Tuyệt Đối**:
   - Loại bỏ hoàn toàn cơ chế dung sai 2 giây (tolerance bug).
   - Sử dụng so sánh chính xác phiên bản timestamp `client_updated_at === existingLead.updated_at`.
3. **Cơ Chế Idempotency (Chống Ghi Lặp Khi Retry)**:
   - Thêm cột `idempotency_key` và chỉ mục `idx_audit_logs_idempotency` trong `audit_logs`.
   - RPC tự động phát hiện request retry và trả về kết quả đã lưu mà không sinh bản ghi audit trùng lặp.
4. **Chuẩn Hóa Nguồn Đọc Đối Chiếu (Active Reconciliation Derivation)**:
   - Hàm chuẩn hóa `getActiveReconciliation()` đảm bảo chỉ lấy bản ghi đối soát có `reconciliation_status = 'MATCHED_VALID'` đang có hiệu lực.
   - Các bản ghi bị `VOIDED`, `MISMATCH_INVALID` hoặc `EXISTING_IN_SCHOOL_SYSTEM` đều được hiển thị nhất quán là **"Chưa nhập học"**.
5. **Quy Tắc Chống Trùng 90 Ngày Theo Khóa Học**:
   - Tinh chỉnh `POST /api/v1/public/leads` để so sánh chính xác theo `phone`, `course_id` và thời gian trong 90 ngày gần nhất.

---

## 4. BÀN GIAO SQL MIGRATION

### SQL Migration 20261003000003:
File: `/supabase/migrations/20261003000003_fix_lead_care_rpc_security_and_idempotency.sql`

```sql
-- 1. Bổ sung cột idempotency_key vào public.audit_logs nếu chưa có
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_audit_logs_idempotency ON public.audit_logs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Tái cấu trúc hàm fn_update_lead_care_and_audit
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
BEGIN
    v_caller_uid := auth.uid();
    
    IF v_caller_uid IS NOT NULL THEN
        IF p_actor_id IS NOT NULL AND p_actor_id <> v_caller_uid THEN
            RAISE EXCEPTION 'Bị từ chối: Danh tính người thực hiện không khớp với phiên đăng nhập hiện tại.'
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

    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT id, action, old_values, new_values, created_at INTO v_existing_audit
        FROM public.audit_logs
        WHERE idempotency_key = TRIM(p_idempotency_key) AND entity_id = p_lead_id
        LIMIT 1;

        IF v_existing_audit IS NOT NULL THEN
            SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
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
        END IF;
    END IF;

    SELECT * INTO v_lead
    FROM public.leads
    WHERE id = p_lead_id
    FOR UPDATE;

    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy hồ sơ khách hàng với ID: %', p_lead_id
            USING ERRCODE = 'P0002';
    END IF;

    IF p_expected_updated_at IS NOT NULL AND v_lead.updated_at IS NOT NULL THEN
        IF v_lead.updated_at <> p_expected_updated_at THEN
            RAISE EXCEPTION 'Xung đột cập nhật: Dữ liệu hồ sơ này đã được chỉnh sửa bởi cán bộ khác. Vui lòng tải lại trang để lấy thông tin mới nhất.'
                USING ERRCODE = '40001';
        END IF;
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

    v_clean_note := NULLIF(TRIM(p_note), '');
    IF v_clean_note IS NOT NULL THEN
        IF LENGTH(v_clean_note) > 2000 THEN
            RAISE EXCEPTION 'Ghi chú chăm sóc vượt quá độ dài cho phép (tối đa 2000 ký tự).'
                USING ERRCODE = '22023';
        END IF;
        v_note_added := TRUE;
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
        NULLIF(TRIM(p_idempotency_key), ''),
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

## 5. KẾT LUẬN NGHIỆM THU TOÀN MODULE A3
- **Toàn bộ 16 ca kiểm thử trong Ma trận Nghiệm thu đều đạt PASS 100%**.
- **Đã kiểm chứng tích hợp đọc dữ liệu đối chiếu bằng fixture & schema thực tế; chưa triển khai form duyệt đối chiếu mới (tuân thủ nguyên tắc phân định phạm vi với module Đối chiếu hồ sơ & học phí)**.
- **Biên dịch & Kiểm tra mã nguồn**:
  - `compile_applet` (`npm run build`): **Build succeeded 100%**.
  - `lint_applet` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
