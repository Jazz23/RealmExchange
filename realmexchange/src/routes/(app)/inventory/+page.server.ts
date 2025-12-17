// Receives the token from the client and stores it in the database

import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { createAccount, getAccessToken, loadAccountInventory } from '$lib/server/realmapi';
import { and, eq } from 'drizzle-orm';
import { mockCreateAccount, mockLogin, mockRefreshAccount } from '../../../../test/mock.js';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    if (!locals.user) {
        return redirect(302, '/login');
    }

    // Check if the user needs to set their HWID
    const hwid = await db.select({ hwid: table.user.hwid }).from(table.user).where(
        eq(table.user.id, locals.user.id)
    ).limit(1).get();

    // Load user's accounts
    const userAccounts = await db
        .select({
            name: table.account.name,
            inventoryRaw: table.account.inventoryRaw,
            seasonal: table.account.seasonal
        })
        .from(table.account)
        .where(eq(table.account.ownerId, locals.user.id));

    // Find accounts that are part of active offers (accounts being offered by this user)
    const activeOffers = await db
        .select({
            offerAccountNames: table.tradeOffer.offerAccountNames
        })
        .from(table.tradeOffer)
        .innerJoin(table.tradeListing, eq(table.tradeOffer.listingId, table.tradeListing.id))
        .where(and(
            eq(table.tradeOffer.status, 'pending'),
            eq(table.tradeListing.sellerId, locals.user.id)
        ));

    // Find accounts that are part of active listings (accounts being sold by this user)
    const activeListings = await db
        .select({
            accountNames: table.tradeListing.accountNames
        })
        .from(table.tradeListing)
        .where(and(
            eq(table.tradeListing.sellerId, locals.user.id),
            eq(table.tradeListing.status, 'active')
        ));

    // Extract all account names that are part of active offers or listings
    const lockedAccounts = new Set<string>();
    
    // Add accounts from active offers
    for (const offer of activeOffers) {
        const accountNames = JSON.parse(offer.offerAccountNames) as string[];
        for (const name of accountNames) {
            lockedAccounts.add(name);
        }
    }
    
    // Add accounts from active listings
    for (const listing of activeListings) {
        const accountNames = JSON.parse(listing.accountNames) as string[];
        for (const name of accountNames) {
            lockedAccounts.add(name);
        }
    }

    const accounts = userAccounts.map(acc => ({
        name: acc.name,
        inventory: acc.inventoryRaw.split(',').filter(i => i),
        seasonal: acc.seasonal === 1,
        isLocked: lockedAccounts.has(acc.name)
    }));

    return { needsHWID: hwid!.hwid === "", accounts };
}

export const actions = {
    createAccount: async ({ platform, locals }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Delete any old unverified accounts just in case they didn't verify before
        await db.delete(table.account).where(and(
            eq(table.account.ownerId, locals.user.id),
            eq(table.account.verified, 0)
        ));

        // Create the account via Realm API
        let account;

        // In production, create a real account. In dev, use a mock account
        if (import.meta.env.PROD) {
            account = await createAccount(platform!.env);
        } else {
            // Delete the test account from the db since we're re-making it
            account = await mockCreateAccount();

            await db.delete(table.account).where(and(
                eq(table.account.ownerId, locals.user.id),
                eq(table.account.name, account.name)
            ));
        }

        if (account instanceof Error) {
            return { error: account.message };
        }

        // Store the account in the database
        const accountDB: table.AccountDB = {
            ownerId: locals.user?.id,
            verified: 0,
            guid: account.guid,
            name: account.name,
            password: account.password,
            inventoryRaw: '',
            seasonal: 0
        }

        // Insert the new account
        await db.insert(table.account).values(accountDB);

        return { link: account.verificationLink };
    },
    finishedVerifying: async ({ locals }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Grab the first unverified account for this user
        const account = await db.select().from(table.account).where(
            and(
                eq(table.account.ownerId, locals.user.id),
                eq(table.account.verified, 0)
            )
        ).limit(1).get();

        if (!account) {
            return { error: 'No unverified account found' };
        }

        // Update the account as verified
        await db.update(table.account).set({
            verified: 1
        }).where(eq(table.account.name, account.name));

        return { name: account.name };
    },
    loginAccount: async ({ locals, request }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Grab the name from the form data
        const data = await request.formData();
        const name = data.get('name');
        if (typeof name !== 'string') {
            return { error: 'Invalid account name' };
        }

        // Check if account is currently locked (in active trade)
        const [activeListings, activeOffers] = await Promise.all([
            db
                .select({ accountNames: table.tradeListing.accountNames })
                .from(table.tradeListing)
                .where(eq(table.tradeListing.status, 'active')),
            db
                .select({ offerAccountNames: table.tradeOffer.offerAccountNames })
                .from(table.tradeOffer)
                .where(eq(table.tradeOffer.status, 'pending'))
        ]);

        // Check if this account is in any active listing or offer
        let isLocked = false;
        for (const listing of activeListings) {
            const names = JSON.parse(listing.accountNames) as string[];
            if (names.includes(name)) {
                isLocked = true;
                break;
            }
        }
        
        if (!isLocked) {
            for (const offer of activeOffers) {
                const names = JSON.parse(offer.offerAccountNames) as string[];
                if (names.includes(name)) {
                    isLocked = true;
                    break;
                }
            }
        }

        if (isLocked) {
            return { error: 'This account is currently involved in an active trade and cannot be logged into.' };
        }

        // Find the account by name from the DB
        const account = await db.select({ name: table.account.name, guid: table.account.guid, password: table.account.password }).from(table.account).where(
            eq(table.account.name, name)
        ).limit(1).get();

        if (!account) {
            return { error: 'Account not found' };
        }

        if (account.name.startsWith("TestAccount")) {
            // In dev, use the mock login
            return mockLogin();
        }

        // Get the HWID for the user
        const hwidRecord = await db.select({ hwid: table.user.hwid }).from(table.user).where(
            eq(table.user.id, locals.user.id)
        ).limit(1).get();

        if (!hwidRecord || hwidRecord.hwid === "") {
            return { error: 'HWID not set' };
        }

        const { accessToken, timestamp } = await getAccessToken({ ...account, hwid: hwidRecord.hwid });
        if (accessToken === null || timestamp === null) {
            return { error: 'Failed to get access token' };
        }

        return { accessToken, timestamp };
    },
    refreshInventory: async ({ locals, request }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Grab the name from the form data
        const data = await request.formData();
        const name = data.get('name');

        if (typeof name !== 'string') {
            return { error: 'Invalid account name' };
        }

        // Check if account is currently locked (in active trade)
        const [activeListings, activeOffers] = await Promise.all([
            db
                .select({ accountNames: table.tradeListing.accountNames })
                .from(table.tradeListing)
                .where(eq(table.tradeListing.status, 'active')),
            db
                .select({ offerAccountNames: table.tradeOffer.offerAccountNames })
                .from(table.tradeOffer)
                .where(eq(table.tradeOffer.status, 'pending'))
        ]);

        // Check if this account is in any active listing or offer
        let isLocked = false;
        for (const listing of activeListings) {
            const names = JSON.parse(listing.accountNames) as string[];
            if (names.includes(name)) {
                isLocked = true;
                break;
            }
        }
        
        if (!isLocked) {
            for (const offer of activeOffers) {
                const names = JSON.parse(offer.offerAccountNames) as string[];
                if (names.includes(name)) {
                    isLocked = true;
                    break;
                }
            }
        }

        if (isLocked) {
            return { error: 'This account is currently involved in an active trade and cannot be refreshed.' };
        }

        // Find the account by name from the DB
        const account = await db.select({ name: table.account.name, guid: table.account.guid, password: table.account.password }).from(table.account).where(
            eq(table.account.name, name)
        ).limit(1).get();

        if (!account) {
            return { error: 'Account not found' };
        }

        // Check if the name starts with TestAccount
        if (name.startsWith("TestAccount")) {
            // In dev, use the mock refresh
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { inventoryRaw, seasonal } = await mockRefreshAccount();

            // Update the account inventory in the DB
            await db.update(table.account).set({
                inventoryRaw,
                seasonal: seasonal ? 1 : 0
            }).where(eq(table.account.name, account.name));

            return { inventory: inventoryRaw.split(","), seasonal };
        }

        // Get the HWID for the user
        const hwidRecord = await db.select({ hwid: table.user.hwid }).from(table.user).where(
            eq(table.user.id, locals.user.id)
        ).limit(1).get();


        if (!hwidRecord || hwidRecord.hwid === "") {
            return { error: 'HWID not set' };
        }

        const { inventory, seasonal } = await loadAccountInventory({ ...account, hwid: hwidRecord.hwid });
        if (inventory == null) {
            return { error: 'Failed to load account inventory or seasonal status' };
        }

        // Update the account inventory in the DB
        await db.update(table.account).set({
            inventoryRaw: inventory,
            seasonal: seasonal ? 1 : 0
        }).where(eq(table.account.name, account.name));

        return { inventory: inventory.split(","), seasonal };
    },
    cancelListingAndLogin: async ({ locals, request }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Grab the data from the form
        const data = await request.formData();
        const listingId = data.get('listingId');
        const accountName = data.get('accountName');

        if (typeof listingId !== 'string' || typeof accountName !== 'string') {
            return { error: 'Invalid data' };
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

        // After cancelling the listing, check if account is still in any other active trades
        const [remainingListings, activeOffers] = await Promise.all([
            db
                .select({ accountNames: table.tradeListing.accountNames })
                .from(table.tradeListing)
                .where(eq(table.tradeListing.status, 'active')),
            db
                .select({ offerAccountNames: table.tradeOffer.offerAccountNames })
                .from(table.tradeOffer)
                .where(eq(table.tradeOffer.status, 'pending'))
        ]);

        // Check if this account is still in any other active listing or offer
        let isStillLocked = false;
        for (const listing of remainingListings) {
            const names = JSON.parse(listing.accountNames) as string[];
            if (names.includes(accountName)) {
                isStillLocked = true;
                break;
            }
        }
        
        if (!isStillLocked) {
            for (const offer of activeOffers) {
                const names = JSON.parse(offer.offerAccountNames) as string[];
                if (names.includes(accountName)) {
                    isStillLocked = true;
                    break;
                }
            }
        }

        if (isStillLocked) {
            return { error: 'This account is still involved in another active trade and cannot be logged into.' };
        }

        // Now proceed with login
        const account = await db.select({ name: table.account.name, guid: table.account.guid, password: table.account.password }).from(table.account).where(
            eq(table.account.name, accountName)
        ).limit(1).get();

        if (!account) {
            return { error: 'Account not found' };
        }

        // Get the HWID for the user
        const hwidRecord = await db.select({ hwid: table.user.hwid }).from(table.user).where(
            eq(table.user.id, locals.user.id)
        ).limit(1).get();

        if (!hwidRecord || hwidRecord.hwid === "") {
            return { error: 'HWID not set' };
        }

        const { accessToken, timestamp } = await getAccessToken({ ...account, hwid: hwidRecord.hwid });
        if (accessToken === null || timestamp === null) {
            return { error: 'Failed to get access token' };
        }

        return { accessToken, timestamp };
    },
    submitHWID: async ({ locals, request }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Grab the HWID and install path from the form data
        const data = await request.formData();
        const hwid = data.get('hwid');
        const installPath = data.get('install_path');

        if (typeof hwid !== 'string' || hwid.length === 0) {
            return { error: 'Invalid HWID' };
        }

        const installPathStr = typeof installPath === 'string' && installPath.length > 0
            ? installPath
            : '%USERPROFILE%\\Documents\\RealmOfTheMadGod\\Production';

        // Update the user's HWID and install path in the DB
        await db.update(table.user).set({
            hwid: hwid,
            installPath: installPathStr
        }).where(eq(table.user.id, locals.user.id));

        return { success: true };
    }
}