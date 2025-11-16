import { scrapeCurrentOffers } from '$lib/realmeye';
import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { redirect } from '@sveltejs/kit';
import { eq, inArray, and } from 'drizzle-orm';

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/login');
	}

	// Load user's accounts
	const userAccounts = await db
		.select({
			name: table.account.name,
			inventoryRaw: table.account.inventoryRaw,
			seasonal: table.account.seasonal
		})
		.from(table.account)
		.where(eq(table.account.ownerId, locals.user.id));

	const accounts = userAccounts.map(acc => ({
		name: acc.name,
		inventory: acc.inventoryRaw.split(',').filter(i => i),
		seasonal: acc.seasonal === 1
	}));

	// Run both database queries in parallel
	const activeListings = await db
			.select({ accountNames: table.tradeListing.accountNames })
			.from(table.tradeListing)
			.where(eq(table.tradeListing.status, 'active'))

	// Collect all account account names that are currently in active listings
	const listedAccountNames = new Set<string>();
	const allNames: string[] = [];
	for (const listing of activeListings) {
		const names = JSON.parse(listing.accountNames) as string[];
		allNames.push(...names);
	}
	const uniqueNames = [...new Set(allNames)];
	const accountsInListings = await db
		.select({ name: table.account.name })
		.from(table.account)
		.where(inArray(table.account.name, uniqueNames));
	for (const account of accountsInListings) {
		listedAccountNames.add(account.name);
	}

	// Stream the items asynchronously
	const items = scrapeCurrentOffers().catch((error) => {
		console.error('Failed to scrape items:', error);
		return [];
	});

	// Load user's active listings
	const userListings = await db
		.select({
			id: table.tradeListing.id,
			sellerId: table.tradeListing.sellerId,
			accountNames: table.tradeListing.accountNames,
			askingPrice: table.tradeListing.askingPrice,
			createdAt: table.tradeListing.createdAt,
			sellerUsername: table.user.username
		})
		.from(table.tradeListing)
		.innerJoin(table.user, eq(table.tradeListing.sellerId, table.user.id))
		.where(and(eq(table.tradeListing.sellerId, locals.user.id), eq(table.tradeListing.status, 'active')));

	// For each user listing, get the account details
	const userListingsWithAccounts = await Promise.all(
		userListings.map(async (listing) => {
			const names = JSON.parse(listing.accountNames);
			const accounts = await db
				.select({
					name: table.account.name,
					inventoryRaw: table.account.inventoryRaw,
					seasonal: table.account.seasonal
				})
				.from(table.account)
				.where(eq(table.account.name, names[0])); // Get details for all accounts

			const allAccounts = await Promise.all(
				names.map(async (name: string) => {
					const acc = await db
						.select({
							name: table.account.name,
							inventoryRaw: table.account.inventoryRaw,
							seasonal: table.account.seasonal
						})
						.from(table.account)
						.where(eq(table.account.name, name))
						.limit(1)
						.get();

					return acc
						? {
								name: acc.name,
								inventory: acc.inventoryRaw.split(',').filter((i: string) => i),
								seasonal: acc.seasonal === 1
							}
						: null;
				})
			);

			return {
				...listing,
				accounts: allAccounts.filter((a): a is NonNullable<typeof a> => a !== null),
				askingPriceItems: JSON.parse(listing.askingPrice)
			};
		})
	);

	return {
		accounts,
		listedAccountNames,
		items,
		userListings: userListingsWithAccounts
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
		}

		// Create the listing
		const listingId = crypto.randomUUID();
		await db.insert(table.tradeListing).values({
			id: listingId,
			sellerId: locals.user.id,
			accountNames: accountNames,
			askingPrice: askingPrice,
			status: 'active',
			createdAt: new Date()
		});

		return { success: true, listingId };
	},
	cancelListing: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const listingId = data.get('listingId');

		if (typeof listingId !== 'string') {
			return { error: 'Invalid listing ID' };
		}

		// Verify the user owns the listing
		const listing = await db
			.select()
			.from(table.tradeListing)
			.where(eq(table.tradeListing.id, listingId))
			.limit(1)
			.get();

		if (!listing || listing.sellerId !== locals.user.id) {
			return { error: 'Listing not found or you do not own it' };
		}

		// Cancel the listing (set status to cancelled)
		await db
			.update(table.tradeListing)
			.set({ status: 'cancelled' })
			.where(eq(table.tradeListing.id, listingId));

		return { success: true };
	}
};
