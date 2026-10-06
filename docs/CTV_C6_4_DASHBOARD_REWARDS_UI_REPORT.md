# BÁO CÁO TRIỂN KHAI C6.4 — CARD TỔNG HỢP THƯỞNG TRÊN DASHBOARD CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_4_DASHBOARD_REWARDS_UI_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất triển khai Khối 3 Card Thưởng thời gian thực
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.4

### 1.1. Phạm vi hoàn thành
1. **Triển khai khối giao diện "Tổng hợp thưởng":** Bố trí ngay bên dưới khối 4 card kết quả tuyển sinh tại `/portal` (`AffiliateDashboard.tsx`).
2. **Kết nối dữ liệu API thời gian thực:** Lấy trực tiếp từ đối tượng `rewards` trong response của `GET /api/v1/affiliate/dashboard/summary`.
3. **Triển khai 3 Card Thưởng chuẩn xác:**
   - **Card 1 — "Thưởng chờ duyệt":**
     - Số tiền: `rewards.pending.amount` (định dạng `vi-VN`, ví dụ `500.000 đ`).
     - Số khoản: `rewards.pending.count`.
     - Chú thích: `"[Số khoản] khoản đang chờ phê duyệt"`.
     - Phong cách: Nền trắng, viền xám, icon `Clock` (Vàng hổ phách).
   - **Card 2 — "Thưởng đã duyệt":**
     - Số tiền: `rewards.approved.amount` (định dạng `vi-VN`).
     - Số khoản: `rewards.approved.count`.
     - Chú thích: `"[Số khoản] khoản đã được phê duyệt"`.
     - Phong cách: Nền trắng, viền xám, icon `CheckCircle2` (Tím lam / Indigo).
     - Không dùng cụm từ gây hiểu lầm như *"đã nhận"* hay *"chưa thanh toán"*.
   - **Card 3 — "Thưởng đã thanh toán":**
     - Kiểm tra trạng thái khả dụng `rewards.paid.available`.
     - Khi `available = false`: Hiển thị rõ ràng chữ **"Chưa có dữ liệu"** (màu trung tính `text-slate-500`, không hiển thị 0đ giả lập) kèm chú thích *"Hệ thống chưa theo dõi tình trạng chi trả"*.
     - Khi `available = true` (giai đoạn sau khi có module Payouts): Hiển thị số tiền `rewards.paid.amount` và số khoản `rewards.paid.count`.
4. **Phụ chú nghiệp vụ & Bố cục:**
   - Dòng phụ chú giải thích dưới khối: `* Thưởng đã duyệt không đồng nghĩa với đã thanh toán.`
   - Tiêu đề nhóm: **"Tổng hợp thưởng"** kèm badge **"Toàn bộ thời gian"**.
   - Bố cục responsive: 3 cột trên Desktop (`sm:grid-cols-3`), 1 cột trên Mobile, căn chỉnh đồng đều với các khối trên.

---

## II. BẢNG ÁNH XẠ DỮ LIỆU & QUY TẮC HIỂN THỊ

| Thẻ thưởng | Nguồn dữ liệu API | Trạng thái hiển thị khi có dữ liệu | Trạng thái khi `available = false` / Chưa theo dõi | Chú thích hiển thị |
|---|---|---|---|---|
| **Thưởng chờ duyệt** | `data.rewards.pending.amount` & `count` | `500.000 đ` (hoặc `0 đ` nếu 0 khoản) | Hiển thị `0 đ` nếu đã truy vấn CSDL thành công | `[Số khoản] khoản đang chờ phê duyệt` |
| **Thưởng đã duyệt** | `data.rewards.approved.amount` & `count` | `0 đ` (hoặc số tiền thực tế) | Hiển thị `0 đ` nếu đã truy vấn CSDL thành công | `[Số khoản] khoản đã được phê duyệt` |
| **Thưởng đã thanh toán** | `data.rewards.paid` | `[Số tiền]` (Khi module Payouts kích hoạt) | **"Chưa có dữ liệu"** (Không hiển thị 0đ giả) | `Hệ thống chưa theo dõi tình trạng chi trả` |

---

## III. NGUYÊN TẮC TÀI CHÍNH & PHÂN BIỆT DỮ LIỆU

1. **Phân biệt rạch ròi giữa `0 đ`, `Chưa có dữ liệu` và `Lỗi`:**
   - `0 đ`: Khi hệ thống đã truy vấn thành công bảng `rewards` thuộc CTV và không có bản ghi nào ở trạng thái đó (hợp lệ).
   - `Chưa có dữ liệu`: Khi nghiệp vụ/tính năng chưa được theo dõi trong CSDL (`rewards.paid.available = false`). Tuyệt đối không biến thành 0đ hay 0 khoản giả.
   - `Lỗi`: Khi request thất bại hoặc mạng lỗi -> Hiển thị Error State toàn màn hình với nút "Thử lại", không biến lỗi thành 0đ.
2. **Không suy diễn, không nhân cố định:**
   - Không tự động nhân `Số khách * 500.000 đ`.
   - Khoản thưởng có giá trị khác (ví dụ chính sách thưởng đặc biệt hoặc khấu trừ) vẫn hiển thị đúng 100% theo tổng `amount` từ CSDL.
   - Các khoản `VOIDED` (đã hủy đối soát) và `REJECTED` (từ chối) được loại trừ triệt để.
3. **Quy tắc thương hiệu:**
   - Không chứa bất kỳ chuỗi tên trường/tên viết tắt hardcode nào trong khối thưởng mới.

---

## IV. KẾT QUẢ KIỂM TRA NGHIỆM THU

1. **Kiểm thử dữ liệu thực tế:**
   - CTV có 1 khoản thưởng `PENDING_APPROVAL` (500.000 đ) và 1 khoản `VOIDED` trong CSDL: Thưởng chờ duyệt hiển thị đúng **500.000 đ** (1 khoản), Thưởng đã duyệt hiển thị **0 đ** (0 khoản), Thưởng đã thanh toán hiển thị **"Chưa có dữ liệu"**.
   - CTV có 0 thưởng: Thưởng chờ duyệt và đã duyệt hiển thị **0 đ** (0 khoản), Thưởng đã thanh toán hiển thị **"Chưa có dữ liệu"**.
2. **Chất lượng mã nguồn:**
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.

---
*Hoàn tất bước C6.4. Sẵn sàng tiếp tục với C6.5 (Biểu đồ thống kê xu hướng 12 tháng & Phân bố khóa học).*
