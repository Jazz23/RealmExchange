import { DOMAIN } from "$env/static/private";
import { XMLParser } from "fast-xml-parser";
import type { AccountDB } from "./db/schema";
import { SaxesParser } from 'saxes';
import { getRequestEvent } from "$app/server";

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

export async function loadAccountInventory(account: { guid: string, password: string, hwid: string }): Promise<string | null> {
    const { accessToken } = await getAccessToken(account);
    if (accessToken === null) {
        console.error("Failed to get access token for account");
        return null;
    }

    const request = {
        accessToken,
        muleDump: "true"
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

    const inventory = parsed?.Chars?.Char?.Equipment as string;
    if (!inventory) {
        return ""
    }

    const parsedInventory = await parseInventory(inventory);
    if (parsedInventory === null) {
        console.error("Failed to parse inventory items");
        return null;
    }

    return parsedInventory.join(",");
}

export async function parseInventory(inventory: string) {
    const event = getRequestEvent();
    const r2 = event.platform?.env.R2;
    if (!r2) {
        console.error("R2 binding not found");
        return null;
    }

    // Parse inventory into normalized hex IDs
    const itemIds = inventory
        .split(",")
        .map(id => parseInt(id, 10))
        .filter(id => id !== -1)
        .map(id => "0x" + id.toString(16).toLowerCase());

    const foundItems: string[] = [];
    const targetAttr = "type";

    const parser = new SaxesParser();

    parser.on("opentag", (node) => {
        if (node.attributes[targetAttr] && itemIds.includes(node.attributes[targetAttr])) {
            foundItems.push(node.attributes.id);
        }
    });

    // Fetch the object from R2
    const object = await r2.get("Objects.xml");
    if (!object || !object.body) {
        console.error("Objects.xml not found in R2");
        return null;
    }

    // Create a reader to stream chunks
    const reader = object.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let done = false;
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;

        const chunk = decoder.decode(value, { stream: true });
        parser.write(chunk);

        // Optional: stop early if all found
        if (foundItems.length === itemIds.length) {
            done = true;
            reader.cancel(); // stop reading from R2
        }
    }

    if (foundItems.length !== itemIds.length) {
        return null;
    }

    return foundItems;
}

export async function getAccessToken(account: { guid: string, password: string, hwid: string }) {
    const request = {
        guid: account.guid,
        password: account.password,
        clientToken: account.hwid
    };

    const response = await realmRequest("account/verify", request);
    if (response === null) {
        return { accessToken: null, timestamp: null };
    }

    const parser = new XMLParser();
    const parsed = parser.parse(response);
    if (!parsed || !parsed.Account || !parsed.Account.AccessToken || !parsed.Account.AccessTokenTimestamp) {
        return { accessToken: null, timestamp: null };
    }

    return { accessToken: parsed.Account.AccessToken as string, timestamp: parsed.Account.AccessTokenTimestamp as string };
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