// Receives the token from the client and stores it in the database

import { db } from '$lib/server/db/index.js';
import * as table from '$lib/server/db/schema.js';
import { createAccount, loadAccountInventory } from '$lib/server/realmapi.js';
import { and, eq } from 'drizzle-orm';
import { mockCreateAccount } from '../../../test/mock.js';

export const actions = {
    createAccount: async ({ platform, locals }) => {
        if (!locals.user) {
            return { error: 'Not authenticated' };
        }

        // Create the account via Realm API
        const account = import.meta.env.PROD ? await createAccount(platform!.env) : await mockCreateAccount();
        
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
    }
}