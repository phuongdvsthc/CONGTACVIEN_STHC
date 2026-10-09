# BÁO CÁO BÀN GIAO C3.11B — MẪU EMAIL XÁC NHẬN LEAD & MÀN HÌNH ADMIN THIẾT KẾ NỘI DUNG

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_11B_LEAD_CONFIRMATION_EMAIL_TEMPLATE_REPORT.md`  
**Ngày hoàn thành**: 09/10/2026  
**Phân hệ**: Quản lý Mẫu Email & Cấu hình Phiên bản (C3 / C3.11B)  
**Trạng thái thực thi**: **HOÀN THÀNH — CSDL: PENDING_DEPLOYMENT**

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.11B

Bước **C3.11B** hoàn thiện phân hệ Quản lý Mẫu Email và Thiết kế Nội dung phía Backend & Admin:
1. **Quản lý Mẫu Email (`email_templates` & `email_template_versions`)**:
   - Quản lý tập trung mẫu email `LEAD_REGISTRATION_CONFIRMATION` (Xác nhận tiếp nhận thông tin đăng ký khóa học qua CTV và hướng dẫn hoàn tất hồ sơ trên cổng EGOV).
   - Cơ chế phiên bản bất biến (`immutable versions`), lưu nháp (`DRAFT`), xuất bản (`PUBLISHED`), lưu lịch sử, kiểm soát xung đột ghi đè bằng `expected_revision`.
2. **Giao diện Admin tại `/admin/email-templates` (`AdminEmailTemplatesView.tsx`)**:
   - Cho phép Quản trị viên (Admin) xem danh sách mẫu, chỉnh sửa nội dung bản nháp, xem trước giao diện Desktop/Mobile ở 2 trạng thái (có CTV và không có CTV), kiểm tra lịch sử phiên bản và xuất bản phiên bản mới.
3. **Bộ Kết Xuất Backend (`emailTemplateRenderer.ts`)**:
   - Tách rời hoàn toàn khỏi SMTP transport và hàng đợi (`email_jobs`), thực hiện thay thế biến an toàn, xử lý khối điều kiện `{{#if affiliate_name}}`, chống Header Injection và làm sạch HTML (`sanitizeHtml`).
4. **Tích hợp Producer C3.10B**:
   - Job hàng đợi tham chiếu chính xác phiên bản mẫu đã xuất bản tại thời điểm enqueue trong cùng transaction CSDL.

---

## 2. KIẾN TRÚC CSDL & MIGRATION SQL

### 2.1. Tệp Migration
- **Đường dẫn**: `/supabase/migrations/20261009000004_c3_email_templates_schema.sql`
- **Nội dung SQL chính**:
  1. Tạo bảng `public.email_templates`: Định danh mẫu theo `template_code` (`LEAD_REGISTRATION_CONFIRMATION`).
  2. Tạo bảng `public.email_template_versions`: Lưu trữ các phiên bản (`version_code`, `status`: `'DRAFT'`, `'PUBLISHED'`, `'ARCHIVED'`, `subject`, `body_html`, `body_text`, `button_label`, `footer_text`, `revision`, `created_by`, `published_by`, `published_at`, `change_reason`).
  3. Seed sẵn mẫu và phiên bản `v1` (`PUBLISHED`) tương thích ngược với C3.10B.
  4. Cấu hình RLS (Row Level Security) nghiêm ngặt: Thu hồi toàn bộ quyền từ `anon` và `authenticated`, chỉ cho phép `service_role` thao tác dữ liệu trực tiếp, kết hợp kiểm tra `profiles.role = 'admin'` và `is_active = TRUE`.
  5. Xây dựng hàm RPC nguyên tử:
     - `public.fn_save_email_template_draft(...)`: Lưu nháp, kiểm tra quyền Admin, phát hiện xung đột revision (`CONFIG_VERSION_CONFLICT`), tăng revision tự động.
     - `public.fn_publish_email_template_version(...)`: Chuyển phiên bản hiện tại sang `ARCHIVED` và xuất bản phiên bản mới thành `PUBLISHED` (bất biến).
- **Trạng thái áp dụng**: **PENDING_DEPLOYMENT** (Chờ người dùng chủ động chạy trên Supabase SQL Editor).

### 2.2. Truy Vấn Kiểm Tra Sau Khi Chạy Migration
```sql
-- 1. Kiểm tra danh sách mẫu email
SELECT id, template_code, name, is_active FROM public.email_templates;

-- 2. Kiểm tra các phiên bản mẫu email và trạng thái xuất bản
v.version_code, v.status, v.revision, v.subject, v.published_at 
FROM public.email_template_versions v
JOIN public.email_templates t ON t.id = v.template_id
ORDER BY t.template_code, v.revision DESC;
```

---

## 3. MÀN HÌNH QUẢN TRỊ & ROUTING

- **Đường dẫn Route**: `/admin/email-templates`
- **Phân quyền bảo mật**: Chỉ Quản trị viên (`role = 'admin'`, `is_active = TRUE`) mới có quyền truy cập. Hệ thống kiểm tra chặt chẽ cả trên Frontend (`navigationGuard.ts`, `navConfig.ts`) và Backend (`requireAdminOnly`).
- **Giao diện (`AdminEmailTemplatesView.tsx`)**:
  - **Khối Danh sách & Trạng thái**: Hiển thị mẫu `LEAD_REGISTRATION_CONFIRMATION`, phiên bản đang áp dụng hiện hành.
  - **Trình soạn thảo trực quan**: Cho phép chỉnh sửa tiêu đề (`Subject`), nội dung HTML, nhãn nút CTA (`Hoàn tất hồ sơ đăng ký`), chân trang và ghi chú thay đổi (`change_reason`).
  - **Bảng Biến Hỗ Trợ (Variables Helper)**: Cung cấp sẵn các biến cú pháp chuẩn tiếng Việt dễ hiểu (`{{customer_name}}`, `{{course_code}}`, `{{course_title}}`, `{{affiliate_code}}`, `{{affiliate_name}}`, `{{registered_at}}`, `{{brand_name}}`, `{{support_email}}`, `{{support_hotline}}`).
  - **Công cụ Xem Trước (Preview Modal)**: Xem trước giao diện Desktop/Mobile với dữ liệu giả lập (hỗ trợ bật/tắt trường hợp có CTV hoặc không có CTV, tên khóa học dài).
  - **Lịch sử & Xuất bản**: Xem lịch sử các phiên bản trước đó, lưu nháp với kiểm soát xung đột revision, và xuất bản phiên bản mới làm chuẩn cho hàng đợi.

---

## 4. BỘ KẾT XUẤT BACKEND & SANITIZATION (`emailTemplateRenderer.ts`)

- **Nhiệm vụ**: Module `/src/services/emailTemplateRenderer.ts` chịu trách nhiệm:
  1. Nhận phiên bản mẫu đã xuất bản và snapshot payload của job.
  2. Thay thế các biến động (`{{...}}`) một cách an toàn, định dạng thời gian `registered_at` theo múi giờ `Asia/Ho_Chi_Minh`.
  3. Xử lý khối điều kiện `{{#if affiliate_name}}` tự động ẩn/hiện thông tin CTV và hướng dẫn nhập mã CTV tùy thuộc vào việc lead có được giới thiệu bởi đại sứ hay không.
  4. Kiểm tra URL EGOV (`official_registration_url`) phải là tuyệt đối (`http://` hoặc `https://`), chặn đứng các URL chứa `javascript:`, `data:` hoặc domain giả mạo.
  5. Khử định dạng CR/LF trong tiêu đề (`Subject`) để chống lỗ hổng Header Injection.
  6. Làm sạch mã HTML (`sanitizeHtml`), loại bỏ thẻ độc hại (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, các trình xử lý sự kiện `onclick`, `onerror`, v.v.).

---

## 5. KẾT QUẢ KIỂM THỬ & CHƯA KIỂM CHỨNG

- **Kiểm thử Source & Build**: Đã chạy `npx tsc --noEmit` và `compile_applet` thành công tuyệt đối, không có lỗi TypeScript hay cú pháp.
- **Kiểm tra Phân quyền**: Đảm bảo Staff, CTV và Anonymous bị chặn hoàn toàn ở cả UI và API.
- **Trạng thái Database**: Remote Supabase DB ở trạng thái **PENDING_DEPLOYMENT** cho đến khi người dùng chạy migration SQL.
- **Chưa kiểm chứng**: Gửi email thực tế qua SMTP client (Outlook / Gmail thực tế) sẽ được thực hiện ở bước worker tiếp theo (`C3.12A`).

---

## 6. BƯỚC TIẾP THEO
- **C3.12A — Worker xử lý hàng đợi và gửi email nghiệp vụ.**
