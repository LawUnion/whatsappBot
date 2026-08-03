-- Seed Data for Law Faculty Structure
-- Populates initial data for colleges, years, semesters, sections, societies, and event types

-- =====================================================
-- INSERT COLLEGES
-- =====================================================

INSERT INTO colleges (code, name) VALUES
  ('LC-1', 'Law Centre-1'),
  ('LC-2', 'Law Centre-2'),
  ('CLC', 'Campus Law Centre');

-- =====================================================
-- INSERT YEARS AND SEMESTERS FOR EACH COLLEGE
-- =====================================================

-- LC-1 (id=1)
INSERT INTO years (college_id, year_number, name) VALUES
  (1, 1, '1st Year'),
  (1, 2, '2nd Year'),
  (1, 3, '3rd Year');

INSERT INTO semesters (year_id, semester_number, name) VALUES
  (1, 1, 'Semester 1'),
  (1, 2, 'Semester 2'),
  (2, 3, 'Semester 3'),
  (2, 4, 'Semester 4'),
  (3, 5, 'Semester 5'),
  (3, 6, 'Semester 6');

-- LC-2 (id=2)
INSERT INTO years (college_id, year_number, name) VALUES
  (2, 1, '1st Year'),
  (2, 2, '2nd Year'),
  (2, 3, '3rd Year');

INSERT INTO semesters (year_id, semester_number, name) VALUES
  (4, 1, 'Semester 1'),
  (4, 2, 'Semester 2'),
  (5, 3, 'Semester 3'),
  (5, 4, 'Semester 4'),
  (6, 5, 'Semester 5'),
  (6, 6, 'Semester 6');

-- CLC (id=3)
INSERT INTO years (college_id, year_number, name) VALUES
  (3, 1, '1st Year'),
  (3, 2, '2nd Year'),
  (3, 3, '3rd Year');

INSERT INTO semesters (year_id, semester_number, name) VALUES
  (7, 1, 'Semester 1'),
  (7, 2, 'Semester 2'),
  (8, 3, 'Semester 3'),
  (8, 4, 'Semester 4'),
  (9, 5, 'Semester 5'),
  (9, 6, 'Semester 6');

-- =====================================================
-- INSERT SECTIONS
-- LC-1: Year 1 (A-L: 12), Year 2 (A-J: 10), Year 3 (A-I: 9)
-- LC-2: Year 1 (A-K: 11), Year 2 (A-J: 10), Year 3 (A-I: 9)
-- CLC: Year 1 (A-L: 12), Year 2 (A-I: 9), Year 3 (A-I: 9)
-- =====================================================

-- LC-1 Year 1 (Semesters 1-2): A-L (12 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(1, 2) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) AS letter;

-- LC-1 Year 2 (Semesters 3-4): A-J (10 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(3, 4) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) AS letter;

-- LC-1 Year 3 (Semesters 5-6): A-I (9 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(5, 6) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) AS letter;

-- LC-2 Year 1 (Semesters 7-8): A-K (11 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(7, 8) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']) AS letter;

-- LC-2 Year 2 (Semesters 9-10): A-J (10 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(9, 10) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) AS letter;

-- LC-2 Year 3 (Semesters 11-12): A-I (9 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(11, 12) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) AS letter;

-- CLC Year 1 (Semesters 13-14): A-L (12 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(13, 14) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) AS letter;

-- CLC Year 2 (Semesters 15-16): A-I (9 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(15, 16) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) AS letter;

-- CLC Year 3 (Semesters 17-18): A-I (9 sections)
INSERT INTO sections (semester_id, name)
SELECT semester_id, letter
FROM generate_series(17, 18) AS semester_id
CROSS JOIN unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) AS letter;

-- =====================================================
-- INSERT SOCIETIES (8 per college = 24 total)
-- =====================================================

-- LC-1 Societies
INSERT INTO societies (college_id, name, slug, description) VALUES
  (1, 'Debate & Discussion Society', 'debate-discussion', 'Fostering critical thinking and public speaking'),
  (1, 'Moot Court Society', 'moot-court', 'Practical legal advocacy and courtroom skills'),
  (1, 'Legal Aid Society', 'legal-aid', 'Providing free legal assistance to underserved communities'),
  (1, 'Corporate Law Society', 'corporate-law', 'Exploring corporate governance and business law'),
  (1, 'Entrepreneurship Society', 'entrepreneurship', 'Promoting innovation and startup culture'),
  (1, 'Constitutional Law Society', 'constitutional-law', 'Studying constitutional principles and rights'),
  (1, 'National Service Scheme (NSS)', 'nss', 'Community service and social welfare'),
  (1, 'North Eastern Society', 'north-eastern', 'Cultural representation and advocacy');

-- LC-2 Societies
INSERT INTO societies (college_id, name, slug, description) VALUES
  (2, 'Debate & Discussion Society', 'debate-discussion', 'Fostering critical thinking and public speaking'),
  (2, 'Moot Court Society', 'moot-court', 'Practical legal advocacy and courtroom skills'),
  (2, 'Legal Aid Society', 'legal-aid', 'Providing free legal assistance to underserved communities'),
  (2, 'Corporate Law Society', 'corporate-law', 'Exploring corporate governance and business law'),
  (2, 'Entrepreneurship Society', 'entrepreneurship', 'Promoting innovation and startup culture'),
  (2, 'Constitutional Law Society', 'constitutional-law', 'Studying constitutional principles and rights'),
  (2, 'National Service Scheme (NSS)', 'nss', 'Community service and social welfare'),
  (2, 'North Eastern Society', 'north-eastern', 'Cultural representation and advocacy');

-- CLC Societies
INSERT INTO societies (college_id, name, slug, description) VALUES
  (3, 'Debate & Discussion Society', 'debate-discussion', 'Fostering critical thinking and public speaking'),
  (3, 'Moot Court Society', 'moot-court', 'Practical legal advocacy and courtroom skills'),
  (3, 'Legal Aid Society', 'legal-aid', 'Providing free legal assistance to underserved communities'),
  (3, 'Corporate Law Society', 'corporate-law', 'Exploring corporate governance and business law'),
  (3, 'Entrepreneurship Society', 'entrepreneurship', 'Promoting innovation and startup culture'),
  (3, 'Constitutional Law Society', 'constitutional-law', 'Studying constitutional principles and rights'),
  (3, 'National Service Scheme (NSS)', 'nss', 'Community service and social welfare'),
  (3, 'North Eastern Society', 'north-eastern', 'Cultural representation and advocacy');

-- =====================================================
-- INSERT EVENT TYPES (9 types)
-- =====================================================

INSERT INTO event_types (name, slug, icon) VALUES
  ('Debate', 'debate', '🎤'),
  ('Fest', 'fest', '🎉'),
  ('Student Union', 'student-union', '🗳️'),
  ('Client Counselling', 'client-counselling', '⚖️'),
  ('Competition', 'competition', '🏆'),
  ('Bhandara Khaoge', 'bhandara', '🍽️'),
  ('Workshop / Seminar', 'workshop', '📚'),
  ('Cultural Program', 'cultural', '🎭'),
  ('Any Other Event', 'other', '📅');

-- =====================================================
-- INSERT DEFAULT BOT BUTTONS
-- =====================================================

INSERT INTO bot_buttons (label, icon, action_type, action_value, row_order, button_order) VALUES
  ('Class Schedule', '📅', 'MODULE', 'schedule', 1, 1),
  ('Daily Notes', '📓', 'MODULE', 'notes', 1, 2),
  ('Study Material', '📚', 'MODULE', 'study-materials', 1, 3),
  ('Notices', '📢', 'MODULE', 'notices', 2, 1),
  ('Events', '🎭', 'MODULE', 'events', 2, 2),
  ('Internships', '💼', 'MODULE', 'internships', 2, 3),
  ('Societies', '🏢', 'MODULE', 'societies', 3, 1),
  ('Message Us', '💬', 'MODULE', 'support', 3, 2),
  ('Seniors Connect', '🎓', 'MODULE', 'seniors-connect', 3, 3);

-- =====================================================
-- INSERT DEFAULT BOT SETTINGS
-- =====================================================

INSERT INTO bot_settings (ai_enabled, ai_doc_count) VALUES (false, 0);

-- =====================================================
-- NOTE: Admin users will be created via Supabase Auth
-- Then manually added to admins table with appropriate roles
-- =====================================================
