import React, { useState } from 'react';
import { Course } from '../../types';
import { api } from '../../services/api';
import { CheckCircle2, ShieldCheck, AlertCircle, Send, X } from 'lucide-react';

interface LeadConsultationFormProps {
  courses: Course[];
  selectedCourseId?: string;
  refCode?: string | null;
  lockCourse?: boolean;
  title?: string;
  subtitle?: string | null;
  badge?: string | null;
  submitButtonText?: string;
  defaultConsent?: boolean;
  onSuccess: (result: {
    appointment_code?: string;
    message: string;
    course_title?: string | null;
    official_registration_url?: string | null;
    affiliate_code?: string | null;
    affiliate_name?: string | null;
  }) => void;
  onCancel?: () => void;
}

export const LeadConsultationForm: React.FC<LeadConsultationFormProps> = ({
  courses,
  selectedCourseId,
  refCode,
  lockCourse = false,
  title,
  subtitle,
  badge,
  submitButtonText,
  defaultConsent = false,
  onSuccess,
  onCancel,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState(
    selectedCourseId || courses[0]?.id || courses[0]?.slug || courses[0]?.code || ''
  );
  const [preferredContactTime, setPreferredContactTime] = useState('Buổi sáng (08h - 11h30)');
  const [customerNote, setCustomerNote] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(defaultConsent);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (selectedCourseId) {
      setCourseId(selectedCourseId);
    } else if (!courseId && courses.length > 0) {
      setCourseId(courses[0].id || courses[0].slug || courses[0].code || '');
    }
  }, [selectedCourseId, courses]);

  const selectedCourseObj = courses.find(
    (c) => c.id === courseId || c.slug === courseId || c.code === courseId
  ) || courses.find((c) => c.id === selectedCourseId) || courses[0];

  const effectiveRefCode = refCode || (typeof window !== 'undefined' ? localStorage.getItem('sthc_affiliate_ref') : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ và tên và Số điện thoại liên hệ.');
      return;
    }

    // Kiểm tra Email bắt buộc và đúng định dạng
    const emailClean = email.trim();
    if (!emailClean) {
      setErrorMessage('Vui lòng nhập Địa chỉ Email liên hệ.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setErrorMessage('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    const effectiveCourseId = courseId || selectedCourseId || courses[0]?.id || courses[0]?.slug || courses[0]?.code;
    if (!effectiveCourseId) {
      setErrorMessage('Vui lòng chọn khóa học cần đăng ký tư vấn.');
      return;
    }

    if (!consentAccepted) {
      setErrorMessage('Bạn phải tích chọn đồng ý điều kiện để gửi đăng ký.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.submitLead({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: emailClean,
        course_id: effectiveCourseId,
        customer_note: customerNote.trim() || undefined,
        consent_accepted: consentAccepted,
        ref_code: effectiveRefCode || undefined,
        utm_source: 'web_portal',
        utm_medium: effectiveRefCode ? 'affiliate_link' : 'direct',
        utm_campaign: 'tuyensinh_2026',
      });

      if (res.success) {
        onSuccess({
          appointment_code: res.appointment_code,
          message: res.message,
          course_title: res.course_title,
          official_registration_url: res.official_registration_url,
          affiliate_code: res.affiliate_code,
          affiliate_name: res.affiliate_name,
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
          {badge !== null && (
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {badge || 'Tuyển sinh năm học 2026'}
            </span>
          )}
          <h3 className={`font-bold text-slate-900 tracking-tight ${badge !== null ? 'mt-2 text-xl' : 'text-xl'}`}>
            {title || 'Đăng Ký Tư Vấn & Xét Tuyển Học Nghề'}
          </h3>
          {subtitle !== null && (
            <p className="text-xs text-slate-500 mt-1">
              {subtitle || 'Không thi tuyển - Xét tuyển học bạ THCS / THPT - Nhập học ngay'}
            </p>
          )}
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Đóng cửa sổ"
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

        {/* Số điện thoại & Email (Email bắt buộc) */}
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
              Địa chỉ Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Khóa học đăng ký (Thay vì Tỉnh thành và Ngành học) */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Khóa học đăng ký
          </label>
          {lockCourse ? (
            <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 flex items-center justify-between">
              <span className="truncate">{selectedCourseObj?.title || 'Khóa học đã chọn'}</span>
              <span className="text-[11px] font-normal text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded shrink-0 ml-2">
                Cố định theo khóa
              </span>
            </div>
          ) : (
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
          )}
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

        {/* Checkbox điều kiện chuẩn (Yêu cầu 5) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900 shrink-0"
            />
            <span className="text-[11px] text-slate-700 leading-relaxed select-none font-medium">
              Tôi cam đoan thông tin trên là đúng. Đồng ý để Nhà trường liên hệ lại tư vấn
            </span>
          </label>
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
                <span>{submitButtonText || 'Gửi Đăng Ký Tư Vấn Ngay'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
