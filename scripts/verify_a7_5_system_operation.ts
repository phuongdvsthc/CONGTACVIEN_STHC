/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHỨC NĂNG A7.5 – THÔNG TIN VẬN HÀNH (SYSTEM OPERATION)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)
 * ==============================================================================
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  validatePublicBaseUrl,
  validateSupportEmail,
  validateSupportPhone,
  validateTimezone,
  formatPhoneNumberVi,
} from '../src/utils/operationValidation';
import {
  buildCourseReferralUrl,
  buildCatalogReferralUrl,
  sanitizeBaseUrl,
} from '../src/utils/referralLinkHelper';
import { formatDateTimeVi, formatDateOnlyVi } from '../src/utils/dateFormatter';

const API_BASE = 'http://127.0.0.1:3000';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Demo tokens
const ADMIN_TOKEN = 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b';
const STAFF_TOKEN = 'Bearer demo-session-token-28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f';
const CTV_TOKEN = 'Bearer demo-session-token-33333333-3333-4333-a333-333333333333';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] TC-A7.5-${String(totalTests).padStart(2, '0')}: ${testName}`);
    if (detail) console.log(`       -> ${detail}`);
  } else {
    failedTests++;
    console.error(`[FAIL] TC-A7.5-${String(totalTests).padStart(2, '0')}: ${testName}`);
    if (detail) console.error(`       -> ${detail}`);
  }
}

async function runTests() {
  console.log('==============================================================================');
  console.log('KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG A7.5: THÔNG TIN VẬN HÀNH (SYSTEM OPERATION)');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('==============================================================================\n');

  try {
    // --------------------------------------------------------------------------
    // 1. Kiểm tra đọc và ghi cấu hình vận hành (GET & PUT)
    // --------------------------------------------------------------------------
    const resGet1 = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
      headers: { Authorization: ADMIN_TOKEN },
    });
    const dataGet1 = await resGet1.json();
    assert(
      resGet1.status === 200 && dataGet1.success && dataGet1.data?.settings,
      'Admin đọc thành công cấu hình hệ thống hiện tại từ Supabase',
      `Revision hiện tại: #${dataGet1.data?.settings?.revision}, public_base_url: ${dataGet1.data?.settings?.public_base_url}`
    );

    const initialRevision = dataGet1.data.settings.revision;
    const initialBranding = {
      system_name: dataGet1.data.settings.system_name,
      system_short_name: dataGet1.data.settings.system_short_name,
      unit_name: dataGet1.data.settings.unit_name,
    };

    // --------------------------------------------------------------------------
    // 2. Kiểm tra lưu Thông tin vận hành qua PUT /api/v1/admin/system-settings/operation
    // --------------------------------------------------------------------------
    const testBaseUrl = 'https://ctv.sthc.edu.vn/'; // Có trailing slash để test chuẩn hóa
    const testEmail = ' tuyensinh@sthc.edu.vn ';
    const testPhone = '+84 28 3844 6480'; // Cần chuẩn hóa về 02838446480
    const testTz = 'Asia/Ho_Chi_Minh';

    const resPut1 = await fetch(`${API_BASE}/api/v1/admin/system-settings/operation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: initialRevision,
        data: {
          public_base_url: testBaseUrl,
          support_email: testEmail,
          support_phone: testPhone,
          timezone: testTz,
        },
        reason: 'Kiểm thử tự động A7.5: Cập nhật thông tin vận hành',
      }),
    });
    const dataPut1 = await resPut1.json();

    assert(
      resPut1.status === 200 &&
        dataPut1.success &&
        dataPut1.data?.public_base_url === 'https://ctv.sthc.edu.vn' &&
        dataPut1.data?.support_phone === '02838446480' &&
        dataPut1.data?.support_email === 'tuyensinh@sthc.edu.vn' &&
        dataPut1.data?.revision === initialRevision + 1,
      'Lưu thông tin vận hành thành công: chuẩn hóa URL (bỏ /) và số ĐT (+84 -> 028...)',
      `Revision mới: #${dataPut1.data?.revision}, Base URL: ${dataPut1.data?.public_base_url}, Phone: ${dataPut1.data?.support_phone}`
    );

    // --------------------------------------------------------------------------
    // 3. Kiểm tra tính bền vững: Đọc trực tiếp từ bảng system_settings trong Supabase
    // --------------------------------------------------------------------------
    const { data: dbDirect, error: dbDirectErr } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    assert(
      !dbDirectErr &&
        dbDirect &&
        dbDirect.public_base_url === 'https://ctv.sthc.edu.vn' &&
        dbDirect.support_phone === '02838446480' &&
        dbDirect.revision === initialRevision + 1,
      'Dữ liệu đã được ghi trực tiếp vào cơ sở dữ liệu Supabase (bền vững 100%)',
      `Database revision: #${dbDirect?.revision}, DB Phone: ${dbDirect?.support_phone}`
    );

    // --------------------------------------------------------------------------
    // 4. Kiểm tra phân quyền: Staff và CTV bị chặn hoàn toàn
    // --------------------------------------------------------------------------
    const resStaff = await fetch(`${API_BASE}/api/v1/admin/system-settings/operation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: STAFF_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: dbDirect.revision,
        data: { public_base_url: 'https://hacked.sthc.edu.vn' },
      }),
    });

    const resAnon = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {});

    assert(
      resStaff.status === 403 && (resAnon.status === 401 || resAnon.status === 403),
      'Chặn truy cập trái phép: Staff bị chặn 403 ADMIN_ONLY, Anonymous bị chặn 401',
      `Staff status: ${resStaff.status}, Anonymous status: ${resAnon.status}`
    );

    // --------------------------------------------------------------------------
    // 5. Kiểm tra validation URL: Bắt buộc HTTPS, chỉ nhận root URL
    // --------------------------------------------------------------------------
    const urlHttpCheck = validatePublicBaseUrl('http://ctv.sthc.edu.vn');
    const urlSubpathCheck = validatePublicBaseUrl('https://ctv.sthc.edu.vn/catalog');
    const urlQueryCheck = validatePublicBaseUrl('https://ctv.sthc.edu.vn?ref=ABC');
    const urlHashCheck = validatePublicBaseUrl('https://ctv.sthc.edu.vn#section');
    const urlCredCheck = validatePublicBaseUrl('https://user:pass@ctv.sthc.edu.vn');
    const urlValidCheck = validatePublicBaseUrl('https://ctv.sthc.edu.vn/');

    assert(
      !urlHttpCheck.valid &&
        !urlSubpathCheck.valid &&
        !urlQueryCheck.valid &&
        !urlHashCheck.valid &&
        !urlCredCheck.valid &&
        urlValidCheck.valid &&
        urlValidCheck.normalized === 'https://ctv.sthc.edu.vn',
      'Xác thực URL công khai: Chặn HTTP, chặn subpath, chặn query, fragment, credentials; chuẩn hóa bỏ /',
      `Từ chối HTTP: "${urlHttpCheck.error}", Từ chối Subpath: "${urlSubpathCheck.error}"`
    );

    // --------------------------------------------------------------------------
    // 6. Backend từ chối URL không hợp lệ (HTTP 400)
    // --------------------------------------------------------------------------
    const resBadUrl = await fetch(`${API_BASE}/api/v1/admin/system-settings/operation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: dbDirect.revision,
        data: {
          public_base_url: 'https://ctv.sthc.edu.vn/invalid-subpath',
        },
      }),
    });
    const dataBadUrl = await resBadUrl.json();

    assert(
      resBadUrl.status === 400 && dataBadUrl.success === false,
      'Backend từ chối URL có subpath (/invalid-subpath) với mã lỗi HTTP 400',
      `Thông báo lỗi: "${dataBadUrl.error}"`
    );

    // --------------------------------------------------------------------------
    // 7. Kiểm tra validation Email & Số điện thoại hỗ trợ
    // --------------------------------------------------------------------------
    const emailBadCheck = validateSupportEmail('invalid-email-no-at-sign');
    const emailGoodCheck = validateSupportEmail(' tuyensinh@sthc.edu.vn ');
    const phoneFixedCheck = validateSupportPhone('028 3844 6480'); // 11 số cố định
    const phoneMobileCheck = validateSupportPhone('0901.234.567'); // 10 số di động
    const phoneIntlCheck = validateSupportPhone('+84901234567'); // Mã quốc gia +84
    const phoneBadCheck = validateSupportPhone('0901 234 567 / 0908 123 456'); // Nhiều số

    assert(
      !emailBadCheck.valid &&
        emailGoodCheck.valid &&
        emailGoodCheck.normalized === 'tuyensinh@sthc.edu.vn' &&
        phoneFixedCheck.valid &&
        phoneFixedCheck.normalized === '02838446480' &&
        phoneMobileCheck.valid &&
        phoneMobileCheck.normalized === '0901234567' &&
        phoneIntlCheck.valid &&
        phoneIntlCheck.normalized === '0901234567' &&
        !phoneBadCheck.valid,
      'Xác thực Email & Số điện thoại: Chuẩn hóa di động 10 số, cố định 11 số, chặn đa số/ký tự lạ',
      `Cố định: ${phoneFixedCheck.normalized}, Di động: ${phoneMobileCheck.normalized}`
    );

    // --------------------------------------------------------------------------
    // 8. Kiểm tra múi giờ: Chặn múi giờ ngoài Asia/Ho_Chi_Minh
    // --------------------------------------------------------------------------
    const resBadTz = await fetch(`${API_BASE}/api/v1/admin/system-settings/operation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: dbDirect.revision,
        data: {
          timezone: 'America/New_York',
        },
      }),
    });
    const dataBadTz = await resBadTz.json();

    assert(
      resBadTz.status === 400 && dataBadTz.success === false,
      'Backend chặn múi giờ ngoài Asia/Ho_Chi_Minh với mã lỗi HTTP 400',
      `Thông báo lỗi: "${dataBadTz.error}"`
    );

    // --------------------------------------------------------------------------
    // 9. Kiểm tra tính độc lập giữa các nhóm (Lưu Vận hành không làm đổi Nhận diện)
    // --------------------------------------------------------------------------
    const { data: dbCheckIsolation } = await supabase.from('system_settings').select('*').eq('id', 1).single();

    assert(
      dbCheckIsolation.system_name === initialBranding.system_name &&
        dbCheckIsolation.system_short_name === initialBranding.system_short_name &&
        dbCheckIsolation.unit_name === initialBranding.unit_name,
      'Bảo toàn nhóm nhận diện: Lưu operation hoàn toàn không làm thay đổi branding',
      `System name: "${dbCheckIsolation.system_name}", Short: "${dbCheckIsolation.system_short_name}"`
    );

    // --------------------------------------------------------------------------
    // 10. Kiểm tra kiểm soát xung đột phiên bản (Optimistic Concurrency Control - 409)
    // --------------------------------------------------------------------------
    const resConflict = await fetch(`${API_BASE}/api/v1/admin/system-settings/operation`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ADMIN_TOKEN,
      },
      body: JSON.stringify({
        expected_revision: 99999, // Sai revision
        data: {
          support_email: 'newemail@sthc.edu.vn',
        },
      }),
    });
    const dataConflict = await resConflict.json();

    assert(
      resConflict.status === 409 && dataConflict.code === 'CONFIG_VERSION_CONFLICT',
      'Kiểm soát xung đột phiên bản (HTTP 409 CONFIG_VERSION_CONFLICT) khi expected_revision không khớp',
      `Lỗi trả về: "${dataConflict.error}"`
    );

    // --------------------------------------------------------------------------
    // 11. Kiểm tra đồng bộ tạo Link giới thiệu khóa học và Danh mục tuyển sinh
    // --------------------------------------------------------------------------
    const testAffCode = 'STHCCTV010088';
    const testCourseCode = 'CBMA-TC-01';

    const courseLinkRes = buildCourseReferralUrl(dbCheckIsolation.public_base_url, testAffCode, testCourseCode);
    const catalogLinkRes = buildCatalogReferralUrl(dbCheckIsolation.public_base_url, testAffCode);

    assert(
      courseLinkRes.error === null &&
        courseLinkRes.url === 'https://ctv.sthc.edu.vn/?ref=STHCCTV010088&course=CBMA-TC-01' &&
        catalogLinkRes.error === null &&
        catalogLinkRes.url === 'https://ctv.sthc.edu.vn/catalog?ref=STHCCTV010088',
      'Tạo Link giới thiệu khóa học và Danh mục CTV chuẩn hóa theo cấu hình public_base_url',
      `Khóa học: ${courseLinkRes.url} | Danh mục: ${catalogLinkRes.url}`
    );

    // --------------------------------------------------------------------------
    // 12. Kiểm tra API public/system-info an toàn không rò rỉ bí mật
    // --------------------------------------------------------------------------
    const resPublic = await fetch(`${API_BASE}/api/v1/public/system-info`);
    const dataPublic = await resPublic.json();
    const pData = dataPublic.data;

    assert(
      resPublic.status === 200 &&
        dataPublic.success &&
        pData.public_base_url === 'https://ctv.sthc.edu.vn' &&
        pData.support_phone === '02838446480' &&
        pData.support_email === 'tuyensinh@sthc.edu.vn' &&
        pData.timezone === 'Asia/Ho_Chi_Minh' &&
        pData.revision === undefined &&
        pData.updated_by === undefined,
      'API Public System Info cung cấp Allowlist đầy đủ, bảo vệ 100% bí mật (revision, updated_by)',
      `Allowlist: Base URL: ${pData.public_base_url}, Phone: ${pData.support_phone}, Timezone: ${pData.timezone}`
    );

    // --------------------------------------------------------------------------
    // 13. Kiểm tra Định dạng thời gian theo múi giờ Asia/Ho_Chi_Minh và Ngày thuần
    // --------------------------------------------------------------------------
    const sampleTimestamp = '2026-10-05T03:30:00Z'; // 03:30 UTC = 10:30 UTC+07
    const formattedTimestamp = formatDateTimeVi(sampleTimestamp);

    const sampleBirthdate = '2000-05-15'; // Ngày sinh thuần
    const formattedBirthdate = formatDateOnlyVi(sampleBirthdate);

    assert(
      formattedTimestamp.includes('10:30:00') &&
        formattedTimestamp.includes('05/10/2026') &&
        formattedBirthdate === '15/05/2000',
      'Định dạng thời gian: Timestamp chuyển đúng UTC+7 (10:30), Ngày thuần giữ nguyên không lệch (15/05/2000)',
      `Timestamp formatted: "${formattedTimestamp}", Birthdate formatted: "${formattedBirthdate}"`
    );

  } catch (err: any) {
    console.error('[UNEXPECTED ERROR IN TEST SUITE]', err);
    failedTests++;
  }

  console.log('\n==============================================================================');
  console.log('TỔNG KẾT KẾT QUẢ KIỂM THỬ A7.5:');
  console.log(`- Tổng số ca kiểm thử: ${totalTests}`);
  console.log(`- Thành công: ${passedTests}`);
  console.log(`- Thất bại: ${failedTests}`);
  console.log(`- Tỷ lệ đạt: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('==============================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests();
