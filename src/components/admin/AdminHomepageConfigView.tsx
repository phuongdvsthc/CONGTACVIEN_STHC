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
  Play,
  Video,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Award,
  Clock,
  HelpCircle,
  UserCheck,
  QrCode,
} from 'lucide-react';
import { api } from '../../services/api';
import { PublicHeader } from '../public/PublicHeader';
import { PublicFooter } from '../public/PublicFooter';

export function extractYouTubeId(url?: string): string {
  if (!url) return '';
  const clean = url.trim();
  const match = clean.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return '';
}

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
    enabled: true,
    order: 3,
    config: {
      title: 'Câu Chuyện Thành Công Từ Cộng Tác Viên',
      subtitle: 'Lắng nghe chia sẻ thực tế và hành trình đồng hành tuyển sinh cùng Trường Saigontourist',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_video_id: 'dQw4w9WgXcQ',
      video_title: 'Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC',
      video_description: 'Trải nghiệm giới thiệu người học thực tế, đối soát minh bạch và cơ hội lan tỏa tương lai ngành du lịch 5 sao.',
      videos: [
        {
          id: 'video-1',
          title: 'Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC',
          youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          youtube_video_id: 'dQw4w9WgXcQ',
          role: 'Cựu sinh viên Khóa Bếp Á - Âu (2022)',
          quote: 'Chương trình CTV của Saigontourist rất minh bạch và rõ ràng. Mình vừa giúp các bạn học sinh chọn được ngành nghề uy tín tại trường 5 sao, vừa có nguồn thu nhập xứng đáng 500.000 VNĐ / hồ sơ nhập học.',
          achievement: 'Đã giới thiệu 18 hồ sơ hợp lệ',
          enabled: true
        },
        {
          id: 'video-2',
          title: 'Hành trình lan tỏa đam mê ngành Khách sạn 5 sao',
          youtube_url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
          youtube_video_id: 'jNQXAC9IVRw',
          role: 'Chuyên viên Nhà hàng Khách sạn Rex',
          quote: 'Hệ thống cấp link và mã QR cá nhân hóa tiện lợi vô cùng. Mỗi khi học sinh quan tâm quét mã đăng ký, mình đều theo dõi được tiến độ tư vấn và đối soát học phí theo thời gian thực.',
          achievement: 'Đã giới thiệu 12 hồ sơ hợp lệ',
          enabled: true
        }
      ],
      stories: [
        {
          id: 'story-1',
          name: 'Nguyễn Hoàng Nam',
          role: 'Cựu sinh viên Khóa Bếp Á - Âu (2022)',
          quote: 'Chương trình CTV của Saigontourist rất minh bạch và rõ ràng. Mình vừa giúp các bạn học sinh chọn được ngành nghề uy tín tại trường 5 sao, vừa có nguồn thu nhập xứng đáng 500.000 VNĐ / hồ sơ nhập học.',
          avatar_url: '',
          achievement: 'Đã giới thiệu 18 hồ sơ hợp lệ',
          enabled: true
        },
        {
          id: 'story-2',
          name: 'Trần Thị Mai Phương',
          role: 'Chuyên viên Nhà hàng Khách sạn Rex',
          quote: 'Hệ thống cấp link và mã QR cá nhân hóa tiện lợi vô cùng. Mỗi khi học sinh quan tâm quét mã đăng ký, mình đều theo dõi được tiến độ tư vấn và đối soát học phí theo thời gian thực.',
          avatar_url: '',
          achievement: 'Đã giới thiệu 12 hồ sơ hợp lệ',
          enabled: true
        }
      ]
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

interface AdminHomepageConfigViewProps {
  currentUser?: any;
}

export const AdminHomepageConfigView: React.FC<AdminHomepageConfigViewProps> = ({ currentUser }) => {
  const isStaffOnly = currentUser?.role === 'staff';
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
  const [successConfig, setSuccessConfig] = useState<{
    title: string;
    subtitle: string;
    youtube_url: string;
    youtube_video_id: string;
    video_title: string;
    video_description: string;
    videos: Array<{
      id: string;
      title: string;
      youtube_url: string;
      youtube_video_id: string;
      role: string;
      quote: string;
      achievement?: string;
      enabled: boolean;
    }>;
    stories: Array<{
      id: string;
      name: string;
      role: string;
      quote: string;
      avatar_url: string;
      achievement?: string;
      enabled: boolean;
    }>;
  }>({
    title: 'Câu Chuyện Thành Công Từ Cộng Tác Viên',
    subtitle: 'Lắng nghe chia sẻ thực tế và hành trình đồng hành tuyển sinh cùng Trường Saigontourist',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtube_video_id: 'dQw4w9WgXcQ',
    video_title: 'Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC',
    video_description: 'Trải nghiệm giới thiệu người học thực tế, đối soát minh bạch và cơ hội lan tỏa tương lai ngành du lịch 5 sao.',
    videos: [
      {
        id: 'video-1',
        title: 'Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtube_video_id: 'dQw4w9WgXcQ',
        role: 'Cựu sinh viên Khóa Bếp Á - Âu (2022)',
        quote: 'Chương trình CTV của Saigontourist rất minh bạch và rõ ràng. Mình vừa giúp các bạn học sinh chọn được ngành nghề uy tín tại trường 5 sao, vừa có nguồn thu nhập xứng đáng 500.000 VNĐ / hồ sơ nhập học.',
        achievement: 'Đã giới thiệu 18 hồ sơ hợp lệ',
        enabled: true,
      },
      {
        id: 'video-2',
        title: 'Hành trình lan tỏa đam mê ngành Khách sạn 5 sao',
        youtube_url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        youtube_video_id: 'jNQXAC9IVRw',
        role: 'Chuyên viên Nhà hàng Khách sạn Rex',
        quote: 'Hệ thống cấp link và mã QR cá nhân hóa tiện lợi vô cùng. Mỗi khi học sinh quan tâm quét mã đăng ký, mình đều theo dõi được tiến độ tư vấn và đối soát học phí theo thời gian thực.',
        achievement: 'Đã giới thiệu 12 hồ sơ hợp lệ',
        enabled: true,
      },
    ],
    stories: [],
  });
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
        const defSc = DEFAULT_LAYOUT_BLOCKS.find(d => d.id === 'success_stories')?.config;
        const yUrl = sc?.youtube_url !== undefined ? sc.youtube_url : (defSc?.youtube_url || '');
        let vids = (Array.isArray(sc?.videos) && sc.videos.length > 0) ? sc.videos : (defSc?.videos || []);
        if (!vids || vids.length === 0) {
          vids = [
            {
              id: 'video-1',
              title: sc?.video_title || 'Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC',
              youtube_url: yUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              youtube_video_id: sc?.youtube_video_id || extractYouTubeId(yUrl) || 'dQw4w9WgXcQ',
              role: 'Cựu sinh viên Khóa Bếp Á - Âu (2022)',
              quote: 'Chương trình CTV của Saigontourist rất minh bạch và rõ ràng. Mình vừa giúp các bạn học sinh chọn được ngành nghề uy tín tại trường 5 sao, vừa có nguồn thu nhập xứng đáng 500.000 VNĐ / hồ sơ nhập học.',
              achievement: 'Đã giới thiệu 18 hồ sơ hợp lệ',
              enabled: true,
            }
          ];
        }
        setSuccessConfig({
          title: sc?.title || defSc?.title || 'Câu Chuyện Thành Công Từ Cộng Tác Viên',
          subtitle: sc?.subtitle || defSc?.subtitle || 'Lắng nghe chia sẻ thực tế và hành trình đồng hành tuyển sinh cùng Trường Saigontourist',
          youtube_url: yUrl,
          youtube_video_id: sc?.youtube_video_id || extractYouTubeId(yUrl),
          video_title: sc?.video_title !== undefined ? sc.video_title : (defSc?.video_title || ''),
          video_description: sc?.video_description !== undefined ? sc.video_description : (defSc?.video_description || ''),
          videos: vids,
          stories: Array.isArray(sc?.stories) && sc.stories.length > 0 ? sc.stories : (defSc?.stories || []),
        });

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

  const handleYouTubeUrlChange = (val: string) => {
    const extracted = extractYouTubeId(val);
    setSuccessConfig(prev => ({
      ...prev,
      youtube_url: val,
      youtube_video_id: extracted,
    }));
  };

  const handleRemoveVideo = () => {
    setSuccessConfig(prev => ({
      ...prev,
      youtube_url: '',
      youtube_video_id: '',
      video_title: '',
      video_description: '',
    }));
  };

  const handleAddStory = () => {
    const newStory = {
      id: `story-${Date.now()}`,
      name: 'Cộng tác viên tiêu biểu',
      role: 'Chuyên viên / Cựu sinh viên STHC',
      quote: 'Chia sẻ trải nghiệm thực tế và cơ hội đồng hành tuyển sinh...',
      avatar_url: '',
      achievement: 'Đã giới thiệu 10 hồ sơ hợp lệ',
      enabled: true,
    };
    setSuccessConfig(prev => ({
      ...prev,
      stories: [...prev.stories, newStory],
    }));
  };

  const handleDeleteStory = (idx: number) => {
    setSuccessConfig(prev => ({
      ...prev,
      stories: prev.stories.filter((_, i) => i !== idx),
    }));
  };

  const handleToggleStory = (idx: number) => {
    setSuccessConfig(prev => {
      const updated = [...prev.stories];
      updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
      return { ...prev, stories: updated };
    });
  };

  const handleUpdateStory = (idx: number, field: string, value: any) => {
    setSuccessConfig(prev => {
      const updated = [...prev.stories];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, stories: updated };
    });
  };

  const handleAddVideo = () => {
    const newVideo = {
      id: `video-${Date.now()}`,
      title: 'Chia sẻ từ Cộng tác viên tiêu biểu STHC',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_video_id: 'dQw4w9WgXcQ',
      role: 'Cựu sinh viên / CTV Tuyển sinh',
      quote: 'Chia sẻ trải nghiệm thực tế và cơ hội đồng hành tuyển sinh cùng Trường Saigontourist...',
      achievement: 'Đã giới thiệu 15 hồ sơ hợp lệ',
      enabled: true,
    };
    setSuccessConfig(prev => ({
      ...prev,
      videos: [...(prev.videos || []), newVideo],
    }));
  };

  const handleDeleteVideo = (idx: number) => {
    setSuccessConfig(prev => ({
      ...prev,
      videos: (prev.videos || []).filter((_, i) => i !== idx),
    }));
  };

  const handleToggleVideo = (idx: number) => {
    setSuccessConfig(prev => {
      const updated = [...(prev.videos || [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
      }
      return { ...prev, videos: updated };
    });
  };

  const handleUpdateVideo = (idx: number, field: string, value: any) => {
    setSuccessConfig(prev => {
      const updated = [...(prev.videos || [])];
      if (updated[idx]) {
        if (field === 'youtube_url') {
          const extractedId = extractYouTubeId(value);
          updated[idx] = {
            ...updated[idx],
            youtube_url: value,
            youtube_video_id: extractedId || (value.trim().length === 11 ? value.trim() : ''),
          };
        } else {
          updated[idx] = { ...updated[idx], [field]: value };
        }
      }
      return { ...prev, videos: updated };
    });
  };

  const handleMoveVideoUp = (idx: number) => {
    if (idx <= 0) return;
    setSuccessConfig(prev => {
      const updated = [...(prev.videos || [])];
      const temp = updated[idx];
      updated[idx] = updated[idx - 1];
      updated[idx - 1] = temp;
      return { ...prev, videos: updated };
    });
  };

  const handleMoveVideoDown = (idx: number) => {
    setSuccessConfig(prev => {
      const updated = [...(prev.videos || [])];
      if (idx >= updated.length - 1) return prev;
      const temp = updated[idx];
      updated[idx] = updated[idx + 1];
      updated[idx + 1] = temp;
      return { ...prev, videos: updated };
    });
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
      if (b.id === 'success_stories') {
        const firstActiveVid = (successConfig.videos || []).find(v => v.enabled !== false && v.youtube_url) || (successConfig.videos || [])[0];
        const primaryUrl = firstActiveVid?.youtube_url || successConfig.youtube_url;
        const vidId = extractYouTubeId(primaryUrl) || (firstActiveVid?.youtube_video_id || extractYouTubeId(successConfig.youtube_url));
        cfg = {
          ...successConfig,
          youtube_url: primaryUrl,
          youtube_video_id: vidId || (successConfig.youtube_video_id ? extractYouTubeId(successConfig.youtube_video_id) : ''),
          video_title: firstActiveVid?.title || successConfig.video_title,
          videos: (successConfig.videos || []).map(v => ({
            ...v,
            youtube_video_id: extractYouTubeId(v.youtube_url) || (v.youtube_url.trim().length === 11 ? v.youtube_url.trim() : v.youtube_video_id),
          })),
        };
      }
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
    if (isStaffOnly) {
      setFeedback({
        type: 'error',
        message: 'Bị từ chối: Thao tác xuất bản chỉ dành riêng cho Quản trị viên (Admin). Cán bộ Tuyển sinh (Staff) không có quyền thực hiện.',
      });
      return;
    }
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
    if (isStaffOnly) {
      setFeedback({
        type: 'error',
        message: 'Bị từ chối: Thao tác khôi phục phiên bản chỉ dành riêng cho Quản trị viên (Admin). Cán bộ Tuyển sinh (Staff) không có quyền thực hiện.',
      });
      return;
    }
    if (!window.confirm(`Xác nhận khôi phục từ phiên bản v${versionNumber}?`)) return;
    setRestoringVersion(versionNumber);
    setFeedback(null);
    try {
      const res = await api.restoreHomepageVersion(versionNumber);
      if (res.success) {
        await loadConfig();
        setFeedback({ type: 'success', message: `Khôi phục thành công từ v${versionNumber}!` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Không thể khôi phục.' });
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

  const previewBlocksSource = previewVersionSnapshot
    ? (previewVersionSnapshot.layout_blocks || DEFAULT_LAYOUT_BLOCKS)
    : layoutBlocks.map(b => {
        let cfg = b.config || {};
        if (b.id === 'hero') cfg = heroConfig;
        if (b.id === 'commission_policy') cfg = commissionConfig;
        if (b.id === 'process') cfg = processConfig;
        if (b.id === 'success_stories') {
          const vidId = extractYouTubeId(successConfig.youtube_url);
          cfg = {
            ...successConfig,
            youtube_video_id: vidId || (successConfig.youtube_video_id ? extractYouTubeId(successConfig.youtube_video_id) : ''),
          };
        }
        if (b.id === 'faq') cfg = faqConfig;
        if (b.id === 'cta') cfg = ctaConfig;
        return { ...b, config: cfg };
      });

  const activePreviewBlocks = [...previewBlocksSource]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((b: any) => b.enabled !== false);

  const previewLogoUrl = previewVersionSnapshot ? previewVersionSnapshot.logo_url : logoUrl;
  const previewLogoAlt = previewVersionSnapshot ? previewVersionSnapshot.logo_alt : logoAlt;
  const previewHeroBgUrl = previewVersionSnapshot ? previewVersionSnapshot.hero_background_url : heroBackgroundUrl;
  const previewHeroIllUrl = previewVersionSnapshot ? previewVersionSnapshot.hero_illustration_url : heroIllustrationUrl;
  const previewHotline = previewVersionSnapshot ? previewVersionSnapshot.hotline : hotline;
  const previewFooter = previewVersionSnapshot ? previewVersionSnapshot.footer_text : footerText;

  // Phân quyền A0.3: Chỉ Staff hoặc Admin mới có quyền truy cập module Quản lý trang chủ
  if (currentUser && currentUser.role !== 'staff' && currentUser.role !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 animate-fade-in font-sans">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Không có quyền truy cập
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Module <strong>Quản lý trang chủ</strong> chỉ dành cho tài khoản Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin).
            Tài khoản hiện tại của bạn (<strong>{currentUser.email}</strong>, vai trò: <span className="font-semibold text-rose-600">{currentUser.role}</span>) không được cấp quyền xem dữ liệu quản trị này.
          </p>
        </div>
      </div>
    );
  }

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
          {isStaffOnly && (
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
              <span>Chỉ Admin mới có quyền Xuất bản</span>
            </span>
          )}

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
            disabled={publishing || isStaffOnly}
            title={isStaffOnly ? 'Chỉ Quản trị viên (Admin) mới có quyền xuất bản.' : 'Xuất bản bản nháp lên các trang công khai'}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Xuất bản ngay</span>
          </button>
        </div>
      </div>

      {/* ROLE BANNER (A0.3 Access Control Notice) */}
      {isStaffOnly ? (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Vai trò: Cán bộ Tuyển sinh (Staff).</span> Bạn được cấp quyền chỉnh sửa nội dung, tải ảnh và <strong>Lưu bản nháp</strong>. Thao tác <strong>Xuất bản công khai</strong> và <strong>Khôi phục phiên bản</strong> chỉ dành riêng cho Quản trị viên (Admin).
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <span className="font-bold">Phiên Quản trị viên (Admin):</span> Bạn có toàn quyền cấu hình, lưu bản nháp, xuất bản và khôi phục lịch sử phiên bản.
            </div>
          </div>
        </div>
      )}

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

        {/* GROUP F: SUCCESS STORIES & YOUTUBE VIDEO STORIES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">F. Chỉnh sửa Khối Câu chuyện thành công (Video YouTube)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Mã khối: <code className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">success_stories</code></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {(successConfig.videos || []).filter(v => v.enabled !== false).length} / {(successConfig.videos || []).length} video đang bật
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {/* Tiêu đề & Slogan khối */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề khối</label>
                <input
                  type="text"
                  value={successConfig.title}
                  onChange={(e) => setSuccessConfig({ ...successConfig, title: e.target.value })}
                  placeholder="Câu Chuyện Thành Công Từ Cộng Tác Viên"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả ngắn gọn / Slogan</label>
                <input
                  type="text"
                  value={successConfig.subtitle}
                  onChange={(e) => setSuccessConfig({ ...successConfig, subtitle: e.target.value })}
                  placeholder="Lắng nghe chia sẻ thực tế và hành trình đồng hành tuyển sinh..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
            </div>

            {/* DANH SÁCH VIDEO CÂU CHUYỆN THÀNH CÔNG */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Danh sách Video Câu chuyện thành công ({(successConfig.videos || []).length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quản lý các video YouTube chia sẻ thực tế từ CTV, tự động nhận diện ID và hỗ trợ xem trước trực tiếp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVideo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thêm video câu chuyện</span>
                </button>
              </div>

              {(successConfig.videos || []).length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                  <Video className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Chưa có video câu chuyện nào.</p>
                  <p className="text-[11px] text-slate-400">Nhấn "Thêm video câu chuyện" để tạo mới video chia sẻ từ CTV.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(successConfig.videos || []).map((video, idx) => {
                    const vId = video.youtube_video_id || extractYouTubeId(video.youtube_url);
                    const isValidId = Boolean(vId && vId.length === 11);
                    return (
                      <div
                        key={video.id || idx}
                        className={`rounded-2xl border p-5 space-y-4 transition-all ${
                          video.enabled !== false ? 'bg-slate-50/90 border-slate-200 shadow-xs' : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Header của thẻ video: Thứ tự, tiêu đề, nút lên/xuống, bật/tắt, xóa */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/80">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-slate-900 truncate max-w-xs sm:max-w-md">
                              {video.title || 'Video câu chuyện CTV'}
                            </span>
                            {isValidId ? (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ID: {vId}</span>
                              </span>
                            ) : video.youtube_url ? (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px]">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Chưa đúng định dạng</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {/* Nút Lên / Xuống */}
                            <button
                              type="button"
                              onClick={() => handleMoveVideoUp(idx)}
                              disabled={idx === 0}
                              className="p-1.5 text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title="Di chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveVideoDown(idx)}
                              disabled={idx >= (successConfig.videos || []).length - 1}
                              className="p-1.5 text-slate-600 hover:text-blue-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title="Di chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Công tắc Bật / Tắt */}
                            <button
                              type="button"
                              onClick={() => handleToggleVideo(idx)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                video.enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {video.enabled !== false ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                              <span>{video.enabled !== false ? 'Hiển thị' : 'Đã ẩn'}</span>
                            </button>

                            {/* Nút Xóa */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(idx)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                              title="Xóa video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Các trường nhập liệu của video */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Tiêu đề câu chuyện / Tên người chia sẻ
                            </label>
                            <input
                              type="text"
                              value={video.title}
                              onChange={(e) => handleUpdateVideo(idx, 'title', e.target.value)}
                              placeholder="VD: Chia sẻ từ CTV tiêu biểu đồng hành cùng STHC"
                              className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Đường dẫn hoặc Video ID YouTube
                            </label>
                            <input
                              type="text"
                              value={video.youtube_url}
                              onChange={(e) => handleUpdateVideo(idx, 'youtube_url', e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=... hoặc Video ID 11 ký tự"
                              className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono"
                            />
                            {/* Badge kiểm tra tính hợp lệ */}
                            <div className="mt-1">
                              {isValidId ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Định dạng hợp lệ (Video ID: <strong className="font-mono">{vId}</strong>)</span>
                                </span>
                              ) : video.youtube_url.trim() ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span>Chưa nhận diện được mã video 11 ký tự từ liên kết này.</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Hỗ trợ link watch?v=, youtu.be/, shorts/, embed/ hoặc ID 11 ký tự.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Vai trò / Ngành nghề / Khóa học của nhân vật
                            </label>
                            <input
                              type="text"
                              value={video.role}
                              onChange={(e) => handleUpdateVideo(idx, 'role', e.target.value)}
                              placeholder="VD: Cựu sinh viên Khóa Bếp Á - Âu (2022)"
                              className="w-full px-3 py-2 bg-white border rounded-xl text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Thành tích / Điểm nổi bật (tùy chọn)
                            </label>
                            <input
                              type="text"
                              value={video.achievement || ''}
                              onChange={(e) => handleUpdateVideo(idx, 'achievement', e.target.value)}
                              placeholder="VD: Đã giới thiệu 18 hồ sơ hợp lệ"
                              className="w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium text-emerald-700"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Trích dẫn ngắn / Lời chia sẻ tóm tắt
                          </label>
                          <textarea
                            rows={2}
                            value={video.quote}
                            onChange={(e) => handleUpdateVideo(idx, 'quote', e.target.value)}
                            placeholder="Nhập lời trích dẫn thực tế từ cộng tác viên..."
                            className="w-full px-3 py-2 bg-white border rounded-xl text-xs leading-relaxed"
                          />
                        </div>

                        {/* Khung xem trước trực tiếp video YouTube (16:9) ngay trên form */}
                        <div className="pt-1">
                          <label className="block text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Play className="w-3.5 h-3.5 text-blue-900" />
                            <span>Xem trước trực tiếp video (16:9):</span>
                          </label>
                          {isValidId ? (
                            <div className="max-w-md rounded-xl overflow-hidden border border-slate-300 bg-slate-950 shadow-md">
                              <div className="relative w-full aspect-video bg-black">
                                <iframe
                                  src={`https://www.youtube.com/embed/${vId}?rel=0&modestbranding=1`}
                                  title={video.title || 'Xem trước video'}
                                  className="absolute inset-0 w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-md p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                              <Video className="w-6 h-6 text-slate-400 mx-auto" />
                              <p className="text-[11px] text-slate-500">
                                Nhập liên kết hoặc ID video YouTube để xem trước trình phát tại đây.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PHÂN NHÓM 2: CÁC CÂU CHUYỆN DẠNG THẺ CHỮ (TÙY CHỌN BỔ SUNG) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Thẻ nhận xét / Quote bổ sung ({(successConfig.stories || []).length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hiển thị các trích dẫn ngắn dạng thẻ bổ sung bên dưới video.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddStory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm nhận xét</span>
                </button>
              </div>

              {(successConfig.stories || []).length > 0 && (
                <div className="space-y-3">
                  {successConfig.stories.map((story, idx) => (
                    <div
                      key={story.id || idx}
                      className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                        story.enabled !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                        <span className="font-bold text-xs text-slate-900">{story.name || 'Cộng tác viên'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStory(idx)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              story.enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{story.enabled !== false ? 'Hiển thị' : 'Đã ẩn'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStory(idx)}
                            className="p-1 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 rounded border border-slate-200"
                            title="Xóa nhận xét"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          value={story.name}
                          onChange={(e) => handleUpdateStory(idx, 'name', e.target.value)}
                          placeholder="Họ tên CTV"
                          className="px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={story.role}
                          onChange={(e) => handleUpdateStory(idx, 'role', e.target.value)}
                          placeholder="Vai trò / Đơn vị"
                          className="px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={story.achievement || ''}
                          onChange={(e) => handleUpdateStory(idx, 'achievement', e.target.value)}
                          placeholder="Thành tích (VD: 18 hồ sơ)"
                          className="px-2.5 py-1.5 bg-white border rounded-lg text-xs text-emerald-700"
                        />
                        <input
                          type="text"
                          value={story.avatar_url || ''}
                          onChange={(e) => handleUpdateStory(idx, 'avatar_url', e.target.value)}
                          placeholder="Link ảnh avatar (tùy chọn)"
                          className="px-2.5 py-1.5 bg-white border rounded-lg text-xs font-mono"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={story.quote}
                        onChange={(e) => handleUpdateStory(idx, 'quote', e.target.value)}
                        placeholder="Nội dung chia sẻ..."
                        className="w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GROUP G: FAQ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">G. Chỉnh sửa Khối Giải đáp thắc mắc (FAQ)</h2>
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

        {/* GROUP H: FOOTER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b">H. Cấu hình Footer</h2>
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
                            disabled={restoringVersion === hist.version_number || isStaffOnly}
                            title={isStaffOnly ? 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục phiên bản.' : `Khôi phục về v${hist.version_number}`}
                            className="px-3 py-1 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {previewVersionSnapshot ? `Xem trước phiên bản v${previewVersionSnapshot.version_number}` : 'Xem trước bản nháp trang chủ (Chưa xuất bản)'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                  {previewVersionSnapshot ? 'Lịch sử' : 'Bản nháp'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${previewDevice === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Máy tính</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${previewDevice === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Điện thoại</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setIsPreviewOpen(false); setPreviewVersionSnapshot(null); }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Đóng xem trước"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900/40 p-2 sm:p-6 overflow-y-auto flex items-start justify-center">
              <div
                className={`bg-[#070D18] text-slate-100 shadow-2xl overflow-hidden transition-all duration-300 ${
                  previewDevice === 'mobile'
                    ? 'w-full max-w-sm rounded-[36px] border-8 border-slate-800 shadow-2xl ring-1 ring-slate-700 my-4'
                    : 'w-full rounded-2xl border border-slate-800'
                }`}
              >
                {/* Header preview */}
                <PublicHeader
                  onNavigateHome={() => {}}
                  showAuthButtons={true}
                  draftConfig={{ logo_url: previewLogoUrl, logo_alt: previewLogoAlt, hotline: previewHotline }}
                />

                {/* Render active landing page blocks */}
                <div className="space-y-12 pb-16 pt-2 font-sans select-none">
                  {activePreviewBlocks.map((block: any) => {
                    const cfg = block.config || {};

                    if (block.id === 'hero') {
                      return (
                        <div key="preview-hero" className="relative p-6 sm:p-8 bg-gradient-to-b from-[#0B1E3F] via-[#0A1628] to-[#070D18] rounded-2xl mx-3 sm:mx-6 border border-blue-900/40 space-y-4">
                          {previewHeroBgUrl && (
                            <div className="absolute inset-0 opacity-15 rounded-2xl overflow-hidden pointer-events-none">
                              <img src={previewHeroBgUrl} alt="Background" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="relative z-10 space-y-3">
                            <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full">
                              Tuyển sinh Trung cấp & Sơ cấp nghề 2026
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                              {cfg.title || 'Saigontourist Lan Tỏa Tương Lai Ngành Du Lịch'}
                            </h1>
                            <p className="text-amber-300 text-xs sm:text-sm font-medium">
                              {cfg.subtitle || 'Khởi Đầu Nghề Nghiệp Đẳng Cấp 5 Sao'}
                            </p>
                            <p className="text-xs text-blue-100/80 leading-relaxed max-w-xl">
                              {cfg.description}
                            </p>
                            {previewHeroIllUrl && (
                              <div className="rounded-xl overflow-hidden border border-blue-800/40 max-w-sm mt-3">
                                <img src={previewHeroIllUrl} alt="Minh họa" className="w-full h-36 object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (block.id === 'commission_policy') {
                      return (
                        <div key="preview-commission" className="p-6 bg-[#0B1E3F]/80 rounded-2xl mx-3 sm:mx-6 border border-blue-800/50 space-y-3 text-center sm:text-left">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                            Chính sách hoa hồng
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-white">{cfg.title}</h3>
                          <div className="text-2xl font-black font-mono text-amber-400">
                            {cfg.amount || '500.000'} {cfg.currency || 'VNĐ'} <span className="text-xs font-normal text-slate-300">/ {cfg.unitLabel || 'hồ sơ'}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{cfg.description}</p>
                          {cfg.condition && (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-400/30 rounded-xl text-[11px] text-amber-200">
                              {cfg.condition}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (block.id === 'process') {
                      return (
                        <div key="preview-process" className="p-6 bg-[#0B1E3F]/50 rounded-2xl mx-3 sm:mx-6 border border-blue-900/40 space-y-4">
                          <h3 className="text-base font-bold text-white text-center">{cfg.title || 'Quy trình tham gia'}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(cfg.steps || []).map((step: any, i: number) => (
                              <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-blue-900/40 space-y-1">
                                <span className="text-[10px] font-bold text-amber-400 font-mono">Bước {i + 1}</span>
                                <h4 className="text-xs font-bold text-white">{step.title}</h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed">{step.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (block.id === 'success_stories') {
                      const rawVideos = Array.isArray(cfg.videos) ? cfg.videos : [];
                      const activeVideos = rawVideos.filter((v: any) => v && v.enabled !== false);
                      const vidId = cfg.youtube_video_id || extractYouTubeId(cfg.youtube_url);
                      const stories = Array.isArray(cfg.stories) ? cfg.stories.filter((s: any) => s && s.enabled !== false) : [];

                      return (
                        <div key="preview-stories" className="p-6 bg-[#0B1E3F]/70 rounded-2xl mx-3 sm:mx-6 border border-blue-800/40 space-y-6">
                          <div className="text-center space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                              Câu chuyện thành công
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white">{cfg.title || 'Câu Chuyện Thành Công Từ Cộng Tác Viên'}</h3>
                            <p className="text-xs text-slate-300">{cfg.subtitle || 'Lắng nghe chia sẻ thực tế và hành trình đồng hành tuyển sinh cùng Trường Saigontourist'}</p>
                          </div>

                          {/* Danh sách video YouTube câu chuyện */}
                          {activeVideos.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {activeVideos.map((video: any, idx: number) => {
                                const vId = video.youtube_video_id || extractYouTubeId(video.youtube_url);
                                return (
                                  <div key={video.id || idx} className="rounded-2xl border border-blue-800/60 bg-slate-900/90 p-4 space-y-3 shadow-md flex flex-col justify-between">
                                    <div className="space-y-3">
                                      {vId ? (
                                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
                                          <iframe
                                            src={`https://www.youtube.com/embed/${vId}?rel=0&modestbranding=1`}
                                            title={video.title || `Video câu chuyện CTV ${idx + 1}`}
                                            className="absolute inset-0 w-full h-full border-0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                                          <Play className="w-6 h-6 opacity-40 mr-1.5" />
                                          <span>Video đang được cập nhật</span>
                                        </div>
                                      )}
                                      <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                          <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                          <span className="truncate">{video.title || 'Chia sẻ từ CTV'}</span>
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                          {video.role && (
                                            <span className="text-[10px] text-blue-300 bg-blue-900/50 border border-blue-700/50 px-2 py-0.5 rounded">
                                              {video.role}
                                            </span>
                                          )}
                                          {video.achievement && (
                                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                                              {video.achievement}
                                            </span>
                                          )}
                                        </div>
                                        {video.quote && (
                                          <p className="text-[11px] text-slate-300 italic pt-1 line-clamp-3">
                                            "{video.quote}"
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : vidId ? (
                            /* Fallback cho bản có 1 video chính */
                            <div className="max-w-xl mx-auto rounded-xl overflow-hidden border border-slate-700 bg-black shadow-lg">
                              <div className="relative w-full aspect-video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${vidId}?rel=0&modestbranding=1`}
                                  title={cfg.video_title || 'Video YouTube CTV'}
                                  className="absolute inset-0 w-full h-full border-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>
                              {(cfg.video_title || cfg.video_description) && (
                                <div className="p-3 bg-slate-900 text-white">
                                  {cfg.video_title && <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{cfg.video_title}</h4>}
                                  {cfg.video_description && <p className="text-[11px] text-slate-300 mt-0.5">{cfg.video_description}</p>}
                                </div>
                              )}
                            </div>
                          ) : null}

                          {/* Thẻ câu chuyện */}
                          {stories.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {stories.map((st: any, idx: number) => (
                                <div key={st.id || idx} className="p-3.5 bg-slate-900/90 rounded-xl border border-blue-900/50 space-y-2">
                                  <div className="flex items-center gap-2.5">
                                    {st.avatar_url ? (
                                      <img src={st.avatar_url} alt={st.name} className="w-8 h-8 rounded-full object-cover border border-amber-400/50 shrink-0" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-blue-800 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                        {st.name?.[0] || 'C'}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-xs text-white truncate">{st.name}</h5>
                                      <p className="text-[10px] text-blue-300 truncate">{st.role}</p>
                                    </div>
                                  </div>
                                  {st.achievement && (
                                    <span className="inline-block text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                                      {st.achievement}
                                    </span>
                                  )}
                                  <p className="text-[11px] text-slate-300 italic">"{st.quote}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (block.id === 'faq') {
                      return (
                        <div key="preview-faq" className="p-6 bg-[#0B1E3F]/40 rounded-2xl mx-3 sm:mx-6 border border-blue-900/40 space-y-3">
                          <h3 className="text-base font-bold text-white text-center">{cfg.title || 'Giải đáp thắc mắc'}</h3>
                          <div className="space-y-2 max-w-xl mx-auto">
                            {(cfg.faqs || []).map((faq: any, i: number) => (
                              <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-blue-900/30 space-y-1">
                                <h4 className="text-xs font-bold text-amber-300">{faq.question}</h4>
                                <p className="text-[11px] text-slate-300">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (block.id === 'cta') {
                      return (
                        <div key="preview-cta" className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl mx-3 sm:mx-6 border border-amber-400/30 text-center space-y-3">
                          <h3 className="text-base sm:text-lg font-bold text-white">{cfg.title || 'Sẵn sàng trở thành CTV?'}</h3>
                          <p className="text-xs text-blue-200">{cfg.subtitle}</p>
                          <div className="inline-block px-5 py-2.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md">
                            {cfg.buttonLabel || 'Đăng Ký Tham Gia Ngay'}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

                {/* Footer preview */}
                <PublicFooter draftConfig={{ footer_text: previewFooter }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
