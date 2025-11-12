<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import { MoveUpRight } from '@lucide/svelte';

	/*start "" /D "C:\RealmOfTheMadGod\Production" "C:\RealmOfTheMadGod\Production\RotMG Exalt.exe" data:{platform:Deca,guid:,token:UktOSkZVekRHbDVBaXVrUWs2cVRadGJVQ2dDbmtDRHpodFZFVVZ0aXkyZkRkdzVYM3FHaXVxOStpSUFmWWhUWlBkVGhzTzcyMUR6OHRkRzBmYWZ5bG9Dc2dMbWpsQjNqa1JXL3ZEQlJ5SGEvaitoTGxOMkE0UHNhY1NJYXdqQURldTRyT2RlTFg2UTVMMUJuNVV6VDYyWDRNZ3cxZzdOSWFLRmJiVC9xOExnSUFVRVNOdmZZNUFtQWkrcVQvNWhvQUdCK2RSaGJvdVRZVDZMbVhNK0FKOHJzMVJhTHVrMXVMK0FSUWpnTGR6UlBEeW91cE9DOHVtYnlVa21BTEhoeUdibXdoeTdZUFRQTVJVMWlDcHczWngrbXo5UTg3enZFbUFSb25LbUdaNlA4eTJNUkQ3S3RtSlNkU1VmRzNxNndyRUd1dFVFc2VQU3Y1Q2FsbGV3QU1BPT0=,tokenExpiration:ODY0MDA=,env:4,h:realmexchange},p:2050*/
	const { name, inventory }: { name: string; inventory: string[] } = $props();
	let command = $state('');

	// Base64 encode the access token
	function generateCommand(accessToken: string, timestamp: string): string {
		return `start "" /D "C:\\RealmOfTheMadGod\\Production" "C:\\RealmOfTheMadGod\\Production\\RotMG Exalt.exe" data:{platform:Deca,guid:,token:${btoa(accessToken)},tokenTimestamp:${btoa(timestamp)},tokenExpiration:ODY0MDA=,env:4,h:realmexchange},p:2050`;
	}
</script>

<div class="mb-8">
	<div class="flex flex-row gap-2">
		<h3 class="mb-4 text-2xl font-bold">{name}</h3>
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
