import * as auth from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";

export const GET = async (event) => {
    if (!event.locals.session) {
        return redirect(302, '/');
    }
    
    auth.deleteSessionTokenCookie(event);
    auth.deleteSessionJWTCookie(event);
    auth.invalidateSession(event.locals.session.id);
    return redirect(302, '/');
}