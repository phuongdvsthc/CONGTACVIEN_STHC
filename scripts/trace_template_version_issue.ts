import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('=== 1. EMAIL TEMPLATES ===');
  const { data: templates, error: tErr } = await supabase
    .from('email_templates')
    .select('*');
  console.log('Templates:', templates, tErr);

  console.log('\n=== 2. EMAIL TEMPLATE VERSIONS ===');
  const { data: versions, error: vErr } = await supabase
    .from('email_template_versions')
    .select('*')
    .order('created_at', { ascending: false });
  console.log('Versions:', versions?.map(v => ({
    id: v.id,
    template_id: v.template_id,
    version_code: v.version_code,
    status: v.status,
    revision: v.revision,
    published_at: v.published_at,
    created_at: v.created_at,
    subject: v.subject,
    body_html_preview: v.body_html?.slice(0, 100),
    body_text_preview: v.body_text?.slice(0, 100),
  })), vErr);

  console.log('\n=== 3. ALL LEADS (RECENT) ===');
  const { data: leads, error: lErr } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent leads:', leads?.map(l => ({
    id: l.id,
    full_name: l.full_name,
    email: l.email,
    created_at: l.created_at,
    course_id: l.course_id,
    customer_note: l.customer_note,
  })), lErr);

  console.log('\n=== 4. ALL EMAIL JOBS ===');
  const { data: jobs, error: jErr } = await supabase
    .from('email_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent email jobs:', jobs?.map(j => ({
    id: j.id,
    email_type: j.email_type,
    idempotency_key: j.idempotency_key,
    recipient_email: j.recipient_email,
    recipient_name: j.recipient_name,
    lead_id: j.lead_id,
    template_code: j.template_code,
    template_version: j.template_version,
    status: j.status,
    created_at: j.created_at,
    next_attempt_at: j.next_attempt_at,
    sent_at: j.sent_at,
    provider_message_id: j.provider_message_id,
    attempt_count: j.attempt_count,
    metadata: j.metadata,
    payload_registered_at: j.payload?.registered_at,
  })), jErr);

  console.log('\n=== 5. EMAIL JOB ATTEMPTS ===');
  const { data: attempts, error: aErr } = await supabase
    .from('email_job_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('Recent attempts:', attempts, aErr);
}

main().catch(console.error);
