# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.2 — BỔ SUNG DỮ LIỆU, API, QUYỀN VÀ LỊCH SỬ LIÊN KẾT MÃ EGOV (A4-F2)
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_F2_EGOV_LINK_DATA_API_AUTHORIZATION_REPORT`
- **Giai đoạn:** A4-F2 – Triển khai CSDL, RPC nguyên tử, API, Phân quyền & Quản lý lịch sử liên kết mã EGOV
- **Ngày thực hiện:** 05/10/2026
- **Môi trường:** Production Staging / AI Studio Preview
- **Trạng thái:** **HOÀN THÀNH (PASS)** — Sẵn sàng chuyển tiếp sang bước A4-F3.

---

## 1. TỔNG QUAN PHẠM VI & MỤC TIÊU BƯỚC A4-F2

Phân hệ A4-F2 hiện thực hóa thiết kế đã chốt tại A4-F1, cho phép Quản trị viên và Cán bộ tuyển sinh thực hiện **liên kết, cập nhật, sửa hoặc hủy mã hồ sơ EGOV độc lập** ngay khi thí sinh đăng ký trên EGOV, không phụ thuộc vào việc xác nhận nhập học (`MATCHED_VALID`). Đồng thời, phân hệ đảm bảo:
1. **Tách bạch hoàn toàn**: Thao tác liên kết EGOV không làm thay đổi trạng thái nhập học (`admission_status`), kết quả đối chiếu (`reconciliation_status`), tiến độ tư vấn (`counseling_status`) hay sinh thù lao (thưởng CTV).
2. **Bảo mật và Phân quyền nghiêm ngặt**: Admin/staff được quyền ghi qua RPC nguyên tử với xác thực phiên làm việc thực tế, chặn tuyệt đối CTV khỏi các API ghi, và CTV chỉ được đọc mã hiện hành của khách thuộc mình (không lộ học phí, biên lai hay ghi chú nội bộ).
3. **Idempotency & Concurrency**: Áp dụng kiểm soát xung đột phiên bản `client_updated_at` (qua `leads.updated_at`) và mã `Idempotency-Key` chống lặp thao tác.

---

## 2. CÁC THÀNH PHẦN KỸ THUẬT ĐÃ TRIỂN KHAI

### 2.1. Tầng Cơ sở dữ liệu & Migration SQL
- **File Migration:** `/supabase/migrations/20261005000004_lead_egov_links_schema_and_rpc.sql`
- **Bảng `public.lead_egov_links`**:
  - Lưu trữ mã EGOV hiện hành (`external_admission_code`, định dạng `^[0-9]{7}$`), trạng thái liên kết (`ACTIVE` / `VOIDED`), cán bộ xác minh (`verified_by`), thời điểm (`verified_at`), và thông tin hủy liên kết khi sửa nhầm (`void_reason`, `voided_by`, `voided_at`).
  - **Partial Unique Indexes**:
    - `uq_active_external_admission_code`: Đảm bảo 1 mã EGOV chỉ có duy nhất 1 liên kết đang hoạt động (`ACTIVE`) trên toàn hệ thống.
    - `uq_active_egov_per_lead`: Đảm bảo mỗi lead chỉ có tối đa 1 liên kết đang hoạt động (`ACTIVE`).
- **Hàm RPC Nguyên tử (`SECURITY DEFINER` với `search_path = public`)**:
  - `fn_link_or_update_lead_egov`: Khóa lead (`FOR UPDATE`), kiểm tra xung đột phiên bản `updated_at`, validate mã 7 chữ số, kiểm tra trùng mã toàn hệ thống, vô hiệu hóa liên kết cũ nếu sửa mã (yêu cầu lý do) và tạo liên kết ACTIVE mới, đồng thời ghi nhận `audit_logs`.
  - `fn_unlink_lead_egov`: Hủy liên kết EGOV hiện hành (yêu cầu lý do bắt buộc), kiểm tra xem lead có đang có kết quả đối chiếu hoạt động nào phụ thuộc hay không (chặn hủy liên kết nếu đang có đối chiếu active).

### 2.2. Tầng Backend API (`server.ts`)
- **`POST /api/v1/admin/leads/:id/egov-link`**: Endpoint liên kết hoặc sửa mã EGOV cho lead, yêu cầu header `Idempotency-Key`, kiểm tra quyền `requireStaffOrAdmin`, gọi RPC `fn_link_or_update_lead_egov`.
- **`POST /api/v1/admin/leads/:id/egov-unlink`**: Endpoint hủy liên kết EGOV, yêu cầu lý do (`void_reason`), gọi RPC `fn_unlink_lead_egov`.
- **Điều chỉnh API đọc Admin & CTV**: Cập nhật các endpoint `GET /api/v1/admin/leads`, `GET /api/v1/admin/leads/:id`, `GET /api/v1/affiliate/leads`, `GET /api/v1/affiliate/leads/:id` để lấy mã EGOV hiện hành trực tiếp từ bảng `lead_egov_links` (thay vì phụ thuộc vào bảng `lead_reconciliations`).
- **Điều chỉnh RPC Đối chiếu (`reconcileLead`) & Hủy đối chiếu (`voidReconciliation`)**:
  - Khi xác nhận đối chiếu (`MATCHED_VALID`), hệ thống kiểm tra và lấy mã từ liên kết `ACTIVE`.
  - Khi hủy đối chiếu (`void-reconciliation`), **giữ nguyên liên kết EGOV ACTIVE**, không tự động xóa hay vô hiệu hóa mã EGOV của học viên.

---

## 3. KẾT QUẢ KIỂM TRA KỸ THUẬT & BIÊN DỊCH

1. **TypeScript & Linter (`npm run lint` / `tsc --noEmit`):**
   - **Kết quả:** `0 error, 0 warning` (PASS).
2. **Biên dịch Production (`compile_applet`):**
   - **Kết quả:** `Build succeeded - the applet is compiled`.
3. **Bảo toàn dữ liệu:** Toàn bộ dữ liệu thực tế trong CSDL được giữ nguyên vẹn, tuân thủ nguyên tắc phân quyền và an toàn giao dịch.

---

## 4. KẾT LUẬN NGHIỆM THU A4-F2

- **Kết luận:** **PASS (HOÀN THÀNH BƯỚC A4-F2)**.
- Đã hoàn tất việc bổ sung cấu trúc dữ liệu `lead_egov_links`, các hàm RPC nguyên tử, API quản trị liên kết EGOV và đồng bộ hóa tầng đọc dữ liệu cho cả Admin lẫn CTV. 
- Sẵn sàng chuyển sang bước **A4-F3: Xây dựng khối liên kết EGOV tại trang chi tiết khách (`/admin/leads/:id`)**.
