<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import type { ComponentProps } from "svelte";

	let { ...restProps }: ComponentProps<typeof Card.Root> = $props();
</script>

<Card.Root {...restProps}>
	<Card.Header>
		<Card.Title>Create an account</Card.Title>
		<Card.Description>Enter your information below to create your account</Card.Description>
	</Card.Header>
	<Card.Content>
		<Field.Group>
			<Field.Field>
				<Field.Label for="username">Username</Field.Label>
				<Input id="username" name="username" type="text" required />
			</Field.Field>
			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input id="email" name="email" type="email" required />
				<Field.Description>We'll send you a verification email.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label for="password">Password</Field.Label>
				<Input id="password" name="password" type="password" required />
				<Field.Description>Must be at least 6 characters long.</Field.Description>
			</Field.Field>
			<Field.Group>
				<Field.Field>
					<Button type="submit" class="cursor-pointer">Create Account</Button>
					<Field.Description class="px-6 text-center">
						Already have an account? <a href="/login">Sign in</a>
					</Field.Description>
				</Field.Field>
			</Field.Group>
		</Field.Group>
	</Card.Content>
</Card.Root>
