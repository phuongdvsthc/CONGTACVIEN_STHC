import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course, Lead } from '../../types';
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
  RotateCcw,
  FileCheck2,
  Building,
} from 'lucide-react';
import { AdminReconciliationModal } from './AdminReconciliationModal';
import { AdminVoidReconciliationModal } from './AdminVoidReconciliationModal';

interface AdminLeadDetailViewProps {
  leadId: string;
  currentUser?: any;
  onBack: () => void;
}

export const AdminLeadDetailView: React.FC<AdminLeadDetailViewProps> = ({ leadId, currentUser, onBack }) => {
  const [lead, setLead] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [reconcileModalOpen, setReconcileModalOpen] = useState<boolean>(false);
  const [voidModalOpen, setVoidModalOpen] = useState<boolean>(false);

  // Care Form State (A3.6)
  const [counselingStatus, setCounselingStatus] = useState<string>('NEW');
  const [newNote, setNewNote] = useState<string>('');
  const [isSavingCare, setIsSavingCare] = useState<boolean>(false);
  const [careFeedback, setCareFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, historyRes, coursesRes] = await Promise.all([
        api.getAdminLeadDetail(leadId),
        api.getLeadHistory(leadId),
        api.getAdminCourses({ limit: 100 }),
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

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data);
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
        await loadData();
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

  const formatVND = (amount: number | null | undefined) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

  const renderAdmissionStatus = (status: string | undefined) => {
    if (status === 'ENROLLED') {
      return (
        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Đã nhập học (ENROLLED)</span>
        </span>
      );
    }
    if (status === 'NOT_ENROLLED') {
      return (
        <span className="text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1 border border-slate-200 font-medium">
          <span>Chưa nhập học (NOT_ENROLLED)</span>
        </span>
      );
    }
    return (
      <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1 border border-amber-200">
        <span>Chưa xác định</span>
      </span>
    );
  };

  const renderReconciliationStatus = (status: string | undefined) => {
    switch (status) {
      case 'MATCHED_VALID':
        return (
          <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs border border-emerald-200 inline-block">
            Hồ sơ hợp lệ (MATCHED_VALID)
          </span>
        );
      case 'EXISTING_IN_SCHOOL_SYSTEM':
        return (
          <span className="font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg text-xs border border-purple-200 inline-block">
            Đăng ký trước qua kênh khác (EXISTING)
          </span>
        );
      case 'MISMATCH_INVALID':
        return (
          <span className="font-bold text-rose-900 bg-rose-50 px-2.5 py-1 rounded-lg text-xs border border-rose-200 inline-block">
            Thông tin không khớp (MISMATCH)
          </span>
        );
      case 'VOIDED':
        return (
          <span className="font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg text-xs border border-slate-200 inline-block">
            Đã hủy đối chiếu (VOIDED)
          </span>
        );
      default:
        return (
          <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-xs border border-slate-200 inline-block font-medium">
            Chưa đối chiếu (NOT_RECONCILED)
          </span>
        );
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
  const activeRecon = lead.current_reconciliation || reconList.find((r: any) => ['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID'].includes(r.reconciliation_status));
  const hasActiveRecon = Boolean(activeRecon && ['MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID'].includes(activeRecon.reconciliation_status));

  const hasDifferentCourse = lead.reconciled_course_title && lead.initial_course_title && lead.reconciled_course_title !== lead.initial_course_title;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl border border-slate-200 p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-wider mb-0.5">
              <span>Hồ sơ tuyển sinh STHC</span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {lead.id}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{lead.full_name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại</span>
          </button>

          {!hasActiveRecon ? (
            <button
              onClick={() => setReconcileModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 transition-colors shadow-sm"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Đối chiếu hồ sơ</span>
            </button>
          ) : (
            <button
              onClick={() => setVoidModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Hủy đối chiếu</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: PERSONAL INFO, RECONCILIATION SUMMARY, CARE FORM */}
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
                <span className="text-slate-500 font-medium block">Số điện thoại:</span>
                <strong className="text-blue-900 font-mono text-sm">{lead.phone}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Email:</span>
                <span className="text-slate-800">{lead.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Tỉnh / Thành phố:</span>
                <span className={lead.province && lead.province.trim() ? 'text-slate-800' : 'text-slate-400 italic'}>
                  {lead.province && lead.province.trim() ? lead.province.trim() : 'Chưa cập nhật'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Ngày đăng ký (GMT+7):</span>
                <span className="text-slate-800 font-mono">{formatDateVN(lead.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Nguồn giới thiệu:</span>
                {lead.affiliate_code ? (
                  <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {lead.affiliate_code} — {lead.affiliate_name || 'Cộng tác viên'}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Khách tự đăng ký</span>
                )}
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

          {/* Section B: Active Reconciliation & Tuition Snapshot Detail */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <span>B. Thông tin Đối chiếu Hồ sơ & Học phí Hiện hành</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Kết quả đối chiếu:</span>
                <div className="mt-1">{renderReconciliationStatus(lead.reconciliation_status)}</div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Tình trạng nhập học EGOV:</span>
                <div className="mt-1">{renderAdmissionStatus(lead.admission_status)}</div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Mã hồ sơ EGOV:</span>
                <span className="font-mono font-bold text-blue-900 text-sm">
                  {lead.external_admission_code ? String(lead.external_admission_code) : '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Mã học viên trên EGOV:</span>
                <span className="font-mono text-slate-800">
                  {lead.external_student_code || activeRecon?.external_student_code || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Khóa học đăng ký ban đầu:</span>
                <strong className="text-slate-900">{lead.initial_course_title || 'Chương trình STHC'}</strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Khóa học đối chiếu thực tế:</span>
                <strong className={hasDifferentCourse ? 'text-purple-900' : 'text-slate-900'}>
                  {lead.reconciled_course_title || lead.initial_course_title || 'Chương trình STHC'}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Học phí khóa học (Snapshot):</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {formatVND(lead.course_tuition_fee)}
                  {lead.course_tuition_fee_type === 'ESTIMATE' && <span className="text-[10px] text-slate-500 font-sans ml-1">(Ước tính)</span>}
                  {lead.course_tuition_fee_type === 'OFFICIAL' && <span className="text-[10px] text-emerald-700 font-sans ml-1">(Chính thức)</span>}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Học phí thực thu:</span>
                <span className="font-mono font-bold text-emerald-900 text-sm">
                  {formatVND(lead.tuition_fee_collected)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Số biên lai thu tiền:</span>
                <span className="font-mono text-slate-800">{lead.receipt_number || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Ngày đóng học phí:</span>
                <span className="text-slate-800">{lead.tuition_paid_at ? formatDateVN(lead.tuition_paid_at) : '—'}</span>
              </div>
            </div>

            {activeRecon?.staff_note && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Ghi chú / Căn cứ đối chiếu:</span>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 italic border border-slate-200">
                  "{activeRecon.staff_note}"
                </div>
              </div>
            )}
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
                Nội bộ Cán bộ
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

        {/* RIGHT COL: TIMELINES (RECONCILIATIONS & CARE HISTORY) */}
        <div className="space-y-6">
          {/* Lịch sử Đối soát & Thưởng */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-blue-900" />
              <span>Lịch sử đối soát & Thưởng</span>
            </h3>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bản ghi đối soát:</h4>
              {reconList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có bản ghi đối soát nào.</p>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {reconList.map((r: any, i: number) => {
                    const isVoided = r.reconciliation_status === 'VOIDED';
                    return (
                      <div key={i} className={`p-3 rounded-xl border text-xs space-y-1.5 ${isVoided ? 'bg-slate-100 border-slate-300 opacity-75' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center font-mono">
                          <strong className="text-blue-900">{r.external_admission_code || '—'}</strong>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            isVoided ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {r.reconciliation_status}
                          </span>
                        </div>
                        <div className="text-slate-700 font-medium">Khóa học: {r.courses?.title || 'Chương trình STHC'}</div>
                        <div className="text-slate-600">Học phí: {formatVND(r.course_tuition_fee)} | Thực thu: {formatVND(r.tuition_fee_collected)}</div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span>Thực hiện: {r.staff?.full_name || 'Cán bộ'}</span>
                          <span>{formatDateVN(r.reconciled_at || r.created_at)}</span>
                        </div>
                        {isVoided && r.void_reason && (
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-900 text-[11px] border border-rose-200 space-y-0.5">
                            <strong className="block text-rose-950">Lý do hủy:</strong>
                            <p className="italic">"{r.void_reason}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Khoản thưởng CTV:</h4>
              {rewardList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có khoản thưởng khởi tạo.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {rewardList.map((rew: any, i: number) => (
                    <div key={i} className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <strong className="text-amber-900">{formatVND(rew.amount || 500000)}</strong>
                        <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          rew.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900' : (rew.status === 'VOIDED' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900')
                        }`}>
                          {rew.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Khởi tạo: {formatDateVN(rew.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lịch sử Chăm sóc (Audit Logs) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-900" />
              <span>Lịch sử chăm sóc & tư vấn</span>
            </h3>

            {careHistoryList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">Chưa có lịch sử chăm sóc được ghi nhận.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {careHistoryList.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-blue-900">{c.actor?.full_name || 'Cán bộ Tuyển sinh'}</span>
                      <span className="font-mono text-slate-400">{formatDateVN(c.created_at)}</span>
                    </div>
                    {c.old_values?.counseling_status && c.new_values?.counseling_status && c.old_values.counseling_status !== c.new_values.counseling_status && (
                      <div className="text-slate-700 text-[11px]">
                        Tiến độ: <strong className="text-slate-900">{c.old_values.counseling_status}</strong> → <strong className="text-emerald-700">{c.new_values.counseling_status}</strong>
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
        </div>
      </div>

      {/* RECONCILIATION MODAL */}
      <AdminReconciliationModal
        lead={lead}
        courses={courses}
        isOpen={reconcileModalOpen}
        onClose={() => setReconcileModalOpen(false)}
        onSuccess={() => {
          setReconcileModalOpen(false);
          loadData();
        }}
      />

      {/* VOID RECONCILIATION MODAL */}
      <AdminVoidReconciliationModal
        lead={lead}
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        onSuccess={() => {
          setVoidModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
