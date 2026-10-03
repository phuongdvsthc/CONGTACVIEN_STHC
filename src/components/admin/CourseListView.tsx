import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Clock,
  SearchX,
  Plus,
  Pencil,
  Save,
  AlertTriangle,
  Upload,
  Trash2,
  Eye,
  Image,
  Check,
  Globe,
  Ban,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { Course } from '../../types';
import { CourseDetailModal } from '../public/CourseDetailModal';

interface CourseListViewProps {
  currentUser?: {
    id?: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

const DEGREE_LEVEL_OPTIONS = [
  'Trung cấp',
  'Ngắn hạn',
  'Chuyên đề',
];

export const CAREER_GROUP_OPTIONS = [
  'Làm bánh',
  'Nấu ăn',
  'Nhà hàng',
  'Khách sạn',
  'Pha chế',
];

export const CourseListView: React.FC<CourseListViewProps> = ({ currentUser }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Modal (Create / Edit) state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formCode, setFormCode] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDegreeLevel, setFormDegreeLevel] = useState<string>('Trung cấp');
  const [formCareerGroup, setFormCareerGroup] = useState<string>('');
  const [formDuration, setFormDuration] = useState<string>('');
  const [formTuition, setFormTuition] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formBenefitsTitle, setFormBenefitsTitle] = useState<string>('');
  const [formBenefitsContent, setFormBenefitsContent] = useState<string>('');
  const [formThumbnail, setFormThumbnail] = useState<string>('');
  const [formOfficialUrl, setFormOfficialUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'thumbnail' | 'content'>('basic');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const [modalSubmitting, setModalSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(false);

  // A2.4: Xem khóa học chỉ đọc bằng dữ liệu đã lưu từ API
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [loadingViewCourse, setLoadingViewCourse] = useState<boolean>(false);

  // A2.4: Chuyển trạng thái khóa học (Công khai / Ngừng giới thiệu / Mở lại)
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [targetStatusCourse, setTargetStatusCourse] = useState<Course | null>(null);
  const [statusAction, setStatusAction] = useState<'PUBLISH' | 'STOP_REFERRAL' | 'REOPEN_REFERRAL'>('PUBLISH');
  const [statusReason, setStatusReason] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  // Thông báo kết quả thao tác (Toast banner)
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Race condition protection: ignore stale responses
  const lastRequestIdRef = useRef<number>(0);

  // Check role permission (A0.3: staff or admin only)
  const isAuthorized = !currentUser || currentUser.role === 'staff' || currentUser.role === 'admin';

  // 1. Debounce search input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // 2. Fetch courses from backend API
  const fetchCourses = async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const requestId = ++lastRequestIdRef.current;

    try {
      const res = await api.getAdminCourses({
        search: debouncedSearch,
        page,
        limit,
      });

      if (requestId === lastRequestIdRef.current) {
        if (res.success && Array.isArray(res.data)) {
          setCourses(res.data);
          if (res.pagination) {
            setPagination(res.pagination);
            if (res.pagination.total > 0 && page > res.pagination.totalPages) {
              setPage(1);
            }
          } else {
            setPagination({
              page,
              limit,
              total: res.data.length,
              totalPages: Math.max(1, Math.ceil(res.data.length / limit)),
            });
          }
        } else {
          setError(res.error || 'Không thể tải danh sách khóa học từ máy chủ.');
        }
      }
    } catch (err: any) {
      if (requestId === lastRequestIdRef.current) {
        setError(err.message || 'Lỗi kết nối khi tải danh sách khóa học. Vui lòng kiểm tra lại đường truyền.');
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [debouncedSearch, page, limit, isAuthorized]);

  // Format currency VND: distinguishes 0 from null/undefined
  const formatTuition = (fee: number | null | undefined): string => {
    if (fee === null || fee === undefined) {
      return 'Chưa cập nhật';
    }
    return new Intl.NumberFormat('vi-VN').format(fee) + ' đ';
  };

  // Format datetime in Asia/Ho_Chi_Minh timezone
  const formatDateVN = (isoString?: string): string => {
    if (!isoString) return 'Chưa cập nhật';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Chưa cập nhật';
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return 'Chưa cập nhật';
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  // Handle change limit
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setPage(1);
  };

  // ----------------------------------------------------------------------------
  // MODAL HANDLERS (A2.2)
  // ----------------------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormCode('');
    setFormTitle('');
    setFormDegreeLevel('Trung cấp');
    setFormCareerGroup('');
    setFormDuration('2 năm');
    setFormTuition('');
    setFormSummary('');
    setFormDescription('');
    setFormBenefitsTitle('');
    setFormBenefitsContent('');
    setFormThumbnail('');
    setFormOfficialUrl('');
    setActiveTab('basic');
    setFormIsActive(true);
    setModalError(null);
    setImageError(null);
    setIsFormDirty(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (course: Course) => {
    setModalError(null);
    setImageError(null);
    setActiveTab('basic');
    try {
      const res = await api.getCourseById(course.id);
      if (res.success && res.data) {
        const fullCourse = res.data;
        setEditingCourse(fullCourse);
        setFormCode(fullCourse.code || '');
        setFormTitle(fullCourse.title || '');
        setFormCareerGroup(fullCourse.career_group || '');
        let deg = fullCourse.degree_level || 'Trung cấp';
        if (!['Trung cấp', 'Ngắn hạn', 'Chuyên đề'].includes(deg)) {
          if (deg.includes('Trung cấp') || deg.includes('TC')) deg = 'Trung cấp';
          else if (deg.includes('Sơ cấp') || deg.includes('Ngắn hạn') || deg.includes('SC')) deg = 'Ngắn hạn';
          else deg = 'Chuyên đề';
        }
        setFormDegreeLevel(deg);
        setFormDuration(fullCourse.duration_text || '');
        setFormTuition(fullCourse.tuition_fee_estimate !== null && fullCourse.tuition_fee_estimate !== undefined ? String(fullCourse.tuition_fee_estimate) : '');
        setFormSummary(fullCourse.summary || '');
        setFormDescription(fullCourse.description_html || '');
        setFormBenefitsTitle(fullCourse.benefits_title || '');
        setFormBenefitsContent(fullCourse.benefits_content || '');
        setFormThumbnail(fullCourse.thumbnail_url || '');
        setFormOfficialUrl(fullCourse.official_registration_url || '');
        setFormIsActive(fullCourse.is_active ?? true);
        setIsFormDirty(false);
        setIsModalOpen(true);
      } else {
        alert(res.error || 'Không thể tải chi tiết khóa học từ máy chủ.');
      }
    } catch (err: any) {
      alert('Lỗi kết nối khi tải chi tiết khóa học.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Dung lượng ảnh vượt quá giới hạn 5 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('Chỉ chấp nhận file ảnh định dạng JPEG, PNG hoặc WebP.');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await api.uploadCourseThumbnail(base64, file.name);
        if (res.success && res.url) {
          setFormThumbnail(res.url);
          setIsFormDirty(true);
        } else {
          setImageError(res.error || 'Lỗi tải ảnh lên.');
        }
      } catch (err: any) {
        setImageError('Lỗi kết nối khi tải ảnh lên.');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.onerror = () => {
      setUploadingImage(false);
      setImageError('Không thể đọc file ảnh.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setFormThumbnail('');
    setIsFormDirty(true);
  };

  const handleCloseModal = () => {
    if (isFormDirty) {
      const confirmClose = window.confirm('Bạn có thay đổi chưa lưu trên form. Bạn có chắc chắn muốn hủy và đóng cửa sổ này không?');
      if (!confirmClose) return;
    }
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const handleFormChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setIsFormDirty(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Client validation
    if (!formCode.trim() || !formTitle.trim() || !formDegreeLevel.trim() || !formDuration.trim()) {
      setModalError('Vui lòng điền đầy đủ các thông tin bắt buộc: Mã khóa học, Tên khóa học, Hệ đào tạo và Thời lượng.');
      return;
    }

    let parsedTuition: number | null = null;
    if (formTuition.trim() !== '') {
      parsedTuition = Number(formTuition);
      if (isNaN(parsedTuition) || parsedTuition < 0) {
        setModalError('Học phí phải là số không âm.');
        return;
      }
    }

    let cleanOfficialUrl: string | null = null;
    if (formOfficialUrl.trim() !== '') {
      const urlStr = formOfficialUrl.trim();
      if (!urlStr.startsWith('https://')) {
        setModalError('Link đăng ký học trên cổng tuyển sinh phải bắt đầu bằng https://.');
        return;
      }
      if (urlStr.toLowerCase().startsWith('javascript:') || urlStr.toLowerCase().startsWith('data:') || urlStr.includes('@')) {
        setModalError('Link đăng ký học không hợp lệ hoặc chứa thông tin đăng nhập không được phép.');
        return;
      }
      cleanOfficialUrl = urlStr;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        degree_level: formDegreeLevel.trim(),
        career_group: formCareerGroup.trim() ? formCareerGroup.trim() : null,
        duration_text: formDuration.trim(),
        tuition_fee_estimate: parsedTuition,
        summary: formSummary.trim() || null,
        description_html: formDescription.trim() || null,
        benefits_title: formBenefitsTitle.trim() || null,
        benefits_content: formBenefitsContent.trim() || null,
        thumbnail_url: formThumbnail.trim() || null,
        official_registration_url: cleanOfficialUrl,
      };

      const res = editingCourse
        ? await api.updateCourse(editingCourse.id, {
            ...payload,
            // A2.4: Form sửa A2.2 không được thay đổi trạng thái ngoài các thao tác chuyên biệt A2.4
            client_updated_at: editingCourse.updated_at,
          })
        : await api.createCourse(payload);

      if (res.success) {
        setIsFormDirty(false);
        setIsModalOpen(false);
        fetchCourses();
      } else {
        setModalError(res.error || 'Không thể lưu khóa học.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Lỗi kết nối khi lưu thông tin khóa học.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Xác định trạng thái chuẩn hóa của khóa học (A2.4)
  const getCourseStatus = (c: Course): 'DRAFT' | 'ACTIVE' | 'STOPPED' => {
    if (c.status) return c.status;
    if (!c.is_active) return 'DRAFT';
    if (c.accepts_referrals === false) return 'STOPPED';
    return 'ACTIVE';
  };

  // ----------------------------------------------------------------------------
  // A2.4 HANDLERS: XEM KHÓA HỌC & CHUYỂN TRẠNG THÁI
  // ----------------------------------------------------------------------------
  const handleOpenViewModal = async (course: Course) => {
    setLoadingViewCourse(true);
    try {
      const res = await api.getCourseById(course.id);
      if (res.success && res.data) {
        setViewingCourse(res.data);
      } else {
        setViewingCourse(course);
      }
    } catch {
      setViewingCourse(course);
    } finally {
      setLoadingViewCourse(false);
    }
  };

  const handleOpenStatusModal = (course: Course, action: 'PUBLISH' | 'STOP_REFERRAL' | 'REOPEN_REFERRAL') => {
    setTargetStatusCourse(course);
    setStatusAction(action);
    setStatusReason('');
    setStatusNote('');
    setStatusModalError(null);
    setStatusModalOpen(true);
  };

  const handleSubmitStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatusCourse) return;
    setStatusModalError(null);

    // 1. Kiểm tra nghiệp vụ Stop Referral
    if (statusAction === 'STOP_REFERRAL' && !statusReason.trim()) {
      setStatusModalError('Bắt buộc phải nhập lý do khi ngừng tiếp nhận giới thiệu khóa học.');
      return;
    }

    // 2. Kiểm tra tối thiểu trước khi công khai: mã, tên, hệ đào tạo, thời lượng, mô tả ngắn
    // Không tự coi học phí trống là 0
    if (statusAction === 'PUBLISH') {
      const missing: string[] = [];
      if (!targetStatusCourse.code?.trim()) missing.push('Mã khóa học');
      if (!targetStatusCourse.title?.trim()) missing.push('Tên khóa học');
      if (!targetStatusCourse.degree_level?.trim()) missing.push('Hệ đào tạo');
      if (!targetStatusCourse.duration_text?.trim()) missing.push('Thời lượng');
      if (!targetStatusCourse.summary?.trim()) missing.push('Mô tả ngắn');

      if (missing.length > 0) {
        setStatusModalError(`Khóa học chưa đủ điều kiện công khai. Vui lòng bổ sung đầy đủ thông tin: ${missing.join(', ')}.`);
        return;
      }
    }

    setStatusSubmitting(true);
    try {
      const res = await api.updateCourseStatus(targetStatusCourse.id, {
        action: statusAction,
        reason: statusReason.trim() || undefined,
        note: statusNote.trim() || undefined,
      });

      if (res.success) {
        const courseName = `${targetStatusCourse.code} - ${targetStatusCourse.title}`;
        let successMessage = `Đã công khai khóa học "${courseName}" thành công!`;
        if (statusAction === 'STOP_REFERRAL') {
          successMessage = `Đã chuyển khóa học "${courseName}" sang trạng thái Ngừng tiếp nhận giới thiệu.`;
        } else if (statusAction === 'REOPEN_REFERRAL') {
          successMessage = `Đã mở lại tiếp nhận giới thiệu cho khóa học "${courseName}".`;
        }

        setStatusModalOpen(false);
        setTargetStatusCourse(null);
        setActionNotification({ type: 'success', text: successMessage });
        setTimeout(() => setActionNotification(null), 5000);
        await fetchCourses();
      } else {
        setStatusModalError(res.error || 'Không thể cập nhật trạng thái khóa học từ máy chủ.');
      }
    } catch (err: any) {
      setStatusModalError(err.message || 'Lỗi kết nối khi cập nhật trạng thái khóa học.');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Calculate items range for display
  const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  // ----------------------------------------------------------------------------
  // CASE 1: KHÔNG CÓ QUYỀN TRUY CẬP (A0.3)
  // ----------------------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Không có quyền truy cập
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Module <strong>Quản lý khóa học</strong> chỉ dành cho tài khoản Cán bộ Tuyển sinh (Staff) hoặc Quản trị viên (Admin). Tài khoản của bạn không được cấp quyền xem dữ liệu quản trị này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* 1. TIÊU ĐỀ TRANG VÀ NÚT TẠO KHÓA HỌC (A2.2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Quản lý hệ thống</span>
            <span>/</span>
            <span className="font-semibold text-blue-900">Quản lý khóa học</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-900" />
            <span>Quản lý khóa học</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách và quản lý thông tin các khóa học, ngành đào tạo tuyển sinh Trường Saigontourist
          </p>
        </div>

        {/* Nút Tạo khóa học */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo khóa học</span>
        </button>
      </div>

      {/* Thông báo kết quả thao tác A2.4 */}
      {actionNotification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-fade-in shadow-xs ${
            actionNotification.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
              : 'bg-rose-50 text-rose-950 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionNotification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionNotification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. THANH CÔNG CỤ (TOOLBAR): TÌM KIẾM, XÓA TÌM KIẾM, SỐ DÒNG/TRANG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Nhóm tìm kiếm */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã, tên khóa học, hệ đào tạo…"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all shadow-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Xóa nội dung nhập"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nút Xóa tìm kiếm */}
          {(searchInput || debouncedSearch) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0 shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Xóa tìm kiếm</span>
            </button>
          )}
        </div>

        {/* Chọn số dòng/trang */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 self-end md:self-auto shrink-0">
          <span className="font-medium">Hiển thị:</span>
          <select
            value={limit}
            onChange={handleLimitChange}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 shadow-xs cursor-pointer"
          >
            <option value={20}>20 khóa học / trang</option>
            <option value={50}>50 khóa học / trang</option>
            <option value={100}>100 khóa học / trang</option>
          </select>
        </div>
      </div>

      {/* 3. BẢNG DANH SÁCH & CÁC TRẠNG THÁI HIỂN THỊ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* TRẠNG THÁI 1: ĐANG TẢI (LOADING) */}
        {loading && (
          <div className="p-12 text-center space-y-3">
            <div className="w-9 h-9 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-600">Đang tải danh sách khóa học...</p>
          </div>
        )}

        {/* TRẠNG THÁI 2: LỖI TẢI DỮ LIỆU (ERROR) */}
        {!loading && error && (
          <div className="p-8 sm:p-12 text-center space-y-3.5 bg-rose-50/50">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-rose-900">Lỗi tải dữ liệu khóa học</h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={fetchCourses}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          </div>
        )}

        {/* TRẠNG THÁI 3: CHƯA CÓ KHÓA HỌC TRONG CSDL (EMPTY DATABASE) */}
        {!loading && !error && courses.length === 0 && !debouncedSearch && (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Chưa có khóa học nào trong hệ thống</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hệ thống hiện tại chưa ghi nhận danh mục khóa học nào trong cơ sở dữ liệu.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo khóa học đầu tiên</span>
              </button>
            </div>
          </div>
        )}

        {/* TRẠNG THÁI 4: KHÔNG TÌM THẤY KẾT QUẢ KHỚP (NO SEARCH MATCH) */}
        {!loading && !error && courses.length === 0 && debouncedSearch && (
          <div className="p-12 text-center space-y-3.5">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
              <SearchX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy kết quả phù hợp</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Không tìm thấy khóa học nào phù hợp với từ khóa <strong className="text-slate-900 font-semibold">"{debouncedSearch}"</strong>.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa từ khóa tìm kiếm</span>
              </button>
            </div>
          </div>
        )}

        {/* BẢNG DỮ LIỆU (KHI CÓ KẾT QUẢ) */}
        {!loading && !error && courses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="py-3.5 px-4 text-center w-14">STT</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Mã khóa học</th>
                  <th scope="col" className="py-3.5 px-4 min-w-[220px]">Tên khóa học</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Hệ đào tạo</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Nhóm nghề</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Thời lượng</th>
                  <th scope="col" className="py-3.5 px-4 text-right whitespace-nowrap">Học phí</th>
                  <th scope="col" className="py-3.5 px-4 text-center whitespace-nowrap">Trạng thái</th>
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Ngày cập nhật gần nhất</th>
                  <th scope="col" className="py-3.5 px-4 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {courses.map((course, index) => {
                  const sequenceNumber = (pagination.page - 1) * pagination.limit + index + 1;
                  return (
                    <tr
                      key={course.id || `course-${index}`}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      {/* 1. STT */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-500">
                        {sequenceNumber}
                      </td>

                      {/* 2. Mã khóa học */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {course.code || 'Chưa cập nhật'}
                      </td>

                      {/* 3. Tên khóa học */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {course.title || 'Chưa cập nhật'}
                      </td>

                      {/* 4. Hệ đào tạo */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {course.degree_level || 'Chưa cập nhật'}
                      </td>

                      {/* 4b. Nhóm nghề */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {course.career_group ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                            {course.career_group}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Chưa cập nhật</span>
                        )}
                      </td>

                      {/* 5. Thời lượng */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {course.duration_text || 'Chưa cập nhật'}
                      </td>

                      {/* 6. Học phí */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-900 tabular-nums whitespace-nowrap">
                        {formatTuition(course.tuition_fee_estimate)}
                      </td>

                      {/* 7. Trạng thái theo vòng đời và quyền giới thiệu (A2.4) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {(() => {
                          const cStatus = getCourseStatus(course);
                          if (cStatus === 'ACTIVE') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                <span>Đang nhận giới thiệu</span>
                              </span>
                            );
                          }
                          if (cStatus === 'STOPPED') {
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
                                title={course.stop_reason ? `Lý do ngừng giới thiệu: ${course.stop_reason}` : 'Khóa học ngừng nhận giới thiệu'}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                <span>Ngừng giới thiệu</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Chưa công khai</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* 8. Ngày cập nhật gần nhất */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {formatDateVN(course.updated_at)}
                      </td>

                      {/* 9. Thao tác: Xem khóa học, Sửa, Chuyển trạng thái (A2.4) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {(() => {
                          const cStatus = getCourseStatus(course);
                          return (
                            <div className="inline-flex items-center gap-1.5">
                              {/* Nút Xem khóa học (A2.4: Mở modal chỉ đọc dữ liệu đã lưu từ API chi tiết) */}
                              <button
                                type="button"
                                onClick={() => handleOpenViewModal(course)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-[11px] shadow-xs"
                                title="Xem chi tiết khóa học (Dữ liệu đã lưu)"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>Xem</span>
                              </button>

                              {/* Nút Sửa (A2.2) */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(course)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-900 hover:text-white text-blue-900 font-semibold rounded-lg transition-colors text-[11px] shadow-xs"
                                title="Sửa thông tin khóa học"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>

                              {/* Nút Chuyển trạng thái (A2.4) */}
                              {cStatus === 'DRAFT' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(course, 'PUBLISH')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-semibold rounded-lg transition-colors text-[11px] border border-emerald-200 shadow-xs"
                                  title="Công khai khóa học và mở nhận giới thiệu"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  <span>Công khai</span>
                                </button>
                              )}

                              {cStatus === 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(course, 'STOP_REFERRAL')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 font-semibold rounded-lg transition-colors text-[11px] border border-amber-200 shadow-xs"
                                  title="Ngừng tiếp nhận giới thiệu cho khóa học này"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Ngừng GT</span>
                                </button>
                              )}

                              {cStatus === 'STOPPED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(course, 'REOPEN_REFERRAL')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-semibold rounded-lg transition-colors text-[11px] border border-emerald-200 shadow-xs"
                                  title="Mở lại tiếp nhận giới thiệu khóa học"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Mở lại</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. PHÂN TRANG (PAGINATION) */}
        {!loading && !error && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-slate-600">
              {pagination.total > 0 ? (
                <>
                  Hiển thị <strong className="font-semibold text-slate-900 font-mono">{startItem}–{endItem}</strong> / <strong className="font-semibold text-slate-900 font-mono">{pagination.total}</strong> khóa học
                </>
              ) : (
                <span>0 khóa học</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || pagination.total === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                  if (
                    pagination.totalPages > 7 &&
                    p !== 1 &&
                    p !== pagination.totalPages &&
                    Math.abs(p - pagination.page) > 2
                  ) {
                    if (p === 2 || p === pagination.totalPages - 1) {
                      return (
                        <span key={p} className="px-1 text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  const isActive = p === pagination.page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      disabled={pagination.total === 0}
                      className={`min-w-[32px] h-8 px-2 rounded-lg font-mono font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-900 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || pagination.total === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors shadow-xs"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL TẠO / SỬA KHÓA HỌC (A2.2) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center font-bold">
                  {editingCourse ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingCourse ? 'Sửa thông tin khóa học' : 'Tạo khóa học mới'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingCourse ? `Mã khóa học: ${editingCourse.code}` : 'Nhập đầy đủ thông tin chi tiết cho khóa học'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${activeTab === 'basic' ? 'bg-white text-blue-900 border-slate-200 shadow-xs' : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'}`}
              >
                1. Thông tin cơ bản
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('thumbnail')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${activeTab === 'thumbnail' ? 'bg-white text-blue-900 border-slate-200 shadow-xs' : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'}`}
              >
                2. Ảnh khóa học
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${activeTab === 'content' ? 'bg-white text-blue-900 border-slate-200 shadow-xs' : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'}`}
              >
                3. Nội dung giới thiệu
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveCourse} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed font-medium">{modalError}</div>
                </div>
              )}

              {/* TAB 1: THÔNG TIN CƠ BẢN */}
              {activeTab === 'basic' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Mã khóa học */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mã khóa học <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formCode}
                        onChange={(e) => handleFormChange(setFormCode, e.target.value)}
                        placeholder="VD: CBMA-TC-01"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Mã định danh duy nhất (viết hoa, không khoảng trắng).</p>
                    </div>

                    {/* Hệ đào tạo */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hệ đào tạo <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={formDegreeLevel}
                        onChange={(e) => handleFormChange(setFormDegreeLevel, e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      >
                        {DEGREE_LEVEL_OPTIONS.map((deg) => (
                          <option key={deg} value={deg}>
                            {deg}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">Chương trình đào tạo STHC.</p>
                    </div>

                    {/* Nhóm nghề */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nhóm nghề <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                      </label>
                      <select
                        value={formCareerGroup}
                        onChange={(e) => handleFormChange(setFormCareerGroup, e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      >
                        <option value="">Chọn nhóm nghề</option>
                        {CAREER_GROUP_OPTIONS.map((cg) => (
                          <option key={cg} value={cg}>
                            {cg}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">Phân loại theo 5 nhóm nghề chuẩn STHC.</p>
                    </div>
                  </div>

                  {/* Tên khóa học */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên khóa học / ngành đào tạo <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => handleFormChange(setFormTitle, e.target.value)}
                      placeholder="VD: Kỹ thuật chế biến món ăn"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Thời lượng */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Thời lượng học <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formDuration}
                        onChange={(e) => handleFormChange(setFormDuration, e.target.value)}
                        placeholder="VD: 2 năm (4 học kỳ)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>

                    {/* Học phí dự kiến */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Học phí dự kiến (VNĐ)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={formTuition}
                        onChange={(e) => handleFormChange(setFormTuition, e.target.value)}
                        placeholder="VD: 15500000 (Để trống nếu chưa cập nhật)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Phân biệt trống (chưa cập nhật) với học phí 0 đ.</p>
                    </div>
                  </div>

                  {/* Link đăng ký học trên cổng tuyển sinh */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Link đăng ký học trên cổng tuyển sinh
                    </label>
                    <input
                      type="url"
                      value={formOfficialUrl}
                      onChange={(e) => handleFormChange(setFormOfficialUrl, e.target.value)}
                      placeholder="https://tuyensinh.sthc.edu.vn/dang-ky-khoa-hoc-ba"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Đường dẫn để người học hoàn tất hồ sơ đăng ký chính thức. Link này được hiển thị sau khi khách gửi đăng ký qua CTV.
                    </p>
                  </div>

                  {/* Trạng thái (Chỉ đọc khi sửa) */}
                  {editingCourse && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Trạng thái hoạt động: </span>
                        <span className="text-slate-500">Được quản lý tự động theo hệ thống tuyển sinh</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${formIsActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'}`}>
                        {formIsActive ? 'Đang tuyển sinh' : 'Tạm ngưng'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ẢNH KHÓA HỌC */}
              {activeTab === 'thumbnail' && (
                <div className="space-y-4 animate-fade-in py-2">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-48 h-32 bg-slate-200 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300 relative shrink-0 shadow-xs">
                      {formThumbnail ? (
                        <img src={formThumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3 text-slate-400">
                          <Image className="w-9 h-9 mx-auto mb-1 opacity-40" />
                          <span className="text-[11px] font-medium">Chưa có ảnh đại diện</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-slate-900">Ảnh đại diện khóa học (Thumbnail)</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Hỗ trợ định dạng JPEG, PNG, WebP. Dung lượng tối đa 5 MB. Ảnh được tải lên lưu trữ bảo mật qua Storage.
                      </p>

                      {imageError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[11px] font-medium">
                          {imageError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                          {uploadingImage ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Đang tải lên...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>{formThumbnail ? 'Thay ảnh khác' : 'Chọn ảnh tải lên'}</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>

                        {formThumbnail && (
                          <button
                            type="button"
                            onClick={handleRemoveThumbnail}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-200 shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Gỡ ảnh</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NỘI DUNG GIỚI THIỆU */}
              {activeTab === 'content' && (
                <div className="space-y-4 animate-fade-in py-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô tả ngắn (Hiển thị trang danh sách & trang chủ công khai)
                    </label>
                    <textarea
                      rows={3}
                      value={formSummary}
                      onChange={(e) => handleFormChange(setFormSummary, e.target.value)}
                      placeholder="Tóm tắt ngắn gọn về chương trình đào tạo, cơ hội việc làm..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                    <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nội dung giới thiệu chi tiết (Hỗ trợ HTML / Markdown cơ bản)
                    </label>
                    <textarea
                      rows={6}
                      value={formDescription}
                      onChange={(e) => handleFormChange(setFormDescription, e.target.value)}
                      placeholder="Thông tin chi tiết về chương trình học, chuẩn đầu ra, học phí từng kỳ..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  {/* Section Đặc quyền / Quyền lợi sinh viên tùy biến (A2.3) */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-blue-950">
                        Section đặc quyền / quyền lợi sinh viên (Tùy biến theo khóa học)
                      </label>
                      <span className="text-[11px] text-slate-400">Tự động ẩn nếu để trống</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tiêu đề section
                      </label>
                      <input
                        type="text"
                        value={formBenefitsTitle}
                        onChange={(e) => handleFormChange(setFormBenefitsTitle, e.target.value)}
                        placeholder="VD: Đặc quyền sinh viên Trường Saigontourist (STHC)"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nội dung section (Định dạng nhiều dòng hoặc HTML cơ bản)
                      </label>
                      <textarea
                        rows={5}
                        value={formBenefitsContent}
                        onChange={(e) => handleFormChange(setFormBenefitsContent, e.target.value)}
                        placeholder="Nhập các quyền lợi, thực tập hưởng lương 5 sao, cam kết việc làm, kiểm định quốc tế..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Được lưu riêng theo từng khóa học. Hệ thống không tự động chèn nội dung mẫu khi chưa nhập.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl transition-colors shadow-xs"
                >
                  <Eye className="w-4 h-4 text-amber-700" />
                  <span>Xem trước</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={modalSubmitting}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    Hủy / Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
                  >
                    {modalSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu thông tin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. COURSE PREVIEW MODAL (A2.3: Dữ liệu đang chỉnh sửa từ form) */}
      {isPreviewOpen && (
        <CourseDetailModal
          course={{
            id: editingCourse?.id || 'preview-course-id',
            code: formCode.trim() || 'CHƯA-CẬP-NHẬT',
            title: formTitle.trim() || 'Chưa nhập tên khóa học',
            slug: editingCourse?.slug || 'preview-slug',
            department: 'Khoa Du lịch - Khách sạn',
            degree_level: formDegreeLevel,
            career_group: formCareerGroup.trim() ? formCareerGroup.trim() : null,
            duration_text: formDuration.trim() || 'Chưa cập nhật',
            tuition_fee_estimate: formTuition.trim() !== '' ? Number(formTuition) : null,
            summary: formSummary.trim() || null,
            description_html: formDescription.trim() || null,
            benefits_title: formBenefitsTitle.trim() || null,
            benefits_content: formBenefitsContent.trim() || null,
            thumbnail_url: formThumbnail.trim() || null,
            is_active: formIsActive,
            sort_order: 0,
            created_at: editingCourse?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          onClose={() => setIsPreviewOpen(false)}
          isPreview={true}
          isDirty={isFormDirty}
        />
      )}

      {/* 7. VIEW COURSE MODAL (A2.4: Dữ liệu đã lưu từ CSDL, chỉ đọc) */}
      {viewingCourse && (
        <CourseDetailModal
          course={viewingCourse}
          onClose={() => setViewingCourse(null)}
          isViewOnly={true}
        />
      )}

      {/* 8. STATUS TRANSITION CONFIRMATION MODAL (A2.4) */}
      {statusModalOpen && targetStatusCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            {/* Modal Header */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                statusAction === 'STOP_REFERRAL'
                  ? 'bg-amber-600'
                  : 'bg-emerald-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  {statusAction === 'STOP_REFERRAL' ? (
                    <Ban className="w-4 h-4 text-white" />
                  ) : statusAction === 'PUBLISH' ? (
                    <Globe className="w-4 h-4 text-white" />
                  ) : (
                    <RotateCcw className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {statusAction === 'STOP_REFERRAL'
                      ? 'Xác nhận ngừng tiếp nhận giới thiệu'
                      : statusAction === 'PUBLISH'
                      ? 'Xác nhận công khai khóa học'
                      : 'Xác nhận mở lại tiếp nhận giới thiệu'}
                  </h3>
                  <p className="text-xs text-white/80">
                    Mã khóa học: <strong className="font-mono">{targetStatusCourse.code}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!statusSubmitting) {
                    setStatusModalOpen(false);
                    setTargetStatusCourse(null);
                  }
                }}
                disabled={statusSubmitting}
                className="p-1.5 text-white/80 hover:text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitStatusChange} className="p-6 space-y-4 text-xs">
              {/* Thông tin khóa học */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Khóa học thực hiện:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {targetStatusCourse.title}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-0.5">
                  <span className="font-mono font-semibold text-blue-900">Mã: {targetStatusCourse.code}</span>
                  <span>•</span>
                  <span>Hệ: {targetStatusCourse.degree_level}</span>
                  <span>•</span>
                  <span>Thời lượng: {targetStatusCourse.duration_text}</span>
                </div>
              </div>

              {/* Tác động đến link cũ và hệ thống (Yêu cầu A2.4) */}
              <div
                className={`p-4 rounded-xl border space-y-2 leading-relaxed ${
                  statusAction === 'STOP_REFERRAL'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Tác động đến link giới thiệu & hồ sơ tuyển sinh:</span>
                </div>
                {statusAction === 'STOP_REFERRAL' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-amber-900">
                    <li><strong>Không cho tạo link giới thiệu mới</strong> từ Cổng CTV.</li>
                    <li><strong>Link, mã và mã QR cũ được giữ nguyên</strong> và vẫn mở được nội dung khóa học.</li>
                    <li>Trang qua link cũ hiển thị thông báo <em>"Khóa học hiện ngừng nhận đăng ký"</em> và nút <strong>"Đăng ký" bị vô hiệu hóa</strong>.</li>
                    <li><strong>Không cho gửi đăng ký mới</strong> qua link cũ.</li>
                    <li><strong>Bảo toàn nguyên vẹn dữ liệu</strong>: Khách đã đăng ký, CTV sở hữu, kết quả đối chiếu và thù lao được giữ nguyên.</li>
                  </ul>
                ) : statusAction === 'PUBLISH' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-emerald-900">
                    <li>Khóa học sẽ <strong>xuất hiện công khai</strong> trên cổng tuyển sinh của trường.</li>
                    <li>Khóa học sẽ <strong>xuất hiện trong danh sách</strong> của Cộng tác viên đủ điều kiện.</li>
                    <li>CTV đủ điều kiện được <strong>tạo và sử dụng link/mã/QR giới thiệu</strong>.</li>
                    <li>Khách truy cập được xem đầy đủ nội dung và <strong>gửi hồ sơ đăng ký tuyển sinh</strong>.</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-emerald-900">
                    <li>Khóa học <strong>trở lại danh sách</strong> dành cho CTV đủ điều kiện.</li>
                    <li><strong>Toàn bộ link/mã/QR cũ hoạt động trở lại</strong> bình thường, không đổi URL hay chủ sở hữu.</li>
                    <li>Khách truy cập qua link cũ có thể <strong>gửi đăng ký trở lại bình thường</strong>.</li>
                    <li>Quyền giới thiệu của từng CTV vẫn phụ thuộc vào trạng thái tài khoản CTV (A1.4).</li>
                  </ul>
                )}
              </div>

              {/* Kiểm tra điều kiện công khai (A2.4) */}
              {statusAction === 'PUBLISH' && (() => {
                const missing: string[] = [];
                if (!targetStatusCourse.code?.trim()) missing.push('Mã khóa học');
                if (!targetStatusCourse.title?.trim()) missing.push('Tên khóa học');
                if (!targetStatusCourse.degree_level?.trim()) missing.push('Hệ đào tạo');
                if (!targetStatusCourse.duration_text?.trim()) missing.push('Thời lượng');
                if (!targetStatusCourse.summary?.trim()) missing.push('Mô tả ngắn');
                if (missing.length > 0) {
                  return (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Chưa đủ điều kiện công khai:</strong>
                        <span>Khóa học còn thiếu: <strong>{missing.join(', ')}</strong>. Vui lòng bấm "Sửa" khóa học để bổ sung trước khi công khai.</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Nhập lý do (Bắt buộc với Ngừng giới thiệu) */}
              {statusAction === 'STOP_REFERRAL' ? (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    Lý do ngừng giới thiệu <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Nhập lý do chi tiết (ví dụ: Đã đủ chỉ tiêu tuyển sinh khóa 2026, Tạm dừng để cập nhật giáo trình mới, ...)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all resize-none shadow-xs"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Lý do này sẽ được ghi vào nhật ký kiểm toán (Audit Log) và hiển thị trên thông báo ngừng nhận đăng ký.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    Ghi chú / Nhận xét (Tùy chọn)
                  </label>
                  <textarea
                    rows={2}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Nhập ghi chú lưu vết nội bộ nếu cần..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none shadow-xs"
                  />
                </div>
              )}

              {/* Thông báo lỗi trong modal */}
              {statusModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{statusModalError}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!statusSubmitting) {
                      setStatusModalOpen(false);
                      setTargetStatusCourse(null);
                    }
                  }}
                  disabled={statusSubmitting}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={
                    statusSubmitting ||
                    (statusAction === 'STOP_REFERRAL' && !statusReason.trim()) ||
                    (statusAction === 'PUBLISH' &&
                      (!targetStatusCourse.code?.trim() ||
                        !targetStatusCourse.title?.trim() ||
                        !targetStatusCourse.degree_level?.trim() ||
                        !targetStatusCourse.duration_text?.trim() ||
                        !targetStatusCourse.summary?.trim()))
                  }
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    statusAction === 'STOP_REFERRAL'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {statusSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : statusAction === 'STOP_REFERRAL' ? (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Xác nhận ngừng giới thiệu</span>
                    </>
                  ) : statusAction === 'PUBLISH' ? (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Xác nhận công khai</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xác nhận mở lại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
