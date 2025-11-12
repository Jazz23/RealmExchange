<script lang="ts">
	import Account from './Account.svelte';
	import { accounts } from '$lib/stores';
</script>

{#each $accounts as account}
	<Account name={account.name} inventory={account.inventory} />
{/each}
