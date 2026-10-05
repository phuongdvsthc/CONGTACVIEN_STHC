import React, { useState } from 'react';
import {
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  CheckCircle2,
  Award,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import { AffiliateLandingConfig } from '../../types/landingConfig';
import { defaultLandingConfig } from '../../config/defaultLandingConfig';
import { Header } from '../common/Header';
import { useSystemBranding } from '../../contexts/SystemBrandingContext';

interface LoginPageProps {
  config?: AffiliateLandingConfig;
  initialEmail?: string;
  successNotice?: string | null;
  requestedRedirect?: string | null;
  onLoginSuccess: (authData: any, requestedRedirect?: string | null) => void;
  onNavigateToRegister: () => void;
  onNavigateToForgot: () => void;
  onGoHome: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  config = defaultLandingConfig,
  initialEmail = '',
  successNotice = null,
  requestedRedirect = null,
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToForgot,
  onGoHome,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { branding, isLoading } = useSystemBranding();
  const [serverNotice, setServerNotice] = useState<string | null>(
    successNotice || (requestedRedirect ? 'Vui lòng đăng nhập để tiếp tục truy cập khu vực nội bộ.' : null)
  );

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(cleanEmail)) {
      errors.email = 'Địa chỉ email không đúng định dạng.';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setFormErrors({});
    setServerNotice(null);

    try {
      const res = await api.login(email.trim(), password);

      if (res.success && res.data) {
        // Kiểm tra tài khoản có bị vô hiệu hóa
        if (res.data.user?.is_active === false) {
          setFormErrors({
            general: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Ban Tuyển sinh Nhà trường để được hỗ trợ.',
          });
          return;
        }

        // Chuyển kết quả sang App.tsx xử lý phân quyền theo đúng dữ liệu hệ thống
        onLoginSuccess(res.data, requestedRedirect);
      } else {
        // Hiển thị thông báo lỗi bằng tiếng Việt chuẩn
        let errorMsg = res.error || 'Email hoặc mật khẩu không đúng.';
        if (res.code === 'EMAIL_NOT_CONFIRMED' || errorMsg.includes('xác nhận')) {
          errorMsg = 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư để xác nhận trước khi đăng nhập.';
        } else if (res.code === 'INVALID_CREDENTIALS') {
          errorMsg = 'Email hoặc mật khẩu không đúng.';
        }

        setFormErrors({
          general: errorMsg,
        });
      }
    } catch (err: any) {
      setFormErrors({
        general: 'Không thể kết nối, vui lòng thử lại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
      {/* 1. Header đồng bộ với trang /: Logo bên trái - Nút Đăng ký bên phải */}
      <Header
        currentRole="public"
        activeTab="affiliate_landing"
        onNavigate={(tab) => {
          if (tab === 'affiliate_landing') onGoHome();
          else if (tab === 'public_catalog') {
            window.location.href = '/catalog';
          }
        }}
        onOpenConsultationModal={() => {}}
        onOpenRegisterAffiliate={onNavigateToRegister}
        onOpenLoginAffiliate={() => {}}
      />

      {/* 2. Main Login Section: Nền xanh, 2 cột Desktop / 1 cột Mobile */}
      <main className="flex-1 flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* CỘT TRÁI (DESKTOP): HÌNH MINH HỌA & THÔNG ĐIỆP BẢO MẬT (6 Cột) */}
          <div className="hidden lg:block lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <span className="text-xs font-bold text-amber-400 tracking-wider uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 inline-block whitespace-normal break-words max-w-full">
                {isLoading ? 'ĐANG TẢI...' : (branding.system_name || 'CỔNG CỘNG TÁC VIÊN TUYỂN SINH')}
              </span>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight break-words">
                Chào Mừng Bạn Trở Lại Với{' '}
                <span className="text-amber-400 break-words">{isLoading ? '...' : (branding.unit_name || 'Saigontourist')}</span>
              </h1>
              <p className="text-sm text-blue-100/90 leading-relaxed">
                Đăng nhập để theo dõi hồ sơ người học quan tâm, lấy link/mã QR giới thiệu và đối soát thù lao 500.000 VNĐ / hồ sơ nhập học hợp lệ.
              </p>
            </div>

            {/* Khung minh họa thương hiệu STHC */}
            <div className="rounded-2xl overflow-hidden border border-blue-800/40 bg-slate-950/80 shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-blue-900/60 pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-bold flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Chính Sách Thù Lao Tuyển Sinh</h4>
                  <p className="text-xs text-blue-200">500.000 VNĐ / học viên hoàn tất đóng học phí</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Cập nhật tiến độ hồ sơ tuyển sinh minh bạch theo thời gian thực.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Tự động kích hoạt liên kết giới thiệu và mã QR khi tài khoản ACTIVE.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Bảo mật thông tin người học tuân thủ Nghị định 13/2023/NĐ-CP.</span>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (DESKTOP) / CỘT CHÍNH (MOBILE): KHUNG FORM TRẮNG (6 Cột) */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80">
              
              {/* Form Title */}
              <div className="space-y-1.5 mb-6">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {config.loginPage.title || 'Đăng nhập'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {config.loginPage.subtitle || 'Nhập email và mật khẩu để truy cập tài khoản CTV'}
                </p>
              </div>

              {/* Thông báo thành công từ bước đăng ký (nếu có) */}
              {serverNotice && (
                <div className="p-3.5 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-relaxed font-medium">{serverNotice}</span>
                </div>
              )}

              {/* Thông báo lỗi tổng quát */}
              {formErrors.general && (
                <div className="p-3.5 mb-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed font-medium">{formErrors.general}</span>
                </div>
              )}

              {/* Biểu mẫu đăng nhập */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Trường: Email đăng nhập (Chỉ cho đăng nhập bằng email) */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1.5">
                    {config.loginPage.emailLabel || 'Email đăng nhập'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder={config.loginPage.emailPlaceholder || 'Nhập địa chỉ email của bạn'}
                    autoComplete="email"
                    className={`w-full px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                      formErrors.email
                        ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                        : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{formErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Trường: Mật khẩu (Có nút hiện / ẩn) */}
                <div>
                  <label className="block font-semibold text-slate-800 mb-1.5">
                    {config.loginPage.passwordLabel || 'Mật khẩu'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder={config.loginPage.passwordPlaceholder || 'Nhập mật khẩu tài khoản'}
                      autoComplete="current-password"
                      className={`w-full pl-3.5 pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 text-xs transition-colors ${
                        formErrors.password
                          ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 focus:border-rose-600'
                          : 'border-slate-300 focus:ring-blue-900/20 focus:border-blue-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {formErrors.password ? (
                      <p className="text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{formErrors.password}</span>
                      </p>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={onNavigateToForgot}
                      className="text-xs font-semibold text-blue-900 hover:text-blue-950 hover:underline ml-auto"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>

                {/* Nút gửi Đăng nhập: Khóa khi đang gửi để tránh bấm lặp */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
                >
                  {isSubmitting ? (
                    <span>{config.loginPage.submittingButtonText || 'Đang đăng nhập...'}</span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 text-amber-400" />
                      <span>{config.loginPage.submitButtonText || 'Đăng nhập'}</span>
                    </>
                  )}
                </button>

                {/* Liên kết quay lại đăng ký tại / */}
                <div className="text-center pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-600">
                    {config.loginPage.registerLinkPrefix || 'Chưa có tài khoản?'}{' '}
                    <button
                      type="button"
                      onClick={onNavigateToRegister}
                      className="font-bold text-blue-900 hover:text-blue-950 hover:underline"
                    >
                      {config.loginPage.registerLinkText || 'Đăng ký'}
                    </button>
                  </p>
                </div>
              </form>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
