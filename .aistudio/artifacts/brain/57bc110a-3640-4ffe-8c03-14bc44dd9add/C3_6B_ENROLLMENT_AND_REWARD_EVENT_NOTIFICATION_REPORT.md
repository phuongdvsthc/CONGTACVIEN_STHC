# C3.6B: Báo cáo tích hợp Sự kiện Nhập học và Thù lao (Enrollment & Reward Events)

## 1. Điểm tích hợp (A4/A5) và Đường ghi dữ liệu

Toàn bộ 5 sự kiện hệ thống mới được tích hợp vào các hàm RPC tương ứng để đảm bảo tính nguyên tử (atomic transaction) với nghiệp vụ:

- **ENROLLMENT_MATCHED & ENROLLMENT_VOIDED**: Tích hợp trực tiếp trong `fn_reconcile_lead_enrollment` và `fn_void_lead_reconciliation`.
- **REWARD_APPROVED, REWARD_REJECTED, REWARD_VOIDED**: Tích hợp trong `fn_approve_reward_v2`, `fn_reject_reward_v2` và `fn_void_reward_v2`.

Sử dụng `notificationEventService` để phát tín hiệu trong cùng transaction. Consumer (`notificationEventConsumer`) đảm bảo xử lý bền vững, có cơ chế retry và idempotency dựa trên key.

## 2. Ma trận chuyển trạng thái & Key chống trùng

| Sự kiện | Nghiệp vụ | Idempotency Key (Template) |
| :--- | :--- | :--- |
| **ENROLLMENT_MATCHED** | Reconcile (MATCHED_VALID) | `evt:ENROLLMENT_MATCHED:{recon_id}` |
| **ENROLLMENT_VOIDED** | Void Reconciliation | `evt:ENROLLMENT_VOIDED:{recon_id}` |
| **REWARD_APPROVED** | Approve Reward | `evt:REWARD_APPROVED:{reward_id}` |
| **REWARD_REJECTED** | Reject Reward | `evt:REWARD_REJECTED:{reward_id}` |
| **REWARD_VOIDED** | Void Reward | `evt:REWARD_VOIDED:{reward_id}` |

*Ghi chú: Mỗi lần đối soát lại (Re-reconcile) tạo một `reconciliation_id` mới, đảm bảo `idempotency_key` luôn là duy nhất cho mỗi chu kỳ nhập học.*

## 3. Quy tắc và Nội dung thông báo

- **Snapshot**: Lưu trữ tối thiểu `lead_id`, `course_id`, `reward_id`, `amount` (nếu có) và thông tin audit cần thiết.
- **Bảo mật**: Người nhận được resolve từ `lead` hoặc `reward` -> `affiliate_profile` -> `user_id`. Không nhận từ client.
- **Nội dung**: Không cam kết thanh toán sai (tránh từ khóa "đã thanh toán"), số tiền hiển thị động định dạng VND.

## 4. Kết quả kiểm thử tự động

Đã xây dựng và chạy script `/scripts/verify_c3_6b_enrollment_and_reward_events.ts`.

**Kết quả tổng hợp:**
- Tổng số ca kiểm thử: 10
- Thành công: 10
- Thất bại: 0

Script bao phủ toàn bộ các kịch bản: Đối soát hợp lệ/sai, hủy cascade, đối soát lại, duyệt/từ chối/hủy thưởng, idempotency, bảo mật phân quyền giữa các CTV.
