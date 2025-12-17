import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
		throw new Error('Google OAuth not configured');
	}

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	if (error) {
		console.error('Google OAuth error:', error);
		return redirect(302, '/login?message=Authentication failed');
	}

	if (!code || !state) {
		return redirect(302, '/login?message=Invalid OAuth response');
	}

	// Verify state for CSRF protection
	const storedState = cookies.get('google_oauth_state');
	if (!storedState || storedState !== state) {
		return redirect(302, '/login?message=Invalid state parameter');
	}

	try {
		// Exchange code for access token
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: GOOGLE_CLIENT_ID,
				client_secret: GOOGLE_CLIENT_SECRET,
				code,
				grant_type: 'authorization_code',
				redirect_uri: `${BASE_URL}/auth/google/callback`,
			}),
		});

		if (!tokenResponse.ok) {
			console.error('Token exchange failed:', await tokenResponse.text());
			return redirect(302, '/login?message=Authentication failed');
		}

		const tokenData = await tokenResponse.json() as { access_token: string };
		const accessToken = tokenData.access_token;

		// Get user info from Google
		const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!userResponse.ok) {
			console.error('Failed to get user info:', await userResponse.text());
			return redirect(302, '/login?message=Authentication failed');
		}

		const googleUser = await userResponse.json() as { id: string; email: string; name: string; picture?: string };

		// Check if user already exists
		let existingUser = await db
			.select()
			.from(table.user)
			.where(eq(table.user.googleId, googleUser.id))
			.limit(1);

		let user: any;
		let isNewUser = false;

		if (existingUser[0]) {
			// User exists, update their info if needed
			user = existingUser[0];
		} else {
			// Check if email already exists (from regular signup)
			const emailUser = await db
				.select()
				.from(table.user)
				.where(eq(table.user.email, googleUser.email))
				.limit(1);

			if (emailUser[0]) {
				// Link Google account to existing user
				await db
					.update(table.user)
					.set({
						googleId: googleUser.id,
						emailVerified: true, // Google emails are verified
					})
					.where(eq(table.user.id, emailUser[0].id));
				user = { ...emailUser[0], googleId: googleUser.id, emailVerified: true };
			} else {
				// Create new user
				isNewUser = true;
				const userId = auth.generateUserId();
				const username = generateUsernameFromEmail(googleUser.email);

				user = {
					id: userId,
					username,
					email: googleUser.email,
					emailVerified: true, // Google emails are verified
					googleId: googleUser.id
				};

				await db.insert(table.user).values(user);
			}
		}

		// Create session and redirect
		const { sessionCookie, jwtCookie } = await auth.createSessionAndCookies(user);
		const redirectTo = isNewUser ? '/set-username' : '/';
		const response = new Response(null, {
			status: 302,
			headers: {
				Location: redirectTo,
				'Set-Cookie': sessionCookie
			}
		});
		response.headers.append('Set-Cookie', jwtCookie);
		return response;
	} catch (err) {
		console.error('Google OAuth callback error:', err);
		return redirect(302, '/login?message=Authentication failed');
	}
};

function generateUsernameFromEmail(email: string): string {
	// Generate a username from email (e.g., john.doe from john.doe@gmail.com)
	const localPart = email.split('@')[0];
	// Replace non-alphanumeric characters with underscores
	const cleanUsername = localPart.replace(/[^a-zA-Z0-9]/g, '_');
	// Ensure it's not too long and add random suffix if needed
	const baseUsername = cleanUsername.substring(0, 25);
	return `auto_generated_${baseUsername}_${Math.random().toString(36).substring(2, 8)}`;
}