import { fail, redirect } from '@sveltejs/kit';
import { eq, and, gt } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return { validToken: false };
	}

	try {
		// Find user with valid reset token
		const user = await db
			.select()
			.from(table.user)
			.where(
				and(
					eq(table.user.passwordResetToken, token),
					gt(table.user.passwordResetExpiresAt, new Date())
				)
			)
			.limit(1);

		return {
			validToken: user.length > 0,
			token: token // Pass token to the component
		};
	} catch (error) {
		console.error('Token validation error:', error);
		return { validToken: false };
	}
};

export const actions: Actions = {
	reset: async (event) => {
		const formData = await event.request.formData();
		const password = formData.get('password');
		const confirmPassword = formData.get('confirmPassword');
		const token = formData.get('token');

		if (!token || typeof token !== 'string') {
			return fail(400, { message: 'Invalid reset link' });
		}

		if (!validatePassword(password)) {
			return fail(400, { message: 'Password must be at least 6 characters long' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match' });
		}

		// First verify the token exists and is valid
		const existingUser = await db
			.select()
			.from(table.user)
			.where(
				and(
					eq(table.user.passwordResetToken, token),
					gt(table.user.passwordResetExpiresAt, new Date())
				)
			)
			.limit(1);

		if (!existingUser[0]) {
			return fail(400, { message: 'Invalid or expired reset link' });
		}

		try {
			// Update the password and clear reset token
			await db
				.update(table.user)
				.set({
					passwordHash: auth.hashPassword(password),
					passwordResetToken: null,
					passwordResetExpiresAt: null
				})
				.where(eq(table.user.id, existingUser[0].id));
		} catch (error) {
			console.error('Password reset error:', error);
			return fail(500, { message: 'An error occurred. Please try again.' });
		}

		return redirect(302, '/login?message=Password reset successfully');
	}
};

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}