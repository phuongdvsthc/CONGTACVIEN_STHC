import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowLeft, PhoneCall, Calendar } from 'lucide-react';

interface ThankYouScreenProps {
  appointmentCode?: string;
  message?: string;
  onBackToCourses: () => void;
}

export const ThankYouScreen: React.FC<ThankYouScreenProps> = ({
  appointmentCode,
  message,
  onBackToCourses,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-xl mx-auto text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
          Đăng Ký Tư Vấn Thành Công!
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          {message || 'Yêu cầu tư vấn của bạn đã được chuyển đến Phòng Tuyển sinh Trường Trung cấp Du lịch & Khách sạn Saigontourist.'}
        </p>
      </div>

      {appointmentCode && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Mã tiếp nhận hồ sơ tư vấn
          </span>
          <span className="text-lg font-mono font-bold text-blue-900 mt-1 block">
            {appointmentCode}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Vui lòng lưu lại mã này khi liên hệ hotline để được hỗ trợ nhanh nhất
          </span>
        </div>
      )}

      {/* Information Checklist */}
      <div className="text-left bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2 text-xs text-blue-950">
        <div className="font-semibold flex items-center gap-1.5 text-blue-900">
          <Calendar className="w-4 h-4 text-blue-800" />
          <span>Quy trình tiếp theo:</span>
        </div>
        <p className="pl-5 text-slate-600 leading-relaxed">
          1. Cán bộ tư vấn tuyển sinh sẽ gọi điện thoại theo khung giờ bạn đã lựa chọn (trong vòng 24 giờ làm việc).
        </p>
        <p className="pl-5 text-slate-600 leading-relaxed">
          2. Hướng dẫn chuẩn bị hồ sơ xét tuyển học bạ và giải đáp chi tiết chương trình thực tập tại các khách sạn 5 sao.
        </p>
      </div>

      {/* PII Protection note */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Thông tin cá nhân của bạn được bảo mật tuyệt đối theo quy định của Nhà trường.</span>
      </div>

      {/* Action buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onBackToCourses}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-medium text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Xem tiếp các ngành đào tạo</span>
        </button>

        <a
          href="tel:02838442238"
          className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <PhoneCall className="w-4 h-4 text-slate-600" />
          <span>Hotline Tuyển sinh: (028) 3844 2238</span>
        </a>
      </div>
    </div>
  );
};
