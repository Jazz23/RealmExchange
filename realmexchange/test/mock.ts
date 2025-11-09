import { DOMAIN } from "$env/static/private";
import type { Account } from "../src/lib/server/realmapi.ts";

export function mockCreateAccount(): Account {
    return {
        guid: `asdf11@${DOMAIN}`,
        name: "Asdfjkwejp",
        password: `asdf11@${DOMAIN}`,
        verificationLink: "https://www.realmofthemadgod.com/account/v?b=cE6D-5qkMRyY6M9j&a=6113444256317440"
    }
}