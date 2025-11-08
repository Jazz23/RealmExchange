<script lang="ts">
	import { onMount } from 'svelte';
	const siteKey: string = '6LfYpC0UAAAAABI7pEgdrC8R0tX7goxU_wwSo8Ia';

	onMount(() => {
		// Load the reCAPTCHA script dynamically
		const script = document.createElement('script');
		script.src = 'https://www.google.com/recaptcha/api.js';
		script.async = true;
		script.defer = true;
		document.body.appendChild(script);
	});

	async function onSubmit(event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) {
		event.preventDefault();

		// Get the reCAPTCHA response token
		const token = (window as any).grecaptcha.getResponse();

		// Send the token to the server via the default form action
		const result = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: token
		});
	}
</script>

<form method="POST" on:submit={onSubmit}>
	<!-- Your form fields here -->
	<div class="g-recaptcha" data-sitekey={siteKey}></div>
	<button type="submit">Submit</button>
</form>
