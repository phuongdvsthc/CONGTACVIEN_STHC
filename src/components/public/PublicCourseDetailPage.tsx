import React, { useState, useEffect } from 'react';
import { Course } from '../../types';
import { api } from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { LeadConsultationForm } from './LeadConsultationForm';
import { ThankYouScreen } from './ThankYouScreen';
import {
  GraduationCap,
  PhoneCall,
  Clock,
  DollarSign,
  Award,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Home,
  BookOpen,
  Sparkles,
  Building2,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';

interface PublicCourseDetailPageProps {
  courseSlug: string;
  refCode?: string | null;
  onNavigateHome: () => void;
  onBrowseCatalog: () => void;
}

export const PublicCourseDetailPage: React.FC<PublicCourseDetailPageProps> = ({
  courseSlug,
  refCode,
  onNavigateHome,
  onBrowseCatalog,
}) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [formSubmittedResult, setFormSubmittedResult] = useState<{
    appointment_code?: string;
    message: string;
  } | null>(null);

  // Tải thông tin khóa học công khai từ API backend (CSDL Supabase)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setImageError(false);

    api
      .getPublicCourse(courseSlug)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          if (!res.data.is_active) {
            setError('Khóa học này hiện chưa được công khai trên hệ thống tuyển sinh.');
            setCourse(null);
          } else {
            setCourse(res.data);
          }
        } else {
          setError(
            res.error || 'Khóa học không tồn tại hoặc đã tạm dừng tiếp nhận đăng ký trên hệ thống.'
          );
          setCourse(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Lỗi kết nối máy chủ khi tải thông tin khóa học.');
        setCourse(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseSlug]);

  const scrollToRegistration = () => {
    const el = document.getElementById('dang-ky-tu-van');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formattedFee =
    course?.tuition_fee_estimate !== null &&
    course?.tuition_fee_estimate !== undefined &&
    !isNaN(Number(course.tuition_fee_estimate))
      ? new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(Number(course.tuition_fee_estimate))
      : 'Liên hệ tư vấn / Thỏa thuận';

  const sanitizedDescription = course ? sanitizeHtml(course.description_html) : '';
  const sanitizedBenefits = course?.benefits_content ? sanitizeHtml(course.benefits_content) : '';

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* 1. HEADER GỌN THEO THƯƠNG HIỆU STHC (Logo/Tên trường bên trái, Hotline thật 1800558827 bên phải) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Tên trường */}
          <div
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNavigateHome();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-sm shrink-0 border border-blue-950/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-blue-950 tracking-tight uppercase leading-snug line-clamp-1">
                Trường Du Lịch Saigontourist (STHC)
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Cổng Thông Tin Tuyển Sinh & Đào Tạo Nghề Quốc Tế
              </div>
            </div>
          </div>

          {/* Hotline thật bên phải: 1800 5588 27 (Miễn phí cước gọi) */}
          <div className="flex items-center gap-3">
            <a
              href="tel:1800558827"
              className="flex items-center gap-2.5 px-3 sm:px-4 py-2 bg-amber-50 hover:bg-amber-100/80 border border-amber-300/80 rounded-xl transition-all shadow-2xs group"
              title="Gọi Hotline tư vấn miễn phí cước gọi"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                <PhoneCall className="w-4 h-4 text-slate-950 animate-pulse" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] uppercase font-semibold text-amber-900 tracking-wider">
                  Hotline Tuyển sinh
                </span>
                <span className="text-sm sm:text-base font-black text-slate-950 font-mono tracking-tight leading-none">
                  1800 5588 27
                </span>
              </div>
            </a>
          </div>
        </div>
      </header>

      {/* 2. THANH BREADCRUMB ĐIỀU HƯỚNG */}
      <div className="bg-slate-200/60 border-b border-slate-200 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1 text-slate-500 hover:text-blue-900 transition-colors shrink-0"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <button
            onClick={onBrowseCatalog}
            className="text-slate-500 hover:text-blue-900 transition-colors shrink-0"
          >
            Danh mục khóa học
          </button>
          {course && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-blue-950 truncate">{course.title}</span>
            </>
          )}
        </div>
      </div>

      {/* MAIN CONTAINER (Chiều rộng chuẩn 1100–1200px: max-w-6xl) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TRẠNG THÁI LOADING */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="w-12 h-12 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Đang tải thông tin khóa học...
            </h2>
            <p className="text-xs text-slate-500">
              Vui lòng chờ trong giây lát để hệ thống cập nhật dữ liệu tuyển sinh chính xác nhất.
            </p>
          </div>
        )}

        {/* TRẠNG THÁI LỖI / KHÓA KHÔNG TỒN TẠI / CHƯA CÔNG KHAI */}
        {!loading && (error || !course) && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center shadow-sm space-y-4 max-w-2xl mx-auto my-12">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Khóa học không tồn tại hoặc đã ngừng công khai
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {error ||
                'Khóa học bạn đang tìm kiếm không tồn tại trên hệ thống hoặc hiện chưa mở tiếp nhận đăng ký trực tuyến.'}
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onBrowseCatalog}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
              >
                Xem các khóa học đang tuyển sinh
              </button>
              <button
                onClick={onNavigateHome}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all"
              >
                Về trang chủ STHC
              </button>
            </div>
          </div>
        )}

        {/* NỘI DUNG CHI TIẾT KHÓA HỌC HỢP LỆ (Theo thiết kế TTL.png) */}
        {!loading && course && (
          <>
            {/* THÔNG BÁO TẠM DỪNG TIẾP NHẬN ĐĂNG KÝ (NẾU CÓ) */}
            {(course.accepts_referrals === false || course.status === 'STOPPED') && (
              <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-amber-950">
                    Khóa học hiện đang tạm dừng tiếp nhận đăng ký mới
                  </h3>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    {course.stop_reason
                      ? `Lý do: ${course.stop_reason}`
                      : 'Ngành học này tạm thời đủ chỉ tiêu hoặc đang trong giai đoạn chuyển đổi chương trình đào tạo. Quý học viên vui lòng gọi Hotline 1800 5588 27 để nhận thông tin về đợt mở lớp tiếp theo.'}
                  </p>
                </div>
              </div>
            )}

            {/* KHỐI PHẦN ĐẦU HAI CỘT (Theo TTL.png: Trái ảnh - Phải thông tin tổng quan) */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Cột trái: Ảnh đại diện khóa học */}
                <div className="lg:col-span-5 w-full">
                  <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
                    {course.thumbnail_url && !imageError ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 text-slate-400">
                        <ImageIcon className="w-12 h-12 mb-2 text-slate-300" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Trường Saigontourist (STHC)
                        </span>
                        <span className="text-sm font-bold text-slate-700 mt-1 max-w-[200px] line-clamp-2">
                          {course.title}
                        </span>
                      </div>
                    )}

                    {/* Huy hiệu hệ đào tạo nổi trên ảnh */}
                    {course.degree_level && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-blue-950/85 backdrop-blur-xs text-amber-300 text-[11px] font-bold rounded-lg border border-amber-400/30 uppercase tracking-wider shadow-sm">
                        {course.degree_level}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cột phải: Hệ đào tạo, Nhóm nghề, Mã khóa, Tên, Mô tả & Nút Đăng ký */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    {/* Hàng nhãn phân loại (Zero-pill discipline per constitution) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="text-blue-900 font-bold uppercase tracking-wider">
                        {course.department || 'Trường Saigontourist'}
                      </span>
                      {course.career_group && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-700 font-semibold">
                            {course.career_group}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
                        Mã: {course.code}
                      </span>
                    </div>

                    {/* Tên khóa học */}
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                      {course.title}
                    </h1>

                    {/* Mô tả ngắn */}
                    {course.summary ? (
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed text-justify">
                        {course.summary}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Khóa học chuẩn nghề quốc tế tại Trường Du lịch Saigontourist.
                      </p>
                    )}
                  </div>

                  {/* Khối 4 thông số chính: Thời gian, Học phí, Bằng cấp, Xét tuyển */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <Clock className="w-3.5 h-3.5 text-blue-900" />
                        <span className="font-medium text-[11px]">Thời gian học</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">
                        {course.duration_text || 'Theo lộ trình'}
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-medium text-[11px]">Học phí dự kiến</span>
                      </div>
                      <p className="font-bold text-amber-900 text-xs sm:text-sm font-mono tabular-nums">
                        {formattedFee}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <Award className="w-3.5 h-3.5 text-blue-900" />
                        <span className="font-medium text-[11px]">Văn bằng</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {course.degree_level || 'Chứng chỉ nghề'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-medium text-[11px]">Hình thức</span>
                      </div>
                      <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        Xét tuyển học bạ
                      </p>
                    </div>
                  </div>

                  {/* Nút Đăng ký tư vấn trực tiếp trong trang */}
                  <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
                    {course.accepts_referrals === false || course.status === 'STOPPED' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-200 text-slate-400 font-bold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <span>Ngừng nhận hồ sơ</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={scrollToRegistration}
                        className="w-full sm:w-auto px-8 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
                      >
                        <span>ĐĂNG KÝ TƯ VẤN NGAY</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </button>
                    )}

                    <div className="text-xs text-slate-500 text-center sm:text-left">
                      <span className="font-medium text-slate-700">Miễn phí tư vấn</span> · Giữ chỗ
                      sớm nhận ưu đãi học phí
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* KHỐI NỘI DUNG CHI TIẾT & LỊCH KHAI GIẢNG (Hiển thị văn bản/HTML được làm sạch an toàn) */}
            <section className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                <BookOpen className="w-5 h-5 text-blue-900" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Thông Tin Chi Tiết & Lịch Khai Giảng
                </h2>
              </div>

              {sanitizedDescription ? (
                <div
                  className="prose prose-sm sm:prose-base max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-justify"
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Chưa có nội dung mô tả chi tiết cho khóa học này. Vui lòng để lại thông tin bên
                  dưới để nhận trọn bộ tài liệu đào tạo.
                </p>
              )}
            </section>

            {/* KHỐI ĐẶC QUYỀN HỌC VIÊN STHC (Nếu có nội dung) */}
            {sanitizedBenefits && (
              <section className="bg-gradient-to-br from-blue-50/70 via-white to-amber-50/40 rounded-2xl border border-blue-200/70 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-bold text-blue-950 tracking-tight">
                    {course.benefits_title?.trim() || 'Đặc Quyền Học Viên Trường Saigontourist (STHC)'}
                  </h3>
                </div>

                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sanitizedBenefits }}
                />
              </section>
            )}

            {/* KHỐI FORM ĐĂNG KÝ TƯ VẤN NẰM NGAY TRONG TRANG (Yêu cầu 3: Không mở popup, cố định khóa) */}
            <section id="dang-ky-tu-van" className="scroll-mt-20">
              {course.accepts_referrals === false || course.status === 'STOPPED' ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-2xl mx-auto shadow-sm space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Khóa học hiện không mở đăng ký trực tuyến
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Khóa học tạm thời dừng nhận đăng ký mới. Quý học viên vui lòng tham khảo các khóa
                    học liên quan hoặc gọi hotline 1800 5588 27.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={onBrowseCatalog}
                      className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Khám phá các khóa học khác
                    </button>
                  </div>
                </div>
              ) : formSubmittedResult ? (
                <div className="max-w-xl mx-auto">
                  <ThankYouScreen
                    appointmentCode={formSubmittedResult.appointment_code}
                    message={formSubmittedResult.message}
                    onBackToCourses={() => {
                      setFormSubmittedResult(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              ) : (
                <div className="max-w-xl mx-auto">
                  <LeadConsultationForm
                    courses={[course]}
                    selectedCourseId={course.id}
                    refCode={refCode}
                    lockCourse={true}
                    onSuccess={(result) => {
                      setFormSubmittedResult(result);
                      const el = document.getElementById('dang-ky-tu-van');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  />
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 4. FOOTER CÔNG KHAI CHUẨN THƯƠNG HIỆU STHC */}
      <footer className="mt-16 bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="text-sm font-black text-white uppercase tracking-tight">
                Trường Trung Cấp Du Lịch & Khách Sạn Saigontourist (STHC)
              </div>
              <div className="text-slate-400 mt-1">
                Trực thuộc Tổng Công ty Du lịch Sài Gòn (Saigontourist Group)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Hotline:</span>
              <a
                href="tel:1800558827"
                className="text-amber-400 font-mono font-bold text-sm hover:underline"
              >
                1800 5588 27 (Miễn phí)
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-[11px] text-slate-400">
            <div>
              <span className="font-semibold text-slate-300 block mb-1">Trụ sở chính:</span>
              <span>23/8 Hoàng Việt, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh</span>
            </div>
            <div>
              <span className="font-semibold text-slate-300 block mb-1">Email liên hệ:</span>
              <span>tuyensinh@sthc.edu.vn</span>
            </div>
            <div>
              <span className="font-semibold text-slate-300 block mb-1">Thời gian làm việc:</span>
              <span>Thứ Hai - Thứ Bảy (07h30 - 17h00)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.</span>
            <span>Chính sách bảo mật theo Nghị định 13/2023/NĐ-CP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
