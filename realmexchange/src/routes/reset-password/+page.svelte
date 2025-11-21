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
	<div class="w-full max-w-sm">
		{#if data.validToken}
			<form method="post" action="?/reset" use:enhance>
				<!-- Hidden field to pass the token -->
				<input type="hidden" name="token" value={data.token || ''} />
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-2xl">Reset Password</Card.Title>
						<Card.Description>
							Enter your new password below.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<FieldGroup>
							<Field>
								<FieldLabel for="password">New Password</FieldLabel>
								<Input id="password" name="password" type="password" />
								<FieldDescription>Must be at least 6 characters long.</FieldDescription>
							</Field>
							<Field>
								<FieldLabel for="confirmPassword">Confirm Password</FieldLabel>
								<Input id="confirmPassword" name="confirmPassword" type="password" />
							</Field>
							<Field>
								<Button type="submit" class="w-full cursor-pointer" disabled={false}>Reset Password</Button>
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
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-2xl text-red-600">Invalid Reset Link</Card.Title>
					<Card.Description>
						This password reset link is invalid or has expired.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<FieldDescription class="text-center">
						<a href="/forgot-password" class="text-blue-600 hover:text-blue-500">Request a new reset link</a>
					</FieldDescription>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>