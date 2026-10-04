import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Users, Search, Filter, Calendar, CheckCircle2, Clock, Eye, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface AffiliateLeadsViewProps {
  onNavigateToOverview: () => void;
}

export const AffiliateLeadsView: React.FC<AffiliateLeadsViewProps> = ({ onNavigateToOverview }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [admissionFilter, setAdmissionFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Detail Modal
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  // Debounce search (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAffiliateLeads({
        search: debouncedSearch,
        status: statusFilter,
        admission_status: admissionFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });
      if (res.success && res.data) {
        setLeads(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError((res as any).error || 'Không thể tải danh sách khách hàng được giới thiệu.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, admissionFilter, fromDate, toDate, page, limit]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setAdmissionFilter('ALL');
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
    } catch {
      return isoString;
    }
  };

  const getCounselingBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-semibold rounded-md text-[11px] border border-blue-200">Mới đăng ký</span>;
      case 'CONTACTED':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-semibold rounded-md text-[11px] border border-amber-200">Đã liên hệ</span>;
      case 'CONSULTING':
        return <span className="px-2.5 py-1 bg-purple-50 text-purple-800 font-semibold rounded-md text-[11px] border border-purple-200">Đang tư vấn</span>;
      case 'UNREACHABLE':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px] border border-slate-200">Chưa liên hệ được</span>;
      case 'LOST':
        return <span className="px-2.5 py-1 bg-rose-50 text-rose-800 font-semibold rounded-md text-[11px] border border-rose-200">Không tiếp tục</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-md text-[11px]">{status || 'Mới đăng ký'}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-amber-500" />
            <span>Mạng lưới tuyển sinh STHC</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Khách Hàng Được Giới Thiệu</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ tư vấn, tình trạng nhập học và mã hồ sơ EGOV của học viên do bạn giới thiệu qua link/QR.
          </p>
        </div>

        <button
          onClick={loadLeads}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors self-start md:self-auto border border-blue-200/60 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Tải lại dữ liệu</span>
        </button>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo họ tên, SĐT, khóa học, mã EGOV..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Bộ lọc:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-900"
            >
              <option value="ALL">Tất cả trạng thái chăm sóc</option>
              <option value="NEW">Mới đăng ký</option>
              <option value="CONTACTED">Đã liên hệ</option>
              <option value="CONSULTING">Đang tư vấn</option>
              <option value="UNREACHABLE">Chưa liên hệ được</option>
              <option value="LOST">Không tiếp tục</option>
            </select>

            <select
              value={admissionFilter}
              onChange={(e) => {
                setAdmissionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-900"
            >
              <option value="ALL">Tất cả tình trạng nhập học</option>
              <option value="NOT_ENROLLED">Chưa nhập học</option>
              <option value="ENROLLED">Đã nhập học</option>
            </select>

            {(searchTerm || statusFilter !== 'ALL' || admissionFilter !== 'ALL' || fromDate || toDate) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* DATE RANGE FILTER */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Khoảng ngày đăng ký:</span>
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          />
          <span className="text-slate-400">đến</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          />
        </div>
      </div>

      {/* CONTENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && leads.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Đang tải danh sách khách hàng...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3 px-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Không thể tải dữ liệu</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">{error}</p>
            <button
              onClick={loadLeads}
              className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Thử lại
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto border border-blue-100">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Chưa có khách hàng nào phù hợp</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'ALL' || admissionFilter !== 'ALL' || fromDate || toDate
                ? 'Không tìm thấy hồ sơ khớp với từ khóa hoặc bộ lọc của bạn.'
                : 'Bạn chưa giới thiệu khách hàng nào qua link hoặc mã QR. Hãy chia sẻ link khóa học ngay để bắt đầu ghi nhận!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 text-center w-12">STT</th>
                  <th className="py-3.5 px-4">Họ và tên khách</th>
                  <th className="py-3.5 px-4">Số điện thoại</th>
                  <th className="py-3.5 px-4">Khóa học quan tâm</th>
                  <th className="py-3.5 px-4">Mã hồ sơ EGOV</th>
                  <th className="py-3.5 px-4">Tình trạng nhập học</th>
                  <th className="py-3.5 px-4">Trạng thái chăm sóc</th>
                  <th className="py-3.5 px-4 text-right">Ngày đăng ký</th>
                  <th className="py-3.5 px-4 text-center w-24">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l, index) => {
                  const stt = (pagination.page - 1) * pagination.limit + index + 1;
                  const isEnrolled = l.reconciliation_status === 'MATCHED_VALID';

                  return (
                    <tr key={l.id || index} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">{stt}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{l.full_name}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{l.phone_masked || l.phone || '090****'}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 max-w-[200px] truncate" title={l.course_title}>
                        {l.course_title || 'Chương trình tuyển sinh STHC'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {l.external_admission_code ? (
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            {String(l.external_admission_code)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {l.reconciliation_status === 'MATCHED_VALID' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã nhập học (Hợp lệ)
                          </span>
                        ) : l.reconciliation_status === 'EXISTING_IN_SCHOOL_SYSTEM' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200" title="Khách đã đăng ký trước qua kênh khác">
                            Hồ sơ không hợp lệ (khách đã đăng ký trước qua kênh khác)
                          </span>
                        ) : l.reconciliation_status === 'MISMATCH_INVALID' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                            Thông tin không khớp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                            Chưa đối chiếu
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getCounselingBadge(l.counseling_status)}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                        {formatDateVN(l.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            window.history.pushState({}, '', `/portal/leads/${l.id}`);
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-900 hover:bg-blue-100 font-semibold rounded-lg transition-colors inline-flex items-center gap-1 text-xs shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50">
            <div>
              Đang xem{' '}
              <strong className="text-slate-900">
                {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              trên tổng <strong className="text-slate-900">{pagination.total}</strong> khách
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs"
                >
                  Trang trước
                </button>

                <span className="px-2 font-semibold text-slate-800">
                  Trang {pagination.page} / {pagination.totalPages || 1}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-2xs"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL FOR AFFILIATE */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Chi Tiết Lượt Giới Thiệu</h3>
                  <p className="text-xs text-slate-500 font-mono">Mã: {selectedLead.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium block">Họ và tên khách:</span>
                  <strong className="text-slate-900 text-sm">{selectedLead.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Số điện thoại (đã bảo mật):</span>
                  <strong className="text-blue-900 font-mono">{selectedLead.phone_masked || selectedLead.phone || '090****'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Khóa học quan tâm:</span>
                  <span className="text-slate-800 font-semibold">{selectedLead.course_title || 'Tuyển sinh chung STHC'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Thời gian đăng ký:</span>
                  <span className="text-slate-800 font-mono">{formatDateVN(selectedLead.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60">
                <div>
                  <span className="text-blue-900/70 font-semibold block">Mã hồ sơ EGOV:</span>
                  <span className="font-mono font-bold text-blue-950 text-sm">
                    {selectedLead.external_admission_code || 'Chưa cập nhật'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-900/70 font-semibold block">Tình trạng nhập học:</span>
                  <span className={`font-bold ${selectedLead.reconciliation_status === 'MATCHED_VALID' ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {selectedLead.reconciliation_status === 'MATCHED_VALID' ? 'Đã nhập học' : 'Chưa nhập học'}
                  </span>
                </div>
              </div>

              {selectedLead.customer_note && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium">Ghi chú của học viên khi đăng ký:</span>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-200/60">
                    "{selectedLead.customer_note}"
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                <strong>Quy chế CTV:</strong> Bạn có quyền xem tiến độ tư vấn và tình trạng nhập học của học viên do mình giới thiệu. Việc nhập mã EGOV và duyệt nhập học thuộc thẩm quyền của Cán bộ Tuyển sinh trường.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl font-bold transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
