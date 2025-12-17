<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import { CircleQuestionMark } from '@lucide/svelte';

	let showHWIDSetup = $state(false);
	let hwidInput = $state('');
	let { doneSettingHWID = $bindable(false) } = $props();
	let copied = $state(false);
	const hwidCommand = `powershell -NoLogo -NoProfile -Command "$bb=(Get-CimInstance Win32_BaseBoard).SerialNumber; $bios=(Get-CimInstance Win32_BIOS).SerialNumber; $os=(Get-CimInstance Win32_OperatingSystem).SerialNumber; $concat=\\"$bb$bios$os\\"; $sha1=[System.Security.Cryptography.SHA1]::Create(); $bytes=[System.Text.Encoding]::UTF8.GetBytes($concat); $hash=$sha1.ComputeHash($bytes); ($hash | ForEach-Object { '{0:x2}' -f $_ }) -join ''"`;

	// Show the install path prompt after a valid HWID is entered
	let showInstallSetup = $state(false);
	let installPathInput = $state('%USERPROFILE%\\Documents\\RealmOfTheMadGod\\Production');

	$effect(() => {
		if (/^[a-f0-9]{40}$/.test(hwidInput)) {
			// open install path modal instead of immediately submitting
			showInstallSetup = true;
			showHWIDSetup = false;
		}
	});

	function submitHWIDAndPath() {
		const formData = new FormData();
		formData.append('hwid', hwidInput);
		formData.append('install_path', installPathInput);

		fetch('?/submitHWID', {
			method: 'POST',
			body: formData
		});

		showInstallSetup = false;
		doneSettingHWID = true;
	}
</script>

<Button onclick={() => (showHWIDSetup = true)}>Setup</Button>

{#if showHWIDSetup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<div class="mb-4 flex flex-row justify-center gap-1">
				<p class="mb-4 text-center text-xl font-bold">
					Run this CMD command and paste the output here:
				</p>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>
							<CircleQuestionMark />
						</TooltipTrigger>
						<TooltipContent>
							Rotmg uses your computer's hardware ID (cpu serial number, etc) to verify the access token used to launch the game came from your computer. Realm Exchange needs this so we can give you a valid access token that can launch the Exalt client on your computer.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<input
				type="text"
				class="mb-4 w-full border p-2"
				placeholder="425e04f3b2c22fa7fa998f02b85f3e73e4d34076"
				bind:value={hwidInput}
			/>
			<p class="mb-4 break-all">{hwidCommand}</p>
			<!--Copy text button-->
			<div class="flex justify-center">
				<Button
					class="cursor-pointer"
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

{#if showInstallSetup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
			<p class="mb-4 text-center text-xl font-bold">Enter your Realm install path</p>
			<input
				type="text"
				class="mb-4 w-full border p-2"
				placeholder="%USERPROFILE%\\Documents\\RealmOfTheMadGod\\Production"
				bind:value={installPathInput}
			/>
			<p class="mb-4 text-sm text-muted-foreground">Default: %USERPROFILE%\\Documents\\RealmOfTheMadGod\\Production</p>
			<div class="flex justify-center gap-2">
				<Button onclick={() => submitHWIDAndPath()}>Save</Button>
				<Button onclick={() => (showInstallSetup = false)}>Cancel</Button>
			</div>
		</div>
	</div>
{/if}
