-- ==============================================================================
-- MIGRATION: 20261007000002 - ADMIN DASHBOARD SUMMARY WITH REWARDS (A9.5B)
-- Dự án: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)
-- ==============================================================================

-- 1. Nâng cấp hàm RPC fn_get_admin_dashboard_summary_metrics hỗ trợ khối Thù lao (Rewards)
CREATE OR REPLACE FUNCTION public.fn_get_admin_dashboard_summary_metrics(
    p_start_utc TIMESTAMPTZ DEFAULT NULL,
    p_end_utc TIMESTAMPTZ DEFAULT NULL,
    p_course_id UUID DEFAULT NULL,
    p_affiliate_id UUID DEFAULT NULL,
    p_is_unassigned BOOLEAN DEFAULT FALSE,
    p_include_rewards BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role VARCHAR;
    v_caller_is_active BOOLEAN;
    v_has_reward_summary_perm BOOLEAN := FALSE;
    
    -- Recruitment metrics
    v_total_leads BIGINT := 0;
    v_not_enrolled_leads BIGINT := 0;
    v_enrolled_leads BIGINT := 0;
    v_withdrawn_leads BIGINT := 0;
    v_enrollment_rate NUMERIC := NULL;
    v_egov_active_leads BIGINT := 0;
    v_matched_valid_leads BIGINT := 0;
    
    -- Affiliate network metrics (All-time)
    v_total_affiliates BIGINT := 0;
    v_active_affiliates BIGINT := 0;
    v_pending_affiliates BIGINT := 0;
    v_suspended_affiliates BIGINT := 0;
    v_rejected_affiliates BIGINT := 0;
    
    -- Backlog metrics (All-time)
    v_new_leads_to_contact BIGINT := 0;
    v_pending_reconciliation_leads BIGINT := 0;
    
    -- Rewards metrics (A9.5B)
    v_rewards_available BOOLEAN := FALSE;
    v_rewards_reason_code TEXT := NULL;
    v_pending_rewards_count BIGINT := 0;
    v_pending_rewards_amount NUMERIC := 0;
    v_approved_period_count BIGINT := 0;
    v_approved_period_amount NUMERIC := 0;
    v_approved_all_count BIGINT := 0;
    v_approved_all_amount NUMERIC := 0;
    v_approved_missing_date_count BIGINT := 0;
    
    v_rewards_json JSONB;
    v_result JSONB;
BEGIN
    -- 1. Kiểm tra quyền của người gọi (Staff hoặc Admin đang hoạt động)
    IF v_caller_id IS NOT NULL THEN
        SELECT p.role, p.is_active 
        INTO v_caller_role, v_caller_is_active
        FROM public.profiles p
        WHERE p.id = v_caller_id;
        
        IF v_caller_role IS NOT NULL THEN
            IF v_caller_is_active IS DISTINCT FROM TRUE OR v_caller_role NOT IN ('admin', 'staff') THEN
                RAISE EXCEPTION 'FORBIDDEN: Chỉ Admin hoặc Staff đang hoạt động mới được truy cập dữ liệu tổng quan.' USING ERRCODE = '42501';
            END IF;

            -- Kiểm tra quyền rewards.summary
            IF v_caller_role = 'admin' THEN
                v_has_reward_summary_perm := TRUE;
            ELSIF v_caller_role = 'staff' THEN
                SELECT public.fn_has_permission(v_caller_id, 'rewards.summary') INTO v_has_reward_summary_perm;
            END IF;
        END IF;
    ELSE
        -- Gọi qua backend service-role
        IF p_include_rewards = TRUE THEN
            v_has_reward_summary_perm := TRUE;
        END IF;
    END IF;

    -- 2. Tính toán Recruitment Metrics (Trong kỳ & theo bộ lọc)
    WITH filtered_leads AS (
        SELECT 
            l.id,
            l.admission_status,
            l.reconciliation_status,
            l.counseling_status,
            -- Kiểm tra liên kết EGOV active
            EXISTS (
                SELECT 1 FROM public.lead_egov_links el 
                WHERE el.lead_id = l.id AND el.link_status = 'ACTIVE'
            ) AS has_active_egov,
            -- Trích xuất đối soát hiệu lực mới nhất
            (
                SELECT lr.reconciliation_status
                FROM public.lead_reconciliations lr
                WHERE lr.lead_id = l.id 
                  AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
                ORDER BY lr.reconciled_at DESC
                LIMIT 1
            ) AS active_recon_status
        FROM public.leads l
        WHERE 
            -- Lọc theo khoảng ngày đăng ký
            (p_start_utc IS NULL OR l.created_at >= p_start_utc)
            AND (p_end_utc IS NULL OR l.created_at < p_end_utc)
            -- Lọc theo khóa học
            AND (p_course_id IS NULL OR l.course_id = p_course_id)
            -- Lọc theo CTV
            AND (
                (p_is_unassigned = TRUE AND l.affiliate_id IS NULL)
                OR (p_is_unassigned = FALSE AND (p_affiliate_id IS NULL OR l.affiliate_id = p_affiliate_id))
            )
    ),
    evaluated_leads AS (
        SELECT 
            fl.id,
            fl.has_active_egov,
            fl.active_recon_status,
            -- Chuẩn hóa trạng thái nhập học (resolveAuthoritativeAdmissionStatus)
            CASE 
                WHEN fl.admission_status = 'WITHDRAWN' THEN 'WITHDRAWN'
                WHEN fl.active_recon_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN fl.active_recon_status = 'MISMATCH_INVALID' THEN 'NOT_ENROLLED'
                WHEN fl.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN fl.admission_status = 'ENROLLED' THEN 'ENROLLED'
                ELSE 'NOT_ENROLLED'
            END AS authoritative_admission_status
        FROM filtered_leads fl
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE authoritative_admission_status = 'NOT_ENROLLED'),
        COUNT(*) FILTER (WHERE authoritative_admission_status = 'ENROLLED'),
        COUNT(*) FILTER (WHERE authoritative_admission_status = 'WITHDRAWN'),
        COUNT(*) FILTER (WHERE has_active_egov = TRUE),
        COUNT(*) FILTER (WHERE active_recon_status = 'MATCHED_VALID' OR (active_recon_status IS NULL AND authoritative_admission_status = 'ENROLLED' AND filtered_leads_raw.reconciliation_status = 'MATCHED_VALID'))
    INTO 
        v_total_leads,
        v_not_enrolled_leads,
        v_enrolled_leads,
        v_withdrawn_leads,
        v_egov_active_leads,
        v_matched_valid_leads
    FROM evaluated_leads el
    LEFT JOIN public.leads filtered_leads_raw ON filtered_leads_raw.id = el.id;

    -- Tính tỷ lệ nhập học (%)
    IF v_total_leads > 0 THEN
        v_enrollment_rate := ROUND((v_enrolled_leads::NUMERIC / v_total_leads::NUMERIC) * 100.0, 1);
    ELSE
        v_enrollment_rate := NULL;
    END IF;

    -- 3. Tính toán Mạng lưới CTV (All-Time, profiles.role = 'affiliate')
    SELECT 
        COUNT(ap.id),
        COUNT(ap.id) FILTER (WHERE ap.status = 'ACTIVE' AND p.is_active = TRUE),
        COUNT(ap.id) FILTER (WHERE ap.status = 'PENDING_REVIEW'),
        COUNT(ap.id) FILTER (WHERE ap.status = 'SUSPENDED'),
        COUNT(ap.id) FILTER (WHERE ap.status = 'REJECTED')
    INTO 
        v_total_affiliates,
        v_active_affiliates,
        v_pending_affiliates,
        v_suspended_affiliates,
        v_rejected_affiliates
    FROM public.affiliate_profiles ap
    JOIN public.profiles p ON p.id = ap.user_id
    WHERE p.role = 'affiliate';

    -- 4. Tính toán Việc chờ xử lý (Backlog All-Time)
    SELECT COUNT(*)
    INTO v_new_leads_to_contact
    FROM public.leads l
    WHERE l.counseling_status = 'NEW'
      AND (
          l.admission_status IS DISTINCT FROM 'WITHDRAWN'
          AND l.admission_status IS DISTINCT FROM 'ENROLLED'
          AND NOT EXISTS (
              SELECT 1 FROM public.lead_reconciliations lr
              WHERE lr.lead_id = l.id 
                AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM')
          )
      );

    SELECT COUNT(*)
    INTO v_pending_reconciliation_leads
    FROM public.leads l
    WHERE l.admission_status IS DISTINCT FROM 'WITHDRAWN'
      AND (l.reconciliation_status IN ('NOT_RECONCILED', 'NONE') OR l.reconciliation_status IS NULL)
      AND NOT EXISTS (
          SELECT 1 FROM public.lead_reconciliations lr
          WHERE lr.lead_id = l.id 
            AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
      );

    -- 5. Tính toán Thù lao (Rewards - A9.5B)
    IF v_has_reward_summary_perm = TRUE THEN
        v_rewards_available := TRUE;

        -- a) pending_all (All-time, status = PENDING_APPROVAL)
        SELECT 
            COALESCE(COUNT(r.id), 0),
            COALESCE(SUM(r.amount), 0)
        INTO 
            v_pending_rewards_count,
            v_pending_rewards_amount
        FROM public.rewards r
        WHERE r.status = 'PENDING_APPROVAL';

        -- b) approved_all (All-time, status = APPROVED)
        SELECT 
            COALESCE(COUNT(r.id), 0),
            COALESCE(SUM(r.amount), 0),
            COALESCE(COUNT(r.id) FILTER (WHERE r.approved_at IS NULL), 0)
        INTO 
            v_approved_all_count,
            v_approved_all_amount,
            v_approved_missing_date_count
        FROM public.rewards r
        WHERE r.status = 'APPROVED';

        -- c) approved_period (Trong kỳ chọn theo approved_at, status = APPROVED)
        IF p_start_utc IS NULL AND p_end_utc IS NULL THEN
            v_approved_period_count := v_approved_all_count;
            v_approved_period_amount := v_approved_all_amount;
        ELSE
            SELECT 
                COALESCE(COUNT(r.id), 0),
                COALESCE(SUM(r.amount), 0)
            INTO 
                v_approved_period_count,
                v_approved_period_amount
            FROM public.rewards r
            WHERE r.status = 'APPROVED'
              AND r.approved_at >= p_start_utc 
              AND r.approved_at < p_end_utc;
        END IF;

        v_rewards_json := jsonb_build_object(
            'available', true,
            'pending_all', jsonb_build_object(
                'amount', v_pending_rewards_amount,
                'count', v_pending_rewards_count
            ),
            'approved_period', jsonb_build_object(
                'amount', v_approved_period_amount,
                'count', v_approved_period_count
            ),
            'approved_all', jsonb_build_object(
                'amount', v_approved_all_amount,
                'count', v_approved_all_count
            ),
            'paid', jsonb_build_object(
                'available', false,
                'amount', NULL,
                'count', NULL,
                'reason_code', 'PAYMENT_TRACKING_NOT_AVAILABLE'
            ),
            'metadata', jsonb_build_object(
                'currency', 'VND',
                'pending_scope', 'SYSTEM_WIDE_ALL_TIME',
                'approved_period_scope', 'SYSTEM_WIDE_SELECTED_APPROVAL_PERIOD',
                'approved_all_scope', 'SYSTEM_WIDE_ALL_TIME',
                'approved_missing_date_count', v_approved_missing_date_count
            )
        );
    ELSE
        -- Không có quyền rewards.summary -> Redaction
        v_rewards_json := jsonb_build_object(
            'available', false,
            'reason_code', 'PERMISSION_DENIED',
            'pending_all', NULL,
            'approved_period', NULL,
            'approved_all', NULL,
            'paid', NULL
        );
    END IF;

    -- 6. Đóng gói kết quả JSON hoàn chỉnh
    v_result := jsonb_build_object(
        'recruitment', jsonb_build_object(
            'total_leads', v_total_leads,
            'not_enrolled_leads', v_not_enrolled_leads,
            'enrolled_leads', v_enrolled_leads,
            'withdrawn_leads', v_withdrawn_leads,
            'enrollment_rate', v_enrollment_rate,
            'egov_active_leads', v_egov_active_leads,
            'matched_valid_leads', v_matched_valid_leads
        ),
        'affiliate_network', jsonb_build_object(
            'total_affiliates', v_total_affiliates,
            'active_affiliates', v_active_affiliates,
            'pending_affiliates', v_pending_affiliates,
            'suspended_affiliates', v_suspended_affiliates,
            'rejected_affiliates', v_rejected_affiliates
        ),
        'backlog', jsonb_build_object(
            'pending_affiliates', v_pending_affiliates,
            'new_leads_to_contact', v_new_leads_to_contact,
            'pending_reconciliation_leads', v_pending_reconciliation_leads
        ),
        'rewards', v_rewards_json
    );

    RETURN v_result;
END;
$$;

-- Phân quyền thực thi
REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) TO service_role;
