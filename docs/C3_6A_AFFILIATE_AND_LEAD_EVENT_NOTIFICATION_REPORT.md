# BÁO CÁO KỸ THUẬT VÀ NGHIỆM THU BƯỚC C3.6A
## SỰ KIỆN HỒ SƠ CỘNG TÁC VIÊN VÀ KHÁCH HÀNG MỚI ĐĂNG KÝ (SYSTEM EVENT NOTIFICATIONS)
**Dự án**: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/C3_6A_AFFILIATE_AND_LEAD_EVENT_NOTIFICATION_REPORT.md`  
**Ngày thực hiện**: 08/10/2026  
**Trạng thái**: **HOÀN THÀNH 100% (ACCEPTANCE CRITERIA PASSED - 9/9 TEST CASES)**  
**Phạm vi**: Nghiệp vụ A1 (Phê duyệt, Từ chối, Tạm ngưng, Kích hoạt lại CTV) & A3 (Khách hàng gửi form tư vấn hợp lệ), Event Outbox Queue, Khóa chống trùng lặp Idempotency Key, Consumer ngầm & Retry Backoff, Kiểm thử tự động E2E.

---

## 1. TỔNG QUAN VÀ MỤC TIÊU BƯỚC C3.6A

Tiếp nối cơ chế phân quyền, hàng đợi sự kiện (C3.3B), API hòm thư CTV (C3.4A/B) và giao diện quản lý thông báo BQT (C3.5A/B), bước **C3.6A** tập trung xây dựng chu trình tạo thông báo tự động (loại `SYSTEM`, nguồn `event`) đến hòm thư CTV sau khi hoàn tất các nghiệp vụ thực tế:
1. **AFFILIATE_APPROVED**: Ban Quản trị phê duyệt hồ sơ CTV (Nghiệp vụ A1.3).
2. **AFFILIATE_REJECTED**: Ban Quản trị từ chối hồ sơ CTV (Nghiệp vụ A1.3).
3. **AFFILIATE_SUSPENDED**: Ban Quản trị tạm ngưng hoạt động của CTV (Nghiệp vụ A1.4).
4. **AFFILIATE_REACTIVATED**: Ban Quản trị kích hoạt lại hoạt động của CTV (Nghiệp vụ A1.4).
5. **LEAD_SUBMITTED**: Người học gửi biểu mẫu đăng ký tư vấn tuyển sinh thành công qua đường dẫn/mã giới thiệu CTV (Nghiệp vụ A3.1).

> **Nguyên tắc nghiệp vụ nghiêm ngặt**:
> - Không tạo thông báo chào mừng rác hoặc thông báo đăng ký tài khoản tự động chưa được duyệt.
> - Không tạo thông báo khi cập nhật ghi chú tư vấn nội bộ của cán bộ.
> - Chỉ tạo thông báo khi nghiệp vụ và nhật ký kiểm toán thực sự được lưu thành công vào CSDL.
> - Mỗi lần chuyển trạng thái hợp lệ (kể cả chuyển lại trạng thái cũ sau một chu kỳ khác) phải sinh một sự kiện độc lập.

---

## 2. KIỂM TRA VÀ HOÀN THIỆN NỀN TẢNG SỰ KIỆN (EVENT FOUNDATION AUDIT)

Trước khi tích hợp vào nghiệp vụ A1 và A3, toàn bộ nền tảng sự kiện đã được rà soát và khắc phục các điểm rủi ro:

| Vấn đề rủi ro | Hiện trạng cũ | Giải pháp hoàn thiện trong C3.6A |
|:---|:---|:---|
| **Trùng lặp khóa khi chuyển trạng thái lặp lại** | Sử dụng key dạng `evt:{event_type}:{source_id}:{transition_state}` dẫn đến việc CTV bị tạm ngưng lần 2 (sau khi kích hoạt lại) bị coi là trùng lặp và nuốt mất sự kiện. | Chuẩn hóa key theo định danh kiểm toán duy nhất: `evt:{event_type}:{audit_id}` (đối với A1) và `evt:LEAD_SUBMITTED:{lead_id}` (đối với A3). Mỗi lần chuyển trạng thái có 1 `audit_id` độc lập. |
| **Rollback mất lịch sử lỗi khi gặp Exception** | Hàm `fn_process_notification_event` cũ ghi `last_error` rồi `RAISE EXCEPTION`, làm rollback toàn bộ giao dịch bao gồm cả trạng thái lỗi vừa cập nhật. | Nâng cấp exception handler: Cập nhật bền vững `status = FAILED/DEAD_LETTER`, `last_error`, `retry_count + 1` và trả về kết quả lỗi có cấu trúc (`success: false, error: ...`) mà không raise unhandled exception. |
| **Thiếu cơ chế xử lý đồng thời và Worker Lease** | Lệnh `FOR UPDATE` đơn thuần không có hàng đợi phân tán, nguy cơ kẹt lock hoặc nhiều worker cùng xử lý 1 batch. | Bổ sung `NotificationEventConsumer` độc lập chạy ngầm tại backend (Node.js/Express) với worker lease, cơ chế phục hồi stale locks tự động (`recoverStaleLocks`) và exponential backoff. |
| **Sai lệch tuyến đường điều hướng** | Các tài liệu cũ trỏ về `/portal/dashboard`, `/portal/profile`, `/portal/rewards`. | Đối chiếu và chuẩn hóa 100% khớp với `APP_ROUTES` thực tế của ứng dụng: `/portal` (Bàn làm việc CTV), `/portal/leads` (Khách hàng giới thiệu), `/pending` (Hồ sơ chờ duyệt/tạm ngưng). |
| **Bảo mật RPC nội bộ (Security Hardening)** | Các hàm sự kiện có nguy cơ bị `anon` hoặc `authenticated` gọi trực tiếp. | Thu hồi toàn bộ quyền (`REVOKE ALL`) từ `PUBLIC`, `anon`, `authenticated`. Chỉ cấp quyền thực thi cho `service_role`. |

---

## 3. LẦN THEO ĐƯỜNG GHI VÀ TÍNH NGUYÊN TỬ (A1 & A3 DATA PATHS)

### 3.1. Phân hệ A1: Phê duyệt, Từ chối, Tạm ngưng và Kích hoạt lại CTV
- **Endpoints**:
  - `POST /api/v1/admin/affiliates/:id/approve`
  - `POST /api/v1/admin/affiliates/:id/reject`
  - `POST /api/v1/admin/affiliates/:id/suspend`
  - `POST /api/v1/admin/affiliates/:id/reactivate`
- **Đường ghi dữ liệu**:
  1. Cập nhật trạng thái trong `affiliate_profiles`:
     - Phê duyệt: `PENDING_REVIEW` -> `ACTIVE`
     - Từ chối: `PENDING_REVIEW` -> `REJECTED`
     - Tạm ngưng: `ACTIVE` -> `SUSPENDED`
     - Kích hoạt lại: `SUSPENDED` -> `ACTIVE`
  2. Ghi nhận nhật ký kiểm toán vào bảng `audit_logs` với `action` tương ứng và lấy về `audit_logs.id`.
  3. Phát sinh sự kiện thông báo tương ứng qua `notificationEventService.emitAffiliateLifecycleEvent` với `idempotency_key = evt:{action}:{audit_id}`.
- **Tính nguyên tử và Rollback**:
  - Khi cập nhật CSDL thất bại (ví dụ: xung đột trạng thái, lỗi kiểm tra điều kiện), yêu cầu bị chặn ngay lập tức, không ghi audit log và không phát sinh sự kiện.
  - Sau khi audit log được lưu thành công, sự kiện được ghi nhận vào `notification_events`. Nếu quá trình sinh thông báo gặp sự cố, nghiệp vụ thay đổi hồ sơ CTV vẫn được bảo toàn (không rollback nghiệp vụ sau commit), sự kiện được lưu trạng thái `PENDING`/`FAILED` và được worker tự động thử lại sau đó.

### 3.2. Phân hệ A3: Tiếp nhận khách hàng gửi form tư vấn (Leads)
- **Endpoint**: `POST /api/v1/public/leads`
- **Đường ghi dữ liệu**:
  1. Xác minh chấp thuận Nghị định 13/2023/NĐ-CP và kiểm tra tính hợp lệ của số điện thoại, khóa học.
  2. Kiểm tra điều kiện mã giới thiệu qua `checkAffiliateReferralEligibility`:
     - Chỉ chấp nhận CTV có trạng thái `ACTIVE`.
     - Nếu CTV đang `SUSPENDED`, từ chối tiếp nhận với mã lỗi `AFFILIATE_SUSPENDED`.
     - Nếu CTV chưa kích hoạt (`PENDING_REVIEW` hoặc `REJECTED`), từ chối với mã lỗi `AFFILIATE_NOT_ACTIVE`.
  3. Kiểm tra chống trùng lặp theo số điện thoại và khóa học trong vòng 90 ngày:
     - Nếu phát hiện trùng lặp (`isDuplicate = true`): **Tuyệt đối không chèn bản ghi lead mới vào CSDL, không ghi nhận sự kiện, không gửi thông báo mới cho CTV.**
     - Nếu là khách hàng mới: Chèn bản ghi vào bảng `leads`, thu được `lead.id`.
  4. Phát sinh sự kiện qua `notificationEventService.emitLeadSubmittedEvent` với `idempotency_key = evt:LEAD_SUBMITTED:{lead_id}`.

---

## 4. THIẾT KẾ KHÓA CHỐNG TRÙNG LẶP (IDEMPOTENCY KEY DESIGN)

| Nghiệp vụ | Cú pháp Idempotency Key | Nguồn sinh định danh | Quy tắc chống trùng lặp |
|:---|:---|:---|:---|
| **Duyệt hồ sơ CTV** | `evt:AFFILIATE_APPROVED:{audit_id}` | `audit_logs.id` của lần phê duyệt | Retry cùng request dùng lại `audit_id`, không sinh thêm event. |
| **Từ chối hồ sơ CTV** | `evt:AFFILIATE_REJECTED:{audit_id}` | `audit_logs.id` của lần từ chối | Mỗi lần từ chối có audit record riêng biệt. |
| **Tạm ngưng CTV lần 1** | `evt:AFFILIATE_SUSPENDED:{audit_id_1}` | `audit_logs.id` của lần tạm ngưng 1 | Gắn chặt vào audit log của lần thao tác 1. |
| **Kích hoạt lại CTV** | `evt:AFFILIATE_REACTIVATED:{audit_id_2}` | `audit_logs.id` của lần kích hoạt | Gắn chặt vào audit log của lần kích hoạt. |
| **Tạm ngưng CTV lần 2** | `evt:AFFILIATE_SUSPENDED:{audit_id_3}` | `audit_logs.id` của lần tạm ngưng 2 | `audit_id_3 !== audit_id_1` $\rightarrow$ Sinh event mới hoàn toàn, không bị xung đột với lần tạm ngưng trước đó. |
| **Khách mới đăng ký** | `evt:LEAD_SUBMITTED:{lead_id}` | `leads.id` của lead mới | Chỉ tạo khi có lead mới. Lead trùng trong 90 ngày không tạo event mới. |

---

## 5. ÁNH XẠ NGƯỜI NHẬN VÀ BẢO MẬT DỮ LIỆU (RECIPIENT & PAYLOAD SANITIZATION)

### 5.1. Quy tắc ánh xạ người nhận
- **Đối với nghiệp vụ A1**:
  - Người nhận bắt buộc phải là `user_id` của hồ sơ CTV được thao tác (`affiliate_profiles.user_id` liên kết tới `profiles.id`).
  - **Tuyệt đối không gửi cho Cán bộ Tuyển sinh đang thực hiện thao tác duyệt/khóa.**
- **Đối với nghiệp vụ A3**:
  - Tra cứu CTV sở hữu mã `ref_code` từ CSDL backend, kiểm tra `is_active = true`.
  - Người nhận là `user_id` của CTV sở hữu mã giới thiệu.
  - **Không tin cậy bất kỳ tham số `affiliate_id` hay `user_id` nào do client gửi lên.**
- **Xử lý khi thiếu thông tin người nhận**:
  - Nếu không tìm thấy `user_id` tương ứng, hệ thống ghi log cảnh báo và bỏ qua việc tạo thông báo.
  - **Tuyệt đối không gửi nhầm sang Admin hoặc broadcast toàn bộ mạng lưới CTV.**

### 5.2. Bảo vệ dữ liệu nhạy cảm (PII & Security Sanitization)
Trong `payload` của sự kiện và `metadata` của thông báo:
- **Được phép lưu**: `lead_id`, `lead_name`, `course_id`, `course_name`, `affiliate_code`, `status`, `reason`, `audit_log_id`, `created_at`.
- **Tuyệt đối không lưu**: Số CMND/CCCD, mật khẩu, JWT token, mã OTP, số tài khoản ngân hàng, thông tin thẻ tín dụng, ghi chú tư vấn nội bộ của cán bộ tuyển sinh.

---

## 6. NỘI DUNG VÀ ĐÍCH ĐIỀU HƯỚNG CHUẨN NGHIỆP VỤ

| Sự kiện | Tiêu đề (`title`) | Tóm tắt (`summary`) | Đích điều hướng (`action_url`) | Phân loại |
|:---|:---|:---|:---|:---|
| **AFFILIATE_APPROVED** | Hồ sơ CTV đã được duyệt | Chúc mừng! Hồ sơ CTV {affiliate_code} của bạn đã được phê duyệt. | `/portal` | `SYSTEM` / `ACCOUNT` |
| **AFFILIATE_REJECTED** | Hồ sơ CTV chưa được duyệt | Hồ sơ đăng ký cộng tác viên tuyển sinh chưa được phê duyệt. Lý do: {reason} | `/pending` | `SYSTEM` / `ACCOUNT` |
| **AFFILIATE_SUSPENDED** | Tài khoản CTV đã bị tạm ngưng | Tài khoản cộng tác viên của bạn đã bị tạm dừng hoạt động. Lý do: {reason}. Vui lòng liên hệ hỗ trợ. | `/pending` | `SYSTEM` / `ACCOUNT` |
| **AFFILIATE_REACTIVATED** | Tài khoản CTV đã được kích hoạt lại | Tài khoản cộng tác viên của bạn đã được kích hoạt lại và có thể tiếp tục hoạt động. | `/portal` | `SYSTEM` / `ACCOUNT` |
| **LEAD_SUBMITTED** | Có khách hàng mới đăng ký qua link giới thiệu | Khách hàng {lead_name} đã đăng ký khóa học {course_name} qua mã giới thiệu của bạn. | `/portal/leads` | `SYSTEM` / `LEAD` |

---

## 7. KIẾN TRÚC OUTBOX CONSUMER & CƠ CHẾ THỬ LẠI (CONSUMER & RETRY ENGINE)

Hệ thống triển khai service `NotificationEventConsumer` chạy ngầm tại backend:
1. **Background Polling Loop**: Tự động quét hàng đợi định kỳ mỗi 5.000ms.
2. **Immediate Trigger**: Khi nghiệp vụ phát sinh sự kiện mới, service gọi `consumer.processBatch()` ngay lập tức để người dùng nhận được thông báo trong thời gian thực mà không cần chờ chu kỳ polling tiếp theo.
3. **Stale Lock Recovery**: Tự động giải phóng các tác vụ bị kẹt ở trạng thái `PROCESSING` quá 5 phút về lại `PENDING` nếu worker bị crash đột ngột.
4. **Idempotent Dispatch**:
   - Kiểm tra `notifications.idempotency_key`: Nếu thông báo đã tồn tại, tái sử dụng `notification_id`, bổ sung bản ghi người nhận trong `notification_recipients` (nếu thiếu) và đánh dấu `PROCESSED`.
   - Chạy lại cùng batch không sinh thêm bản ghi dư thừa.
5. **Exponential Backoff**:
   - Khi xảy ra lỗi kết nối hoặc gián đoạn, `retry_count` tăng thêm 1.
   - Khoảng thời gian chờ thử lại tính theo công thức: $\Delta t = 2^{\min(\text{retry\_count}, 8)} \times 15\text{ giây}$.
   - Khi vượt quá `max_retries` (mặc định 3 lần), sự kiện chuyển sang trạng thái `DEAD_LETTER`.

---

## 8. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG VÀ NGHIỆM THU (E2E AUTOMATED VERIFICATION)

Bộ kiểm thử toàn diện đã được phát triển tại tệp `/scripts/verify_c3_6a_affiliate_and_lead_events.ts` và tích hợp vào lệnh `npm run test:c3-6a`:

```bash
> npx tsx scripts/verify_c3_6a_affiliate_and_lead_events.ts
```

### Kết quả chi tiết 9/9 ca kiểm thử:

```
==============================================================================
KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG C3.6A: SỰ KIỆN HỒ SƠ CTV & KHÁCH ĐĂNG KÝ MỚI
Thời gian: 2026-10-08T13:19:11.638Z
API Base: http://127.0.0.1:3000
==============================================================================
CTV kiểm thử: id=d12347a4-ebc1-402b-b4e7-763eb6127c07, user_id=879a11fc-ff89-4019-b2f4-57d7843b631b, code=STHCCTV6993

[PASS] TC-3.6A-01: Sự kiện AFFILIATE_APPROVED và thông báo SYSTEM phê duyệt (1602ms)
       -> Key=evt:AFFILIATE_APPROVED:audit-test-apprv-1791465551903, Title="Hồ sơ CTV đã được duyệt", ActionURL="/portal"
[PASS] TC-3.6A-02: Sự kiện AFFILIATE_REJECTED với lý do từ chối và đích /pending (1268ms)
       -> Title="Hồ sơ CTV chưa được duyệt", ActionURL="/pending", Reason included in summary
[PASS] TC-3.6A-03: Sự kiện AFFILIATE_SUSPENDED lần 1 (Tạm ngưng hoạt động) (1199ms)
       -> Key=evt:AFFILIATE_SUSPENDED:audit-test-susp-1-1791465554773, Title="Tài khoản CTV đã bị tạm ngưng", ActionURL="/pending"
[PASS] TC-3.6A-04: Sự kiện AFFILIATE_REACTIVATED (Kích hoạt lại CTV) (1264ms)
       -> Key=evt:AFFILIATE_REACTIVATED:audit-test-reactv-1791465555972, Title="Tài khoản CTV đã được kích hoạt lại", ActionURL="/portal"
[PASS] TC-3.6A-05: Tạm ngưng CTV lần 2 sinh event_key mới hoàn toàn (1269ms)
       -> Lần 1=audit-test-susp-1-1791465554773 -> Lần 2=audit-test-susp-2-1791465557236 (Tạo 2 event riêng biệt)
[PASS] TC-3.6A-06: Khách mới gửi form tư vấn sinh sự kiện LEAD_SUBMITTED cho CTV (2468ms)
       -> LeadID=91684857-6923-4b08-86bd-3c428ada0a8d, Title="Có khách hàng mới đăng ký qua link giới thiệu", ActionURL="/portal/leads"
[PASS] TC-3.6A-07: Lead trùng trong 90 ngày không sinh thêm notification_event (805ms)
       -> Số lượng event LEAD_SUBMITTED không tăng (trước=2, sau=2)
[PASS] TC-3.6A-08: Idempotency: Chạy lại batch processing không sinh thông báo trùng (1013ms)
       -> Bảo toàn số lượng notifications (9) và recipients (9)
[PASS] TC-3.6A-09: API CTV (/api/v1/portal/notifications) đọc thông báo SYSTEM (746ms)
       -> Tìm thấy 9 thông báo SYSTEM, đánh dấu đã đọc thành công id=899b3b15-cacb-42bc-b686-20b33a88db36

--- Dọn dẹp dữ liệu kiểm thử tạm thời ---
Dọn dẹp hoàn tất.

==============================================================================
KẾT QUẢ TỔNG HỢP KIỂM THỬ C3.6A:
Tổng số ca kiểm thử: 9
Thành công (PASS):   9
Thất bại (FAIL):     0
==============================================================================
```

---

## 9. DANH MỤC TỆP TIN THAY ĐỔI VÀ BỔ SUNG

| STT | Tệp tin | Vai trò | Mô tả thay đổi |
|:---:|:---|:---|:---|
| **1** | `/src/services/notificationEventService.ts` | Event Emitter Service | Quản lý phát sinh sự kiện A1 (`emitAffiliateLifecycleEvent`) và A3 (`emitLeadSubmittedEvent`), mapping người nhận, chống trùng lặp và kích hoạt xử lý tức thời. |
| **2** | `/src/services/notificationEventConsumer.ts` | Outbox Consumer Worker | Xử lý hàng đợi sự kiện sang thông báo `SYSTEM`, quản lý worker lease, kiểm tra idempotency, sinh nội dung chuẩn nghiệp vụ C3.6A. |
| **3** | `/server.ts` | Backend Entry Point | Khởi động ngầm `notificationConsumer`, gắn các điểm phát sinh sự kiện tại `POST /api/v1/public/leads` và các hàm xét duyệt/tạm ngưng/kích hoạt CTV (`handleReviewAffiliate`, `handleSuspendAffiliate`, `handleReactivateAffiliate`). |
| **4** | `/supabase/migrations/20261008000004_c3_profile_and_lead_notification_events.sql` | Database Migration | Định nghĩa cấu trúc trigger tự động `trg_audit_logs_notification_event`, `trg_leads_notification_event`, hàm `fn_process_notification_event`, `fn_claim_notification_events` và thu hồi quyền đối với các hàm nội bộ. |
| **5** | `/scripts/verify_c3_6a_affiliate_and_lead_events.ts` | Verification Test Suite | Kịch bản kiểm thử tự động 9 ca kiểm thử bảo đảm tính nguyên tử, chống trùng lặp, nội dung chuẩn, và xác nhận API CTV đọc được thông báo. |
| **6** | `/package.json` | Cấu hình Scripts | Bổ sung script `test:c3-6a` để chạy nhanh kiểm thử nghiệm thu. |

---

## 10. KẾT LUẬN VÀ BÀN GIAO

- Bước **C3.6A — Sự kiện hồ sơ CTV và khách đăng ký mới** đã hoàn thành toàn diện 100%, đáp ứng mọi tiêu chuẩn chất lượng cao nhất về tính nguyên tử, bảo mật PII, chống trùng lặp và trải nghiệm thông báo cho Cộng tác viên.
- Toàn bộ 9/9 ca kiểm thử tự động đều đạt kết quả **PASS**.
- Hệ thống đã sẵn sàng cho bước tiếp theo: **C3.6B — Sự kiện đối soát học phí và thù lao tuyển sinh**.
