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
  Plus,
  Edit2,
} from 'lucide-react';
import { api } from '../../services/api';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';

interface LayoutBlock {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  config?: any;
}

const DEFAULT_LAYOUT_BLOCKS: LayoutBlock[] = [
  {
    id: 'hero',
    name: 'Khối Giới thiệu & Banner (Hero Section)',
    enabled: true,
    order: 0,
    config: {
      title: 'Saigontourist Lan Tỏa Tương Lai Ngành Du Lịch',
      subtitle: 'Khởi Đầu Nghề Nghiệp Đẳng Cấp 5 Sao',
      description: 'Trở thành Cầu nối Tuyển sinh cho ngôi trường đào tạo Du lịch - Khách sạn hàng đầu Việt Nam với hơn 35 năm uy tín. Nhận thù lao xứng đáng, thủ tục minh bạch và đối soát tự động.',
      ctaLabel: 'Đăng Ký Tham Gia Ngay'
    }
  },
  {
    id: 'commission_policy',
    name: 'Khối Chính sách hoa hồng CTV',
    enabled: true,
    order: 1,
    config: {
      title: 'Chính Sách Hoa Hồng Hấp Dẫn & Minh Bạch',
      amount: '500.000',
      currency: 'VNĐ',
      unitLabel: '01 hồ sơ nhập học hợp lệ',
      description: '500.000 đồng cho mỗi hồ sơ giới thiệu hợp lệ sau khi trường xác nhận học viên đã hoàn tất đóng học phí.',
      condition: 'Tài khoản chờ duyệt: Tài khoản mới phải chờ trường duyệt (trạng thái PENDING_REVIEW) trước khi được cấp và sử dụng link giới thiệu.',
      benefits: [
        'Thù lao: 500.000 VNĐ / hồ sơ nhập học',
        'Trạng thái: Tài khoản mới sẽ ở trạng thái CHỜ DUYỆT trước khi được cấp link giới thiệu.',
        'Đối soát và xác nhận minh bạch qua hệ thống.'
      ],
      ctaLabel: 'Tìm hiểu chi tiết'
    }
  },
  {
    id: 'process',
    name: 'Khối Quy trình trở thành CTV',
    enabled: true,
    order: 2,
    config: {
      title: '3 Bước Đơn Giản Để Bắt Đầu',
      subtitle: 'Quy trình đăng ký và giới thiệu tinh gọn, minh bạch',
      steps: [
        { id: 'step-1', title: '1. Đăng ký tài khoản', description: 'Đăng ký tài khoản CTV, xác thực email và chờ Ban Tuyển sinh duyệt trạng thái PENDING_REVIEW.', icon: 'UserCheck', order: 0 },
        { id: 'step-2', title: '2. Lấy Link & QR giới thiệu', description: 'Sau khi được duyệt kích hoạt (ACTIVE), chọn khóa học quan tâm và lấy Link/QR giới thiệu riêng của bạn.', icon: 'QrCode', order: 1 },
        { id: 'step-3', title: '3. Giới thiệu & Nhận thưởng', description: 'Học viên đăng ký qua link/QR; nhà trường đối chiếu hồ sơ và học phí để ghi nhận hoa hồng thành công.', icon: 'Award', order: 2 }
      ]
    }
  },
  {
    id: 'success_stories',
    name: 'Khối Câu chuyện thành công',
    enabled: false,
    order: 3,
    config: {
      title: 'Câu Chuyện Thành Công Từ Cộng Tác Viên',
      subtitle: 'Lắng nghe chia sẻ từ những cầu nối tuyển sinh xuất sắc',
      stories: []
    }
  },
  {
    id: 'faq',
    name: 'Khối Giải đáp thắc mắc',
    enabled: true,
    order: 4,
    config: {
      title: 'Giải Đáp Thắc Mắc Thường Gặp',
      subtitle: 'Mọi thông tin về chương trình Cộng tác viên tuyển sinh STHC',
      faqs: [
        { id: 'faq-1', question: 'Làm thế nào để đăng ký trở thành Cộng tác viên tuyển sinh?', answer: 'Bạn chỉ cần điền thông tin vào form đăng ký tài khoản CTV ở đầu trang, xác thực email và chờ Ban Tuyển sinh phê duyệt tài khoản.', enabled: true, order: 0 },
        { id: 'faq-2', question: 'Mức hoa hồng chi trả cho mỗi hồ sơ là bao nhiêu?', answer: 'Mức thù lao là 500.000 VNĐ cho mỗi hồ sơ giới thiệu nhập học thành công sau khi học viên hoàn tất đóng học phí.', enabled: true, order: 1 },
        { id: 'faq-3', question: 'Khi nào tôi nhận được thù lao giới thiệu?', answer: 'Thù lao được đối soát và xác nhận khi học viên hoàn tất thủ tục nhập học và đóng học phí theo quy định của nhà trường.', enabled: true, order: 2 }
      ]
    }
  },
  {
    id: 'cta',
    name: 'Khối Sẵn sàng trở thành CTV',
    enabled: true,
    order: 5,
    config: {
      title: 'Sẵn Sàng Trở Thành Cầu Nối Tuyển Sinh?',
      subtitle: 'Đăng ký ngay hôm nay để nhận quyền lợi hấp dẫn và đồng hành cùng uy tín đào tạo 35 năm.',
      buttonLabel: 'Đăng Ký Tài Khoản CTV Ngay'
    }
  }
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

  // General Form state
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoAlt, setLogoAlt] = useState<string>('');
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState<string>('');
  const [heroBackgroundAlt, setHeroBackgroundAlt] = useState<string>('');
  const [heroIllustrationUrl, setHeroIllustrationUrl] = useState<string>('');
  const [heroIllustrationAlt, setHeroIllustrationAlt] = useState<string>('');
  const [hotline, setHotline] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('');
  const [layoutBlocks, setLayoutBlocks] = useState<LayoutBlock[]>(DEFAULT_LAYOUT_BLOCKS);

  // Block specific editable states
  const [heroConfig, setHeroConfig] = useState({ title: '', subtitle: '', description: '', ctaLabel: '' });
  const [commissionConfig, setCommissionConfig] = useState({ title: '', amount: '', currency: '', unitLabel: '', description: '', condition: '', benefits: [] as string[], ctaLabel: '' });
  const [processConfig, setProcessConfig] = useState({ title: '', subtitle: '', steps: [] as any[] });
  const [successConfig, setSuccessConfig] = useState({ title: '', subtitle: '', stories: [] as any[] });
  const [faqConfig, setFaqConfig] = useState({ title: '', subtitle: '', faqs: [] as any[] });
  const [ctaConfig, setCtaConfig] = useState({ title: '', subtitle: '', buttonLabel: '' });

  // Published & History meta
  const [publishedInfo, setPublishedInfo] = useState<any>(null);
  const [savedDraftInfo, setSavedDraftInfo] = useState<any>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
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

        // Extract block configs
        const findBlockCfg = (id: string) => blocks.find((b: any) => b.id === id)?.config || DEFAULT_LAYOUT_BLOCKS.find(d => d.id === id)?.config;
        
        const hc = findBlockCfg('hero');
        setHeroConfig({ title: hc?.title || '', subtitle: hc?.subtitle || '', description: hc?.description || '', ctaLabel: hc?.ctaLabel || '' });

        const cc = findBlockCfg('commission_policy');
        setCommissionConfig({
          title: cc?.title || '',
          amount: cc?.amount || '',
          currency: cc?.currency || '',
          unitLabel: cc?.unitLabel || '',
          description: cc?.description || '',
          condition: cc?.condition || '',
          benefits: cc?.benefits || [],
          ctaLabel: cc?.ctaLabel || ''
        });

        const pc = findBlockCfg('process');
        setProcessConfig({ title: pc?.title || '', subtitle: pc?.subtitle || '', steps: pc?.steps || [] });

        const sc = findBlockCfg('success_stories');
        setSuccessConfig({ title: sc?.title || '', subtitle: sc?.subtitle || '', stories: sc?.stories || [] });

        const fc = findBlockCfg('faq');
        setFaqConfig({ title: fc?.title || '', subtitle: fc?.subtitle || '', faqs: fc?.faqs || [] });

        const ctac = findBlockCfg('cta');
        setCtaConfig({ title: ctac?.title || '', subtitle: ctac?.subtitle || '', buttonLabel: ctac?.buttonLabel || '' });

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

  const hasUnsavedChanges = Boolean(savedDraftInfo);

  const handleCancelChanges = () => {
    loadConfig();
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
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Dung lượng ảnh vượt quá giới hạn 5 MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) {
          setLogoUrl(res.url);
          setFeedback({ type: 'success', message: 'Tải ảnh logo lên bản nháp thành công!' });
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err?.message || 'Lỗi tải ảnh.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) setHeroBackgroundUrl(res.url);
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  const handleIllustrationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadHomepageLogo(reader.result as string, file.name);
        if (res.success && res.url) setHeroIllustrationUrl(res.url);
      } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    // Assemble layout blocks with updated configs
    const updatedBlocks = layoutBlocks.map(b => {
      let cfg = b.config || {};
      if (b.id === 'hero') cfg = heroConfig;
      if (b.id === 'commission_policy') cfg = commissionConfig;
      if (b.id === 'process') cfg = processConfig;
      if (b.id === 'success_stories') cfg = successConfig;
      if (b.id === 'faq') cfg = faqConfig;
      if (b.id === 'cta') cfg = ctaConfig;
      return { ...b, config: cfg };
    });

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
        layout_blocks: updatedBlocks,
      };

      const res = await api.updateHomepageConfig(payload);
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: 'Đã lưu bản nháp thành công! (Trang công khai chưa thay đổi cho đến khi Xuất bản).' });
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
    if (!window.confirm('Xác nhận xuất bản bản nháp hiện tại lên các trang công khai?')) return;
    setPublishing(true);
    setFeedback(null);
    try {
      const res = await api.publishHomepageConfig();
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: res.message || 'Xuất bản thành công!' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể xuất bản.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi xuất bản.' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!window.confirm(`Xác nhận khôi phục từ phiên bản v${versionNumber}?`)) return;
    setRestoringVersion(versionNumber);
    try {
      const res = await api.restoreHomepageVersion(versionNumber);
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: `Khôi phục thành công từ v${versionNumber}!` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Lỗi khôi phục.' });
    } finally {
      setRestoringVersion(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-600 font-medium">Đang tải quản lý trang chủ...</p>
      </div>
    );
  }

  const activePreviewBlocks = previewVersionSnapshot
    ? [...(previewVersionSnapshot.layout_blocks || DEFAULT_LAYOUT_BLOCKS)].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).filter((b: any) => b.enabled !== false)
    : [...layoutBlocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).filter(b => b.enabled !== false);

  const previewLogoUrl = previewVersionSnapshot ? previewVersionSnapshot.logo_url : logoUrl;
  const previewLogoAlt = previewVersionSnapshot ? previewVersionSnapshot.logo_alt : logoAlt;
  const previewHotline = previewVersionSnapshot ? previewVersionSnapshot.hotline : hotline;
  const previewFooter = previewVersionSnapshot ? previewVersionSnapshot.footer_text : footerText;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Trang chủ & Thu hút CTV</h1>
          <p className="text-xs text-slate-600 mt-1">
            Cấu hình nội dung 6 khối landing page, xuất bản công khai và khôi phục lịch sử phiên bản.
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
            disabled={publishing}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Xuất bản ngay</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{feedback.message}</div>
        </div>
      )}

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* GROUP A: LAYOUT BLOCKS & ORDERING */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Layers className="w-5 h-5 text-blue-900" />
            <div>
              <h2 className="text-base font-bold text-slate-900">A. Bố cục 6 Khối Landing Page (Sắp xếp & Bật/Tắt)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Header luôn ở đầu, Footer luôn ở cuối trang.</p>
            </div>
          </div>

          <div className="space-y-3">
            {layoutBlocks.map((block, index) => (
              <div
                key={block.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${block.enabled ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-70'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{block.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500">Mã: {block.id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(index)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${block.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {block.enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                    <span>{block.enabled ? 'Hiển thị' : 'Đã ẩn'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-2 bg-white text-slate-700 rounded-lg border border-slate-300 disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === layoutBlocks.length - 1}
                    className="p-2 bg-white text-slate-700 rounded-lg border border-slate-300 disabled:opacity-40"
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
            <h2 className="text-base font-bold text-slate-900">B. Cấu hình Header, Logo & Hotline dùng chung</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Logo trường</label>
              <div className="flex items-center gap-4 p-4 bg-slate-50 border rounded-xl">
                <div className="w-32 h-16 bg-white rounded-lg border flex items-center justify-center overflow-hidden">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-6 h-6 text-slate-400" />}
                </div>
                <div>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white font-semibold text-xs rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn ảnh logo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hotline</label>
              <input
                type="text"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                placeholder="028 3843 6532"
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* GROUP C: EDIT HERO BLOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">C. Chỉnh sửa Khối Giới thiệu & Banner (Hero)</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề chính</label>
              <input
                type="text"
                value={heroConfig.title}
                onChange={(e) => setHeroConfig({ ...heroConfig, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề phụ / Slogan</label>
              <input
                type="text"
                value={heroConfig.subtitle}
                onChange={(e) => setHeroConfig({ ...heroConfig, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đoạn mô tả giới thiệu</label>
              <textarea
                rows={3}
                value={heroConfig.description}
                onChange={(e) => setHeroConfig({ ...heroConfig, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hình nền trang chính</label>
                <input type="file" accept="image/*" onChange={handleBgUpload} className="text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh minh họa</label>
                <input type="file" accept="image/*" onChange={handleIllustrationUpload} className="text-xs" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP D: COMMISSION POLICY BLOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">D. Chỉnh sửa Khối Chính sách Hoa hồng CTV</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề chính sách</label>
                <input
                  type="text"
                  value={commissionConfig.title}
                  onChange={(e) => setCommissionConfig({ ...commissionConfig, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mức thù lao (VNĐ)</label>
                <input
                  type="text"
                  value={commissionConfig.amount}
                  onChange={(e) => setCommissionConfig({ ...commissionConfig, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono font-bold text-amber-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
              <textarea
                rows={2}
                value={commissionConfig.description}
                onChange={(e) => setCommissionConfig({ ...commissionConfig, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Điều kiện ghi nhận & Chờ duyệt</label>
              <input
                type="text"
                value={commissionConfig.condition}
                onChange={(e) => setCommissionConfig({ ...commissionConfig, condition: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* GROUP E: PROCESS STEPS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">E. Chỉnh sửa Khối Quy trình trở thành CTV</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề quy trình</label>
              <input
                type="text"
                value={processConfig.title}
                onChange={(e) => setProcessConfig({ ...processConfig, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">Các bước thực hiện:</label>
              {processConfig.steps.map((step: any, idx: number) => (
                <div key={step.id || idx} className="p-3 bg-slate-50 rounded-xl border space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-blue-900">Bước {idx + 1}</span>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const newSteps = [...processConfig.steps];
                        newSteps[idx].title = e.target.value;
                        setProcessConfig({ ...processConfig, steps: newSteps });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-bold"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(e) => {
                      const newSteps = [...processConfig.steps];
                      newSteps[idx].description = e.target.value;
                      setProcessConfig({ ...processConfig, steps: newSteps });
                    }}
                    className="w-full px-3 py-1.5 bg-white border rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GROUP F: FAQ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">F. Chỉnh sửa Khối Giải đáp thắc mắc (FAQ)</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề FAQ</label>
              <input
                type="text"
                value={faqConfig.title}
                onChange={(e) => setFaqConfig({ ...faqConfig, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">Danh sách câu hỏi & trả lời:</label>
                <button
                  type="button"
                  onClick={() => {
                    const newFaqs = [...faqConfig.faqs, { id: `faq-${Date.now()}`, question: 'Câu hỏi mới?', answer: 'Nội dung câu trả lời.', enabled: true, order: faqConfig.faqs.length }];
                    setFaqConfig({ ...faqConfig, faqs: newFaqs });
                  }}
                  className="px-3 py-1 bg-blue-900 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm câu hỏi</span>
                </button>
              </div>

              {faqConfig.faqs.map((faq: any, idx: number) => (
                <div key={faq.id} className="p-3 bg-slate-50 rounded-xl border space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const newFaqs = [...faqConfig.faqs];
                        newFaqs[idx].question = e.target.value;
                        setFaqConfig({ ...faqConfig, faqs: newFaqs });
                      }}
                      placeholder="Câu hỏi"
                      className="flex-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFaqs = faqConfig.faqs.filter((_, i) => i !== idx);
                        setFaqConfig({ ...faqConfig, faqs: newFaqs });
                      }}
                      className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const newFaqs = [...faqConfig.faqs];
                      newFaqs[idx].answer = e.target.value;
                      setFaqConfig({ ...faqConfig, faqs: newFaqs });
                    }}
                    placeholder="Câu trả lời"
                    className="w-full px-3 py-1.5 bg-white border rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GROUP G: FOOTER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">G. Cấu hình Footer</h2>
          <textarea
            rows={2}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="© 2026 STHC - Saigontourist Group. Tất cả quyền được bảo lưu."
            className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleCancelChanges}
            className="inline-flex items-center gap-1.5 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>Hủy thay đổi</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <span>Đang lưu bản nháp...</span>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-400" />
                <span>Lưu bản nháp</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* HISTORY & RESTORE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="w-5 h-5 text-blue-900" />
          <h2 className="text-base font-bold text-slate-900">Lịch sử xuất bản & Khôi phục phiên bản</h2>
        </div>

        {historyList.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có lịch sử xuất bản nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                  <th className="p-3">Phiên bản</th>
                  <th className="p-3">Thao tác</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Người thực hiện</th>
                  <th className="p-3 text-right">Quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((hist) => {
                  const isCurrentActive = hist.version_number === publishedInfo?.version_number;
                  return (
                    <tr key={hist.version_number} className={isCurrentActive ? 'bg-emerald-50/50 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono font-bold text-blue-900">v{hist.version_number}</td>
                      <td className="p-3">{hist.action_type || 'PUBLISH'}</td>
                      <td className="p-3 text-slate-600">{new Date(hist.created_at).toLocaleString('vi-VN')}</td>
                      <td className="p-3">{hist.created_by || 'Admin'}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => { setPreviewVersionSnapshot(hist); setIsPreviewOpen(true); }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                        >
                          Xem trước
                        </button>
                        {!isCurrentActive && (
                          <button
                            type="button"
                            onClick={() => handleRestore(hist.version_number)}
                            disabled={restoringVersion === hist.version_number}
                            className="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold"
                          >
                            Khôi phục
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

      {/* PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <span className="font-bold text-sm">Xem trước bản nháp / Phiên bản trang chủ</span>
              <button type="button" onClick={() => { setIsPreviewOpen(false); setPreviewVersionSnapshot(null); }} className="p-1.5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-200 p-4 sm:p-8 overflow-y-auto flex items-center justify-center">
              <div className="w-full bg-white shadow-2xl rounded-xl overflow-hidden min-h-[500px]">
                <PublicHeader
                  onNavigateHome={() => {}}
                  showAuthButtons={true}
                  draftConfig={{ logo_url: previewLogoUrl, logo_alt: previewLogoAlt, hotline: previewHotline }}
                />
                <div className="p-8 text-center text-slate-700 space-y-4">
                  <h2 className="text-xl font-bold">Khung xem trước trang chủ landing page CTV</h2>
                  <p className="text-xs text-slate-500">Các khối đang được bật sắp hiển thị theo thứ tự cấu hình.</p>
                </div>
                <PublicFooter draftConfig={{ footer_text: previewFooter }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
