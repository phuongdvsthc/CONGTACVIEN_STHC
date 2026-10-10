# Báo cáo Sửa Màn hình Quản lý Mẫu Email — STHC_CTV (C3.11C)
**Ngày báo cáo:** 10/10/2026  
**Phạm vi:** Sửa và hoàn thiện màn hình quản lý mẫu email (`/admin/email-templates`) trong dự án STHC_CTV.

---

## 1. Mục tiêu và Yêu cầu Nghiệp vụ
Màn hình quản lý mẫu email cần hỗ trợ trực quan việc quản lý hai mẫu nghiệp vụ cốt lõi:
1. `CTV_NOTIFICATION_EMAIL` (Thông báo cho cộng tác viên).
2. `LEAD_REGISTRATION_CONFIRMATION` (Xác nhận đăng ký tuyển sinh và hướng dẫn EGOV).

Các yêu cầu cụ thể đã được triển khai:
- **Chọn và sửa riêng từng mẫu:** Bấm vào từng thẻ trong danh sách mẫu nghiệp vụ để chuyển đổi giữa các mẫu.
- **Phân biệt trực quan rõ ràng:**
  - **Đang áp dụng:** Huy hiệu màu xanh lá (`active_published_version`) thể hiện phiên bản đang được hệ thống sử dụng gửi email thực tế.
  - **Đang chọn:** Viền đậm và nền nổi bật thể hiện mẫu đang mở trong trình soạn thảo. Không dùng trạng thái "Đang áp dụng" thay cho trạng thái chọn.
- **Tải đúng dữ liệu:** Khi chọn mẫu mới, tải đúng danh sách phiên bản, tiêu đề, HTML, text, nhãn nút, footer, mã phiên bản và trạng thái của mẫu đó. Không để sót dữ liệu hoặc lịch sử từ mẫu trước.
- **Cảnh báo thay đổi chưa lưu (Dirty state):** Nếu người dùng chuyển mẫu khi đang có thay đổi chưa lưu trong trình soạn thảo, hệ thống hiển thị modal xác nhận (Hủy, Bỏ thay đổi & Chuyển mẫu, hoặc Lưu nháp & Chuyển).
- **Trình soạn thảo trực quan:** Hiển thị rõ tên nghiệp vụ đang sửa trên đầu trình soạn thảo, hỗ trợ chèn biến linh hoạt tùy theo loại mẫu (`CTV_NOTIFICATION_EMAIL` vs `LEAD_REGISTRATION_CONFIRMATION`), xem trước (Desktop/Mobile) và gửi thư thử nghiệm.

---

## 2. Các File Đã Sửa
1. `/src/components/admin/AdminEmailTemplatesView.tsx`:
   - Bổ sung state `selectedItem`, `isDirty`, `unsavedModalOpen`, `pendingTargetItem`.
   - Cập nhật card danh sách mẫu nghiệp vụ có `onClick`, trạng thái "Đang chọn" (selected) và "Đang áp dụng" (published).
   - Tách danh sách phiên bản (`versions`) gắn liền với mẫu đang chọn.
   - Bổ sung modal xác nhận khi có thay đổi chưa lưu (`isDirty`).
   - Tùy chỉnh danh sách biến động (variables) phù hợp với từng `template_code`.
2. `server.ts`:
   - Bổ sung seed/fallback đầy đủ cả hai mẫu `LEAD_REGISTRATION_CONFIRMATION` và `CTV_NOTIFICATION_EMAIL` trong endpoint `/api/v1/admin/email-templates`.

---

## 3. Kiểm thử & Nghiệm thu
- **Kiểm tra TypeScript & Build:** Đã chạy kiểm tra kiểu dữ liệu (`npm run build` / `compile_applet`) không có lỗi biên dịch.
- **Kiểm thử giao diện:**
  - Bấm chọn qua lại giữa `LEAD_REGISTRATION_CONFIRMATION` và `CTV_NOTIFICATION_EMAIL`: danh sách phiên bản và nội dung editor được tải chính xác theo từng mẫu.
  - Thử chỉnh sửa tiêu đề/nội dung sau đó bấm chuyển mẫu: modal cảnh báo thay đổi chưa lưu hoạt động chính xác.
  - Xem trước email (Desktop/Mobile) và gửi thử hoạt động ổn định.

---
*Báo cáo kết thúc.*
