# BÁO CÁO CẬP NHẬT C1.3 — CHI TIẾT KHÓA HỌC TẠI /portal/courses/:courseId

- **Mã nhiệm vụ:** `STHC-CTV-C1.3-REFINED`
- **Phân hệ:** Cổng Cộng tác viên (Collaborator Portal) — Trang Chi tiết Khóa học (`/portal/courses/:courseId`)
- **Trạng thái:** Hoàn thành triển khai, kiểm tra build/lint 100%, bảo toàn dữ liệu nghiệp vụ.
- **Ngày cập nhật:** 02/10/2026

---

## 1. Sắp Xếp Lại Thông Tin Đầu Trang (Hero Section)
- **Loại bỏ Khoa đào tạo:** Đã xóa bỏ hoàn toàn nhãn, card và thông tin trường `department` khỏi trang chi tiết khóa học.
- **Đưa "Hệ đào tạo" và "Nhóm nghề" lên đầu:**
  - Hai badge/card "Hệ đào tạo" (`degree_level`) và "Nhóm nghề" (`career_group`) được đặt ngay hàng đầu tiên của khối thông tin, nằm phía trên tên khóa học.
  - "Nhóm nghề" lấy từ CSDL chuẩn Admin A2 (`public.courses.career_group`), đồng nhất với danh sách C1.2. Khóa học chưa được gán nhóm nghề hiển thị badge `"Chưa phân nhóm"` (`bg-slate-100 text-slate-600 border-slate-200`).
  - Mã khóa học (`#{course.code}`) được giữ lại và hiển thị rõ ràng, tách bạch ở góc phải hàng đầu.
- **Ba card thông số phía dưới tên & mô tả:**
  1. **Thời gian đào tạo:** Hiển thị thời lượng (`duration_text`), icon `Clock`.
  2. **Học phí:** Hiển thị số tiền ước tính định dạng chuẩn tiền tệ Việt Nam (`13.000.000 đ`) với `whitespace-nowrap` và khoảng trắng không ngắt dòng `\u00A0đ`.
  3. **Đã đăng ký:** Hiển thị số lượng học viên đã đăng ký khóa học trên toàn hệ thống.
- **Bảo toàn:** Giữ nguyên ảnh đại diện (ảnh fallback xanh navy STHC `#0B1E3F` kèm biểu tượng vàng hoàng gia khi chưa có ảnh), mô tả tóm tắt và khối chính sách thưởng 500.000 đ/hồ sơ nhập học hợp lệ (kèm điều kiện đối soát/phê duyệt).

---

## 2. Card "Đã Đăng Ký" & Hợp Đồng Dữ Liệu Module Thống Kê
- **Quy tắc hiển thị:**
  - Hiện tại, hệ thống chưa có API/module thống kê đăng ký độc lập: Card hiển thị giá trị **`—`** và kèm dòng chú thích rõ ràng **`Chưa cập nhật`**.
  - Khi module thống kê hoàn thành và API trả về số lượng: hiển thị định dạng `[số lượng] Đã đăng ký` (ví dụ: `15 Đã đăng ký`), kèm chú thích `Người đăng ký toàn hệ thống`.
  - Phân biệt minh bạch giữa việc "Chưa có nguồn thống kê" (`—`) và "Thực sự có 0 lượt đăng ký" (`0 Đã đăng ký`).
  - Không suy diễn số người đăng ký từ danh sách lead của riêng CTV, không đếm trùng lặp và không truy vấn toàn bộ dữ liệu khách hàng hệ thống trả về client.
- **Hợp đồng dữ liệu (Data Contract) cho Module Thống kê tiếp theo:**
  - **Trường dữ liệu:** `registered_count: number | null` (trong response của `GET /api/v1/affiliate/courses/:courseId`).
  - **Quy tắc đếm:** Tính tổng số lượng hồ sơ nhập học hợp lệ (`leads` có `reconciliation_status = 'MATCHED_VALID'`) theo từng `course_id`, áp dụng khử trùng lặp theo mã định danh duy nhất (CCCD/CMND hoặc SĐT của người học) trên toàn trường STHC.

---

## 3. Mã QR Tuyển Sinh Trong Section "Link Giới Thiệu Khóa Học"
- **Hiển thị trực tiếp:** Mã QR được tạo và hiển thị trực tiếp bên trong section link tiếp thị của khóa học đang xem, không bắt buộc phải bật modal pop-up.
- **Dữ liệu đồng nhất:** Dùng chính xác `referral_url` cá nhân hóa của CTV (`/?ref=${code}&course=${slug}`). Link hiển thị, link sao chép, mã QR hiển thị và file tải về giải mã ra cùng một liên kết duy nhất.
- **Nút tải ảnh QR:** Bổ sung nút **"Tải ảnh QR (PNG)"** tiện lợi, tự động đặt tên file chuẩn `STHC-QR-{affiliate_code}-{course_code}.png`.
- **Bố cục Responsive:**
  - **Máy tính (Desktop):** Phân 2 cột cân đối — khối liên kết, nút sao chép và các nút chia sẻ mạng xã hội ở bên trái; khối hiển thị mã QR và nút tải PNG ở bên phải (`w-56`).
  - **Điện thoại (Mobile):** Tự động xếp chồng thành 1 cột mượt mà, tối ưu thao tác ngón tay, không gây tràn ngang.
- **Xử lý lỗi:** Kiểm tra định dạng URL hợp lệ trước khi tạo QR; hiển thị cảnh báo trực quan nếu link không hợp lệ.

---

## 4. Bộ Nút Chia Sẻ Mạng Xã Hội (Zalo, Facebook, Mail)
- **Thiết kế giao diện:**
  - Bổ sung dòng nhãn `"Chia sẻ qua:"` kèm 3 nút tròn bo góc kích thước đồng nhất `w-9 h-9`.
  - **Chỉ hiển thị icon chuẩn:** Zalo, Facebook, Mail (tuyệt đối không hiển thị text tên nền tảng trên nút).
  - Có đầy đủ thuộc tính `title` (tooltip khi rê chuột) và `aria-label` hỗ trợ người dùng và trợ năng (Accessibility).
- **Chức năng chi tiết:**
  1. **Facebook:** Mở hộp thoại chia sẻ chính thức qua URL `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}` trong cửa sổ popup an toàn (`noopener,noreferrer`).
  2. **Mail:** Kích hoạt trình soạn thảo email qua `mailto:` với tiêu đề `Giới thiệu khóa học: [Tên khóa] - STHC` và nội dung email chứa tên khóa, mã khóa và referral link. Không đặt sẵn người nhận để CTV tự do gửi cho ứng viên.
  3. **Zalo:** Sử dụng liên kết Web Share Plugin chính thức của Zalo: `https://sp.zalo.me/plugins/share?href=${encodeURIComponent(referralUrl)}`.
  - **Cấu hình Zalo còn thiếu (Ghi chú kỹ thuật):** Để Zalo hiển thị đầy đủ thẻ OpenGraph (ảnh đại diện, mô tả khóa học) khi người dùng chia sẻ lên Zalo Feed/Chat, Nhà trường cần cấu hình Zalo Official Account ID (`data-oaid`) hoặc đăng ký Zalo App ID trên portal `developers.zalo.me` và xác thực domain triển khai.

---

## 5. Hiển Thị Đúng Định Dạng Nội Dung Đã Soạn (HTML & Markdown)
- **Bộ xử lý nội dung:** Kết hợp thư viện `marked` (cấu hình `gfm: true`, `breaks: true`) và hàm bảo mật `sanitizeHtml`.
- **Khả năng tương thích:**
  - Nếu nội dung lưu dạng HTML (như các khóa trung cấp cũ `<p>...`): Giữ nguyên vẹn các thẻ HTML hợp lệ sau khi loại bỏ script/event handlers nguy hiểm.
  - Nếu nội dung soạn thảo dạng Markdown hoặc văn bản thuần có xuống dòng (như khóa Bánh Âu `BA` chứa `\n\n`, emoji, danh sách có thứ tự `1. 2. 3.`): Tự động render thành các đoạn văn `<p>` và danh sách `<ol><li>` chuẩn chỉnh, không bị dính chữ trên một dòng.
- **An toàn & Bố cục:**
  - Bảng biểu rộng có vùng cuộn ngang tự động (`[&_table]:overflow-x-auto`).
  - Ảnh minh họa tự co giãn, không vượt quá chiều rộng khối (`[&_img]:max-w-full`).
  - Liên kết dài được ngắt dòng an toàn (`break-all`), không làm vỡ layout trang.
- **Tiêu đề khối Đặc quyền:** Sử dụng tên khóa học hiện tại (`Đặc quyền học viên học khóa ${course.title}`), không bị gán cứng tên "Bánh Âu" khi xem các khóa học khác.

---

## 6. Xóa Bỏ Hoàn Toàn Section "Thông Tin Tuyển Sinh"
- Đã xóa toàn bộ section "Thông tin tuyển sinh" và cột phụ sidebar khỏi giao diện chi tiết CTV.
- Dọn dẹp sạch sẽ các component và icon không còn dùng (`Building`, `Calendar`).
- Phần nội dung chi tiết ("Giới thiệu chương trình" và "Đặc quyền sinh viên") mở rộng chiếm toàn bộ chiều rộng container, tối ưu không gian đọc và trình bày.
- Giữ nguyên vẹn toàn bộ schema CSDL và các trường Admin, không xóa dữ liệu gốc.

---

## 7. Kết Quả Kiểm Tra & Nghiệm Thu
- **Build & Lint:** Lệnh `compile_applet` và `npm run lint` đạt **100% PASS** (0 lỗi TypeScript, 0 lỗi cú pháp).
- **Kiểm tra khóa Bánh Âu (`BA`):**
  - Hệ đào tạo: "Ngắn hạn", Nhóm nghề: "Làm bánh", Mã: "#BA".
  - Nội dung mô tả với các biểu tượng emoji và các mốc lịch khai giảng được ngắt dòng mạch lạc thành từng đoạn văn riêng biệt.
  - Khối đặc quyền hiển thị danh sách 4 điều khoản dạng danh sách có số thứ tự rõ ràng.
- **Kiểm tra các khóa khác (ví dụ: `QTKS-TC-03`, `CBMA-TC-01`):**
  - Nhóm nghề hiển thị "Chưa phân nhóm" (nếu chưa gán).
  - Khối đặc quyền (nếu có) tự động mang tiêu đề theo tên khóa học tương ứng, không còn chữ "Bánh Âu".
- **Kiểm tra QR & Chia sẻ:**
  - QR Code hiển thị sắc nét với màu xanh navy STHC. Tải file PNG thành công, quét camera điện thoại mở chính xác URL tiếp thị của CTV.
  - Nút chia sẻ Zalo, Facebook, Mail kích hoạt đúng luồng và truyền URL đã được mã hóa an toàn.
- **Kiểm tra Responsive:**
  - Màn hình điện thoại: Giao diện xếp thành 1 cột dọc hài hòa, không tràn ngang, thanh điều hướng breadcrumb co giãn linh hoạt.
