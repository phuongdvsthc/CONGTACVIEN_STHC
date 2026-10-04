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
  Camera,
  Edit3,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ProfileDetailViewProps {
  currentUser?: any;
  currentRole?: string;
  isModal?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  onAvatarUpdated?: () => void;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({
  currentUser,
  currentRole,
  isModal = false,
  onClose,
  onBack,
  onAvatarUpdated,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  // P3 Edit Profile States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    address: '',
    tax_code: '',
    id_card_number: '',
    id_card_issued_date: '',
    occupation: '',
    bank_account_number: '',
    bank_name: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // P4 Avatar Change States
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarErrorMsg, setAvatarErrorMsg] = useState<string | null>(null);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // requestId để chống race condition khi đổi tài khoản
  const requestIdRef = useRef<number>(0);

  const fetchProfile = async () => {
    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setAvatarError(false);

    try {
      const res = await api.getUserProfile();
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
    return () => {
      requestIdRef.current++;
    };
  }, [currentUser?.id, currentRole]);

  const handleStartEdit = () => {
    if (!profile) return;
    setEditForm({
      address: profile.address || '',
      tax_code: profile.tax_code || '',
      id_card_number: profile.id_card_number || '',
      id_card_issued_date: profile.id_card_issued_date ? profile.id_card_issued_date.slice(0, 10) : '',
      occupation: profile.occupation || '',
      bank_account_number: profile.bank_account_number || '',
      bank_name: profile.bank_name || '',
    });
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    if (editForm.id_card_issued_date) {
      const d = new Date(editForm.id_card_issued_date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (isNaN(d.getTime()) || new Date(d.getFullYear(), d.getMonth(), d.getDate()) > today) {
        setSaving(false);
        setSaveError('Ngày cấp CCCD không hợp lệ hoặc không thể lớn hơn ngày hiện tại.');
        return;
      }
    }

    try {
      const res = await api.updateUserProfile({
        address: editForm.address.trim(),
        tax_code: editForm.tax_code.trim(),
        id_card_number: editForm.id_card_number.trim(),
        id_card_issued_date: editForm.id_card_issued_date || undefined,
        occupation: editForm.occupation.trim(),
        bank_account_number: editForm.bank_account_number.trim(),
        bank_name: editForm.bank_name.trim(),
      });

      setSaving(false);
      if (res.success) {
        setSaveSuccess('Cập nhật hồ sơ cá nhân thành công.');
        setIsEditing(false);
        await fetchProfile();
        if (onAvatarUpdated) onAvatarUpdated();
      } else {
        setSaveError(res.error || 'Lỗi khi cập nhật hồ sơ cá nhân.');
      }
    } catch (err: any) {
      setSaving(false);
      setSaveError(err?.message || 'Lỗi kết nối máy chủ khi lưu hồ sơ.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarErrorMsg(null);
    setAvatarSuccessMsg(null);

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarErrorMsg('Chỉ hỗ trợ định dạng ảnh JPEG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarErrorMsg('Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB).');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;
    setAvatarLoading(true);
    setAvatarErrorMsg(null);
    setAvatarSuccessMsg(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onload = async () => {
        const base64String = reader.result as string;
        const res = await api.updateAvatar(base64String);
        setAvatarLoading(false);

        if (res.success && res.data?.avatar_url) {
          setAvatarSuccessMsg('Đổi ảnh đại diện thành công.');
          setProfile(prev => prev ? { ...prev, avatar_url: res.data!.avatar_url } : prev);
          if (onAvatarUpdated) onAvatarUpdated();
          setTimeout(() => {
            setIsAvatarModalOpen(false);
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setAvatarSuccessMsg(null);
          }, 1000);
        } else {
          setAvatarErrorMsg(res.error || 'Lỗi khi đổi ảnh đại diện.');
        }
      };
      reader.onerror = () => {
        setAvatarLoading(false);
        setAvatarErrorMsg('Không thể đọc file ảnh. Vui lòng thử lại.');
      };
    } catch (err: any) {
      setAvatarLoading(false);
      setAvatarErrorMsg(err?.message || 'Lỗi hệ thống khi tải ảnh lên.');
    }
  };

  const handleCancelAvatar = () => {
    setIsAvatarModalOpen(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAvatarErrorMsg(null);
    setAvatarSuccessMsg(null);
  };

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

  const renderText = (val?: string | null, placeholder: string = 'Chưa cập nhật') => {
    if (val === undefined || val === null) return placeholder;
    const str = String(val).trim();
    return str !== '' ? str : placeholder;
  };

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
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Edit3 className="w-4 h-4" /> Sửa hồ sơ
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          )}

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

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Grid Content: Left Summary Card + Right Detailed Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* A. THÔNG TIN TỔNG QUAN (CỘT TRÁI) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
            {/* Avatar thật hoặc biểu tượng mặc định / Chữ cái từ tên thật kèm nút Đổi ảnh */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-2 overflow-hidden relative border border-slate-200">
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
              <button
                type="button"
                onClick={() => {
                  setAvatarErrorMsg(null);
                  setAvatarSuccessMsg(null);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setIsAvatarModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors mt-1"
              >
                <Camera className="w-3.5 h-3.5 text-blue-900" /> Đổi ảnh
              </button>
            </div>

            <h2 className="font-bold text-slate-900 text-base mt-2">{renderText(profile.full_name)}</h2>
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

          {/* Card Đổi mật khẩu / Bảo mật tài khoản */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <KeyRound className="w-4 h-4 text-blue-900" />
              <span>Bảo mật tài khoản</span>
            </div>
            <p className="text-xs text-slate-500">
              Quản lý mật khẩu và bảo mật đăng nhập tài khoản của bạn.
            </p>
            <button
              type="button"
              onClick={() => {
                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                setPasswordError(null);
                setPasswordSuccess(null);
                setIsPasswordModalOpen(true);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors border border-slate-200 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-900" /> Đổi mật khẩu
            </button>
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
              {/* Họ và tên (Bảo vệ - Chỉ đọc) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Họ và tên
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Thông tin này không được chỉnh sửa tại đây
                  </span>
                </div>
                <p className="font-semibold text-slate-900 pt-1">{renderText(profile.full_name)}</p>
              </div>

              {/* Email đăng nhập (Bảo vệ - Chỉ đọc) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email đăng nhập
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Thông tin này không được chỉnh sửa tại đây
                  </span>
                </div>
                <p className="font-semibold font-mono text-slate-900 pt-1">{renderText(profile.email)}</p>
              </div>

              {/* Số điện thoại (Bảo vệ - Chỉ đọc) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Thông tin này không được chỉnh sửa tại đây
                  </span>
                </div>
                <p className="font-semibold font-mono text-slate-900 pt-1">{renderText(profile.phone)}</p>
              </div>

              {/* Địa chỉ cư trú (Được sửa) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa chỉ cư trú
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Nhập địa chỉ cư trú..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold text-slate-900 pt-1">{renderText(profile.address)}</p>
                )}
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
              {/* Mã số thuế */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Mã số thuế
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.tax_code}
                    onChange={(e) => setEditForm({ ...editForm, tax_code: e.target.value })}
                    placeholder="Nhập mã số thuế..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold font-mono text-slate-900 pt-1">{renderText(profile.tax_code)}</p>
                )}
              </div>

              {/* Số CCCD */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số CCCD (giữ số 0 ở đầu)
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.id_card_number}
                    onChange={(e) => setEditForm({ ...editForm, id_card_number: e.target.value })}
                    placeholder="Nhập số CCCD..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold font-mono text-slate-900 pt-1">{renderText(profile.id_card_number)}</p>
                )}
              </div>

              {/* Ngày cấp CCCD */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày cấp CCCD
                </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.id_card_issued_date}
                    onChange={(e) => setEditForm({ ...editForm, id_card_issued_date: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold font-mono text-slate-900 pt-1">
                    {profile.id_card_issued_date ? formatDateOnlyVN(profile.id_card_issued_date) : 'Chưa cập nhật'}
                  </p>
                )}
              </div>

              {/* Nghề nghiệp / Đơn vị công tác */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Nghề nghiệp / Đơn vị công tác
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.occupation}
                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                    placeholder="Nhập nghề nghiệp hoặc đơn vị công tác..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold text-slate-900 pt-1">{renderText(profile.occupation)}</p>
                )}
              </div>

              {/* Số tài khoản ngân hàng */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số tài khoản ngân hàng
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.bank_account_number}
                    onChange={(e) => setEditForm({ ...editForm, bank_account_number: e.target.value })}
                    placeholder="Nhập số tài khoản..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold font-mono text-slate-900 pt-1">{renderText(profile.bank_account_number)}</p>
                )}
              </div>

              {/* Ngân hàng & Chi nhánh */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" /> Ngân hàng & Chi nhánh
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.bank_name}
                    onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                    placeholder="Nhập tên ngân hàng & chi nhánh..."
                    className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <p className="font-semibold text-slate-900 pt-1">{renderText(profile.bank_name)}</p>
                )}
              </div>
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

              {/* Thông tin phê duyệt CTV */}
              {isAffiliate && profile.reviewed_at && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-slate-500 font-medium">Thông tin duyệt hồ sơ CTV</span>
                  <p className="font-semibold text-slate-900">
                    Đã được duyệt bởi {profile.reviewer_name || 'Cán bộ Tuyển sinh'} vào {formatDateVN(profile.reviewed_at)}
                  </p>
                </div>
              )}

              {/* Thông tin tạm ngưng CTV */}
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

      {/* Avatar Modal */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-900" /> Đổi ảnh đại diện
              </h3>
              <button
                onClick={handleCancelAvatar}
                disabled={avatarLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-28 h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center relative shadow-inner">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : profile.avatar_url && !avatarError ? (
                  <img src={profile.avatar_url} alt="Current" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Hỗ trợ định dạng: <span className="font-semibold text-slate-700">JPEG, PNG, WebP</span>.
                </p>
                <p className="text-xs text-slate-500">
                  Dung lượng tối đa: <span className="font-semibold text-slate-700">5 MB</span>.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors border border-slate-200"
              >
                Chọn ảnh từ máy tính
              </button>
            </div>

            {avatarErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{avatarErrorMsg}</span>
              </div>
            )}

            {avatarSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{avatarSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelAvatar}
                disabled={avatarLoading}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                disabled={avatarLoading || !selectedFile}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {avatarLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const passwordModalElement = isPasswordModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-900" /> Đổi mật khẩu
          </h3>
          <button
            onClick={() => setIsPasswordModalOpen(false)}
            className="p-1.5 bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại</label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showNewPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder="Nhập mật khẩu mới"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Yêu cầu: Tối thiểu 6 ký tự, bao gồm chữ và số.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nhập lại mật khẩu mới</label>
            <div className="relative">
              <input
                type={showConfirmPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder="Xác nhận mật khẩu mới"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-900 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={passwordSaving}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={async () => {
                setPasswordError(null);
                setPasswordSuccess(null);

                if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
                  setPasswordError('Vui lòng điền đầy đủ tất cả các trường mật khẩu.');
                  return;
                }
                if (passwordForm.new_password !== passwordForm.confirm_password) {
                  setPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
                  return;
                }
                if (passwordForm.new_password === passwordForm.current_password) {
                  setPasswordError('Mật khẩu mới phải khác với mật khẩu hiện tại.');
                  return;
                }
                if (passwordForm.new_password.length < 6) {
                  setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
                  return;
                }

                setPasswordSaving(true);
                try {
                  const res = await api.changePassword(passwordForm);
                  setPasswordSaving(false);
                  if (res.success) {
                    setPasswordSuccess('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
                    try {
                      localStorage.removeItem('sthc_auth_token');
                      localStorage.setItem('sthc_auth_event', 'logout:' + Date.now());
                    } catch (e) {}
                    setTimeout(() => {
                      window.location.href = '/login';
                    }, 1500);
                  } else {
                    setPasswordError(res.error || 'Lỗi khi đổi mật khẩu.');
                  }
                } catch (err: any) {
                  setPasswordSaving(false);
                  setPasswordError(err?.message || 'Lỗi kết nối máy chủ khi đổi mật khẩu.');
                }
              }}
              disabled={passwordSaving}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm inline-flex items-center gap-2"
            >
              {passwordSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Đổi mật khẩu
            </button>
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
        {passwordModalElement}
      </div>
    );
  }

  return (
    <>
      {mainView}
      {passwordModalElement}
    </>
  );
};
