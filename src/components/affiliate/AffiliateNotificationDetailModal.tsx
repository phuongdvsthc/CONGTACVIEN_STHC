import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  Bell,
  Building2,
  FileText,
  DollarSign,
  GraduationCap,
  UserCheck,
  RotateCcw,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { marked } from 'marked';
import { NotificationItemDTO } from '../../types';
import { formatDateTimeVi } from '../../utils/dateFormatter';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface AffiliateNotificationDetailModalProps {
  notificationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  // Callback khi trạng thái đã đọc được lưu thành công trên máy chủ
  onReadSuccess?: (notificationId: string) => void;
}

export const AffiliateNotificationDetailModal: React.FC<AffiliateNotificationDetailModalProps> = ({
  notificationId,
  isOpen,
  onClose,
  onNavigate,
  onReadSuccess,
}) => {
  const [detail, setDetail] = useState<NotificationItemDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // Trạng thái đánh dấu đã đọc
  const [markingRead, setMarkingRead] = useState(false);
  const [markReadError, setMarkReadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !notificationId) {
      setDetail(null);
      setError(null);
      setIs404(false);
      setMarkReadError(null);
      return;
    }

    let isMounted = true;
    const currentId = notificationId;

    const fetchDetailAndMarkRead = async () => {
      setLoading(true);
      setError(null);
      setIs404(false);
      setMarkReadError(null);

      try {
        // 1. Tải chi tiết thông báo
        const { api } = await import('../../services/api');
        const res = await api.getPortalNotificationDetail(currentId);

        if (!isMounted) return;

        if (res.success && res.data) {
          setDetail(res.data);

          // 2. Nếu thông báo chưa đọc, tự động gọi đánh dấu đã đọc sau khi tải chi tiết thành công
          if (!res.data.is_read) {
            setMarkingRead(true);
            try {
              const readRes = await api.markPortalNotificationAsRead(currentId);
              if (!isMounted) return;

              if (readRes.success) {
                // Cập nhật trạng thái hiển thị
                setDetail((prev) => (prev ? { ...prev, is_read: true, read_at: readRes.data?.read_at || new Date().toISOString() } : prev));
                if (onReadSuccess) {
                  onReadSuccess(currentId);
                }
              } else {
                setMarkReadError('Chưa lưu được trạng thái đã đọc.');
              }
            } catch (err) {
              if (isMounted) {
                setMarkReadError('Chưa lưu được trạng thái đã đọc do lỗi mạng.');
              }
            } finally {
              if (isMounted) setMarkingRead(false);
            }
          }
        } else {
          if (res.code === 'NOT_FOUND') {
            setIs404(true);
            setError('Thông báo không còn khả dụng hoặc đã bị thu hồi.');
          } else {
            setError(res.error || 'Không thể tải chi tiết thông báo.');
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'Lỗi mạng khi tải chi tiết thông báo.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetailAndMarkRead();

    return () => {
      isMounted = false;
    };
  }, [isOpen, notificationId, onReadSuccess]);

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Thao tác thử lại đánh dấu đã đọc nếu bị lỗi
  const handleRetryMarkRead = async () => {
    if (!notificationId || markingRead) return;
    setMarkingRead(true);
    setMarkReadError(null);
    try {
      const { api } = await import('../../services/api');
      const readRes = await api.markPortalNotificationAsRead(notificationId);
      if (readRes.success) {
        setDetail((prev) => (prev ? { ...prev, is_read: true, read_at: readRes.data?.read_at || new Date().toISOString() } : prev));
        if (onReadSuccess) onReadSuccess(notificationId);
      } else {
        setMarkReadError('Chưa lưu được trạng thái đã đọc.');
      }
    } catch {
      setMarkReadError('Chưa lưu được trạng thái đã đọc do lỗi mạng.');
    } finally {
      setMarkingRead(false);
    }
  };

  // Render HTML an toàn từ Markdown / Text
  const renderSafeContent = (rawContent?: string) => {
    if (!rawContent) return null;
    try {
      const html = marked.parse(rawContent) as string;
      const cleanHtml = sanitizeHtml(html);
      return (
        <div
          className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-3 prose-headings:font-bold prose-headings:text-slate-900 prose-p:my-2 prose-ul:my-2 prose-li:my-1 prose-a:text-blue-900 prose-a:underline hover:prose-a:text-blue-700 break-words"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    } catch {
      return (
        <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed break-words">
          {rawContent}
        </p>
      );
    }
  };

  // Xử lý CTA điều hướng an toàn
  const getCtaInfo = (actionUrl?: string | null) => {
    if (!actionUrl || typeof actionUrl !== 'string') return null;
    const cleanUrl = actionUrl.trim();

    // TUYỆT ĐỐI không cho phép dẫn tới /admin hoặc đường dẫn ngoài
    if (cleanUrl.startsWith('/admin') || cleanUrl.includes('://')) {
      return null;
    }

    if (cleanUrl.startsWith('/portal/leads/')) {
      return {
        label: 'Xem chi tiết khách hàng',
        path: cleanUrl,
        icon: GraduationCap,
      };
    }
    if (cleanUrl === '/portal/leads') {
      return {
        label: 'Xem danh sách khách hàng',
        path: cleanUrl,
        icon: GraduationCap,
      };
    }
    if (cleanUrl === '/portal' || cleanUrl === '/portal/dashboard' || cleanUrl === '/portal/overview') {
      return {
        label: 'Xem tổng quan Cổng CTV',
        path: '/portal',
        icon: ArrowRight,
      };
    }
    if (cleanUrl.startsWith('/portal/courses')) {
      return {
        label: 'Xem thông tin khóa học',
        path: cleanUrl,
        icon: FileText,
      };
    }

    return {
      label: 'Mở liên kết liên quan',
      path: cleanUrl,
      icon: ExternalLink,
    };
  };

  const getCategoryLabel = (category?: string, type?: string) => {
    if (type === 'ANNOUNCEMENT') {
      switch (category) {
        case 'URGENT':
          return 'Khẩn cấp';
        case 'POLICY':
          return 'Chính sách';
        case 'EVENT':
          return 'Sự kiện';
        default:
          return 'Ban quản trị';
      }
    }

    switch (category) {
      case 'LEAD':
        return 'Khách hàng';
      case 'RECONCILIATION':
        return 'Nhập học';
      case 'REWARD':
        return 'Thù lao';
      case 'ACCOUNT':
        return 'Tài khoản';
      default:
        return 'Hệ thống';
    }
  };

  if (!isOpen) return null;

  const ctaInfo = getCtaInfo(detail?.action_url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-notif-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              {detail?.type === 'ANNOUNCEMENT' ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              {detail && (
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mb-1">
                  <span className="font-semibold text-blue-900">
                    {getCategoryLabel(detail.category, detail.type)}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="tabular-nums flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateTimeVi(detail.created_at)}
                  </span>
                </div>
              )}
              <h2
                id="modal-notif-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug break-words"
              >
                {detail?.title || (loading ? 'Đang tải thông báo...' : 'Chi tiết thông báo')}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-[160px] space-y-4">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <p className="text-sm font-medium">Đang tải nội dung thông báo...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{is404 ? 'Thông báo không còn khả dụng' : 'Lỗi tải thông báo'}</span>
              </div>
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {!loading && !error && detail && (
            <div className="space-y-4">
              {/* Tóm tắt nội dung nếu có */}
              {detail.summary && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium leading-relaxed italic">
                  {detail.summary}
                </div>
              )}

              {/* Nội dung chi tiết Render An Toàn */}
              <div className="pt-2">{renderSafeContent(detail.content)}</div>

              {/* Cảnh báo lỗi đánh dấu đã đọc nếu có */}
              {markReadError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-800 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    {markReadError}
                  </span>
                  <button
                    onClick={handleRetryMarkRead}
                    disabled={markingRead}
                    className="underline font-bold hover:text-amber-950 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500">
            {detail?.is_read ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã đọc ({formatDateTimeVi(detail.read_at)})
              </span>
            ) : detail ? (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock className="w-4 h-4" />
                {markingRead ? 'Đang cập nhật đã đọc...' : 'Chưa đọc'}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2.5">
            {ctaInfo && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate(ctaInfo.path);
                }}
                className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <ctaInfo.icon className="w-4 h-4 text-amber-400" />
                <span>{ctaInfo.label}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
