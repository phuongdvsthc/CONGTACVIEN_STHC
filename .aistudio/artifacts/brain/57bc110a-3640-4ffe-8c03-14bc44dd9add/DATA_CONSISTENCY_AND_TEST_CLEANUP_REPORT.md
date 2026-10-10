# Báo cáo Kiểm tra Đồng nhất Dữ liệu & Phương án Dọn dữ liệu Test (STHC_CTV)

## 1. Tổng quan vấn đề & Kết quả kiểm tra tính đồng nhất
Theo phản hồi thực tế từ hệ thống và người dùng, đã có sự không đồng nhất giữa các màn hình:
- `/portal/leads` (Danh sách lead của CTV)
- `/portal/leads/:id` (Chi tiết lead cụ thể, ví dụ `3f8f2715-0477-42a1-a475-86cdb91bef01`)
- `/portal/rewards` (Thù lao CTV)
- Dashboard CTV (Tổng hợp thống kê)

### Nguyên nhân cốt lõi phát hiện qua truy vết Backend:
1. **Endpoint Thù lao CTV (`/api/v1/affiliate/rewards`)**:
   - Trước đây không join với bảng `leads`, `courses`, `lead_reconciliations`, và `lead_egov_links`. Do đó, dữ liệu trả về thiếu hoàn toàn tên học viên (`candidate_name`), khóa học (`course_title`), và mã EGOV (`external_admission_code`), dẫn đến giao diện hiển thị các dòng thù lao bị trống thông tin học viên.
   - Endpoint này chứa sẵn mảng mock seed cứng (`Nguyễn Hoàng Khang`, `Trần Mỹ Linh`, mã `STHC-2026-TS-0188/0215`) không tồn tại trong danh sách leads thực tế của CTV, gây nhầm lẫn dữ liệu.
   - Endpoint không xử lý các tham số bộ lọc (`status`, `search`, `course_id`, `from_date`, `to_date`, `page`, `limit`) được gửi từ giao diện `AffiliateRewardsView.tsx`.

2. **Giải pháp đã thực hiện**:
   - Viết lại hoàn toàn `/api/v1/affiliate/rewards` trong `server.ts` để truy vấn trực tiếp bảng `rewards` có join đầy đủ sang `leads`, `courses`, `lead_reconciliations`, và `lead_egov_links`.
   - Loại bỏ hoàn toàn mảng mock cứng (`Nguyễn Hoàng Khang`, `Trần Mỹ Linh`), lấy 100% dữ liệu thực từ cơ sở dữ liệu làm nguồn chân lý duy nhất (Single Source of Truth).
   - Hỗ trợ đầy đủ bộ lọc tìm kiếm (`search`), trạng thái (`ACTIVE`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `VOIDED`, `ALL`), khóa học (`course_id`), khoảng thời gian, và phân trang.
   - Đồng bộ hoàn toàn cách hiển thị tên học viên, tên khóa học, mã EGOV giữa trang Leads, trang Chi tiết Lead, trang Thù lao CTV và Dashboard CTV.

---

## 2. Kiểm kê Dữ liệu Test & Phương án Dọn dẹp (Test Data Cleanup Plan)

Khi triển khai trên môi trường thật (Production) hoặc khi cần làm sạch dữ liệu kiểm thử (test data) sinh ra trong quá trình chạy thử nghiệm, Quản trị viên có thể sử dụng phương án dọn dẹp dưới đây qua **Supabase SQL Editor**.

### A. Kiểm kê Dữ liệu Test cần rà soát
1. **Khách hàng test (Leads)**:
   - Các bản ghi có tên chứa từ khóa `"Test"`, `"Demo"`, `"Khách test"`, hoặc email có đuôi `@test.com`, `@sthc-test.vn`.
2. **Hồ sơ đối soát test (Lead Reconciliations / EGOV Links)**:
   - Các mã EGOV test có dạng `STHC-2026-TS-TEST-...` hoặc liên kết trỏ đến học viên test.
3. **Khoản thù lao test (Rewards)**:
   - Các khoản thù lao gắn với lead test hoặc có trạng thái `VOIDED` / `REJECTED` cũ không còn giá trị tính toán.

### B. Script SQL Dọn dẹp Dữ liệu Test (Chạy qua Supabase SQL Editor)
*Lưu ý: Chỉ chạy script này khi đã xác nhận danh sách bản ghi cần xóa. Luôn backup cơ sở dữ liệu trước khi thực hiện thao tác DML trên production.*

```sql
-- 1. Xóa các khoản thưởng (rewards) gắn với các lead test (có tên chứa 'Test' hoặc 'Demo')
DELETE FROM rewards
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE full_name ILIKE '%test%' 
     OR full_name ILIKE '%demo%'
     OR email ILIKE '%@test.com'
);

-- 2. Xóa các liên kết EGOV của lead test
DELETE FROM lead_egov_links
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE full_name ILIKE '%test%' 
     OR full_name ILIKE '%demo%'
     OR email ILIKE '%@test.com'
);

-- 3. Xóa lịch sử đối soát (lead_reconciliations) của lead test
DELETE FROM lead_reconciliations
WHERE lead_id IN (
  SELECT id FROM leads 
  WHERE full_name ILIKE '%test%' 
     OR full_name ILIKE '%demo%'
     OR email ILIKE '%@test.com'
);

-- 4. Xóa audit logs liên quan đến lead test
DELETE FROM audit_logs
WHERE entity_name = 'leads' AND entity_id IN (
  SELECT id FROM leads 
  WHERE full_name ILIKE '%test%' 
     OR full_name ILIKE '%demo%'
     OR email ILIKE '%@test.com'
);

-- 5. Xóa chính thức các bản ghi lead test
DELETE FROM leads
WHERE full_name ILIKE '%test%' 
   OR full_name ILIKE '%demo%'
   OR email ILIKE '%@test.com';

-- 6. Dọn dẹp các khoản thù lao (rewards) bị mồ côi (không còn lead_id tồn tại)
DELETE FROM rewards
WHERE lead_id IS NOT NULL 
  AND lead_id NOT IN (SELECT id FROM leads);
```

### C. Khuyến nghị Vận hành
- **Không tự động chạy migration xóa dữ liệu trên production** nếu chưa có sự đồng ý của Quản trị viên hệ thống.
- Sau khi chạy script dọn dẹp, hệ thống cache ở frontend (React Query / state local) sẽ tự động đồng bộ lại khi người dùng tải lại trang `/portal/leads`, `/portal/rewards`, và Dashboard.
