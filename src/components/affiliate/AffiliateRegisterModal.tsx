import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, UserPlus, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface AffiliateRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (affiliateData: any) => void;
  onSwitchToLogin?: () => void;
}

export const AffiliateRegisterModal: React.FC<AffiliateRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Họ tên, email và số điện thoại là bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerAffiliate({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        id_card_number: idCardNumber.trim() || undefined,
        occupation: occupation.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (res.success) {
        onSuccess(res.data);
      } else {
        setError(res.error || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <UserPlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">ĐĂNG KÝ CỘNG TÁC VIÊN TUYỂN SINH</h3>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Họ và tên CTV <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn An"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Email đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ctv@example.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Số CCCD (phục vụ đối soát thù lao)
              </label>
              <input
                type="text"
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="07920100xxxx"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Nghề nghiệp / Đơn vị công tác
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Cựu sinh viên / Hướng dẫn viên"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Địa chỉ cư trú
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Quận/Huyện, Tỉnh/TP"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Hồ sơ đăng ký sẽ được tiếp nhận ở trạng thái <strong>PENDING_REVIEW</strong>. Sau khi Cán bộ tuyển sinh phê duyệt, bạn sẽ nhận mã CTV chính thức và link tiếp thị.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            {onSwitchToLogin ? (
              <p className="text-[11px] text-slate-500">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-semibold text-blue-900 hover:underline"
                >
                  Đăng nhập tại đây
                </button>
              </p>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : 'Gửi Hồ Sơ Đăng Ký'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
