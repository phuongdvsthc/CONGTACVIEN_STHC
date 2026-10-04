import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  DollarSign,
  SearchX,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  Home,
} from 'lucide-react';
import { api } from '../../services/api';
import { Course } from '../../types';

export const CAREER_GROUP_OPTIONS = [
  'Làm bánh',
  'Nấu ăn',
  'Nhà hàng',
  'Khách sạn',
  'Pha chế',
];

interface PublicCatalogViewProps {
  refCode?: string | null;
  courses: Course[];
  onViewCourseDetail: (course: Course) => void;
  onNavigateHome: () => void;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  refCode,
  courses: initialCourses,
  onViewCourseDetail,
  onNavigateHome,
}) => {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Referrer verification state
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referrerStatus, setReferrerStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedCareerGroup, setSelectedCareerGroup] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'az' | 'za'>('default');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 9;

  // Fetch public courses & verify ref
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Verify referrer if refCode exists
      if (refCode && refCode.trim()) {
        setReferrerStatus('loading');
        try {
          const refRes = await api.getPublicAffiliateReferrer(refCode.trim());
          if (refRes.success && refRes.data?.full_name) {
            setReferrerName(refRes.data.full_name);
            setReferrerStatus('valid');
          } else {
            setReferrerName(null);
            setReferrerStatus('invalid');
          }
        } catch {
          setReferrerName(null);
          setReferrerStatus('invalid');
        }
      } else {
        setReferrerStatus('valid');
        setReferrerName(null);
      }

      // 2. Fetch public courses
      const courseRes = await api.getPublicCourses();
      if (courseRes.success && Array.isArray(courseRes.data)) {
        const activeList = courseRes.data.filter((c) => c.is_active !== false);
        setCourses(activeList);
      } else {
        setError(courseRes.success === false ? 'Không thể tải danh sách khóa học công khai.' : 'Lỗi kết nối máy chủ.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ khi tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, [refCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Degree Level options
  const degreeLevelOptions = useMemo(() => {
    const degrees = new Set<string>();
    courses.forEach((c) => {
      if (c.degree_level) degrees.add(c.degree_level);
    });
    return Array.from(degrees);
  }, [courses]);

  // Career Group options
  const careerGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    CAREER_GROUP_OPTIONS.forEach((g) => groups.add(g));
    courses.forEach((c) => {
      if (c.career_group) groups.add(c.career_group);
    });
    return Array.from(groups);
  }, [courses]);

  // Filter & sort
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Search query (diacritics & case insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      result = result.filter((c) => {
        const titleNorm = (c.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const codeNorm = (c.code || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const summaryNorm = (c.summary || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const careerNorm = (c.career_group || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return titleNorm.includes(q) || codeNorm.includes(q) || summaryNorm.includes(q) || careerNorm.includes(q);
      });
    }

    // Degree level filter
    if (selectedDegree !== 'ALL') {
      result = result.filter((c) => c.degree_level === selectedDegree);
    }

    // Career group filter
    if (selectedCareerGroup !== 'ALL') {
      if (selectedCareerGroup === 'UNASSIGNED') {
        result = result.filter((c) => !c.career_group);
      } else {
        result = result.filter((c) => c.career_group === selectedCareerGroup);
      }
    }

    // Sorting
    if (sortBy === 'az') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
    } else if (sortBy === 'za') {
      result.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'vi'));
    } else {
      result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return result;
  }, [courses, searchQuery, selectedDegree, selectedCareerGroup, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDegree, selectedCareerGroup, sortBy]);

  const totalPages = Math.ceil(filteredCourses.length / pageSize) || 1;
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDegree('ALL');
    setSelectedCareerGroup('ALL');
    setSortBy('default');
  };

  const formatTuition = (fee: number | null | undefined): string => {
    if (fee === null || fee === undefined) return 'Chưa cập nhật';
    if (fee === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN').format(fee) + '\u00A0đ';
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 font-sans flex flex-col antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* 1. Header công khai chung (giống trang chi tiết khóa học) */}
      <header className="sticky top-0 z-40 bg-[#0B1E3F] border-b border-blue-950/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between min-h-[46px]">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-blue-200 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Title & Referrer Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Danh mục khoá học
            </h2>
          </div>

          {/* Referrer Verification Notice */}
          {refCode && (
            <div>
              {referrerStatus === 'loading' && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-900 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Đang xác thực thông tin cộng tác viên giới thiệu...</span>
                </div>
              )}

              {referrerStatus === 'valid' && referrerName && (
                <p className="text-xs text-slate-600">
                  Các khóa học được giới thiệu bởi cộng tác viên <strong className="font-bold text-slate-900">{referrerName}</strong>.
                </p>
              )}

              {referrerStatus === 'invalid' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Mã giới thiệu <strong className="font-mono font-bold">{refCode}</strong> không hợp lệ hoặc đã hết hạn. Bạn đang xem danh mục khóa học chung.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên khóa học, mã khóa..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div className="md:col-span-3">
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="ALL">Tất cả hệ đào tạo</option>
                {degreeLevelOptions.map((deg) => (
                  <option key={deg} value={deg}>
                    {deg}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedCareerGroup}
                onChange={(e) => setSelectedCareerGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="ALL">Tất cả nhóm nghề</option>
                {careerGroupOptions.map((cg) => (
                  <option key={cg} value={cg}>
                    {cg}
                  </option>
                ))}
                <option value="UNASSIGNED">Chưa phân nhóm</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="default">Sắp xếp mặc định</option>
                <option value="az">Tên A – Z</option>
                <option value="za">Tên Z – A</option>
              </select>
            </div>
          </div>

          {(searchQuery || selectedDegree !== 'ALL' || selectedCareerGroup !== 'ALL' || sortBy !== 'default') && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Tìm thấy <strong className="font-bold text-slate-900">{filteredCourses.length}</strong> khóa học phù hợp.</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-blue-900 hover:text-blue-950 font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            </div>
          )}
        </div>

        {/* States & Grid */}
        {loading && (
          <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-9 h-9 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Đang tải danh sách khóa học công khai...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-12 text-center space-y-3.5 bg-rose-50/50 rounded-2xl border border-rose-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-900">Lỗi tải dữ liệu khóa học</h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có khóa học công khai</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hiện tại chưa có chương trình đào tạo nào được mở công khai trên hệ thống tuyển sinh.
            </p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
          <div className="p-16 text-center space-y-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy khóa học phù hợp</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Không có khóa học nào khớp với điều kiện tìm kiếm hoặc bộ lọc của bạn.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          </div>
        )}

        {!loading && !error && filteredCourses.length > 0 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group"
                >
                  <div className="relative h-44 bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 overflow-hidden flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="text-center p-4 text-blue-200/70 space-y-1">
                        <BookOpen className="w-10 h-10 mx-auto opacity-60 text-amber-400" />
                        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider block">
                          {course.code || 'STHC COURSE'}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                      {course.degree_level && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-900/90 text-white backdrop-blur-xs border border-blue-700/50 shadow-xs">
                          {course.degree_level}
                        </span>
                      )}

                      {course.career_group ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                          {course.career_group}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-300 text-[10px]">
                          Chưa phân nhóm
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Mã: <strong className="text-blue-900 font-bold">{course.code}</strong></span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-blue-900 transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {course.summary || 'Chương trình đào tạo chuyên sâu, chú trọng 70% thực hành thực tế tại các đối tác 5 sao.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span className="truncate">{course.duration_text || 'Chưa cập nhật'}</span>
                      </div>

                      <div className="flex items-center justify-end gap-1 text-amber-900 font-mono font-bold tabular-nums">
                        <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{formatTuition(course.tuition_fee_estimate)}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onViewCourseDetail(course)}
                        className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
                      >
                        <span>Chi tiết khóa học</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="text-slate-600">
                  Trang <strong className="font-bold text-slate-900 font-mono">{currentPage}</strong> / <strong className="font-bold text-slate-900 font-mono">{totalPages}</strong> (Tổng {filteredCourses.length} khóa học)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors shadow-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Trang trước</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg font-mono font-semibold transition-colors ${
                          p === currentPage
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors shadow-xs"
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
