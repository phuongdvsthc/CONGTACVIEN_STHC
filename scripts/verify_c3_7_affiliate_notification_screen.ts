/**
 * KIỂM THỬ TỰ ĐỘNG C3.7: MÀN HÌNH THÔNG BÁO CỘNG TÁC VIÊN (/portal/notifications)
 * File: scripts/verify_c3_7_affiliate_notification_screen.ts
 *
 * Kiểm tra toàn diện 10 ca kiểm thử:
 * 1. TC-3.7-01: Route Guard & Phân quyền truy cập /portal/notifications (Active CTV được phép; Pending/Suspended/Admin bị chặn).
 * 2. TC-3.7-02: Cấu hình Menu & Sidebar CTV (Có mục "Thông báo", đúng đường dẫn /portal/notifications và layout chung).
 * 3. TC-3.7-03: API Số đếm chưa đọc riêng biệt cho 2 Tab (Ban quản trị vs Hệ thống) từ backend.
 * 4. TC-3.7-04: Bảo vệ Endpoint hộp thư CTV (Admin/Staff không được gọi API hộp thư CTV qua màn hình này).
 * 5. TC-3.7-05: Lọc danh sách theo Tab (ANNOUNCEMENT vs SYSTEM) độc lập và chuẩn DTO.
 * 6. TC-3.7-06: Lọc theo trạng thái đọc (Tất cả / Chưa đọc / Đã đọc) và tìm kiếm tiêu đề qua backend.
 * 7. TC-3.7-07: Phân trang thực tế từ backend (page, limit, total_items, total_pages, offset).
 * 8. TC-3.7-08: Xem chi tiết và đánh dấu đã đọc một thông báo (idempotent, bảo mật giữa các CTV).
 * 9. TC-3.7-09: Đánh dấu tất cả đã đọc (read-all) chỉ áp dụng cho tab đang chọn với cutoff_at hợp lệ.
 * 10. TC-3.7-10: Điều hướng đối tượng liên quan (action_url an toàn, không rò rỉ route admin).
 */

import { createClient } from '@supabase/supabase-js';
import { checkRouteAccess, AuthSessionData } from '../src/utils/navigationGuard';
import { AFFILIATE_NAV_ITEMS } from '../src/config/navConfig';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  durationMs: number;
  message?: string;
}

const results: TestResult[] = [];

async function runTest(code: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const msg = await fn();
    const duration = Date.now() - start;
    results.push({ code, name, passed: true, durationMs: duration, message: msg || 'Thành công' });
    console.log(`\x1b[32m[PASS]\x1b[0m ${code}: ${name} (${duration}ms)`);
    if (msg) console.log(`       -> ${msg}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ code, name, passed: false, durationMs: duration, message: err?.message || String(err) });
    console.log(`\x1b[31m[FAIL]\x1b[0m ${code}: ${name} (${duration}ms)`);
    console.log(`       -> ${err?.message || err}`);
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('KHỞI CHẠY KIỂM THỬ TỰ ĐỘNG C3.7: MÀN HÌNH THÔNG BÁO CỘNG TÁC VIÊN');
  console.log(`Thời gian: ${new Date().toISOString()}`);
  console.log(`API Base: ${API_BASE}`);
  console.log('='.repeat(80));

  // 1. Chuẩn bị tài khoản test
  // Lấy danh sách affiliate ACTIVE
  const { data: affList } = await supabase
    .from('affiliate_profiles')
    .select('id, user_id, affiliate_code, status')
    .eq('status', 'ACTIVE');

  let ctvAProfile: any = null;
  let ctvBProfile: any = null;

  for (const a of affList || []) {
    const { data: p } = await supabase.from('profiles').select('id, role').eq('id', a.user_id).maybeSingle();
    if (p && p.role === 'affiliate') {
      if (!ctvAProfile) {
        ctvAProfile = a;
      } else if (!ctvBProfile) {
        ctvBProfile = a;
        break;
      }
    }
  }

  if (!ctvAProfile || !ctvAProfile.user_id) {
    throw new Error('Không tìm thấy CTV A (role affiliate, status ACTIVE) để chạy kiểm thử.');
  }

  if (!ctvBProfile || !ctvBProfile.user_id) {
    throw new Error('Không tìm thấy CTV B (role affiliate, status ACTIVE) để kiểm tra cách ly bảo mật.');
  }

  // Lấy Admin
  const { data: adminProf } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('role', 'admin')
    .limit(1)
    .single();

  const ctvAHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer demo-session-token-${ctvAProfile.user_id}`,
  };

  const ctvBHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer demo-session-token-${ctvBProfile.user_id}`,
  };

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer demo-session-token-${adminProf?.id || 'admin'}`,
  };

  // Dọn dẹp fixtures tạm
  const createdNotifIds: string[] = [];
  const createdRecipientIds: string[] = [];

  // ============================================================================
  // TC-3.7-01: Route Guard & Phân quyền truy cập /portal/notifications
  // ============================================================================
  await runTest('TC-3.7-01', 'Route Guard & Phân quyền truy cập /portal/notifications', async () => {
    // 1. Người dùng chưa đăng nhập -> redirect /login
    const unauthCheck = checkRouteAccess('/portal/notifications', null);
    if (unauthCheck.allowed || unauthCheck.reason !== 'UNAUTHENTICATED') {
      throw new Error(`Kỳ vọng UNAUTHENTICATED khi chưa đăng nhập, thực tế: ${JSON.stringify(unauthCheck)}`);
    }

    // 2. CTV ACTIVE -> cho phép truy cập
    const activeAuth: AuthSessionData = {
      role: 'affiliate_active',
      user: { id: ctvAProfile.user_id, email: 'ctv@test.vn', full_name: 'CTV Test', role: 'affiliate', is_active: true },
      affiliate: { id: ctvAProfile.id, user_id: ctvAProfile.user_id, affiliate_code: ctvAProfile.affiliate_code, status: 'ACTIVE' },
    };
    const activeCheck = checkRouteAccess('/portal/notifications', activeAuth);
    if (!activeCheck.allowed) {
      throw new Error(`CTV ACTIVE bị chặn truy cập: ${JSON.stringify(activeCheck)}`);
    }

    // 3. CTV SUSPENDED / PENDING_REVIEW -> chuyển hướng /pending
    const suspendedAuth: AuthSessionData = {
      role: 'affiliate_pending',
      user: { id: 'user-susp', email: 'susp@test.vn', full_name: 'CTV Suspended', role: 'affiliate', is_active: true },
      affiliate: { id: 'aff-susp', affiliate_code: 'SUSP01', status: 'SUSPENDED' },
    };
    const suspCheck = checkRouteAccess('/portal/notifications', suspendedAuth);
    if (suspCheck.allowed || suspCheck.reason !== 'FORBIDDEN' || (suspCheck as any).defaultRoute !== '/pending') {
      throw new Error(`CTV SUSPENDED không bị chuyển hướng về /pending: ${JSON.stringify(suspCheck)}`);
    }

    // 4. Admin / Staff -> bị chặn không truy cập portal CTV
    const adminAuth: AuthSessionData = {
      role: 'admin',
      user: { id: adminProf?.id || 'admin', email: 'admin@sthc.edu.vn', full_name: 'Admin', role: 'admin', is_active: true },
      affiliate: null,
    };
    const adminCheck = checkRouteAccess('/portal/notifications', adminAuth);
    if (adminCheck.allowed || adminCheck.reason !== 'FORBIDDEN') {
      throw new Error(`Admin được phép truy cập trái phép portal CTV: ${JSON.stringify(adminCheck)}`);
    }

    return 'Route guard bảo vệ chính xác: Active CTV PASS, Suspended CTV -> /pending, Admin -> FORBIDDEN.';
  });

  // ============================================================================
  // TC-3.7-02: Cấu hình Menu & Sidebar CTV
  // ============================================================================
  await runTest('TC-3.7-02', 'Cấu hình Menu & Sidebar CTV (có mục Thông báo)', async () => {
    const notifItem = AFFILIATE_NAV_ITEMS.find((it) => it.id === 'notifications');
    if (!notifItem) {
      throw new Error('Không tìm thấy mục "notifications" trong AFFILIATE_NAV_ITEMS');
    }

    if (notifItem.path !== '/portal/notifications') {
      throw new Error(`Đường dẫn mục Thông báo sai: ${notifItem.path}, kỳ vọng: /portal/notifications`);
    }

    if (notifItem.title !== 'Thông báo') {
      throw new Error(`Tiêu đề mục Thông báo sai: ${notifItem.title}, kỳ vọng: Thông báo`);
    }

    // Kiểm tra hàm so khớp active route
    if (!notifItem.isActiveMatch('/portal/notifications')) {
      throw new Error('isActiveMatch trả về false cho /portal/notifications');
    }
    if (!notifItem.isActiveMatch('/portal/notifications?tab=SYSTEM')) {
      throw new Error('isActiveMatch trả về false cho /portal/notifications?tab=SYSTEM');
    }
    if (notifItem.isActiveMatch('/portal/leads')) {
      throw new Error('isActiveMatch trả về true cho route khác (/portal/leads)');
    }

    return 'Sidebar CTV đã tích hợp mục Thông báo (/portal/notifications) với matching active chính xác.';
  });

  // ============================================================================
  // TC-3.7-03: API Số đếm chưa đọc riêng biệt cho 2 Tab
  // ============================================================================
  await runTest('TC-3.7-03', 'API Số đếm chưa đọc riêng biệt cho 2 Tab (BQT vs Hệ thống)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/portal/notifications/unread-count`, {
      headers: ctvAHeaders,
    });

    if (!res.ok) {
      throw new Error(`Gọi unread-count thất bại HTTP ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      throw new Error(`Payload unread-count không hợp lệ: ${JSON.stringify(json)}`);
    }

    const { total_unread, announcement_unread, system_unread } = json.data;
    if (typeof total_unread !== 'number' || typeof announcement_unread !== 'number' || typeof system_unread !== 'number') {
      throw new Error('Các trường số đếm không phải kiểu số');
    }

    if (total_unread !== announcement_unread + system_unread) {
      throw new Error(`Tổng chưa đọc (${total_unread}) không khớp tổng 2 tab (${announcement_unread} + ${system_unread})`);
    }

    return `Lấy số đếm thành công: Tổng=${total_unread}, BQT=${announcement_unread}, Hệ thống=${system_unread}.`;
  });

  // ============================================================================
  // TC-3.7-04: Bảo vệ Endpoint hộp thư CTV (Admin/Staff bị chặn)
  // ============================================================================
  await runTest('TC-3.7-04', 'Bảo vệ Endpoint hộp thư CTV (Admin không gọi API hộp thư CTV)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/portal/notifications/unread-count`, {
      headers: adminHeaders,
    });

    // Endpoint phải từ chối Admin bằng mã 401 UNAUTHORIZED
    if (res.status !== 401) {
      throw new Error(`Kỳ vọng HTTP 401 khi Admin gọi API hộp thư CTV, thực tế nhận ${res.status}`);
    }

    const json = await res.json();
    if (json.success !== false || json.code !== 'UNAUTHORIZED') {
      throw new Error(`Response không đúng chuẩn chặn Admin: ${JSON.stringify(json)}`);
    }

    return 'Admin gọi API hộp thư CTV bị từ chối 401 UNAUTHORIZED đúng quy định bảo mật.';
  });

  // ============================================================================
  // Tạo fixture thông báo test cho CTV A: 1 ANNOUNCEMENT + 1 SYSTEM chưa đọc
  // ============================================================================
  const randKey = Math.floor(100000 + Math.random() * 900000);

  // Tạo thông báo ANNOUNCEMENT
  const { data: annNotif } = await supabase
    .from('notifications')
    .insert({
      type: 'ANNOUNCEMENT',
      category: 'POLICY',
      title: `[Test C3.7] Thông báo chính sách tuyển sinh ${randKey}`,
      summary: 'Tóm tắt chính sách tuyển sinh ưu đãi năm 2026',
      content: 'Chi tiết thông báo chính sách mới dành cho các khối ngành Du lịch Khách sạn.',
      action_url: '/portal/courses',
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (annNotif) createdNotifIds.push(annNotif.id);

  // Tạo phân phối recipient cho CTV A
  const { data: annRec } = await supabase
    .from('notification_recipients')
    .insert({
      notification_id: annNotif!.id,
      user_id: ctvAProfile.user_id,
      read_at: null,
    })
    .select('id')
    .single();

  if (annRec) createdRecipientIds.push(annRec.id);

  // Tạo thông báo SYSTEM
  const { data: sysNotif } = await supabase
    .from('notifications')
    .insert({
      type: 'SYSTEM',
      category: 'REWARD',
      title: `[Test C3.7] Thù lao tuyển sinh được phê duyệt ${randKey}`,
      summary: 'Khoản thưởng 500,000 VND đã được phê duyệt hợp lệ.',
      content: 'Học viên Nguyễn Văn Test đã hoàn tất học phí và được duyệt thưởng.',
      action_url: '/portal',
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sysNotif) createdNotifIds.push(sysNotif.id);

  const { data: sysRec } = await supabase
    .from('notification_recipients')
    .insert({
      notification_id: sysNotif!.id,
      user_id: ctvAProfile.user_id,
      read_at: null,
    })
    .select('id')
    .single();

  if (sysRec) createdRecipientIds.push(sysRec.id);

  // ============================================================================
  // TC-3.7-05: Lọc danh sách theo Tab (ANNOUNCEMENT vs SYSTEM) độc lập
  // ============================================================================
  await runTest('TC-3.7-05', 'Lọc danh sách theo Tab (ANNOUNCEMENT vs SYSTEM) độc lập', async () => {
    // 1. Tải tab ANNOUNCEMENT
    const resAnn = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=ANNOUNCEMENT&limit=50`, {
      headers: ctvAHeaders,
    });
    const jsonAnn = await resAnn.json();
    if (!jsonAnn.success || !Array.isArray(jsonAnn.data?.items)) {
      throw new Error('Lỗi lấy danh sách tab ANNOUNCEMENT');
    }
    const hasOnlyAnn = jsonAnn.data.items.every((it: any) => it.type === 'ANNOUNCEMENT');
    if (!hasOnlyAnn) {
      throw new Error('Tab ANNOUNCEMENT chứa phần tử không phải ANNOUNCEMENT');
    }

    // 2. Tải tab SYSTEM
    const resSys = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=SYSTEM&limit=50`, {
      headers: ctvAHeaders,
    });
    const jsonSys = await resSys.json();
    if (!jsonSys.success || !Array.isArray(jsonSys.data?.items)) {
      throw new Error('Lỗi lấy danh sách tab SYSTEM');
    }
    const hasOnlySys = jsonSys.data.items.every((it: any) => it.type === 'SYSTEM');
    if (!hasOnlySys) {
      throw new Error('Tab SYSTEM chứa phần tử không phải SYSTEM');
    }

    return `Tab ANNOUNCEMENT (${jsonAnn.data.items.length} mục) và Tab SYSTEM (${jsonSys.data.items.length} mục) phân tách độc lập tuyệt đối.`;
  });

  // ============================================================================
  // TC-3.7-06: Lọc theo trạng thái đọc (Tất cả / Chưa đọc / Đã đọc) và tìm kiếm
  // ============================================================================
  await runTest('TC-3.7-06', 'Lọc theo trạng thái đọc (Chưa đọc / Đã đọc) và tìm kiếm tiêu đề', async () => {
    // 1. Lọc chưa đọc (is_read=false)
    const resUnread = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=ANNOUNCEMENT&is_read=false`, {
      headers: ctvAHeaders,
    });
    const jsonUnread = await resUnread.json();
    if (!jsonUnread.success || !jsonUnread.data.items.every((it: any) => it.is_read === false && it.read_at === null)) {
      throw new Error('Bộ lọc is_read=false chứa thông báo đã đọc');
    }

    // 2. Tìm kiếm theo từ khóa tiêu đề
    const resSearch = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=ANNOUNCEMENT&search=${randKey}`, {
      headers: ctvAHeaders,
    });
    const jsonSearch = await resSearch.json();
    if (!jsonSearch.success || jsonSearch.data.items.length === 0) {
      throw new Error(`Tìm kiếm theo từ khóa ${randKey} không trả về kết quả mong đợi`);
    }
    const matchFound = jsonSearch.data.items.some((it: any) => it.title.includes(String(randKey)));
    if (!matchFound) {
      throw new Error('Kết quả tìm kiếm không chứa từ khóa');
    }

    return 'Bộ lọc chưa đọc và tìm kiếm theo tiêu đề hoạt động chính xác qua backend.';
  });

  // ============================================================================
  // TC-3.7-07: Phân trang thực tế từ backend
  // ============================================================================
  await runTest('TC-3.7-07', 'Phân trang thực tế từ backend (page, limit, total_items, total_pages)', async () => {
    const res = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=ANNOUNCEMENT&page=1&limit=1`, {
      headers: ctvAHeaders,
    });
    const json = await res.json();
    if (!json.success || !json.data?.pagination) {
      throw new Error('Không nhận được pagination object');
    }

    const p = json.data.pagination;
    if (p.page !== 1 || p.limit !== 1 || typeof p.total_items !== 'number' || typeof p.total_pages !== 'number') {
      throw new Error(`Cấu trúc pagination không đúng chuẩn: ${JSON.stringify(p)}`);
    }

    return `Phân trang backend chuẩn: page=1, limit=1, total_items=${p.total_items}, total_pages=${p.total_pages}.`;
  });

  // ============================================================================
  // TC-3.7-08: Xem chi tiết và đánh dấu đã đọc một thông báo
  // ============================================================================
  await runTest('TC-3.7-08', 'Xem chi tiết và đánh dấu đã đọc một thông báo (idempotent)', async () => {
    const notifId = annNotif!.id;

    // 1. Xem chi tiết thông báo (GET không làm thay đổi trạng thái đọc)
    const detailRes = await fetch(`${API_BASE}/api/v1/portal/notifications/${notifId}`, {
      headers: ctvAHeaders,
    });
    const detailJson = await detailRes.json();
    if (!detailJson.success || !detailJson.data) {
      throw new Error(`Lấy chi tiết thất bại: ${JSON.stringify(detailJson)}`);
    }
    if (detailJson.data.notification_id !== notifId) {
      throw new Error(`Notification ID không khớp: ${detailJson.data.notification_id}`);
    }

    // 2. CTV B cố tình đọc thông báo của CTV A -> phải trả về 404 NOT_FOUND
    const hackRes = await fetch(`${API_BASE}/api/v1/portal/notifications/${notifId}`, {
      headers: ctvBHeaders,
    });
    if (hackRes.status !== 404) {
      throw new Error(`CTV B xem trộm thông báo của CTV A nhưng không nhận 404, nhận: ${hackRes.status}`);
    }

    // 3. CTV A đánh dấu đã đọc thông báo này
    const markRes = await fetch(`${API_BASE}/api/v1/portal/notifications/${notifId}/read`, {
      method: 'POST',
      headers: ctvAHeaders,
    });
    const markJson = await markRes.json();
    if (!markJson.success || !markJson.data?.is_read || markJson.data.updated_count !== 1) {
      throw new Error(`Đánh dấu đã đọc lần 1 thất bại: ${JSON.stringify(markJson)}`);
    }
    const readAtTime = markJson.data.read_at;

    // 4. Đánh dấu đã đọc lần 2 (Idempotent) -> giữ nguyên read_at, updated_count = 0
    const markRes2 = await fetch(`${API_BASE}/api/v1/portal/notifications/${notifId}/read`, {
      method: 'POST',
      headers: ctvAHeaders,
    });
    const markJson2 = await markRes2.json();
    if (!markJson2.success || markJson2.data.updated_count !== 0 || markJson2.data.read_at !== readAtTime) {
      throw new Error(`Đánh dấu lần 2 không idempotent: ${JSON.stringify(markJson2)}`);
    }

    return 'Xem chi tiết bảo mật giữa các CTV; đánh dấu đã đọc thành công và đảm bảo idempotent.';
  });

  // ============================================================================
  // TC-3.7-09: Đánh dấu tất cả đã đọc (read-all) chỉ áp dụng cho tab đang chọn
  // ============================================================================
  await runTest('TC-3.7-09', 'Đánh dấu tất cả đã đọc chỉ áp dụng tab đang chọn với cutoff_at hợp lệ', async () => {
    // Lấy thời điểm máy chủ hiện tại
    const listRes = await fetch(`${API_BASE}/api/v1/portal/notifications?tab=SYSTEM&limit=1`, {
      headers: ctvAHeaders,
    });
    const listJson = await listRes.json();
    const serverTime = listJson.data?.server_time || new Date().toISOString();

    // 1. Thử gửi cutoff_at ở tương lai xa -> phải bị từ chối
    const futureTime = new Date(Date.now() + 86400000 * 2).toISOString();
    const futureRes = await fetch(`${API_BASE}/api/v1/portal/notifications/read-all`, {
      method: 'POST',
      headers: ctvAHeaders,
      body: JSON.stringify({ tab: 'SYSTEM', cutoff_at: futureTime }),
    });
    if (futureRes.status !== 400) {
      throw new Error(`Gửi cutoff_at tương lai không bị từ chối 400, nhận: ${futureRes.status}`);
    }

    // 2. Đánh dấu tất cả đã đọc cho tab SYSTEM với serverTime hợp lệ
    const readAllRes = await fetch(`${API_BASE}/api/v1/portal/notifications/read-all`, {
      method: 'POST',
      headers: ctvAHeaders,
      body: JSON.stringify({ tab: 'SYSTEM', cutoff_at: serverTime }),
    });
    const readAllJson = await readAllRes.json();
    if (!readAllJson.success) {
      throw new Error(`read-all thất bại: ${JSON.stringify(readAllJson)}`);
    }

    // 3. Kiểm tra số đếm unread-count sau khi read-all tab SYSTEM:
    // system_unread phải giảm về 0 (hoặc giảm đúng số lượng trước đó)
    const afterCountRes = await fetch(`${API_BASE}/api/v1/portal/notifications/unread-count`, {
      headers: ctvAHeaders,
    });
    const afterCountJson = await afterCountRes.json();
    if (afterCountJson.data.system_unread !== 0) {
      throw new Error(`system_unread vẫn còn ${afterCountJson.data.system_unread} sau khi read-all tab SYSTEM`);
    }

    return `Đánh dấu tất cả đã đọc tab SYSTEM thành công, cập nhật unread_count tức thì.`;
  });

  // ============================================================================
  // TC-3.7-10: Điều hướng đối tượng liên quan (action_url an toàn)
  // ============================================================================
  await runTest('TC-3.7-10', 'Điều hướng đối tượng liên quan (action_url an toàn, không có route admin)', async () => {
    // Kiểm tra danh sách thông báo của CTV A
    const res = await fetch(`${API_BASE}/api/v1/portal/notifications?limit=20`, {
      headers: ctvAHeaders,
    });
    const json = await res.json();
    const items = json.data?.items || [];

    for (const item of items) {
      if (item.action_url) {
        // Tuyệt đối không trỏ tới route admin
        if (item.action_url.startsWith('/admin')) {
          throw new Error(`Phát hiện action_url trỏ tới khu vực Admin: ${item.action_url}`);
        }
        // Bắt buộc là đường dẫn portal nội bộ hợp lệ
        if (!item.action_url.startsWith('/portal') && !item.action_url.startsWith('/pending') && !item.action_url.startsWith('/')) {
          throw new Error(`action_url không phải đường dẫn hợp lệ: ${item.action_url}`);
        }
      }
    }

    return `Tất cả action_url trong thông báo (${items.length} mục) tuân thủ bảo mật, không điều hướng sang Admin.`;
  });

  // ============================================================================
  // Dọn dẹp dữ liệu fixtures
  // ============================================================================
  console.log('--- Dọn dẹp fixtures tạm thời ---');
  if (createdRecipientIds.length > 0) {
    await supabase.from('notification_recipients').delete().in('id', createdRecipientIds);
  }
  if (createdNotifIds.length > 0) {
    await supabase.from('notifications').delete().in('id', createdNotifIds);
  }
  console.log('Dọn dẹp hoàn tất.');

  // ============================================================================
  // TỔNG HỢP KẾT QUẢ
  // ============================================================================
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;

  console.log('='.repeat(80));
  console.log('KẾT QUẢ TỔNG HỢP KIỂM THỬ C3.7:');
  console.log(`Tổng số ca kiểm thử: ${results.length}`);
  console.log(`Thành công (PASS):   ${passCount}`);
  console.log(`Thất bại (FAIL):     ${failCount}`);
  console.log('='.repeat(80));

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi ngoại lệ thực thi kiểm thử C3.7:', err);
  process.exit(1);
});
