import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import * as oslo_encoding from "@oslojs/encoding";
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { Session, User } from '$lib/server/db/schema';
import { JWT_SECRET } from '$env/static/private';
import * as oslo_jwt from '@oslojs/jwt'

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';
export const sessionJWTCookieName = 'auth-session-jwt';

// What, from the user, is included in the JWT and session response
interface TokenUser {
	id: string;
	username: string;
	// Add other user fields as needed
}

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: table.Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30)
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: { id: table.user.id, username: table.user.username },
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user: user as TokenUser };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/'
	});
}

export function setSessionJWTCookie(event: RequestEvent, jwt: string, expiresAt: Date) {
	event.cookies.set(sessionJWTCookieName, jwt, {
		expires: expiresAt,
		path: '/'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}

export function deleteSessionJWTCookie(event: RequestEvent) {
	event.cookies.delete(sessionJWTCookieName, {
		path: '/'
	});
}

// -------------------------------------------- JWT Implementation --------------------------------------------

const jwtHS256Key = new Uint8Array(oslo_encoding.decodeHex(JWT_SECRET));

export async function createSessionJWT(session: Session, user: User) {
	const now = new Date();

	const expirationSeconds = 60 * 5; // 5 minute

	const headerJSON = JSON.stringify({ alg: "HS256", typ: "JWT" });
	const headerJSONBytes = new TextEncoder().encode(headerJSON);
	const encodedHeader = oslo_encoding.encodeBase64url(headerJSONBytes);

	const { passwordHash, ...userWithoutPass} = user;

	const body = {
		// Omit the secret hash
		session: {
			id: session.id,
			user_id: session.userId,
			expires_at: session.expiresAt.getTime()
		},
		user: userWithoutPass,
		iat: Math.floor(now.getTime() / 1000),
		exp: Math.floor(now.getTime() / 1000) + expirationSeconds
	};
	const bodyJSON = JSON.stringify(body);
	const bodyJSONBytes = new TextEncoder().encode(bodyJSON);
	const encodedBody = oslo_encoding.encodeBase64url(bodyJSONBytes);

	const headerAndBody = encodedHeader + "." + encodedBody;
	const headerAndBodyBytes = new TextEncoder().encode(headerAndBody);

	const hmacCryptoKey = await crypto.subtle.importKey(
		"raw",
		jwtHS256Key,
		{
			name: "HMAC",
			hash: "SHA-256"
		},
		false,
		["sign"]
	);

	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		hmacCryptoKey,
		headerAndBodyBytes
	);
	const signature = new Uint8Array(signatureBuffer);
	const encodedSignature = oslo_encoding.encodeBase64url(signature);
	const sessionJWT = headerAndBody + "." + encodedSignature;
	return {sessionJWT, exp: body.exp };
}

export async function validateSessionJWT(jwt: string) {
	const now = new Date();

	const parts = jwt.split(".");
	if (parts.length !== 3) {
		return { session: null, user: null };
	}

	// Parse header
	let header: object;
	try {
		const headerJSONBytes = oslo_encoding.decodeBase64url(parts[0]);
		const headerJSON = new TextDecoder().decode(headerJSONBytes);
		const parsedHeader = JSON.parse(headerJSON) as unknown;
		if (typeof parsedHeader !== "object" || parsedHeader === null) {
			return { session: null, user: null };
		}
		header = parsedHeader;
	} catch {
		return { session: null, user: null };
	}

	// Verify header claims
	if ("typ" in header && header.typ !== "JWT") {
		return { session: null, user: null };
	}
	if (!("alg" in header) || header.alg !== "HS256") {
		return { session: null, user: null };
	}

	// Verify signature
	const signature = oslo_encoding.decodeBase64url(parts[2]);
	const headerAndBodyBytes = new TextEncoder().encode(parts[0] + "." + parts[1]);
	const hmacCryptoKey = await crypto.subtle.importKey(
		"raw",
		jwtHS256Key,
		{
			name: "HMAC",
			hash: "SHA-256"
		},
		false,
		["verify"]
	);
	const validSignature = await crypto.subtle.verify(
		"HMAC",
		hmacCryptoKey,
		new Uint8Array(signature),
		headerAndBodyBytes
	);
	if (!validSignature) {
		return { session: null, user: null };
	}

	// Parse body
	let body: object;
	try {
		const bodyJSONParts = oslo_encoding.decodeBase64url(parts[1]);
		const bodyJSON = new TextDecoder().decode(bodyJSONParts);
		const parsedBody = JSON.parse(bodyJSON) as unknown;
		if (typeof parsedBody !== "object" || parsedBody === null) {
			return { session: null, user: null };
		}
		body = parsedBody;
	} catch {
		return { session: null, user: null };
	}

	// Check expiration
	if (!("exp" in body) || typeof body.exp !== "number") {
		return { session: null, user: null };
	}
	const expiresAt = new Date(body.exp * 1000);
	if (now.getTime() >= expiresAt.getTime()) {
		return { session: null, user: null };
	}

	// Parse session
	if (!("session" in body) || typeof body.session !== "object" || body.session === null) {
		return { session: null, user: null };
	}
	const parsedSession = body.session;
	if (!("id" in parsedSession) || typeof parsedSession.id !== "string") {
		return { session: null, user: null };
	}
	if (!("expires_at" in parsedSession) || typeof parsedSession.expires_at !== "number") {
		return { session: null, user: null };
	}

	// Parse user
	if (!("user" in body) || typeof body.user !== "object" || body.user === null) {
		return { session: null, user: null };
	}

	const parsedUser = body.user;
	if (!("id" in parsedUser) || typeof parsedUser.id !== "string") {
		return { session: null, user: null };
	}

	const session: Session = {
		id: parsedSession.id,
		userId: parsedUser.id,
		expiresAt: new Date(parsedSession.expires_at * 1000)
	};

	return { session, user: body.user as TokenUser };
}

export async function createAndSetSessionAndJWT(event: RequestEvent, user: User) {
	// Remove old sessions from the database
	await db.delete(table.session).where(eq(table.session.userId, user.id));

	// Create new session and JWT and store in database
	const sessionToken = generateSessionToken();
	const session = await createSession(sessionToken, user.id);
	const { sessionJWT, exp: jwtExpiration } = await createSessionJWT(session, user);
	setSessionTokenCookie(event, sessionToken, session.expiresAt);
	setSessionJWTCookie(event, sessionJWT, new Date(jwtExpiration * 1000));
}