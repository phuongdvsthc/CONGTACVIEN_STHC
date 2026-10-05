/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHỨC NĂNG A7.7 – MÃ CỘNG TÁC VIÊN & CẤU HÌNH (AFFILIATE CODE)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)
 * ==============================================================================
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://127.0.0.1:3000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADMIN_TOKEN = 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] TC-A7.7-${String(totalTests).padStart(2, '0')}: ${testName}`);
    if (detail) console.log(`       -> ${detail}`);
  } else {
    failedTests++;
    console.error(`[FAIL] TC-A7.7-${String(totalTests).padStart(2, '0')}: ${testName}`);
    if (detail) console.error(`       -> ${detail}`);
  }
}

async function runTests() {
  console.log('==============================================================================');
  console.log('KHỞI CHẠY KIỂM THỬ A7.7: MÃ CỘNG TÁC VIÊN & CẤU HÌNH HỆ THỐNG');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('==============================================================================\n');

  try {
    // 1. Kiểm tra đọc cấu hình mã CTV hiện tại từ API Admin
    const resGet = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
      headers: { Authorization: ADMIN_TOKEN },
    });
    const dataGet = await resGet.json();
    assert(
      resGet.status === 200 && dataGet.success && dataGet.data?.settings,
      'Admin đọc thành công cấu hình mã CTV và thống kê bộ cấp mã',
      `Prefix hiện tại: ${dataGet.data?.settings?.affiliate_code_prefix}, Min Digits: ${dataGet.data?.settings?.affiliate_code_min_digits}, Tổng số mã trong registry: ${dataGet.data?.code_generator_stats?.total_issued_in_registry || 0}`
    );

    const initialRevision = dataGet.data.settings.revision;
    const initialPrefix = dataGet.data.settings.affiliate_code_prefix || 'STHCCTV';
    const initialMinDigits = dataGet.data.settings.affiliate_code_min_digits || 6;

    // 2. Kiểm tra cập nhật cấu hình tiền tố và độ dài mã qua API
    const testPrefix = 'STHCVN';
    const testMinDigits = 6;
    const resPut = await fetch(`${API_BASE}/api/v1/admin/system-settings/affiliate_code`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: initialRevision,
        data: {
          affiliate_code_prefix: testPrefix,
          affiliate_code_min_digits: testMinDigits,
        },
        reason: 'Kiểm thử cấu hình mã CTV tự động (A7.7)',
      }),
    });
    const dataPut = await resPut.json();
    assert(
      resPut.status === 200 && dataPut.success,
      'Cập nhật tiền tố và độ dài mã CTV qua API thành công',
      `New revision: ${dataPut.new_revision}`
    );

    // 3. Kiểm tra hàm RPC cấp mã nguyên tử trực tiếp trong CSDL (fn_generate_next_affiliate_code)
    const { data: rpcData, error: rpcError } = await supabase.rpc('fn_generate_next_affiliate_code', {
      p_assigned_user_id: null,
    });
    assert(
      !rpcError && rpcData && rpcData.success === true && rpcData.affiliate_code,
      'Hàm RPC nguyên tử fn_generate_next_affiliate_code cấp mã thành công',
      `Mã sinh ra: ${rpcData?.affiliate_code}, Sequence: ${rpcData?.sequence_number}, Prefix: ${rpcData?.prefix}`
    );

    const generatedCode = rpcData?.affiliate_code;
    const seqNum = rpcData?.sequence_number;

    assert(
      generatedCode?.startsWith(testPrefix),
      'Mã sinh ra tuân thủ đúng tiền tố (prefix) mới cấu hình',
      `Tiền tố mong đợi: ${testPrefix}, Mã thực tế: ${generatedCode}`
    );

    // 4. Kiểm tra mã được ghi nhận trong bảng affiliate_code_registry chính xác
    const { data: regData, error: regError } = await supabase
      .from('affiliate_code_registry')
      .select('*')
      .eq('affiliate_code', generatedCode)
      .single();

    assert(
      !regError && regData && regData.sequence_number === seqNum && regData.source_type === 'NEW',
      'Mã được lưu trữ và tra cứu chính xác trong bảng affiliate_code_registry',
      `Registry code: ${regData?.affiliate_code}, Source: ${regData?.source_type}, Sequence: ${regData?.sequence_number}`
    );

    // 5. Khôi phục lại cấu hình ban đầu để giữ ổn định hệ thống
    const resGetLatest = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
      headers: { Authorization: ADMIN_TOKEN },
    });
    const dataGetLatest = await resGetLatest.json();
    const currentRev = dataGetLatest.data.settings.revision;

    await fetch(`${API_BASE}/api/v1/admin/system-settings/affiliate_code`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: currentRev,
        data: {
          affiliate_code_prefix: initialPrefix,
          affiliate_code_min_digits: initialMinDigits,
        },
        reason: 'Khôi phục tiền tố ban đầu sau khi kiểm thử A7.7',
      }),
    });

    console.log('==============================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ A7.7: Tổng số: ${totalTests} | Đạt: ${passedTests} | Thất bại: ${failedTests}`);
    console.log('==============================================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Lỗi ngoại lệ trong quá trình kiểm thử A7.7:', err);
    process.exit(1);
  }
}

runTests();
