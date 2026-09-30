import React, { useState } from 'react';
import {
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  User,
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { UserRole } from '../../types';

interface HeaderProps {
  currentRole: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin';
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenConsultationModal: () => void;
  onOpenRegisterAffiliate: () => void;
  onOpenLoginAffiliate: () => void;
  onLogout?: () => void;
  currentUser?: any;
  currentAffiliate?: any;
  refCode?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  activeTab,
  onNavigate,
  onOpenConsultationModal,
  onOpenRegisterAffiliate,
  onOpenLoginAffiliate,
  onLogout,
  currentUser,
  currentAffiliate,
  refCode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-8 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark with icon */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('affiliate_landing')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-amber-400 shadow-sm group-hover:bg-blue-950 transition-colors">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-900 transition-colors">
                  TRƯỜNG SAIGONTOURIST
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wider">
                  CỔNG CỘNG TÁC VIÊN TUYỂN SINH
                </span>
              </div>
            </button>

            {refCode && (
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Mã giới thiệu: <strong className="ml-1 font-mono">{refCode}</strong>
              </span>
            )}
          </div>

          {/* Zone 2: 4-6 clean text navigation links (Hidden for staff/admin) */}
          {currentRole !== 'staff' && currentRole !== 'admin' && (
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
              <button
                onClick={() => onNavigate('affiliate_landing')}
                className={`hover:text-blue-900 transition-colors ${
                  activeTab === 'affiliate_landing' ? 'text-blue-900 font-semibold border-b-2 border-blue-900 py-4' : ''
                }`}
              >
                Giới thiệu & Đăng ký CTV
              </button>

              <button
                onClick={() => onNavigate('public_catalog')}
                className={`hover:text-blue-900 transition-colors ${
                  activeTab === 'public_catalog' ? 'text-blue-900 font-semibold border-b-2 border-blue-900 py-4' : ''
                }`}
              >
                Ngành đào tạo STHC
              </button>

              <button
                onClick={() => onNavigate('affiliate_policy')}
                className={`hover:text-blue-900 transition-colors ${
                  activeTab === 'affiliate_policy' ? 'text-blue-900 font-semibold border-b-2 border-blue-900 py-4' : ''
                }`}
              >
                Chính sách 500k
              </button>

              {/* Portal Link depends on Role */}
              {currentRole === 'public' && (
                <button
                  onClick={onOpenLoginAffiliate}
                  className="hover:text-blue-900 transition-colors text-slate-600"
                >
                  Cổng CTV Tuyển Sinh
                </button>
              )}

              {(currentRole === 'affiliate_pending' || currentRole === 'affiliate_active') && (
                <button
                  onClick={() => onNavigate('affiliate_portal')}
                  className={`hover:text-blue-900 transition-colors ${
                    activeTab === 'affiliate_portal' ? 'text-blue-900 font-semibold border-b-2 border-blue-900 py-4' : ''
                  }`}
                >
                  Cổng CTV Của Tôi
                </button>
              )}
            </nav>
          )}

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2.5">
            {/* PUBLIC STATE: Show Login & Register CTA */}
            {currentRole === 'public' && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={onOpenLoginAffiliate}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-900" />
                  <span>Đăng nhập CTV</span>
                </button>
                <button
                  onClick={onOpenRegisterAffiliate}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-900 hover:text-blue-950 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Đăng ký CTV
                </button>
              </div>
            )}

            {/* AFFILIATE PENDING STATE */}
            {currentRole === 'affiliate_pending' && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Hồ sơ Chờ Duyệt</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Đăng xuất tài khoản"
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-[11px] font-medium hidden md:inline">Thoát</span>
                  </button>
                )}
              </div>
            )}

            {/* AFFILIATE ACTIVE STATE */}
            {currentRole === 'affiliate_active' && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono font-bold">{currentAffiliate?.affiliate_code || 'STHCCTV'}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Đăng xuất tài khoản"
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-[11px] font-medium hidden md:inline">Thoát</span>
                  </button>
                )}
              </div>
            )}

            {/* STAFF / ADMIN STATE */}
            {(currentRole === 'staff' || currentRole === 'admin') && (
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-xl flex items-center gap-2 font-medium">
                  <span className="font-mono font-bold text-blue-900">{currentUser?.email || 'admin@sthc.edu.vn'}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title="Đăng xuất tài khoản"
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200 shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                )}
              </div>
            )}

            {/* Main Lead Consultation CTA (Hidden for staff/admin) */}
            {currentRole !== 'staff' && currentRole !== 'admin' && (
              <button
                onClick={onOpenConsultationModal}
                className="px-3.5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-all flex items-center gap-1 whitespace-nowrap active:scale-95"
              >
                <span>Đăng Ký Tư Vấn</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            <button
              onClick={() => {
                onNavigate('affiliate_landing');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-blue-900 bg-blue-50/60"
            >
              Giới thiệu & Đăng ký CTV
            </button>
            <button
              onClick={() => {
                onNavigate('public_catalog');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ngành đào tạo STHC
            </button>
            <button
              onClick={() => {
                onNavigate('affiliate_policy');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Chính sách thưởng 500k
            </button>

            {currentRole === 'public' && (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLoginAffiliate();
                  }}
                  className="text-left py-2 px-3 rounded-lg text-sm font-medium text-blue-900 bg-blue-50/50 flex items-center justify-between"
                >
                  <span>Đăng nhập Cổng CTV</span>
                  <LogIn className="w-4 h-4 text-blue-900" />
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegisterAffiliate();
                  }}
                  className="text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Đăng ký CTV mới
                </button>
              </>
            )}

            {(currentRole === 'affiliate_pending' || currentRole === 'affiliate_active') && (
              <button
                onClick={() => {
                  onNavigate('affiliate_portal');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-blue-900 bg-blue-50"
              >
                Cổng CTV Tuyển Sinh {currentRole === 'affiliate_pending' ? '(Chờ duyệt)' : '(Hoạt động)'}
              </button>
            )}

            {(currentRole === 'staff' || currentRole === 'admin') && (
              <button
                onClick={() => {
                  onNavigate('admin_portal');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 px-3 rounded-lg text-sm font-semibold text-blue-900 bg-blue-50"
              >
                Cổng Quản Trị Hệ Thống
              </button>
            )}

            {currentRole !== 'public' && onLogout && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="text-left py-2 px-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center justify-between"
              >
                <span>Đăng xuất tài khoản</span>
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
