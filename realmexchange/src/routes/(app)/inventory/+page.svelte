<script lang="ts">
	import DepositItems from './components/DepositItems.svelte';
	import Inventory from './components/Inventory.svelte';
	import Setup from './components/Setup.svelte';
	import { accounts } from '$lib/stores';
	import { onMount } from 'svelte';

	let { data } = $props();
	let doneSettingHWID = $state(!data.needsHWID);

	onMount(() => {
		// If accounts store is empty (not loaded from localStorage), set from server data
		if ($accounts.length === 0) {
			accounts.set(data.accounts);
		}
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

<hr class="mb-10 mt-10" />
<div class="m-10"><Inventory /></div>
