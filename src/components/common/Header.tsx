import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  LogIn,
  Phone,
  User,
  LogOut,
} from 'lucide-react';
import { api } from '../../services/api';

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
  onNavigate,
  onOpenRegisterAffiliate,
  onOpenLoginAffiliate,
  onLogout,
  currentUser,
  currentAffiliate,
  refCode,
}) => {
  const [headerConfig, setHeaderConfig] = useState<{
    logo_url?: string | null;
    logo_alt?: string | null;
    hotline?: string | null;
  }>({});

  useEffect(() => {
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data) {
        setHeaderConfig({
          logo_url: res.data.logo_url,
          logo_alt: res.data.logo_alt,
          hotline: res.data.hotline,
        });
      }
    }).catch(() => {});
  }, []);

  const handleRegisterClick = () => {
    const scrollToForm = () => {
      const el = document.getElementById('affiliate-registration-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = el.querySelector('input');
        if (input) setTimeout(() => input.focus(), 300);
      } else {
        onOpenRegisterAffiliate();
      }
    };

    if (window.location.pathname !== '/') {
      onNavigate('affiliate_landing');
      setTimeout(scrollToForm, 300);
    } else {
      scrollToForm();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1E3F] text-slate-100 border-b border-blue-900/60 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2.5">
          {/* 1. Logo on the left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('affiliate_landing')}
              className="flex items-center gap-2 text-left group focus:outline-none"
            >
              {headerConfig.logo_url ? (
                <img
                  src={headerConfig.logo_url}
                  alt={headerConfig.logo_alt || 'Logo Trường Saigontourist'}
                  className="h-10 sm:h-12 w-auto max-w-[200px] object-contain rounded-lg bg-white/5 p-1 border border-blue-800/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center text-amber-400 shadow-sm border border-amber-400/30">
                  <GraduationCap className="w-6 h-6" />
                </div>
              )}
            </button>

            {refCode && (
              <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Mã CTV: <strong>{refCode}</strong>
              </span>
            )}
          </div>

          {/* 2. Hotline, Login, Register */}
          <div className="flex items-center gap-3 sm:gap-4">
            {headerConfig.hotline && (
              <a
                href={`tel:${headerConfig.hotline.replace(/\s+/g, '')}`}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-blue-950/60 border border-blue-800/60 text-blue-100 rounded-xl text-xs font-semibold hover:bg-blue-950 transition-colors shadow-xs"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>{headerConfig.hotline}</span>
              </a>
            )}

            {currentRole === 'staff' || currentRole === 'admin' ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-blue-200 hidden md:inline">{currentUser?.email}</span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                )}
              </div>
            ) : currentRole === 'affiliate_active' || currentRole === 'affiliate_pending' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('affiliate_portal')}
                  className="px-3.5 py-2 bg-blue-900 hover:bg-blue-950 text-white border border-blue-700/60 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Cổng CTV</span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* 3. Nút Đăng nhập (light border) */}
                <button
                  onClick={onOpenLoginAffiliate}
                  className="px-3.5 sm:px-4 py-2 text-xs font-semibold text-white border border-blue-400/40 hover:bg-blue-900/50 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-amber-400" />
                  <span>Đăng nhập</span>
                </button>

                {/* 4. Nút Đăng ký (prominent yellow) */}
                <button
                  onClick={handleRegisterClick}
                  className="px-4 sm:px-5 py-2 text-xs font-extrabold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all active:scale-95 flex items-center"
                >
                  <span>Đăng ký</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
