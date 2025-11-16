<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import Account from '../../routes/(app)/inventory/components/Account.svelte';
	import { alertStore } from '$lib/stores';
	import { invalidateAll } from '$app/navigation';

	let {
		listing,
		currentUserId,
		showAccountsAsComponents = false,
		showAllItems = false,
		getAllListingItems,
		onAccept,
		onMakeOffer
	}: {
		listing: any;
		currentUserId?: string;
		showAccountsAsComponents?: boolean;
		showAllItems?: boolean;
		getAllListingItems?: (listing: any) => any[];
		onAccept?: (listing: any) => void;
		onMakeOffer?: (listing: any) => void;
	} = $props();
</script>

<div class="rounded-lg border-2 border-gray-300 p-6">
	<div class="mb-4">
		{#if listing.sellerUsername}
			<h2 class="text-xl font-bold">Listed by: {listing.sellerUsername}</h2>
		{/if}
		<p class="text-sm text-gray-600">
			Created: {new Date(listing.createdAt).toLocaleDateString()}
		</p>
	</div>

	{#if showAccountsAsComponents}
		<div class="mb-4">
			<span class="font-semibold">Accounts:</span>
			<div class="flex flex-wrap gap-2 mt-1">
				{#each listing.accounts as account}
					<Account
						name={account.name}
						inventory={account.inventory}
						seasonal={account.seasonal}
						mode="compact"
					/>
				{/each}
			</div>
		</div>
	{:else if showAllItems && getAllListingItems}
		<div class="mb-4">
			<h3 class="mb-2 font-bold">All Items in Listing:</h3>
			<div class="flex flex-wrap gap-2">
				{#each getAllListingItems(listing) as item}
					<span class="rounded bg-green-100 px-2 py-1 text-sm">
						{item.display} ({item.isSeasonal ? 'Seasonal' : 'Not Seasonal'})
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mb-4">
		<h3 class="mb-2 font-bold">Asking Price:</h3>
		<div class="flex flex-wrap gap-2">
			{#each listing.askingPriceItems as item}
				<span class="rounded bg-blue-100 px-2 py-1 text-sm">
					{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''} ({item.seasonal ? 'Seasonal' : 'Not Seasonal'})
				</span>
			{/each}
		</div>
	</div>

	{#if currentUserId && currentUserId !== listing.sellerId}
		<div class="flex gap-2">
			{#if onAccept}
				<Button onclick={() => onAccept(listing)} class="cursor-pointer">Accept</Button>
			{/if}
			{#if onMakeOffer}
				<Button onclick={() => onMakeOffer(listing)} class="cursor-pointer">Make Counter Offer</Button>
			{/if}
		</div>
	{:else if currentUserId && currentUserId === listing.sellerId}
		<form
			method="POST"
			action="?/cancelListing"
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						if (result.data?.error) {
							alertStore.show(result.data.error as string, 'error');
						} else {
							alertStore.show('Listing cancelled successfully!');
							await invalidateAll();
						}
					}
				};
			}}
		>
			<input type="hidden" name="listingId" value={listing.id} />
			<Button type="submit" variant="outline" class="cursor-pointer">Cancel Listing</Button>
		</form>
	{/if}
</div>