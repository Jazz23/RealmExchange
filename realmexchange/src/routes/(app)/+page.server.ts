import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { getAccessToken } from '$lib/server/realmapi';
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

	// Load user's accounts for the modal
	let accounts: any[] = [];
	if (locals.user) {
		const userAccounts = await db
			.select({
				name: table.account.name,
				inventoryRaw: table.account.inventoryRaw,
				seasonal: table.account.seasonal
			})
			.from(table.account)
			.where(eq(table.account.ownerId, locals.user.id));

		accounts = userAccounts.map(acc => ({
			name: acc.name,
			inventory: acc.inventoryRaw.split(',').filter(i => i),
			seasonal: acc.seasonal === 1
		}));
	}

	return {
		user: locals.user,
		listings: listingsWithAccounts,
		userAccounts: accounts
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
			// This is a counter offer acceptance - validate selected accounts have sufficient items
			buyerAccountNames = JSON.parse(offerAccountNames);

			// Verify the buyer owns all the offered accounts and that they are not logged into
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

				// Refresh access token
				if (name.startsWith("TestAccount")) {
					continue;
				}

				const { accessToken } = await getAccessToken({ ...account, hwid: "0" }); // HWID doesn't matter since we're not logging in
				if (accessToken === null) {
					return { error: `Error logging into account ${name}` };
				}
			}

			// Validate that the selected accounts contain sufficient items for the asking price
			const askingPriceItems = JSON.parse(listing.askingPrice);

			// Count total items across selected buyer accounts, grouped by seasonal status
			const buyerItemCounts: Record<string, { seasonal: number; nonSeasonal: number }> = {};
			for (const name of buyerAccountNames) {
				const account = await db
					.select({ inventoryRaw: table.account.inventoryRaw, seasonal: table.account.seasonal })
					.from(table.account)
					.where(eq(table.account.name, name))
					.limit(1)
					.get();

				if (account) {
					const items = account.inventoryRaw.split(',').filter(i => i);
					const isSeasonal = account.seasonal === 1;
					for (const item of items) {
						if (!buyerItemCounts[item]) {
							buyerItemCounts[item] = { seasonal: 0, nonSeasonal: 0 };
						}
						if (isSeasonal) {
							buyerItemCounts[item].seasonal += 1;
						} else {
							buyerItemCounts[item].nonSeasonal += 1;
						}
					}
				}
			}

			// Check if selected accounts have sufficient items for each required item
			for (const requiredItem of askingPriceItems) {
				const availableCount = buyerItemCounts[requiredItem.name];
				if (!availableCount) {
					return {
						error: `Selected accounts have insufficient ${requiredItem.name} (${requiredItem.seasonal ? 'Seasonal' : 'Not Seasonal'}). You have 0 but need ${requiredItem.quantity}.`
					};
				}
				const countFromCorrectAccounts = requiredItem.seasonal ? availableCount.seasonal : availableCount.nonSeasonal;
				if (countFromCorrectAccounts < requiredItem.quantity) {
					return {
						error: `Selected accounts have insufficient ${requiredItem.name} (${requiredItem.seasonal ? 'Seasonal' : 'Not Seasonal'}). You have ${countFromCorrectAccounts} but need ${requiredItem.quantity}.`
					};
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
			const requiredItems = askingPriceItems.reduce((acc: Record<string, number>, item: { name: string, quantity: number }) => {
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

		// Send email notification to seller if enabled
		const seller = await db
			.select()
			.from(table.user)
			.where(eq(table.user.id, listing.sellerId))
			.limit(1)
			.get();

		if (seller && seller.emailNotifications && seller.email && seller.emailVerified) {
			try {
				await sendSaleNotificationEmail(seller.email, {
					sellerAccountNames: sellerAccountNames,
					buyerAccountNames: buyerAccountNames,
					askingPrice: JSON.parse(listing.askingPrice)
				});
			} catch (error) {
				console.error('Failed to send sale notification email:', error);
				// Don't fail the trade if email fails
			}
		}

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

			// Refresh access token
			if (name.startsWith("TestAccount")) {
				continue;
			}

			const { accessToken } = await getAccessToken({ ...account, hwid: "0" }); // HWID doesn't matter since we're not logging in
			if (accessToken === null) {
				return { error: `Error logging into account ${name}` };
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

		// Send email notification to seller if enabled
		const seller = await db
			.select()
			.from(table.user)
			.where(eq(table.user.id, listing.sellerId))
			.limit(1)
			.get();

		if (seller && seller.emailNotifications && seller.email && seller.emailVerified) {
			try {
				await sendCounterOfferNotificationEmail(seller.email, {
					listingId: listingId,
					buyerUsername: locals.user.username,
					offeredAccountNames: names,
					listingAccountNames: JSON.parse(listing.accountNames),
					askingPrice: JSON.parse(listing.askingPrice)
				});
			} catch (error) {
				console.error('Failed to send counter offer notification email:', error);
				// Don't fail the offer creation if email fails
			}
		}

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

async function sendSaleNotificationEmail(email: string, tradeDetails: {
	sellerAccountNames: string[];
	buyerAccountNames: string[];
	askingPrice: any[];
}) {
	const BREVO_API_KEY = process.env.BREVO_API_KEY;
	if (!BREVO_API_KEY) {
		console.error('BREVO_API_KEY not configured');
		throw new Error('Email service not configured');
	}

	// Format asking price items
	const formattedAskingPrice = tradeDetails.askingPrice.map((item: any) => 
		`${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}${item.seasonal ? ' (Seasonal)' : ''}`
	).join(', ');

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'accept': 'application/json',
			'api-key': BREVO_API_KEY,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			sender: {
				name: 'Realm Exchange',
				email: 'noreply@realmexchange.com'
			},
			to: [{
				email: email,
				name: email
			}],
			subject: 'Your item has been sold on Realm Exchange!',
			htmlContent: `
				<h1>Congratulations! Your item has been sold!</h1>
				<p>One of your listings on Realm Exchange has been successfully traded.</p>

				<h2>Trade Details:</h2>
				<p><strong>You received:</strong> ${tradeDetails.buyerAccountNames.join(', ')}</p>
				<p><strong>You gave:</strong> ${tradeDetails.sellerAccountNames.join(', ')}</p>
				<p><strong>Asking price was:</strong> ${formattedAskingPrice}</p>

				<p>You can view your updated inventory in your <a href="${process.env.BASE_URL || 'http://localhost:5173'}/inventory">account inventory</a>.</p>

				<p>Happy trading!</p>
				<p>The Realm Exchange Team</p>
			`,
			textContent: `
				Congratulations! Your item has been sold!

				One of your listings on Realm Exchange has been successfully traded.

				Trade Details:
				You received: ${tradeDetails.buyerAccountNames.join(', ')}
				You gave: ${tradeDetails.sellerAccountNames.join(', ')}
				Asking price was: ${formattedAskingPrice}

				You can view your updated inventory in your account inventory: ${process.env.BASE_URL || 'http://localhost:5173'}/inventory

				Happy trading!
				The Realm Exchange Team
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send sale notification email');
	}
}

async function sendCounterOfferNotificationEmail(email: string, offerDetails: {
	listingId: string;
	buyerUsername: string;
	offeredAccountNames: string[];
	listingAccountNames: string[];
	askingPrice: any[];
}) {
	const BREVO_API_KEY = process.env.BREVO_API_KEY;
	if (!BREVO_API_KEY) {
		console.error('BREVO_API_KEY not configured');
		throw new Error('Email service not configured');
	}

	// Get inventory from offered accounts
	const offeredItems: Record<string, number> = {};
	for (const accountName of offerDetails.offeredAccountNames) {
		const account = await db
			.select({ inventoryRaw: table.account.inventoryRaw })
			.from(table.account)
			.where(eq(table.account.name, accountName))
			.limit(1)
			.get();
		
		if (account) {
			const items = account.inventoryRaw.split(',').filter(i => i);
			for (const item of items) {
				offeredItems[item] = (offeredItems[item] || 0) + 1;
			}
		}
	}

	// Get inventory from listing accounts
	const listingItems: Record<string, number> = {};
	for (const accountName of offerDetails.listingAccountNames) {
		const account = await db
			.select({ inventoryRaw: table.account.inventoryRaw })
			.from(table.account)
			.where(eq(table.account.name, accountName))
			.limit(1)
			.get();
		
		if (account) {
			const items = account.inventoryRaw.split(',').filter(i => i);
			for (const item of items) {
				listingItems[item] = (listingItems[item] || 0) + 1;
			}
		}
	}

	// Format items
	const formatItems = (items: Record<string, number>) => 
		Object.entries(items)
			.map(([name, count]) => `${name}${count > 1 ? ` (${count})` : ''}`)
			.join(', ');

	const formattedOfferedItems = formatItems(offeredItems);
	const formattedListingItems = formatItems(listingItems);

	// Format asking price items
	const formattedAskingPrice = offerDetails.askingPrice.map((item: any) => 
		`${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}${item.seasonal ? ' (Seasonal)' : ''}`
	).join(', ');

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'accept': 'application/json',
			'api-key': BREVO_API_KEY,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			sender: {
				name: 'Realm Exchange',
				email: 'noreply@realmexchange.com'
			},
			to: [{
				email: email,
				name: email
			}],
			subject: 'New counter offer received on Realm Exchange!',
			htmlContent: `
				<h1>You have received a counter offer!</h1>
				<p>${offerDetails.buyerUsername} has made a counter offer on one of your listings.</p>

				<h2>Offer Details:</h2>
				<p><strong>Buyer:</strong> ${offerDetails.buyerUsername}</p>
				<p><strong>They offered:</strong> ${formattedOfferedItems}</p>
				<p><strong>Your listing:</strong> ${formattedListingItems}</p>
				<p><strong>Your asking price:</strong> ${formattedAskingPrice}</p>

				<p>You can review and accept or reject this offer in your <a href="${process.env.BASE_URL || 'http://localhost:5173'}/trade">trade management page</a>.</p>

				<p>Happy trading!</p>
				<p>The Realm Exchange Team</p>
			`,
			textContent: `
				You have received a counter offer!

				${offerDetails.buyerUsername} has made a counter offer on one of your listings.

				Offer Details:
				Buyer: ${offerDetails.buyerUsername}
				They offered: ${formattedOfferedItems}
				Your listing: ${formattedListingItems}
				Your asking price: ${formattedAskingPrice}

				You can review and accept or reject this offer in your trade management page: ${process.env.BASE_URL || 'http://localhost:5173'}/trade

				Happy trading!
				The Realm Exchange Team
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send counter offer notification email');
	}
}
