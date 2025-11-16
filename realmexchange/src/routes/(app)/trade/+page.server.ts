import { scrapeCurrentOffers } from '$lib/realmeye';
import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { redirect } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	// Run both database queries in parallel
	const activeListings = await db
			.select({ accountGuids: table.tradeListing.accountGuids })
			.from(table.tradeListing)
			.where(eq(table.tradeListing.status, 'active'))

	// Collect all account account names that are currently in active listings
	const listedAccountNames = new Set<string>();
	const allGuids: string[] = [];
	for (const listing of activeListings) {
		const guids = JSON.parse(listing.accountGuids) as string[];
		allGuids.push(...guids);
	}
	const uniqueGuids = [...new Set(allGuids)];
	const accounts = await db
		.select({ name: table.account.name })
		.from(table.account)
		.where(inArray(table.account.guid, uniqueGuids));
	for (const account of accounts) {
		listedAccountNames.add(account.name);
	}

	// Stream the items asynchronously
	const items = scrapeCurrentOffers().catch((error) => {
		console.error('Failed to scrape items:', error);
		return [];
	});

	return {
		listedAccountNames,
		items
	};
};

export const actions = {
	createListing: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const accountNames = data.get('accountNames');
		const askingPrice = data.get('askingPrice');

		if (typeof accountNames !== 'string' || typeof askingPrice !== 'string') {
			return { error: 'Invalid data' };
		}

		// Verify the user owns all the accounts
		const names = JSON.parse(accountNames) as string[];
		const guids: string[] = [];
		for (const name of names) {
			const account = await db
				.select()
				.from(table.account)
				.where(eq(table.account.name, name))
				.limit(1)
				.get();

			if (!account || account.ownerId !== locals.user.id) {
				return { error: 'You do not own one or more of these accounts' };
			}
			guids.push(account.guid);
		}

		// Create the listing
		const listingId = crypto.randomUUID();
		await db.insert(table.tradeListing).values({
			id: listingId,
			sellerId: locals.user.id,
			accountGuids: JSON.stringify(guids),
			askingPrice: askingPrice,
			status: 'active',
			createdAt: new Date()
		});

		return { success: true, listingId };
	}
};
