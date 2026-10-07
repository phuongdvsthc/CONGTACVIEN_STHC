# A5.3A–A5.3B – Báo cáo Triển khai Phê duyệt, Từ chối và Hủy Khoản Thù Lao CTV (STHC_CTV)

- **Mã định danh bước:** A5.3A–A5.3B
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm thực hiện:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT TRIỂN KHAI VÀ KIỂM THỬ XÂY DỰNG

---

## 1. Ma trận Chuyển trạng thái và Phân quyền (`rewards.approve`, `rewards.reject`, `rewards.void`)

| Trạng thái hiện tại | Thao tác | Trạng thái mới | Quyền yêu cầu | Mô tả quy tắc nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `PENDING_APPROVAL` | Duyệt | `APPROVED` | `rewards.approve` (+ `rewards.view`, `rewards.view_detail`) | Phê duyệt khoản thưởng 500.000 VNĐ; đồng bộ trạng thái `APPROVED` trên bảng `leads`. |
| `PENDING_APPROVAL` | Từ chối | `REJECTED` | `rewards.reject` (+ `rewards.view`, `rewards.view_detail`) | Từ chối khoản thưởng kèm lý do bắt buộc (`rejection_reason`). Không thể đảo ngược trực tiếp. |
| `PENDING_APPROVAL` | Hủy trực tiếp | `VOIDED` | `rewards.void` (+ `rewards.view`, `rewards.view_detail`) | Hủy hiệu lực khoản thù lao; giữ nguyên kết quả đối chiếu và mã EGOV tại A4. |
| `APPROVED` | Hủy trực tiếp | `VOIDED` | `rewards.void` (+ `rewards.view`, `rewards.view_detail`) | Hủy khoản đã duyệt; lưu vết lý do `void_reason` và actor thực hiện. |

---

## 2. API Contract và Mã lỗi chuẩn (Error Handling)

- `POST /api/v1/admin/rewards/:id/approve`
- `POST /api/v1/admin/rewards/:id/reject` (Body: `{ rejection_reason }`)
- `POST /api/v1/admin/rewards/:id/void` (Body: `{ void_reason }`)

**Các mã lỗi phản hồi tiêu chuẩn:**
- `401 Unauthorized`: Chưa đăng nhập hoặc phiên làm việc hết hạn.
- `403 Forbidden`: Tài khoản không có quyền thao tác tương ứng (`rewards.approve`, `rewards.reject`, `rewards.void`).
- `400 Bad Request`: ID sai định dạng, thiếu hoặc rỗng lý do từ chối/hủy.
- `404 Not Found`: Khoản thù lao không tồn tại sau khi kiểm quyền.
- `409 Conflict`: Xung đột phiên bản, trạng thái khoản đã thay đổi hoặc căn cứ đối chiếu đã bị hủy.
- `500 Internal Server Error`: Lỗi máy chủ hoặc ngoại lệ cơ sở dữ liệu.

---

## 3. Điều kiện Duyệt và Nguồn Căn cứ (Basis Checks)
Trong transaction xử lý tại database (`fn_approve_reward`), hệ thống thực hiện kiểm tra ngặt nghèo:
1. Khoản thù lao tồn tại và đang ở trạng thái `PENDING_APPROVAL`.
2. Lần đối chiếu (`reconciliation_id`) làm căn cứ vẫn tồn tại và không bị hủy (`reconciliation_status <> 'VOIDED'`).
3. Số tiền hợp lệ theo quy định (`500.000 VNĐ`).
4. Không có xung đột trùng lặp bản ghi thưởng hiệu lực trên cùng một hồ sơ thí sinh.

---

## 4. Transaction, Khóa đồng thời và Kiểm toán (Audit)
- **Transaction & Lock:** Sử dụng `FOR UPDATE` khi đọc bản ghi thưởng để ngăn chặn xung đột xử lý đồng thời (race condition / deadlock).
- **Audit Logs:** Mỗi thao tác duyệt, từ chối hay hủy đều được ghi vết đầy đủ vào bảng `audit_logs` với đầy đủ thông tin: `actor_id`, `action` (`APPROVE_REWARD`, `REJECT_REWARD`, `VOID_REWARD`), `entity_id`, trạng thái cũ/mới, lý do và thời gian máy chủ.
- **Đồng bộ Lead & Dashboard CTV:** Trạng thái `reward_status` của thí sinh trên bảng `leads` được cập nhật đồng bộ trong cùng transaction. Số liệu thống kê trên Dashboard CTV tự động phản ánh chính xác (các khoản `REJECTED`/`VOIDED` không cộng vào tổng thù lao hiệu lực).

---

## 5. Phân biệt Hủy A5 với Hủy Đối chiếu A4
- **Hủy đối chiếu A4:** Thực hiện bởi cán bộ A4 trên kết quả đối chiếu học phí. Khi hủy đối chiếu hợp lệ, khoản thù lao liên quan sẽ tự động chuyển sang `VOIDED` trong cùng transaction, **ngay cả khi staff đó không có quyền `rewards.void` ở A5** nhằm bảo đảm tính đồng bộ dữ liệu.
- **Hủy trực tiếp A5 (`rewards.void`):** Thực hiện trực tiếp trên bản ghi thưởng tại A5 bởi nhân viên có quyền `rewards.void`. Thao tác này **không làm thay đổi kết quả đối chiếu A4 hay mã hồ sơ EGOV**.

---

## 6. Kết quả Kiểm thử Ca (Test Cases Summary)
1. **Admin / Staff có quyền thao tác đúng:** Thành công (200 OK).
2. **Staff chỉ có quyền xem (`reward_viewer`) gọi API ghi:** Bị chặn thành công (403 Forbidden).
3. **Thu hồi quyền giữa lúc mở modal và gửi request:** Bị chặn thành công qua middleware kiểm quyền thời gian thực.
4. **Lý do rỗng hoặc khoảng trắng:** Bị chặn tại backend (400 Bad Request).
5. **Khoản đã duyệt (`APPROVED`) cố chuyển thành `REJECTED`:** Bị chặn theo quy tắc ma trận.
6. **Hủy trực tiếp A5 không làm mất kết quả đối chiếu A4:** Đã xác thực bảo toàn dữ liệu liên kết.
7. **Đồng thời duyệt và hủy đối chiếu:** Đảm bảo tính nguyên tử (atomic) không tạo kết quả mâu thuẫn.

---

## 7. Các bước tiếp theo (A5.4 & A5.5)
- **A5.4:** Tổng hợp thù lao theo CTV và xuất báo cáo thật phục vụ Phòng Kế toán.
- **A5.5:** Nghiệm thu toàn diện module A5.
