import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ArrowLeft,
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
  XCircle,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  Landmark,
  X,
  Loader2,
  History,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Shield,
  ShieldAlert,
  UserPlus,
  UserMinus,
} from 'lucide-react';

interface AffiliateDetailViewProps {
  affiliateId: string;
  currentUser?: any;
  onBack: () => void;
  onStatusUpdated?: () => void;
}

export const AffiliateDetailView: React.FC<AffiliateDetailViewProps> = ({
  affiliateId,
  currentUser,
  onBack,
  onStatusUpdated,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Action states for A1.3 & A1.4
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [reactivationNote, setReactivationNote] = useState('');

  // Modal & Action states for System Role Assignment (Admin only)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'staff' | 'affiliate'>('staff');
  const [roleReason, setRoleReason] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAffiliateDetail(affiliateId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Không thể tải thông tin chi tiết hồ sơ CTV.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchDetail();
    }
  }, [affiliateId]);

  const formatDateVN = (isoString?: string) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleApproveConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsProcessing(true);

    try {
      const res = await api.approveAffiliate(affiliateId, approvalNote.trim() || undefined);
      if (res.success && res.data) {
        setData((prev: any) => ({
          ...prev,
          ...res.data,
          status: 'ACTIVE',
          reviewed_by: res.data.reviewed_by || prev?.reviewed_by,
          reviewed_at: res.data.reviewed_at || new Date().toISOString(),
          review_note: res.data.review_note || (approvalNote.trim() || 'Hồ sơ đã được duyệt bởi Cán bộ Tuyển sinh'),
          reviewer: res.data.reviewer || prev?.reviewer || {
            id: currentUser?.id,
            full_name: currentUser?.full_name || 'Cán bộ Tuyển sinh',
            email: currentUser?.email,
          },
        }));
        setIsApproveModalOpen(false);
        setApprovalNote('');
        setActionSuccess('Phê duyệt hồ sơ Cộng tác viên thành công! Tài khoản đã được chuyển sang trạng thái Hoạt động.');
        if (onStatusUpdated) onStatusUpdated();
        fetchDetail();
      } else {
        setActionError(res.error || 'Phê duyệt hồ sơ thất bại.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setValidationError(null);

    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setValidationError('Vui lòng nhập lý do từ chối hồ sơ cộng tác viên.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.rejectAffiliate(affiliateId, cleanReason);
      if (res.success && res.data) {
        setData((prev: any) => ({
          ...prev,
          ...res.data,
          status: 'REJECTED',
          reviewed_by: res.data.reviewed_by || prev?.reviewed_by,
          reviewed_at: res.data.reviewed_at || new Date().toISOString(),
          review_note: cleanReason,
          reviewer: res.data.reviewer || prev?.reviewer || {
            id: currentUser?.id,
            full_name: currentUser?.full_name || 'Cán bộ Tuyển sinh',
            email: currentUser?.email,
          },
        }));
        setIsRejectModalOpen(false);
        setRejectionReason('');
        setActionSuccess('Đã từ chối tiếp nhận hồ sơ Cộng tác viên.');
        if (onStatusUpdated) onStatusUpdated();
        fetchDetail();
      } else {
        setActionError(res.error || 'Từ chối hồ sơ thất bại.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspendConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setValidationError(null);

    const cleanReason = suspensionReason.trim();
    if (!cleanReason) {
      setValidationError('Vui lòng nhập lý do tạm ngưng hoạt động của CTV.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.suspendAffiliate(affiliateId, cleanReason);
      if (res.success && res.data) {
        setIsSuspendModalOpen(false);
        setSuspensionReason('');
        setActionSuccess('Đã tạm ngưng hoạt động của Cộng tác viên thành công. Quyền tiếp thị và nhận giới thiệu mới đã được tạm dừng.');
        if (onStatusUpdated) onStatusUpdated();
        fetchDetail();
      } else {
        setActionError(res.error || 'Tạm ngưng hoạt động thất bại.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setValidationError(null);

    setIsProcessing(true);
    try {
      const res = await api.reactivateAffiliate(affiliateId, reactivationNote.trim() || undefined);
      if (res.success && res.data) {
        setIsReactivateModalOpen(false);
        setReactivationNote('');
        setActionSuccess('Đã kích hoạt lại hoạt động cho Cộng tác viên thành công! Quyền tạo link và tiếp thị tuyển sinh đã được khôi phục.');
        if (onStatusUpdated) onStatusUpdated();
        fetchDetail();
      } else {
        setActionError(res.error || 'Kích hoạt lại hoạt động thất bại.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 text-sm">Đang tải chi tiết hồ sơ CTV...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-blue-900 bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-rose-900 mb-1">Không thể tải hồ sơ CTV</h3>
          <p className="text-xs text-rose-700 mb-4">{error}</p>
          <button
            onClick={fetchDetail}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-md"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-blue-900 bg-white px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </button>
        <p className="text-slate-600 text-sm">Không tìm thấy thông tin hồ sơ cộng tác viên.</p>
      </div>
    );
  }

  const handleOpenRoleModal = (roleToSet: 'staff' | 'affiliate') => {
    setActionError(null);
    setValidationError(null);
    setTargetRole(roleToSet);
    setRoleReason('');
    setIsRoleModalOpen(true);
  };

  const handleRoleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setValidationError(null);

    const cleanReason = roleReason.trim();
    if (!cleanReason) {
      setValidationError('Vui lòng nhập lý do thay đổi vai trò tài khoản.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.updateSystemRole(affiliateId, targetRole, cleanReason);
      if (res.success) {
        setIsRoleModalOpen(false);
        setRoleReason('');
        setActionSuccess(
          targetRole === 'staff'
            ? 'Cấp quyền Cán bộ Tuyển sinh (Staff) thành công! Tài khoản đã có quyền truy cập Cổng Quản trị.'
            : 'Thu hồi quyền Cán bộ Tuyển sinh thành công! Tài khoản đã được chuyển về vai trò Cộng tác viên (CTV).'
        );
        if (onStatusUpdated) onStatusUpdated();
        fetchDetail();
      } else {
        setActionError(res.error || 'Cập nhật vai trò tài khoản thất bại.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const profile = data.profile || {};
  const reviewer = data.reviewer || {};
  const fullName = profile.full_name || data.full_name || 'Chưa cập nhật';
  const email = profile.email || data.email || 'Chưa cập nhật';
  const phone = profile.phone || data.phone || 'Chưa cập nhật';
  const code = data.affiliate_code || 'Chưa cấp';
  const status = data.status || 'PENDING_REVIEW';
  const userRole = profile.role || data.role || 'affiliate';
  const isActiveAccount = profile.is_active !== false;
  const isVerified = !!data.email_verified;
  const address = data.address || 'Chưa cập nhật';
  const idCard = data.id_card_number || 'Chưa cập nhật';
  const occupation = data.occupation || 'Chưa cập nhật';
  const idCardIssuedDate = data.id_card_issued_date
    ? formatDateVN(data.id_card_issued_date).split(' ')[0] || data.id_card_issued_date
    : 'Chưa cập nhật';
  const bankAccount =
    data.bank_account_number !== undefined &&
    data.bank_account_number !== null &&
    String(data.bank_account_number).trim() !== ''
      ? String(data.bank_account_number).trim()
      : 'Chưa cập nhật';
  const bankName = data.bank_name ? String(data.bank_name).trim() : 'Chưa cập nhật';
  const rawTaxCode = data.tax_code || profile.tax_code;
  const taxCode = rawTaxCode && String(rawTaxCode).trim() !== '' ? String(rawTaxCode).trim() : 'Chưa cập nhật';
  const createdAt = data.created_at;
  const updatedAt = data.updated_at;
  const reviewedAt = data.reviewed_at;
  const reviewNote = data.review_note;
  const reviewerName = reviewer.full_name || reviewer.email || (reviewedAt ? 'Cán bộ Tuyển sinh' : '—');

  const isPending = status === 'PENDING_REVIEW';
  const isActive = status === 'ACTIVE';
  const isSuspended = status === 'SUSPENDED';
  const canManage = currentUser?.role === 'staff' || currentUser?.role === 'admin' || !currentUser;
  const canReview = isPending && canManage;
  const isAdmin = currentUser?.role === 'admin';
  const isSelf = currentUser && (currentUser.id === profile.id || currentUser.id === data.user_id);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Top Header & Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Quản lý CTV</span>
            <span>/</span>
            <span className="font-semibold text-blue-900">Chi tiết hồ sơ CTV</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <span>{fullName}</span>
            <span className="font-mono text-xs px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200/60 font-semibold">
              {code}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Action Buttons for Pending Review (A1.3) */}
          {canReview && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setValidationError(null);
                  setIsRejectModalOpen(true);
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 text-xs transition-colors shadow-xs disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Từ chối
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setValidationError(null);
                  if (!isVerified) {
                    setActionError('Không thể phê duyệt: Email của CTV chưa được xác thực. Vui lòng yêu cầu CTV hoàn tất xác thực email trước khi duyệt.');
                    return;
                  }
                  setIsApproveModalOpen(true);
                }}
                disabled={isProcessing}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 ${
                  isVerified
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }`}
                title={!isVerified ? 'Email chưa xác thực, không thể duyệt' : 'Duyệt hồ sơ CTV'}
              >
                <CheckCircle2 className="w-4 h-4" />
                Duyệt hồ sơ
                {!isVerified && <span className="text-[10px] font-normal ml-0.5 text-amber-700">(Chưa xác thực email)</span>}
              </button>
            </div>
          )}

          {/* Action Button for Active Affiliate: Tạm ngưng (A1.4) */}
          {isActive && canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setValidationError(null);
                  setIsSuspendModalOpen(true);
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl border border-amber-300 text-xs transition-colors shadow-xs disabled:opacity-50"
                title="Tạm ngưng quyền tiếp thị và giới thiệu của CTV"
              >
                <PauseCircle className="w-4 h-4 text-amber-700" />
                Tạm ngưng
              </button>
            </div>
          )}

          {/* Action Button for Suspended Affiliate: Kích hoạt lại (A1.4) */}
          {isSuspended && canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setValidationError(null);
                  setIsReactivateModalOpen(true);
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                title="Khôi phục quyền tiếp thị và giới thiệu cho CTV"
              >
                <PlayCircle className="w-4 h-4" />
                Kích hoạt lại
              </button>
            </div>
          )}

          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách
          </button>
        </div>
      </div>

      {/* Global Alerts / Notices */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Email Verification Warning for Pending Review */}
      {isPending && !isVerified && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Chưa thể phê duyệt: Email CTV chưa được xác thực</h4>
            <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
              Theo quy chế tuyển sinh, tài khoản Cộng tác viên bắt buộc phải hoàn tất xác thực email trước khi Ban Tuyển sinh có thể phê duyệt kích hoạt. Cán bộ vẫn có thể từ chối nếu hồ sơ không hợp lệ.
            </p>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center text-2xl font-bold shadow-md mb-3">
              {fullName !== 'Chưa cập nhật' ? fullName.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>
            <h2 className="font-bold text-slate-900 text-base">{fullName}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{email}</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Trạng thái CTV</span>
              <div>
                {status === 'ACTIVE' && (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hoạt động
                  </span>
                )}
                {status === 'PENDING_REVIEW' && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-semibold rounded-lg border border-amber-200">
                    Chờ duyệt
                  </span>
                )}
                {status === 'REJECTED' && (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200">
                    Từ chối
                  </span>
                )}
                {status === 'SUSPENDED' && (
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200">
                    Tạm ngưng
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Vai trò tài khoản</span>
              <div>
                {userRole === 'admin' && (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-800 font-semibold rounded-lg border border-purple-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Quản trị viên
                  </span>
                )}
                {userRole === 'staff' && (
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-semibold rounded-lg border border-indigo-200 inline-flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" /> Cán bộ Tuyển sinh
                  </span>
                )}
                {userRole === 'affiliate' && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-semibold rounded-lg border border-blue-200 inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600" /> Cộng tác viên
                  </span>
                )}
              </div>
            </div>

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

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500 font-medium">Ngày đăng ký</span>
              <span className="font-mono text-slate-800">{formatDateVN(createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Detailed Information Groups */}
        <div className="md:col-span-2 space-y-6">
          {/* E: Vai trò tài khoản & Phân quyền hệ thống */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-900" />
                Vai trò tài khoản & Phân quyền hệ thống
              </h3>
              {/* Thao tác phân quyền chỉ hiển thị cho Admin */}
              {isAdmin && userRole !== 'admin' && (
                <div className="flex items-center gap-2">
                  {userRole === 'affiliate' ? (
                    <button
                      type="button"
                      onClick={() => handleOpenRoleModal('staff')}
                      disabled={isProcessing || !isVerified || !isActiveAccount || isSelf}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 ${
                        isVerified && isActiveAccount && !isSelf
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                      title={
                        !isVerified
                          ? 'Cần xác thực email trước khi cấp quyền Staff'
                          : !isActiveAccount
                          ? 'Tài khoản đang bị vô hiệu hóa'
                          : isSelf
                          ? 'Không thể tự thay đổi vai trò của chính mình'
                          : 'Cấp quyền Cán bộ Tuyển sinh cho tài khoản này'
                      }
                    >
                      <UserPlus className="w-4 h-4" />
                      Cấp quyền cán bộ tuyển sinh
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenRoleModal('affiliate')}
                      disabled={isProcessing || isSelf}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-bold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50 ${
                        !isSelf
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                      title={isSelf ? 'Không thể tự thay đổi vai trò của chính mình' : 'Thu hồi quyền Cán bộ Tuyển sinh'}
                    >
                      <UserMinus className="w-4 h-4 text-rose-600" />
                      Thu hồi quyền cán bộ tuyển sinh
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Vai trò hiện tại</span>
                <div className="pt-0.5">
                  {userRole === 'admin' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-900 font-bold rounded-lg border border-purple-300 inline-flex items-center gap-1.5 text-xs">
                      <ShieldCheck className="w-4 h-4 text-purple-700" /> Quản trị viên (Admin)
                    </span>
                  )}
                  {userRole === 'staff' && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-900 font-bold rounded-lg border border-indigo-300 inline-flex items-center gap-1.5 text-xs">
                      <Shield className="w-4 h-4 text-indigo-700" /> Cán bộ Tuyển sinh (Staff)
                    </span>
                  )}
                  {userRole === 'affiliate' && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-lg border border-blue-300 inline-flex items-center gap-1.5 text-xs">
                      <User className="w-4 h-4 text-blue-700" /> Cộng tác viên Tuyển sinh (CTV)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Trạng thái tài khoản người dùng</span>
                <div className="pt-0.5">
                  {isActiveAccount ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg border border-emerald-300 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Đang hoạt động (Active)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-900 font-bold rounded-lg border border-rose-300 inline-flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-700" /> Đã bị vô hiệu hóa (Disabled)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium">Quyền hạn hệ thống:</span>
                <p className="text-slate-700 leading-relaxed pt-0.5">
                  {userRole === 'staff' &&
                    'Tài khoản có quyền đăng nhập Cổng Quản trị, xem và quản lý danh sách khách hàng của tất cả CTV, thực hiện tư vấn & chăm sóc khách hàng, quản lý danh mục khóa học của trường.'}
                  {userRole === 'affiliate' &&
                    'Tài khoản có quyền tiếp thị, tạo liên kết và mã QR tiếp thị, theo dõi tiến độ tư vấn và đối soát của các khách hàng do chính mình giới thiệu.'}
                  {userRole === 'admin' &&
                    'Tài khoản Quản trị viên cấp cao của hệ thống STHC_CTV. Có toàn quyền quản trị cấu hình, phân quyền nhân sự và duyệt thù lao.'}
                </p>
              </div>

              {/* Cảnh báo nếu email chưa xác thực */}
              {!isVerified && userRole === 'affiliate' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1 sm:col-span-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Lưu ý điều kiện cấp quyền Cán bộ Tuyển sinh:
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Tài khoản cần hoàn tất xác thực email trước khi Quản trị viên có thể cấp quyền Cán bộ Tuyển sinh (Staff).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* A & B: Thông tin liên hệ & Tổng quan */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-900" />
              Thông tin liên hệ & Định danh
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email đăng nhập
                </span>
                <p className="font-semibold text-slate-900">{email}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                </span>
                <p className="font-semibold font-mono text-slate-900">{phone}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Địa chỉ cư trú
                </span>
                <p className="font-semibold text-slate-900">{address}</p>
              </div>
            </div>
          </div>

          {/* C: Thông tin bổ sung */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-blue-900" />
              Thông tin bổ sung
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số CCCD (phục vụ đối soát)
                </span>
                <p className="font-semibold font-mono text-slate-900">{idCard}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày cấp CCCD
                </span>
                <p className="font-semibold font-mono text-slate-900">{idCardIssuedDate}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Nghề nghiệp / Đơn vị công tác
                </span>
                <p className="font-semibold text-slate-900">{occupation}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Số tài khoản ngân hàng
                </span>
                <p className="font-semibold font-mono text-slate-900">{bankAccount}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Mã số thuế
                </span>
                <p className="font-semibold font-mono text-slate-900">{taxCode}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" /> Ngân hàng
                </span>
                <p className="font-semibold text-slate-900">{bankName}</p>
              </div>
            </div>
          </div>

          {/* D: Thông tin quản lý & Xét duyệt */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-blue-900" />
              Thông tin quản lý & Xét duyệt
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Ngày cập nhật gần nhất</span>
                <p className="font-semibold font-mono text-slate-900">{formatDateVN(updatedAt)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-slate-500 font-medium">Cán bộ duyệt hồ sơ</span>
                <p className="font-semibold text-slate-900">
                  {reviewedAt ? `${reviewerName} (${formatDateVN(reviewedAt)})` : 'Chưa có thông tin duyệt'}
                </p>
              </div>

              {/* Thông tin tạm ngưng (nếu có) */}
              {(data.suspended_at || data.suspension_reason || status === 'SUSPENDED') && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1 sm:col-span-2">
                  <span className="text-amber-900 font-semibold flex items-center gap-1.5">
                    <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                    Thông tin tạm ngưng hoạt động
                  </span>
                  <div className="text-slate-700 space-y-0.5 pt-0.5">
                    <p>
                      Cán bộ xử lý:{' '}
                      <strong className="text-slate-900">
                        {data.suspender?.full_name || 'Cán bộ Tuyển sinh'}
                      </strong>
                      {data.suspended_at && ` vào ${formatDateVN(data.suspended_at)}`}
                    </p>
                    <p className="italic text-slate-800">
                      Lý do: "{data.suspension_reason || 'Tạm ngưng hoạt động theo quy định'}"
                    </p>
                  </div>
                </div>
              )}

              {/* Thông tin kích hoạt lại (nếu có) */}
              {(data.reactivated_at || data.reactivation_note) && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1 sm:col-span-2">
                  <span className="text-emerald-900 font-semibold flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Thông tin kích hoạt lại
                  </span>
                  <div className="text-slate-700 space-y-0.5 pt-0.5">
                    <p>
                      Cán bộ xử lý:{' '}
                      <strong className="text-slate-900">
                        {data.reactivator?.full_name || 'Cán bộ Tuyển sinh'}
                      </strong>
                      {data.reactivated_at && ` vào ${formatDateVN(data.reactivated_at)}`}
                    </p>
                    {data.reactivation_note && (
                      <p className="italic text-slate-800">
                        Ghi chú: "{data.reactivation_note}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium">Ghi chú xét duyệt ban đầu</span>
                <p className="text-slate-800 italic">
                  {reviewNote || (reviewedAt ? 'Không có ghi chú thêm.' : 'Chưa có ghi chú nào.')}
                </p>
              </div>

              {/* Lịch sử xét duyệt & xử lý hồ sơ (Audit Logs) */}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5 mb-2.5">
                  <History className="w-3.5 h-3.5 text-blue-900" />
                  Lịch sử xét duyệt & xử lý hồ sơ
                </span>
                {data.audit_logs && data.audit_logs.length > 0 ? (
                  <div className="space-y-2">
                    {data.audit_logs.map((log: any) => {
                      const isApproved = log.action === 'AFFILIATE_APPROVED';
                      const isRejected = log.action === 'AFFILIATE_REJECTED';
                      const isSuspended = log.action === 'AFFILIATE_SUSPENDED';
                      const isReactivated = log.action === 'AFFILIATE_REACTIVATED';
                      const isRoleAssigned = log.action === 'SYSTEM_ROLE_ASSIGNED';
                      const isRoleRevoked = log.action === 'SYSTEM_ROLE_REVOKED';
                      const isRoleChange = isRoleAssigned || isRoleRevoked;
                      const actorTitle = log.actor?.full_name || log.actor?.email || (isRoleChange ? 'Quản trị viên' : 'Cán bộ Tuyển sinh');
                      const oldSt = log.old_values?.status || 'PENDING_REVIEW';
                      const newSt =
                        log.new_values?.status ||
                        (isApproved
                          ? 'ACTIVE'
                          : isRejected
                          ? 'REJECTED'
                          : isSuspended
                          ? 'SUSPENDED'
                          : 'ACTIVE');
                      return (
                        <div
                          key={log.id}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            isRoleChange
                              ? 'bg-indigo-50/40 border-indigo-200/80'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                isRoleAssigned
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                  : isRoleRevoked
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isRejected
                                  ? 'bg-rose-100 text-rose-800'
                                  : isSuspended
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-900 border border-blue-300'
                              }`}
                            >
                              {isRoleAssigned && (
                                <>
                                  <ShieldCheck className="w-3 h-3 text-indigo-700" /> Cấp quyền Cán bộ Tuyển sinh (Staff)
                                </>
                              )}
                              {isRoleRevoked && (
                                <>
                                  <ShieldAlert className="w-3 h-3 text-rose-700" /> Thu hồi quyền Cán bộ Tuyển sinh
                                </>
                              )}
                              {isApproved && (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Phê duyệt hồ sơ
                                </>
                              )}
                              {isRejected && (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-600" /> Từ chối hồ sơ
                                </>
                              )}
                              {isSuspended && (
                                <>
                                  <PauseCircle className="w-3 h-3 text-amber-700" /> Tạm ngưng hoạt động
                                </>
                              )}
                              {isReactivated && (
                                <>
                                  <PlayCircle className="w-3 h-3 text-blue-700" /> Kích hoạt lại
                                </>
                              )}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {formatDateVN(log.created_at)}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px] flex items-center gap-2">
                            <span>
                              Người xử lý: <strong>{actorTitle}</strong>
                            </span>
                            <span>•</span>
                            {isRoleChange ? (
                              <span>
                                Chuyển vai trò:{' '}
                                <span className="font-mono font-semibold text-indigo-900">
                                  {log.old_values?.role === 'staff' ? 'Staff' : (log.old_values?.role === 'admin' ? 'Admin' : 'CTV')} → {log.new_values?.role === 'staff' ? 'Staff' : (log.new_values?.role === 'admin' ? 'Admin' : 'CTV')}
                                </span>
                              </span>
                            ) : (
                              <span>
                                Trạng thái:{' '}
                                <span className="font-mono text-slate-800">
                                  {oldSt} → {newSt}
                                </span>
                              </span>
                            )}
                          </div>
                          {log.reason && (
                            <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-700 italic">
                              "{log.reason}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px] p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    {reviewedAt
                      ? `Hồ sơ đã được xử lý bởi ${reviewerName} vào ${formatDateVN(reviewedAt)}.`
                      : 'Hồ sơ đang chờ xử lý, chưa có sự kiện kiểm toán nào.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DUYỆT HỒ SƠ (A1.3) */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700/50 rounded-lg border border-emerald-400/30">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">PHÊ DUYỆT HỒ SƠ CỘNG TÁC VIÊN</h3>
                  <p className="text-xs text-emerald-200">Kích hoạt quyền tuyển sinh chính thức</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsApproveModalOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveConfirm} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Thông tin CTV được duyệt */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên CTV:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã CTV:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Xác thực email:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đã xác thực
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Ghi chú xét duyệt (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Ví dụ: Hồ sơ đầy đủ điều kiện tiếp nhận CTV theo quy chế năm 2026..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận Phê duyệt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI HỒ SƠ (A1.3) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-800 to-red-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-700/50 rounded-lg border border-rose-400/30">
                  <XCircle className="w-5 h-5 text-rose-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">TỪ CHỐI TIẾP NHẬN HỒ SƠ CTV</h3>
                  <p className="text-xs text-rose-200">Ghi nhận lý do từ chối chính thức</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsRejectModalOpen(false)}
                className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectConfirm} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Thông tin CTV bị từ chối */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên CTV:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã CTV:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {code}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do từ chối <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Nhập lý do cụ thể (Ví dụ: Thông tin số CCCD không khớp, ảnh hồ sơ bị mờ...)"
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-2 text-xs transition-colors ${
                    validationError
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200 focus:border-rose-600'
                      : 'border-slate-300 focus:ring-rose-600/20 focus:border-rose-600'
                  }`}
                />
                {validationError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Xác nhận Từ chối</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠM NGƯNG HOẠT ĐỘNG CTV (A1.4) */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-600/50 rounded-lg border border-amber-400/30">
                  <PauseCircle className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">TẠM NGƯNG HOẠT ĐỘNG CTV</h3>
                  <p className="text-xs text-amber-200">Tạm dừng quyền tiếp thị và tiếp nhận ứng viên</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsSuspendModalOpen(false)}
                className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSuspendConfirm} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Thông tin CTV bị tạm ngưng */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên CTV:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã CTV:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái hiện tại:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đang hoạt động (ACTIVE)
                  </span>
                </div>
              </div>

              {/* Tác động đến quyền giới thiệu */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1.5 text-amber-950">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  Tác động đến quyền giới thiệu:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
                  <li>CTV sẽ bị tạm dừng quyền tạo link giới thiệu và mã QR mới.</li>
                  <li>Các link tiếp thị và mã QR đã tạo trước đây sẽ ngừng tiếp nhận đăng ký mới từ người học.</li>
                  <li>Dữ liệu khách hàng đã giới thiệu, hồ sơ và thù lao đã ghi nhận trước đó vẫn được giữ nguyên đầy đủ.</li>
                </ul>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do tạm ngưng <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={suspensionReason}
                  onChange={(e) => {
                    setSuspensionReason(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Nhập lý do cụ thể (Ví dụ: Tạm ngưng hoạt động theo nguyện vọng cá nhân / Rà soát thông tin truyền thông...)"
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-2 text-xs transition-colors ${
                    validationError
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200 focus:border-rose-600'
                      : 'border-slate-300 focus:ring-amber-600/20 focus:border-amber-600'
                  }`}
                />
                {validationError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsSuspendModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-4 h-4" />
                      <span>Xác nhận Tạm ngưng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KÍCH HOẠT LẠI HOẠT ĐỘNG CTV (A1.4) */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700/50 rounded-lg border border-emerald-400/30">
                  <PlayCircle className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">KÍCH HOẠT LẠI HOẠT ĐỘNG CTV</h3>
                  <p className="text-xs text-emerald-200">Khôi phục quyền tiếp thị và tiếp nhận ứng viên</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsReactivateModalOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReactivateConfirm} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Thông tin CTV được kích hoạt lại */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên CTV:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã CTV:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái hiện tại:</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded text-[11px] inline-flex items-center gap-1 border border-amber-300">
                    <PauseCircle className="w-3.5 h-3.5 text-amber-700" /> Tạm ngưng (SUSPENDED)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Xác thực email:</span>
                  <span className={`px-2 py-0.5 font-bold rounded text-[11px] inline-flex items-center gap-1 ${
                    isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isVerified ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đã xác thực
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Chưa xác thực
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Tác động đến quyền giới thiệu */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
                <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Quyền giới thiệu sau khi kích hoạt lại:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-900/90 leading-relaxed">
                  <li>Khôi phục quyền truy cập danh sách khóa học, tạo liên kết và mã QR tiếp thị.</li>
                  <li>Các liên kết giới thiệu cũ tiếp tục hoạt động bình thường, không yêu cầu CTV tạo tài khoản mới.</li>
                  <li>Quyền mới có hiệu lực ngay trong phiên đăng nhập hiện tại của CTV.</li>
                </ul>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Ghi chú kích hoạt lại (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={reactivationNote}
                  onChange={(e) => setReactivationNote(e.target.value)}
                  placeholder="Ví dụ: Đã kiểm tra và khôi phục đầy đủ quyền hoạt động cho CTV theo quy định..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsReactivateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4" />
                      <span>Xác nhận Kích hoạt lại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẤP / THU HỒI VAI TRÒ CÁN BỘ TUYỂN SINH (ADMIN ONLY) */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              targetRole === 'staff'
                ? 'bg-gradient-to-r from-indigo-900 to-blue-950'
                : 'bg-gradient-to-r from-rose-900 to-red-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg border ${
                  targetRole === 'staff' ? 'bg-indigo-800/50 border-indigo-400/30' : 'bg-rose-800/50 border-rose-400/30'
                }`}>
                  {targetRole === 'staff' ? (
                    <ShieldCheck className="w-5 h-5 text-indigo-200" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-200" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {targetRole === 'staff'
                      ? 'CẤP QUYỀN CÁN BỘ TUYỂN SINH (STAFF)'
                      : 'THU HỒI QUYỀN CÁN BỘ TUYỂN SINH (STAFF)'}
                  </h3>
                  <p className="text-xs text-slate-200">
                    {targetRole === 'staff'
                      ? 'Nâng cấp quyền truy cập hệ thống Quản trị Tuyển sinh'
                      : 'Chuyển tài khoản về vai trò Cộng tác viên (CTV)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isProcessing && setIsRoleModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleConfirm} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Thông tin tài khoản */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email đăng nhập:</span>
                  <span className="font-mono text-slate-900 font-semibold">{email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã CTV:</span>
                  <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {code}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Chuyển đổi vai trò:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      userRole === 'staff' ? 'bg-indigo-100 text-indigo-900' : 'bg-blue-100 text-blue-900'
                    }`}>
                      {userRole === 'staff' ? 'Cán bộ Tuyển sinh' : 'Cộng tác viên'}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      targetRole === 'staff' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {targetRole === 'staff' ? 'Cán bộ Tuyển sinh' : 'Cộng tác viên'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tác động quyền hạn */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                targetRole === 'staff'
                  ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${targetRole === 'staff' ? 'text-indigo-700' : 'text-amber-700'}`} />
                  Tác động đến quyền hạn tài khoản:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                  {targetRole === 'staff' ? (
                    <>
                      <li>Tài khoản sẽ được cấp quyền đăng nhập Cổng Quản trị Tuyển sinh (Staff).</li>
                      <li>Được xem danh sách khách hàng của tất cả CTV, thực hiện tư vấn, cập nhật tiến độ và ghi chú chăm sóc.</li>
                      <li>Được xem và quản lý danh mục khóa học của nhà trường.</li>
                      <li><strong>Bảo toàn dữ liệu:</strong> Hồ sơ CTV, mã tiếp thị, khách hàng đã giới thiệu và lịch sử trước đây không bị thay đổi hoặc xóa bỏ.</li>
                    </>
                  ) : (
                    <>
                      <li>Tài khoản sẽ bị thu hồi toàn bộ quyền truy cập Cổng Quản trị và các chức năng của Cán bộ Tuyển sinh ngay lập tức.</li>
                      <li>Quyền hoạt động tiếp thị sẽ tiếp tục phụ thuộc vào trạng thái hồ sơ Cộng tác viên hiện có (ACTIVE/PENDING/SUSPENDED).</li>
                      <li>Hồ sơ CTV, link giới thiệu và dữ liệu khách hàng cũ của tài khoản vẫn được giữ nguyên đầy đủ.</li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do {targetRole === 'staff' ? 'cấp quyền' : 'thu hồi quyền'} <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={roleReason}
                  onChange={(e) => {
                    setRoleReason(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={
                    targetRole === 'staff'
                      ? 'Nhập lý do phân công cán bộ tuyển sinh (Ví dụ: Quyết định bổ nhiệm nhân sự tuyển sinh năm 2026...)'
                      : 'Nhập lý do thu hồi quyền cán bộ tuyển sinh (Ví dụ: Hết nhiệm kỳ công tác tuyển sinh, chuyển về CTV bình thường...)'
                  }
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-2 text-xs transition-colors ${
                    validationError
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-200 focus:border-rose-600'
                      : 'border-slate-300 focus:ring-indigo-600/20 focus:border-indigo-600'
                  }`}
                />
                {validationError && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 ${
                    targetRole === 'staff'
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{targetRole === 'staff' ? 'Xác nhận Cấp quyền Staff' : 'Xác nhận Thu hồi quyền'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
