import React, { useState, useEffect } from 'react';
import { Award, ShieldCheck, CheckCircle2, AlertCircle, Building2, ArrowRight, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { formatDateTimeVi } from '../../utils/dateFormatter';

interface AffiliatePolicyProps {
  onRegisterClick: () => void;
}

export const AffiliatePolicy: React.FC<AffiliatePolicyProps> = ({ onRegisterClick }) => {
  const [activeReg, setActiveReg] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getPublicActiveRegulation();
        if (res.success && res.data) {
          setActiveReg(res.data);
        }
      } catch (err) {
        console.warn('[POLICY] Error loading active regulation:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 animate-fade-in text-slate-800">
      {/* Title */}
      <div className="text-center space-y-3">
        <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {activeReg ? `Quy chế chính thức: ${activeReg.version_code}` : 'Quy chế thù lao tuyển sinh 2026'}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {activeReg ? activeReg.title : 'Chính Sách Thù Lao & Thưởng Cộng Tác Viên'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto">
          Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC) ban hành quy chế khen thưởng và thù lao giới thiệu người học cho đội ngũ Đại sứ Tuyển sinh.
        </p>
        {activeReg && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="text-xs text-slate-500 font-mono">
              Ngày hiệu lực: {formatDateTimeVi(activeReg.effective_date)}
            </span>
            <a
              href="/api/v1/public/regulations/active/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Đọc toàn văn Quy chế (PDF)</span>
            </a>
          </div>
        )}
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
          <span>Đăng ký tham gia CTV</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Policy Rules */}
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
