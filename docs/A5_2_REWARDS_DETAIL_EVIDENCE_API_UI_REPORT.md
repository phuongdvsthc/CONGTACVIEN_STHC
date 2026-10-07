# A5.2A–A5.2B – Báo cáo Triển khai API và Giao diện Chi tiết, Căn cứ Tính thù lao CTV (STHC_CTV)

- **Mã định danh bước:** A5.2A–A5.2B
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm thực hiện:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT TRIỂN KHAI VÀ KIỂM TRA

---

## 1. Phạm vi đã triển khai
- **A5.2A (API chi tiết khoản thù lao):** Tạo endpoint `GET /api/v1/admin/rewards/:id` đọc thông tin chi tiết một khoản thù lao cụ thể, kết nối hồ sơ thí sinh, cộng tác viên thụ hưởng, khóa học, căn cứ đối chiếu gốc (`lead_reconciliations`), thông tin hiện tại trên hồ sơ lead, dòng thời gian lịch sử (`history`), và các kiểm tra tính nhất quán căn cứ (`basis_checks`). Tích hợp kiểm quyền `rewards.view_detail`.
- **A5.2B (Giao diện chi tiết `/admin/rewards/:id`):** Xây dựng component `AdminRewardDetailView.tsx` hiển thị toàn bộ thông tin chi tiết của khoản thù lao, tích hợp nút "Chi tiết" trong bảng danh sách A5.1 (hiển thị có điều kiện theo quyền `rewards.view_detail`), bảo toàn trạng thái điều hướng quay lại danh sách.

---

## 2. API Contract và Quy tắc Chi tiết (A5.2A)

### Endpoint: `GET /api/v1/admin/rewards/:id`
- **Xác thực & Phân quyền:** Yêu cầu quyền `rewards.view_detail` (`requirePermission('rewards.view_detail')`).
- **Validation:**
  - Chưa đăng nhập → HTTP 401.
  - Thiếu quyền `rewards.view_detail` → HTTP 403.
  - ID sai định dạng UUID → HTTP 400.
  - Khoản thưởng không tồn tại → HTTP 404.
- **Response Structure (`data`):**
  - `reward`: id, amount, currency, status, created_at, approved_at, rejection_reason, void_reason, voided_at.
  - `candidate`: id, full_name, phone, email, registered_at.
  - `affiliate`: beneficiary (id, affiliate_code, full_name, status), current_lead_affiliate_id, is_affiliate_changed.
  - `course`: id, title, code.
  - `reconciliation_basis`: id, external_admission_code, reconciliation_status, tuition_fee_collected, receipt_number, tuition_paid_at, verified_at, verified_by_name, staff_note, is_voided.
  - `current_state`: current_egov_code, lead_status, reconciliation_status.
  - `history`: Danh sách dòng thời gian sự kiện (phát sinh, duyệt, từ chối, hủy, audit log).
  - `basis_checks`: Các cảnh báo tự động về biến động căn cứ (ví dụ: đối chiếu gốc đã bị hủy nhưng thưởng vẫn hiệu lực, CTV trên lead đã thay đổi, mã EGOV hiện tại khác mã lúc đối chiếu).

---

## 3. Giao diện Chi tiết (`AdminRewardDetailView.tsx`)

- **Điều hướng & Định tuyến:** Hỗ trợ URL `/admin/rewards/:id` thông qua router của `AdminPortal.tsx`, có nút "Quay lại danh sách" và "Làm mới".
- **Bố cục các phần:**
  1. **Tóm tắt khoản thù lao:** Số tiền thực tế, trạng thái màu sắc rõ ràng (Chờ duyệt, Đã duyệt, Từ chối, Đã hủy), thời điểm phát sinh và xử lý.
  2. **Thí sinh & Khóa học:** Họ tên, SĐT, email, tên khóa học và thời điểm gửi đăng ký.
  3. **Cộng tác viên thụ hưởng:** Tên và mã định danh CTV, cảnh báo nếu CTV trên lead hiện tại đã thay đổi.
  4. **Lần đối chiếu làm căn cứ:** Mã hồ sơ EGOV (font-mono), kết quả đối chiếu, thông tin học phí/biên lai, cán bộ xác nhận.
  5. **Lịch sử xử lý và kiểm toán:** Bảng dòng thời gian ghi nhận các mốc thời gian, hành động, mô tả và người thực hiện.

---

## 4. Phân quyền áp dụng
- `rewards.view`: Cần thiết để xem menu và danh sách thù lao.
- `rewards.view_detail`: Cần thiết để xem nút "Chi tiết" và gọi API lấy thông tin chi tiết khoản thưởng.
- CTV không được phép truy cập endpoint quản trị này.

---

## 5. Kết quả Kiểm thử & Xác minh
- **Kiểm tra biên dịch (`compile_applet`):** Thành công.
- **Kiểm tra linter (`lint_applet`):** Thành công (`tsc --noEmit` báo 0 lỗi).
- **Ca kiểm tra:**
  - Truy cập hợp lệ với quyền `reward_manager` / `admin`: Trả về dữ liệu chi tiết đầy đủ, chính xác.
  - Thiếu quyền / CTV / Chưa đăng nhập: Bị chặn HTTP 401/403 đúng hợp đồng phân quyền.
  - Quay lại danh sách: Giữ nguyên trạng thái và bộ lọc.

---

## 6. Giới hạn còn lại cho các bước tiếp theo
- **A5.3:** Nâng cấp hoàn thiện quy trình Duyệt / Từ chối / Hủy thù lao.
- **A5.4:** Tổng hợp theo CTV và xuất báo cáo thật cho kế toán.
