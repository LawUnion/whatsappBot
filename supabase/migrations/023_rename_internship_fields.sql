-- Rename internship fields and make link/date optional
-- company_name -> title
-- description -> info
-- deadline and apply_url should be optional

-- Rename columns
ALTER TABLE internships RENAME COLUMN company_name TO title;
ALTER TABLE internships RENAME COLUMN description TO info;

-- Note: deadline, apply_url and file_url are already nullable in the schema
