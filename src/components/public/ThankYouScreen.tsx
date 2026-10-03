import React from 'react';
import { CheckCircle2, ShieldCheck, ExternalLink, X, AlertCircle } from 'lucide-react';

interface ThankYouScreenProps {
  appointmentCode?: string;
  message?: string;
  courseTitle?: string | null;
  officialRegistrationUrl?: string | null;
  onBackToCourses: () => void;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  appointmentCode,
  message,
  courseTitle,
  officialRegistrationUrl,
  onBackToCourses,
}) => {
  const cleanTitle = courseTitle || 'khóa học';
  const hasOfficialUrl = officialRegistrationUrl && officialRegistrationUrl.trim() !== '';

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

      {/* Main message */}
      <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <p className="font-medium text-slate-900">
          Cảm ơn bạn đã đăng ký {cleanTitle}. Nhà trường đã ghi nhận thông tin đăng ký của bạn.
        </p>
        <p className="text-slate-600">
          {message || 'Yêu cầu của bạn đã được chuyển đến Phòng Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist.'}
        </p>
      </div>

      {appointmentCode && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-500 block text-[11px]">Mã tiếp nhận hồ sơ</span>
            <span className="font-mono font-bold text-blue-900 text-sm">{appointmentCode}</span>
          </div>
          <span className="text-[11px] text-slate-400 italic">Vui lòng lưu lại mã khi cần hỗ trợ</span>
        </div>
      )}

      {/* Official Registration URL Section (if available) */}
      {hasOfficialUrl ? (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
          <p className="text-xs text-blue-950 leading-relaxed font-medium">
            Để hoàn tất quá trình đăng ký học tại Trường Saigontourist, bạn vui lòng hoàn tất form hồ sơ đăng ký học theo quy định của trường trong link sau:
          </p>
          <div className="pt-1">
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
