import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course, Lead, AffiliateProfile } from '../../types';
import {
  Users,
  Award,
  BookOpen,
  DollarSign,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Search,
  History,
  FileText,
  UserCheck,
  Check,
  X,
} from 'lucide-react';

import { AffiliateDetailView } from './AffiliateDetailView';
import { CourseListView } from './CourseListView';

interface AdminPortalProps {
  currentUser?: any;
  currentPath?: string;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser, currentPath = '/admin' }) => {
  const [activeTab, setActiveTab] = useState<'affiliates' | 'courses' | 'leads' | 'reconcile' | 'rewards' | 'audit'>('affiliates');
  const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Status message from API
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reconcile modal state
  const [reconcileModalLead, setReconcileModalLead] = useState<Lead | null>(null);
  const [admissionCode, setAdmissionCode] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [tuitionFee, setTuitionFee] = useState('14500000');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [staffNote, setStaffNote] = useState('');

  // Void modal state
  const [voidModalLead, setVoidModalLead] = useState<Lead | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // History modal state
  const [historyModalData, setHistoryModalData] = useState<{ lead: Lead; history: any } | null>(null);

  // Reject reward modal state
  const [rejectRewardId, setRejectRewardId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Affiliates list state & pagination
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [affiliatesError, setAffiliatesError] = useState<string | null>(null);

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const clean = currentPath.split('?')[0].split('#')[0];
    if (clean === '/admin/courses') setActiveTab('courses');
    else if (clean === '/admin/leads') setActiveTab('leads');
    else if (clean === '/admin/reconcile') setActiveTab('reconcile');
    else if (clean === '/admin/rewards') setActiveTab('rewards');
    else if (clean === '/admin/audit') setActiveTab('audit');
    else if (clean === '/admin/affiliates') setActiveTab('affiliates');
    else if (clean === '/admin') setActiveTab('affiliates');
  }, [currentPath]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadAffiliates();
  }, [debouncedSearch, statusFilter, page, limit]);

  const loadAffiliates = async () => {
    setAffiliatesLoading(true);
    setAffiliatesError(null);
    try {
      const res = await api.getAdminAffiliates({
        search: debouncedSearch,
        status: statusFilter,
        page,
        limit,
      });
      if (res.success) {
        setAffiliates(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setAffiliatesError(res.error || 'Lỗi tải dữ liệu cộng tác viên');
      }
    } catch (err: any) {
      setAffiliatesError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setAffiliatesLoading(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [coursesRes, leadsRes, rewRes, auditRes] = await Promise.all([
        api.getAdminCourses(),
        api.getAdminLeads(),
        api.getAdminRewards(),
        api.getAdminAuditLogs(),
      ]);

      if (coursesRes.success) setCourses(coursesRes.data);
      if (leadsRes.success) setLeads(leadsRes.data);
      if (rewRes.success) setRewards(rewRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err: any) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
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

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setApiFeedback({ type, message });
    setTimeout(() => setApiFeedback(null), 5000);
  };

  // 1. Duyệt CTV
  const handleUpdateAffiliateStatus = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REJECTED') => {
    try {
      const res = await api.updateAffiliateStatus(id, status, 'Xử lý bởi Ban Tuyển sinh');
      if (res.success) {
        showFeedback('success', res.message || `Đã đổi trạng thái CTV sang ${status}`);
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Thao tác thất bại');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 2. Cập nhật Lead counseling status
  const handleUpdateLeadCounseling = async (leadId: string, status: string, note?: string) => {
    try {
      const res = await api.updateCounselingStatus(leadId, status, note);
      if (res.success) {
        showFeedback('success', res.message || 'Cập nhật tiến độ tư vấn thành công!');
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Lỗi cập nhật');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 3. Thực hiện đối soát (Reconcile)
  const handleSubmitReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileModalLead) return;

    if (!admissionCode.trim() || !tuitionFee) {
      showFeedback('error', 'Vui lòng nhập mã hồ sơ và học phí thực thu.');
      return;
    }

    try {
      const res = await api.reconcileLead(reconcileModalLead.id, {
        external_admission_code: admissionCode.trim(),
        external_student_code: studentCode.trim() || undefined,
        tuition_fee_collected: Number(tuitionFee),
        receipt_number: receiptNumber.trim() || undefined,
        tuition_paid_at: new Date(paidAt).toISOString(),
        staff_note: staffNote.trim() || undefined,
      });

      if (res.success) {
        showFeedback('success', res.message || 'Đối soát thành công!');
        setReconcileModalLead(null);
        setAdmissionCode('');
        setStudentCode('');
        setReceiptNumber('');
        setStaffNote('');
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Đối soát thất bại');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 4. Hủy ghép đối soát có lý do
  const handleSubmitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModalLead) return;

    if (!voidReason.trim()) {
      showFeedback('error', 'Bắt buộc phải nhập lý do hủy ghép đối soát.');
      return;
    }

    try {
      const res = await api.voidReconciliation(voidModalLead.id, voidReason.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Hủy ghép thành công!');
        setVoidModalLead(null);
        setVoidReason('');
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Hủy ghép thất bại');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 5. Xem lịch sử
  const handleViewHistory = async (lead: Lead) => {
    try {
      const res = await api.getLeadHistory(lead.id);
      if (res.success) {
        setHistoryModalData({ lead, history: res.data });
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 6. Phê duyệt thưởng
  const handleApproveReward = async (rewardId: string) => {
    try {
      const res = await api.approveReward(rewardId);
      if (res.success) {
        showFeedback('success', res.message || 'Phê duyệt thưởng 500.000 VNĐ thành công!');
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Lỗi phê duyệt');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  // 7. Từ chối thưởng
  const handleSubmitRejectReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRewardId || !rejectionReason.trim()) {
      showFeedback('error', 'Bắt buộc phải nhập lý do từ chối.');
      return;
    }

    try {
      const res = await api.rejectReward(rejectRewardId, rejectionReason.trim());
      if (res.success) {
        showFeedback('success', res.message || 'Đã từ chối duyệt thưởng');
        setRejectRewardId(null);
        setRejectionReason('');
        loadAllData();
      } else {
        showFeedback('error', res.error || 'Lỗi xử lý');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const userEmail = currentUser?.email || 'admin@sthc.edu.vn';

  const cleanPath = currentPath.split('?')[0].split('#')[0];
  if (cleanPath === '/admin/courses') {
    return <CourseListView currentUser={currentUser} />;
  }

  const affiliateDetailMatch = currentPath.match(/^\/admin\/affiliates\/([a-f0-9-]+)$/i);
  if (affiliateDetailMatch) {
    return (
      <AffiliateDetailView
        affiliateId={affiliateDetailMatch[1]}
        currentUser={currentUser}
        onBack={() => {
          window.history.pushState({}, '', '/admin/affiliates');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        onStatusUpdated={() => {
          loadAffiliates();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Admin Identity & Clean Notice */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider">
                Cổng Quản Trị Hệ Thống STHC
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Quản trị hệ thống CTV
            </h1>
            <p className="text-xs text-slate-300">
              Tài khoản đang đăng nhập: <strong className="text-amber-400 font-mono">{userEmail}</strong>
            </p>
          </div>
        </div>

        {/* API Feedback Banner */}
        {apiFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
              apiFeedback.type === 'success'
                ? 'bg-emerald-900/60 border border-emerald-500 text-emerald-200'
                : 'bg-rose-900/60 border border-rose-500 text-rose-200'
            }`}
          >
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{apiFeedback.message}</span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: QUẢN LÝ CỘNG TÁC VIÊN (A1.1) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'affiliates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Quản Lý Cộng Tác Viên Tuyển Sinh</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách đại sứ và cộng tác viên tuyển sinh chính thức của trường
              </p>
            </div>
          </div>

          {/* TOOLBAR: Search, Status Filter, Reset, Limit */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo họ tên, email, SĐT, mã CTV..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING_REVIEW">Chờ duyệt (PENDING_REVIEW)</option>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
                <option value="REJECTED">Từ chối (REJECTED)</option>
              </select>

              {/* Clear filters */}
              {(searchInput || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                    setStatusFilter('ALL');
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xóa bộ lọc</span>
                </button>
              )}
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-2 text-xs text-slate-600 justify-end">
              <span>Hiển thị:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>
          </div>

          {/* TABLE CONTENT */}
          {affiliatesError ? (
            <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-xs font-medium text-rose-900">{affiliatesError}</p>
              <button
                onClick={loadAffiliates}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <span>Thử lại</span>
              </button>
            </div>
          ) : affiliatesLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Đang tải dữ liệu cộng tác viên...</p>
            </div>
          ) : affiliates.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Không tìm thấy cộng tác viên</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {debouncedSearch || statusFilter !== 'ALL'
                  ? 'Không có hồ sơ CTV nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại.'
                  : 'Chưa có cộng tác viên nào đăng ký trong hệ thống.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Mã CTV</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Trạng thái CTV</th>
                    <th className="py-3 px-4">Xác thực email</th>
                    <th className="py-3 px-4 text-right">Ngày đăng ký</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {affiliates.map((aff: any, index: number) => {
                    const stt = (pagination.page - 1) * pagination.limit + index + 1;
                    const fullName = aff.profiles?.full_name || aff.full_name || '—';
                    const email = aff.profiles?.email || aff.email || '—';
                    const phone = aff.profiles?.phone || aff.phone || '—';
                    const code = aff.affiliate_code || '—';
                    const status = aff.status || 'PENDING_REVIEW';
                    const isVerified = aff.is_email_verified;
                    const createdAt = aff.created_at;

                    return (
                      <tr key={aff.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-mono text-slate-500">{stt}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-900">{code}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{fullName}</td>
                        <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]" title={email}>
                          {email}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{phone}</td>
                        <td className="py-3 px-4">
                          {status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              Hoạt động (ACTIVE)
                            </span>
                          )}
                          {status === 'PENDING_REVIEW' && (
                            <span className="text-amber-700 font-semibold">Chờ duyệt (PENDING)</span>
                          )}
                          {status === 'REJECTED' && (
                            <span className="text-rose-700 font-semibold">Từ chối (REJECTED)</span>
                          )}
                          {status === 'SUSPENDED' && (
                            <span className="text-slate-500 font-semibold">Tạm ngưng (SUSPENDED)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isVerified ? (
                            <span className="text-emerald-700 font-medium">Đã xác thực</span>
                          ) : (
                            <span className="text-slate-400 font-medium">Chưa xác thực</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                          {formatDateVN(createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              window.history.pushState({}, '', `/admin/affiliates/${aff.id}`);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-900 font-semibold rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 text-xs shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Xem chi tiết
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div>
                Hiển thị{' '}
                <strong className="text-slate-900">
                  {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </strong>{' '}
                / <strong className="text-slate-900">{pagination.total}</strong> CTV
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Trang trước
                </button>

                <span className="px-2 font-medium text-slate-700">
                  Trang {pagination.page} / {pagination.totalPages || 1}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: QUẢN LÝ KHÓA HỌC (YÊU CẦU A2.1) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'courses' && (
        <CourseListView currentUser={currentUser} />
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: TIẾP NHẬN & CẬP NHẬT LEAD */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Danh Sách Ứng Viên Đăng Ký Tư Vấn (Leads)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cán bộ tuyển sinh xem đầy đủ số điện thoại gốc và cập nhật tiến độ tư vấn
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4">Nguồn CTV</th>
                  <th className="py-3 px-4">Khung giờ tiện</th>
                  <th className="py-3 px-4">Tiến độ tư vấn</th>
                  <th className="py-3 px-4">Đối soát</th>
                  <th className="py-3 px-4 text-right">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{l.full_name}</div>
                      <div className="text-[11px] text-slate-400">{l.email || l.province}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {l.phone}
                    </td>
                    <td className="py-3 px-4">
                      {l.affiliate_code_captured ? (
                        <span className="font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          {l.affiliate_code_captured}
                        </span>
                      ) : (
                        <span className="text-slate-400">Tự nhiên</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {l.preferred_contact_time || 'Giờ hành chính'}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={l.counseling_status}
                        onChange={(e) => handleUpdateLeadCounseling(l.id, e.target.value)}
                        className="p-1 border border-slate-200 rounded text-xs bg-white font-medium"
                      >
                        <option value="NEW">NEW (Mới)</option>
                        <option value="CONTACTED">CONTACTED (Đã gọi)</option>
                        <option value="CONSULTING">CONSULTING (Đang tư vấn)</option>
                        <option value="UNREACHABLE">UNREACHABLE (Không liên lạc được)</option>
                        <option value="LOST">LOST (Hủy)</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      {l.reconciliation_status === 'MATCHED_VALID' ? (
                        <span className="text-emerald-700 font-semibold">Đã đối soát</span>
                      ) : (
                        <span className="text-slate-400">Chưa đối soát</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewHistory(l)}
                        className="px-2.5 py-1 text-xs text-blue-900 hover:bg-blue-50 rounded transition-colors font-medium"
                      >
                        Lịch sử
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: ĐỐI SOÁT HỒ SƠ & HỌC PHÍ */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'reconcile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Nghiệp Vụ Đối Soát Thủ Công Hồ Sơ Nhập Học</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập mã hồ sơ tuyển sinh ngoại bộ, số phiếu thu và số tiền học phí thực thu để sinh thưởng 500.000 VNĐ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Thí sinh</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4">Mã CTV</th>
                  <th className="py-3 px-4">Trạng thái đối soát</th>
                  <th className="py-3 px-4">Trạng thái thưởng</th>
                  <th className="py-3 px-4 text-right">Hành động đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{l.full_name}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{l.phone}</td>
                    <td className="py-3 px-4 font-mono text-amber-800">
                      {l.affiliate_code_captured || 'Tự nhiên'}
                    </td>
                    <td className="py-3 px-4">
                      {l.reconciliation_status === 'MATCHED_VALID' ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          MATCHED_VALID
                        </span>
                      ) : (
                        <span className="text-slate-400">NOT_RECONCILED</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      {l.reward_status === 'APPROVED' && <span className="text-emerald-700">APPROVED (500k)</span>}
                      {l.reward_status === 'PENDING_APPROVAL' && <span className="text-amber-700">PENDING (500k)</span>}
                      {l.reward_status === 'NONE' && <span className="text-slate-400">NONE</span>}
                      {l.reward_status === 'VOIDED' && <span className="text-rose-700">VOIDED</span>}
                      {l.reward_status === 'REJECTED' && <span className="text-rose-700">REJECTED</span>}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {l.reconciliation_status !== 'MATCHED_VALID' ? (
                        <button
                          onClick={() => {
                            setReconcileModalLead(l);
                            setAdmissionCode(`STHC-2026-TS-${Math.floor(1000 + Math.random() * 9000)}`);
                            setReceiptNumber(`BL-2026-09-${Math.floor(1000 + Math.random() * 9000)}`);
                          }}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                        >
                          Đối soát khớp hồ sơ
                        </button>
                      ) : (
                        <button
                          onClick={() => setVoidModalLead(l)}
                          className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-xs font-semibold transition-colors flex items-center gap-1 inline-flex"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Hủy ghép nhầm</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleViewHistory(l)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                      >
                        Lịch sử
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: DUYỆT THƯỞNG 500K & XUẤT BÁO CÁO */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'rewards' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Phê Duyệt Khoản Thưởng Tuyển Sinh (500.000 VNĐ)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trưởng bộ phận Tuyển sinh / Admin thẩm định chứng từ phiếu thu và duyệt chi trả
              </p>
            </div>

            <a
              href={api.getExportRewardsCsvUrl()}
              download="Bang_Ke_Thuong_CTV_STHC_Ketoan.csv"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Bảng Kê Cho Kế Toán (CSV)</span>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Mã hồ sơ trường</th>
                  <th className="py-3 px-4">Cộng tác viên thụ hưởng</th>
                  <th className="py-3 px-4">Số CCCD</th>
                  <th className="py-3 px-4">Mức thưởng</th>
                  <th className="py-3 px-4">Trạng thái thưởng</th>
                  <th className="py-3 px-4 text-right">Quyết định phê duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewards.map((rew) => (
                  <tr key={rew.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {rew.external_admission_code || 'STHC-2026-TS-0188'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{rew.affiliate_name || 'Trần Thị Thu Thảo'}</div>
                      <div className="text-[11px] font-mono text-amber-800">{rew.affiliate_code || 'STHCCTV1088'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {rew.id_card_number || '079201001234'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                      {new Intl.NumberFormat('vi-VN').format(rew.amount || 500000)} VNĐ
                    </td>
                    <td className="py-3 px-4">
                      {rew.status === 'APPROVED' && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ĐÃ DUYỆT (APPROVED)
                        </span>
                      )}
                      {rew.status === 'PENDING_APPROVAL' && (
                        <span className="text-amber-700 font-semibold">
                          CHỜ DUYỆT (PENDING)
                        </span>
                      )}
                      {rew.status === 'REJECTED' && (
                        <span className="text-rose-700 font-semibold">TỪ CHỐI (REJECTED)</span>
                      )}
                      {rew.status === 'VOIDED' && (
                        <span className="text-slate-500 font-semibold">HỦY GHÉP (VOIDED)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {rew.status === 'PENDING_APPROVAL' && (
                        <>
                          <button
                            onClick={() => handleApproveReward(rew.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                          >
                            Duyệt thưởng
                          </button>
                          <button
                            onClick={() => setRejectRewardId(rew.id)}
                            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-xs font-semibold transition-colors"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                      {rew.status === 'APPROVED' && (
                        <span className="text-slate-400 text-xs">Đã chốt thẩm định</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 6: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Nhật Ký Kiểm Toán Toàn Vẹn Hệ Thống (Audit Trail)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ghi nhận tự động mọi thao tác nâng quyền, đối soát, hủy ghép và duyệt thưởng
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Hành động (Action)</th>
                  <th className="py-3 px-4">Bảng tác động</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Lý do / Diễn giải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 tabular-nums">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {log.entity_name}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {log.actor_name || log.profiles?.full_name || 'Admin Tuyển Sinh'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {log.reason || 'Thao tác nghiệp vụ hệ thống'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* RECONCILE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {reconcileModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">ĐỐI SOÁT HỒ SƠ & TỰ ĐỘNG SINH THƯỞNG 500K</h3>
              <button onClick={() => setReconcileModalLead(null)} className="p-1 rounded text-blue-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReconcile} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-blue-50 rounded-xl space-y-1">
                <div className="font-bold text-blue-950 text-sm">{reconcileModalLead.full_name}</div>
                <div className="text-slate-600">Số điện thoại: <strong className="font-mono">{reconcileModalLead.phone}</strong></div>
                <div className="text-slate-600">Mã CTV giới thiệu: <strong className="font-mono text-amber-800">{reconcileModalLead.affiliate_code_captured || 'Không có'}</strong></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Mã hồ sơ tuyển sinh ngoại bộ (trên phần mềm trường) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={admissionCode}
                  onChange={(e) => setAdmissionCode(e.target.value)}
                  placeholder="STHC-2026-TS-0492"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Mã học viên (nếu có)</label>
                  <input
                    type="text"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    placeholder="26BA0115"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Số biên lai / phiếu thu</label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="BL-2026-09-1842"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Học phí thực thu (VND) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Ngày đóng học phí <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Ghi chú đối soát</label>
                <textarea
                  rows={2}
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  placeholder="Đã đối chiếu khớp hồ sơ giấy và phiếu thu học phí gốc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReconcileModalLead(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  Xác nhận đối soát & Sinh thưởng 500k
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VOID MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {voidModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <RotateCcw className="w-5 h-5" />
              <span>HỦY GHÉP ĐỐI SOÁT DO SAI SÓT (BẢO TOÀN LỊCH SỬ)</span>
            </div>

            <p className="text-slate-600 leading-relaxed">
              Bạn đang hủy ghép đối soát cho ứng viên <strong>{voidModalLead.full_name}</strong>. Thao tác này sẽ chuyển khoản thưởng liên kết sang trạng thái <strong>VOIDED</strong> (không xóa để phục vụ kiểm toán) và giải phóng mã hồ sơ để đối soát lại.
            </p>

            <form onSubmit={handleSubmitVoid} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do hủy ghép bắt buộc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ví dụ: Nhập nhầm mã sinh viên của lớp Kỹ thuật Bếp sang Quản trị Khách sạn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidModalLead(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  Xác nhận hủy ghép
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* HISTORY MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {historyModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Lịch Sử Đối Soát & Thưởng: {historyModalData.lead.full_name}
              </h3>
              <button onClick={() => setHistoryModalData(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800 text-xs mb-2">Lịch sử đối soát:</h4>
                <div className="space-y-2">
                  {historyModalData.history?.reconciliations?.length > 0 ? (
                    historyModalData.history.reconciliations.map((r: any) => (
                      <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex justify-between font-mono font-bold text-blue-900">
                          <span>Mã HS: {r.external_admission_code}</span>
                          <span className={r.reconciliation_status === 'VOIDED' ? 'text-rose-600' : 'text-emerald-600'}>
                            {r.reconciliation_status}
                          </span>
                        </div>
                        <div className="text-slate-600">Học phí: {new Intl.NumberFormat('vi-VN').format(r.tuition_fee_collected)}đ · Biên lai: {r.receipt_number || 'N/A'}</div>
                        {r.void_reason && <div className="text-rose-700">Lý do hủy: {r.void_reason}</div>}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">Chưa có bản ghi đối soát</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 text-xs mb-2">Lịch sử bản ghi thưởng:</h4>
                <div className="space-y-2">
                  {historyModalData.history?.rewards?.length > 0 ? (
                    historyModalData.history.rewards.map((rw: any) => (
                      <div key={rw.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>Số tiền: {new Intl.NumberFormat('vi-VN').format(rw.amount)}đ</span>
                          <span className={rw.status === 'APPROVED' ? 'text-emerald-600' : rw.status === 'VOIDED' ? 'text-rose-600' : 'text-amber-600'}>
                            {rw.status}
                          </span>
                        </div>
                        {rw.rejection_reason && <div className="text-rose-700">Lý do từ chối: {rw.rejection_reason}</div>}
                        {rw.void_reason && <div className="text-rose-700">Lý do hủy: {rw.void_reason}</div>}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">Chưa có bản ghi thưởng</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setHistoryModalData(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* REJECT REWARD MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {rejectRewardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-rose-700 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              TỪ CHỐI PHÊ DUYỆT THƯỞNG TUYỂN SINH
            </h3>

            <form onSubmit={handleSubmitRejectReward} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Lý do từ chối bắt buộc <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ví dụ: Học viên đã nộp hồ sơ tại trường trước ngày tạo lead..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectRewardId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
