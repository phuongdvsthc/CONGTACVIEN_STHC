# BÁO CÁO FIX C6 – ĐỒNG BỘ TÌNH TRẠNG NHẬP HỌC TRÊN TỔNG QUAN CTV

- **Mã lỗi**: FIX-C6-ADMISSION-STATUS-SYNC
- **Mục tiêu**: Đồng bộ toàn diện tình trạng nhập học (`admission_status`) giữa phân hệ Quản trị Tuyển sinh (`/admin/reconcile`), Hồ sơ Lead (`/admin/leads`) và Cổng Cộng tác viên (`/portal`, `/portal/leads`).
- **Thời gian thực hiện**: 07/10/2026 (Múi giờ Asia/Ho_Chi_Minh)
- **Đối tượng kiểm thử thực tế**:
  - CTV: **Đào Văn Phương** (Mã `STHCCTV3042`, ID: `79274b39-8476-4241-bdde-e4f61e79a615`)
  - Lead: **Lê Văn Test** (ID: `3f8f2715-0477-42a1-a475-86cdb91bef01`)

---

## 1. NGUYÊN NHÂN GỐC (ROOT CAUSE ANALYSIS)

Dựa trên dữ liệu thực tế tại CSDL và truy vết mã nguồn:

1. **Lệch luồng ghi tại API Đối soát Tuyển sinh A4 (`POST /api/v1/admin/leads/:id/reconcile`)**:
   - Khi Cán bộ Tuyển sinh thực hiện đối soát thành công (`MATCHED_VALID`), hệ thống đã chèn bản ghi vào bảng `lead_reconciliations` (`admission_status: 'ENROLLED'`), nhưng câu lệnh `update` bảng `leads` chỉ cập nhật `{ reconciliation_status, reward_status, course_id, updated_at }` mà **bỏ sót trường `admission_status`**.
   - Kết quả: `leads.admission_status` trong CSDL vẫn giữ nguyên giá trị ban đầu là `NOT_ENROLLED`.

2. **Lệch luồng ghi tại API Hủy đối soát A4 (`POST /api/v1/admin/leads/:id/void-reconciliation`)**:
   - Khi hủy đối soát, hệ thống cập nhật `reconciliation_status = 'NOT_RECONCILED'`, nhưng không hoàn nguyên `admission_status = 'NOT_ENROLLED'`.

3. **Bất đồng bộ nguồn đọc dữ liệu giữa Admin và CTV Dashboard**:
   - Tại `/admin/reconcile` và `/admin/leads`, giao diện Admin tính toán động: Nếu có bản ghi đối soát hợp lệ (`MATCHED_VALID`), Admin ưu tiên hiển thị `"Đã nhập học"`.
   - Tại `/portal` (`getAffiliateDashboardSummaryData`), Dashboard CTV lại chỉ đọc trực tiếp `lead.admission_status` từ bảng `leads` mà không áp dụng hàm phân giải nguồn trạng thái có thẩm quyền từ bản ghi đối soát đang có hiệu lực.
   - Khi `leads.admission_status` bị sót không cập nhật ở bước (1), Dashboard CTV nhận giá trị `NOT_ENROLLED` và dẫn đến:
     - Card **Đã nhập học**: `0`
     - Card **Chưa nhập học**: `1`
     - Bảng **Khách đăng ký gần đây**: Lê Văn Test hiển thị `Chưa nhập học`
     - Biểu đồ **Đăng ký và nhập học (12 tháng)**: `enrolled_count = 0`
     - Bảng **Kết quả theo khóa học**: `enrolled_leads = 0` (Khóa Bánh Âu)

---

## 2. NGUỒN TRẠNG THÁI DÙNG CHUNG CÓ THẨM QUYỀN (AUTHORITATIVE STATE)

Thống nhất hàm chuẩn hóa `resolveAuthoritativeAdmissionStatus(lead)` trên toàn bộ Backend:

```typescript
function resolveAuthoritativeAdmissionStatus(lead: {
  admission_status?: string | null;
  reconciliation_status?: string | null;
  lead_reconciliations?: any[] | any;
}): 'ENROLLED' | 'NOT_ENROLLED' | 'WITHDRAWN' {
  // 1. Rút hồ sơ có độ ưu tiên cao nhất
  if (lead.admission_status === 'WITHDRAWN') {
    return 'WITHDRAWN';
  }

  // 2. Trích xuất đối soát đang có hiệu lực gần nhất (loại bỏ VOIDED)
  const activeRecon = getActiveReconciliation(lead.lead_reconciliations);

  if (activeRecon) {
    if (['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM'].includes(activeRecon.reconciliation_status)) {
      return activeRecon.admission_status === 'NOT_ENROLLED' ? 'NOT_ENROLLED' : 'ENROLLED';
    }
    return 'NOT_ENROLLED';
  }

  // 3. Nếu không có đối soát đang có hiệu lực (hoặc toàn bộ đã VOIDED) -> Chưa nhập học
  if (['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM'].includes(lead.reconciliation_status || '')) {
    return lead.admission_status === 'NOT_ENROLLED' ? 'NOT_ENROLLED' : 'ENROLLED';
  }

  return lead.admission_status === 'ENROLLED' ? 'ENROLLED' : 'NOT_ENROLLED';
}
```

### Nguyên tắc nghiệp vụ đã bảo toàn:
- **ENROLLED**: Chỉ được công nhận khi có sự kiện đối soát hợp lệ qua A4 (`MATCHED_VALID` hoặc `EXISTING_IN_SCHOOL_SYSTEM`).
- **Có mã EGOV**: Chỉ liên kết mã hồ sơ chưa làm thay đổi tình trạng nhập học.
- **Thưởng CTV**: Phê duyệt hoặc từ chối thưởng không can thiệp vào tình trạng nhập học.
- **Bản ghi VOIDED**: Hoàn toàn bị loại trừ khỏi trạng thái hiện hành, không bị đếm trùng hay ghi nhận sai.

---

## 3. CÁC TỆP VÀ TRUY VẤN ĐÃ ĐƯỢC CHỈNH SỬA

| STT | Tệp | Vị trí / Hàm | Nội dung sửa |
|:---|:---|:---|:---|
| 1 | `server.ts` | `resolveAuthoritativeAdmissionStatus` | Bổ sung hàm phân giải tình trạng nhập học có thẩm quyền dùng chung. |
| 2 | `server.ts` | `getAffiliateDashboardSummaryData` | Chuẩn hóa toàn bộ tính toán Metrics (4 Cards), Biểu đồ 12 tháng (`reconciled_at` theo giờ VN), Phân bố khóa học và Khách đăng ký gần đây. |
| 3 | `server.ts` | `GET /api/v1/affiliate/leads` | Bổ sung `admission_status` vào quan hệ `lead_reconciliations` và áp dụng hàm phân giải chuẩn hóa. |
| 4 | `server.ts` | `GET /api/v1/affiliate/leads/:id` | Áp dụng `resolveAuthoritativeAdmissionStatus` cho chi tiết lead CTV. |
| 5 | `server.ts` | `GET /api/v1/admin/leads` & `/:id` | Đồng bộ nguồn trạng thái phân giải với Dashboard CTV. |
| 6 | `server.ts` | `POST /api/v1/admin/leads/:id/reconcile` | Bổ sung ghi `admission_status: cleanAdmissionStatus` vào bảng `leads` và `lead_reconciliations`. |
| 7 | `server.ts` | `POST /api/v1/admin/leads/:id/void-reconciliation` | Bổ sung hoàn nguyên `admission_status: 'NOT_ENROLLED'` vào bảng `leads` khi hủy ghép. |
| 8 | CSDL Supabase | Bảng `leads` | Đồng bộ bản ghi đã xác minh của lead `3f8f2715-0477-42a1-a475-86cdb91bef01` thành `admission_status: 'ENROLLED'`. |

---

## 4. BẢNG ĐỐI CHIẾU DỮ LIỆU TRƯỚC VÀ SAU SỬA

| Chỉ số / Thành phần | Dữ liệu DB trước sửa | Hiển thị trước sửa | Dữ liệu DB sau sửa | Hiển thị sau sửa | Đánh giá |
|:---|:---|:---|:---|:---|:---:|
| **Card Tổng đăng ký** | 1 lead | **1** | 1 lead | **1** | **PASS** |
| **Card Chưa nhập học** | `NOT_ENROLLED` (Lệch) | **1 (Sai)** | `ENROLLED` (Đã đồng bộ) | **0 (Đúng)** | **PASS** |
| **Card Đã nhập học** | `NOT_ENROLLED` (Lệch) | **0 (Sai)** | `ENROLLED` (Đã đồng bộ) | **1 (Đúng)** | **PASS** |
| **Card Hồ sơ hợp lệ** | `MATCHED_VALID` | **1** | `MATCHED_VALID` | **1** | **PASS** |
| **Khách gần đây: Lê Văn Test** | `NOT_ENROLLED` | **Chưa nhập học (Sai)** | `ENROLLED` | **Đã nhập học (Đúng)** | **PASS** |
| **Biểu đồ tháng (T10/2026)** | `enrolled_count = 0` | **0 nhập học (Sai)** | `enrolled_count = 1` | **1 nhập học (Đúng)** | **PASS** |
| **Theo khóa học (Bánh Âu)** | `enrolled_leads = 0` | **0 nhập học (Sai)** | `enrolled_leads = 1` | **1 nhập học (Đúng)** | **PASS** |

---

## 5. KẾT QUẢ KIỂM THỬ TỪNG CA NGHIỆP VỤ (TEST CASES)

| STT | Tình huống kiểm thử | Hành vi kỳ vọng | Kết quả thực tế | Trạng thái |
|:---:|:---|:---|:---|:---:|
| **TC1** | **Chưa đối soát** | Hiển thị Chưa nhập học, số Đã nhập học = 0. | Thống kê và nhãn chính xác. | **PASS** |
| **TC2** | **Chỉ cập nhật mã EGOV** | Không tự động tăng số lượng Đã nhập học. | `admission_status` vẫn là `NOT_ENROLLED`. | **PASS** |
| **TC3** | **Xác nhận nhập học qua A4** | Thẻ, danh sách, biểu đồ và khóa học đồng loạt cập nhật `ENROLLED`. | Cả 4 khối trên `/portal` đồng bộ = 1. | **PASS** |
| **TC4** | **Duyệt / Từ chối thưởng** | Không làm thay đổi tình trạng nhập học. | `admission_status` độc lập với `reward_status`. | **PASS** |
| **TC5** | **Hủy đối soát (Void)** | `admission_status` trở về `NOT_ENROLLED`, mã EGOV được giữ lại. | Hồ sơ hoàn nguyên chính xác về Chưa nhập học. | **PASS** |
| **TC6** | **Xác nhận lại sau hủy** | Chỉ đếm 1 lead duy nhất, không cộng dồn bản ghi lịch sử VOIDED. | Đếm đúng 1 lead, không nhân đôi. | **PASS** |
| **TC7** | **Phân quyền CTV khác** | CTV khác không xem được và không bị cộng số liệu của CTV này. | Bộ lọc phân quyền bảo mật chặt chẽ. | **PASS** |
| **TC8** | **Toàn bộ tập dữ liệu** | Thống kê đúng toàn bộ leads thuộc CTV, không bị giới hạn bởi limit(5). | Phép tính chạy trên toàn bộ `leadsList`. | **PASS** |
| **TC9** | **Tải lại trang / Đăng nhập lại** | Dữ liệu duy trì tính toàn vẹn và chính xác từ CSDL thực. | Tải lại trang hiển thị đúng số liệu mới nhất. | **PASS** |
| **TC10** | **Xử lý lỗi API** | Khi lỗi kết nối, hiển thị màn hình thông báo lỗi và nút thử lại, không trả về số 0 giả. | Giao diện hiển thị Alert lỗi và nút Thử lại. | **PASS** |

---

## 6. BẰNG CHỨNG DỮ LIỆU API VÀ GIAO DIỆN SAU SỬA

### Bằng chứng Payload API `/api/v1/affiliate/dashboard/summary`:
```json
{
  "success": true,
  "data": {
    "affiliate": {
      "id": "79274b39-8476-4241-bdde-e4f61e79a615",
      "full_name": "Đào Văn Phương",
      "affiliate_code": "STHCCTV3042",
      "status": "ACTIVE"
    },
    "metrics": {
      "total_leads": 1,
      "not_enrolled_leads": 0,
      "enrolled_leads": 1,
      "matched_valid_leads": 1
    },
    "monthly_trend": [
      {
        "month_key": "2026-10",
        "month_label": "T10/2026",
        "leads_count": 1,
        "enrolled_count": 1
      }
    ],
    "course_breakdown": [
      {
        "course_id": "13e2cf6a-b792-4ae0-8562-c6c1e6ae0db1",
        "course_code": "BA",
        "course_title": "Bánh Âu",
        "total_leads": 1,
        "enrolled_leads": 1
      }
    ],
    "recent_leads": [
      {
        "id": "3f8f2715-0477-42a1-a475-86cdb91bef01",
        "full_name": "Lê Văn Test",
        "phone_masked": "090124****",
        "course_title": "Bánh Âu",
        "admission_status": "ENROLLED",
        "reconciliation_status": "MATCHED_VALID"
      }
    ]
  }
}
```

---

## 7. KẾT LUẬN

Hệ thống đã đạt sự đồng bộ 100% giữa CSDL, API Gateway và Giao diện người dùng cho tình trạng nhập học của CTV Đào Văn Phương (`STHCCTV3042`). Mọi hành động nghiệp vụ đối soát mới, hủy đối soát, hoặc tra cứu danh sách đều tuân thủ chặt chẽ nguồn trạng thái có thẩm quyền.
