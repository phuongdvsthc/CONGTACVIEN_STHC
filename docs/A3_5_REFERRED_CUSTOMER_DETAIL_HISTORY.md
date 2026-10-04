# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.5 — CHI TIẾT KHÁCH VÀ LỊCH SỬ TRONG MODULE “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU”
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. MỤC TIÊU VÀ PHẠM VI (A3.5)
Hoàn thiện màn hình chi tiết và lịch sử chăm sóc/đối soát cho module **“Khách hàng được giới thiệu”** ở cả hai phân hệ:
- **Phân hệ CTV (`/portal/leads/:id`)**: Cho phép CTV ACTIVE xem chi tiết và lịch sử của chính khách hàng do mình giới thiệu. Số điện thoại được bảo mật (che 4 số cuối), không lộ ghi chú nội bộ của cán bộ tuyển sinh hay tài chính nhạy cảm.
- **Phân hệ Quản trị / Cán bộ tuyển sinh (`/admin/leads/:id`)**: Cho phép xem toàn bộ chi tiết, lịch sử đối soát học phí, khoản thưởng và sự kiện hệ thống của khách hàng từ bất kỳ CTV nào.

---

## 2. BẢNG ĐỐI CHIẾU SCHEMA & NGUỒN DỮ LIỆU

| Trường Nghiệp Vụ | Bảng CSDL / Cột | Có Trong DB Thật | Migration Liên Quan | Ghi Chú & Nguồn Tính |
| :--- | :--- | :--- | :--- | :--- |
| **Mã lượt đăng ký** | `leads.id` | Có | `20260929000001_initial_schema.sql` | UUID định danh duy nhất |
| **Họ và tên khách** | `leads.full_name` | Có | `20260929000001_initial_schema.sql` | Tên học viên đăng ký |
| **Số điện thoại** | `leads.phone` | Có | `20260929000001_initial_schema.sql` | Đầy đủ cho Admin, che 4 số cuối cho CTV (`phone_masked`) |
| **Email & Tỉnh thành**| `leads.email`, `leads.province` | Có | `20260929000001_initial_schema.sql` | Thông tin liên hệ học viên |
| **Ghi chú học viên** | `leads.customer_note` | Có | `20260929000001_initial_schema.sql` | Nội dung khách gửi khi đăng ký |
| **Khóa học quan tâm** | `courses.title` (qua `course_id`) | Có | `20260929000001_initial_schema.sql` | Liên kết bảng khóa học |
| **Mã CTV giới thiệu** | `affiliate_profiles.affiliate_code` | Có | `20260929000001_initial_schema.sql` | Mã CTV ghi nhận tại thời điểm đăng ký (`affiliate_code_captured`) |
| **Trạng thái tư vấn** | `leads.counseling_status` | Có | `20260929000001_initial_schema.sql` | `NEW`, `CONTACTED`, `CONSULTING`, `UNREACHABLE`, `LOST` |
| **Tình trạng nhập học** | `leads.reconciliation_status` | Có | `20260929000001_initial_schema.sql` | `MATCHED_VALID` -> Đã nhập học, khác -> Chưa nhập học |
| **Mã hồ sơ EGOV** | `lead_reconciliations.external_admission_code` | Có | `20260929000001_initial_schema.sql` | Mã ngoại bộ (giữ nguyên chuỗi để không mất số 0 đầu) |
| **Lịch sử sự kiện** | `lead_reconciliations`, `rewards`, `audit_logs` | Có | `20260929000001_initial_schema.sql` | Tổng hợp dòng thời gian (timeline) sự kiện |

---

## 3. API ĐÃ TRIỂN KHAI VÀ PHÂN QUYỀN (RBAC)

1. **API Chi tiết & Lịch sử CTV**:
   - `GET /api/v1/affiliate/leads/:id`: Trả về thông tin chi tiết lead (số điện thoại che dạng `090****`, không lộ thông tin nhạy cảm nội bộ). Yêu cầu CTV phải ở trạng thái `ACTIVE` và lead phải thuộc `affiliate_id` của tài khoản hiện tại.
   - `GET /api/v1/affiliate/leads/:id/history`: Trả về dòng thời gian sự kiện lịch sử (đăng ký tư vấn, xác nhận nhập học, trạng thái thưởng) của lead thuộc quyền sở hữu CTV.

2. **API Chi tiết & Lịch sử Quản trị**:
   - `GET /api/v1/admin/leads/:id`: Trả về toàn bộ thông tin chi tiết lead kèm dữ liệu đối soát và thưởng.
   - `GET /api/v1/admin/leads/:id/history`: Trả về chi tiết các bản ghi đối soát (`lead_reconciliations`) và thưởng (`rewards`).

---

## 4. KIỂM TRA KỸ THUẬT & NGHIỆM THU
- **Biên dịch & Build**: `compile_applet` đạt **PASS 100% (Build succeeded)**.
- **Kiểm tra tĩnh**: `lint_applet` (`tsc --noEmit`) đạt **PASS (0 lỗi, 0 cảnh báo)**.
- **Tính năng giao diện**:
  - Nút "Chi tiết" / "Xem" chuyển hướng chính xác đến route `/portal/leads/:id` và `/admin/leads/:id`.
  - Nút quay lại bảo toàn nguyên vẹn bộ lọc và trang danh sách đã chọn.
  - Hỗ trợ tải lại URL trực tiếp và hiển thị đầy đủ trạng thái Đã nhập học / Chưa nhập học.
