import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verify() {
  console.log('=== BÁO CÁO KIỂM THỬ TỰ ĐỘNG EMAIL WORKER (STHC_CTV) ===');

  // 1. Kiểm tra cấu hình và credentials
  const { data: settings } = await supabase
    .from('system_settings')
    .select('email_business_enabled, smtp_host, smtp_port, smtp_sender_email, smtp_username, smtp_password_ciphertext')
    .eq('id', 1)
    .single();

  console.log('1. Cấu hình CSDL:');
  console.log('   - email_business_enabled:', settings?.email_business_enabled);
  console.log('   - smtp_host:', settings?.smtp_host, 'port:', settings?.smtp_port);
  console.log('   - smtp_username:', settings?.smtp_username);
  console.log('   - Có mật khẩu đã mã hóa:', Boolean(settings?.smtp_password_ciphertext));

  // 2. Kiểm tra job test phuongsht@gmail.com
  const { data: testJob } = await supabase
    .from('email_jobs')
    .select('*')
    .eq('recipient_email', 'phuongsht@gmail.com')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('\n2. Tác vụ Test được chỉ định (phuongsht@gmail.com):');
  console.log('   - Job ID:', testJob.id);
  console.log('   - Trạng thái hiện tại:', testJob.status);
  console.log('   - Số lần thử (attempt_count):', testJob.attempt_count);
  console.log('   - Thời điểm gửi thành công (sent_at):', testJob.sent_at);
  console.log('   - Provider Message ID:', testJob.provider_message_id);

  const { data: attempts } = await supabase
    .from('email_job_attempts')
    .select('*')
    .eq('email_job_id', testJob.id);

  console.log('   - Lịch sử nỗ lực gửi (Attempts count):', attempts?.length);
  for (const a of attempts || []) {
    console.log(`     * Lần #${a.attempt_number}: Status=${a.status}, Worker=${a.worker_id}, MsgID=${a.provider_message_id}`);
  }

  // 3. Kiểm tra bảo vệ job BLOCKED (dienlanhgd@gmail.com)
  const { data: blockedJob } = await supabase
    .from('email_jobs')
    .select('*')
    .eq('recipient_email', 'dienlanhgd@gmail.com')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('\n3. Tác vụ Khóa an toàn (dienlanhgd@gmail.com):');
  console.log('   - Job ID:', blockedJob.id);
  console.log('   - Trạng thái:', blockedJob.status);
  console.log('   - Lý do khóa:', blockedJob.blocked_reason);
  console.log('   - Khóa học liên kết:', blockedJob.payload?.course_title, `(${blockedJob.payload?.course_code})`);
  console.log('   - Snapshot URL:', blockedJob.payload?.official_registration_url);
}

verify().catch(console.error);
