import { DOMAIN } from "$env/static/private";
import type { Account } from "../src/lib/server/realmapi.ts";

export async function mockCreateAccount(): Promise<Account> {
    // Wait for 1 second to simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        guid: `asdf11@${DOMAIN}`,
        name: "Asdfjkwejp",
        password: `asdf11@${DOMAIN}`,
        verificationLink: "https://www.realmofthemadgod.com/account/v?b=cE6D-5qkMRyY6M9j&a=6113444256317440"
    }
}

export async function mockCreateAccount2(): Promise<Account> {
    // Wait for 1 second to simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        guid: `asdf12@${DOMAIN}`,
        name: "Asdfadsfddd",
        password: `asdf12@${DOMAIN}`,
        verificationLink: "https://www.realmofthemadgod.com/account/v?b=cE6D-5qkMRyY6M9j&a=6113444256317440"
    }
}