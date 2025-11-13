import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq, and } from 'drizzle-orm';

export async function load({ locals }) {
    // Load all active trade listings
    const listings = await db.select({
        id: table.tradeListing.id,
        sellerId: table.tradeListing.sellerId,
        accountGuids: table.tradeListing.accountGuids,
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
            const guids = JSON.parse(listing.accountGuids);
            const accounts = await db.select({
                guid: table.account.guid,
                name: table.account.name,
                inventoryRaw: table.account.inventoryRaw,
                seasonal: table.account.seasonal
            })
            .from(table.account)
            .where(eq(table.account.guid, guids[0])); // Get details for all accounts
            
            const allAccounts = await Promise.all(
                guids.map(async (guid: string) => {
                    const acc = await db.select({
                        guid: table.account.guid,
                        name: table.account.name,
                        inventoryRaw: table.account.inventoryRaw,
                        seasonal: table.account.seasonal
                    })
                    .from(table.account)
                    .where(eq(table.account.guid, guid))
                    .limit(1)
                    .get();
                    
                    return acc ? {
                        guid: acc.guid,
                        name: acc.name,
                        inventory: acc.inventoryRaw.split(',').filter((i: string) => i),
                        seasonal: acc.seasonal === 1
                    } : null;
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
        const offerAccountGuids = data.get('offerAccountGuids');

        if (typeof listingId !== 'string') {
            return { error: 'Invalid listing ID' };
        }

        // Get the listing
        const listing = await db.select().from(table.tradeListing)
            .where(and(
                eq(table.tradeListing.id, listingId),
                eq(table.tradeListing.status, 'active')
            ))
            .limit(1)
            .get();

        if (!listing) {
            return { error: 'Listing not found' };
        }

        // Cannot accept your own listing
        if (listing.sellerId === locals.user.id) {
            return { error: 'Cannot accept your own listing' };
        }

        let buyerAccountGuids: string[] = [];
        
        if (offerAccountGuids && typeof offerAccountGuids === 'string') {
            // This is a counter offer acceptance
            buyerAccountGuids = JSON.parse(offerAccountGuids);
            
            // Verify the buyer owns all the offered accounts
            for (const guid of buyerAccountGuids) {
                const account = await db.select().from(table.account)
                    .where(eq(table.account.guid, guid))
                    .limit(1)
                    .get();

                if (!account || account.ownerId !== locals.user.id) {
                    return { error: 'You do not own one or more of the offered accounts' };
                }
            }
        }

        // Transfer accounts
        const sellerAccountGuids = JSON.parse(listing.accountGuids);
        
        // Transfer seller's accounts to buyer
        for (const guid of sellerAccountGuids) {
            await db.update(table.account)
                .set({ ownerId: locals.user.id })
                .where(eq(table.account.guid, guid));
        }

        // Transfer buyer's accounts to seller (if any)
        if (buyerAccountGuids.length > 0) {
            for (const guid of buyerAccountGuids) {
                await db.update(table.account)
                    .set({ ownerId: listing.sellerId })
                    .where(eq(table.account.guid, guid));
            }
        }

        // Mark listing as completed
        await db.update(table.tradeListing)
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
        const offerAccountGuids = data.get('offerAccountGuids');

        if (typeof listingId !== 'string' || typeof offerAccountGuids !== 'string') {
            return { error: 'Invalid data' };
        }

        // Get the listing
        const listing = await db.select().from(table.tradeListing)
            .where(and(
                eq(table.tradeListing.id, listingId),
                eq(table.tradeListing.status, 'active')
            ))
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
        const guids = JSON.parse(offerAccountGuids);
        for (const guid of guids) {
            const account = await db.select().from(table.account)
                .where(eq(table.account.guid, guid))
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
            offerAccountGuids: offerAccountGuids,
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
        const listing = await db.select().from(table.tradeListing)
            .where(eq(table.tradeListing.id, listingId))
            .limit(1)
            .get();

        if (!listing || listing.sellerId !== locals.user.id) {
            return { error: 'Listing not found or you do not own it' };
        }

        // Cancel the listing
        await db.update(table.tradeListing)
            .set({ status: 'cancelled' })
            .where(eq(table.tradeListing.id, listingId));

        return { success: true };
    }
};