<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	let showHWIDSetup = $state(false);
	let hwidInput = $state('');
	let { doneSettingHWID = $bindable(false) } = $props();
    let copied = $state(false);
	const hwidCommand = `powershell -NoLogo -NoProfile -Command "$bb=(Get-CimInstance Win32_BaseBoard).SerialNumber; $bios=(Get-CimInstance Win32_BIOS).SerialNumber; $os=(Get-CimInstance Win32_OperatingSystem).SerialNumber; $concat=\\"$bb$bios$os\\"; $sha1=[System.Security.Cryptography.SHA1]::Create(); $bytes=[System.Text.Encoding]::UTF8.GetBytes($concat); $hash=$sha1.ComputeHash($bytes); ($hash | ForEach-Object { '{0:x2}' -f $_ }) -join ''"`;


	// On hwidInput change, we can close the setup modal. Regex test it with ^[a-f0-9]{40}$
	$effect(() => {
		if (/^[a-f0-9]{40}$/.test(hwidInput)) {
			showHWIDSetup = false;
			const formData = new FormData();
			formData.append('hwid', hwidInput);

			fetch('?/submitHWID', {
				method: 'POST',
				body: formData
			});

			doneSettingHWID = true;
		}
	});
</script>

<Button onclick={() => (showHWIDSetup = true)}>Setup</Button>

{#if showHWIDSetup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<p class="mb-4 text-center text-xl font-bold">
				Run this CMD command and paste the output here:
			</p>
			<input
				type="text"
				class="mb-4 w-full border p-2"
				placeholder="425e04f3b2c22fa7fa998f02b85f3e73e4d34076"
				bind:value={hwidInput}
			/>
			<p class="mb-4 break-all">{hwidCommand}</p>
			<!--Copy text button-->
			<div class="flex justify-center">
				<Button class="cursor-pointer"
					onclick={() => {
                        copied = true;
						navigator.clipboard.writeText(hwidCommand);
					}}
				>
					{copied ? 'Copied!' : 'Copy'}
				</Button>
			</div>
		</div>
	</div>
{/if}
