<script lang="ts">
	import Account from './Account.svelte';
	import { accounts } from '$lib/stores';

	let { installPath }: { installPath?: string} = $props();
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each $accounts as account}
		<Account
			name={account.name}
			inventory={account.inventory}
			seasonal={account.seasonal}
			isLocked={account.isLocked}
			installPath={installPath}
		/>
	{/each}
</div>

{#if $accounts.length === 0}
	<p class="text-gray-600 col-span-full text-center py-8">
		No accounts available. Add an account using the form above.
	</p>
{/if}
