# BÁO CÁO KIỂM THỬ TOÀN DIỆN VÀ NGHIỆM THU E2E DASHBOARD CTV (C6.7)
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_7_DASHBOARD_ACCEPTANCE_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất nghiệm thu toàn diện phân hệ C6 (Tổng quan Dashboard CTV)
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHƯƠNG PHÁP KIỂM THỬ

### 1.1. Phạm vi nghiệm thu toàn diện
Kiểm tra chéo độc lập toàn bộ các thành phần trên trang Tổng quan `/portal` theo chuỗi các bước C6.1 – C6.6A:
1. **Banner chào mừng & Tiếp thị tuyển sinh:** Họ tên, trạng thái tài khoản, mã CTV, sao chép clipboard an toàn, mã QR tuyển sinh toàn danh mục (`/catalog?ref=[affiliate_code]`), modal xem lớn, tải file PNG và 2 nút thao tác nhanh (`/portal/courses`, `/portal/leads`).
2. **Khối 4 Card kết quả tuyển sinh:** Lượt đăng ký ghi nhận, Chưa nhập học, Đã nhập học, Hồ sơ đối chiếu hợp lệ.
3. **Khối 3 Card tổng hợp thưởng:** Thưởng chờ duyệt, Thưởng đã duyệt, Thưởng đã thanh toán (phân biệt giữa `0 đ` và `Chưa có dữ liệu`).
4. **Hai biểu đồ trực quan & Bảng "Xem số liệu":**
   - Biểu đồ 12 tháng liên tục theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
   - Biểu đồ phân bố theo toàn bộ các khóa học phát sinh dữ liệu.
5. **Khối Top 5 CTV nổi bật (C6.6A):** Xếp hạng theo thưởng đã duyệt, huy chương vinh danh, bảo mật thông tin nhạy cảm.
6. **Danh sách 5 đăng ký gần đây (C6.6):** Sắp xếp `created_at DESC, id DESC`, che 4 số cuối điện thoại, badge độc lập, liên kết chi tiết an toàn.

### 1.2. Môi trường và nguyên tắc an toàn dữ liệu
- **Nguyên tắc an toàn Production:** Toàn bộ truy vấn CSDL là truy vấn CHỈ ĐỌC (Read-Only). Tuyệt đối không tự ý chèn dữ liệu giả, không đổi vai trò tài khoản, không duyệt thưởng ảo trên môi trường dữ liệu thật.
- **Fixture Testing:** Sử dụng fixture độc lập trong `scripts/verify_c6_7_e2e_acceptance.ts` để kiểm thử các tình huống biên phức tạp (biên múi giờ UTC/VN, hồ sơ tái đối chiếu nhiều lần, CTV đồng hạng thưởng, tài khoản suspended/admin).

---

## II. BẢNG TỔNG HỢP KẾT QUẢ NGHIỆM THU CHI TIẾT

| Mã ca kiểm thử | Hạng mục kiểm tra | Kết quả kỳ vọng | Kết quả thực tế | Đánh giá |
|---|---|---|---|---|
| **TC-C6.7-AUTH-01** | Kiểm tra chặn không đăng nhập | `GET /api/v1/affiliate/dashboard/summary` và `/leaderboard` trả về HTTP 401 khi không có token | Trả về HTTP 401 Unauthorized với `affiliate_status: UNAUTHORIZED` | **PASS** |
| **TC-C6.7-AUTH-02** | Quyền xem CTV ACTIVE & SUSPENDED | CTV ACTIVE và SUSPENDED xem được dashboard cá nhân; PENDING/REJECTED bị chặn HTTP 403 | Hoạt động chuẩn xác qua middleware `requireAffiliateDashboardAccess` | **PASS** |
| **TC-C6.7-AUTH-03** | Bảo mật PII Leaderboard | Leaderboard chỉ trả về `rank`, `display_name`, `approved_reward_amount`, `is_current_affiliate` | Không chứa SĐT, Email, CCCD, Bank hay Lead ID | **PASS** |
| **TC-C6.7-DATA-01** | Toàn vẹn số liệu khóa học | $\sum \text{total\_leads (các khóa)} = \text{metrics.total\_leads}$ và $\sum \text{enrolled} = \text{metrics.enrolled}$ | Khớp 100% không sai lệch | **PASS** |
| **TC-C6.7-DATA-02** | Phân loại trạng thái tuyển sinh | `total_leads = not_enrolled_leads + enrolled_leads`; `WITHDRAWN` không bị gộp sai | Phân loại trạng thái độc lập và chính xác | **PASS** |
| **TC-C6.7-DATA-03** | Loại bỏ hoàn toàn mock data | Không còn bất kỳ hằng số cộng `+3`, `+2`, `+1` hay phép nhân `* 500.000đ` | Dữ liệu tính toán 100% từ bảng `leads` và `rewards` thực tế | **PASS** |
| **TC-C6.7-DATA-04** | Tránh giới hạn 1000 dòng Supabase | Truy vấn recent leads có `.limit(5)` trực tiếp ở CSDL; sắp xếp `created_at DESC, id DESC` | Đã tách riêng `recentLeadsQuery` với `.limit(5)` ở tầng database | **PASS** |
| **TC-C6.7-REW-01** | Phân loại thù lao thực tế | `PENDING_APPROVAL` -> Chờ duyệt; `APPROVED` -> Đã duyệt; loại trừ `REJECTED`/`VOIDED` | Tính đúng tổng số tiền thực tế (kể cả khoản khác 500k) | **PASS** |
| **TC-C6.7-REW-02** | Trạng thái theo dõi chi trả | Khi `paid.available = false`, hiển thị chữ "Chưa có dữ liệu", không hiển thị 0đ giả lập | Card hiển thị "Chưa có dữ liệu" kèm chú thích chưa theo dõi chi trả | **PASS** |
| **TC-C6.7-CHART-01** | Múi giờ Việt Nam sát ranh giới | Thời điểm `2026-09-30T18:00:00Z` (UTC) được tính chuẩn xác vào Tháng 10/2026 (UTC+7) | Chuyển đổi ranh giới tháng chính xác theo `Asia/Ho_Chi_Minh` | **PASS** |
| **TC-C6.7-CHART-02** | Tái đối chiếu nhiều lần | Lead đối chiếu nhiều lần lấy mốc `reconciled_at` hợp lệ mới nhất, không đếm lặp nhập học | Sắp xếp giảm dần theo ngày đối chiếu, đếm duy nhất 1 lần | **PASS** |
| **TC-C6.7-CHART-03** | Chuẩn hóa ngày nhập học thiếu | Lead `ENROLLED` thiếu ngày đối chiếu không bị gán bừa bằng `updated_at`; tính vào `enrolled_missing_date_count` | Biểu đồ hiển thị chú thích cảnh báo rõ ràng khi thiếu ngày | **PASS** |
| **TC-C6.7-LEAD-01** | Xếp hạng Top 5 CTV nổi bật | Xếp hạng giảm dần; đồng hạng nhận cùng thứ hạng (1, 2, 2, 4); loại bỏ Admin/Staff/0đ | Thuật toán Standard Competition Ranking hoạt động chuẩn mực | **PASS** |
| **TC-C6.7-REC-01** | Danh sách 5 đăng ký gần đây | Che 4 số cuối điện thoại tại Server; định dạng `DD/MM/YYYY`; Badge độc lập | Che số `090123****`, nút xem chi tiết mở đúng `/portal/leads/:id` | **PASS** |
| **TC-C6.7-BRAND-01** | Quy tắc thương hiệu & Chống hardcode | Tên nhận diện lấy từ `system_short_name` (`system_settings`); không hardcode tên trường | 100% giao diện sử dụng `useSystemConfig()` động | **PASS** |
| **TC-C6.7-CODE-01** | Chất lượng mã nguồn & Build | TypeScript không lỗi type (`tsc --noEmit`); Vite compile thành công | `lint_applet`: 0 lỗi; `compile_applet`: Build succeeded | **PASS** |

---

## III. CÁC TINH CHỈNH ĐÃ HOÀN THIỆN TRONG BƯỚC C6.7

1. **Tách truy vấn Recent Leads độc lập tại CSDL (`server.ts`):**
   - Bổ sung `recentLeadsQuery` riêng với `.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(5)` để bảo đảm luôn lấy chính xác 5 khách đăng ký mới nhất ở tầng Database, loại bỏ rủi ro khi số lượng leads của CTV vượt qua giới hạn phân trang mặc định.
2. **Khắc phục triệt để cơ chế gán ngày nhập học (C6.5):**
   - Loại bỏ hoàn toàn fallback `updated_at || created_at`.
   - Các lead nhập học chưa có ngày đối chiếu được thống kê vào `enrolled_missing_date_count` và biểu đồ hiển thị thông báo nghiệp vụ minh bạch.

---

## IV. CÁC GIỚI HẠN NGHIỆP VỤ ĐÃ CHỐT

1. **Phân hệ Theo dõi Chi trả Thù lao (Payouts):** Chưa có bảng dữ liệu và quy trình thanh toán ngân hàng chính thức trong Giai đoạn 1 -> Thẻ *"Thưởng đã thanh toán"* hiển thị chuẩn xác trạng thái **"Chưa có dữ liệu"** (đây là hành vi chuẩn theo thiết kế, không phải lỗi).
2. **Thống kê Mạng lưới CTV cấp 2:** Chưa triển khai phân hệ CTV giới thiệu CTV trong phạm vi C6.

---

## V. KẾT LUẬN NGHIỆM THU

- **Toàn bộ 16/16 tiêu chí nghiệm thu C6.1 – C6.6A đạt chuẩn: PASS.**
- Hệ thống sẵn sàng cho các phân hệ tiếp theo theo kế hoạch phát triển.
