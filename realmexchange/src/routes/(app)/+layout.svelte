<script lang="ts">
	import '../../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import { Github, MessageCircle } from '@lucide/svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="border-b flex justify-between items-center p-2">
	<div class="flex items-center">
		<a href="/" class="flex items-center">
			<img src={favicon} alt="Realm Exchange" class="h-8 w-8 mr-2" />
			<span class="text-lg font-bold">Realm Exchange</span>
		</a>
		<a 
			href="https://github.com/Jazz23/RealmExchange" 
			target="_blank" 
			rel="noopener noreferrer"
			class="ml-3 p-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
			aria-label="View source on GitHub"
		>
			<Github size={16} />
			<span class="text-sm font-medium">GitHub</span>
		</a>
		<a 
			href="https://discord.gg/8dDSrHpWmP" 
			target="_blank" 
			rel="noopener noreferrer"
			class="ml-2 p-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1"
			aria-label="Join our Discord"
		>
			<MessageCircle size={16} />
			<span class="text-sm font-medium">Discord</span>
		</a>
	</div>
	<NavigationMenu.Root>
		<NavigationMenu.List class="flex items-center space-x-6">
			{#if data.user}
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/" class="px-3 py-2 text-sm font-medium hover:text-primary">
						Marketplace
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href="/inventory"
						class="px-3 py-2 text-sm font-medium hover:text-primary"
					>
						Inventory
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<NavigationMenu.Item>
					<NavigationMenu.Link
						href="/trade"
						class="px-3 py-2 text-sm font-medium hover:text-primary"
					>
						Trade
					</NavigationMenu.Link>
				</NavigationMenu.Item>

				<div class="flex items-center space-x-4 border-l pl-6">
					<span class="text-sm text-muted-foreground">
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
