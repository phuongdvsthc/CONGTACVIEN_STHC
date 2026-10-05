/**
 * ==============================================================================
 * STHC_CTV - Bộ công cụ Kiểm tra & Chuẩn hóa Thông tin Vận hành (A7.5)
 * ==============================================================================
 */

export interface ValidationResult<T = string> {
  valid: boolean;
  normalized: T;
  error?: string;
}

/**
 * Kiểm tra và chuẩn hóa URL công khai chính thức:
 * - Bắt buộc HTTPS.
 * - Chỉ nhận URL gốc (root domain), không có subpath, query, fragment, credentials.
 * - Chuẩn hóa bỏ dấu gạch chéo cuối cùng.
 * - Sử dụng URL Parser chuẩn, không chỉ dùng Regex.
 * - Chống SSRF (không gửi HTTP request ra ngoài để kiểm tra).
 */
export function validatePublicBaseUrl(rawUrl?: string | null): ValidationResult<string> {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      valid: false,
      normalized: '',
      error: 'URL công khai chính thức không được để trống.',
    };
  }

  const clean = rawUrl.trim();

  try {
    const parsed = new URL(clean);

    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalized: '',
        error: 'URL công khai bắt buộc phải sử dụng giao thức bảo mật HTTPS (ví dụ: https://ctv.sthc.edu.vn).',
      };
    }

    if (parsed.pathname && parsed.pathname !== '/') {
      return {
        valid: false,
        normalized: '',
        error: 'URL công khai phải là URL gốc (root domain), không được chứa đường dẫn con (ví dụ: không dùng /catalog).',
      };
    }

    if (parsed.search) {
      return {
        valid: false,
        normalized: '',
        error: 'URL công khai không được chứa tham số truy vấn (?query).',
      };
    }

    if (parsed.hash) {
      return {
        valid: false,
        normalized: '',
        error: 'URL công khai không được chứa fragment (#).',
      };
    }

    if (parsed.username || parsed.password) {
      return {
        valid: false,
        normalized: '',
        error: 'URL công khai không được chứa thông tin đăng nhập (credentials).',
      };
    }

    const normalized = `${parsed.protocol}//${parsed.host}`;
    return {
      valid: true,
      normalized,
    };
  } catch {
    return {
      valid: false,
      normalized: '',
      error: 'Định dạng URL không hợp lệ (cần đúng chuẩn URL HTTPS, ví dụ: https://ctv.sthc.edu.vn).',
    };
  }
}

/**
 * Kiểm tra và chuẩn hóa Email hỗ trợ:
 * - Trim khoảng trắng.
 * - Định dạng chuẩn RFC 5322 (tương đối qua regex tiêu chuẩn).
 * - Đây là địa chỉ liên hệ hỗ trợ, không phải cấu hình máy chủ SMTP.
 */
export function validateSupportEmail(rawEmail?: string | null): ValidationResult<string> {
  if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
    return {
      valid: false,
      normalized: '',
      error: 'Email hỗ trợ không được để trống.',
    };
  }

  const clean = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(clean) || clean.length > 255) {
    return {
      valid: false,
      normalized: '',
      error: 'Địa chỉ email hỗ trợ không đúng định dạng (ví dụ: tuyensinh@sthc.edu.vn).',
    };
  }

  return {
    valid: true,
    normalized: clean,
  };
}

/**
 * Kiểm tra và chuẩn hóa Số điện thoại hỗ trợ:
 * - Chấp nhận dạng nội địa (028..., 090...), dạng +84... hoặc 84...
 * - Cho phép số di động (10 chữ số) và số cố định Việt Nam (10 hoặc 11 chữ số).
 * - Bỏ dấu cách và dấu phân cách được hỗ trợ (dấu chấm, dấu gạch ngang, ngoặc đơn).
 * - Chuẩn hóa về chuỗi nội địa bắt đầu bằng '0' (giữ số 0 đầu).
 * - Từ chối chuỗi nhiều số hoặc số máy lẻ.
 */
export function validateSupportPhone(rawPhone?: string | null): ValidationResult<string> {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return {
      valid: false,
      normalized: '',
      error: 'Số điện thoại hỗ trợ không được để trống.',
    };
  }

  // Bỏ khoảng trắng và các dấu phân cách phổ biến
  let clean = rawPhone.trim().replace(/[\s\.\-\(\)]/g, '');

  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length > 9) {
    clean = '0' + clean.slice(2);
  }

  // Regex điện thoại Việt Nam:
  // - Cố định: 02 + 8 hoặc 9 chữ số (10 - 11 chữ số)
  // - Di động: 03, 05, 07, 08, 09 + 8 chữ số (10 chữ số)
  const vnPhoneRegex = /^0(2[0-9]{8,9}|[3|5|7|8|9][0-9]{8})$/;

  if (!vnPhoneRegex.test(clean)) {
    return {
      valid: false,
      normalized: '',
      error: 'Số điện thoại hỗ trợ không hợp lệ (yêu cầu số cố định hoặc di động Việt Nam hợp lệ, ví dụ: 02838446480 hoặc 0901234567).',
    };
  }

  return {
    valid: true,
    normalized: clean,
  };
}

/**
 * Kiểm tra Múi giờ hệ thống:
 * - Đợt này cố định Asia/Ho_Chi_Minh (Việt Nam UTC+07:00).
 */
export function validateTimezone(rawTz?: string | null): ValidationResult<string> {
  const clean = (rawTz || '').trim();
  if (clean !== 'Asia/Ho_Chi_Minh') {
    return {
      valid: false,
      normalized: 'Asia/Ho_Chi_Minh',
      error: 'Múi giờ hệ thống hiện tại chỉ hỗ trợ Asia/Ho_Chi_Minh (Việt Nam UTC+07:00).',
    };
  }

  return {
    valid: true,
    normalized: clean,
  };
}

/**
 * Định dạng số điện thoại hiển thị thân thiện:
 * Ví dụ:
 * - 0901234567 -> 0901 234 567
 * - 02838446480 -> 028 3844 6480
 */
export function formatPhoneNumberVi(phoneStr?: string | null): string {
  if (!phoneStr) return 'Chưa cấu hình';
  const clean = String(phoneStr).trim().replace(/[\s\.\-\(\)]/g, '');
  if (/^02[0-9]{9}$/.test(clean)) {
    // Cố định 11 chữ số (vd 028 3844 6480 hoặc 024 3844 6480)
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  if (/^0[3|5|7|8|9][0-9]{8}$/.test(clean)) {
    // Di động 10 chữ số (vd 0901 234 567)
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phoneStr;
}
