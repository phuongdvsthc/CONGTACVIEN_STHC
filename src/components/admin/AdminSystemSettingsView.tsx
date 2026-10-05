import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../../services/api';
import { useSystemBranding } from '../../contexts/SystemBrandingContext';
import { SystemSettings } from '../../types';
import {
  validatePublicBaseUrl,
  validateSupportEmail,
  validateSupportPhone,
  validateTimezone,
  formatPhoneNumberVi,
} from '../../utils/operationValidation';
import { formatDateTimeVi } from '../../utils/dateFormatter';
import {
  Settings,
  Upload,
  Check,
  AlertTriangle,
  Globe,
  Building2,
  Mail,
  Phone,
  Clock,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
  FileText,
  History,
  Database,
  Lock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Eye,
  X,
} from 'lucide-react';

interface AdminSystemSettingsViewProps {
  currentUser?: any;
  onNavigateToOverview?: () => void;
}

export const AdminSystemSettingsView: React.FC<AdminSystemSettingsViewProps> = ({
  currentUser,
  onNavigateToOverview,
}) => {
  const { branding, updateBrandingImmediately, syncTabIdentity } = useSystemBranding();

  // Dữ liệu baseline từ server (đã lưu vào Supabase)
  const [serverSettings, setServerSettings] = useState<SystemSettings | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // NHÓM 1: NHẬN DIỆN BACKEND FORM STATE
  // ---------------------------------------------------------------------------
  const [systemName, setSystemName] = useState('');
  const [systemShortName, setSystemShortName] = useState('');
  const [unitName, setUnitName] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [faviconPath, setFaviconPath] = useState<string | null>(null);

  // Previews
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [faviconPreviewUrl, setFaviconPreviewUrl] = useState<string | null>(null);
  const createdObjectUrlsRef = useRef<string[]>([]);

  // Uploading state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [faviconUploadError, setFaviconUploadError] = useState<string | null>(null);

  // Saving state branding
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSuccessMsg, setBrandingSuccessMsg] = useState<string | null>(null);
  const [brandingErrorMsg, setBrandingErrorMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // NHÓM 2: THÔNG TIN VẬN HÀNH FORM STATE (A7.5)
  // ---------------------------------------------------------------------------
  const [publicBaseUrl, setPublicBaseUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

  // Saving state operation
  const [savingOperation, setSavingOperation] = useState(false);
  const [operationSuccessMsg, setOperationSuccessMsg] = useState<string | null>(null);
  const [operationErrorMsg, setOperationErrorMsg] = useState<string | null>(null);

  // Xung đột phiên bản toàn cục (Revision conflict)
  const [conflictError, setConflictError] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // A7.6: QUY CHẾ & TIẾP NHẬN ĐĂNG KÝ STATE
  // ---------------------------------------------------------------------------
  const [allowAffiliateRegistration, setAllowAffiliateRegistration] = useState(false);
  const [registrationClosedMessage, setRegistrationClosedMessage] = useState('');
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [registrationSuccessMsg, setRegistrationSuccessMsg] = useState<string | null>(null);
  const [registrationErrorMsg, setRegistrationErrorMsg] = useState<string | null>(null);

  // A7.7: MÃ CỘNG TÁC VIÊN STATE
  const [affiliateCodePrefix, setAffiliateCodePrefix] = useState('STHCCTV');
  const [affiliateCodeMinDigits, setAffiliateCodeMinDigits] = useState<number>(6);
  const [codeGeneratorStats, setCodeGeneratorStats] = useState<any>(null);
  const [savingAffiliateCode, setSavingAffiliateCode] = useState(false);
  const [affiliateCodeSuccessMsg, setAffiliateCodeSuccessMsg] = useState<string | null>(null);
  const [affiliateCodeErrorMsg, setAffiliateCodeErrorMsg] = useState<string | null>(null);

  const [regulationsList, setRegulationsList] = useState<any[]>([]);
  const [loadingRegulations, setLoadingRegulations] = useState(false);
  const [regulationsError, setRegulationsError] = useState<string | null>(null);
  const [regulationsPage, setRegulationsPage] = useState(1);
  const [regulationsTotalPages, setRegulationsTotalPages] = useState(1);
  const [regulationsStatusFilter, setRegulationsStatusFilter] = useState('');

  const [createDraftModalOpen, setCreateDraftModalOpen] = useState(false);
  const [draftVersionCode, setDraftVersionCode] = useState('');
  const [draftTitle, setDraftTitle] = useState('Quy chế Hoạt động Đại sứ Tuyển sinh STHC 2026');
  const [draftEffectiveDate, setDraftEffectiveDate] = useState(new Date().toISOString().slice(0, 16));
  const [draftStoragePath, setDraftStoragePath] = useState<string | null>(null);
  const [draftFileSize, setDraftFileSize] = useState(0);
  const [draftChecksum, setDraftChecksum] = useState<string | null>(null);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const [uploadingDraftPdf, setUploadingDraftPdf] = useState(false);
  const [uploadDraftError, setUploadDraftError] = useState<string | null>(null);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftModalError, setDraftModalError] = useState<string | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedRegToApply, setSelectedRegToApply] = useState<any | null>(null);
  const [applyReason, setApplyReason] = useState('');
  const [applyingReg, setApplyingReg] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState('');
  const [loadingPdfBlob, setLoadingPdfBlob] = useState(false);

  const loadRegulations = async (page = 1, status = '') => {
    setLoadingRegulations(true);
    setRegulationsError(null);
    try {
      const res = await api.getAdminSystemRegulations({ page, limit: 10, status });
      if (res.success && res.data) {
        setRegulationsList(res.data);
        if (res.pagination) {
          setRegulationsPage(res.pagination.page);
          setRegulationsTotalPages(res.pagination.totalPages);
        }
      } else {
        setRegulationsError(res.error || 'Không thể tải danh sách quy chế.');
      }
    } catch (err: any) {
      setRegulationsError(err.message || 'Lỗi khi tải danh sách quy chế.');
    } finally {
      setLoadingRegulations(false);
    }
  };

  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSettings) return;
    setSavingRegistration(true);
    setRegistrationSuccessMsg(null);
    setRegistrationErrorMsg(null);

    try {
      const res = await api.updateAdminSystemSettingsGroup('registration', {
        expected_revision: serverSettings.revision,
        data: {
          allow_affiliate_registration: allowAffiliateRegistration,
          registration_closed_message: registrationClosedMessage.trim() || null,
        },
        reason: 'Cập nhật trạng thái tiếp nhận đăng ký CTV',
      });

      if (res.success) {
        setRegistrationSuccessMsg('Cập nhật trạng thái tiếp nhận đăng ký CTV thành công.');
        if (res.new_revision && serverSettings) {
          setServerSettings({ ...serverSettings, revision: res.new_revision, allow_affiliate_registration: allowAffiliateRegistration, registration_closed_message: registrationClosedMessage });
        }
        fetchSettings();
      } else if (res.code === 'CONFIG_VERSION_CONFLICT') {
        setConflictError(true);
        setRegistrationErrorMsg('Cấu hình đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại trang.');
      } else {
        setRegistrationErrorMsg(res.error || 'Lỗi khi lưu cấu hình.');
      }
    } catch (err: any) {
      setRegistrationErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleSaveAffiliateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSettings) return;
    setSavingAffiliateCode(true);
    setAffiliateCodeSuccessMsg(null);
    setAffiliateCodeErrorMsg(null);

    const cleanPrefix = affiliateCodePrefix.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(cleanPrefix)) {
      setAffiliateCodeErrorMsg('Tiền tố mã CTV chỉ gồm chữ in hoa A-Z và số 0-9, độ dài từ 3 đến 20 ký tự.');
      setSavingAffiliateCode(false);
      return;
    }

    const minDigitsNum = Number(affiliateCodeMinDigits);
    if (isNaN(minDigitsNum) || minDigitsNum < 4 || minDigitsNum > 12) {
      setAffiliateCodeErrorMsg('Độ dài tối thiểu của mã CTV phải là số nguyên từ 4 đến 12.');
      setSavingAffiliateCode(false);
      return;
    }

    try {
      const res = await api.updateAdminSystemSettingsGroup('affiliate_code', {
        expected_revision: serverSettings.revision,
        data: {
          affiliate_code_prefix: cleanPrefix,
          affiliate_code_min_digits: minDigitsNum,
        },
        reason: 'Cập nhật cấu hình bộ cấp mã CTV (A7.7)',
      });

      if (res.success) {
        setAffiliateCodeSuccessMsg('Cập nhật cấu hình bộ cấp mã CTV thành công.');
        if (res.new_revision && serverSettings) {
          setServerSettings({ ...serverSettings, revision: res.new_revision, affiliate_code_prefix: cleanPrefix, affiliate_code_min_digits: minDigitsNum });
        }
        fetchSettings();
      } else if (res.code === 'CONFIG_VERSION_CONFLICT') {
        setConflictError(true);
        setAffiliateCodeErrorMsg('Cấu hình đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại trang.');
      } else {
        setAffiliateCodeErrorMsg(res.error || 'Lỗi khi lưu cấu hình bộ cấp mã.');
      }
    } catch (err: any) {
      setAffiliateCodeErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSavingAffiliateCode(false);
    }
  };

  const handleUploadDraftPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadDraftError(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadDraftError('Chỉ chấp nhận tệp định dạng PDF chuẩn.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadDraftError(`Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn 10 MB.`);
      e.target.value = '';
      return;
    }

    setUploadingDraftPdf(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await api.uploadAdminSystemAsset({
        type: 'regulation',
        file_base64: base64Data,
        file_name: file.name,
        mime_type: 'application/pdf',
      });

      if (res.success && res.asset_path) {
        setDraftStoragePath(res.asset_path);
        setDraftFileSize(res.file_size || file.size);
        setDraftChecksum(res.checksum_sha256 || null);
        setDraftFileName(file.name);
      } else {
        setUploadDraftError(res.error || 'Tải tệp PDF lên thất bại.');
      }
    } catch (err: any) {
      setUploadDraftError(err.message || 'Lỗi khi tải tệp lên.');
    } finally {
      setUploadingDraftPdf(false);
      e.target.value = '';
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftVersionCode.trim() || !draftTitle.trim() || !draftStoragePath) {
      setDraftModalError('Vui lòng nhập mã phiên bản, tiêu đề và tải lên tệp PDF quy chế.');
      return;
    }

    setCreatingDraft(true);
    setDraftModalError(null);
    try {
      const res = await api.createAdminSystemRegulation({
        version_code: draftVersionCode.trim().toUpperCase(),
        title: draftTitle.trim(),
        pdf_storage_path: draftStoragePath,
        file_size_bytes: draftFileSize,
        checksum_sha256: draftChecksum || undefined,
        effective_date: new Date(draftEffectiveDate).toISOString(),
      });

      if (res.success) {
        setCreateDraftModalOpen(false);
        setDraftVersionCode('');
        setDraftTitle('Quy chế Hoạt động Đại sứ Tuyển sinh STHC 2026');
        setDraftStoragePath(null);
        setDraftFileSize(0);
        setDraftChecksum(null);
        setDraftFileName(null);
        loadRegulations(1, regulationsStatusFilter);
        fetchSettings();
      } else {
        setDraftModalError(res.error || 'Không thể tạo bản nháp quy chế.');
      }
    } catch (err: any) {
      setDraftModalError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleApplyRegulation = async () => {
    if (!selectedRegToApply) return;
    setApplyingReg(true);
    setApplyError(null);
    try {
      const res = await api.applyAdminSystemRegulation(selectedRegToApply.id, {
        reason: applyReason.trim() || undefined,
      });

      if (res.success) {
        setApplyModalOpen(false);
        setSelectedRegToApply(null);
        setApplyReason('');
        loadRegulations(regulationsPage, regulationsStatusFilter);
        fetchSettings();
      } else {
        setApplyError(res.error || 'Không thể kích hoạt áp dụng quy chế.');
      }
    } catch (err: any) {
      setApplyError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setApplyingReg(false);
    }
  };

  const handleViewPdf = async (reg: any) => {
    setLoadingPdfBlob(true);
    setPreviewPdfTitle(`Quy chế: ${reg.version_code} - ${reg.title}`);
    try {
      const blob = await api.getAdminRegulationPdfBlob(reg.id);
      const url = URL.createObjectURL(blob);
      if (previewPdfBlobUrl) {
        URL.revokeObjectURL(previewPdfBlobUrl);
      }
      setPreviewPdfBlobUrl(url);
      setPdfPreviewModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Không thể đọc tệp PDF quy chế.');
    } finally {
      setLoadingPdfBlob(false);
    }
  };

  // Load server settings từ Supabase API
  const fetchSettings = async () => {
    setInitialLoading(true);
    setLoadError(null);
    setConflictError(false);
    try {
      const res = await api.getAdminSystemSettings();
      if (res.success && res.data?.settings) {
        const s = res.data.settings;
        setServerSettings(s);

        // Nhận diện backend
        setSystemName(s.system_name || '');
        setSystemShortName(s.system_short_name || '');
        setUnitName(s.unit_name || '');
        setLogoPath(s.logo_backend_url || null);
        setFaviconPath(s.favicon_url || null);
        setLogoPreviewUrl(s.logo_backend_display_url || s.logo_backend_url || null);
        setFaviconPreviewUrl(s.favicon_display_url || s.favicon_url || null);

        // Thông tin vận hành
        setPublicBaseUrl(s.public_base_url || '');
        setSupportEmail(s.support_email || '');
        setSupportPhone(s.support_phone || '');
        setTimezone(s.timezone || 'Asia/Ho_Chi_Minh');

        // A7.6: Tiếp nhận đăng ký
        setAllowAffiliateRegistration(s.allow_affiliate_registration === true);
        setRegistrationClosedMessage(s.registration_closed_message || '');

        // A7.7: Cấu hình mã CTV & Thống kê
        setAffiliateCodePrefix(s.affiliate_code_prefix || 'STHCCTV');
        setAffiliateCodeMinDigits(s.affiliate_code_min_digits || 6);
        if (res.data?.code_generator_stats) {
          setCodeGeneratorStats(res.data.code_generator_stats);
        }
      } else {
        setLoadError(res.error || 'Không thể tải dữ liệu cấu hình hệ thống từ cơ sở dữ liệu Supabase.');
      }
    } catch (err: any) {
      setLoadError(err.message || 'Lỗi kết nối khi tải cấu hình hệ thống.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    loadRegulations(1, '');
    return () => {
      createdObjectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      if (previewPdfBlobUrl) {
        try {
          URL.revokeObjectURL(previewPdfBlobUrl);
        } catch {}
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // DIRTY & VALIDATION CHO NHÓM 1: NHẬN DIỆN BACKEND
  // ---------------------------------------------------------------------------
  const isBrandingDirty = useMemo(() => {
    if (!serverSettings) return false;
    return (
      systemName !== (serverSettings.system_name || '') ||
      systemShortName !== (serverSettings.system_short_name || '') ||
      unitName !== (serverSettings.unit_name || '') ||
      logoPath !== (serverSettings.logo_backend_url || null) ||
      faviconPath !== (serverSettings.favicon_url || null)
    );
  }, [serverSettings, systemName, systemShortName, unitName, logoPath, faviconPath]);

  const brandingValidationError = useMemo(() => {
    if (systemName.trim().length < 3) {
      return 'Tên hệ thống phải có tối thiểu 3 ký tự.';
    }
    if (systemShortName.trim().length < 2 || systemShortName.trim().length > 50) {
      return 'Tên viết tắt phải có độ dài từ 2 đến 50 ký tự.';
    }
    if (unitName.trim().length < 3) {
      return 'Tên đơn vị chủ quản phải có tối thiểu 3 ký tự.';
    }
    return null;
  }, [systemName, systemShortName, unitName]);

  // ---------------------------------------------------------------------------
  // DIRTY & VALIDATION CHO NHÓM 2: THÔNG TIN VẬN HÀNH (A7.5)
  // ---------------------------------------------------------------------------
  const isOperationDirty = useMemo(() => {
    if (!serverSettings) return false;
    return (
      publicBaseUrl !== (serverSettings.public_base_url || '') ||
      supportEmail !== (serverSettings.support_email || '') ||
      supportPhone !== (serverSettings.support_phone || '') ||
      timezone !== (serverSettings.timezone || 'Asia/Ho_Chi_Minh')
    );
  }, [serverSettings, publicBaseUrl, supportEmail, supportPhone, timezone]);

  const urlValidation = useMemo(() => validatePublicBaseUrl(publicBaseUrl), [publicBaseUrl]);
  const emailValidation = useMemo(() => validateSupportEmail(supportEmail), [supportEmail]);
  const phoneValidation = useMemo(() => validateSupportPhone(supportPhone), [supportPhone]);
  const tzValidation = useMemo(() => validateTimezone(timezone), [timezone]);

  const operationValidationError = useMemo(() => {
    if (!urlValidation.valid) return urlValidation.error;
    if (!emailValidation.valid) return emailValidation.error;
    if (!phoneValidation.valid) return phoneValidation.error;
    if (!tzValidation.valid) return tzValidation.error;
    return null;
  }, [urlValidation, emailValidation, phoneValidation, tzValidation]);

  // ---------------------------------------------------------------------------
  // XỬ LÝ TẢI TỆP LOGO & FAVICON
  // ---------------------------------------------------------------------------
  const handleSelectLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploadError(null);
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setLogoUploadError('Logo không đúng định dạng. Chỉ chấp nhận tệp PNG, JPG hoặc WebP.');
      e.target.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setLogoUploadError(`Dung lượng tệp (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn 2 MB cho phép.`);
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    createdObjectUrlsRef.current.push(localUrl);
    setLogoPreviewUrl(localUrl);

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const uploadRes = await api.uploadAdminSystemAsset({
        type: 'logo',
        file_base64: base64Data,
        file_name: file.name,
        mime_type: file.type,
      });

      if (uploadRes.success && uploadRes.asset_path) {
        setLogoPath(uploadRes.asset_path);
      } else {
        setLogoUploadError(uploadRes.error || 'Tải ảnh logo lên máy chủ thất bại.');
        setLogoPreviewUrl(serverSettings?.logo_backend_display_url || serverSettings?.logo_backend_url || null);
        setLogoPath(serverSettings?.logo_backend_url || null);
      }
    } catch (err: any) {
      setLogoUploadError(err.message || 'Lỗi khi tải ảnh lên.');
      setLogoPreviewUrl(serverSettings?.logo_backend_display_url || serverSettings?.logo_backend_url || null);
      setLogoPath(serverSettings?.logo_backend_url || null);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSelectFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaviconUploadError(null);
    const nameLower = file.name.toLowerCase();
    const isIco = nameLower.endsWith('.ico') || file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon';
    const isPng = nameLower.endsWith('.png') || file.type === 'image/png';

    if (!isIco && !isPng) {
      setFaviconUploadError('Favicon không đúng định dạng. Chỉ chấp nhận tệp ICO hoặc PNG.');
      e.target.value = '';
      return;
    }

    const maxSize = 512 * 1024;
    if (file.size > maxSize) {
      setFaviconUploadError(`Dung lượng tệp (${(file.size / 1024).toFixed(1)} KB) vượt quá giới hạn 512 KB.`);
      e.target.value = '';
      return;
    }

    const localUrl = URL.createObjectURL(file);
    createdObjectUrlsRef.current.push(localUrl);
    setFaviconPreviewUrl(localUrl);

    setUploadingFavicon(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const uploadRes = await api.uploadAdminSystemAsset({
        type: 'favicon',
        file_base64: base64Data,
        file_name: file.name,
        mime_type: file.type || (isIco ? 'image/x-icon' : 'image/png'),
      });

      if (uploadRes.success && uploadRes.asset_path) {
        setFaviconPath(uploadRes.asset_path);
      } else {
        setFaviconUploadError(uploadRes.error || 'Tải favicon lên máy chủ thất bại.');
        setFaviconPreviewUrl(serverSettings?.favicon_display_url || serverSettings?.favicon_url || null);
        setFaviconPath(serverSettings?.favicon_url || null);
      }
    } catch (err: any) {
      setFaviconUploadError(err.message || 'Lỗi khi tải favicon lên.');
      setFaviconPreviewUrl(serverSettings?.favicon_display_url || serverSettings?.favicon_url || null);
      setFaviconPath(serverSettings?.favicon_url || null);
    } finally {
      setUploadingFavicon(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoPath(null);
    setLogoPreviewUrl(null);
    setLogoUploadError(null);
  };

  const handleRemoveFavicon = () => {
    setFaviconPath(null);
    setFaviconPreviewUrl(null);
    setFaviconUploadError(null);
  };

  // ---------------------------------------------------------------------------
  // HỦY THAY ĐỔI THEO TỪNG NHÓM
  // ---------------------------------------------------------------------------
  const handleCancelBranding = () => {
    if (!serverSettings) return;
    setSystemName(serverSettings.system_name || '');
    setSystemShortName(serverSettings.system_short_name || '');
    setUnitName(serverSettings.unit_name || '');
    setLogoPath(serverSettings.logo_backend_url || null);
    setFaviconPath(serverSettings.favicon_url || null);
    setLogoPreviewUrl(serverSettings.logo_backend_display_url || serverSettings.logo_backend_url || null);
    setFaviconPreviewUrl(serverSettings.favicon_display_url || serverSettings.favicon_url || null);
    setLogoUploadError(null);
    setFaviconUploadError(null);
    setBrandingSuccessMsg(null);
    setBrandingErrorMsg(null);

    createdObjectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    createdObjectUrlsRef.current = [];
  };

  const handleCancelOperation = () => {
    if (!serverSettings) return;
    setPublicBaseUrl(serverSettings.public_base_url || '');
    setSupportEmail(serverSettings.support_email || '');
    setSupportPhone(serverSettings.support_phone || '');
    setTimezone(serverSettings.timezone || 'Asia/Ho_Chi_Minh');
    setOperationSuccessMsg(null);
    setOperationErrorMsg(null);
  };

  // ---------------------------------------------------------------------------
  // LƯU CẤU HÌNH NHÓM 1: NHẬN DIỆN BACKEND
  // ---------------------------------------------------------------------------
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSettings || brandingValidationError || !isBrandingDirty || savingBranding || savingOperation || uploadingLogo || uploadingFavicon) return;

    setSavingBranding(true);
    setBrandingSuccessMsg(null);
    setBrandingErrorMsg(null);
    setConflictError(false);

    try {
      const payloadData: Record<string, any> = {
        system_name: systemName.trim(),
        system_short_name: systemShortName.trim(),
        unit_name: unitName.trim(),
        logo_backend_url: logoPath,
        favicon_url: faviconPath,
      };

      const res = await api.updateAdminSystemSettingsGroup('branding', {
        expected_revision: serverSettings.revision,
        data: payloadData,
        reason: 'Cập nhật nhận diện backend qua giao diện Quản trị',
      });

      if (res.success && res.data) {
        const updated = res.data;
        // Cập nhật serverSettings và revision mới cho toàn bộ màn hình (bảo toàn draft của nhóm vận hành)
        setServerSettings(updated);
        setBrandingSuccessMsg('Lưu cấu hình nhận diện backend thành công.');
        setConflictError(false);

        // Cập nhật ngay lập tức vào context để toàn bộ layout phản ánh tức thì
        updateBrandingImmediately({
          system_name: updated.system_name,
          system_short_name: updated.system_short_name,
          unit_name: updated.unit_name,
          logo_backend_url: updated.logo_backend_display_url || (updated.logo_backend_url ? `/api/v1/public/branding/asset?path=${encodeURIComponent(updated.logo_backend_url)}&v=${updated.revision}` : null),
          favicon_url: updated.favicon_display_url || (updated.favicon_url ? `/api/v1/public/branding/asset?path=${encodeURIComponent(updated.favicon_url)}&v=${updated.revision}` : null),
          revision: updated.revision,
        });

        syncTabIdentity('Quản trị hệ thống');
        setTimeout(() => setBrandingSuccessMsg(null), 4000);
      } else if (res.code === 'CONFIG_VERSION_CONFLICT') {
        setConflictError(true);
        setBrandingErrorMsg('Cấu hình đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại dữ liệu trước khi lưu.');
      } else {
        setBrandingErrorMsg(res.error || 'Lỗi khi lưu cấu hình nhận diện backend.');
      }
    } catch (err: any) {
      setBrandingErrorMsg(err.message || 'Lỗi kết nối khi gửi yêu cầu lưu.');
    } finally {
      setSavingBranding(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LƯU CẤU HÌNH NHÓM 2: THÔNG TIN VẬN HÀNH (A7.5)
  // ---------------------------------------------------------------------------
  const handleSaveOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSettings || operationValidationError || !isOperationDirty || savingOperation || savingBranding) return;

    setSavingOperation(true);
    setOperationSuccessMsg(null);
    setOperationErrorMsg(null);
    setConflictError(false);

    try {
      const payloadData: Record<string, any> = {
        public_base_url: urlValidation.normalized,
        support_email: emailValidation.normalized,
        support_phone: phoneValidation.normalized,
        timezone: tzValidation.normalized,
      };

      const res = await api.updateAdminSystemSettingsGroup('operation', {
        expected_revision: serverSettings.revision,
        data: payloadData,
        reason: 'Cập nhật thông tin vận hành qua giao diện Quản trị',
      });

      if (res.success && res.data) {
        const updated = res.data;
        // Cập nhật serverSettings và revision mới cho toàn bộ màn hình (bảo toàn draft của nhóm nhận diện)
        setServerSettings(updated);
        setPublicBaseUrl(updated.public_base_url || '');
        setSupportEmail(updated.support_email || '');
        setSupportPhone(updated.support_phone || '');
        setTimezone(updated.timezone || 'Asia/Ho_Chi_Minh');

        setOperationSuccessMsg('Lưu cấu hình thông tin vận hành thành công.');
        setConflictError(false);

        // Đồng bộ cấu hình vào context dùng chung cho toàn bộ ứng dụng
        updateBrandingImmediately({
          public_base_url: updated.public_base_url,
          support_email: updated.support_email,
          support_phone: updated.support_phone,
          timezone: updated.timezone,
          revision: updated.revision,
        });

        setTimeout(() => setOperationSuccessMsg(null), 4000);
      } else if (res.code === 'CONFIG_VERSION_CONFLICT') {
        setConflictError(true);
        setOperationErrorMsg('Cấu hình đã được thay đổi bởi quản trị viên khác. Vui lòng tải lại dữ liệu trước khi lưu.');
      } else {
        setOperationErrorMsg(res.error || 'Lỗi khi lưu thông tin vận hành.');
      }
    } catch (err: any) {
      setOperationErrorMsg(err.message || 'Lỗi kết nối khi gửi yêu cầu lưu.');
    } finally {
      setSavingOperation(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-slate-800">Đang tải cấu hình Quản trị hệ thống...</h3>
          <p className="text-xs text-slate-500 mt-1">Đang đồng bộ trực tiếp từ cơ sở dữ liệu Supabase</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Không thể tải cấu hình Quản trị hệ thống</h3>
            <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{loadError}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={fetchSettings}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
            {onNavigateToOverview && (
              <button
                onClick={onNavigateToOverview}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Về trang tổng quan
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 animate-fade-in text-slate-900">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
              <Settings className="w-4 h-4" />
              <span>Phân hệ Quản trị</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">Cấu hình hệ thống</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản trị hệ thống
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý định danh nhận diện backend, thông số vận hành và các tiêu chuẩn kiểm soát dữ liệu
            </p>
          </div>

          {serverSettings && (
            <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 text-right">
              <div className="text-xs text-slate-600">
                Phiên bản cấu hình: <span className="font-mono font-bold text-blue-600">#{serverSettings.revision}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Cập nhật lần cuối: {formatDateTimeVi(serverSettings.updated_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VERSION CONFLICT ALERT BANNER */}
      {conflictError && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Xung đột phiên bản dữ liệu (Version Conflict)</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Cấu hình đã được thay đổi bởi một quản trị viên khác trên máy chủ. Nội dung bạn đang chỉnh sửa vẫn được giữ nguyên để đối chiếu.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const hasDraft = isBrandingDirty || isOperationDirty;
              if (
                !hasDraft ||
                window.confirm('Tải lại cấu hình mới nhất từ máy chủ? Các thay đổi chưa lưu trên form sẽ bị hủy bỏ.')
              ) {
                fetchSettings();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải lại dữ liệu mới nhất</span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* KHỐI 1: NHẬN DIỆN BACKEND */}
      {/* ===================================================================== */}
      <form onSubmit={handleSaveBranding} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Nhận diện backend</h2>
                <p className="text-[11px] text-slate-500">Logo, tên đơn vị, tên hệ thống hiển thị đồng bộ trên Admin, Staff và Cổng CTV</p>
              </div>
            </div>
            {isBrandingDirty && (
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                Có thay đổi chưa lưu
              </span>
            )}
          </div>

          {/* Feedback messages riêng cho Nhận diện */}
          {brandingSuccessMsg && (
            <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{brandingSuccessMsg}</span>
            </div>
          )}

          {brandingErrorMsg && !conflictError && (
            <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{brandingErrorMsg}</span>
            </div>
          )}

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Fields Column */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên hệ thống <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="Ví dụ: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">Độ dài từ 3 đến 150 ký tự</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên viết tắt hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={systemShortName}
                    onChange={(e) => setSystemShortName(e.target.value)}
                    placeholder="Ví dụ: STHC_CTV"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Hiển thị ở header thu gọn (2 - 50 ký tự)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đơn vị đào tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Trường Trung cấp Du lịch & Khách sạn Saigontourist"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Tên đơn vị chủ quản (tối thiểu 3 ký tự)</p>
                </div>
              </div>

              {/* Upload Logo Backend */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo Backend (Admin & Cổng CTV)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{uploadingLogo ? 'Đang tải ảnh...' : 'Chọn tệp ảnh logo'}</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={handleSelectLogo}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {logoPath && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium py-1"
                    >
                      Xóa logo tùy chỉnh (dùng mặc định)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng: PNG, JPG, WebP. Tối đa 2 MB. Hiển thị tối ưu với chiều cao 40px – 48px trên nền tối.
                </p>
                {logoUploadError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{logoUploadError}</p>
                )}
              </div>

              {/* Upload Favicon */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biểu tượng tab trình duyệt (Favicon)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{uploadingFavicon ? 'Đang tải icon...' : 'Chọn tệp favicon'}</span>
                    <input
                      type="file"
                      accept=".ico,.png"
                      onChange={handleSelectFavicon}
                      disabled={uploadingFavicon}
                      className="hidden"
                    />
                  </label>

                  {faviconPath && (
                    <button
                      type="button"
                      onClick={handleRemoveFavicon}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium py-1"
                    >
                      Xóa favicon tùy chỉnh (dùng mặc định)
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng: ICO hoặc PNG. Tối đa 512 KB. Tự động áp dụng cho tab trình duyệt của layout nội bộ.
                </p>
                {faviconUploadError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">{faviconUploadError}</p>
                )}
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                <span>Xem trước bộ nhận diện (Live Preview)</span>
              </div>

              <div className="space-y-4">
                {/* 1. Xem trước Sidebar Mở rộng */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Sidebar Mở Rộng (Nền xanh thương hiệu #0B1E3F)
                  </div>
                  <div className="bg-[#0B1E3F] text-slate-100 rounded-xl p-3.5 flex items-center gap-3 border border-blue-900/60 shadow-inner">
                    <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center text-amber-400 shrink-0 overflow-hidden shadow-xs">
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Logo Preview"
                          className="w-full h-full object-contain p-1"
                          onError={() => setLogoPreviewUrl(null)}
                        />
                      ) : (
                        <GraduationCap className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex flex-col truncate min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black tracking-wider text-white truncate">
                          {systemShortName || 'STHC_CTV'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20 shrink-0">
                          ADMIN
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-blue-200 truncate">
                        {unitName || 'Trường Trung cấp Du lịch & Khách sạn Saigontourist'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Xem trước Sidebar Thu gọn */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Sidebar Thu Gọn (Icon Only)
                  </div>
                  <div className="inline-flex bg-[#0B1E3F] text-slate-200 rounded-xl p-3 border border-blue-900/60 shadow-inner">
                    <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center text-amber-400 overflow-hidden shadow-xs">
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Logo Compact"
                          className="w-full h-full object-contain p-1"
                          onError={() => setLogoPreviewUrl(null)}
                        />
                      ) : (
                        <GraduationCap className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Xem trước Tab Trình duyệt & Favicon */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Tab Trình Duyệt (Favicon & Tiêu đề trang)
                  </div>
                  <div className="bg-slate-200/80 rounded-xl p-2.5 border border-slate-300">
                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300/80 shadow-2xs max-w-full truncate text-xs">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden">
                        {faviconPreviewUrl ? (
                          <img
                            src={faviconPreviewUrl}
                            alt="Favicon Preview"
                            className="w-4 h-4 object-contain"
                            onError={() => setFaviconPreviewUrl(null)}
                          />
                        ) : (
                          <div className="w-3.5 h-3.5 bg-blue-700 rounded-xs text-white text-[9px] font-bold flex items-center justify-center">
                            S
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-700 truncate">
                        Quản trị hệ thống | {systemShortName || 'STHC_CTV'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                  <strong>Lưu ý:</strong> Ảnh xem trước chỉ phản ánh trên giao diện của bạn. Thanh sidebar và tab trình duyệt thật sẽ được lưu vĩnh viễn vào Supabase sau khi nhấn <strong>Lưu nhóm Nhận diện</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer Nhận diện */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {brandingValidationError ? (
                <span className="text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{brandingValidationError}</span>
                </span>
              ) : isBrandingDirty ? (
                <span>Các thay đổi nhận diện chưa được lưu vào cơ sở dữ liệu</span>
              ) : (
                <span>Nhận diện hiện tại khớp với phiên bản máy chủ</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancelBranding}
                disabled={!isBrandingDirty || savingBranding || uploadingLogo || uploadingFavicon}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Hủy thay đổi
              </button>

              <button
                type="submit"
                disabled={!isBrandingDirty || !!brandingValidationError || savingBranding || savingOperation || uploadingLogo || uploadingFavicon}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {savingBranding ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu nhận diện...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu nhóm Nhận diện</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ===================================================================== */}
      {/* KHỐI 2: THÔNG TIN VẬN HÀNH (A7.5) */}
      {/* ===================================================================== */}
      <form onSubmit={handleSaveOperation} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Thông tin vận hành</h2>
                <p className="text-[11px] text-slate-500">
                  URL công khai chính thức, thông tin liên hệ hỗ trợ và múi giờ hệ thống
                </p>
              </div>
            </div>
            {isOperationDirty && (
              <span className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                Có thay đổi chưa lưu
              </span>
            )}
          </div>

          {/* Feedback messages riêng cho Vận hành */}
          {operationSuccessMsg && (
            <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{operationSuccessMsg}</span>
            </div>
          )}

          {operationErrorMsg && !conflictError && (
            <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-medium flex items-center gap-2 animate-fade-in shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{operationErrorMsg}</span>
            </div>
          )}

          <div className="p-6 space-y-5">
            {/* Field 1: URL công khai chính thức (public_base_url) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>URL công khai chính thức</span>
                  <span className="text-rose-500">*</span>
                </label>
                {urlValidation.valid && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>HTTPS hợp lệ</span>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={publicBaseUrl}
                onChange={(e) => setPublicBaseUrl(e.target.value)}
                placeholder="https://ctv.sthc.edu.vn"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                  !urlValidation.valid && isOperationDirty
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-blue-600'
                }`}
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                URL này dùng để tạo link giới thiệu và QR. Khi đổi tên miền, cần cập nhật cấu hình tên miền và xác thực email tương ứng.
              </p>
              {!urlValidation.valid && (
                <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{urlValidation.error}</span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
              {/* Field 2: Email hỗ trợ (support_email) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email hỗ trợ</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="tuyensinh@sthc.edu.vn"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    !emailValidation.valid && isOperationDirty
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-600'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Địa chỉ liên hệ hỗ trợ tuyển sinh (liên kết mở qua giao thức mailto:)
                </p>
                {!emailValidation.valid && (
                  <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{emailValidation.error}</span>
                  </p>
                )}
              </div>

              {/* Field 3: Số điện thoại hỗ trợ (support_phone) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Số điện thoại hỗ trợ</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  placeholder="02838446480 hoặc 0901234567"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                    !phoneValidation.valid && isOperationDirty
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-600'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {phoneValidation.valid && phoneValidation.normalized
                    ? `Chuẩn hóa nội địa: ${formatPhoneNumberVi(phoneValidation.normalized)} (liên kết tel:)`
                    : 'Chấp nhận số cố định (02x) và số di động Việt Nam (03x, 05x, 07x, 08x, 09x)'}
                </p>
                {!phoneValidation.valid && (
                  <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{phoneValidation.error}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Field 4: Múi giờ hệ thống (timezone) */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Múi giờ hệ thống</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1 w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 flex items-center justify-between cursor-not-allowed select-none">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Việt Nam (UTC+07:00)</span>
                    <span className="text-slate-400 font-mono text-[11px]">({timezone})</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Mặc định cố định</span>
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Múi giờ căn cứ định dạng ngày giờ hiển thị trên toàn hệ thống. Dữ liệu trong cơ sở dữ liệu tiếp tục lưu trữ chuẩn TIMESTAMPTZ (UTC).
              </p>
            </div>
          </div>

          {/* Form Actions Footer Vận hành */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {operationValidationError ? (
                <span className="text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{operationValidationError}</span>
                </span>
              ) : isOperationDirty ? (
                <span>Các thay đổi vận hành chưa được lưu vào cơ sở dữ liệu</span>
              ) : (
                <span>Thông tin vận hành hiện tại khớp với phiên bản máy chủ</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCancelOperation}
                disabled={!isOperationDirty || savingOperation}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                Hủy thay đổi
              </button>

              <button
                type="submit"
                disabled={!isOperationDirty || !!operationValidationError || savingOperation || savingBranding}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {savingOperation ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu thông tin vận hành...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu nhóm Vận hành</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ===================================================================== */}
      {/* A7.6 – QUY CHẾ VÀ TIẾP NHẬN ĐĂNG KÝ CTV */}
      {/* ===================================================================== */}
      <div className="space-y-6 pt-4">
        {/* Khối 3A: Tiếp nhận đăng ký CTV */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quản lý tiếp nhận đăng ký Cộng tác viên</h3>
                <p className="text-xs text-slate-500">
                  Bật/tắt công tắc tiếp nhận hồ sơ và cấu hình thông báo khi tạm ngưng tuyển sinh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                allowAffiliateRegistration
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {allowAffiliateRegistration ? 'Đang mở tiếp nhận' : 'Đang tạm đóng'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveRegistration} className="space-y-4">
            {registrationSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{registrationSuccessMsg}</span>
              </div>
            )}
            {registrationErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{registrationErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div>
                  <label className="font-bold text-slate-900 text-xs block mb-0.5">
                    Cho phép đăng ký CTV mới
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Bật để người học nộp hồ sơ Đại sứ. Bắt buộc phải có ít nhất 1 quy chế ACTIVE.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowAffiliateRegistration}
                    onChange={(e) => setAllowAffiliateRegistration(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Nội dung thông báo khi tạm ngừng tiếp nhận
                </label>
                <input
                  type="text"
                  value={registrationClosedMessage}
                  onChange={(e) => setRegistrationClosedMessage(e.target.value)}
                  placeholder="Ví dụ: Hệ thống đang tạm ngưng tiếp nhận hồ sơ mới..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingRegistration}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {savingRegistration ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu trạng thái tiếp nhận</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Khối 3C: Cấu hình bộ cấp mã Cộng tác viên (A7.7) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-900 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quản lý bộ cấp mã Cộng tác viên (A7.7)</h3>
                <p className="text-xs text-slate-500">
                  Cấu hình tiền tố, độ dài tối thiểu, xem trước mẫu mã và thống kê sổ cấp mã tự động
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                Sổ cấp mã: {codeGeneratorStats?.total_issued_in_registry || 0} CTV
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveAffiliateCode} className="space-y-4">
            {affiliateCodeSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{affiliateCodeSuccessMsg}</span>
              </div>
            )}
            {affiliateCodeErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{affiliateCodeErrorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Tiền tố mã (Prefix) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={affiliateCodePrefix}
                  onChange={(e) => setAffiliateCodePrefix(e.target.value.toUpperCase())}
                  placeholder="STHCCTV"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Chỉ gồm chữ in hoa A-Z và số 0-9, độ dài 3–20.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Số chữ số tối thiểu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={affiliateCodeMinDigits}
                  onChange={(e) => setAffiliateCodeMinDigits(parseInt(e.target.value, 10) || 6)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">Giới hạn chốt: từ 4 đến 12 chữ số.</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col justify-center space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Xem trước mã cấp mới (Preview)</span>
                <span className="font-mono font-bold text-sm text-blue-900">
                  {affiliateCodePrefix.trim().toUpperCase() || 'STHCCTV'}
                  {String(codeGeneratorStats?.expected_sequence_number || 10001).padStart(Math.max(Number(affiliateCodeMinDigits) || 6, String(codeGeneratorStats?.expected_sequence_number || 10001).length), '0')}
                </span>
                <span className="text-[11px] text-slate-500">
                  Số sequence tiếp theo: <strong className="font-mono">{codeGeneratorStats?.expected_sequence_number || 10001}</strong>
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px]">
              <strong>Lưu ý:</strong> Cấu hình áp dụng cho mã cấp mới. Mã CTV đã cấp được giữ nguyên trong sổ đăng ký.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingAffiliateCode}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {savingAffiliateCode ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu cấu hình bộ cấp mã</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Khối 3B: Danh sách phiên bản Quy chế tuyển sinh (PDF) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-900 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kho văn bản Quy chế tuyển sinh PDF</h3>
                <p className="text-xs text-slate-500">
                  Quản lý các phiên bản quy chế (Bản nháp, Đang áp dụng, Đã thay thế)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={regulationsStatusFilter}
                onChange={(e) => {
                  setRegulationsStatusFilter(e.target.value);
                  loadRegulations(1, e.target.value);
                }}
                aria-label="Lọc theo trạng thái quy chế"
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang áp dụng (ACTIVE)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="SUPERSEDED">Đã thay thế (SUPERSEDED)</option>
              </select>

              <button
                type="button"
                onClick={() => setCreateDraftModalOpen(true)}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm quy chế mới</span>
              </button>
            </div>
          </div>

          {regulationsError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{regulationsError}</span>
              <button onClick={() => loadRegulations(regulationsPage, regulationsStatusFilter)} className="ml-auto underline font-bold">Thử lại</button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 uppercase tracking-wider font-bold text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">Mã & Tên phiên bản</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày hiệu lực (VN)</th>
                  <th className="py-3 px-4">Dung lượng</th>
                  <th className="py-3 px-4">Người tạo / Áp dụng</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loadingRegulations ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                        <span>Đang tải danh sách quy chế...</span>
                      </div>
                    </td>
                  </tr>
                ) : regulationsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Chưa có văn bản quy chế tuyển sinh nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  regulationsList.map((reg: any) => {
                    const isActive = reg.status === 'ACTIVE';
                    const isDraft = reg.status === 'DRAFT';
                    const isSuperseded = reg.status === 'SUPERSEDED';
                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="font-mono text-blue-900 font-bold">{reg.version_code}</div>
                          <div className="text-slate-700 font-semibold">{reg.title}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isDraft
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {isActive ? 'Đang áp dụng' : isDraft ? 'Bản nháp' : 'Đã thay thế'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {formatDateTimeVi(reg.effective_date)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {(reg.file_size_bytes / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-medium">{reg.creator?.full_name || 'Admin'}</div>
                          {reg.publisher && (
                            <div className="text-[10px] text-slate-400">
                              Áp dụng: {reg.publisher.full_name} ({formatDateTimeVi(reg.published_at)})
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewPdf(reg)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            title="Xem trước PDF quy chế"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem PDF</span>
                          </button>

                          {(isDraft || isSuperseded || !isActive) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRegToApply(reg);
                                setApplyModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-bold transition-colors"
                              title="Kích hoạt áp dụng quy chế này"
                            >
                              <span>Áp dụng</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {regulationsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Trang {regulationsPage} / {regulationsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={regulationsPage <= 1}
                  onClick={() => loadRegulations(regulationsPage - 1, regulationsStatusFilter)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={regulationsPage >= regulationsTotalPages}
                  onClick={() => loadRegulations(regulationsPage + 1, regulationsStatusFilter)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Khối 4, 5, 6 Roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 rounded-2xl border border-slate-200/70 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700">Cấu hình mã CTV</h4>
              <p className="text-[11px] text-slate-400">Tiền tố và độ dài bộ cấp mã</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-md">A7.7</span>
          </div>
          <div className="bg-white/70 rounded-2xl border border-slate-200/70 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700">Lịch sử & Khôi phục</h4>
              <p className="text-[11px] text-slate-400">Kiểm toán vết thay đổi nhóm</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-md">A7.8</span>
          </div>
          <div className="bg-white/70 rounded-2xl border border-slate-200/70 p-5 shadow-2xs flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-700">Sao lưu & Phục hồi</h4>
              <p className="text-[11px] text-slate-400">Snapshot CSDL Supabase</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-md">Platform</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODALS: CREATE DRAFT, APPLY REGULATION, PDF PREVIEW */}
      {/* ===================================================================== */}

      {/* Modal: Tạo bản nháp quy chế mới */}
      {createDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">TẠO BẢN NHÁP QUY CHẾ TUYỂN SINH MỚI</h3>
              <button
                onClick={() => setCreateDraftModalOpen(false)}
                className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="p-6 space-y-4 text-xs">
              {draftModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{draftModalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">Mã phiên bản duy nhất (Version Code) *</label>
                <input
                  type="text"
                  required
                  value={draftVersionCode}
                  onChange={(e) => setDraftVersionCode(e.target.value)}
                  placeholder="Ví dụ: QC-2026-02"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tên văn bản quy chế *</label>
                <input
                  type="text"
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Ví dụ: Quy chế Hoạt động Đại sứ Tuyển sinh STHC 2026 (Đợt 2)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Ngày giờ hiệu lực *</label>
                <input
                  type="datetime-local"
                  required
                  value={draftEffectiveDate}
                  onChange={(e) => setDraftEffectiveDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tải lên tệp PDF quy chế (Tối đa 10 MB) *</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold border border-slate-300 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingDraftPdf ? 'Đang tải lên...' : 'Chọn tệp PDF'}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleUploadDraftPdf}
                      disabled={uploadingDraftPdf}
                      className="hidden"
                    />
                  </label>
                  {draftFileName && (
                    <span className="text-emerald-700 font-medium truncate max-w-[240px]">
                      {draftFileName} ({(draftFileSize / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
                {uploadDraftError && (
                  <p className="mt-1 text-rose-600 font-medium">{uploadDraftError}</p>
                )}
                {draftChecksum && (
                  <p className="mt-1 text-[10px] text-slate-400 font-mono">
                    SHA-256 Checksum: {draftChecksum.slice(0, 24)}...
                  </p>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px]">
                Lưu ý: Tạo bản nháp sẽ lưu tệp vào hệ thống nhưng <strong>không tự động áp dụng</strong> và không tự mở tiếp nhận đăng ký.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDraftModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingDraft || !draftStoragePath}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingDraft ? 'Đang tạo bản nháp...' : 'Tạo bản nháp quy chế'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận áp dụng quy chế */}
      {applyModalOpen && selectedRegToApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">XÁC NHẬN KÍCH HOẠT ÁP DỤNG QUY CHẾ</h3>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {applyError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{applyError}</span>
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-slate-600">Bạn chuẩn bị kích hoạt áp dụng phiên bản quy chế sau:</p>
                <div className="font-mono font-bold text-blue-900 text-sm">{selectedRegToApply.version_code}</div>
                <div className="font-semibold text-slate-900">{selectedRegToApply.title}</div>
                <div className="text-slate-500">Hiệu lực từ: {formatDateTimeVi(selectedRegToApply.effective_date)}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Lý do / Ghi chú áp dụng (Tùy chọn)</label>
                <input
                  type="text"
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Ví dụ: Ban hành quy chế cập nhật năm học mới"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px]">
                Thao tác này sẽ chuyển phiên bản ACTIVE hiện tại sang trạng thái <strong>Đã thay thế (SUPERSEDED)</strong> và đặt phiên bản này thành <strong>ACTIVE</strong>.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={applyingReg}
                  onClick={handleApplyRegulation}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {applyingReg ? 'Đang áp dụng...' : 'Xác nhận kích hoạt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem trước PDF quy chế (In-app Blob Viewer) */}
      {pdfPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm truncate">{previewPdfTitle}</h3>
              <button
                onClick={() => {
                  setPdfPreviewModalOpen(false);
                  if (previewPdfBlobUrl) {
                    URL.revokeObjectURL(previewPdfBlobUrl);
                    setPreviewPdfBlobUrl(null);
                  }
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 relative">
              {previewPdfBlobUrl ? (
                <iframe
                  src={previewPdfBlobUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  Đang tải tệp PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};