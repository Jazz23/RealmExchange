import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return {
			verified: false,
			error: 'Invalid verification link'
		};
	}

	try {
		// Find user with this verification token
		const user = await db
			.select()
			.from(table.user)
			.where(eq(table.user.emailVerificationToken, token))
			.limit(1);

		if (!user[0]) {
			return {
				verified: false,
				error: 'Invalid or expired verification token'
			};
		}

		// Update user to mark email as verified and clear the token
		await db
			.update(table.user)
			.set({
				emailVerified: true,
				emailVerificationToken: null
			})
			.where(eq(table.user.id, user[0].id));

		return {
			verified: true
		};
	} catch (error) {
		console.error('Email verification error:', error);
		return {
			verified: false,
			error: 'An error occurred during verification'
		};
	}
};