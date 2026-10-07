import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ArrowLeft,
  RotateCcw,
  Award,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface AdminRewardDetailViewProps {
  rewardId: string;
  currentUser?: any;
  onBack: () => void;
}

export const AdminRewardDetailView: React.FC<AdminRewardDetailViewProps> = ({
  rewardId,
  currentUser,
  onBack,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Action modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminRewardDetail(rewardId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Không thể tải thông tin chi tiết khoản thù lao.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getMyPermissions().then(res => {
      if (res.success && res.data?.permissions) {
        setUserPermissions(res.data.permissions);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (rewardId) {
      fetchDetail();
    }
  }, [rewardId]);

  const hasPermission = (perm: string) => {
    if (currentUser?.role === 'admin') return true;
    return userPermissions.includes(perm);
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setApiFeedback({ type, message });
    setTimeout(() => setApiFeedback(null), 5000);
  };

  const handleApprove = async () => {
    if (!window.confirm('Xác nhận phê duyệt khoản thù lao này (500.000 VNĐ)? Lưu ý: Duyệt thù lao chưa phải xác nhận chi trả.')) {
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await api.approveReward(rewardId);
      if (res.success) {
        showFeedback('success', res.message || 'Phê duyệt khoản thù lao thành công!');
        fetchDetail();
      } else {
        showFeedback('error', res.error || 'Lỗi phê duyệt');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showFeedback('error', 'Bắt buộc phải nhập lý do từ chối.');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await api.rejectReward(rewardId, rejectionReason.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Đã từ chối duyệt thưởng');
        setRejectModalOpen(false);
        setRejectionReason('');
        fetchDetail();
      } else {
        showFeedback('error', res.error || 'Lỗi từ chối');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSubmitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      showFeedback('error', 'Bắt buộc phải nhập lý do hủy khoản thù lao.');
      return;
    }
    setActionSubmitting(true);
    try {
      const res = await api.voidReward(rewardId, voidReason.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Hủy khoản thù lao thành công!');
        setVoidModalOpen(false);
        setVoidReason('');
        fetchDetail();
      } else {
        showFeedback('error', res.error || 'Lỗi hủy khoản thù lao');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
        <p className="text-xs text-slate-500">Đang tải chi tiết khoản thù lao...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
        </div>
        <div className="p-8 text-center bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
          {error || 'Không tìm thấy khoản thù lao.'}
        </div>
      </div>
    );
  }

  const { reward, candidate, affiliate, course, reconciliation_basis, current_state, history, basis_checks } = data;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6 animate-fade-in relative">
      {/* API Feedback Notification */}
      {apiFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs ${
            apiFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{apiFeedback.message}</span>
          </div>
          <button onClick={() => setApiFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors inline-flex items-center justify-center"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Chi tiết thù lao CTV</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  reward.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : reward.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {reward.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">ID: {reward.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchDetail}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>

          {/* Action buttons (A5.3B) */}
          {reward.status === 'PENDING_APPROVAL' && (
            <>
              {hasPermission('rewards.approve') && (
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Duyệt thù lao</span>
                </button>
              )}
              {hasPermission('rewards.reject') && (
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setRejectModalOpen(true)}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Từ chối</span>
                </button>
              )}
              {hasPermission('rewards.void') && (
                <button
                  type="button"
                  disabled={actionSubmitting}
                  onClick={() => setVoidModalOpen(true)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>Hủy thù lao</span>
                </button>
              )}
            </>
          )}

          {reward.status === 'APPROVED' && hasPermission('rewards.void') && (
            <button
              type="button"
              disabled={actionSubmitting}
              onClick={() => setVoidModalOpen(true)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Hủy thù lao (Void)</span>
            </button>
          )}
        </div>
      </div>

      {/* Basis Warnings / Checks */}
      {basis_checks && basis_checks.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Cảnh báo biến động / tính nhất quán căn cứ:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5 pl-1">
            {basis_checks.map((msg: string, idx: number) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Tóm tắt khoản thù lao */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>1. Tóm tắt khoản thù lao</span>
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Số tiền:</span>
              <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                {new Intl.NumberFormat('vi-VN').format(reward.amount)} {reward.currency || 'VND'}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Trạng thái hiện tại:</span>
              <div className="font-bold text-indigo-900 mt-0.5">{reward.status}</div>
            </div>
            <div>
              <span className="text-slate-500">Ngày phát sinh:</span>
              <div className="font-mono text-slate-800 mt-0.5">{new Date(reward.created_at).toLocaleString('vi-VN')}</div>
            </div>
            <div>
              <span className="text-slate-500">Ngày duyệt:</span>
              <div className="font-mono text-slate-800 mt-0.5">
                {reward.approved_at ? new Date(reward.approved_at).toLocaleString('vi-VN') : '—'}
              </div>
            </div>
          </div>
          {reward.rejection_reason && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <span className="font-bold">Lý do từ chối:</span> {reward.rejection_reason}
            </div>
          )}
          {reward.void_reason && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <span className="font-bold">Lý do hủy:</span> {reward.void_reason}
            </div>
          )}
        </div>

        {/* 2. Thông tin Thí sinh & Khóa học */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <User className="w-4 h-4 text-indigo-600" />
            <span>2. Thí sinh & Ngành đào tạo</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Họ và tên thí sinh:</span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{candidate.full_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Số điện thoại:</span>
                <div className="font-mono text-slate-800 mt-0.5">{candidate.phone || 'Không có'}</div>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <div className="font-mono text-slate-800 mt-0.5">{candidate.email || 'Không có'}</div>
              </div>
            </div>
            <div>
              <span className="text-slate-500">Khóa học đăng ký:</span>
              <div className="font-bold text-blue-900 mt-0.5">
                {course.title} {course.code ? `(${course.code})` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Cộng tác viên thụ hưởng */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>3. Cộng tác viên thụ hưởng</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Họ tên CTV (Lịch sử thụ hưởng):</span>
              <div className="font-semibold text-slate-900 mt-0.5">{affiliate.beneficiary.full_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500">Mã định danh CTV:</span>
                <div className="font-mono font-bold text-amber-800 mt-0.5">{affiliate.beneficiary.affiliate_code}</div>
              </div>
              <div>
                <span className="text-slate-500">Trạng thái CTV:</span>
                <div className="font-medium text-slate-800 mt-0.5">{affiliate.beneficiary.status}</div>
              </div>
            </div>
            {affiliate.is_affiliate_changed && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                Lưu ý: Cộng tác viên trên hồ sơ lead hiện tại đã thay đổi so với thời điểm phát sinh khoản thưởng này.
              </div>
            )}
          </div>
        </div>

        {/* 4. Căn cứ đối chiếu sinh thù lao */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>4. Lần đối chiếu làm căn cứ</span>
          </h4>
          {reconciliation_basis ? (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Mã hồ sơ EGOV:</span>
                  <div className="font-mono font-bold text-blue-900 text-sm mt-0.5">
                    {reconciliation_basis.external_admission_code}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Kết quả đối chiếu:</span>
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    {reconciliation_basis.reconciliation_status}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Học phí thu:</span>
                  <div className="font-mono text-slate-800 mt-0.5">
                    {reconciliation_basis.tuition_fee_collected ? `${new Intl.NumberFormat('vi-VN').format(reconciliation_basis.tuition_fee_collected)} VNĐ` : 'Không bắt buộc'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Số biên lai:</span>
                  <div className="font-mono text-slate-800 mt-0.5">{reconciliation_basis.receipt_number || 'Chưa cập nhật'}</div>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Cán bộ xác nhận:</span>
                <div className="font-medium text-slate-800 mt-0.5">
                  {reconciliation_basis.verified_by_name} ({new Date(reconciliation_basis.verified_at).toLocaleString('vi-VN')})
                </div>
              </div>
              {reconciliation_basis.staff_note && (
                <div>
                  <span className="text-slate-500">Ghi chú đối chiếu:</span>
                  <div className="text-slate-700 mt-0.5 italic">{reconciliation_basis.staff_note}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-rose-700 py-4 text-center">
              Không tìm thấy bản ghi đối chiếu gốc liên kết.
            </div>
          )}
        </div>
      </div>

      {/* 5. Lịch sử xử lý khoản */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>5. Lịch sử xử lý và kiểm toán</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3">Hành động / Sự kiện</th>
                <th className="py-2.5 px-3">Mô tả chi tiết</th>
                <th className="py-2.5 px-3">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {history && history.map((ev: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-600">{new Date(ev.created_at).toLocaleString('vi-VN')}</td>
                  <td className="py-2.5 px-3 font-bold text-indigo-900">{ev.action}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-sans">{ev.description}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-sans">{ev.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECT MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              TỪ CHỐI PHÊ DUYỆT THƯỞNG TUYỂN SINH
            </h3>
            <form onSubmit={handleSubmitReject} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do từ chối bắt buộc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Hồ sơ thí sinh không đủ điều kiện thù lao..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID MODAL */}
      {voidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              HỦY KHOẢN THÙ LAO (VOID)
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Bạn đang hủy khoản thù lao này. Kết quả đối soát gốc và tình trạng nhập học của hồ sơ được giữ nguyên, chỉ vô hiệu hóa quyền lợi thù lao.
            </p>
            <form onSubmit={handleSubmitVoid} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do hủy bắt buộc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ví dụ: Hủy khoản thưởng do phát hiện trùng lặp hoặc sai sót..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition-colors disabled:opacity-50"
                >
                  Xác nhận hủy thù lao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
