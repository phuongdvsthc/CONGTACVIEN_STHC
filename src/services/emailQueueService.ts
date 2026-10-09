/**
 * STHC_CTV - Dịch vụ Nền tảng Hàng đợi Email (Email Queue Foundation - C3.10A)
 * File: /src/services/emailQueueService.ts
 *
 * Nhiệm vụ:
 * 1. Định nghĩa quy tắc tạo khóa chống trùng (Idempotency Key) chuẩn cho 2 luồng:
 *    - LEAD_REGISTRATION_CONFIRMATION: lead-registration:{lead_id}
 *    - CTV_NOTIFICATION_EMAIL: ctv-notification:{notification_recipient_id}
 * 2. Xây dựng bản chụp dữ liệu (Snapshot Payload) an toàn dùng để dựng email (không chứa bí mật/token).
 * 3. Kiểm tra tính hợp lệ và xử lý trạng thái BLOCKED khi thiếu official_registration_url hoặc dữ liệu.
 * 4. Hỗ trợ thao tác Enqueue an toàn (chuẩn bị cho C3.10B tích hợp cùng transaction đăng ký lead).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  EmailJobType,
  EmailJobStatus,
  EmailJobDTO,
  EmailJobAttemptDTO,
  LeadRegistrationEmailPayload,
  CtvNotificationEmailPayload,
  EnqueueEmailJobParams,
  EnqueueEmailJobResult,
  SubmitLeadAtomicParams,
  SubmitLeadAtomicResult,
} from '../types';

/**
 * Danh sách các từ khóa nhạy cảm tuyệt đối không được xuất hiện trong payload hoặc metadata email
 */
const FORBIDDEN_SECURITY_KEYS = [
  'password',
  'token',
  'secret',
  'smtp_password',
  'apiKey',
  'api_key',
  'service_role_key',
  'authorization',
  'access_token',
  'refresh_token',
];

/**
 * Sinh khóa chống trùng lặp nghiệp vụ cho email xác nhận đăng ký lead
 * Quy ước: lead-registration:{lead_id}
 */
export function buildLeadRegistrationIdempotencyKey(leadId: string): string {
  const cleanId = String(leadId || '').trim();
  if (!cleanId) {
    throw new Error('LEAD_ID_REQUIRED: Không thể sinh idempotency_key khi thiếu lead_id');
  }
  return `lead-registration:${cleanId}`;
}

/**
 * Sinh khóa chống trùng lặp nghiệp vụ cho email thông báo CTV
 * Quy ước: ctv-notification:{notification_recipient_id}
 */
export function buildCtvNotificationIdempotencyKey(notificationRecipientId: string): string {
  const cleanId = String(notificationRecipientId || '').trim();
  if (!cleanId) {
    throw new Error('NOTIFICATION_RECIPIENT_ID_REQUIRED: Không thể sinh idempotency_key khi thiếu notification_recipient_id');
  }
  return `ctv-notification:${cleanId}`;
}

/**
 * Làm sạch và loại bỏ các trường bí mật khỏi payload/metadata
 */
export function sanitizeEmailPayload<T extends Record<string, any>>(rawPayload: T): T {
  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {} as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    const lowerKey = key.toLowerCase();
    const isForbidden = FORBIDDEN_SECURITY_KEYS.some((f) => lowerKey.includes(f.toLowerCase()));
    if (!isForbidden) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = sanitizeEmailPayload(value);
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned as T;
}

/**
 * Kiểm tra địa chỉ email hợp lệ cơ bản theo RFC 5322
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 255) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(clean);
}

/**
 * Kiểm tra tính hợp lệ của URL đăng ký EGOV chính thức
 */
export function isValidOfficialRegistrationUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  try {
    const parsed = new URL(clean);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Xây dựng bản chụp dữ liệu (Snapshot Payload) cho email xác nhận đăng ký lead
 * Xác định trạng thái BLOCKED nếu khóa học chưa có official_registration_url
 */
export function buildLeadRegistrationSnapshot(params: {
  customerName: string;
  phone?: string | null;
  courseCode?: string | null;
  courseTitle: string;
  affiliateCode?: string | null;
  affiliateName?: string | null;
  officialRegistrationUrl?: string | null;
  registeredAt?: string;
  brandName?: string;
  supportEmail?: string;
  supportHotline?: string;
}): {
  payload: LeadRegistrationEmailPayload;
  initialStatus: EmailJobStatus;
  blockedReason?: string;
} {
  const hasValidUrl = isValidOfficialRegistrationUrl(params.officialRegistrationUrl);
  const nowIso = params.registeredAt || new Date().toISOString();

  // Ẩn 3 chữ số giữa của số điện thoại để bảo vệ PII
  const rawPhone = (params.phone || '').trim();
  let phoneMasked: string | undefined = undefined;
  if (rawPhone.length >= 8) {
    phoneMasked = `${rawPhone.slice(0, 3)}***${rawPhone.slice(-3)}`;
  }

  const payload: LeadRegistrationEmailPayload = {
    customer_name: params.customerName.trim(),
    phone_masked: phoneMasked,
    course_code: params.courseCode?.trim() || undefined,
    course_title: params.courseTitle.trim(),
    affiliate_code: params.affiliateCode?.trim() || undefined,
    affiliate_name: params.affiliateName?.trim() || undefined,
    official_registration_url: hasValidUrl ? params.officialRegistrationUrl!.trim() : undefined,
    registered_at: nowIso,
    brand_name: params.brandName?.trim() || 'Trường Cao đẳng STHC',
    support_email: params.supportEmail?.trim() || 'tuyensinh@sthc.edu.vn',
    support_hotline: params.supportHotline?.trim() || '1900 1234',
  };

  if (!hasValidUrl) {
    return {
      payload,
      initialStatus: 'BLOCKED',
      blockedReason: 'MISSING_OFFICIAL_REGISTRATION_URL: Khóa học chưa được cấu hình đường dẫn đăng ký chính thức trên cổng tuyển sinh EGOV.',
    };
  }

  return {
    payload,
    initialStatus: 'PENDING',
    blockedReason: undefined,
  };
}

/**
 * Xây dựng bản chụp dữ liệu (Snapshot Payload) cho email thông báo CTV
 */
export function buildCtvNotificationSnapshot(params: {
  affiliateName: string;
  affiliateCode: string;
  notificationTitle: string;
  notificationSummary?: string | null;
  actionUrl?: string | null;
  publishedAt?: string;
  brandName?: string;
  supportEmail?: string;
}): CtvNotificationEmailPayload {
  return {
    affiliate_name: params.affiliateName.trim(),
    affiliate_code: params.affiliateCode.trim(),
    notification_title: params.notificationTitle.trim(),
    notification_summary: params.notificationSummary?.trim() || undefined,
    action_url: params.actionUrl?.trim() || undefined,
    published_at: params.publishedAt || new Date().toISOString(),
    brand_name: params.brandName?.trim() || 'Cổng Đại sứ Tuyển sinh STHC',
    support_email: params.supportEmail?.trim() || 'tuyensinh@sthc.edu.vn',
  };
}

/**
 * Kiểm tra toàn vẹn dữ liệu trước khi Enqueue
 */
export function validateEmailJobParams(params: EnqueueEmailJobParams): { valid: boolean; error?: string } {
  if (!params.email_type || !['LEAD_REGISTRATION_CONFIRMATION', 'CTV_NOTIFICATION_EMAIL'].includes(params.email_type)) {
    return { valid: false, error: 'INVALID_EMAIL_TYPE: Loại email không hợp lệ.' };
  }

  if (!params.idempotency_key || !params.idempotency_key.trim()) {
    return { valid: false, error: 'MISSING_IDEMPOTENCY_KEY: idempotency_key là bắt buộc.' };
  }

  if (!isValidEmailFormat(params.recipient_email)) {
    return { valid: false, error: 'INVALID_RECIPIENT_EMAIL: Định dạng email người nhận không hợp lệ.' };
  }

  if (!params.template_code || !params.template_code.trim()) {
    return { valid: false, error: 'MISSING_TEMPLATE_CODE: template_code là bắt buộc.' };
  }

  if (params.email_type === 'LEAD_REGISTRATION_CONFIRMATION') {
    if (!params.lead_id) {
      return { valid: false, error: 'LEAD_ID_REQUIRED: Xác nhận lead bắt buộc phải có lead_id.' };
    }
    if (params.notification_id || params.notification_recipient_id) {
      return { valid: false, error: 'PURPOSE_MIXING: Xác nhận lead không được chứa thông tin notification_id/recipient_id.' };
    }
  }

  if (params.email_type === 'CTV_NOTIFICATION_EMAIL') {
    if (!params.notification_id || !params.notification_recipient_id || !params.recipient_user_id) {
      return {
        valid: false,
        error: 'CTV_NOTIFICATION_REFS_REQUIRED: Email thông báo CTV bắt buộc phải có notification_id, notification_recipient_id và recipient_user_id.',
      };
    }
    if (params.lead_id) {
      return { valid: false, error: 'PURPOSE_MIXING: Email CTV không được chứa thông tin lead_id.' };
    }
  }

  return { valid: true };
}

/**
 * Service Class quản lý hàng đợi email nền tảng (C3.10A)
 */
export class EmailQueueService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Enqueue một tác vụ email vào CSDL với cơ chế kiểm tra trùng lặp nguyên tử
   */
  async enqueueJob(params: EnqueueEmailJobParams): Promise<EnqueueEmailJobResult> {
    const validation = validateEmailJobParams(params);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        code: 'VALIDATION_ERROR',
      };
    }

    const cleanPayload = sanitizeEmailPayload(params.payload || {});

    // Ưu tiên gọi RPC fn_enqueue_email_job nếu đã được cài đặt trên CSDL
    try {
      const { data: rpcRes, error: rpcErr } = await this.supabase.rpc('fn_enqueue_email_job', {
        p_email_type: params.email_type,
        p_idempotency_key: params.idempotency_key.trim(),
        p_recipient_email: params.recipient_email.trim().toLowerCase(),
        p_recipient_name: params.recipient_name?.trim() || null,
        p_template_code: params.template_code.trim(),
        p_payload: cleanPayload,
        p_lead_id: params.lead_id || null,
        p_notification_id: params.notification_id || null,
        p_notification_recipient_id: params.notification_recipient_id || null,
        p_recipient_user_id: params.recipient_user_id || null,
        p_template_version: params.template_version || 'v1',
        p_priority: params.priority ?? 100,
        p_initial_status: params.initial_status || 'PENDING',
        p_blocked_reason: params.blocked_reason || null,
      });

      if (!rpcErr && rpcRes) {
        return rpcRes as EnqueueEmailJobResult;
      }
    } catch {
      // Fallback xuống insert bảng trực tiếp nếu RPC chưa có trong schema cache
    }

    // Direct table insert fallback
    try {
      // Kiểm tra idempotency_key trước
      const { data: existing } = await this.supabase
        .from('email_jobs')
        .select('id, email_type, recipient_email, lead_id, notification_recipient_id, status')
        .eq('idempotency_key', params.idempotency_key.trim())
        .maybeSingle();

      if (existing) {
        // Kiểm tra xung đột dữ liệu
        const isConflict =
          existing.email_type !== params.email_type ||
          existing.recipient_email.toLowerCase() !== params.recipient_email.trim().toLowerCase() ||
          (params.lead_id && existing.lead_id !== params.lead_id) ||
          (params.notification_recipient_id && existing.notification_recipient_id !== params.notification_recipient_id);

        if (isConflict) {
          return {
            success: false,
            code: 'IDEMPOTENCY_CONFLICT',
            error: 'Khóa chống trùng (idempotency_key) đã tồn tại nhưng dữ liệu người nhận hoặc thực thể liên kết không khớp.',
          };
        }

        return {
          success: true,
          is_duplicate: true,
          job_id: existing.id,
          status: existing.status,
          message: 'Tác vụ email đã tồn tại trước đó cho thực thể này.',
        };
      }

      const insertRecord = {
        email_type: params.email_type,
        idempotency_key: params.idempotency_key.trim(),
        recipient_email: params.recipient_email.trim().toLowerCase(),
        recipient_name: params.recipient_name?.trim() || null,
        recipient_user_id: params.recipient_user_id || null,
        lead_id: params.lead_id || null,
        notification_id: params.notification_id || null,
        notification_recipient_id: params.notification_recipient_id || null,
        template_code: params.template_code.trim(),
        template_version: params.template_version || 'v1',
        payload: cleanPayload,
        status: params.initial_status || 'PENDING',
        priority: params.priority ?? 100,
        next_attempt_at: new Date().toISOString(),
        blocked_reason: params.blocked_reason || null,
      };

      const { data: inserted, error: insErr } = await this.supabase
        .from('email_jobs')
        .insert(insertRecord)
        .select('id, status')
        .single();

      if (insErr) {
        // Bắt lỗi trùng lặp do Race Condition (2 concurrent requests)
        if (insErr.code === '23505' || insErr.message?.includes('duplicate key')) {
          const { data: raceExisting } = await this.supabase
            .from('email_jobs')
            .select('id, status')
            .eq('idempotency_key', params.idempotency_key.trim())
            .single();

          if (raceExisting) {
            return {
              success: true,
              is_duplicate: true,
              job_id: raceExisting.id,
              status: raceExisting.status,
              message: 'Tác vụ email đã tồn tại (Race condition resolved).',
            };
          }
        }

        return {
          success: false,
          error: insErr.message,
          code: insErr.code,
        };
      }

      return {
        success: true,
        is_duplicate: false,
        job_id: inserted.id,
        status: inserted.status,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi không xác định khi lưu tác vụ email.',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Tra cứu tác vụ email theo ID
   */
  async getJobById(id: string): Promise<EmailJobDTO | null> {
    const { data } = await this.supabase
      .from('email_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return data || null;
  }

  /**
   * Tra cứu tác vụ email theo Idempotency Key
   */
  async getJobByIdempotencyKey(key: string): Promise<EmailJobDTO | null> {
    const { data } = await this.supabase
      .from('email_jobs')
      .select('*')
      .eq('idempotency_key', key.trim())
      .maybeSingle();
    return data || null;
  }

  /**
   * Lấy danh sách lịch sử attempts của một tác vụ
   */
  async getAttemptsByJobId(jobId: string): Promise<EmailJobAttemptDTO[]> {
    const { data } = await this.supabase
      .from('email_job_attempts')
      .select('*')
      .eq('email_job_id', jobId)
      .order('attempt_number', { ascending: false });
    return (data as EmailJobAttemptDTO[]) || [];
  }

  /**
   * Gọi RPC nguyên tử fn_submit_lead_with_confirmation_email (C3.10B)
   * Tạo lead và enqueue email job trong cùng một transaction database.
   */
  async submitLeadWithAtomicConfirmationEmail(
    params: SubmitLeadAtomicParams
  ): Promise<SubmitLeadAtomicResult> {
    const { data, error } = await this.supabase.rpc('fn_submit_lead_with_confirmation_email', {
      p_full_name: params.full_name.trim(),
      p_phone: params.phone.trim(),
      p_email: params.email.trim().toLowerCase(),
      p_course_id: params.course_id,
      p_consent_accepted: params.consent_accepted,
      p_affiliate_code: params.affiliate_code ? params.affiliate_code.trim() : null,
      p_province: params.province ? params.province.trim() : null,
      p_preferred_contact_time: params.preferred_contact_time || 'Giờ hành chính (08h - 17h)',
      p_customer_note: params.customer_note ? params.customer_note.trim() : null,
      p_utm_source: params.utm_source || 'direct',
      p_utm_medium: params.utm_medium || (params.affiliate_code ? 'affiliate_link' : 'organic'),
      p_utm_campaign: params.utm_campaign || 'tuyensinh_2026',
      p_brand_name: params.brand_name || 'Trường Saigontourist',
      p_support_email: params.support_email || 'tuyensinh@sthc.edu.vn',
      p_support_hotline: params.support_hotline || '02838442238',
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Lỗi khi gọi RPC đăng ký lead nguyên tử.',
        code: error.code || 'RPC_ERROR',
      };
    }

    return (data as SubmitLeadAtomicResult) || {
      success: false,
      error: 'Không nhận được kết quả từ máy chủ CSDL.',
      code: 'EMPTY_RESPONSE',
    };
  }
}

