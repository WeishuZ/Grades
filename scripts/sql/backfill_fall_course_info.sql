-- Backfill Fall course metadata in courses table.
-- Source of truth: gradesync/config.json
-- Matched config row:
--   id=cs10_fa25, semester=Fall, year=2025, gradescope.course_id=1098053
-- Note: config currently has Spring row (cs10_sp26) sharing the same gradescope.course_id.
-- To avoid mismatching terms, this script only targets the Fall mapping above.
-- Usage:
--   psql "$DATABASE_URL" -f scripts/sql/backfill_fall_course_info.sql

BEGIN;

-- Step 1: apply Fall metadata from config mapping.
WITH fall_courses(gradescope_course_id, course_name, course_year) AS (
    VALUES
    ('1098053', 'CS10: The Beauty and Joy of Computing', 2025)
)
UPDATE courses c
SET
    semester = 'Fall',
    year = fc.course_year::text,
    name = COALESCE(NULLIF(c.name, ''), fc.course_name),
    updated_at = CURRENT_TIMESTAMP
FROM fall_courses fc
WHERE c.gradescope_course_id = fc.gradescope_course_id;

-- Step 2: verify all target courses are now complete.
SELECT
    c.id,
    c.gradescope_course_id,
    c.name,
    c.semester,
    c.year
FROM courses c
WHERE c.gradescope_course_id IN (
    '1098053'
)
ORDER BY c.gradescope_course_id;

-- Step 3: isolation check - each returned student belongs to at least one submission in the selected course.
-- Uses Fall course_id from config.
SELECT DISTINCT
    st.email,
    COALESCE(st.legal_name, st.email) AS legal_name
FROM submissions s
JOIN students st ON st.id = s.student_id
JOIN assignments a ON a.id = s.assignment_id
JOIN courses c ON c.id = a.course_id
WHERE c.gradescope_course_id = '1098053'
ORDER BY legal_name;

COMMIT;
