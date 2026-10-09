import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Mail,
  Save,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  History,
  Eye,
  Check,
  X,
  Smartphone,
  Monitor,
  Lock,
  Globe,
  Sparkles,
  Info,
} from 'lucide-react';

interface AdminEmailTemplatesViewProps {
  currentUser?: any;
}

export const AdminEmailTemplatesView: React.FC<AdminEmailTemplatesViewProps> = ({ currentUser }) => {
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states cho phiên bản đang soạn thảo
  const [versionCode, setVersionCode] = useState('v2');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Hoàn tất hồ sơ đăng ký');
  const [footerText, setFooterText] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Preview state
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewWithAffiliate, setPreviewWithAffiliate] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Gửi thử mẫu (Test email)
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState(currentUser?.email || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getAdminEmailTemplates();
      if (res.success && res.data && res.data.length > 0) {
        setTemplatesList(res.data);
        // Mặc định chọn template đầu tiên (LEAD_REGISTRATION_CONFIRMATION)
        const first = res.data[0];
        setSelectedTemplate(first.template);
        const activeVer = first.active_published_version || first.versions[0];
        if (activeVer) {
          setSelectedVersion(activeVer);
          setVersionCode(`v${(first.versions.length || 0) + 1}`);
          setSubject(activeVer.subject || '');
          setBodyHtml(activeVer.body_html || '');
          setBodyText(activeVer.body_text || '');
          setButtonLabel(activeVer.button_label || 'Hoàn tất hồ sơ đăng ký');
          setFooterText(activeVer.footer_text || '');
        }
      } else {
        setErrorMsg(res.error || 'Không thể tải danh sách mẫu email từ cơ sở dữ liệu.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi tải danh sách mẫu email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSelectVersion = (ver: any) => {
    setSelectedVersion(ver);
    setVersionCode(ver.version_code);
    setSubject(ver.subject || '');
    setBodyHtml(ver.body_html || '');
    setBodyText(ver.body_text || '');
    setButtonLabel(ver.button_label || 'Hoàn tất hồ sơ đăng ký');
    setFooterText(ver.footer_text || '');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const insertVariable = (variableKey: string) => {
    const token = `{{${variableKey}}}`;
    setBodyHtml((prev) => prev + token);
    setBodyText((prev) => prev + token);
  };

  // Kiểm tra cảnh báo biến bắt buộc & an toàn HTML
  const missingVariables = ['full_name', 'course_title', 'official_registration_url'].filter(
    (v) => !bodyHtml.includes(`{{${v}}}`) && !subject.includes(`{{${v}}}`)
  );

  const hasDangerousContent = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>|javascript:|onerror\s*=/i.test(bodyHtml);

  const handleSaveDraft = async () => {
    if (!selectedTemplate) return;
    if (hasDangerousContent) {
      setErrorMsg('Bị từ chối: Nội dung HTML chứa thẻ script, iframe hoặc mã độc hại.');
      return;
    }

    setSavingDraft(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.saveAdminEmailTemplateDraft(selectedTemplate.template_code, {
        version_code: versionCode.trim() || 'v2',
        subject: subject.trim(),
        body_html: bodyHtml.trim(),
        body_text: bodyText.trim(),
        button_label: buttonLabel.trim(),
        footer_text: footerText.trim(),
        expected_revision: selectedVersion?.revision,
        change_reason: changeReason.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg('Lưu nháp phiên bản mẫu email thành công.');
        setChangeReason('');
        fetchTemplates();
      } else if (res.code === 'CONFIG_VERSION_CONFLICT') {
        setErrorMsg('Xung đột phiên bản: Mẫu email đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại trang.');
      } else {
        setErrorMsg(res.error || 'Lưu nháp thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedVersion?.id) {
      setErrorMsg('Vui lòng lưu bản nháp trước khi xuất bản.');
      return;
    }
    if (hasDangerousContent) {
      setErrorMsg('Bị từ chối: Nội dung chứa mã độc hại không được phép xuất bản.');
      return;
    }

    setPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.publishAdminEmailTemplateVersion(selectedVersion.id, changeReason.trim() || 'Xuất bản phiên bản chính thức');
      if (res.success) {
        setSuccessMsg('Xuất bản phiên bản mẫu email thành công! Các tác vụ email mới tạo sẽ tự động sử dụng phiên bản bất biến này.');
        setChangeReason('');
        fetchTemplates();
      } else {
        setErrorMsg(res.error || 'Xuất bản phiên bản thất bại.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setPublishing(false);
    }
  };

  const handleSendTest = async () => {
    const cleanEmail = testEmailRecipient.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setTestResult({ success: false, message: 'Vui lòng nhập email nhận thử hợp lệ.' });
      return;
    }

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.sendAdminTestEmail({
        recipient_email: cleanEmail,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi khi gửi email thử.' });
    } finally {
      setSendingTest(false);
    }
  };

  // Dữ liệu giả lập cho Xem trước (Preview)
  const previewData = {
    full_name: 'Nguyễn Văn Khách',
    course_title: 'Kỹ thuật Chế biến Món ăn Á - Âu (CBMA-TC-01)',
    registered_at: new Date().toLocaleString('vi-VN'),
    official_registration_url: 'https://tuyensinh.sthc.edu.vn/egov/apply?course=cbma-01',
    affiliate_name: previewWithAffiliate ? 'Trần Đại sứ Tuyển sinh' : null,
    affiliate_code: previewWithAffiliate ? 'STHCCTV10001' : null,
    button_label: buttonLabel || 'Hoàn tất hồ sơ đăng ký',
    support_hotline: '02838442238',
    support_email: 'tuyensinh@sthc.edu.vn',
    unit_name: 'Trường Trung cấp Du lịch & Khách sạn Saigontourist',
  };

  const renderInterpolatedHtml = (htmlStr: string) => {
    let rendered = htmlStr;
    Object.entries(previewData).forEach(([key, val]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, val || '');
    });
    // Xử lý block điều kiện đơn giản cho affiliate
    if (!previewWithAffiliate) {
      rendered = rendered.replace(/\{\{#if affiliate_name\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    } else {
      rendered = rendered.replace(/\{\{#if affiliate_name\}\}/g, '').replace(/\{\{\/if\}\}/g, '');
    }
    return rendered;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-200 text-xs font-bold tracking-wide uppercase backdrop-blur-md border border-white/10">
            <Mail className="w-3.5 h-3.5" />
            <span>Phân hệ Quản lý Mẫu Email (C3.11B)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Trình Soạn Thảo & Xuất Bản Mẫu Email</h1>
          <p className="text-blue-100 text-xs md:text-sm max-w-2xl leading-relaxed opacity-90">
            Quản lý nội dung, tiêu đề và biến động cho mẫu email xác nhận đăng ký tuyển sinh. Đảm bảo tính bất biến của phiên bản xuất bản và liên kết nguyên tử với hàng đợi email.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>Xem trước Email</span>
          </button>
          <button
            type="button"
            onClick={() => setTestModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Gửi Thử Mẫu</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi / thành công */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs">Đang tải danh sách mẫu email...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái: Danh sách mẫu & Phiên bản (4 col) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-900" />
                <span>Danh sách Mẫu Nghiệp vụ</span>
              </h3>

              <div className="space-y-2">
                {templatesList.map((item) => (
                  <div
                    key={item.template.id}
                    className="p-3.5 rounded-xl border border-blue-900/30 bg-blue-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                        {item.template.template_code}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Đang áp dụng
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs">{item.template.name}</div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{item.template.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Danh sách phiên bản */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-blue-900" />
                <span>Lịch sử Phiên bản (Versions)</span>
              </h3>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {templatesList[0]?.versions?.map((ver: any) => {
                  const isSelected = selectedVersion?.id === ver.id;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => handleSelectVersion(ver)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'border-blue-900 bg-blue-900/5 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">{ver.version_code} (Rev {ver.revision})</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          ver.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ver.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ver.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">{ver.subject}</div>
                      <div className="text-[10px] text-slate-400">
                        Cập nhật: {new Date(ver.updated_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cột phải: Trình soạn thảo trực quan (8 col) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Trình Soạn Thảo Mẫu Email</h3>
                  <p className="text-xs text-slate-500">
                    Chỉnh sửa tiêu đề, nội dung HTML, nhãn nút và thông tin chân trang.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                    Đang sửa: {versionCode} ({selectedVersion?.status || 'DRAFT'})
                  </span>
                </div>
              </div>

              {/* Danh sách biến chèn nhanh */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                  <span>Danh sách Biến nghiệp vụ (Click để chèn vào cuối nội dung)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'full_name', label: 'Họ tên khách' },
                    { key: 'course_title', label: 'Tên khóa học' },
                    { key: 'registered_at', label: 'Thời điểm đăng ký' },
                    { key: 'official_registration_url', label: 'Link nút EGOV' },
                    { key: 'affiliate_name', label: 'Tên CTV' },
                    { key: 'affiliate_code', label: 'Mã CTV' },
                    { key: 'support_hotline', label: 'Hotline hỗ trợ' },
                    { key: 'support_email', label: 'Email hỗ trợ' },
                    { key: 'unit_name', label: 'Tên trường' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-[11px] font-mono font-bold shadow-2xs transition-colors"
                      title={`Chèn {{${v.key}}}`}
                    >
                      {`{{${v.key}}}`} <span className="font-sans text-[10px] text-slate-500">({v.label})</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  * Lưu ý: Link nút EGOV luôn lấy tự động từ <code className="font-mono text-blue-900">official_registration_url</code> của khóa học trong CSDL, không thể thay thế bằng URL cố định ngoài hệ thống.
                </p>
              </div>

              {/* Cảnh báo thiếu biến / lỗi an toàn */}
              {missingVariables.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span><strong>Cảnh báo:</strong> Mẫu email đang thiếu các biến bắt buộc: <code className="font-bold">{missingVariables.join(', ')}</code>.</span>
                </div>
              )}
              {hasDangerousContent && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span><strong>Nguy hiểm:</strong> Nội dung chứa đoạn mã HTML không hợp lệ hoặc script độc hại!</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Mã phiên bản (Version Code)</label>
                  <input
                    type="text"
                    value={versionCode}
                    onChange={(e) => setVersionCode(e.target.value)}
                    placeholder="v2"
                    className="w-full sm:w-48 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Tiêu đề email (Subject) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Xác nhận tiếp nhận hồ sơ đăng ký khóa học - {{course_title}}"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Nhãn nút hành động (“Hoàn tất hồ sơ đăng ký”) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    placeholder="Hoàn tất hồ sơ đăng ký"
                    className="w-full sm:w-72 px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Nội dung HTML trực quan (Body HTML) <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={10}
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-900/20 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Nội dung Plain Text (Dự phòng cho client không hỗ trợ HTML)</label>
                  <textarea
                    rows={4}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1">Lý do thay đổi / Ghi chú phiên bản</label>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Ví dụ: Cập nhật bố cục email và bổ sung thông tin hỗ trợ"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              </div>

              {/* Nút hành động Lưu nháp & Xuất bản */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {selectedVersion?.status === 'PUBLISHED' ? (
                    <span className="text-amber-700 font-medium">Phiên bản này đang PUBLISHED. Lưu thay đổi sẽ tạo bản nháp mới.</span>
                  ) : (
                    <span>Đang chỉnh sửa bản nháp. Có thể xem trước trước khi xuất bản.</span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={savingDraft || hasDangerousContent}
                    onClick={handleSaveDraft}
                    className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDraft ? 'Đang lưu nháp...' : 'Lưu Nháp'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={publishing || hasDangerousContent}
                    onClick={handlePublish}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{publishing ? 'Đang xuất bản...' : 'Xuất Bản Chính Thức'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem trước Email (Desktop / Mobile + Có/Không CTV) */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className={`relative w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            previewMode === 'mobile' ? 'max-w-md h-[85vh]' : 'max-w-3xl h-[85vh]'
          }`}>
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">Xem Trước Mẫu Email (Live Preview)</span>
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${previewMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Monitor className="w-3.5 h-3.5 inline mr-1" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${previewMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5 inline mr-1" /> Mobile
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previewWithAffiliate}
                    onChange={(e) => setPreviewWithAffiliate(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Giả lập có CTV giới thiệu</span>
                </label>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-slate-100 p-4 border-b border-slate-200 shrink-0 text-xs space-y-1 font-mono">
              <div><strong>Tiêu đề (Subject):</strong> {renderInterpolatedHtml(subject)}</div>
            </div>

            <div className="flex-1 bg-slate-200 p-6 overflow-y-auto flex items-start justify-center">
              <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 w-full ${
                previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
              }`}>
                <div
                  className="p-6 text-slate-800 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderInterpolatedHtml(bodyHtml) }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gửi thử mẫu */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">GỬI THƯ THỬ NGHIỆM MẪU</h3>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                Gửi bản xem trước mẫu email này tới hộp thư của Quản trị viên để kiểm tra trực quan trên thiết bị thực tế.
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Địa chỉ email nhận thử</label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="admin@sthc.edu.vn"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-xl space-y-1 ${
                  testResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}>
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.message_id && <div className="font-mono text-[11px]">Message ID: {testResult.message_id}</div>}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={sendingTest}
                  onClick={handleSendTest}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {sendingTest ? 'Đang gửi...' : 'Gửi Thư Thử'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
