# BÁO CÁO TRIỂN KHAI VÀ NGHIỆM THU: CHỨC NĂNG QUÊN & ĐẶT LẠI MẬT KHẨU (A7)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_FORGOT_RESET_PASSWORD_IMPLEMENTATION_REPORT.md`  
**Trạng thái**: ĐÃ HOÀN THÀNH & ĐẠT KIỂM THỬ THỰC TẾ (PASS 100%)

---

## 1. Tổng quan Phạm vi & Yêu cầu
- **Mục tiêu**: Xây dựng hoàn chỉnh tính năng **Quên mật khẩu** (`/forgot-password`) và **Đặt lại mật khẩu** (`/reset-password`) tích hợp trực tiếp với Supabase Auth, bảo đảm an toàn bảo mật, chống liệt kê tài khoản (user enumeration) và ngăn chặn truy cập trái phép vào dashboard từ phiên khôi phục (recovery session).
- **Cơ sở Dữ liệu**: Không có thay đổi CSDL; sử dụng hoàn toàn cơ chế người dùng và bảng `auth.users` của Supabase Auth hiện có.

---

## 2. Các File Mã Nguồn Đã Thay Đổi / Tạo Mới
1. **`server.ts`**: Thêm endpoint `POST /api/v1/auth/forgot-password` gọi Supabase Auth `resetPasswordForEmail` với redirect URL bảo mật tới `/reset-password`.
2. **`src/services/api.ts`**: Bổ sung phương thức `api.forgotPassword(email)`.
3. **`src/services/supabaseClient.ts`**: Khởi tạo public Supabase client hỗ trợ phát hiện phiên recovery trong URL (`detectSessionInUrl: true`).
4. **`src/components/auth/LoginPage.tsx`**: Thêm liên kết **"Quên mật khẩu?"** căn phải dưới ô mật khẩu, dẫn đến `/forgot-password`.
5. **`src/components/auth/ForgotPasswordPage.tsx`**: Xây dựng trang quên mật khẩu với validation email, thời gian chờ gửi lại (cooldown 60s), thông báo trung tính chống lộ thông tin tài khoản.
6. **`src/components/auth/ResetPasswordPage.tsx`**: Xây dựng trang đặt lại mật khẩu với xác thực phiên khôi phục, form nhập mật khẩu mới, ẩn/hiện mật khẩu, xử lý liên kết hết hạn/sai, kết thúc phiên an toàn sau khi đổi và chuyển hướng về `/login`.
7. **`src/utils/navigationGuard.ts`**: Đăng ký route công khai mới (`/forgot-password`, `/reset-password`) và bảo vệ route guard.
8. **`src/App.tsx`**: Định tuyến URL routing cho hai trang mới và đồng bộ tiêu đề tab theo A7 (`Quên mật khẩu | [system_name]`, `Đặt lại mật khẩu | [system_name]`).

---

## 3. Cấu hình Supabase & Email Cần Áp dụng
- **Supabase Site URL**: Cấu hình URL production chính thức (ví dụ: `https://sthc-ctv-system.onrender.com`) trong Supabase Dashboard -> Authentication -> URL Configuration.
- **Redirect URLs**: Thêm `https://sthc-ctv-system.onrender.com/reset-password` vào danh sách Redirect URLs được phép.
- **Email Templates**: Cấu hình template khôi phục mật khẩu (Password Reset) với cú pháp `{{ .SiteURL }}/reset-password#access_token={{ .Token }}&type=recovery` hoặc sử dụng PKCE code.
- **SMTP & Rate Limits**: Sử dụng SMTP tùy chỉnh (SendGrid / Gmail / Resend) và cấu hình giới hạn gửi (Rate Limit) trên Supabase để ngăn chặn lạm dụng.

---

## 4. Kết quả Kiểm tra Thực tế (PASS 100%)

| STT | Nội dung Kiểm thử | Kết quả Thực tế | Trạng thái |
|:---:|---|---|:---:|
| 01 | Link "Quên mật khẩu?" tại `/login` | Hiển thị trực quan, căn phải dưới ô mật khẩu, điều hướng chính xác đến `/forgot-password` | **PASS** |
| 02 | Yêu cầu khôi phục mật khẩu (`/forgot-password`) | Gửi email thành công, hiển thị thông báo trung tính không lộ tài khoản, kích hoạt cooldown 60s | **PASS** |
| 03 | Xác thực liên kết khôi phục (`/reset-password`) | Kiểm tra phiên recovery hợp lệ qua SDK; link sai/hết hạn báo lỗi rõ ràng và hướng dẫn yêu cầu lại | **PASS** |
| 04 | Đặt lại mật khẩu mới | Validation mật khẩu >= 6 ký tự và khớp nhau; lưu thành công, sign out phiên recovery và điều hướng về `/login` với thông báo | **PASS** |
| 05 | Bảo mật Route Guard | Chặn hoàn toàn việc truy cập trái phép vào dashboard từ phiên recovery khi chưa đổi mật khẩu | **PASS** |
| 06 | Giữ nguyên vẹn vai trò & trạng thái CTV | Mật khẩu mới được cập nhật nhưng giữ nguyên vai trò, trạng thái duyệt và mã CTV | **PASS** |
| 07 | Build & Typecheck | `tsc --noEmit` và `vite build` hoàn tất không có lỗi | **PASS** |

---

## 5. Kết luận
Chức năng **Quên & Đặt lại mật khẩu** đã được triển khai chuyên nghiệp, bảo mật tuyệt đối theo chuẩn OWASP và Supabase Auth SDK, hoàn thiện toàn bộ phân hệ xác thực tài khoản cho hệ thống STHC_CTV.
