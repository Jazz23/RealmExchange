<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-row justify-end p-3 bg-blue-400 gap-3">
{#if data.user}
	<p class="mt-1">Logged in as <strong>{data.user.username}</strong></p>
	<Button href="/logout">Logout</Button>
{:else}
	<Button href="/login">Login</Button>
{/if}
</div>

{@render children?.()}
