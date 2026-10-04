# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.7 — ĐỒNG BỘ KẾT QUẢ ĐỐI CHIẾU SANG A3 VÀ MÀN HÌNH CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_7_RECONCILIATION_RESULTS_A3_AFFILIATE_SYNC_REPORT`
- **Phiên bản:** `1.0.0`
- **Ngày thực hiện:** `04/10/2026`
- **Môi trường:** Production Staging / AI Studio Preview
- **Trạng thái:** **HOÀN THÀNH (PASS)** — Hoàn tất toàn bộ phân hệ A4 (Đối chiếu Hồ sơ & Học phí).

---

## 1. MỤC TIÊU & PHẠM VI A4.7

Đảm bảo tính nhất quán dữ liệu đọc (Read Model Consistency) trên toàn bộ hệ thống. Cùng một hồ sơ khách hàng phải hiển thị đồng nhất mã hồ sơ EGOV, tình trạng nhập học (`admission_status`) và kết quả đối chiếu (`reconciliation_status`) trên tất cả các màn hình:
1. **Danh sách đối chiếu Admin (A4.5)**: `/admin/reconcile`
2. **Danh sách khách giới thiệu Admin (A3)**: `/admin/leads`
3. **Chi tiết khách Admin/Staff (A4.6)**: `/admin/leads/:id`
4. **Danh sách khách của CTV**: `/portal/leads`
5. **Chi tiết khách của CTV & Lịch sử công khai**: `/portal/leads/:id`

---

## 2. QUY TẮC CHỌN KẾT QUẢ ĐỐI CHIẾU HIỆN HÀNH (ACTIVE RECONCILIATION)

- Hệ thống áp dụng chung một hàm helper `getActiveReconciliation` ở cả backend (`server.ts`) cho Admin và CTV:
  - Sắp xếp lịch sử đối soát theo thời gian mới nhất (`reconciled_at` hoặc `created_at` giảm dần).
  - Lọc bản ghi có trạng thái nằm trong tập hợp hợp lệ hiện hành: `['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID']`.
  - **Loại trừ tuyệt đối** các bản ghi đã bị hủy (`VOIDED`) hoặc chưa đối chiếu (`NOT_RECONCILED`), đảm bảo sau khi hủy đối chiếu, hồ sơ trả về trạng thái sạch để có thể đối chiếu lại bằng mã mới mà không bị dính dữ liệu cũ.

---

## 3. BẢNG ÁNH XÁ NHÃN & TRẠNG THÁI NHẤT QUÁN

| Kết quả đối chiếu (`reconciliation_status`) | Nhãn hiển thị Phía Admin / Staff (A4.5, A3, Chi tiết) | Nhãn hiển thị Phía CTV (Affiliate Portal) | Quyền lợi Thưởng CTV (500k) |
| :--- | :--- | :--- | :--- |
| **`NOT_RECONCILED`** | Chưa đối chiếu | Chưa đối chiếu | Không có |
| **`MATCHED_VALID`** | Hồ sơ hợp lệ | Đã nhập học (Hợp lệ) | Khởi tạo chờ duyệt (500.000 VNĐ) |
| **`EXISTING_IN_SCHOOL_SYSTEM`** | Đăng ký trước qua kênh khác | Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác) | Không sinh thưởng |
| **`MISMATCH_INVALID`** | Thông tin không khớp | Thông tin không khớp | Không sinh thưởng |
| **`VOIDED`** | Đã hủy đối chiếu | (Ẩn / Chưa đối chiếu) | Vô hiệu hóa (`VOIDED`) |

---

## 4. BẢO MẬT VÀ PHÂN QUYỀN ĐẶC BIỆT CHO CTV

1. **Bảo mật dữ liệu tài chính**:
   - CTV **không** được xem học phí khóa học snapshot, số biên lai, ngày thu học phí, học phí thực thu hoặc ghi chú nội bộ của cán bộ (`staff_note`, `void_reason`).
   - Các trường tài chính nhạy cảm được loại bỏ hoàn toàn khỏi API response dành cho CTV (`/api/v1/affiliate/leads` và `/api/v1/affiliate/leads/:id`).
2. **Kiểm soát phạm vi dữ liệu**:
   - CTV chỉ được phép đọc thông tin của chính các khách hàng do mình giới thiệu (`affiliate_id` ràng buộc theo session).

---

## 5. KẾT QUẢ KIỂM TRA KỸ THUẬT & BIÊN DỊCH

1. **TypeScript & Linter (`npm run lint`):**
   - **Kết quả:** `0 error, 0 warning` (`tsc --noEmit` PASS).
2. **Biên dịch Production (`compile_applet`):**
   - **Kết quả:** `Build succeeded - the applet is compiled`.
3. **Bảo toàn dữ liệu thật:** Dữ liệu đọc được đồng bộ nguyên vẹn từ CSDL thực tế qua Supabase & Express API.

---

## 6. KẾT LUẬN TOÀN BỘ PHÂN HỆ A (A1 → A4)

- **Kết luận nghiệm thu A4.7:** **HOÀN THÀNH (PASS)**.
- Toàn bộ phân hệ **A4 (Đối chiếu Hồ sơ & Học phí, Phân quyền, Danh sách, Thao tác Chi tiết & Đồng bộ A3/CTV)** đã được triển khai hoàn chỉnh, an toàn và đồng bộ.
