const BASE_URL = "https://realmofthemadgodhrd.appspot.com";
const HEADERS = {
    "User-Agent": "UnityPlayer/2021.3.16f1 (UnityWebRequest/1.0, libcurl/7.84.0-DEV)",
    Accept: "*/*",
    "Accept-Encoding": "deflate, gzip",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Unity-Version": "2021.3.16f1",
}

export async function verifyAccount(a: string, recaptchaToken: string): Promise<boolean> {
    const response = await realmRequest("account/v", {
        a,
        action: "I+swear+to+Oryx+I+am+no+bot",
        "g-recaptcha-response": recaptchaToken
    }) as string;

    if (response.includes("Realm of the Mad God - Verification Error")) {
        console.error("Failed to verify account:");
        return false;
    }

    return true;
}

async function realmRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });
    
    const response = await fetch(url.toString(), {
        method: "POST",
        headers: HEADERS,
    });

    return response.text();
}