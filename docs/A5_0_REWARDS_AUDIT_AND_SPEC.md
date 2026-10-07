# A5.0 – Báo cáo Kiểm kê Màn hình Demo, Dữ liệu và Chức năng Thù lao CTV (STHC_CTV)

- **Mã định danh bước:** A5.0
- **Dự án:** STHC_CTV (Hệ thống Quản lý Cộng tác viên & Tuyển sinh Saigontourist)
- **Thời điểm kiểm kê:** Tháng 10/2026
- **Trạng thái:** HOÀN TẤT KIỂM KÊ (READ-ONLY AUDIT & SPECIFICATION)

---

## 1. Phạm vi đã kiểm tra và giới hạn xác minh

### 1.1. Phạm vi đã kiểm tra (Codebase & Database Schema)
- **Giao diện Quản trị (Admin Portal):**
  - Màn hình quản lý thù lao tại tab `/admin/rewards` (`src/components/admin/AdminPortal.tsx`, dòng 1241–1346).
  - Các nút thao tác: Làm mới (`loadAllData`), Duyệt thưởng (`handleApproveReward`), Từ chối (`setRejectRewardId` / `rejectReward`), và Xuất CSV (`api.getExportRewardsCsvUrl()`).
- **Giao diện Cộng tác viên (Affiliate Dashboard):**
  - Thống kê thưởng chờ duyệt (`pending_reward_count`, `pending_reward_amount`) và đã duyệt (`approved_reward_count`, `approved_reward_amount`) trên `AffiliateDashboard.tsx`.
  - API danh sách thù lao CTV: `/api/v1/affiliate/rewards` (`server.ts`, dòng 3404–3420).
- **Backend API & RPC:**
  - `GET /api/v1/admin/rewards` (Trích xuất danh sách thưởng kèm thông tin lead và affiliate).
  - `POST /api/v1/admin/rewards/:id/approve` (Gọi RPC `fn_approve_reward` với fallback cập nhật trực tiếp bảng `rewards`).
  - `POST /api/v1/admin/rewards/:id/reject` (Gọi RPC `fn_reject_reward` với yêu cầu bắt buộc `rejection_reason`).
  - `GET /api/v1/admin/reports/rewards-export` (Xuất báo cáo CSV cho Phòng Kế toán).
- **Cơ sở dữ liệu (Database Schema & Migrations):**
  - Bảng `public.rewards` (`supabase/migrations/20260929000001_initial_schema.sql`).
  - RLS & Grant quyền (`supabase/migrations/20260929000002_permissions_and_rls.sql`).
  - RPC functions (`supabase/migrations/20260929000004_atomic_operations.sql`).

### 1.2. Giới hạn xác minh (Read-Only Limits)
- Theo đúng quy tắc A5.0, trong bước này **chưa thực hiện bất kỳ thay đổi nào** đối với giao diện, API, RPC, schema, RLS hoặc dữ liệu nghiệp vụ.
- Không chạy migration, seed dữ liệu hoặc thao tác duyệt/từ chối/hủy trên dữ liệu thật.
- Không triển khai ví điện tử, rút tiền, cổng thanh toán hoặc trạng thái đã thanh toán ngân hàng (`PAID`).

---

## 2. Bảng kiểm kê Giao diện, API/RPC, Schema, Quyền và Dữ liệu

| Thành phần | Loại | Tên / Đường dẫn | Trạng thái thực tế | Ghi chú & Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **Màn hình Admin Rewards** | UI Component | `/admin/rewards` (`AdminPortal.tsx`) | **Hoạt động một phần (Hybrid Demo/Real)** | Hiển thị danh sách thưởng từ API `/api/v1/admin/rewards` kết hợp mock data (`mockAdminRewards`) khi bảng trống. Nút Duyệt/Từ chối gọi API thật có fallback RPC. |
| **API Danh sách Admin** | Backend Route | `GET /api/v1/admin/rewards` (`server.ts`) | **Đang hoạt động thật** | Truy vấn bảng `rewards` kết hợp bảng `leads` và `affiliate_profiles`. Fallback sang `mockAdminRewards` nếu dữ liệu trống. |
| **API Duyệt Thưởng** | Backend Route / RPC | `POST /api/v1/admin/rewards/:id/approve` | **Đang hoạt động thật** | Gọi RPC `fn_approve_reward`, fallback cập nhật `status = 'APPROVED'`. |
| **API Từ chối Thưởng** | Backend Route / RPC | `POST /api/v1/admin/rewards/:id/reject` | **Đang hoạt động thật** | Bắt buộc `rejection_reason`, gọi RPC `fn_reject_reward`, fallback cập nhật `status = 'REJECTED'`. |
| **API Xuất Kế toán** | Backend Route | `GET /api/v1/admin/reports/rewards-export` | **Hoạt động mô phỏng (Demo Export)** | Trả về file CSV tĩnh (`Bang_Ke_Thuong_CTV_STHC_Ketoan.csv`) với 1 dòng demo cứng. |
| **Schema Bảng `rewards`** | PostgreSQL Table | `public.rewards` (`initial_schema.sql`) | **Hoạt động thật (Robust)** | Có các cột `lead_id`, `reconciliation_id`, `affiliate_id`, `amount`, `status`, `approved_by`, `rejection_reason`, `void_reason`. |
| **Index & Unique Constraint** | PostgreSQL Index | `uq_active_reward_per_lead` | **Hoạt động thật** | Ràng buộc duy nhất `uq_active_reward_per_lead` trên `lead_id` với điều kiện `status IN ('PENDING_APPROVAL', 'APPROVED')` ngăn chặn trùng lặp khoản thưởng đang hiệu lực cho cùng một hồ sơ. |
| **Dashboard CTV Rewards** | UI & API | `/api/v1/affiliate/rewards` & `AffiliateDashboard.tsx` | **Hoạt động thật** | Truy vấn các khoản thù lao gắn với `affiliate_id` của CTV đăng nhập, phân loại `PENDING_APPROVAL` và `APPROVED`. |

---

## 3. Luồng A3 → A4 → rewards → Dashboard CTV hiện tại

1. **A3 (Khách giới thiệu & Nguồn CTV):**
   - Khách hàng đăng ký tư vấn qua trang landing hoặc liên kết giới thiệu của CTV (`affiliate_code`).
   - Hệ thống ghi nhận lead vào bảng `leads` với `affiliate_id` tương ứng và trạng thái tư vấn ban đầu.
2. **A4 (Đối chiếu học phí & Xác nhận nhập học EGOV):**
   - Cán bộ tuyển sinh kiểm tra biên lai thu học phí và mã định danh trên hệ thống EGOV của trường.
   - Thao tác đối chiếu (`reconcileLead`) tạo một bản ghi trong `lead_reconciliations` với trạng thái `MATCHED_VALID`.
   - Đồng thời, trigger hoặc logic nghiệp vụ trong transaction đối chiếu sẽ **tự động sinh một bản ghi thù lao (`rewards`)** với trạng thái ban đầu là `PENDING_APPROVAL` và mức thưởng tiêu chuẩn 500.000 VNĐ.
3. **A5 (Thẩm định và Phê duyệt thù lao):**
   - Trưởng bộ phận tuyển sinh / Admin kiểm tra danh sách thưởng chờ duyệt tại tab `/admin/rewards`.
   - Thực hiện **Duyệt thưởng** (`APPROVED`) hoặc **Từ chối** (`REJECTED`) với lý do bắt buộc.
   - Nếu đối chiếu bị hủy (`voidReconciliation`), bản ghi thù lao liên quan cũng được xử lý đồng bộ (chuyển sang `VOIDED` hoặc thu hồi theo ràng buộc).
4. **Dashboard CTV:**
   - Cộng tác viên đăng nhập vào Cổng CTV, xem tổng quan số lượng và số tiền thù lao ở trạng thái `CHỜ DUYỆT (PENDING)` và `ĐÃ DUYỆT (APPROVED)`.
   - Các khoản `REJECTED` hoặc `VOIDED` bị loại trừ khỏi tổng thù lao còn hiệu lực.

---

## 4. Ma trận Trạng thái và Chuyển trạng thái (`rewards.status`)

| Trạng thái hiện tại | Thao tác / Sự kiện | Trạng thái mới | Điều kiện & Ràng buộc |
| :--- | :--- | :--- | :--- |
| *(Không có)* | Đối chiếu hợp lệ (`MATCHED_VALID`) ở A4 | `PENDING_APPROVAL` | Sinh tự động 1 bản/lần đối chiếu hợp lệ. Bị chặn nếu đã có bản `PENDING_APPROVAL` hoặc `APPROVED` (`uq_active_reward_per_lead`). |
| `PENDING_APPROVAL` | Admin bấm **Duyệt thưởng** | `APPROVED` | Cập nhật `approved_by`, `approved_at = NOW()`. |
| `PENDING_APPROVAL` | Admin bấm **Từ chối** | `REJECTED` | Bắt buộc nhập `rejection_reason`. Cập nhật `approved_by`, `approved_at`, `rejection_reason`. |
| `PENDING_APPROVAL` / `APPROVED` | Admin/Staff **Hủy đối chiếu** ở A4 (`voidReconciliation`) | `VOIDED` | Hủy hiệu lực thù lao khi đối chiếu bị hủy, giải phóng `uq_active_reward_per_lead` cho phép đối chiếu lại sau này. |
| `APPROVED` | *(Chưa có quy trình chi trả ngân hàng)* | `APPROVED` | Bước A5 hiện tại dừng ở mức phê duyệt thẩm định (`APPROVED`), chưa triển khai trạng thái `PAID` (Đã thanh toán). |

---

## 5. Ma trận Quyền hiện tại và Quyền dự kiến

### 5.1. Phân quyền hiện tại
- Hệ thống sử dụng middleware `requireStaffOrAdmin` và `requireAdminOnly` trong `server.ts`.
- Hiện tại phân quyền kiểm soát toàn bộ tab `/admin/rewards` và các API duyệt/từ chối cho nhóm `admin` / `staff` tổng thể, chưa phân tách chi tiết từng quyền con.

### 5.2. Danh mục Quyền dự kiến (A5 Implementation)
Theo định hướng đã thống nhất, hệ thống sẽ sử dụng 3 role chính (`admin`, `staff`, `CTV`) với danh mục quyền chi tiết:
- `rewards.view`: Xem danh sách thù lao.
- `rewards.view_detail`: Xem chi tiết khoản thù lao và lịch sử gắn với lead.
- `rewards.approve`: Phê duyệt khoản thù lao (`APPROVED`).
- `rewards.reject`: Từ chối khoản thù lao (`REJECTED`).
- `rewards.void`: Hủy/vô hiệu hóa khoản thù lao khi hủy đối chiếu.
- `rewards.summary`: Xem các số liệu tổng hợp thù lao.
- `rewards.export`: Xuất bảng kê thù lao cho kế toán (CSV).

*Lưu ý:* Staff được giao phụ trách có thể toàn quyền A5 thông qua nhóm quyền được gán bởi Admin. Admin quản lý việc gán/thu hồi quyền; Staff không được tự cấp quyền cho mình.

---

## 6. Kết quả Truy vấn Kiểm tra Tính toàn vẹn Dữ liệu
- **Ràng buộc khóa ngoại & ON DELETE RESTRICT:** Các bảng `rewards`, `lead_reconciliations`, `leads`, `affiliate_profiles` thiết lập `ON DELETE RESTRICT` bảo toàn tuyệt đối lịch sử kiểm toán.
- **Index độc nhất có điều kiện (`uq_active_reward_per_lead`):** Đảm bảo tại một thời điểm, mỗi lead chỉ có tối đa 01 khoản thù lao đang ở trạng thái `PENDING_APPROVAL` hoặc `APPROVED`, ngăn chặn hoàn toàn việc tạo trùng lặp thù lao do đối chiếu lại nhiều lần.
- **Tính chính xác của số tiền:** Tổng tiền thưởng được tính trực tiếp từ cột `amount` của các bản ghi `rewards` thỏa mãn điều kiện trạng thái, không suy luận công thức nhân thủ công (tránh sai lệch khi có mức thưởng đặc biệt hoặc điều chỉnh).

---

## 7. Danh sách Dữ liệu Mẫu, Ghi cứng và Chức năng Chưa hoàn chỉnh

1. **Ghi cứng giao diện:**
   - Tiêu đề màn hình: `"Phê Duyệt Khoản Thưởng Tuyển Sinh (500.000 VNĐ)"`.
   - Mã hồ sơ demo: `STHC-2026-TS-0188`, `STHC-2026-TS-0215`.
   - Tên CTV demo: `Trần Thị Thu Thảo`, Mã CTV: `STHCCTV1088`, CCCD: `079201001234`.
2. **Chức năng mock / fallback:**
   - API `GET /api/v1/admin/rewards` trả về kết hợp dữ liệu thật từ bảng `rewards` và mảng tĩnh `mockAdminRewards` khi chưa có đủ dữ liệu thực tế.
   - API xuất báo cáo `/api/v1/admin/reports/rewards-export` hiện trả về file CSV tĩnh với 1 dòng mẫu cố định.
3. **Phần chưa triển khai (theo giới hạn A5.0):**
   - Chưa triển khai trạng thái chi trả ngân hàng (`PAID`), lịch sử ủy nhiệm chi hoặc ví điện tử của CTV.
   - Chưa triển khai giao diện phân trang, bộ lọc tìm kiếm nâng cao trực tiếp trên tab `/admin/rewards` (hiện tại hiển thị danh sách gộp).

---

## 8. Bảng phần Giữ lại, phần cần Sửa, phần cần Bổ sung

| Thành phần | Trạng thái / Hành động | Mô tả chi tiết |
| :--- | :--- | :--- |
| **Phần giữ lại** | **GIỮ NGUYÊN** | Bảng `rewards`, ràng buộc `uq_active_reward_per_lead`, các RPC `fn_approve_reward`, `fn_reject_reward` và mô hình mức thưởng tiêu chuẩn 500.000 VNĐ. |
| **Phần cần sửa** | **NÂNG CẤP** | Thay thế mock data cứng trong API `/api/v1/admin/rewards` và báo cáo xuất CSV bằng dữ liệu thật hoàn toàn từ cơ sở dữ liệu khi có truy vấn phân trang/lọc. |
| **Phần bổ sung** | **BỔ SUNG MỚI** | Xây dựng đầy đủ bộ lọc tìm kiếm theo trạng thái thưởng, tên CTV, khoảng thời gian, phân trang tiêu chuẩn và tích hợp chi tiết khoản thù lao vào màn hình chi tiết lead/CTV. |

---

## 9. Đặc tả Đầu vào cho các Bước tiếp theo

- **PQ.1–PQ.3:** Kiểm tra và chuẩn hóa cấu trúc truy vấn dữ liệu thù lao, thống kê tổng hợp số liệu theo thời gian thực.
- **A5.1A–A5.1B:** Hoàn thiện API và giao diện danh sách thưởng Admin với bộ lọc, tìm kiếm và phân trang chuẩn.
- **A5.2A–A5.2B:** Hoàn thiện luồng chi tiết khoản thưởng, lịch sử thay đổi và liên kết chặt chẽ với biên lai đối chiếu A4.
- **PQ.4–PQ.5:** Kiểm tra quy tắc nghiệp vụ đồng bộ khi hủy đối chiếu (`voidReconciliation`) tác động đến trạng thái thù lao (`VOIDED`).
- **A5.3A–A5.3B:** Nâng cấp chức năng Phê duyệt (`APPROVED`) và Từ chối (`REJECTED`) kèm kiểm tra phân quyền chặt chẽ.
- **A5.4A–A5.4B:** Hoàn thiện tính năng xuất báo cáo bảng kê thù lao cho Phòng Kế toán (xuất CSV/Excel chuẩn từ dữ liệu thực).
- **PQ.6 + A5.5:** Kiểm thử E2E toàn bộ luồng A3 → A4 → A5 và đồng bộ hiển thị chính xác trên Dashboard CTV.

---

## 10. Các vấn đề cần Chốt nghiệp vụ
1. **Xác nhận về mức thù lao:** Mức thù lao chuẩn hiện tại là 500.000 VNĐ/hồ sơ nhập học hợp lệ. Hệ thống có cần hỗ trợ cấu hình mức thưởng linh hoạt theo từng khóa học hoặc từng đợt tuyển sinh trong tương lai không? *(Hiện tại giữ nguyên mức cố định theo quy chế).*
2. **Quy trình chi trả (Payout):** Bước A5 hiện dừng ở khâu phê duyệt thẩm định (`APPROVED`). Có cần thiết kế thêm giai đoạn xác nhận đã chuyển khoản ngân hàng (Trạng thái `PAID` kèm số chứng từ / ngày chuyển tiền) trong pha tiếp theo không?
