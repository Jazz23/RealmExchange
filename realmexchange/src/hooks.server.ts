import type { Handle } from "@sveltejs/kit";
import { getDb } from "$lib/server/db";
import { env } from "$env/dynamic/private";

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL);

    const response = await resolve(event);
    return response;
};