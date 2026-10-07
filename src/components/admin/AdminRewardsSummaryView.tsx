import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import {
  Award,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldAlert,
} from 'lucide-react';

interface AdminRewardsSummaryViewProps {
  currentUser?: any;
  userPermissions?: string[];
  onViewAffiliateRewards?: (affiliateId: string) => void;
}

export const AdminRewardsSummaryView: React.FC<AdminRewardsSummaryViewProps> = ({
  currentUser,
  userPermissions = [],
  onViewAffiliateRewards,
}) => {
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryTotals, setSummaryTotals] = useState<any>({
    pending_count: 0,
    pending_amount: 0,
    approved_count: 0,
    approved_amount: 0,
    rejected_count: 0,
    rejected_amount: 0,
    voided_count: 0,
    voided_amount: 0,
    effective_count: 0,
    effective_amount: 0,
    total_records: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateType, setDateType] = useState('created_at');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [courseId, setCourseId] = useState('ALL');
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('effective_amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isAdmin = currentUser?.role === 'admin';
  const hasSummaryPerm = isAdmin || userPermissions.includes('rewards.summary');
  const hasExportPerm = isAdmin || userPermissions.includes('rewards.export');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    api.getAdminCourses().then(res => {
      if (res.success && res.data) {
        setCoursesList(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasSummaryPerm) {
      loadSummaryData();
    }
  }, [debouncedSearch, statusFilter, dateType, fromDate, toDate, courseId, page, pageSize, sortBy, sortOrder]);

  const loadSummaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminRewardsSummary({
        q: debouncedSearch,
        status: statusFilter,
        date_type: dateType,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        course_id: courseId,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (res.success) {
        setSummaryData(res.data || []);
        if (res.summary_totals) setSummaryTotals(res.summary_totals);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setError(res.error || 'Lỗi tải dữ liệu tổng hợp thù lao.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!hasExportPerm) {
      setApiFeedback({ type: 'error', message: 'Bạn không có quyền xuất báo cáo Excel (rewards.export).' });
      return;
    }
    setExporting(true);
    try {
      const blob = await api.getAdminRewardsExportBlob({
        q: debouncedSearch,
        status: statusFilter,
        date_type: dateType,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        course_id: courseId,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestampSlug = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      a.download = `Bao_cao_thu_lao_CTV_${timestampSlug}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setApiFeedback({ type: 'success', message: 'Xuất báo cáo Excel thành công!' });
    } catch (err: any) {
      setApiFeedback({ type: 'error', message: err.message || 'Lỗi xuất báo cáo Excel.' });
    } finally {
      setExporting(false);
    }
  };

  if (!hasSummaryPerm) {
    return (
      <div className="p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 space-y-3">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold">Không có quyền xem tổng hợp thù lao</h3>
        <p className="text-xs">Tài khoản của bạn không được cấp quyền <code>rewards.summary</code>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Feedback Notification */}
      {apiFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs ${
            apiFeedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{apiFeedback.message}</span>
          </div>
          <button onClick={() => setApiFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER & EXPORT BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Tổng Hợp Thù Lao Theo Cộng Tác Viên</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê chi tiết số khoản và ngân sách thù lao theo từng CTV dựa trên kết quả đối chiếu hợp lệ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSummaryData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {hasExportPerm && (
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel (.xlsx)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* NOTICE BANNER */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
        ℹ️ <strong className="font-semibold">Lưu ý:</strong> Đã duyệt thù lao chưa phải xác nhận đã chi trả.
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tổng còn hiệu lực</div>
          <div className="text-lg font-black text-indigo-900 font-mono">
            {new Intl.NumberFormat('vi-VN').format(summaryTotals.effective_amount)} VNĐ
          </div>
          <div className="text-xs text-slate-600 font-medium">
            {summaryTotals.effective_count} khoản (Chờ + Đã duyệt)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Chờ duyệt (Pending)</div>
          <div className="text-base font-bold text-amber-900 font-mono">
            {new Intl.NumberFormat('vi-VN').format(summaryTotals.pending_amount)} VNĐ
          </div>
          <div className="text-xs text-slate-600">{summaryTotals.pending_count} khoản thù lao</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Đã duyệt (Approved)</div>
          <div className="text-base font-bold text-emerald-900 font-mono">
            {new Intl.NumberFormat('vi-VN').format(summaryTotals.approved_amount)} VNĐ
          </div>
          <div className="text-xs text-slate-600">{summaryTotals.approved_count} khoản thù lao</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Từ chối / Đã hủy</div>
          <div className="text-base font-bold text-slate-700 font-mono">
            {new Intl.NumberFormat('vi-VN').format(summaryTotals.rejected_amount + summaryTotals.voided_amount)} VNĐ
          </div>
          <div className="text-xs text-slate-500">{summaryTotals.rejected_count + summaryTotals.voided_count} khoản (không tính vào hiệu lực)</div>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã/tên CTV, tên khách, SĐT, mã EGOV..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (Chờ + Đã duyệt)</option>
              <option value="PENDING_APPROVAL">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="VOIDED">Đã hủy</option>
            </select>
          </div>

          {/* Date Type */}
          <div>
            <select
              value={dateType}
              onChange={(e) => {
                setDateType(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="created_at">Loại ngày: Ngày phát sinh</option>
              <option value="approved_at">Loại ngày: Ngày duyệt</option>
              <option value="voided_at">Loại ngày: Ngày hủy</option>
            </select>
          </div>

          {/* Course filter */}
          <div>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Tất cả khóa học</option>
              {coursesList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range & Reset */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Khoảng thời gian:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
            <span className="text-slate-400">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />

            {(searchInput || statusFilter !== 'ALL' || fromDate || toDate || courseId !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                  setStatusFilter('ALL');
                  setDateType('created_at');
                  setFromDate('');
                  setToDate('');
                  setCourseId('ALL');
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <span className="text-slate-500">Sắp xếp theo:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
            >
              <option value="effective_amount">Tổng tiền hiệu lực</option>
              <option value="affiliate_name">Tên CTV</option>
              <option value="pending_amount">Tiền chờ duyệt</option>
              <option value="approved_amount">Tiền đã duyệt</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
              title="Thứ tự sắp xếp"
            >
              {sortOrder === 'desc' ? '↓ Giảm dần' : '↑ Tăng dần'}
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">Đang tổng hợp dữ liệu thù lao CTV...</div>
        ) : error ? (
          <div className="p-8 text-center bg-rose-50 text-rose-800 text-xs">{error}</div>
        ) : summaryData.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">Không có dữ liệu thù lao phù hợp với bộ lọc.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Cộng tác viên</th>
                  <th className="py-3 px-3 text-center">Chờ duyệt</th>
                  <th className="py-3 px-3 text-center">Đã duyệt</th>
                  <th className="py-3 px-3 text-center">Từ chối / Hủy</th>
                  <th className="py-3 px-4 text-right">Tổng còn hiệu lực</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryData.map((row: any, idx: number) => {
                  const stt = (pagination.page - 1) * pagination.page_size + idx + 1;
                  return (
                    <tr key={row.affiliate_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-500 font-mono">{stt}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{row.affiliate_name}</div>
                        <div className="text-[10px] text-amber-800 font-mono">{row.affiliate_code}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-amber-800 font-mono">{row.pending_count} khoản</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Intl.NumberFormat('vi-VN').format(row.pending_amount)}đ</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-emerald-700 font-mono">{row.approved_count} khoản</div>
                        <div className="text-[10px] text-slate-500 font-mono">{new Intl.NumberFormat('vi-VN').format(row.approved_amount)}đ</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="text-slate-600 font-mono">{row.rejected_count + row.voided_count} khoản</div>
                        <div className="text-[10px] text-slate-400 font-mono">{new Intl.NumberFormat('vi-VN').format(row.rejected_amount + row.voided_amount)}đ</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-indigo-900 font-mono text-sm">
                          {new Intl.NumberFormat('vi-VN').format(row.effective_amount)}đ
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{row.effective_count} khoản hiệu lực</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (onViewAffiliateRewards) {
                              onViewAffiliateRewards(row.affiliate_id);
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-semibold transition-colors"
                        >
                          Xem các khoản
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  Hiển thị trang {pagination.page} / {pagination.total_pages} (Tổng số {pagination.total_items} cộng tác viên)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg font-medium transition-colors"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg font-medium transition-colors"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
