# ĐẶC TẢ QUY TẮC NGHIỆP VỤ & TRẠNG THÁI ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ (A4.2)
## HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

- **Mã tài liệu:** `A4_2_ENROLLMENT_RECONCILIATION_BUSINESS_RULES`
- **Giai đoạn:** A4.2 – Chốt quy tắc nghiệp vụ, ma trận trạng thái & lộ trình kỹ thuật
- **Ngày ban hành:** 04/10/2026
- **Tài liệu căn cứ:** Báo cáo kiểm kê [`docs/A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT.md`](./A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT.md)
- **Cam kết phạm vi A4.2:** Chỉ cập nhật tài liệu đặc tả và nhật ký dự án; **chưa** sửa đổi mã nguồn chức năng, **chưa** chạy migration CSDL hoặc thay đổi dữ liệu thực tế.

---

## 1. TỔNG QUAN & BỐI CẢNH ĐẶC TẢ A4.2

Module **“Đối chiếu hồ sơ & học phí” (Module A4)** là cầu nối nghiệp vụ cốt lõi giữa dữ liệu đăng ký tư vấn ban đầu của khách hàng (Module A3) với kết quả thẩm định thực tế của Ban Tuyển sinh dựa trên hệ thống phần mềm tuyển sinh chính thức của Nhà trường (EGOV), làm cơ sở kích hoạt khoản thù lao tuyển sinh cố định 500.000 VNĐ cho Cộng tác viên (Module A5).

Tài liệu này chuẩn hóa toàn bộ 4 quyết định nghiệp vụ đã được thống nhất, phân tách rạch ròi giữa **Tình trạng nhập học thực tế của người học** và **Tính hợp lệ của hồ sơ giới thiệu CTV**, đồng thời xác định chi tiết lộ trình thay đổi kỹ thuật từ A4.3 đến A4.8.

---

## 2. QUYẾT ĐỊNH 1: CĂN CỨ XÁC NHẬN NHẬP HỌC & QUY TRÌNH ĐỐI SOÁT THỦ CÔNG

### 2.1. Căn cứ xác nhận nhập học duy nhất
1. **Dấu tích "Đã nhập học" trên EGOV là căn cứ duy nhất:**
   - Cán bộ Tuyển sinh thực hiện tra cứu thông tin ứng viên trên phần mềm tuyển sinh EGOV của Nhà trường.
   - Khi và chỉ khi trên phần mềm EGOV cột **“Đã nhập học” đã được đánh dấu (tick chọn)**, Cán bộ Tuyển sinh mới được phép xác nhận tình trạng nhập học tương ứng trên Hệ thống CTV.
2. **Không tự suy diễn trạng thái nhập học:**
   - Tuyệt đối **không** tự suy ra tình trạng nhập học dựa trên việc khách hàng đã nộp tiền, tỷ lệ đóng học phí, sự tồn tại của số biên lai hoặc việc đã phát sinh Mã hồ sơ EGOV.
   - Việc có Mã hồ sơ EGOV chỉ chứng minh hồ sơ đã được tạo trên hệ thống trường, **không đồng nghĩa** với việc học viên đã hoàn tất thủ tục nhập học chính thức.
3. **Các trường thông tin tài chính & học viên:**
   - Số tiền học phí thực thu (`tuition_fee_collected`), số biên lai/phiếu thu (`receipt_number`), ngày đóng học phí (`tuition_paid_at`) và mã học viên/sinh viên (`external_student_code`) là các trường thông tin bổ trợ nhằm lưu trữ bằng chứng đối soát, **không phải là điều kiện bắt buộc tiên quyết** để chặn thao tác xác nhận nhập học nếu trên EGOV đã xác nhận "Đã nhập học".
4. **Tuyệt đối không sử dụng dữ liệu mẫu / Hardcode:**
   - Hệ thống không tự sinh ngẫu nhiên Mã hồ sơ EGOV, không tự điền số biên lai mẫu và không gán sẵn giá trị học phí mặc định (loại bỏ hoàn toàn mã giả lập `STHC-2026-TS-XXXX`, `BL-2026-09-XXXX` và số tiền `14.500.000 VNĐ` đã phát hiện tại A4.1).

### 2.2. Quy trình thao tác thủ công & Phòng chống ghép nhầm
- **Bản chất nghiệp vụ:** Đây là nghiệp vụ đối chiếu thủ công (Manual Verification) giữa hai hệ thống độc lập. Chưa có yêu cầu tích hợp API tự động đồng bộ thời gian thực từ EGOV.
- **Quy tắc tra cứu đa tiêu chí chống trùng tên:**
  - Tra cứu theo Họ và tên chỉ là bước lọc sơ bộ ban đầu.
  - Trước khi nhấn xác nhận đối soát, Cán bộ Tuyển sinh **bắt buộc phải đối chiếu chéo** thêm các trường nhận diện: Số điện thoại khách hàng, Ngành/Khóa học đăng ký và Ngày gửi form tư vấn.
  - Tuyệt đối không thực hiện ghép nối tự động chỉ dựa vào sự trùng khớp Họ tên để ngăn chặn triệt để tình trạng ghép nhầm giữa các thí sinh trùng tên.

---

## 3. QUYẾT ĐỊNH 2: QUY CHUẨN MÃ HỒ SƠ EGOV & RÀNG BUỘC CƠ SỞ DỮ LIỆU

### 3.1. Quy chuẩn định dạng Mã hồ sơ EGOV
1. **Tính duy nhất:** Mỗi hồ sơ nhập học trên EGOV được định danh bằng một Mã hồ sơ duy nhất trên toàn hệ thống.
2. **Định dạng chuẩn:**
   - Mã gồm **đúng 7 chữ số viết liền nhau**, không chứa khoảng trắng, chữ cái hoặc ký tự đặc biệt.
   - Biểu thức chính quy (Regex) kiểm tra tính hợp lệ: `^[0-9]{7}$` (sau khi đã cắt bỏ khoảng trắng đầu/cuối chuỗi bằng `.trim()`).
   - Ví dụ hợp lệ: `0012345`, `0234567`, `1089234`.
   - Ví dụ không hợp lệ: `123456` (thiếu số), `00123456` (thừa số), `STHC-00123`, `0234 567`.
3. **Kiểu lưu trữ:**
   - Lưu trữ dưới dạng chuỗi ký tự (`VARCHAR` / `TEXT`) để bảo toàn nguyên vẹn các chữ số `0` ở đầu mã (ví dụ: `0012345` không bị biến thành `12345`).
   - Tuyệt đối **không tự động chèn thêm số 0** hoặc xóa bớt ký tự sai của người dùng để cố tình biến mã sai thành hợp lệ.
4. **Điều kiện bắt buộc:**
   - Khi ghi nhận kết quả đối soát hợp lệ (`MATCHED_VALID`), trường Mã hồ sơ EGOV là **bắt buộc**.

### 3.2. Ràng buộc toàn vẹn & Phân biệt Lịch sử Đối soát
- **Nguyên tắc chống ghép trùng đồng thời:** Tại một thời điểm bất kỳ, một Mã hồ sơ EGOV chỉ được gắn với tối đa **01 bản ghi đối soát hợp lệ (`MATCHED_VALID`)** trên toàn bộ hệ thống.
- **Ràng buộc Partial Unique Index CSDL:**
  ```sql
  -- Chỉ mục duy nhất có điều kiện hiện có tại migration 20260929000001_initial_schema.sql:
  CREATE UNIQUE INDEX IF NOT EXISTS uq_valid_external_admission_code 
  ON public.lead_reconciliations (external_admission_code) 
  WHERE reconciliation_status = 'MATCHED_VALID';
  ```
- **Phân biệt tính duy nhất với Lịch sử đối soát (Audit History):**
  - Partial Unique Index nêu trên **không khóa toàn bộ bảng** `lead_reconciliations`.
  - Khi một bản ghi đối soát cũ bị hủy (`reconciliation_status = 'VOIDED'`), mã EGOV đó được tự động giải phóng khỏi điều kiện `WHERE reconciliation_status = 'MATCHED_VALID'`.
  - Do đó, cùng một mã EGOV hoàn toàn có thể xuất hiện lại trong lần đối soát mới của chính lead đó (hoặc lead được chỉnh sửa lại đúng) mà không bị lỗi vi phạm ràng buộc CSDL.

---

## 4. QUYẾT ĐỊNH 3: XỬ LÝ HỒ SƠ ĐĂNG KÝ TRƯỚC QUA KÊNH KHÁC (`EXISTING_IN_SCHOOL_SYSTEM`)

### 4.1. Quy tắc phân định ranh giới
Khi Cán bộ Tuyển sinh tra cứu trên EGOV và phát hiện học viên đã nộp hồ sơ, đăng ký hoặc ghi danh trực tiếp tại Trường Saigontourist **trước thời điểm gửi form tư vấn qua link/QR của CTV**:
1. **Ghi nhận trạng thái đối soát:** `reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM'`.
2. **Ghi nhận căn cứ / lý do đối chiếu:**
   - Cán bộ Tuyển sinh bắt buộc phải nhập ghi chú/lý do đối chiếu rõ ràng (ví dụ: *"Thí sinh đã nộp hồ sơ giấy trực tiếp tại VP Tuyển sinh ngày 15/09/2026, trước ngày phát sinh form CTV 25/09/2026"*).
   - Việc chỉ tồn tại mã EGOV **chưa đủ** để kết luận khách đã đăng ký trước; phải dựa trên thời điểm ghi danh gốc.
3. **Ảnh hưởng quyền lợi CTV:**
   - Hồ sơ này **không đủ điều kiện ghi nhận thành công** cho CTV.
   - Hệ thống **không khởi tạo bản ghi thưởng** (`rewards`), trạng thái thưởng của Lead giữ nguyên là `NONE`.

---

### 4.2. Tách biệt hai trục thông tin độc lập: Tình trạng Nhập học vs Tính hợp lệ Giới thiệu

Đây là nguyên tắc thiết kế then chốt khắc phục triệt để điểm thiếu sót đã phát hiện tại A4.1:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HỒ SƠ KHÁCH HÀNG (LEAD)                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. TÌNH TRẠNG NHẬP HỌC (ACADEMIC)    │ 2. TÍNH HỢP LỆ GIỚI THIỆU (AFFILIATE)│
│    "Khách đã nhập học tại STHC chưa?"│    "CTV có đủ điều kiện nhận thưởng?"│
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • ĐÃ NHẬP HỌC                        │ • HỢP LỆ (Ghi nhận thưởng 500k)      │
│   (EGOV đã tick "Đã nhập học")       │   (Đăng ký qua link CTV hợp lệ)      │
│ • CHƯA NHẬP HỌC                      │ • KHÔNG HỢP LỆ / ĐĂNG KÝ TRƯỚC       │
│   (Chưa tick trên EGOV)              │   (Đã có hồ sơ trước ngày CTV giới   │
│                                      │    thiệu -> Không sinh thưởng)       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

#### Phân tích sai lệch logic cũ và Giải pháp chuẩn hóa:
- **Sai lệch cũ (A4.1):** Code hiện tại dùng điều kiện `reconciliation_status === 'MATCHED_VALID'` để suy ra "Đã nhập học". Do đó, nếu hồ sơ được đánh dấu `EXISTING_IN_SCHOOL_SYSTEM`, giao diện hiển thị cho cả Admin và CTV bị ép thành "Chưa nhập học", gây mâu thuẫn thực tế (thí sinh thực tế đã nhập học tại trường, nhưng chỉ là không hợp lệ để trả thưởng CTV).
- **Giải pháp chuẩn hóa (triển khai tại A4.3 và A4.7):**
  - **Trục Tình trạng Nhập học:** Biểu diễn rõ ràng là **"Đã nhập học"** (khi Cán bộ xác nhận học viên đã nhập học trên EGOV).
  - **Trục Tính hợp lệ Giới thiệu:** Biểu thị trạng thái đối soát và thưởng riêng biệt.
  - **Thông điệp hiển thị minh bạch cho CTV:**
    `“Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)”` kèm tình trạng nhập học thực tế.

---

## 5. QUYẾT ĐỊNH 4: QUYỀN HỦY ĐỐI SOÁT (`VOIDED`) & XỬ LÝ KHOẢN THƯỞNG LIÊN QUAN

### 5.1. Phân quyền và Quy tắc thực thi Hủy đối soát
1. **Phân quyền thực hiện:**
   - Cả Quản trị viên (`admin`) và Cán bộ Tuyển sinh (`staff`) đều có toàn quyền thực hiện thao tác **Hủy ghép đối soát do sai sót (Void Reconciliation)**.
   - **Không yêu cầu** Admin phải phê duyệt trước thao tác hủy của Staff nhằm tạo sự linh hoạt, kịp thời sửa lỗi nhập nhầm mã thí sinh.
2. **Phạm vi áp dụng:**
   - Thao tác hủy được phép thực hiện ngay cả khi khoản thưởng liên quan đã ở trạng thái **`APPROVED` (Đã duyệt)** hoặc `PENDING_APPROVAL` (Chờ duyệt).
3. **Điều kiện bắt buộc:**
   - Bắt buộc phải nhập nội dung **Lý do hủy ghép** (kiểm tra không được để trống hoặc chỉ có khoảng trắng).
   - Hệ thống tự động ghi nhận chính xác định danh người thực hiện (`voided_by`) trích xuất từ phiên đăng nhập backend thực tế và thời điểm hủy (`voided_at`).
4. **Bảo toàn lịch sử kiểm toán:**
   - Tuyệt đối **không xóa (DELETE)** bất kỳ dòng dữ liệu nào khỏi bảng `lead_reconciliations` hoặc `rewards`.
   - Chuyển `reconciliation_status = 'VOIDED'` trên bản ghi đối soát.
   - Ghi nhận đầy đủ bản ghi vào `audit_logs` với action `'VOID_RECONCILIATION'`.

### 5.2. Xử lý nguyên tử khoản thưởng liên quan trong cùng Database Transaction
- Khi hủy đối soát, hệ thống thực thi một giao dịch CSDL nguyên tử:
  1. Cập nhật bản ghi `lead_reconciliations` hiện tại thành `reconciliation_status = 'VOIDED'`, lưu `void_reason`, `voided_by`, `voided_at`.
  2. Tìm bản ghi `rewards` liên kết trực tiếp (`reconciliation_id`) đang ở trạng thái `PENDING_APPROVAL` hoặc `APPROVED` và chuyển ngay sang `status = 'VOIDED'`, lưu `void_reason`, `voided_by`, `voided_at`.
  3. Tuyệt đối **không duy trì** bất kỳ khoản thưởng nào ở trạng thái `APPROVED` hoặc `PENDING_APPROVAL` gắn với một đối soát đã bị hủy.
  4. Cập nhật trạng thái tổng hợp trên bảng `leads`: `reconciliation_status = 'NOT_RECONCILED'`, `reward_status = 'NONE'`.
  5. Mã hồ sơ EGOV cũ được giải phóng hoàn toàn khỏi Partial Unique Index.

### 5.3. Quy trình Đối soát lại (Re-reconciliation)
- Khi Cán bộ Tuyển sinh nhập mã EGOV chính xác để đối soát lại cho chính lead đó:
  - Hệ thống khởi tạo một bản ghi `lead_reconciliations` hoàn toàn mới (`reconciliation_status = 'MATCHED_VALID'`).
  - Hệ thống tự động sinh một bản ghi `rewards` mới (`status = 'PENDING_APPROVAL'`) liên kết với bản ghi đối soát mới.
  - Tuyệt đối không âm thầm "bật lại" bản ghi đối soát/thưởng cũ đã bị `VOIDED`. Lịch sử các lần đối soát được hiển thị độc lập, minh bạch 100%.

> **Lưu ý phạm vi:** Hủy ghép đối soát là thao tác điều chỉnh kết quả đối chiếu trên Hệ thống Cổng CTV, không làm thay đổi hay can thiệp vào trạng thái của thí sinh trên phần mềm EGOV của Trường. Nghiệp vụ thanh toán thù lao và xử lý các khoản tiền đã thực chi ngoài đời thực do Phòng Tài chính - Kế toán đảm trách và nằm ngoài phạm vi Module A4.

---

## 6. BẢNG MA TRẬN TRẠNG THÁI & CHUYỂN TRẠNG THÁI VÒNG ĐỜI ĐỐI SOÁT

### 6.1. Bảng Chi tiết 5 Trạng Thái Đối Soát

| Mã trạng thái | Ý nghĩa nghiệp vụ | Điều kiện ghi nhận | Mã EGOV | Tình trạng Nhập học hiển thị | Thông báo Admin / Staff | Thông báo Cổng CTV | Ảnh hưởng Thưởng | Thao tác tiếp theo | Quyền thực hiện |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **`NOT_RECONCILED`** | Chưa đối soát | Mặc định ban đầu khi lead được tạo từ form | Tùy chọn (Thường để trống) | **Chưa nhập học** | "Chưa đối soát hồ sơ" | "Đang chờ đối soát" | `reward_status = NONE` (Chưa phát sinh thưởng) | Đối soát hợp lệ / Đăng ký trước / Không khớp | Staff, Admin |
| **`MATCHED_VALID`** | Khớp hồ sơ & Đã nhập học hợp lệ | EGOV đã tick "Đã nhập học", khớp SĐT/Khóa học, đăng ký sau ngày CTV giới thiệu | **Bắt buộc** (Đúng 7 số) | **Đã nhập học** | "Đã đối soát khớp hồ sơ EGOV" | "Đã nhập học chính thức" | Tự sinh thưởng 500.000 VNĐ (`PENDING_APPROVAL`) | Hủy ghép đối soát (`VOIDED`) | Staff, Admin |
| **`EXISTING_IN_SCHOOL_SYSTEM`** | Đã có hồ sơ trước qua kênh khác | Đã nộp hồ sơ/ghi danh tại trường trước ngày phát sinh lead CTV | Tùy chọn (Nếu EGOV đã cấp mã) | **Đã nhập học** (hoặc Đã có hồ sơ tùy EGOV) | "Hồ sơ đã tồn tại trên hệ thống trường trước ngày CTV giới thiệu" | **"Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)"** | `reward_status = NONE` (Không sinh thưởng) | Hủy kết quả / Đối soát lại nếu nhầm | Staff, Admin |
| **`MISMATCH_INVALID`** | Không khớp hồ sơ tuyển sinh | SĐT/thông tin khách không tìm thấy hoặc sai lệch hoàn toàn với EGOV | Không áp dụng | **Chưa nhập học** | "Không tìm thấy hồ sơ khớp trên EGOV" | "Thông tin chưa khớp hồ sơ tuyển sinh" | `reward_status = NONE` (Không sinh thưởng) | Đối soát lại khi có thông tin mới | Staff, Admin |
| **`VOIDED`** | Đã hủy kết quả đối soát do sai sót | Cán bộ phát hiện gõ nhầm mã EGOV hoặc ghép nhầm hồ sơ và thực hiện hủy | Đã được giải phóng | **Chưa nhập học** (Trở về mặc định) | "Đã hủy đối soát (Lý do: ...)" | "Đang chờ đối soát lại" | Thưởng liên quan chuyển `VOIDED`, lead về `NONE` | Đối soát lại mã mới | Staff, Admin |

---

### 6.2. Ma trận Chuyển đổi Trạng thái (State Transitions)

```
                       ┌──────────────────────┐
                       │   NOT_RECONCILED     │ ◄────────────────────────┐
                       │ (Mặc định ban đầu)   │                          │
                       └──────────┬───────────┘                          │
                                  │                                      │
            ┌─────────────────────┼─────────────────────┐                │
            │                     │                     │                │
            ▼                     ▼                     ▼                │
   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
   │  MATCHED_VALID  │   │ EXISTING_IN_... │   │MISMATCH_INVALID │       │
   │ (Khớp nhập học) │   │ (ĐK trước TH)   │   │(Không khớp HS)  │       │
   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘       │
            │                     │                     │                │
            │ (Hủy ghép do nhầm)  │ (Hủy ghép do nhầm)  │ (Hủy thao tác) │
            └─────────────────────┼─────────────────────┘                │
                                  │                                      │
                                  ▼                                      │
                         ┌─────────────────┐                             │
                         │     VOIDED      │ ────────────────────────────┘
                         │ (Lưu vết audit) │ (Tự động đưa Lead về NOT_RECONCILED)
                         └─────────────────┘
```

### 6.3. Đề xuất xử lý trường hợp: Đã tìm thấy mã EGOV nhưng chưa tick "Đã nhập học"
- **Tình huống nghiệp vụ:** Cán bộ tìm thấy hồ sơ thí sinh trên EGOV có mã 7 số, nhưng học viên mới chỉ nộp hồ sơ xét tuyển, chưa đóng học phí hoặc EGOV chưa đánh dấu "Đã nhập học".
- **Quy tắc xử lý:**
  - Tuyệt đối **không** chuyển trạng thái sang `MATCHED_VALID` (để tránh sinh thưởng 500k khi học viên chưa nhập học chính thức).
  - Trạng thái đối soát của Lead tiếp tục giữ là `NOT_RECONCILED`.
  - Cán bộ cập nhật tiến độ tư vấn (`counseling_status = 'CONSULTING'`) và ghi chú vào lịch sử chăm sóc: *"Đã có mã hồ sơ EGOV XXXXXXX, đang chờ học viên hoàn tất thủ tục đóng phí nhập học"*.
  - Khi EGOV cập nhật tick "Đã nhập học", Cán bộ tiến hành thao tác đối soát `MATCHED_VALID`.

---

## 7. QUY TẮC NHẤT QUÁN, PHÂN QUYỀN & BẢO VỆ DỮ LIỆU

1. **Phân quyền truy cập & Thao tác:**
   - **Admin và Staff:** Có quyền xem danh sách đối soát toàn hệ thống, thực hiện đối soát và hủy đối soát cho tất cả các lead.
   - **Cộng tác viên (CTV):** Chỉ xem danh sách và kết quả của khách hàng do chính mình giới thiệu. Tuyệt đối không có quyền xem thông tin học phí chi tiết, số biên lai, ghi chú nội bộ của cán bộ, và không có quyền sửa đổi mã EGOV hay trạng thái đối soát.
2. **Khách đăng ký tự nhiên (Organic Leads - không có CTV):**
   - Vẫn được Cán bộ Tuyển sinh tra cứu và đối soát nhập học (`MATCHED_VALID`) trên hệ thống bình thường để theo dõi chỉ tiêu tuyển sinh chung.
   - Hệ thống tự động nhận diện `affiliate_id IS NULL` và **không sinh bản ghi thưởng** (`reward_status = 'NONE'`).
3. **Xác định danh tính người thao tác (Identity Integrity):**
   - Loại bỏ hoàn toàn việc gán cứng `demoState.adminUser.id` hay `demoState.activeAffiliate.id`.
   - `staff_id`, `voided_by`, `actor_id` bắt buộc lấy trực tiếp từ `(req as any).user.id` của Bearer token đã xác thực.
   - CTV thụ hưởng thù lao (`rewards.affiliate_id`) bắt buộc lấy từ `leads.affiliate_id` thực tế của bản ghi lead.
4. **Kiểm soát xung đột đồng thời & Chống gửi lặp (Concurrency & Idempotency):**
   - Mọi thao tác đối soát và hủy đối soát bắt buộc phải truyền `client_updated_at` (phiên bản timestamp của dòng lead). Nếu CSDL phát hiện `leads.updated_at` khác với `client_updated_at` (do cán bộ khác vừa thao tác), hệ thống từ chối ngay với mã `409 Conflict`.
   - Sử dụng khóa bi quan `SELECT ... FOR UPDATE` trên dòng `leads` trong RPC để chống race condition.
   - Hỗ trợ `idempotency_key` trong request header chống việc Cán bộ bấm đúp chuột gửi trùng lặp yêu cầu đối soát.
5. **Tính nguyên tử của giao dịch (Atomicity):**
   - Toàn bộ các thao tác: Cập nhật `leads`, chèn/sửa `lead_reconciliations`, chèn/sửa `rewards` và ghi nhật ký `audit_logs` phải được thực thi trong **duy nhất 01 Database Transaction (RPC)**.
   - Nếu bất kỳ bước nào lỗi (như trùng mã EGOV, vi phạm phân quyền), CSDL tự động rollback 100%, không để lại trạng thái dở dang hay dữ liệu rác.

---

## 8. BẢNG ĐỐI CHIẾU QUYẾT ĐỊNH VỚI HIỆN TRẠNG (A4.1) VÀ LỘ TRÌNH THAY ĐỔI

| Quyết định nghiệp vụ (A4.2) | Hiện trạng mã nguồn & CSDL (A4.1) | Điểm sai sót / Thiếu hụt | Thay đổi kỹ thuật cần làm | Bước thực hiện |
| :--- | :--- | :--- | :--- | :---: |
| **1. Căn cứ nhập học EGOV (không tự điền mock data)** | Modal Reconcile tự sinh mã `STHC-2026-TS-XXXX`, `BL-2026-09-XXXX` và học phí mặc định `14.5tr` | Chứa dữ liệu mẫu hardcode; học phí/biên lai đang bị coi là bắt buộc | Bỏ random mã và học phí mặc định; cho phép để trống biên lai/học phí nếu chưa có; validate mã EGOV 7 số | **A4.4 / A4.6** |
| **2. Mã EGOV 7 chữ số `^[0-9]{7}$` lưu chuỗi** | Schema lưu `VARCHAR(100)` nhưng backend chưa validate regex 7 chữ số | Chưa kiểm tra regex `^[0-9]{7}$`; có thể nhập chuỗi tùy tiện | Bổ sung validate regex 7 chữ số ở cả Frontend Form, Backend Controller và Database Constraint | **A4.3 / A4.4 / A4.6** |
| **3. Tách biệt Trạng thái Nhập học vs Tính hợp lệ Giới thiệu** | Giao diện đang dùng `reconciliation_status === 'MATCHED_VALID'` để gán nhãn "Đã nhập học" | `EXISTING_IN_SCHOOL_SYSTEM` bị gán sai thành "Chưa nhập học" | Chuẩn hóa hàm hiển thị: tách riêng badge "Tình trạng nhập học" và "Trạng thái hồ sơ CTV" | **A4.3 / A4.7** |
| **4. Quyền Hủy đối soát cho cả Staff & Admin** | Code backend hardcode `staff_id = demoState.adminUser.id` | Sai danh tính người thực hiện; chưa kiểm tra session thật | Lấy `actorId` từ token xác thực; cấp quyền thực thi RPC cho role `staff` và `admin` | **A4.3 / A4.4** |
| **5. Khách tự nhiên không sinh thưởng** | Fallback backend gán `affiliate_id = demoState.activeAffiliate.id` | Sinh thưởng sai cho tài khoản demo khi lead là khách tự nhiên | Sửa logic: nếu `lead.affiliate_id IS NULL` thì không tạo bản ghi `rewards`, đặt `reward_status = NONE` | **A4.3 / A4.4** |
| **6. Giao diện danh sách đối soát chuyên biệt** | Tab `/admin/reconcile` dùng chung danh sách `getAdminLeads` thô | Thiếu ô tìm kiếm mã EGOV, bộ lọc trạng thái đối soát, lọc ngày và phân trang | Xây dựng view danh sách đối soát độc lập với đầy đủ toolbar tìm kiếm/lọc/phân trang | **A4.5** |
| **7. Thao tác đối soát trong chi tiết Lead** | Màn hình `/admin/leads/:id` chỉ có form chăm sóc A3.6 | Chưa thể đối soát trực tiếp từ màn hình chi tiết khách | Tích hợp Card Đối soát hồ sơ & học phí vào component `AdminLeadDetailView.tsx` | **A4.6** |
| **8. Kiểm soát xung đột phiên bản & Idempotency** | Endpoint reconcile chưa có `client_updated_at` | Nguy cơ xung đột khi 2 cán bộ thao tác đồng thời | Bổ sung `client_updated_at` và `idempotency_key` vào RPC và API | **A4.3 / A4.4** |

---

## 9. LỘ TRÌNH KỸ THUẬT TRIỂN KHAI MODULE A4

Để đảm bảo tính toàn vẹn, ổn định và tuân thủ quy trình phát triển chuẩn, module A4 sẽ được triển khai lần lượt qua các bước:

- **A4.3 – CƠ SỞ DỮ LIỆU, CONSTRAINT VÀ RPC NGUYÊN TỬ:**
  - Viết Migration cập nhật/chuẩn hóa RPC `fn_reconcile_lead_and_create_reward` và `fn_void_reconciliation_and_reward`.
  - Bổ sung kiểm tra Regex `^[0-9]{7}$` cho `external_admission_code`.
  - Xử lý kiểm soát xung đột phiên bản `p_expected_updated_at` và `p_idempotency_key`.
  - Phân tách rõ trường `admission_status` (Đã nhập học / Chưa nhập học) và `reconciliation_status`.
- **A4.4 – BACKEND API VÀ PHÂN QUYỀN:**
  - Chuẩn hóa các endpoint `/api/v1/admin/leads/:id/reconcile`, `/api/v1/admin/leads/:id/void-reconciliation`.
  - Trích xuất danh tính `actorId` thực tế từ JWT token của cán bộ đăng nhập (hỗ trợ cả `staff` và `admin`).
  - Loại bỏ hoàn toàn mock fallback `demoState`.
- **A4.5 – GIAO DIỆN DANH SÁCH ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ (`/admin/reconcile`):**
  - Xây dựng component danh sách chuyên biệt với bộ lọc đa tiêu chí: Tìm theo mã EGOV 7 số, SĐT, Họ tên, Khóa học, Trạng thái đối soát, Nguồn CTV và Khoảng ngày; phân trang máy chủ.
- **A4.6 – GIAO DIỆN CHI TIẾT & MODAL THAO TÁC ĐỐI SOÁT / HỦY GHÉP:**
  - Xóa bỏ dữ liệu mẫu ngẫu nhiên; validate input mã EGOV chuẩn 7 số.
  - Hỗ trợ chọn kết quả `MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`.
  - Tích hợp Card Đối soát trực tiếp vào trang chi tiết `/admin/leads/:id`.
- **A4.7 – HIỂN THỊ ĐỒNG NHẤT TẠI MODULE A3 VÀ CỔNG CTV:**
  - Cập nhật hiển thị tách biệt rõ: Tình trạng nhập học thực tế và Trạng thái hợp lệ hồ sơ CTV.
  - Hiển thị thông điệp minh bạch: *"Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)"*.
- **A4.8 – KIỂM THỬ E2E TOÀN LUỒNG & BÀN GIAO MODULE A4:**
  - Thiết lập bộ test suite kiểm tra toàn bộ 4 quyết định nghiệp vụ, chống trùng mã EGOV, hủy đối soát và tính nhất quán dữ liệu.

---

## 10. KẾT LUẬN NGHIỆM THU A4.2

- **Kết luận:** **PASS (HOÀN THÀNH ĐẶC TẢ NGHIỆP VỤ A4.2)**.
- **Lý do đạt yêu cầu:**
  1. Đã thể chế hóa chính xác 4 quyết định nghiệp vụ của Nhà trường: Căn cứ nhập học EGOV, Quy chuẩn mã EGOV 7 số, Xử lý khách đăng ký trước qua kênh khác, Quyền hủy đối soát của Staff/Admin.
  2. Đã phân tách rõ ràng giữa **Tình trạng nhập học của khách** và **Tính hợp lệ của hồ sơ giới thiệu CTV**.
  3. Đã xây dựng ma trận trạng thái, chuyển trạng thái, phân quyền và tác động đến thù lao chi tiết.
  4. Đã đối chiếu toàn diện với báo cáo kiểm kê A4.1 và phân bổ kế hoạch thay đổi kỹ thuật rõ ràng vào các bước A4.3 – A4.8.
  5. Quá trình thực hiện chỉ cập nhật tài liệu đặc tả, không thay đổi mã nguồn chức năng hoặc dữ liệu thực tế.
- Hệ thống đã sẵn sàng để chuyển sang bước **A4.3: Triển khai CSDL, Constraint và RPC nguyên tử**.
