/**
 * ==============================================================================
 * SCRIPT BOOTSTRAP QUẢN TRỊ VIÊN ĐẦU TIÊN (SERVER-SIDE ADMIN INITIALIZER)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
 * File: scripts/bootstrap_admin.ts
 * ==============================================================================
 * Nguyên tắc bảo mật tuyệt đối:
 * 1. Chạy trên môi trường Server/CLI bảo mật, sử dụng Service Role Key của đúng
 *    project Supabase CTV.
 * 2. TUYỆT ĐỐI KHÔNG ghi cứng URL, email, mật khẩu hay secret key vào source code.
 * 3. Chặn dùng tài khoản 'admin@sthc.edu.vn' của hệ thống Work + KPI.
 * 4. Liệt kê rõ project ID và tài khoản đích trước khi nâng quyền.
 * 5. Chỉ nâng quyền DUY NHẤT một Auth User được chỉ định bằng UUID cụ thể.
 * 6. Đảm bảo tính Idempotent (chạy lại nhiều lần an toàn, không tạo trùng lặp).
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as readline from 'readline';

// Tải cấu hình từ .env nếu có
dotenv.config();

interface CliArgs {
  email?: string;
  password?: string;
  name?: string;
}

function parseCliArgs(): CliArgs {
  const args: CliArgs = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--email=')) {
      args.email = arg.split('=')[1].trim();
    } else if (arg.startsWith('--password=')) {
      args.password = arg.split('=')[1].trim();
    } else if (arg.startsWith('--name=')) {
      args.name = arg.split('=')[1].trim();
    }
  }
  return args;
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

function generateSecureRandomPassword(length = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function extractProjectRef(supabaseUrl: string): string {
  try {
    const url = new URL(supabaseUrl);
    const hostParts = url.hostname.split('.');
    return hostParts[0] || url.hostname;
  } catch {
    return 'unknown-project';
  }
}

async function main() {
  console.log('='.repeat(78));
  console.log('  HỆ THỐNG CỘNG TÁC VIÊN TUYỂN SINH SAIGONTOURIST (STHC)');
  console.log('  BOOTSTRAP QUẢN TRỊ VIÊN ĐẦU TIÊN (SERVER-SIDE ONETIME SCRIPT)');
  console.log('='.repeat(78));

  // 1. Đọc và kiểm tra biến môi trường kết nối Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.CTV_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CTV_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('\n[LỖI CẤU HÌNH] Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    console.error('Vui lòng thiết lập biến môi trường trước khi chạy script:');
    console.error('  export SUPABASE_URL="https://<project-ref>.supabase.co"');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY="<service-role-secret-key>"');
    process.exit(1);
  }

  // 2. Xác nhận Project Ref và cảnh báo an toàn
  const projectRef = extractProjectRef(supabaseUrl);
  console.log(`\n[KIỂM TRA MÔI TRƯỜNG]`);
  console.log(`- Supabase URL:       ${supabaseUrl}`);
  console.log(`- Supabase Project ID: [${projectRef}]`);
  console.log(`- Service Key:        [ĐÃ TẢI AN TOÀN - ĐÃ CHE DẤU]`);

  // 3. Lấy thông tin email Admin
  const cliArgs = parseCliArgs();
  let adminEmail = cliArgs.email || process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!adminEmail) {
    if (process.stdin.isTTY) {
      adminEmail = await promptInput('\nNhập địa chỉ email cho tài khoản Admin cần bootstrap: ');
    } else {
      console.error('\n[LỖI] Chưa cung cấp email Admin. Sử dụng --email=<email> hoặc biến BOOTSTRAP_ADMIN_EMAIL.');
      process.exit(1);
    }
  }

  adminEmail = adminEmail.trim().toLowerCase();

  // BẢO VỆ CHẶN TÀI KHOẢN HỆ THỐNG KHÁC:
  if (adminEmail === 'admin@sthc.edu.vn') {
    console.error('\n[TỪ CHỐI AN TOÀN] Tuyệt đối không sử dụng tài khoản admin@sthc.edu.vn của hệ thống Work + KPI làm mặc định.');
    console.error('Vui lòng sử dụng địa chỉ email quản trị dành riêng cho Hệ thống Tuyển sinh CTV.');
    process.exit(1);
  }

  if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
    console.error(`\n[LỖI] Định dạng email không hợp lệ: "${adminEmail}"`);
    process.exit(1);
  }

  const adminName = cliArgs.name || process.env.BOOTSTRAP_ADMIN_NAME || 'Quản trị viên Tuyển sinh CTV';
  const adminPassword = cliArgs.password || process.env.BOOTSTRAP_ADMIN_PASSWORD || generateSecureRandomPassword();

  // Khởi tạo Supabase Admin Client với service_role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log(`\n[KIỂM TRA TÀI KHOẢN ADMIN HIỆN HÀNH TRÊN CSDL]`);
  const { data: existingAdmins, error: adminQueryErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .eq('role', 'admin');

  if (adminQueryErr) {
    console.error(`[LỖI TRUY VẤN PROFILES]: ${adminQueryErr.message}`);
    process.exit(1);
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.log(`Tìm thấy ${existingAdmins.length} tài khoản đang có vai trò Admin:`);
    for (const a of existingAdmins) {
      console.log(`  * ID: ${a.id} | Email: ${a.email} | Active: ${a.is_active} | Tạo lúc: ${a.created_at}`);
    }

    const alreadyAdmin = existingAdmins.find((a) => a.email.toLowerCase() === adminEmail);
    if (alreadyAdmin) {
      console.log(`\n[KẾT QUẢ: IDEMPOTENT PASS]`);
      console.log(`Tài khoản "${adminEmail}" (ID: ${alreadyAdmin.id}) đã là Quản trị viên (Admin).`);
      console.log(`Trạng thái: is_active = ${alreadyAdmin.is_active}.`);
      console.log(`Script kết thúc an toàn, không tạo trùng lặp hoặc tác động tài khoản khác.`);
      process.exit(0);
    }
  } else {
    console.log(`Hệ thống chưa có tài khoản Admin nào. Sẵn sàng khởi tạo Admin đầu tiên.`);
  }

  // 4. Tìm kiếm hoặc khởi tạo tài khoản trong auth.users
  console.log(`\n[TRA CỨU AUTH.USERS TẠI DỰ ÁN ${projectRef}]`);
  const { data: listUsersData, error: listUsersErr } = await supabase.auth.admin.listUsers();
  if (listUsersErr) {
    console.error(`[LỖI AUTH ADMIN API]: ${listUsersErr.message}`);
    process.exit(1);
  }

  let targetAuthUser = listUsersData.users.find(
    (u) => u.email?.toLowerCase() === adminEmail
  );

  let targetUserId: string;

  if (!targetAuthUser) {
    console.log(`Tài khoản Auth "${adminEmail}" chưa tồn tại.`);
    console.log(`Đang khởi tạo tài khoản mới qua Supabase Auth Admin API...`);

    const { data: createdAuthData, error: createAuthErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
      },
    });

    if (createAuthErr || !createdAuthData.user) {
      console.error(`[LỖI TẠO AUTH USER]: ${createAuthErr?.message}`);
      process.exit(1);
    }

    targetAuthUser = createdAuthData.user;
    targetUserId = targetAuthUser.id;
    console.log(`Tạo tài khoản Auth thành công với ID: ${targetUserId}`);

    // Đợi 800ms để trigger cơ sở dữ liệu hoàn tất tạo profiles & affiliate_profiles
    await new Promise((res) => setTimeout(res, 800));

    // Xác nhận trigger đã tự động tạo hồ sơ public.profiles
    const { data: triggerProfile, error: profileCheckErr } = await supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (profileCheckErr || !triggerProfile) {
      console.error(`[CẢNH BÁO TRIGGER]: Không tìm thấy profiles được tạo bởi trigger: ${profileCheckErr?.message}`);
      console.log(`Tiến hành tạo bổ sung profiles dự phòng...`);
      await supabase.from('profiles').insert({
        id: targetUserId,
        email: adminEmail,
        full_name: adminName,
        role: 'affiliate',
        is_active: true,
      });
    } else {
      console.log(`Xác nhận Trigger trg_on_auth_user_created đã khởi tạo hồ sơ thành công (Role ban đầu: ${triggerProfile.role}).`);
    }
  } else {
    targetUserId = targetAuthUser.id;
    console.log(`Tìm thấy tài khoản Auth hiện có (ID: ${targetUserId}). Không tạo tài khoản thứ hai.`);
  }

  // 5. Liệt kê thông tin tài khoản trước khi thực hiện nâng quyền
  console.log(`\n[THÔNG TIN TÀI KHOẢN SẮP ĐƯỢC NÂNG QUYỀN ADMIN]`);
  console.log(`- User ID:            ${targetUserId}`);
  console.log(`- Email:              ${adminEmail}`);
  console.log(`- Tên hiển thị:       ${adminName}`);
  console.log(`- Phạm vi nâng quyền: DUY NHẤT User ID ${targetUserId}`);

  // 6. Thực hiện nâng quyền Admin cho đúng ID đã chỉ định
  console.log(`\n[THỰC HIỆN NÂNG CẤP QUYỀN TRUY CẬP]`);

  // 6.1 Nâng role = 'admin' trong profiles
  const { error: updateProfileErr } = await supabase
    .from('profiles')
    .update({
      role: 'admin',
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId);

  if (updateProfileErr) {
    console.error(`[LỖI NÂNG CẤP PROFILES]: ${updateProfileErr.message}`);
    process.exit(1);
  }

  // 6.2 Cập nhật trạng thái duyệt ACTIVE trong affiliate_profiles nếu có
  await supabase
    .from('affiliate_profiles')
    .update({
      status: 'ACTIVE',
      reviewed_at: new Date().toISOString(),
      review_note: 'Khởi tạo Quản trị viên hệ thống qua Server Bootstrap API',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);

  // 6.3 Ghi nhật ký kiểm toán (audit_logs)
  await supabase.from('audit_logs').insert({
    actor_id: targetUserId,
    action: 'BOOTSTRAP_INITIAL_ADMIN',
    entity_name: 'profiles',
    entity_id: targetUserId,
    old_values: { role: 'affiliate' },
    new_values: { role: 'admin' },
    reason: 'Bootstrap Quản trị viên đầu tiên từ Server API an toàn',
  });

  // 7. Xác minh sau khi cập nhật (Post-Verification)
  const { data: finalProfile, error: verifyErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', targetUserId)
    .single();

  if (verifyErr || !finalProfile) {
    console.error(`[LỖI XÁC MINH SAU CẬP NHẬT]: ${verifyErr?.message}`);
    process.exit(1);
  }

  if (finalProfile.role !== 'admin' || !finalProfile.is_active) {
    console.error(`[THẤT BẠI]: Hồ sơ chưa đạt trạng thái admin kích hoạt. Role hiện tại: ${finalProfile.role}`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(78));
  console.log('  KẾT QUẢ NGHIỆM THU BOOTSTRAP ADMIN: [PASS]');
  console.log('='.repeat(78));
  console.log(`- Dự án kiểm tra (Project ID):  ${projectRef}`);
  console.log(`- Tài khoản Quản trị viên (ID): ${finalProfile.id}`);
  console.log(`- Email Admin:                  ${finalProfile.email}`);
  console.log(`- Vai trò xác nhận (Role):      ${finalProfile.role}`);
  console.log(`- Trạng thái kích hoạt:         ${finalProfile.is_active ? 'ACTIVE (TRUE)' : 'INACTIVE'}`);
  console.log(`- Bảo mật thông tin:            KHÔNG IN KHÓA BÍ MẬT HAY MẬT KHẨU VÀO LOG.`);
  console.log('='.repeat(78));
}

main().catch((err) => {
  console.error('[LỖI NGOẠI LỆ UNCAUGHT]:', err.message || err);
  process.exit(1);
});
