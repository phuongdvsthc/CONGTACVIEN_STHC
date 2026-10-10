/**
 * STHC_CTV - Worker Xử lý Hàng đợi Gửi Email (Email Queue Worker - C3.12A)
 * File: /src/services/emailWorker.ts
 *
 * Nhiệm vụ:
 * 1. Claim tác vụ an toàn bằng fn_claim_email_jobs (chỉ LEAD_REGISTRATION_CONFIRMATION).
 * 2. Đọc đúng phiên bản mẫu (PUBLISHED hoặc ARCHIVED tương thích) từ email_template_versions.
 * 3. Render nội dung qua emailTemplateRenderer.ts.
 * 4. Gửi qua SMTP bằng SmtpEmailSender (C3.11A).
 * 5. Ghi kết quả và lịch sử qua fn_complete_email_job.
 * 6. Xử lý retry có giới hạn (exponential backoff + jitter) và thu hồi tác vụ hết hạn khóa (stale locks).
 * 7. Kiểm soát bởi công tắc EMAIL_WORKER_ENABLED=true và email_business_enabled = true.
 */

import { createClient } from '@supabase/supabase-js';
import { SmtpEmailSender, getSmtpCredentials, DEFAULT_EMAIL_SERVICE_SETTINGS, maskEmailAddress } from './emailService';
import { renderEmailTemplate } from './emailTemplateRenderer';
import { EmailServiceSettings } from '../types';

let workerIntervalId: NodeJS.Timeout | null = null;
let isRunning = false;
let workerInstanceId = `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;

// Khởi tạo Supabase Admin client với service_role key cho worker
function getSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Đọc cấu hình dịch vụ email từ system_settings trong CSDL hoặc fallback an toàn
 */
async function fetchEmailServiceConfig(supabase: any): Promise<EmailServiceSettings> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      return {
        email_business_enabled: Boolean(data.email_business_enabled),
        smtp_host: data.smtp_host || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_host,
        smtp_port: data.smtp_port ?? DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_port,
        smtp_secure_mode: data.smtp_secure_mode || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_secure_mode,
        smtp_sender_name: data.smtp_sender_name || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_sender_name,
        smtp_sender_email: data.smtp_sender_email || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_sender_email,
        smtp_reply_to: data.smtp_reply_to || DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_reply_to,
        smtp_timeout_ms: data.smtp_timeout_ms ?? DEFAULT_EMAIL_SERVICE_SETTINGS.smtp_timeout_ms,
      };
    }
  } catch (e) {
    console.warn('[EMAIL WORKER] Không thể đọc cấu hình system_settings từ CSDL:', e);
  }
  return DEFAULT_EMAIL_SERVICE_SETTINGS;
}

/**
 * Xử lý một batch tác vụ email
 */
async function processEmailBatch() {
  if (isRunning) return;
  isRunning = true;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    isRunning = false;
    return;
  }

  try {
    // 1. Kiểm tra công tắc hệ thống
    const config = await fetchEmailServiceConfig(supabase);
    if (!config.email_business_enabled) {
      // Email business đang tắt -> không claim mới
      isRunning = false;
      return;
    }

    const workerEnabledEnv = (process.env.EMAIL_WORKER_ENABLED || 'false').toLowerCase() === 'true';
    if (!workerEnabledEnv) {
      isRunning = false;
      return;
    }

    // 2. Claim batch tác vụ LEAD_REGISTRATION_CONFIRMATION qua RPC fn_claim_email_jobs
    const { data: claimedJobs, error: claimErr } = await supabase.rpc('fn_claim_email_jobs', {
      p_worker_id: workerInstanceId,
      p_batch_size: 5,
      p_lock_duration_seconds: 300,
    });

    if (claimErr) {
      console.error('[EMAIL WORKER] Lỗi khi gọi fn_claim_email_jobs:', claimErr.message);
      isRunning = false;
      return;
    }

    if (!claimedJobs || claimedJobs.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`[EMAIL WORKER] Đã claim thành công ${claimedJobs.length} tác vụ email.`);

    const credentials = getSmtpCredentials(config);
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

      try {
        // A. Tra cứu template và phiên bản trong CSDL (cho phép PUBLISHED hoặc ARCHIVED cho job cũ)
        const { data: templateData, error: tErr } = await supabase
          .from('email_templates')
          .select('id')
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
          continue;
        }

        const { data: verData, error: vErr } = await supabase
          .from('email_template_versions')
          .select('*')
          .eq('template_id', templateData.id)
          .eq('version_code', templateVersionCode)
          .in('status', ['PUBLISHED', 'ARCHIVED'])
          .single();

        if (vErr || !verData) {
          await supabase.rpc('fn_complete_email_job', {
            p_job_id: jobId,
            p_lock_token: lockToken,
            p_status: 'BLOCKED',
            p_error_code: 'TEMPLATE_VERSION_NOT_FOUND',
            p_error_message: `Không tìm thấy phiên bản mẫu ${templateVersionCode} (PUBLISHED/ARCHIVED)`,
          });
          continue;
        }

        // B. Render nội dung
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
          continue;
        }

        // C. Gửi qua SMTP
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
          }
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

          console.warn(`[EMAIL WORKER] Gửi SMTP thất bại tới ${maskedRecipient} (Job: ${jobId}, Code: ${errorCode}): ${errorMsg}`);
        }
      } catch (jobEx: any) {
        console.error(`[EMAIL WORKER] Ngoại lệ xử lý job ${jobId}:`, jobEx?.message);
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
  } finally {
    isRunning = false;
  }
}

/**
 * Khởi động tiến trình worker (chạy 1 lần trên server process)
 */
export function startEmailWorker() {
  if (workerIntervalId) return;

  const pollIntervalMs = parseInt(process.env.EMAIL_WORKER_POLL_INTERVAL_MS || '15000', 10);
  console.log(`[EMAIL WORKER] Khởi động tiến trình worker (ID: ${workerInstanceId}, Khoảng nghỉ: ${pollIntervalMs}ms)`);

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
