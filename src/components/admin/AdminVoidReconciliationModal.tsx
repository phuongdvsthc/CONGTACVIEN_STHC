import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { X, RotateCcw, AlertCircle, ShieldAlert } from 'lucide-react';

interface AdminVoidReconciliationModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminVoidReconciliationModal: React.FC<AdminVoidReconciliationModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [voidReason, setVoidReason] = useState<string>('');
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeRecon = lead?.current_reconciliation || lead?.lead_reconciliations?.[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanReason = voidReason.trim();
    if (!cleanReason) {
      setErrorMsg('Bắt buộc phải nhập lý do hủy ghép đối soát.');
      return;
    }

    if (cleanReason.length > 2000) {
      setErrorMsg('Lý do hủy vượt quá độ dài cho phép (tối đa 2000 ký tự).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        void_reason: cleanReason,
        target_reconciliation_id: activeRecon?.id,
        client_updated_at: lead?.updated_at,
      };

      const res = await api.voidReconciliation(lead.id, payload, idempotencyKeyRef.current);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Không thể hủy đối soát hồ sơ.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="px-6 py-4 bg-rose-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
            <h3 className="text-base font-bold">Hủy kết quả đối soát hồ sơ</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WARNING NOTICE */}
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Cảnh báo quan trọng:</strong> Hủy đối chiếu sẽ vô hiệu hóa kết quả hiện tại và khoản thưởng liên quan nếu có. Lịch sử vẫn được giữ lại.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Ứng viên:</span>
              <strong className="text-slate-900">{lead?.full_name} ({lead?.phone})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mã EGOV hiện hành:</span>
              <strong className="font-mono text-blue-900">{activeRecon?.external_admission_code || lead?.external_admission_code || '—'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kết quả hiện hành:</span>
              <strong className="text-emerald-700">{activeRecon?.reconciliation_status || lead?.reconciliation_status}</strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 block">
              Lý do hủy đối chiếu bắt buộc: <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Nhập lý do chi tiết hủy kết quả đối chiếu (ví dụ: ghép nhầm hồ sơ thí sinh, phát hiện sai mã EGOV)..."
              maxLength={2000}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang hủy...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xác nhận hủy đối chiếu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
