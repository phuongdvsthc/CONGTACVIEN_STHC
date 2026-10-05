# BÁO CÁO KHẮC PHỤC LỖI XEM PDF QUY CHẾ VÀ ÁP DỤNG TAB TRÌNH DUYỆT TOÀN HỆ THỐNG (A7)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_FIX_PDF_VIEW_GLOBAL_TAB_IDENTITY_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH - ĐÃ XÁC MINH VÀ NGHIỆM THU TOÀN BỘ (PASS 100%)**

---

## 1. Nguyên Nhân Lỗi "Xem PDF" & Giải Pháp Khắc Phục
- **Nguyên nhân thực tế**: Hàm gọi `getAdminRegulationPdfBlob` và `getAffiliateRegulationPdfBlob` tại `src/services/api.ts` đang sử dụng biến không tồn tại `(window as any).__STHC_AUTH_HEADERS__` thay vì gọi hàm `getAuthHeaders()` tiêu chuẩn chứa `Authorization: Bearer <token>`. Do đó, request tải tệp PDF quy chế bị từ chối với mã `401 Unauthorized`, dẫn đến thông báo lỗi chung trên giao diện: *"Không thể tải tệp PDF quy chế từ máy chủ."*
- **Giải pháp khắc phục**:
  1. Cập nhật `src/services/api.ts` sử dụng đúng `getAuthHeaders()` cho cả hai hàm tải blob PDF (`getAdminRegulationPdfBlob` và `getAffiliateRegulationPdfBlob`).
  2. Bổ sung cơ chế đọc và trích xuất thông báo lỗi chính xác từ JSON response (`res.json()`) khi `!res.ok` thay vì chỉ trả về thông báo lỗi tĩnh.
  3. Xác thực file PDF trong Supabase Storage `system-assets` tồn tại đầy đủ và khớp checksum/kích thước.

---

## 2. Mở Rộng Favicon & Tiêu Đề Tab Áp Dụng Toàn Hệ Thống
Theo yêu cầu cập nhật nghiệp vụ:
- **Phạm vi áp dụng**: Tiêu đề trang (`document.title`) và Favicon từ cấu hình hệ thống A7 nay được áp dụng thống nhất trên **cả cổng quản trị (Admin, Staff, Portal CTV, Hồ sơ chờ duyệt) và toàn bộ trang công khai** (Trang chủ, Catalog, Chi tiết khóa học với query `/?ref=...&course=...`, Đăng nhập, Đăng ký, Quy chế).
- **Định dạng Tiêu đề**: Chuẩn hóa thành `[Tên trang] | [system_name]` (sử dụng tên đầy đủ `system_name` thay vì `system_short_name`).
- **Favicon toàn hệ thống**: Sử dụng `branding.favicon_url` được lưu từ A7 trên mọi route; tự động thêm tham số version cache busting `&v=...` để làm mới ngay lập tức khi Admin thay đổi favicon mà không bị dính cache trình duyệt.
- **Cập nhật Giao diện Form**: Đổi nhãn trường cấu hình thành **“Tab trình duyệt – áp dụng toàn hệ thống”** kèm mô tả chi tiết: *“Favicon và tên hệ thống được dùng trên cả cổng quản trị và trang công khai.”*

---

## 3. Các File Đã Thay Đổi
1. `/src/services/api.ts`: Sửa lỗi xác thực token (`getAuthHeaders()`) và trích xuất lỗi PDF blob.
2. `/src/contexts/SystemBrandingContext.tsx`: Mở rộng `syncTabIdentity` để áp dụng toàn hệ thống (`[Tên trang] | [system_name]`) và favicon động theo cấu hình A7, hỗ trợ cập nhật theo query parameters (`?course=...`).
3. `/src/components/admin/AdminSystemSettingsView.tsx`: Cập nhật nhãn và mô tả form cấu hình tab trình duyệt.

---

## 4. Kết Quả Kiểm Thử (Test Results E2E)

| STT | Nội dung kiểm thử | Tiêu chí kỳ vọng | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Xem PDF Quy chế ACTIVE / DRAFT / SUPERSEDED** | Admin và CTV có quyền đọc đúng tệp PDF, hiển thị trong modal preview blob. | Tải thành công tệp PDF từ Supabase Storage, hiển thị trơn tru trên modal preview, không báo lỗi 401/404. | **PASS** |
| 2 | **Tiêu đề Tab trang công khai & quản trị** | Định dạng đúng `[Tên trang] | [system_name]`, bao gồm cả trang chi tiết khóa học qua query `/?course=...`. | Tiêu đề tab thay đổi động chính xác theo route và query parameters. | **PASS** |
| 3 | **Favicon toàn hệ thống** | Favicon cấu hình A7 hiển thị trên mọi trang (Admin, Portal, Catalog, Trang chủ, Login). | Favicon cập nhật tức thì trên tab trình duyệt, hỗ trợ cache busting chống lưu vết cũ. | **PASS** |
| 4 | **Bảo mật & Phân quyền** | Người không có quyền hoặc token hết hạn bị chặn đúng mã lỗi. | Chặn đứng truy cập trái phép, trả về lỗi chuẩn xác. | **PASS** |
