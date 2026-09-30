import React, { useState } from 'react';
import { AffiliateLandingConfig } from '../../types/landingConfig';
import { defaultLandingConfig } from '../../config/defaultLandingConfig';
import {
  GraduationCap,
  LogIn,
  CheckCircle2,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  AlertCircle,
  Send,
  HelpCircle,
  ListOrdered,
} from 'lucide-react';
import { api } from '../../services/api';

interface AffiliateLandingPageProps {
  config?: AffiliateLandingConfig;
  onOpenLogin: (prefilledEmail?: string, customSuccessMessage?: string) => void;
}

export const AffiliateLandingPage: React.FC<AffiliateLandingPageProps> = ({
  config = defaultLandingConfig,
  onOpenLogin,
}) => {
  // Form input state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form UI state
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

  // FAQ accordion state
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq_1');

  // Image load error fallback state
  const [imageError, setImageError] = useState(false);

  // Validate form fields according to business rules (M1.2)
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

  // M1.2: Xử lý đăng ký tài khoản Auth và tạo hồ sơ CTV thực tế
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

      if (res.success) {
        if (res.requires_email_confirmation) {
          // Trường hợp 1: Auth yêu cầu xác nhận email
          setSubmissionSuccessData({
            fullName: res.data?.full_name || fullName.trim(),
            email: res.data?.email || email.trim(),
            phone: res.data?.phone || phone.trim(),
            code: res.data?.affiliate_code || 'STHCCTV...',
            requiresEmailConfirmation: true,
            message: res.message,
          });
        } else {
          // Trường hợp 2: Không yêu cầu xác nhận email -> Chuyển đến /login kèm thông báo
          onOpenLogin(
            email.trim(),
            'Đăng ký thành công. Vui lòng đăng nhập. Tài khoản đang chờ trường duyệt.'
          );
        }
      } else {
        setFormErrors({
          general: res.error || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.',
        });
      }
    } catch (err: any) {
      setFormErrors({
        general: err.message || 'Lỗi kết nối máy chủ xác thực. Vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
    setFormErrors({});
    setSubmissionSuccessData(null);
  };

  // Cuộn mượt đến form đăng ký trên cả mobile và desktop
  const scrollToRegistration = () => {
    const formEl = document.getElementById('affiliate-registration-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const firstInput = formEl.querySelector('input') as HTMLInputElement | null;
        if (firstInput) {
          firstInput.focus();
        }
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. DUY NHẤT MỘ HEADER: BÊN TRÁI LOGO - BÊN PHẢI ĐÚNG 2 NÚT ĐĂNG NHẬP/ĐĂNG KÝ */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#0B172E]/95 backdrop-blur-md border-b border-slate-800/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Bên trái: Logo và tên Trường Saigontourist */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center text-amber-400 border border-amber-400/30 shadow-md shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-none">
                  {config.header.logoText}
                </span>
                {config.header.logoBadgeText && (
                  <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                    {config.header.logoBadgeText}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-blue-200/80 tracking-wider mt-0.5">
                {config.header.subLogoText}
              </p>
            </div>
          </div>

          {/* Bên phải: đúng hai nút “Đăng nhập” và “Đăng ký” */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onOpenLogin()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-slate-200 hover:text-white hover:bg-slate-800/80 font-semibold text-xs sm:text-sm rounded-xl transition-all border border-slate-700/80 whitespace-nowrap active:scale-95"
            >
              {config.header.loginButtonText || 'Đăng nhập'}
            </button>

            <button
              type="button"
              onClick={scrollToRegistration}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              {config.header.registerButtonText || 'Đăng ký'}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. PHẦN GIỚI THIỆU ĐƠN GIẢN HÓA & FORM ĐĂNG KÝ (2 CỘT DESKTOP, 1 CỘT MOBILE) */}
      {/* ========================================================================= */}
      {config.hero.enabled && (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] py-8 sm:py-12 lg:py-16">
          {/* Vầng sáng nền tinh tế */}
          <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* CỘT TRÁI: GIỚI THIỆU & NỘI DUNG CHÍNH SÁCH NGẮN GỌN (7 Cột desktop) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Tiêu đề chính và thông điệp lớn */}
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                    {config.hero.headline}{' '}
                    <span className="text-amber-400 block sm:inline">
                      {config.hero.highlightText}
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-xl">
                    {config.hero.subheadline}
                  </p>
                </div>

                {/* Khung chính sách thù lao và chờ duyệt trình bày ngắn gọn, dễ đọc */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#0F2347]/80 border border-blue-600/40 shadow-xl backdrop-blur-sm space-y-4">
                  {/* Mức thù lao 500.000 VNĐ */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold shrink-0 shadow-md">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
                          {config.policy.rewardAmountText}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-blue-200">
                          {config.policy.rewardUnitText}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                        {config.policy.rewardConditionText}
                      </p>
                    </div>
                  </div>

                  {/* Quy định trạng thái Chờ duyệt */}
                  <div className="pt-3 border-t border-blue-800/60 flex items-start gap-2.5 text-xs text-amber-200">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong className="text-amber-300 font-semibold">Tài khoản chờ duyệt:</strong>{' '}
                      {config.policy.reviewNoticeText}
                    </p>
                  </div>
                </div>

                {/* Hình ảnh minh họa trường học / sinh viên đào tạo STHC */}
                {config.hero.illustration && (
                  <div className="rounded-2xl overflow-hidden border border-blue-800/40 bg-slate-950 shadow-xl">
                    {config.hero.illustration.url && !imageError ? (
                      <img
                        src={config.hero.illustration.url}
                        alt={config.hero.illustration.alt}
                        onError={() => setImageError(true)}
                        className="w-full h-52 sm:h-60 object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-44 sm:h-52 bg-gradient-to-br from-blue-900/60 via-indigo-950/60 to-slate-950 p-6 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                          <GraduationCap className="w-4 h-4 text-amber-400" />
                          <span>Trường Du lịch & Khách sạn Saigontourist — Hơn 35 năm uy tín đào tạo</span>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-white">
                            Mạng Lưới Tuyển Sinh 5 Ngành Nghề Hàng Đầu
                          </h4>
                          <p className="text-xs text-blue-200/90 mt-1">
                            Kỹ thuật chế biến món ăn · Bếp bánh Âu · Pha chế · Quản trị khách sạn · Hướng dẫn lữ hành
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CỘT PHẢI: FORM ĐĂNG KÝ CTV (5 Cột desktop, 1 cột mobile) */}
              <div id="affiliate-registration-card" className="lg:col-span-5 scroll-mt-20">
                <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative">
                  
                  {/* Form Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 sm:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {config.form.title}
                    </h3>
                    <p className="text-xs text-blue-200 leading-relaxed mt-1">
                      {config.form.subtitle}
                    </p>
                  </div>

                  {/* SUCCESS STATE */}
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
                          Cảm ơn bạn <strong>{submissionSuccessData.fullName}</strong>. Ban Tuyển sinh Trường Saigontourist đã tiếp nhận thông tin và sẽ xác minh hồ sơ.
                        </p>
                      </div>

                      {submissionSuccessData.requiresEmailConfirmation && (
                        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-left flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Yêu cầu xác thực email:</span>
                            <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                              Hệ thống đã gửi liên kết xác nhận đến <strong>{submissionSuccessData.email}</strong>. Vui lòng kiểm tra hộp thư và bấm xác nhận trước khi đăng nhập.
                            </p>
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
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Email đăng nhập:</span>
                          <span className="font-semibold text-slate-800">{submissionSuccessData.email}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Số điện thoại:</span>
                          <span className="font-semibold text-slate-800">{submissionSuccessData.phone}</span>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 text-left flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>
                          Theo quy định bảo mật, liên kết giới thiệu và mã QR sẽ tự động kích hoạt ngay sau khi hồ sơ được chuyển sang trạng thái <strong>ACTIVE</strong>.
                        </span>
                      </div>

                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenLogin(
                              submissionSuccessData.email,
                              'Đăng ký thành công. Vui lòng đăng nhập. Tài khoản đang chờ trường duyệt.'
                            )
                          }
                          className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                        >
                          <LogIn className="w-4 h-4 text-amber-400" />
                          <span>Đến Màn Hình Đăng Nhập Cổng CTV</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetForm}
                          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
                        >
                          Đăng ký tài khoản khác
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* FORM INPUTS */
                    <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 text-xs">
                      {formErrors.general && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                          <span className="leading-relaxed font-semibold">{formErrors.general}</span>
                        </div>
                      )}

                      {/* Họ và tên */}
                      <div>
                        <label className="block font-semibold text-slate-800 mb-1">
                          Họ và tên CTV <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                          }}
                          placeholder={config.form.fullNamePlaceholder}
                          className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                            formErrors.fullName
                              ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                              : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                          }`}
                        />
                        {formErrors.fullName && (
                          <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>{formErrors.fullName}</span>
                          </p>
                        )}
                      </div>

                      {/* Số điện thoại & Email (2 Cột trên màn hình sm trở lên) */}
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
                              if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                            }}
                            placeholder={config.form.phonePlaceholder}
                            className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                              formErrors.phone
                                ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                                : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                            }`}
                          />
                          {formErrors.phone && (
                            <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{formErrors.phone}</span>
                            </p>
                          )}
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
                              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                            }}
                            placeholder={config.form.emailPlaceholder}
                            className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                              formErrors.email
                                ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                                : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                            }`}
                          />
                          {formErrors.email && (
                            <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{formErrors.email}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Mật khẩu & Nhập lại mật khẩu */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-800 mb-1">
                            Mật khẩu <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                              }}
                              placeholder={config.form.passwordPlaceholder}
                              className={`w-full pl-3.5 pr-9 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                                formErrors.password
                                  ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                                  : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {formErrors.password && (
                            <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{formErrors.password}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-800 mb-1">
                            Nhập lại mật khẩu <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (formErrors.confirmPassword)
                                  setFormErrors((prev) => ({ ...prev, confirmPassword: '' }));
                              }}
                              placeholder={config.form.confirmPasswordPlaceholder}
                              className={`w-full pl-3.5 pr-9 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                                formErrors.confirmPassword
                                  ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                                  : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {formErrors.confirmPassword && (
                            <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{formErrors.confirmPassword}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Checkbox Đồng ý điều khoản */}
                      <div className="pt-1">
                        <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-600 select-none">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (formErrors.termsAccepted)
                                setFormErrors((prev) => ({ ...prev, termsAccepted: '' }));
                            }}
                            className="mt-0.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900 shrink-0 w-4 h-4"
                          />
                          <span>
                            {config.form.termsCheckboxText}{' '}
                            <span className="font-semibold text-blue-900 hover:underline">
                              {config.form.termsLinkText}
                            </span>
                            .
                          </span>
                        </label>
                        {formErrors.termsAccepted && (
                          <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 pl-6">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{formErrors.termsAccepted}</span>
                          </p>
                        )}
                      </div>

                      {/* Tóm tắt chính sách trực tiếp trong form */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                        <p>
                          • Thù lao: <strong className="text-slate-900">500.000 VNĐ / hồ sơ nhập học</strong> (sau khi học viên hoàn tất đóng học phí).
                        </p>
                        <p>
                          • Trạng thái: Tài khoản mới sẽ ở trạng thái <strong className="text-amber-800">CHỜ DUYỆT</strong> trước khi được cấp link giới thiệu.
                        </p>
                      </div>

                      {/* Nút gửi form đăng ký */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
                      >
                        {isSubmitting ? (
                          <span>Đang gửi hồ sơ đăng ký...</span>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-amber-400" />
                            <span>{config.form.submitButtonText}</span>
                          </>
                        )}
                      </button>

                      {/* Liên kết đăng nhập nếu đã có tài khoản */}
                      <div className="text-center pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenLogin()}
                          className="text-xs text-blue-900 hover:text-blue-950 font-semibold hover:underline"
                        >
                          {config.form.loginRedirectText}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. QUY TRÌNH 3 BƯỚC ĐƠN GIẢN (Steps Section)                                */}
      {/* ========================================================================= */}
      {config.stepsSection.enabled && (
        <section className="py-14 bg-[#050B14] border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 inline-flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5" />
                <span>{config.stepsSection.tagline}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {config.stepsSection.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {config.stepsSection.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {config.stepsSection.steps.map((step) => (
                <div
                  key={step.id}
                  className="p-6 rounded-2xl bg-[#0B172E]/60 border border-slate-800 hover:border-blue-700/50 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-amber-400">
                      {step.number}
                    </span>
                    {step.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/40">
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. CÂU HỎI THƯỜNG GẶP (FAQ Accordion)                                      */}
      {/* ========================================================================= */}
      {config.faqSection.enabled && (
        <section className="py-14 bg-[#081220] border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/40 inline-flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>{config.faqSection.tagline}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {config.faqSection.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {config.faqSection.description}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {config.faqSection.faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-slate-800 rounded-xl bg-[#0B172E]/40 overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <span className="font-bold text-xs sm:text-sm text-white">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. BANNER CUỐI TRANG                                                      */}
      {/* ========================================================================= */}
      {config.ctaBanner.enabled && (
        <section className="py-12 bg-gradient-to-r from-blue-950 via-[#0B172E] to-indigo-950 border-t border-slate-800 text-center">
          <div className="max-w-3xl mx-auto px-4 space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {config.ctaBanner.headline}
            </h3>
            <p className="text-xs sm:text-sm text-blue-200">
              {config.ctaBanner.subheadline}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={scrollToRegistration}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95"
              >
                {config.ctaBanner.buttonText}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
