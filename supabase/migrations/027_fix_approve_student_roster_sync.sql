-- Migration 027: Fix approve_student RPC to sync roster by roll number
-- When a student has no roster_id but their roll number matches a roster entry,
-- link them and mark the roster entry as claimed

CREATE OR REPLACE FUNCTION approve_student(
  p_student_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_roster_id UUID;
  v_roll_number VARCHAR(50);
BEGIN
  -- Get the roster_id and roll_number from the student
  SELECT roster_id, roll_number INTO v_roster_id, v_roll_number
  FROM students WHERE id = p_student_id;

  -- Update student status
  UPDATE students
  SET status = 'Active',
      approved_by = p_admin_id,
      approved_at = NOW()
  WHERE id = p_student_id AND status = 'Pending';

  -- Mark roster entry as claimed
  IF v_roster_id IS NOT NULL THEN
    UPDATE student_roster
    SET is_claimed = TRUE,
        claimed_by = p_student_id,
        claimed_at = NOW()
    WHERE id = v_roster_id;
  ELSIF v_roll_number IS NOT NULL THEN
    -- Look up roster entry by roll number
    SELECT id INTO v_roster_id
    FROM student_roster
    WHERE roll_number = v_roll_number AND is_claimed = FALSE
    LIMIT 1;

    IF v_roster_id IS NOT NULL THEN
      -- Mark roster as claimed
      UPDATE student_roster
      SET is_claimed = TRUE,
          claimed_by = p_student_id,
          claimed_at = NOW()
      WHERE id = v_roster_id;

      -- Link roster to student
      UPDATE students
      SET roster_id = v_roster_id
      WHERE id = p_student_id;
    END IF;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
