/**
 * ==============================================================================
 * STHC_CTV - Bộ công cụ Định dạng Ngày Giờ Chuẩn (Date Formatter Helper)
 * Phục vụ phân hệ nội bộ Admin, Staff và Cổng CTV theo đặc tả A7.5
 * ==============================================================================
 */

/**
 * Định dạng ngày giờ đầy đủ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+07:00)
 * Áp dụng cho TIMESTAMPTZ (thời điểm giao dịch, tạo bản ghi, cập nhật cấu hình).
 * Ví dụ: 14:30:00, 05/10/2026
 */
export function formatDateTimeVi(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) return 'Chưa có thông tin';
  try {
    const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
    if (isNaN(d.getTime())) return String(dateStrOrObj);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(d);
  } catch {
    return String(dateStrOrObj);
  }
}

/**
 * Định dạng ngày giờ ngắn gọn (HH:mm, DD/MM/YYYY)
 * Ví dụ: 14:30, 05/10/2026
 */
export function formatDateTimeShortVi(dateStrOrObj?: string | Date | null): string {
  if (!dateStrOrObj) return 'Chưa có thông tin';
  try {
    const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
    if (isNaN(d.getTime())) return String(dateStrOrObj);
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(d);
  } catch {
    return String(dateStrOrObj);
  }
}

/**
 * Định dạng ngày thuần (Pure Date, vd: YYYY-MM-DD như ngày sinh, ngày cấp CCCD).
 * TUYỆT ĐỐI KHÔNG chuyển múi giờ để tránh bị lệch ngày sang hôm trước/sau.
 * Ví dụ: "2000-01-15" -> "15/01/2000"
 */
export function formatDateOnlyVi(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa có thông tin';
  const clean = String(dateStr).trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}
