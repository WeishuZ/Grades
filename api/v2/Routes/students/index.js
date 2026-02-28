import { Router } from 'express';
import RateLimit from 'express-rate-limit';
import GradesRouter from './grades/index.js';
import ProjectionsRouter from './projections/index.js';
import ConceptStructureRouter from './concept-structure/index.js';
import CategoryStatsRouter from './category-stats/index.js';
import { validateAdminOrStudentMiddleware } from '../../../lib/authlib.mjs';
import { validateAdminMiddleware } from '../../../lib/authlib.mjs';
import { getEmailFromAuth } from '../../../lib/googleAuthHelper.mjs';
import { getStudentsByCourse, getStudentCourses, getAllStudentsFromDb } from '../../../lib/dbHelper.mjs';

const router = Router({ mergeParams: true });

// Rate limit calls to 100 per 5 minutes
router.use(
    RateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 100, // 100 requests
    }),
);

// Current user's enrolled courses (students) or all courses (admins).
router.get('/courses', validateAdminOrStudentMiddleware, async (req, res) => {
    try {
        const authEmail = await getEmailFromAuth(req);
        const courses = await getStudentCourses(authEmail);
        return res.status(200).json({ courses });
    } catch (err) {
        console.error('Error fetching current user courses:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.use('/category-stats', validateAdminOrStudentMiddleware, CategoryStatsRouter);

// Ensure a student can only access their own email-based resources.
router.use('/:email', validateAdminOrStudentMiddleware);

router.use('/:email/grades', GradesRouter);
router.use('/:email/projections', ProjectionsRouter);
router.use('/:email/concept-structure', ConceptStructureRouter);

router.get('/', validateAdminMiddleware, async (req, res) => {
    try {
        const { course_id: courseId } = req.query;

        if (courseId) {
            const students = await getStudentsByCourse(courseId);
            return res.status(200).json({ students });
        }

        const students = await getAllStudentsFromDb();
        return res.status(200).json({ students });
    } catch (err) {
        console.error(`Internal service error fetching all students. `, err);
        return res.status(500).json({ message: "Internal server error." });
    }
});

export default router;
