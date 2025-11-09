<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<form method="POST" action="?/tryGetVerificationLink" class="mt-4" use:enhance>
	<input
		type="text"
		name="a"
		placeholder="Account Identifier"
		class="mb-2 w-full rounded-t-md border p-2"
		required
	/>
	<button type="submit" class="w-full rounded-b-md bg-blue-500 p-2 text-white"
		>Get Verification Link</button
	>
</form>

{form?.link ?? "no link yet"}