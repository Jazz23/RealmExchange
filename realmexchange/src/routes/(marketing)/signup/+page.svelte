<script lang="ts">
	import { enhance } from '$app/forms';
	import SignupForm from "$lib/components/signup-form.svelte";
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<form method="post" action="?/register" use:enhance>
			<SignupForm />
		</form>
		{#if form?.message}
			<p class="mt-4 text-center text-red-500">{form.message}</p>
		{/if}
	</div>
</div>
