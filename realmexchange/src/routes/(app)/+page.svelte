<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import Account from './inventory/components/Account.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { invalidateAll } from '$app/navigation';
	import { alertStore } from '$lib/stores';
	import { accounts } from '$lib/stores';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TradeListing from '$lib/components/TradeListing.svelte';
	import { getAllListingItems } from '$lib/utils';

	let { data } = $props();
	let selectedListing = $state<any>(null);
	let selectedAccounts = $state<string[]>([]);
	let showModal = $state(false);
	let isCounterOffer = $state(false);
	let itemSearch = $state('');

	function openAcceptModal(listing: any) {
		selectedListing = listing;
		showModal = true;
		selectedAccounts = [];
		isCounterOffer = false;
	}

	function openOfferModal(listing: any) {
		selectedListing = listing;
		showModal = true;
		selectedAccounts = [];
		isCounterOffer = true;
	}

	// Check if selected accounts can fulfill the asking price
	let canFulfillTrade = $derived.by(() => {
		if (isCounterOffer || !selectedListing || selectedAccounts.length === 0) {
			return { canFulfill: true, missingItems: [] };
		}

		const askingPriceItems = selectedListing.askingPriceItems || [];
		const selectedAccountData = data.userAccounts.filter(account => 
			selectedAccounts.includes(account.name)
		);

		// Count items in selected accounts, grouped by seasonal status
		const itemCounts: Record<string, { seasonal: number; nonSeasonal: number }> = {};
		for (const account of selectedAccountData) {
			for (const item of account.inventory) {
				if (!itemCounts[item]) {
					itemCounts[item] = { seasonal: 0, nonSeasonal: 0 };
				}
				if (account.seasonal) {
					itemCounts[item].seasonal += 1;
				} else {
					itemCounts[item].nonSeasonal += 1;
				}
			}
		}

		// Check each required item
		const missingItems: string[] = [];
		for (const requiredItem of askingPriceItems) {
			const availableCount = itemCounts[requiredItem.name];
			if (!availableCount) {
				missingItems.push(`${requiredItem.name} (${requiredItem.seasonal ? 'Seasonal' : 'Not Seasonal'}) (0/${requiredItem.quantity})`);
			} else {
				const countFromCorrectAccounts = requiredItem.seasonal ? availableCount.seasonal : availableCount.nonSeasonal;
				if (countFromCorrectAccounts < requiredItem.quantity) {
					missingItems.push(`${requiredItem.name} (${requiredItem.seasonal ? 'Seasonal' : 'Not Seasonal'}) (${countFromCorrectAccounts}/${requiredItem.quantity})`);
				}
			}
		}

		return {
			canFulfill: missingItems.length === 0,
			missingItems
		};
	});

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
				<TradeListing
					{listing}
					currentUserId={data.user?.id}
					showAccountsAsComponents={false}
					showAllItems={true}
					getAllListingItems={getAllListingItems}
					onAccept={openAcceptModal}
					onMakeOffer={openOfferModal}
				/>
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

<!-- Unified Modal for Accept and Counter Offer -->
{#if showModal && selectedListing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
			<h2 class="mb-4 text-2xl font-bold">{isCounterOffer ? 'Make Counter Offer' : 'Accept Trade'}</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Listing Details:</h3>
				<p class="text-sm text-gray-600">Seller: {selectedListing.sellerUsername}</p>
				<p class="text-sm text-gray-600">
					Accounts: {selectedListing.accounts.map((a: any) => a.name).join(', ')}
				</p>
			</div>

			{#if !isCounterOffer}
				<div class="mb-4">
					<h3 class="mb-2 font-bold">Asking Price:</h3>
					<div class="flex flex-wrap gap-2">
						{#each selectedListing.askingPriceItems as item}
							<span class="rounded bg-blue-100 px-2 py-1 text-sm">
								{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''} ({item.seasonal ? 'Seasonal' : 'Not Seasonal'})
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Select Your Accounts {isCounterOffer ? 'to Offer' : 'to Pay With'}:</h3>
				<p class="mb-2 text-sm text-gray-600">
					{isCounterOffer ? 'Select the accounts you want to offer in exchange for the listing.' : 'Choose accounts that contain the required items.'}
				</p>
				{#if !isCounterOffer && selectedAccounts.length > 0 && !canFulfillTrade.canFulfill}
					<div class="mb-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
						<strong>Insufficient items in selected accounts:</strong>
						<ul class="mt-1 list-disc list-inside">
							{#each canFulfillTrade.missingItems as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each data.userAccounts as account}
						<Account
							name={account.name}
							inventory={account.inventory}
							seasonal={account.seasonal}
							mode="selectable"
							selected={selectedAccounts.includes(account.name)}
							onClick={() => {
								if (selectedAccounts.includes(account.name)) {
									selectedAccounts = selectedAccounts.filter(name => name !== account.name);
								} else {
									selectedAccounts = [...selectedAccounts, account.name];
								}
							}}
						/>
					{/each}
				</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={() => (showModal = false)} variant="outline">Cancel</Button>
				<form
					method="POST"
					action={isCounterOffer ? "?/makeOffer" : "?/acceptTrade"}
					use:enhance={() => {
						showModal = false;
						return async ({ result }) => {
							if (result.type === 'success') {
								if (result.data?.error) {
									alertStore.show(result.data.error as string, 'error');
								} else {
									alertStore.show(
										isCounterOffer
											? 'Offer submitted!'
											: 'Trade accepted successfully!'
									);
									if (!isCounterOffer) {
										await invalidateAll();
										// Add the accounts to the account store
										const newAccounts = selectedListing.accounts.map((account: any) => ({
											name: account.name,
											inventory: account.inventory,
											seasonal: account.seasonal
										}));
										accounts.update((current) => [...current, ...newAccounts]);
									}
								}
							}
						};
					}}
				>
					<input type="hidden" name="listingId" value={selectedListing.id} />
					<input
						type="hidden"
						name="offerAccountNames"
						value={JSON.stringify(selectedAccounts)}
					/>
					<Button type="submit" disabled={selectedAccounts.length === 0 || (!isCounterOffer && !canFulfillTrade.canFulfill)}>
						{isCounterOffer ? 'Submit Offer' : 'Accept Trade'}
					</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
