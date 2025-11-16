<script lang="ts">
	let {
		items = $bindable([]),
		value = $bindable(''),
		placeholder = 'Search for items...',
		onSelect,
		loading = false,
		maxResults = 50
	}: {
		items: string[];
		value?: string;
		placeholder?: string;
		onSelect?: (item: string) => void;
		loading?: boolean;
		maxResults?: number;
	} = $props();

	let showDropdown = $state(false);
	let filteredItems = $state<string[]>([]);

	function filterItems() {
		if (value.length > 0) {
			filteredItems = items
				.filter((item) => item.toLowerCase().includes(value.toLowerCase()))
				.slice(0, maxResults);
		} else {
			filteredItems = items.slice(0, maxResults);
		}
	}

	function selectItem(item: string) {
		value = item;
		showDropdown = false;
		onSelect?.(item);
	}

	$effect(() => {
		if (items.length > 0 || !loading) {
			filterItems();
		}
	});
</script>

<div class="relative">
	<input
		type="text"
		bind:value
		onfocus={() => (showDropdown = true)}
		onblur={() => setTimeout(() => (showDropdown = false), 150)}
		{placeholder}
		class="w-full rounded-lg border-2 border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
	/>

	{#if showDropdown}
		<div
			class="absolute z-10 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-gray-300 bg-white shadow-lg"
		>
			{#if loading}
				<div class="p-4 text-center text-gray-500">
					Loading items...
				</div>
			{:else if filteredItems.length > 0}
				{#each filteredItems as item}
					<button
						type="button"
						class="cursor-pointer w-full p-2 text-left hover:bg-gray-100"
						onclick={() => selectItem(item)}
					>
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