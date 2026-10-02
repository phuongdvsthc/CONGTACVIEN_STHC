import React, { useState } from 'react';
import { Course } from '../../types';
import { api } from '../../services/api';
import { CheckCircle2, ShieldCheck, AlertCircle, Send, X } from 'lucide-react';

interface LeadConsultationFormProps {
  courses: Course[];
  selectedCourseId?: string;
  refCode?: string | null;
  onSuccess: (result: { appointment_code?: string; message: string }) => void;
  onCancel?: () => void;
}

export const LeadConsultationForm: React.FC<LeadConsultationFormProps> = ({
  courses,
  selectedCourseId,
  refCode,
  onSuccess,
  onCancel,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const [courseId, setCourseId] = useState(selectedCourseId || (courses[0]?.id || ''));
  const [preferredContactTime, setPreferredContactTime] = useState('Buổi sáng (08h - 11h30)');
  const [customerNote, setCustomerNote] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ và tên và Số điện thoại liên hệ.');
      return;
    }

    if (!consentAccepted) {
      setErrorMessage('Bạn cần tích chọn đồng ý cho phép Nhà trường liên hệ tư vấn tuyển sinh.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitLead({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        province,
        course_id: courseId || undefined,
        preferred_contact_time: preferredContactTime,
        customer_note: customerNote.trim() || undefined,
        consent_accepted: consentAccepted,
        ref_code: refCode || undefined,
        utm_source: 'web_portal',
        utm_medium: refCode ? 'affiliate_link' : 'direct',
        utm_campaign: 'tuyensinh_2026',
      });

      if (res.success) {
        onSuccess({
          appointment_code: res.appointment_code,
          message: res.message,
        });
      } else {
        setErrorMessage(res.error || 'Có lỗi xảy ra khi gửi đăng ký. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 max-w-xl mx-auto">
      {/* Form Header */}
      <div className="flex items-start justify-between pb-5 border-b border-slate-100">
        <div>
          <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Tuyển sinh năm học 2026
          </span>
          <h3 className="mt-2 text-xl font-bold text-slate-900 tracking-tight">
            Đăng Ký Tư Vấn & Xét Tuyển Học Nghề
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Không thi tuyển - Xét tuyển học bạ THCS / THPT - Nhập học ngay
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {refCode && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Đăng ký qua liên kết của Cộng tác viên:</span>
          </div>
          <span className="font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
            {refCode}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
        {/* Họ tên */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Họ và tên người học <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ví dụ: Lê Hoàng Long"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm"
          />
        </div>

        {/* Số điện thoại & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Số điện thoại liên hệ <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ví dụ: 0908123456"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Email (không bắt buộc)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Tỉnh thành & Ngành học quan tâm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Tỉnh / Thành phố hiện tại
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm bg-white"
            >
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Bình Dương">Bình Dương</option>
              <option value="Đồng Nai">Đồng Nai</option>
              <option value="Long An">Long An</option>
              <option value="Bà Rịa - Vũng Tàu">Bà Rịa - Vũng Tàu</option>
              <option value="Tây Ninh">Tây Ninh</option>
              <option value="Tiền Giang">Tiền Giang</option>
              <option value="Cần Thơ">Cần Thơ</option>
              <option value="Tỉnh thành khác">Tỉnh thành khác</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Ngành học quan tâm
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.career_group ? `[${c.career_group}]` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Khung giờ tiện liên hệ */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Khung giờ tiện nghe điện thoại tư vấn
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              'Buổi sáng (08h - 11h30)',
              'Buổi chiều (14h - 17h)',
              'Buổi tối (18h - 20h)',
            ].map((slot) => (
              <button
                type="button"
                key={slot}
                onClick={() => setPreferredContactTime(slot)}
                className={`py-2 px-2 text-center rounded-lg border text-[11px] font-medium transition-colors ${
                  preferredContactTime === slot
                    ? 'border-blue-900 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Ghi chú thêm */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Ghi chú hoặc câu hỏi về khóa học (tùy chọn)
          </label>
          <textarea
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Ví dụ: Muốn tìm hiểu về ca học tối, cơ hội thực tập có lương..."
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm"
          />
        </div>

        {/* Checkbox Chấp thuận Nghị định 13/2023/NĐ-CP */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
            />
            <span className="text-[11px] text-slate-600 leading-relaxed select-none">
              Tôi đồng ý để Trường Trung cấp Du lịch & Khách sạn Saigontourist liên hệ tư vấn tuyển sinh và xử lý thông tin theo Chính sách bảo vệ dữ liệu cá nhân của Nhà trường (Nghị định 13/2023/NĐ-CP).
            </span>
          </label>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-6">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Form cam kết không thu thập số CCCD của thí sinh ở giai đoạn tư vấn ban đầu.</span>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            {loading ? (
              <span>Đang gửi thông tin...</span>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                <span>Gửi Đăng Ký Tư Vấn Ngay</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
