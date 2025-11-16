<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import Account from './inventory/components/Account.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { invalidateAll } from '$app/navigation';
	import { alertStore } from '$lib/stores';
	import { accounts } from '$lib/stores';
	import SearchBar from '$lib/components/SearchBar.svelte';

	let { data } = $props();
	console.log('Marketplace data:', data);
	let selectedListing = $state<any>(null);
	let selectedOfferAccounts = $state<string[]>([]);
	let showOfferModal = $state(false);
	let itemSearch = $state('');

	function openOfferModal(listing: any) {
		selectedListing = listing;
		showOfferModal = true;
		selectedOfferAccounts = [];
	}

	// Extract all unique items from listings for search suggestions
	let allItems = $derived.by(() => {
		const itemSet = new Set<string>();
		if (data.listings && Array.isArray(data.listings)) {
			for (const listing of data.listings) {
				if (listing.accounts && Array.isArray(listing.accounts)) {
					for (const account of listing.accounts) {
						if (account.inventory && Array.isArray(account.inventory)) {
							for (const item of account.inventory) {
								if (item && typeof item === 'string') {
									itemSet.add(item);
								}
							}
						}
					}
				}
			}
		}
		return Array.from(itemSet).sort();
	});

	// Filter listings based on item search
	let filteredListings = $derived.by(() => {
		try {
			if (!itemSearch.trim()) {
				return data.listings || [];
			}

			const searchTerm = itemSearch.toLowerCase().trim();
			return (data.listings || []).filter((listing) => {
				// Check if any account in this listing contains the searched item
				return (
					listing.accounts &&
					Array.isArray(listing.accounts) &&
					listing.accounts.some(
						(account: any) =>
							account.inventory &&
							Array.isArray(account.inventory) &&
							account.inventory.some(
								(item: string) =>
									typeof item === 'string' && item.toLowerCase().includes(searchTerm)
							)
					)
				);
			});
		} catch (error) {
			console.error('Error filtering listings:', error);
			return data.listings || [];
		}
	});
</script>

<div class="m-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Marketplace</h1>
		{#if data.user}
			<a href="/trade">
				<Button>Create Listing</Button>
			</a>
		{/if}
	</div>

	<!-- Item Search Bar -->
	<div class="mb-6">
		<label for="item-search" class="mb-2 block text-sm font-medium text-gray-700">
			Search listings by item:
		</label>
		<SearchBar
			bind:value={itemSearch}
			items={allItems}
			placeholder="Enter item name to filter listings..."
		/>
		{#if itemSearch.trim()}
			<p class="mt-1 text-sm text-gray-600">
				Showing {filteredListings.length} of {data.listings.length} listings
			</p>
		{/if}
	</div>

	{#if filteredListings.length === 0}
		{#if itemSearch.trim()}
			<p class="text-gray-600">No listings found containing "{itemSearch}".</p>
		{:else}
			<p class="text-gray-600">No active listings available.</p>
		{/if}
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each filteredListings as listing}
				<div class="rounded-lg border-2 border-gray-300 p-6">
					<div class="mb-4">
						<h2 class="text-xl font-bold">Listed by: {listing.sellerUsername}</h2>
						<p class="text-sm text-gray-600">
							Created: {new Date(listing.createdAt).toLocaleDateString()}
						</p>
					</div>

					<div class="mb-4">
						<h3 class="mb-2 font-bold">Accounts for Sale:</h3>
						{#each listing.accounts as account}
							<div class="mb-2">
								<Account
									name={account.name}
									inventory={account.inventory}
									seasonal={account.seasonal}
									mode="compact"
								/>
							</div>
						{/each}
					</div>

					<div class="mb-4">
						<h3 class="mb-2 font-bold">Asking Price:</h3>
						<div class="flex flex-wrap gap-2">
							{#each listing.askingPriceItems as item}
								<span class="rounded bg-blue-100 px-2 py-1 text-sm">
									{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}
								</span>
							{/each}
						</div>
					</div>

					{#if data.user && data.user.id !== listing.sellerId}
						<div class="flex gap-2">
							<form
								method="POST"
								action="?/acceptTrade"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											if (result.data?.error) {
												alertStore.show(result.data.error as string, 'error');
											} else {
												alertStore.show('Trade accepted successfully!');
												await invalidateAll();

												// Add the accounts to the account store
												const newAccounts = listing.accounts.map((account: any) => ({
													name: account.name,
													inventory: account.inventory,
													seasonal: account.seasonal
												}));

												accounts.update((current) => [...current, ...newAccounts]);
											}
										}
									};
								}}
							>
								<input type="hidden" name="listingId" value={listing.id} />
								<Button type="submit" class="cursor-pointer">Accept</Button>
							</form>

							<Button onclick={() => openOfferModal(listing)} class="cursor-pointer"
								>Make Counter Offer</Button
							>
						</div>
					{:else if data.user && data.user.id === listing.sellerId}
						<form
							method="POST"
							action="?/cancelListing"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										if (result.data?.error) {
											alertStore.show(result.data.error as string, 'error');
										} else {
											alertStore.show('Listing cancelled successfully!');
											await invalidateAll();
										}
									}
								};
							}}
						>
							<input type="hidden" name="listingId" value={listing.id} />
							<Button type="submit" variant="outline" class="cursor-pointer">Cancel Listing</Button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if $alertStore.message}
	<Alert
		class="fixed left-4 top-4 z-50 max-w-md"
		variant={$alertStore.type === 'error' ? 'destructive' : 'default'}
	>
		<AlertTitle>{$alertStore.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
		<AlertDescription>{$alertStore.message}</AlertDescription>
	</Alert>
{/if}

<!-- Counter Offer Modal -->
{#if showOfferModal && selectedListing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
			<h2 class="mb-4 text-2xl font-bold">Make Counter Offer</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Listing Details:</h3>
				<p class="text-sm text-gray-600">Seller: {selectedListing.sellerUsername}</p>
				<p class="text-sm text-gray-600">
					Accounts: {selectedListing.accounts.map((a: any) => a.name).join(', ')}
				</p>
			</div>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Select Your Accounts to Offer:</h3>
				<p class="mb-2 text-sm text-gray-600">Note: You need to load your accounts first</p>
				<a href="/inventory" class="text-blue-500 hover:underline">Go to Inventory</a>
			</div>

			<div class="flex gap-2">
				<Button onclick={() => (showOfferModal = false)} variant="outline">Cancel</Button>
				<form
					method="POST"
					action="?/makeOffer"
					use:enhance={() => {
						showOfferModal = false;
						return async ({ result }) => {
							if (result.type === 'success') {
								if (result.data?.error) {
									alertStore.show(result.data.error as string, 'error');
								} else {
									alertStore.show(
										'Offer submitted! (Note: This is a simplified version. In a full implementation, the seller would review your offer.)'
									);
								}
							}
						};
					}}
				>
					<input type="hidden" name="listingId" value={selectedListing.id} />
					<input
						type="hidden"
						name="offerAccountGuids"
						value={JSON.stringify(selectedOfferAccounts)}
					/>
					<Button type="submit" disabled={selectedOfferAccounts.length === 0}>Submit Offer</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
