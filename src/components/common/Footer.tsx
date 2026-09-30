import React from 'react';
import { GraduationCap, MapPin, Phone, Mail, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                TRƯỜNG TRUNG CẤP DU LỊCH & KHÁCH SẠN SAIGONTOURIST
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Thành viên của Tổng Công ty Du lịch Sài Gòn (Saigontourist Group). Hơn 35 năm tiên phong đào tạo nguồn nhân lực chất lượng cao cho ngành khách sạn, ẩm thực và du lịch Việt Nam.
            </p>
            <div className="pt-2 flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</span>
            </div>
          </div>

          {/* Col 2: Liên hệ tuyển sinh */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Văn phòng Tuyển sinh
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>23/8 Hoàng Việt, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Hotline: (028) 3844 2238 - 0908 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>tuyensinh@sthc.edu.vn</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Cam kết đào tạo */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Cam kết chất lượng
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>· 100% sinh viên được giới thiệu việc làm</li>
              <li>· Thực tập tại hệ thống khách sạn 5 sao Saigontourist</li>
              <li>· Bằng Trung cấp chính quy quốc gia</li>
              <li>· Chính sách thưởng CTV 500.000 VNĐ / hồ sơ</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div>
            © 2026 Trường Trung cấp Du lịch & Khách sạn Saigontourist (STHC). Bản quyền được bảo lưu.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Chính sách bảo mật</span>
            <span>·</span>
            <span>Quy chế CTV Tuyển sinh</span>
            <span>·</span>
            <span>Mã dự án: STHC_CTV</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
