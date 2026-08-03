-- Migration 005: Dashboard Feature Extensions
-- Adds missing columns and tables for enhanced dashboard features

-- =====================================================
-- NEW COLUMNS FOR EXISTING TABLES
-- =====================================================

-- Notices: Add is_urgent flag for push notifications
ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- Study Materials: Add semester_num and target_colleges
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS semester_num INTEGER CHECK (semester_num BETWEEN 1 AND 6);
ALTER TABLE study_materials ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Internships: Add target_colleges for college-specific listings
ALTER TABLE internships ADD COLUMN IF NOT EXISTS target_colleges INTEGER[];

-- Broadcasts: Add scheduled_at for scheduling messages
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- =====================================================
-- NEW TABLES FOR NEW FEATURES
-- =====================================================

-- Society Posts: Updates and announcements from societies
CREATE TABLE IF NOT EXISTS society_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id INTEGER REFERENCES societies(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  college_id INTEGER REFERENCES colleges(id),
  posted_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_society_posts_society ON society_posts(society_id);
CREATE INDEX IF NOT EXISTS idx_society_posts_created ON society_posts(created_at DESC);

-- Community Groups: Telegram/WhatsApp group links for SeniorsConnect
CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('telegram', 'whatsapp')),
  link TEXT NOT NULL,
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  description TEXT,
  created_by UUID REFERENCES admins(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_groups_platform ON community_groups(platform);
CREATE INDEX IF NOT EXISTS idx_community_groups_college ON community_groups(college_id);

-- Mentorship Requests: For SeniorsConnect allocation engine
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(10) NOT NULL CHECK (type IN ('offer', 'request')),
  student_id UUID REFERENCES students(id),
  admin_id UUID REFERENCES admins(id),
  name VARCHAR(255) NOT NULL,
  specialty VARCHAR(255),
  topic VARCHAR(255),
  description TEXT,
  college_id INTEGER REFERENCES colleges(id),
  year_id INTEGER REFERENCES years(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'closed', 'expired')),
  matched_with UUID REFERENCES mentorship_requests(id),
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentorship_type ON mentorship_requests(type, status);
CREATE INDEX IF NOT EXISTS idx_mentorship_college ON mentorship_requests(college_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_student ON mentorship_requests(student_id);

-- =====================================================
-- RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE society_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;

-- Society Posts RLS
CREATE POLICY "society_posts_read_all" ON society_posts FOR SELECT USING (true);
CREATE POLICY "society_posts_write_admin" ON society_posts FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "society_posts_delete_admin" ON society_posts FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Community Groups RLS
CREATE POLICY "community_groups_read_all" ON community_groups FOR SELECT USING (true);
CREATE POLICY "community_groups_write_admin" ON community_groups FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "community_groups_delete_admin" ON community_groups FOR DELETE 
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- Mentorship Requests RLS
CREATE POLICY "mentorship_read_all" ON mentorship_requests FOR SELECT USING (true);
CREATE POLICY "mentorship_write_admin" ON mentorship_requests FOR INSERT 
  WITH CHECK (auth.uid() IN (SELECT id FROM admins WHERE active = true));
CREATE POLICY "mentorship_update_admin" ON mentorship_requests FOR UPDATE 
  USING (auth.uid() IN (SELECT id FROM admins WHERE active = true));

-- =====================================================
-- ENABLE REALTIME FOR NEW TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE community_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE mentorship_requests;
