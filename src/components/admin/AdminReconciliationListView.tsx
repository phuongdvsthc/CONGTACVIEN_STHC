import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { Course } from '../../types';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Check,
  RotateCcw,
  FileText,
  AlertCircle,
  FileCheck2,
  Calendar,
  User,
  GraduationCap,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AdminReconciliationListViewProps {
  currentUser?: any;
  onViewLeadDetail?: (leadId: string) => void;
}

export const AdminReconciliationListView: React.FC<AdminReconciliationListViewProps> = ({
  currentUser,
  onViewLeadDetail,
}) => {
  // Parse initial state from URL query parameters
  const getUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      search: params.get('search') || '',
      course_id: params.get('course_id') || 'ALL',
      admission_status: params.get('admission_status') || 'ALL',
      reconciliation_status: params.get('reconciliation_status') || 'ALL',
      source_type: params.get('source_type') || 'ALL',
      affiliate_id: params.get('affiliate_id') || 'ALL',
      from_date: params.get('from_date') || '',
      to_date: params.get('to_date') || '',
      page: Math.max(1, parseInt(params.get('page') || '1', 10) || 1),
      limit: [20, 50, 100].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 20,
    };
  };

  const initialUrl = getUrlParams();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState(initialUrl.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialUrl.search);
  const [courseFilter, setCourseFilter] = useState(initialUrl.course_id);
  const [admissionFilter, setAdmissionFilter] = useState(initialUrl.admission_status);
  const [reconciliationFilter, setReconciliationFilter] = useState(initialUrl.reconciliation_status);
  const [sourceTypeFilter, setSourceTypeFilter] = useState(initialUrl.source_type);
  const [affiliateFilter, setAffiliateFilter] = useState(initialUrl.affiliate_id);
  const [fromDate, setFromDate] = useState(initialUrl.from_date);
  const [toDate, setToDate] = useState(initialUrl.to_date);
  const [page, setPage] = useState(initialUrl.page);
  const [limit, setLimit] = useState(initialUrl.limit);

  // Data & Status State
  const [leads, setLeads] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Affiliate Autocomplete Combobox State
  const [affiliateSearchInput, setAffiliateSearchInput] = useState('');
  const [affiliateOptions, setAffiliateOptions] = useState<any[]>([]);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateComboboxOpen, setAffiliateComboboxOpen] = useState(false);
  const [selectedAffiliateLabel, setSelectedAffiliateLabel] = useState('');
  const affiliateLookupSeqRef = useRef(0);
  const affiliateComboboxRef = useRef<HTMLDivElement>(null);

  // Query Race Condition Sequence Guard
  const fetchSeqRef = useRef(0);

  // Click outside to close affiliate combobox
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (affiliateComboboxRef.current && !affiliateComboboxRef.current.contains(event.target as Node)) {
        setAffiliateComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync Search Debounce (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Course Catalog for dropdown filter
  useEffect(() => {
    api.getAdminCourses({ limit: 100 })
      .then((res) => {
        if (res.success && res.data) {
          setCourses(res.data);
        }
      })
      .catch((err) => console.warn('[LOAD COURSES WARNING]:', err));
  }, []);

  // Restore selected affiliate label on load or filter change
  useEffect(() => {
    if (affiliateFilter && affiliateFilter !== 'ALL' && affiliateFilter !== '') {
      api.lookupAffiliates({ id: affiliateFilter })
        .then((res) => {
          if (res.success && res.data && res.data[0]) {
            const a = res.data[0];
            setSelectedAffiliateLabel(`${a.affiliate_code} — ${a.full_name}`);
          }
        })
        .catch((err) => console.warn('[RESTORE AFFILIATE LABEL NOTICE]:', err));
    } else {
      setSelectedAffiliateLabel('');
    }
  }, [affiliateFilter]);

  // Debounced search on affiliate combobox (min 2 chars, 400ms)
  useEffect(() => {
    const cleanQ = affiliateSearchInput.trim();
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
      } catch (err) {
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
  }, [affiliateSearchInput, affiliateComboboxOpen]);

  // Synchronize state with URL Query Parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (courseFilter !== 'ALL') params.set('course_id', courseFilter);
    if (admissionFilter !== 'ALL') params.set('admission_status', admissionFilter);
    if (reconciliationFilter !== 'ALL') params.set('reconciliation_status', reconciliationFilter);
    if (sourceTypeFilter !== 'ALL') params.set('source_type', sourceTypeFilter);
    if (affiliateFilter !== 'ALL') params.set('affiliate_id', affiliateFilter);
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    if (page > 1) params.set('page', String(page));
    if (limit !== 20) params.set('limit', String(limit));

    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [
    debouncedSearch,
    courseFilter,
    admissionFilter,
    reconciliationFilter,
    sourceTypeFilter,
    affiliateFilter,
    fromDate,
    toDate,
    page,
    limit,
  ]);

  // Main Data Loader with Race Condition Protection
  const loadReconciliationLeads = useCallback(async () => {
    const currentSeq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);

    // Validate from_date <= to_date
    if (fromDate && toDate && fromDate > toDate) {
      setError('Khoảng thời gian không hợp lệ: "Từ ngày" không thể lớn hơn "Đến ngày".');
      setLoading(false);
      return;
    }

    try {
      const res = await api.getAdminLeads({
        search: debouncedSearch || undefined,
        course_id: courseFilter !== 'ALL' ? courseFilter : undefined,
        admission_status: admissionFilter !== 'ALL' ? admissionFilter : undefined,
        reconciliation_status: reconciliationFilter !== 'ALL' ? reconciliationFilter : undefined,
        source_type: sourceTypeFilter !== 'ALL' ? sourceTypeFilter : undefined,
        affiliate_id: affiliateFilter !== 'ALL' ? affiliateFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });

      if (currentSeq !== fetchSeqRef.current) return;

      if (res.success && res.data) {
        setLeads(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.error || 'Không thể tải danh sách đối chiếu hồ sơ từ máy chủ.');
      }
    } catch (err: any) {
      if (currentSeq === fetchSeqRef.current) {
        setError(err.message || 'Lỗi kết nối máy chủ.');
      }
    } finally {
      if (currentSeq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    debouncedSearch,
    courseFilter,
    admissionFilter,
    reconciliationFilter,
    sourceTypeFilter,
    affiliateFilter,
    fromDate,
    toDate,
    page,
    limit,
  ]);

  // Trigger data loader when any search, filter, or pagination option changes
  useEffect(() => {
    loadReconciliationLeads();
  }, [loadReconciliationLeads]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setCourseFilter('ALL');
    setAdmissionFilter('ALL');
    setReconciliationFilter('ALL');
    setSourceTypeFilter('ALL');
    setAffiliateFilter('ALL');
    setSelectedAffiliateLabel('');
    setAffiliateSearchInput('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // Helper formatting currency VNĐ
  const formatVND = (amount: number | null | undefined) => {
    if (amount === undefined || amount === null) return null;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Helper formatting datetime in Vietnam Timezone Asia/Ho_Chi_Minh
  const formatDateVN = (isoString: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  // Helper mapping admission status
  const renderAdmissionStatus = (status: string | undefined) => {
    if (status === 'ENROLLED') {
      return (
        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 border border-emerald-200/60">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Đã nhập học</span>
        </span>
      );
    }
    if (status === 'NOT_ENROLLED') {
      return (
        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 border border-slate-200">
          <span>Chưa nhập học</span>
        </span>
      );
    }
    return (
      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 border border-amber-200/60">
        <span>Cần kiểm tra</span>
      </span>
    );
  };

  // Helper mapping reconciliation status
  const renderReconciliationStatus = (status: string | undefined) => {
    switch (status) {
      case 'MATCHED_VALID':
        return (
          <span className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
            Hồ sơ hợp lệ
          </span>
        );
      case 'EXISTING_IN_SCHOOL_SYSTEM':
        return (
          <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded text-xs border border-purple-200">
            Đăng ký trước qua kênh khác
          </span>
        );
      case 'MISMATCH_INVALID':
        return (
          <span className="font-semibold text-rose-900 bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
            Thông tin không khớp
          </span>
        );
      case 'VOIDED':
        return (
          <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
            Đã hủy đối chiếu
          </span>
        );
      default:
        return (
          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded text-xs border border-slate-200">
            Chưa đối chiếu
          </span>
        );
    }
  };

  const isFiltered = Boolean(
    debouncedSearch ||
    courseFilter !== 'ALL' ||
    admissionFilter !== 'ALL' ||
    reconciliationFilter !== 'ALL' ||
    sourceTypeFilter !== 'ALL' ||
    affiliateFilter !== 'ALL' ||
    fromDate ||
    toDate
  );

  return (
    <div className="space-y-6">
      {/* 1. HEADER & INTRO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-900" />
              <span>Đối chiếu hồ sơ & học phí</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Kiểm tra hồ sơ EGOV và ghi nhận kết quả nhập học của khách hàng.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadReconciliationLeads()}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Row 1: Search Box & Course & Admission Status & Reconciliation Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo họ tên, SĐT, mã CTV hoặc mã EGOV"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all font-medium"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            >
              <option value="ALL">Tất cả khóa học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Admission Status Filter */}
          <div>
            <select
              value={admissionFilter}
              onChange={(e) => {
                setAdmissionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            >
              <option value="ALL">Tất cả tình trạng nhập học</option>
              <option value="ENROLLED">Đã nhập học (ENROLLED)</option>
              <option value="NOT_ENROLLED">Chưa nhập học (NOT_ENROLLED)</option>
            </select>
          </div>

          {/* Reconciliation Status Filter */}
          <div>
            <select
              value={reconciliationFilter}
              onChange={(e) => {
                setReconciliationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            >
              <option value="ALL">Tất cả kết quả đối chiếu</option>
              <option value="NOT_RECONCILED">Chưa đối chiếu (NOT_RECONCILED)</option>
              <option value="MATCHED_VALID">Hồ sơ hợp lệ (MATCHED_VALID)</option>
              <option value="EXISTING_IN_SCHOOL_SYSTEM">Đăng ký trước kênh khác (EXISTING)</option>
              <option value="MISMATCH_INVALID">Thông tin không khớp (MISMATCH)</option>
              <option value="VOIDED">Đã hủy đối chiếu (VOIDED)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Source Type & Specific Affiliate Autocomplete & Date Range & Clear */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-center pt-3 border-t border-slate-100">
          {/* Source Type Filter */}
          <div>
            <select
              value={sourceTypeFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSourceTypeFilter(val);
                if (val === 'ORGANIC') {
                  setAffiliateFilter('ALL');
                  setSelectedAffiliateLabel('');
                  setAffiliateSearchInput('');
                }
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            >
              <option value="ALL">Tất cả nguồn giới thiệu</option>
              <option value="AFFILIATE">Có CTV giới thiệu</option>
              <option value="ORGANIC">Khách tự đăng ký (Tự nhiên)</option>
            </select>
          </div>

          {/* Specific Affiliate Autocomplete Combobox */}
          <div className="relative" ref={affiliateComboboxRef}>
            <div
              onClick={() => {
                if (sourceTypeFilter === 'ORGANIC') return;
                setAffiliateComboboxOpen(!affiliateComboboxOpen);
              }}
              className={`w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium flex items-center justify-between transition-colors ${
                sourceTypeFilter === 'ORGANIC'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900/20'
              }`}
            >
              <span className="truncate">
                {sourceTypeFilter === 'ORGANIC'
                  ? 'Không áp dụng khi chọn Tự nhiên'
                  : selectedAffiliateLabel || (affiliateFilter === 'ALL' ? 'Tất cả CTV...' : 'Chọn CTV cụ thể...')}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {affiliateFilter !== 'ALL' && sourceTypeFilter !== 'ORGANIC' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAffiliateFilter('ALL');
                      setSelectedAffiliateLabel('');
                      setAffiliateSearchInput('');
                      setPage(1);
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    title="Xóa chọn CTV"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${affiliateComboboxOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {affiliateComboboxOpen && sourceTypeFilter !== 'ORGANIC' && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1.5 min-w-[280px]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={affiliateSearchInput}
                    onChange={(e) => setAffiliateSearchInput(e.target.value)}
                    placeholder="Nhập tên hoặc mã CTV (tối thiểu 2 ký tự)..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-900"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs">
                  {/* Default All */}
                  <button
                    type="button"
                    onClick={() => {
                      setAffiliateFilter('ALL');
                      setSelectedAffiliateLabel('');
                      setAffiliateComboboxOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                      affiliateFilter === 'ALL' ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tất cả CTV</span>
                    {affiliateFilter === 'ALL' && <Check className="w-3.5 h-3.5 text-blue-900" />}
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  {affiliateLoading ? (
                    <div className="py-3 text-center text-slate-400 text-xs">
                      <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <span>Đang tra cứu CTV...</span>
                    </div>
                  ) : affiliateSearchInput.trim().length < 2 ? (
                    <div className="py-2 px-2 text-slate-400 text-[11px] text-center italic">
                      Nhập tối thiểu 2 ký tự để tìm CTV
                    </div>
                  ) : affiliateOptions.length === 0 ? (
                    <div className="py-3 px-2 text-slate-500 text-xs text-center">
                      Không tìm thấy CTV khớp với "{affiliateSearchInput}"
                    </div>
                  ) : (
                    affiliateOptions.map((aff) => {
                      const isSelected = affiliateFilter === aff.id;
                      return (
                        <button
                          key={aff.id}
                          type="button"
                          onClick={() => {
                            setAffiliateFilter(aff.id);
                            setSelectedAffiliateLabel(`${aff.affiliate_code} — ${aff.full_name}`);
                            setSourceTypeFilter('AFFILIATE');
                            setAffiliateComboboxOpen(false);
                            setPage(1);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                            isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="font-mono font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5 border border-amber-200/60">
                              {aff.affiliate_code}
                            </span>
                            <span className="font-medium">{aff.full_name}</span>
                            {aff.status === 'SUSPENDED' && (
                              <span className="ml-1 text-[10px] text-rose-600 font-semibold">(Tạm khóa)</span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-900 shrink-0 ml-1" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Date Range: From Date & To Date */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 w-1/2">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                title="Ngày đăng ký từ"
              />
            </div>
            <div className="flex items-center gap-1.5 w-1/2">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                title="Ngày đăng ký đến"
              />
            </div>
          </div>

          {/* Clear Filter & Limit Selection */}
          <div className="flex items-center justify-end gap-2">
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium ml-auto">
              <span>Hiển thị:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLE & LIST PRESENTATION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Count summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
          <div>
            <span>Tổng cộng: </span>
            <strong className="text-slate-900 font-bold">{pagination.total}</strong> khách hàng
            {isFiltered && <span className="text-blue-900 ml-1.5">(kết quả sau bộ lọc)</span>}
          </div>
          {fromDate || toDate ? (
            <div className="text-[11px] text-slate-400">
              Lọc theo Ngày đăng ký (Múi giờ Asia/Ho_Chi_Minh GMT+7)
            </div>
          ) : null}
        </div>

        {/* Error State */}
        {error ? (
          <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h4 className="text-sm font-bold text-rose-900">Không thể tải dữ liệu</h4>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadReconciliationLeads()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Thử lại
            </button>
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang tải danh sách đối chiếu hồ sơ...</p>
          </div>
        ) : leads.length === 0 ? (
          /* Empty State */
          <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900">
              {isFiltered ? 'Không có kết quả phù hợp' : 'Chưa có hồ sơ khách hàng nào'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isFiltered
                ? 'Không tìm thấy khách hàng nào khớp với các điều kiện tìm kiếm và bộ lọc hiện tại.'
                : 'Hệ thống hiện chưa có hồ sơ khách hàng nào được ghi nhận.'}
            </p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-xs text-left min-w-[1020px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3">Họ và tên khách</th>
                  <th className="py-3 px-3">Số điện thoại</th>
                  <th className="py-3 px-3">CTV giới thiệu</th>
                  <th className="py-3 px-3">Khóa học quan tâm / đối chiếu</th>
                  <th className="py-3 px-3">Mã hồ sơ EGOV</th>
                  <th className="py-3 px-3">Tình trạng nhập học</th>
                  <th className="py-3 px-3">Kết quả đối chiếu</th>
                  <th className="py-3 px-3">Học phí khóa học</th>
                  <th className="py-3 px-3">Ngày đăng ký</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l, index) => {
                  const stt = (pagination.page - 1) * pagination.limit + index + 1;
                  const hasDifferentReconciledCourse =
                    l.reconciled_course_title &&
                    l.initial_course_title &&
                    l.reconciled_course_title !== l.initial_course_title;

                  const formattedCourseFee = formatVND(l.course_tuition_fee);
                  const isEstimatedFee = l.course_tuition_fee_type === 'ESTIMATE';

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium">
                        {stt}
                      </td>

                      {/* Họ tên khách */}
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <div className="font-bold text-slate-900">{l.full_name}</div>
                        {l.email && <div className="text-[11px] text-slate-400 font-normal">{l.email}</div>}
                      </td>

                      {/* Số điện thoại */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-900 text-xs">
                        {l.phone || '—'}
                      </td>

                      {/* CTV giới thiệu */}
                      <td className="py-3 px-3">
                        {l.affiliate_code ? (
                          <div>
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200/60 inline-block mb-0.5">
                              {l.affiliate_code}
                            </span>
                            {l.affiliate_name && (
                              <div className="text-[11px] text-slate-600 font-medium truncate max-w-[140px]">
                                {l.affiliate_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Khách tự đăng ký</span>
                        )}
                      </td>

                      {/* Khóa học quan tâm / đối chiếu */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">
                          {l.initial_course_title || 'Chương trình STHC'}
                        </div>
                        {hasDifferentReconciledCourse && (
                          <div className="text-[11px] text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded font-medium mt-1 inline-block border border-purple-200">
                            Đối chiếu: {l.reconciled_course_title}
                          </div>
                        )}
                      </td>

                      {/* Mã hồ sơ EGOV */}
                      <td className="py-3 px-3 font-mono">
                        {l.external_admission_code ? (
                          <div>
                            <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200 inline-block">
                              {String(l.external_admission_code)}
                            </span>
                            <div className="text-[11px] text-emerald-700 font-sans font-medium mt-1">
                              Đã đăng ký hồ sơ EGOV
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400 italic text-xs">Chưa cập nhật</span>
                            <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                              Chưa cập nhật mã EGOV
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Tình trạng nhập học */}
                      <td className="py-3 px-3">
                        {renderAdmissionStatus(l.admission_status)}
                      </td>

                      {/* Kết quả đối chiếu */}
                      <td className="py-3 px-3">
                        {renderReconciliationStatus(l.reconciliation_status)}
                      </td>

                      {/* Học phí khóa học đã lưu tại thời điểm đối chiếu */}
                      <td className="py-3 px-3 font-mono text-xs">
                        {formattedCourseFee !== null ? (
                          <div>
                            <span className="font-bold text-slate-900">{formattedCourseFee}</span>
                            {isEstimatedFee && (
                              <span className="text-[10px] text-slate-500 ml-1 font-sans">
                                (Ước tính)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Ngày đăng ký */}
                      <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDateVN(l.created_at)}
                      </td>

                      {/* Thao tác Xem chi tiết */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewLeadDetail) {
                              onViewLeadDetail(l.id);
                            } else {
                              window.history.pushState({}, '', `/admin/leads/${l.id}`);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }
                          }}
                          className="px-3 py-1.5 text-xs text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors font-bold inline-flex items-center gap-1 shadow-sm border border-blue-200/60 hover:border-blue-300"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PAGINATION FOOTER */}
        {pagination.total > 0 && !loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div>
              Hiển thị{' '}
              <strong className="text-slate-900">
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              trên <strong className="text-slate-900">{pagination.total}</strong> khách hàng
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Trang trước
              </button>

              <span className="px-2.5 py-1 font-semibold text-slate-800 bg-slate-50 rounded-lg border border-slate-200">
                Trang {pagination.page} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
