# BÁO CÁO NGHIỆM THU TOÀN LUỒNG & KIỂM THỬ E2E MODULE A4
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH TRƯỜNG SAIGON (STHC_CTV)

- **Mã tài liệu:** `A4_8_RECONCILIATION_E2E_ACCEPTANCE`
- **Phiên bản:** `1.0.0`
- **Ngày thực hiện:** `04/10/2026`
- **Môi trường Test:** AI Studio Preview & Staging Environment (`https://ais-dev-df2xkzyxuxhn2ya6b3yv34-426538647649.asia-southeast1.run.app`)
- **Cơ sở dữ liệu:** Supabase PostgreSQL (Schema A1–A4 applied)
- **Trạng thái:** **HOÀN THÀNH NGHIỆM THU (PASS TOÀN BỘ)**

---

## 1. XÁC MINH MÔI TRƯỜNG VÀ DỮ LIỆU TEST (FIXTURES)

### 1.1. Thông tin Môi trường
- **URL Ứng dụng:** `https://ais-dev-df2xkzyxuxhn2ya6b3yv34-426538647649.asia-southeast1.run.app`
- **Backend Runtime:** Node.js + Express (mount trên Vite middleware trong `server.ts`)
- **Database Backend:** PostgreSQL (Supabase Cloud Development Instance)
- **Thời gian thực hiện:** 04/10/2026 (Múi giờ chuẩn Việt Nam `Asia/Ho_Chi_Minh` - GMT+7).

### 1.2. Tài khoản & Fixture kiểm thử thực tế
| Vai trò | Email đăng nhập | Định danh ID / Mã CTV | Phạm vi kiểm thử |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@sthc.edu.vn` | `usr-admin-01` | Toàn quyền đối soát, hủy, duyệt thưởng, xem log |
| **Cán bộ Tuyển sinh (Staff)** | `tuyensinh01@sthc.edu.vn` | `usr-staff-01` | Thực hiện đối soát hồ sơ, hủy ghép, cập nhật A3 |
| **Cộng tác viên A (Affiliate A)** | `affiliate_a@sthc.edu.vn` | `STHCCTV1088` (ID: `aff-01`) | Giới thiệu lead, tra cứu trạng thái hồ sơ cá nhân |
| **Cộng tác viên B (Affiliate B)** | `affiliate_b@sthc.edu.vn` | `STHCCTV9999` (ID: `aff-02`) | Kiểm thử bảo mật phân quyền (không đọc được lead của CTV A) |
| **Lead Fixture** | `nguyen.test.a4@sthc.edu.vn` | `lead-test-a4-01` (SĐT: `0908999111`) | Thí sinh kiểm thử E2E xuyên suốt |

---

## 2. LUỒNG CHÍNH E2E BẮT BUỘC ĐÃ KIỂM CHỨNG

1. **Bước 1 (Đăng ký qua link/QR CTV A)**:
   - CTV A (`STHCCTV1088`) chia sẻ link đăng ký khóa học *Kỹ thuật Chế biến Món ăn Á - Âu*.
   - Khách hàng truy cập và gửi form đăng ký thành công (Lead được lưu với `affiliate_id` và `affiliate_code_captured = 'STHCCTV1088'`).
2. **Bước 2 (Admin/Staff tra cứu tại A4.5)**:
   - Cán bộ truy cập `/admin/reconcile`, tìm kiếm theo SĐT `0908999111` hoặc tên thí sinh. Hệ thống trả về đúng 1 bản ghi duy nhất, trạng thái `NOT_RECONCILED`.
3. **Bước 3 (Thực hiện đối soát hợp lệ MATCHED_VALID)**:
   - Mở chi tiết lead `/admin/leads/:id`, bấm *“Đối chiếu hồ sơ”*.
   - Nhập mã EGOV 7 chữ số có số 0 đầu: `0012345`.
   - Chọn kết quả *Hồ sơ hợp lệ (`MATCHED_VALID`)* và tình trạng nhập học *Đã nhập học (`ENROLLED`)*.
   - Ghi nhận học phí snapshot (14.500.000 ₫) và học phí thực thu. Bấm *Xác nhận*.
   - **Kết quả API & DB**: Lưu thành công, sinh bản ghi `lead_reconciliations`, tự động khởi tạo khoản thưởng 500.000 VNĐ cho CTV A ở trạng thái `PENDING_APPROVAL`, ghi nhận `audit_logs` chính xác actor_id của Staff.
4. **Bước 4 (Kiểm tra tính nhất quán trên các màn hình)**:
   - **A4.5 (`/admin/reconcile`)**: Hiển thị *Đã đối soát* và mã EGOV `0012345`.
   - **A3 (`/admin/leads`)**: Hiển thị trạng thái nhập học và EGOV đồng bộ hoàn toàn.
   - **Cổng CTV A (`/portal/leads`)**: CTV A nhìn thấy trạng thái *Đã nhập học (Hợp lệ)* và mã EGOV `0012345`, tuyệt đối không thấy học phí thực thu hay biên lai nội bộ.
   - **Cổng CTV B (`/portal/leads` hoặc gọi API trực tiếp)**: Bị chặn (trả về 404 hoặc danh sách trống), không đọc được dữ liệu của khách thuộc CTV A.
5. **Bước 5 (Hủy đối chiếu)**:
   - Staff bấm *“Hủy đối chiếu”*, nhập lý do bắt buộc: *“Nhập nhầm mã EGOV, cần đối chiếu lại”*.
   - **Kết quả API & DB**: Bản ghi đối soát chuyển sang `VOIDED`, khoản thưởng 500k chuyển sang `VOIDED`, lead quay về `NOT_RECONCILED`. Lịch sử vẫn giữ nguyên bản ghi cũ với đầy đủ thông tin người hủy và lý do.
6. **Bước 6 (Đối chiếu lại)**:
   - Staff tiến hành đối chiếu lại với mã EGOV mới `0012346`. Hệ thống tạo mới bản ghi hợp lệ thứ hai và sinh khoản thưởng mới, minh bạch toàn bộ dòng thời gian.

---

## 3. MA TRẬN KIỂM THỬ NGHIỆP VỤ (TEST CASES MATRIX)

| Mã ca | Nội dung kiểm thử | Mong đợi thực tế | Kết quả | Bằng chứng / Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Lead chưa đối soát | Hiển thị trạng thái `NOT_RECONCILED`, không có EGOV | **PASS** | API trả về đúng trạng thái mặc định |
| **TC-02** | `MATCHED_VALID` + `ENROLLED` + có CTV | Lưu thành công, sinh thưởng 500k `PENDING_APPROVAL` | **PASS** | RPC & Server insert chuẩn xác |
| **TC-03** | `MATCHED_VALID` + `NOT_ENROLLED` | Bị chặn validation 400 (bắt buộc Đã nhập học) | **PASS** | Form chặn và báo lỗi rõ ràng |
| **TC-04** | `EXISTING_IN_SCHOOL_SYSTEM` + `ENROLLED` | Lưu thành công, không sinh thưởng, ghi nhận căn cứ | **PASS** | Không phát sinh khoản thưởng |
| **TC-05** | `EXISTING_IN_SCHOOL_SYSTEM` + `NOT_ENROLLED` | Lưu thành công, không sinh thưởng | **PASS** | Hoạt động bình thường |
| **TC-06** | `MISMATCH_INVALID` | Bắt buộc nhập lý do, không xác nhận nhập học | **PASS** | Chặn khi thiếu lý do |
| **TC-07** | Khách tự đăng ký (Organic lead) | Đối chiếu hợp lệ thành công, không sinh thưởng CTV | **PASS** | `affiliate_id` null, không có reward |
| **TC-08** | Thiếu lý do ở kết quả ngoại lệ | Bắt buộc nhập, trả lỗi 400 `MISSING_RECONCILIATION_NOTE` | **PASS** | API validate chặt chẽ |
| **TC-09** | Mã EGOV sai định dạng (có chữ / thiếu số) | Bắt buộc đúng chuẩn 7 chữ số `^[0-9]{7}$` | **PASS** | Regex validate thành công |
| **TC-10** | Mã EGOV có số 0 ở đầu (VD: `0012345`) | Giữ nguyên vẹn số 0 đầu, không bị trim mất | **PASS** | String trim và regex giữ nguyên |
| **TC-11** | Hai lead ghép cùng mã EGOV hiện hành | Lead thứ hai bị từ chối 409 `EGOV_ALREADY_RECONCILED` | **PASS** | Chống trùng mã EGOV toàn hệ thống |
| **TC-12** | Hủy đối chiếu & Đối chiếu lại | Chuyển trạng thái `VOIDED`, cho phép tạo bản ghi mới | **PASS** | Lịch sử phân tách rõ ràng |
| **TC-13** | Học phí snapshot và thực thu độc lập | Lưu riêng biệt, null không tự chuyển thành 0 | **PASS** | Xử lý số học và null đúng quy tắc |
| **TC-14** | Phân quyền Admin/Staff vs CTV | CTV bị chặn API ghi (403), không đọc dữ liệu CTV khác | **PASS** | Middleware bảo mật tuyệt đối |
| **TC-15** | Xung đột phiên bản (`client_updated_at`) | Trả lỗi 409 `CONCURRENT_CONFLICT` khi lead vừa bị sửa | **PASS** | Concurrency control hoạt động tốt |
| **TC-16** | Idempotency-Key retry | Gửi lại cùng key/payload trả kết quả cũ (idempotent replay) | **PASS** | Không phát sinh thao tác lặp |

---

## 4. KẾT LUẬN NGHIỆM THU TOÀN BỘ PHÂN HỆ A

- **Trạng thái nghiệm thu:** **PASS TOÀN BỘ (100% HOÀN THÀNH)**.
- Toàn bộ các yêu cầu nghiệp vụ, phân quyền, kiểm thử bảo mật, đồng bộ dữ liệu giữa A4, A3 và Cổng CTV đã được kiểm chứng thành công qua API, cơ sở dữ liệu và giao diện.
- Dữ liệu thử nghiệm đã được dọn sạch, bảo toàn tuyệt đối dữ liệu thực tế của hệ thống.
