/**
 * STHC_CTV - Bộ kết xuất Mẫu Email Backend (Email Template Renderer - C3.11B)
 * File: /src/services/emailTemplateRenderer.ts
 *
 * Nhiệm vụ:
 * 1. Nhận phiên bản mẫu email đã xuất bản (immutable version) và snapshot payload của job/preview.
 * 2. Thay thế các biến chuẩn ({{customer_name}}, {{course_title}}, {{affiliate_name}}, v.v.) an toàn.
 * 3. Xử lý khối điều kiện (ví dụ: hiển thị/ẩn thông tin CTV).
 * 4. Kiểm tra URL EGOV và làm sạch HTML (chặn script, iframe, javascript:).
 * 5. Trả về đối tượng đã kết xuất: { subject, html, text }.
 */

export interface RenderEmailInput {
  subject: string;
  body_html: string;
  body_text: string;
  button_label?: string;
  footer_text?: string;
  payload: Record<string, any>;
}

export interface RenderEmailResult {
  success: boolean;
  subject?: string;
  html?: string;
  text?: string;
  error?: string;
}

/**
 * Làm sạch HTML cơ bản chống XSS, script, iframe, form, javascript:
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let cleaned = html;
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*(?:\"[^\"]*\"|\'[^\']*\'|[^\s>]+)/gi, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, 'about:blank');
  return cleaned;
}

/**
 * Kiểm tra tính hợp lệ của official_registration_url
 */
export function validateRegistrationUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false;
  }
  if (trimmed.toLowerCase().includes('javascript:') || trimmed.toLowerCase().includes('data:')) {
    return false;
  }
  return true;
}

/**
 * Kết xuất mẫu email với payload
 */
export function renderEmailTemplate(input: RenderEmailInput): RenderEmailResult {
  try {
    const { subject, body_html, body_text, button_label, footer_text, payload } = input;

    if (!subject || !body_html) {
      return { success: false, error: 'Thiếu tiêu đề hoặc nội dung HTML của mẫu email.' };
    }

    const data: Record<string, any> = {
      customer_name: payload.customer_name || payload.full_name || 'Quý khách',
      full_name: payload.customer_name || payload.full_name || 'Quý khách',
      course_code: payload.course_code || 'KHOA_HOC',
      course_title: payload.course_title || 'Khóa học tuyển sinh',
      affiliate_code: payload.affiliate_code || '',
      affiliate_name: payload.affiliate_name || '',
      notification_title: payload.notification_title || 'Thông báo hệ thống',
      notification_summary: payload.notification_summary || '',
      action_url: validateRegistrationUrl(payload.action_url) ? payload.action_url : '#',
      published_at: payload.published_at ? new Date(payload.published_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      registered_at: payload.registered_at ? new Date(payload.registered_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      brand_name: payload.brand_name || 'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
      support_email: payload.support_email || 'tuyensinh@sthc.edu.vn',
      support_hotline: payload.support_hotline || '02838442238',
      official_registration_url: validateRegistrationUrl(payload.official_registration_url) ? payload.official_registration_url : '#',
      button_label: button_label || 'Hoàn tất hồ sơ đăng ký',
      unit_name: payload.unit_name || 'Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC)',
    };

    const hasAffiliate = Boolean(data.affiliate_name && data.affiliate_code);

    let processedHtml = body_html;
    let processedText = body_text || '';
    let processedSubject = subject;

    const affiliateBlockRegex = /\{\{#if\s+affiliate_name\}\}([\s\S]*?)\{\{\/if\}\}/gi;
    
    if (hasAffiliate) {
      processedHtml = processedHtml.replace(affiliateBlockRegex, '$1');
      processedText = processedText.replace(affiliateBlockRegex, '$1');
    } else {
      processedHtml = processedHtml.replace(affiliateBlockRegex, '');
      processedText = processedText.replace(affiliateBlockRegex, '');
    }

    const replaceVariables = (templateStr: string) => {
      return templateStr.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
        if (data[key] !== undefined && data[key] !== null) {
          return String(data[key]);
        }
        return '';
      });
    };

    processedSubject = replaceVariables(processedSubject);
    processedHtml = replaceVariables(processedHtml);
    processedText = replaceVariables(processedText);

    processedSubject = processedSubject.replace(/[\r\n]+/g, ' ').trim();
    const sanitizedHtml = sanitizeHtml(processedHtml);

    return {
      success: true,
      subject: processedSubject,
      html: sanitizedHtml,
      text: processedText.trim(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi khi kết xuất mẫu email.' };
  }
}
