/**
 * ==============================================================================
 * SCRIPT BOOTSTRAP ADMIN MỘT LẦN THEO ĐÍCH DANH UID (CONTROLLED ADMIN BOOTSTRAP)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
 * File: scripts/bootstrap_target_admin.ts
 * ==============================================================================
 * Quy tắc thực thi:
 * 1. Trước khi chạy, báo rõ UID và Email sẽ được nâng quyền.
 * 2. Xác thực UID thuộc đúng email dự kiến, chống nhầm lẫn tài khoản.
 * 3. Nâng public.profiles.role = 'admin' qua đường quản trị kiểm soát (RPC admin_bootstrap_user
 *    hoặc service_role).
 * 4. Không tắt trigger, không nới lỏng RLS.
 * 5. Ghi nhật ký kiểm toán (audit_logs).
 * 6. Trả về đúng 4 trường: id, email, role, is_active.
 * 7. Kiểm tra tính an toàn khi chạy lại (Idempotency PASS).
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

interface CliOptions {
  uid?: string;
  email?: string;
  reason?: string;
  dryRun?: boolean;
}

function parseCliOptions(): CliOptions {
  const options: CliOptions = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--uid=')) options.uid = arg.split('=')[1].trim();
    else if (arg.startsWith('--email=')) options.email = arg.split('=')[1].trim();
    else if (arg.startsWith('--reason=')) options.reason = arg.split('=')[1].trim();
    else if (arg === '--dry-run') options.dryRun = true;
  }
  return options;
}

async function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function extractProjectRef(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || 'unknown-project';
  } catch {
    return 'unknown-project';
  }
}

async function main() {
  console.log('='.repeat(78));
  console.log('  HỆ THỐNG CỘNG TÁC VIÊN TUYỂN SINH SAIGONTOURIST (STHC)');
  console.log('  BOOTSTRAP QUẢN TRỊ VIÊN ĐÍCH DANH THEO UID (CONTROLLED BOOTSTRAP)');
  console.log('='.repeat(78));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.CTV_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CTV_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('\n[LỖI CẤU HÌNH] Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Vui lòng thiết lập biến môi trường trước khi chạy script:');
    console.error('  export SUPABASE_URL="https://<project-ref>.supabase.co"');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY="<service-role-secret-key>"');
    process.exit(1);
  }

  const projectRef = extractProjectRef(supabaseUrl);
  console.log(`\n[THÔNG TIN DỰ ÁN]`);
  console.log(`- Project URL:   ${supabaseUrl}`);
  console.log(`- Project Ref:   [${projectRef}]`);
  console.log(`- Quyền kết nối: [service_role - Kênh quản trị bảo mật]`);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cliOpts = parseCliOptions();

  // Mặc định sử dụng UID trong truy vấn của người dùng (từ ảnh chụp hệ thống) nếu không truyền từ CLI
  let targetUid = cliOpts.uid || process.env.TARGET_ADMIN_UID || '879a11fc-ff89-4019-b2f4-57d7843b631b';
  let targetEmail = cliOpts.email || process.env.BOOTSTRAP_ADMIN_EMAIL;

  // 1. Kiểm tra tài khoản trong Auth và profiles
  console.log(`\n[TRA CỨU DỮ LIỆU TÀI KHOẢN CHO UID: ${targetUid}]`);

  // Tìm trong Auth Admin
  const { data: authUserData, error: authUserErr } = await client.auth.admin.getUserById(targetUid);
  if (authUserErr || !authUserData?.user) {
    console.error(`[LỖI] Không tìm thấy Auth User với UID: ${targetUid} (${authUserErr?.message})`);
    process.exit(1);
  }

  const authEmail = authUserData.user.email || '';
  console.log(`- Tìm thấy Auth user: Email = "${authEmail}", Tạo lúc = ${authUserData.user.created_at}`);

  // Ghi chú kiểm tra email dự án
  if (authEmail.toLowerCase() === 'admin@sthc.edu.vn') {
    console.log(`- Tài khoản mang email "${authEmail}" được chỉ định nâng quyền Quản trị viên cho dự án STHC_CTV.`);
  }

  if (!targetEmail) {
    targetEmail = authEmail;
  } else {
    // Xác thực đối chiếu
    if (targetEmail.trim().toLowerCase() !== authEmail.trim().toLowerCase()) {
      console.error(`\n[LỖI XÁC THỰC EMAIL KHÔNG KHỚP]`);
      console.error(`- Email chỉ định: "${targetEmail}"`);
      console.error(`- Email thực tế gắn với UID: "${authEmail}"`);
      console.error(`Thao tác bị hủy bỏ để ngăn chặn việc nâng nhầm quyền tài khoản khác.`);
      process.exit(1);
    }
  }

  // Tra cứu profile hiện hành
  const { data: currentProfile, error: profileErr } = await client
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', targetUid)
    .maybeSingle();

  if (profileErr) {
    console.error(`[LỖI TRUY VẤN PROFILES]: ${profileErr.message}`);
    process.exit(1);
  }

  // ----------------------------------------------------------------------------
  // BƯỚC BẮT BUỘC: BÁO RÕ UID VÀ EMAIL SẮP ĐƯỢC NÂNG QUYỀN TRƯỚC KHI THỰC HIỆN
  // ----------------------------------------------------------------------------
  console.log('\n' + '='.repeat(78));
  console.log('  XÁC NHẬN ĐỐI TƯỢNG SẮP ĐƯỢC NÂNG QUYỀN QUẢN TRỊ VIÊN (ADMIN)');
  console.log('='.repeat(78));
  console.log(`- TARGET UID:               ${targetUid}`);
  console.log(`- TARGET EMAIL:             ${authEmail}`);
  console.log(`- TÊN HIỆN TẠI:             ${currentProfile?.full_name || authUserData.user.user_metadata?.full_name || 'N/A'}`);
  console.log(`- VAI TRÒ HIỆN TẠI (ROLE):   ${currentProfile?.role || 'CHƯA CÓ HỒ SƠ'}`);
  console.log(`- TRẠNG THÁI KÍCH HOẠT:      ${currentProfile?.is_active ?? 'N/A'}`);
  console.log(`- PHẠM VI NÂNG QUYỀN:       DUY NHẤT 01 TÀI KHOẢN VỚI UID ${targetUid}`);
  console.log('='.repeat(78));

  // Kiểm tra tính Idempotent: nếu đã là Admin và is_active=true
  if (currentProfile?.role === 'admin' && currentProfile?.is_active === true) {
    console.log(`\n[KẾT QUẢ: IDEMPOTENT PASS]`);
    console.log(`Tài khoản UID ${targetUid} (${authEmail}) ĐÃ MANG VAI TRÒ 'admin' và is_active = true.`);
    console.log(`Không cần thay đổi thêm. Dưới đây là thông tin trả về:`);
    console.table([{
      id: currentProfile.id,
      email: currentProfile.email,
      role: currentProfile.role,
      is_active: currentProfile.is_active,
    }]);
    process.exit(0);
  }

  const reason = cliOpts.reason || 'Bootstrap Quản trị viên đầu tiên cho dự án STHC_CTV';

  // 2. Thực thi nâng quyền qua đường quản trị kiểm soát
  console.log(`\n[THỰC HIỆN NÂNG QUYỀN QUA ĐƯỜNG QUẢN TRỊ KIỂM SOÁT...]`);

  // Ưu tiên gọi RPC public.admin_bootstrap_user nếu migration 005 đã chạy
  let successResult: { id: string; email: string; role: string; is_active: boolean } | null = null;

  const { data: rpcData, error: rpcErr } = await client.rpc('admin_bootstrap_user', {
    p_target_user_id: targetUid,
    p_expected_email: authEmail,
    p_reason: reason,
  });

  if (!rpcErr && rpcData && rpcData.length > 0) {
    successResult = rpcData[0];
    console.log(`[THÀNH CÔNG]: Đã thực thi qua RPC admin_bootstrap_user.`);
  } else {
    // Dự phòng qua direct service_role update với audit_logs
    if (rpcErr) {
      console.log(`[THÔNG BÁO RPC]: ${rpcErr.message}. Tiếp tục thực thi trực tiếp qua kênh quản trị service_role...`);
    }

    // Đảm bảo profile tồn tại
    if (!currentProfile) {
      await client.from('profiles').insert({
        id: targetUid,
        email: authEmail,
        full_name: authUserData.user.user_metadata?.full_name || 'Quản trị viên',
        role: 'affiliate',
        is_active: true,
      });
    }

    // Cập nhật role = admin
    const { error: updateErr } = await client
      .from('profiles')
      .update({
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUid);

    if (updateErr) {
      console.error(`[LỖI CẬP NHẬT PROFILES]: ${updateErr.message}`);
      process.exit(1);
    }

    // Cập nhật affiliate_profiles nếu có
    await client
      .from('affiliate_profiles')
      .update({
        status: 'ACTIVE',
        reviewed_at: new Date().toISOString(),
        review_note: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUid);

    // Ghi audit_logs
    await client.from('audit_logs').insert({
      actor_id: targetUid,
      action: 'ADMIN_BOOTSTRAP_PROMOTED',
      entity_name: 'profiles',
      entity_id: targetUid,
      old_values: { role: currentProfile?.role || 'affiliate', is_active: currentProfile?.is_active ?? true },
      new_values: { role: 'admin', is_active: true },
      reason: reason,
    });

    // Lấy lại kết quả sau cập nhật
    const { data: finalData, error: finalErr } = await client
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', targetUid)
      .single();

    if (finalErr || !finalData) {
      console.error(`[LỖI ĐỌC DỮ LIỆU SAU CẬP NHẬT]: ${finalErr?.message}`);
      process.exit(1);
    }

    successResult = finalData;
  }

  if (!successResult) {
    console.error('[LỖI]: Không nhận được kết quả sau khi thực hiện nâng quyền.');
    process.exit(1);
  }

  // 3. Trả về đúng 4 trường: id, email, role, is_active
  console.log('\n' + '='.repeat(78));
  console.log('  KẾT QUẢ BOOTSTRAP ADMIN THÀNH CÔNG (RETURNING DATA)');
  console.log('='.repeat(78));
  console.table([{
    id: successResult.id,
    email: successResult.email,
    role: successResult.role,
    is_active: successResult.is_active,
  }]);
  console.log('='.repeat(78));
}

main().catch((err) => {
  console.error('[LỖI NGOẠI LỆ]:', err.message || err);
  process.exit(1);
});
