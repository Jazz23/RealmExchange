<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { MoveUpRight, RefreshCw } from '@lucide/svelte';

	let { name, inventory, seasonal }: { name: string; inventory: string[], seasonal: boolean } = $props();
	let command = $state('');

	// Base64 encode the access token
	function generateCommand(accessToken: string, timestamp: string): string {
		return `start "" /D "C:\\RealmOfTheMadGod\\Production" "C:\\RealmOfTheMadGod\\Production\\RotMG Exalt.exe" data:{platform:Deca,guid:,token:${btoa(accessToken)},tokenTimestamp:${btoa(timestamp)},tokenExpiration:ODY0MDA=,env:4,serverName:}`;
	}
</script>

<div class="mb-8">
	<div class="flex flex-row gap-2">
		<h3 class="mb-4 text-2xl font-bold">{name}, {seasonal ? "Seasonal" : "Not Seasonal"}</h3>
		<form
			method="POST"
			action="?/loginAccount"
			use:enhance={async () => {
				return async ({ result }) => {
					if (result.type !== 'success') {
						alert('Failed to login to account');
						return;
					}

					// Check for server-side error
					if (result?.data?.error) {
						alert(result.data.error as string);
						return;
					}

					// If login was successful and we have an access token, set it
					if (result.data?.accessToken && result.data?.timestamp) {
						command = generateCommand(result.data.accessToken as string, result.data.timestamp as string);
					}
				};
			}}
		>
			<input type="hidden" name="name" value={name} />
			<Button type="submit" class="cursor-pointer">
				Login <MoveUpRight />
			</Button>
		</form>

				<form
			method="POST"
			action="?/refreshInventory"
			use:enhance={async () => {
				return async ({ result }) => {
					if (result.type !== 'success') {
						alert('Failed to login to account');
						return;
					}

					// Check for server-side error
					if (result?.data?.error) {
						alert(result.data.error as string);
						return;
					}

					// If login was successful and we have an access token, set it
					if (result.data?.inventory && result.data?.seasonal) {
						inventory = result.data.inventory as string[];
						seasonal = result.data.seasonal as boolean;
					}
				};
			}}
		>
			<input type="hidden" name="name" value={name} />
			<Button type="submit" class="cursor-pointer">
				Refresh <RefreshCw />
			</Button>
		</form>
	</div>
	{#if inventory.length > 0}
		<p>{inventory.join(', ')}</p>
	{/if}
</div>

<!--Overlay for when accessToken is not null -->

{#if command != ''}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<h2 class="mb-4 text-center text-xl font-bold">CMD Command</h2>
			<p class="mb-4 break-all">{command}</p>
			<!--Copy text button-->
			<Button
				class="text-center"
				onclick={() => {
					navigator.clipboard.writeText(command);
					command = '';
				}}
			>
				Copy
			</Button>
		</div>
	</div>
{/if}
