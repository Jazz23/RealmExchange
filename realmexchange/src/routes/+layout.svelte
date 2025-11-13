<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="border-b">
	<NavigationMenu.Root class="ml-auto mr-3 p-2">
		<NavigationMenu.List class="ml-auto flex items-center space-x-6">
			{#if data.user}
				<NavigationMenu.Item>
					<NavigationMenu.Link
						href="/"
						class="hover:text-primary px-3 py-2 text-sm font-medium"
					>
						Marketplace
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href="/inventory"
						class="hover:text-primary px-3 py-2 text-sm font-medium"
					>
						Inventory
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href="/trade"
						class="hover:text-primary px-3 py-2 text-sm font-medium"
					>
						Trade
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<div class="flex items-center space-x-4 border-l pl-6">
					<span class="text-muted-foreground text-sm">
						Logged in as <strong>{data.user.username}</strong>
					</span>
					<Button href="/logout" variant="outline" size="sm">Logout</Button>
				</div>
			{:else}
				<div class="">
					<Button href="/login" size="sm">Login</Button>
				</div>
			{/if}
		</NavigationMenu.List>
	</NavigationMenu.Root>
</header>

{@render children?.()}
