import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { setDb } from '$lib/server/db';

const handleDb: Handle = async ({ event, resolve }) => {
	setDb(event.platform!.env.DB);

	const response = await resolve(event);

	return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);
	const sessionJWT = event.cookies.get(auth.sessionJWTCookieName);
	let session = null;
	let user = null;

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	if (sessionJWT) {
		const jwtSession = await auth.validateSessionJWT(sessionJWT);
		session = jwtSession.session;
		user = jwtSession.user;
	}
	
	if (!session || !user) {
		const dbSession = await auth.validateSessionToken(sessionToken);
		session = dbSession.session;
		user = dbSession.user;

		// Renew their JWT if their session is still valid
		if (session && user) {
			const { sessionJWT, exp: jwtExpiration } = await auth.createSessionJWT(session, user);
			auth.setSessionJWTCookie(event, sessionJWT, new Date(jwtExpiration * 1000));
		}
	}

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handle = sequence(handleDb, handleAuth);
