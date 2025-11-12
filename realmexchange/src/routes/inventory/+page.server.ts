// Receives the token from the client and stores it in the database

import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { createAccount, getAccessToken, loadAccountInventory } from '$lib/server/realmapi.js';
import { and, eq } from 'drizzle-orm';
import { mockCreateAccount, mockCreateAccount2 } from '../../../test/mock.js';
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    if (!locals.user) {
        return redirect(302, '/login');
    }

    // Load all accounts for this user
    const accounts = await db.select({ name: table.account.name, inventoryRaw: table.account.inventoryRaw }).from(table.account).where(
        eq(table.account.ownerId, locals.user.id)
    );

    return { accounts: accounts.map(acc => ({ name: acc.name, inventory: acc.inventoryRaw.split(",") })) };
}

export const actions = {
    createAccount: async ({ platform, locals }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Create the account via Realm API
        let account;

        if (import.meta.env.PROD) {
            account = await createAccount(platform!.env);
        } else {
            // Delete the test account from the db since we're re-making it
            account = await mockCreateAccount2();

            await db.delete(table.account).where(and(
                eq(table.account.ownerId, locals.user.id),
                eq(table.account.guid, account.guid)
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
            inventoryRaw: ''
        }

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

        // Get the account inventory from Realm API
        const inventory = await loadAccountInventory(account);
        if (inventory == null) {
            return { error: 'Failed to load account inventory' };
        }

        // Update the account as verified with inventory
        await db.update(table.account).set({
            verified: 1,
            inventoryRaw: inventory
        }).where(eq(table.account.guid, account.guid));

        return { name: account.name, inventory };
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

        // Find the account by name from the DB
        const account = await db.select({ guid: table.account.guid, password: table.account.password }).from(table.account).where(
            eq(table.account.name, name)
        ).limit(1).get();

        if (!account) {
            return { error: 'Account not found' };
        }

        const { accessToken, timestamp } = await getAccessToken(account);
        if (accessToken === null || timestamp === null) {
            return { error: 'Failed to get access token' };
        }

        return { accessToken, timestamp };
    }
}