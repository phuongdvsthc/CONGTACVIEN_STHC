import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, CheckCircle2, AlertCircle, Building2, ArrowRight, FileText, Download, ExternalLink, RefreshCw, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { formatDateTimeVi } from '../../utils/dateFormatter';

interface AffiliatePolicyProps {
  onRegisterClick: () => void;
}

export const AffiliatePolicy: React.FC<AffiliatePolicyProps> = ({ onRegisterClick }) => {
  const [activeReg, setActiveReg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [outdatedNotice, setOutdatedNotice] = useState<string | null>(null);

  const fetchPolicy = async () => {
    setLoading(true);
    setErrorMsg(null);
    setOutdatedNotice(null);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const versionParam = searchParams.get('version') || undefined;

      const res = await api.getPublicActiveRegulation(versionParam);
      if (res.success && res.data) {
        setActiveReg(res.data);
        if (res.outdated && res.message) {
          setOutdatedNotice(res.message);
        }
      } else {
        setErrorMsg(res.error || 'Không thể tải thông tin quy chế đang áp dụng.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi tải văn bản quy chế.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-10 animate-fade-in text-slate-800">
      {/* Navigation back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onRegisterClick}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang đăng ký CTV</span>
        </button>
      </div>

      {/* Title Header */}
      <div className="text-center space-y-3 bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
            {activeReg ? `Quy chế chính thức: ${activeReg.version_code}` : 'Quy chế thù lao tuyển sinh 2026'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đang áp dụng
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Quy chế Cộng tác viên Tuyển sinh & Bảo vệ Dữ liệu Cá nhân
        </h1>
        {activeReg && (
          <p className="text-sm font-bold text-slate-700">{activeReg.title}</p>
        )}
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
          Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) ban hành quy chế khen thưởng, thù lao giới thiệu người học và quy định bảo vệ dữ liệu cá nhân cho đội ngũ Đại sứ Tuyển sinh.
        </p>

        {outdatedNotice && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{outdatedNotice} Đang hiển thị văn bản ACTIVE mới nhất hiện hành.</span>
          </div>
        )}

        {loading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-900" />
            <span>Đang tải thông tin quy chế...</span>
          </div>
        ) : errorMsg ? (
          <div className="py-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-2">
            <p className="font-bold">{errorMsg}</p>
            <button
              onClick={fetchPolicy}
              className="px-3 py-1.5 bg-rose-900 text-white rounded-xl text-xs font-bold hover:bg-rose-800 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : activeReg ? (
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-mono">
              Ngày hiệu lực: {formatDateTimeVi(activeReg.effective_date)}
            </span>
            <div className="flex items-center gap-2">
              <a
                href="/api/v1/public/regulations/active/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở PDF</span>
              </a>
              <a
                href="/api/v1/public/regulations/active/download"
                download={`Quy_che_STHC_${activeReg.version_code}.pdf`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải PDF</span>
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* PDF Reading Frame (Desktop & Mobile view) */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">Xem văn bản PDF trực tuyến</h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Định dạng chuẩn PDF bảo mật</span>
        </div>

        <div className="w-full h-[650px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
          <iframe
            src="/api/v1/public/regulations/active/download"
            title="Quy chế tuyển sinh & bảo vệ dữ liệu cá nhân PDF"
            className="w-full h-full border-0"
          />
        </div>
        <div className="text-center text-[11px] text-slate-500">
          Nếu thiết bị hoặc trình duyệt không hiển thị khung xem trực tiếp, vui lòng sử dụng nút &quot;Mở PDF&quot; hoặc &quot;Tải PDF&quot; ở phía trên.
        </div>
      </div>

      {/* 500k Reward Highlight Box */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider">
            <Award className="w-4 h-4" />
            Mức thù lao cố định
          </div>
          <h2 className="text-3xl sm:text-4xl font-mono font-extrabold text-amber-400 tabular-nums">
            500.000 VNĐ
          </h2>
          <p className="text-xs sm:text-sm text-blue-200">
            Áp dụng cho <strong>01 hồ sơ nhập học hợp lệ</strong> (học viên đã nộp hồ sơ và hoàn tất đóng học phí tại STHC).
          </p>
        </div>

        <button
          onClick={onRegisterClick}
          className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-95"
        >
          <span>Đăng ký tham gia CTV ngay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Policy Summary Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1. Điều kiện ghi nhận học viên hợp lệ
          </h3>
          <ul className="space-y-2 text-slate-600 leading-relaxed">
            <li>· Học viên tự điền form tư vấn qua liên kết hoặc mã QR của CTV đang ở trạng thái <strong>ACTIVE</strong>.</li>
            <li>· Lượt gửi form đầu tiên giữ quyền bảo hộ nguồn trong <strong>90 ngày</strong>.</li>
            <li>· Học viên đến nộp hồ sơ xét tuyển và đóng học phí thực tế tại Văn phòng Tuyển sinh STHC.</li>
            <li>· Cán bộ Tuyển sinh đối soát khớp mã phiếu thu học phí trên hệ thống.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            2. Các trường hợp không tính thưởng
          </h3>
          <ul className="space-y-2 text-slate-600 leading-relaxed">
            <li>· Học viên đã có hồ sơ ghi danh hoặc đóng học phí tại STHC trước thời điểm gửi form qua CTV.</li>
            <li>· CTV đang ở trạng thái <code>PENDING_REVIEW</code>, <code>SUSPENDED</code> hoặc <code>REJECTED</code>.</li>
            <li>· Trùng lặp mã hồ sơ tuyển sinh ngoại bộ đã được duyệt thưởng cho lead khác.</li>
            <li>· CTV tự ý gõ thông tin hoặc lấy danh bạ người khác điền thay (vi phạm quy chế).</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-900" />
            3. Quy trình phê duyệt & Chi trả thù lao
          </h3>
          <ul className="space-y-2 text-slate-600 leading-relaxed">
            <li>· Bước 1: Cán bộ Tuyển sinh đối soát chứng từ thực tế (Trạng thái: <code>MATCHED_VALID</code>).</li>
            <li>· Bước 2: Tự động khởi tạo bản ghi thưởng 500k (Trạng thái: <code>PENDING_APPROVAL</code>).</li>
            <li>· Bước 3: Trưởng bộ phận Tuyển sinh / Admin thẩm định và bấm duyệt (<code>APPROVED</code>).</li>
            <li>· Bước 4: Phòng Kế toán thực hiện chi trả thủ công ngoài hệ thống theo đợt tuyển sinh.</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-900" />
            4. Bảo mật dữ liệu & Phạm vi Giai đoạn 1
          </h3>
          <ul className="space-y-2 text-slate-600 leading-relaxed">
            <li>· Hệ thống không lưu trữ số dư ảo, ví tiền hay lệnh rút tiền online trên website.</li>
            <li>· Số điện thoại của người học được che mờ 4 số cuối (<code>090812****</code>) để bảo vệ PII.</li>
            <li>· Mọi thao tác hủy ghép, sửa đổi đều được lưu vết đầy đủ trong nhật ký kiểm toán.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
