import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  Ban,
  Trash2,
  Edit,
  FileText,
  Calendar,
  Sparkles,
  Loader2,
  RotateCcw,
  Tag,
  Share2,
} from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../../services/api';
import {
  AdminAnnouncementDetailDTO,
  AnnouncementRecipientItemDTO,
  NotificationCategory,
  NotificationStatus,
} from '../../../types';
import { formatDateTimeVi, formatDateTimeShortVi } from '../../../utils/dateFormatter';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface AnnouncementDetailModalProps {
  announcementId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditDraft?: (announcement: AdminAnnouncementDetailDTO) => void;
  onPublishDraft?: (announcement: AdminAnnouncementDetailDTO) => void;
  onRevokePublished?: (announcement: AdminAnnouncementDetailDTO) => void;
  onDeleteDraft?: (announcement: AdminAnnouncementDetailDTO) => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcementId,
  isOpen,
  onClose,
  onEditDraft,
  onPublishDraft,
  onRevokePublished,
  onDeleteDraft,
}) => {
  const [detail, setDetail] = useState<AdminAnnouncementDetailDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'content' | 'recipients'
  const [activeTab, setActiveTab] = useState<'content' | 'recipients'>('content');

  // Recipients List State
  const [recipients, setRecipients] = useState<AnnouncementRecipientItemDTO[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsFilter, setRecipientsFilter] = useState<'ALL' | 'READ' | 'UNREAD'>('ALL');
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsPagination, setRecipientsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Load Detail
  useEffect(() => {
    if (!isOpen || !announcementId) {
      setDetail(null);
      setRecipients([]);
      setActiveTab('content');
      return;
    }

    setLoading(true);
    setError(null);

    api.getAdminAnnouncementDetail(announcementId)
      .then((res) => {
        if (res.success && res.data) {
          setDetail(res.data);
        } else {
          setError(res.error || 'Không thể tải chi tiết bản tin.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Lỗi kết nối khi tải chi tiết bản tin.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, announcementId]);

  // Load Recipients if in 'recipients' tab and not draft
  useEffect(() => {
    if (!isOpen || !announcementId || activeTab !== 'recipients' || detail?.status === 'DRAFT') return;

    setRecipientsLoading(true);
    api.getAdminAnnouncementRecipients(announcementId, {
      status: recipientsFilter,
      page: recipientsPage,
      limit: 20,
    })
      .then((res) => {
        if (res.success) {
          let recList: AnnouncementRecipientItemDTO[] = [];
          if (Array.isArray(res.data)) {
            recList = res.data;
          } else if (Array.isArray(res.data?.items)) {
            recList = res.data.items;
          } else if (Array.isArray((res as any).items)) {
            recList = (res as any).items;
          }
          setRecipients(recList);
          const pag = res.pagination || res.data?.pagination;
          if (pag) {
            setRecipientsPagination({
              page: pag.page || recipientsPage,
              limit: pag.limit || pag.page_size || 20,
              total: pag.total ?? pag.total_items ?? recList.length,
              totalPages: pag.totalPages ?? pag.total_pages ?? 1,
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setRecipientsLoading(false);
      });
  }, [isOpen, announcementId, activeTab, recipientsFilter, recipientsPage, detail?.status]);

  if (!isOpen) return null;

  const getStatusBadge = (status: NotificationStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return { label: 'Đã xuất bản', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'REVOKED':
        return { label: 'Đã thu hồi', className: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: 'Bản nháp', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
  };

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

  const statusMeta = detail ? getStatusBadge(detail.status) : null;
  const categoryMeta = detail ? getCategoryBadge(detail.category) : null;

  // Safe markdown parse
  const renderedContentHtml = (() => {
    if (!detail?.content) return '';
    try {
      return sanitizeHtml(marked.parse(detail.content) as string);
    } catch {
      return sanitizeHtml(detail.content);
    }
  })();

  const readRate = detail && detail.stats.recipient_count > 0
    ? Math.round((detail.stats.read_count / detail.stats.recipient_count) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="detail-modal-title" className="text-lg font-bold text-white">
                  Chi tiết bản tin thông báo
                </h3>
                {statusMeta && (
                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                )}
                {categoryMeta && (
                  <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${categoryMeta.className}`}>
                    {categoryMeta.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Toàn bộ nội dung, mốc thời gian và thống kê đọc tin của CTV
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Đang tải chi tiết bản tin...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          ) : detail ? (
            <>
              {/* REVOKED ALERT BANNER */}
              {detail.status === 'REVOKED' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 leading-relaxed">
                    <p className="font-bold text-sm text-rose-950 mb-0.5">
                      Bản tin này đã bị thu hồi!
                    </p>
                    <p>
                      <strong>Lý do thu hồi:</strong> {detail.revoke_reason || 'Không có lý do chi tiết.'}
                    </p>
                    <p className="text-rose-700 mt-1">
                      Thu hồi bởi <strong>{detail.revoker_name || 'Admin'}</strong> vào lúc {formatDateTimeVi(detail.revoked_at)}.
                    </p>
                  </div>
                </div>
              )}

              {/* DRAFT NOTICE BANNER */}
              {detail.status === 'DRAFT' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold text-sm text-amber-950 mb-0.5">
                      Bản nháp - Chưa xuất bản
                    </p>
                    <p>
                      Bản tin này đang ở trạng thái nháp và chưa được phân phối đến bất kỳ cộng tác viên nào. Bạn có thể tiếp tục chỉnh sửa hoặc xuất bản khi sẵn sàng.
                    </p>
                  </div>
                </div>
              )}

              {/* STATS OVERVIEW (For PUBLISHED or REVOKED) */}
              {detail.status !== 'DRAFT' && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      Thống kê tỷ lệ tiếp nhận và đọc tin
                    </h4>
                    <span className="text-xs font-bold text-blue-600">
                      Tỷ lệ đọc: {readRate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-0.5">
                        Tổng người nhận
                      </span>
                      <span className="text-xl font-black text-slate-900">
                        {detail.stats.recipient_count.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-emerald-200 bg-emerald-50/30 rounded-xl">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase block mb-0.5">
                        Đã đọc
                      </span>
                      <span className="text-xl font-black text-emerald-700">
                        {detail.stats.read_count.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-0.5">
                        Chưa đọc
                      </span>
                      <span className="text-xl font-black text-slate-600">
                        {detail.stats.unread_count.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="p-3 bg-white border border-blue-200 bg-blue-50/30 rounded-xl">
                      <span className="text-[11px] font-semibold text-blue-700 uppercase block mb-0.5">
                        Phạm vi
                      </span>
                      <span className="text-sm font-bold text-blue-900 block truncate">
                        {detail.recipient_scope === 'ALL'
                          ? 'Toàn bộ CTV'
                          : detail.recipient_scope === 'STATUS_FILTER'
                          ? 'Bộ lọc trạng thái'
                          : 'Chỉ định CTV'}
                      </span>
                    </div>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, readRate))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* TIMELINE METADATA */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600">
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Người tạo:</span>
                  <span className="font-bold text-slate-800">{detail.creator_name || 'Hệ thống'}</span>
                  <span className="block text-slate-400 mt-0.5">{formatDateTimeShortVi(detail.created_at)}</span>
                </div>

                {detail.published_at && (
                  <div>
                    <span className="font-semibold text-slate-500 block mb-0.5">Người xuất bản:</span>
                    <span className="font-bold text-slate-800">{detail.publisher_name || 'Hệ thống'}</span>
                    <span className="block text-slate-400 mt-0.5">{formatDateTimeShortVi(detail.published_at)}</span>
                  </div>
                )}

                {detail.revoked_at && (
                  <div>
                    <span className="font-semibold text-rose-600 block mb-0.5">Người thu hồi:</span>
                    <span className="font-bold text-rose-900">{detail.revoker_name || 'Admin'}</span>
                    <span className="block text-rose-500 mt-0.5">{formatDateTimeShortVi(detail.revoked_at)}</span>
                  </div>
                )}
              </div>

              {/* TABS SELECTOR */}
              <div className="border-b border-slate-200 flex gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === 'content'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Nội dung thông báo
                </button>

                {detail.status !== 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('recipients')}
                    className={`pb-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'recipients'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Danh sách người nhận</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-full text-xs">
                      {detail.stats.recipient_count}
                    </span>
                  </button>
                )}
              </div>

              {/* TAB 1: NỘI DUNG */}
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    {detail.title}
                  </h3>

                  {detail.summary && (
                    <div className="p-3 bg-slate-50 border-l-4 border-blue-500 rounded-r-xl text-sm font-medium text-slate-700 italic">
                      {detail.summary}
                    </div>
                  )}

                  <div
                    className="prose prose-sm max-w-none text-slate-800 bg-white p-5 rounded-2xl border border-slate-200 leading-relaxed shadow-xs"
                    dangerouslySetInnerHTML={{ __html: renderedContentHtml }}
                  />

                  {detail.action_url && (
                    <div className="pt-2">
                      <a
                        href={detail.action_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Liên kết đính kèm: {detail.action_url}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DANH SÁCH NGƯỜI NHẬN */}
              {activeTab === 'recipients' && detail.status !== 'DRAFT' && (
                <div className="space-y-4">
                  {/* Filter Sub-bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientsFilter('ALL');
                          setRecipientsPage(1);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          recipientsFilter === 'ALL'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({detail.stats.recipient_count})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientsFilter('READ');
                          setRecipientsPage(1);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          recipientsFilter === 'READ'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        Đã đọc ({detail.stats.read_count})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientsFilter('UNREAD');
                          setRecipientsPage(1);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                          recipientsFilter === 'UNREAD'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Chưa đọc ({detail.stats.unread_count})
                      </button>
                    </div>
                  </div>

                  {/* Recipients Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">STT</th>
                          <th className="py-2.5 px-3">Mã CTV</th>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Thời điểm gửi</th>
                          <th className="py-2.5 px-3">Trạng thái đọc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recipientsLoading ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                              Đang tải danh sách người nhận...
                            </td>
                          </tr>
                        ) : (!Array.isArray(recipients) || recipients.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Không có người nhận nào khớp với bộ lọc.
                            </td>
                          </tr>
                        ) : (
                          (Array.isArray(recipients) ? recipients : []).map((rec, idx) => {
                            const indexNumber = (recipientsPage - 1) * 20 + idx + 1;
                            return (
                              <tr key={rec.recipient_id} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3 text-slate-400">{indexNumber}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                  {rec.affiliate_code}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  {rec.full_name}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">{rec.email || '—'}</td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {formatDateTimeShortVi(rec.delivered_at)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {rec.is_read ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Đã đọc lúc {formatDateTimeShortVi(rec.read_at)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      Chưa đọc
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination if multiple pages */}
                  {recipientsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>
                        Trang {recipientsPage} / {recipientsPagination.totalPages} (Tổng {recipientsPagination.total} người)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRecipientsPage((p) => Math.max(1, p - 1))}
                          disabled={recipientsPage <= 1}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                        >
                          Trước
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecipientsPage((p) => Math.min(recipientsPagination.totalPages, p + 1))}
                          disabled={recipientsPage >= recipientsPagination.totalPages}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Đóng
          </button>

          {detail && (
            <div className="flex items-center gap-2">
              {/* Edit draft */}
              {detail.status === 'DRAFT' && detail.permissions?.can_edit && onEditDraft && (
                <button
                  type="button"
                  onClick={() => onEditDraft(detail)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Sửa nháp
                </button>
              )}

              {/* Publish draft */}
              {detail.status === 'DRAFT' && detail.permissions?.can_publish && onPublishDraft && (
                <button
                  type="button"
                  onClick={() => onPublishDraft(detail)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-all shadow-sm shadow-emerald-600/30"
                >
                  <Send className="w-4 h-4" />
                  Xuất bản ngay
                </button>
              )}

              {/* Revoke published */}
              {detail.status === 'PUBLISHED' && detail.permissions?.can_revoke && onRevokePublished && (
                <button
                  type="button"
                  onClick={() => onRevokePublished(detail)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-all shadow-sm shadow-rose-600/30"
                >
                  <Ban className="w-4 h-4" />
                  Thu hồi bản tin
                </button>
              )}

              {/* Delete draft */}
              {detail.status === 'DRAFT' && detail.permissions?.can_delete && onDeleteDraft && (
                <button
                  type="button"
                  onClick={() => onDeleteDraft(detail)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa nháp
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
