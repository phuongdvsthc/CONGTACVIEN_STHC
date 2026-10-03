/**
 * Client API Service for STHC Affiliate & Admission Management System
 */

import { Course, AffiliateProfile, UserProfile, Lead, Reward, AuditLog } from '../types';

export const api = {
  // --------------------------------------------------------------------------
  // AUTH & SIMULATED SESSION
  // --------------------------------------------------------------------------
  async getMe() {
    const res = await fetch('/api/v1/auth/me');
    return res.json();
  },

  async switchRole(role: 'public' | 'affiliate_pending' | 'affiliate_active' | 'staff' | 'admin') {
    const res = await fetch('/api/v1/auth/switch-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  async login(email: string, password?: string) {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async logout() {
    const res = await fetch('/api/v1/auth/logout', {
      method: 'POST',
    });
    return res.json();
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
        headers: { 'Content-Type': 'application/json' },
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
      return res.json();
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

  async registerAffiliate(payload: {
    full_name: string;
    email: string;
    phone: string;
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
    return this.register(payload);
  },

  async getAffiliateProfile(): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch('/api/v1/affiliate/profile');
    return res.json();
  },

  async getUserProfile(): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    const res = await fetch('/api/v1/user/profile');
    return res.json();
  },

  async updateAffiliateProfile(payload: {
    full_name?: string;
    phone?: string;
    address?: string;
    occupation?: string;
    id_card_number?: string;
    id_card_issued_date?: string;
    bank_account_number?: string;
    bank_name?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch('/api/v1/affiliate/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateUserProfile(payload: {
    address?: string;
    occupation?: string;
    id_card_number?: string;
    id_card_issued_date?: string;
    bank_account_number?: string;
    bank_name?: string;
    tax_code?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch('/api/v1/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateAvatar(image: string): Promise<{ success: boolean; data?: { avatar_url: string }; error?: string }> {
    const res = await fetch('/api/v1/user/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    return res.json();
  },

  async resendVerification(email: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.json();
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
    const res = await fetch('/api/v1/public/courses');
    return res.json();
  },

  async getPublicCourse(slug: string): Promise<{ success: boolean; data?: Course; error?: string }> {
    const res = await fetch(`/api/v1/public/courses/${encodeURIComponent(slug)}`);
    return res.json();
  },

  async getPublicAffiliateReferrer(refCode: string): Promise<{ success: boolean; data?: { full_name: string; affiliate_code: string }; error?: string }> {
    const res = await fetch(`/api/v1/public/affiliate-referrer?ref=${encodeURIComponent(refCode)}`);
    return res.json();
  },

  async submitLead(payload: {
    full_name: string;
    phone: string;
    email?: string;
    province?: string;
    course_id?: string;
    preferred_contact_time?: string;
    customer_note?: string;
    consent_accepted: boolean;
    ref_code?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }): Promise<{
    success: boolean;
    message: string;
    appointment_code?: string;
    course_title?: string | null;
    official_registration_url?: string | null;
    error?: string;
  }> {
    const res = await fetch('/api/v1/public/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // --------------------------------------------------------------------------
  // E2 - AFFILIATE ENDPOINTS
  // --------------------------------------------------------------------------
  async getAffiliateDashboard() {
    const res = await fetch('/api/v1/affiliate/dashboard');
    return res.json();
  },

  async getAffiliateCourses(): Promise<{ success: boolean; data: (Course & { referral_url: string; affiliate_code: string })[] }> {
    const res = await fetch('/api/v1/affiliate/courses');
    return res.json();
  },

  async getAffiliateCourseDetail(courseId: string): Promise<{ success: boolean; data?: Course & { referral_url: string; affiliate_code: string }; error?: string }> {
    const res = await fetch(`/api/v1/affiliate/courses/${encodeURIComponent(courseId)}`);
    return res.json();
  },

  async getAffiliateLeads(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/v1/affiliate/leads');
    return res.json();
  },

  async getAffiliateRewards(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/v1/affiliate/rewards');
    return res.json();
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
    const res = await fetch(url);
    return res.json();
  },

  async getAffiliateDetail(id: string) {
    try {
      const res = await fetch(`/api/v1/admin/affiliates/${id}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  },

  async updateAffiliateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REJECTED', review_note?: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, review_note }),
    });
    return res.json();
  },

  async approveAffiliate(id: string, review_note?: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_note }),
    });
    return res.json();
  },

  async rejectAffiliate(id: string, review_note: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_note }),
    });
    return res.json();
  },

  async suspendAffiliate(id: string, reason: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  async reactivateAffiliate(id: string, note?: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/reactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    return res.json();
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
    const res = await fetch(`/api/v1/admin/courses${qs ? `?${qs}` : ''}`);
    return res.json();
  },

  async uploadCourseThumbnail(imageBase64: string, fileName: string) {
    const res = await fetch('/api/v1/admin/courses/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, fileName }),
    });
    return res.json();
  },

  async getCourseById(id: string): Promise<{ success: boolean; data?: Course; error?: string }> {
    const res = await fetch(`/api/v1/admin/courses/${id}`);
    return res.json();
  },

  async createCourse(payload: {
    code: string;
    title: string;
    degree_level: string;
    duration_text: string;
    career_group?: string | null;
    tuition_fee_estimate?: number | null;
    summary?: string | null;
    description_html?: string | null;
    benefits_title?: string | null;
    benefits_content?: string | null;
    thumbnail_url?: string | null;
    official_registration_url?: string | null;
  }) {
    const res = await fetch('/api/v1/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateCourse(id: string, payload: {
    code?: string;
    title?: string;
    degree_level?: string;
    duration_text?: string;
    career_group?: string | null;
    tuition_fee_estimate?: number | null;
    summary?: string | null;
    description_html?: string | null;
    benefits_title?: string | null;
    benefits_content?: string | null;
    thumbnail_url?: string | null;
    official_registration_url?: string | null;
    is_active?: boolean;
    client_updated_at?: string;
  }) {
    const res = await fetch(`/api/v1/admin/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async updateCourseStatus(id: string, payload: {
    action: 'PUBLISH' | 'STOP_REFERRAL' | 'REOPEN_REFERRAL';
    reason?: string;
    note?: string;
  }) {
    const res = await fetch(`/api/v1/admin/courses/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getAdminLeads(): Promise<{ success: boolean; data: Lead[] }> {
    const res = await fetch('/api/v1/admin/leads');
    return res.json();
  },

  async updateCounselingStatus(id: string, counseling_status: string, counselor_note?: string) {
    const res = await fetch(`/api/v1/admin/leads/${id}/counseling-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counseling_status, counselor_note }),
    });
    return res.json();
  },

  async reconcileLead(id: string, payload: {
    external_admission_code: string;
    external_student_code?: string;
    tuition_fee_collected: number;
    receipt_number?: string;
    tuition_paid_at: string;
    staff_note?: string;
  }) {
    const res = await fetch(`/api/v1/admin/leads/${id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async voidReconciliation(id: string, void_reason: string) {
    const res = await fetch(`/api/v1/admin/leads/${id}/void-reconciliation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ void_reason }),
    });
    return res.json();
  },

  async getLeadHistory(id: string) {
    const res = await fetch(`/api/v1/admin/leads/${id}/history`);
    return res.json();
  },

  async getAdminRewards(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/v1/admin/rewards');
    return res.json();
  },

  async approveReward(id: string) {
    const res = await fetch(`/api/v1/admin/rewards/${id}/approve`, {
      method: 'POST',
    });
    return res.json();
  },

  async rejectReward(id: string, rejection_reason: string) {
    const res = await fetch(`/api/v1/admin/rewards/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason }),
    });
    return res.json();
  },

  async getAdminAuditLogs(): Promise<{ success: boolean; data: any[] }> {
    const res = await fetch('/api/v1/admin/audit-logs');
    return res.json();
  },

  getExportRewardsCsvUrl() {
    return '/api/v1/admin/reports/rewards-export';
  },
};
