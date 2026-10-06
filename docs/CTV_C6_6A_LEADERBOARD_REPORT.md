# BÁO CÁO TRIỂN KHAI C6.6A — TOP 5 CTV NỔI BẬT TRÊN DASHBOARD CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_6A_LEADERBOARD_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất triển khai Khối Top 5 CTV nổi bật & API Xếp hạng vinh danh
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.6A

### 1.1. Phạm vi hoàn thành
1. **Triển khai khối "Top 5 CTV nổi bật" tại `/portal` (`AffiliateDashboard.tsx`):**
   - Vị trí: Đặt ngay bên dưới 2 biểu đồ (Thời gian & Khóa học) và phía trên danh sách *"Khách đăng ký gần đây"*.
   - Tiêu đề: **“Top 5 CTV nổi bật”**
   - Badge: **“Toàn bộ thời gian”**
   - Mô tả: *“Xếp hạng theo tổng thưởng đã được duyệt.”*
   - Phụ chú: `* Thưởng đã duyệt không đồng nghĩa với đã thanh toán.`
2. **Tiêu chí và công thức xếp hạng:**
   - **Chỉ số xếp hạng:** Tổng số tiền thưởng thực tế đã được phê duyệt trong toàn bộ thời gian:
     $$\text{approved\_reward\_amount} = \sum \text{rewards.amount} \quad \text{với } \text{status} = \text{'APPROVED'}$$
   - **Loại trừ tuyệt đối:** Không cộng các khoản `PENDING_APPROVAL`, `REJECTED` hoặc `VOIDED`. Không tự ý nhân số khách với 500.000đ.
   - **Điều kiện tham gia bảng xếp hạng:**
     - CTV có hồ sơ trạng thái `affiliate_profiles.status = 'ACTIVE'`.
     - Tài khoản thuộc vai trò CTV (`profiles.role = 'affiliate'`), loại trừ hoàn toàn vai trò `admin`, `staff`, `manager`, `superadmin`.
     - Tổng thưởng đã duyệt $> 0$ VNĐ.
3. **Quy tắc sắp xếp và đồng hạng (Standard Competition Ranking):**
   - Sắp xếp giảm dần theo tổng thưởng đã duyệt.
   - Tiêu chí phụ ổn định: `affiliate_code ASC`.
   - Các CTV có cùng tổng thưởng đã duyệt sẽ nhận **cùng một thứ hạng** (ví dụ: nếu có 2 người cùng đạt mức cao nhất thì cả hai đều mang Hạng 1; người tiếp theo mang Hạng 3).
   - Tối đa 5 người: Nếu số lượng CTV đủ điều kiện $< 5$, hệ thống chỉ hiển thị số lượng thực tế, không bổ sung CTV mẫu hay gán số tiền 0đ.
4. **Bảo mật và quyền riêng tư (Privacy-by-Design):**
   - API chỉ trả về các trường công khai tối thiểu: `rank`, `display_name`, `approved_reward_amount`, `is_current_affiliate`.
   - Tuyệt đối không trả về SĐT, Email, CCCD, địa chỉ, tài khoản ngân hàng, mã hồ sơ hay ID nội bộ.
   - Xác định `is_current_affiliate` hoàn toàn tại Server dựa trên Auth session token, không nhận tham số từ phía Client.

---

## II. DANH SÁCH FILE & ENDPOINT TRIỂN KHAI

| STT | File / Component | Vai trò |
|---|---|---|
| 1 | `server.ts` | Endpoint `GET /api/v1/affiliate/leaderboard` & hàm tổng hợp an toàn `getAffiliateLeaderboardData` |
| 2 | `src/types/index.ts` | Khai báo kiểu `AffiliateLeaderboardItem`, `AffiliateLeaderboardData` |
| 3 | `src/services/api.ts` | Phương thức `api.getAffiliateLeaderboard()` |
| 4 | `src/components/affiliate/AffiliateLeaderboard.tsx` | Component hiển thị Top 5 với huy chương vàng/bạc/đồng, badge "Bạn", skeleton và error state |
| 5 | `src/components/affiliate/AffiliateDashboard.tsx` | Tích hợp component vào vị trí chuẩn trên Dashboard |
| 6 | `scripts/verify_c6_6a_leaderboard.ts` | Kịch bản kiểm thử tự động thuật toán xếp hạng, bảo mật PII |

---

## III. THIẾT KẾ GIAO DIỆN & TRẠNG THÁI HIỂN THỊ

1. **Biểu tượng thứ hạng (Rank Badges):**
   - **Hạng 1 (Quán quân):** Biểu tượng Cúp vàng `Trophy` (`text-amber-600 bg-amber-100 border-amber-300`).
   - **Hạng 2 (Á quân):** Biểu tượng Huy chương bạc `Medal` (`text-slate-500 bg-slate-100 border-slate-300`).
   - **Hạng 3 (Quý quân):** Biểu tượng Huy hiệu đồng `Award` (`text-amber-700 bg-amber-50 border-amber-200`).
   - **Hạng 4 - 5:** Khung số font monospace bo góc chuẩn.
2. **Nhận diện tài khoản hiện tại:**
   - Khi `is_current_affiliate === true`: Dòng được viền xanh, nền nổi bật nhẹ (`bg-blue-50/80 border-blue-200`) và gắn badge **“Bạn”** (`UserCheck`).
3. **Trạng thái giao diện:**
   - **Đang tải:** Skeleton loader riêng của khối.
   - **Chưa có dữ liệu:** Thông báo *"Chưa có dữ liệu xếp hạng thưởng đã duyệt."*
   - **Lỗi kết nối:** Thông báo lỗi kèm nút *"Thử lại"* (không làm gián đoạn các phần khác trên Dashboard).

---

## IV. KẾT QUẢ KIỂM TRA NGHIỆM THU

| Ca kiểm thử | Nội dung kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|
| **TC-C6.6A-01** | Xác thực & Phân quyền API | **PASS** | Chưa đăng nhập -> 401; CTV ACTIVE/SUSPENDED được xem. |
| **TC-C6.6A-02** | Thuật toán xếp hạng & Đồng hạng | **PASS** | Xếp hạng giảm dần, đồng hạng chính xác (1, 2, 2, 4, 5). |
| **TC-C6.6A-03** | Lọc trạng thái thưởng APPROVED | **PASS** | Chỉ cộng `APPROVED`, loại bỏ `PENDING`, `REJECTED`, `VOIDED`. |
| **TC-C6.6A-04** | Giới hạn Top 5 & Không tạo dữ liệu giả | **PASS** | Tối đa 5 bản ghi; $< 5$ hiển thị đúng thực tế. |
| **TC-C6.6A-05** | Loại trừ Admin/Staff | **PASS** | Kiểm tra vai trò thực tế `profiles.role`. |
| **TC-C6.6A-06** | Bảo mật thông tin nhạy cảm (PII) | **PASS** | Không rò rỉ SĐT, Email, CCCD, Bank Account hay Lead ID. |
| **TC-C6.6A-07** | Nhận diện Badge "Bạn" | **PASS** | Server tính toán độc lập theo Auth session. |
| **TC-C6.6A-08** | Chất lượng mã nguồn (`lint` & `build`) | **PASS** | `tsc --noEmit` và `vite build` 0 lỗi. |

---
*Hoàn tất bước C6.6A. Dừng lại theo đúng yêu cầu, chưa triển khai module Xếp hạng đầy đủ hoặc C6.7.*
