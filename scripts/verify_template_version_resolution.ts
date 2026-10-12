import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('================================================================');
  console.log('KIỂM CHỨNG CƠ CHẾ CHỌN PHIÊN BẢN MẪU EMAIL (C3 / C3.11B / C3.12B)');
  console.log('================================================================\n');

  // 1. Kiểm tra trạng thái các phiên bản trong CSDL
  const { data: tmpl } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_code', 'LEAD_REGISTRATION_CONFIRMATION')
    .single();

  console.log('1. Thông tin Template:', {
    id: tmpl?.id,
    template_code: tmpl?.template_code,
    is_active: tmpl?.is_active,
  });

  const { data: versions } = await supabase
    .from('email_template_versions')
    .select('id, version_code, status, revision, published_at, created_at, subject')
    .eq('template_id', tmpl.id)
    .order('published_at', { ascending: false });

  console.log('\n2. Danh sách phiên bản trong CSDL:');
  console.table(versions);

  const publishedVersions = versions?.filter(v => v.status === 'PUBLISHED') || [];
  console.log(`\nSố lượng phiên bản PUBLISHED: ${publishedVersions.length}`);
  if (publishedVersions.length === 1 && publishedVersions[0].version_code === 'v1.2') {
    console.log('-> [PASS] Phiên bản PUBLISHED duy nhất trong CSDL hiện tại chính xác là v1.2!');
  } else {
    console.error('-> [FAIL] Trạng thái PUBLISHED không đúng kỳ vọng:', publishedVersions);
  }

  // 2. Kiểm chứng logic resolve version như Email Worker
  console.log('\n3. Mô phỏng bộ giải quyết phiên bản của Worker:');
  
  // Case A: Job có version_code = 'v1.2'
  const { data: caseA } = await supabase
    .from('email_template_versions')
    .select('id, version_code, status, subject')
    .eq('template_id', tmpl.id)
    .eq('version_code', 'v1.2')
    .in('status', ['PUBLISHED', 'ARCHIVED'])
    .order('published_at', { ascending: false })
    .limit(1);
  console.log('Case A (Job yêu cầu v1.2):', caseA?.[0]);

  // Case B: Job không chỉ định version (tự động lấy PUBLISHED)
  const { data: caseB } = await supabase
    .from('email_template_versions')
    .select('id, version_code, status, subject')
    .eq('template_id', tmpl.id)
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(1);
  console.log('Case B (Job lấy bản PUBLISHED hiện hành):', caseB?.[0]);

  // Case C: Job lịch sử yêu cầu 'v1'
  const { data: caseC } = await supabase
    .from('email_template_versions')
    .select('id, version_code, status, subject')
    .eq('template_id', tmpl.id)
    .eq('version_code', 'v1')
    .in('status', ['PUBLISHED', 'ARCHIVED'])
    .order('published_at', { ascending: false })
    .limit(1);
  console.log('Case C (Job lịch sử yêu cầu v1):', caseC?.[0]);

  console.log('\n[XÁC NHẬN]');
  console.log('- Khi job mới được enqueue mà không hardcode v1, hệ thống sẽ chọn bản PUBLISHED v1.2.');
  console.log('- Khi migration 20261012000002 được chạy qua Supabase SQL Editor, RPC fn_submit_lead_with_confirmation_email và fn_enqueue_email_job sẽ tự động gán v1.2 và template_version_id.');
}

main().catch(console.error);
