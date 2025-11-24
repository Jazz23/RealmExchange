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
		const email = formData.get('email');
		const emailNotifications = formData.get('emailNotifications') === 'on';

		// Validate email
		if (!validateEmail(email)) {
			return fail(400, { message: 'Invalid email address' });
		}

		try {
			let emailChanged = false;
			let verificationToken = null;

			// Check if email is being changed
			if (email !== locals.user.email) {
				emailChanged = true;
				// Generate verification token and expiry (24 hours from now)
				verificationToken = generateVerificationToken();
				const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

				// Send verification email
				await sendEmailVerificationEmail(email, verificationToken);

				// Update user with verification token and expiry
				await db
					.update(table.user)
					.set({
						email: email,
						emailVerified: false,
						emailVerificationToken: verificationToken,
						emailVerificationExpiresAt: expiresAt
					})
					.where(eq(table.user.id, locals.user.id));

				// Update locals
				locals.user.email = email;
				locals.user.emailVerified = false;

				return { success: true, emailChanged: true };
			}
		} catch (error) {
			console.error('Settings update error:', error);
			return fail(500, { message: 'Failed to update settings' });
		}
	}
};

function generateVerificationToken() {
	// Generate a simple alphanumeric token
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let token = '';
	for (let i = 0; i < 32; i++) {
		token += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return token;
}

function validateEmail(email: unknown): email is string {
	return (
		typeof email === 'string' &&
		email.length >= 3 &&
		email.length <= 255 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	);
}

async function sendEmailVerificationEmail(email: string, token: string) {
	const BREVO_API_KEY = process.env.BREVO_API_KEY;
	if (!BREVO_API_KEY) {
		console.error('BREVO_API_KEY not configured');
		throw new Error('Email service not configured');
	}

	const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'accept': 'application/json',
			'api-key': BREVO_API_KEY,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			sender: {
				name: 'Realm Exchange',
				email: 'noreply@realmexchange.com'
			},
			to: [{
				email: email,
				name: email
			}],
			subject: 'Verify your new email address for Realm Exchange',
			htmlContent: `
				<h1>Email Verification Required</h1>
				<p>You've requested to change your email address for your Realm Exchange account.</p>
				<p>Please click the link below to verify your new email address:</p>
				<a href="${verificationUrl}">Verify Email Address</a>
				<p>This link will expire in 24 hours.</p>
				<p>If you didn't request this change, you can ignore this email.</p>
			`,
			textContent: `
				Email Verification Required
				You've requested to change your email address for your Realm Exchange account.
				Visit this link to verify your new email address: ${verificationUrl}
				This link will expire in 24 hours.
				If you didn't request this change, you can ignore this email.
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send verification email');
	}
}