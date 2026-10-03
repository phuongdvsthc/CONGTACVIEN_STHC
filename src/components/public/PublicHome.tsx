import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { api } from '../../services/api';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Award,
  Clock,
  DollarSign,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  LogIn,
  HelpCircle,
  ListOrdered,
  UserCheck,
  QrCode,
  Send,
} from 'lucide-react';

interface PublicHomeProps {
  courses: Course[];
  refCode?: string | null;
  onOpenRegisterAffiliate: () => void;
  onOpenLoginAffiliate?: (prefilledEmail?: string, customSuccessMessage?: string) => void;
  onViewCourseDetail?: (course: Course) => void;
}

interface LayoutBlock {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  config?: any;
}

const DEFAULT_LAYOUT_BLOCKS: LayoutBlock[] = [
  {
    id: 'hero',
    name: 'Khối Giới thiệu & Banner (Hero Section)',
    enabled: true,
    order: 0,
    config: {
      title: 'Saigontourist Lan Tỏa Tương Lai Ngành Du Lịch',
      subtitle: 'Khởi Đầu Nghề Nghiệp Đẳng Cấp 5 Sao',
      description: 'Trở thành Cầu nối Tuyển sinh cho ngôi trường đào tạo Du lịch - Khách sạn hàng đầu Việt Nam với hơn 35 năm uy tín. Nhận thù lao xứng đáng, thủ tục minh bạch và đối soát tự động.',
      ctaLabel: 'Đăng Ký Tham Gia Ngay'
    }
  },
  {
    id: 'commission_policy',
    name: 'Khối Chính sách hoa hồng CTV',
    enabled: true,
    order: 1,
    config: {
      title: 'Chính Sách Hoa Hồng Hấp Dẫn & Minh Bạch',
      amount: '500.000',
      currency: 'VNĐ',
      unitLabel: '01 hồ sơ nhập học hợp lệ',
      description: '500.000 đồng cho mỗi hồ sơ giới thiệu hợp lệ sau khi trường xác nhận học viên đã hoàn tất đóng học phí.',
      condition: 'Tài khoản chờ duyệt: Tài khoản mới phải chờ trường duyệt (trạng thái PENDING_REVIEW) trước khi được cấp và sử dụng link giới thiệu.',
      benefits: [
        'Thù lao: 500.000 VNĐ / hồ sơ nhập học',
        'Trạng thái: Tài khoản mới sẽ ở trạng thái CHỜ DUYỆT trước khi được cấp link giới thiệu.',
        'Đối soát và xác nhận minh bạch qua hệ thống.'
      ],
      ctaLabel: 'Tìm hiểu chi tiết'
    }
  },
  {
    id: 'process',
    name: 'Khối Quy trình trở thành CTV',
    enabled: true,
    order: 2,
    config: {
      title: '3 Bước Đơn Giản Để Bắt Đầu',
      subtitle: 'Quy trình đăng ký và giới thiệu tinh gọn, minh bạch',
      steps: [
        { id: 'step-1', title: '1. Đăng ký tài khoản', description: 'Đăng ký tài khoản CTV, xác thực email và chờ Ban Tuyển sinh duyệt trạng thái PENDING_REVIEW.', icon: 'UserCheck', order: 0 },
        { id: 'step-2', title: '2. Lấy Link & QR giới thiệu', description: 'Sau khi được duyệt kích hoạt (ACTIVE), chọn khóa học quan tâm và lấy Link/QR giới thiệu riêng của bạn.', icon: 'QrCode', order: 1 },
        { id: 'step-3', title: '3. Giới thiệu & Nhận thưởng', description: 'Học viên đăng ký qua link/QR; nhà trường đối chiếu hồ sơ và học phí để ghi nhận hoa hồng thành công.', icon: 'Award', order: 2 }
      ]
    }
  },
  {
    id: 'success_stories',
    name: 'Khối Câu chuyện thành công',
    enabled: false,
    order: 3,
    config: {
      title: 'Câu Chuyện Thành Công Từ Cộng Tác Viên',
      subtitle: 'Lắng nghe chia sẻ từ những cầu nối tuyển sinh xuất sắc',
      stories: []
    }
  },
  {
    id: 'faq',
    name: 'Khối Giải đáp thắc mắc',
    enabled: true,
    order: 4,
    config: {
      title: 'Giải Đáp Thắc Mắc Thường Gặp',
      subtitle: 'Mọi thông tin về chương trình Cộng tác viên tuyển sinh STHC',
      faqs: [
        { id: 'faq-1', question: 'Làm thế nào để đăng ký trở thành Cộng tác viên tuyển sinh?', answer: 'Bạn chỉ cần điền thông tin vào form đăng ký tài khoản CTV ở đầu trang, xác thực email và chờ Ban Tuyển sinh phê duyệt tài khoản.', enabled: true, order: 0 },
        { id: 'faq-2', question: 'Mức hoa hồng chi trả cho mỗi hồ sơ là bao nhiêu?', answer: 'Mức thù lao là 500.000 VNĐ cho mỗi hồ sơ giới thiệu nhập học thành công sau khi học viên hoàn tất đóng học phí.', enabled: true, order: 1 },
        { id: 'faq-3', question: 'Khi nào tôi nhận được thù lao giới thiệu?', answer: 'Thù lao được đối soát và xác nhận khi học viên hoàn tất thủ tục nhập học và đóng học phí theo quy định của nhà trường.', enabled: true, order: 2 }
      ]
    }
  },
  {
    id: 'cta',
    name: 'Khối Sẵn sàng trở thành CTV',
    enabled: true,
    order: 5,
    config: {
      title: 'Sẵn Sàng Trở Thành Cầu Nối Tuyển Sinh?',
      subtitle: 'Đăng ký ngay hôm nay để nhận quyền lợi hấp dẫn và đồng hành cùng uy tín đào tạo 35 năm.',
      buttonLabel: 'Đăng Ký Tài Khoản CTV Ngay'
    }
  }
];

export const PublicHome: React.FC<PublicHomeProps> = ({
  courses,
  refCode,
  onOpenRegisterAffiliate,
  onOpenLoginAffiliate,
  onViewCourseDetail,
}) => {
  // CTV Registration Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccessData, setSubmissionSuccessData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    code: string;
    requiresEmailConfirmation?: boolean;
    message?: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // FAQ accordion state
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Homepage Config from server
  const [homeConfig, setHomeConfig] = useState<{
    hero_background_url?: string | null;
    hero_background_alt?: string | null;
    hero_illustration_url?: string | null;
    hero_illustration_alt?: string | null;
    layout_blocks?: LayoutBlock[];
  }>({});

  useEffect(() => {
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data) {
        setHomeConfig(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !submissionSuccessData?.email) return;
    setResendMessage(null);
    const res = await api.resendVerification(submissionSuccessData.email);
    if (res.success) {
      setResendMessage('Đã gửi lại email xác nhận thành công!');
      setResendCooldown(60);
    } else {
      setResendMessage(res.error || 'Không thể gửi lại email.');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên của bạn.';
    } else if (fullName.trim().split(/\s+/).length < 2) {
      errors.fullName = 'Vui lòng nhập đầy đủ cả họ và tên.';
    }

    const cleanPhone = phone.trim().replace(/\s/g, '');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
    } else if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      errors.phone = 'Số điện thoại không hợp lệ (cần đúng 10 số, ví dụ 0901234567).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Địa chỉ email không đúng định dạng.';
    }

    if (!password) {
      errors.password = 'Vui lòng đặt mật khẩu tài khoản.';
    } else if (password.length < 6) {
      errors.password = 'Mật khẩu phải có tối thiểu 6 ký tự.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng nhập lại mật khẩu để xác nhận.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    if (!termsAccepted) {
      errors.termsAccepted = 'Bạn cần đồng ý với Quy chế CTV và chính sách của Trường.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const res = await api.register({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });

      if (res.isTimeout) {
        setFormErrors({ general: 'Chưa nhận được kết quả đăng ký. Vui lòng kiểm tra email trước khi thử lại.' });
        return;
      }

      if (res.success) {
        if (res.requires_email_confirmation) {
          setSubmissionSuccessData({
            fullName: res.data?.full_name || fullName.trim(),
            email: res.data?.email || email.trim(),
            phone: res.data?.phone || phone.trim(),
            code: res.data?.affiliate_code || 'STHCCTV...',
            requiresEmailConfirmation: true,
            message: res.message,
          });
        } else {
          if (onOpenLoginAffiliate) {
            onOpenLoginAffiliate(email.trim(), 'Đăng ký thành công. Vui lòng đăng nhập. Tài khoản đang chờ trường duyệt.');
          }
        }
      } else {
        setFormErrors({ general: res.error || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.' });
      }
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Lỗi kết nối máy chủ xác thực. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToRegistration = () => {
    const formEl = document.getElementById('affiliate-registration-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const firstInput = formEl.querySelector('input') as HTMLInputElement | null;
        if (firstInput) firstInput.focus();
      }, 350);
    } else {
      onOpenRegisterAffiliate();
    }
  };

  const activeBlocks = (homeConfig.layout_blocks && Array.isArray(homeConfig.layout_blocks) && homeConfig.layout_blocks.length > 0)
    ? [...homeConfig.layout_blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).filter(b => b.enabled !== false)
    : DEFAULT_LAYOUT_BLOCKS;

  return (
    <div className="space-y-16 pb-24 font-sans text-slate-100 bg-[#070D18]">
      {activeBlocks.map((block) => {
        const cfg = block.config || DEFAULT_LAYOUT_BLOCKS.find(d => d.id === block.id)?.config || {};

        if (block.id === 'hero') {
          return (
            <section key="hero" className="relative overflow-hidden bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
              {homeConfig.hero_background_url && (
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                  <img
                    src={homeConfig.hero_background_url}
                    alt={homeConfig.hero_background_alt || 'Hình nền trang chủ'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="relative max-w-7xl mx-auto z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                  {/* Left Column: Hero Content */}
                  <div className="lg:col-span-7 space-y-6">
                    {refCode ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold tracking-wide">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Bạn đang truy cập qua liên kết giới thiệu của CTV: <strong>{refCode}</strong></span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-300 text-xs font-medium tracking-wide">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tuyển sinh Trung cấp chính quy & Sơ cấp nghề 2026</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        {cfg.title || 'Saigontourist Lan Tỏa Tương Lai Ngành Du Lịch'}
                        <span className="block text-amber-400 mt-1 font-serif font-normal italic text-2xl sm:text-3xl lg:text-4xl">
                          {cfg.subtitle || 'Khởi Đầu Nghề Nghiệp Đẳng Cấp 5 Sao'}
                        </span>
                      </h1>
                      <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-2xl">
                        {cfg.description || 'Trở thành Cầu nối Tuyển sinh cho ngôi trường đào tạo Du lịch - Khách sạn hàng đầu Việt Nam với hơn 35 năm uy tín. Nhận thù lao xứng đáng, thủ tục minh bạch và đối soát tự động.'}
                      </p>
                    </div>

                    {/* Stats proof */}
                    <div className="pt-2 grid grid-cols-3 gap-4 border-t border-slate-800 text-left">
                      <div>
                        <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                          35+ Năm
                        </span>
                        <span className="text-xs text-slate-400">Tiên phong đào tạo</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                          100%
                        </span>
                        <span className="text-xs text-slate-400">Cam kết việc làm</span>
                      </div>
                      <div>
                        <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                          500.000đ
                        </span>
                        <span className="text-xs text-slate-400">Thù lao thưởng CTV</span>
                      </div>
                    </div>

                    {/* Illustration image in left col if present */}
                    {homeConfig.hero_illustration_url && (
                      <div className="rounded-2xl overflow-hidden border border-blue-800/40 bg-slate-950 shadow-xl mt-4">
                        <img
                          src={homeConfig.hero_illustration_url}
                          alt={homeConfig.hero_illustration_alt || 'Hình minh họa tuyển sinh'}
                          className="w-full h-48 sm:h-56 object-cover object-center"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: CTV Registration Card */}
                  <div id="affiliate-registration-card" className="lg:col-span-5 scroll-mt-20">
                    <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative">
                      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 sm:p-6">
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          Đăng Ký Tài Khoản Cộng Tác Viên
                        </h3>
                        <p className="text-xs text-blue-200 leading-relaxed mt-1">
                          Trở thành cầu nối tuyển sinh chính thức cùng Trường Saigontourist.
                        </p>
                      </div>

                      {submissionSuccessData ? (
                        <div className="p-6 sm:p-8 space-y-5 text-center animate-fade-in text-xs">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div className="space-y-1.5">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold uppercase tracking-wider text-[10px]">
                              Trạng thái: PENDING_REVIEW (Chờ duyệt)
                            </span>
                            <h3 className="text-lg font-bold text-slate-900">
                              Hồ Sơ CTV Đã Được Ghi Nhận!
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-xs">
                              Cảm ơn bạn <strong>{submissionSuccessData.fullName}</strong>. Ban Tuyển sinh đã tiếp nhận thông tin và sẽ xác minh hồ sơ.
                            </p>
                          </div>

                          {submissionSuccessData.requiresEmailConfirmation && (
                            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-left flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                              <div className="space-y-1.5 w-full">
                                <span className="font-bold block">Yêu cầu xác thực email:</span>
                                <p className="text-[11px] text-blue-800 leading-relaxed">
                                  Hệ thống đã gửi liên kết xác nhận đến <strong>{submissionSuccessData.email}</strong>. Vui lòng kiểm tra hộp thư.
                                </p>
                                <div className="pt-1 flex items-center justify-between">
                                  <button
                                    type="button"
                                    disabled={resendCooldown > 0}
                                    onClick={handleResendEmail}
                                    className="text-xs font-bold text-blue-900 hover:underline disabled:text-slate-400"
                                  >
                                    {resendCooldown > 0 ? `Gửi lại email (${resendCooldown}s)` : 'Gửi lại email xác nhận'}
                                  </button>
                                  {resendMessage && (
                                    <span className="text-[11px] text-emerald-700 font-medium">{resendMessage}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                            <div className="flex justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">Mã CTV dự kiến:</span>
                              <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                                {submissionSuccessData.code}
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-slate-500">Email đăng nhập:</span>
                              <span className="font-semibold text-slate-800">{submissionSuccessData.email}</span>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenLoginAffiliate) {
                                  onOpenLoginAffiliate(submissionSuccessData.email, 'Đăng ký thành công. Vui lòng đăng nhập.');
                                }
                              }}
                              className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                            >
                              <LogIn className="w-4 h-4 text-amber-400" />
                              <span>Đến Màn Hình Đăng Nhập Cổng CTV</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 text-xs">
                          {formErrors.general && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                              <span className="leading-relaxed font-semibold">{formErrors.general}</span>
                            </div>
                          )}

                          <div>
                            <label className="block font-semibold text-slate-800 mb-1">
                              Họ và tên CTV <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => {
                                setFullName(e.target.value);
                                if (formErrors.fullName) setFormErrors((p) => ({ ...p, fullName: '' }));
                              }}
                              placeholder="VD: Nguyễn Văn A"
                              className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs ${
                                formErrors.fullName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                              }`}
                            />
                            {formErrors.fullName && <p className="mt-1 text-[11px] text-rose-600">{formErrors.fullName}</p>}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-800 mb-1">
                                Số điện thoại <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                  setPhone(e.target.value);
                                  if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: '' }));
                                }}
                                placeholder="0901234567"
                                className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs ${
                                  formErrors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                                }`}
                              />
                              {formErrors.phone && <p className="mt-1 text-[11px] text-rose-600">{formErrors.phone}</p>}
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-800 mb-1">
                                Email đăng nhập <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  if (formErrors.email) setFormErrors((p) => ({ ...p, email: '' }));
                                }}
                                placeholder="email@domain.com"
                                className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs ${
                                  formErrors.email ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                                }`}
                              />
                              {formErrors.email && <p className="mt-1 text-[11px] text-rose-600">{formErrors.email}</p>}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-800 mb-1">
                                Mật khẩu <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  if (formErrors.password) setFormErrors((p) => ({ ...p, password: '' }));
                                }}
                                placeholder="Tối thiểu 6 ký tự"
                                className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs ${
                                  formErrors.password ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                                }`}
                              />
                              {formErrors.password && <p className="mt-1 text-[11px] text-rose-600">{formErrors.password}</p>}
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-800 mb-1">
                                Nhập lại mật khẩu <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value);
                                  if (formErrors.confirmPassword) setFormErrors((p) => ({ ...p, confirmPassword: '' }));
                                }}
                                placeholder="Xác nhận mật khẩu"
                                className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs ${
                                  formErrors.confirmPassword ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                                }`}
                              />
                              {formErrors.confirmPassword && <p className="mt-1 text-[11px] text-rose-600">{formErrors.confirmPassword}</p>}
                            </div>
                          </div>

                          <div className="space-y-2 pt-1">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => {
                                  setTermsAccepted(e.target.checked);
                                  if (formErrors.termsAccepted) setFormErrors((p) => ({ ...p, termsAccepted: '' }));
                                }}
                                className="mt-0.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                              />
                              <span className="text-[11px] text-slate-600 leading-relaxed">
                                Tôi đã đọc và đồng ý với <strong>Quy chế Cộng tác viên Tuyển sinh & Bảo vệ dữ liệu cá nhân</strong> của Trường Saigontourist.
                              </span>
                            </label>
                            {formErrors.termsAccepted && <p className="text-[11px] text-rose-600">{formErrors.termsAccepted}</p>}
                          </div>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-950 hover:to-slate-900 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Đang xử lý đăng ký...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 text-amber-400" />
                                <span>{cfg.ctaLabel || 'Đăng Ký Tham Gia Ngay'}</span>
                              </>
                            )}
                          </button>

                          <div className="text-center pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenLoginAffiliate) onOpenLoginAffiliate();
                              }}
                              className="text-xs font-semibold text-blue-900 hover:underline"
                            >
                              Bạn đã có tài khoản CTV? Đăng nhập tại đây
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (block.id === 'commission_policy') {
          return (
            <section key="commission_policy" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="text-center space-y-3 max-w-3xl mx-auto">
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  Chính sách thu nhập
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {cfg.title || 'Chính Sách Hoa Hồng Hấp Dẫn & Minh Bạch'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cfg.description || 'Mức thù lao xứng đáng cho mỗi hồ sơ giới thiệu thành công.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-gradient-to-br from-[#0B1E3F]/80 to-[#0A1628] border border-blue-800/40 rounded-3xl p-6 sm:p-10 shadow-2xl">
                <div className="md:col-span-5 space-y-4 text-center md:text-left">
                  <div className="inline-flex p-3.5 rounded-2xl bg-amber-400 text-slate-950 font-bold shadow-lg">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight block">
                      {cfg.amount || '500.000'} <span className="text-xl sm:text-2xl font-bold">{cfg.currency || 'VNĐ'}</span>
                    </span>
                    <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">
                      / {cfg.unitLabel || '01 hồ sơ nhập học hợp lệ'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {cfg.description}
                  </p>
                </div>

                <div className="md:col-span-7 space-y-4 border-t md:border-t-0 md:border-l border-blue-800/60 pt-6 md:pt-0 md:pl-8">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Điều kiện ghi nhận & Quyền lợi:</span>
                  </h4>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                    {Array.isArray(cfg.benefits) && cfg.benefits.map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{cfg.condition}</span>
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (block.id === 'process') {
          return (
            <section key="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="text-center space-y-3 max-w-3xl mx-auto">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-400/30 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  Quy trình tinh gọn
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {cfg.title || '3 Bước Đơn Giản Để Bắt Đầu'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cfg.subtitle || 'Quy trình đăng ký và giới thiệu minh bạch cùng Trường Saigontourist'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.isArray(cfg.steps) && cfg.steps.map((step: any, idx: number) => (
                  <div key={step.id || idx} className="bg-[#0B1E3F]/60 border border-blue-900/50 rounded-2xl p-6 sm:p-8 space-y-4 hover:border-amber-400/50 transition-all shadow-xl relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-amber-400 font-black text-lg flex items-center justify-center border border-amber-400/30 shadow-md">
                      {idx + 1}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (block.id === 'success_stories') {
          const stories = cfg.stories || [];
          if (!block.enabled || stories.length === 0) return null;
          return (
            <section key="success_stories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
              <div className="text-center space-y-3 max-w-3xl mx-auto">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-400/30 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  Đội ngũ xuất sắc
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {cfg.title || 'Câu Chuyện Thành Công Từ Cộng Tác Viên'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cfg.subtitle || 'Lắng nghe chia sẻ từ những cầu nối tuyển sinh xuất sắc'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stories.filter((s: any) => s.enabled !== false).map((story: any) => (
                  <div key={story.id} className="bg-[#0B1E3F]/60 border border-blue-900/50 rounded-2xl p-6 space-y-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      {story.avatar_url ? (
                        <img src={story.avatar_url} alt={story.name} className="w-12 h-12 rounded-full object-cover border border-amber-400/40" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-900 text-amber-400 flex items-center justify-center font-bold">
                          {story.name?.[0] || 'CTV'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-sm">{story.name}</h4>
                        <p className="text-xs text-blue-300">{story.role}</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                      "{story.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (block.id === 'faq') {
          const faqs = cfg.faqs || [];
          return (
            <section key="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 rounded-full uppercase tracking-wider">
                  Hỏi đáp tuyển sinh
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {cfg.title || 'Giải Đáp Thắc Mắc Thường Gặp'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {cfg.subtitle || 'Mọi thông tin về chương trình Cộng tác viên tuyển sinh STHC'}
                </p>
              </div>

              <div className="space-y-3">
                {faqs.filter((f: any) => f.enabled !== false).map((faq: any) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div key={faq.id} className="bg-[#0B1E3F]/70 border border-blue-900/60 rounded-2xl overflow-hidden transition-all shadow-md">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-amber-400 transition-colors"
                      >
                        <span>{faq.question}</span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-amber-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-blue-900/40">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        if (block.id === 'cta') {
          return (
            <section key="cta" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-amber-400/30 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="max-w-2xl mx-auto space-y-3 relative z-10">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {cfg.title || 'Sẵn Sàng Trở Thành Cầu Nối Tuyển Sinh?'}
                  </h2>
                  <p className="text-sm text-blue-100/90 leading-relaxed">
                    {cfg.subtitle || 'Đăng ký ngay hôm nay để nhận quyền lợi hấp dẫn và đồng hành cùng uy tín đào tạo 35 năm.'}
                  </p>
                </div>
                <div className="pt-2 relative z-10">
                  <button
                    type="button"
                    onClick={scrollToRegistration}
                    className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl transition-all inline-flex items-center gap-2 active:scale-95"
                  >
                    <span>{cfg.buttonLabel || 'Đăng Ký Tài Khoản CTV Ngay'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
};
