import React from 'react';
import { BookOpen, Users, Clock, ArrowLeft } from 'lucide-react';

interface AffiliatePlaceholderPageProps {
  title: string;
  onNavigateToOverview: () => void;
}

export const AffiliatePlaceholderPage: React.FC<AffiliatePlaceholderPageProps> = ({
  title,
  onNavigateToOverview,
}) => {
  const isCourses = title.toLowerCase().includes('khóa học');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in py-6">
      {/* Breadcrumb / Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Khu vực chức năng thuộc Cổng Cộng tác viên Tuyển sinh STHC
          </p>
        </div>
        <button
          onClick={onNavigateToOverview}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-blue-900 shadow-sm transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang Tổng quan</span>
        </button>
      </div>

      {/* Main Notice Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-sm space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shadow-inner">
          {isCourses ? (
            <BookOpen className="w-8 h-8 text-blue-900" />
          ) : (
            <Users className="w-8 h-8 text-blue-900" />
          )}
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Đang phát triển</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Chức năng đang được xây dựng
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Phân hệ <strong>{title}</strong> đang được hoàn thiện theo kế hoạch nâng cấp giao diện Cổng CTV. Vui lòng quay lại trong các cập nhật tiếp theo.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onNavigateToOverview}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 shadow transition-colors"
          >
            <span>Quay về Bảng điều khiển Tổng quan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
