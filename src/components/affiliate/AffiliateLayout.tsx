import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Users,
  LogOut,
  Copy,
  Check,
  Menu,
  X,
  User,
  ChevronDown,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { UserSessionProfile, AffiliateSessionProfile } from '../../utils/navigationGuard';
import { AffiliateLandingConfig } from '../../types/landingConfig';
import { AFFILIATE_NAV_ITEMS } from '../../config/affiliateNavConfig';

interface AffiliateLayoutProps {
  user: UserSessionProfile | null;
  affiliate: AffiliateSessionProfile | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  brandConfig?: AffiliateLandingConfig;
  children: React.ReactNode;
}

export const AffiliateLayout: React.FC<AffiliateLayoutProps> = ({
  user,
  affiliate,
  currentPath,
  onNavigate,
  onLogout,
  brandConfig,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
        setAccountMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Thông tin hiển thị từ hồ sơ thật
  const fullName = affiliate?.full_name || user?.full_name || '';
  const affiliateCode = affiliate?.affiliate_code || '';
  const email = affiliate?.email || user?.email || '';
  const isActive = affiliate?.status === 'ACTIVE';

  // Sao chép mã CTV vào bộ nhớ tạm
  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!affiliateCode) return;
    try {
      await navigator.clipboard.writeText(affiliateCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy affiliate code:', err);
    }
  };

  // Điều hướng và tự động đóng menu mobile
  const handleSelectNav = (path: string) => {
    setMobileSidebarOpen(false);
    onNavigate(path);
  };

  // Danh mục menu dùng chung từ AFFILIATE_NAV_ITEMS
  const navItems = AFFILIATE_NAV_ITEMS;

  const brandName = brandConfig?.header?.logoText || 'TRƯỜNG SAIGONTOURIST';
  const logoBadge = brandConfig?.header?.logoBadgeText || 'STHC';

  // Lấy 2 ký tự đầu viết tắt tên đại diện
  const getInitials = (name: string) => {
    if (!name.trim()) return 'CTV';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Nội dung Sidebar dùng chung cho cả Desktop và Mobile Drawer
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#0B1E3F] text-slate-200 select-none">
      {/* Phía trên Sidebar: Thương hiệu & Hồ sơ CTV */}
      <div className="p-5 border-b border-blue-900/60 space-y-4">
        {/* Logo trường trên sidebar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-800 flex items-center justify-center text-amber-400 shadow-inner">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider text-white">
                  {logoBadge}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  CTV
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-200 block truncate max-w-[140px]">
                {brandName}
              </span>
            </div>
          </div>

          {/* Nút đóng trên mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Đóng menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Khối thông tin hồ sơ CTV: Tên, Mã CTV, Trạng thái */}
        <div className="bg-blue-950/70 rounded-xl p-3.5 border border-blue-800/50 space-y-2.5">
          {/* Tên CTV */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-blue-300/80 font-medium block">
              Cộng tác viên
            </span>
            <div className="text-sm font-bold text-white truncate" title={fullName || 'Đang tải...'}>
              {fullName || (
                <span className="text-xs text-blue-300 font-normal italic">Đang tải hồ sơ...</span>
              )}
            </div>
          </div>

          {/* Mã CTV kèm nút sao chép */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-900/50">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] text-blue-300/70 font-medium">Mã:</span>
              <span className="font-mono text-xs font-bold text-amber-300 tracking-wide truncate">
                {affiliateCode || 'Đang tải...'}
              </span>
            </div>

            {affiliateCode && (
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label="Sao chép mã CTV"
                title={copiedCode ? 'Đã sao chép vào bộ nhớ tạm' : 'Sao chép mã CTV'}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  copiedCode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-blue-900/80 text-blue-200 hover:text-white hover:bg-blue-800 border border-blue-700/60'
                }`}
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Chép</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Nhãn trạng thái "Đang hoạt động" nếu ACTIVE */}
          {isActive && (
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đang hoạt động</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu chính theo thứ tự quy định */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <span className="px-3 text-[10px] font-semibold text-blue-300/60 uppercase tracking-wider block mb-2">
          Điều hướng
        </span>
        {navItems.map((item) => {
          const active = item.isActiveMatch(currentPath);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleSelectNav(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left group ${
                active
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
                  : 'text-slate-300 hover:text-white hover:bg-blue-900/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-slate-950' : 'text-blue-300 group-hover:text-amber-400'
                }`}
              />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Phía dưới Sidebar: Nút Đăng xuất */}
      <div className="p-3 border-t border-blue-900/60">
        <button
          type="button"
          onClick={onLogout}
          aria-label="Đăng xuất khỏi tài khoản"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-all text-left"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      {/* ========================================================================= */}
      {/* 1. MOBILE SIDEBAR DRAWER (NGĂN KÉO) */}
      {/* ========================================================================= */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          {/* Backdrop mờ phía ngoài */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container trượt từ trái ra */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 flex flex-col">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DESKTOP SIDEBAR CỐ ĐỊNH BÊN TRÁI */}
      {/* ========================================================================= */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-blue-950/70 z-30 shadow-lg">
        {renderSidebarContent(false)}
      </aside>

      {/* ========================================================================= */}
      {/* 3. VÙNG NỘI DUNG CHÍNH BÊN PHẢI (Có padding bên trái để không bị che) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* ======================================================================= */}
        {/* 4. HEADER PHÍA TRÊN */}
        {/* ======================================================================= */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Bên trái Header: Nút mobile toggle, Logo trường và tên "Cổng Cộng tác viên" */}
          <div className="flex items-center gap-3">
            {/* Nút mở menu trên Mobile */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu điều hướng"
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo trường và Tên cổng */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-extrabold text-blue-950 tracking-tight leading-tight">
                  Cổng Cộng tác viên
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[160px] sm:max-w-none">
                  {brandName}
                </span>
              </div>
            </div>
          </div>

          {/* Bên phải Header: Họ tên CTV và Menu tài khoản */}
          <div className="flex items-center gap-3" ref={accountMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
                aria-label="Mở menu tài khoản CTV"
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-900"
              >
                {/* Avatar tròn với ký tự viết tắt */}
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
                  {fullName ? getInitials(fullName) : <User className="w-4 h-4" />}
                </div>

                {/* Tên CTV và vai trò (ẩn phụ đề trên màn hình rất nhỏ) */}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 max-w-[140px] truncate leading-tight">
                    {fullName || (
                      <span className="text-slate-400 font-normal italic">Đang tải...</span>
                    )}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    CTV Tuyển sinh
                  </span>
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform hidden sm:block" />
              </button>

              {/* Menu tài khoản Popover */}
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in">
                  {/* Thông tin hồ sơ trong popup */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Tài khoản đang đăng nhập
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {fullName || 'Đang tải...'}
                    </div>
                    {email && (
                      <div className="text-[11px] text-slate-500 truncate" title={email}>
                        {email}
                      </div>
                    )}
                    {affiliateCode && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-mono text-[11px] font-bold border border-blue-200/60">
                        <span>Mã:</span>
                        <span>{affiliateCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Nút sao chép mã nhanh trong popup */}
                  {affiliateCode && (
                    <div className="px-2 py-1">
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:text-blue-900 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Sao chép mã giới thiệu</span>
                        </span>
                        {copiedCode && (
                          <span className="text-[10px] font-bold text-emerald-600">Đã chép!</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Nút Đăng xuất */}
                  <div className="px-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ======================================================================= */}
        {/* 5. VÙNG NỘI DUNG CHÍNH (MAIN BODY) */}
        {/* ======================================================================= */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
