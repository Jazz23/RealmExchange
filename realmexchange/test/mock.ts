import { DOMAIN } from "$env/static/private";
import type { Account } from "../src/lib/server/realmapi.ts";

export async function mockCreateAccount(): Promise<Account> {
    // Wait for 1 second to simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a random number from 1-10000 to append to the guid and password
    const randomNum = Math.floor(Math.random() * 10000) + 1;

    return {
        guid: `${randomNum}@hah.gotem`,
        name: `TestAccount${randomNum}`,
        password: `oogabooga`,
        verificationLink: "https://www.realmofthemadgod.com/account/v?b=cE6D-5qkMRyY6M9j&a=6113444256317440"
    }
}

export async function mockRefreshAccount() {
            return { inventoryRaw: "Potion of Attack,Potion of Defense", seasonal: false };
}