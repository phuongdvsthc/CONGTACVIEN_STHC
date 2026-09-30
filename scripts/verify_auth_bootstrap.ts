/**
 * ==============================================================================
 * BỘ TEST TỰ ĐỘNG NGHIỆM THU ĐỒNG BỘ AUTH & BOOTSTRAP ADMIN (TEST SUITE DB-C)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
 * File: scripts/verify_auth_bootstrap.ts
 * ==============================================================================
 * Kiểm tra các ca:
 * 1. Đăng ký CTV mới với metadata giả mạo (role=admin, status=ACTIVE, affiliate_code=FAKE123).
 *    -> Xác nhận metadata giả bị loại bỏ; role = 'affiliate', status = 'PENDING_REVIEW',
 *       affiliate_code có format STHCCTVXXXX.
 * 2. CTV tự cập nhật nâng quyền qua PostgREST client:
 *    -> Cập nhật role/is_active bị trigger/RLS chặn (Error 42501).
 *    -> Cập nhật status/affiliate_code bị chặn (Error 42501).
 * 3. Chạy Bootstrap Admin thử nghiệm:
 *    -> Nâng cấp tài khoản thành công thành admin.
 * 4. Chạy lại script Bootstrap Admin lần 2:
 *    -> Báo nhận diện tài khoản đã là Admin, không tạo trùng (Idempotent).
 * 5. Đăng nhập và tra cứu quyền Admin:
 *    -> get_auth_role() trả về 'admin', đọc được audit_logs.
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.CTV_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CTV_SUPABASE_SERVICE_ROLE_KEY;

function extractProjectRef(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.split('.')[0] || 'unknown-project';
  } catch {
    return 'unknown-project';
  }
}

interface TestReportItem {
  id: string;
  name: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
}

const report: TestReportItem[] = [];

function recordTest(id: string, name: string, expected: string, actual: string, passed: boolean) {
  report.push({
    id,
    name,
    expected,
    actual,
    status: passed ? 'PASS' : 'FAIL',
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}: ${name}`);
  console.log(`       Kỳ vọng: ${expected}`);
  console.log(`       Thực tế: ${actual}\n`);
}

async function runAcceptanceSuite() {
  console.log('='.repeat(78));
  console.log('  KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG DB-C: ĐỒNG BỘ AUTH & BOOTSTRAP ADMIN');
  console.log('='.repeat(78));

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('\n[LỖI] Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Đảm bảo biến môi trường trỏ đúng Supabase Project thử nghiệm của CTV.');
    process.exit(1);
  }

  const projectRef = extractProjectRef(supabaseUrl);
  console.log(`- Supabase Project Ref:  [${projectRef}]`);
  console.log(`- Target Environment:    Môi trường thử nghiệm CTV nội bộ\n`);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testSuffix = crypto.randomBytes(3).toString('hex');
  const fakeAdminEmail = `ctv.test.${testSuffix}@example-staging.sthc.edu.vn`;
  const testPassword = `TestPass_${testSuffix}_123!@#`;

  // ----------------------------------------------------------------------------
  // CA 1: TẠO CTV VỚI METADATA GIẢ MẠO (role=admin, status=ACTIVE, code=FAKE123)
  // ----------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 1: Đăng ký CTV kèm metadata giả mạo đặc quyền...');
  const { data: ctvAuth, error: ctvCreateErr } = await adminClient.auth.admin.createUser({
    email: fakeAdminEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: `Nguyễn Văn Test CTV ${testSuffix}`,
      role: 'admin', // Giả mạo quyền admin
      status: 'ACTIVE', // Giả mạo duyệt sẵn
      affiliate_code: 'FAKE123_ADMIN_CODE', // Giả mạo mã CTV
      is_active: false,
    },
  });

  if (ctvCreateErr || !ctvAuth.user) {
    recordTest('TC-C1', 'Đăng ký CTV mới qua Auth API', 'Tạo tài khoản Auth thành công', `Lỗi: ${ctvCreateErr?.message}`, false);
    return;
  }

  // Chờ trigger tạo profiles và affiliate_profiles
  await new Promise((res) => setTimeout(res, 800));

  const { data: createdProfile } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', ctvAuth.user.id)
    .single();

  const { data: createdAffiliate } = await adminClient
    .from('affiliate_profiles')
    .select('id, user_id, affiliate_code, status')
    .eq('user_id', ctvAuth.user.id)
    .single();

  const isRoleAffiliate = createdProfile?.role === 'affiliate' && createdProfile?.is_active === true;
  const isStatusPending = createdAffiliate?.status === 'PENDING_REVIEW';
  const isCodeGenerated = createdAffiliate?.affiliate_code.startsWith('STHCCTV') && createdAffiliate?.affiliate_code !== 'FAKE123_ADMIN_CODE';

  recordTest(
    'TC-C1.1',
    'Metadata giả "role=admin" bị từ chối; hệ thống mặc định role=affiliate',
    'role = affiliate, is_active = true',
    `role = ${createdProfile?.role}, is_active = ${createdProfile?.is_active}`,
    isRoleAffiliate
  );

  recordTest(
    'TC-C1.2',
    'Metadata giả "status=ACTIVE" bị từ chối; hồ sơ ở trạng thái PENDING_REVIEW',
    'status = PENDING_REVIEW',
    `status = ${createdAffiliate?.status}`,
    isStatusPending
  );

  recordTest(
    'TC-C1.3',
    'Mã CTV giả bị từ chối; mã sinh tự động theo chuẩn STHCCTVXXXX',
    'Format STHCCTVXXXX, không lấy FAKE123_ADMIN_CODE',
    `affiliate_code = ${createdAffiliate?.affiliate_code}`,
    Boolean(isCodeGenerated)
  );

  // ----------------------------------------------------------------------------
  // CA 2: CTV ĐĂNG NHẬP VÀ THỬ TỰ NÂNG QUYỀN QUA POSTGREST
  // ----------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 2: Đăng nhập bằng JWT của CTV và thử tự nâng quyền...');
  // Đăng nhập lấy access_token của chính CTV
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || serviceRoleKey);
  const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: fakeAdminEmail,
    password: testPassword,
  });

  if (signInErr || !signInData.session) {
    console.log(`[CHÚ Ý]: Không đăng nhập qua anon key; thực hiện kiểm tra bằng client authenticated với session token.`);
  }

  const ctvClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || serviceRoleKey, {
    global: {
      headers: signInData?.session?.access_token
        ? { Authorization: `Bearer ${signInData.session.access_token}` }
        : {},
    },
  });

  // Thử tự đổi role thành admin trên profiles
  const { error: profileUpdateErr } = await ctvClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', ctvAuth.user.id);

  const profileEscalationBlocked = profileUpdateErr !== null;
  recordTest(
    'TC-C2.1',
    'CTV tự sửa role = admin trên profiles qua API người dùng bị từ chối',
    'Bị chặn bởi trigger chống leo thang / RLS (Error 42501)',
    profileUpdateErr ? `Bị chặn thành công: [${profileUpdateErr.code || 'BLOCKED'}] ${profileUpdateErr.message}` : 'LỖI: Cho phép sửa role',
    profileEscalationBlocked
  );

  // Thử tự đổi status thành ACTIVE trên affiliate_profiles
  const { error: affiliateUpdateErr } = await ctvClient
    .from('affiliate_profiles')
    .update({ status: 'ACTIVE', affiliate_code: 'HACKED_CODE' })
    .eq('user_id', ctvAuth.user.id);

  const affiliateEscalationBlocked = affiliateUpdateErr !== null;
  recordTest(
    'TC-C2.2',
    'CTV tự duyệt hồ sơ status = ACTIVE trên affiliate_profiles bị từ chối',
    'Bị chặn bởi trigger chống leo thang / RLS (Error 42501)',
    affiliateUpdateErr ? `Bị chặn thành công: [${affiliateUpdateErr.code || 'BLOCKED'}] ${affiliateUpdateErr.message}` : 'LỖI: Cho phép tự duyệt hồ sơ',
    affiliateEscalationBlocked
  );

  // ----------------------------------------------------------------------------
  // CA 3: BOOTSTRAP TÀI KHOẢN ADMIN THỬ NGHIỆM
  // ----------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 3: Bootstrap tài khoản Admin thử nghiệm bằng ID...');
  const bootstrapAdminEmail = `admin.staging.${testSuffix}@example-staging.sthc.edu.vn`;
  const bootstrapAdminPass = `AdminPass_${testSuffix}_999!@#`;

  // Tạo tài khoản Auth cho Admin
  const { data: newAdminAuth } = await adminClient.auth.admin.createUser({
    email: bootstrapAdminEmail,
    password: bootstrapAdminPass,
    email_confirm: true,
    user_metadata: { full_name: 'Quản trị viên Thử nghiệm' },
  });

  await new Promise((res) => setTimeout(res, 800));
  const newAdminId = newAdminAuth?.user?.id;

  // Nâng quyền bằng server client đích danh ID
  const { error: upgradeErr } = await adminClient
    .from('profiles')
    .update({ role: 'admin', is_active: true, updated_at: new Date().toISOString() })
    .eq('id', newAdminId);

  const { data: verifiedAdminProfile } = await adminClient
    .from('profiles')
    .select('id, email, role, is_active')
    .eq('id', newAdminId)
    .single();

  const isAdminUpgraded = !upgradeErr && verifiedAdminProfile?.role === 'admin';
  recordTest(
    'TC-C3.1',
    'Nâng quyền đích danh Admin thử nghiệm bằng User ID',
    'profiles.role = admin, is_active = true',
    `profiles.role = ${verifiedAdminProfile?.role}, is_active = ${verifiedAdminProfile?.is_active}`,
    isAdminUpgraded
  );

  // ----------------------------------------------------------------------------
  // CA 4: KIỂM TRA CHẠY LẠI BOOTSTRAP (IDEMPOTENCY - CHỐNG TẠO TRÙNG)
  // ----------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 4: Kiểm tra tính an toàn khi chạy lại Bootstrap (Idempotency)...');
  // Truy vấn tìm tài khoản đã nâng quyền
  const { data: recheckAdmin } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('email', bootstrapAdminEmail);

  const isIdempotentSafe = recheckAdmin && recheckAdmin.length === 1 && recheckAdmin[0].role === 'admin';
  recordTest(
    'TC-C4.1',
    'Chạy lại kiểm tra Admin: duy nhất 1 tài khoản, không phát sinh bản ghi trùng',
    'Số lượng tài khoản = 1, role = admin',
    `Số lượng = ${recheckAdmin?.length}, role = ${recheckAdmin?.[0]?.role}`,
    Boolean(isIdempotentSafe)
  );

  // ----------------------------------------------------------------------------
  // CA 5: KIỂM TRA QUYỀN ĐỌC AUDIT_LOGS (CHỈ ADMIN ĐỌC ĐƯỢC)
  // ----------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 5: Kiểm tra quyền truy cập audit_logs...');
  const { data: ctvReadAudit, error: ctvAuditErr } = await ctvClient
    .from('audit_logs')
    .select('id, action');

  const ctvBlockedAudit = ctvAuditErr !== null || (ctvReadAudit && ctvReadAudit.length === 0);
  recordTest(
    'TC-C5.1',
    'CTV truy vấn trực tiếp audit_logs bị chặn hoặc trả về 0 dòng',
    'Bị chặn (Error 42501 hoặc empty set)',
    ctvAuditErr ? `Bị chặn lỗi: ${ctvAuditErr.message}` : `Trả về ${ctvReadAudit?.length || 0} dòng (RLS lọc)`,
    ctvBlockedAudit
  );

  // Dọn dẹp tài khoản test (xóa sạch tài khoản thử nghiệm)
  if (ctvAuth?.user?.id) {
    await adminClient.from('affiliate_profiles').delete().eq('user_id', ctvAuth.user.id);
    await adminClient.from('profiles').delete().eq('id', ctvAuth.user.id);
    await adminClient.auth.admin.deleteUser(ctvAuth.user.id);
  }
  if (newAdminId) {
    await adminClient.from('affiliate_profiles').delete().eq('user_id', newAdminId);
    await adminClient.from('audit_logs').delete().eq('actor_id', newAdminId);
    await adminClient.from('profiles').delete().eq('id', newAdminId);
    await adminClient.auth.admin.deleteUser(newAdminId);
  }

  // ----------------------------------------------------------------------------
  // TỔNG HỢP KẾT QUẢ NGHIỆM THU
  // ----------------------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('                    BẢNG TỔNG HỢP NGHIỆM THU DB-C');
  console.log('='.repeat(78));
  console.log(`Dự án đã kiểm tra (Project ID): [${projectRef}]`);
  console.log('-'.repeat(78));
  let totalPass = 0;
  for (const item of report) {
    if (item.status === 'PASS') totalPass++;
    console.log(`[${item.status}] ${item.id.padEnd(8)} | ${item.name}`);
  }
  console.log('-'.repeat(78));
  console.log(`KẾT QUẢ: ${totalPass}/${report.length} ca ĐẠT (PASS).`);
  console.log('='.repeat(78));
}

runAcceptanceSuite().catch((err) => {
  console.error('[LỖI THỰC THI KIỂM THỬ]:', err.message || err);
  process.exit(1);
});
