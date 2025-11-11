<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import Loader2Icon from "@lucide/svelte/icons/loader-2";

	let { form }: PageProps = $props();
	let loading = $state(false);

	let name = $state("");
	let inv = $state("");
	let error = $state("");

	async function finishedVerifying() {
		loading = true;
		const response = await fetch('?/finishedVerifying', {
			method: 'POST'
		}).then(res => res.json()) as any;
		loading = false;
		if (response.error) {
			error = response.error;
			return;
		}

		name = response.name;
		inv = JSON.stringify(response.inv);
	}
</script>

<form method="POST" action="?/createAccount" class="mt-4" use:enhance={({ formData }) => {
	loading = true;
	return async ({ update, result }) => {
		loading = false;
		await update({ reset: false });
		
		// If account creation was successful and we have a verification link, open it in a new tab
		if (result.type === 'success' && result.data?.link) {
			window.open(result.data.link as string, '_blank');
		}
	};
}}>
	<Button type="submit" class="m-0" disabled={loading}>
		{#if loading}
			<Loader2Icon class="animate-spin mr-2 h-4 w-4" />
		{/if}
		Create Account
	</Button>
</form>

{#if form?.link}
<p class="text-sm text-muted-foreground mb-2">Verification link opened in new tab</p>
<Button onclick={finishedVerifying} disabled={loading}>
	{#if loading}
		<Loader2Icon class="animate-spin mr-2 h-4 w-4" />
	{/if}
	Done Verifying
</Button>
{/if}

{#if error || form?.error}
<Alert.Root variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>{error == "" ? form?.error : error}</Alert.Title>
  </Alert.Root>
{/if}

{#if name && inv}
	<p>Your account has been created!</p>
	<p>Account Name: {name}</p>
	<p>Inventory Data: {inv}</p>
{/if}