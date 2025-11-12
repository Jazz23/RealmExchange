import { writable } from 'svelte/store';

export const accounts = writable<{ name: string; inventory: string[] }[]>([]);