<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';
	import Account from '../inventory/components/Account.svelte';
	import { alertStore } from '$lib/stores';

	let { data } = $props();
	let selectedAccounts = $state<string[]>([]);
	let askingPrice = $state<{name: string, quantity: number}[]>([]);
	let itemSearch = $state('');
	let filteredItems = $state<string[]>([]);
	let showItemSelector = $state(false);
	let isSubmitting = $state(false);

	// Handle items as a promise
	let items = $state<string[]>([]);
	let itemsLoading = $state(true);

	// Resolve the items promise when it becomes available
	$effect(() => {
		if (data.items && typeof data.items.then === 'function') {
			data.items.then((resolvedItems) => {
				items = resolvedItems;
				itemsLoading = false;
				filterItems();
			}).catch(() => {
				items = [];
				itemsLoading = false;
			});
		} else if (Array.isArray(data.items)) {
			items = data.items;
			itemsLoading = false;
			filterItems();
		}
	});

	function toggleAccount(guid: string) {
		if (selectedAccounts.includes(guid)) {
			selectedAccounts = selectedAccounts.filter((g) => g !== guid);
		} else {
			selectedAccounts = [...selectedAccounts, guid];
		}
	}

	function addItem(item: string) {
		if (!askingPrice.some(ap => ap.name === item)) {
			askingPrice = [...askingPrice, { name: item, quantity: 1 }];
		}
		itemSearch = '';
		showItemSelector = false;
		filteredItems = items.slice(0, 50);
	}

	function removeItem(itemName: string) {
		askingPrice = askingPrice.filter((item) => item.name !== itemName);
	}

	function updateQuantity(itemName: string, quantity: number) {
		askingPrice = askingPrice.map((item) =>
			item.name === itemName ? { ...item, quantity: Math.max(1, quantity) } : item
		);
	}

	function filterItems() {
		if (itemSearch.length > 0) {
			filteredItems = items
				.filter((i) => i.toLowerCase().includes(itemSearch.toLowerCase()))
				.slice(0, 50);
		} else {
			filteredItems = items.slice(0, 50);
		}
	}

	$effect(() => {
		// Re-filter items when search term or items change
		if (items.length > 0 || !itemsLoading) {
			filterItems();
		}
	});
</script>

<div class="m-10">
	<h1 class="mb-6 text-3xl font-bold">Create Trade Listing</h1>

	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">Select Accounts to Sell</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.accounts as account}
				<Account
					name={account.name}
					inventory={account.inventory}
					seasonal={account.seasonal}
					mode="selectable"
					selected={selectedAccounts.includes(account.guid)}
					onClick={() => toggleAccount(account.guid)}
				/>
			{/each}
		</div>
		{#if data.accounts.length === 0}
			<p class="text-gray-600">
				No accounts available. Please add accounts in the inventory page first.
			</p>
		{/if}
	</div>

	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">Set Asking Price</h2>
		<div class="mb-4">
			<div class="relative">
				<input
					type="text"
					bind:value={itemSearch}
					onfocus={() => (showItemSelector = true)}
					placeholder="Search for items..."
					class="w-full rounded-lg border-2 border-gray-300 p-2"
				/>
				{#if showItemSelector}
					<div
						class="absolute z-10 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-gray-300 bg-white shadow-lg"
					>
						{#if itemsLoading}
							<div class="p-4 text-center text-gray-500">
								Loading items...
							</div>
						{:else if filteredItems.length > 0}
							{#each filteredItems as item}
								<button type="button" class="cursor-pointer p-2 hover:bg-gray-100 w-full text-left" onclick={() => addItem(item)}>
									{item}
								</button>
							{/each}
						{:else}
							<div class="p-4 text-center text-gray-500">
								No items found
							</div>
						{/if}
					</div>
				{/if}
			</div>
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
				if (result.type === 'success') {
					if (result.data?.error) {
						alertStore.show(result.data.error as string, 'error');
					} else {
						setTimeout(() => goto('/'), 500);
					}
				}
			};
		}}
	>
		<input type="hidden" name="accountGuids" value={JSON.stringify(selectedAccounts)} />
		<input type="hidden" name="askingPrice" value={JSON.stringify(askingPrice)} />
		<Button
			type="submit"
			disabled={selectedAccounts.length === 0 || askingPrice.length === 0 || isSubmitting}
			class="cursor-pointer"
		>
			{isSubmitting ? 'Creating...' : 'Create Listing'}
		</Button>
	</form>
</div>
