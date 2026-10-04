import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Send,
  MessageSquare,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface AdminLeadDetailViewProps {
  leadId: string;
  currentUser?: any;
  onBack: () => void;
}

export const AdminLeadDetailView: React.FC<AdminLeadDetailViewProps> = ({ leadId, currentUser, onBack }) => {
  const [lead, setLead] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Care Form State
  const [counselingStatus, setCounselingStatus] = useState<string>('NEW');
  const [newNote, setNewNote] = useState<string>('');
  const [isSavingCare, setIsSavingCare] = useState<boolean>(false);
  const [careFeedback, setCareFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadAdminLeadDetail();
  }, [leadId]);

  const loadAdminLeadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, historyRes] = await Promise.all([
        api.getAdminLeadDetail(leadId),
        api.getLeadHistory(leadId),
      ]);

      if (detailRes.success && detailRes.data) {
        setLead(detailRes.data);
        setCounselingStatus(detailRes.data.counseling_status || 'NEW');
      } else {
        setError(detailRes.error || 'Không tìm thấy hồ sơ khách hàng.');
      }

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    const trimmedNote = newNote.trim();
    if (counselingStatus === lead.counseling_status && !trimmedNote) {
      setCareFeedback({
        type: 'error',
        message: 'Bạn chưa thay đổi trạng thái tư vấn hoặc chưa nhập ghi chú mới.',
      });
      setTimeout(() => setCareFeedback(null), 4000);
      return;
    }

    if (trimmedNote.length > 2000) {
      setCareFeedback({
        type: 'error',
        message: 'Ghi chú chăm sóc vượt quá giới hạn 2000 ký tự.',
      });
      return;
    }

    setIsSavingCare(true);
    setCareFeedback(null);

    try {
      const res = await api.updateLeadCare(leadId, {
        counseling_status: counselingStatus,
        note: trimmedNote || undefined,
        client_updated_at: lead.updated_at,
      });

      if (res.success) {
        setCareFeedback({
          type: 'success',
          message: res.message || 'Lưu tiến độ chăm sóc khách hàng thành công!',
        });
        setNewNote('');
        // Reload detail and history to refresh timeline atomically
        await loadAdminLeadDetail();
        setTimeout(() => setCareFeedback(null), 5000);
      } else {
        setCareFeedback({
          type: 'error',
          message: res.error || 'Không thể lưu tiến độ chăm sóc. Vui lòng thử lại.',
        });
      }
    } catch (err: any) {
      setCareFeedback({
        type: 'error',
        message: err.message || 'Lỗi kết nối máy chủ khi lưu chăm sóc.',
      });
    } finally {
      setIsSavingCare(false);
    }
  };

  const formatDateVN = (isoString: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getCounselingLabel = (status: string) => {
    switch (status) {
      case 'NEW': return 'NEW (Mới đăng ký)';
      case 'CONTACTED': return 'CONTACTED (Đã liên hệ)';
      case 'CONSULTING': return 'CONSULTING (Đang tư vấn)';
      case 'UNREACHABLE': return 'UNREACHABLE (Chưa liên hệ được)';
      case 'LOST': return 'LOST (Không tiếp tục)';
      default: return status || 'Mới đăng ký';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Đang tải chi tiết hồ sơ ứng viên...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy hồ sơ</h2>
        <p className="text-xs text-slate-500">{error || 'Hồ sơ không tồn tại.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>
      </div>
    );
  }

  const reconList = history?.reconciliations || lead.lead_reconciliations || [];
  const rewardList = history?.rewards || lead.rewards || [];
  const careHistoryList = history?.care_history || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-wider mb-0.5">
              <span>Cổng Quản trị Tuyển sinh STHC</span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {lead.id}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{lead.full_name}</h1>
          </div>
        </div>

        <button
          onClick={loadAdminLeadDetail}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tải lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: PERSONAL INFO, REFERRAL, CARE FORM */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Personal Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-blue-900" />
              <span>A. Thông tin cá nhân ứng viên</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Họ và tên:</span>
                <strong className="text-slate-900 text-sm">{lead.full_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Số điện thoại đầy đủ:</span>
                <strong className="text-blue-900 font-mono text-sm">{lead.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Email:</span>
                <span className="text-slate-800">{lead.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Tỉnh / Thành phố:</span>
                <span className="text-slate-800">{lead.province || '—'}</span>
              </div>
            </div>

            {lead.customer_note && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Ghi chú của học viên khi gửi form:</span>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 italic border border-slate-200">
                  "{lead.customer_note}"
                </div>
              </div>
            )}
          </div>

          {/* Section B: Referral & Admission Overview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>B. Nguồn giới thiệu & Tình trạng tuyển sinh</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Khóa học đăng ký:</span>
                <strong className="text-slate-900">{lead.course_title || lead.courses?.title || 'Chương trình STHC'}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Nguồn CTV ghi nhận:</span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                  {lead.affiliate_code_captured || lead.affiliate_code || 'Tự nhiên'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Tiến độ tư vấn hiện tại:</span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-semibold rounded-lg border border-blue-200 inline-block">
                  {getCounselingLabel(lead.counseling_status)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Tình trạng đối soát hồ sơ:</span>
                <span className={`font-bold ${lead.reconciliation_status === 'MATCHED_VALID' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {lead.reconciliation_status === 'MATCHED_VALID' ? 'Đã đối soát (MATCHED_VALID)' : 'Chưa đối soát'}
                </span>
              </div>
            </div>

            {/* Link sang module Đối chiếu hồ sơ */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <FileText className="w-4 h-4 text-blue-900" />
                <span>Nghiệp vụ đối soát mã EGOV & học phí thực thu:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/admin/reconcile');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-flex items-center gap-1.5 text-blue-900 hover:text-blue-950 font-bold hover:underline"
              >
                <span>Mở module Đối chiếu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section C: Chăm sóc khách hàng & Ghi chú nội bộ (A3.6) */}
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-900" />
                <span>C. Chăm sóc khách hàng & Ghi chú nội bộ (A3.6)</span>
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <Lock className="w-3 h-3 text-amber-600" />
                Nội bộ Cán bộ Tuyển sinh
              </span>
            </div>

            {careFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  careFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {careFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{careFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveCare} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  Cập nhật tiến độ tư vấn:
                </label>
                <select
                  value={counselingStatus}
                  onChange={(e) => setCounselingStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                >
                  <option value="NEW">NEW (Mới đăng ký)</option>
                  <option value="CONTACTED">CONTACTED (Đã liên hệ tư vấn)</option>
                  <option value="CONSULTING">CONSULTING (Đang trong quá trình tư vấn)</option>
                  <option value="UNREACHABLE">UNREACHABLE (Chưa liên hệ được)</option>
                  <option value="LOST">LOST (Học viên không tiếp tục / Hủy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 block">
                    Thêm ghi chú chăm sóc nội bộ mới:
                  </label>
                  <span className={`text-[11px] font-mono ${newNote.length > 1900 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {newNote.length} / 2000 ký tự
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nhập nội dung tư vấn, phản hồi của học viên hoặc kế hoạch theo dõi tiếp theo..."
                  maxLength={2000}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>

              {lead.counselor_note && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                  <span className="font-bold text-slate-700 block">Ghi chú gần nhất hiện tại:</span>
                  <p className="italic">{lead.counselor_note}</p>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Lưu ý bảo mật:</strong> Ghi chú chăm sóc và thông tin đối soát chỉ hiển thị nội bộ cho Cán bộ Tuyển sinh và Quản trị viên; CTV không xem được các ghi chú nội bộ này.
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingCare}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  {isSavingCare ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Lưu chăm sóc</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COL: TIMELINES */}
        <div className="space-y-6">
          {/* Care History (Audit Logs) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-900" />
              <span>Lịch sử chăm sóc & tư vấn</span>
            </h3>

            {careHistoryList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có lịch sử chăm sóc được ghi nhận.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {careHistoryList.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-blue-900">{c.actor?.full_name || 'Cán bộ Tuyển sinh'}</span>
                      <span className="font-mono text-slate-400">{formatDateVN(c.created_at)}</span>
                    </div>
                    {c.old_values?.counseling_status && c.new_values?.counseling_status && c.old_values.counseling_status !== c.new_values.counseling_status && (
                      <div className="text-slate-700 text-[11px]">
                        Chuyển trạng thái: <strong className="text-slate-900">{c.old_values.counseling_status}</strong> → <strong className="text-emerald-700">{c.new_values.counseling_status}</strong>
                      </div>
                    )}
                    {c.note && (
                      <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-800 text-[11px] italic">
                        "{c.note}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reconciliations & Rewards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-blue-900" />
              <span>Lịch sử đối soát & Thưởng</span>
            </h3>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bản ghi đối soát:</h4>
              {reconList.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có bản ghi đối soát.</p>
              ) : (
                reconList.map((r: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-mono">
                      <strong className="text-blue-900">{r.external_admission_code}</strong>
                      <span className="text-emerald-700 font-semibold">{r.reconciliation_status}</span>
                    </div>
                    <div className="text-slate-600">Học phí: {Number(r.tuition_fee_collected || 0).toLocaleString('vi-VN')} VNĐ</div>
                    <div className="text-[11px] text-slate-400">{formatDateVN(r.tuition_paid_at || r.created_at)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Khoản thưởng CTV:</h4>
              {rewardList.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có khoản thưởng khởi tạo.</p>
              ) : (
                rewardList.map((rew: any, i: number) => (
                  <div key={i} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between items-center font-mono">
                      <strong className="text-amber-900">{Number(rew.amount || 500000).toLocaleString('vi-VN')} VNĐ</strong>
                      <span className="text-amber-800 font-semibold">{rew.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Khởi tạo: {formatDateVN(rew.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
