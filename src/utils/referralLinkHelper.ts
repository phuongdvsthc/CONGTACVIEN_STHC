/**
 * ==============================================================================
 * STHC_CTV - Bộ công cụ Liên kết Giới thiệu Tuyển sinh & Mã QR (Referral Link Helper)
 * Đồng bộ với cấu hình public_base_url theo đặc tả A7.5
 * ==============================================================================
 */

import { validatePublicBaseUrl } from './operationValidation';

export interface ReferralResolutionResult {
  url: string | null;
  error: string | null;
}

/**
 * Chuẩn hóa Base URL: loại bỏ trailing slash, bắt buộc HTTPS
 */
export function sanitizeBaseUrl(rawUrl?: string | null): { valid: boolean; normalized: string; error?: string } {
  const result = validatePublicBaseUrl(rawUrl);
  if (!result.valid) {
    return {
      valid: false,
      normalized: '',
      error: result.error || 'URL công khai không hợp lệ.',
    };
  }
  return {
    valid: true,
    normalized: result.normalized,
  };
}

/**
 * Tạo liên kết giới thiệu khóa học tuyển sinh cho CTV
 * Cấu trúc chuẩn thống nhất: /?ref=[mã CTV]&course=[mã/slug khóa học]
 */
export function buildCourseReferralUrl(
  baseUrl: string | null | undefined,
  affiliateCode: string,
  courseSlugOrCode: string
): ReferralResolutionResult {
  const baseCheck = sanitizeBaseUrl(baseUrl);
  if (!baseCheck.valid) {
    return { url: null, error: baseCheck.error || 'Chưa có URL công khai chính thức hợp lệ.' };
  }

  if (!affiliateCode || !affiliateCode.trim()) {
    return { url: null, error: 'Thiếu mã định danh Cộng tác viên (affiliate_code).' };
  }

  if (!courseSlugOrCode || !courseSlugOrCode.trim()) {
    return { url: null, error: 'Thiếu mã hoặc đường dẫn định danh khóa học.' };
  }

  const cleanBase = baseCheck.normalized;
  const cleanAff = encodeURIComponent(affiliateCode.trim());
  const cleanCourse = encodeURIComponent(courseSlugOrCode.trim());

  return {
    url: `${cleanBase}/?ref=${cleanAff}&course=${cleanCourse}`,
    error: null,
  };
}

/**
 * Tạo liên kết danh mục khóa học của CTV
 * Cấu trúc chuẩn thống nhất: /catalog?ref=[mã CTV]
 */
export function buildCatalogReferralUrl(
  baseUrl: string | null | undefined,
  affiliateCode: string
): ReferralResolutionResult {
  const baseCheck = sanitizeBaseUrl(baseUrl);
  if (!baseCheck.valid) {
    return { url: null, error: baseCheck.error || 'Chưa có URL công khai chính thức hợp lệ.' };
  }

  if (!affiliateCode || !affiliateCode.trim()) {
    return { url: null, error: 'Thiếu mã định danh Cộng tác viên (affiliate_code).' };
  }

  const cleanBase = baseCheck.normalized;
  const cleanAff = encodeURIComponent(affiliateCode.trim());

  return {
    url: `${cleanBase}/catalog?ref=${cleanAff}`,
    error: null,
  };
}
