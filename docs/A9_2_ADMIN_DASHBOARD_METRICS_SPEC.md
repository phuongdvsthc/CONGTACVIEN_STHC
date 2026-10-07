# ĐẶC TẢ CHỈ SỐ VÀ CÁCH TÍNH TỔNG QUAN QUẢN TRỊ ADMIN / STAFF (A9.2)
**Dự án**: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)  
**Mã tài liệu**: `/docs/A9_2_ADMIN_DASHBOARD_METRICS_SPEC.md`  
**Thời điểm lập**: 2026-10-07  
**Căn cứ kỹ thuật**: Báo cáo kiểm kê `/docs/A9_1_ADMIN_DASHBOARD_AUDIT_REPORT.md`, mã nguồn `server.ts`, CSDL PostgreSQL/Supabase, các migration SQL từ `20260929000001` đến `20261006000002` và các chuẩn hóa C6.  
**Mục tiêu**: Chốt danh mục chỉ số, công thức toán học, nguồn trạng thái có thẩm quyền, quy tắc thời gian và điều kiện phân quyền cho Module A9 (Tổng quan quản trị Admin/Staff).

---

## MỤC LỤC
1. [Phạm Vi Dữ Liệu & Nguyên Tắc Cốt Lõi](#1-phạm-vi-dữ-liệu--nguyên-tắc-cốt-lõi)
2. [Các Điểm Điều Chỉnh & Bổ Sung So Với Báo Cáo A9.1](#2-các-điểm-điều-chỉnh--bổ-sung-so-với-báo-cáo-a91)
3. [Chuẩn Hóa Nguồn Trạng Thái Có Thẩm Quyền (Authoritative State Engine)](#3-chuẩn-hóa-nguồn-trạng-thái-có-thẩm-quyền-authoritative-state-engine)
4. [Các Nhóm Thời Gian & Ranh Giới Tính Toán (Time Scope Framework)](#4-các-nhóm-thời-gian--ranh-giới-tính-toán-time-scope-framework)
5. [Bảng Đặc Tả Danh Mục Chỉ Số Quản Trị A9 (Master Metric Catalog)](#5-bảng-đặc-tả-danh-mục-chỉ-số-quản-trị-a9-master-metric-catalog)
6. [Đặc Tả Biểu Đồ & Thống Kê Phân Bố Khóa Học](#6-đặc-tả-biểu-đồ--thống-kê-phân-bố-khóa-học)
7. [Đặc Tả Bảng Xếp Hạng Top CTV & Danh Sách Gần Đây](#7-đặc-tả-bảng-xếp-hạng-top-ctv--danh-sách-gần-đây)
8. [Quy Tắc Phân Quyền & Che Giấu Dữ Liệu Tài Chính (Permission-Aware Redaction)](#8-quy-tắc-phân-quyền--che-giấu-dữ-liệu-tài-chính-permission-aware-redaction)
9. [Bảng Kiểm Thử Công Thức (Formula Verification Truth Table)](#9-bảng-kiểm-thử-công-thức-formula-verification-truth-table)
10. [Tổng Hợp Quyết Định Đã Chốt & Kế Hoạch Bước Tiếp Theo](#10-tổng-hợp-quyết-định-đã-chốt--kế-hoạch-bước-tiếp-theo)

---

## 1. Phạm Vi Dữ Liệu & Nguyên Tắc Cốt Lõi

1. **Phạm vi hệ thống STHC_CTV**:
   - Dữ liệu trên Dashboard A9 là toàn bộ các lượt đăng ký, hồ sơ CTV và thù lao được ghi nhận trong cơ sở dữ liệu của **Cổng Cộng tác viên Tuyển sinh STHC**, không đại diện cho toàn bộ số lượng sinh viên tuyển sinh chung của toàn trường hoặc toàn bộ cơ sở dữ liệu phần mềm EGOV.
2. **Đơn vị tuyển sinh**:
   - Đơn vị đo lường tuyển sinh là **“Lượt đăng ký”**, được định danh và đếm duy nhất theo `leads.id`.
   - **Tuyệt đối không** gọi là "Số người duy nhất" và **không** dùng `COUNT(DISTINCT phone)` hay `COUNT(DISTINCT email)` vì số điện thoại/email có thể dùng chung giữa người thân trong gia đình hoặc nhập sai sót.
3. **Bảo toàn dữ liệu lịch sử**:
   - Toàn bộ hồ sơ lead, đối soát và thù lao đã phát sinh gắn với các CTV đang bị tạm ngưng (`SUSPENDED`), bị từ chối (`REJECTED`) hoặc các khóa học đã ngừng tiếp nhận giới thiệu (`STOPPED`) đều được **bảo toàn 100%** trong các chỉ số lịch sử và tổng hợp toàn trường.
   - Không lọc bỏ hoặc xóa dấu vết dữ liệu khi trạng thái của CTV hoặc khóa học thay đổi.
4. **Không tự ý lọc bỏ dữ liệu**:
   - Không tự ý viết mã lọc bỏ dữ liệu nghi là "dữ liệu test" dựa trên chuỗi tên (`test`, `demo`), email (`test@...`) hoặc SĐT trừ khi có cột cờ dữ liệu chính thức trong CSDL. Mọi bản ghi hợp lệ trong bảng đều được tính toán đúng công thức.

---

## 2. Các Điểm Điều Chỉnh & Bổ Sung So Với Báo Cáo A9.1

Qua rà soát đối chiếu sâu giữa báo cáo kiểm kê A9.1 và mã nguồn backend/database thực tế, tài liệu A9.2 chốt các điểm chuẩn xác hóa sau:

1. **Chuẩn hóa công thức Đã nhập học**:
   - A9.1 nêu: $\text{Đã nhập học} = \text{MATCHED\_VALID} + \text{EXISTING\_IN\_SCHOOL\_SYSTEM}$.
   - **Chuẩn hóa A9.2**: Nguồn thẩm quyền cao nhất là hàm `resolveAuthoritativeAdmissionStatus(lead)`:
     - Nếu `lead.admission_status = 'WITHDRAWN'` $\rightarrow$ Phân loại là **Đã rút học** (`WITHDRAWN`), không tính vào đã nhập học.
     - Nếu có bản ghi đối chiếu hiệu lực (`activeRecon` chưa bị VOIDED) với `reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM')` và `admission_status <> 'NOT_ENROLLED'` $\rightarrow$ **ĐÃ NHẬP HỌC** (`ENROLLED`).
2. **Tách biệt nhóm thời gian (Time Dimension Decoupling)**:
   - Tránh việc áp dụng 1 bộ lọc ngày duy nhất làm sai lệch các thẻ tồn đọng:
     - Các thẻ KPI tuyển sinh: Tính theo **nhóm thí sinh đăng ký trong kỳ** (`leads.created_at` nằm trong khoảng thời gian chọn).
     - Các thẻ Tồn đọng (CTV chờ duyệt, Lead mới cần gọi, Thù lao chờ duyệt): Luôn tính theo **Hiện tại — Toàn bộ thời gian** để cán bộ không bị sót việc tồn đọng từ các tháng trước.
3. **Phân định rõ thẩm quyền thù lao**:
   - Phân biệt quyền `rewards.view` (chỉ xem danh sách) và `rewards.summary` (xem số liệu tổng hợp). Staff chỉ có `rewards.view` sẽ **không** nhận được số liệu tổng hợp tài chính trên Dashboard.
4. **Định danh nguồn giới thiệu**:
   - Phân loại rõ: `affiliate_id IS NOT NULL` là **"Có CTV giới thiệu"**; `affiliate_id IS NULL` là **"Không gắn CTV"** (không tự suy diễn gọi là "Khách tự nhiên" nếu chưa có căn cứ nguồn UTM/kênh).

---

## 3. Chuẩn Hóa Nguồn Trạng Thái Có Thẩm Quyền (Authoritative State Engine)

### 3.1 Hàm chọn bản ghi đối chiếu hiệu lực `getActiveReconciliation()`
Do một `lead` có thể có nhiều bản ghi trong `lead_reconciliations` (khi đối soát, hủy đối soát `VOIDED`, rồi đối soát lại), việc chọn bản ghi đối chiếu hiệu lực tuân thủ quy tắc nghiêm ngặt:

```typescript
function getActiveReconciliation(reconciliations: any[] | any): any | null {
  if (!reconciliations) return null;
  const list = Array.isArray(reconciliations) ? [...reconciliations] : [reconciliations];
  if (list.length === 0) return null;

  // 1. Chỉ lọc các bản ghi có trạng thái nghiệp vụ đang còn hiệu lực (loại trừ tuyệt đối VOIDED)
  const activeList = list.filter((r: any) =>
    r && ['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID'].includes(r.reconciliation_status)
  );

  if (activeList.length === 0) return null;

  // 2. Sắp xếp giảm dần theo thời điểm đối soát chính thức (reconciled_at), fallback created_at, fallback id
  activeList.sort((a: any, b: any) => {
    const timeA = new Date(a.reconciled_at || a.created_at || 0).getTime();
    const timeB = new Date(b.reconciled_at || b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  return activeList[0];
}
```

### 3.2 Hàm chuẩn hóa trạng thái nhập học có thẩm quyền `resolveAuthoritativeAdmissionStatus()`
Tình trạng nhập học thực tế của thí sinh được chuẩn hóa về đúng 3 trạng thái duy nhất: `'ENROLLED' | 'NOT_ENROLLED' | 'WITHDRAWN'`.

```typescript
function resolveAuthoritativeAdmissionStatus(lead: {
  admission_status?: string | null;
  reconciliation_status?: string | null;
  lead_reconciliations?: any[] | any;
}): 'ENROLLED' | 'NOT_ENROLLED' | 'WITHDRAWN' {
  // Ưu tiên 1: Học viên đã rút hồ sơ
  if (lead.admission_status === 'WITHDRAWN') {
    return 'WITHDRAWN';
  }

  // Ưu tiên 2: Căn cứ theo bản ghi đối chiếu đang có hiệu lực (activeRecon)
  const activeRecon = getActiveReconciliation(lead.lead_reconciliations);
  if (activeRecon) {
    if (['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM'].includes(activeRecon.reconciliation_status)) {
      return activeRecon.admission_status === 'NOT_ENROLLED' ? 'NOT_ENROLLED' : 'ENROLLED';
    }
    // Trường hợp MISMATCH_INVALID -> chưa nhập học
    return 'NOT_ENROLLED';
  }

  // Ưu tiên 3: Fallback snapshot trên dòng lead (khi chưa join hoặc lead_reconciliations rỗng)
  if (['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM'].includes(lead.reconciliation_status || '')) {
    return lead.admission_status === 'NOT_ENROLLED' ? 'NOT_ENROLLED' : 'ENROLLED';
  }

  return lead.admission_status === 'ENROLLED' ? 'ENROLLED' : 'NOT_ENROLLED';
}
```

### 3.3 Sơ đồ chuyển đổi và tính độc lập giữa các trục trạng thái

```
┌────────────────────────────────────────────────────────────────────────┐
│ TRỤC 1: HỌC THUẬT & NHẬP HỌC (admission_status)                        │
│ ┌────────────────┐         ┌──────────────┐         ┌────────────────┐ │
│ │  NOT_ENROLLED  │ ──────> │   ENROLLED   │ ──────> │   WITHDRAWN    │ │
│ │ (Chưa nhập học)│         │(Đã nhập học) │         │ (Đã rút học)   │ │
│ └────────────────┘         └──────────────┘         └────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    ▲
                         ĐỘC LẬP    │    ĐỘC LẬP
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TRỤC 2: TÍNH HỢP LỆ NGUỒN GIỚI THIỆU CTV (reconciliation_status)       │
│ ┌───────────────────────┐ ┌──────────────────────────────────────────┐ │
│ │     MATCHED_VALID     │ │        EXISTING_IN_SCHOOL_SYSTEM         │ │
│ │ (Hợp lệ -> Sinh A5)   │ │ (Đã có hồ sơ tại trường -> Không sinh A5)│ │
│ └───────────────────────┘ └──────────────────────────────────────────┘ │
│ ┌───────────────────────┐ ┌──────────────────────────────────────────┐ │
│ │   MISMATCH_INVALID    │ │                 VOIDED                   │ │
│ │ (Sai lệch / Không khớp)│ │ (Hủy đối soát -> Đưa về NOT_RECONCILED)  │ │
│ └───────────────────────┘ └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Các Nhóm Thời Gian & Ranh Giới Tính Toán (Time Scope Framework)

Mọi phép tính thời gian trong toàn bộ hệ thống đều quy chuẩn theo múi giờ **Việt Nam (`Asia/Ho_Chi_Minh` - UTC+07:00)**.

### 4.1 Định nghĩa 4 nhóm thời gian nghiệp vụ
1. **Nhóm A — Kết quả tuyển sinh theo kỳ đăng ký (Cohort Results)**:
   - Điều kiện lọc: `leads.created_at >= start_utc AND leads.created_at < end_utc`.
   - Áp dụng cho: Tổng lượt đăng ký, Chưa nhập học, Đã nhập học, Đã rút học, Tỷ lệ nhập học, Phân bố theo khóa học đăng ký.
2. **Nhóm B — Phát sinh theo thời điểm sự kiện (Point-in-Time Events)**:
   - Đăng ký phát sinh trong kỳ: `leads.created_at` nằm trong kỳ.
   - Nhập học xác nhận trong kỳ: `lead_reconciliations.reconciled_at` của bản ghi hiệu lực nằm trong kỳ.
   - Thù lao phát sinh trong kỳ: `rewards.created_at` nằm trong kỳ.
   - Thù lao đã duyệt trong kỳ: `rewards.approved_at` nằm trong kỳ (với trạng thái hiện tại `APPROVED`).
3. **Nhóm C — Công việc tồn đọng hiện tại (Current Operational Backlog)**:
   - Phạm vi: **Toàn bộ thời gian (All-Time)**.
   - Áp dụng cho: CTV chờ duyệt, Khách mới cần liên hệ, Hồ sơ chờ đối chiếu, Thù lao chờ duyệt.
4. **Nhóm D — Mạng lưới CTV & Top vinh danh (Network & Honors)**:
   - Phạm vi: **Toàn bộ thời gian (All-Time)**.
   - Áp dụng cho: Tổng số CTV theo trạng thái hiện tại, Top 5 CTV xuất sắc.

### 4.2 Quy tắc chuyển đổi ranh giới ngày từ giờ Việt Nam sang UTC
Khi người dùng chọn khoảng ngày từ `from_date` (YYYY-MM-DD) đến `to_date` (YYYY-MM-DD):
- **Thời điểm bắt đầu (Bao gồm - Inclusive)**:  
  `start_utc = [from_date]T00:00:00+07:00` $\rightarrow$ Trừ 7 giờ về UTC: `[from_date - 1]T17:00:00.000Z`.
- **Thời điểm kết thúc (Không bao gồm - Exclusive)**:  
  Lấy đầu ngày kế tiếp của `to_date`:  
  `end_utc = [to_date + 1 ngày]T00:00:00+07:00` $\rightarrow$ Trừ 7 giờ về UTC: `[to_date]T17:00:00.000Z`.
- **Tuyệt đối không** dùng giờ máy chủ cục bộ (Local Server Time) mà không áp dụng timezone offset `+07:00`.

---

## 5. Bảng Đặc Tả Danh Mục Chỉ Số Quản Trị A9 (Master Metric Catalog)

| Mã chỉ số | Nhãn tiếng Việt | Ý nghĩa nghiệp vụ | Đơn vị | Nguồn chuẩn | Công thức tính toán | Điều kiện lọc & Trạng thái | Trường ngày | Bộ lọc áp dụng | Quyền yêu cầu | Xử lý NULL / Rỗng | Quy tắc loại trùng | Đường dẫn đối chiếu |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TS_TOTAL_LEADS** | Tổng lượt đăng ký | Toàn bộ lượt đăng ký tư vấn được ghi nhận trong kỳ | Lượt | `leads` | `COUNT(leads.id)` | Tất cả leads trong kỳ | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Đếm trực tiếp theo `leads.id` | `/admin/leads` |
| **TS_NOT_ENROLLED** | Chưa nhập học | Lượt đăng ký chưa hoàn tất nhập học (không bao gồm đã rút học) | Lượt | `leads` + `lead_reconciliations` | `COUNT(leads.id)` | `resolveAuthoritativeAdmissionStatus(l) = 'NOT_ENROLLED'` | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Gom nhóm theo `leads.id` | `/admin/leads?admission_status=NOT_ENROLLED` |
| **TS_ENROLLED** | Đã nhập học | Số học viên được xác nhận nhập học qua đối chiếu A4 | Học viên | `leads` + `lead_reconciliations` | `COUNT(leads.id)` | `resolveAuthoritativeAdmissionStatus(l) = 'ENROLLED'` | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Gom nhóm theo `leads.id` | `/admin/reconcile` (hoặc `/admin/leads?admission_status=ENROLLED`) |
| **TS_WITHDRAWN** | Đã rút hồ sơ | Số học viên đã nhập học nhưng sau đó rút hồ sơ | Học viên | `leads` | `COUNT(leads.id)` | `leads.admission_status = 'WITHDRAWN'` | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Đếm trực tiếp theo `leads.id` | `/admin/leads?admission_status=WITHDRAWN` |
| **TS_ENROLL_RATE** | Tỷ lệ nhập học | Tỷ lệ chuyển đổi nhập học của nhóm đăng ký trong kỳ | % | Tính toán từ `TS_ENROLLED` và `TS_TOTAL_LEADS` | `(TS_ENROLLED / TS_TOTAL_LEADS) * 100` | Cùng tập lead của kỳ chọn | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Nếu mẫu số = 0 $\rightarrow$ `null` (Hiển thị `"Chưa có dữ liệu"`) | Làm tròn 1 chữ số thập phân | Dashboard Overview Card |
| **TS_EGOV_ACTIVE** | Đã gắn mã EGOV | Lượt đăng ký đã có mã hồ sơ EGOV hiệu lực | Hồ sơ | `leads` + `lead_egov_links` | `COUNT(leads.id)` | `EXISTS (SELECT 1 FROM lead_egov_links WHERE lead_id = leads.id AND link_status = 'ACTIVE')` | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Dùng mệnh đề `EXISTS` chống duplicate | `/admin/leads` |
| **TS_MATCHED_VALID** | Nguồn giới thiệu hợp lệ | Lượt đăng ký được đối chiếu xác nhận hợp lệ nguồn CTV | Hồ sơ | `leads` + `lead_reconciliations` | `COUNT(leads.id)` | `activeRecon.reconciliation_status = 'MATCHED_VALID'` | `leads.created_at` | Bộ lọc thời gian (Kỳ chọn) | Staff / Admin | Trả về `0` | Lấy theo `activeRecon` | `/admin/reconcile` |
| **OP_NEW_LEADS** | Khách mới cần liên hệ | Khách đăng ký mới chưa được cán bộ liên hệ chăm sóc | Lượt | `leads` | `COUNT(leads.id)` | `counseling_status = 'NEW'` VÀ `admission_status <> 'ENROLLED'` | `leads.created_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm trực tiếp `leads.id` | `/admin/leads?status=NEW` |
| **OP_PENDING_RECON** | Hồ sơ chờ đối chiếu | Hồ sơ đăng ký chưa được đối chiếu xác nhận nhập học | Hồ sơ | `leads` + `lead_reconciliations` | `COUNT(leads.id)` | `reconciliation_status IN ('NOT_RECONCILED', 'NONE')` hoặc không có `activeRecon` | `leads.created_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm trực tiếp `leads.id` | `/admin/reconcile` |
| **CTV_TOTAL** | Tổng CTV mạng lưới | Toàn bộ tài khoản CTV trong hệ thống | CTV | `profiles` + `affiliate_profiles` | `COUNT(affiliate_profiles.id)` | `profiles.role = 'affiliate'` | `affiliate_profiles.created_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm theo `affiliate_profiles.id` | `/admin/affiliates` |
| **CTV_ACTIVE** | CTV đang hoạt động | CTV đã được duyệt và tài khoản đang kích hoạt | CTV | `profiles` + `affiliate_profiles` | `COUNT(affiliate_profiles.id)` | `affiliate_profiles.status = 'ACTIVE'` VÀ `profiles.is_active = TRUE` | `affiliate_profiles.reviewed_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm theo `affiliate_profiles.id` | `/admin/affiliates?status=ACTIVE` |
| **CTV_PENDING** | CTV chờ duyệt | Hồ sơ CTV mới đăng ký đang chờ Ban Tuyển sinh duyệt | Hồ sơ | `profiles` + `affiliate_profiles` | `COUNT(affiliate_profiles.id)` | `affiliate_profiles.status = 'PENDING_REVIEW'` | `affiliate_profiles.created_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm theo `affiliate_profiles.id` | `/admin/affiliates?status=PENDING_REVIEW` |
| **CTV_SUSPENDED** | CTV tạm ngưng | CTV bị tạm dừng quyền tiếp thị | CTV | `profiles` + `affiliate_profiles` | `COUNT(affiliate_profiles.id)` | `affiliate_profiles.status = 'SUSPENDED'` | `affiliate_profiles.suspended_at` | **Hiện tại — Toàn bộ thời gian** | Staff / Admin | Trả về `0` | Đếm theo `affiliate_profiles.id` | `/admin/affiliates?status=SUSPENDED` |
| **REW_PENDING_ALL** | Thù lao chờ duyệt | Tổng số tiền & số khoản thưởng đang chờ lãnh đạo phê duyệt | VNĐ / Khoản | `rewards` | `SUM(amount)` & `COUNT(id)` | `status = 'PENDING_APPROVAL'` | `rewards.created_at` | **Hiện tại — Toàn bộ thời gian** | Admin hoặc `rewards.summary` | Trả về `{ amount: 0, count: 0 }` | Đếm trực tiếp theo `rewards.id` | `/admin/rewards?status=PENDING_APPROVAL` |
| **REW_APPROVED_PERIOD** | Thù lao đã duyệt trong kỳ | Số tiền & số khoản thưởng được phê duyệt trong kỳ chọn | VNĐ / Khoản | `rewards` | `SUM(amount)` & `COUNT(id)` | `status = 'APPROVED'` VÀ `approved_at` nằm trong kỳ | `rewards.approved_at` | Bộ lọc thời gian (Kỳ chọn) | Admin hoặc `rewards.summary` | Trả về `{ amount: 0, count: 0 }` | Đếm trực tiếp theo `rewards.id` | `/admin/rewards?status=APPROVED` |
| **REW_APPROVED_ALL** | Tổng thù lao đã duyệt còn hiệu lực | Toàn bộ số tiền thưởng đã duyệt từ trước đến nay | VNĐ / Khoản | `rewards` | `SUM(amount)` & `COUNT(id)` | `status = 'APPROVED'` | `rewards.approved_at` | **Hiện tại — Toàn bộ thời gian** | Admin hoặc `rewards.summary` | Trả về `{ amount: 0, count: 0 }` | Đếm trực tiếp theo `rewards.id` | `/admin/rewards?status=APPROVED` |
| **REW_PAID** | Thù lao đã thanh toán | Tình trạng theo dõi chi trả tài chính thực tế | VNĐ | N/A | Không có bảng `payouts` | Giai đoạn 1 chi trả ngoại tuyến | N/A | Toàn bộ thời gian | Admin hoặc `rewards.summary` | `available: false`, hiển thị `"Chưa có dữ liệu theo dõi chi trả"` | N/A | Dashboard Overview Card |

---

## 6. Đặc Tả Biểu Đồ & Thống Kê Phân Bố Khóa Học

### 6.1 Biểu đồ 1: Xu hướng Đăng ký & Nhập học toàn trường (12 tháng gần nhất)
- **Mục đích**: Phản ánh bức tranh tuyển sinh liên tục trong 12 tháng tính đến tháng hiện tại theo giờ Việt Nam.
- **Cấu trúc dữ liệu**: Mảng gồm đúng 12 phần tử liên tục `[ { month_key: "YYYY-MM", month_label: "TMM/YYYY", leads_count: number, enrolled_count: number } ]`.
- **Quy tắc tính từng cột**:
  - **Cột Đăng ký (`leads_count`)**: Đếm `leads.id` có `getVietnamMonthKey(leads.created_at) = month_key`.
  - **Cột Nhập học (`enrolled_count`)**: Đếm mỗi lead tối đa 1 lần nếu có `resolveAuthoritativeAdmissionStatus(lead) = 'ENROLLED'` và mốc xác nhận chính thức `getVietnamMonthKey(activeRecon.reconciled_at) = month_key`.
  - **Xử lý hồ sơ thiếu ngày**: Nếu lead `ENROLLED` nhưng thiếu `reconciled_at` $\rightarrow$ Không gán bừa vào tháng bất kỳ, cộng vào trường metadata `enrolled_missing_date_count` và hiển thị ghi chú minh bạch dưới biểu đồ.
  - **Tháng không có phát sinh**: Trả về `leads_count: 0, enrolled_count: 0`.
- **Ghi chú quan trọng**: Đây là biểu đồ phản ánh kết quả **hiện còn hiệu lực**. Khi một hồ sơ nhập học cũ bị hủy đối chiếu hoặc rút học, số liệu của tháng tương ứng sẽ tự động điều chỉnh theo trạng thái thực tế mới nhất.

### 6.2 Biểu đồ 2: Kết quả tuyển sinh theo Khóa học
- **Phạm vi phân tích**: Thống kê theo **Khóa học mà khách đăng ký ban đầu** (`leads.course_id`).
- **Cấu trúc dữ liệu**:
  ```typescript
  interface CourseStat {
    course_id: string;
    course_code: string;
    course_title: string;
    total_leads: number;
    enrolled_leads: number;
  }
  ```
- **Quy tắc gom nhóm**:
  - `total_leads`: Tổng số lead đăng ký khóa học đó trong kỳ.
  - `enrolled_leads`: Số lead đăng ký khóa học đó đã được xác nhận nhập học (`resolveAuthoritativeAdmissionStatus = 'ENROLLED'`).
  - **Khóa học ngừng nhận đăng ký (`STOPPED`)**: Vẫn hiển thị đầy đủ số liệu lịch sử.
  - **Lead không có `course_id`**: Gom vào nhóm `"Chưa chọn khóa học"` (`course_code: 'UNASSIGNED'`).
  - **Lead trỏ vào `course_id` không còn trong CSDL**: Gom vào nhóm `"Khóa học chưa xác định"`.
  - Sắp xếp: Giảm dần theo `total_leads`, sau đó giảm dần theo `enrolled_leads`.

---

## 7. Đặc Tả Bảng Xếp Hạng Top CTV & Danh Sách Gần Đây

### 7.1 Bảng xếp hạng Top 5 CTV nổi bật (Leaderboard)
- **Tiêu chí xếp hạng**: Tổng tiền thù lao đã được phê duyệt còn hiệu lực trong toàn bộ thời gian:
  $$\text{approved\_reward\_amount} = \sum \text{rewards.amount} \quad (\text{với } \text{status} = \text{'APPROVED'})$$
- **Điều kiện tham gia xếp hạng**:
  1. `profiles.role = 'affiliate'` (Chỉ dành cho CTV thuần túy, loại trừ Admin/Staff).
  2. `affiliate_profiles.status = 'ACTIVE'` (CTV đang trong trạng thái hoạt động).
  3. `profiles.is_active = TRUE` (Tài khoản người dùng đang được phép hoạt động).
  4. $\text{approved\_reward\_amount} > 0$ (Chỉ vinh danh CTV đã có thành tích thực tế).
- **Quy tắc thứ hạng**:
  - Sắp xếp giảm dần theo $\text{approved\_reward\_amount}$.
  - Nếu cùng số tiền thưởng: Nhận cùng thứ hạng (Standard Competition Ranking 1, 2, 2, 4), dùng `affiliate_code` để ổn định thứ tự hiển thị.
  - Giới hạn tối đa 5 CTV (nếu ít hơn 5 người thì chỉ hiển thị số lượng thực tế, không bổ sung dữ liệu mẫu).
- **Quyền xem**: Bảng xếp hạng Top CTV là dữ liệu tài chính vinh danh, **bắt buộc yêu cầu quyền `rewards.summary` hoặc `role = 'admin'`**. Nếu không đủ quyền, khối này sẽ được ẩn hoặc thay thế bằng banner thông báo.

### 7.2 Danh sách 5 Khách hàng đăng ký gần đây (Recent Leads)
- **Truy vấn**: Lấy 5 bản ghi `leads` mới nhất theo thứ tự `ORDER BY created_at DESC, id DESC LIMIT 5`.
- **Thông tin hiển thị**:
  - Họ và tên khách hàng (`full_name`).
  - Số điện thoại (`phone`): **Hiển thị đầy đủ** (không che 4 số cuối vì Admin/Staff có thẩm quyền liên hệ chăm sóc).
  - Khóa học quan tâm (`course_title`).
  - Mã CTV giới thiệu (`affiliate_code` / `affiliate_name` nếu có).
  - Ngày đăng ký (`created_at` định dạng `DD/MM/YYYY HH:mm` giờ Việt Nam).
  - Badge Tiến độ tư vấn (`counseling_status`) và Tình trạng nhập học (`admission_status` chuẩn hóa).
  - Nút điều hướng chi tiết sang `/admin/leads/:id`.

### 7.3 Nhật ký hoạt động quản trị gần đây (Recent Audit Logs - Admin Only)
- **Truy vấn**: Lấy 5 bản ghi `audit_logs` mới nhất theo `ORDER BY created_at DESC LIMIT 5`.
- **Quyền hạn**: **Chỉ hiển thị cho tài khoản có vai trò `admin`**. Tuyệt đối không trả về cho tài khoản `staff`.

---

## 8. Quy Tắc Phân Quyền & Che Giấu Dữ Liệu Tài Chính (Permission-Aware Redaction)

Nhằm đảm bảo an toàn thông tin và tránh lỗi chặn truy cập (HTTP 403) khi Staff đăng nhập vào Tổng quan, cơ chế phân tầng dữ liệu được quy định như sau:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TÀI KHOẢN ĐĂNG NHẬP                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          [Vai trò: Admin]                  [Vai trò: Staff]
                    │                               │
                    ▼                               ▼
       - Xem 100% KPI Tuyển sinh       - Xem 100% KPI Tuyển sinh
       - Xem 100% Khối Thù lao / Tiền  - Kiểm tra quyền: `rewards.summary`
       - Xem Top 5 CTV Vinh danh                    │
       - Xem Nhật ký Audit Logs        ┌────────────┴────────────┐
                                       ▼                         ▼
                                 [CÓ QUYỀN]                [KHÔNG CÓ QUYỀN]
                                       │                         │
                                       ▼                         ▼
                              - Xem Khối Thù lao        - Ẩn Khối Thù lao
                              - Xem Top 5 CTV           - Ẩn Top 5 CTV
                                                        - Trả reason_code:
                                                          `PERMISSION_DENIED`
```

### Quy tắc phản hồi API:
- Đối với các trường thù lao (`rewards`), nếu người dùng là `staff` chưa được gán quyền `rewards.summary`:
  ```json
  "rewards": {
    "available": false,
    "amount": null,
    "count": null,
    "reason_code": "PERMISSION_DENIED",
    "message": "Tài khoản không có quyền xem tổng hợp tài chính thù lao."
  }
  ```
- **Tuyệt đối không** trả về số tiền `0` khi không có quyền, vì `0` thể hiện là "không có khoản thưởng nào" (sai lệch bản chất nghiệp vụ).

---

## 9. Bảng Kiểm Thử Công Thức (Formula Verification Truth Table)

Bảng đối chiếu 16 kịch bản nghiệp vụ để kiểm tra tính chính xác của công thức trước khi code API:

| STT | Kịch bản kiểm thử | Trạng thái dữ liệu đầu vào | `admission_status` chuẩn hóa | `reconciliation_status` chuẩn hóa | Ghi nhận Đã nhập học? | Ghi nhận Thù lao? | Biểu đồ 12 tháng |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | Không có lead nào trong kỳ | Bảng `leads` rỗng trong khoảng ngày chọn | N/A | N/A | `TS_ENROLLED = 0` | `0` | `leads_count: 0, enrolled_count: 0` |
| **2** | Thí sinh đã có hồ sơ tại trường | `lead_reconciliations.reconciliation_status = 'EXISTING_IN_SCHOOL_SYSTEM'` | `ENROLLED` | `EXISTING_IN_SCHOOL_SYSTEM` | **CÓ** | **KHÔNG** (Không sinh thưởng CTV) | Tăng `enrolled_count` tại tháng `reconciled_at` |
| **3** | Có mã EGOV nhưng chưa đối chiếu | `lead_egov_links` có bản ghi `ACTIVE`, `leads.reconciliation_status = 'NOT_RECONCILED'` | `NOT_ENROLLED` | `NOT_RECONCILED` | **KHÔNG** | **KHÔNG** | Chỉ tăng `leads_count` tại tháng đăng ký |
| **4** | Thí sinh đã rút học phí / rút hồ sơ | `leads.admission_status = 'WITHDRAWN'` | `WITHDRAWN` | Giữ nguyên | **KHÔNG** | **KHÔNG** (Tính vào `TS_WITHDRAWN`) | Không tính vào `enrolled_count` |
| **5** | Hủy đối chiếu A4 | `fn_void_reconciliation_and_reward` đã chạy, `reconciliation_status = 'VOIDED'` | `NOT_ENROLLED` | `VOIDED` | **KHÔNG** | **KHÔNG** (Thưởng chuyển `VOIDED`) | Tháng cũ tự giảm `enrolled_count` |
| **6** | Hủy trực tiếp thù lao A5 | `fn_void_reward` đã chạy, `rewards.status = 'VOIDED'` | `ENROLLED` | `MATCHED_VALID` | **CÓ** (Vẫn là học viên) | **KHÔNG** (Thưởng bị hủy) | Vẫn giữ `enrolled_count` trong biểu đồ |
| **7** | Hủy rồi đối chiếu lại thành công | 1 bản ghi `VOIDED` cũ và 1 bản ghi `MATCHED_VALID` mới | `ENROLLED` | `MATCHED_VALID` | **CÓ** (Tính theo bản ghi mới) | **CÓ** (Thưởng mới `PENDING_APPROVAL`) | Tính nhập học theo `reconciled_at` mới |
| **8** | Lead có nhiều liên kết EGOV & đối soát | 2 link EGOV (`1 VOIDED, 1 ACTIVE`), 2 lần đối soát | `ENROLLED` | Lấy theo `activeRecon` | **Đếm đúng 1 lần** | Đếm đúng theo `rewards.id` | Không bị nhân bản số lượng (Cartesian) |
| **9** | Hai khoản reward có cùng số tiền | 2 khoản thưởng cùng `amount = 500000` | N/A | N/A | N/A | `SUM = 1.000.000 đ` | `SUM(amount)` đếm đủ cả 2 khoản |
| **10** | Lead nhập học nhưng thiếu ngày đối chiếu | `admission_status = 'ENROLLED'`, `activeRecon.reconciled_at IS NULL` | `ENROLLED` | `MATCHED_VALID` | **CÓ** trong KPI tổng | **CÓ** | Tăng `enrolled_missing_date_count` |
| **11** | Đăng ký tháng trước, nhập học tháng này | `leads.created_at` = 09/2026, `reconciled_at` = 10/2026 | `ENROLLED` | `MATCHED_VALID` | Tùy kỳ chọn | Tùy kỳ chọn | Cột Đăng ký tăng ở T09/2026; Cột Nhập học tăng ở T10/2026 |
| **12** | Ranh giới múi giờ UTC vs UTC+7 | Ghi nhận lúc `2026-10-31T18:30:00Z` (= 01:30 sáng 01/11/2026 VN) | `NOT_ENROLLED` | `NOT_RECONCILED` | N/A | N/A | Tính chính xác vào **Tháng 11/2026** (giờ VN) |
| **13** | Khóa đăng ký khác khóa nhập học thực tế | `leads.course_id = A`, `lead_reconciliations.course_id = B` | `ENROLLED` | `MATCHED_VALID` | Tính theo Khóa A (Khóa đăng ký ban đầu) | Căn cứ tính thưởng | Biểu đồ khóa học phân bổ theo Khóa A |
| **14** | Staff chỉ có `rewards.view` | Tài khoản Staff không có `rewards.summary` | N/A | N/A | Xem được KPI tuyển sinh | **Ẩn số tiền** (`available: false`) | Không hiển thị Top 5 CTV tài chính |
| **15** | CTV đổi vai trò hoặc bị khóa | `profiles.role` đổi sang `staff` hoặc `is_active = false` | Giữ nguyên lead | Giữ nguyên đối soát | Không ảnh hưởng số lead | Không ảnh hưởng lịch sử | Tự động loại khỏi Top 5 vinh danh CTV |
| **16** | Số lượng dữ liệu lớn (> 1.000 leads) | Dữ liệu vượt quá giới hạn phân trang mặc định | N/A | N/A | Tổng hợp trên DB | Tổng hợp trên DB | Không bị cắt cụt số liệu ở trang 1 |

---

## 10. Tổng Hợp Quyết Định Đã Chốt & Kế Hoạch Bước Tiếp Theo

### 10.1 Các quyết định đã chốt 100% trong A9.2
1. **Đơn vị đếm**: Tuyệt đối dùng "Lượt đăng ký" (`leads.id`), không dùng "người duy nhất" hay `DISTINCT phone`.
2. **Nguồn trạng thái**: Tách biệt 2 trục `admission_status` và `reconciliation_status`; sử dụng hàm chuẩn hóa `resolveAuthoritativeAdmissionStatus()`.
3. **Phạm vi thời gian**: Tách biệt 4 nhóm thời gian (Kỳ chọn cho kết quả tuyển sinh; Toàn bộ thời gian cho tồn đọng và mạng lưới CTV).
4. **Múi giờ**: `Asia/Ho_Chi_Minh` (UTC+7) trên toàn bộ hệ thống.
5. **Thù lao**: Tính từ `SUM(rewards.amount)`; thẻ thanh toán hiển thị *"Chưa có dữ liệu theo dõi chi trả"*.
6. **Bảo mật phân quyền**: Phân tầng dữ liệu cho Staff không có quyền `rewards.summary`.

### 10.2 Kế hoạch chuyển tiếp sang A9.3
- Bước A9.2 đã hoàn thành việc chốt toàn bộ công thức và chỉ số.
- Bước tiếp theo (**A9.3**): Thiết kế chi tiết hợp đồng API `GET /api/v1/admin/dashboard/summary`, cấu trúc State Frontend, thiết kế UI/UX component `AdminDashboardView.tsx` và ma trận phân quyền chi tiết.
