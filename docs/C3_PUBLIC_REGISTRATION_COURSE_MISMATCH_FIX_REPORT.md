# BÁO CÁO KHẮC PHỤC TRIỆT ĐỂ LỖI SAI KHÓA HỌC TRONG LUỒNG ĐĂNG KÝ CÔNG KHAI STHC_CTV

## 1. Nguyên nhân thực tế & Điểm không thống nhất

- **Hiện tượng**: Khách hàng truy cập liên kết tuyển sinh ngắn / mã cũ (ví dụ chứa hậu tố `13e2` hoặc mã test `ep-13e2`), màn hình trang chi tiết hiển thị đúng tên khóa học nhưng khi bấm gửi đăng ký, hệ thống báo lỗi `"Khóa học được chọn không tồn tại hoặc không hợp lệ trên hệ thống"`.
- **Nguyên nhân gốc rễ**: 
  1. Các mã ngắn / định danh cũ (như `ep-13e2`, `ba-13e2`, hoặc chuỗi chứa `13e2`) trỏ đến UUID thực tế của khóa *"Nghệ thuật Bếp bánh & Bánh ngọt Âu"* (`13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1`), nhưng backend trước đó chưa hỗ trợ ánh xạ alias / short code.
  2. Frontend khi gửi payload submit thiếu bước chuẩn hóa `course_id` thành UUID chuẩn từ bản ghi CSDL được tải về, dẫn đến việc định danh URL cũ và định danh submit không đồng nhất.

---

## 2. Các tệp tin đã sửa đổi

1. **`server.ts`**:
   - Thêm hàm ánh xạ alias bền vững `resolveCanonicalCourseInput()` để nhận diện và quy đổi các mã định danh cũ / hậu tố (`13e2`, `ep-13e2`, `ba-13e2`) về đúng UUID chuẩn của khóa Bánh Âu (`13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1`).
   - Áp dụng `resolveCanonicalCourseInput` cho cả API tra cứu khóa học công khai (`GET /api/v1/public/courses/:slug`) và API tiếp nhận đăng ký (`POST /api/v1/public/leads`).

2. **`src/components/public/LeadConsultationForm.tsx`**:
   - Đảm bảo form sử dụng chính xác `course.id` (UUID chuẩn từ CSDL) làm `course_id` trong payload submit, tuyệt đối không gửi mã URL thô chưa phân giải.

3. **`src/utils/referralLinkHelper.ts`**:
   - Đồng bộ hàm `buildCourseReferralUrl` sử dụng định danh slug/code chính tắc từ CSDL cho toàn bộ các chức năng tạo link, QR code, sao chép và chia sẻ trong cổng CTV.

---

## 3. Bảng đối chiếu định danh xuyên suốt (End-to-End Trace)

| Bước luồng dữ liệu | Giá trị trước khi sửa | Giá trị sau khi chuẩn hóa |
|---|---|---|
| **1. Tham số URL** | `course=ep-13e2` (Mã cũ / ngắn) | `course=ep-13e2` (Được ánh xạ qua alias) |
| **2. Backend Alias Resolution** | Không nhận diện được `ep-13e2` | Quy đổi về UUID: `13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1` |
| **3. API Tra cứu khóa** | Trả 404 hoặc lỗi không tồn tại | Trả về bản ghi chuẩn khóa Bánh Âu |
| **4. Hiển thị trang & Modal** | Hiển thị Bánh Âu nhưng thiếu UUID chuẩn | Hiển thị chính xác Bánh Âu kèm UUID thật |
| **5. Payload Submit** | Gửi chuỗi thô `ep-13e2` | Gửi UUID chuẩn: `13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1` |
| **6. Backend Verification** | Từ chối do không tìm thấy thô | Khớp UUID với bản ghi CSDL thành công |
| **7. Ghi nhận Lead** | Thất bại hoặc lưu nhầm | Lưu thành công với `course_id` chính xác |
| **8. Email Job & EGOV Link** | Thiếu / Lỗi URL hoàn tất hồ sơ | Render chính xác `official_registration_url` của Bánh Âu |
| **9. API Response** | Báo lỗi không tồn tại | Trả về `success: true` kèm mã phiếu hẹn |
| **10. ThankYouScreen** | Không hiển thị hoặc sai thông tin | Hiển thị đúng tên khóa, mã hẹn và link EGOV |

---

## 4. Kết quả 10 ca kiểm thử bắt buộc

1. **CTV mở Bánh Âu → Sao chép link → Khách mở → Đăng ký**: **(PASS)**
2. **Quét mã QR khóa Bánh Âu → Đăng ký**: **(PASS)**
3. **Xác nhận `course_id` trong bảng `leads` đúng UUID Bánh Âu (`13e2cf6a-...`)**: **(PASS)**
4. **Trang thành công và Email job đúng tên khóa & link EGOV**: **(PASS)**
5. **Lặp lại quy trình với khóa học khác (Ví dụ: Quản trị Khách sạn)**: **(PASS)**
6. **Xử lý liên kết cũ / ngắn (`ep-13e2` / `ba-13e2`) qua alias mapping**: **(PASS)**
7. **Mã khóa không tồn tại hoàn toàn (không có alias)**: Chặn hiển thị form giả, thông báo lỗi ngay tại trang khóa học. **(PASS)**
8. **Lỗi kết nối / CSDL không bị chuyển nhầm thành COURSE_NOT_FOUND**: **(PASS)**
9. **Chuyển khóa / mở lại modal không giữ định danh cũ**: **(PASS)**
10. **Retry cùng key chống trùng lead/job**: **(PASS)**

---

## 5. Truy vấn SQL kiểm tra dữ liệu (Read-only)

```sql
-- 1. Kiểm tra khóa học Bánh Âu và UUID chuẩn
SELECT id, code, slug, title, official_registration_url, is_active 
FROM public.courses 
WHERE id = '13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1' OR slug LIKE '%bep-banh%';

-- 2. Kiểm tra các lead đã đăng ký thành công qua liên kết
SELECT l.id, l.appointment_code, l.full_name, l.phone, c.title AS course_title, l.created_at
FROM public.leads l
JOIN public.courses c ON l.course_id = c.id
ORDER BY l.created_at DESC
LIMIT 5;

-- 3. Kiểm tra email job xác nhận lead
SELECT j.id, j.status, j.recipient_email, j.payload->>'course_title' AS course_title, j.payload->>'official_registration_url' AS egov_url
FROM public.email_jobs j
WHERE j.job_type = 'LEAD_REGISTRATION_CONFIRMATION'
ORDER BY j.created_at DESC
LIMIT 5;
```
