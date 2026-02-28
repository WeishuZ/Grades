-- Make students course-scoped:
-- - same email + same course => one student
-- - same email + different course => separate student rows

BEGIN;

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS course_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'students'
          AND constraint_name = 'fk_students_course_id'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT fk_students_course_id
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_students_course_id ON students(course_id);

-- Remove legacy uniqueness before cloning rows across courses.
ALTER TABLE students
    DROP CONSTRAINT IF EXISTS uq_student_sid_email;

-- Backfill course_id for existing students based on their submissions.
WITH primary_course AS (
    SELECT
        s.student_id,
        a.course_id,
        ROW_NUMBER() OVER (PARTITION BY s.student_id ORDER BY a.course_id) AS rn
    FROM submissions s
    JOIN assignments a ON a.id = s.assignment_id
    GROUP BY s.student_id, a.course_id
)
UPDATE students st
SET course_id = pc.course_id
FROM primary_course pc
WHERE st.id = pc.student_id
  AND pc.rn = 1
  AND st.course_id IS NULL;

-- Clone students that have submissions in multiple courses, and remap submissions.
DO $$
DECLARE
    rec RECORD;
    new_student_id INTEGER;
BEGIN
    FOR rec IN
        SELECT
            st.id AS old_student_id,
            a.course_id,
            st.sid,
            st.email,
            st.legal_name,
            st.created_at,
            ROW_NUMBER() OVER (PARTITION BY st.id ORDER BY a.course_id) AS rn
        FROM students st
        JOIN submissions s ON s.student_id = st.id
        JOIN assignments a ON a.id = s.assignment_id
        GROUP BY st.id, a.course_id, st.sid, st.email, st.legal_name, st.created_at
    LOOP
        IF rec.rn > 1 THEN
            INSERT INTO students (sid, email, legal_name, created_at, course_id)
            VALUES (rec.sid, rec.email, rec.legal_name, rec.created_at, rec.course_id)
            RETURNING id INTO new_student_id;

            UPDATE submissions sub
            SET student_id = new_student_id
            FROM assignments a
            WHERE sub.student_id = rec.old_student_id
              AND sub.assignment_id = a.id
              AND a.course_id = rec.course_id;
        END IF;
    END LOOP;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'students'
          AND constraint_name = 'uq_student_email_course'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT uq_student_email_course UNIQUE (email, course_id);
    END IF;
END $$;

COMMIT;
