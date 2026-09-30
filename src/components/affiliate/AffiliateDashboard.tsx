import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Course } from '../../types';
import { QRModal } from '../common/QRModal';
import {
  Users,
  Award,
  Clock,
  DollarSign,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  ShieldCheck,
  User,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AffiliateDashboardProps {
  affiliateCode?: string;
  fullName?: string;
}

export const AffiliateDashboard: React.FC<AffiliateDashboardProps> = ({
  affiliateCode = 'STHCCTV1088',
  fullName = 'Trần Thị Thu Thảo',
}) => {
  const [activeTab, setActiveTab] = useState<'marketing' | 'leads' | 'rewards' | 'profile'>('marketing');
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [coursesWithLinks, setCoursesWithLinks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{
    title: string;
    referralUrl: string;
    affiliateCode: string;
  } | null>(null);

  const [leadSearch, setLeadSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, coursesRes, leadsRes, rewardsRes] = await Promise.all([
        api.getAffiliateDashboard(),
        api.getAffiliateCourses(),
        api.getAffiliateLeads(),
        api.getAffiliateRewards(),
      ]);

      if (dashRes.success) setDashboardMetrics(dashRes.data);
      if (coursesRes.success) setCoursesWithLinks(coursesRes.data);
      if (leadsRes.success) setLeads(leadsRes.data);
      if (rewardsRes.success) setRewards(rewardsRes.data);
    } catch (err) {
      console.error('Failed to load affiliate portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const metrics = dashboardMetrics?.metrics || {
    total_leads_referred: 18,
    enrolled_valid_leads: 4,
    pending_reward_count: 1,
    approved_reward_count: 3,
    approved_reward_amount: 1500000,
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.full_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone_masked?.includes(leadSearch) ||
      l.course_title?.toLowerCase().includes(leadSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Affiliate Profile Lockup */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Hồ sơ đã duyệt (ACTIVE)
              </span>
              <span className="text-xs text-blue-200">Cổng Tiếp Thị Đại Sứ STHC</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Xin chào, {dashboardMetrics?.full_name || fullName}!
            </h1>

            <div className="flex items-center gap-3 text-xs text-blue-200">
              <span>Mã định danh CTV:</span>
              <span className="font-mono font-bold text-amber-400 text-sm bg-black/30 px-2.5 py-0.5 rounded border border-amber-400/30">
                {dashboardMetrics?.affiliate_code || affiliateCode}
              </span>
            </div>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-xs space-y-2 max-w-sm backdrop-blur-sm">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Chính sách thù lao tuyển sinh:</span>
            </div>
            <p className="text-blue-100 leading-relaxed text-[11px]">
              Cố định <strong>500.000 VNĐ / hồ sơ nhập học hợp lệ</strong> sau khi Cán bộ Tuyển sinh đối soát khớp biên lai thu học phí thực tế.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards (Tâm Trí Lực Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Tổng khách giới thiệu</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {metrics.total_leads_referred}
          </div>
          <span className="text-[11px] text-slate-400 block">Số ứng viên đã gửi form</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Hồ sơ đã nhập học</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
            {metrics.enrolled_valid_leads}
          </div>
          <span className="text-[11px] text-slate-400 block">Đã đối soát học phí thành công</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Khoản thưởng chờ duyệt</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {metrics.pending_reward_count}
          </div>
          <span className="text-[11px] text-slate-400 block">Đang chờ Ban Giám hiệu duyệt</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Thưởng đã duyệt (VND)</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {new Intl.NumberFormat('vi-VN').format(metrics.approved_reward_amount || 0)}đ
          </div>
          <span className="text-[11px] text-slate-400 block">{metrics.approved_reward_count} khoản thưởng hợp lệ</span>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('marketing')}
          className={`py-3 px-4 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'marketing'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Lấy Link & Mã QR Theo Khóa</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`py-3 px-4 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'leads'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Khách Giới Thiệu ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`py-3 px-4 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'rewards'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Bảng Kê Thưởng Tuyển Sinh</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 text-xs font-semibold rounded-t-xl transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-blue-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Hồ Sơ Cá Nhân CTV</span>
        </button>
      </div>

      {/* TAB CONTENT 1: LẤY LINK & MÃ QR TIẾP THỊ */}
      {activeTab === 'marketing' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs">
            <div className="space-y-1">
              <span className="font-bold text-blue-950 text-sm">
                Công cụ chia sẻ đa kênh chuẩn Trường Saigontourist:
              </span>
              <p className="text-slate-600 leading-relaxed">
                Mỗi ngành học dưới đây đều được gắn mã tiếp thị <strong>{affiliateCode}</strong> của riêng bạn. Học viên đăng ký qua link hoặc quét mã QR sẽ tự động được gán nguồn cho bạn trong 90 ngày.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coursesWithLinks.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 shadow-sm transition-all"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-blue-900">{course.department}</span>
                    <span className="font-mono text-slate-400">{course.code}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {course.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {course.summary}
                  </p>
                </div>

                {/* Referral Link Box */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Link tuyển sinh gắn mã ref:</span>
                    <span className="font-mono font-semibold text-amber-700">Mã: {affiliateCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={course.referral_url}
                      className="flex-1 bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 font-mono select-all truncate"
                    />
                    <button
                      onClick={() => handleCopyLink(course.referral_url)}
                      className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded font-medium text-xs flex items-center gap-1 transition-colors shrink-0"
                    >
                      {copiedLink === course.referral_url ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() =>
                      setQrModalData({
                        title: course.title,
                        referralUrl: course.referral_url,
                        affiliateCode,
                      })
                    }
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Lấy mã QR chia sẻ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: DANH SÁCH KHÁCH ĐƯỢC GIỚI THIỆU (CHE SỐ ĐIỆN THOẠI) */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh Sách Khách Hàng Được Giới Thiệu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảo vệ dữ liệu cá nhân (PII): Số điện thoại được che 4 số cuối theo quy định Nghị định 13/2023/NĐ-CP
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Tìm theo tên, SĐT che..."
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>
          </div>

          {/* Leads Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Số điện thoại (đã che)</th>
                  <th className="py-3 px-4">Ngành học quan tâm</th>
                  <th className="py-3 px-4">Tiến độ tư vấn</th>
                  <th className="py-3 px-4">Kết quả đối soát</th>
                  <th className="py-3 px-4">Thưởng 500k</th>
                  <th className="py-3 px-4">Ngày đăng ký</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {lead.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {lead.phone_masked || '090812****'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {lead.course_title || 'Tư vấn tuyển sinh chung'}
                    </td>
                    <td className="py-3 px-4">
                      {lead.counseling_status === 'NEW' && (
                        <span className="text-amber-800 font-medium">Mới tiếp nhận</span>
                      )}
                      {lead.counseling_status === 'CONTACTED' && (
                        <span className="text-blue-800 font-medium">Đã liên hệ</span>
                      )}
                      {lead.counseling_status === 'CONSULTING' && (
                        <span className="text-indigo-800 font-medium">Đang tư vấn</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lead.reconciliation_status === 'MATCHED_VALID' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã đối soát hợp lệ
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa đối soát</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lead.reward_status === 'APPROVED' && (
                        <span className="text-emerald-700 font-bold font-mono">
                          500.000đ (Đã duyệt)
                        </span>
                      )}
                      {lead.reward_status === 'PENDING_APPROVAL' && (
                        <span className="text-amber-700 font-semibold font-mono">
                          500.000đ (Chờ duyệt)
                        </span>
                      )}
                      {lead.reward_status === 'NONE' && (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums">
                      {new Date(lead.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: BẢNG KÊ THƯỞNG TUYỂN SINH */}
      {activeTab === 'rewards' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bảng Kê Thù Lao Tuyển Sinh (500.000 VNĐ / Hồ Sơ)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các khoản thưởng phát sinh sau khi học viên nộp học phí và hoàn tất nhập học tại STHC
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Tổng thù lao đã duyệt:</span>
              <span className="text-lg font-bold font-mono text-indigo-700 tabular-nums">
                {new Intl.NumberFormat('vi-VN').format(metrics.approved_reward_amount || 0)} VNĐ
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Mã hồ sơ tuyển sinh</th>
                  <th className="py-3 px-4">Học viên giới thiệu</th>
                  <th className="py-3 px-4">Mức thù lao</th>
                  <th className="py-3 px-4">Trạng thái duyệt</th>
                  <th className="py-3 px-4">Ngày phát sinh</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rewards.map((rew) => (
                  <tr key={rew.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-900">
                      {rew.external_admission_code || 'STHC-2026-TS-0188'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {rew.candidate_name || 'Nguyễn Hoàng Khang'}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-900 tabular-nums">
                      {new Intl.NumberFormat('vi-VN').format(rew.amount || 500000)} VNĐ
                    </td>
                    <td className="py-3 px-4">
                      {rew.status === 'APPROVED' ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã phê duyệt
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Chờ phê duyệt
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 tabular-nums">
                      {new Date(rew.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      Chi trả qua Phòng Tài chính - Kế toán
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: HỒ SƠ CÁ NHÂN */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center font-bold text-lg">
              {fullName.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{fullName}</h3>
              <p className="text-xs text-slate-500">Đại sứ Tuyển sinh chính thức - Trường Saigontourist</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[11px]">Mã định danh CTV:</span>
              <strong className="text-blue-900 font-mono text-sm">{affiliateCode}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[11px]">Trạng thái hoạt động:</span>
              <strong className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ACTIVE (Đang hoạt động)
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[11px]">Số CCCD:</span>
              <strong className="text-slate-800 font-mono">079201001234</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <span className="text-slate-400 block text-[11px]">Nghề nghiệp:</span>
              <strong className="text-slate-800">Hướng dẫn viên Du lịch tự do</strong>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Thông tin CCCD và tài khoản được sử dụng để lập bảng kê chứng từ chi trả thù lao tại Phòng Kế toán theo đúng Quy chế tuyển sinh hiện hành của Nhà trường.
            </p>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModalData && (
        <QRModal
          isOpen={true}
          onClose={() => setQrModalData(null)}
          title={qrModalData.title}
          referralUrl={qrModalData.referralUrl}
          affiliateCode={qrModalData.affiliateCode}
        />
      )}
    </div>
  );
};
