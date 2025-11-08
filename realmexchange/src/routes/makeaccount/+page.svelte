<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	const siteKey: string = '6LfYpC0UAAAAABI7pEgdrC8R0tX7goxU_wwSo8Ia';
	let success: boolean = $state(false);
	let { form }: PageProps = $props();

	onMount(() => {
		(window as any).onCaptchaSuccess = async (token: string) => {
			// Send the token to the server via the default action
			const result = await fetch('?/storeToken', {
				method: 'POST',
				body: token
			});

			if (result.ok) {
				success = true;
			} else {
				success = false;
			}
		};

		// Load the reCAPTCHA script dynamically
		const script = document.createElement('script');
		script.src = 'https://www.google.com/recaptcha/api.js';
		script.async = true;
		script.defer = true;
		document.body.appendChild(script);
	});
</script>

<div class="g-recaptcha" data-sitekey={siteKey} data-callback="onCaptchaSuccess"></div>

{success}

<form method="POST" action="?/verifyAccount" class="mt-4" use:enhance>
	<input type="text" name="a" placeholder="Account Identifier" class="border p-2 rounded-t-md w-full mb-2" required />
	<button type="submit" class="bg-blue-500 text-white p-2 rounded-b-md w-full">Verify Account</button>
</form>

{form?.success}