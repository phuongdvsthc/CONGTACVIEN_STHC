import React, { useState } from 'react';
import { CourseBreakdownItem } from '../../types';
import { BookOpen, Table, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface CourseBreakdownChartProps {
  data?: CourseBreakdownItem[];
  isLoading?: boolean;
}

export const CourseBreakdownChart: React.FC<CourseBreakdownChartProps> = ({
  data = [],
  isLoading = false,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  // 1. Kiểm tra tính hợp lệ dữ liệu
  const isValidArray = Array.isArray(data);
  const coursesList = isValidArray ? data : [];

  // 2. Tính toán trục số liệu ngang (chỉ số nguyên, bắt đầu từ 0)
  const maxVal = coursesList.reduce((max, c) => Math.max(max, c.total_leads || 0, c.enrolled_leads || 0), 0);
  
  // Xác định mốc trần X (xMax) hợp lý
  let xMax = 5;
  if (maxVal > 0) {
    if (maxVal <= 4) xMax = 4;
    else if (maxVal <= 8) xMax = 8;
    else if (maxVal <= 15) xMax = Math.ceil(maxVal / 5) * 5;
    else if (maxVal <= 50) xMax = Math.ceil(maxVal / 10) * 10;
    else xMax = Math.ceil(maxVal / 20) * 20;
  }

  // Tổng cộng toàn bộ khóa
  const totalLeadsAll = coursesList.reduce((sum, c) => sum + (c.total_leads || 0), 0);
  const totalEnrolledAll = coursesList.reduce((sum, c) => sum + (c.enrolled_leads || 0), 0);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded w-40" />
            <div className="h-3 bg-slate-100 rounded w-28" />
          </div>
          <div className="h-7 bg-slate-100 rounded-xl w-24" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors">
      {/* Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-800" />
              <span>Kết quả theo khóa học</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
              Toàn bộ thời gian
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Phân bố lượt đăng ký và nhập học theo từng ngành nghề đào tạo
          </p>
        </div>

        {/* Nút bật/tắt bảng số liệu chi tiết */}
        <button
          type="button"
          onClick={() => setShowDataTable(prev => !prev)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
            showDataTable
              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title="Xem bảng số liệu chi tiết"
        >
          <Table className="w-3.5 h-3.5" />
          <span>{showDataTable ? 'Ẩn số liệu' : 'Xem số liệu'}</span>
          {showDataTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Chú giải 2 chuỗi màu (Legend) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block shadow-2xs" />
            <span className="font-semibold text-slate-700 text-xs">Lượt đăng ký</span>
            <span className="text-[11px] font-mono text-slate-400 font-bold">({totalLeadsAll})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block shadow-2xs" />
            <span className="font-semibold text-slate-700 text-xs">Đã nhập học</span>
            <span className="text-[11px] font-mono text-slate-400 font-bold">({totalEnrolledAll})</span>
          </div>
        </div>
      </div>

      {/* Danh sách các thanh ngang theo khóa học (Grouped Horizontal Bars) */}
      <div className="w-full bg-slate-50/40 rounded-xl border border-slate-100 p-3 select-none">
        {coursesList.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <BookOpen className="w-6 h-6 text-slate-300" />
            <span className="text-xs">Chưa có đăng ký theo khóa học</span>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-1.5 space-y-3.5 custom-scrollbar">
            {coursesList.map((course, idx) => {
              const totalLeads = course.total_leads || 0;
              const enrolledLeads = course.enrolled_leads || 0;

              // Chiều dài thanh tính theo tỷ lệ phần trăm (0..100%)
              const leadsPct = Math.min(Math.max((totalLeads / xMax) * 100, 0), 100);
              const enrolledPct = Math.min(Math.max((enrolledLeads / xMax) * 100, 0), 100);

              const isItemActive = activeCourseId === (course.course_id || String(idx));

              return (
                <div
                  key={course.course_id || idx}
                  className={`p-2.5 rounded-xl transition-all border ${
                    isItemActive
                      ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                  onMouseEnter={() => setActiveCourseId(course.course_id || String(idx))}
                  onMouseLeave={() => setActiveCourseId(null)}
                  onClick={() => setActiveCourseId(isItemActive ? null : (course.course_id || String(idx)))}
                >
                  {/* Tên khóa học và Mã khóa */}
                  <div className="flex items-center justify-between gap-2 pb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {course.course_code || 'CHUNG'}
                      </span>
                      <span
                        className="text-xs font-bold text-slate-900 truncate"
                        title={`${course.course_title} (${course.course_code})`}
                      >
                        {course.course_title}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400 shrink-0 font-medium">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* 2 Thanh Bar ngang */}
                  <div className="space-y-1.5 pt-0.5">
                    {/* Thanh 1: Lượt đăng ký (Xanh dương) */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-blue-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${leadsPct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] font-bold text-blue-700">
                        {totalLeads} <span className="font-normal text-[9px] text-slate-400">đk</span>
                      </span>
                    </div>

                    {/* Thanh 2: Đã nhập học (Xanh ngọc / Teal) */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-teal-600 to-teal-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${enrolledPct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-mono text-[11px] font-bold text-teal-700">
                        {enrolledLeads} <span className="font-normal text-[9px] text-slate-400">nh</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bảng số liệu chi tiết thu gọn (Data Table) */}
      {showDataTable && (
        <div className="border border-slate-200 rounded-xl overflow-hidden animate-fade-in bg-white">
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-600 font-bold text-[11px]">
                  <th className="py-2 px-3">Mã</th>
                  <th className="py-2 px-3">Tên khóa học</th>
                  <th className="py-2 px-3 text-right text-blue-800">Lượt đăng ký</th>
                  <th className="py-2 px-3 text-right text-teal-800">Đã nhập học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {coursesList.map((row) => (
                  <tr key={row.course_id || row.course_code} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{row.course_code}</td>
                    <td className="py-1.5 px-3 truncate max-w-xs">{row.course_title}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-blue-700">{row.total_leads}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-teal-700">{row.enrolled_leads}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="py-2 px-3">Tổng cộng toàn bộ khóa</td>
                  <td className="py-2 px-3 text-right font-mono text-blue-800">{totalLeadsAll}</td>
                  <td className="py-2 px-3 text-right font-mono text-teal-800">{totalEnrolledAll}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Phụ chú nghiệp vụ */}
      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>Bao gồm tất cả khóa học phát sinh lượt giới thiệu trong toàn bộ thời gian.</span>
      </div>
    </div>
  );
};
