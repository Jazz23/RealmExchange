import type { RequestHandler } from "./$types";
import * as table from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { json } from "@sveltejs/kit";
import { loadAccountInventory } from "$lib/server/realmapi";

export const POST = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Not authenticated' });
    }

    // Grab the first unverified account for this user
    const account = await db.select().from(table.account).where(
        and(
            eq(table.account.ownerId, locals.user.id),
            eq(table.account.verified, 0)
        )
    ).limit(1).get();

    if (!account) {
        return json({ error: 'No unverified account found' });
    }

    // Get the account inventory from Realm API
    const inv = await loadAccountInventory(account);
    if (!inv) {
        return json({ error: 'Failed to load account inventory' });
    }

    // Update the account as verified with inventory
    await db.update(table.account).set({
        verified: 1,
        inventoryRaw: JSON.stringify(inv)
    }).where(eq(table.account.guid, account.guid));

    return json({ name: account.name, inv: inv });
}