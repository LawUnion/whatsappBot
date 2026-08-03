-- Fix college_id and year_id for newly imported LC-1 1st year students

-- Set college_id = (id of Law Centre-1)
UPDATE student_roster
SET college_id = (SELECT id FROM colleges WHERE code = 'LC-1')
WHERE college_code = 'LC1';

-- Set year_id = (id of 1st year for LC-1)
UPDATE student_roster
SET year_id = (SELECT id FROM years WHERE name = '1st Year' AND college_id = (SELECT id FROM colleges WHERE code = 'LC-1'))
WHERE admission_batch = '2026';
