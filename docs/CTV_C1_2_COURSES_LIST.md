# BÁO CÁO TRIỂN KHAI C1.2 — DANH SÁCH KHÓA HỌC TRONG CỔNG CTV

- **Mã dự án:** `STHC-CTV-C1.2`
- **Phân hệ:** Cổng Cộng tác viên (Collaborator Portal) — Module Khóa học (`/portal/courses`)
- **Trạng thái:** Hoàn thành triển khai, kiểm tra build và tích hợp thực tế.
- **Ngày báo cáo:** 01/10/2026

---

## 1. Các File Đã Thay Đổi / Tạo Mới
1. **`/src/components/affiliate/AffiliateCourseListView.tsx`** (Tạo mới): Component hiển thị danh sách khóa học dạng thẻ cho CTV, tích hợp tìm kiếm không dấu, bộ lọc theo Khoa & Hệ đào tạo, sắp xếp A-Z / Z-A, hiển thị chính sách thưởng 500k, liên kết tiếp thị (`referral_url`), nút sao chép link, phân trang 12 khóa/trang, và xử lý các trạng thái tải, lỗi, rỗng, tạm ngưng.
2. **`/src/App.tsx`** (Cập nhật): Nối route `/portal/courses` vào component `AffiliateCourseListView` thay thế cho trang placeholder cũ.

---

## 2. API & Ánh Xạ Dữ Liệu Thực Tế
- **API Endpoint:** `GET /api/v1/affiliate/courses`
- **Quyền hạn & Phân quyền:** Được bảo vệ bởi middleware `requireActiveAffiliate` (chỉ chấp nhận CTV có trạng thái `ACTIVE`). Tài khoản bị `SUSPENDED` nhận phản hồi lỗi HTTP 403 và hiển thị màn hình thông báo tạm ngưng phù hợp.
- **Bộ lọc dữ liệu phía Backend:** Chỉ trả về các khóa học đáp ứng đồng thời hai điều kiện vòng đời từ Admin A2:
  - `is_active = TRUE` (Công khai).
  - `accepts_referrals = TRUE` (Đang nhận giới thiệu).

---

## 3. Cơ Chế Tìm Kiếm, Lọc & Phân Trang
- **Tìm kiếm:** Hỗ trợ tìm kiếm theo từ khóa (tên khóa học, mã khóa học, mô tả) không phân biệt chữ hoa/chữ thường và hỗ trợ tiếng Việt không dấu.
- **Bộ lọc:**
  - Lọc theo **Khoa đào tạo** (`department`).
  - Lọc theo **Hệ đào tạo** (`degree_level`).
- **Sắp xếp:**
  - Mặc định (theo `sort_order` chuẩn từ hệ thống).
  - Tên khóa học: A — Z.
  - Tên khóa học: Z — A.
- **Phân trang:** Chia trang với định mức **12 khóa học / trang**, kèm thông tin tổng số hiển thị minh bạch.

---

## 4. Kết Quả Kiểm Tra & Nghiệm Thu
- **Build & Compilation:** `compile_applet` chạy thành công 100%, không có lỗi TypeScript hoặc linter.
- **Hiển thị giao diện:**
  - Giao diện dạng thẻ (Card Grid): 3 cột trên Desktop, 2 cột trên Tablet, 1 cột trên Mobile. Hoàn toàn không bị tràn ngang.
  - Học phí được định dạng chuẩn tiền tệ Việt Nam (`... đ`) hoặc hiển thị "Chưa cập nhật" khi thiếu dữ liệu, không tự ý hiển thị số 0 đồng.
  - Chính sách thưởng hiển thị minh bạch: *"Thưởng 500.000 đ/hồ sơ nhập học hợp lệ"* kèm chú thích *"Sau khi nhà trường đối soát và phê duyệt."*
  - Nút **"Sao chép link"** hoạt động chính xác, tự động đổi trạng thái thành *"Đã sao chép"* khi thành công.

---

## 5. Giới Hạn Còn Lại & Bước Tiếp Theo
- **Giới hạn trong C1.2:** Chưa tích hợp nút "Xem QR" và "Chi tiết" (các nút này nằm trong phạm vi C1.3 và C1.4).
- **Bước tiếp theo (C1.3):** Tích hợp modal hiển thị mã QR tiếp thị và tính năng tải ảnh QR theo từng khóa học.
