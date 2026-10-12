import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: versions } = await supabase
    .from('email_template_versions')
    .select('*')
    .eq('template_id', '9f1bfd86-58d2-4f5d-a0e8-0aacec80d173')
    .order('created_at', { ascending: true });

  for (const v of versions || []) {
    console.log(`=== VERSION ${v.version_code} (${v.status}, id: ${v.id}) ===`);
    console.log('Published At:', v.published_at);
    console.log('Subject:', v.subject);
    console.log('Button label:', v.button_label);
    console.log('Body HTML:\n', v.body_html);
    console.log('Body Text:\n', v.body_text);
    console.log('\n----------------------------------------\n');
  }

  const { data: job } = await supabase
    .from('email_jobs')
    .select('*, leads(*)')
    .eq('id', '017dde6e-fbfd-441e-bc22-18b231893ca4')
    .single();

  console.log('=== LEAD & JOB 017dde6e-fbfd-441e-bc22-18b231893ca4 ===');
  console.log('Job template_code:', job.template_code);
  console.log('Job template_version:', job.template_version);
  console.log('Job created_at:', job.created_at);
  console.log('Lead created_at:', job.leads?.created_at);
  console.log('Job sent_at:', job.sent_at);
  console.log('Job provider_message_id:', job.provider_message_id);
}

main().catch(console.error);
