# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.6 — CHI TIẾT VÀ THAO TÁC ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_6_RECONCILIATION_DETAIL_ACTIONS_REPORT`
- **Phiên bản:** `1.0.0`
- **Ngày thực hiện:** `04/10/2026`
- **Môi trường:** Production Staging / AI Studio Preview
- **Trạng thái:** **HOÀN THÀNH (PASS)** — Sẵn sàng chuyển tiếp sang bước A4.7 (Đồng nhất hiển thị tại A3 và Cổng CTV).

---

## 1. TỔNG QUAN PHẠM VI & MỤC TIÊU BƯỚC A4.6

Phân hệ A4.6 hoàn thiện toàn diện màn hình chi tiết ứng viên tại `/admin/leads/:id` cho Quản trị viên và Cán bộ tuyển sinh (Staff) với các trọng tâm:
1. **Thông tin chi tiết hồ sơ & đối chiếu hiện hành**: Hiển thị đầy đủ thông tin cá nhân (họ tên, SĐT đầy đủ, email, tỉnh/thành phố, ngày đăng ký theo múi giờ VN `Asia/Ho_Chi_Minh`), nguồn giới thiệu (mã và tên CTV hoặc "Khách tự đăng ký"), khóa học đăng ký ban đầu, khóa học đối chiếu thực tế, mã EGOV 7 chữ số, hai trục trạng thái tách biệt (`admission_status` và `reconciliation_status`), snapshot học phí khóa học kèm loại nguồn (`ESTIMATE` / `OFFICIAL`), học phí thực thu, số biên lai, ngày đóng học phí, thông tin cán bộ đối chiếu và ghi chú.
2. **Form / Modal Đối chiếu hồ sơ (`AdminReconciliationModal.tsx`)**: Cho phép cán bộ thực hiện đối chiếu khi chưa có kết quả hiện hành. Hỗ trợ 3 kết quả (`MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`), quy tắc bắt buộc mã EGOV 7 chữ số với `MATCHED_VALID`, tình trạng nhập học tương ứng, chọn khóa học đối chiếu, học phí snapshot, biên lai, ngày đóng và ghi chú bắt buộc với các trường hợp ngoại lệ. Sử dụng `Idempotency-Key` nguyên tử.
3. **Modal Hủy đối chiếu (`AdminVoidReconciliationModal.tsx`)**: Cho phép cán bộ hủy kết quả đối chiếu hiện hành kèm lý do bắt buộc. Cập nhật bản ghi sang trạng thái `VOIDED`, vô hiệu hóa khoản thưởng liên quan và giải phóng mã EGOV để có thể đối chiếu lại.
4. **Lịch sử đối chiếu & Lịch sử chăm sóc riêng biệt**: Trình bày dòng thời gian rõ ràng cho từng lần đối chiếu (có đánh dấu bản ghi đã hủy và lý do hủy) và dòng thời gian chăm sóc A3.6.

---

## 2. HỢP ĐỒNG API & RPC THỰC TẾ ĐƯỢC SỬ DỤNG

1. **Xem chi tiết hồ sơ**: `GET /api/v1/admin/leads/:id`
   - Trả về đối tượng lead chuẩn hóa cùng liên kết `courses`, `affiliate_profiles`, `lead_reconciliations` (kèm thông tin course, staff, voided_by), và `rewards`.
2. **Thực hiện đối chiếu**: `POST /api/v1/admin/leads/:id/reconcile`
   - Yêu cầu Header `Authorization: Bearer <token>` và `Idempotency-Key: <uuid>`.
   - Body: `reconciliation_status`, `admission_status`, `external_admission_code`, `external_student_code`, `course_id`, `course_tuition_fee`, `course_tuition_fee_type`, `tuition_fee_collected`, `receipt_number`, `tuition_paid_at`, `staff_note`, `client_updated_at`.
3. **Hủy đối chiếu**: `POST /api/v1/admin/leads/:id/void-reconciliation`
   - Yêu cầu Header `Authorization: Bearer <token>` và `Idempotency-Key: <uuid>`.
   - Body: `void_reason`, `target_reconciliation_id`, `client_updated_at`.
4. **Lịch sử hồ sơ**: `GET /api/v1/admin/leads/:id/history`
   - Trả về danh sách chi tiết các lần `reconciliations`, `rewards`, và `care_history` (audit logs).

---

## 3. CÁC QUY TẮC NGHIỆP VỤ ĐÃ TRIỂN KHAI TUYỆT ĐỐI

1. **Phân tách 2 trục trạng thái**: `admission_status` (`ENROLLED` / `NOT_ENROLLED`) và `reconciliation_status` (`NOT_RECONCILED`, `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`, `VOIDED`) được hiển thị và xử lý ở hai trường độc lập.
2. **Quy tắc theo kết quả đối chiếu**:
   - `MATCHED_VALID`: Bắt buộc tình trạng nhập học là `ENROLLED` ("Đã nhập học") và mã EGOV đúng chuẩn 7 chữ số (`^[0-9]{7}$`). Khởi tạo thưởng 500.000 VNĐ chờ duyệt.
   - `EXISTING_IN_SCHOOL_SYSTEM`: Cho phép chọn `ENROLLED` hoặc `NOT_ENROLLED`, bắt buộc nhập căn cứ/ghi chú, không sinh thưởng.
   - `MISMATCH_INVALID`: Bắt buộc tình trạng `NOT_ENROLLED`, bắt buộc nhập lý do, không sinh thưởng.
3. **Mã EGOV & Định dạng tiền tệ**:
   - Input dạng chuỗi với `inputMode="numeric"`, `maxLength={7}`, trim đầu cuối, giữ số 0 đầu.
   - Định dạng tiền tệ VNĐ chuẩn (`Intl.NumberFormat('vi-VN')`), giá trị 0 hiển thị `0 ₫`, giá trị null/undefined hiển thị *“Chưa cập nhật”*.
4. **Xử lý xung đột & Idempotency**:
   - Gửi `client_updated_at` từ dữ liệu lead đã tải. Nếu phát hiện xung đột (`409 CONCURRENT_CONFLICT`), cảnh báo cán bộ tải lại trang.
   - Gửi `Idempotency-Key` UUID cố định cho mỗi phiên thao tác form/hủy, chống gửi lặp khi mạng chậm hoặc retry.

---

## 4. KẾT QUẢ KIỂM TRA KỸ THUẬT & BIÊN DỊCH

1. **TypeScript & Linter (`npm run lint`):**
   - **Kết quả:** `0 error, 0 warning` (`tsc --noEmit` PASS).
2. **Biên dịch Production (`compile_applet`):**
   - **Kết quả:** `Build succeeded - the applet is compiled`.
3. **Bảo toàn dữ liệu thật:** Toàn bộ dữ liệu hiển thị lấy trực tiếp từ CSDL thực tế qua Supabase & Express API.

---

## 5. KẾT LUẬN & BƯỚC TIẾP THEO

- **Kết luận bước A4.6:** **HOÀN THÀNH (PASS)**.
- Đã sẵn sàng chuyển sang:
  👉 **A4.7: Đồng nhất hiển thị trạng thái đối soát và học phí tại phân hệ chăm sóc (A3) và Cổng tra cứu của Cộng tác viên (Affiliate Portal)**.
