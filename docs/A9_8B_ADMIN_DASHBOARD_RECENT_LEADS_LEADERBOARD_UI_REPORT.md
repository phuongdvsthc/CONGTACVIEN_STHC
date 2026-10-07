# BÁO CÁO TRIỂN KHAI GIAO DIỆN DANH SÁCH GẦN ĐÂY VÀ TOP CTV TỔNG QUAN QUẢN TRỊ (A9.8B)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_8B_ADMIN_DASHBOARD_RECENT_LEADS_LEADERBOARD_UI_REPORT.md`  
**Thời điểm hoàn thành**: 07/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% & ĐÃ ĐƯỢC KIỂM CHỨNG TỰ ĐỘNG**

---

### 1. Mục Tiêu & Phạm Vi Triển Khai Thực Tế

Thực hiện bước **A9.8B (Giao diện Danh sách gần đây & Top CTV)** theo đúng đặc tả `A9.4`, `A9.7B` và báo cáo backend `A9.8A`:
1. Bổ sung **Khối 6** vào component `AdminDashboardView.tsx`, ngay dưới 2 biểu đồ tuyển sinh (Khối 5):
   - **Khối 6A: Khách hàng đăng ký gần đây** (`recent_leads`): Tối đa 5 lượt đăng ký tư vấn mới nhất trong tập lọc tuyển sinh hiện tại (`period`, `course_id`, `affiliate_id`).
   - **Khối 6B: Top 5 CTV tiêu biểu** (`leaderboard`): Bảng vinh danh tối đa 5 CTV có tổng thù lao đã được phê duyệt cao nhất toàn hệ thống toàn thời gian (`SYSTEM_WIDE_ALL_TIME`).
2. Tái sử dụng trọn vẹn dữ liệu từ một request duy nhất `GET /api/v1/admin/dashboard/summary`, không gọi thêm request API summary hay API CTV riêng lẻ.
3. Phân tầng hiển thị giao diện theo quyền hạn (Role-based & Permission-based rendering):
   - Khi có quyền xem thù lao (`leaderboard.available = true`): Khối 6A chiếm 7/8 cột (`lg:col-span-7 xl:col-span-8`), Khối 6B chiếm 5/4 cột (`lg:col-span-5 xl:col-span-4`).
   - Khi không có quyền thù lao (`leaderboard.available = false`): Khối 6B tự động ẩn hoàn toàn, Khối 6A tự động mở rộng chiếm trọn 100% chiều ngang (`lg:col-span-12`), giao diện liền mạch, cân đối.
4. Hoàn thiện hệ thống liên kết điều hướng mượt mà, bảo toàn ngữ cảnh bộ lọc:
   - Dòng khách hàng và nút "Chi tiết" điều hướng trực tiếp đến `/admin/leads/:id` (`AdminLeadDetailView`).
   - Nút "Xem tất cả" điều hướng đến `/admin/leads` kèm đầy đủ tham số bộ lọc ngày, khóa học, CTV (`buildLeadsFilterQuery`).
   - Hàng Top CTV điều hướng đến `/admin/rewards?affiliate_id=...` (khi có quyền) hoặc `/admin/affiliates`.
5. Không đọc, không hiển thị bất kỳ nhật ký `audit_logs` hay thao tác duyệt/hủy trực tiếp trên Dashboard.

---

### 2. Chi Tiết Các Thành Phần Giao Diện Đã Triển Khai

#### 2.1 Khối 6A: Bảng Khách Hàng Đăng Ký Gần Đây
- **Tiêu đề & Nhãn phạm vi**:
  - Tiêu đề: *“Khách hàng đăng ký gần đây”* (Icon `Users` màu xanh dương).
  - Nhãn phạm vi: *“Trong kỳ và phạm vi đang chọn — tối đa 5 lượt mới nhất”*.
  - Huy hiệu số lượng: `${total_returned} lượt` (`bg-blue-50 text-blue-700`).
  - Nút chuyển hướng: *“Xem tất cả”* (Icon `ArrowUpRight`) dẫn đến `/admin/leads` kèm query params.
- **Cấu trúc bảng & Các cột dữ liệu**:
  1. **Khách hàng**: Họ và tên (`font-bold text-slate-900`) kèm SĐT đầy đủ không che (`font-mono text-slate-500` kèm icon `Phone`).
  2. **Khóa đăng ký**: Tên khóa học kèm huy hiệu mã khóa (`font-mono bg-slate-100 text-slate-600`).
  3. **CTV giới thiệu**: Tên CTV kèm mã CTV (`bg-blue-50 text-blue-700 font-mono`) hoặc nhãn *“Không qua CTV”* / *“Tự nhiên”* khi không gắn CTV.
  4. **Ngày đăng ký**: Định dạng chuẩn `DD/MM/YYYY HH:mm` theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) qua `formatVietnamDateTime`.
  5. **Tiến độ tư vấn**: Badge trạng thái rõ chữ:
     - `NEW`: *Mới tạo* (`bg-blue-50 text-blue-700 border-blue-200`)
     - `CONTACTED`: *Đã liên hệ* (`bg-amber-50 text-amber-700 border-amber-200`)
     - `CONSULTING`: *Đang tư vấn* (`bg-indigo-50 text-indigo-700 border-indigo-200`)
     - `UNREACHABLE`: *Không liên lạc được* (`bg-orange-50 text-orange-700 border-orange-200`)
     - `LOST`: *Không có nhu cầu* (`bg-slate-100 text-slate-600 border-slate-200`)
  6. **Tình trạng nhập học**: Badge trạng thái có thẩm quyền:
     - `ENROLLED`: *Đã nhập học* (`bg-emerald-50 text-emerald-700 border-emerald-200` kèm icon `CheckCircle2`)
     - `NOT_ENROLLED`: *Chưa nhập học* (`bg-slate-100 text-slate-600 border-slate-200`)
     - `WITHDRAWN`: *Đã rút học* (`bg-rose-50 text-rose-700 border-rose-200` kèm icon `X`)
  7. **Thao tác**: Nút *“Chi tiết”* (Icon `ChevronRight`) chuyển hướng trực tiếp đến `/admin/leads/:id`.
- **Trạng thái giao diện**:
  - `Loading`: Hiển thị 5 hàng Skeleton Loader xám nhạt (`animate-pulse`).
  - `Empty State`: Khung thông báo nhẹ nhàng: *“Không có lượt đăng ký nào trong khoảng thời gian và phạm vi đã chọn.”*
  - `Responsive`: Thẻ bọc có `overflow-x-auto`, hỗ trợ cuộn ngang độc lập trên thiết bị di động mà không vỡ bố cục tổng thể.

#### 2.2 Khối 6B: Bảng Vinh Danh Top 5 CTV Tiêu Biểu
- **Tiêu đề & Nhãn phạm vi**:
  - Tiêu đề: *“Top 5 CTV tiêu biểu”* (Icon `Trophy` vàng ấm).
  - Nhãn phạm vi: *“Toàn bộ thời gian — Toàn hệ thống”*.
  - Huy hiệu vinh danh: *“Vinh danh”* (`bg-amber-50 text-amber-800 border-amber-200/80` kèm icon `Award`).
  - Nút chuyển hướng (khi có quyền `rewards.view`): *“Xem danh sách CTV”* (Icon `ArrowUpRight`).
- **Thẻ xếp hạng CTV**:
  - **Hạng 1 (Gold)**: Khung viền vàng nổi bật (`bg-gradient-to-r from-amber-50/80 to-amber-100/30 border-amber-300/90`), huy hiệu rank 1 mạ vàng (`bg-gradient-to-br from-amber-400 to-amber-600 text-white`).
  - **Hạng 2 (Silver)**: Khung viền bạc sang trọng (`bg-slate-50/70 border-slate-200/90`), huy hiệu rank 2 bạc (`bg-gradient-to-br from-slate-400 to-slate-600 text-white`).
  - **Hạng 3 (Bronze)**: Khung viền đồng thanh lịch (`bg-orange-50/40 border-orange-200/80`), huy hiệu rank 3 đồng (`bg-gradient-to-br from-amber-700 to-amber-900 text-white`).
  - **Hạng 4 & 5**: Khung viền trung tính (`bg-white border-slate-200/70`), huy hiệu xám tinh tế (`bg-slate-100 text-slate-600`).
  - **Thông tin hiển thị**:
    - Tên CTV (`font-bold text-slate-900 truncate`).
    - Mã CTV (`font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded`).
    - Số lượng khoản đã duyệt: `${approved_reward_count} khoản duyệt`.
    - Số tiền thù lao đã duyệt: Định dạng VNĐ nổi bật (`text-emerald-700 font-mono font-extrabold`).
  - **Tương tác**: Bấm vào hàng CTV điều hướng mượt mà sang `/admin/rewards?affiliate_id=...` hoặc `/admin/affiliates`.
- **Trạng thái giao diện**:
  - `Loading`: 5 hàng Skeleton Loader.
  - `Empty State`: Khung thông báo: *“Chưa có CTV nào phát sinh thù lao đã duyệt.”*

---

### 3. Kết Quả Kiểm Chứng Tự Động & Build

1. **TypeScript Type Checking (`tsc --noEmit`)**:
   - Chạy lệnh kiểm tra cú pháp và kiểu dữ liệu: **0 lỗi**.
2. **Build Hệ Thống (`npm run build`)**:
   - Biên dịch Vite và Applet: **Thành công 100%**.
3. **Kiểm thử tích hợp dữ liệu thực tế (`/scripts/verify_a9_8b_ui_contract.ts`)**:
   - Admin Session: Trả về đầy đủ 5 lead gần đây (SĐT đầy đủ, khóa học, CTV, trạng thái) và Top CTV với số tiền thưởng duyệt chính xác.
   - Staff Session (không có quyền thù lao): `recent_leads` hoạt động bình thường, `leaderboard.available = false`, giao diện Khối 6B ẩn an toàn và Khối 6A mở rộng 100% chiều ngang.
   - Không xuất hiện bất kỳ lỗi gián đoạn nào trên giao diện.

---

### 4. Kết Luận & Chuyển Giao

Bước **A9.8B** đã hoàn thành 100% các mục tiêu về giao diện danh sách và điều hướng:
- Màn hình Tổng quan quản trị (`AdminDashboardView.tsx`) đã hoàn chỉnh trọn vẹn **cả 6 khối chức năng** theo đúng đặc tả A9.4.
- Đã kiểm tra và hoàn thiện toàn bộ luồng điều hướng, lọc đa chiều, phân quyền hiển thị, format thời gian và tiền tệ.
- Dừng lại theo đúng yêu cầu sau bước A9.8B; sẵn sàng bước vào giai đoạn kiểm thử tự động toàn diện và nghiệm thu phân hệ **A9.9**.
