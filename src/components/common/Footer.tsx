import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const Footer: React.FC = () => {
  const [footerText, setFooterText] = useState<string | null>(null);

  useEffect(() => {
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data) {
        setFooterText(res.data.footer_text ?? null);
      }
    }).catch(() => {});
  }, []);

  const textToDisplay = (footerText && footerText.trim()) ? footerText : '© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.';

  return (
    <footer className="mt-6 bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-500">
        <span>{textToDisplay}</span>
      </div>
    </footer>
  );
};
