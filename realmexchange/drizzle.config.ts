import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/migrations',
	dialect: 'sqlite',
	dbCredentials: { url: 'file:../.wrangler/v3/d1/miniflare-D1DatabaseObject/fa92c093e24cb65a04d2fe43a61e384cab5180d69d421c0a3c38c0f3151adeda.sqlite' },
	verbose: true,
	strict: true
});
