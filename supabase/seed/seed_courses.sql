-- ==============================================================================
-- BƯỚC DB-A: SEED DATA - DANH MỤC KHÓA HỌC TRƯỜNG SAIGONTOURIST (STHC)
-- Tách riêng hoàn toàn khỏi migration cấu trúc.
-- Mã file: /supabase/seed/seed_courses.sql
-- ==============================================================================

INSERT INTO public.courses (
    code,
    title,
    slug,
    department,
    degree_level,
    duration_text,
    tuition_fee_estimate,
    summary,
    description_html,
    is_active,
    sort_order
) VALUES
-- 1. KHOA BẾP (CULINARY ARTS)
(
    'BEP-A-AU-TC',
    'Kỹ thuật Chế biến Món ăn Á - Âu (Hệ Trung cấp)',
    'ky-thuat-che-bien-mon-an-a-au',
    'Khoa Bếp',
    'Trung cấp chính quy',
    '2 năm (4 học kỳ)',
    14500000.00,
    'Đào tạo chuyên sâu kỹ năng chế biến món ăn Việt Nam, món Á và món Âu tiêu chuẩn khách sạn 5 sao.',
    '<p>Chương trình đào tạo thực hành chiếm 70% thời lượng. Học viên được trực tiếp thực tập tại các khách sạn 4-5 sao thuộc Saigontourist Group như Rex Hotel, Caravelle, Grand Hotel Saigon, Majestic.</p>',
    TRUE,
    1
),
(
    'BEP-BANH-AU-TC',
    'Nghệ thuật Làm Bánh & Bánh Ngọt Âu (Hệ Trung cấp)',
    'nghe-thuat-lam-banh-ngot-au',
    'Khoa Bếp',
    'Trung cấp chính quy',
    '2 năm (4 học kỳ)',
    15000000.00,
    'Nắm vững kỹ thuật làm bánh mì, bánh lạnh, pastry và nghệ thuật trang trí bánh kem chuẩn châu Âu.',
    '<p>Phòng thực hành trang bị lò nướng hiện đại theo tiêu chuẩn công nghiệp châu Âu, cam kết việc làm sau tốt nghiệp.</p>',
    TRUE,
    2
),
(
    'BEP-TRUONG-CD',
    'Nghiệp vụ Bếp Trưởng Điều hành (Khóa Chuyên đề)',
    'nghiep-vu-bep-truong-dieu-hanh',
    'Khoa Bếp',
    'Chứng chỉ chuyên đề',
    '3 tháng (Cuối tuần)',
    8500000.00,
    'Khóa học quản trị bếp, tính toán cost món ăn, quản trị nhân sự bếp dành cho người đã có tay nghề.',
    '<p>Giảng dạy bởi các Bếp trưởng giàu kinh nghiệm tại các khách sạn danh tiếng của Saigontourist Group.</p>',
    TRUE,
    3
),

-- 2. KHOA QUẢN TRỊ KHÁCH SẠN (HOSPITALITY MANAGEMENT)
(
    'KS-QT-TC',
    'Quản trị Khách sạn & Khu Nghỉ dưỡng (Hệ Trung cấp)',
    'quan-tri-khach-san-khu-nghi-duong',
    'Khoa Khách sạn',
    'Trung cấp chính quy',
    '2 năm (4 học kỳ)',
    13500000.00,
    'Chương trình đào tạo quản lý lưu trú, lễ tân, buồng phòng và vận hành tiền sảnh theo chuẩn ASEAN.',
    '<p>Học viên được rèn luyện tiếng Anh chuyên ngành du lịch khách sạn và thực tập có phụ cấp tại hệ thống khu nghỉ dưỡng Saigontourist trên toàn quốc.</p>',
    TRUE,
    4
),
(
    'KS-LE-TAN-SC',
    'Nghiệp vụ Lễ tân Quốc tế (Hệ Sơ cấp)',
    'nghiep-vu-le-tan-quoc-te',
    'Khoa Khách sạn',
    'Sơ cấp nghề',
    '3 tháng',
    5500000.00,
    'Đào tạo kỹ năng giao tiếp, xử lý tình huống check-in/check-out và sử dụng phần mềm quản lý khách sạn quốc tế.',
    '<p>Thực hành trực tiếp trên hệ thống PMS Smile / Opera tiêu chuẩn khách sạn 4-5 sao.</p>',
    TRUE,
    5
),

-- 3. KHOA QUẢN TRỊ NHÀ HÀNG & F&B (RESTAURANT & F&B SERVICE)
(
    'NH-QT-TC',
    'Quản trị Nhà hàng & Dịch vụ Ẩm thực (Hệ Trung cấp)',
    'quan-tri-nha-hang-dich-vu-am-thuc',
    'Khoa Nhà hàng',
    'Trung cấp chính quy',
    '2 năm (4 học kỳ)',
    13000000.00,
    'Đào tạo nghệ thuật phục vụ bàn Á-Âu, tổ chức tiệc buffet, yến tiệc hội nghị và quản lý bar.',
    '<p>Cơ hội tham gia phục vụ tại các sự kiện ngoại giao và hội nghị quốc tế do Saigontourist Group tổ chức.</p>',
    TRUE,
    6
),
(
    'NH-BARTENDER-SC',
    'Nghệ thuật Pha chế Bartender & Barista Chuyên nghiệp',
    'pha-che-bartender-barista-chuyen-nghiep',
    'Khoa Nhà hàng',
    'Sơ cấp nghề',
    '3 tháng',
    6000000.00,
    'Học pha chế cocktail quốc tế, nghệ thuật vẽ Latte Art và kỹ thuật biểu diễn Flair Bartending.',
    '<p>Trang bị quầy bar thực hành đạt chuẩn quốc tế, nguyên liệu phong phú và giảng viên đạt giải pha chế quốc gia.</p>',
    TRUE,
    7
),

-- 4. KHOA DU LỊCH & LỮ HÀNH (TOURISM & TRAVEL)
(
    'DL-HDV-TC',
    'Hướng dẫn Du lịch Quốc tế & Nội địa (Hệ Trung cấp)',
    'huong-dan-du-lich-quoc-te-noi-dia',
    'Khoa Du lịch',
    'Trung cấp chính quy',
    '2 năm (4 học kỳ)',
    12500000.00,
    'Trang bị kiến thức lịch sử, văn hóa, kỹ năng thuyết minh và sơ cấp cứu tour du lịch.',
    '<p>Sau khi tốt nghiệp đủ điều kiện xin cấp Thẻ Hướng dẫn viên du lịch nội địa / quốc tế của Sở Du lịch.</p>',
    TRUE,
    8
)
ON CONFLICT (code) DO UPDATE 
SET title = EXCLUDED.title,
    department = EXCLUDED.department,
    degree_level = EXCLUDED.degree_level,
    duration_text = EXCLUDED.duration_text,
    tuition_fee_estimate = EXCLUDED.tuition_fee_estimate,
    summary = EXCLUDED.summary,
    description_html = EXCLUDED.description_html,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
