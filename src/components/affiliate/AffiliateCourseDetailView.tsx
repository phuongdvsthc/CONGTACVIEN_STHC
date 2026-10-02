import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  GraduationCap,
  Award,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Calendar,
  Building,
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { api } from '../../services/api';
import { Course } from '../../types';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface AffiliateCourseDetailItem extends Course {
  referral_url: string;
  affiliate_code: string;
}

interface AffiliateCourseDetailViewProps {
  courseId: string;
  onBack: () => void;
}

export const AffiliateCourseDetailView: React.FC<AffiliateCourseDetailViewProps> = ({
  courseId,
  onBack,
}) => {
  const [course, setCourse] = useState<AffiliateCourseDetailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchCourseDetail = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await api.getAffiliateCourseDetail(courseId);
      if (res.success && res.data) {
        setCourse(res.data);
      } else {
        if (res.error?.includes('không tồn tại') || res.error?.includes('công khai') || (res as any).status === 404) {
          setNotFound(true);
        } else {
          setError(res.error || 'Không thể tải thông tin chi tiết khóa học.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetail();
  }, [fetchCourseDetail]);

  const handleCopyLink = () => {
    if (!course?.referral_url) return;
    navigator.clipboard.writeText(course.referral_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      alert('Không thể sao chép tự động. Vui lòng sao chép thủ công: ' + course.referral_url);
    });
  };

  const formatTuition = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Chưa cập nhật';
    if (val === 0) return 'Miễn phí';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="h-64 bg-slate-200 rounded-xl w-full"></div>
          <div className="space-y-3">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-24 bg-slate-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Not Found / Unpublished Course State (404)
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto bg-blue-50 text-blue-900 rounded-3xl flex items-center justify-center border border-blue-100 shadow-inner">
          <BookOpen className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Khóa học không tồn tại hoặc không còn được công khai</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Khóa học bạn đang tìm kiếm có thể đã bị tạm ngưng giới thiệu, chuyển thành bản nháp hoặc không tồn tại trong hệ thống.
          </p>
        </div>
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách khóa học</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 mx-auto bg-red-50 text-red-600 rounded-3xl flex items-center justify-center border border-red-100 shadow-inner">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Tải dữ liệu thất bại</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={fetchCourseDetail}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            Thử lại
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const hasThumbnail = Boolean(course.thumbnail_url);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Breadcrumb & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button onClick={onBack} className="hover:text-blue-900 transition-colors">
              Khóa học
            </button>
            <span>/</span>
            <span className="text-slate-900 font-medium truncate max-w-xs">{course.title}</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Chi tiết khóa học</h1>
        </div>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Main Course Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* Thumbnail column */}
          <div className="md:col-span-5 bg-slate-100 relative min-h-[260px] md:min-h-full">
            {hasThumbnail ? (
              <img
                src={course.thumbnail_url || undefined}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 flex flex-col items-center justify-center text-white p-6">
                <BookOpen className="w-16 h-16 text-amber-400 mb-3 opacity-90" />
                <span className="text-sm font-bold tracking-widest uppercase text-amber-300">
                  {course.code || 'STHC'}
                </span>
              </div>
            )}
            <div className="absolute top-3 left-3 bg-slate-950/75 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              {course.degree_level || course.department || 'Đào tạo chuyên nghiệp'}
            </div>
          </div>

          {/* Info column */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{course.department || 'Đào tạo Saigontourist'}</span>
                <span aria-hidden="true">·</span>
                <span>Mã khóa học: {course.code}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                {course.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
                {course.summary || 'Chương trình đào tạo chuyên sâu chuẩn quốc tế, trang bị tay nghề vững chắc và cơ hội việc làm tại các khách sạn 4-5 sao.'}
              </p>
            </div>

            {/* Key specifications grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-normal">Hệ đào tạo</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <GraduationCap className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>{course.degree_level || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-normal">Nhóm nghề</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Briefcase className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>{course.career_group || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-normal">Thời gian đào tạo</span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Clock className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>{course.duration_text || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-normal">Học phí</span>
                <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>{formatTuition(course.tuition_fee_estimate)}</span>
                </div>
              </div>
            </div>

            {/* Commission Policy Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Award className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Thưởng 500.000 đ/hồ sơ nhập học hợp lệ</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Khoản thưởng được ghi nhận sau khi nhà trường đối soát và phê duyệt.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link Quick Block */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Link giới thiệu khóa học của bạn</h3>
          <a
            href={course.referral_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-900 hover:underline flex items-center gap-1"
          >
            <span>Mở thử trang công khai</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-700 truncate select-all shadow-inner">
            {course.referral_url}
          </div>
          <button
            onClick={handleCopyLink}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow transition-all shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-900 hover:bg-blue-950 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Sao chép link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detailed Curriculum & Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Description / Curriculum */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Giới thiệu chương trình & Nội dung chi tiết
            </h3>
            {course.description_html ? (
              <div
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed space-y-3 text-justify"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.description_html) }}
              />
            ) : (
              <p className="text-xs text-slate-500 italic">Chưa cập nhật nội dung chi tiết cho khóa học này.</p>
            )}
          </div>

          {/* Student Benefits Section (if configured) */}
          {course.benefits_title && course.benefits_content && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                {course.benefits_title}
              </h3>
              <div
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-justify"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(course.benefits_content) }}
              />
            </div>
          )}
        </div>

        {/* Sidebar Info (1 col) */}
        <div className="space-y-6">
          {/* Quick Info Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Thông tin tuyển sinh
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <GraduationCap className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-normal">Hệ đào tạo</span>
                  <span className="font-semibold text-slate-900">{course.degree_level || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-normal">Khoa đào tạo</span>
                  <span className="font-semibold text-slate-900">{course.department || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-normal">Thời gian học</span>
                  <span className="font-semibold text-slate-900">{course.duration_text || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-normal">Lịch khai giảng</span>
                  <span className="font-semibold text-slate-900">Chưa cập nhật lịch khai giảng sắp tới</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
