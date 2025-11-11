import { DOMAIN } from "$env/static/private";
import { XMLParser } from "fast-xml-parser";
import type { AccountDB } from "./db/schema";

const BASE_URL = "https://www.realmofthemadgod.com";
const HEADERS = {
    "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
    Accept: "*/*",
    "Accept-Encoding": "deflate, gzip",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Unity-Version": "2021.3.16f1",
}

export class Account {
    guid: string;
    name: string;
    password: string;
    verificationLink: string;

    constructor(guid: string, name: string, password: string, verificationLink: string) {
        this.guid = guid;
        this.name = name;
        this.password = password;
        this.verificationLink = verificationLink;
    }
}

// Creates a new, unverified account
export async function createAccount(env: Env): Promise<Account | Error> {
    const request = {
        isAgeVerified: "1",
        entrytag: "",
        signedUpKabamEmail: "0",
        game_net: "Unity",
        play_platform: "Unity",
        game_net_user_id: "",
        newGUID: generateGUID(),
        name: generateRandomString(10),
        newPassword: generateRandomString(12) + "Aa1",
    };

    const response = await realmRequest("account/register", request);
    if (response === null) {
        return new Error("Failed to create account");
    }

    // Poll the durable object until there's a verification link
    const verificationLink = await pollForVerificationLink(env);
    if (verificationLink === null) {
        return new Error("Failed to retrieve verification link");
    }

    return new Account(request.newGUID, request.name, request.newPassword, verificationLink);
}

export async function loadAccountInventory(account: AccountDB): Promise<any | null | {}> {
    const accessToken = await getAccessToken(account);
    if (accessToken === null) {
        console.error("Failed to get access token for account");
        return null;
    }

    const request = {
        accessToken
    }

    const response = await realmRequest("char/list", request);
    if (response === null) {
        console.error("Failed to load account inventory");
        return null;
    }

    const parser = new XMLParser();
    const parsed = parser.parse(response);
    if (!parsed || !parsed.Chars) {
        console.error("Failed to parse account inventory");
        return null;
    }

    const itemInfo = parsed?.Chars?.[0]?.UniqueItemInfo;
    if (!itemInfo) {
        return {}; // We don't want to return null since we successfully loaded the inventory, it just has no items
    }

    return itemInfo;
}

async function getAccessToken(account: AccountDB): Promise<string | null> {
    const request = {
        guid: account.guid,
        password: account.password,
        clientToken: "0"
    };

    const response = await realmRequest("account/verify", request);
    if (response === null) {
        return null;
    }

    const parser = new XMLParser();
    const parsed = parser.parse(response);
    if (!parsed || !parsed.Account || !parsed.Account.AccessToken) {
        return null;
    }

    return parsed.Account.AccessToken;
}

async function pollForVerificationLink(env: Env): Promise<string | null> {
    const maxAttempts = 20;
    const delayMs = 500;

    const emailWorker = env.EMAIL_STORE as any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        const resp = await emailWorker.popLink();
        if (resp.status === 200) {
            return await resp.text();
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    return null;
}


    function generateGUID(): string {
        const randomPart = generateRandomString(8);
        return `${randomPart}@${DOMAIN}`;
    }

    function generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async function realmRequest(endpoint: string, params: Record<string, string> = {}): Promise<string | null> {
        const url = new URL(`${BASE_URL}/${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: HEADERS,
        });

        if (!response.ok) {
            console.error(`Realm request failed: ${await response.text()}`);
            return null;
        }

        const text = await response.text();
        if (text.includes("<Error>")) {
            console.error(`Realm returned error: ${text}`);
            return null;
        }

        return text;
    }