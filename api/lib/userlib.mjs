import config from 'config';
import { studentExistsInDb } from './dbHelper.mjs';

/**
 * Checks if the specified user is an admin.
 * @param {string} email - the email of the user to check.
 * @returns {boolean} whether the user is an admin.
 */
export function isAdmin(email) {
    const admins = config.get('admins');
    return admins.includes(email);
}

/**
 * Checks if the specified user is a student.
 * @param {string} email - the email of the user to check.
 * @returns {boolean} whether the user is a student.
 */
export async function isStudent(email) {
    return await studentExistsInDb(email);
}
