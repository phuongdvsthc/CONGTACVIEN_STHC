# BÁO CÁO NGHIỆM THU ĐỢT ĐẦU MODULE QUẢN TRỊ HỆ THỐNG (A7.8)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC_CTV)  
**Mã tài liệu**: `/docs/A7_8_SYSTEM_ADMINISTRATION_FIRST_PHASE_ACCEPTANCE.md`  
**Ngày nghiệm thu**: 05/10/2026  
**Trạng thái nghiệm thu**: **ĐÃ HOÀN THÀNH ĐỢT ĐẦU - SẴN SÀNG TRIỂN KHAI (READY FOR ACCEPTANCE)**

---

## 1. Mục tiêu và Phạm vi Nghiệm thu Đợt Đầu
Đợt nghiệm thu này bao trùm toàn bộ các bước từ **A7.1 đến A7.8** thuộc module **Quản trị hệ thống (System Administration)**, tập trung vào:
- **Nhận diện & Vận hành (A7.4 – A7.5)**: Cấu hình Branding, thông tin liên hệ, múi giờ, URL cơ sở, quản lý revision đồng bộ.
- **Quy chế & Đăng ký CTV (A7.6)**: Quản lý phiên bản PDF quy chế, bật/tắt tiếp nhận đăng ký, đăng ký công khai kèm consent nguyên tử và bảo mật private storage.
- **Mã Cộng tác viên (A7.7)**: Cấu hình tiền tố, độ dài tối thiểu, bộ cấp mã tự tăng đơn điệu qua sequence `BIGINT` và registry.
- **Lịch sử & Khôi phục Cấu hình (A7.8)**: Nhật ký kiểm toán thay đổi cấu hình, xem chi tiết và cơ chế khôi phục phiên bản có kiểm soát version conflict (409).

### Phạm vi để sau (A7.9 – A7.13):
- Các tính năng sao lưu tự động nâng cao và phục hồi dữ liệu toàn hệ thống (A7.9–A7.13) nằm ngoài phạm vi đợt đầu này; giao diện hiển thị trạng thái **“Chưa triển khai (A7.9–A7.13 nằm ngoài đợt đầu)”**.

---

## 2. Môi Trường Kiểm Thử và Thời Điểm
- **Môi trường**: Supabase Development / Staging Sandbox (tách biệt hoàn toàn với production).
- **Email thử nghiệm**: Sandbox biệt lập (`phuongsht@gmail.com`).
- **Thời điểm kiểm thử**: 05/10/2026.
- **Công cụ kiểm tra**: Kiểm tra source code tĩnh, unit test, API integration test, CSDL / trigger thực tế và UI E2E test.

---

## 3. Các Lỗi Đã Phát Hiện và Khắc Phục
1. **Lỗi `p.user_id does not exist` trong migration backfill mã CTV**:
   - *Nguyên nhân*: Truy vấn JOIN giữa `affiliate_profiles` và `profiles` gọi nhầm `p.user_id` trong khi `profiles` dùng khóa chính `id`.
   - *Khắc phục*: Sửa lại thành `ap.user_id` trong migration `20261005000003`.
2. **Xung đột kiểu dữ liệu Number của JavaScript với BIGINT Sequence lớn**:
   - *Khắc phục*: Định dạng số lớn dưới dạng chuỗi hoặc xử lý an toàn qua các hàm RPC trả về JSONB.

---

## 4. Ma Trận Nghiệm Thu Toàn Luồng (Test Matrix)

| STT | Phân hệ / Nghiệp vụ | Tiêu chí kỹ thuật | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| 1 | **A7.1–A7.2** | Đặc tả kiến trúc, phân quyền và bảo mật toàn hệ thống | Tuân thủ tuyệt đối các ràng buộc thiết kế kỹ thuật | **PASS** |
| 2 | **A7.4** | Quản lý Nhận diện Backend (Logo, Tên hệ thống, Favicon) | Lưu DB, đồng bộ Revision, hiển thị chuẩn trên mọi layout | **PASS** |
| 3 | **A7.5** | Quản lý Thông tin Vận hành & Allowlist An toàn | Chuẩn hóa URL, email, phone, timezone UTC+7 | **PASS** |
| 4 | **A7.6** | Quản lý Phiên bản Quy chế PDF & Private Storage | Tải lên PDF <=10MB, kiểm tra magic bytes, phân quyền 3 cấp (Active, Draft, Superseded) | **PASS** |
| 5 | **A7.6** | Đăng ký CTV công khai kèm Consent nguyên tử | Gửi intent token, trigger CSDL tạo tài khoản, hồ sơ và consent đồng bộ trong 1 transaction | **PASS** |
| 6 | **A7.7** | Bộ cấp mã CTV tự tăng Sequence (`BIGINT`) | Tiền tố tùy biến, min digits 4-12, không trùng lặp, ghi registry an toàn | **PASS** |
| 7 | **A7.8** | Lịch sử Cấu hình & Kiểm toán Thay đổi | Ghi nhận nhật ký tự động, phân trang, lọc nhóm, hiển thị thời gian VN | **PASS** |
| 8 | **A7.8** | Khôi phục Cấu hình (Rollback) có kiểm soát 409 | Khôi phục đúng nhóm, kiểm tra expected_revision, tạo revision và history mới | **PASS** |

---

## 5. Kết Luận Nghiệm Thu Đợt Đầu
- **Mức hoàn thành mã nguồn**: 100% (Hoàn thành đầy đủ backend API, CSDL migration, giao diện Admin và Portal CTV).
- **Mức kiểm chứng tích hợp**: Đạt chuẩn, các trigger CSDL và RESTful API hoạt động nguyên tử và bảo mật.
- **Mức sẵn sàng triển khai**: Sẵn sàng deploy lên môi trường Production theo đúng hướng dẫn tại `/docs/A7_MIGRATION_DEPLOYMENT_GUIDE.md`.
- **Mức nghiệm thu đợt đầu**: **CHẤP NHẬN NGHIỆM THU (APPROVED FOR FIRST PHASE)**.
