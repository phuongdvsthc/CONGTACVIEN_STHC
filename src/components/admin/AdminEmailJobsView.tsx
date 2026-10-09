import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EmailJobDTO, EmailJobAttemptDTO, EmailJobStatus, EmailJobType } from '../../types';
import {
  Mail,
  Search,
  RefreshCw,
  RotateCcw,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  User,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';

interface AdminEmailJobsViewProps {
  currentUser?: any;
}

export const AdminEmailJobsView: React.FC<AdminEmailJobsViewProps> = ({ currentUser }) => {
  const [jobs, setJobs] = useState<EmailJobDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Detail Modal & Attempts History
  const [selectedJob, setSelectedJob] = useState<EmailJobDTO | null>(null);
  const [jobAttempts, setJobAttempts] = useState<EmailJobAttemptDTO[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAdminEmailJobs({
        q: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        page,
        limit,
      });
      if (res.success && res.data) {
        setJobs(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setErrorMsg(res.error || 'Không thể tải danh sách tác vụ email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi tải danh sách tác vụ email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchJobs();
  }, [debouncedSearch, typeFilter, statusFilter, page, limit]);

  const handleOpenDetail = async (job: EmailJobDTO) => {
    setSelectedJob(job);
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.getAdminEmailJobDetail(job.id);
      if (res.success && res.job) {
        setSelectedJob(res.job);
        setJobAttempts(res.attempts || []);
      }
    } catch (err: any) {
      console.error('Error fetching job detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRetryJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn thử lại tác vụ email này? Tác vụ sẽ được chuyển về trạng thái chờ xử lý.')) {
      return;
    }
    setActionLoadingId(jobId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.retryAdminEmailJob(jobId);
      if (res.success) {
        setSuccessMsg(res.message || 'Đã đưa tác vụ email về trạng thái chờ xử lý lại thành công.');
        fetchJobs();
        if (selectedJob && selectedJob.id === jobId && res.job) {
          setSelectedJob(res.job);
          // Refresh attempts
          const detailRes = await api.getAdminEmailJobDetail(jobId);
          if (detailRes.success) setJobAttempts(detailRes.attempts || []);
        }
      } else {
        setErrorMsg(res.error || 'Không thể thử lại tác vụ.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi thử lại tác vụ.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bạn có muốn gửi lại email này? Hệ thống sẽ tạo một tác vụ mới gửi đến cùng địa chỉ email mà không tạo lại lead hay thông báo nghiệp vụ.')) {
      return;
    }
    setActionLoadingId(jobId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.resendAdminEmailJob(jobId);
      if (res.success) {
        setSuccessMsg(res.message || 'Đã tạo tác vụ gửi lại email thành công vào hàng đợi.');
        fetchJobs();
      } else {
        setErrorMsg(res.error || 'Không thể gửi lại email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi lại email.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStatusBadge = (status: EmailJobStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã gửi (SENT)
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Chờ xử lý (PENDING)
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang chạy (PROCESSING)
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Bị khóa (BLOCKED)
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Thất bại ({status})
          </span>
        );
      case 'RETRY_WAIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RotateCcw className="w-3.5 h-3.5" /> Chờ gửi lại (RETRY_WAIT)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const renderTypeLabel = (type: EmailJobType) => {
    switch (type) {
      case 'LEAD_REGISTRATION_CONFIRMATION':
        return <span className="text-cyan-400 font-medium">Xác nhận Lead</span>;
      case 'CTV_NOTIFICATION_EMAIL':
        return <span className="text-amber-400 font-medium">Thông báo CTV</span>;
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Giám sát & Hàng đợi Email</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Theo dõi trạng thái, lịch sử xử lý, thử lại tác vụ lỗi và gửi lại email có chủ đích cho khách hàng và CTV.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchJobs()}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium border border-slate-700 transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo email người nhận, idempotency key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả loại email</option>
            <option value="LEAD_REGISTRATION_CONFIRMATION">Xác nhận Lead</option>
            <option value="CTV_NOTIFICATION_EMAIL">Thông báo CTV</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">PENDING (Chờ)</option>
            <option value="PROCESSING">PROCESSING (Đang chạy)</option>
            <option value="RETRY_WAIT">RETRY_WAIT (Chờ thử lại)</option>
            <option value="BLOCKED">BLOCKED (Bị khóa)</option>
            <option value="SENT">SENT (Đã gửi)</option>
            <option value="DEAD_LETTER">DEAD_LETTER (Lỗi nặng)</option>
          </select>
        </div>
      </div>

      {/* Table of Jobs */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Loại Email</th>
                <th className="py-4 px-6">Người Nhận</th>
                <th className="py-4 px-6">Trạng Thái</th>
                <th className="py-4 px-6">Số Lần Thử</th>
                <th className="py-4 px-6">Thời Gian Tạo / Gửi</th>
                <th className="py-4 px-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Đang tải danh sách tác vụ email...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Không tìm thấy tác vụ email nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isBusy = actionLoadingId === job.id;
                  const canRetry = ['BLOCKED', 'RETRY_WAIT', 'DEAD_LETTER'].includes(job.status);
                  const canResend = job.status === 'SENT';

                  return (
                    <tr
                      key={job.id}
                      onClick={() => handleOpenDetail(job)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-200">{renderTypeLabel(job.email_type)}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-xs">
                          Key: {job.idempotency_key}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-slate-200 font-medium">{job.recipient_name || 'Không rõ tên'}</div>
                        <div className="text-xs text-slate-400 font-mono">{job.recipient_email}</div>
                      </td>
                      <td className="py-4 px-6">
                        {renderStatusBadge(job.status)}
                        {job.blocked_reason && (
                          <div className="text-xs text-rose-400 mt-1 max-w-xs truncate" title={job.blocked_reason}>
                            Lý do khóa: {job.blocked_reason}
                          </div>
                        )}
                        {job.last_error_message && job.status !== 'BLOCKED' && (
                          <div className="text-xs text-red-400 mt-1 max-w-xs truncate" title={job.last_error_message}>
                            Lỗi: {job.last_error_message}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-slate-300">
                          {job.attempt_count} / {job.max_attempts}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs text-slate-300">
                          Tạo: {new Date(job.created_at).toLocaleString('vi-VN')}
                        </div>
                        {job.sent_at && (
                          <div className="text-xs text-emerald-400 mt-0.5">
                            Gửi: {new Date(job.sent_at).toLocaleString('vi-VN')}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(job)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Xem chi tiết & lịch sử"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canRetry && (
                            <button
                              disabled={isBusy}
                              onClick={(e) => handleRetryJob(job.id, e)}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                              title="Thử lại tác vụ thất bại / bị khóa"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                              Thử lại
                            </button>
                          )}

                          {canResend && (
                            <button
                              disabled={isBusy}
                              onClick={(e) => handleResendJob(job.id, e)}
                              className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                              title="Gửi lại chủ đích email đã SENT"
                            >
                              <Send className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                              Gửi lại
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
          <div>
            Hiển thị trang <span className="font-semibold text-slate-200">{pagination.page}</span> /{' '}
            <span className="font-semibold text-slate-200">{pagination.totalPages}</span> (Tổng số{' '}
            <span className="font-semibold text-slate-200">{pagination.total}</span> tác vụ)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Chi tiết Tác vụ Email</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedJob.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800/60 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Thông tin định danh</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Loại email:</span>
                    <span className="font-medium text-slate-200">{renderTypeLabel(selectedJob.email_type)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Mẫu template:</span>
                    <span className="font-mono text-indigo-300">{selectedJob.template_code} ({selectedJob.template_version})</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Khóa trùng lặp:</span>
                    <span className="font-mono text-slate-300 text-xs truncate max-w-[200px]" title={selectedJob.idempotency_key}>
                      {selectedJob.idempotency_key}
                    </span>
                  </div>
                  {selectedJob.original_job_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Là bản gửi lại từ:</span>
                      <span className="font-mono text-amber-300 text-xs truncate max-w-[200px]" title={selectedJob.original_job_id}>
                        {selectedJob.original_job_id}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Người nhận & Trạng thái</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tên người nhận:</span>
                    <span className="text-slate-200 font-medium">{selectedJob.recipient_name || 'Không rõ'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-slate-200">{selectedJob.recipient_email}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-400">Trạng thái:</span>
                    <div>{renderStatusBadge(selectedJob.status)}</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Số lần thử:</span>
                    <span className="font-mono text-slate-200">{selectedJob.attempt_count} / {selectedJob.max_attempts}</span>
                  </div>
                </div>
              </div>

              {/* Errors or Blocked reason */}
              {selectedJob.blocked_reason && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
                  <strong>Lý do khóa (Blocked Reason):</strong> {selectedJob.blocked_reason}
                </div>
              )}
              {selectedJob.last_error_message && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                  <strong>Lỗi lần thử gần nhất:</strong> {selectedJob.last_error_message}
                </div>
              )}

              {/* Payload Data */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase">Payload dữ liệu dựng email</div>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
              </div>

              {/* Attempts History */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase flex items-center justify-between">
                  <span>Lịch sử các lần xử lý (Attempts)</span>
                  <span className="text-indigo-400 font-normal">{jobAttempts.length} lần thử</span>
                </div>

                {loadingDetail ? (
                  <div className="text-center py-6 text-slate-500 text-sm">Đang tải lịch sử...</div>
                ) : jobAttempts.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-sm bg-slate-950/40 rounded-xl border border-slate-800">
                    Chưa có lịch sử lần thử nào được ghi nhận.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {jobAttempts.map((att) => (
                      <div key={att.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300">Lần thử #{att.attempt_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            att.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                          }`}>
                            {att.status}
                          </span>
                        </div>
                        <div className="text-slate-400 flex justify-between">
                          <span>Bắt đầu: {new Date(att.started_at).toLocaleString('vi-VN')}</span>
                          {att.finished_at && <span>Kết thúc: {new Date(att.finished_at).toLocaleString('vi-VN')}</span>}
                        </div>
                        {att.error_message && (
                          <div className="text-red-400 mt-1 font-mono bg-red-950/30 p-2 rounded border border-red-900/40">
                            {att.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                {['BLOCKED', 'RETRY_WAIT', 'DEAD_LETTER'].includes(selectedJob.status) && (
                  <button
                    onClick={() => {
                      handleRetryJob(selectedJob.id);
                    }}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition flex items-center gap-2 shadow-lg shadow-amber-600/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Thử lại ngay (Retry)
                  </button>
                )}
                {selectedJob.status === 'SENT' && (
                  <button
                    onClick={() => {
                      handleResendJob(selectedJob.id);
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Send className="w-4 h-4" />
                    Gửi lại (Resend)
                  </button>
                )}
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
