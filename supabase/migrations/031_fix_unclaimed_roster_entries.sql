-- Fix roster entries that should be marked as claimed
-- Case 1: Student has roster_id but the roster entry is not marked claimed
UPDATE student_roster sr
SET is_claimed = true,
    claimed_by = s.id,
    claimed_at = s.created_at
FROM students s
WHERE s.roster_id = sr.id
  AND s.status = 'Active'
  AND sr.is_claimed = false;

-- Case 2: Student has no roster_id but has matching roll_number in roster
UPDATE student_roster sr
SET is_claimed = true,
    claimed_by = s.id,
    claimed_at = s.created_at
FROM students s
WHERE s.roll_number = sr.roll_number
  AND s.status = 'Active'
  AND s.roster_id IS NULL
  AND sr.is_claimed = false;

-- Also link the roster_id back to the student for Case 2
UPDATE students s
SET roster_id = sr.id
FROM student_roster sr
WHERE s.roll_number = sr.roll_number
  AND s.status = 'Active'
  AND s.roster_id IS NULL
  AND sr.is_claimed = true
  AND sr.claimed_by = s.id;
