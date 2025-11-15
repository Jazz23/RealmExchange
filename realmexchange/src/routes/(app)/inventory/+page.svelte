<script lang="ts">
	import { accounts } from '$lib/stores';
	import DepositItems from './components/DepositItems.svelte';
	import Inventory from './components/Inventory.svelte';
	import { onMount } from 'svelte';
	import Setup from './components/Setup.svelte';

	let { data } = $props();
	let doneSettingHWID = $state(!data.needsHWID);
	// Set the store with initial data
	$accounts = data.accounts;
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
