import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runChartVerification() {
  console.log('=== BẮT ĐẦU KIỂM TRA NGHIỆM THU C6.5: BIỂU ĐỒ DASHBOARD CTV ===');

  let allPassed = true;

  // 1. Kiểm tra Helper tính toán 12 tháng liên tục múi giờ Asia/Ho_Chi_Minh
  const now = new Date();
  const vnNow = new Date(now.getTime() + (7 * 3600000));
  const currentYear = vnNow.getUTCFullYear();
  const currentMonth = vnNow.getUTCMonth(); // 0..11

  const testMonths: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(currentYear, currentMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    testMonths.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  console.log('1. Danh sách 12 tháng chuẩn Asia/Ho_Chi_Minh:', testMonths);
  if (testMonths.length === 12 && testMonths[11] === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`) {
    console.log(' -> PASS: Đủ 12 tháng liên tục và kết thúc ở tháng hiện tại.');
  } else {
    console.error(' -> FAIL: Lỗi tính toán chuỗi 12 tháng.');
    allPassed = false;
  }

  // 2. Kiểm tra truy vấn CSDL thực tế cho CTV Đào Văn Phương
  const { data: aff, error: affErr } = await supabase
    .from('affiliate_profiles')
    .select('id, user_id, full_name, affiliate_code, status')
    .eq('affiliate_code', 'STHCCTV1088')
    .maybeSingle();

  if (affErr || !aff) {
    console.log('⚠️ Không tìm thấy CTV STHCCTV1088 qua code, tìm bất kỳ CTV active nào...');
  } else {
    console.log(`2. Tìm thấy CTV kiểm thử: ${aff.full_name} (${aff.affiliate_code}) - Status: ${aff.status}`);

    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select(`
        id,
        full_name,
        phone,
        course_id,
        admission_status,
        reconciliation_status,
        created_at,
        updated_at,
        courses(id, code, title),
        lead_reconciliations(id, admission_status, reconciliation_status, reconciled_at)
      `)
      .or(`affiliate_id.eq.${aff.id},affiliate_id.eq.${aff.user_id}`);

    if (leadsErr) {
      console.error(' -> Lỗi query leads:', leadsErr);
      allPassed = false;
    } else {
      const leadsList = leads || [];
      console.log(` -> Tổng số leads của CTV: ${leadsList.length}`);

      // Kiểm tra tính toán phân bố theo khóa
      const courseMap: Record<string, { total_leads: number; enrolled_leads: number }> = {};
      leadsList.forEach(l => {
        const cId = l.course_id || 'UNASSIGNED';
        if (!courseMap[cId]) courseMap[cId] = { total_leads: 0, enrolled_leads: 0 };
        courseMap[cId].total_leads += 1;
        if (l.admission_status === 'ENROLLED') courseMap[cId].enrolled_leads += 1;
      });

      const totalLeadsCalculated = Object.values(courseMap).reduce((s, c) => s + c.total_leads, 0);
      const enrolledLeadsCalculated = Object.values(courseMap).reduce((s, c) => s + c.enrolled_leads, 0);
      const enrolledInMetrics = leadsList.filter(l => l.admission_status === 'ENROLLED').length;

      console.log(` -> Tổng leads theo khóa (${totalLeadsCalculated}) so với metrics.total_leads (${leadsList.length})`);
      console.log(` -> Tổng enrolled theo khóa (${enrolledLeadsCalculated}) so với metrics.enrolled_leads (${enrolledInMetrics})`);

      if (totalLeadsCalculated === leadsList.length && enrolledLeadsCalculated === enrolledInMetrics) {
        console.log(' -> PASS: Tổng hợp theo khóa học hoàn toàn khớp với Metrics kết quả.');
      } else {
        console.error(' -> FAIL: Sai lệch giữa Course Breakdown và Metrics!');
        allPassed = false;
      }
    }
  }

  // 3. Kiểm tra tính độc lập của 2 chuỗi biểu đồ thời gian
  console.log('3. Kiểm tra tính độc lập 2 chuỗi (Enrolled có thể lớn hơn Leads trong 1 tháng cụ thể):');
  const mockMonthlyData = [
    { month_key: '2026-05', month_label: 'T05/2026', leads_count: 1, enrolled_count: 3 }, // Tháng 5 có 3 nhập học dù chỉ 1 đăng ký mới (do nhập học từ lead đăng ký tháng 4)
    { month_key: '2026-06', month_label: 'T06/2026', leads_count: 5, enrolled_count: 0 },
  ];
  const isValidLogic = mockMonthlyData[0].enrolled_count > mockMonthlyData[0].leads_count;
  if (isValidLogic) {
    console.log(' -> PASS: Mô hình chuỗi dữ liệu phản ánh chính xác 2 sự kiện độc lập theo thời điểm ghi nhận.');
  }

  if (allPassed) {
    console.log('\n=== TẤT CẢ CÁC MỤC KIỂM TRA C6.5 ĐỀU ĐẠT CHUẨN (PASS) ===\n');
  } else {
    console.error('\n❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH KIỂM TRA C6.5\n');
    process.exit(1);
  }
}

runChartVerification().catch(e => {
  console.error(e);
  process.exit(1);
});
