# TÀI LIỆU DỰ ÁN HỆ THỐNG CỔNG CỘNG TÁC VIÊN TUYỂN SINH STHC_CTV

Tài liệu này ghi nhận toàn bộ quá trình thiết kế, triển khai, kiểm tra và bàn giao các phân hệ trong hệ thống **STHC_CTV** (Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist).

---

## 1. Yêu cầu A0.1 đến A1.1: Tổng Quan & Khắc Phục Lỗi Quan Hệ Embed
- Đã hoàn thiện dọn dẹp giao diện quản trị (A0.1), kiểm kê (A0.2), thiết kế layout (A0.3, A0.4), danh sách CTV & phân trang (A1.1), và khắc phục triệt để lỗi quan hệ embed giữa `affiliate_profiles` và `profiles` (`profiles!affiliate_profiles_user_id_fkey`).

---

## 2. Yêu cầu A1.2: Chi Tiết Hồ Sơ Trong Module “Quản Lý CTV”
1. **Phạm vi & Giao diện**:
   - Bổ sung nút **“Xem chi tiết”** tại mỗi dòng trong bảng danh sách CTV ở trang Quản lý CTV (`/admin/affiliates`).
   - Xây dựng component trang chi tiết (`AffiliateDetailView.tsx`) với định tuyến `/admin/affiliates/:id`, chế độ chỉ đọc (read-only), giữ nguyên bố cục Header/Sidebar chung (A0.4) và menu “Quản lý CTV” đang được active.
   - Hỗ trợ breadcrumb, nút quay lại danh sách bảo toàn ngữ cảnh, và hỗ trợ truy cập trực tiếp/tải lại URL chi tiết.
2. **Nội dung hồ sơ chi tiết (4 nhóm thông tin)**:
   - **A. Thông tin tổng quan**: Họ và tên, mã CTV, avatar đại diện mặc định, trạng thái CTV, trạng thái xác thực email, ngày đăng ký (định dạng múi giờ VN).
   - **B. Thông tin liên hệ**: Email, số điện thoại, địa chỉ cư trú.
   - **C. Thông tin bổ sung**: Số CCCD (`id_card_number`), ngày cấp CCCD (`id_card_issued_date`), nghề nghiệp / đơn vị công tác (`occupation`), số tài khoản ngân hàng (`bank_account_number`), tên ngân hàng & chi nhánh (`bank_name`).
   - **D. Thông tin quản lý**: Ngày cập nhật gần nhất, ngày duyệt và cán bộ duyệt (`reviewed_by` / `reviewer`), ghi chú xét duyệt (`review_note`).
   - Xử lý dữ liệu thiếu hiển thị `"Chưa cập nhật"`, tách bạch trạng thái CTV và trạng thái xác thực email, không hiển thị dữ liệu giả mạo hay nhạy cảm.
3. **API & Bảo mật**:
   - Bổ sung API backend `GET /api/v1/admin/affiliates/:id` (được bảo vệ bởi middleware `requireStaffOrAdmin`).
   - Kiểm tra định danh ID đầu vào, sử dụng khóa ngoại rõ ràng (`profiles!affiliate_profiles_user_id_fkey` và `profiles!affiliate_profiles_reviewed_by_fkey`), kiểm tra quyền truy cập chỉ cho phép xem hồ sơ nhóm `affiliate`, và lấy trạng thái xác thực email thực tế từ Supabase Auth Admin API.
   - Phân quyền nghiêm ngặt, trả về thông báo lỗi bằng tiếng Việt, chi tiết kỹ thuật ghi log backend.

---

## 3. Phần Bổ Sung A1.2: Ngày Cấp CCCD, Số Tài Khoản & Ngân Hàng
1. **Cơ sở dữ liệu (Migration)**:
   - File migration: `/supabase/migrations/20260930000001_affiliate_bank_and_id_card.sql`.
   - Bổ sung 3 cột vào bảng `public.affiliate_profiles`:
     - `id_card_issued_date DATE` (ràng buộc `chk_id_card_issued_date` <= CURRENT_DATE).
     - `bank_account_number TEXT` (kiểu chuỗi nhằm giữ nguyên số 0 ở đầu).
     - `bank_name TEXT` (tên ngân hàng & chi nhánh).
   - Cho phép để trống (`NULL`) đối với hồ sơ cũ, không tự điền dữ liệu mẫu, không ghi đè dữ liệu cũ.
   - Cập nhật trigger `handle_new_auth_user()` để nhận diện an toàn 3 trường này từ metadata khi đăng ký.
2. **Đồng bộ luồng nhập, lưu và đọc hồ sơ**:
   - Form đăng ký CTV (`AffiliateRegisterModal.tsx`): Bổ sung 3 trường tùy chọn (không bắt buộc để tránh chặn đăng ký). Kiểm tra ngày cấp không lớn hơn ngày hiện tại.
   - Form cập nhật hồ sơ cá nhân (`AffiliateProfileModal.tsx`): Cho phép CTV xem và cập nhật hồ sơ cá nhân của chính mình.
   - API:
     - `POST /api/v1/auth/register`: Validate ngày cấp CCCD, lưu trữ số tài khoản và ngân hàng.
     - `GET /api/v1/affiliate/profile`: Đọc hồ sơ cá nhân của CTV.
     - `PUT /api/v1/affiliate/profile`: Cập nhật một phần hồ sơ của chính CTV, bảo toàn các trường khác không bị mất, ngăn chặn tuyệt đối việc tự thay đổi `role`, `status`, `affiliate_code` hoặc thông tin xét duyệt (Privilege Escalation Defense).
     - `GET /api/v1/admin/affiliates/:id`: Trả về đầy đủ thông tin ngày cấp CCCD, số tài khoản, ngân hàng.
3. **Bảo mật PII & Phân quyền**:
   - Không đưa thông tin CCCD và số tài khoản vào log hoặc API công khai.
   - CTV chỉ được cập nhật hồ sơ của chính mình.
   - Màn hình quản trị A1.2 giữ nguyên chế độ chỉ đọc (read-only).

---

## 4. Bảng Đối Chiếu Toàn Bộ Trường Hồ Sơ CTV
| Nhãn Giao Diện | Trường API | Bảng CSDL | Cột CSDL | Kiểu Dữ Liệu | Ghi Chú |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Họ và tên CTV | `full_name` | `public.profiles` | `full_name` | `VARCHAR(150)` | Bắt buộc khi đăng ký |
| Email đăng nhập | `email` | `public.profiles` | `email` | `VARCHAR(255)` | Bắt buộc, duy nhất, liên kết auth.users |
| Số điện thoại | `phone` | `public.profiles` | `phone` | `VARCHAR(20)` | Bắt buộc, định dạng VN 10 số |
| Mã CTV | `affiliate_code` | `public.affiliate_profiles` | `affiliate_code` | `VARCHAR(50)` | Hệ thống tự sinh, duy nhất |
| Trạng thái CTV | `status` | `public.affiliate_profiles` | `status` | `VARCHAR(30)` | Mặc định PENDING_REVIEW |
| Số CCCD | `id_card_number` | `public.affiliate_profiles` | `id_card_number` | `VARCHAR(30)` | Tùy chọn, đối soát thù lao |
| Ngày cấp CCCD | `id_card_issued_date` | `public.affiliate_profiles` | `id_card_issued_date` | `DATE` | <= ngày hiện tại |
| Nghề nghiệp / Đơn vị | `occupation` | `public.affiliate_profiles` | `occupation` | `VARCHAR(150)` | Tùy chọn |
| Địa chỉ cư trú | `address` | `public.affiliate_profiles` | `address` | `TEXT` | Tùy chọn |
| Số tài khoản ngân hàng | `bank_account_number` | `public.affiliate_profiles` | `bank_account_number` | `TEXT` | Giữ nguyên số 0 ở đầu |
| Ngân hàng & Chi nhánh | `bank_name` | `public.affiliate_profiles` | `bank_name` | `TEXT` | Tối đa 150 ký tự |
| Cán bộ duyệt hồ sơ | `reviewed_by` / `reviewer` | `public.affiliate_profiles` | `reviewed_by` | `UUID` | Khóa ngoại trỏ về profiles(id) |
| Thời điểm duyệt | `reviewed_at` | `public.affiliate_profiles` | `reviewed_at` | `TIMESTAMPTZ` | Tự động ghi nhận khi duyệt |
| Ghi chú xét duyệt | `review_note` | `public.affiliate_profiles` | `review_note` | `TEXT` | Ghi chú nội bộ |
| Ngày đăng ký / tạo | `created_at` | `public.affiliate_profiles` | `created_at` | `TIMESTAMPTZ` | NOW() |
| Ngày cập nhật gần nhất | `updated_at` | `public.affiliate_profiles` | `updated_at` | `TIMESTAMPTZ` | Trigger tự cập nhật |

---

## 5. Danh Sách File Đã Tạo / Cập Nhật
- `/supabase/migrations/20260930000001_affiliate_bank_and_id_card.sql`: Script DDL bổ sung 3 cột và cập nhật trigger auth sync.
- `/src/types/index.ts`: Bổ sung `id_card_issued_date`, `bank_account_number`, `bank_name` vào interface `AffiliateProfile`.
- `/src/services/api.ts`: Cập nhật payload `register`, bổ sung `getAffiliateProfile` và `updateAffiliateProfile`.
- `/server.ts`:
  - Cập nhật interface `DemoAffiliate` và `demoState`.
  - Cập nhật `handleRegister` validate ngày cấp CCCD (<= today), số tài khoản, ngân hàng.
  - Bổ sung `GET /api/v1/affiliate/profile` và `PUT /api/v1/affiliate/profile` (chống leo thang đặc quyền, cập nhật từng phần).
  - Cập nhật `GET /api/v1/admin/affiliates/:id` trả về đầy đủ 3 trường mới.
- `/src/components/admin/AffiliateDetailView.tsx`: Bổ sung hiển thị Ngày cấp CCCD, Số tài khoản (chuỗi), Ngân hàng trong nhóm Thông tin bổ sung.
- `/src/components/affiliate/AffiliateRegisterModal.tsx`: Bổ sung 3 trường tùy chọn khi đăng ký.
- `/src/components/affiliate/AffiliateProfileModal.tsx`: Component modal xem và cập nhật hồ sơ cá nhân cho CTV.
- `/src/components/common/AppLayout.tsx`: Tích hợp mở `AffiliateProfileModal` khi click "Thông tin cá nhân".
- `/docs/PROJECT_NOTE.md`: Cập nhật tài liệu dự án và bảng đối chiếu.

---

## 6. Kết Quả Kiểm Tra & Nghiệm Thu (Verification)
- **Kiểm tra mã nguồn & Build**: PASS 100% (TypeScript, Linter, Vite Production Build thành công).
- **Kiểm thử logic**:
  - Ngày cấp tương lai hoặc không hợp lệ: Bị từ chối với HTTP 400.
  - Số tài khoản có số 0 ở đầu: Được bảo toàn nguyên vẹn dạng chuỗi (`'01234567890'`).
  - Cập nhật từng phần: Bảo toàn nguyên vẹn họ tên và trạng thái hồ sơ.
  - Chống leo thang quyền: Yêu cầu sửa `role` hoặc `status` bị từ chối với HTTP 403.
  - Xem chi tiết A1.2: Trả về đầy đủ các trường mới hoặc hiển thị "Chưa cập nhật" cho hồ sơ thiếu.
- **Tình trạng CSDL Remote**: File migration SQL đã sẵn sàng tại `/supabase/migrations/20260930000001_affiliate_bank_and_id_card.sql`. Cần chạy script SQL này trong Supabase SQL Editor để cập nhật database remote.

---

## 7. Yêu cầu A1.3: Duyệt / Từ Chối Hồ Sơ CTV & Ghi Nhận Lịch Sử Xử Lý

1. **Quy tắc chuyển trạng thái & Xử lý nghiệp vụ**:
   - **Chỉ xử lý hồ sơ "Chờ duyệt" (`PENDING_REVIEW`)**: Chặn tuyệt đối thao tác duyệt/từ chối đối với hồ sơ đã ở trạng thái `ACTIVE`, `REJECTED`, `SUSPENDED`.
   - **Duyệt hồ sơ (`APPROVE`)**:
     - Điều kiện tiên quyết: Email của CTV bắt buộc phải được xác thực trước (`email_confirmed_at IS NOT NULL` / `email_verified: true`). Nếu chưa xác thực, trả về HTTP 400 (`EMAIL_NOT_VERIFIED`) và hiển thị cảnh báo giải thích rõ ràng tại giao diện.
     - Chuyển trạng thái sang `ACTIVE` (Hoạt động).
     - Ghi nhận `reviewed_by` (ID cán bộ tuyển sinh từ phiên xác thực), `reviewed_at` (thời điểm máy chủ) và `review_note` (ghi chú tùy chọn).
   - **Từ chối hồ sơ (`REJECT`)**:
     - Chuyển trạng thái sang `REJECTED` (Từ chối).
     - Bắt buộc nhập lý do từ chối rõ ràng, kiểm tra chuỗi không được rỗng hoặc chỉ chứa khoảng trắng (`cleanReason.length > 0`). Nếu rỗng, trả về HTTP 400 (`REASON_REQUIRED`).
     - Ghi nhận `reviewed_by`, `reviewed_at`, và `review_note` (lý do từ chối).
   - **Bảo toàn dữ liệu**: Thao tác xét duyệt chỉ cập nhật các trường quản lý (`status`, `reviewed_by`, `reviewed_at`, `review_note`, `updated_at`), tuyệt đối không xóa hoặc làm mất các trường thông tin cá nhân: Họ tên, email, CCCD, ngày cấp, số tài khoản, tên ngân hàng.

2. **Cơ sở dữ liệu & Tính nguyên tử (Atomicity)**:
   - File migration: `/supabase/migrations/20260930000002_affiliate_review_workflow.sql`.
   - Hàm PostgreSQL nguyên tử: `public.fn_review_affiliate_profile(p_affiliate_id, p_reviewer_id, p_action, p_review_note, p_client_ip, p_user_agent)`.
   - Khóa bi quan `SELECT ... FOR UPDATE` trên dòng `affiliate_profiles` để ngăn chặn xung đột xử lý đồng thời (Race Condition).
   - Cập nhật trạng thái `affiliate_profiles` và chèn bản ghi vào `public.audit_logs` trong cùng một transaction duy nhất. Nếu có lỗi, tự động rollback toàn bộ, không để trạng thái bị cập nhật nửa vời.
   - Khi truy vấn quan hệ người xử lý, chỉ định rõ ràng `reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)` để tránh xung đột khóa ngoại kép giữa `affiliate_profiles` và `profiles`.

3. **API & Kiểm soát truy cập (A0.3)**:
   - `POST /api/v1/admin/affiliates/:id/approve`: Phê duyệt hồ sơ CTV (bảo vệ bởi `requireStaffOrAdmin`).
   - `POST /api/v1/admin/affiliates/:id/reject`: Từ chối hồ sơ CTV (bảo vệ bởi `requireStaffOrAdmin`).
   - `PATCH /api/v1/admin/affiliates/:id/status`: Hỗ trợ cập nhật trạng thái đồng bộ (`ACTIVE` / `REJECTED`).
   - `GET /api/v1/admin/affiliates/:id`: Trả về chi tiết hồ sơ CTV, thông tin cán bộ duyệt, và mảng `audit_logs` lịch sử xét duyệt.
   - Phân quyền nghiêm ngặt: Chặn CTV (`role = 'affiliate'`) và tài khoản vãng lai (`public`), chỉ chấp nhận `staff` hoặc `admin`. Định danh người xử lý được trích xuất an toàn từ phiên đăng nhập backend, không nhận từ client.
   - Xử lý đồng thời: Khi hai yêu cầu xử lý cùng một hồ sơ, chỉ một yêu cầu thành công, yêu cầu còn lại nhận thông báo HTTP 409: `"Hồ sơ đã được xử lý trước đó, vui lòng tải lại trang."` và không tạo lịch sử trùng.

4. **Giao diện trang chi tiết A1.2 (`AffiliateDetailView.tsx`)**:
   - Khi hồ sơ `PENDING_REVIEW` và người dùng có quyền: Hiển thị 2 nút **"Duyệt hồ sơ"** và **"Từ chối"**.
   - Nút "Duyệt hồ sơ":
     - Nếu email chưa xác thực: Hiển thị nhãn cảnh báo `(Chưa xác thực email)`, banner cảnh báo màu vàng giải thích lý do, và chặn duyệt.
     - Khi email đã xác thực: Mở modal xác nhận duyệt hiển thị Tên, Mã CTV, và ô nhập ghi chú tùy chọn.
   - Nút "Từ chối": Mở modal từ chối hiển thị Tên, Mã CTV, và ô nhập lý do bắt buộc (validate không để trống khoảng trắng). Nếu lỗi, giữ nguyên nội dung lý do để người dùng thử lại mà không phải gõ lại.
   - Trạng thái gửi: Vô hiệu hóa nút (`disabled={isProcessing}`) và hiển thị spinner để chống bấm trùng lặp.
   - Sau khi xử lý: Ẩn ngay nút duyệt/từ chối, cập nhật trạng thái mới (`ACTIVE` hoặc `REJECTED`), hiển thị tên cán bộ xử lý, thời gian xử lý, lý do/ghi chú và hiển thị dòng lịch sử xử lý (Audit Logs) tại Nhóm D.
   - Bảo toàn phân trang & bộ lọc: Khắc phục triệt để lỗi Rules of Hooks trong `AdminPortal.tsx`, bảo toàn 100% trang hiện tại (`page`), giới hạn (`limit`), và bộ lọc tìm kiếm khi quay lại danh sách A1.1.


---

## 8. Sửa Lỗi Migration A1.3 & Triển Khai Yêu Cầu A1.4: Tạm Ngưng / Kích Hoạt Lại CTV

### 8.1 Sửa Lỗi Migration A1.3 (`20260930000002_affiliate_review_workflow.sql`)
- **Lỗi gốc**: `ERROR: 42601: syntax error at or near "v_aff.status" LINE 69: v_aff.status`.
- **Nguyên nhân**: Thiếu dấu phẩy giữa khóa `'status'` và giá trị `v_aff.status` trong hàm `jsonb_build_object()`, đồng thời khai báo `v_aff RECORD` cần được chuẩn hóa sang `public.affiliate_profiles%ROWTYPE` kèm kiểm tra `IF NOT FOUND` tương thích chuẩn cú pháp PL/pgSQL.
- **Khắc phục**: Đã cập nhật file migration chuẩn xác với `public.affiliate_profiles%ROWTYPE`, `IF NOT FOUND`, và dấu phẩy phân tách đầy đủ các tham số `jsonb_build_object`.

### 8.2 Nghiệp Vụ & Quy Tắc Trạng Thái A1.4 (State Transition Rules)
1. **Chuyển đổi trạng thái nghiêm ngặt**:
   - `ACTIVE` → `SUSPENDED` (Tạm ngưng): Chỉ áp dụng cho CTV đã được duyệt và đang hoạt động.
   - `SUSPENDED` → `ACTIVE` (Kích hoạt lại): Chỉ áp dụng cho CTV đang tạm ngưng.
   - Chặn tuyệt đối hồ sơ `PENDING_REVIEW` hoặc `REJECTED` kích hoạt lại để bypass quy trình xét duyệt A1.3 (trả về HTTP 400 `CANNOT_BYPASS_REVIEW`).
   - Điều kiện kích hoạt lại: Bắt buộc email đã được xác thực (`email_verified: true` / `email_confirmed_at IS NOT NULL`).
2. **Quy tắc lý do / ghi chú**:
   - Tạm ngưng: **Bắt buộc** có lý do cụ thể (không được để trống hoặc chỉ có khoảng trắng).
   - Kích hoạt lại: Cho phép ghi chú tùy chọn.
3. **Bảo toàn dữ liệu & Không ghi đè**:
   - Thao tác tạm ngưng / kích hoạt lại lưu riêng vào các cột: `suspended_by`, `suspended_at`, `suspension_reason`, `reactivated_by`, `reactivated_at`, `reactivation_note`.
   - Tuyệt đối giữ nguyên kết quả duyệt ban đầu (`reviewed_by`, `reviewed_at`, `review_note`), dữ liệu hồ sơ cá nhân, khách đã giới thiệu và dữ liệu thù lao.
   - Không khóa tài khoản Supabase Auth, không cấm đăng nhập (chỉ tạm ngưng quyền tiếp thị giới thiệu).

### 8.3 Bảng Đối Chiếu Thao Tác Giới Thiệu Theo Trạng Thái CTV
| Thao tác giới thiệu | Đang hoạt động (`ACTIVE`) | Tạm ngưng (`SUSPENDED`) | Kích hoạt lại (`ACTIVE`) |
| :--- | :--- | :--- | :--- |
| **Xem khóa học & danh mục** | Được phép | Được phép xem tổng quan, chặn lấy link tiếp thị | Khôi phục bình thường |
| **Tạo link giới thiệu & mã mới** | Được phép tạo bình thường | Bị chặn qua API & UI (HTTP 403) | Khôi phục bình thường |
| **Lấy mã QR tiếp thị tuyển sinh** | Được phép tạo và tải QR | Bị chặn (HTTP 403) | Khôi phục bình thường |
| **Khách truy cập link / QR cũ** | Mở form đăng ký tư vấn bình thường | Hiển thị thông báo tạm ngưng, không nhận khách mới | Tiếp tục nhận đăng ký bình thường |
| **Khách gửi form đăng ký tư vấn** | Ghi nhận lead mới cho CTV | Bị từ chối (HTTP 400 `AFFILIATE_SUSPENDED`), không tạo lead mới | Tiếp tục ghi nhận lead cho CTV |
| **Xem dữ liệu khách hàng cũ** | Được phép (che 4 số cuối SĐT) | Được phép xem dữ liệu cũ (bảo toàn lịch sử) | Được phép |
| **Thù lao đã được duyệt trước đó** | Giữ nguyên | Giữ nguyên đầy đủ | Giữ nguyên |

### 8.4 Chính Sách Link Cũ & Vị Trí Kiểm Tra Quyền Ở Backend
- **Chính sách link cũ**: Không xóa link, mã hoặc QR cũ; không đổi chủ sở hữu; không tự động chuyển khách sang CTV khác hoặc làm mất dấu vết CTV. Khi CTV tạm ngưng, link tạm dừng nhận đăng ký mới và thông báo rõ bằng tiếng Việt: *"Mã giới thiệu của Cộng tác viên hiện đang tạm ngưng tiếp nhận đăng ký tư vấn mới. Vui lòng liên hệ trực tiếp Ban Tuyển sinh Trường Saigontourist để được hỗ trợ."*
- **Vị trí kiểm tra quyền**:
  - `checkAffiliateReferralEligibility()` trong `server.ts`: Đọc trạng thái hiệu lực trực tiếp từ CSDL (`affiliate_profiles.status`) hoặc demoState tại thời điểm gửi form (`POST /api/v1/public/leads`), đảm bảo nguyên tử, chống race condition khi khách mở form trước nhưng gửi sau khi CTV bị tạm ngưng.
  - `app.get('/api/v1/affiliate/courses')`: Kiểm tra trạng thái CTV, trả về HTTP 403 nếu bị `SUSPENDED`.

### 8.5 Danh Sách File, API và Migration Đã Chỉnh Sửa / Bổ Sung
1. **Migration SQL**:
   - `/supabase/migrations/20260930000002_affiliate_review_workflow.sql`: Sửa lỗi cú pháp dòng 69, bổ sung kiểu `%ROWTYPE` và `IF NOT FOUND`.
   - `/supabase/migrations/20260930000003_affiliate_suspension_workflow.sql`: Bổ sung 6 cột quản lý tạm ngưng/kích hoạt lại và 2 hàm nguyên tử `fn_suspend_affiliate_profile`, `fn_reactivate_affiliate_profile`.
2. **Backend (`server.ts`)**:
   - `checkAffiliateReferralEligibility()`: Hàm dùng chung kiểm tra quyền tiếp thị CTV.
   - `POST /api/v1/admin/affiliates/:id/suspend`: Tạm ngưng hoạt động CTV (`requireStaffOrAdmin`).
   - `POST /api/v1/admin/affiliates/:id/reactivate`: Kích hoạt lại hoạt động CTV (`requireStaffOrAdmin`).
   - `PATCH /api/v1/admin/affiliates/:id/status`: Hỗ trợ chuyển tiếp trạng thái `SUSPENDED` / `ACTIVE`.
   - `POST /api/v1/public/leads`: Kiểm tra điều kiện giới thiệu thời gian thực, chặn ghi nhận lead khi CTV tạm ngưng.
   - `GET /api/v1/affiliate/courses`: Chặn lấy link tiếp thị khi CTV tạm ngưng (HTTP 403).
   - `GET /api/v1/affiliate/dashboard`: Trả về `affiliate_status` và `suspension_reason`.
3. **Frontend**:
   - `/src/components/admin/AffiliateDetailView.tsx`: Thêm nút "Tạm ngưng", "Kích hoạt lại", Modal xác nhận kèm tác động quyền giới thiệu, kiểm tra lý do bắt buộc, chặn double-click, giữ lại nội dung khi lỗi, và cập nhật Audit Logs.
   - `/src/components/affiliate/AffiliateDashboard.tsx`: Banner thông báo tạm ngưng chi tiết, lý do, hotline hỗ trợ, khóa thao tác tạo link nhanh.
   - `/src/services/api.ts`: Bổ sung `suspendAffiliate()` và `reactivateAffiliate()`.
   - `/src/types/index.ts`: Bổ sung các trường `suspended_by`, `suspended_at`, `suspension_reason`, `reactivated_by`, `reactivated_at`, `reactivation_note`.

---

## 9. Điều chỉnh A2.3: Section Quyền Lợi Sinh Viên Tùy Biến & Giao Diện Xem Trước Khóa Học

### 9.1 Nội dung điều chỉnh
1. **Chuyển "Đặc quyền sinh viên..." thành section có thể chỉnh sửa**:
   - Bỏ nội dung code cứng cũ.
   - Thêm trường `benefits_title` (tiêu đề section) và `benefits_content` (nội dung section) vào form tạo/sửa khóa học.
   - Hỗ trợ lưu trữ riêng biệt theo từng khóa học.
   - Khi chưa có nội dung, ẩn hoàn toàn section trên giao diện, không tự động chèn dữ liệu mẫu.
   - Màn hình xem trước (Preview) phản ánh ngay các thay đổi đang nhập trong form kể cả khi chưa lưu.
   - Xử lý làm sạch nội dung an toàn chống XSS qua `sanitizeHtml`.
2. **Chuẩn hóa nhãn nút và bố cục xem trước**:
   - Đổi nhãn nút từ "Đăng ký tư vấn (xem trước)" thành **"Đăng ký"**.
   - Trong màn hình xem trước, nút bị vô hiệu hóa, không gửi đăng ký thật hoặc tạo lead.
   - Hiển thị thanh thông báo "Bản xem trước" riêng trên đỉnh modal, không gắn vào nhãn nút.
   - Trên trang công khai, nút "Đăng ký" mở form đăng ký và giữ đúng mã giới thiệu CTV.
   - Bỏ dòng "KHOA DU LỊCH - KHÁCH SẠN".
   - Đổi nhãn "Mã:" thành "Mã khoá học:".
   - Thêm nhãn "Tên khoá học: " trước tên khóa học.
   - Đổi "Học phí dự kiến" thành "Học phí".
   - Phần mô tả ngắn: canh đều 2 bên (`text-align: justify`), giữ xuống dòng hợp lý.

### 9.2 Vị trí lưu trữ dữ liệu trong CSDL
- Migration: `/supabase/migrations/20261001000001_add_course_benefits_section.sql`.
- Các cột trong bảng `public.courses`:
  - `benefits_title` (`VARCHAR(255)` DEFAULT NULL): Lưu tiêu đề section tùy biến.
  - `benefits_content` (`TEXT` DEFAULT NULL): Lưu nội dung chi tiết quyền lợi sinh viên.
- Persistent companion storage backend: `data/course_benefits.json` đảm bảo tính toàn vẹn dữ liệu trong mọi trường hợp môi trường.

---

## 10. Triển khai A2.4: Công Khai / Ngừng Giới Thiệu Khóa Học & Chức Năng "Xem Khóa Học"

### 10.1 Quy tắc nghiệp vụ vòng đời khóa học (Course Lifecycle Rules)
1. **Phân biệt hai ý nghĩa trạng thái**:
   - `is_active` (Hiển thị công khai): `TRUE` (Công khai trên cổng trường) | `FALSE` (Bản nháp / Chưa công khai). Khách đoán URL/slug bản nháp sẽ bị chặn với mã HTTP 404.
   - `accepts_referrals` (Quyền tiếp nhận giới thiệu/đăng ký): `TRUE` (Đang nhận) | `FALSE` (Ngừng nhận).
   - `status`: Chuẩn hóa 3 trạng thái: `DRAFT` (Bản nháp), `ACTIVE` (Công khai & Nhận GT), `STOPPED` (Ngừng giới thiệu).
2. **Khi Khóa học Ngừng giới thiệu (`STOPPED`)**:
   - Cổng CTV: Khóa học biến mất khỏi danh sách chọn tạo link/QR của CTV. Chặn API tạo link mới (HTTP 403).
   - Link / QR cũ: Vẫn mở được để khách đọc nội dung giới thiệu khóa học.
   - Cảnh báo trạng thái: Trang hiển thị banner nổi bật màu hổ phách: *"Khóa học hiện ngừng nhận đăng ký"* kèm lý do ngừng.
   - Nút "Đăng ký": Bị vô hiệu hóa trên cả giao diện và backend API.
   - Backend API (`POST /api/v1/public/leads`): Đọc trạng thái thời gian thực và chặn đăng ký với mã lỗi HTTP 400 `COURSE_REFERRAL_STOPPED`.
   - **Bảo toàn nguyên vẹn hồ sơ**: Toàn bộ khách đã đăng ký trước đó, CTV sở hữu, mã hồ sơ trường và thù lao được giữ nguyên tuyệt đối. Nhân viên tiếp tục xử lý đối chiếu bình thường.
3. **Khi Mở lại giới thiệu (`REOPEN_REFERRAL`)**:
   - Khóa học quay trở lại danh sách dành cho CTV đủ điều kiện.
   - Tất cả link/mã/QR cũ tự động hoạt động trở lại bình thường mà không cần đổi URL hoặc tạo lại mã.
   - Quyền giới thiệu của từng CTV vẫn tuân thủ trạng thái CTV theo A1.4 (mở lại khóa học không khôi phục quyền cho CTV đang tạm ngưng).
4. **Khi Công khai khóa học (`PUBLISH`)**:
   - Kiểm tra điều kiện tối thiểu: Mã khóa học, Tên khóa học, Hệ đào tạo, Thời lượng và Mô tả ngắn. Không tự ý coi học phí trống là 0.

### 10.2 Bảng Đối Chiếu Thao Tác Trước & Sau Khi Ngừng Giới Thiệu
| Thao tác / Quyền hạn | Đang nhận giới thiệu (`ACTIVE`) | Ngừng giới thiệu (`STOPPED`) | Mở lại giới thiệu (`ACTIVE`) |
| :--- | :--- | :--- | :--- |
| **Xuất hiện trong danh sách CTV** | Có (đầy đủ link và QR) | Ẩn khỏi danh sách tạo mới | Tự động xuất hiện trở lại |
| **Tạo link / mã / QR mới** | Được phép | Bị chặn (HTTP 403) | Khôi phục bình thường |
| **Khách mở link / QR cũ** | Xem nội dung bình thường | Xem nội dung + Cảnh báo Ngừng nhận đăng ký | Xem và đăng ký bình thường |
| **Nút "Đăng ký" qua link cũ** | Hoạt động bình thường | Bị vô hiệu hóa | Tự động kích hoạt trở lại |
| **Khách gửi form đăng ký tư vấn**| Chấp nhận tạo Lead | Bị từ chối (HTTP 400 `COURSE_REFERRAL_STOPPED`) | Chấp nhận tạo Lead |
| **Hồ sơ lead đã ghi nhận trước đó**| Giữ nguyên | Giữ nguyên 100% | Giữ nguyên 100% |
| **Đối chiếu & thù lao đã duyệt** | Giữ nguyên | Tiếp tục xử lý bình thường | Tiếp tục xử lý bình thường |

### 10.3 Chức năng "Xem khóa học" tại danh sách A2.1
- Bổ sung nút **"Xem"** (biểu tượng con mắt) tại từng dòng khóa học trên danh sách quản trị A2.1.
- Mở modal chỉ đọc (`CourseDetailModal` với `isViewOnly={true}`) bằng dữ liệu đã lưu từ API chi tiết (`/api/v1/admin/courses/:id`).
- Hiển thị đầy đủ hình ảnh, mã, tên, hệ đào tạo, thời lượng, học phí, mô tả chi tiết và section quyền lợi sinh viên tùy biến.
- Hiển thị rõ badge trạng thái: `Đang nhận giới thiệu`, `Ngừng giới thiệu` hoặc `Bản nháp – Chưa công khai`.
- Admin/Staff có quyền xem cả khóa học chưa công khai hoặc đã ngừng giới thiệu.
- Thao tác này hoàn toàn không tạo link/QR tiếp thị, không tính lượt truy cập và không tạo đăng ký.
- Phân biệt rõ với nút "Xem trước" trong form sửa (vốn hiển thị dữ liệu chưa lưu đang nhập).
- Đóng modal quay trở lại đúng vị trí danh sách, giữ nguyên từ khóa tìm kiếm và trang hiện tại.

### 10.4 Danh Sách File, API và Migration Đã Chỉnh Sửa / Bổ Sung
1. **Migration SQL**:
   - `/supabase/migrations/20261001000001_add_course_benefits_section.sql`: Thêm `benefits_title`, `benefits_content`.
   - `/supabase/migrations/20261001000002_course_referral_status_and_lifecycle.sql`: Thêm `accepts_referrals`, `status`, `stop_reason`, `status_note`, `status_updated_at`, `status_updated_by`.
2. **Backend (`server.ts`)**:
   - `attachCourseLifecycle()`, `attachCourseBenefits()`, `attachCourseFull()`: Đồng bộ và gắn dữ liệu trạng thái / quyền lợi.
   - `GET /api/v1/admin/courses`: Trả về danh sách khóa học kèm `status`, `accepts_referrals`, `stop_reason`, `slug`.
   - `GET /api/v1/admin/courses/:id`: Trả về chi tiết khóa học kèm trạng thái và quyền lợi sinh viên.
   - `PATCH /api/v1/admin/courses/:id/status`: Endpoint chuyên biệt thực hiện `PUBLISH`, `STOP_REFERRAL`, `REOPEN_REFERRAL`, kiểm tra quyền Staff/Admin, ghi nhận Audit Log.
   - `PATCH /api/v1/admin/courses/:id`: Đảm bảo form sửa A2.2 không thay đổi trạng thái vòng đời ngoài endpoint chuyên biệt A2.4.
   - `GET /api/v1/public/courses/:slug`: Chặn khách xem khóa bản nháp (404), cho phép xem khóa `STOPPED`.
   - `POST /api/v1/public/leads`: Kiểm tra điều kiện nguyên tử, chặn tạo lead nếu khóa học `is_active === false` hoặc `accepts_referrals === false`.
   - `GET /api/v1/affiliate/courses`: Lọc chỉ trả về các khóa học vừa công khai vừa đang nhận giới thiệu.
3. **Frontend**:
   - `/src/components/admin/CourseListView.tsx`:
     - Bổ sung nút "Xem" (mở modal chỉ đọc dữ liệu đã lưu).
     - Cập nhật cột "Trạng thái" phân biệt rõ Đang nhận giới thiệu / Ngừng giới thiệu / Chưa công khai.
     - Bổ sung nút chuyển trạng thái phù hợp ngữ cảnh ("Công khai", "Ngừng GT", "Mở lại").
     - Hộp thoại Modal xác nhận chuyển trạng thái: Hiển thị tác động đến link cũ, bắt buộc nhập lý do khi ngừng giới thiệu, kiểm tra điều kiện thông tin tối thiểu trước khi công khai, chống double-click (`statusSubmitting`).
     - Banner thông báo kết quả (Toast banner).
     - Tách biệt form sửa A2.2 không can thiệp trạng thái.
   - `/src/components/public/CourseDetailModal.tsx`:
     - Nhãn nút chuẩn hóa thành "Đăng ký".
     - Hỗ trợ chế độ xem chỉ đọc `isViewOnly`.
     - Cảnh báo "Khóa học hiện ngừng nhận đăng ký" kèm lý do chi tiết.
     - Vô hiệu hóa nút Đăng ký khi khóa học ngừng nhận đăng ký hoặc ở chế độ xem.
     - Cập nhật các nhãn giao diện A2.3: "Mã khoá học:", "Tên khoá học: [Tên]", "Học phí", canh đều văn bản mô tả ngắn (`text-align: justify`).
   - `/src/services/api.ts`: Bổ sung phương thức `updateCourseStatus(id, { action, reason, note })`.
   - `/src/types/index.ts`: Bổ sung kiểu `CourseStatus` ('DRAFT' | 'ACTIVE' | 'STOPPED') và các thuộc tính liên quan vào interface `Course`.



## 11. Triển khai P1 & P2: Màn Hình "Thông Tin Cá Nhân" Cho Admin, Staff và CTV

### 11.1 P1 – Kiểm Kê Nguồn Dữ Liệu Hồ Sơ & Bảng Ánh Xạ CSDL
1. **Nguyên tắc cốt lõi**:
   - Tách biệt rõ hồ sơ người dùng chung (`public.profiles`) và hồ sơ nghiệp vụ tuyển sinh riêng của Cộng tác viên (`public.affiliate_profiles`). Tuyệt đối **không** tạo bản ghi `affiliate_profiles` giả cho Admin và Staff.
   - Định danh chủ tài khoản xác thực qua ID thực (`profiles.id` và `affiliate_profiles.user_id`), không dùng email để đoán hồ sơ.
   - Loại bỏ hoàn toàn dữ liệu giả/mock, thay thế bằng dữ liệu thật truy vấn qua API.

2. **Bảng Đối Chiếu Các Trường Hồ Sơ (Mapping Table)**:
| Nhãn Giao Diện | Vai Trò Áp Dụng | Nguồn Dữ Liệu | Bảng / Cột CSDL | Có Giả Lập Không? | Quyền Hạn (P2) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Họ và tên** | Admin, Staff, CTV | Phiên xác thực / Profiles | `public.profiles.full_name` | Không | Chỉ đọc |
| **Email đăng nhập** | Admin, Staff, CTV | Supabase Auth / Profiles | `public.profiles.email` | Không | Chỉ đọc |
| **Số điện thoại** | Admin, Staff, CTV | Profiles | `public.profiles.phone` | Không | Chỉ đọc |
| **Ảnh đại diện (Avatar)** | Admin, Staff, CTV | Profiles | `public.profiles.avatar_url` | Không | Chỉ đọc |
| **Vai trò tài khoản** | Admin, Staff, CTV | Profiles | `public.profiles.role` | Không | Chỉ đọc (Hệ thống) |
| **Trạng thái tài khoản** | Admin, Staff, CTV | Profiles | `public.profiles.is_active` | Không | Chỉ đọc (Hệ thống) |
| **Xác thực email** | Admin, Staff, CTV | Supabase Auth | `auth.users.email_confirmed_at` | Không | Chỉ đọc |
| **Mã số thuế** | Admin, Staff, CTV | Profiles / Affiliate Profiles | `public.profiles.tax_code` (Chuẩn bị migration `20261001000003` & companion store) | Không (NULL nếu chưa cập nhật) | Chỉ đọc (Chờ P3 cho phép sửa) |
| **Địa chỉ cư trú** | CTV (và Admin/Staff) | Affiliate Profiles | `public.affiliate_profiles.address` | Không | Chỉ đọc |
| **Số CCCD** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.id_card_number` | Không | Chỉ đọc |
| **Ngày cấp CCCD** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.id_card_issued_date` | Không | Chỉ đọc |
| **Nghề nghiệp / Đơn vị** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.occupation` | Không | Chỉ đọc |
| **Số tài khoản ngân hàng**| Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.bank_account_number` | Không | Chỉ đọc |
| **Ngân hàng & Chi nhánh** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.bank_name` | Không | Chỉ đọc |
| **Mã CTV chính thức** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.affiliate_code` | Không | Chỉ đọc |
| **Trạng thái duyệt CTV** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.status` | Không | Chỉ đọc |
| **Cán bộ duyệt hồ sơ** | Chỉ CTV | Affiliate Profiles + Profiles | `public.affiliate_profiles.reviewed_by` | Không | Chỉ đọc |
| **Thời gian duyệt** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.reviewed_at` | Không | Chỉ đọc |
| **Thông tin tạm ngưng** | Chỉ CTV | Affiliate Profiles | `public.affiliate_profiles.suspension_reason` | Không | Chỉ đọc |

340: ### 11.2 P2 – Màn Hình Thông Tin Cá Nhân Chỉ Đọc (Read-Only Profile)
341: 1. **Endpoint API Mới**:
342:    - `GET /api/v1/user/profile`: Xác thực danh tính từ Bearer token hoặc demo session, trả về đúng thông tin profile cá nhân theo vai trò (Admin, Staff, hoặc CTV) mà không bị ghi đè hay lộ ghi chú nội bộ bảo mật.
343: 2. **Quy tắc hiển thị giao diện**:
344:    - Dùng lại cấu trúc thẻ (cards) và bố cục tương tự "Chi tiết hồ sơ CTV" (`AffiliateDetailView`), đảm bảo nhất quán giao diện hệ thống.
345:    - Trường trống (ví dụ: Số CCCD, Ngân hàng, Mã số thuế nếu chưa cập nhật) hiển thị rõ chuỗi **"Chưa cập nhật"**, không ẩn phần tử hoặc điền dữ liệu mẫu.
346:    - Trường **Mã số thuế** hỗ trợ kiểu `TEXT` bảo toàn số 0 ở đầu (ví dụ: `0312345678`), tuân thủ quy tắc không log mã số thuế ra console.
347:    - Ngày giờ hiển thị chuẩn múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
348:    - Hỗ trợ cả 2 chế độ: Mở trực tiếp qua route (`/portal/profile` và `/admin/profile`) và mở qua modal từ menu tài khoản trên header.
349:    - Toàn bộ ở P2 là chế độ chỉ đọc (chưa bật form sửa thông tin hay tải ảnh đại diện).
350: 
351: ---
352: 
353: ## 12. Kiểm Kê C1.1 — Kiểm Kê Và Chốt Đặc Tả Module Khóa Học Trong Cổng CTV
354: 
355: 1. **Mục tiêu & Phạm vi thực hiện**:
356:    - Đã thực hiện kiểm kê toàn diện tài liệu thiết kế, mã nguồn hiện tại, API backend, cấu trúc cơ sở dữ liệu `courses`, cơ chế link/QR giới thiệu, và trạng thái hiển thị của module Khóa học tại Cổng CTV (`/portal/courses`).
357:    - Đã lập báo cáo chi tiết tại `/docs/CTV_C1_1_COURSES_AUDIT.md`.
358: 2. **Kết quả kiểm kê**:
359:    - Xác định route `/portal/courses` hiện đang hiển thị `AffiliatePlaceholderPage` (đang phát triển), chưa tích hợp danh sách thẻ khóa học thật.
360:    - Xác định API backend `GET /api/v1/affiliate/courses` đã sẵn sàng trả về danh sách khóa học kèm `referral_url` và `affiliate_code` khi CTV có trạng thái `ACTIVE`.
361:    - Chốt đặc tả giao diện danh sách thẻ khóa học, thông tin chi tiết, link giới thiệu, mã QR, và tài liệu tuyển sinh cho các bước tiếp theo (C1.2 đến C1.6).
362: 3. **Trạng thái module**:
    - Bước C1.1 là bước kiểm kê tĩnh, chưa triển khai mã nguồn mới và chưa đánh dấu module Khóa học Cổng CTV là PASS.
364: 
365: ---
366: 
367: ## 13. Triển Khai C1.2 — Danh Sách Khóa Học Trong Cổng CTV
368: 
369: 1. **Mục tiêu & Phạm vi thực hiện**:
370:    - Thay thế trang placeholder tại `/portal/courses` bằng component danh sách khóa học dạng thẻ thật (`AffiliateCourseListView.tsx`).
371:    - Kết nối API `GET /api/v1/affiliate/courses`, áp dụng strict filtering (chỉ hiển thị khóa học `is_active = true` và `accepts_referrals = true`).
372:    - Xây dựng hệ thống tìm kiếm không dấu, bộ lọc theo Khoa & Hệ đào tạo, sắp xếp A-Z / Z-A, và phân trang 12 khóa/trang.
373:    - Hiển thị thông tin học phí, chính sách thưởng 500k cố định kèm chú thích đối soát, và tính năng sao chép link tiếp thị cá nhân hóa.
374: 2. **Kết quả kiểm tra**:
375:    - Build TypeScript và Vite Production thành công 100%.
376:    - Toàn bộ tính năng tìm kiếm, lọc, sắp xếp, phân trang và sao chép link hoạt động ổn định, tuân thủ nguyên tắc frontend design và bảo mật backend.
377:    - Báo cáo chi tiết tại `/docs/CTV_C1_2_COURSES_LIST.md`.
378: 3. **Trạng thái module**:
379:    - Hoàn thành C1.2.
380: 
381: ---
382: 
383: ## 14. Triển Khai C1.3 — Trang Chi Tiết Khóa Học Trong Cổng CTV
384: 
385: 1. **Mục tiêu & Phạm vi thực hiện**:
386:    - Chuyển từ phương án Modal sang **trang chi tiết riêng biệt** (`AffiliateCourseDetailView.tsx`) tại route `/portal/courses/:courseId` (hỗ trợ slug hoặc ID).
387:    - Bổ sung nút "Chi tiết" trên mỗi thẻ khóa học tại danh sách C1.2 để điều hướng sang trang chi tiết đúng khóa.
388:    - Xây dựng API backend `GET /api/v1/affiliate/courses/:courseId` kiểm tra phiên CTV `ACTIVE`, kiểm tra vòng đời công khai, và trả về 404 chuẩn nếu khóa không tồn tại hoặc bị ẩn.
389:    - Trình bày đầy đủ thông tin: ảnh đại diện, tên, mã, khoa, hệ đào tạo, thời lượng, học phí, mô tả chi tiết / chương trình học được làm sạch an toàn qua `sanitizeHtml`, section quyền lợi sinh viên (nếu có), chính sách thưởng 500k đối soát, và khối link giới thiệu cá nhân hóa của CTV kèm nút sao chép link.
2. **Kết quả kiểm tra**:
   - Build TypeScript và Vite Production thành công 100%.
   - Định tuyến URL trực tiếp, tải lại trang, nút "Quay lại danh sách", xử lý khóa không tồn tại (404) hoạt động hoàn hảo.
   - Báo cáo chi tiết tại `/docs/CTV_C1_3_COURSE_DETAIL.md`.
3. **Trạng thái module**:
   - Hoàn thành C1.3. Dừng sau C1.3.

---

## 15. Triển Khai & Nghiệm Thu Bổ Sung "Nhóm Nghề" (Career Group)

1. **CSDL & Migration**:
   - Bảng `public.courses` đã bổ sung cột `career_group VARCHAR(100) DEFAULT NULL` thông qua migration `/supabase/migrations/20261002000001_add_career_group_to_courses.sql`.
   - Ràng buộc CSDL `chk_career_group_valid` kiểm soát nghiêm ngặt đúng 5 giá trị chuẩn: `'Làm bánh'`, `'Nấu ăn'`, `'Nhà hàng'`, `'Khách sạn'`, `'Pha chế'` hoặc `NULL`.
   - Các khóa học cũ giữ nguyên giá trị `NULL`, không tự ý suy diễn dữ liệu.

2. **Backend & API**:
   - `POST /api/v1/admin/courses`: Nhận và kiểm tra hợp lệ `career_group` trong payload tạo mới, lưu thật vào Supabase.
   - `PATCH /api/v1/admin/courses/:id`: Cho phép cập nhật `career_group` (chọn nhóm mới hoặc xóa về NULL). Nếu không truyền trường này trong payload cập nhật khác (như sửa tiêu đề, học phí), giá trị `career_group` hiện có được bảo toàn tuyệt đối.
   - `GET /api/v1/admin/courses`: Đã bổ sung `career_group` vào danh sách cột truy vấn `select(...)` và fallback dữ liệu.
   - `GET /api/v1/admin/courses/:id`, `GET /api/v1/affiliate/courses`, `GET /api/v1/affiliate/courses/:courseId`, `GET /api/v1/public/courses`, `GET /api/v1/public/courses/:slug`: Đã đồng bộ trả về trường `career_group`.
   - Khắc phục lỗi ép kiểu PostgREST UUID 22P02 khi truy vấn chi tiết theo slug URL.

3. **Giao diện & Hiển thị**:
   - **Danh sách Admin (`CourseListView.tsx`)**: Bổ sung cột "Nhóm nghề" nằm ngay sau cột "Hệ đào tạo". Khóa học chưa có nhóm nghề hiển thị nhãn "Chưa cập nhật".
   - **Form Tạo/Sửa Admin (`CourseListView.tsx`)**: Bổ sung combo box "Nhóm nghề" đặt cạnh "Hệ đào tạo" với 5 lựa chọn chuẩn và mục mặc định "Chọn nhóm nghề". Tải và hiển thị đúng nhóm nghề đã lưu khi mở form sửa.
   - **Xem trước khóa học (`CourseDetailModal.tsx`)**: Modal xem trước hiển thị box thông tin "Nhóm nghề" dựa trên giá trị đang chọn trong form.
   - **Xem khóa học Admin (`CourseDetailModal.tsx`)**: Hiển thị box thông tin "Nhóm nghề" theo dữ liệu thực lưu trong CSDL.
   - **Danh sách khóa học Cổng CTV (`/portal/courses` - `AffiliateCourseListView.tsx`)**: Hiển thị rõ dòng "Nhóm nghề: [Tên]" hoặc "Nhóm nghề: Chưa cập nhật" trên từng card khóa học.
   - **Chi tiết khóa học Cổng CTV (`/portal/courses/:courseId` - `AffiliateCourseDetailView.tsx`)**: Bổ sung card thông số "Nhóm nghề" trong khối thông tin nổi bật.
   - **Trang khóa học công khai (`PublicHome.tsx`)**: Bổ sung thông tin "Nhóm nghề" trên từng card khóa học và tự động kích hoạt chi tiết khi truy cập qua link tiếp thị có `course=slug`.
   - **Form đăng ký tư vấn (`LeadConsultationForm.tsx`)**: Bổ sung hiển thị `[Nhóm nghề]` cạnh tiêu đề khóa học trong danh sách chọn.




---

## 16. Hoàn Thiện & Nghiệm Thu C1.2 — Giao Diện Danh Sách Khóa Học Cổng CTV

1. **Thay thế "Khoa đào tạo" bằng "Nhóm nghề"**:
   - Loại bỏ hoàn toàn trường và nhãn `department` khỏi bộ lọc và thẻ khóa học tại `/portal/courses`.
   - Bộ lọc đổi thành **"Tất cả nhóm nghề"**, danh sách lấy từ 5 nhóm nghề chuẩn A2 (`CAREER_GROUP_OPTIONS`) kết hợp cùng các nhóm nghề thực tế trả về từ CSDL. Bổ sung mục **"Chưa phân nhóm"** để lọc các khóa chưa gán nhóm.
   - Thẻ khóa học hiển thị badge Nhóm nghề nổi bật (`bg-blue-50 text-blue-900 border-blue-200/80`), hỗ trợ tên dài xuống dòng tối đa 2 dòng không bị cắt chữ. Khóa chưa gán nhóm hiển thị badge `"Chưa phân nhóm"`. Mã khóa học được tách riêng biệt với chữ nhỏ màu xám.
   - Thay đổi bất kỳ bộ lọc nào đều tự động đưa phân trang về trang đầu tiên.

2. **Nâng cấp thẻ khóa học chuẩn nhận diện thương hiệu STHC**:
   - Thẻ nền trắng, viền rõ `border-slate-200/90`, bo góc 16px (`rounded-2xl`), hiệu ứng hover tăng bóng `hover:shadow-md` và chuyển viền xanh nhẹ `hover:border-blue-900/50` không xô lệch bố cục.
   - Ảnh đại diện đồng nhất tỷ lệ và chiều cao (`h-48`). Khóa chưa có ảnh hiển thị nền xanh navy `#0B1E3F` với biểu tượng vàng `BookOpen` và mã khóa vàng.
   - Badge Hệ đào tạo trên ảnh có nền tối tương phản cao (`bg-slate-950/85 backdrop-blur-md text-white`).
   - Thời gian và học phí trình bày mạch lạc; học phí dùng `whitespace-nowrap` kèm `\u00A0đ` chống gãy số tiền sang hai dòng.
   - Khối chính sách thưởng nền vàng nhạt `bg-amber-50/80`, viền vàng `border-amber-300/80`, giữ nguyên vẹn nội dung thù lao 500k và điều kiện đối soát/phê duyệt.
   - Nút **"Chi tiết"** chuyển sang nền xanh navy (`bg-blue-900`), chữ trắng (`text-white`).
   - Tích hợp modal mã QR tuyển sinh (`QRModal`), duy trì nút sao chép link và liên kết mở thử.
   - Các khối thông tin và nút thao tác được căn thẳng hàng đồng bộ giữa các thẻ cùng hàng.

3. **Thu gọn khoảng trống đầu trang**:
   - Tối ưu hóa padding của vùng chứa `<main>` trong `AppLayout.tsx` thành `px-4 py-4 sm:px-8 sm:py-6`, đảm bảo khoảng cách từ đáy header đến tiêu đề nội dung đạt chuẩn: 24px trên máy tính và 16px trên điện thoại.
   - Xóa bỏ `py-8` dư thừa trong component con, điều chỉnh khoảng cách giữa tiêu đề, bộ lọc và danh sách xuống 20–24px (`space-y-5 sm:space-y-6`).
   - Không sử dụng margin âm, các màn hình khác trong `AppLayout` được hưởng lợi giao diện gọn gàng và không bị ảnh hưởng tiêu cực.

4. **Trạng thái & Kiểm tra**:
   - `npm run lint` và `compile_applet` PASS 100%.
   - Không chạy seed hay sửa dữ liệu nghiệp vụ. Hoàn tất đúng phạm vi C1.2.

---

## 17. Hoàn Thiện & Nghiệm Thu C1.3 — Màn Hình Chi Tiết Khóa Học Cổng CTV

1. **Sắp xếp lại cấu trúc thông tin đầu trang**:
   - Xóa bỏ hoàn toàn nhãn và thông tin "Khoa đào tạo".
   - Đưa 2 card/badge "Hệ đào tạo" và "Nhóm nghề" lên hàng đầu tiên của khối thông tin, đặt ngay phía trên tên khóa học. Nhóm nghề lấy từ CSDL chuẩn Admin A2 (`career_group`), khóa chưa gán nhóm hiển thị badge `"Chưa phân nhóm"`.
   - Giữ mã khóa học hiển thị rõ ràng, tách bạch ở góc phải hàng đầu.
   - Bố trí 3 card thông số phía dưới: Thời gian đào tạo, Học phí (chống ngắt dòng tiền), Đã đăng ký.
   - Giữ nguyên ảnh đại diện chuẩn tỷ lệ, mô tả tóm tắt và khối chính sách thưởng 500k STHC.

2. **Thêm card "Đã đăng ký" & Data Contract**:
   - Hiển thị tổng số lượng người học đăng ký khóa học trên toàn hệ thống trường STHC.
   - Trạng thái hiện tại: Chưa có module thống kê độc lập -> Hiển thị **`—`** và chú thích **`Chưa cập nhật`** (chỉ hiển thị 0 khi API thực sự trả về số 0).
   - Hợp đồng dữ liệu cho module thống kê: trường `registered_count: number | null`, quy tắc đếm độc nhất theo CCCD/SĐT người học đã đối soát hợp lệ (`reconciliation_status = 'MATCHED_VALID'`) theo `course_id`.

3. **Mã QR trực tiếp & Bộ nút chia sẻ (Zalo, Facebook, Mail)**:
   - Mã QR được tạo trực tiếp ngay trong section "Link giới thiệu khóa học của bạn", hiển thị sắc nét bên cạnh khối liên kết và nút sao chép. Bổ sung nút **"Tải ảnh QR (PNG)"**.
   - Bố cục responsive: Desktop chia 2 cột (trái: link + chia sẻ, phải: QR code); Mobile xếp 1 cột dọc tối ưu ngón tay.
   - Thêm dòng "Chia sẻ qua:" với 3 nút chỉ hiển thị icon: Zalo, Facebook, Mail. Có tooltip và aria-label.
   - Facebook mở dialog sharer chính thức; Mail mở mailto soạn thảo sẵn tiêu đề và nội dung; Zalo sử dụng URL Web Share Plugin (`https://sp.zalo.me/plugins/share`).
   - Ghi chú kỹ thuật Zalo: Cần hoàn tất cấu hình Zalo OA ID (`data-oaid`) hoặc Zalo App ID trên portal `developers.zalo.me` để hiển thị đầy đủ preview OpenGraph trên Zalo Feed/Chat.

4. **Hiển thị đúng định dạng nội dung đã soạn (HTML & Markdown)**:
   - Kết hợp thư viện `marked` (`gfm: true`, `breaks: true`) và `sanitizeHtml` để làm sạch an toàn.
   - Hỗ trợ hoàn hảo cả nội dung HTML truyền thống và nội dung Markdown/plain text xuống dòng (như khóa Bánh Âu `BA`). Giữ đúng tiêu đề, đoạn văn, danh sách có số thứ tự, bảng biểu có vùng cuộn ngang, ảnh không tràn màn hình.
   - Tiêu đề khối "Đặc quyền…" tự động lấy tên khóa học đang xem, khắc phục triệt để lỗi gán cứng tên "Bánh Âu" cho các khóa học khác.

5. **Xóa bỏ hoàn toàn section "Thông tin tuyển sinh"**:
   - Loại bỏ section và dọn dẹp import thừa (`Building`, `Calendar`). Phần nội dung chi tiết mở rộng toàn bộ độ rộng trang.

6. **Trạng thái & Kiểm tra**:
   - `compile_applet`: Build succeeded 100%.
   - `npm run lint`: PASS 100% (0 lỗi, 0 cảnh báo).
   - Không chạy seed hay thay đổi dữ liệu nghiệp vụ CSDL.

---

## 18. Hoàn Thiện & Nghiệm Thu C1.4 — Hoàn Thiện & Nghiệm Thu Link Giới Thiệu và QR

- **Mã nhiệm vụ:** `STHC-CTV-C1.4-COMPLETED`
- **Phân hệ:** Cổng Cộng tác viên Tuyển sinh — Module Khóa học & Tiếp thị Tuyển sinh (`/portal/courses`, `/portal/courses/:courseId`, `/catalog`, `/api/v1/affiliate/courses`, `/api/v1/public/leads`)
- **Trạng thái:** Hoàn thành toàn diện, sẵn sàng bàn giao và nghiệm thu.

### 1. Kiểm kê & phân định chức năng hiện có vs nâng cấp C1.4
- **API Referral:** `/api/v1/affiliate/courses` và `/api/v1/affiliate/courses/:courseId` đã được chuẩn hóa để nhận diện CTV từ phiên đăng nhập thực tế (Supabase Auth Bearer token hoặc demo session), không nhận mã CTV do frontend truyền tự do.
- **Nguồn mã CTV & Định danh khóa:** Mã CTV lấy từ trường `affiliate_code` thực tế trong CSDL (`affiliate_profiles`). Định danh khóa học dùng `slug` hoặc `code` an toàn, được mã hóa URL bằng `encodeURIComponent`.
- **Cấu hình Domain:** Loại bỏ triệt để hardcode `localhost:3000`. Hệ thống sử dụng biến môi trường chuẩn `APP_BASE_URL`.
- **Component QR:** Tái sử dụng `QRModal` trên trang danh sách C1.2 và component QR trực tiếp trên trang chi tiết C1.3. Cả hai đều xuất ra QR có cùng nội dung referral URL, ảnh PNG sắc nét (320px, margin 3, nền trắng), đặt tên file chuẩn `QR-[CourseCode]-[AffiliateCode].png`.
- **Sửa cửa sổ xem QR (QRModal)** theo ảnh và yêu cầu người dùng:
  - Text thanh tiêu đề canh giữa: `text-center uppercase`.
  - Xóa biểu tượng icon trước thanh tiêu đề.
  - Xóa bỏ hoàn toàn dòng "Trường Du lịch Saigontourist (STHC)".
  - Xóa chữ "STHC" ở dòng chú thích: chuyển thành "Quét camera để truy cập form tuyển sinh".
  - Toàn bộ thiết kế sau này không tự gán cứng STHC hay tên trường để dễ dàng thích ứng khi đổi thương hiệu.

### 2. Sửa domain của link giới thiệu & Cơ chế biến môi trường
- **Nguyên nhân link cũ dùng localhost:3000:** Trong code backend `server.ts` trước đây, referral URL được tạo bằng `req.get('host') || 'localhost:3000'`. Khi chạy thử ở local dev hoặc qua proxy dev server, `host` là `localhost:3000`. Không có cơ chế đọc biến môi trường domain công khai.
- **Giải pháp chuẩn C1.4:**
  - Xây dựng hàm trung tâm `resolveReferralBaseUrl(req)`.
  - **Ưu tiên số 1:** Đọc và làm sạch biến môi trường `APP_BASE_URL` (ví dụ: `https://sthc-ctv-system.onrender.com` hoặc `https://tuyensinh.sthc.edu.vn`).
  - **Môi trường Production (`NODE_ENV === 'production'`):** TUYỆT ĐỐI KHÔNG tự động fallback sang localhost hoặc URL nội bộ. Nếu thiếu `APP_BASE_URL`, backend trả về `referral_url: null` và `referral_url_error` hướng dẫn cấu hình rõ ràng, frontend hiển thị thông báo cảnh báo cấu hình thân thiện, ngăn chặn việc cấp link hoặc mã QR sai.
  - **Môi trường Development:** Chỉ cho phép dùng `localhost:3000` khi chạy trên môi trường dev nội bộ (`host.includes('localhost')`). Nếu chạy trên container preview Cloud Run mà không có `APP_BASE_URL`, hệ thống ngăn chặn việc dùng domain nội bộ (`*.run.app`) làm domain chia sẻ vì khách không thể truy cập nếu chưa xác thực nội bộ.
  - **Vị trí cấu hình trên Render:**
    - File cấu hình: `render.yaml` đã được khai báo biến `APP_BASE_URL` (sync: false).
    - Hướng dẫn cấu hình trên Render: Truy cập **Render Dashboard** -> Chọn Web Service `sthc-ctv-system` -> Tab **Environment** -> Thêm `APP_BASE_URL` với giá trị là domain công khai của ứng dụng (ví dụ: `https://sthc-ctv-system.onrender.com`).
  - Cấu trúc link công khai được duy trì chuẩn: `${APP_BASE_URL}/?ref=${affiliate_code}&course=${course_slug}`.

### 3. Bảo đảm link đúng CTV và đúng khóa học
- Backend lấy CTV trực tiếp từ token xác thực của phiên đăng nhập (`req.headers.authorization`) tra cứu bảng `affiliate_profiles`, hoặc qua demo switcher session.
- Bác bỏ mọi tham số mã CTV do client tự gửi lên.
- Kiểm tra điều kiện `status === 'ACTIVE'`: nếu CTV đang ở trạng thái `SUSPENDED` hoặc `PENDING_REVIEW`, API từ chối cấp link và trả về thông báo lỗi rõ ràng.
- Khóa học trong danh sách của CTV bắt buộc phải thỏa mãn: `is_active === true` VÀ `accepts_referrals === true`.
- Tra cứu khóa học hỗ trợ cả UUID, slug và code, không gán cứng mã khóa là UUID.
- Tất cả các điểm chạm (hiển thị, sao chép, mở trang công khai, mã QR canvas, ảnh PNG tải xuống, chia sẻ Zalo/Facebook/Mail) đều dùng chung **duy nhất một nguồn referral URL** được cấp từ backend.
- Đổi khóa học trên trang chi tiết lập tức xóa dữ liệu và QR của khóa trước (`setCourse(null)`, `setQrDataUrl(null)`), tránh tình trạng hiển thị nhầm QR khóa cũ.

### 4. Hoàn thiện thao tác tương tác Link và QR
- **Sao chép link:** Chỉ kích hoạt trạng thái "Đã sao chép" khi `navigator.clipboard.writeText` trả về Promise resolved thành công.
- **Mở trang công khai:** Liên kết mở thẻ mới an toàn với `rel="noopener noreferrer"`, chuyển hướng đúng khóa kèm theo tham số `?ref=...&course=...`.
- **Chất lượng QR & PNG:** Canvas và ảnh PNG tải xuống có kích thước 320x320px, viền trắng tĩnh 3 modules (`margin: 3`), màu sắc chuẩn navy `#0B1E3F` trên nền trắng `#FFFFFF`, không có logo che mất vùng quét.
- **Tên file tải xuống:** Đã làm sạch ký tự đặc biệt, chuẩn hóa thành `QR-[CourseCode]-[AffiliateCode].png`.
- **Chia sẻ mạng xã hội:**
  - Dòng "Chia sẻ qua:" với 3 icon Zalo, Facebook, Mail đồng bộ kích thước 36x36px bo tròn 12px, có tooltip và aria-label.
  - **Facebook:** Sử dụng endpoint chính thức `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` mở popup 600x520.
  - **Mail:** Sử dụng giao thức `mailto:?subject=${encodedSubject}&body=${encodedBody}` với tiêu đề và nội dung chứa tên khóa, mã khóa và link giới thiệu; không đặt sẵn người nhận.
  - **Zalo:** Sử dụng Zalo Web Share Plugin `https://sp.zalo.me/plugins/share?href=${encodedUrl}` mở popup 600x560. *Lưu ý cấu hình:* Để hiển thị đầy đủ thẻ OpenGraph hình ảnh và mô tả trên ứng dụng Zalo, cần hoàn thiện đăng ký Zalo App ID hoặc Official Account trên `developers.zalo.me`.

### 5. Hoàn thiện luồng công khai & Bảo hộ nguồn giới thiệu
- **Khách không cần đăng nhập:**
  - Khách quét QR hoặc click link tiếp thị `/?ref=...&course=...`.
  - `App.tsx` tiếp nhận tham số, ghi nhận mã giới thiệu vào `localStorage` kèm dấu thời gian.
  - Chuyển hướng người học vào `/catalog?ref=...&course=...`, tự động mở modal chi tiết khóa học tương ứng và đặt sẵn khóa học trong form tư vấn.
  - Người học bấm "Đăng ký" và điền form tư vấn. Quá trình gửi form và chuyển sang màn hình cảm ơn hoàn toàn không đòi hỏi đăng nhập hay chuyển hướng vào `/portal`.
  - Khách tải lại trang hoặc điều hướng qua các tab: nguồn giới thiệu được bảo lưu trong `localStorage` theo cơ chế **Last-Click Attribution trong 30 ngày**.
- **Backend ghi nhận nguồn (`POST /api/v1/public/leads`):**
  - Xác thực chấp thuận Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
  - Kiểm tra trạng thái CTV còn hiệu lực (`ACTIVE`). Nếu CTV bị tạm ngưng (`SUSPENDED`), hệ thống chặn đăng ký kèm thông báo và tuyệt đối không chuyển nguồn sang CTV khác.
  - Tra cứu an toàn và lưu trữ khóa ngoại `course_id` (UUID thật từ bảng `courses`) và mã CTV ghi nhận (`affiliate_code_captured`).
  - **Chính sách bảo hộ nguồn tuyển sinh 90 ngày (Anti-Tampering):** Nếu số điện thoại của người học đã tồn tại trong vòng 90 ngày, hệ thống đánh dấu trùng lặp `is_duplicate = true` và **giữ nguyên vẹn `affiliate_id` của CTV ban đầu**, ngăn ngừa hoàn toàn việc nộp lại form để đổi nguồn giới thiệu.

### 6. Tổng kết kiểm thử kỹ thuật
- `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
- `compile_applet` (`npm run build`): **Build succeeded 100%**.
- Kiểm thử API:
  - `GET /api/v1/affiliate/courses`: Trả về 8 khóa học hợp lệ với referral_url trỏ về `APP_BASE_URL`.
  - `GET /api/v1/affiliate/courses/:courseId`: Trả về chi tiết kèm referral_url định danh CTV.
  - `POST /api/v1/public/leads`: Tiếp nhận lead thành công, sinh mã hẹn `appointment_code`, lưu chính xác vào Supabase DB với `affiliate_id`, `course_id`, và bảo lưu nguồn khi phát hiện trùng số điện thoại.

---

## 13. Yêu cầu C1.4: Trang Công Khai Chi Tiết Khóa Học & Đăng Ký Học Theo Yêu Cầu Mới

### 1. Nguyên nhân redirect `/catalog` và popup trước đây
- **Redirect `/catalog`:** Trong `App.tsx` trước đây, khi `urlCourse` có giá trị từ URL `/?ref=...&course=...`, hook `useEffect` đã gọi lệnh `navigate('/catalog' + search)` chuyển hướng trình duyệt sang `/catalog`.
- **Tự động mở modal popup toàn trang:** Trong `PublicHome.tsx`, hook `useEffect` tự động tìm kiếm `courseParam` và gọi `setSelectedCourseForDetail(matched)`, mở component `CourseDetailModal` với lớp phủ tối (`bg-slate-950/70`) và khung cuộn nội bộ nhỏ.

### 2. Thiết kế trang công khai & Cập nhật theo yêu cầu mới
- **Component độc lập:** `PublicCourseDetailPage.tsx` được xây dựng hoàn chỉnh, cuộn tự nhiên trên toàn trang (`window` scroll), chiều rộng chuẩn 1100–1200px (`max-w-6xl`).
- **Header xanh thương hiệu Saigontourist (#0B1E3F):** Đã bỏ tên trường và dòng mô tả hardcode; bỏ logo/hotline hardcode để chờ nguồn cấu hình từ Admin trong tương lai; chiều cao header gọn gàng.
- **Card thông tin khóa học (Dữ liệu thật):**
  - Card "Thời gian đào tạo": Lấy từ trường `duration_text` trong CSDL.
  - Card "Học phí": Lấy từ trường `tuition_fee_estimate` trong CSDL (định dạng tiền tệ VNĐ), không tự thêm chữ "dự kiến".
  - Loại bỏ hoàn toàn card suy diễn "Văn bằng" và "Hình thức: Xét tuyển học bạ".
  - Khối đầu trang: Hiển thị "Hệ đào tạo" (`degree_level`), "Nhóm nghề" (`career_group`) và "Mã khóa" (`code`) theo dữ liệu thật; loại bỏ "Khoa đào tạo".
  - Bố cục tự co giãn theo số lượng card có thật, không để ô trống.
- **Nút "ĐĂNG KÝ HỌC" & Popup Form:**
  - Nút chính đổi thành **"ĐĂNG KÝ HỌC"**, khi click mở popup form đăng ký cho khóa đang xem.
  - Tiêu đề popup: **“Đăng ký học — [Tên khóa học]”**.
  - Nút gửi: **“Gửi đăng ký học”**.
  - Khóa học được chọn sẵn và khóa cứng (`lockCourse={true}`), không cho đổi sang khóa khác.
  - Consent bắt buộc: Không đánh dấu đồng ý sẵn (`consentAccepted = false`).
  - Hỗ trợ đóng bằng phím Escape, nút `X`, nhấp nền mờ; chống click đúp mở nhiều popup; bảo toàn `ref` và `course` khi đóng/mở.
- **Thông tin người giới thiệu:**
  - Hiển thị dòng: “Bạn được giới thiệu bởi đối tác **[Họ và tên CTV]**” dưới nút đăng ký.
  - Họ tên CTV được tra cứu qua API backend bảo mật `GET /api/v1/public/affiliate-referrer?ref=...`, chỉ hiển thị khi CTV ở trạng thái `ACTIVE`.
  - Không lộ thông tin cá nhân PII (email, SĐT, CCCD, tài khoản ngân hàng).
- **Loại bỏ form dưới trang:** Xóa bỏ hoàn toàn section form ở đáy trang; form chỉ xuất hiện trong popup khi bấm nút "ĐĂNG KÝ HỌC".
- **Footer thu gọn:** Xóa bỏ toàn bộ thông tin đơn vị, địa chỉ, hotline, email hardcode; chỉ giữ lại dòng bản quyền `© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.`.

### 3. Quy tắc điều hướng trang chủ (`/`)
- Có `course` hợp lệ: Hiển thị trực tiếp `PublicCourseDetailPage`, giữ nguyên pathname `/` và các tham số `?ref=...&course=...`.
- Không có `course`: Giữ nguyên trang chủ tiếp thị CTV (`AffiliateLandingPage`).
- Có `ref` nhưng không có `course`: Lưu nguồn giới thiệu 30 ngày (Last-Click Attribution), hiển thị trang chủ tiếp thị.
- `course` không tồn tại hoặc chưa công khai: Hiển thị thông báo lỗi phù hợp ("Khóa học không tồn tại hoặc đã ngừng công khai"), không mở khóa khác hay dùng dữ liệu giả.
- Link cũ `/catalog?ref=...&course=...`: Tự động chuyển hướng chuẩn về `/?ref=...&course=...`, giữ nguyên tham số.

### 4. Kết quả kiểm thử thực tế
- `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
- `compile_applet`: **Build succeeded 100%**.
- Kiểm tra tra cứu 2 CTV hợp lệ (`STHCCTV1088` -> "Trần Thị Thu Thảo", `STHCCTV6993` -> "admin"): Hiển thị đúng câu xác nhận người giới thiệu.
- Kiểm tra CTV tạm ngưng (`STHCCTV3033`) và ref không hợp lệ: API từ chối, giao diện ẩn câu giới thiệu.
- Kiểm tra mở/đóng popup đăng ký, khóa học cố định, consent bắt buộc, gửi lead và bảo hộ nguồn CTV 90 ngày.
### 6. Triển khai C1.4 — Luồng xử lý sau khi khách bấm “Gửi đăng ký học” & Màn hình thành công
- **Gửi và lưu đăng ký:** Tái sử dụng API `submitLead` (`/api/v1/public/leads`) hiện có. Form kiểm tra bắt buộc Họ tên, SĐT, Email hợp lệ và consent theo NĐ 13/2023/NĐ-CP. Trong lúc gửi, nút bị khóa và hiển thị trạng thái "Đang gửi đăng ký...".
- **Bảo hộ nguồn CTV & Chống trùng:** Backend tra cứu mã `ref` (`checkAffiliateReferralEligibility`), ánh xạ chuẩn sang `affiliate_id`, kiểm tra chống trùng số điện thoại 90 ngày (giữ nguyên vẹn nguồn CTV ban đầu).
- **Response thành công từ CSDL:** Sau khi ghi nhận thành công vào bảng `public.leads`, backend trả về mã tiếp nhận (`appointment_code`), tên khóa học (`course_title`) và link hồ sơ chính thức (`official_registration_url`) được truy vấn trực tiếp từ bảng `courses` trong CSDL.
- **Màn hình thành công (`ThankYouScreen.tsx`):**
  - Tiêu đề: *“Đã tiếp nhận đăng ký học”*.
  - Nội dung xác nhận: *“Cảm ơn bạn đã đăng ký [Tên khóa học]. Nhà trường đã ghi nhận thông tin đăng ký của bạn.”*
  - Đoạn hướng dẫn hoàn tất hồ sơ: *“Để hoàn tất quá trình đăng ký học tại Trường Saigontourist, bạn vui lòng hoàn tất form hồ sơ đăng ký học theo quy định của trường trong link sau (nhớ nhập **"Mã CTV + Họ và tên CTV"** trong mục **"Họ và tên người giới thiệu"**):”*
  - Ô thông tin thực tế CTV: Hiển thị `[Mã CTV] - [Họ và tên CTV]` (ví dụ: `STHCCTV1088 - Đào Văn Phương`) kèm nút **“Sao chép”** thông minh (báo trạng thái "Đã chép" khi thành công).
  - Nếu khóa học có `official_registration_url` hợp lệ: Hiển thị nút nổi bật **“Hoàn tất hồ sơ đăng ký học”**.
  - Chú thích bắt buộc và nút đóng cửa sổ (tự động chuyển hướng về `/catalog?ref=[Mã CTV]` khi đóng popup).
- **Kiểm tra kỹ thuật:** `npm run lint` và `compile_applet` PASS 100% (Build succeeded).

### 8. Trang “Danh mục khóa học” công khai (C1.4)
- **Route và URL:** 
  - `/catalog?ref=[Mã CTV]` hiển thị danh mục khóa học kèm xác thực người giới thiệu.
  - Truy cập `/?ref=[Mã CTV]` không kèm `course` sẽ tự động `replaceState` sang `/catalog?ref=[Mã CTV]`.
  - Truy cập `/?ref=[Mã CTV]&course=[Mã khóa học]` tiếp tục mở trang chi tiết khóa học.
  - `/catalog` không có ref vẫn hiển thị danh mục chung bình thường.
- **Xác thực CTV & Nguồn dữ liệu:**
  - Backend xác thực mã `ref` qua `GET /api/v1/public/affiliate-referrer?ref=...` để lấy họ tên CTV thực tế.
  - Hiển thị thông báo: *“Các khóa học được giới thiệu bởi cộng tác viên [Họ và tên CTV].”*
  - Nếu mã không hợp lệ hoặc hết hạn: Hiển thị thông báo cảnh báo, không gán CTV khác.
  - Chỉ hiển thị các khóa học đang công khai (`is_active: true`).
- **Giao diện & Tiện ích:**
  - **Header & Footer dùng chung:** Sử dụng chung hoàn toàn component Header (nền xanh thương hiệu `#0B1E3F`, nút Trang chủ) và Footer (dòng bản quyền `© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.`) với trang chi tiết khóa học công khai (`PublicCourseDetailPage.tsx`), không có header/footer riêng.
  - **Tiêu đề trang:** Chỉ hiển thị thẻ `<h2>Danh mục khoá học</h2>`, không có slogan hay đoạn mô tả thừa.
  - Thanh công cụ tìm kiếm (hỗ trợ không dấu), bộ lọc theo Hệ đào tạo và Nhóm nghề, sắp xếp theo tên A–Z / Z–A và phân trang chuẩn.
  - Thẻ khóa học hiển thị 3 cột trên desktop, 2 cột trên tablet, 1 cột trên mobile; có badge Hệ đào tạo, Nhóm nghề từ CSDL, thông tin thời lượng và học phí, kèm nút "Chi tiết" giữ nguyên ref.
  - Đã loại bỏ hoàn toàn các khối thưởng/hoa hồng CTV, link giới thiệu riêng của CTV và QR code trên giao diện khách.
- **Kiểm tra kỹ thuật:** `npm run lint` và `compile_applet` PASS 100% (Build succeeded).

### 9. Khắc phục lỗi API upload logo và cấu hình trang chủ A6.1
- **Nguyên nhân:** Thiếu 2 endpoint backend trong `server.ts`:
  - `POST /api/v1/admin/homepage-assets/upload`
  - `PUT /api/v1/admin/homepage-config`
- **Giải pháp triển khai:**
  - Bổ sung `POST /api/v1/admin/homepage-assets/upload` (được bảo vệ bởi middleware `requireStaffOrAdmin`):
    - Nhận dữ liệu `imageBase64` và `fileName` từ frontend (`AdminHomepageConfigView.tsx`).
    - Kiểm tra định dạng (JPEG, PNG, WebP bằng magic bytes buffer) và dung lượng tối đa 5 MB.
    - Lưu file vào Supabase Storage (`course-thumbnails` bucket) với tên định danh unique và trả về `publicUrl`.
  - Bổ sung `PUT /api/v1/admin/homepage-config` (bảo vệ bởi `requireStaffOrAdmin`):
    - Nhận payload gồm `logo_url`, `logo_alt`, `hotline`, `footer_text`.
    - Upsert vào bảng CSDL `homepage_config` (id = 1).
  - Giữ nguyên luồng: Upload thành công hiển thị preview logo mới, nhưng chỉ khi bấm “Lưu cấu hình” thì thay đổi mới được áp dụng lên các trang công khai. Hủy hoặc lỗi lưu không làm mất logo cũ.
- **Kiểm tra thực tế:**
  - API endpoint hoạt động chính xác, không còn lỗi 404 route không tồn tại.
  - `npm run lint` và `compile_applet` đạt **PASS 100% (Build succeeded)**.
  - Server đã được khởi động lại (`restart_dev_server`) để nạp mã nguồn backend mới.

### 10. Hoàn thiện A6.1 – Sửa nội dung Header/Footer và Xem trước bản nháp
- **Tính năng chỉnh sửa & Quản lý phiên bản nháp:**
  - Tải cấu hình từ API (`GET /api/v1/public/homepage-config`) khi mở màn hình quản trị `/admin/homepage`.
  - Tách biệt rõ ràng trạng thái đang chỉnh sửa (bản nháp trong phiên) với cấu hình đang công khai.
  - Cảnh báo người dùng khi rời trang hoặc làm mới tab nếu có thay đổi chưa lưu (`beforeunload`).
  - Nút **“Hủy thay đổi”** hoàn tác form về cấu hình đã lưu.
  - Nút **“Lưu cấu hình”** gửi request `PUT /api/v1/admin/homepage-config`, cập nhật CSDL và đồng bộ cache cho toàn bộ trang công khai.
- **Tính năng Xem trước bản nháp:**
  - Nút **“Xem trước bản nháp”** mở modal chuyên dụng với nhãn **“Bản nháp – chưa lưu”**.
  - Cho phép tùy chọn bố cục xem trước: **Trang chính**, **Danh mục khóa học** (`/catalog`), và **Chi tiết khóa học**.
  - Cho phép tùy chọn chế độ hiển thị thiết bị: **Máy tính (Desktop)** và **Điện thoại (Mobile)** (khung điện thoại giả lập bo tròn).
  - Tái sử dụng component `PublicHeader` và `PublicFooter` dùng chung với truyền `draftConfig`, hiển thị trực tiếp logo mới chọn (hỗ trợ instant preview tệp cục bộ qua `URL.createObjectURL`), hotline và footer chưa lưu.
  - Vô hiệu hóa toàn bộ tương tác/điều hướng (`pointer-events-none` và `preventDefault`) trong khung xem trước để đảm bảo không phát sinh điều hướng hoặc tạo đăng ký nhầm.
- **Kiểm tra kỹ thuật:** `npm run lint` và `compile_applet` đạt **PASS 100% (Build succeeded)**.

### 11. Triển khai A6.2 – Thay logo, hình nền và hình minh họa trang chính
- **Màn hình quản trị (`AdminHomepageConfigView.tsx`)**:
  - Bổ sung nhóm **“B. Quản lý Hình ảnh Trang chính (Hero Section)”**:
    - **Hình nền trang chính** (`hero_background_url`, `hero_background_alt`): Hỗ trợ chọn/thay ảnh, gỡ ảnh, xem trước và nhập Alt text.
    - **Hình minh họa trang chính** (`hero_illustration_url`, `hero_illustration_alt`): Hỗ trợ chọn/thay ảnh, gỡ ảnh, xem trước và nhập Alt text.
  - Hỗ trợ instant preview cục bộ qua `URL.createObjectURL` trước khi lưu.
  - Giữ nguyên các nút xem trước bản nháp, lưu cấu hình và hủy thay đổi.
- **Backend & Storage (`server.ts`)**:
  - Mở rộng API `PUT /api/v1/admin/homepage-config` và `GET /api/v1/public/homepage-config` để lưu trữ và trả về tham chiếu `hero_background_url`, `hero_background_alt`, `hero_illustration_url`, `hero_illustration_alt`.
  - Tệp ảnh được lưu trữ an toàn trong Supabase Storage (`course-thumbnails` bucket) với giới hạn 5 MB, kiểm tra định dạng JPEG, PNG, WebP.
- **Đồng bộ trang công khai (`PublicHome.tsx`)**:
  - Tải cấu hình trang chủ từ API và hiển thị `hero_background_url` (làm lớp nền overlay hero) và `hero_illustration_url` (hiển thị trực tiếp ở cột phải hero section).
- **Kiểm tra kỹ thuật:** `npm run lint` và `compile_applet` đạt **PASS 100% (Build succeeded)**. Server đã được khởi động lại (`restart_dev_server`).

### 12. Triển khai A6.3 – Sắp xếp và Bật/Tắt các khối bố cục trang chủ
- **Màn hình quản trị (`AdminHomepageConfigView.tsx`)**:
  - Bổ sung nhóm **“A. Bố cục trang chủ (Sắp xếp & Bật/Tắt khối)”** quản lý 4 khối nội dung chính:
    1. `hero`: Khối Giới thiệu & Banner (Hero Section)
    2. `courses_search_filter`: Khối Tìm kiếm & Bộ lọc ngành
    3. `courses_grid`: Khối Danh sách Khóa học
    4. `consultation_form`: Khối Đăng ký Tư vấn Trực tuyến
  - Mỗi khối có tên tiếng Việt rõ ràng, mã định danh ổn định, công tắc **“Hiển thị”**, và nút **“Lên” / “Xuống”** điều chỉnh thứ tự (vô hiệu hóa tại biên đầu/cuối).
  - Khối bị tắt vẫn xuất hiện trong danh quản trị để dễ dàng bật lại và giữ nguyên vị trí.
- **Backend & CSDL (`server.ts`)**:
  - Cập nhật API `PUT /api/v1/admin/homepage-config` và `GET /api/v1/public/homepage-config` để lưu trữ và truyền tải trường `layout_blocks` (danh sách các khối kèm thứ tự `order` và trạng thái `enabled`).
- **Trang chủ công khai (`PublicHome.tsx`)**:
  - Đọc cấu hình `layout_blocks` từ API, tự động sắp xếp và chỉ hiển thị các khối đang bật (`enabled !== false`), hoàn toàn loại bỏ các khoảng trống hoặc khoảng cách thừa do khối bị tắt gây ra.
  - Header và Footer dùng chung luôn nằm cố định ở đầu và cuối trang.
- **Kiểm tra kỹ thuật:** `npm run lint` và `compile_applet` đạt **PASS 100% (Build succeeded)**. Server đã được khởi động lại (`restart_dev_server`).

### 14. Chuyển đổi trang chủ thành Landing Page Thu hút Đăng ký CTV (6 Khối Chuẩn Mới)
- **Danh sách 6 khối chính trên trang chủ công khai (`PublicHome.tsx`)**:
  1. `hero`: Khối Giới thiệu & Banner (tích hợp form đăng ký tài khoản CTV trực tiếp ở cột phải).
  2. `commission_policy`: Khối Chính sách hoa hồng CTV (mức thù lao 500.000 VNĐ / hồ sơ nhập học, điều kiện tài khoản chờ duyệt).
  3. `process`: Khối Quy trình trở thành CTV (3 bước đơn giản: Đăng ký & Chờ duyệt, Lấy Link & QR, Nhận Thưởng).
  4. `success_stories`: Khối Câu chuyện thành công (mặc định tắt nếu chưa có câu chuyện thực tế).
  5. `faq`: Khối Giải đáp thắc mắc (accordion mở/đóng mượt mà).
  6. `cta`: Khối Sẵn sàng trở thành CTV (banner kêu gọi hành động với nút cuộn đến form đăng ký).
- **Loại bỏ khỏi trang chủ**:
  - Đã gỡ bỏ hoàn toàn Khối Tìm kiếm & Bộ lọc ngành, Danh sách Khóa học, Đăng ký Tư vấn Trực tuyến, và thẻ "Mạng lưới tuyển sinh 5 ngành nghề" khỏi trang chủ công khai (vẫn giữ nguyên hoạt động tại `/catalog` và trang chi tiết khóa học).
- **Quản trị viên (`AdminHomepageConfigView.tsx` & `server.ts`)**:
  - Module quản lý trang chủ `/admin/homepage` được nâng cấp toàn diện để quản lý đầy đủ 6 khối, hỗ trợ sắp xếp thứ tự, bật/tắt hiển thị, chỉnh sửa nội dung chi tiết từng khối (tiêu đề, mô tả, bước quy trình, câu hỏi FAQ), cùng cơ chế migration tự động chuyển đổi cấu hình cũ sang cấu trúc 6 khối mới mà không làm mất lịch sử xuất bản.
- **Kiểm tra kỹ thuật**: `npm run lint` và `compile_applet` đạt **PASS 100% (Build succeeded)**. Server đã được khởi động lại (`restart_dev_server`).

---

### 15. Sửa lỗi phân quyền module /admin/homepage và Bổ sung Trình chỉnh sửa Video YouTube "Câu chuyện thành công"

1. **Khắc phục triệt để lỗi phân quyền (Permission Denied / 42501)**:
- **Phân định rõ nguyên nhân**: 
  - Phân biệt lỗi xác thực vai trò (`ROLE_FORBIDDEN` / `ADMIN_ONLY` HTTP 403) với lỗi phân quyền cấp cơ sở dữ liệu (`42501` insufficient_privilege).
  - Khắc phục cơ chế kiểm tra token: Khi Bearer token được gửi từ client, nếu token hết hạn hoặc không hợp lệ, backend trả về HTTP 401 `TOKEN_EXPIRED` kèm thông báo rõ ràng để client dọn sạch token cũ, không đánh đồng sang lỗi từ chối vai trò.
  - Đồng bộ tài khoản Supabase Auth thật cho `admin@sthc.edu.vn` (UID: `879a11fc-ff89-4019-b2f4-57d7843b631b`, role: `admin`, is_active: `true`) và `tuyensinh_canbo@sthc.edu.vn` (UID: `28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f`, role: `staff`, is_active: `true`).
  - Phân tách quyền đúng chuẩn:
    - **Cán bộ Tuyển sinh (Staff)**: Được phép tải cấu hình (`GET`), chỉnh sửa nội dung/ảnh và **Lưu bản nháp** (`PUT`). Tuyệt đối KHÔNG có quyền Xuất bản (`POST /publish`) hoặc Khôi phục (`POST /restore`).
    - **Quản trị viên (Admin)**: Toàn quyền gồm tải cấu hình, lưu bản nháp, xuất bản và khôi phục.
    - **Cộng tác viên (CTV) & Khách**: Tuyệt đối bị chặn ở cả backend middleware (`requireStaffOrAdmin`) và giao diện frontend với màn hình "Không có quyền truy cập".
- **Không bao giờ che giấu hoặc đổi lỗi 42501**: Các lỗi từ CSDL PostgreSQL (RLS / Trigger / Quyền bảng) trả về đầy đủ `Mã lỗi: 42501` cùng thông điệp kỹ thuật nguyên gốc, không gộp thành thông báo chung "Chỉ Admin/Staff".

2. **Trình chỉnh sửa Video YouTube cho khối “Câu chuyện thành công” (`success_stories`)**:
- Tích hợp trực tiếp vào khối `success_stories` có sẵn, không tạo khối mới.
- **Tiêu đề & Phụ đề**: Cho phép tùy biến tiêu đề khối và câu khẩu hiệu / slogan.
- **Danh sách Video YouTube**:
  - Hỗ trợ thêm nhiều video chia sẻ thực tế từ CTV hoặc video chính.
  - Nhập liên kết YouTube (hỗ trợ định dạng `watch?v=`, `youtu.be/`, `shorts/`, `embed/` hoặc Video ID 11 ký tự) với cơ chế tự động nhận diện và trích xuất `youtube_video_id`.
  - Hiển thị badge kiểm tra tính hợp lệ của định dạng liên kết.
  - Mỗi video có tiêu đề, vai trò/ngành nghề của nhân vật, thành tích nổi bật (badge màu xanh ngọc), và trích dẫn chia sẻ thực tế.
  - Hỗ trợ nút Di chuyển **Lên / Xuống**, công tắc **Hiển thị / Đã ẩn**, và nút **Xóa video**.
  - **Trình phát xem trước YouTube trực tiếp (16:9 responsive iframe)** ngay trong form quản trị khi nhập link.
- **Danh sách câu chuyện / lời chứng thực CTV (Testimonials)**:
  - Cho phép thêm/sửa/xóa các nhận xét dạng thẻ chữ kèm Họ tên CTV, Vai trò, Thành tích, URL ảnh đại diện (`avatar_url`), và nội dung trích dẫn.
- **Xem trước thực tế (Preview Modal)**:
  - Cập nhật modal "Xem trước bản nháp" hiển thị đầy đủ danh sách video 16:9 và lưới thẻ câu chuyện đồng bộ 100% với trang chủ công khai `PublicHome.tsx`.
- **Lưu bản nháp & Xuất bản**: Lưu trữ và đọc trực tiếp từ `draft_layout_blocks` và `layout_blocks` trong CSDL Supabase, đồng bộ trường `youtube_url`, `youtube_video_id`, `video_title` chính để tương thích ngược.

3. **Kiểm tra kỹ thuật**:
- `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
- `compile_applet` (`npm run build`): **Build succeeded 100%**.
- Kiểm thử luồng: Đăng nhập Admin, nạp cấu hình, lưu bản nháp, xem trước modal, xuất bản và khôi phục phiên bản hoạt động hoàn hảo.


### 16. Hoàn thiện Module “Khách hàng được giới thiệu” (A3.1 đến A3.5)
1. **Kiểm kê & Đặc tả (A3.1)**:
   - Xây dựng tài liệu đặc tả chi tiết tại `/docs/A3_1_REFERRED_CUSTOMERS_AUDIT.md`, chuẩn hóa quy tắc phân quyền Backend, nguồn ghi nhận qua link/QR và ranh giới trạng thái.
2. **Ghi nhận từ Link / QR & Luồng Đăng ký (A3.2)**:
   - Hoàn thiện luồng khách truy cập qua `?ref=...`, bảo toàn mã giới thiệu qua điều hướng và tải lại trang, form đăng ký gửi tới `/api/v1/public/leads` ghi nhận thành công mã CTV và khóa học.
3. **API Đọc Dữ Liệu & Phân Quyền (A3.3)**:
   - Hoàn thiện `GET /api/v1/admin/leads`, `GET /api/v1/admin/leads/:id`, `GET /api/v1/affiliate/leads`, `GET /api/v1/affiliate/leads/:id` với cơ chế bảo mật xác thực session, bảo mật che 4 số cuối điện thoại cho CTV và phân quyền tuyệt đối tại Backend.
4. **Danh sách, Tìm kiếm, Bộ lọc & Phân trang (A3.4)**:
   - Xây dựng thanh công cụ đa tiêu chí cho cả CTV (`/portal/leads`) và Admin/Staff (`/admin/leads`), hỗ trợ tìm kiếm mờ, lọc theo khóa học, trạng thái tư vấn, đối soát, nguồn CTV, khoảng ngày và phân trang phía máy chủ.
5. **Chi tiết khách & Lịch sử (A3.5)**:
   - Xây dựng trang chi tiết (`/portal/leads/:id` và `/admin/leads/:id`) cùng hệ thống lịch sử sự kiện thời gian thực (`/api/v1/affiliate/leads/:id/history` và `/api/v1/admin/leads/:id/history`), chuẩn hóa hiển thị mã EGOV (giữ số 0 đầu) và tình trạng nhập học (Đã nhập học / Chưa nhập học).
6. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.

### 17. Triển khai A3.6: Cập nhật trạng thái chăm sóc, ghi chú nội bộ và lịch sử thao tác
1. **Phân định ranh giới nghiệp vụ**:
   - Module Chăm sóc A3.6 chỉ được sửa đổi `counseling_status` và thêm ghi chú nội bộ. Tuyệt đối không can thiệp vào các trường đối chiếu (`reconciliation_status`, `external_admission_code`, `tuition_fee_collected`, `receipt_number`, `tuition_paid_at`, `reward_status`, `affiliate_id`).
   - Bất kỳ request nào gửi trường cấm đều bị từ chối ngay với `400 Bad Request`.
2. **Thao tác nguyên tử & Kiểm soát xung đột**:
   - Viết migration `20261003000002_add_lead_care_history_and_atomic_update.sql` cung cấp RPC `fn_update_lead_care_and_audit` hỗ trợ khóa bi quan (`FOR UPDATE`), kiểm soát xung đột đồng thời (`client_updated_at` / `409 Conflict`), cập nhật lead và ghi `audit_logs` trong cùng một giao dịch.
   - Endpoint: `PATCH /api/v1/admin/leads/:id/care` và alias `PATCH /api/v1/admin/leads/:id/counseling-status`.
3. **Phân quyền & Bảo mật lịch sử**:
   - Admin/Staff xem toàn bộ lịch sử chăm sóc từ `audit_logs`, đối soát và thưởng.
   - CTV chỉ xem các sự kiện công khai (đổi trạng thái tư vấn, nhập học, thưởng); tuyệt đối không lộ ghi chú nội bộ hay danh tính cán bộ thực hiện.
4. **Giao diện người dùng**:
   - Component `AdminLeadDetailView.tsx` bổ sung khối Chăm sóc khách hàng với dropdown trạng thái, ô nhập ghi chú (tối đa 2000 ký tự), nút lưu có hiệu ứng loading/chống bấm đúp, và dòng thời gian lịch sử chăm sóc chi tiết.
5. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.

### 18. Nghiệm thu & Kiểm thử toàn luồng A3.7 (Module “Khách hàng được giới thiệu”)
1. **Kiểm thử E2E & Bảo mật toàn diện**:
   - Hoàn thành ma trận 16 ca kiểm thử toàn luồng (A3.1 – A3.6): ghi nhận link/QR, chống trùng 90 ngày theo khóa học, phân quyền CTV/Admin/Staff, che SĐT, chống lộ ghi chú nội bộ, thao tác chăm sóc nguyên tử qua RPC và xử lý xung đột đồng thời.
2. **Nâng cấp bảo mật RPC & Idempotency**:
   - Viết migration `20261003000003_fix_lead_care_rpc_security_and_idempotency.sql` bổ sung cột `idempotency_key` trong `audit_logs`, cố định `SET search_path = public, pg_temp;`, ràng buộc `auth.uid()` ngăn chặn CTV giả UUID Admin, thu hồi quyền từ `PUBLIC` và `anon`.
3. **Chuẩn hóa nguồn dữ liệu đối chiếu**:
   - Sử dụng hàm chuẩn hóa `getActiveReconciliation()` đảm bảo chỉ lấy bản ghi `MATCHED_VALID` đang có hiệu lực.
   - Bất kỳ trạng thái nào bị hủy (`VOIDED`) hoặc không hợp lệ đều hiển thị đồng bộ là "Chưa nhập học" trên cả danh sách, chi tiết, bộ lọc và lịch sử.
4. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.


### 19. Khắc phục và Hoàn thiện Kiểm thử Toàn luồng A3.7.1
1. **Dọn dẹp triệt để Overload cũ & Chuẩn hóa chữ ký RPC**:
   - Viết migration `20261004000001_fix_a3_care_rpc_overloads_and_strict_idempotency.sql`.
   - `DROP FUNCTION` không `CASCADE` đối với chữ ký 5 tham số cũ từ A3.6.
   - Thống nhất chữ ký RPC duy nhất 6 tham số: `public.fn_update_lead_care_and_audit(UUID, UUID, VARCHAR, TEXT, TIMESTAMPTZ, VARCHAR)`.
   - Thu hồi toàn bộ quyền thực thi từ `PUBLIC` và `anon`; cấp quyền `authenticated` và `service_role`.
2. **Ràng buộc duy nhất & Kiểm soát Idempotency đa luồng**:
   - Tạo unique index: `uq_audit_logs_lead_care_idempotency` trên `(actor_id, entity_id, idempotency_key)` cho `entity_name = 'leads'`.
   - Kiểm tra idempotency sau khi đã chiếm khóa bi quan dòng lead (`FOR UPDATE`), ngăn chặn triệt để race condition khi 2 request cùng key gửi đồng thời.
   - Trả về đúng kết quả ban đầu (`is_idempotent_replay: true`) nếu cùng nội dung; từ chối `22023 / 400 Bad Request` nếu mismatch nội dung.
3. **Bắt buộc Kiểm soát xung đột phiên bản chính xác (Exact Version / Concurrency)**:
   - Yêu cầu `client_updated_at` trong các thao tác cập nhật chăm sóc hoặc thêm ghi chú. So sánh chính xác từng microsecond với `leads.updated_at`.
   - Loại bỏ hoàn toàn dung sai giây, đảm bảo nếu 2 cán bộ thao tác trên cùng một phiên bản thì request đến sau chắc chắn nhận `409 Conflict`.
4. **Bảo mật và Phân quyền**:
   - Chặn đứng mọi nỗ lực giả mạo `p_actor_id` của tài khoản khác bằng cách kiểm tra bắt buộc `p_actor_id = auth.uid()` trên kênh direct client call.
   - Lọc bỏ 100% trường nội bộ (`counselor_note`, `added_note`, `actor`) trên API lịch sử dành cho CTV (`GET /api/v1/affiliate/leads/:id/history`).
5. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.


### 20. Hoàn thiện Màn hình Danh sách “Khách hàng được giới thiệu” (A3.7.2)
1. **Tìm kiếm đa tiêu chí gồm Mã CTV**:
   - Backend `GET /api/v1/admin/leads` hỗ trợ tìm kiếm theo Mã CTV hiện tại (`affiliate_profiles.affiliate_code`) và Mã CTV ghi nhận lúc đăng ký (`leads.affiliate_code_captured`), kết hợp họ tên, SĐT, email khách hàng.
   - Tìm kiếm không phân biệt hoa/thường (`ILIKE`), không tạo mảng ID lớn về client, phân trang và tổng số áp dụng đồng bộ 100%.
   - Cập nhật placeholder tìm kiếm trực quan.
2. **Bộ lọc nguồn CTV Autocomplete / Combobox (Server-side Debounce, Max 20 results)**:
   - Thay thế dropdown toàn bộ danh mục bằng Combobox Autocomplete tra cứu trên máy chủ qua endpoint `GET /api/v1/admin/affiliates/lookup`.
   - Debounce ~400ms khi nhập từ 2 ký tự, trả tối đa 20 kết quả dạng `Mã CTV — Họ tên`.
   - Có cơ chế `sequence ref` chống race condition khi phản hồi mạng chậm.
   - Hỗ trợ khôi phục nhãn khi tải lại trang qua query `?id=...` mà không cần nạp toàn bộ danh mục CTV.
   - Không loại bỏ CTV bị khóa (`SUSPENDED`) để vẫn lọc được khách lịch sử của họ.
3. **Loại bỏ cột “Khung giờ tiện”**:
   - Xóa bỏ hoàn toàn cột "Khung giờ tiện" khỏi bảng danh sách Admin/Staff.
4. **Chuẩn hóa “Tiến độ tư vấn” sang Badge chỉ đọc**:
   - Bảng danh sách chỉ hiển thị Badge trạng thái tĩnh (`NEW`: Mới đăng ký, `CONTACTED`: Đã liên hệ, `CONSULTING`: Đang tư vấn, `UNREACHABLE`: Chưa liên hệ được, `LOST`: Không tiếp tục).
   - Xóa bỏ handler cập nhật trực tiếp tại dòng bảng để tránh thao tác vô tình; mọi cập nhật chăm sóc thực hiện an toàn trong trang chi tiết `/admin/leads/:id`.
5. **Thêm cột “Mã hồ sơ (EGOV)”**:
   - Hiển thị mã EGOV từ kết quả đối chiếu có hiệu lực, giữ số 0 ở đầu (chuỗi string).
   - Khách chưa có mã hiển thị ô rỗng `—` (không hiển thị text "Chưa cập nhật" hay dữ liệu mẫu).
6. **Bắt buộc Concurrency Timestamp tại Database (Migration 20261004000002)**:
   - Trong RPC `fn_update_lead_care_and_audit`, khi có thao tác ghi thực sự, bắt buộc `p_expected_updated_at IS NOT NULL`. Nếu thiếu sẽ bị PostgreSQL từ chối với lỗi `22023`.
   - Thêm B-Tree index trên `affiliate_profiles(affiliate_code)` và `leads(affiliate_code_captured)`.
7. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.


### 21. Chuẩn hóa trường “Tỉnh / Thành phố” trong màn hình Chi tiết Lead (Admin/Staff & CTV)
1. **Kiểm tra nguồn giá trị & Nguyên nhân**:
   - Trong CSDL: Cột `leads.province` được định nghĩa là `VARCHAR(100)` không có default constraint và không có trigger can thiệp (mặc định đúng là `NULL`).
   - Nguyên nhân phát sinh: Tại backend `server.ts` endpoint `POST /api/v1/public/leads` trước đây chứa fallback `province: province || 'TP. Hồ Chí Minh'`. Khi form không gửi province, backend tự gán `'TP. Hồ Chí Minh'`.
2. **Khắc phục luồng lưu dữ liệu**:
   - Backend `server.ts`: Đã chuẩn hóa `const cleanProvince = (typeof province === 'string' && province.trim()) ? province.trim() : null;` và lưu `province: cleanProvince`. Khi đăng ký mới không có tỉnh, CSDL lưu chuẩn `NULL`.
   - Dọn dẹp state `province` không dùng trong component `LeadConsultationForm.tsx`.
   - Không khôi phục trường Tỉnh/Thành phố vào form đăng ký công khai; giữ nguyên cột `province` trong CSDL và dữ liệu thực tế hiện có.
3. **Quy tắc hiển thị thống nhất trên giao diện**:
   - Áp dụng cho cả `AdminLeadDetailView.tsx` và `AffiliateLeadDetailView.tsx`:
     - Nếu `province` là `null`, `undefined`, chuỗi rỗng `""` hoặc chỉ có khoảng trắng: Hiển thị `"Chưa cập nhật"` (màu chữ xám nghiêng `text-slate-400 italic`).
     - Nếu có dữ liệu thật: Hiển thị đúng giá trị đó (`lead.province.trim()`).
     - Tuyệt đối không dùng `"TP. Hồ Chí Minh"` hay tỉnh nào khác làm fallback hiển thị.
4. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.


### 22. Quản trị viên Cấp / Thu hồi vai trò "Cán bộ Tuyển sinh" (Staff)
1. **Mô hình tài khoản & Phân quyền hệ thống**:
   - Nguồn vai trò chuẩn: Duy nhất cột `public.profiles.role` (`'affiliate'`, `'staff'`, `'admin'`). Không tạo bảng role thứ hai hoặc hệ thống phân quyền song song.
   - Tách biệt hoàn toàn vai trò hệ thống (`profiles.role`) và trạng thái tiếp thị của CTV (`affiliate_profiles.status`).
   - Khi cấp Staff: Nâng cấp `profiles.role = 'staff'`, bảo toàn 100% hồ sơ CTV, mã tiếp thị, khách hàng đã giới thiệu và lịch sử đối soát. Không tự động chuyển `status` sang `ACTIVE` nếu chưa duyệt.
   - Khi thu hồi Staff: Chuyển `profiles.role = 'affiliate'`, quyền tiếp thị của CTV tiếp tục phụ thuộc vào trạng thái `status` hiện có (`ACTIVE`, `PENDING_REVIEW`, `SUSPENDED`, `REJECTED`).
2. **Giao diện Màn hình Chi tiết (/admin/affiliates/:id)**:
   - Thêm khối **"Vai trò tài khoản & Phân quyền hệ thống"** và cập nhật nhãn vai trò tiếng Việt tại thẻ tóm tắt.
   - Phân quyền giao diện: Chỉ Quản trị viên (`role = 'admin'`) mới thấy các nút thao tác cấp / thu hồi Staff. Cán bộ Tuyển sinh (Staff) chỉ xem ở chế độ chỉ đọc.
   - Tài khoản CTV: Nút **"Cấp quyền cán bộ tuyển sinh"**.
   - Tài khoản Staff: Nút **"Thu hồi quyền cán bộ tuyển sinh"**.
   - Modal xác nhận: Hiển thị đầy đủ Họ tên, Email, Mã CTV, Vai trò trước → Vai trò sau, giải thích quyền hạn, và bắt buộc nhập lý do thao tác.
   - Ràng buộc an toàn: Không cho phép đổi vai trò tài khoản Admin hoặc tự thay đổi vai trò của chính Admin đang đăng nhập; chặn cấp quyền nếu email chưa xác thực hoặc tài khoản bị vô hiệu hóa.
3. **API & Database Migration (Migration 20261004000003)**:
   - Viết migration `/supabase/migrations/20261004000003_admin_assign_revoke_staff_role.sql` định nghĩa hàm RPC nguyên tử `fn_update_user_system_role()`.
   - Endpoint: `PATCH /api/v1/admin/affiliates/:id/system-role` (bảo vệ bởi `requireAdminOnly`).
   - Tự động phân giải `user_id` từ `affiliate_profiles.id`, thực hiện cập nhật `profiles.role` và ghi nhật ký `audit_logs` (`SYSTEM_ROLE_ASSIGNED` / `SYSTEM_ROLE_REVOKED`) trong cùng một transaction duy nhất.
   - Hiệu lực tức thì: Các middleware backend kiểm tra trực tiếp `profiles.role` từ CSDL theo từng request, do đó quyền Staff bị thu hồi ngay lập tức trên các API nội bộ mà không cần chờ hết hạn token.
4. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet` (`npm run build`): **Build succeeded 100%**.

---

### 23. Kiểm kê hiện trạng Module “Đối chiếu hồ sơ & học phí” (A4.1)
1. **Phạm vi & Mục tiêu**:
   - Thực hiện kiểm kê toàn diện mã nguồn frontend, backend API, cấu trúc CSDL Supabase, phân quyền và dữ liệu thực tế cho module "Đối chiếu hồ sơ & học phí".
   - Tuân thủ nghiêm ngặt nguyên tắc chỉ đọc (Read-Only), không sửa đổi tính năng hoặc dữ liệu thực tế trên hệ thống.
   - Báo cáo kiểm kê chi tiết bàn giao tại: `/docs/A4_1_ENROLLMENT_TUITION_RECONCILIATION_AUDIT.md`.
2. **Kết quả kiểm kê hiện trạng**:
   - **CSDL & RPC**: Đã có bảng `lead_reconciliations`, `rewards`, các Partial Unique Indexes (`uq_valid_external_admission_code`, `uq_valid_recon_per_lead`, `uq_active_reward_per_lead`) và 2 hàm RPC nguyên tử `fn_reconcile_lead_and_create_reward`, `fn_void_reconciliation_and_reward` từ migration `001` và `004`.
   - **API Backend**: Đã có các endpoint `POST /api/v1/admin/leads/:id/reconcile`, `POST /api/v1/admin/leads/:id/void-reconciliation`, `GET /api/v1/admin/leads/:id/history`, `GET /api/v1/affiliate/leads/:id/history`, `GET /api/v1/admin/rewards`.
   - **Giao diện**: Route `/admin/reconcile` và modal đối soát đã được dựng cơ bản trong `AdminPortal.tsx`. Module A3 và Cổng CTV đã hiển thị đồng bộ mã EGOV và tình trạng "Đã nhập học" / "Chưa nhập học".
3. **Các thiếu sót và lỗi sai trọng yếu cần khắc phục tại A4.2 - A4.5**:
   - *Lỗi Backend:* Hardcode `staff_id = demoState.adminUser.id` và `voided_by = demoState.adminUser.id` trong API đối soát/hủy đối soát thay vì lấy ID từ token đăng nhập thật; hardcode `affiliate_id = demoState.activeAffiliate.id` trong fallback tạo thưởng.
   - *Lỗi Frontend:* Modal đối soát tự random sinh mã EGOV/phiếu thu và gán mặc định học phí 14.500.000 VNĐ; tab `/admin/reconcile` chưa có thanh tìm kiếm, bộ lọc trạng thái và phân trang độc lập; trang chi tiết `/admin/leads/:id` chưa tích hợp khối thao tác đối soát.
   - *Thiếu sót nghiệp vụ:* Chưa có văn bản quy định điều kiện chi tiết để công nhận "Đã nhập học" (tỷ lệ học phí, chứng từ).
4. **Kết quả thống kê dữ liệu thực tế (Chỉ đọc)**:
   - Tổng cộng 8 lead trong CSDL: 0 lead có mã EGOV, 0 lead có thông tin học phí, 0 bản ghi `lead_reconciliations`, 0 bản ghi `rewards`. 100% lead đang ở trạng thái `NOT_RECONCILED` / `NONE`.
5. **Kết luận nghiệm thu A4.1**: **PASS** (Hoàn tất kiểm kê hiện trạng, dừng turn để chờ duyệt bước A4.2).

---

### 24. Chốt nghiệp vụ và ma trận trạng thái Đối chiếu hồ sơ (A4.2)
1. **Phạm vi & Mục tiêu**:
   - Thể chế hóa 4 quyết định nghiệp vụ cốt lõi của Nhà trường về module Đối chiếu hồ sơ & học phí.
   - Xây dựng ma trận trạng thái vòng đời đối soát, phân định rõ ràng giữa Tình trạng nhập học thực tế và Tính hợp lệ của hồ sơ giới thiệu CTV.
   - Lập kế hoạch thay đổi kỹ thuật chi tiết từ A4.3 đến A4.8, giữ nguyên nguyên tắc không sửa đổi mã nguồn chức năng hay dữ liệu ở bước này.
   - Tài liệu đặc tả bàn giao: `/docs/A4_2_ENROLLMENT_RECONCILIATION_BUSINESS_RULES.md`.
2. **Nội dung 4 Quyết định Nghiệp vụ đã chốt**:
   - **Quyết định 1 (Căn cứ xác nhận nhập học):** Dấu tick "Đã nhập học" trên phần mềm EGOV là căn cứ duy nhất. Không tự suy diễn từ số tiền thu, tỷ lệ học phí, biên lai hay sự tồn tại của mã EGOV. Cán bộ đối chiếu thủ công chéo Họ tên, SĐT, Khóa học để chống ghép nhầm; loại bỏ toàn bộ dữ liệu mẫu hardcode.
   - **Quyết định 2 (Quy chuẩn Mã EGOV):** Mã EGOV gồm đúng 7 chữ số viết liền (`^[0-9]{7}$`), lưu dạng chuỗi để bảo toàn số 0 ở đầu. Mã là duy nhất đối với các đối soát hợp lệ đang hoạt động (`MATCHED_VALID`) qua Partial Unique Index; khi hủy đối soát (`VOIDED`), mã được giải phóng để cho phép đối soát lại.
   - **Quyết định 3 (Khách đăng ký trước qua kênh khác):** Ghi nhận `EXISTING_IN_SCHOOL_SYSTEM`, không sinh thưởng cho CTV. Tách bạch rõ 2 trục: *Tình trạng nhập học thực tế của khách* (vẫn là "Đã nhập học" nếu EGOV đã tick) và *Tính hợp lệ giới thiệu* (hiển thị cho CTV: *"Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)"*).
   - **Quyết định 4 (Quyền Hủy đối soát):** Cả Admin và Staff đều có quyền tự hủy đối soát có lý do (không cần Admin duyệt trước), áp dụng cả khi khoản thưởng liên kết đang `APPROVED`. Khoản thưởng liên quan lập tức chuyển `VOIDED` trong cùng transaction CSDL; bảo toàn 100% lịch sử kiểm toán trong `lead_reconciliations`, `rewards` và `audit_logs`.
3. **Phân bổ lộ trình kỹ thuật tiếp theo**:
   - **A4.3:** CSDL, Constraint Regex 7 số, RPC nguyên tử `fn_reconcile...` và `fn_void...`, kiểm soát xung đột phiên bản `p_expected_updated_at` và `idempotency_key`.
   - **A4.4:** Backend API, trích xuất `actorId` thật từ JWT session, xử lý lead tự nhiên không sinh thưởng.
   - **A4.5:** Giao diện danh sách chuyên biệt `/admin/reconcile` với toolbar tìm kiếm mã EGOV, lọc trạng thái, phân trang.
   - **A4.6:** Giao diện chi tiết, xóa bỏ mock data, form đối soát tích hợp trong `/admin/leads/:id`.
   - **A4.7:** Đồng bộ hiển thị tách biệt Tình trạng nhập học và Trạng thái CTV tại Module A3 và Cổng CTV.
   - **A4.8:** Kiểm thử E2E toàn luồng & Bàn giao nghiệm thu module A4.
4. **Kết luận nghiệm thu A4.2**: **PASS** (Hoàn tất đặc tả nghiệp vụ, dừng turn để chờ duyệt bước A4.3).

---

### 25. Chuẩn hóa Dữ liệu, Constraint và RPC Đối chiếu hồ sơ & Học phí (A4.3)
1. **Phạm vi & Mục tiêu**:
   - Thể chế hóa đầy đủ các ràng buộc cơ sở dữ liệu, Partial Unique Index, quy chuẩn Regex mã EGOV 7 chữ số (`^[0-9]{7}$`).
   - Xây dựng file Migration mới: `/supabase/migrations/20261004000004_standardize_reconciliation_schema_and_rpc.sql`.
   - Chuẩn hóa các hàm RPC PostgreSQL nguyên tử: `fn_reconcile_lead_and_create_reward`, `fn_void_reconciliation_and_reward`, `fn_get_lead_reconciliation_history`.
   - Phân biệt rõ hai trục độc lập: *Tình trạng nhập học* (`admission_status`) và *Tính hợp lệ giới thiệu CTV* (`reconciliation_status`).
   - Lưu giữ mức học phí khóa học tại thời điểm đối soát (`course_tuition_fee`) phục vụ thống kê doanh thu CTV sau này.
   - Chuyển `tuition_fee_collected` và `tuition_paid_at` sang NULLABLE (vì học phí/biên lai không phải điều kiện bắt buộc để xác nhận nhập học nếu EGOV đã tick "Đã nhập học").
   - Bổ sung ràng buộc kiểm tra số tiền không âm (`CHECK >= 0`), phân biệt rõ `NULL` (chưa có thông tin) với `0` (miễn phí).
   - Thiết lập bộ test suite tự động: `scripts/verify_a4_reconciliation_db.ts` (`npm run test:reconciliation-db`).
   - Báo cáo chi tiết: `/docs/A4_3_ENROLLMENT_RECONCILIATION_DB_SCHEMA_RPC_REPORT.md`.
2. **Kết quả kiểm thử tự động (10/10 ca PASS 100%)**:
   - `TC-A4.3-01`: Quy chuẩn Regex mã EGOV 7 số (`^[0-9]{7}$`) -> **PASS**.
   - `TC-A4.3-02`: Khởi tạo Lead test: `reconciliation_status = NOT_RECONCILED`, `admission_status = NOT_ENROLLED`, `reward_status = NONE` -> **PASS**.
   - `TC-A4.3-03`: Xác nhận nhập học `MATCHED_VALID`: `admission_status = ENROLLED`, `reconciliation_status = MATCHED_VALID`, sinh thưởng 500.000 VNĐ `PENDING_APPROVAL` -> **PASS**.
   - `TC-A4.3-04`: Chống trùng mã EGOV đang `MATCHED_VALID` qua Partial Unique Index (Error 23505) -> **PASS**.
   - `TC-A4.3-05`: Hủy ghép đối soát: Chuyển `VOIDED` nguyên tử cả đối soát và thưởng, đưa Lead về `NOT_RECONCILED` và `NOT_ENROLLED` -> **PASS**.
   - `TC-A4.3-06`: Giải phóng mã EGOV sau khi `VOIDED` và cho phép đối soát lại thành công -> **PASS**.
   - `TC-A4.3-07`: `EXISTING_IN_SCHOOL_SYSTEM`: Tình trạng nhập học = `ENROLLED`, `reconciliation_status = EXISTING_IN_SCHOOL_SYSTEM`, `reward_status = NONE`, không sinh thưởng -> **PASS**.
   - `TC-A4.3-08`: `MISMATCH_INVALID`: `admission_status = NOT_ENROLLED`, `reconciliation_status = MISMATCH_INVALID`, `reward_status = NONE` -> **PASS**.
   - `TC-A4.3-09`: Lưu giữ mức học phí khóa học độc lập (`tuition_fee_estimate = 14.500.000 VNĐ`) phục vụ thống kê doanh thu -> **PASS**.
   - `TC-A4.3-10`: Ghi nhận nhật ký kiểm toán (`audit_logs`) đầy đủ với `actor_id` và lý do hủy -> **PASS**.
3. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `npm run test:reconciliation-db`: **PASS (10/10 test cases đạt)**.
   - Không xóa, không reset dữ liệu thực tế và không để lại dữ liệu rác thử nghiệm.
4. **Kết luận nghiệm thu A4.3**: **PASS** (Hoàn tất CSDL, Constraint & RPC, sẵn sàng chuyển sang bước A4.4).

---

### 26. API và Phân quyền Đối chiếu Hồ sơ & Học phí (A4.4)
1. **Phạm vi & Mục tiêu**:
   - Hoàn thiện Backend API trong `server.ts` cho các luồng: Đối soát thủ công (`POST /api/v1/admin/leads/:id/reconcile`), Hủy ghép đối soát có lý do (`POST /api/v1/admin/leads/:id/void-reconciliation`), Xem chi tiết lead và lịch sử đối soát (`GET /api/v1/admin/leads/:id`, `GET /api/v1/admin/leads/:id/history`).
   - Phân quyền bảo mật: Xác thực danh tính thực từ Bearer token JWT (`profiles.role`), chặn CTV và người dùng chưa xác thực thao tác đối soát/hủy ghép (401/403).
   - Bảo mật thông tin khách hàng cho CTV: Che 4 số cuối điện thoại (`090812****`), ẩn toàn bộ ghi chú nội bộ của cán bộ tuyển sinh, chỉ cho phép CTV truy cập khách do chính mình giới thiệu (`affiliate_id`).
   - Chống gửi lặp thực thụ (Idempotency Key): Yêu cầu header `Idempotency-Key`, trả về kết quả đã cache nếu gửi lại cùng payload (`is_idempotent_replay: true`), báo lỗi xung đột 409 nếu gửi cùng key nhưng khác payload.
   - Kiểm soát xung đột đồng thời: Bắt buộc `client_updated_at` để bảo đảm không ghi đè dữ liệu sửa đổi đồng thời.
   - Tạo file Migration bổ sung: `/supabase/migrations/20261004000005_harden_reconciliation_rpc_and_idempotency.sql`.
   - Thiết lập bộ test suite tự động: `scripts/verify_a4_4_reconciliation_api.ts` (`npm run test:reconciliation-api`).
   - Báo cáo chi tiết: `/docs/A4_4_ENROLLMENT_RECONCILIATION_API_AUTHORIZATION_REPORT.md`.
2. **Kết quả kiểm thử tự động (10/10 ca PASS 100%)**:
   - `TC-A4.4-01`: Validate Định dạng Mã EGOV 7 chữ số & Ràng buộc MATCHED_VALID -> **PASS**.
   - `TC-A4.4-02`: Chặn truyền trạng thái WITHDRAWN qua API đối soát -> **PASS**.
   - `TC-A4.4-03`: Đối soát hợp lệ MATCHED_VALID & Khởi tạo Thưởng CTV 500k PENDING_APPROVAL -> **PASS**.
   - `TC-A4.4-04`: Chống ghép trùng Mã EGOV (Duplicate EGOV Code Check) -> **PASS**.
   - `TC-A4.4-05`: Đối soát EXISTING_IN_SCHOOL_SYSTEM (Bắt buộc lý do, không sinh thưởng) -> **PASS**.
   - `TC-A4.4-06`: Đối soát MISMATCH_INVALID (Thông tin không khớp, bắt buộc lý do) -> **PASS**.
   - `TC-A4.4-07`: Kiểm thử Idempotency: Replay thành công & Phát hiện xung đột Payload -> **PASS**.
   - `TC-A4.4-08`: Hủy ghép đối soát có lý do: Chuyển VOIDED và Giải phóng Mã EGOV -> **PASS**.
   - `TC-A4.4-09`: Bảo mật Phân quyền CTV: Che SĐT, Ẩn Ghi chú Nội bộ Cán bộ & Phạm vi Dữ liệu -> **PASS**.
   - `TC-A4.4-10`: Bảo toàn Snapshot Học phí Khóa học (Snapshot Tuition Fee Preservation) -> **PASS**.
3. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `npm run test:reconciliation-api`: **PASS (10/10 test cases đạt)**.
   - `npm run test:reconciliation-db`: **PASS (10/10 test cases đạt)**.
   - Dữ liệu thực tế được bảo toàn nguyên vẹn 100%.
4. **Kết luận nghiệm thu A4.4**: **PASS** (Hoàn tất API & Phân quyền, sẵn sàng chuyển sang A4.5).

---

### 27. Danh sách Đối chiếu Hồ sơ & Học phí (A4.5)
1. **Phạm vi & Mục tiêu**:
   - Hoàn thiện trang danh sách đối chiếu hồ sơ tại tab `/admin/reconcile` dành cho Quản trị viên và Cán bộ tuyển sinh (Staff).
   - Tách bạch 2 trục trạng thái: *Tình trạng nhập học* (`admission_status`: Đã nhập học / Chưa nhập học) và *Kết quả đối chiếu* (`reconciliation_status`: Chưa đối chiếu / Hồ sơ hợp lệ / Đăng ký trước kênh khác / Thông tin không khớp / Đã hủy đối chiếu).
   - Tích hợp tìm kiếm đa năng (Họ tên, SĐT, Mã CTV, Mã EGOV), bộ lọc đa chiều (Khóa học, Tình trạng nhập học, Kết quả đối chiếu, Nguồn giới thiệu, Combobox CTV autocomplete server-side, Khoảng ngày đăng ký).
   - Phân trang server-side hoàn toàn, chống lặp bản ghi, bảo toàn thông tin khóa học đối chiếu khác khóa quan tâm, hiển thị snapshot học phí chính xác (định dạng VNĐ, nhãn Ước tính nếu có).
   - Đồng bộ bộ lọc và trang hiện tại vào URL Query Parameters.
2. **Cấu trúc & Thành phần triển khai**:
   - Component chuyên biệt: `/src/components/admin/AdminReconciliationListView.tsx`.
   - Tích hợp tại: `/src/components/admin/AdminPortal.tsx` (thay thế bảng mockup cũ).
   - Backend API: `GET /api/v1/admin/leads` hỗ trợ query parameters và phân trang.
   - Tài liệu báo cáo hoàn thành: `/docs/A4_5_ENROLLMENT_RECONCILIATION_LIST_UI_REPORT.md`.
3. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.
   - Bảo toàn 100% dữ liệu thực tế trong CSDL.
4. **Kết luận nghiệm thu A4.5**: **PASS** (Hoàn tất Danh sách Đối chiếu Hồ sơ & Học phí).

---

### 28. Chi tiết và Thao tác Đối chiếu Hồ sơ & Học phí (A4.6)
1. **Phạm vi & Mục tiêu**:
   - Hoàn thiện màn hình chi tiết hồ sơ ứng viên tại `/admin/leads/:id` (`AdminLeadDetailView.tsx`) dành cho Quản trị viên và Cán bộ tuyển sinh (Staff).
   - Tích hợp đầy đủ thông tin đối chiếu hiện hành, form/modal xác nhận kết quả đối chiếu (`AdminReconciliationModal.tsx`), modal hủy đối chiếu có lý do bắt buộc (`AdminVoidReconciliationModal.tsx`), và dòng thời gian lịch sử đối chiếu riêng biệt.
   - Giữ nguyên vẹn chức năng chăm sóc khách hàng A3.6 (`AdminPortal` care form & audit logs).
2. **Cấu trúc & Thành phần triển khai**:
   - Component chi tiết lead: `/src/components/admin/AdminLeadDetailView.tsx`.
   - Modal đối soát: `/src/components/admin/AdminReconciliationModal.tsx`.
   - Modal hủy đối soát: `/src/components/admin/AdminVoidReconciliationModal.tsx`.
   - API endpoints: `GET /api/v1/admin/leads/:id`, `POST /api/v1/admin/leads/:id/reconcile`, `POST /api/v1/admin/leads/:id/void-reconciliation`, `GET /api/v1/admin/leads/:id/history`.
   - Tài liệu báo cáo hoàn thành: `/docs/A4_6_RECONCILIATION_DETAIL_ACTIONS_REPORT.md`.
3. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.
   - Bảo toàn 100% dữ liệu thực tế và cơ chế Idempotency chống gửi lặp.
4. **Kết luận nghiệm thu A4.6**: **PASS** (Hoàn tất Chi tiết và Thao tác Đối chiếu Hồ sơ & Học phí).

---

### 29. Đồng bộ Kết quả Đối chiếu sang A3 và Màn hình CTV (A4.7)
1. **Phạm vi & Mục tiêu**:
   - Đồng bộ hóa kết quả đối chiếu hồ sơ nhất quán trên toàn hệ thống: Danh sách đối chiếu A4.5 (`/admin/reconcile`), Danh sách khách A3 (`/admin/leads`), Chi tiết khách Admin (`/admin/leads/:id`), Danh sách khách CTV (`/portal/leads`), và Chi tiết khách CTV (`/portal/leads/:id`).
   - Sử dụng chung hàm helper `getActiveReconciliation` trên backend để chọn bản ghi đối chiếu hiện hành (`MATCHED_VALID`, `EXISTING_IN_SCHOOL_SYSTEM`, `MISMATCH_INVALID`), loại trừ bản ghi đã hủy (`VOIDED`).
   - Đảm bảo bảo mật tài chính tuyệt đối cho CTV (ẩn học phí snapshot, biên lai, ngày thu, ghi chú nội bộ).
2. **Cấu trúc & Thành phần triển khai**:
   - API endpoints đồng bộ: `GET /api/v1/affiliate/leads`, `GET /api/v1/affiliate/leads/:id`, `GET /api/v1/affiliate/leads/:id/history`.
   - Giao diện CTV: `AffiliateLeadsView.tsx`, `AffiliateLeadDetailView.tsx`.
   - Tài liệu báo cáo hoàn thành: `/docs/A4_7_RECONCILIATION_RESULTS_A3_AFFILIATE_SYNC_REPORT.md`.
3. **Kiểm tra kỹ thuật**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.
   - Bảo toàn 100% dữ liệu thực tế và tính nhất quán giữa Admin và CTV.
4. **Kết luận nghiệm thu A4.7**: **PASS** (Hoàn tất Đồng bộ Kết quả Đối chiếu sang A3 và Màn hình CTV).

---

### 30. Kiểm thử Toàn luồng và Chốt Nghiệm thu Module A4 (A4.8)
1. **Phạm vi & Mục tiêu**:
   - Kiểm chứng toàn diện E2E toàn bộ module A4: từ đăng ký khách qua link/QR CTV, tra cứu tại A4.5, xác nhận đối chiếu MATCHED_VALID / EXISTING / MISMATCH, sinh thưởng CTV, đồng bộ A3 & Cổng CTV, hủy đối chiếu và đối chiếu lại, kiểm tra concurrency, idempotency và phân quyền bảo mật.
2. **Tài liệu bàn giao**:
   - Tài liệu báo cáo nghiệm thu E2E chính thức: `/docs/A4_8_RECONCILIATION_E2E_ACCEPTANCE.md`.
3. **Kết quả kiểm thử kỹ thuật & nghiệp vụ**:
   - `npm run lint` (`tsc --noEmit`): **PASS (0 lỗi, 0 cảnh báo)**.
   - `compile_applet`: **PASS (Build succeeded)**.
   - Toàn bộ 16 ca test nghiệp vụ trong ma trận kiểm thử đạt kết quả **PASS**.
4. **Kết luận nghiệm thu toàn bộ Module A4**: **PASS TOÀN BỘ (100% HOÀN THÀNH)**.

---

### 31. Kiểm kê Module Quản trị Hệ thống (A7.1)
1. **Phạm vi & Mục tiêu**:
   - Thực hiện kiểm kê tĩnh toàn diện mã nguồn, CSDL, Storage, API, cấu hình nhận diện backend, thông tin vận hành, quy chế & đăng ký CTV, cơ chế mã CTV, lịch sử cấu hình và điều kiện sao lưu/phục hồi dữ liệu để chuẩn bị triển khai Module A7.2.
   - Tuân thủ nghiêm ngặt nguyên tắc: Chỉ đọc và viết tài liệu báo cáo, không sửa giao diện, API, logic nghiệp vụ, migration, dữ liệu hay Auth.
2. **Tài liệu báo cáo hoàn thành**:
   - `/docs/A7_1_SYSTEM_ADMINISTRATION_AUDIT.md`.
3. **Các kết luận chính & Định hướng A7.2**:
   - Đã xác định rõ các khoảng thiếu cần bổ sung ở A7.2: Bảng `system_settings` cho cấu hình hệ thống tập trung và nhận diện backend; Bảng `system_regulations` quản lý phiên bản quy chế PDF và ghi nhận đồng ý; Hàm PL/pgSQL cấp mã CTV nguyên tử chuẩn 6 chữ số (`STHCCTVXXXXXX`); và ranh giới rõ ràng với module A6, A2, A0.3, A4.
4. **Kết luận A7.1**: **PASS** (Hoàn tất Kiểm kê Hệ thống và Lập báo cáo A7.1).

---

### 32. Chốt Đặc Tả Module Quản Trị Hệ Thống (A7.2)
1. **Phạm vi & Mục tiêu**:
   - Thiết kế và chốt tài liệu đặc tả toàn diện cho Module A7 (Quản trị hệ thống) tại route `/admin/system-settings`, chỉ dành riêng cho Admin (`profiles.role === 'admin'`).
   - Đính chính và làm rõ 6 điểm kỹ thuật từ A7.1: cơ chế cấp mã PL/pgSQL vòng lặp ngẫu nhiên trong trigger hiện hữu (không phải sequence), ràng buộc duy nhất bảo đảm bởi UNIQUE constraint (không phải RLS), trạng thái CSDL production "Chưa xác minh từ hạ tầng", chặn triệt để Staff khỏi màn hình và API quản trị A7, chuẩn hóa mức độ xác minh "Xác minh từ migration", và giữ nguyên ranh giới tài khoản nhân viên A0.3 (`/admin/staff-accounts`).
   - Tuân thủ nghiêm ngặt nguyên tắc: Chỉ thiết kế và viết tài liệu, không thay đổi mã chức năng, CSDL, Auth, Storage, hay biến môi trường.
2. **Tài liệu đặc tả hoàn thành**:
   - `/docs/A7_2_SYSTEM_ADMINISTRATION_SPECIFICATION.md`.
3. **Các quyết định kỹ thuật đã chốt**:
   - **Bố cục**: 6 nhóm chức năng (Nhận diện backend, Thông tin vận hành, Quy chế & Đăng ký CTV, Mã CTV, Lịch sử cấu hình & Khôi phục, Sao lưu & Phục hồi ghi rõ "Chưa triển khai"). Nút Lưu/Hủy riêng từng nhóm, xem trước live preview sidebar mở và thu gọn.
   - **Tách biệt CSDL**: Tách hoàn toàn khỏi `homepage_config` và `homepage_config_history` của A6; thiết kế 5 bảng mới: `system_settings`, `system_settings_history`, `system_regulations`, `affiliate_regulation_consents`, `affiliate_code_registry`.
   - **Quy chế & Đăng ký**: Tệp PDF quy chế tối đa 10 MB, duy nhất 1 bản `ACTIVE`, kiểm tra loại tệp an toàn; chặn mở đăng ký khi chưa có quy chế áp dụng; ghi nhận đồng ý nguyên tử gắn với version quy chế và thời điểm máy chủ.
   - **Mã CTV**: Tiền tố mặc định `STHCCTV`, đệm số tối thiểu 6 chữ số (`STHCCTV000001`), cấp mã tự động tăng nguyên tử bằng PostgreSQL Sequence, không cắt cụt số khi vượt 6 chữ số, không tái sử dụng mã, không lùi bộ đếm.
   - **Đồng thời & Kiểm soát xung đột**: Áp dụng Optimistic Concurrency Control qua trường `revision`, trả HTTP 409 Conflict khi xung đột.
   - **Ma trận kiểm thử**: Xây dựng 15 ca kiểm thử chi tiết phục vụ nghiệm thu.
   - **Phân kỳ**: Định hình rõ phạm vi A7.3–A7.8 và để lại hạ tầng phục hồi chuyên sâu cho A7.9–A7.13.
4. **Kết luận A7.2**: **PASS** (Hoàn tất Thiết kế & Chốt Đặc tả Module A7). Dừng sau A7.2 theo yêu cầu, chưa triển khai A7.3.

---

### 33. Triển Khai CSDL & API Quản Trị Hệ Thống (A7.3)
1. **Phạm vi & Giới hạn đã thực hiện**:
   - Triển khai toàn bộ tầng CSDL, Migration, Constraints, Indexes, Sequences, PL/pgSQL RPCs, Storage bucket `system-assets` và 12 API Endpoints (3 Public, 9 Admin-only) cho Module Quản trị hệ thống (A7).
   - Đính chính và xử lý triệt để 9 điểm kỹ thuật từ A7.2: Khởi tạo đóng đăng ký CTV khi chưa có quy chế ACTIVE; cấp mã không cắt cụt số vượt 6 chữ số (`GREATEST(min_digits, len)`); tách bạch transaction CSDL và cuộc gọi HTTP `auth.signUp()`; chấp nhận sequence có khoảng cách tự nhiên nhưng cam kết đơn điệu và duy nhất 100%; không suy đoán hạ tầng sao lưu snapshot; chuyển bucket `system-assets` sang Private và stream file qua API kiểm soát; chuẩn hóa linh hoạt số điện thoại (+84/84/0); khởi tạo sequence bằng `setval(..., is_called)` chính xác; bóc tách số mã CTV bằng regex đuôi an toàn.
   - Tuân thủ ranh giới A7.3: Chưa can thiệp UI/Sidebar/Menu tài khoản hay form đăng ký CTV.
2. **Tài liệu báo cáo hoàn thành**:
   - `/docs/A7_3_SYSTEM_ADMINISTRATION_DB_API_REPORT.md`.
3. **Các thành phần kỹ thuật cốt lõi**:
   - **Migration SQL**: `/supabase/migrations/20261005000001_create_system_administration_schema_and_rpc.sql` tạo 5 bảng (`system_settings`, `system_settings_history`, `system_regulations`, `affiliate_regulation_consents`, `affiliate_code_registry`), Sequence `seq_affiliate_code_counter`, và 5 RPCs (`fn_save_system_settings_group`, `fn_rollback_system_settings_group`, `fn_apply_system_regulation`, `fn_generate_next_affiliate_code`, `fn_preview_next_affiliate_code`).
   - **Kho dữ liệu đồng hành**: `data/system_settings.json`, `data/system_regulations.json`, `data/affiliate_code_registry.json`.
   - **Storage & Bảo mật**: Bucket `system-assets`, kiểm tra Binary Magic Bytes (`%PDF-`, PNG, JPG, ICO), giới hạn dung lượng nghiêm ngặt (2MB logo, 512KB favicon, 10MB quy chế).
   - **Backend API (`server.ts`)**: 12 Endpoints bảo vệ bởi RBAC `requireAdminOnly` (trả 403 `ADMIN_ONLY` cho Staff), kiểm soát xung đột ghi đè bằng `expected_revision` (trả 409 `CONFIG_VERSION_CONFLICT`), lọc Allowlist chặt chẽ từng nhóm (trả 400 nếu có trường lạ), hỗ trợ rollback theo nhóm bảo toàn sequence.
4. **Kết quả kiểm thử tự động (`npm run test:system-admin`)**:
   - **12/12 Ca kiểm thử PASS (100.0%)**:
     - *TC-A7.3-01*: Public API trả Allowlist an toàn, bảo vệ 100% bí mật backend: **PASS**.
     - *TC-A7.3-02*: Public Active Regulation trả 404 khi chưa có quy chế áp dụng: **PASS**.
     - *TC-A7.3-03*: Chặn truy cập trái phép không token (401) và chặn Staff (403 ADMIN_ONLY): **PASS**.
     - *TC-A7.3-04*: Admin đọc cấu hình và thống kê bộ cấp mã CTV: **PASS**.
     - *TC-A7.3-05*: Từ chối trường ngoài Allowlist (HTTP 400): **PASS**.
     - *TC-A7.3-06*: Kiểm soát xung đột ghi đè bằng Revision (HTTP 409): **PASS**.
     - *TC-A7.3-07*: Xác thực & chuẩn hóa SĐT (+84/84/0) và Base URL: **PASS**.
     - *TC-A7.3-08*: Chặn mở đăng ký CTV khi chưa có quy chế ACTIVE: **PASS**.
     - *TC-A7.3-09*: Xác thực định dạng nhị phân PDF Magic Bytes (%PDF-) & Upload: **PASS**.
     - *TC-A7.3-10*: Vòng đời Quy chế: Draft -> Apply Active -> Mở Đăng ký CTV: **PASS**.
     - *TC-A7.3-11*: Khôi phục cấu hình theo nhóm (Rollback) & Bảo toàn Sequence: **PASS**.
     - *TC-A7.3-12*: Thuật toán Cấp mã CTV tự tăng: Không cắt số, giữ đúng tiền tố: **PASS**.
5. **Kết luận A7.3**: **PASS TOÀN BỘ (100% HOÀN THÀNH)**. Dừng đúng ranh giới sau CSDL và API, sẵn sàng chuyển tiếp sang bước A7.4.






