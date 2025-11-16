<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { MoveUpRight, RefreshCw } from '@lucide/svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { accounts } from '$lib/stores';

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
	let showListingConflictModal = $state(false);
	let conflictingListing = $state<{ id: string; askingPrice: any[]; accountName: string } | null>(
		null
	);
	let localAlert = $state<{ message: string | null; type: 'success' | 'error' }>({
		message: null,
		type: 'success'
	});
	let alertTimeout = $state<ReturnType<typeof setTimeout> | null>(null);

	function showLocalAlert(message: string, type: 'success' | 'error' = 'success') {
		localAlert = { message, type };
		if (alertTimeout) {
			clearTimeout(alertTimeout);
		}
		alertTimeout = setTimeout(() => {
			localAlert = { message: null, type: 'success' };
			alertTimeout = null;
		}, 4000);
	}

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
		const uniqueItems = Object.entries(itemCounts).map(([itemName, count]) =>
			count > 1 ? `${itemName} (x${count})` : itemName
		);
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
		class="w-full cursor-pointer rounded-lg border-2 bg-white p-4 text-left transition-colors {selected
			? 'border-blue-500 bg-blue-50'
			: 'border-gray-300'}"
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
	<div class="rounded-lg border-2 border-gray-300 bg-white p-4">
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
								showLocalAlert('Failed to login to account', 'error');
								return;
							}

							// Check for server-side error
							if (result?.data?.error) {
								showLocalAlert(result.data.error as string, 'error');
								return;
							}

							// Check if listing cancellation is required
							if (result.data?.requiresListingCancellation) {
								conflictingListing = {
									id: result.data.listingId as string,
									askingPrice: result.data.askingPrice as any[],
									accountName: result.data.accountName as string
								};
								showListingConflictModal = true;
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
						Login <MoveUpRight class="ml-1 h-4 w-4" />
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
								showLocalAlert('Failed to login to account', 'error');
								return;
							}

							// Check for server-side error
							if (result?.data?.error) {
								showLocalAlert(result.data.error as string, 'error');
								return;
							}

							// If login was successful and we have an access token, set it
							if (result.data?.inventory && result.data?.seasonal != null) {
								inventory = result.data.inventory as string[];
								seasonal = result.data.seasonal as boolean;

								// Update $accounts store
								accounts.update((accs) =>
									accs.map((acc) => (acc.name === name ? { ...acc, inventory, seasonal } : acc))
								);
							}
						};
					}}
				>
					<input type="hidden" name="name" value={name} />
					<Button type="submit" class="cursor-pointer" disabled={isRefreshing} size="sm">
						Refresh <RefreshCw class={`ml-1 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
					</Button>
				</form>
			</div>
		{/if}
	</div>
{/if}

{#if localAlert.message}
	<Alert class="mb-4" variant={localAlert.type === 'error' ? 'destructive' : 'default'}>
		<AlertTitle>{localAlert.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
		<AlertDescription>{localAlert.message}</AlertDescription>
	</Alert>
{/if}

{#if command != ''}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-center text-xl font-bold">CMD Command</h2>
			<p class="mb-4 break-all">{command}</p>
			<!--Copy text button-->
			<div class="flex justify-center">
				<Button
					class="cursor-pointer text-center"
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

{#if showListingConflictModal && conflictingListing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-center text-xl font-bold">Account In Active Listing</h2>
			<p class="mb-4 text-center">
				This account is currently listed for sale with the following asking price:
			</p>
			<div class="mb-4 flex flex-wrap justify-center gap-2">
				{#each conflictingListing.askingPrice as item}
					<span class="rounded bg-blue-100 px-2 py-1 text-sm">
						{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}
					</span>
				{/each}
			</div>
			<p class="mb-6 text-center text-sm text-gray-600">
				To login to this account, you must cancel the listing first.
			</p>
			<div class="flex gap-3">
				<form
					method="POST"
					action="?/cancelListingAndLogin"
					class="flex-1"
					use:enhance={async () => {
						return async ({ result }) => {
							showListingConflictModal = false;
							conflictingListing = null;

							if (result.type !== 'success') {
								showLocalAlert('Failed to cancel listing and login to account', 'error');
								return;
							}

							// Check for server-side error
							if (result?.data?.error) {
								showLocalAlert(result.data.error as string, 'error');
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
					<input type="hidden" name="listingId" value={conflictingListing.id} />
					<input type="hidden" name="accountName" value={conflictingListing.accountName} />
					<Button type="submit" class="w-full cursor-pointer bg-red-600 hover:bg-red-700">
						Cancel Listing & Login
					</Button>
				</form>
				<Button
					class="flex-1 cursor-pointer"
					onclick={() => {
						showListingConflictModal = false;
						conflictingListing = null;
					}}
				>
					Cancel
				</Button>
			</div>
		</div>
	</div>
{/if}
