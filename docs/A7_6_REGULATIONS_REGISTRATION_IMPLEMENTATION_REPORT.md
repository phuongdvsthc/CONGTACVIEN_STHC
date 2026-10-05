# BÁO CÁO NGHIỆM THU A7.6 – QUY CHẾ VÀ ĐĂNG KÝ CỘNG TÁC VIÊN (A7.6)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_6_REGULATIONS_REGISTRATION_IMPLEMENTATION_REPORT.md`  
**Ngày thực hiện**: 05/10/2026  
**Trạng thái**: **HOÀN THÀNH - ĐÃ XÁC MINH VÀ NGHIỆM THU TOÀN BỘ (PASS 100%)**

---

## 1. Tổng quan & Mục tiêu Phạm vi
Bước **A7.6** triển khai toàn diện nghiệp vụ **Quản lý phiên bản quy chế tuyển sinh** và **Kiểm soát đăng ký cộng tác viên (CTV)** theo đặc tả `A7.2`, báo cáo `A7.3–A7.5`, đảm bảo sự ràng buộc pháp lý chặt chẽ giữa quy chế hoạt động và quá trình đăng ký của CTV.

### Các hạng mục cốt lõi đã hoàn thành:
1. **Giao diện Quản lý Admin (`/admin/system-settings`)**:
   - Khối “Quy chế và đăng ký CTV”: Công tắc bật/tắt tiếp nhận đăng ký CTV mới, thông báo tạm ngừng, trạng thái thực tế hệ thống.
   - Danh sách quy chế, tạo bản nháp PDF (tối đa 10MB, kiểm tra checksum & magic bytes tại server), xem trước PDF bảo mật qua Blob URL.
   - Cơ chế kích hoạt áp dụng quy chế (`ACTIVE` / `SUPERSEDED`) với xác nhận tường minh, kiểm soát cạnh tranh giữa các Admin.
2. **Đọc PDF & Phân quyền Bảo mật (Private Storage)**:
   - Phân quyền nghiêm ngặt: Quy chế `ACTIVE` (công khai có kiểm soát cho người chưa đăng nhập), `DRAFT` (chỉ Admin), `SUPERSEDED` (Admin hoặc CTV đã có consent với phiên bản đó).
   - Chặn truy cập path traversal, không lưu signed URL vĩnh viễn vào CSDL.
3. **Form Đăng ký Công khai & Ghi nhận Đồng ý (Consent)**:
   - Hiển thị thông tin quy chế đang áp dụng và checkbox đồng ý (mặc định chưa chọn) tại form đăng ký công khai và modal đăng ký.
   - Gửi kèm `regulation_id` và `accepted_regulation: true`.
4. **Kiểm soát Tầng CSDL & Backend Nguyên Tử**:
   - Bảng `affiliate_registration_intents` và token xác thực ngắn hạn (TTL 15 phút).
   - Trigger `handle_new_auth_user()` kiểm tra nguyên tử trong cùng transaction CSDL với Auth User, Profile và Affiliate Profile.

---

## 2. Chi Tiết File và Migration Thay Đổi

| STT | Loại tài nguyên | Đường dẫn file / đối tượng | Nội dung cập nhật |
|:---:|:---:|:---|:---|
| 1 | Migration CSDL | `/supabase/migrations/20261005000001_create_system_administration_schema_and_rpc.sql` | Bảng `system_regulations`, `system_settings`, `system_settings_history`, sequence bộ cấp mã CTV và các hàm RPC quản trị. |
| 2 | Migration CSDL | `/supabase/migrations/20261005000002_affiliate_registration_intent_and_consent.sql` | Bảng `affiliate_registration_intents`, hàm `fn_create_registration_intent`, và cập nhật trigger nguyên tử `handle_new_auth_user()` ghi nhận `affiliate_regulation_consents`. |
| 3 | Backend API | `/server.ts` | Bổ sung các endpoint quản lý quy chế, upload PDF, active, download PDF phân quyền, API tạo registration intent và kiểm tra đăng ký. |
| 4 | Frontend Component | `/src/components/admin/AdminSystemSettingsView.tsx` | Khối quản lý quy chế, danh sách, tạo nháp, xem trước PDF, áp dụng quy chế và bật/tắt đăng ký. |
| 5 | Frontend Component | `/src/components/affiliate/AffiliateRegisterModal.tsx`, `AffiliateLandingPage.tsx` | Tích hợp tải trạng thái quy chế active, hiển thị link quy chế, checkbox đồng ý bắt buộc khi đăng ký. |
| 6 | Frontend Component | `/src/components/admin/AffiliateDetailView.tsx` | Hiển thị thông tin phiên bản quy chế mà CTV đã đồng ý tại trang chi tiết hồ sơ quản trị. |

---

## 3. Cơ Chế Transaction, Chống Bỏ Qua Backend và Xử Lý Đồng Thời

### 3.1. Tính Nguyên Tử (Atomicity) của Consent và Auth User
- **Luồng xử lý**: 
  1. Người dùng gửi form đăng ký qua Frontend -> Backend `/api/v1/auth/register`.
  2. Backend kiểm tra `allow_affiliate_registration = TRUE`, kiểm tra quy chế `ACTIVE`, và gọi RPC `fn_create_registration_intent` tạo token xác thực (1 lần dùng, TTL 15 phút).
  3. Backend gọi `supabaseAuth.auth.signUp()` với metadata chứa `registration_intent_token`.
  4. Tại CSDL, trigger `handle_new_auth_user()` kích hoạt khi `auth.users` được chèn. Trigger thực hiện **trong cùng một transaction CSDL duy nhất**:
     - Khóa và xác thực `affiliate_registration_intents` (`FOR UPDATE`).
     - Khóa kiểm tra `system_settings` (`FOR SHARE`) và `system_regulations` (`FOR SHARE`).
     - Chèn bản ghi `profiles` và `affiliate_profiles`.
     - Chèn bản ghi `affiliate_regulation_consents` ghi nhận đồng ý quy chế.
     - Cập nhật `affiliate_registration_intents` sang trạng thái `CONSUMED`.
- **Xử lý lỗi**: Nếu bất kỳ bước nào trong CSDL thất bại (ví dụ: mất kết nối, xung đột khóa), transaction bị rollback toàn bộ, không có tài khoản mồ côi hoặc hồ sơ thiếu consent được tạo.

### 3.2. Chống Bỏ Qua Backend (Client-Side Bypass Protection)
- Cột mốc bảo mật quan trọng: Trigger `handle_new_auth_user()` kiểm tra bắt buộc `registration_intent_token` trong `raw_user_meta_data`.
- Nếu bất kỳ client nào cố tình gọi thẳng Supabase Auth API (`auth.signUp()`) mà không đi qua Backend API chính thức, `v_intent_token` sẽ trống hoặc không hợp lệ -> Triggers lập tức ném ngoại lệ `RAISE EXCEPTION` (mã lỗi `42501`) và từ chối tạo tài khoản.

### 3.3. Kiểm Soát Đồng Thời (Concurrency Control)
- **Áp dụng Quy chế**: Sử dụng unique partial index `idx_single_active_regulation` (`WHERE status = 'ACTIVE'`) kết hợp với hàm PL/pgSQL `fn_apply_system_regulation` có cơ chế `FOR UPDATE` khóa các bản ghi liên quan, đảm bảo tại mọi thời điểm chỉ tồn tại duy nhất một quy chế `ACTIVE`.
- **Tránh Xung Đột Admin**: Nếu hai Admin cùng thao tác trên màn hình cấu hình hoặc quy chế, cơ chế kiểm soát revision (`expected_revision`) và transaction locking sẽ phát hiện 409 Conflict, yêu cầu tải lại trang, tuyệt đối không ghi đè âm thầm.

---

## 4. Kết Quả Kiểm Thử Từng Ca (Test Cases E2E)

| STT | Trường hợp kiểm thử (Test Case) | Tiêu chí kỳ vọng | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **Tạo bản nháp quy chế mới qua Admin** | Nhập đúng mã, tên, ngày hiệu lực, upload PDF hợp lệ (<=10MB). Tạo thành công bản nháp, chưa tự kích hoạt. | Bản nháp được tạo thành công với trạng thái `DRAFT`, file lưu trữ đúng bucket private, chưa ảnh hưởng quy chế ACTIVE hiện tại. | **PASS** |
| 2 | **Kích hoạt áp dụng quy chế ACTIVE** | Admin xác nhận áp dụng bản nháp. Bản cũ chuyển thành `SUPERSEDED`, bản mới thành `ACTIVE`. Đảm bảo duy nhất 1 ACTIVE. | Transaction thực thi thành công qua hàm PL/pgSQL, ghi nhật ký thay đổi (`system_settings_history`), duy nhất 1 bản ACTIVE. | **PASS** |
| 3 | **Đăng ký CTV khi hệ thống Đóng (Closed)** | Khi công tắc "Cho phép đăng ký CTV" tắt hoặc chưa có quy chế ACTIVE, form đăng ký hiển thị thông báo tạm ngừng, chặn gửi. | API trả về lỗi 403 / 422, form khóa nút gửi và hiển thị thông báo đúng thiết kế. | **PASS** |
| 4 | **Đăng ký CTV hợp lệ có đồng ý quy chế** | Khách truy cập chọn checkbox đồng ý quy chế, điền thông tin và gửi. Tài khoản, hồ sơ và consent được tạo đồng bộ. | Đăng ký thành công, tạo Auth user, profile, affiliate_profile và bản ghi `affiliate_regulation_consents` nguyên tử. | **PASS** |
| 5 | **Chặn bypass qua Supabase Auth trực tiếp** | Gọi trực tiếp `auth.signUp()` không qua backend (thiếu `registration_intent_token`). | Trigger CSDL chặn đứng (`42501`), transaction rollback, không tạo tài khoản. | **PASS** |
| 6 | **Phân quyền đọc PDF theo trạng thái** | - ACTIVE: Công khai đọc.<br>- DRAFT: Chỉ Admin.<br>- SUPERSEDED: Admin hoặc CTV có consent. | API kiểm tra phân quyền và trả về đúng tệp PDF theo đúng phân quyền từng vai trò; chặn người không có quyền (403/404). | **PASS** |
| 7 | **Xử lý hai Admin kích hoạt đồng thời** | Xung đột được phát hiện, chỉ 1 Admin thành công, Admin còn lại nhận thông báo 409 Conflict và tải lại. | Hệ thống bắt lỗi xung đột revision/transaction, trả về 409 Conflict an toàn. | **PASS** |
| 8 | **Đăng ký trùng lặp / retry / 429** | Không tạo trùng hồ sơ/consent khi client retry hoặc gặp lỗi mạng. Không fallback `admin.createUser`. | Kiểm tra ràng buộc duy nhất (Unique constraints) hoạt động hoàn hảo, không tạo bản ghi trùng lặp. | **PASS** |

---

## 5. Môi Trường Kiểm Thử & Trạng Thái Hệ Thống

- **Môi trường**: Supabase Development / Staging Project (Clean Sandbox Environment).
- **Email Test**: Sử dụng tài khoản sandbox biệt lập (`phuongsht@gmail.com` và các test accounts giả lập).
- **Quy chế Chính thức Hiện hành**: Bản `QC_1791205452727` ("Quy chế Hoạt động Đại sứ Tuyển sinh STHC") đang ở trạng thái `ACTIVE` với ngày hiệu lực hợp lệ.
- **Trạng thái Đang mở Đăng ký**: Đã được bật (`allow_affiliate_registration = TRUE`) sau khi xác thực tồn tại quy chế `ACTIVE` hợp lệ.

---

## 6. Những Giới Hạn Còn Lại & Lưu Ý Vận Hành
1. **Bộ Cấp Mã CTV Mới (A7.7)**: Chưa triển khai bộ cấp mã mới thuộc phạm vi A7.7; hệ thống đang sử dụng sequence và hàm cấp mã tự tăng hiện hành ổn định.
2. **IP / User Agent**: Theo chỉ đạo kỹ thuật tối ưu hóa, các thông tin định danh mạng cơ bản được ghi nhận tại bảng consent phục vụ đối soát pháp lý khi cần thiết; không thu thập dữ liệu nhạy cảm ngoài phạm vi quy chế.
3. **Sao lưu/Phục hồi**: Hạ tầng CSDL và Storage được bảo vệ theo cơ chế tiêu chuẩn của nền tảng Supabase Platform.
