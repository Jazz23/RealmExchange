import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	// Load all verified accounts for this user
	const accounts = await db
		.select()
		.from(table.account)
		.where(eq(table.account.ownerId, locals.user.id));

	return {
		accounts: accounts.map((acc) => ({
			guid: acc.guid,
			name: acc.name,
			inventory: acc.inventoryRaw.split(',').filter((i) => i),
			seasonal: acc.seasonal == 1
		}))
	};
};

export const actions = {
	createListing: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const accountGuids = data.get('accountGuids');
		const askingPrice = data.get('askingPrice');

		if (typeof accountGuids !== 'string' || typeof askingPrice !== 'string') {
			return { error: 'Invalid data' };
		}

		// Verify the user owns all the accounts
		const guids = JSON.parse(accountGuids);
		for (const guid of guids) {
			const account = await db
				.select()
				.from(table.account)
				.where(eq(table.account.guid, guid))
				.limit(1)
				.get();

			if (!account || account.ownerId !== locals.user.id) {
				return { error: 'You do not own one or more of these accounts' };
			}
		}

		// Create the listing
		const listingId = crypto.randomUUID();
		await db.insert(table.tradeListing).values({
			id: listingId,
			sellerId: locals.user.id,
			accountGuids: accountGuids,
			askingPrice: askingPrice,
			status: 'active',
			createdAt: new Date()
		});

		return { success: true, listingId };
	}
};
