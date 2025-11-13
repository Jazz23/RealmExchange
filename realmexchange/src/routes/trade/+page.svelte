<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let selectedAccounts = $state<string[]>([]);
	let askingPrice = $state<string[]>([]);
	let itemSearch = $state('');
	let items = $state<string[]>([]);
	let filteredItems = $state<string[]>([]);
	let showItemSelector = $state(false);
	let isSubmitting = $state(false);

	// Load items from static JSON
	async function loadItems() {
		const response = await fetch('/items.json');
		const data = await response.json();
		items = data.items;
		filteredItems = items.slice(0, 50); // Show first 50 items initially
	}

	loadItems();

	function toggleAccount(guid: string) {
		if (selectedAccounts.includes(guid)) {
			selectedAccounts = selectedAccounts.filter((g) => g !== guid);
		} else {
			selectedAccounts = [...selectedAccounts, guid];
		}
	}

	function addItem(item: string) {
		if (!askingPrice.includes(item)) {
			askingPrice = [...askingPrice, item];
		}
		itemSearch = '';
		showItemSelector = false;
		filteredItems = items.slice(0, 50);
	}

	function removeItem(item: string) {
		askingPrice = askingPrice.filter((i) => i !== item);
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
		filterItems();
	});
</script>

<div class="m-10">
	<h1 class="mb-6 text-3xl font-bold">Create Trade Listing</h1>

	<div class="mb-8">
		<h2 class="mb-4 text-2xl font-bold">Select Accounts to Sell</h2>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.accounts as account}
				<div
					class="cursor-pointer rounded-lg border-2 p-4 transition-colors {selectedAccounts.includes(
						account.guid
					)
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300'}"
					onclick={() => toggleAccount(account.guid)}
				>
					<h3 class="mb-2 font-bold">{account.name}</h3>
					<p class="text-sm text-gray-600">{account.seasonal ? 'Seasonal' : 'Not Seasonal'}</p>
					<p class="text-sm text-gray-600">Items: {account.inventory.length}</p>
					{#if account.inventory.length > 0}
						<p class="mt-2 text-xs text-gray-500">
							{account.inventory.slice(0, 5).join(', ')}{account.inventory.length > 5 ? '...' : ''}
						</p>
					{/if}
				</div>
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
				{#if showItemSelector && filteredItems.length > 0}
					<div
						class="absolute z-10 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-gray-300 bg-white shadow-lg"
					>
						{#each filteredItems as item}
							<div class="cursor-pointer p-2 hover:bg-gray-100" onclick={() => addItem(item)}>
								{item}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each askingPrice as item}
				<div class="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1">
					<span>{item}</span>
					<button class="text-red-500 hover:text-red-700" onclick={() => removeItem(item)}>
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
						alert(result.data.error as string);
					} else {
						alert('Listing created successfully!');
						goto('/');
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
