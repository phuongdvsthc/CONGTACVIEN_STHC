import React, { useState, useRef } from 'react';
import { MonthlyTrendItem } from '../../types';
import { Table, BarChart2, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface MonthlyTrendChartProps {
  data?: MonthlyTrendItem[];
  isLoading?: boolean;
  enrolledMissingDateCount?: number;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  data = [],
  isLoading = false,
  enrolledMissingDateCount = 0,
}) => {
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Kiểm tra tính hợp lệ của dữ liệu
  const isValidArray = Array.isArray(data);
  const trendList = isValidArray ? data : [];
  const isAllZero = trendList.length > 0 && trendList.every(d => d.leads_count === 0 && d.enrolled_count === 0);

  // 2. Tính toán trục Y (chỉ số nguyên, bắt đầu từ 0)
  const maxVal = trendList.reduce((max, d) => Math.max(max, d.leads_count || 0, d.enrolled_count || 0), 0);
  
  // Xác định mốc trần Y (yMax) hợp lý
  let yMax = 5;
  if (maxVal > 0) {
    if (maxVal <= 4) yMax = 4;
    else if (maxVal <= 8) yMax = 8;
    else if (maxVal <= 15) yMax = Math.ceil(maxVal / 5) * 5;
    else if (maxVal <= 50) yMax = Math.ceil(maxVal / 10) * 10;
    else yMax = Math.ceil(maxVal / 20) * 20;
  }

  // Tạo 4-5 đường lưới ngang tương ứng với các giá trị nguyên
  const gridSteps = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= gridSteps; i++) {
    yTicks.push(Math.round((yMax / gridSteps) * i));
  }

  // Kích thước ViewBox của SVG
  const svgWidth = 620;
  const svgHeight = 240;
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 34;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const numMonths = Math.max(trendList.length, 1);
  const monthSlotWidth = chartWidth / numMonths;
  const barWidth = Math.min(Math.max(monthSlotWidth * 0.32, 6), 14);
  const barGap = 2;

  // Tính tổng 12 tháng
  const totalLeads12m = trendList.reduce((sum, d) => sum + (d.leads_count || 0), 0);
  const totalEnrolled12m = trendList.reduce((sum, d) => sum + (d.enrolled_count || 0), 0);

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
        <div className="h-56 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
          <div className="h-32 w-full mx-4 bg-slate-200/50 rounded" />
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
              <BarChart2 className="w-4 h-4 text-blue-800" />
              <span>Đăng ký và nhập học</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-100">
              12 tháng gần nhất
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Xu hướng theo dòng thời gian (Asia/Ho_Chi_Minh)
          </p>
        </div>

        {/* Nút bật/tắt bảng số liệu chi tiết */}
        <button
          type="button"
          onClick={() => setShowDataTable(prev => !prev)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
            showDataTable
              ? 'bg-blue-50 text-blue-800 border-blue-200'
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
            <span className="text-[11px] font-mono text-slate-400 font-bold">({totalLeads12m})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block shadow-2xs" />
            <span className="font-semibold text-slate-700 text-xs">Đã nhập học</span>
            <span className="text-[11px] font-mono text-slate-400 font-bold">({totalEnrolled12m})</span>
          </div>
        </div>
      </div>

      {/* Khung biểu đồ SVG */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden bg-slate-50/40 rounded-xl border border-slate-100 p-2 select-none"
        onMouseLeave={() => setActiveTooltipIndex(null)}
      >
        {trendList.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Info className="w-6 h-6 text-slate-300" />
            <span className="text-xs">Chưa có dữ liệu xu hướng theo thời gian</span>
          </div>
        ) : (
          <div className="w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto block max-h-[260px]"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Biểu đồ cột đôi 12 tháng đăng ký và nhập học"
            >
              <defs>
                <linearGradient id="blueBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </linearGradient>
                <linearGradient id="tealBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" />
                  <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>
              </defs>

              {/* Đường lưới ngang (Grid Lines) & Nhãn trục Y */}
              {yTicks.map((tickVal, idx) => {
                const yPos = paddingTop + chartHeight - (tickVal / yMax) * chartHeight;
                return (
                  <g key={`ytick-${idx}`}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={svgWidth - paddingRight}
                      y2={yPos}
                      stroke={idx === 0 ? '#94A3B8' : '#E2E8F0'}
                      strokeWidth={idx === 0 ? 1 : 1}
                      strokeDasharray={idx === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={paddingLeft - 6}
                      y={yPos + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill="#64748B"
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {tickVal}
                    </text>
                  </g>
                );
              })}

              {/* Vẽ từng cột tháng */}
              {trendList.map((item, index) => {
                const slotCenterX = paddingLeft + index * monthSlotWidth + monthSlotWidth / 2;
                const leadsCount = item.leads_count || 0;
                const enrolledCount = item.enrolled_count || 0;

                const leadsHeight = (leadsCount / yMax) * chartHeight;
                const enrolledHeight = (enrolledCount / yMax) * chartHeight;

                const leadsY = paddingTop + chartHeight - leadsHeight;
                const enrolledY = paddingTop + chartHeight - enrolledHeight;

                const leadsX = slotCenterX - barWidth - (barGap / 2);
                const enrolledX = slotCenterX + (barGap / 2);

                const isHovered = activeTooltipIndex === index;

                // Định dạng nhãn tháng hiển thị gọn
                const shortLabel = item.month_label.replace('/20', '/');

                return (
                  <g
                    key={item.month_key || index}
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveTooltipIndex(index)}
                    onClick={() => setActiveTooltipIndex(activeTooltipIndex === index ? null : index)}
                  >
                    {/* Vùng tương tác trong suốt (hit area) */}
                    <rect
                      x={paddingLeft + index * monthSlotWidth}
                      y={paddingTop}
                      width={monthSlotWidth}
                      height={chartHeight}
                      fill={isHovered ? 'rgba(37, 99, 235, 0.06)' : 'transparent'}
                      rx="4"
                    />

                    {/* Cột 1: Lượt đăng ký (Xanh dương) */}
                    {leadsCount > 0 ? (
                      <rect
                        x={leadsX}
                        y={leadsY}
                        width={barWidth}
                        height={leadsHeight}
                        fill="url(#blueBarGrad)"
                        rx="2"
                        className="transition-all duration-200"
                        opacity={isHovered ? 1 : 0.9}
                      />
                    ) : (
                      <line
                        x1={leadsX}
                        y1={paddingTop + chartHeight}
                        x2={leadsX + barWidth}
                        y2={paddingTop + chartHeight}
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Cột 2: Đã nhập học (Xanh ngọc / Teal) */}
                    {enrolledCount > 0 ? (
                      <rect
                        x={enrolledX}
                        y={enrolledY}
                        width={barWidth}
                        height={enrolledHeight}
                        fill="url(#tealBarGrad)"
                        rx="2"
                        className="transition-all duration-200"
                        opacity={isHovered ? 1 : 0.9}
                      />
                    ) : (
                      <line
                        x1={enrolledX}
                        y1={paddingTop + chartHeight}
                        x2={enrolledX + barWidth}
                        y2={paddingTop + chartHeight}
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Nhãn trục X (Tháng/Năm) */}
                    <text
                      x={slotCenterX}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isHovered ? '#1E3A8A' : '#64748B'}
                      fontWeight={isHovered ? '700' : '500'}
                    >
                      {shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip hiển thị khi hover hoặc chạm vào cột */}
            {activeTooltipIndex !== null && trendList[activeTooltipIndex] && (
              (() => {
                const item = trendList[activeTooltipIndex];
                const pctPosition = ((activeTooltipIndex + 0.5) / numMonths) * 100;
                return (
                  <div
                    className="absolute z-20 top-3 pointer-events-none transform -translate-x-1/2 bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-lg border border-slate-700/80 backdrop-blur-xs min-w-[140px] animate-fade-in"
                    style={{
                      left: `clamp(85px, ${pctPosition}%, calc(100% - 85px))`,
                    }}
                  >
                    <div className="font-bold text-[11px] text-blue-200 pb-1 border-b border-slate-700 mb-1 flex items-center justify-between">
                      <span>Tháng {item.month_label.replace('T', '')}</span>
                      <span className="text-[10px] font-mono text-slate-400">#{activeTooltipIndex + 1}/12</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span>Đăng ký:</span>
                        </span>
                        <span className="font-bold font-mono text-blue-300">
                          {item.leads_count} lượt
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-slate-300">
                          <span className="w-2 h-2 rounded-full bg-teal-400" />
                          <span>Nhập học:</span>
                        </span>
                        <span className="font-bold font-mono text-teal-300">
                          {item.enrolled_count} lượt
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Thông báo trạng thái nếu cả 12 tháng đều chưa có dữ liệu */}
        {isAllZero && (
          <div className="mt-1 py-1.5 px-3 bg-blue-50/80 border border-blue-100 rounded-lg text-center">
            <span className="text-[11px] text-blue-900 font-medium">
              Chưa phát sinh đăng ký hoặc nhập học trong 12 tháng gần nhất
            </span>
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
                  <th className="py-2 px-3">Tháng</th>
                  <th className="py-2 px-3 text-right text-blue-800">Lượt đăng ký</th>
                  <th className="py-2 px-3 text-right text-teal-800">Đã nhập học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {trendList.map((row) => (
                  <tr key={row.month_key} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-semibold text-slate-900">{row.month_label}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-blue-700">{row.leads_count}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-teal-700">{row.enrolled_count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                <tr>
                  <td className="py-2 px-3">Tổng 12 tháng</td>
                  <td className="py-2 px-3 text-right font-mono text-blue-800">{totalLeads12m}</td>
                  <td className="py-2 px-3 text-right font-mono text-teal-800">{totalEnrolled12m}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Phụ chú nghiệp vụ */}
      <div className="space-y-1 pt-1 border-t border-slate-100">
        <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>Đăng ký tính theo ngày ghi nhận; nhập học tính theo ngày xác nhận.</span>
        </div>
        {enrolledMissingDateCount > 0 && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-lg border border-amber-100">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Lưu ý: Có <strong>{enrolledMissingDateCount}</strong> lượt nhập học chưa có ngày xác nhận đối chiếu chính thức nên chưa phân bổ vào tháng cụ thể (vẫn được tính đủ vào tổng kết quả và khóa học).
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
