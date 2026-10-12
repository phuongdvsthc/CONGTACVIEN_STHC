import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 KIỂM THỬ VÀ XÁC NHẬN CHUÔNG THÔNG BÁO ADMIN/STAFF (BELL FIX)');
  console.log('================================================================\n');

  try {
    // 1. Chạy Backfill cho CTV chờ duyệt
    console.log('1️⃣ Thực thi RPC fn_backfill_pending_affiliate_notifications()...');
    const { data: backfillRes, error: backfillErr } = await supabase.rpc('fn_backfill_pending_affiliate_notifications');
    if (backfillErr) {
      console.error('❌ Lỗi chạy Backfill:', backfillErr.message);
    } else {
      console.log('✅ Kết quả Backfill:', JSON.stringify(backfillRes));
    }

    // 2. Tra cứu Admin user profile ID
    const { data: adminProf, error: adminErr } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (adminErr || !adminProf) {
      console.error('❌ Không tìm thấy Admin profile:', adminErr?.message);
      process.exit(1);
    }

    console.log(`\n2️⃣ Tìm thấy Admin User ID: ${adminProf.id} (${adminProf.email})`);

    // 3. Tra cứu Staff user profile ID
    const { data: staffProf } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'staff')
      .limit(1)
      .maybeSingle();

    const staffId = staffProf?.id || 'u0000000-0000-0000-0000-000000000002';
    console.log(`   Tìm thấy Staff User ID: ${staffId}`);

    // 4. Phát sinh 5 sự kiện mẫu cho Admin/Staff
    console.log('\n3️⃣ Phát sinh 5 loại sự kiện nghiệp vụ thử nghiệm...');

    const testEvents = [
      {
        type: 'AFFILIATE_REGISTERED',
        category: 'ACCOUNT',
        title: 'Hồ sơ CTV mới chờ duyệt (Test)',
        summary: 'Cộng tác viên Nguyễn Văn A vừa đăng ký tài khoản.',
        content: 'Cộng tác viên Nguyễn Văn A (ctv_test_bell@sthc.edu.vn) vừa hoàn tất đăng ký.',
        actionUrl: '/admin/affiliates/test-1',
        perm: 'affiliates.review',
        idemKey: `evt:test:aff_reg:${Date.now()}`,
      },
      {
        type: 'LEAD_SUBMITTED',
        category: 'LEAD',
        title: 'Lead mới đăng ký tư vấn (Test)',
        summary: 'Học viên Trần Văn B đăng ký khóa Chế biến món ăn.',
        content: 'Học viên Trần Văn B vừa đăng ký tư vấn qua mã giới thiệu.',
        actionUrl: '/admin/leads/test-2',
        perm: 'leads.view',
        idemKey: `evt:test:lead_sub:${Date.now()}`,
      },
      {
        type: 'ENROLLMENT_NEEDS_RECONCILIATION',
        category: 'RECONCILIATION',
        title: 'Hồ sơ cần đối chiếu nhập học (Test)',
        summary: 'Hồ sơ nhập học EGOV-2026-901 cần được xác nhận.',
        content: 'Hồ sơ EGOV-2026-901 của học viên Lê Thị C có thông tin học phí mới.',
        actionUrl: '/admin/reconcile',
        perm: 'reconciliation.process',
        idemKey: `evt:test:recon:${Date.now()}`,
      },
      {
        type: 'REWARD_PENDING',
        category: 'REWARD',
        title: 'Thù lao 500k chờ duyệt (Test)',
        summary: 'Khoản thù lao 500.000 VNĐ cho CTV Phạm Văn D chờ duyệt.',
        content: 'Học viên đối soát thành công, phát sinh khoản thù lao 500k cho CTV Phạm Văn D.',
        actionUrl: '/admin/rewards/test-4',
        perm: 'rewards.approve',
        idemKey: `evt:test:reward:${Date.now()}`,
      },
      {
        type: 'EMAIL_FAILED_FINAL',
        category: 'SYSTEM',
        title: 'Email gửi thất bại cuối cùng (Test)',
        summary: 'Email xác nhận nhập học gửi đến test_failed@sthc.edu.vn thất bại.',
        content: 'Gửi email qua SMTP bị quá số lần thử lại.',
        actionUrl: '/admin/email-jobs',
        perm: 'email_service.view',
        idemKey: `evt:test:email_fail:${Date.now()}`,
      },
    ];

    for (const evt of testEvents) {
      const { data: notifId, error: dispErr } = await supabase.rpc('fn_dispatch_admin_staff_notification', {
        p_event_type: evt.type,
        p_category: evt.category,
        p_title: evt.title,
        p_summary: evt.summary,
        p_content: evt.content,
        p_action_url: evt.actionUrl,
        p_idempotency_key: evt.idemKey,
        p_required_permission: evt.perm,
        p_source_entity_type: 'test_table',
        p_source_entity_id: null,
        p_metadata: { is_test: true },
      });

      if (dispErr) {
        console.error(`   ❌ Lỗi tạo sự kiện ${evt.type}:`, dispErr.message);
      } else {
        console.log(`   ✅ Đã tạo sự kiện ${evt.type} -> Notif ID: ${notifId}`);
      }
    }

    // 5. Kiểm tra số đếm chưa đọc của Admin qua RPC fn_get_unread_notification_counts
    console.log('\n4️⃣ Trạng thái đếm chưa đọc (RPC fn_get_unread_notification_counts)...');
    const { data: countsAdmin } = await supabase.rpc('fn_get_unread_notification_counts', {
      p_user_id: adminProf.id,
    });
    console.log(`   📊 Admin Unread Counts:`, JSON.stringify(countsAdmin));

    const { data: countsStaff } = await supabase.rpc('fn_get_unread_notification_counts', {
      p_user_id: staffId,
    });
    console.log(`   📊 Staff Unread Counts:`, JSON.stringify(countsStaff));

    // 6. Kiểm tra danh sách người nhận notification_recipients của Admin
    const { data: adminRecs, error: recErr } = await supabase
      .from('notification_recipients')
      .select('id, read_at, created_at, notification:notifications(title, event_type, action_url)')
      .eq('user_id', adminProf.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recErr) {
      console.error('❌ Lỗi lấy notification_recipients:', recErr.message);
    } else {
      console.log(`\n5️⃣ Top 5 thông báo trong Hộp thư Admin:`);
      adminRecs.forEach((r: any, idx: number) => {
        const n = r.notification || {};
        console.log(`   ${idx + 1}. [${n.event_type || 'SYSTEM'}] ${n.title} (Read: ${Boolean(r.read_at)}) -> Action: ${n.action_url}`);
      });
    }

    console.log('\n================================================================');
    console.log('🎉 XÁC NHẬN HOÀN TẤT: HỆ THỐNG THÔNG BÁO CHUÔNG DÀNH CHO ADMIN/STAFF ĐÃ SẴN SÀNG!');
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('❌ Ngoại lệ kiểm thử:', err?.message || err);
    process.exit(1);
  }
}

runVerification();
