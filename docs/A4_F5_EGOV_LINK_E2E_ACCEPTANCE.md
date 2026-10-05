# BÁO CÁO NGHIỆM THU E2E TOÀN DIỆN MODULE A4-F — LIÊN KẾT MÃ EGOV ĐỘC LẬP VÀ ĐỐI CHIẾU HỌC PHÍ
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_F5_EGOV_LINK_E2E_ACCEPTANCE`
- **Phân hệ:** A4 – Đối chiếu Hồ sơ & Học phí / Mở rộng F (Nghiệm thu toàn luồng E2E)
- **Môi trường kiểm thử:**
  - **Ứng dụng Web Preview:** AI Studio Preview Environment (Development URL: `https://ais-dev-df2xkzyxuxhn2ya6b3yv34-426538647649.asia-southeast1.run.app`)
  - **Cơ sở dữ liệu:** Supabase PostgreSQL Database (Schema `public`, Migration `20261005000004_lead_egov_links_schema_and_rpc.sql`)
  - **Phiên bản / Commit:** Release Candidate A4-F5 (Oct 2026)
  - **Phạm vi fixture:** Dùng test leads riêng biệt thuộc CTV A (`affiliate_code: CTV001`) và CTV B (`affiliate_code: CTV002`), mã EGOV 7 chữ số (bao gồm mã bắt đầu bằng số 0 như `0012345` và `0099999`), không tác động dữ liệu thật của học sinh.

---

### 1. Chuỗi Kiểm Thử Chính E2E (Bước A – G)

| Bước | Nội Dung Kiểm Thử E2E | Kết Quả Thực Tế | Trạng Thái |
|:---:|:---|:---|:---:|
| **A** | **Khách đăng ký qua link/QR CTV**: Khách mới đăng ký, kiểm tra đúng CTV và khóa học quan tâm. | Hồ sơ tạo thành công gắn đúng CTV, chưa có mã EGOV, chưa nhập học, chưa đối chiếu, chưa thưởng. | **PASS** |
| **B** | **Cập nhật mã trước nhập học**: Staff mở chi tiết từ A3, liên kết mã EGOV (có số 0 đầu `0012345`). | Tạo bản ghi trong `lead_egov_links` với `link_status = 'ACTIVE'`. Trạng thái nhập học, đối chiếu, thưởng không đổi. Hiển thị đồng nhất trên A3, A4 và Cổng CTV A (*"Đã đăng ký hồ sơ EGOV"*). CTV B không đọc được. | **PASS** |
| **C** | **Xác nhận nhập học**: Mở chi tiết từ A4, form tự động nhận mã ACTIVE, xác nhận `MATCHED_VALID` + `ENROLLED`. | Snapshot mã, khóa học, học phí ghi nhận chính xác. Sinh thưởng `PENDING_APPROVAL` đúng CTV. Hiển thị đồng nhất trên mọi màn hình. | **PASS** |
| **D** | **Thử sửa mã khi đối chiếu còn hiệu lực**: Thử sửa mã EGOV khi đang có kết quả đối chiếu ACTIVE. | Hệ thống và API chặn trực tiếp (yêu cầu hủy đối chiếu trước), bảo vệ toàn vẹn snapshot và thưởng. | **PASS** |
| **E** | **Hủy xác nhận nhập học**: Staff hủy kết quả đối chiếu có lý do. | Kết quả đối chiếu và thưởng chuyển `VOIDED`. Liên kết EGOV vẫn giữ nguyên `ACTIVE` với đúng mã `0012345`. CTV vẫn thấy mã và trạng thái đăng ký, nhưng không còn xác nhận nhập học. Lịch sử giữ nguyên. | **PASS** |
| **F** | **Sửa ghép nhầm**: Đổi sang mã EGOV thứ hai (`0099999`), bắt buộc nhập lý do. | Liên kết cũ chuyển `VOIDED`, liên kết mới chuyển `ACTIVE`. Không sinh thưởng mới hay thay đổi snapshot cũ. A3, A4 và CTV cập nhật ngay mã mới. Tìm kiếm bằng mã cũ không trả kết quả lead. | **PASS** |
| **G** | **Xác nhận lại**: Dùng mã thứ hai (`0099999`) để xác nhận nhập học mới. | Tạo bản ghi đối chiếu và thưởng mới hợp lệ độc lập. F5 trình duyệt và đăng nhập lại vẫn giữ nguyên trạng thái chính xác. | **PASS** |

---

### 2. Bảng Ma Trận Các Ca Kiểm Thử Bổ Sung

| STT | Ca Kiểm Thử Bổ Sung | Mô Tả & Điều Kiện | Kết Quả Kiểm Tra | Trạng Thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Định dạng mã EGOV & Số 0 đầu** | Kiểm tra regex `^[0-9]{7}$`, từ chối mã thiếu/thừa số, giữ nguyên số 0 đầu. | Chặn đúng mã sai, lưu chính xác số 0 đầu. | **PASS** |
| 2 | **Chống trùng mã EGOV (Unique constraint)** | Hai lead khác nhau cố gắng liên kết cùng một mã EGOV ACTIVE. | Database unique index `uq_active_external_admission_code` chặn tuyệt đối, trả lỗi xung đột. | **PASS** |
| 3 | **Sửa sang mã trùng & Rollback** | Thử sửa mã hiện hành thành mã đang ACTIVE ở lead khác. | Rollback toàn bộ giao dịch RPC, mã cũ giữ nguyên an toàn. | **PASS** |
| 4 | **Hủy liên kết không có đối chiếu** | Hủy liên kết EGOV khi chưa có đối chiếu phụ thuộc. | Mã hiện hành biến mất hoàn toàn, không fallback sang snapshot đối chiếu cũ. | **PASS** |
| 5 | **EXISTING_IN_SCHOOL_SYSTEM** | Khách đã đăng ký trước qua kênh khác (`ENROLLED` / `NOT_ENROLLED`). | Hiển thị đúng thông điệp cảnh báo, không làm mất mã EGOV. | **PASS** |
| 6 | **Phân quyền bảo mật CTV** | CTV B truy cập lead của CTV A qua API/UI. | Trả 404 / Không tìm thấy thông tin khách hàng. | **PASS** |
| 7 | **Bảo mật API CTV** | Kiểm tra response JSON chi tiết của CTV. | Không rò rỉ user_id xác minh, lý do nội bộ, học phí, biên lai, ngày thu hoặc audit lồng nhau. | **PASS** |
| 8 | **Concurrency & Idempotency** | Gửi đồng thời request liên kết hoặc request với cùng Idempotency-Key. | Xử lý nguyên tử chuẩn xác, không tạo dữ liệu trùng lặp hoặc bản ghi mâu thuẫn. | **PASS** |
| 9 | **Dọn dẹp Fixture & Dữ liệu thật** | Xóa toàn bộ dữ liệu test fixture sau kiểm tra. | Đã dọn dẹp sạch sẽ test leads và test links; bảo toàn 100% dữ liệu thật của trường. | **PASS** |

---

### 3. Kết Luận Nghiệm Thu Toàn Bộ Bản Sửa A4-F

- **Kết luận chung**: **PASS TOÀN BỘ (100% HOÀN THÀNH)**.
- Toàn bộ các yêu cầu từ A4-F1 đến A4-F4 đã được triển khai, kiểm thử E2E và xác thực qua các tầng Database, API và UI.
- Hệ thống sẵn sàng đưa vào vận hành chính thức trên phân hệ Đối chiếu Hồ sơ & Học phí.
