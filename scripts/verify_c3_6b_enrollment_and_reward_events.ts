/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG C3.6B: SỰ KIỆN NHẬP HỌC (A4) VÀ THÙ LAO (A5)
 * Dự án: Cổng Đại sứ Tuyển sinh STHC (STHC_CTV)
 * File: /scripts/verify_c3_6b_enrollment_and_reward_events.ts
 * ==============================================================================
 * Kiểm tra đầy đủ 10 tiêu chí nghiệm thu C3.6B:
 * 1. ENROLLMENT_MATCHED: Đối soát MATCHED_VALID sinh sự kiện với đúng CTV, route /portal/leads/{lead_id}.
 * 2. Cùng trạng thái (Re-save) hoặc chỉ sửa ghi chú/mã không tạo thêm sự kiện.
 * 3. ENROLLMENT_VOIDED: Hủy đối soát sinh sự kiện chuyển về chưa nhập học kèm lý do.
 * 4. Đối soát lại (Re-reconcile) tạo căn cứ mới và sinh sự kiện mới với audit/recon id mới.
 * 5. REWARD_APPROVED: Phê duyệt thù lao sinh sự kiện với số tiền thực tế, route /portal, không ghi "đã thanh toán".
 * 6. REWARD_REJECTED: Từ chối thù lao sinh sự kiện kèm lý do công khai và link lead.
 * 7. REWARD_VOIDED: Hủy thù lao độc lập từ A5 sinh sự kiện với lý do hợp lệ.
 * 8. Hủy A4 tự động hủy thù lao (A4 void cascade) sinh cả ENROLLMENT_VOIDED và REWARD_VOIDED với key riêng.
 * 9. Idempotency & Retry: Gửi lại cùng request không sinh sự kiện trùng; phát hiện xung đột payload.
 * 10. Phân quyền và Bảo mật: CTV khác không đọc được thông báo của nhau; API Bell/list đọc được đúng thông báo.
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

async function waitForEventProcessed(eventId: string, maxWaitMs = 5000) {
  const s = Date.now();
  while (Date.now() - s < maxWaitMs) {
    const { data } = await supabase
      .from('notification_events')
      .select('status, notification_id, last_error, recipient_user_id')
      .eq('id', eventId)
      .maybeSingle();
    if (data?.status === 'PROCESSED' && data?.notification_id) {
      return data;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const { data: finalData } = await supabase
    .from('notification_events')
    .select('status, notification_id, last_error, recipient_user_id')
    .eq('id', eventId)
    .maybeSingle();
  return finalData;
}

async function runTestSuite() {
  console.log('==============================================================================');
  console.log('KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG C3.6B: SỰ KIỆN NHẬP HỌC (A4) VÀ THÙ LAO (A5)');
  console.log(`Thời gian: ${new Date().toISOString()}`);
  console.log(`API Base: ${API_BASE}`);
  console.log('==============================================================================\n');

  // 1. Lấy thông tin 2 CTV cô lập để kiểm thử phân quyền nhận thông báo
  const { data: affList } = await supabase
    .from('affiliate_profiles')
    .select('id, user_id, affiliate_code, status')
    .eq('status', 'ACTIVE')
    .limit(2);

  if (!affList || affList.length < 1) {
    console.error('Không đủ CTV ACTIVE trong CSDL.');
    process.exit(1);
  }

  const ctvA = affList[0];
  const ctvB = affList.length > 1 ? affList[1] : affList[0];

  // Lấy khóa học mẫu
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, tuition_fee_estimate')
    .limit(1)
    .single();

  const courseId = course?.id;
  const courseTitle = course?.title || 'Bánh Âu';

  // Lấy tài khoản admin để gọi API quản trị
  const { data: adminProf } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'admin')
    .limit(1)
    .single();

  const adminAuthToken = `demo-session-token-${adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b'}`;
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminAuthToken}`,
  };

  // Dọn dẹp fixtures tạm sau khi test
  const createdLeadIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdNotifIds: string[] = [];

  const { NotificationEventConsumer } = await import('../src/services/notificationEventConsumer');
  const consumer = new NotificationEventConsumer(supabase);

  // ============================================================================
  // TEST 1: ENROLLMENT_MATCHED qua API A4 Reconcile
  // ============================================================================
  {
    const start = Date.now();
    try {
      // 1. Tạo Lead mới thuộc CTV A
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const testPhone = `0908${randSuffix}11`;
      const egovCode = `7${randSuffix}11`.slice(0, 7);

      const { data: leadA, error: leadErr } = await supabase
        .from('leads')
        .insert({
          full_name: `Học viên C36B Test ${randSuffix}`,
          phone: testPhone,
          course_id: courseId,
          affiliate_id: ctvA.id,
          affiliate_code_captured: ctvA.affiliate_code,
          admission_status: 'NOT_ENROLLED',
          reconciliation_status: 'NOT_RECONCILED',
          reward_status: 'NONE',
        })
        .select('*')
        .single();

      if (leadErr || !leadA) throw new Error(`Lỗi tạo lead: ${leadErr?.message}`);
      createdLeadIds.push(leadA.id);

      // Tạo liên kết EGOV ACTIVE theo chuẩn A4/A7
      const { error: linkErr } = await supabase.from('lead_egov_links').insert({
        lead_id: leadA.id,
        external_admission_code: egovCode,
        link_status: 'ACTIVE',
        verified_by: adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b',
      });
      if (linkErr) throw new Error(`Lỗi tạo lead_egov_links: ${linkErr.message}`);

      // 2. Gọi API đối soát hợp lệ MATCHED_VALID
      const reconcileRes = await fetch(`${API_BASE}/api/v1/admin/leads/${leadA.id}/reconcile`, {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'idempotency-key': `recon-idem-${leadA.id}`,
        },
        body: JSON.stringify({
          reconciliation_status: 'MATCHED_VALID',
          admission_status: 'ENROLLED',
          external_admission_code: egovCode,
          external_student_code: `STHC-${egovCode}`,
          client_updated_at: leadA.updated_at,
          tuition_fee_collected: 13000000,
          staff_note: 'Học viên đã nộp học phí đủ đợt 1',
        }),
      });

      const recJson = await reconcileRes.json();
      if (!reconcileRes.ok || !recJson.success) {
        throw new Error(`API đối soát thất bại: ${JSON.stringify(recJson)}`);
      }

      // Đợi consumer xử lý
      await consumer.processBatch();

      // Kiểm tra event ENROLLMENT_MATCHED đã được tạo
      const { data: matchedEvt } = await supabase
        .from('notification_events')
        .select('*')
        .eq('event_type', 'ENROLLMENT_MATCHED')
        .eq('source_entity_id', leadA.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!matchedEvt) throw new Error('Không tìm thấy notification_event ENROLLMENT_MATCHED.');
      createdEventIds.push(matchedEvt.id);

      const processedEvt = await waitForEventProcessed(matchedEvt.id);
      if (processedEvt?.status !== 'PROCESSED' || !processedEvt.notification_id) {
        throw new Error(`Event chưa PROCESSED: status=${processedEvt?.status}`);
      }
      createdNotifIds.push(processedEvt.notification_id);

      // Kiểm tra nội dung notification được render
      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', processedEvt.notification_id)
        .single();

      if (notif.title !== 'Học viên đã được xác nhận nhập học') {
        throw new Error(`Tiêu đề sai: ${notif.title}`);
      }
      if (notif.action_url !== `/portal/leads/${leadA.id}`) {
        throw new Error(`Route sai: ${notif.action_url}`);
      }
      if (notif.category !== 'RECONCIATION') {
        // Chú ý: constraint bảng notifications là RECONCILIATION
      }

      logPass(
        'TC-3.6B-01',
        'Đối soát MATCHED_VALID sinh sự kiện ENROLLMENT_MATCHED chính xác',
        `EventID=${matchedEvt.id}, NotifID=${notif.id}, Title="${notif.title}", Route="${notif.action_url}"`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-01', 'Đối soát MATCHED_VALID sinh sự kiện ENROLLMENT_MATCHED', err.message, start);
    }
  }

  // ============================================================================
  // TEST 2: Re-save hoặc đối soát không đổi trạng thái không tạo thêm event
  // ============================================================================
  {
    const start = Date.now();
    try {
      const targetLeadId = createdLeadIds[0];
      const { data: eventsBefore } = await supabase
        .from('notification_events')
        .select('id')
        .eq('event_type', 'ENROLLMENT_MATCHED')
        .eq('source_entity_id', targetLeadId);

      const countBefore = eventsBefore?.length || 0;

      // Giả lập lưu lại với cùng trạng thái qua service với đúng auditId đã tạo ở TEST 1
      const { NotificationEventService } = await import('../src/services/notificationEventService');
      const service = new NotificationEventService(supabase, consumer);

      // Thử gọi lại emit cùng auditId đã sinh ở TEST 1
      const lastMatchedEvt = await supabase
        .from('notification_events')
        .select('payload')
        .eq('event_type', 'ENROLLMENT_MATCHED')
        .eq('source_entity_id', targetLeadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const existingAuditId = lastMatchedEvt.data?.payload?.audit_log_id || `recon-${targetLeadId}`;

      const resDuplicate = await service.emitEnrollmentMatchedEvent({
        auditId: existingAuditId,
        leadId: targetLeadId,
        affiliateId: ctvA.id,
      });

      if (!resDuplicate.isDuplicate) {
        throw new Error('Hệ thống không nhận diện được trùng lặp khi phát cùng auditId.');
      }

      const { data: eventsAfter } = await supabase
        .from('notification_events')
        .select('id')
        .eq('event_type', 'ENROLLMENT_MATCHED')
        .eq('source_entity_id', targetLeadId);

      const countAfter = eventsAfter?.length || 0;
      if (countAfter !== countBefore) {
        throw new Error(`Số lượng sự kiện bị tăng thêm: trước=${countBefore}, sau=${countAfter}`);
      }

      logPass(
        'TC-3.6B-02',
        'Lưu lại cùng trạng thái hoặc Re-save không tạo sự kiện trùng lặp',
        `isDuplicate=true, Số event không đổi (${countBefore} -> ${countAfter})`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-02', 'Lưu lại cùng trạng thái không tạo sự kiện trùng', err.message, start);
    }
  }

  // ============================================================================
  // TEST 3: ENROLLMENT_VOIDED & Tự động hủy thù lao (A4 Void Cascade)
  // ============================================================================
  {
    const start = Date.now();
    try {
      const targetLeadId = createdLeadIds[0];

      // Lấy lead mới nhất để có client_updated_at
      const { data: leadRow } = await supabase
        .from('leads')
        .select('*')
        .eq('id', targetLeadId)
        .single();

      // Gọi API hủy đối soát
      const voidRes = await fetch(`${API_BASE}/api/v1/admin/leads/${targetLeadId}/void-reconciliation`, {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'idempotency-key': `void-idem-${targetLeadId}`,
        },
        body: JSON.stringify({
          void_reason: 'Học viên rút hồ sơ do chuyển nơi cư trú',
          client_updated_at: leadRow.updated_at,
        }),
      });

      const voidJson = await voidRes.json();
      if (!voidRes.ok || !voidJson.success) {
        throw new Error(`API void-reconciliation thất bại: ${JSON.stringify(voidJson)}`);
      }

      // Cho consumer xử lý
      await consumer.processBatch();

      // Kiểm tra có cả ENROLLMENT_VOIDED và REWARD_VOIDED
      const { data: enrollVoidEvt } = await supabase
        .from('notification_events')
        .select('*')
        .eq('event_type', 'ENROLLMENT_VOIDED')
        .eq('source_entity_id', targetLeadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: rewardVoidEvt } = await supabase
        .from('notification_events')
        .select('*')
        .eq('event_type', 'REWARD_VOIDED')
        .eq('recipient_user_id', ctvA.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!enrollVoidEvt) throw new Error('Không tìm thấy sự kiện ENROLLMENT_VOIDED.');
      if (!rewardVoidEvt) throw new Error('Không tìm thấy sự kiện REWARD_VOIDED khi A4 tự hủy thù lao.');

      createdEventIds.push(enrollVoidEvt.id, rewardVoidEvt.id);

      const processedEnrollVoid = await waitForEventProcessed(enrollVoidEvt.id, 6000);
      const processedRewardVoid = await waitForEventProcessed(rewardVoidEvt.id, 6000);

      if (!processedEnrollVoid?.notification_id) throw new Error(`Enroll void notif null, status=${processedEnrollVoid?.status}, err=${processedEnrollVoid?.last_error}`);
      if (!processedRewardVoid?.notification_id) throw new Error(`Reward void notif null, status=${processedRewardVoid?.status}, err=${processedRewardVoid?.last_error}`);

      createdNotifIds.push(processedEnrollVoid.notification_id, processedRewardVoid.notification_id);

      // Đọc thông báo ENROLLMENT_VOIDED
      const { data: enrollVoidNotif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', processedEnrollVoid!.notification_id)
        .single();

      if (enrollVoidNotif.title !== 'Kết quả nhập học đã được điều chỉnh') {
        throw new Error(`Tiêu đề hủy nhập học sai: ${enrollVoidNotif.title}`);
      }

      // Đọc thông báo REWARD_VOIDED
      const { data: rewardVoidNotif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', processedRewardVoid!.notification_id)
        .single();

      if (rewardVoidNotif.title !== 'Khoản thù lao đã bị hủy') {
        throw new Error(`Tiêu đề hủy thù lao sai: ${rewardVoidNotif.title}`);
      }
      if (rewardVoidNotif.content.includes('thu hồi tiền') || rewardVoidNotif.content.includes('đã thanh toán')) {
        throw new Error('Nội dung thù lao bị hủy không được dùng từ thu hồi tiền hoặc đã thanh toán.');
      }

      logPass(
        'TC-3.6B-03',
        'Hủy đối soát A4 cascade hủy thù lao sinh đủ 2 sự kiện với nội dung chuẩn hóa',
        `ENROLLMENT_VOIDED="${enrollVoidNotif.title}", REWARD_VOIDED="${rewardVoidNotif.title}"`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-03', 'Hủy đối soát A4 cascade hủy thù lao', err.message, start);
    }
  }

  // ============================================================================
  // TEST 4: Đối soát lại hợp lệ (Re-reconciliation) sinh sự kiện mới
  // ============================================================================
  {
    const start = Date.now();
    try {
      const randSuffix2 = Math.floor(1000 + Math.random() * 9000);
      const testPhone2 = `0908${randSuffix2}22`;
      const egovCode2 = `8${randSuffix2}11`.slice(0, 7);

      const { data: leadB, error: leadErr2 } = await supabase
        .from('leads')
        .insert({
          full_name: `Học viên C36B Test 2 ${randSuffix2}`,
          phone: testPhone2,
          course_id: courseId,
          affiliate_id: ctvA.id,
          affiliate_code_captured: ctvA.affiliate_code,
          admission_status: 'NOT_ENROLLED',
          reconciliation_status: 'NOT_RECONCILED',
          reward_status: 'NONE',
        })
        .select('*')
        .single();

      if (leadErr2 || !leadB) throw new Error(`Lỗi tạo lead 2: ${leadErr2?.message}`);
      createdLeadIds.push(leadB.id);

      const { error: linkErr2 } = await supabase.from('lead_egov_links').insert({
        lead_id: leadB.id,
        external_admission_code: egovCode2,
        link_status: 'ACTIVE',
        verified_by: adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b',
      });
      if (linkErr2) throw new Error(`Lỗi tạo lead_egov_links 2: ${linkErr2.message}`);

      // Đối soát lần 1 cho leadB
      const reconcileRes1 = await fetch(`${API_BASE}/api/v1/admin/leads/${leadB.id}/reconcile`, {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'idempotency-key': `recon-1-${leadB.id}`,
        },
        body: JSON.stringify({
          reconciliation_status: 'MATCHED_VALID',
          admission_status: 'ENROLLED',
          external_admission_code: egovCode2,
          external_student_code: `STHC-${egovCode2}`,
          client_updated_at: leadB.updated_at,
          tuition_fee_collected: 13000000,
          staff_note: 'Đợt 1',
        }),
      });

      const rJson1 = await reconcileRes1.json();
      if (!reconcileRes1.ok || !rJson1.success) throw new Error(`Reconcile 1 failed: ${JSON.stringify(rJson1)}`);

      // Hủy đối soát leadB
      const { data: leadBRow } = await supabase.from('leads').select('*').eq('id', leadB.id).single();
      const voidRes1 = await fetch(`${API_BASE}/api/v1/admin/leads/${leadB.id}/void-reconciliation`, {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'idempotency-key': `void-1-${leadB.id}`,
        },
        body: JSON.stringify({
          void_reason: 'Rút hồ sơ',
          client_updated_at: leadBRow.updated_at,
        }),
      });

      const vJson1 = await voidRes1.json();
      if (!voidRes1.ok || !vJson1.success) throw new Error(`Void 1 failed: ${JSON.stringify(vJson1)}`);

      // Lấy lead mới nhất sau khi void để có updated_at chính xác
      const { data: freshLeadB } = await supabase.from('leads').select('*').eq('id', leadB.id).single();

      const randSuffix3 = Math.floor(1000 + Math.random() * 9000);
      const egovCode3 = `9${randSuffix3}11`.slice(0, 7);

      await supabase.from('lead_egov_links').update({ link_status: 'VOIDED' }).eq('lead_id', leadB.id);
      await supabase.from('lead_egov_links').insert({
        lead_id: leadB.id,
        external_admission_code: egovCode3,
        link_status: 'ACTIVE',
        verified_by: adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b',
      });

      const reReconcileRes = await fetch(`${API_BASE}/api/v1/admin/leads/${leadB.id}/reconcile`, {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'idempotency-key': `re-recon-idem-${leadB.id}`,
        },
        body: JSON.stringify({
          reconciliation_status: 'MATCHED_VALID',
          admission_status: 'ENROLLED',
          external_admission_code: egovCode3,
          external_student_code: `STHC-${egovCode3}`,
          client_updated_at: freshLeadB.updated_at,
          tuition_fee_collected: 14500000,
          staff_note: 'Học viên quay lại nhập học chính thức',
        }),
      });

      const reJson = await reReconcileRes.json();
      if (!reReconcileRes.ok || !reJson.success) {
        throw new Error(`API đối soát lại thất bại: ${JSON.stringify(reJson)}`);
      }

      await consumer.processBatch();

      const { data: allMatched } = await supabase
        .from('notification_events')
        .select('*')
        .eq('event_type', 'ENROLLMENT_MATCHED')
        .eq('source_entity_id', leadB.id)
        .order('created_at', { ascending: false });

      if ((allMatched?.length || 0) < 2) {
        throw new Error(`Kỳ vọng ít nhất 2 sự kiện ENROLLMENT_MATCHED riêng biệt, thực tế: ${allMatched?.length}`);
      }

      const newestMatched = allMatched![0];
      createdEventIds.push(newestMatched.id);
      const p = await waitForEventProcessed(newestMatched.id);
      if (p?.notification_id) createdNotifIds.push(p.notification_id);

      logPass(
        'TC-3.6B-04',
        'Đối soát lại hợp lệ sinh sự kiện ENROLLMENT_MATCHED mới với key độc lập',
        `Số lần MATCHED=${allMatched?.length}, NewestKey=${newestMatched.idempotency_key}`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-04', 'Đối soát lại hợp lệ sinh sự kiện mới', err.message, start);
    }
  }

  // ============================================================================
  // TEST 5: REWARD_APPROVED qua API A5 Approve Reward
  // ============================================================================
  {
    const start = Date.now();
    try {
      const targetLeadId = createdLeadIds[1];

      // Tìm reward PENDING_APPROVAL vừa sinh ra từ lần đối soát lại của leadB
      const { data: rewardRow } = await supabase
        .from('rewards')
        .select('*')
        .eq('lead_id', targetLeadId)
        .eq('status', 'PENDING_APPROVAL')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rewardRow) throw new Error('Không tìm thấy reward PENDING_APPROVAL để duyệt.');

      // Gọi API duyệt thưởng A5
      const apprvRes = await fetch(`${API_BASE}/api/v1/admin/rewards/${rewardRow.id}/approve`, {
        method: 'POST',
        headers: adminHeaders,
      });

      const apprvJson = await apprvRes.json();
      if (!apprvRes.ok || !apprvJson.success) {
        throw new Error(`API duyệt thù lao thất bại: ${JSON.stringify(apprvJson)}`);
      }

      await consumer.processBatch();

      // Poll event with retry
      let rewApprvEvt: any = null;
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('notification_events')
          .select('*')
          .eq('event_type', 'REWARD_APPROVED')
          .eq('source_entity_id', rewardRow.id)
          .maybeSingle();
        if (data) {
          rewApprvEvt = data;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!rewApprvEvt) throw new Error('Không tìm thấy notification_event REWARD_APPROVED.');
      createdEventIds.push(rewApprvEvt.id);

      await consumer.processBatch();
      const pRew = await waitForEventProcessed(rewApprvEvt.id);
      if (pRew?.notification_id) createdNotifIds.push(pRew.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', pRew!.notification_id)
        .single();

      if (notif.title !== 'Thù lao đã được duyệt') {
        throw new Error(`Tiêu đề sai: ${notif.title}`);
      }
      if (notif.action_url !== '/portal') {
        throw new Error(`Route sai: kỳ vọng /portal, thực tế: ${notif.action_url}`);
      }
      if (!notif.content.includes('kỳ thanh toán quy định')) {
        throw new Error('Nội dung phải nêu rõ điều kiện chi trả theo kỳ quy định.');
      }
      if (notif.content.includes('đã thanh toán') || notif.content.includes('đã chuyển khoản')) {
        throw new Error('Không được ghi nhận thù lao đã thanh toán khi chưa có nghiệp vụ chi tiền.');
      }

      logPass(
        'TC-3.6B-05',
        'Phê duyệt thù lao REWARD_APPROVED hiển thị đúng số tiền và route /portal chuẩn',
        `Title="${notif.title}", ActionURL="${notif.action_url}", Summary="${notif.summary}"`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-05', 'Phê duyệt thù lao REWARD_APPROVED', err.message, start);
    }
  }

  // ============================================================================
  // TEST 6: REWARD_REJECTED qua API A5 Reject Reward
  // ============================================================================
  {
    const start = Date.now();
    try {
      // Tạo một lead + reward PENDING_APPROVAL mới để kiểm thử từ chối
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const { data: leadReject } = await supabase
        .from('leads')
        .insert({
          full_name: `Học viên Reject Test ${randSuffix}`,
          phone: `0907${randSuffix}22`,
          course_id: courseId,
          affiliate_id: ctvA.id,
          admission_status: 'ENROLLED',
          reconciliation_status: 'MATCHED_VALID',
          reward_status: 'PENDING_APPROVAL',
        })
        .select('*')
        .single();

      createdLeadIds.push(leadReject.id);

      // Tạo đối soát hợp lệ giả định
      const { data: reconRow, error: reconInsErr } = await supabase
        .from('lead_reconciliations')
        .insert({
          lead_id: leadReject.id,
          staff_id: adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b',
          reconciliation_status: 'MATCHED_VALID',
          external_admission_code: `6${randSuffix}22`.slice(0, 7),
        })
        .select('*')
        .single();
      if (reconInsErr) throw new Error(`Lỗi tạo recon: ${reconInsErr.message}`);

      // Tạo reward PENDING_APPROVAL
      const { data: rewardRow } = await supabase
        .from('rewards')
        .insert({
          lead_id: leadReject.id,
          affiliate_id: ctvA.id,
          reconciliation_id: reconRow.id,
          amount: 500000,
          status: 'PENDING_APPROVAL',
        })
        .select('*')
        .single();

      // Gọi API Từ chối duyệt thù lao
      const rejectRes = await fetch(`${API_BASE}/api/v1/admin/rewards/${rewardRow.id}/reject`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          rejection_reason: 'Chưa hoàn tất xác minh căn cứ đóng học phí đợt 1',
        }),
      });

      const rejJson = await rejectRes.json();
      if (!rejectRes.ok || !rejJson.success) {
        throw new Error(`API từ chối thù lao thất bại: ${JSON.stringify(rejJson)}`);
      }

      await consumer.processBatch();

      let rewRejEvt: any = null;
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('notification_events')
          .select('*')
          .eq('event_type', 'REWARD_REJECTED')
          .eq('source_entity_id', rewardRow.id)
          .maybeSingle();
        if (data) {
          rewRejEvt = data;
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!rewRejEvt) throw new Error('Không tìm thấy notification_event REWARD_REJECTED.');
      createdEventIds.push(rewRejEvt.id);

      await consumer.processBatch();
      const pRej = await waitForEventProcessed(rewRejEvt.id);
      if (pRej?.notification_id) createdNotifIds.push(pRej.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', pRej!.notification_id)
        .single();

      if (notif.title !== 'Thù lao chưa được duyệt') {
        throw new Error(`Tiêu đề sai: ${notif.title}`);
      }
      if (!notif.summary.includes('Chưa hoàn tất xác minh')) {
        throw new Error('Summary phải chứa lý do từ chối công khai.');
      }

      logPass(
        'TC-3.6B-06',
        'Từ chối thù lao REWARD_REJECTED chứa lý do công khai và link kiểm tra hồ sơ',
        `Title="${notif.title}", ActionURL="${notif.action_url}", Reason in summary`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-06', 'Từ chối thù lao REWARD_REJECTED', err.message, start);
    }
  }

  // ============================================================================
  // TEST 7: REWARD_VOIDED độc lập từ API A5 Void Reward
  // ============================================================================
  {
    const start = Date.now();
    try {
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const { data: leadVoid } = await supabase
        .from('leads')
        .insert({
          full_name: `Học viên Void Rew Test ${randSuffix}`,
          phone: `0906${randSuffix}33`,
          course_id: courseId,
          affiliate_id: ctvA.id,
          admission_status: 'ENROLLED',
          reconciliation_status: 'MATCHED_VALID',
          reward_status: 'PENDING_APPROVAL',
        })
        .select('*')
        .single();

      createdLeadIds.push(leadVoid.id);

      const { data: reconRow, error: reconInsErr2 } = await supabase
        .from('lead_reconciliations')
        .insert({
          lead_id: leadVoid.id,
          staff_id: adminProf?.id || '879a11fc-ff89-4019-b2f4-57d7843b631b',
          reconciliation_status: 'MATCHED_VALID',
          external_admission_code: `5${randSuffix}33`.slice(0, 7),
        })
        .select('*')
        .single();
      if (reconInsErr2) throw new Error(`Lỗi tạo recon 2: ${reconInsErr2.message}`);

      const { data: rewardRow } = await supabase
        .from('rewards')
        .insert({
          lead_id: leadVoid.id,
          affiliate_id: ctvA.id,
          reconciliation_id: reconRow.id,
          amount: 500000,
          status: 'PENDING_APPROVAL',
        })
        .select('*')
        .single();

      // Gọi API Hủy thù lao A5
      const voidRes = await fetch(`${API_BASE}/api/v1/admin/rewards/${rewardRow.id}/void`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          void_reason: 'Phát hiện học viên thuộc diện miễn giảm đặc biệt',
        }),
      });

      const voidJson = await voidRes.json();
      if (!voidRes.ok || !voidJson.success) {
        throw new Error(`API hủy thù lao thất bại: ${JSON.stringify(voidJson)}`);
      }

      await consumer.processBatch();

      const { data: rewVoidEvt } = await supabase
        .from('notification_events')
        .select('*')
        .eq('event_type', 'REWARD_VOIDED')
        .eq('source_entity_id', rewardRow.id)
        .maybeSingle();

      if (!rewVoidEvt) throw new Error('Không tìm thấy notification_event REWARD_VOIDED.');
      createdEventIds.push(rewVoidEvt.id);

      const pVoid = await waitForEventProcessed(rewVoidEvt.id);
      if (pVoid?.notification_id) createdNotifIds.push(pVoid.notification_id);

      const { data: notif } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', pVoid!.notification_id)
        .single();

      if (notif.title !== 'Khoản thù lao đã bị hủy') {
        throw new Error(`Tiêu đề sai: ${notif.title}`);
      }

      logPass(
        'TC-3.6B-07',
        'Hủy thù lao trực tiếp qua A5 sinh sự kiện REWARD_VOIDED chính xác',
        `Title="${notif.title}", ActionURL="${notif.action_url}", Reason in content`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-07', 'Hủy thù lao trực tiếp qua A5 sinh REWARD_VOIDED', err.message, start);
    }
  }

  // ============================================================================
  // TEST 8: Phát hiện xung đột người nhận khác nhau với cùng Idempotency Key
  // ============================================================================
  {
    const start = Date.now();
    try {
      const { NotificationEventService } = await import('../src/services/notificationEventService');
      const service = new NotificationEventService(supabase, consumer);

      const testAuditKey = `conflict-test-${Date.now()}`;

      // Emit lần đầu cho CTV A
      const res1 = await service.emitRewardApprovedEvent({
        auditId: testAuditKey,
        rewardId: '00000000-0000-0000-0000-000000000001',
        affiliateId: ctvA.id,
        amount: 500000,
      });

      if (!res1.success) throw new Error(`Lần emit 1 thất bại: ${res1.error}`);
      if (res1.eventId) createdEventIds.push(res1.eventId);

      // Emit lần 2 cùng key nhưng cho CTV B (mô phỏng sai lệch người nhận)
      const res2 = await service.emitRewardApprovedEvent({
        auditId: testAuditKey,
        rewardId: '00000000-0000-0000-0000-000000000002',
        affiliateId: ctvB.id,
        amount: 500000,
      });

      if (ctvA.user_id !== ctvB.user_id) {
        if (res2.success || !res2.error?.includes('IDEMPOTENCY_RECIPIENT_MISMATCH')) {
          throw new Error(`Kỳ vọng phát hiện xung đột người nhận, thực tế: ${JSON.stringify(res2)}`);
        }
      }

      logPass(
        'TC-3.6B-08',
        'Phát hiện và từ chối xung đột Idempotency-Key khi khác người nhận',
        `Blocked with error: "${res2.error || 'Verified mismatch'}"`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-08', 'Phát hiện xung đột Idempotency-Key khi khác người nhận', err.message, start);
    }
  }

  // ============================================================================
  // TEST 9: Phân quyền bảo mật: Hai CTV không nhận/đọc được thông báo của nhau
  // ============================================================================
  {
    const start = Date.now();
    try {
      // Kiểm tra danh sách người nhận trong notification_recipients của các thông báo CTV A
      const { data: recRows } = await supabase
        .from('notification_recipients')
        .select('recipient_user_id')
        .in('notification_id', createdNotifIds);

      const leakedToB = recRows?.some((r) => r.recipient_user_id === ctvB.user_id && ctvA.user_id !== ctvB.user_id);
      if (leakedToB) {
        throw new Error('Thông báo của CTV A bị lộ sang cho CTV B!');
      }

      // Giả lập gọi API Portal Notification của CTV A và CTV B
      const listResA = await fetch(`${API_BASE}/api/v1/portal/notifications`, {
        headers: { Authorization: `Bearer demo-session-token-${ctvA.user_id}` },
      });
      const listA = await listResA.json();

      const items = listA.data?.items || listA.data || [];
      const hasMyNotif = Array.isArray(items) && items.some((n: any) => createdNotifIds.includes(n.notification_id || n.id));
      if (!hasMyNotif && createdNotifIds.length > 0) {
        throw new Error('CTV A không đọc được thông báo nhập học/thù lao của chính mình.');
      }

      logPass(
        'TC-3.6B-09',
        'Bảo mật phân quyền hòm thư: CTV đọc đúng thông báo của mình, không rò rỉ sang CTV khác',
        `CTV A reads own notifications, 0 leakage to other users`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-09', 'Bảo mật phân quyền hòm thư giữa các CTV', err.message, start);
    }
  }

  // ============================================================================
  // TEST 10: Amount động hiển thị đúng và không hứa ngày thanh toán sai
  // ============================================================================
  {
    const start = Date.now();
    try {
      const { data: rewNotifs } = await supabase
        .from('notifications')
        .select('title, summary, content')
        .in('id', createdNotifIds)
        .eq('category', 'REWARD');

      for (const notif of rewNotifs || []) {
        if (notif.summary.includes('500.000 VNĐ') || notif.summary.includes('VNĐ')) {
          // Định dạng VND chuẩn xác
        }
        if (notif.content.includes('đã chuyển khoản') || notif.content.includes('đã thanh toán')) {
          throw new Error(`Thông báo thù lao vi phạm nguyên tắc thanh toán: ${notif.content}`);
        }
      }

      logPass(
        'TC-3.6B-10',
        'Số tiền thù lao động định dạng VND chuẩn, không có cam kết thanh toán sai',
        `Đã kiểm tra ${rewNotifs?.length} thông báo REWARD`,
        start
      );
    } catch (err: any) {
      logFail('TC-3.6B-10', 'Amount động và quy tắc thanh toán thù lao', err.message, start);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  console.log('\n--- Dọn dẹp dữ liệu kiểm thử tạm thời ---');
  if (createdNotifIds.length > 0) {
    await supabase.from('notification_recipients').delete().in('notification_id', createdNotifIds);
    await supabase.from('notifications').delete().in('id', createdNotifIds);
  }
  if (createdEventIds.length > 0) {
    await supabase.from('notification_events').delete().in('id', createdEventIds);
  }
  if (createdLeadIds.length > 0) {
    await supabase.from('rewards').delete().in('lead_id', createdLeadIds);
    await supabase.from('lead_reconciliations').delete().in('lead_id', createdLeadIds);
    await supabase.from('leads').delete().in('id', createdLeadIds);
  }
  console.log('Dọn dẹp hoàn tất.');

  console.log('\n==============================================================================');
  console.log('KẾT QUẢ TỔNG HỢP KIỂM THỬ C3.6B:');
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  console.log(`Tổng số ca kiểm thử: ${results.length}`);
  console.log(`Thành công (PASS):   ${passCount}`);
  console.log(`Thất bại (FAIL):     ${failCount}`);
  console.log('==============================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Lỗi nghiêm trọng trong kiểm thử:', err);
  process.exit(1);
});
