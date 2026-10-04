# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.3 — API ĐỌC VÀ PHÂN QUYỀN DỮ LIỆU MODULE "KHÁCH HÀNG ĐƯỢC GIỚI THIỆU"
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. TỔNG QUAN TRIỂN KHAI A3.3
Bước A3.3 hoàn thiện hệ thống API đọc (danh sách và chi tiết) và cơ chế kiểm soát phân quyền dữ liệu cho module **“Khách hàng được giới thiệu”**. Mọi quyền truy cập được thực thi chặt chẽ tại tầng Backend dựa trên định danh phiên làm việc đã xác thực (`Bearer token` hoặc phiên demo hợp lệ), ngăn chặn tuyệt đối việc client mạo danh hoặc cố tình thao túng tham số `affiliate_id`.

---

## 2. DANH SÁCH API VÀ CÁC THAM SỐ

1. **`GET /api/v1/admin/leads`**
   - **Quyền yêu cầu**: Admin hoặc Cán bộ tuyển sinh (`requireStaffOrAdmin`).
   - **Tham số (Query Params)**: `search`, `course_id`, `status`, `admission_status`, `page`, `limit`.
   - **Đặc quyền**: Đọc toàn bộ danh sách khách hàng của tất cả CTV, hiển thị số điện thoại đầy đủ, thông tin đối soát và mã hồ sơ EGOV.

2. **`GET /api/v1/admin/leads/:id`**
   - **Quyền yêu cầu**: Admin hoặc Cán bộ tuyển sinh (`requireStaffOrAdmin`).
   - **Tham số (Path Params)**: `id` (UUID của lead).
   - **Đặc quyền**: Xem toàn bộ chi tiết lead, lịch sử đối soát (`lead_reconciliations`) và lịch sử thưởng (`rewards`).

3. **`GET /api/v1/affiliate/leads`**
   - **Quyền yêu cầu**: Cộng tác viên hoạt động (`requireActiveAffiliate`).
   - **Tham số**: Không nhận `affiliate_id` từ client; backend tự trích xuất `affiliate_id` từ phiên đăng nhập.
   - **Đặc quyền**: Chỉ trả về các leads có `affiliate_id` khớp chính xác với tài khoản CTV đang đăng nhập. Số điện thoại được che 4 số cuối (`090812****`), ẩn toàn bộ ghi chú nội bộ (`counselor_note`, `staff_note`, v.v.).

4. **`GET /api/v1/affiliate/leads/:id`**
   - **Quyền yêu cầu**: Cộng tác viên hoạt động (`requireActiveAffiliate`).
   - **Tham số**: `id` (UUID của lead).
   - **Đặc quyền**: Xem chi tiết lead thuộc sở hữu của CTV. Nếu CTV cố ý gọi ID của lead thuộc CTV khác hoặc không tồn tại, API trả về mã **`404 Not Found`** thay vì `403` để tránh tiết lộ sự tồn tại của dữ liệu.

---

## 3. MA TRẬN QUYỀN TRUY CẬP (ROLE ACCESS MATRIX)

| Vai trò / Trạng thái | Xem Danh Sách Leads | Xem Chi Tiết Lead | Đọc SĐT | Đọc Mã EGOV & Nhập Học | Đọc Ghi Chú Nội Bộ |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Public / Chưa đăng nhập** | 401 | 401 | Không | Không | Không |
| **CTV Chờ duyệt (`PENDING_REVIEW`)** | 403 | 403 | Không | Không | Không |
| **CTV Hoạt động (`ACTIVE`)** | Chỉ khách của mình | Chỉ khách của mình | Che 4 số cuối | Được phép | Không |
| **Cán bộ Tuyển sinh (`Staff`)** | Toàn bộ | Toàn bộ | Đầy đủ | Được phép | Được phép |
| **Quản trị viên (`Admin`)** | Toàn bộ | Toàn bộ | Đầy đủ | Được phép | Được phép |

---

## 4. XÁC ĐỊNH PHẠM VI DỮ LIỆU VÀ KẾT QUẢ ĐỐI SOÁT CÓ HIỆU LỰC

- **Xác định `affiliate_id`**: Backend gọi hàm `resolveAffiliateSession(req)` để trích xuất `user_id` từ Token/Session, sau đó tra cứu bảng `affiliate_profiles` để lấy `id` chính xác. Mọi câu lệnh SQL truy vấn đều áp dụng điều kiện `.eq('affiliate_id', affiliateId)`.
- **Suy ra Mã EGOV & Tình trạng nhập học**:
  - Hệ thống join với bảng `lead_reconciliations`.
  - Chỉ khi có bản đối chiếu với `reconciliation_status === 'MATCHED_VALID'`, hệ thống mới trích xuất `external_admission_code` (giữ nguyên số 0 ở đầu) và xác định tình trạng nhập học là **“Đã nhập học”**.
  - Nếu không có bản đối chiếu hợp lệ, mã EGOV trả về `null` (hiển thị *Chưa cập nhật*) và tình trạng nhập học là **“Chưa nhập học”**.

---

## 5. VÍ DỤ RESPONSE ĐÃ CHUẨN HÓA

### Response cho Cộng tác viên (CTV A):
```json
{
  "success": true,
  "data": [
    {
      "id": "lead-uuid-001",
      "full_name": "Nguyễn Văn Khang",
      "phone_masked": "090918****",
      "email": "khang.nguyen@gmail.com",
      "province": "TP. Hồ Chí Minh",
      "course_title": "Kỹ thuật Chế biến Món ăn Á - Âu",
      "counseling_status": "CONSULTING",
      "reconciliation_status": "MATCHED_VALID",
      "external_admission_code": "07920261234",
      "created_at": "2026-09-28T10:00:00Z"
    }
  ]
}
```
*(Lưu ý: Không có số điện thoại đầy đủ, không có counselor_note, không có thông tin thu học phí nội bộ).*

---

## 6. KẾT QUẢ KIỂM THỬ VÀ XÂY DỰNG
- **Build / Compile**: Thành công (`npm run build` không lỗi).
- **TypeScript Linter**: `tsc --noEmit` hoàn thành không có lỗi biên dịch.
- **Kiểm thử phân quyền**:
  - Gọi API không có token → Trả về `401`.
  - CTV A gọi chi tiết lead của CTV B → Trả về `404` (chống lộ thông tin).
  - CTV gọi endpoint Admin → Trả về `403`.

---
*Báo cáo A3.3 hoàn tất. Dừng lại sau bước A3.3 theo đúng yêu cầu.*
