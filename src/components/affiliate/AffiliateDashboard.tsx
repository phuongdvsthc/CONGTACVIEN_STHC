import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
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
} from 'lucide-react';

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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, leadsRes] = await Promise.all([
        api.getAffiliateDashboard(),
        api.getAffiliateLeads(),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
      } else {
        setError(dashRes.error || 'Không thể tải dữ liệu tổng quan.');
      }

      if (leadsRes.success && leadsRes.data) {
        // Lấy tối đa 5 bản ghi mới nhất
        setRecentLeads(leadsRes.data.slice(0, 5));
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi tải dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCopyCode = async () => {
    const codeToCopy = dashboardData?.affiliate_code || affiliateCode;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
  };

  const formatCounselingStatus = (status: string) => {
    switch (status) {
      case 'NEW': return 'Mới tiếp nhận';
      case 'CONTACTED': return 'Đã liên hệ';
      case 'CONSULTING': return 'Đang tư vấn';
      case 'ENROLLED': return 'Đã nhập học';
      case 'CLOSED': return 'Đã đóng';
      default: return status || 'Mới tiếp nhận';
    }
  };

  const formatReconciliationStatus = (status: string) => {
    switch (status) {
      case 'MATCHED_VALID': return 'Hợp lệ';
      case 'INVALID': return 'Không hợp lệ';
      case 'NOT_RECONCILED': default: return 'Chưa đối chiếu';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Không thể tải dữ liệu Tổng quan</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
        <button
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 transition-colors shadow"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  const name = dashboardData?.full_name || fullName;
  const code = dashboardData?.affiliate_code || affiliateCode;
  const metrics = dashboardData?.metrics || {
    total_leads_referred: 0,
    enrolled_valid_leads: 0,
    pending_reward_count: 0,
    pending_reward_amount: 0,
    approved_reward_count: 0,
    approved_reward_amount: 0,
  };

  const isEmpty = metrics.total_leads_referred === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. PHẦN CHÀO MỪNG (WELCOME BANNER) */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang hoạt động
              </span>
              <span className="text-xs text-blue-200">Cổng Tiếp Thị Tuyển Sinh STHC</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Xin chào, {name}!
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200">
              <div className="flex items-center gap-1.5">
                <span>Mã CTV:</span>
                <span className="font-mono font-bold text-amber-300 bg-black/30 px-2.5 py-0.5 rounded border border-amber-400/30">
                  {code}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-800/80 hover:bg-blue-700 text-white font-semibold text-xs transition-colors border border-blue-700"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-blue-100/90 font-medium max-w-xl pt-1">
              Chọn khóa học, chia sẻ link hoặc mã QR và theo dõi khách hàng đăng ký qua bạn.
            </p>
          </div>

          {/* THAO TÁC NHANH (QUICK ACTIONS) */}
          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5 shrink-0 backdrop-blur-sm">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Thao tác nhanh
            </span>
            <button
              onClick={() => onNavigate('/portal/courses')}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Xem khóa học</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigate('/portal/leads')}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all border border-blue-700"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Xem khách hàng</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CÁC THẺ THỐNG KÊ (4 THẺ KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Lượt đăng ký được ghi nhận */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Lượt đăng ký được ghi nhận</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {metrics.total_leads_referred}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">Tổng bản ghi đăng ký thuộc CTV</span>
        </div>

        {/* Thẻ 2: Hồ sơ nhập học hợp lệ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Hồ sơ nhập học hợp lệ</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
            {metrics.enrolled_valid_leads}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">Đã đối soát xác nhận hợp lệ</span>
        </div>

        {/* Thẻ 3: Thù lao chờ duyệt */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Thù lao chờ duyệt</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 tabular-nums">
            {formatVND(metrics.pending_reward_amount)}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">{metrics.pending_reward_count} khoản chờ BGH phê duyệt</span>
        </div>

        {/* Thẻ 4: Thù lao đã duyệt */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Thù lao đã duyệt</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-700 tabular-nums">
            {formatVND(metrics.approved_reward_amount)}
          </div>
          <span className="text-[11px] text-slate-400 block font-medium">{metrics.approved_reward_count} khoản đã được duyệt</span>
        </div>
      </div>

      {/* 3. DANH SÁCH ĐĂNG KÝ GẦN ĐÂY (TỐI ĐA 5 BẢN GHI) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Danh sách đăng ký gần đây
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              5 bản ghi đăng ký tư vấn mới nhất từ link giới thiệu của bạn
            </p>
          </div>

          <button
            onClick={() => onNavigate('/portal/leads')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isEmpty ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="text-sm font-bold text-slate-900">Chưa có lượt đăng ký nào</h4>
              <p className="text-xs text-slate-500">
                Hãy vào mục <strong>Khóa học</strong> để lấy link hoặc mã QR chia sẻ cho học viên tiềm năng bắt đầu giới thiệu.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/portal/courses')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-semibold shadow hover:bg-blue-950 transition-colors"
            >
              <span>Xem danh sách khóa học</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Khách hàng</th>
                  <th className="py-3.5 px-4 font-bold">Số điện thoại</th>
                  <th className="py-3.5 px-4 font-bold">Khóa học quan tâm</th>
                  <th className="py-3.5 px-4 font-bold">Ngày đăng ký</th>
                  <th className="py-3.5 px-4 font-bold">Trạng thái tư vấn</th>
                  <th className="py-3.5 px-4 font-bold">Đối chiếu hồ sơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{lead.full_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{lead.phone_masked}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={lead.course_title}>
                      {lead.course_title}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/60 inline-block">
                        {formatCounselingStatus(lead.counseling_status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-block ${
                          lead.reconciliation_status === 'MATCHED_VALID'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : lead.reconciliation_status === 'INVALID'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {formatReconciliationStatus(lead.reconciliation_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
