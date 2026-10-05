import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, ArrowLeft, Calendar, User, Phone, Mail, MapPin, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface AffiliateLeadDetailViewProps {
  leadId: string;
  onBack: () => void;
}

export const AffiliateLeadDetailView: React.FC<AffiliateLeadDetailViewProps> = ({ leadId, onBack }) => {
  const [lead, setLead] = useState<any | null>(null);
  const [history, setHistory] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeadDetail();
  }, [leadId]);

  const loadLeadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, historyRes] = await Promise.all([
        api.getAffiliateLeadDetail(leadId),
        api.getAffiliateLeadHistory(leadId),
      ]);

      if (detailRes.success && detailRes.data) {
        setLead(detailRes.data);
      } else {
        setError(detailRes.error || 'Không tìm thấy thông tin khách hàng hoặc bạn không có quyền xem.');
      }

      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ khi tải chi tiết.');
    } finally {
      setLoading(false);
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
      case 'NEW': return 'Mới đăng ký';
      case 'CONTACTED': return 'Đã liên hệ';
      case 'CONSULTING': return 'Đang tư vấn';
      case 'UNREACHABLE': return 'Chưa liên hệ được';
      case 'LOST': return 'Không tiếp tục';
      default: return status || 'Mới đăng ký';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Đang tải chi tiết hồ sơ khách hàng...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không thể tải thông tin khách hàng</h2>
        <p className="text-xs text-slate-500">{error || 'Hồ sơ không tồn tại hoặc bạn không có quyền truy cập.'}</p>
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* HEADER & BACK BUTTON */}
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
              <span>Hồ sơ khách hàng giới thiệu</span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {lead.id}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{lead.full_name}</h1>
          </div>
        </div>

        <button
          onClick={loadLeadDetail}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tải lại</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: CUSTOMER INFO & STATUS */}
        <div className="md:col-span-2 space-y-6">
          {/* Section A: Thông tin khách */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-blue-900" />
              <span>A. Thông tin cá nhân học viên</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Họ và tên:</span>
                <p className="font-bold text-slate-900 text-sm">{lead.full_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Số điện thoại (Bảo mật):</span>
                <p className="font-mono font-bold text-blue-900 text-sm">{lead.phone_masked || '090****'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Email:</span>
                <p className="text-slate-800 font-medium">{lead.email || '—'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Tỉnh / Thành phố:</span>
                <p className={lead.province && lead.province.trim() ? 'text-slate-800 font-medium' : 'text-slate-400 italic font-medium'}>
                  {lead.province && lead.province.trim() ? lead.province.trim() : 'Chưa cập nhật'}
                </p>
              </div>
            </div>

            {lead.customer_note && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-xs text-slate-500 font-medium">Ghi chú của học viên khi đăng ký:</span>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 italic border border-slate-200">
                  "{lead.customer_note}"
                </div>
              </div>
            )}
          </div>

          {/* Section B & C: Đăng ký & Tình trạng nhập học */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-blue-900" />
              <span>B & C. Thông tin đăng ký & Tình trạng tuyển sinh</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Chương trình đăng ký:</span>
                <p className="font-bold text-slate-900">{lead.course_title || 'Tư vấn chung STHC'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Thời gian đăng ký:</span>
                <p className="font-mono text-slate-800">{formatDateVN(lead.created_at)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Tiến độ tư vấn:</span>
                <p>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-900 font-semibold rounded-lg border border-blue-200 inline-block">
                    {getCounselingLabel(lead.counseling_status)}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">Kết quả đối soát hồ sơ:</span>
                <p>
                  {lead.reconciliation_status === 'MATCHED_VALID' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Đã nhập học (Hồ sơ hợp lệ)
                    </span>
                  ) : lead.reconciliation_status === 'EXISTING_IN_SCHOOL_SYSTEM' ? (
                    <span className="px-2.5 py-1 bg-purple-50 text-purple-900 font-bold rounded-lg border border-purple-200 inline-block">
                      Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)
                    </span>
                  ) : lead.reconciliation_status === 'MISMATCH_INVALID' ? (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-900 font-bold rounded-lg border border-rose-200 inline-block">
                      Thông tin không khớp
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg border border-slate-200 inline-block">
                      Chưa đối chiếu
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-1 sm:col-span-2 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
                <span className="text-blue-900/70 font-semibold block mb-1">Hồ sơ đăng ký EGOV:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono font-bold text-blue-950 text-sm">
                    {lead.external_admission_code || 'Chưa cập nhật'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${lead.external_admission_code ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                    {lead.external_admission_code ? 'Đã đăng ký hồ sơ EGOV' : 'Chưa cập nhật mã EGOV'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: HISTORY TIMELINE */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-900" />
              <span>Lịch sử sự kiện hồ sơ</span>
            </h3>

            {!history || !history.events || history.events.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                <p>Chưa có sự kiện lịch sử ghi nhận.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {history.events.map((ev: any, idx: number) => (
                  <div key={idx} className="relative pl-7 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-900 border-2 border-white shadow-xs" />
                    <div className="text-[11px] font-mono text-slate-400">{formatDateVN(ev.time)}</div>
                    <div className="text-xs font-bold text-slate-900">{ev.title}</div>
                    <div className="text-[11px] text-slate-600 leading-relaxed">{ev.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
