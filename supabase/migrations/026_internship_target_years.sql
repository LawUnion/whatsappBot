-- Migration 026: Add target_years to internships for year-based filtering
-- Also add accommodation_requests table for accommodation help feature

-- Add target_years column to internships
ALTER TABLE internships ADD COLUMN IF NOT EXISTS target_years INTEGER[];

-- Create index for year filtering
CREATE INDEX IF NOT EXISTS idx_internships_target_years ON internships USING GIN (target_years);

-- =====================================================
-- ACCOMMODATION HELP TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS accommodation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  message TEXT,
  photo_file_id TEXT,
  video_file_id TEXT,
  status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Replied', 'Closed')),
  admin_reply TEXT,
  admin_reply_photo TEXT,
  admin_reply_video TEXT,
  replied_by UUID REFERENCES admins(id),
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accommodation_status ON accommodation_requests(status);
CREATE INDEX IF NOT EXISTS idx_accommodation_student ON accommodation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_created ON accommodation_requests(created_at DESC);

-- RLS
ALTER TABLE accommodation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view accommodation requests"
ON accommodation_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

CREATE POLICY "Admins can update accommodation requests"
ON accommodation_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

CREATE POLICY "Service role can insert accommodation requests"
ON accommodation_requests FOR INSERT
WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE accommodation_requests;
