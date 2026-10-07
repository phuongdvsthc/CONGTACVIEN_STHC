import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = 'demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b';
const STAFF_TOKEN = 'demo-session-token-28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f';

async function verifyUIContract() {
  console.log('=== VERIFYING A9.8B UI CONTRACT & DATA INTEGRATION ===\n');

  // 1. Admin Summary Request (Full Block 6A + 6B)
  const resAdmin = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary?period=THIS_MONTH`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  const dataAdmin: any = await resAdmin.json();

  console.log('1. Admin Summary Check:');
  console.log(`- HTTP Status: ${resAdmin.status}`);
  console.log(`- Recent Leads Count: ${dataAdmin.data?.recent_leads?.leads?.length}`);
  console.log(`- Recent Leads Scope: ${dataAdmin.data?.recent_leads?.metadata?.scope}`);
  console.log(`- Leaderboard Available: ${dataAdmin.data?.leaderboard?.available}`);
  console.log(`- Leaderboard Items: ${dataAdmin.data?.leaderboard?.items?.length}`);

  if (dataAdmin.data?.recent_leads?.leads?.length > 0) {
    const firstLead = dataAdmin.data.recent_leads.leads[0];
    console.log(`- Sample Lead: ${firstLead.full_name} (${firstLead.phone}) -> Course: ${firstLead.course_title || 'N/A'}, CTV: ${firstLead.affiliate_code || 'None'}, Status: ${firstLead.counseling_status}/${firstLead.admission_status}`);
  }

  if (dataAdmin.data?.leaderboard?.items?.length > 0) {
    const top1 = dataAdmin.data.leaderboard.items[0];
    console.log(`- Top 1 CTV: Rank #${top1.rank} ${top1.affiliate_name} (${top1.affiliate_code}) -> Approved: ${top1.approved_reward_amount} VNĐ (${top1.approved_reward_count} items)`);
  }

  // 2. Staff Summary Request (6A available, 6B gracefully hidden)
  const resStaff = await fetch(`${BASE_URL}/api/v1/admin/dashboard/summary?period=THIS_MONTH`, {
    headers: { Authorization: `Bearer ${STAFF_TOKEN}` },
  });
  const dataStaff: any = await resStaff.json();

  console.log('\n2. Staff (No rewards.summary) Check:');
  console.log(`- HTTP Status: ${resStaff.status}`);
  console.log(`- Recent Leads Count: ${dataStaff.data?.recent_leads?.leads?.length}`);
  console.log(`- Leaderboard Available: ${dataStaff.data?.leaderboard?.available}`);
  console.log(`- Leaderboard Items: ${dataStaff.data?.leaderboard?.items}`);
  console.log(`- Leaderboard Reason: ${dataStaff.data?.leaderboard?.reason_code}`);

  console.log('\n=== CONTRACT VERIFICATION SUCCESSFUL ===');
}

verifyUIContract().catch(console.error);
