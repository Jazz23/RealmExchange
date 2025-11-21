<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import { Github, MessageCircle, ChevronDown, Settings, LogOut } from '@lucide/svelte';

	let { children, data } = $props();
	let showUserMenu = $state(false);

	function closeUserMenu() {
		showUserMenu = false;
	}

	// Close dropdown when clicking outside
	$effect(() => {
		if (showUserMenu) {
			const handleClick = (event: MouseEvent) => {
				const target = event.target as HTMLElement;
				if (!target.closest('.user-menu-container')) {
					closeUserMenu();
				}
			};
			document.addEventListener('click', handleClick);
			return () => document.removeEventListener('click', handleClick);
		}
	});
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

				<div class="flex items-center space-x-4 border-l pl-6 relative user-menu-container">
					<button
						class="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						onclick={() => showUserMenu = !showUserMenu}
					>
						<span>Logged in as <strong>{data.user.username}</strong></span>
						<ChevronDown size={16} class={showUserMenu ? 'rotate-180' : ''} />
					</button>

					{#if showUserMenu}
						<div class="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
							<a
								href="/account-settings"
								class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
								onclick={() => showUserMenu = false}
							>
								<Settings size={16} class="mr-2" />
								Account Settings
							</a>
							<a
								href="/logout"
								class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
								onclick={() => showUserMenu = false}
							>
								<LogOut size={16} class="mr-2" />
								Logout
							</a>
						</div>
					{/if}
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
