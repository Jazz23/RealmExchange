<script lang="ts">
	let {
		value = $bindable(''),
		placeholder = 'Search...',
		label,
		showCount = false,
		totalCount = 0,
		filteredCount = 0
	}: {
		value?: string;
		placeholder?: string;
		label?: string;
		showCount?: boolean;
		totalCount?: number;
		filteredCount?: number;
	} = $props();
</script>

<div class="mb-6">
	{#if label}
		<label for="search-input" class="block text-sm font-medium text-gray-700 mb-2">
			{label}
		</label>
	{/if}
	<input
		id="search-input"
		type="text"
		bind:value
		{placeholder}
		class="w-full max-w-md rounded-lg border-2 border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
	/>
	{#if showCount && value.trim()}
		<p class="mt-1 text-sm text-gray-600">
			Showing {filteredCount} of {totalCount} items
		</p>
	{/if}
</div>