import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { DollarSign, Search, Filter, Calendar, CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw, Award, FileText } from 'lucide-react';
import { usePortalHeader } from '../../contexts/PortalHeaderContext';

interface AffiliateRewardsViewProps {
  onNavigateToOverview: () => void;
}

export const AffiliateRewardsView: React.FC<AffiliateRewardsViewProps> = ({ onNavigateToOverview }) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync header meta to Portal Header
  const { setHeaderMeta } = usePortalHeader();
  useEffect(() => {
    setHeaderMeta({
      title: 'Thù lao CTV',
      subtitle: 'Theo dõi các khoản thù lao từ học viên do bạn giới thiệu.',
    });

    return () => {
      setHeaderMeta(null);
    };
  }, [setHeaderMeta]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // ACTIVE = PENDING_APPROVAL + APPROVED
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [coursesList, setCoursesList] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Debounce search (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load courses for filter dropdown
  useEffect(() => {
    api.getAffiliateCourses().then((res) => {
      if (res.success && res.data) {
        setCoursesList(res.data);
      }
    }).catch(() => {});
  }, []);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAffiliateRewards({
        search: debouncedSearch,
        status: statusFilter,
        course_id: courseFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });
      if (res.success && res.data) {
        setRewards(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError((res as any).error || 'Không thể tải danh sách thù lao.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, courseFilter, fromDate, toDate, page, limit]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ACTIVE');
    setCourseFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

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
    } catch (e) {
      return isoString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã duyệt
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Từ chối
          </span>
        );
      case 'VOIDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Calculate totals from current loaded list or metrics
  const totalAmount = rewards.reduce((sum, r) => {
    if (r.status === 'APPROVED' || r.status === 'PENDING_APPROVAL') {
      return sum + (Number(r.amount) || 500000);
    }
    return sum;
  }, 0);

  const approvedCount = rewards.filter(r => r.status === 'APPROVED').length;
  const pendingCount = rewards.filter(r => r.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng khoản thù lao</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{pagination.total || rewards.length}</h3>
            <p className="text-xs text-slate-500 mt-1">Đã ghi nhận trong hệ thống</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã duyệt / Chờ duyệt</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-600">{approvedCount}</span>
              <span className="text-slate-300">/</span>
              <span className="text-xl font-bold text-amber-600">{pendingCount}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Hồ sơ hợp lệ & hoàn tất</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Giá trị thù lao</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalAmount)}</h3>
            <p className="text-xs text-slate-500 mt-1">Mức chuẩn 500.000 VNĐ / hồ sơ</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm tên học viên, SĐT, mã EGOV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="ACTIVE">Còn hiệu lực (Chờ duyệt + Đã duyệt)</option>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_APPROVAL">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="VOIDED">Đã hủy</option>
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="ALL">Tất cả khóa học</option>
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Từ ngày"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 py-2 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Đến ngày"
            />
          </div>
        </div>

        {/* Action Bar / Reset */}
        {(searchTerm || statusFilter !== 'ACTIVE' || courseFilter !== 'ALL' || fromDate || toDate) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Đang áp dụng bộ lọc tìm kiếm</span>
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Học viên giới thiệu</th>
                <th className="py-3 px-4">Khóa học đăng ký</th>
                <th className="py-3 px-4">Mã EGOV đối soát</th>
                <th className="py-3 px-4 text-right">Số tiền</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Ngày phát sinh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                      <p className="text-sm text-slate-500">Đang tải danh sách thù lao...</p>
                    </div>
                  </td>
                </tr>
              ) : rewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-700">Không tìm thấy khoản thù lao nào</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Chưa có học viên nào hoàn tất thủ tục nhập học và phát sinh thù lao theo tiêu chuẩn tuyển sinh hoặc bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{r.candidate_name}</div>
                      <div className="text-xs text-slate-500">{r.candidate_phone || 'Không có SĐT'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium line-clamp-1">{r.course_title}</div>
                      {r.course_code && <span className="text-xs text-slate-400 font-mono">Mã: {r.course_code}</span>}
                    </td>
                    <td className="py-3 px-4">
                      {r.external_admission_code ? (
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-800 px-2 py-1 rounded">
                          {r.external_admission_code}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(r.amount || 500000)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {renderStatusBadge(r.status)}
                      {r.status === 'REJECTED' && r.rejection_reason && (
                        <p className="text-xs text-rose-500 mt-1 max-w-xs truncate" title={r.rejection_reason}>
                          Lý do: {r.rejection_reason}
                        </p>
                      )}
                      {r.status === 'VOIDED' && r.void_reason && (
                        <p className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={r.void_reason}>
                          Hủy: {r.void_reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      <div>{formatDateVN(r.created_at)}</div>
                      {r.approved_at && (
                        <div className="text-emerald-600 text-[11px] mt-0.5">
                          Duyệt: {formatDateVN(r.approved_at)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm">
            <div className="text-xs text-slate-500">
              Hiển thị trang <span className="font-medium text-slate-700">{pagination.page}</span> / <span className="font-medium text-slate-700">{pagination.totalPages}</span> (Tổng {pagination.total} khoản)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trang trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
