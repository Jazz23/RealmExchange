import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";

export async function load() {

    const broski = await db.select().from(user).limit(1);
    const username = broski[0]?.username ?? "no user found";

    return { bruh: username };
}