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

export type CourseStatus = 'DRAFT' | 'ACTIVE' | 'STOPPED';

export interface Course {
  id: string;
  code: string;
  title: string;
  slug: string;
  department: string;
  degree_level: string;
  career_group?: string | null;
  duration_text: string;
  tuition_fee_estimate: number | null;
  summary?: string | null;
  description_html?: string | null;
  benefits_title?: string | null;
  benefits_content?: string | null;
  thumbnail_url?: string | null;
  brochure_url?: string | null;
  is_active: boolean;
  accepts_referrals?: boolean;
  status?: CourseStatus;
  stop_reason?: string | null;
  status_note?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  sort_order: number;
  registered_count?: number | null;
  official_registration_url?: string | null;
  referral_url?: string | null;
  referral_url_error?: string | null;
  affiliate_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'affiliate' | 'staff' | 'admin';
  is_active: boolean;
  tax_code?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AffiliateProfile {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: AffiliateStatus;
  id_card_number?: string;
  id_card_issued_date?: string;
  occupation?: string;
  address?: string;
  bank_account_number?: string;
  bank_name?: string;
  tax_code?: string | null;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
  suspended_by?: string;
  suspended_at?: string;
  suspension_reason?: string;
  reactivated_by?: string;
  reactivated_at?: string;
  reactivation_note?: string;
  created_at: string;
  updated_at?: string;
  profile?: Profile;
  reviewer?: {
    id: string;
    full_name: string;
    email?: string;
  };
  suspender?: {
    id: string;
    full_name: string;
    email?: string;
  };
  reactivator?: {
    id: string;
    full_name: string;
    email?: string;
  };
  email_verified?: boolean;
  audit_logs?: any[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: 'affiliate' | 'staff' | 'admin';
  is_active: boolean;
  email_verified?: boolean;
  tax_code?: string | null;
  address?: string | null;
  created_at: string;
  updated_at?: string | null;

  // CTV-specific fields (undefined for Admin/Staff)
  affiliate_code?: string;
  affiliate_status?: AffiliateStatus;
  id_card_number?: string | null;
  id_card_issued_date?: string | null;
  occupation?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  reviewed_at?: string | null;
  reviewer_name?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  reactivated_at?: string | null;
  reactivation_note?: string | null;
}

export type AdmissionStatus = 'NOT_ENROLLED' | 'ENROLLED' | 'WITHDRAWN';

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
  admission_status?: AdmissionStatus;
  reward_status: RewardStatus;
  is_duplicate: boolean;
  duplicate_reason?: string;
  consent_accepted: boolean;
  preferred_contact_time?: string;
  customer_note?: string;
  counselor_note?: string;
  external_admission_code?: string;
  tuition_fee_collected?: number | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  affiliate?: AffiliateProfile;
  current_reconciliation?: LeadReconciliation;
}

export interface LeadReconciliation {
  id: string;
  lead_id: string;
  staff_id: string;
  course_id?: string;
  course_tuition_fee?: number | null;
  course_tuition_fee_type?: string | null;
  external_admission_code: string;
  external_student_code?: string;
  tuition_fee_collected?: number | null;
  receipt_number?: string;
  tuition_paid_at?: string | null;
  reconciliation_status: ReconciliationStatus;
  admission_status?: AdmissionStatus;
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
  pending_reward_amount?: number;
  approved_reward_count: number;
  approved_reward_amount: number;
}

export interface MonthlyTrendItem {
  month_key: string;
  month_label: string;
  leads_count: number;
  enrolled_count: number;
}

export interface CourseBreakdownItem {
  course_id: string;
  course_code: string;
  course_title: string;
  total_leads: number;
  enrolled_leads: number;
}

export interface RecentLeadItem {
  id: string;
  full_name: string;
  phone_masked: string;
  course_id: string;
  course_title: string;
  created_at: string;
  counseling_status: string;
  admission_status: AdmissionStatus;
  reconciliation_status: ReconciliationStatus;
  has_egov_link: boolean;
  external_admission_code?: string | null;
}

export interface AffiliateDashboardSummaryData {
  affiliate: {
    id: string;
    full_name: string;
    affiliate_code: string;
    status: AffiliateStatus;
    suspension_reason?: string;
  };
  metrics: {
    total_leads: number;
    not_enrolled_leads: number;
    enrolled_leads: number;
    matched_valid_leads: number;
  };
  rewards: {
    pending: {
      amount: number;
      count: number;
    };
    approved: {
      amount: number;
      count: number;
    };
    paid: {
      available: boolean;
      amount: number | null;
      count: number | null;
      reason_code: string;
    };
  };
  monthly_trend: MonthlyTrendItem[];
  course_breakdown: CourseBreakdownItem[];
  recent_leads: RecentLeadItem[];
  metadata: {
    timezone: string;
    generated_at: string;
    data_scope: string;
    payment_tracking_status: string;
    enrolled_missing_date_count?: number;
  };
}

export interface AffiliateLeaderboardItem {
  rank: number;
  display_name: string;
  approved_reward_amount: number;
  is_current_affiliate: boolean;
}

export interface AffiliateLeaderboardData {
  leaderboard: AffiliateLeaderboardItem[];
  metadata: {
    time_scope: string;
    criteria: string;
    generated_at: string;
  };
}

export interface CurrentUserSession {
  user: Profile;
  affiliate?: AffiliateProfile;
  activeRole: UserRole;
}

// ----------------------------------------------------------------------------
// A7 – SYSTEM ADMINISTRATION TYPES
// ----------------------------------------------------------------------------

export interface SystemSettings {
  id: number;
  system_name: string;
  system_short_name: string;
  unit_name: string;
  logo_backend_url?: string | null;
  favicon_url?: string | null;
  logo_backend_display_url?: string | null;
  favicon_display_url?: string | null;
  public_base_url: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  allow_affiliate_registration: boolean;
  registration_closed_message?: string | null;
  affiliate_code_prefix: string;
  affiliate_code_min_digits: number;
  revision: number;
  updated_at: string;
  updated_by?: string | null;
}

export interface PublicSystemInfo {
  system_name: string;
  system_short_name: string;
  unit_name: string;
  logo_backend_url?: string | null;
  favicon_url?: string | null;
  public_base_url: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  allow_affiliate_registration: boolean;
  registration_closed_message?: string | null;
  is_registration_open: boolean;
}

export interface SystemRegulation {
  id: string;
  version_code: string;
  title: string;
  pdf_storage_path: string;
  file_size_bytes: number;
  checksum_sha256?: string | null;
  effective_date: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';
  created_by: string;
  created_at: string;
  published_by?: string | null;
  published_at?: string | null;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  };
  publisher?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface SystemSettingsHistory {
  id: string;
  setting_group: 'BRANDING' | 'OPERATION' | 'REGISTRATION' | 'AFFILIATE_CODE' | 'ROLLBACK';
  action_type: 'UPDATE' | 'ROLLBACK' | 'APPLY_REGULATION';
  revision: number;
  previous_data: any;
  new_data: any;
  changed_by: string;
  changed_at: string;
  change_reason?: string | null;
  source_revision?: number | null;
  actor?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CodeGeneratorStats {
  preview_code: string;
  expected_sequence_number: number;
  prefix: string;
  min_digits: number;
  total_issued_in_registry: number;
  sequence_active: boolean;
}

// ----------------------------------------------------------------------------
// A9 — ADMIN DASHBOARD TYPES & CONTRACTS
// ----------------------------------------------------------------------------
export type AdminDashboardPeriod = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM';

export interface AdminDashboardSummaryFilters {
  period: AdminDashboardPeriod;
  from_date: string | null;
  to_date: string | null;
  start_utc: string | null;
  end_utc_exclusive: string | null;
  course_id: string;
  affiliate_id: string;
}

export interface AdminDashboardRecruitmentMetrics {
  total_leads: number;
  not_enrolled_leads: number;
  enrolled_leads: number;
  withdrawn_leads: number;
  enrollment_rate: number | null;
  egov_active_leads: number;
  matched_valid_leads: number;
}

export interface AdminDashboardAffiliateNetworkMetrics {
  total_affiliates: number;
  active_affiliates: number;
  pending_affiliates: number;
  suspended_affiliates: number;
  rejected_affiliates: number;
}

export interface AdminDashboardBacklogMetrics {
  pending_affiliates: number;
  new_leads_to_contact: number;
  pending_reconciliation_leads: number;
}

export interface AdminDashboardMetadata {
  timezone: string;
  generated_at: string;
  data_scope: string;
  recruitment_scope: string;
  network_scope: string;
  backlog_scope: string;
}

export interface AdminDashboardRewardAmountCount {
  amount: number;
  count: number;
}

export interface AdminDashboardPaidRewardStatus {
  available: false;
  amount: null;
  count: null;
  reason_code: 'PAYMENT_TRACKING_NOT_AVAILABLE';
}

export interface AdminDashboardRewardsAuthorizedMetadata {
  currency: 'VND';
  pending_scope: 'SYSTEM_WIDE_ALL_TIME';
  approved_period_scope: 'SYSTEM_WIDE_SELECTED_APPROVAL_PERIOD';
  approved_all_scope: 'SYSTEM_WIDE_ALL_TIME';
  approved_missing_date_count: number;
}

export interface AdminDashboardRewardsMetricsAuthorized {
  available: true;
  pending_all: AdminDashboardRewardAmountCount;
  approved_period: AdminDashboardRewardAmountCount;
  approved_all: AdminDashboardRewardAmountCount;
  paid: AdminDashboardPaidRewardStatus;
  metadata: AdminDashboardRewardsAuthorizedMetadata;
}

export interface AdminDashboardRewardsMetricsDenied {
  available: false;
  reason_code: 'PERMISSION_DENIED';
  pending_all: null;
  approved_period: null;
  approved_all: null;
  paid: null;
  metadata?: never;
}

export type AdminDashboardRewardsMetrics = AdminDashboardRewardsMetricsAuthorized | AdminDashboardRewardsMetricsDenied;

export interface AdminDashboardMonthlyTrendPoint {
  month_key: string;
  month_label: string;
  leads_count: number;
  enrolled_count: number;
}

export interface AdminDashboardMonthlyTrendMetadata {
  scope: string;
  timezone: string;
  enrolled_missing_date_count: number;
}

export interface AdminDashboardMonthlyTrend {
  points: AdminDashboardMonthlyTrendPoint[];
  metadata: AdminDashboardMonthlyTrendMetadata;
}

export interface AdminDashboardCourseStat {
  course_id: string | null;
  course_code: string;
  course_title: string;
  total_leads: number;
  enrolled_leads: number;
  enrollment_rate: number | null;
}

export interface AdminDashboardCourseBreakdownMetadata {
  scope: string;
  total_courses: number;
}

export interface AdminDashboardCourseBreakdown {
  courses: AdminDashboardCourseStat[];
  metadata: AdminDashboardCourseBreakdownMetadata;
}

export interface AdminDashboardRecentLead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  course_id: string | null;
  course_code: string | null;
  course_title: string | null;
  affiliate_id: string | null;
  affiliate_code: string | null;
  affiliate_name: string | null;
  counseling_status: string;
  admission_status: 'ENROLLED' | 'NOT_ENROLLED' | 'WITHDRAWN';
  reconciliation_status: string | null;
  created_at: string;
}

export interface AdminDashboardRecentLeadsMetadata {
  scope: string;
  total_returned: number;
}

export interface AdminDashboardRecentLeads {
  leads: AdminDashboardRecentLead[];
  metadata: AdminDashboardRecentLeadsMetadata;
}

export interface AdminDashboardLeaderboardItem {
  rank: number;
  affiliate_id: string;
  user_id?: string;
  affiliate_code: string;
  affiliate_name: string;
  approved_reward_amount: number;
  approved_reward_count: number;
}

export interface AdminDashboardLeaderboardMetadata {
  scope: string;
  criteria: string;
  total_returned: number;
}

export interface AdminDashboardLeaderboardAuthorized {
  available: true;
  items: AdminDashboardLeaderboardItem[];
  metadata: AdminDashboardLeaderboardMetadata;
}

export interface AdminDashboardLeaderboardDenied {
  available: false;
  reason_code: 'PERMISSION_DENIED';
  items: null;
  metadata?: never;
}

export type AdminDashboardLeaderboard = AdminDashboardLeaderboardAuthorized | AdminDashboardLeaderboardDenied;

export interface AdminDashboardSummaryData {
  filters: AdminDashboardSummaryFilters;
  recruitment: AdminDashboardRecruitmentMetrics;
  affiliate_network: AdminDashboardAffiliateNetworkMetrics;
  backlog: AdminDashboardBacklogMetrics;
  rewards: AdminDashboardRewardsMetrics;
  monthly_trend: AdminDashboardMonthlyTrend;
  course_breakdown: AdminDashboardCourseBreakdown;
  recent_leads: AdminDashboardRecentLeads;
  leaderboard: AdminDashboardLeaderboard;
  metadata: AdminDashboardMetadata;
}

export interface AdminDashboardSummaryResponse {
  success: boolean;
  data?: AdminDashboardSummaryData;
  error?: string;
  code?: string;
}



