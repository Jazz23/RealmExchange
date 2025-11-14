<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button/button.svelte';
	import Account from './inventory/components/Account.svelte';

	let { data } = $props();
	let selectedListing = $state<any>(null);
	let selectedOfferAccounts = $state<string[]>([]);
	let userAccounts = $state<any[]>([]);
	let showOfferModal = $state(false);

	// Load user's accounts for making offers
	async function loadUserAccounts() {
		if (!data.user) return;
		const response = await fetch('/inventory/accounts.json');
		if (response.ok) {
			userAccounts = await response.json();
		}
	}

	function openOfferModal(listing: any) {
		selectedListing = listing;
		showOfferModal = true;
		selectedOfferAccounts = [];
	}

	function toggleOfferAccount(guid: string) {
		if (selectedOfferAccounts.includes(guid)) {
			selectedOfferAccounts = selectedOfferAccounts.filter((g) => g !== guid);
		} else {
			selectedOfferAccounts = [...selectedOfferAccounts, guid];
		}
	}
</script>

<div class="m-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Marketplace</h1>
		{#if data.user}
			<a href="/trade">
				<Button>Create Listing</Button>
			</a>
		{/if}
	</div>

	{#if data.listings.length === 0}
		<p class="text-gray-600">No active listings available.</p>
	{:else}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			{#each data.listings as listing}
				<div class="rounded-lg border-2 border-gray-300 p-6">
					<div class="mb-4">
						<h2 class="text-xl font-bold">Listed by: {listing.sellerUsername}</h2>
						<p class="text-sm text-gray-600">
							Created: {new Date(listing.createdAt).toLocaleDateString()}
						</p>
					</div>

					<div class="mb-4">
						<h3 class="mb-2 font-bold">Accounts for Sale:</h3>
						{#each listing.accounts as account}
							<div class="mb-2">
								<Account
									name={account.name}
									inventory={account.inventory}
									seasonal={account.seasonal}
									mode="compact"
								/>
							</div>
						{/each}
					</div>

					<div class="mb-4">
						<h3 class="mb-2 font-bold">Asking Price:</h3>
						<div class="flex flex-wrap gap-2">
							{#each listing.askingPriceItems as item}
								<span class="rounded bg-blue-100 px-2 py-1 text-sm">
									{item.name}{item.quantity > 1 ? ` (x${item.quantity})` : ''}
								</span>
							{/each}
						</div>
					</div>

					{#if data.user && data.user.id !== listing.sellerId}
						<div class="flex gap-2">
							<form
								method="POST"
								action="?/acceptTrade"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											if (result.data?.error) {
												alert(result.data.error as string);
											} else {
												alert('Trade accepted successfully!');
												window.location.reload();
											}
										}
									};
								}}
							>
								<input type="hidden" name="listingId" value={listing.id} />
								<Button type="submit" class="cursor-pointer">Accept (No Counter)</Button>
							</form>

							<Button onclick={() => openOfferModal(listing)} class="cursor-pointer"
								>Make Counter Offer</Button
							>
						</div>
					{:else if data.user && data.user.id === listing.sellerId}
						<form
							method="POST"
							action="?/cancelListing"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										if (result.data?.error) {
											alert(result.data.error as string);
										} else {
											alert('Listing cancelled successfully!');
											window.location.reload();
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
			{/each}
		</div>
	{/if}
</div>

<!-- Counter Offer Modal -->
{#if showOfferModal && selectedListing}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
			<h2 class="mb-4 text-2xl font-bold">Make Counter Offer</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Listing Details:</h3>
				<p class="text-sm text-gray-600">Seller: {selectedListing.sellerUsername}</p>
				<p class="text-sm text-gray-600">
					Accounts: {selectedListing.accounts.map((a: any) => a.name).join(', ')}
				</p>
			</div>

			<div class="mb-4">
				<h3 class="mb-2 font-bold">Select Your Accounts to Offer:</h3>
				<p class="mb-2 text-sm text-gray-600">Note: You need to load your accounts first</p>
				<a href="/inventory" class="text-blue-500 hover:underline">Go to Inventory</a>
			</div>

			<div class="flex gap-2">
				<Button onclick={() => (showOfferModal = false)} variant="outline">Cancel</Button>
				<form
					method="POST"
					action="?/makeOffer"
					use:enhance={() => {
						showOfferModal = false;
						return async ({ result }) => {
							if (result.type === 'success') {
								if (result.data?.error) {
									alert(result.data.error as string);
								} else {
									alert(
										'Offer submitted! (Note: This is a simplified version. In a full implementation, the seller would review your offer.)'
									);
								}
							}
						};
					}}
				>
					<input type="hidden" name="listingId" value={selectedListing.id} />
					<input
						type="hidden"
						name="offerAccountGuids"
						value={JSON.stringify(selectedOfferAccounts)}
					/>
					<Button type="submit" disabled={selectedOfferAccounts.length === 0}>Submit Offer</Button>
				</form>
			</div>
		</div>
	</div>
{/if}
