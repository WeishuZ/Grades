import { Router } from 'express';
import { getCourseAssignmentMatrix } from '../../../../lib/dbHelper.mjs';

const router = Router({ mergeParams: true });

/**
 * GET /admin/categories
 * Returns assignment categories organized by section
 * Format: { section: { assignmentName: true } }
 */
router.get('/', async (req, res) => {
    try {
        const { course_id: courseId } = req.query;
        const assignmentMatrix = await getCourseAssignmentMatrix(courseId || null);

        const categories = Object.entries(assignmentMatrix).reduce((acc, [section, assignments]) => {
            acc[section] = Object.keys(assignments).reduce((sectionAssignments, assignmentName) => {
                sectionAssignments[assignmentName] = true;
                return sectionAssignments;
            }, {});
            return acc;
        }, {});

        res.status(200).json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch categories' });
    }
});

export default router;
