// See https://svelte.dev/docs/kit/types#app.d.ts

import type { DrizzleClient } from "$lib/server/db";

// for information about these interfaces
declare global {
	namespace App {
        interface Platform {
            env: Env
            cf: CfProperties
            ctx: ExecutionContext
        }
    }
}

export {};