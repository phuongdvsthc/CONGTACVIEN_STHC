import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import {
  AdminDashboardSummaryData,
  AdminDashboardPeriod,
  Course,
} from '../../types';
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  Percent,
  Award,
  DollarSign,
  FileCheck2,
  FileText,
  AlertCircle,
  RotateCcw,
  Search,
  ChevronRight,
  Filter,
  Check,
  ChevronDown,
  X,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  Layers,
  BookOpen,
  Info,
  HelpCircle,
  Trophy,
  Medal,
  Phone,
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser?: any;
  onNavigate?: (path: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  // State for chart interactions
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  // Navigation helper
  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // User permissions
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const isAdmin = currentUser?.role === 'admin';
  const hasPermission = (perm: string) => isAdmin || userPermissions.includes(perm);

  // Filter Draft State (controlled in form)
  const [period, setPeriod] = useState<AdminDashboardPeriod>(() => {
    const p = new URLSearchParams(window.location.search).get('period');
    if (p && ['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'ALL_TIME', 'CUSTOM'].includes(p)) {
      return p as AdminDashboardPeriod;
    }
    return 'THIS_MONTH';
  });

  const [fromDate, setFromDate] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get('from_date') || '';
  });

  const [toDate, setToDate] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get('to_date') || '';
  });

  const [courseId, setCourseId] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get('course_id') || 'ALL';
  });

  const [affiliateId, setAffiliateId] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get('affiliate_id') || 'ALL';
  });

  // Filter Applied State (what was last sent to API)
  const [appliedFilters, setAppliedFilters] = useState({
    period,
    fromDate,
    toDate,
    courseId,
    affiliateId,
  });

  // Courses catalog for dropdown
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Affiliate combobox state
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [affiliateOptions, setAffiliateOptions] = useState<Array<{
    id: string;
    affiliate_code: string;
    full_name: string;
    email: string;
    phone: string;
    status: string;
  }>>([]);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateComboboxOpen, setAffiliateComboboxOpen] = useState(false);
  const [selectedAffiliateLabel, setSelectedAffiliateLabel] = useState('Tất cả CTV');
  const affiliateLookupSeqRef = useRef(0);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Dashboard Summary Data & Loading
  const [dashboardData, setDashboardData] = useState<AdminDashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const requestSeqRef = useRef(0);

  // Date validation error
  const [dateError, setDateError] = useState<string | null>(null);

  // Validate custom dates
  useEffect(() => {
    if (period === 'CUSTOM') {
      if (fromDate && toDate && fromDate > toDate) {
        setDateError('Từ ngày không được lớn hơn Đến ngày');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [period, fromDate, toDate]);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setAffiliateComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user permissions on mount
  useEffect(() => {
    api.getMyPermissions().then(res => {
      if (res.success && res.data?.permissions) {
        setUserPermissions(res.data.permissions);
      }
    }).catch(() => {});
  }, []);

  // Fetch courses catalog
  useEffect(() => {
    setCoursesLoading(true);
    api.getPublicCourses().then(res => {
      if (res.success && res.data) {
        setCourses(res.data);
      }
    }).finally(() => {
      setCoursesLoading(false);
    });
  }, []);

  // Affiliate autocomplete debounce
  useEffect(() => {
    const cleanQ = affiliateSearch.trim();
    if (!affiliateComboboxOpen || cleanQ.length < 2) {
      setAffiliateOptions([]);
      setAffiliateLoading(false);
      return;
    }

    const currentSeq = ++affiliateLookupSeqRef.current;
    setAffiliateLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.lookupAffiliates({ q: cleanQ, limit: 20 });
        if (currentSeq === affiliateLookupSeqRef.current) {
          if (res.success && res.data) {
            setAffiliateOptions(res.data);
          } else {
            setAffiliateOptions([]);
          }
        }
      } catch {
        if (currentSeq === affiliateLookupSeqRef.current) {
          setAffiliateOptions([]);
        }
      } finally {
        if (currentSeq === affiliateLookupSeqRef.current) {
          setAffiliateLoading(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [affiliateSearch, affiliateComboboxOpen]);

  // Restore affiliate label on load
  useEffect(() => {
    if (affiliateId === 'ALL') {
      setSelectedAffiliateLabel('Tất cả CTV');
    } else if (affiliateId === 'UNASSIGNED') {
      setSelectedAffiliateLabel('Không gắn CTV (Tự nhiên)');
    } else if (affiliateId) {
      api.lookupAffiliates({ id: affiliateId }).then(res => {
        if (res.success && res.data && res.data[0]) {
          const a = res.data[0];
          setSelectedAffiliateLabel(`${a.affiliate_code} — ${a.full_name}`);
        }
      }).catch(() => {});
    }
  }, [affiliateId]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async (filtersToUse: typeof appliedFilters, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const currentReqSeq = ++requestSeqRef.current;

    try {
      const res = await api.getAdminDashboardSummary({
        period: filtersToUse.period,
        from_date: filtersToUse.period === 'CUSTOM' ? filtersToUse.fromDate || undefined : undefined,
        to_date: filtersToUse.period === 'CUSTOM' ? filtersToUse.toDate || undefined : undefined,
        course_id: filtersToUse.courseId,
        affiliate_id: filtersToUse.affiliateId,
      });

      if (currentReqSeq !== requestSeqRef.current) return;

      if (res.success && res.data) {
        setDashboardData(res.data);
        setLastUpdated(new Date());

        // Update URL query params smoothly
        const searchParams = new URLSearchParams();
        if (filtersToUse.period !== 'THIS_MONTH') searchParams.set('period', filtersToUse.period);
        if (filtersToUse.period === 'CUSTOM') {
          if (filtersToUse.fromDate) searchParams.set('from_date', filtersToUse.fromDate);
          if (filtersToUse.toDate) searchParams.set('to_date', filtersToUse.toDate);
        }
        if (filtersToUse.courseId !== 'ALL') searchParams.set('course_id', filtersToUse.courseId);
        if (filtersToUse.affiliateId !== 'ALL') searchParams.set('affiliate_id', filtersToUse.affiliateId);

        const newUrl = `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      } else {
        setError(res.error || 'Không thể tải số liệu tổng quan.');
      }
    } catch (err: any) {
      if (currentReqSeq === requestSeqRef.current) {
        setError(err.message || 'Lỗi kết nối máy chủ khi tải tổng quan.');
      }
    } finally {
      if (currentReqSeq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Apply Filter
  const handleApplyFilter = () => {
    if (dateError) return;
    const newApplied = {
      period,
      fromDate,
      toDate,
      courseId,
      affiliateId,
    };
    setAppliedFilters(newApplied);
    loadDashboardData(newApplied);
  };

  // Handle Reset Filter
  const handleResetFilter = () => {
    const defaultFilters = {
      period: 'THIS_MONTH' as AdminDashboardPeriod,
      fromDate: '',
      toDate: '',
      courseId: 'ALL',
      affiliateId: 'ALL',
    };
    setPeriod('THIS_MONTH');
    setFromDate('');
    setToDate('');
    setCourseId('ALL');
    setAffiliateId('ALL');
    setSelectedAffiliateLabel('Tất cả CTV');
    setDateError(null);
    setAppliedFilters(defaultFilters);
    loadDashboardData(defaultFilters);
  };

  // Handle Refresh Button
  const handleRefresh = () => {
    loadDashboardData(appliedFilters, true);
  };

  // Format currency VNĐ
  const formatVND = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '—';
    return `${new Intl.NumberFormat('vi-VN').format(num)} đ`;
  };

  // Format Timestamp
  const formatTimestamp = (date: Date | null) => {
    if (!date) return '';
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  };

  // Derived filter query string for navigation to /admin/leads
  const buildLeadsFilterQuery = (extraParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (dashboardData?.filters?.from_date) {
      params.set('from_date', dashboardData.filters.from_date);
    }
    if (dashboardData?.filters?.to_date) {
      params.set('to_date', dashboardData.filters.to_date);
    }
    if (dashboardData?.filters?.course_id && dashboardData.filters.course_id !== 'ALL') {
      params.set('course_id', dashboardData.filters.course_id);
    }
    if (dashboardData?.filters?.affiliate_id && dashboardData.filters.affiliate_id !== 'ALL') {
      params.set('affiliate_id', dashboardData.filters.affiliate_id);
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => params.set(k, v));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  // Format Vietnam DateTime: DD/MM/YYYY HH:mm
  const formatVietnamDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);

      const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
      return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
    } catch {
      return '—';
    }
  };

  // Render Counseling Status Badge
  const renderCounselingStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Mới tạo
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Đã liên hệ
          </span>
        );
      case 'CONSULTING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Đang tư vấn
          </span>
        );
      case 'UNREACHABLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
            Không liên lạc được
          </span>
        );
      case 'LOST':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Không có nhu cầu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'Mới tạo'}
          </span>
        );
    }
  };

  // Render Admission Status Badge
  const renderAdmissionStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'ENROLLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nhập học
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3 h-3 text-rose-600" />
            Đã rút học
          </span>
        );
      case 'NOT_ENROLLED':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Chưa nhập học
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 1: TIÊU ĐỀ, BỘ LỌC & THANH THAO TÁC                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-6 transition-all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              Tổng quan quản trị
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi tuyển sinh, mạng lưới cộng tác viên và thù lao trong hệ thống.
            </p>
          </div>
          {lastUpdated && (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 self-start md:self-auto flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Cập nhật lúc: {formatTimestamp(lastUpdated)} (Giờ Việt Nam)
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* 1. Period Dropdown */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Kỳ thời gian
            </label>
            <div className="relative">
              <select
                aria-label="Chọn kỳ thời gian"
                value={period}
                onChange={(e) => setPeriod(e.target.value as AdminDashboardPeriod)}
                className="w-full h-10 px-3.5 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="THIS_MONTH">Tháng này (Hiện tại)</option>
                <option value="LAST_MONTH">Tháng trước</option>
                <option value="THIS_YEAR">Năm nay (Toàn năm)</option>
                <option value="ALL_TIME">Toàn bộ thời gian</option>
                <option value="CUSTOM">Tùy chọn khoảng ngày</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Course Dropdown */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Khóa học
            </label>
            <div className="relative">
              <select
                aria-label="Chọn khóa học"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={coursesLoading}
                className="w-full h-10 px-3.5 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-60"
              >
                <option value="ALL">Tất cả khóa học</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.status === 'STOPPED' ? '(Ngừng nhận ĐK)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Affiliate Combobox Autocomplete */}
          <div className="lg:col-span-3 relative" ref={comboboxRef}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Cộng tác viên
            </label>
            <div
              onClick={() => setAffiliateComboboxOpen(true)}
              className="w-full h-10 px-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-600 focus-within:bg-white transition-all"
            >
              <span className="truncate pr-2">{selectedAffiliateLabel}</span>
              <div className="flex items-center gap-1 shrink-0">
                {affiliateId !== 'ALL' && (
                  <button
                    type="button"
                    aria-label="Xóa chọn CTV"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAffiliateId('ALL');
                      setSelectedAffiliateLabel('Tất cả CTV');
                    }}
                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Combobox Dropdown Panel */}
            {affiliateComboboxOpen && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm mã hoặc tên CTV..."
                      value={affiliateSearch}
                      onChange={(e) => setAffiliateSearch(e.target.value)}
                      autoFocus
                      className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAffiliateId('ALL');
                      setSelectedAffiliateLabel('Tất cả CTV');
                      setAffiliateComboboxOpen(false);
                      setAffiliateSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      affiliateId === 'ALL'
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Tất cả CTV</span>
                    {affiliateId === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAffiliateId('UNASSIGNED');
                      setSelectedAffiliateLabel('Không gắn CTV (Tự nhiên)');
                      setAffiliateComboboxOpen(false);
                      setAffiliateSearch('');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      affiliateId === 'UNASSIGNED'
                        ? 'bg-blue-50 text-blue-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Không gắn CTV (Tự nhiên)</span>
                    {affiliateId === 'UNASSIGNED' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>

                  {affiliateLoading && (
                    <div className="p-3 text-center text-slate-400">Đang tìm CTV...</div>
                  )}

                  {!affiliateLoading &&
                    affiliateSearch.trim().length >= 2 &&
                    affiliateOptions.length === 0 && (
                      <div className="p-3 text-center text-slate-400">Không tìm thấy CTV phù hợp</div>
                    )}

                  {affiliateOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setAffiliateId(opt.id);
                        setSelectedAffiliateLabel(`${opt.affiliate_code} — ${opt.full_name}`);
                        setAffiliateComboboxOpen(false);
                        setAffiliateSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                        affiliateId === opt.id
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-900">{opt.affiliate_code}</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span>{opt.full_name}</span>
                        {opt.status === 'SUSPENDED' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">
                            Tạm ngưng
                          </span>
                        )}
                      </div>
                      {affiliateId === opt.id && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Action Buttons */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyFilter}
              disabled={!!dateError || loading}
              className="flex-1 h-10 px-4 bg-[#0B1E3F] hover:bg-[#132c58] text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Filter className="w-4 h-4" />
              <span>Áp dụng</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilter}
              disabled={loading}
              title="Đặt lại bộ lọc về mặc định"
              className="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all hover:border-slate-300"
            >
              Đặt lại
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Tải lại dữ liệu"
              className="h-10 w-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center justify-center transition-all hover:border-slate-300 shrink-0"
            >
              <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Custom Date Inputs if CUSTOM is selected */}
        {period === 'CUSTOM' && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Từ ngày (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đến ngày (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
            {dateError && (
              <div className="sm:col-span-2 text-xs text-rose-600 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {dateError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error state display */}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start justify-between gap-3 text-rose-800 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">Không thể tải dữ liệu tổng quan</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-white border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold hover:bg-rose-50 shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 2: KẾT QUẢ TUYỂN SINH TRONG KỲ                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Kết quả tuyển sinh</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full">
              Nhóm đăng ký trong kỳ — trạng thái hiện tại
            </span>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng lượt đăng ký */}
          <div
            onClick={() => navigateTo(`/admin/leads${buildLeadsFilterQuery()}`)}
            className="group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tổng lượt đăng ký
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                dashboardData?.recruitment?.total_leads ?? 0
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
              <span>Toàn bộ lượt đăng ký trong kỳ</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </p>
          </div>

          {/* Card 2: Chưa nhập học */}
          <div
            onClick={() =>
              navigateTo(
                `/admin/leads${buildLeadsFilterQuery({ admission_status: 'NOT_ENROLLED' })}`
              )
            }
            className="group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Chưa nhập học
              </span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {loading ? (
                <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-lg" />
              ) : (
                dashboardData?.recruitment?.not_enrolled_leads ?? 0
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center justify-between">
              <span>Đang tư vấn / chưa nhập học</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
            </p>
          </div>

          {/* Card 3: Đã nhập học */}
          <div
            onClick={() =>
              navigateTo(
                `/admin/leads${buildLeadsFilterQuery({ admission_status: 'ENROLLED' })}`
              )
            }
            className="group bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Đã nhập học
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {loading ? (
                <div className="h-9 w-20 bg-emerald-50 animate-pulse rounded-lg" />
              ) : (
                dashboardData?.recruitment?.enrolled_leads ?? 0
              )}
            </div>
            <p className="text-xs text-emerald-600 mt-2 flex items-center justify-between font-medium">
              <span>Xác nhận qua đối chiếu A4</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-700 transition-colors" />
            </p>
          </div>

          {/* Card 4: Tỷ lệ nhập học */}
          <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Tỷ lệ nhập học
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-blue-700 tracking-tight">
              {loading ? (
                <div className="h-9 w-20 bg-blue-50 animate-pulse rounded-lg" />
              ) : dashboardData?.recruitment?.enrollment_rate !== null &&
                dashboardData?.recruitment?.enrollment_rate !== undefined ? (
                `${dashboardData.recruitment.enrollment_rate}%`
              ) : (
                '—'
              )}
            </div>
            <p className="text-xs text-blue-600 mt-2 font-medium">
              Đã nhập học / Tổng lượt đăng ký
            </p>
          </div>
        </div>

        {/* Sub-bar with 3 parameters */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Đã rút học:</span>
            <span className="font-bold text-slate-900">
              {loading ? '...' : dashboardData?.recruitment?.withdrawn_leads ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Đã gắn mã EGOV:</span>
            <span className="font-bold text-slate-900">
              {loading ? '...' : dashboardData?.recruitment?.egov_active_leads ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            <span>Nguồn CTV hợp lệ:</span>
            <span className="font-bold text-slate-900">
              {loading ? '...' : dashboardData?.recruitment?.matched_valid_leads ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 3: MẠNG LƯỚI CTV & VIỆC CẦN XỬ LÝ NGAY                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3A: Mạng lưới CTV */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-700" />
                  Mạng lưới CTV
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toàn bộ cộng tác viên ghi nhận trong hệ thống
                </p>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                Toàn thời gian
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-extrabold text-slate-900">
                {loading ? (
                  <div className="h-9 w-16 bg-slate-100 animate-pulse rounded-lg" />
                ) : (
                  dashboardData?.affiliate_network?.total_affiliates ?? 0
                )}
              </span>
              <span className="text-sm font-semibold text-slate-500">Cộng tác viên</span>
            </div>

            {/* Status Breakdown Badges */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigateTo('/admin/affiliates?status=ACTIVE')}
                className="p-2.5 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/60 text-left transition-all group"
              >
                <div className="text-[11px] font-semibold text-emerald-800">Hoạt động</div>
                <div className="text-lg font-bold text-emerald-700 mt-0.5">
                  {loading ? '...' : dashboardData?.affiliate_network?.active_affiliates ?? 0}
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('/admin/affiliates?status=PENDING_REVIEW')}
                className="p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/60 text-left transition-all group"
              >
                <div className="text-[11px] font-semibold text-amber-800">Chờ duyệt</div>
                <div className="text-lg font-bold text-amber-700 mt-0.5">
                  {loading ? '...' : dashboardData?.affiliate_network?.pending_affiliates ?? 0}
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('/admin/affiliates?status=SUSPENDED')}
                className="p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/60 text-left transition-all group"
              >
                <div className="text-[11px] font-semibold text-rose-800">Tạm ngưng</div>
                <div className="text-lg font-bold text-rose-700 mt-0.5">
                  {loading ? '...' : dashboardData?.affiliate_network?.suspended_affiliates ?? 0}
                </div>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            * Tài khoản CTV bị từ chối hoặc vô hiệu hóa không tính vào đang hoạt động.
          </p>
        </div>

        {/* 3B: Việc cần xử lý ngay */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Việc cần xử lý ngay
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hồ sơ và khách hàng tồn đọng cần hành động
                </p>
              </div>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
                Tồn đọng hiện tại
              </span>
            </div>

            <div className="space-y-3">
              {/* Task 1: Khách mới cần liên hệ */}
              <div
                onClick={() => navigateTo('/admin/leads?status=NEW')}
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                      Khách mới cần liên hệ tư vấn
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Trạng thái tư vấn mới (NEW) toàn hệ thống
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                      (dashboardData?.backlog?.new_leads_to_contact ?? 0) > 0
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {loading ? '...' : dashboardData?.backlog?.new_leads_to_contact ?? 0}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-colors" />
                </div>
              </div>

              {/* Task 2: Hồ sơ chờ đối chiếu */}
              <div
                onClick={() => navigateTo('/admin/reconcile')}
                className="group p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                      Hồ sơ chưa đối chiếu nhập học
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Chờ cán bộ đối soát học phí & mã sinh viên (A4)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700">
                    {loading ? '...' : dashboardData?.backlog?.pending_reconciliation_leads ?? 0}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span>Bấm vào từng mục để chuyển đến danh sách xử lý chuyên biệt</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 4: THÙ LAO TUYỂN SINH (CHỈ HIỂN THỊ KHI CÓ QUYỀN)             */}
      {/* ------------------------------------------------------------------ */}
      {dashboardData?.rewards?.available === true && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Thù lao cộng tác viên
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
                Toàn hệ thống
              </span>
            </div>
          </div>

          {/* 3 Reward Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Thù lao chờ duyệt */}
            <div
              onClick={() => {
                if (hasPermission('rewards.view')) {
                  navigateTo('/admin/rewards?status=PENDING_APPROVAL');
                }
              }}
              className={`bg-white rounded-2xl p-5 border border-amber-200/90 shadow-xs transition-all ${
                hasPermission('rewards.view')
                  ? 'hover:shadow-md hover:border-amber-300 cursor-pointer group'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Thù lao chờ duyệt
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-amber-900 tracking-tight">
                {loading ? (
                  <div className="h-8 w-28 bg-amber-50 animate-pulse rounded-lg" />
                ) : (
                  formatVND(dashboardData.rewards.pending_all?.amount)
                )}
              </div>
              <div className="text-xs text-amber-700 mt-2 flex items-center justify-between font-medium">
                <span>
                  {loading ? '...' : `${dashboardData.rewards.pending_all?.count ?? 0} khoản`} (Toàn
                  thời gian)
                </span>
                {hasPermission('rewards.view') && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </div>

            {/* Card 2: Thù lao đã duyệt trong kỳ */}
            <div
              onClick={() => {
                if (hasPermission('rewards.view')) {
                  const params = new URLSearchParams();
                  params.set('status', 'APPROVED');
                  if (dashboardData.filters.from_date) {
                    params.set('created_from', dashboardData.filters.from_date);
                  }
                  if (dashboardData.filters.to_date) {
                    params.set('created_to', dashboardData.filters.to_date);
                  }
                  navigateTo(`/admin/rewards?${params.toString()}`);
                }
              }}
              className={`bg-white rounded-2xl p-5 border border-indigo-200/90 shadow-xs transition-all ${
                hasPermission('rewards.view')
                  ? 'hover:shadow-md hover:border-indigo-300 cursor-pointer group'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                  Đã duyệt trong kỳ
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-indigo-900 tracking-tight">
                {loading ? (
                  <div className="h-8 w-28 bg-indigo-50 animate-pulse rounded-lg" />
                ) : (
                  formatVND(dashboardData.rewards.approved_period?.amount)
                )}
              </div>
              <div className="text-xs text-indigo-700 mt-2 flex items-center justify-between font-medium">
                <span>
                  {loading ? '...' : `${dashboardData.rewards.approved_period?.count ?? 0} khoản`}{' '}
                  (Theo kỳ chọn)
                </span>
                {hasPermission('rewards.view') && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </div>

            {/* Card 3: Tổng thù lao đã duyệt (Toàn thời gian) */}
            <div
              onClick={() => {
                if (hasPermission('rewards.view')) {
                  navigateTo('/admin/rewards?status=APPROVED');
                }
              }}
              className={`bg-white rounded-2xl p-5 border border-emerald-200/90 shadow-xs transition-all ${
                hasPermission('rewards.view')
                  ? 'hover:shadow-md hover:border-emerald-300 cursor-pointer group'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Tổng đã duyệt còn hiệu lực
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-900 tracking-tight">
                {loading ? (
                  <div className="h-8 w-28 bg-emerald-50 animate-pulse rounded-lg" />
                ) : (
                  formatVND(dashboardData.rewards.approved_all?.amount)
                )}
              </div>
              <div className="text-xs text-emerald-700 mt-2 flex items-center justify-between font-medium">
                <span>
                  {loading ? '...' : `${dashboardData.rewards.approved_all?.count ?? 0} khoản`}{' '}
                  (Toàn thời gian)
                </span>
                {hasPermission('rewards.view') && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-medium italic pt-1">
            * Thưởng đã duyệt không đồng nghĩa với đã thanh toán. Hệ thống hiện chưa có dữ liệu theo dõi chi trả tài chính.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 5: BIỂU ĐỒ TUYỂN SINH (XU HƯỚNG 12 THÁNG & PHÂN BỐ KHÓA HỌC) */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Biểu đồ 1: Xu hướng 12 tháng (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Đăng ký và nhập học theo tháng
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    12 tháng gần nhất — giờ Việt Nam (UTC+7)
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block shadow-xs" />
                    <span className="text-slate-700">Đăng ký ({dashboardData?.monthly_trend?.points?.reduce((acc, p) => acc + p.leads_count, 0) ?? 0})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-xs" />
                    <span className="text-slate-700">Đã nhập học ({dashboardData?.monthly_trend?.points?.reduce((acc, p) => acc + p.enrolled_count, 0) ?? 0})</span>
                  </div>
                </div>
              </div>

              {/* Enrolled missing date notice if any */}
              {(dashboardData?.monthly_trend?.metadata?.enrolled_missing_date_count ?? 0) > 0 && (
                <div className="mb-4 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Lưu ý: Có <strong>{dashboardData?.monthly_trend?.metadata?.enrolled_missing_date_count}</strong> hồ sơ nhập học chưa có ngày đối chiếu nên chưa định vị vào biểu đồ theo tháng.
                  </span>
                </div>
              )}

              {/* SVG Chart Container */}
              <div className="w-full overflow-x-auto relative">
                {loading ? (
                  <div className="h-64 w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-slate-400 text-xs">
                    Đang tải biểu đồ xu hướng...
                  </div>
                ) : (
                  <div className="relative min-w-[540px]">
                    {(() => {
                      const points = dashboardData?.monthly_trend?.points || [];
                      const maxVal = Math.max(...points.map((p) => Math.max(p.leads_count, p.enrolled_count)), 0);
                      const yMax = maxVal === 0 ? 10 : (maxVal <= 5 ? 5 : (maxVal <= 10 ? 10 : Math.ceil(maxVal / 5) * 5));
                      const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];
                      
                      const paddingLeft = 35;
                      const paddingRight = 15;
                      const paddingTop = 20;
                      const paddingBottom = 35;
                      const chartHeight = 190;
                      const chartWidth = 660;
                      const slotWidth = chartWidth / (points.length || 12);
                      const barWidth = 13;
                      const barGap = 3;
                      const groupWidth = barWidth * 2 + barGap;
                      const groupOffset = (slotWidth - groupWidth) / 2;

                      return (
                        <svg
                          viewBox={`0 0 ${chartWidth + paddingLeft + paddingRight} ${chartHeight + paddingTop + paddingBottom}`}
                          className="w-full h-auto overflow-visible select-none"
                        >
                          {/* Horizontal Grid lines and Y-axis labels */}
                          {yTicks.map((tick, idx) => {
                            const y = paddingTop + chartHeight - (tick / yMax) * chartHeight;
                            return (
                              <g key={`ytick-${idx}`}>
                                <line
                                  x1={paddingLeft}
                                  y1={y}
                                  x2={paddingLeft + chartWidth}
                                  y2={y}
                                  stroke={tick === 0 ? '#cbd5e1' : '#f1f5f9'}
                                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                                  strokeWidth={tick === 0 ? 1.5 : 1}
                                />
                                <text
                                  x={paddingLeft - 8}
                                  y={y + 3.5}
                                  textAnchor="end"
                                  fontSize="10"
                                  className="fill-slate-400 font-medium font-mono"
                                >
                                  {tick}
                                </text>
                              </g>
                            );
                          })}

                          {/* Bars and Columns */}
                          {points.map((p, idx) => {
                            const slotX = paddingLeft + idx * slotWidth;
                            const groupX = slotX + groupOffset;
                            const leadsHeight = yMax > 0 ? (p.leads_count / yMax) * chartHeight : 0;
                            const leadsY = paddingTop + chartHeight - leadsHeight;
                            const enrolledHeight = yMax > 0 ? (p.enrolled_count / yMax) * chartHeight : 0;
                            const enrolledY = paddingTop + chartHeight - enrolledHeight;
                            const isHovered = hoveredMonthIndex === idx;

                            return (
                              <g
                                key={`month-slot-${p.month_key}`}
                                className="cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredMonthIndex(idx)}
                                onMouseLeave={() => setHoveredMonthIndex(null)}
                              >
                                {/* Column background on hover */}
                                {isHovered && (
                                  <rect
                                    x={slotX + 1}
                                    y={paddingTop - 5}
                                    width={slotWidth - 2}
                                    height={chartHeight + 10}
                                    fill="#f8fafc"
                                    rx={6}
                                    className="transition-colors"
                                  />
                                )}

                                {/* Bar 1: Leads (Blue) */}
                                {p.leads_count > 0 && (
                                  <rect
                                    x={groupX}
                                    y={leadsY}
                                    width={barWidth}
                                    height={leadsHeight}
                                    fill="#2563eb"
                                    rx={3}
                                    className="transition-all hover:brightness-110"
                                  />
                                )}

                                {/* Bar 2: Enrolled (Emerald) */}
                                {p.enrolled_count > 0 && (
                                  <rect
                                    x={groupX + barWidth + barGap}
                                    y={enrolledY}
                                    width={barWidth}
                                    height={enrolledHeight}
                                    fill="#10b981"
                                    rx={3}
                                    className="transition-all hover:brightness-110"
                                  />
                                )}

                                {/* Zero baseline indicator if both are 0 */}
                                {p.leads_count === 0 && p.enrolled_count === 0 && (
                                  <circle
                                    cx={slotX + slotWidth / 2}
                                    cy={paddingTop + chartHeight}
                                    r={2}
                                    fill="#cbd5e1"
                                  />
                                )}

                                {/* Month Label */}
                                <text
                                  x={slotX + slotWidth / 2}
                                  y={paddingTop + chartHeight + 18}
                                  textAnchor="middle"
                                  fontSize="10"
                                  className={`font-medium transition-colors ${
                                    isHovered ? 'fill-blue-700 font-bold' : 'fill-slate-500'
                                  }`}
                                >
                                  {p.month_label}
                                </text>

                                {/* Invisible hover capture rect */}
                                <rect
                                  x={slotX}
                                  y={paddingTop - 5}
                                  width={slotWidth}
                                  height={chartHeight + 35}
                                  fill="transparent"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}

                    {/* Interactive Floating Tooltip */}
                    {hoveredMonthIndex !== null && dashboardData?.monthly_trend?.points[hoveredMonthIndex] && (() => {
                      const p = dashboardData.monthly_trend.points[hoveredMonthIndex];
                      const pointsCount = dashboardData.monthly_trend.points.length || 12;
                      const leftPercent = ((hoveredMonthIndex + 0.5) / pointsCount) * 100;

                      return (
                        <div
                          style={{
                            left: `${leftPercent}%`,
                            transform: 'translateX(-50%)',
                          }}
                          className="absolute top-2 pointer-events-none z-10 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl text-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                        >
                          <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1.5 flex items-center justify-between gap-3">
                            <span>Tháng {p.month_key} ({p.month_label})</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4 text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                                Đăng ký mới:
                              </span>
                              <strong className="text-white font-mono">{p.leads_count}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                                Đã nhập học:
                              </span>
                              <strong className="text-emerald-400 font-mono">{p.enrolled_count}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
              * Số liệu đếm theo tháng đăng ký (leads) và tháng đối chiếu nhập học (enrolled). Không tính tỷ lệ chuyển đổi trực tiếp giữa 2 chuỗi theo từng tháng do độ trễ nhập học.
            </p>
          </div>

          {/* Biểu đồ 2: Kết quả theo khóa (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Kết quả theo khóa đăng ký
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dashboardData?.course_breakdown?.metadata?.scope || 'Theo kỳ lọc được chọn'}
                  </p>
                </div>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                  {dashboardData?.course_breakdown?.metadata?.total_courses ?? 0} khóa
                </span>
              </div>

              {/* Summary Mini Bar */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổng ĐK</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {loading ? '...' : (dashboardData?.course_breakdown?.courses?.reduce((sum, c) => sum + c.total_leads, 0) ?? 0)}
                  </div>
                </div>
                <div className="border-x border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Nhập học</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">
                    {loading ? '...' : (dashboardData?.course_breakdown?.courses?.reduce((sum, c) => sum + c.enrolled_leads, 0) ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Tỷ lệ chung</div>
                  <div className="text-sm font-bold text-indigo-700 mt-0.5 font-mono">
                    {loading ? '...' : `${dashboardData?.recruitment?.enrollment_rate ?? 0}%`}
                  </div>
                </div>
              </div>

              {/* Course List Breakdown */}
              {loading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (!dashboardData?.course_breakdown?.courses || dashboardData.course_breakdown.courses.length === 0 || dashboardData.course_breakdown.courses.every(c => c.total_leads === 0)) ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Chưa có phát sinh đăng ký theo khóa trong kỳ này.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {(() => {
                    const coursesList = [...(dashboardData?.course_breakdown?.courses || [])].sort((a, b) => b.total_leads - a.total_leads);
                    const maxCourseLeads = Math.max(...coursesList.map((c) => c.total_leads), 1);

                    return coursesList.map((c, idx) => {
                      const leadsWidthPercent = (c.total_leads / maxCourseLeads) * 100;
                      const conversionRate = c.enrollment_rate !== null ? c.enrollment_rate : 0;

                      return (
                        <div
                          key={c.course_id || `course-${idx}`}
                          onClick={() => {
                            if (c.course_id) {
                              navigateTo(buildLeadsFilterQuery({ course_id: c.course_id }));
                            }
                          }}
                          className={`p-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all ${
                            c.course_id ? 'cursor-pointer group' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 font-mono shrink-0">
                                {c.course_code || 'N/A'}
                              </span>
                              <span className="font-semibold text-slate-800 truncate group-hover:text-indigo-900 transition-colors">
                                {c.course_title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                              <span className="text-slate-600 font-medium">
                                <strong>{c.total_leads}</strong> ĐK
                              </span>
                              <span className="text-emerald-700 font-bold">
                                <strong>{c.enrolled_leads}</strong> NH
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  conversionRate >= 30
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : conversionRate > 0
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {c.enrollment_rate !== null ? `${c.enrollment_rate}%` : '0%'}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar ratio */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${leadsWidthPercent}%` }}
                              className="h-full bg-blue-200 rounded-full relative overflow-hidden flex"
                            >
                              <div
                                style={{ width: `${conversionRate}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
              * Thống kê theo khóa đăng ký ban đầu của khách hàng trong kỳ được chọn.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KHỐI 6: KHÁCH HÀNG ĐĂNG KÝ GẦN ĐÂY & TOP 5 CTV TIÊU BIỂU            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 6A: BẢNG KHÁCH HÀNG ĐĂNG KÝ GẦN ĐÂY */}
        <div
          className={`${
            dashboardData?.leaderboard?.available
              ? 'lg:col-span-7 xl:col-span-8'
              : 'lg:col-span-12'
          } bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between`}
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-700" />
                  Khách hàng đăng ký gần đây
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trong kỳ và phạm vi đang chọn — tối đa 5 lượt mới nhất
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md">
                  {dashboardData?.recent_leads?.metadata?.total_returned ?? 0} lượt
                </span>
                <button
                  type="button"
                  onClick={() => navigateTo(`/admin/leads${buildLeadsFilterQuery()}`)}
                  className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Xem tất cả</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Leads Table */}
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : !dashboardData?.recent_leads?.leads || dashboardData.recent_leads.leads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Không có lượt đăng ký nào trong khoảng thời gian và phạm vi đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-2.5 px-3 first:pl-3 font-semibold">Khách hàng</th>
                      <th className="py-2.5 px-3 font-semibold">Khóa đăng ký</th>
                      <th className="py-2.5 px-3 font-semibold">CTV giới thiệu</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Ngày đăng ký</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Tiến độ tư vấn</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Nhập học</th>
                      <th className="py-2.5 px-3 last:pr-3 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboardData.recent_leads.leads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* 1. Khách hàng */}
                        <td className="py-3 px-3 first:pl-3">
                          <div
                            onClick={() => navigateTo(`/admin/leads/${lead.id}`)}
                            className="font-bold text-slate-900 group-hover:text-blue-700 cursor-pointer transition-colors"
                          >
                            {lead.full_name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 inline shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        </td>

                        {/* 2. Khóa học */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1 max-w-[160px]" title={lead.course_title || ''}>
                            {lead.course_title || 'Chưa chọn khóa'}
                          </div>
                          {lead.course_code && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-semibold">
                              {lead.course_code}
                            </span>
                          )}
                        </td>

                        {/* 3. CTV */}
                        <td className="py-3 px-3">
                          {lead.affiliate_code ? (
                            <div>
                              <div className="font-semibold text-slate-800 line-clamp-1 max-w-[130px]">
                                {lead.affiliate_name || 'CTV'}
                              </div>
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 font-bold border border-blue-200/50">
                                {lead.affiliate_code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Không qua CTV
                            </span>
                          )}
                        </td>

                        {/* 4. Ngày đăng ký */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatVietnamDateTime(lead.created_at)}
                        </td>

                        {/* 5. Tiến độ tư vấn */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {renderCounselingStatusBadge(lead.counseling_status)}
                        </td>

                        {/* 6. Nhập học */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {renderAdmissionStatusBadge(lead.admission_status)}
                        </td>

                        {/* 7. Thao tác */}
                        <td className="py-3 px-3 last:pr-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigateTo(`/admin/leads/${lead.id}`)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50/60 hover:bg-blue-100/80 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <span>Chi tiết</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            * Danh sách tối đa 5 lượt đăng ký mới nhất theo bộ lọc tuyển sinh đang chọn.
          </p>
        </div>

        {/* 6B: TOP 5 CTV TIÊU BIỂU (Chỉ hiển thị khi có quyền thù lao) */}
        {dashboardData?.leaderboard?.available === true && (
          <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Top 5 CTV tiêu biểu
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toàn bộ thời gian — Toàn hệ thống
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 rounded-md flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" />
                    Vinh danh
                  </span>
                  {hasPermission('rewards.view') && (
                    <button
                      type="button"
                      onClick={() => navigateTo('/admin/affiliates')}
                      title="Xem danh sách CTV"
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Leaderboard Items */}
              {loading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : !dashboardData.leaderboard.items || dashboardData.leaderboard.items.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Award className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Chưa có CTV nào phát sinh thù lao đã duyệt.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dashboardData.leaderboard.items.map((item) => {
                    const isRank1 = item.rank === 1;
                    const isRank2 = item.rank === 2;
                    const isRank3 = item.rank === 3;

                    return (
                      <div
                        key={item.affiliate_id || `ctv-rank-${item.rank}`}
                        onClick={() => {
                          if (hasPermission('rewards.view')) {
                            navigateTo(`/admin/rewards?affiliate_id=${item.affiliate_id}`);
                          } else {
                            navigateTo('/admin/affiliates');
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                          isRank1
                            ? 'bg-gradient-to-r from-amber-50/80 to-amber-100/30 border-amber-300/90 shadow-xs hover:border-amber-400 hover:shadow'
                            : isRank2
                            ? 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 hover:bg-slate-100/60'
                            : isRank3
                            ? 'bg-orange-50/40 border-orange-200/80 hover:border-orange-300'
                            : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Left: Rank & Affiliate Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Rank Badge */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                              isRank1
                                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-300/60'
                                : isRank2
                                ? 'bg-gradient-to-br from-slate-400 to-slate-600 text-white'
                                : isRank3
                                ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white'
                                : 'bg-slate-100 text-slate-600 font-semibold'
                            }`}
                          >
                            {item.rank}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-700 transition-colors">
                              {item.affiliate_name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                {item.affiliate_code}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {item.approved_reward_count} khoản duyệt
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Reward Amount */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-extrabold text-emerald-700 font-mono">
                            {formatVND(item.approved_reward_amount)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            Đã phê duyệt
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
              * Xếp hạng theo tổng tiền thù lao đã được phê duyệt còn hiệu lực toàn thời gian.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
