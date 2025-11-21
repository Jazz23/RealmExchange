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
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm">
		{#if form?.success}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-2xl text-green-600">Check your email</Card.Title>
					<Card.Description>
						If an account with that email exists, we've sent you a password reset link.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<FieldDescription class="text-center">
						<a href="/login" class="text-blue-600 hover:text-blue-500">Back to login</a>
					</FieldDescription>
				</Card.Content>
			</Card.Root>
		{:else}
			<form method="post" action="?/reset" use:enhance>
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-2xl">Forgot Password</Card.Title>
						<Card.Description>
							Enter your email address and we'll send you a link to reset your password.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<FieldGroup>
							<Field>
								<FieldLabel for="email">Email</FieldLabel>
								<Input id="email" name="email" type="email" required />
							</Field>
							<Field>
								<Button type="submit" class="w-full cursor-pointer">Send Reset Link</Button>
								<FieldDescription class="text-center">
									<a href="/login" class="text-blue-600 hover:text-blue-500">Back to login</a>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</Card.Content>
				</Card.Root>
			</form>
			{#if form?.message}
				<p class="mt-4 text-center text-red-500">{form.message}</p>
			{/if}
		{/if}
	</div>
</div>