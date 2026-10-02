import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  referralUrl: string;
  affiliateCode: string;
  courseCode?: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  title,
  referralUrl,
  affiliateCode,
  courseCode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && referralUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        referralUrl,
        {
          width: 280,
          margin: 3,
          color: {
            dark: '#0F2C59', // Brand Navy
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [isOpen, referralUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Không thể sao chép tự động:', err);
    });
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const cleanAff = (affiliateCode || 'CTV').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanCourse = (courseCode || 'COURSE').replace(/[^a-zA-Z0-9_-]/g, '');
    const link = document.createElement('a');
    link.download = `QR-${cleanCourse}-${cleanAff}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-4.5 sm:p-5 flex items-center justify-center">
          <h3 className="font-bold text-sm tracking-wide text-center uppercase">
            MÃ QR TIẾP THỊ ĐỊNH DANH
          </h3>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute right-4 p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              Mã CTV: {affiliateCode}
            </span>
            <h4 className="mt-2 text-base font-semibold text-slate-900 leading-snug">
              {title}
            </h4>
          </div>

          {/* QR Canvas Display */}
          <div className="inline-block p-4 bg-white border-2 border-slate-100 rounded-xl shadow-inner">
            <canvas ref={canvasRef} className="mx-auto" />
            <p className="mt-2 text-[11px] text-slate-500 font-medium">
              Quét camera để truy cập form tuyển sinh
            </p>
          </div>

          {/* Referral URL with Copy Button */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs">
            <span className="truncate flex-1 text-slate-600 font-mono select-all">
              {referralUrl}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-md flex items-center gap-1 font-medium transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Chép link'}</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Tải ảnh QR về máy
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
