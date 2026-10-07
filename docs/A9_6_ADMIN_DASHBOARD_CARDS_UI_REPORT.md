# BÁO CÁO TRIỂN KHAI GIAO DIỆN NỀN VÀ CÁC THẺ TỔNG HỢP ADMIN / STAFF (A9.6)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_6_ADMIN_DASHBOARD_CARDS_UI_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026 (Giờ Việt Nam: UTC+7)  
**Trạng thái**: **ĐÃ HOÀN THÀNH 100% VÀ KIỂM THỬ THÀNH CÔNG**

---

## 1. Tổng Quan & Phạm Vi Triển Khai Bước A9.6

Bước A9.6 hiện thực hóa giao diện nền và các khối thẻ chỉ số tổng hợp cho màn hình **Tổng quan Quản trị Admin / Staff** tại route `/admin`, kết nối trực tiếp với backend API `GET /api/v1/admin/dashboard/summary` đã hoàn thiện ở A9.5A và A9.5B.

### 1.1 Các Khối Giao Diện Đã Hoàn Thành
1. **Khối 1: Tiêu đề, Bộ lọc đa chiều & Thanh thao tác**:
   - Tiêu đề gọn gàng: `"Tổng quan quản trị"` cùng mô tả: *"Theo dõi tuyển sinh, mạng lưới cộng tác viên và thù lao trong hệ thống."*
   - Bộ lọc gồm 4 trường:
     - **Kỳ thời gian (`period`)**: Dropdown chọn `THIS_MONTH`, `LAST_MONTH`, `THIS_YEAR`, `ALL_TIME`, `CUSTOM`.
     - **Khoảng ngày tùy chọn (`from_date`, `to_date`)**: Tự động hiển thị khi chọn `CUSTOM`, có cơ chế kiểm tra `from_date <= to_date` chặn lỗi trực tiếp trên giao diện.
     - **Khóa học (`course_id`)**: Dropdown tải danh mục khóa học động từ CSDL với nhãn phân biệt khóa ngừng nhận ĐK.
     - **Cộng tác viên (`affiliate_id`)**: Combobox tìm kiếm CTV bất đồng bộ (Debounce 400ms, Server-side lookup max 20 kết quả, hỗ trợ tùy chọn `"Tất cả CTV"` và `"Không gắn CTV (Tự nhiên)"`).
   - Thanh nút thao tác: Nút **"Áp dụng"** (Navy), Nút **"Đặt lại"** (Reset về mặc định `THIS_MONTH`), Nút **"Tải lại dữ liệu"** (RotateCcw xoay tròn khi fetching).
   - Nhãn thời gian cập nhật thực tế: `Cập nhật lúc: [HH:mm:ss DD/MM/YYYY] (Giờ Việt Nam)`.
   - Cơ chế bảo vệ bất đồng bộ: `requestSeqRef` chống Race Condition và đồng bộ Query String lên URL.

2. **Khối 2: Kết quả Tuyển sinh trong kỳ**:
   - Header phụ kèm badge: `Nhóm đăng ký trong kỳ — trạng thái hiện tại`.
   - **4 Thẻ chỉ số chính**:
     - *Tổng lượt đăng ký*: Điều hướng sang `/admin/leads` giữ nguyên kỳ lọc.
     - *Chưa nhập học*: Điều hướng sang `/admin/leads?admission_status=NOT_ENROLLED`.
     - *Đã nhập học*: Điều hướng sang `/admin/leads?admission_status=ENROLLED`.
     - *Tỷ lệ nhập học*: Tỷ lệ % hoặc ký hiệu `—` khi chưa có dữ liệu.
   - **Thanh 3 thông số phụ**: Đã rút học (`withdrawn_leads`), Đã gắn mã EGOV (`egov_active_leads`), Nguồn CTV hợp lệ (`matched_valid_leads`).

3. **Khối 3: Mạng lưới CTV & Việc cần xử lý ngay**:
   - **3A (Mạng lưới CTV)**: Thống kê tổng số CTV toàn thời gian, phân rã 3 trạng thái Hoạt động (`ACTIVE`), Chờ duyệt (`PENDING_REVIEW`), Tạm ngưng (`SUSPENDED`). Bấm từng trạng thái điều hướng sang `/admin/affiliates?status=...`.
   - **3B (Việc cần xử lý ngay)**: Thống kê tồn đọng hiện tại:
     - Khách mới cần liên hệ (`new_leads_to_contact`), nổi bật badge cam nếu $> 0$, điều hướng sang `/admin/leads?status=NEW`.
     - Hồ sơ chưa đối chiếu nhập học (`pending_reconciliation_leads`), điều hướng sang `/admin/reconcile`.

4. **Khối 4: Thù lao tuyển sinh (Tài chính)**:
   - Tự động hiển thị khi `rewards.available === true` (Admin hoặc Staff có quyền `rewards.summary`).
   - **Tự động ẩn hoàn toàn, không để lại khoảng trắng hoặc lỗi** khi Staff thiếu quyền.
   - 3 Thẻ thù lao:
     - *Thù lao chờ duyệt*: Tổng tiền VNĐ và số khoản (Toàn thời gian). Điều hướng sang `/admin/rewards?status=PENDING_APPROVAL` (nếu có `rewards.view`).
     - *Thù lao đã duyệt trong kỳ*: Tổng tiền VNĐ và số khoản theo kỳ chọn. Điều hướng sang `/admin/rewards?status=APPROVED&created_from=...` (nếu có `rewards.view`).
     - *Tổng thù lao đã duyệt*: Tổng tiền VNĐ và số khoản còn hiệu lực toàn thời gian. Điều hướng sang `/admin/rewards?status=APPROVED` (nếu có `rewards.view`).
   - Dòng chú thích chi trả: `* Thưởng đã duyệt không đồng nghĩa với đã thanh toán. Hệ thống hiện chưa có dữ liệu theo dõi chi trả tài chính.`

5. **Tích hợp Routing & Layout**:
   - Tích hợp trực tiếp vào `AppLayout` qua `src/App.tsx`.
   - Khi truy cập `/admin` hoặc `/admin/`, hiển thị `AdminDashboardView`.
   - Giữ nguyên các route chuyên biệt khác (`/admin/affiliates`, `/admin/courses`, `/admin/leads`, `/admin/reconcile`, `/admin/rewards`, `/admin/audit`, `/admin/homepage`, `/admin/permissions`, `/admin/system-settings`).

---

## 2. Danh Sách Tệp Đã Tạo & Cập Nhật

| STT | Đường dẫn tệp | Loại thay đổi | Nội dung chi tiết |
| :---: | :--- | :---: | :--- |
| **1** | `/src/components/admin/AdminDashboardView.tsx` | **Tạo mới** | Component React hiển thị giao diện nền, bộ lọc, thẻ tuyển sinh, mạng lưới CTV, việc tồn đọng và thẻ thù lao. |
| **2** | `/src/App.tsx` | **Cập nhật** | Định tuyến `/admin` và `/admin/` render trực tiếp `AdminDashboardView`, chuyển các route con quản trị sang `AdminPortal`. |
| **3** | `/docs/PROJECT_NOTE.md` | **Cập nhật** | Bổ sung mục 59 ghi nhận hoàn thành A9.6. |
| **4** | `/docs/A9_6_ADMIN_DASHBOARD_CARDS_UI_REPORT.md` | **Tạo mới** | Báo cáo chi tiết nghiệm thu A9.6. |

---

## 3. Kết Quả Kiểm Thử & Nghiệm Thu

| STT | Kịch bản kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Build applet (`npm run build`) | Biên dịch thành công, 0 lỗi TypeScript | Build succeeded | **PASS** |
| **2** | Lint check (`tsc --noEmit`) | Không có cảnh báo hoặc lỗi cú pháp | Linting completed successfully | **PASS** |
| **3** | Truy cập route `/admin` | Render HTML giao diện Tổng quan quản trị | HTTP 200 text/html | **PASS** |
| **4** | Đăng nhập tài khoản Quản trị viên (`admin`) | Hiển thị đầy đủ Khối 1, Khối 2, Khối 3 và Khối 4 (Thù lao) | `rewards.available: true`, hiển thị đầy đủ 3 thẻ thù lao | **PASS** |
| **5** | Đăng nhập tài khoản Cán bộ Tuyển sinh (`staff`) | Hiển thị Khối 1, Khối 2, Khối 3; Khối 4 tự động ẩn an toàn | `rewards.available: false`, giao diện co giãn liền mạch | **PASS** |
| **6** | Bộ lọc kỳ thời gian & Nút Áp dụng | Thay đổi kỳ gửi request API chính xác, cập nhật URL search query | Query params được đồng bộ mượt mà | **PASS** |
| **7** | Combobox tìm kiếm CTV | Debounce 400ms, gợi ý CTV chính xác | Autocomplete hoạt động chuẩn xác | **PASS** |
| **8** | Điều hướng từ các thẻ chỉ số | Bấm thẻ mở đúng route đích (`/admin/leads`, `/admin/reconcile`, `/admin/affiliates`, `/admin/rewards`) | Tham số lọc được chuyển tiếp đầy đủ | **PASS** |

---

## 4. Kế Hoạch Bước Tiếp Theo

- **Bước A9.7A & A9.7B**: Xây dựng API và giao diện biểu đồ SVG trực quan (Xu hướng 12 tháng Đăng ký & Nhập học, Phân bố tuyển sinh theo Khóa học).
- **Bước A9.8A & A9.8B**: Xây dựng API và giao diện danh sách Khách hàng đăng ký gần đây và Bảng Top 5 CTV tiêu biểu.
- **Bước A9.9**: Nghiệm thu E2E toàn diện module A9.
