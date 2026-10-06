import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface PublicFooterProps {
  draftConfig?: {
    footer_text?: string | null;
  } | null;
  className?: string;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ draftConfig, className = '' }) => {
  const [serverFooterText, setServerFooterText] = useState<string | null>(null);

  useEffect(() => {
    if (draftConfig !== undefined && draftConfig !== null) return;
    let isMounted = true;
    api.getHomepageConfig().then((res) => {
      if (!isMounted) return;
      if (res.success && res.data?.footer_text !== undefined) {
        setServerFooterText(res.data.footer_text);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [draftConfig]);

  const activeText = draftConfig !== undefined && draftConfig !== null
    ? (draftConfig.footer_text || '')
    : (serverFooterText || '');

  const displayText = activeText.trim() || '© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.';
  const hasHtml = /<[a-z][\s\S]*>/i.test(displayText);
  const sanitized = hasHtml ? sanitizeHtml(displayText) : '';

  return (
    <footer className={`mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[11px] text-slate-500">
        {hasHtml ? (
          <div dangerouslySetInnerHTML={{ __html: sanitized }} />
        ) : (
          <span>{displayText}</span>
        )}
      </div>
    </footer>
  );
};

