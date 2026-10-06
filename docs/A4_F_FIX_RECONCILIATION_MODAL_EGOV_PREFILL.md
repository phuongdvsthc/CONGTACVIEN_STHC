# BÁO CÁO SỬA LỖI A4-F — FORM “ĐỐI CHIẾU HỒ SƠ” TẢI MÃ EGOV ĐÃ LIÊN KẾT
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_F_FIX_RECONCILIATION_MODAL_EGOV_PREFILL`
- **Phân hệ:** A4 – Đối chiếu Hồ sơ & Học phí / Sửa lỗi modal đối chiếu
- **Ngày báo cáo:** 05/10/2026

---

### 1. Phân tích Nguyên nhân Gốc (Root Cause Analysis)
- **Vấn đề thực tế**: Khi mở modal *"Xác nhận kết quả đối soát hồ sơ & học phí"* (`AdminReconciliationModal.tsx`) từ trang chi tiết ứng viên (ví dụ Lead ID `3f8f2715-0477-42a1-a475-86cdb91bef01` có mã EGOV ACTIVE `1818002`), ô nhập mã EGOV hiển thị trống với placeholder `"Ví dụ: 0012345"`.
- **Nguyên nhân**:
  1. `AdminReconciliationModal` khởi tạo state `egovCode` bằng `''` và không tự động tải hoặc truyền thông tin liên kết EGOV `ACTIVE` hiện hành từ lead hoặc từ API chi tiết.
  2. Modal thiếu cơ chế gọi `getAdminLeadDetail` khi mở để lấy thông tin mới nhất (`current_egov_link`, `egov_links`, `updated_at`).
  3. Thiếu khối hiển thị EGOV ở dạng chỉ đọc trong modal đối chiếu theo đặc tả đã chốt.
  4. Backend endpoint `POST /api/v1/admin/leads/:id/reconcile` trước đó chưa validate chặt chẽ liên kết ACTIVE trực tiếp từ CSDL trong giao dịch, dẫn đến rủi ro client gửi dữ liệu không đồng bộ.

---

### 2. Các File Đã Sửa Đổi
1. **`/src/components/admin/AdminReconciliationModal.tsx`**:
   - Tích hợp gọi `api.getAdminLeadDetail(lead.id)` tự động mỗi khi modal mở (`isOpen === true`), kèm trạng thái tải (`loadingLead`) và nút thử lại khi lỗi (`loadError`).
   - Tự động trích xuất liên kết EGOV `ACTIVE` (`current_egov_link` hoặc duyệt mảng `egov_links`), prefill giá trị `egovCode` đúng 7 chữ số (giữ số 0 đầu).
   - Thay thế ô input có thể chỉnh sửa thành khối hiển thị chỉ đọc, sắc nét, kèm thông báo: *"Mã lấy từ Hồ sơ đăng ký EGOV. Muốn sửa mã, hãy cập nhật tại khối này trước khi đối chiếu."*.
   - Nếu chưa có liên kết ACTIVE, hiển thị cảnh báo *"Chưa cập nhật mã EGOV"* và chặn xác nhận kết quả `MATCHED_VALID`.
2. **`/server.ts`**:
   - Cập nhật endpoint `POST /api/v1/admin/leads/:id/reconcile` để truy vấn trực tiếp bảng `lead_egov_links` kiểm tra liên kết `ACTIVE` trong CSDL, lấy mã EGOV chính thống server-authoritative và chặn 409 nếu mã bị thay đổi đồng thời.

---

### 3. Kết Quả Kiểm Thử (9 Ca Kiểm Thử)

| STT | Ca Kiểm Thử E2E | Mô Tả & Kiểm Tra Thực Tế | Kết Quả Thực Tế | Trạng Thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Lead thực tế có mã ACTIVE** (`3f8f2715-...`) | Mở modal đối chiếu từ chi tiết lead | Hiển thị mã `1818002` ở dạng chỉ đọc, khớp 100% khối *"Hồ sơ đăng ký EGOV"* | **PASS** |
| 2 | **Mở từ cả 2 danh sách** | Mở từ danh sách A3 (`/admin/leads`) và A4 (`/admin/reconcile`) | Tải chính xác, không lẫn lộn lead | **PASS** |
| 3 | **Mã có số 0 đầu** | Kiểm tra lead có mã bắt đầu bằng số 0 (`0012345`) | Hiển thị và truyền đủ 7 chữ số, giữ nguyên số 0 đầu | **PASS** |
| 4 | **Sửa mã EGOV rồi mở lại modal** | Cập nhật mã EGOV tại khối riêng rồi mở modal đối chiếu | Modal tự động tải và hiển thị mã mới nhất | **PASS** |
| 5 | **Chuyển giữa các lead** | Chuyển qua lại giữa các lead khác nhau | Reset state chuẩn xác, không bị ghi đè dữ liệu lead trước | **PASS** |
| 6 | **Chưa có liên kết ACTIVE** | Mở modal với lead chưa liên kết EGOV | Hiển thị cảnh báo, chặn chọn/xác nhận `MATCHED_VALID` | **PASS** |
| 7 | **Lỗi tải API** | Mô phỏng gián đoạn kết nối khi mở modal | Hiển thị thông báo lỗi và nút *"Thử lại"*, không cho xác nhận bừa | **PASS** |
| 8 | **Mã thay đổi đồng thời** | Mô phỏng thay đổi mã trong lúc modal đang mở | Backend trả HTTP 409 (`EGOV_CODE_CONFLICT`), yêu cầu tải lại | **PASS** |
| 9 | **Chưa nhập học nhưng có mã** | Lead có mã EGOV nhưng chưa nhập học | Không tự động chọn `ENROLLED`, cán bộ xác minh thủ công | **PASS** |

---

### 4. Kiểm Tra Kỹ Thuật
- **TypeScript Linting (`npm run lint` / `tsc --noEmit`)**: **PASS (0 lỗi, 0 cảnh báo)**.
- **Build Applet (`compile_applet`)**: **PASS (Build succeeded)**.
- **Bảo toàn dữ liệu**: 100% dữ liệu thực tế được bảo toàn.
