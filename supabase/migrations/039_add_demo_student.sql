-- Insert a demo student for testing the bot registration flow

INSERT INTO student_roster (
    form_number,
    roll_number,
    name,
    father_name,
    college_code,
    admission_batch,
    section_name
) VALUES (
    'DEMO123',
    '999999',
    'Demo Student',
    'Test Father',
    'LC1',
    '2026',
    'A'
) ON CONFLICT (form_number) DO NOTHING;
