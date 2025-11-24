import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions } from './$types';

export const actions: Actions = {
	reset: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');

		if (!validateEmail(email)) {
			return fail(400, { message: 'Invalid email address' });
		}

		try {
			// Find user by email
			const user = await db
				.select()
				.from(table.user)
				.where(eq(table.user.email, email))
				.limit(1);

			// Always return success to prevent email enumeration
			if (!user[0]) {
				return { success: true };
			}

			// Generate reset token and expiry (24 hours from now)
			const resetToken = generateResetToken();
			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

			// Update user with reset token
			await db
				.update(table.user)
				.set({
					passwordResetToken: resetToken,
					passwordResetExpiresAt: expiresAt
				})
				.where(eq(table.user.id, user[0].id));

			// Send reset email
			await sendPasswordResetEmail(email, resetToken);

			return { success: true };
		} catch (error) {
			console.error('Password reset error:', error);
			return fail(500, { message: 'An error occurred. Please try again.' });
		}
	}
};

function generateResetToken() {
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

async function sendPasswordResetEmail(email: string, token: string) {
	const BREVO_API_KEY = process.env.BREVO_API_KEY;
	if (!BREVO_API_KEY) {
		console.error('BREVO_API_KEY not configured');
		throw new Error('Email service not configured');
	}

	const resetUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

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
			subject: 'Reset your Realm Exchange password',
			htmlContent: `
				<h1>Password Reset Request</h1>
				<p>You requested a password reset for your Realm Exchange account.</p>
				<p>Click the link below to reset your password:</p>
				<a href="${resetUrl}">Reset Password</a>
				<p>This link will expire in 24 hours.</p>
				<p>If you didn't request this reset, you can ignore this email.</p>
			`,
			textContent: `
				Password Reset Request
				You requested a password reset for your Realm Exchange account.
				Visit this link to reset your password: ${resetUrl}
				This link will expire in 24 hours.
				If you didn't request this reset, you can ignore this email.
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send reset email');
	}
}