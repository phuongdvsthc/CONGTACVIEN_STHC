import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = 'demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b';
const STAFF_TOKEN = 'demo-session-token-28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f';

async function runTests() {
  console.log('================================================================');
  console.log('KIỂM THỬ TỰ ĐỘNG A9.8A: API RECENT LEADS & LEADERBOARD ADMIN/STAFF');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Admin Summary Access
  console.log('--- 1. Kiểm tra Admin truy cập Summary đầy đủ ---');
  const resAdmin = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  assert(resAdmin.status === 200, 'Admin request trả về HTTP 200 OK');
  const dataAdmin = (await resAdmin.json()) as any;
  assert(dataAdmin.success === true, 'Response JSON có success = true');
  assert(!!dataAdmin.data.recent_leads, 'Payload có khối recent_leads');
  assert(Array.isArray(dataAdmin.data.recent_leads.leads), 'recent_leads.leads là mảng');
  assert(dataAdmin.data.recent_leads.leads.length <= 5, 'recent_leads trả về tối đa 5 bản ghi');
  assert(dataAdmin.data.recent_leads.metadata?.scope === 'FILTERED_REGISTRATION_COHORT', 'recent_leads scope đúng FILTERED_REGISTRATION_COHORT');

  if (dataAdmin.data.recent_leads.leads.length > 0) {
    const lead = dataAdmin.data.recent_leads.leads[0];
    assert(typeof lead.id === 'string' && lead.id.length > 0, 'Lead có trường id hợp lệ');
    assert(typeof lead.full_name === 'string', 'Lead có full_name');
    assert(typeof lead.phone === 'string' && !lead.phone.includes('*'), 'SĐT không bị che dấu hoa thị (Admin/Staff xem đầy đủ)');
    assert(['ENROLLED', 'NOT_ENROLLED', 'WITHDRAWN'].includes(lead.admission_status), 'Trạng thái admission_status chuẩn hóa đúng quy chuẩn');
    assert(typeof lead.course_title === 'string', 'Lead có course_title');
  }

  assert(!!dataAdmin.data.leaderboard, 'Payload có khối leaderboard');
  assert(dataAdmin.data.leaderboard.available === true, 'Admin có quyền xem leaderboard (available = true)');
  assert(Array.isArray(dataAdmin.data.leaderboard.items), 'leaderboard.items là mảng');
  assert(dataAdmin.data.leaderboard.items.length <= 5, 'Leaderboard trả về tối đa 5 CTV');
  assert(dataAdmin.data.leaderboard.metadata?.scope === 'SYSTEM_WIDE_ALL_TIME', 'Leaderboard metadata scope là SYSTEM_WIDE_ALL_TIME');
  assert(dataAdmin.data.leaderboard.metadata?.criteria === 'TOTAL_APPROVED_REWARD_AMOUNT', 'Leaderboard criteria là TOTAL_APPROVED_REWARD_AMOUNT');

  if (dataAdmin.data.leaderboard.items.length > 0) {
    const item = dataAdmin.data.leaderboard.items[0];
    assert(typeof item.rank === 'number' && item.rank >= 1, 'Top CTV có rank hợp lệ >= 1');
    assert(typeof item.affiliate_code === 'string' && item.affiliate_code.length > 0, 'Top CTV có affiliate_code');
    assert(typeof item.affiliate_name === 'string' && item.affiliate_name.length > 0, 'Top CTV có affiliate_name');
    assert(typeof item.approved_reward_amount === 'number' && item.approved_reward_amount > 0, 'approved_reward_amount > 0');
  }

  // 2. Staff without rewards.summary Permission
  console.log('\n--- 2. Kiểm tra Staff không có quyền rewards.summary (Redaction Leaderboard) ---');
  const resStaff = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary`, {
    headers: { Authorization: `Bearer ${STAFF_TOKEN}` }
  });
  assert(resStaff.status === 200, 'Staff request vẫn trả về HTTP 200 OK (không bị 403 toàn bộ)');
  const dataStaff = (await resStaff.json()) as any;
  assert(dataStaff.success === true, 'Response JSON có success = true');
  assert(!!dataStaff.data.recent_leads, 'Staff vẫn nhận được khối recent_leads');
  assert(Array.isArray(dataStaff.data.recent_leads.leads), 'Staff nhận recent_leads là mảng');
  assert(dataStaff.data.leaderboard?.available === false, 'Staff bị ẩn leaderboard (available = false)');
  assert(dataStaff.data.leaderboard?.reason_code === 'PERMISSION_DENIED', 'Leaderboard reason_code là PERMISSION_DENIED');
  assert(dataStaff.data.leaderboard?.items === null, 'Leaderboard items là null (không rò rỉ tên/tiền Top CTV)');
  assert(dataStaff.data.rewards?.available === false, 'Rewards bị ẩn an toàn với available = false');

  // 3. Filter Impact Test
  console.log('\n--- 3. Kiểm tra ma trận tác động bộ lọc lên Recent Leads vs Leaderboard ---');
  const resFilter = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary?course_id=ALL&affiliate_id=ALL`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });
  const dataFilter = (await resFilter.json()) as any;
  assert(resFilter.status === 200, 'Bộ lọc hợp lệ trả về HTTP 200 OK');
  assert(dataFilter.data.metadata.recent_leads_scope === 'FILTERED_REGISTRATION_COHORT', 'Metadata scope recent_leads ghi nhận FILTERED_REGISTRATION_COHORT');
  assert(dataFilter.data.metadata.leaderboard_scope === 'SYSTEM_WIDE_ALL_TIME', 'Metadata scope leaderboard ghi nhận SYSTEM_WIDE_ALL_TIME');

  // 4. Unauthenticated Access
  console.log('\n--- 4. Kiểm tra Chặn truy cập không có Token ---');
  const resUnauth = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary`);
  assert(resUnauth.status === 401, 'Không có token trả về HTTP 401 Unauthorized');

  console.log('\n================================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} TIÊU CHÍ ĐẠT (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
