import * as auth from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";

export const GET = async (event) => {
    event.locals.user = null;
    event.locals.session = null;
    auth.deleteSessionTokenCookie(event);
    auth.deleteSessionJWTCookie(event);
    return redirect(302, '/');
}