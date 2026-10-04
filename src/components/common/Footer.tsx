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

  if (!footerText || !footerText.trim()) {
    return null;
  }

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 text-xs sm:text-sm py-8 sm:py-10 text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="leading-relaxed tracking-wide">
          {footerText}
        </p>
      </div>
    </footer>
  );
};
