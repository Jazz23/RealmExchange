<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";

	let { form }: PageProps = $props();
	let loading = false;

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

<form method="POST" action="?/createAccount" class="mt-4" use:enhance>
	<Button type="submit" class=""
		>Create Account</Button>
</form>

{#if form?.link}
<a href={form?.link}>{form?.link}</a>
<Button onclick={finishedVerifying} disabled={loading}>Done Verifying</Button>
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