import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Phone,
  Image as ImageIcon,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Upload,
  Trash2,
  Globe,
  Eye,
  Monitor,
  Smartphone,
  X,
  Sparkles,
  Layout,
  ArrowUp,
  ArrowDown,
  ToggleLeft,
  ToggleRight,
  Layers,
  Send,
  History,
  RotateCcw as RestoreIcon,
} from 'lucide-react';
import { api } from '../../services/api';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';

interface LayoutBlock {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_LAYOUT_BLOCKS: LayoutBlock[] = [
  { id: 'hero', name: 'Khối Giới thiệu & Banner (Hero Section)', enabled: true, order: 0 },
  { id: 'courses_search_filter', name: 'Khối Tìm kiếm & Bộ lọc ngành', enabled: true, order: 1 },
  { id: 'courses_grid', name: 'Khối Danh sách Khóa học', enabled: true, order: 2 },
  { id: 'consultation_form', name: 'Khối Đăng ký Tư vấn Trực tuyến', enabled: true, order: 3 },
];

export const AdminHomepageConfigView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [uploadingBg, setUploadingBg] = useState<boolean>(false);
  const [uploadingIllustration, setUploadingIllustration] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state (Draft in session)
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoAlt, setLogoAlt] = useState<string>('');
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState<string>('');
  const [heroBackgroundAlt, setHeroBackgroundAlt] = useState<string>('');
  const [heroIllustrationUrl, setHeroIllustrationUrl] = useState<string>('');
  const [heroIllustrationAlt, setHeroIllustrationAlt] = useState<string>('');
  const [hotline, setHotline] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [layoutBlocks, setLayoutBlocks] = useState<LayoutBlock[]>(DEFAULT_LAYOUT_BLOCKS);

  // Published & History meta
  const [publishedInfo, setPublishedInfo] = useState<any>(null);
  const [savedDraftInfo, setSavedDraftInfo] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewLayout, setPreviewLayout] = useState<'home' | 'catalog' | 'detail'>('home');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewVersionSnapshot, setPreviewVersionSnapshot] = useState<any | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.getAdminHomepageConfig();
      if (res.success && res.data) {
        const { published, draft, history } = res.data;
        setPublishedInfo(published);
        setSavedDraftInfo(draft);
        setHistoryList(history || []);

        const blocks = (draft.layout_blocks && Array.isArray(draft.layout_blocks) && draft.layout_blocks.length > 0)
          ? draft.layout_blocks
          : (published.layout_blocks || DEFAULT_LAYOUT_BLOCKS);

        setLogoUrl(draft.logo_url || '');
        setLogoAlt(draft.logo_alt || '');
        setHeroBackgroundUrl(draft.hero_background_url || '');
        setHeroBackgroundAlt(draft.hero_background_alt || '');
        setHeroIllustrationUrl(draft.hero_illustration_url || '');
        setHeroIllustrationAlt(draft.hero_illustration_alt || '');
        setHotline(draft.hotline || '');
        setFooterText(draft.footer_text || '');
        setLayoutBlocks(JSON.parse(JSON.stringify(blocks)));
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể tải cấu hình quản trị trang chủ.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi tải cấu hình.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const hasUnsavedChanges =
    savedDraftInfo &&
    (logoUrl !== (savedDraftInfo.logo_url || '') ||
      logoAlt !== (savedDraftInfo.logo_alt || '') ||
      heroBackgroundUrl !== (savedDraftInfo.hero_background_url || '') ||
      heroBackgroundAlt !== (savedDraftInfo.hero_background_alt || '') ||
      heroIllustrationUrl !== (savedDraftInfo.hero_illustration_url || '') ||
      heroIllustrationAlt !== (savedDraftInfo.hero_illustration_alt || '') ||
      hotline !== (savedDraftInfo.hotline || '') ||
      footerText !== (savedDraftInfo.footer_text || '') ||
      JSON.stringify(layoutBlocks) !== JSON.stringify(savedDraftInfo.layout_blocks || DEFAULT_LAYOUT_BLOCKS));

  // Unsaved changes warning on browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCancelChanges = () => {
    if (!savedDraftInfo) return;
    setLogoUrl(savedDraftInfo.logo_url || '');
    setLogoAlt(savedDraftInfo.logo_alt || '');
    setHeroBackgroundUrl(savedDraftInfo.hero_background_url || '');
    setHeroBackgroundAlt(savedDraftInfo.hero_background_alt || '');
    setHeroIllustrationUrl(savedDraftInfo.hero_illustration_url || '');
    setHeroIllustrationAlt(savedDraftInfo.hero_illustration_alt || '');
    setHotline(savedDraftInfo.hotline || '');
    setFooterText(savedDraftInfo.footer_text || '');
    setLayoutBlocks(JSON.parse(JSON.stringify(savedDraftInfo.layout_blocks || DEFAULT_LAYOUT_BLOCKS)));
    setFeedback({ type: 'success', message: 'Đã hoàn tác các thay đổi về bản nháp đã lưu gần nhất.' });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newBlocks = [...layoutBlocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index - 1];
    newBlocks[index - 1] = temp;
    newBlocks.forEach((b, idx) => { b.order = idx; });
    setLayoutBlocks(newBlocks);
  };

  const handleMoveDown = (index: number) => {
    if (index >= layoutBlocks.length - 1) return;
    const newBlocks = [...layoutBlocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + 1];
    newBlocks[index + 1] = temp;
    newBlocks.forEach((b, idx) => { b.order = idx; });
    setLayoutBlocks(newBlocks);
  };

  const handleToggleBlock = (index: number) => {
    const newBlocks = [...layoutBlocks];
    newBlocks[index].enabled = !newBlocks[index].enabled;
    setLayoutBlocks(newBlocks);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Dung lượng ảnh vượt quá giới hạn 5 MB.' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh PNG, JPEG và WebP.' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setLogoUrl(localUrl);

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) {
          setLogoUrl(res.url);
          setFeedback({ type: 'success', message: 'Tải ảnh logo lên bản nháp thành công!' });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Không thể tải ảnh logo lên.' });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi tải ảnh lên.' });
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Dung lượng hình nền vượt quá giới hạn 5 MB.' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh PNG, JPEG và WebP.' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setHeroBackgroundUrl(localUrl);

    setUploadingBg(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) {
          setHeroBackgroundUrl(res.url);
          setFeedback({ type: 'success', message: 'Tải hình nền vào bản nháp thành công!' });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Không thể tải hình nền lên.' });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi tải hình nền lên.' });
      } finally {
        setUploadingBg(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Dung lượng ảnh minh họa vượt quá giới hạn 5 MB.' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh PNG, JPEG và WebP.' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setHeroIllustrationUrl(localUrl);

    setUploadingIllustration(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) {
          setHeroIllustrationUrl(res.url);
          setFeedback({ type: 'success', message: 'Tải hình minh họa vào bản nháp thành công!' });
        } else {
          setFeedback({ type: 'error', message: res.error || 'Không thể tải hình minh họa lên.' });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi tải hình minh họa lên.' });
      } finally {
        setUploadingIllustration(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        logo_url: logoUrl.trim() || null,
        logo_alt: logoAlt.trim() || null,
        hero_background_url: heroBackgroundUrl.trim() || null,
        hero_background_alt: heroBackgroundAlt.trim() || null,
        hero_illustration_url: heroIllustrationUrl.trim() || null,
        hero_illustration_alt: heroIllustrationAlt.trim() || null,
        hotline: hotline.trim() || null,
        footer_text: footerText.trim() || null,
        layout_blocks: layoutBlocks,
      };

      const res = await api.updateHomepageConfig(payload);
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: 'Đã lưu bản nháp vào CSDL thành công! (Trang công khai chưa thay đổi cho đến khi Xuất bản).' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể lưu bản nháp.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi lưu bản nháp.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (hasUnsavedChanges) {
      alert('Vui lòng lưu bản nháp trước khi xuất bản.');
      return;
    }
    if (!window.confirm('Xác nhận xuất bản bản nháp hiện tại lên các trang công khai?')) {
      return;
    }

    setPublishing(true);
    setFeedback(null);
    try {
      const res = await api.publishHomepageConfig();
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: res.message || 'Xuất bản thành công! Các trang công khai đã được cập nhật.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể xuất bản cấu hình.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi xuất bản.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!window.confirm(`Xác nhận khôi phục và xuất bản lại từ phiên bản lịch sử v${versionNumber}?`)) {
      return;
    }

    setRestoringVersion(versionNumber);
    setFeedback(null);
    try {
      const res = await api.restoreHomepageVersion(versionNumber);
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: res.message || `Khôi phục thành công từ v${versionNumber}!` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể khôi phục phiên bản.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi kết nối khi khôi phục.' });
    } finally {
      setRestoringVersion(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-600 font-medium">Đang tải quản lý phiên bản trang chủ...</p>
      </div>
    );
  }

  const activePreviewBlocks = previewVersionSnapshot
    ? [...(previewVersionSnapshot.layout_blocks || DEFAULT_LAYOUT_BLOCKS)].sort((a: any, b: any) => a.order - b.order).filter((b: any) => b.enabled !== false)
    : [...layoutBlocks].sort((a, b) => a.order - b.order).filter(b => b.enabled !== false);

  const previewLogoUrl = previewVersionSnapshot ? previewVersionSnapshot.logo_url : logoUrl;
  const previewLogoAlt = previewVersionSnapshot ? previewVersionSnapshot.logo_alt : logoAlt;
  const previewHotline = previewVersionSnapshot ? previewVersionSnapshot.hotline : hotline;
  const previewBgUrl = previewVersionSnapshot ? previewVersionSnapshot.hero_background_url : heroBackgroundUrl;
  const previewBgAlt = previewVersionSnapshot ? previewVersionSnapshot.hero_background_alt : heroBackgroundAlt;
  const previewIllUrl = previewVersionSnapshot ? previewVersionSnapshot.hero_illustration_url : heroIllustrationUrl;
  const previewIllAlt = previewVersionSnapshot ? previewVersionSnapshot.hero_illustration_alt : heroIllustrationAlt;
  const previewFooter = previewVersionSnapshot ? previewVersionSnapshot.footer_text : footerText;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Page Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý trang chủ — Xuất bản & Phiên bản</h1>
          <p className="text-xs text-slate-600 mt-1">
            Quản lý bản nháp, xuất bản công khai và khôi phục từ lịch sử phiên bản.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setPreviewVersionSnapshot(null); setIsPreviewOpen(true); }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Eye className="w-4 h-4 text-slate-900" />
            <span>Xem trước bản nháp</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || hasUnsavedChanges}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
            title={hasUnsavedChanges ? 'Vui lòng lưu bản nháp trước khi xuất bản' : 'Xuất bản bản nháp lên công khai'}
          >
            {publishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xuất bản...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Xuất bản ngay</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Version Status Summary Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-blue-300 font-semibold uppercase tracking-wider text-[10px]">Trạng thái công khai</span>
          <div className="text-sm font-bold flex items-center gap-2">
            <span>Phiên bản hiện tại: v{publishedInfo?.version_number || 1}</span>
            <span className="px-2 py-0.5 bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-[10px] rounded-full">
              Đang xuất bản
            </span>
          </div>
          <p className="text-[11px] text-slate-300">
            Cập nhật lần cuối: {publishedInfo?.published_at ? new Date(publishedInfo.published_at).toLocaleString('vi-VN') : 'N/A'} bởi {publishedInfo?.published_by || 'Admin'}
          </p>
        </div>

        <div className="space-y-1 sm:border-l sm:border-slate-700 sm:pl-4">
          <span className="text-amber-300 font-semibold uppercase tracking-wider text-[10px]">Trạng thái bản nháp</span>
          <div className="text-sm font-bold flex items-center gap-2">
            <span>Bản nháp trong CSDL</span>
            {hasUnsavedChanges ? (
              <span className="px-2 py-0.5 bg-amber-500/30 border border-amber-400 text-amber-300 text-[10px] rounded-full">
                Có thay đổi chưa lưu
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400 text-blue-200 text-[10px] rounded-full">
                Đã đồng bộ
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300">
            Lưu bản nháp gần nhất: {savedDraftInfo?.draft_updated_at ? new Date(savedDraftInfo.draft_updated_at).toLocaleString('vi-VN') : 'Chưa lưu'}
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{feedback.message}</div>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* GROUP A: LAYOUT BLOCKS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-base font-bold text-slate-900">A. Bố cục trang chủ (Sắp xếp & Bật/Tắt khối)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Header luôn ở đầu và Footer luôn ở cuối trang.</p>
            </div>
          </div>

          <div className="space-y-3">
            {layoutBlocks.map((block, index) => (
              <div
                key={block.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${block.enabled ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-70'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{block.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500">Mã định danh: {block.id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(index)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${block.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {block.enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                    <span>{block.enabled ? 'Hiển thị' : 'Đã ẩn'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 disabled:opacity-40 transition-colors"
                    title="Đưa lên trên"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === layoutBlocks.length - 1}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 disabled:opacity-40 transition-colors"
                    title="Đưa xuống dưới"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GROUP B: HEADER & LOGO */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-900">B. Cấu hình Header & Logo dùng chung</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Logo trường / đơn vị (Dùng chung Trang chính, /catalog, Chi tiết khóa học)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-36 h-20 bg-white rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-40" />
                      <span className="text-[10px]">Chưa có logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-500">
                    Hỗ trợ PNG, JPEG hoặc WebP, tối đa 5 MB. Khuyến khích ảnh nền trong suốt (transparent PNG/WebP).
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      {uploadingLogo ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{logoUrl ? 'Thay ảnh logo' : 'Chọn ảnh logo'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                    </label>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Gỡ logo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Văn bản thay thế của logo (Alt text)
              </label>
              <input
                type="text"
                value={logoAlt}
                onChange={(e) => setLogoAlt(e.target.value)}
                placeholder="VD: Trường Trung cấp Du lịch & Khách sạn Saigontourist"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hotline liên hệ
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={hotline}
                  onChange={(e) => setHotline(e.target.value)}
                  placeholder="VD: 028 3843 6532 hoặc 0909123456"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP C: HERO SECTION IMAGES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layout className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-900">C. Quản lý Hình ảnh Trang chính (Hero Section)</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Hình nền trang chính (Hero Background)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-40 h-24 bg-slate-900 rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                  {heroBackgroundUrl ? (
                    <img src={heroBackgroundUrl} alt="Hero Background preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-40" />
                      <span className="text-[10px]">Chưa có hình nền</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-500">
                    Hỗ trợ PNG, JPEG hoặc WebP, tối đa 5 MB. Tỷ lệ khuyên dùng 16:9 hoặc ảnh phong cảnh độ phân giải cao.
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      {uploadingBg ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{heroBackgroundUrl ? 'Thay hình nền' : 'Chọn hình nền'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBgUpload}
                        disabled={uploadingBg}
                        className="hidden"
                      />
                    </label>

                    {heroBackgroundUrl && (
                      <button
                        type="button"
                        onClick={() => setHeroBackgroundUrl('')}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Gỡ hình nền</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={heroBackgroundAlt}
                  onChange={(e) => setHeroBackgroundAlt(e.target.value)}
                  placeholder="Văn bản thay thế (Alt text) cho hình nền trang chính"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">
                Hình minh họa trang chính (Hero Illustration / Banner bên phải)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-36 h-28 bg-white rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {heroIllustrationUrl ? (
                    <img src={heroIllustrationUrl} alt="Hero Illustration preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-40" />
                      <span className="text-[10px]">Chưa có ảnh minh họa</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs text-slate-500">
                    Hỗ trợ PNG, JPEG hoặc WebP, tối đa 5 MB. Khuyến khích ảnh minh họa tách nền (transparent PNG/WebP).
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      {uploadingIllustration ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang tải lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{heroIllustrationUrl ? 'Thay ảnh minh họa' : 'Chọn ảnh minh họa'}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleIllustrationUpload}
                        disabled={uploadingIllustration}
                        className="hidden"
                      />
                    </label>

                    {heroIllustrationUrl && (
                      <button
                        type="button"
                        onClick={() => setHeroIllustrationUrl('')}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Gỡ ảnh minh họa</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={heroIllustrationAlt}
                  onChange={(e) => setHeroIllustrationAlt(e.target.value)}
                  placeholder="Văn bản thay thế (Alt text) cho hình minh họa trang chính"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP D: FOOTER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-5 h-5 text-blue-900" />
            <h2 className="text-base font-bold text-slate-900">D. Cấu hình Footer</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nội dung dòng Footer
            </label>
            <textarea
              rows={3}
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="VD: © 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleCancelChanges}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Hủy thay đổi (về bản nháp)</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu bản nháp...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-400" />
                <span>Lưu bản nháp</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* GROUP E: PUBLISHING HISTORY SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="w-5 h-5 text-blue-900" />
          <h2 className="text-base font-bold text-slate-900">E. Lịch sử xuất bản & Khôi phục phiên bản</h2>
        </div>

        {historyList.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có lịch sử xuất bản nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Phiên bản</th>
                  <th className="p-3">Thao tác</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3 text-right">Thao tác quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((hist) => {
                  const isCurrentActive = hist.version_number === publishedInfo?.version_number;
                  return (
                    <tr key={hist.version_number} className={isCurrentActive ? 'bg-emerald-50/50 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono font-bold text-blue-900">
                        v{hist.version_number}
                        {isCurrentActive && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-full uppercase">
                            Đang xuất bản
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hist.action_type === 'RESTORE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {hist.action_type || 'PUBLISH'}
                          {hist.source_version_number ? ` (từ v${hist.source_version_number})` : ''}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {new Date(hist.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 text-slate-800">
                        {hist.created_by || 'Admin'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => { setPreviewVersionSnapshot(hist); setIsPreviewOpen(true); }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium text-xs"
                        >
                          Xem trước
                        </button>
                        {!isCurrentActive && (
                          <button
                            type="button"
                            onClick={() => handleRestore(hist.version_number)}
                            disabled={restoringVersion === hist.version_number}
                            className="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-white rounded-lg transition-colors font-bold text-xs disabled:opacity-50"
                          >
                            {restoringVersion === hist.version_number ? 'Đang khôi phục...' : 'Khôi phục'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DRAFT / VERSION PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg uppercase tracking-wider">
                  {previewVersionSnapshot ? `Xem trước phiên bản v${previewVersionSnapshot.version_number}` : 'Bản nháp – chưa xuất bản'}
                </span>
                <h3 className="text-base font-bold tracking-tight">Xem trước bố cục & giao diện công khai</h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsPreviewOpen(false); setPreviewVersionSnapshot(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Đóng xem trước"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Toolbar */}
            <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 mr-1">Bố cục:</span>
                <button
                  type="button"
                  onClick={() => setPreviewLayout('home')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${previewLayout === 'home' ? 'bg-blue-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                >
                  Trang chính
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLayout('catalog')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${previewLayout === 'catalog' ? 'bg-blue-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                >
                  Danh mục khóa học
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLayout('detail')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${previewLayout === 'detail' ? 'bg-blue-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                >
                  Chi tiết khóa học
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 mr-1">Thiết bị:</span>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors ${previewDevice === 'desktop' ? 'bg-blue-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Máy tính</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-colors ${previewDevice === 'mobile' ? 'bg-blue-900 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Điện thoại</span>
                </button>
              </div>
            </div>

            {/* Preview Viewport Container */}
            <div className="flex-1 bg-slate-200/80 p-4 sm:p-8 overflow-y-auto flex items-center justify-center">
              <div className={`transition-all duration-300 bg-white shadow-2xl overflow-hidden flex flex-col pointer-events-none select-none ${previewDevice === 'mobile' ? 'w-full max-w-sm rounded-[36px] border-[10px] border-slate-800 min-h-[580px]' : 'w-full rounded-xl border border-slate-300 min-h-[520px]'}`}>
                {/* Header using draft or version config */}
                <PublicHeader
                  onNavigateHome={() => {}}
                  showAuthButtons={true}
                  onOpenLogin={() => {}}
                  onOpenRegister={() => {}}
                  draftConfig={{
                    logo_url: previewLogoUrl,
                    logo_alt: previewLogoAlt,
                    hotline: previewHotline,
                  }}
                />

                {/* Mock Body according to layout and activePreviewBlocks */}
                <div className="flex-1 p-6 space-y-4 bg-slate-50 text-slate-900">
                  {previewLayout === 'home' && (
                    <div className="space-y-4">
                      {activePreviewBlocks.map((b: any) => (
                        <div key={b.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                            Khối: {b.name}
                          </span>
                          {b.id === 'hero' && (
                            <div className="space-y-2 py-2">
                              {previewBgUrl && (
                                <div className="h-20 rounded-lg overflow-hidden relative">
                                  <img src={previewBgUrl} alt={previewBgAlt || ''} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <h3 className="font-extrabold text-base text-slate-900">Trường Du Lịch Saigontourist</h3>
                              {previewIllUrl && (
                                <div className="h-24 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
                                  <img src={previewIllUrl} alt={previewIllAlt || ''} className="h-full object-contain" />
                                </div>
                              )}
                            </div>
                          )}
                          {b.id === 'courses_search_filter' && (
                            <div className="p-2 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                              [Thanh tìm kiếm & Bộ lọc ngành đào tạo]
                            </div>
                          )}
                          {b.id === 'courses_grid' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 bg-slate-50 rounded-lg border text-xs">Khóa học 1</div>
                              <div className="p-3 bg-slate-50 rounded-lg border text-xs">Khóa học 2</div>
                            </div>
                          )}
                          {b.id === 'consultation_form' && (
                            <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-xs font-semibold text-center">
                              [Form Đăng ký Tư vấn Tuyển sinh]
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {previewLayout === 'catalog' && (
                    <div className="space-y-4 py-2 text-left bg-white p-4 rounded-xl">
                      <h2 className="text-lg font-bold">Danh mục khoá học</h2>
                      <p className="text-xs text-slate-600">Các khóa học được giới thiệu bởi cộng tác viên.</p>
                    </div>
                  )}

                  {previewLayout === 'detail' && (
                    <div className="space-y-3 py-2 text-left bg-white p-4 rounded-xl">
                      <h2 className="text-lg font-bold">Chi tiết khóa học chuyên sâu</h2>
                      <p className="text-xs text-slate-600">Thông tin tuyển sinh và chương trình đào tạo.</p>
                    </div>
                  )}
                </div>

                {/* Footer using draft or version config */}
                <PublicFooter
                  draftConfig={{
                    footer_text: previewFooter,
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500 italic">
                * Xem trước ở chế độ vô hiệu hóa thao tác. Không làm thay đổi dữ liệu công khai.
              </span>
              <button
                type="button"
                onClick={() => { setIsPreviewOpen(false); setPreviewVersionSnapshot(null); }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
