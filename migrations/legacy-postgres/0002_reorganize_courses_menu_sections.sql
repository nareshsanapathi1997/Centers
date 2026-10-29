-- Reorganize Courses menu into School Level and College Level sections.
-- Safe to run multiple times.

DO $$
DECLARE
  courses_id INTEGER;
  school_id INTEGER;
  college_id INTEGER;
BEGIN
  SELECT id INTO courses_id FROM header_menu_items
  WHERE menu_key = 'courses' AND parent_id IS NULL LIMIT 1;

  IF courses_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
  VALUES ('courses_school_level', courses_id, 'School Level Courses', NULL, NULL, NULL, 1, true)
  ON CONFLICT DO NOTHING;

  INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
  VALUES ('courses_college_level', courses_id, 'College Level Courses', NULL, NULL, NULL, 2, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO school_id FROM header_menu_items WHERE menu_key = 'courses_school_level' LIMIT 1;
  SELECT id INTO college_id FROM header_menu_items WHERE menu_key = 'courses_college_level' LIMIT 1;

  UPDATE header_menu_items SET parent_id = school_id, display_order = 1, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_jee' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = school_id, display_order = 2, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_neet' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = school_id, display_order = 3, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_clat' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = school_id, display_order = 4, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_ipm' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = college_id, display_order = 1, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_cat' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = college_id, display_order = 2, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_bank' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = college_id, display_order = 3, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_gate' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = college_id, display_order = 4, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_gmat' AND parent_id = courses_id;

  UPDATE header_menu_items SET parent_id = college_id, display_order = 5, updated_at = CURRENT_TIMESTAMP
  WHERE menu_key = 'courses_icet' AND parent_id = courses_id;
END $$;
