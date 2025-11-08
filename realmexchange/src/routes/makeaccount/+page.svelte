<script lang="ts">
	import { onMount } from 'svelte';
	const siteKey: string = '6LfYpC0UAAAAABI7pEgdrC8R0tX7goxU_wwSo8Ia';
	let success: boolean = false;

	onMount(() => {
		(window as any).onCaptchaSuccess = async (token: string) => {
			// Send the token to the server via the default action
			const result = await fetch('', {
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
