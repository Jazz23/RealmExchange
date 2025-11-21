<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import LoginForm from "$lib/components/login-form.svelte";
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// Get success message from URL
	let urlMessage = $derived($page.url.searchParams.get('message'));
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<form method="post" action="?/login" use:enhance>
			<LoginForm />
		</form>
		{#if urlMessage}
			<div class="mt-4 rounded-lg border bg-green-50 p-4 text-center text-green-800 dark:bg-green-900 dark:text-green-200">
				{urlMessage}
			</div>
		{:else if form?.message}
			<p class="mt-4 text-center text-red-500">{form.message}</p>
		{/if}
	</div>
</div>
