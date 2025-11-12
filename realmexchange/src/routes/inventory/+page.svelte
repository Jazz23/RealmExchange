<script>
	import DepositItems from "./components/DepositItems.svelte";
	import Inventory from "./components/Inventory.svelte";

    const { data } = $props();
</script>
<div class="m-10"></div>

<DepositItems />
<hr class="mt-10">
<Inventory {data}/>