import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  buildCourseReferralUrl,
  buildCatalogReferralUrl,
  ReferralResolutionResult,
} from '../utils/referralLinkHelper';
import { formatDateTimeVi, formatDateOnlyVi } from '../utils/dateFormatter';
import { formatPhoneNumberVi } from '../utils/operationValidation';

export interface SystemBrandingState {
  system_name: string;
  system_short_name: string;
  unit_name: string;
  logo_backend_url: string | null;
  favicon_url: string | null;
  public_base_url: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  allow_affiliate_registration: boolean;
  registration_closed_message: string | null;
  is_registration_open: boolean;
  revision: number;
}

export interface SystemOperationState {
  public_base_url: string;
  support_email: string;
  support_phone: string;
  timezone: string;
}

export const DEFAULT_BRANDING: SystemBrandingState = {
  system_name: 'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC',
  system_short_name: 'STHC_CTV',
  unit_name: 'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
  logo_backend_url: null,
  favicon_url: null,
  public_base_url: 'https://ctv.sthc.edu.vn',
  support_email: 'tuyensinh@sthc.edu.vn',
  support_phone: '02838446480',
  timezone: 'Asia/Ho_Chi_Minh',
  allow_affiliate_registration: false,
  registration_closed_message: 'Hệ thống hiện đang tạm ngưng tiếp nhận hồ sơ cộng tác viên mới.',
  is_registration_open: false,
  revision: 1,
};

export interface SystemBrandingContextValue {
  branding: SystemBrandingState;
  operation: SystemOperationState;
  isOperationConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  updateBrandingImmediately: (updated: Partial<SystemBrandingState>) => void;
  updateConfigImmediately: (updated: Partial<SystemBrandingState>) => void;
  syncTabIdentity: (pageTitle?: string, path?: string) => void;
  buildCourseUrl: (courseCodeOrSlug: string, affiliateCode: string) => ReferralResolutionResult;
  buildCatalogUrl: (affiliateCode: string) => ReferralResolutionResult;
  formatDate: (dateStrOrObj?: string | Date | null) => string;
  formatDateOnly: (dateStr?: string | null) => string;
  formatPhone: (phoneStr?: string | null) => string;
}

const SystemBrandingContext = createContext<SystemBrandingContextValue | undefined>(undefined);

interface SystemBrandingProviderProps {
  children: React.ReactNode;
  currentPath: string;
}

export const SystemBrandingProvider: React.FC<SystemBrandingProviderProps> = ({ children, currentPath }) => {
  const [branding, setBranding] = useState<SystemBrandingState>(() => {
    // Thử khôi phục từ phiên làm việc gần nhất nếu có
    try {
      const cached = sessionStorage.getItem('sthc_system_branding');
      if (cached) {
        return { ...DEFAULT_BRANDING, ...JSON.parse(cached) };
      }
    } catch {}
    return DEFAULT_BRANDING;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Bộ đếm ngăn late-arriving responses ghi đè cấu hình mới
  const latestReqIdRef = useRef<number>(0);
  const currentPathRef = useRef<string>(currentPath);

  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Hàm tải cấu hình từ Public Allowlist API an toàn
  const loadBranding = useCallback(async () => {
    const reqId = ++latestReqIdRef.current;
    setIsLoading(true);

    try {
      const res = await api.getPublicSystemInfo();
      if (reqId !== latestReqIdRef.current) return;

      if (res.success && res.data) {
        const d = res.data;
        const newState: SystemBrandingState = {
          system_name: d.system_name || DEFAULT_BRANDING.system_name,
          system_short_name: d.system_short_name || DEFAULT_BRANDING.system_short_name,
          unit_name: d.unit_name || DEFAULT_BRANDING.unit_name,
          logo_backend_url: d.logo_backend_url || null,
          favicon_url: d.favicon_url || null,
          public_base_url: d.public_base_url || DEFAULT_BRANDING.public_base_url,
          support_email: d.support_email || DEFAULT_BRANDING.support_email,
          support_phone: d.support_phone || DEFAULT_BRANDING.support_phone,
          timezone: d.timezone || DEFAULT_BRANDING.timezone,
          allow_affiliate_registration: Boolean(d.allow_affiliate_registration),
          registration_closed_message: d.registration_closed_message || null,
          is_registration_open: Boolean(d.is_registration_open),
          revision: (d as any).revision || 1,
        };

        setBranding(newState);
        setError(null);
        try {
          sessionStorage.setItem('sthc_system_branding', JSON.stringify(newState));
        } catch {}
      } else {
        setError(res.error || 'Không thể tải thông tin cấu hình hệ thống.');
      }
    } catch (err: any) {
      if (reqId === latestReqIdRef.current) {
        setError(err.message || 'Lỗi kết nối khi tải cấu hình hệ thống.');
      }
    } finally {
      if (reqId === latestReqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Tải cấu hình khi khởi động
  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  // Cập nhật ngay lập tức từ server response sau khi Admin bấm Lưu thành công
  const updateBrandingImmediately = useCallback((updated: Partial<SystemBrandingState>) => {
    setBranding((prev) => {
      const next = { ...prev, ...updated };
      try {
        sessionStorage.setItem('sthc_system_branding', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Đồng bộ Favicon và Title tab trình duyệt áp dụng toàn hệ thống
  const syncTabIdentity = useCallback((pageTitle?: string, pathOverride?: string) => {
    const activePath = pathOverride || currentPathRef.current || window.location.pathname;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const params = new URLSearchParams(search);
    const courseSlug = params.get('course');

    const systemName = branding.system_name || 'Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC';

    let pageName = pageTitle;
    if (!pageName) {
      if (activePath === '/' || activePath === '') {
        pageName = courseSlug ? 'Chi tiết khóa học' : 'Cổng tuyển sinh & Giới thiệu';
      } else if (activePath === '/catalog' || activePath.startsWith('/catalog/')) {
        pageName = 'Danh mục ngành đào tạo';
      } else if (activePath === '/policy') {
        pageName = 'Chính sách thù lao tuyển sinh';
      } else if (activePath === '/login') {
        pageName = 'Đăng nhập';
      } else if (activePath === '/register') {
        pageName = 'Đăng ký cộng tác viên';
      } else if (activePath.startsWith('/admin')) {
        pageName = 'Quản trị hệ thống';
      } else if (activePath.startsWith('/portal') || activePath.startsWith('/affiliate')) {
        pageName = 'Cổng thông tin Cộng tác viên';
      } else if (activePath.startsWith('/pending')) {
        pageName = 'Hồ sơ chờ phê duyệt';
      } else {
        pageName = 'Cổng tuyển sinh STHC';
      }
    }

    // 1. Tiêu đề tab áp dụng toàn hệ thống: [Tên trang] | [system_name]
    document.title = `${pageName} | ${systemName}`;

    // 2. Favicon áp dụng toàn hệ thống (cả công khai và quản trị)
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    const faviconUrl = branding.favicon_url 
      ? (branding.favicon_url.startsWith('http') ? branding.favicon_url : `/api/v1/public/branding/asset?path=${encodeURIComponent(branding.favicon_url)}&v=${branding.revision || 1}`)
      : '/favicon.ico';

    link.href = faviconUrl;
  }, [branding.favicon_url, branding.system_name, branding.revision]);

  // Tự động đồng bộ mỗi khi currentPath, search params hoặc branding thay đổi
  useEffect(() => {
    syncTabIdentity();
    const handleUrlChange = () => syncTabIdentity();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [syncTabIdentity, currentPath]);

  // Helpers tạo link đồng bộ theo public_base_url
  const buildCourseUrl = useCallback(
    (courseCodeOrSlug: string, affiliateCode: string) => {
      return buildCourseReferralUrl(branding.public_base_url, affiliateCode, courseCodeOrSlug);
    },
    [branding.public_base_url]
  );

  const buildCatalogUrl = useCallback(
    (affiliateCode: string) => {
      return buildCatalogReferralUrl(branding.public_base_url, affiliateCode);
    },
    [branding.public_base_url]
  );

  const operation: SystemOperationState = {
    public_base_url: branding.public_base_url,
    support_email: branding.support_email,
    support_phone: branding.support_phone,
    timezone: branding.timezone,
  };

  const isOperationConfigured = Boolean(
    branding.public_base_url &&
    branding.support_email &&
    branding.support_phone
  );

  return (
    <SystemBrandingContext.Provider
      value={{
        branding,
        operation,
        isOperationConfigured,
        isLoading,
        error,
        refreshBranding: loadBranding,
        refreshConfig: loadBranding,
        updateBrandingImmediately,
        updateConfigImmediately: updateBrandingImmediately,
        syncTabIdentity,
        buildCourseUrl,
        buildCatalogUrl,
        formatDate: formatDateTimeVi,
        formatDateOnly: formatDateOnlyVi,
        formatPhone: formatPhoneNumberVi,
      }}
    >
      {children}
    </SystemBrandingContext.Provider>
  );
};

export const useSystemBranding = (): SystemBrandingContextValue => {
  const context = useContext(SystemBrandingContext);
  if (!context) {
    throw new Error('useSystemBranding must be used within a SystemBrandingProvider');
  }
  return context;
};

export const useSystemConfig = useSystemBranding;
