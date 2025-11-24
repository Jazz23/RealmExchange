<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
		FieldError,
	} from "$lib/components/ui/field/index.js";

	let { form } = $props();
</script>

<svelte:head>
	<title>Set Username - Realm Exchange</title>
</svelte:head>

<div class="flex items-center justify-center min-h-screen">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Choose a Username</Card.Title>
			<Card.Description>
				Welcome! Please choose a username for your account.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST">
				<FieldGroup>
					<Field>
						<FieldLabel for="username">Username</FieldLabel>
						<Input
							id="username"
							name="username"
							type="text"
							required
							placeholder="Enter your username"
						/>
						<FieldDescription>
							3-31 characters, letters, numbers, underscores, and hyphens only.
						</FieldDescription>
						{#if form?.message}
							<FieldError>{form.message}</FieldError>
						{/if}
					</Field>
					<Field>
						<Button type="submit" class="w-full cursor-pointer">
							Set Username
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</Card.Content>
	</Card.Root>
</div>