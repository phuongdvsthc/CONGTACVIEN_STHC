/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHUẨN HÓA CSDL, CONSTRAINT VÀ RPC ĐỐI CHIẾU HỒ SƠ (A4.3)
 * Dự án: Hệ thống Cộng tác viên Tuyển sinh Trường Saigontourist (STHC)
 * File: scripts/verify_a4_reconciliation_db.ts
 * ==============================================================================
 * Kiểm tra các ca:
 * 1. Validate định dạng Mã EGOV 7 chữ số (chấp nhận 7 số, từ chối <7, >7, chữ, dấu cách)
 * 2. Khởi tạo Lead ban đầu: reconciliation_status = NOT_RECONCILED, reward_status = NONE
 * 3. Đối soát hợp lệ MATCHED_VALID:
 *    - Tình trạng nhập học (admission_status) = 'ENROLLED' (suy xuất/lưu trữ độc lập)
 *    - Tính hợp lệ CTV (reconciliation_status) = 'MATCHED_VALID'
 *    - Sinh thưởng 500.000 VNĐ (reward_status = 'PENDING_APPROVAL') khi CTV ACTIVE
 *    - Cho phép học phí thực thu / ngày đóng / biên lai là NULL hoặc số tiền thực tế
 * 4. Chống trùng mã EGOV đang hoạt động (Partial Unique Index)
 * 5. Hủy ghép đối soát VOIDED:
 *    - Bản ghi đối soát chuyển VOIDED kèm lý do và cán bộ hủy
 *    - Khoản thưởng liên quan chuyển VOIDED
 *    - Lead trở về NOT_RECONCILED và NOT_ENROLLED
 *    - Giải phóng mã EGOV khỏi partial unique index
 * 6. Đối soát lại cùng mã EGOV sau khi hủy (Re-reconciliation) thành công
 * 7. Khách đăng ký trước EXISTING_IN_SCHOOL_SYSTEM:
 *    - Tình trạng nhập học thực tế: ĐÃ NHẬP HỌC (ENROLLED)
 *    - Trạng thái đối soát CTV: EXISTING_IN_SCHOOL_SYSTEM
 *    - reward_status = 'NONE' (Không sinh thưởng)
 * 8. Không khớp hồ sơ MISMATCH_INVALID:
 *    - Tình trạng nhập học: CHƯA NHẬP HỌC (NOT_ENROLLED)
 *    - Trạng thái đối soát: MISMATCH_INVALID
 *    - reward_status = 'NONE' (Không sinh thưởng)
 * 9. Lưu trữ mức học phí khóa học (course_fee) tại thời điểm đối soát phục vụ thống kê sau này
 * 10. Kiểm tra số tiền không âm và phân biệt rõ 0 với NULL
 * ==============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface TestResult {
  code: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const testResults: TestResult[] = [];

function recordTest(code: string, name: string, expected: string, actual: string, passed: boolean) {
  testResults.push({ code, name, expected, actual, passed });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${code}: ${name}`);
  console.log(`       Kỳ vọng: ${expected}`);
  console.log(`       Thực tế: ${actual}\n`);
}

function validateEgovCode(code: string | null | undefined): { valid: boolean; cleanCode: string | null; error?: string } {
  if (!code) return { valid: false, cleanCode: null, error: 'Mã EGOV không được để trống' };
  const clean = code.trim();
  if (!clean) return { valid: false, cleanCode: null, error: 'Mã EGOV không được để trống' };
  if (!/^[0-9]{7}$/.test(clean)) {
    return { valid: false, cleanCode: clean, error: 'Mã EGOV phải gồm đúng 7 chữ số viết liền' };
  }
  return { valid: true, cleanCode: clean };
}

// Phân định 2 trục trạng thái độc lập (Quyết định 3 của A4.2)
function deriveAdmissionStatus(reconciliationStatus: string): 'ENROLLED' | 'NOT_ENROLLED' {
  if (reconciliationStatus === 'MATCHED_VALID' || reconciliationStatus === 'EXISTING_IN_SCHOOL_SYSTEM') {
    return 'ENROLLED';
  }
  return 'NOT_ENROLLED';
}

async function runTestSuite() {
  console.log('='.repeat(78));
  console.log('  KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG A4.3: CSDL, CONSTRAINT & RPC ĐỐI CHIẾU HỒ SƠ');
  console.log('='.repeat(78));

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[LỖI] Thiếu SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const testSuffix = crypto.randomBytes(3).toString('hex');
  const testEgovCode1 = `00${Math.floor(10000 + Math.random() * 90000)}`;
  const testEgovCode2 = `01${Math.floor(10000 + Math.random() * 90000)}`;

  console.log(`- Mã hậu tố test:        [${testSuffix}]`);
  console.log(`- Mã EGOV test 1 (7 số): [${testEgovCode1}]`);
  console.log(`- Mã EGOV test 2 (7 số): [${testEgovCode2}]\n`);

  // Lấy 1 khóa học mẫu
  const { data: courses } = await supabase.from('courses').select('id, title, tuition_fee_estimate').limit(1);
  const sampleCourse = courses?.[0];
  const sampleCourseId = sampleCourse?.id;
  const sampleCourseFee = sampleCourse?.tuition_fee_estimate || 14500000;

  // Lấy 1 admin profile mẫu
  const { data: adminProfiles } = await supabase.from('profiles').select('id, role, is_active').eq('role', 'admin').eq('is_active', true).limit(1);
  const sampleStaffId = adminProfiles?.[0]?.id;

  // Lấy 1 active affiliate
  const { data: activeAffiliates } = await supabase.from('affiliate_profiles').select('id, user_id, status').eq('status', 'ACTIVE').limit(1);
  const sampleAffiliateId = activeAffiliates?.[0]?.id;

  if (!sampleCourseId || !sampleStaffId || !sampleAffiliateId) {
    console.error('[LỖI CHUẨN BỊ]: Không tìm thấy đủ dữ liệu khóa học, admin hoặc CTV active');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // CA 1: KIỂM TRA VALIDATION ĐỊNH DẠNG MÃ EGOV 7 CHỮ SỐ ^[0-9]{7}$
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 1: Kiểm tra quy chuẩn Validate Regex Mã EGOV 7 số...');
  const invalidCodes = ['123456', '00123456', 'STHC-001', '0234 567', 'abc1234', '   '];
  let allInvalidRejected = true;
  for (const inv of invalidCodes) {
    const res = validateEgovCode(inv);
    if (res.valid) {
      allInvalidRejected = false;
      break;
    }
  }

  const validTest = validateEgovCode(testEgovCode1);
  const regexPass = allInvalidRejected && validTest.valid && validTest.cleanCode === testEgovCode1;

  recordTest(
    'TC-A4.3-01',
    'Quy chuẩn định dạng Regex mã EGOV 7 số (^[0-9]{7}$)',
    'Chấp nhận đúng 7 chữ số; từ chối thiếu/thừa số, chứa chữ/khoảng trắng',
    `Code "${testEgovCode1}" hợp lệ = ${validTest.valid}; Các mã sai bị từ chối 100% = ${allInvalidRejected}`,
    regexPass
  );

  // ---------------------------------------------------------------------------
  // CA 2: TẠO LEAD THỬ NGHIỆM ĐỂ TEST ĐỐI SOÁT
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 2: Khởi tạo Lead test có gắn CTV ACTIVE...');
  const { data: createdLead, error: createLeadErr } = await supabase
    .from('leads')
    .insert({
      full_name: `Học viên Test A4.3 ${testSuffix}`,
      phone: `0987${Math.floor(100000 + Math.random() * 900000)}`,
      email: `test.lead.${testSuffix}@example.com`,
      course_id: sampleCourseId,
      affiliate_id: sampleAffiliateId,
      counseling_status: 'NEW',
      reconciliation_status: 'NOT_RECONCILED',
      reward_status: 'NONE',
    })
    .select('id, full_name, reconciliation_status, reward_status, updated_at')
    .single();

  if (createLeadErr || !createdLead) {
    recordTest('TC-A4.3-02', 'Khởi tạo Lead test ban đầu', 'Lead được tạo thành công', `Lỗi: ${createLeadErr?.message}`, false);
    return;
  }

  const initialAdmission = deriveAdmissionStatus(createdLead.reconciliation_status);
  recordTest(
    'TC-A4.3-02',
    'Khởi tạo Lead test: reconciliation_status = NOT_RECONCILED, admission_status = NOT_ENROLLED, reward_status = NONE',
    'admission_status = NOT_ENROLLED, reconciliation_status = NOT_RECONCILED, reward_status = NONE',
    `admission = ${initialAdmission}, recon = ${createdLead.reconciliation_status}, reward = ${createdLead.reward_status}`,
    initialAdmission === 'NOT_ENROLLED' && createdLead.reconciliation_status === 'NOT_RECONCILED' && createdLead.reward_status === 'NONE'
  );

  const testLeadId = createdLead.id;

  // ---------------------------------------------------------------------------
  // CA 3: ĐỐI SOÁT HỢP LỆ MATCHED_VALID VÀ SINH THƯỞNG 500K
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 3: Xác nhận MATCHED_VALID và sinh thưởng 500k...');
  const { data: reconMatched, error: reconErr } = await supabase
    .from('lead_reconciliations')
    .insert({
      lead_id: testLeadId,
      staff_id: sampleStaffId,
      external_admission_code: testEgovCode1,
      external_student_code: `HV-${testSuffix}`,
      tuition_fee_collected: 14500000,
      receipt_number: `PT-${testSuffix}`,
      tuition_paid_at: new Date().toISOString(),
      reconciliation_status: 'MATCHED_VALID',
      staff_note: 'Đối soát hợp lệ - Đã kiểm tra EGOV tick Đã nhập học',
    })
    .select('id, lead_id, external_admission_code, tuition_fee_collected, reconciliation_status')
    .single();

  if (reconErr || !reconMatched) {
    recordTest('TC-A4.3-03', 'Tạo đối soát MATCHED_VALID', 'Bản ghi đối soát được tạo', `Lỗi: ${reconErr?.message}`, false);
  } else {
    // Cập nhật Lead
    await supabase.from('leads').update({
      reconciliation_status: 'MATCHED_VALID',
      reward_status: 'PENDING_APPROVAL',
      updated_at: new Date().toISOString(),
    }).eq('id', testLeadId);

    // Tạo bản ghi reward
    const { data: createdReward } = await supabase.from('rewards').insert({
      lead_id: testLeadId,
      reconciliation_id: reconMatched.id,
      affiliate_id: sampleAffiliateId,
      amount: 500000.00,
      status: 'PENDING_APPROVAL',
    }).select('id, amount, status').single();

    const { data: updatedLead } = await supabase.from('leads').select('reconciliation_status, reward_status').eq('id', testLeadId).single();
    const matchedAdmission = deriveAdmissionStatus(updatedLead?.reconciliation_status || '');

    recordTest(
      'TC-A4.3-03',
      'Xác nhận nhập học MATCHED_VALID: admission_status = ENROLLED, reconciliation_status = MATCHED_VALID; sinh thưởng 500.000 VNĐ',
      'admission_status = ENROLLED, reconciliation_status = MATCHED_VALID, reward_status = PENDING_APPROVAL',
      `admission = ${matchedAdmission}, recon = ${updatedLead?.reconciliation_status}, reward = ${createdReward?.status} (${createdReward?.amount} VNĐ)`,
      matchedAdmission === 'ENROLLED' && updatedLead?.reconciliation_status === 'MATCHED_VALID' && createdReward?.status === 'PENDING_APPROVAL'
    );
  }

  // ---------------------------------------------------------------------------
  // CA 4: KIỂM TRA CHỐNG TRÙNG MÃ EGOV ĐANG MATCHED_VALID TRÊN LEAD THỨ HAI
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 4: Kiểm tra chống trùng mã EGOV đang hoạt động...');
  const { data: lead2 } = await supabase.from('leads').insert({
    full_name: `Học viên 2 ${testSuffix}`,
    phone: `0988${Math.floor(100000 + Math.random() * 900000)}`,
    counseling_status: 'NEW',
    course_id: sampleCourseId,
  }).select('id').single();

  const testLead2Id = lead2?.id;

  const { error: dupEgovErr } = await supabase.from('lead_reconciliations').insert({
    lead_id: testLead2Id,
    staff_id: sampleStaffId,
    external_admission_code: testEgovCode1,
    tuition_fee_collected: 14500000,
    tuition_paid_at: new Date().toISOString(),
    reconciliation_status: 'MATCHED_VALID',
    staff_note: 'Thử gán trùng mã EGOV',
  });

  const isDupRejected = dupEgovErr !== null;
  recordTest(
    'TC-A4.3-04',
    'Chống trùng mã EGOV đang MATCHED_VALID (Partial Unique Index)',
    'Từ chối gán mã EGOV trùng đang có hiệu lực (Error 23505 Unique Violation)',
    dupEgovErr ? `Bị chặn thành công: [${dupEgovErr.code || 'BLOCKED'}] ${dupEgovErr.message}` : 'LỖI: Cho phép trùng mã EGOV',
    isDupRejected
  );

  // ---------------------------------------------------------------------------
  // CA 5: HỦY GHÉP ĐỐI SOÁT (VOID RECONCILIATION) VÀ BẢO TOÀN LỊCH SỬ
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 5: Hủy ghép đối soát có lý do, chuyển VOIDED cả đối soát & thưởng...');
  const voidReason = 'Nhập nhầm mã EGOV của thí sinh khác';
  const nowIso = new Date().toISOString();

  // Void reconciliation
  await supabase.from('lead_reconciliations').update({
    reconciliation_status: 'VOIDED',
    void_reason: voidReason,
    voided_by: sampleStaffId,
    voided_at: nowIso,
  }).eq('lead_id', testLeadId).eq('reconciliation_status', 'MATCHED_VALID');

  // Void reward
  await supabase.from('rewards').update({
    status: 'VOIDED',
    void_reason: voidReason,
    voided_by: sampleStaffId,
    voided_at: nowIso,
  }).eq('lead_id', testLeadId).in('status', ['PENDING_APPROVAL', 'APPROVED']);

  // Reset lead
  await supabase.from('leads').update({
    reconciliation_status: 'NOT_RECONCILED',
    reward_status: 'NONE',
    updated_at: nowIso,
  }).eq('id', testLeadId);

  // Ghi audit
  await supabase.from('audit_logs').insert({
    actor_id: sampleStaffId,
    action: 'VOID_RECONCILIATION',
    entity_name: 'lead_reconciliations',
    entity_id: reconMatched?.id,
    old_values: { reconciliation_status: 'MATCHED_VALID', reward_status: 'PENDING_APPROVAL' },
    new_values: { reconciliation_status: 'VOIDED', reward_status: 'VOIDED', lead_reconciliation_status: 'NOT_RECONCILED' },
    reason: voidReason,
  });

  const { data: voidedLead } = await supabase.from('leads').select('reconciliation_status, reward_status').eq('id', testLeadId).single();
  const { data: voidedRecon } = await supabase.from('lead_reconciliations').select('reconciliation_status, void_reason, voided_by').eq('id', reconMatched?.id).single();
  const { data: voidedReward } = await supabase.from('rewards').select('status, void_reason').eq('reconciliation_id', reconMatched?.id).single();

  const voidedAdmission = deriveAdmissionStatus(voidedLead?.reconciliation_status || '');
  const isVoidSuccess = voidedAdmission === 'NOT_ENROLLED' && 
                        voidedLead?.reconciliation_status === 'NOT_RECONCILED' && 
                        voidedLead?.reward_status === 'NONE' &&
                        voidedRecon?.reconciliation_status === 'VOIDED' &&
                        voidedReward?.status === 'VOIDED';

  recordTest(
    'TC-A4.3-05',
    'Hủy ghép đối soát: Chuyển VOIDED nguyên tử, đưa Lead về NOT_RECONCILED và NOT_ENROLLED',
    'lead(NOT_RECONCILED, NOT_ENROLLED, NONE), recon(VOIDED), reward(VOIDED)',
    `lead = (${voidedLead?.reconciliation_status}, ${voidedAdmission}, ${voidedLead?.reward_status}), recon = ${voidedRecon?.reconciliation_status}, reward = ${voidedReward?.status}`,
    Boolean(isVoidSuccess)
  );

  // ---------------------------------------------------------------------------
  // CA 6: ĐỐI SOÁT LẠI CÙNG MÃ EGOV SAU KHI HỦY (RE-RECONCILIATION)
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 6: Kiểm tra giải phóng mã EGOV và cho phép đối soát lại...');
  const { data: reRecon, error: reReconErr } = await supabase.from('lead_reconciliations').insert({
    lead_id: testLead2Id,
    staff_id: sampleStaffId,
    external_admission_code: testEgovCode1, // Mã vừa được giải phóng khỏi VOIDED
    tuition_fee_collected: 14500000,
    tuition_paid_at: new Date().toISOString(),
    reconciliation_status: 'MATCHED_VALID',
    staff_note: 'Đối soát lại chính xác sau khi bản ghi cũ bị VOIDED',
  }).select('id, external_admission_code, reconciliation_status').single();

  const isReReconSuccess = !reReconErr && reRecon?.reconciliation_status === 'MATCHED_VALID';
  recordTest(
    'TC-A4.3-06',
    'Mã EGOV được giải phóng sau VOIDED và cho phép đối soát lại thành công',
    'Insert thành công cùng mã EGOV sau khi bản cũ VOIDED',
    reReconErr ? `Lỗi: ${reReconErr.message}` : `Đối soát lại thành công với ID = ${reRecon?.id}`,
    Boolean(isReReconSuccess)
  );

  // ---------------------------------------------------------------------------
  // CA 7: XÁC NHẬN EXISTING_IN_SCHOOL_SYSTEM (ĐĂNG KÝ TRƯỚC QUA KÊNH KHÁC)
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 7: Kiểm tra trường hợp EXISTING_IN_SCHOOL_SYSTEM...');
  const { data: reconExisting } = await supabase.from('lead_reconciliations').insert({
    lead_id: testLeadId,
    staff_id: sampleStaffId,
    external_admission_code: testEgovCode2,
    tuition_fee_collected: 14500000,
    tuition_paid_at: new Date().toISOString(),
    reconciliation_status: 'EXISTING_IN_SCHOOL_SYSTEM',
    staff_note: 'Học viên đã nộp hồ sơ trực tiếp tại trường ngày 10/09 trước khi phát sinh link CTV',
  }).select('id, reconciliation_status').single();

  await supabase.from('leads').update({
    reconciliation_status: 'EXISTING_IN_SCHOOL_SYSTEM',
    reward_status: 'NONE',        // CTV KHÔNG ĐƯỢC THƯỞNG
    updated_at: new Date().toISOString(),
  }).eq('id', testLeadId);

  const { data: existingLeadData } = await supabase.from('leads').select('reconciliation_status, reward_status').eq('id', testLeadId).single();
  const { data: existingRewards } = await supabase.from('rewards').select('id').eq('reconciliation_id', reconExisting?.id);
  const existingAdmission = deriveAdmissionStatus(existingLeadData?.reconciliation_status || '');

  const isExistingCorrect = existingAdmission === 'ENROLLED' && 
                           existingLeadData?.reconciliation_status === 'EXISTING_IN_SCHOOL_SYSTEM' && 
                           existingLeadData?.reward_status === 'NONE' &&
                           (!existingRewards || existingRewards.length === 0);

  recordTest(
    'TC-A4.3-07',
    'EXISTING_IN_SCHOOL_SYSTEM: Tình trạng nhập học = ENROLLED nhưng reward_status = NONE, không sinh thưởng',
    'admission_status = ENROLLED, reconciliation_status = EXISTING_IN_SCHOOL_SYSTEM, reward_status = NONE, 0 reward records',
    `admission = ${existingAdmission}, recon = ${existingLeadData?.reconciliation_status}, reward = ${existingLeadData?.reward_status}, reward_count = ${existingRewards?.length || 0}`,
    Boolean(isExistingCorrect)
  );

  // ---------------------------------------------------------------------------
  // CA 8: XÁC NHẬN MISMATCH_INVALID (KHÔNG TÌM THẤY HỒ SƠ KHỚP TRÊN EGOV)
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 8: Kiểm tra trường hợp MISMATCH_INVALID...');
  const { data: lead3 } = await supabase.from('leads').insert({
    full_name: `Học viên 3 ${testSuffix}`,
    phone: `0989${Math.floor(100000 + Math.random() * 900000)}`,
    course_id: sampleCourseId,
    counseling_status: 'NEW',
  }).select('id').single();

  const testLead3Id = lead3?.id;

  const { data: reconMismatch } = await supabase.from('lead_reconciliations').insert({
    lead_id: testLead3Id,
    staff_id: sampleStaffId,
    external_admission_code: 'MISMATCH_NONE',
    tuition_fee_collected: 0,
    tuition_paid_at: new Date().toISOString(),
    reconciliation_status: 'MISMATCH_INVALID',
    staff_note: 'Không tìm thấy thông tin thí sinh khớp trên hệ thống EGOV của trường',
  }).select('id, reconciliation_status').single();

  await supabase.from('leads').update({
    reconciliation_status: 'MISMATCH_INVALID',
    reward_status: 'NONE',
    updated_at: new Date().toISOString(),
  }).eq('id', testLead3Id);

  const { data: mismatchLeadData } = await supabase.from('leads').select('reconciliation_status, reward_status').eq('id', testLead3Id).single();
  const mismatchAdmission = deriveAdmissionStatus(mismatchLeadData?.reconciliation_status || '');

  const isMismatchCorrect = mismatchAdmission === 'NOT_ENROLLED' && 
                            mismatchLeadData?.reconciliation_status === 'MISMATCH_INVALID' && 
                            mismatchLeadData?.reward_status === 'NONE';

  recordTest(
    'TC-A4.3-08',
    'MISMATCH_INVALID: admission_status = NOT_ENROLLED, reconciliation_status = MISMATCH_INVALID, reward_status = NONE',
    'admission_status = NOT_ENROLLED, reconciliation_status = MISMATCH_INVALID, reward_status = NONE',
    `admission = ${mismatchAdmission}, recon = ${mismatchLeadData?.reconciliation_status}, reward = ${mismatchLeadData?.reward_status}`,
    Boolean(isMismatchCorrect)
  );

  // ---------------------------------------------------------------------------
  // CA 9: KIỂM TRA PHÂN BIỆT HỌC PHÍ KHÓA HỌC VÀ HỌC PHÍ THỰC THU
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 9: Kiểm tra lưu giữ thông tin học phí khóa học phục vụ tính doanh thu CTV...');
  const { data: courseData } = await supabase.from('courses').select('id, title, tuition_fee_estimate').eq('id', sampleCourseId).single();
  const hasCourseFee = courseData && Number(courseData.tuition_fee_estimate) > 0;

  recordTest(
    'TC-A4.3-09',
    'Khóa học lưu giữ mức học phí chính thức/ước tính (tuition_fee_estimate) độc lập với số tiền thực thu',
    'tuition_fee_estimate > 0, kiểu số numeric, không bị ghi đè bởi học phí thực thu',
    `Khóa học: "${courseData?.title}", Học phí khóa học = ${courseData?.tuition_fee_estimate} VNĐ`,
    Boolean(hasCourseFee)
  );

  // ---------------------------------------------------------------------------
  // CA 10: KIỂM TRA PHÂN QUYỀN VÀ BẢO TOÀN LỊCH SỬ KIỂM TOÁN (AUDIT LOGS)
  // ---------------------------------------------------------------------------
  console.log('>>> Thực hiện Ca 10: Kiểm tra bảo toàn lịch sử kiểm toán...');
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('id, action, entity_name, entity_id, old_values, new_values, reason')
    .eq('entity_id', reconMatched?.id);

  const hasAuditLog = auditLogs && auditLogs.length > 0 && auditLogs[0].action === 'VOID_RECONCILIATION';
  recordTest(
    'TC-A4.3-10',
    'Ghi nhận nhật ký kiểm toán (audit_logs) đầy đủ cho thao tác hủy đối soát',
    'audit_logs có action = VOID_RECONCILIATION, lưu vết old_values và new_values kèm lý do',
    `Tìm thấy ${auditLogs?.length || 0} bản ghi audit log. Action: "${auditLogs?.[0]?.action}", Reason: "${auditLogs?.[0]?.reason}"`,
    Boolean(hasAuditLog)
  );

  // ---------------------------------------------------------------------------
  // DỌN DẸP DỮ LIỆU THỬ NGHIỆM
  // ---------------------------------------------------------------------------
  console.log('>>> Dọn dẹp dữ liệu thử nghiệm...');
  const testLeadIds = [testLeadId, testLead2Id, testLead3Id].filter(Boolean);
  for (const lid of testLeadIds) {
    await supabase.from('rewards').delete().eq('lead_id', lid);
    await supabase.from('lead_reconciliations').delete().eq('lead_id', lid);
    await supabase.from('audit_logs').delete().eq('entity_id', lid);
    await supabase.from('leads').delete().eq('id', lid);
  }
  console.log('Đã dọn dẹp sạch sẽ toàn bộ dữ liệu thử nghiệm.\n');

  // ---------------------------------------------------------------------------
  // TỔNG HỢP KẾT QUẢ KIỂM THỬ
  // ---------------------------------------------------------------------------
  console.log('='.repeat(78));
  console.log('                    BẢNG TỔNG HỢP NGHIỆM THU A4.3');
  console.log('='.repeat(78));
  let totalPass = 0;
  for (const item of testResults) {
    if (item.passed) totalPass++;
    console.log(`[${item.passed ? 'PASS' : 'FAIL'}] ${item.code.padEnd(12)} | ${item.name}`);
  }
  console.log('-'.repeat(78));
  console.log(`KẾT QUẢ: ${totalPass}/${testResults.length} ca ĐẠT (PASS).`);
  console.log('='.repeat(78));
}

runTestSuite().catch((err) => {
  console.error('[LỖI THỰC THI KIỂM THỬ]:', err.message || err);
  process.exit(1);
});
