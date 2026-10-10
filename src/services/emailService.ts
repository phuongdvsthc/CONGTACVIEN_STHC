/**
 * STHC_CTV - Dịch vụ Gửi Email Nghiệp vụ (Email Service Foundation - C3.11A)
 * File: /src/services/emailService.ts
 *
 * Nhiệm vụ:
 * 1. Đọc và hợp nhất cấu hình gửi email nghiệp vụ từ system_settings và biến môi trường server.
 * 2. Xác thực cấu hình nghiêm ngặt (Host, Port, Chế độ TLS, Timeout, Chống Header Injection).
 * 3. Tạo transport SMTP (nodemailer) với cấu hình bảo mật chuẩn (Không rejectUnauthorized=false, không fallback unencrypted).
 * 4. Kiểm tra kết nối máy chủ SMTP (verifyConnection) với đo lường thời gian phản hồi (round_trip_ms).
 * 5. Gửi email thử nghiệm (sendTestEmail) có che PII an toàn và cảnh báo rõ ràng.
 * 6. Chuẩn hóa mã lỗi và thông điệp lỗi thân thiện cho Quản trị viên.
 */

import nodemailer, { Transporter } from 'nodemailer';
import {
  EmailServiceSettings,
  EmailCredentialsStatus,
  SmtpSecureMode,
  VerifyConnectionResult,
  SendTestEmailResult,
  EmailSenderInterface,
} from '../types';

/**
 * Cấu hình mặc định cho dịch vụ email nghiệp vụ (an toàn khi DB chưa áp dụng migration)
 */
export const DEFAULT_EMAIL_SERVICE_SETTINGS: EmailServiceSettings = {
  email_business_enabled: false,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure_mode: 'STARTTLS',
  smtp_sender_name: 'Ban Tuyển sinh Trường Saigontourist',
  smtp_sender_email: 'tuyensinh@sthc.edu.vn',
  smtp_reply_to: 'tuyensinh@sthc.edu.vn',
  smtp_timeout_ms: 10000,
};

/**
 * Kiểm tra chuỗi có chứa ký tự điều khiển nguy hiểm có thể gây Header Injection (\r, \n)
 */
export function hasHeaderInjection(value?: string | null): boolean {
  if (!value) return false;
  return /[\r\n]/.test(value);
}

/**
 * Kiểm tra định dạng email hợp lệ theo RFC 5322
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 255) return false;
  if (hasHeaderInjection(clean)) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

/**
 * Kiểm tra định dạng host SMTP hợp lệ (Domain name hoặc IPv4/IPv6 hợp lệ)
 */
export function isValidSmtpHost(host?: string | null): boolean {
  if (!host || typeof host !== 'string') return false;
  const clean = host.trim();
  if (clean.length < 3 || clean.length > 255) return false;
  if (hasHeaderInjection(clean)) return false;
  // Cho phép domain name hoặc localhost hoặc IP
  if (clean.toLowerCase() === 'localhost') return true;
  const hostRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^(?:\d{1,3}\.){3}\d{1,3}$/;
  return hostRegex.test(clean);
}

/**
 * Che địa chỉ email để ghi nhật ký audit log an toàn PII
 * Ví dụ: tuyensinh@sthc.edu.vn -> tuy***@sthc.edu.vn
 */
export function maskEmailAddress(email?: string | null): string {
  if (!email || typeof email !== 'string') return '***';
  const clean = email.trim();
  const parts = clean.split('@');
  if (parts.length !== 2) return '***';
  const [localPart, domain] = parts;
  if (localPart.length <= 3) {
    return `${localPart[0] || '*'}***@${domain}`;
  }
  return `${localPart.slice(0, 3)}***@${domain}`;
}

/**
 * Mã hóa và giải mã mật khẩu SMTP an toàn bằng AES-256-GCM
 */
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.EMAIL_CREDENTIALS_ENCRYPTION_KEY || 'sthc-ctv-default-encryption-secret-key-2026';
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSmtpPassword(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSmtpPassword(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext; // fallback if legacy
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[DECRYPT SMTP PASSWORD ERROR]', err);
    throw new Error('Không thể giải mã mật khẩu SMTP: Khóa mã hóa (EMAIL_CREDENTIALS_ENCRYPTION_KEY) không hợp lệ hoặc dữ liệu mật khẩu đã bị hỏng.');
  }
}

/**
 * Lấy thông tin xác thực SMTP ưu tiên từ CSDL (dbSettings), fallback sang biến môi trường máy chủ
 */
export function getSmtpCredentials(dbSettings?: any): {
  user: string;
  pass: string;
  status: EmailCredentialsStatus;
} {
  // 1. Kiểm tra cấu hình lưu trong CSDL (dbSettings)
  if (dbSettings && (dbSettings.smtp_username || dbSettings.smtp_password_ciphertext)) {
    const user = (dbSettings.smtp_username || '').trim();
    let pass = '';
    if (dbSettings.smtp_password_ciphertext) {
      pass = decryptSmtpPassword(dbSettings.smtp_password_ciphertext);
    }
    const hasUser = Boolean(user);
    const hasPass = Boolean(pass);
    return {
      user,
      pass,
      status: {
        has_credentials: hasUser && hasPass,
        has_username: hasUser,
        has_password: hasPass,
        username_configured: hasUser,
        password_configured: hasPass,
      },
    };
  }

  // 2. Fallback sang biến môi trường server cũ
  const user = (process.env.SMTP_USER || process.env.SMTP_USERNAME || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();

  const hasUser = Boolean(user);
  const hasPass = Boolean(pass);
  const hasCredentials = hasUser && hasPass;

  return {
    user,
    pass,
    status: {
      has_credentials: hasCredentials,
      has_username: hasUser,
      has_password: hasPass,
      username_configured: hasUser,
      password_configured: hasPass,
    },
  };
}

/**
 * Xác thực tính hợp lệ của cấu hình gửi email
 */
export function validateEmailServiceConfig(config: Partial<EmailServiceSettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Kiểm tra host
  if (!config.smtp_host || typeof config.smtp_host !== 'string' || !config.smtp_host.trim()) {
    errors.push('Địa chỉ máy chủ SMTP (Host) không được để trống.');
  } else if (!isValidSmtpHost(config.smtp_host)) {
    errors.push('Địa chỉ máy chủ SMTP (Host) không đúng định dạng tên miền hoặc IP.');
  }

  // 2. Kiểm tra port
  if (config.smtp_port === undefined || config.smtp_port === null) {
    errors.push('Cổng kết nối SMTP (Port) không được để trống.');
  } else {
    const portNum = Number(config.smtp_port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      errors.push('Cổng kết nối SMTP (Port) phải là số nguyên từ 1 đến 65535.');
    }
  }

  // 3. Kiểm tra chế độ TLS
  const validModes: SmtpSecureMode[] = ['STARTTLS', 'TLS_WRAPPED', 'NONE'];
  if (!config.smtp_secure_mode || !validModes.includes(config.smtp_secure_mode)) {
    errors.push(`Chế độ bảo mật TLS không hợp lệ. Chỉ chấp nhận: ${validModes.join(', ')}.`);
  }

  // 4. Kiểm tra tên người gửi (From Name)
  if (!config.smtp_sender_name || typeof config.smtp_sender_name !== 'string' || !config.smtp_sender_name.trim()) {
    errors.push('Tên người gửi (From Name) không được để trống.');
  } else if (hasHeaderInjection(config.smtp_sender_name)) {
    errors.push('Tên người gửi chứa ký tự không hợp lệ (Header Injection).');
  } else if (config.smtp_sender_name.trim().length > 255) {
    errors.push('Tên người gửi không được vượt quá 255 ký tự.');
  }

  // 5. Kiểm tra email người gửi (From Email)
  if (!config.smtp_sender_email || typeof config.smtp_sender_email !== 'string' || !config.smtp_sender_email.trim()) {
    errors.push('Địa chỉ email người gửi (From Email) không được để trống.');
  } else if (!isValidEmail(config.smtp_sender_email)) {
    errors.push('Địa chỉ email người gửi (From Email) không đúng định dạng RFC 5322.');
  }

  // 6. Kiểm tra reply-to (nếu có)
  if (config.smtp_reply_to && config.smtp_reply_to.trim()) {
    if (!isValidEmail(config.smtp_reply_to)) {
      errors.push('Địa chỉ phản hồi (Reply-To) không đúng định dạng email.');
    }
  }

  // 7. Kiểm tra timeout
  if (config.smtp_timeout_ms !== undefined && config.smtp_timeout_ms !== null) {
    const timeoutNum = Number(config.smtp_timeout_ms);
    if (!Number.isInteger(timeoutNum) || timeoutNum < 2000 || timeoutNum > 60000) {
      errors.push('Thời gian chờ (Timeout) phải là số nguyên từ 2,000 ms đến 60,000 ms (2s - 60s).');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Tạo đối tượng Nodemailer Transporter với các quy tắc bảo mật chuẩn:
 * - STARTTLS: secure: false, requireTLS: true
 * - TLS_WRAPPED: secure: true
 * - KHÔNG BAO GIỜ tắt xác thực chứng chỉ (rejectUnauthorized: true)
 * - KHÔNG BAO GIỜ fallback âm thầm sang kết nối không mã hóa khi TLS lỗi
 */
export function createSmtpTransporter(
  config: EmailServiceSettings,
  credentials?: { user?: string; pass?: string }
): Transporter {
  const timeoutMs = config.smtp_timeout_ms || 10000;
  const isTlsWrapped = config.smtp_secure_mode === 'TLS_WRAPPED';
  const isStartTls = config.smtp_secure_mode === 'STARTTLS';

  const transportOptions: any = {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: isTlsWrapped,
    requireTLS: isStartTls,
    ignoreTLS: config.smtp_secure_mode === 'NONE',
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    tls: {
      // Bắt buộc xác thực chứng chỉ số nghiêm ngặt, chống tấn công Man-in-the-Middle
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  };

  if (credentials?.user && credentials?.pass) {
    transportOptions.auth = {
      user: credentials.user,
      pass: credentials.pass,
    };
  }

  return nodemailer.createTransport(transportOptions);
}

/**
 * Chuẩn hóa lỗi SMTP thành mã lỗi chuẩn và thông điệp tiếng Việt thân thiện
 */
export function mapSmtpError(err: any): { code: string; message: string } {
  if (!err) {
    return { code: 'UNKNOWN_ERROR', message: 'Lỗi không xác định khi kết nối SMTP.' };
  }

  const rawMessage = String(err.message || '');
  const rawCode = String(err.code || '').toUpperCase();
  const responseCode = err.responseCode ? Number(err.responseCode) : null;

  // 1. Lỗi xác thực tài khoản (Authentication Failed)
  if (
    responseCode === 535 ||
    rawCode === 'EAUTH' ||
    rawMessage.includes('Username and Password not accepted') ||
    rawMessage.includes('Invalid login') ||
    rawMessage.includes('authentication failed')
  ) {
    return {
      code: 'AUTH_FAILED',
      message: 'Xác thực tài khoản SMTP không thành công. Vui lòng kiểm tra lại SMTP_USER và SMTP_PASS trong biến môi trường máy chủ.',
    };
  }

  // 2. Lỗi quá thời gian kết nối (Timeout)
  if (
    rawCode === 'ETIMEDOUT' ||
    rawCode === 'ESOCKETTIMEDOUT' ||
    rawMessage.includes('Greeting never received') ||
    rawMessage.includes('Connection timeout')
  ) {
    return {
      code: 'TIMEOUT',
      message: 'Quá thời gian kết nối đến máy chủ SMTP (Timeout). Vui lòng kiểm tra lại Host, Port hoặc thiết lập tường lửa.',
    };
  }

  // 3. Lỗi không tìm thấy địa chỉ máy chủ (Host not found)
  if (rawCode === 'ENOTFOUND' || rawCode === 'EAI_AGAIN' || rawMessage.includes('getaddrinfo')) {
    return {
      code: 'INVALID_HOST',
      message: 'Không tìm thấy địa chỉ máy chủ SMTP (Host không tồn tại hoặc lỗi phân giải tên miền DNS).',
    };
  }

  // 4. Lỗi máy chủ từ chối kết nối (Connection Refused)
  if (rawCode === 'ECONNREFUSED' || rawMessage.includes('ECONNREFUSED')) {
    return {
      code: 'CONNECTION_REFUSED',
      message: 'Máy chủ từ chối kết nối tại cổng này (Port không đúng hoặc dịch vụ SMTP chưa mở trên máy chủ đích).',
    };
  }

  // 5. Lỗi chứng chỉ bảo mật TLS/SSL (Certificate / TLS error)
  if (
    rawCode === 'ESOCKET' ||
    rawCode === 'CERT_HAS_EXPIRED' ||
    rawCode === 'DEPTH_ZERO_SELF_SIGNED_CERT' ||
    rawCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    rawMessage.includes('SSL') ||
    rawMessage.includes('TLS') ||
    rawMessage.includes('certificate')
  ) {
    return {
      code: 'TLS_ERROR',
      message: 'Lỗi bảo mật chứng chỉ TLS/SSL. Máy chủ không thể xác thực chứng chỉ số của máy chủ SMTP hoặc phiên bản mã hóa không tương thích.',
    };
  }

  // 6. Lỗi địa chỉ gửi bị máy chủ từ chối (Sender rejected)
  if (responseCode === 550 || responseCode === 553 || rawMessage.includes('Sender address rejected')) {
    return {
      code: 'SENDER_REJECTED',
      message: 'Máy chủ SMTP từ chối địa chỉ email người gửi. Vui lòng kiểm tra quyền gửi của tài khoản đối với email này.',
    };
  }

  return {
    code: rawCode || 'SMTP_ERROR',
    message: `Lỗi kết nối máy chủ SMTP: ${rawMessage.slice(0, 200)}`,
  };
}

/**
 * Kiểm tra kết nối đến máy chủ SMTP (verifyConnection)
 */
export async function verifySmtpConnection(
  config: EmailServiceSettings,
  credentials?: { user?: string; pass?: string }
): Promise<VerifyConnectionResult> {
  // 1. Kiểm tra cấu hình
  const val = validateEmailServiceConfig(config);
  if (!val.valid) {
    return {
      success: false,
      code: 'VALIDATION_FAILED',
      message: val.errors[0] || 'Cấu hình SMTP không hợp lệ.',
      error: val.errors.join('; '),
    };
  }

  // 2. Kiểm tra thông tin credentials (nếu máy chủ yêu cầu)
  const creds = credentials || getSmtpCredentials();
  if (!creds.user || !creds.pass) {
    return {
      success: false,
      code: 'MISSING_CREDENTIALS',
      message: 'Chưa cấu hình tài khoản SMTP (SMTP_USER) hoặc mật khẩu SMTP (SMTP_PASS) trong biến môi trường máy chủ.',
      error: 'Thiếu biến môi trường SMTP_USER hoặc SMTP_PASS.',
    };
  }

  // 3. Tạo transport và đo lường thời gian
  const startTime = Date.now();
  let transporter: Transporter;
  try {
    transporter = createSmtpTransporter(config, creds);
  } catch (err: any) {
    const mapped = mapSmtpError(err);
    return {
      success: false,
      code: mapped.code,
      message: mapped.message,
      error: err.message,
    };
  }

  // 4. Thực thi verify kết nối
  try {
    await transporter.verify();
    const roundTripMs = Date.now() - startTime;
    return {
      success: true,
      code: 'CONNECTION_SUCCESS',
      message: `Kết nối máy chủ SMTP thành công (${roundTripMs} ms). Sẵn sàng phục vụ gửi email nghiệp vụ.`,
      details: {
        host: config.smtp_host,
        port: config.smtp_port,
        secure_mode: config.smtp_secure_mode,
        round_trip_ms: roundTripMs,
      },
    };
  } catch (err: any) {
    const mapped = mapSmtpError(err);
    return {
      success: false,
      code: mapped.code,
      message: mapped.message,
      details: {
        host: config.smtp_host,
        port: config.smtp_port,
        secure_mode: config.smtp_secure_mode,
        round_trip_ms: Date.now() - startTime,
      },
      error: err.message,
    };
  }
}

/**
 * Xây dựng nội dung HTML và Text cho email kiểm tra thử nghiệm
 */
export function buildTestEmailContent(params: {
  recipientEmail: string;
  adminName?: string;
  adminEmail?: string;
  config: EmailServiceSettings;
  sentAt: string;
}): { subject: string; html: string; text: string } {
  const { recipientEmail, adminName, adminEmail, config, sentAt } = params;
  const subject = `[STHC_CTV] Kiểm tra kết nối dịch vụ email nghiệp vụ (${sentAt})`;

  const text = `
THÔNG BÁO KIỂM TRA CẤU HÌNH DỊCH VỤ EMAIL NGHIỆP VỤ
Hệ thống Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)
----------------------------------------------------------------------
CẢNH BÁO QUAN TRỌNG:
Đây là thư điện tử thử nghiệm do Quản trị viên hệ thống chủ động khởi tạo 
để xác nhận kết nối máy chủ gửi thư (SMTP).
Thư này KHÔNG PHẢI là email xác nhận đăng ký tuyển sinh thật hoặc thông báo hoa hồng của Cộng tác viên.

THÔNG TIN KIỂM THỬ:
- Người nhận: ${recipientEmail}
- Thời điểm gửi: ${sentAt}
- Tài khoản thực hiện: ${adminName || 'Quản trị viên'} (${adminEmail || 'admin'})
- Máy chủ SMTP (Host): ${config.smtp_host}
- Cổng kết nối (Port): ${config.smtp_port}
- Chế độ bảo mật TLS: ${config.smtp_secure_mode}
- Tên người gửi: ${config.smtp_sender_name}
- Email người gửi: ${config.smtp_sender_email}
- Địa chỉ phản hồi (Reply-To): ${config.smtp_reply_to || 'Không cấu hình'}
- Thời gian chờ (Timeout): ${config.smtp_timeout_ms} ms

Nếu bạn không phải là Quản trị viên thực hiện yêu cầu này, vui lòng bỏ qua thư.
----------------------------------------------------------------------
Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC)
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px; color: #1f2937; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .badge-test { display: inline-block; background-color: #fef08a; color: #854d0e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
    .content { padding: 24px; }
    .alert-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; color: #92400e; }
    .table-details { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; }
    .table-details th { text-align: left; padding: 8px 12px; background-color: #f9fafb; color: #6b7280; font-weight: 600; width: 40%; border-bottom: 1px solid #e5e7eb; }
    .table-details td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-family: monospace; }
    .footer { background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge-test">Thư thử nghiệm kết nối</div>
      <h1>Cổng Tuyển sinh & CTV STHC</h1>
      <p>Kiểm tra cấu hình dịch vụ gửi email nghiệp vụ (C3.11A)</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>LƯU Ý QUAN TRỌNG:</strong> Đây là thư kiểm tra kết nối kỹ thuật do Quản trị viên hệ thống khởi tạo. Thư này không chứa dữ liệu hồ sơ lead thực và không phải là thư xác nhận nhập học.
      </div>

      <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
        Xin chào <strong>${recipientEmail}</strong>,<br>
        Hệ thống đã kết nối thành công tới máy chủ SMTP và thực hiện gửi bức thư này để xác minh luồng gửi thư nghiệp vụ sẵn sàng hoạt động.
      </p>

      <h3 style="font-size: 14px; text-transform: uppercase; color: #374151; letter-spacing: 0.05em; margin: 20px 0 8px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px;">
        Thông số kỹ thuật phiên gửi
      </h3>

      <table class="table-details">
        <tr>
          <th>Thời điểm gửi</th>
          <td>${sentAt}</td>
        </tr>
        <tr>
          <th>Quản trị viên thực hiện</th>
          <td>${adminName || 'Admin'} (${adminEmail || 'admin'})</td>
        </tr>
        <tr>
          <th>Máy chủ SMTP (Host)</th>
          <td>${config.smtp_host}</td>
        </tr>
        <tr>
          <th>Cổng kết nối (Port)</th>
          <td>${config.smtp_port}</td>
        </tr>
        <tr>
          <th>Chế độ mã hóa</th>
          <td><strong>${config.smtp_secure_mode}</strong></td>
        </tr>
        <tr>
          <th>Tên người gửi (From Name)</th>
          <td>${config.smtp_sender_name}</td>
        </tr>
        <tr>
          <th>Địa chỉ gửi (From Email)</th>
          <td>${config.smtp_sender_email}</td>
        </tr>
        <tr>
          <th>Địa chỉ phản hồi (Reply-To)</th>
          <td>${config.smtp_reply_to || 'Chưa thiết lập'}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC)<br>
      Phân hệ Email Nghiệp vụ STHC_CTV • Bước C3.11A
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * Gửi email thử nghiệm (chỉ được kích hoạt bởi Quản trị viên có thẩm quyền)
 */
export async function sendSmtpTestEmail(params: {
  recipientEmail: string;
  adminName?: string;
  adminEmail?: string;
  config: EmailServiceSettings;
  credentials?: { user?: string; pass?: string };
}): Promise<SendTestEmailResult> {
  const { recipientEmail, adminName, adminEmail, config } = params;

  // 1. Kiểm tra địa chỉ người nhận
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    return {
      success: false,
      code: 'INVALID_RECIPIENT_EMAIL',
      message: 'Địa chỉ email nhận thử không hợp lệ hoặc chứa ký tự nguy hiểm.',
      error: 'Địa chỉ email người nhận không đúng định dạng RFC 5322.',
    };
  }

  // 2. Chống Header Injection trong các trường From và Recipient
  if (
    hasHeaderInjection(recipientEmail) ||
    hasHeaderInjection(config.smtp_sender_name) ||
    hasHeaderInjection(config.smtp_sender_email) ||
    hasHeaderInjection(config.smtp_reply_to)
  ) {
    return {
      success: false,
      code: 'HEADER_INJECTION_DETECTED',
      message: 'Phát hiện ký tự xuống dòng nguy hiểm (CR/LF) trong thông tin người gửi hoặc người nhận.',
      error: 'CR/LF detected in headers.',
    };
  }

  // 3. Kiểm tra cấu hình
  const val = validateEmailServiceConfig(config);
  if (!val.valid) {
    return {
      success: false,
      code: 'VALIDATION_FAILED',
      message: val.errors[0] || 'Cấu hình SMTP không hợp lệ.',
      error: val.errors.join('; '),
    };
  }

  // 4. Lấy credentials
  const creds = params.credentials || getSmtpCredentials();
  if (!creds.user || !creds.pass) {
    return {
      success: false,
      code: 'MISSING_CREDENTIALS',
      message: 'Chưa cấu hình tài khoản SMTP (SMTP_USER) hoặc mật khẩu SMTP (SMTP_PASS) trong biến môi trường máy chủ.',
      error: 'Thiếu biến môi trường SMTP_USER hoặc SMTP_PASS.',
    };
  }

  // 5. Chuẩn bị nội dung
  const sentAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const { subject, html, text } = buildTestEmailContent({
    recipientEmail,
    adminName,
    adminEmail,
    config,
    sentAt,
  });

  const fromHeader = `"${config.smtp_sender_name}" <${config.smtp_sender_email}>`;
  const maskedRecipient = maskEmailAddress(recipientEmail);

  // 6. Tạo transport và gửi thư
  try {
    const transporter = createSmtpTransporter(config, creds);
    const info = await transporter.sendMail({
      from: fromHeader,
      to: recipientEmail,
      replyTo: config.smtp_reply_to || undefined,
      subject,
      text,
      html,
    });

    return {
      success: true,
      code: 'SEND_SUCCESS',
      message: `Đã gửi email thử nghiệm thành công tới ${maskedRecipient}. ID thư: ${info.messageId || 'OK'}.`,
      message_id: info.messageId,
      masked_recipient: maskedRecipient,
    };
  } catch (err: any) {
    const mapped = mapSmtpError(err);
    return {
      success: false,
      code: mapped.code,
      message: `Gửi email thử nghiệm thất bại: ${mapped.message}`,
      masked_recipient: maskedRecipient,
      error: err.message,
    };
  }
}

/**
 * Lớp SmtpEmailSender hiện thực interface EmailSenderInterface
 * Sẵn sàng cho việc mở rộng hoặc thay thế bằng các provider khác trong tương lai
 */
export class SmtpEmailSender implements EmailSenderInterface {
  private config: EmailServiceSettings;
  private credentials: { user: string; pass: string };

  constructor(config: EmailServiceSettings, credentials?: { user: string; pass: string }) {
    this.config = config;
    this.credentials = credentials || getSmtpCredentials();
  }

  async verifyConnection(): Promise<VerifyConnectionResult> {
    return verifySmtpConnection(this.config, this.credentials);
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    code?: string;
  }> {
    if (hasHeaderInjection(options.to) || hasHeaderInjection(options.subject)) {
      return {
        success: false,
        code: 'HEADER_INJECTION_DETECTED',
        error: 'Phát hiện ký tự điều khiển trong tiêu đề hoặc người nhận.',
      };
    }

    if (!isValidEmail(options.to)) {
      return {
        success: false,
        code: 'INVALID_RECIPIENT_EMAIL',
        error: 'Địa chỉ người nhận không hợp lệ.',
      };
    }

    try {
      const transporter = createSmtpTransporter(this.config, this.credentials);
      const fromHeader = `"${this.config.smtp_sender_name}" <${this.config.smtp_sender_email}>`;
      const info = await transporter.sendMail({
        from: fromHeader,
        to: options.to,
        replyTo: options.replyTo || this.config.smtp_reply_to || undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      const mapped = mapSmtpError(err);
      return {
        success: false,
        code: mapped.code,
        error: mapped.message,
      };
    }
  }
}
