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
  // C3.11A: Email service configuration
  email_business_enabled?: boolean;
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_secure_mode?: SmtpSecureMode;
  smtp_sender_name?: string | null;
  smtp_sender_email?: string | null;
  smtp_reply_to?: string | null;
  smtp_timeout_ms?: number;
  smtp_username?: string | null;
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
  setting_group: 'BRANDING' | 'OPERATION' | 'REGISTRATION' | 'AFFILIATE_CODE' | 'EMAIL_SERVICE' | 'ROLLBACK';
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

// ----------------------------------------------------------------------------
// C3 — NOTIFICATION & ANNOUNCEMENT MODULE TYPES
// ----------------------------------------------------------------------------

export type NotificationType = 'ANNOUNCEMENT' | 'SYSTEM';

export type NotificationCategory = 
  | 'GENERAL' 
  | 'POLICY' 
  | 'URGENT' 
  | 'EVENT' 
  | 'LEAD' 
  | 'RECONCILIATION' 
  | 'REWARD' 
  | 'ACCOUNT';

export type NotificationStatus = 'DRAFT' | 'PUBLISHED' | 'REVOKED';

export type NotificationRecipientScope = 'ALL' | 'STATUS_FILTER' | 'SPECIFIC';

export type NotificationEventType =
  | 'AFFILIATE_REGISTERED'
  | 'AFFILIATE_APPROVED'
  | 'AFFILIATE_REJECTED'
  | 'AFFILIATE_SUSPENDED'
  | 'AFFILIATE_REACTIVATED'
  | 'LEAD_SUBMITTED'
  | 'LEAD_COUNSELING_UPDATED'
  | 'ENROLLMENT_MATCHED'
  | 'ENROLLMENT_VOIDED'
  | 'REWARD_APPROVED'
  | 'REWARD_REJECTED'
  | 'REWARD_VOIDED';

export type NotificationPermissionCode =
  | 'notifications.view'
  | 'notifications.create'
  | 'notifications.publish'
  | 'notifications.revoke';

export interface NotificationRecipientFilter {
  status?: AffiliateStatus[];
  affiliate_ids?: string[];
  [key: string]: any;
}

/**
 * Entity bảng public.notifications
 * Lưu trữ nội dung gốc của thông báo / bản tin
 */
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  summary?: string | null;
  content: string;
  action_url?: string | null;
  recipient_scope: NotificationRecipientScope;
  recipient_filter: NotificationRecipientFilter;
  status: NotificationStatus;
  published_at?: string | null;
  published_by?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  event_type?: NotificationEventType | string | null;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, any>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Entity bảng public.notification_recipients
 * Lưu trữ liên kết người nhận và mốc thời gian đọc
 * Nguồn duy nhất xác định đã đọc: read_at IS NOT NULL
 */
export interface NotificationRecipient {
  id: string;
  notification_id: string;
  user_id: string;
  read_at?: string | null;
  created_at: string;
}

/**
 * DTO dữ liệu hiển thị hòm thư CTV (Tab 1 BQT & Tab 2 Hệ thống)
 * is_read được suy ra từ (read_at !== null)
 */
export interface NotificationItemDTO {
  id: string; // ID bản ghi phân phối người nhận (recipient id) - giữ tương thích
  recipient_id: string; // Tường minh định danh bản ghi người nhận
  notification_id: string; // Định danh thông báo gốc
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  summary?: string | null;
  content: string;
  action_url?: string | null;
  read_at: string | null;
  is_read: boolean;
  event_type?: string | null;
  created_at: string;
  published_at?: string | null;
}

/**
 * DTO số đếm chưa đọc cho Bell Header và Badge Tab
 */
export interface NotificationUnreadCountDTO {
  total: number;
  announcement_count: number;
  system_count: number;
}

/**
 * DTO phục vụ danh sách quản trị bản tin dành cho Admin / Staff
 */
export interface AdminNotificationListItemDTO {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  summary?: string | null;
  recipient_scope: NotificationRecipientScope;
  status: NotificationStatus;
  published_at?: string | null;
  published_by?: string | null;
  publisher_name?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at?: string;
  total_recipients?: number;
  read_recipients?: number;
  unread_recipients?: number;
}

/**
 * Chi tiết bản tin thông báo Ban quản trị dành cho Admin / Staff (C3.5A)
 */
export interface AdminAnnouncementDetailDTO {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  summary?: string | null;
  content: string;
  action_url?: string | null;
  recipient_scope: NotificationRecipientScope;
  recipient_filter: NotificationRecipientFilter;
  status: NotificationStatus;
  published_at?: string | null;
  published_by?: string | null;
  publisher_name?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revoker_name?: string | null;
  revoke_reason?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
  stats: {
    recipient_count: number;
    read_count: number;
    unread_count: number;
  };
  permissions?: {
    can_edit: boolean;
    can_delete: boolean;
    can_publish: boolean;
    can_revoke: boolean;
  };
}

/**
 * Kết quả xem trước phạm vi người nhận (C3.5A)
 */
export interface RecipientPreviewResult {
  recipient_scope: NotificationRecipientScope;
  recipient_filter: NotificationRecipientFilter;
  total_eligible: number;
  excluded_count: number;
  sample_recipients: Array<{
    affiliate_profile_id: string;
    user_id: string;
    affiliate_code: string;
    full_name: string;
    status: string;
  }>;
}

/**
 * Dữ liệu tạo bản nháp thông báo (C3.5A)
 */
export interface CreateAnnouncementParams {
  title: string;
  summary?: string | null;
  content: string;
  category: 'GENERAL' | 'POLICY' | 'URGENT' | 'EVENT';
  recipient_scope: NotificationRecipientScope;
  recipient_filter?: NotificationRecipientFilter;
  action_url?: string | null;
}

/**
 * Dữ liệu cập nhật bản nháp thông báo (C3.5A)
 */
export interface UpdateAnnouncementParams {
  title?: string;
  summary?: string | null;
  content?: string;
  category?: 'GENERAL' | 'POLICY' | 'URGENT' | 'EVENT';
  recipient_scope?: NotificationRecipientScope;
  recipient_filter?: NotificationRecipientFilter;
  action_url?: string | null;
  expected_updated_at?: string;
}

/**
 * DTO đại diện một người nhận trong danh sách thống kê người nhận bản tin
 */
export interface AnnouncementRecipientItemDTO {
  recipient_id: string;
  user_id: string;
  full_name: string;
  email: string;
  affiliate_code: string;
  read_at: string | null;
  is_read: boolean;
  delivered_at: string;
}

/**
 * DTO đại diện kết quả tìm kiếm CTV để chọn đích danh người nhận
 */
export interface RecipientOptionItemDTO {
  affiliate_profile_id: string;
  user_id: string;
  affiliate_code: string;
  full_name: string;
  email: string;
  status: string;
}

/**
 * Vòng đời sự kiện trong hàng đợi public.notification_events
 */
export type NotificationEventStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'PROCESSED' 
  | 'FAILED' 
  | 'DEAD_LETTER';

/**
 * Entity bảng public.notification_events (Outbox Pattern)
 */
export interface NotificationEvent {
  id: string;
  event_type: NotificationEventType | string;
  source_entity_type: string;
  source_entity_id: string;
  transition_state?: string | null;
  idempotency_key: string;
  recipient_user_id?: string | null;
  payload: Record<string, any>;
  status: NotificationEventStatus;
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  notification_id?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Tham số ghi nhận sự kiện thông báo fn_create_notification_event
 */
export interface CreateNotificationEventParams {
  event_type: NotificationEventType | string;
  source_entity_type: string;
  source_entity_id: string;
  idempotency_key: string;
  recipient_user_id?: string | null;
  payload?: Record<string, any>;
  transition_state?: string | null;
}

/**
 * Kết quả trả về của fn_create_notification_event / fn_process_notification_event
 */
export interface NotificationEventOperationResult {
  success: boolean;
  event_id?: string;
  is_duplicate?: boolean;
  status?: NotificationEventStatus;
  notification_id?: string | null;
  message?: string;
  error?: string;
}

/**
 * Kết quả đánh dấu đã đọc một thông báo fn_mark_notification_as_read (C3.4B)
 */
export interface MarkNotificationAsReadResult {
  notification_id: string;
  recipient_id: string;
  is_read: boolean;
  read_at: string;
  updated_count: number;
}

/**
 * Kết quả đánh dấu đã đọc tất cả thông báo trong một tab fn_mark_all_notifications_as_read (C3.4B)
 */
export interface MarkAllNotificationsAsReadResult {
  tab: NotificationType;
  cutoff_at: string;
  updated_count: number;
  marked_at: string;
}

/**
 * Kết quả đếm số lượng chưa đọc trả về từ fn_get_unread_notification_counts
 */
export interface NotificationUnreadCountsResult {
  total_unread: number;
  announcement_unread: number;
  system_unread: number;
}

// ==============================================================================
// C3.10A: CƠ SỞ DỮ LIỆU HÀNG ĐỢI EMAIL (EMAIL QUEUE & ATTEMPTS)
// ==============================================================================

/**
 * Phân loại mục đích gửi email
 */
export type EmailJobType =
  | 'LEAD_REGISTRATION_CONFIRMATION'
  | 'CTV_NOTIFICATION_EMAIL';

/**
 * Vòng đời trạng thái tác vụ email
 */
export type EmailJobStatus =
  | 'PENDING'       // Chờ worker lấy xử lý
  | 'PROCESSING'    // Worker đang giữ khóa xử lý
  | 'RETRY_WAIT'    // Tạm thời lỗi, chờ đến lịch gửi lại
  | 'BLOCKED'       // Thiếu cấu hình/dữ liệu bắt buộc (chưa gửi)
  | 'SENT'          // SMTP/Dịch vụ gửi đã chấp nhận chuyển thư
  | 'DEAD_LETTER'   // Đã hết số lần thử hoặc lỗi nghiêm trọng
  | 'CANCELLED';    // Tác vụ đã hủy bỏ

/**
 * Trạng thái của từng lần thử gửi
 */
export type EmailJobAttemptStatus =
  | 'PROCESSING'    // Đang thực hiện gửi
  | 'SUCCESS'       // Dịch vụ gửi đã chấp nhận
  | 'FAILED'        // Lỗi xác định từ SMTP/mạng
  | 'UNKNOWN';      // Kết quả không rõ do timeout hoặc mất kết nối

/**
 * Snapshot dữ liệu phục vụ dựng email xác nhận đăng ký lead (C3.10A / C3.11B)
 * Tuyệt đối không chứa thông tin nhạy cảm (mật khẩu, token, secret)
 */
export interface LeadRegistrationEmailPayload {
  customer_name: string;
  phone_masked?: string;
  course_code?: string;
  course_title: string;
  affiliate_code?: string;
  affiliate_name?: string;
  official_registration_url?: string;
  registered_at: string;
  brand_name: string;
  support_email: string;
  support_hotline?: string;
}

/**
 * Snapshot dữ liệu phục vụ dựng email thông báo CTV (C3.10A / C3.13A)
 */
export interface CtvNotificationEmailPayload {
  affiliate_name: string;
  affiliate_code: string;
  notification_title: string;
  notification_summary?: string;
  action_url?: string;
  published_at: string;
  brand_name: string;
  support_email: string;
}

/**
 * DTO đại diện bản ghi tác vụ trong bảng email_jobs
 */
export interface EmailJobDTO {
  id: string;
  email_type: EmailJobType;
  idempotency_key: string;
  recipient_email: string;
  recipient_name?: string | null;
  recipient_user_id?: string | null;
  lead_id?: string | null;
  notification_id?: string | null;
  notification_recipient_id?: string | null;
  original_job_id?: string | null;
  template_code: string;
  template_version: string;
  payload: Record<string, any>;
  status: EmailJobStatus;
  priority: number;
  next_attempt_at: string;
  attempt_count: number;
  max_attempts: number;
  last_error_code?: string | null;
  last_error_message?: string | null;
  blocked_reason?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  locked_until?: string | null;
  lock_token?: string | null;
  sent_at?: string | null;
  provider_message_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * DTO đại diện bản ghi lịch sử lần gửi trong bảng email_job_attempts
 */
export interface EmailJobAttemptDTO {
  id: string;
  email_job_id: string;
  attempt_number: number;
  worker_id?: string | null;
  lock_token?: string | null;
  started_at: string;
  finished_at?: string | null;
  status: EmailJobAttemptStatus;
  error_code?: string | null;
  error_message?: string | null;
  provider_message_id?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Tham số đầu vào để enqueue một tác vụ email
 */
export interface EnqueueEmailJobParams {
  email_type: EmailJobType;
  idempotency_key: string;
  recipient_email: string;
  recipient_name?: string;
  template_code: string;
  template_version?: string;
  payload: Record<string, any>;
  lead_id?: string;
  notification_id?: string;
  notification_recipient_id?: string;
  recipient_user_id?: string;
  priority?: number;
  initial_status?: EmailJobStatus;
  blocked_reason?: string;
}

/**
 * Kết quả trả về sau khi enqueue tác vụ email
 */
export interface EnqueueEmailJobResult {
  success: boolean;
  is_duplicate?: boolean;
  job_id?: string;
  status?: EmailJobStatus;
  message?: string;
  error?: string;
  code?: string;
}

/**
 * Tham số đầu vào cho RPC tạo lead kèm tác vụ email xác nhận nguyên tử (C3.10B)
 */
export interface SubmitLeadAtomicParams {
  full_name: string;
  phone: string;
  email: string;
  course_id: string;
  consent_accepted: boolean;
  affiliate_code?: string | null;
  province?: string | null;
  preferred_contact_time?: string | null;
  customer_note?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  brand_name?: string | null;
  support_email?: string | null;
  support_hotline?: string | null;
}

/**
 * Kết quả trả về từ RPC đăng ký lead kèm tác vụ email xác nhận nguyên tử (C3.10B)
 */
export interface SubmitLeadAtomicResult {
  success: boolean;
  is_duplicate?: boolean;
  lead_id?: string;
  email_job_id?: string | null;
  email_job_status?: EmailJobStatus | null;
  message?: string;
  course_title?: string | null;
  official_registration_url?: string | null;
  affiliate_code?: string | null;
  affiliate_name?: string | null;
  received_at?: string;
  error?: string;
  code?: string;
}

// ==============================================================================
// C3.11A — DỊCH VỤ CẤU HÌNH VÀ GỬI EMAIL NGHIỆP VỤ (SMTP CONFIG & SERVICE)
// ==============================================================================

/**
 * Chế độ bảo mật TLS khi kết nối máy chủ SMTP
 * - STARTTLS: Kết nối không mã hóa ban đầu (thường port 587/25/2525), bắt buộc nâng cấp TLS qua lệnh STARTTLS.
 * - TLS_WRAPPED: Mã hóa TLS ngay khi thiết lập socket (thường port 465).
 * - NONE: Không mã hóa (chỉ dùng cho môi trường thử nghiệm nội bộ / giả lập).
 */
export type SmtpSecureMode = 'STARTTLS' | 'TLS_WRAPPED' | 'NONE';

/**
 * Cấu hình không bí mật của dịch vụ email nghiệp vụ (lưu trong system_settings)
 */
export interface EmailServiceSettings {
  email_business_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure_mode: SmtpSecureMode;
  smtp_sender_name: string;
  smtp_sender_email: string;
  smtp_reply_to?: string | null;
  smtp_timeout_ms: number;
  smtp_username?: string | null;
}

/**
 * Trạng thái credentials SMTP (đọc từ biến môi trường server, không trả về secret)
 */
export interface EmailCredentialsStatus {
  has_credentials: boolean;
  has_username: boolean;
  has_password: boolean;
  username_configured: boolean;
  password_configured: boolean;
}

/**
 * Phản hồi chi tiết về trạng thái cấu hình dịch vụ email nghiệp vụ
 */
export interface EmailServiceStatusResponse {
  settings: EmailServiceSettings;
  credentials_status: EmailCredentialsStatus;
  revision: number;
}

/**
 * Kết quả kiểm tra kết nối máy chủ SMTP
 */
export interface VerifyConnectionResult {
  success: boolean;
  message: string;
  code?: string;
  details?: {
    host: string;
    port: number;
    secure_mode: SmtpSecureMode;
    round_trip_ms?: number;
  };
  error?: string;
}

/**
 * Tham số gửi email thử nghiệm
 */
export interface SendTestEmailParams {
  recipient_email: string;
}

/**
 * Kết quả gửi email thử nghiệm
 */
export interface SendTestEmailResult {
  success: boolean;
  message: string;
  message_id?: string;
  masked_recipient?: string;
  code?: string;
  error?: string;
}

/**
 * Interface trừu tượng cho dịch vụ gửi email
 */
export interface EmailSenderInterface {
  verifyConnection(): Promise<VerifyConnectionResult>;
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    code?: string;
  }>;
}

// ==============================================================================
// C3.11B — QUẢN LÝ MẪU EMAIL (EMAIL TEMPLATES & VERSIONS)
// ==============================================================================

export type EmailTemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface EmailTemplateDTO {
  id: string;
  template_code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateVersionDTO {
  id: string;
  template_id: string;
  version_code: string;
  status: EmailTemplateStatus;
  subject: string;
  body_html: string;
  body_text: string;
  button_label: string;
  footer_text?: string | null;
  revision: number;
  created_by?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  change_reason?: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  publisher?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface EmailTemplateWithVersionsDTO {
  template: EmailTemplateDTO;
  versions: EmailTemplateVersionDTO[];
  active_published_version?: EmailTemplateVersionDTO | null;
}







