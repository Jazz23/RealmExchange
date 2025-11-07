/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import * as PostalMime from 'postal-mime';

export default {
  async email(message: any, env: Env, ctx: any) {
    const parser = new PostalMime.default();
    const rawEmail = new Response(message.raw);
    const email = await parser.parse(await rawEmail.arrayBuffer());

	// Get the first entry in the user table and log the username
	const entry = await env.DB.prepare('SELECT username FROM user LIMIT 1').first();
	if (entry) {
		console.log(`Username from DB: ${entry.username}`);
	} else {
		console.log('No user found in the database.');
	}

    // console.log(email);
  },
};