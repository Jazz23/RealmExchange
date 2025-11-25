<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let message = $state('');
	let isSuccess = $state(false);

	onMount(async () => {
		if (data.verified) {
			message = 'Email verified successfully! You can now sign in.';
			isSuccess = true;
			setTimeout(() => goto('/logout'), 3000);
		} else if (data.error) {
			message = data.error;
			isSuccess = false;
		}
	});
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		<div class="rounded-lg border p-6 text-center">
			{#if isSuccess}
				<div class="text-green-600">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
					</svg>
					<h2 class="mt-4 text-lg font-semibold">Email Verified!</h2>
				</div>
			{:else}
				<div class="text-red-600">
					<svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
					<h2 class="mt-4 text-lg font-semibold">Verification Failed</h2>
				</div>
			{/if}
			<p class="mt-2 text-sm text-gray-600">{message}</p>
			{#if isSuccess}
				<p class="mt-4 text-sm text-gray-500">Redirecting to home page...</p>
			{:else}
				<a href="/signup" class="mt-4 inline-block text-sm text-blue-600 hover:text-blue-500">Try signing up again</a>
			{/if}
		</div>
	</div>
</div>