import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Menu,
  X,
  Bell,
  User,
  KeyRound,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Info,
  Settings,
} from 'lucide-react';
import { UserSessionProfile, AffiliateSessionProfile } from '../../utils/navigationGuard';
import { AffiliateLandingConfig } from '../../types/landingConfig';
import { ADMIN_NAV_ITEMS, AFFILIATE_NAV_ITEMS, NavItem } from '../../config/navConfig';
import { ProfileDetailView } from './ProfileDetailView';
import { useSystemBranding } from '../../contexts/SystemBrandingContext';
import { usePortalHeader } from '../../contexts/PortalHeaderContext';

interface AppLayoutProps {
  role: 'staff' | 'admin' | 'affiliate_active' | 'affiliate_pending' | string;
  user: UserSessionProfile | null;
  affiliate: AffiliateSessionProfile | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  brandConfig?: AffiliateLandingConfig;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  role,
  user,
  affiliate,
  currentPath,
  onNavigate,
  onLogout,
  brandConfig,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [p1NoticeModalMessage, setP1NoticeModalMessage] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
        setAccountMenuOpen(false);
        setNotificationOpen(false);
        setP1NoticeModalMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { branding } = useSystemBranding();
  const [logoImgError, setLogoImgError] = useState(false);

  useEffect(() => {
    setLogoImgError(false);
  }, [branding.logo_backend_url]);

  const isAdminOrStaff = role === 'admin' || role === 'staff';
  const navItems: NavItem[] = (isAdminOrStaff ? ADMIN_NAV_ITEMS : AFFILIATE_NAV_ITEMS).filter((item) => {
    if (item.adminOnly) {
      return user?.role === 'admin' || role === 'admin';
    }
    return true;
  });

  const brandName = branding.unit_name || brandConfig?.header?.logoText || 'Trường Trung cấp Du lịch & Khách sạn Saigontourist';
  const logoBadge = branding.system_short_name || brandConfig?.header?.logoBadgeText || 'STHC_CTV';

  // Get initials for avatar
  const getInitials = (nameOrEmail: string) => {
    if (!nameOrEmail.trim()) return 'ST';
    const clean = nameOrEmail.split('@')[0];
    const words = clean.trim().split(/[\s._-]+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const displayName = affiliate?.full_name || user?.full_name || user?.email || 'Người dùng hệ thống';
  const displayEmail = affiliate?.email || user?.email || '';

  // Current page title based on active nav item
  const activeNavItem = navItems.find((item) => item.isActiveMatch(currentPath));
  const pageTitle = activeNavItem ? activeNavItem.title : (isAdminOrStaff ? 'Quản trị hệ thống' : 'Cổng Cộng tác viên');

  const handleSelectNav = (path: string) => {
    setMobileSidebarOpen(false);
    onNavigate(path);
  };

  const { headerMeta } = usePortalHeader();

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-955 antialiased selection:bg-amber-400 selection:text-slate-950">
      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileSidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Đóng menu"
          onClick={() => setMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setMobileSidebarOpen(false);
          }}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* SIDEBAR (Desktop & Mobile Drawer) */}
      <aside
        aria-label="Sidebar điều hướng"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0B1E3F] text-slate-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } shadow-2xl border-r border-blue-900/40`}
      >
        {/* Sidebar Header: Logo & Title */}
        <div className="p-4 border-b border-blue-900/60 flex items-center justify-between min-h-[73px]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-800 flex items-center justify-center text-amber-400 overflow-hidden shadow-inner">
              {branding.logo_backend_url && !logoImgError ? (
                <img
                  src={branding.logo_backend_url}
                  alt={logoBadge}
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoImgError(true)}
                />
              ) : (
                <GraduationCap className="w-6 h-6" />
              )}
            </div>
            {(!isCollapsed || mobileSidebarOpen) && (
              <div className="flex flex-col truncate min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wider text-white truncate">
                    {logoBadge}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20 shrink-0">
                    {isAdminOrStaff ? (user?.role === 'admin' || role === 'admin' ? 'ADMIN' : 'STAFF') : 'CTV'}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-blue-200 truncate" title={brandName}>
                  {brandName}
                </span>
              </div>
            )}
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Đóng menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = item.isActiveMatch(currentPath);

            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.path)}
                title={isCollapsed && !mobileSidebarOpen ? item.title : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-medium transition-all group relative ${
                  active
                    ? 'bg-blue-900 text-white font-semibold shadow-md'
                    : 'text-slate-300 hover:bg-blue-950 hover:text-white'
                } ${isCollapsed && !mobileSidebarOpen ? 'justify-center' : ''}`}
              >
                <IconComponent className={`w-5 h-5 shrink-0 ${active ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                {(!isCollapsed || mobileSidebarOpen) && (
                  <span className="truncate text-left flex-1">{item.title}</span>
                )}
                {active && (!isCollapsed || mobileSidebarOpen) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Desktop Collapse Toggle */}
        <div className="p-3 border-t border-blue-900/60 hidden lg:flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-[11px] font-medium text-slate-400 px-2 truncate">
              Thu gọn menu
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-blue-900 transition-colors mx-auto"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* MAIN WRAPPER (Header + Workspace) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 min-h-[64px] sm:min-h-[68px] px-4 sm:px-8 py-2.5 flex items-center justify-between shadow-xs gap-3">
          {/* Header Left: Mobile Toggle & Page Title with dynamic Badge & Subtitle */}
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu"
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  {headerMeta?.title || pageTitle}
                </h1>
                {headerMeta?.badge && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-100 shrink-0">
                    {headerMeta.badge}
                  </span>
                )}
              </div>
              {headerMeta?.subtitle && (
                <p className="text-xs text-slate-500 line-clamp-1 sm:truncate mt-0.5 leading-snug">
                  {headerMeta.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Header Right: Notifications & Account Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-label="Thông báo"
                className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              >
                <Bell className="w-5 h-5" />
              </button>

              {/* Notification Popover (per A0.4 instructions) */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 text-xs space-y-3 z-50 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-900">Thông báo hệ thống</span>
                    <button
                      onClick={() => setNotificationOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="py-4 text-center text-slate-600 space-y-1">
                    <Info className="w-6 h-6 text-blue-900 mx-auto opacity-80" />
                    <p className="font-medium">Thông tin thông báo sẽ được bổ sung.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Account Menu Dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200/80 bg-white"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-900 text-amber-400 font-bold flex items-center justify-center text-xs shadow-inner uppercase tracking-wider overflow-hidden">
                  {user?.avatar_url && !avatarError ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left truncate max-w-[150px]">
                  <span className="text-xs font-bold text-slate-900 truncate">{displayName}</span>
                  <span className="text-[10px] text-slate-500 truncate">{displayEmail}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tài khoản</span>
                    <span className="font-bold text-slate-900 truncate block">{displayName}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{displayEmail}</span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate(isAdminOrStaff ? '/admin/profile' : '/portal/profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>Thông tin cá nhân</span>
                    </button>
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate(isAdminOrStaff ? '/admin/profile' : '/portal/profile');
                      }}
                      className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>Đổi mật khẩu</span>
                    </button>
                    {(user?.role === 'admin' || role === 'admin') && (
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          onNavigate('/admin/system-settings');
                        }}
                        className="w-full text-left px-4 py-2.5 text-blue-700 hover:bg-blue-50 flex items-center gap-2.5 transition-colors font-semibold"
                      >
                        <Settings className="w-4 h-4 text-blue-600" />
                        <span>Quản trị hệ thống</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-bold"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 px-4 py-4 sm:px-8 sm:py-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* P1 NOTICE MODAL */}
      {p1NoticeModalMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Thông báo phát triển</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{p1NoticeModalMessage}</p>
            </div>
            <button
              onClick={() => setP1NoticeModalMessage(null)}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* PERSONAL PROFILE MODAL */}
      {isProfileModalOpen && (
        <ProfileDetailView
          isModal={true}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={user}
          currentRole={role}
        />
      )}
    </div>
  );
};
