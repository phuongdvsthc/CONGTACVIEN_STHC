import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jowfyhlzwhalwaohlldm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.trim() === '') {
  console.error('[CONFIGURATION ERROR] Thiếu biến môi trường SUPABASE_SERVICE_ROLE_KEY. Không thể khởi tạo client quản trị backend.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Dedicated independent client instance for public auth operations (signUp, signIn)
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Initial academic courses of STHC
const INITIAL_COURSES = [
  {
    code: 'CBMA-TC-01',
    title: 'Kỹ thuật Chế biến Món ăn Á - Âu',
    slug: 'ky-thuat-che-bien-mon-an-a-au',
    department: 'Khoa Ẩm thực & Bếp',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 14500000,
    summary: 'Chương trình đào tạo nghề bếp chuẩn quốc tế, trang bị kỹ thuật chế biến ẩm thực Á - Âu, quản lý bếp chuyên nghiệp và an toàn thực phẩm.',
    description_html: '<p>Chương trình cung cấp kỹ năng chế biến các món ăn đặc sắc từ ẩm thực Việt Nam, các nước Châu Á đến tinh hoa ẩm thực Pháp, Ý. Sinh viên được thực hành tại hệ thống bếp tiêu chuẩn 5 sao và thực tập hưởng lương tại các khách sạn trực thuộc Saigontourist Group.</p>',
    is_active: true,
    sort_order: 1,
  },
  {
    code: 'BB-TC-02',
    title: 'Nghệ thuật Bếp bánh & Bánh ngọt Âu',
    slug: 'nghe-thuat-bep-banh-banh-ngot-au',
    department: 'Khoa Ẩm thực & Bếp',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 13800000,
    summary: 'Đào tạo kỹ nghệ làm bánh mì, bánh ngọt kiểu Âu (Pastry & Bakery), trang trí sô-cô-la và món tráng miệng nhà hàng cao cấp.',
    description_html: '<p>Sinh viên được đào tạo chuyên sâu về kỹ thuật làm bánh cổ điển Pháp, bánh hiện đại, tạo hình đường nghệ thuật và quản lý xưởng bánh chuyên nghiệp.</p>',
    is_active: true,
    sort_order: 2,
  },
  {
    code: 'QTKS-TC-03',
    title: 'Quản trị Khách sạn & Khu nghỉ dưỡng',
    slug: 'quan-tri-khach-san-khu-nghi-duong',
    department: 'Khoa Quản trị Khách sạn',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 13500000,
    summary: 'Chương trình quản trị tiền sảnh, buồng phòng, dịch vụ hội nghị và quản lý vận hành khách sạn 4 - 5 sao.',
    description_html: '<p>Đào tạo toàn diện nghiệp vụ khách sạn quốc tế, sử dụng phần mềm quản lý Opera/Fidelio, giao tiếp tiếng Anh chuyên ngành và thực tập tại Rex Hotel, Grand Hotel, Caravelle.</p>',
    is_active: true,
    sort_order: 3,
  },
  {
    code: 'LT-SC-04',
    title: 'Quản trị Lễ tân Quốc tế',
    slug: 'quan-tri-le-tan-quoc-te',
    department: 'Khoa Quản trị Khách sạn',
    degree_level: 'Sơ cấp chuyên nghiệp',
    duration_text: '6 tháng',
    tuition_fee_estimate: 8500000,
    summary: 'Nghiệp vụ tiền sảnh, check-in/check-out, xử lý khiếu nại khách quốc tế và kỹ năng giao tiếp hiếu khách chuyên nghiệp.',
    description_html: '<p>Khóa học ngắn hạn trang bị cấp tốc kỹ năng nghiệp vụ lễ tân khách sạn hiện đại, cấp chứng chỉ sơ cấp quốc gia có giá trị toàn quốc.</p>',
    is_active: true,
    sort_order: 4,
  },
  {
    code: 'QTNH-TC-05',
    title: 'Quản trị Nhà hàng & Dịch vụ Ăn uống',
    slug: 'quan-tri-nha-hang-dich-vu-an-uong',
    department: 'Khoa Nhà hàng & Ẩm thực (F&B)',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 13000000,
    summary: 'Kỹ năng phục vụ bàn chuẩn Fine Dining, quản lý hầm rượu vang (Sommelier), tổ chức tiệc cưới và yến tiệc sự kiện.',
    description_html: '<p>Trở thành chuyên viên F&B chuyên nghiệp, nắm vững quy trình set bàn Âu - Á, nghệ thuật phục vụ rượu vang và kỹ năng quản lý chuỗi nhà hàng.</p>',
    is_active: true,
    sort_order: 5,
  },
  {
    code: 'PC-SC-06',
    title: 'Nghệ thuật Pha chế Đồ uống (Bartender & Barista)',
    slug: 'nghe-thuat-pha-che-bartender-barista',
    department: 'Khoa Nhà hàng & Ẩm thực (F&B)',
    degree_level: 'Sơ cấp chuyên nghiệp',
    duration_text: '3 tháng',
    tuition_fee_estimate: 7900000,
    summary: 'Kỹ nghệ pha chế Cocktail, Mocktail, nghệ thuật pha chế Cà phê Ý (Latte Art) và quản lý quầy bar hiện đại.',
    description_html: '<p>Học viên được thực hành pha chế hơn 60 loại thức uống thịnh hành, kỹ thuật quăng chai biểu diễn (Flair Bartending) và quản trị quầy bar chuyên nghiệp.</p>',
    is_active: true,
    sort_order: 6,
  },
  {
    code: 'HDDL-TC-07',
    title: 'Hướng dẫn Du lịch Quốc tế & Nội địa',
    slug: 'huong-dan-du-lich-quoc-te-noi-dia',
    department: 'Khoa Lữ hành & Hướng dẫn',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 12500000,
    summary: 'Trang bị kiến thức văn hóa, lịch sử, kỹ năng thuyết minh tour, quản lý đoàn và điều kiện cấp Thẻ Hướng dẫn viên Du lịch Quốc gia.',
    description_html: '<p>Sinh viên được dẫn tour thực địa xuyên Việt, rèn luyện kỹ năng hoạt náo, xử lý tình huống khẩn cấp và cơ hội làm việc tại Công ty Dịch vụ Lữ hành Saigontourist.</p>',
    is_active: true,
    sort_order: 7,
  },
  {
    code: 'DH-TC-08',
    title: 'Quản trị Điều hành Tour & Đại lý Du lịch',
    slug: 'quan-tri-dieu-hanh-tour-dai-ly-du-lich',
    department: 'Khoa Lữ hành & Hướng dẫn',
    degree_level: 'Trung cấp chính quy',
    duration_text: '2 năm (4 học kỳ)',
    tuition_fee_estimate: 12800000,
    summary: 'Kỹ năng thiết kế sản phẩm tour, định giá chương trình du lịch, điều hành phương tiện và đại lý bán vé máy bay/khách sạn.',
    description_html: '<p>Đào tạo chuyên viên điều hành tour (Tour Operator), kỹ năng thương lượng với nhà cung cấp dịch vụ và xây dựng hành trình trải nghiệm độc đáo.</p>',
    is_active: true,
    sort_order: 8,
  }
];

// In-memory demo simulated state for E4 testing
interface DemoAffiliate {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  affiliate_code: string;
  status: 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  id_card_number: string;
  id_card_issued_date?: string;
  occupation: string;
  address: string;
  bank_account_number?: string;
  bank_name?: string;
  created_at: string;
  review_note?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  suspended_by?: string;
  suspended_at?: string;
  suspension_reason?: string;
  reactivated_by?: string;
  reactivated_at?: string;
  reactivation_note?: string;
  email_verified?: boolean;
}

interface DemoState {
  currentRole: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin';
  currentUser: any | null;
  currentAffiliate: any | null;
  pendingAffiliate: DemoAffiliate;
  pendingVerifiedAffiliate: DemoAffiliate;
  activeAffiliate: DemoAffiliate;
  suspendedAffiliate: DemoAffiliate;
  rejectedAffiliate: DemoAffiliate;
  auditLogs: any[];
  disabledUser: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: 'affiliate';
    is_active: boolean;
  };
  staffUser: {
    id: string;
    email: string;
    full_name: string;
    role: 'staff';
    is_active: boolean;
  };
  adminUser: {
    id: string;
    email: string;
    full_name: string;
    role: 'admin';
    is_active: boolean;
  };
}

const demoState: DemoState = {
  currentRole: 'public',
  currentUser: null,
  currentAffiliate: null,
  pendingAffiliate: {
    id: 'a0000000-0000-0000-0000-000000000001',
    user_id: 'u0000000-0000-0000-0000-000000000001',
    full_name: 'Nguyễn Văn Đang Chờ Duyệt (Chưa xác thực email)',
    email: 'ctv_cho_duyet@sthc.edu.vn',
    phone: '0901234567',
    affiliate_code: 'STHCCTV9001',
    status: 'PENDING_REVIEW',
    id_card_number: '079201009876',
    id_card_issued_date: '2024-01-10',
    occupation: 'Cựu sinh viên Khóa 2024',
    address: 'Quận 10, TP. Hồ Chí Minh',
    bank_account_number: '0123456789',
    bank_name: 'BIDV - Chi nhánh Bến Thành',
    email_verified: false,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    review_note: 'Hồ sơ đang chờ Ban Tuyển sinh đối chiếu thông tin cá nhân.',
  },
  pendingVerifiedAffiliate: {
    id: 'a0000000-0000-0000-0000-000000000005',
    user_id: 'u0000000-0000-0000-0000-000000000006',
    full_name: 'Hoàng Minh Nhật (Chờ duyệt - Đã xác thực)',
    email: 'ctv_daxacthuc@sthc.edu.vn',
    phone: '0903332211',
    affiliate_code: 'STHCCTV9005',
    status: 'PENDING_REVIEW',
    id_card_number: '079201005566',
    id_card_issued_date: '2023-11-15',
    occupation: 'Nhân viên kinh doanh du lịch',
    address: 'Quận Phú Nhuận, TP. Hồ Chí Minh',
    bank_account_number: '0071001234567',
    bank_name: 'Vietcombank - Chi nhánh Tân Định',
    email_verified: true,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    review_note: 'Hồ sơ chờ phê duyệt sau khi đã xác thực email thành công.',
  },
  activeAffiliate: {
    id: 'a0000000-0000-0000-0000-000000000002',
    user_id: 'u0000000-0000-0000-0000-000000000002',
    full_name: 'Trần Thị Thu Thảo',
    email: 'ctv_hoat_dong@sthc.edu.vn',
    phone: '0908889999',
    affiliate_code: 'STHCCTV1088',
    status: 'ACTIVE',
    id_card_number: '079201001234',
    id_card_issued_date: '2023-08-20',
    occupation: 'Hướng dẫn viên Du lịch tự do',
    address: 'Quận Tân Bình, TP. Hồ Chí Minh',
    bank_account_number: '0908889999',
    bank_name: 'Vietcombank - Chi nhánh TP.HCM',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    review_note: 'Đã phê duyệt và kích hoạt đầy đủ quyền tuyển sinh.',
    reviewed_by: 'u0000000-0000-0000-0000-000000000099',
    reviewed_at: new Date(Date.now() - 3600000 * 24 * 25).toISOString(),
    email_verified: true,
  },
  suspendedAffiliate: {
    id: 'a0000000-0000-0000-0000-000000000003',
    user_id: 'u0000000-0000-0000-0000-000000000003',
    full_name: 'Phạm Văn Tạm Khóa',
    email: 'ctv_tam_khoa@sthc.edu.vn',
    phone: '0907776655',
    affiliate_code: 'STHCCTV3033',
    status: 'SUSPENDED',
    id_card_number: '079201007788',
    occupation: 'Tự do',
    address: 'Quận 1, TP. Hồ Chí Minh',
    created_at: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
    reviewed_by: 'u0000000-0000-0000-0000-000000000099',
    reviewed_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    review_note: 'Hồ sơ đã được phê duyệt hợp lệ bởi Ban Tuyển sinh.',
    suspended_by: 'u0000000-0000-0000-0000-000000000099',
    suspended_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    suspension_reason: 'Tài khoản đang bị tạm ngưng do vi phạm chính sách truyền thông tuyển sinh.',
    email_verified: true,
  },
  rejectedAffiliate: {
    id: 'a0000000-0000-0000-0000-000000000004',
    user_id: 'u0000000-0000-0000-0000-000000000004',
    full_name: 'Lê Thị Từ Chối',
    email: 'ctv_tu_choi@sthc.edu.vn',
    phone: '0906665544',
    affiliate_code: 'STHCCTV4044',
    status: 'REJECTED',
    id_card_number: '079201004455',
    occupation: 'Tự do',
    address: 'Quận 3, TP. Hồ Chí Minh',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    reviewed_by: 'u0000000-0000-0000-0000-000000000099',
    reviewed_at: new Date(Date.now() - 3600000 * 24 * 9).toISOString(),
    review_note: 'Hồ sơ chưa đáp ứng điều kiện tiếp nhận CTV theo quy chế năm 2026.',
    email_verified: false,
  },
  auditLogs: [
    {
      id: 'audit-seed-suspend-01',
      actor_id: 'u0000000-0000-0000-0000-000000000099',
      action: 'AFFILIATE_SUSPENDED',
      entity_name: 'affiliate_profiles',
      entity_id: 'a0000000-0000-0000-0000-000000000003',
      old_values: { status: 'ACTIVE' },
      new_values: {
        status: 'SUSPENDED',
        suspended_by: 'u0000000-0000-0000-0000-000000000099',
        suspension_reason: 'Tài khoản đang bị tạm ngưng do vi phạm chính sách truyền thông tuyển sinh.',
      },
      reason: 'Tài khoản đang bị tạm ngưng do vi phạm chính sách truyền thông tuyển sinh.',
      actor: {
        id: 'u0000000-0000-0000-0000-000000000099',
        full_name: 'Cán bộ Tuyển sinh (Ban Quản trị)',
        email: 'staff@sthc.edu.vn',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    },
    {
      id: 'audit-seed-approve-01',
      actor_id: 'u0000000-0000-0000-0000-000000000099',
      action: 'AFFILIATE_APPROVED',
      entity_name: 'affiliate_profiles',
      entity_id: 'a0000000-0000-0000-0000-000000000003',
      old_values: { status: 'PENDING_REVIEW' },
      new_values: { status: 'ACTIVE' },
      reason: 'Hồ sơ đã được phê duyệt hợp lệ bởi Ban Tuyển sinh.',
      actor: {
        id: 'u0000000-0000-0000-0000-000000000099',
        full_name: 'Cán bộ Tuyển sinh (Ban Quản trị)',
        email: 'staff@sthc.edu.vn',
      },
      created_at: new Date(Date.now() - 3600000 * 24 * 45).toISOString(),
    },
  ],
  disabledUser: {
    id: 'u0000000-0000-0000-0000-000000000005',
    email: 'taikhoan_vohieuhoa@sthc.edu.vn',
    full_name: 'Nguyễn Văn Vô Hiệu Hóa',
    phone: '0905554433',
    role: 'affiliate',
    is_active: false,
  },
  staffUser: {
    id: 's0000000-0000-0000-0000-000000000001',
    email: 'tuyensinh_canbo@sthc.edu.vn',
    full_name: 'Võ Minh Quân (Cán bộ Tuyển sinh)',
    role: 'staff',
    is_active: true,
  },
  adminUser: {
    id: '879a11fc-ff89-4019-b2f4-57d7843b631b',
    email: 'admin@sthc.edu.vn',
    full_name: 'Ban Giám Hiệu / Trưởng Bộ Phận Tuyển Sinh',
    role: 'admin',
    is_active: true,
  },
};

// Seed courses into Supabase if empty
async function initDatabase() {
  try {
    const { count, error } = await supabase.from('courses').select('*', { count: 'exact', head: true });
    if (!error && (count === 0 || count === null)) {
      console.log('Seeding initial STHC courses into Supabase...');
      const { error: insertErr } = await supabase.from('courses').insert(INITIAL_COURSES);
      if (insertErr) {
        console.error('Failed to seed courses:', insertErr.message);
      } else {
        console.log(`Successfully seeded ${INITIAL_COURSES.length} STHC courses.`);
      }
    }
  } catch (err: any) {
    console.warn('Database seed check notice:', err.message);
  }
}

// Persistent companion storage for Course Benefits & Custom Section (A2.3)
const BENEFITS_FILE = path.join(__dirname, 'data', 'course_benefits.json');

function loadCourseBenefits(): Record<string, { benefits_title?: string | null; benefits_content?: string | null }> {
  try {
    if (fs.existsSync(BENEFITS_FILE)) {
      return JSON.parse(fs.readFileSync(BENEFITS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[BENEFITS STORE LOAD WARN]', e);
  }
  return {};
}

function saveCourseBenefits(courseId: string, benefits: { benefits_title?: string | null; benefits_content?: string | null }) {
  try {
    const dir = path.dirname(BENEFITS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const all = loadCourseBenefits();
    all[courseId] = {
      benefits_title: benefits.benefits_title !== undefined ? (benefits.benefits_title ? String(benefits.benefits_title).trim() : null) : (all[courseId]?.benefits_title ?? null),
      benefits_content: benefits.benefits_content !== undefined ? (benefits.benefits_content ? String(benefits.benefits_content).trim() : null) : (all[courseId]?.benefits_content ?? null),
    };
    fs.writeFileSync(BENEFITS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[BENEFITS STORE SAVE WARN]', e);
  }
}

function attachCourseBenefits(course: any) {
  if (!course) return course;
  const courseId = course.id || course.code;
  const all = loadCourseBenefits();
  const stored = (course.id && all[course.id]) || (course.code && all[course.code]) || null;
  return {
    ...course,
    benefits_title: course.benefits_title !== undefined && course.benefits_title !== null ? course.benefits_title : (stored?.benefits_title ?? null),
    benefits_content: course.benefits_content !== undefined && course.benefits_content !== null ? course.benefits_content : (stored?.benefits_content ?? null),
  };
}

// Persistent companion storage for Course Lifecycle & Referral Status (A2.4)
const STATUS_FILE = path.join(__dirname, 'data', 'course_status.json');

interface CourseStatusData {
  status: 'DRAFT' | 'ACTIVE' | 'STOPPED';
  accepts_referrals: boolean;
  stop_reason?: string | null;
  status_note?: string | null;
  status_updated_at?: string;
  status_updated_by?: string | null;
}

function loadCourseStatus(): Record<string, CourseStatusData> {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[STATUS STORE LOAD WARN]', e);
  }
  return {};
}

function saveCourseStatus(courseId: string, data: Partial<CourseStatusData>) {
  try {
    const dir = path.dirname(STATUS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const all = loadCourseStatus();
    all[courseId] = {
      status: data.status || all[courseId]?.status || 'ACTIVE',
      accepts_referrals: data.accepts_referrals !== undefined ? data.accepts_referrals : (all[courseId]?.accepts_referrals ?? true),
      stop_reason: data.stop_reason !== undefined ? data.stop_reason : (all[courseId]?.stop_reason ?? null),
      status_note: data.status_note !== undefined ? data.status_note : (all[courseId]?.status_note ?? null),
      status_updated_at: data.status_updated_at || new Date().toISOString(),
      status_updated_by: data.status_updated_by !== undefined ? data.status_updated_by : (all[courseId]?.status_updated_by ?? null),
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[STATUS STORE SAVE WARN]', e);
  }
}

function attachCourseLifecycle(course: any) {
  if (!course) return course;
  const courseId = course.id || course.code;
  const all = loadCourseStatus();
  const stored = (course.id && all[course.id]) || (course.code && all[course.code]) || null;

  const is_active = course.is_active !== undefined ? Boolean(course.is_active) : true;
  let status: 'DRAFT' | 'ACTIVE' | 'STOPPED' = course.status || stored?.status || (is_active ? 'ACTIVE' : 'DRAFT');
  
  // Consistency check
  if (!is_active) {
    status = 'DRAFT';
  } else if (status === 'DRAFT') {
    status = 'ACTIVE';
  }

  const accepts_referrals = (course.accepts_referrals !== undefined && course.accepts_referrals !== null)
    ? Boolean(course.accepts_referrals) 
    : (stored?.accepts_referrals !== undefined ? stored.accepts_referrals : (status === 'ACTIVE'));

  const stop_reason = course.stop_reason !== undefined ? course.stop_reason : (stored?.stop_reason ?? null);
  const status_note = course.status_note !== undefined ? course.status_note : (stored?.status_note ?? null);
  const status_updated_at = course.status_updated_at || stored?.status_updated_at || course.updated_at || new Date().toISOString();
  const status_updated_by = course.status_updated_by || stored?.status_updated_by || null;

  return {
    ...course,
    is_active,
    status,
    accepts_referrals,
    stop_reason,
    status_note,
    status_updated_at,
    status_updated_by,
  };
}

function attachCourseFull(course: any) {
  return attachCourseLifecycle(attachCourseBenefits(course));
}

// Persistent companion storage for Profile Tax Codes (P2)
// Tuyệt đối không ghi mã số thuế vào console log
const TAX_CODES_FILE = path.join(__dirname, 'data', 'profile_tax_codes.json');

function loadTaxCodes(): Record<string, string> {
  try {
    if (fs.existsSync(TAX_CODES_FILE)) {
      return JSON.parse(fs.readFileSync(TAX_CODES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[TAX CODES STORE LOAD WARN]', (e as any)?.message);
  }
  return {};
}

function saveTaxCode(userId: string, taxCode: string | null) {
  try {
    const dir = path.dirname(TAX_CODES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const all = loadTaxCodes();
    if (taxCode && String(taxCode).trim() !== '') {
      all[userId] = String(taxCode).trim();
    } else {
      delete all[userId];
    }
    fs.writeFileSync(TAX_CODES_FILE, JSON.stringify(all, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[TAX CODES STORE SAVE WARN]', (e as any)?.message);
  }
}

function getStoredTaxCode(userId?: string | null): string | null {
  if (!userId) return null;
  const all = loadTaxCodes();
  return all[userId] || null;
}

const EXTENDED_PROFILES_FILE = path.join(__dirname, 'data', 'user_extended_profiles.json');

function loadExtendedProfiles(): Record<string, any> {
  try {
    if (fs.existsSync(EXTENDED_PROFILES_FILE)) {
      return JSON.parse(fs.readFileSync(EXTENDED_PROFILES_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveExtendedProfiles(data: Record<string, any>) {
  try {
    const dir = path.dirname(EXTENDED_PROFILES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EXTENDED_PROFILES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global error handler for payload too large
  app.use((err: any, req: Request, res: Response, next: any) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        success: false,
        error: 'Dung lượng dữ liệu tải lên vượt quá giới hạn cho phép (tối đa 5 MB cho tệp ảnh).',
      });
    }
    next(err);
  });

  await initDatabase();

  // ----------------------------------------------------------------------------
  // AUTH SIMULATION & SESSION ENDPOINTS
  // ----------------------------------------------------------------------------
  app.get('/api/v1/auth/me', (req: Request, res: Response) => {
    if (demoState.currentRole === 'public') {
      return res.json({
        success: true,
        data: {
          role: 'public',
          user: null,
          affiliate: null,
        },
      });
    }

    if (demoState.currentUser) {
      return res.json({
        success: true,
        data: {
          role: demoState.currentRole,
          user: demoState.currentUser,
          affiliate: demoState.currentAffiliate,
        },
      });
    }

    let userProfile: any = null;
    let affiliateProfile: any = null;

    if (demoState.currentRole === 'affiliate_pending') {
      userProfile = {
        id: demoState.pendingAffiliate.user_id,
        email: demoState.pendingAffiliate.email,
        full_name: demoState.pendingAffiliate.full_name,
        phone: demoState.pendingAffiliate.phone,
        role: 'affiliate',
        is_active: true,
      };
      affiliateProfile = demoState.pendingAffiliate;
    } else if (demoState.currentRole === 'affiliate_active') {
      userProfile = {
        id: demoState.activeAffiliate.user_id,
        email: demoState.activeAffiliate.email,
        full_name: demoState.activeAffiliate.full_name,
        phone: demoState.activeAffiliate.phone,
        role: 'affiliate',
        is_active: true,
      };
      affiliateProfile = demoState.activeAffiliate;
    } else if (demoState.currentRole === 'staff') {
      userProfile = demoState.staffUser;
    } else if (demoState.currentRole === 'admin') {
      userProfile = demoState.adminUser;
    }

    res.json({
      success: true,
      data: {
        role: demoState.currentRole,
        user: userProfile,
        affiliate: affiliateProfile,
      },
    });
  });

  app.post('/api/v1/auth/switch-demo', (req: Request, res: Response) => {
    const { role } = req.body;
    if (['public', 'affiliate_pending', 'affiliate_active', 'staff', 'admin'].includes(role)) {
      demoState.currentRole = role;
      console.log(`[DEMO SWITCHER] Changed current session role to: ${role}`);
      return res.json({ success: true, role: demoState.currentRole });
    }
    res.status(400).json({ success: false, error: 'Vai trò demo không hợp lệ' });
  });

  // ----------------------------------------------------------------------------
  // M1.2: XỬ LÝ ĐĂNG KÝ TÀI KHOẢN AUTH VÀ HỒ SƠ CTV (DB-C CONTRACT)
  // ----------------------------------------------------------------------------
  const handleRegister = async (req: Request, res: Response) => {
    const {
      full_name,
      email,
      phone,
      password,
      confirm_password,
      terms_accepted,
      id_card_number,
      id_card_issued_date,
      occupation,
      address,
      bank_account_number,
      bank_name,
    } = req.body;

    // 0. Kiểm tra tính hợp lệ của Ngày cấp CCCD, Số tài khoản, Ngân hàng nếu có gửi lên
    let cleanIssuedDate: string | null = null;
    if (id_card_issued_date) {
      const dateStr = String(id_card_issued_date).trim();
      const parsedDate = new Date(dateStr);
      const now = new Date();
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không hợp lệ.' });
      }
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const issuedOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
      if (issuedOnly > today) {
        return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không thể lớn hơn ngày hiện tại.' });
      }
      cleanIssuedDate = dateStr.slice(0, 10);
    }

    let cleanBankAcc: string | null = null;
    if (bank_account_number !== undefined && bank_account_number !== null) {
      const bankStr = String(bank_account_number).trim();
      if (bankStr) {
        if (bankStr.length > 50) {
          return res.status(400).json({ success: false, error: 'Số tài khoản ngân hàng không được vượt quá 50 ký tự.' });
        }
        cleanBankAcc = bankStr;
      }
    }

    let cleanBankName: string | null = null;
    if (bank_name) {
      const bName = String(bank_name).trim();
      if (bName) {
        if (bName.length > 150) {
          return res.status(400).json({ success: false, error: 'Tên ngân hàng không được vượt quá 150 ký tự.' });
        }
        cleanBankName = bName;
      }
    }

    // 1. Kiểm tra họ và tên ở phía xử lý tin cậy
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập họ và tên của bạn.' });
    }
    const cleanFullName = full_name.trim();
    if (cleanFullName.split(/\s+/).length < 2) {
      return res.status(400).json({ success: false, error: 'Họ và tên phải bao gồm đầy đủ cả họ và tên.' });
    }

    // 2. Kiểm tra số điện thoại (Định dạng VN 10 chữ số)
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập số điện thoại liên hệ.' });
    }
    const cleanPhone = phone.trim().replace(/\s/g, '');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ (phải có 10 chữ số, ví dụ 0901234567).' });
    }

    // 3. Kiểm tra địa chỉ email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập địa chỉ email đăng nhập.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Địa chỉ email không đúng định dạng.' });
    }

    // 4. Kiểm tra mật khẩu và xác nhận mật khẩu
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Vui lòng đặt mật khẩu tài khoản.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
    }
    if (confirm_password !== undefined && confirm_password !== password) {
      return res.status(400).json({ success: false, error: 'Mật khẩu xác nhận không khớp.' });
    }

    // 5. Kiểm tra đồng ý điều khoản
    if (terms_accepted !== true && terms_accepted !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Bạn cần đồng ý với Quy chế CTV và Chính sách bảo vệ dữ liệu của Trường Saigontourist.',
      });
    }

    // 6. Kiểm tra trùng lặp email và số điện thoại trong CSDL
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Địa chỉ email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.',
        });
      }

      const { data: existingPhone } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          error: 'Số điện thoại này đã được sử dụng cho một tài khoản CTV khác.',
        });
      }
    } catch (err: any) {
      console.warn('[AUTH PRE-CHECK ERROR]', err?.message);
    }

    // 7. QUY TẮC BẢO MẬT & CHỐNG LEO THANG ĐẶC QUYỀN (Privilege Escalation Defense):
    // Tuyệt đối không chuyển role, status, hoặc affiliate_code từ client sang metadata.
    // Dữ liệu chỉ chứa thông tin cá nhân cần thiết.
    const userMetadata = {
      full_name: cleanFullName,
      phone: cleanPhone,
      id_card_number: id_card_number ? String(id_card_number).trim() : null,
      id_card_issued_date: cleanIssuedDate,
      occupation: occupation ? String(occupation).trim() : null,
      address: address ? String(address).trim() : null,
      bank_account_number: cleanBankAcc,
      bank_name: cleanBankName,
    };

    // 8. Đăng ký tài khoản qua Supabase Auth
    let authUser: any = null;
    let requiresEmailConfirmation = false;
    const appUrl = process.env.APP_URL || (req.headers.origin as string) || 'http://localhost:3000';
    const emailRedirectTo = `${appUrl}/login`;

    try {
      const { data: signUpData, error: signUpErr } = await supabaseAuth.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: userMetadata,
          emailRedirectTo,
        },
      });

      if (signUpErr) {
        if (signUpErr.status === 429 || signUpErr.message?.includes('rate limit') || signUpErr.message?.includes('Email rate limit')) {
          console.warn('[AUTH] signUp hit SMTP rate limit (429):', signUpErr.message);
          return res.status(429).json({
            success: false,
            error: 'Hệ thống gửi email xác thực đang tạm quá tải (Rate Limit). Vui lòng thử lại sau ít phút hoặc sử dụng email khác.',
          });
        }

        const isAlreadyRegistered = signUpErr.message?.includes('already registered') || signUpErr.status === 400;
        return res.status(400).json({
          success: false,
          error: isAlreadyRegistered
            ? 'Địa chỉ email này đã được đăng ký tài khoản trong hệ thống. Vui lòng đăng nhập hoặc sử dụng chức năng quên mật khẩu.'
            : signUpErr.message || 'Đăng ký tài khoản không thành công.',
        });
      }

      authUser = signUpData.user;
      requiresEmailConfirmation = !authUser?.confirmed_at && !signUpData.session;

      if (signUpData.session) {
        try {
          await supabaseAuth.auth.signOut();
        } catch (_) {}
      }

      if (!authUser || !authUser.id) {
        return res.status(500).json({
          success: false,
          error: 'Đăng ký không hoàn tất. Máy chủ xác thực không trả về mã định danh người dùng.',
        });
      }

      // 9. Xác nhận Trigger DB-C đã tự động tạo đúng profiles và affiliate_profiles.
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_active')
        .eq('id', authUser.id)
        .maybeSingle();

      if (pErr) {
        console.error('[AUTH REGISTER SQL ERROR] Query profiles failed:', pErr);
        return res.status(500).json({
          success: false,
          error: 'Lỗi hệ thống khi khởi tạo hồ sơ người dùng. Vui lòng liên hệ quản trị viên.',
        });
      }

      const { data: affProfile, error: aErr } = await supabase
        .from('affiliate_profiles')
        .select('id, user_id, affiliate_code, status, created_at')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (aErr) {
        console.error('[AUTH REGISTER SQL ERROR] Query affiliate_profiles failed:', aErr);
        return res.status(500).json({
          success: false,
          error: 'Lỗi hệ thống khi khởi tạo hồ sơ cộng tác viên. Vui lòng liên hệ quản trị viên.',
        });
      }

      if (!profile || !affProfile) {
        console.error('[AUTH REGISTER] Missing profile or affiliate_profile for user_id:', authUser.id);
        return res.status(500).json({
          success: false,
          error: 'Hồ sơ CTV chưa được tạo tự động bởi hệ thống cơ sở dữ liệu. Vui lòng liên hệ quản trị viên.',
        });
      }

      // Cập nhật các trường bổ sung vào CSDL nếu có
      const extraFields: any = {};
      if (cleanIssuedDate) extraFields.id_card_issued_date = cleanIssuedDate;
      if (cleanBankAcc) extraFields.bank_account_number = cleanBankAcc;
      if (cleanBankName) extraFields.bank_name = cleanBankName;
      if (Object.keys(extraFields).length > 0) {
        try {
          await supabase.from('affiliate_profiles').update(extraFields).eq('user_id', authUser.id);
        } catch (dbErr: any) {
          console.warn('[AUTH REGISTER] Notice: columns might be pending migration:', dbErr?.message);
        }
      }

      // Cập nhật session tạm thời trong demoState
      demoState.pendingAffiliate = {
        id: affProfile.id,
        user_id: authUser.id,
        full_name: profile.full_name,
        email: cleanEmail,
        phone: profile.phone,
        affiliate_code: affProfile.affiliate_code,
        status: affProfile.status,
        id_card_number: userMetadata.id_card_number || '',
        id_card_issued_date: cleanIssuedDate || '',
        occupation: userMetadata.occupation || '',
        address: userMetadata.address || '',
        bank_account_number: cleanBankAcc || '',
        bank_name: cleanBankName || '',
        created_at: affProfile.created_at,
      };

      return res.status(201).json({
        success: true,
        requires_email_confirmation: requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập. Tài khoản đang chờ trường duyệt.'
          : 'Đăng ký thành công. Vui lòng đăng nhập. Tài khoản đang chờ trường duyệt.',
        data: {
          user_id: authUser.id,
          email: cleanEmail,
          full_name: profile.full_name,
          phone: profile.phone,
          role: profile.role,
          affiliate_code: affProfile.affiliate_code,
          status: affProfile.status,
        },
      });
    } catch (err: any) {
      console.error('[AUTH REGISTER EXCEPTION]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Lỗi kết nối máy chủ xác thực.',
      });
    }
  };

  app.post('/api/v1/auth/register', handleRegister);
  app.post('/api/v1/auth/register-affiliate', handleRegister);

  app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. Kiểm tra các trường bắt buộc
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập địa chỉ email.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Địa chỉ email không đúng định dạng.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu.' });
    }

    // 2. Thử xác thực với Supabase Auth
    let authUser: any = null;
    let authError: any = null;

    try {
      const { data: signInData, error: signInErr } = await supabaseAuth.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (signInErr) {
        authError = signInErr;
      } else {
        authUser = signInData?.user;
      }
    } catch (netErr: any) {
      console.error('[AUTH LOGIN NETWORK ERROR]');
      return res.status(500).json({
        success: false,
        error: 'Không thể kết nối, vui lòng thử lại.',
      });
    }

    // 3. Xử lý lỗi từ Supabase Auth hoặc kiểm tra tài khoản kiểm thử
    if (authError) {
      // Trường hợp: Email chưa xác nhận
      if (
        authError.code === 'email_not_confirmed' ||
        authError.message?.toLowerCase().includes('email not confirmed')
      ) {
        return res.status(403).json({
          success: false,
          error: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư để xác nhận trước khi đăng nhập.',
          code: 'EMAIL_NOT_CONFIRMED',
        });
      }

      // Kiểm tra danh sách tài khoản kiểm thử sẵn có trong hệ thống
      const isDemoActive =
        cleanEmail === demoState.activeAffiliate.email.toLowerCase() || cleanEmail === 'ctv_active@sthc.edu.vn';
      const isDemoPending =
        cleanEmail === demoState.pendingAffiliate.email.toLowerCase() ||
        cleanEmail === 'ctv_cho_duyet@sthc.edu.vn' ||
        cleanEmail === 'ctv_pending@sthc.edu.vn';
      const isDemoSuspended = cleanEmail === demoState.suspendedAffiliate.email.toLowerCase();
      const isDemoRejected = cleanEmail === demoState.rejectedAffiliate.email.toLowerCase();
      const isDemoDisabled = cleanEmail === demoState.disabledUser.email.toLowerCase();
      const isDemoStaff = cleanEmail === demoState.staffUser.email.toLowerCase();
      const isDemoAdmin = cleanEmail === demoState.adminUser.email.toLowerCase();

      const isAnyDemo =
        isDemoActive ||
        isDemoPending ||
        isDemoSuspended ||
        isDemoRejected ||
        isDemoDisabled ||
        isDemoStaff ||
        isDemoAdmin;

      // Mật khẩu demo hợp lệ
      const validDemoPasswords = ['123456', '123', 'Password123!', 'Pass@123'];

      if (!isAnyDemo || !validDemoPasswords.includes(password)) {
        return res.status(401).json({
          success: false,
          error: 'Email hoặc mật khẩu không đúng.',
          code: 'INVALID_CREDENTIALS',
        });
      }
    }

    // 4. Lấy hồ sơ người dùng từ hệ thống (DB hoặc demo state)
    try {
      let dbProfile: any = null;
      let dbAff: any = null;

      // Ưu tiên tra cứu database theo ID người dùng xác thực hoặc theo email
      if (authUser?.id) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        dbProfile = p;

        if (dbProfile) {
          const { data: a } = await supabase
            .from('affiliate_profiles')
            .select('*')
            .eq('user_id', dbProfile.id)
            .maybeSingle();
          dbAff = a;
        }
      } else {
        const { data: p } = await supabase.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
        dbProfile = p;

        if (dbProfile) {
          const { data: a } = await supabase
            .from('affiliate_profiles')
            .select('*')
            .eq('user_id', dbProfile.id)
            .maybeSingle();
          dbAff = a;
        }
      }



      // Fallback nạp thông tin tài khoản kiểm thử nếu chưa có trong DB Supabase
      if (!dbProfile) {
        if (
          cleanEmail === demoState.activeAffiliate.email.toLowerCase() ||
          cleanEmail === 'ctv_active@sthc.edu.vn'
        ) {
          dbProfile = {
            id: demoState.activeAffiliate.user_id,
            email: demoState.activeAffiliate.email,
            full_name: demoState.activeAffiliate.full_name,
            phone: demoState.activeAffiliate.phone,
            role: 'affiliate',
            is_active: true,
          };
          dbAff = demoState.activeAffiliate;
        } else if (
          cleanEmail === demoState.pendingAffiliate.email.toLowerCase() ||
          cleanEmail === 'ctv_cho_duyet@sthc.edu.vn' ||
          cleanEmail === 'ctv_pending@sthc.edu.vn'
        ) {
          dbProfile = {
            id: demoState.pendingAffiliate.user_id,
            email: demoState.pendingAffiliate.email,
            full_name: demoState.pendingAffiliate.full_name,
            phone: demoState.pendingAffiliate.phone,
            role: 'affiliate',
            is_active: true,
          };
          dbAff = demoState.pendingAffiliate;
        } else if (cleanEmail === demoState.suspendedAffiliate.email.toLowerCase()) {
          dbProfile = {
            id: demoState.suspendedAffiliate.user_id,
            email: demoState.suspendedAffiliate.email,
            full_name: demoState.suspendedAffiliate.full_name,
            phone: demoState.suspendedAffiliate.phone,
            role: 'affiliate',
            is_active: true,
          };
          dbAff = demoState.suspendedAffiliate;
        } else if (cleanEmail === demoState.rejectedAffiliate.email.toLowerCase()) {
          dbProfile = {
            id: demoState.rejectedAffiliate.user_id,
            email: demoState.rejectedAffiliate.email,
            full_name: demoState.rejectedAffiliate.full_name,
            phone: demoState.rejectedAffiliate.phone,
            role: 'affiliate',
            is_active: true,
          };
          dbAff = demoState.rejectedAffiliate;
        } else if (cleanEmail === demoState.disabledUser.email.toLowerCase()) {
          dbProfile = demoState.disabledUser;
          dbAff = null;
        } else if (cleanEmail === demoState.staffUser.email.toLowerCase()) {
          dbProfile = demoState.staffUser;
          dbAff = null;
        } else if (cleanEmail === demoState.adminUser.email.toLowerCase()) {
          dbProfile = demoState.adminUser;
          dbAff = null;
        }
      }

      // Kiểm tra sự tồn tại của hồ sơ
      if (!dbProfile) {
        return res.status(404).json({
          success: false,
          error: 'Hồ sơ người dùng không tồn tại trong hệ thống. Vui lòng thử lại hoặc liên hệ quản trị viên.',
        });
      }

      // Kiểm tra tài khoản có bị vô hiệu hóa không (is_active === false)
      if (dbProfile.is_active === false) {
        return res.status(403).json({
          success: false,
          error: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Ban Tuyển sinh Nhà trường để được hỗ trợ.',
          is_disabled: true,
        });
      }

      // Phân quyền và xác định trạng thái CTV theo dữ liệu hệ thống
      let targetRole: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin' = 'affiliate_pending';
      let affiliateStatus = dbAff?.status || 'PENDING_REVIEW';

      if (dbProfile.role === 'admin') {
        targetRole = 'admin';
      } else if (dbProfile.role === 'staff') {
        targetRole = 'staff';
      } else if (dbProfile.role === 'affiliate') {
        if (affiliateStatus === 'ACTIVE') {
          targetRole = 'affiliate_active';
        } else {
          // PENDING_REVIEW, SUSPENDED, REJECTED
          targetRole = 'affiliate_pending';
        }
      }

      // Lưu trạng thái phiên làm việc trên server
      demoState.currentUser = dbProfile;
      demoState.currentAffiliate = dbAff;
      demoState.currentRole = targetRole;

      return res.json({
        success: true,
        message: 'Đăng nhập thành công.',
        data: {
          role: targetRole,
          user: dbProfile,
          affiliate: dbAff,
          affiliate_status: affiliateStatus,
        },
      });
    } catch (err: any) {
      console.error('[LOGIN POST-CHECK ERROR]', err?.message);
      return res.status(500).json({
        success: false,
        error: 'Không thể kết nối hoặc đọc hồ sơ người dùng. Vui lòng thử lại.',
      });
    }
  });

  app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
    demoState.currentRole = 'public';
    demoState.currentUser = null;
    demoState.currentAffiliate = null;
    res.json({ success: true, message: 'Đã đăng xuất tài khoản thành công.' });
  });

  app.post('/api/v1/auth/resend-verification', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp địa chỉ email.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    try {
      const appUrl = process.env.APP_URL || (req.headers.origin as string) || 'http://localhost:3000';
      const { error } = await supabaseAuth.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${appUrl}/login`,
        },
      });
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message || 'Không thể gửi lại email xác nhận.',
        });
      }
      return res.json({
        success: true,
        message: 'Đã gửi lại email xác nhận thành công. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác / spam).',
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Lỗi máy chủ khi gửi lại email xác nhận.',
      });
    }
  });

  // ----------------------------------------------------------------------------
  // E1 – PUBLIC ENDPOINTS (Danh mục khóa học & Đăng ký tư vấn)
  // ----------------------------------------------------------------------------
  // E1 – PUBLIC ENDPOINTS (Danh mục khóa học & Đăng ký tư vấn)
  // ----------------------------------------------------------------------------
  app.get('/api/v1/public/courses', async (req: Request, res: Response) => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .order('sort_order', { ascending: true });

      const rawCourses = (!error && courses && courses.length > 0) ? courses : INITIAL_COURSES;
      // Chỉ hiển thị các khóa học đã công khai (is_active = true, loại bỏ DRAFT)
      const publicCourses = rawCourses
        .map(attachCourseFull)
        .filter(c => c.is_active);

      res.json({ success: true, data: publicCourses });
    } catch (err: any) {
      const publicCourses = INITIAL_COURSES
        .map(attachCourseFull)
        .filter(c => c.is_active);
      res.json({ success: true, data: publicCourses });
    }
  });

  app.get('/api/v1/public/courses/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      const target = course || INITIAL_COURSES.find(c => c.slug === slug);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      }

      const fullCourse = attachCourseFull(target);

      // Nếu là bản nháp / chưa công khai: chặn khách xem bằng cách đoán ID/slug (Yêu cầu A2.4)
      if (!fullCourse.is_active) {
        return res.status(404).json({
          success: false,
          error: 'Khóa học này hiện chưa được công khai trên hệ thống.',
        });
      }

      // Khóa học công khai (kể cả đang ngừng giới thiệu) vẫn mở được nội dung qua link cũ
      res.json({ success: true, data: fullCourse });
    } catch (err: any) {
      const target = INITIAL_COURSES.find(c => c.slug === slug);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      }
      const fullCourse = attachCourseFull(target);
      if (!fullCourse.is_active) {
        return res.status(404).json({ success: false, error: 'Khóa học này hiện chưa được công khai.' });
      }
      res.json({ success: true, data: fullCourse });
    }
  });

  // Helper dùng chung kiểm tra điều kiện CTV được giới thiệu (Yêu cầu A1.4)
  // Backend đọc trạng thái có hiệu lực từ CSDL hoặc state máy chủ thực tế
  const checkAffiliateReferralEligibility = async (identifier: { id?: string; code?: string }): Promise<{
    eligible: boolean;
    status: string;
    affiliate?: any;
    error_message?: string;
  }> => {
    // 1. Kiểm tra demo accounts
    const demoAccounts = [
      demoState.activeAffiliate,
      demoState.suspendedAffiliate,
      demoState.pendingAffiliate,
      demoState.pendingVerifiedAffiliate,
      demoState.rejectedAffiliate,
    ];

    const matchedDemo = demoAccounts.find(a => 
      (identifier.id && a.id === identifier.id) ||
      (identifier.code && a.affiliate_code.toUpperCase() === identifier.code.toUpperCase())
    );

    if (matchedDemo) {
      if (matchedDemo.status === 'SUSPENDED') {
        return {
          eligible: false,
          status: 'SUSPENDED',
          affiliate: matchedDemo,
          error_message: 'Mã giới thiệu của Cộng tác viên hiện đang tạm ngưng tiếp nhận đăng ký tư vấn mới. Vui lòng liên hệ trực tiếp Ban Tuyển sinh Trường Saigontourist để được hỗ trợ.',
        };
      }
      if (matchedDemo.status !== 'ACTIVE') {
        return {
          eligible: false,
          status: matchedDemo.status,
          affiliate: matchedDemo,
          error_message: 'Mã giới thiệu của Cộng tác viên chưa được kích hoạt quyền giới thiệu.',
        };
      }
      return {
        eligible: true,
        status: 'ACTIVE',
        affiliate: matchedDemo,
      };
    }

    // 2. Tra cứu từ CSDL Supabase
    try {
      let query = supabase.from('affiliate_profiles').select('id, user_id, affiliate_code, status');
      if (identifier.id) {
        query = query.eq('id', identifier.id);
      } else if (identifier.code) {
        query = query.eq('affiliate_code', identifier.code);
      }
      const { data: dbAff, error } = await query.maybeSingle();

      if (error || !dbAff) {
        return {
          eligible: false,
          status: 'NOT_FOUND',
          error_message: 'Không tìm thấy hồ sơ Cộng tác viên.',
        };
      }

      if (dbAff.status === 'SUSPENDED') {
        return {
          eligible: false,
          status: 'SUSPENDED',
          affiliate: dbAff,
          error_message: 'Mã giới thiệu của Cộng tác viên hiện đang tạm ngưng tiếp nhận đăng ký tư vấn mới. Vui lòng liên hệ trực tiếp Ban Tuyển sinh Trường Saigontourist để được hỗ trợ.',
        };
      }

      if (dbAff.status !== 'ACTIVE') {
        return {
          eligible: false,
          status: dbAff.status,
          affiliate: dbAff,
          error_message: 'Mã giới thiệu của Cộng tác viên chưa được kích hoạt quyền giới thiệu.',
        };
      }

      return {
        eligible: true,
        status: 'ACTIVE',
        affiliate: dbAff,
      };
    } catch (err: any) {
      return {
        eligible: false,
        status: 'ERROR',
        error_message: 'Lỗi kiểm tra quyền CTV.',
      };
    }
  };

  // POST /api/v1/public/leads (Người học tự gửi form tư vấn, không hỏi CCCD, bảo vệ dữ liệu PII)
  app.post('/api/v1/public/leads', async (req: Request, res: Response) => {
    const {
      full_name,
      phone,
      email,
      province,
      course_id,
      preferred_contact_time,
      customer_note,
      consent_accepted,
      ref_code,
      utm_source,
      utm_medium,
      utm_campaign,
    } = req.body;

    // 1. Kiểm tra chấp thuận Nghị định 13/2023/NĐ-CP
    if (!consent_accepted) {
      return res.status(400).json({
        success: false,
        error: 'Bạn phải đồng ý với Chính sách bảo vệ dữ liệu cá nhân của Trường Saigontourist để gửi yêu cầu.',
      });
    }

    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng điền đầy đủ Họ tên và Số điện thoại liên hệ.',
      });
    }

    const cleanPhone = phone.trim().replace(/[\s\.\-]/g, '');
    let assignedAffiliateId: string | null = null;
    let capturedCode: string | null = null;

    // 1.1 Kiểm tra trạng thái công khai và tiếp nhận đăng ký của khóa học (Yêu cầu A2.4)
    if (course_id) {
      let targetCourse: any = null;
      try {
        const { data: dbCourse } = await supabase
          .from('courses')
          .select('*')
          .or(`id.eq.${course_id},code.eq.${course_id}`)
          .maybeSingle();
        if (dbCourse) {
          targetCourse = attachCourseFull(dbCourse);
        }
      } catch (dbErr) {
        // Fallback
      }

      if (!targetCourse) {
        const fb = INITIAL_COURSES.find(c => (c as any).id === course_id || c.code === course_id || c.slug === course_id);
        if (fb) targetCourse = attachCourseFull(fb);
      }

      if (targetCourse) {
        if (!targetCourse.is_active) {
          return res.status(400).json({
            success: false,
            error: 'Khóa học này hiện chưa được công khai. Không thể tiếp nhận đăng ký tuyển sinh.',
            code: 'COURSE_NOT_PUBLISHED',
          });
        }
        if (!targetCourse.accepts_referrals) {
          return res.status(400).json({
            success: false,
            error: 'Khóa học hiện ngừng nhận đăng ký tuyển sinh. Vui lòng chọn ngành học khác hoặc liên hệ Ban Tuyển sinh STHC để được hỗ trợ.',
            code: 'COURSE_REFERRAL_STOPPED',
          });
        }
      }
    }

    // 2. Tra cứu mã giới thiệu CTV và kiểm tra quyền giới thiệu
    if (ref_code) {
      const cleanRef = String(ref_code).trim();
      capturedCode = cleanRef;

      const eligibility = await checkAffiliateReferralEligibility({ code: cleanRef });
      if (!eligibility.eligible) {
        if (eligibility.status === 'SUSPENDED') {
          // BẢO VỆ CHÍNH SÁCH A1.4: Không ghi nhận lượt mới, hiển thị thông báo rõ ràng, không chuyển sang CTV khác
          return res.status(400).json({
            success: false,
            error: eligibility.error_message || 'Mã giới thiệu của Cộng tác viên hiện đang tạm ngưng tiếp nhận đăng ký tư vấn mới. Vui lòng liên hệ trực tiếp Ban Tuyển sinh Trường Saigontourist để được hỗ trợ.',
            code: 'AFFILIATE_SUSPENDED',
          });
        }
        if (eligibility.status === 'PENDING_REVIEW' || eligibility.status === 'REJECTED') {
          return res.status(400).json({
            success: false,
            error: 'Mã giới thiệu của Cộng tác viên chưa được kích hoạt quyền giới thiệu. Vui lòng liên hệ Ban Tuyển sinh STHC.',
            code: 'AFFILIATE_NOT_ACTIVE',
          });
        }
      } else if (eligibility.affiliate) {
        assignedAffiliateId = eligibility.affiliate.id;
      }
    }

    // 3. Kiểm tra chống trùng số điện thoại trong 90 ngày (Attribution Policy)
    let isDuplicate = false;
    let duplicateReason: string | null = null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, created_at, affiliate_id')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      isDuplicate = true;
      duplicateReason = 'Số điện thoại đã gửi thông tin đăng ký tư vấn trong vòng 90 ngày.';
      if (existingLead.affiliate_id) {
        assignedAffiliateId = existingLead.affiliate_id; // Giữ nguyên nguồn CTV ban đầu
      }
    }

    // 4. Lưu Lead vào CSDL
    const leadPayload = {
      full_name: full_name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : null,
      province: province || 'TP. Hồ Chí Minh',
      course_id: course_id || null,
      affiliate_id: assignedAffiliateId,
      affiliate_code_captured: capturedCode,
      counseling_status: 'NEW',
      reconciliation_status: 'NOT_RECONCILED',
      reward_status: 'NONE',
      is_duplicate: isDuplicate,
      duplicate_reason: duplicateReason,
      consent_accepted: true,
      preferred_contact_time: preferred_contact_time || 'Giờ hành chính (08h - 17h)',
      customer_note: customer_note || null,
      utm_source: utm_source || 'direct',
      utm_medium: utm_medium || (ref_code ? 'affiliate_link' : 'organic'),
      utm_campaign: utm_campaign || 'tuyensinh_2026',
    };

    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadPayload)
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[LEAD INSERT ERROR]', insertError.message);
      // Fallback: Return success to candidate so UX is uninterrupted
    }

    // BẢO MẬT PII: Tuyệt đối không echo ngược lại họ tên, số điện thoại hay email trong response
    res.status(201).json({
      success: true,
      message: 'Đăng ký tư vấn thành công! Ban Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist sẽ liên hệ tư vấn trong thời gian sớm nhất.',
      appointment_code: `STHC-TS-${Math.floor(100000 + Math.random() * 900000)}`,
      received_at: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------------------------------
  // E2 – AFFILIATE PORTAL (Bố cục Tâm Trí Lực, che SĐT 4 số cuối)
  // ----------------------------------------------------------------------------
  // Middleware kiểm tra quyền CTV
  const requireActiveAffiliate = (req: Request, res: Response, next: NextFunction) => {
    if (demoState.currentRole === 'affiliate_pending') {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản Cộng tác viên của bạn đang ở trạng thái CHỜ DUYỆT (PENDING_REVIEW). Vui lòng đợi Ban Tuyển sinh phê duyệt hồ sơ trước khi truy cập link tiếp thị và dữ liệu.',
        affiliate_status: 'PENDING_REVIEW',
      });
    }

    if (demoState.currentRole !== 'affiliate_active' && demoState.currentRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Yêu cầu đăng nhập tài khoản Cộng tác viên hoạt động (ACTIVE).',
      });
    }
    next();
  };

  app.get('/api/v1/affiliate/dashboard', requireActiveAffiliate, async (req: Request, res: Response) => {
    const affiliateId = demoState.activeAffiliate.id;

    // Lấy số liệu leads của CTV
    const { data: leads } = await supabase
      .from('leads')
      .select('id, reconciliation_status, reward_status')
      .eq('affiliate_id', affiliateId);

    const { data: rewards } = await supabase
      .from('rewards')
      .select('amount, status')
      .eq('affiliate_id', affiliateId);

    const totalReferred = (leads?.length || 0) + 3; // + mock seed
    const enrolledValid = (leads?.filter(l => l.reconciliation_status === 'MATCHED_VALID').length || 0) + 2;
    const pendingRewardsCount = (leads?.filter(l => l.reward_status === 'PENDING_APPROVAL').length || 0) + 1;
    const approvedRewardsCount = (leads?.filter(l => l.reward_status === 'APPROVED').length || 0) + 1;

    const pendingAmount = rewards && rewards.length > 0
      ? rewards.filter(r => r.status === 'PENDING_APPROVAL').reduce((sum, r) => sum + (r.amount || 500000), 0)
      : pendingRewardsCount * 500000;

    const approvedAmount = rewards && rewards.length > 0
      ? rewards.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + (r.amount || 500000), 0)
      : approvedRewardsCount * 500000;

    const currentAff = demoState.activeAffiliate;

    res.json({
      success: true,
      data: {
        affiliate_code: currentAff.affiliate_code,
        affiliate_status: currentAff.status,
        full_name: currentAff.full_name,
        suspension_reason: currentAff.status === 'SUSPENDED' ? currentAff.suspension_reason : undefined,
        metrics: {
          total_leads_referred: totalReferred,
          enrolled_valid_leads: enrolledValid,
          pending_reward_count: pendingRewardsCount,
          pending_reward_amount: pendingAmount,
          approved_reward_count: approvedRewardsCount,
          approved_reward_amount: approvedAmount,
        },
      },
    });
  });

  app.get('/api/v1/affiliate/courses', requireActiveAffiliate, async (req: Request, res: Response) => {
    // Kiểm tra quyền giới thiệu của CTV có hiệu lực (Yêu cầu A1.4)
    if (demoState.activeAffiliate.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản Cộng tác viên của bạn hiện đang bị TẠM NGƯNG quyền giới thiệu. Các chức năng lấy link và mã QR tiếp thị tuyển sinh bị tạm khóa. Vui lòng liên hệ Ban Tuyển sinh để được hỗ trợ.',
        affiliate_status: 'SUSPENDED',
      });
    }

    const code = demoState.activeAffiliate.affiliate_code;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const rawCourseList = courses && courses.length > 0 ? courses : INITIAL_COURSES;
    // BẢO MẬT & QUY TẮC A2.4: Khóa học trong danh sách của CTV phải ĐANG CÔNG KHAI VÀ ĐANG NHẬN GIỚI THIỆU
    const activeReferralCourses = rawCourseList
      .map(attachCourseFull)
      .filter(c => c.is_active && c.accepts_referrals);

    const data = activeReferralCourses.map(c => {
      const referralUrl = `${baseUrl}/?ref=${code}&course=${c.slug}`;
      return {
        ...c,
        referral_url: referralUrl,
        affiliate_code: code,
      };
    });

    res.json({ success: true, data });
  });

  // GET /api/v1/affiliate/courses/:courseId (Chi tiết khóa học cho CTV)
  app.get('/api/v1/affiliate/courses/:courseId', requireActiveAffiliate, async (req: Request, res: Response) => {
    if (demoState.activeAffiliate.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'Tài khoản Cộng tác viên của bạn hiện đang bị TẠM NGƯNG quyền giới thiệu.',
        affiliate_status: 'SUSPENDED',
      });
    }

    const { courseId } = req.params;
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      return res.status(400).json({ success: false, error: 'Mã định danh khóa học không hợp lệ.' });
    }

    const cleanId = courseId.trim();
    const code = demoState.activeAffiliate.affiliate_code;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    try {
      let course: any = null;
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
      let query = supabase.from('courses').select('*');
      if (isUUID) {
        query = query.or(`id.eq.${cleanId},slug.eq.${cleanId},code.eq.${cleanId}`);
      } else {
        query = query.or(`slug.eq.${cleanId},code.eq.${cleanId}`);
      }
      const { data: dbCourse } = await query.maybeSingle();

      if (dbCourse) {
        course = dbCourse;
      } else {
        course = INITIAL_COURSES.find(c => (c as any).id === cleanId || c.slug === cleanId || c.code === cleanId);
      }

      if (!course) {
        return res.status(404).json({ success: false, error: 'Khóa học không tồn tại.' });
      }

      const fullCourse = attachCourseFull(course);

      if (!fullCourse.is_active || !fullCourse.accepts_referrals) {
        return res.status(404).json({ success: false, error: 'Khóa học không tồn tại hoặc không còn được công khai.' });
      }

      const referralUrl = `${baseUrl}/?ref=${code}&course=${fullCourse.slug}`;
      const data = {
        ...fullCourse,
        referral_url: referralUrl,
        affiliate_code: code,
      };

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('[AFFILIATE COURSE DETAIL ERROR]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tải chi tiết khóa học.' });
    }
  });

  // GET /api/v1/affiliate/leads (BẢO MẬT: Che 4 số cuối điện thoại)
  app.get('/api/v1/affiliate/leads', requireActiveAffiliate, async (req: Request, res: Response) => {
    const affiliateId = demoState.activeAffiliate.id;

    const { data: realLeads } = await supabase
      .from('leads')
      .select('id, full_name, phone, course_id, counseling_status, reconciliation_status, reward_status, created_at')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    // Mask phone function: 0908123456 -> 090812****
    const maskPhone = (phone: string) => {
      if (!phone || phone.length < 6) return '090****';
      return phone.slice(0, -4) + '****';
    };

    const courseMap: Record<string, string> = {
      'CBMA-TC-01': 'Kỹ thuật Chế biến Món ăn Á - Âu',
      'BB-TC-02': 'Nghệ thuật Bếp bánh & Bánh ngọt Âu',
      'QTKS-TC-03': 'Quản trị Khách sạn & Khu nghỉ dưỡng',
      'LT-SC-04': 'Quản trị Lễ tân Quốc tế',
      'QTNH-TC-05': 'Quản trị Nhà hàng & Dịch vụ Ăn uống',
      'PC-SC-06': 'Nghệ thuật Pha chế Đồ uống (Bartender & Barista)',
      'HDDL-TC-07': 'Hướng dẫn Du lịch Quốc tế & Nội địa',
      'DH-TC-08': 'Quản trị Điều hành Tour & Đại lý Du lịch',
    };

    const mockSeedLeads = [
      {
        id: 'seed-lead-01',
        full_name: 'Nguyễn Hoàng Khang',
        phone_masked: '090918****',
        course_title: 'Kỹ thuật Chế biến Món ăn Á - Âu',
        counseling_status: 'CONSULTING',
        reconciliation_status: 'MATCHED_VALID',
        reward_status: 'APPROVED',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      },
      {
        id: 'seed-lead-02',
        full_name: 'Trần Mỹ Linh',
        phone_masked: '093845****',
        course_title: 'Quản trị Khách sạn & Khu nghỉ dưỡng',
        counseling_status: 'CONTACTED',
        reconciliation_status: 'MATCHED_VALID',
        reward_status: 'PENDING_APPROVAL',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      },
      {
        id: 'seed-lead-03',
        full_name: 'Phạm Đức Trọng',
        phone_masked: '091234****',
        course_title: 'Nghệ thuật Bếp bánh & Bánh ngọt Âu',
        counseling_status: 'NEW',
        reconciliation_status: 'NOT_RECONCILED',
        reward_status: 'NONE',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];

    const formattedRealLeads = (realLeads || []).map(l => ({
      id: l.id,
      full_name: l.full_name,
      phone_masked: maskPhone(l.phone),
      course_title: l.course_id ? (courseMap[l.course_id] || 'Chương trình tuyển sinh STHC') : 'Tư vấn chung',
      counseling_status: l.counseling_status,
      reconciliation_status: l.reconciliation_status,
      reward_status: l.reward_status,
      created_at: l.created_at,
    }));

    res.json({
      success: true,
      data: [...formattedRealLeads, ...mockSeedLeads],
    });
  });

  // GET /api/v1/affiliate/rewards (Danh sách thưởng 500k của CTV)
  app.get('/api/v1/affiliate/rewards', requireActiveAffiliate, async (req: Request, res: Response) => {
    const affiliateId = demoState.activeAffiliate.id;

    const { data: realRewards } = await supabase
      .from('rewards')
      .select('id, amount, status, approved_at, rejection_reason, void_reason, created_at, lead_id')
      .eq('affiliate_id', affiliateId)
      .order('created_at', { ascending: false });

    const mockSeedRewards = [
      {
        id: 'rew-01',
        amount: 500000,
        status: 'APPROVED',
        candidate_name: 'Nguyễn Hoàng Khang',
        course_title: 'Kỹ thuật Chế biến Món ăn Á - Âu',
        external_admission_code: 'STHC-2026-TS-0188',
        approved_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      },
      {
        id: 'rew-02',
        amount: 500000,
        status: 'PENDING_APPROVAL',
        candidate_name: 'Trần Mỹ Linh',
        course_title: 'Quản trị Khách sạn & Khu nghỉ dưỡng',
        external_admission_code: 'STHC-2026-TS-0215',
        approved_at: null,
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      },
    ];

    res.json({
      success: true,
      data: [...(realRewards || []), ...mockSeedRewards],
    });
  });

  // ----------------------------------------------------------------------------
  // E2.1 – CẬP NHẬT & XEM HỒ SƠ CÁ NHÂN CỦA CTV (YÊU CẦU A1.2)
  // ----------------------------------------------------------------------------
  const requireAffiliateOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (
      demoState.currentRole !== 'affiliate_active' &&
      demoState.currentRole !== 'affiliate_pending' &&
      demoState.currentRole !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Chức năng chỉ dành cho Cộng tác viên tuyển sinh hoặc Quản trị viên.',
      });
    }
    next();
  };

  // ----------------------------------------------------------------------------
  // P2: GET /api/v1/user/profile - Xem thông tin cá nhân chỉ đọc cho Admin/Staff/CTV
  // ----------------------------------------------------------------------------
  app.get('/api/v1/user/profile', async (req: Request, res: Response) => {
    try {
      // 1. Xác định người dùng từ phiên đăng nhập đã xác thực (Bearer token hoặc demo session)
      let resolvedUserId: string | null = null;
      let resolvedRole: string = 'public';
      let authUserEmailConfirmed: boolean | undefined = undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
          if (!authErr && user) {
            resolvedUserId = user.id;
            authUserEmailConfirmed = !!user.email_confirmed_at;
          }
        } catch (e) {
          // Token invalid or network error
        }
      }

      // Nếu không có Bearer token, lấy theo phiên hệ thống hiện tại
      if (!resolvedUserId) {
        if (demoState.currentUser?.id) {
          resolvedUserId = demoState.currentUser.id;
          resolvedRole = demoState.currentRole;
        } else if (demoState.currentRole === 'admin') {
          resolvedUserId = demoState.adminUser.id;
          resolvedRole = 'admin';
        } else if (demoState.currentRole === 'staff') {
          resolvedUserId = demoState.staffUser.id;
          resolvedRole = 'staff';
        } else if (demoState.currentRole === 'affiliate_active') {
          resolvedUserId = demoState.activeAffiliate.user_id;
          resolvedRole = 'affiliate';
        } else if (demoState.currentRole === 'affiliate_pending') {
          resolvedUserId = demoState.pendingAffiliate.user_id;
          resolvedRole = 'affiliate';
        }
      }

      if (!resolvedUserId || resolvedRole === 'public') {
        return res.status(401).json({
          success: false,
          error: 'Chưa đăng nhập. Vui lòng đăng nhập để xem thông tin cá nhân.',
        });
      }

      // 2. Tuyệt đối không cho phép client truyền ID để chọn đọc hồ sơ người khác
      // 3. Đọc dữ liệu từ CSDL profiles
      let dbProf: any = null;
      let dbAff: any = null;

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, avatar_url, role, is_active, created_at, updated_at')
        .eq('id', resolvedUserId)
        .maybeSingle();

      if (prof && !profErr) {
        dbProf = prof;
      } else {
        // Fallback demo state nếu tài khoản kiểm thử chưa có trong remote DB
        if (resolvedUserId === demoState.adminUser.id || resolvedRole === 'admin') {
          dbProf = {
            id: demoState.adminUser.id,
            email: demoState.adminUser.email,
            full_name: demoState.adminUser.full_name,
            phone: '0283844648',
            avatar_url: null,
            role: 'admin',
            is_active: true,
            created_at: new Date(Date.now() - 3600000 * 24 * 180).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
          };
        } else if (resolvedUserId === demoState.staffUser.id || resolvedRole === 'staff') {
          dbProf = {
            id: demoState.staffUser.id,
            email: demoState.staffUser.email,
            full_name: demoState.staffUser.full_name,
            phone: '0901889977',
            avatar_url: null,
            role: 'staff',
            is_active: true,
            created_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
            updated_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
          };
        } else if (resolvedUserId === demoState.activeAffiliate.user_id) {
          dbProf = {
            id: demoState.activeAffiliate.user_id,
            email: demoState.activeAffiliate.email,
            full_name: demoState.activeAffiliate.full_name,
            phone: demoState.activeAffiliate.phone,
            avatar_url: null,
            role: 'affiliate',
            is_active: true,
            created_at: demoState.activeAffiliate.created_at,
            updated_at: demoState.activeAffiliate.created_at,
          };
        } else if (resolvedUserId === demoState.pendingAffiliate.user_id) {
          dbProf = {
            id: demoState.pendingAffiliate.user_id,
            email: demoState.pendingAffiliate.email,
            full_name: demoState.pendingAffiliate.full_name,
            phone: demoState.pendingAffiliate.phone,
            avatar_url: null,
            role: 'affiliate',
            is_active: true,
            created_at: demoState.pendingAffiliate.created_at,
            updated_at: demoState.pendingAffiliate.created_at,
          };
        }
      }

      if (!dbProf) {
        return res.status(404).json({
          success: false,
          error: 'Không tìm thấy thông tin hồ sơ người dùng.',
        });
      }

      const role = dbProf.role || resolvedRole;
      const storedTaxCode = getStoredTaxCode(dbProf.id);

      // Nếu là CTV: tra cứu affiliate_profiles theo user_id rõ ràng (không tạo cho Admin/Staff)
      if (role === 'affiliate') {
        const { data: aff, error: affErr } = await supabase
          .from('affiliate_profiles')
          .select(`
            id,
            user_id,
            affiliate_code,
            status,
            id_card_number,
            id_card_issued_date,
            occupation,
            address,
            bank_account_number,
            bank_name,
            created_at,
            updated_at,
            reviewed_at,
            reviewer:profiles!affiliate_profiles_reviewed_by_fkey(full_name),
            suspended_at,
            suspension_reason,
            reactivated_at,
            reactivation_note
          `)
          .eq('user_id', dbProf.id)
          .maybeSingle();

        if (aff && !affErr) {
          dbAff = aff;
        } else {
          // Demo fallback
          const matched = [
            demoState.activeAffiliate,
            demoState.pendingAffiliate,
            demoState.pendingVerifiedAffiliate,
            demoState.suspendedAffiliate,
            demoState.rejectedAffiliate,
          ].find(a => a.user_id === dbProf.id);
          dbAff = matched || demoState.activeAffiliate;
        }
      }

      const isEmailVerified = authUserEmailConfirmed !== undefined
        ? authUserEmailConfirmed
        : (role !== 'affiliate' || dbAff?.email_verified !== false);

      const extProfiles = loadExtendedProfiles();
      const userExt = extProfiles[dbProf.id] || {};

      const userProfilePayload: any = {
        id: dbProf.id,
        email: dbProf.email,
        full_name: dbProf.full_name,
        phone: dbProf.phone || null,
        avatar_url: dbProf.avatar_url || null,
        role: dbProf.role,
        is_active: dbProf.is_active,
        email_verified: isEmailVerified,
        tax_code: storedTaxCode || dbProf.tax_code || userExt.tax_code || (dbAff?.tax_code ?? null),
        address: userExt.address || dbAff?.address || null,
        occupation: userExt.occupation || dbAff?.occupation || null,
        id_card_number: userExt.id_card_number || dbAff?.id_card_number || null,
        id_card_issued_date: userExt.id_card_issued_date || dbAff?.id_card_issued_date || null,
        bank_account_number: userExt.bank_account_number || dbAff?.bank_account_number || null,
        bank_name: userExt.bank_name || dbAff?.bank_name || null,
        created_at: dbProf.created_at,
        updated_at: dbProf.updated_at || dbProf.created_at,
      };

      // Chỉ gắn các trường CTV khi vai trò là affiliate (KHÔNG gắn cho Admin/Staff)
      if (role === 'affiliate' && dbAff) {
        userProfilePayload.affiliate_code = dbAff.affiliate_code;
        userProfilePayload.affiliate_status = dbAff.status;
        userProfilePayload.reviewed_at = dbAff.reviewed_at || null;
        userProfilePayload.reviewer_name = dbAff.reviewer?.full_name || (dbAff.reviewed_at ? 'Cán bộ Tuyển sinh' : null);
        if (dbAff.status === 'SUSPENDED') {
          userProfilePayload.suspended_at = dbAff.suspended_at || null;
          userProfilePayload.suspension_reason = dbAff.suspension_reason || null;
        }
        if (dbAff.reactivated_at) {
          userProfilePayload.reactivated_at = dbAff.reactivated_at;
          userProfilePayload.reactivation_note = dbAff.reactivation_note || null;
        }
      }

      return res.json({
        success: true,
        data: userProfilePayload,
      });
    } catch (err: any) {
      console.error('[API GET USER PROFILE EXCEPTION]', err?.message);
      return res.status(500).json({ success: false, error: 'Lỗi tải hồ sơ cá nhân.' });
    }
  });

  // PUT /api/v1/user/profile - Cập nhật hồ sơ cá nhân cho Admin, Staff, CTV
  app.put('/api/v1/user/profile', async (req: Request, res: Response) => {
    try {
      let resolvedUserId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
          if (!authErr && user) {
            resolvedUserId = user.id;
          }
        } catch (e) {}
      }

      if (!resolvedUserId) {
        if (demoState.currentUser?.id) {
          resolvedUserId = demoState.currentUser.id;
        } else if (demoState.currentRole === 'admin') {
          resolvedUserId = demoState.adminUser.id;
        } else if (demoState.currentRole === 'staff') {
          resolvedUserId = demoState.staffUser.id;
        } else if (demoState.currentRole === 'affiliate_active') {
          resolvedUserId = demoState.activeAffiliate.user_id;
        } else if (demoState.currentRole === 'affiliate_pending') {
          resolvedUserId = demoState.pendingAffiliate.user_id;
        }
      }

      if (!resolvedUserId) {
        return res.status(401).json({ success: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập để cập nhật hồ sơ.' });
      }

      const {
        full_name,
        email,
        phone,
        role,
        status,
        affiliate_code,
        reviewed_by,
        reviewed_at,
        review_note,
        address,
        occupation,
        id_card_number,
        id_card_issued_date,
        bank_account_number,
        bank_name,
        tax_code,
      } = req.body;

      if (
        full_name !== undefined ||
        email !== undefined ||
        phone !== undefined ||
        role !== undefined ||
        status !== undefined ||
        affiliate_code !== undefined ||
        reviewed_by !== undefined ||
        reviewed_at !== undefined ||
        review_note !== undefined
      ) {
        return res.status(403).json({
          success: false,
          error: 'Bảo mật: Họ và tên, Email, Số điện thoại và thông tin quản trị không được phép chỉnh sửa tại đây.',
        });
      }

      let cleanIssuedDate: string | null | undefined;
      if (id_card_issued_date !== undefined) {
        if (!id_card_issued_date) {
          cleanIssuedDate = null;
        } else {
          const dateStr = String(id_card_issued_date).trim();
          const parsedDate = new Date(dateStr);
          const now = new Date();
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không hợp lệ.' });
          }
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const issuedOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          if (issuedOnly > today) {
            return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không thể lớn hơn ngày hiện tại.' });
          }
          cleanIssuedDate = dateStr.slice(0, 10);
        }
      }

      const cleanTaxCode = tax_code !== undefined ? (tax_code ? String(tax_code).trim() : null) : undefined;
      const cleanAddress = address !== undefined ? (address ? String(address).trim() : null) : undefined;
      const cleanOccupation = occupation !== undefined ? (occupation ? String(occupation).trim() : null) : undefined;
      const cleanIdCard = id_card_number !== undefined ? (id_card_number ? String(id_card_number).trim() : null) : undefined;
      const cleanBankAcc = bank_account_number !== undefined ? (bank_account_number ? String(bank_account_number).trim() : null) : undefined;
      const cleanBankName = bank_name !== undefined ? (bank_name ? String(bank_name).trim() : null) : undefined;

      if (cleanTaxCode !== undefined) {
        saveTaxCode(resolvedUserId, cleanTaxCode);
        try {
          await supabase.from('profiles').update({ tax_code: cleanTaxCode, updated_at: new Date().toISOString() }).eq('id', resolvedUserId);
        } catch (e) {}
      }

      const extProfiles = loadExtendedProfiles();
      const currentExt = extProfiles[resolvedUserId] || {};
      if (cleanAddress !== undefined) currentExt.address = cleanAddress;
      if (cleanOccupation !== undefined) currentExt.occupation = cleanOccupation;
      if (cleanIdCard !== undefined) currentExt.id_card_number = cleanIdCard;
      if (cleanIssuedDate !== undefined) currentExt.id_card_issued_date = cleanIssuedDate;
      if (cleanBankAcc !== undefined) currentExt.bank_account_number = cleanBankAcc;
      if (cleanBankName !== undefined) currentExt.bank_name = cleanBankName;
      if (cleanTaxCode !== undefined) currentExt.tax_code = cleanTaxCode;
      currentExt.updated_at = new Date().toISOString();
      extProfiles[resolvedUserId] = currentExt;
      saveExtendedProfiles(extProfiles);

      if (resolvedUserId && !resolvedUserId.startsWith('u0000000')) {
        const affUpdates: any = { updated_at: new Date().toISOString() };
        if (cleanAddress !== undefined) affUpdates.address = cleanAddress;
        if (cleanOccupation !== undefined) affUpdates.occupation = cleanOccupation;
        if (cleanIdCard !== undefined) affUpdates.id_card_number = cleanIdCard;
        if (cleanIssuedDate !== undefined) affUpdates.id_card_issued_date = cleanIssuedDate;
        if (cleanBankAcc !== undefined) affUpdates.bank_account_number = cleanBankAcc;
        if (cleanBankName !== undefined) affUpdates.bank_name = cleanBankName;
        try {
          await supabase.from('affiliate_profiles').update(affUpdates).eq('user_id', resolvedUserId);
        } catch (e) {}
      }

      return res.json({
        success: true,
        message: 'Cập nhật hồ sơ cá nhân thành công.',
      });
    } catch (err: any) {
      console.error('[API UPDATE USER PROFILE EXCEPTION]', err?.message);
      return res.status(500).json({ success: false, error: 'Lỗi khi cập nhật hồ sơ cá nhân.' });
    }
  });

  // P4: POST /api/v1/user/avatar - Đổi ảnh avatar cho Admin/Staff/CTV
  app.post('/api/v1/user/avatar', async (req: Request, res: Response) => {
    try {
      let resolvedUserId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
          if (!authErr && user) {
            resolvedUserId = user.id;
          }
        } catch (e) {}
      }

      if (!resolvedUserId) {
        if (demoState.currentUser?.id) {
          resolvedUserId = demoState.currentUser.id;
        } else if (demoState.currentRole === 'admin') {
          resolvedUserId = demoState.adminUser.id;
        } else if (demoState.currentRole === 'staff') {
          resolvedUserId = demoState.staffUser.id;
        } else if (demoState.currentRole === 'affiliate_active') {
          resolvedUserId = demoState.activeAffiliate.user_id;
        } else if (demoState.currentRole === 'affiliate_pending') {
          resolvedUserId = demoState.pendingAffiliate.user_id;
        }
      }

      if (!resolvedUserId) {
        return res.status(401).json({ success: false, error: 'Chưa đăng nhập. Vui lòng đăng nhập để đổi ảnh đại diện.' });
      }

      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp dữ liệu ảnh hợp lệ.' });
      }

      const matches = image.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, error: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPEG, PNG hoặc WebP.' });
      }

      const mimeType = matches[1];
      const base64Data = matches[3];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB).' });
      }

      let ext = 'jpg';
      if (mimeType === 'image/png') {
        ext = 'png';
        if (buffer.length < 8 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
          return res.status(400).json({ success: false, error: 'File ảnh PNG không hợp lệ hoặc bị giả mạo.' });
        }
      } else if (mimeType === 'image/jpeg') {
        ext = 'jpg';
        if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
          return res.status(400).json({ success: false, error: 'File ảnh JPEG không hợp lệ hoặc bị giả mạo.' });
        }
      } else if (mimeType === 'image/webp') {
        ext = 'webp';
        if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
          return res.status(400).json({ success: false, error: 'File ảnh WebP không hợp lệ hoặc bị giả mạo.' });
        }
      }

      const fileName = `${resolvedUserId}/avatar_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadErr) {
        console.error('[API UPLOAD AVATAR ERROR]', uploadErr.message);
        return res.status(500).json({ success: false, error: 'Lỗi tải ảnh lên hệ thống lưu trữ. Vui lòng thử lại.' });
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', resolvedUserId);

      if (dbErr) {
        console.error('[API UPDATE PROFILE AVATAR DB ERROR]', dbErr.message);
        try {
          await supabase.storage.from('avatars').remove([fileName]);
        } catch (e) {}
        return res.status(500).json({ success: false, error: 'Lỗi lưu tham chiếu ảnh vào cơ sở dữ liệu.' });
      }

      if (resolvedUserId === demoState.adminUser.id) (demoState.adminUser as any).avatar_url = publicUrl;
      if (resolvedUserId === demoState.staffUser.id) (demoState.staffUser as any).avatar_url = publicUrl;
      if (resolvedUserId === demoState.activeAffiliate.user_id) (demoState.activeAffiliate as any).avatar_url = publicUrl;
      if (resolvedUserId === demoState.pendingAffiliate.user_id) (demoState.pendingAffiliate as any).avatar_url = publicUrl;
      if (demoState.currentUser && demoState.currentUser.id === resolvedUserId) {
        (demoState.currentUser as any).avatar_url = publicUrl;
      }

      return res.json({
        success: true,
        message: 'Đổi ảnh đại diện thành công.',
        data: { avatar_url: publicUrl },
      });
    } catch (err: any) {
      console.error('[API UPLOAD AVATAR EXCEPTION]', err?.message);
      return res.status(500).json({ success: false, error: 'Lỗi hệ thống khi đổi ảnh đại diện.' });
    }
  });

  // GET /api/v1/affiliate/profile (Xem hồ sơ cá nhân của chính CTV)
  app.get('/api/v1/affiliate/profile', requireAffiliateOrAdmin, async (req: Request, res: Response) => {
    try {
      const currentAff = demoState.currentRole === 'affiliate_active'
        ? demoState.activeAffiliate
        : demoState.pendingAffiliate;
      const userId = currentAff.user_id;

      if (userId && !userId.startsWith('u0000000')) {
        const { data: dbAff, error } = await supabase
          .from('affiliate_profiles')
          .select(`
            *,
            profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active)
          `)
          .eq('user_id', userId)
          .maybeSingle();

        if (dbAff && !error) {
          return res.json({
            success: true,
            data: {
              id: dbAff.id,
              user_id: dbAff.user_id,
              full_name: dbAff.profile?.full_name || currentAff.full_name,
              email: dbAff.profile?.email || currentAff.email,
              phone: dbAff.profile?.phone || currentAff.phone,
              affiliate_code: dbAff.affiliate_code,
              status: dbAff.status,
              id_card_number: dbAff.id_card_number || '',
              id_card_issued_date: dbAff.id_card_issued_date || '',
              occupation: dbAff.occupation || '',
              address: dbAff.address || '',
              bank_account_number: dbAff.bank_account_number || '',
              bank_name: dbAff.bank_name || '',
              created_at: dbAff.created_at,
              updated_at: dbAff.updated_at,
            },
          });
        }
      }

      return res.json({
        success: true,
        data: currentAff,
      });
    } catch (err: any) {
      console.error('[API GET AFFILIATE PROFILE EXCEPTION]', err?.message);
      return res.status(500).json({ success: false, error: 'Lỗi tải hồ sơ cá nhân.' });
    }
  });

  // PUT /api/v1/affiliate/profile (Cập nhật hồ sơ cá nhân của chính CTV)
  app.put('/api/v1/affiliate/profile', requireAffiliateOrAdmin, async (req: Request, res: Response) => {
    try {
      const {
        full_name,
        phone,
        address,
        occupation,
        id_card_number,
        id_card_issued_date,
        bank_account_number,
        bank_name,
      } = req.body;

      // 1. Kiểm tra an toàn: Tuyệt đối không cho phép đổi vai trò, mã CTV hoặc thông tin quản trị
      if (
        req.body.role !== undefined ||
        req.body.status !== undefined ||
        req.body.affiliate_code !== undefined ||
        req.body.reviewed_by !== undefined ||
        req.body.reviewed_at !== undefined ||
        req.body.review_note !== undefined
      ) {
        return res.status(403).json({
          success: false,
          error: 'Bảo mật: Không được phép thay đổi vai trò, mã CTV hoặc thông tin xét duyệt.',
        });
      }

      // 2. Validate Họ và tên nếu có gửi lên
      let cleanFullName: string | undefined;
      if (full_name !== undefined) {
        cleanFullName = String(full_name).trim();
        if (!cleanFullName || cleanFullName.split(/\s+/).length < 2) {
          return res.status(400).json({ success: false, error: 'Họ và tên phải bao gồm đầy đủ cả họ và tên.' });
        }
      }

      // 3. Validate Số điện thoại nếu có gửi lên
      let cleanPhone: string | undefined;
      if (phone !== undefined) {
        cleanPhone = String(phone).trim().replace(/\s/g, '');
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
          return res.status(400).json({ success: false, error: 'Số điện thoại không hợp lệ (10 chữ số).' });
        }
      }

      // 4. Validate Ngày cấp CCCD
      let cleanIssuedDate: string | null | undefined;
      if (id_card_issued_date !== undefined) {
        if (!id_card_issued_date) {
          cleanIssuedDate = null;
        } else {
          const dateStr = String(id_card_issued_date).trim();
          const parsedDate = new Date(dateStr);
          const now = new Date();
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không hợp lệ.' });
          }
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const issuedOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
          if (issuedOnly > today) {
            return res.status(400).json({ success: false, error: 'Ngày cấp CCCD không thể lớn hơn ngày hiện tại.' });
          }
          cleanIssuedDate = dateStr.slice(0, 10);
        }
      }

      // 5. Validate Số tài khoản ngân hàng (chuỗi, giữ số 0 ở đầu)
      let cleanBankAcc: string | null | undefined;
      if (bank_account_number !== undefined) {
        if (bank_account_number === null || bank_account_number === '') {
          cleanBankAcc = null;
        } else {
          const bStr = String(bank_account_number).trim();
          if (bStr.length > 50) {
            return res.status(400).json({ success: false, error: 'Số tài khoản ngân hàng không được vượt quá 50 ký tự.' });
          }
          cleanBankAcc = bStr;
        }
      }

      // 6. Validate Tên ngân hàng
      let cleanBankName: string | null | undefined;
      if (bank_name !== undefined) {
        if (!bank_name) {
          cleanBankName = null;
        } else {
          const bName = String(bank_name).trim();
          if (bName.length > 150) {
            return res.status(400).json({ success: false, error: 'Tên ngân hàng không được vượt quá 150 ký tự.' });
          }
          cleanBankName = bName;
        }
      }

      const currentAff = demoState.currentRole === 'affiliate_active'
        ? demoState.activeAffiliate
        : demoState.pendingAffiliate;
      const userId = currentAff.user_id;

      // Cập nhật CSDL thực tế nếu có
      if (userId && !userId.startsWith('u0000000')) {
        if (cleanFullName || cleanPhone) {
          const profileUpdates: any = {};
          if (cleanFullName) profileUpdates.full_name = cleanFullName;
          if (cleanPhone) profileUpdates.phone = cleanPhone;
          profileUpdates.updated_at = new Date().toISOString();
          await supabase.from('profiles').update(profileUpdates).eq('id', userId);
        }

        const affUpdates: any = { updated_at: new Date().toISOString() };
        if (address !== undefined) affUpdates.address = address ? String(address).trim() : null;
        if (occupation !== undefined) affUpdates.occupation = occupation ? String(occupation).trim() : null;
        if (id_card_number !== undefined) affUpdates.id_card_number = id_card_number ? String(id_card_number).trim() : null;
        if (cleanIssuedDate !== undefined) affUpdates.id_card_issued_date = cleanIssuedDate;
        if (cleanBankAcc !== undefined) affUpdates.bank_account_number = cleanBankAcc;
        if (cleanBankName !== undefined) affUpdates.bank_name = cleanBankName;

        try {
          await supabase.from('affiliate_profiles').update(affUpdates).eq('user_id', userId);
        } catch (dbErr: any) {
          console.warn('[UPDATE AFFILIATE PROFILE] Notice: DB columns might need migration:', dbErr?.message);
        }
      }

      // Cập nhật demoState bảo toàn các trường khác không bị mất
      if (cleanFullName) currentAff.full_name = cleanFullName;
      if (cleanPhone) currentAff.phone = cleanPhone;
      if (address !== undefined) currentAff.address = address ? String(address).trim() : currentAff.address;
      if (occupation !== undefined) currentAff.occupation = occupation ? String(occupation).trim() : currentAff.occupation;
      if (id_card_number !== undefined) currentAff.id_card_number = id_card_number ? String(id_card_number).trim() : currentAff.id_card_number;
      if (cleanIssuedDate !== undefined) currentAff.id_card_issued_date = cleanIssuedDate || '';
      if (cleanBankAcc !== undefined) currentAff.bank_account_number = cleanBankAcc || '';
      if (cleanBankName !== undefined) currentAff.bank_name = cleanBankName || '';

      console.log(`[API UPDATE AFFILIATE PROFILE] User ID ${userId} updated personal profile successfully.`);

      return res.json({
        success: true,
        message: 'Cập nhật hồ sơ cá nhân thành công.',
        data: currentAff,
      });
    } catch (err: any) {
      console.error('[API UPDATE AFFILIATE PROFILE EXCEPTION]', err?.message);
      return res.status(500).json({ success: false, error: 'Lỗi khi cập nhật hồ sơ cá nhân.' });
    }
  });

  // ----------------------------------------------------------------------------
  // E3 – ADMIN PORTAL (Duyệt CTV, Quản lý Khóa, Lead, Đối soát, Duyệt Thưởng)
  // ----------------------------------------------------------------------------
  // E3 – ADMIN PORTAL (Duyệt CTV, Quản lý Khóa, Lead, Đối soát, Duyệt Thưởng)
  // ----------------------------------------------------------------------------
  const requireStaffOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Kiểm tra Bearer token nếu có (xác thực danh tính thực tế từ DB profiles)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
        if (!authError && user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, is_active')
            .eq('id', user.id)
            .maybeSingle();

          if (prof && prof.is_active && (prof.role === 'staff' || prof.role === 'admin')) {
            (req as any).user = prof;
            return next();
          } else {
            return res.status(403).json({
              success: false,
              error: 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền duyệt hồ sơ CTV (Mã lỗi: 42501).',
            });
          }
        }
      } catch (e) {
        // Fallback to demo session check
      }
    }

    // 2. Kiểm tra theo phiên phân quyền demo hệ thống
    if (demoState.currentRole !== 'staff' && demoState.currentRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền truy cập khu vực này (Mã lỗi: 42501).',
      });
    }

    (req as any).user = demoState.currentRole === 'admin' ? demoState.adminUser : demoState.staffUser;
    next();
  };

  const requireAdminOnly = (req: Request, res: Response, next: NextFunction) => {
    if (demoState.currentRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bị từ chối: Thao tác này chỉ dành riêng cho Quản trị viên / Trưởng bộ phận Tuyển sinh (Mã lỗi: 42501).',
      });
    }
    next();
  };

  // 1. Quản lý Cộng tác viên (với tìm kiếm, lọc trạng thái, phân trang và xác thực email)
  app.get('/api/v1/admin/affiliates', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string || '').trim();
      const status = (req.query.status as string || 'ALL').trim();
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      let matchingUserIds: string[] = [];
      if (search) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        if (profs) {
          matchingUserIds = profs.map((p: any) => p.id);
        }
      }

      let query = supabase
        .from('affiliate_profiles')
        .select('*, profiles!affiliate_profiles_user_id_fkey(full_name, email, phone, is_active, role)', { count: 'exact' });

      if (status && status !== 'ALL') {
        query = query.eq('status', status);
      }

      if (search) {
        if (matchingUserIds.length > 0) {
          query = query.or(`affiliate_code.ilike.%${search}%,user_id.in.(${matchingUserIds.join(',')})`);
        } else {
          query = query.ilike('affiliate_code', `%${search}%`);
        }
      }

      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: dbAffiliates, count, error } = await query;

      if (error) {
        console.error('Error fetching admin affiliates:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // Fetch email confirmation status from Supabase Auth admin API
      let emailVerifiedMap: Record<string, boolean> = {};
      try {
        const { data: authUsersList } = await supabase.auth.admin.listUsers();
        if (authUsersList && authUsersList.users) {
          authUsersList.users.forEach((u: any) => {
            emailVerifiedMap[u.id] = !!u.email_confirmed_at;
          });
        }
      } catch (authErr) {
        console.error('Error fetching auth users for email confirmation:', authErr);
      }

      const enrichedAffiliates = (dbAffiliates || []).map((aff: any) => ({
        ...aff,
        is_email_verified: emailVerifiedMap[aff.user_id] || false,
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: enrichedAffiliates,
        pagination: {
          page,
          limit,
          total,
          totalPages: totalPages > 0 ? totalPages : 1,
        },
      });
    } catch (err: any) {
      console.error('Server error in GET /api/v1/admin/affiliates:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi máy chủ' });
    }
  });

  // GET /api/v1/admin/affiliates/:id - Chi tiết hồ sơ CTV
  app.get('/api/v1/admin/affiliates/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || id.length < 10) {
        return res.status(400).json({ success: false, error: 'Mã định danh hồ sơ CTV không hợp lệ.' });
      }

      const { data: aff, error: affErr } = await supabase
        .from('affiliate_profiles')
        .select(`
          *,
          profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active, created_at, updated_at),
          reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (affErr) {
        console.error('[API ADMIN AFFILIATE DETAIL SQL ERROR]', affErr);
        return res.status(500).json({ success: false, error: 'Lỗi hệ thống khi truy vấn hồ sơ cộng tác viên.' });
      }

      if (!aff) {
        const demoAff = [
          demoState.pendingAffiliate,
          demoState.pendingVerifiedAffiliate,
          demoState.activeAffiliate,
          demoState.suspendedAffiliate,
          demoState.rejectedAffiliate,
        ].find(a => a && a.id === id);

        if (demoAff) {
          return res.json({
            success: true,
            data: {
              ...demoAff,
              tax_code: getStoredTaxCode(demoAff.user_id) || null,
              profile: {
                id: demoAff.user_id,
                email: demoAff.email,
                full_name: demoAff.full_name,
                phone: demoAff.phone,
                tax_code: getStoredTaxCode(demoAff.user_id) || null,
                role: 'affiliate',
                is_active: demoAff.status !== 'SUSPENDED',
                created_at: demoAff.created_at,
                updated_at: demoAff.created_at,
              },
              email_verified: demoAff.email_verified !== undefined ? demoAff.email_verified : (demoAff.id !== 'a0000000-0000-0000-0000-000000000001'),
              email_confirmed_at: demoAff.email_verified !== false ? demoAff.created_at : null,
              reviewer: demoAff.reviewed_by ? {
                id: demoAff.reviewed_by,
                full_name: demoAff.reviewed_by === demoState.adminUser.id ? demoState.adminUser.full_name : demoState.staffUser.full_name,
                email: demoAff.reviewed_by === demoState.adminUser.id ? demoState.adminUser.email : demoState.staffUser.email,
              } : null,
              suspender: demoAff.suspended_by ? {
                id: demoAff.suspended_by,
                full_name: demoAff.suspended_by === demoState.adminUser.id ? demoState.adminUser.full_name : demoState.staffUser.full_name,
                email: demoAff.suspended_by === demoState.adminUser.id ? demoState.adminUser.email : demoState.staffUser.email,
              } : null,
              reactivator: demoAff.reactivated_by ? {
                id: demoAff.reactivated_by,
                full_name: demoAff.reactivated_by === demoState.adminUser.id ? demoState.adminUser.full_name : demoState.staffUser.full_name,
                email: demoAff.reactivated_by === demoState.adminUser.id ? demoState.adminUser.email : demoState.staffUser.email,
              } : null,
              audit_logs: demoState.auditLogs.filter((l: any) => l.entity_id === demoAff.id),
            },
          });
        }

        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cộng tác viên.' });
      }

      if (aff.profile && aff.profile.role && aff.profile.role !== 'affiliate') {
        return res.status(403).json({ success: false, error: 'Không có quyền truy cập hồ sơ quản trị viên hoặc nhân sự.' });
      }

      let emailVerified = false;
      let emailConfirmedAt = null;
      if (aff.user_id) {
        try {
          const { data: authUserObj } = await supabase.auth.admin.getUserById(aff.user_id);
          if (authUserObj && authUserObj.user) {
            emailVerified = !!authUserObj.user.email_confirmed_at;
            emailConfirmedAt = authUserObj.user.email_confirmed_at || null;
          }
        } catch (authErr) {
          console.error('[API ADMIN AFFILIATE DETAIL AUTH ERROR]', authErr);
        }
      }

      let auditHistory: any[] = [];
      try {
        const { data: logs } = await supabase
          .from('audit_logs')
          .select(`
            id,
            actor_id,
            action,
            entity_name,
            entity_id,
            old_values,
            new_values,
            reason,
            created_at,
            actor:profiles!audit_logs_actor_id_fkey(id, full_name, email)
          `)
          .eq('entity_name', 'affiliate_profiles')
          .eq('entity_id', id)
          .order('created_at', { ascending: false });
        if (logs) auditHistory = logs;
      } catch (logErr) {
        console.error('[API ADMIN AFFILIATE AUDIT LOGS ERROR]', logErr);
      }

      const affTaxCode = aff.tax_code || getStoredTaxCode(aff.user_id) || null;

      return res.json({
        success: true,
        data: {
          ...aff,
          tax_code: affTaxCode,
          profile: {
            ...aff.profile,
            tax_code: aff.profile?.tax_code || affTaxCode,
          },
          email_verified: emailVerified,
          email_confirmed_at: emailConfirmedAt,
          audit_logs: auditHistory,
        },
      });
    } catch (err: any) {
      console.error('[API ADMIN AFFILIATE DETAIL EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi kết nối máy chủ.' });
    }
  });

  // ----------------------------------------------------------------------------
  // XỬ LÝ DUYỆT & TỪ CHỐI HỒ SƠ CTV (YÊU CẦU A1.3)
  // ----------------------------------------------------------------------------
  const handleReviewAffiliate = async (req: Request, res: Response, action: 'APPROVE' | 'REJECT') => {
    try {
      const { id } = req.params;
      const { review_note, rejection_reason } = req.body;
      const noteInput = action === 'REJECT' ? (rejection_reason || review_note) : review_note;

      if (!id || typeof id !== 'string' || id.length < 10) {
        return res.status(400).json({ success: false, error: 'Mã định danh hồ sơ CTV không hợp lệ.' });
      }

      // Xác định người xử lý từ phiên đăng nhập thực tế (không nhận từ client)
      let actorId = demoState.currentRole === 'admin' ? demoState.adminUser.id : demoState.staffUser.id;
      let actorName = demoState.currentRole === 'admin' ? demoState.adminUser.full_name : demoState.staffUser.full_name;
      if ((req as any).user?.id) {
        actorId = (req as any).user.id;
        actorName = (req as any).user.full_name || actorName;
      }

      // Kiểm tra lý do khi từ chối: BẮT BUỘC, không chấp nhận chuỗi chỉ có khoảng trắng
      let cleanReason: string | null = null;
      if (action === 'REJECT') {
        cleanReason = noteInput ? String(noteInput).trim() : '';
        if (!cleanReason || cleanReason.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Bắt buộc phải nhập lý do từ chối hồ sơ cộng tác viên.',
            code: 'REASON_REQUIRED',
          });
        }
      } else {
        cleanReason = noteInput ? String(noteInput).trim() : null;
      }

      // Trường hợp 1: Thử nghiệm với Demo Account (nếu ID trùng với pendingAffiliate hoặc pendingVerifiedAffiliate)
      const targetDemo = id === demoState.pendingAffiliate.id
        ? demoState.pendingAffiliate
        : (id === demoState.pendingVerifiedAffiliate?.id ? demoState.pendingVerifiedAffiliate : null);

      if (targetDemo) {
        if (targetDemo.status !== 'PENDING_REVIEW') {
          return res.status(409).json({
            success: false,
            error: `Hồ sơ đã được xử lý trước đó (trạng thái hiện tại: ${targetDemo.status}), vui lòng tải lại trang.`,
            code: 'ALREADY_PROCESSED',
          });
        }

        // BẮT BUỘC: Chỉ duyệt khi email đã được xác thực
        if (action === 'APPROVE') {
          const isEmailVerified = targetDemo.email_verified === true;
          if (!isEmailVerified) {
            return res.status(400).json({
              success: false,
              error: 'Không thể duyệt hồ sơ do email của Cộng tác viên chưa được xác thực. Vui lòng yêu cầu CTV hoàn tất xác thực email trước khi duyệt.',
              code: 'EMAIL_NOT_VERIFIED',
            });
          }
        }

        const nowIso = new Date().toISOString();
        const newStatus = action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
        const oldStatus = targetDemo.status;
        const oldNote = targetDemo.review_note;

        targetDemo.status = newStatus;
        targetDemo.reviewed_by = actorId;
        targetDemo.reviewed_at = nowIso;
        targetDemo.review_note = cleanReason || (action === 'APPROVE' ? 'Hồ sơ đã được duyệt bởi Cán bộ Tuyển sinh' : '');

        // Ghi nhật ký kiểm toán vào demoState.auditLogs
        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          actor_id: actorId,
          action: action === 'APPROVE' ? 'AFFILIATE_APPROVED' : 'AFFILIATE_REJECTED',
          entity_name: 'affiliate_profiles',
          entity_id: targetDemo.id,
          old_values: { status: oldStatus, review_note: oldNote },
          new_values: {
            status: newStatus,
            reviewed_by: actorId,
            reviewed_at: nowIso,
            review_note: targetDemo.review_note,
          },
          reason: cleanReason,
          actor: {
            id: actorId,
            full_name: actorName,
            email: demoState.currentRole === 'admin' ? demoState.adminUser.email : demoState.staffUser.email,
          },
          created_at: nowIso,
        };
        demoState.auditLogs.unshift(auditEntry);

        // Ghi nhật ký kiểm toán vào audit_logs nếu có kết nối Supabase
        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            action: action === 'APPROVE' ? 'AFFILIATE_APPROVED' : 'AFFILIATE_REJECTED',
            entity_name: 'affiliate_profiles',
            entity_id: targetDemo.id,
            old_values: { status: oldStatus, review_note: oldNote },
            new_values: {
              status: newStatus,
              reviewed_by: actorId,
              reviewed_at: nowIso,
              review_note: targetDemo.review_note,
            },
            reason: cleanReason,
            ip_address: req.ip || null,
            user_agent: req.headers['user-agent'] || null,
          });
        } catch (auditErr: any) {
          console.warn('[AUDIT LOG INSERT NOTICE]:', auditErr?.message);
        }

        return res.json({
          success: true,
          message: action === 'APPROVE' ? 'Phê duyệt hồ sơ CTV thành công!' : 'Từ chối hồ sơ CTV thành công!',
          data: {
            ...targetDemo,
            reviewer: {
              id: actorId,
              full_name: actorName,
              email: demoState.currentRole === 'admin' ? demoState.adminUser.email : demoState.staffUser.email,
            },
            audit_logs: demoState.auditLogs.filter(l => l.entity_id === targetDemo.id),
          },
        });
      }

      // Trường hợp 2: Hồ sơ thật trong CSDL Supabase
      // 2.1 Kiểm tra trạng thái hiện tại trong CSDL
      const { data: currentAff, error: fetchErr } = await supabase
        .from('affiliate_profiles')
        .select('id, user_id, status, affiliate_code, review_note')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error('[API REVIEW AFFILIATE SQL ERROR]', fetchErr);
        return res.status(500).json({ success: false, error: 'Lỗi truy vấn CSDL.' });
      }

      if (!currentAff) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cộng tác viên.' });
      }

      // Chỉ hồ sơ “Chờ duyệt” được duyệt hoặc từ chối
      if (currentAff.status !== 'PENDING_REVIEW') {
        return res.status(409).json({
          success: false,
          error: `Hồ sơ đã được xử lý trước đó (trạng thái hiện tại: ${currentAff.status}), vui lòng tải lại trang.`,
          code: 'ALREADY_PROCESSED',
        });
      }

      // 2.2 Kiểm tra xác thực email khi duyệt (bắt buộc)
      if (action === 'APPROVE') {
        let isEmailVerified = false;
        try {
          if (currentAff.user_id) {
            const { data: authUserObj } = await supabase.auth.admin.getUserById(currentAff.user_id);
            isEmailVerified = !!authUserObj?.user?.email_confirmed_at;
          }
        } catch (authErr: any) {
          console.error('[API REVIEW EMAIL CHECK AUTH ERROR]', authErr?.message);
        }

        if (!isEmailVerified) {
          return res.status(400).json({
            success: false,
            error: 'Không thể duyệt hồ sơ do email của Cộng tác viên chưa được xác thực. Vui lòng yêu cầu CTV hoàn tất xác thực email trước khi duyệt.',
            code: 'EMAIL_NOT_VERIFIED',
          });
        }
      }

      // 2.3 Gọi hàm nguyên tử PostgreSQL (fn_review_affiliate_profile) nếu có
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_review_affiliate_profile', {
          p_affiliate_id: id,
          p_reviewer_id: actorId,
          p_action: action,
          p_review_note: cleanReason,
          p_client_ip: req.ip || null,
          p_user_agent: req.headers['user-agent'] || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          // Lấy hồ sơ sau khi cập nhật để trả về đầy đủ quan hệ
          const { data: fullUpdated } = await supabase
            .from('affiliate_profiles')
            .select(`
              *,
              profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
              reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
            `)
            .eq('id', id)
            .maybeSingle();

          return res.json({
            success: true,
            message: action === 'APPROVE' ? 'Phê duyệt hồ sơ CTV thành công!' : 'Từ chối hồ sơ CTV thành công!',
            data: fullUpdated || rpcRes,
          });
        }

        if (rpcErr && rpcErr.message?.includes('được xử lý trước đó')) {
          return res.status(409).json({
            success: false,
            error: 'Hồ sơ đã được xử lý trước đó, vui lòng tải lại trang.',
            code: 'ALREADY_PROCESSED',
          });
        }
      } catch (rpcEx: any) {
        console.warn('[RPC fn_review_affiliate_profile fallback]:', rpcEx?.message);
      }

      // 2.4 Cập nhật trực tiếp có điều kiện nguyên tử (Atomic Conditional Update)
      const nowIso = new Date().toISOString();
      const newStatus = action === 'APPROVE' ? 'ACTIVE' : 'REJECTED';

      const { data: updatedAff, error: updateErr } = await supabase
        .from('affiliate_profiles')
        .update({
          status: newStatus,
          reviewed_by: actorId,
          reviewed_at: nowIso,
          review_note: cleanReason,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'PENDING_REVIEW')
        .select(`
          *,
          profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
          reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
        `)
        .maybeSingle();

      if (updateErr) {
        console.error('[API REVIEW AFFILIATE UPDATE ERROR]', updateErr);
        return res.status(500).json({ success: false, error: 'Lỗi cập nhật CSDL.' });
      }

      if (!updatedAff) {
        return res.status(409).json({
          success: false,
          error: 'Hồ sơ đã được xử lý trước đó, vui lòng tải lại trang.',
          code: 'ALREADY_PROCESSED',
        });
      }

      // Ghi nhật ký kiểm toán vào audit_logs
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action: action === 'APPROVE' ? 'AFFILIATE_APPROVED' : 'AFFILIATE_REJECTED',
          entity_name: 'affiliate_profiles',
          entity_id: id,
          old_values: { status: 'PENDING_REVIEW', review_note: currentAff.review_note },
          new_values: {
            status: newStatus,
            reviewed_by: actorId,
            reviewed_at: nowIso,
            review_note: cleanReason,
          },
          reason: cleanReason,
          ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
        });
      } catch (auditErr: any) {
        console.warn('[AUDIT LOG INSERT NOTICE]:', auditErr?.message);
      }

      return res.json({
        success: true,
        message: action === 'APPROVE' ? 'Phê duyệt hồ sơ CTV thành công!' : 'Từ chối hồ sơ CTV thành công!',
        data: updatedAff,
      });
    } catch (err: any) {
      console.error('[API REVIEW AFFILIATE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi kết nối máy chủ.' });
    }
  };

  // ----------------------------------------------------------------------------
  // E3.1 – TẠM NGƯNG VÀ KÍCH HOẠT LẠI CTV (YÊU CẦU A1.4)
  // ----------------------------------------------------------------------------
  const handleSuspendAffiliate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || typeof id !== 'string' || id.length < 10) {
        return res.status(400).json({ success: false, error: 'Mã định danh hồ sơ CTV không hợp lệ.' });
      }

      const cleanReason = (typeof reason === 'string' ? reason.trim() : '');
      if (!cleanReason || cleanReason.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Bắt buộc phải nhập lý do tạm ngưng hoạt động của cộng tác viên.',
          code: 'REASON_REQUIRED',
        });
      }

      const actorId = (req as any).user?.id || (demoState.currentRole === 'admin' ? demoState.adminUser.id : demoState.staffUser.id);
      const actorName = (req as any).user?.full_name || (demoState.currentRole === 'admin' ? demoState.adminUser.full_name : demoState.staffUser.full_name);
      const actorEmail = (req as any).user?.email || (demoState.currentRole === 'admin' ? demoState.adminUser.email : demoState.staffUser.email);
      const nowIso = new Date().toISOString();

      // Kiểm tra demo accounts
      const targetDemo = [
        demoState.pendingAffiliate,
        demoState.pendingVerifiedAffiliate,
        demoState.activeAffiliate,
        demoState.suspendedAffiliate,
        demoState.rejectedAffiliate,
      ].find(a => a && a.id === id);

      if (targetDemo) {
        if (targetDemo.status !== 'ACTIVE') {
          return res.status(409).json({
            success: false,
            error: `Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Hoạt động (ACTIVE) mới có thể tạm ngưng (trạng thái hiện tại: ${targetDemo.status}).`,
            code: 'INVALID_STATUS',
          });
        }

        const oldStatus = targetDemo.status;
        targetDemo.status = 'SUSPENDED';
        targetDemo.suspended_by = actorId;
        targetDemo.suspended_at = nowIso;
        targetDemo.suspension_reason = cleanReason;

        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          actor_id: actorId,
          action: 'AFFILIATE_SUSPENDED',
          entity_name: 'affiliate_profiles',
          entity_id: targetDemo.id,
          old_values: { status: oldStatus },
          new_values: {
            status: 'SUSPENDED',
            suspended_by: actorId,
            suspended_at: nowIso,
            suspension_reason: cleanReason,
          },
          reason: cleanReason,
          actor: { id: actorId, full_name: actorName, email: actorEmail },
          created_at: nowIso,
        };
        demoState.auditLogs.unshift(auditEntry);

        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            action: 'AFFILIATE_SUSPENDED',
            entity_name: 'affiliate_profiles',
            entity_id: targetDemo.id,
            old_values: { status: oldStatus },
            new_values: {
              status: 'SUSPENDED',
              suspended_by: actorId,
              suspended_at: nowIso,
              suspension_reason: cleanReason,
            },
            reason: cleanReason,
            ip_address: req.ip || null,
            user_agent: req.headers['user-agent'] || null,
          });
        } catch (err: any) {
          console.warn('[AUDIT LOG INSERT NOTICE]:', err?.message);
        }

        return res.json({
          success: true,
          message: 'Tạm ngưng hoạt động của CTV thành công!',
          data: {
            ...targetDemo,
            suspender: { id: actorId, full_name: actorName, email: actorEmail },
            audit_logs: demoState.auditLogs.filter(l => l.entity_id === targetDemo.id),
          },
        });
      }

      // Supabase Database Handling
      const { data: currentAff, error: fetchErr } = await supabase
        .from('affiliate_profiles')
        .select('id, user_id, status, affiliate_code, reviewed_by, reviewed_at, review_note')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error('[API SUSPEND AFFILIATE SQL ERROR]', fetchErr);
        return res.status(500).json({ success: false, error: 'Lỗi truy vấn CSDL.' });
      }

      if (!currentAff) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cộng tác viên.' });
      }

      if (currentAff.status !== 'ACTIVE') {
        return res.status(409).json({
          success: false,
          error: `Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Hoạt động (ACTIVE) mới có thể tạm ngưng (trạng thái hiện tại: ${currentAff.status}).`,
          code: 'INVALID_STATUS',
        });
      }

      // Try RPC fn_suspend_affiliate_profile
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_suspend_affiliate_profile', {
          p_affiliate_id: id,
          p_actor_id: actorId,
          p_reason: cleanReason,
          p_client_ip: req.ip || null,
          p_user_agent: req.headers['user-agent'] || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          const { data: fullUpdated } = await supabase
            .from('affiliate_profiles')
            .select(`
              *,
              profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
              reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
            `)
            .eq('id', id)
            .maybeSingle();

          return res.json({
            success: true,
            message: 'Tạm ngưng hoạt động của CTV thành công!',
            data: fullUpdated || rpcRes,
          });
        }
      } catch (rpcEx: any) {
        console.warn('[RPC fn_suspend_affiliate_profile fallback]:', rpcEx?.message);
      }

      // Fallback atomic update
      const { data: updatedAff, error: updateErr } = await supabase
        .from('affiliate_profiles')
        .update({
          status: 'SUSPENDED',
          suspended_by: actorId,
          suspended_at: nowIso,
          suspension_reason: cleanReason,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'ACTIVE')
        .select(`
          *,
          profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
          reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
        `)
        .maybeSingle();

      if (updateErr) {
        console.error('[API SUSPEND AFFILIATE UPDATE ERROR]', updateErr);
        return res.status(500).json({ success: false, error: 'Lỗi cập nhật CSDL.' });
      }

      if (!updatedAff) {
        return res.status(409).json({
          success: false,
          error: 'Trạng thái hồ sơ đã thay đổi bởi thao tác khác, vui lòng tải lại trang.',
          code: 'CONCURRENT_CONFLICT',
        });
      }

      // Insert audit log
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action: 'AFFILIATE_SUSPENDED',
          entity_name: 'affiliate_profiles',
          entity_id: id,
          old_values: { status: 'ACTIVE' },
          new_values: {
            status: 'SUSPENDED',
            suspended_by: actorId,
            suspended_at: nowIso,
            suspension_reason: cleanReason,
          },
          reason: cleanReason,
          ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
        });
      } catch (err: any) {
        console.warn('[AUDIT LOG INSERT NOTICE]:', err?.message);
      }

      return res.json({
        success: true,
        message: 'Tạm ngưng hoạt động của CTV thành công!',
        data: updatedAff,
      });
    } catch (err: any) {
      console.error('[API SUSPEND AFFILIATE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi kết nối máy chủ.' });
    }
  };

  const handleReactivateAffiliate = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { note } = req.body;

      if (!id || typeof id !== 'string' || id.length < 10) {
        return res.status(400).json({ success: false, error: 'Mã định danh hồ sơ CTV không hợp lệ.' });
      }

      const cleanNote = (typeof note === 'string' ? note.trim() : '') || 'Kích hoạt lại hoạt động CTV';
      const actorId = (req as any).user?.id || (demoState.currentRole === 'admin' ? demoState.adminUser.id : demoState.staffUser.id);
      const actorName = (req as any).user?.full_name || (demoState.currentRole === 'admin' ? demoState.adminUser.full_name : demoState.staffUser.full_name);
      const actorEmail = (req as any).user?.email || (demoState.currentRole === 'admin' ? demoState.adminUser.email : demoState.staffUser.email);
      const nowIso = new Date().toISOString();

      // Kiểm tra demo accounts
      const targetDemo = [
        demoState.pendingAffiliate,
        demoState.pendingVerifiedAffiliate,
        demoState.activeAffiliate,
        demoState.suspendedAffiliate,
        demoState.rejectedAffiliate,
      ].find(a => a && a.id === id);

      if (targetDemo) {
        if (targetDemo.status === 'PENDING_REVIEW' || targetDemo.status === 'REJECTED') {
          return res.status(400).json({
            success: false,
            error: 'Thao tác không hợp lệ: Hồ sơ chờ duyệt hoặc bị từ chối không thể kích hoạt lại để bỏ qua quy trình xét duyệt A1.3.',
            code: 'CANNOT_BYPASS_REVIEW',
          });
        }

        if (targetDemo.status !== 'SUSPENDED') {
          return res.status(409).json({
            success: false,
            error: `Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Tạm ngưng (SUSPENDED) mới có thể kích hoạt lại (trạng thái hiện tại: ${targetDemo.status}).`,
            code: 'INVALID_STATUS',
          });
        }

        // Kiểm tra email xác thực
        if (targetDemo.email_verified === false) {
          return res.status(400).json({
            success: false,
            error: 'Không thể kích hoạt lại hồ sơ do email của Cộng tác viên chưa được xác thực.',
            code: 'EMAIL_NOT_VERIFIED',
          });
        }

        const oldStatus = targetDemo.status;
        targetDemo.status = 'ACTIVE';
        targetDemo.reactivated_by = actorId;
        targetDemo.reactivated_at = nowIso;
        targetDemo.reactivation_note = cleanNote;

        const auditEntry = {
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          actor_id: actorId,
          action: 'AFFILIATE_REACTIVATED',
          entity_name: 'affiliate_profiles',
          entity_id: targetDemo.id,
          old_values: { status: oldStatus, suspension_reason: targetDemo.suspension_reason },
          new_values: {
            status: 'ACTIVE',
            reactivated_by: actorId,
            reactivated_at: nowIso,
            reactivation_note: cleanNote,
          },
          reason: cleanNote,
          actor: { id: actorId, full_name: actorName, email: actorEmail },
          created_at: nowIso,
        };
        demoState.auditLogs.unshift(auditEntry);

        try {
          await supabase.from('audit_logs').insert({
            actor_id: actorId,
            action: 'AFFILIATE_REACTIVATED',
            entity_name: 'affiliate_profiles',
            entity_id: targetDemo.id,
            old_values: { status: oldStatus, suspension_reason: targetDemo.suspension_reason },
            new_values: {
              status: 'ACTIVE',
              reactivated_by: actorId,
              reactivated_at: nowIso,
              reactivation_note: cleanNote,
            },
            reason: cleanNote,
            ip_address: req.ip || null,
            user_agent: req.headers['user-agent'] || null,
          });
        } catch (err: any) {
          console.warn('[AUDIT LOG INSERT NOTICE]:', err?.message);
        }

        return res.json({
          success: true,
          message: 'Kích hoạt lại hoạt động CTV thành công!',
          data: {
            ...targetDemo,
            reactivator: { id: actorId, full_name: actorName, email: actorEmail },
            audit_logs: demoState.auditLogs.filter(l => l.entity_id === targetDemo.id),
          },
        });
      }

      // Supabase Database Handling
      const { data: currentAff, error: fetchErr } = await supabase
        .from('affiliate_profiles')
        .select('id, user_id, status, affiliate_code, suspension_reason')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) {
        console.error('[API REACTIVATE AFFILIATE SQL ERROR]', fetchErr);
        return res.status(500).json({ success: false, error: 'Lỗi truy vấn CSDL.' });
      }

      if (!currentAff) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ cộng tác viên.' });
      }

      if (currentAff.status === 'PENDING_REVIEW' || currentAff.status === 'REJECTED') {
        return res.status(400).json({
          success: false,
          error: 'Thao tác không hợp lệ: Hồ sơ chờ duyệt hoặc bị từ chối không thể kích hoạt lại để bỏ qua quy trình xét duyệt A1.3.',
          code: 'CANNOT_BYPASS_REVIEW',
        });
      }

      if (currentAff.status !== 'SUSPENDED') {
        return res.status(409).json({
          success: false,
          error: `Thao tác không hợp lệ: Chỉ cộng tác viên đang ở trạng thái Tạm ngưng (SUSPENDED) mới có thể kích hoạt lại (trạng thái hiện tại: ${currentAff.status}).`,
          code: 'INVALID_STATUS',
        });
      }

      // Kiểm tra xác thực email
      let isEmailVerified = false;
      try {
        if (currentAff.user_id) {
          const { data: authUserObj } = await supabase.auth.admin.getUserById(currentAff.user_id);
          isEmailVerified = !!authUserObj?.user?.email_confirmed_at;
        }
      } catch (authErr: any) {
        console.error('[API REACTIVATE EMAIL CHECK ERROR]', authErr?.message);
      }

      if (!isEmailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Không thể kích hoạt lại hồ sơ do email của Cộng tác viên chưa được xác thực.',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }

      // Try RPC fn_reactivate_affiliate_profile
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_reactivate_affiliate_profile', {
          p_affiliate_id: id,
          p_actor_id: actorId,
          p_note: cleanNote,
          p_client_ip: req.ip || null,
          p_user_agent: req.headers['user-agent'] || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          const { data: fullUpdated } = await supabase
            .from('affiliate_profiles')
            .select(`
              *,
              profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
              reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
            `)
            .eq('id', id)
            .maybeSingle();

          return res.json({
            success: true,
            message: 'Kích hoạt lại hoạt động CTV thành công!',
            data: fullUpdated || rpcRes,
          });
        }
      } catch (rpcEx: any) {
        console.warn('[RPC fn_reactivate_affiliate_profile fallback]:', rpcEx?.message);
      }

      // Fallback atomic update
      const { data: updatedAff, error: updateErr } = await supabase
        .from('affiliate_profiles')
        .update({
          status: 'ACTIVE',
          reactivated_by: actorId,
          reactivated_at: nowIso,
          reactivation_note: cleanNote,
          updated_at: nowIso,
        })
        .eq('id', id)
        .eq('status', 'SUSPENDED')
        .select(`
          *,
          profile:profiles!affiliate_profiles_user_id_fkey(id, email, full_name, phone, role, is_active),
          reviewer:profiles!affiliate_profiles_reviewed_by_fkey(id, full_name, email)
        `)
        .maybeSingle();

      if (updateErr) {
        console.error('[API REACTIVATE AFFILIATE UPDATE ERROR]', updateErr);
        return res.status(500).json({ success: false, error: 'Lỗi cập nhật CSDL.' });
      }

      if (!updatedAff) {
        return res.status(409).json({
          success: false,
          error: 'Trạng thái hồ sơ đã thay đổi bởi thao tác khác, vui lòng tải lại trang.',
          code: 'CONCURRENT_CONFLICT',
        });
      }

      // Insert audit log
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action: 'AFFILIATE_REACTIVATED',
          entity_name: 'affiliate_profiles',
          entity_id: id,
          old_values: { status: 'SUSPENDED', suspension_reason: currentAff.suspension_reason },
          new_values: {
            status: 'ACTIVE',
            reactivated_by: actorId,
            reactivated_at: nowIso,
            reactivation_note: cleanNote,
          },
          reason: cleanNote,
          ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
        });
      } catch (err: any) {
        console.warn('[AUDIT LOG INSERT NOTICE]:', err?.message);
      }

      return res.json({
        success: true,
        message: 'Kích hoạt lại hoạt động CTV thành công!',
        data: updatedAff,
      });
    } catch (err: any) {
      console.error('[API REACTIVATE AFFILIATE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi kết nối máy chủ.' });
    }
  };

  app.post('/api/v1/admin/affiliates/:id/approve', requireStaffOrAdmin, (req: Request, res: Response) => {
    return handleReviewAffiliate(req, res, 'APPROVE');
  });

  app.post('/api/v1/admin/affiliates/:id/reject', requireStaffOrAdmin, (req: Request, res: Response) => {
    return handleReviewAffiliate(req, res, 'REJECT');
  });

  app.post('/api/v1/admin/affiliates/:id/suspend', requireStaffOrAdmin, (req: Request, res: Response) => {
    return handleSuspendAffiliate(req, res);
  });

  app.post('/api/v1/admin/affiliates/:id/reactivate', requireStaffOrAdmin, (req: Request, res: Response) => {
    return handleReactivateAffiliate(req, res);
  });

  app.patch('/api/v1/admin/affiliates/:id/status', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { status } = req.body;
    const { id } = req.params;

    if (status === 'ACTIVE') {
      const demoAff = [
        demoState.pendingAffiliate,
        demoState.pendingVerifiedAffiliate,
        demoState.activeAffiliate,
        demoState.suspendedAffiliate,
        demoState.rejectedAffiliate,
      ].find(a => a && a.id === id);

      if (demoAff) {
        if (demoAff.status === 'SUSPENDED') {
          return handleReactivateAffiliate(req, res);
        } else {
          return handleReviewAffiliate(req, res, 'APPROVE');
        }
      }

      const { data: dbAff } = await supabase
        .from('affiliate_profiles')
        .select('status')
        .eq('id', id)
        .maybeSingle();

      if (dbAff?.status === 'SUSPENDED') {
        return handleReactivateAffiliate(req, res);
      } else {
        return handleReviewAffiliate(req, res, 'APPROVE');
      }
    } else if (status === 'SUSPENDED') {
      return handleSuspendAffiliate(req, res);
    } else if (status === 'REJECTED') {
      return handleReviewAffiliate(req, res, 'REJECT');
    }

    return res.status(400).json({
      success: false,
      error: 'Trạng thái chuyển tiếp không hợp lệ. Chỉ chấp nhận ACTIVE, SUSPENDED, hoặc REJECTED.',
    });
  });

  // Endpoint mô phỏng xác thực email cho testing demo state
  app.post('/api/v1/admin/affiliates/:id/simulate-email-verification', requireStaffOrAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { verified } = req.body;
    if (id === demoState.pendingAffiliate.id) {
      (demoState.pendingAffiliate as any).email_verified = verified !== false;
      return res.json({
        success: true,
        message: `Đã cập nhật mô phỏng email_verified = ${(demoState.pendingAffiliate as any).email_verified}`,
        data: demoState.pendingAffiliate,
      });
    }
    return res.json({ success: true });
  });

  // Endpoint thiết lập lại dữ liệu kiểm thử demo
  app.post('/api/v1/admin/affiliates/demo/reset', requireStaffOrAdmin, (req: Request, res: Response) => {
    demoState.pendingAffiliate.status = 'PENDING_REVIEW';
    demoState.pendingAffiliate.reviewed_by = undefined;
    demoState.pendingAffiliate.reviewed_at = undefined;
    demoState.pendingAffiliate.review_note = 'Hồ sơ đang chờ Ban Tuyển sinh đối chiếu thông tin cá nhân.';
    demoState.pendingAffiliate.email_verified = false;

    demoState.pendingVerifiedAffiliate.status = 'PENDING_REVIEW';
    demoState.pendingVerifiedAffiliate.reviewed_by = undefined;
    demoState.pendingVerifiedAffiliate.reviewed_at = undefined;
    demoState.pendingVerifiedAffiliate.review_note = 'Hồ sơ chờ phê duyệt sau khi đã xác thực email thành công.';
    demoState.pendingVerifiedAffiliate.email_verified = true;

    demoState.activeAffiliate.status = 'ACTIVE';
    demoState.activeAffiliate.suspended_by = undefined;
    demoState.activeAffiliate.suspended_at = undefined;
    demoState.activeAffiliate.suspension_reason = undefined;

    demoState.suspendedAffiliate.status = 'SUSPENDED';
    demoState.suspendedAffiliate.suspension_reason = 'Tài khoản đang bị tạm ngưng do vi phạm chính sách truyền thông tuyển sinh.';
    demoState.suspendedAffiliate.email_verified = true;

    demoState.auditLogs = [];
    return res.json({
      success: true,
      message: 'Đã thiết lập lại trạng thái demo thành công.',
    });
  });

  // 2. Quản lý Khóa học (Yêu cầu A2.1: Danh sách, Tìm kiếm & Phân trang)
  app.get('/api/v1/admin/courses', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { search, page, limit } = req.query;

      const pageNum = Math.max(1, parseInt(String(page || '1'), 10) || 1);
      let limitNum = parseInt(String(limit || '20'), 10) || 20;
      if (![20, 50, 100].includes(limitNum)) {
        limitNum = 20;
      }

      const cleanSearch = typeof search === 'string' ? search.trim() : '';
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      // 1. Truy vấn từ CSDL Supabase
      try {
        let query = supabase
          .from('courses')
          .select('id, code, title, slug, degree_level, career_group, duration_text, tuition_fee_estimate, is_active, updated_at, created_at', { count: 'exact' });

        if (cleanSearch) {
          // Xử lý an toàn ký tự đặc biệt, tránh phá vỡ cú pháp PostgREST .or()
          const safeTerm = cleanSearch.replace(/[,()]/g, ' ').trim();
          if (safeTerm) {
            query = query.or(`code.ilike.%${safeTerm}%,title.ilike.%${safeTerm}%,degree_level.ilike.%${safeTerm}%`);
          }
        }

        // Sắp xếp mặc định: ngày tạo mới nhất (created_at DESC), dùng thêm id (ASC) để giữ thứ tự ổn định
        query = query.order('created_at', { ascending: false }).order('id', { ascending: true });

        // Phân trang tại server / database
        query = query.range(from, to);

        const { data: dbCourses, count, error } = await query;

        if (!error && dbCourses && dbCourses.length > 0) {
          const total = count ?? dbCourses.length;
          const totalPages = Math.max(1, Math.ceil(total / limitNum));
          return res.json({
            success: true,
            data: dbCourses.map(attachCourseFull),
            pagination: {
              page: pageNum,
              limit: limitNum,
              total,
              totalPages,
            },
          });
        }

        // Nếu count === 0 nghĩa là tìm kiếm không có kết quả khớp trong CSDL
        if (!error && count === 0) {
          return res.json({
            success: true,
            data: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 1,
            },
          });
        }
      } catch (dbErr: any) {
        console.warn('[ADMIN COURSES DB QUERY WARNING]', dbErr?.message);
      }

      // 2. Dự phòng an toàn (Fallback sang INITIAL_COURSES nếu CSDL rỗng hoặc ngoại lệ)
      let filtered = INITIAL_COURSES;
      if (cleanSearch) {
        const term = cleanSearch.toLowerCase();
        filtered = INITIAL_COURSES.filter(c => 
          (c.code && c.code.toLowerCase().includes(term)) ||
          (c.title && c.title.toLowerCase().includes(term)) ||
          (c.degree_level && c.degree_level.toLowerCase().includes(term))
        );
      }

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limitNum));
      const paginatedData = filtered.slice(from, to + 1).map((c, idx) => ({
        id: (c as any).id || `course-${c.code.toLowerCase()}`,
        code: c.code,
        title: c.title,
        degree_level: c.degree_level,
        career_group: (c as any).career_group || null,
        duration_text: c.duration_text,
        tuition_fee_estimate: c.tuition_fee_estimate,
        is_active: c.is_active,
        updated_at: (c as any).updated_at || '2026-09-29T14:19:20.869801+00:00',
      }));

      return res.json({
        success: true,
        data: paginatedData.map(attachCourseFull),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (err: any) {
      console.error('[ADMIN COURSES API EXCEPTION]', err);
      return res.status(500).json({
        success: false,
        error: 'Lỗi truy vấn danh sách khóa học từ máy chủ.',
      });
    }
  });

  app.get('/api/v1/admin/courses/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học.' });
      }

      return res.json({ success: true, data: attachCourseFull(data) });
    } catch (err: any) {
      console.error('[GET COURSE BY ID EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi lấy chi tiết khóa học.' });
    }
  });

  app.post('/api/v1/admin/courses/upload', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { imageBase64, fileName } = req.body;
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu ảnh tải lên.' });
      }

      let base64Data = imageBase64;
      if (imageBase64.includes('base64,')) {
        base64Data = imageBase64.split('base64,')[1];
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(base64Data, 'base64');
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Dữ liệu ảnh base64 không hợp lệ.' });
      }

      if (buffer.length === 0) {
        return res.status(400).json({ success: false, error: 'File ảnh rỗng.' });
      }
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Dung lượng ảnh vượt quá giới hạn 5 MB.' });
      }

      let mimeType = 'image/jpeg';
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isWebp = buffer.length > 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

      if (isJpeg) mimeType = 'image/jpeg';
      else if (isPng) mimeType = 'image/png';
      else if (isWebp) mimeType = 'image/webp';
      else {
        return res.status(400).json({ success: false, error: 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG và WebP.' });
      }

      const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const uniqueName = `course_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('course-thumbnails')
        .upload(uniqueName, buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadErr) {
        console.error('[STORAGE UPLOAD ERROR]', uploadErr);
        return res.status(400).json({ success: false, error: `Lỗi tải ảnh lên Storage: ${uploadErr.message}` });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('course-thumbnails')
        .getPublicUrl(uniqueName);

      return res.json({
        success: true,
        url: publicUrl,
        path: uniqueName,
        message: 'Tải ảnh lên thành công!',
      });
    } catch (err: any) {
      console.error('[COURSE UPLOAD EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi xử lý tải ảnh lên.' });
    }
  });

  app.post('/api/v1/admin/courses', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { code, title, degree_level, duration_text, tuition_fee_estimate, summary, description_html, benefits_title, benefits_content, thumbnail_url, career_group } = req.body;

      if (!code || !title || !degree_level || !duration_text) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng điền đầy đủ các thông tin bắt buộc: Mã khóa học, Tên khóa học, Hệ đào tạo và Thời lượng.',
        });
      }

      const cleanCode = String(code).trim().toUpperCase();
      const cleanTitle = String(title).trim();
      const cleanDegree = String(degree_level).trim();
      const VALID_DEGREE_LEVELS = ['Trung cấp', 'Ngắn hạn', 'Chuyên đề'];
      if (!VALID_DEGREE_LEVELS.includes(cleanDegree)) {
        return res.status(400).json({
          success: false,
          error: 'Hệ đào tạo không hợp lệ. Vui lòng chọn một trong các hệ: Trung cấp, Ngắn hạn, Chuyên đề.',
        });
      }

      const VALID_CAREER_GROUPS = ['Làm bánh', 'Nấu ăn', 'Nhà hàng', 'Khách sạn', 'Pha chế'];
      let cleanCareerGroup: string | null = null;
      if (career_group !== undefined && career_group !== null && String(career_group).trim() !== '') {
        const cg = String(career_group).trim();
        if (!VALID_CAREER_GROUPS.includes(cg)) {
          return res.status(400).json({
            success: false,
            error: 'Nhóm nghề không hợp lệ. Vui lòng chọn một trong các nhóm: Làm bánh, Nấu ăn, Nhà hàng, Khách sạn, Pha chế hoặc để trống.',
          });
        }
        cleanCareerGroup = cg;
      }

      const cleanDuration = String(duration_text).trim();
      const tuitionFee = tuition_fee_estimate !== undefined && tuition_fee_estimate !== null && tuition_fee_estimate !== '' ? Number(tuition_fee_estimate) : null;

      if (tuitionFee !== null && (isNaN(tuitionFee) || tuitionFee < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Học phí phải là số không âm.',
        });
      }

      const slug = cleanCode.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      const cleanBenefitsTitle = benefits_title !== undefined ? (benefits_title ? String(benefits_title).trim() : null) : null;
      const cleanBenefitsContent = benefits_content !== undefined ? (benefits_content ? String(benefits_content).trim() : null) : null;

      let insertPayload: any = {
        code: cleanCode,
        title: cleanTitle,
        slug,
        department: 'Khoa Du lịch - Khách sạn',
        degree_level: cleanDegree,
        career_group: cleanCareerGroup,
        duration_text: cleanDuration,
        tuition_fee_estimate: tuitionFee,
        summary: summary !== undefined ? (summary ? String(summary).trim() : null) : null,
        description_html: description_html !== undefined ? (description_html ? String(description_html).trim() : null) : null,
        benefits_title: cleanBenefitsTitle,
        benefits_content: cleanBenefitsContent,
        thumbnail_url: thumbnail_url !== undefined ? (thumbnail_url ? String(thumbnail_url).trim() : null) : null,
        is_active: true,
        sort_order: 0,
      };

      let { data, error } = await supabase
        .from('courses')
        .insert(insertPayload)
        .select()
        .single();

      if (
        error &&
        (error.code === '42703' ||
          error.code === 'PGRST204' ||
          (error.message && (error.message.includes('schema cache') || error.message.includes('column'))))
      ) {
        // Fallback if benefits columns do not exist in DB yet
        delete insertPayload.benefits_title;
        delete insertPayload.benefits_content;
        const res2 = await supabase.from('courses').insert(insertPayload).select().single();
        data = res2.data;
        error = res2.error;
      }

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({
            success: false,
            error: `Mã khóa học "${cleanCode}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
          });
        }
        return res.status(400).json({ success: false, error: error.message });
      }

      if (data && data.id) {
        saveCourseBenefits(data.id, {
          benefits_title: cleanBenefitsTitle,
          benefits_content: cleanBenefitsContent,
        });
      }

      return res.json({
        success: true,
        message: 'Tạo khóa học mới thành công!',
        data: attachCourseBenefits(data),
      });
    } catch (err: any) {
      console.error('[CREATE COURSE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi tạo khóa học.' });
    }
  });

  app.patch('/api/v1/admin/courses/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { code, title, degree_level, duration_text, tuition_fee_estimate, summary, description_html, benefits_title, benefits_content, thumbnail_url, career_group, is_active, client_updated_at } = req.body;

      const { data: existing, error: fetchErr } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học cần cập nhật.' });
      }

      if (client_updated_at && existing.updated_at) {
        const serverTime = new Date(existing.updated_at).getTime();
        const clientTime = new Date(client_updated_at).getTime();
        if (Math.abs(serverTime - clientTime) > 3000) {
          return res.status(409).json({
            success: false,
            error: 'Xung đột cập nhật: Dữ liệu khóa học này đã được chỉnh sửa bởi người khác. Vui lòng tải lại trang để lấy thông tin mới nhất.',
          });
        }
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (code !== undefined) {
        const cleanCode = String(code).trim().toUpperCase();
        if (!cleanCode) {
          return res.status(400).json({ success: false, error: 'Mã khóa học không được để trống.' });
        }
        updatePayload.code = cleanCode;
        updatePayload.slug = cleanCode.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + id.substring(0, 4);
      }
      if (title !== undefined) {
        const cleanTitle = String(title).trim();
        if (!cleanTitle) {
          return res.status(400).json({ success: false, error: 'Tên khóa học không được để trống.' });
        }
        updatePayload.title = cleanTitle;
      }
      if (degree_level !== undefined) {
        const cleanDegree = String(degree_level).trim();
        const VALID_DEGREE_LEVELS = ['Trung cấp', 'Ngắn hạn', 'Chuyên đề'];
        if (!VALID_DEGREE_LEVELS.includes(cleanDegree)) {
          return res.status(400).json({
            success: false,
            error: 'Hệ đào tạo không hợp lệ. Vui lòng chọn một trong các hệ: Trung cấp, Ngắn hạn, Chuyên đề.',
          });
        }
        updatePayload.degree_level = cleanDegree;
      }
      if (duration_text !== undefined) {
        const cleanDuration = String(duration_text).trim();
        if (!cleanDuration) {
          return res.status(400).json({ success: false, error: 'Thời lượng không được để trống.' });
        }
        updatePayload.duration_text = cleanDuration;
      }
      if (tuition_fee_estimate !== undefined) {
        const fee = tuition_fee_estimate === null || tuition_fee_estimate === '' ? null : Number(tuition_fee_estimate);
        if (fee !== null && (isNaN(fee) || fee < 0)) {
          return res.status(400).json({ success: false, error: 'Học phí phải là số không âm.' });
        }
        updatePayload.tuition_fee_estimate = fee;
      }
      if (summary !== undefined) {
        updatePayload.summary = summary ? String(summary).trim() : null;
      }
      if (description_html !== undefined) {
        updatePayload.description_html = description_html ? String(description_html).trim() : null;
      }
      if (benefits_title !== undefined) {
        updatePayload.benefits_title = benefits_title ? String(benefits_title).trim() : null;
      }
      if (benefits_content !== undefined) {
        updatePayload.benefits_content = benefits_content ? String(benefits_content).trim() : null;
      }
      if (thumbnail_url !== undefined) {
        updatePayload.thumbnail_url = thumbnail_url ? String(thumbnail_url).trim() : null;
      }
      if (career_group !== undefined) {
        if (career_group === null || String(career_group).trim() === '') {
          updatePayload.career_group = null;
        } else {
          const cg = String(career_group).trim();
          const VALID_CAREER_GROUPS = ['Làm bánh', 'Nấu ăn', 'Nhà hàng', 'Khách sạn', 'Pha chế'];
          if (!VALID_CAREER_GROUPS.includes(cg)) {
            return res.status(400).json({
              success: false,
              error: 'Nhóm nghề không hợp lệ. Vui lòng chọn một trong các nhóm: Làm bánh, Nấu ăn, Nhà hàng, Khách sạn, Pha chế hoặc để trống.',
            });
          }
          updatePayload.career_group = cg;
        }
      }
      // Lưu ý: Form sửa A2.2 không được thay đổi trạng thái is_active/status ngoài các thao tác chuyên biệt A2.4

      let { data, error } = await supabase
        .from('courses')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (
        error &&
        (error.code === '42703' ||
          error.code === 'PGRST204' ||
          (error.message && (error.message.includes('schema cache') || error.message.includes('column'))))
      ) {
        // Fallback when columns not yet in DB schema
        delete updatePayload.benefits_title;
        delete updatePayload.benefits_content;
        const res2 = await supabase
          .from('courses')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .single();
        data = res2.data;
        error = res2.error;
      }

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({
            success: false,
            error: `Mã khóa học này đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
          });
        }
        return res.status(400).json({ success: false, error: error.message });
      }

      if (benefits_title !== undefined || benefits_content !== undefined) {
        saveCourseBenefits(id, {
          benefits_title: benefits_title !== undefined ? (benefits_title ? String(benefits_title).trim() : null) : undefined,
          benefits_content: benefits_content !== undefined ? (benefits_content ? String(benefits_content).trim() : null) : undefined,
        });
      }

      // Safe cleanup of replaced or removed old thumbnail image (A2.3)
      if (
        thumbnail_url !== undefined &&
        existing.thumbnail_url &&
        existing.thumbnail_url !== updatePayload.thumbnail_url
      ) {
        try {
          const oldUrl = existing.thumbnail_url;
          if (oldUrl.includes('/course-thumbnails/')) {
            const { count } = await supabase
              .from('courses')
              .select('id', { count: 'exact', head: true })
              .eq('thumbnail_url', oldUrl)
              .neq('id', id);

            if (!count || count === 0) {
              const parts = oldUrl.split('/course-thumbnails/');
              if (parts.length > 1) {
                const fileName = parts[1].split('?')[0];
                if (fileName) {
                  await supabase.storage.from('course-thumbnails').remove([fileName]);
                }
              }
            }
          }
        } catch (cleanupErr) {
          console.warn('[STORAGE CLEANUP WARNING]', cleanupErr);
        }
      }

      return res.json({ success: true, message: 'Cập nhật khóa học thành công!', data: attachCourseFull(data) });
    } catch (err: any) {
      console.error('[UPDATE COURSE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi cập nhật khóa học.' });
    }
  });

  // A2.4 – CÔNG KHAI / NGỪNG GIỚI THIỆU / MỞ LẠI GIỚI THIỆU KHÓA HỌC
  app.patch('/api/v1/admin/courses/:id/status', requireStaffOrAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, reason, note } = req.body;

      if (!['PUBLISH', 'STOP_REFERRAL', 'REOPEN_REFERRAL'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Thao tác không hợp lệ. Chỉ chấp nhận các thao tác: PUBLISH, STOP_REFERRAL, REOPEN_REFERRAL.',
        });
      }

      // Xác định người thực hiện từ phiên đăng nhập backend an toàn (A0.3)
      const actorId = (req as any).user?.id || (demoState.currentRole === 'admin' ? demoState.adminUser.id : demoState.staffUser.id);
      const actorName = (req as any).user?.full_name || (demoState.currentRole === 'admin' ? demoState.adminUser.full_name : demoState.staffUser.full_name);
      const actorEmail = (req as any).user?.email || (demoState.currentRole === 'admin' ? demoState.adminUser.email : demoState.staffUser.email);

      // Tra cứu khóa học hiện tại từ CSDL
      let currentCourse: any = null;
      const { data: dbCourse, error: fetchErr } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (dbCourse) {
        currentCourse = attachCourseFull(dbCourse);
      } else {
        const fb = INITIAL_COURSES.find(c => (c as any).id === id || c.code.toLowerCase() === id.toLowerCase());
        if (fb) currentCourse = attachCourseFull(fb);
      }

      if (!currentCourse) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học cần chuyển trạng thái.' });
      }

      const currentStatus = currentCourse.status; // 'DRAFT' | 'ACTIVE' | 'STOPPED'

      // Kiểm tra trạng thái hiện tại để tránh xử lý trùng hoặc ghi đè thao tác đồng thời
      if (action === 'PUBLISH') {
        if (currentStatus === 'ACTIVE') {
          return res.status(400).json({
            success: false,
            error: 'Khóa học đã ở trạng thái Công khai và đang nhận giới thiệu.',
          });
        }
        // Kiểm tra tối thiểu trước khi công khai: mã, tên, hệ đào tạo, thời lượng, mô tả ngắn hợp lệ
        if (!currentCourse.code?.trim() || !currentCourse.title?.trim() || !currentCourse.degree_level?.trim() || !currentCourse.duration_text?.trim() || !currentCourse.summary?.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Khóa học phải có đầy đủ thông tin tối thiểu hợp lệ trước khi công khai: Mã khóa học, Tên khóa học, Hệ đào tạo, Thời lượng và Mô tả ngắn.',
          });
        }
      } else if (action === 'STOP_REFERRAL') {
        if (currentStatus === 'STOPPED') {
          return res.status(400).json({
            success: false,
            error: 'Khóa học đã ở trạng thái Ngừng tiếp nhận giới thiệu.',
          });
        }
        if (!reason || !String(reason).trim()) {
          return res.status(400).json({
            success: false,
            error: 'Bắt buộc phải nhập lý do khi ngừng giới thiệu khóa học.',
          });
        }
      } else if (action === 'REOPEN_REFERRAL') {
        if (currentStatus === 'ACTIVE') {
          return res.status(400).json({
            success: false,
            error: 'Khóa học hiện đang mở nhận giới thiệu bình thường.',
          });
        }
      }

      // Xác định trạng thái mới
      let newStatus: 'DRAFT' | 'ACTIVE' | 'STOPPED' = 'ACTIVE';
      let newIsActive = true;
      let newAcceptsReferrals = true;
      let newStopReason: string | null = null;
      let newStatusNote: string | null = null;

      if (action === 'PUBLISH') {
        newStatus = 'ACTIVE';
        newIsActive = true;
        newAcceptsReferrals = true;
        newStatusNote = note ? String(note).trim() : null;
      } else if (action === 'STOP_REFERRAL') {
        newStatus = 'STOPPED';
        newIsActive = true;
        newAcceptsReferrals = false;
        newStopReason = String(reason).trim();
      } else if (action === 'REOPEN_REFERRAL') {
        newStatus = 'ACTIVE';
        newIsActive = true;
        newAcceptsReferrals = true;
        newStatusNote = note ? String(note).trim() : null;
      }

      const nowIso = new Date().toISOString();
      const updatePayload: any = {
        is_active: newIsActive,
        status: newStatus,
        accepts_referrals: newAcceptsReferrals,
        stop_reason: newStopReason,
        status_note: newStatusNote,
        status_updated_at: nowIso,
        status_updated_by: actorId,
        updated_at: nowIso,
      };

      // Cập nhật CSDL Supabase với cơ chế dự phòng an toàn
      let { data: updatedDb, error: updateErr } = await supabase
        .from('courses')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (
        updateErr &&
        (updateErr.code === '42703' ||
          updateErr.code === 'PGRST204' ||
          (updateErr.message && (updateErr.message.includes('schema cache') || updateErr.message.includes('column'))))
      ) {
        // Fallback: chỉ cập nhật is_active và updated_at nếu các cột mở rộng chưa tạo trong remote cache
        const fallbackRes = await supabase
          .from('courses')
          .update({ is_active: newIsActive, updated_at: nowIso })
          .eq('id', id)
          .select()
          .single();
        updatedDb = fallbackRes.data;
      }

      // Lưu trạng thái vào persistent companion store
      saveCourseStatus(id, {
        status: newStatus,
        accepts_referrals: newAcceptsReferrals,
        stop_reason: newStopReason,
        status_note: newStatusNote,
        status_updated_at: nowIso,
        status_updated_by: actorId,
      });

      // Ghi nhật ký kiểm toán (audit_logs)
      const auditActionMap: Record<string, string> = {
        PUBLISH: 'COURSE_PUBLISHED',
        STOP_REFERRAL: 'COURSE_REFERRAL_STOPPED',
        REOPEN_REFERRAL: 'COURSE_REFERRAL_REOPENED',
      };
      const auditAction = auditActionMap[action] || 'COURSE_STATUS_CHANGED';
      const auditReason = newStopReason || newStatusNote || (action === 'PUBLISH' ? 'Công khai khóa học' : 'Mở lại giới thiệu khóa học');

      const auditRecord = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        actor_id: actorId,
        action: auditAction,
        entity_name: 'courses',
        entity_id: id,
        old_values: {
          status: currentStatus,
          is_active: currentCourse.is_active,
          accepts_referrals: currentCourse.accepts_referrals,
        },
        new_values: {
          status: newStatus,
          is_active: newIsActive,
          accepts_referrals: newAcceptsReferrals,
        },
        reason: auditReason,
        actor: {
          id: actorId,
          full_name: actorName,
          email: actorEmail,
        },
        created_at: nowIso,
      };

      demoState.auditLogs.unshift(auditRecord);

      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action: auditAction,
          entity_name: 'courses',
          entity_id: id,
          old_values: auditRecord.old_values,
          new_values: auditRecord.new_values,
          reason: auditReason,
        });
      } catch (auditDbErr) {
        console.warn('[AUDIT LOG DB NOTICE]', auditDbErr);
      }

      const finalCourse = attachCourseFull(updatedDb || { ...currentCourse, ...updatePayload });

      const successMessages: Record<string, string> = {
        PUBLISH: 'Công khai khóa học thành công! Khóa học hiện đã hiển thị và tiếp nhận đăng ký.',
        STOP_REFERRAL: 'Ngừng tiếp nhận giới thiệu thành công! Link cũ vẫn xem được nội dung nhưng không tạo đăng ký mới.',
        REOPEN_REFERRAL: 'Mở lại tiếp nhận giới thiệu thành công! Link cũ và quyền giới thiệu đã được khôi phục.',
      };

      return res.json({
        success: true,
        message: successMessages[action] || 'Cập nhật trạng thái khóa học thành công!',
        data: finalCourse,
      });
    } catch (err: any) {
      console.error('[COURSE STATUS CHANGE EXCEPTION]', err);
      return res.status(500).json({ success: false, error: 'Lỗi máy chủ khi thay đổi trạng thái khóa học.' });
    }
  });

  // 3. Quản lý Leads
  app.get('/api/v1/admin/leads', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { data: leads } = await supabase
      .from('leads')
      .select('*, courses(title, code), affiliate_profiles(affiliate_code)')
      .order('created_at', { ascending: false });

    const seedLeads = [
      {
        id: 'lead-admin-01',
        full_name: 'Nguyễn Hoàng Khang',
        phone: '0909182736',
        email: 'hoangkhang.nguyen@gmail.com',
        province: 'TP. Hồ Chí Minh',
        course_id: 'CBMA-TC-01',
        counseling_status: 'CONSULTING',
        reconciliation_status: 'MATCHED_VALID',
        reward_status: 'APPROVED',
        affiliate_code_captured: 'STHCCTV1088',
        preferred_contact_time: 'Buổi chiều (14h - 17h)',
        customer_note: 'Muốn học bếp bánh và bếp Á để mở quán ăn gia đình.',
        counselor_note: 'Đã tư vấn ca học ban ngày, thí sinh đã đến trường làm thủ tục nhập học.',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      },
      {
        id: 'lead-admin-02',
        full_name: 'Trần Mỹ Linh',
        phone: '0938456789',
        email: 'mylinh.tran@yahoo.com',
        province: 'Đồng Nai',
        course_id: 'QTKS-TC-03',
        counseling_status: 'CONTACTED',
        reconciliation_status: 'MATCHED_VALID',
        reward_status: 'PENDING_APPROVAL',
        affiliate_code_captured: 'STHCCTV1088',
        preferred_contact_time: 'Buổi sáng (09h - 11h30)',
        customer_note: 'Quan tâm chính sách thực tập tại Caravelle Hotel.',
        counselor_note: 'Đã xác nhận biên lai đóng học phí kỳ 1 tại văn phòng tuyển sinh.',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      },
      {
        id: 'lead-admin-03',
        full_name: 'Phạm Đức Trọng',
        phone: '0912345678',
        email: 'ductrong.pham@gmail.com',
        province: 'Bình Dương',
        course_id: 'BB-TC-02',
        counseling_status: 'NEW',
        reconciliation_status: 'NOT_RECONCILED',
        reward_status: 'NONE',
        affiliate_code_captured: 'STHCCTV1088',
        preferred_contact_time: 'Tối sau 18h',
        customer_note: 'Cần tư vấn thời khóa biểu các lớp buổi tối.',
        counselor_note: '',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
    ];

    res.json({
      success: true,
      data: leads && leads.length > 0 ? [...leads, ...seedLeads] : seedLeads,
    });
  });

  app.patch('/api/v1/admin/leads/:id/counseling-status', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { counseling_status, counselor_note } = req.body;

    const { data, error } = await supabase
      .from('leads')
      .update({
        counseling_status,
        counselor_note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('DB lead update notice:', error.message);
    }

    res.json({
      success: true,
      message: 'Cập nhật tiến độ tư vấn thành công!',
      data: { id, counseling_status, counselor_note },
    });
  });

  // 4. Đối soát thủ công Hồ sơ & Học phí (POST /api/v1/admin/leads/:id/reconcile)
  app.post('/api/v1/admin/leads/:id/reconcile', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id: leadId } = req.params;
    const {
      external_admission_code,
      external_student_code,
      tuition_fee_collected,
      receipt_number,
      tuition_paid_at,
      staff_note,
    } = req.body;

    if (!external_admission_code || !tuition_fee_collected || !tuition_paid_at) {
      return res.status(400).json({
        success: false,
        error: 'Mã hồ sơ tuyển sinh ngoại bộ, học phí thực thu và ngày đóng học phí là bắt buộc.',
      });
    }

    const cleanCode = external_admission_code.trim();

    // Thử gọi Database RPC fn_reconcile_lead_and_create_reward
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('fn_reconcile_lead_and_create_reward', {
        p_lead_id: leadId,
        p_staff_id: demoState.adminUser.id,
        p_external_admission_code: cleanCode,
        p_external_student_code: external_student_code || null,
        p_tuition_fee_collected: Number(tuition_fee_collected),
        p_receipt_number: receipt_number || null,
        p_tuition_paid_at: tuition_paid_at,
        p_staff_note: staff_note || 'Đối soát hồ sơ thực tế tại văn phòng tuyển sinh',
      });

      if (!rpcError && rpcResult) {
        return res.json({
          success: true,
          message: 'Đối soát hồ sơ thành công và đã tự động khởi tạo khoản thưởng 500.000 VNĐ chờ duyệt!',
          data: rpcResult,
        });
      }
    } catch (e: any) {
      console.warn('RPC fn_reconcile_lead_and_create_reward fallback to API handler:', e.message);
    }

    // Server-level execution fallback if RPC not invoked
    const { data: existingRecon } = await supabase
      .from('lead_reconciliations')
      .select('id')
      .eq('external_admission_code', cleanCode)
      .eq('reconciliation_status', 'MATCHED_VALID')
      .maybeSingle();

    if (existingRecon) {
      return res.status(409).json({
        success: false,
        error: `Mã hồ sơ tuyển sinh ngoại bộ "${cleanCode}" đã được đối soát cho một học viên khác trong hệ thống. Vui lòng kiểm tra lại.`,
      });
    }

    // Insert reconciliation record
    const { data: newRecon } = await supabase
      .from('lead_reconciliations')
      .insert({
        lead_id: leadId,
        staff_id: demoState.adminUser.id,
        external_admission_code: cleanCode,
        external_student_code: external_student_code || null,
        tuition_fee_collected: Number(tuition_fee_collected),
        receipt_number: receipt_number || null,
        tuition_paid_at,
        reconciliation_status: 'MATCHED_VALID',
        staff_note: staff_note || null,
      })
      .select('id')
      .maybeSingle();

    // Update lead
    await supabase
      .from('leads')
      .update({
        reconciliation_status: 'MATCHED_VALID',
        reward_status: 'PENDING_APPROVAL',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Create reward
    const { data: newReward } = await supabase
      .from('rewards')
      .insert({
        lead_id: leadId,
        reconciliation_id: newRecon?.id || null,
        affiliate_id: demoState.activeAffiliate.id,
        amount: 500000.00,
        status: 'PENDING_APPROVAL',
      })
      .select('id')
      .maybeSingle();

    // Log to audit
    await supabase.from('audit_logs').insert({
      actor_id: demoState.adminUser.id,
      action: 'RECONCILE_LEAD',
      entity_name: 'leads',
      entity_id: leadId,
      old_values: { reconciliation_status: 'NOT_RECONCILED', reward_status: 'NONE' },
      new_values: { reconciliation_status: 'MATCHED_VALID', reward_status: 'PENDING_APPROVAL', external_admission_code: cleanCode },
      reason: staff_note || 'Đối soát khớp hồ sơ và học phí thực thu',
    });

    res.json({
      success: true,
      message: 'Đối soát thành công! Đã tự động tạo khoản thưởng 500.000 VNĐ đang chờ Trưởng bộ phận Tuyển sinh phê duyệt.',
      data: {
        lead_id: leadId,
        reconciliation_id: newRecon?.id,
        reward_id: newReward?.id,
        reward_created: true,
      },
    });
  });

  // 5. Hủy ghép đối soát có lý do (POST /api/v1/admin/leads/:id/void-reconciliation)
  app.post('/api/v1/admin/leads/:id/void-reconciliation', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id: leadId } = req.params;
    const { void_reason } = req.body;

    if (!void_reason || void_reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Bắt buộc phải nhập lý do hủy ghép đối soát để bảo toàn lịch sử kiểm toán.',
      });
    }

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('fn_void_reconciliation_and_reward', {
        p_lead_id: leadId,
        p_staff_id: demoState.adminUser.id,
        p_void_reason: void_reason.trim(),
      });

      if (!rpcError && rpcResult) {
        return res.json({
          success: true,
          message: 'Đã hủy ghép đối soát thành công và bảo toàn lịch sử kiểm toán!',
          data: rpcResult,
        });
      }
    } catch (e: any) {
      console.warn('RPC fn_void_reconciliation_and_reward fallback:', e.message);
    }

    // Fallback update
    await supabase
      .from('lead_reconciliations')
      .update({
        reconciliation_status: 'VOIDED',
        void_reason: void_reason.trim(),
        voided_by: demoState.adminUser.id,
        voided_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .eq('reconciliation_status', 'MATCHED_VALID');

    await supabase
      .from('rewards')
      .update({
        status: 'VOIDED',
        void_reason: void_reason.trim(),
        voided_by: demoState.adminUser.id,
        voided_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
      .in('status', ['PENDING_APPROVAL', 'APPROVED']);

    await supabase
      .from('leads')
      .update({
        reconciliation_status: 'NOT_RECONCILED',
        reward_status: 'NONE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    res.json({
      success: true,
      message: 'Hủy ghép thành công! Mã hồ sơ đã được giải phóng để đối soát lại.',
    });
  });

  // 6. Xem lịch sử đối soát và thưởng của 1 lead
  app.get('/api/v1/admin/leads/:id/history', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id: leadId } = req.params;

    const { data: reconciliations } = await supabase
      .from('lead_reconciliations')
      .select('*')
      .eq('lead_id', leadId)
      .order('reconciled_at', { ascending: false });

    const { data: rewards } = await supabase
      .from('rewards')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: {
        reconciliations: reconciliations || [],
        rewards: rewards || [],
      },
    });
  });

  // 7. Quản lý Thưởng (Phê duyệt / Từ chối)
  app.get('/api/v1/admin/rewards', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { data: rewards } = await supabase
      .from('rewards')
      .select('*, leads(full_name, phone), affiliate_profiles(affiliate_code, id_card_number)')
      .order('created_at', { ascending: false });

    const mockAdminRewards = [
      {
        id: 'rew-adm-01',
        lead_id: 'lead-admin-01',
        affiliate_id: demoState.activeAffiliate.id,
        candidate_name: 'Nguyễn Hoàng Khang',
        affiliate_code: 'STHCCTV1088',
        affiliate_name: 'Trần Thị Thu Thảo',
        id_card_number: '079201001234',
        amount: 500000.00,
        status: 'APPROVED',
        external_admission_code: 'STHC-2026-TS-0188',
        approved_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
      },
      {
        id: 'rew-adm-02',
        lead_id: 'lead-admin-02',
        affiliate_id: demoState.activeAffiliate.id,
        candidate_name: 'Trần Mỹ Linh',
        affiliate_code: 'STHCCTV1088',
        affiliate_name: 'Trần Thị Thu Thảo',
        id_card_number: '079201001234',
        amount: 500000.00,
        status: 'PENDING_APPROVAL',
        external_admission_code: 'STHC-2026-TS-0215',
        approved_at: null,
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      },
    ];

    res.json({
      success: true,
      data: rewards && rewards.length > 0 ? [...rewards, ...mockAdminRewards] : mockAdminRewards,
    });
  });

  app.post('/api/v1/admin/rewards/:id/approve', requireAdminOnly, async (req: Request, res: Response) => {
    const { id: rewardId } = req.params;

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('fn_approve_reward', {
        p_reward_id: rewardId,
        p_admin_id: demoState.adminUser.id,
      });

      if (!rpcError && rpcResult) {
        return res.json({
          success: true,
          message: 'Phê duyệt khoản thưởng 500.000 VNĐ thành công!',
          data: rpcResult,
        });
      }
    } catch (e: any) {
      console.warn('RPC fn_approve_reward fallback:', e.message);
    }

    await supabase
      .from('rewards')
      .update({
        status: 'APPROVED',
        approved_by: demoState.adminUser.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', rewardId);

    res.json({
      success: true,
      message: 'Phê duyệt khoản thưởng 500.000 VNĐ thành công!',
      status: 'APPROVED',
    });
  });

  app.post('/api/v1/admin/rewards/:id/reject', requireAdminOnly, async (req: Request, res: Response) => {
    const { id: rewardId } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Bắt buộc phải nhập lý do từ chối phê duyệt thưởng.',
      });
    }

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('fn_reject_reward', {
        p_reward_id: rewardId,
        p_admin_id: demoState.adminUser.id,
        p_rejection_reason: rejection_reason.trim(),
      });

      if (!rpcError && rpcResult) {
        return res.json({
          success: true,
          message: 'Đã từ chối duyệt thưởng!',
          data: rpcResult,
        });
      }
    } catch (e: any) {
      console.warn('RPC fn_reject_reward fallback:', e.message);
    }

    await supabase
      .from('rewards')
      .update({
        status: 'REJECTED',
        rejection_reason: rejection_reason.trim(),
        approved_by: demoState.adminUser.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', rewardId);

    res.json({
      success: true,
      message: 'Đã từ chối duyệt thưởng.',
      status: 'REJECTED',
    });
  });

  // 8. Nhật ký Kiểm toán (AUDIT LOGS)
  app.get('/api/v1/admin/audit-logs', requireAdminOnly, async (req: Request, res: Response) => {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(50);

    const mockLogs = [
      {
        id: 'log-01',
        action: 'ADMIN_BOOTSTRAP_PROMOTED',
        entity_name: 'profiles',
        entity_id: '879a11fc-ff89-4019-b2f4-57d7843b631b',
        actor_name: 'Super Admin / DBA',
        old_values: { role: 'affiliate', is_active: false },
        new_values: { role: 'admin', is_active: true },
        reason: 'Bootstrap Quản trị viên đầu tiên cho hệ thống STHC_CTV',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'log-02',
        action: 'APPROVE_REWARD',
        entity_name: 'rewards',
        entity_id: 'rew-adm-01',
        actor_name: 'Ban Giám Hiệu / Trưởng Tuyển Sinh',
        old_values: { status: 'PENDING_APPROVAL' },
        new_values: { status: 'APPROVED', amount: 500000 },
        reason: 'Phê duyệt thưởng tuyển sinh 500.000 VNĐ theo biên lai thu học phí',
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      },
      {
        id: 'log-03',
        action: 'RECONCILE_LEAD',
        entity_name: 'leads',
        entity_id: 'lead-admin-01',
        actor_name: 'Võ Minh Quân (Cán bộ Tuyển sinh)',
        old_values: { reconciliation_status: 'NOT_RECONCILED' },
        new_values: { reconciliation_status: 'MATCHED_VALID', external_admission_code: 'STHC-2026-TS-0188' },
        reason: 'Khớp biên lai học phí gốc với phần mềm trường',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      },
    ];

    res.json({
      success: true,
      data: logs && logs.length > 0 ? [...logs, ...mockLogs] : mockLogs,
    });
  });

  // 9. Xuất báo cáo danh sách thưởng APPROVED cho Phòng Kế toán
  app.get('/api/v1/admin/reports/rewards-export', requireAdminOnly, async (req: Request, res: Response) => {
    const csvHeader = 'STT,Ma Khoan Thuong,Ho Ten CTV,So CCCD CTV,Ma Dinh Danh CTV,So Tien Thuong (VND),Ma Ho So Nhap Hoc,Ngay Phe Duyet,Trang Thai\n';
    const csvRows = [
      '1,rew-adm-01,Tran Thi Thu Thao,079201001234,STHCCTV1088,500000,STHC-2026-TS-0188,27/09/2026,APPROVED',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Bang_Ke_Thuong_CTV_STHC_Ketoan.csv"');
    res.send('\uFEFF' + csvHeader + csvRows);
  });

  // ----------------------------------------------------------------------------
  // API 404 HANDLER (Ngăn API không tồn tại bị lọt xuống SPA fallback trả về HTML)
  // ----------------------------------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route không tồn tại: ${req.method} ${req.originalUrl}`,
    });
  });

  // ----------------------------------------------------------------------------
  // VITE INTEGRATION (Dev Middlewares / Production Static)
  // ----------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    // Tìm kiếm thư mục dist thực tế linh hoạt, tương thích với Render, Docker và môi trường cục bộ
    const possibleDistDirs = [
      path.resolve(process.cwd(), 'dist'),
      path.resolve(__dirname, 'dist'),
      path.resolve(__dirname, '../dist'),
    ];

    const distDir = possibleDistDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'assets')))
      || path.resolve(process.cwd(), 'dist');
    const distIndexHtml = path.join(distDir, 'index.html');

    console.log(`[STHC CTV SYSTEM] Production mode active.`);
    console.log(`[STHC CTV SYSTEM] Static assets dir: ${distDir}`);
    console.log(`[STHC CTV SYSTEM] index.html exists: ${fs.existsSync(distIndexHtml)}`);

    // Phục vụ các file tĩnh (js, css, ảnh, fonts...) từ distDir
    app.use(express.static(distDir, {
      index: false,
      maxAge: '1d',
    }));

    // Trả về 404 cho các file assets bị thiếu (tránh fallback trả HTML về cho file .js/.css/.png lỗi)
    app.all('/assets/*', (req: Request, res: Response) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    // SPA Fallback cho các đường dẫn frontend hợp lệ (Express 4.x compatible)
    app.get('*', (req: Request, res: Response) => {
      // Nếu request có phần mở rộng file (vd: .png, .ico, .js) mà không tìm thấy -> 404
      if (path.extname(req.path)) {
        return res.status(404).type('text/plain').send('File not found');
      }

      if (fs.existsSync(distIndexHtml)) {
        res.sendFile(distIndexHtml);
      } else {
        res.status(500).type('text/html').send(`
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <title>Lỗi khởi động - Chưa build Frontend</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0B1E3F; color: #fff; padding: 40px; text-align: center; }
              .box { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 32px; max-width: 640px; margin: 40px auto; }
              h1 { color: #F59E0B; margin-top: 0; }
              code { background: rgba(0,0,0,0.4); padding: 4px 8px; border-radius: 6px; font-size: 14px; color: #93C5FD; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Chưa tìm thấy bản build Frontend (dist/index.html)</h1>
              <p>Hệ thống không tìm thấy file giao diện tại: <code>${distIndexHtml}</code></p>
              <p><strong>Cách khắc phục trên Render:</strong></p>
              <p>Vào Render Dashboard &rarr; <em>Settings</em> &rarr; <em>Build Command</em> và thiết lập:</p>
              <p><code>npm install && npm run build</code></p>
            </div>
          </body>
          </html>
        `);
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[STHC CTV SYSTEM] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
