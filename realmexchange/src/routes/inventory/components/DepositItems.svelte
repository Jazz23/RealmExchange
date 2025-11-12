<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { accounts } from '$lib/stores';

	let link = $state('');
	let loading = $state(false);
	let name = $state('');
	let error = $state('');
</script>

{#if link == ''}
		<form
			method="POST"
			action="?/createAccount"
			use:enhance={({ formData }) => {
				loading = true;
				return async ({ result }) => {
					loading = false;

					if (result.type !== 'success') {
						error = 'Failed to create account';
						return;
					}

					// Check for server-side error
					if (result?.data?.error) {
						error = result.data.error as string;
						return;
					}

					// If account creation was successful and we have a verification link, open it in a new tab
					if (result.data?.link) {
						link = result.data.link as string;
						window.open(link, '_blank');
					}
				};
			}}
		>
			<Button type="submit" disabled={loading} class="cursor-pointer">
				{#if loading}
					<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Deposit Items
			</Button>
		</form>
	{/if}

	{#if link != '' && !name}
		<form
			method="POST"
			action="?/finishedVerifying"
			use:enhance={async () => {
				loading = true;

				return async ({ result }) => {
					loading = false;

					if (result.type !== 'success') {
						error = 'Failed to verify account';
						return;
					}

					if (result.data?.error) {
						error = result.data.error as string;
						return;
					}

					if (!result.data?.name) {
						error = 'Incomplete account data received';
						return;
					}

					name = result.data.name as string;
					accounts.update((current) => [...current, { name, inventory: [] }]);
				};
			}}
		>
			<Button type="submit" disabled={loading} class="cursor-pointer">
				{#if loading}
					<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				I'm Done Verifying
			</Button>
		</form>
	{/if}

	{#if error}
		<Alert.Root variant="destructive">
			<AlertCircleIcon />
			<Alert.Title>{error}</Alert.Title>
		</Alert.Root>
	{/if}

	{#if name}
		<p>Your account has been created!</p>
		<p>Account Name: {name}</p>
	{/if}
