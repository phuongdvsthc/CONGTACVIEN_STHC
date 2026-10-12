import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: sampleJob } = await supabase.from('email_jobs').select('*').limit(1).single();
  console.log('Sample job keys:', Object.keys(sampleJob || {}));
  console.log('Sample job:', sampleJob);

  console.log('\n=== CHECK NOTIFICATION EVENT SERVICE / CTV JOBS ===');
  // How does CTV_NOTIFICATION_EMAIL enqueue? Let's check notificationEventConsumer or notificationEventService!
}

main().catch(console.error);
