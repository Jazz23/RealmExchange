<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
	} from "$lib/components/ui/field/index.js";
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-md">
		<form method="post" action="?/update" use:enhance>
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-2xl">Account Settings</Card.Title>
					<Card.Description>
						Configure your account preferences
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<FieldGroup>
						<Field>
							<FieldLabel for="username">Username</FieldLabel>
							<Input id="username" name="username" type="text" value={data.user.username} readonly />
							<FieldDescription>Username cannot be changed</FieldDescription>
						</Field>

						<Field>
							<FieldLabel for="email">Email</FieldLabel>
							<Input id="email" name="email" type="email" value={data.user.email || ''} readonly />
							<FieldDescription>Email address (verified: {data.user.emailVerified ? 'Yes' : 'No'})</FieldDescription>
						</Field>

						<Field>
							<label class="flex items-center space-x-2">
								<input
									type="checkbox"
									name="emailNotifications"
									checked={data.user.emailNotifications}
									class="rounded border-gray-300"
								/>
								<span class="text-sm">Email notifications for item sales</span>
							</label>
							<FieldDescription>
								Receive email notifications when your items are sold
							</FieldDescription>
						</Field>

						<Field>
							<Button type="submit" class="w-full cursor-pointer">Save Settings</Button>
							<FieldDescription class="text-center">
								<a href="/">Back to marketplace</a>
							</FieldDescription>
						</Field>
					</FieldGroup>
				</Card.Content>
			</Card.Root>
		</form>

		{#if form?.success}
			<div class="mt-4 rounded-lg border bg-green-50 p-4 text-center text-green-800 dark:bg-green-900 dark:text-green-200">
				Settings saved successfully!
			</div>
		{:else if form?.message}
			<p class="mt-4 text-center text-red-500">{form.message}</p>
		{/if}
	</div>
</div>