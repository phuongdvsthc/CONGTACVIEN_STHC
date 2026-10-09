import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Building2,
  CheckCheck,
  RefreshCw,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Inbox,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItemDTO, NotificationType } from '../../types';
import { formatDateTimeVi } from '../../utils/dateFormatter';
import { usePortalHeader } from '../../contexts/PortalHeaderContext';
import { usePortalNotification } from '../../contexts/PortalNotificationContext';
import { AffiliateNotificationDetailModal } from './AffiliateNotificationDetailModal';

interface AffiliateNotificationsViewProps {
  onNavigate: (path: string) => void;
}

type TabType = 'ANNOUNCEMENT' | 'SYSTEM';
type ReadFilterType = 'all' | 'false' | 'true';

function getActionUrlLabel(actionUrl?: string | null): string {
  if (!actionUrl) return 'Xem chi tiết';
  if (actionUrl.startsWith('/portal/leads/')) return 'Xem hồ sơ khách hàng';
  if (actionUrl === '/portal/leads') return 'Xem danh sách khách hàng';
  if (actionUrl.startsWith('/portal/courses')) return 'Xem thông tin khóa học';
  if (actionUrl === '/portal' || actionUrl.startsWith('/portal/dashboard')) return 'Xem tổng quan Cổng CTV';
  return 'Xem liên kết liên quan';
}

function getCategoryLabel(category: string, type: NotificationType): string {
  if (type === 'ANNOUNCEMENT') {
    switch (category) {
      case 'URGENT':
        return 'Khẩn cấp';
      case 'POLICY':
        return 'Chính sách';
      case 'EVENT':
        return 'Sự kiện';
      default:
        return 'Ban quản trị';
    }
  }

  switch (category) {
    case 'LEAD':
      return 'Khách hàng';
    case 'RECONCILIATION':
      return 'Nhập học';
    case 'REWARD':
      return 'Thù lao';
    case 'ACCOUNT':
      return 'Tài khoản';
    default:
      return 'Hệ thống';
  }
}

export const AffiliateNotificationsView: React.FC<AffiliateNotificationsViewProps> = ({
  onNavigate,
}) => {
  const { setHeaderMeta } = usePortalHeader();
  const { unreadCounts, countsError, refreshUnreadCounts, updateCountsOptimistically } = usePortalNotification();

  // Tab State: 'ANNOUNCEMENT' | 'SYSTEM'
  const [activeTab, setActiveTab] = useState<TabType>('ANNOUNCEMENT');

  // Filter State
  const [readFilter, setReadFilter] = useState<ReadFilterType>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Data & Loading State
  const [items, setItems] = useState<NotificationItemDTO[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Read-All Pending State
  const [markingAllRead, setMarkingAllRead] = useState<boolean>(false);
  const [readAllMessage, setReadAllMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail Modal State
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  // Set Header Meta for portal workspace
  useEffect(() => {
    setHeaderMeta({
      title: 'Thông báo',
      badge: 'Cổng CTV',
      subtitle: 'Xem các thông báo điều hành từ Ban quản trị và cập nhật tiến độ xử lý hồ sơ từ hệ thống',
    });
    return () => setHeaderMeta(null);
  }, [setHeaderMeta]);

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchKeyword.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Đổi tab hoặc bộ lọc đưa về trang 1
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);
    setPage(1);
    setReadAllMessage(null);
  };

  const handleReadFilterChange = (newFilter: ReadFilterType) => {
    if (newFilter === readFilter) return;
    setReadFilter(newFilter);
    setPage(1);
    setReadAllMessage(null);
  };

  // Tải danh sách thông báo
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.getPortalNotifications({
        tab: activeTab,
        is_read: readFilter === 'all' ? undefined : (readFilter === 'true'),
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
      });

      if (res.success && res.data) {
        setItems(res.data.items || []);
        setServerTime(res.data.server_time || new Date().toISOString());
        setTotalItems(res.data.pagination?.total_items || 0);
        setTotalPages(res.data.pagination?.total_pages || 1);
      } else {
        setError(res.error || 'Không thể tải danh sách thông báo.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi mạng khi tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, readFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Xử lý làm mới thủ công
  const handleManualRefresh = async () => {
    setReadAllMessage(null);
    await Promise.all([fetchNotifications(), refreshUnreadCounts()]);
  };

  // Callback khi một mục được đánh dấu đã đọc thành công từ modal hoặc inline button
  const handleSingleReadSuccess = useCallback(
    (notifId: string) => {
      setItems((prev) =>
        prev.map((it) => (it.notification_id === notifId ? { ...it, is_read: true, read_at: new Date().toISOString() } : it))
      );

      updateCountsOptimistically((prev) => {
        const tabKey = activeTab === 'ANNOUNCEMENT' ? 'announcement_unread' : 'system_unread';
        return {
          ...prev,
          [tabKey]: Math.max(0, prev[tabKey] - 1),
          total_unread: Math.max(0, prev.total_unread - 1),
        };
      });

      refreshUnreadCounts();
    },
    [activeTab, updateCountsOptimistically, refreshUnreadCounts]
  );

  // Thao tác đánh dấu đã đọc trực tiếp trên danh sách
  const handleMarkSingleRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.markPortalNotificationAsRead(notifId);
      if (res.success) {
        handleSingleReadSuccess(notifId);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Đánh dấu tất cả đã đọc trong tab đang mở
  const handleMarkAllRead = async () => {
    if (markingAllRead) return;

    // Yêu cầu bắt buộc: Dùng cutoff_at từ server_time của lần tải dữ liệu hợp lệ
    let targetCutoff: string | undefined = serverTime || undefined;

    if (!targetCutoff) {
      try {
        setLoading(true);
        const refRes = await api.getPortalNotifications({ tab: activeTab, limit: 1 });
        if (refRes.success && refRes.data?.server_time) {
          const freshTime: string = refRes.data.server_time;
          targetCutoff = freshTime;
          setServerTime(freshTime);
        } else {
          setReadAllMessage({ type: 'error', text: 'Không xác định được mốc thời gian máy chủ để đánh dấu đã đọc.' });
          setLoading(false);
          return;
        }
      } catch {
        setReadAllMessage({ type: 'error', text: 'Lỗi mạng khi lấy mốc thời gian máy chủ.' });
        setLoading(false);
        return;
      }
    }

    setMarkingAllRead(true);
    setReadAllMessage(null);

    // Giữ nguyên tab và cutoff cố định trong request kể cả khi người dùng chuyển tab giữa chừng
    const requestTab = activeTab;

    try {
      const res = await api.markAllPortalNotificationsAsRead(requestTab, targetCutoff);

      if (res.success) {
        const updatedCount = res.data?.updated_count ?? 0;
        setReadAllMessage({
          type: 'success',
          text: updatedCount > 0
            ? `Đã đánh dấu đã đọc ${updatedCount} thông báo trong tab này.`
            : 'Tất cả thông báo trong tab này đều đã được đọc.',
        });

        // Cập nhật số đếm optimistically
        updateCountsOptimistically((prev) => {
          const tabKey = requestTab === 'ANNOUNCEMENT' ? 'announcement_unread' : 'system_unread';
          const removed = prev[tabKey];
          return {
            ...prev,
            [tabKey]: 0,
            total_unread: Math.max(0, prev.total_unread - removed),
          };
        });

        // Cập nhật danh sách items hiện tại
        setItems((prev) =>
          prev.map((item) => {
            if (item.type === requestTab && !item.is_read) {
              return { ...item, is_read: true, read_at: new Date().toISOString() };
            }
            return item;
          })
        );

        // Làm mới dữ liệu từ server
        await Promise.all([fetchNotifications(), refreshUnreadCounts()]);
      } else {
        setReadAllMessage({ type: 'error', text: res.error || 'Lỗi khi đánh dấu tất cả đã đọc.' });
      }
    } catch (err: any) {
      setReadAllMessage({ type: 'error', text: err?.message || 'Lỗi kết nối khi đánh dấu tất cả đã đọc.' });
    } finally {
      setMarkingAllRead(false);
    }
  };

  const currentTabUnread = activeTab === 'ANNOUNCEMENT'
    ? unreadCounts.announcement_unread
    : unreadCounts.system_unread;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12 animate-fade-in text-slate-900">
      {/* HEADER SECTION: Tiêu đề "Thông báo" & Công cụ làm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Thông báo</span>
            {!countsError && unreadCounts.total_unread > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full tabular-nums">
                {unreadCounts.total_unread > 99 ? '99+' : unreadCounts.total_unread} chưa đọc
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi bản tin chỉ đạo tuyển sinh và thông báo kết quả đối soát học viên, thù lao
          </p>
        </div>

        {/* Thanh công cụ làm mới */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-900' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* TABS CHÍNH: Đúng hai tab */}
      <div className="flex items-center border-b border-slate-200 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => handleTabChange('ANNOUNCEMENT')}
          className={`pb-3 pt-1 px-1 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ANNOUNCEMENT'
              ? 'text-blue-900 border-b-2 border-blue-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'ANNOUNCEMENT' ? 'text-blue-900' : 'text-slate-400'}`} />
          <span>Thông báo từ Ban quản trị</span>
          {!countsError && unreadCounts.announcement_unread > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full min-w-[18px] text-center tabular-nums">
              {unreadCounts.announcement_unread > 99 ? '99+' : unreadCounts.announcement_unread}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('SYSTEM')}
          className={`pb-3 pt-1 px-1 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'SYSTEM'
              ? 'text-blue-900 border-b-2 border-blue-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className={`w-4 h-4 ${activeTab === 'SYSTEM' ? 'text-blue-900' : 'text-slate-400'}`} />
          <span>Thông báo từ hệ thống</span>
          {!countsError && unreadCounts.system_unread > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full min-w-[18px] text-center tabular-nums">
              {unreadCounts.system_unread > 99 ? '99+' : unreadCounts.system_unread}
            </span>
          )}
        </button>
      </div>

      {/* FILTER & ACTIONS TOOLBAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Bộ lọc: Tất cả / Chưa đọc / Đã đọc */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => handleReadFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              readFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => handleReadFilterChange('false')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              readFilter === 'false'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Chưa đọc</span>
            {!countsError && currentTabUnread > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => handleReadFilterChange('true')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              readFilter === 'true'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã đọc
          </button>
        </div>

        {/* Tìm kiếm & Đánh dấu tất cả đã đọc */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Ô tìm kiếm theo tiêu đề */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tiêu đề..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nút Đánh dấu tất cả đã đọc trong tab */}
          <button
            onClick={handleMarkAllRead}
            disabled={markingAllRead || currentTabUnread === 0}
            className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs border border-blue-200/80 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs disabled:opacity-40 disabled:hover:bg-blue-50"
            title="Đánh dấu đã đọc tất cả thông báo trong tab đang mở"
          >
            {markingAllRead ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-blue-900" />
            )}
            <span>Đánh dấu tất cả đã đọc</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO KẾT QUẢ READ-ALL */}
      {readAllMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            readAllMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {readAllMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{readAllMessage.text}</span>
          </div>
          <button
            onClick={() => setReadAllMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* DANH SÁCH THÔNG BÁO */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200/90">
            <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
            <p className="text-sm font-medium">Đang tải danh sách thông báo...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-slate-200/90">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900">{error}</p>
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3 bg-white rounded-2xl border border-slate-200/90">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {debouncedSearch || readFilter !== 'all'
                ? 'Không tìm thấy thông báo phù hợp'
                : activeTab === 'ANNOUNCEMENT'
                ? 'Chưa có thông báo từ Ban quản trị'
                : 'Chưa có thông báo từ hệ thống'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {debouncedSearch || readFilter !== 'all'
                ? 'Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm để xem kết quả khác.'
                : activeTab === 'ANNOUNCEMENT'
                ? 'Các thông báo mới từ Ban Tuyển sinh Nhà trường sẽ xuất hiện tại đây khi được phát hành.'
                : 'Các thông báo cập nhật trạng thái học viên, phê duyệt thù lao sẽ xuất hiện tại đây.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const categoryLabel = getCategoryLabel(item.category, item.type);
              const isUnread = !item.is_read;

              return (
                <div
                  key={item.recipient_id || item.id}
                  onClick={() => setSelectedNotificationId(item.notification_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedNotificationId(item.notification_id);
                    }
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 sm:gap-4 relative ${
                    isUnread
                      ? 'bg-blue-50/30 hover:bg-blue-50/60 border-blue-200/90 shadow-2xs'
                      : 'bg-white hover:bg-slate-50/90 border-slate-200/80 shadow-2xs'
                  }`}
                >
                  {/* Icon Loại thông báo */}
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      isUnread
                        ? 'bg-blue-900 text-amber-400 font-bold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.type === 'ANNOUNCEMENT' ? (
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>

                  {/* Nội dung item */}
                  <div className="flex-1 min-w-0">
                    {/* Metadata: Zero-Pill Discipline */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap mb-1">
                      <span className="font-semibold text-blue-900">{categoryLabel}</span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="tabular-nums flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDateTimeVi(item.created_at)}
                      </span>
                      {isUnread && (
                        <>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-bold text-rose-600 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Chưa đọc
                          </span>
                        </>
                      )}
                    </div>

                    <h3
                      className={`text-sm sm:text-base leading-snug line-clamp-2 ${
                        isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-800'
                      }`}
                    >
                      {item.title}
                    </h3>

                    {item.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                        {item.summary}
                      </p>
                    )}

                    {/* Mở đối tượng liên quan nếu có action_url */}
                    {item.action_url && !item.action_url.startsWith('/admin') && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(item.action_url!);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-700 hover:underline transition-colors group"
                        >
                          <span>{getActionUrlLabel(item.action_url)}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hành động ở đuôi thẻ: Đánh dấu đã đọc đơn lẻ */}
                  <div className="shrink-0 self-center flex items-center gap-2">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingleRead(item.notification_id, e)}
                        title="Đánh dấu đã đọc"
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-900 hover:bg-blue-100/60 transition-colors"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="p-2 text-slate-300" title="Đã đọc">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PHÂN TRANG THỰC TẾ TỪ BACKEND */}
        {!loading && totalPages > 1 && (
          <div className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              Trang {page} / {totalPages} (Tổng số {totalItems} thông báo)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trang trước</span>
              </button>

              <div className="hidden sm:flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prevP && p - prevP > 1 && (
                          <span className="px-1 text-slate-400 text-xs">...</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors tabular-nums ${
                            page === p
                              ? 'bg-blue-900 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center gap-1"
              >
                <span className="hidden sm:inline">Trang sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CHI TIẾT THÔNG BÁO MODAL */}
      <AffiliateNotificationDetailModal
        notificationId={selectedNotificationId}
        isOpen={Boolean(selectedNotificationId)}
        onClose={() => setSelectedNotificationId(null)}
        onNavigate={onNavigate}
        onReadSuccess={handleSingleReadSuccess}
      />
    </div>
  );
};
