// Receives the token from the client and stores it in the database
import type { Actions } from './$types';
import { recaptchaTokens } from '$lib/server/db/schema';
import { db } from '$lib/server/db';

export const actions = {
    default: async ({ request, locals }) => {
        const token = await request.text();
        if (typeof token !== 'string') {
            return { success: false, error: 'Invalid token' };
        }

        // Store the token in the database
        await db.insert(recaptchaTokens).values({ token }).run();

        return { success: true };
    }
}