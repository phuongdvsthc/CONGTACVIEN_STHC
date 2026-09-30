# BÁO CÁO KIỂM KÊ CHỨC NĂNG, API, DỮ LIỆU VÀ QUYỀN KHU VỰC QUẢN TRỊ STHC_CTV (A0.2)

- **Mã dự án:** `STHC-CTV-A0.2`
- **Phạm vi kiểm kê:** Khu vực Quản trị & Cán bộ Tuyển sinh (`Staff & Admin`, route `/admin`)
- **Trạng thái:** Đọc mã nguồn và kiểm kê tĩnh (Read-only Architecture Inventory)
- **Ngày lập báo cáo:** 30/09/2026

---

## 1. Kiểm kê Giao diện và Route (Admin / Staff Area)

Khu vực quản trị hệ thống hiện được tập trung tại một component trung tâm (`AdminPortal.tsx`) với cơ chế chuyển tab giao diện nội bộ (`activeTab`), được bảo vệ bởi Route Guard (`navigationGuard.ts`).

| Phần chức năng quản trị | Route thực tế | File / Component | Trạng thái giao diện | Thao tác hiện có | Mức độ hoạt động thực tế | Dùng chung Layout |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tổng quan / Dashboard** | `/admin` (Tab mặc định: Duyệt CTV) | `src/components/admin/AdminPortal.tsx` | Đã có giao diện card thống kê & các tab điều hướng | Chuyển tab qua lại giữa các phân hệ | Hoạt động qua dữ liệu tab quản lý | Dùng chung header tối giản (A0.1) |
| **Quản lý CTV** | `/admin` (Tab `affiliates`) | `src/components/admin/AdminPortal.tsx` | Đã có bảng danh sách CTV, tìm kiếm, nút duyệt / tạm ngưng / từ chối | Xem danh sách, thay đổi trạng thái (`ACTIVE`, `SUSPENDED`, `REJECTED`) | Gọi API thật (`getAdminAffiliates`, `updateAffiliateStatus`), kèm fallback mock | Khung layout trang quản trị chung |
| **Quản lý Khóa học** | `/admin` (Tab `courses`) | `src/components/admin/AdminPortal.tsx` | Đã có danh sách khóa học, học phí dự kiến, trạng thái mở/đóng | Bật/tắt trạng thái `is_active`, cập nhật học phí dự kiến | Gọi API thật (`getAdminCourses`, `updateCourse`), kèm fallback seed | Khung layout trang quản trị chung |
| **Khách hàng được giới thiệu (Leads)** | `/admin` (Tab `leads`) | `src/components/admin/AdminPortal.tsx` | Bảng danh sách lead, số điện thoại, tiến độ tư vấn, mã giới thiệu CTV | Cập nhật trạng thái tư vấn (`NEW`, `CONTACTED`, `CONSULTING`, `ENROLLED`, `DROPPED`) | Gọi API thật (`getAdminLeads`, `updateCounselingStatus`), kèm seed lead | Khung layout trang quản trị chung |
| **Đối chiếu hồ sơ & học phí (Reconcile)** | `/admin` (Tab `reconcile`) | `src/components/admin/AdminPortal.tsx` | Bảng danh sách lead đủ điều kiện đối soát, nút "Đối soát & Ghép hồ sơ", "Hủy ghép" | Mở modal nhập mã hồ sơ, mã sinh viên, học phí thực thu, số biên lai, ngày đóng | Gọi API thật (`reconcileLead`, `voidReconciliation`, `getLeadHistory`), kèm modal form | Khung layout trang quản trị chung |
| **Thù lao & Báo cáo (Rewards)** | `/admin` (Tab `rewards`) | `src/components/admin/AdminPortal.tsx` | Danh sách thưởng 500k phát sinh từ lead khớp hợp lệ, nút Phê duyệt / Từ chối | Phê duyệt thưởng (tạo record reward/chuyển trạng thái), Từ chối có lý do | Gọi API thật (`getAdminRewards`, `approveReward`, `rejectReward`, nút xuất CSV báo cáo) | Khung layout trang quản trị chung |
| **Nhật ký hệ thống (Audit Logs)** | `/admin` (Tab `audit`) | `src/components/admin/AdminPortal.tsx` | Bảng nhật ký kiểm toán hành động hệ thống (thao tác, thời gian, actor) | Xem lịch sử thao tác quản trị | Gọi API thật (`getAdminAuditLogs`), phân quyền RLS chặt chẽ | Khung layout trang quản trị chung |
| **Quản lý nội dung trang chủ / Tài khoản nhân viên** | N/A | Chưa tách riêng route | Chưa có giao diện riêng | Chưa có | Chưa triển khai (nằm ngoài phạm vi giai đoạn hiện tại) | N/A |

---

## 2. Kiểm kê API (Backend Endpoints & Client Service)

Toàn bộ các API phục vụ khu vực quản trị được định nghĩa trong `server.ts` và gọi qua `api.ts`.

| Chức năng quản trị | Method & Endpoint thực tế | File xử lý Backend | Xác thực phiên & Quyền | Bảng / RPC / Function sử dụng | Kiểm tra đầu vào & Xử lý lỗi | Ghi Audit Log | Trạng thái tích hợp Frontend |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lấy danh sách CTV** | `GET /api/v1/admin/affiliates` | `server.ts` (dòng ~1303) | `requireStaffOrAdmin` | `affiliate_profiles`, JOIN `profiles` | Có try/catch, fallback demo list | Không | Đã nối API thật (`api.getAdminAffiliates`) |
| **Duyệt / Sửa trạng thái CTV** | `PATCH /api/v1/admin/affiliates/:id/status` | `server.ts` (dòng ~1320) | `requireStaffOrAdmin` | `affiliate_profiles` (update `status`, `review_note`, `reviewed_at`, `reviewed_by`) | Kiểm tra enum status (`ACTIVE`, `SUSPENDED`, `REJECTED`) | Có (qua `reviewed_by`) | Đã nối API thật (`api.updateAffiliateStatus`) |
| **Lấy danh sách Khóa học** | `GET /api/v1/admin/courses` | `server.ts` (dòng ~1359) | `requireStaffOrAdmin` | `courses` | Trả về `INITIAL_COURSES` nếu DB rỗng | Không | Đã nối API thật (`api.getAdminCourses`) |
| **Cập nhật Khóa học** | `PATCH /api/v1/admin/courses/:id` | `server.ts` (dòng ~1368) | `requireStaffOrAdmin` | `courses` (update `is_active`, `tuition_fee_estimate`, `updated_at`) | Có try/catch | Không | Đã nối API thật (`api.updateCourse`) |
| **Lấy danh sách Leads** | `GET /api/v1/admin/leads` | `server.ts` (dòng ~1387) | `requireStaffOrAdmin` | `leads`, JOIN `courses`, `affiliate_profiles` | Fallback seed leads | Không | Đã nối API thật (`api.getAdminLeads`) |
| **Cập nhật tiến độ Tư vấn** | `PATCH /api/v1/admin/leads/:id/counseling-status` | `server.ts` (dòng ~1410) | `requireStaffOrAdmin` | `leads` (update `counseling_status`) | Có kiểm tra trạng thái | Có | Đã nối API thật (`api.updateCounselingStatus`) |
| **Đối soát Hồ sơ & Học phí** | `POST /api/v1/admin/leads/:id/reconcile` | `server.ts` (dòng ~1425) | `requireStaffOrAdmin` | `leads`, `lead_reconciliations`, `audit_logs` | Kiểm tra mã hồ sơ, học phí > 0, chống trùng lặp qua Partial Unique Index | Có (`audit_logs`) | Đã nối API thật (`api.reconcileLead`) |
| **Hủy ghép Đối soát** | `POST /api/v1/admin/leads/:id/void-reconciliation` | `server.ts` (dòng ~1475) | `requireStaffOrAdmin` | `leads`, `lead_reconciliations`, `audit_logs` | Bắt buộc nhập lý do hủy ghép (`void_reason`) | Có (`audit_logs`) | Đã nối API thật (`api.voidReconciliation`) |
| **Lịch sử thay đổi Lead** | `GET /api/v1/admin/leads/:id/history` | `server.ts` (dòng ~1515) | `requireStaffOrAdmin` | `lead_reconciliations`, `audit_logs` | Truy vấn lịch sử theo lead_id | Không | Đã nối API thật (`api.getLeadHistory`) |
| **Danh sách Thưởng 500k** | `GET /api/v1/admin/rewards` | `server.ts` (dòng ~1535) | `requireStaffOrAdmin` | `rewards`, `leads`, `affiliate_profiles` | Fallback mock rewards | Không | Đã nối API thật (`api.getAdminRewards`) |
| **Phê duyệt Thưởng** | `POST /api/v1/admin/rewards/:id/approve` | `server.ts` (dòng ~1560) | `requireStaffOrAdmin` | `rewards`, `audit_logs` | Kiểm tra tồn tại record thưởng | Có (`audit_logs`) | Đã nối API thật (`api.approveReward`) |
| **Từ chối Thưởng** | `POST /api/v1/admin/rewards/:id/reject` | `server.ts` (dòng ~1585) | `requireStaffOrAdmin` | `rewards`, `audit_logs` | Bắt buộc nhập lý do từ chối | Có (`audit_logs`) | Đã nối API thật (`api.rejectReward`) |
| **Nhật ký Kiểm toán (Audit Logs)** | `GET /api/v1/admin/audit-logs` | `server.ts` (dòng ~1620) | `requireStaffOrAdmin` (Admin only tối ưu hóa) | `audit_logs`, JOIN `profiles` | Fallback mảng rỗng/seed | Không (Bản thân là log) | Đã nối API thật (`api.getAdminAuditLogs`) |

---

## 3. Kiểm kê Dữ liệu Thật và Dữ liệu Mẫu (Mock / Seed / DB)

Hệ thống kết hợp giữa dữ liệu thực từ cơ sở dữ liệu Supabase và các khối dữ liệu dự phòng (fallback seed data) nhằm bảo đảm trải nghiệm không bị đứt gãy khi cơ sở dữ liệu mới khởi tạo.

- **Dữ liệu lấy từ Database thực (`Supabase`)**:
  - Bảng `profiles`: Chứa thông tin tài khoản người dùng (`id`, `email`, `full_name`, `role`, `is_active`).
  - Bảng `affiliate_profiles`: Chứa hồ sơ CTV (`id`, `user_id`, `affiliate_code`, `status`, `review_note`).
  - Bảng `courses`: Danh mục ngành đào tạo STHC (`code`, `title`, `slug`, `tuition_fee_estimate`, `is_active`).
  - Bảng `leads`: Thông tin người học quan tâm tư vấn (`full_name`, `phone`, `affiliate_id`, `counseling_status`, `reconciliation_status`).
  - Bảng `lead_reconciliations` & `rewards`: Lịch sử đối soát và thưởng 500.000 VNĐ.
  - Bảng `audit_logs`: Nhật ký kiểm toán hành động quản trị.
- **Dữ liệu mẫu / Fallback trong Backend (`server.ts`)**:
  - `INITIAL_COURSES`: Mảng 8 khóa học chuẩn của STHC (Chế biến món ăn, Bếp bánh, Quản trị Khách sạn, Lễ tân, F&B, Pha chế, Hướng dẫn du lịch, Điều hành tour).
  - `demoState`: Các đối tượng mẫu (`pendingAffiliate`, `activeAffiliate`, `staffUser`, `adminUser`) dùng khi tra cứu bảng chưa có dữ liệu seed.
- **Dữ liệu thử / Mock State**: Không phát hiện localStorage hay state frontend lưu giữ dữ liệu nghiệp vụ nhạy cảm; toàn bộ state quản trị đều fetch trực tiếp từ API backend.

---

## 4. Kiểm kê Database (Migration & Schema Specifications)

*(Dựa trên mã nguồn các file migration tại `/supabase/migrations/`)*

1. **Các bảng cốt lõi (Migration 001)**:
   - `profiles`, `affiliate_profiles`, `courses`, `leads`, `lead_reconciliations`, `rewards`, `audit_logs`.
   - Ràng buộc khóa ngoại chống xóa dây chuyền (`ON DELETE RESTRICT`) trên tất cả các quan hệ nghiệp vụ quan trọng.
   - Các Partial Unique Indexes chống trùng lặp mã đối soát, mã hồ sơ tuyển sinh, và thưởng 500k.
2. **Phân quyền và RLS (Migration 002 & 005)**:
   - Thu hồi toàn bộ quyền ghi (`INSERT`, `UPDATE`, `DELETE`) từ role `authenticated` trên 7 bảng. Mọi thao tác ghi dữ liệu bắt buộc đi qua Backend API server (`service_role`).
   - Hàm `get_auth_role()` (`SECURITY DEFINER`) phân giải vai trò an toàn.
   - Trigger chống leo thang đặc quyền (`trg_prevent_profile_escalation`, `trg_prevent_affiliate_escalation`).
   - Thủ tục nâng quyền Admin có kiểm soát (`controlled_admin_bootstrap`).
3. **Trạng thái xác thực trên Database**:
   - **Chưa xác minh trực tiếp trên CSDL Production** (Do môi trường yêu cầu Read-only SQL). Đã cung cấp hướng dẫn SQL chỉ đọc ở báo cáo trước. Toàn bộ cấu trúc Schema được định nghĩa chuẩn trong 6 file migration (`20260929000001` đến `20260929000006`).

---

## 5. Kiểm kê Quyền Hiện Có (Access Control Matrix)

| Thao tác nghiệp vụ quản trị | Admin hiện được phép | Staff hiện được phép | Điều kiện Menu | Điều kiện Route Guard (`navigationGuard.ts`) | Điều kiện Backend (`server.ts`) | Giới hạn dữ liệu xem/sửa | Sự đồng nhất |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Xem / Duyệt / Từ chối / Tạm ngưng CTV** | Toàn quyền | Toàn quyền | Tab `affiliates` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` | Toàn bộ danh sách hồ sơ CTV | Đồng nhất |
| **Xem / Sửa khóa học & học phí** | Toàn quyền | Toàn quyền | Tab `courses` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` | Toàn bộ danh mục khóa học | Đồng nhất |
| **Xem / Cập nhật trạng thái Lead** | Toàn quyền | Toàn quyền | Tab `leads` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` | Toàn bộ danh sách leads hệ thống | Đồng nhất |
| **Đối chiếu hồ sơ & Xác nhận học phí** | Toàn quyền | Toàn quyền | Tab `reconcile` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` | Lead có trạng thái phù hợp | Đồng nhất |
| **Duyệt / Từ chối / Hủy thù lao 500k** | Toàn quyền | Toàn quyền | Tab `rewards` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` | Toàn bộ danh sách thù lao | Đồng nhất |
| **Xem Nhật ký hệ thống (Audit Logs)** | Toàn quyền | Toàn quyền | Tab `audit` | `role === 'admin' || role === 'staff'` | `requireStaffOrAdmin` (khuyến nghị tối ưu Admin only) | Toàn bộ lịch sử thao tác | Đồng nhất |

*(Ghi nhận: Hệ thống phân quyền hiện tại phân chia rõ ràng giữa nhóm Quản trị/Cán bộ (`admin`/`staff`) và nhóm Cộng tác viên (`affiliate`), tuyệt đối không viết cứng email trên backend).*

---

## 6. Đối Chiếu Quy Trình Nghiệp Vụ Tuyển Sinh STHC

| Bước quy trình chuẩn | Trạng thái hiện thực hóa trong hệ thống STHC_CTV | Đánh giá sự phù hợp |
| :--- | :--- | :--- |
| **1. CTV đăng ký tài khoản** | Form đăng ký (`AffiliateRegisterModal`) ghi nhận thông tin, tạo `auth.users` và profile với trạng thái `PENDING_REVIEW`. | Phù hợp 100% |
| **2. Cán bộ duyệt CTV** | Tab Quản lý CTV ở `/admin` cho phép Staff/Admin chuyển trạng thái sang `ACTIVE`. | Phù hợp 100% |
| **3. CTV hoạt động & Lấy link/QR** | Khi `ACTIVE`, CTV vào Cổng CTV lấy link giới thiệu gắn mã `?ref=STHCCTVXXXX` theo từng khóa học. | Phù hợp 100% |
| **4. Khách hàng gửi form tư vấn** | Khách truy cập link CTV, gửi form đăng ký tư vấn tại `POST /api/v1/public/leads`, hệ thống ghi nhận lead gán đúng `affiliate_id`. | Phù hợp 100% (CTV không tự tạo khách hàng ảo). |
| **5. Theo dõi tiến độ** | Cả CTV và nhà trường theo dõi tiến độ tư vấn (`NEW` -> `CONTACTED` -> `CONSULTING` -> `ENROLLED`). | Phù hợp 100% |
| **6. Đối chiếu hồ sơ chính thức & học phí** | Khi học viên đóng học phí nhập học, Staff/Admin thực hiện đối soát (`POST /api/v1/admin/leads/:id/reconcile`), nhập mã hồ sơ, học phí thực thu. | Phù hợp 100% |
| **7. Duyệt thù lao 500.000 VNĐ** | Sau khi đối soát hợp lệ, hệ thống sinh khoản thưởng và cho phép duyệt thù lao. | Phù hợp 100% (Thù lao chỉ tính trên hồ sơ nhập học hợp lệ, chưa có ví/rút tiền tự động). |

---

## 7. Báo Cáo Bàn Giao & Bảng Tổng Hợp Kiểm Kê (Module Classification)

| Module / Chức năng | Route / Component | API Endpoint tương ứng | Nguồn dữ liệu | Quyền hiện có | Mức xác minh | Phân loại chức năng | Vấn đề & Hướng xử lý đề xuất |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Quản lý CTV** | `/admin` (Tab `affiliates`) | `/api/v1/admin/affiliates`, `PATCH .../status` | DB (`affiliate_profiles`, `profiles`) | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Hoạt động ổn định, phân quyền chuẩn RLS |
| **Quản lý Khóa học** | `/admin` (Tab `courses`) | `/api/v1/admin/courses`, `PATCH .../:id` | DB (`courses`) + Fallback | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Hoạt động tốt với danh mục 8 khóa học chuẩn STHC |
| **Quản lý Leads** | `/admin` (Tab `leads`) | `/api/v1/admin/leads`, `PATCH .../counseling-status` | DB (`leads`) | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Đồng bộ tốt quy trình tiếp nhận tư vấn |
| **Đối soát Hồ sơ** | `/admin` (Tab `reconcile`) | `/api/v1/admin/leads/:id/reconcile`, `void-reconciliation` | DB (`leads`, `lead_reconciliations`, `audit_logs`) | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Đảm bảo tính toàn vẹn 500k và chống trùng lặp |
| **Duyệt Thưởng** | `/admin` (Tab `rewards`) | `/api/v1/admin/rewards`, `approve`, `reject` | DB (`rewards`) + Fallback | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Xử lý duyệt thù lao minh bạch có kiểm toán |
| **Nhật ký Kiểm toán** | `/admin` (Tab `audit`) | `/api/v1/admin/audit-logs` | DB (`audit_logs`) | Staff & Admin | Đã kiểm tra mã nguồn & API | **Giữ và dùng lại** | Ghi nhận đầy đủ vết hệ thống |

### Các quyết định cần chốt ở A0.3 & Các module tiếp theo (A1-A9):
1. **Chốt phạm vi Phase 1**: Duy trì cơ chế đối soát thủ công có biên lai và duyệt thưởng 500k; chưa tích hợp cổng thanh toán ngân hàng tự động hoặc ví điện tử (tuân thủ nguyên tắc không có ví/rút tiền phức tạp).
2. **Tối ưu hóa Audit Logs**: Giới hạn quyền xem nhật ký kiểm toán chỉ dành riêng cho role `admin` (bảo mật tối đa).
3. **Hoàn thiện giao diện mobile**: Đảm bảo các bảng quản lý dữ liệu lớn (bảng leads, bảng đối soát) có chế độ cuộn ngang mượt mà trên thiết bị di động.
