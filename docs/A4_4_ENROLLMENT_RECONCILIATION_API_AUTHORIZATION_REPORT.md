# BÁO CÁO KẾT QUẢ TRIỂN KHAI A4.4 — API VÀ PHÂN QUYỀN ĐỐI CHIẾU HỒ SƠ & HỌC PHÍ
## HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

- **Mã tài liệu:** `A4_4_ENROLLMENT_RECONCILIATION_API_AUTHORIZATION_REPORT`
- **Giai đoạn:** A4 – Đối chiếu hồ sơ & Học phí tuyển sinh
- **Bước thực hiện:** A4.4 – API và Phân quyền đối chiếu hồ sơ
- **Thời gian hoàn tất:** 04/10/2026
- **Tình trạng:** **HOÀN THÀNH 100% (10/10 Test Cases PASS)**

---

### 1. TỔNG QUAN PHẠM VI VÀ KẾT QUẢ THỰC HIỆN

Bước A4.4 tập trung hoàn thiện tầng Backend API (`server.ts`), bảo mật phân quyền theo danh tính thật từ Bearer JWT token (`profiles.role`), kết nối thủ tục cơ sở dữ liệu nguyên tử (`fn_reconcile_lead_and_create_reward`, `fn_void_reconciliation_and_reward`), chống gửi lặp thực thụ (Idempotency Key), kiểm soát xung đột phiên bản đồng thời (`client_updated_at`), bảo vệ thông tin cá nhân khách hàng (che SĐT) và phân định quyền truy cập giữa Cán bộ Tuyển sinh (Staff/Admin) và Cộng tác viên (CTV).

---

### 2. CHI TIẾT DANH MỤC API ĐỐI SOÁT & PHÂN QUYỀN (A4.4)

| STT | Phương thức & Tuyến đường | Quyền truy cập | Mục đích & Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| 1 | `POST /api/v1/admin/leads/:id/reconcile` | Staff / Admin | Ghi nhận kết quả đối soát (`MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`), kiểm soát mã EGOV 7 số, tình trạng nhập học và tạo thưởng PENDING_APPROVAL. |
| 2 | `POST /api/v1/admin/leads/:id/void-reconciliation` | Staff / Admin | Hủy ghép đối soát có lý do bắt buộc, chuyển bản ghi và khoản thưởng liên quan sang `VOIDED`, giải phóng mã EGOV. |
| 3 | `GET /api/v1/admin/leads/:id` | Staff / Admin | Xem chi tiết hồ sơ lead, mã EGOV, học phí đối soát, trạng thái thưởng và ghi chú nội bộ. |
| 4 | `GET /api/v1/admin/leads/:id/history` | Staff / Admin | Lấy toàn bộ lịch sử tư vấn, đối soát và thưởng gắn với audit logs của cán bộ. |
| 5 | `GET /api/v1/affiliate/leads` | CTV (Active) | Xem danh sách khách được giới thiệu (SĐT bị che 4 số cuối `090812****`, không lộ ghi chú nội bộ). |
| 6 | `GET /api/v1/affiliate/leads/:id` | CTV (Active) | Xem chi tiết khách thuộc quyền sở hữu CTV (chặn xem khách của CTV khác). |
| 7 | `GET /api/v1/affiliate/leads/:id/history` | CTV (Active) | Xem dòng thời gian đăng ký & nhập học (chỉ hiển thị sự kiện công khai, ẩn danh tính cán bộ). |

---

### 3. KIỂM THỬ VÀ XÁC NHẬN CHỮ KÝ THIẾU SÓT A4.3 ĐÃ KHẮC PHỤC

1. **Nhận tình trạng nhập học do cán bộ xác minh:** API nhận `admission_status` do cán bộ chọn từ giao diện (`ENROLLED` hoặc `NOT_ENROLLED`).
2. **`EXISTING_IN_SCHOOL_SYSTEM` hỗ trợ cả 2 trạng thái:** Hỗ trợ `admission_status` là `ENROLLED` (nếu trường đã tick nhập học) hoặc `NOT_ENROLLED` (nếu chỉ mới đăng ký). Thưởng luôn là `NONE`.
3. **Lưu trữ lịch sử:** Cột `admission_status` trên `lead_reconciliations` lưu giữ chính xác trạng thái nhập học tại thời điểm đối soát.
4. **`MATCHED_VALID` bắt buộc `ENROLLED`:** Chặn 400 nếu truyền `NOT_ENROLLED` cho đối soát hợp lệ.
5. **Chặn `WITHDRAWN`:** Nghiệp vụ rút hồ sơ chưa được mở qua API A4.4.
6. **Chống gửi lặp thực thụ (Idempotency Key):**
   - Header `Idempotency-Key` bắt buộc.
   - Gửi lại cùng key và payload: trả về kết quả đã cache kèm cờ `is_idempotent_replay: true`.
   - Gửi lại cùng key nhưng khác payload: trả về lỗi xung đột `409 IDEMPOTENCY_PAYLOAD_MISMATCH`.
7. **Hủy đối soát đích danh:** Nhận `target_reconciliation_id`, chuyển cả đối soát và thưởng sang `VOIDED`.
8. **Chống giả mạo danh tính:** `actorId` và `role` được lấy từ phiên đăng nhập backend đã giải mã token JWT, không nhận từ client request body.
9. **Snapshot học phí:** Độc lập với danh mục khóa học, bảo toàn nguyên vẹn giá trị khi danh mục cập nhật.

---

### 4. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (`verify_a4_4_reconciliation_api.ts`)

```
==============================================================================
KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG A4.4: BACKEND API & PHÂN QUYỀN ĐỐI CHIẾU HỒ SƠ
==============================================================================
[PASS] TC-A4.4-01: Validate Định dạng Mã EGOV 7 chữ số & Ràng buộc MATCHED_VALID
[PASS] TC-A4.4-02: Chặn truyền trạng thái WITHDRAWN qua API đối soát
[PASS] TC-A4.4-03: Đối soát hợp lệ MATCHED_VALID & Khởi tạo Thưởng CTV 500k PENDING_APPROVAL
[PASS] TC-A4.4-04: Chống ghép trùng Mã EGOV (Duplicate EGOV Code Check)
[PASS] TC-A4.4-05: Đối soát EXISTING_IN_SCHOOL_SYSTEM (Bắt buộc lý do, không sinh thưởng)
[PASS] TC-A4.4-06: Đối soát MISMATCH_INVALID (Thông tin không khớp, bắt buộc lý do)
[PASS] TC-A4.4-07: Kiểm thử Idempotency: Replay thành công & Phát hiện xung đột Payload
[PASS] TC-A4.4-08: Hủy ghép đối soát có lý do: Chuyển VOIDED và Giải phóng Mã EGOV
[PASS] TC-A4.4-09: Bảo mật Phân quyền CTV: Che SĐT, Ẩn Ghi chú Nội bộ Cán bộ & Phạm vi Dữ liệu
[PASS] TC-A4.4-10: Bảo toàn Snapshot Học phí Khóa học (Snapshot Tuition Fee Preservation)
==============================================================================
TỔNG KẾT KẾT QUẢ KIỂM THỬ A4.4: 10/10 PASS (100%)
==============================================================================
```

---

### 5. TRẠNG THÁI VÀ BÀN GIAO CHO BƯỚC A4.5

- **Phần đã hoàn thành:** Toàn bộ Backend API đối soát, phân quyền bảo mật, xử lý lỗi chi tiết, cơ chế chống gửi lặp, hủy ghép có lý do và bảo toàn dữ liệu.
- **Phần chưa triển khai (dành cho A4.5 & A4.6):** Giao diện Modal đối soát hồ sơ Admin/Staff (A4.5) và Giao diện xem chi tiết hồ sơ CTV (A4.6).
- **Dữ liệu thật:** Được bảo toàn nguyên vẹn 100%.
