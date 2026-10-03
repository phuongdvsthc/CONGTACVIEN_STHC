import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { LeadConsultationForm } from './LeadConsultationForm';
import { ThankYouScreen } from './ThankYouScreen';
import { CourseDetailModal } from './CourseDetailModal';
import { api } from '../../services/api';
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

interface LayoutBlock {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_LAYOUT_BLOCKS: LayoutBlock[] = [
  { id: 'hero', name: 'Khối Giới thiệu & Banner (Hero Section)', enabled: true, order: 0 },
  { id: 'courses_search_filter', name: 'Khối Tìm kiếm & Bộ lọc ngành', enabled: true, order: 1 },
  { id: 'courses_grid', name: 'Khối Danh sách Khóa học', enabled: true, order: 2 },
  { id: 'consultation_form', name: 'Khối Đăng ký Tư vấn Trực tuyến', enabled: true, order: 3 },
];

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

  const [homeConfig, setHomeConfig] = useState<{
    hero_background_url?: string | null;
    hero_background_alt?: string | null;
    hero_illustration_url?: string | null;
    hero_illustration_alt?: string | null;
    layout_blocks?: LayoutBlock[];
  }>({});

  useEffect(() => {
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data) {
        setHomeConfig(res.data);
      }
    }).catch(() => {});
  }, []);

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

  const activeBlocks = (homeConfig.layout_blocks && Array.isArray(homeConfig.layout_blocks) && homeConfig.layout_blocks.length > 0)
    ? [...homeConfig.layout_blocks].sort((a, b) => a.order - b.order).filter(b => b.enabled !== false)
    : DEFAULT_LAYOUT_BLOCKS;

  return (
    <div className="space-y-16 pb-20">
      {activeBlocks.map((block) => {
        if (block.id === 'hero') {
          return (
            <section key="hero" className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
              {homeConfig.hero_background_url && (
                <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
                  <img
                    src={homeConfig.hero_background_url}
                    alt={homeConfig.hero_background_alt || 'Hình nền trang chủ'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

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

                  {/* Right Col: Hero Illustration or Visual Card */}
                  <div className="lg:col-span-5">
                    {homeConfig.hero_illustration_url ? (
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-blue-700/30 bg-slate-900/80 p-3">
                        <img
                          src={homeConfig.hero_illustration_url}
                          alt={homeConfig.hero_illustration_alt || 'Hình minh họa tuyển sinh'}
                          className="w-full h-auto object-contain max-h-[440px] mx-auto rounded-xl"
                        />
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (block.id === 'courses_search_filter') {
          return (
            <section key="courses_search_filter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="text-center space-y-3 max-w-3xl mx-auto">
                <span className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                  Danh Mục Đào Tạo 2026
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Khám Phá Các Khóa Học Tuyển Sinh Hàng Đầu
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Lựa chọn ngành nghề phù hợp với sở thích và định hướng tương lai của bạn. Đăng ký ngay để nhận tư vấn chi tiết từ Ban Tuyển sinh.
                </p>
              </div>

              {/* Search & Department Tabs */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm khóa học theo tên hoặc mã ngành..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-colors"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${selectedDepartment === dept.id ? 'bg-blue-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                      {dept.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (block.id === 'courses_grid') {
          return (
            <section key="courses_grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Course Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600'}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 bg-blue-900/90 backdrop-blur-xs text-white font-bold text-[10px] rounded-lg shadow-xs">
                          {course.degree_level}
                        </span>
                        {course.career_group && (
                          <span className="px-2.5 py-1 bg-amber-400/90 backdrop-blur-xs text-slate-950 font-bold text-[10px] rounded-lg shadow-xs">
                            {course.career_group}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono font-semibold text-slate-400">
                          Mã: {course.code}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {course.summary}
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-900" />
                            <span>{course.duration_text}</span>
                          </span>
                          <span className="font-semibold text-slate-900 font-mono">
                            {course.tuition_fee_estimate || 'Liên hệ học phí'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onViewCourseDetail ? onViewCourseDetail(course) : setSelectedCourseForDetail(course)}
                            className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors text-center"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollToForm(course.id)}
                            className="w-full py-2.5 px-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors shadow-xs text-center flex items-center justify-center gap-1"
                          >
                            <span>Đăng ký</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (block.id === 'consultation_form') {
          return (
            <section key="consultation_form" id="consultation-form-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
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
          );
        }

        return null;
      })}

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
