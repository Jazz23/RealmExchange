<script lang="ts">
	import DepositItems from './components/DepositItems.svelte';
	import Inventory from './components/Inventory.svelte';
	import Setup from './components/Setup.svelte';
	import { accounts } from '$lib/stores';
	import { onMount } from 'svelte';

	let { data } = $props();
	let doneSettingHWID = $state(!data.needsHWID);

	onMount(() => {
		// Set accounts from server data
		accounts.set(data.accounts);
	});

	// Aggregate all items from all accounts
	let allItems = $derived.by(() => {
		const itemData: Record<string, { count: number; isSeasonal: boolean }> = {};
		
		if (data.accounts && Array.isArray(data.accounts)) {
			for (const account of data.accounts) {
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
	});
</script>

<div class="m-10"></div>
<div class="flex flex-col items-center">
	{#if !doneSettingHWID}
		<Setup bind:doneSettingHWID />
	{:else}
		<DepositItems />
	{/if}
</div>

{#if allItems.length > 0}
	<hr class="mb-10 mt-10" />
	<div class="m-10">
		<div class="mb-6">
			<h2 class="text-2xl font-bold mb-4">All Items in Inventory</h2>
			<div class="flex flex-wrap gap-2">
				{#each allItems as item}
					<span class="rounded bg-green-100 px-2 py-1 text-sm">
						{item.display} ({item.isSeasonal ? 'Seasonal' : 'Not Seasonal'})
					</span>
				{/each}
			</div>
		</div>
	</div>
{/if}

<hr class="mb-10 mt-10" />
<div class="m-10"><Inventory /></div>
