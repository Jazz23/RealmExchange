<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-row justify-end p-3 bg-blue-400">
{#if data.user}
	<p class="">Logged in as <strong>{data.user.username}</strong></p>
	<a class="ml-4" href="/logout">Logout</a>
{:else}
	<a href="/login">Login</a>
{/if}
</div>

{@render children?.()}
