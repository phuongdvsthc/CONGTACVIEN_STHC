/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG C3.6A: SỰ KIỆN HỒ SƠ CTV VÀ KHÁCH ĐĂNG KÝ MỚI
 * Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
 * File: /scripts/verify_c3_6a_affiliate_and_lead_events.ts
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const API_BASE = 'http://127.0.0.1:3000';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

function logPass(id: string, name: string, details: string, start: number) {
  const durationMs = Date.now() - start;
  results.push({ id, name, passed: true, details, durationMs });
  console.log(`\x1b[32m[PASS]\x1b[0m ${id}: ${name} (${durationMs}ms)`);
  console.log(`       -> ${details}`);
}

function logFail(id: string, name: string, error: string, start: number) {
  const durationMs = Date.now() - start;
  results.push({ id, name, passed: false, details: error, durationMs });
  console.log(`\x1b[31m[FAIL]\x1b[0m ${id}: ${name} (${durationMs}ms)`);
  console.log(`       -> ${error}`);
}

async function runTestSuite() {
  console.log('==============================================================================');
  console.log('KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG C3.6A: SỰ KIỆN HỒ SƠ CTV & KHÁCH ĐĂNG KÝ MỚI');
  console.log(`Thời gian: ${new Date().toISOString()}`);
  console.log(`API Base: ${API_BASE}`);
  console.log('==============================================================================\n');

  // Tra cứu dữ liệu cơ sở: 1 tài khoản profile và 1 affiliate profile ACTIVE
  const { data: aff } = await supabase.from('affiliate_profiles').select('id, user_id, affiliate_code, status').eq('status', 'ACTIVE').limit(1).single();
  const { data: prof } = await supabase.from('profiles').select('id, email, full_name').eq('id', aff?.user_id).single();

  if (!prof || !aff) {
    console.error('Không tìm thấy dữ liệu profiles hoặc affiliate_profiles ACTIVE trong CSDL.');
    process.exit(1);
  }

  const targetUserId = aff.user_id || prof.id;
  const targetAffId = aff.id;
  const targetAffCode = aff.affiliate_code || 'STHCCTV6993';

  console.log(`CTV kiểm thử: id=${targetAffId}, user_id=${targetUserId}, code=${targetAffCode}\n`);

  // Dọn dẹp các bản ghi test cũ nếu có
  const createdTestEventIds: string[] = [];
  const createdTestNotifIds: string[] = [];

  // Helper đợi sự kiện chuyển sang trạng thái PROCESSED (xử lý an toàn khi worker ngầm backend đang chạy đồng thời)
  async function waitForEventProcessed(eventId: string, maxWaitMs = 4000) {
    const s = Date.now();
    while (Date.now() - s < maxWaitMs) {
      const { data } = await supabase
        .from('notification_events')
        .select('status, notification_id, last_error')
        .eq('id', eventId)
        .maybeSingle();
      if (data?.status === 'PROCESSED' && data?.notification_id) {
        return data;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    const { data: finalData } = await supabase
      .from('notification_events')
      .select('status, notification_id, last_error')
      .eq('id', eventId)
      .maybeSingle();
    return finalData;
  }

  // ============================================================================
  // TEST 1: AFFILIATE_APPROVED - Phê duyệt hồ sơ CTV
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-01';
    const testName = 'Sự kiện AFFILIATE_APPROVED và thông báo SYSTEM phê duyệt';

    try {
      const mockAuditId = `audit-test-apprv-${Date.now()}`;
      const idempotencyKey = `evt:AFFILIATE_APPROVED:${mockAuditId}`;

      // 1. Tạo sự kiện trong notification_events
      const { data: insEvt, error: insErr } = await supabase
        .from('notification_events')
        .insert({
          event_type: 'AFFILIATE_APPROVED',
          source_entity_type: 'affiliate_profiles',
          source_entity_id: targetAffId,
          transition_state: 'ACTIVE',
          idempotency_key: idempotencyKey,
          recipient_user_id: targetUserId,
          payload: {
            audit_log_id: mockAuditId,
            affiliate_id: targetAffId,
            affiliate_code: targetAffCode,
            status: 'ACTIVE',
          },
          status: 'PENDING',
          retry_count: 0,
        })
        .select()
        .single();

      if (insErr || !insEvt) throw new Error(insErr?.message || 'Không thể tạo event');
      createdTestEventIds.push(insEvt.id);

      // 2. Chạy Consumer để xử lý
      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      // 3. Kiểm tra bản ghi trong notification_events đã PROCESSED
      const updatedEvt = await waitForEventProcessed(insEvt.id);

      if (updatedEvt?.status !== 'PROCESSED' || !updatedEvt?.notification_id) {
        throw new Error(`Event chưa hoàn tất: status=${updatedEvt?.status}`);
      }
      createdTestNotifIds.push(updatedEvt.notification_id);

      // 4. Kiểm tra thông báo sinh ra trong notifications
      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', updatedEvt.notification_id)
        .single();

      if (!notif) throw new Error('Không tìm thấy thông báo tương ứng');
      if (notif.type !== 'SYSTEM') throw new Error(`Type mong muốn là SYSTEM, nhận: ${notif.type}`);
      if (notif.category !== 'ACCOUNT') throw new Error(`Category mong muốn là ACCOUNT, nhận: ${notif.category}`);
      if (notif.title !== 'Hồ sơ CTV đã được duyệt') throw new Error(`Tiêu đề không khớp: ${notif.title}`);
      if (notif.action_url !== '/portal') throw new Error(`Action URL không khớp: ${notif.action_url}`);
      if (!notif.summary.includes(targetAffCode)) throw new Error(`Summary không chứa mã CTV: ${notif.summary}`);

      // 5. Kiểm tra người nhận trong notification_recipients
      const { data: rec } = await supabase
        .from('notification_recipients')
        .select('*')
        .eq('notification_id', notif.id)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!rec) throw new Error('Không tìm thấy bản ghi người nhận đúng user_id của CTV');

      logPass(testId, testName, `Key=${idempotencyKey}, Title="${notif.title}", ActionURL="${notif.action_url}"`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 2: AFFILIATE_REJECTED - Từ chối hồ sơ CTV
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-02';
    const testName = 'Sự kiện AFFILIATE_REJECTED với lý do từ chối và đích /pending';

    try {
      const mockAuditId = `audit-test-rej-${Date.now()}`;
      const idempotencyKey = `evt:AFFILIATE_REJECTED:${mockAuditId}`;
      const reasonText = 'Ảnh chụp CCCD bị mờ, không rõ số';

      const { data: insEvt } = await supabase
        .from('notification_events')
        .insert({
          event_type: 'AFFILIATE_REJECTED',
          source_entity_type: 'affiliate_profiles',
          source_entity_id: targetAffId,
          transition_state: 'REJECTED',
          idempotency_key: idempotencyKey,
          recipient_user_id: targetUserId,
          payload: {
            audit_log_id: mockAuditId,
            affiliate_id: targetAffId,
            reason: reasonText,
            status: 'REJECTED',
          },
          status: 'PENDING',
          retry_count: 0,
        })
        .select()
        .single();

      if (insEvt) createdTestEventIds.push(insEvt.id);

      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      const updatedEvt = await waitForEventProcessed(insEvt!.id);

      if (updatedEvt?.notification_id) createdTestNotifIds.push(updatedEvt.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', updatedEvt!.notification_id)
        .single();

      if (notif.title !== 'Hồ sơ CTV chưa được duyệt') throw new Error(`Tiêu đề sai: ${notif.title}`);
      if (notif.action_url !== '/pending') throw new Error(`Đích điều hướng sai: ${notif.action_url}`);
      if (!notif.summary.includes(reasonText)) throw new Error('Summary không chứa lý do từ chối');

      logPass(testId, testName, `Title="${notif.title}", ActionURL="${notif.action_url}", Reason included in summary`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 3: AFFILIATE_SUSPENDED - Tạm ngưng hoạt động CTV
  // ============================================================================
  let firstSuspendAuditId = '';
  {
    const start = Date.now();
    const testId = 'TC-3.6A-03';
    const testName = 'Sự kiện AFFILIATE_SUSPENDED lần 1 (Tạm ngưng hoạt động)';

    try {
      firstSuspendAuditId = `audit-test-susp-1-${Date.now()}`;
      const idempotencyKey = `evt:AFFILIATE_SUSPENDED:${firstSuspendAuditId}`;
      const reasonText = 'Vi phạm chính sách tuyển sinh số 02';

      const { data: insEvt } = await supabase
        .from('notification_events')
        .insert({
          event_type: 'AFFILIATE_SUSPENDED',
          source_entity_type: 'affiliate_profiles',
          source_entity_id: targetAffId,
          transition_state: 'SUSPENDED',
          idempotency_key: idempotencyKey,
          recipient_user_id: targetUserId,
          payload: {
            audit_log_id: firstSuspendAuditId,
            affiliate_id: targetAffId,
            reason: reasonText,
            status: 'SUSPENDED',
          },
          status: 'PENDING',
        })
        .select()
        .single();

      if (insEvt) createdTestEventIds.push(insEvt.id);

      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      const updatedEvt = await waitForEventProcessed(insEvt!.id);

      if (updatedEvt?.notification_id) createdTestNotifIds.push(updatedEvt.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', updatedEvt!.notification_id)
        .single();

      if (notif.title !== 'Tài khoản CTV đã bị tạm ngưng') throw new Error(`Tiêu đề sai: ${notif.title}`);
      if (notif.action_url !== '/pending') throw new Error(`Đích điều hướng sai: ${notif.action_url}`);

      logPass(testId, testName, `Key=${idempotencyKey}, Title="${notif.title}", ActionURL="${notif.action_url}"`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 4: AFFILIATE_REACTIVATED - Kích hoạt lại CTV
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-04';
    const testName = 'Sự kiện AFFILIATE_REACTIVATED (Kích hoạt lại CTV)';

    try {
      const mockAuditId = `audit-test-reactv-${Date.now()}`;
      const idempotencyKey = `evt:AFFILIATE_REACTIVATED:${mockAuditId}`;

      const { data: insEvt } = await supabase
        .from('notification_events')
        .insert({
          event_type: 'AFFILIATE_REACTIVATED',
          source_entity_type: 'affiliate_profiles',
          source_entity_id: targetAffId,
          transition_state: 'ACTIVE',
          idempotency_key: idempotencyKey,
          recipient_user_id: targetUserId,
          payload: {
            audit_log_id: mockAuditId,
            affiliate_id: targetAffId,
            status: 'ACTIVE',
          },
          status: 'PENDING',
        })
        .select()
        .single();

      if (insEvt) createdTestEventIds.push(insEvt.id);

      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      const updatedEvt = await waitForEventProcessed(insEvt!.id);

      if (updatedEvt?.notification_id) createdTestNotifIds.push(updatedEvt.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', updatedEvt!.notification_id)
        .single();

      if (notif.title !== 'Tài khoản CTV đã được kích hoạt lại') throw new Error(`Tiêu đề sai: ${notif.title}`);
      if (notif.action_url !== '/portal') throw new Error(`Đích điều hướng sai: ${notif.action_url}`);

      logPass(testId, testName, `Key=${idempotencyKey}, Title="${notif.title}", ActionURL="${notif.action_url}"`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 5: Tạm ngưng lần 2 tạo event mới hoàn toàn (Không bị chặn bởi lần 1)
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-05';
    const testName = 'Tạm ngưng CTV lần 2 sinh event_key mới hoàn toàn';

    try {
      const secondSuspendAuditId = `audit-test-susp-2-${Date.now()}`;
      if (secondSuspendAuditId === firstSuspendAuditId) {
        throw new Error('Audit ID bị trùng lặp');
      }

      const secondIdempotencyKey = `evt:AFFILIATE_SUSPENDED:${secondSuspendAuditId}`;

      const { data: insEvt } = await supabase
        .from('notification_events')
        .insert({
          event_type: 'AFFILIATE_SUSPENDED',
          source_entity_type: 'affiliate_profiles',
          source_entity_id: targetAffId,
          transition_state: 'SUSPENDED',
          idempotency_key: secondIdempotencyKey,
          recipient_user_id: targetUserId,
          payload: {
            audit_log_id: secondSuspendAuditId,
            affiliate_id: targetAffId,
            reason: 'Tái phạm quy chế',
            status: 'SUSPENDED',
          },
          status: 'PENDING',
        })
        .select()
        .single();

      if (insEvt) createdTestEventIds.push(insEvt.id);

      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      const updatedEvt = await waitForEventProcessed(insEvt!.id);

      if (updatedEvt?.notification_id) createdTestNotifIds.push(updatedEvt.notification_id);

      if (updatedEvt?.status !== 'PROCESSED') {
        throw new Error('Sự kiện tạm ngưng lần 2 không được xử lý thành công');
      }

      logPass(testId, testName, `Lần 1=${firstSuspendAuditId} -> Lần 2=${secondSuspendAuditId} (Tạo 2 event riêng biệt)`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 6: LEAD_SUBMITTED - Khách đăng ký mới qua link CTV hợp lệ
  // ============================================================================
  let createdLeadId = '';
  const testLeadPhone = `090${Math.floor(1000000 + Math.random() * 9000000)}`;
  {
    const start = Date.now();
    const testId = 'TC-3.6A-06';
    const testName = 'Khách mới gửi form tư vấn sinh sự kiện LEAD_SUBMITTED cho CTV';

    try {
      const leadPayload = {
        full_name: 'Nguyễn Văn Test Lead',
        phone: testLeadPhone,
        email: 'testlead@sthc.edu.vn',
        province: 'TP. Hồ Chí Minh',
        course_id: 'CBMA-TC-01',
        consent_accepted: true,
        ref_code: targetAffCode,
      };

      const response = await fetch(`${API_BASE}/api/v1/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Lỗi gửi form lead');
      }

      // Tra cứu lead vừa chèn trong CSDL
      const { data: dbLead } = await supabase
        .from('leads')
        .select('id, phone, affiliate_id')
        .eq('phone', testLeadPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!dbLead) {
        throw new Error('Không tìm thấy lead vừa chèn trong CSDL');
      }
      createdLeadId = dbLead.id;

      // Tra cứu event tương ứng trong notification_events
      const expectedKey = `evt:LEAD_SUBMITTED:${dbLead.id}`;
      const { data: dbEvt } = await supabase
        .from('notification_events')
        .select('*')
        .eq('idempotency_key', expectedKey)
        .maybeSingle();

      if (!dbEvt) {
        throw new Error(`Không tìm thấy event ${expectedKey} trong notification_events`);
      }
      createdTestEventIds.push(dbEvt.id);

      // Chờ event được xử lý hoàn tất (bởi consumer trong server.ts hoặc test script)
      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);
      await consumer.processBatch();

      let updatedEvt: any = null;
      for (let i = 0; i < 15; i++) {
        const { data: e } = await supabase
          .from('notification_events')
          .select('*')
          .eq('id', dbEvt.id)
          .single();
        updatedEvt = e;
        if (updatedEvt?.status === 'PROCESSED' && updatedEvt?.notification_id) {
          break;
        }
        if (updatedEvt?.status === 'PENDING' || updatedEvt?.status === 'FAILED') {
          await consumer.processBatch();
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (updatedEvt?.notification_id) createdTestNotifIds.push(updatedEvt.notification_id);

      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', updatedEvt?.notification_id)
        .maybeSingle();

      if (!notif) {
        throw new Error(`Không tìm thấy notification với id ${updatedEvt?.notification_id}. Event status: ${updatedEvt?.status}, last_error: ${updatedEvt?.last_error}`);
      }

      if (notif.type !== 'SYSTEM' || notif.category !== 'LEAD') {
        throw new Error(`Loại/danh mục thông báo sai: ${notif.type}/${notif.category}`);
      }
      if (notif.title !== 'Có khách hàng mới đăng ký qua link giới thiệu') {
        throw new Error(`Tiêu đề không khớp: ${notif.title}`);
      }
      if (notif.action_url !== '/portal/leads') {
        throw new Error(`Action URL không khớp: ${notif.action_url}`);
      }

      logPass(testId, testName, `LeadID=${dbLead.id}, Title="${notif.title}", ActionURL="${notif.action_url}"`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 7: Lead trùng trong 90 ngày KHÔNG sinh thêm thông báo
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-07';
    const testName = 'Lead trùng trong 90 ngày không sinh thêm notification_event';

    try {
      // Đếm số lượng event hiện tại của CTV
      const { count: countBefore } = await supabase
        .from('notification_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'LEAD_SUBMITTED')
        .eq('recipient_user_id', targetUserId);

      // Gửi lại đúng số điện thoại cũ
      const duplicatePayload = {
        full_name: 'Nguyễn Văn Test Lead Trùng',
        phone: testLeadPhone,
        course_id: 'CBMA-TC-01',
        consent_accepted: true,
        ref_code: targetAffCode,
      };

      const response = await fetch(`${API_BASE}/api/v1/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload),
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error('API lead duplicate phải trả success 201 giữ lịch hẹn cũ');
      }

      // Đếm lại số lượng event
      const { count: countAfter } = await supabase
        .from('notification_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'LEAD_SUBMITTED')
        .eq('recipient_user_id', targetUserId);

      if ((countAfter || 0) > (countBefore || 0)) {
        throw new Error(`Phát hiện sinh thêm event khi gửi lead trùng: trước=${countBefore}, sau=${countAfter}`);
      }

      logPass(testId, testName, `Số lượng event LEAD_SUBMITTED không tăng (trước=${countBefore}, sau=${countAfter})`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 8: Tính Idempotency tuyệt đối khi gọi lại Consumer nhiều lần
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-08';
    const testName = 'Idempotency: Chạy lại batch processing không sinh thông báo trùng';

    try {
      const { count: notifCountBefore } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' });

      const { count: recCountBefore } = await supabase
        .from('notification_recipients')
        .select('id', { count: 'exact' });

      const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
      const consumer = new NotificationEventConsumer(supabase);

      // Chạy 2 lần liên tiếp
      await consumer.processBatch();
      await consumer.processBatch();

      const { count: notifCountAfter } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' });

      const { count: recCountAfter } = await supabase
        .from('notification_recipients')
        .select('id', { count: 'exact' });

      if (notifCountAfter !== notifCountBefore || recCountAfter !== recCountBefore) {
        throw new Error(`Dữ liệu bị duplicate sau khi chạy lại consumer: notifs=${notifCountBefore}->${notifCountAfter}`);
      }

      logPass(testId, testName, `Bảo toàn số lượng notifications (${notifCountBefore}) và recipients (${recCountBefore})`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // TEST 9: API CTV đọc được thông báo hệ thống và đánh dấu đã đọc
  // ============================================================================
  {
    const start = Date.now();
    const testId = 'TC-3.6A-09';
    const testName = 'API CTV (/api/v1/portal/notifications) đọc thông báo SYSTEM';

    try {
      // Đăng nhập tài khoản CTV hoặc dùng Bearer token của targetUserId
      const authHeader = `Bearer demo-session-token-${targetUserId}`;

      const res = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=SYSTEM&limit=10`, {
        headers: { Authorization: authHeader },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Lỗi gọi API portal notifications');
      }

      const items = json.data?.items || [];
      if (items.length === 0) {
        throw new Error('Không có thông báo nào trong tab SYSTEM của CTV');
      }

      const sysItem = items.find((it: any) => it.type === 'SYSTEM');
      if (!sysItem) {
        throw new Error('Không tìm thấy bản ghi type=SYSTEM trong danh sách trả về');
      }

      // Đánh dấu đã đọc thông báo này
      const readRes = await fetch(`${API_BASE}/api/v1/portal/notifications/${sysItem.notification_id}/read`, {
        method: 'POST',
        headers: { Authorization: authHeader },
      });

      const readJson = await readRes.json();
      if (!readRes.ok || !readJson.success) {
        throw new Error(readJson.error || 'Lỗi đánh dấu đã đọc thông báo');
      }

      logPass(testId, testName, `Tìm thấy ${items.length} thông báo SYSTEM, đánh dấu đã đọc thành công id=${sysItem.notification_id}`, start);
    } catch (err: any) {
      logFail(testId, testName, err.message, start);
    }
  }

  // ============================================================================
  // CLEANUP VÀ BÁO CÁO TỔNG HỢP
  // ============================================================================
  console.log('\n--- Dọn dẹp dữ liệu kiểm thử tạm thời ---');
  if (createdTestNotifIds.length > 0) {
    await supabase.from('notification_recipients').delete().in('notification_id', createdTestNotifIds);
    await supabase.from('notifications').delete().in('id', createdTestNotifIds);
  }
  if (createdTestEventIds.length > 0) {
    await supabase.from('notification_events').delete().in('id', createdTestEventIds);
  }
  if (createdLeadId) {
    await supabase.from('leads').delete().eq('id', createdLeadId);
  }
  console.log('Dọn dẹp hoàn tất.');

  console.log('\n==============================================================================');
  console.log('KẾT QUẢ TỔNG HỢP KIỂM THỬ C3.6A:');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log(`Tổng số ca kiểm thử: ${results.length}`);
  console.log(`Thành công (PASS):   ${passedCount}`);
  console.log(`Thất bại (FAIL):     ${failedCount}`);
  console.log('==============================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
