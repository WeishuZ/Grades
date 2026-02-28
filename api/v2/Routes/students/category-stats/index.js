import { Router } from 'express';
import { getCategoryAverages, getStudentCourses, studentEnrolledInCourse } from '../../../../lib/dbHelper.mjs';
import { getEmailFromAuth } from '../../../../lib/googleAuthHelper.mjs';
import { isAdmin } from '../../../../lib/userlib.mjs';

const router = Router({ mergeParams: true });

/**
 * GET /students/category-stats
 * Returns class average percentage for each category
 * Returns: { "Category1": 85.5, "Category2": 90.2, ... }
 */
router.get('/', async (req, res) => {
    try {
        const { course_id: requestedCourseId } = req.query;
        const authEmail = await getEmailFromAuth(req);
        const requesterIsAdmin = isAdmin(authEmail);

        let courseId = requestedCourseId || null;

        if (!requesterIsAdmin) {
            const studentCourses = await getStudentCourses(authEmail);
            if (studentCourses.length === 0) {
                return res.json({});
            }

            if (courseId) {
                const enrolled = await studentEnrolledInCourse(authEmail, courseId);
                if (!enrolled) {
                    return res.status(403).json({ message: 'Access denied for requested course.' });
                }
            } else {
                const defaultCourse = studentCourses[0];
                courseId = defaultCourse.gradescope_course_id || defaultCourse.id;
            }
        }

        const categoryAverages = await getCategoryAverages(courseId);
        res.json(categoryAverages);
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch category stats' });
    }
});

export default router;
