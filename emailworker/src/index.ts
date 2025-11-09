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
import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";

export interface Env {
	EMAIL_STORE: DurableObjectNamespace<EmailStore>;
}

export default class EmailWorker extends WorkerEntrypoint<Env> {
	async email(message: any) {
		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const email = await parser.parse(await rawEmail.arrayBuffer());

		// Only process emails from Deca Games
		if (email.from?.address != "noreply@decagames.com") {
			console.log("Received email from unauthorized sender:", email.sender?.address);
			return;
		}

		// We also receive welcome emails, ignore those
		if (!email.subject?.includes("Verify Email")) {
			return;
		}

		// Extract the verification link
		const body = (email.html || email.text)!;
		const verificationLink = body.match(/https:\/\/www.realmofthemadgod.com\/account\/v\?b=.{16}&a=\d{16}/)?.[0];

		if (!verificationLink) {
			console.error(`Failed to find verification link in email body ${body}`);
			return;
		}

		// Store the verification link in the durable object
		const stub = this.env.EMAIL_STORE.get(this.env.EMAIL_STORE.idFromName("GlobalEmailStore"));
		await stub.storeLink(verificationLink);

		console.log("Stored verification link:", verificationLink);
	}

	// Handle fetch requests to the durable object, like popping a link
	async popLink() {
		const stub = this.env.EMAIL_STORE.get(this.env.EMAIL_STORE.idFromName("GlobalEmailStore"));
			const link = await stub.popLink();
			if (link) {
				return new Response(link, { status: 200 });
			} else {
				return new Response(null, { status: 204 });
			}
	}
};

export class EmailStore extends DurableObject {
    verificationLinks: string[];

    constructor(state: DurableObjectState, env: any) {
        super(state, env);
        this.verificationLinks = [];
    }

    async storeLink(storeLink: string) {
        this.verificationLinks.push(storeLink);
    }

    async popLink(): Promise<string | undefined> {
        return this.verificationLinks.shift();
    }
}