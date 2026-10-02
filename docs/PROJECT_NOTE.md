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


