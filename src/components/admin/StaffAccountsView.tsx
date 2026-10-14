import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { StaffAccountItem, StaffAccountDetail, StaffPermissionGroupInfo } from '../../types';
import { formatDateTimeShortVi } from '../../utils/dateFormatter';
import {
  UserCheck,
  Users,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Shield,
  ExternalLink,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Phone,
  Mail,
  Award,
  Layers,
  FileCheck2,
  BookOpen,
  LayoutDashboard,
  Bell,
  History,
  Info,
} from 'lucide-react';

interface StaffAccountsViewProps {
  currentUser?: {
    id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
  onNavigate?: (path: string) => void;
}

export const StaffAccountsView: React.FC<StaffAccountsViewProps> = ({ currentUser, onNavigate }) => {
  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data & Loading State
  const [staffList, setStaffList] = useState<StaffAccountItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Group Catalog
  const [permissionGroups, setPermissionGroups] = useState<Array<{ code: string; name: string }>>([]);

  // Modals State
  const [detailModalStaffId, setDetailModalStaffId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<StaffAccountDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'permissions' | 'history'>('overview');

  const [toggleStatusTarget, setToggleStatusTarget] = useState<StaffAccountItem | null>(null);
  const [toggleReason, setToggleReason] = useState('');
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Groups Catalog
  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await api.getPermissionGroups();
        if (res.success && res.data) {
          setPermissionGroups(res.data);
        }
      } catch (e) {
        console.warn('Failed to load permission groups catalog', e);
      }
    }
    loadGroups();
  }, []);

  // Fetch Staff Accounts
  const fetchStaffAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await api.getStaffAccounts({
        page,
        limit,
        search: debouncedSearch,
        status: statusFilter,
        group: groupFilter,
      });

      if (res.success) {
        setStaffList(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setError(res.error || 'Lỗi tải danh sách tài khoản nhân viên.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, groupFilter]);

  useEffect(() => {
    fetchStaffAccounts();
  }, [fetchStaffAccounts]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Open Detail Modal
  const handleOpenDetail = async (staffId: string) => {
    setDetailModalStaffId(staffId);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const res = await api.getStaffAccountDetail(staffId);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        showFeedback('error', res.error || 'Không thể tải chi tiết nhân viên.');
        setDetailModalStaffId(null);
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối khi tải chi tiết.');
      setDetailModalStaffId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close Detail Modal
  const handleCloseDetail = () => {
    setDetailModalStaffId(null);
    setDetailData(null);
  };

  // Open Toggle Status Modal
  const handleOpenToggleStatus = (staff: StaffAccountItem) => {
    setToggleStatusTarget(staff);
    setToggleReason('');
    setToggleError(null);
  };

  // Submit Toggle Status
  const handleSubmitToggleStatus = async () => {
    if (!toggleStatusTarget) return;

    const trimmed = toggleReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setToggleError('Bắt buộc phải nhập lý do hợp lệ (tối thiểu 5 ký tự).');
      return;
    }

    const nextState = !toggleStatusTarget.is_active;
    setToggleSubmitting(true);
    setToggleError(null);

    try {
      const res = await api.toggleStaffActiveStatus(toggleStatusTarget.id, {
        is_active: nextState,
        reason: trimmed,
      });

      if (res.success) {
        showFeedback(
          'success',
          res.message || (nextState ? 'Mở khóa tài khoản thành công!' : 'Đã khóa tài khoản thành công!')
        );
        setToggleStatusTarget(null);
        // Refresh detail if open
        if (detailModalStaffId === toggleStatusTarget.id) {
          handleOpenDetail(toggleStatusTarget.id);
        }
        fetchStaffAccounts(true);
      } else {
        setToggleError(res.error || 'Không thể thay đổi trạng thái tài khoản.');
      }
    } catch (err: any) {
      setToggleError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setToggleSubmitting(false);
    }
  };

  // Quick navigation handlers
  const handleNavigateToPermissions = (staffId?: string) => {
    const path = staffId ? `/admin/permissions?tab=staff&staff_id=${staffId}` : '/admin/permissions';
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleNavigateToAffiliate = (affiliateId: string) => {
    const path = `/admin/affiliates/${affiliateId}`;
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setGroupFilter('all');
    setPage(1);
  };

  // Computed summary stats from current table data
  const stats = useMemo(() => {
    const total = pagination.total || staffList.length;
    const active = staffList.filter((s) => s.is_active).length;
    const disabled = staffList.filter((s) => !s.is_active).length;
    const noGroups = staffList.filter((s) => !s.permission_groups || s.permission_groups.length === 0).length;
    return { total, active, disabled, noGroups };
  }, [pagination.total, staffList]);

  // Denied access for non-admin
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 mt-12 space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold">Truy cập bị từ chối</h2>
        <p className="text-xs text-rose-700">
          Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập module Quản lý Tài khoản nhân viên.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Tài Khoản Nhân Viên</h1>
              <p className="text-xs text-slate-500">
                Quản lý danh sách Cán bộ Tuyển sinh (Staff), nhóm quyền chuyên biệt và trạng thái hoạt động.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => handleNavigateToPermissions()}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-indigo-200 shadow-xs"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Quản trị Phân quyền</span>
          </button>

          <button
            type="button"
            onClick={() => fetchStaffAccounts(true)}
            disabled={loading || refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tổng số Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cán bộ tuyển sinh</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium">Đang hoạt động</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.active}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tài khoản mở</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-medium">Đã vô hiệu hóa</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.disabled}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tài khoản khóa</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-xs font-medium">Chưa gán nhóm</span>
            <ShieldAlert className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats.noGroups}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Chỉ có quyền nền</div>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH & FILTERS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, email, SĐT, mã CTV..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="disabled">Đã vô hiệu hóa</option>
            </select>
          </div>

          {/* Group Filter */}
          <div className="sm:col-span-3">
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700"
            >
              <option value="all">Tất cả nhóm quyền</option>
              <option value="none">Chưa gán nhóm quyền</option>
              {permissionGroups.map((g) => (
                <option key={g.code} value={g.code}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-1 flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              disabled={!search && statusFilter === 'all' && groupFilter === 'all'}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-center"
              title="Xóa bộ lọc"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearch || statusFilter !== 'all' || groupFilter !== 'all') && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Đang lọc:</span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Từ khóa: "{debouncedSearch}"
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch('')} />
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Trạng thái: {statusFilter === 'active' ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
              </span>
            )}
            {groupFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                Nhóm:{' '}
                {groupFilter === 'none'
                  ? 'Chưa gán nhóm'
                  : permissionGroups.find((g) => g.code === groupFilter)?.name || groupFilter}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setGroupFilter('all')} />
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 ml-1 font-semibold"
            >
              Đặt lại tất cả
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && !refreshing ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <div className="text-sm font-bold text-slate-900">Không thể tải dữ liệu</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchStaffAccounts()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
            >
              Thử lại
            </button>
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-900">
              {debouncedSearch || statusFilter !== 'all' || groupFilter !== 'all'
                ? 'Không tìm thấy tài khoản nhân viên phù hợp'
                : 'Chưa có tài khoản nhân viên nào'}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {debouncedSearch || statusFilter !== 'all' || groupFilter !== 'all'
                ? 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh các bộ lọc phía trên.'
                : 'Hệ thống chưa ghi nhận tài khoản Cán bộ Tuyển sinh (Staff). Quản trị viên có thể vào màn hình Quản lý CTV để nâng quyền cho các tài khoản đủ điều kiện.'}
            </p>
            {debouncedSearch || statusFilter !== 'all' || groupFilter !== 'all' ? (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Xóa bộ lọc
              </button>
            ) : (
              <button
                onClick={() => onNavigate ? onNavigate('/admin/affiliates') : (window.location.href = '/admin/affiliates')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Đến Quản lý CTV
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto min-w-[950px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">STT</th>
                  <th className="py-3 px-4 min-w-[220px]">Họ và tên & Email</th>
                  <th className="py-3 px-3.5 w-32">Số điện thoại</th>
                  <th className="py-3 px-3.5 w-32">Mã CTV</th>
                  <th className="py-3 px-3.5 w-44">Trạng thái & Quyền nền</th>
                  <th className="py-3 px-4 min-w-[200px]">Nhóm quyền chuyên biệt</th>
                  <th className="py-3 px-3.5 w-36">Đăng nhập gần nhất</th>
                  <th className="py-3 px-3.5 w-28">Ngày tạo</th>
                  <th className="py-3 px-4 w-36 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {staffList.map((staff, idx) => {
                  const stt = (pagination.page - 1) * pagination.limit + idx + 1;
                  const hasAffiliate = !!staff.affiliate?.affiliate_code;
                  const activeGroups = staff.permission_groups || [];

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* STT */}
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {stt}
                      </td>

                      {/* Họ tên & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {staff.full_name
                              ? staff.full_name.charAt(0).toUpperCase()
                              : staff.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">
                              {staff.full_name || 'Chưa đặt họ tên'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SĐT */}
                      <td className="py-3 px-3.5 text-slate-700">
                        {staff.phone ? (
                          <span className="font-mono text-[11px]">{staff.phone}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* Mã CTV */}
                      <td className="py-3 px-3.5">
                        {hasAffiliate ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold">
                            {staff.affiliate?.affiliate_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Trạng thái & Quyền nền */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1">
                          <div>
                            {staff.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Đã vô hiệu hóa
                              </span>
                            )}
                          </div>
                          <div>
                            {staff.is_active ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-medium"
                                title="Sở hữu quyền tuyển sinh cốt lõi: Khóa học, Leads, Đối soát, CTV, Dashboard"
                              >
                                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                                Quyền nền Staff
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px]"
                                title="Toàn bộ quyền tạm thời bị khóa theo tài khoản"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                Vô hiệu lực (Đã khóa)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nhóm quyền chuyên biệt */}
                      <td className="py-3 px-4">
                        {activeGroups.length === 0 ? (
                          <div className="text-slate-400 italic text-[11px] flex items-center gap-1">
                            <span>Chưa gán nhóm quyền</span>
                            <span
                              className="text-slate-400 cursor-help"
                              title="Tài khoản vẫn có đầy đủ quyền nền Staff"
                            >
                              <Info className="w-3 h-3" />
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activeGroups.slice(0, 2).map((g) => (
                              <span
                                key={g.code}
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                                  staff.is_active
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 opacity-60'
                                }`}
                                title={!staff.is_active ? 'Tạm ngưng do tài khoản đã bị khóa' : g.name}
                              >
                                {g.name}
                                {!staff.is_active && ' (Tạm ngưng)'}
                              </span>
                            ))}
                            {activeGroups.length > 2 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] cursor-help border border-slate-200"
                                title={activeGroups.map((g) => g.name).join(', ')}
                              >
                                +{activeGroups.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Đăng nhập gần nhất */}
                      <td className="py-3 px-3.5">
                        {staff.last_sign_in_at ? (
                          <span className="font-mono text-[11px] text-slate-700">
                            {formatDateTimeShortVi(staff.last_sign_in_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa đăng nhập</span>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                        {formatDateTimeShortVi(staff.created_at)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(staff.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Xem chi tiết tài khoản nhân viên"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Mở hồ sơ CTV nếu có */}
                          {hasAffiliate && staff.affiliate?.id && (
                            <button
                              type="button"
                              onClick={() => handleNavigateToAffiliate(staff.affiliate!.id)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mở hồ sơ CTV tại /admin/affiliates"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}

                          {/* Phân quyền */}
                          <button
                            type="button"
                            onClick={() => handleNavigateToPermissions(staff.id)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Quản lý phân quyền tại /admin/permissions"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenToggleStatus(staff)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              staff.is_active
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={staff.is_active ? 'Khóa tài khoản Staff' : 'Mở khóa tài khoản Staff'}
                          >
                            {staff.is_active ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. SERVER-SIDE PAGINATION */}
        {!loading && staffList.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Hiển thị{' '}
                <strong>
                  {Math.min(
                    pagination.total,
                    (pagination.page - 1) * pagination.limit + 1
                  )}
                </strong>{' '}
                -{' '}
                <strong>
                  {Math.min(pagination.total, pagination.page * pagination.limit)}
                </strong>{' '}
                trên tổng số <strong>{pagination.total}</strong> nhân viên
              </span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="py-1 px-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] font-bold">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. DETAIL MODAL / DRAWER */}
      {detailModalStaffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-base">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Tài Khoản Nhân Viên</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {detailModalStaffId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {detailLoading || !detailData ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <RotateCcw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                <p>Đang tải chi tiết hồ sơ nhân viên...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Profile Overview Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                      {detailData.full_name
                        ? detailData.full_name.charAt(0).toUpperCase()
                        : detailData.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {detailData.full_name || 'Chưa đặt họ tên'}
                        {detailData.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Đã vô hiệu hóa
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-mono flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {detailData.email}
                        </span>
                        {detailData.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {detailData.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {detailData.affiliate && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCloseDetail();
                          handleNavigateToAffiliate(detailData.affiliate!.id);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-blue-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Hồ sơ CTV</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseDetail();
                        handleOpenToggleStatus(detailData);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                        detailData.is_active
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {detailData.is_active ? (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Khóa tài khoản</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>Mở khóa tài khoản</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-px text-xs font-bold">
                  <button
                    onClick={() => setDetailTab('overview')}
                    className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === 'overview'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Thông tin & Quyền nền</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('permissions')}
                    className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === 'permissions'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Nhóm quyền chuyên biệt ({detailData.permission_groups.length})</span>
                  </button>
                  <button
                    onClick={() => setDetailTab('history')}
                    className={`px-3.5 py-2 border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === 'history'
                        ? 'border-indigo-600 text-indigo-700 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Lịch sử kiểm toán ({detailData.role_history?.length || 0})</span>
                  </button>
                </div>

                {/* TAB 1: THÔNG TIN CHUNG & QUYỀN NỀN */}
                {detailTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Identification Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Mã CTV liên kết:</span>
                        {detailData.affiliate ? (
                          <span className="font-mono font-bold text-blue-700">
                            {detailData.affiliate.affiliate_code} ({detailData.affiliate.status})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Không có hồ sơ CTV</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Xác thực Email:</span>
                        {detailData.email_confirmed_at ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực (
                            {formatDateTimeShortVi(detailData.email_confirmed_at)})
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Chưa xác thực email</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Đăng nhập gần nhất:</span>
                        <span className="font-mono text-slate-800">
                          {detailData.last_sign_in_at
                            ? formatDateTimeShortVi(detailData.last_sign_in_at)
                            : 'Chưa từng đăng nhập'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Ngày tạo tài khoản:</span>
                        <span className="font-mono text-slate-800">
                          {formatDateTimeShortVi(detailData.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Baseline Permissions Section */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>KHỐI A: QUYỀN NỀN TẢNG THEO VAI TRÒ STAFF</span>
                        </div>
                        <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold border border-indigo-200">
                          profiles.role = 'staff'
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Quyền nền được cấp tự động ngay khi tài khoản được nâng vai trò Staff. Không cần gán nhóm
                        quyền trong bảng staff_permission_groups.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>1. Quản lý Cộng tác viên (A1)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Xem danh sách CTV, xét duyệt / từ chối hồ sơ CTV mới, tạm ngưng hoặc tái kích hoạt.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>2. Quản lý Khóa học tuyển sinh (A2)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Xem danh mục ngành nghề, cập nhật học phí dự kiến, đóng/mở nhận giới thiệu tuyển sinh.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>3. Khách hàng & Nhật ký chăm sóc (A3)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Tiếp nhận danh sách leads toàn hệ thống, cập nhật tiến độ tư vấn, ghi care notes.
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>4. Đối soát hồ sơ nhập học & học phí (A4)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Khớp nối mã hồ sơ nhập học chính thức, xác nhận học phí thực thu và hủy ghép đối soát.
                          </p>
                        </div>

                        <div className="sm:col-span-2 p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                            <span>5. Báo cáo & Dashboard Tuyển sinh (A9)</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Theo dõi số liệu tổng quan tuyển sinh, biểu đồ xu hướng tháng và bảng xếp hạng CTV.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: NHÓM QUYỀN CHUYÊN BIỆT */}
                {detailTab === 'permissions' && (
                  <div className="space-y-5">
                    {/* Active Permission Groups */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-purple-600" />
                          <span>KHỐI B: NHÓM QUYỀN CHUYÊN BIỆT ĐANG HOẠT ĐỘNG ({detailData.permission_groups.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseDetail();
                            handleNavigateToPermissions(detailData.id);
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Gán/Thu hồi tại Quản trị Phân quyền</span>
                        </button>
                      </div>

                      {detailData.permission_groups.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                          <p className="font-bold text-slate-700">Chưa được gán nhóm quyền chuyên biệt nào</p>
                          <p className="text-[11px]">
                            Nhân viên chỉ có quyền nền tuyển sinh (A1 - A4, A9). Không có quyền duyệt thù lao A5
                            hoặc đăng tin thông báo BQT C3.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {detailData.permission_groups.map((g) => (
                            <div
                              key={g.code}
                              className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-purple-900 text-xs">{g.name}</span>
                                <span className="font-mono text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                  {g.code}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-4">
                                {g.assigned_at && (
                                  <span>Gán lúc: {formatDateTimeShortVi(g.assigned_at)}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Effective Permissions (fn_get_user_permissions) */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>MÃ QUYỀN HIỆU LỰC CHI TIẾT ({detailData.effective_permissions.length})</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Được tổng hợp tự động qua hàm RPC <code>fn_get_user_permissions</code> dựa trên các nhóm quyền
                        đang hoạt động.
                      </p>

                      {detailData.effective_permissions.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-xl text-slate-400 italic text-[11px]">
                          0 mã quyền chuyên biệt (Chỉ có quyền nền tuyển sinh).
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {detailData.effective_permissions.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Deactivated Historical Groups */}
                    {detailData.deactivated_permission_groups.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-slate-400" />
                          <span>NHÓM QUYỀN ĐÃ THU HỒI TRONG QUÁ KHỨ ({detailData.deactivated_permission_groups.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {detailData.deactivated_permission_groups.map((dg, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-center justify-between text-slate-500"
                            >
                              <span>{dg.name} ({dg.code})</span>
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                Đã vô hiệu hóa
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: LỊCH SỬ BIẾN ĐỘNG (AUDIT LOGS) */}
                {detailTab === 'history' && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>NHẬT KÝ KIỂM TOÁN TÀI KHOẢN ({detailData.role_history?.length || 0} bản ghi)</span>
                    </div>

                    {!detailData.role_history || detailData.role_history.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic text-xs bg-slate-50 rounded-xl border border-slate-200">
                        Chưa có bản ghi kiểm toán nào liên quan đến tài khoản này.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detailData.role_history.map((log) => {
                          const isLock = log.action === 'STAFF_ACCOUNT_LOCKED';
                          const isUnlock = log.action === 'STAFF_ACCOUNT_UNLOCKED';
                          const isPromote = log.action === 'SYSTEM_ROLE_ASSIGNED';
                          const isRevoke = log.action === 'SYSTEM_ROLE_REVOKED';

                          let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                          if (isLock) badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          if (isUnlock) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (isPromote) badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                          if (isRevoke) badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                          return (
                            <div
                              key={log.id}
                              className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${badgeColor}`}>
                                  {log.action}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  {formatDateTimeShortVi(log.created_at)}
                                </span>
                              </div>

                              {log.reason && (
                                <p className="text-slate-700 font-medium">
                                  <span className="text-slate-400">Lý do:</span> {log.reason}
                                </p>
                              )}

                              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                                <span>Thực thể: {log.entity_name}</span>
                                {log.actor && (
                                  <span>Bởi: {log.actor.full_name || log.actor.email}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. TOGGLE ACTIVE STATUS MODAL */}
      {toggleStatusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div
              className={`p-5 border-b flex items-center justify-between ${
                toggleStatusTarget.is_active ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    toggleStatusTarget.is_active
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  {toggleStatusTarget.is_active ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {toggleStatusTarget.is_active ? 'Khóa Tài Khoản Nhân Viên' : 'Mở Khóa Tài Khoản Nhân Viên'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">{toggleStatusTarget.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToggleStatusTarget(null)}
                disabled={toggleSubmitting}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div
                className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                  toggleStatusTarget.is_active
                    ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                }`}
              >
                {toggleStatusTarget.is_active ? (
                  <>
                    <strong>Cảnh báo an toàn:</strong> Khi bị khóa, nhân viên này sẽ <strong>bị chặn đăng nhập ngay lập tức</strong> vào Cổng Quản trị. Toàn bộ hồ sơ CTV, mã giới thiệu, dữ liệu khách hàng (leads) và các nhóm quyền đã gán vẫn được bảo toàn nguyên vẹn trong hệ thống.
                  </>
                ) : (
                  <>
                    <strong>Khôi phục truy cập:</strong> Mở khóa tài khoản sẽ cho phép nhân viên này đăng nhập trở lại và tiếp tục thực thi các quyền hạn tuyển sinh đã được cấp.
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Lý do {toggleStatusTarget.is_active ? 'khóa' : 'mở khóa'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={toggleReason}
                  onChange={(e) => {
                    setToggleReason(e.target.value);
                    if (toggleError) setToggleError(null);
                  }}
                  placeholder="Nhập lý do chi tiết (tối thiểu 5 ký tự)..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={toggleSubmitting}
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Bắt buộc theo quy chuẩn kiểm toán A7-NV.4</span>
                  <span>{toggleReason.trim().length}/5 ký tự tối thiểu</span>
                </div>
              </div>

              {toggleError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{toggleError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setToggleStatusTarget(null)}
                disabled={toggleSubmitting}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitToggleStatus}
                disabled={toggleSubmitting || toggleReason.trim().length < 5}
                className={`px-4 py-2 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                  toggleStatusTarget.is_active
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {toggleSubmitting && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {toggleSubmitting
                    ? 'Đang xử lý...'
                    : toggleStatusTarget.is_active
                    ? 'Xác nhận Khóa'
                    : 'Xác nhận Mở khóa'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
