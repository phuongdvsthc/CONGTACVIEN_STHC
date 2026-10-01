import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { UserProfile } from '../../types';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Landmark,
  X,
  Loader2,
  ArrowLeft,
  PauseCircle,
  Shield,
  FileText,
} from 'lucide-react';

interface ProfileDetailViewProps {
  currentUser?: any;
  currentRole?: string;
  isModal?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  currentUser,
  currentRole,
  isModal = false,
  onClose,
  onBack,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // requestId để chống race condition khi đổi tài khoản
  const requestIdRef = useRef<number>(0);

  const fetchProfile = async () => {
    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setAvatarError(false);

    try {
      const res = await api.getUserProfile();
      // Chống stale response ghi đè hồ sơ tài khoản mới
      if (currentReqId !== requestIdRef.current) return;

      if (res.success && res.data) {
        setProfile(res.data);
      } else {
        setError(res.error || 'Không thể tải thông tin hồ sơ cá nhân.');
      }
    } catch (err: any) {
      if (currentReqId !== requestIdRef.current) return;
      setError(err?.message || 'Lỗi kết nối máy chủ khi tải hồ sơ.');
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    // Dọn dẹp cache/state khi unmount hoặc đổi tài khoản
    return () => {
      requestIdRef.current++;
    };
  }, [currentUser?.id, currentRole]);

  const formatDateVN = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateOnlyVN = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail.trim()) return 'ST';
    const clean = nameOrEmail.split('@')[0];
    const words = clean.trim().split(/[\s._-]+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Helper hiển thị an toàn: rỗng/null/undefined hiển thị "Chưa cập nhật"
  const renderText = (val?: string | null, placeholder: string = 'Chưa cập nhật') => {
    if (val === undefined || val === null) return placeholder;
    const str = String(val).trim();
    return str !== '' ? str : placeholder;
  };

  // 1. Trạng thái Đang tải (Loading State)
  if (loading) {
    const loadingContent = (
      <div className="p-8 sm:p-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[360px] text-center space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center shadow-inner">
          <Loader2 className="w-7 h-7 animate-spin text-blue-900" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">Đang tải thông tin cá nhân...</h3>
          <p className="text-xs text-slate-500">Đang truy vấn hồ sơ bảo mật từ cơ sở dữ liệu hệ thống.</p>
        </div>
      </div>
    );

    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            {loadingContent}
          </div>
        </div>
      );
    }
    return loadingContent;
  }

  // 2. Trạng thái Lỗi tải hồ sơ (Error State)
  if (error) {
    const errorContent = (
      <div className="p-8 sm:p-12 max-w-3xl mx-auto animate-fade-in space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        )}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-950">Không thể tải thông tin hồ sơ</h3>
            <p className="text-xs text-rose-700 leading-relaxed max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={fetchProfile}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
          >
            Thử lại
          </button>
        </div>
      </div>
    );

    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {errorContent}
          </div>
        </div>
      );
    }
    return errorContent;
  }

  // 3. Trạng thái Trống / Chưa có hồ sơ (Empty State)
  if (!profile) {
    const emptyContent = (
      <div className="p-8 sm:p-12 max-w-3xl mx-auto text-center space-y-4 animate-fade-in">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        )}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <User className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Chưa có thông tin hồ sơ</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hồ sơ tài khoản hiện chưa có dữ liệu. Vui lòng đăng nhập lại hoặc liên hệ Ban Quản trị hệ thống.
          </p>
        </div>
      </div>
    );

    if (isModal) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {emptyContent}
          </div>
        </div>
      );
    }
    return emptyContent;
  }

  // 4. Trạng thái Hiển thị đầy đủ (Full State)
  const isAffiliate = profile.role === 'affiliate';
  const isAdmin = profile.role === 'admin';
  const isStaff = profile.role === 'staff';

  const roleLabel = isAdmin
    ? 'Quản trị viên'
    : isStaff
    ? 'Cán bộ Tuyển sinh'
    : 'Cộng tác viên Tuyển sinh';

  const roleBadgeColor = isAdmin
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : isStaff
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  const affiliateStatus = profile.affiliate_status || 'PENDING_REVIEW';
  const isVerified = Boolean(profile.email_verified);

  const mainView = (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Top Header & Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{isAffiliate ? 'Cổng Cộng tác viên' : 'Cổng Quản trị'}</span>
            <span>/</span>
            <span className="font-semibold text-blue-900">Thông tin cá nhân</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>{renderText(profile.full_name)}</span>
            {isAffiliate && profile.affiliate_code && (
              <span className="font-mono text-xs px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200/60 font-semibold">
                {profile.affiliate_code}
              </span>
            )}
            <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {onBack && !isModal && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <X className="w-4 h-4" />
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Grid Content: Left Summary Card + Right Detailed Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* A. THÔNG TIN TỔNG QUAN (CỘT TRÁI) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
            {/* Avatar thật hoặc biểu tượng mặc định / Chữ cái từ tên thật */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-3 overflow-hidden relative border border-slate-200">
              {profile.avatar_url && !avatarError ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : profile.full_name ? (
                <span>{getInitials(profile.full_name)}</span>
              ) : (
                <User className="w-8 h-8 text-blue-200" />
              )}
            </div>

            <h2 className="font-bold text-slate-900 text-base">{renderText(profile.full_name)}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{renderText(profile.email)}</p>
            <span className={`mt-2 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Trạng thái tài khoản */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Trạng thái tài khoản</span>
              <div>
                {profile.is_active ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đang hoạt động
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200">
                    Tạm khóa
                  </span>
                )}
              </div>
            </div>

            {/* Trạng thái CTV (Chỉ hiển thị với vai trò CTV) */}
            {isAffiliate && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Trạng thái CTV</span>
                <div>
                  {affiliateStatus === 'ACTIVE' && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã kích hoạt
                    </span>
                  )}
                  {affiliateStatus === 'PENDING_REVIEW' && (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-200">
                      Chờ duyệt
                    </span>
                  )}
                  {affiliateStatus === 'SUSPENDED' && (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200">
                      Tạm ngưng
                    </span>
                  )}
                  {affiliateStatus === 'REJECTED' && (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200">
                      Từ chối
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Trạng thái xác thực email */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Xác thực email</span>
              <div>
                {isVerified ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đã xác thực
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-200">
                    Chưa xác thực
                  </span>
                )}
              </div>
            </div>

            {/* Ngày đăng ký tài khoản */}
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 font-medium">Ngày đăng ký</span>
              <span className="font-mono text-slate-800">{formatDateVN(profile.created_at)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CỘT PHẢI: B & C & D */}
        {/* ========================================================================= */}
        <div className="md:col-span-2 space-y-6">
          {/* ========================================================================= */}
          {/* B. THÔNG TIN LIÊN HỆ & ĐỊNH DANH */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-900" />
              Thông tin liên hệ & Định danh
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Họ và tên (Chỉ đọc)
                </span>
                <p className="font-semibold text-slate-900">{renderText(profile.full_name)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email đăng nhập (Chỉ đọc)
                </span>
                <p className="font-semibold font-mono text-slate-900">{renderText(profile.email)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại (Chỉ đọc)
                </span>
                <p className="font-semibold font-mono text-slate-900">{renderText(profile.phone)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa chỉ cư trú
                </span>
                <p className="font-semibold text-slate-900">{renderText(profile.address)}</p>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* C. THÔNG TIN BỔ SUNG */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-blue-900" />
              Thông tin bổ sung
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Trường "Mã số thuế" – Áp dụng cho cả Admin, Staff và CTV */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Mã số thuế
                </span>
                <p className="font-semibold font-mono text-slate-900">
                  {renderText(profile.tax_code)}
                </p>
              </div>

              {/* Các trường nghiệp vụ theo vai trò */}
              {isAffiliate ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số CCCD (phục vụ đối soát)
                    </span>
                    <p className="font-semibold font-mono text-slate-900">
                      {renderText(profile.id_card_number)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày cấp CCCD
                    </span>
                    <p className="font-semibold font-mono text-slate-900">
                      {profile.id_card_issued_date ? formatDateOnlyVN(profile.id_card_issued_date) : 'Chưa cập nhật'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Nghề nghiệp / Đơn vị công tác
                    </span>
                    <p className="font-semibold text-slate-900">{renderText(profile.occupation)}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số tài khoản ngân hàng
                    </span>
                    <p className="font-semibold font-mono text-slate-900">
                      {renderText(profile.bank_account_number)}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Landmark className="w-3.5 h-3.5 text-slate-400" /> Ngân hàng & Chi nhánh
                    </span>
                    <p className="font-semibold text-slate-900">{renderText(profile.bank_name)}</p>
                  </div>
                </>
              ) : (
                /* Với Admin / Staff: Không ép các trường chỉ phục vụ nghiệp vụ CTV */
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" /> Đơn vị công tác / Bộ phận
                  </span>
                  <p className="font-semibold text-slate-900">
                    Ban Tuyển sinh & Hợp tác doanh nghiệp – Trường Saigontourist
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* D. THÔNG TIN TÀI KHOẢN & HOẠT ĐỘNG */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-900" />
              Thông tin tài khoản & Hoạt động
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Ngày đăng ký tài khoản</span>
                <p className="font-semibold font-mono text-slate-900">
                  {formatDateVN(profile.created_at)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Ngày cập nhật gần nhất</span>
                <p className="font-semibold font-mono text-slate-900">
                  {formatDateVN(profile.updated_at || profile.created_at)}
                </p>
              </div>

              {/* Thông tin phê duyệt CTV (chỉ hiển thị khi phù hợp với quyền xem của chính CTV) */}
              {isAffiliate && profile.reviewed_at && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-slate-500 font-medium">Thông tin duyệt hồ sơ CTV</span>
                  <p className="font-semibold text-slate-900">
                    Đã được duyệt bởi {profile.reviewer_name || 'Cán bộ Tuyển sinh'} vào {formatDateVN(profile.reviewed_at)}
                  </p>
                </div>
              )}

              {/* Thông tin tạm ngưng CTV (nếu có) */}
              {isAffiliate && affiliateStatus === 'SUSPENDED' && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1 sm:col-span-2">
                  <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                    <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                    Thông báo tạm ngưng hoạt động
                  </span>
                  <p className="text-slate-700 pt-0.5">
                    Lý do: <span className="italic font-medium text-slate-900">"{profile.suspension_reason || 'Tài khoản đang tạm ngưng theo quy chế CTV.'}"</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
        <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full my-8 max-h-[92vh] overflow-y-auto relative">
          <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs p-4 flex justify-end border-b border-slate-200">
            <button
              onClick={onClose}
              className="p-2 bg-white rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {mainView}
        </div>
      </div>
    );
  }

  return mainView;
};
