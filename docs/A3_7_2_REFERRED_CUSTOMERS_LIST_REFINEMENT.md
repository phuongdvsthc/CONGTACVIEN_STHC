# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.7.2 — HOÀN THIỆN MÀN HÌNH DANH SÁCH “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU”
**Hệ thống Cổng Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. TỔNG QUAN HẠNG MỤC A3.7.2
Thực hiện chuẩn hóa và hoàn thiện màn hình danh sách “Khách hàng được giới thiệu” cho cả 2 phân hệ **Quản trị / Cán bộ Tuyển sinh (Admin/Staff)** và **Cộng tác viên (Affiliate)** theo kết quả kiểm thử thực tế và các nguyên tắc kiến trúc hiệu năng cao.

---

## 2. CHI TIẾT CÁC THAY ĐỔI COMPONENT & API

### 2.1. Bổ Sung Tìm Kiếm Theo Mã CTV (Server-side & Database)
- **Endpoint**: `GET /api/v1/admin/leads` (Query param: `search`)
- **Cơ chế**:
  - Khi người dùng nhập từ khóa tìm kiếm (ví dụ: `STHCCTV1088` hoặc `1088`), backend xử lý trim khoảng trắng và tìm kiếm không phân biệt hoa/thường (`ILIKE`).
  - Tìm kiếm đồng thời trên:
    1. Mã CTV ghi nhận tại thời điểm khách đăng ký: `leads.affiliate_code_captured`.
    2. Mã CTV hiện tại: Tra cứu nhanh các ID CTV khớp từ khóa trong `affiliate_profiles.affiliate_code` (giới hạn tối đa 20 CTV) rồi đưa vào điều kiện `OR affiliate_id IN (...)`.
    3. Họ tên khách hàng (`leads.full_name`), Số điện thoại (`leads.phone`), Email (`leads.email`).
  - **Không tải toàn bộ danh mục CTV về backend/frontend** để tạo mảng ID lớn.
  - Tổng số bản ghi (`total`) và phân trang (`pagination`) áp dụng đồng bộ 100% cùng điều kiện tìm kiếm.
  - Cập nhật placeholder ô tìm kiếm: `Tìm theo họ tên, SĐT, email khách hoặc mã CTV...`
  - Đổi từ khóa tìm kiếm tự động đưa về trang 1.
  - Phân hệ CTV (`GET /api/v1/affiliate/leads`) giữ nguyên phạm vi bảo mật, chỉ thấy khách của chính mình.

### 2.2. Thay Bộ Lọc Nguồn CTV Bằng Tìm Kiếm Trên Server (Combobox / Autocomplete)
- **Vấn đề cũ**: `<select>` dropdown tải danh mục CTV vào DOM, không mở rộng được khi có hàng trăm ngàn CTV.
- **Giải pháp A3.7.2**:
  - Xây dựng component **Combobox Autocomplete** với tìm kiếm trên máy chủ.
  - Bổ sung endpoint chuyên dụng: `GET /api/v1/admin/affiliates/lookup` (Chỉ Admin/Staff được gọi).
    - Query param: `q` (từ khóa tìm kiếm, tối thiểu 2 ký tự, debounce ~400ms), `limit` (mặc định 20 bản ghi).
    - Hỗ trợ tra cứu theo ID cụ thể: `GET /api/v1/admin/affiliates/lookup?id=...` để khôi phục nhãn khi tải lại trang có query `?affiliate_id=...` mà không cần nạp danh mục.
    - Dữ liệu trả về tinh gọn: `{ id, affiliate_code, full_name, email, phone, status }`.
    - Không lọc bỏ CTV bị tạm khóa (`SUSPENDED`) hoặc chờ duyệt để cán bộ vẫn lọc được khách lịch sử của họ.
    - Hiển thị nhãn rõ ràng: `Mã CTV — Họ tên` (kèm badge trạng thái nếu bị khóa).
  - Có sẵn lựa chọn **"Tất cả nguồn CTV"** (`affiliate_id = 'ALL'`) và **"Tự nhiên (Không CTV)"** (`affiliate_id = ''`).
  - Chọn hoặc xóa CTV tự động đưa về trang 1.
  - Cơ chế chống Race Condition: Dùng `sequence ref` (`affiliateLookupSeqRef`) để chặn phản hồi cũ ghi đè kết quả tìm kiếm mới khi người dùng gõ nhanh.

### 2.3. Bỏ Cột “Khung Giờ Tiện”
- Loại bỏ hoàn toàn cột "Khung giờ tiện" khỏi header và thân bảng danh sách Admin/Staff.
- Cân bằng lại `colSpan` và layout responsive của bảng.
- Không tạo cột cơ sở dữ liệu giả hoặc mapping không cần thiết.

### 2.4. “Tiến Độ Tư Vấn” Chỉ Hiển Thị Trạng Thái (Read-only Badge)
- Tại bảng danh sách (`AdminPortal.tsx` và `AffiliateLeadsView.tsx`):
  - Thay thẻ `<select>` chỉnh sửa trực tiếp bằng badge trạng thái chỉ đọc (`read-only`).
  - Xóa handler gọi API cập nhật từ dòng danh sách; không phát sinh request ghi khi bấm vào badge hoặc dòng dữ liệu.
  - Chuẩn hóa nhãn trạng thái tiếng Việt:
    - `NEW`: **Mới đăng ký** (Badge xanh dương / Sky)
    - `CONTACTED`: **Đã liên hệ** (Badge vàng hổ phách / Amber)
    - `CONSULTING`: **Đang tư vấn** (Badge tím / Indigo)
    - `UNREACHABLE`: **Chưa liên hệ được** (Badge xám / Slate)
    - `LOST`: **Không tiếp tục** (Badge đỏ / Rose)
- Mọi thao tác cập nhật tiến độ tư vấn và thêm ghi chú nội bộ được thực hiện tập trung tại màn hình Chi tiết (`/admin/leads/:id`) qua API nguyên tử có kiểm soát quyền, ghi `audit_logs`, idempotency và concurrency control.
- Sau khi cập nhật ở trang chi tiết và bấm "Quay lại danh sách", danh sách làm mới dữ liệu mới nhất mà vẫn bảo toàn trạng thái bộ lọc và phân trang.

### 2.5. Thêm Cột “Mã Hồ Sơ (EGOV)”
- Bổ sung cột "Mã hồ sơ (EGOV)" vào bảng danh sách Admin/Staff (`AdminPortal.tsx`) và CTV (`AffiliateLeadsView.tsx`).
- Nguồn dữ liệu: Đọc `external_admission_code` từ kết quả đối chiếu có hiệu lực (`getActiveReconciliation()`), dùng chung logic với màn hình chi tiết.
- Giữ nguyên kiểu chuỗi (string) và bảo toàn số 0 ở đầu (ví dụ: `004295`).
- Khách chưa có mã đối soát: Hiển thị ô rỗng (`—`), tuyệt đối không hiển thị text "Chưa cập nhật" hay dữ liệu mẫu.
- Cột chỉ đọc, không cho sửa tại danh sách.

### 2.6. Khắc Phục Lưu Ý Nghiệm Thu A3.7.1 (RPC Mandatory Concurrency Timestamp)
- Viết migration `20261004000002_enforce_mandatory_concurrency_timestamp.sql`.
- Tại database PostgreSQL: Trong hàm RPC `fn_update_lead_care_and_audit`, khi có thao tác ghi thực sự (`v_status_changed OR v_note_added`), bắt buộc `p_expected_updated_at IS NOT NULL`.
- Nếu caller authenticated bỏ qua tham số này, PostgreSQL sẽ từ chối ngay với mã lỗi `22023` và thông báo: `Bị từ chối: Bắt buộc cung cấp thời điểm phiên bản dữ liệu hiện tại (expected_updated_at) để kiểm soát xung đột đồng thời.`
- Bổ sung B-tree index cho `affiliate_profiles(affiliate_code)` và `leads(affiliate_code_captured)`.

---

## 3. DANH SÁCH FILE & MIGRATION ĐÃ CẬP NHẬT

1. **Migration CSDL**:
   - `/supabase/migrations/20261004000002_enforce_mandatory_concurrency_timestamp.sql`
2. **Backend Server**:
   - `/server.ts`:
     - Bổ sung route `GET /api/v1/admin/affiliates/lookup` (tra cứu CTV có debounce, giới hạn 20 dòng).
     - Cập nhật `GET /api/v1/admin/leads` hỗ trợ tìm kiếm theo `affiliate_code` và `affiliate_code_captured`.
3. **Frontend Services & Components**:
   - `/src/services/api.ts`: Bổ sung phương thức `lookupAffiliates()`.
   - `/src/components/admin/AdminPortal.tsx`:
     - Combobox autocomplete tra cứu CTV server-side với debounce 400ms và sequence ref chống race condition.
     - Cập nhật placeholder tìm kiếm đa tiêu chí gồm mã CTV.
     - Xóa cột "Khung giờ tiện".
     - Thêm cột "Mã hồ sơ (EGOV)" chỉ đọc, giữ số 0 đầu, ô rỗng khi chưa có mã.
     - Đổi cột "Tiến độ tư vấn" sang badge chỉ đọc với nhãn chuẩn hóa.
   - `/src/components/affiliate/AffiliateLeadsView.tsx`:
     - Chuẩn hóa cột "Mã hồ sơ EGOV" để ô rỗng `—` khi chưa có mã (loại bỏ text "Chưa cập nhật").

---

## 4. KẾT QUẢ KIỂM THỬ THỰC TẾ

| Hạng mục kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Tìm mã CTV đầy đủ & một phần** | Nhập `STHCCTV1088` hoặc `1088` | Tìm ra đúng các lead có mã CTV tương ứng ở cả `captured` và `affiliate_profiles` | Trả về đúng danh sách lead của CTV, số lượng count khớp | **PASS** |
| **Tìm kiếm không phân biệt hoa/thường** | Nhập `sthcctv1088` | Khớp kết quả như chữ in hoa | Khớp 100% nhờ `ILIKE` | **PASS** |
| **Combobox tra cứu CTV server-side** | Nhập `Phương` hoặc `1088` trong combobox | Gọi `GET /api/v1/admin/affiliates/lookup?q=...`, trả tối đa 20 gợi ý | Trả về nhanh chóng, hiển thị `STHCCTV1088 — Đào Văn Phương` | **PASS** |
| **Khôi phục CTV đã chọn khi reload URL** | URL có `affiliate_id=...` | Gọi `lookup?id=...` để lấy tên CTV mà không tải toàn bộ danh mục | Hiển thị đúng nhãn CTV đã chọn | **PASS** |
| **Bỏ cột Khung giờ tiện** | Giao diện bảng danh sách Admin/Staff | Không còn cột Khung giờ tiện | Đã xóa 100%, bảng thông thoáng hơn | **PASS** |
| **Tiến độ tư vấn chỉ đọc** | Bấm vào badge trạng thái tại bảng | Không mở dropdown, không gửi request cập nhật | Badge hiển thị tĩnh, đúng màu và nhãn chuẩn hóa | **PASS** |
| **Mã hồ sơ EGOV có số 0 đầu** | Khách có mã `004295` | Hiển thị nguyên vẹn chuỗi `004295` | Hiển thị dạng font-mono chữ đậm màu ngọc bích | **PASS** |
| **Khách chưa có mã EGOV** | Khách chưa đối soát | Hiển thị ô rỗng `—` | Hiển thị dấu gạch ngang mờ `—`, không có chữ "Chưa cập nhật" | **PASS** |
| **Bắt buộc expected_updated_at tại DB** | Gọi RPC ghi với `p_expected_updated_at := NULL` | DB từ chối với lỗi 22023 | Trả về lỗi 22023 bắt buộc timestamp phiên bản | **PASS** |
| **Kiểm tra TypeScript & Build** | `tsc --noEmit` & `npm run build` | Không có lỗi compile | **0 errors, 0 warnings. Build Succeeded 100%** | **PASS** |

---

## 5. PHẦN CHƯA KIỂM CHỨNG & GHI CHÚ
- **Chưa kiểm chứng**: Môi trường có hàng trăm ngàn bản ghi thực tế cần kiểm tra EXPLAIN ANALYZE trên hạ tầng production để theo dõi hiệu năng của index B-tree khi bảng `leads` vượt quá 500,000 dòng.
- **Ranh giới**: Không triển khai các chức năng đối chiếu hồ sơ, tính học phí hoặc duyệt thưởng (thuộc module Đối chiếu hồ sơ & học phí).
