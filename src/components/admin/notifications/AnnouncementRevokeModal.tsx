import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2, Ban } from 'lucide-react';
import { api } from '../../../services/api';
import { AdminNotificationListItemDTO, AdminAnnouncementDetailDTO } from '../../../types';

interface AnnouncementRevokeModalProps {
  announcement: AdminNotificationListItemDTO | AdminAnnouncementDetailDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export const AnnouncementRevokeModal: React.FC<AnnouncementRevokeModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !announcement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError('Lý do thu hồi phải có ít nhất 5 ký tự.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Lý do thu hồi không được vượt quá 500 ký tự.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.revokeAdminAnnouncement(announcement.id, trimmed);
      if (res.success) {
        onSuccess(res.message || 'Đã thu hồi bản tin thông báo thành công.');
        onClose();
      } else {
        if (res.error?.includes('403') || res.code === 'FORBIDDEN') {
          setError('Bạn không có quyền thu hồi bản tin (notifications.revoke).');
        } else if (res.error?.includes('409') || res.code === 'CONFLICT') {
          setError('Trạng thái bản tin đã thay đổi hoặc không thể thu hồi. Vui lòng tải lại trang.');
        } else {
          setError(res.error || 'Lỗi khi thu hồi bản tin.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revoke-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50/80 border-b border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 id="revoke-modal-title" className="text-lg font-bold text-rose-950">
                Thu hồi bản tin thông báo
              </h3>
              <p className="text-xs text-rose-700">
                Gỡ bỏ thông báo đã xuất bản khỏi hộp thư CTV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Announcement Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-1">
              Bản tin bị thu hồi:
            </p>
            <p className="text-sm font-bold text-slate-900 line-clamp-2">
              {announcement.title}
            </p>
          </div>

          {/* Warning box */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-semibold mb-0.5">Cảnh báo quan trọng:</p>
              <p>
                Hành động thu hồi <strong>không thể hoàn tác</strong>. Cộng tác viên sẽ không còn nhìn thấy bản tin này trong hòm thư cá nhân. Lịch sử phân phối vẫn được lưu trữ để đối soát.
              </p>
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="revoke-reason-input" className="text-sm font-semibold text-slate-800">
                Lý do thu hồi <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs ${reason.length > 500 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                {reason.length}/500 ký tự
              </span>
            </div>
            <textarea
              id="revoke-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Nhập lý do thu hồi (vd: Thông báo có sự thay đổi về nội dung chính sách theo quyết định mới...)"
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all placeholder:text-slate-400"
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 5 || reason.trim().length > 500}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-rose-600/30"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang thu hồi...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Xác nhận thu hồi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
