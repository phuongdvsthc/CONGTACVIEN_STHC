# ĐẶC TẢ BỐ CỤC VÀ BỘ LỌC TỔNG QUAN QUẢN TRỊ ADMIN / STAFF (A9.4)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_4_ADMIN_DASHBOARD_LAYOUT_FILTER_SPEC.md`  
**Thời điểm lập**: 2026-10-07  
**Căn cứ kỹ thuật**: 
- `/docs/A9_1_ADMIN_DASHBOARD_AUDIT_REPORT.md` (Báo cáo kiểm kê hiện trạng A9.1).
- `/docs/A9_2_ADMIN_DASHBOARD_METRICS_SPEC.md` (Đặc tả chỉ số & cách tính A9.2).
- `/docs/A9_3_ADMIN_STAFF_ACCESS_SPEC.md` (Đặc tả phân quyền Admin/Staff A9.3).
**Mục tiêu**: Chốt toàn diện cấu trúc 6 khối giao diện, bảng Wireframe bố cục chi tiết, cơ chế bộ lọc đa chiều, ma trận tác động bộ lọc, ánh xạ điều hướng liên kết và các trạng thái phản hồi giao diện.

---

## QUYẾT ĐỊNH ĐIỀU CHỈNH PHẠM VI QUAN TRỌNG (A9.4)
**BỎ HOÀN TOÀN KHỐI "HOẠT ĐỘNG QUẢN TRỊ GẦN ĐÂY" (AUDIT LOGS) KHỎI DASHBOARD A9 ĐỐI VỚI CẢ ADMIN VÀ STAFF.**
- **Không** render bảng nhật ký kiểm toán hoặc bất kỳ khung placeholder nào trên Dashboard A9.
- **Không** đưa trường `recent_audits` vào hợp đồng API dữ liệu `GET /api/v1/admin/dashboard/summary`.
- **Bảo toàn nguyên vẹn** module Nhật ký hệ thống chuyên biệt tại `/admin/audit` (dành riêng cho Admin) và cơ chế ghi `audit_logs` tự động của toàn bộ các nghiệp vụ A1–A7.
- **Lý do điều chỉnh**: Tối ưu hóa không gian màn hình Tổng quan cho các chỉ số tuyển sinh, tiến độ xử lý và thù lao; tránh dư thừa thông tin kiểm toán chuyên sâu trên trang chủ quản trị. Quyết định này thay thế nội dung đề cập đến khối nhật ký trong các tài liệu A9.1, A9.2 và A9.3.

---

## MỤC LỤC
1. [Nguyên Tắc Bố Cục & Không Gian Thiết Kế](#1-nguyên-tắc-bố-cục--không-gian-thiết-kế)
2. [Thứ Tự & Cấu Trúc 6 Khối Giao Diện](#2-thứ-tự--cấu-trúc-6-khối-giao-diện)
3. [Bảng Mô Tả Bố Cục & Wireframe Trực Quan](#3-bảng-mô-tả-bố-cục--wireframe-trực-quan)
4. [Đặc Tả Bộ Lọc Tuyển Sinh Đa Chiều](#4-đặc-tả-bộ-lọc-tuyển-sinh-đa-chiều)
5. [Ma Trận Tác Động Của Bộ Lọc Lên Từng Khối Dữ Liệu](#5-ma-trận-tác-động-của-bộ-lọc-lên-từng-khối-dữ-liệu)
6. [Hành Vi Tương Tác Của Bộ Lọc (Áp Dụng, Đặt Lại, Tải Lại)](#6-hành-vi-tương-tác-của-bộ-lọc-áp-dụng-đặt-lại-tải-lại)
7. [Ánh Xạ Điều Hướng Từ Chỉ Số Sang Các Màn Hình Chuyên Biệt](#7-ánh-xạ-điều-hướng-từ-chỉ-số-sang-các-màn-hình-chuyên-biệt)
8. [Quy Tắc Hiển Thị Bố Cục Theo Quyền Hạn](#8-quy-tắc-hiển-thị-bố-cục-theo-quyền-hạn)
9. [Các Trạng Thái Giao Diện & Thiết Kế Đáp Ứng (Responsive)](#9-các-trạng-thái-giao-diện--thiết-kế-đáp-ứng-responsive)
10. [Tổng Hợp Bàn Giao & Lộ Trình Triển Khai Tiếp Theo](#10-tổng-hợp-bàn-giao--lộ-trình-triển-khai-tiếp-theo)

---

## 1. Nguyên Tắc Bố Cục & Không Gian Thiết Kế

1. **Tích hợp giao diện quản trị dùng chung**:
   - Sử dụng thống nhất hệ thống Header, Sidebar và thẻ bao bọc `<main>` của `AppLayout.tsx`.
   - Route `/admin` sẽ render trực tiếp component `AdminDashboardView.tsx` (sẽ được xây dựng ở bước A9.6).
2. **Tiêu đề tinh gọn, không banner chiếm dụng diện tích**:
   - Tiêu đề trang: **“Tổng quan quản trị”**.
   - Dòng mô tả ngắn gọn: *“Theo dõi tuyển sinh, mạng lưới cộng tác viên và thù lao trong hệ thống.”*
   - **Tuyệt đối không** sử dụng banner chào mừng lớn, không dùng ảnh nền đồ họa hoặc khối trang trí cồng kềnh ở đầu trang để đảm bảo số liệu được đẩy lên vùng nhìn thấy đầu tiên (Above the fold).
3. **Quy tắc nhận diện thương hiệu động**:
   - Tuyệt đối **không ghi cứng** tên trường, logo hay tên viết tắt hệ thống. Toàn bộ tên hệ thống lấy từ context động `useSystemBranding()` (`system_short_name`).
4. **Bố cục co giãn tự động theo quyền**:
   - Khi tài khoản Staff thiếu quyền `rewards.summary`, khối thù lao và Top 5 CTV tự động ẩn hoàn toàn. Bố cục các khối còn lại tự co giãn mạch lạc, **không để lại khoảng trắng thừa** hoặc banner xin cấp quyền làm gián đoạn trải nghiệm.
5. **Đặc tính chỉ đọc và điều hướng (Read-Only & Navigational)**:
   - Dashboard A9 là trung tâm thông tin chỉ đọc và điều hướng nhanh; **không** chứa các nút bấm thực hiện duyệt hồ sơ CTV, xác nhận nhập học, duyệt thù lao hoặc hủy trực tiếp trên dashboard. Mọi thao tác đều điều hướng sang trang chuyên biệt với bộ lọc tương ứng.

---

## 2. Thứ Tự & Cấu Trúc 6 Khối Giao Diện

Bố cục màn hình Tổng quan quản trị A9 gồm đúng **6 khối chức năng** theo thứ tự từ trên xuống dưới:

### Khối 1 — Tiêu Đề, Bộ Lọc & Thanh Thao Tác
- **Tiêu đề**: `Tổng quan quản trị` (H1, font-bold, text-slate-900).
- **Mô tả**: `Theo dõi tuyển sinh, mạng lưới cộng tác viên và thù lao trong hệ thống.` (text-sm, text-slate-500).
- **Khối bộ lọc**: Dropdown chọn Kỳ thời gian, Dropdown chọn Khóa học, Combobox tìm kiếm CTV, ô chọn Từ ngày / Đến ngày (khi chọn Tùy chọn).
- **Thanh nút thao tác**: Nút **“Áp dụng”** (Primary Navy), Nút **“Đặt lại”** (Outline Slate), Nút **“Tải lại dữ liệu”** (Icon xoay RotateCcw).
- **Mốc thời gian**: Dòng chữ nhỏ hiển thị thời điểm cập nhật thành công gần nhất: `Cập nhật lúc: [HH:mm:ss DD/MM/YYYY] (Giờ Việt Nam)`.

### Khối 2 — Kết Quả Tuyển Sinh Trong Kỳ
- **Phạm vi hiển thị**: Thống kê theo nhóm thí sinh đăng ký trong kỳ được chọn.
- **Dòng tiêu đề phụ**: `Kết quả tuyển sinh` kèm badge `Nhóm đăng ký trong kỳ — trạng thái hiện tại`.
- **4 Thẻ chỉ số chính (Grid 4 cột trên Desktop)**:
  1. **Tổng lượt đăng ký** (`TS_TOTAL_LEADS`): Số lượng lớn, đơn vị *Lượt*, chú thích: *Toàn bộ lượt đăng ký trong kỳ*.
  2. **Chưa nhập học** (`TS_NOT_ENROLLED`): Số lượng lớn, màu Slate, chú thích: *Đang tư vấn hoặc chưa hoàn tất nhập học*.
  3. **Đã nhập học** (`TS_ENROLLED`): Số lượng lớn, màu Emerald, chú thích: *Xác nhận nhập học qua đối chiếu A4*.
  4. **Tỷ lệ nhập học** (`TS_ENROLL_RATE`): Tỷ lệ %, màu Blue, chú thích: *Đã nhập học / Tổng lượt đăng ký*.
- **Hàng thông tin bổ trợ (Sub-bar 3 thông số)**:
  - `Đã rút học: [N]` (Màu đỏ nhạt/Rose).
  - `Đã gắn mã EGOV: [N]` (Màu tím nhạt/Purple).
  - `Nguồn CTV hợp lệ: [N]` (Màu lam nhạt/Sky).

### Khối 3 — Mạng Lưới CTV & Công Việc Cần Xử Lý
- **Phạm vi hiển thị**: `Hiện tại — Toàn bộ thời gian` (Không bị bộ lọc kỳ che mất hồ sơ tồn đọng).
- **Phần 3A — Mạng lưới CTV (Cột trái)**:
  - Thẻ `Tổng CTV mạng lưới` (`CTV_TOTAL`).
  - Hàng phân rã 3 trạng thái: `Đang hoạt động: [N]` (Green), `Chờ duyệt: [N]` (Amber), `Tạm ngưng: [N]` (Red).
  - *Ghi chú rõ ràng*: Tài khoản CTV bị từ chối (`REJECTED`) hoặc tài khoản vô hiệu hóa (`is_active = false`) không tính vào đang hoạt động.
- **Phần 3B — Việc cần xử lý ngay (Cột phải)**:
  - Thẻ `Khách mới cần liên hệ` (`OP_NEW_LEADS`): Số lượng kèm badge nổi bật màu cam/amber nếu $> 0$, liên kết mở `/admin/leads?status=NEW`.
  - Thẻ `Hồ sơ chờ đối chiếu` (`OP_PENDING_RECON`): Số lượng hồ sơ chưa đối soát, liên kết mở `/admin/reconcile`.

### Khối 4 — Thù Lao Tuyển Sinh (Chỉ Admin hoặc Staff có `rewards.summary`)
- **Phạm vi hiển thị**: Khối tài chính tuyển sinh, tự động ẩn nếu không đủ quyền.
- **Dòng tiêu đề phụ**: `Thù lao cộng tác viên` kèm badge `Toàn hệ thống`.
- **3 Thẻ Thù lao chính (Grid 3 cột)**:
  1. **Thù lao chờ duyệt** (`REW_PENDING_ALL`): Tổng tiền VNĐ định dạng chuẩn (ví dụ `2.500.000 đ`) và số khoản (ví dụ `5 khoản`), icon Clock màu Amber, phạm vi: *Toàn bộ thời gian*.
  2. **Thù lao đã duyệt trong kỳ** (`REW_APPROVED_PERIOD`): Tổng tiền VNĐ và số khoản, icon CheckCircle màu Indigo, phạm vi: *Theo kỳ chọn*.
  3. **Tổng thù lao đã duyệt còn hiệu lực** (`REW_APPROVED_ALL`): Tổng tiền VNĐ và số khoản `APPROVED`, icon Award màu Emerald, phạm vi: *Toàn bộ thời gian*.
- **Dòng ghi chú chi trả**: Dòng chữ nhỏ dưới các thẻ: `* Thưởng đã duyệt không đồng nghĩa với đã thanh toán. Hệ thống hiện chưa có dữ liệu theo dõi chi trả tài chính.`

### Khối 5 — Hai Biểu Đồ Trực Quan (SVG Vector)
- **Biểu đồ 1 (Cột trái)**: `Xu hướng Đăng ký & Nhập học (12 tháng gần nhất)` — Biểu đồ cột đôi chuẩn SVG (Cột Đăng ký xanh dương, Cột Nhập học xanh ngọc), trục X 12 tháng tính đến tháng hiện tại theo giờ Việt Nam.
- **Biểu đồ 2 (Cột phải)**: `Phân bố Tuyển sinh theo Khóa học` — Biểu đồ thanh ngang nhóm (Lượt đăng ký & Đã nhập học) theo khóa học mà thí sinh đăng ký ban đầu.

### Khối 6 — Danh Sách Khách Gần Đây & Top CTV Nổi Bật
- **Phần 6A (Ưu tiên chiều rộng chính)**: `Khách hàng đăng ký gần đây` — Bảng 5 dòng mới nhất trong kỳ chọn, hiển thị Họ tên, SĐT đầy đủ (không che), Khóa học đăng ký, Mã CTV, Ngày đăng ký, Badge tiến độ tư vấn & nhập học, Nút "Xem chi tiết".
- **Phần 6B (Cột phụ bên cạnh hoặc bên dưới)**: `Top 5 CTV tiêu biểu` — Bảng vinh danh 5 CTV có tổng thù lao `APPROVED` cao nhất toàn thời gian (Chỉ hiển thị khi có quyền `rewards.summary`).

---

## 3. Bảng Mô Tả Bố Cục & Wireframe Trực Quan

### Bảng Mô Tả Cấu Trúc Khung Màn Hình (Grid & Component Layout)

| Khu vực / Hàng | Thành phần giao diện | Chiều rộng / Cột (Desktop) | Chiều rộng (Mobile) | Màu sắc & Kiểu dáng chủ đạo | Hành vi tương tác / Ghi chú |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Header Khối 1** | Tiêu đề trang + Mô tả ngắn + Thời điểm cập nhật | 100% (Full width) | 100% | Text slate-900 font-bold, text slate-500 | Hiển thị cố định đầu trang, không cuộn mất |
| **Bộ lọc Khối 1** | Form chọn Kỳ + Khóa học + CTV + Nút Áp dụng, Đặt lại, Tải lại | 100% (Flex/Wrap) | Xếp dọc (Stack) | Nền trắng, viền slate-200, Bo góc 12px, Shadow nhẹ | Bấm "Áp dụng" mới cập nhật số liệu |
| **Khối 2 — Card 1**| Thẻ "Tổng lượt đăng ký" (`TS_TOTAL_LEADS`) | 1/4 hàng (col-span-3) | 100% hoặc 50% | Nền trắng, viền slate-200, Icon Users xanh navy | Số to nổi bật `text-2xl font-bold` |
| **Khối 2 — Card 2**| Thẻ "Chưa nhập học" (`TS_NOT_ENROLLED`) | 1/4 hàng (col-span-3) | 100% hoặc 50% | Nền trắng, viền slate-200, Icon Clock slate-600 | Số to màu slate-700 |
| **Khối 2 — Card 3**| Thẻ "Đã nhập học" (`TS_ENROLLED`) | 1/4 hàng (col-span-3) | 100% hoặc 50% | Nền trắng, viền emerald-200, Icon CheckCircle2 emerald-600 | Số to màu emerald-700 |
| **Khối 2 — Card 4**| Thẻ "Tỷ lệ nhập học" (`TS_ENROLL_RATE`) | 1/4 hàng (col-span-3) | 100% hoặc 50% | Nền trắng, viền blue-200, Icon Percent blue-600 | Số % màu blue-700 hoặc "Chưa có dữ liệu" |
| **Khối 2 — Sub-bar**| Thanh 3 thông số phụ (Rút học, EGOV, Nguồn hợp lệ) | 100% (Flex gap-4) | Xếp dọc / Wrap | Nền slate-50, viền slate-200, Text-xs font-medium | Hiển thị phụ trợ ngay dưới 4 card |
| **Khối 3 — Cột 3A** | Card "Mạng lưới CTV" (`CTV_TOTAL` + 3 trạng thái) | 50% hàng (col-span-6) | 100% | Nền trắng, viền slate-200, Bo góc 16px | Chứa hàng badge Active / Pending / Suspended |
| **Khối 3 — Cột 3B** | Card "Công việc tồn đọng" (Lead mới + Chờ đối chiếu) | 50% hàng (col-span-6) | 100% | Nền trắng, viền slate-200, Bo góc 16px | Chứa 2 nút/box bấm chuyển sang Leads & Đối chiếu |
| **Khối 4 — Card 1**| Thẻ "Thù lao chờ duyệt" (`REW_PENDING_ALL`) | 1/3 hàng (col-span-4) | 100% | Nền amber-50/50, viền amber-200, Icon Clock amber-600 | Số tiền định dạng VNĐ + số khoản |
| **Khối 4 — Card 2**| Thẻ "Thù lao đã duyệt trong kỳ" (`REW_APPROVED_PERIOD`)| 1/3 hàng (col-span-4) | 100% | Nền indigo-50/50, viền indigo-200, Icon CheckCircle indigo-600| Số tiền theo kỳ chọn + số khoản |
| **Khối 4 — Card 3**| Thẻ "Tổng thù lao đã duyệt" (`REW_APPROVED_ALL`) | 1/3 hàng (col-span-4) | 100% | Nền emerald-50/50, viền emerald-200, Icon Award emerald-600 | Số tiền toàn thời gian + số khoản |
| **Khối 5 — Biểu đồ 1**| Biểu đồ SVG "Xu hướng 12 tháng ĐK & Nhập học" | 50% hàng (col-span-6) | 100% | Nền trắng, viền slate-200, Bo góc 16px, Padding 20px | Biểu đồ cột đôi + Bảng thu gọn số liệu |
| **Khối 5 — Biểu đồ 2**| Biểu đồ SVG "Phân bố theo Khóa học đăng ký" | 50% hàng (col-span-6) | 100% | Nền trắng, viền slate-200, Bo góc 16px, Padding 20px | Biểu đồ thanh ngang + Cuộn dọc nội bộ khi nhiều khóa |
| **Khối 6 — Danh sách 6A**| Bảng "5 Khách hàng đăng ký gần đây" | 65% hàng (col-span-8) | 100% | Nền trắng, viền slate-200, Bo góc 16px, Table responsive | SĐT đầy đủ, badge trạng thái, nút "Chi tiết" |
| **Khối 6 — Danh sách 6B**| Bảng "Top 5 CTV tiêu biểu" (Leaderboard) | 35% hàng (col-span-4) | 100% | Nền trắng, viền slate-200, Bo góc 16px, Huy chương Vàng/Bạc/Đồng| Chỉ hiện khi có quyền `rewards.summary` |

---

## 4. Đặc Tả Bộ Lọc Tuyển Sinh Đa Chiều

### 4.1 Chi tiết 4 trường lọc
1. **Kỳ thời gian (`period`)**:
   - Các giá trị chọn nhanh:
     - `THIS_MONTH` (Mặc định): Từ ngày 1 đầu tháng hiện tại đến hết ngày cuối tháng hiện tại (giờ VN).
     - `LAST_MONTH`: Toàn bộ tháng trước liền kề (giờ VN).
     - `THIS_YEAR`: Từ ngày 01/01 đến hết 31/12 của năm hiện tại (giờ VN).
     - `ALL_TIME`: Toàn bộ thời gian lịch sử từ trước đến nay.
     - `CUSTOM`: Cho phép nhập thủ công `from_date` và `to_date`.
2. **Từ ngày / Đến ngày (`from_date`, `to_date`)**:
   - Chỉ hiển thị trên giao diện khi người dùng chọn `Kỳ = Tùy chọn` (`CUSTOM`).
   - Validate bắt buộc: `from_date <= to_date`. Nếu người dùng chọn `from_date > to_date`, hiển thị thông báo lỗi ngay dưới ô nhập và vô hiệu hóa nút "Áp dụng".
3. **Khóa học (`course_id`)**:
   - Dropdown danh sách khóa học lấy từ CSDL: Bao gồm tất cả các khóa đang hoạt động (`ACTIVE`) và các khóa đã ngừng tuyển (`STOPPED`) để tra cứu lịch sử.
   - Mục mặc định: `Tất cả khóa học` (`course_id = 'ALL'`).
   - Có nhãn phân biệt nhẹ đối với khóa đã ngừng nhận đăng ký: `[Tên khóa] (Ngừng nhận ĐK)`.
4. **Cộng tác viên giới thiệu (`affiliate_id`)**:
   - Combobox tìm kiếm CTV theo Mã CTV hoặc Họ tên (Debounce 400ms, tra cứu server-side max 20 kết quả, không tải toàn bộ danh mục lớn vào trình duyệt).
   - Mục mặc định: `Tất cả CTV` (`affiliate_id = 'ALL'`).
   - Mục riêng biệt: `Không gắn CTV` (`affiliate_id = 'UNASSIGNED'` - ứng với `leads.affiliate_id IS NULL`).
   - Hỗ trợ chọn CTV đang tạm ngưng (`SUSPENDED`) hoặc CTV lịch sử nếu còn dữ liệu leads.

### 4.2 Cấu hình mặc định khi tải trang
- `period`: `THIS_MONTH` (Tháng này).
- `course_id`: `ALL` (Tất cả khóa học).
- `affiliate_id`: `ALL` (Tất cả CTV).

---

## 5. Ma Trận Tác Động Của Bộ Lọc Lên Từng Khối Dữ Liệu

| Khối giao diện / Chỉ số | Kỳ thời gian (`period`) | Khóa học (`course_id`) | CTV (`affiliate_id`) | Phạm vi mặc định | Nhãn giải thích trên giao diện |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Khối 2: Kết quả tuyển sinh (4 Card chính)** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | Tháng này, Tất cả khóa, Tất cả CTV | `Nhóm đăng ký trong kỳ — trạng thái hiện tại` |
| **Khối 2: Hàng thông tin phụ (EGOV, Rút học, Nguồn)**| **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | Tháng này, Tất cả khóa, Tất cả CTV | `Bổ trợ kết quả kỳ chọn` |
| **Khối 3A: Mạng lưới CTV (`CTV_TOTAL`, Trạng thái)** | **KHÔNG** | **KHÔNG** | **KHÔNG** | Toàn bộ thời gian, Toàn hệ thống | `Mạng lưới CTV — Toàn bộ thời gian` |
| **Khối 3B: Việc cần xử lý (Lead mới, Chờ đối chiếu)** | **KHÔNG** | **KHÔNG** | **KHÔNG** | Hiện tại, Toàn bộ thời gian | `Tồn đọng hiện tại — Toàn bộ thời gian` |
| **Khối 4: Thù lao chờ duyệt (`REW_PENDING_ALL`)** | **KHÔNG** | **KHÔNG** | **KHÔNG** | Toàn bộ thời gian, Toàn hệ thống | `Chờ duyệt — Toàn bộ thời gian` |
| **Khối 4: Thù lao đã duyệt kỳ này (`REW_APPROVED_PERIOD`)**| **CÓ TÁC ĐỘNG** | **KHÔNG** | **KHÔNG** | Theo kỳ chọn, Toàn hệ thống | `Đã duyệt trong kỳ — Toàn hệ thống` |
| **Khối 4: Tổng thù lao đã duyệt (`REW_APPROVED_ALL`)** | **KHÔNG** | **KHÔNG** | **KHÔNG** | Toàn bộ thời gian, Toàn hệ thống | `Tổng đã duyệt — Toàn bộ thời gian` |
| **Khối 5: Biểu đồ 12 tháng Đăng ký & Nhập học** | **KHÔNG** (Cố định 12T) | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | 12 tháng gần nhất, Lọc theo Khóa/CTV | `12 tháng gần nhất (Giờ Việt Nam)` |
| **Khối 5: Biểu đồ Phân bố Khóa học** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | Theo kỳ chọn, Khóa học đăng ký ban đầu | `Phân bố tuyển sinh theo khóa đăng ký` |
| **Khối 6A: 5 Khách hàng đăng ký gần đây** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | **CÓ TÁC ĐỘNG** | 5 lead mới nhất thuộc tập lọc | `Đăng ký gần đây trong kỳ chọn` |
| **Khối 6B: Top 5 CTV tiêu biểu (Leaderboard)** | **KHÔNG** | **KHÔNG** | **KHÔNG** | Toàn bộ thời gian, Toàn hệ thống | `Top 5 CTV tiêu biểu — Toàn bộ thời gian` |

> **Quy tắc quan trọng về Khối Thù lao**: Số tiền thù lao chờ duyệt và tổng thù lao đã duyệt phản ánh nghĩa vụ tài chính toàn trường, **không bị lọc theo khóa học hoặc CTV của bộ lọc tuyển sinh** để tránh hiểu lầm rằng trường chỉ còn nợ thù lao cho một khóa học duy nhất.

---

## 6. Hành Vi Tương Tác Của Bộ Lọc (Áp Dụng, Đặt Lại, Tải Lại)

1. **Phân biệt State Đang chỉnh sửa (Draft) và State Đã áp dụng (Applied)**:
   - Khi người dùng thay đổi lựa chọn trong các dropdown/combobox, hệ thống **chưa tự động gửi request API ngay**.
   - Chỉ khi người dùng bấm nút **“Áp dụng”**, state đã áp dụng mới được cập nhật và kích hoạt gọi API `GET /api/v1/admin/dashboard/summary`.
2. **Nút “Đặt lại” (Reset)**:
   - Đưa toàn bộ form lọc về cấu hình mặc định (`THIS_MONTH`, `course_id = 'ALL'`, `affiliate_id = 'ALL'`).
   - Tự động kích hoạt áp dụng ngay và tải lại dữ liệu theo cấu hình mặc định.
3. **Nút “Tải lại dữ liệu” (Refresh / RotateCcw)**:
   - Giữ nguyên 100% bộ lọc đang được áp dụng hiện tại.
   - Gửi request mới lên máy chủ để làm mới số liệu và kiểm tra lại quyền hiệu lực thời gian thực.
4. **Đồng bộ tham số lên URL (Query String Sync)**:
   - Khi bấm "Áp dụng", các tham số được lưu lên URL trình duyệt: `?period=THIS_MONTH&course_id=ALL&affiliate_id=ALL`.
   - Giúp người dùng có thể chia sẻ link, tải lại trang (F5) hoặc bấm nút Back/Forward mà vẫn bảo toàn đúng bộ lọc đang xem.
5. **Chống xung đột phản hồi bất đồng bộ (Race Condition Protection)**:
   - Sử dụng `AbortController` hoặc `Request Sequence Counter` để hủy hoặc bỏ qua response của request cũ nếu người dùng thao tác áp dụng bộ lọc liên tiếp.

---

## 7. Ánh Xạ Điều Hướng Từ Chỉ Số Sang Các Màn Hình Chuyên Biệt

| Thẻ chỉ số / Nút bấm trên A9 | Đường dẫn đích (Target Route) | Tham số URL truyền sang (Query Params) | Điều kiện quyền đích | Khả năng hỗ trợ của trang đích hiện tại |
| :--- | :--- | :--- | :--- | :--- |
| **Thẻ "Tổng lượt đăng ký"** | `/admin/leads` | `?from_date=...&to_date=...&course_id=...&affiliate_id=...` | Staff / Admin | Đã hỗ trợ đầy đủ bộ lọc |
| **Thẻ "Chưa nhập học"** | `/admin/leads` | `?admission_status=NOT_ENROLLED&from_date=...&to_date=...` | Staff / Admin | Đã hỗ trợ lọc `admission_status` |
| **Thẻ "Đã nhập học"** | `/admin/leads` | `?admission_status=ENROLLED&from_date=...&to_date=...` | Staff / Admin | Đã hỗ trợ lọc `admission_status` |
| **Nút "Khách mới cần liên hệ"** | `/admin/leads` | `?status=NEW` (Toàn bộ thời gian) | Staff / Admin | Đã hỗ trợ lọc `status=NEW` |
| **Nút "Hồ sơ chờ đối chiếu"** | `/admin/reconcile` | Không truyền ngày (Toàn bộ thời gian tồn đọng) | Staff / Admin | Đã hỗ trợ màn hình đối chiếu A4 |
| **Thẻ "CTV chờ duyệt"** | `/admin/affiliates` | `?status=PENDING_REVIEW` | Staff / Admin | Đã hỗ trợ lọc `status=PENDING_REVIEW` |
| **Thẻ "CTV đang hoạt động"** | `/admin/affiliates` | `?status=ACTIVE` | Staff / Admin | Đã hỗ trợ lọc `status=ACTIVE` |
| **Thẻ "Thù lao chờ duyệt"** | `/admin/rewards` | `?status=PENDING_APPROVAL` | Yêu cầu `rewards.view` | Đã hỗ trợ lọc `status=PENDING_APPROVAL` (Chỉ hiện nút khi có quyền `rewards.view`) |
| **Thẻ "Thù lao đã duyệt kỳ này"**| `/admin/rewards` | `?status=APPROVED&created_from=...&created_to=...` | Yêu cầu `rewards.view` | Đã hỗ trợ lọc `status=APPROVED` và khoảng ngày |
| **Dòng trong bảng Khách gần đây** | `/admin/leads/:id` | Đường dẫn chi tiết trực tiếp | Staff / Admin | Đã hỗ trợ màn hình `AdminLeadDetailView` |

---

## 8. Quy Tắc Hiển Thị Bố Cục Theo Quyền Hạn

### 8.1 Trường hợp 1: Quản trị viên (`role = 'admin'`)
- Hiển thị đầy đủ **100% cả 6 khối chức năng**.
- Khối thù lao hiển thị đủ 3 thẻ tiền và số khoản.
- Khối Top 5 CTV hiển thị đầy đủ danh sách vinh danh.

### 8.2 Trường hợp 2: Cán bộ tuyển sinh có quyền quản lý thù lao (`rewards.summary` & `rewards.view`)
- Hiển thị đầy đủ **Khối 1, Khối 2, Khối 3, Khối 4, Khối 5, Khối 6**.
- Có đầy đủ các nút bấm điều hướng sang `/admin/rewards`.

### 8.3 Trường hợp 3: Cán bộ tuyển sinh CHỈ CÓ `rewards.summary` (Không có `rewards.view`)
- Xem được số liệu tại **Khối 4 (Thù lao)** và **Khối 6B (Top 5 CTV)**.
- **Không có nút bấm / liên kết điều hướng sang `/admin/rewards`** (do thiếu quyền xem danh sách).

### 8.4 Trường hợp 4: Cán bộ tuyển sinh CHƯA ĐƯỢC GÁN QUYỀN THÙ LAO (Không có `rewards.summary`)
- **Khối 4 (Thù lao)** và **Khối 6B (Top 5 CTV)** tự động **ẩn hoàn toàn**.
- Bảng Khách hàng đăng ký gần đây (Khối 6A) tự động mở rộng chiếm toàn bộ chiều ngang (100% full width), tạo bố cục cân đối, liền mạch.
- Nếu Staff này có `rewards.view`, trên thanh menu sidebar vẫn có mục "Thù lao CTV" để bấm sang danh sách, nhưng trên Dashboard Tổng quan không hiển thị các thẻ tổng hợp tài chính.

---

## 9. Các Trạng Thái Giao Diện & Thiết Kế Đáp Ứng (Responsive)

### 9.1 Chi tiết 6 trạng thái giao diện (UI States)
1. **Trạng thái Tải lần đầu (Initial Loading)**:
   - Hiển thị Skeleton Loader xám nhạt (`animate-pulse`) cho các thẻ tuyển sinh, khối biểu đồ và danh sách.
   - Chưa render bất kỳ số liệu tài chính tạm nào.
2. **Trạng thái Đang áp dụng bộ lọc / Tải lại (Filtering / Refreshing)**:
   - Giữ nguyên giao diện hiện tại, hiển thị thanh tiến trình tải mỏng màu xanh trên đỉnh trang hoặc icon xoay tại nút bấm; không làm chớp giật layout.
3. **Trạng thái Có dữ liệu (Success)**:
   - Render đầy đủ các số liệu, biểu đồ SVG sắc nét, badge trạng thái có chữ rõ ràng (không chỉ dùng màu).
4. **Trạng thái Không có dữ liệu trong kỳ chọn (Empty State)**:
   - Các thẻ đếm hiển thị số `0`.
   - Thẻ Tỷ lệ nhập học hiển thị `"Chưa có dữ liệu"` (`text-slate-400`).
   - Khối biểu đồ hiển thị thông điệp nhẹ: *"Không có lượt đăng ký nào trong khoảng thời gian đã chọn."*
   - Bảng khách gần đây hiển thị thông báo rỗng kèm biểu tượng thân thiện.
5. **Trạng thái Lỗi kết nối / Lỗi máy chủ (Error State)**:
   - Hiển thị khung cảnh báo lỗi màu đỏ/rose kèm thông điệp giải thích tiếng Việt rõ ràng và nút **“Thử lại”** (Retry).
   - **Tuyệt đối không** biến lỗi hệ thống thành số `0`.
6. **Trạng thái Mất quyền / Phiên hết hạn (Session Expired / Permission Lost)**:
   - Tự động xóa sạch dữ liệu nhạy cảm cũ trên giao diện và hiển thị thông báo yêu cầu đăng nhập lại hoặc thông báo quyền đã thay đổi.

### 9.2 Quy chuẩn đáp ứng trên các kích thước màn hình (Responsive Breakpoints)
- **Desktop màn hình lớn ($\ge 1280px$)**: 4 Card tuyển sinh trên 1 hàng (4 cột); 2 Khối tồn đọng 2 cột; 3 Card thù lao 3 cột; 2 Biểu đồ đặt cạnh nhau (50% - 50%); Khách gần đây (65%) đặt cạnh Top CTV (35%).
- **Tablet / Laptop nhỏ ($768px - 1279px$)**: Thẻ tuyển sinh chuyển sang lưới 2 cột $\times$ 2 hàng; Biểu đồ và danh sách tự động xếp chồng theo chiều dọc (Stack vertical); Bộ lọc tự co giãn 2 hàng.
- **Mobile ($< 768px$)**: Toàn bộ các thẻ và khối xếp dọc 1 cột; Bảng danh sách hỗ trợ thanh cuộn ngang độc lập trong card (không làm tràn chiều ngang toàn trang web); Nút bấm hiển thị đầy đủ icon và nhãn chữ dễ bấm.

---

## 10. Tổng Hợp Bàn Giao & Lộ Trình Triển Khai Tiếp Theo

### 10.1 Các kết quả đã chốt 100% trong A9.4
1. **Loại bỏ Audit Logs**: Đã loại bỏ hoàn toàn khối nhật ký khỏi Dashboard A9 (giữ nguyên module `/admin/audit` độc lập).
2. **Thứ tự 6 khối**: Khối 1 (Tiêu đề & Bộ lọc) $\rightarrow$ Khối 2 (Tuyển sinh kỳ này) $\rightarrow$ Khối 3 (Mạng lưới CTV & Việc tồn đọng) $\rightarrow$ Khối 4 (Thù lao) $\rightarrow$ Khối 5 (Hai biểu đồ) $\rightarrow$ Khối 6 (Khách gần đây & Top CTV).
3. **Bộ lọc đa chiều**: Chốt cơ chế chọn Kỳ (mặc định Tháng này), Khóa học và CTV; đồng bộ URL query parameters; phân định rõ ma trận tác động độc lập giữa các khối.
4. **Wireframe & Responsive**: Chốt đầy đủ kích thước, màu sắc, bố cục co giãn thích ứng theo quyền và 6 trạng thái giao diện.

### 10.2 Lộ trình thực hiện các bước tiếp theo
- **A9.5A**: Xây dựng Backend API Service `getAdminDashboardSummaryData()` trong `server.ts` (tổng hợp tuyển sinh, khóa học, CTV, thù lao, 12 tháng, leaderboard theo A9.2 và A9.3).
- **A9.5B**: Xây dựng Backend Endpoint `GET /api/v1/admin/dashboard/summary` kèm kiểm soát phân quyền và xử lý bộ lọc.
- **A9.6**: Xây dựng Frontend Component `AdminDashboardView.tsx` và gắn vào route `/admin`.
- **A9.7A / A9.7B**: Hoàn thiện tích hợp 2 biểu đồ SVG và danh sách Khách gần đây / Top CTV.
- **A9.8A / A9.8B**: Tinh chỉnh responsive mobile, skeleton loading và tối ưu hiệu năng.
- **A9.9**: Kiểm thử tự động E2E toàn diện và nghiệm thu bàn giao toàn bộ Phân hệ A9.
