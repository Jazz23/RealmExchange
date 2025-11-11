import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

export async function load({ locals }) {


    return { user: locals.user };
}