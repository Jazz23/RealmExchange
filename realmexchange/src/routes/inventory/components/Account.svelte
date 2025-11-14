<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { MoveUpRight, RefreshCw } from '@lucide/svelte';

	let { 
		name, 
		inventory, 
		seasonal, 
		mode = 'full',
		selected = false,
		onClick
	}: { 
		name: string; 
		inventory: string[]; 
		seasonal: boolean;
		mode?: 'full' | 'compact' | 'selectable';
		selected?: boolean;
		onClick?: () => void;
	} = $props();
	let command = $state('');
	let isRefreshing = $state(false);

	// Group items by name and count quantities
	let itemCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const item of inventory) {
			counts[item] = (counts[item] || 0) + 1;
		}
		return counts;
	});

	// Get formatted item display (all unique items with quantities)
	let formattedItems = $derived.by(() => {
		const uniqueItems = Object.entries(itemCounts)
			.map(([itemName, count]) => count > 1 ? `${itemName} (x${count})` : itemName);
		return uniqueItems;
	});

	// Base64 encode the access token
	function generateCommand(accessToken: string, timestamp: string): string {
		return `start "" /D "C:\\RealmOfTheMadGod\\Production" "C:\\RealmOfTheMadGod\\Production\\RotMG Exalt.exe" data:{platform:Deca,guid:,token:${btoa(accessToken)},tokenTimestamp:${btoa(timestamp)},tokenExpiration:ODY0MDA=,env:4,serverName:}`;
	}
</script>

{#if mode === 'selectable'}
	<button
		type="button"
		class="rounded-lg border-2 p-4 bg-white cursor-pointer transition-colors text-left w-full {selected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}"
		onclick={onClick}
	>
		<div class="mb-4">
			<h3 class="mb-2 text-xl font-bold">{name}</h3>
			<p class="text-sm text-gray-600">{seasonal ? 'Seasonal' : 'Not Seasonal'}</p>
			<p class="text-sm text-gray-600">Items: {inventory.length}</p>
			{#if inventory.length > 0}
				<p class="mt-2 text-xs text-gray-500">
					{formattedItems.join(', ')}
				</p>
			{/if}
		</div>
	</button>
{:else}
	<div class="rounded-lg border-2 p-4 bg-white border-gray-300">
		<div class="mb-4">
			<h3 class="mb-2 text-xl font-bold">{name}</h3>
			<p class="text-sm text-gray-600">{seasonal ? 'Seasonal' : 'Not Seasonal'}</p>
			<p class="text-sm text-gray-600">Items: {inventory.length}</p>
			{#if inventory.length > 0}
				<p class="mt-2 text-xs text-gray-500">
					{formattedItems.join(', ')}
				</p>
			{/if}
		</div>

		{#if mode === 'full'}
			<div class="flex flex-wrap gap-2">
				<form
					method="POST"
					action="?/loginAccount"
					use:enhance={async () => {
						return async ({ result }) => {
							if (result.type !== 'success') {
								alert('Failed to login to account');
								return;
							}

							// Check for server-side error
							if (result?.data?.error) {
								alert(result.data.error as string);
								return;
							}

							// If login was successful and we have an access token, set it
							if (result.data?.accessToken && result.data?.timestamp) {
								command = generateCommand(
									result.data.accessToken as string,
									result.data.timestamp as string
								);
							}
						};
					}}
				>
					<input type="hidden" name="name" value={name} />
					<Button type="submit" class="cursor-pointer" size="sm">
						Login <MoveUpRight class="w-4 h-4 ml-1" />
					</Button>
				</form>

				<form
					method="POST"
					action="?/refreshInventory"
					use:enhance={async () => {
						isRefreshing = true;
						return async ({ result }) => {
							isRefreshing = false;
							if (result.type !== 'success') {
								alert('Failed to login to account');
								return;
							}

							// Check for server-side error
							if (result?.data?.error) {
								alert(result.data.error as string);
								return;
							}

							// If login was successful and we have an access token, set it
							if (result.data?.inventory && result.data?.seasonal) {
								inventory = result.data.inventory as string[];
								seasonal = result.data.seasonal as boolean;
							}
						};
					}}
				>
					<input type="hidden" name="name" value={name} />
					<Button type="submit" class="cursor-pointer" disabled={isRefreshing} size="sm">
						Refresh <RefreshCw class={`w-4 h-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
					</Button>
				</form>
			</div>
		{/if}
	</div>
{/if}

{#if command != ''}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-center text-xl font-bold">CMD Command</h2>
			<p class="mb-4 break-all">{command}</p>
			<!--Copy text button-->
			<div class="flex justify-center">
				<Button
					class="text-center cursor-pointer"
					onclick={() => {
						navigator.clipboard.writeText(command);
						command = '';
					}}
				>
					Copy
				</Button>
			</div>
		</div>
	</div>
{/if}
