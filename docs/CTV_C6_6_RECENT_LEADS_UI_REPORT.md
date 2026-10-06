# BÁO CÁO TRIỂN KHAI C6.6 — DANH SÁCH KHÁCH ĐĂNG KÝ GẦN ĐÂY TRÊN DASHBOARD CTV
## HỆ THỐNG CỔNG CÔNG TÁC VIÊN TUYỂN SINH

- **Mã tài liệu:** `CTV_C6_6_RECENT_LEADS_UI_REPORT`
- **Phiên bản:** `v1.0`
- **Ngày hoàn tất:** 06/10/2026
- **Trạng thái:** Hoàn tất triển khai Khối Khách đăng ký gần đây & Khắc phục chuẩn hóa ngày nhập học C6.5
- **Tác giả:** Kỹ sư Trưởng Hệ thống

---

## I. MỤC TIÊU VÀ PHẠM VI BƯỚC C6.6

### 1.1. Phạm vi hoàn thành
1. **Hoàn thiện khối "Khách đăng ký gần đây" tại `/portal` (`AffiliateDashboard.tsx`):**
   - Tiêu đề: **“Khách đăng ký gần đây”**
   - Mô tả: *“Tối đa 5 lượt đăng ký mới nhất qua nguồn giới thiệu của bạn.”*
   - Nút hành động: **“Xem tất cả”** điều hướng sang `/portal/leads`.
2. **Dữ liệu thời gian thực từ API Summary:**
   - Sử dụng trực tiếp `data.recent_leads` từ `GET /api/v1/affiliate/dashboard/summary`.
   - Backend lọc tối đa 5 bản ghi thuộc CTV đăng nhập, sắp xếp nghiêm ngặt theo `created_at DESC, id DESC`.
   - Số điện thoại được che 4 số cuối từ tầng Backend (`phone_masked`), không gửi số gốc về Client.
   - Định dạng ngày đăng ký chuẩn `DD/MM/YYYY` theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
3. **Các cột hiển thị chuẩn xác:**
   - **Họ và tên:** Tên khách hàng (fallback *"Chưa cập nhật"* nếu trống).
   - **Số điện thoại:** `phone_masked` (fallback *"Chưa cập nhật"*).
   - **Khóa học đăng ký:** Tên khóa học đầy đủ kèm tooltip.
   - **Ngày đăng ký:** `DD/MM/YYYY` (ví dụ `06/10/2026`).
   - **Tình trạng nhập học:** Badge hiển thị độc lập (`Đã nhập học`, `Chưa nhập học`, `Đã rút hồ sơ`).
   - **Đối chiếu hồ sơ:** Badge hiển thị độc lập (`Hợp lệ`, `Đã có tại trường`, `Không hợp lệ`, `Chưa đối chiếu`, `Đã hủy đối soát`).
   - **Thao tác:** Nút **“Xem chi tiết”** có icon `ArrowRight`, hỗ trợ bàn phím (`Enter`/`Space`) và điều hướng tới `/portal/leads/:id`.
4. **Không hiển thị thêm thông tin thừa:**
   - Tuyệt đối không hiển thị mã EGOV, thông tin tài chính hay ghi chú nội bộ trong khối này.
5. **Giao diện đa nền tảng (Responsive & Accessibility):**
   - Desktop: Bảng rõ ràng, hiệu ứng hover dòng nhẹ nhàng, viền bo tròn đồng bộ với các khối trên.
   - Mobile: Danh sách dạng Thẻ (Cards) cuộn trong khối, tránh tràn ngang trang web.
6. **Xử lý trạng thái rỗng và tài khoản:**
   - Khi `recent_leads.length === 0`: Hiển thị thông báo *"Bạn chưa có lượt đăng ký nào."*
   - CTV `ACTIVE`: Hiển thị nút *"Xem danh sách khóa học"* để lấy link/mã QR tuyển sinh.
   - CTV `SUSPENDED`: Hiển thị hướng dẫn xem lịch sử phù hợp.
   - Đổi tài khoản/đăng xuất: Dữ liệu cũ được làm sạch hoàn toàn.

---

## II. KHẮC PHỤC SAI LỆCH NGÀY NHẬP HỌC (CHUẨN HÓA C6.5)

Theo yêu cầu kiểm định, hệ thống đã loại bỏ hoàn toàn fallback dùng ngày cập nhật chung `lead.updated_at || lead.created_at` khi xác định mốc tháng nhập học trong biểu đồ xu hướng 12 tháng:

1. **Nguyên tắc xác định ngày nhập học chính thức:**
   - Chỉ ghi nhận vào biểu đồ tháng nếu có bản ghi đối chiếu hợp lệ `lead_reconciliations` (`admission_status = 'ENROLLED'` và `reconciliation_status` thuộc `'MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM'`) chứa trường `reconciled_at`.
   - Lấy `reconciled_at` của bản ghi đối chiếu hợp lệ mới nhất khi có nhiều lần đối chiếu (tránh ngày sửa ghi chú làm dịch chuyển tháng).
2. **Xử lý hồ sơ nhập học thiếu mốc ngày chính thức:**
   - Hồ sơ vẫn được tính đầy đủ 100% trong Card kết quả (`metrics.enrolled_leads`) và biểu đồ phân bố khóa học (`course_breakdown[].enrolled_leads`).
   - Không tự ý gán vào một tháng bất kỳ trong chuỗi 12 tháng.
   - Bổ sung chỉ số `enrolled_missing_date_count` trong metadata phản hồi từ Backend.
   - `MonthlyTrendChart.tsx` hiển thị thông báo chú thích nghiệp vụ rõ ràng khi phát hiện `enrolled_missing_date_count > 0`: *"Lưu ý: Có X lượt nhập học chưa có ngày xác nhận đối chiếu chính thức nên chưa phân bổ vào tháng cụ thể (vẫn được tính đủ vào tổng kết quả và khóa học)."*

---

## III. DANH SÁCH FILE & BẢNG ÁNH XẠ DỮ LIỆU

### 3.1. Các file đã cập nhật

| STT | File / Đường dẫn | Nội dung thay đổi |
|---|---|---|
| 1 | `server.ts` | Sắp xếp `order('created_at', { ascending: false }).order('id', { ascending: false })`; loại bỏ fallback ngày nhập học; bổ sung `enrolled_missing_date_count` |
| 2 | `src/types/index.ts` | Cập nhật kiểu `AffiliateDashboardSummaryData.metadata.enrolled_missing_date_count` |
| 3 | `src/components/affiliate/AffiliateDashboard.tsx` | Hoàn thiện khối "Khách đăng ký gần đây" giao diện Bảng Desktop + Thẻ Mobile, render badge độc lập |
| 4 | `src/components/affiliate/MonthlyTrendChart.tsx` | Bổ sung cảnh báo chú thích khi có hồ sơ nhập học thiếu ngày đối chiếu |
| 5 | `scripts/verify_c6_6_recent_leads.ts` | Kịch bản kiểm thử tự động nghiệm thu C6.6 |

### 3.2. Bảng ánh xạ trạng thái (Mapping Rules)

| Trạng thái | Giá trị Enum CSDL | Nhãn hiển thị | Màu sắc Badge |
|---|---|---|---|
| **Tình trạng nhập học** | `ENROLLED` | **Đã nhập học** | Xanh ngọc (`bg-emerald-50 text-emerald-800 border-emerald-200`) |
| | `NOT_ENROLLED` / null | **Chưa nhập học** | Xám trung tính (`bg-slate-100 text-slate-700 border-slate-200`) |
| | `WITHDRAWN` | **Đã rút hồ sơ** | Đỏ nhạt (`bg-rose-50 text-rose-800 border-rose-200`) |
| **Đối chiếu hồ sơ** | `MATCHED_VALID` | **Hợp lệ** | Xanh ngọc (`bg-emerald-50 text-emerald-800 border-emerald-200`) |
| | `EXISTING_IN_SCHOOL_SYSTEM` | **Đã có tại trường** | Tím lam (`bg-purple-50 text-purple-800 border-purple-200`) |
| | `MISMATCH_INVALID` | **Không hợp lệ** | Đỏ nhạt (`bg-rose-50 text-rose-800 border-rose-200`) |
| | `VOIDED` | **Đã hủy đối soát** | Xám viền (`bg-slate-100 text-slate-600 border-slate-200`) |
| | `NOT_RECONCILED` / null | **Chưa đối chiếu** | Vàng hổ phách (`bg-amber-50 text-amber-800 border-amber-200`) |

---

## IV. KIỂM TRA PHÂN QUYỀN VÀ BẢO MẬT

1. **Phân quyền xem chi tiết:**
   - Route `/portal/leads/:id` được bảo vệ bởi middleware `requireActiveAffiliate` (hoặc `requireAffiliateDashboardAccess`).
   - Endpoint chi tiết `GET /api/v1/affiliate/leads/:id` kiểm tra nghiêm ngặt quyền sở hữu: CTV chỉ xem được khách hàng do chính mình giới thiệu. Thao tác đổi ID trên URL dẫn đến lỗi 403/404 với thông báo an toàn, không rò rỉ dữ liệu của CTV khác.
2. **Ẩn dữ liệu nhạy cảm:**
   - Số điện thoại được che tại Server (`maskPhone`), ngăn chặn việc inspect mã nguồn Client để lấy số thật.
   - Không chứa thông tin EGOV, học phí, số biên lai hay ghi chú duyệt của Phòng Tuyển sinh trong khối tóm tắt.

---

## V. KẾT QUẢ KIỂM TRA NGHIỆM THU

| Ca kiểm thử | Nội dung kiểm tra | Kết quả | Ghi chú |
|---|---|---|---|
| **TC-C6.6-01** | Trả về tối đa 5 bản ghi mới nhất | **PASS** | `leadsList.slice(0, 5)` sắp xếp theo `created_at DESC, id DESC`. |
| **TC-C6.6-02** | Che 4 số cuối điện thoại ở Backend | **PASS** | Định dạng `090****` chuẩn xác. |
| **TC-C6.6-03** | Định dạng ngày theo giờ Việt Nam | **PASS** | `DD/MM/YYYY` (Asia/Ho_Chi_Minh). |
| **TC-C6.6-04** | Tính độc lập 2 trạng thái Nhập học & Đối chiếu | **PASS** | Không tự suy luận `MATCHED_VALID` -> `ENROLLED`. |
| **TC-C6.6-05** | Khắc phục sai lệch ngày nhập học C6.5 | **PASS** | Không gán bừa bằng updated_at; tính đủ `enrolled_missing_date_count`. |
| **TC-C6.6-06** | Nút "Xem chi tiết" và điều hướng bàn phím | **PASS** | Mở đúng `/portal/leads/:id`, hỗ trợ `Tab`/`Enter`. |
| **TC-C6.6-07** | Trạng thái rỗng & CTV SUSPENDED | **PASS** | Thông điệp rõ ràng, không hiển thị bảng trống vô nghĩa. |
| **TC-C6.6-08** | Giao diện Mobile Cards & Desktop Table | **PASS** | Responsive mượt mà, không tràn ngang. |
| **TC-C6.6-09** | Chất lượng mã nguồn (`lint` & `build`) | **PASS** | `tsc --noEmit` và `vite build` 0 lỗi. |

---
*Hoàn tất bước C6.6. Dừng lại theo đúng yêu cầu, chưa triển khai Top 5 CTV hay bước tiếp theo.*
