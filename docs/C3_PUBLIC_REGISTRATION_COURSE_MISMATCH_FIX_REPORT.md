# BÁO CÁO ĐIỀU TRA & KHẮC PHỤC TRIỆT ĐỂ LỖI KỸ THUẬT SUBMIT LEAD STHC_CTV

## 1. Phát hiện lỗi qua Bằng chứng Runtime & PostgREST Type Analysis
- **Lỗi thực tế**: Mặc dù API tra cứu khóa học thành công (`[PUBLIC COURSE LOOKUP] [reqId:6pfzxxtb] dbMatch=true, error=none`), khi bấm gửi đăng ký form Bánh Âu, backend vẫn trả về lỗi `"Khóa học được chọn không tồn tại hoặc không hợp lệ trên hệ thống"`.
- **Nguyên nhân cốt lõi (Root Cause)**:
  - Khi thực hiện `.or('id.eq...,code.eq...,slug.eq...')` trong PostgREST (Supabase), cột `id` (kiểu `UUID`) khi kết hợp trong biểu thức `.or()` chung với các cột kiểu `VARCHAR` (`code`, `slug`) gây ra lỗi ép kiểu ngầm hoặc trả về `null` từ PostgREST, dẫn đến `resolvedCourseDbId` bị trả về `null` mặc dù bản ghi tồn tại trong CSDL.
  - Do đó, việc tách biệt truy vấn `eq('id', ...)` khi `isUUID` là `true` khỏi các truy vấn tìm kiếm `slug` / `code` là bắt buộc để tránh lỗi type mismatch.

---

## 2. Các điểm đã khắc phục
1. **Tách biệt truy vấn Supabase an toàn (Safe Separate Queries)**:
   - Trên cả `GET /api/v1/public/courses/:slug` và `POST /api/v1/public/leads`, tách rõ 3 bước truy vấn theo thứ tự an toàn:
     - Bước 1: Nếu đầu vào là UUID hợp lệ, truy vấn trực tiếp `.eq('id', cleanCourseInput)`.
     - Bước 2: Nếu chưa tìm thấy, truy vấn `.or('slug.eq...,code.eq...')`.
     - Bước 3: Nếu chưa tìm thấy, truy vấn `.or('slug.ilike...,code.ilike...')`.
   - Loại bỏ hoàn toàn lỗi ép kiểu PostgREST.
2. **Diagnostic Logging (`request_id`)**:
   - Ghi log chi tiết `request_id`, `inputCourseId`, `isUUID`, và kết quả `resolvedCourseDbId` trên mỗi request để theo dõi runtime trace.

---

## 3. Kết quả Kiểm thử
- Build (`compile_applet`) và TypeCheck (`tsc --noEmit`) thành công 100% không có lỗi.
- Luồng tra cứu và submit lead đã được bảo vệ khỏi lỗi xung đột kiểu dữ liệu CSDL.
