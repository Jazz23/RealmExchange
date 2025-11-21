import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'Not authenticated' });
		}

		const formData = await request.formData();
		const emailNotifications = formData.get('emailNotifications') === 'on';

		try {
			await db
				.update(table.user)
				.set({
					emailNotifications
				})
				.where(eq(table.user.id, locals.user.id));

			// Update the user in locals to reflect the change
			locals.user.emailNotifications = emailNotifications;

			return { success: true };
		} catch (error) {
			console.error('Settings update error:', error);
			return fail(500, { message: 'Failed to update settings' });
		}
	}
};