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
  Briefcase,
  Users,
  Download,
  Mail,
} from 'lucide-react';
import QRCode from 'qrcode';
import { marked } from 'marked';
import { api } from '../../services/api';
import { Course } from '../../types';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// Configure marked for Markdown parsing
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface AffiliateCourseDetailItem extends Course {
  referral_url: string;
  affiliate_code: string;
  registered_count?: number | null;
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

  // QR state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

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

  // Generate QR code whenever referral_url is ready
  useEffect(() => {
    if (!course?.referral_url) {
      setQrDataUrl(null);
      setQrError(null);
      return;
    }

    try {
      new URL(course.referral_url); // Validate URL format
      QRCode.toDataURL(
        course.referral_url,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0B1E3F', // STHC Navy
            light: '#FFFFFF',
          },
        },
        (err, url) => {
          if (err) {
            console.error('QR generation error:', err);
            setQrError('Không thể tạo mã QR cho liên kết này.');
            setQrDataUrl(null);
          } else {
            setQrDataUrl(url);
            setQrError(null);
          }
        }
      );
    } catch {
      setQrError('Định dạng referral URL không hợp lệ để tạo mã QR.');
      setQrDataUrl(null);
    }
  }, [course?.referral_url]);

  const handleCopyLink = () => {
    if (!course?.referral_url) return;
    navigator.clipboard.writeText(course.referral_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      alert('Không thể sao chép tự động. Vui lòng sao chép thủ công: ' + course.referral_url);
    });
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl || !course) return;
    const link = document.createElement('a');
    link.download = `QR-${course.affiliate_code || 'CTV'}-${course.code || 'COURSE'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Social sharing handlers
  const handleShareFacebook = () => {
    if (!course?.referral_url) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(course.referral_url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=520');
  };

  const handleShareZalo = () => {
    if (!course?.referral_url) return;
    // Official Zalo Web Share Plugin URL
    const zaloUrl = `https://sp.zalo.me/plugins/share?dev=null&color=blue&oaid=&href=${encodeURIComponent(course.referral_url)}`;
    window.open(zaloUrl, '_blank', 'noopener,noreferrer,width=600,height=560');
  };

  const handleShareMail = () => {
    if (!course?.referral_url) return;
    const subject = encodeURIComponent(`Giới thiệu khóa học: ${course.title}`);
    const body = encodeURIComponent(
      `Kính gửi,\n\nTôi muốn chia sẻ thông tin khóa học "${course.title}" (Mã khóa: ${course.code}).\n\nXem chi tiết chương trình và đăng ký nhận tư vấn tuyển sinh tại liên kết sau:\n${course.referral_url}\n\nTrân trọng!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const formatTuition = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Chưa cập nhật';
    if (val === 0) return 'Miễn phí';
    return Number(val).toLocaleString('vi-VN') + '\u00A0đ';
  };

  // Safe Rich Content Renderer (Supports both HTML & Markdown)
  const renderContent = (raw: string | null | undefined): string => {
    if (!raw || !raw.trim()) return '';
    try {
      const parsed = marked.parse(raw) as string;
      return sanitizeHtml(parsed);
    } catch {
      return sanitizeHtml(raw);
    }
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
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
      <div className="max-w-3xl mx-auto py-12 text-center space-y-6 animate-fade-in">
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
      <div className="max-w-3xl mx-auto py-12 text-center space-y-6 animate-fade-in">
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

  // Dynamic benefits section title based on course title
  const benefitsSectionTitle = course.title && !course.title.toLowerCase().includes('bánh âu') && course.benefits_title?.includes('Bánh Âu')
    ? course.benefits_title.replace(/Bánh Âu/g, course.title)
    : (course.benefits_title?.trim() || `Đặc quyền học viên học khóa ${course.title}`);

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Breadcrumb & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button onClick={onBack} className="hover:text-blue-900 transition-colors font-medium">
              Khóa học
            </button>
            <span>/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs">{course.title}</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Chi tiết khóa học</h1>
        </div>

        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Main Course Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
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
              <div className="w-full h-full bg-[#0B1E3F] flex flex-col items-center justify-center text-white p-6">
                <BookOpen className="w-16 h-16 text-amber-400 mb-3 opacity-95" />
                <span className="text-sm font-mono font-bold tracking-widest uppercase text-amber-300">
                  {course.code || 'STHC'}
                </span>
              </div>
            )}
            {/* Badge Hệ đào tạo trên ảnh có độ tương phản cao */}
            <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/20 shadow-sm">
              {course.degree_level || 'Chưa cập nhật'}
            </div>
          </div>

          {/* Info column */}
          <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between space-y-5">
            <div className="space-y-3.5">
              {/* Top metadata: Hệ đào tạo, Nhóm nghề và Mã khóa học phía trên tên khóa */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Card / Badge Hệ đào tạo */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                    <span>{course.degree_level || 'Chưa cập nhật'}</span>
                  </div>

                  {/* Card / Badge Nhóm nghề */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                    course.career_group
                      ? 'bg-blue-50 text-blue-900 border border-blue-200/80'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <Briefcase className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                    <span>{course.career_group || 'Chưa phân nhóm'}</span>
                  </div>
                </div>

                {/* Mã khóa học rõ ràng */}
                <span className="text-xs font-mono font-medium text-slate-500">
                  Mã: <strong className="text-slate-800 font-semibold">#{course.code}</strong>
                </span>
              </div>

              {/* Tên khóa học */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
                {course.title}
              </h2>

              {/* Mô tả tóm tắt */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
                {course.summary || 'Chương trình đào tạo chuyên sâu chuẩn quốc tế, trang bị tay nghề vững chắc và cơ hội việc làm tại các khách sạn 4-5 sao.'}
              </p>
            </div>

            {/* Khối thông tin: Thời gian đào tạo, Học phí, Đã đăng ký */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 border-t border-slate-100 text-xs">
              {/* 1. Thời gian đào tạo */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block">Thời gian đào tạo</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <Clock className="w-4 h-4 text-blue-900 shrink-0" />
                  <span className="truncate" title={course.duration_text || 'Chưa cập nhật'}>
                    {course.duration_text || 'Chưa cập nhật'}
                  </span>
                </div>
              </div>

              {/* 2. Học phí */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block">Học phí</span>
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-sm whitespace-nowrap">
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>{formatTuition(course.tuition_fee_estimate)}</span>
                </div>
              </div>

              {/* 3. Đã đăng ký (Toàn hệ thống / Chưa có thống kê) */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block">Đã đăng ký</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <Users className="w-4 h-4 text-blue-900 shrink-0" />
                  <span>
                    {typeof (course as any).registered_count === 'number'
                      ? `${(course as any).registered_count.toLocaleString('vi-VN')} Đã đăng ký`
                      : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {typeof (course as any).registered_count === 'number'
                    ? 'Người đăng ký toàn hệ thống'
                    : 'Chưa cập nhật'}
                </p>
              </div>
            </div>

            {/* Khối chính sách thưởng STHC */}
            <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-3.5 space-y-1">
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

      {/* Section “Link giới thiệu khóa học của bạn” tích hợp QR trực tiếp và chia sẻ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Cột trái: Link, Nút chép và Bộ nút chia sẻ (Zalo, Facebook, Mail) */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Link giới thiệu khóa học của bạn</h3>
              <a
                href={course.referral_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-900 hover:underline flex items-center gap-1"
                title="Mở thử trang tuyển sinh công khai"
              >
                <span>Mở xem trang công khai</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Hộp link và nút sao chép */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-700 truncate select-all shadow-inner"
                title={course.referral_url}
              >
                {course.referral_url}
              </div>
              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-900 hover:bg-blue-950 text-white'
                }`}
                title="Sao chép liên kết tiếp thị"
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

            {/* Dòng “Chia sẻ qua:” với 3 nút chỉ hiển thị icon (Zalo, Facebook, Mail) */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-600 font-medium">Chia sẻ qua:</span>
              <div className="flex items-center gap-2">
                {/* 1. Nút Zalo */}
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-[#0068FF] flex items-center justify-center transition-colors shadow-2xs"
                  title="Chia sẻ qua Zalo"
                  aria-label="Chia sẻ qua Zalo"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.42 3.84 7.04L5 22l4.24-1.39C10.14 20.84 11.05 21 12 21c5.52 0 10-4.03 10-9s-4.48-9-10-9zm1.09 12.35h-3.2c-.3 0-.54-.24-.54-.54 0-.17.08-.32.21-.42l2.35-2.73h-2.1c-.3 0-.54-.24-.54-.54s.24-.54.54-.54h3.11c.3 0 .54.24.54.54 0 .17-.08.32-.21.42l-2.42 2.73h2.47c.3 0 .54.24.54.54s-.25.54-.54.54zm3.01 0h-1.2c-.3 0-.54-.24-.54-.54V8.69c0-.3.24-.54.54-.54s.54.24.54.54v4.58h.66c.3 0 .54.24.54.54s-.24.54-.54.54z" />
                  </svg>
                </button>

                {/* 2. Nút Facebook */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-[#1877F2] flex items-center justify-center transition-colors shadow-2xs"
                  title="Chia sẻ qua Facebook"
                  aria-label="Chia sẻ qua Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>

                {/* 3. Nút Mail */}
                <button
                  type="button"
                  onClick={handleShareMail}
                  className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-amber-700 flex items-center justify-center transition-colors shadow-2xs"
                  title="Chia sẻ qua Email"
                  aria-label="Chia sẻ qua Email"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Khối hiển thị mã QR trực tiếp & Nút tải ảnh PNG */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl md:w-56 shrink-0 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">Mã QR Tiếp Thị</span>

            {qrDataUrl ? (
              <>
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                  <img
                    src={qrDataUrl}
                    alt={`Mã QR tuyển sinh - ${course.title}`}
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                  title="Tải ảnh QR PNG về máy"
                >
                  <Download className="w-3.5 h-3.5 text-blue-900" />
                  <span>Tải ảnh QR (PNG)</span>
                </button>
              </>
            ) : qrError ? (
              <div className="text-center p-3 text-xs text-rose-600 space-y-1">
                <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
                <p className="font-medium">{qrError}</p>
              </div>
            ) : (
              <div className="w-36 h-36 bg-slate-200 rounded-xl animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Nội dung chi tiết: Giới thiệu chương trình & Đặc quyền học viên (Hỗ trợ HTML & Markdown sạch) */}
      <div className="space-y-6">
        {/* Course Description / Curriculum */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Giới thiệu chương trình & Nội dung chi tiết
          </h3>
          {course.description_html ? (
            <div
              className="rich-content text-xs sm:text-sm text-slate-700 leading-relaxed text-justify space-y-3 break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-blue-900 [&_a]:underline [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: renderContent(course.description_html) }}
            />
          ) : (
            <p className="text-xs text-slate-500 italic">Chưa cập nhật nội dung chi tiết cho khóa học này.</p>
          )}
        </div>

        {/* Student Benefits Section (Dynamic title with current course title) */}
        {course.benefits_content && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              {benefitsSectionTitle}
            </h3>
            <div
              className="rich-content text-xs sm:text-sm text-slate-700 leading-relaxed text-justify space-y-3 break-words [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-blue-900 [&_a]:underline [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: renderContent(course.benefits_content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
