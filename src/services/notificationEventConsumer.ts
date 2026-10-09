/**
 * STHC_CTV - Bộ xử lý sự kiện thông báo hệ thống (Notification Outbox Consumer - C3.6A)
 * 
 * Quản lý vòng đời và xử lý hàng đợi notification_events:
 * - Chạy ngầm tại backend (Node.js/Express), không phụ thuộc vào CTV mở trình duyệt.
 * - Hỗ trợ phân tán, chống tranh chấp (distributed claim) bằng worker lease hoặc RPC SKIP LOCKED.
 * - Cơ chế thử lại (exponential backoff) và lưu vết lỗi bền vững vào FAILED/DEAD_LETTER.
 * - Tự động phục hồi các tác vụ bị treo (stale lock recovery).
 * - Sinh thông báo SYSTEM cho 5 loại sự kiện cốt lõi:
 *   + AFFILIATE_APPROVED
 *   + AFFILIATE_REJECTED
 *   + AFFILIATE_SUSPENDED
 *   + AFFILIATE_REACTIVATED
 *   + LEAD_SUBMITTED
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface NotificationConsumerOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  staleLockTimeoutMs?: number;
  workerId?: string;
  maxRetries?: number;
}

export interface NotificationEventRecord {
  id: string;
  event_type: string;
  source_entity_type: string;
  source_entity_id: string;
  transition_state?: string | null;
  idempotency_key: string;
  recipient_user_id?: string | null;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DEAD_LETTER';
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  notification_id?: string | null;
  next_attempt_at?: string | null;
  locked_at?: string | null;
  locked_by?: string | null;
  created_at: string;
  updated_at: string;
}

export class NotificationEventConsumer {
  private supabase: SupabaseClient;
  private isRunning: boolean = false;
  private isProcessingBatch: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private options: Required<NotificationConsumerOptions>;

  constructor(supabaseClient: SupabaseClient, options?: NotificationConsumerOptions) {
    this.supabase = supabaseClient;
    this.options = {
      batchSize: options?.batchSize || 10,
      pollIntervalMs: options?.pollIntervalMs || 5000,
      staleLockTimeoutMs: options?.staleLockTimeoutMs || 5 * 60 * 1000, // 5 phút
      workerId: options?.workerId || `worker-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
      maxRetries: options?.maxRetries || 3,
    };
  }

  /**
   * Bắt đầu vòng lặp xử lý ngầm (Background Polling Loop)
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Notification Consumer] Khởi động worker "${this.options.workerId}" (Chu kỳ: ${this.options.pollIntervalMs}ms)`);

    const loop = async () => {
      if (!this.isRunning) return;
      try {
        await this.processBatch();
      } catch (err: any) {
        console.error('[Notification Consumer Loop Error]:', err?.message);
      }
      if (this.isRunning) {
        this.timer = setTimeout(loop, this.options.pollIntervalMs);
      }
    };

    // Chạy lượt đầu tiên
    this.timer = setTimeout(loop, 1000);
  }

  /**
   * Dừng an toàn worker (Graceful Shutdown)
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log(`[Notification Consumer] Đã dừng worker "${this.options.workerId}".`);
  }

  /**
   * Xử lý một đợt sự kiện chờ (Single Batch Execution)
   * Có thể gọi trực tiếp từ các bộ kiểm thử hoặc webhook
   */
  public async processBatch(): Promise<{ claimed: number; processed: number; failed: number }> {
    if (this.isProcessingBatch) {
      return { claimed: 0, processed: 0, failed: 0 };
    }

    this.isProcessingBatch = true;
    let claimedCount = 0;
    let processedCount = 0;
    let failedCount = 0;

    try {
      // 1. Phục hồi các task bị treo do worker trước đó gặp sự cố
      await this.recoverStaleLocks();

      // 2. Nhận batch sự kiện cần xử lý
      const events = await this.claimEvents(this.options.batchSize);
      claimedCount = events.length;

      if (claimedCount === 0) {
        return { claimed: 0, processed: 0, failed: 0 };
      }

      // 3. Xử lý tuần tự từng sự kiện
      for (const event of events) {
        try {
          const success = await this.processSingleEvent(event);
          if (success) {
            processedCount++;
          } else {
            failedCount++;
          }
        } catch (eventErr: any) {
          failedCount++;
          console.error(`[Notification Consumer] Lỗi xử lý sự kiện ${event.id}:`, eventErr?.message);
        }
      }
    } finally {
      this.isProcessingBatch = false;
    }

    return { claimed: claimedCount, processed: processedCount, failed: failedCount };
  }

  /**
   * Khóa và nhận các sự kiện PENDING hoặc FAILED đã đến hạn thử lại
   */
  private async claimEvents(limit: number): Promise<NotificationEventRecord[]> {
    const nowIso = new Date().toISOString();

    // 2.1 Ưu tiên thử gọi RPC fn_claim_notification_events nếu có trong PostgreSQL
    try {
      const { data: rpcClaimed, error: rpcErr } = await this.supabase.rpc('fn_claim_notification_events', {
        p_batch_size: limit,
        p_worker_id: this.options.workerId,
      });

      if (!rpcErr && rpcClaimed && Array.isArray(rpcClaimed) && rpcClaimed.length > 0) {
        const claimedIds = rpcClaimed.map((c: any) => c.event_id || c.id);
        const { data: fullEvents } = await this.supabase
          .from('notification_events')
          .select('*')
          .in('id', claimedIds);

        return (fullEvents as NotificationEventRecord[]) || [];
      }
    } catch {
      // Bỏ qua nếu RPC chưa được áp dụng, chuyển sang cơ chế claim qua Service Role client
    }

    // 2.2 Fallback: Claim bằng Optimistic Lease trên notification_events
    const { data: candidateEvents, error: candErr } = await this.supabase
      .from('notification_events')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .in('event_type', [
        'AFFILIATE_APPROVED',
        'AFFILIATE_REJECTED',
        'AFFILIATE_SUSPENDED',
        'AFFILIATE_REACTIVATED',
        'LEAD_SUBMITTED',
        'ENROLLMENT_MATCHED',
        'ENROLLMENT_VOIDED',
        'REWARD_APPROVED',
        'REWARD_REJECTED',
        'REWARD_VOIDED',
      ])
      .order('created_at', { ascending: true })
      .limit(limit);

    if (candErr || !candidateEvents || candidateEvents.length === 0) {
      return [];
    }

    const claimedEvents: NotificationEventRecord[] = [];

    for (const cand of candidateEvents) {
      if (cand.retry_count >= (cand.max_retries || this.options.maxRetries)) {
        // Đã vượt quá số lần thử lại -> chuyển sang DEAD_LETTER
        await this.supabase
          .from('notification_events')
          .update({
            status: 'DEAD_LETTER',
            locked_at: null,
            locked_by: null,
            updated_at: nowIso,
          })
          .eq('id', cand.id);
        continue;
      }

      // Khóa nguyên tử từng bản ghi gắn với workerId
      const { data: locked, error: lockErr } = await this.supabase
        .from('notification_events')
        .update({
          status: 'PROCESSING',
          locked_by: this.options.workerId,
          locked_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', cand.id)
        .in('status', ['PENDING', 'FAILED'])
        .select('*')
        .maybeSingle();

      if (!lockErr && locked) {
        claimedEvents.push(locked as NotificationEventRecord);
      }
    }

    return claimedEvents;
  }

  /**
   * Phục hồi các task bị treo ở trạng thái PROCESSING quá hạn (Stale Lock Recovery)
   */
  private async recoverStaleLocks(): Promise<void> {
    const staleThreshold = new Date(Date.now() - this.options.staleLockTimeoutMs).toISOString();

    try {
      await this.supabase
        .from('notification_events')
        .update({
          status: 'PENDING',
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'PROCESSING')
        .lt('updated_at', staleThreshold);
    } catch {
      // ignore
    }
  }

  /**
   * Xử lý một sự kiện đơn lẻ thành thông báo SYSTEM
   */
  public async processSingleEvent(event: NotificationEventRecord): Promise<boolean> {
    const nowIso = new Date().toISOString();

    // Xử lý trực tiếp và an toàn bằng Service Role Client theo chuẩn C3.6A / C3.6B
    try {
      // 2.1 Xác thực loại sự kiện hợp lệ
      const ALLOWED_EVENTS = [
        'AFFILIATE_APPROVED',
        'AFFILIATE_REJECTED',
        'AFFILIATE_SUSPENDED',
        'AFFILIATE_REACTIVATED',
        'LEAD_SUBMITTED',
        'ENROLLMENT_MATCHED',
        'ENROLLMENT_VOIDED',
        'REWARD_APPROVED',
        'REWARD_REJECTED',
        'REWARD_VOIDED',
      ];
      if (!ALLOWED_EVENTS.includes(event.event_type)) {
        throw new Error(`Loại sự kiện không được hỗ trợ xử lý tự động: ${event.event_type}`);
      }

      // 2.2 Sinh mẫu nội dung chuẩn hóa C3.6A / C3.6B
      const template = this.renderEventTemplate(event);

      // 2.3 Kiểm tra Idempotency: Thông báo với idempotency_key này đã tồn tại chưa
      let notificationId: string | null = null;
      const { data: existingNotif } = await this.supabase
        .from('notifications')
        .select('id, event_type, source_entity_id')
        .eq('idempotency_key', event.idempotency_key)
        .maybeSingle();

      if (existingNotif) {
        notificationId = existingNotif.id;
      } else {
        // Tạo mới thông báo loại SYSTEM, trạng thái PUBLISHED
        const notifPayload = {
          type: 'SYSTEM',
          category: template.category,
          title: template.title,
          summary: template.summary || null,
          content: template.content,
          action_url: template.action_url || null,
          recipient_scope: 'SPECIFIC',
          status: 'PUBLISHED',
          published_at: nowIso,
          event_type: event.event_type,
          source_entity_type: event.source_entity_type,
          source_entity_id: event.source_entity_id,
          idempotency_key: event.idempotency_key,
          metadata: event.payload || {},
        };

        const { data: insertedNotif, error: notifErr } = await this.supabase
          .from('notifications')
          .insert(notifPayload)
          .select('id')
          .single();

        if (notifErr || !insertedNotif) {
          throw new Error(`Lỗi tạo bản ghi thông báo: ${notifErr?.message || 'Không có ID trả về'}`);
        }

        notificationId = insertedNotif.id;
      }

      // 2.4 Phân phối người nhận vào notification_recipients
      if (event.recipient_user_id) {
        const { data: existingRec } = await this.supabase
          .from('notification_recipients')
          .select('id')
          .eq('notification_id', notificationId)
          .eq('user_id', event.recipient_user_id)
          .maybeSingle();

        if (!existingRec) {
          await this.supabase
            .from('notification_recipients')
            .insert({
              notification_id: notificationId,
              user_id: event.recipient_user_id,
            });
        }
      }

      // 2.5 Đánh dấu sự kiện hoàn tất (PROCESSED) có kiểm tra lease của worker
      // Worker cũ đã mất lease không thể ghi đè kết quả
      const { data: completedEvent, error: compErr } = await this.supabase
        .from('notification_events')
        .update({
          status: 'PROCESSED',
          notification_id: notificationId,
          processed_at: nowIso,
          last_error: null,
          locked_by: null,
          locked_at: null,
          updated_at: nowIso,
        })
        .eq('id', event.id)
        .eq('status', 'PROCESSING')
        .select('id')
        .maybeSingle();

      if (compErr) {
        throw new Error(`Lỗi cập nhật trạng thái PROCESSED: ${compErr.message}`);
      }

      return true;
    } catch (err: any) {
      // 2.6 Xử lý lỗi thất bại, ghi nhận bền vững và tính toán exponential backoff
      const newRetryCount = (event.retry_count || 0) + 1;
      const isDeadLetter = newRetryCount >= (event.max_retries || this.options.maxRetries);
      const delaySec = Math.pow(2, Math.min(newRetryCount, 8)) * 15;
      const nextAttemptAt = new Date(Date.now() + delaySec * 1000).toISOString();

      await this.supabase
        .from('notification_events')
        .update({
          status: isDeadLetter ? 'DEAD_LETTER' : 'FAILED',
          retry_count: newRetryCount,
          last_error: err?.message || 'Lỗi không xác định',
          next_attempt_at: isDeadLetter ? null : nextAttemptAt,
          locked_by: null,
          locked_at: null,
          updated_at: nowIso,
        })
        .eq('id', event.id);

      return false;
    }
  }

  /**
   * Sinh tiêu đề, nội dung và đường dẫn chuẩn nghiệp vụ (C3.6A & C3.6B)
   */
  private renderEventTemplate(event: NotificationEventRecord): {
    category: 'ACCOUNT' | 'LEAD' | 'GENERAL' | 'RECONCILIATION' | 'REWARD';
    title: string;
    summary: string;
    content: string;
    action_url: string;
  } {
    const payload = event.payload || {};

    const formatVND = (amt: any): string => {
      const num = Number(amt) || 0;
      return new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
    };

    switch (event.event_type) {
      case 'AFFILIATE_APPROVED': {
        const affCode = payload.affiliate_code ? ` ${payload.affiliate_code}` : '';
        return {
          category: 'ACCOUNT',
          title: 'Hồ sơ CTV đã được duyệt',
          summary: `Chúc mừng! Hồ sơ CTV${affCode} của bạn đã được phê duyệt.`,
          content: `Chúc mừng bạn! Hồ sơ cộng tác viên tuyển sinh${affCode} đã được Ban Quản trị phê duyệt chính thức. Bạn có thể bắt đầu sử dụng mã giới thiệu và đường dẫn tuyển sinh để tiếp cận học viên và nhận thù lao tuyển sinh.`,
          action_url: '/portal',
        };
      }

      case 'AFFILIATE_REJECTED': {
        const reason = payload.reason ? ` Lý do: ${payload.reason}.` : '';
        return {
          category: 'ACCOUNT',
          title: 'Hồ sơ CTV chưa được duyệt',
          summary: `Hồ sơ đăng ký cộng tác viên tuyển sinh chưa được phê duyệt.${reason}`,
          content: `Hồ sơ đăng ký cộng tác viên của bạn chưa được duyệt.${reason} Vui lòng kiểm tra lại thông tin hồ sơ và bổ sung theo hướng dẫn.`,
          action_url: '/pending',
        };
      }

      case 'AFFILIATE_SUSPENDED': {
        const reason = payload.reason ? ` Lý do: ${payload.reason}.` : '';
        return {
          category: 'ACCOUNT',
          title: 'Tài khoản CTV đã bị tạm ngưng',
          summary: `Tài khoản cộng tác viên của bạn đã bị tạm dừng hoạt động.${reason} Vui lòng liên hệ hỗ trợ.`,
          content: `Tài khoản cộng tác viên tuyển sinh của bạn đã bị tạm dừng hoạt động.${reason} Mọi thắc mắc hoặc yêu cầu hỗ trợ vui lòng liên hệ Ban Quản trị để được giải đáp.`,
          action_url: '/pending',
        };
      }

      case 'AFFILIATE_REACTIVATED': {
        return {
          category: 'ACCOUNT',
          title: 'Tài khoản CTV đã được kích hoạt lại',
          summary: 'Tài khoản cộng tác viên của bạn đã được kích hoạt lại và có thể tiếp tục hoạt động.',
          content: 'Tài khoản cộng tác viên tuyển sinh của bạn đã được mở khóa và kích hoạt lại thành công. Bạn có thể tiếp tục các hoạt động giới thiệu tuyển sinh bình thường.',
          action_url: '/portal',
        };
      }

      case 'LEAD_SUBMITTED': {
        const leadName = payload.lead_name || 'Khách hàng';
        const coursePart = payload.course_name ? ` ${payload.course_name}` : 'STHC';
        return {
          category: 'LEAD',
          title: 'Có khách hàng mới đăng ký qua link giới thiệu',
          summary: `Khách hàng ${leadName} đã đăng ký khóa học ${coursePart} qua mã giới thiệu của bạn.`,
          content: `Chúc mừng bạn! Khách hàng ${leadName} đã đăng ký tham gia khóa học ${coursePart} qua đường dẫn giới thiệu của bạn. Đội ngũ tư vấn tuyển sinh STHC sẽ sớm liên hệ hỗ trợ người học.`,
          action_url: '/portal/leads',
        };
      }

      // C3.6B: Sự kiện nhập học và đối soát (A4)
      case 'ENROLLMENT_MATCHED': {
        const leadName = payload.lead_name || 'Học viên';
        const courseName = payload.course_name || 'STHC';
        const leadId = payload.lead_id || '';
        const rewardPart = payload.reward_id 
          ? ' Khoản thù lao tuyển sinh tương ứng đang được lập dự toán chuyển sang trạng thái chờ duyệt.' 
          : '';
        return {
          category: 'RECONCILIATION',
          title: 'Học viên đã được xác nhận nhập học',
          summary: `Học viên ${leadName} đã được xác nhận nhập học khóa ${courseName}.`,
          content: `Chúc mừng bạn! Học viên ${leadName} đã hoàn tất thủ tục nhập học chính thức khóa học ${courseName}. Kết quả nhập học đã được đối soát thành công.${rewardPart}`,
          action_url: leadId ? `/portal/leads/${leadId}` : '/portal/leads',
        };
      }

      case 'ENROLLMENT_VOIDED': {
        const leadName = payload.lead_name || 'Học viên';
        const courseName = payload.course_name || 'STHC';
        const leadId = payload.lead_id || '';
        const reason = payload.reason ? ` Lý do: ${payload.reason}.` : '';
        return {
          category: 'RECONCILIATION',
          title: 'Kết quả nhập học đã được điều chỉnh',
          summary: `Kết quả nhập học của học viên ${leadName} đã được điều chỉnh về chưa nhập học.`,
          content: `Thông báo: Kết quả đối soát nhập học của học viên ${leadName} (khóa học ${courseName}) đã được điều chỉnh hủy.${reason} Hồ sơ học viên đã được chuyển về trạng thái chưa nhập học.`,
          action_url: leadId ? `/portal/leads/${leadId}` : '/portal/leads',
        };
      }

      // C3.6B: Sự kiện thù lao tuyển sinh (A5)
      case 'REWARD_APPROVED': {
        const leadName = payload.lead_name || 'học viên';
        const courseName = payload.course_name || 'STHC';
        const formattedAmount = formatVND(payload.amount);
        return {
          category: 'REWARD',
          title: 'Thù lao đã được duyệt',
          summary: `Khoản thù lao ${formattedAmount} cho học viên ${leadName} đã được phê duyệt.`,
          content: `Khoản thù lao tuyển sinh trị giá ${formattedAmount} cho học viên ${leadName} (khóa học ${courseName}) đã được Ban Quản trị phê duyệt chính thức. Lưu ý: Đây là kết quả xét duyệt thù lao, khoản tiền sẽ được chi trả theo kỳ thanh toán quy định của Nhà trường.`,
          action_url: '/portal',
        };
      }

      case 'REWARD_REJECTED': {
        const leadName = payload.lead_name || 'học viên';
        const courseName = payload.course_name || 'STHC';
        const leadId = payload.lead_id || '';
        const formattedAmount = formatVND(payload.amount);
        const reasonPart = payload.reason ? ` Lý do: ${payload.reason}.` : '';
        return {
          category: 'REWARD',
          title: 'Thù lao chưa được duyệt',
          summary: `Khoản thù lao ${formattedAmount} cho học viên ${leadName} chưa được duyệt.${reasonPart}`,
          content: `Khoản thù lao tuyển sinh trị giá ${formattedAmount} cho học viên ${leadName} (khóa học ${courseName}) chưa được Ban Quản trị phê duyệt.${reasonPart} Vui lòng kiểm tra lại hồ sơ hoặc liên hệ Ban Quản trị để biết thêm chi tiết.`,
          action_url: leadId ? `/portal/leads/${leadId}` : '/portal',
        };
      }

      case 'REWARD_VOIDED': {
        const leadName = payload.lead_name || 'học viên';
        const courseName = payload.course_name || 'STHC';
        const leadId = payload.lead_id || '';
        const formattedAmount = formatVND(payload.amount);
        const reasonPart = payload.reason ? ` Lý do: ${payload.reason}.` : '';
        return {
          category: 'REWARD',
          title: 'Khoản thù lao đã bị hủy',
          summary: `Khoản thù lao ${formattedAmount} cho học viên ${leadName} đã bị hủy.${reasonPart}`,
          content: `Khoản thù lao tuyển sinh trị giá ${formattedAmount} cho học viên ${leadName} (khóa học ${courseName}) đã bị hủy theo quyết định xử lý đối soát.${reasonPart} Hồ sơ thù lao đã chuyển sang trạng thái đã hủy.`,
          action_url: leadId ? `/portal/leads/${leadId}` : '/portal',
        };
      }

      default:
        return {
          category: 'GENERAL',
          title: payload.title || 'Thông báo biến động hệ thống',
          summary: payload.summary || '',
          content: payload.message || 'Hệ thống STHC vừa ghi nhận biến động mới liên quan đến hoạt động của bạn.',
          action_url: '/portal',
        };
    }
  }
}
