<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import Account from '../inventory/components/Account.svelte';
	import { alertStore } from '$lib/stores'
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TradeListing from '$lib/components/TradeListing.svelte';
	import { getAllListingItems } from '$lib/utils';

	let { data } = $props();
	let selectedAccounts = $state<string[]>([]);
	let askingPrice = $state<{name: string, quantity: number, seasonal: boolean}[]>([]);
	let itemSearch = $state('');
	let isSubmitting = $state(false);
	let selectedListing = $state<any>(null);
	let showCounterOffersModal = $state(false);

	// Handle items as a promise
	let items = $state<string[]>([]);
	let itemsLoading = $state(true);

	const availableAccounts = data.accounts.filter(account => !data.listedAccountNames.has(account.name));

	// Resolve the items promise when it becomes available
	$effect(() => {
		if (data.items && typeof data.items.then === 'function') {
			data.items.then((resolvedItems) => {
				items = resolvedItems;
				itemsLoading = false;
			}).catch(() => {
				items = [];
				itemsLoading = false;
			});
		} else if (Array.isArray(data.items)) {
			items = data.items;
			itemsLoading = false;
		}
	});

	function toggleAccount(name: string) {
		if (selectedAccounts.includes(name)) {
			selectedAccounts = selectedAccounts.filter((g) => g !== name);
		} else {
			selectedAccounts = [...selectedAccounts, name];
		}
	}

	function addItem(item: string) {
		if (!askingPrice.some(ap => ap.name === item)) {
			askingPrice = [...askingPrice, { name: item, quantity: 1, seasonal: false }];
		}
		itemSearch = '';
	}

	function removeItem(itemName: string) {
		askingPrice = askingPrice.filter((item) => item.name !== itemName);
	}

	function updateQuantity(itemName: string, quantity: number) {
		askingPrice = askingPrice.map((item) =>
			item.name === itemName ? { ...item, quantity: Math.max(1, quantity) } : item
		);
	}

	function openCounterOffersModal(listing: any) {
		selectedListing = listing;
		showCounterOffersModal = true;
	}

	// Helper function to aggregate items from accounts
	function getOfferedItems(accounts: any[]) {
		const itemData: Record<string, { count: number; isSeasonal: boolean }> = {};
		
		if (accounts && Array.isArray(accounts)) {
			for (const account of accounts) {
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
</script>

<div class="m-10">
	<h1 class="mb-6 text-3xl font-bold">Create Trade Listing</h1>

	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">Select Accounts to Sell</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each availableAccounts as account}
				<Account
					name={account.name}
					inventory={account.inventory}
					seasonal={account.seasonal}
					mode="selectable"
					selected={selectedAccounts.includes(account.name)}
					onClick={() => toggleAccount(account.name)}
				/>
			{/each}
		</div>
		{#if availableAccounts.length === 0}
			<p class="text-gray-600">
				No accounts available. Please add accounts in the inventory page first.
			</p>
		{/if}
	</div>

	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">Set Asking Price</h2>
		<div class="mb-4">
			<SearchBar
				bind:value={itemSearch}
				{items}
				loading={itemsLoading}
				onSelect={addItem}
			/>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each askingPrice as item (item.name)}
				<div class="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1">
					<span class="flex-1">{item.name}</span>
					<div class="flex items-center gap-1">
						<label for="qty-{item.name}" class="text-xs text-gray-600">Qty:</label>
						<input
							id="qty-{item.name}"
							type="number"
							min="1"
							value={item.quantity}
							oninput={(e) => updateQuantity(item.name, parseInt(e.currentTarget.value) || 1)}
							class="w-12 h-6 text-xs text-center border border-gray-300 rounded"
						/>
					</div>
					<div class="flex items-center gap-1">
						<label for="seasonal-{item.name}" class="text-xs text-gray-600">Seasonal:</label>
						<input
							id="seasonal-{item.name}"
							type="checkbox"
							bind:checked={item.seasonal}
							class="w-4 h-4"
						/>
					</div>
					<button class="text-red-500 hover:text-red-700 ml-1" onclick={() => removeItem(item.name)}>
						×
					</button>
				</div>
			{/each}
		</div>
	</div>

	<form
		method="POST"
		action="?/createListing"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ result }) => {
				isSubmitting = false;
				if (result.type !== 'success') {
					alertStore.show('Failed to create listing', 'error');
					return;
				}

				// Check for server-side error
				if (result?.data?.error) {
					alertStore.show(result.data.error as string, 'error');
					return;
				}

				setTimeout(() => goto('/'), 500);
			};
		}}
	>
		<input type="hidden" name="accountNames" value={JSON.stringify(selectedAccounts)} />
		<input type="hidden" name="askingPrice" value={JSON.stringify(askingPrice)} />
		<Button
			type="submit"
			disabled={selectedAccounts.length === 0 || askingPrice.length === 0 || isSubmitting}
			class="cursor-pointer"
		>
			{isSubmitting ? 'Creating...' : 'Create Listing'}
		</Button>
	</form>

	{#if data.userListings && data.userListings.length > 0}
		<div class="mt-12">
			<h2 class="mb-4 text-3xl font-bold">My Listings</h2>
			<div class="space-y-4">
				{#each data.userListings as listing (listing.id)}
					<TradeListing
						{listing}
						currentUserId={data.user?.id}
						showAccountsAsComponents={false}
						showAllItems={true}
						getAllListingItems={getAllListingItems}
						onViewCounterOffers={openCounterOffersModal}
					/>
				{/each}
			</div>
		</div>
	{/if}
</div>

{#if $alertStore.message}
	<Alert class="fixed top-4 left-4 z-50 max-w-md" variant={$alertStore.type === 'error' ? 'destructive' : 'default'}>
		<AlertTitle>{$alertStore.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
		<AlertDescription>{$alertStore.message}</AlertDescription>
	</Alert>
{/if}

<!-- Counter Offers Modal -->
{#if showCounterOffersModal && selectedListing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
			<h2 class="mb-4 text-2xl font-bold">Counter Offers for Your Listing</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Your Listing:</h3>
				<div class="rounded border p-4 bg-gray-50">
					<div class="mb-2">
						<span class="font-semibold">Items in Listing:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each getAllListingItems(selectedListing) as item}
								<span class="rounded bg-green-100 px-2 py-1 text-sm">
									{item.display} ({item.isSeasonal ? 'Seasonal' : 'Not Seasonal'})
								</span>
							{/each}
						</div>
					</div>
					<div class="mb-2">
						<span class="font-semibold">Asking Price:</span>
						<div class="flex flex-wrap gap-1 mt-1">
							{#each selectedListing.askingPriceItems as item}
								<span class="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm">
									{item.name} × {item.quantity}
									{#if item.seasonal}
										<span class="text-orange-600">(Seasonal)</span>
									{/if}
								</span>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Counter Offers ({selectedListing.counterOffers.length}):</h3>
				<div class="space-y-4">
					{#each selectedListing.counterOffers as offer (offer.id)}
						<div class="rounded border p-4">
							<div class="mb-2">
								<span class="font-semibold">From:</span>
								<span class="ml-2">{offer.buyerUsername}</span>
								<span class="ml-4 text-sm text-gray-600">
									{new Date(offer.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div class="mb-2">
								<span class="font-semibold">Offered Items:</span>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each getOfferedItems(offer.accounts) as item}
										<span class="rounded bg-green-100 px-2 py-1 text-sm">
											{item.display} ({item.isSeasonal ? 'Seasonal' : 'Not Seasonal'})
										</span>
									{/each}
								</div>
							</div>
							<div class="flex gap-2">
								<form
									method="POST"
									action="?/acceptCounterOffer"
									use:enhance={() => {
										showCounterOffersModal = false;
										return async ({ result }) => {
											if (result.type === 'success') {
												if (result.data?.error) {
													alertStore.show(result.data.error as string, 'error');
												} else {
													alertStore.show('Counter offer accepted! Trade completed.');
													await invalidateAll();
												}
											}
										};
									}}
								>
									<input type="hidden" name="offerId" value={offer.id} />
									<Button type="submit" class="cursor-pointer">Accept This Offer</Button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={() => (showCounterOffersModal = false)} variant="outline">Close</Button>
			</div>
		</div>
	</div>
{/if}
