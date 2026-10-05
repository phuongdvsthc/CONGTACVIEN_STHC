# BÁO CÁO HOÀN THÀNH A4.3 — THÊM KHỐI “HỒ SƠ ĐĂNG KÝ EGOV” TẠI CHI TIẾT KHÁCH, NỐI TỪ CẢ HAI DANH SÁCH (A4-F3)
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_F3_EGOV_LINK_DETAIL_UI_REPORT`
- **Giai đoạn:** A4-F3 – Xây dựng khối giao diện quản lý liên kết EGOV tại chi tiết lead & đồng bộ ngữ cảnh điều hướng
- **Ngày thực hiện:** 05/10/2026
- **Môi trường:** Production Staging / AI Studio Preview
- **Trạng thái:** **HOÀN THÀNH (PASS)** — Sẵn sàng chuyển tiếp sang bước A4-F4.

---

## 1. TỔNG QUAN PHẠM VI & MỤC TIÊU BƯỚC A4-F3

Phân hệ A4-F3 hoàn thiện giao diện quản lý liên kết mã EGOV tại trang chi tiết ứng viên (`/admin/leads/:id` — `AdminLeadDetailView.tsx`), cho phép Cán bộ tuyển sinh và Quản trị viên:
1. **Liên kết EGOV độc lập**: Cập nhật mã EGOV (đúng 7 chữ số, giữ số 0 đầu) ngay khi thí sinh đăng ký trên EGOV, trước khi học viên đóng học phí hoặc xác nhận nhập học.
2. **Sửa / Hủy liên kết an toàn**: Sửa mã (bắt buộc lý do) hoặc hủy liên kết EGOV (bắt buộc lý do), với cơ chế bảo vệ: **Chặn sửa/hủy liên kết nếu hồ sơ đang có kết quả đối soát hoạt động** (`MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`), yêu cầu cán bộ hủy kết quả đối soát trước.
3. **Nối từ cả hai danh sách**: Mở chi tiết lead liền mạch từ tab Danh sách khách A3 (`/admin/leads`) lẫn tab Danh sách Đối chiếu A4.5 (`/admin/reconcile`), giữ vững ngữ cảnh và bộ lọc khi quay lại.
4. **Hiển thị lịch sử liên kết EGOV**: Trình bày rõ ràng dòng thời gian các lần liên kết, cập nhật hoặc hủy liên kết EGOV trong khối lịch sử bên phải.

---

## 2. CÁC THÀNH PHẦN GIAO DIỆN & MODAL ĐÃ XÂY DỰNG

1. **Khối “B. Hồ sơ đăng ký EGOV” tại `AdminLeadDetailView.tsx`**:
   - Đặt trước khối *Kết quả Nhập học & Đối chiếu*.
   - Hiển thị: Mã hồ sơ EGOV hiện hành (hoặc *"Chưa cập nhật mã EGOV"*), Trạng thái liên kết (`ACTIVE` / `NOT_LINKED`), Cán bộ xác minh và Thời điểm xác minh.
   - Nút thao tác: *“Cập nhật mã EGOV”* (khi chưa có), *“Sửa mã EGOV”* và *“Hủy liên kết”* (khi đã có ACTIVE, tự động vô hiệu hóa nếu lead đang có kết quả đối soát active).
2. **Modal Cập nhật / Sửa mã EGOV (`AdminEgovLinkModal.tsx`)**:
   - Form nhập mã EGOV với `inputMode="numeric"`, `maxLength={7}`, validate regex `^[0-9]{7}$`, giữ số 0 ở đầu.
   - Yêu cầu lý do bắt buộc khi sửa đổi mã đang có liên kết ACTIVE.
   - Gọi API `POST /api/v1/admin/leads/:id/egov-link` kèm header `Idempotency-Key` và `client_updated_at`.
3. **Modal Hủy liên kết EGOV (`AdminEgovUnlinkModal.tsx`)**:
   - Cảnh báo rõ ràng và yêu cầu nhập lý do hủy bắt buộc.
   - Gọi API `POST /api/v1/admin/leads/:id/egov-unlink` kèm `target_egov_link_id` và `client_updated_at`.

---

## 3. KẾT QUẢ KIỂM TRA KỸ THUẬT & BIÊN DỊCH

1. **TypeScript & Linter (`npm run lint` / `tsc --noEmit`):**
   - **Kết quả:** `0 error, 0 warning` (PASS).
2. **Biên dịch Production (`compile_applet`):**
   - **Kết quả:** `Build succeeded - the applet is compiled`.
3. **Bảo toàn dữ liệu thực tế:** Toàn bộ dữ liệu lead, chăm sóc A3 và đối soát A4 được bảo toàn nguyên vẹn, không phát sinh lỗi xung đột.

---

## 4. KẾT LUẬN NGHIỆM THU A4-F3

- **Kết luận:** **PASS (HOÀN THÀNH BƯỚC A4-F3)**.
- Đã hoàn tất việc xây dựng khối giao diện quản lý EGOV độc lập, kết nối API nguyên tử và bảo vệ toàn vẹn logic nghiệp vụ tuyển sinh.
- Sẵn sàng chuyển tiếp sang bước **A4-F4: Đồng nhất hiển thị tại danh sách A3, danh sách A4 và Cổng CTV**.
