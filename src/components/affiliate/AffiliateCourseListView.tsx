import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Clock,
  DollarSign,
  SearchX,
  ExternalLink,
  ShieldAlert,
  Briefcase,
  QrCode,
} from 'lucide-react';
import { api } from '../../services/api';
import { Course } from '../../types';
import { QRModal } from '../common/QRModal';

export const CAREER_GROUP_OPTIONS = [
  'Làm bánh',
  'Nấu ăn',
  'Nhà hàng',
  'Khách sạn',
  'Pha chế',
];

interface AffiliateCourseItem extends Course {
  referral_url: string;
  affiliate_code: string;
}

interface AffiliateCourseListViewProps {
  onNavigateToOverview: () => void;
  onSelectCourse: (courseSlug: string) => void;
}

export const AffiliateCourseListView: React.FC<AffiliateCourseListViewProps> = ({
  onNavigateToOverview,
  onSelectCourse,
}) => {
  const [courses, setCourses] = useState<AffiliateCourseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suspendedError, setSuspendedError] = useState<string | null>(null);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedCareerGroup, setSelectedCareerGroup] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'az' | 'za'>('default');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Copy feedback state (mapping course id or slug to copied status)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // QR Modal state
  const [qrCourse, setQrCourse] = useState<{
    title: string;
    referralUrl: string;
    affiliateCode: string;
    courseCode?: string;
  } | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuspendedError(null);

    try {
      const res: any = await api.getAffiliateCourses();
      if (res.success && Array.isArray(res.data)) {
        setCourses(res.data);
      } else {
        if (res.affiliate_status === 'SUSPENDED' || res.error?.includes('tạm ngưng')) {
          setSuspendedError(res.error || 'Tài khoản CTV đang bị tạm ngưng quyền giới thiệu.');
        } else {
          setError(res.error || 'Không thể tải danh sách khóa học.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Extract unique career groups and degree levels for filters
  const careerGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    // Nhóm nghề chuẩn A2
    CAREER_GROUP_OPTIONS.forEach(g => groups.add(g));
    // Bổ sung nhóm nghề thực tế trả về từ CSDL (nếu có thêm)
    courses.forEach(c => {
      if (c.career_group) groups.add(c.career_group);
    });
    return Array.from(groups);
  }, [courses]);

  const degreeLevelOptions = useMemo(() => {
    const degrees = new Set<string>();
    courses.forEach(c => {
      if (c.degree_level) degrees.add(c.degree_level);
    });
    return Array.from(degrees);
  }, [courses]);

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Search query (diacritics insensitive search)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      result = result.filter(c => {
        const titleNorm = (c.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const codeNorm = (c.code || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const summaryNorm = (c.summary || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const careerNorm = (c.career_group || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return titleNorm.includes(q) || codeNorm.includes(q) || summaryNorm.includes(q) || careerNorm.includes(q);
      });
    }

    // Degree level filter
    if (selectedDegree !== 'ALL') {
      result = result.filter(c => c.degree_level === selectedDegree);
    }

    // Career Group filter
    if (selectedCareerGroup !== 'ALL') {
      if (selectedCareerGroup === 'UNASSIGNED') {
        result = result.filter(c => !c.career_group);
      } else {
        result = result.filter(c => c.career_group === selectedCareerGroup);
      }
    }

    // Sorting
    if (sortBy === 'az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
    } else if (sortBy === 'za') {
      result.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'vi'));
    } else {
      // Default sorting by sort_order
      result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return result;
  }, [courses, searchQuery, selectedDegree, selectedCareerGroup, sortBy]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDegree, selectedCareerGroup, sortBy]);

  // Paginated courses (12 per page)
  const totalPages = Math.ceil(filteredCourses.length / pageSize) || 1;
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage]);

  const handleCopyLink = (courseId: string, url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(courseId);
      setTimeout(() => {
        setCopiedId(null);
      }, 2500);
    }).catch(() => {
      alert('Không thể sao chép tự động. Vui lòng sao chép thủ công: ' + url);
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDegree('ALL');
    setSelectedCareerGroup('ALL');
    setSortBy('default');
  };

  // Format currency: ensures number and "đ" are non-breaking
  const formatTuition = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Chưa cập nhật';
    if (val === 0) return 'Miễn phí';
    return Number(val).toLocaleString('vi-VN') + '\u00A0đ';
  };

  if (suspendedError) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center text-amber-800">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-900">Tài khoản CTV đang tạm ngưng</h2>
          <p className="text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">{suspendedError}</p>
          <button
            onClick={onNavigateToOverview}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Quay về Tổng quan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Khóa học</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-100">
              {filteredCourses.length} khóa học
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Xem thông tin khóa học, lấy link giới thiệu và mã QR tiếp thị tuyển sinh của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={fetchCourses}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            title="Tải lại danh sách khóa học"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Search input */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên khóa học, mã hoặc nhóm nghề..."
              className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Career Group Filter (Thay thế Khoa đào tạo) */}
          <div className="md:col-span-3">
            <select
              value={selectedCareerGroup}
              onChange={(e) => {
                setSelectedCareerGroup(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm nghề</option>
              {careerGroupOptions.map(grp => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
              <option value="UNASSIGNED">Chưa phân nhóm</option>
            </select>
          </div>

          {/* Degree Level Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedDegree}
              onChange={(e) => {
                setSelectedDegree(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Tất cả hệ đào tạo</option>
              {degreeLevelOptions.map(deg => (
                <option key={deg} value={deg}>{deg}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all cursor-pointer"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="az">Tên: A — Z</option>
              <option value="za">Tên: Z — A</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchQuery || selectedDegree !== 'ALL' || selectedCareerGroup !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700">Bộ lọc đang áp dụng:</span>
              {searchQuery && <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg">Từ khóa: "{searchQuery}"</span>}
              {selectedCareerGroup !== 'ALL' && (
                <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg">
                  Nhóm nghề: {selectedCareerGroup === 'UNASSIGNED' ? 'Chưa phân nhóm' : selectedCareerGroup}
                </span>
              )}
              {selectedDegree !== 'ALL' && <span className="bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg">Hệ: {selectedDegree}</span>}
            </div>
            <button
              onClick={handleResetFilters}
              className="text-blue-900 hover:text-blue-950 font-semibold underline underline-offset-2"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        // Loading Skeleton Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-5 shadow-xs space-y-4 animate-pulse">
              <div className="w-full h-48 bg-slate-200 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                <div className="h-6 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="h-5 bg-slate-200 rounded w-1/4"></div>
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="bg-white rounded-2xl border border-red-200 p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-50 text-red-600 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không thể tải danh sách khóa học</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchCourses}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        // Empty State
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-900 rounded-full flex items-center justify-center">
            <SearchX className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không tìm thấy khóa học phù hợp</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Không có khóa học nào khớp với từ khóa hoặc bộ lọc bạn đang chọn. Vui lòng thử lại với từ khóa khác.
          </p>
          {(searchQuery || selectedDegree !== 'ALL' || selectedCareerGroup !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        // Course Card Grid
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCourses.map(course => {
              const isCopied = copiedId === course.id;
              const hasThumbnail = Boolean(course.thumbnail_url);

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md hover:border-blue-900/50 transition-all duration-200 flex flex-col justify-between group"
                >
                  {/* Card Top: Thumbnail & Metadata */}
                  <div className="flex flex-col flex-1">
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden shrink-0">
                      {hasThumbnail ? (
                        <img
                          src={course.thumbnail_url || undefined}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#0B1E3F] flex flex-col items-center justify-center text-white p-4">
                          <BookOpen className="w-10 h-10 text-amber-400 mb-2 opacity-95" />
                          <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-300">
                            {course.code || 'STHC'}
                          </span>
                        </div>
                      )}

                      {/* Floating Badge: Hệ đào tạo có độ tương phản rõ trên ảnh */}
                      <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/20 shadow-sm">
                        {course.degree_level || 'Chưa cập nhật'}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between space-y-3.5">
                      {/* Badge Nhóm nghề, Mã khóa học & Nút Chi tiết */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {course.career_group ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200/80 max-w-[210px] leading-snug line-clamp-2 break-words"
                              title={`Nhóm nghề: ${course.career_group}`}
                            >
                              <Briefcase className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                              <span className="line-clamp-2">{course.career_group}</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 max-w-[210px] leading-snug line-clamp-2 break-words"
                              title="Chưa phân nhóm nghề"
                            >
                              <span>Chưa phân nhóm</span>
                            </span>
                          )}

                          <span className="text-xs font-mono text-slate-400 font-medium shrink-0">
                            #{course.code}
                          </span>
                        </div>

                        {/* Nút Chi tiết nền xanh navy, chữ trắng */}
                        <button
                          onClick={() => onSelectCourse(course.slug)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 shadow-xs transition-colors shrink-0 ml-auto"
                          title="Xem chi tiết khóa học"
                        >
                          Chi tiết
                        </button>
                      </div>

                      {/* Course Title (đậm, dễ đọc) & Summary (tối đa 2 dòng) */}
                      <div className="space-y-1.5">
                        <h3
                          onClick={() => onSelectCourse(course.slug)}
                          className="text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors line-clamp-2 leading-snug cursor-pointer min-h-[2.75rem]"
                          title={course.title}
                        >
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                          {course.summary || 'Chương trình đào tạo chuẩn quốc tế, thực hành chuyên sâu tại hệ thống khách sạn và khu nghỉ dưỡng hàng đầu.'}
                        </p>
                      </div>

                      {/* Key details: Thời gian và học phí không bị ngắt số tiền và "đ" */}
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          <span className="text-slate-500 text-[11px] shrink-0">Thời lượng:</span>
                          <span className="font-semibold text-slate-800 truncate" title={course.duration_text || 'Theo lộ trình'}>
                            {course.duration_text || 'Theo lộ trình'}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-slate-700 min-w-0">
                          <span className="text-slate-500 text-[11px] shrink-0">Học phí:</span>
                          <span className="font-bold text-blue-900 whitespace-nowrap">
                            {formatTuition(course.tuition_fee_estimate)}
                          </span>
                        </div>
                      </div>

                      {/* Khối thưởng nền vàng nhạt, viền vàng, giữ điều kiện đối soát */}
                      <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <DollarSign className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Thưởng 500.000 đ/hồ sơ nhập học hợp lệ</span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 leading-tight">
                          Sau khi nhà trường đối soát và phê duyệt.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Referral Link, Copy Action & QR Code */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl space-y-2 mt-auto">
                    <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                      <span>Link giới thiệu của bạn:</span>
                      <a
                        href={course.referral_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-900 hover:underline flex items-center gap-1 font-normal text-xs"
                        title="Mở thử link công khai"
                      >
                        <span>Mở xem</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-[11px] font-mono text-slate-600 truncate select-all shadow-inner"
                        title={course.referral_url}
                      >
                        {course.referral_url}
                      </div>

                      <button
                        onClick={() => handleCopyLink(course.id, course.referral_url)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-900 hover:bg-blue-950 text-white'
                        }`}
                        title="Sao chép link tiếp thị khóa học"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Chép link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (!course.referral_url) {
                            alert(course.referral_url_error || 'Chưa thể mở mã QR do hệ thống chưa cấu hình domain công khai (APP_BASE_URL).');
                            return;
                          }
                          setQrCourse({
                            title: course.title,
                            referralUrl: course.referral_url,
                            affiliateCode: course.affiliate_code || '',
                            courseCode: course.code || course.slug,
                          });
                        }}
                        disabled={!course.referral_url}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 ${
                          !course.referral_url
                            ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-blue-900'
                        }`}
                        title={course.referral_url ? 'Xem mã QR tuyển sinh' : (course.referral_url_error || 'Chưa có cấu hình domain công khai')}
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-900" />
                        <span className="hidden sm:inline">QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-5 border-t border-slate-200">
              <div className="text-xs text-slate-600">
                Hiển thị từ <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> đến{' '}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * pageSize, filteredCourses.length)}
                </span>{' '}
                trong tổng số <span className="font-semibold text-slate-900">{filteredCourses.length}</span> khóa học
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  Trang trước
                </button>

                <div className="text-xs font-medium text-slate-700 px-2">
                  Trang {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Code Modal */}
      {qrCourse && (
        <QRModal
          isOpen={Boolean(qrCourse)}
          onClose={() => setQrCourse(null)}
          title={qrCourse.title}
          referralUrl={qrCourse.referralUrl}
          affiliateCode={qrCourse.affiliateCode}
          courseCode={qrCourse.courseCode}
        />
      )}
    </div>
  );
};
