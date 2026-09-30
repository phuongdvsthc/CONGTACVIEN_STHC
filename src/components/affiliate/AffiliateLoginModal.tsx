import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { X, LogIn, Lock, Mail, AlertCircle, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';

interface AffiliateLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (authData: any) => void;
  onSwitchToRegister: () => void;
  initialEmail?: string;
  successMessage?: string | null;
}

export const AffiliateLoginModal: React.FC<AffiliateLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSwitchToRegister,
  initialEmail = '',
  successMessage,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email đăng nhập.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.success) {
        onLoginSuccess(res.data);
      } else {
        setError(res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickAccount = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('123456');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <LogIn className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">ĐĂNG NHẬP CỔNG CỘNG TÁC VIÊN</h3>
              <p className="text-xs text-blue-200">Trường Du Lịch Saigontourist (STHC)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Email đăng nhập
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ctv@sthc.edu.vn"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>Đăng Nhập Vào Cổng CTV</span>
                </>
              )}
            </button>
          </form>

          {/* Quick-select test accounts for testing */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tài khoản thử nghiệm nhanh (1-Click):
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickAccount('ctv_hoat_dong@sthc.edu.vn')}
                className="p-2 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 rounded-lg text-left transition-colors"
              >
                <span className="font-bold text-emerald-900 block text-[11px]">CTV Hoạt động</span>
                <span className="text-[10px] text-emerald-700 block truncate">ctv_hoat_dong@sthc.edu.vn</span>
                <span className="text-[9px] text-emerald-600 block mt-0.5">Trạng thái: ACTIVE</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickAccount('ctv_cho_duyet@sthc.edu.vn')}
                className="p-2 border border-amber-200 bg-amber-50/60 hover:bg-amber-100 rounded-lg text-left transition-colors"
              >
                <span className="font-bold text-amber-900 block text-[11px]">CTV Chờ duyệt</span>
                <span className="text-[10px] text-amber-700 block truncate">ctv_cho_duyet@sthc.edu.vn</span>
                <span className="text-[9px] text-amber-600 block mt-0.5">Trạng thái: PENDING_REVIEW</span>
              </button>
            </div>
          </div>

          {/* Bottom Switch to Register */}
          <div className="pt-2 text-center text-xs text-slate-500">
            <span>Chưa có tài khoản Đại sứ CTV? </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-900 font-bold hover:underline"
            >
              Đăng ký ngay tại đây
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
