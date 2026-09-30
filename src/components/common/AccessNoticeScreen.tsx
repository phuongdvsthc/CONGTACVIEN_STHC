import React from 'react';
import {
  ShieldAlert,
  UserX,
  AlertTriangle,
  WifiOff,
  LogOut,
  RefreshCw,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';

export type AccessNoticeType = 'FORBIDDEN' | 'DISABLED' | 'INVALID_PROFILE' | 'NETWORK_ERROR' | 'LOADING';

interface AccessNoticeScreenProps {
  type: AccessNoticeType;
  title?: string;
  message?: string;
  defaultRoute?: string;
  defaultRouteName?: string;
  onNavigateToDefault?: (route: string) => void;
  onRetry?: () => void;
  onLogout?: () => void;
}

export const AccessNoticeScreen: React.FC<AccessNoticeScreenProps> = ({
  type,
  title,
  message,
  defaultRoute = '/',
  defaultRouteName,
  onNavigateToDefault,
  onRetry,
  onLogout,
}) => {
  if (type === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#070D18] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-900/60 border border-blue-600/40 flex items-center justify-center text-amber-400 mb-5 shadow-xl animate-pulse">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-3 text-amber-400 text-sm font-semibold mb-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>{title || 'Đang tải dữ liệu...'}</span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          {message || 'Hệ thống đang kiểm tra phiên đăng nhập và xác thực phân quyền tài khoản...'}
        </p>
      </div>
    );
  }

  const getNoticeConfig = () => {
    switch (type) {
      case 'FORBIDDEN':
        return {
          icon: <ShieldAlert className="w-8 h-8 text-rose-500" />,
          iconBg: 'bg-rose-500/10 border-rose-500/30',
          defaultTitle: 'Bạn Không Có Quyền Truy Cập (403)',
          defaultMessage:
            'Tài khoản hiện tại của bạn không có quyền truy cập vào đường dẫn này theo quy chế phân quyền hệ thống.',
        };
      case 'DISABLED':
        return {
          icon: <UserX className="w-8 h-8 text-amber-500" />,
          iconBg: 'bg-amber-500/10 border-amber-500/30',
          defaultTitle: 'Tài Khoản Đã Bị Vô Hiệu Hóa',
          defaultMessage:
            'Tài khoản của bạn đã bị tạm dừng hoạt động bởi Quản trị viên Nhà trường. Vui lòng liên hệ Ban Tuyển sinh STHC để được hỗ trợ.',
        };
      case 'NETWORK_ERROR':
        return {
          icon: <WifiOff className="w-8 h-8 text-blue-400" />,
          iconBg: 'bg-blue-500/10 border-blue-500/30',
          defaultTitle: 'Không Thể Kết Nối Máy Chủ',
          defaultMessage:
            'Đã xảy ra lỗi đường truyền khi tải hồ sơ tài khoản. Vui lòng kiểm tra kết nối mạng và thử lại.',
        };
      case 'INVALID_PROFILE':
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
          iconBg: 'bg-amber-500/10 border-amber-500/30',
          defaultTitle: 'Chưa Thể Truy Cập Hệ Thống',
          defaultMessage:
            'Hồ sơ của tài khoản chưa đầy đủ hoặc không tìm thấy dữ liệu phân quyền hợp lệ. Vui lòng thử lại hoặc liên hệ quản trị viên.',
        };
    }
  };

  const config = getNoticeConfig();

  const getDestinationLabel = (route: string) => {
    if (defaultRouteName) return defaultRouteName;
    if (route === '/portal') return 'Về Bảng điều khiển CTV của bạn';
    if (route === '/pending') return 'Về Trang trạng thái hồ sơ xét duyệt';
    if (route === '/admin') return 'Về Cổng Quản trị / Tuyển sinh';
    if (route === '/login') return 'Đến Màn hình đăng nhập';
    return 'Về Trang chủ STHC';
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-[#0B172E] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-fade-in">
        {/* Biểu tượng trạng thái */}
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Tiêu đề & Nội dung thông báo */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            {title || config.defaultTitle}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {message || config.defaultMessage}
          </p>
        </div>

        {/* Các nút hành động */}
        <div className="pt-3 space-y-2.5">
          {type === 'FORBIDDEN' && onNavigateToDefault && (
            <button
              type="button"
              onClick={() => onNavigateToDefault(defaultRoute)}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{getDestinationLabel(defaultRoute)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {(type === 'NETWORK_ERROR' || type === 'INVALID_PROFILE') && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>Thử lại kết nối</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700/60"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Đăng xuất tài khoản</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
