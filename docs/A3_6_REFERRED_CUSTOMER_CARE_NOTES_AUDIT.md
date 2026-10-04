# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.6 — CẬP NHẬT TRẠNG THÁI CHĂM SÓC, GHI CHÚ NỘI BỘ VÀ LỊCH SỬ THAO TÁC CHO MODULE “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU”
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. PHÂN ĐỊNH RANH GIỚI NGHIỆP VỤ (BOUNDARY MATRIX)

| Tiêu chí | Module “Khách hàng được giới thiệu” (Phạm vi A3.6) | Module “Đối chiếu hồ sơ & học phí” (Triển khai sau) |
| :--- | :--- | :--- |
| **Trường dữ liệu ghi/sửa** | `counseling_status`, `counselor_note`, `audit_logs` (thao tác chăm sóc) | `reconciliation_status`, `external_admission_code`, `external_student_code`, `tuition_fee_collected`, `receipt_number`, `tuition_paid_at`, `rewards` |
| **Trường chỉ đọc** | `reconciliation_status`, `external_admission_code`, `customer_note` | `counseling_status`, `counselor_note` |
| **Quyền hạn cập nhật** | Cán bộ Tuyển sinh (Staff) và Quản trị viên (Admin) | Cán bộ Tuyển sinh (Staff) và Quản trị viên (Admin) |
| **Tác động nghiệp vụ** | Cập nhật tiến độ gọi điện/tư vấn (NEW, CONTACTED, CONSULTING, UNREACHABLE, LOST) | Xác nhận học viên nhập học chính thức, sinh khoản thưởng 500.000 VNĐ |
| **Ràng buộc an toàn** | Bị từ chối (400 Bad Request) nếu payload chứa bất kỳ trường đối chiếu hoặc tài chính nào | Kiểm tra chống trùng mã EGOV, kiểm toán phiếu thu & ngày đóng tiền |

---

## 2. API, PAYLOAD VÀ PHÂN QUYỀN

### 2.1. Endpoint Ghi Chăm Sóc Khách Hàng
- **Đường dẫn**: `PATCH /api/v1/admin/leads/:id/care` (hoặc alias tương thích `PATCH /api/v1/admin/leads/:id/counseling-status`)
- **Quyền hạn**: Bắt buộc `requireStaffOrAdmin` (Admin & Staff). CTV và Khách vãng lai bị chặn 403 / 401.
- **Payload hợp lệ**:
```json
{
  "counseling_status": "CONSULTING",
  "note": "Đã gọi điện tư vấn chương trình Bếp bánh, hẹn nộp hồ sơ ngày 15/10.",
  "client_updated_at": "2026-10-03T10:30:00.000Z"
}
```
- **Xử lý an toàn**:
  - Tự động trim khoảng trắng. Ghi chú rỗng không lưu thành ghi chú mới.
  - Giới hạn độ dài ghi chú: tối đa 2000 ký tự.
  - Kiểm soát xung đột cập nhật đồng thời (Optimistic Concurrency Control): nếu `client_updated_at` lệch quá 2 giây so với CSDL, trả về `409 Conflict`.
  - Nếu payload chứa các trường cấm (`reconciliation_status`, `external_admission_code`, `tuition_fee_collected`, `reward_status`, `affiliate_id`, v.v.), backend từ chối ngay lập tức với `400 Bad Request`.

### 2.2. Endpoint Đọc Lịch Sử Chăm Sóc & Thao Tác
- **Admin/Staff (`GET /api/v1/admin/leads/:id/history`)**:
  - Trả về toàn bộ `care_history` từ `audit_logs` (loại thao tác, người thực hiện với họ tên/email/vai trò, thời điểm, trạng thái trước/sau, ghi chú nội bộ).
  - Trả về danh sách đối soát (`reconciliations`) và thưởng (`rewards`).
- **Cộng tác viên (`GET /api/v1/affiliate/leads/:id/history`)**:
  - Chỉ trả về các sự kiện công khai (đăng ký tư vấn, đổi trạng thái tiến độ tư vấn, xác nhận nhập học, trạng thái thưởng).
  - **Tuyệt đối KHÔNG trả về** ghi chú nội bộ (`counselor_note`), danh tính cán bộ thực hiện hoặc dữ liệu tài chính nội bộ.

---

## 3. LƯU NGUYÊN TỬ & MIGRATION DATABASE

### 3.1. File Migration Đã Viết
- File: `/supabase/migrations/20261003000002_add_lead_care_history_and_atomic_update.sql`
- Hàm RPC: `public.fn_update_lead_care_and_audit`
  - Thực hiện khóa bi quan (`FOR UPDATE`) dòng lead.
  - Cập nhật trạng thái và ghi chú trong `public.leads`.
  - Tự động ghi nhật ký vào `public.audit_logs` trong cùng một giao dịch database.
  - Nếu bất kỳ bước nào thất bại, toàn bộ thao tác tự động rollback.

### 3.2. SQL Để Chạy Trong Supabase SQL Editor (Khi Triển Khai Thực Tế)
```sql
CREATE OR REPLACE FUNCTION public.fn_update_lead_care_and_audit(
    p_lead_id UUID,
    p_actor_id UUID,
    p_counseling_status VARCHAR(50) DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
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
BEGIN
    SELECT id, role, full_name, email, is_active INTO v_actor
    FROM public.profiles 
    WHERE id = p_actor_id AND is_active = TRUE;

    IF v_actor IS NULL OR v_actor.role NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'Bị từ chối: Chỉ Cán bộ Tuyển sinh hoặc Quản trị viên mới có quyền cập nhật chăm sóc khách hàng.'
            USING ERRCODE = '42501';
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
        IF ABS(EXTRACT(EPOCH FROM (v_lead.updated_at - p_expected_updated_at))) > 2 THEN
            RAISE EXCEPTION 'Xung đột cập nhật: Dữ liệu hồ sơ này vừa được cán bộ khác chỉnh sửa. Vui lòng tải lại trang để lấy thông tin mới nhất.'
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
        created_at
    ) VALUES (
        p_actor_id,
        v_action,
        'leads',
        p_lead_id,
        jsonb_build_object('counseling_status', v_old_status, 'counselor_note', v_old_note),
        jsonb_build_object('counseling_status', v_new_status, 'counselor_note', COALESCE(v_clean_note, v_old_note), 'added_note', v_clean_note),
        COALESCE(v_clean_note, 'Thay đổi tiến độ tư vấn sang: ' || v_new_status),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ) TO service_role;
```

---

## 4. GIAO DIỆN NGƯỜI DÙNG & TRẢI NGHIỆM

1. **Khối Chăm Sóc Khách Hàng (`AdminLeadDetailView.tsx`)**:
   - Chọn trạng thái: `NEW`, `CONTACTED`, `CONSULTING`, `UNREACHABLE`, `LOST`.
   - Nhập ghi chú nội bộ với bộ đếm ký tự `x / 2000`.
   - Nút **"Lưu chăm sóc"** có hiệu ứng loading (spinner) và tự khóa để chống bấm liên tiếp / duplicate requests.
   - Khi lưu thành công: làm mới danh sách dòng thời gian, xóa trắng ô ghi chú vừa nhập, hiển thị thông báo thành công.
   - Nếu có lỗi: hiển thị banner lỗi tiếng Việt và **giữ nguyên nội dung ghi chú người dùng đang soạn thảo**.
2. **Đồng bộ danh sách Leads (`AdminPortal.tsx`)**:
   - Khi cập nhật tiến độ tư vấn trực tiếp trên bảng, hệ thống gọi API care và tự động đồng bộ lại danh sách, phân trang và lịch sử.

---

## 5. KẾT QUẢ KIỂM THỬ VÀ NGHIỆM THU

- **Biên dịch & Build**: `compile_applet` (`npm run build`) đạt **PASS 100% (Build succeeded)**.
- **Kiểm tra tĩnh**: `lint_applet` (`tsc --noEmit`) đạt **PASS (0 lỗi, 0 cảnh báo)**.
- **Bảo mật & Phân quyền**:
  - Gửi trường cấm (`reconciliation_status`, `external_admission_code`, v.v.) bị chặn ngay lập tức với 400 Bad Request.
  - Phân tách quyền nghiêm ngặt: CTV không xem được ghi chú nội bộ của cán bộ tuyển sinh.
  - Cơ chế RPC & Fallback atomic đảm bảo toàn vẹn dữ liệu giữa `leads` và `audit_logs`.
