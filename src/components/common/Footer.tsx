import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const [footerText, setFooterText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.getHomepageConfig().then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        setFooterText(res.data.footer_text !== undefined ? res.data.footer_text : null);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const rawText = footerText !== null && footerText !== undefined ? footerText.trim() : '';
  const displayText = rawText || '© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu.';
  const hasHtml = /<[a-z][\s\S]*>/i.test(displayText);
  const sanitized = hasHtml ? sanitizeHtml(displayText) : '';

  return (
    <footer className={`bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-4 ${className}`}>
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

