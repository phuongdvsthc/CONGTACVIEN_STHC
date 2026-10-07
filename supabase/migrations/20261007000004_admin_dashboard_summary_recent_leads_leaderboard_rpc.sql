-- ==============================================================================
-- MIGRATION: 20261007000004 - ADMIN DASHBOARD SUMMARY RECENT LEADS & LEADERBOARD (A9.8A)
-- Dự án: Cổng Đại sứ & Cộng tác viên Tuyển sinh STHC (STHC_CTV)
-- ==============================================================================

-- 1. Nâng cấp hàm RPC fn_get_admin_dashboard_summary_metrics hỗ trợ Danh sách Gần đây & Top CTV
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
    
    -- Charts metrics (A9.7A)
    v_monthly_trend_points JSONB := '[]'::JSONB;
    v_enrolled_missing_date_count BIGINT := 0;
    v_course_breakdown_list JSONB := '[]'::JSONB;
    v_total_courses_count INT := 0;
    
    -- Recent leads & Leaderboard metrics (A9.8A)
    v_recent_leads_list JSONB := '[]'::JSONB;
    v_recent_leads_count INT := 0;
    v_leaderboard_items JSONB := '[]'::JSONB;
    v_leaderboard_count INT := 0;
    v_leaderboard_json JSONB;
    
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
            l.course_id,
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
            fl.course_id,
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

        SELECT 
            COALESCE(COUNT(r.id), 0),
            COALESCE(SUM(r.amount), 0)
        INTO 
            v_pending_rewards_count,
            v_pending_rewards_amount
        FROM public.rewards r
        WHERE r.status = 'PENDING_APPROVAL';

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
        v_rewards_json := jsonb_build_object(
            'available', false,
            'reason_code', 'PERMISSION_DENIED',
            'pending_all', NULL,
            'approved_period', NULL,
            'approved_all', NULL,
            'paid', NULL
        );
    END IF;

    -- 6. Tính toán Biểu đồ 1: Xu hướng Đăng ký & Nhập học 12 tháng liên tục (A9.7A)
    WITH months_series AS (
        SELECT 
            TO_CHAR((DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) - (i * INTERVAL '1 month')), 'YYYY-MM') AS month_key,
            'T' || TO_CHAR((DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) - (i * INTERVAL '1 month')), 'MM/YYYY') AS month_label,
            (DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) - (i * INTERVAL '1 month')) AS month_start,
            (DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')) - ((i - 1) * INTERVAL '1 month')) AS month_end,
            (11 - i) AS sort_idx
        FROM generate_series(11, 0, -1) AS i
    ),
    all_scoped_leads AS (
        SELECT 
            l.id,
            l.created_at,
            l.admission_status,
            l.reconciliation_status,
            (
                SELECT lr.reconciliation_status
                FROM public.lead_reconciliations lr
                WHERE lr.lead_id = l.id 
                  AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
                ORDER BY lr.reconciled_at DESC
                LIMIT 1
            ) AS active_recon_status,
            (
                SELECT lr.reconciled_at
                FROM public.lead_reconciliations lr
                WHERE lr.lead_id = l.id 
                  AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM')
                ORDER BY lr.reconciled_at DESC
                LIMIT 1
            ) AS active_reconciled_at
        FROM public.leads l
        WHERE 
            -- Lọc theo khóa học nếu chọn
            (p_course_id IS NULL OR l.course_id = p_course_id)
            -- Lọc theo CTV nếu chọn
            AND (
                (p_is_unassigned = TRUE AND l.affiliate_id IS NULL)
                OR (p_is_unassigned = FALSE AND (p_affiliate_id IS NULL OR l.affiliate_id = p_affiliate_id))
            )
    ),
    evaluated_scoped_leads AS (
        SELECT 
            asl.id,
            TO_CHAR((asl.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS created_month_key,
            CASE 
                WHEN asl.admission_status = 'WITHDRAWN' THEN 'WITHDRAWN'
                WHEN asl.active_recon_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN asl.active_recon_status = 'MISMATCH_INVALID' THEN 'NOT_ENROLLED'
                WHEN asl.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN asl.admission_status = 'ENROLLED' THEN 'ENROLLED'
                ELSE 'NOT_ENROLLED'
            END AS authoritative_admission_status,
            TO_CHAR((asl.active_reconciled_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS enrolled_month_key,
            asl.active_reconciled_at
        FROM all_scoped_leads asl
    ),
    monthly_counts AS (
        SELECT 
            ms.month_key,
            ms.month_label,
            ms.sort_idx,
            COUNT(esl.id) FILTER (WHERE esl.created_month_key = ms.month_key) AS leads_count,
            COUNT(esl.id) FILTER (WHERE esl.authoritative_admission_status = 'ENROLLED' AND esl.enrolled_month_key = ms.month_key) AS enrolled_count
        FROM months_series ms
        LEFT JOIN evaluated_scoped_leads esl ON esl.created_month_key = ms.month_key OR (esl.authoritative_admission_status = 'ENROLLED' AND esl.enrolled_month_key = ms.month_key)
        GROUP BY ms.month_key, ms.month_label, ms.sort_idx
        ORDER BY ms.sort_idx ASC
    )
    SELECT 
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'month_key', mc.month_key,
                'month_label', mc.month_label,
                'leads_count', mc.leads_count,
                'enrolled_count', mc.enrolled_count
            ) ORDER BY mc.sort_idx ASC
        ), '[]'::JSONB),
        COALESCE((
            SELECT COUNT(*) 
            FROM evaluated_scoped_leads 
            WHERE authoritative_admission_status = 'ENROLLED' AND active_reconciled_at IS NULL
        ), 0)
    INTO 
        v_monthly_trend_points,
        v_enrolled_missing_date_count
    FROM monthly_counts mc;

    -- 7. Tính toán Biểu đồ 2: Phân bố theo Khóa học đăng ký trong kỳ chọn (A9.7A)
    WITH course_cohort_leads AS (
        SELECT 
            l.id,
            l.course_id,
            CASE 
                WHEN l.admission_status = 'WITHDRAWN' THEN 'WITHDRAWN'
                WHEN (
                    SELECT lr.reconciliation_status 
                    FROM public.lead_reconciliations lr 
                    WHERE lr.lead_id = l.id AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
                    ORDER BY lr.reconciled_at DESC LIMIT 1
                ) IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN (
                    SELECT lr.reconciliation_status 
                    FROM public.lead_reconciliations lr 
                    WHERE lr.lead_id = l.id AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
                    ORDER BY lr.reconciled_at DESC LIMIT 1
                ) = 'MISMATCH_INVALID' THEN 'NOT_ENROLLED'
                WHEN l.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                WHEN l.admission_status = 'ENROLLED' THEN 'ENROLLED'
                ELSE 'NOT_ENROLLED'
            END AS authoritative_admission_status
        FROM public.leads l
        WHERE 
            (p_start_utc IS NULL OR l.created_at >= p_start_utc)
            AND (p_end_utc IS NULL OR l.created_at < p_end_utc)
            AND (p_course_id IS NULL OR l.course_id = p_course_id)
            AND (
                (p_is_unassigned = TRUE AND l.affiliate_id IS NULL)
                OR (p_is_unassigned = FALSE AND (p_affiliate_id IS NULL OR l.affiliate_id = p_affiliate_id))
            )
    ),
    catalog_courses AS (
        SELECT 
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.sort_order
        FROM public.courses c
        WHERE (p_course_id IS NULL OR c.id = p_course_id)
    ),
    course_stats AS (
        SELECT 
            cc.course_id::TEXT AS course_id,
            cc.course_code,
            cc.course_title,
            COUNT(ccl.id) AS total_leads,
            COUNT(ccl.id) FILTER (WHERE ccl.authoritative_admission_status = 'ENROLLED') AS enrolled_leads,
            cc.sort_order
        FROM catalog_courses cc
        LEFT JOIN course_cohort_leads ccl ON ccl.course_id = cc.course_id
        GROUP BY cc.course_id, cc.course_code, cc.course_title, cc.sort_order

        UNION ALL

        -- Nhóm chưa chọn khóa học (leads.course_id IS NULL) khi không lọc 1 khóa cụ thể
        SELECT 
            NULL AS course_id,
            'UNASSIGNED' AS course_code,
            'Chưa chọn khóa học' AS course_title,
            COUNT(ccl.id) AS total_leads,
            COUNT(ccl.id) FILTER (WHERE ccl.authoritative_admission_status = 'ENROLLED') AS enrolled_leads,
            9999 AS sort_order
        FROM course_cohort_leads ccl
        WHERE ccl.course_id IS NULL AND p_course_id IS NULL
        HAVING COUNT(ccl.id) > 0
    )
    SELECT 
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'course_id', cs.course_id,
                'course_code', cs.course_code,
                'course_title', cs.course_title,
                'total_leads', cs.total_leads,
                'enrolled_leads', cs.enrolled_leads,
                'enrollment_rate', CASE 
                    WHEN cs.total_leads > 0 THEN ROUND((cs.enrolled_leads::NUMERIC / cs.total_leads::NUMERIC) * 100.0, 1)
                    ELSE NULL 
                END
            ) ORDER BY cs.total_leads DESC, cs.enrolled_leads DESC, cs.course_title ASC
        ), '[]'::JSONB),
        COUNT(*)
    INTO 
        v_course_breakdown_list,
        v_total_courses_count
    FROM course_stats cs;

    -- 8. Tính toán Danh sách 5 Khách hàng đăng ký gần đây trong tập lọc (A9.8A)
    WITH recent_cohort_leads AS (
        SELECT 
            l.id,
            l.full_name,
            l.phone,
            l.email,
            l.course_id,
            c.code AS course_code,
            c.title AS course_title,
            l.affiliate_id,
            ap.affiliate_code,
            p.full_name AS affiliate_name,
            l.counseling_status,
            l.created_at,
            l.admission_status,
            l.reconciliation_status,
            (
                SELECT lr.reconciliation_status 
                FROM public.lead_reconciliations lr 
                WHERE lr.lead_id = l.id AND lr.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM', 'MISMATCH_INVALID')
                ORDER BY lr.reconciled_at DESC LIMIT 1
            ) AS active_recon_status
        FROM public.leads l
        LEFT JOIN public.courses c ON c.id = l.course_id
        LEFT JOIN public.affiliate_profiles ap ON ap.id = l.affiliate_id
        LEFT JOIN public.profiles p ON p.id = ap.user_id
        WHERE 
            (p_start_utc IS NULL OR l.created_at >= p_start_utc)
            AND (p_end_utc IS NULL OR l.created_at < p_end_utc)
            AND (p_course_id IS NULL OR l.course_id = p_course_id)
            AND (
                (p_is_unassigned = TRUE AND l.affiliate_id IS NULL)
                OR (p_is_unassigned = FALSE AND (p_affiliate_id IS NULL OR l.affiliate_id = p_affiliate_id))
            )
        ORDER BY l.created_at DESC, l.id DESC
        LIMIT 5
    )
    SELECT 
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', rcl.id,
                'full_name', rcl.full_name,
                'phone', rcl.phone,
                'email', rcl.email,
                'course_id', rcl.course_id,
                'course_code', COALESCE(rcl.course_code, CASE WHEN rcl.course_id IS NULL THEN 'UNASSIGNED' ELSE 'UNKNOWN' END),
                'course_title', COALESCE(rcl.course_title, CASE WHEN rcl.course_id IS NULL THEN 'Chưa chọn khóa học' ELSE 'Chương trình STHC' END),
                'affiliate_id', rcl.affiliate_id,
                'affiliate_code', rcl.affiliate_code,
                'affiliate_name', rcl.affiliate_name,
                'counseling_status', COALESCE(rcl.counseling_status, 'NEW'),
                'admission_status', CASE 
                    WHEN rcl.admission_status = 'WITHDRAWN' THEN 'WITHDRAWN'
                    WHEN rcl.active_recon_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                    WHEN rcl.active_recon_status = 'MISMATCH_INVALID' THEN 'NOT_ENROLLED'
                    WHEN rcl.reconciliation_status IN ('MATCHED_VALID', 'EXISTING_IN_SCHOOL_SYSTEM') THEN 'ENROLLED'
                    WHEN rcl.admission_status = 'ENROLLED' THEN 'ENROLLED'
                    ELSE 'NOT_ENROLLED'
                END,
                'reconciliation_status', COALESCE(rcl.active_recon_status, rcl.reconciliation_status, 'NOT_RECONCILED'),
                'created_at', rcl.created_at
            ) ORDER BY rcl.created_at DESC, rcl.id DESC
        ), '[]'::JSONB),
        COUNT(*)
    INTO 
        v_recent_leads_list,
        v_recent_leads_count
    FROM recent_cohort_leads rcl;

    -- 9. Tính toán Top 5 CTV nổi bật theo tổng thù lao đã duyệt All-time (A9.8A)
    IF v_has_reward_summary_perm = TRUE THEN
        WITH aff_approved_rewards AS (
            SELECT 
                ap.id AS affiliate_id,
                ap.user_id,
                ap.affiliate_code,
                p.full_name AS affiliate_name,
                COALESCE(SUM(r.amount), 0) AS approved_reward_amount,
                COUNT(r.id) AS approved_reward_count
            FROM public.affiliate_profiles ap
            JOIN public.profiles p ON p.id = ap.user_id
            JOIN public.rewards r ON (r.affiliate_id = ap.id OR r.affiliate_id = ap.user_id)
            WHERE ap.status = 'ACTIVE'
              AND p.role = 'affiliate'
              AND p.is_active = TRUE
              AND r.status = 'APPROVED'
            GROUP BY ap.id, ap.user_id, ap.affiliate_code, p.full_name
            HAVING SUM(r.amount) > 0
            ORDER BY approved_reward_amount DESC, ap.affiliate_code ASC
            LIMIT 5
        ),
        ranked_affiliates AS (
            SELECT 
                aar.affiliate_id,
                aar.user_id,
                aar.affiliate_code,
                aar.affiliate_name,
                aar.approved_reward_amount,
                aar.approved_reward_count,
                RANK() OVER (ORDER BY aar.approved_reward_amount DESC) AS rank
            FROM aff_approved_rewards aar
        )
        SELECT 
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'rank', ra.rank,
                    'affiliate_id', ra.affiliate_id,
                    'user_id', ra.user_id,
                    'affiliate_code', ra.affiliate_code,
                    'affiliate_name', ra.affiliate_name,
                    'approved_reward_amount', ra.approved_reward_amount,
                    'approved_reward_count', ra.approved_reward_count
                ) ORDER BY ra.rank ASC, ra.affiliate_code ASC
            ), '[]'::JSONB),
            COUNT(*)
        INTO 
            v_leaderboard_items,
            v_leaderboard_count
        FROM ranked_affiliates ra;

        v_leaderboard_json := jsonb_build_object(
            'available', true,
            'items', v_leaderboard_items,
            'metadata', jsonb_build_object(
                'scope', 'SYSTEM_WIDE_ALL_TIME',
                'criteria', 'TOTAL_APPROVED_REWARD_AMOUNT',
                'total_returned', v_leaderboard_count
            )
        );
    ELSE
        v_leaderboard_json := jsonb_build_object(
            'available', false,
            'reason_code', 'PERMISSION_DENIED',
            'items', NULL
        );
    END IF;

    -- 10. Đóng gói kết quả JSON hoàn chỉnh
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
        'rewards', v_rewards_json,
        'monthly_trend', jsonb_build_object(
            'points', v_monthly_trend_points,
            'metadata', jsonb_build_object(
                'scope', 'ROLLING_12_MONTHS',
                'timezone', 'Asia/Ho_Chi_Minh',
                'enrolled_missing_date_count', v_enrolled_missing_date_count
            )
        ),
        'course_breakdown', jsonb_build_object(
            'courses', v_course_breakdown_list,
            'metadata', jsonb_build_object(
                'scope', 'FILTERED_REGISTRATION_COHORT',
                'total_courses', v_total_courses_count
            )
        ),
        'recent_leads', jsonb_build_object(
            'leads', v_recent_leads_list,
            'metadata', jsonb_build_object(
                'scope', 'FILTERED_REGISTRATION_COHORT',
                'total_returned', v_recent_leads_count
            )
        ),
        'leaderboard', v_leaderboard_json
    );

    RETURN v_result;
END;
$$;

-- Phân quyền thực thi
REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_admin_dashboard_summary_metrics(TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, BOOLEAN, BOOLEAN) TO service_role;
