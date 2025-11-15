<script lang="ts">
	import { enhance } from '$app/forms';
	import LoginForm from "$lib/components/login-form.svelte";
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<form method="post" action="?/login" use:enhance>
			<LoginForm />
		</form>
		{#if form?.message}
			<p class="mt-4 text-center text-red-500">{form.message}</p>
		{/if}
	</div>
</div>
