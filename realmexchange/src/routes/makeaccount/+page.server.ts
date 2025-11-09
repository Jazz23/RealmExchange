// Receives the token from the client and stores it in the database

import { createAccount } from '$lib/server/realmapi.js';

export const actions = {
    createAccount: async ({ platform }) => {
        const account = await createAccount(platform!.env);

        if (account instanceof Error) {
            return { error: account.message };
        }
        
        return { link: account.verificationLink };
    }
}