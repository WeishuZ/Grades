import { Router } from 'express';
import { getEmailFromAuth } from '../../../lib/googleAuthHelper.mjs';
import { studentExistsInDb } from '../../../lib/dbHelper.mjs';

const router = Router();

/**
 * This route is used to verify if the user has access to the system, but it should be done as middleware.
 * @deprecated
 */
router.get('/verifyaccess', async (req, res) => {
    const { authorization } = req.headers;
    if (!authorization) {
        return res.status(200).send(false);
    }
    try {
        const email = await getEmailFromAuth(req);
        const exists = await studentExistsInDb(email);
        return res.status(200).send(Boolean(exists));
    } catch (e) {
        return res.status(200).send(false);
    }
});

export default router;
