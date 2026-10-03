import React, { useState, useEffect } from 'react';
import { Home, Phone } from 'lucide-react';
import { api } from '../../services/api';

interface PublicHeaderProps {
  onNavigateHome: () => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  showAuthButtons?: boolean;
  draftConfig?: {
    logo_url?: string | null;
    logo_alt?: string | null;
    hotline?: string | null;
  } | null;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onNavigateHome,
  onOpenLogin,
  onOpenRegister,
  showAuthButtons = false,
  draftConfig,
}) => {
  const [serverConfig, setServerConfig] = useState<{
    logo_url?: string | null;
    logo_alt?: string | null;
    hotline?: string | null;
  }>({});

  useEffect(() => {
    if (draftConfig !== undefined && draftConfig !== null) return;
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data) {
        setServerConfig(res.data);
      }
    }).catch(() => {});
  }, [draftConfig]);

  const config = (draftConfig !== undefined && draftConfig !== null) ? draftConfig : serverConfig;

  return (
    <header className="sticky top-0 z-40 bg-[#0B1E3F] border-b border-blue-950/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between min-h-[50px] gap-4">
        {/* Left: Logo or Home button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            {config.logo_url ? (
              <img
                src={config.logo_url}
                alt={config.logo_alt || 'Logo STHC'}
                className="h-8 max-h-8 object-contain"
              />
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-200 group-hover:text-white transition-colors">
                <Home className="w-4 h-4 text-amber-400" />
                <span>Trang chủ</span>
              </div>
            )}
          </button>
        </div>

        {/* Right: Hotline & Auth buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {config.hotline && config.hotline.trim() !== '' && (
            <a
              href={`tel:${config.hotline.trim()}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-xs shrink-0"
              title="Gọi hotline tư vấn tuyển sinh"
            >
              <Phone className="w-3.5 h-3.5 text-slate-900" />
              <span className="font-mono">{config.hotline.trim()}</span>
            </a>
          )}

          {showAuthButtons && (
            <div className="flex items-center gap-2">
              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors border border-white/20"
                >
                  Đăng nhập
                </button>
              )}
              {onOpenRegister && (
                <button
                  onClick={onOpenRegister}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  Đăng ký
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
