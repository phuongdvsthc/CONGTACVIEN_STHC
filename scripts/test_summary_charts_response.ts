import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealData() {
  console.log('--- Kiểm tra dữ liệu thực tế trong CSDL ---');
  const { data: affs } = await supabase
    .from('affiliate_profiles')
    .select('id, user_id, full_name, affiliate_code, status')
    .limit(10);
  
  console.log('Danh sách CTV:', affs);

  if (affs && affs.length > 0) {
    for (const aff of affs) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, full_name, phone, course_id, admission_status, reconciliation_status, created_at, courses(title, code)')
        .or(`affiliate_id.eq.${aff.id},affiliate_id.eq.${aff.user_id}`);
      
      console.log(`CTV: ${aff.full_name} (${aff.affiliate_code}) -> Leads count: ${leads?.length || 0}`);
      if (leads && leads.length > 0) {
        console.log('  Leads sample:', leads.slice(0, 3));
      }
    }
  }
}

checkRealData().catch(console.error);
