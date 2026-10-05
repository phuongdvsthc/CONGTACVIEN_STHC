import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { Header } from '../common/Header';
import { useSystemBranding } from '../../contexts/SystemBrandingContext';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onGoHome: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
  onNavigateToRegister,
  onGoHome,
}) => {
  const { branding, syncTabIdentity } = useSystemBranding();
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    syncTabIdentity('Quên mật khẩu', '/forgot-password');
  }, [syncTabIdentity, branding]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || cooldown > 0) return;

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.forgotPassword(cleanEmail);
      if (res.success) {
        setSuccessMsg(res.message || 'Nếu email này đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.');
        setCooldown(60);
      } else {
        setErrorMsg(res.error || 'Không thể xử lý yêu cầu. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
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
        onOpenLoginAffiliate={onNavigateToLogin}
      />

      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 space-y-6">
            
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 mx-auto flex items-center justify-center font-bold">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quên Mật Khẩu?</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nhập email đăng ký tài khoản của bạn để nhận liên kết khôi phục mật khẩu từ hệ thống.
              </p>
            </div>

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Nhập địa chỉ email của bạn"
                  autoComplete="email"
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cooldown > 0}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Đang gửi yêu cầu...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Vui lòng chờ {cooldown}s để gửi lại</span>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Gửi liên kết đặt lại mật khẩu</span>
                  </>
                )}
              </button>

              <div className="text-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-950 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      </main>
    </div>
  );
};
