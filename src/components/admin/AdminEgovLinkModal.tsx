import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { X, FileCheck2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AdminEgovLinkModalProps {
  lead: any;
  activeLink: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminEgovLinkModal: React.FC<AdminEgovLinkModalProps> = ({
  lead,
  activeLink,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(activeLink && activeLink.external_admission_code);
  const [egovCode, setEgovCode] = useState<string>(activeLink?.external_admission_code || '');
  const [reason, setReason] = useState<string>('');
  
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEgovCode(activeLink?.external_admission_code || '');
      setReason('');
      setErrorMsg(null);
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [isOpen, activeLink]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = egovCode.trim();
    if (!cleanCode) {
      setErrorMsg('Mã hồ sơ EGOV là bắt buộc.');
      return;
    }

    if (!/^[0-9]{7}$/.test(cleanCode)) {
      setErrorMsg(`Mã hồ sơ EGOV không hợp lệ: "${cleanCode}". Phải gồm đúng 7 chữ số (ví dụ: 0012345).`);
      return;
    }

    if (isEditing) {
      if (cleanCode === activeLink.external_admission_code && !reason.trim()) {
        setErrorMsg('Mã EGOV không thay đổi. Vui lòng nhập mã mới hoặc hủy bỏ.');
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('Bắt buộc phải nhập lý do khi sửa đổi mã EGOV đã liên kết.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        external_admission_code: cleanCode,
        client_updated_at: lead?.updated_at,
      };

      if (isEditing) {
        payload.reason = reason.trim();
        payload.target_egov_link_id = activeLink.id;
      }

      const res = await api.linkLeadEgov(lead.id, payload, idempotencyKeyRef.current);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        if (res.status === 409) {
          setErrorMsg(res.error || 'Xung đột phiên bản hoặc mã EGOV đã tồn tại trên hệ thống.');
        } else {
          setErrorMsg(res.error || 'Không thể liên kết mã EGOV.');
        }
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
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold">
              {isEditing ? 'Sửa mã hồ sơ EGOV' : 'Cập nhật / Liên kết mã hồ sơ EGOV'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INSTRUCTION */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-blue-900 text-xs flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <strong>Lưu ý:</strong> Cập nhật mã sau khi kiểm tra đúng hồ sơ trên EGOV. Thao tác này chưa xác nhận nhập học và chưa ghi nhận thưởng CTV.
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
            {isEditing && (
              <div className="flex justify-between">
                <span className="text-slate-500">Mã EGOV hiện tại:</span>
                <strong className="font-mono text-blue-900">{activeLink?.external_admission_code}</strong>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 block flex items-center justify-between">
              <span>Mã hồ sơ EGOV (Đúng 7 chữ số): <span className="text-rose-600">*</span></span>
              <span className="font-mono text-slate-400 text-[11px]">Định dạng: ^[0-9]{7}$</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              value={egovCode}
              onChange={(e) => setEgovCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Ví dụ: 0012345"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              required
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 block">
                Lý do sửa đổi mã EGOV bắt buộc: <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do thay đổi mã EGOV (ví dụ: nhập sai số, cập nhật lại theo hồ sơ mới)..."
                maxLength={2000}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                required
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác nhận lưu mã EGOV</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
