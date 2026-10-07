/**
 * STHC_CTV - Navigation Guard & Route Protection Engine (M1.4)
 * Module thống nhất xử lý điều hướng, phân quyền route và bảo vệ phiên làm việc.
 */

export interface UserSessionProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string | null;
  tax_code?: string | null;
  role: 'affiliate' | 'staff' | 'admin' | string;
  is_active: boolean;
}

export interface AffiliateSessionProfile {
  id?: string;
  user_id?: string;
  affiliate_code: string;
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED' | 'REJECTED' | string;
  full_name?: string;
  email?: string;
  review_note?: string;
}

export interface AuthSessionData {
  role: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin';
  user: UserSessionProfile | null;
  affiliate: AffiliateSessionProfile | null;
}

// Bảng danh mục route và quyền truy cập tương ứng
export interface RouteDefinition {
  path: string;
  name: string;
  isPublic: boolean;
  allowedRoles?: string[];
  allowedAffiliateStatuses?: string[];
}

export const APP_ROUTES: Record<string, RouteDefinition> = {
  '/': {
    path: '/',
    name: 'Trang Giới thiệu & Đăng ký CTV',
    isPublic: true,
  },
  '/login': {
    path: '/login',
    name: 'Trang Đăng nhập CTV',
    isPublic: true,
  },
  '/forgot-password': {
    path: '/forgot-password',
    name: 'Trang Quên mật khẩu',
    isPublic: true,
  },
  '/reset-password': {
    path: '/reset-password',
    name: 'Trang Đặt lại mật khẩu',
    isPublic: true,
  },
  '/catalog': {
    path: '/catalog',
    name: 'Danh mục Ngành đào tạo STHC',
    isPublic: true,
  },
  '/policy': {
    path: '/policy',
    name: 'Chính sách Thù lao Tuyển sinh 500k',
    isPublic: true,
  },
  '/portal': {
    path: '/portal',
    name: 'Cổng CTV - Tổng quan',
    isPublic: false,
    allowedRoles: ['affiliate'],
    allowedAffiliateStatuses: ['ACTIVE'],
  },
  '/portal/courses': {
    path: '/portal/courses',
    name: 'Cổng CTV - Khóa học',
    isPublic: false,
    allowedRoles: ['affiliate'],
    allowedAffiliateStatuses: ['ACTIVE'],
  },
  '/portal/leads': {
    path: '/portal/leads',
    name: 'Cổng CTV - Khách hàng được giới thiệu',
    isPublic: false,
    allowedRoles: ['affiliate'],
    allowedAffiliateStatuses: ['ACTIVE'],
  },
  '/pending': {
    path: '/pending',
    name: 'Trang Trạng thái Hồ sơ CTV',
    isPublic: false,
    allowedRoles: ['affiliate'],
    allowedAffiliateStatuses: ['PENDING_REVIEW', 'SUSPENDED', 'REJECTED'],
  },
  '/admin': {
    path: '/admin',
    name: 'Cổng Quản trị / Cán bộ Tuyển sinh',
    isPublic: false,
    allowedRoles: ['staff', 'admin'],
  },
  '/admin/system-settings': {
    path: '/admin/system-settings',
    name: 'Quản trị hệ thống',
    isPublic: false,
    allowedRoles: ['admin'],
  },
  '/admin/permissions': {
    path: '/admin/permissions',
    name: 'Quản lý Phân quyền & Nhóm quyền A5',
    isPublic: false,
    allowedRoles: ['admin'],
  },
};

/**
 * 1. Thống nhất xác định trang đích mặc định theo vai trò và trạng thái hồ sơ
 */
export type ResolvedDestination =
  | { type: 'ROUTE'; path: '/portal' | '/pending' | '/admin' | '/' | '/login' }
  | { type: 'DISABLED'; reason: string }
  | { type: 'INVALID_PROFILE'; reason: string };

export function resolveDefaultDestination(auth: AuthSessionData | null): ResolvedDestination {
  if (!auth || !auth.user || auth.role === 'public') {
    return { type: 'ROUTE', path: '/login' };
  }

  // Tài khoản bị vô hiệu hóa (is_active === false)
  if (auth.user.is_active === false) {
    return {
      type: 'DISABLED',
      reason: 'Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên Nhà trường. Vui lòng liên hệ Ban Tuyển sinh để được giải quyết.',
    };
  }

  const role = auth.user.role;

  if (role === 'admin') {
    return { type: 'ROUTE', path: '/admin' };
  }

  if (role === 'staff') {
    return { type: 'ROUTE', path: '/admin' };
  }

  if (role === 'affiliate') {
    const status = auth.affiliate?.status;
    if (status === 'ACTIVE') {
      return { type: 'ROUTE', path: '/portal' };
    }
    if (status === 'PENDING_REVIEW' || status === 'SUSPENDED' || status === 'REJECTED') {
      return { type: 'ROUTE', path: '/pending' };
    }
    return {
      type: 'INVALID_PROFILE',
      reason: 'Hồ sơ Cộng tác viên chưa đầy đủ hoặc trạng thái không hợp lệ. Vui lòng liên hệ Ban Tuyển sinh.',
    };
  }

  return {
    type: 'INVALID_PROFILE',
    reason: `Vai trò tài khoản (${role || 'không xác định'}) chưa được cấp quyền truy cập khu vực nội bộ.`,
  };
}

/**
 * 2. Làm sạch và kiểm tra an toàn URL chuyển hướng (Chống Open Redirect & Chống Loop)
 */
export function sanitizeRedirectUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Bắt buộc bắt đầu bằng '/' và KHÔNG bắt đầu bằng '//' (tránh protocol-relative URL)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  // Không cho phép giao thức bên ngoài như http:, https:, javascript:, data:
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  const pathOnly = trimmed.split('?')[0].split('#')[0];

  // Không cho chuyển hướng về lại /login để tránh vòng lặp
  if (pathOnly === '/login') {
    return null;
  }

  // Chỉ chấp nhận các tiền tố route hợp lệ của hệ thống
  const validPrefixes = ['/portal', '/dashboard', '/pending', '/status', '/admin', '/staff', '/catalog', '/policy', '/courses', '/forgot-password', '/reset-password', '/'];
  const isValid = validPrefixes.some(prefix => pathOnly === prefix || pathOnly.startsWith(prefix + '/'));
  if (!isValid) {
    return null;
  }

  return trimmed;
}

/**
 * 3. Kiểm tra quyền truy cập route trực tiếp (Route Guard)
 */
export type RouteAccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'UNAUTHENTICATED'; redirectTo: string }
  | { allowed: false; reason: 'DISABLED'; message: string }
  | { allowed: false; reason: 'INVALID_PROFILE'; message: string }
  | { allowed: false; reason: 'ALREADY_AUTHENTICATED'; defaultRoute: string }
  | { allowed: false; reason: 'FORBIDDEN'; defaultRoute: string; message: string };

export function checkRouteAccess(path: string, auth: AuthSessionData | null): RouteAccessResult {
  const cleanPath = path.split('?')[0].split('#')[0];

  // 1. Các trang công khai
  if (cleanPath === '/' || cleanPath === '/catalog' || cleanPath === '/policy' || cleanPath === '/courses' || cleanPath === '/forgot-password' || cleanPath === '/reset-password') {
    return { allowed: true };
  }

  // 2. Trang /login
  if (cleanPath === '/login') {
    if (!auth || !auth.user || auth.role === 'public') {
      return { allowed: true };
    }
    // Người đã đăng nhập vào /login -> chuyển đến trang phù hợp
    const dest = resolveDefaultDestination(auth);
    if (dest.type === 'ROUTE') {
      return {
        allowed: false,
        reason: 'ALREADY_AUTHENTICATED',
        defaultRoute: dest.path,
      };
    }
    if (dest.type === 'DISABLED') {
      return { allowed: false, reason: 'DISABLED', message: dest.reason };
    }
    return { allowed: false, reason: 'INVALID_PROFILE', message: dest.reason };
  }

  // 3. Truy cập trang nội bộ khi CHƯA đăng nhập -> chuyển về /login kèm redirect_to
  if (!auth || !auth.user || auth.role === 'public') {
    const encodedRedirect = encodeURIComponent(path);
    return {
      allowed: false,
      reason: 'UNAUTHENTICATED',
      redirectTo: `/login?redirect_to=${encodedRedirect}`,
    };
  }

  // 4. Kiểm tra tài khoản bị vô hiệu hóa (is_active === false)
  if (auth.user.is_active === false) {
    return {
      allowed: false,
      reason: 'DISABLED',
      message: 'Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Ban Tuyển sinh Nhà trường để được hỗ trợ.',
    };
  }

  const role = auth.user.role;
  const affiliateStatus = auth.affiliate?.status;

  // 5. Kiểm tra quyền trên route /portal (Cổng CTV: Tổng quan, Khóa học, Khách hàng)
  if (cleanPath === '/portal' || cleanPath.startsWith('/portal/') || cleanPath === '/dashboard') {
    if (role === 'affiliate') {
      if (affiliateStatus === 'ACTIVE') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'FORBIDDEN',
        defaultRoute: '/pending',
        message: 'Tài khoản của bạn chưa ở trạng thái ACTIVE để truy cập Cổng Cộng tác viên.',
      };
    }

    const defaultRoute = (role === 'staff' || role === 'admin') ? '/admin' : '/';
    return {
      allowed: false,
      reason: 'FORBIDDEN',
      defaultRoute,
      message: 'Khu vực Cổng Cộng tác viên chỉ dành cho tài khoản Cộng tác viên Tuyển sinh.',
    };
  }

  // 6. Kiểm tra quyền trên route /pending (Màn hình trạng thái xét duyệt CTV)
  if (cleanPath === '/pending' || cleanPath === '/status') {
    if (role === 'affiliate') {
      if (affiliateStatus === 'PENDING_REVIEW' || affiliateStatus === 'SUSPENDED' || affiliateStatus === 'REJECTED') {
        return { allowed: true };
      }
      if (affiliateStatus === 'ACTIVE') {
        return {
          allowed: false,
          reason: 'FORBIDDEN',
          defaultRoute: '/portal',
          message: 'Tài khoản của bạn đã được phê duyệt và đang hoạt động (ACTIVE).',
        };
      }
    }

    const defaultRoute = (role === 'staff' || role === 'admin') ? '/admin' : '/';
    return {
      allowed: false,
      reason: 'FORBIDDEN',
      defaultRoute,
      message: 'Trang trạng thái hồ sơ chỉ dành cho tài khoản Cộng tác viên Tuyển sinh.',
    };
  }

  // 7.1. Tuyến đường Admin đặc thù: /admin/system-settings chỉ dành riêng cho Admin
  if (cleanPath === '/admin/system-settings') {
    if (role === 'admin') {
      return { allowed: true };
    }
    const defaultRoute = role === 'staff' ? '/admin' : (affiliateStatus === 'ACTIVE' ? '/portal' : '/pending');
    return {
      allowed: false,
      reason: 'FORBIDDEN',
      defaultRoute,
      message: 'Chỉ Quản trị viên (Admin) mới có quyền truy cập module Quản trị hệ thống.',
    };
  }

  // 7.2. Kiểm tra quyền trên route /admin (Khu vực Quản trị & Cán bộ Tuyển sinh)
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/') || cleanPath === '/staff' || cleanPath.startsWith('/staff/')) {
    if (role === 'admin' || role === 'staff') {
      return { allowed: true };
    }

    const defaultRoute = affiliateStatus === 'ACTIVE' ? '/portal' : '/pending';
    return {
      allowed: false,
      reason: 'FORBIDDEN',
      defaultRoute,
      message: 'Bạn không có quyền truy cập khu vực Quản trị hệ thống hoặc Cán bộ Tuyển sinh.',
    };
  }

  return { allowed: true };
}

/**
 * 4. Xử lý chuyển hướng sau khi đăng nhập thành công:
 * Chỉ quay lại redirect_to nếu tài khoản CÓ ĐỦ QUYỀN vào trang đó;
 * nếu không, chuyển đến trang mặc định theo vai trò/trạng thái.
 */
export function resolvePostLoginDestination(
  requestedRedirect: string | null | undefined,
  auth: AuthSessionData
): { targetPath: string; isFallback: boolean } {
  const defaultDest = resolveDefaultDestination(auth);
  if (defaultDest.type !== 'ROUTE') {
    return { targetPath: '/', isFallback: true };
  }

  const cleanRedirect = sanitizeRedirectUrl(requestedRedirect);
  if (!cleanRedirect) {
    return { targetPath: defaultDest.path, isFallback: false };
  }

  // Kiểm tra quyền hạn trên trang yêu cầu
  const check = checkRouteAccess(cleanRedirect, auth);
  if (check.allowed) {
    return { targetPath: cleanRedirect, isFallback: false };
  }

  // Nếu không đủ quyền, điều hướng về trang mặc định theo vai trò/trạng thái
  return { targetPath: defaultDest.path, isFallback: true };
}
