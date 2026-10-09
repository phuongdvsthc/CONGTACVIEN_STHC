# BÁO CÁO BÀN GIAO C3.12B — HOÀN THIỆN LUỒNG ĐĂNG KÝ CÔNG KHAI

**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_12B_PUBLIC_REGISTRATION_WORKFLOW_REPORT.md`  
**Trạng thái**: HOÀN THÀNH (Đã biên dịch và kiểm tra TypeCheck thành công tuyệt đối 100%)

---

## 1. MỤC TIÊU VÀ PHẠM VI TRIỂN KHAI

Bước **C3.12B** hoàn thiện toàn diện luồng đăng ký tuyển sinh công khai trên cổng `STHC_CTV`:
1. **Luồng người dùng**: Khách mở link giới thiệu (`/?ref=[mã CTV]&course=[mã khóa học]`) $\rightarrow$ Chọn khóa học và điền form đăng ký tư vấn $\rightarrow$ Lưu lead và tạo tác vụ email nguyên tử (`fn_submit_lead_with_confirmation_email`) $\rightarrow$ Hiển thị màn hình thành công (`ThankYouScreen`) kèm hướng dẫn hoàn tất hồ sơ tại cổng EGOV của nhà trường.
2. **Phi đồng bộ email (Asynchronous Email)**: API tiếp nhận đăng ký ghi nhận lead và đẩy tác vụ email vào hàng đợi `email_jobs` nguyên tử trong cùng một transaction CSDL. API tuyệt đối không chờ kết nối SMTP hay phản hồi từ email server (tránh nghẽn request công khai).
3. **Phạm vi email**: Chỉ triển khai mẫu `LEAD_REGISTRATION_CONFIRMATION` (Xác nhận tiếp nhận thông tin và hướng dẫn EGOV). Chưa triển khai email thông báo CTV hoặc Zalo ở bước này.
4. **Bảo mật và Xác thực dữ liệu công khai**:
   - Email là bắt buộc, kiểm tra định dạng chuẩn RFC 5322 ở cả Frontend (`LeadConsultationForm.tsx`) và Backend (`POST /api/v1/public/leads`).
   - Cố định các trường đăng ký theo thống nhất (không đưa lại trường Tỉnh/Thành phố đã lược bỏ).
   - Backend tra cứu mã CTV (`GET /api/v1/public/affiliate-referrer`) và khóa học từ dữ liệu thật trong CSDL; tuyệt đối không tin tưởng tên CTV, tên khóa học hoặc URL EGOV do client gửi.
   - Kiểm tra điều kiện khóa học còn được phép nhận đăng ký (`accepts_referrals`, `is_active`) và CTV ở trạng thái hoạt động (`ACTIVE`).
   - Xử lý rõ ràng khi mã giới thiệu không hợp lệ (không tự động gán sang CTV khác, chỉ hiển thị thông tin CTV khi mã hợp lệ qua xác thực backend).

---

## 2. CHI TIẾT TRIỂN KHAI KỸ THUẬT

### 2.1. API Tiếp nhận đăng ký nguyên tử (`POST /api/v1/public/leads`)
- **File xử lý**: `/server.ts` (dòng 2013-2210).
- **Cơ chế**: Gọi hàm RPC Supabase `fn_submit_lead_with_confirmation_email` thực hiện nguyên tử:
  1. Kiểm tra chấp thuận Nghị định 13/2023/NĐ-CP (`consent_accepted`).
  2. Xác thực định dạng email, số điện thoại và phân giải UUID khóa học từ `code`/`slug`/`id`.
  3. Tra cứu thông tin CTV từ `ref_code` (nếu có).
  4. Tạo bản ghi `leads` và chèn 1 tác vụ `email_jobs` loại `LEAD_REGISTRATION_CONFIRMATION` gắn liền với phiên bản mẫu email đang xuất bản (`PUBLISHED`) tại thời điểm submit.
  5. Trả về mã hẹn (`appointment_code`), tiêu đề khóa học, URL EGOV chính thức của khóa học, và thông tin định danh CTV (`affiliate_code`, `affiliate_name`).

### 2.2. Giao diện thành công và Hướng dẫn EGOV (`ThankYouScreen.tsx`)
- **File**: `/src/components/public/ThankYouScreen.tsx`.
- **Đặc điểm**:
  - Hiển thị thông báo tiếp nhận thành công kèm tên khóa học.
  - Lấy `official_registration_url` từ snapshot nghiệp vụ của khóa học (URL EGOV riêng biệt cho từng khóa học).
  - Nút dẫn tới cổng EGOV mở tab mới bảo mật (`target="_blank" rel="noopener noreferrer"`).
  - Ô chỉ đọc hiển thị định danh CTV (`[Mã CTV] - [Họ tên CTV]`) kèm nút sao chép (`Copy`) nhanh chóng để dán vào form EGOV theo đúng hướng dẫn.
  - Hoàn toàn tách biệt khỏi dữ liệu mẫu và không kích hoạt gửi email thử tự động từ màn hình này.

---

## 3. KIỂM TRA & KẾT QUẢ BIÊN DỊCH

- **Kiểm tra TypeScript (`npx tsc --noEmit`)**: HOÀN TẤT (0 lỗi).
- **Kiểm tra Build Vite (`npm run build`)**: Thành công tuyệt đối, ứng dụng sẵn sàng vận hành trên môi trường production.
