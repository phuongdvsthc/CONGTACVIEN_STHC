import React, { useState, useEffect } from 'react';
import {
  Eye,
  X,
  Users,
  ShieldAlert,
  Loader2,
  Send,
  AlertCircle,
  CheckCircle2,
  Tag,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../../services/api';
import {
  NotificationRecipientScope,
  NotificationRecipientFilter,
  NotificationCategory,
  RecipientPreviewResult,
} from '../../../types';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface AnnouncementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: NotificationCategory;
  summary?: string;
  content: string;
  recipient_scope: NotificationRecipientScope;
  recipient_filter?: NotificationRecipientFilter;
  canPublish?: boolean;
  onPublishNow?: () => void;
  isPublishing?: boolean;
}

export const AnnouncementPreviewModal: React.FC<AnnouncementPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  category,
  summary,
  content,
  recipient_scope,
  recipient_filter,
  canPublish = false,
  onPublishNow,
  isPublishing = false,
}) => {
  const [previewData, setPreviewData] = useState<RecipientPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.previewAdminAnnouncementRecipients({
      recipient_scope,
      recipient_filter: recipient_filter || {},
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setPreviewData(res.data);
        } else {
          setError(res.error || 'Không thể tải dữ liệu ước tính người nhận.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Lỗi kết nối khi lấy dữ liệu ước tính.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, recipient_scope, recipient_filter]);

  if (!isOpen) return null;

  // Render markdown safely
  const renderedContentHtml = (() => {
    try {
      const rawHtml = marked.parse(content || '') as string;
      return sanitizeHtml(rawHtml);
    } catch {
      return sanitizeHtml(content || '');
    }
  })();

  const getCategoryBadge = (cat: NotificationCategory) => {
    switch (cat) {
      case 'URGENT':
        return { label: 'Khẩn cấp', className: 'bg-rose-100 text-rose-700 border-rose-200' };
      case 'POLICY':
        return { label: 'Chính sách', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'EVENT':
        return { label: 'Sự kiện', className: 'bg-amber-100 text-amber-700 border-amber-200' };
      default:
        return { label: 'Thông thường', className: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getScopeLabel = (scope: NotificationRecipientScope) => {
    switch (scope) {
      case 'ALL':
        return 'Toàn bộ CTV';
      case 'STATUS_FILTER':
        return 'Theo trạng thái hồ sơ';
      case 'SPECIFIC':
        return 'Chỉ định CTV cụ thể';
      default:
        return scope;
    }
  };

  const categoryMeta = getCategoryBadge(category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 id="preview-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                Xem trước & Ước tính người nhận
              </h3>
              <p className="text-xs text-slate-300">
                Mô phỏng hiển thị trên hộp thư CTV và phạm vi phân phối
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION A: NỘI DUNG THÔNG BÁO */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Mô phỏng giao diện hiển thị cho Cộng tác viên
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${categoryMeta.className}`}>
                {categoryMeta.label}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {title || '(Chưa có tiêu đề)'}
            </h2>

            {summary && (
              <p className="text-sm font-medium text-slate-600 italic mb-4 pb-3 border-b border-slate-200">
                {summary}
              </p>
            )}

            {/* Markdown rendered body */}
            <div
              className="prose prose-sm max-w-none text-slate-800 leading-relaxed bg-white p-5 rounded-xl border border-slate-200"
              dangerouslySetInnerHTML={{ __html: renderedContentHtml || '<p class="text-slate-400 italic">Chưa có nội dung bài viết.</p>' }}
            />
          </div>

          {/* SECTION B: PHẠM VI VÀ ƯỚC TÍNH NGƯỜI NHẬN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Ước tính phạm vi người nhận
              </h4>
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                Phạm vi: {getScopeLabel(recipient_scope)}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium">Đang tính toán số lượng CTV đủ điều kiện...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            ) : previewData ? (
              <div className="space-y-4">
                {/* Metric cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                      Tổng số CTV đủ điều kiện
                    </p>
                    <p className="text-2xl font-black text-blue-950">
                      {previewData.total_eligible.toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">Sẽ nhận thông báo vào hòm thư</p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Đã loại trừ
                    </p>
                    <p className="text-2xl font-black text-slate-800">
                      {(previewData.excluded_count || 0).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tài khoản Admin / Staff / Chưa kích hoạt</p>
                  </div>

                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                      Trạng thái xuất bản
                    </p>
                    <p className="text-base font-bold text-emerald-950 mt-1">
                      Sẵn sàng phân phối
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Cơ chế fan-out tự động</p>
                  </div>
                </div>

                {/* Sample Recipients List */}
                {previewData.sample_recipients && previewData.sample_recipients.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Danh sách mẫu CTV nhận thông báo ({previewData.sample_recipients.length} người đầu tiên):
                    </p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Mã CTV</th>
                            <th className="py-2.5 px-3">Họ và tên</th>
                            <th className="py-2.5 px-3">Trạng thái hồ sơ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(Array.isArray(previewData.sample_recipients) ? previewData.sample_recipients : []).map((s, idx) => (
                            <tr key={s.affiliate_profile_id || idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 font-mono font-medium text-blue-600">
                                {s.affiliate_code}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {s.full_name}
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Disclaimer banner */}
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Lưu ý:</strong> Số lượng người nhận trên là kết quả ước tính tại thời điểm xem trước. Danh sách người nhận chính thức sẽ được hệ thống chốt snapshot tự động ngay khi Quản trị viên/Cán bộ nhấn nút <strong>Xuất bản</strong>.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Quay lại chỉnh sửa
          </button>

          {canPublish && onPublishNow && (
            <button
              type="button"
              onClick={onPublishNow}
              disabled={isPublishing || loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-emerald-600/30"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xuất bản...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Xuất bản ngay
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
