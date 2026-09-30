/**
 * TypeScript Data Models for STHC Affiliate & Admission Management System
 */

export type UserRole = 'public' | 'affiliate' | 'staff' | 'admin';

export type AffiliateStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export type CounselingStatus = 'NEW' | 'CONTACTED' | 'CONSULTING' | 'UNREACHABLE' | 'LOST';

export type ReconciliationStatus = 
  | 'NOT_RECONCILED' 
  | 'MATCHED_VALID' 
  | 'EXISTING_IN_SCHOOL_SYSTEM' 
  | 'MISMATCH_INVALID' 
  | 'VOIDED';

export type RewardStatus = 'NONE' | 'PENDING_APPROVAL' | 'APPROVED' | 'VOIDED' | 'REJECTED';

export interface Course {
  id: string;
  code: string;
  title: string;
  slug: string;
  department: string;
  degree_level: string;
  duration_text: string;
  tuition_fee_estimate: number;
  summary: string;
  description_html: string;
  thumbnail_url?: string;
  brochure_url?: string;
  is_active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'affiliate' | 'staff' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface AffiliateProfile {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: AffiliateStatus;
  id_card_number?: string;
  occupation?: string;
  address?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
  profile?: Profile;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string; // Unmasked for staff/admin
  phone_masked?: string; // e.g. 090812**** for affiliates
  email?: string;
  province?: string;
  course_id?: string;
  affiliate_id?: string;
  affiliate_code_captured?: string;
  counseling_status: CounselingStatus;
  reconciliation_status: ReconciliationStatus;
  reward_status: RewardStatus;
  is_duplicate: boolean;
  duplicate_reason?: string;
  consent_accepted: boolean;
  preferred_contact_time?: string;
  customer_note?: string;
  counselor_note?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  affiliate?: AffiliateProfile;
}

export interface LeadReconciliation {
  id: string;
  lead_id: string;
  staff_id: string;
  external_admission_code: string;
  external_student_code?: string;
  tuition_fee_collected: number;
  receipt_number?: string;
  tuition_paid_at: string;
  reconciliation_status: ReconciliationStatus;
  staff_note?: string;
  void_reason?: string;
  voided_by?: string;
  voided_at?: string;
  reconciled_at: string;
  staff_profile?: Profile;
}

export interface Reward {
  id: string;
  lead_id: string;
  reconciliation_id?: string;
  affiliate_id: string;
  amount: number; // 500000.00
  status: RewardStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  void_reason?: string;
  voided_by?: string;
  voided_at?: string;
  created_at: string;
  updated_at: string;
  lead?: Lead;
  affiliate?: AffiliateProfile;
  approver_profile?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  reason?: string;
  created_at: string;
  actor_profile?: Profile;
}

export interface AffiliateDashboardMetrics {
  affiliate_code: string;
  affiliate_status: AffiliateStatus;
  total_leads_referred: number;
  enrolled_valid_leads: number;
  pending_reward_count: number;
  approved_reward_count: number;
  approved_reward_amount: number;
}

export interface CurrentUserSession {
  user: Profile;
  affiliate?: AffiliateProfile;
  activeRole: UserRole;
}
