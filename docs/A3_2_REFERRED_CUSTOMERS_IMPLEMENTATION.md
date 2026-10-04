# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.2 — GHI NHẬN VÀ HIỂN THỊ KHÁCH HÀNG ĐƯỢC GIỚI THIỆU
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. TỔNG QUAN THỰC HIỆN
Bước A3.2 đã hoàn thiện toàn diện luồng ghi nhận khách từ link/QR giới thiệu, kiểm tra xác thực ở backend, chống trùng lặp, bảo mật PII, và xây dựng giao diện module **“Khách hàng được giới thiệu”** cho cả phía Cộng tác viên (`/portal/leads`) và Quản trị viên/Cán bộ tuyển sinh (`/admin/leads`).

---

## 2. CÁC HẠNG MỤC ĐÃ HOÀN THIỆN

### A. Luồng Ghi Nhận Khách Từ Link/QR & Giữ Mã `ref`
- **Link & QR**: Hỗ trợ đầy đủ các điểm vào từ danh mục khóa học (`/catalog?ref=...`), chi tiết khóa học (`/?ref=...&course=...`), và mã QR điều hướng.
- **Bảo toàn mã `ref`**: Khi khách điều hướng qua lại giữa danh mục, chi tiết khóa học và form đăng ký (kể cả khi tải lại trang), mã giới thiệu CTV (`ref`) được giữ nguyên lịch sử qua `localStorage` và URL parameters.
- **Ưu tiên mã mới**: Nếu khách mở link giới thiệu mới với mã `ref` khác, hệ thống tự động cập nhật mã mới, không bị ghi đè bởi mã cũ.

### B. Xác Thực & Chống Trùng Tại Backend
- **Kiểm tra CTV & Khóa học**: Backend xác minh mã giới thiệu tồn tại và ở trạng thái `ACTIVE`. Đồng thời kiểm tra khóa học phải được công khai (`is_active = true`) và đang nhận giới thiệu (`accepts_referrals = true`).
- **Chống ghi nhận giả mạo**: Backend tự phân giải `affiliate_id` từ mã `ref` đã xác thực, từ chối mọi trường `affiliate_id` hoặc `collaborator_id` do client gửi lên (phòng chống leo thang đặc quyền).
- **Quy tắc chống trùng (Attribution Policy & Duplicate Prevention)**:
  - Cùng số điện thoại + cùng khóa học trong vòng 90 ngày: Không tạo trùng lặp, giữ nguyên nguồn CTV đầu tiên (`first-touch attribution`).
  - Cùng số điện thoại + khác khóa học: Cho phép đăng ký học thêm ngành khác bình thường.
  - Chống request lặp (Idempotency): Khóa nút bấm khi gửi, xử lý an toàn khi thử lại.

### C. Giao Diện Module “Khách hàng được giới thiệu”
- **Cộng tác viên (`/portal/leads`)**:
  - Triển khai hoàn chỉnh component `AffiliateLeadsView.tsx`.
  - Hiển thị danh sách khách hàng do chính CTV giới thiệu.
  - Bảo mật PII: Số điện thoại được che 4 số cuối (`090812****`).
  - Hiển thị đầy đủ: Khóa học, Ngày đăng ký, Trạng thái chăm sóc, Mã hồ sơ EGOV (*Chưa cập nhật* hoặc mã thực tế từ module đối chiếu), và Tình trạng nhập học (*Chưa nhập học* / *Đã nhập học*).
  - Có tính năng tìm kiếm nhanh và lọc theo trạng thái.
- **Admin & Cán bộ Tuyển sinh (`/admin/leads`)**:
  - Xem toàn bộ khách hàng của tất cả CTV.
  - Hiển thị số điện thoại đầy đủ, quản lý tiến độ tư vấn (`counseling_status`), và liên kết trực tiếp sang module đối soát học phí.

---

## 3. KẾT QUẢ KIỂM THỬ (TEST RESULTS)
1. Link danh mục/chi tiết của CTV → Chọn khóa → Gửi form → Ghi nhận đúng CTV và đúng khóa học: **PASS**.
2. Quét QR → Hoàn thành đăng ký → Hoạt động chính xác như truy cập link trực tiếp: **PASS**.
3. Chuyển trang/tải lại → Mã giới thiệu vẫn được giữ nguyên: **PASS**.
4. Mở link CTV mới sau link cũ → Form sử dụng mã mới: **PASS**.
5. Mã CTV không hợp lệ hoặc bị khóa (`SUSPENDED`) → Từ chối ghi nhận, thông báo lỗi rõ ràng: **PASS**.
6. Khóa học ngừng nhận đăng ký (`accepts_referrals = false`) → Chặn đăng ký: **PASS**.
7. Gửi trùng cùng số điện thoại và cùng khóa → Không tạo trùng, giữ nguyên nguồn CTV đầu tiên: **PASS**.
8. Bảo mật dữ liệu nhập học và mã EGOV → Endpoint công khai không cho phép ghi đè, chỉ được cập nhật qua module đối chiếu bởi Admin/Staff: **PASS**.
9. Phân quyền API & Database → CTV chỉ thấy khách của mình; CTV khác bị chặn hoàn toàn: **PASS**.

---
*Bước A3.2 đã hoàn tất thành công. Hệ thống sẵn sàng cho bước tiếp theo.*
