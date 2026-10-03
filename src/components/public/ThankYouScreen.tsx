import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, ExternalLink, X, AlertCircle, Copy, Check } from 'lucide-react';

interface ThankYouScreenProps {
  appointmentCode?: string;
  message?: string;
  courseTitle?: string | null;
  officialRegistrationUrl?: string | null;
  affiliateCode?: string | null;
  affiliateName?: string | null;
  onBackToCourses: () => void;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  message,
  courseTitle,
  officialRegistrationUrl,
  affiliateCode,
  affiliateName,
  onBackToCourses,
}) => {
  const [copied, setCopied] = useState(false);
  const cleanTitle = courseTitle || 'khóa học';
  const hasOfficialUrl = officialRegistrationUrl && officialRegistrationUrl.trim() !== '';
  const hasAffiliateInfo = affiliateCode && affiliateCode.trim() !== '' && affiliateName && affiliateName.trim() !== '';
  const copyText = hasAffiliateInfo ? `${affiliateCode} - ${affiliateName}` : '';

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 max-w-xl mx-auto text-left space-y-5 animate-fade-in">
      {/* Header icon & Title */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-emerald-50">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Tiếp nhận thành công
          </span>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Đã tiếp nhận đăng ký học
          </h3>
        </div>
      </div>

      {/* Main message (Đã xóa dòng message chung từ API theo yêu cầu) */}
      <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900">
          Cảm ơn bạn đã đăng ký {cleanTitle}. Nhà trường đã ghi nhận thông tin đăng ký của bạn.
        </p>
      </div>

      {/* Official Registration URL Section (if available) */}
      {hasOfficialUrl ? (
        <div className="p-4 sm:p-5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-4">
          <p className="text-xs text-blue-950 leading-relaxed font-medium">
            Để hoàn tất quá trình đăng ký học tại Trường Saigontourist, bạn vui lòng hoàn tất form hồ sơ đăng ký học theo quy định của trường trong link sau:
          </p>

          {/* Hướng dẫn người giới thiệu & Ô chỉ đọc (Yêu cầu 2) */}
          {hasAffiliateInfo && (
            <div className="space-y-2 pt-1 border-t border-blue-200/60">
              <p className="text-xs text-slate-700 leading-relaxed">
                Khi điền hồ sơ trên cổng tuyển sinh, tại mục <strong className="text-blue-950">“NGƯỜI GIỚI THIỆU”</strong> → ô <strong className="text-blue-950">“Họ và tên”</strong>, bạn vui lòng nhập mã CTV kèm họ và tên cộng tác viên theo nội dung dưới đây:
              </p>
              <div className="flex items-center justify-between gap-2 p-3 bg-white border border-blue-300 rounded-xl shadow-2xs">
                <span className="font-mono font-bold text-xs sm:text-sm text-blue-950 break-words select-all">
                  {copyText}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg transition-colors shrink-0 shadow-xs active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="pt-2">
            <a
              href={officialRegistrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>Hoàn tất hồ sơ đăng ký học</span>
              <ExternalLink className="w-4 h-4 text-slate-900" />
            </a>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed space-y-1">
            <p className="font-bold text-amber-950">Link hoàn tất hồ sơ đang được cập nhật</p>
            <p className="text-amber-900/90">Nhà trường sẽ liên hệ hướng dẫn bạn trong thời gian sớm nhất.</p>
          </div>
        </div>
      )}

      {/* Disclaimer note */}
      <div className="p-3 bg-slate-100/80 rounded-xl text-[11px] text-slate-600 leading-relaxed">
        <span className="font-semibold text-slate-800">Lưu ý: </span>
        Việc gửi thông tin tại đây chưa thay thế hồ sơ đăng ký chính thức trên cổng tuyển sinh của Nhà trường.
      </div>

      {/* PII Protection note */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Thông tin cá nhân được bảo mật tuyệt đối theo Nghị định 13/2023/NĐ-CP.</span>
      </div>

      {/* Action buttons */}
      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onBackToCourses}
          className="w-full py-3 px-6 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
        >
          <X className="w-4 h-4 text-amber-400" />
          <span>Đóng cửa sổ</span>
        </button>
      </div>
    </div>
  );
};
