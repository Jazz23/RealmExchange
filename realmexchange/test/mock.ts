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

export function mockLogin() {
    return { accessToken: "Q29ReEs5VFJjK2hORGRuamRDc3BLS3FHQkdvNEptTVd2YzlqTDRSTXdhdkxmbXpiZEpybEY1M1RzQi8yQkRtdFB3SFdrSEVBNXBKYWh2UFMveXlOY0psTEh6R2FDemg1WXl1VndxQzE5L0RST2Z3N0JpRU9TMHc2b0JaTm9EWnRBaGFKbzJnNVNJUlkzb1dYRGVJWUoySlFsUzFqU0VBT0JvMDE0cWpCVC9iNmdPbTNlV3hoWnd5VDVwaDhRVk14dWREWjkxM05Ud0lqejFrTUFoYldTNzYvbnlLaUlxZzhWK0RmeVhsbEFkY2VMMWhQVmw1TkJzVGhFOGN2cGtjZHpodnN0VnFKOEJvMzgzT2ozbnozRWxTTldmOWFJRXQ4WnJNcFhvd1pURlZmRGFQM3lQZ21GM0Vzb0VlVDFrZ29zNmVZZnAzVjNBTEwzSnBoWkRrbjhBPT0=", timestamp: Date.now() };   
}