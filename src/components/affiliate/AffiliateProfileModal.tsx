import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  User,
  Mail,
  Phone,
  CreditCard,
  Building2,
  MapPin,
  Calendar,
  Landmark,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Save,
} from 'lucide-react';

interface AffiliateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  currentAffiliate?: any;
  onProfileUpdated?: (updatedData: any) => void;
}

export const AffiliateProfileModal: React.FC<AffiliateProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentAffiliate,
  onProfileUpdated,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardIssuedDate, setIdCardIssuedDate] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [status, setStatus] = useState('PENDING_REVIEW');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getAffiliateProfile();
      if (res.success && res.data) {
        const d = res.data;
        setFullName(d.full_name || currentUser?.full_name || '');
        setEmail(d.email || currentUser?.email || '');
        setPhone(d.phone || currentUser?.phone || '');
        setAddress(d.address || currentAffiliate?.address || '');
        setOccupation(d.occupation || currentAffiliate?.occupation || '');
        setIdCardNumber(d.id_card_number || currentAffiliate?.id_card_number || '');
        setIdCardIssuedDate(d.id_card_issued_date ? d.id_card_issued_date.split('T')[0] : '');
        setBankAccountNumber(
          d.bank_account_number !== undefined && d.bank_account_number !== null
            ? String(d.bank_account_number)
            : ''
        );
        setBankName(d.bank_name || '');
        setAffiliateCode(d.affiliate_code || currentAffiliate?.affiliate_code || 'Chưa cấp');
        setStatus(d.status || currentAffiliate?.status || 'PENDING_REVIEW');
      } else {
        // Fallback to props
        setFullName(currentUser?.full_name || '');
        setEmail(currentUser?.email || '');
        setPhone(currentUser?.phone || '');
        setAddress(currentAffiliate?.address || '');
        setOccupation(currentAffiliate?.occupation || '');
        setIdCardNumber(currentAffiliate?.id_card_number || '');
        setIdCardIssuedDate(currentAffiliate?.id_card_issued_date || '');
        setBankAccountNumber(currentAffiliate?.bank_account_number || '');
        setBankName(currentAffiliate?.bank_name || '');
        setAffiliateCode(currentAffiliate?.affiliate_code || 'Chưa cấp');
        setStatus(currentAffiliate?.status || 'PENDING_REVIEW');
      }
    } catch (err: any) {
      console.warn('Failed to load profile from server, using local data:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validate họ và tên
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      setError('Họ và tên phải bao gồm đầy đủ cả họ và tên.');
      return;
    }

    // Validate số điện thoại
    const cleanPhone = phone.trim().replace(/\s/g, '');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      setError('Số điện thoại không hợp lệ (phải gồm 10 chữ số, ví dụ: 0901234567).');
      return;
    }

    // Validate ngày cấp CCCD (nếu có)
    if (idCardIssuedDate) {
      const parsed = new Date(idCardIssuedDate);
      const today = new Date();
      if (isNaN(parsed.getTime())) {
        setError('Ngày cấp CCCD không hợp lệ.');
        return;
      }
      const issuedOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (issuedOnly > todayOnly) {
        setError('Ngày cấp CCCD không thể lớn hơn ngày hiện tại.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await api.updateAffiliateProfile({
        full_name: fullName.trim(),
        phone: cleanPhone,
        address: address.trim() || undefined,
        occupation: occupation.trim() || undefined,
        id_card_number: idCardNumber.trim() || undefined,
        id_card_issued_date: idCardIssuedDate || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_name: bankName.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Cập nhật hồ sơ cá nhân thành công!');
        if (onProfileUpdated) {
          onProfileUpdated(res.data);
        }
      } else {
        setError(res.error || 'Cập nhật thất bại. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-400/30">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide">THÔNG TIN CÁ NHÂN & HỒ SƠ CTV</h3>
              <p className="text-xs text-blue-200">Quản lý và cập nhật thông tin đối soát thù lao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Read-Only System Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Mã CTV chính thức
              </span>
              <span className="font-mono text-xs font-bold text-blue-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 mt-1 inline-block">
                {affiliateCode}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Trạng thái duyệt
              </span>
              <div className="mt-1">
                {status === 'ACTIVE' && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[11px] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã kích hoạt
                  </span>
                )}
                {status === 'PENDING_REVIEW' && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-md text-[11px]">
                    Đang chờ duyệt
                  </span>
                )}
                {status === 'SUSPENDED' && (
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-md text-[11px]">
                    Tạm ngưng
                  </span>
                )}
                {status === 'REJECTED' && (
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-md text-[11px]">
                    Từ chối
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Email tài khoản
              </span>
              <span className="font-mono text-xs text-slate-700 mt-1 block">{email}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nhóm 1: Thông tin cơ bản */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2.5 pb-1 border-b border-slate-100">
                <User className="w-3.5 h-3.5 text-blue-900" /> Thông tin cơ bản
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Họ và tên CTV <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nghề nghiệp / Đơn vị công tác
                  </label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ví dụ: Hướng dẫn viên / Tự do"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Địa chỉ cư trú
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Quận/Huyện, Tỉnh/TP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Nhóm 2: Thông tin đối soát thù lao (CCCD & Ngân hàng) */}
            <div>
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2.5 pb-1 border-b border-slate-100">
                <CreditCard className="w-3.5 h-3.5 text-blue-900" /> Thông tin đối soát & Thù lao tuyển sinh
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Số CCCD
                  </label>
                  <input
                    type="text"
                    value={idCardNumber}
                    onChange={(e) => setIdCardNumber(e.target.value)}
                    placeholder="07920100xxxx"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Ngày cấp CCCD
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={idCardIssuedDate}
                    onChange={(e) => setIdCardIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Số tài khoản ngân hàng
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Giữ nguyên số 0 ở đầu nếu có.
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Ngân hàng & Chi nhánh
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ví dụ: Vietcombank - CN Bến Thành"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Thông tin CCCD và Số tài khoản ngân hàng được lưu trữ bảo mật để Nhà trường lập danh sách chi trả thù lao 500.000 VNĐ/thí sinh nhập học thành công.
              </span>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
