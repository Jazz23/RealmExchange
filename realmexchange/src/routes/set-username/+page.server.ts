import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	// Check if username looks generated (starts with "auto_generated")
	const needsUsername = locals.user.username.startsWith('auto_generated');

	if (!needsUsername) {
		return redirect(302, '/');
	}

	return {};
};

export const actions = {
	default: async (event) => {
		const { locals, request } = event;
		if (!locals.user) {
			return fail(401, { message: 'Not authenticated' });
		}

		const data = await request.formData();
		const username = data.get('username');

		if (typeof username !== 'string' || username.length === 0) {
			return fail(400, { message: 'Username is required' });
		}

		// Validate username format
		if (!/^[A-Za-z0-9_-]+$/.test(username)) {
			return fail(400, { message: 'Username can only contain letters, numbers, underscores, and hyphens' });
		}

		if (username.length < 3 || username.length > 31) {
			return fail(400, { message: 'Username must be between 3 and 31 characters' });
		}

		// Check if username is already taken
		const existingUser = await db
			.select({ id: table.user.id })
			.from(table.user)
			.where(eq(table.user.username, username))
			.limit(1)
			.get();

		if (existingUser) {
			return fail(400, { message: 'Username is already taken' });
		}

		// Update the username
		await db
			.update(table.user)
			.set({ username })
			.where(eq(table.user.id, locals.user.id));

		// Clear JWT cookie to force re-validation with updated user data
		auth.deleteSessionJWTCookie(event);

		return redirect(302, '/');
	}
};