import { encodeBase32LowerCase } from '@oslojs/encoding';
import { fail, redirect } from '@sveltejs/kit';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { User } from '$lib/server/db/schema';

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const email = formData.get('email');
		const password = formData.get('password');

		if (!validateUsername(username)) {
			return fail(400, { message: 'Invalid username' });
		}
		if (!validateEmail(email)) {
			return fail(400, { message: 'Invalid email' });
		}
		if (!validatePassword(password)) {
			return fail(400, { message: 'Invalid password' });
		}

		const userId = generateUserId();
		const passwordHash = auth.hashPassword(password);
		const emailVerificationToken = generateEmailVerificationToken();
		const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

		try {
			const newUser = {
				id: userId,
				username,
				email,
				passwordHash,
				emailVerificationToken,
				emailVerificationExpiresAt
			};
			await db.insert(table.user).values(newUser);

			// Send verification email via Brevo
			await sendVerificationEmail(email, emailVerificationToken);

			// Don't create session yet - user needs to verify email first
			return {
				success: true,
				message: 'Account created! Please check your email to verify your account.'
			};
		} catch (err) {
			if (err instanceof DrizzleQueryError) {
				if (err.cause?.message?.includes('UNIQUE constraint failed: user.username')) {
					return fail(400, { message: 'Username already taken' });
				}
				if (err.cause?.message?.includes('UNIQUE constraint failed: user.email')) {
					return fail(400, { message: 'Email already registered' });
				}
			}

			return fail(500, { message: 'An error has occurred' });
		}
	}
};

function generateUserId() {
	// ID with 120 bits of entropy, or about the same as UUID v4.
	const bytes = crypto.getRandomValues(new Uint8Array(15));
	const id = encodeBase32LowerCase(bytes);
	return id;
}

function generateEmailVerificationToken() {
	// Generate a secure token for email verification
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return encodeBase32LowerCase(bytes);
}

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[A-Za-z0-9_-]+$/.test(username)
	);
}

function validateEmail(email: unknown): email is string {
	return (
		typeof email === 'string' &&
		email.length >= 3 &&
		email.length <= 255 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}

async function sendVerificationEmail(email: string, token: string) {
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
				email: 'noreply@realmexchange.com' // You'll need to configure this in Brevo
			},
			to: [{
				email: email,
				name: email
			}],
			subject: 'Verify your Realm Exchange account',
			htmlContent: `
				<h1>Welcome to Realm Exchange!</h1>
				<p>Please click the link below to verify your email address:</p>
				<a href="${verificationUrl}">Verify Email</a>
				<p>If you didn't create an account, you can ignore this email.</p>
			`,
			textContent: `
				Welcome to Realm Exchange!
				Please visit this link to verify your email address: ${verificationUrl}
				If you didn't create an account, you can ignore this email.
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send verification email');
	}
}