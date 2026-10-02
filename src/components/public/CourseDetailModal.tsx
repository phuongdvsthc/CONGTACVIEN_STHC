import React, { useState } from 'react';
import { Course } from '../../types';
import { X, Clock, Award, DollarSign, Building, Check, ArrowRight, Monitor, Smartphone, Image, AlertCircle, Briefcase } from 'lucide-react';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

export interface CourseDetailModalProps {
  course: Course | null;
  onClose: () => void;
  onSelectRegister?: (courseId: string) => void;
  refCode?: string | null;
  isPreview?: boolean;
  isViewOnly?: boolean;
  isDirty?: boolean;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  onSelectRegister,
  refCode,
  isPreview = false,
  isViewOnly = false,
  isDirty = false,
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  if (!course) return null;

  const formattedFee =
    course.tuition_fee_estimate !== null &&
    course.tuition_fee_estimate !== undefined &&
    !isNaN(Number(course.tuition_fee_estimate))
      ? new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(Number(course.tuition_fee_estimate))
      : 'Liên hệ tư vấn / Thỏa thuận';

  const sanitizedDescription = sanitizeHtml(course.description_html);
  const showTopBar = isPreview || isViewOnly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className={`relative w-full transition-all duration-200 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col my-auto ${
          showTopBar && deviceMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
        }`}
      >
        {/* TOP STATUS BAR (Shown in Preview Mode or View-Only Mode) */}
        {showTopBar && (
          <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isViewOnly ? (
                <>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      course.status === 'DRAFT' || !course.is_active
                        ? 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                        : course.status === 'STOPPED' || course.accepts_referrals === false
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {course.status === 'DRAFT' || !course.is_active
                      ? 'Bản nháp – Chưa công khai'
                      : course.status === 'STOPPED' || course.accepts_referrals === false
                      ? 'Ngừng giới thiệu'
                      : 'Đang nhận giới thiệu'}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    (Xem khóa học – Dữ liệu đã lưu)
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isDirty
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {isDirty ? 'Bản xem trước – chưa lưu' : 'Bản xem trước'}
                  </span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    (Giao diện học viên xem qua link tuyển sinh)
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  deviceMode === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Xem trên màn hình máy tính"
              >
                <Monitor className="w-3 h-3" />
                <span className="hidden sm:inline">Máy tính</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  deviceMode === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Xem trên màn hình điện thoại"
              >
                <Smartphone className="w-3 h-3" />
                <span className="hidden sm:inline">Điện thoại</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Top Header with Thumbnail Banner */}
        <div className="relative bg-slate-900 text-white overflow-hidden shrink-0">
          {course.thumbnail_url ? (
            <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950">
              <img
                src={course.thumbnail_url}
                alt={course.title || 'Ảnh khóa học'}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
            </div>
          ) : isPreview ? (
            <div className="h-28 w-full bg-slate-900/90 flex flex-col items-center justify-center text-slate-500 border-b border-slate-800">
              <Image className="w-8 h-8 opacity-40 mb-1" />
              <span className="text-[11px]">Chưa có ảnh đại diện khóa học</span>
            </div>
          ) : (
            <div className="h-6 w-full bg-gradient-to-r from-blue-900 to-slate-900" />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/80 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-xs transition-colors z-10"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title & Course Code Header */}
          <div className="p-5 sm:p-6 relative">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold text-blue-200 bg-blue-900/50 border border-blue-700/50 px-2.5 py-0.5 rounded">
                {course.code || 'Chưa cập nhật'}
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-black text-white tracking-tight leading-snug break-words">
              {course.title || 'Chưa cập nhật'}
            </h3>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Cảnh báo Ngừng tiếp nhận đăng ký (Yêu cầu A2.4) */}
          {(course.accepts_referrals === false || course.status === 'STOPPED') && (
            <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-950">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-amber-950">Khóa học hiện ngừng nhận đăng ký</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {course.stop_reason
                    ? `Lý do: ${course.stop_reason}`
                    : 'Ngành học này tạm thời ngừng tiếp nhận hồ sơ đăng ký mới. Quý học viên vui lòng tham khảo các khóa học khác hoặc liên hệ Ban Tuyển sinh STHC.'}
                </p>
              </div>
            </div>
          )}

          {/* Quick info boxes */}
          <div className={`grid gap-3 ${deviceMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Award className="w-3.5 h-3.5 text-blue-900" />
                <span className="font-medium text-[11px]">Hệ đào tạo</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{course.degree_level || 'Chưa cập nhật'}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-900" />
                <span className="font-medium text-[11px]">Nhóm nghề</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">
                {course.career_group || 'Chưa cập nhật'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-900" />
                <span className="font-medium text-[11px]">Thời gian học</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{course.duration_text || 'Chưa cập nhật'}</p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
              <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium text-[11px]">Học phí</span>
              </div>
              <p className="font-bold text-amber-900 text-xs tabular-nums">{formattedFee}</p>
            </div>
          </div>

          {/* Course Summary */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider text-slate-500 text-left">
              Mô tả ngắn khóa học
            </h4>
            {course.summary ? (
              <p
                style={{ textAlign: 'justify' }}
                className="text-slate-700 leading-relaxed text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line text-justify"
              >
                {course.summary}
              </p>
            ) : (
              <p className="text-slate-400 italic text-xs text-left">Chưa nhập mô tả tóm tắt cho khóa học này.</p>
            )}
          </div>

          {/* HTML Description */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-1.5 uppercase tracking-wider text-slate-500">
              Thông tin giới thiệu chi tiết
            </h4>
            {sanitizedDescription ? (
              <div
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs p-3.5 bg-white border border-slate-200 rounded-xl whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
              />
            ) : (
              <p className="text-slate-400 italic text-xs">Chưa có thông tin giới thiệu chi tiết cho khóa học này.</p>
            )}
          </div>

          {/* Dynamic Benefits / Section Quyền lợi sinh viên (A2.3: Tùy biến theo từng khóa học, ẩn khi không có nội dung) */}
          {course.benefits_content && course.benefits_content.trim() !== '' && (
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
              <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-900 shrink-0" />
                <span>{course.benefits_title?.trim() || 'Đặc quyền sinh viên'}</span>
              </h4>
              <div
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.benefits_content) }}
              />
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {isPreview ? (
              <span className="text-amber-700 font-medium">
                * Bản xem trước: Nút đăng ký được vô hiệu hóa trên màn hình xem trước.
              </span>
            ) : isViewOnly ? (
              <span className="text-slate-600 font-medium">
                * Chế độ xem khóa học: Dữ liệu đã lưu từ hệ thống. Nút đăng ký được vô hiệu hóa.
              </span>
            ) : course.accepts_referrals === false || course.status === 'STOPPED' ? (
              <span className="text-rose-700 font-medium">
                * Khóa học hiện ngừng nhận đăng ký.
              </span>
            ) : (
              <span>Hotline tư vấn tuyển sinh: 0909 123 456</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              {isPreview ? 'Đóng xem trước' : 'Đóng'}
            </button>

            {isPreview || isViewOnly ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed shadow-none flex items-center gap-2"
                title="Nút đăng ký được vô hiệu hóa ở chế độ xem"
              >
                <span>Đăng ký</span>
              </button>
            ) : course.accepts_referrals === false || course.status === 'STOPPED' ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 bg-slate-200 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed shadow-none flex items-center gap-2"
                title="Khóa học hiện ngừng nhận đăng ký"
              >
                <span>Đăng ký</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSelectRegister) {
                    onSelectRegister(course.id);
                  }
                }}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Đăng ký</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
