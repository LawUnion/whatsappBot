-- Initial Database Schema for Law Connect Bot
-- Creates all tables for the Faculty of Law admin panel

-- =====================================================
-- ACADEMIC HIERARCHY TABLES
-- =====================================================

-- Colleges (LC-1, LC-2, CLC)
CREATE TABLE colleges (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Years (1st, 2nd, 3rd)
CREATE TABLE years (
  id SERIAL PRIMARY KEY,
  college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
  year_number INTEGER NOT NULL CHECK (year_number BETWEEN 1 AND 3),
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, year_number)
);

CREATE INDEX idx_years_college ON years(college_id);

-- Semesters (1-6, two per year)
CREATE TABLE semesters (
  id SERIAL PRIMARY KEY,
  year_id INTEGER REFERENCES years(id) ON DELETE CASCADE,
  semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 6),
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year_id, semester_number)
);

CREATE INDEX idx_semesters_year ON semesters(year_id);

-- Sections (A, B, C, ..., L)
CREATE TABLE sections (
  id SERIAL PRIMARY KEY,
  semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
  name VARCHAR(5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semester_id, name)
);

CREATE INDEX idx_sections_semester ON sections(semester_id);

-- Societies (8 per college)
CREATE TABLE societies (
  id SERIAL PRIMARY KEY,
  college_id INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(college_id, slug)
);

CREATE INDEX idx_societies_college ON societies(college_id);

-- Event Types (9 total)
CREATE TABLE event_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(10), -- Emoji
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER TABLES
-- =====================================================

-- Admins (extends Supabase auth.users)
CREATE TABLE admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'SUPER_ADMIN',
    'COLLEGE_CONTENT_ADMIN',
    'NOTICES_ADMIN',
    'SOCIETIES_ADMIN',
    'SECTION_ADMIN',
    'STUDY_MATERIAL_ADMIN',
    'EVENTS_ADMIN',
    'INTERNSHIP_ADMIN'
  )),
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  section_id INTEGER REFERENCES sections(id),
  society_id INTEGER REFERENCES societies(id),
  active BOOLEAN DEFAULT TRUE,
  first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_college ON admins(college_id);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(255),
  roll_number VARCHAR(50),
  name VARCHAR(255),
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  section_id INTEGER REFERENCES sections(id),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Blocked')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_telegram ON students(telegram_user_id);
CREATE INDEX idx_students_college ON students(college_id);
CREATE INDEX idx_students_section ON students(section_id);

-- =====================================================
-- BOT CONFIGURATION TABLES
-- =====================================================

-- Bot Buttons (dynamic keyboard)
CREATE TABLE bot_buttons (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(10), -- Emoji
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('MODULE', 'URL', 'TEXT')),
  action_value TEXT NOT NULL,
  row_order INTEGER NOT NULL,
  button_order INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(row_order, button_order)
);

CREATE INDEX idx_bot_buttons_active ON bot_buttons(active, row_order, button_order);

CREATE TABLE bot_settings (
  id SERIAL PRIMARY KEY,
  telegram_token TEXT,
  telegram_webhook_url TEXT,
  ai_enabled BOOLEAN DEFAULT FALSE,
  ai_doc_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTENT TABLES
-- =====================================================

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id INTEGER REFERENCES event_types(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE,
  event_time TIME,
  location VARCHAR(255),
  file_url TEXT,
  college_id INTEGER REFERENCES colleges(id),
  society_id INTEGER REFERENCES societies(id),
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events(event_date DESC);
CREATE INDEX idx_events_college ON events(college_id);

-- Internships
CREATE TABLE internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  description TEXT,
  deadline DATE,
  apply_url TEXT,
  file_url TEXT,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_internships_deadline ON internships(deadline);

-- Notices
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  section_id INTEGER REFERENCES sections(id),
  posted_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notices_created ON notices(created_at DESC);
CREATE INDEX idx_notices_college ON notices(college_id);

-- Study Materials
CREATE TABLE study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  description TEXT,
  file_url TEXT,
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  section_id INTEGER REFERENCES sections(id),
  uploaded_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_materials_college ON study_materials(college_id);

-- Schedule Notes
CREATE TABLE schedule_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  semester_id INTEGER REFERENCES semesters(id),
  section_id INTEGER REFERENCES sections(id),
  subject VARCHAR(255),
  topic VARCHAR(255),
  notes TEXT,
  file_url TEXT,
  posted_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_notes_date ON schedule_notes(date DESC);
CREATE INDEX idx_schedule_notes_section ON schedule_notes(section_id);

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  target_level VARCHAR(20) CHECK (target_level IN ('FACULTY', 'COLLEGE', 'YEAR', 'SECTION')),
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  section_id INTEGER REFERENCES sections(id),
  sent_by UUID REFERENCES admins(id),
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Success', 'Partial', 'Failed')),
  recipient_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_created ON broadcasts(created_at DESC);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(255) NOT NULL,
  module VARCHAR(100),
  scope VARCHAR(100),
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_admin ON activity_logs(admin_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Support Messages
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_messages_read ON support_messages(read);
CREATE INDEX idx_support_messages_created ON support_messages(created_at DESC);

-- =====================================================
-- ENABLE REALTIME FOR SPECIFIC TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
