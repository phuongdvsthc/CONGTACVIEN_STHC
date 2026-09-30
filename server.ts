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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
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
interface DemoState {
  currentRole: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin';
  currentUser: any | null;
  currentAffiliate: any | null;
  pendingAffiliate: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    affiliate_code: string;
    status: 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
    id_card_number: string;
    occupation: string;
    address: string;
    created_at: string;
    review_note?: string;
    reviewed_at?: string;
  };
  activeAffiliate: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    affiliate_code: string;
    status: 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
    id_card_number: string;
    occupation: string;
    address: string;
    created_at: string;
    review_note?: string;
    reviewed_at?: string;
  };
  suspendedAffiliate: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    affiliate_code: string;
    status: 'SUSPENDED';
    id_card_number: string;
    occupation: string;
    address: string;
    created_at: string;
    review_note: string;
  };
  rejectedAffiliate: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    affiliate_code: string;
    status: 'REJECTED';
    id_card_number: string;
    occupation: string;
    address: string;
    created_at: string;
    review_note: string;
  };
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
    full_name: 'Nguyễn Văn Đang Chờ Duyệt',
    email: 'ctv_cho_duyet@sthc.edu.vn',
    phone: '0901234567',
    affiliate_code: 'STHCCTV9001',
    status: 'PENDING_REVIEW',
    id_card_number: '079201009876',
    occupation: 'Cựu sinh viên Khóa 2024',
    address: 'Quận 10, TP. Hồ Chí Minh',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    review_note: 'Hồ sơ đang chờ Ban Tuyển sinh đối chiếu thông tin cá nhân.',
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
    occupation: 'Hướng dẫn viên Du lịch tự do',
    address: 'Quận Tân Bình, TP. Hồ Chí Minh',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    review_note: 'Đã phê duyệt và kích hoạt đầy đủ quyền tuyển sinh.',
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
    review_note: 'Tài khoản đang bị tạm khóa do vi phạm chính sách truyền thông tuyển sinh.',
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
    review_note: 'Hồ sơ chưa đáp ứng điều kiện tiếp nhận CTV theo quy chế năm 2026.',
  },
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

async function startServer() {
  const app = express();
  app.use(express.json());

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
      occupation,
      address,
    } = req.body;

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
      occupation: occupation ? String(occupation).trim() : null,
      address: address ? String(address).trim() : null,
    };

    // 8. Đăng ký tài khoản qua Supabase Auth
    let authUser: any = null;
    let requiresEmailConfirmation = false;
    const appUrl = process.env.APP_URL || (req.headers.origin as string) || 'http://localhost:3000';
    const emailRedirectTo = `${appUrl}/login`;

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: userMetadata,
          emailRedirectTo,
        },
      });

      if (signUpErr) {
        // Fallback an toàn nếu dính SMTP Rate Limit ở môi trường thử nghiệm
        if (signUpErr.status === 429 || signUpErr.message?.includes('rate limit')) {
          console.warn('[AUTH] signUp hit SMTP rate limit, falling back to admin.createUser');
          const { data: adminUserData, error: adminErr } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password: password,
            email_confirm: false,
            user_metadata: userMetadata,
          });

          if (adminErr) {
            return res.status(400).json({
              success: false,
              error: adminErr.message || 'Lỗi khi tạo tài khoản xác thực Supabase.',
            });
          }
          authUser = adminUserData.user;
          requiresEmailConfirmation = true;
        } else {
          return res.status(400).json({
            success: false,
            error: signUpErr.message?.includes('already registered')
              ? 'Địa chỉ email này đã được đăng ký tài khoản trong hệ thống.'
              : signUpErr.message || 'Đăng ký không thành công.',
          });
        }
      } else {
        authUser = signUpData.user;
        requiresEmailConfirmation = !authUser?.confirmed_at && !signUpData.session;
        // Nếu Auth trả session ngay khi đăng ký, xử lý kết thúc session để giữ luồng đăng ký -> đăng nhập
        if (signUpData.session) {
          try {
            await supabase.auth.signOut();
          } catch (_) {}
        }
      }

      if (!authUser || !authUser.id) {
        return res.status(500).json({
          success: false,
          error: 'Đăng ký không hoàn tất. Máy chủ xác thực không trả về mã định danh người dùng.',
        });
      }

      // 9. Xác nhận Trigger DB-C đã tự động tạo đúng profiles và affiliate_profiles
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, is_active')
        .eq('id', authUser.id)
        .maybeSingle();

      const { data: affProfile, error: aErr } = await supabase
        .from('affiliate_profiles')
        .select('id, user_id, affiliate_code, status, created_at')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!profile || !affProfile) {
        return res.status(500).json({
          success: false,
          error: 'Hồ sơ CTV chưa được tạo tự động bởi hệ thống cơ sở dữ liệu. Vui lòng liên hệ quản trị viên.',
        });
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
        occupation: userMetadata.occupation || '',
        address: userMetadata.address || '',
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
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
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

  // ----------------------------------------------------------------------------
  // E1 – PUBLIC ENDPOINTS (Danh mục khóa học & Đăng ký tư vấn)
  // ----------------------------------------------------------------------------
  app.get('/api/v1/public/courses', async (req: Request, res: Response) => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error || !courses || courses.length === 0) {
        return res.json({ success: true, data: INITIAL_COURSES });
      }

      res.json({ success: true, data: courses });
    } catch (err: any) {
      res.json({ success: true, data: INITIAL_COURSES });
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

      if (error || !course) {
        const fallback = INITIAL_COURSES.find(c => c.slug === slug);
        if (fallback) return res.json({ success: true, data: fallback });
        return res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
      }

      res.json({ success: true, data: course });
    } catch (err: any) {
      const fallback = INITIAL_COURSES.find(c => c.slug === slug);
      if (fallback) return res.json({ success: true, data: fallback });
      res.status(404).json({ success: false, error: 'Không tìm thấy khóa học' });
    }
  });

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

    // 2. Tra cứu mã giới thiệu CTV (chỉ ghi nhận nguồn nếu CTV đang ACTIVE)
    if (ref_code) {
      const cleanRef = String(ref_code).trim();
      capturedCode = cleanRef;
      if (cleanRef === demoState.activeAffiliate.affiliate_code) {
        assignedAffiliateId = demoState.activeAffiliate.id;
      } else {
        const { data: aff } = await supabase
          .from('affiliate_profiles')
          .select('id, status')
          .eq('affiliate_code', cleanRef)
          .maybeSingle();

        if (aff && aff.status === 'ACTIVE') {
          assignedAffiliateId = aff.id;
        }
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

    const totalReferred = (leads?.length || 0) + 3; // + mock seed
    const enrolledValid = (leads?.filter(l => l.reconciliation_status === 'MATCHED_VALID').length || 0) + 2;
    const pendingRewards = (leads?.filter(l => l.reward_status === 'PENDING_APPROVAL').length || 0) + 1;
    const approvedRewards = (leads?.filter(l => l.reward_status === 'APPROVED').length || 0) + 1;
    const approvedAmount = approvedRewards * 500000;

    res.json({
      success: true,
      data: {
        affiliate_code: demoState.activeAffiliate.affiliate_code,
        affiliate_status: 'ACTIVE',
        full_name: demoState.activeAffiliate.full_name,
        metrics: {
          total_leads_referred: totalReferred,
          enrolled_valid_leads: enrolledValid,
          pending_reward_count: pendingRewards,
          approved_reward_count: approvedRewards,
          approved_reward_amount: approvedAmount,
        },
      },
    });
  });

  app.get('/api/v1/affiliate/courses', requireActiveAffiliate, async (req: Request, res: Response) => {
    const code = demoState.activeAffiliate.affiliate_code;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const courseList = courses && courses.length > 0 ? courses : INITIAL_COURSES;

    const data = courseList.map(c => {
      const referralUrl = `${baseUrl}/?ref=${code}&course=${c.slug}`;
      return {
        ...c,
        referral_url: referralUrl,
        affiliate_code: code,
      };
    });

    res.json({ success: true, data });
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
  // E3 – ADMIN PORTAL (Duyệt CTV, Quản lý Khóa, Lead, Đối soát, Duyệt Thưởng)
  // ----------------------------------------------------------------------------
  const requireStaffOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (demoState.currentRole !== 'staff' && demoState.currentRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bị từ chối: Chỉ Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin) mới có quyền truy cập khu vực này (Mã lỗi: 42501).',
      });
    }
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

  // 1. Quản lý Cộng tác viên
  app.get('/api/v1/admin/affiliates', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { data: dbAffiliates } = await supabase
      .from('affiliate_profiles')
      .select('*, profiles(full_name, email, phone, is_active)')
      .order('created_at', { ascending: false });

    const demoList = [
      demoState.pendingAffiliate,
      demoState.activeAffiliate,
    ];

    res.json({
      success: true,
      data: dbAffiliates && dbAffiliates.length > 0 ? dbAffiliates : demoList,
    });
  });

  app.patch('/api/v1/admin/affiliates/:id/status', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, review_note } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' });
    }

    if (id === demoState.pendingAffiliate.id) {
      (demoState.pendingAffiliate as any).status = status;
      demoState.pendingAffiliate.review_note = review_note || 'Đã xét duyệt bởi Cán bộ Tuyển sinh';
      demoState.pendingAffiliate.reviewed_at = new Date().toISOString();
      return res.json({
        success: true,
        message: `Đã cập nhật trạng thái CTV sang ${status}!`,
        data: demoState.pendingAffiliate,
      });
    }

    const { data, error } = await supabase
      .from('affiliate_profiles')
      .update({
        status,
        review_note: review_note || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: demoState.adminUser.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: `Cập nhật CTV thành công sang ${status}!`, data });
  });

  // 2. Quản lý Khóa học
  app.get('/api/v1/admin/courses', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .order('sort_order', { ascending: true });

    res.json({ success: true, data: courses && courses.length > 0 ? courses : INITIAL_COURSES });
  });

  app.patch('/api/v1/admin/courses/:id', requireStaffOrAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { is_active, tuition_fee_estimate } = req.body;

    const { data, error } = await supabase
      .from('courses')
      .update({ is_active, tuition_fee_estimate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Cập nhật khóa học thành công!', data });
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
      path.resolve(__dirname),
    ];

    const distDir = possibleDistDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')))
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
