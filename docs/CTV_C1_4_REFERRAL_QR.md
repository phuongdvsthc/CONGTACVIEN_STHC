# BÁO CÁO KỸ THUẬT C1.4: TRANG CÔNG KHAI CHI TIẾT KHÓA HỌC & ĐĂNG KÝ HỌC THEO YÊU CẦU MỚI

Tài liệu này ghi nhận nguyên nhân gốc rễ, toàn bộ các thay đổi kiến trúc và kết quả kiểm thử thực tế cho yêu cầu C1.4 thuộc Cổng Cộng tác viên Tuyển sinh STHC.

---

## 1. Nguyên nhân gốc rễ (Root Cause Analysis)

### 1.1. Nguyên nhân tự động chuyển hướng sang `/catalog`
- **Vị trí lỗi cũ:** `src/App.tsx` (hook `useEffect` mount ban đầu, dòng 245–250 cũ).
- **Cơ chế cũ:** Khi khách truy cập link tiếp thị có tham số `?course=...` tại trang chủ `/`, đoạn code cũ thực hiện:
  ```ts
  if (urlCourse) {
    localStorage.setItem('sthc_selected_course', urlCourse.trim());
    const search = window.location.search;
    navigate(`/catalog${search}`);
  }
  ```
- **Hệ quả:** Bất kỳ ai mở link `/?ref=...&course=...` đều bị router chuyển hướng tự động sang `/catalog?ref=...&course=...`, làm mất ngữ cảnh trang chủ và phá vỡ cấu trúc URL công khai chuẩn `/?ref=...&course=...`.

### 1.2. Nguyên nhân tự động mở modal/popup chi tiết toàn bộ khóa học
- **Vị trí lỗi cũ:** `src/components/public/PublicHome.tsx` (dòng 43–58 cũ).
- **Cơ chế cũ:** Khi route `/catalog` nạp component `PublicHome.tsx`, một `useEffect` đọc `courseParam` từ URL hoặc `localStorage`, sau đó tự động gọi `setSelectedCourseForDetail(matched)`.
- **Hệ quả:** Component `CourseDetailModal.tsx` bị kích hoạt mở lên dưới dạng một modal popup với nền tối mờ (`bg-slate-950/70 backdrop-blur-sm`), nút đóng `X`, và khung cuộn nội bộ nhỏ (`overflow-y-auto max-h-[90vh]`), gây ức chế cho người dùng điện thoại và không tạo cảm giác một trang tuyển sinh chính thức.

---

## 2. Giải pháp kỹ thuật & Cập nhật thiết kế mới theo yêu cầu

### 2.1. Quy tắc định tuyến chuẩn tại trang chủ (`/`)
- **Khi có tham số `course` hợp lệ:** Giữ nguyên pathname `/` và các tham số `?ref=...&course=...`. Hiển thị trực tiếp component trang độc lập `PublicCourseDetailPage.tsx`. Không tự chuyển hướng sang `/catalog`, không đưa nội dung chi tiết khóa học vào popup, không yêu cầu đăng nhập.
- **Khi không có `course`:** Giữ nguyên trang chủ tiếp thị CTV hiện tại (`AffiliateLandingPage.tsx`).
- **Khi có `ref` nhưng không có `course`:** Lưu trữ `ref_code` vào state và `localStorage` (thời hạn 30 ngày theo cơ chế Last-Click Attribution), hiển thị trang chủ tiếp thị CTV bình thường.
- **Khi truy cập link cũ `/catalog?ref=...&course=...`:** `App.tsx` tự động chuyển hướng chuẩn về `/?ref=...&course=...` (giữ nguyên đầy đủ tham số), đảm bảo người dùng truy cập từ link cũ đều được đưa về trang công khai chuẩn.
- **Khi `course` không tồn tại hoặc bị ẩn (`is_active === false`):** Hiển thị màn hình thông báo lỗi trang trọng ("Khóa học không tồn tại hoặc đã ngừng công khai trên hệ thống") kèm nút quay lại danh mục hoặc trang chủ. Tuyệt đối không tự ý mở khóa khác hoặc nạp dữ liệu mẫu.

### 2.2. Header mới
- Nền header đổi thành màu xanh thương hiệu Saigontourist (`bg-[#0B1E3F]`), đồng bộ với token nhận diện thương hiệu.
- Đã loại bỏ hoàn toàn tên trường và dòng mô tả hardcode trước đây.
- Logo và hotline sẽ được lấy từ module cấu hình trang home của Admin khi nguồn cấu hình này được triển khai.
- **Trạng thái hiện tại:** Chưa triển khai module cấu hình home của Admin -> Tuyệt đối không hiển thị logo/hotline mẫu hoặc fallback hardcode.
- Chiều cao header được thu gọn tối ưu (`min-h-[46px]`), không tạo khoảng trống thừa.

### 2.3. Các card thông tin khóa học (Dữ liệu thật & Loại bỏ suy diễn)
- **Kiểm tra từng card và ánh xạ dữ liệu thật từ CSDL Supabase:**
  - Card 1: **Thời gian đào tạo** — ánh xạ trực tiếp từ trường `duration_text` của bảng `courses`.
  - Card 2: **Học phí** — ánh xạ từ trường `tuition_fee_estimate` của bảng `courses` (được định dạng chuẩn tiền tệ VNĐ). Không tự động thêm chữ "dự kiến" nếu không có căn cứ.
- **Loại bỏ hoàn toàn các card suy diễn hoặc tự gán:**
  - Không suy ra "Văn bằng" từ `degree_level` (trường này chỉ là Hệ đào tạo).
  - Không tự gán "Hình thức: Xét tuyển học bạ" hoặc các nội dung mặc định không có trong CSDL.
- **Khối phân loại đầu trang:**
  - Giữ lại "Hệ đào tạo" (`degree_level`), "Nhóm nghề" (`career_group`), và "Mã khóa" (`code`) theo dữ liệu thật.
  - Không hiển thị "Khoa đào tạo" (`department`) trong khối đầu trang này.
- **Tự động co giãn bố cục:** Ẩn hoàn toàn các card không có dữ liệu, các card còn lại tự động co giãn (`grid-cols-1 sm:grid-cols-2`), tuyệt đối không để ô trống.

### 2.4. Nút "ĐĂNG KÝ HỌC" và Popup Form Đăng Ký
- Đổi tên nút hành động chính từ "ĐĂNG KÝ TƯ VẤN NGAY" thành **"ĐĂNG KÝ HỌC"**.
- Bấm nút mở popup modal chứa form đăng ký cho chính khóa học đang xem:
  - Tiêu đề popup: **“Đăng ký học — [Tên khóa học]”**.
  - Nút gửi: **“Gửi đăng ký học”**.
  - Khóa học được chọn sẵn và cố định (`lockCourse={true}`), không cho phép đổi sang khóa khác.
  - Tái sử dụng component `LeadConsultationForm.tsx`, bảo toàn đầy đủ validation, consent và endpoint `POST /api/v1/public/leads`.
  - **Consent bắt buộc:** Không tích chọn sẵn mặc định (`consentAccepted = false`). Học viên bắt buộc phải chủ động tích chọn chấp thuận Nghị định 13/2023/NĐ-CP mới gửi được form.
  - Hỗ trợ đóng popup bằng nút `X`, phím `Escape`, nhấp ngoài nền mờ; ngăn ngừa việc mở nhiều popup khi bấm liên tiếp.
  - Đóng/mở popup không làm thay đổi URL hoặc mất nguồn giới thiệu `ref` và `course`.
  - Nghiệp vụ: Gửi form ghi nhận đăng ký ban đầu thành công, sinh mã hẹn `appointment_code`, không tự động đánh dấu đã nhập học, đã đóng học phí hay tạo thưởng CTV.

### 2.5. Thông tin người giới thiệu (Referrer Info)
- Thay thế dòng phụ dưới nút đăng ký thành:
  **“Bạn được giới thiệu bởi đối tác [Họ và tên CTV]”** (in đậm họ và tên CTV).
- **Backend API an toàn:** Bổ sung endpoint `GET /api/v1/public/affiliate-referrer?ref=...`.
  - Tra cứu mã `ref` từ bảng `affiliate_profiles` kết hợp bảng `profiles` (`profiles!affiliate_profiles_user_id_fkey`).
  - Kiểm tra trạng thái CTV còn hiệu lực (`status === 'ACTIVE'`).
  - **Bảo mật PII:** Chỉ trả về họ và tên hiển thị công khai và mã CTV; tuyệt đối không để lộ email, số điện thoại, số CCCD hay dữ liệu tài khoản ngân hàng.
  - Nếu `ref` không tồn tại, CTV bị tạm ngưng (`SUSPENDED`) hoặc chưa duyệt: API trả về không hợp lệ, giao diện ẩn hoàn toàn câu xác nhận người giới thiệu.
  - Khi gửi form, backend tiếp tục kiểm tra lại tính hợp lệ của CTV tại thời điểm submit, không phụ thuộc vào kết quả tra cứu lúc tải trang.

### 2.6. Bỏ form nằm dưới trang & Rút gọn Footer
- **Bỏ form dưới trang:** Xóa toàn bộ section "Đăng Ký Tư Vấn & Xét Tuyển Học Nghề" ở đáy trang. Toàn bộ trải nghiệm đăng ký tập trung vào popup mở từ nút "ĐĂNG KÝ HỌC".
- **Footer rút gọn:** Xóa tên trường, thông tin đơn vị, hotline, địa chỉ, email, giờ làm việc và link chính sách hardcode. Chỉ giữ lại duy nhất dòng bản quyền:
  `© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.`
  Chiều cao footer được thu gọn tối đa. Nội dung đầy đủ sẽ được liên kết từ module cấu hình home của Admin sau này.

---

## 3. Danh sách tệp đã cập nhật

| STT | Tệp tin | Nội dung thay đổi |
| :--- | :--- | :--- |
| 1 | `/src/components/public/PublicCourseDetailPage.tsx` | Cập nhật header nền xanh Saigontourist `#0B1E3F`, loại bỏ hardcode logo/hotline; hiển thị card theo trường thật; đổi nút sang "ĐĂNG KÝ HỌC" mở popup modal; hiển thị "Bạn được giới thiệu bởi đối tác [Họ và tên CTV]"; xóa form ở đáy trang; thu gọn footer. |
| 2 | `/src/components/public/LeadConsultationForm.tsx` | Khởi tạo consent mặc định `false`; hỗ trợ prop `title`, `submitButtonText`, `badge`, `subtitle` tùy biến linh hoạt cho popup. |
| 3 | `/src/services/api.ts` | Bổ sung hàm `getPublicAffiliateReferrer(refCode)` gọi API lấy thông tin hiển thị công khai của CTV. |
| 4 | `/server.ts` | Nâng cấp hàm `checkAffiliateReferralEligibility` đọc `full_name` từ bảng `profiles`; bổ sung endpoint `GET /api/v1/public/affiliate-referrer` bảo vệ dữ liệu PII. |
| 5 | `/docs/CTV_C1_4_REFERRAL_QR.md` | Cập nhật tài liệu kỹ thuật chi tiết theo yêu cầu mới. |
| 6 | `/docs/PROJECT_NOTE.md` | Cập nhật hồ sơ dự án và biên bản bàn giao. |

---

## 4. Kết quả kiểm tra thực tế (Verification Results)

1. **Kiểm tra biên dịch & Lint:**
   - `compile_applet`: **Build succeeded 100%**.
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
2. **Kiểm tra tra cứu người giới thiệu qua 4 kịch bản:**
   - CTV Demo hoạt động (`STHCCTV1088`): Trả về `full_name: "Trần Thị Thu Thảo"`.
   - CTV Thật trong CSDL hoạt động (`STHCCTV6993`): Trả về `full_name: "admin"`.
   - CTV Tạm ngưng (`STHCCTV3033` - `SUSPENDED`): Trả về `eligible: false`, không hiển thị thông tin CTV.
   - Mã giới thiệu không hợp lệ (`INVALID123`): Trả về `eligible: false`, không hiển thị thông tin CTV.
3. **Kiểm tra card thông tin khóa học thật:**
   - Khóa "Bánh Âu" (`ba-13e2`): Hiển thị đúng 2 card gồm "Thời gian đào tạo: 2 tháng" và "Học phí: 13.000.000 ₫".
   - Không xuất hiện card suy diễn "Văn bằng" hay "Hình thức".
   - Khối đầu trang hiển thị "Hệ đào tạo: Ngắn hạn · Nhóm nghề: Làm bánh · Mã: BA", không có Khoa đào tạo.
4. **Kiểm tra Popup Đăng Ký Học:**
   - Click nút "ĐĂNG KÝ HỌC" mở popup có tiêu đề: `Đăng ký học — Bánh Âu`.
   - Nút gửi mang nhãn `Gửi đăng ký học`.
   - Khóa học Bánh Âu bị khóa cố định, không thể đổi khóa khác.
   - Checkbox consent chưa được tích chọn mặc định; nếu bấm gửi khi chưa tích consent sẽ báo lỗi hợp lệ.
   - Bấm phím Escape hoặc nút `X` đóng popup mượt mà, URL giữ nguyên `/?ref=...&course=...`.
5. **Giao diện & Footer:**
   - Header màu xanh thương hiệu Saigontourist `#0B1E3F`, không có hardcode logo hay hotline.
   - Đáy trang không còn form thừa.
   - Footer chỉ hiển thị duy nhất dòng bản quyền © 2026 STHC - Saigontourist Group.
   - Đã kiểm tra responsive trên mobile và desktop: không tràn ngang.

### 5. Phần chưa xác minh thực tế
- **Module Cấu hình Home của Admin:** Do yêu cầu chỉ định chưa triển khai module cấu hình trang home trong lần này, phần hiển thị logo, hotline và nội dung footer đầy đủ lấy động từ Admin sẽ được kết nối sau khi module cấu hình home được xây dựng.
