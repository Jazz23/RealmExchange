<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
	let loading = false;

	function formEnhance() {
		loading = true;
		return async () => {
			loading = false;
		}
	}
</script>

<form method="POST" action="?/createAccount" class="mt-4" use:enhance={formEnhance}>
	<button type="submit" class="w-full rounded-b-md bg-blue-500 p-2 text-white"
		>Create Account</button
	>
</form>

{#if form?.error}
	<p class="mt-4 text-red-500">{form.error}</p>
{/if}

<a href={form?.link}>{form?.link ?? "no link yet"}</a>