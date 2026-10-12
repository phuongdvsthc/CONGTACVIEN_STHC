/**
 * STHC_CTV - Worker Xử lý Hàng đợi Gửi Email Tự động (Email Queue Worker - C3.12A)
 * File: /src/services/emailWorker.ts
 *
 * Nhiệm vụ:
 * 1. Claim tác vụ an toàn bằng fn_claim_email_jobs (hỗ trợ fallback nếu RPC gặp lỗi schema/ambiguous column).
 * 2. Đọc cấu hình SMTP đã lưu trong system_settings (kèm giải mã mật khẩu an toàn).
 * 3. Đọc đúng phiên bản mẫu (PUBLISHED hoặc ARCHIVED tương thích) từ email_template_versions.
 * 4. Render nội dung qua emailTemplateRenderer.ts.
 * 5. Gửi qua SMTP bằng SmtpEmailSender (C3.11A).
 * 6. Kiểm tra an toàn: Nếu email LEAD_REGISTRATION_CONFIRMATION thiếu official_registration_url -> Chuyển BLOCKED.
 * 7. Ghi nhận kết quả và lịch sử qua fn_complete_email_job.
 * 8. Giám sát runtime: Theo dõi heartbeat, poll interval, lỗi gần nhất đã làm sạch (sanitized).
 * 9. Kiểm soát bởi CẢ HAI công tắc: EMAIL_WORKER_ENABLED=true (máy chủ) VÀ email_business_enabled=true (nghiệp vụ CSDL).
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { SmtpEmailSender, getSmtpCredentials, DEFAULT_EMAIL_SERVICE_SETTINGS, maskEmailAddress } from './emailService';
import { renderEmailTemplate } from './emailTemplateRenderer';
import { EmailServiceSettings } from '../types';

let workerIntervalId: NodeJS.Timeout | null = null;
let isRunning = false;
const workerInstanceId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;

export interface EmailWorkerRuntimeStatus {
  instance_id: string;
  worker_enabled_env: boolean;
  email_business_enabled: boolean;
  operational_status: 'ACTIVE_HEALTHY' | 'STALE' | 'SERVER_DISABLED' | 'BUSINESS_DISABLED' | 'NOT_STARTED';
  operational_label: string;
  is_polling: boolean;
  is_processing: boolean;
  poll_interval_ms: number;
  last_poll_at: string | null;
  last_claim_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  jobs_claimed_count: number;
  jobs_sent_count: number;
  jobs_failed_count: number;
  last_processed_job_id: string | null;
  last_processed_recipient_masked: string | null;
}

// In-memory runtime telemetry state
const runtimeState: {
  last_poll_at: string | null;
  last_claim_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  jobs_claimed_count: number;
  jobs_sent_count: number;
  jobs_failed_count: number;
  last_processed_job_id: string | null;
  last_processed_recipient_masked: string | null;
  last_known_business_enabled: boolean;
} = {
  last_poll_at: null,
  last_claim_at: null,
  last_success_at: null,
  last_error_at: null,
  last_error_code: null,
  last_error_message: null,
  jobs_claimed_count: 0,
  jobs_sent_count: 0,
  jobs_failed_count: 0,
  last_processed_job_id: null,
  last_processed_recipient_masked: null,
  last_known_business_enabled: false,
};

/**
 * Làm sạch thông điệp lỗi để bảo vệ bí mật, token và thông tin nhạy cảm
 */
function sanitizeWorkerErrorMessage(raw?: string | null): string {
  if (!raw) return 'Lỗi không xác định';
  let clean = String(raw);
  clean = clean.replace(/([Pp]assword|[Ss]ecret|[Tt]oken|[Kk]ey)\s*[:=]\s*['"]?[^'"\s\\]+['"]?/g, '$1=[REDACTED]');
  clean = clean.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  clean = clean.replace(/smtp:\/\/[^@]+@/gi, 'smtp://***:***@');
  return clean.slice(0, 400);
}

function recordWorkerError(code: string, message: string) {
  runtimeState.last_error_at = new Date().toISOString();
  runtimeState.last_error_code = code;
  runtimeState.last_error_message = sanitizeWorkerErrorMessage(message);
}

// Khởi tạo Supabase Admin client với service_role key cho worker
function getSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Đọc cấu hình dịch vụ email từ system_settings trong CSDL, bao gồm cả thông tin đăng nhập SMTP đã lưu
 */
async function fetchEmailServiceConfig(supabase: any): Promise<{
  config: EmailServiceSettings;
  rawSettings: any;
}> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      runtimeState.last_known_business_enabled = Boolean(data.email_business_enabled);
      const config: EmailServiceSettings = {
        email_business_enabled: Boolean(data.email_business_enabled),
        smtp_host: data.smtp_host || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_host,
        smtp_port: data.smtp_port ?? DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_port,
        smtp_secure_mode: data.smtp_secure_mode || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_secure_mode,
        smtp_sender_name: data.smtp_sender_name || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_sender_name,
        smtp_sender_email: data.smtp_sender_email || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_sender_email,
        smtp_reply_to: data.smtp_reply_to || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_reply_to,
        smtp_timeout_ms: data.smtp_timeout_ms ?? DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_timeout_ms,
        smtp_username: data.smtp_username || undefined,
      };
      return { config, rawSettings: data };
    }
  } catch (e: any) {
    console.warn('[EMAIL WORKER] Không thể đọc cấu hình system_settings từ CSDL:', e?.message);
    recordWorkerError('CONFIG_FETCH_FAILED', e?.message);
  }
  return { config: DEFAULT_EMAIL_SERVICE_SETTINGS, rawSettings: null };
}

/**
 * Cơ chế Claim Fallback trực tiếp bằng service_role khi RPC gặp lỗi (như lỗi ambiguity trong SQL chưa migrate)
 */
async function claimEmailJobsFallback(
  supabase: any,
  workerId: string,
  batchSize = 5,
  lockDurationSeconds = 300
): Promise<any[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const lockedUntilIso = new Date(now.getTime() + lockDurationSeconds * 1000).toISOString();

  // 1. Quét thu hồi stale locks
  try {
    await supabase
      .from('email_jobs')
      .update({
        status: 'RETRY_WAIT',
        locked_by: null,
        locked_at: null,
        locked_until: null,
        lock_token: null,
        last_error_code: 'LOCK_TIMEOUT',
        last_error_message: 'Worker giữ khóa quá thời hạn mà không hoàn tất (Stale Lock)',
        updated_at: nowIso,
      })
      .eq('status', 'PROCESSING')
      .lt('locked_until', nowIso);
  } catch (e) {}

  // 2. Lấy các job PENDING hoặc RETRY_WAIT đã đến hạn
  const { data: candidates, error: cErr } = await supabase
    .from('email_jobs')
    .select('id, attempt_count, max_attempts')
    .in('email_type', ['LEAD_REGISTRATION_CONFIRMATION', 'CTV_NOTIFICATION_EMAIL'])
    .in('status', ['PENDING', 'RETRY_WAIT'])
    .lte('next_attempt_at', nowIso)
    .order('priority', { ascending: false })
    .order('next_attempt_at', { ascending: true })
    .limit(batchSize);

  if (cErr || !candidates || candidates.length === 0) {
    return [];
  }

  const claimed: any[] = [];
  for (const cand of candidates) {
    if (cand.attempt_count >= cand.max_attempts) {
      await supabase
        .from('email_jobs')
        .update({ status: 'DEAD_LETTER', updated_at: nowIso })
        .eq('id', cand.id);
      continue;
    }

    const lockToken = crypto.randomUUID();
    const { data: updatedJob, error: uErr } = await supabase
      .from('email_jobs')
      .update({
        status: 'PROCESSING',
        locked_by: workerId,
        locked_at: nowIso,
        locked_until: lockedUntilIso,
        lock_token: lockToken,
        attempt_count: (cand.attempt_count || 0) + 1,
        updated_at: nowIso,
      })
      .eq('id', cand.id)
      .in('status', ['PENDING', 'RETRY_WAIT'])
      .select('*')
      .maybeSingle();

    if (!uErr && updatedJob) {
      claimed.push({
        job_id: updatedJob.id,
        lock_token: updatedJob.lock_token,
        email_type: updatedJob.email_type,
        recipient_email: updatedJob.recipient_email,
        recipient_name: updatedJob.recipient_name,
        template_code: updatedJob.template_code,
        template_version: updatedJob.template_version,
        template_version_id: (updatedJob as any).template_version_id || null,
        payload: updatedJob.payload,
        attempt_count: updatedJob.attempt_count,
        max_attempts: updatedJob.max_attempts,
      });
    }
  }

  return claimed;
}

/**
 * Xử lý một batch tác vụ email
 */
export async function processEmailBatch() {
  if (isRunning) return;
  isRunning = true;

  runtimeState.last_poll_at = new Date().toISOString();

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    isRunning = false;
    recordWorkerError('SUPABASE_CLIENT_MISSING', 'Không thể khởi tạo client quản trị Supabase.');
    return;
  }

  try {
    // 1. Kiểm tra công tắc hệ thống
    const { config, rawSettings } = await fetchEmailServiceConfig(supabase);

    // Công tắc 1: CSDL (Nghiệp vụ do Admin quản lý)
    if (!config.email_business_enabled) {
      isRunning = false;
      return;
    }

    // Công tắc 2: Biến môi trường máy chủ (Bảo vệ môi trường chạy)
    const workerEnabledEnv = (process.env.EMAIL_WORKER_ENABLED || 'false').toLowerCase() === 'true';
    if (!workerEnabledEnv) {
      isRunning = false;
      return;
    }

    // 2. Claim batch tác vụ bằng RPC fn_claim_email_jobs (kèm fallback an toàn)
    let claimedJobs: any[] = [];
    const { data: rpcClaimed, error: claimErr } = await supabase.rpc('fn_claim_email_jobs', {
      p_worker_id: workerInstanceId,
      p_batch_size: 5,
      p_lock_duration_seconds: 300,
    });

    if (claimErr) {
      console.warn('[EMAIL WORKER] RPC fn_claim_email_jobs báo lỗi, chuyển sang cơ chế claim an toàn trực tiếp:', claimErr.message);
      recordWorkerError('RPC_CLAIM_WARNING', `RPC claim thất bại: ${claimErr.message}. Đã kích hoạt cơ chế claim trực tiếp.`);
      claimedJobs = await claimEmailJobsFallback(supabase, workerInstanceId, 5, 300);
    } else {
      claimedJobs = rpcClaimed || [];
    }

    if (!claimedJobs || claimedJobs.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`[EMAIL WORKER] Đã claim thành công ${claimedJobs.length} tác vụ email.`);
    runtimeState.last_claim_at = new Date().toISOString();
    runtimeState.jobs_claimed_count += claimedJobs.length;

    // Lấy credentials SMTP ưu tiên từ dữ liệu Admin đã cấu hình trong CSDL
    const credentials = getSmtpCredentials(rawSettings || config);
    if (!credentials.user || !credentials.pass) {
      console.error('[EMAIL WORKER] Thiếu thông tin đăng nhập SMTP (Username hoặc Password) để gửi email.');
      recordWorkerError('MISSING_SMTP_CREDENTIALS', 'Chưa có thông tin xác thực SMTP (Username hoặc Password) trong CSDL hoặc biến môi trường.');
      // Trả lại các job đã claim về RETRY_WAIT
      for (const job of claimedJobs) {
        await supabase.rpc('fn_complete_email_job', {
          p_job_id: job.job_id,
          p_lock_token: job.lock_token,
          p_status: 'RETRY_WAIT',
          p_error_code: 'MISSING_SMTP_CREDENTIALS',
          p_error_message: 'Hệ thống chưa có thông tin xác thực SMTP để gửi thư.',
          p_retry_delay_seconds: 300,
        });
      }
      isRunning = false;
      return;
    }

    const sender = new SmtpEmailSender(config, credentials);

    // 3. Xử lý từng tác vụ trong batch
    for (const job of claimedJobs) {
      const jobId = job.job_id;
      const lockToken = job.lock_token;
      const templateCode = job.template_code;
      const templateVersionCode = job.template_version;
      const recipientEmail = job.recipient_email;
      const payload = job.payload || {};

      const maskedRecipient = maskEmailAddress(recipientEmail);
      runtimeState.last_processed_job_id = jobId;
      runtimeState.last_processed_recipient_masked = maskedRecipient;

      try {
        // A. Kiểm tra an toàn: Nếu là LEAD_REGISTRATION_CONFIRMATION mà thiếu official_registration_url -> Chuyển BLOCKED
        if (job.email_type === 'LEAD_REGISTRATION_CONFIRMATION') {
          const officialUrl = (payload?.official_registration_url || '').trim();
          if (!officialUrl || (!officialUrl.startsWith('https://') && !officialUrl.startsWith('http://'))) {
            await supabase.rpc('fn_complete_email_job', {
              p_job_id: jobId,
              p_lock_token: lockToken,
              p_status: 'BLOCKED',
              p_error_code: 'MISSING_OFFICIAL_REGISTRATION_URL',
              p_error_message: 'Khóa học chưa được cấu hình đường dẫn đăng ký chính thức trên cổng tuyển sinh EGOV.',
            });
            console.warn(`[EMAIL WORKER] Chặn gửi email Job ${jobId} do thiếu official_registration_url`);
            runtimeState.jobs_failed_count++;
            continue;
          }
        }

        // B. Tra cứu template và phiên bản trong CSDL
        const { data: templateData, error: tErr } = await supabase
          .from('email_templates')
          .select('id, template_code, is_active, current_version_id')
          .eq('template_code', templateCode)
          .single();

        if (tErr || !templateData) {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'BLOCKED',
            p_error_code: 'TEMPLATE_NOT_FOUND',
            p_error_message: `Không tìm thấy template_code: ${templateCode}`,
          });
          runtimeState.jobs_failed_count++;
          continue;
        }

        if (templateData.is_active === false) {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'BLOCKED',
            p_error_code: 'TEMPLATE_INACTIVE',
            p_error_message: `Mẫu email ${templateCode} hiện đang bị vô hiệu hóa (is_active = false).`,
          });
          runtimeState.jobs_failed_count++;
          continue;
        }

        let verData: any = null;

        // 1. Ưu tiên cao nhất: Tải đúng version_id gắn trên job (nếu có)
        if (job.template_version_id) {
          const { data: vById, error: vByIdErr } = await supabase
            .from('email_template_versions')
            .select('*')
            .eq('id', job.template_version_id)
            .maybeSingle();

          if (!vByIdErr && vById) {
            // Kiểm tra an toàn: Đảm bảo version_id thuộc đúng template này (chống nhầm lẫn cross-template)
            if (vById.template_id === templateData.id) {
              verData = vById;
            } else {
              console.warn(`[EMAIL WORKER] template_version_id ${job.template_version_id} không thuộc template ${templateCode}`);
            }
          }
        }

        // 2. Nếu chưa có verData (job cũ chỉ có template_version code hoặc chưa migrate version_id)
        if (!verData && templateVersionCode && templateVersionCode !== 'NONE') {
          const { data: vByCodeList } = await supabase
            .from('email_template_versions')
            .select('*')
            .eq('template_id', templateData.id)
            .eq('version_code', templateVersionCode)
            .in('status', ['PUBLISHED', 'ARCHIVED'])
            .order('published_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(1);

          if (vByCodeList && vByCodeList.length > 0) {
            verData = vByCodeList[0];
          }
        }

        // 3. Nếu vẫn chưa có (ví dụ job không có version code cụ thể hoặc là retry):
        // Tìm phiên bản PUBLISHED hiện tại của mẫu này qua current_version_id hoặc status = 'PUBLISHED'
        if (!verData) {
          if (templateData.current_version_id) {
            const { data: vCurr } = await supabase
              .from('email_template_versions')
              .select('*')
              .eq('id', templateData.current_version_id)
              .maybeSingle();
            if (vCurr && vCurr.template_id === templateData.id && vCurr.status === 'PUBLISHED') {
              verData = vCurr;
            }
          }
          if (!verData) {
            const { data: vPubList } = await supabase
              .from('email_template_versions')
              .select('*')
              .eq('template_id', templateData.id)
              .eq('status', 'PUBLISHED')
              .order('published_at', { ascending: false, nullsFirst: false })
              .limit(1);
            if (vPubList && vPubList.length > 0) {
              verData = vPubList[0];
            }
          }
        }

        // 4. Nếu tuyệt đối không tìm thấy phiên bản hợp lệ -> BLOCKED! Không fallback sang v1!
        if (!verData) {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'BLOCKED',
            p_error_code: 'TEMPLATE_VERSION_NOT_FOUND',
            p_error_message: `Không tìm thấy phiên bản mẫu email hợp lệ cho ${templateCode} (version_id: ${job.template_version_id || 'null'}, version_code: ${templateVersionCode || 'null'}).`,
          });
          runtimeState.jobs_failed_count++;
          continue;
        }

        console.log(`[EMAIL WORKER] Job ${jobId} sử dụng phiên bản mẫu: ${verData.version_code} (${verData.status}, id: ${verData.id}) cho template ${templateCode}`);

        // C. Render nội dung
        const renderResult = renderEmailTemplate({
          subject: verData.subject,
          body_html: verData.body_html,
          body_text: verData.body_text,
          button_label: verData.button_label,
          footer_text: verData.footer_text,
          payload,
        });

        if (!renderResult.success || !renderResult.subject || !renderResult.html) {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'DEAD_LETTER',
            p_error_code: 'RENDER_FAILED',
            p_error_message: renderResult.error || 'Lỗi kết xuất nội dung mẫu email.',
          });
          runtimeState.jobs_failed_count++;
          continue;
        }

        // D. Gửi qua SMTP
        const sendResult = await sender.sendEmail({
          to: recipientEmail,
          subject: renderResult.subject,
          html: renderResult.html,
          text: renderResult.text,
          replyTo: config.smtp_reply_to || undefined,
        });

        if (sendResult.success) {
          // Thành công -> Complete SENT
          const { error: completeErr } = await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'SENT',
            p_provider_message_id: sendResult.messageId || null,
          });

          if (completeErr) {
            console.error(`[EMAIL WORKER] SMTP thành công nhưng ghi kết quả DB lỗi cho job ${jobId}:`, completeErr.message);
          } else {
            console.log(`[EMAIL WORKER] Đã gửi thành công email tới ${maskedRecipient} (Job: ${jobId}, MsgID: ${sendResult.messageId || 'OK'})`);
            // Ghi nhận version metadata làm bằng chứng kiểm toán
            try {
              await supabase
                .from('email_jobs')
                .update({
                  metadata: {
                    ...(job.metadata || {}),
                    rendered_version_code: verData.version_code,
                    rendered_version_id: verData.id,
                    rendered_subject: renderResult.subject,
                  },
                  template_version_id: job.template_version_id || verData.id,
                })
                .eq('id', jobId);
            } catch (mErr) {}
          }

          runtimeState.last_success_at = new Date().toISOString();
          runtimeState.jobs_sent_count++;
        } else {
          // Thất bại tạm thời hoặc vĩnh viễn
          const errorCode = sendResult.code || 'SMTP_SEND_FAILED';
          const errorMsg = sendResult.error || 'Lỗi gửi SMTP.';
          const isPermanent = errorCode === 'INVALID_RECIPIENT_EMAIL' || errorCode === 'HEADER_INJECTION_DETECTED';

          const newStatus = isPermanent ? 'DEAD_LETTER' : 'RETRY_WAIT';
          const retryDelay = 300; // 5 phút backoff mặc định

          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: newStatus,
            p_error_code: errorCode,
            p_error_message: errorMsg,
            p_retry_delay_seconds: retryDelay,
          });

          if (newStatus === 'DEAD_LETTER') {
            try {
              await supabase.rpc('fn_dispatch_admin_staff_notification', {
                p_event_type: 'EMAIL_FAILED_FINAL',
                p_category: 'SYSTEM',
                p_title: 'Email nghiệp vụ gửi thất bại',
                p_summary: `Email gửi đến ${maskedRecipient} thất bại cuối cùng: ${errorMsg}`,
                p_content: `Tác vụ email ${jobId} (mẫu ${templateCode}) gửi đến người nhận ${recipientEmail} đã dừng xử lý. Lý do: ${errorMsg}`,
                p_action_url: '/admin/email-jobs',
                p_idempotency_key: `evt:admin:EMAIL_FAILED:${jobId}`,
                p_required_permission: 'email_service.view',
                p_source_entity_type: 'email_jobs',
                p_source_entity_id: jobId,
                p_metadata: { job_id: jobId, recipient_email: recipientEmail, error_code: errorCode, error_message: errorMsg },
              });
            } catch (_) {}
          }

          recordWorkerError(errorCode, errorMsg);
          runtimeState.jobs_failed_count++;
          console.warn(`[EMAIL WORKER] Gửi SMTP thất bại tới ${maskedRecipient} (Job: ${jobId}, Code: ${errorCode}): ${errorMsg}`);
        }
      } catch (jobEx: any) {
        console.error(`[EMAIL WORKER] Ngoại lệ xử lý job ${jobId}:`, jobEx?.message);
        recordWorkerError('WORKER_JOB_EXCEPTION', jobEx?.message || 'Ngoại lệ xử lý job.');
        runtimeState.jobs_failed_count++;
        try {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'RETRY_WAIT',
            p_error_code: 'WORKER_EXCEPTION',
            p_error_message: jobEx?.message || 'Ngoại lệ không xác định trong worker.',
            p_retry_delay_seconds: 300,
          });
        } catch (e) {}
      }
    }
  } catch (err: any) {
    console.error('[EMAIL WORKER] Lỗi vòng lặp xử lý batch:', err?.message);
    recordWorkerError('WORKER_BATCH_EXCEPTION', err?.message || 'Ngoại lệ batch.');
  } finally {
    isRunning = false;
  }
}

/**
 * Lấy trạng thái vận hành thời gian thực của Email Worker
 */
export async function getEmailWorkerRuntimeStatus(supabaseClient?: any): Promise<EmailWorkerRuntimeStatus> {
  const pollIntervalMs = parseInt(process.env.EMAIL_WORKER_POLL_INTERVAL_MS || '15000', 10);
  const workerEnabledEnv = (process.env.EMAIL_WORKER_ENABLED || 'false').toLowerCase() === 'true';

  let businessEnabled = runtimeState.last_known_business_enabled;
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('system_settings')
        .select('email_business_enabled')
        .eq('id', 1)
        .maybeSingle();
      if (data) {
        businessEnabled = Boolean(data.email_business_enabled);
        runtimeState.last_known_business_enabled = businessEnabled;
      }
    } catch (e) {}
  }

  let opStatus: EmailWorkerRuntimeStatus['operational_status'] = 'NOT_STARTED';
  let opLabel = 'Chưa bắt đầu chu kỳ quét';

  if (!workerEnabledEnv) {
    opStatus = 'SERVER_DISABLED';
    opLabel = 'Tắt trên Máy chủ (EMAIL_WORKER_ENABLED=false)';
  } else if (!businessEnabled) {
    opStatus = 'BUSINESS_DISABLED';
    opLabel = 'Tắt công tắc nghiệp vụ (Cài đặt hệ thống)';
  } else if (!runtimeState.last_poll_at) {
    opStatus = 'NOT_STARTED';
    opLabel = 'Chờ chu kỳ quét đầu tiên';
  } else {
    const diffMs = Date.now() - new Date(runtimeState.last_poll_at).getTime();
    if (diffMs <= (pollIntervalMs * 2.5) + 5000) {
      opStatus = 'ACTIVE_HEALTHY';
      opLabel = 'Đang hoạt động (Heartbeat bình thường)';
    } else {
      opStatus = 'STALE';
      opLabel = 'Mất nhịp Heartbeat / Chậm phản hồi';
    }
  }

  return {
    instance_id: workerInstanceId,
    worker_enabled_env: workerEnabledEnv,
    email_business_enabled: businessEnabled,
    operational_status: opStatus,
    operational_label: opLabel,
    is_polling: workerIntervalId !== null,
    is_processing: isRunning,
    poll_interval_ms: pollIntervalMs,
    last_poll_at: runtimeState.last_poll_at,
    last_claim_at: runtimeState.last_claim_at,
    last_success_at: runtimeState.last_success_at,
    last_error_at: runtimeState.last_error_at,
    last_error_code: runtimeState.last_error_code,
    last_error_message: runtimeState.last_error_message,
    jobs_claimed_count: runtimeState.jobs_claimed_count,
    jobs_sent_count: runtimeState.jobs_sent_count,
    jobs_failed_count: runtimeState.jobs_failed_count,
    last_processed_job_id: runtimeState.last_processed_job_id,
    last_processed_recipient_masked: runtimeState.last_processed_recipient_masked,
  };
}

/**
 * Khởi động tiến trình worker (chạy 1 lần trên server process)
 */
export function startEmailWorker() {
  if (workerIntervalId) return;

  const pollIntervalMs = parseInt(process.env.EMAIL_WORKER_POLL_INTERVAL_MS || '15000', 10);
  console.log(`[EMAIL WORKER] Khởi động tiến trình worker (ID: ${workerInstanceId}, Khoảng nghỉ: ${pollIntervalMs}ms)`);

  // Thực hiện ngay một lần quét ban đầu
  processEmailBatch();

  workerIntervalId = setInterval(() => {
    processEmailBatch();
  }, pollIntervalMs);
}

/**
 * Dừng tiến trình worker
 */
export function stopEmailWorker() {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
    console.log('[EMAIL WORKER] Đã dừng tiến trình worker.');
  }
}
