import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Save,
  Eye,
  Send,
  AlertCircle,
  Check,
  Search,
  UserCheck,
  AlertTriangle,
  Loader2,
  Trash2,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../../services/api';
import {
  AdminAnnouncementDetailDTO,
  NotificationCategory,
  NotificationRecipientScope,
  NotificationRecipientFilter,
  RecipientOptionItemDTO,
} from '../../../types';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';
import { AnnouncementPreviewModal } from './AnnouncementPreviewModal';

interface AnnouncementFormModalProps {
  announcement?: AdminAnnouncementDetailDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedItem: any, actionType: 'saved' | 'published') => void;
  canPublish?: boolean;
}

const AFFILIATE_STATUSES = [
  { value: 'ACTIVE', label: 'Đang hoạt động (ACTIVE)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { value: 'PENDING_REVIEW', label: 'Chờ duyệt hồ sơ (PENDING_REVIEW)', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'SUSPENDED', label: 'Tạm ngưng (SUSPENDED)', color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { value: 'REJECTED', label: 'Đã từ chối (REJECTED)', color: 'text-slate-700 bg-slate-100 border-slate-200' },
];

type AnnouncementCategory = 'GENERAL' | 'POLICY' | 'URGENT' | 'EVENT';

export const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onSuccess,
  canPublish = false,
}) => {
  const isEditing = Boolean(announcement?.id);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('GENERAL');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [recipientScope, setRecipientScope] = useState<NotificationRecipientScope>('ALL');
  const [statusFilters, setStatusFilters] = useState<string[]>(['ACTIVE']);
  const [selectedAffiliates, setSelectedAffiliates] = useState<RecipientOptionItemDTO[]>([]);
  const [actionUrl, setActionUrl] = useState('');

  // UI States
  const [contentTab, setContentTab] = useState<'write' | 'preview'>('write');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Specific Scope Autocomplete State
  const [affiliateSearchQuery, setAffiliateSearchQuery] = useState('');
  const [affiliateSearchResults, setAffiliateSearchResults] = useState<RecipientOptionItemDTO[]>([]);
  const [isSearchingAffiliates, setIsSearchingAffiliates] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const searchDebounceTimer = useRef<any>(null);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize Form Data
  useEffect(() => {
    if (!isOpen) return;

    if (announcement) {
      setTitle(announcement.title || '');
      setCategory((['GENERAL', 'POLICY', 'URGENT', 'EVENT'].includes(announcement.category) ? announcement.category : 'GENERAL') as AnnouncementCategory);
      setSummary(announcement.summary || '');
      setContent(announcement.content || '');
      setRecipientScope(announcement.recipient_scope || 'ALL');
      setActionUrl(announcement.action_url || '');

      const filter = announcement.recipient_filter || {};
      if (filter.statuses && Array.isArray(filter.statuses)) {
        setStatusFilters(filter.statuses);
      } else {
        setStatusFilters(['ACTIVE']);
      }

      const affiliateIds = filter.affiliate_ids;
      if (affiliateIds && Array.isArray(affiliateIds) && affiliateIds.length > 0) {
        // Fetch or prefill specific affiliates
        api.searchAdminAnnouncementRecipients({ limit: 50 })
          .then((res) => {
            if (res.success && res.data) {
              const matched = res.data.filter((opt: RecipientOptionItemDTO) =>
                affiliateIds.includes(opt.affiliate_profile_id)
              );
              // For any ID not in top search, create placeholder option
              const foundIds = new Set(matched.map((m: RecipientOptionItemDTO) => m.affiliate_profile_id));
              const placeholders = affiliateIds
                .filter((id: string) => !foundIds.has(id))
                .map((id: string) => ({
                  affiliate_profile_id: id,
                  user_id: '',
                  affiliate_code: id.slice(0, 8),
                  full_name: 'CTV đã chỉ định',
                  email: '',
                  status: 'ACTIVE',
                }));
              setSelectedAffiliates([...matched, ...placeholders]);
            }
          })
          .catch(() => {});
      } else {
        setSelectedAffiliates([]);
      }
    } else {
      // Default new draft
      setTitle('');
      setCategory('GENERAL');
      setSummary('');
      setContent('');
      setRecipientScope('ALL');
      setStatusFilters(['ACTIVE']);
      setSelectedAffiliates([]);
      setActionUrl('');
    }

    setFieldErrors({});
    setGeneralError(null);
    setIsDirty(false);
    setContentTab('write');
  }, [isOpen, announcement]);

  // Affiliate Autocomplete Search Debounce
  useEffect(() => {
    if (!affiliateSearchQuery.trim()) {
      setAffiliateSearchResults([]);
      return;
    }

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(async () => {
      setIsSearchingAffiliates(true);
      try {
        const res = await api.searchAdminAnnouncementRecipients({
          search: affiliateSearchQuery.trim(),
          limit: 10,
        });
        if (res.success && res.data) {
          setAffiliateSearchResults(res.data);
          setIsComboboxOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingAffiliates(false);
      }
    }, 350);

    return () => {
      if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    };
  }, [affiliateSearchQuery]);

  if (!isOpen) return null;

  // Build clean recipient_filter payload
  const buildRecipientFilter = (): NotificationRecipientFilter => {
    if (recipientScope === 'STATUS_FILTER') {
      return { statuses: statusFilters };
    }
    if (recipientScope === 'SPECIFIC') {
      return { affiliate_ids: selectedAffiliates.map((a) => a.affiliate_profile_id) };
    }
    return {};
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      errors.title = 'Tiêu đề thông báo không được để trống.';
    } else if (cleanTitle.length > 255) {
      errors.title = 'Tiêu đề không được vượt quá 255 ký tự.';
    }

    if (summary && summary.trim().length > 500) {
      errors.summary = 'Tóm tắt không được vượt quá 500 ký tự.';
    }

    const cleanContent = content.trim();
    if (!cleanContent) {
      errors.content = 'Nội dung thông báo (Markdown) không được để trống.';
    }

    if (recipientScope === 'STATUS_FILTER' && statusFilters.length === 0) {
      errors.recipient_scope = 'Vui lòng chọn ít nhất một trạng thái hồ sơ.';
    }

    if (recipientScope === 'SPECIFIC' && selectedAffiliates.length === 0) {
      errors.recipient_scope = 'Vui lòng chọn ít nhất một cộng tác viên người nhận.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Draft Handler
  const handleSaveDraft = async () => {
    if (!validateForm()) return null;

    setIsSaving(true);
    setGeneralError(null);

    const payload = {
      title: title.trim(),
      summary: summary.trim() || null,
      content: content.trim(),
      category,
      recipient_scope: recipientScope,
      recipient_filter: buildRecipientFilter(),
      action_url: actionUrl.trim() || null,
    };

    try {
      if (isEditing && announcement) {
        const res = await api.updateAdminAnnouncement(announcement.id, {
          ...payload,
          expected_updated_at: announcement.updated_at,
        });

        if (res.success && res.data) {
          setIsDirty(false);
          onSuccess(res.data, 'saved');
          return res.data;
        } else {
          if (res.error?.includes('409') || res.code === 'CONFLICT') {
            setGeneralError('Bản nháp đã bị cập nhật bởi người khác. Vui lòng tải lại trang để tránh ghi đè.');
          } else if (res.error?.includes('403') || res.code === 'FORBIDDEN') {
            setGeneralError('Bạn không có quyền chỉnh sửa bản nháp này (chỉ người tạo mới được sửa).');
          } else {
            setGeneralError(res.error || 'Lỗi khi lưu bản nháp.');
          }
          return null;
        }
      } else {
        const res = await api.createAdminAnnouncement(payload);
        if (res.success && res.data) {
          setIsDirty(false);
          onSuccess(res.data, 'saved');
          return res.data;
        } else {
          if (res.error?.includes('403') || res.code === 'FORBIDDEN') {
            setGeneralError('Bạn không có quyền tạo bản nháp (notifications.create).');
          } else {
            setGeneralError(res.error || 'Lỗi khi tạo bản nháp mới.');
          }
          return null;
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Lỗi kết nối máy chủ.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Publish from Modal or Preview
  const handlePublishAnnouncement = async () => {
    // Save draft first
    const saved = await handleSaveDraft();
    if (!saved || !saved.id) return;

    setIsPublishing(true);
    setGeneralError(null);

    try {
      const res = await api.publishAdminAnnouncement(saved.id);
      if (res.success && res.data) {
        setIsPreviewModalOpen(false);
        onSuccess(res.data, 'published');
        onClose();
      } else {
        if (res.error?.includes('403') || res.code === 'FORBIDDEN') {
          setGeneralError('Bạn không có quyền xuất bản bản tin (notifications.publish).');
        } else if (res.error?.includes('409') || res.code === 'CONFLICT') {
          setGeneralError('Bản tin không ở trạng thái hợp lệ để xuất bản.');
        } else {
          setGeneralError(res.error || 'Lỗi khi xuất bản bản tin.');
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Lỗi kết nối máy chủ khi xuất bản.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Safe Close with dirty check
  const handleClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm(
        'Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng form soạn thảo?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  // Specific Affiliate Select/Remove
  const handleAddAffiliate = (item: RecipientOptionItemDTO) => {
    if (!selectedAffiliates.some((a) => a.affiliate_profile_id === item.affiliate_profile_id)) {
      setSelectedAffiliates([...selectedAffiliates, item]);
      setIsDirty(true);
      if (fieldErrors.recipient_scope) {
        setFieldErrors((prev) => ({ ...prev, recipient_scope: '' }));
      }
    }
    setAffiliateSearchQuery('');
    setIsComboboxOpen(false);
  };

  const handleRemoveAffiliate = (affiliateProfileId: string) => {
    setSelectedAffiliates(selectedAffiliates.filter((a) => a.affiliate_profile_id !== affiliateProfileId));
    setIsDirty(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 id="form-modal-title" className="text-lg font-bold text-white">
                  {isEditing ? 'Chỉnh sửa bản nháp thông báo' : 'Soạn thông báo mới cho CTV'}
                </h3>
                <p className="text-xs text-slate-300">
                  {isEditing
                    ? 'Chỉnh sửa nội dung và phạm vi người nhận trước khi xuất bản'
                    : 'Tạo bản nháp, thiết lập nội dung và lựa chọn đối tượng người nhận'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {generalError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <p className="font-semibold">Đã xảy ra lỗi:</p>
                  <p>{generalError}</p>
                </div>
              </div>
            )}

            {/* Row 1: Tiêu đề & Danh mục */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="announcement-title" className="text-sm font-semibold text-slate-800">
                    Tiêu đề thông báo <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-xs ${title.length > 255 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    {title.length}/255
                  </span>
                </div>
                <input
                  id="announcement-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  placeholder="Nhập tiêu đề thông báo (vd: Thông báo lịch đối chiếu thù lao tháng 10/2026...)"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="announcement-category" className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Danh mục <span className="text-rose-500">*</span>
                </label>
                <select
                  id="announcement-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as AnnouncementCategory);
                    setIsDirty(true);
                  }}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all font-medium"
                >
                  <option value="GENERAL">Thông thường (GENERAL)</option>
                  <option value="POLICY">Chính sách (POLICY)</option>
                  <option value="URGENT">Khẩn cấp (URGENT)</option>
                  <option value="EVENT">Sự kiện (EVENT)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Tóm tắt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="announcement-summary" className="text-sm font-semibold text-slate-800">
                  Tóm tắt ngắn gọn <span className="text-slate-400 font-normal">(tùy chọn)</span>
                </label>
                <span className={`text-xs ${summary.length > 500 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                  {summary.length}/500
                </span>
              </div>
              <textarea
                id="announcement-summary"
                rows={2}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setIsDirty(true);
                  if (fieldErrors.summary) setFieldErrors((prev) => ({ ...prev, summary: '' }));
                }}
                placeholder="Tóm tắt ngắn gọn hiển thị tại danh sách thông báo hoặc xem nhanh..."
                className="w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
              {fieldErrors.summary && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.summary}</p>
              )}
            </div>

            {/* Row 3: Nội dung Markdown với Tab Soạn thảo / Xem trước */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-800">
                  Nội dung chi tiết (Định dạng Markdown) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setContentTab('write')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      contentTab === 'write' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Soạn thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentTab('preview')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      contentTab === 'preview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Xem trước Markdown
                  </button>
                </div>
              </div>

              {contentTab === 'write' ? (
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setIsDirty(true);
                    if (fieldErrors.content) setFieldErrors((prev) => ({ ...prev, content: '' }));
                  }}
                  placeholder="Hỗ trợ đầy đủ cú pháp Markdown: # Tiêu đề, **in đậm**, - danh sách, [đường dẫn](url)..."
                  className="w-full px-4 py-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400 leading-relaxed"
                />
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[200px] max-h-[300px] overflow-y-auto">
                  {content.trim() ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(marked.parse(content) as string),
                      }}
                    />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Chưa có nội dung để xem trước.</p>
                  )}
                </div>
              )}
              {fieldErrors.content && (
                <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {fieldErrors.content}
                </p>
              )}
            </div>

            {/* Row 4: PHẠM VI NGƯỜI NHẬN (Recipient Scope) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Phạm vi người nhận thông báo <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Xác định nhóm cộng tác viên sẽ nhận thông báo vào hòm thư cá nhân
                </p>

                {/* Scope selector tabs / cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      recipientScope === 'ALL'
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Toàn bộ CTV</span>
                      <input
                        type="radio"
                        name="recipientScope"
                        value="ALL"
                        checked={recipientScope === 'ALL'}
                        onChange={() => {
                          setRecipientScope('ALL');
                          setIsDirty(true);
                          if (fieldErrors.recipient_scope) setFieldErrors((prev) => ({ ...prev, recipient_scope: '' }));
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 leading-tight">
                      Gửi tới tất cả CTV hợp lệ trong toàn hệ thống.
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      recipientScope === 'STATUS_FILTER'
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Theo trạng thái</span>
                      <input
                        type="radio"
                        name="recipientScope"
                        value="STATUS_FILTER"
                        checked={recipientScope === 'STATUS_FILTER'}
                        onChange={() => {
                          setRecipientScope('STATUS_FILTER');
                          setIsDirty(true);
                          if (fieldErrors.recipient_scope) setFieldErrors((prev) => ({ ...prev, recipient_scope: '' }));
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 leading-tight">
                      Lọc theo trạng thái hồ sơ tuyển sinh của CTV.
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      recipientScope === 'SPECIFIC'
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900">Chỉ định CTV</span>
                      <input
                        type="radio"
                        name="recipientScope"
                        value="SPECIFIC"
                        checked={recipientScope === 'SPECIFIC'}
                        onChange={() => {
                          setRecipientScope('SPECIFIC');
                          setIsDirty(true);
                          if (fieldErrors.recipient_scope) setFieldErrors((prev) => ({ ...prev, recipient_scope: '' }));
                        }}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500 leading-tight">
                      Chọn đích danh từng CTV qua mã hoặc họ tên.
                    </span>
                  </label>
                </div>
              </div>

              {/* Sub-config for STATUS_FILTER */}
              {recipientScope === 'STATUS_FILTER' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chọn các trạng thái hồ sơ nhận tin:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AFFILIATE_STATUSES.map((st) => (
                      <label
                        key={st.value}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          statusFilters.includes(st.value)
                            ? `${st.color} font-semibold`
                            : 'border-slate-200 bg-slate-50/50 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={st.value}
                          checked={statusFilters.includes(st.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStatusFilters([...statusFilters, st.value]);
                            } else {
                              setStatusFilters(statusFilters.filter((x) => x !== st.value));
                            }
                            setIsDirty(true);
                            if (fieldErrors.recipient_scope) setFieldErrors((prev) => ({ ...prev, recipient_scope: '' }));
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs">{st.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-config for SPECIFIC: Combobox & Selected Chips */}
              {recipientScope === 'SPECIFIC' && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Tìm kiếm & Chọn CTV nhận thông báo ({selectedAffiliates.length} đã chọn):
                    </p>
                  </div>

                  {/* Autocomplete Input */}
                  <div className="relative" ref={comboboxRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={affiliateSearchQuery}
                        onChange={(e) => setAffiliateSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (affiliateSearchResults.length > 0) setIsComboboxOpen(true);
                        }}
                        placeholder="Nhập mã CTV, họ tên hoặc email để tìm kiếm..."
                        className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
                      />
                      {isSearchingAffiliates && (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-3" />
                      )}
                    </div>

                    {/* Dropdown Results */}
                    {isComboboxOpen && affiliateSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl z-20 divide-y divide-slate-100">
                        {affiliateSearchResults.map((opt) => {
                          const isAlreadySelected = selectedAffiliates.some(
                            (a) => a.affiliate_profile_id === opt.affiliate_profile_id
                          );
                          return (
                            <button
                              key={opt.affiliate_profile_id}
                              type="button"
                              onClick={() => handleAddAffiliate(opt)}
                              disabled={isAlreadySelected}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                                isAlreadySelected
                                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                  : 'hover:bg-blue-50/70 text-slate-800'
                              }`}
                            >
                              <div>
                                <span className="font-mono font-bold text-blue-600 mr-2">
                                  {opt.affiliate_code}
                                </span>
                                <span className="font-semibold">{opt.full_name}</span>
                                {opt.email && <span className="text-slate-400 ml-1.5">({opt.email})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-600">
                                  {opt.status}
                                </span>
                                {isAlreadySelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Affiliates Chips */}
                  {selectedAffiliates.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pt-1">
                      {selectedAffiliates.map((item) => (
                        <div
                          key={item.affiliate_profile_id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900"
                        >
                          <span className="font-mono font-bold text-blue-700">{item.affiliate_code}</span>
                          <span>-</span>
                          <span className="font-medium truncate max-w-[140px]">{item.full_name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAffiliate(item.affiliate_profile_id)}
                            className="p-0.5 text-blue-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Chưa chọn CTV nào. Vui lòng nhập từ khóa ở ô trên để tìm và chọn.
                    </p>
                  )}
                </div>
              )}

              {fieldErrors.recipient_scope && (
                <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {fieldErrors.recipient_scope}
                </p>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving || isPublishing}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy / Đóng
            </button>

            <div className="flex items-center gap-3">
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => {
                  if (validateForm()) {
                    setIsPreviewModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <Eye className="w-4 h-4" />
                Xem trước & Ước tính
              </button>

              {/* Save Draft Button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving || isPublishing}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-600/30"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Lưu bản nháp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Preview Modal (Shares live form state) */}
      <AnnouncementPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={title}
        category={category}
        summary={summary}
        content={content}
        recipient_scope={recipientScope}
        recipient_filter={buildRecipientFilter()}
        canPublish={canPublish}
        onPublishNow={handlePublishAnnouncement}
        isPublishing={isPublishing}
      />
    </>
  );
};
