/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHỨC NĂNG A7.4 – NHẬN DIỆN BACKEND (SYSTEM BRANDING)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC_CTV)
 * ==============================================================================
 */

import { checkRouteAccess, AuthSessionData } from '../src/utils/navigationGuard';
import { ADMIN_NAV_ITEMS, AFFILIATE_NAV_ITEMS } from '../src/config/navConfig';

const PORT = '3000';
const API_BASE = `http://127.0.0.1:${PORT}`;

interface TestResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  durationMs: number;
}

const results: TestResult[] = [];

function logPass(id: string, name: string, message: string, start: number) {
  const durationMs = Date.now() - start;
  results.push({ id, name, status: 'PASS', message, durationMs });
  console.log(`\x1b[32m[PASS]\x1b[0m ${id}: ${name} (${durationMs}ms) -> ${message}`);
}

function logFail(id: string, name: string, message: string, start: number) {
  const durationMs = Date.now() - start;
  results.push({ id, name, status: 'FAIL', message, durationMs });
  console.error(`\x1b[31m[FAIL]\x1b[0m ${id}: ${name} (${durationMs}ms) -> ${message}`);
}

async function runA74Tests() {
  console.log('==============================================================================');
  console.log('BẮT ĐẦU KIỂM THỬ A7.4: NHẬN DIỆN BACKEND, ĐIỀU HƯỚNG & PHÂN QUYỀN');
  console.log(`Mục tiêu API: ${API_BASE}`);
  console.log('==============================================================================\n');

  // TC 1: Route Guard kiểm soát truy cập /admin/system-settings theo vai trò
  {
    const id = 'TC-A7.4-01';
    const name = 'Route Guard bảo vệ tuyến đường /admin/system-settings';
    const start = Date.now();
    try {
      // 1. Chưa đăng nhập
      const publicAuth: AuthSessionData = { role: 'public', user: null, affiliate: null };
      const resUnauth = checkRouteAccess('/admin/system-settings', publicAuth);
      if (resUnauth.allowed || resUnauth.reason !== 'UNAUTHENTICATED') {
        throw new Error(`Chưa đăng nhập không bị chuyển hướng về /login: ${JSON.stringify(resUnauth)}`);
      }

      // 2. Cộng tác viên (affiliate active)
      const ctvAuth: AuthSessionData = {
        role: 'affiliate_active',
        user: { id: 'ctv-1', email: 'ctv@sthc.edu.vn', full_name: 'CTV Test', role: 'affiliate', is_active: true },
        affiliate: { affiliate_code: 'STHCCTV1001', status: 'ACTIVE' },
      };
      const resCtv = checkRouteAccess('/admin/system-settings', ctvAuth);
      if (resCtv.allowed || resCtv.reason !== 'FORBIDDEN') {
        throw new Error(`CTV truy cập /admin/system-settings không bị chặn FORBIDDEN: ${JSON.stringify(resCtv)}`);
      }

      // 3. Cán bộ tuyển sinh (staff)
      const staffAuth: AuthSessionData = {
        role: 'staff',
        user: { id: 'staff-1', email: 'staff@sthc.edu.vn', full_name: 'Cán bộ Tuyển sinh', role: 'staff', is_active: true },
        affiliate: null,
      };
      const resStaff = checkRouteAccess('/admin/system-settings', staffAuth);
      if (resStaff.allowed || resStaff.reason !== 'FORBIDDEN') {
        throw new Error(`Staff truy cập /admin/system-settings không bị chặn FORBIDDEN: ${JSON.stringify(resStaff)}`);
      }

      // 4. Quản trị viên (admin)
      const adminAuth: AuthSessionData = {
        role: 'admin',
        user: { id: 'admin-1', email: 'admin@sthc.edu.vn', full_name: 'Quản trị viên', role: 'admin', is_active: true },
        affiliate: null,
      };
      const resAdmin = checkRouteAccess('/admin/system-settings', adminAuth);
      if (!resAdmin.allowed) {
        throw new Error(`Admin bị chặn khỏi /admin/system-settings: ${JSON.stringify(resAdmin)}`);
      }

      logPass(id, name, 'Đúng 100%: Public -> login; CTV & Staff -> FORBIDDEN (bị chặn hoàn toàn); Admin -> ALLOWED.', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 2: Vị trí menu Quản trị hệ thống trong Sidebar Admin và ẩn với Staff
  {
    const id = 'TC-A7.4-02';
    const name = 'Sidebar Admin hiển thị Quản trị hệ thống ở cuối danh sách, ẩn với Staff';
    const start = Date.now();
    try {
      const lastItem = ADMIN_NAV_ITEMS[ADMIN_NAV_ITEMS.length - 1];
      if (lastItem.id !== 'admin_system_settings' || lastItem.path !== '/admin/system-settings') {
        throw new Error(`Mục cuối sidebar Admin không phải là admin_system_settings (tìm thấy: ${lastItem.id})`);
      }
      if (!lastItem.adminOnly) {
        throw new Error('Mục Quản trị hệ thống không được đánh dấu adminOnly: true.');
      }

      // Giả lập filter menu theo vai trò của AppLayout
      const staffItems = ADMIN_NAV_ITEMS.filter(item => !item.adminOnly);
      const hasSystemSettingsInStaff = staffItems.some(item => item.id === 'admin_system_settings');
      if (hasSystemSettingsInStaff) {
        throw new Error('Mục Quản trị hệ thống bị lộ trong menu của Cán bộ Tuyển sinh (Staff)');
      }

      logPass(id, name, 'Mục Quản trị hệ thống nằm ở cuối danh sách sidebar Admin và tự động ẩn hoàn toàn với Staff.', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 3: API Public Allowlist /api/v1/public/system-info không để lộ cấu hình nhạy cảm
  {
    const id = 'TC-A7.4-03';
    const name = 'API Public Allowlist cung cấp nhận diện an toàn, không lộ bí mật';
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/v1/public/system-info`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(`Dữ liệu trả về không hợp lệ: ${JSON.stringify(json)}`);
      }

      const d = json.data;
      if (!d.system_name || !d.system_short_name || !d.unit_name) {
        throw new Error(`Thiếu các trường nhận diện cơ bản: ${JSON.stringify(d)}`);
      }

      // Kiểm tra không lộ các trường nhạy cảm
      const forbiddenFields = ['database_url', 'service_role_key', 'jwt_secret', 'updated_by', 'affiliate_code_current_sequence'];
      for (const field of forbiddenFields) {
        if (d[field] !== undefined) {
          throw new Error(`Trường nhạy cảm '${field}' bị rò rỉ qua Public API!`);
        }
      }

      logPass(id, name, `Public API trả về đúng nhận diện: [${d.system_short_name}] ${d.system_name} - ${d.unit_name}. An toàn 100%.`, start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 4: API Admin GET /api/v1/admin/system-settings chặn Staff và Unauth
  {
    const id = 'TC-A7.4-04';
    const name = 'Bảo vệ endpoint GET /api/v1/admin/system-settings';
    const start = Date.now();
    try {
      // 1. Không có token -> 401
      const resNoToken = await fetch(`${API_BASE}/api/v1/admin/system-settings`);
      if (resNoToken.status !== 401) {
        throw new Error(`Yêu cầu không token không trả về 401, nhận mã: ${resNoToken.status}`);
      }

      // 2. Token của Staff -> 403
      const resStaff = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
        headers: { Authorization: 'Bearer demo-session-token-28b8e82c-bc7e-4c0d-b9f1-bad1a3b8195f' },
      });
      if (resStaff.status !== 403) {
        throw new Error(`Yêu cầu của Staff không trả về 403 ADMIN_ONLY, nhận mã: ${resStaff.status}`);
      }

      // 3. Token của Admin -> 200
      const resAdmin = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
        headers: { Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b' },
      });
      if (resAdmin.status !== 200) {
        throw new Error(`Yêu cầu của Admin không thành công (HTTP ${resAdmin.status})`);
      }
      const adminData = await resAdmin.json();
      if (!adminData.success || !adminData.data?.settings) {
        throw new Error(`Cấu trúc phản hồi Admin không đúng: ${JSON.stringify(adminData)}`);
      }

      logPass(id, name, 'GET quản trị hệ thống chặn thành công Unauth (401) & Staff (403), Admin truy cập đầy đủ (200).', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 5: Cập nhật nhận diện backend qua PUT /api/v1/admin/system-settings/branding
  {
    const id = 'TC-A7.4-05';
    const name = 'Cập nhật nhóm nhận diện backend (PUT branding) kèm Optimistic Locking';
    const start = Date.now();
    try {
      // 1. Lấy revision hiện tại
      const resGet = await fetch(`${API_BASE}/api/v1/admin/system-settings`, {
        headers: { Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b' },
      });
      const currentConfig = (await resGet.json()).data.settings;
      const curRev = currentConfig.revision;

      // 2. Gửi PUT với dữ liệu hợp lệ
      const updatedSystemName = 'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (Official)';
      const updatedShortName = 'STHC_CTV';
      const updatedUnitName = 'Trường Trung cấp Du lịch & Khách sạn Saigontourist';

      const resPut = await fetch(`${API_BASE}/api/v1/admin/system-settings/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          expected_revision: curRev,
          data: {
            system_name: updatedSystemName,
            system_short_name: updatedShortName,
            unit_name: updatedUnitName,
            logo_backend_url: currentConfig.logo_backend_url || null,
            favicon_url: currentConfig.favicon_url || null,
          },
          reason: 'Kiểm thử cập nhật nhận diện backend A7.4',
        }),
      });

      if (!resPut.ok) {
        const errJson = await resPut.json();
        throw new Error(`PUT branding thất bại HTTP ${resPut.status}: ${JSON.stringify(errJson)}`);
      }

      const putResult = await resPut.json();
      if (!putResult.success || !putResult.data) {
        throw new Error(`Dữ liệu phản hồi PUT không thành công: ${JSON.stringify(putResult)}`);
      }

      if (putResult.data.revision !== curRev + 1) {
        throw new Error(`Revision không tăng đúng (kỳ vọng ${curRev + 1}, nhận ${putResult.data.revision})`);
      }

      logPass(id, name, `Cập nhật thành công nhóm branding, revision tăng từ #${curRev} lên #${putResult.data.revision}.`, start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 6: Phát hiện xung đột phiên bản (CONFIG_VERSION_CONFLICT) khi gửi revision cũ
  {
    const id = 'TC-A7.4-06';
    const name = 'Kiểm soát xung đột ghi đè (Optimistic Concurrency Control)';
    const start = Date.now();
    try {
      // Gửi revision cũ lệch với revision hiện tại
      const staleRev = 0;
      const resConflict = await fetch(`${API_BASE}/api/v1/admin/system-settings/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          expected_revision: staleRev,
          data: {
            system_name: 'Tên xung đột',
          },
          reason: 'Kiểm thử xung đột phiên bản',
        }),
      });

      if (resConflict.status !== 409) {
        throw new Error(`Hệ thống không trả về HTTP 409 Conflict khi gửi revision cũ, nhận mã: ${resConflict.status}`);
      }

      const errJson = await resConflict.json();
      if (errJson.code !== 'CONFIG_VERSION_CONFLICT') {
        throw new Error(`Mã lỗi không phải CONFIG_VERSION_CONFLICT: ${JSON.stringify(errJson)}`);
      }

      logPass(id, name, 'Hệ thống chặn thành công ghi đè với HTTP 409 CONFIG_VERSION_CONFLICT.', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 7: Kiểm tra validation nhận diện (Tên quá ngắn, trường ngoài allowlist)
  {
    const id = 'TC-A7.4-07';
    const name = 'Validation dữ liệu form nhận diện backend (Validation & Allowlist)';
    const start = Date.now();
    try {
      // 1. Tên hệ thống quá ngắn (< 3 ký tự)
      const resShort = await fetch(`${API_BASE}/api/v1/admin/system-settings/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          expected_revision: 9999,
          data: { system_name: 'AB' },
        }),
      });
      if (resShort.status !== 400) {
        throw new Error(`Tên hệ thống 'AB' không bị từ chối với HTTP 400, nhận mã: ${resShort.status}`);
      }

      // 2. Trường ngoài allowlist (hack field)
      const resHack = await fetch(`${API_BASE}/api/v1/admin/system-settings/branding`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          expected_revision: 9999,
          data: { system_name: 'Hệ thống Chuẩn', malicious_field: 'drop table' },
        }),
      });
      if (resHack.status !== 400) {
        throw new Error(`Trường ngoài allowlist không bị từ chối 400, nhận mã: ${resHack.status}`);
      }

      logPass(id, name, 'Backend kiểm tra nghiêm ngặt: từ chối tên ngắn (< 3 ký tự) và các trường ngoài allowlist.', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 8: Upload và kiểm tra Magic Bytes cho Logo & Favicon
  {
    const id = 'TC-A7.4-08';
    const name = 'Upload Logo & Favicon an toàn qua API Backend (Magic Bytes & Dung lượng)';
    const start = Date.now();
    try {
      // 1. Upload Logo PNG hợp lệ (PNG Magic bytes: 89 50 4E 47 0D 0A 1A 0A)
      const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const resLogo = await fetch(`${API_BASE}/api/v1/admin/system-settings/upload-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          type: 'logo',
          file_name: 'test_logo.png',
          file_base64: validPngBase64,
          mime_type: 'image/png',
        }),
      });

      if (!resLogo.ok) {
        const errJson = await resLogo.json();
        throw new Error(`Upload logo hợp lệ bị từ chối HTTP ${resLogo.status}: ${JSON.stringify(errJson)}`);
      }
      const logoJson = await resLogo.json();
      if (!logoJson.success || !logoJson.asset_path || !logoJson.asset_path.startsWith('branding/')) {
        throw new Error(`Đường dẫn asset_path trả về không hợp lệ: ${JSON.stringify(logoJson)}`);
      }

      // 2. Upload file giả mạo định dạng (chữ rác nhưng đặt type='logo') -> phải bị từ chối 400
      const fakeFileBase64 = Buffer.from('FAKE NOT AN IMAGE CONTENT').toString('base64');
      const resFake = await fetch(`${API_BASE}/api/v1/admin/system-settings/upload-asset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-session-token-879a11fc-ff89-4019-b2f4-57d7843b631b',
        },
        body: JSON.stringify({
          type: 'logo',
          file_name: 'fake.png',
          file_base64: fakeFileBase64,
          mime_type: 'image/png',
        }),
      });

      if (resFake.status !== 400) {
        throw new Error(`Tệp giả mạo không bị chặn bởi Magic Bytes (mã HTTP nhận được: ${resFake.status})`);
      }

      logPass(id, name, `Upload logo hợp lệ sinh asset_path '${logoJson.asset_path}', chặn đứng 100% tệp giả mạo định dạng.`, start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TC 9: Phục vụ ảnh Proxy an toàn qua /api/v1/public/branding/asset
  {
    const id = 'TC-A7.4-09';
    const name = 'Proxy phục vụ ảnh nhận diện an toàn chống Path Traversal';
    const start = Date.now();
    try {
      // 1. Thử tấn công path traversal (..)
      const resTraversal = await fetch(`${API_BASE}/api/v1/public/branding/asset?path=../../../etc/passwd`);
      if (resTraversal.status !== 400) {
        throw new Error(`Tấn công path traversal không bị chặn với HTTP 400, nhận mã: ${resTraversal.status}`);
      }

      // 2. Thử đọc đường dẫn không bắt đầu bằng 'branding/'
      const resOutside = await fetch(`${API_BASE}/api/v1/public/branding/asset?path=private/passwords.txt`);
      if (resOutside.status !== 400) {
        throw new Error(`Đường dẫn ngoài thư mục branding không bị chặn với HTTP 400, nhận mã: ${resOutside.status}`);
      }

      logPass(id, name, 'Đường dẫn proxy bảo vệ hoàn toàn chống Path Traversal và chỉ phục vụ thư mục branding hợp lệ.', start);
    } catch (e: any) {
      logFail(id, name, e.message, start);
    }
  }

  // TỔNG KẾT KẾT QUẢ KIỂM THỬ
  console.log('\n==============================================================================');
  console.log('TỔNG HỢP KẾT QUẢ KIỂM THỬ A7.4');
  console.log('==============================================================================');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`Tổng số ca kiểm thử: ${results.length}`);
  console.log(`\x1b[32mSố ca ĐẠT (PASS): ${passCount}\x1b[0m`);
  console.log(`\x1b[31mSố ca THẤT BẠI (FAIL): ${failCount}\x1b[0m`);

  if (failCount > 0) {
    console.error('\nChi tiết các ca thất bại:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.error(`- [${r.id}] ${r.name}: ${r.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n\x1b[32m>>> TOÀN BỘ 9/9 CA KIỂM THỬ A7.4 ĐÃ ĐẠT CHUẨN THÀNH CÔNG! <<<\x1b[0m\n');
  }
}

runA74Tests().catch((err) => {
  console.error('[TEST SUITE CRASH]', err);
  process.exit(1);
});
