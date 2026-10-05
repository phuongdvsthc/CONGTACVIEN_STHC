import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { Header } from '../common/Header';
import { useSystemBranding } from '../../contexts/SystemBrandingContext';

interface ResetPasswordPageProps {
  onNavigateToLogin: (email?: string, notice?: string) => void;
  onNavigateToForgot: () => void;
  onNavigateToRegister: () => void;
  onGoHome: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigateToLogin,
  onNavigateToForgot,
  onNavigateToRegister,
  onGoHome,
}) => {
  const { branding, syncTabIdentity } = useSystemBranding();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    syncTabIdentity('Đặt lại mật khẩu', '/reset-password');
  }, [syncTabIdentity, branding]);

  useEffect(() => {
    async function checkSession() {
      try {
        // Kiểm tra xem Supabase client đã nhận diện session recovery từ URL hash / code chưa
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data.session) {
          setIsRecoveryValid(false);
        } else {
          setIsRecoveryValid(true);
        }
      } catch (err) {
        setIsRecoveryValid(false);
      } finally {
        setIsVerifying(false);
      }
    }

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsRecoveryValid(true);
        setIsVerifying(false);
      }
    });

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isRecoveryValid) return;

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message || 'Không thể cập nhật mật khẩu mới. Vui lòng thử lại.');
        setIsSubmitting(false);
        return;
      }

      // Xóa thông tin token nhạy cảm khỏi URL và kết thúc phiên recovery an toàn
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
        await supabaseClient.auth.signOut();
      } catch {}

      onNavigateToLogin('', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ khi cập nhật mật khẩu.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden">
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
        onOpenLoginAffiliate={() => onNavigateToLogin()}
      />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-6">
            
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-900 mx-auto flex items-center justify-center font-bold">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Đặt Lại Mật Khẩu</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nhập mật khẩu mới bảo mật cho tài khoản tuyển sinh của bạn.
              </p>
            </div>

            {isVerifying ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-900" />
                <span>Đang xác thực phiên khôi phục bảo mật...</span>
              </div>
            ) : !isRecoveryValid ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    Liên kết khôi phục mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToForgot}
                  className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Yêu cầu liên kết mới
                </button>
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1.5">
                      Mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        className="w-full pl-3.5 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-3.5 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Đang lưu mật khẩu...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Lưu mật khẩu mới</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onNavigateToLogin()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-950 hover:underline"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay lại đăng nhập</span>
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};
