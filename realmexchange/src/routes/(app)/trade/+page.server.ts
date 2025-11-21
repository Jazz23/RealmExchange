import { scrapeCurrentOffers } from '$lib/realmeye';
import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { getAccessToken } from '$lib/server/realmapi.js';
import { redirect } from '@sveltejs/kit';
import { eq, inArray, and, ne } from 'drizzle-orm';

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
	const userActiveListings = await db
		.select({ accountNames: table.tradeListing.accountNames })
		.from(table.tradeListing)
		.where(eq(table.tradeListing.status, 'active'))

	// Collect all account account names that are currently in active listings
	const listedAccountNames = new Set<string>();
	const allNames: string[] = [];
	for (const listing of userActiveListings) {
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

	// For each user listing, get the account details and counter offers
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

			// Get counter offers for this listing
			const counterOffers = await db
				.select({
					id: table.tradeOffer.id,
					buyerId: table.tradeOffer.buyerId,
					offerAccountNames: table.tradeOffer.offerAccountNames,
					status: table.tradeOffer.status,
					createdAt: table.tradeOffer.createdAt,
					buyerUsername: table.user.username
				})
				.from(table.tradeOffer)
				.innerJoin(table.user, eq(table.tradeOffer.buyerId, table.user.id))
				.where(and(eq(table.tradeOffer.listingId, listing.id), eq(table.tradeOffer.status, 'pending')));

			// For each counter offer, get the account details
			const counterOffersWithAccounts = await Promise.all(
				counterOffers.map(async (offer) => {
					const offerAccountNames = JSON.parse(offer.offerAccountNames);
					const offerAccounts = await Promise.all(
						offerAccountNames.map(async (name: string) => {
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
						...offer,
						accounts: offerAccounts.filter((a): a is NonNullable<typeof a> => a !== null)
					};
				})
			);

			return {
				...listing,
				accounts: allAccounts.filter((a): a is NonNullable<typeof a> => a !== null),
				askingPriceItems: JSON.parse(listing.askingPrice),
				counterOffers: counterOffersWithAccounts
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

		// Verify the user owns all the accounts and refresh the access token so users can't log back in
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

			// Refresh access token
			if (name.startsWith("TestAccount")) {
				continue;
			}

			const { accessToken } = await getAccessToken({...account, hwid: "0"}); // HWID doesn't matter since we're not logging in
			if (accessToken === null) {
				return { error: `Error logging into account ${name}` };
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
	},
	acceptCounterOffer: async ({ locals, request }) => {
		if (!locals.user) {
			return { error: 'Not authenticated' };
		}

		const data = await request.formData();
		const offerId = data.get('offerId');

		if (typeof offerId !== 'string') {
			return { error: 'Invalid offer ID' };
		}

		// Get the offer with listing details
		const offer = await db
			.select({
				id: table.tradeOffer.id,
				listingId: table.tradeOffer.listingId,
				buyerId: table.tradeOffer.buyerId,
				offerAccountNames: table.tradeOffer.offerAccountNames,
				listing: {
					sellerId: table.tradeListing.sellerId,
					accountNames: table.tradeListing.accountNames,
					askingPrice: table.tradeListing.askingPrice
				}
			})
			.from(table.tradeOffer)
			.innerJoin(table.tradeListing, eq(table.tradeOffer.listingId, table.tradeListing.id))
			.where(and(eq(table.tradeOffer.id, offerId), eq(table.tradeOffer.status, 'pending')))
			.limit(1)
			.get();

		if (!offer) {
			return { error: 'Offer not found' };
		}

		// Verify the user owns the listing
		if (offer.listing.sellerId !== locals.user.id) {
			return { error: 'You do not own this listing' };
		}

		// Transfer accounts
		const sellerAccountNames = JSON.parse(offer.listing.accountNames);
		const buyerAccountNames = JSON.parse(offer.offerAccountNames);

		// Transfer seller's accounts to buyer
		for (const name of sellerAccountNames) {
			await db
				.update(table.account)
				.set({ ownerId: offer.buyerId })
				.where(eq(table.account.name, name));
		}

		// Transfer buyer's accounts to seller
		for (const name of buyerAccountNames) {
			await db
				.update(table.account)
				.set({ ownerId: locals.user.id })
				.where(eq(table.account.name, name));
		}

		// Mark offer as accepted
		await db
			.update(table.tradeOffer)
			.set({ status: 'accepted' })
			.where(eq(table.tradeOffer.id, offerId));

		// Mark listing as completed
		await db
			.update(table.tradeListing)
			.set({ status: 'completed' })
			.where(eq(table.tradeListing.id, offer.listingId));

		// Mark all other offers for this listing as rejected
		await db
			.update(table.tradeOffer)
			.set({ status: 'rejected' })
			.where(and(eq(table.tradeOffer.listingId, offer.listingId), eq(table.tradeOffer.status, 'pending'), ne(table.tradeOffer.id, offerId)));

		// Send email notification to seller if enabled
		const seller = await db
			.select()
			.from(table.user)
			.where(eq(table.user.id, locals.user.id))
			.limit(1)
			.get();

		if (seller && seller.emailNotifications && seller.email && seller.emailVerified) {
			try {
				await sendSaleNotificationEmail(seller.email, {
					sellerAccountNames: sellerAccountNames,
					buyerAccountNames: buyerAccountNames,
					askingPrice: JSON.parse(offer.listing.askingPrice)
				});
			} catch (error) {
				console.error('Failed to send sale notification email:', error);
				// Don't fail the trade if email fails
			}
		}

		return { success: true };
	}
};

async function sendSaleNotificationEmail(email: string, tradeDetails: {
	sellerAccountNames: string[];
	buyerAccountNames: string[];
	askingPrice: string[];
}) {
	const BREVO_API_KEY = process.env.BREVO_API_KEY;
	if (!BREVO_API_KEY) {
		console.error('BREVO_API_KEY not configured');
		throw new Error('Email service not configured');
	}

	const response = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'accept': 'application/json',
			'api-key': BREVO_API_KEY,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			sender: {
				name: 'RealmExchange',
				email: 'noreply@realmexchange.com'
			},
			to: [{
				email: email,
				name: email
			}],
			subject: 'Your item has been sold on RealmExchange!',
			htmlContent: `
				<h1>Congratulations! Your item has been sold!</h1>
				<p>One of your listings on RealmExchange has been successfully traded.</p>

				<h2>Trade Details:</h2>
				<p><strong>You received:</strong> ${tradeDetails.buyerAccountNames.join(', ')}</p>
				<p><strong>You gave:</strong> ${tradeDetails.sellerAccountNames.join(', ')}</p>
				<p><strong>Asking price was:</strong> ${tradeDetails.askingPrice.join(', ')}</p>

				<p>You can view your updated inventory in your <a href="${process.env.BASE_URL || 'http://localhost:5173'}/inventory">account inventory</a>.</p>

				<p>Happy trading!</p>
				<p>The RealmExchange Team</p>
			`,
			textContent: `
				Congratulations! Your item has been sold!

				One of your listings on RealmExchange has been successfully traded.

				Trade Details:
				You received: ${tradeDetails.buyerAccountNames.join(', ')}
				You gave: ${tradeDetails.sellerAccountNames.join(', ')}
				Asking price was: ${tradeDetails.askingPrice.join(', ')}

				You can view your updated inventory in your account inventory: ${process.env.BASE_URL || 'http://localhost:5173'}/inventory

				Happy trading!
				The RealmExchange Team
			`
		})
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Brevo API error:', error);
		throw new Error('Failed to send sale notification email');
	}
}
