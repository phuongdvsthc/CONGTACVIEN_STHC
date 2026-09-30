import React from 'react';
import { UserCheck, Shield, Clock, Users, Globe, FileCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface RoleBannerProps {
  currentRole: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin';
  onSwitchRole: (role: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin') => void;
  onOpenAcceptanceReport: () => void;
}

export const RoleBanner: React.FC<RoleBannerProps> = ({
  currentRole,
  onSwitchRole,
  onOpenAcceptanceReport,
}) => {
  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 text-xs py-2 px-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            E4 Nghiệm thu phân quyền:
          </span>
          <span className="text-slate-300 hidden sm:inline">Chuyển đổi vai trò kiểm thử trực tiếp:</span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => onSwitchRole('public')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap ${
              currentRole === 'public'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Globe className="w-3 h-3" />
            1. Khách vãng lai (E1)
          </button>

          <button
            onClick={() => onSwitchRole('affiliate_pending')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap ${
              currentRole === 'affiliate_pending'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            2. CTV Chờ duyệt (E2)
          </button>

          <button
            onClick={() => onSwitchRole('affiliate_active')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap ${
              currentRole === 'affiliate_active'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Users className="w-3 h-3" />
            3. CTV Hoạt động (E2)
          </button>

          <button
            onClick={() => onSwitchRole('staff')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap ${
              currentRole === 'staff'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            4. Cán bộ Tuyển sinh (E3)
          </button>

          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 font-medium whitespace-nowrap ${
              currentRole === 'admin'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Shield className="w-3 h-3" />
            5. Quản trị viên (E3)
          </button>

          <button
            onClick={onOpenAcceptanceReport}
            className="ml-2 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 shadow-sm whitespace-nowrap"
          >
            <FileCheck className="w-3 h-3" />
            Báo cáo Nghiệm thu E4
          </button>
        </div>
      </div>
    </div>
  );
};
