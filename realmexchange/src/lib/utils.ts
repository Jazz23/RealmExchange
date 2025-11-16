import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

// Aggregate all items from all accounts in a listing
export function getAllListingItems(listing: any) {
	const itemData: Record<string, { count: number; isSeasonal: boolean }> = {};
	
	if (listing.accounts && Array.isArray(listing.accounts)) {
		for (const account of listing.accounts) {
			if (account.inventory && Array.isArray(account.inventory)) {
				const accountSeasonal = account.seasonal;
				for (const item of account.inventory) {
					if (item && typeof item === 'string') {
						if (!itemData[item]) {
							itemData[item] = { count: 0, isSeasonal: accountSeasonal };
						}
						itemData[item].count += 1;
						// If any account containing this item is seasonal, mark it as seasonal
						if (accountSeasonal) {
							itemData[item].isSeasonal = true;
						}
					}
				}
			}
		}
	}
	
	return Object.entries(itemData)
		.map(([itemName, data]) => ({
			name: itemName,
			display: data.count > 1 ? `${itemName} (x${data.count})` : itemName,
			isSeasonal: data.isSeasonal
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
