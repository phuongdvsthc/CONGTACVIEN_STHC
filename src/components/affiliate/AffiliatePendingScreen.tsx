import React from 'react';
import { Clock, ShieldAlert, UserCheck, LogOut, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';

interface AffiliatePendingScreenProps {
  affiliateCode?: string;
  fullName?: string;
  email?: string;
  status?: 'PENDING_REVIEW' | 'SUSPENDED' | 'REJECTED';
  reviewNote?: string;
  onRefreshStatus?: () => void;
  onLogout?: () => void;
  onGoHome?: () => void;
}

export const AffiliatePendingScreen: React.FC<AffiliatePendingScreenProps> = ({
  affiliateCode = 'STHCCTV9001',
  fullName = 'Nguyễn Văn Đang Chờ Duyệt',
  email = 'ctv_cho_duyet@sthc.edu.vn',
  status = 'PENDING_REVIEW',
  reviewNote,
  onRefreshStatus,
  onLogout,
  onGoHome,
}) => {
  const isSuspended = status === 'SUSPENDED';
  const isRejected = status === 'REJECTED';
  const isPending = status === 'PENDING_REVIEW';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8 animate-fade-in">
      {/* Icon Icon Badge */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ring-8 ${
          isSuspended
            ? 'bg-rose-100 text-rose-600 ring-rose-50'
            : isRejected
            ? 'bg-red-100 text-red-600 ring-red-50'
            : 'bg-amber-100 text-amber-600 ring-amber-50'
        }`}
      >
        {isSuspended ? (
          <AlertTriangle className="w-10 h-10" />
        ) : isRejected ? (
          <XCircle className="w-10 h-10" />
        ) : (
          <Clock className="w-10 h-10 animate-pulse" />
        )}
      </div>

      {/* Main Status Heading */}
      <div className="space-y-3">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider border ${
            isSuspended
              ? 'text-rose-800 bg-rose-100 border-rose-200'
              : isRejected
              ? 'text-red-800 bg-red-100 border-red-200'
              : 'text-amber-800 bg-amber-100 border-amber-200'
          }`}
        >
          {isSuspended
            ? 'Trạng thái: SUSPENDED (Tạm Khóa)'
            : isRejected
            ? 'Trạng thái: REJECTED (Chưa Phê Duyệt)'
            : 'Trạng thái: PENDING_REVIEW (Đang Chờ Duyệt)'}
        </span>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {isSuspended
            ? 'Tài Khoản CTV Đang Bị Tạm Khóa'
            : isRejected
            ? 'Hồ Sơ Đăng Ký CTV Chưa Được Phê Duyệt'
            : 'Tài khoản đang chờ trường xét duyệt'}
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          {isSuspended
            ? reviewNote ||
              'Tài khoản CTV của bạn đang trong trạng thái tạm khóa. Bạn không thể sử dụng liên kết giới thiệu hoặc các chức năng nội bộ. Vui lòng liên hệ Ban Tuyển sinh STHC để được hỗ trợ.'
            : isRejected
            ? reviewNote ||
              'Hồ sơ đăng ký của bạn chưa đáp ứng điều kiện tiếp nhận Cộng tác viên theo quy chế tuyển sinh hiện hành của Trường Saigontourist.'
            : 'Cảm ơn bạn đã đăng ký tham gia mạng lưới Đại sứ Tuyển sinh Trường Saigontourist (STHC). Ban Tuyển sinh đang tiến hành xác minh thông tin cá nhân và đối chiếu hồ sơ.'}
        </p>
      </div>

      {/* Account Info Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-3 shadow-sm max-w-lg mx-auto text-xs">
        <h4 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-900" />
          Thông tin tài khoản:
        </h4>
        <div className="flex justify-between py-1 border-b border-slate-50">
          <span className="text-slate-500">Họ và tên CTV:</span>
          <span className="font-semibold text-slate-800">{fullName}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-slate-50">
          <span className="text-slate-500">Email đăng nhập:</span>
          <span className="font-semibold text-slate-800">{email}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Mã CTV định danh:</span>
          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
            {affiliateCode}
          </span>
        </div>
      </div>

      {/* Security Notice: Chưa được dùng chức năng giới thiệu */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-left max-w-lg mx-auto flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Quy tắc bảo mật hệ thống:</span>
          <p className="text-amber-800 leading-relaxed">
            Chỉ tài khoản CTV ở trạng thái <strong>ACTIVE (Đã duyệt)</strong> mới được cấp quyền truy cập bảng điều khiển, lấy liên kết tuyển sinh và mã QR cá nhân.
          </p>
        </div>
      </div>

      {/* Action Buttons: Đăng xuất & Kiểm tra lại */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {isPending && onRefreshStatus && (
          <button
            onClick={onRefreshStatus}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-medium text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Kiểm tra lại trạng thái duyệt</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>Về trang chủ</span>
          </button>
        )}
      </div>
    </div>
  );
};
