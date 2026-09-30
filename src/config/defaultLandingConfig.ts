import { AffiliateLandingConfig } from '../types/landingConfig';

/**
 * CẤU HÌNH MẶC ĐỊNH CHO TRANG / (GIỚI THIỆU & ĐĂNG KÝ CTV TUYỂN SINH)
 * Toàn bộ câu chữ, thông điệp, hình ảnh, câu hỏi thường gặp được tách biệt hoàn toàn khỏi JSX.
 * Sau này Backend CMS của Admin có thể nạp đè cấu hình này từ database/Supabase.
 */
export const defaultLandingConfig: AffiliateLandingConfig = {
  version: '1.0.0',
  updatedAt: '2026-09-29T15:00:00.000Z',
  meta: {
    pageTitle: 'Cộng Tác Viên Tuyển Sinh STHC | Trường Du Lịch Saigontourist',
    metaDescription: 'Tham gia mạng lưới Đại sứ Tuyển sinh Trường Du lịch Saigontourist (STHC). Nhận thù lao 500.000 VNĐ cho mỗi học viên nhập học hợp lệ.',
  },
  header: {
    logoText: 'TRƯỜNG SAIGONTOURIST',
    subLogoText: 'CỔNG CỘNG TÁC VIÊN TUYỂN SINH',
    logoBadgeText: 'STHC',
    loginButtonText: 'Đăng nhập',
    registerButtonText: 'Đăng ký',
    contactHotline: '1900 5555 79',
  },
  policy: {
    rewardAmountText: '500.000 VNĐ',
    rewardUnitText: '/ 01 hồ sơ nhập học hợp lệ',
    rewardConditionText: '500.000 đồng cho mỗi hồ sơ giới thiệu hợp lệ sau khi trường xác nhận học viên đã hoàn tất đóng học phí.',
    reviewNoticeText: 'Tài khoản mới phải chờ trường duyệt (trạng thái PENDING_REVIEW) trước khi được cấp và sử dụng link giới thiệu.',
  },
  hero: {
    enabled: true,
    tagline: 'MẠNG LƯỚI ĐẠI SỨ TUYỂN SINH 2026',
    headline: 'Đồng Hành Cùng Saigontourist',
    highlightText: 'Lan Tỏa Tương Lai Ngành Du Lịch',
    subheadline: 'Trở thành Cầu nối Tuyển sinh cho ngôi trường đào tạo Du lịch - Khách sạn hàng đầu Việt Nam với hơn 35 năm uy tín. Nhận thù lao xứng đáng, thủ tục minh bạch và đối soát tự động.',
    illustration: {
      alt: 'Sinh viên Trường Du lịch Saigontourist trong giờ thực hành nghề chuyên nghiệp',
      aspectRatio: '4:3',
      recommendedWidth: 1200,
      recommendedHeight: 900,
      fallbackType: 'culinary',
    },
    stats: [
      { value: '35+', label: 'Năm uy tín đào tạo Du lịch' },
      { value: '500K', label: 'Thù lao / hồ sơ nhập học' },
      { value: '100%', label: 'Đối soát minh bạch qua cổng CTV' },
    ],
  },
  form: {
    title: 'Đăng Ký Tài Khoản CTV Mới',
    subtitle: 'Điền thông tin bên dưới để khởi tạo hồ sơ Đại sứ Tuyển sinh',
    fullNamePlaceholder: 'Nhập họ và tên đầy đủ',
    phonePlaceholder: 'Số điện thoại liên hệ (10 chữ số)',
    emailPlaceholder: 'Địa chỉ email đăng nhập',
    passwordPlaceholder: 'Mật khẩu (tối thiểu 6 ký tự)',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu để xác nhận',
    termsCheckboxText: 'Tôi đã đọc và đồng ý với',
    termsLinkText: 'Quy chế Cộng tác viên Tuyển sinh & Bảo vệ dữ liệu cá nhân của Trường Saigontourist',
    submitButtonText: 'Đăng Ký Tham Gia Ngay',
    loginRedirectText: 'Bạn đã có tài khoản CTV? Đăng nhập tại đây',
  },
  loginPage: {
    title: 'Đăng nhập',
    subtitle: 'Đăng nhập vào Cổng Cộng tác viên Tuyển sinh Trường Saigontourist',
    emailLabel: 'Email đăng nhập',
    emailPlaceholder: 'Nhập địa chỉ email của bạn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu tài khoản',
    submitButtonText: 'Đăng nhập',
    submittingButtonText: 'Đang đăng nhập...',
    registerLinkPrefix: 'Chưa có tài khoản?',
    registerLinkText: 'Đăng ký',
    illustration: {
      alt: 'Cổng Cộng tác viên Tuyển sinh Trường Du lịch Saigontourist STHC',
      aspectRatio: '4:3',
      recommendedWidth: 1200,
      recommendedHeight: 900,
      fallbackType: 'campus',
    },
  },
  stepsSection: {
    enabled: true,
    tagline: 'QUY TRÌNH TINH GỌN',
    title: '3 Bước Đơn Giản Để Bắt Đầu',
    description: 'Quy trình tiếp nhận và ghi nhận học viên được thiết kế rõ ràng, tự động hóa từ khâu lấy link đến nhận thù lao.',
    steps: [
      {
        id: 'step_1',
        number: '01',
        title: 'Đăng Ký & Chờ Phê Duyệt',
        description: 'Tạo tài khoản với thông tin cá nhân. Ban Tuyển sinh STHC sẽ xác minh và cấp mã CTV định danh trong vòng 24 giờ làm việc.',
        badge: 'Khởi đầu',
      },
      {
        id: 'step_2',
        number: '02',
        title: 'Chia Sẻ Link & Mã QR Ngành Học',
        description: 'Truy cập cổng CTV để lấy liên kết cá nhân hóa cho từng ngành (Bếp, Khách sạn, Nhà hàng, Pha chế, Lữ hành) và chia sẻ cho người học có nhu cầu.',
        badge: 'Giới thiệu',
      },
      {
        id: 'step_3',
        number: '03',
        title: 'Đối Soát & Nhận Thù Lao 500k',
        description: 'Khi học viên đến trường hoàn tất thủ tục và đóng học phí, hệ thống tự động ghi nhận học viên hợp lệ và thông báo duyệt thù lao 500.000 VNĐ.',
        badge: 'Nhận thưởng',
      },
    ],
  },
  benefitsSection: {
    enabled: true,
    tagline: 'QUYỀN LỢI CỘNG TÁC VIÊN',
    title: 'Tại Sao Nên Đồng Hành Cùng STHC?',
    description: 'Chúng tôi cam kết tạo điều kiện tối đa và bảo vệ quyền lợi chính đáng của đội ngũ Đại sứ Tuyển sinh.',
    benefits: [
      {
        id: 'benefit_1',
        title: 'Thương Hiệu Saigontourist Đẳng Cấp',
        description: 'Uy tín 35 năm đào tạo thực tế, sinh viên tốt nghiệp được săn đón tại các khách sạn 5 sao và khu nghỉ dưỡng hàng đầu.',
        iconName: 'Award',
      },
      {
        id: 'benefit_2',
        title: 'Bảo Hộ Nguồn Giới Thiệu 90 Ngày',
        description: 'Người học khi gửi form tư vấn qua link hoặc mã QR của bạn sẽ được bảo hộ nguồn giới thiệu trong suốt 90 ngày xét tuyển.',
        iconName: 'ShieldCheck',
      },
      {
        id: 'benefit_3',
        title: 'Bảng Điều Khiển Quản Lý Minh Bạch',
        description: 'Cổng CTV hiện đại cập nhật tức thì trạng thái tư vấn, đối soát học phí và danh sách thù lao theo thời gian thực.',
        iconName: 'LayoutDashboard',
      },
      {
        id: 'benefit_4',
        title: 'Chi Trả Thù Lao Kịp Thời',
        description: 'Phòng Kế toán đối soát và chi trả thù lao 500.000đ/học viên định kỳ qua tài khoản ngân hàng chính chủ của CTV.',
        iconName: 'Banknote',
      },
    ],
  },
  faqSection: {
    enabled: true,
    tagline: 'GIẢI ĐÁP THẮC MẮC',
    title: 'Câu Hỏi Thường Gặp Về Chương Trình CTV',
    description: 'Các câu hỏi phổ biến từ người đăng ký tham gia mạng lưới Đại sứ Tuyển sinh.',
    faqs: [
      {
        id: 'faq_1',
        question: 'Ai có thể đăng ký tham gia làm Cộng tác viên Tuyển sinh STHC?',
        answer: 'Mọi cá nhân từ đủ 18 tuổi có mong muốn lan tỏa cơ hội học nghề du lịch khách sạn chất lượng cao: cựu sinh viên, sinh viên đang theo học, phụ huynh, cán bộ hướng dẫn viên, giáo viên THPT, hoặc người làm việc trong ngành dịch vụ.',
      },
      {
        id: 'faq_2',
        question: 'Khi nào tài khoản CTV của tôi mới được cấp link giới thiệu và mã QR?',
        answer: 'Sau khi hoàn tất biểu mẫu đăng ký tại trang này, tài khoản sẽ ở trạng thái PENDING_REVIEW (Chờ duyệt). Ban Tuyển sinh Nhà trường sẽ kiểm tra thông tin và kích hoạt trạng thái ACTIVE trong vòng 24h. Sau khi ACTIVE, bạn đăng nhập vào cổng CTV để lấy toàn bộ link và QR code.',
      },
      {
        id: 'faq_3',
        question: 'Điều kiện nào để một hồ sơ giới thiệu được tính là hợp lệ để nhận 500.000 VNĐ?',
        answer: 'Hồ sơ được công nhận hợp lệ khi đáp ứng đủ 3 tiêu chí: (1) Ứng viên đăng ký thông qua link/QR của CTV; (2) Ứng viên đến trường nộp hồ sơ nhập học chính thức; (3) Cán bộ Tuyển sinh đối soát khớp số biên lai thu học phí thực tế tại STHC.',
      },
      {
        id: 'faq_4',
        question: 'Số điện thoại của người đăng ký tư vấn có bị lộ cho người khác không?',
        answer: 'Không. Hệ thống tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Tại bảng điều khiển CTV, số điện thoại của người học luôn được che 4 số cuối để đảm bảo an toàn tuyệt đối.',
      },
    ],
  },
  ctaBanner: {
    enabled: true,
    headline: 'Sẵn Sàng Trở Thành Đại Sứ Tuyển Sinh STHC?',
    subheadline: 'Tham gia ngay hôm nay để nhận quyền lợi hấp dẫn và đồng hành cùng thế hệ tài năng ngành Du lịch - Khách sạn Việt Nam.',
    buttonText: 'Lên Đầu Trang Để Đăng Ký',
    supportPhone: '(028) 38 442 261',
  },
  sectionOrder: ['hero', 'steps', 'benefits', 'faq', 'cta'],
};
