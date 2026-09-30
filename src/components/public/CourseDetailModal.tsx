import React from 'react';
import { Course } from '../../types';
import { X, Clock, Award, DollarSign, Building, Check, ArrowRight } from 'lucide-react';

interface CourseDetailModalProps {
  course: Course | null;
  onClose: () => void;
  onSelectRegister: (courseId: string) => void;
  refCode?: string | null;
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  onSelectRegister,
  refCode,
}) => {
  if (!course) return null;

  const formattedFee = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(course.tuition_fee_estimate || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
            {course.department}
          </span>
          <h3 className="mt-2 text-xl font-bold text-white tracking-tight">
            {course.title}
          </h3>
          <p className="text-xs text-blue-200 mt-1">
            Mã ngành tuyển sinh: <strong className="font-mono text-white">{course.code}</strong>
          </p>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Quick info boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Award className="w-3.5 h-3.5 text-blue-900" />
                <span className="font-medium">Hệ đào tạo</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{course.degree_level}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-900" />
                <span className="font-medium">Thời gian học</span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{course.duration_text}</p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
              <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-medium">Học phí dự kiến</span>
              </div>
              <p className="font-bold text-amber-800 text-xs tabular-nums">{formattedFee}</p>
            </div>
          </div>

          {/* Course Summary */}
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Mục tiêu đào tạo</h4>
            <p className="text-slate-600 leading-relaxed text-xs">
              {course.summary}
            </p>
          </div>

          {/* HTML Description */}
          {course.description_html && (
            <div
              className="prose prose-sm max-w-none text-slate-600 leading-relaxed text-xs"
              dangerouslySetInnerHTML={{ __html: course.description_html }}
            />
          )}

          {/* Saigontourist Group Benefits */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2.5">
            <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-900" />
              Đặc quyền sinh viên Trường Saigontourist (STHC):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Thực tập hưởng lương tại hệ thống khách sạn 5 sao thuộc tập đoàn Saigontourist</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cam kết 100% sinh viên tốt nghiệp được giới thiệu việc làm đúng chuyên môn</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cơ sở vật chất bếp & buồng phòng đạt chuẩn kiểm định quốc tế</span>
              </div>
              <div className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Liên thông trực tiếp lên Cao đẳng & Đại học khối ngành Du lịch</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Đóng
          </button>

          <button
            onClick={() => {
              onClose();
              onSelectRegister(course.id);
            }}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <span>Đăng ký tư vấn ngành này</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
