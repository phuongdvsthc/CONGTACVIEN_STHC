import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { NotificationUnreadCountsResult } from '../types';

interface PortalNotificationContextType {
  unreadCounts: NotificationUnreadCountsResult;
  loadingCounts: boolean;
  countsError: string | null;
  refreshUnreadCounts: () => Promise<void>;
  updateCountsOptimistically: (updater: (prev: NotificationUnreadCountsResult) => NotificationUnreadCountsResult) => void;
}

const initialCounts: NotificationUnreadCountsResult = {
  total_unread: 0,
  announcement_unread: 0,
  system_unread: 0,
};

const PortalNotificationContext = createContext<PortalNotificationContextType>({
  unreadCounts: initialCounts,
  loadingCounts: false,
  countsError: null,
  refreshUnreadCounts: async () => {},
  updateCountsOptimistically: () => {},
});

interface PortalNotificationProviderProps {
  userId?: string | null;
  children: React.ReactNode;
}

export const PortalNotificationProvider: React.FC<PortalNotificationProviderProps> = ({
  userId,
  children,
}) => {
  const [unreadCounts, setUnreadCounts] = useState<NotificationUnreadCountsResult>(initialCounts);
  const [loadingCounts, setLoadingCounts] = useState<boolean>(false);
  const [countsError, setCountsError] = useState<string | null>(null);

  // Lưu trữ userId hiện tại để tránh race condition khi chuyển đổi tài khoản
  const currentUserIdRef = useRef<string | null | undefined>(userId);

  useEffect(() => {
    currentUserIdRef.current = userId;
    if (!userId) {
      setUnreadCounts(initialCounts);
      setCountsError(null);
    }
  }, [userId]);

  const refreshUnreadCounts = useCallback(async () => {
    if (!currentUserIdRef.current) return;
    const requestUserId = currentUserIdRef.current;

    try {
      setLoadingCounts(true);
      const res = await api.getPortalUnreadNotificationCounts();

      // Chỉ cập nhật nếu user hiện tại vẫn khớp
      if (currentUserIdRef.current !== requestUserId) return;

      if (res.success && res.data) {
        setUnreadCounts({
          total_unread: Number(res.data.total_unread || 0),
          announcement_unread: Number(res.data.announcement_unread || 0),
          system_unread: Number(res.data.system_unread || 0),
        });
        setCountsError(null);
      } else {
        // Không reset về 0 giả khi API lỗi mạng/server, giữ nguyên số cũ
        setCountsError(res.error || 'Không thể tải số thông báo chưa đọc');
      }
    } catch (err: any) {
      if (currentUserIdRef.current !== requestUserId) return;
      setCountsError(err?.message || 'Lỗi mạng khi tải số thông báo chưa đọc');
    } finally {
      if (currentUserIdRef.current === requestUserId) {
        setLoadingCounts(false);
      }
    }
  }, []);

  const updateCountsOptimistically = useCallback(
    (updater: (prev: NotificationUnreadCountsResult) => NotificationUnreadCountsResult) => {
      setUnreadCounts((prev) => updater(prev));
    },
    []
  );

  // Tải lần đầu khi có userId
  useEffect(() => {
    if (userId) {
      refreshUnreadCounts();
    }
  }, [userId, refreshUnreadCounts]);

  // Làm mới khi focus lại tab trình duyệt
  useEffect(() => {
    const handleFocus = () => {
      if (currentUserIdRef.current && document.visibilityState === 'visible') {
        refreshUnreadCounts();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshUnreadCounts]);

  return (
    <PortalNotificationContext.Provider
      value={{
        unreadCounts,
        loadingCounts,
        countsError,
        refreshUnreadCounts,
        updateCountsOptimistically,
      }}
    >
      {children}
    </PortalNotificationContext.Provider>
  );
};

export const usePortalNotification = () => useContext(PortalNotificationContext);
