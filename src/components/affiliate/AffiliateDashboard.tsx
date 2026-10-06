import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { api } from '../../services/api';
import { AffiliateDashboardSummaryData } from '../../types';
import {
  Users,
  Award,
  Clock,
  DollarSign,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  PauseCircle,
  AlertTriangle,
  QrCode,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useSystemConfig } from '../../contexts/SystemBrandingContext';
import { usePortalHeader } from '../../contexts/PortalHeaderContext';
import { QRModal } from '../common/QRModal';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { CourseBreakdownChart } from './CourseBreakdownChart';
import { AffiliateLeaderboard } from './AffiliateLeaderboard';

interface AffiliateDashboardProps {
  affiliateCode?: string;
  fullName?: string;
  onNavigate: (path: string) => void;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({
  affiliateCode = 'STHCCTV1088',
  fullName = 'Cộng tác viên',
  onNavigate,
}) => {
  const [summaryData, setSummaryData] = useState<AffiliateDashboardSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);

  // Canvas ref for the mini QR inside Banner
  const bannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>(0);

  const { branding, operation, formatPhone, buildCatalogUrl } = useSystemConfig();
  const { setHeaderMeta } = usePortalHeader();

  // Sync title to Portal Header (no duplicate title in body)
  useEffect(() => {
    setHeaderMeta({
      title: 'Tổng quan',
    });

    return () => {
      setHeaderMeta(null);
    };
  }, [setHeaderMeta]);

  // Fetch Dashboard Summary Data
  const loadDashboard = useCallback(async () => {
    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await api.getAffiliateDashboardSummary();
      if (currentReqId !== requestIdRef.current) return; // Prevent race conditions on fast session switch

      if (res.success && res.data) {
        setSummaryData(res.data);
      } else {
        setError(res.error || 'Không thể tải dữ liệu tổng quan.');
      }
    } catch (err: any) {
      if (currentReqId !== requestIdRef.current) return;
      setError(err?.message || 'Lỗi kết nối khi tải dữ liệu tổng quan.');
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, affiliateCode]);

  // Derived affiliate identity
  const currentAffiliate = summaryData?.affiliate;
  const currentAffiliateCode = currentAffiliate?.affiliate_code || affiliateCode || '';
  const currentFullName = currentAffiliate?.full_name || fullName || 'Cộng tác viên';
  const isSuspended = currentAffiliate?.status === 'SUSPENDED';
  const metrics = summaryData?.metrics || {
    total_leads: 0,
    not_enrolled_leads: 0,
    enrolled_leads: 0,
    matched_valid_leads: 0,
  };
  const rewards = summaryData?.rewards;
  const recentLeads = summaryData?.recent_leads || [];

  // Catalog URL resolution for QR
  const catalogResolution = useMemo(() => {
    if (!currentAffiliateCode) {
      return { url: '', isConfigured: false, error: 'Chưa có mã CTV hợp lệ' };
    }
    return buildCatalogUrl(currentAffiliateCode);
  }, [buildCatalogUrl, currentAffiliateCode]);

  // Render Mini QR Code on Banner Canvas
  useEffect(() => {
    if (bannerCanvasRef.current && catalogResolution.url && !isSuspended && !loading) {
      QRCode.toCanvas(
        bannerCanvasRef.current,
        catalogResolution.url,
        {
          width: 72,
          margin: 1,
          color: {
            dark: '#0F2C59',
            light: '#FFFFFF',
          },
        },
        (err) => {
          if (err) console.error('[BANNER QR ERROR]', err);
        }
      );
    }
  }, [catalogResolution.url, isSuspended, loading]);

  // Copy Affiliate Code
  const handleCopyCode = async () => {
    if (!currentAffiliateCode) return;
    try {
      await navigator.clipboard.writeText(currentAffiliateCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Lỗi khi sao chép mã CTV:', err);
      alert(`Mã CTV của bạn: ${currentAffiliateCode}\nVui lòng sao chép thủ công.`);
    }
  };

  // Download QR PNG from Canvas
  const handleDownloadBannerQR = () => {
    if (!bannerCanvasRef.current || !catalogResolution.url) return;
    try {
      const dataUrl = bannerCanvasRef.current.toDataURL('image/png');
      const cleanAff = (currentAffiliateCode || 'CTV').replace(/[^a-zA-Z0-9_-]/g, '');
      const link = document.createElement('a');
      link.download = `QR-CATALOG-${cleanAff}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi tải QR:', err);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
  };

  const formatDateVN = (isoString?: string | null) => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Chưa cập nhật';
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return 'Chưa cập nhật';
    }
  };

  const renderAdmissionBadge = (status?: string | null) => {
    switch (status) {
      case 'ENROLLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block whitespace-nowrap">
            Đã nhập học
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-block whitespace-nowrap">
            Đã rút hồ sơ
          </span>
        );
      case 'NOT_ENROLLED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-block whitespace-nowrap">
            Chưa nhập học
          </span>
        );
    }
  };

  const renderReconciliationBadge = (status?: string | null) => {
    switch (status) {
      case 'MATCHED_VALID':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block whitespace-nowrap">
            Hợp lệ
          </span>
        );
      case 'EXISTING_IN_SCHOOL_SYSTEM':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 inline-block whitespace-nowrap">
            Đã có tại trường
          </span>
        );
      case 'MISMATCH_INVALID':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-block whitespace-nowrap">
            Không hợp lệ
          </span>
        );
      case 'VOIDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 inline-block whitespace-nowrap">
            Đã hủy đối soát
          </span>
        );
      case 'NOT_RECONCILED':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-block whitespace-nowrap">
            Chưa đối chiếu
          </span>
        );
    }
  };

  // --------------------------------------------------------------------------
  // 1. TRẠNG THÁI ĐANG TẢI (SKELETON LOADER)
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Banner Skeleton */}
        <div className="h-56 bg-slate-200/80 rounded-3xl" />
        
        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200/80 rounded-2xl" />
          ))}
        </div>

        {/* Rewards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200/80 rounded-2xl" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 bg-slate-200/80 rounded-2xl" />
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="h-64 bg-slate-200/80 rounded-2xl" />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. TRẠNG THÁI LỖI (ERROR STATE)
  // --------------------------------------------------------------------------
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Không thể tải dữ liệu Tổng quan</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 transition-colors shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  const systemPortalSubtext = branding.system_short_name
    ? `Cổng cộng tác viên tuyển sinh ${branding.system_short_name}`
    : 'Cổng cộng tác viên tuyển sinh';

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* ===================================================================== */}
      {/* 1. BANNER CHÀO MỪNG (WELCOME BANNER)                                  */}
      {/* ===================================================================== */}
      <div
        className={`text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden transition-all ${
          isSuspended
            ? 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/30'
            : 'bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900'
        }`}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Cột trái: Lời chào, Họ tên, Mã CTV, Hướng dẫn */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              {isSuspended ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                  Tạm ngưng hoạt động
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Đang hoạt động
                </span>
              )}
              <span className="text-xs text-blue-200 font-medium">
                {systemPortalSubtext}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Xin chào, {currentFullName}!
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200">
              <div className="flex items-center gap-1.5">
                <span>Mã CTV:</span>
                <span className="font-mono font-bold text-amber-300 bg-black/30 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                  {currentAffiliateCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-white font-semibold text-xs transition-colors border border-blue-700/80 cursor-pointer shadow-xs"
                title="Sao chép mã định danh CTV"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-200" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-blue-100/90 font-medium leading-relaxed pt-1">
              {isSuspended
                ? 'Tài khoản của bạn hiện đang bị tạm ngưng quyền tiếp thị. Các chức năng lấy link và mã QR tạm thời bị khóa. Bạn vẫn có thể theo dõi kết quả tuyển sinh trước đây của mình.'
                : 'Chọn khóa học, chia sẻ link hoặc mã QR và theo dõi khách hàng đăng ký của bạn.'}
            </p>
          </div>

          {/* Cột phải: Khối QR giới thiệu danh mục khóa học & Nút thao tác nhanh */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            {/* Khối QR Code trực tiếp (Chỉ hiển thị khi CTV ACTIVE và có link hợp lệ) */}
            {!isSuspended && catalogResolution.url && (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-3 sm:p-3.5 backdrop-blur-md flex items-center gap-3.5 w-full sm:w-auto shadow-sm">
                <div className="bg-white p-1.5 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                  <canvas ref={bannerCanvasRef} className="w-[68px] h-[68px] sm:w-[72px] sm:h-[72px] block" />
                </div>
                <div className="flex flex-col space-y-1.5 text-left min-w-[130px]">
                  <div>
                    <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
                      QR tuyển sinh
                    </span>
                    <span className="text-[10px] text-blue-200 block truncate max-w-[140px]" title="Quét xem danh mục">
                      Tất cả khóa học
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setQrModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Xem mã QR kích thước lớn"
                    >
                      <QrCode className="w-3 h-3 text-amber-300" />
                      <span>Xem QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBannerQR}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Tải ảnh QR về máy"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải QR</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2 Nút thao tác nhanh */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={() => onNavigate('/portal/courses')}
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Xem khóa học</span>
                  {isSuspended && <span className="text-[10px] text-amber-950/80 font-normal">(Tạm khóa link)</span>}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onNavigate('/portal/leads')}
                className="inline-flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-800/90 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all border border-blue-700 shadow-sm cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-200" />
                  <span>Xem khách hàng</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CẢNH BÁO TẠM NGƯNG QUYỀN GIỚI THIỆU (Khi status = SUSPENDED)          */}
      {/* ===================================================================== */}
      {isSuspended && (
        <div className="p-5 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl shadow-sm flex items-start gap-3.5 text-xs animate-fade-in">
          <div className="p-2 bg-amber-100 rounded-xl border border-amber-300/80 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="font-extrabold text-amber-900 text-sm">
              Tài khoản đang bị TẠM NGƯNG quyền giới thiệu
            </h4>
            <p className="text-amber-900/90 leading-relaxed text-xs">
              {currentAffiliate?.suspension_reason
                ? `Lý do: "${currentAffiliate.suspension_reason}". `
                : 'Tài khoản của bạn hiện đang bị tạm dừng quyền tiếp thị theo quyết định của Ban Tuyển sinh. '}
              Các chức năng lấy link tuyển sinh và tạo mã QR mới đã bị tạm dừng. Toàn bộ dữ liệu khách hàng và kết quả tuyển sinh trước đây của bạn vẫn được bảo toàn nguyên vẹn.
            </p>
            {(operation.support_email || operation.support_phone) && (
              <p className="text-amber-800 font-semibold pt-1 flex flex-wrap items-center gap-2 text-xs">
                <span>Liên hệ hỗ trợ:</span>
                {operation.support_email && (
                  <a
                    href={`mailto:${operation.support_email}`}
                    className="underline hover:text-amber-950 font-medium"
                    title="Gửi email hỗ trợ tuyển sinh"
                  >
                    {operation.support_email}
                  </a>
                )}
                {operation.support_phone && (
                  <>
                    <span>- Hotline:</span>
                    <a
                      href={`tel:${operation.support_phone.replace(/[\s\.\-\(\)]/g, '')}`}
                      className="font-mono font-bold hover:underline"
                      title="Gọi hotline hỗ trợ"
                    >
                      {formatPhone(operation.support_phone)}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. KHỐI 4 CARD KẾT QUẢ TUYỂN SINH (C6.3)                             */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Kết quả tuyển sinh
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Kết quả toàn bộ thời gian
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Lượt đăng ký được ghi nhận */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Lượt đăng ký được ghi nhận</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-100/80">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(metrics.total_leads ?? 0)}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Tổng lượt đăng ký thuộc bạn
            </span>
          </div>

          {/* Card 2: Chưa nhập học */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Chưa nhập học</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-100/80">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(metrics.not_enrolled_leads ?? 0)}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Lượt đăng ký chưa được xác nhận nhập học
            </span>
          </div>

          {/* Card 3: Đã nhập học */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Đã nhập học</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100/80">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(metrics.enrolled_leads ?? 0)}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Được xác nhận qua đối chiếu hồ sơ
            </span>
          </div>

          {/* Card 4: Hồ sơ đối chiếu hợp lệ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Hồ sơ đối chiếu hợp lệ</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-100/80">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-600 tabular-nums">
              {new Intl.NumberFormat('vi-VN').format(metrics.matched_valid_leads ?? 0)}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Nguồn giới thiệu được xác nhận hợp lệ
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. KHỐI TỔNG HỢP THƯỞNG (C6.4)                                        */}
      {/* ===================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Tổng hợp thưởng
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Toàn bộ thời gian
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Thưởng chờ duyệt */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Thưởng chờ duyệt</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-100/80">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 tabular-nums">
              {rewards ? formatVND(rewards.pending?.amount ?? 0) : '—'}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {rewards ? `${rewards.pending?.count ?? 0} khoản đang chờ phê duyệt` : 'Đang cập nhật'}
            </span>
          </div>

          {/* Card 2: Thưởng đã duyệt */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Thưởng đã duyệt</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-100/80">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-600 tabular-nums">
              {rewards ? formatVND(rewards.approved?.amount ?? 0) : '—'}
            </div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {rewards ? `${rewards.approved?.count ?? 0} khoản đã được phê duyệt` : 'Đang cập nhật'}
            </span>
          </div>

          {/* Card 3: Thưởng đã thanh toán */}
          <div className={`rounded-2xl p-5 border shadow-xs space-y-2 transition-colors ${
            rewards?.paid?.available
              ? 'bg-white border-slate-200 hover:border-slate-300'
              : 'bg-slate-50/70 border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold text-slate-700">Thưởng đã thanh toán</span>
              <div className={`p-2 rounded-xl border ${
                rewards?.paid?.available
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100/80'
                  : 'bg-slate-200/60 text-slate-500 border-slate-300/60'
              }`}>
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            {rewards?.paid?.available && rewards.paid.amount !== null ? (
              <>
                <div className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
                  {formatVND(rewards.paid.amount)}
                </div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  {rewards.paid.count !== null ? `${rewards.paid.count} khoản đã chi trả` : 'Đã xác nhận thanh toán'}
                </span>
              </>
            ) : (
              <>
                <div className="text-xl font-bold font-sans text-slate-500 pt-0.5">
                  Chưa có dữ liệu
                </div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  Hệ thống chưa theo dõi tình trạng chi trả
                </span>
              </>
            )}
          </div>
        </div>

        {/* Lời giải thích ngắn phía dưới khối */}
        <p className="text-[11px] text-slate-400 italic px-1">
          * Thưởng đã duyệt không đồng nghĩa với đã thanh toán.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* 4. BIỂU ĐỒ THEO THỜI GIAN & THEO KHÓA HỌC (C6.5)                      */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Biểu đồ 1: Đăng ký và nhập học (12 tháng gần nhất) */}
        <MonthlyTrendChart
          data={summaryData?.monthly_trend}
          isLoading={loading}
          enrolledMissingDateCount={summaryData?.metadata?.enrolled_missing_date_count}
        />

        {/* Biểu đồ 2: Kết quả theo khóa học (Toàn bộ thời gian) */}
        <CourseBreakdownChart
          data={summaryData?.course_breakdown}
          isLoading={loading}
        />
      </div>

      {/* ===================================================================== */}
      {/* 4.5. KHỐI TOP 5 CTV NỔI BẬT (C6.6A)                                  */}
      {/* ===================================================================== */}
      <AffiliateLeaderboard affiliateCode={currentAffiliateCode} />

      {/* ===================================================================== */}
      {/* 5. KHỐI KHÁCH ĐĂNG KÝ GẦN ĐÂY (C6.6)                                 */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
        {/* Header khối */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Khách đăng ký gần đây
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tối đa 5 lượt đăng ký mới nhất qua nguồn giới thiệu của bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/portal/leads')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100 shadow-2xs"
            title="Xem toàn bộ danh sách khách hàng đã giới thiệu"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-bold text-slate-900">
                Bạn chưa có lượt đăng ký nào.
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isSuspended
                  ? 'Bạn chưa có lượt đăng ký nào được ghi nhận trước đây.'
                  : 'Hãy vào mục Khóa học để lấy link hoặc mã QR chia sẻ cho người học tiềm năng bắt đầu giới thiệu.'}
              </p>
            </div>
            {!isSuspended && (
              <button
                type="button"
                onClick={() => onNavigate('/portal/courses')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-950 transition-colors cursor-pointer"
              >
                <span>Xem danh sách khóa học</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* 1. Giao diện Bảng cho màn hình Desktop / Tablet (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 font-bold">Họ và tên</th>
                    <th className="py-3.5 px-4 font-bold">Số điện thoại</th>
                    <th className="py-3.5 px-4 font-bold">Khóa học đăng ký</th>
                    <th className="py-3.5 px-4 font-bold">Ngày đăng ký</th>
                    <th className="py-3.5 px-4 font-bold">Tình trạng nhập học</th>
                    <th className="py-3.5 px-4 font-bold">Đối chiếu hồ sơ</th>
                    <th className="py-3.5 px-4 font-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {recentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => onNavigate(`/portal/leads/${lead.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate(`/portal/leads/${lead.id}`);
                        }
                      }}
                      tabIndex={0}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer focus:outline-hidden focus:bg-blue-50/60"
                      title={`Xem chi tiết hồ sơ ${lead.full_name}`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{lead.full_name || 'Chưa cập nhật'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{lead.phone_masked || 'Chưa cập nhật'}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={lead.course_title}>
                        {lead.course_title}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {formatDateVN(lead.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {renderAdmissionBadge(lead.admission_status)}
                      </td>
                      <td className="py-3 px-4">
                        {renderReconciliationBadge(lead.reconciliation_status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(`/portal/leads/${lead.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200/60 cursor-pointer"
                          title="Xem chi tiết hồ sơ khách hàng"
                        >
                          <span>Xem chi tiết</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 2. Giao diện Thẻ cho màn hình Mobile (block sm:hidden) */}
            <div className="block sm:hidden divide-y divide-slate-100 p-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onNavigate(`/portal/leads/${lead.id}`)}
                  className="p-3 space-y-2 hover:bg-blue-50/40 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs">{lead.full_name || 'Chưa cập nhật'}</span>
                    <span className="font-mono text-[11px] text-slate-500">{lead.phone_masked || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium truncate" title={lead.course_title}>
                    {lead.course_title}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderAdmissionBadge(lead.admission_status)}
                      {renderReconciliationBadge(lead.reconciliation_status)}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatDateVN(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 5. MODAL XEM MÃ QR DANH MỤC KHÓA HỌC KÍCH THƯỚC LỚN (QRModal)          */}
      {/* ===================================================================== */}
      {qrModalOpen && catalogResolution.url && (
        <QRModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          title="Danh mục tất cả các ngành nghề đào tạo"
          referralUrl={catalogResolution.url}
          affiliateCode={currentAffiliateCode}
          courseCode="CATALOG"
        />
      )}
    </div>
  );
};
