import { writable } from 'svelte/store';

export const accounts = writable<{ name: string; inventory: string[]; seasonal: boolean }[]>([]);

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