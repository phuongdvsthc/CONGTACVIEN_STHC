# BÁO CÁO KỸ THUẬT C1.4: CHUYỂN POPUP CHI TIẾT KHÓA HỌC THÀNH TRANG CÔNG KHAI ĐỘC LẬP & CHUẨN HÓA ĐIỀU HƯỚNG TIẾP THỊ

Tài liệu này ghi nhận nguyên nhân gốc rễ, toàn bộ các thay đổi kiến trúc và kết quả kiểm thử thực tế cho yêu cầu C1.4 thuộc Cổng Cộng tác viên Tuyển sinh STHC.

---

## 1. Nguyên nhân gốc rễ (Root Cause Analysis)

### 1.1. Nguyên nhân tự động chuyển hướng sang `/catalog`
- **Vị trí lỗi cũ:** `src/App.tsx` (hook `useEffect` mount ban đầu, dòng 245–250).
- **Cơ chế cũ:** Khi khách truy cập link tiếp thị có tham số `?course=...` tại trang chủ `/`, đoạn code cũ thực hiện:
  ```ts
  if (urlCourse) {
    localStorage.setItem('sthc_selected_course', urlCourse.trim());
    const search = window.location.search;
    navigate(`/catalog${search}`);
  }
  ```
- **Hệ quả:** Bất kỳ ai mở link `/?ref=...&course=...` đều bị router chuyển hướng tự động sang `/catalog?ref=...&course=...`, làm mất ngữ cảnh trang chủ và phá vỡ cấu trúc URL công khai chuẩn `/?ref=...&course=...`.

### 1.2. Nguyên nhân tự động mở modal/popup chi tiết
- **Vị trí lỗi cũ:** `src/components/public/PublicHome.tsx` (dòng 43–58).
- **Cơ chế cũ:** Khi route `/catalog` nạp component `PublicHome.tsx`, một `useEffect` đọc `courseParam` từ URL hoặc `localStorage`, sau đó tự động gọi `setSelectedCourseForDetail(matched)`.
- **Hệ quả:** Component `CourseDetailModal.tsx` bị kích hoạt mở lên dưới dạng một modal popup với nền tối mờ (`bg-slate-950/70 backdrop-blur-sm`), nút đóng `X`, và khung cuộn nội bộ nhỏ (`overflow-y-auto max-h-[90vh]`), gây ức chế cho người dùng điện thoại và không tạo cảm giác một trang tuyển sinh chính thức.

---

## 2. Giải pháp kỹ thuật & Các thành phần đã triển khai

### 2.1. Quy tắc định tuyến chuẩn tại trang chủ (`/`)
- **Khi có tham số `course` hợp lệ:** Giữ nguyên pathname `/` và các tham số `?ref=...&course=...`. Hiển thị trực tiếp component trang độc lập `PublicCourseDetailPage.tsx`. Không tự chuyển hướng sang `/catalog`, không mở modal/popup, không yêu cầu đăng nhập.
- **Khi không có `course`:** Giữ nguyên trang chủ tiếp thị CTV hiện tại (`AffiliateLandingPage.tsx`).
- **Khi có `ref` nhưng không có `course`:** Lưu trữ `ref_code` vào state và `localStorage` (thời hạn 30 ngày theo cơ chế Last-Click Attribution), hiển thị trang chủ tiếp thị CTV bình thường.
- **Khi truy cập link cũ `/catalog?ref=...&course=...`:** `App.tsx` tự động chuyển hướng chuẩn về `/?ref=...&course=...` (giữ nguyên đầy đủ tham số), đảm bảo người dùng truy cập từ link cũ đều được đưa về trang công khai chuẩn.
- **Khi `course` không tồn tại hoặc bị ẩn (`is_active === false`):** Hiển thị màn hình thông báo lỗi trang trọng ("Khóa học không tồn tại hoặc đã ngừng công khai trên hệ thống") kèm nút quay lại danh mục hoặc trang chủ. Tuyệt đối không tự ý mở khóa khác hoặc nạp dữ liệu mẫu.

### 2.2. Thiết kế trang công khai theo bố cục TTL.png & Chuẩn thương hiệu STHC
Component mới: `src/components/public/PublicCourseDetailPage.tsx`.
- **Header gọn:** 
  - Logo và tên trường bên trái: "TRƯỜNG DU LỊCH SAIGONTOURIST (STHC)" kèm biểu tượng STHC.
  - Hotline chính thức bên phải: `1800 5588 27` (Miễn phí cước gọi), gắn link gọi trực tiếp `tel:1800558827`.
  - Không sử dụng sidebar hay header quản trị của cổng CTV. Không hiển thị thù lao, link tiếp thị hay công cụ chia sẻ của CTV.
- **Bố cục tổng thể:**
  - Nền xám nhạt (`bg-slate-100/90`), khối nội dung thẻ trắng (`bg-white rounded-2xl shadow-sm border border-slate-200/90`), độ rộng tối đa chuẩn 1100–1200px (`max-w-6xl`).
  - Trang cuộn tự nhiên toàn màn hình (`window` scroll), loại bỏ triệt để khung cuộn nhỏ bên trong.
- **Phần đầu 2 cột (Desktop 2 cột, Mobile 1 cột không tràn ngang):**
  - Cột trái: Ảnh đại diện khóa học thật từ CSDL (`thumbnail_url`), có fallback container trang trọng nếu ảnh lỗi. Huy hiệu hệ đào tạo nổi trên ảnh.
  - Cột phải: 
    - Nhãn phân loại không dùng pill: Tên khoa, nhóm nghề, mã khóa.
    - Tên khóa học tiêu đề lớn, sắc nét.
    - Mô tả tóm tắt khóa học.
    - Hộp 4 thông số: Thời gian đào tạo, Học phí dự kiến (định dạng VNĐ), Văn bằng/chứng chỉ, Hình thức xét tuyển học bạ.
    - Nút Call To Action "ĐĂNG KÝ TƯ VẤN NGAY", bấm vào cuộn mượt mà xuống form đăng ký bên dưới.
- **Nội dung đào tạo & Lịch khai giảng:**
  - `description_html` được làm sạch an toàn bằng `sanitizeHtml`.
  - Hiển thị đầy đủ thông tin: Lịch khai giảng theo các tháng, ca học, đối tượng tuyển sinh, học phí trọn gói.
- **Đặc quyền học viên STHC:**
  - Hiển thị khi `benefits_content` có dữ liệu (Giảm 5% học phí khi đăng ký sớm, thực tập hưởng lương tại Saigontourist Group, cam kết 100% giới thiệu việc làm).

### 2.3. Form đăng ký tư vấn tích hợp ngay trong trang
- Vị trí: Đặt ngay bên dưới phần nội dung (id `dang-ky-tu-van`), không mở popup.
- Tái sử dụng: Dùng `LeadConsultationForm.tsx` kết hợp prop mới `lockCourse={true}`:
  - Khóa đang xem được chọn sẵn và cố định (locked view), ngăn chặn học viên chọn nhầm khóa khác.
  - Giữ nguyên `ref_code` từ URL và gửi lên backend qua API `POST /api/v1/public/leads`.
  - Xác thực consent theo Nghị định 13/2023/NĐ-CP.
  - Chặn spam gửi liên tiếp bằng trạng thái `loading`, vô hiệu hóa nút submit.
  - Sau khi backend lưu thành công, hiển thị trực tiếp `ThankYouScreen` với mã hẹn `appointment_code`.

### 2.4. Bảo hộ nguồn CTV & Chống gian lận (Anti-Tampering)
- Backend kiểm tra điều kiện `status === 'ACTIVE'` của CTV tại thời điểm gửi form. Nếu CTV bị `SUSPENDED`, backend từ chối với HTTP 400 và không chuyển nguồn sang CTV khác.
- Backend tự giải quyết `affiliate_code` thành `affiliate_id` thật từ CSDL Supabase, tuyệt đối không tin cậy `affiliate_id` do client truyền.
- Chính sách bảo hộ 90 ngày: Khi số điện thoại đã tồn tại trong vòng 90 ngày, backend đánh dấu `is_duplicate = true` và **bảo toàn nguyên vẹn `affiliate_id` của CTV ban đầu**.

---

## 3. Danh sách tệp đã tạo & sửa đổi

| STT | Tệp tin | Nội dung thay đổi |
| :--- | :--- | :--- |
| 1 | `/src/components/public/PublicCourseDetailPage.tsx` | **[Tạo mới]** Component trang chi tiết khóa học công khai độc lập theo thiết kế TTL.png, header logo/hotline 1800558827, 2 cột responsive, cuộn tự nhiên, tích hợp form tư vấn khóa cứng. |
| 2 | `/src/components/public/LeadConsultationForm.tsx` | Bổ sung prop `lockCourse?: boolean`, hiển thị ngành học cố định khi xem từ trang khóa học, chặn đổi nhầm khóa. |
| 3 | `/src/components/public/PublicHome.tsx` | Loại bỏ `useEffect` tự động mở modal khi có tham số `course`, bổ sung prop `onViewCourseDetail` chuyển hướng mượt mà sang `/?course=...`. |
| 4 | `/src/App.tsx` | Loại bỏ redirect cũ sang `/catalog`. Thêm state `courseSlugParam`. Đồng bộ `navigate` và `popstate`. Chuyển hướng link cũ `/catalog?ref=...&course=...` về `/?ref=...&course=...`. Render `PublicCourseDetailPage` trên `/` khi có `course`. Ẩn footer chung khi ở trang chi tiết riêng biệt. |
| 5 | `/src/services/api.ts` | Cập nhật hàm `getPublicCourse(slug)` mã hóa an toàn slug qua `encodeURIComponent`. |
| 6 | `/server.ts` | Mở rộng `GET /api/v1/public/courses/:slug` hỗ trợ tra cứu linh hoạt theo `slug`, `code` hoặc `id` UUID; bảo đảm trả về đúng khóa học đang công khai. |
| 7 | `/docs/CTV_C1_4_REFERRAL_QR.md` | Tài liệu báo cáo kỹ thuật chi tiết phân hệ C1.4. |
| 8 | `/docs/PROJECT_NOTE.md` | Cập nhật tổng thể tiến độ và biên bản nghiệm thu C1.4. |

---

## 4. Kết quả kiểm tra thực tế (Verification Results)

1. **Kiểm tra biên dịch & Lint:**
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **Build succeeded 100%**.
2. **Kiểm tra API dữ liệu khóa học thật:**
   - `GET /api/v1/public/courses/ba-13e2`: Trả về đúng khóa học **"Bánh Âu"** (Mã: `BA`, slug: `ba-13e2`, học phí: `13.000.000 ₫`, đầy đủ lịch khai giảng và ảnh đại diện thật từ Supabase Storage).
   - `GET /api/v1/public/courses/quan-tri-khach-san-khu-nghi-duong`: Trả về đúng khóa Quản trị Khách sạn.
   - `GET /api/v1/public/courses/khoa-hoc-khong-ton-tai`: Trả về HTTP 404 `{"success":false,"error":"Không tìm thấy khóa học"}`.
3. **Kiểm tra gửi form tư vấn tuyển sinh (`POST /api/v1/public/leads`):**
   - Thiếu chấp thuận Nghị định 13: Bị từ chối với HTTP 400.
   - Mã giới thiệu của CTV bị tạm ngưng (`STHCCTV3033` - `SUSPENDED`): Bị từ chối với HTTP 400 (`AFFILIATE_SUSPENDED`), không chuyển nguồn sang CTV khác.
   - Mã giới thiệu chưa kích hoạt (`STHCCTV9001` - `PENDING_REVIEW`): Bị từ chối với HTTP 400 (`AFFILIATE_NOT_ACTIVE`).
   - Mã giới thiệu CTV hoạt động (`STHCCTV6993` - `ACTIVE`): Tiếp nhận thành công, sinh mã hẹn `STHC-TS-643399`. Kiểm tra bản ghi CSDL Supabase: lưu chính xác `affiliate_id: "d12347a4-ebc1-402b-b4e7-763eb6127c07"` và `course_id: "13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1"`.
   - Nộp lại form với cùng số điện thoại và mã giới thiệu khác (`STHCCTV3042`): Tiếp nhận thành công. Kiểm tra bản ghi CSDL Supabase: ghi nhận `is_duplicate: true`, lý do trùng lặp 90 ngày, và **giữ nguyên vẹn `affiliate_id` của CTV ban đầu (`d12347a4-...`)**, ngăn chặn hành vi cướp nguồn.
   - Dọn dẹp an toàn các bản ghi thử nghiệm sau khi xác thực.
4. **Kiểm tra điều hướng:**
   - Truy cập `/?ref=STHCCTV1088&course=ba-13e2`: Giữ nguyên URL trên thanh địa chỉ, hiển thị trực tiếp trang Bánh Âu, không có modal popup, không yêu cầu đăng nhập.
   - Tải lại trang (F5): Giữ nguyên trang chi tiết Bánh Âu.
   - Truy cập `/`: Hiển thị trang chủ giới thiệu CTV bình thường.
   - Truy cập `/?ref=STHCCTV1088`: Hiển thị trang chủ giới thiệu CTV với mã giới thiệu được lưu trong `localStorage`.
   - Cổng quản trị `/admin` và cổng CTV `/portal` vẫn hoạt động độc lập và bình thường.
