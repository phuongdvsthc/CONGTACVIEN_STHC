# BÁO CÁO KIỂM KÊ VÀ ĐẶC TẢ THIẾT KẾ: TÁCH BIỆT LIÊN KẾT HỒ SƠ EGOV VÀ XÁC NHẬN NHẬP HỌC (A4-F1)
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_F1_EGOV_LINK_AUDIT_AND_SPECIFICATION`
- **Giai đoạn:** A4-F1 – Kiểm kê hiện trạng lưu/hiển thị mã EGOV & Chốt luồng liên kết hồ sơ riêng
- **Ngày thực hiện:** 05/10/2026
- **Môi trường:** Độc lập hoàn toàn, chế độ chỉ đọc (Read-Only), không sửa đổi mã nguồn hay cơ sở dữ liệu thực tế.

---

## 1. HIỆN TRẠNG VÀ BẰNG CHỨNG KIỂM KÊ

### 1.1. Cách lưu trữ mã EGOV hiện tại
- **Nguồn lưu trữ thực tế:** Qua kiểm tra mã nguồn backend (`server.ts`) và cấu trúc schema CSDL (`supabase/migrations/20260929000001_initial_schema.sql`), mã hồ sơ EGOV hiện đang được lưu tại cột `external_admission_code` trong bảng **`public.lead_reconciliations`**.
- **Sự thiếu sót của bảng `public.leads`:** Bảng `leads` (thông tin ứng viên đăng ký) **không** có cột nào lưu mã EGOV. Mã EGOV chỉ được ghi nhận khi cán bộ thực hiện thao tác đối soát hồ sơ (`reconcile`).

### 1.2. Nguyên nhân mã chỉ cập nhật được khi nhập học (`MATCHED_VALID`)
1. **Thiếu ràng buộc độc lập:** Do thiết kế ban đầu gắn liền mã EGOV vào bảng bản ghi đối soát (`lead_reconciliations`), mà bảng này chỉ được tạo khi cán bộ tiến hành xác nhận hồ sơ tuyển sinh (`MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, hoặc `MISMATCH_INVALID`).
2. **Quy tắc Unique Index:** Migration định nghĩa index duy nhất:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS uq_valid_external_admission_code 
   ON public.lead_reconciliations (external_admission_code) 
   WHERE reconciliation_status = 'MATCHED_VALID';
   ```
   Điều này khiến hệ thống hiểu rằng mã EGOV chỉ tồn tại khi hồ sơ đã chính thức qua bước đối soát hợp lệ.
3. **Luồng nghiệp vụ cứng nhắc:** Thực tế tuyển sinh yêu cầu cán bộ có thể tra cứu trên hệ thống EGOV của trường và **liên kết mã hồ sơ EGOV** cho thí sinh ngay khi thí sinh hoàn tất đăng ký trên EGOV (chưa cần đóng học phí hay xác nhận nhập học chính thức), để Cộng tác viên (CTV) nắm được tiến độ ứng viên đã có hồ sơ hệ thống, nhưng hiện tại hệ thống chưa hỗ trợ bước trung gian này.

---

## 2. CHỌN MÔ HÌNH DỮ LIỆU ĐỂ TÁCH BIỆT LIÊN KẾT EGOV

### 2.1. So sánh các phương án
- **Phương án A:** Thêm cột `external_admission_code` trực tiếp vào bảng `public.leads`.
  - *Nhược điểm:* Khó lưu trữ lịch sử sửa/hủy mã, khó quản lý nhiều lần liên kết hoặc kiểm toán ai là người xác minh mã lần đầu.
- **Phương án B:** Xây dựng một bảng chuyên biệt **`public.lead_egov_links`** (hoặc bảng liên kết EGOV độc lập với bảng đối soát tài chính).
  - *Ưu điểm:* 
    - Tách bạch rõ ràng giữa "Xác thực hồ sơ EGOV" (liên kết mã) và "Xác nhận nhập học & Thù lao" (đối soát tài chính).
    - Lưu vết lịch sử (người xác minh, thời điểm, lý do sửa/hủy liên kết).
    - Đảm bảo mã EGOV hiện hành là duy nhất nhưng không làm ảnh hưởng đến bảng `lead_reconciliations`.

### 2.2. Quyết định lựa chọn Mô hình Dữ liệu (Phương án B)
Chốt sử dụng **Bảng liên kết EGOV riêng (`public.lead_egov_links`)** làm nguồn chính cho Mã hồ sơ EGOV hiện hành.

#### Đặc tả tối thiểu của bảng `public.lead_egov_links`:
- `id` (UUID, PK)
- `lead_id` (UUID, FK `leads(id)`)
- `external_admission_code` (VARCHAR(100), NOT NULL, chuẩn hóa `^[0-9]{7}$`, giữ số 0 đầu)
- `link_status` (VARCHAR(50), NOT NULL, giá trị: `ACTIVE`, `VOIDED`)
- `verified_by` (UUID, FK `profiles(id)` — Cán bộ kiểm tra/xác minh)
- `verified_at` (TIMESTAMPTZ, NOT NULL)
- `void_reason` (TEXT — Lý do hủy/sửa liên kết khi ghép nhầm)
- `voided_by` (UUID, FK `profiles(id)`)
- `voided_at` (TIMESTAMPTZ)
- `client_updated_at` (TIMESTAMPTZ — Hỗ trợ concurrency control)
- **Constraint / Index:** 
  - Chỉ mục duy nhất có điều kiện đảm bảo 1 mã EGOV chỉ có tối đa 1 liên kết đang hoạt động (`ACTIVE`):
    ```sql
    CREATE UNIQUE INDEX uq_active_external_admission_code 
    ON public.lead_egov_links (external_admission_code) 
    WHERE link_status = 'ACTIVE';
    ```
  - Chỉ mục duy nhất đảm bảo mỗi lead chỉ có tối đa 1 mã EGOV đang hoạt động (`ACTIVE`):
    ```sql
    CREATE UNIQUE INDEX uq_active_egov_per_lead 
    ON public.lead_egov_links (lead_id) 
    WHERE link_status = 'ACTIVE';
    ```

---

## 3. CHỐT LUỒNG NGHIỆP VỤ MỚI: LIÊN KẾT EGOV & XÁC NHẬN NHẬP HỌC

### A. Trạng thái Chưa liên kết (`NOT_LINKED`):
- Ứng viên mới đăng ký qua link/QR của CTV.
- Hiển thị trên hệ thống Quản trị (A3, A4) và Cổng CTV: *“Chưa cập nhật mã EGOV”*.
- Không coi việc chưa có mã EGOV là bằng chứng khách chưa đăng ký trên EGOV.

### B. Trạng thái Đã liên kết EGOV (`EGOV_LINKED`):
- Admin hoặc Cán bộ tuyển sinh tra cứu trên hệ thống EGOV của trường, xác định mã hồ sơ của thí sinh.
- Cán bộ thực hiện thao tác **Cập nhật/Liên kết mã EGOV** (đúng 7 chữ số).
- Hệ thống ghi nhận trạng thái liên kết (`ACTIVE`), hiển thị trên giao diện: *“Đã đăng ký hồ sơ EGOV”* kèm mã số cụ thể.
- Cộng tác viên nhìn thấy mã hồ sơ trên danh sách khách của mình để nắm bắt tiến độ.
- **Quy tắc quan trọng:** Thao tác này **chưa** xác nhận nhập học, **chưa** xét hồ sơ hợp lệ và **không** sinh thù lao (thưởng) cho CTV. Trạng thái chăm sóc (`counseling_status`) và kết quả đối soát (`reconciliation_status`) không bị thay đổi âm thầm.

### C. Trạng thái Xác nhận Nhập học & Đối soát (`RECONCILED / ENROLLED`):
- Khi hệ thống EGOV của trường tick trạng thái *“Đã nhập học”*, cán bộ sử dụng mã EGOV đã được liên kết trước đó để tiến hành **Xác nhận Nhập học & Đối soát** (chọn `MATCHED_VALID`, `EXISTING`, hoặc `MISMATCH`).
- Nếu là `MATCHED_VALID` + `ENROLLED`, hệ thống tiến hành xét tính hợp lệ, lưu snapshot học phí, học phí thực thu và khởi tạo khoản thưởng 500.000 VNĐ cho CTV.

---

## 4. VỊ TRÍ THAO TÁC TRÊN GIAO DIỆN (`/admin/leads/:id`)

Chốt vị trí thao tác chính tại trang chi tiết khách **`/admin/leads/:id`** (được truy cập từ cả danh sách A3 `/admin/leads` và danh sách đối chiếu A4 `/admin/reconcile`).

Giao diện chi tiết lead được chia thành 2 khối độc lập rõ ràng:
1. **Khối 1: “Hồ sơ đăng ký EGOV”**
   - Hiển thị: Mã hồ sơ EGOV hiện hành, trạng thái liên kết, Cán bộ xác minh, Thời điểm xác minh.
   - Thao tác: Nút *“Cập nhật / Liên kết mã EGOV”* (khi chưa có) hoặc *“Sửa / Hủy liên kết EGOV”* (khi đã có).
2. **Khối 2: “Kết quả nhập học & Đối chiếu”**
   - Giữ nguyên các chức năng Xác nhận đối soát, Hủy đối chiếu và xem lịch sử thù lao hiện có.

---

## 5. HỢP ĐỒNG API / RPC DỰ KIẾN CHO A4-F2

1. **Liên kết / Cập nhật mã EGOV:**
   - `POST /api/v1/admin/leads/:id/egov-link`
   - **Body:** `{ external_admission_code: string, client_updated_at: string, reason?: string }`
   - **Quyền:** `requireStaffOrAdmin`
   - **Idempotency:** Yêu cầu header `Idempotency-Key`.
2. **Hủy / Sửa liên kết EGOV:**
   - `POST /api/v1/admin/leads/:id/egov-unlink`
   - **Body:** `{ void_reason: string, client_updated_at: string }`
   - **Quyền:** `requireStaffOrAdmin` (Chỉ cho phép hủy liên kết khi lead chưa có kết quả đối soát `MATCHED_VALID` đang hoạt động).

---

## 6. KẾT LUẬN NGHIỆM THU A4-F1

- **Kết luận:** **PASS (ĐẠT YÊU CẦU KIỂM KÊ VÀ ĐẶC TẢ A4-F1)**.
- Đã hoàn thành kiểm kê hiện trạng lưu trữ mã EGOV, xác định nguyên nhân vướng mắc, chốt mô hình dữ liệu bảng liên kết độc lập (`lead_egov_links`), đặc tả luồng nghiệp vụ 3 giai đoạn (Chưa liên kết → Đã liên kết EGOV → Xác nhận nhập học), vị trí thao tác và hợp đồng API chuẩn bị cho bước A4-F2.
- Không sửa đổi mã nguồn hoặc CSDL trong bước này.
