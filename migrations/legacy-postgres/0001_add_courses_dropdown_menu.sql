-- Convert Courses header menu to dropdown with default course links.
-- Safe to run multiple times (skips existing menu_key rows).

UPDATE header_menu_items
SET target_section = NULL, updated_at = CURRENT_TIMESTAMP
WHERE menu_key = 'courses' AND parent_id IS NULL;

INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
SELECT v.menu_key, p.id, v.title, v.icon_class, NULL, v.target_section, v.display_order, true
FROM header_menu_items p
CROSS JOIN (VALUES
    ('courses_cat', 'CAT/MBA', 'ri-graduation-cap-line', '#department', 1),
    ('courses_bank', 'Bank Exams', 'ri-bank-line', '#department', 2),
    ('courses_gate', 'GATE', 'ri-book-open-line', '#department', 3),
    ('courses_gmat', 'GMAT', 'ri-file-paper-line', '#department', 4),
    ('courses_jee', 'JEE/Engg', 'ri-calculator-line', '#department', 5),
    ('courses_neet', 'NEET', 'ri-heart-pulse-line', '#department', 6),
    ('courses_clat', 'CLAT', 'ri-scales-line', '#department', 7),
    ('courses_ipm', 'IPM/BBA', 'ri-building-line', '#department', 8),
    ('courses_icet', 'ICET', 'ri-file-list-3-line', '#department', 9)
) AS v(menu_key, title, icon_class, target_section, display_order)
WHERE p.menu_key = 'courses' AND p.parent_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM header_menu_items existing WHERE existing.menu_key = v.menu_key);
