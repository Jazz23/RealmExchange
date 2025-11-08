import type { Handle } from "@sveltejs/kit";
import { setDb } from "$lib/server/db";

export const handle: Handle = async ({ event, resolve }) => {
    setDb(event.platform!.env.DB);
    const response = await resolve(event);
    return response;
};