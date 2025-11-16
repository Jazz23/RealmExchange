import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export function localStore<T>(key: string, initial: T) {
    const store = writable(initial, (set) => {
        if (!browser) return;

        // Load from localStorage
        const json = localStorage.getItem(key);
        if (json) set(JSON.parse(json));

        // Return a cleanup function (optional)
        return () => {};
    });

    // Subscribe and save to localStorage
    store.subscribe((value) => {
        if (browser) localStorage.setItem(key, JSON.stringify(value));
    });

    return store;
}


export const accounts = localStore<{ name: string; inventory: string[]; seasonal: boolean }[]>("accounts", []);

// Alert store for global toast notifications
export interface AlertState {
	message: string | null;
	type: 'success' | 'error';
}

function createAlertStore() {
	const { subscribe, set, update } = writable<AlertState>({
		message: null,
		type: 'success'
	});

	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return {
		subscribe,
		show: (message: string, type: 'success' | 'error' = 'success') => {
			// Clear any existing timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			// Set the new alert
			set({ message, type });

			// Auto-clear after 4 seconds
			timeoutId = setTimeout(() => {
				set({ message: null, type: 'success' });
				timeoutId = null;
			}, 4000);
		},
		hide: () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			set({ message: null, type: 'success' });
		}
	};
}

export const alertStore = createAlertStore();