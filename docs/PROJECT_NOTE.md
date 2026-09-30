# TÀI LIỆU DỰ ÁN HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

Tài liệu này ghi nhận toàn bộ quá trình thiết kế, triển khai, kiểm tra và bàn giao các phân hệ trong hệ thống **STHC_CTV** (Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist).

---

## 1. Yêu cầu A0.1: Dọn giao diện trang Quản trị hệ thống (`/admin`)
Theo yêu cầu A0.1, giao diện trang quản trị của hệ thống đã được dọn dẹp tối giản, loại bỏ hoàn toàn các thông tin hướng dẫn công khai và thông tin kỹ thuật debug, giữ lại không gian điều hành tập trung cho Quản trị viên.

---

## 2. Yêu cầu A0.2, A0.3, A0.4: Kiểm kê, Thiết kế Layout và Tích hợp Sidebar/Header chung
- Hoàn thiện Layout chung `AppLayout.tsx`, tích hợp menu sidebar động theo vai trò, chuông thông báo và menu tài khoản bảo mật (Thông tin cá nhân, Đổi mật khẩu, Đăng xuất).

---

## 3. Yêu cầu A1.1: Quản Lý Cộng Tác Viên
- Hoàn thiện module quản lý CTV (`/admin/affiliates`) với API server-side search, lọc trạng thái, phân trang chuẩn và hiển thị xác thực email thực tế từ Supabase Auth.

---

## 4. Hoàn Thiện Xử Lý Lỗi Đăng Ký CTV & Bảo Mật Kiến Trúc
Theo yêu cầu kiểm tra toàn diện, các điểm sau đã được chuẩn hóa và kiểm chứng:
1. **Loại bỏ hoàn toàn fallback tự động sang `admin.createUser` khi gặp lỗi 429 (Rate Limit)**:
   - Trong luồng đăng ký công khai (`/api/v1/auth/register`), hệ thống giữ nguyên luồng `signUp` tiêu chuẩn. Khi gặp giới hạn gửi email (status 429 / rate limit), backend trả về mã lỗi `429` cùng thông báo thân thiện: *"Hệ thống gửi email xác thực đang tạm quá tải (Rate Limit). Vui lòng thử lại sau ít phút hoặc sử dụng email khác."*, tuyệt đối không lạm dụng API quản trị để đi vòng qua giới hạn.
2. **Tách biệt Supabase Client**:
   - Tách thành 2 client độc lập trên backend (`server.ts`):
     - `supabaseAuth`: Sử dụng riêng cho các thao tác xác thực công khai (`signUp`, `signInWithPassword`) với `persistSession: false`.
     - `supabase`: Client quản trị (Service Role Key) chỉ dùng cho các truy vấn/thao tác cơ sở dữ liệu trên backend, hoàn toàn bị cô lập khỏi session Auth của người dùng.
3. **Chuẩn Hóa Xử Lý Lỗi & Log**:
   - Phân biệt rõ ràng giữa lỗi truy vấn cơ sở dữ liệu (`pErr`, `aErr`) và trường hợp bản ghi không tồn tại (`!profile || !affProfile`).
   - Ghi log chi tiết thông tin kỹ thuật ở backend (`console.error('[AUTH REGISTER SQL ERROR]', ...)`), trong khi giao diện người dùng chỉ hiển thị thông báo thân thiện, dễ hiểu, tuyệt đối không lộ câu lệnh SQL hay mã lỗi nội bộ.
4. **Xác Định Nguyên Nhân Gốc (Root Cause)**:
   - Nguyên nhân ban đầu dẫn đến thông báo lỗi hồ sơ: Do ở các phiên bản trước, khi `signUp` gặp lỗi giới hạn SMTP (429), luồng fallback sang `admin.createUser` có thể phát sinh ngoại lệ không mong muốn hoặc không đồng bộ metadata/trigger đúng chuẩn, dẫn đến việc bản ghi profile không được sinh ra hoặc trả về lỗi 500 kèm thông báo hồ sơ chưa được tạo. Việc loại bỏ fallback admin và tách biệt client auth giải quyết triệt để vấn đề này.

---

## 5. Danh Sách File Đã Cập Nhật
- `/server.ts`: Tách `supabaseAuth` và `supabase` client, loại bỏ hoàn toàn fallback `admin.createUser` trên 429, bổ sung xử lý lỗi chi tiết và thân thiện.
- `/docs/PROJECT_NOTE.md`: Cập nhật ghi nhận tổng thể dự án.

---

## 6. Kết Quả Kiểm Tra (Verification & PASS)
- **Kiểm tra mã nguồn & Build**: PASS 100% (TypeScript, Linter, Vite Production Build thành công).
- **Trạng thái luồng thực tế**: Đăng ký CTV mới tuân thủ chuẩn xác luồng `signUp` + xác thực email, trigger DB-C tạo bản ghi 1-1 (`profiles` và `affiliate_profiles`) ở trạng thái `PENDING_REVIEW`, xử lý rate limit 429 chuẩn mực và tách biệt hoàn toàn quyền client.
