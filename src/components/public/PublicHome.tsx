import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { LeadConsultationForm } from './LeadConsultationForm';
import { ThankYouScreen } from './ThankYouScreen';
import { CourseDetailModal } from './CourseDetailModal';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  Award,
  Clock,
  DollarSign,
  ChevronRight,
  Search,
  Briefcase,
} from 'lucide-react';

interface PublicHomeProps {
  courses: Course[];
  refCode?: string | null;
  onOpenRegisterAffiliate: () => void;
  onOpenLoginAffiliate?: () => void;
  onViewCourseDetail?: (course: Course) => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  courses,
  refCode,
  onOpenRegisterAffiliate,
  onOpenLoginAffiliate,
  onViewCourseDetail,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<Course | null>(null);
  const [selectedCourseForForm, setSelectedCourseForForm] = useState<string | undefined>(undefined);
  const [formSubmittedResult, setFormSubmittedResult] = useState<{
    appointment_code?: string;
    message: string;
  } | null>(null);

  const departments = [
    { id: 'ALL', label: 'Tất cả các ngành' },
    { id: 'Khoa Ẩm thực & Bếp', label: 'Bếp & Ẩm thực' },
    { id: 'Khoa Quản trị Khách sạn', label: 'Quản trị Khách sạn' },
    { id: 'Khoa Nhà hàng & Ẩm thực (F&B)', label: 'Nhà hàng & F&B' },
    { id: 'Khoa Lữ hành & Hướng dẫn', label: 'Lữ hành & Hướng dẫn' },
  ];

  const filteredCourses = courses.filter((c) => {
    const matchDept = selectedDepartment === 'ALL' || c.department === selectedDepartment;
    const matchSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  const scrollToForm = (courseId?: string) => {
    if (courseId) setSelectedCourseForForm(courseId);
    const formElement = document.getElementById('consultation-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Hero Pitch */}
            <div className="lg:col-span-7 space-y-6">
              {refCode ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bạn đang truy cập qua liên kết giới thiệu của CTV: <strong>{refCode}</strong></span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-300 text-xs font-medium tracking-wide">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tuyển sinh Trung cấp chính quy & Sơ cấp nghề 2026</span>
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
                Trường Du Lịch Saigontourist
                <span className="block text-amber-400 mt-1 font-serif font-normal italic text-2xl sm:text-3xl lg:text-4xl">
                  Khởi Đầu Nghề Nghiệp Đẳng Cấp 5 Sao
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Trực thuộc Tổng Công ty Du lịch Sài Gòn (Saigontourist Group). Chương trình đào tạo chuẩn quốc tế, 70% thời lượng thực hành thực tế, cam kết 100% sinh viên được bố trí việc làm tại các khách sạn, khu nghỉ dưỡng cao cấp hàng đầu Việt Nam.
              </p>

              {/* Stats proof */}
              <div className="pt-2 grid grid-cols-3 gap-4 border-t border-slate-800 text-left">
                <div>
                  <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                    35+ Năm
                  </span>
                  <span className="text-xs text-slate-400">Tiên phong đào tạo</span>
                </div>
                <div>
                  <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                    100%
                  </span>
                  <span className="text-xs text-slate-400">Cam kết việc làm</span>
                </div>
                <div>
                  <span className="text-2xl font-bold font-mono text-amber-400 block tabular-nums">
                    500.000đ
                  </span>
                  <span className="text-xs text-slate-400">Thù lao thưởng CTV</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => scrollToForm()}
                  className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>Đăng ký nhận tư vấn ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onOpenRegisterAffiliate}
                  className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 transition-all flex items-center gap-2"
                >
                  <span>Gia nhập đội ngũ CTV Tuyển sinh</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Right Col: Visual Card Preview */}
            <div className="lg:col-span-5">
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-900/60 to-slate-900/80 border border-blue-700/30 backdrop-blur-md shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-blue-200">
                  <span className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Saigontourist Hospitality Group
                  </span>
                  <span>TP. Hồ Chí Minh</span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-base font-bold text-white leading-snug">
                    Hệ sinh thái thực tập & việc làm đẳng cấp
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Học viên được thực hành và làm việc trực tiếp tại chuỗi khách sạn 5 sao danh tiếng: Caravelle Hotel, Rex Hotel Saigon, Hotel Majestic Saigon, Grand Hotel Saigon, Continental Saigon...
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Hình thức xét tuyển:</span>
                    <strong className="text-emerald-400">Xét học bạ (Không thi tuyển)</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Thời gian nhận hồ sơ:</span>
                    <strong className="text-white">Đợt 1 / 2026</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Học phí:</span>
                    <strong className="text-amber-400">Hỗ trợ trả góp 0%</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Văn bằng Trung cấp Quốc gia - Liên thông Đại học chính quy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COURSE CATALOG SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Chương trình đào tạo chính quy 2026
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Danh Mục Các Ngành Tuyển Sinh
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Được thiết kế bám sát nhu cầu thực tế của các tập đoàn khách sạn và nhà hàng 5 sao
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm ngành học..."
              className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>
        </div>

        {/* Interactive Segmented Filter Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedDepartment === dept.id
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const formattedFee = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(course.tuition_fee_estimate || 0);

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all group"
              >
                <div className="space-y-4">
                  {/* Clean unboxed metadata per constitution */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-900">{course.department}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-400">{course.code}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors leading-snug">
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {course.summary}
                  </p>

                  {/* Metadata spec row */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>{course.degree_level || 'Chưa cập nhật'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>{course.duration_text || 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
                      <Briefcase className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                      <span className="text-slate-500 font-medium">Nhóm nghề:</span>
                      <span className={course.career_group ? 'font-semibold text-slate-800' : 'text-slate-400 italic'}>
                        {course.career_group || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Fee & Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Học phí dự kiến
                    </span>
                    <span className="font-bold text-xs text-amber-800 font-mono tabular-nums">
                      {formattedFee}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (onViewCourseDetail) {
                          onViewCourseDetail(course);
                        } else {
                          setSelectedCourseForDetail(course);
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-900 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Chi tiết
                    </button>
                    <button
                      onClick={() => scrollToForm(course.id)}
                      className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1 active:scale-95"
                    >
                      <span>Đăng ký</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AFFILIATE PROGRAM BENEFIT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl text-white p-8 sm:p-12 relative overflow-hidden shadow-xl">
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-semibold text-amber-400 bg-amber-400/20 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              Chính sách Đại sứ Tuyển sinh 2026
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Nhận Thù Lao 500.000 VNĐ / Học Viên Hợp Lệ
            </h3>
            <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
              Bạn là cựu sinh viên, phụ huynh hoặc cán bộ yêu mến ngành du lịch? Hãy trở thành Cộng tác viên tuyển sinh chính thức của Trường Saigontourist: nhận mã QR tiếp thị riêng, theo dõi kết quả minh bạch và nhận thù lao đối soát định kỳ.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenRegisterAffiliate}
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>Đăng ký CTV ngay hôm nay</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {onOpenLoginAffiliate && (
                <button
                  onClick={onOpenLoginAffiliate}
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2"
                >
                  <span>Đã có tài khoản? Đăng nhập cổng CTV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONSULTATION REGISTRATION FORM SECTION (E1) */}
      <section id="consultation-form-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        {formSubmittedResult ? (
          <ThankYouScreen
            appointmentCode={formSubmittedResult.appointment_code}
            message={formSubmittedResult.message}
            onBackToCourses={() => {
              setFormSubmittedResult(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <LeadConsultationForm
            courses={courses}
            selectedCourseId={selectedCourseForForm}
            refCode={refCode}
            onSuccess={(result) => setFormSubmittedResult(result)}
          />
        )}
      </section>

      {/* DETAIL MODAL */}
      {selectedCourseForDetail && (
        <CourseDetailModal
          course={selectedCourseForDetail}
          onClose={() => setSelectedCourseForDetail(null)}
          onSelectRegister={(cId) => scrollToForm(cId)}
          refCode={refCode}
        />
      )}
    </div>
  );
};
