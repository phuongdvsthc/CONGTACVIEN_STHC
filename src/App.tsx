import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './services/api';
import { Course } from './types';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { AffiliateLandingPage } from './components/landing/AffiliateLandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { defaultLandingConfig } from './config/defaultLandingConfig';
import { PublicHome } from './components/public/PublicHome';
import { PublicCatalogView } from './components/public/PublicCatalogView';
import { PublicCourseDetailPage } from './components/public/PublicCourseDetailPage';
import { AffiliatePolicy } from './components/public/AffiliatePolicy';
import { LeadConsultationForm } from './components/public/LeadConsultationForm';
import { ThankYouScreen } from './components/public/ThankYouScreen';
import { AffiliateDashboard } from './components/affiliate/AffiliateDashboard';
import { AffiliateLayout } from './components/affiliate/AffiliateLayout';
import { AffiliatePlaceholderPage } from './components/affiliate/AffiliatePlaceholderPage';
import { AffiliateCourseListView } from './components/affiliate/AffiliateCourseListView';
import { AffiliateCourseDetailView } from './components/affiliate/AffiliateCourseDetailView';
import { AffiliatePendingScreen } from './components/affiliate/AffiliatePendingScreen';
import { AffiliateRegisterModal } from './components/affiliate/AffiliateRegisterModal';
import { AffiliateLeadsView } from './components/affiliate/AffiliateLeadsView';
import { AffiliateLeadDetailView } from './components/affiliate/AffiliateLeadDetailView';
import { AdminPortal } from './components/admin/AdminPortal';
import { AdminLeadDetailView } from './components/admin/AdminLeadDetailView';
import { AdminPlaceholderPage } from './components/admin/AdminPlaceholderPage';
import { AdminHomepageConfigView } from './components/admin/AdminHomepageConfigView';
import { AdminSystemSettingsView } from './components/admin/AdminSystemSettingsView';
import { AppLayout } from './components/common/AppLayout';
import { AccessNoticeScreen } from './components/common/AccessNoticeScreen';
import { ProfileDetailView } from './components/common/ProfileDetailView';
import { SystemBrandingProvider } from './contexts/SystemBrandingContext';
import {
  AuthSessionData,
  checkRouteAccess,
  resolveDefaultDestination,
  resolvePostLoginDestination,
  sanitizeRedirectUrl,
} from './utils/navigationGuard';

export default function App() {
  // 1. Quản lý trạng thái phiên đăng nhập tập trung
  const [authSession, setAuthSession] = useState<AuthSessionData>({
    role: 'public',
    user: null,
    affiliate: null,
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [authNetworkError, setAuthNetworkError] = useState<boolean>(false);

  // 2. Quản lý đường dẫn hiện tại và kết quả kiểm tra quyền truy cập (Route Guard)
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const [accessState, setAccessState] = useState<{
    allowed: boolean;
    reason?: 'FORBIDDEN' | 'DISABLED' | 'INVALID_PROFILE' | 'UNAUTHENTICATED' | 'ALREADY_AUTHENTICATED';
    message?: string;
    defaultRoute?: string;
  }>({ allowed: true });

  const [courses, setCourses] = useState<Course[]>([]);
  const [refCode, setRefCode] = useState<string | null>(null);

  // Slug khóa học từ query (?course=...) khi ở trang chủ hoặc link tiếp thị công khai
  const [courseSlugParam, setCourseSlugParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('course') ? params.get('course')!.trim() : null;
  });

  // Login page notice & prefilled email
  const [loginInitialEmail, setLoginInitialEmail] = useState<string>('');
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);
  const [requestedRedirectParam, setRequestedRedirectParam] = useState<string | null>(null);

  // Modal controls
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [registerAffiliateModalOpen, setRegisterAffiliateModalOpen] = useState(false);
  const [modalFormResult, setModalFormResult] = useState<{ appointment_code?: string; message: string } | null>(null);

  // Tham chiếu ổn định đến authSession mới nhất để tránh vòng lặp re-render
  const authSessionRef = useRef<AuthSessionData>(authSession);
  useEffect(() => {
    authSessionRef.current = authSession;
  }, [authSession]);

  /**
   * Helper: Đánh giá quyền truy cập của auth hiện tại trên đường dẫn targetPath
   */
  const evaluateGuard = useCallback((targetPath: string, currentAuth: AuthSessionData) => {
    const cleanPath = targetPath.split('?')[0].split('#')[0];
    const check = checkRouteAccess(cleanPath, currentAuth);

    if (check.allowed) {
      setAccessState({ allowed: true });
      return { allowed: true };
    }

    if (check.reason === 'UNAUTHENTICATED') {
      // Chưa đăng nhập mà truy cập trang nội bộ -> chuyển về /login kèm redirect_to
      window.history.replaceState({}, '', check.redirectTo);
      setCurrentPath('/login');
      const params = new URLSearchParams(window.location.search);
      setRequestedRedirectParam(params.get('redirect_to'));
      setAccessState({ allowed: true });
      return { allowed: false, redirectedTo: '/login' };
    }

    if (check.reason === 'ALREADY_AUTHENTICATED') {
      // Người đã đăng nhập vào /login -> chuyển đến trang mặc định được phép
      window.history.replaceState({}, '', check.defaultRoute);
      setCurrentPath(check.defaultRoute);
      setAccessState({ allowed: true });
      return { allowed: false, redirectedTo: check.defaultRoute };
    }

    if (check.reason === 'FORBIDDEN') {
      // Có phiên nhưng không đủ quyền trên route này
      setAccessState({
        allowed: false,
        reason: 'FORBIDDEN',
        message: check.message,
        defaultRoute: check.defaultRoute,
      });
      return { allowed: false };
    }

    if (check.reason === 'DISABLED') {
      setAccessState({
        allowed: false,
        reason: 'DISABLED',
        message: check.message,
      });
      return { allowed: false };
    }

    if (check.reason === 'INVALID_PROFILE') {
      setAccessState({
        allowed: false,
        reason: 'INVALID_PROFILE',
        message: check.message,
      });
      return { allowed: false };
    }

    return { allowed: true };
  }, []);

  /**
   * Bộ điều hướng trung tâm (Unified Navigate)
   */
  const navigate = useCallback((toPath: string, replace = false, customAuth?: AuthSessionData) => {
    const cleanPath = toPath.split('?')[0].split('#')[0];
    const searchPart = toPath.includes('?') ? '?' + toPath.split('?')[1].split('#')[0] : '';

    // Cập nhật URL trình duyệt
    if (replace) {
      window.history.replaceState({}, '', toPath);
    } else {
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull !== toPath) {
        window.history.pushState({}, '', toPath);
      }
    }

    setCurrentPath(cleanPath);

    // Cập nhật tham số từ search (redirect_to và course)
    const urlParams = new URLSearchParams(searchPart || window.location.search);
    setRequestedRedirectParam(urlParams.get('redirect_to'));
    setCourseSlugParam(urlParams.get('course') ? urlParams.get('course')!.trim() : null);

    // Chạy kiểm tra phân quyền với auth được cung cấp hoặc auth ref mới nhất
    const authToUse = customAuth || authSessionRef.current;
    evaluateGuard(cleanPath, authToUse);
  }, [evaluateGuard]);

  /**
   * Khởi tạo và tải phiên làm việc ban đầu từ API
   */
  const loadSession = useCallback(async () => {
    setIsCheckingAuth(true);
    setAuthNetworkError(false);

    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        const sessionData: AuthSessionData = {
          role: res.data.role || 'public',
          user: res.data.user || null,
          affiliate: res.data.affiliate || null,
        };

        setAuthSession(sessionData);

        // Đánh giá route hiện tại với thông tin xác thực vừa tải
        const initialPath = window.location.pathname;
        setCurrentPath(initialPath);

        const params = new URLSearchParams(window.location.search);
        setRequestedRedirectParam(params.get('redirect_to'));
        setCourseSlugParam(params.get('course') ? params.get('course')!.trim() : null);

        evaluateGuard(initialPath, sessionData);
      } else {
        // Unauthenticated session
        const publicSession: AuthSessionData = {
          role: 'public',
          user: null,
          affiliate: null,
        };
        setAuthSession(publicSession);
        evaluateGuard(window.location.pathname, publicSession);
      }
    } catch (err: any) {
      console.error('[LOAD SESSION ERROR]', err?.message);
      // Lỗi kết nối mạng: không đánh đồng với tài khoản bị khóa
      setAuthNetworkError(true);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [evaluateGuard]);

  // 3. Khởi tạo ứng dụng & lắng nghe sự kiện (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    // Đọc URL parameters (?ref=STHCCTVXXXX&course=slug)
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get('ref');
    const urlCourse = params.get('course');
    const urlRedirect = params.get('redirect_to');

    if (window.location.pathname === '/' && urlRef && !urlCourse) {
      const search = `?ref=${encodeURIComponent(urlRef)}`;
      window.history.replaceState({}, '', `/catalog${search}`);
      setCurrentPath('/catalog');
    }

    if (urlRef) {
      const cleanRef = urlRef.trim();
      setRefCode(cleanRef);
      localStorage.setItem('sthc_affiliate_ref', cleanRef);
      localStorage.setItem('sthc_affiliate_ref_time', Date.now().toString());
    } else {
      const savedRef = localStorage.getItem('sthc_affiliate_ref');
      const savedRefTime = localStorage.getItem('sthc_affiliate_ref_time');
      if (savedRef) {
        const elapsed = savedRefTime ? Date.now() - Number(savedRefTime) : 0;
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        if (!savedRefTime || elapsed < THIRTY_DAYS_MS) {
          setRefCode(savedRef);
        } else {
          localStorage.removeItem('sthc_affiliate_ref');
          localStorage.removeItem('sthc_affiliate_ref_time');
        }
      }
    }

    if (urlRedirect) {
      setRequestedRedirectParam(urlRedirect);
    }

    // Tải danh mục khóa học công khai
    api.getPublicCourses().then((res) => {
      if (res.success && res.data) {
        setCourses(res.data);
      }
    });

    // Tải phiên ban đầu
    loadSession();

    // SỬA C1.4 - ĐIỀU HƯỚNG CHUẨN CỦA LINK TIẾP THỊ & QUY TẮC TRANG CHỦ:
    // Link cũ /catalog?ref=...&course=... nếu có thì chuyển về /?ref=...&course=..., giữ đầy đủ tham số
    if (window.location.pathname === '/catalog' && urlCourse) {
      const search = window.location.search;
      navigate(`/${search}`, true);
    } else if (urlCourse) {
      setCourseSlugParam(urlCourse.trim());
      localStorage.setItem('sthc_selected_course', urlCourse.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Lắng nghe nút Back / Forward của trình duyệt (PopState)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);

      const params = new URLSearchParams(window.location.search);
      setRequestedRedirectParam(params.get('redirect_to'));
      setCourseSlugParam(params.get('course') ? params.get('course')!.trim() : null);

      // Chạy route guard ngay lập tức khi back/forward
      evaluateGuard(path, authSessionRef.current);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [evaluateGuard]);

  // 5. Đồng bộ trạng thái đăng xuất giữa các tab (Cross-tab Logout Sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sthc_auth_event' && e.newValue && e.newValue.startsWith('logout:')) {
        // Đã có tab khác đăng xuất -> lập tức xóa dữ liệu phiên và chuyển về /
        const publicSession: AuthSessionData = {
          role: 'public',
          user: null,
          affiliate: null,
        };
        setAuthSession(publicSession);
        authSessionRef.current = publicSession;
        setAccessState({ allowed: true });
        navigate('/', true, publicSession);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

  /**
   * 6. Xử lý ĐĂNG NHẬP THÀNH CÔNG (M1.4: Unified Post-Login Destination)
   */
  const handleLoginSuccess = (authData: any, requestedRedirectFromForm?: string | null) => {
    const newSession: AuthSessionData = {
      role: authData.role as any,
      user: authData.user,
      affiliate: authData.affiliate,
    };

    setAuthSession(newSession);
    authSessionRef.current = newSession;

    // Xác định URL muốn chuyển đến (ưu tiên requestedRedirect)
    const targetCandidate = requestedRedirectFromForm || requestedRedirectParam;
    const { targetPath, isFallback } = resolvePostLoginDestination(targetCandidate, newSession);

    // Xóa notice đăng nhập
    setLoginSuccessNotice(null);
    setRequestedRedirectParam(null);

    // Điều hướng đến trang đích được cấp phép với newSession trực tiếp
    navigate(targetPath, isFallback, newSession);
  };

  /**
   * 7. Xử lý ĐĂNG XUẤT TÀI KHOẢN (Đồng bộ đa tab & xóa sạch dữ liệu riêng)
   */
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}

    // Phát tín hiệu đồng bộ đăng xuất cho các tab khác
    try {
      localStorage.setItem('sthc_auth_event', 'logout:' + Date.now());
    } catch (e) {
      // Ignore storage errors in sandbox
    }

    // Xóa sạch trạng thái người dùng trong ứng dụng
    const publicSession: AuthSessionData = {
      role: 'public',
      user: null,
      affiliate: null,
    };
    setAuthSession(publicSession);
    authSessionRef.current = publicSession;
    setLoginSuccessNotice(null);
    setRequestedRedirectParam(null);
    setAccessState({ allowed: true });

    // Điều hướng về trang chủ / bằng replace để không giữ trang backend trong lịch sử
    navigate('/', true, publicSession);
  };

  /**
   * Chuyển đến form đăng ký CTV tại /
   */
  const handleNavigateToRegister = () => {
    navigate('/');
    setTimeout(() => {
      const formEl = document.getElementById('affiliate-registration-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstInput = formEl.querySelector('input') as HTMLInputElement | null;
        if (firstInput) setTimeout(() => firstInput.focus(), 300);
      }
    }, 100);
  };

  /**
   * Đăng ký CTV thành công → chuyển sang trang Đăng nhập /login kèm thông báo
   */
  const handleRegisterSuccess = (affData: any) => {
    setRegisterAffiliateModalOpen(false);
    setLoginInitialEmail(affData?.email || '');
    setLoginSuccessNotice(
      `Đăng ký tài khoản CTV thành công! Ban Tuyển sinh đã tiếp nhận hồ sơ mã ${affData?.affiliate_code || ''}. Vui lòng đăng nhập để kiểm tra trạng thái xét duyệt.`
    );
    navigate('/login');
  };

  // Mở trang đăng nhập chủ động
  const handleOpenLogin = (prefilledEmail?: string, customNotice?: string) => {
    if (prefilledEmail) setLoginInitialEmail(prefilledEmail);
    if (customNotice) setLoginSuccessNotice(customNotice);
    navigate('/login');
  };

  // =========================================================================
  // RENDER GIAO DIỆN
  // =========================================================================

  // 1. Trạng thái Đang kiểm tra phiên (Loading State)
  // Chỉ hiển thị màn hình kiểm tra phiên đối với các route nội bộ (/portal, /pending, /admin)
  // Các route công khai (/, /login, /catalog, /policy) hiển thị ngay lập tức để người dùng không bị kẹt màn hình tải
  const isProtectedPath =
    currentPath.startsWith('/portal') ||
    currentPath === '/pending' ||
    currentPath === '/admin' ||
    currentPath === '/staff';

  if (isCheckingAuth && isProtectedPath) {
    return <AccessNoticeScreen type="LOADING" />;
  }

  // 2. Trạng thái Lỗi kết nối mạng khi tải hồ sơ
  if (authNetworkError) {
    return (
      <AccessNoticeScreen
        type="NETWORK_ERROR"
        onRetry={loadSession}
        onLogout={handleLogout}
      />
    );
  }

  // 3. Trạng thái Bị chặn quyền truy cập / Vô hiệu hóa / Hồ sơ lỗi (Route Guard Interception)
  if (!accessState.allowed) {
    return (
      <AccessNoticeScreen
        type={accessState.reason === 'DISABLED' ? 'DISABLED' : accessState.reason === 'INVALID_PROFILE' ? 'INVALID_PROFILE' : 'FORBIDDEN'}
        message={accessState.message}
        defaultRoute={accessState.defaultRoute || '/'}
        onNavigateToDefault={(route) => navigate(route)}
        onRetry={loadSession}
        onLogout={handleLogout}
      />
    );
  }

  const isAffiliatePortal = currentPath === '/portal' || currentPath.startsWith('/portal/');

  // Map currentPath sang activeTab của Header
  const getActiveTabForHeader = () => {
    if (currentPath === '/catalog') return 'public_catalog';
    if (currentPath === '/policy') return 'affiliate_policy';
    if (currentPath === '/portal') return 'affiliate_portal';
    if (currentPath === '/pending') return 'affiliate_portal';
    if (currentPath === '/admin') return 'admin_portal';
    return 'affiliate_landing';
  };

  const isInternalPortal =
    currentPath.startsWith('/portal') ||
    currentPath.startsWith('/admin');

  return (
    <SystemBrandingProvider currentPath={currentPath}>
      {isInternalPortal ? (
        /* A0.4: KHU VỰC NỘI BỘ DÙNG CHUNG APPLAYOUT (HEADER + SIDEBAR + WORKSPACE) */
        <AppLayout
          role={authSession.role}
          user={authSession.user}
          affiliate={authSession.affiliate}
          currentPath={currentPath}
          onNavigate={(targetPath) => navigate(targetPath)}
          onLogout={handleLogout}
          brandConfig={defaultLandingConfig}
        >
          {/* AFFILIATE PORTAL ROUTING */}
          {(currentPath === '/portal' ||
            currentPath === '/portal/' ||
            currentPath === '/portal/dashboard' ||
            currentPath === '/portal/overview') && (
            <AffiliateDashboard
              key={authSession.affiliate?.id || authSession.affiliate?.affiliate_code || 'active_affiliate'}
              affiliateCode={authSession.affiliate?.affiliate_code || 'STHCCTV1088'}
              fullName={authSession.affiliate?.full_name || authSession.user?.full_name || 'Trần Thị Thu Thảo'}
              onNavigate={(path) => navigate(path)}
            />
          )}

          {currentPath === '/portal/profile' && (
            <ProfileDetailView
              currentUser={authSession.user}
              currentRole={authSession.role}
              onBack={() => navigate('/portal')}
              onAvatarUpdated={loadSession}
            />
          )}

          {currentPath.match(/^\/portal\/courses\/.+/) ? (
            <AffiliateCourseDetailView
              courseId={currentPath.replace('/portal/courses/', '')}
              onBack={() => navigate('/portal/courses')}
            />
          ) : currentPath.startsWith('/portal/courses') && (
            <AffiliateCourseListView
              onNavigateToOverview={() => navigate('/portal')}
              onSelectCourse={(courseSlug) => navigate(`/portal/courses/${courseSlug}`)}
            />
          )}

          {currentPath.match(/^\/portal\/leads\/([a-f0-9-]+)$/i) ? (
            <AffiliateLeadDetailView
              leadId={currentPath.replace('/portal/leads/', '')}
              onBack={() => {
                window.history.pushState({}, '', '/portal/leads');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            />
          ) : currentPath.startsWith('/portal/leads') && (
            <AffiliateLeadsView onNavigateToOverview={() => navigate('/portal')} />
          )}

          {/* ADMIN & STAFF PORTAL ROUTING */}
          {currentPath === '/admin/profile' && (
            <ProfileDetailView
              currentUser={authSession.user}
              currentRole={authSession.role}
              onBack={() => navigate('/admin')}
              onAvatarUpdated={loadSession}
            />
          )}

          {currentPath.match(/^\/admin\/leads\/([a-f0-9-]+)$/i) ? (
            <AdminLeadDetailView
              leadId={currentPath.replace('/admin/leads/', '')}
              currentUser={authSession.user}
              onBack={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.history.pushState({}, '', '/admin/reconcile');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
            />
          ) : (currentPath === '/admin' ||
            currentPath === '/admin/' ||
            currentPath.startsWith('/admin/affiliates') ||
            currentPath === '/admin/courses' ||
            currentPath === '/admin/leads' ||
            currentPath === '/admin/reconcile' ||
            currentPath === '/admin/rewards' ||
            currentPath === '/admin/audit') && (
            <AdminPortal currentUser={authSession.user} currentPath={currentPath} />
          )}

          {currentPath === '/admin/homepage' && (
            <AdminHomepageConfigView currentUser={authSession.user} />
          )}

          {currentPath === '/admin/staff-accounts' && (
            <AdminPlaceholderPage
              title="Tài khoản nhân viên"
              onNavigateToOverview={() => navigate('/admin')}
            />
          )}

          {currentPath === '/admin/system-settings' && (
            <AdminSystemSettingsView
              currentUser={authSession.user}
              onNavigateToOverview={() => navigate('/admin')}
            />
          )}
        </AppLayout>
      ) : (
        <div className="bg-[#070D18] font-sans text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950">
          {/* 
            CHỈ HIỂN THỊ HEADER CHUNG KHI Ở CÁC TRANG CÔNG KHAI (/catalog, /policy).
            Trang /, /login và /pending có giao diện độc lập riêng.
          */}
          {currentPath !== '/login' && currentPath !== '/pending' && currentPath !== '/forgot-password' && currentPath !== '/reset-password' && (
            <Header
              currentRole={authSession.role}
              activeTab={getActiveTabForHeader()}
              onNavigate={(tab) => {
                if (tab === 'affiliate_landing') navigate('/');
                else if (tab === 'public_catalog') {
                  const search = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';
                  navigate(`/catalog${search}`);
                }
                else if (tab === 'affiliate_policy') navigate('/policy');
                else if (tab === 'affiliate_portal') {
                  if (authSession.affiliate?.status === 'ACTIVE') navigate('/portal');
                  else navigate('/pending');
                } else if (tab === 'admin_portal') navigate('/admin');
              }}
              onOpenConsultationModal={() => {
                setModalFormResult(null);
                setConsultationModalOpen(true);
              }}
              onOpenRegisterAffiliate={handleNavigateToRegister}
              onOpenLoginAffiliate={() => handleOpenLogin()}
              onLogout={handleLogout}
              currentUser={authSession.user}
              currentAffiliate={authSession.affiliate}
              refCode={refCode}
            />
          )}

          {/* Main Body Content theo URL Routing */}
          <main>
            {/* ROUTE /login: TRANG ĐĂNG NHẬP CTV */}
            {currentPath === '/login' && (
              <LoginPage
                config={defaultLandingConfig}
                initialEmail={loginInitialEmail}
                successNotice={loginSuccessNotice}
                requestedRedirect={requestedRedirectParam}
                onLoginSuccess={handleLoginSuccess}
                onNavigateToRegister={handleNavigateToRegister}
                onNavigateToForgot={() => navigate('/forgot-password')}
                onGoHome={() => navigate('/')}
              />
            )}

            {/* ROUTE /forgot-password: TRANG QUÊN MẬT KHẨU */}
            {currentPath === '/forgot-password' && (
              <ForgotPasswordPage
                onNavigateToLogin={() => navigate('/login')}
                onNavigateToRegister={handleNavigateToRegister}
                onGoHome={() => navigate('/')}
              />
            )}

            {/* ROUTE /reset-password: TRANG ĐẶT LẠI MẬT KHẨU */}
            {currentPath === '/reset-password' && (
              <ResetPasswordPage
                onNavigateToLogin={(email, notice) => handleOpenLogin(email, notice)}
                onNavigateToForgot={() => navigate('/forgot-password')}
                onNavigateToRegister={handleNavigateToRegister}
                onGoHome={() => navigate('/')}
              />
            )}

            {/* ROUTE /: TRANG ĐẦU TIÊN GIỚI THIỆU VÀ ĐĂNG KÝ CTV HOẶC CHI TIẾT KHÓA HỌC CÔNG KHAI */}
            {currentPath === '/' && (
              courseSlugParam ? (
                <PublicCourseDetailPage
                  courseSlug={courseSlugParam}
                  refCode={refCode}
                  onNavigateHome={() => {
                    setCourseSlugParam(null);
                    const search = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';
                    navigate(`/${search}`);
                  }}
                  onBrowseCatalog={() => {
                    const search = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';
                    navigate(`/catalog${search}`);
                  }}
                  onSuccessNavigate={(targetUrl) => {
                    navigate(targetUrl, true);
                  }}
                />
              ) : (
                <PublicHome
                  courses={courses}
                  refCode={refCode}
                  onOpenRegisterAffiliate={handleNavigateToRegister}
                  onOpenLoginAffiliate={(prefilledEmail, customMsg) => handleOpenLogin(prefilledEmail, customMsg)}
                  onViewCourseDetail={(course) => {
                    const slug = course.slug || course.code || course.id;
                    const search = new URLSearchParams();
                    if (refCode) search.set('ref', refCode);
                    search.set('course', slug);
                    navigate(`/?${search.toString()}`);
                  }}
                />
              )
            )}

            {/* ROUTE /catalog: DANH MỤC KHÓA HỌC CÔNG KHAI */}
            {currentPath === '/catalog' && (
              <div className="bg-slate-50 text-slate-900 min-h-screen">
                <PublicCatalogView
                  refCode={refCode}
                  courses={courses}
                  onViewCourseDetail={(course) => {
                    const slugToUse = course.slug || course.code || course.id;
                    const searchParams = new URLSearchParams();
                    if (refCode) searchParams.set('ref', refCode);
                    searchParams.set('course', slugToUse);
                    navigate(`/?${searchParams.toString()}`);
                  }}
                  onNavigateHome={() => {
                    const search = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';
                    navigate(`/${search}`);
                  }}
                />
              </div>
            )}

            {/* ROUTE /policy: CHÍNH SÁCH THÙ LAO 500K CÔNG KHAI */}
            {currentPath === '/policy' && (
              <div className="bg-slate-50 text-slate-900 py-6 min-h-screen">
                <AffiliatePolicy
                  onRegisterClick={handleNavigateToRegister}
                />
              </div>
            )}

            {/* ROUTE /pending: TRANG TRẠNG THÁI HỒ SƠ CTV (PENDING_REVIEW, SUSPENDED, REJECTED) */}
            {currentPath === '/pending' && (
              <div className="bg-slate-50 text-slate-900 py-6 min-h-screen">
                <AffiliatePendingScreen
                  affiliateCode={authSession.affiliate?.affiliate_code || 'STHCCTV9001'}
                  fullName={authSession.affiliate?.full_name || authSession.user?.full_name || 'Nguyễn Văn Đang Chờ Duyệt'}
                  email={authSession.affiliate?.email || authSession.user?.email || 'ctv_cho_duyet@sthc.edu.vn'}
                  status={
                    (authSession.affiliate?.status as 'PENDING_REVIEW' | 'SUSPENDED' | 'REJECTED') ||
                    'PENDING_REVIEW'
                  }
                  reviewNote={authSession.affiliate?.review_note}
                  onRefreshStatus={async () => {
                    const res = await api.getMe();
                    if (res.success && res.data?.affiliate?.status === 'ACTIVE') {
                      const updatedSession: AuthSessionData = {
                        role: 'affiliate_active',
                        user: res.data.user,
                        affiliate: res.data.affiliate,
                      };
                      setAuthSession(updatedSession);
                      navigate('/portal');
                    }
                  }}
                  onLogout={handleLogout}
                  onGoHome={() => navigate('/')}
                />
              </div>
            )}
          </main>

          {/* Footer chỉ hiển thị ở các trang public (trang chi tiết khóa học đã có footer chuẩn STHC độc lập) */}
          {currentPath !== '/pending' && !(currentPath === '/' && courseSlugParam) && <Footer />}
        </div>
      )}

      {/* MODAL: Đăng ký tư vấn trực tiếp cho người học */}
      {consultationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl my-8">
            {modalFormResult ? (
              <ThankYouScreen
                appointmentCode={modalFormResult.appointment_code}
                message={modalFormResult.message}
                onBackToCourses={() => setConsultationModalOpen(false)}
              />
            ) : (
              <LeadConsultationForm
                courses={courses}
                refCode={refCode}
                onSuccess={(result) => setModalFormResult(result)}
                onCancel={() => setConsultationModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL: Đăng ký CTV mới */}
      <AffiliateRegisterModal
        isOpen={registerAffiliateModalOpen}
        onClose={() => setRegisterAffiliateModalOpen(false)}
        onSuccess={handleRegisterSuccess}
        onSwitchToLogin={() => {
          setRegisterAffiliateModalOpen(false);
          handleOpenLogin();
        }}
      />
    </SystemBrandingProvider>
  );
}
