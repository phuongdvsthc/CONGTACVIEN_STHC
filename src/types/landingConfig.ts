/**
 * Data Contract for Affiliate Landing Page CMS Configuration
 * Thiết kế hợp đồng dữ liệu cho phép Admin chỉnh sửa nội dung, đổi ảnh,
 * bật/tắt và sắp xếp các khối từ Supabase Database / Storage.
 */

export interface ImageAssetContract {
  url?: string;              // URL ảnh từ Supabase Storage hoặc CDN
  alt: string;               // Text mô tả trợ năng SEO
  aspectRatio?: string;      // Tỷ lệ chuẩn: '16:9' | '4:3' | '1:1' | '21:9'
  recommendedWidth?: number; // Kích thước khuyến nghị (pixel), ví dụ: 1200
  recommendedHeight?: number;// Kích thước khuyến nghị (pixel), ví dụ: 800
  fallbackType?: 'culinary' | 'hotel' | 'hospitality' | 'campus'; // Fallback SVG/CSS khi chưa có ảnh thật
}

export interface HeaderConfig {
  logoText: string;
  subLogoText: string;
  logoBadgeText?: string;
  loginButtonText: string;
  registerButtonText: string;
  contactHotline: string;
}

export interface PolicyNoticeConfig {
  rewardAmountText: string;      // Ví dụ: '500.000 VNĐ'
  rewardUnitText: string;        // Ví dụ: '/ 01 hồ sơ nhập học hợp lệ'
  rewardConditionText: string;   // Ví dụ: 'Chi trả sau khi Nhà trường xác nhận học viên đã hoàn tất đóng học phí chính thức.'
  reviewNoticeText: string;      // Ví dụ: 'Tài khoản CTV mới đăng ký ở trạng thái CHỜ DUYỆT (PENDING_REVIEW). Sau khi Ban Tuyển sinh phê duyệt, bạn mới được kích hoạt link giới thiệu và mã QR.'
}

export interface HeroSectionConfig {
  enabled: boolean;
  tagline: string;
  headline: string;
  highlightText: string;
  subheadline: string;
  illustration: ImageAssetContract;
  stats: Array<{
    value: string;
    label: string;
  }>;
}

export interface RegistrationFormConfig {
  title: string;
  subtitle: string;
  fullNamePlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  termsCheckboxText: string;
  termsLinkText: string;
  submitButtonText: string;
  loginRedirectText: string;
}

export interface StepItem {
  id: string;
  number: string;
  title: string;
  description: string;
  badge?: string;
}

export interface StepsSectionConfig {
  enabled: boolean;
  tagline: string;
  title: string;
  description: string;
  steps: StepItem[];
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface BenefitsSectionConfig {
  enabled: boolean;
  tagline: string;
  title: string;
  description: string;
  benefits: BenefitItem[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqSectionConfig {
  enabled: boolean;
  tagline: string;
  title: string;
  description: string;
  faqs: FaqItem[];
}

export interface CtaBannerConfig {
  enabled: boolean;
  headline: string;
  subheadline: string;
  buttonText: string;
  supportPhone: string;
}

export interface LoginFormConfig {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitButtonText: string;
  submittingButtonText: string;
  registerLinkPrefix: string;
  registerLinkText: string;
  illustration: ImageAssetContract;
}

export interface AffiliateLandingConfig {
  version: string;
  updatedAt: string;
  meta: {
    pageTitle: string;
    metaDescription: string;
  };
  header: HeaderConfig;
  policy: PolicyNoticeConfig;
  hero: HeroSectionConfig;
  form: RegistrationFormConfig;
  loginPage: LoginFormConfig;
  stepsSection: StepsSectionConfig;
  benefitsSection: BenefitsSectionConfig;
  faqSection: FaqSectionConfig;
  ctaBanner: CtaBannerConfig;
  sectionOrder: Array<'hero' | 'steps' | 'benefits' | 'faq' | 'cta'>;
}
