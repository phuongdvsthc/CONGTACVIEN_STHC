# BÁO CÁO HOÀN THÀNH TRIỂN KHAI A3.4 — DANH SÁCH, TÌM KIẾM, BỘ LỌC VÀ PHÂN TRANG CHO MODULE “KHÁCH HÀNG ĐƯỢC GIỚI THIỆU”
**Hệ thống Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch và Khách sạn Saigontourist (STHC)**

---

## 1. MỤC TIÊU VÀ PHẠM VI (A3.4)
Hoàn thiện giao diện và cơ chế xử lý phía Backend + Frontend cho module **“Khách hàng được giới thiệu”** tại hai phân hệ:
1. **Phân hệ CTV (`/portal/leads`)**: Quản lý khách hàng do chính CTV giới thiệu qua link/QR, hỗ trợ tìm kiếm, bộ lọc theo khóa học, trạng thái tư vấn, trạng thái đối soát, khoảng thời gian và phân trang phía máy chủ.
2. **Phân hệ Admin / Cán bộ tuyển sinh (`/admin/leads` hoặc Tab Leads)**: Xem toàn bộ khách hàng được giới thiệu của tất cả CTV (hoặc lọc theo CTV cụ thể), hiển thị đầy đủ số điện thoại gốc, tìm kiếm, lọc đa tiêu chí và phân trang phía máy chủ.

---

## 2. TRIỂN KHAI KỸ THUẬT VÀ HỢP ĐỒNG API

### 2.1. API Đọc Dữ Liệu (`GET /api/v1/admin/leads` & `GET /api/v1/affiliate/leads`)
Cả hai endpoint Backend đều hỗ trợ các tham số truy vấn (query parameters) chuẩn:
- `search`: Tìm kiếm mờ theo họ tên, số điện thoại hoặc mã hồ sơ.
- `course_id`: Lọc theo khóa học cụ thể.
- `status`: Lọc theo trạng thái tư vấn (`NEW`, `CONTACTED`, `CONSULTING`, `UNREACHABLE`, `LOST`).
- `admission_status`: Lọc theo tình trạng nhập học / đối soát (`MATCHED_VALID` hoặc `NOT_RECONCILED`).
- `affiliate_id` (Chỉ Admin/Staff): Lọc theo đại sứ / cộng tác viên tuyển sinh cụ thể.
- `from_date`, `to_date`: Lọc khoảng thời gian đăng ký.
- `page`, `limit`: Phân trang (`limit` hỗ trợ 20, 50, 100).

Cấu trúc trả về chuẩn:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### 2.2. Giao Diện Người Dùng (Frontend)
- **AffiliateLeadsView (`/portal/leads`)**: Thanh công cụ tìm kiếm debounce 400ms, bộ lọc trạng thái tư vấn, lọc đối soát, lọc theo ngày tháng, bảng danh sách khách hàng (với số điện thoại che 4 số cuối theo quy định bảo mật) và phân trang trực quan.
- **AdminPortal Tab Leads (`/admin/leads`)**: Thanh công cụ đầy đủ (tìm kiếm, lọc khóa học, lọc trạng thái tư vấn, lọc đối soát, lọc theo CTV cụ thể, lọc khoảng thời gian từ ngày đến ngày), hiển thị số điện thoại gốc, thao tác cập nhật tiến độ tư vấn ngay trên bảng, nút xem lịch sử chăm sóc và phân trang đầy đủ.

---

## 3. KIỂM THỬ VÀ NGHIỆM THU
- Đã kiểm tra biên dịch (`compile_applet`) thành công 100%.
- Đã kiểm tra kiểm tra tĩnh (`lint_applet`) với TypeScript, không có lỗi kiểu dữ liệu hoặc lỗi cú pháp.
- Đảm bảo tuân thủ tuyệt đối quy tắc phân quyền Backend, không fetch toàn bộ dữ liệu về trình duyệt để lọc hay phân trang.
