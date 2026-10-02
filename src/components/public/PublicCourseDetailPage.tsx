import React, { useState, useEffect, useCallback } from 'react';
import { Course } from '../../types';
import { api } from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { LeadConsultationForm } from './LeadConsultationForm';
import { ThankYouScreen } from './ThankYouScreen';
import {
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Home,
  BookOpen,
  Sparkles,
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

  // Thông tin người giới thiệu (lấy từ backend qua mã ref)
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Popup đăng ký học
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [modalFormResult, setModalFormResult] = useState<{
    appointment_code?: string;
    message: string;
  } | null>(null);

  // 1. Tải thông tin khóa học công khai từ API backend (CSDL Supabase)
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

  useEffect(() => {
    let isMounted = true;
    setReferrerName(null); // Xóa ngay tên cũ khi ref thay đổi tránh hiển thị nhầm lẫn
    if (!refCode || !refCode.trim()) {
      return;
    }

    api
      .getPublicAffiliateReferrer(refCode.trim())
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data?.full_name) {
          setReferrerName(res.data.full_name);
        } else {
          setReferrerName(null);
        }
      })
      .catch(() => {
        if (isMounted) setReferrerName(null);
      });

    return () => {
      isMounted = false;
    };
  }, [refCode]);

  // 3. Quản lý Escape key và cuộn trang khi mở/đóng popup modal
  const handleOpenRegisterModal = useCallback(() => {
    if (isRegisterModalOpen) return;
    setModalFormResult(null);
    setIsRegisterModalOpen(true);
  }, [isRegisterModalOpen]);

  const handleCloseRegisterModal = useCallback(() => {
    setIsRegisterModalOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRegisterModalOpen) {
        setIsRegisterModalOpen(false);
      }
    };
    if (isRegisterModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRegisterModalOpen]);

  // Chuẩn bị danh sách card thông tin khóa học có dữ liệu thật (Không suy diễn, không hardcode)
  const infoCards: Array<{
    id: string;
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
  }> = [];

  if (course?.duration_text && course.duration_text.trim() !== '') {
    infoCards.push({
      id: 'duration',
      label: 'Thời gian đào tạo',
      value: course.duration_text.trim(),
      icon: Clock,
    });
  }

  if (
    course?.tuition_fee_estimate !== null &&
    course?.tuition_fee_estimate !== undefined &&
    !isNaN(Number(course.tuition_fee_estimate))
  ) {
    infoCards.push({
      id: 'tuition',
      label: 'Học phí',
      value: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(course.tuition_fee_estimate)),
      icon: DollarSign,
      highlight: true,
    });
  }

  const sanitizedDescription = course ? sanitizeHtml(course.description_html) : '';
  const sanitizedBenefits = course?.benefits_content ? sanitizeHtml(course.benefits_content) : '';

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* 1. HEADER: Nền xanh thương hiệu Saigontourist (#0B1E3F), gọn, không hardcode tên trường/logo/hotline */}
      <header className="sticky top-0 z-40 bg-[#0B1E3F] border-b border-blue-950/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between min-h-[46px]">
          {/* Vị trí dự trữ cho logo và hotline từ module cấu hình home của Admin trong tương lai */}
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-blue-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>
          </div>
          <div>
            <button
              onClick={onBrowseCatalog}
              className="text-xs font-medium text-blue-200/80 hover:text-white transition-colors"
            >
              Danh mục khóa học
            </button>
          </div>
        </div>
      </header>

      {/* 2. THANH BREADCRUMB ĐIỀU HƯỚNG */}
      <div className="bg-slate-200/60 border-b border-slate-200 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 overflow-x-auto">
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
              Vui lòng chờ trong giây lát để hệ thống cập nhật dữ liệu khóa học.
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
                Về trang chủ
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
                      : 'Ngành học này tạm thời ngừng nhận đăng ký mới. Quý học viên vui lòng tham khảo các khóa học khác hoặc theo dõi thông báo tiếp theo.'}
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
                        <span className="text-sm font-bold text-slate-700 mt-1 max-w-[200px] line-clamp-2">
                          {course.title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cột phải: Hệ đào tạo, Nhóm nghề, Mã khóa, Tên, Mô tả & Nút Đăng ký học */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    {/* Hàng nhãn phân loại: Hệ đào tạo và Nhóm nghề được làm nổi bật thành 2 badge riêng biệt */}
                    <div className="flex flex-wrap items-center gap-2">
                      {course.degree_level && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B1E3F] text-white text-xs font-bold rounded-lg shadow-2xs">
                          <BookOpen className="w-3.5 h-3.5 text-blue-200" />
                          <span>Hệ đào tạo: {course.degree_level}</span>
                        </span>
                      )}
                      {course.career_group && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold rounded-lg shadow-2xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Nhóm nghề: {course.career_group}</span>
                        </span>
                      )}
                      {course.code && (
                        <span className="inline-flex items-center px-2.5 py-1 font-mono text-slate-700 bg-slate-200/80 rounded-lg text-xs font-bold">
                          Mã: {course.code}
                        </span>
                      )}
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
                    ) : null}
                  </div>

                  {/* Khối card thông tin khóa học: Chỉ hiển thị khi có dữ liệu thật (Yêu cầu 2: Bỏ Văn bằng và Hình thức suy diễn) */}
                  {infoCards.length > 0 && (
                    <div
                      className={`grid gap-3 pt-2 ${
                        infoCards.length === 1
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {infoCards.map((card) => {
                        const IconComponent = card.icon;
                        return (
                          <div
                            key={card.id}
                            className={`p-3.5 rounded-xl border ${
                              card.highlight
                                ? 'bg-amber-50/80 border-amber-200'
                                : 'bg-slate-50 border-slate-200/80'
                            }`}
                          >
                            <div
                              className={`flex items-center gap-1.5 mb-1 ${
                                card.highlight ? 'text-amber-900' : 'text-slate-500'
                              }`}
                            >
                              <IconComponent
                                className={`w-3.5 h-3.5 ${
                                  card.highlight ? 'text-amber-700' : 'text-blue-900'
                                }`}
                              />
                              <span className="font-medium text-[11px]">{card.label}</span>
                            </div>
                            <p
                              className={`font-bold text-xs sm:text-sm ${
                                card.highlight
                                  ? 'text-amber-900 font-mono tabular-nums'
                                  : 'text-slate-900'
                              }`}
                            >
                              {card.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Nút Đăng ký học mở popup & Thông tin người giới thiệu (Yêu cầu 3 & 4) */}
                  <div className="pt-3 space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                          onClick={handleOpenRegisterModal}
                          disabled={isRegisterModalOpen}
                          className="w-full sm:w-auto px-8 py-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75"
                        >
                          <span>ĐĂNG KÝ HỌC</span>
                          <ArrowRight className="w-4 h-4 text-amber-400" />
                        </button>
                      )}
                    </div>

                    {/* Dòng xác nhận người giới thiệu (Yêu cầu 4: Chỉ hiển thị khi backend xác nhận CTV hợp lệ) */}
                    {referrerName && (
                      <p className="text-xs text-slate-600">
                        Bạn được giới thiệu bởi đối tác{' '}
                        <strong className="font-bold text-slate-900">{referrerName}</strong>
                      </p>
                    )}
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
                  Chưa có nội dung mô tả chi tiết cho khóa học này.
                </p>
              )}
            </section>

            {/* KHỐI ĐẶC QUYỀN HỌC VIÊN (Nếu có nội dung thật) */}
            {sanitizedBenefits && (
              <section className="bg-gradient-to-br from-blue-50/70 via-white to-amber-50/40 rounded-2xl border border-blue-200/70 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-bold text-blue-950 tracking-tight">
                    {course.benefits_title?.trim() || 'Đặc Quyền Học Viên'}
                  </h3>
                </div>

                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sanitizedBenefits }}
                />
              </section>
            )}

            {/* (Yêu cầu 5: Đã xóa hoàn toàn form nằm dưới trang - Form chỉ xuất hiện trong popup) */}
          </>
        )}
      </main>

      {/* 3. POPUP MODAL ĐĂNG KÝ HỌC (Yêu cầu 3) */}
      {isRegisterModalOpen && course && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl my-8">
            {modalFormResult ? (
              <ThankYouScreen
                appointmentCode={modalFormResult.appointment_code}
                message={modalFormResult.message}
                onBackToCourses={() => {
                  setModalFormResult(null);
                  setIsRegisterModalOpen(false);
                }}
              />
            ) : (
              <LeadConsultationForm
                courses={[course]}
                selectedCourseId={course.id}
                refCode={refCode}
                lockCourse={true}
                badge={null}
                title={`Đăng ký học — ${course.title}`}
                subtitle="Vui lòng để lại thông tin liên hệ để Nhà trường tiếp nhận hồ sơ đăng ký học."
                submitButtonText="Gửi đăng ký học"
                defaultConsent={false}
                onSuccess={(result) => setModalFormResult(result)}
                onCancel={handleCloseRegisterModal}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. FOOTER: Rút gọn chỉ giữ dòng bản quyền (Yêu cầu 6) */}
      <footer className="mt-16 bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-500">
          <span>© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.</span>
        </div>
      </footer>
    </div>
  );
};
