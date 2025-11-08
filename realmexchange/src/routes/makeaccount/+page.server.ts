// Receives the token from the client and stores it in the database
import type { Actions } from './$types';
import { recaptchaTokens } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { verifyAccount } from '$lib/server/realmapi';
import { eq } from 'drizzle-orm';

export const actions = {
    storeToken: async ({ request }) => {
        const token = await request.text();
        if (typeof token !== 'string') {
            return { success: false, error: 'Invalid token' };
        }

        // Store the token in the database
        await db.insert(recaptchaTokens).values({ token }).run();

        return { success: true };
    },
    verifyAccount: async ({ request }) => {
        const formData = await request.formData();
        const a = formData.get('a')?.toString();

        if (!a) {
            return { success: false, error: 'Missing account identifier' };
        }

        // Grab the latest token from the database and remove it from the database
        const token = (await db.select().from(recaptchaTokens).limit(1).get())?.token;
        if (!token) {
            return { success: false, error: 'No token found' };
        }

        // Delete the token from the db
        await db.delete(recaptchaTokens).where(eq(recaptchaTokens.token, token)).run();

        const result = await verifyAccount(a, token);

        return { success: result };
    }
}