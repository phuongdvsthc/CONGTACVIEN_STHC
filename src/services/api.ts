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

  async getAffiliateLeads(): Promise<{ success: boolean; data: any[] }> {
    return apiFetch('/api/v1/affiliate/leads');
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

  async getAdminLeads(): Promise<{ success: boolean; data: Lead[] }> {
    return apiFetch('/api/v1/admin/leads');
  },

  async updateCounselingStatus(id: string, counseling_status: string, counselor_note?: string) {
    return apiFetch(`/api/v1/admin/leads/${id}/counseling-status`, {
      method: 'PATCH',
      body: JSON.stringify({ counseling_status, counselor_note }),
    });
  },

  async reconcileLead(id: string, payload: any) {
    return apiFetch(`/api/v1/admin/leads/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async voidReconciliation(id: string, void_reason: string) {
    return apiFetch(`/api/v1/admin/leads/${id}/void-reconciliation`, {
      method: 'POST',
      body: JSON.stringify({ void_reason }),
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
};
