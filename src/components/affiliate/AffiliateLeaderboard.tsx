import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { AffiliateLeaderboardItem, AffiliateLeaderboardData } from '../../types';
import { Trophy, Medal, Award, RefreshCw, AlertCircle, Info, Sparkles, UserCheck } from 'lucide-react';

interface AffiliateLeaderboardProps {
  affiliateCode?: string;
}

export const AffiliateLeaderboard: React.FC<AffiliateLeaderboardProps> = ({
  affiliateCode,
}) => {
  const [data, setData] = useState<AffiliateLeaderboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAffiliateLeaderboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Không thể tải bảng xếp hạng cộng tác viên.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi tải bảng xếp hạng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard, affiliateCode]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' đ';
  };

  const renderRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs" title="Hạng 1 - Quán quân">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs" title="Hạng 2 - Á quân">
            <Medal className="w-4 h-4 text-slate-500" />
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/90 flex items-center justify-center shrink-0 shadow-2xs font-black text-xs" title="Hạng 3 - Quý quân">
            <Award className="w-4 h-4 text-amber-700" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 font-bold font-mono text-xs" title={`Hạng ${rank}`}>
            {rank}
          </div>
        );
    }
  };

  // 1. Trạng thái Loading (Skeleton)
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded w-44" />
            <div className="h-3 bg-slate-100 rounded w-60" />
          </div>
          <div className="h-6 bg-slate-100 rounded-full w-24" />
        </div>
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Trạng thái Lỗi trong khối
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Top 5 CTV nổi bật
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Toàn bộ thời gian
            </span>
          </div>
        </div>
        <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadLeaderboard}
            className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-100 text-rose-900 font-semibold rounded-lg border border-rose-200 text-[11px] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại</span>
          </button>
        </div>
      </div>
    );
  }

  const list = data?.leaderboard || [];

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition-colors">
      {/* Header Khối */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Top 5 CTV nổi bật</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Toàn bộ thời gian
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Xếp hạng theo tổng thưởng đã được duyệt.
          </p>
        </div>
      </div>

      {/* Danh sách CTV nổi bật */}
      {list.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-600">
            Chưa có dữ liệu xếp hạng thưởng đã duyệt.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item, index) => {
            const isMe = item.is_current_affiliate;

            return (
              <div
                key={`${item.rank}-${item.display_name}-${index}`}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-blue-50/80 border-blue-200 shadow-2xs ring-1 ring-blue-300/60'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {/* Vị trí thứ hạng và Họ tên */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {renderRankBadge(item.rank)}

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-xs font-bold truncate ${
                        isMe ? 'text-blue-950' : 'text-slate-900'
                      }`}
                      title={item.display_name}
                    >
                      {item.display_name}
                    </span>

                    {/* Badge "Bạn" nếu là CTV đang đăng nhập */}
                    {isMe && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white shadow-2xs shrink-0">
                        <UserCheck className="w-3 h-3" />
                        <span>Bạn</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tổng thưởng đã duyệt */}
                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-black font-mono text-indigo-700 block tabular-nums">
                    {formatVND(item.approved_reward_amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Thưởng đã duyệt
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phụ chú nghiệp vụ */}
      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>* Thưởng đã duyệt không đồng nghĩa với đã thanh toán.</span>
      </div>
    </div>
  );
};
