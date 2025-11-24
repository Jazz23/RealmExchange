import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

export const GET: RequestHandler = async ({ url }) => {
	if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
		throw new Error('Google OAuth not configured');
	}

	const state = crypto.randomUUID();
	const scope = 'openid email profile';

	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
	authUrl.searchParams.set('redirect_uri', `${BASE_URL}/auth/google/callback`);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', scope);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('access_type', 'offline');
	authUrl.searchParams.set('prompt', 'consent');

	// Store state in a cookie for CSRF protection
	const stateCookie = `google_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`;

	return new Response(null, {
		status: 302,
		headers: {
			Location: authUrl.toString(),
			'Set-Cookie': stateCookie
		}
	});
};