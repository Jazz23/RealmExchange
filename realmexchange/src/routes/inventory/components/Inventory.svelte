<script lang="ts">
	import Account from './Account.svelte';

	interface Data {
		data: {
			accounts: {
				name: string;
				inventory: string[];
			}[];
		};
	}

	const { data }: Data = $props();
</script>

{#each data.accounts as account}
	<Account name={account.name} inventory={account.inventory} />
{/each}
