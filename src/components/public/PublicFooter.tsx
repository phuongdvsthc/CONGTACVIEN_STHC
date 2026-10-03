import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface PublicFooterProps {
  draftConfig?: {
    footer_text?: string | null;
  } | null;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ draftConfig }) => {
  const [serverFooterText, setServerFooterText] = useState<string | null>(null);

  useEffect(() => {
    if (draftConfig !== undefined && draftConfig !== null) return;
    api.getHomepageConfig().then((res) => {
      if (res.success && res.data?.footer_text) {
        setServerFooterText(res.data.footer_text);
      }
    }).catch(() => {});
  }, [draftConfig]);

  const footerText = (draftConfig !== undefined && draftConfig !== null ? draftConfig.footer_text : serverFooterText) || '© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.';

  return (
    <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-500">
        <span>{footerText}</span>
      </div>
    </footer>
  );
};
