# BÁO CÁO CẬP NHẬT C1.2 — GIAO DIỆN DANH SÁCH KHÓA HỌC TẠI /portal/courses

- **Mã nhiệm vụ:** `STHC-CTV-C1.2-REFINED`
- **Phân hệ:** Cổng Cộng tác viên Tuyển sinh STHC — Module Khóa học (`/portal/courses`)
- **Trạng thái:** Hoàn thành triển khai, kiểm tra build/lint 100%, bảo toàn dữ liệu nghiệp vụ.
- **Ngày cập nhật:** 02/10/2026

---

## 1. Nguồn Trường & Quan Hệ Dữ Liệu "Nhóm Nghề"
- **Cột CSDL:** Cột `career_group VARCHAR(100)` trong bảng `public.courses` (được bổ sung từ migration `/supabase/migrations/20261002000001_add_career_group_to_courses.sql` tại A2).
- **Ràng buộc nghiệp vụ:** 5 nhóm nghề chuẩn STHC: `'Làm bánh'`, `'Nấu ăn'`, `'Nhà hàng'`, `'Khách sạn'`, `'Pha chế'` hoặc `NULL`.
- **Nguồn danh sách lựa chọn:** Lấy kết hợp từ 5 nhóm nghề chuẩn của A2 (`CAREER_GROUP_OPTIONS`) và toàn bộ nhóm nghề thực tế trả về từ CSDL qua API. Bổ sung tùy chọn `"Chưa phân nhóm"` để lọc các khóa học chưa gán nhóm.
- **Quan hệ lọc:** Lọc trực tiếp theo trường `career_group` của khóa học (`c.career_group === selectedCareerGroup` hoặc `!c.career_group` khi chọn Chưa phân nhóm). Tuyệt đối không dùng trường `department` để thay thế.
- **Dữ liệu trả về:** API `GET /api/v1/affiliate/courses` truy vấn `select('*')` đã cung cấp đầy đủ trường `career_group`.

---

## 2. Các File Đã Chỉnh Sửa
1. **`/src/components/affiliate/AffiliateCourseListView.tsx`**:
   - Thay thế toàn bộ nhãn và logic bộ lọc từ "Khoa đào tạo" sang "Tất cả nhóm nghề".
   - Tự động reset trang về trang 1 khi thay đổi bất kỳ bộ lọc hoặc từ khóa tìm kiếm.
   - Thẻ khóa học hiển thị badge Nhóm nghề (nền xanh nhạt `bg-blue-50`, chữ xanh navy `text-blue-900`, viền `border-blue-200/80`). Tên nhóm dài được xuống dòng tối đa 2 dòng (`line-clamp-2 break-words`). Khóa học chưa gán nhóm hiển thị badge "Chưa phân nhóm" (`bg-slate-100 text-slate-600 border-slate-200`).
   - Mã khóa học (`#{course.code}`) hiển thị chữ nhỏ màu xám tách biệt hoàn toàn khỏi badge Nhóm nghề.
   - Nút **"Chi tiết"** chuyển sang nền xanh navy (`bg-blue-900`), chữ trắng (`text-white`), hover `bg-blue-950`.
   - Học phí dùng định dạng tiền tệ chống ngắt dòng với `whitespace-nowrap` và `\u00A0đ`.
   - Khóa học chưa có ảnh dùng nền xanh navy thương hiệu STHC (`#0B1E3F`), biểu tượng vàng (`text-amber-400`), mã khóa màu vàng (`text-amber-300`).
   - Badge Hệ đào tạo trên ảnh có độ tương phản cao với nền tối bán trong suốt (`bg-slate-950/85 backdrop-blur-md text-white border-white/20`).
   - Tích hợp modal mã QR tuyển sinh (`QRModal`) cùng nút "QR", giữ nguyên chức năng xem link và "Chép link".
   - Bố cục thẻ được căn thẳng hàng giữa các thẻ cùng hàng nhờ hệ thống Flexbox cấu trúc đồng bộ.
   - Thu gọn padding của trang, loại bỏ khoảng đệm dư thừa.

2. **`/src/components/common/AppLayout.tsx`**:
   - Điều chỉnh vùng chứa `<main>` từ `p-4 sm:p-8` thành `px-4 py-4 sm:px-8 sm:py-6 overflow-x-hidden`.
   - Đảm bảo khoảng cách từ đáy header đến tiêu đề nội dung đạt chuẩn: **24px trên máy tính** (`sm:py-6`) và **16px trên điện thoại** (`py-4`). Không làm ảnh hưởng đến các trang khác.

3. **Màn hình xem trước khóa học (Preview Modal)**:
   - Đã xác nhận không còn nhãn chữ "Mã khoá học" và "Tên khoá học" thừa tại `CourseDetailModal.tsx`.

---

## 3. Quy Chuẩn Thiết Kế Nhận Diện Thương Hiệu STHC
- **Màu sắc chủ đạo:** Xanh navy (`#0B1E3F`, `bg-blue-900`), vàng hoàng gia (`text-amber-400`, `bg-amber-50`, `border-amber-300`), trắng tinh khiết.
- **Thẻ khóa học:** Nền trắng, viền xám sáng `border-slate-200/90`, bo góc 16px (`rounded-2xl`), bóng nhẹ `shadow-xs`. Hover tăng bóng nhẹ `hover:shadow-md` và chuyển viền xanh `hover:border-blue-900/50` không gây dịch chuyển vị trí các phần tử lân cận.
- **Ảnh đại diện:** Chiều cao cố định `h-48`, tỷ lệ đồng nhất giữa các thẻ.
- **Khối chính sách thưởng:** Nền vàng nhạt `bg-amber-50/80`, viền vàng `border-amber-300/80`, biểu tượng đô-la vàng, giữ nguyên vẹn nội dung: *"Thưởng 500.000 đ/hồ sơ nhập học hợp lệ — Sau khi nhà trường đối soát và phê duyệt."*

---

## 4. Kết Quả Kiểm Tra (Verification)
- **TypeScript & Lint:** Lệnh `npm run lint` và `compile_applet` đạt 100% PASS, không phát sinh bất kỳ cảnh báo hoặc lỗi nào.
- **Bộ lọc Nhóm nghề:**
  - Chọn "Tất cả nhóm nghề": hiển thị toàn bộ 8 khóa học hợp lệ.
  - Chọn "Làm bánh": hiển thị đúng 1 khóa học "Bánh Âu" (mã BA).
  - Chọn "Chưa phân nhóm": lọc ra chính xác 7 khóa học chưa gán nhóm nghề.
  - Tự động đưa về Trang 1 khi đổi bộ lọc.
- **Không còn nhãn "Khoa đào tạo":** Đã rà soát toàn bộ code, không còn bất kỳ nhãn hoặc logic nào liên quan đến "Khoa đào tạo" trên trang này.
- **Kiểm tra Responsive:**
  - Desktop: Lưới 3 cột cân đối, các khối thông tin thẳng hàng.
  - Tablet: Lưới 2 cột mượt mà.
  - Mobile: Lưới 1 cột, không có hiện tượng tràn ngang màn hình (`overflow-x`), số tiền và ký hiệu `đ` luôn nằm trên cùng 1 dòng.
- **Tính năng sao chép & QR:**
  - Click "Chép link" đổi trạng thái sang "Đã chép" (màu xanh lá) trong 2.5s.
  - Click "QR" mở modal mã QR định danh chuẩn STHC, hỗ trợ sao chép link và tải ảnh PNG về máy.

---

## 5. Giới Hạn & Ghi Nhận
- Không chạy script seed hoặc thay đổi dữ liệu nghiệp vụ trong cơ sở dữ liệu.
- Hoàn tất đúng phạm vi C1.2 và dừng lại theo yêu cầu.
