import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';

interface AdminPlaceholderPageProps {
  title: string;
  onNavigateToOverview: () => void;
}

export const AdminPlaceholderPage: React.FC<AdminPlaceholderPageProps> = ({
  title,
  onNavigateToOverview,
}) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
        <Construction className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Phân hệ quản trị này đang được quy hoạch phát triển và hoàn thiện ở các giai đoạn tiếp theo của hệ thống STHC_CTV.
        </p>
      </div>
      <div>
        <button
          onClick={onNavigateToOverview}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Tổng quan</span>
        </button>
      </div>
    </div>
  );
};
