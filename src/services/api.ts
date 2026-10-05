/**
 * Client API Service for STHC Affiliate & Admission Management System
 */

import { Course, AffiliateProfile, UserProfile, Lead, Reward, AuditLog } from '../types';

export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sthc_auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        error: res.ok ? 'Phản hồi không hợp lệ từ máy chủ.' : `Lỗi máy chủ (${res.status}: ${res.statusText || 'Lỗi'})`,
        status: res.status,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Lỗi kết nối máy chủ.',
    };
  }
}

export const api = {
  // --------------------------------------------------------------------------
  // AUTH & SIMULATED SESSION
  // --------------------------------------------------------------------------
  async getMe() {
    return apiFetch('/api/v1/auth/me');
  },

  async switchRole(role: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin') {
    try {
      localStorage.removeItem('sthc_auth_token');
    } catch (e) {}
    return apiFetch('/api/v1/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async login(email: string, password?: string) {
    const data = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data?.success) {
      if (data?.data?.token) {
        try {
          localStorage.setItem('sthc_auth_token', data.data.token);
        } catch (e) {}
      } else {
        try {
          localStorage.removeItem('sthc_auth_token');
        } catch (e) {}
      }
    }
    return data;
  },

  async logout() {
    try {
      localStorage.removeItem('sthc_auth_token');
    } catch (e) {}
    return apiFetch('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  async register(payload: {
    full_name: string;
    phone: string;
    email: string;
    password?: string;
    confirm_password?: string;
    terms_accepted?: boolean;
    regulation_id?: string;
    accepted_regulation?: boolean;
    id_card_number?: string;
    id_card_issued_date?: string;
    occupation?: string;
    address?: string;
    bank_account_number?: string;
    bank_name?: string;
    role?: string;
    status?: string;
    affiliate_code?: string;
  }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.status === 504 || res.status === 502) {
        return {
          success: false,
          isTimeout: true,
          error: 'Chưa nhận được kết quả đăng ký. Vui lòng kiểm tra email trước khi thử lại.',
        };
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: 'Phản hồi đăng ký không hợp lệ từ máy chủ.' };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return {
          success: false,
          isTimeout: true,
          error: 'Chưa nhận được kết quả đăng ký. Vui lòng kiểm tra email trước khi thử lại.',
        };
      }
      return {
        success: false,
        error: err.message || 'Lỗi kết nối máy chủ xác thực.',
      };
    }
  },

  async registerAffiliate(payload: any) {
    return this.register(payload);
  },

  async getAffiliateProfile(): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch('/api/v1/affiliate/profile');
  },

  async getUserProfile(): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    return apiFetch('/api/v1/user/profile');
  },

  async updateAffiliateProfile(payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch('/api/v1/affiliate/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateUserProfile(payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch('/api/v1/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { current_password: string; new_password: string; confirm_password: string }): Promise<{ success: boolean; message?: string; error?: string }> {
    return apiFetch('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAvatar(image: string): Promise<{ success: boolean; data?: { avatar_url: string }; error?: string }> {
    return apiFetch('/api/v1/user/avatar', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  },

  async resendVerification(email: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: 'Phản hồi không hợp lệ từ máy chủ.' };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        success: false,
        error: 'Không thể gửi lại email do quá thời gian kết nối. Vui lòng thử lại.',
      };
    }
  },

  // --------------------------------------------------------------------------
  // E1 - PUBLIC ENDPOINTS
  // --------------------------------------------------------------------------
  async getPublicCourses(): Promise<{ success: boolean; data: Course[] }> {
    return apiFetch('/api/v1/public/courses');
  },

  async getPublicCourse(slug: string): Promise<{ success: boolean; data?: Course; error?: string }> {
    return apiFetch(`/api/v1/public/courses/${encodeURIComponent(slug)}`);
  },

  async getPublicAffiliateReferrer(refCode: string): Promise<{ success: boolean; data?: { full_name: string; affiliate_code: string }; error?: string }> {
    return apiFetch(`/api/v1/public/affiliate-referrer?ref=${encodeURIComponent(refCode)}`);
  },

  async submitLead(payload: any): Promise<any> {
    return apiFetch('/api/v1/public/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // E2 - AFFILIATE ENDPOINTS
  // --------------------------------------------------------------------------
  async getAffiliateDashboard() {
    return apiFetch('/api/v1/affiliate/dashboard');
  },

  async getAffiliateCourses(): Promise<{ success: boolean; data: any[] }> {
    return apiFetch('/api/v1/affiliate/courses');
  },

  async getAffiliateCourseDetail(courseId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch(`/api/v1/affiliate/courses/${encodeURIComponent(courseId)}`);
  },

  async getAffiliateLeads(params?: {
    search?: string;
    course_id?: string;
    status?: string;
    admission_status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: any[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.course_id && params.course_id !== 'ALL') q.set('course_id', params.course_id);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.admission_status && params.admission_status !== 'ALL') q.set('admission_status', params.admission_status);
    if (params?.from_date) q.set('from_date', params.from_date);
    if (params?.to_date) q.set('to_date', params.to_date);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch(`/api/v1/affiliate/leads${qs ? `?${qs}` : ''}`);
  },

  async getAffiliateLeadDetail(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch(`/api/v1/affiliate/leads/${encodeURIComponent(id)}`);
  },

  async getAffiliateLeadHistory(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return apiFetch(`/api/v1/affiliate/leads/${encodeURIComponent(id)}/history`);
  },

  async getAffiliateRewards(): Promise<{ success: boolean; data: any[] }> {
    return apiFetch('/api/v1/affiliate/rewards');
  },

  // --------------------------------------------------------------------------
  // E3 - ADMIN & STAFF ENDPOINTS
  // --------------------------------------------------------------------------
  async getAdminAffiliates(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: any[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'ALL') query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/api/v1/admin/affiliates${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch(url);
  },

  async getAffiliateDetail(id: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}`);
  },

  async updateAffiliateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REJECTED', review_note?: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, review_note }),
    });
  },

  async approveAffiliate(id: string, review_note?: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_note }),
    });
  },

  async rejectAffiliate(id: string, review_note: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ review_note }),
    });
  },

  async suspendAffiliate(id: string, reason: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reactivateAffiliate(id: string, note?: string) {
    return apiFetch(`/api/v1/admin/affiliates/${id}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async updateSystemRole(affiliateId: string, role: 'staff' | 'affiliate', reason: string): Promise<{
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    code?: string;
  }> {
    return apiFetch(`/api/v1/admin/affiliates/${affiliateId}/system-role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, reason }),
    });
  },

  async lookupAffiliates(params: { q?: string; id?: string; limit?: number }): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      affiliate_code: string;
      full_name: string;
      email: string;
      phone: string;
      status: string;
    }>;
    message?: string;
    error?: string;
  }> {
    const p = new URLSearchParams();
    if (params.q) p.set('q', params.q);
    if (params.id) p.set('id', params.id);
    if (params.limit) p.set('limit', String(params.limit));
    const qs = p.toString();
    return apiFetch(`/api/v1/admin/affiliates/lookup${qs ? `?${qs}` : ''}`);
  },

  async getAdminCourses(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Course[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    error?: string;
  }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch(`/api/v1/admin/courses${qs ? `?${qs}` : ''}`);
  },

  async uploadCourseThumbnail(imageBase64: string, fileName: string) {
    return apiFetch('/api/v1/admin/courses/upload', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, fileName }),
    });
  },

  async getCourseById(id: string): Promise<{ success: boolean; data?: Course; error?: string }> {
    return apiFetch(`/api/v1/admin/courses/${id}`);
  },

  async createCourse(payload: any) {
    return apiFetch('/api/v1/admin/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateCourse(id: string, payload: any) {
    return apiFetch(`/api/v1/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateCourseStatus(id: string, payload: any) {
    return apiFetch(`/api/v1/admin/courses/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getAdminLeads(params?: {
    search?: string;
    course_id?: string;
    status?: string;
    admission_status?: string;
    reconciliation_status?: string;
    source_type?: string;
    affiliate_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Lead[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.course_id && params.course_id !== 'ALL') q.set('course_id', params.course_id);
    if (params?.status && params.status !== 'ALL') q.set('status', params.status);
    if (params?.admission_status && params.admission_status !== 'ALL') q.set('admission_status', params.admission_status);
    if (params?.reconciliation_status && params.reconciliation_status !== 'ALL') q.set('reconciliation_status', params.reconciliation_status);
    if (params?.source_type && params.source_type !== 'ALL') q.set('source_type', params.source_type);
    if (params?.affiliate_id && params.affiliate_id !== 'ALL') q.set('affiliate_id', params.affiliate_id);
    if (params?.from_date) q.set('from_date', params.from_date);
    if (params?.to_date) q.set('to_date', params.to_date);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return apiFetch(`/api/v1/admin/leads${qs ? `?${qs}` : ''}`);
  },

  async getAdminLeadDetail(id: string): Promise<{ success: boolean; data?: Lead; error?: string }> {
    return apiFetch(`/api/v1/admin/leads/${encodeURIComponent(id)}`);
  },

  async updateLeadCare(id: string, payload: {
    counseling_status?: string;
    note?: string;
    counselor_note?: string;
    client_updated_at?: string;
  }) {
    return apiFetch(`/api/v1/admin/leads/${encodeURIComponent(id)}/care`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateCounselingStatus(id: string, counseling_status: string, counselor_note?: string, client_updated_at?: string) {
    return apiFetch(`/api/v1/admin/leads/${encodeURIComponent(id)}/care`, {
      method: 'PATCH',
      body: JSON.stringify({ counseling_status, counselor_note, client_updated_at }),
    });
  },

  async reconcileLead(id: string, payload: any, idempotencyKey?: string) {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiFetch(`/api/v1/admin/leads/${id}/reconcile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async voidReconciliation(id: string, payload: {
    void_reason: string;
    target_reconciliation_id?: string;
    client_updated_at?: string;
  } | string, idempotencyKey?: string) {
    const bodyObj = typeof payload === 'string' ? { void_reason: payload } : payload;
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiFetch(`/api/v1/admin/leads/${id}/void-reconciliation`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj),
    });
  },

  async getLeadHistory(id: string) {
    return apiFetch(`/api/v1/admin/leads/${id}/history`);
  },

  async getAdminRewards(): Promise<{ success: boolean; data: any[] }> {
    return apiFetch('/api/v1/admin/rewards');
  },

  async approveReward(id: string) {
    return apiFetch(`/api/v1/admin/rewards/${id}/approve`, {
      method: 'POST',
    });
  },

  async rejectReward(id: string, rejection_reason: string) {
    return apiFetch(`/api/v1/admin/rewards/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    });
  },

  async getAdminAuditLogs(): Promise<{ success: boolean; data: any[] }> {
    return apiFetch('/api/v1/admin/audit-logs');
  },

  async getHomepageConfig(): Promise<{
    success: boolean;
    data?: {
      logo_url?: string;
      logo_alt?: string;
      hotline?: string;
      footer_text?: string;
      hero_background_url?: string;
      hero_background_alt?: string;
      hero_illustration_url?: string;
      hero_illustration_alt?: string;
      layout_blocks?: Array<{ id: string; name: string; enabled: boolean; order: number }>;
    };
    error?: string;
  }> {
    return apiFetch('/api/v1/public/homepage-config');
  },

  async getAdminHomepageConfig() {
    return apiFetch('/api/v1/admin/homepage-config');
  },

  async updateHomepageConfig(payload: any) {
    return apiFetch('/api/v1/admin/homepage-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async publishHomepageConfig() {
    return apiFetch('/api/v1/admin/homepage-config/publish', {
      method: 'POST',
    });
  },

  async restoreHomepageVersion(versionNumber: number) {
    return apiFetch('/api/v1/admin/homepage-config/restore', {
      method: 'POST',
      body: JSON.stringify({ version_number: versionNumber }),
    });
  },

  async uploadHomepageLogo(imageBase64: string, fileName: string) {
    return apiFetch('/api/v1/admin/homepage-assets/upload', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, fileName }),
    });
  },

  getExportRewardsCsvUrl() {
    return '/api/v1/admin/reports/rewards-export';
  },

  // ----------------------------------------------------------------------------
  // A7 – SYSTEM ADMINISTRATION API CLIENT METHODS
  // ----------------------------------------------------------------------------

  async getPublicSystemInfo(): Promise<{
    success: boolean;
    data?: import('../types').PublicSystemInfo;
    error?: string;
  }> {
    return apiFetch('/api/v1/public/system-info');
  },

  async getPublicActiveRegulation(versionId?: string): Promise<{
    success: boolean;
    outdated?: boolean;
    message?: string;
    data?: {
      id: string;
      version_code: string;
      title: string;
      effective_date: string;
      file_size_bytes: number;
      download_url: string;
    };
    requested_regulation?: any;
    error?: string;
  }> {
    const url = versionId ? `/api/v1/public/active-regulation?version=${encodeURIComponent(versionId)}` : '/api/v1/public/active-regulation';
    return apiFetch(url);
  },

  async getAdminSystemSettings(): Promise<{
    success: boolean;
    data?: {
      settings: import('../types').SystemSettings;
      code_generator_stats: import('../types').CodeGeneratorStats;
    };
    error?: string;
  }> {
    return apiFetch('/api/v1/admin/system-settings');
  },

  async updateAdminSystemSettingsGroup(
    group: 'branding' | 'operation' | 'registration' | 'affiliate_code',
    payload: {
      expected_revision: number;
      data: Record<string, any>;
      reason?: string;
    }
  ): Promise<{
    success: boolean;
    message?: string;
    new_revision?: number;
    data?: import('../types').SystemSettings;
    error?: string;
    code?: string;
  }> {
    return apiFetch(`/api/v1/admin/system-settings/${group}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async uploadAdminSystemAsset(payload: {
    type: 'logo' | 'favicon' | 'regulation';
    file_base64: string;
    file_name: string;
    mime_type: string;
  }): Promise<{
    success: boolean;
    asset_path?: string;
    file_size?: number;
    mime_type?: string;
    checksum_sha256?: string;
    error?: string;
  }> {
    return apiFetch('/api/v1/admin/system-settings/upload-asset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminSystemRegulations(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    success: boolean;
    data?: import('../types').SystemRegulation[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return apiFetch(`/api/v1/admin/system-regulations${qs ? `?${qs}` : ''}`);
  },

  async createAdminSystemRegulation(payload: {
    version_code: string;
    title: string;
    pdf_storage_path: string;
    file_size_bytes: number;
    checksum_sha256?: string;
    effective_date: string;
  }): Promise<{
    success: boolean;
    message?: string;
    data?: import('../types').SystemRegulation;
    error?: string;
  }> {
    return apiFetch('/api/v1/admin/system-regulations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async applyAdminSystemRegulation(
    id: string,
    payload?: { reason?: string }
  ): Promise<{
    success: boolean;
    message?: string;
    data?: import('../types').SystemRegulation;
    error?: string;
  }> {
    return apiFetch(`/api/v1/admin/system-regulations/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  async getAdminSystemSettingsHistory(params?: {
    page?: number;
    limit?: number;
    group?: string;
  }): Promise<{
    success: boolean;
    data?: import('../types').SystemSettingsHistory[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
    error?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.group) query.set('group', params.group);
    const qs = query.toString();
    return apiFetch(`/api/v1/admin/system-settings/history${qs ? `?${qs}` : ''}`);
  },

  async rollbackAdminSystemSettings(payload: {
    group: 'branding' | 'operation' | 'affiliate_code';
    source_revision: number;
    expected_revision: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    new_revision?: number;
    data?: import('../types').SystemSettings;
    error?: string;
    code?: string;
  }> {
    return apiFetch('/api/v1/admin/system-settings/rollback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAffiliateRegulationConsent(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return apiFetch('/api/v1/affiliate/regulation-consent');
  },

  async getAdminRegulationPdfBlob(id: string): Promise<Blob> {
    const res = await fetch(`/api/v1/admin/regulations/${id}/download`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let errText = 'Không thể tải tệp PDF quy chế từ máy chủ.';
      try {
        const json = await res.json();
        if (json && json.error) errText = json.error;
      } catch {}
      throw new Error(errText);
    }
    return res.blob();
  },

  async getAffiliateRegulationPdfBlob(id: string): Promise<Blob> {
    const res = await fetch(`/api/v1/affiliate/regulations/${id}/download`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let errText = 'Không thể tải tệp PDF quy chế từ máy chủ.';
      try {
        const json = await res.json();
        if (json && json.error) errText = json.error;
      } catch {}
      throw new Error(errText);
    }
    return res.blob();
  },
};

