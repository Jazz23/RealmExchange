import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function load({ locals }) {
	// Load all active trade listings
	const listings = await db
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
		.where(eq(table.tradeListing.status, 'active'));

	// For each listing, get the account details
	const listingsWithAccounts = await Promise.all(
		listings.map(async (listing) => {
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
		user: locals.user,
		listings: listingsWithAccounts
	};
}

export const actions = {
	acceptTrade: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const listingId = data.get('listingId');
		const offerAccountNames = data.get('offerAccountNames');

		if (typeof listingId !== 'string') {
			return { error: 'Invalid listing ID' };
		}

		// Get the listing
		const listing = await db
			.select()
			.from(table.tradeListing)
			.where(and(eq(table.tradeListing.id, listingId), eq(table.tradeListing.status, 'active')))
			.limit(1)
			.get();

		if (!listing) {
			return { error: 'Listing not found' };
		}

		// Cannot accept your own listing
		if (listing.sellerId === locals.user.id) {
			return { error: 'Cannot accept your own listing' };
		}

		let buyerAccountNames: string[] = [];

		if (offerAccountNames && typeof offerAccountNames === 'string') {
			// This is a counter offer acceptance
			buyerAccountNames = JSON.parse(offerAccountNames);

			// Verify the buyer owns all the offered accounts
			for (const name of buyerAccountNames) {
				const account = await db
					.select()
					.from(table.account)
					.where(eq(table.account.name, name))
					.limit(1)
					.get();

				if (!account || account.ownerId !== locals.user.id) {
					return { error: 'You do not own one or more of the offered accounts' };
				}
			}
		} else {
			// Direct acceptance - validate that buyer has required items
			const askingPriceItems = JSON.parse(listing.askingPrice);
			
			// Get all buyer's accounts
			const buyerAccounts = await db
				.select({
					name: table.account.name,
					inventoryRaw: table.account.inventoryRaw
				})
				.from(table.account)
				.where(eq(table.account.ownerId, locals.user.id));

			// Count total items across all buyer accounts
			const buyerItemCounts: Record<string, number> = {};
			for (const account of buyerAccounts) {
				const items = account.inventoryRaw.split(',').filter(i => i);
				for (const item of items) {
					buyerItemCounts[item] = (buyerItemCounts[item] || 0) + 1;
				}
			}

			// Check if buyer has sufficient items for each required item
			for (const requiredItem of askingPriceItems) {
				const availableCount = buyerItemCounts[requiredItem.name] || 0;
				if (availableCount < requiredItem.quantity) {
					return { 
						error: `Insufficient ${requiredItem.name}. You have ${availableCount} but need ${requiredItem.quantity}.` 
					};
				}
			}

			// Find accounts that contain the required items and transfer them
			const requiredItems = askingPriceItems.reduce((acc: Record<string, number>, item: {name: string, quantity: number}) => {
				acc[item.name] = item.quantity;
				return acc;
			}, {});

			const itemsToTransfer: Record<string, number> = { ...requiredItems };
			const accountsToTransfer: string[] = [];

			// Greedily select accounts that can fulfill the requirements
			for (const account of buyerAccounts) {
				if (Object.keys(itemsToTransfer).every(item => itemsToTransfer[item] <= 0)) {
					break; // All requirements fulfilled
				}

				const accountItems = account.inventoryRaw.split(',').filter(i => i);
				const itemCounts: Record<string, number> = {};
				for (const item of accountItems) {
					itemCounts[item] = (itemCounts[item] || 0) + 1;
				}

				// Check if this account has any needed items
				let hasNeededItems = false;
				for (const [itemName, neededCount] of Object.entries(itemsToTransfer)) {
					if (neededCount > 0 && itemCounts[itemName]) {
						hasNeededItems = true;
						break;
					}
				}

				if (hasNeededItems) {
					accountsToTransfer.push(account.name);
					// Reduce the requirements by what this account provides
					for (const [itemName, count] of Object.entries(itemCounts)) {
						if (itemsToTransfer[itemName]) {
							itemsToTransfer[itemName] = Math.max(0, itemsToTransfer[itemName] - count);
						}
					}
				}
			}

			// Final check - ensure all requirements are met
			if (Object.values(itemsToTransfer).some(count => count > 0)) {
				return { error: 'Unable to fulfill payment requirements with available accounts.' };
			}

			buyerAccountNames = accountsToTransfer;
		}

		// Transfer accounts
		const sellerAccountNames = JSON.parse(listing.accountNames);

		// Transfer seller's accounts to buyer
		for (const name of sellerAccountNames) {
			await db
				.update(table.account)
				.set({ ownerId: locals.user.id })
				.where(eq(table.account.name, name));
		}

		// Transfer buyer's accounts to seller (if any)
		if (buyerAccountNames.length > 0) {
			for (const name of buyerAccountNames) {
				await db
					.update(table.account)
					.set({ ownerId: listing.sellerId })
					.where(eq(table.account.name, name));
			}
		}

		// Mark listing as completed
		await db
			.update(table.tradeListing)
			.set({ status: 'completed' })
			.where(eq(table.tradeListing.id, listingId));

		return { success: true };
	},

	makeOffer: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const listingId = data.get('listingId');
		const offerAccountNames = data.get('offerAccountNames');

		if (typeof listingId !== 'string' || typeof offerAccountNames !== 'string') {
			return { error: 'Invalid data' };
		}

		// Get the listing
		const listing = await db
			.select()
			.from(table.tradeListing)
			.where(and(eq(table.tradeListing.id, listingId), eq(table.tradeListing.status, 'active')))
			.limit(1)
			.get();

		if (!listing) {
			return { error: 'Listing not found' };
		}

		// Cannot offer on your own listing
		if (listing.sellerId === locals.user.id) {
			return { error: 'Cannot offer on your own listing' };
		}

		// Verify the user owns all the offered accounts
		const names = JSON.parse(offerAccountNames);
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

		// Create the offer
		const offerId = crypto.randomUUID();
		await db.insert(table.tradeOffer).values({
			id: offerId,
			listingId: listingId,
			buyerId: locals.user.id,
			offerAccountNames: offerAccountNames,
			status: 'pending',
			createdAt: new Date()
		});

		return { success: true };
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

		// Cancel the listing
		await db
			.update(table.tradeListing)
			.set({ status: 'cancelled' })
			.where(eq(table.tradeListing.id, listingId));

		return { success: true };
	}
};
