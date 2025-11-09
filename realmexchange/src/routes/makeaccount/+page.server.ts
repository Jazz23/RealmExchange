// Receives the token from the client and stores it in the database

import { createAccount } from '$lib/server/realmapi.js';
import { mockCreateAccount } from '../../../test/mock.js';

export const actions = {
    createAccount: async ({ platform }) => {
        const account = import.meta.env.PROD ? await createAccount(platform!.env) : mockCreateAccount();
        
        if (account instanceof Error) {
            return { error: account.message };
        }
        
        return { link: account.verificationLink };
    }
}