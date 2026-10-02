# BÁO CÁO TRIỂN KHAI C1.3 — TRANG CHI TIẾT KHÓA HỌC TRONG CỔNG CTV

- **Mã dự án:** `STHC-CTV-C1.3`
- **Phân hệ:** Cổng Cộng tác viên (Collaborator Portal) — Trang Chi tiết Khóa học (`/portal/courses/:courseId`)
- **Trạng thái:** Hoàn thành triển khai, tích hợp định tuyến động, kiểm tra API và build production.
- **Ngày báo cáo:** 02/10/2026

---

## 1. Các File Đã Thay Đổi / Tạo Mới
1. **`/server.ts`** (Cập nhật): Bổ sung API backend `GET /api/v1/affiliate/courses/:courseId` (được bảo vệ bởi middleware `requireActiveAffiliate`, kiểm tra trạng thái CTV `ACTIVE`, kiểm tra vòng đời khóa học `is_active = true` và `accepts_referrals = true`, trả về 404 chuẩn khi khóa không tồn tại hoặc bị ẩn).
2. **`/src/services/api.ts`** (Cập nhật): Bổ sung phương thức `getAffiliateCourseDetail(courseId: string)`.
3. **`/src/components/affiliate/AffiliateCourseDetailView.tsx`** (Tạo mới): Component trang chi tiết khóa học riêng biệt, hỗ trợ breadcrumb điều hướng, nút quay lại danh sách bảo toàn ngữ cảnh, hiển thị đầy đủ thông tin mô tả chi tiết, học phí, section quyền lợi sinh viên (nếu có), chính sách thưởng 500k và khối link giới thiệu cá nhân hóa kèm nút sao chép link.
4. **`/src/components/affiliate/AffiliateCourseListView.tsx`** (Cập nhật): Bổ sung nút **"Chi tiết"** trên từng thẻ khóa học để điều hướng sang trang chi tiết đúng khóa.
5. **`/src/App.tsx`** (Cập nhật): Bổ sung điều kiện định tuyến động phân biệt giữa trang danh sách (`/portal/courses`) và trang chi tiết (`/portal/courses/:courseId`).

---

## 2. API & Ánh Xạ Dữ Liệu Thực Tế
- **API Endpoint:** `GET /api/v1/affiliate/courses/:courseId`
- **Quyền hạn & Bảo mật:**
  - Yêu cầu xác thực tài khoản CTV có trạng thái `ACTIVE`.
  - Kiểm tra vòng đời khóa học: Khóa học phải có `is_active = true` và `accepts_referrals = true`. Nếu khóa bị dừng hoặc nháp, API trả về HTTP 404 kèm thông báo *"Khóa học không tồn tại hoặc không còn được công khai."*.
- **Dữ liệu trả về:** Thông tin chi tiết khóa học, kết hợp `referral_url` định danh riêng cho CTV đang đăng nhập.

---

## 3. Quy Tắc Xử Lý Lỗi & Hiển Thị
- **Khóa không tồn tại / ID sai định dạng / Khóa bị ẩn:** Trả về HTTP 404, giao diện hiển thị thông báo rõ ràng kèm nút *"Quay lại danh sách khóa học"*.
- **Học phí null:** Hiển thị *"Chưa cập nhật"* (không tự chuyển thành 0 đồng).
- **Làm sạch HTML (Sanitize):** Nội dung mô tả chi tiết và quyền lợi sinh viên (rich text/HTML) được làm sạch an toàn qua `sanitizeHtml` trước khi render.
- **Lịch khai giảng:** Hiển thị dòng thông báo tiêu chuẩn *"Chưa cập nhật lịch khai giảng sắp tới"* nếu chưa có lịch cụ thể.

---

## 4. Kết Quả Kiểm Tra & Nghiệm Thu
- **Build & Compilation:** `compile_applet` chạy thành công 100%, không có lỗi TypeScript hoặc linter.
- **Điều hướng & Định tuyến:** Bấm nút "Chi tiết" trên thẻ mở đúng trang chi tiết của khóa đó. Mở trực tiếp URL hoặc tải lại trang vẫn tải đúng dữ liệu từ API. Bấm "Quay lại danh sách" đưa CTV về đúng danh sách.
- **Bảo mật:** Không dùng API Admin trên frontend CTV, không để lộ service-role key, chặn tuyệt đối tài khoản bị tạm ngưng (`SUSPENDED`).

---

## 5. Giới Hạn & Bước Tiếp Theo
- **Giới hạn trong C1.3:** Chưa triển khai cơ chế mã QR, tải QR hoặc tài liệu tuyển sinh (sẽ thực hiện ở các bước tiếp theo).
- **Bước tiếp theo:** Dừng sau C1.3 theo yêu cầu.
