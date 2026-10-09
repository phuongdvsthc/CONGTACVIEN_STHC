/**
 * STHC_CTV - Dịch vụ Quản lý & Phát sinh Sự kiện Thông báo Hệ thống (C3.6A)
 * File: /src/services/notificationEventService.ts
 * 
 * Nghiệp vụ phát sinh:
 * - A1.3 Phê duyệt hồ sơ CTV (AFFILIATE_APPROVED)
 * - A1.3 Từ chối hồ sơ CTV (AFFILIATE_REJECTED)
 * - A1.4 Tạm ngưng hoạt động CTV (AFFILIATE_SUSPENDED)
 * - A1.4 Kích hoạt lại CTV (AFFILIATE_REACTIVATED)
 * - A3.1 Khách hàng mới gửi thông tin đăng ký tư vấn (LEAD_SUBMITTED)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationEventConsumer } from './notificationEventConsumer';

export interface AffiliateLifecycleEventParams {
  action: 'AFFILIATE_APPROVED' | 'AFFILIATE_REJECTED' | 'AFFILIATE_SUSPENDED' | 'AFFILIATE_REACTIVATED';
  auditId: string;
  affiliateId: string;
  actorId?: string;
  reason?: string | null;
  affiliateCode?: string | null;
}

export interface LeadSubmittedEventParams {
  leadId: string;
  affiliateId: string;
  leadName: string;
  courseId?: string | null;
  courseName?: string | null;
  affiliateCode?: string | null;
}

export interface EnrollmentMatchedEventParams {
  auditId: string;
  leadId: string;
  affiliateId: string;
  leadName?: string;
  courseId?: string | null;
  courseName?: string | null;
  reconciliationId?: string | null;
  rewardId?: string | null;
  actorId?: string;
}

export interface EnrollmentVoidedEventParams {
  auditId: string;
  leadId: string;
  affiliateId: string;
  leadName?: string;
  courseId?: string | null;
  reconciliationId?: string | null;
  reason?: string | null;
  actorId?: string;
}

export interface RewardApprovedEventParams {
  auditId: string;
  rewardId: string;
  affiliateId: string;
  leadId?: string;
  leadName?: string;
  courseId?: string | null;
  amount?: number;
  actorId?: string;
}

export interface RewardRejectedEventParams {
  auditId: string;
  rewardId: string;
  affiliateId: string;
  leadId?: string;
  leadName?: string;
  amount?: number;
  reason?: string;
  actorId?: string;
}

export interface RewardVoidedEventParams {
  auditId: string;
  rewardId: string;
  affiliateId: string;
  leadId?: string;
  leadName?: string;
  courseId?: string | null;
  amount?: number;
  reason?: string;
  actorId?: string;
}

export class NotificationEventService {
  private supabase: SupabaseClient;
  private consumer: NotificationEventConsumer;

  constructor(supabaseClient: SupabaseClient, consumer?: NotificationEventConsumer) {
    this.supabase = supabaseClient;
    this.consumer = consumer || new NotificationEventConsumer(supabaseClient);
  }

  /**
   * Lấy instance consumer đang chạy
   */
  public getConsumer(): NotificationEventConsumer {
    return this.consumer;
  }

  /**
   * Phát sinh sự kiện vòng đời tài khoản CTV (A1)
   */
  public async emitAffiliateLifecycleEvent(params: AffiliateLifecycleEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { action, auditId, affiliateId, actorId, reason, affiliateCode } = params;

    if (!auditId || !affiliateId) {
      return {
        success: false,
        idempotencyKey: '',
        error: 'Thiếu auditId hoặc affiliateId để tạo sự kiện thông báo.',
      };
    }

    const idempotencyKey = `evt:${action}:${auditId}`;

    try {
      // 1. Ánh xạ affiliate_profile.id sang user_id (profiles.id)
      const { data: affProfile, error: affErr } = await this.supabase
        .from('affiliate_profiles')
        .select(`
          id,
          user_id,
          affiliate_code,
          status,
          profile:profiles!affiliate_profiles_user_id_fkey(id, is_active)
        `)
        .eq('id', affiliateId)
        .maybeSingle();

      if (affErr) {
        console.warn('[NotificationEventService] Lỗi tra cứu hồ sơ CTV:', affErr.message);
      }

      const recipientUserId = affProfile?.user_id;
      if (!recipientUserId) {
        console.warn(`[NotificationEventService] Bỏ qua sự kiện ${idempotencyKey}: Không tìm thấy user_id tương ứng với CTV ${affiliateId}`);
        return {
          success: false,
          idempotencyKey,
          error: 'Không tìm thấy user_id tương ứng với CTV (không gửi cho Admin hoặc người khác).',
        };
      }

      // Snapshot payload an toàn: Tuyệt đối KHÔNG chứa mật khẩu, token, CCCD, thông tin ngân hàng
      const cleanPayload = {
        audit_log_id: auditId,
        affiliate_id: affiliateId,
        affiliate_code: affiliateCode || affProfile?.affiliate_code || null,
        status: affProfile?.status || action,
        reason: reason || null,
        actor_id: actorId || null,
        created_at: new Date().toISOString(),
      };

      // 2. Kiểm tra nếu event với idempotency_key đã tồn tại (chống trùng lặp tuyệt đối)
      const { data: existingEvt } = await this.supabase
        .from('notification_events')
        .select('id, status, notification_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingEvt) {
        // Đã tồn tại -> Trigger consumer xử lý nếu còn PENDING/FAILED
        if (existingEvt.status === 'PENDING' || existingEvt.status === 'FAILED') {
          this.consumer.processBatch().catch(() => {});
        }
        return {
          success: true,
          eventId: existingEvt.id,
          idempotencyKey,
          isDuplicate: true,
        };
      }

      // 3. Chèn bản ghi sự kiện mới vào notification_events
      const { data: insertedEvt, error: insErr } = await this.supabase
        .from('notification_events')
        .insert({
          event_type: action,
          source_entity_type: 'affiliate_profiles',
          source_entity_id: affiliateId,
          transition_state: affProfile?.status || action,
          idempotency_key: idempotencyKey,
          recipient_user_id: recipientUserId,
          payload: cleanPayload,
          status: 'PENDING',
          retry_count: 0,
        })
        .select('id')
        .single();

      if (insErr) {
        // Xử lý race condition nếu bản ghi vừa được chèn bởi tiến trình khác
        if (insErr.code === '23505') {
          return {
            success: true,
            idempotencyKey,
            isDuplicate: true,
          };
        }
        throw new Error(`Lỗi ghi nhận sự kiện: ${insErr.message}`);
      }

      // 4. Kích hoạt xử lý tức thời để người dùng nhận thông báo ngay lập tức
      this.consumer.processBatch().catch((cErr) => {
        console.warn('[NotificationEventService] Lỗi chạy xử lý batch nền:', cErr?.message);
      });

      return {
        success: true,
        eventId: insertedEvt.id,
        idempotencyKey,
        isDuplicate: false,
      };
    } catch (err: any) {
      console.error(`[NotificationEventService] Thất bại khi tạo sự kiện ${action}:`, err?.message);
      return {
        success: false,
        idempotencyKey,
        error: err?.message,
      };
    }
  }

  /**
   * Phát sinh sự kiện khách mới đăng ký tư vấn qua link giới thiệu (A3)
   */
  public async emitLeadSubmittedEvent(params: LeadSubmittedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { leadId, affiliateId, leadName, courseId, courseName, affiliateCode } = params;

    if (!leadId || !affiliateId) {
      return {
        success: false,
        idempotencyKey: '',
        error: 'Thiếu leadId hoặc affiliateId để tạo sự kiện thông báo khách hàng mới.',
      };
    }

    const idempotencyKey = `evt:LEAD_SUBMITTED:${leadId}`;

    try {
      // 1. Ánh xạ affiliateId sang user_id của CTV sở hữu mã
      const { data: affProfile, error: affErr } = await this.supabase
        .from('affiliate_profiles')
        .select(`
          id,
          user_id,
          affiliate_code,
          status,
          profile:profiles!affiliate_profiles_user_id_fkey(id, is_active)
        `)
        .eq('id', affiliateId)
        .maybeSingle();

      if (affErr) {
        console.warn('[NotificationEventService] Lỗi tra cứu CTV cho lead:', affErr.message);
      }

      const recipientUserId = affProfile?.user_id;
      if (!recipientUserId) {
        console.warn(`[NotificationEventService] Bỏ qua sự kiện ${idempotencyKey}: Không tìm thấy user_id của CTV ${affiliateId}`);
        return {
          success: false,
          idempotencyKey,
          error: 'Không tìm thấy user_id tương ứng với CTV (không gửi cho Admin hoặc người khác).',
        };
      }

      // Snapshot an toàn: Không lưu CCCD, mật khẩu, thông tin nhạy cảm của khách hàng
      const cleanPayload = {
        lead_id: leadId,
        lead_name: leadName,
        course_id: courseId || null,
        course_name: courseName || 'STHC',
        affiliate_code: affiliateCode || affProfile?.affiliate_code || null,
        created_at: new Date().toISOString(),
      };

      // 2. Kiểm tra nếu event với leadId này đã tồn tại
      const { data: existingEvt } = await this.supabase
        .from('notification_events')
        .select('id, status, notification_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingEvt) {
        if (existingEvt.status === 'PENDING' || existingEvt.status === 'FAILED') {
          this.consumer.processBatch().catch(() => {});
        }
        return {
          success: true,
          eventId: existingEvt.id,
          idempotencyKey,
          isDuplicate: true,
        };
      }

      // 3. Chèn bản ghi sự kiện mới vào notification_events
      const { data: insertedEvt, error: insErr } = await this.supabase
        .from('notification_events')
        .insert({
          event_type: 'LEAD_SUBMITTED',
          source_entity_type: 'leads',
          source_entity_id: leadId,
          transition_state: 'NEW',
          idempotency_key: idempotencyKey,
          recipient_user_id: recipientUserId,
          payload: cleanPayload,
          status: 'PENDING',
          retry_count: 0,
        })
        .select('id')
        .single();

      if (insErr) {
        if (insErr.code === '23505') {
          return {
            success: true,
            idempotencyKey,
            isDuplicate: true,
          };
        }
        throw new Error(`Lỗi ghi nhận sự kiện lead: ${insErr.message}`);
      }

      // 4. Kích hoạt xử lý tức thời
      this.consumer.processBatch().catch((cErr) => {
        console.warn('[NotificationEventService] Lỗi chạy xử lý batch lead:', cErr?.message);
      });

      return {
        success: true,
        eventId: insertedEvt.id,
        idempotencyKey,
        isDuplicate: false,
      };
    } catch (err: any) {
      console.error('[NotificationEventService] Thất bại khi tạo sự kiện LEAD_SUBMITTED:', err?.message);
      return {
        success: false,
        idempotencyKey,
        error: err?.message,
      };
    }
  }

  /**
   * Helper tra cứu user_id từ affiliate_profiles.id
   */
  private async resolveAffiliateUserId(affiliateId: string): Promise<string | null> {
    try {
      const { data: affProfile } = await this.supabase
        .from('affiliate_profiles')
        .select('user_id')
        .eq('id', affiliateId)
        .maybeSingle();

      return affProfile?.user_id || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper chung ghi nhận sự kiện hệ thống
   */
  private async emitSystemEvent(params: {
    eventType: string;
    sourceEntityType: string;
    sourceEntityId: string;
    transitionState: string;
    idempotencyKey: string;
    recipientUserId: string;
    payload: any;
  }): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { eventType, sourceEntityType, sourceEntityId, transitionState, idempotencyKey, recipientUserId, payload } = params;

    try {
      // 1. Kiểm tra sự kiện đã tồn tại
      const { data: existingEvt } = await this.supabase
        .from('notification_events')
        .select('id, status, notification_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingEvt) {
        if (existingEvt.status === 'PENDING' || existingEvt.status === 'FAILED') {
          this.consumer.processBatch().catch(() => {});
        }
        return {
          success: true,
          eventId: existingEvt.id,
          idempotencyKey,
          isDuplicate: true,
        };
      }

      // 2. Chèn sự kiện mới
      const { data: insertedEvt, error: insErr } = await this.supabase
        .from('notification_events')
        .insert({
          event_type: eventType,
          source_entity_type: sourceEntityType,
          source_entity_id: sourceEntityId,
          transition_state: transitionState,
          idempotency_key: idempotencyKey,
          recipient_user_id: recipientUserId,
          payload,
          status: 'PENDING',
          retry_count: 0,
        })
        .select('id')
        .single();

      if (insErr) {
        if (insErr.code === '23505') {
          return {
            success: true,
            idempotencyKey,
            isDuplicate: true,
          };
        }
        throw new Error(`Lỗi ghi nhận sự kiện ${eventType}: ${insErr.message}`);
      }

      // 3. Đánh thức consumer xử lý
      this.consumer.processBatch().catch(() => {});

      return {
        success: true,
        eventId: insertedEvt.id,
        idempotencyKey,
        isDuplicate: false,
      };
    } catch (err: any) {
      console.error(`[NotificationEventService] Lỗi phát sinh sự kiện ${eventType}:`, err?.message);
      return {
        success: false,
        idempotencyKey,
        error: err?.message,
      };
    }
  }

  /**
   * Phát sinh sự kiện ENROLLMENT_MATCHED
   */
  public async emitEnrollmentMatchedEvent(params: EnrollmentMatchedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { auditId, leadId, affiliateId, leadName, courseId, courseName, reconciliationId, rewardId } = params;
    const idempotencyKey = `evt:ENROLLMENT_MATCHED:${auditId}`;

    const recipientUserId = await this.resolveAffiliateUserId(affiliateId);
    if (!recipientUserId) {
      return {
        success: false,
        idempotencyKey,
        error: `Không tìm thấy user_id tương ứng với CTV ${affiliateId}`,
      };
    }

    const payload = {
      audit_log_id: auditId,
      lead_id: leadId,
      lead_name: leadName || 'Học viên',
      course_id: courseId || null,
      course_name: courseName || 'STHC',
      reconciliation_id: reconciliationId || null,
      reward_id: rewardId || null,
      created_at: new Date().toISOString(),
    };

    return this.emitSystemEvent({
      eventType: 'ENROLLMENT_MATCHED',
      sourceEntityType: 'leads',
      sourceEntityId: leadId,
      transitionState: 'MATCHED_VALID',
      idempotencyKey,
      recipientUserId,
      payload,
    });
  }

  /**
   * Phát sinh sự kiện ENROLLMENT_VOIDED
   */
  public async emitEnrollmentVoidedEvent(params: EnrollmentVoidedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { auditId, leadId, affiliateId, leadName, courseId, reconciliationId, reason } = params;
    const idempotencyKey = `evt:ENROLLMENT_VOIDED:${auditId}`;

    const recipientUserId = await this.resolveAffiliateUserId(affiliateId);
    if (!recipientUserId) {
      return {
        success: false,
        idempotencyKey,
        error: `Không tìm thấy user_id tương ứng với CTV ${affiliateId}`,
      };
    }

    const payload = {
      audit_log_id: auditId,
      lead_id: leadId,
      lead_name: leadName || 'Học viên',
      course_id: courseId || null,
      reconciliation_id: reconciliationId || null,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };

    return this.emitSystemEvent({
      eventType: 'ENROLLMENT_VOIDED',
      sourceEntityType: 'leads',
      sourceEntityId: leadId,
      transitionState: 'RECONCILIATION_VOIDED',
      idempotencyKey,
      recipientUserId,
      payload,
    });
  }

  /**
   * Phát sinh sự kiện REWARD_APPROVED
   */
  public async emitRewardApprovedEvent(params: RewardApprovedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { auditId, rewardId, affiliateId, leadId, leadName, courseId, amount } = params;
    const idempotencyKey = `evt:REWARD_APPROVED:${auditId}`;

    const recipientUserId = await this.resolveAffiliateUserId(affiliateId);
    if (!recipientUserId) {
      return {
        success: false,
        idempotencyKey,
        error: `Không tìm thấy user_id tương ứng với CTV ${affiliateId}`,
      };
    }

    const payload = {
      audit_log_id: auditId,
      reward_id: rewardId,
      lead_id: leadId || null,
      lead_name: leadName || null,
      course_id: courseId || null,
      amount: amount || 500000,
      created_at: new Date().toISOString(),
    };

    return this.emitSystemEvent({
      eventType: 'REWARD_APPROVED',
      sourceEntityType: 'rewards',
      sourceEntityId: rewardId,
      transitionState: 'APPROVED',
      idempotencyKey,
      recipientUserId,
      payload,
    });
  }

  /**
   * Phát sinh sự kiện REWARD_REJECTED
   */
  public async emitRewardRejectedEvent(params: RewardRejectedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { auditId, rewardId, affiliateId, leadId, leadName, amount, reason } = params;
    const idempotencyKey = `evt:REWARD_REJECTED:${auditId}`;

    const recipientUserId = await this.resolveAffiliateUserId(affiliateId);
    if (!recipientUserId) {
      return {
        success: false,
        idempotencyKey,
        error: `Không tìm thấy user_id tương ứng với CTV ${affiliateId}`,
      };
    }

    const payload = {
      audit_log_id: auditId,
      reward_id: rewardId,
      lead_id: leadId || null,
      lead_name: leadName || null,
      amount: amount || 500000,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };

    return this.emitSystemEvent({
      eventType: 'REWARD_REJECTED',
      sourceEntityType: 'rewards',
      sourceEntityId: rewardId,
      transitionState: 'REJECTED',
      idempotencyKey,
      recipientUserId,
      payload,
    });
  }

  /**
   * Phát sinh sự kiện REWARD_VOIDED
   */
  public async emitRewardVoidedEvent(params: RewardVoidedEventParams): Promise<{
    success: boolean;
    eventId?: string;
    idempotencyKey: string;
    isDuplicate?: boolean;
    error?: string;
  }> {
    const { auditId, rewardId, affiliateId, leadId, leadName, courseId, amount, reason } = params;
    const idempotencyKey = `evt:REWARD_VOIDED:${auditId}`;

    const recipientUserId = await this.resolveAffiliateUserId(affiliateId);
    if (!recipientUserId) {
      return {
        success: false,
        idempotencyKey,
        error: `Không tìm thấy user_id tương ứng với CTV ${affiliateId}`,
      };
    }

    const payload = {
      audit_log_id: auditId,
      reward_id: rewardId,
      lead_id: leadId || null,
      lead_name: leadName || null,
      course_id: courseId || null,
      amount: amount || 500000,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };

    return this.emitSystemEvent({
      eventType: 'REWARD_VOIDED',
      sourceEntityType: 'rewards',
      sourceEntityId: rewardId,
      transitionState: 'VOIDED',
      idempotencyKey,
      recipientUserId,
      payload,
    });
  }
}
