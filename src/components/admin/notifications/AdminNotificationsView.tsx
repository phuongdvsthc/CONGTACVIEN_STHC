import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Search,
  Filter,
  Plus,
  RotateCcw,
  X,
  Eye,
  Edit,
  Trash2,
  Send,
  Ban,
  Users,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../services/api';
import {
  AdminNotificationListItemDTO,
  AdminAnnouncementDetailDTO,
  NotificationCategory,
  NotificationStatus,
} from '../../../types';
import { formatDateTimeShortVi } from '../../../utils/dateFormatter';
import { AnnouncementFormModal } from './AnnouncementFormModal';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';
import { AnnouncementRevokeModal } from './AnnouncementRevokeModal';

interface AdminNotificationsViewProps {
  currentUser?: {
    id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  } | null;
  onNavigate?: (path: string) => void;
}

export const AdminNotificationsView: React.FC<AdminNotificationsViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  // Permissions State
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const isAdmin = currentUser?.role === 'admin';

  const hasPerm = (perm: string) => {
    if (isAdmin) return true;
    return permissions.includes(perm);
  };

  const canView = isAdmin || hasPerm('notifications.view');
  const canCreate = isAdmin || hasPerm('notifications.create');
  const canPublish = isAdmin || hasPerm('notifications.publish');
  const canRevoke = isAdmin || hasPerm('notifications.revoke');

  // Load Permissions
  useEffect(() => {
    let isMounted = true;
    api.getMyPermissions()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data?.permissions) {
          setPermissions(res.data.permissions);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setPermissionsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter & Search State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'REVOKED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'GENERAL' | 'POLICY' | 'URGENT' | 'EVENT'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Data List & Pagination State
  const [announcements, setAnnouncements] = useState<AdminNotificationListItemDTO[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Feedback Notification Banner
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals & Active Items
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AdminAnnouncementDetailDTO | null>(null);

  const [detailModalId, setDetailModalId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [revokingItem, setRevokingItem] = useState<AdminNotificationListItemDTO | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // Publish Confirm Dialog
  const [publishingItem, setPublishingItem] = useState<AdminNotificationListItemDTO | null>(null);
  const [isPublishingConfirmOpen, setIsPublishingConfirmOpen] = useState(false);
  const [isPublishingLoading, setIsPublishingLoading] = useState(false);

  // Delete Confirm Dialog
  const [deletingItem, setDeletingItem] = useState<AdminNotificationListItemDTO | null>(null);
  const [isDeletingConfirmOpen, setIsDeletingConfirmOpen] = useState(false);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Search Debounce (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setApiFeedback({ type, message });
    setTimeout(() => {
      setApiFeedback((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // Sequence guard against race condition
  const fetchSeqRef = useRef(0);

  // Load Announcements List
  const loadAnnouncements = useCallback(async () => {
    if (!canView) return;

    const currentSeq = ++fetchSeqRef.current;
    setLoading(true);
    setListError(null);

    try {
      const res = await api.getAdminAnnouncements({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit,
      });

      if (currentSeq !== fetchSeqRef.current) return;

      if (res.success) {
        let rawItems: AdminNotificationListItemDTO[] = [];
        if (Array.isArray(res.data)) {
          rawItems = res.data;
        } else if (Array.isArray(res.data?.items)) {
          rawItems = res.data.items;
        } else if (Array.isArray((res as any).items)) {
          rawItems = (res as any).items;
        }
        setAnnouncements(rawItems);

        const pag = res.pagination || res.data?.pagination;
        if (pag) {
          setPagination({
            page: pag.page || page,
            limit: pag.limit || pag.page_size || limit,
            total: pag.total ?? pag.total_items ?? rawItems.length,
            totalPages: pag.totalPages ?? pag.total_pages ?? 1,
          });
        }
      } else {
        if (res.error?.includes('403') || res.code === 'FORBIDDEN') {
          setListError('Bạn không có quyền xem danh sách thông báo (notifications.view).');
        } else {
          setListError(res.error || 'Lỗi khi tải danh sách bản tin.');
        }
      }
    } catch (err: any) {
      if (currentSeq !== fetchSeqRef.current) return;
      setListError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      if (currentSeq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [canView, debouncedSearch, statusFilter, categoryFilter, fromDate, toDate, page, limit]);

  useEffect(() => {
    if (permissionsLoaded && canView) {
      loadAnnouncements();
    }
  }, [permissionsLoaded, canView, loadAnnouncements]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const isFilterActive =
    Boolean(searchInput.trim()) ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    Boolean(fromDate) ||
    Boolean(toDate);

  // Open Edit Draft (loads full detail first)
  const handleOpenEdit = async (item: AdminNotificationListItemDTO) => {
    try {
      const res = await api.getAdminAnnouncementDetail(item.id);
      if (res.success && res.data) {
        setEditingAnnouncement(res.data);
        setIsFormModalOpen(true);
      } else {
        showFeedback('error', res.error || 'Không thể tải chi tiết bản nháp để chỉnh sửa.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối khi tải bản nháp.');
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (id: string) => {
    setDetailModalId(id);
    setIsDetailModalOpen(true);
  };

  // Publish Action
  const handleConfirmPublish = async () => {
    if (!publishingItem) return;
    setIsPublishingLoading(true);

    try {
      const res = await api.publishAdminAnnouncement(publishingItem.id);
      if (res.success) {
        showFeedback(
          'success',
          res.message || `Đã xuất bản bản tin "${publishingItem.title}" thành công!`
        );
        setIsPublishingConfirmOpen(false);
        setPublishingItem(null);
        loadAnnouncements();
      } else {
        showFeedback('error', res.error || 'Lỗi khi xuất bản bản tin.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối khi xuất bản.');
    } finally {
      setIsPublishingLoading(false);
    }
  };

  // Delete Draft Action
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeletingLoading(true);

    try {
      const res = await api.deleteAdminAnnouncement(deletingItem.id);
      if (res.success) {
        showFeedback('success', res.message || 'Đã xóa bản nháp thông báo thành công.');
        setIsDeletingConfirmOpen(false);
        setDeletingItem(null);
        if (detailModalId === deletingItem.id) {
          setIsDetailModalOpen(false);
          setDetailModalId(null);
        }
        loadAnnouncements();
      } else {
        showFeedback('error', res.error || 'Lỗi khi xóa bản nháp.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Lỗi kết nối khi xóa bản nháp.');
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: NotificationStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Đã xuất bản
          </span>
        );
      case 'REVOKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Đã thu hồi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            Bản nháp
          </span>
        );
    }
  };

  // Category Badge Component
  const renderCategoryBadge = (cat: NotificationCategory) => {
    switch (cat) {
      case 'URGENT':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Khẩn cấp
          </span>
        );
      case 'POLICY':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Chính sách
          </span>
        );
      case 'EVENT':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Sự kiện
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Thông thường
          </span>
        );
    }
  };

  // Recipient Scope Label
  const renderScopeLabel = (scope: string) => {
    switch (scope) {
      case 'ALL':
        return 'Toàn bộ CTV';
      case 'STATUS_FILTER':
        return 'Theo trạng thái hồ sơ';
      case 'SPECIFIC':
        return 'Chỉ định CTV';
      default:
        return scope;
    }
  };

  // Access Denied Screen (Route Guard if not canView)
  if (permissionsLoaded && !canView) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Không đủ quyền truy cập module Quản lý thông báo
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Tài khoản của bạn chưa được cấp quyền <code>notifications.view</code>. Vui lòng liên hệ Quản trị viên hệ thống để được phân quyền.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Quay lại Trang tổng quan
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {apiFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all ${
            apiFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{apiFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-blue-600" />
            Quản lý thông báo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Soạn và gửi thông báo trong hệ thống đến cộng tác viên.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingAnnouncement(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-sm shadow-blue-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Soạn thông báo
          </button>
        )}
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tiêu đề thông báo..."
              className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp (DRAFT)</option>
              <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
              <option value="REVOKED">Đã thu hồi (REVOKED)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
            >
              <option value="ALL">Tất cả danh mục</option>
              <option value="GENERAL">Thông thường (GENERAL)</option>
              <option value="POLICY">Chính sách (POLICY)</option>
              <option value="URGENT">Khẩn cấp (URGENT)</option>
              <option value="EVENT">Sự kiện (EVENT)</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              title="Từ ngày"
              className="w-1/2 px-2 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              title="Đến ngày"
              className="w-1/2 px-2 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Action Controls: Refresh & Clear Filters */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-500 font-medium">
            Tìm thấy <strong className="text-slate-900">{pagination.total}</strong> bản tin thông báo
          </div>

          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                <X className="w-3.5 h-3.5" />
                Xóa bộ lọc
              </button>
            )}

            <button
              type="button"
              onClick={loadAnnouncements}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">STT</th>
                <th className="py-3 px-4 min-w-[240px]">Tiêu đề thông báo</th>
                <th className="py-3 px-3">Danh mục</th>
                <th className="py-3 px-3">Phạm vi người nhận</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-center">Số người nhận</th>
                <th className="py-3 px-3">Người tạo</th>
                <th className="py-3 px-3">Ngày tạo / xuất bản</th>
                <th className="py-3 px-4 text-right min-w-[140px]">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Đang tải danh sách bản tin...
                  </td>
                </tr>
              ) : listError ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-rose-600 bg-rose-50/50">
                    <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                    {listError}
                  </td>
                </tr>
              ) : (!Array.isArray(announcements) || announcements.length === 0) ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không tìm thấy bản tin nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isFilterActive
                        ? 'Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.'
                        : 'Chưa có bản tin nào được tạo. Nhấn "Soạn thông báo" để bắt đầu.'}
                    </p>
                  </td>
                </tr>
              ) : (
                (Array.isArray(announcements) ? announcements : []).map((item, idx) => {
                  const stt = (pagination.page - 1) * pagination.limit + idx + 1;
                  const isOwner = currentUser?.id && item.created_by === currentUser.id;
                  const isDraft = item.status === 'DRAFT';
                  const isPublished = item.status === 'PUBLISHED';
                  const isRevoked = item.status === 'REVOKED';

                  // Permissions check for table row actions
                  const canEditThis = isDraft && (isAdmin || (canCreate && isOwner));
                  const canDeleteThis = isDraft && (isAdmin || (canCreate && isOwner));
                  const canPublishThis = isDraft && canPublish;
                  const canRevokeThis = isPublished && canRevoke;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-medium">
                        {stt}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item.id)}
                          className="text-left font-bold text-slate-900 hover:text-blue-600 line-clamp-1 transition-colors block"
                        >
                          {item.title}
                        </button>
                        {item.summary && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {item.summary}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {renderCategoryBadge(item.category)}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {renderScopeLabel(item.recipient_scope)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {renderStatusBadge(item.status)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isDraft ? (
                          <span className="text-[11px] text-slate-400 italic">
                            Chưa xuất bản
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {item.total_recipients ?? 0}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-medium truncate max-w-[120px]">
                        {item.creator_name || 'Hệ thống'}
                      </td>

                      <td className="py-3 px-3 text-slate-500">
                        <div>
                          <span>{formatDateTimeShortVi(item.published_at || item.created_at)}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {item.published_at ? 'Xuất bản' : 'Tạo'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item.id)}
                            title="Xem chi tiết"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Sửa nháp */}
                          {canEditThis && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              title="Chỉnh sửa bản nháp"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Xuất bản */}
                          {canPublishThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setPublishingItem(item);
                                setIsPublishingConfirmOpen(true);
                              }}
                              title="Xuất bản ngay"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Thu hồi */}
                          {canRevokeThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setRevokingItem(item);
                                setIsRevokeModalOpen(true);
                              }}
                              title="Thu hồi bản tin"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Xóa nháp */}
                          {canDeleteThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingItem(item);
                                setIsDeletingConfirmOpen(true);
                              }}
                              title="Xóa bản nháp"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* PAGINATION */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div>
              Trang <strong className="text-slate-900">{pagination.page}</strong> / {pagination.totalPages} (Tổng {pagination.total} bản tin)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Sau
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL (CREATE / EDIT) */}
      <AnnouncementFormModal
        announcement={editingAnnouncement}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingAnnouncement(null);
        }}
        onSuccess={(savedItem, actionType) => {
          showFeedback(
            'success',
            actionType === 'published'
              ? 'Bản tin đã được xuất bản thành công!'
              : 'Đã lưu bản nháp thông báo thành công!'
          );
          setIsFormModalOpen(false);
          setEditingAnnouncement(null);
          loadAnnouncements();
        }}
        canPublish={canPublish}
      />

      {/* DETAIL MODAL */}
      <AnnouncementDetailModal
        announcementId={detailModalId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailModalId(null);
        }}
        onEditDraft={(detail) => {
          setIsDetailModalOpen(false);
          setEditingAnnouncement(detail);
          setIsFormModalOpen(true);
        }}
        onPublishDraft={(detail) => {
          setPublishingItem(detail as any);
          setIsPublishingConfirmOpen(true);
        }}
        onRevokePublished={(detail) => {
          setRevokingItem(detail as any);
          setIsRevokeModalOpen(true);
        }}
        onDeleteDraft={(detail) => {
          setDeletingItem(detail as any);
          setIsDeletingConfirmOpen(true);
        }}
      />

      {/* REVOKE MODAL */}
      <AnnouncementRevokeModal
        announcement={revokingItem}
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          setRevokingItem(null);
        }}
        onSuccess={(msg) => {
          showFeedback('success', msg || 'Thu hồi bản tin thành công.');
          setIsRevokeModalOpen(false);
          setRevokingItem(null);
          if (detailModalId) {
            handleOpenDetail(detailModalId);
          }
          loadAnnouncements();
        }}
      />

      {/* PUBLISH CONFIRM DIALOG */}
      {isPublishingConfirmOpen && publishingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Xác nhận xuất bản thông báo
              </h3>
              <p className="text-xs text-slate-500">
                Bản tin sẽ được phân phối ngay lập tức tới hòm thư cá nhân của các cộng tác viên.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800 line-clamp-2">
                {publishingItem.title}
              </p>
              <p className="text-slate-500 mt-1">
                Phạm vi: <strong className="text-slate-700">{renderScopeLabel(publishingItem.recipient_scope)}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPublishingConfirmOpen(false);
                  setPublishingItem(null);
                }}
                disabled={isPublishingLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={isPublishingLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-emerald-600/30"
              >
                {isPublishingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xuất bản...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Xác nhận xuất bản
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM DIALOG */}
      {isDeletingConfirmOpen && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-100 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Xóa bản nháp thông báo?
              </h3>
              <p className="text-xs text-slate-500">
                Bản nháp sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800 line-clamp-2">
                {deletingItem.title}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeletingConfirmOpen(false);
                  setDeletingItem(null);
                }}
                disabled={isDeletingLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingLoading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-rose-600/30"
              >
                {isDeletingLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
