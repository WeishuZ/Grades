import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router({ mergeParams: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRADE_SYNC_CONFIG_PATH = path.resolve(__dirname, '../../../../gradesync/config.json');

const DEFAULT_GRADE_BINS = [
    { grade: 'A+', range: '390-400' },
    { grade: 'A', range: '370-390' },
    { grade: 'A-', range: '360-370' },
    { grade: 'B+', range: '350-360' },
    { grade: 'B', range: '330-350' },
    { grade: 'B-', range: '320-330' },
    { grade: 'C+', range: '310-320' },
    { grade: 'C', range: '290-310' },
    { grade: 'C-', range: '280-290' },
    { grade: 'D', range: '240-280' },
    { grade: 'F', range: '0-240' }
];

async function loadGradeSyncConfig() {
    const raw = await fs.readFile(GRADE_SYNC_CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed?.courses || [];
}

function resolveCourseById(courses, requestedCourseId) {
    if (!Array.isArray(courses) || courses.length === 0) {
        return null;
    }

    if (!requestedCourseId || typeof requestedCourseId !== 'string') {
        return courses[0];
    }

    const normalized = requestedCourseId.trim();
    if (!normalized) {
        return courses[0];
    }

    const matched = courses.find((course) => (
        String(course?.id || '') === normalized ||
        String(course?.sources?.gradescope?.course_id || '') === normalized
    ));

    return matched || courses[0];
}

function normalizeBins(rawBins) {
    if (!Array.isArray(rawBins) || rawBins.length === 0) {
        return DEFAULT_GRADE_BINS;
    }

    const formatted = rawBins
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            if (item.grade && item.range) {
                return {
                    grade: String(item.grade),
                    range: String(item.range)
                };
            }

            if (item.letter && item.range) {
                return {
                    grade: String(item.letter),
                    range: String(item.range)
                };
            }

            return null;
        })
        .filter(Boolean);

    return formatted.length > 0 ? formatted : DEFAULT_GRADE_BINS;
}

function normalizeAssignmentPoints(rawBreakdown) {
    if (!rawBreakdown) {
        return {};
    }

    if (!Array.isArray(rawBreakdown) && typeof rawBreakdown === 'object') {
        return rawBreakdown;
    }

    if (!Array.isArray(rawBreakdown)) {
        return {};
    }

    return rawBreakdown.reduce((acc, item) => {
        if (!item || typeof item !== 'object') {
            return acc;
        }

        const name = item.assignment || item.name;
        const points = item.points;

        if (typeof name === 'string' && name.trim()) {
            acc[name.trim()] = Number(points) || 0;
        }

        return acc;
    }, {});
}

router.get('/', async (req, res) => {
    const { course_id: requestedCourseId } = req.query;

    try {
        const courses = await loadGradeSyncConfig();
        const course = resolveCourseById(courses, requestedCourseId);

        const bins = normalizeBins(course?.buckets?.grade_bins);
        const assignmentPoints = normalizeAssignmentPoints(course?.buckets?.grading_breakdown);
        const totalCoursePoints = Object.values(assignmentPoints).reduce((sum, val) => sum + (Number(val) || 0), 0);
        
        const response = {
            bins,
            assignment_points: assignmentPoints,
            total_course_points: totalCoursePoints,
            course_id: course?.id || requestedCourseId || null,
            source: 'gradesync_config'
        };

        return res.status(200).json(response);
    } catch (err) {
        console.error('Error retrieving bins from GradeSync config:', {
            message: err?.message,
            courseId: requestedCourseId || null
        });
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default router;
