/**
 * Client API Service for STHC Affiliate & Admission Management System
 */

import { Course, AffiliateProfile, Lead, Reward, AuditLog } from '../types';

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
    occupation?: string;
    address?: string;
    role?: string;
    status?: string;
    affiliate_code?: string;
  }) {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async registerAffiliate(payload: {
    full_name: string;
    email: string;
    phone: string;
    password?: string;
    confirm_password?: string;
    terms_accepted?: boolean;
    id_card_number?: string;
    occupation?: string;
    address?: string;
    role?: string;
    status?: string;
    affiliate_code?: string;
  }) {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // --------------------------------------------------------------------------
  // E1 - PUBLIC ENDPOINTS
  // --------------------------------------------------------------------------
  async getPublicCourses(): Promise<{ success: boolean; data: Course[] }> {
    const res = await fetch('/api/v1/public/courses');
    return res.json();
  },

  async getPublicCourse(slug: string): Promise<{ success: boolean; data: Course }> {
    const res = await fetch(`/api/v1/public/courses/${slug}`);
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
  }) {
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
  async getAdminAffiliates(): Promise<{ success: boolean; data: AffiliateProfile[] }> {
    const res = await fetch('/api/v1/admin/affiliates');
    return res.json();
  },

  async updateAffiliateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REJECTED', review_note?: string) {
    const res = await fetch(`/api/v1/admin/affiliates/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, review_note }),
    });
    return res.json();
  },

  async getAdminCourses(): Promise<{ success: boolean; data: Course[] }> {
    const res = await fetch('/api/v1/admin/courses');
    return res.json();
  },

  async updateCourse(id: string, payload: { is_active?: boolean; tuition_fee_estimate?: number }) {
    const res = await fetch(`/api/v1/admin/courses/${id}`, {
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
